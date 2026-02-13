(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  // Reduced motion
  const prefersReduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Toast
  const toastEl = $("#toast");
  let toastTimer = null;

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1500);
  }

  // Page transitions
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-nav]");
    if (!a) return;

    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const href = a.getAttribute("href");
    if (!href || !href.endsWith(".html")) return;

    e.preventDefault();
    document.body.classList.add("fade-out");
    setTimeout(() => (window.location.href = href), 220);
  });

  // Ripple
  document.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".btn");
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ripple";

    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });

  // Funny disabled click
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-disabled='true']");
    if (!el) return;

    e.preventDefault();
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");

    const messages = [
      "Impossible… c’est “Oui” ou “Oui” 💘",
      "Bien tenté 😄",
      "Ce bouton est décoratif 😇",
      "Nop 😌",
    ];
    showToast(messages[Math.floor(Math.random() * messages.length)]);
  });

  // Programme reveal
  const toggleBtn = $("#toggleProgramme");
  const section = $("#programmeSection");
  if (toggleBtn && section) {
    toggleBtn.addEventListener("click", () => {
      const collapsed = section.getAttribute("data-collapsed") === "true";
      section.setAttribute("data-collapsed", collapsed ? "false" : "true");
      toggleBtn.textContent = collapsed ? "Cacher le programme 🙈" : "Afficher le programme 💝";
      if (collapsed) setTimeout(() => section.scrollIntoView({ behavior: "smooth", block: "start" }), 220);
    });
  }

  // =========================
  // RUNAWAY BUTTON — FULL SCREEN
  // + Placeholder invisible pour garder la mise en page
  // =========================

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function ensureRunawayLayer() {
    let layer = document.getElementById("runawayLayer");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "runawayLayer";
      layer.style.position = "fixed";
      layer.style.inset = "0";
      layer.style.pointerEvents = "none"; // n'intercepte pas les clics
      layer.style.zIndex = "9999";
      document.body.appendChild(layer);
    }
    return layer;
  }

  function setupRunaway(btn) {
    const layer = ensureRunawayLayer();

    // Placeholder invisible à la place du bouton (anti-chevauchement)
    const rect0 = btn.getBoundingClientRect();
    const placeholder = document.createElement("div");
    placeholder.setAttribute("aria-hidden", "true");
    placeholder.style.width = `${Math.ceil(rect0.width)}px`;
    placeholder.style.height = `${Math.ceil(rect0.height)}px`;
    placeholder.style.opacity = "0";
    placeholder.style.pointerEvents = "none";
    placeholder.style.display = "inline-block";

    btn.parentElement.insertBefore(placeholder, btn);

    // Déplace le bouton sur un calque fixed (toute la fenêtre)
    const startLeft = rect0.left;
    const startTop = rect0.top - 10;

    btn.style.position = "fixed";
    btn.style.left = `${startLeft}px`;
    btn.style.top = `${startTop}px`;
    btn.style.margin = "0";
    btn.style.zIndex = "10000";
    btn.style.pointerEvents = "auto";
    btn.style.transition = "left 90ms ease, top 90ms ease";
    btn.style.willChange = "left, top";

    layer.appendChild(btn);

    btn.dataset.rx = String(startLeft);
    btn.dataset.ry = String(startTop);

    // >>> Réglages : plus loin + plus agressif
    const triggerRadius = 330;  // déclenche de plus loin
    const minSafeDist = 1;    // essaie de rester loin du curseur
    const pad = 14;             // marge écran
    const escapeBoost = 1;    // saut principal (plus grand = plus loin)

    function viewportBounds() {
      const bw = btn.offsetWidth;
      const bh = btn.offsetHeight;
      const maxX = window.innerWidth - bw - pad;
      const maxY = window.innerHeight - bh - pad;
      return { bw, bh, maxX, maxY };
    }

    function setPos(x, y) {
      const { maxX, maxY } = viewportBounds();
      const nx = clamp(x, pad, maxX);
      const ny = clamp(y, pad, maxY);
      btn.dataset.rx = String(nx);
      btn.dataset.ry = String(ny);
      btn.style.left = `${nx}px`;
      btn.style.top = `${ny}px`;
    }

    function randomFarFrom(px, py) {
      const { bw, bh, maxX, maxY } = viewportBounds();
      for (let tries = 0; tries < 25; tries++) {
        const rx = pad + Math.random() * maxX;
        const ry = pad + Math.random() * maxY;
        const cx = rx + bw / 2;
        const cy = ry + bh / 2;
        if (Math.hypot(cx - px, cy - py) > minSafeDist) return { x: rx, y: ry };
      }
      return { x: pad, y: pad };
    }

    function fleeFrom(px, py) {
      const { bw, bh } = viewportBounds();
      const curX = parseFloat(btn.dataset.rx || "0");
      const curY = parseFloat(btn.dataset.ry || "0");

      const cx = curX + bw / 2;
      const cy = curY + bh / 2;

      const dx = cx - px;
      const dy = cy - py;
      const dist = Math.hypot(dx, dy) || 0.001;

      if (dist > triggerRadius) return;

      // Plus proche => plus violent
      const closeness = (triggerRadius - dist) / triggerRadius; // 0..1
      const push = escapeBoost + closeness * 420;

      let nx = curX + (dx / dist) * push;
      let ny = curY + (dy / dist) * push;

      setPos(nx, ny);

      // Si encore trop proche -> téléportation loin
      const r = btn.getBoundingClientRect();
      const acx = r.left + r.width / 2;
      const acy = r.top + r.height / 2;

      if (Math.hypot(acx - px, acy - py) < minSafeDist) {
        const { x, y } = randomFarFrom(px, py);
        setPos(x, y);
      }
    }

    // Garde la placeholder correcte si resize
    window.addEventListener("resize", () => {
      const r = btn.getBoundingClientRect();
      placeholder.style.width = `${Math.ceil(r.width)}px`;
      placeholder.style.height = `${Math.ceil(r.height)}px`;
      setPos(parseFloat(btn.dataset.rx || "0"), parseFloat(btn.dataset.ry || "0"));
    }, { passive: true });

    // Mouse only
    let raf = null;
    let lastPX = 0, lastPY = 0;

    document.addEventListener("pointermove", (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      lastPX = e.clientX;
      lastPY = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        fleeFrom(lastPX, lastPY);
      });
    });

    // Si elle essaye de cliquer : gros jump ailleurs
    btn.addEventListener("pointerdown", (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      const { x, y } = randomFarFrom(e.clientX, e.clientY);
      setPos(x, y);
    });

    // Position initiale
    setPos(startLeft, startTop);
  }

  window.addEventListener("load", () => {
    document.querySelectorAll("[data-runaway='true']").forEach(setupRunaway);
  });

  // (Optionnel) Canvas hearts — garde ton truc si tu l’as déjà
  function ensureCanvas() {
    let c = document.getElementById("bgCanvas");
    if (!c) {
      c = document.createElement("canvas");
      c.id = "bgCanvas";
      c.className = "bg-canvas";
      document.body.prepend(c);
    }
    return c;
  }

  if (!prefersReduced) {
    const canvas = ensureCanvas();
    const ctx = canvas.getContext("2d");

    let w = 0, h = 0;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener("resize", resize, { passive: true });
    resize();

    const particles = [];
    const rand = (a, b) => a + Math.random() * (b - a);

    function spawn() {
      const kind = Math.random() < 0.75 ? "heart" : "spark";
      particles.push({
        kind,
        x: rand(0, w),
        y: h + rand(20, 140),
        vx: rand(-0.22, 0.22),
        vy: rand(-0.95, -0.45),
        size: kind === "heart" ? rand(10, 18) : rand(2, 4),
        rot: rand(-0.5, 0.5),
        vr: rand(-0.012, 0.012),
        a: kind === "heart" ? rand(0.05, 0.13) : rand(0.06, 0.16),
        life: 0,
        maxLife: rand(7, 12),
      });
      if (particles.length > 120) particles.shift();
    }

    function drawHeart(x, y, size, rot, alpha) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = alpha;
      ctx.font = `700 ${size}px ui-serif, Georgia, "Times New Roman", serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(255, 61, 127, .35)";
      ctx.shadowBlur = 18;

      const g = ctx.createLinearGradient(-size, -size, size, size);
      g.addColorStop(0, "rgba(255,61,127,.95)");
      g.addColorStop(1, "rgba(176,29,255,.9)");
      ctx.fillStyle = g;

      ctx.fillText("♥", 0, 0);
      ctx.restore();
    }

    function drawSpark(x, y, size, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = "rgba(255,255,255,.8)";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    let last = performance.now();
    function tick(now) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      ctx.clearRect(0, 0, w, h);
      if (Math.random() < 0.95) spawn();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        p.x += p.vx * 60 * dt;
        p.y += p.vy * 60 * dt;
        p.rot += p.vr * 60 * dt;

        const t = p.life / p.maxLife;
        const fade = t < 0.15 ? (t / 0.15) : (t > 0.85 ? (1 - (t - 0.85) / 0.15) : 1);
        const alpha = p.a * fade;

        if (p.kind === "heart") drawHeart(p.x, p.y, p.size, p.rot, alpha);
        else drawSpark(p.x, p.y, p.size, alpha);

        if (p.life >= p.maxLife || p.y < -140) particles.splice(i, 1);
      }

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }
})();
