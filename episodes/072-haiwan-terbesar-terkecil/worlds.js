// Episode 072 sets:
//  - the Episode 031 living room with Affan holding an open animal book (a
//    whale on one page, an ant on the other) and a kampung cat;
//  - the ocean (units: metres): a 30 m blue whale, three 10 m school buses,
//    and a long-necked dinosaur standing on the seabed;
//  - the weighing stage: a big balance with the whale's tongue on one pan and
//    an elephant on the other;
//  - the tiny table (units: centimetres): an Etruscan shrew, a coin and a little
//    balance;
//  - the Episode 039 giant hand with a 7 mm frog sitting on a fingernail;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng, clamp, lerp } from '../../shared/core.js';
import { add, glow } from '../../shared/props.js';
import { makeCat, BREEDS } from '../../shared/cat.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildLivingRoom } from '../031-geletek-diri-sendiri/worlds.js';
import { buildHand } from '../039-kuku-panjang/worlds.js';

export { buildOutro };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function gradientSky(top, bot, lo = -0.3, hi = 0.7, r = 400) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, bot: { value: new THREE.Color(bot) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, bot; varying vec3 vP;
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(${lo.toFixed(2)}, ${hi.toFixed(2)}, vP.y)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), mat);
  m.renderOrder = -10;
  return m;
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
// a tapered tube from a chain of spheres along a curve (r0 at the start, r1 at the end)
function taper(parent, curve, r0, r1, mat, n = 24, sy = 1) {
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const p = curve.getPoint(u);
    const r = lerp(r0, r1, u);
    add(parent, new THREE.SphereGeometry(r, 18, 12), mat, [p.x, p.y, p.z], [0, 0, 0], [1, sy, 1]);
  }
}

// ------------------------------------------------------------- blue whale
// 30 units long along x, head at +x, back up (+y).
export function makeWhale() {
  const g = new THREE.Group();
  const L = 30, R = 2.3;
  const prof = (u) => (u > 0.66 ? Math.pow(Math.max(0, 1 - ((u - 0.66) / 0.34) ** 2), 0.55) : 0.1 + 0.9 * Math.pow(Math.sin((u / 0.66) * Math.PI / 2), 1.25));
  const pts = [];
  const NS = 90;
  for (let i = 0; i <= NS; i++) {
    const u = i / NS;
    pts.push(new THREE.Vector2(Math.max(0.001, R * prof(u)), -L / 2 + u * L));
  }
  const geo = new THREE.LatheGeometry(pts, 56);
  geo.rotateZ(-Math.PI / 2); // length along +x
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const u = (x + L / 2) / L;
    const flat = lerp(0.85, 0.55, clamp((u - 0.75) / 0.25));
    p.setXYZ(i, x, y * flat, z);
  }
  geo.computeVertexNormals();
  const n = geo.attributes.normal;
  const col = new Float32Array(p.count * 3);
  const top = new THREE.Color(0x4d6f96), belly = new THREE.Color(0xb8c8d8), c = new THREE.Color();
  const Rn = rng(72);
  const spots = Array.from({ length: 70 }, () => [-L / 2 + Rn() * L, (Rn() - 0.5) * 6, Rn() * 0.5 + 0.25]);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ny = n.getY(i);
    const u = (x + L / 2) / L;
    c.copy(top).lerp(belly, clamp((-ny + 0.15) * 1.4));
    // mottling
    for (const [sx, sz, sr] of spots) {
      const d = Math.hypot(x - sx, z - sz);
      if (d < sr && ny > -0.2) c.lerp(new THREE.Color(0x8aa6c4), 0.45 * (1 - d / sr));
    }
    // throat pleats under the head
    if (ny < -0.35 && u > 0.6 && u < 0.97) {
      const s = 0.5 + 0.5 * Math.sin(z * 9);
      c.lerp(new THREE.Color(0x7c90a8), 0.35 * s);
    }
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
    void y;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const skin = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0, emissive: 0x0a1a30, emissiveIntensity: 0.25 });
  const body = add(g, geo, skin, [0, 0, 0]);
  const fin = std(0x5a7ca4, 0.5, { emissive: 0x0a1a30, emissiveIntensity: 0.25 });
  // pectoral fins
  for (const s of [-1, 1]) add(g, new THREE.SphereGeometry(1, 24, 12), fin, [5.6, -1.0, s * 2.0], [s * 0.5, s * 0.35, -0.35], [2.6, 0.18, 0.7]);
  // small dorsal fin far back
  add(g, new THREE.ConeGeometry(0.45, 0.9, 12), fin, [-7.5, 1.2, 0], [0, 0, 0.6], [1.2, 1, 0.35]);
  // tail flukes
  const fl = new THREE.Shape();
  fl.moveTo(0, 0);
  fl.bezierCurveTo(-0.6, 1.2, -2.2, 3.4, -1.8, 3.9);
  fl.bezierCurveTo(-1.0, 3.2, -0.3, 1.4, 0.3, 0.1);
  fl.bezierCurveTo(-0.3, -1.4, -1.0, -3.2, -1.8, -3.9);
  fl.bezierCurveTo(-2.2, -3.4, -0.6, -1.2, 0, 0);
  const fg = new THREE.ExtrudeGeometry(fl, { depth: 0.2, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2, curveSegments: 16 });
  fg.translate(0, 0, -0.1);
  fg.rotateX(Math.PI / 2);
  const fluke = new THREE.Group();
  fluke.position.set(-L / 2 + 0.3, 0, 0);
  g.add(fluke);
  add(fluke, fg, fin, [0, 0, 0]);
  // surface helpers: a point on the skin at length x, angle phi from the top
  const surf = (x, phi, s = 1) => {
    const u = (x + L / 2) / L;
    const r = R * prof(u);
    const flat = lerp(0.85, 0.55, clamp((u - 0.75) / 0.25));
    return V(x, r * Math.cos(phi) * flat, s * r * Math.sin(phi) * 1.01);
  };
  // mouth line and eyes
  const dark = std(0x1d2a3e, 0.5);
  for (const s of [-1, 1]) {
    const mpts = [];
    for (let i = 0; i <= 16; i++) {
      const x = lerp(8.2, 14.85, i / 16);
      mpts.push(surf(x, lerp(1.95, 2.35, (i / 16) ** 2), s));
    }
    add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mpts), 40, 0.07, 6, false), dark, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    const e = surf(7.6, 1.85, s);
    add(g, new THREE.SphereGeometry(0.2, 14, 10), std(0x101820, 0.2), [e.x, e.y, e.z], [0, 0, 0], [1, 1, 1], false);
    add(g, new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), [e.x + 0.06, e.y + 0.08, e.z + s * 0.15], [0, 0, 0], [1, 1, 1], false);
  }
  // blowholes
  const bh = surf(10.6, 0.02);
  for (const s of [-1, 1]) add(g, new THREE.SphereGeometry(0.16, 10, 8), dark, [bh.x, bh.y, s * 0.18], [0, 0, 0], [1.6, 0.3, 0.7], false);
  g.userData = { body, fluke, L };
  g.userData.swim = (t) => {
    fluke.rotation.z = 0.25 * Math.sin(t * 1.6);
    fluke.position.y = 0.3 * Math.sin(t * 1.6 - 0.6);
  };
  return g;
}

