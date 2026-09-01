# 🏎️🐱 atharva3vedi.com

> **Lights out and away we go.**
> A one-page portfolio built at the intersection of Formula 1 telemetry and unapologetic cat energy. No framework. No build step. No excuses. Just `index.html`, some CSS that goes hard, and a paw trail that follows your cursor like it owes you money.

![HTML](https://img.shields.io/badge/HTML-38.9%25-e34c26?style=flat-square)
![CSS](https://img.shields.io/badge/CSS-35.6%25-264de4?style=flat-square)
![JavaScript](https://img.shields.io/badge/JavaScript-25.5%25-f7df1e?style=flat-square)
![Build](https://img.shields.io/badge/build-vanilla-black?style=flat-square)
![Vibes](https://img.shields.io/badge/vibes-immaculate-ff1801?style=flat-square)

---

## 🏁 What is this

A single-page portfolio site with the personality of a paddock and the reflexes of a cat mid-zoomies. Pure HTML/CSS/JS — drop it on any static host and it just *works*. No `npm install`, no config hell, no 400MB `node_modules` folder judging you.

## 📦 The Garage

```
atharva-portfolio/
├── index.html      ← all the content
├── styles.css      ← the whole look
├── script.js       ← lights, reaction game, jokes, paw trail, easter egg
├── favicon.svg      ← racing cat tab icon
├── assets/
│   └── Atharva_Trivedi_Resume.pdf
└── README.md        ← you are here, obviously
```

## ✍️ Pre-Race Checklist

Everything highlighted in *yellow/italic* on the page is a placeholder waiting for real content. Search `index.html` for `edit` / `data-edit-link` and swap in:

| Section | Fill in |
|---|---|
| 🏷️ **Garage / For Sale** | App name, one-liner, 3 metrics, stack, price, screenshot, test-drive link — make this one *sing* |
| 🏆 **Race History → Montty** | Real dates + what you actually did as Head of Sales |
| 🎓 **Race History → extra internship** | The other internship (or bench the card) |
| 📻 **Most Painful Day** | Your real war story, not mine |
| 🔗 **Project links** | Real Play Store / GitHub / live URLs |
| 🧱 **Pit Wall** | Your actual LinkedIn + GitHub |

Contact info is pulled straight from the CV — swap it in `index.html` if you want the world dialing a different number.

## 🚀 Getting it Live on the Grid

Pick your host. All free for a site this size.

| Host | Why |
|---|---|
| **Cloudflare Pages** | Domain + hosting in one garage. Recommended. |
| **Netlify** | Drag, drop, done. |
| **GitHub Pages** | Free, git-native, `CNAME` handled for you. |
| **Vercel** | CLI gremlins welcome. |

Full step-by-step DNS setup for each is further down — point your registrar's `A`/`CNAME` records, wait for propagation, HTTPS auto-provisions. No cert shopping required.

## 🕹️ Easter Eggs on Track

- **Tire compound buttons** — flip the accent color, soft/medium/hard
- **Reaction test** — beat a real F1 start, jump it and eat the penalty
- **Radio check** — the joke button, mash it
- **Most painful day** — tap to flip the card
- **Konami code** — ↑ ↑ ↓ ↓ ← → ← → B A → 🚨 safety car
- **Mouse movement** — leaves a paw trail, because of course it does

## 🔧 Local Pit Stop

```bash
# Python
python -m http.server 8000

# Node
npx serve .
```

Fonts load from Google Fonts over the network. Everything else runs fully local — no dependency chain, no drama.

## 🏆 Global Leaderboard — self-hosted on your PC

Out of the box, the crash board and reaction board are **local** — each visitor races their own ghost in their own browser (localStorage). The **#95 is always P1**; beat it and you hold the record for an hour before it's reclaimed.

To make it **one shared board hosted on your own machine**, there's a tiny zero-dependency Node server (`server.js`). It serves the site *and* stores every score in `leaderboard.json` right next to it.

### Run it

Install [Node.js](https://nodejs.org) once, then in this folder:

```bash
node server.js
# 🏁 http://localhost:8787   (Ctrl+C to stop)
```

That's the whole site **plus** the global leaderboard, live on your PC. The frontend already points at `/api` (see `LB` in `script.js`), so scores sync the moment the server is up.

### Keep it running forever (Windows)

- **Easiest:** Task Scheduler → Create Task → Trigger *At log on* → Action `node C:\path\to\server.js`.
- **As a service:** [pm2](https://pm2.keymetrics.io) → `npm i -g pm2`, then `pm2 start server.js && pm2 save && pm2 startup`.
- **Or** [NSSM](https://nssm.cc) to wrap it as a real Windows service.

### Let the outside world reach it

Your PC needs a public door. The clean, free way (no router port-forwarding, HTTPS included) is a **Cloudflare Tunnel**:

```bash
# one-time: install cloudflared, then
cloudflared tunnel --url http://localhost:8787
```

That prints a public `https://…trycloudflare.com` URL. For a permanent address, make a **named tunnel** and map it to `atharva3vedi.com` in the Cloudflare dashboard. (Old-school alternative: router port-forward + dynamic DNS — more hassle, same result.)

### "If my PC is off, can people still play?"

Yes — that's the whole design:

- **Recommended (always playable):** host the static files on an always-on free host (Cloudflare Pages / Netlify) and run **only** `server.js` on your PC via the tunnel. Set `LB.api` in `script.js` to your tunnel URL. Now the **site always loads and always plays** — when your PC is up, scores go global; when it's off, each score just saves to that visitor's local board. No errors, no hanging (4-second timeout, then silent fallback).
- **Full self-host:** serve everything from `server.js`. Simplest, but if the PC is fully off the site itself is unreachable, so for "always playable" prefer the hybrid above.

**Notes:** the #95 stays pinned to P1 even against real global scores (that's the point). `server.js` caps name length and score range, keeps the best 200 per game, and blocks path traversal — but any public endpoint can be spammed, so if it's ever abused, park it behind Cloudflare's free rate-limiting. Set `LB.api` to `""` to switch global mode off entirely.

## 🤖 Ask-my-AI (Groq)

The **Ask My AI** card in Team Radio is a chatbot that talks in Atharva's voice and knows his lore. It's powered by [Groq](https://groq.com) and runs through the same `server.js` — the API key **never touches the browser**.

```
browser → POST /api/ask → server.js (holds GROQ_API_KEY, injects the lore) → Groq → answer
```

### Turn it on

1. Grab a free key at **[console.groq.com](https://console.groq.com) → API Keys**.
2. Start the server with the key in the environment — **never hard-code or commit it**:

   ```powershell
   # PowerShell
   $env:GROQ_API_KEY = "gsk_your_key_here"
   node server.js
   ```
   ```cmd
   :: Windows CMD
   set GROQ_API_KEY=gsk_your_key_here && node server.js
   ```

   The startup banner will say `🤖 Ask-me AI: ... (key set ✓)`. If it says *NOT set*, the chat politely tells visitors the AI's "in the pit lane."

3. That's it. Ask it something. Optional: `set GROQ_MODEL=...` to switch model (default `llama-3.3-70b-versatile`).

### The persona

Everything the AI knows and how it talks lives in **`lore.js`** — one big editable string. Tweak the voice, add facts, change boundaries. A few guardrails are baked in: it won't share passwords / financial info / anyone else's private data, it's told not to invent facts it doesn't know, dating stays playful-but-vague (no numbers), and the grief/late-wife topic is handled with care, no jokes.

### Same on/off rules as the leaderboard

The AI works whenever the server's up. If it's off (or you deploy the static site alone to GitHub Pages), the chat shows a friendly "pit lane" message and the rest of the site is unaffected — a 20-second timeout, then a clean fallback. For the always-on setup, run `server.js` on your PC behind the tunnel and point the site's `LB.api` at it (the AI uses the same base URL).

> ⚠️ **Never commit your Groq key.** It lives in your shell's environment, not in any file. `lore.js` and `server.js` are safe to commit; the key is not.

---

<p align="center"><i>Built with horsepower, whiskers, and zero frameworks.</i></p>
