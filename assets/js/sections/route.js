// "For businesses" route: the logo's cable winds through the ITAD steps and
// forks into Reuse / Recycle. An orange RJ45 plug leads each cable end.
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

  let len = { trunk: 1, a: 1, b: 1 };
  let nodeAt = []; // [{ path, t }] progress at which each node is reached
  let nodeEls = [];
  let progress = 0;

  function layout() {
    const cs = getComputedStyle(route);
    const pl = parseFloat(cs.paddingLeft) || 0;
    const pr = parseFloat(cs.paddingRight) || 0;
    const w = route.clientWidth;
    const h = route.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const iw = w - pl - pr;
    const portrait = isMobile();
    let trunk, a, b, nodes, place;

    if (!portrait) {
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
      const x0 = pl + 18;
      const x1 = pl + 50;
      const Y = (v) => v * h;
      const fork = [x0, Y(0.64)];
      trunk = [[x0, 0], [x0, Y(0.06)], [x0, Y(0.26)], [x0, Y(0.46)], fork];
      a = [fork, [x0, Y(0.74)], [x0, Y(0.995)]];
      b = [fork, [x1, Y(0.71)], [x1, Y(0.9)], [x1, Y(0.995)]];
      nodes = [trunk[1], trunk[2], trunk[3], a[1], b[2]];
      place = ['right', 'right', 'right', 'right', 'right'];
    }

    const prev = trunk[trunk.length - 2];
    for (const [k, pts, pv] of [['trunk', trunk], ['a', a, prev], ['b', b, prev]]) {
      const d = pathThrough(pts, pv);
      cable[k].setAttribute('d', d);
      ghost[k].setAttribute('d', d);
      len[k] = cable[k].getTotalLength();
      cable[k].style.strokeDasharray = `${len[k]} ${len[k] + 40}`;
    }

    // nodes: find how far along their path each one sits
    nodesG.innerHTML = '';
    nodeEls = nodes.map(([x, y]) => {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('class', 'route__node');
      c.setAttribute('cx', x.toFixed(1));
      c.setAttribute('cy', y.toFixed(1));
      c.setAttribute('r', portrait ? 6 : 7);
      nodesG.appendChild(c);
      return c;
    });
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

    // position the step labels next to their nodes
    steps.forEach((el, i) => {
      const [x, y] = nodes[i];
      const mode = place[i];
      el.style.left = el.style.top = el.style.right = '';
      if (mode === 'right') {
        // one text column, clear of both parallel branch cables
        el.style.left = `${pl + 84}px`;
        el.style.top = `${y - 12}px`;
        el.style.transform = 'none';
      } else if (mode === 'beyond') {
        // past the end of a branch, clear of the plug
        el.style.left = `${x + 96}px`;
        el.style.top = `${y}px`;
        el.style.transform = 'translateY(-50%)';
      } else {
        el.style.left = `${Math.max(pl, x - 18)}px`;
        el.style.top = `${mode === 'above' ? y - 30 : y + 30}px`;
        el.style.transform = mode === 'above' ? 'translateY(-100%)' : 'none';
      }
    });
    render();
  }

  // Where a plug sits at progress t along its cable (reads path geometry only).
  function plugAt(path, L, t) {
    const at = Math.max(0.001, Math.min(L, L * t));
    const p = path.getPointAtLength(at);
    const back = path.getPointAtLength(Math.max(0, at - 2));
    const ang = (Math.atan2(p.y - back.y, p.x - back.x) * 180) / Math.PI;
    return `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${ang.toFixed(1)}) translate(26 0)`;
  }

  function placePlug(g, transform) {
    g.style.opacity = transform ? '1' : '0';
    if (transform) g.setAttribute('transform', transform);
  }

  function render() {
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
      const reached = (n.k === 'trunk' ? tt : tb) >= n.t - 0.01 && (n.k === 'trunk' ? tt : tb) > 0.001;
      nodeEls[i]?.classList.toggle('is-on', reached);
      steps[i]?.classList.toggle('is-on', reached);
    });
  }

  layout();
  ScrollTrigger.addEventListener('refresh', layout);

  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=140%',
      pin: pinEl,
      scrub: reduced ? true : 0.8,
      onUpdate: (self) => {
        progress = self.progress;
        render();
      },
    });
  });
  mm.add('(max-width: 899px)', () => {
    ScrollTrigger.create({
      trigger: route,
      start: 'top 70%',
      end: 'bottom 80%',
      scrub: reduced ? true : 0.6,
      onUpdate: (self) => {
        progress = self.progress;
        render();
      },
    });
  });
}
