// Worker entry — handles dynamic routes for the sgchorsemanship.fr site.
// Everything else (HTML, CSS, JS, images, video, fonts, …) is served
// directly from the static assets binding `ASSETS` (configured in
// wrangler.jsonc, mapped to the project root via .assetsignore).
//
// We keep the original Pages-style function in functions/api/contact.js
// untouched and just dispatch to its `onRequestPost` export here.

import { onRequestPost as contactPost } from '../functions/api/contact.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact') {
      if (request.method === 'POST') {
        return contactPost({ request, env, ctx });
      }
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { Allow: 'POST' },
      });
    }

    // Not an API route — fall through to the static asset server.
    return env.ASSETS.fetch(request);
  },
};
