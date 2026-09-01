/* =========================================================
   atharva3vedi.com — self-hosted server (static site + leaderboard)
   Zero dependencies. Needs Node.js (https://nodejs.org).

   Run:   node server.js              (defaults to port 8787)
          set PORT=3000 && node server.js   (Windows cmd)
          $env:PORT=3000; node server.js    (PowerShell)

   It serves every file in this folder AND stores game scores in
   leaderboard.json next to it. Point your browser at
   http://localhost:8787 and the boards go global.

   If this server is off, the site still plays (when hosted elsewhere)
   and scores fall back to each visitor's local board — nothing breaks.
   ========================================================= */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DATA = path.join(ROOT, "leaderboard.json");
const PORT = process.env.PORT || 8787;
const MAX_PER_GAME = 200; // keep the file from growing forever
const LORE = require("./lore.js");
const GROQ_KEY = process.env.GROQ_API_KEY || ""; // set this in your shell; NEVER hard-code / commit it
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const LOCAL_LLAMA_URL = process.env.LOCAL_LLAMA_URL || ""; // e.g. http://127.0.0.1:8080 — set to use local llama.cpp instead of Groq
const AI_SECRET = process.env.AI_SECRET || ""; // set this to teach the AI facts in chat; keep it secret, NEVER hard-code/commit it
const ADDITIONS = path.join(ROOT, "lore-additions.txt"); // taught facts land here (blocked from being served)
const MAX_ADDITIONS = 300;
function loadAdditions() { try { return fs.readFileSync(ADDITIONS, "utf8").trim(); } catch (_) { return ""; } }
function addCorrection(text) {
  try {
    let lines = loadAdditions().split("\n").filter(Boolean);
    lines.push("- " + text);
    if (lines.length > MAX_ADDITIONS) lines = lines.slice(-MAX_ADDITIONS);
    fs.writeFileSync(ADDITIONS, lines.join("\n") + "\n");
    return true;
  } catch (e) { console.error("addCorrection failed:", e.message); return false; }
}

// simple per-IP rate limit for the AI endpoint (protects the Groq quota)
const askHits = new Map();
function askAllowed(ip) {
  const now = Date.now(), arr = (askHits.get(ip) || []).filter((t) => now - t < 60000);
  if (arr.length >= 12) { askHits.set(ip, arr); return false; }
  arr.push(now); askHits.set(ip, arr);
  if (askHits.size > 5000) askHits.clear();
  return true;
}

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".ico": "image/x-icon", ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2", ".woff": "font/woff",
};
const GAMES = { race: false, react: true }; // value = "lower score is better?"

