# Octee Airlines

**FLY SOMEWHERE. EVENTUALLY.** A parody airline website: Octee pretends everything is fine. It isn't.

Plain HTML, CSS and JavaScript. **100% static**: no build step, no server, no database. See [`DEVELOPMENT.md`](DEVELOPMENT.md) for the full plan.

## Run it locally

Browsers block JavaScript modules on `file://`, so use a tiny local server:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## JoelAI Pro (handbook and model)

- **Handbook JoelAI** works everywhere, including GitHub Pages and a plain local server. Pro handbook answers add the real timetable, gates and terminals.
- **Model answers** (Joel-3.3, Quick, Think) need the model server `api/joelai.js`, so the site must run on Vercel (or `vercel dev`), or `JOELAI_API_URL` in `js/config.js` must point at the Vercel deployment. Opening `index.html` as a `file://` page, or using GitHub Pages alone, shows **"Model unavailable here"** and keeps using Handbook JoelAI.
- **Prices** live in `js/miles.js` and are copied by the cloud (`cloud/index.js`): Pro unlock **100 Octeetokens**, **2,500 JoelTokens per Octeetoken**, **10,000 JoelTokens free each month**. The Octmiles page reads the same numbers.
- **JoelTokens are counted by the cloud**, not the browser. Unlock, top-ups and charges are recorded in the Octee Cloud database (`joel_wallet`, `joel_ledger`), so a balance cannot be edited in the browser and follows a cloud account to every device. Model answers need a cloud account. Octeetokens themselves are still earned and stored in the saved profile (see `cloud/README.md`).
- Vercel settings: `JOELAI_ENABLED=true`, `AI_GATEWAY_API_KEY` (or OIDC), and `JOEL_LEDGER_SECRET` (the same secret as the Worker). Optional: `JOEL_CLOUD_URL`, `JOELAI_ALLOWED_ORIGINS`.

## Deploy on GitHub Pages

1. Push this repo to GitHub (branch `main`).
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**, choose **main** and **/ (root)**, **Save**.
3. After about a minute the site is live at `https://zengyixin0205.github.io/Octee-airline/`. Every push to `main` redeploys it.

## What is saved where

There is no database. Accounts, Octmiles, trips and reviews are saved **in each visitor's own browser** (`localStorage`). They don't follow you to another device.

Things everyone sees live in `data/` and change when you commit:

| File | What |
|---|---|
| `data/codes.json` | Octmiles codes, stored only as hashes |
| `data/reviews.json` | Published reviews |
| `data/control-tower.json` | Who can sign in to the FAG code administration (password hashes only) |
| `data/accounts.json` | Accounts etched in the code: they can log in on any device (password hashes, balances, trips) |

## FAG code administration (making codes)

1. Click the Octee logo **8 times quickly** on any page. A serious **FAG — Fuji Airport Group** sign-in appears.
2. First time: create the owner account (strong password). It downloads `control-tower.json`. Put it in `data/`, commit, push.
3. Sign in, create codes, then **Download codes.json**, replace `data/codes.json`, commit, push. The codes then work for everyone.

A wrong name or password makes the pop-up vanish instantly, with no message. Only people who can push to this repo can actually publish anything. The welcome code `OCTEE500` (500 Octmiles) is included.

## Scraggy Airlines

Transfers use the real Scraggy Airlines flights, loaded from `https://zengyixin0205.github.io/Scraggy-airlines/js/data.js`. If that can't load (or is older), `js/scraggy-data-snapshot.js` is used. Refresh the snapshot when Scraggy's flights change.
