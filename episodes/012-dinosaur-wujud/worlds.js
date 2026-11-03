// Episode 012 sets: Affan's bedroom on a sunny afternoon (real world), the
// prehistoric valley imagination world with cartoon dinosaurs, the fossil dig
// site where the skeleton is pieced together, and the branded outro stage.
// All dinosaurs, props and bones are original and procedural.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, clamp, lerp } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeSky, glow } from '../../shared/props.js';

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const BALL = new THREE.SphereGeometry(1, 22, 16);

function shadowCfg(light, size, map = 2048) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  const c = light.shadow.camera;
  c.left = -size;
  c.right = size;
  c.top = size;
  c.bottom = -size;
  c.near = 0.5;
  c.far = 160;
  light.shadow.bias = -0.0005;
  light.shadow.normalBias = 0.02;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Cubic Bezier point into `out`.
function bez(p0, p1, p2, p3, k, out) {
  const u = 1 - k;
  return out.set(
    u * u * u * p0.x + 3 * u * u * k * p1.x + 3 * u * k * k * p2.x + k * k * k * p3.x,
    u * u * u * p0.y + 3 * u * u * k * p1.y + 3 * u * k * k * p2.y + k * k * k * p3.y,
    u * u * u * p0.z + 3 * u * u * k * p1.z + 3 * u * k * k * p2.z + k * k * k * p3.z,
  );
}

// A smooth "noodle" (neck / tail) made of overlapping spheres placed along a
// Bezier curve every frame. r0 -> r1 is the radius from start to end.
function makeChain(parent, mat, n, r0, r1) {
  const balls = [];
  for (let i = 0; i < n; i++) {
    const m = add(parent, BALL, mat);
    const k = i / (n - 1);
    m.userData.r = lerp(r0, r1, Math.pow(k, 0.9));
    m.scale.setScalar(m.userData.r);
    balls.push(m);
  }
  const tmp = V(0, 0, 0);
  return {
    balls,
    set(p0, p1, p2, p3) {
      balls.forEach((b, i) => {
        bez(p0, p1, p2, p3, i / (balls.length - 1), tmp);
        b.position.copy(tmp);
      });
      return tmp;
    },
  };
}

// Big friendly cartoon eye (white, pupil, shine) facing +z.
function makeEye(parent, pos, r, side) {
  const e = new THREE.Group();
  e.position.copy(pos);
  parent.add(e);
  add(e, BALL, std(0xffffff, 0.3, { emissive: 0xffffff, emissiveIntensity: 0.12 }), [0, 0, 0], [0, 0, 0], [r, r * 1.08, r * 0.9], false);
  const pupil = add(e, BALL, std(0x15151d, 0.25), [0.12 * r * side, 0.05 * r, 0.62 * r], [0, 0, 0], [r * 0.55, r * 0.62, r * 0.4], false);
  add(e, BALL, new THREE.MeshBasicMaterial({ color: 0xffffff }), [0.3 * r * side, 0.3 * r, 0.9 * r], [0, 0, 0], [r * 0.17, r * 0.17, r * 0.12], false);
  const lid = add(e, new THREE.SphereGeometry(1.15, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0x888888), [0, 0, 0], [-1.6, 0, 0], [r, r * 1.08, r * 0.9], false);
  return { e, pupil, lid };
}

// ------------------------------------------------------------- long-neck
// Cartoon sauropod ("dinosaur leher panjang"): round body, four pillar legs,
// a long bendy neck and tail, big eyes and a smile. Faces +z.
// ~7.5 units tall to the top of the head at scale 1.
export function makeSauropod({ skin = 0x4fb87a, belly = 0xc9edb0, spots = 0x2f8a5a } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const M = std(skin, 0.62, { emissive: skin, emissiveIntensity: 0.06 });
  const B = std(belly, 0.7);
  const S = std(spots, 0.62);
  add(body, BALL, M, [0, 2.75, 0], [0, 0, 0], [1.55, 1.4, 2.4]);
  add(body, BALL, B, [0, 2.35, 0.15], [0, 0, 0], [1.38, 1.1, 2.2]);
  [[0.7, 3.95, 0.6, 0.45], [-0.55, 4.0, -0.4, 0.38], [0.2, 4.1, -1.2, 0.32], [-0.8, 3.6, 0.9, 0.3], [0.95, 3.5, -0.9, 0.34]].forEach(([x, y, z, r]) => add(body, BALL, S, [x, y, z], [0, 0, 0], [r, r * 0.35, r]));
  const legs = [];
  for (const [x, z] of [[0.95, 1.35], [-0.95, 1.35], [0.95, -1.35], [-0.95, -1.35]]) {
    const hip = new THREE.Group();
    hip.position.set(x, 2.4, z);
    body.add(hip);
    add(hip, new THREE.CylinderGeometry(0.5, 0.55, 2.3, 18), M, [0, -1.15, 0]);
    add(hip, BALL, M, [0, -2.25, 0.02], [0, 0, 0], [0.6, 0.22, 0.66]);
    for (const tx of [-0.25, 0, 0.25]) add(hip, BALL, std(0xfff6e0, 0.4), [tx, -2.3, 0.55], [0, 0, 0], [0.13, 0.11, 0.1], false);
    legs.push(hip);
  }
  const neck = makeChain(body, M, 22, 0.82, 0.36);
  const tail = makeChain(body, M, 24, 0.9, 0.1);
  const head = new THREE.Group();
  body.add(head);
  add(head, BALL, M, [0, 0, 0.15], [0, 0, 0], [0.62, 0.55, 0.8]);
  add(head, BALL, M, [0, -0.12, 0.62], [0, 0, 0], [0.5, 0.38, 0.5]);
  add(head, BALL, std(0x1d3a2a, 0.5), [0.14, 0.05, 1.07], [0, 0, 0], [0.05, 0.04, 0.03], false);
  add(head, BALL, std(0x1d3a2a, 0.5), [-0.14, 0.05, 1.07], [0, 0, 0], [0.05, 0.04, 0.03], false);
  const smile = add(head, new THREE.TorusGeometry(0.3, 0.04, 8, 20, Math.PI * 0.8), std(0x1d3a2a, 0.5), [0, -0.22, 0.86], [0, 0, Math.PI + Math.PI * 0.1], [1, 0.8, 1], false);
  const eyes = [-1, 1].map((s) => makeEye(head, V(0.42 * s, 0.25, 0.42), 0.24, s));
  eyes.forEach((e) => (e.lid.material = M));
  const cheeks = [-1, 1].map((s) => add(head, BALL, std(0xff9aa0, 0.6, { transparent: true, opacity: 0.6 }), [0.45 * s, -0.12, 0.55], [0, 0, 0], [0.13, 0.08, 0.06], false));
  void cheeks;
  const P = [V(0, 0, 0), V(0, 0, 0), V(0, 0, 0), V(0, 0, 0)];
  root.userData = {
    head, eyes, smile,
    // walk: phase speed (0 = standing), lift: neck height 0..1, sway/tsway: side bend
    update(t, { walk = 0, lift = 1, sway = 0, tsway = 0, nod = 0, blink = 0, look = 0 } = {}) {
      const ph = t * 3.2;
      legs.forEach((l, i) => (l.rotation.x = walk * 0.32 * Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI))));
      body.position.y = walk * 0.06 * Math.abs(Math.sin(ph));
      const sw = sway + 0.12 * Math.sin(t * 0.9);
      P[0].set(0, 3.15, 1.8);
      P[1].set(0, 4.4, 2.9);
      P[2].set(sw * 0.6, lerp(5.0, 6.7, lift), lerp(4.0, 3.2, lift));
      P[3].set(sw, lerp(5.2, 7.3, lift) + 0.08 * Math.sin(t * 1.3), lerp(4.8, 3.9, lift));
      const end = neck.set(...P);
      head.position.copy(end);
      head.rotation.set(0.15 + nod + 0.05 * Math.sin(t * 1.3), sw * 0.25 + look, 0);
      const ts = tsway + 0.35 * Math.sin(t * 1.4);
      P[0].set(0, 2.9, -1.9);
      P[1].set(ts * 0.3, 2.6, -3.8);
      P[2].set(ts * 0.8, 1.7, -5.6);
      P[3].set(ts * 1.6, 1.2, -7.6);
      tail.set(...P);
      eyes.forEach((e) => (e.lid.rotation.x = lerp(-1.6, 1.45, blink)));
    },
  };
  root.userData.update(0);
  return root;
}

