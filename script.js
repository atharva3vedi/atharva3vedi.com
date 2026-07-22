/* =========================================================
   ATHARVA TRIVEDI — F1 x CAT PORTFOLIO · interactions
   ========================================================= */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
})();
