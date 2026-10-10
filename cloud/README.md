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
