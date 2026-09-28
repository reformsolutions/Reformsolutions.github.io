// Tiny isometric line-art generator for the equipment illustrations.
// Draws boxes (top, right and front faces) with painter's order as written.
const K = Math.cos(Math.PI / 6);
const project = (x, y, z) => [(x - z) * K, (x + z) * 0.5 - y];

export class Iso {
  constructor() {
    this.items = [];
    this.minX = Infinity;
    this.minY = Infinity;
    this.maxX = -Infinity;
    this.maxY = -Infinity;
  }

  pt(x, y, z) {
    const [a, b] = project(x, y, z);
    if (a < this.minX) this.minX = a;
    if (a > this.maxX) this.maxX = a;
    if (b < this.minY) this.minY = b;
    if (b > this.maxY) this.maxY = b;
    return `${a.toFixed(3)},${b.toFixed(3)}`;
  }

  poly(pts, cls = 'f') {
    this.items.push({ tag: 'polygon', cls, d: pts.map((p) => this.pt(...p)).join(' ') });
    return this;
  }

  line(pts, cls = '') {
    this.items.push({ tag: 'polyline', cls, d: pts.map((p) => this.pt(...p)).join(' ') });
    return this;
  }

  // Box at (x, y, z) with size (w, h, d). Returns face mappers for details.
  box(x, y, z, w, h, d, { top = 'f2', side = 'f' } = {}) {
    this.poly([[x, y + h, z], [x + w, y + h, z], [x + w, y + h, z + d], [x, y + h, z + d]], top);
    this.poly([[x + w, y, z + d], [x + w, y, z], [x + w, y + h, z], [x + w, y + h, z + d]], side);
    this.poly([[x, y, z + d], [x + w, y, z + d], [x + w, y + h, z + d], [x, y + h, z + d]], side);
    return {
      top: (u, v) => [x + u, y + h, z + v],
      front: (u, v) => [x + u, y + v, z + d],
      right: (u, v) => [x + w, y + v, z + d - u],
    };
  }

  // Rectangle on a face mapper
  rect(face, u, v, du, dv, cls = 'thin') {
    return this.poly([face(u, v), face(u + du, v), face(u + du, v + dv), face(u, v + dv)], cls);
  }

  // Circle (ellipse in projection) on a face mapper
  circle(face, u, v, r, cls = 'thin', n = 22) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push(face(u + Math.cos(a) * r, v + Math.sin(a) * r));
    }
    return this.poly(pts, cls);
  }

  svg(label) {
    const pad = 1.2;
    const x = this.minX - pad;
    const y = this.minY - pad;
    const w = this.maxX - this.minX + pad * 2;
    const h = this.maxY - this.minY + pad * 2;
    const sw = (w / 300).toFixed(4);
    const widths = { thin: (w / 520).toFixed(4), cable: (w / 95).toFixed(4) };
    const body = this.items
      .map((it) => {
        const k = Object.keys(widths).find((c) => it.cls.split(' ').includes(c));
        return `<${it.tag} class="${it.cls}" points="${it.d}" pathLength="1"${k ? ` stroke-width="${widths[k]}"` : ''}/>`;
      })
      .join('');
    return `<svg class="iso" viewBox="${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${label}"><g stroke-width="${sw}">${body}</g></svg>`;
  }
}

// ---------------------------------------------------------------------------
// Illustrations
// ---------------------------------------------------------------------------
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function laptop() {
  const s = new Iso();
  const W = 14, D = 10, H = 0.9;
  const tz = -2.5, ty = 10.3, t = 0.45;
  // lid: edge, top, then screen face
  s.poly([[W, H, 0], [W, ty, tz], [W, ty, tz - t], [W, H, -t]], 'f');
  s.poly([[0, ty, tz], [W, ty, tz], [W, ty, tz - t], [0, ty, tz - t]], 'f2');
  s.poly([[0, H, 0], [W, H, 0], [W, ty, tz], [0, ty, tz]], 'f');
  const L = (u, v) => [u, H + (ty - H) * v, tz * v];
  s.poly([L(0.6, 0.07), L(W - 0.6, 0.07), L(W - 0.6, 0.95), L(0.6, 0.95)], 'thin');
  s.line([L(1.5, 0.82), L(5.4, 0.82)], 'acc');
  s.line([L(1.5, 0.72), L(8.6, 0.72)], 'thin');
  s.line([L(1.5, 0.64), L(7.2, 0.64)], 'thin');
  s.poly([L(1.5, 0.2), L(4.6, 0.2), L(4.6, 0.5), L(1.5, 0.5)], 'thin');
  s.poly([L(5.2, 0.2), L(8.3, 0.2), L(8.3, 0.5), L(5.2, 0.5)], 'thin');
  s.poly([L(8.9, 0.2), L(12.4, 0.2), L(12.4, 0.5), L(8.9, 0.5)], 'thin');
  // base
  const b = s.box(0, 0, 0, W, H, D);
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 13; c++) s.rect(b.top, 1.1 + c * 0.93, 0.7 + r * 0.92, 0.76, 0.74);
  }
  s.rect(b.top, 5, 6.1, 4, 3, '');
  s.rect(b.front, 6, 0.3, 2, 0.3);
  s.rect(b.right, 2, 0.28, 0.9, 0.34, 'acc');
  s.rect(b.right, 3.4, 0.3, 0.6, 0.3);
  s.rect(b.right, 4.4, 0.3, 0.6, 0.3);
  return s.svg('Laptop line drawing');
}

