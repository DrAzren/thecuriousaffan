// Episode 071 sets:
//  - a cosy nursery (bilik bayi): pastel walls, a window, a cot with Affan's
//    new baby cousin (swaddled, sleeping), a star mobile, balloons, Mama and
//    Affan beside the cot;
//  - the "kira bayi" stage: a bright round stage where little baby bundles pop
//    up in a grid, two bars (2023 vs 2024), a mum with 1.6 children, babies
//    that grow into a doctor, a teacher and a firefighter, and a toy town with
//    a school and a hospital;
//  - the seesaw stage: many atuk and nenek on one end, only a few young people
//    on the other;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan, AFFAN } from '../../shared/affan.js';
import { add, glow } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { makeKakak } from '../031-geletek-diri-sendiri/worlds.js';
import { makeMama, MAMA } from '../038-bawang-menangis/worlds.js';

export { buildOutro };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const SKIN = AFFAN.skin;

function gradientSky(top, bot, lo = -0.3, hi = 0.7) {
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
  const m = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), mat);
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
const near = (c, hex) => {
  const d = new THREE.Color(hex);
  return Math.abs(c.r - d.r) + Math.abs(c.g - d.g) + Math.abs(c.b - d.b) < 0.01;
};
// recolour a character's own materials: pairs [[fromHex, toHex], ...]
function recolor(root, pairs) {
  const done = new Set();
  root.traverse((o) => {
    if (!o.isMesh || !o.material || !o.material.color || done.has(o.material)) return;
    done.add(o.material);
    for (const [from, to] of pairs) {
      if (!near(o.material.color, from)) continue;
      o.material.color.setHex(to);
      break;
    }
  });
}

// ------------------------------------------------------------- the baby
// A swaddled baby lying along +x (head at -x), face up (+y). 'smile' 0..1.
export function makeBaby({ wrap = 0xffc2d6, hat = 0xffe08a, s = 1 } = {}) {
  const g = new THREE.Group();
  const skin = std(SKIN, 0.55, { emissive: 0x3a1608, emissiveIntensity: 0.15 });
  const wrapM = std(wrap, 0.9, { emissive: 0x200810, emissiveIntensity: 0.15 });
  add(g, new THREE.CapsuleGeometry(0.26, 0.5, 8, 16), wrapM, [0.32, 0, 0], [0, 0, Math.PI / 2], [1, 1, 0.85]);
  // the blanket fold across the chest
  add(g, new THREE.TorusGeometry(0.25, 0.06, 8, 24, Math.PI), std(0xffffff, 0.9), [0.08, 0.02, 0], [0, Math.PI / 2, 0], [1, 1, 0.9]);
  const head = new THREE.Group();
  head.position.set(-0.2, 0.04, 0);
  g.add(head);
  add(head, new THREE.SphereGeometry(0.26, 32, 24), skin, [0, 0, 0]);
  add(head, new THREE.SphereGeometry(0.27, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), std(hat, 0.9), [-0.04, 0, 0], [0, 0, Math.PI / 2 + 0.25]);
  add(head, new THREE.SphereGeometry(0.06, 12, 10), std(0xffffff, 0.9), [-0.3, 0.06, 0]);
  // face looks up (+y): eyes closed (little arcs), cheeks, nose, mouth
  const dark = std(0x3a2016, 0.5);
  const lids = [];
  for (const z of [-0.09, 0.09]) lids.push(add(head, new THREE.TorusGeometry(0.045, 0.012, 6, 16, Math.PI), dark, [0.03, 0.245, z], [Math.PI / 2, 0, Math.PI / 2], [1, 1, 1], false));
  for (const z of [-0.15, 0.15]) add(head, new THREE.SphereGeometry(0.05, 12, 10), std(0xff9a9a, 0.8, { transparent: true, opacity: 0.7 }), [0.1, 0.2, z], [0, 0, 0], [1, 0.4, 1], false);
  add(head, new THREE.SphereGeometry(0.03, 10, 8), skin, [0.1, 0.26, 0]);
  const mouth = add(head, new THREE.TorusGeometry(0.04, 0.012, 6, 16, Math.PI), std(0xa8524a, 0.5), [0.17, 0.235, 0], [Math.PI / 2, 0, -Math.PI / 2], [1, 1, 1], false);
  g.scale.setScalar(s);
  g.userData = { head, mouth, lids };
  g.userData.breathe = (t) => {
    g.children[0].scale.set(1 + 0.03 * Math.sin(t * 2.4), 1, 0.85 + 0.03 * Math.sin(t * 2.4));
  };
  return g;
}

