# camada-node-example

An Express app wired with [`@camada/node`](../camada-node) against a locally running
edge-analyst. This is the hand-test bench for the Node SDK.

## Setup

1. Terminal A — `cd ../camada/edge-analyst && npm run dev` (analyst on :8787), then
   `npm run seed` in a second terminal. Note the printed `CAMADA_KEY`.
2. Here: `cp .env.example .env` (paste the key if it differs), `npm install`, `npm start`
   → http://localhost:3000. Sibling checkouts `camada-core`, `camada-browser`, `camada-node`
   must be installed/built first (bottom-up: core → browser → node).

## Hand test (what to look for)

1. Browse `http://localhost:3000` — the page renders; devtools → Network shows
   `/_cam/b.js?r=<uuid>` (200, JavaScript) and ~2 s later `POST /_cam/fp` (204). The document
   response carries an `x-rid` header and sets the `_sfp` cookie.
2. Click/type before the beacon fires — the `/_cam/fp` payload's `input` counters are non-zero.
3. `curl -i http://localhost:3000/ -H 'X-Forwarded-For: 203.0.113.66'` → **403** with
   `x-block-reason: ip4` (that IP is blocked by the seeded analysis; allow ~30 s after seed for
   the snapshot poll).
4. Fail three logins (`demo@example.com` / anything wrong) via `/login-form`, then run an
   analysis (`curl -s -X POST -H 'authorization: Bearer dev' 'http://localhost:8787/admin/run?tenant=acme&minutes=10'`) —
   events include `login_failed` rows with a hashed `uid`; your raw email appears nowhere.
5. Kill the analyst (Ctrl-C in terminal A) and reload the page + `curl localhost:3000/api/data` —
   everything still answers 200 with no errors in this app's terminal. That is fail-open.
6. Restart this app with `CAMADA_DISABLED=1 npm start` — no `x-rid` header, no `/_cam/b.js`
   requests: the kill switch bypasses the SDK entirely.
