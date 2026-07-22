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

  // ---------- Static files ----------
  const rel = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ""));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end("forbidden"); return; } // path-traversal guard
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
  console.log("  💾  Scores saved to:  " + DATA);
  console.log("  (Ctrl+C to stop)");
  console.log("");
});