// an upright mini baby bundle (for counting): head on top of a swaddle
function makeBundle(wrap) {
  const g = new THREE.Group();
  add(g, new THREE.CapsuleGeometry(0.2, 0.28, 6, 12), std(wrap, 0.85, { emissive: wrap, emissiveIntensity: 0.08 }), [0, 0.34, 0], [0, 0, 0], [1, 1, 0.85], false);
  add(g, new THREE.SphereGeometry(0.19, 18, 14), std(SKIN, 0.55, { emissive: 0x3a1608, emissiveIntensity: 0.15 }), [0, 0.78, 0], [0, 0, 0], [1, 1, 1], false);
  add(g, new THREE.SphereGeometry(0.2, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.4), std(0xffffff, 0.9), [0, 0.8, -0.02], [-0.3, 0, 0], [1, 1, 1], false);
  for (const x of [-0.065, 0.065]) add(g, new THREE.SphereGeometry(0.025, 8, 6), std(0x2a1810, 0.4), [x, 0.8, 0.17], [0, 0, 0], [1, 0.6, 1], false);
  add(g, new THREE.SphereGeometry(0.035, 8, 6), std(0xff9a9a, 0.8), [0.11, 0.74, 0.15], [0, 0, 0], [1, 0.5, 1], false);
  add(g, new THREE.SphereGeometry(0.035, 8, 6), std(0xff9a9a, 0.8), [-0.11, 0.74, 0.15], [0, 0, 0], [1, 0.5, 1], false);
  return g;
}

