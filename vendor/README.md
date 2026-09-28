# Vendored libraries

| File | Version | Licence |
| --- | --- | --- |
| `three.min.js` | three.js r186, **trimmed** | MIT |
| `gsap.min.js`, `ScrollTrigger.min.js`, `SplitText.min.js`, `DrawSVGPlugin.min.js` | GSAP 3.15 | GSAP Standard "no charge" licence |
| `lenis.min.js` | Lenis 1.3 | MIT |

## About `three.min.js`

To keep the download small, `three.min.js` contains only the three.js classes this site uses
(about 150 KB gzipped instead of 190 KB). If you add code that needs another class, rebuild it:

```bash
npm install three@0.186 esbuild
npx esbuild three-lite.js --bundle --format=esm --minify --outfile=vendor/three.min.js
```

with `three-lite.js` containing:

```js
export {
  WebGLRenderer, Scene, PerspectiveCamera, PMREMGenerator, Object3D, Group, Mesh, InstancedMesh, Points,
  BufferGeometry, BufferAttribute, BoxGeometry, CylinderGeometry, CapsuleGeometry, PlaneGeometry, CircleGeometry,
  RingGeometry, ShapeGeometry, ExtrudeGeometry, TubeGeometry, Shape, CatmullRomCurve3,
  MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, ShaderMaterial, CanvasTexture,
  DirectionalLight, HemisphereLight, Color, Vector2, Vector3, Matrix4, Euler, Quaternion, Box3, MathUtils,
  DoubleSide, AdditiveBlending, SRGBColorSpace, ACESFilmicToneMapping,
  // add new names here
} from 'three';
export { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
export { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
```
