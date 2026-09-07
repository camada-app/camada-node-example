// camada-node-example: a small Express app wired with @camada/node against a local edge-analyst.
// Setup: cp .env.example .env (paste the CAMADA_KEY printed by `npm run seed`), npm i, npm start.
import { readFileSync } from 'node:fs';
import express from 'express';
import camada from '@camada/node';

// minimal .env loader so the example has zero extra dependencies
try {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
} catch { /* no .env: rely on the environment */ }

const app = express();
app.use(camada.express());                    // ← the two-line install
app.use(express.urlencoded({ extended: false }));

const page = (req, title, body) => `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title>${camada.scriptTag(req)}</head>
<body style="font-family: system-ui; max-width: 40rem; margin: 3rem auto">
<nav><a href="/">home</a> · <a href="/pricing">pricing</a> · <a href="/login-form">login</a> · <a href="/challenge-me">challenge</a></nav>
<h1>${title}</h1>${body}</body></html>`;

app.get('/', (req, res) => res.send(page(req, 'camada example shop', `
  <p>Every request here is captured by @camada/node; the beacon below fingerprints this browser first-party.</p>
  <p><button onclick="fetch('/api/data').then(r=>r.json()).then(d=>alert(JSON.stringify(d)))">call the API</button></p>`)));

app.get('/pricing', (req, res) => res.send(page(req, 'Pricing', '<p>Free while unreleased.</p>')));

app.get('/login-form', (req, res) => res.send(page(req, 'Log in', `
  <form method="post" action="/login"><input name="user" placeholder="email"> <input name="pass" type="password"> <button>go</button></form>`)));

app.post('/login', (req, res) => {
  const ok = req.body.user === 'demo@example.com' && req.body.pass === 'demo';
  camada.track(req, ok ? 'login_succeeded' : 'login_failed', { user: req.body.user || '' });   // uid is HMAC-hashed in the SDK
  res.status(ok ? 200 : 401).send(page(req, ok ? 'Welcome' : 'Nope', `<p>login ${ok ? 'succeeded' : 'failed'}</p>`));
});

app.get('/api/data', (_req, res) => res.json({ ok: true, at: Date.now() }));

// SDK-04 demo: force the challenge for this route, whatever the snapshot says. In production
// the same page is served automatically for a `challenge` verdict. Once solved, the `_cch`
// cookie is good for an hour and this route renders normally.
app.get('/challenge-me', (req, res) => {
  if (camada.serveChallenge(req, res)) return;
  res.send(page(req, 'Challenge passed', `
    <p>The <code>_cch</code> cookie is set for an hour. Clear it (or open a private window) to see the check again.</p>`));
});

app.use((req, res) => res.status(404).send(page(req, '404', '<p>Nothing here.</p>')));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`camada-node-example on http://localhost:${port}`));