// ---------------------------------------------------------------- nursery
export const A_NUR = new THREE.Vector3(1.25, 0, 0.55); // Affan beside the cot
export const MAMA_NUR = new THREE.Vector3(-2.3, 0, -1.0);
export const COT = new THREE.Vector3(0, 0, -0.4);
export function buildNursery() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4ecdf);
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0x9a8a7a, 1.4));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.4);
  key.position.set(-5, 9, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 });
  key.shadow.bias = -0.0004;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdcecff, 0.8);
  fill.position.set(6, 4, 6);
  scene.add(fill);
  const floorTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#e8c9a0';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#e2c093' : '#edd0a8';
      g.fillRect(0, i * 64, w, 62);
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(4, 4);
  add(scene, new THREE.PlaneGeometry(30, 30), std(0xffffff, 0.85, { map: floorTex }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  const wallTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#cdeee0';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      g.beginPath();
      g.arc(x * 64 + (y % 2) * 32 + 16, y * 64 + 32, 7, 0, Math.PI * 2);
      g.fill();
    }
  });
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(6, 3);
  add(scene, new THREE.PlaneGeometry(30, 12), std(0xffffff, 0.95, { map: wallTex }), [0, 6, -3.2], [0, 0, 0], [1, 1, 1], false).receiveShadow = true;
  add(scene, new THREE.PlaneGeometry(16, 12), std(0xffd6e2, 0.95), [-6.5, 6, 3], [0, Math.PI / 2, 0], [1, 1, 1], false).receiveShadow = true;
  add(scene, new THREE.BoxGeometry(30, 0.3, 0.08), std(0xffffff, 0.6), [0, 0.15, -3.15], [0, 0, 0], [1, 1, 1], false);
  // window
  const win = new THREE.Group();
  win.position.set(2.8, 3.9, -3.15);
  scene.add(win);
  const sky = canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#8fd0ff');
    gr.addColorStop(1, '#e8f6ff');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(80, 90, 26, 0, Math.PI * 2);
    g.arc(110, 80, 32, 0, Math.PI * 2);
    g.arc(140, 92, 24, 0, Math.PI * 2);
    g.fill();
  });
  add(win, new THREE.PlaneGeometry(2.2, 2.4), new THREE.MeshBasicMaterial({ map: sky }), [0, 0, 0.01], [0, 0, 0], [1, 1, 1], false);
  for (const [x, y, w, h] of [[0, 1.25, 2.5, 0.16], [0, -1.25, 2.6, 0.2], [-1.17, 0, 0.16, 2.6], [1.17, 0, 0.16, 2.6], [0, 0, 0.08, 2.4]]) add(win, new THREE.BoxGeometry(w, h, 0.12), std(0xffffff, 0.5), [x, y, 0.06]);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) add(win, new THREE.CylinderGeometry(0.15, 0.18, 3.0, 12), std(0xfff0a8, 0.9), [s * (1.35 + i * 0.2), -0.1, 0.25], [0, 0, 0], [1, 1, 0.6]);
  // a name banner above the cot (bunting)
  const R = rng(71);
  for (let i = 0; i < 9; i++) {
    const x = -2.4 + i * 0.6;
    const y = 4.7 - 0.25 * Math.sin((i / 8) * Math.PI);
    add(scene, new THREE.ConeGeometry(0.2, 0.42, 3), std([0xff9ab8, 0xffd84a, 0x8fd0ff, 0x9fe6b0][i % 4], 0.8), [x, y - 0.2, -3.1], [Math.PI, 0, 0], [1, 1, 0.15]);
  }
  // rug
  add(scene, new THREE.CircleGeometry(2.8, 48), std(0xfff3c4, 0.95), [0.3, 0.012, 0.6], [-Math.PI / 2, 0, 0], [1.3, 1, 1], false).receiveShadow = true;
  // the cot
  const cot = new THREE.Group();
  cot.position.copy(COT);
  scene.add(cot);
  const wood = std(0xffffff, 0.5);
  const CW = 2.6, CD = 1.3, TOP = 1.55;
  for (const x of [-CW / 2, CW / 2]) for (const z of [-CD / 2, CD / 2]) add(cot, new THREE.CylinderGeometry(0.06, 0.06, TOP + 0.1, 10), wood, [x, (TOP + 0.1) / 2, z]);
  for (const z of [-CD / 2, CD / 2]) {
    add(cot, new RoundedBoxGeometry(CW + 0.1, 0.08, 0.1, 2, 0.03), wood, [0, TOP, z]);
    add(cot, new RoundedBoxGeometry(CW + 0.1, 0.08, 0.1, 2, 0.03), wood, [0, 0.72, z]);
    for (let i = 1; i < 12; i++) add(cot, new THREE.CylinderGeometry(0.025, 0.025, TOP - 0.72, 6), wood, [-CW / 2 + (i * CW) / 12, (TOP + 0.72) / 2, z]);
  }
  for (const x of [-CW / 2, CW / 2]) add(cot, new RoundedBoxGeometry(0.08, TOP - 0.5, CD, 2, 0.03), std(0xbfe6ff, 0.6), [x, (TOP + 0.5) / 2 + 0.1, 0]);
  add(cot, new RoundedBoxGeometry(CW - 0.05, 0.22, CD - 0.05, 2, 0.06), std(0xffffff, 0.9), [0, 0.86, 0]);
  add(cot, new RoundedBoxGeometry(0.7, 0.12, 0.5, 2, 0.06), std(0xfff0a8, 0.9), [-0.85, 1.02, 0]);
  const baby = makeBaby();
  baby.position.set(-0.55, 1.18, 0);
  cot.add(baby);
  // star mobile above the cot
  const mobile = new THREE.Group();
  mobile.position.set(0, 3.0, 0);
  cot.add(mobile);
  add(mobile, new THREE.TorusGeometry(0.5, 0.025, 6, 32), wood, [0, 0, 0], [Math.PI / 2, 0, 0]);
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 0.07 : 0.16;
    if (i === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.04, bevelEnabled: false });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    add(mobile, new THREE.CylinderGeometry(0.005, 0.005, 0.5, 4), wood, [Math.cos(a) * 0.5, -0.25, Math.sin(a) * 0.5]);
    add(mobile, starGeo, std([0xffd84a, 0xff9ab8, 0x8fd0ff][i % 3], 0.5, { emissive: 0x302000, emissiveIntensity: 0.2 }), [Math.cos(a) * 0.5, -0.55, Math.sin(a) * 0.5]);
  }
  add(cot, new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6), wood, [0, 2.3, -0.6]);
  // balloons
  const balloons = new THREE.Group();
  balloons.position.set(-3.6, 0, -2.2);
  scene.add(balloons);
  [[0, 3.4, 0, 0xff9ab8], [0.55, 3.1, 0.2, 0x8fd0ff], [-0.45, 3.0, 0.3, 0xffd84a]].forEach(([x, y, z, c]) => {
    add(balloons, new THREE.SphereGeometry(0.42, 24, 18), std(c, 0.3, { emissive: c, emissiveIntensity: 0.12 }), [x, y, z], [0, 0, 0], [1, 1.18, 1]);
    add(balloons, new THREE.CylinderGeometry(0.008, 0.008, y - 0.4, 4), std(0xffffff, 0.5), [x * 0.5, (y - 0.4) / 2, z * 0.5], [0, 0, -x * 0.12]);
  });
  // a teddy bear on a shelf
  const teddy = new THREE.Group();
  teddy.position.set(4.6, 0, -2.4);
  scene.add(teddy);
  const tb = std(0xc98a4a, 0.9);
  add(teddy, new THREE.SphereGeometry(0.42, 18, 14), tb, [0, 0.42, 0], [0, 0, 0], [1, 1.1, 0.9]);
  add(teddy, new THREE.SphereGeometry(0.3, 18, 14), tb, [0, 1.05, 0]);
  for (const x of [-0.2, 0.2]) add(teddy, new THREE.SphereGeometry(0.11, 12, 10), tb, [x, 1.3, 0]);
  add(teddy, new THREE.SphereGeometry(0.12, 12, 10), std(0xf3d2a8, 0.9), [0, 1.0, 0.24], [0, 0, 0], [1, 0.8, 0.6]);
  const aff = makeAffan();
  const mama = makeMama();
  scene.add(aff.root, mama.root);
  // a small Jalur Gemilang on a stick (for the ending)
  const flag = makeFlag();
  scene.add(flag);
  return { scene, aff, mama, baby, cot, mobile, flag };
}