// ---------------------------------------------------------- small runner
// Small feathery two-legged dinosaur, chicken-sized when scaled down: big
// head, crest feathers, tiny arms with feather tufts, long tail. Faces +z.
// ~2.4 units tall at scale 1.
export function makeRunner({ skin = 0xff9a3d, belly = 0xffe2a8, feather = 0x2fb8c8 } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const M = std(skin, 0.6, { emissive: skin, emissiveIntensity: 0.06 });
  const B = std(belly, 0.7);
  const F = std(feather, 0.55, { emissive: feather, emissiveIntensity: 0.08 });
  add(body, BALL, M, [0, 1.45, 0], [0.25, 0, 0], [0.55, 0.55, 0.8]);
  add(body, BALL, B, [0, 1.35, 0.25], [0.25, 0, 0], [0.45, 0.45, 0.55]);
  const neck = makeChain(body, M, 8, 0.32, 0.26);
  const head = new THREE.Group();
  body.add(head);
  add(head, BALL, M, [0, 0, 0], [0, 0, 0], [0.42, 0.4, 0.5]);
  add(head, BALL, M, [0, -0.08, 0.38], [0, 0, 0], [0.3, 0.24, 0.32]);
  add(head, new THREE.TorusGeometry(0.17, 0.025, 6, 16, Math.PI * 0.8), std(0x4a2410, 0.5), [0, -0.16, 0.58], [0, 0, Math.PI + 0.3], [1, 0.8, 1], false);
  const eyes = [-1, 1].map((s) => makeEye(head, V(0.25 * s, 0.14, 0.26), 0.17, s));
  eyes.forEach((e) => (e.lid.material = M));
  [[0, 0.42, -0.05, -0.4], [0, 0.36, -0.25, -0.9], [0, 0.4, 0.15, 0.1]].forEach(([x, y, z, r]) => add(head, new THREE.ConeGeometry(0.08, 0.42, 8), F, [x, y, z], [r, 0, 0]));
  const tail = makeChain(body, M, 12, 0.36, 0.08);
  const tailTip = new THREE.Group();
  body.add(tailTip);
  for (let i = 0; i < 3; i++) add(tailTip, new THREE.ConeGeometry(0.1, 0.55, 8), F, [0, 0, 0], [-Math.PI / 2 + (i - 1) * 0.35, 0, 0]);
  const arms = [-1, 1].map((s) => {
    const a = new THREE.Group();
    a.position.set(0.38 * s, 1.5, 0.45);
    body.add(a);
    add(a, new THREE.CapsuleGeometry(0.06, 0.25, 4, 8), M, [0, -0.12, 0.05], [0.6, 0, 0]);
    add(a, new THREE.ConeGeometry(0.07, 0.3, 6), F, [0.04 * s, -0.08, -0.08], [-1.4, 0, 0]);
    return a;
  });
  const legs = [-1, 1].map((s) => {
    const hip = new THREE.Group();
    hip.position.set(0.28 * s, 1.25, -0.05);
    body.add(hip);
    add(hip, BALL, M, [0, -0.25, 0.08], [0, 0, 0], [0.22, 0.38, 0.28]);
    const knee = new THREE.Group();
    knee.position.set(0, -0.6, 0.12);
    hip.add(knee);
    add(knee, new THREE.CylinderGeometry(0.05, 0.06, 0.62, 8), std(0xf2c45a, 0.6), [0, -0.3, -0.05]);
    const foot = new THREE.Group();
    foot.position.set(0, -0.62, -0.08);
    knee.add(foot);
    for (const r of [-0.4, 0, 0.4]) add(foot, new THREE.CapsuleGeometry(0.035, 0.18, 4, 6), std(0xf2c45a, 0.6), [Math.sin(r) * 0.12, 0, 0.12 * Math.cos(r)], [Math.PI / 2, r, 0]);
    return { hip, knee };
  });
  const P = [V(0, 0, 0), V(0, 0, 0), V(0, 0, 0), V(0, 0, 0)];
  root.userData = {
    head, eyes,
    update(t, { run = 0, peck = 0, look = 0, blink = 0, hop = 0 } = {}) {
      const ph = t * 11;
      legs.forEach((l, i) => {
        const s = Math.sin(ph + i * Math.PI);
        l.hip.rotation.x = run * 0.7 * s;
        l.knee.rotation.x = run * (0.5 + 0.5 * Math.cos(ph + i * Math.PI)) * 0.8;
      });
      body.position.y = run * 0.08 * Math.abs(Math.sin(ph)) + hop;
      body.rotation.x = run * 0.12;
      const by = 1.6, bz = 0.55;
      P[0].set(0, by, bz);
      P[1].set(0, by + 0.35, bz + 0.25);
      P[2].set(0, by + 0.6 - peck * 0.6, bz + 0.25 + peck * 0.3);
      P[3].set(0.05 * Math.sin(t * 2), by + 0.75 - peck * 0.9, bz + 0.4 + peck * 0.45);
      head.position.copy(neck.set(...P));
      head.rotation.set(peck * 0.8 - 0.05, look + 0.15 * Math.sin(t * 1.7), 0.06 * Math.sin(t * 2.3));
      const ts = 0.25 * Math.sin(t * 3 + run * t * 4);
      P[0].set(0, 1.5, -0.5);
      P[1].set(ts * 0.3, 1.55, -1.1);
      P[2].set(ts * 0.8, 1.7 + run * 0.1, -1.7);
      P[3].set(ts * 1.3, 1.85 + run * 0.15, -2.25);
      tailTip.position.copy(tail.set(...P));
      tailTip.rotation.y = ts * 0.4;
      arms.forEach((a, i) => (a.rotation.x = -0.3 + 0.3 * Math.sin(t * 6 + i)));
      eyes.forEach((e) => (e.lid.rotation.x = lerp(-1.6, 1.45, blink)));
    },
  };
  root.userData.update(0);
  return root;
}