// ------------------------------------------------------------ school bus
// 10 long (x, front at +x), 2.5 wide, 3 tall, wheels at y 0.
export function makeBus(num = 1) {
  const g = new THREE.Group();
  const yellow = std(0xffb81c, 0.45, { emissive: 0x3a2400, emissiveIntensity: 0.25 });
  add(g, new RoundedBoxGeometry(10, 2.6, 2.5, 3, 0.3), yellow, [0, 1.75, 0]);
  add(g, new RoundedBoxGeometry(9.8, 0.25, 2.4, 2, 0.1), std(0xffffff, 0.5), [0, 3.1, 0]);
  const side = canvasTex(1024, 256, (x, W, H) => {
    x.clearRect(0, 0, W, H);
    x.fillStyle = '#20324a';
    x.fillRect(40, 20, W - 140, 90);
    x.fillStyle = '#ffb81c';
    for (let i = 1; i < 8; i++) x.fillRect(40 + i * ((W - 140) / 8) - 6, 20, 12, 90);
    x.fillStyle = 'rgba(160,210,255,0.35)';
    for (let i = 0; i < 8; i++) x.fillRect(50 + i * ((W - 140) / 8), 26, 40, 30);
    x.fillStyle = '#17202e';
    x.fillRect(0, 130, W, 18);
    x.fillStyle = '#17202e';
    x.font = '800 72px "Baloo 2", sans-serif';
    x.textAlign = 'center';
    x.fillText('BAS SEKOLAH', W / 2, 220);
  });
  for (const s of [-1, 1]) {
    const m = add(g, new THREE.PlaneGeometry(9.6, 2.4), new THREE.MeshStandardMaterial({ map: side, transparent: true, roughness: 0.5 }), [0, 1.85, s * 1.26], [0, s < 0 ? Math.PI : 0, 0], [1, 1, 1], false);
    if (s < 0) m.scale.x = 1;
  }
  // front: windscreen, lights, bumper
  add(g, new THREE.PlaneGeometry(2.1, 1.0), std(0x20324a, 0.2, { emissive: 0x0a1a30, emissiveIntensity: 0.3 }), [5.01, 2.4, 0], [0, Math.PI / 2, 0], [1, 1, 1], false);
  for (const s of [-1, 1]) add(g, new THREE.CircleGeometry(0.18, 16), std(0xfff6c8, 0.2, { emissive: 0xffe8a0, emissiveIntensity: 0.8 }), [5.02, 1.2, s * 0.85], [0, Math.PI / 2, 0], [1, 1, 1], false);
  add(g, new RoundedBoxGeometry(0.3, 0.35, 2.6, 2, 0.1), std(0x22262e, 0.6), [5.0, 0.6, 0]);
  add(g, new RoundedBoxGeometry(0.3, 0.35, 2.6, 2, 0.1), std(0x22262e, 0.6), [-5.0, 0.6, 0]);
  for (const x of [-3.3, 3.0]) for (const s of [-1, 1]) {
    add(g, new THREE.CylinderGeometry(0.55, 0.55, 0.35, 20), std(0x1c1f26, 0.7), [x, 0.55, s * 1.15], [Math.PI / 2, 0, 0]);
    add(g, new THREE.CylinderGeometry(0.26, 0.26, 0.37, 14), std(0xc8ccd6, 0.3), [x, 0.55, s * 1.15], [Math.PI / 2, 0, 0]);
  }
  g.userData.num = num;
  return g;
}

