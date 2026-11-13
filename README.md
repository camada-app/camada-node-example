# camada-node-example

[Express guide](https://www.camada.app/docs/quickstart/express) · [Bot detection](https://www.camada.app/bot-detection) · [Bot signal test](https://www.camada.app/tools/bot-test) · [Pricing](https://www.camada.app/pricing).

An Express app wired with [`@camada/node`](https://github.com/camada-app/camada-node) against a locally running
edge-analyst. This is the hand-test bench for the Node SDK.

## Setup

1. Terminal A: `cd ../camada/edge-analyst && npm run dev` (analyst on :8787), then
   `npm run seed` in a second terminal. Note the printed `CAMADA_KEY`.
2. Here: `cp .env.example .env` (paste the key if it differs), `npm install`, `npm start`
   → http://localhost:3000. Sibling checkouts `camada-core`, `camada-browser`, `camada-node`
   must be installed/built first (bottom-up: core → browser → node).

## Hand test (what to look for)

1. Browse `http://localhost:3000`: the page renders; devtools → Network shows
   `/_cam/b.js?r=<uuid>` (200, JavaScript) and ~2 s later `POST /_cam/fp` (204). The document
   response carries an `x-rid` header and sets the `_sfp` cookie.
2. Click/type before the beacon fires: the `/_cam/fp` payload's `input` counters are non-zero.
3. `curl -i http://localhost:3000/ -H 'X-Forwarded-For: 203.0.113.66'` → **403** with
   `x-block-reason: rule` and `x-block-rule: builtin:block` (the seed blocks that IP as an entry
   of the built-in block list on snapshot v5; allow ~30 s after seed for the snapshot poll).
4. Fail three logins (`demo@example.com` / anything wrong) via `/login-form`, then run an
   analysis (`curl -s -X POST -H 'authorization: Bearer dev' 'http://localhost:8787/admin/run?tenant=acme&minutes=10'`):
   events include `login_failed` rows with a hashed `uid`; your raw email appears nowhere.
5. Kill the analyst (Ctrl-C in terminal A) and reload the page + `curl localhost:3000/api/data`:
   everything still answers 200 with no errors in this app's terminal. That is fail-open.
6. Restart this app with `CAMADA_DISABLED=1 npm start`: no `x-rid` header, no `/_cam/b.js`
   requests: the kill switch bypasses the SDK entirely.

## Challenge (SDK-04)

`/challenge-me` forces the first-party proof-of-work challenge, whatever the snapshot says: the
same page camada serves automatically for a `challenge` verdict on snapshot v4.

1. Browse `http://localhost:3000/challenge-me`: "Checking your browser" appears, the inline
   solver hunts a SHA-256 with 16 leading zero bits (tens of milliseconds), the hidden form
   posts to `/__camada/challenge`, and the browser lands on "Challenge passed". Devtools shows
   the `_cch` cookie (`HttpOnly`, `SameSite=Lax`, one hour); reload and the page renders at once.
2. `curl -i http://localhost:3000/challenge-me -H 'accept: text/html' -H 'sec-fetch-dest: document'`
   → **403** with `x-camada-challenge: 1` and the page in the body.
3. A request without an HTML `Accept` (an API client, an image, a fetch) cannot solve a challenge,
   so it passes to the app signalled: the route renders (**200**) with `x-camada-challenge: 1` and
   `cache-control: no-store`, and the app or client decides what to do.
4. The events tell the three apart: a served challenge ships `st: 403, blk: "challenge"`, a passed
   one ships `st: 200, ch: 1`, and a signalled one (step 3) ships `st: 200, chs: 1`.

The nonce and the cookie are bound to the client IP, so camada serves no challenge to a request
it cannot identify (no trusted-proxy config and no socket address). Clear `_cch` (or open a
private window) to see the check again.

## Docs and links

Read the Node guides on [camada.app](https://www.camada.app/docs).

- [Express guide](https://www.camada.app/docs/quickstart/express): add `@camada/node` to your own Express app in minutes.
- [Challenge](https://www.camada.app/docs/challenge): see how the 16-bit SHA-256 browser check works.
- [Bot detection](https://www.camada.app/bot-detection): see how snapshots, beacons, and `track()` catch bots.
- [Bot signal test](https://www.camada.app/tools/bot-test): check live browser and TLS signals from your client.
- [Pricing](https://www.camada.app/pricing): compare the free tier and paid plans.
