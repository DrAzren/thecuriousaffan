// Procedural cartoon cats for The Curious Affan. One rig, many breeds: the
// breed presets in BREEDS set colours, coat pattern, fur length, ear shape,
// face shape and size. Everything is built from primitives and canvas
// textures, so a cat looks the same in every render.
//
// Units match Affan (he is ~3.8 tall): a sitting cat at scale 1 is ~1.25
// tall to the ear tips. Feet at y = 0, the cat faces +z.
//
//   const c = makeCat(BREEDS.kampung);
//   c.pose({ sit: 1, t, headYaw: 0.3, blink: 0, meow: 0, tail: 1 });
import * as THREE from 'three';
import { clamp, lerp, rng } from './core.js';

const std = (color, rough = 0.78, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

function mesh(geo, mat, parent, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0], shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.scale.set(...scale);
  m.rotation.set(...rot);
  m.castShadow = shadow;
  m.receiveShadow = shadow;
  parent.add(m);
  return m;
}

const hex = (c) => '#' + new THREE.Color(c).getHexString();

// ------------------------------------------------------------- coat texture
// Body sphere has its poles on the spine (z): u runs around the spine
// (u = 0.25 belly, 0.75 back), v runs from chest (0) to rump (1).
function coatTexture(b, part, seed) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  const R = rng(seed);
  g.fillStyle = hex(b.coat);
  g.fillRect(0, 0, 512, 256);
  const W = 512, H = 256;
  if (part === 'body') {
    // darker back, lighter belly
    const back = g.createLinearGradient(0, 0, W, 0);
    back.addColorStop(0, 'rgba(0,0,0,0)');
    back.addColorStop(0.55, 'rgba(0,0,0,0)');
    back.addColorStop(0.75, hex(b.dark) + (b.pattern === 'solid' || b.pattern === 'skin' ? '30' : '70'));
    back.addColorStop(0.95, 'rgba(0,0,0,0)');
    g.fillStyle = back;
    g.fillRect(0, 0, W, H);
    if (b.pattern === 'tabby') {
      g.strokeStyle = hex(b.dark);
      g.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const v = 0.1 + i * 0.1 + (R() - 0.5) * 0.03;
        g.lineWidth = 9 + R() * 7;
        g.beginPath();
        for (let k = 0; k <= 20; k++) {
          const u = 0.42 + (k / 20) * 0.66;
          const y = (v + 0.025 * Math.sin(k * 0.9 + i)) * H;
          k === 0 ? g.moveTo((u % 1) * W, y) : g.lineTo((u % 1) * W, y);
        }
        g.stroke();
        // wrap-around piece
        g.beginPath();
        for (let k = 0; k <= 8; k++) {
          const u = (k / 8) * 0.08;
          g.lineTo(u * W, (v + 0.025 * Math.sin((k + 20) * 0.9 + i)) * H);
        }
        g.stroke();
      }
    }
    if (b.pattern === 'ticked') {
      for (let i = 0; i < 2600; i++) {
        g.fillStyle = R() < 0.5 ? hex(b.dark) + '55' : '#ffffff22';
        g.fillRect(R() * W, R() * H, 2 + R() * 3, 6 + R() * 6);
      }
    }
    if (b.white) {
      // white belly / chest bib
      const wb = g.createLinearGradient(0, 0, W, 0);
      const w = hex(b.white);
      wb.addColorStop(0.08, w + '00');
      wb.addColorStop(0.18, w + 'ff');
      wb.addColorStop(0.32, w + 'ff');
      wb.addColorStop(0.42, w + '00');
      g.fillStyle = wb;
      g.fillRect(0, 0, W, H * 0.75);
    }
    if (b.pattern === 'skin') {
      g.strokeStyle = hex(b.dark) + '55';
      g.lineWidth = 3;
      for (let i = 0; i < 7; i++) {
        g.beginPath();
        const v = 0.05 + R() * 0.25;
        g.arc((0.45 + R() * 0.5) * W, v * H, 40 + R() * 30, 0.2, 2.6);
        g.stroke();
      }
    }
  } else if (part === 'head') {
    // head sphere: u = 0.25 is the face (+z), v = 0 top
    if (b.pattern === 'tabby') {
      g.strokeStyle = hex(b.dark);
      g.lineCap = 'round';
      g.lineWidth = 9;
      // forehead "M"
      const cx = 0.25 * W;
      for (const dx of [-26, -9, 9, 26]) {
        g.beginPath();
        g.moveTo(cx + dx, 0.18 * H);
        g.lineTo(cx + dx * 0.8, 0.36 * H);
        g.stroke();
      }
      // cheek stripes
      for (const s of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          g.beginPath();
          g.moveTo(cx + s * (64 + i * 14), 0.47 + i * 0.06 > 0 ? (0.47 + i * 0.06) * H : 0);
          g.lineTo(cx + s * (110 + i * 10), (0.44 + i * 0.07) * H);
          g.stroke();
        }
      }
      // back of head stripes
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.moveTo((0.62 + i * 0.07) * W, 0.08 * H);
        g.lineTo((0.6 + i * 0.07) * W, 0.45 * H);
        g.stroke();
      }
    }
    if (b.pattern === 'ticked') {
      for (let i = 0; i < 900; i++) {
        g.fillStyle = R() < 0.5 ? hex(b.dark) + '44' : '#ffffff22';
        g.fillRect(R() * W, R() * H * 0.7, 2 + R() * 2, 4 + R() * 4);
      }
    }
    if (b.points) {
      // colourpoint mask around the muzzle
      const gr = g.createRadialGradient(0.25 * W, 0.62 * H, 4, 0.25 * W, 0.62 * H, 120);
      gr.addColorStop(0, hex(b.points));
      gr.addColorStop(0.55, hex(b.points) + 'cc');
      gr.addColorStop(1, hex(b.points) + '00');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
    }
    if (b.white) {
      const gr = g.createRadialGradient(0.25 * W, 0.8 * H, 4, 0.25 * W, 0.8 * H, 110);
      gr.addColorStop(0, hex(b.white));
      gr.addColorStop(0.6, hex(b.white) + 'dd');
      gr.addColorStop(1, hex(b.white) + '00');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
    }
    if (b.pattern === 'skin') {
      g.strokeStyle = hex(b.dark) + '66';
      g.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(0.25 * W - 40, (0.16 + i * 0.06) * H);
        g.quadraticCurveTo(0.25 * W, (0.2 + i * 0.06) * H, 0.25 * W + 40, (0.16 + i * 0.06) * H);
        g.stroke();
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ---------------------------------------------------------------- breeds
// coat: base colour; dark: stripes/shading; white: bib/paws; points: colourpoint
// fur: 0 sleek .. 1 very fluffy; ears: size; fold: folded ears; tufts: lynx tips
// face: 'round' | 'flat' (Persian) | 'wedge' (Siamese); size: overall scale.
export const BREEDS = {
  kampung: { name: 'Kucing Kampung', coat: 0xf0a04b, dark: 0xc4621c, white: 0xfff6ea, pattern: 'tabby', eye: 0xc8d23a, fur: 0, ears: 1, size: 1, kink: 1 },
  parsi: { name: 'Parsi', coat: 0xfbf8f2, dark: 0xe6ddd0, pattern: 'solid', eye: 0xe48a1e, fur: 1, ears: 0.62, face: 'flat', size: 1.05, nose: 0xf2a0a8 },
  siam: { name: 'Siam', coat: 0xf3e6cc, dark: 0xd9c49c, points: 0x4a3226, pattern: 'solid', eye: 0x3aa0ff, fur: 0, ears: 1.3, face: 'wedge', size: 0.98, slim: 1, nose: 0x5a3a30 },
  maineCoon: { name: 'Maine Coon', coat: 0x9a6a3e, dark: 0x3e2a1a, white: 0xf3eadc, pattern: 'tabby', eye: 0xb7c43a, fur: 0.55, ears: 1.25, tufts: 1, size: 1.45, long: 1 },
  sphynx: { name: 'Sphynx', coat: 0xe8b9a4, dark: 0xb57d6c, pattern: 'skin', eye: 0x9ccf3a, fur: 0, ears: 1.6, size: 0.98, slim: 1, nose: 0xd98a8a, whiskers: 0 },
  scottishFold: { name: 'Scottish Fold', coat: 0x9aa6b8, dark: 0x6f7a8e, pattern: 'solid', eye: 0xf09a2a, fur: 0.25, ears: 0.8, fold: 1, face: 'round', size: 1.0, chubby: 1, nose: 0x8a7f90 },
  singapura: { name: 'Singapura', coat: 0xd8b48a, dark: 0x6e4a2c, white: 0xf1e2c8, pattern: 'ticked', eye: 0x9cc23a, fur: 0, ears: 1.45, size: 0.7, bigEyes: 1 },
};

// Extra random-ish coats for crowds.
export function crowdBreed(R) {
  const coats = [
    { coat: 0x2b2b30, dark: 0x111114, pattern: 'solid', eye: 0xe8c33a },
    { coat: 0xf6f3ee, dark: 0xd8d2c8, pattern: 'solid', eye: 0x5fb0ff },
    { coat: 0xf0a04b, dark: 0xc4621c, white: 0xfff6ea, pattern: 'tabby', eye: 0xc8d23a },
    { coat: 0x8f8f96, dark: 0x4a4a52, pattern: 'tabby', eye: 0x9ccf3a },
    { coat: 0x3a3a40, dark: 0x1a1a1e, white: 0xffffff, pattern: 'solid', eye: 0xc8d23a },
    { coat: 0xc79a6a, dark: 0x6a4428, pattern: 'tabby', eye: 0xd8b03a },
    { coat: 0xf3e6cc, dark: 0xd9c49c, points: 0x4a3226, pattern: 'solid', eye: 0x3aa0ff, face: 'wedge', ears: 1.3 },
    { coat: 0x9aa6b8, dark: 0x6f7a8e, pattern: 'solid', eye: 0xf09a2a, fold: 1, ears: 0.8 },
    { coat: 0xe8b9a4, dark: 0xb57d6c, pattern: 'skin', eye: 0x9ccf3a, ears: 1.6, whiskers: 0 },
    { coat: 0xfbf8f2, dark: 0xe6ddd0, pattern: 'solid', eye: 0xe48a1e, fur: 0.9, ears: 0.62, face: 'flat' },
  ];
  const b = coats[Math.floor(R() * coats.length)];
  return { fur: 0, ears: 1, size: 0.85 + R() * 0.3, ...b };
}

// --------------------------------------------------------------------- rig
const TAIL_N = 9;

export function makeCat(breed = BREEDS.kampung, { seed = 1, detail = 1 } = {}) {
  const b = { ears: 1, size: 1, fur: 0, ...breed };
  const R = rng(seed * 97 + 13);
  const root = new THREE.Group();
  root.name = 'Cat';
  root.scale.setScalar(b.size);
  const fluff = b.fur;
  const slim = b.slim ? 0.86 : 1;
  const chub = b.chubby ? 1.1 : 1;
  const long = b.long ? 1.12 : 1;

  const M = {
    coat: std(b.coat, b.pattern === 'skin' ? 0.55 : 0.85, { emissive: new THREE.Color(b.coat).multiplyScalar(0.08) }),
    body: std(0xffffff, b.pattern === 'skin' ? 0.55 : 0.85, { map: coatTexture(b, 'body', seed), emissive: new THREE.Color(b.coat).multiplyScalar(0.06) }),
    head: std(0xffffff, b.pattern === 'skin' ? 0.55 : 0.85, { map: coatTexture(b, 'head', seed + 1), emissive: new THREE.Color(b.coat).multiplyScalar(0.06) }),
    dark: std(b.dark, 0.85),
    points: std(b.points ?? b.coat, 0.85),
    white: std(b.white ?? b.coat, 0.85),
    paw: std(b.white ?? b.points ?? b.coat, 0.85),
    earIn: std(b.pattern === 'skin' ? 0xf0a7a0 : 0xf6b3b8, 0.7),
    nose: std(b.nose ?? 0xf08a96, 0.5),
    iris: std(b.eye, 0.25, { emissive: new THREE.Color(b.eye).multiplyScalar(0.35) }),
    pupil: std(0x0b0b10, 0.3),
    rim: std(0x241a18, 0.5),
    hi: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    mouth: std(0x6a2230, 0.6),
    tongue: std(0xf07d8c, 0.6),
    whisker: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }),
  };
  const furMat = b.pattern === 'tabby' ? M.coat : M.coat;
  const segs = detail > 0.5 ? [28, 20] : [16, 12];

  // ---------------- torso (pivot at the body centre)
  const torso = new THREE.Group();
  root.add(torso);
  const bodyGeo = new THREE.SphereGeometry(1, segs[0], segs[1]);
  bodyGeo.rotateX(Math.PI / 2); // poles on the spine
  const bodyR = [0.25 * slim * chub, 0.25 * chub, 0.42 * long];
  const body = mesh(bodyGeo, M.body, torso, [0, 0, 0], bodyR);
  const chest = mesh(new THREE.SphereGeometry(0.23 * slim * chub, segs[0], segs[1]), b.white ? M.white : M.coat, torso, [0, 0.0, 0.22 * long], [1, 1.05, 1]);
  const hips = mesh(new THREE.SphereGeometry(0.24 * slim * chub, segs[0], segs[1]), M.coat, torso, [0, 0.0, -0.24 * long], [1, 1, 1]);
  // fluffy coat: clumps over the body and a ruff around the chest
  if (fluff >= 0.3) {
    const n = Math.round(14 + 30 * fluff);
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, zz = (R() * 2 - 1) * 0.9;
      const rr = Math.sqrt(1 - zz * zz);
      const d = new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, zz);
      if (d.y < -0.5) continue;
      const s = (0.05 + R() * 0.03) * (0.6 + 0.6 * fluff);
      mesh(new THREE.SphereGeometry(1, 12, 9), M.coat, torso, [d.x * bodyR[0] * 0.9, d.y * bodyR[1] * 0.9, d.z * bodyR[2] * 0.9], [s, s * 0.85, s * 1.1]);
    }
    for (let i = 0; i < Math.round(8 + 10 * fluff); i++) {
      const a = (i / (8 + 10 * fluff)) * Math.PI * 2;
      const s = (0.05 + R() * 0.03) * (0.6 + 0.6 * fluff);
      mesh(new THREE.SphereGeometry(1, 12, 9), b.white ? M.white : M.coat, torso, [Math.cos(a) * 0.17, Math.sin(a) * 0.15 + 0.05, 0.34 * long], [s, s, s * 0.8]);
    }
  }

  // ---------------- head (pivot at the neck)
  const neck = new THREE.Group();
  root.add(neck);
  const head = new THREE.Group();
  neck.add(head);
  const hs = b.face === 'wedge' ? [0.9, 0.95, 1.0] : b.face === 'flat' ? [1.12, 1.0, 0.92] : b.chubby ? [1.12, 1.02, 1.0] : [1.05, 0.98, 1.0];
  const HR = 0.27;
  const skull = mesh(new THREE.SphereGeometry(HR, segs[0], segs[1]), M.head, head, [0, 0, 0], hs);
  if (fluff > 0.5) {
    // cheek ruff
    for (let i = 0; i < 12; i++) {
      const a = Math.PI * (0.9 + (i / 11) * 1.2);
      const s = 0.05 + R() * 0.025;
      mesh(new THREE.SphereGeometry(1, 12, 9), M.coat, head, [Math.cos(a) * HR * 1.0, Math.sin(a) * HR * 0.78 - 0.02, 0.0], [s, s, s * 0.8]);
    }
  }
  const faceZ = HR * hs[2];
  const muzzleZ = b.face === 'flat' ? faceZ * 0.84 : b.face === 'wedge' ? faceZ * 1.02 : faceZ * 0.92;
  // muzzle / cheeks
  const cheekMat = b.points ? M.points : b.white ? M.white : M.coat;
  for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.068, 18, 14), cheekMat, head, [0.045 * s, -0.085, muzzleZ - 0.02], [1.05, 0.85, 0.85]);
  mesh(new THREE.SphereGeometry(0.05, 16, 12), cheekMat, head, [0, -0.125, muzzleZ - 0.04], [1.1, 0.7, 0.8]); // chin
  const nose = mesh(new THREE.SphereGeometry(0.03, 14, 10), M.nose, head, [0, b.face === 'flat' ? -0.035 : -0.05, muzzleZ + 0.035], [1.25, 0.8, 0.7]);
  // mouth "w" + open mouth for meowing
  for (const s of [-1, 1]) {
    const m = mesh(new THREE.TorusGeometry(0.022, 0.0055, 6, 14, Math.PI), M.rim, head, [0.021 * s, -0.098, muzzleZ + 0.035], [1, 1, 1], [0, 0, Math.PI], false);
    m.rotation.x = -0.35;
  }
  const meowMouth = new THREE.Group();
  meowMouth.position.set(0, -0.112, muzzleZ + 0.02);
  head.add(meowMouth);
  mesh(new THREE.SphereGeometry(0.05, 16, 12), M.mouth, meowMouth, [0, 0, 0], [1, 1, 0.5], [0, 0, 0], false);
  mesh(new THREE.SphereGeometry(0.03, 12, 8), M.tongue, meowMouth, [0, -0.025, 0.012], [1.1, 0.5, 0.5], [0, 0, 0], false);

  // eyes
  const eyes = [];
  const eyeS = (b.bigEyes ? 1.22 : 1) * (b.face === 'flat' ? 1.12 : 1);
  for (const s of [-1, 1]) {
    const e = new THREE.Group();
    const ex = 0.1 * (b.face === 'wedge' ? 0.92 : 1);
    e.position.set(ex * s, 0.025, faceZ * 0.86);
    e.rotation.set(0, 0.38 * s, b.face === 'wedge' ? -0.25 * s : -0.1 * s);
    head.add(e);
    mesh(new THREE.SphereGeometry(0.066 * eyeS, 20, 14), M.rim, e, [0, 0, -0.004], [1.08, 0.98, 0.5], [0, 0, 0], false);
    mesh(new THREE.SphereGeometry(0.06 * eyeS, 20, 14), M.iris, e, [0, 0, 0], [1, 0.92, 0.55], [0, 0, 0], false);
    const pupil = mesh(new THREE.SphereGeometry(0.06 * eyeS, 16, 12), M.pupil, e, [0, 0, 0.012], [0.32, 0.8, 0.5], [0, 0, 0], false);
    mesh(new THREE.SphereGeometry(0.016 * eyeS, 10, 8), M.hi, e, [0.018, 0.024, 0.034], [1, 1, 0.5], [0, 0, 0], false);
    mesh(new THREE.SphereGeometry(0.008 * eyeS, 8, 6), M.hi, e, [-0.02, -0.022, 0.033], [1, 1, 0.5], [0, 0, 0], false);
    eyes.push({ g: e, pupil });
  }

  // ears
  const ears = [];
  const earH = 0.19 * b.ears, earR = 0.1 * Math.sqrt(b.ears);
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0.13 * s * (b.face === 'wedge' ? 1.05 : 1) * hs[0], 0.16 * hs[1], -0.01);
    pivot.rotation.set(0, 0, -0.32 * s);
    head.add(pivot);
    const ear = new THREE.Group();
    pivot.add(ear);
    const outer = mesh(new THREE.ConeGeometry(earR, earH, 16), b.points ? M.points : M.coat, ear, [0, earH / 2, 0], [1, 1, 0.42]);
    const inner = mesh(new THREE.ConeGeometry(earR * 0.7, earH * 0.78, 14), M.earIn, ear, [0, earH * 0.43, 0.022], [1, 1, 0.3], [0, 0, 0], false);
    if (b.tufts) mesh(new THREE.ConeGeometry(0.018, 0.12, 6), M.dark, ear, [0, earH + 0.04, 0], [1, 1, 1]);
    if (b.fold) {
      pivot.position.y = 0.19 * hs[1];
      pivot.position.z = 0.02;
      ear.rotation.x = 1.75;
      ear.scale.set(1.15, 0.62, 1.15);
      inner.visible = false;
    }
    ears.push({ pivot, ear, s });
  }
  // whiskers
  if (b.whiskers !== 0 && detail > 0.3) {
    const wg = new THREE.CylinderGeometry(0.0035, 0.0018, 0.26, 4);
    wg.rotateZ(Math.PI / 2);
    wg.translate(0.13, 0, 0);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const w = mesh(wg, M.whisker, head, [0.07 * s, -0.08 + i * 0.016, muzzleZ - 0.0], [s, 1, 1], [0, -0.25 * s, (0.12 - i * 0.12) * s], false);
      w.castShadow = false;
    }
  }

  // ---------------- legs (pivot at the top; leg hangs to -y)
  function leg(len, r, mat, pawMat) {
    const g = new THREE.Group();
    const upper = mesh(new THREE.CapsuleGeometry(r, len, 6, 14), mat, g, [0, -len / 2, 0]);
    const paw = mesh(new THREE.SphereGeometry(r * 1.25, 14, 10), pawMat, g, [0, -len - r * 0.25, r * 0.35], [1, 0.7, 1.3]);
    g.userData = { upper, paw, len, r };
    root.add(g);
    return g;
  }
  const legMat = b.points ? M.points : M.coat;
  const pawMat = b.white ? M.white : b.points ? M.points : M.coat;
  const lr = 0.058 * slim * (b.chubby ? 1.1 : 1);
  const legs = {
    FL: leg(0.42, lr, legMat, pawMat), FR: leg(0.42, lr, legMat, pawMat),
    BL: leg(0.36, lr * 1.05, legMat, pawMat), BR: leg(0.36, lr * 1.05, legMat, pawMat),
  };
  // haunches (big thighs when sitting)
  const haunch = {};
  for (const [k, s] of [['L', 1], ['R', -1]]) haunch[k] = mesh(new THREE.SphereGeometry(0.17 * chub, 20, 14), M.coat, root, [0.15 * s, 0.2, -0.12], [0.75, 1, 1.15]);
  if (fluff > 0.4) for (const k of ['L', 'R']) for (let i = 0; i < 6; i++) {
    const s = 0.05 + R() * 0.025;
    mesh(new THREE.SphereGeometry(1, 10, 8), M.coat, haunch[k], [(R() - 0.5) * 0.2, (R() - 0.3) * 0.22, (R() - 0.5) * 0.22], [s / 0.75, s, s / 1.15]);
  }

  // ---------------- tail: chain of segments
  const tailRoot = new THREE.Group();
  root.add(tailRoot);
  const tail = [];
  let parent = tailRoot;
  const segL = 0.085 * (b.long ? 1.15 : 1);
  const tailFluff = 1 + fluff * 0.9;
  for (let i = 0; i < TAIL_N; i++) {
    const g = new THREE.Group();
    g.position.set(0, 0, i === 0 ? 0 : -segL);
    parent.add(g);
    const r = (0.05 - i * 0.0025) * tailFluff * slim;
    const ringed = b.pattern === 'tabby' && i % 2 === 1;
    const tip = b.points || (i === TAIL_N - 1 && b.pattern === 'tabby');
    const mat = tip ? (b.points ? M.points : M.dark) : ringed ? M.dark : M.coat;
    mesh(new THREE.SphereGeometry(r, 12, 9), mat, g, [0, 0, -segL / 2], [1, 1, (segL * 0.75) / r]);
    tail.push(g);
    parent = g;
  }

  // ------------------------------------------------------------------ pose
  // sit: 0 standing, 1 sitting. walk: phase (radians) for a gentle trot when
  // standing. tail: 0 still .. 1 lively. meow: 0..1 mouth open.
  const DEF = { t: 0, sit: 1, walk: null, headYaw: 0, headPitch: 0, headRoll: 0, blink: 0, meow: 0, tail: 1, look: [0, 0], breathe: 1, earTwitch: 0, curl: 1 };
  const P = {
    stand: { torso: [0, 0.6, 0], torsoRx: 0, neck: [0, 0.78, 0.4 * long], headOff: [0, 0.08, 0.07], FL: [0.1, 0.62, 0.26 * long], BL: [0.12, 0.58, -0.3 * long], fLen: 1.38, bLen: 1.55, tail: [0, 0.68, -0.43 * long] },
    sit: { torso: [0, 0.5, -0.05], torsoRx: -0.95, neck: [0, 0.9, 0.16], headOff: [0, 0.1, 0.06], FL: [0.09, 0.55, 0.15], BL: [0.15, 0.14, 0.02], fLen: 1.22, bLen: 0.5, tail: [0, 0.12, -0.28] },
  };
  function pose(p = {}) {
    const q = { ...DEF, ...p };
    const k = clamp(q.sit);
    const L = (a, bb) => a.map((v, i) => lerp(v, bb[i], k));
    const br = q.breathe * 0.012 * Math.sin(q.t * 2.6);
    const tp = L(P.stand.torso, P.sit.torso);
    torso.position.set(tp[0], tp[1] + br * 0.5, tp[2]);
    torso.rotation.x = lerp(P.stand.torsoRx, P.sit.torsoRx, k);
    torso.scale.set(1 + br, 1 + br, 1);
    const np = L(P.stand.neck, P.sit.neck);
    neck.position.set(np[0], np[1] + br, np[2]);
    const ho = L(P.stand.headOff, P.sit.headOff);
    head.position.set(...ho);
    head.rotation.set(q.headPitch, q.headYaw, q.headRoll, 'YXZ');
    // eyes and blink
    const bl = clamp(q.blink);
    for (const e of eyes) {
      e.g.scale.y = lerp(1, 0.08, bl);
      e.pupil.position.x = q.look[0] * 0.02;
      e.pupil.position.y = q.look[1] * 0.02;
    }
    // ears
    for (const e of ears) e.ear.rotation.z = b.fold ? 0 : q.earTwitch * 0.35 * e.s * Math.max(0, Math.sin(q.t * 18));
    // mouth
    const mw = clamp(q.meow);
    meowMouth.visible = mw > 0.02;
    meowMouth.scale.set(0.8 + 0.4 * mw, 0.2 + 1.1 * mw, 1);
    // legs
    const f = L(P.stand.FL, P.sit.FL), bk = L(P.stand.BL, P.sit.BL);
    const walk = q.walk;
    for (const [key, s, front] of [['FL', 1, true], ['FR', -1, true], ['BL', 1, false], ['BR', -1, false]]) {
      const g = legs[key];
      const base = front ? f : bk;
      g.position.set(base[0] * s, base[1], base[2]);
      const len = front ? lerp(P.stand.fLen, P.sit.fLen, k) : lerp(P.stand.bLen, P.sit.bLen, k);
      g.scale.set(1, len, 1);
      g.userData.paw.scale.set(1, 0.7 / len, 1.3);
      let rx = 0;
      if (!front) rx = lerp(0, -1.45, k);
      if (front) rx = lerp(0, -0.06, k);
      if (walk !== null && k < 0.5) {
        const ph = walk + (front ? 0 : Math.PI) + (s > 0 ? 0 : Math.PI);
        rx += 0.45 * Math.sin(ph);
      }
      g.rotation.set(rx, 0, 0);
    }
    for (const [kk, s] of [['L', 1], ['R', -1]]) {
      haunch[kk].visible = k > 0.25;
      haunch[kk].scale.set(0.75 * k + 0.001, k + 0.001, 1.15 * k + 0.001);
      haunch[kk].position.set(0.15 * s, 0.2, -0.12);
    }
    if (walk !== null && k < 0.5) torso.position.y += 0.012 * Math.sin(walk * 2);
    // tail
    const tpos = L(P.stand.tail, P.sit.tail);
    tailRoot.position.set(...tpos);
    const sway = q.tail;
    const kink = b.kink ? 1 : 0;
    for (let i = 0; i < TAIL_N; i++) {
      const u = i / (TAIL_N - 1);
      // standing: tail rises up in a question-mark curve; sitting: wraps round the paws
      const sx = i === 0 ? 0.8 : 0.1 + 0.12 * u;
      const sy = 0.12 * sway * Math.sin(q.t * 2.2 - i * 0.6);
      const cx = i === 0 ? 0.25 : 0.04;
      const cy = (i === 0 ? 0.6 : 0.36 * q.curl) + 0.1 * sway * Math.sin(q.t * 1.7 - i * 0.5) * u;
      tail[i].rotation.set(lerp(sx, cx, k), lerp(sy, cy, k), 0);
      if (kink && i === TAIL_N - 2) tail[i].rotation.x += 0.5;
    }
  }
  pose();
  const toLocal = (v) => {
    root.updateMatrixWorld(true);
    return root.worldToLocal(v.clone());
  };
  const headWorld = (v = new THREE.Vector3()) => head.getWorldPosition(v);
  return { root, pose, head, neck, torso, eyes, ears, tail, breed: b, toLocal, headWorld };
}

