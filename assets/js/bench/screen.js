// The laptop's display: a 2D canvas UI that follows the refurbishment story.
// Modes: off → post (inspection) → diag (testing) → wipe (sanitization) → ready.
import { makeCanvas, toTexture, C } from './textures.js';
import { MARK } from '../brand-paths.js';

const W = 1280;
const H = 800;
const MONO = '"Plex Mono", ui-monospace, monospace';
const SANS = '"Archivo", system-ui, sans-serif';
const SERIF = '"Bodoni Moda", Didot, Georgia, serif';

const BG = '#0e151c';
const FG = '#e9e2d0';
const DIM = '#7b8896';
const PASS = '#9cc7a4';
const ACC = C.orange2;

const today = new Date();
const DATE = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

const INSPECT = [
  ['Chassis', 'light wear · no cracks'],
  ['Hinges', 'firm'],
  ['Display', 'glass intact'],
  ['Keyboard', 'complete'],
  ['Ports', '6 of 6 present'],
  ['Battery', 'present · not swollen'],
];

const TESTS = [
  ['Battery', '91% health · 312 cycles'],
  ['Storage', 'SMART ok · 97% life'],
  ['Memory', '16 GB · 0 errors'],
  ['CPU & thermals', '68 °C peak'],
  ['Display', '0 dead pixels'],
  ['Keyboard', '84 / 84 keys'],
  ['Trackpad', 'click + gestures ok'],
  ['Wireless', 'Wi-Fi + BT ok'],
  ['Ports', '6 / 6 working'],
];

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const seg = (p, a, b) => clamp01((p - a) / (b - a));

export class ScreenUI {
  // `scale` shrinks the backing canvas (phones) while drawing code keeps 1280×800 units.
  constructor({ scale = 1 } = {}) {
    this.scale = scale;
    this.steps = scale < 1 ? 200 : 400;
    [this.canvas, this.ctx] = makeCanvas(Math.round(W * scale), Math.round(H * scale));
    this.texture = toTexture(this.canvas, { anisotropy: 4 });
    this.key = '';
    this.markNavy = new Path2D(MARK.navy);
    this.markOrange = new Path2D(MARK.orange);
    this.hex = Array.from({ length: 64 }, (_, i) => this.hexRow(i));
    this.draw({ mode: 'off', p: 0, fade: 0 });
  }

  hexRow(seed) {
    let s = (seed + 1) * 2654435761;
    let out = '';
    for (let i = 0; i < 16; i++) {
      s = (s ^ (s << 13)) >>> 0;
      s = (s ^ (s >>> 17)) >>> 0;
      s = (s ^ (s << 5)) >>> 0;
      out += (s & 0xff).toString(16).padStart(2, '0') + (i % 2 ? ' ' : '');
    }
    return out.toUpperCase();
  }

  // Redraws only when the visible state actually changes (quantised).
  update(state) {
    const k = `${state.mode}|${Math.round(state.p * this.steps)}|${Math.round((state.fade || 0) * 60)}`;
    if (k === this.key) return false;
    this.key = k;
    this.draw(state);
    this.texture.needsUpdate = true;
    return true;
  }

  draw({ mode, p = 0, fade = 0 }) {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    if (mode === 'off') this.drawOff(ctx);
    else if (mode === 'post') this.drawPost(ctx, p);
    else if (mode === 'diag') this.drawDiag(ctx, p);
    else if (mode === 'wipe') this.drawWipe(ctx, p);
    else if (mode === 'ready') this.drawReady(ctx, p, fade);
    ctx.restore();
  }

