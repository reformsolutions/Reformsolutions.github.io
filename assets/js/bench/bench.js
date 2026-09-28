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

export function createBench({ canvas, layer, isMobile, reduced }) {
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
  const screen = new ScreenUI();
  const laptop = buildLaptop({ screen, renderer });
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
      const bx = isMobile() ? 30 : 64;
      const dy = c.dy ?? (isMobile() ? -30 : -44);
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

  // ---- sizing ----
  let W = 1, H = 1;
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile() ? 1.5 : 2));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    screen.key = ''; // force redraw on next frame
  }
  resize();

  // ---- pointer parallax ----
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduced && window.matchMedia('(hover: hover)').matches) {
    window.addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

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

    // laptop transform with a gentle idle float
    const bob = reduced ? 0 : S.bob;
    laptop.root.position.set(S.px, S.py + S.introY + Math.sin(time * 1.1) * 0.035 * bob, S.pz);
    laptop.root.rotation.set(S.rx + Math.sin(time * 0.8) * 0.012 * bob, S.ry + S.introRy + Math.sin(time * 0.5) * 0.02 * bob, S.rz);
    laptop.apply(S, dt);
    screen.update(screenState());

    // contact shadow follows the laptop, softer as it lifts
    const lift = Math.max(0, laptop.root.position.y);
    laptop.shadow.position.set(S.px, -0.01, S.pz);
    laptop.shadow.rotation.z = -S.ry;
    laptop.shadow.scale.setScalar(1 + lift * 0.35);
    laptop.shadow.material.opacity = (0.55 - Math.min(0.35, lift * 0.45)) * (1 - S.explode * 0.4) * (1 - S.dive);

    // camera
    pointer.x = mix(pointer.x, pointer.tx, 0.05);
    pointer.y = mix(pointer.y, pointer.ty, 0.05);
    const c = S.cam;
    const aspect = W / H;
    const ref = 1.55;
    const fit = aspect < ref ? Math.pow(ref / aspect, isMobile() ? 0.72 : 0.9) : 1;
    vTarget.set(c.tx, c.ty, c.tz);
    vPos.set(c.x, c.y, c.z).sub(vTarget).multiplyScalar(fit).add(vTarget);
    const par = 1 - S.dive;
    vPos.x += pointer.x * 0.32 * par;
    vPos.y += -pointer.y * 0.18 * par;
    camera.fov = c.fov;

    if (S.dive > 0) {
      // fly into the screen: end square-on, close enough to fill the viewport
      laptop.root.updateMatrixWorld(true);
      laptop.screenCenter.getWorldPosition(vScreen);
      vNormal.set(0, 0, 1).transformDirection(laptop.screenCenter.matrixWorld);
      const half = Math.tan(THREE.MathUtils.degToRad(c.fov) / 2);
      const dH = (DIM.displayH / 2) / half;
      const dW = (DIM.displayW / 2) / (half * aspect);
      const d = Math.min(dH, dW) * 0.86;
      vDivePos.copy(vScreen).addScaledVector(vNormal, d);
      const k = ease(Math.min(1, S.dive));
      vPos.lerp(vDivePos, k);
      vTarget.lerp(vScreen, k);
    }
    camera.position.copy(vPos);
    camera.lookAt(vTarget);

    const sx = S.shiftX * (1 - S.dive);
    const sy = S.shiftY * (1 - S.dive);
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

  function tick(_t, deltaMS) {
    if (!active || document.hidden) return;
    frame(Math.min(0.05, deltaMS / 1000));
  }
  gsap.ticker.add(tick);

  window.addEventListener('resize', () => {
    resize();
    frame(0);
  });

  return {
    state,
    camera,
    laptop,
    screen,
    addCallouts,
    resize,
    render: () => frame(0),
    setActive(v) {
      if (v === active) return;
      active = v;
      canvas.classList.toggle('is-off', !v);
      document.querySelector('.bench-grid')?.classList.toggle('is-off', !v);
      layer.style.visibility = v ? '' : 'hidden';
      if (v) frame(0);
    },
    warm() {
      // compile shaders up-front so the first scroll doesn't hitch
      renderer.compile(scene, camera);
      frame(0);
    },
  };
}