// The Malaysian flag (Jalur Gemilang) on a stick; the cloth waves with setWave(t)
export function makeFlag(w = 0.9) {
  const g = new THREE.Group();
  const h = w / 2;
  const tex = canvasTex(560, 280, (x, W, H) => {
    for (let i = 0; i < 14; i++) {
      x.fillStyle = i % 2 ? '#ffffff' : '#cc0001';
      x.fillRect(0, (i * H) / 14, W, H / 14 + 1);
    }
    x.fillStyle = '#010066';
    x.fillRect(0, 0, W / 2, (H * 8) / 14);
    const cx = W * 0.19, cy = (H * 4) / 14, r = H * 0.2;
    x.fillStyle = '#ffcc00';
    x.beginPath();
    x.arc(cx, cy, r, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#010066';
    x.beginPath();
    x.arc(cx + r * 0.25, cy, r * 0.85, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#ffcc00';
    const sx = W * 0.34, sy = cy, R1 = r * 0.95, R2 = r * 0.42;
    x.beginPath();
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? R2 : R1;
      if (i === 0) x.moveTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
      else x.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
    }
    x.fill();
  });
  const geo = new THREE.PlaneGeometry(w, h, 16, 4);
  const cloth = add(g, geo, std(0xffffff, 0.8, { map: tex, side: THREE.DoubleSide }), [w / 2 + 0.02, 0.5, 0], [0, 0, 0], [1, 1, 1], false);
  add(g, new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8), std(0xd8b070, 0.5), [0, 0.15, 0]);
  add(g, new THREE.SphereGeometry(0.04, 10, 8), std(0xffcc00, 0.3), [0, 0.76, 0]);
  const base = geo.attributes.position.array.slice();
  g.userData.setWave = (t) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3] + w / 2;
      p.setZ(i, 0.06 * (x / w) * Math.sin(t * 7 - x * 7));
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
  };
  void cloth;
  return g;
}