// ------------------------------------------------------------------ chicken
export function makeChicken() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const W = std(0xfbf6ec, 0.75);
  add(body, BALL, W, [0, 1.15, 0], [0, 0, 0], [0.75, 0.68, 0.9]);
  for (let i = 0; i < 3; i++) add(body, new THREE.ConeGeometry(0.2, 0.8, 8), W, [0, 1.55 + i * 0.05, -0.7], [-0.6 - (i - 1) * 0.3, (i - 1) * 0.25, 0]);
  for (const s of [-1, 1]) add(body, BALL, std(0xeee4d2, 0.75), [0.66 * s, 1.15, -0.05], [0.2, 0, 0], [0.16, 0.42, 0.62]);
  const head = new THREE.Group();
  head.position.set(0, 1.85, 0.6);
  body.add(head);
  add(head, BALL, W, [0, 0, 0], [0, 0, 0], [0.38, 0.4, 0.38]);
  const red = std(0xe8343f, 0.5);
  for (const [y, z, r] of [[0.42, -0.05, 0.12], [0.45, 0.1, 0.13], [0.4, 0.24, 0.1]]) add(head, BALL, red, [0, y, z], [0, 0, 0], [r * 0.6, r, r]);
  add(head, BALL, red, [0, -0.3, 0.3], [0, 0, 0], [0.08, 0.14, 0.08]);
  add(head, new THREE.ConeGeometry(0.1, 0.28, 10), std(0xffa21f, 0.5), [0, -0.05, 0.45], [Math.PI / 2, 0, 0]);
  const eyes = [-1, 1].map((s) => makeEye(head, V(0.2 * s, 0.1, 0.22), 0.12, s));
  eyes.forEach((e) => (e.lid.material = W));
  const legs = [-1, 1].map((s) => {
    const l = new THREE.Group();
    l.position.set(0.25 * s, 0.6, 0.05);
    body.add(l);
    add(l, new THREE.CylinderGeometry(0.04, 0.05, 0.6, 8), std(0xffa21f, 0.5), [0, -0.3, 0]);
    for (const r of [-0.45, 0, 0.45]) add(l, new THREE.CapsuleGeometry(0.03, 0.18, 4, 6), std(0xffa21f, 0.5), [Math.sin(r) * 0.12, -0.6, 0.1 * Math.cos(r)], [Math.PI / 2, r, 0]);
    return l;
  });
  root.userData = {
    head,
    update(t, { peck = 0, walk = 0, look = 0 } = {}) {
      head.position.set(0, 1.85 - peck * 0.5, 0.6 + peck * 0.35);
      head.rotation.set(peck * 0.9, look + 0.3 * Math.sin(t * 1.3) * (1 - peck), 0);
      legs.forEach((l, i) => (l.rotation.x = walk * 0.5 * Math.sin(t * 10 + i * Math.PI)));
      body.position.y = walk * 0.05 * Math.abs(Math.sin(t * 10));
    },
  };
  return root;
}

// ---------------------------------------------------------------------- bus
// A friendly cartoon bus for the size comparison. Faces +z, ~11 units long.
export function makeBus() {
  const g = new THREE.Group();
  add(g, new RoundedBoxGeometry(3.0, 3.2, 11, 4, 0.45), std(0xffc23d, 0.5), [0, 2.1, 0]);
  add(g, new RoundedBoxGeometry(3.06, 0.5, 11.06, 2, 0.2), std(0x2f7bff, 0.5), [0, 1.2, 0]);
  add(g, new RoundedBoxGeometry(3.04, 0.35, 11.04, 2, 0.15), std(0xffffff, 0.6), [0, 3.55, 0]);
  const glass = std(0x9fd6ff, 0.12, { emissive: 0x3a6a9a, emissiveIntensity: 0.25 });
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) add(g, new RoundedBoxGeometry(0.08, 1.1, 1.6, 2, 0.04), glass, [1.52 * s, 2.55, -4 + i * 1.9]);
  add(g, new RoundedBoxGeometry(2.5, 1.3, 0.08, 2, 0.04), glass, [0, 2.55, 5.52]);
  for (const s of [-1, 1]) add(g, BALL, std(0xfff6c8, 0.2, { emissive: 0xfff0b0, emissiveIntensity: 0.6 }), [1.05 * s, 1.35, 5.52], [0, 0, 0], [0.24, 0.24, 0.08], false);
  for (const s of [-1, 1]) for (const z of [-3.6, 3.4]) {
    add(g, new THREE.CylinderGeometry(0.75, 0.75, 0.5, 24), std(0x22232b, 0.7), [1.35 * s, 0.75, z], [0, 0, Math.PI / 2]);
    add(g, new THREE.CylinderGeometry(0.35, 0.35, 0.54, 16), std(0xc9ccd6, 0.4), [1.37 * s, 0.75, z], [0, 0, Math.PI / 2]);
  }
  return g;
}

// ------------------------------------------------------------------- bones
const boneMat = () => std(0xf3e6c8, 0.7, { emissive: 0x3a2a10, emissiveIntensity: 0.08 });
// Cartoon bone: shaft with two knobbly ends, lying along +y from 0 to len.
function makeBone(len, r, mat) {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(r, r, len, 12), mat, [0, len / 2, 0]);
  for (const y of [0, len]) for (const s of [-1, 1]) add(g, BALL, mat, [s * r * 0.85, y, 0], [0, 0, 0], [r * 1.25, r * 1.25, r * 1.25]);
  return g;
}
function makeSkull(mat) {
  const g = new THREE.Group();
  add(g, new RoundedBoxGeometry(1.7, 0.95, 0.9, 4, 0.3), mat, [0.35, 0.1, 0]);
  add(g, new RoundedBoxGeometry(1.4, 0.35, 0.8, 3, 0.15), mat, [0.45, -0.55, 0], [0, 0, -0.1]);
  const dark = std(0x5a4632, 0.8);
  for (const s of [-1, 1]) {
    add(g, BALL, dark, [-0.05, 0.22, 0.42 * s], [0, 0, 0], [0.2, 0.2, 0.06], false);
    add(g, BALL, dark, [0.65, 0.05, 0.43 * s], [0, 0, 0], [0.26, 0.15, 0.04], false);
  }
  const tooth = std(0xfffaf0, 0.4);
  for (let i = 0; i < 6; i++) add(g, new THREE.ConeGeometry(0.06, 0.2, 6), tooth, [0.95 - i * 0.18, -0.3, 0.3], [Math.PI, 0, 0], [1, 1, 1], false);
  return g;
}
export function makeTooth(mat = std(0xf1e2bf, 0.55)) {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    const k = i / 14;
    pts.push(new THREE.Vector2(0.42 * Math.pow(1 - k, 0.8) + 0.01, k * 1.6));
  }
  const m = add(g, new THREE.LatheGeometry(pts, 24), mat, [0, 0, 0], [0, 0, 0.18]);
  add(g, new THREE.CylinderGeometry(0.42, 0.36, 0.25, 24), std(0xc9a77a, 0.7), [0, -0.1, 0]);
  void m;
  return g;
}

