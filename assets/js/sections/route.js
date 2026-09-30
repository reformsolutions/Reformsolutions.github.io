// "For businesses" route: the logo's cable winds through the ITAD steps and
// forks into Reuse / Recycle. An orange RJ45 plug leads each cable end.
// Wide screens: the section pins and the cable winds across it, with the steps placed by its nodes.
// Phones: the steps stack down the page and the cable runs beside them, drawn at a steady pace
// with the scroll. It finishes as the route's bottom comes into view, so on most phones the whole
// cable is on screen when it's done.
const smooth = (a, b, v) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Catmull-Rom through points → cubic Bézier path. `prev` continues a tangent.
function pathThrough(pts, prev) {
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || prev || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

// The plug sits this far past the cable's end, so a boot as wide as the cable covers the end.
const PLUG_AHEAD = 43;
const PLUG_REACH = PLUG_AHEAD + 35; // cable end → tip of the plug

// Points along a path, sampled once per layout, for looking up a plug position by depth (y)
// without reading SVG geometry while scrolling. Phone paths only ever run downwards.
function sampleByY(path, L) {
  const n = Math.max(24, Math.ceil(L / 5));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const s = (L * i) / n;
    const p = path.getPointAtLength(s);
    pts.push([s, p.x, p.y]);
  }
  return pts;
}
function atDepth(pts, y) {
  let lo = 0;
  let hi = pts.length - 1;
  if (y <= pts[0][2]) hi = 1;
  else if (y >= pts[hi][2]) lo = hi - 1;
  else {
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (pts[m][2] < y) lo = m;
      else hi = m;
    }
  }
  const a = pts[lo];
  const b = pts[hi];
  const f = Math.max(0, Math.min(1, (y - a[2]) / (b[2] - a[2] || 1)));
  return { s: a[0] + (b[0] - a[0]) * f, x: a[1] + (b[1] - a[1]) * f, y: a[2] + (b[2] - a[2]) * f, ang: Math.atan2(b[2] - a[2], b[1] - a[1]) };
}

