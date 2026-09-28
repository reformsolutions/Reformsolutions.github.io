// Footer: the RS monogram as particles. They start as scattered debris and
// re-form into the logo when the footer scrolls in; the cursor pushes them apart.
// The loop sleeps once everything has settled and wakes on pointer movement.
import { MARK } from '../brand-paths.js';

export function initParticles({ reduced }) {
  const canvas = document.querySelector('.footer__particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const navy = new Path2D(MARK.navy);
  const orange = new Path2D(MARK.orange);
  const ratio = MARK.width / MARK.height;

  let W = 0, H = 0, dpr = 1;
  let parts = [];
  let form = 0; // 0 = debris, 1 = logo
  let visible = false;
  let raf = 0;
  let last = 0;
  let still = 0;
  const mouse = { x: -9999, y: -9999, active: false };

  function sample() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    // the mark fills its column, centred
    const mh = Math.min(H * 0.9, (W * 0.94) / ratio);
    const mw = mh * ratio;
    const ox = (W - mw) / 2;
    const oy = (H - mh) / 2;
    const gap = Math.max(3, Math.round(mh / 68));

    const off = document.createElement('canvas');
    off.width = Math.ceil(W);
    off.height = Math.ceil(H);
    const o = off.getContext('2d', { willReadFrequently: true });
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
        const old = prev[n++];
        next.push({
          tx: x + (Math.random() - 0.5) * 0.8,
          ty: y + (Math.random() - 0.5) * 0.8,
          x: old ? old.x : Math.random() * W,
          y: old ? old.y : H * 0.4 + Math.random() * H * 0.6,
          vx: 0,
          vy: 0,
          o: data[i] > data[i + 2],
          s: gap * 0.42 + Math.random() * gap * 0.25,
          seed: Math.random() * 1000,
        });
      }
    }
    parts = next;
    if (reduced) {
      form = 1;
      for (const p of parts) {
        p.x = p.tx;
        p.y = p.ty;
      }
    }
    draw();
    wake();
  }

  // Frame-rate independent spring + drift; returns the fastest particle speed.
  function step(f) {
    const t = performance.now() * 0.001;
    const k = (0.008 + form * 0.03) * f;
    const damp = Math.pow(0.86, f);
    const R = Math.max(60, H * 0.28);
    let vmax = 0;
    for (const p of parts) {
      p.vx += (p.tx - p.x) * k * form + Math.sin(t * 0.7 + p.seed) * 0.03 * (1 - form) * f;
      p.vy += (p.ty - p.y) * k * form + Math.cos(t * 0.6 + p.seed) * 0.03 * (1 - form) * f;
      if (mouse.active) {
        const mx = p.x - mouse.x;
        const my = p.y - mouse.y;
        const md = Math.hypot(mx, my);
        if (md < R && md > 0.01) {
          const push = (1 - md / R) * 2.6 * f;
          p.vx += (mx / md) * push;
          p.vy += (my / md) * push;
        }
      }
      p.vx *= damp;
      p.vy *= damp;
      p.x += p.vx * f;
      p.y += p.vy * f;
      const v = Math.abs(p.vx) + Math.abs(p.vy);
      if (v > vmax) vmax = v;
    }
    return vmax;
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(253, 248, 236, 0.9)';
    for (const p of parts) if (!p.o) ctx.fillRect(p.x, p.y, p.s, p.s);
    ctx.fillStyle = '#e8963a';
    for (const p of parts) if (p.o) ctx.fillRect(p.x, p.y, p.s, p.s);
  }

  function loop(now) {
    raf = 0;
    if (!visible || reduced) return;
    const f = last ? Math.min(3, (now - last) / 16.67) : 1;
    last = now;
    const vmax = step(f);
    draw();
    // sleep once the logo has formed and nothing is disturbing it
    still = form > 0.999 && !mouse.active && vmax < 0.02 ? still + 1 : 0;
    if (still > 20) return;
    raf = requestAnimationFrame(loop);
  }

  function wake() {
    if (raf || !visible || reduced) return;
    last = 0;
    still = 0;
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

  if (reduced) return;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (!visible) return;
    if (form < 1) {
      gsap.to({ v: form }, {
        v: 1,
        duration: 2.2,
        ease: 'power2.inOut',
        onUpdate() {
          form = this.targets()[0].v;
        },
      });
    }
    wake();
  }, { threshold: 0.15 }).observe(canvas);

  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    mouse.active = true;
    wake();
  });
  canvas.addEventListener('pointerleave', () => {
    mouse.active = false;
    wake();
  });
}