// Dinosaur skeleton (big two-legged meat-eater) seen side-on, facing +x.
// Each piece knows its assembled transform; pieces[i].userData.home holds it.
function makeSkeleton() {
  const g = new THREE.Group();
  const mat = boneMat();
  const pieces = [];
  const put = (obj, pos, rot) => {
    obj.position.set(...pos);
    obj.rotation.set(...rot);
    obj.userData.home = { p: obj.position.clone(), r: obj.rotation.clone() };
    g.add(obj);
    pieces.push(obj);
    return obj;
  };
  // spine: tail tip -> neck
  const spine = [];
  const P0 = V(-6.5, 1.6, 0), P1 = V(-3.2, 3.2, 0), P2 = V(1.0, 4.4, 0), P3 = V(2.6, 5.3, 0);
  const tmp = V(0, 0, 0);
  for (let i = 0; i < 20; i++) {
    const k = i / 19;
    bez(P0, P1, P2, P3, k, tmp);
    const r = lerp(0.12, 0.34, Math.pow(k, 0.7));
    const v = new THREE.Group();
    add(v, BALL, mat, [0, 0, 0], [0, 0, 0], [r, r * 1.1, r]);
    add(v, new THREE.ConeGeometry(r * 0.35, r * 1.6, 6), mat, [0, r * 1.2, 0]);
    spine.push(put(v, tmp.toArray(), [0, 0, 0]));
  }
  // skull
  put(makeSkull(mat), [3.4, 5.6, 0], [0, 0, -0.15]);
  // ribs (arcs hanging under the spine)
  for (let i = 0; i < 6; i++) {
    const x = -1.0 + i * 0.5;
    for (const s of [-1, 1]) {
      const rib = new THREE.Group();
      add(rib, new THREE.TorusGeometry(0.75 - Math.abs(i - 2.5) * 0.08, 0.06, 6, 16, Math.PI * 0.9), mat, [0, 0, 0], [Math.PI / 2, 0, 0]);
      put(rib, [x, 3.55 + i * 0.12, 0.15 * s], [Math.PI / 2 + 0.25 * s, 0, 0.1]);
    }
  }
  // legs: femur, shin, foot
  for (const s of [-1, 1]) {
    put(makeBone(1.6, 0.14, mat), [-0.9, 3.4, 0.55 * s], [0, 0, Math.PI - 0.35]);
    put(makeBone(1.6, 0.11, mat), [-0.35, 1.9, 0.55 * s], [0, 0, Math.PI + 0.45]);
    put(makeBone(0.8, 0.09, mat), [-1.0, 0.45, 0.55 * s], [0, 0, -Math.PI / 2 + 0.2]);
    put(makeBone(0.6, 0.06, mat), [1.75, 4.2, 0.4 * s], [0, 0, Math.PI - 0.7]);
  }
  // hip bone
  const hip = new THREE.Group();
  add(hip, new RoundedBoxGeometry(1.4, 0.55, 0.9, 3, 0.2), mat);
  put(hip, [-0.8, 3.45, 0], [0, 0, 0.1]);
  g.userData = { pieces, mat };
  return g;
}

// --------------------------------------------------------------- plants
function makeFern(R, s = 1, color = 0x3f9a4a) {
  const g = new THREE.Group();
  const m = std(color, 0.75, { flatShading: true });
  const n = 7 + Math.floor(R() * 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + R() * 0.3;
    const f = new THREE.Group();
    f.rotation.set(0, a, 0);
    g.add(f);
    const len = (1.6 + R() * 1.2) * s;
    add(f, BALL, m, [0, len * 0.35, len * 0.45], [-0.9 + R() * 0.3, 0, 0], [0.22 * s, 0.05 * s, len * 0.55]);
  }
  return g;
}
function makePalm(R, h = 7) {
  const g = new THREE.Group();
  const trunk = std(0x8a6038, 0.9, { flatShading: true });
  const segs = 7;
  const bend = (R() - 0.5) * 1.2;
  let top = V(0, 0, 0);
  for (let i = 0; i < segs; i++) {
    const k = i / segs;
    const y = k * h;
    const x = bend * k * k;
    add(g, new THREE.CylinderGeometry(0.32 - k * 0.1, 0.38 - k * 0.1, h / segs + 0.05, 9), trunk, [x, y + h / segs / 2, 0], [0, i, -bend * k * 0.3]);
    top = V(bend, h, 0);
  }
  const leaf = std(0x3fae55, 0.7, { flatShading: true });
  const leaf2 = std(0x2f8f45, 0.7, { flatShading: true });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const fr = new THREE.Group();
    fr.position.copy(top);
    fr.rotation.set(0, a, 0);
    g.add(fr);
    for (let j = 0; j < 5; j++) {
      const k = j / 4;
      add(fr, BALL, j % 2 ? leaf : leaf2, [0, 0.3 - k * k * 1.8, 0.5 + k * 2.6], [0.3 + k * 0.6, 0, 0], [0.55 - k * 0.3, 0.06, 0.7]);
    }
  }
  add(g, BALL, std(0x6b4a2a, 0.8), [top.x, top.y - 0.1, 0], [0, 0, 0], [0.45, 0.4, 0.45]);
  return g;
}
function makeRock(R, s, color = 0x9a8a7a) {
  return add(new THREE.Group(), new THREE.IcosahedronGeometry(s, 1), std(color, 0.95, { flatShading: true }), [0, s * 0.35, 0], [R(), R(), R()], [1, 0.6 + R() * 0.3, 1]).parent;
}

