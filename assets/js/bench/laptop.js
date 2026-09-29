// A procedurally built business laptop (no model files) with the parts needed
// for the refurbishment story: hinged lid, live screen, keys, internals for an
// exploded view, grime that can be wiped, stickers, and a scan-line shader.
import * as THREE from '../../../vendor/three.min.js';
import * as TX from './textures.js';

export const DIM = {
  W: 3.2,
  D: 2.2,
  r: 0.16,
  floorH: 0.03,
  trayH: 0.095,
  topH: 0.05,
  lidT: 0.055,
  keyH: 0.016,
  displayW: 3.04,
  displayH: 1.9,
  displayY: 1.14,
};
DIM.baseTop = DIM.trayH + DIM.topH;
DIM.pivotY = DIM.baseTop + 0.014;

const LID_OPEN = THREE.MathUtils.degToRad(108);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOutBack = (t) => {
  const c1 = 1.5, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// ---------------------------------------------------------------------------
// Shared shader hooks
// ---------------------------------------------------------------------------
export const scanUniforms = {
  uScan: { value: -10 },
  uScanOn: { value: 0 },
  uScanDir: { value: new THREE.Vector3(0, 0.62, -0.78).normalize() },
  uScanColor: { value: new THREE.Color('#e8963a') },
};

function patchScan(mat) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, scanUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vScanWorld;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 scanWP = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          scanWP = instanceMatrix * scanWP;
        #endif
        vScanWorld = (modelMatrix * scanWP).xyz;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vScanWorld;
        uniform float uScan;
        uniform float uScanOn;
        uniform vec3 uScanDir;
        uniform vec3 uScanColor;`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float sd = dot(vScanWorld, uScanDir) - uScan;
        float core = exp(-pow(sd / 0.012, 2.0));
        float halo = exp(-pow(sd / 0.085, 2.0)) * 0.32;
        float trail = step(sd, 0.0) * exp(sd * 2.5) * 0.05;
        totalEmissiveRadiance += uScanColor * (core * 2.4 + halo + trail) * uScanOn;`
      );
  };
  mat.customProgramCacheKey = () => 'rs-scan';
  return mat;
}

const grimeUniforms = { uWipe: { value: -0.2 } };

function grimeMaterial(tex, strength = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uWipe: grimeUniforms.uWipe, uStrength: { value: strength } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform float uWipe;
      uniform float uStrength;
      varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec4 t = texture2D(map, vUv);
        float n = h(floor(vUv * vec2(70.0, 44.0)));
        float edge = vUv.x + (n - 0.5) * 0.03;
        float m = smoothstep(uWipe - 0.025, uWipe + 0.025, edge);
        gl_FragColor = vec4(t.rgb, t.a * m * uStrength);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const hw = w / 2, hh = h / 2;
  r = Math.min(r, hw, hh);
  s.moveTo(-hw + r, -hh);
  s.lineTo(hw - r, -hh);
  s.absarc(hw - r, -hh + r, r, -Math.PI / 2, 0, false);
  s.lineTo(hw, hh - r);
  s.absarc(hw - r, hh - r, r, 0, Math.PI / 2, false);
  s.lineTo(-hw + r, hh);
  s.absarc(-hw + r, hh - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-hw, -hh + r);
  s.absarc(-hw + r, -hh + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

// ExtrudeGeometry is non-indexed with flat normals; smooth only the side walls
// (incl. bevels) so rounded corners read as one continuous machined surface.
function smoothSideNormals(geo) {
  const pos = geo.getAttribute('position');
  const nor = geo.getAttribute('normal');
  const group = geo.groups.find((g) => g.materialIndex === 1);
  if (!group) return;
  const acc = new Map();
  const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3();
  const cb = new THREE.Vector3(), ab = new THREE.Vector3();
  const key = (i) => `${Math.round(pos.getX(i) * 1e4)}_${Math.round(pos.getY(i) * 1e4)}_${Math.round(pos.getZ(i) * 1e4)}`;
  const end = group.start + group.count;
  for (let i = group.start; i < end; i += 3) {
    pA.fromBufferAttribute(pos, i);
    pB.fromBufferAttribute(pos, i + 1);
    pC.fromBufferAttribute(pos, i + 2);
    cb.subVectors(pC, pB);
    ab.subVectors(pA, pB);
    cb.cross(ab);
    for (let k = 0; k < 3; k++) {
      const kk = key(i + k);
      let v = acc.get(kk);
      if (!v) acc.set(kk, (v = new THREE.Vector3()));
      v.add(cb);
    }
  }
  const n = new THREE.Vector3();
  for (let i = group.start; i < end; i++) {
    n.copy(acc.get(key(i))).normalize();
    nor.setXYZ(i, n.x, n.y, n.z);
  }
  nor.needsUpdate = true;
}

// Rounded slab spanning y ∈ [0, h], centred on x/z.
function slab(w, d, h, r, bevel) {
  const b = Math.min(bevel, h / 2 - 0.001);
  const shape = roundedRectShape(w - 2 * b, d - 2 * b, Math.max(0.004, r - b));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.0008, h - 2 * b),
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 6,
    curveSegments: 26,
  });
  smoothSideNormals(geo);
  geo.translate(0, 0, b);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

