# Diana — Field Agent Dashboard

A small multi-page dashboard (Overview · Network · Onboarding · Finance · Tasks) showing where Diana stands against her goal. Static site, safe to host publicly: **the data is encrypted**, so the repo and the live site only ever contain ciphertext.

## 🔒 Access
The dashboard is **passphrase-gated**. On load it asks for a passphrase, derives a key (PBKDF2-SHA256, 310k iterations) and decrypts the data (AES-256-GCM) **entirely in the browser**. The passphrase never leaves the device and is **not stored in this repo** — share it out-of-band with whoever needs access.

> Lost the passphrase? There's no recovery — just re-encrypt with a new one (below).

## Pages
`index.html` Overview · `network.html` · `onboarding.html` · `finance.html` · `tasks.html`. The "Day X / 90" counter updates itself from today's date.

## How the data works
- **`assets/data.js`** — the plaintext source (real names/phones/emails). **Git-ignored — never committed.**
- **`assets/data.enc.js`** — the encrypted payload that ships. This is the only data file in the repo.
- **`encrypt-data.js`** — Node script that turns `data.js` → `data.enc.js`.

### Update the dashboard (daily)
```bash
cd Dashboard
# 1. edit assets/data.js  (contacts / finance / tasks)
node encrypt-data.js "YOUR-PASSPHRASE"   # regenerates assets/data.enc.js
git add assets/data.enc.js && git commit -m "update" && git push
```
The live site refreshes on the next GitHub Pages build. (Aggregates — by city/specialty/stage, totals — recompute themselves; you only edit raw values.)

### Change the passphrase
Run `node encrypt-data.js "NEW-PASSPHRASE"`, commit `data.enc.js`, push. Old passphrase stops working.

## Run locally
Double-click `index.html` (no server needed) → enter the passphrase.

## Security notes
- Only **ciphertext** is published; the plaintext `data.js` and `.passphrase` are git-ignored.
- Use a **strong passphrase** (a 4-digit PIN is brute-forceable against the downloaded ciphertext; the generated `diana-XXXX-XXXX-XXXX` style is fine).
- This protects against casual/opportunistic access. It is not a substitute for a private repo if the data is highly sensitive.