// --------------------------------------------------------------- elephant
// about 3.2 tall, facing +x, feet at y 0.
export function makeElephant() {
  const g = new THREE.Group();
  const grey = std(0x9aa0ac, 0.75, { emissive: 0x15161a, emissiveIntensity: 0.25 });
  add(g, new THREE.SphereGeometry(1, 32, 20), grey, [0, 2.0, 0], [0, 0, 0], [1.9, 1.2, 1.2]);
  for (const [x, z] of [[1.1, 0.6], [1.1, -0.6], [-1.1, 0.6], [-1.1, -0.6]]) {
    add(g, new THREE.CylinderGeometry(0.36, 0.4, 1.6, 16), grey, [x, 0.8, z]);
    add(g, new THREE.CylinderGeometry(0.42, 0.42, 0.12, 16), std(0xd8d4cc, 0.6), [x, 0.06, z]);
  }
  const head = new THREE.Group();
  head.position.set(2.0, 2.6, 0);
  g.add(head);
  add(head, new THREE.SphereGeometry(0.85, 28, 20), grey, [0, 0, 0], [1, 1, 0.95]);
  for (const s of [-1, 1]) add(head, new THREE.SphereGeometry(1, 24, 16), std(0x8f95a2, 0.8), [-0.3, 0.05, s * 0.85], [0, s * 0.3, 0], [0.75, 0.95, 0.12]);
  const trunk = new THREE.CatmullRomCurve3([V(0.65, -0.2, 0), V(1.0, -0.8, 0), V(1.1, -1.5, 0), V(1.35, -1.9, 0)]);
  taper(head, trunk, 0.34, 0.14, grey, 20);
  for (const s of [-1, 1]) {
    add(head, new THREE.ConeGeometry(0.08, 0.6, 10), std(0xfff8e8, 0.4), [0.75, -0.55, s * 0.32], [0, 0, -2.3]);
    add(head, new THREE.SphereGeometry(0.09, 12, 10), std(0x141418, 0.3), [0.6, 0.25, s * 0.55]);
    add(head, new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0.66, 0.29, s * 0.6], [0, 0, 0], [1, 1, 1], false);
  }
  const tail = new THREE.CatmullRomCurve3([V(-1.85, 2.2, 0), V(-2.1, 1.7, 0), V(-2.15, 1.2, 0)]);
  taper(g, tail, 0.07, 0.04, grey, 8);
  g.userData.head = head;
  return g;
}