function desktop() {
  const s = new Iso();
  const t = s.box(0, 0, 0, 4.4, 9.8, 8.6);
  s.rect(t.front, 0.5, 8.1, 3.4, 0.9);
  s.line([t.front(0.9, 8.55), t.front(3.2, 8.55)]);
  s.circle(t.front, 2.2, 7.1, 0.38, '');
  s.circle(t.front, 2.2, 7.1, 0.12, 'accf');
  s.rect(t.front, 1.3, 6.1, 0.55, 0.26);
  s.rect(t.front, 2.55, 6.1, 0.55, 0.26);
  for (let i = 0; i < 9; i++) s.line([t.front(0.7, 0.8 + i * 0.5), t.front(3.7, 0.8 + i * 0.5)], 'thin');
  for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) s.circle(t.right, 1.6 + i * 1.1, 4 + j * 1.05, 0.18, 'thin', 10);
  const f = s.box(5.8, 0, 1.2, 8.6, 2.5, 7.4);
  s.line([f.front(0.6, 1.85), f.front(4.2, 1.85)], 'thin');
  s.circle(f.front, 7.6, 1.25, 0.3, '');
  s.circle(f.front, 7.6, 1.25, 0.1, 'accf');
  s.rect(f.front, 5.6, 1.0, 0.5, 0.25);
  s.rect(f.front, 6.3, 1.0, 0.5, 0.25);
  for (let i = 0; i < 12; i++) s.line([f.front(0.6 + i * 0.35, 0.35), f.front(0.6 + i * 0.35, 1.2)], 'thin');
  return s.svg('Desktop tower and small form factor PC line drawing');
}

function server() {
  const s = new Iso();
  const W = 18, D = 11;
  const a = s.box(0, 0, 0, W, 2.8, D);
  // rack ears
  s.poly([[-0.7, 0, D], [0, 0, D], [0, 2.8, D], [-0.7, 2.8, D]], 'f');
  s.poly([[W, 0, D], [W + 0.7, 0, D], [W + 0.7, 2.8, D], [W, 2.8, D]], 'f');
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 8; c++) {
      const u = 0.5 + c * 1.55, v = 0.3 + r * 1.2;
      s.rect(a.front, u, v, 1.35, 1.0);
      s.line([a.front(u + 0.2, v + 0.3), a.front(u + 1.1, v + 0.3)], 'thin');
      s.circle(a.front, u + 1.15, v + 0.75, 0.08, c % 3 === 0 && r === 0 ? 'accf' : 'thin', 8);
    }
  }
  for (let i = 0; i < 5; i++) s.line([a.front(13.4, 0.5 + i * 0.45), a.front(17.4, 0.5 + i * 0.45)], 'thin');
  const b = s.box(0, 2.8, 0, W, 1.4, D);
  s.poly([[-0.7, 2.8, D], [0, 2.8, D], [0, 4.2, D], [-0.7, 4.2, D]], 'f');
  s.poly([[W, 2.8, D], [W + 0.7, 2.8, D], [W + 0.7, 4.2, D], [W, 4.2, D]], 'f');
  for (let c = 0; c < 4; c++) s.rect(b.front, 0.5 + c * 2.1, 0.25, 1.9, 0.9);
  s.circle(b.front, 16.8, 0.7, 0.12, 'accf', 8);
  for (let i = 0; i < 3; i++) s.line([b.front(9.5, 0.4 + i * 0.3), b.front(15.8, 0.4 + i * 0.3)], 'thin');
  for (let i = 0; i < 7; i++) s.line([b.top(2 + i * 2.2, 1), b.top(2 + i * 2.2, 9)], 'thin');
  return s.svg('Rack servers line drawing');
}

