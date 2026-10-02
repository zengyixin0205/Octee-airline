# Octee Airlines

**FLY SOMEWHERE. EVENTUALLY.** A parody airline website: Octee pretends everything is fine. It isn't.

Plain HTML, CSS and JavaScript. **100% static**: no build step, no server, no database. See [`DEVELOPMENT.md`](DEVELOPMENT.md) for the full plan.

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
