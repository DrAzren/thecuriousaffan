// Cicak: a common house gecko (Hemidactylus-style), built procedurally so it
// looks the same in every shot.
//
// Anatomy kept natural: flattened head with big lidless eyes and vertical
// pupils, slender body, four splayed legs, five toes per foot with widened
// toe pads (lamellae underneath) and tiny claws, long tapering tail. The face
// is softened (slightly larger eyes, gentle mouth line) to stay friendly.
//
// Local frame: the surface the gecko stands on is the plane y = 0, the back
// points to +y, the snout to +x. Snout to tail tip is ~0.92 units; use
// root.scale for size. Put it on a ceiling or wall by orienting `root`.
//
// The gait is driven by distance walked (D), so feet stay planted while the
// body moves: call update({ D }) and move root along its heading by D * scale.
import * as THREE from 'three';
import { clamp, lerp, smooth } from './core.js';

export const GECKO = {
  back: '#d6ae8a',
  spot: '#a8795a',
  belly: '#f4e4cc',
  toe: 0xe9bea6,
  pad: '#e2a993',
  lamella: '#f7d9c8',
  iris: 0xc89a52,
  claw: 0xf0e4d8,
};

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

// Body texture: x = angle around the body (0..1, 0.5 = back, seam under the belly), y = head -> tail.
function bodyTexture() {
  return canvasTex(512, 1024, (g, w, h) => {
    for (let x = 0; x < w; x++) {
      const back = -Math.cos((x / w) * Math.PI * 2); // +1 on the back (x = 0.5), -1 on the belly (seam)
      const k = smooth(clamp((back + 0.25) / 0.7));
      g.fillStyle = k > 0.5 ? GECKO.back : GECKO.belly;
      g.globalAlpha = 1;
      g.fillRect(x, 0, 1, h);
      g.globalAlpha = 1 - Math.abs(k - 0.5) * 2;
      g.fillStyle = '#e8c9a8';
      g.fillRect(x, 0, 1, h);
    }
    g.globalAlpha = 1;
    let s = 7;
    const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    // soft mottling on the back
    for (let i = 0; i < 120; i++) {
      const x = w * (0.33 + R() * 0.34), y = R() * h, r = 3 + R() * 7;
      g.fillStyle = `rgba(150,105,75,${0.1 + R() * 0.14})`;
      g.beginPath();
      g.ellipse(x, y, r, r * (1.2 + R()), 0, 0, Math.PI * 2);
      g.fill();
    }
    // pale tubercles (tiny bumps) on the back
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(255,240,222,${0.25 + R() * 0.3})`;
      g.beginPath();
      g.arc(w * (0.31 + R() * 0.38), R() * h, 1.5 + R() * 2, 0, Math.PI * 2);
      g.fill();
    }
    // faint tail rings
    for (let y = 0; y < h * 0.6; y += 26) { // canvas top = tail (texture is flipped)
      g.fillStyle = 'rgba(140,95,70,0.12)';
      g.fillRect(0, y, w, 6);
    }
  });
}

function headTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, GECKO.back);
    gr.addColorStop(0.5, '#e2bf9c');
    gr.addColorStop(0.62, GECKO.belly);
    gr.addColorStop(1, GECKO.belly);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    let s = 3;
    const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 60; i++) {
      g.fillStyle = `rgba(150,105,75,${0.12 + R() * 0.2})`;
      g.beginPath();
      g.arc(R() * w, R() * h * 0.4, 2 + R() * 5, 0, Math.PI * 2);
      g.fill();
    }
  });
}

// Toe-pad underside: rows of chevron lamellae (scansors).
export function lamellaTexture() {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = GECKO.pad;
    g.fillRect(0, 0, w, h);
    const rows = 7;
    for (let i = 0; i < rows; i++) {
      const y = ((i + 0.6) / rows) * h;
      g.strokeStyle = GECKO.lamella;
      g.lineWidth = h / rows * 0.48;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(w * 0.1, y + 10);
      g.quadraticCurveTo(w * 0.5, y - 16, w * 0.9, y + 10);
      g.stroke();
      g.strokeStyle = 'rgba(160,95,80,0.55)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(w * 0.5, y - 12);
      g.lineTo(w * 0.5, y + 8);
      g.stroke();
    }
  });
}

const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0, ...o });

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
const _q = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

// Place a unit cylinder (along y, height 1) between two points.
function stretch(m, p0, p1) {
  _a.subVectors(p1, p0);
  const len = _a.length();
  m.position.copy(p0).addScaledVector(_a, 0.5);
  m.quaternion.setFromUnitVectors(UP, _a.normalize());
  m.scale.set(1, Math.max(1e-4, len), 1);
}

// Two-bone IK: elbow position for shoulder S, target T, bone lengths, pole dir.
function ik(S, T, L1, L2, pole, out) {
  _b.subVectors(T, S);
  const dist = clamp(_b.length(), 0.01, L1 + L2 - 1e-4);
  _b.normalize();
  const ang = Math.acos(clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1));
  _c.copy(pole).addScaledVector(_b, -pole.dot(_b)).normalize();
  _d.copy(_b).multiplyScalar(Math.cos(ang)).addScaledVector(_c, Math.sin(ang));
  return out.copy(S).addScaledVector(_d, L1);
}

export function makeGecko({ tone = 1 } = {}) {
  const M = {
    body: std({ map: bodyTexture(), emissive: 0x3a1c0c, emissiveIntensity: 0.22 * tone }),
    head: std({ map: headTexture(), emissive: 0x3a1c0c, emissiveIntensity: 0.22 * tone }),
    limb: std({ color: 0xd7ad8a, emissive: 0x3a1c0c, emissiveIntensity: 0.2 }),
    toe: std({ color: GECKO.toe, emissive: 0x3a1c0c, emissiveIntensity: 0.2 }),
    pad: std({ map: lamellaTexture(), roughness: 0.7, side: THREE.DoubleSide }),
    claw: std({ color: GECKO.claw, roughness: 0.3 }),
    eye: new THREE.MeshPhysicalMaterial({ color: GECKO.iris, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x3a2408, emissiveIntensity: 0.4 }),
    pupil: std({ color: 0x0b0806, roughness: 0.2 }),
    shine: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    dark: std({ color: 0x6e4535, roughness: 0.6 }),
  };

  const root = new THREE.Group();
  root.name = 'Gecko';
  const rig = new THREE.Group(); // everything except root transform
  root.add(rig);

  // ------------------------------------------------------------ body loft
  const NS = 64, NR = 18;
  const xAt = (s) => 0.15 - 0.77 * s;
  const prof = (s) => {
    let rz, ry;
    if (s < 0.36) {
      const k = Math.sin(Math.PI * clamp((s + 0.04) / 0.42));
      rz = 0.034 + 0.026 * k;
      ry = 0.027 + 0.011 * k;
    } else {
      const k = Math.pow(1 - (s - 0.36) / 0.64, 1.15);
      rz = 0.003 + 0.033 * k;
      ry = 0.003 + 0.026 * k;
    }
    return [ry, rz];
  };
  const pos = new Float32Array(NS * NR * 3);
  const uv = new Float32Array(NS * NR * 2);
  const idx = [];
  for (let i = 0; i < NS; i++) {
    for (let j = 0; j < NR; j++) {
      uv.set([j / (NR - 1), i / (NS - 1)], (i * NR + j) * 2);
      if (i < NS - 1 && j < NR - 1) {
        const a = i * NR + j, b = a + NR;
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
  const bodyGeo = new THREE.BufferGeometry();
  bodyGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  bodyGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  bodyGeo.setIndex(idx);
  const body = new THREE.Mesh(bodyGeo, M.body);
  body.castShadow = body.receiveShadow = true;
  body.frustumCulled = false;
  rig.add(body);
  // neck plug (hides the open front of the body loft under the head)
  const neckPlug = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), M.head);
  neckPlug.castShadow = true;
  rig.add(neckPlug);
  // tail tip cap
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 8, 6), M.body);
  rig.add(tip);

  // ------------------------------------------------------------------ head
  const head = new THREE.Group();
  rig.add(head);
  const hg = new THREE.SphereGeometry(1, 48, 32);
  const hp = hg.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    let x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
    const f = clamp((x + 1) / 2); // 0 back .. 1 snout
    const taper = 1 - 0.55 * Math.pow(f, 2.2);
    z *= taper * (1 + 0.12 * Math.exp(-(((f - 0.35) / 0.2) ** 2)));
    y *= (y > 0 ? 1 : 0.75) * (1 - 0.35 * Math.pow(f, 2));
    hp.setXYZ(i, x, y, z);
  }
  hg.computeVertexNormals();
  const headMesh = new THREE.Mesh(hg, M.head);
  headMesh.scale.set(0.08, 0.036, 0.056);
  headMesh.position.set(0.062, 0.004, 0);
  headMesh.castShadow = headMesh.receiveShadow = true;
  head.add(headMesh);
  // eyes: big, lidless, golden iris, vertical pupil
  const eyes = [];
  for (const side of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(0.07, 0.017, 0.04 * side);
    e.rotation.set(-0.35, Math.atan2(0.5, 0.86 * side), 0, 'YXZ');
    head.add(e);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.018, 24, 18), M.eye);
    e.add(ball);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), M.pupil);
    pupil.scale.set(0.0036, 0.0125, 0.003);
    pupil.position.set(0, 0.001, 0.0162);
    e.add(pupil);
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 8, 6), M.shine);
    sh.position.set(0.0045, 0.0065, 0.0168);
    e.add(sh);
    // soft brow ridge of skin around the eye
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0178, 0.0032, 8, 24), M.head);
    ring.position.z = 0.004;
    e.add(ring);
    eyes.push(e);
  }
  // mouth line (gentle smile) and nostrils
  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.138, -0.008, 0.008 * side),
      new THREE.Vector3(0.11, -0.012, 0.027 * side),
      new THREE.Vector3(0.07, -0.011, 0.043 * side),
      new THREE.Vector3(0.035, -0.006, 0.049 * side),
    ]);
    head.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.0016, 6), M.dark));
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 8, 6), M.dark);
    n.position.set(0.134, 0.004, 0.009 * side);
    head.add(n);
  }

  // ------------------------------------------------------------------ legs
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
  const ball = new THREE.SphereGeometry(1, 12, 10);
  const padGeo = new THREE.CircleGeometry(1, 20);
  padGeo.rotateX(Math.PI / 2); // facing -y (towards the surface)
  const legs = [];
  const LEGS = [
    // name, spine s at shoulder, side, home foot (x offset from shoulder, z), pole, toe fan heading
    ['FL', 0.075, 1, [0.045, 0.1], [-0.5, 1, 0.4], 0.75],
    ['FR', 0.075, -1, [0.045, 0.1], [-0.5, 1, 0.4], 0.75],
    ['HL', 0.33, 1, [-0.035, 0.11], [0.6, 1, 0.4], 1.85],
    ['HR', 0.33, -1, [-0.035, 0.11], [0.6, 1, 0.4], 1.85],
  ];
  const TOE_LEN = [0.55, 0.85, 1, 1, 0.82];
  for (const [name, s, side, home, pole, fan] of LEGS) {
    const front = name[0] === 'F';
    const upper = new THREE.Mesh(cyl, M.limb);
    const lower = new THREE.Mesh(cyl, M.limb);
    const j0 = new THREE.Mesh(ball, M.limb);
    const j1 = new THREE.Mesh(ball, M.limb);
    for (const m of [upper, lower, j0, j1]) {
      m.castShadow = true;
      rig.add(m);
    }
    const rU = front ? 0.0135 : 0.016, rL = front ? 0.011 : 0.0125;
    upper.scale.x = upper.scale.z = rU;
    lower.scale.x = lower.scale.z = rL;
    j0.scale.setScalar(rU * 1.12);
    j1.scale.setScalar(rU * 1.02);
    const foot = new THREE.Group();
    rig.add(foot);
    const palm = new THREE.Mesh(ball, M.toe);
    palm.scale.set(0.014, 0.0075, 0.014);
    foot.add(palm);
    const toes = [];
    for (let i = 0; i < 5; i++) {
      const L = 0.04 * TOE_LEN[i];
      const toe = new THREE.Group();
      // fan in the surface plane; heading measured from +x towards the side (z)
      toe.rotation.y = side * (fan + (i - 2) * 0.42 * (front ? -1 : 1));
      foot.add(toe);
      const prox = new THREE.Group();
      toe.add(prox);
      const seg = new THREE.Mesh(cyl, M.toe);
      seg.rotation.z = -Math.PI / 2;
      seg.position.x = L * 0.3;
      seg.scale.set(0.0042, L * 0.6, 0.0042);
      prox.add(seg);
      const dist = new THREE.Group();
      dist.position.x = L * 0.55;
      prox.add(dist);
      // widened toe pad: skin on top, lamellae underneath
      const padTop = new THREE.Mesh(ball, M.toe);
      padTop.scale.set(L * 0.36, 0.0035, 0.0068);
      padTop.position.set(L * 0.27, 0.0005, 0);
      dist.add(padTop);
      const pad = new THREE.Mesh(padGeo, M.pad);
      pad.scale.set(L * 0.36, 1, 0.0068);
      pad.rotation.y = -Math.PI / 2; // texture rows run across the toe
      pad.position.set(L * 0.27, -0.0028, 0);
      dist.add(pad);
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.0011, 0.0045, 6), M.claw);
      claw.rotation.z = -Math.PI / 2 - 0.4;
      claw.position.set(L * 0.62, 0.0005, 0);
      dist.add(claw);
      toes.push({ toe, prox, dist });
    }
    legs.push({ name, s, side, home, pole: new THREE.Vector3(...pole).multiply(new THREE.Vector3(1, 1, side)), upper, lower, j0, j1, foot, toes, front, L1: front ? 0.06 : 0.066, L2: front ? 0.058 : 0.064, rU, rL });
  }

  // ---------------------------------------------------------------- update
  const spine = Array.from({ length: NS }, () => new THREE.Vector3());
  const tan = Array.from({ length: NS }, () => new THREE.Vector3());
  const S = new THREE.Vector3(), T = new THREE.Vector3(), E = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3();
  const STRIDE = 0.075, DUTY = 0.62, LC = STRIDE / DUTY;
  const OFF = { FL: 0, HR: 0.02, FR: 0.5, HL: 0.52 }; // diagonal pairs, like a trot

  // p: { D: distance walked, headYaw, headPitch, headRoll, tailSwish, curl: extra toe curl 0..1,
  //      plant: 1 = all feet down (standing), lookX }
  function update(p = {}) {
    const D = p.D ?? 0;
    const cyc = D / LC;
    const plant = p.plant ?? 0;
    // spine with gentle lateral S-wave in step with the legs
    for (let i = 0; i < NS; i++) {
      const s = i / (NS - 1);
      const [ry] = prof(s);
      const amp = (0.006 + 0.035 * s * s) * (1 - plant * 0.7);
      const z = amp * Math.sin(2 * Math.PI * cyc - s * 5.5) + (p.tailSwish ?? 0) * 0.12 * Math.pow(Math.max(0, s - 0.35), 2);
      const y = s < 0.36 ? 0.011 + ry : 0.006 + ry * 0.9;
      spine[i].set(xAt(s), y, z);
    }
    for (let i = 0; i < NS; i++) tan[i].subVectors(spine[Math.max(0, i - 1)], spine[Math.min(NS - 1, i + 1)]).normalize(); // points towards head
    for (let i = 0; i < NS; i++) {
      const s = i / (NS - 1);
      const [ry, rz] = prof(s);
      N.crossVectors(tan[i], UP).normalize(); // lateral
      B.crossVectors(N, tan[i]).normalize(); // up
      for (let j = 0; j < NR; j++) {
        const th = -Math.PI / 2 + (j / (NR - 1)) * Math.PI * 2; // seam under the belly
        const sy = Math.sin(th), cz = Math.cos(th);
        const yy = ry * sy * (sy < 0 ? 0.72 : 1);
        _a.copy(spine[i]).addScaledVector(B, yy).addScaledVector(N, rz * cz);
        pos.set([_a.x, _a.y, _a.z], (i * NR + j) * 3);
      }
    }
    bodyGeo.attributes.position.needsUpdate = true;
    bodyGeo.computeVertexNormals();
    tip.position.copy(spine[NS - 1]);
    const [nry, nrz] = prof(0);
    neckPlug.position.copy(spine[0]).addScaledVector(tan[0], -0.006);
    neckPlug.scale.set(0.03, nry * 0.92, nrz * 0.97);
    neckPlug.rotation.y = Math.atan2(-tan[0].z, tan[0].x);

    // head follows the neck tangent
    head.position.copy(spine[0]).addScaledVector(tan[0], 0.004);
    const yaw0 = Math.atan2(-tan[0].z, tan[0].x);
    head.rotation.set(p.headRoll ?? 0, yaw0 + (p.headYaw ?? 0), p.headPitch ?? 0, 'YZX');
    for (const e of eyes) e.children[1].position.x = 0.003 * (p.lookX ?? 0);

    // legs
    for (const L of legs) {
      const i = Math.round(L.s * (NS - 1));
      N.crossVectors(tan[i], UP).normalize();
      S.copy(spine[i]).addScaledVector(N, -L.side * prof(L.s)[1] * 0.75);
      S.y = spine[i].y - 0.004;
      // gait phase
      const ph = (((cyc + OFF[L.name]) % 1) + 1) % 1;
      let fx, fy = 0.003, curl = 0;
      if (ph < DUTY || plant >= 1) {
        const k = plant >= 1 ? 0.5 : ph / DUTY;
        fx = STRIDE * (0.5 - k);
        curl = smooth(clamp((k - 0.82) / 0.18)) * 0.9; // toes peel up from the tips before lift-off
      } else {
        const w = (ph - DUTY) / (1 - DUTY);
        fx = STRIDE * (-0.5 + smooth(w));
        fy += 0.028 * Math.sin(Math.PI * w);
        curl = 0.9 * (1 - smooth(clamp((w - 0.55) / 0.45)));
      }
      curl = Math.max(curl, p.curl ?? 0);
      T.set(xAt(L.s) + L.home[0] + fx, fy, -L.side * L.home[1]);
      ik(S, T, L.L1, L.L2, L.pole.clone().setZ(-L.pole.z), E);
      stretch(L.upper, S, E);
      stretch(L.lower, E, T);
      L.upper.scale.x = L.upper.scale.z = L.rU;
      L.lower.scale.x = L.lower.scale.z = L.rL;
      L.j0.position.copy(S);
      L.j1.position.copy(E);
      L.foot.position.copy(T);
      for (const t of L.toes) {
        t.prox.rotation.z = curl * 0.55;
        t.dist.rotation.z = curl * 1.0;
      }
    }
  }
  update();
  return { root, rig, head, legs, update, STRIDE, DUTY, LC, M };
}

// Orient `obj` so its local +y is `normal` and local +x points along `heading`
// (both world vectors), then place it at `pos`.
const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _m = new THREE.Matrix4();
export function placeOnSurface(obj, pos, normal, heading) {
  _y.copy(normal).normalize();
  _x.copy(heading).addScaledVector(_y, -heading.dot(_y)).normalize();
  _z.crossVectors(_x, _y);
  _m.makeBasis(_x, _y, _z);
  obj.quaternion.setFromRotationMatrix(_m);
  obj.position.copy(pos);
}