function monitor() {
  const s = new Iso();
  s.box(3.6, 0, 2.6, 7, 0.35, 4.6);
  s.box(6.3, 0.35, 3.4, 1.6, 5.6, 0.9);
  const p = s.box(0, 3.9, 4.4, 14.4, 8.8, 0.55);
  s.rect(p.front, 0.45, 0.9, 13.5, 7.5, 'thin');
  s.line([p.front(1.4, 7.4), p.front(5.4, 7.4)], 'acc');
  s.line([p.front(1.4, 6.7), p.front(9.8, 6.7)], 'thin');
  s.line([p.front(1.4, 6.1), p.front(8.2, 6.1)], 'thin');
  s.rect(p.front, 1.4, 1.7, 5.6, 3.4, 'thin');
  s.rect(p.front, 7.6, 1.7, 5.4, 3.4, 'thin');
  s.circle(p.front, 13.6, 0.42, 0.1, 'accf', 8);
  return s.svg('Monitor line drawing');
}

function network() {
  const s = new Iso();
  const W = 18, D = 8.6;
  const sw = s.box(0, 0, 0, W, 1.6, D);
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 12; c++) {
      const u = 0.6 + c * 1.12 + Math.floor(c / 6) * 0.35, v = 0.2 + r * 0.66;
      s.rect(sw.front, u, v, 0.92, 0.5);
    }
  }
  for (let c = 0; c < 4; c++) s.rect(sw.front, 14.7 + c * 0.78, 0.45, 0.62, 0.5);
  for (let c = 0; c < 12; c++) s.circle(sw.top, 1 + c * 1.12 + Math.floor(c / 6) * 0.35, 8.1, 0.1, c === 2 || c === 7 ? 'accf' : 'thin', 6);
  for (let i = 0; i < 6; i++) s.line([sw.top(3 + i * 2.2, 1.2), sw.top(3 + i * 2.2, 6.4)], 'thin');
  // access point on top
  const ap = s.box(11.4, 1.6, 1.4, 4.6, 0.5, 4.6);
  s.circle(ap.top, 2.3, 2.3, 1.3, 'thin', 28);
  s.circle(ap.top, 2.3, 2.3, 0.18, 'accf', 10);
  // patch cable leaving port 3 with an orange plug at the end
  const p0 = sw.front(3.3, 0.45);
  const c1 = [p0[0], p0[1], p0[2] + 2.2];
  const c2 = [p0[0] + 2.5, p0[1] - 1.2, p0[2] + 4.6];
  const c3 = [p0[0] + 6.5, p0[1] - 1.6, p0[2] + 5.2];
  const curve = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const a = lerp3(p0, c1, t), b = lerp3(c1, c2, t), c = lerp3(c2, c3, t);
    curve.push(lerp3(lerp3(a, b, t), lerp3(b, c, t), t));
  }
  s.line(curve, 'cable');
  const e = c3;
  s.box(e[0], e[1] - 0.25, e[2] - 0.35, 1.3, 0.5, 0.7, { top: 'accf', side: 'accf' });
  return s.svg('Network switch and access point line drawing');
}

function accessories() {
  const s = new Iso();
  const dock = s.box(1.6, 0, -2.8, 7.4, 1.3, 2.9);
  for (let c = 0; c < 5; c++) s.rect(dock.front, 0.6 + c * 1.2, 0.4, 0.8, 0.4);
  s.circle(dock.front, 6.9, 0.65, 0.16, 'accf', 8);
  const brick = s.box(11.2, 0, -2.2, 3.2, 1.0, 2.1);
  s.line([brick.front(0.6, 0.5), brick.front(2.6, 0.5)], 'thin');
  const a = brick.front(1.6, 0.4);
  s.line([a, [a[0], 0.05, a[2] + 1.0], [a[0] - 1.8, 0.05, a[2] + 1.6], [9.0, 0.05, 0.7], [9.0, 0.6, 0.1]], 'thin');
  const kb = s.box(0, 0, 3.6, 13.2, 0.55, 4.6);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 13; c++) s.rect(kb.top, 0.5 + c * 0.95, 0.4 + r * 0.95, 0.78, 0.76);
  }
  s.rect(kb.top, 3.4, 3.4, 5.6, 0, 'thin');
  const m = s.box(14.6, 0, 5.2, 2.1, 0.8, 3.2);
  s.line([m.top(1.05, 0.2), m.top(1.05, 1.3)], 'thin');
  s.line([m.top(0.2, 1.3), m.top(1.9, 1.3)], 'thin');
  return s.svg('Keyboard, mouse, dock and charger line drawing');
}

export const ART = { laptop, desktop, server, monitor, network, accessories };
