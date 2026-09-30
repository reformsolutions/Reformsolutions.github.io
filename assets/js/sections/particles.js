// Footer: the RS monogram as particles. They start as scattered debris and gather into the
// logo once, over a couple of seconds, when the footer comes into view (on touch screens once
// half of it is on screen, so the build is seen), then stay formed. The cursor pushes them
// apart; on touch, a tap scatters the ones around it and a sideways drag sweeps through them.
// The loop sleeps once everything has settled and wakes on pointer movement.
import { MARK } from '../brand-paths.js';

const STAGGER = 0.4; // particles set off at different moments across the first 40% of the build
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function initParticles({ reduced }) {
  const canvas = document.querySelector('.footer__particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const navy = new Path2D(MARK.navy);
  const orange = new Path2D(MARK.orange);
  const ratio = MARK.width / MARK.height;
  const touch = window.matchMedia('(pointer: coarse)').matches;

  let W = 0, H = 0, dpr = 1;
  let parts = [];
  let form = 0; // 0 = debris, 1 = logo
  let visible = false;
  let raf = 0;
  let last = 0;
  let still = 0;
  let settled = false; // formed and at rest: nothing to redraw until something disturbs it
  const pointer = { x: -9999, y: -9999, active: false, down: false };

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
        const tx = x + (Math.random() - 0.5) * 0.8;
        const ty = y + (Math.random() - 0.5) * 0.8;
        // debris lies scattered over the lower part of the space
        const hx = Math.random() * W;
        const hy = H * 0.4 + Math.random() * H * 0.6;
        next.push({
          tx,
          ty,
          hx,
          hy,
          inv: 1 / (Math.hypot(tx - hx, ty - hy) || 1),
          x: old ? old.x : hx,
          y: old ? old.y : hy,
          vx: 0,
          vy: 0,
          d: Math.random() * STAGGER,
          bow: (Math.random() - 0.5) * 40, // how far its path curves off the straight line
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

  // Each particle springs toward a goal that travels from its debris spot to its place in the
  // logo as `form` goes 0 → 1. Frame-rate independent; returns the fastest particle speed.
  function step(f) {
    const t = performance.now() * 0.001;
    const k = 0.038 * f;
    const damp = Math.pow(0.86, f);
    const R = Math.max(60, H * 0.28);
    let vmax = 0;
    for (const p of parts) {
      const e = ease(Math.min(1, Math.max(0, (form - p.d) / (1 - STAGGER))));
      const dx = p.tx - p.hx;
      const dy = p.ty - p.hy;
      const bow = Math.sin(Math.PI * e) * p.bow;
      let gx = p.hx + dx * e - dy * p.inv * bow;
      let gy = p.hy + dy * e + dx * p.inv * bow;
      if (e < 1) {
        // loose debris drifts
        gx += Math.sin(t * 0.7 + p.seed) * 5 * (1 - e);
        gy += Math.cos(t * 0.6 + p.seed) * 5 * (1 - e);
      }
      p.vx += (gx - p.x) * k;
      p.vy += (gy - p.y) * k;
      if (pointer.active) {
        const mx = p.x - pointer.x;
        const my = p.y - pointer.y;
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

  // A tap: throw the particles around the finger outwards; the springs bring them back.
  function burst(x, y) {
    const R = Math.max(70, H * 0.42);
    for (const p of parts) {
      const mx = p.x - x;
      const my = p.y - y;
      const md = Math.hypot(mx, my);
      if (md >= R || md < 0.01) continue;
      const kick = (1 - md / R) ** 2 * 13;
      p.vx += (mx / md) * kick;
      p.vy += (my / md) * kick;
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

  function loop(now) {
    raf = 0;
    if (!visible || reduced) return;
    const f = last ? Math.min(3, (now - last) / 16.67) : 1;
    last = now;
    const vmax = step(f);
    draw();
    // sleep once the logo has formed and nothing is disturbing it
    still = form > 0.999 && !pointer.active && vmax < 0.02 ? still + 1 : 0;
    if (still > 20) {
      settled = true;
      return;
    }
    raf = requestAnimationFrame(loop);
  }

  function wake() {
    settled = false;
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
  let started = false;
  const startAt = touch ? 0.5 : 0.15;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (!visible) return;
    // the logo builds itself once, as soon as enough of it is in view
    if (!started && e.intersectionRatio >= startAt) {
      started = true;
      gsap.to({ v: form }, {
        v: 1,
        duration: 2.2,
        ease: 'power2.inOut',
        onUpdate() {
          form = this.targets()[0].v;
        },
      });
    }
    // coming back into view once it has settled needs no redraw: the canvas still shows it
    if (!settled) wake();
  }, { threshold: [0, startAt] }).observe(canvas);

  const locate = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    locate(e);
    pointer.down = true;
    pointer.active = true;
    burst(pointer.x, pointer.y);
    wake();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' && !pointer.down) return;
    locate(e);
    pointer.active = true;
    wake();
  });
  // a finger lifts, the page takes over the gesture to scroll, or the cursor leaves
  const release = () => {
    pointer.down = false;
    pointer.active = false;
    wake();
  };
  canvas.addEventListener('pointerup', (e) => e.pointerType !== 'mouse' && release());
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', release);
}
