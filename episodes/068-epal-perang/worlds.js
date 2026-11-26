// Episode 068 sets:
//  - the Episode 038 kitchen: Mama cuts a red apple on the board with the knife;
//    a plate of apple slices in front of Affan whose white flesh turns brown;
//    later Mama squeezes a lime over two slices on the board (they stay white);
//  - the cell lab: apple cells (a wall around each, with a cute little purple
//    enzyme "helper" inside); a big knife cuts through, the cut cells break open,
//    oxygen pairs drift down from the air, meet the enzymes and brown spots grow;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { add, glow } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildKitchen, ISLAND_TOP, BOARD, AFF_POS, MAMA_POS } from '../038-bawang-menangis/worlds.js';

export { buildOutro, ISLAND_TOP, BOARD, AFF_POS, MAMA_POS };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

function gradientSky(top, bot) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, bot: { value: new THREE.Color(bot) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, bot; varying vec3 vP;
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.4, 0.7, vP.y)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}

export const FLESH = new THREE.Color(0xfff4d6);
export const BROWN = new THREE.Color(0xb87a3a);
const skinMat = std(0xe0302a, 0.35, { emissive: 0x400808, emissiveIntensity: 0.15 });
// a whole apple
export function makeApple(s = 1) {
  const g = new THREE.Group();
  add(g, new THREE.SphereGeometry(0.5, 32, 24), skinMat, [0, 0.45, 0], [0, 0, 0], [1, 0.92, 1]);
  add(g, new THREE.CylinderGeometry(0.025, 0.03, 0.2, 8), std(0x5a3a22, 0.7), [0, 0.95, 0], [0, 0, 0.2], [1, 1, 1], false);
  add(g, new THREE.SphereGeometry(0.12, 12, 8), std(0x4fae4a, 0.6), [0.1, 0.98, 0], [0, 0, 0.6], [1.4, 0.25, 0.7], false);
  g.scale.setScalar(s);
  return g;
}
// an apple slice lying flat: a half-moon of white flesh with a red skin edge
export function makeSlice(s = 1) {
  const g = new THREE.Group();
  const flesh = std(FLESH.getHex(), 0.65);
  const sh = new THREE.Shape();
  sh.absarc(0, 0, 0.5, 0, Math.PI, false);
  sh.lineTo(0.5, 0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 24 });
  geo.translate(0, 0, -0.08);
  add(g, geo, flesh, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  add(g, new THREE.CylinderGeometry(0.525, 0.525, 0.18, 32, 1, true, -Math.PI / 2, Math.PI), skinMat, [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  for (const x of [-0.08, 0.08]) add(g, new THREE.SphereGeometry(0.035, 8, 6), std(0x3a2414, 0.5), [x, 0.12, 0.1], [0, 0, 0], [0.7, 1.4, 0.6], false);
  g.scale.setScalar(s);
  g.userData.flesh = flesh;
  return g;
}

// ---------------------------------------------------------------- kitchen
export const PLATE_AT = V3(1.25, ISLAND_TOP, -0.72);
export function buildKitchen68() {
  const k = buildKitchen();
  for (const o of [k.onion, k.coldOnion, ...(k.pieces || []), ...(k.tears || [])]) if (o) o.visible = false;
  const s = k.scene;
  const rf = new THREE.DirectionalLight(0xfff2e6, 1.0);
  rf.position.set(-0.5, 3.0, -4.0);
  rf.target.position.set(1.75, 1.4, -0.35);
  s.add(rf, rf.target);
  // the apple on the board: whole, then two halves after the cut
  const apple = makeApple(0.36);
  apple.position.set(BOARD.x - 0.15, ISLAND_TOP + 0.07, BOARD.z + 0.02);
  s.add(apple);
  const halves = [-1, 1].map((sd) => {
    const h = new THREE.Group();
    add(h, new THREE.SphereGeometry(0.18, 24, 16, 0, Math.PI), skinMat, [0, 0, 0], [0, sd > 0 ? 0 : Math.PI, 0], [1, 0.92, 1], false);
    const face = add(h, new THREE.CircleGeometry(0.18, 24), std(FLESH.getHex(), 0.65, { side: THREE.DoubleSide }), [0, 0, 0], [0, sd > 0 ? -Math.PI / 2 : Math.PI / 2, 0], [1, 0.92, 1], false);
    h.userData.face = face;
    h.position.set(BOARD.x - 0.15 + sd * 0.08, ISLAND_TOP + 0.2, BOARD.z + 0.02);
    h.visible = false;
    s.add(h);
    return h;
  });
  // slices on the board for the lime demo (two plain, two with lime)
  const R = rng(68);
  const boardSlices = [0, 1, 2, 3].map((i) => {
    const sl = makeSlice(0.24);
    sl.position.set(BOARD.x - 0.45 + i * 0.28 + (i > 1 ? 0.12 : 0), ISLAND_TOP + 0.075, BOARD.z + 0.12);
    sl.rotation.set(-Math.PI / 2, 0, 0.3 + R() * 0.3);
    sl.visible = false;
    s.add(sl);
    return sl;
  });
  // a lime half in Mama's hand, and drops of juice
  const lime = new THREE.Group();
  add(lime, new THREE.SphereGeometry(0.1, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), std(0x6ac83a, 0.5), [0, 0, 0], [Math.PI, 0, 0], [1, 0.9, 1], false);
  add(lime, new THREE.CircleGeometry(0.095, 20), std(0xd8f070, 0.5, { side: THREE.DoubleSide }), [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  s.add(lime);
  lime.visible = false;
  const juice = [0, 1, 2, 3, 4].map(() => {
    const d = add(s, new THREE.SphereGeometry(0.018, 8, 6), std(0xe8ff90, 0.1, { transparent: true, opacity: 0.85 }), [0, 0, 0], [0, 0, 0], [1, 1.5, 1], false);
    d.visible = false;
    return d;
  });
  // the plate of slices in front of Affan
  const plate = new THREE.Group();
  plate.position.copy(PLATE_AT);
  s.add(plate);
  add(plate, new THREE.CylinderGeometry(0.26, 0.2, 0.03, 32), std(0xffffff, 0.3), [0, 0.015, 0]);
  const slices = [0, 1, 2, 3, 4].map((i) => {
    const sl = makeSlice(0.24);
    const a = (i / 5) * Math.PI * 2;
    sl.position.set(Math.cos(a) * 0.12, 0.06, Math.sin(a) * 0.12);
    sl.rotation.set(-Math.PI / 2, 0, a);
    plate.add(sl);
    return sl;
  });
  const snack = makeSlice(0.24);
  s.add(snack);
  snack.visible = false;
  return { ...k, apple, halves, boardSlices, lime, juice, plate, slices, snack };
}

// ------------------------------------------------------------- cell lab
export const CELL_AT = V3(0, 0, 0);
export function buildCellLab() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfff6e6);
  const sky = gradientSky(0xcfe8ff, 0xfff8ec);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe8d8c0, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(4, 9, 10);
  scene.add(key);
  const R = rng(681);
  // apple skin strip on top, then a grid of cells
  const COLS = 5, ROWS = 6, CW = 1.45, CH = 1.15;
  const x0 = -((COLS - 1) * CW) / 2;
  add(scene, new RoundedBoxGeometry(COLS * CW + 0.4, 0.45, 1.4, 3, 0.15), std(0xd8302a, 0.4), [0, ROWS * CH + 0.15, 0]);
  const cells = [];
  const enzymeMat = std(0x8a5cf0, 0.4, { emissive: 0x2a1a70, emissiveIntensity: 0.25 });
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const g = new THREE.Group();
      g.position.set(x0 + c * CW, r * CH + CH / 2, 0);
      scene.add(g);
      const wallMat = std(0xe8d8a0, 0.5, { transparent: true, opacity: 0.9 });
      const wall = add(g, new RoundedBoxGeometry(CW - 0.08, CH - 0.08, 1.0, 3, 0.18), wallMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
      const insideMat = std(FLESH.getHex(), 0.7, { transparent: true, opacity: 0.95 });
      const inside = add(g, new RoundedBoxGeometry(CW - 0.24, CH - 0.24, 1.02, 3, 0.14), insideMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
      // the enzyme helper: a little purple blob with eyes and a smile
      const enz = new THREE.Group();
      enz.position.set((R() - 0.5) * 0.4, (R() - 0.5) * 0.25, 0.55);
      g.add(enz);
      add(enz, new THREE.SphereGeometry(0.17, 16, 12), enzymeMat, [0, 0, 0], [0, 0, 0], [1.15, 1, 0.8], false);
      for (const sd of [-1, 1]) {
        add(enz, new THREE.SphereGeometry(0.045, 10, 8), std(0xffffff, 0.3), [sd * 0.06, 0.04, 0.12], [0, 0, 0], [1, 1, 1], false);
        add(enz, new THREE.SphereGeometry(0.022, 8, 6), std(0x101010, 0.3), [sd * 0.06, 0.04, 0.16], [0, 0, 0], [1, 1, 1], false);
      }
      add(enz, new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), std(0x2a1040, 0.4), [0, -0.05, 0.13], [0, 0, Math.PI], [1, 1, 1], false);
      const brown = add(g, new THREE.CircleGeometry(0.42, 20), std(BROWN.getHex(), 0.8, { transparent: true, opacity: 0 }), [0, 0, 0.52], [0, 0, 0], [1, 0.8, 1], false);
      cells.push({ g, wall, inside, enz, brown, r, c, home: enz.position.clone(), seed: R() * 10, cut: c === 2 || c === 1 });
    }
  }
  // the big knife (blade vertical, coming down through columns 1-2)
  const knife = new THREE.Group();
  scene.add(knife);
  add(knife, new THREE.BoxGeometry(1.5, 5.0, 0.1), std(0xdfe4ec, 0.15, { metalness: 0.7, transparent: true, opacity: 0.85 }), [0, 0, 0.8]);
  add(knife, new RoundedBoxGeometry(0.6, 1.6, 0.5, 2, 0.1), std(0x3a2a20, 0.6), [0, 3.2, 0.8]);
  knife.visible = false;
  // oxygen pairs (two red balls) that drift down from the air above
  const oMat = std(0x4aa8ff, 0.3, { emissive: 0x0a3a80, emissiveIntensity: 0.25 });
  const oxy = [];
  for (let i = 0; i < 10; i++) {
    const g = new THREE.Group();
    add(g, new THREE.SphereGeometry(0.16, 14, 10), oMat, [-0.13, 0, 0], [0, 0, 0], [1, 1, 1], false);
    add(g, new THREE.SphereGeometry(0.16, 14, 10), oMat, [0.13, 0, 0], [0, 0, 0], [1, 1, 1], false);
    g.userData = { seed: R() * 10, target: null };
    g.visible = false;
    scene.add(g);
    oxy.push(g);
  }
  return { scene, sky, cells, knife, oxy, COLS, ROWS, CW, CH, x0 };
}
