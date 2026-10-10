# Octee Cloud (the Worker behind "Cloud account")

A small Cloudflare Worker + D1 database. It stores a login and ONE saved JSON profile per user.

- Live at `https://octee-cloud-api.octee.workers.dev` (set as `CLOUD_URL` in `js/config.js`).
- API: `POST /api/register`, `POST /api/login`, `POST /api/claim` (etched accounts join the cloud), `GET|PUT /api/profile` (Bearer token), `POST /api/logout`, `GET /api/me`, `GET /api/reviews` (public), `PUT|DELETE /api/review` (one review per user).
- `index.js` is the Worker, `schema.sql` creates the tables (`users`, `sessions`, `profiles`, `attempts`, `reviews`).
- CORS only allows https://zengyixin0205.github.io (and localhost:8765 for testing). Change `ORIGINS` in `index.js` to add another site.
- Passwords: PBKDF2-SHA256 (100,000 rounds). Session tokens are stored hashed. 5 wrong logins locks that name+IP for 5 minutes; at most 5 new accounts per IP, then a 5 minute wait.
- PUT /api/profile: `{ profile, baseUpdatedAt }`. If someone else saved first the answer is 409 with the newer copy (the site then loads it).
- To redeploy with wrangler: create the D1 database, put its id in `wrangler.toml`, run `wrangler d1 execute octee-cloud --file schema.sql --remote`, then `wrangler deploy`.
- The profile is trusted from the browser, as everywhere else on Octee. Do not reuse real passwords.

## JoelAI Pro ledger

- `GET /api/joel` (wallet and last 20 ledger rows), `POST /api/joel/unlock`, `POST /api/joel/buy {count}` (Bearer token), `POST /api/joel/charge` (only the model server: needs the `x-ledger-secret` header equal to the Worker secret `JOEL_LEDGER_SECRET`).
- Tables `joel_wallet` (Pro flag, bought JoelTokens, this month's use) and `joel_ledger` (every unlock, top-up and charge).
- Unlock and top-ups take Octeetokens from the saved profile with a compare-and-set on `updated_at`, so two devices cannot spend the same Octeetokens twice. Honest limit: Octeetokens are earned by the browser (miles, codes), so someone who edits their own profile can still give themselves Octeetokens. JoelTokens and Pro cannot be edited this way: the server overwrites those fields in the profile on every save and read.
- Set the secret with `wrangler secret put JOEL_LEDGER_SECRET` (or as a Worker secret binding) and use the same value as `JOEL_LEDGER_SECRET` on Vercel.