// Little flat cat-face icon (for globe markers, crowds of icons, etc.).
export function catFaceTexture(color = '#f0a04b', inner = '#f6b3b8', eye = '#3b2a1a') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.lineJoin = 'round';
  const shape = () => {
    g.beginPath();
    g.moveTo(22, 58);
    g.lineTo(26, 14);
    g.lineTo(50, 34);
    g.quadraticCurveTo(64, 30, 78, 34);
    g.lineTo(102, 14);
    g.lineTo(106, 58);
    g.quadraticCurveTo(112, 108, 64, 112);
    g.quadraticCurveTo(16, 108, 22, 58);
    g.closePath();
  };
  shape();
  g.lineWidth = 14;
  g.strokeStyle = '#ffffff';
  g.stroke();
  g.fillStyle = color;
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = '#17256b';
  g.stroke();
  g.fillStyle = inner;
  for (const [a, bb, cc] of [[[30, 26], [32, 50], [46, 38]], [[98, 26], [96, 50], [82, 38]]]) {
    g.beginPath();
    g.moveTo(...a);
    g.lineTo(...bb);
    g.lineTo(...cc);
    g.fill();
  }
  g.fillStyle = eye;
  for (const x of [46, 82]) {
    g.beginPath();
    g.ellipse(x, 70, 7, 10, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#ff7f95';
  g.beginPath();
  g.moveTo(58, 82);
  g.lineTo(70, 82);
  g.lineTo(64, 89);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