// ---------------------------------------------------------------- bedroom
export function buildBedroom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf6e3c6);
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x8a6a5a, 1.5));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.0);
  sun.position.set(3, 8, 6);
  shadowCfg(sun, 7);
  scene.add(sun, sun.target);
  const winLight = new THREE.PointLight(0xffe6b0, 18, 14, 1.6);
  winLight.position.set(2.0, 3.6, -1.2);
  scene.add(winLight);
  const front = new THREE.PointLight(0xffe2c8, 10, 12, 1.8);
  front.position.set(1.5, 3.4, 5);
  scene.add(front);

  const floorTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#b47a4e';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#bd8456' : '#a8714a';
      g.fillRect(0, i * 64, w, 62);
      g.fillStyle = 'rgba(0,0,0,0.2)';
      g.fillRect(0, i * 64 + 62, w, 2);
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(3, 3);
  add(scene, new THREE.PlaneGeometry(20, 20), std(0xffffff, 0.8, { map: floorTex }), [0, 0, 0], [-Math.PI / 2, 0, 0]);
  const wallTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#9fd3b4';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 26, h);
  });
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(5, 2);
  add(scene, new THREE.PlaneGeometry(20, 9), std(0xffffff, 0.9, { map: wallTex }), [0, 4.5, -2.2]);
  add(scene, new THREE.PlaneGeometry(10, 9), std(0x93c8a8, 0.9), [-5.5, 4.5, 2.8], [0, Math.PI / 2, 0]);
  add(scene, new THREE.BoxGeometry(20, 0.25, 0.08), std(0xffffff, 0.7), [0, 0.12, -2.16]);

  // window with a sunny sky
  const dayTex = canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#5fb4ff');
    gr.addColorStop(1, '#cfeeff');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    const sg = g.createRadialGradient(400, 110, 10, 400, 110, 140);
    sg.addColorStop(0, 'rgba(255,248,210,1)');
    sg.addColorStop(0.35, 'rgba(255,240,180,0.7)');
    sg.addColorStop(1, 'rgba(255,240,180,0)');
    g.fillStyle = sg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff';
    for (const [x, y, s] of [[120, 150, 1], [300, 250, 0.7], [80, 330, 0.6]]) {
      for (const [dx, dy, r] of [[0, 0, 40], [40, -18, 46], [85, 0, 38], [42, 14, 40]]) {
        g.beginPath();
        g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.fillStyle = '#5bb36a';
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.arc(i * 64 - 10, h, 70 + (i % 3) * 20, Math.PI, 0);
      g.fill();
    }
  });
  const win = new THREE.Group();
  win.position.set(2.0, 3.6, -2.18);
  scene.add(win);
  add(win, new THREE.PlaneGeometry(2.6, 2.2), new THREE.MeshBasicMaterial({ map: dayTex }), [0, 0, 0.01], [0, 0, 0], [1, 1, 1], false);
  const frameMat = std(0xffffff, 0.6);
  add(win, new THREE.BoxGeometry(2.8, 0.14, 0.14), frameMat, [0, 1.12, 0.06]);
  add(win, new THREE.BoxGeometry(2.8, 0.14, 0.14), frameMat, [0, -1.12, 0.06]);
  add(win, new THREE.BoxGeometry(0.14, 2.3, 0.14), frameMat, [-1.33, 0, 0.06]);
  add(win, new THREE.BoxGeometry(0.14, 2.3, 0.14), frameMat, [1.33, 0, 0.06]);
  add(win, new THREE.BoxGeometry(0.08, 2.2, 0.08), frameMat, [0, 0, 0.06]);
  add(win, new THREE.BoxGeometry(3.0, 0.12, 0.4), frameMat, [0, -1.2, 0.2]);
  const curtain = std(0xffa65c, 0.85);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) add(win, new THREE.CylinderGeometry(0.16, 0.2, 2.8, 12), curtain, [s * (1.55 + i * 0.22), -0.2, 0.2], [0, 0, 0], [1, 1, 0.6]);
  const winGlow = glow(0xfff2c8, 4.5, 0.35);
  winGlow.position.set(0, 0, 0.3);
  win.add(winGlow);

  // bed, Affan sits on its front edge
  const bed = new THREE.Group();
  bed.position.set(0.4, 0, -0.85);
  scene.add(bed);
  add(bed, new RoundedBoxGeometry(5.6, 0.7, 2.6, 3, 0.1), std(0x3f7fd0, 0.8), [0, 0.45, 0]);
  add(bed, new RoundedBoxGeometry(5.4, 0.35, 2.45, 3, 0.15), std(0xf4f1ea, 0.85), [0, 0.97, 0]);
  add(bed, new RoundedBoxGeometry(0.25, 2.4, 2.7, 3, 0.1), std(0x356fbf, 0.8), [-2.85, 1.2, 0]);
  add(bed, new RoundedBoxGeometry(1.2, 0.36, 1.8, 4, 0.16), std(0xffffff, 0.85), [-2.0, 1.32, 0]);
  const blanketTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#7fd36b';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd84a';
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const cx = x * 64 + 32 + (y % 2) * 16, cy = y * 64 + 32;
      // little footprint pattern
      g.beginPath();
      g.ellipse(cx, cy + 6, 10, 12, 0, 0, Math.PI * 2);
      g.fill();
      for (const dx of [-10, 0, 10]) {
        g.beginPath();
        g.ellipse(cx + dx, cy - 12, 4, 7, dx * 0.03, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
  blanketTex.wrapS = blanketTex.wrapT = THREE.RepeatWrapping;
  blanketTex.repeat.set(2, 1);
  add(bed, new RoundedBoxGeometry(3.4, 0.22, 2.7, 3, 0.1), std(0xffffff, 0.9, { map: blanketTex }), [1.0, 1.2, 0.02]);

  // shelf with a toy volcano + books, and a dinosaur poster
  const tb = new THREE.Group();
  tb.position.set(-3.8, 0, -1.0);
  scene.add(tb);
  add(tb, new RoundedBoxGeometry(1.3, 1.3, 1.0, 3, 0.08), std(0xc98b55, 0.7), [0, 0.65, 0]);
  add(tb, new THREE.ConeGeometry(0.45, 0.7, 14, 1, true), std(0x8a5a3a, 0.8), [0.15, 1.65, 0]);
  add(tb, BALL, std(0xff7a3d, 0.4, { emissive: 0xff5a1a, emissiveIntensity: 0.6 }), [0.15, 2.0, 0], [0, 0, 0], [0.14, 0.06, 0.14]);
  for (let i = 0; i < 3; i++) add(tb, new RoundedBoxGeometry(0.16, 0.6, 0.5, 2, 0.03), std([0xff5f5f, 0x2f7bff, 0xffd23f][i], 0.6), [-0.45 + i * 0.18, 1.6, 0.05], [0, 0, i === 2 ? -0.2 : 0]);
  const art = canvasTex(320, 256, (g, w, h) => {
    g.fillStyle = '#fff8e6';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd36b';
    g.beginPath();
    g.arc(250, 60, 30, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#4fb87a';
    g.beginPath();
    g.ellipse(150, 170, 70, 40, 0, 0, Math.PI * 2);
    g.fill();
    g.lineCap = 'round';
    g.strokeStyle = '#4fb87a';
    g.lineWidth = 26;
    g.beginPath();
    g.moveTo(200, 150);
    g.quadraticCurveTo(250, 120, 240, 60);
    g.stroke();
    g.lineWidth = 18;
    g.beginPath();
    g.moveTo(90, 175);
    g.quadraticCurveTo(40, 190, 20, 220);
    g.stroke();
    g.beginPath();
    g.ellipse(250, 55, 24, 16, -0.3, 0, Math.PI * 2);
    g.fillStyle = '#4fb87a';
    g.fill();
    g.fillRect(100, 190, 18, 45);
    g.fillRect(180, 190, 18, 45);
    g.fillStyle = '#1d3a2a';
    g.beginPath();
    g.arc(258, 50, 4, 0, Math.PI * 2);
    g.fill();
  });
  add(scene, new THREE.BoxGeometry(1.75, 1.45, 0.08), std(0xffffff, 0.6), [-2.2, 4.0, -2.15]);
  add(scene, new THREE.PlaneGeometry(1.55, 1.24), new THREE.MeshBasicMaterial({ map: art, color: 0xd8d8e0 }), [-2.2, 4.0, -2.1], [0, 0, 0], [1, 1, 1], false);

  const aff = makeAffan();
  aff.root.position.set(0, 0.26, 0.45);
  scene.add(aff.root);
  // Affan's toy dinosaur (rides in his right hand in some shots)
  const toy = makeSauropod({ skin: 0x5fd06a, belly: 0xe4f7b8, spots: 0x2f9a4a });
  toy.scale.setScalar(0.085);
  scene.add(toy);
  return { scene, aff, toy, sun };
}

// ----------------------------------------------------- prehistoric valley
export function buildJungle() {
  const scene = new THREE.Scene();
  const fog = new THREE.Fog(0xf6d6a8, 40, 170);
  scene.fog = fog;
  const sky = makeSky({ top: 0x4f8fe6, mid: 0x8fc4ff, horizon: 0xffd8a8, bottom: 0xe7c08a, radius: 400 });
  scene.add(sky);
  const hemi = new THREE.HemisphereLight(0xe6f2ff, 0x6a7a3a, 1.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.7);
  sun.position.set(-10, 16, 12);
  shadowCfg(sun, 20);
  scene.add(sun, sun.target);
  const groundTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#86b85a';
    g.fillRect(0, 0, w, h);
    const R = rng(5);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = ['#7aad50', '#93c466', '#a3b860', '#78a24c'][i % 4];
      g.fillRect(R() * w, R() * h, 3 + R() * 6, 3 + R() * 6);
    }
  });
  groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
  groundTex.repeat.set(30, 30);
  add(scene, new THREE.CircleGeometry(200, 64), std(0xffffff, 0.95, { map: groundTex }), [0, 0, 0], [-Math.PI / 2, 0, 0]).receiveShadow = true;
  // a lake on the left
  add(scene, new THREE.CircleGeometry(14, 48), std(0x58b6e8, 0.12, { emissive: 0x2a6a9a, emissiveIntensity: 0.25 }), [-22, 0.03, -18], [-Math.PI / 2, 0, 0], [1, 0.6, 1], false);
  const R = rng(12);
  // mountains + a smoking volcano far away
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI * 0.95 + (i / 13) * Math.PI * 0.9;
    const h = 22 + R() * 22;
    add(scene, new THREE.ConeGeometry(16 + R() * 10, h, 7), std([0x7a9a6a, 0x8aa878, 0x6f8f62][i % 3], 1, { flatShading: true }), [Math.cos(a) * 110, h / 2 - 2, Math.sin(a) * 110], [0, R() * 3, 0], [1, 1, 1], false);
  }
  const volcano = new THREE.Group();
  volcano.position.set(30, 0, -95);
  scene.add(volcano);
  add(volcano, new THREE.CylinderGeometry(7, 26, 36, 10, 1, true), std(0x7a5a46, 1, { flatShading: true }), [0, 18, 0], [0, 0, 0], [1, 1, 1], false);
  add(volcano, new THREE.CircleGeometry(7, 10), std(0xff6a2a, 0.5, { emissive: 0xff4a10, emissiveIntensity: 0.9 }), [0, 35.8, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  const smoke = [];
  for (let i = 0; i < 9; i++) {
    const p = add(volcano, BALL, std(0xe8e0d8, 1, { transparent: true, opacity: 0.85 }), [0, 38, 0], [0, 0, 0], [3, 3, 3], false);
    p.userData.ph = i / 9;
    smoke.push(p);
  }
  // trees and ferns, keeping the stage area (where Affan stands) clear
  const blocked = (x, z) => Math.abs(x) < 12 && z > -6 && z < 14;
  for (let i = 0; i < 46; i++) {
    const a = R() * Math.PI * 2, r = 14 + R() * 55;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (blocked(x, z) || z > 18) continue;
    const p = makePalm(R, 6 + R() * 6);
    p.position.set(x, 0, z);
    p.rotation.y = R() * 6;
    scene.add(p);
  }
  for (let i = 0; i < 90; i++) {
    const a = R() * Math.PI * 2, r = 5 + R() * 40;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (blocked(x, z) && r < 14) continue;
    const f = makeFern(R, 0.8 + R() * 0.9, [0x3f9a4a, 0x4fae55, 0x2f8a42][i % 3]);
    f.position.set(x, 0, z);
    scene.add(f);
  }
  for (let i = 0; i < 18; i++) {
    const a = R() * Math.PI * 2, r = 8 + R() * 30;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (blocked(x, z)) continue;
    const rk = makeRock(R, 0.5 + R() * 1.2);
    rk.position.set(x, 0, z);
    scene.add(rk);
  }
  // foreground ferns framing the bottom of the shot
  for (const [x, z, s] of [[-6.5, 9, 1.4], [7.5, 8.5, 1.5], [-9, 4, 1.2], [10, 3, 1.3]]) {
    const f = makeFern(R, s, 0x3a9446);
    f.position.set(x, 0, z);
    scene.add(f);
  }

  const aff = makeAffan();
  scene.add(aff.root);
  const big = makeSauropod();
  scene.add(big);
  const baby = makeSauropod({ skin: 0x6fc8e8, belly: 0xd8f2ff, spots: 0x3f98c8 });
  baby.scale.setScalar(0.45);
  scene.add(baby);
  const runner = makeRunner();
  runner.scale.setScalar(0.62);
  scene.add(runner);
  const runner2 = makeRunner({ skin: 0x8f7bff, belly: 0xe8e0ff, feather: 0xff7eb6 });
  runner2.scale.setScalar(0.55);
  scene.add(runner2);
  const chicken = makeChicken();
  chicken.scale.setScalar(0.62);
  scene.add(chicken);
  const bus = makeBus();
  scene.add(bus);
  const bird = makeBird();
  scene.add(bird);

  // asteroid with a glowing trail
  const rock = new THREE.Group();
  add(rock, new THREE.DodecahedronGeometry(2.4, 1), std(0x6a5446, 0.9, { flatShading: true, emissive: 0xff5a1a, emissiveIntensity: 0.35 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const core = glow(0xffb060, 14, 0.9);
  rock.add(core);
  const trail = [];
  for (let i = 0; i < 14; i++) {
    const s = glow(i < 4 ? 0xffe0a0 : 0xff7a3a, 20 - i * 1.0, 0.8 - i * 0.05);
    scene.add(s);
    trail.push(s);
  }
  rock.scale.setScalar(2.6);
  scene.add(rock);
  const impact = glow(0xffa040, 120, 0);
  impact.position.set(-40, 4, -140);
  scene.add(impact);
  const dust = [];
  for (let i = 0; i < 16; i++) {
    const d = add(scene, BALL, std(0xb89a7a, 1, { transparent: true, opacity: 0 }), [-40 + (R() - 0.5) * 60, 0, -140 + (R() - 0.5) * 20], [0, 0, 0], [10, 8, 10], false);
    d.userData.v = [(R() - 0.5) * 30, 10 + R() * 25];
    d.userData.x0 = d.position.x;
    dust.push(d);
  }

  const SKY = {
    day: [new THREE.Color(0x4f8fe6), new THREE.Color(0x8fc4ff), new THREE.Color(0xffd8a8), new THREE.Color(0xf6d6a8)],
    dusk: [new THREE.Color(0x5a2a5a), new THREE.Color(0xd8604a), new THREE.Color(0xffb060), new THREE.Color(0xc89a7a)],
  };
  const tmpC = new THREE.Color();
  return {
    scene, sky, sun, hemi, aff, big, baby, runner, runner2, chicken, bus, bird, rock, trail, impact, dust,
    // doom: 0 sunny .. 1 orange dusty sky (asteroid scene)
    setMood(doom, t) {
      const u = sky.material.uniforms;
      ['top', 'mid', 'horizon'].forEach((k, i) => u[k].value.copy(SKY.day[i]).lerp(SKY.dusk[i], doom));
      fog.color.copy(SKY.day[3]).lerp(SKY.dusk[3], doom);
      fog.near = lerp(40, 25, doom);
      fog.far = lerp(170, 120, doom);
      sun.color.copy(tmpC.set(0xfff0d8).lerp(new THREE.Color(0xffa070), doom));
      sun.intensity = lerp(2.7, 2.0, doom);
      hemi.intensity = lerp(1.55, 1.2, doom);
      smoke.forEach((p) => {
        const k = (t * 0.08 + p.userData.ph) % 1;
        p.position.set(k * 10, 37 + k * 26, k * 2);
        p.scale.setScalar(2.5 + k * 7);
        p.material.opacity = 0.8 * (1 - k);
      });
    },
  };
}

// Little songbird (perches on a branch). Faces +z.
function makeBird() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const M = std(0x3fa8ff, 0.55, { emissive: 0x1a5aaa, emissiveIntensity: 0.1 });
  add(body, BALL, M, [0, 0.6, 0], [0, 0, 0], [0.42, 0.42, 0.55]);
  add(body, BALL, std(0xffe08a, 0.6), [0, 0.55, 0.2], [0, 0, 0], [0.32, 0.32, 0.36]);
  add(body, BALL, M, [0, 1.05, 0.3], [0, 0, 0], [0.3, 0.3, 0.3]);
  add(body, new THREE.ConeGeometry(0.07, 0.22, 8), std(0xffa21f, 0.5), [0, 1.03, 0.62], [Math.PI / 2, 0, 0]);
  const eyes = [-1, 1].map((s) => makeEye(body, V(0.15 * s, 1.12, 0.48), 0.09, s));
  eyes.forEach((e) => (e.lid.material = M));
  const wings = [-1, 1].map((s) => {
    const w = new THREE.Group();
    w.position.set(0.36 * s, 0.75, 0);
    body.add(w);
    add(w, BALL, std(0x2f86d8, 0.55), [0.12 * s, -0.05, -0.1], [0, 0, 0], [0.12, 0.3, 0.45]);
    return w;
  });
  add(body, new THREE.ConeGeometry(0.16, 0.6, 8), M, [0, 0.55, -0.6], [-Math.PI / 2 - 0.4, 0, 0], [1, 1, 0.4]);
  for (const s of [-1, 1]) add(body, new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6), std(0xffa21f, 0.5), [0.12 * s, 0.15, 0.05]);
  root.userData = {
    update(t, { flap = 0, hop = 0 } = {}) {
      wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * (0.1 + flap * (0.6 + 0.6 * Math.sin(t * 30)))));
      body.position.y = hop;
      body.rotation.x = 0.1 * Math.sin(t * 2);
    },
  };
  return root;
}