// Hollow ring (tray walls), y ∈ [0, h].
function ring(w, d, r, wall, h) {
  const shape = roundedRectShape(w, d, r);
  shape.holes.push(roundedRectShape(w - 2 * wall, d - 2 * wall, Math.max(0.01, r - wall)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 26 });
  smoothSideNormals(geo);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

// A PlaneGeometry with rounded corners (xy-plane, same 0..1 UV layout).
function roundPlane(w, h, r) {
  const geo = new THREE.ShapeGeometry(roundedRectShape(w, h, r), 16);
  // ShapeGeometry UVs are in shape units; normalise to 0..1
  const uv = geo.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / w + 0.5, uv.getY(i) / h + 0.5);
  return geo;
}

function flatRoundRect(w, d, r) {
  const geo = roundPlane(w, d, r);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

// Bake static parts that share a material into one geometry: one draw call instead of
// one per part (phones pay dearly for draw calls). Items: [geometry, [x,y,z], [rx,ry,rz], [sx,sy,sz]].
const bakeM = new THREE.Matrix4();
const bakeQ = new THREE.Quaternion();
const bakeE = new THREE.Euler();
const bakeP = new THREE.Vector3();
const bakeS = new THREE.Vector3();
function bake(items) {
  const geos = items.map(([geo, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]]) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    bakeM.compose(bakeP.set(...pos), bakeQ.setFromEuler(bakeE.set(...rot)), bakeS.set(...scale));
    return g.applyMatrix4(bakeM);
  });
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    if (!geos.every((g) => g.getAttribute(name))) continue;
    const arrays = geos.map((g) => g.getAttribute(name).array);
    const all = new Float32Array(arrays.reduce((n, a) => n + a.length, 0));
    arrays.reduce((at, a) => (all.set(a, at), at + a.length), 0);
    out.setAttribute(name, new THREE.BufferAttribute(all, geos[0].getAttribute(name).itemSize));
  }
  return out;
}

// A box whose top face takes the second material (labels, PCB print): 2 draw calls, not 6.
function topBox(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const idx = [...geo.index.array];
  geo.setIndex([...idx.slice(0, 12), ...idx.slice(18), ...idx.slice(12, 18)]); // +y face last
  geo.clearGroups();
  geo.addGroup(0, 30, 0);
  geo.addGroup(30, 6, 1);
  return geo;
}