// ---------------------------------------------------- long-necked dinosaur
// about 22 long and 12 tall (a sauropod), facing +x, feet at y 0.
export function makeDino() {
  const g = new THREE.Group();
  const green = std(0x6faa5a, 0.7, { emissive: 0x0a1a08, emissiveIntensity: 0.25 });
  const belly = std(0xc8d890, 0.7);
  add(g, new THREE.SphereGeometry(1, 32, 20), green, [0, 5.4, 0], [0, 0, 0], [4.6, 2.3, 2.0]);
  add(g, new THREE.SphereGeometry(1, 24, 16), belly, [0, 4.6, 0], [0, 0, 0], [4.0, 1.5, 1.7]);
  for (const [x, z] of [[2.6, 1.2], [2.6, -1.2], [-2.6, 1.2], [-2.6, -1.2]]) add(g, new THREE.CylinderGeometry(0.7, 0.85, 4.6, 16), green, [x, 2.3, z]);
  const neck = new THREE.CatmullRomCurve3([V(3.6, 6.4, 0), V(5.6, 8.8, 0), V(6.8, 11.0, 0), V(7.6, 12.0, 0)]);
  taper(g, neck, 1.3, 0.45, green, 26);
  const head = new THREE.Group();
  head.position.set(8.2, 12.1, 0);
  g.add(head);
  add(head, new THREE.SphereGeometry(0.75, 20, 14), green, [0, 0, 0], [1.5, 0.8, 0.9]);
  for (const s of [-1, 1]) {
    add(head, new THREE.SphereGeometry(0.14, 12, 10), std(0x141418, 0.3), [0.4, 0.25, s * 0.55]);
    add(head, new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0.46, 0.3, s * 0.65], [0, 0, 0], [1, 1, 1], false);
  }
  add(head, new THREE.TorusGeometry(0.4, 0.04, 6, 16, Math.PI * 0.7), std(0x2a3a20, 0.5), [0.55, -0.15, 0], [0, 0, -2.2], [1.2, 0.6, 1], false);
  const tail = new THREE.CatmullRomCurve3([V(-4.0, 5.6, 0), V(-7.0, 4.8, 0), V(-10.5, 3.6, 0), V(-13.5, 2.8, 0.6)]);
  taper(g, tail, 1.4, 0.15, green, 30);
  // back spots
  const R = rng(5);
  for (let i = 0; i < 10; i++) add(g, new THREE.SphereGeometry(0.35 + R() * 0.25, 12, 8), std(0x4f8a42, 0.7), [-3 + i * 0.7, 7.5 - Math.abs(i - 4.5) * 0.12, (R() - 0.5) * 1.2], [0, 0, 0], [1, 0.25, 1]);
  return g;
}

