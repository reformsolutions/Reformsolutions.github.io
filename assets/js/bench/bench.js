// The 3D "bench": renderer, lighting, camera choreography and callout labels.
// All motion is driven by a plain `state` object that the scroll story tweens.
import * as THREE from '../../../vendor/three.min.js';
import { buildLaptop, DIM } from './laptop.js';
import { ScreenUI } from './screen.js';

const mix = THREE.MathUtils.lerp;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2')) || !!c.getContext('webgl');
  } catch {
    return false;
  }
}

// The 8 corners of a box, used to measure a part's footprint on screen.
function corners(x0, x1, y0, y1, z0, z1) {
  const out = [];
  for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) out.push(new THREE.Vector3(x, y, z));
  return out;
}

export function createBench({ canvas, layer, isMobile, reduced }) {
  const mobile = isMobile();
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    console.warn('WebGL unavailable', err);
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.035).texture;
  scene.environmentIntensity = 0.78;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xfff1dc, 1.7);
  key.position.set(-3.5, 7, 5);
  const rim = new THREE.DirectionalLight(0xd9e6ff, 1.1);
  rim.position.set(5, 3.5, -6);
  const fill = new THREE.HemisphereLight(0xfdf8ec, 0x2d445a, 0.4);
  scene.add(key, rim, fill);

  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 80);
  const screen = new ScreenUI({ scale: mobile ? 0.75 : 1 });
  const laptop = buildLaptop({ screen, renderer, mobile });
  scene.add(laptop.root, laptop.shadow);

  // ---- state (tweened by the story) ----
  const state = {
    px: 0, py: 0.55, pz: 0, rx: 0.2, ry: -0.58, rz: 0.04,
    introY: 0, introRy: 0,
    bob: 1,
    lid: 0, explode: 0,
    ssdOut: 0, ssdGlow: 0, ssdWiped: 0,
    fan: 0, keysWave: 0,
    scan: -3, scanOn: 0,
    clean: 0, tag: 0, grade: 0, glass: 1,
    post: 0, diag: 0, wipe: 0, ready: 0, fade: 0,
    cam: { x: 0.2, y: 2.4, z: 9.4, tx: 0, ty: 0.35, tz: 0, fov: 24 },
    shiftX: 0.2, shiftY: 0,
    dive: 0,
    co: {},
  };

  // ---- callouts (HTML labels pinned to 3D anchors) ----
  const callouts = [];
  function addCallouts(list) {
    for (const c of list) {
      const el = document.createElement('div');
      el.className = `callout${c.dir === 'l' ? ' callout--left' : ''}`;
      el.innerHTML = `<i class="callout__dot"></i><span class="callout__line"></span><div class="callout__box"><b>${c.title}</b><span>${c.detail}</span>${c.status ? `<em class="callout__status">${c.status}</em>` : ''}</div>`;
      layer.appendChild(el);
      const bx = mobile ? 30 : 64;
      const dy = c.dy ?? (mobile ? -30 : -44);
      el.style.setProperty('--bx', `${bx}px`);
      el.style.setProperty('--by', `${dy}px`);
      el.style.setProperty('--len', `${Math.hypot(bx, dy)}px`);
      const entry = { ...c, el, box: el.querySelector('.callout__box'), statusEl: el.querySelector('.callout__status'), passed: null, shown: false, bx, dy, left: null, bw: 0 };
      setSide(entry, c.dir === 'l');
      state.co[c.id] = { o: 0, pass: 0 };
      callouts.push(entry);
    }
  }

  // Box sits right of its dot unless that would run off-screen (then left).
  function setSide(c, left) {
    if (c.left === left) return;
    c.left = left;
    c.el.classList.toggle('callout--left', left);
    c.el.style.setProperty('--ang', `${Math.atan2(c.dy, left ? -c.bx : c.bx)}rad`);
  }

  // ---- sizing: pixel budget + adaptive resolution ----
  let W = 1, H = 1;
  const quality = { scale: 1, slow: 0, fast: 0, cooldown: 90 };
  const budget = mobile ? 2.2e6 : 4.2e6; // max rendered pixels per frame
  function pixelRatio() {
    const dpr = window.devicePixelRatio || 1;
    const cap = Math.min(dpr, mobile ? 1.75 : 2, Math.sqrt(budget / Math.max(1, W * H)));
    return Math.max(0.75, cap * quality.scale);
  }
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    screen.key = ''; // force redraw on next frame
    forceRender = true;
  }
  // Drop resolution if frames are consistently slow; creep back up when there's headroom.
  function adapt(deltaMS) {
    if (quality.cooldown > 0) {
      quality.cooldown--;
      return;
    }
    if (deltaMS > 28) {
      quality.slow++;
      quality.fast = 0;
    } else if (deltaMS < 18) {
      quality.fast++;
      quality.slow = Math.max(0, quality.slow - 1);
    }
    if (quality.slow > 40 && quality.scale > 0.6) {
      quality.scale = Math.max(0.6, quality.scale - 0.15);
      Object.assign(quality, { slow: 0, fast: 0, cooldown: 90 });
      renderer.setPixelRatio(pixelRatio());
      renderer.setSize(W, H, false);
    } else if (quality.fast > 600 && quality.scale < 1) {
      quality.scale = Math.min(1, quality.scale + 0.1);
      Object.assign(quality, { slow: 0, fast: 0, cooldown: 120 });
      renderer.setPixelRatio(pixelRatio());
      renderer.setSize(W, H, false);
    }
  }
  let forceRender = true;
  resize();

  // ---- pointer parallax ----
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduced && window.matchMedia('(hover: hover)').matches) {
    window.addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  // ---- auto-framing ----
  // The story supplies a screen rectangle (px) the laptop must stay inside — e.g.
  // the space above the hero copy on phones, or beside the stage text on desktop.
  // Each frame we project the laptop's footprint with the tuned camera and, only
  // if it spills out, pull the camera back and shift the view until it fits.
  let rectFn = null;
  const fr = { k: 1, sx: 0, sy: 0, tk: 1, tsx: 0, tsy: 0, ready: false };
  const P = laptop.parts;
  const footprint = [
    { obj: P.tray, pts: corners(-DIM.W / 2, DIM.W / 2, 0, DIM.baseTop, -DIM.D / 2, DIM.D / 2) },
    { obj: P.topCase, pts: corners(-DIM.W / 2, DIM.W / 2, 0, DIM.topH, -DIM.D / 2, DIM.D / 2) },
    { obj: P.lid, pts: corners(-DIM.W / 2, DIM.W / 2, 0, DIM.D, -DIM.lidT, 0) },
    { obj: P.ssd, pts: corners(-0.4, 0.4, 0, 0.01, -0.11, 0.11), onlyWhen: () => state.ssdOut > 0.02 },
  ];
  const bb = { x0: 0, x1: 0, y0: 0, y1: 0 };
  function measureFootprint() {
    bb.x0 = bb.y0 = Infinity;
    bb.x1 = bb.y1 = -Infinity;
    for (const f of footprint) {
      if (f.onlyWhen && !f.onlyWhen()) continue;
      for (const p of f.pts) {
        vTmp.copy(p).applyMatrix4(f.obj.matrixWorld).project(camera);
        if (vTmp.z > 1) continue;
        if (vTmp.x < bb.x0) bb.x0 = vTmp.x;
        if (vTmp.x > bb.x1) bb.x1 = vTmp.x;
        if (vTmp.y < bb.y0) bb.y0 = vTmp.y;
        if (vTmp.y > bb.y1) bb.y1 = vTmp.y;
      }
    }
    return bb.x1 > bb.x0 && bb.y1 > bb.y0;
  }
  function solveFrame(dt, sx, sy) {
    const r = rectFn ? rectFn() : null;
    let k = 1, dsx = 0, dsy = 0;
    if (r && measureFootprint()) {
      // rect → NDC (y up)
      const R = { x0: (r.x0 / W) * 2 - 1, x1: (r.x1 / W) * 2 - 1, y0: 1 - (r.y1 / H) * 2, y1: 1 - (r.y0 / H) * 2 };
      const tx = 2 * sx, ty = 2 * sy; // where the camera target lands on screen
      k = Math.max(1, (bb.x1 - bb.x0) / Math.max(0.05, R.x1 - R.x0), (bb.y1 - bb.y0) / Math.max(0.05, R.y1 - R.y0));
      const x0 = tx + (bb.x0 - tx) / k, x1 = tx + (bb.x1 - tx) / k;
      const y0 = ty + (bb.y0 - ty) / k, y1 = ty + (bb.y1 - ty) / k;
      const mx = x0 < R.x0 ? R.x0 - x0 : x1 > R.x1 ? R.x1 - x1 : 0;
      const my = y0 < R.y0 ? R.y0 - y0 : y1 > R.y1 ? R.y1 - y1 : 0;
      dsx = mx / 2;
      dsy = my / 2;
    }
    fr.tk = k;
    fr.tsx = dsx;
    fr.tsy = dsy;
    const a = fr.ready ? 1 - Math.exp(-dt * 7) : 1;
    fr.k += (k - fr.k) * a;
    fr.sx += (dsx - fr.sx) * a;
    fr.sy += (dsy - fr.sy) * a;
    fr.ready = true;
  }
  const frameSettling = () => Math.abs(fr.tk - fr.k) > 1e-4 || Math.abs(fr.tsx - fr.sx) > 1e-4 || Math.abs(fr.tsy - fr.sy) > 1e-4;

  // ---- frame ----
  const vPos = new THREE.Vector3();
  const vTarget = new THREE.Vector3();
  const vScreen = new THREE.Vector3();
  const vNormal = new THREE.Vector3();
  const vDivePos = new THREE.Vector3();
  const vTmp = new THREE.Vector3();
  let time = 0;
  let active = true;

  function screenState() {
    if (state.ready > 0) return { mode: 'ready', p: state.ready, fade: state.fade };
    if (state.wipe > 0) return { mode: 'wipe', p: state.wipe };
    if (state.diag > 0) return { mode: 'diag', p: state.diag };
    if (state.post > 0) return { mode: 'post', p: state.post };
    return { mode: 'off', p: 0 };
  }

  function frame(dt) {
    time += dt;
    const S = state;
    const c = S.cam;
    const aspect = W / H;

    // 1. settled pose (no intro drop, no idle float) — used to measure framing
    laptop.root.position.set(S.px, S.py, S.pz);
    laptop.root.rotation.set(S.rx, S.ry, S.rz);
    laptop.apply(S, dt);
    screen.update(screenState());
    laptop.root.updateMatrixWorld(true);

    // 2. the tuned camera for this moment of the story
    const ref = 1.55;
    const fit = aspect < ref ? Math.pow(ref / aspect, mobile ? 0.72 : 0.9) : 1;
    vTarget.set(c.tx, c.ty, c.tz);
    vPos.set(c.x, c.y, c.z).sub(vTarget).multiplyScalar(fit).add(vTarget);
    camera.fov = c.fov;
    camera.position.copy(vPos);
    camera.lookAt(vTarget);
    camera.setViewOffset(W, H, -S.shiftX * W, S.shiftY * H, W, H);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    solveFrame(dt, S.shiftX, S.shiftY);

    // 3. live pose: intro drop + gentle idle float
    const bob = reduced ? 0 : S.bob;
    laptop.root.position.set(S.px, S.py + S.introY + Math.sin(time * 1.1) * 0.035 * bob, S.pz);
    laptop.root.rotation.set(S.rx + Math.sin(time * 0.8) * 0.012 * bob, S.ry + S.introRy + Math.sin(time * 0.5) * 0.02 * bob, S.rz);
    laptop.root.updateMatrixWorld(true);

    // contact shadow follows the laptop, softer as it lifts
    const lift = Math.max(0, laptop.root.position.y);
    laptop.shadow.position.set(S.px, -0.01, S.pz);
    laptop.shadow.rotation.z = -S.ry;
    laptop.shadow.scale.setScalar(1 + lift * 0.35);
    laptop.shadow.material.opacity = (0.55 - Math.min(0.35, lift * 0.45)) * (1 - S.explode * 0.4) * (1 - S.dive);

    // 4. final camera: framing correction (fades out for the dive) + parallax
    const damp = 1 - Math.min(1, S.dive);
    const k = 1 + (fr.k - 1) * damp;
    vPos.sub(vTarget).multiplyScalar(k).add(vTarget);
    vPos.x += pointer.x * 0.32 * damp;
    vPos.y += -pointer.y * 0.18 * damp;

    if (S.dive > 0) {
      // fly into the screen: end square-on, close enough to fill the viewport
      laptop.screenCenter.getWorldPosition(vScreen);
      vNormal.set(0, 0, 1).transformDirection(laptop.screenCenter.matrixWorld);
      const half = Math.tan(THREE.MathUtils.degToRad(c.fov) / 2);
      const dH = (DIM.displayH / 2) / half;
      const dW = (DIM.displayW / 2) / (half * aspect);
      const d = Math.min(dH, dW) * 0.86;
      vDivePos.copy(vScreen).addScaledVector(vNormal, d);
      const e = ease(Math.min(1, S.dive));
      vPos.lerp(vDivePos, e);
      vTarget.lerp(vScreen, e);
    }
    camera.position.copy(vPos);
    camera.lookAt(vTarget);
    const sx = (S.shiftX + fr.sx) * damp;
    const sy = (S.shiftY + fr.sy) * damp;
    camera.setViewOffset(W, H, -sx * W, sy * H, W, H);
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
    updateCallouts();
  }

  function updateCallouts() {
    for (const c of callouts) {
      const st = state.co[c.id];
      const o = st ? st.o : 0;
      if (o <= 0.001) {
        if (c.shown) {
          c.el.style.opacity = '0';
          c.shown = false;
        }
        continue;
      }
      const a = laptop.anchors[c.anchor];
      if (!a) continue;
      a.getWorldPosition(vTmp);
      vTmp.project(camera);
      if (vTmp.z > 1) continue;
      const x = (vTmp.x * 0.5 + 0.5) * W;
      const y = (-vTmp.y * 0.5 + 0.5) * H;
      if (!c.bw) c.bw = c.box.offsetWidth;
      const preferLeft = c.dir === 'l';
      const fitsRight = x + c.bx + c.bw < W - 10;
      const fitsLeft = x - c.bx - c.bw > 10;
      setSide(c, preferLeft ? !(fitsRight && !fitsLeft) : !fitsRight && fitsLeft);
      c.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      c.el.style.opacity = o.toFixed(3);
      c.shown = true;
      if (c.statusEl && c.pass) {
        const passed = st.pass >= 0.5;
        if (passed !== c.passed) {
          c.passed = passed;
          c.el.dataset.status = passed ? 'pass' : 'testing';
          c.statusEl.textContent = passed ? c.pass : c.status;
        }
      }
    }
  }

  // ---- render on demand ----
  // Only draw when something visible changed. The idle hero float runs at 30fps.
  let lastSig = '';
  let accDt = 0;
  let idleTick = 0;
  let renderedLast = false;
  function signature() {
    const S = state, c = S.cam;
    let co = 0;
    for (const id in S.co) co += S.co[id].o * 7 + S.co[id].pass;
    return [
      S.px, S.py, S.pz, S.rx, S.ry, S.rz, S.introY, S.introRy, S.lid, S.explode, S.ssdOut, S.ssdGlow, S.ssdWiped,
      S.keysWave, S.scan, S.scanOn, S.clean, S.tag, S.grade, S.glass, S.post, S.diag, S.wipe, S.ready, S.fade,
      c.x, c.y, c.z, c.tx, c.ty, c.tz, c.fov, S.shiftX, S.shiftY, S.dive, pointer.x, pointer.y, co,
    ].map((v) => Math.round(v * 2e4)).join(',');
  }

  function tick(_t, deltaMS) {
    if (!active || document.hidden) return;
    accDt += Math.min(0.05, deltaMS / 1000);
    pointer.x = mix(pointer.x, pointer.tx, 0.05);
    pointer.y = mix(pointer.y, pointer.ty, 0.05);
    const sig = signature();
    const changed = sig !== lastSig || forceRender || frameSettling();
    const animated = (!reduced && state.bob > 0.001) || state.fan > 0.001;
    if (!changed && (!animated || ++idleTick % 2)) {
      renderedLast = false;
      return;
    }
    lastSig = sig;
    forceRender = false;
    frame(Math.min(0.1, accDt));
    accDt = 0;
    if (renderedLast && changed) adapt(deltaMS);
    renderedLast = true;
  }
  gsap.ticker.add(tick);

  window.addEventListener('resize', resize);

  // Upload every texture and compile every shader (including parts that are
  // hidden until later in the story) so nothing stalls mid-scroll.
  async function warm() {
    const hidden = [];
    scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of mats) for (const k of ['map', 'alphaMap']) if (m[k]) renderer.initTexture(m[k]);
      if (o.material?.uniforms?.map?.value) renderer.initTexture(o.material.uniforms.map.value);
    });
    try {
      if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
      else renderer.compile(scene, camera);
    } catch {
      renderer.compile(scene, camera);
    }
    hidden.forEach((o) => (o.visible = false));
    forceRender = true;
    frame(0);
  }

  return {
    state,
    camera,
    laptop,
    screen,
    addCallouts,
    resize,
    warm,
    setFrameRect(fn) {
      rectFn = fn;
      fr.ready = false;
      forceRender = true;
    },
    render() {
      forceRender = true;
    },
    setActive(v) {
      if (v === active) return;
      active = v;
      canvas.classList.toggle('is-off', !v);
      document.querySelector('.bench-grid')?.classList.toggle('is-off', !v);
      layer.style.visibility = v ? '' : 'hidden';
      forceRender = true;
    },
  };
}
