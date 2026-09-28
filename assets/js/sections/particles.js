// Footer: the RS monogram as particles. They start as scattered debris and
// re-form into the logo when the footer scrolls in; the cursor pushes them apart.
import { MARK } from '../brand-paths.js';

export function initParticles({ reduced }) {
  const canvas = document.querySelector('.footer__particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const navy = new Path2D(MARK.navy);
  const orange = new Path2D(MARK.orange);

  let W = 0, H = 0, dpr = 1;
  let parts = [];
  let form = 0; // 0 = debris, 1 = logo
  let visible = false;
  let raf = 0;
  const mouse = { x: -9999, y: -9999, active: false };

  function sample() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    // logo size + placement (right of centre on wide screens)
    const mh = Math.min(H * 0.66, (W * 0.8) / (MARK.width / MARK.height));
    const mw = mh * (MARK.width / MARK.height);
    const ox = W > 900 ? W * 0.62 - mw / 2 : (W - mw) / 2;
    const oy = (H - mh) / 2 - H * 0.04;
    const gap = W > 900 ? 5 : 4;

    const off = document.createElement('canvas');
    off.width = Math.ceil(W);
    off.height = Math.ceil(H);
    const o = off.getContext('2d');
    const s = mw / MARK.width;
    o.setTransform(s, 0, 0, s, ox, oy);
    o.fillStyle = '#00f';
    o.fill(navy, 'evenodd');
    o.fillStyle = '#f00';
    o.fill(orange, 'evenodd');
    const data = o.getImageData(0, 0, off.width, off.height).data;

    const prev = parts;
    const next = [];
    let n = 0;
    for (let y = 0; y < off.height; y += gap) {
      for (let x = 0; x < off.width; x += gap) {
        const i = (y * off.width + x) * 4;
        if (data[i + 3] < 128) continue;
        const isOrange = data[i] > data[i + 2];
        const old = prev[n];
        next.push({
          tx: x + (Math.random() - 0.5) * 0.8,
          ty: y + (Math.random() - 0.5) * 0.8,
          x: old ? old.x : Math.random() * W,
          y: old ? old.y : H * 0.55 + Math.random() * H * 0.45,
          vx: 0,
          vy: 0,
          o: isOrange,
          s: 1.4 + Math.random() * 1.2,
          seed: Math.random() * 1000,
        });
        n++;
      }
    }
    parts = next;
    if (reduced) {
      form = 1;
      for (const p of parts) { p.x = p.tx; p.y = p.ty; }
      draw();
    }
  }

  function step() {
    const t = performance.now() * 0.001;
    const k = 0.008 + form * 0.03;
    const R = 90;
    for (const p of parts) {
      // debris drift until the logo re-forms
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      p.vx += dx * k * form + Math.sin(t * 0.7 + p.seed) * 0.03 * (1 - form);
      p.vy += dy * k * form + Math.cos(t * 0.6 + p.seed) * 0.03 * (1 - form);
      if (mouse.active) {
        const mx = p.x - mouse.x;
        const my = p.y - mouse.y;
        const md = Math.hypot(mx, my);
        if (md < R && md > 0.01) {
          const f = (1 - md / R) * 2.6;
          p.vx += (mx / md) * f;
          p.vy += (my / md) * f;
        }
      }
      p.vx *= 0.86;
      p.vy *= 0.86;
      p.x += p.vx;
      p.y += p.vy;
    }
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(253, 248, 236, 0.9)';
    for (const p of parts) if (!p.o) ctx.fillRect(p.x, p.y, p.s, p.s);
    ctx.fillStyle = '#e8963a';
    for (const p of parts) if (p.o) ctx.fillRect(p.x, p.y, p.s, p.s);
  }

  function loop() {
    raf = 0;
    if (!visible) return;
    step();
    draw();
    raf = requestAnimationFrame(loop);
  }

  let lastSize = '';
  new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    const key = `${Math.round(width)}x${Math.round(height)}`;
    if (key === lastSize) return;
    lastSize = key;
    clearTimeout(sample._t);
    sample._t = setTimeout(sample, parts.length ? 200 : 0);
  }).observe(canvas);

  if (!reduced) {
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) {
        gsap.to({ v: form }, {
          v: 1,
          duration: 2.4,
          ease: 'power2.inOut',
          onUpdate() { form = this.targets()[0].v; },
        });
        if (!raf) raf = requestAnimationFrame(loop);
      }
    }, { threshold: 0.15 });
    io.observe(canvas);
    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.active = true;
    });
    canvas.addEventListener('pointerleave', () => {
      mouse.active = false;
    });
  }
}