// ------------------------------------------------------------- the ocean
export const SEABED = -14;
export function buildOcean() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1a5f9a, 0.009);
  const sky = gradientSky(0x6fd6ff, 0x082a5a, -0.5, 0.9);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xcfefff, 0x1a3050, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(-10, 40, 20);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8fd0ff, 0.8);
  fill.position.set(20, -5, 30);
  scene.add(fill);
  // light rays from the surface
  const rayMat = new THREE.MeshBasicMaterial({ color: 0xcff4ff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const rays = [];
  const R = rng(720);
  for (let i = 0; i < 9; i++) {
    const m = add(scene, new THREE.PlaneGeometry(2 + R() * 3, 80), rayMat.clone(), [-30 + i * 8 + R() * 4, 10, -20 - R() * 15], [0, 0, 0.25 + R() * 0.1], [1, 1, 1], false);
    m.userData.ph = R() * 6;
    rays.push(m);
  }
  // seabed with rocks and seaweed
  const sand = std(0xd8c49a, 0.95);
  add(scene, new THREE.PlaneGeometry(400, 400), sand, [0, SEABED, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  for (let i = 0; i < 26; i++) {
    const x = (R() - 0.5) * 90, z = -10 - R() * 40;
    add(scene, new THREE.SphereGeometry(1 + R() * 2.5, 12, 8), std([0x7a8a9a, 0x6a7a8a, 0x8a8a7a][i % 3], 0.9), [x, SEABED, z], [0, R() * 3, 0], [1.3, 0.6, 1]);
    if (i % 2) for (let k = 0; k < 3; k++) add(scene, new THREE.CylinderGeometry(0.12, 0.2, 3 + R() * 4, 6), std(0x3f9a5a, 0.8), [x + k * 0.6 - 0.6, SEABED + 2, z + 1.5], [0, 0, (R() - 0.5) * 0.4]);
  }
  // bubbles
  const bubbles = [];
  for (let i = 0; i < 40; i++) {
    const b = glow(0xe8fbff, 0.4 + R() * 0.6, 0.6);
    b.userData = { x: (R() - 0.5) * 40, z: (R() - 0.5) * 20, sp: 1 + R() * 2, ph: R() * 40 };
    scene.add(b);
    bubbles.push(b);
  }
  const whale = makeWhale();
  scene.add(whale);
  const buses = [1, 2, 3].map((n) => {
    const b = makeBus(n);
    scene.add(b);
    return b;
  });
  const dino = makeDino();
  scene.add(dino);
  return {
    scene, sky, whale, buses, dino,
    update(t) {
      rays.forEach((m) => (m.material.opacity = 0.07 + 0.05 * Math.sin(t * 0.8 + m.userData.ph)));
      bubbles.forEach((b) => {
        const u = b.userData;
        b.position.set(u.x + Math.sin(t + u.ph) * 0.4, ((t * u.sp + u.ph) % 40) - 20, u.z);
      });
      whale.userData.swim(t);
    },
  };
}

// ----------------------------------------------------------- the balance
// A beam balance: 'tilt' > 0 puts the left pan down. Pans hang from the ends.
export function makeBalance(span = 14, panR = 3, postH = 9, color = 0xff8a3d) {
  const g = new THREE.Group();
  const metal = std(color, 0.4, { emissive: 0x301000, emissiveIntensity: 0.2 });
  const dark = std(0x30384a, 0.5);
  add(g, new THREE.CylinderGeometry(postH * 0.04, postH * 0.06, postH, 20), dark, [0, postH / 2, 0]);
  add(g, new THREE.CylinderGeometry(postH * 0.25, postH * 0.3, postH * 0.05, 32), dark, [0, postH * 0.025, 0]);
  const beam = new THREE.Group();
  beam.position.set(0, postH, 0);
  g.add(beam);
  add(beam, new RoundedBoxGeometry(span, postH * 0.04, postH * 0.06, 2, postH * 0.015), metal, [0, 0, 0]);
  add(beam, new THREE.SphereGeometry(postH * 0.05, 16, 12), metal, [0, 0, 0]);
  const drop = postH * 0.55;
  const pans = [-1, 1].map((s) => {
    const pan = new THREE.Group();
    g.add(pan);
    add(pan, new THREE.CylinderGeometry(panR, panR * 0.8, postH * 0.04, 40), metal, [0, 0, 0]);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const from = V(Math.cos(a) * panR * 0.9, 0, Math.sin(a) * panR * 0.9);
      const to = V(0, drop, 0);
      const mid = from.clone().add(to).multiplyScalar(0.5);
      const len = from.distanceTo(to);
      const rod = add(pan, new THREE.CylinderGeometry(postH * 0.006, postH * 0.006, len, 6), dark, [mid.x, mid.y, mid.z], [0, 0, 0], [1, 1, 1], false);
      rod.quaternion.setFromUnitVectors(V(0, 1, 0), to.clone().sub(from).normalize());
    }
    pan.userData.s = s;
    return pan;
  });
  g.userData = { beam, pans, span, drop, postH };
  g.userData.set = (tilt) => {
    beam.rotation.z = tilt;
    pans.forEach((pan) => {
      const s = pan.userData.s;
      const end = V((s * span) / 2 * Math.cos(tilt), postH + (s * span) / 2 * Math.sin(tilt), 0);
      pan.position.set(end.x, end.y - drop, 0);
    });
  };
  g.userData.set(0);
  return g;
}

export function buildScale() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x8fd8ff, 0xfff0d8, -0.2, 0.6);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa09080, 1.5));
  const key = new THREE.DirectionalLight(0xfff4e8, 2.2);
  key.position.set(-6, 14, 12);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14 });
  key.shadow.bias = -0.0004;
  scene.add(key);
  add(scene, new THREE.CylinderGeometry(14, 14.5, 0.6, 64), std(0xbfe0f0, 0.85), [0, -0.3, 0], [0, 0, 0], [1, 1, 1], false).receiveShadow = true;
  const bal = makeBalance(12, 3.0, 10.5);
  scene.add(bal);
  // the whale's tongue: a big pink, slightly lumpy blob
  const tongue = new THREE.Group();
  const tg = new THREE.SphereGeometry(1, 40, 24);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), y = tp.getY(i), z = tp.getZ(i);
    tp.setXYZ(i, x * 2.4, y * (0.9 - 0.25 * Math.abs(x)) + 0.06 * Math.sin(z * 9), z * 1.6 * (1 - 0.15 * x));
  }
  tg.computeVertexNormals();
  add(tongue, tg, std(0xff7a9a, 0.35, { emissive: 0x401020, emissiveIntensity: 0.3 }), [0, 0.85, 0]);
  add(tongue, new THREE.BoxGeometry(3.6, 0.05, 0.08), std(0xd04a6a, 0.5), [0, 1.72, 0], [0, 0, 0], [1, 1, 1], false);
  scene.add(tongue);
  const elephant = makeElephant();
  scene.add(elephant);
  return { scene, sky, bal, tongue, elephant };
}