export function initRoute({ reduced, isMobile }) {
  const section = document.querySelector('.business');
  if (!section) return;
  const pinEl = section.querySelector('.business__pin');
  const route = section.querySelector('[data-route]');
  const svg = route.querySelector('.route__svg');
  const q = (s) => route.querySelector(s);
  const cable = { trunk: q('.route__cable--trunk'), a: q('.route__cable--a'), b: q('.route__cable--b') };
  const ghost = { trunk: q('.route__ghost--trunk'), a: q('.route__ghost--a'), b: q('.route__ghost--b') };
  const plug = { trunk: q('.route__plug--trunk'), a: q('.route__plug--a'), b: q('.route__plug--b') };
  const nodesG = q('.route__nodes');
  const steps = [...route.querySelectorAll('.route__step')];
  const portrait = isMobile(); // the page reloads if this flips

  // a boot on each plug, as wide as the cable, tapering into the plug's ribs
  const boots = Object.values(plug).map((g) => {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('class', 'route__boot');
    p.setAttribute('fill', 'currentColor');
    g.appendChild(p);
    return p;
  });

  let len = { trunk: 1, a: 1, b: 1 };
  let nodeAt = []; // wide: [{ k, t }] progress along its path at which each node is reached
  let nodeEls = [];
  let progress = 0;
  // phones: depth (y) of each node, the fork and the cable ends, plus sampled paths
  let nodeY = [];
  let forkY = 0;
  let endY = 1;
  let lut = null;

  function layout() {
    const cs = getComputedStyle(route);
    const pl = parseFloat(cs.paddingLeft) || 0;
    const pr = parseFloat(cs.paddingRight) || 0;
    const box = svg.getBoundingClientRect();
    const w = box.width;
    const h = box.height;
    svg.setAttribute('viewBox', `0 0 ${w.toFixed(1)} ${h.toFixed(1)}`);
    let trunk, a, b, nodes, place;

    if (!portrait) {
      const iw = route.clientWidth - pl - pr;
      const X = (u) => pl + u * iw;
      const Y = (v) => v * h;
      const P = (u, v) => [X(u), Y(v)];
      const fork = P(0.67, 0.5);
      trunk = [P(0, 0.52), P(0.13, 0.4), P(0.35, 0.62), P(0.555, 0.4), fork];
      a = [fork, P(0.73, 0.33), P(0.78, 0.28)];
      b = [fork, P(0.73, 0.67), P(0.78, 0.72)];
      nodes = [trunk[1], trunk[2], trunk[3], a[2], b[2]];
      place = ['above', 'below', 'above', 'beyond', 'beyond'];
    } else {
      // the steps stack in the page (CSS); each node sits level with its step's number
      const top = box.top;
      const mid = steps.map((el) => {
        el.style.left = el.style.top = el.style.right = el.style.transform = '';
        const r = el.querySelector('.mono').getBoundingClientRect();
        return r.top + r.height / 2 - top;
      });
      const last = steps[steps.length - 1].getBoundingClientRect().bottom - top;
      const x0 = pl + 18;
      const x1 = pl + 50;
      forkY = Math.max(mid[2] + 36, mid[3] - 64);
      // both plugs end level with the last line of text
      endY = Math.max(mid[4] + 44, last - PLUG_REACH);
      const fork = [x0, forkY];
      trunk = [[x0, 0], [x0, mid[0]], [x0, mid[1]], [x0, mid[2]], fork];
      a = [fork, [x0, mid[3]], [x0, endY]];
      b = [fork, [x1, forkY + 52], [x1, mid[4]], [x1, endY]];
      nodes = [trunk[1], trunk[2], trunk[3], a[1], b[2]];
      nodeY = nodes.map((n) => n[1]);
    }

    const prev = trunk[trunk.length - 2];
    for (const [k, pts, pv] of [['trunk', trunk], ['a', a, prev], ['b', b, prev]]) {
      const d = pathThrough(pts, pv);
      cable[k].setAttribute('d', d);
      ghost[k].setAttribute('d', d);
      len[k] = cable[k].getTotalLength();
      cable[k].style.strokeDasharray = `${len[k]} ${len[k] + 40}`;
    }
    if (portrait) lut = { trunk: sampleByY(cable.trunk, len.trunk), a: sampleByY(cable.a, len.a), b: sampleByY(cable.b, len.b) };

    const c = (parseFloat(getComputedStyle(cable.trunk).strokeWidth) || 16) + 3;
    const bootD = `M${-PLUG_AHEAD - 1},${-c / 2}L-28,-5V5L${-PLUG_AHEAD - 1},${c / 2}Z`;
    boots.forEach((p) => p.setAttribute('d', bootD));

    nodesG.innerHTML = '';
    nodeEls = nodes.map(([x, y]) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      el.setAttribute('class', 'route__node');
      el.setAttribute('cx', x.toFixed(1));
      el.setAttribute('cy', y.toFixed(1));
      el.setAttribute('r', portrait ? 6 : 7);
      nodesG.appendChild(el);
      return el;
    });

    if (!portrait) {
      // how far along its path each node sits
      const along = (path, L, [x, y]) => {
        let best = 0, bd = Infinity;
        for (let i = 0; i <= 120; i++) {
          const p = path.getPointAtLength((L * i) / 120);
          const dd = (p.x - x) ** 2 + (p.y - y) ** 2;
          if (dd < bd) { bd = dd; best = i / 120; }
        }
        return best;
      };
      nodeAt = [
        { k: 'trunk', t: along(cable.trunk, len.trunk, nodes[0]) },
        { k: 'trunk', t: along(cable.trunk, len.trunk, nodes[1]) },
        { k: 'trunk', t: along(cable.trunk, len.trunk, nodes[2]) },
        { k: 'a', t: along(cable.a, len.a, nodes[3]) },
        { k: 'b', t: along(cable.b, len.b, nodes[4]) },
      ];
      // place the step labels next to their nodes
      steps.forEach((el, i) => {
        const [x, y] = nodes[i];
        const mode = place[i];
        el.style.left = el.style.top = el.style.right = '';
        if (mode === 'beyond') {
          // past the end of a branch, clear of the plug
          el.style.left = `${x + PLUG_REACH + 22}px`;
          el.style.top = `${y}px`;
          el.style.transform = 'translateY(-50%)';
        } else {
          el.style.left = `${Math.max(pl, x - 18)}px`;
          el.style.top = `${mode === 'above' ? y - 30 : y + 30}px`;
          el.style.transform = mode === 'above' ? 'translateY(-100%)' : 'none';
        }
      });
    }
    render();
  }

  const plugTransform = (x, y, ang) => `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((ang * 180) / Math.PI).toFixed(1)}) translate(${PLUG_AHEAD} 0)`;

  // Where a plug sits at progress t along its cable (reads path geometry).
  function plugAt(path, L, t) {
    const at = Math.max(0.001, Math.min(L, L * t));
    const p = path.getPointAtLength(at);
    const back = path.getPointAtLength(Math.max(0, at - 2));
    return plugTransform(p.x, p.y, Math.atan2(p.y - back.y, p.x - back.x));
  }

  function placePlug(g, transform) {
    g.style.opacity = transform ? '1' : '0';
    if (transform) g.setAttribute('transform', transform);
  }

  function setLit(i, on) {
    nodeEls[i]?.classList.toggle('is-on', on);
    steps[i]?.classList.toggle('is-on', on);
  }

  function renderWide() {
    const tt = smooth(0, 0.62, progress);
    const tb = smooth(0.6, 1, progress);
    // all geometry reads before any style writes: interleaving them forced a style
    // recalculation for every plug, every frame
    const at = {
      trunk: tt > 0.002 && tb <= 0.002 ? plugAt(cable.trunk, len.trunk, tt) : '',
      a: tb > 0.002 ? plugAt(cable.a, len.a, tb) : '',
      b: tb > 0.002 ? plugAt(cable.b, len.b, tb) : '',
    };
    cable.trunk.style.strokeDashoffset = `${len.trunk * (1 - tt)}`;
    cable.a.style.strokeDashoffset = `${len.a * (1 - tb)}`;
    cable.b.style.strokeDashoffset = `${len.b * (1 - tb)}`;
    placePlug(plug.trunk, at.trunk);
    placePlug(plug.a, at.a);
    placePlug(plug.b, at.b);
    nodeAt.forEach((n, i) => {
      const t = n.k === 'trunk' ? tt : tb;
      setLit(i, t >= n.t - 0.01 && t > 0.001);
    });
  }

  // Phones: one depth for every cable end, so the plugs move at the same steady pace as the page.
  function renderTall() {
    if (!lut) return;
    const y = progress * endY;
    const t = atDepth(lut.trunk, Math.min(y, forkY));
    const split = y > forkY + 0.5;
    const pa = split ? atDepth(lut.a, y) : null;
    const pb = split ? atDepth(lut.b, y) : null;
    cable.trunk.style.strokeDashoffset = `${(len.trunk - (y > 0.5 ? t.s : 0)).toFixed(1)}`;
    cable.a.style.strokeDashoffset = `${(len.a - (pa ? pa.s : 0)).toFixed(1)}`;
    cable.b.style.strokeDashoffset = `${(len.b - (pb ? pb.s : 0)).toFixed(1)}`;
    placePlug(plug.trunk, y > 0.5 && !split ? plugTransform(t.x, t.y, Math.PI / 2) : '');
    placePlug(plug.a, pa ? plugTransform(pa.x, pa.y, pa.ang) : '');
    placePlug(plug.b, pb ? plugTransform(pb.x, pb.y, pb.ang) : '');
    nodeY.forEach((ny, i) => setLit(i, y > 0.5 && y >= ny - 1));
  }

  const render = portrait ? renderTall : renderWide;

  layout();
  ScrollTrigger.addEventListener('refresh', layout);

  const onUpdate = (self) => {
    if (self.progress === progress) return;
    progress = self.progress;
    render();
  };
  if (!portrait) {
    ScrollTrigger.create({ trigger: section, start: 'top top', end: '+=140%', pin: pinEl, scrub: reduced ? true : 0.8, onUpdate });
  } else {
    // starts as the route's top passes 78% down the screen, ends with its bottom just in view
    ScrollTrigger.create({ trigger: route, start: 'top 78%', end: 'bottom bottom-=20', onUpdate });
  }
}