function loadScores() { try { return JSON.parse(fs.readFileSync(DATA, "utf8")); } catch (_) { return []; } }
function saveScores(list) { try { fs.writeFileSync(DATA, JSON.stringify(list)); } catch (e) { console.error("save failed:", e.message); } }
function topFor(list, game) {
  const lower = GAMES[game];
  return list.filter((s) => s.game === game)
    .sort((a, b) => (lower ? a.score - b.score : b.score - a.score))
    .slice(0, 5).map((s) => ({ name: s.name, score: s.score }));
}
function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
function sendJSON(res, code, obj) {
  cors(res);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  let u;
  try { u = new URL(req.url, "http://localhost"); } catch (_) { res.writeHead(400); res.end("bad request"); return; }
  const pathname = decodeURIComponent(u.pathname);

  if (req.method === "OPTIONS") { cors(res); res.writeHead(204); res.end(); return; }

  // ---------- Leaderboard API ----------
  if (pathname === "/api/leaderboard" && req.method === "GET") {
    const game = GAMES.hasOwnProperty(u.searchParams.get("game")) ? u.searchParams.get("game") : "race";
    return sendJSON(res, 200, topFor(loadScores(), game));
  }
  if (pathname === "/api/score" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 2000) req.destroy(); });
    req.on("end", () => {
      let d; try { d = JSON.parse(body); } catch (_) { return sendJSON(res, 400, { error: "bad json" }); }
      const game = GAMES.hasOwnProperty(d.game) ? d.game : null;
      const score = Math.round(Number(d.score));
      const name = String(d.name == null ? "" : d.name).replace(/[<>\r\n\t]/g, "").trim().slice(0, 16) || "RACER";
      if (!game || !isFinite(score) || score < 0 || score >= 100000) return sendJSON(res, 400, { error: "invalid score" });
      const list = loadScores();
      list.push({ game, name, score, ts: Date.now() });
      // prune to the best MAX_PER_GAME per game so the file stays small
      const pruned = [];
      Object.keys(GAMES).forEach((g) => {
        const lower = GAMES[g];
        pruned.push(...list.filter((s) => s.game === g).sort((a, b) => (lower ? a.score - b.score : b.score - a.score)).slice(0, MAX_PER_GAME));
      });
      saveScores(pruned);
      return sendJSON(res, 200, { ok: true, top: topFor(pruned, game) });
    });
    return;
  }

  // ---------- Ask-me AI (local llama.cpp via /v1/chat/completions) ----------
  if (pathname === "/api/ask" && req.method === "POST") {
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "?").toString().split(",")[0].trim();
    if (!askAllowed(ip)) return sendJSON(res, 429, { answer: "Whoa, easy — too many questions too fast. Give it a minute and radio back in." });
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 16000) req.destroy(); });
    req.on("end", () => {
      let d; try { d = JSON.parse(body); } catch (_) { return sendJSON(res, 400, { error: "bad json" }); }
      const q = String(d.question == null ? "" : d.question).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 500);
      if (!q) return sendJSON(res, 400, { answer: "You didn't ask me anything, mate." });
      // secret "teach" command — only someone who knows AI_SECRET can add a fact the AI will remember
      if (AI_SECRET && String(d.question || "").trim().indexOf(AI_SECRET) === 0) {
        const fact = String(d.question || "").trim().slice(AI_SECRET.length).replace(/^[\s:>_-]+/, "").trim().slice(0, 800);
        if (!fact) return sendJSON(res, 200, { answer: "Give me the fact right after the word, boss.", teach: true });
        const ok = addCorrection(fact);
        return sendJSON(res, 200, { answer: ok ? ("Locked in ✅ — \"" + fact + "\". I'll carry that from now on.") : "Couldn't save that one — check the server logs.", teach: true });
      }
      if (typeof fetch !== "function") return sendJSON(res, 200, { answer: "This server's Node is too old for the AI (needs Node 18+). Someone tell Atharva." });
      // short-term memory: last few turns so follow-ups ("why", "go on") make sense
      const history = Array.isArray(d.history) ? d.history.slice(-8).map((m) => ({
        role: (m && m.role === "assistant") ? "assistant" : "user",
        content: String((m && m.content) || "").replace(/\s+/g, " ").trim().slice(0, 600),
      })).filter((m) => m.content) : [];
      const llamaUrl = (LOCAL_LLAMA_URL || "http://127.0.0.1:8080").replace(/\/+$/, "");
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 60000); // first call after a restart reprocesses the big prompt — give it room
      fetch(llamaUrl + "/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctl.signal,
        body: JSON.stringify({
          model: "local",
          temperature: 0.6,
          max_tokens: 160,     // short answers = fewer tokens, less compute
          cache_prompt: true,  // llama.cpp caches the big system prompt across calls
          chat_template_kwargs: { enable_thinking: false }, // Qwen3: skip the reasoning pass (saves tokens + compute)
          messages: [
            { role: "system", content: LORE + (loadAdditions() ? "\n\n# CORRECTIONS FROM ATHARVA (authoritative — these override anything above):\n" + loadAdditions() : "") + "\n\nAnswer in 1-3 short sentences, punchy, no preamble." },
            ...history,
            { role: "user", content: q },
          ],
        }),
      })
        .then((r) => (r.ok ? r.json() : r.text().then((t) => { throw new Error(r.status + " " + t.slice(0, 200)); })))
        .then((j) => {
          clearTimeout(to);
          let answer = ((j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "").trim();
          answer = answer.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<\/?think>/gi, "").trim(); // drop any leaked reasoning
          sendJSON(res, 200, { answer: answer || "…(radio static — try again)" });
        })
        .catch((e) => { clearTimeout(to); console.error("llama.cpp error:", e.message); sendJSON(res, 200, { answer: "My AI just dropped the radio (local model's busy or off). Give it another go in a sec." }); });
    });
    return;
  }

  // ---------- Static files ----------
  const rel = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ""));
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end("forbidden"); return; } // path-traversal guard
  // never serve source, secrets, dotfiles (.git / .env), or deps
  const segs = path.relative(ROOT, filePath).split(/[\\/]/);
  const BLOCKED = new Set(["server.js", "lore.js", "lore-additions.txt", "package.json", "package-lock.json"]);
  if (segs.some((s) => s.startsWith(".") || s === "node_modules") || BLOCKED.has(path.basename(filePath).toLowerCase())) {
    fs.readFile(path.join(ROOT, "404.html"), (e2, buf) => { cors(res); res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }); res.end(buf || "<h1>404</h1>"); });
    return;
  }
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      fs.readFile(path.join(ROOT, "404.html"), (e2, buf) => {
        if (e2) { cors(res); res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }); res.end("<h1>404</h1>"); }
        else { cors(res); res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }); res.end(buf); }
      });
      return;
    }
    cors(res);
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log("");
  console.log("  🏁  atharva3vedi.com is live on  http://localhost:" + PORT);
  console.log("  🏆  Leaderboard API:  GET /api/leaderboard?game=race|react   POST /api/score");
  console.log("  🤖  Ask-me AI:        POST /api/ask  ->  local LLM at " + (LOCAL_LLAMA_URL || "http://127.0.0.1:8080") + "  (set LOCAL_LLAMA_URL to change)");
  console.log("  💾  Scores saved to:  " + DATA);
  console.log("  (Ctrl+C to stop)");
  console.log("");
});