// ---------------------------------------------------------------------------
// Keyboard layout (15 units wide)
// ---------------------------------------------------------------------------
const FN_W = 13 / 12;
const ROWS = [
  { h: 0.5, fn: true, keys: [['Esc', 1], ...Array.from({ length: 12 }, (_, i) => [`F${i + 1}`, FN_W]), ['Del', 1]] },
  { h: 1, keys: [['`', 1, '~'], ['1', 1, '!'], ['2', 1, '@'], ['3', 1, '#'], ['4', 1, '$'], ['5', 1, '%'], ['6', 1, '^'], ['7', 1, '&'], ['8', 1, '*'], ['9', 1, '('], ['0', 1, ')'], ['-', 1, '_'], ['=', 1, '+'], ['Backspace', 2]] },
  { h: 1, keys: [['Tab', 1.5], ['Q', 1], ['W', 1], ['E', 1], ['R', 1], ['T', 1], ['Y', 1], ['U', 1], ['I', 1], ['O', 1], ['P', 1], ['[', 1, '{'], [']', 1, '}'], ['\\', 1.5, '|']] },
  { h: 1, keys: [['Caps', 1.75], ['A', 1], ['S', 1], ['D', 1], ['F', 1], ['G', 1], ['H', 1], ['J', 1], ['K', 1], ['L', 1], [';', 1, ':'], ["'", 1, '"'], ['Enter', 2.25]] },
  { h: 1, keys: [['Shift', 2.25], ['Z', 1], ['X', 1], ['C', 1], ['V', 1], ['B', 1], ['N', 1], ['M', 1], [',', 1, '<'], ['.', 1, '>'], ['/', 1, '?'], ['Shift', 2.75]] },
  { h: 1, keys: [['Ctrl', 1.25], ['Fn', 1], ['Win', 1], ['Alt', 1.25], ['', 5.5], ['Alt', 1], ['Ctrl', 1], ['◀', 1], ['▲▼', 1], ['▶', 1]] },
];

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
export function buildLaptop({ screen, renderer, mobile = false }) {
  const { W, D, r } = DIM;
  const maxAniso = Math.min(mobile ? 4 : 8, renderer.capabilities.getMaxAnisotropy());

  // ---- materials ----
  // Phones skip the clearcoat layer (a second specular pass on the biggest surfaces).
  const Glossy = mobile ? THREE.MeshStandardMaterial : THREE.MeshPhysicalMaterial;
  const gloss = (props, coat) => new Glossy(mobile ? props : { ...props, ...coat });
  const shellMat = patchScan(gloss({ color: 0x1c2e41, metalness: 0.62, roughness: 0.42 }, { clearcoat: 0.16, clearcoatRoughness: 0.45 }));
  const interiorMat = patchScan(new THREE.MeshStandardMaterial({ color: 0x1a2835, metalness: 0.35, roughness: 0.72 }));
  const deckMat = patchScan(new THREE.MeshStandardMaterial({ color: 0x121a23, metalness: 0.2, roughness: 0.78 }));
  const keyMat = patchScan(new THREE.MeshStandardMaterial({ color: 0x151b22, metalness: 0.05, roughness: 0.6 }));
  const padMat = patchScan(gloss({ color: 0x2a3e52, metalness: 0.45, roughness: 0.3 }, { clearcoat: 0.8, clearcoatRoughness: 0.2 }));
  const bezelMat = patchScan(new THREE.MeshStandardMaterial({ color: 0x07090c, metalness: 0.1, roughness: 0.22 }));
  const portMat = new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.65 });
  const rubberMat = new THREE.MeshStandardMaterial({ color: 0x0c1014, roughness: 0.9 });
  const darkPlastic = new THREE.MeshStandardMaterial({ color: 0x14191f, roughness: 0.55, metalness: 0.1 });
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xc0692a, metalness: 1, roughness: 0.3 });
  const alumMat = new THREE.MeshStandardMaterial({ color: 0xb9c1c8, metalness: 1, roughness: 0.32 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xcfa74e, metalness: 1, roughness: 0.3 });

  const root = new THREE.Group();
  root.name = 'laptop';
  const anchors = {};
  const anchor = (name, parent, x, y, z) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    parent.add(o);
    anchors[name] = o;
    return o;
  };

  // Static parts that share a material are baked into one mesh (see bake()).
  const part = (w, h, d, x, y, z) => [new THREE.BoxGeometry(w, h, d), [x, y, z]];

  // ---- bottom tray ----
  const tray = new THREE.Group();
  root.add(tray);
  tray.add(new THREE.Mesh(bake([
    [slab(W, D, DIM.floorH + 0.012, r, 0.014)],
    [ring(W, D, r, 0.035, DIM.trayH - 0.02), [0, 0.02, 0]],
  ]), shellMat));
  // inside the tray: only drawn while the case is open
  const cavity = new THREE.Mesh(flatRoundRect(W - 0.08, D - 0.08, r - 0.04), interiorMat);
  cavity.position.y = DIM.floorH + 0.0125;
  tray.add(cavity);
  // screw bosses
  const bossGeo = new THREE.CylinderGeometry(0.026, 0.03, 0.03, 16);
  const bosses = new THREE.Mesh(bake([[-1.45, -0.95], [1.45, -0.95], [-1.45, 0.95], [1.45, 0.95], [0, 0.98], [-0.7, -0.98], [0.7, -0.98], [-1.5, 0], [1.5, 0]]
    .map(([x, z]) => [bossGeo, [x, DIM.floorH + 0.028, z]])), alumMat);
  tray.add(bosses);
  // rubber feet
  const footGeo = new THREE.CapsuleGeometry(0.03, 2.3, 4, 12);
  tray.add(new THREE.Mesh(bake([-0.82, 0.86].map((z) => [footGeo, [0, -0.004, z], [0, 0, Math.PI / 2], [1, 1, 0.5]])), rubberMat));
  // side ports (left: HDMI, RJ45, USB-C ×2, audio; right: USB-A ×2, SD)
  const portY = 0.074;
  const L = -W / 2 + 0.0035;
  const R = W / 2 - 0.0035;
  tray.add(new THREE.Mesh(bake([
    part(0.012, 0.042, 0.15, L, portY, -0.62),
    part(0.012, 0.07, 0.17, L, portY - 0.004, -0.34),
    part(0.012, 0.026, 0.085, L, portY, -0.05),
    part(0.012, 0.026, 0.085, L, portY, 0.1),
    [new THREE.CylinderGeometry(0.017, 0.017, 0.012, 20), [L, portY, 0.42], [0, 0, Math.PI / 2]],
    part(0.012, 0.045, 0.13, R, portY, -0.32),
    part(0.012, 0.045, 0.13, R, portY, -0.1),
    part(0.012, 0.012, 0.22, R, portY, 0.38),
  ]), portMat));
  anchor('ports', tray, -W / 2 - 0.02, portY, -0.34);

  // ---- internals (hidden inside the tray until the exploded view) ----
  const battery = new THREE.Group();
  const board = new THREE.Group();
  const ram = new THREE.Group();
  const ssd = new THREE.Group();
  const cooling = new THREE.Group();
  root.add(battery, board, ram, ssd, cooling);

  // battery: three cells + frame, label on the middle one
  const cellMat = new THREE.MeshStandardMaterial({ color: 0x1b1f24, roughness: 0.5, metalness: 0.15 });
  const labelTex = TX.batteryLabel();
  labelTex.anisotropy = maxAniso;
  const labelMat = new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.55 });
  const cellGeo = new THREE.BoxGeometry(0.76, 0.05, 0.66);
  battery.add(new THREE.Mesh(bake([[cellGeo, [-0.8, 0.025, 0]], [cellGeo, [0.8, 0.025, 0]]]), cellMat));
  const labelled = new THREE.Mesh(topBox(0.76, 0.05, 0.66), [cellMat, labelMat]);
  labelled.position.y = 0.025;
  battery.add(labelled);
  battery.add(new THREE.Mesh(bake([part(2.46, 0.012, 0.05, 0, 0.006, -0.36), part(0.2, 0.01, 0.2, 0.55, 0.004, -0.45)]), darkPlastic));
  battery.position.set(0, DIM.floorH + 0.015, 0.56);
  anchor('battery', battery, 0.95, 0.05, 0.12);

  // mainboard
  const pcbTex = TX.pcbTexture();
  pcbTex.anisotropy = maxAniso;
  const pcbMat = new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.5, metalness: 0.15 });
  const pcbEdge = new THREE.MeshStandardMaterial({ color: 0x0f1a24, roughness: 0.6 });
  const pcb = new THREE.Mesh(topBox(2.86, 0.012, 1.02), [pcbEdge, pcbMat]);
  pcb.position.y = 0.006;
  board.add(pcb);
  // CPU package
  board.add(box(0.34, 0.014, 0.3, new THREE.MeshStandardMaterial({ color: 0x223328, roughness: 0.6 }), 0.1, 0.019, -0.05));
  // aluminium: CPU die, capacitors, and the I/O blocks on the left edge that line up with
  // the side ports (the board sits at z = -0.42, so board-local z = world z + 0.42)
  const capGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.04, 12);
  board.add(new THREE.Mesh(bake([
    part(0.2, 0.01, 0.13, 0.1, 0.031, -0.05),
    ...Array.from({ length: 8 }, (_, i) => [capGeo, [0.45 + (i % 4) * 0.06, 0.032, 0.2 + Math.floor(i / 4) * 0.06]]),
    part(0.2, 0.07, 0.18, -1.33, 0.047, 0.08),
    part(0.14, 0.03, 0.1, -1.35, 0.027, 0.37),
    part(0.14, 0.03, 0.1, -1.35, 0.027, 0.5),
    part(0.14, 0.045, 0.16, -1.35, 0.034, -0.2),
  ]), alumMat));
  // chokes
  const chokeMat = new THREE.MeshStandardMaterial({ color: 0x2a2f35, roughness: 0.4, metalness: 0.5 });
  const chokeGeo = new THREE.BoxGeometry(0.07, 0.035, 0.07);
  board.add(new THREE.Mesh(bake(Array.from({ length: 6 }, (_, i) => [chokeGeo, [-0.28 - (i % 3) * 0.1, 0.03, -0.3 + Math.floor(i / 3) * 0.1]])), chokeMat));
  // SO-DIMM slots and M.2 slot
  board.add(new THREE.Mesh(bake([part(0.72, 0.028, 0.05, -0.62, 0.02, -0.38), part(0.72, 0.028, 0.05, -0.62, 0.05, -0.38), part(0.06, 0.02, 0.24, 0.62, 0.016, 0.2)]), darkPlastic));
  board.position.set(0, DIM.floorH + 0.012, -0.42);

  // RAM sticks (stacked SO-DIMMs)
  const ramTex = TX.ramLabel();
  ramTex.anisotropy = maxAniso;
  const ramTop = new THREE.MeshStandardMaterial({ map: ramTex, roughness: 0.5, metalness: 0.1 });
  for (let i = 0; i < 2; i++) {
    const stick = new THREE.Mesh(topBox(0.7, 0.008, 0.3), [pcbEdge, ramTop]);
    stick.position.set(0, i * 0.03, 0);
    ram.add(stick);
  }
  ram.position.set(-0.62, DIM.floorH + 0.045, -0.62);
  anchor('ram', ram, -0.36, 0.04, 0.0);

  // SSD (M.2 2280)
  const ssdTexData = TX.ssdLabel('data');
  const ssdTexWiped = TX.ssdLabel('wiped');
  ssdTexData.anisotropy = ssdTexWiped.anisotropy = maxAniso;
  const ssdTop = new THREE.MeshStandardMaterial({ map: ssdTexData, roughness: 0.45, metalness: 0.1, emissive: new THREE.Color('#e8963a'), emissiveIntensity: 0 });
  const ssdEdge = new THREE.MeshStandardMaterial({ color: 0x10161c, roughness: 0.6, emissive: new THREE.Color('#e8963a'), emissiveIntensity: 0 });
  const ssdBoard = new THREE.Mesh(topBox(0.8, 0.01, 0.22), [ssdEdge, ssdTop]);
  ssd.add(ssdBoard);
  const ssdScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.012, 12), alumMat);
  ssdScrew.position.set(0.39, 0.006, 0);
  ssd.add(ssdScrew);
  ssd.position.set(0.98, DIM.floorH + 0.03, -0.22);
  const ssdHome = ssd.position.clone();
  anchor('ssd', ssd, 0.2, 0.02, 0.05);

  // cooling: blower fan + fins + heat pipe
  const fan = new THREE.Group();
  // own double-sided material (making the shared dark plastic double-sided affected every part using it)
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x14191f, roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide }));
  fan.add(housing);
  const topPlate = new THREE.Mesh(new THREE.RingGeometry(0.145, 0.3, 48), new THREE.MeshStandardMaterial({ color: 0x1b2229, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }));
  topPlate.rotation.x = -Math.PI / 2;
  topPlate.position.y = 0.025;
  fan.add(topPlate);
  const blades = new THREE.Group();
  const bladeGeo = new THREE.BoxGeometry(0.15, 0.036, 0.008);
  bladeGeo.translate(0.13, 0, 0);
  blades.add(new THREE.Mesh(bake(Array.from({ length: 15 }, (_, i) => [bladeGeo, [0, 0, 0], [0, (i / 15) * Math.PI * 2, 0]])), darkPlastic));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 24), new THREE.MeshStandardMaterial({ color: 0x2b3440, roughness: 0.35, metalness: 0.6 }));
  blades.add(hub);
  fan.add(blades);
  fan.position.set(0.95, 0.03, -0.52);
  cooling.add(fan);
  // copper: fins, heat pipe and CPU plate
  const finGeo = new THREE.BoxGeometry(0.006, 0.05, 0.2);
  const pipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.05, 0.03, -0.4),
    new THREE.Vector3(0.25, 0.034, -0.46),
    new THREE.Vector3(0.55, 0.036, -0.76),
    new THREE.Vector3(0.95, 0.036, -0.86),
    new THREE.Vector3(1.28, 0.036, -0.86),
  ]);
  cooling.add(new THREE.Mesh(bake([
    ...Array.from({ length: 26 }, (_, i) => [finGeo, [0.66 + i * 0.023, 0.03, -0.9]]),
    [new THREE.TubeGeometry(pipeCurve, 60, 0.024, 12)],
    part(0.26, 0.012, 0.22, 0.1, 0.03, -0.47),
  ]), copperMat));
  cooling.position.set(0, DIM.floorH + 0.012, 0);
  anchor('fan', cooling, 0.95, 0.07, -0.52);

  // ---- top case (palm rest + keyboard + trackpad) ----
  const topCase = new THREE.Group();
  topCase.position.y = DIM.trayH;
  root.add(topCase);
  topCase.add(new THREE.Mesh(slab(W, D, DIM.topH, r, 0.016), shellMat));
  const T = DIM.topH; // local top surface of the case
  // everything on the keyboard side: hidden while the lid is shut
  const topFace = new THREE.Group();
  topCase.add(topFace);

  // keyboard well + trackpad rim (same material, one mesh)
  const kb = { x0: -1.425, z0: -0.93 };
  const U = 0.19;
  const GAP = 0.034;
  const kbDepth = U * 5.5;
  topFace.add(new THREE.Mesh(bake([
    [flatRoundRect(15 * U + 0.07, kbDepth + 0.07, 0.035), [0, T + 0.0006, kb.z0 + kbDepth / 2]],
    [flatRoundRect(1.23, 0.77, 0.05), [0, T + 0.0005, 0.6]],
  ]), deckMat));

  // keys (instanced, one InstancedMesh per cap size)
  const keyRecords = [];
  const bySize = new Map();
  let zc = kb.z0;
  const legends = [];
  for (const row of ROWS) {
    const pitchD = row.h * U;
    let xc = kb.x0;
    for (const [label, wUnits, sub] of row.keys) {
      const capW = +(wUnits * U - GAP).toFixed(3);
      const capD = +(pitchD - GAP).toFixed(3);
      const cx = xc + (wUnits * U) / 2;
      const cz = zc + pitchD / 2;
      const k = `${capW}x${capD}`;
      if (!bySize.has(k)) bySize.set(k, { capW, capD, list: [] });
      bySize.get(k).list.push({ x: cx, z: cz });
      legends.push({ x: cx, z: cz, w: capW, d: capD, label, sub, fn: !!row.fn });
      xc += wUnits * U;
    }
    zc += pitchD;
  }
  const keyY = T + 0.004;
  const tmpM = new THREE.Matrix4();
  for (const { capW, capD, list } of bySize.values()) {
    const rounded = new THREE.RoundedBoxGeometry(capW, DIM.keyH, capD, 2, Math.min(0.014, capD / 3));
    const mesh = new THREE.InstancedMesh(rounded, keyMat, list.length);
    list.forEach((p, i) => {
      tmpM.makeTranslation(p.x, keyY, p.z);
      mesh.setMatrixAt(i, tmpM);
      keyRecords.push({ mesh, i, x: p.x, z: p.z });
    });
    mesh.instanceMatrix.needsUpdate = true;
    topFace.add(mesh);
  }
  const legendTex = TX.keyLegendTexture(legends, { x0: kb.x0, z0: kb.z0, w: 15 * U, d: kbDepth }, mobile ? 0.62 : 1);
  legendTex.anisotropy = maxAniso;
  const legendPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(15 * U, kbDepth),
    new THREE.MeshBasicMaterial({ map: legendTex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.9 })
  );
  legendPlane.rotation.x = -Math.PI / 2;
  legendPlane.position.set(0, keyY + DIM.keyH / 2 + 0.0008, kb.z0 + kbDepth / 2);
  topFace.add(legendPlane);
  anchor('keys', topCase, 1.25, T + 0.02, -0.5);

  // trackpad
  const pad = new THREE.Mesh(flatRoundRect(1.2, 0.74, 0.045), padMat);
  pad.position.set(0, T + 0.0011, 0.6);
  topFace.add(pad);
  anchor('trackpad', topCase, 0.6, T + 0.01, 0.6);
  anchor('casing', topCase, 1.42, T + 0.005, 0.98);

  // palm-rest grime (cleaned in stage 5 along with the lid)
  const palmGrime = new THREE.Mesh(flatRoundRect(W - 0.12, 0.95, 0.13), grimeMaterial(TX.grimeTexture(1024, 320, 44), 0.55));
  palmGrime.position.set(0, T + 0.0016, 0.6);
  topFace.add(palmGrime);

  // hinge barrel
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 2.3, 28), darkPlastic);
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, DIM.baseTop - 0.006, -D / 2 + 0.04);
  root.add(hinge);
  anchor('hinge', root, 1.05, DIM.baseTop + 0.02, -D / 2 + 0.02);

  // ---- lid ----
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, DIM.pivotY, -D / 2);
  root.add(lidPivot);
  const lid = new THREE.Group();
  lidPivot.add(lid);
  const lidGeo = slab(W, D, DIM.lidT, r, 0.02);
  lidGeo.rotateX(Math.PI / 2);
  lidGeo.translate(0, D / 2, -DIM.lidT);
  lid.add(new THREE.Mesh(lidGeo, shellMat));

  // inner face: bezel, display, glass (hidden while the lid is shut)
  const screenFace = new THREE.Group();
  lid.add(screenFace);
  const bezelGeo = new THREE.ShapeGeometry(roundedRectShape(W - 0.05, D - 0.05, r - 0.03), 16);
  const bezel = new THREE.Mesh(bezelGeo, bezelMat);
  bezel.position.set(0, D / 2, 0.0012);
  screenFace.add(bezel);
  const displayMat = new THREE.MeshBasicMaterial({ map: screen.texture, toneMapped: false });
  const display = new THREE.Mesh(new THREE.PlaneGeometry(DIM.displayW, DIM.displayH), displayMat);
  display.position.set(0, DIM.displayY, 0.0022);
  screenFace.add(display);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    roughness: 0.07,
    metalness: 0,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    envMapIntensity: 0.5,
  });
  // rounded like the bezel: square corners would stick out past the lid's rounded ones
  const glass = new THREE.Mesh(roundPlane(W - 0.07, D - 0.07, r - 0.04), glassMat);
  glass.position.set(0, D / 2, 0.0032);
  screenFace.add(glass);
  const cam = new THREE.Mesh(new THREE.CircleGeometry(0.016, 20), new THREE.MeshStandardMaterial({ color: 0x0d1a26, roughness: 0.1, metalness: 0.4 }));
  cam.position.set(0, D - 0.055, 0.0026);
  screenFace.add(cam);
  const screenCenter = new THREE.Object3D();
  screenCenter.position.set(0, DIM.displayY, 0.0022);
  lid.add(screenCenter);
  // on the top bezel strip, so the dot never covers text on the screen
  anchor('display', lid, -1.2, (DIM.displayY + DIM.displayH / 2 + D) / 2, 0.01);

  // outer face: grime, previous owner's sticker, Reform asset tag
  const outerZ = -DIM.lidT - 0.0009;
  const lidGrime = new THREE.Mesh(roundPlane(W - 0.07, D - 0.07, r - 0.04), grimeMaterial(TX.grimeTexture(), 0.85));
  lidGrime.position.set(0, D / 2, outerZ);
  lidGrime.rotation.x = Math.PI;
  lid.add(lidGrime);

  const sw = 0.62, sh = 0.29;
  const stickerGroup = new THREE.Group();
  stickerGroup.position.set(-0.78, 1.5, outerZ - 0.0012);
  stickerGroup.rotation.x = Math.PI;
  lid.add(stickerGroup);
  const peel = new THREE.Group();
  peel.position.x = -sw / 2;
  stickerGroup.add(peel);
  const stickerMat = new THREE.MeshStandardMaterial({ map: TX.oldStickerTexture(), roughness: 0.6, transparent: true, side: THREE.DoubleSide });
  const sticker = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), stickerMat);
  sticker.position.x = sw / 2;
  peel.add(sticker);
  anchor('sticker', stickerGroup, -0.1, -0.1, 0);

  const [tagCanvas, tagCtx] = TX.makeCanvas(512, 256);
  TX.drawAssetTag(tagCtx, 512, 256, {});
  const tagTex = TX.toTexture(tagCanvas);
  tagTex.anisotropy = maxAniso;
  const tagMat = new THREE.MeshStandardMaterial({ map: tagTex, roughness: 0.5, transparent: true });
  const tagGroup = new THREE.Group();
  tagGroup.position.set(0.8, 1.52, outerZ - 0.0014);
  tagGroup.rotation.x = Math.PI;
  lid.add(tagGroup);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.33), tagMat);
  tagGroup.add(tag);
  anchor('tag', tagGroup, 0.2, 0.08, 0);
  anchor('lidCorner', lid, 1.3, 0.55, -DIM.lidT);

  // ---- cleaning brush + dust ----
  const brush = new THREE.Group();
  brush.visible = false;
  root.add(brush);
  const brushBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.014, D * 1.02),
    new THREE.MeshBasicMaterial({ color: 0xffb25a, toneMapped: false })
  );
  brush.add(brushBar);
  const glowTex = TX.radialTexture(null, null, 256, [[0, 'rgba(255,170,80,0.85)'], [0.35, 'rgba(232,150,58,0.28)'], [1, 'rgba(232,150,58,0)']]);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, D * 1.25),
    new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -0.02;
  brush.add(glow);

  const DUST = 180;
  const dustGeo = new THREE.BufferGeometry();
  const origin = new Float32Array(DUST * 3);
  const rand = new Float32Array(DUST);
  const dr = TX.rng(9);
  for (let i = 0; i < DUST; i++) {
    origin[i * 3] = (dr() - 0.5) * (W - 0.1);
    origin[i * 3 + 1] = 0;
    origin[i * 3 + 2] = (dr() - 0.5) * (D - 0.1);
    rand[i] = dr();
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(origin, 3));
  dustGeo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
  const dustMat = new THREE.ShaderMaterial({
    uniforms: { uBrush: { value: -10 }, uHalfW: { value: W / 2 }, uScale: { value: 11 * Math.min(window.devicePixelRatio || 1, 2) } },
    vertexShader: /* glsl */ `
      attribute float aRand;
      uniform float uBrush;
      uniform float uHalfW;
      uniform float uScale;
      varying float vA;
      void main() {
        float u = (position.x + uHalfW) / (2.0 * uHalfW);
        float age = (uBrush - u) * 3.2 - aRand * 0.25;
        vec3 p = position;
        float a = clamp(age, 0.0, 1.0);
        p.y += a * (0.25 + aRand * 0.45);
        p.x += a * (0.12 + aRand * 0.2);
        p.z += sin(aRand * 40.0 + a * 6.0) * 0.05 * a;
        vA = (age > 0.0 && age < 1.0) ? (1.0 - a) * smoothstep(0.0, 0.08, a) : 0.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.5 + aRand * 3.0) * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5 || vA <= 0.0) discard;
        gl_FragColor = vec4(0.93, 0.9, 0.82, vA * (1.0 - d * 2.0) * 0.9);
      }`,
    transparent: true,
    depthWrite: false,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  root.add(dust);

  // ---- contact shadow (lives in world space, follows the laptop) ----
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 1.45, D * 1.6),
    new THREE.MeshBasicMaterial({ map: TX.shadowTexture(), transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false, color: 0x1b2b3b })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.renderOrder = -1;

  // SSD presentation pose (root-local) for the data-wipe close-up
  const ssdShow = { pos: new THREE.Vector3(0.35, 0.95, 1.05), rot: new THREE.Euler(1.05, 0.35, -0.08) };

  // explode layer offsets and stagger windows
  // A "staircase" explode: each layer rises and steps back, so from a front
  // three-quarter camera nothing hides the layer below it.
  const EXPLODE = {
    topCase: { dy: 1.95, dz: -0.75, win: [0.0, 0.55] },
    lid: { dy: 2.05, dz: -1.15, win: [0.0, 0.55] },
    cooling: { dy: 1.2, dz: -0.2, win: [0.2, 0.8] },
    ram: { dy: 1.12, dz: -0.1, win: [0.25, 0.85] },
    ssd: { dy: 1.05, dz: 0.05, win: [0.25, 0.85] },
    board: { dy: 0.62, dz: -0.05, win: [0.3, 0.95] },
    battery: { dy: 0.26, dz: 0.3, win: [0.35, 1.0] },
  };
  const homes = {
    topCase: topCase.position.clone(),
    lid: lidPivot.position.clone(),
    cooling: cooling.position.clone(),
    ram: ram.position.clone(),
    board: board.position.clone(),
    battery: battery.position.clone(),
  };

  let lastWave = -1;
  let lastGrade = -1;
  let ssdWiped = false;

  // Apply the story state to the model. Called every frame.
  function apply(S, dt) {
    // lid
    const closed = Math.PI / 2;
    lidPivot.rotation.x = closed - S.lid * (closed + (LID_OPEN - Math.PI / 2));

    // explode
    const e = S.explode;
    const lay = (name) => smooth(EXPLODE[name].win[0], EXPLODE[name].win[1], e);
    const place = (obj, name, key = name) => {
      const k = lay(name);
      obj.position.y = homes[key].y + EXPLODE[name].dy * k;
      obj.position.z = homes[key].z + (EXPLODE[name].dz || 0) * k;
    };
    place(topCase, 'topCase');
    place(lidPivot, 'lid');
    place(cooling, 'cooling');
    place(ram, 'ram');
    place(board, 'board');
    place(battery, 'battery');
    // internals are only visible while the case is open
    const open = e > 0.002 || S.ssdOut > 0.002;
    battery.visible = board.visible = ram.visible = cooling.visible = open;
    ssd.visible = cavity.visible = bosses.visible = open;
    // keyboard side and screen side can't be seen while the lid is shut
    topFace.visible = screenFace.visible = S.lid > 0.002 || e > 0.002;

    // SSD: exploded position, or lifted out for the wipe close-up
    const sy = ssdHome.y + EXPLODE.ssd.dy * lay('ssd');
    const sz = ssdHome.z + EXPLODE.ssd.dz * lay('ssd');
    const so = smooth(0, 1, S.ssdOut);
    ssd.position.set(
      THREE.MathUtils.lerp(ssdHome.x, ssdShow.pos.x, so),
      THREE.MathUtils.lerp(sy, ssdShow.pos.y, so),
      THREE.MathUtils.lerp(sz, ssdShow.pos.z, so)
    );
    ssd.rotation.set(ssdShow.rot.x * so, ssdShow.rot.y * so, ssdShow.rot.z * so);
    const s = 1 + so * 0.9;
    ssd.scale.setScalar(s);
    ssdEdge.emissiveIntensity = S.ssdGlow * 0.9;
    ssdTop.emissiveIntensity = S.ssdGlow * 0.08;
    const wiped = S.ssdWiped > 0.5;
    if (wiped !== ssdWiped) {
      ssdWiped = wiped;
      ssdTop.map = wiped ? ssdTexWiped : ssdTexData;
      ssdTop.needsUpdate = true;
    }

    // fan + keyboard ripple
    blades.rotation.y -= dt * S.fan * 38;
    if (Math.abs(S.keysWave - lastWave) > 0.001) {
      lastWave = S.keysWave;
      const front = THREE.MathUtils.lerp(-1.9, 1.9, S.keysWave);
      const active = S.keysWave > 0.001 && S.keysWave < 0.999;
      const touched = new Set();
      for (const k of keyRecords) {
        const press = active ? Math.exp(-Math.pow((k.x - front) / 0.16, 2)) : 0;
        tmpM.makeTranslation(k.x, keyY - press * 0.007, k.z);
        k.mesh.setMatrixAt(k.i, tmpM);
        touched.add(k.mesh);
      }
      touched.forEach((m) => (m.instanceMatrix.needsUpdate = true));
    }

    // scan line
    scanUniforms.uScan.value = S.scan;
    scanUniforms.uScanOn.value = S.scanOn;

    // cleaning pass
    const bu = THREE.MathUtils.lerp(-0.08, 1.08, S.clean);
    grimeUniforms.uWipe.value = S.clean <= 0 ? -0.2 : S.clean >= 1 ? 1.3 : bu;
    brush.visible = S.clean > 0.001 && S.clean < 0.999;
    brush.position.set(bu * W - W / 2, DIM.pivotY + DIM.lidT + 0.045, 0);
    dustMat.uniforms.uBrush.value = S.clean > 0.001 ? bu : -10;
    dust.position.y = DIM.pivotY + DIM.lidT + 0.004;
    dust.visible = S.clean > 0.001 && S.clean < 0.999;

    // previous owner's sticker peels off as the brush passes it
    const stickerU = (-0.78 - sw / 2 + W / 2) / W;
    const pl = smooth(stickerU - 0.02, stickerU + 0.16, bu) * (S.clean > 0 ? 1 : 0);
    peel.rotation.y = -pl * 2.3;
    peel.position.z = pl * 0.18;
    stickerMat.opacity = 1 - smooth(0.55, 1, pl);
    sticker.visible = stickerMat.opacity > 0.01;

    // asset tag slap + grade stamp
    const tg = clamp01(S.tag);
    tag.visible = tg > 0.001;
    tagMat.opacity = Math.min(1, tg * 3);
    const tb = easeOutBack(tg);
    tagGroup.scale.setScalar(THREE.MathUtils.lerp(1.5, 1, tb));
    tag.position.z = (1 - tg) * 0.25;
    const gq = Math.round(S.grade * 24) / 24;
    if (gq !== lastGrade) {
      lastGrade = gq;
      TX.drawAssetTag(tagCtx, 512, 256, { grade: gq > 0 ? 'A' : null, stamp: gq });
      tagTex.needsUpdate = true;
    }

    // screen glass reflection fades for the dive so the colour is exact
    glassMat.opacity = S.glass;
    glass.visible = S.glass > 0.01;
  }

  return {
    root,
    shadow,
    anchors,
    screenCenter,
    lidPivot,
    apply,
    parts: { topCase, tray, battery, board, ram, ssd, cooling, lid },
  };
}
