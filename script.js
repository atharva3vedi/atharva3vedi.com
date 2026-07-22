/* =========================================================
   ATHARVA TRIVEDI — F1 x CAT PORTFOLIO · interactions
   ========================================================= */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Leaderboards (local by default; global when LB is configured) ---------- */
  // Global leaderboard is served by your self-hosted server.js (see README).
  // "/api" works when server.js is serving the site; use a full URL (e.g. your
  // Cloudflare Tunnel address) for the hybrid setup; "" disables it (local-only).
  // If the server is ever unreachable, play continues and scores just save locally.
  const LB = { api: "/api" };

  function lbHandle() {
    try {
      let h = localStorage.getItem("lb95_handle");
      if (!h) {
        const a = ["PitCat", "BoxBox", "ApexCat", "Purrari", "Meowlaren", "SafetyCat", "DRSopen", "Chicane", "Slipstream", "GravelCat"];
        h = a[Math.floor(Math.random() * a.length)] + Math.floor(Math.random() * 90 + 10);
        localStorage.setItem("lb95_handle", h);
      }
      return h;
    } catch (_) { return "PitCat" + Math.floor(Math.random() * 90 + 10); }
  }
  function lbRemote(game, entry, lowerBetter, cb) {
    if (!LB.api) { cb(null); return; }
    const base = LB.api.replace(/\/+$/, "");
    try { fetch(base + "/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ game: game, name: entry.name, score: entry.score }) }).catch(() => {}); } catch (_) {}
    const ctl = ("AbortController" in window) ? new AbortController() : null;
    const to = ctl ? setTimeout(() => ctl.abort(), 4000) : null;
    fetch(base + "/leaderboard?game=" + encodeURIComponent(game), { signal: ctl ? ctl.signal : undefined })
      .then((r) => (r.ok ? r.json() : null))
      .then((rows) => { if (to) clearTimeout(to); cb(Array.isArray(rows) ? rows : null); })
      .catch(() => { if (to) clearTimeout(to); cb(null); });
  }

  function createLeaderboard(id, opts) {
    const lowerBetter = !!opts.lowerBetter, base = opts.atharvaBase, margin = opts.margin;
    const floor = opts.floor || 0, ghosts = opts.ghosts || [], game = opts.game || id;
    const KEY = "lb95_" + id, HOUR = 3600000, mem = {};
    const better = (x, y) => lowerBetter ? x < y : x > y;
    const worseBy = (x) => (lowerBetter ? x + 1 : Math.max(0, x - 1));
    const beatBy = (x) => (lowerBetter ? Math.max(floor, x - margin) : x + margin);
    function load() {
      try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (_) {}
      return mem[KEY] || { you: [], a: base, ch: null, re: null };
    }
    function save(st) { mem[KEY] = st; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (_) {} }

    // build a display board from a set of rival rows, keeping the #95 pinned at the top
    function assemble(st, rows, playerBest, viewerLeads, isNewBest) {
      const others = rows.filter((r) => !r.a);
      const realMax = others.length ? others.reduce((m, r) => (better(r.score, m) ? r.score : m), others[0].score) : null;
      let aScore;
      if (viewerLeads) aScore = worseBy(playerBest);                         // the viewer holds P1 for their hour
      else { aScore = st.a; if (realMax != null && better(realMax, aScore)) aScore = beatBy(realMax); } // else stay ahead of the field
      const list = [{ name: "ATHARVA TRIVEDI 🐐", score: aScore, a: true }].concat(rows);
      list.sort((p, q) => (lowerBetter ? p.score - q.score : q.score - p.score));
      const youIdx = list.findIndex((e) => e.you), top = list.slice(0, 5);
      return {
        entries: top, youEntry: list[youIdx], youRank: youIdx + 1,
        youInTop: top.some((e) => e.you), youLead: viewerLeads,
        reclaimMin: st.re ? Math.max(1, Math.ceil((st.re - Date.now()) / 60000)) : 0, isNewBest: isNewBest,
      };
    }

    function submit(score, onRemote) {
      const st = load(), now = Date.now();
      st.you.push(score); st.you.sort((a, b) => (lowerBetter ? a - b : b - a)); st.you = st.you.slice(0, 5);
      const playerBest = st.you[0];
      if (st.re && now >= st.re) { st.a = beatBy(st.ch); st.ch = null; st.re = null; } // an hour later, the #95 reclaims
      if (better(playerBest, st.a)) { if (!st.re) { st.ch = playerBest; st.re = now + HOUR; } else if (better(playerBest, st.ch)) st.ch = playerBest; }
      save(st);
      const viewerLeads = !!st.re && better(playerBest, st.a), isNewBest = score === playerBest;
      const localRows = ghosts.map((g) => ({ name: g.name, score: g.score })).concat([{ name: "YOU", score: playerBest, you: true }]);
      if (onRemote && LB.api) {
        lbRemote(game, { name: lbHandle(), score: score }, lowerBetter, (rows) => {
          if (!rows) return;
          const gRows = rows.map((r) => ({ name: String(r.name || "?").slice(0, 14), score: r.score })).concat([{ name: lbHandle() + " (you)", score: playerBest, you: true }]);
          onRemote(assemble(st, gRows, playerBest, viewerLeads, isNewBest));
        });
      }
      return assemble(st, localRows, playerBest, viewerLeads, isNewBest);
    }
    return { submit };
  }
  function lbRow(pos, e, fmt) {
    const li = document.createElement("li");
    li.className = "lb-row" + (e.a ? " lb-a" : "") + (e.you ? " lb-you" : "");
    const p = document.createElement("span"); p.className = "lb-pos"; p.textContent = "P" + pos;
    const n = document.createElement("span"); n.className = "lb-name"; n.textContent = e.name;
    const s = document.createElement("span"); s.className = "lb-score"; s.textContent = fmt(e.score);
    li.append(p, n, s);
    return li;
  }
  function renderLB(el, res, fmt) {
    el.innerHTML = "";
    res.entries.forEach((e, i) => el.appendChild(lbRow(i + 1, e, fmt)));
    if (!res.youInTop && res.youEntry) {
      const sep = document.createElement("li"); sep.className = "lb-sep"; sep.textContent = "···"; el.appendChild(sep);
      el.appendChild(lbRow(res.youRank, res.youEntry, fmt));
    }
  }
  function lbNote(res) {
    if (res.youLead) return "👑 NEW TRACK RECORD — P1 is yours! The #95 reclaims it in ~" + res.reclaimMin + " min.";
    if (res.isNewBest) return "New personal best · P" + res.youRank + " on the board.";
    return "P" + res.youRank + " · the #95 still holds the record.";
  }

  /* ---------- Engine sound (WebAudio synth, no files) ---------- */
  let soundOn = true, actx = null;
  const revCurve = (function () {
    const n = 256, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = ((3 + 22) * x * 0.3) / (Math.PI + 22 * Math.abs(x)); }
    return c;
  })();
  function unlockAudio() {
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume(); } catch (_) {}
  }
  addEventListener("pointerdown", unlockAudio);
  addEventListener("keydown", unlockAudio);
  function revEngine(big) {
    if (!soundOn) return;
    unlockAudio();
    if (!actx) return;
    const t = actx.currentTime;
    const master = actx.createGain(); master.connect(actx.destination); master.gain.setValueAtTime(0.0001, t);
    const lp = actx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1600; lp.Q.value = 5; lp.connect(master);
    const shaper = actx.createWaveShaper(); shaper.curve = revCurve; shaper.connect(lp);
    const base = 60, peak = base * (big ? 12 : 8);
    const o1 = actx.createOscillator(); o1.type = "sawtooth"; o1.connect(shaper);
    const o2 = actx.createOscillator(); o2.type = "square"; o2.detune.value = -1200; o2.connect(shaper);
    [o1, o2].forEach((o) => {
      o.frequency.setValueAtTime(base, t);
      o.frequency.exponentialRampToValueAtTime(peak, t + 0.18);
      o.frequency.exponentialRampToValueAtTime(base * 2.4, t + 0.5);
      o.frequency.exponentialRampToValueAtTime(peak * 1.05, t + 0.72);
      o.frequency.exponentialRampToValueAtTime(base * 1.4, t + 1.2);
      o.start(t); o.stop(t + 1.3);
    });
    master.gain.exponentialRampToValueAtTime(0.26, t + 0.05);
    master.gain.exponentialRampToValueAtTime(0.15, t + 0.5);
    master.gain.exponentialRampToValueAtTime(0.22, t + 0.72);
    master.gain.exponentialRampToValueAtTime(0.0001, t + 1.26);
    // engine "chop" so it sounds mechanical, not like a plain tone
    const chop = actx.createOscillator(); chop.type = "square"; chop.frequency.value = 24;
    const chopGain = actx.createGain(); chopGain.gain.value = 0.10;
    chop.connect(chopGain); chopGain.connect(master.gain); chop.start(t); chop.stop(t + 1.3);
  }

  /* ---------- Sound toggle ---------- */
  (function soundToggle() {
    const b = $("#soundToggle");
    if (!b) return;
    b.addEventListener("click", () => {
      soundOn = !soundOn;
      b.textContent = soundOn ? "🔊" : "🔇";
      b.setAttribute("aria-pressed", String(soundOn));
      if (soundOn) revEngine(false);
    });
  })();

  /* ---------- Blip the throttle by clicking the start lights ---------- */
  (function revLights() {
    const sl = $("#startLights");
    if (!sl) return;
    sl.style.cursor = "pointer"; sl.title = "blip the throttle";
    sl.addEventListener("click", () => revEngine(true));
  })();

  /* ---------- Intro: lights out ---------- */
  (function intro() {
    const intro = $("#intro");
    if (!intro) return;
    const lights = $$(".intro-lights .light");
    const txt = $(".intro-text");
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      intro.classList.add("done");
      setTimeout(() => (intro.style.display = "none"), 650);
    };
    intro.addEventListener("click", finish);

    if (reduce) { finish(); return; }

    lights.forEach((l, i) => setTimeout(() => l.classList.add("on"), 350 + i * 380));
    setTimeout(() => { if (txt) txt.textContent = "LIGHTS OUT…"; }, 350 + 5 * 380 + 400);
    setTimeout(() => lights.forEach((l) => l.classList.remove("on")), 350 + 5 * 380 + 750);
    setTimeout(finish, 350 + 5 * 380 + 950);
    setTimeout(finish, 6000); // safety net
  })();

  /* ---------- Role rotator ---------- */
  (function roleRotator() {
    const el = $("#roleRotate");
    if (!el) return;
    const roles = [
      "LLM agent whisperer",
      "RAG pipeline mechanic",
      "5G RAN rookie of the year",
      "full-stack pole-sitter",
      "professional cat herder",
      "prompt-engineering apex-hunter",
    ];
    let ri = 0, ci = 0, deleting = false;
    function tick() {
      const word = roles[ri];
      el.textContent = word.slice(0, ci);
      if (!deleting && ci < word.length) { ci++; setTimeout(tick, 55); }
      else if (!deleting && ci === word.length) { deleting = true; setTimeout(tick, 1500); }
      else if (deleting && ci > 0) { ci--; setTimeout(tick, 28); }
      else { deleting = false; ri = (ri + 1) % roles.length; setTimeout(tick, 350); }
    }
    tick();
  })();

  /* ---------- Hero start lights (looping) ---------- */
  (function heroLights() {
    const wrap = $("#startLights");
    if (!wrap || reduce) return;
    const lights = $$(".sl", wrap);
    const cap = $("#slCaption");
    function sequence() {
      lights.forEach((l) => l.classList.remove("on"));
      cap.classList.remove("go");
      cap.textContent = "GET READY…";
      lights.forEach((l, i) => setTimeout(() => l.classList.add("on"), 500 + i * 500));
      const outAt = 500 + 5 * 500 + 800 + Math.random() * 1200;
      setTimeout(() => {
        lights.forEach((l) => l.classList.remove("on"));
        cap.textContent = "LIGHTS OUT AND AWAY WE GO";
        cap.classList.add("go");
      }, outAt);
      setTimeout(sequence, outAt + 3200);
    }
    sequence();
  })();

  /* ---------- Scroll reveal + skill bars ---------- */
  (function reveal() {
    const items = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach((i) => i.classList.add("in"));
      fillBars(document);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          fillBars(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    items.forEach((i) => io.observe(i));
    function fallback() { items.forEach((i) => i.classList.add("in")); }
    setTimeout(fallback, 4000);
  })();

  function fillBars(scope) {
    $$(".bar", scope).forEach((bar) => {
      const v = bar.getAttribute("data-val");
      const fill = $("i", bar);
      if (fill) requestAnimationFrame(() => (fill.style.width = v + "%"));
    });
  }

  /* ---------- Team radio: jokes ---------- */
  (function jokes() {
    const btn = $("#jokeBtn");
    const out = $("#jokeText");
    if (!btn || !out) return;
    const set = [
      "My code doesn't have bugs — it ships undocumented features that arrive on their own schedule.",
      "A cat sat on my keyboard and pushed to main. Honestly, cleanest commit of the week.",
      "How does a cat debug? It stares at the bug until the bug feels judged and leaves.",
      "Why did the RRC connection go to therapy? Too many unresolved states.",
      "The two hardest things in computing: cache invalidation, naming things, and counting Lewis Hamilton's championships.",
      "A cat's favourite language is Python. It enjoys squeezing things and ignoring you afterwards.",
      "Why did the developer go broke? He used up all his cache.",
      "I don't always test in production, but when I do, I like to feel something.",
      "Why don't cats play poker in the jungle? Too many cheetahs.",
      "My RAG pipeline is like my cat: brilliant retrieval, absolutely no context.",
      "An F1 crew changes four tyres in under 2 seconds. My CI pipeline: still running. Estimated finish: heat death of the universe.",
    ];
    let last = -1;
    btn.addEventListener("click", () => {
      let i;
      do { i = Math.floor(Math.random() * set.length); } while (i === last && set.length > 1);
      last = i;
      out.style.opacity = 0;
      setTimeout(() => { out.textContent = "📻 " + set[i]; out.style.opacity = 1; }, 150);
      btn.textContent = "🎙️ Another one";
    });
    out.style.transition = "opacity 0.15s ease";
  })();

  /* ---------- Most painful day: flip ---------- */
  (function pain() {
    const card = $("#painCard");
    if (!card) return;
    card.addEventListener("click", () => card.classList.toggle("flipped"));
  })();

  /* ---------- Reaction test ---------- */
  (function reaction() {
    const btn = $("#reactBtn");
    const lightsWrap = $("#reactLights");
    const info = $("#reactInfo");
    const result = $("#reactResult");
    const boardEl = $("#reactBoard");
    const board = createLeaderboard("react", { lowerBetter: true, atharvaBase: 149, margin: 4, floor: 95, ghosts: [{ name: "quick_paws", score: 171 }, { name: "early_apex", score: 196 }, { name: "decaf_dan", score: 224 }, { name: "formation_lap", score: 255 }] });
    if (!btn || !lightsWrap) return;
    const lights = $$("span", lightsWrap);
    let state = "idle"; // idle | arming | live
    let startT = 0, timers = [];

    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
    function resetLights() { lights.forEach((l) => l.classList.remove("on")); lightsWrap.classList.remove("go"); }

    function begin() {
      clearTimers(); resetLights(); result.textContent = "";
      state = "arming";
      info.textContent = "Lights coming on… wait for them to go out.";
      btn.textContent = "Waiting…"; btn.disabled = true;
      lights.forEach((l, i) => timers.push(setTimeout(() => l.classList.add("on"), 600 + i * 550)));
      const outAt = 600 + 5 * 550 + 700 + Math.random() * 2200;
      timers.push(setTimeout(() => {
        resetLights(); lightsWrap.classList.add("go");
        state = "live"; startT = performance.now();
        info.textContent = "GO! Tap anywhere in the box!";
        btn.textContent = "TAP NOW!"; btn.disabled = false;
        revEngine(true);
      }, outAt));
    }

    function tap() {
      if (state === "idle") { begin(); return; }
      if (state === "arming") { // jumped the start
        clearTimers(); resetLights(); state = "idle";
        result.textContent = "🚩 JUMP START — 5s penalty. Patience, rookie.";
        info.textContent = "Beat a real F1 start. Wait for lights out, then tap.";
        btn.textContent = "Try again"; btn.disabled = false;
        return;
      }
      if (state === "live") {
        const ms = Math.round(performance.now() - startT);
        state = "idle";
        result.textContent = `⏱️ ${ms} ms — ${rate(ms)}`;
        if (boardEl) {
          const res = board.submit(ms, (g) => renderLB(boardEl, g, (v) => v + " ms"));
          renderLB(boardEl, res, (v) => v + " ms");
          boardEl.hidden = false;
          if (res.youLead) result.textContent += ` · 👑 P1 for ~${res.reclaimMin}m`;
          else if (res.isNewBest) result.textContent += ` · PB, P${res.youRank}`;
        }
        info.textContent = "Beat a real F1 start. Wait for lights out, then tap.";
        btn.textContent = "Go again"; btn.disabled = false;
      }
    }

    function rate(ms) {
      if (ms < 120) return "suspiciously quick 👀 (did you jump it?)";
      if (ms < 190) return "Hamilton-tier 🏆";
      if (ms < 240) return "podium reactions 🥉";
      if (ms < 320) return "solid midfield points";
      if (ms < 450) return "need more coffee ☕";
      return "backmarker — box for tyres 🐢";
    }

    btn.addEventListener("click", tap);
    lightsWrap.addEventListener("click", () => { if (state === "live" || state === "arming") tap(); });
  })();

  /* ---------- Tire compound theme switch ---------- */
  (function compounds() {
    const glow = { "#e10600": "rgba(225,6,0,0.45)", "#ffd400": "rgba(255,212,0,0.40)", "#e6e6e6": "rgba(230,230,230,0.30)" };
    const onAccent = { "#e10600": "#fff", "#ffd400": "#111", "#e6e6e6": "#111" };
    $$(".tyre").forEach((t) => {
      t.addEventListener("click", () => {
        $$(".tyre").forEach((x) => x.classList.remove("active"));
        t.classList.add("active");
        const a = t.getAttribute("data-accent");
        document.documentElement.style.setProperty("--accent", a);
        document.documentElement.style.setProperty("--accent-glow", glow[a] || glow["#e10600"]);
        document.documentElement.style.setProperty("--on-accent", onAccent[a] || "#fff");
      });
    });
  })();

  /* ---------- Nav: mobile burger + close on click ---------- */
  (function nav() {
    const burger = $("#burger");
    const links = $(".nav-links");
    if (!burger || !links) return;
    burger.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      burger.setAttribute("aria-expanded", open);
    });
    $$(".nav-links a").forEach((a) =>
      a.addEventListener("click", () => { links.classList.remove("open"); burger.setAttribute("aria-expanded", false); })
    );
  })();

  /* ---------- Project card mouse glow ---------- */
  (function projGlow() {
    $$(".proj").forEach((p) => {
      p.addEventListener("mousemove", (e) => {
        const r = p.getBoundingClientRect();
        p.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
        p.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
      });
    });
  })();

  /* ---------- Placeholder link guard ---------- */
  (function editLinks() {
    $$("[data-edit-link]").forEach((a) => {
      a.addEventListener("click", (e) => {
        if (a.getAttribute("href") === "#" || !a.getAttribute("href")) {
          e.preventDefault();
          const old = a.textContent;
          a.textContent = "↳ add your link in index.html";
          setTimeout(() => (a.textContent = old), 1600);
        }
      });
    });
  })();

  /* ---------- Paw-print cursor trail ---------- */
  (function pawTrail() {
    const canvas = $("#pawTrail");
    if (!canvas || reduce) return;
    const ctx = canvas.getContext("2d");
    let w, h, prints = [], lastX = 0, lastY = 0, side = 1;
    function size() { w = canvas.width = innerWidth; h = canvas.height = innerHeight; }
    size(); addEventListener("resize", size);

    addEventListener("mousemove", (e) => {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      if (Math.hypot(dx, dy) < 45) return;
      lastX = e.clientX; lastY = e.clientY; side *= -1;
      const ang = Math.atan2(dy, dx);
      prints.push({ x: e.clientX + Math.cos(ang + Math.PI / 2) * 8 * side, y: e.clientY + Math.sin(ang + Math.PI / 2) * 8 * side, life: 1, rot: ang });
      if (prints.length > 40) prints.shift();
    });

    function paw(p) {
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#e10600";
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot + Math.PI / 2);
      ctx.globalAlpha = p.life * 0.5; ctx.fillStyle = accent;
      ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 6, 0, 0, Math.PI * 2); ctx.fill(); // main pad
      [[-5, -5], [-1.8, -8], [1.8, -8], [5, -5]].forEach(([tx, ty]) => {
        ctx.beginPath(); ctx.ellipse(tx, ty, 1.9, 2.4, 0, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    }
    (function loop() {
      ctx.clearRect(0, 0, w, h);
      prints.forEach((p) => { p.life -= 0.012; paw(p); });
      prints = prints.filter((p) => p.life > 0);
      requestAnimationFrame(loop);
    })();
  })();

  /* ---------- Konami code → safety car ---------- */
  (function konami() {
    const seq = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
    let i = 0;
    const banner = $("#safetyCar");
    addEventListener("keydown", (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      i = (k === seq[i]) ? i + 1 : (k === seq[0] ? 1 : 0);
      if (i === seq.length) {
        i = 0;
        if (!banner) return;
        banner.classList.add("show");
        document.body.style.filter = "hue-rotate(15deg)";
        setTimeout(() => { banner.classList.remove("show"); document.body.style.filter = ""; }, 4000);
      }
    });
  })();

  /* ---------- More easter eggs ---------- */
  (function easterEggs() {
    const accent = () => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#e10600";
    function readableOn(hex) {
      const m = String(hex).trim().replace("#", "");
      if (m.length < 6) return "#fff";
      const r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#111" : "#fff";
    }

    // toast (reused for several eggs) — one element, always hides cleanly
    let toastEl;
    function toast(msg, color) {
      if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "egg-toast"; document.body.appendChild(toastEl); }
      const bg = color || accent();
      toastEl.textContent = msg;
      toastEl.style.setProperty("--toast-bg", bg);
      toastEl.style.setProperty("--toast-fg", readableOn(bg));
      toastEl.classList.remove("show"); void toastEl.offsetWidth; toastEl.classList.add("show");
      clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove("show"), 2800);
    }

    function confetti(colors) {
      colors = colors || [accent(), "#ffffff", "#111111", "#ffd400"];
      const box = document.createElement("div"); box.className = "confetti-box"; document.body.appendChild(box);
      for (let i = 0; i < 90; i++) {
        const p = document.createElement("i"); p.className = "confetti-piece";
        p.style.left = Math.random() * 100 + "vw";
        p.style.background = colors[i % colors.length];
        p.style.animationDelay = Math.random() * 0.6 + "s";
        p.style.animationDuration = 2 + Math.random() * 1.8 + "s";
        box.appendChild(p);
      }
      setTimeout(() => box.remove(), 4400);
    }

    function purpleFlash() {
      const f = document.createElement("div"); f.className = "purple-flash"; document.body.appendChild(f);
      setTimeout(() => f.remove(), 950);
    }

    function catParade() {
      const cats = ["🐱","😺","😸","😼","🙀","😻","🐈","🐈‍⬛"];
      for (let i = 0; i < 12; i++) {
        const c = document.createElement("span"); c.className = "run-cat";
        c.textContent = cats[Math.floor(Math.random() * cats.length)];
        c.style.top = Math.random() * 85 + "vh";
        c.style.fontSize = (22 + Math.random() * 30) + "px";
        c.style.animationDuration = (2.4 + Math.random() * 2.2) + "s";
        c.style.animationDelay = (Math.random() * 0.8) + "s";
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 5400);
      }
    }

    let drsT;
    function drs() {
      document.body.classList.add("drs");
      revEngine(true);
      toast("⚡ DRS ENABLED — overtake mode", accent());
      clearTimeout(drsT); drsT = setTimeout(() => document.body.classList.remove("drs"), 4000);
    }

    function hamilton() {
      purpleFlash();
      revEngine(true);
      confetti(["#b026ff", "#e10600", "#ffffff", "#00d2be"]);
      toast("STILL WE RISE — GET IN THERE LEWIS! 🐐", "#b026ff");
    }

    // typed keyword listener
    const words = {
      "44": hamilton, "lewis": hamilton, "hamilton": hamilton,
      "meow": () => { catParade(); toast("meow 😺", accent()); },
      "cat": () => { catParade(); toast("here, kitty 🐾", accent()); },
      "boxbox": () => toast("📻 BOX BOX BOX — pit this lap!", "#ffd400"),
      "box": () => toast("📻 BOX BOX — in for tyres!", "#ffd400"),
      "drs": drs,
      "meep": () => toast("wrong cat noise, but okay 😹", accent()),
    };
    let buf = "";
    addEventListener("keydown", (e) => {
      if (e.key.length !== 1) return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      buf = (buf + e.key.toLowerCase()).slice(-12);
      for (const w in words) { if (buf.endsWith(w)) { words[w](); buf = ""; break; } }
    });

    // click the cat in the hero car
    const cat = document.querySelector(".cat-driver");
    if (cat) {
      let meows = 0;
      cat.addEventListener("click", (e) => {
        e.stopPropagation();
        revEngine(false);
        cat.classList.remove("cat-wobble");
        requestAnimationFrame(() => requestAnimationFrame(() => cat.classList.add("cat-wobble")));
        meows++;
        toast(meows >= 5 ? "okay okay, I'll stop 😹" : "meow 😺", accent());
        if (meows === 5) catParade();
        setTimeout(() => cat.classList.remove("cat-wobble"), 650);
      });
    }

    // checkered flag when you reach the finish line (footer)
    const footer = document.querySelector(".footer");
    if (footer && "IntersectionObserver" in window) {
      let waved = false;
      const io = new IntersectionObserver((ents) => {
        ents.forEach((en) => {
          if (en.isIntersecting && !waved) { waved = true; toast("🏁 CHECKERED FLAG — you finished the lap!", accent()); }
        });
      }, { threshold: 0.55 });
      io.observe(footer);
    }

    // greeting for engineers who open DevTools
    try {
      console.log("%c🏎️🐱  Looking under the hood?", "font-size:16px;font-weight:bold;color:#e10600");
      console.log("%cType 44 for a Hamilton moment. Also try: meow, box, drs — and the Konami code. — Atharva, Driver #95", "color:#8a8f9a");
    } catch (_) {}
  })();

  /* ---------- Hero overtaking mini-game · Spa-Francorchamps ---------- */
  (function raceGameModule() {
    const wrap = $("#raceGame");
    const canvas = $("#raceCanvas");
    const carSvg = $(".f1car");
    const speedLines = $(".speed-lines");
    const raceMeBtn = $("#raceMe");
    if (!wrap || !canvas || !raceMeBtn) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    // track geometry: asphalt in the middle, grass/gravel/kerb verges top & bottom
    const LANES = 3, BORDER = 48;
    const trackTop = BORDER, trackBot = H - BORDER, trackH = H - 2 * BORDER, laneH = trackH / LANES;
    const laneY = (i) => trackTop + laneH * (i + 0.5);
    const OL = 92, PL = 96, playerX = 58; // opponent length, player length, player x

    // 2026 F1 grid — real numbers + team colours (easter egg)
    const GRID = [
      { n: "1",  d: "NORRIS",     c: "#ff8000", f: "#111" },
      { n: "81", d: "PIASTRI",    c: "#ff8000", f: "#111" },
      { n: "44", d: "HAMILTON",   c: "#e8002d", f: "#fff" },
      { n: "16", d: "LECLERC",    c: "#e8002d", f: "#fff" },
      { n: "3",  d: "VERSTAPPEN", c: "#14264f", f: "#fff" },
      { n: "6",  d: "HADJAR",     c: "#14264f", f: "#fff" },
      { n: "63", d: "RUSSELL",    c: "#00d2be", f: "#111" },
      { n: "12", d: "ANTONELLI",  c: "#00d2be", f: "#111" },
      { n: "23", d: "ALBON",      c: "#37beff", f: "#111" },
      { n: "55", d: "SAINZ",      c: "#37beff", f: "#111" },
      { n: "27", d: "HULKENBERG", c: "#cdd1d8", f: "#111" },
      { n: "5",  d: "BORTOLETO",  c: "#cdd1d8", f: "#111" },
      { n: "14", d: "ALONSO",     c: "#229971", f: "#fff" },
      { n: "18", d: "STROLL",     c: "#229971", f: "#fff" },
      { n: "10", d: "GASLY",      c: "#ff3fa4", f: "#111" },
      { n: "43", d: "COLAPINTO",  c: "#ff3fa4", f: "#111" },
      { n: "31", d: "OCON",       c: "#6e7681", f: "#fff" },
      { n: "87", d: "BEARMAN",    c: "#6e7681", f: "#fff" },
      { n: "30", d: "LAWSON",     c: "#3b5bdb", f: "#fff" },
      { n: "41", d: "LINDBLAD",   c: "#3b5bdb", f: "#fff" },
      { n: "11", d: "PEREZ",      c: "#c6a15b", f: "#111" },
      { n: "77", d: "BOTTAS",     c: "#c6a15b", f: "#111" },
    ];
    const CORNERS = ["LA SOURCE", "EAU ROUGE", "RAIDILLON", "KEMMEL STRAIGHT", "LES COMBES", "POUHON", "BLANCHIMONT", "BUS STOP"];

    const overlay = $("#rgOverlay");
    const elPos = $("#rgPos"), elScore = $("#rgScore"), elBest = $("#rgBest");
    const rgTitle = overlay.querySelector(".rg-title");
    const rgSub = overlay.querySelector(".rg-sub");
    const rgStart = $("#rgStart");
    const rgBoard = $("#rgBoard"), rgNote = $("#rgNote");
    const board = createLeaderboard("race", { lowerBetter: false, atharvaBase: 42, margin: 2, ghosts: [{ name: "box_box_cat", score: 31 }, { name: "kimi_fan_04", score: 26 }, { name: "midfield_meow", score: 20 }, { name: "sunday_driver", score: 13 }] });

    let state = "idle"; // idle | running | over
    let player, opps, overtakes, best = 0, speed, spawnT, roadOffset, lastRAF, lastLane, lastDrv;
    let wet, sfX, cornerT, cornerIdx, passMsg, passT;

    function reset() {
      player = { lane: 1, y: laneY(1) };
      opps = []; overtakes = 0; speed = 200; spawnT = 0; roadOffset = 0; lastLane = -1; lastDrv = -1;
      wet = false; sfX = W + 500; cornerT = 0; cornerIdx = 0; passMsg = ""; passT = 0;
      updateHud();
    }
    function updateHud() {
      const pos = Math.max(1, 20 - overtakes);
      elPos.textContent = pos === 1 ? "P1 🏆" : "P" + pos;
      elScore.textContent = overtakes + (overtakes === 1 ? " overtake" : " overtakes");
      elBest.textContent = best ? "best " + best : "";
    }
    function spawn() {
      let lane; do { lane = Math.floor(Math.random() * LANES); } while (lane === lastLane); lastLane = lane;
      let di; do { di = Math.floor(Math.random() * GRID.length); } while (di === lastDrv); lastDrv = di;
      opps.push({ x: W + 80, lane, drv: GRID[di], passed: false });
    }
    function start() {
      reset(); overlay.hidden = true; state = "running";
      lastRAF = performance.now(); revEngine(true);
      requestAnimationFrame(loop);
    }
    function gameOver() {
      state = "over";
      if (overtakes > best) best = overtakes;
      const pos = Math.max(1, 20 - overtakes);
      rgTitle.textContent = "CRASH! 💥";
      rgSub.textContent = "Finished P" + pos + " · " + overtakes + " overtaken";
      rgStart.textContent = "Race again ▸";
      overlay.hidden = false; updateHud();
      if (rgBoard) {
        const res = board.submit(overtakes, (g) => { renderLB(rgBoard, g, (v) => String(v)); rgNote.textContent = lbNote(g); });
        renderLB(rgBoard, res, (v) => String(v));
        rgNote.textContent = lbNote(res);
        rgBoard.hidden = false; rgNote.hidden = false;
      }
    }

    function loop(now) {
      if (state !== "running") return;
      let dt = (now - lastRAF) / 1000; lastRAF = now;
      if (dt > 0.05) dt = 0.05;
      speed = Math.min(560, 200 + overtakes * 8);
      const gap = Math.max(1.0, 1.8 - overtakes * 0.02);
      spawnT += dt; if (spawnT >= gap) { spawnT = 0; spawn(); }
      roadOffset = (roadOffset + speed * dt) % 48;
      sfX -= speed * dt; if (sfX < -40) sfX = W + 900 + Math.random() * 900;
      cornerT += dt; if (cornerT > 5) { cornerT = 0; cornerIdx = (cornerIdx + 1) % CORNERS.length; }
      if (passT > 0) passT -= dt;
      player.y += (laneY(player.lane) - player.y) * Math.min(1, dt * 14);
      for (const o of opps) {
        o.x -= speed * dt;
        if (!o.passed && o.x + OL < playerX) {
          o.passed = true; overtakes++; updateHud();
          passMsg = o.drv.n === "3" ? "P3 DOWN — GET IN THERE! 🐐" : "OVERTOOK " + o.drv.d;
          passT = 1.3;
          if (overtakes % 5 === 0) revEngine(false);
        }
        if (o.lane === player.lane && o.x < playerX + PL * 0.8 && o.x + OL > playerX + PL * 0.15) { return gameOver(); }
      }
      opps = opps.filter((o) => o.x > -OL - 30);
      draw();
      requestAnimationFrame(loop);
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    // top-down F1 car, pointing right
    function drawF1(x, y, L, color, num, fg) {
      const bw = 11;
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = "rgba(0,0,0,0.30)"; ctx.beginPath(); ctx.ellipse(L * 0.5, 4, L * 0.5, 15, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#191a1f"; // wheels
      roundRect(L * 0.12, -20, L * 0.16, 13, 3); ctx.fill();
      roundRect(L * 0.12, 7, L * 0.16, 13, 3); ctx.fill();
      roundRect(L * 0.70, -20, L * 0.16, 13, 3); ctx.fill();
      roundRect(L * 0.70, 7, L * 0.16, 13, 3); ctx.fill();
      ctx.fillStyle = "#26282e"; roundRect(-3, -19, 8, 38, 2); ctx.fill(); // rear wing
      ctx.fillStyle = color; roundRect(-3, -19, 3, 38, 2); ctx.fill();
      ctx.fillStyle = "#26282e"; roundRect(L * 0.86, -17, 8, 34, 2); ctx.fill(); // front wing
      ctx.fillStyle = color; // body tapered to nose
      ctx.beginPath();
      ctx.moveTo(5, -bw); ctx.lineTo(L * 0.62, -bw); ctx.lineTo(L * 0.99, -3.5);
      ctx.lineTo(L * 0.99, 3.5); ctx.lineTo(L * 0.62, bw); ctx.lineTo(5, bw); ctx.closePath(); ctx.fill();
      ctx.beginPath(); // sidepods
      ctx.moveTo(L * 0.30, -bw); ctx.quadraticCurveTo(L * 0.44, -bw - 4, L * 0.58, -bw);
      ctx.lineTo(L * 0.58, bw); ctx.quadraticCurveTo(L * 0.44, bw + 4, L * 0.30, bw); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(L * 0.9, 0); ctx.stroke();
      ctx.fillStyle = "rgba(0,0,0,0.62)"; ctx.beginPath(); ctx.ellipse(L * 0.55, 0, L * 0.08, 5.5, 0, 0, 7); ctx.fill(); // cockpit
      ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(L * 0.62, 0, 6, -1.4, 1.4); ctx.stroke(); // halo
      ctx.fillStyle = fg; ctx.font = "700 13px 'Titillium Web', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(num, L * 0.22, 0); ctx.textBaseline = "alphabetic";
      ctx.restore();
    }

    function drawKerb(y0, h, phase) {
      const bw2 = 24, start = -(((roadOffset * 2) + phase) % (bw2 * 2));
      for (let x = start, i = 0; x < W; x += bw2, i++) {
        ctx.fillStyle = i % 2 === 0 ? "#d21e1e" : "#eef1f4";
        ctx.fillRect(Math.floor(x), y0, bw2 + 1, h);
      }
    }
    function drawTrees(edgeY, dir) {
      ctx.fillStyle = "#183a20";
      const gap = 58, off = (roadOffset * 0.9) % gap;
      for (let x = -off - gap; x < W + gap; x += gap) {
        const th = 16 + ((Math.floor(x / gap) * 37) % 9 + 9) % 9;
        ctx.beginPath(); ctx.moveTo(x, edgeY); ctx.lineTo(x + 9 * dir, edgeY - dir * th); ctx.lineTo(x + 18 * dir, edgeY); ctx.closePath(); ctx.fill();
      }
    }
    function drawWorld() {
      // grass + mown stripes + trees
      ctx.fillStyle = "#2f7d33"; ctx.fillRect(0, 0, W, trackTop); ctx.fillRect(0, trackBot, W, H - trackBot);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      const sw = 46, go = (roadOffset * 0.6) % (sw * 2);
      for (let x = -go; x < W; x += sw * 2) { ctx.fillRect(x, 0, sw, 18); ctx.fillRect(x, H - 18, sw, 18); }
      drawTrees(6, 1); drawTrees(H - 6, -1);
      // gravel + speckle
      ctx.fillStyle = "#c9a86a"; ctx.fillRect(0, trackTop - 28, W, 16); ctx.fillRect(0, trackBot + 12, W, 16);
      ctx.fillStyle = "rgba(0,0,0,0.14)";
      for (let i = 0; i < 46; i++) { const gx = ((i * 61 - roadOffset * 0.8) % W + W) % W; ctx.fillRect(gx, trackTop - 27 + (i % 14), 2, 2); ctx.fillRect((gx + 120) % W, trackBot + 13 + (i % 14), 2, 2); }
      // red/white kerbs
      drawKerb(trackTop - 12, 12, 0); drawKerb(trackBot, 12, 12);
      // asphalt
      ctx.fillStyle = wet ? "#23272f" : "#2c303a"; ctx.fillRect(0, trackTop, W, trackH);
      if (wet) { ctx.fillStyle = "rgba(120,160,220,0.06)"; ctx.fillRect(0, trackTop, W, trackH); }
      // lane dashes
      ctx.strokeStyle = "rgba(255,255,255,0.38)"; ctx.lineWidth = 3; ctx.setLineDash([30, 26]); ctx.lineDashOffset = -roadOffset;
      for (let i = 1; i < LANES; i++) { ctx.beginPath(); ctx.moveTo(0, trackTop + laneH * i); ctx.lineTo(W, trackTop + laneH * i); ctx.stroke(); }
      ctx.setLineDash([]);
      // start/finish checker
      if (sfX < W + 40) {
        const cw = 9, rows = Math.ceil(trackH / cw);
        for (let r = 0; r < rows; r++) for (let c = 0; c < 4; c++) {
          ctx.fillStyle = (r + c) % 2 === 0 ? "#f4f5f7" : "#111318";
          ctx.fillRect(sfX + c * cw, trackTop + r * cw, cw, cw);
        }
      }
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      drawWorld();
      for (const o of opps) drawF1(o.x, laneY(o.lane), OL, o.drv.c, o.drv.n, o.drv.f);
      drawF1(playerX, player.y, PL, "#e10600", "95", "#fff");
      if (wet) {
        ctx.strokeStyle = "rgba(200,220,255,0.35)"; ctx.lineWidth = 1;
        for (let i = 0; i < 60; i++) { const rx = (i * 53 + roadOffset * 6) % W, ry = (i * 97 + roadOffset * 10) % H; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 6, ry + 12); ctx.stroke(); }
      }
      // corner name
      ctx.fillStyle = "rgba(0,0,0,0.55)"; roundRect(10, trackBot - 22, 172, 18, 4); ctx.fill();
      ctx.fillStyle = "#ffd400"; ctx.font = "700 11px 'Share Tech Mono', monospace"; ctx.textAlign = "left"; ctx.fillText("SECTOR ▸ " + CORNERS[cornerIdx], 16, trackBot - 9);
      // overtake callout
      if (passT > 0) {
        ctx.globalAlpha = Math.min(1, passT * 1.6);
        ctx.textAlign = "center"; ctx.font = "700 14px 'Rajdhani', sans-serif";
        const tw = ctx.measureText(passMsg).width + 22;
        ctx.fillStyle = passMsg.indexOf("GET IN") >= 0 ? "#b026ff" : "rgba(10,11,15,0.82)";
        roundRect(W / 2 - tw / 2, trackTop + 6, tw, 22, 5); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.fillText(passMsg, W / 2, trackTop + 21);
        ctx.globalAlpha = 1;
      }
    }

    function changeLane(d) { if (state === "running") player.lane = Math.max(0, Math.min(LANES - 1, player.lane + d)); }

    addEventListener("keydown", (e) => {
      if (wrap.hidden) return;
      if (e.key === "ArrowUp") { e.preventDefault(); changeLane(-1); }
      else if (e.key === "ArrowDown") { e.preventDefault(); changeLane(1); }
      else if (e.key === "r" || e.key === "R") { wet = !wet; if (state !== "running") draw(); }
      else if ((e.key === " " || e.key === "Enter") && state !== "running") { e.preventDefault(); start(); }
    });
    $("#rgUp").addEventListener("click", () => changeLane(-1));
    $("#rgDown").addEventListener("click", () => changeLane(1));
    rgStart.addEventListener("click", start);

    function openGame() {
      wrap.hidden = false;
      if (carSvg) carSvg.style.display = "none";
      if (speedLines) speedLines.style.display = "none";
      raceMeBtn.style.display = "none";
      state = "idle";
      rgTitle.textContent = "SPA · BELGIAN GP 🇧🇪";
      rgSub.textContent = "↑ / ↓ change lane · overtake the 2026 grid · R = rain";
      rgStart.textContent = "Lights out ▸";
      if (rgBoard) { rgBoard.hidden = true; rgNote.hidden = true; }
      overlay.hidden = false; reset(); draw();
    }
    function closeGame() {
      state = "idle"; wrap.hidden = true;
      if (carSvg) carSvg.style.display = "";
      if (speedLines) speedLines.style.display = "";
      raceMeBtn.style.display = "";
    }
    raceMeBtn.addEventListener("click", openGame);
    $("#rgExit").addEventListener("click", closeGame);
  })();
})();
