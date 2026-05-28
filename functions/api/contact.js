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
//   CONTACT_FROM_EMAIL     — optional, From: header (default no-reply@sgchorsemanship.fr)
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

  // 3. Forward email via Resend if configured. If not, just ack so we can
  // wire up the provider later without breaking the form in the meantime.
  if (env.RESEND_API_KEY) {
    const to = env.CONTACT_TO_EMAIL || 'contact@sgchorsemanship.fr';
    const from = env.CONTACT_FROM_EMAIL || 'no-reply@sgchorsemanship.fr';
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