// ------------------------------------------------------- the tiny table
// units: centimetres. The Etruscan shrew: ~4 cm body, ~3 cm tail, facing +x.
export function makeShrew() {
  const g = new THREE.Group();
  const fur = std(0x8a735e, 0.9, { emissive: 0x1a1008, emissiveIntensity: 0.2 });
  const pale = std(0xcdb8a0, 0.9);
  const pink = std(0xf0a0a0, 0.5);
  add(g, new THREE.SphereGeometry(1, 32, 20), fur, [0, 0.85, 0], [0, 0, 0], [2.0, 0.85, 0.9]);
  add(g, new THREE.SphereGeometry(1, 24, 16), pale, [0.1, 0.62, 0], [0, 0, 0], [1.7, 0.55, 0.75]);
  const head = new THREE.Group();
  head.position.set(1.75, 1.0, 0);
  g.add(head);
  add(head, new THREE.SphereGeometry(0.62, 24, 16), fur, [0, 0, 0], [1.1, 0.9, 0.9]);
  add(head, new THREE.ConeGeometry(0.34, 1.3, 16), fur, [0.9, -0.12, 0], [0, 0, -Math.PI / 2 - 0.15], [1, 1, 0.85]);
  add(head, new THREE.SphereGeometry(0.1, 12, 10), pink, [1.55, -0.22, 0]);
  for (const s of [-1, 1]) {
    add(head, new THREE.SphereGeometry(0.1, 12, 10), std(0x0c0c10, 0.15), [0.42, 0.2, s * 0.42]);
    add(head, new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0.47, 0.24, s * 0.5], [0, 0, 0], [1, 1, 1], false);
    add(head, new THREE.SphereGeometry(0.34, 18, 12), std(0xd89a90, 0.6), [-0.15, 0.5, s * 0.38], [0, 0, s * 0.3], [0.9, 1, 0.25]);
    for (let k = 0; k < 3; k++) add(head, new THREE.CylinderGeometry(0.008, 0.008, 0.9, 4), std(0xf6f0e8, 0.5), [1.25, -0.15, s * 0.35], [0, 0, 0], [1, 1, 1], false).rotation.set(s * (0.9 + k * 0.25), 0, Math.PI / 2 + (k - 1) * 0.2);
  }
  const tail = new THREE.CatmullRomCurve3([V(-1.8, 0.75, 0), V(-2.8, 0.45, 0.3), V(-4.4, 0.25, 0.5)]);
  taper(g, tail, 0.17, 0.07, std(0xb89a88, 0.8), 18);
  for (const [x, z] of [[1.1, 0.5], [1.1, -0.5], [-1.0, 0.55], [-1.0, -0.55]]) add(g, new THREE.SphereGeometry(0.16, 10, 8), pink, [x, 0.12, z], [0, 0, 0], [1.6, 0.6, 1]);
  g.userData.head = head;
  return g;
}
export function makeCoin(r = 0.94) {
  const g = new THREE.Group();
  const face = canvasTex(256, 256, (x, W) => {
    const gr = x.createRadialGradient(W * 0.4, W * 0.35, 10, W / 2, W / 2, W / 2);
    gr.addColorStop(0, '#f4f6fa');
    gr.addColorStop(1, '#9aa2b2');
    x.fillStyle = gr;
    x.fillRect(0, 0, W, W);
    x.strokeStyle = '#7a8292';
    x.lineWidth = 10;
    x.beginPath();
    x.arc(W / 2, W / 2, W * 0.42, 0, Math.PI * 2);
    x.stroke();
    x.fillStyle = '#5a6272';
    x.textAlign = 'center';
    x.font = '800 110px "Baloo 2", sans-serif';
    x.fillText('10', W / 2, W * 0.58);
    x.font = '800 44px "Baloo 2", sans-serif';
    x.fillText('SEN', W / 2, W * 0.78);
  });
  const rim = std(0xb8bec8, 0.25, { metalness: 0.7 });
  const top = new THREE.MeshStandardMaterial({ map: face, roughness: 0.3, metalness: 0.4 });
  const m = add(g, new THREE.CylinderGeometry(r, r, 0.15, 48), [rim, top, top], [0, 0.075, 0]);
  void m;
  return g;
}
export function buildTiny() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf6e8d4);
  scene.add(new THREE.HemisphereLight(0xfff6ec, 0x8a6a4a, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-6, 12, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 });
  key.shadow.bias = -0.0003;
  scene.add(key);
  const wood = canvasTex(1024, 1024, (x, W, H) => {
    x.fillStyle = '#c98a4a';
    x.fillRect(0, 0, W, H);
    const R = rng(3);
    for (let i = 0; i < 90; i++) {
      x.strokeStyle = `rgba(${120 + R() * 40},${70 + R() * 30},${30 + R() * 20},${0.25 + R() * 0.3})`;
      x.lineWidth = 2 + R() * 5;
      const y = R() * H;
      x.beginPath();
      x.moveTo(0, y);
      x.bezierCurveTo(W * 0.3, y + (R() - 0.5) * 40, W * 0.6, y + (R() - 0.5) * 40, W, y + (R() - 0.5) * 30);
      x.stroke();
    }
  });
  add(scene, new THREE.PlaneGeometry(80, 80), std(0xffffff, 0.6, { map: wood }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  // soft bokeh behind
  const R = rng(73);
  for (let i = 0; i < 14; i++) {
    const b = glow([0xffd8a0, 0xbfe6ff, 0xffc0d0][i % 3], 4 + R() * 6, 0.35);
    b.position.set((R() - 0.5) * 40, 6 + R() * 16, -25 - R() * 10);
    scene.add(b);
  }
  const shrew = makeShrew();
  scene.add(shrew);
  const coin = makeCoin();
  scene.add(coin);
  const bal = makeBalance(9, 1.5, 6, 0xffb02e);
  scene.add(bal);
  const shrew2 = makeShrew();
  scene.add(shrew2);
  const coin2 = makeCoin();
  scene.add(coin2);
  // a pencil for scale
  const pencil = new THREE.Group();
  pencil.position.set(-6, 0.4, 3.5);
  pencil.rotation.y = 0.3;
  scene.add(pencil);
  add(pencil, new THREE.CylinderGeometry(0.4, 0.4, 12, 6), std(0xffd84a, 0.5), [0, 0, 0], [0, 0, Math.PI / 2]);
  add(pencil, new THREE.ConeGeometry(0.4, 1.4, 6), std(0xf0c890, 0.6), [6.7, 0, 0], [0, 0, -Math.PI / 2]);
  add(pencil, new THREE.CylinderGeometry(0.42, 0.42, 1.0, 12), std(0xff8ab0, 0.6), [-6.5, 0, 0], [0, 0, Math.PI / 2]);
  return { scene, shrew, coin, bal, shrew2, coin2, pencil };
}

// ------------------------------------------------------------ the frog
// a tiny frog (Paedophryne): length 1 along +x (nose at +x), sitting
export function makeFrog() {
  const g = new THREE.Group();
  const brown = std(0x7a5a38, 0.6, { emissive: 0x1a1008, emissiveIntensity: 0.25 });
  const light = std(0xd8a060, 0.6);
  add(g, new THREE.SphereGeometry(0.42, 24, 16), brown, [0, 0.3, 0], [0, 0, 0.25], [1.15, 0.75, 0.85]);
  add(g, new THREE.SphereGeometry(0.32, 20, 14), brown, [0.38, 0.42, 0], [0, 0, 0], [1, 0.75, 1]);
  add(g, new THREE.SphereGeometry(0.28, 16, 12), light, [0.3, 0.22, 0], [0, 0, 0], [1, 0.5, 0.8]);
  for (const s of [-1, 1]) {
    add(g, new THREE.SphereGeometry(0.11, 14, 10), brown, [0.45, 0.6, s * 0.18]);
    add(g, new THREE.SphereGeometry(0.08, 12, 10), std(0x101010, 0.15), [0.5, 0.62, s * 0.23]);
    add(g, new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0.55, 0.66, s * 0.28], [0, 0, 0], [1, 1, 1], false);
    add(g, new THREE.SphereGeometry(0.15, 12, 10), brown, [-0.25, 0.15, s * 0.32], [0, 0, 0], [1.4, 0.7, 0.8]);
    add(g, new THREE.SphereGeometry(0.08, 10, 8), brown, [0.35, 0.05, s * 0.25], [0, 0, 0], [1.6, 0.5, 1]);
    add(g, new THREE.SphereGeometry(0.08, 10, 8), light, [0.05, 0.03, s * 0.42], [0, 0, 0], [2.0, 0.4, 1.2]);
  }
  add(g, new THREE.TorusGeometry(0.16, 0.015, 6, 16, Math.PI * 0.7), std(0x3a2416, 0.5), [0.62, 0.38, 0], [Math.PI / 2, 0, -0.4], [1, 1, 1], false);
  for (let i = 0; i < 5; i++) add(g, new THREE.SphereGeometry(0.06, 8, 6), std(0xe8783a, 0.6), [-0.25 + i * 0.12, 0.55 - Math.abs(i - 2) * 0.03, (i % 2 - 0.5) * 0.2], [0, 0, 0], [1, 0.4, 1], false);
  return g;
}
export function buildHandFrog() {
  const w = buildHand();
  w.setNails(0.12, 0);
  const frog = makeFrog();
  frog.scale.setScalar(0.24);
  w.scene.add(frog);
  return { ...w, frog };
}

