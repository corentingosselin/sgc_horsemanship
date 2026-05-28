// Cloudflare Pages Function — /api/contact
//
// Receives the contact-form POST, validates the Cloudflare Turnstile token,
// then forwards the message by email. The Turnstile secret and (later) the
// email-provider API key are read from environment variables set in the
// Cloudflare Pages dashboard (Settings → Environment variables):
//
//   TURNSTILE_SECRET_KEY   — required, the secret half of the Turnstile pair
//   RESEND_API_KEY         — optional, enables email forwarding via Resend
//   CONTACT_TO_EMAIL       — optional, recipient address (default contact@sgchorsemanship.fr)
//   CONTACT_FROM_EMAIL     — optional, From: header. Default no-reply@sgchorsemanship.fr
//                            (must be on a Resend-verified domain; we verified the apex
//                            sgchorsemanship.fr — DKIM on apex aligns with From: apex).
//
// Without RESEND_API_KEY the function still validates Turnstile and acks the
// submission, but doesn't deliver an email. Wire it up once a provider is
// chosen — Resend / Brevo / Postmark all work the same shape.

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function onRequestPost(context) {
  const { request, env } = context;

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: 'invalid_form' }, 400);
  }

  // 1. Validate Turnstile token
  const token = formData.get('cf-turnstile-response');
  if (!token) {
    return json({ error: 'missing_captcha' }, 400);
  }
  if (!env.TURNSTILE_SECRET_KEY) {
    // Misconfiguration: secret not set in CF Pages env vars.
    return json({ error: 'server_misconfigured' }, 500);
  }

  const verify = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: request.headers.get('CF-Connecting-IP') || '',
    }),
  });
  const verifyData = await verify.json();
  if (!verifyData.success) {
    return json({ error: 'captcha_failed', codes: verifyData['error-codes'] || [] }, 403);
  }

  // 2. Extract & sanitize form fields
  const fields = {
    prenom: (formData.get('prenom') || '').toString().trim().slice(0, 80),
    telephone: (formData.get('telephone') || '').toString().trim().slice(0, 40),
    email: (formData.get('email') || '').toString().trim().slice(0, 120),
    cheval: (formData.get('cheval') || '').toString().trim().slice(0, 200),
    message: (formData.get('message') || '').toString().trim().slice(0, 4000),
  };
  if (!fields.prenom || !fields.telephone) {
    return json({ error: 'missing_required_fields' }, 400);
  }

  // Phone must be a French number. Strip every separator the user might type
  // (spaces, dots, dashes, parens) and check the digit shape against either
  // the +33 international form or the leading-0 national form.
  const phoneDigits = fields.telephone.replace(/[\s.\-()]/g, '');
  if (!/^(?:\+33|0)[1-9]\d{8}$/.test(phoneDigits)) {
    return json({ error: 'invalid_phone' }, 400);
  }

  // 3. Forward email via Resend if configured. If not, just ack so we can
  // wire up the provider later without breaking the form in the meantime.
  if (env.RESEND_API_KEY) {
    const to = env.CONTACT_TO_EMAIL || 'contact@sgchorsemanship.fr';
    // The From: address must be on the apex sgchorsemanship.fr (or any
    // Resend-verified address). DKIM `resend._domainkey.sgchorsemanship.fr`
    // signs with d=apex → aligns with From: apex for DMARC.
    const from = env.CONTACT_FROM_EMAIL || 'SGC Horsemanship <no-reply@sgchorsemanship.fr>';
    const subject = `Nouvelle demande de contact — ${fields.prenom}`;
    const text = [
      `Nouvelle demande de contact reçue depuis sgchorsemanship.fr.`,
      ``,
      `Prénom    : ${fields.prenom}`,
      `Téléphone : ${fields.telephone}`,
      `Email     : ${fields.email || '—'}`,
      `Cheval    : ${fields.cheval || '—'}`,
      ``,
      `Message :`,
      fields.message || '(vide)',
      ``,
      `—`,
      `IP : ${request.headers.get('CF-Connecting-IP') || 'unknown'}`,
      `User-Agent : ${request.headers.get('User-Agent') || 'unknown'}`,
    ].join('\n');

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: fields.email || undefined,
        subject,
        text,
      }),
    });
    if (!emailRes.ok) {
      const detail = await emailRes.text();
      return json({ error: 'email_send_failed', detail }, 502);
    }

    // Auto-reply confirming receipt — only if the visitor gave a valid email.
    // Failure here MUST NOT fail the form: the request already reached
    // Coralie's inbox above, which is what matters. We log and move on.
    if (fields.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fields.email)) {
      const ackText = [
        `Bonjour ${fields.prenom},`,
        ``,
        `Merci pour votre demande, je l'ai bien reçue.`,
        ``,
        `Je vous recontacte par téléphone sous 48 heures (du lundi au samedi, de 9h à 19h) pour fixer un créneau pour l'appel découverte.`,
        ``,
        `En attendant, vous pouvez me joindre directement au 06 34 60 81 83 ou répondre à cet email.`,
        ``,
        `À très vite,`,
        `Coralie`,
        ``,
        `—`,
        `SGC Horsemanship — Coralie Maguet`,
        `Comportementaliste & éducatrice équine — Nord (59)`,
        `06 34 60 81 83 — https://sgchorsemanship.fr`,
      ].join('\n');

      try {
        const ackRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: fields.email,
            // If they reply, send it to Coralie's real inbox rather than the
            // no-reply technical address.
            reply_to: to,
            subject: `Merci pour votre demande, ${fields.prenom} — SGC Horsemanship`,
            text: ackText,
          }),
        });
        if (!ackRes.ok) {
          console.error('Auto-reply failed:', ackRes.status, await ackRes.text());
        }
      } catch (e) {
        console.error('Auto-reply threw:', e?.message || e);
      }
    }
  }

  return json({ ok: true }, 200);
}

function json(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
