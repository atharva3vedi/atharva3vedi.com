# 🏁 Atharva Trivedi — F1 × Cat Portfolio

A single-page, F1-and-cat-themed portfolio. Pure HTML/CSS/JS, no build step, no
framework. Just open `index.html` or drop the folder on any static host.

```
atharva-portfolio/
├── index.html      ← all the content
├── styles.css      ← the whole look
├── script.js       ← lights, reaction game, jokes, paw trail, easter egg
├── favicon.svg      ← racing cat tab icon
├── assets/
│   └── atharva-trivedi-resume.pdf   ← linked from the CV buttons
└── README.md       ← you are here
```

---

## ✍️ Fill these in before you launch

Everything highlighted in **yellow/italic** on the page is a placeholder. Search
`index.html` for the word `edit` (class `edit`) and for `data-edit-link`.

| Where | What to add |
|-------|-------------|
| **Garage / For Sale** (`#garage`) | Your app's name, one-line pitch, 3 metrics, tech stack, asking price, screenshot, and the "test drive" link. This is the money section — make it sing. |
| **Race History → Montty** | Real dates + what you did as Head of Sales. |
| **Race History → extra internship** | The other internship you mentioned (or delete the card). |
| **Most Painful Day** (`#radio`) | Swap my placeholder war story for your real one. |
| **Project links** | Real Play Store / GitHub / live URLs (currently `#`). |
| **Pit Wall** (`#pitwall`) | Your real LinkedIn + GitHub URLs. |

Optional swaps: driver number (`3` — from *3vedi*), the rotating role subtitles
(`roleRotate` in `script.js`), and the jokes array.

> The email/phone are pulled from your CV: `atharva.3vedi@gmail.com`, `+91 99939 41535`.
> Change them in `index.html` if you'd rather show others.

---

## 🚀 Hosting it on `atharva3vedi.com`

Pick **one** host. All four are free for a site this size. Cloudflare Pages is the
smoothest if you want the domain and hosting in one place.

### Option A — Cloudflare Pages (recommended)

1. Create a free account at [dash.cloudflare.com](https://dash.cloudflare.com).
2. **Workers & Pages → Create → Pages → Upload assets**. Drag in the
   `atharva-portfolio` folder (or connect a GitHub repo).
3. After it deploys you'll get a `*.pages.dev` URL — check it works.
4. **Custom domains → Set up a custom domain →** type `atharva3vedi.com`.
5. If your domain's DNS is already on Cloudflare, it wires up automatically. If not,
   move the domain's nameservers to Cloudflare (they show you the two to use at your
   registrar), or add the `CNAME` they give you at your current DNS provider.
6. Add `www` too and set a redirect `www → root` (or root → www, your call).

### Option B — Netlify (easiest drag-and-drop)

1. [app.netlify.com](https://app.netlify.com) → **Add new site → Deploy manually**.
2. Drag the `atharva-portfolio` folder onto the drop zone. Live in seconds on a
   `*.netlify.app` URL.
3. **Domain management → Add a domain →** `atharva3vedi.com`.
4. At your registrar, point DNS to Netlify:
   - `A` record `@` → `75.2.60.5`
   - `CNAME` record `www` → `<your-site>.netlify.app`
   - (Netlify shows the exact values; use those if they differ.)
5. Netlify issues the HTTPS certificate automatically once DNS resolves.

### Option C — GitHub Pages (free, git-based)

1. Create a repo, e.g. `atharva3vedi-com`, and push these files to the `main` branch.
2. **Settings → Pages → Source: Deploy from a branch → `main` / root.**
3. Under **Custom domain**, enter `atharva3vedi.com` and Save. This commits a
   `CNAME` file for you.
4. At your registrar, add DNS:
   - Four `A` records for `@` → `185.199.108.153`, `185.199.109.153`,
     `185.199.110.153`, `185.199.111.153`
   - `CNAME` `www` → `<your-username>.github.io`
5. Tick **Enforce HTTPS** once the cert provisions (can take up to an hour).

### Option D — Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import the repo (or use
   the Vercel CLI: `npm i -g vercel`, then `vercel` in this folder).
2. **Settings → Domains → Add** `atharva3vedi.com`, then add the `A` / `CNAME`
   records Vercel shows you at your registrar.

---

## 🌐 Where is `atharva3vedi.com` registered?

Whatever host you pick, the DNS changes happen at **your domain registrar** (where you
bought the domain — GoDaddy, Namecheap, Google Domains/Squarespace, Cloudflare, etc.).

- **Fastest path:** move the domain's nameservers to your host (Cloudflare/Netlify/Vercel
  all offer this) and let them manage DNS + HTTPS end to end.
- **Minimal path:** keep DNS where it is and just add the `A`/`CNAME` records above.

DNS can take anywhere from a few minutes to a few hours to propagate. HTTPS certs are
automatic on all four hosts once DNS resolves — you don't buy or install anything.

---

## 🐱 Things to try on the page

- **Tire-compound buttons** (right edge): switch the accent color — soft/medium/hard.
- **Reaction test** (Team Radio): beat a real F1 start. Jump it and you get a penalty.
- **Radio check**: the joke button. Keep pressing.
- **Most painful day**: tap the card to flip it.
- **Konami code**: ↑ ↑ ↓ ↓ ← → ← → B A → 🚨 safety car.
- **Move the mouse**: paw prints.

---

## 🔧 Local preview

Just double-click `index.html`, or serve it:

```bash
# Python
python -m http.server 8000
# then open http://localhost:8000

# or Node
npx serve .
```

Fonts load from Google Fonts over the network; everything else is local.