// ----------------------------------------------------------- living room
export const A_STAND = new THREE.Vector3(0.6, 0, 0.6);
function pageTex(kind) {
  return canvasTex(512, 640, (x, W, H) => {
    x.fillStyle = '#fffaf0';
    x.fillRect(0, 0, W, H);
    x.strokeStyle = '#e8dcc0';
    x.lineWidth = 3;
    for (let y = 520; y < H - 30; y += 28) {
      x.beginPath();
      x.moveTo(50, y);
      x.lineTo(W - 50, y);
      x.stroke();
    }
    x.fillStyle = '#17256b';
    x.font = '800 64px "Baloo 2", sans-serif';
    x.textAlign = 'center';
    if (kind === 'whale') {
      x.fillStyle = '#cdeeff';
      x.fillRect(30, 60, W - 60, 380);
      x.fillStyle = '#4d6f96';
      x.beginPath();
      x.ellipse(W / 2, 250, 190, 70, 0, 0, Math.PI * 2);
      x.fill();
      x.beginPath();
      x.moveTo(W / 2 - 170, 250);
      x.lineTo(W / 2 - 245, 190);
      x.lineTo(W / 2 - 230, 250);
      x.lineTo(W / 2 - 245, 310);
      x.fill();
      x.fillStyle = '#b8c8d8';
      x.beginPath();
      x.ellipse(W / 2 + 40, 285, 140, 30, 0, 0, Math.PI);
      x.fill();
      x.fillStyle = '#101820';
      x.beginPath();
      x.arc(W / 2 + 130, 240, 9, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#ffffff';
      for (let i = 0; i < 3; i++) {
        x.beginPath();
        x.arc(W / 2 + 90 - i * 18, 150 - i * 30, 10 - i * 2, 0, Math.PI * 2);
        x.fill();
      }
      x.fillStyle = '#17256b';
      x.fillText('PAUS', W / 2, 500);
    } else {
      x.fillStyle = '#e8f6d8';
      x.fillRect(30, 60, W - 60, 380);
      x.fillStyle = '#5a2a1a';
      for (const [cx, cy, r] of [[W / 2 - 70, 260, 34], [W / 2, 250, 26], [W / 2 + 72, 255, 44]]) {
        x.beginPath();
        x.ellipse(cx, cy, r * 1.1, r, 0, 0, Math.PI * 2);
        x.fill();
      }
      x.strokeStyle = '#5a2a1a';
      x.lineWidth = 7;
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
        x.beginPath();
        x.moveTo(W / 2 - 20 + k * 25, 255);
        x.lineTo(W / 2 - 45 + k * 40, 255 + s * 70);
        x.stroke();
      }
      x.beginPath();
      x.moveTo(W / 2 - 95, 240);
      x.quadraticCurveTo(W / 2 - 130, 180, W / 2 - 150, 175);
      x.stroke();
      x.fillStyle = '#17256b';
      x.fillText('SEMUT', W / 2, 500);
    }
  });
}
export function makeBook() {
  const g = new THREE.Group();
  add(g, new RoundedBoxGeometry(1.9, 1.25, 0.06, 2, 0.02), std(0x2f7bff, 0.6), [0, 0, -0.05]);
  const pw = 0.9, ph = 1.15;
  const L = new THREE.Group(), R = new THREE.Group();
  g.add(L, R);
  add(L, new THREE.BoxGeometry(pw, ph, 0.05), std(0xfffaf0, 0.9), [-pw / 2, 0, 0]);
  add(L, new THREE.PlaneGeometry(pw * 0.96, ph * 0.96), new THREE.MeshStandardMaterial({ map: pageTex('whale'), roughness: 0.9 }), [-pw / 2, 0, 0.027], [0, 0, 0], [1, 1, 1], false);
  add(R, new THREE.BoxGeometry(pw, ph, 0.05), std(0xfffaf0, 0.9), [pw / 2, 0, 0]);
  add(R, new THREE.PlaneGeometry(pw * 0.96, ph * 0.96), new THREE.MeshStandardMaterial({ map: pageTex('ant'), roughness: 0.9 }), [pw / 2, 0, 0.027], [0, 0, 0], [1, 1, 1], false);
  L.rotation.y = 0.18;
  R.rotation.y = -0.18;
  return g;
}
export function buildRoom() {
  const w = buildLivingRoom();
  w.kak.root.visible = false;
  const book = makeBook();
  w.scene.add(book);
  const cat = makeCat(BREEDS.kampung, { seed: 72 });
  w.scene.add(cat.root);
  return { ...w, book, cat };
}