  frame(ctx, title, right) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = FG;
    ctx.font = `500 22px ${MONO}`;
    ctx.fillText(title, 64, 76);
    ctx.fillStyle = DIM;
    ctx.textAlign = 'right';
    ctx.fillText(right, W - 64, 76);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(233, 226, 208, 0.16)';
    ctx.fillRect(64, 98, W - 128, 2);
  }

  drawOff(ctx) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#0b1016');
    g.addColorStop(1, '#05080b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  drawPost(ctx, p) {
    const boot = seg(p, 0, 0.12);
    this.frame(ctx, 'REFORM BENCH — INTAKE INSPECTION', 'SERIAL NO. 2231');
    ctx.globalAlpha = boot;
    ctx.font = `500 24px ${MONO}`;
    const rows = [
      ['Serial No.', '2231'],
      ['Received', DATE],
      ['Source', 'Corporate refresh'],
    ];
    let y = 160;
    for (const [a, b] of rows) {
      ctx.fillStyle = DIM;
      ctx.fillText(a.toUpperCase(), 64, y);
      ctx.fillStyle = FG;
      ctx.fillText(b, 360, y);
      y += 44;
    }
    y += 30;
    const n = INSPECT.length;
    INSPECT.forEach(([a, b], i) => {
      const t = seg(p, 0.15 + (i / n) * 0.72, 0.15 + ((i + 0.8) / n) * 0.72);
      if (t <= 0) return;
      ctx.globalAlpha = Math.min(1, t * 2);
      ctx.fillStyle = FG;
      ctx.fillText(a.toUpperCase(), 64, y);
      const dots = '.'.repeat(Math.round(22 * Math.min(1, t * 1.6)));
      ctx.fillStyle = 'rgba(123, 136, 150, 0.8)';
      ctx.fillText(dots, 300, y);
      if (t > 0.7) {
        ctx.fillStyle = PASS;
        ctx.fillText(b, 660, y);
      }
      y += 48;
    });
    ctx.globalAlpha = 1;
    this.progress(ctx, 'Inspection', seg(p, 0.12, 0.95));
  }

  progress(ctx, label, t) {
    const y = H - 90;
    ctx.fillStyle = DIM;
    ctx.font = `500 20px ${MONO}`;
    ctx.fillText(label.toUpperCase(), 64, y - 22);
    ctx.textAlign = 'right';
    ctx.fillStyle = t >= 1 ? PASS : FG;
    ctx.fillText(t >= 1 ? 'COMPLETE' : `${Math.round(t * 100)}%`, W - 64, y - 22);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(233, 226, 208, 0.12)';
    ctx.fillRect(64, y, W - 128, 8);
    ctx.fillStyle = t >= 1 ? PASS : ACC;
    ctx.fillRect(64, y, (W - 128) * t, 8);
  }

  drawDiag(ctx, p) {
    this.frame(ctx, 'HARDWARE DIAGNOSTICS', 'SERIAL NO. 2231');
    const n = TESTS.length;
    let passed = 0;
    ctx.font = `500 23px ${MONO}`;
    TESTS.forEach(([a, b], i) => {
      const y = 158 + i * 52;
      const t = seg(p, 0.05 + (i / n) * 0.85, 0.05 + ((i + 1) / n) * 0.85);
      ctx.fillStyle = t > 0 ? FG : DIM;
      ctx.fillText(a.toUpperCase(), 64, y);
      // bar
      ctx.fillStyle = 'rgba(233, 226, 208, 0.1)';
      ctx.fillRect(390, y - 14, 300, 8);
      ctx.fillStyle = t >= 1 ? PASS : ACC;
      ctx.fillRect(390, y - 14, 300 * t, 8);
      if (t >= 1) {
        passed++;
        ctx.fillStyle = FG;
        ctx.fillText(b, 720, y);
        ctx.fillStyle = PASS;
        ctx.textAlign = 'right';
        ctx.fillText('PASS', W - 64, y);
        ctx.textAlign = 'left';
      } else if (t > 0) {
        ctx.fillStyle = ACC;
        ctx.fillText('testing' + '.'.repeat(1 + (Math.floor(t * 12) % 3)), 720, y);
      }
    });
    ctx.fillStyle = 'rgba(233, 226, 208, 0.16)';
    ctx.fillRect(64, H - 104, W - 128, 2);
    ctx.font = `500 22px ${MONO}`;
    ctx.fillStyle = passed === n ? PASS : DIM;
    ctx.fillText(`${passed} OF ${n} PASSED`, 64, H - 60);
    ctx.textAlign = 'right';
    ctx.fillStyle = DIM;
    ctx.fillText('LOGGED TO SERIAL NO. 2231', W - 64, H - 60);
    ctx.textAlign = 'left';
  }

  drawWipe(ctx, p) {
    this.frame(ctx, 'DATA SANITIZATION', 'NVMe · 512 GB');
    const write = seg(p, 0.04, 0.72);
    const verify = seg(p, 0.72, 0.94);
    const done = p >= 0.95;
    // hex stream (left)
    ctx.font = `400 19px ${MONO}`;
    const offset = Math.floor(write * 220);
    for (let i = 0; i < 11; i++) {
      const row = this.hex[(i + offset) % this.hex.length];
      const zeroed = done || i < Math.floor(write * 11) ? '00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00'.slice(0, row.length) : row;
      ctx.fillStyle = zeroed === row ? 'rgba(233, 226, 208, 0.38)' : 'rgba(156, 199, 164, 0.5)';
      ctx.fillText(`${(0x1f40 + (i + offset) * 16).toString(16).toUpperCase().padStart(8, '0')}  ${zeroed}`, 64, 160 + i * 34);
    }
    // big percentage
    const pct = done ? 100 : Math.round((write * 0.8 + verify * 0.2) * 100);
    ctx.textAlign = 'right';
    ctx.fillStyle = done ? PASS : FG;
    ctx.font = `500 128px ${MONO}`;
    ctx.fillText(`${pct}%`, W - 64, 300);
    ctx.font = `500 22px ${MONO}`;
    ctx.fillStyle = DIM;
    const phase = done ? 'VERIFIED' : write < 1 ? 'OVERWRITING' : 'VERIFYING';
    ctx.fillText(phase, W - 64, 346);
    ctx.textAlign = 'left';
    // status line
    const y = H - 150;
    ctx.fillStyle = 'rgba(233, 226, 208, 0.12)';
    ctx.fillRect(64, y, W - 128, 10);
    ctx.fillStyle = ACC;
    ctx.fillRect(64, y, (W - 128) * write, 10);
    ctx.fillStyle = PASS;
    ctx.fillRect(64, y, (W - 128) * verify, 10);
    ctx.font = `500 22px ${MONO}`;
    ctx.fillStyle = FG;
    if (done) {
      ctx.fillStyle = PASS;
      ctx.fillText('✓  0 RECOVERABLE SECTORS — WIPE LOGGED TO SERIAL NO. 2231', 64, H - 80);
    } else {
      ctx.fillStyle = DIM;
      ctx.fillText(`SECTORS ${Math.round(write * 1000215216).toLocaleString('en-US')} / 1,000,215,216`, 64, H - 80);
    }
  }

  drawReady(ctx, p, fade) {
    const boot = seg(p, 0, 0.35);
    ctx.fillStyle = C.night;
    ctx.fillRect(0, 0, W, H);
    if (boot < 1) {
      ctx.fillStyle = `rgba(5, 8, 11, ${1 - boot})`;
      ctx.fillRect(0, 0, W, H);
    }
    const a = boot * (1 - fade);
    if (a <= 0.001) return;
    ctx.globalAlpha = a;
    // monogram
    const mw = 250;
    const s = mw / MARK.width;
    ctx.save();
    ctx.translate(W / 2 - mw / 2, 190);
    ctx.scale(s, s);
    ctx.fillStyle = C.paper;
    ctx.fill(this.markNavy, 'evenodd');
    ctx.fillStyle = C.orange;
    ctx.fill(this.markOrange, 'evenodd');
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.fillStyle = C.paper;
    ctx.font = `italic 500 76px ${SERIF}`;
    ctx.fillText('Ready for work.', W / 2, 500);
    ctx.font = `500 20px ${MONO}`;
    ctx.fillStyle = 'rgba(253, 248, 236, 0.6)';
    const qc = seg(p, 0.35, 0.8);
    const line = 'QC PASSED · GRADE A · SERIAL NO. 2231';
    ctx.fillText(line.slice(0, Math.round(line.length * qc)), W / 2, 570);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
}
