# Octee Airlines

**FLY SOMEWHERE. EVENTUALLY.** A parody airline website: Octee pretends everything is fine. It isn't.

The site is plain HTML, CSS and JavaScript. Most pages are static and save accounts in each browser. **JoelAI Pro** adds one Vercel Node function and calls Vercel AI Gateway for real model answers. See [`DEVELOPMENT.md`](DEVELOPMENT.md) for the full plan.

## Run it locally

Browsers block JavaScript modules on `file://`, so use a tiny local server:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy on GitHub Pages

1. Push this repo to GitHub (branch `main`).
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**, choose **main** and **/ (root)**, **Save**.
3. After about a minute the site is live at `https://zengyixin0205.github.io/Octee-airline/`. Every push to `main` redeploys it.

GitHub Pages runs the handbook version of JoelAI only. JoelAI Pro needs the `api/joelai.js` function, so deploy the project to Vercel to enable it.

## Enable JoelAI Pro on Vercel

1. Import this repository into Vercel.
2. Set `JOELAI_ENABLED=true` and add an `AI_GATEWAY_API_KEY` in the project's server environment (Vercel OIDC can be used on a linked deployment instead).
3. Set an AI Gateway project or team spend budget before enabling the endpoint. It is publicly reachable, and the light per-IP rate limit is not a durable spend limit.
4. Redeploy. JoelAI Pro stays unavailable until `JOELAI_ENABLED=true` and gateway authentication are both present.

JoelAI Pro uses the model's reported input and output token counts. JoelAI conversations are saved with a signed-in account. Cloud-linked accounts sync them with the account profile; manual accounts keep them in this browser. Avoid entering passwords or private details in chat. Chat messages sent in model mode go to the selected model through AI Gateway.

## What is saved where

Accounts that are not linked to Octee Cloud, along with guest activity, are saved **in each visitor's own browser** (`localStorage`). A cloud-linked account syncs its account profile—including Octmiles, trips, JoelTokens, usage totals and JoelAI chat history—to Cloudflare Worker + D1, so it follows the account to another device. Published reviews and codes are repo data. JoelAI Pro's model request runs on the Vercel function when deployed there.

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
