// Procedural canvas textures for the bench laptop: labels, PCB, grime, tags.
// Everything is drawn in code so the model has no external asset dependencies.
import * as THREE from '../../../vendor/three.min.js';

export const C = {
  paper: '#FDF8EC',
  ink: '#2D445A',
  night: '#1B2B3B',
  orange: '#D2780C',
  orange2: '#E8963A',
};

const MONO = '"Plex Mono", ui-monospace, monospace';
const SANS = '"Archivo", system-ui, sans-serif';
const SERIF = '"Bodoni Moda", Didot, Georgia, serif';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

export function toTexture(canvas, { srgb = true, anisotropy = 8, flipY = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  t.flipY = flipY;
  return t;
}

// Small deterministic PRNG so procedural art is identical on every load.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Code 39 barcode ---------------------------------------------------------
const C39 = {
  0: 'nnnwwnwnn', 1: 'wnnwnnnnw', 2: 'nnwwnnnnw', 3: 'wnwwnnnnn', 4: 'nnnwwnnnw',
  5: 'wnnwwnnnn', 6: 'nnwwwnnnn', 7: 'nnnwnnwnw', 8: 'wnnwnnwnn', 9: 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn',
  F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn',
  P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn',
};
export function drawBarcode(ctx, text, x, y, w, h, color = '#111') {
  const seq = `*${text.toUpperCase()}*`;
  const WIDE = 2.6;
  let units = 0;
  for (const ch of seq) {
    const p = C39[ch] || C39['-'];
    for (const e of p) units += e === 'w' ? WIDE : 1;
    units += 1;
  }
  const u = w / units;
  let cx = x;
  ctx.fillStyle = color;
  for (const ch of seq) {
    const p = C39[ch] || C39['-'];
    for (let i = 0; i < p.length; i++) {
      const ew = (p[i] === 'w' ? WIDE : 1) * u;
      if (i % 2 === 0) ctx.fillRect(cx, y, Math.max(0.8, ew - 0.15), h);
      cx += ew;
    }
    cx += u;
  }
}

// ---- Keyboard legends --------------------------------------------------------
// keys: [{ x, z, w, d, label, sub }], rect: keyboard bounds in model units.
export function keyLegendTexture(keys, rect) {
  const PX = 700; // pixels per model unit
  const cw = Math.round(rect.w * PX);
  const ch = Math.round(rect.d * PX);
  const [c, ctx] = makeCanvas(cw, ch);
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = 'rgba(214, 222, 229, 0.82)';
  ctx.textBaseline = 'middle';
  for (const k of keys) {
    if (!k.label) continue;
    const px = (k.x - rect.x0) * PX;
    const pz = (k.z - rect.z0) * PX;
    const kw = k.w * PX;
    const kd = k.d * PX;
    const small = k.label.length > 1;
    const size = k.fn ? 13 : small ? 15 : 21;
    ctx.font = `500 ${size}px ${SANS}`;
    if (small || k.fn) {
      ctx.textAlign = 'left';
      ctx.fillText(k.label, px - kw / 2 + 10, pz + kd / 2 - (k.fn ? 13 : 16));
    } else {
      ctx.textAlign = 'center';
      ctx.fillText(k.label, px - (k.sub ? kw * 0.12 : 0), pz + (k.sub ? kd * 0.1 : 0));
      if (k.sub) {
        ctx.font = `500 13px ${SANS}`;
        ctx.fillText(k.sub, px + kw * 0.18, pz - kd * 0.22);
      }
    }
  }
  const t = toTexture(c);
  return t;
}

// ---- Printed circuit board ---------------------------------------------------
export function pcbTexture(w = 1024, h = 512, seed = 7) {
  const [c, ctx] = makeCanvas(w, h);
  const r = rng(seed);
  ctx.fillStyle = '#15232f';
  ctx.fillRect(0, 0, w, h);
  // soft mottling
  for (let i = 0; i < 40; i++) {
    const g = ctx.createRadialGradient(r() * w, r() * h, 0, r() * w, r() * h, 60 + r() * 140);
    g.addColorStop(0, 'rgba(40, 70, 92, 0.18)');
    g.addColorStop(1, 'rgba(40, 70, 92, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  // traces: orthogonal + 45° runs
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 260; i++) {
    let x = Math.round(r() * w / 8) * 8;
    let y = Math.round(r() * h / 8) * 8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 2 + Math.floor(r() * 4);
    for (let s = 0; s < segs; s++) {
      const len = 20 + r() * 120;
      const dir = Math.floor(r() * 8);
      const ang = dir * Math.PI / 4;
      x += Math.cos(ang) * len;
      y += Math.sin(ang) * len;
      ctx.lineTo(x, y);
    }
    const bright = r() > 0.8;
    ctx.strokeStyle = bright ? 'rgba(206, 132, 60, 0.55)' : 'rgba(120, 160, 180, 0.16)';
    ctx.lineWidth = bright ? 1.6 : 1 + r() * 1.4;
    ctx.stroke();
  }
  // vias
  for (let i = 0; i < 420; i++) {
    ctx.beginPath();
    ctx.arc(r() * w, r() * h, 1.4 + r() * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = r() > 0.5 ? 'rgba(215, 180, 110, 0.55)' : 'rgba(170, 190, 200, 0.35)';
    ctx.fill();
  }
  // component footprints / pads
  for (let i = 0; i < 70; i++) {
    const pw = 8 + r() * 22;
    const ph = 5 + r() * 12;
    const px = r() * w;
    const py = r() * h;
    ctx.fillStyle = 'rgba(214, 178, 104, 0.6)';
    ctx.fillRect(px, py, pw * 0.3, ph);
    ctx.fillRect(px + pw * 0.7, py, pw * 0.3, ph);
    ctx.strokeStyle = 'rgba(235, 235, 225, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px - 3, py - 3, pw + 6, ph + 6);
  }
  // silkscreen text
  ctx.fillStyle = 'rgba(235, 232, 220, 0.5)';
  ctx.font = `500 13px ${MONO}`;
  const labels = ['RS-MB14 REV C', 'U12', 'C204', 'PU3', 'L7', 'J2 BATT', 'FAN', 'Q41', 'R118', 'JDIMM1', 'JDIMM2', 'M.2 SSD'];
  for (let i = 0; i < labels.length; i++) ctx.fillText(labels[i], 20 + r() * (w - 160), 20 + r() * (h - 40));
  // mounting holes
  for (const [hx, hy] of [[24, 24], [w - 24, 24], [24, h - 24], [w - 24, h - 24]]) {
    ctx.beginPath();
    ctx.arc(hx, hy, 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(214, 178, 104, 0.8)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hx, hy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#0a1016';
    ctx.fill();
  }
  return toTexture(c);
}

// ---- Component labels --------------------------------------------------------
export function batteryLabel() {
  const [c, ctx] = makeCanvas(768, 512);
  ctx.fillStyle = '#1b1f24';
  ctx.fillRect(0, 0, 768, 512);
  ctx.fillStyle = '#e9e6dc';
  ctx.fillRect(70, 90, 628, 330);
  ctx.fillStyle = '#1b1f24';
  ctx.font = `600 34px ${SANS}`;
  ctx.fillText('Li-ion Polymer Battery', 100, 150);
  ctx.font = `500 24px ${MONO}`;
  ctx.fillText('11.55V  ⎓  57Wh  4935mAh', 100, 200);
  ctx.fillText('MODEL RS-B57  3S1P', 100, 238);
  ctx.font = `400 18px ${SANS}`;
  ctx.fillText('Do not puncture, crush or expose to heat above 60°C.', 100, 290);
  drawBarcode(ctx, 'B57-0934-2231', 100, 320, 330, 64, '#1b1f24');
  // warning triangle
  ctx.beginPath();
  ctx.moveTo(610, 316); ctx.lineTo(650, 386); ctx.lineTo(570, 386); ctx.closePath();
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.font = `700 34px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('!', 610, 375);
  return toTexture(c);
}

export function ssdLabel(state = 'data') {
  const [c, ctx] = makeCanvas(1024, 280);
  ctx.fillStyle = '#10161c';
  ctx.fillRect(0, 0, 1024, 280);
  // label
  ctx.fillStyle = state === 'wiped' ? C.paper : '#dcdad2';
  ctx.fillRect(250, 40, 700, 200);
  ctx.fillStyle = '#15191e';
  ctx.font = `600 38px ${SANS}`;
  ctx.fillText('NVMe SSD  512GB', 280, 100);
  ctx.font = `500 22px ${MONO}`;
  ctx.fillText('M.2 2280  PCIe Gen3 x4', 280, 140);
  if (state === 'wiped') {
    ctx.fillStyle = C.orange;
    ctx.font = `600 26px ${MONO}`;
    ctx.fillText('SANITIZED · VERIFIED', 280, 200);
  } else {
    drawBarcode(ctx, 'SN4418-2231', 280, 162, 360, 52, '#15191e');
  }
  // gold contacts on the left edge
  ctx.fillStyle = '#c9a24a';
  for (let i = 0; i < 26; i++) ctx.fillRect(8, 20 + i * 9.5, 30, 5);
  // controller chip hint
  ctx.fillStyle = '#05080b';
  ctx.fillRect(70, 70, 140, 140);
  return toTexture(c);
}

export function ramLabel() {
  const [c, ctx] = makeCanvas(1024, 360);
  ctx.fillStyle = '#132230';
  ctx.fillRect(0, 0, 1024, 360);
  // chips
  ctx.fillStyle = '#0a0d10';
  for (let i = 0; i < 4; i++) ctx.fillRect(60 + i * 235, 60, 170, 150);
  // sticker
  ctx.fillStyle = '#e2e0d8';
  ctx.fillRect(560, 225, 420, 90);
  ctx.fillStyle = '#15191e';
  ctx.font = `500 26px ${MONO}`;
  ctx.fillText('8GB 1Rx8 PC4-3200AA', 580, 270);
  ctx.font = `500 18px ${MONO}`;
  ctx.fillText('SODIMM  1.2V', 580, 298);
  // gold edge
  ctx.fillStyle = '#c9a24a';
  for (let i = 0; i < 60; i++) ctx.fillRect(20 + i * 16.5, 330, 10, 30);
  return toTexture(c);
}

// ---- Grime overlay (dust, smudges, fingerprints, a coffee ring) ---------------
export function grimeTexture(w = 1024, h = 704, seed = 21) {
  const [c, ctx] = makeCanvas(w, h);
  const r = rng(seed);
  ctx.clearRect(0, 0, w, h);
  // broad smudges
  for (let i = 0; i < 16; i++) {
    const x = r() * w, y = r() * h, rad = 40 + r() * 170;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(222, 216, 200, ${0.04 + r() * 0.07})`);
    g.addColorStop(1, 'rgba(222, 216, 200, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rad, rad * (0.4 + r() * 0.6), r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // fingerprints: short broken ridge arcs, never full rings
  for (let i = 0; i < 4; i++) {
    const x = r() * w, y = r() * h, s = 16 + r() * 10, rot = r() * Math.PI;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    for (let k = 2; k < 8; k++) {
      const start = r() * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * k * 0.26, s * k * 0.36, 0, start, start + 1.2 + r() * 2.2);
      ctx.strokeStyle = `rgba(230, 226, 214, ${0.05 + r() * 0.06})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
  }
  // scratches
  for (let i = 0; i < 38; i++) {
    const x = r() * w, y = r() * h, len = 20 + r() * 140, a = r() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + (r() - 0.5) * 10, y + Math.sin(a) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.strokeStyle = `rgba(236, 232, 222, ${0.12 + r() * 0.22})`;
    ctx.lineWidth = 0.6 + r() * 0.9;
    ctx.stroke();
  }
  // coffee ring
  {
    const x = w * 0.2, y = h * 0.72, rad = 62;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0.3, Math.PI * 1.85);
    ctx.strokeStyle = 'rgba(160, 118, 72, 0.32)';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 3, y - 2, rad - 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(160, 118, 72, 0.12)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // dust specks
  for (let i = 0; i < 1100; i++) {
    ctx.fillStyle = `rgba(236, 232, 220, ${0.08 + r() * 0.24})`;
    const s = r() < 0.94 ? 1 + r() * 1.2 : 2 + r() * 2;
    ctx.fillRect(r() * w, r() * h, s, s);
  }
  return toTexture(c);
}

// ---- Stickers ------------------------------------------------------------------
export function oldStickerTexture() {
  const [c, ctx] = makeCanvas(512, 240);
  const r = rng(5);
  ctx.fillStyle = '#e9e8e1';
  ctx.fillRect(0, 0, 512, 240);
  ctx.fillStyle = '#23262a';
  ctx.fillRect(0, 0, 512, 44);
  ctx.fillStyle = '#e9e8e1';
  ctx.font = `600 22px ${SANS}`;
  ctx.fillText('PROPERTY OF — IT DEPARTMENT', 18, 30);
  ctx.fillStyle = '#23262a';
  ctx.font = `500 20px ${MONO}`;
  ctx.fillText('ASSET NO. 004417', 18, 80);
  ctx.font = `400 16px ${SANS}`;
  ctx.fillText('If found, return to IT service desk.', 18, 108);
  drawBarcode(ctx, '004417', 18, 124, 300, 70, '#23262a');
  ctx.font = `500 14px ${MONO}`;
  ctx.fillText('DO NOT REMOVE', 340, 180);
  // wear
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(255,255,255,${r() * 0.35})`;
    ctx.fillRect(r() * 512, r() * 240, 1 + r() * 2, 1 + r() * 2);
  }
  const g = ctx.createLinearGradient(0, 0, 512, 240);
  g.addColorStop(0, 'rgba(120, 100, 70, 0.12)');
  g.addColorStop(1, 'rgba(120, 100, 70, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 240);
  return toTexture(c);
}

// Reform asset tag. `stamp` 0..1 draws the grade stamp in.
export function drawAssetTag(ctx, w, h, { grade = null, stamp = 0 } = {}) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = C.orange;
  ctx.fillRect(0, 0, 22, h);
  ctx.fillStyle = C.ink;
  ctx.font = `600 22px ${SANS}`;
  ctx.fillText('REFORM SOLUTIONS', 46, 44);
  ctx.font = `500 16px ${MONO}`;
  ctx.fillStyle = '#6a7a8a';
  ctx.fillText('ASSET', 46, 84);
  ctx.fillStyle = C.ink;
  ctx.font = `500 40px ${MONO}`;
  ctx.fillText('RS-2231', 46, 126);
  drawBarcode(ctx, 'RS-2231', 46, 146, 290, 72, C.ink);
  // grade box
  const bx = w - 150, by = 30, bw = 118, bh = h - 60;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = '#6a7a8a';
  ctx.font = `500 15px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText('GRADE', bx + bw / 2, by + 28);
  if (!grade || stamp <= 0) {
    ctx.fillStyle = '#9aa5b0';
    ctx.font = `500 44px ${MONO}`;
    ctx.fillText('—', bx + bw / 2, by + 118);
  }
  if (grade && stamp > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, stamp * 1.4);
    const s = 1 + (1 - Math.min(1, stamp)) * 0.6;
    ctx.translate(bx + bw / 2, by + 104);
    ctx.scale(s, s);
    ctx.rotate(-0.12);
    ctx.fillStyle = C.orange;
    ctx.font = `800 84px ${SANS}`;
    ctx.fillText(grade, 0, 30);
    ctx.beginPath();
    ctx.arc(0, 0, 54, 0, Math.PI * 2);
    ctx.strokeStyle = C.orange;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }
  ctx.textAlign = 'left';
}

// ---- Misc ---------------------------------------------------------------------
export function radialTexture(inner = 'rgba(0,0,0,1)', outer = 'rgba(0,0,0,0)', size = 256, stops) {
  const [c, ctx] = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  if (stops) stops.forEach(([o, col]) => g.addColorStop(o, col));
  else {
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return toTexture(c, { srgb: false });
}

// Soft rectangular contact shadow (a rounded box, heavily blurred).
export function shadowTexture(w = 512, h = 384, pad = 90) {
  const [c, ctx] = makeCanvas(w, h);
  ctx.filter = 'blur(26px)';
  ctx.fillStyle = 'rgba(20, 30, 40, 1)';
  const rw = w - pad * 2, rh = h - pad * 2, rr = 30;
  ctx.beginPath();
  ctx.roundRect(pad, pad, rw, rh, rr);
  ctx.fill();
  ctx.filter = 'none';
  return toTexture(c, { srgb: false });
}

export function speakerTexture() {
  const [c, ctx] = makeCanvas(256, 64);
  ctx.fillStyle = '#0d1217';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#25313d';
  for (let y = 6; y < 64; y += 8) for (let x = 6 + ((y / 8) % 2) * 4; x < 256; x += 8) {
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(c);
}
