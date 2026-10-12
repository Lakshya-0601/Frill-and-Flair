/* =========================================================
   Saree drape — a silk ribbon drawn on <canvas>.
   The fabric waves, twists (showing its darker reverse side),
   has a zari border, butis (small motifs) and a striped pallu.
   It unfurls on load, reacts to the mouse and changes as you scroll.

   Usage: <canvas class="drape" data-layers="dupatta,saree"></canvas>
   Layers are drawn back-to-front using the PRESETS below.
   ========================================================= */
(() => {
  const PRESETS = {
    saree: {
      body: [122, 20, 38], back: [80, 12, 28], border: [206, 166, 78],
      motif: [230, 196, 116], pallu: [168, 22, 70],
      width: 0.14, y: 0.7, yMobile: 0.5, amp: 0.075, freq: 1.05, twist: 1.25, speed: 0.5, palluAt: 0.74, phase: 0,
    },
    dupatta: {
      body: [18, 92, 88], back: [10, 56, 54], border: [236, 160, 52],
      motif: [246, 226, 178], pallu: [226, 140, 40],
      width: 0.06, y: 0.36, yMobile: 0.24, amp: 0.1, freq: 1.45, twist: 1.5, speed: 0.62, palluAt: 0.86, phase: 2.4, alpha: 0.92,
    },
    rani: {
      body: [190, 28, 90], back: [128, 16, 58], border: [214, 174, 84],
      motif: [250, 222, 150], pallu: [232, 150, 45],
      width: 0.12, y: 0.42, amp: 0.08, freq: 1.2, twist: 1.3, speed: 0.5, palluAt: 0.78, phase: 1.1,
    },
    marigold: {
      body: [226, 142, 40], back: [168, 94, 22], border: [122, 20, 38],
      motif: [122, 20, 38], pallu: [122, 20, 38],
      width: 0.055, y: 0.3, amp: 0.12, freq: 1.6, twist: 1.6, speed: 0.7, palluAt: 0.88, phase: 3.6, alpha: 0.95,
    },
    gold: {
      body: [201, 162, 76], back: [140, 108, 44], border: [246, 238, 225],
      motif: [110, 20, 35], pallu: [227, 201, 138],
      width: 0.1, y: 0.5, amp: 0.12, freq: 1.2, twist: 1.4, speed: 0.45, palluAt: 0.8, phase: 0.6,
    },
  };

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const rgb = (c, k = 1, s = 0) =>
    `rgb(${clamp(c[0] * k + s * 255, 0, 255) | 0},${clamp(c[1] * k + s * 255, 0, 255) | 0},${clamp(c[2] * k + s * 255, 0, 255) | 0})`;

  class Drape {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.layers = (canvas.dataset.layers || 'saree')
        .split(',')
        .map((n) => Object.assign({ alpha: 1 }, PRESETS[n.trim()] || PRESETS.saree));
      this.section = canvas.closest('section') || canvas.parentElement;
      this.mouse = { x: 0, y: 0, tx: 0, ty: 0, active: false };
      this.t = 0;
      this.reveal = 0;
      this.revealTarget = 0;
      this.scroll = 0;
      this.visible = true;
      this.running = false;
      this.last = performance.now();

      this.resize();
      window.addEventListener('resize', () => this.resize());

      this.section.addEventListener('pointermove', (e) => {
        const r = this.canvas.getBoundingClientRect();
        this.mouse.tx = e.clientX - r.left;
        this.mouse.ty = e.clientY - r.top;
        if (!this.mouse.active) { this.mouse.x = this.mouse.tx; this.mouse.y = this.mouse.ty; }
        this.mouse.active = true;
      });
      this.section.addEventListener('pointerleave', () => { this.mouse.active = false; });

      const start = () => { this.revealTarget = 1; };
      if (window.__ffStarted || canvas.dataset.autostart !== undefined) start();
      else {
        window.addEventListener('ff:start', start, { once: true });
        setTimeout(start, 4000); // safety net
      }

      if (reduce) {
        this.reveal = this.revealTarget = 1;
        this.t = 1.5;
        this.draw();
        return;
      }

      new IntersectionObserver(([entry]) => {
        this.visible = entry.isIntersecting;
        if (this.visible) this.loop();
      }).observe(canvas);
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = this.canvas.getBoundingClientRect();
      this.W = r.width;
      this.H = r.height;
      this.canvas.width = Math.round(r.width * dpr);
      this.canvas.height = Math.round(r.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) this.draw();
    }

    loop() {
      if (this.running) return;
      this.running = true;
      this.last = performance.now();
      const step = (now) => {
        if (!this.visible) { this.running = false; return; }
        const dt = Math.min(0.05, (now - this.last) / 1000);
        this.last = now;
        this.t += dt;
        this.reveal += (this.revealTarget - this.reveal) * Math.min(1, dt * 1.5);

        const r = this.section.getBoundingClientRect();
        this.scroll = clamp(-r.top / Math.max(1, r.height), 0, 1);

        const m = this.mouse;
        m.x += (m.tx - m.x) * 0.08;
        m.y += (m.ty - m.y) * 0.08;

        this.draw();
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    draw() {
      this.ctx.clearRect(0, 0, this.W, this.H);
      for (const L of this.layers) this.drawLayer(L);
    }

    drawLayer(L) {
      const { ctx, W, H, t } = this;
      const s = this.scroll;
      const m = this.mouse;
      const N = Math.round(clamp(W / 9, 90, 170));
      const x0 = -0.12 * W;
      const x1 = 1.12 * W;
      const unit = Math.min(H, W * 0.9);
      const yPos = W < 700 && L.yMobile ? L.yMobile : L.y;
      const baseY = (yPos - s * 0.25) * H;
      const amp = L.amp * H * (1 + s * 0.6);
      const ph = L.phase;
      const sp = L.speed;

      // 1. centre-line, twist and width for every slice of fabric
      const P = new Array(N + 1);
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const x = x0 + (x1 - x0) * u;
        let y = baseY + amp * (
          Math.sin(u * Math.PI * 2 * L.freq + t * sp + ph) * 0.72 +
          Math.sin(u * Math.PI * 4.6 - t * sp * 1.3 + ph * 1.7) * 0.28
        );
        if (m.active) {
          const d = (x - m.x) / (W * 0.16);
          y += (m.y - y) * 0.14 * Math.exp(-d * d);
        }
        const tw =
          Math.sin(u * Math.PI * 1.8 + t * sp * 0.75 + ph) * L.twist +
          Math.sin(u * 13 - t * 0.5 + ph) * 0.22 +
          s * 2.2 * Math.sin(u * 5 + ph);
        const hw = L.width * unit * (0.92 + 0.08 * Math.sin(u * 9 + t * 0.8));
        P[i] = { x, y, u, tw, c: Math.cos(tw), hw, nx: 0, ny: 0 };
      }
      for (let i = 0; i <= N; i++) {
        const a = P[Math.max(0, i - 1)];
        const b = P[Math.min(N, i + 1)];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const l = Math.hypot(dx, dy) || 1;
        P[i].nx = -dy / l;
        P[i].ny = dx / l;
      }

      const lim = Math.floor(N * easeOut(this.reveal));
      if (lim < 1) return;

      // point across the fabric: f = -1 (one edge) .. +1 (other edge)
      const px = (p, f) => p.x + p.nx * p.hw * p.c * f;
      const py = (p, f) => p.y + p.ny * p.hw * p.c * f;
      const quad = (a, b, f0, f1, col) => {
        ctx.beginPath();
        ctx.moveTo(px(a, f0), py(a, f0));
        ctx.lineTo(px(b, f0), py(b, f0));
        ctx.lineTo(px(b, f1), py(b, f1));
        ctx.lineTo(px(a, f1), py(a, f1));
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();
        ctx.strokeStyle = col; // hides hairline seams between slices
        ctx.lineWidth = 0.8;
        ctx.stroke();
      };

      ctx.save();
      ctx.globalAlpha = L.alpha;

      // 2. soft shadow under the fabric (stacked offsets — much cheaper than a blur filter)
      ctx.fillStyle = 'rgba(60, 8, 20, 0.035)';
      for (const off of [0.008, 0.016, 0.024, 0.034]) {
        ctx.beginPath();
        for (let i = 0; i <= lim; i++) ctx.lineTo(px(P[i], 1.06), py(P[i], 1.06) + H * off);
        for (let i = lim; i >= 0; i--) ctx.lineTo(px(P[i], -1.06), py(P[i], -1.06) + H * off);
        ctx.fill();
      }

      // 3. the fabric itself, slice by slice
      const palluStart = Math.floor(N * L.palluAt);
      for (let i = 0; i < lim; i++) {
        const a = P[i];
        const b = P[i + 1];
        const c = (a.c + b.c) / 2;
        const ac = Math.abs(c);
        const front = c >= 0;
        const light = 0.42 + 0.58 * Math.pow(ac, 0.8);
        const spec = Math.pow(Math.max(0, Math.sin(a.tw + 0.7)), 14) * 0.32 * (front ? 1 : 0.5);

        let body = front ? L.body : L.back;
        if (i >= palluStart) {
          const j = (i - palluStart) % 12;
          body = j < 1 ? L.border : j < 3 ? L.back : L.pallu;
          if (!front) body = L.back;
        }

        quad(a, b, -0.78, 0.78, rgb(body, light, spec));
        const bcol = rgb(L.border, light * (front ? 1 : 0.72), spec * 1.4);
        quad(a, b, 0.78, 1, bcol);
        quad(a, b, -1, -0.78, bcol);
        if (front) {
          const lc = rgb(L.back, light);
          quad(a, b, 0.83, 0.86, lc);
          quad(a, b, -0.86, -0.83, lc);
        }
      }

      // 4. butis on the body + zari dots on the border
      const step = Math.max(4, Math.round(N / 40));
      for (let i = 0; i < Math.min(lim, palluStart); i += step) {
        const p = P[i];
        if (p.c < 0.3) continue;
        const r = Math.max(1.4, p.hw * 0.07);
        const ang = Math.atan2(p.ny, p.nx);
        const fs = (i / step) % 2 ? [0.42, -0.42] : [0];
        ctx.fillStyle = rgb(L.motif, 0.6 + 0.4 * p.c);
        for (const f of fs) {
          ctx.beginPath();
          ctx.ellipse(px(p, f), py(p, f), r * p.c, r * 0.75, ang, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillStyle = rgb(L.back, 0.9);
      for (let i = 0; i < lim; i += 2) {
        const p = P[i];
        if (p.c < 0.25) continue;
        const r = Math.max(0.8, p.hw * 0.02);
        ctx.beginPath(); ctx.arc(px(p, 0.92), py(p, 0.92), r, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px(p, -0.92), py(p, -0.92), r, 0, Math.PI * 2); ctx.fill();
      }

      ctx.restore();
    }
  }

  window.__drapes = [...document.querySelectorAll('canvas.drape')].map((c) => new Drape(c));
})();