// ----------------------------------------------------- the counting stage
export const GRID = { cols: 9, rows: 7, dx: 0.62, dz: 0.62 };
function makeKid(kind) {
  const k = makeAffan();
  const pairs = {
    doctor: [[AFFAN.navy, 0xf6f8fc], [AFFAN.shirt, 0x8fd0ff], [AFFAN.peach, 0xdfe8f2], [AFFAN.pants, 0x3a6aa8]],
    teacher: [[AFFAN.navy, 0x7a3a8a], [AFFAN.shirt, 0xffe08a], [AFFAN.peach, 0xffd84a], [AFFAN.pants, 0x3a2a4a]],
    bomba: [[AFFAN.navy, 0x1f2a44], [AFFAN.shirt, 0xff6b3d], [AFFAN.peach, 0xfff04a], [AFFAN.pants, 0x1f2a44]],
  }[kind];
  recolor(k.root, pairs);
  const head = k.parts.head;
  const torso = k.parts.torso;
  if (kind === 'doctor') {
    // stethoscope round the neck
    const tube = std(0x2a2f40, 0.4);
    add(torso, new THREE.TorusGeometry(0.3, 0.025, 8, 32, Math.PI * 1.2), tube, [0, 0.55, 0.12], [Math.PI / 2 + 0.3, 0, Math.PI * 1.4]);
    add(torso, new THREE.CylinderGeometry(0.07, 0.07, 0.04, 16), std(0xc0c8d8, 0.2, { metalness: 0.6 }), [0.12, 0.12, 0.35], [Math.PI / 2, 0, 0]);
    add(torso, new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6), tube, [0.08, 0.32, 0.34], [0, 0, 0.3]);
  } else if (kind === 'teacher') {
    k.userData = { book: true };
  } else {
    // firefighter helmet
    const red = std(0xe8302a, 0.35, { emissive: 0x400808, emissiveIntensity: 0.3 });
    add(head, new THREE.SphereGeometry(0.72, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5), red, [0, 0.28, -0.02], [0, 0, 0], [1.02, 0.85, 1.05]);
    add(head, new THREE.CylinderGeometry(0.92, 0.95, 0.05, 32), red, [0, 0.27, -0.12], [0, 0, 0], [1, 1, 1.15]);
    add(head, new RoundedBoxGeometry(0.34, 0.3, 0.06, 2, 0.03), std(0xffd84a, 0.4, { emissive: 0x403000, emissiveIntensity: 0.3 }), [0, 0.6, 0.66], [-0.3, 0, 0]);
    head.children.forEach((c) => {
      if (c.isMesh && c.material.color && (near(c.material.color, AFFAN.hair) || near(c.material.color, AFFAN.hairHi)) && c.position.y > 0.3) c.visible = false;
    });
  }
  return k;
}
function makeBook(c = 0xff6b6b) {
  const g = new THREE.Group();
  add(g, new RoundedBoxGeometry(0.5, 0.62, 0.1, 2, 0.02), std(c, 0.6), [0, 0, 0]);
  add(g, new THREE.BoxGeometry(0.46, 0.58, 0.08), std(0xffffff, 0.8), [0.03, 0, 0]);
  return g;
}
function signTex(text, bg, fg = '#ffffff') {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.font = '800 84px "Baloo 2", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 6);
  });
}
function makeSchool() {
  const g = new THREE.Group();
  add(g, new RoundedBoxGeometry(3.4, 1.9, 1.4, 2, 0.06), std(0xffe08a, 0.8), [0, 0.95, 0]);
  add(g, new RoundedBoxGeometry(1.4, 1.0, 1.42, 2, 0.06), std(0xffd05a, 0.8), [0, 2.35, 0]);
  add(g, new THREE.ConeGeometry(1.1, 0.7, 4), std(0x3f8fd8, 0.6), [0, 3.2, 0], [0, Math.PI / 4, 0], [1, 1, 0.9]);
  add(g, new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: signTex('SEKOLAH', '#2f7bff') }), [0, 1.62, 0.72], [0, 0, 0], [1, 1, 1], false);
  for (const x of [-1.2, -0.6, 0.6, 1.2]) add(g, new THREE.PlaneGeometry(0.4, 0.4), std(0x8fd0ff, 0.2, { emissive: 0x2a4a6a, emissiveIntensity: 0.3 }), [x, 0.95, 0.715], [0, 0, 0], [1, 1, 1], false);
  add(g, new THREE.PlaneGeometry(0.5, 0.75), std(0x8a5a3a, 0.6), [0, 0.38, 0.715], [0, 0, 0], [1, 1, 1], false);
  add(g, new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), std(0xdfe4ef, 0.3), [1.9, 0.8, 0.4]);
  const flag = makeFlag(0.6);
  flag.position.set(1.9, 1.05, 0.4);
  flag.children[1].visible = false;
  g.add(flag);
  g.userData.flag = flag;
  return g;
}
function makeHospital() {
  const g = new THREE.Group();
  add(g, new RoundedBoxGeometry(2.6, 3.2, 1.4, 2, 0.06), std(0xf6f8fc, 0.7), [0, 1.6, 0]);
  add(g, new RoundedBoxGeometry(2.7, 0.2, 1.5, 2, 0.06), std(0x5fc0b0, 0.6), [0, 3.25, 0]);
  const cross = std(0xff4d5e, 0.4, { emissive: 0x500810, emissiveIntensity: 0.4 });
  add(g, new THREE.BoxGeometry(0.22, 0.7, 0.06), cross, [0, 2.55, 0.72]);
  add(g, new THREE.BoxGeometry(0.7, 0.22, 0.06), cross, [0, 2.55, 0.72]);
  add(g, new THREE.PlaneGeometry(1.9, 0.48), new THREE.MeshBasicMaterial({ map: signTex('HOSPITAL', '#20b8a0') }), [0, 1.75, 0.715], [0, 0, 0], [1, 1, 1], false);
  for (const x of [-0.8, 0.8]) for (const y of [1.05, 2.55]) add(g, new THREE.PlaneGeometry(0.4, 0.4), std(0x8fd0ff, 0.2, { emissive: 0x2a4a6a, emissiveIntensity: 0.3 }), [x, y, 0.715], [0, 0, 0], [1, 1, 1], false);
  add(g, new THREE.PlaneGeometry(0.7, 0.8), std(0x8fd0ff, 0.3), [0, 0.4, 0.715], [0, 0, 0], [1, 1, 1], false);
  return g;
}
export function buildStats() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x9fd8ff, 0xfff4e0, -0.2, 0.6);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb0a090, 1.4));
  const key = new THREE.DirectionalLight(0xfff4e8, 2.2);
  key.position.set(-5, 10, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9 });
  key.shadow.bias = -0.0004;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdcecff, 0.7);
  fill.position.set(6, 4, 6);
  scene.add(fill);
  add(scene, new THREE.CylinderGeometry(7, 7.2, 0.4, 64), std(0xbfe8c8, 0.85), [0, -0.2, 0], [0, 0, 0], [1, 1, 1], false).receiveShadow = true;
  add(scene, new THREE.TorusGeometry(7.05, 0.12, 8, 64), std(0xffffff, 0.6), [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  // the baby grid
  const R = rng(711);
  const wraps = [0xffc2d6, 0xbfe0ff, 0xfff0a8, 0xc8f0d0];
  const bundles = [];
  for (let r = 0; r < GRID.rows; r++) for (let c = 0; c < GRID.cols; c++) {
    const b = makeBundle(wraps[Math.floor(R() * 4)]);
    b.position.set((c - (GRID.cols - 1) / 2) * GRID.dx, 0, (r - (GRID.rows - 1) / 2) * GRID.dz);
    b.rotation.y = (R() - 0.5) * 0.4;
    b.userData.d = R();
    scene.add(b);
    bundles.push(b);
  }
  // two bars: 2023 and 2024 (heights to scale)
  const bars = new THREE.Group();
  scene.add(bars);
  const barA = add(bars, new RoundedBoxGeometry(1.3, 1, 1.0, 2, 0.08), std(0x5fb0ff, 0.5, { emissive: 0x0a2040, emissiveIntensity: 0.3 }), [-1.0, 0.5, 0]);
  const barB = add(bars, new RoundedBoxGeometry(1.3, 1, 1.0, 2, 0.08), std(0xff8a5c, 0.5, { emissive: 0x401808, emissiveIntensity: 0.3 }), [1.0, 0.5, 0]);
  // the mum with 1.6 children
  const mama = makeMama();
  scene.add(mama.root);
  const kids = [makeBundle(0xffc2d6), makeBundle(0xbfe0ff)];
  kids.forEach((k) => scene.add(k));
  // the ghost part of the second child: 0.4 of it is see-through
  kids[1].traverse((o) => {
    if (o.isMesh) {
      o.material = o.material.clone();
      o.material.transparent = true;
    }
  });
  const clip = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
  // future jobs
  const doctor = makeKid('doctor'), teacher = makeKid('teacher'), bomba = makeKid('bomba');
  [doctor, teacher, bomba].forEach((k) => scene.add(k.root));
  const book = makeBook(0x3fa2ff);
  scene.add(book);
  // the toy town
  const school = makeSchool(), hospital = makeHospital();
  scene.add(school, hospital);
  const sparkle = glow(0xffffff, 3, 0);
  scene.add(sparkle);
  void clip;
  return { scene, sky, bundles, bars, barA, barB, mama, kids, doctor, teacher, bomba, book, school, hospital, sparkle };
}

// ------------------------------------------------------------- the seesaw
// The plank pivots at the origin; 'tilt' > 0 puts the left end (elders) down.
export function buildSeesaw() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x8fd0ff, 0xeaf8ff, -0.2, 0.7);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x80a070, 1.4));
  const key = new THREE.DirectionalLight(0xfff4e0, 2.3);
  key.position.set(-5, 10, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 });
  key.shadow.bias = -0.0004;
  scene.add(key);
  add(scene, new THREE.CircleGeometry(40, 48), std(0x8fd47a, 0.9), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  // hills and clouds behind
  for (const [x, z, r, c] of [[-10, -18, 9, 0x7cc46a], [8, -20, 11, 0x6ab85a], [0, -26, 13, 0x86cc72]]) add(scene, new THREE.SphereGeometry(r, 32, 16), std(c, 0.9), [x, -r * 0.55, z], [0, 0, 0], [1.4, 1, 1], false);
  for (const [x, y, z] of [[-6, 9, -16], [5, 10.5, -18], [10, 8, -14]]) {
    for (let i = 0; i < 3; i++) add(scene, new THREE.SphereGeometry(1.2 - i * 0.2, 16, 12), std(0xffffff, 0.9, { emissive: 0xffffff, emissiveIntensity: 0.3 }), [x + i * 1.3, y + (i % 2) * 0.3, z], [0, 0, 0], [1, 0.7, 0.7], false);
  }
  add(scene, new THREE.ConeGeometry(0.7, 1.4, 3), std(0xffb02e, 0.6), [0, 0.7, 0], [0, Math.PI / 6, 0]);
  const plank = new THREE.Group();
  plank.position.set(0, 1.45, 0);
  scene.add(plank);
  add(plank, new RoundedBoxGeometry(8.6, 0.22, 1.4, 2, 0.08), std(0xff6b6b, 0.6), [0, 0, 0]);
  for (const x of [-4.1, 4.1]) add(plank, new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8), std(0xffd84a, 0.4), [x, 0.5, 0], [Math.PI / 2, 0, 0]);
  // elders: atuk (kopiah, white hair, cane) and nenek (soft lilac tudung, glasses)
  const elders = [];
  for (let i = 0; i < 4; i++) {
    let e;
    if (i % 2 === 0) {
      e = makeAffan();
      recolor(e.root, [[AFFAN.hair, 0xe8e8ee], [AFFAN.hairHi, 0xf6f6fa], [AFFAN.navy, [0x6a4a8a, 0x2f6a5a][i / 2]], [AFFAN.shirt, 0xf3efe2], [AFFAN.peach, 0xf3efe2], [AFFAN.pants, 0x4a4a5a]]);
      add(e.parts.head, new THREE.CylinderGeometry(0.62, 0.64, 0.32, 32), std(0xffffff, 0.8), [0, 0.62, -0.05]);
      // a white moustache
      add(e.parts.head, new THREE.CapsuleGeometry(0.05, 0.22, 6, 10), std(0xf6f6fa, 0.8), [0, -0.2, 0.68], [0, 0, Math.PI / 2], [1, 1, 0.6], false);
    } else {
      e = makeMama();
      recolor(e.root, [[MAMA.tudung, [0xc9a8e8, 0xa8c8e8][(i - 1) / 2]], [MAMA.baju, [0x8a5a9a, 0x5a7aaa][(i - 1) / 2]], [MAMA.kain, 0x4a4a6a]]);
      e.parts.glasses.visible = true;
    }
    e.root.scale.setScalar(0.56);
    plank.add(e.root);
    e.root.position.set(-3.75 + i * 0.84, 0.11, 0);
    elders.push(e);
  }
  const young = makeKakak();
  young.root.scale.setScalar(0.56);
  plank.add(young.root);
  young.root.position.set(3.55, 0.11, 0);
  const cane = add(scene, new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8), std(0x8a5a3a, 0.6), [0, 0, 0]);
  cane.visible = false;
  return { scene, sky, plank, elders, young };
}