// ------------------------------------------------------------- dig site
// Sandy quarry with striped rock layers, a roped-off dig pit with bones
// half buried, a footprint slab, a tooth on a little stand, tools, and the
// skeleton that assembles itself "like a puzzle".
export const PIT = new THREE.Vector3(0, 0, 0);
export function buildDig() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffe2b8, 40, 150);
  const sky = makeSky({ top: 0x4a8ee8, mid: 0x9fd0ff, horizon: 0xffe2b8, bottom: 0xe8c08a, radius: 400 });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x9a7a4a, 1.6));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
  sun.position.set(-8, 14, 10);
  shadowCfg(sun, 14);
  scene.add(sun, sun.target);
  const sandTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#e2b57a';
    g.fillRect(0, 0, w, h);
    const R = rng(8);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = ['#d6a86c', '#eac28a', '#cf9f64', '#f0cc96'][i % 4];
      g.fillRect(R() * w, R() * h, 2 + R() * 4, 2 + R() * 4);
    }
  });
  sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping;
  sandTex.repeat.set(24, 24);
  add(scene, new THREE.CircleGeometry(200, 64), std(0xffffff, 0.95, { map: sandTex }), [0, 0, 0], [-Math.PI / 2, 0, 0]).receiveShadow = true;
  // rock layers (cliff) behind
  const strata = canvasTex(1024, 256, (g, w, h) => {
    const cols = ['#c98a5a', '#e0a870', '#b8764a', '#efc08a', '#a8683e', '#d89a62'];
    let y = 0, i = 0;
    while (y < h) {
      const th = 22 + ((i * 37) % 30);
      g.fillStyle = cols[i % cols.length];
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 6);
      g.lineTo(w, y + th + 8);
      g.lineTo(0, y + th + 8);
      g.fill();
      y += th;
      i++;
    }
  });
  strata.wrapS = THREE.RepeatWrapping;
  strata.repeat.set(3, 1);
  const cliff = add(scene, new THREE.CylinderGeometry(40, 42, 16, 48, 1, true, Math.PI * 0.75, Math.PI * 1.5), std(0xffffff, 0.95, { map: strata, side: THREE.DoubleSide }), [0, 8, 6], [0, 0, 0], [1, 1, 1], false);
  void cliff;
  const R = rng(31);
  for (let i = 0; i < 26; i++) {
    const a = R() * Math.PI * 2, r = 9 + R() * 24;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (z > 4 && Math.abs(x) < 10) continue;
    const rk = makeRock(R, 0.4 + R() * 1.1, [0xc0905e, 0xa8784a, 0xd8a870][i % 3]);
    rk.position.set(x, 0, z);
    scene.add(rk);
  }
  // dig pit: darker sand patch, stakes and rope
  add(scene, new THREE.PlaneGeometry(9, 6), std(0xc89260, 1), [0, 0.02, 0], [-Math.PI / 2, 0, 0]).receiveShadow = true;
  const stake = std(0xa0703e, 0.8), rope = std(0xfff2d0, 0.7);
  const corners = [[-4.6, -3.1], [4.6, -3.1], [4.6, 3.1], [-4.6, 3.1]];
  corners.forEach(([x, z]) => add(scene, new THREE.CylinderGeometry(0.08, 0.08, 1.1, 8), stake, [x, 0.55, z]));
  for (let i = 0; i < 4; i++) {
    const [x0, z0] = corners[i], [x1, z1] = corners[(i + 1) % 4];
    const len = Math.hypot(x1 - x0, z1 - z0);
    add(scene, new THREE.CylinderGeometry(0.025, 0.025, len, 6), rope, [(x0 + x1) / 2, 1.0, (z0 + z1) / 2], [0, -Math.atan2(z1 - z0, x1 - x0), Math.PI / 2]);
  }
  for (let i = -1; i <= 1; i++) add(scene, new THREE.CylinderGeometry(0.015, 0.015, 6.2, 6), rope, [i * 2.3, 0.08, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.CylinderGeometry(0.015, 0.015, 9.2, 6), rope, [0, 0.08, 0], [0, 0, Math.PI / 2], [1, 1, 1], false);
  // flags
  for (const [x, z, c] of [[-4.6, -3.1, 0xff5f5f], [4.6, 3.1, 0x2f7bff]]) {
    add(scene, new THREE.PlaneGeometry(0.6, 0.4), std(c, 0.6, { side: THREE.DoubleSide }), [x + 0.3, 1.0, z]);
  }
  // skeleton (pieces start buried in the pit, then fly into place)
  const skel = makeSkeleton();
  skel.position.set(0, 0, 0);
  scene.add(skel);
  const pieces = skel.userData.pieces;
  pieces.forEach((p, i) => {
    const R2 = rng(100 + i);
    p.userData.dig = {
      p: V((R2() - 0.5) * 7.6 - skel.position.x, 0.08 + R2() * 0.06, (R2() - 0.5) * 4.6),
      r: new THREE.Euler(Math.PI / 2 * (R2() > 0.5 ? 1 : 0), R2() * 6, R2() * 6),
      delay: (i % 11) / 11 + R2() * 0.3,
    };
  });
  // fossil showcase: footprint slab, tooth stand (bones of the skull stay in pit)
  const slab = new THREE.Group();
  slab.position.set(-2.4, 0, 4.2);
  scene.add(slab);
  add(slab, new RoundedBoxGeometry(3.0, 0.5, 2.2, 3, 0.15), std(0xa88a6a, 0.95), [0, 0.25, 0]);
  const dent = std(0x6a4e36, 0.9);
  add(slab, BALL, dent, [0, 0.5, 0.25], [0, 0, 0], [0.42, 0.04, 0.38], false);
  for (const r of [-0.5, 0, 0.5]) add(slab, BALL, dent, [Math.sin(r) * 0.75, 0.5, 0.25 - Math.cos(r) * 0.72], [0, r, 0], [0.13, 0.04, 0.4], false);
  const stand = new THREE.Group();
  stand.position.set(2.6, 0, 4.0);
  scene.add(stand);
  add(stand, new THREE.CylinderGeometry(0.75, 0.9, 1.4, 24), std(0x2f7bff, 0.6), [0, 0.7, 0]);
  add(stand, new THREE.CylinderGeometry(0.85, 0.85, 0.12, 24), std(0xffffff, 0.5), [0, 1.42, 0]);
  const tooth = makeTooth();
  tooth.position.set(0, 1.62, 0);
  tooth.scale.setScalar(0.7);
  stand.add(tooth);
  const toothGlow = glow(0xfff2b0, 3, 0);
  toothGlow.position.set(0, 2.2, 0);
  stand.add(toothGlow);
  // brush (Affan's tool)
  const brush = new THREE.Group();
  add(brush, new THREE.CylinderGeometry(0.05, 0.06, 0.9, 10), std(0xc0703a, 0.6), [0, 0.45, 0]);
  add(brush, new RoundedBoxGeometry(0.34, 0.14, 0.12, 2, 0.04), std(0x3a3a3a, 0.6), [0, 0.95, 0]);
  add(brush, new THREE.BoxGeometry(0.3, 0.22, 0.1), std(0xf2d07a, 0.9), [0, 1.12, 0]);
  scene.add(brush);
  // bucket + shovel
  const bucket = new THREE.Group();
  bucket.position.set(5.6, 0, 1.6);
  scene.add(bucket);
  add(bucket, new THREE.CylinderGeometry(0.6, 0.45, 1.0, 20), std(0xff5f5f, 0.5), [0, 0.5, 0]);
  add(bucket, new THREE.CylinderGeometry(0.55, 0.55, 0.05, 20), std(0xd6a86c, 1), [0, 0.95, 0]);
  add(scene, new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8), std(0xc0703a, 0.6), [6.4, 0.9, 0.6], [0.2, 0, -0.35]);
  add(scene, new RoundedBoxGeometry(0.45, 0.6, 0.06, 2, 0.05), std(0x9aa6c8, 0.4, { metalness: 0.3 }), [6.75, 0.25, 0.5], [0.2, 0, -0.35]);

  const aff = makeAffan();
  scene.add(aff.root);
  // dust puffs for brushing
  const puffs = [];
  for (let i = 0; i < 10; i++) {
    const p = add(scene, BALL, std(0xf0d4a8, 1, { transparent: true, opacity: 0 }), [0, -5, 0], [0, 0, 0], [0.3, 0.3, 0.3], false);
    puffs.push(p);
  }
  return { scene, sky, sun, aff, skel, pieces, slab, stand, tooth, toothGlow, brush, puffs };
}

// ---------------------------------------------------------------- outro
export function buildOutro() {
  const scene = new THREE.Scene();
  const bg = canvasTex(540, 960, (g) => {
    const gr = g.createRadialGradient(270, 380, 40, 270, 420, 700);
    gr.addColorStop(0, '#9ff0b8');
    gr.addColorStop(0.45, '#3fbf8a');
    gr.addColorStop(1, '#1a7f6a');
    g.fillStyle = gr;
    g.fillRect(0, 0, 540, 960);
  });
  scene.background = bg;
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x6a7ab8, 1.5));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.4);
  key.position.set(3, 6, 8);
  shadowCfg(key, 6);
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfe0ff, 2.0);
  rim.position.set(-6, 5, -6);
  scene.add(rim);
  const aff = makeAffan();
  scene.add(aff.root);
  const halo = glow(0xfff2b0, 9, 0.35);
  halo.position.set(0, 2.9, -2);
  scene.add(halo);
  const runner = makeRunner();
  runner.scale.setScalar(0.55);
  scene.add(runner);
  return { scene, aff, runner };
}

export { clamp };
