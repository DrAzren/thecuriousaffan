// Episode 007 sets: the sunny park, the microscopic "skin world" Affan
// shrinks into, the bright bathroom (props only, no bathing person), the
// living room and the branded outro stage. All procedural and deterministic.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, clamp, lerp, smooth, inv, easeOut, easeInOut } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeSky, makeTree, makeBush, glow, glowTex } from '../../shared/props.js';

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

function shadowCfg(light, size, map = 2048) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  const c = light.shadow.camera;
  c.left = -size;
  c.right = size;
  c.top = size;
  c.bottom = -size;
  c.near = 1;
  c.far = 200;
  light.shadow.bias = -0.0005;
  light.shadow.normalBias = 0.02;
}

function canvasTex(w, h, draw, repeat = null) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}

// Floating motes (points), drifting deterministically with t.
function moteField(n, seed, box, colors, size = 7) {
  const R = rng(seed);
  const pos = new Float32Array(n * 3), base = new Float32Array(n * 3), col = new Float32Array(n * 3), ph = new Float32Array(n);
  const [x0, x1, y0, y1, z0, z1] = box;
  for (let i = 0; i < n; i++) {
    base.set([x0 + R() * (x1 - x0), y0 + R() * (y1 - y0), z0 + R() * (z1 - z0)], i * 3);
    const c = new THREE.Color(colors[i % colors.length]);
    col.set([c.r, c.g, c.b], i * 3);
    ph[i] = R() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { uTime: { value: 0 }, uSize: { value: size } },
    vertexShader: `attribute float aPh; uniform float uTime; uniform float uSize; varying vec3 vC; varying float vA;
      void main(){ vC = color; vA = 0.45 + 0.55 * sin(uTime * (0.8 + fract(aPh) * 1.6) + aPh);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * (0.7 + 0.5 * vA) * (60.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC, a * a * vA * 0.8); }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  pts.userData.update = (t) => {
    mat.uniforms.uTime.value = t;
    for (let i = 0; i < n; i++) {
      const p = ph[i];
      pos[i * 3] = base[i * 3] + Math.sin(t * 0.3 + p) * 1.2;
      pos[i * 3 + 1] = y0 + ((base[i * 3 + 1] - y0 + t * (0.25 + (p % 1) * 0.4)) % (y1 - y0));
      pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.27 + p) * 1.2;
    }
    g.attributes.position.needsUpdate = true;
  };
  return pts;
}

// --------------------------------------------------------------- shared props
// Affan's explorer magnifying glass (held in his right hand). The handle runs
// along the hand's local +z (out of the top of the fist), the lens beyond it.
export function makeMagnifier() {
  const g = new THREE.Group();
  const handle = add(g, new THREE.CylinderGeometry(0.06, 0.075, 0.5, 14), std(0xffc928, 0.4), [0, 0, 0.12], [Math.PI / 2, 0, 0]);
  handle.castShadow = false;
  add(g, new THREE.CylinderGeometry(0.085, 0.085, 0.08, 14), std(0x17256b, 0.5), [0, 0, 0.38], [Math.PI / 2, 0, 0]);
  const head = new THREE.Group();
  head.position.set(0, 0, 0.72);
  g.add(head);
  add(head, new THREE.TorusGeometry(0.3, 0.06, 14, 40), std(0x17256b, 0.45), [0, 0, 0], [0, Math.PI / 2, 0]);
  add(head, new THREE.TorusGeometry(0.3, 0.035, 10, 40), std(0xffc928, 0.35, { emissive: 0x6a4a00, emissiveIntensity: 0.25 }), [0.03, 0, 0], [0, Math.PI / 2, 0]);
  const lens = add(head, new THREE.CircleGeometry(0.29, 40), new THREE.MeshStandardMaterial({ color: 0xbff0ff, roughness: 0.05, transparent: true, opacity: 0.38, side: THREE.DoubleSide, emissive: 0x2a8fbf, emissiveIntensity: 0.25, depthWrite: false }), [0, 0, 0], [0, Math.PI / 2, 0]);
  lens.castShadow = false;
  const shine = add(head, new THREE.CircleGeometry(0.07, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide }), [0.01, 0.12, -0.1], [0, Math.PI / 2, 0], [0.7, 1.4, 1]);
  shine.castShadow = false;
  g.userData.head = head;
  return g;
}

function holdMagnifier(aff) {
  const m = makeMagnifier();
  aff.parts.arms.R.hand.add(m);
  m.position.set(0, -0.04, 0.02);
  m.visible = false;
  return m;
}

// Iridescent soap bubble (fresnel rim + highlight), cheap enough for SwiftShader.
export function bubbleMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uA: { value: 1 }, uT: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position;
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uA; uniform float uT; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ float f = 1.0 - abs(dot(vN, vV)); float rim = pow(f, 2.0);
        float h = vP.y * 2.2 + vP.x * 1.4 + uT * 0.6;
        vec3 c = mix(vec3(0.3, 0.82, 1.0), vec3(1.0, 0.62, 0.9), 0.5 + 0.5 * sin(h * 2.6));
        c = mix(c, vec3(0.75, 1.0, 0.7), 0.25 + 0.25 * sin(h * 4.1 + 1.3));
        vec3 L = normalize(vec3(-0.45, 0.75, 0.55)); float s = pow(max(dot(reflect(-L, vN), vV), 0.0), 60.0);
        vec3 L2 = normalize(vec3(0.6, -0.2, 0.7)); float s2 = pow(max(dot(reflect(-L2, vN), vV), 0.0), 30.0) * 0.4;
        float a = rim * 0.9 + 0.07 + s + s2;
        gl_FragColor = vec4(c * (0.35 + rim * 1.2) + vec3(s + s2), clamp(a, 0.0, 1.0) * uA); }`,
  });
}

export function makeBubble(r) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 36, 24), bubbleMaterial());
  m.renderOrder = 5;
  return m;
}

// Friendly microbe: rod (bacillus), ball (coccus), pair or chain, with a face.
export function makeBug({ shape = 'rod', color = 0x7ee08a, size = 1 } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const mat = std(color, 0.32, { emissive: color, emissiveIntensity: 0.14 });
  const dark = new THREE.Color(color).multiplyScalar(0.72);
  const spotMat = std(dark.getHex(), 0.4);
  let faceY = 0.62, faceZ = 0.42, faceX = 0;
  if (shape === 'rod') {
    add(body, new THREE.CapsuleGeometry(0.46, 1.0, 10, 24), mat, [0, 0.5, 0], [0, 0, Math.PI / 2]);
    for (const [x, z] of [[-0.55, 0.2], [0.6, -0.15], [0.1, -0.35]]) add(body, new THREE.SphereGeometry(0.09, 10, 8), spotMat, [x, 0.78, z], [0, 0, 0], [1, 0.4, 1], false);
    faceY = 0.6;
    faceZ = 0.43;
  } else if (shape === 'ball') {
    add(body, new THREE.SphereGeometry(0.58, 28, 20), mat, [0, 0.58, 0]);
    faceY = 0.66;
    faceZ = 0.5;
  } else if (shape === 'pair') {
    add(body, new THREE.SphereGeometry(0.5, 24, 18), mat, [-0.42, 0.5, 0]);
    add(body, new THREE.SphereGeometry(0.5, 24, 18), mat, [0.42, 0.5, 0]);
    faceX = -0.42;
    faceY = 0.56;
    faceZ = 0.44;
  } else {
    for (let i = 0; i < 3; i++) add(body, new THREE.SphereGeometry(0.42, 22, 16), mat, [(i - 1) * 0.72, 0.42 + Math.sin(i * 1.7) * 0.05, 0]);
    faceY = 0.48;
    faceZ = 0.37;
  }
  const white = std(0xffffff, 0.3, { emissive: 0xffffff, emissiveIntensity: 0.15 });
  const pupil = std(0x1a1030, 0.25);
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(faceX + 0.17 * s, faceY + 0.06, faceZ);
    body.add(e);
    add(e, new THREE.SphereGeometry(0.13, 16, 12), white, [0, 0, 0], [0, 0, 0], [1, 1.15, 0.8], false);
    add(e, new THREE.SphereGeometry(0.075, 12, 10), pupil, [0, -0.01, 0.08], [0, 0, 0], [1, 1.1, 0.6], false);
    add(e, new THREE.SphereGeometry(0.025, 8, 6), shine, [0.025, 0.03, 0.13], [0, 0, 0], [1, 1, 1], false);
    eyes.push(e);
  }
  const smile = add(body, new THREE.TorusGeometry(0.08, 0.022, 6, 16, Math.PI), std(0x3a1630, 0.4), [faceX, faceY - 0.13, faceZ + 0.02], [0, 0, Math.PI], [1, 0.8, 1], false);
  for (const s of [-1, 1]) {
    const b = add(body, new THREE.CircleGeometry(0.06, 14), new THREE.MeshBasicMaterial({ color: 0xff7aa8, transparent: true, opacity: 0.45, depthWrite: false }), [faceX + 0.28 * s, faceY - 0.08, faceZ + 0.0], [0, 0.4 * s, 0], [1, 0.7, 1], false);
    b.position.z += shape === 'ball' ? -0.04 : 0;
  }
  g.scale.setScalar(size);
  g.userData = { body, eyes, smile, mat };
  // idle animation: bob, squash and an occasional happy wiggle
  g.userData.anim = (t, seed = 0, wave = 0) => {
    const b = Math.sin(t * 3.2 + seed);
    body.position.y = 0.06 * (b + 1);
    body.scale.set(1 + 0.04 * b, 1 - 0.04 * b, 1 + 0.04 * b);
    body.rotation.z = 0.08 * Math.sin(t * 1.7 + seed * 2) + wave * 0.28 * Math.sin(t * 11 + seed);
    const bl = ((t + seed * 0.63) % 3.4) < 0.14 ? 0.15 : 1;
    eyes.forEach((e) => (e.scale.y = bl));
  };
  return g;
}

function makeDrop(r, mat) {
  // teardrop: sphere + cone, pointing up
  const g = new THREE.Group();
  add(g, new THREE.SphereGeometry(r, 18, 14), mat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  add(g, new THREE.ConeGeometry(r * 0.86, r * 1.5, 18), mat, [0, r * 1.05, 0], [0, 0, 0], [1, 1, 1], false);
  return g;
}

// Football with an original two-tone panel pattern (cyan + navy on white).
function ballTexture() {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    const R = rng(4);
    for (let i = 0; i < 14; i++) {
      const x = (i % 7) * (w / 7) + (Math.floor(i / 7) % 2) * (w / 14) + 30;
      const y = Math.floor(i / 7) * (h / 2) + h / 4 + (R() - 0.5) * 10;
      g.fillStyle = i % 2 ? '#1c2752' : '#2bb8e8';
      g.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
        g.lineTo(x + Math.cos(a) * 26, y + Math.sin(a) * 26);
      }
      g.closePath();
      g.fill();
    }
  });
}

// ===================================================================== PARK
export function buildPark() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfeeff, 40, 160);
  const sky = makeSky({ top: 0x2f8ff0, mid: 0x6cc0ff, horizon: 0xe2f6ff, bottom: 0x8fd17a });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xf2fbff, 0x6aa85a, 1.35));
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.7);
  sun.position.set(9, 16, 12);
  shadowCfg(sun, 9);
  scene.add(sun, sun.target);
  const sunGlow = glow(0xfff2c0, 120, 0.9);
  sunGlow.position.set(-160, 190, -420);
  scene.add(sunGlow);
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(18, 40), new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false }));
  sunDisc.position.copy(sunGlow.position);
  sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);

  const grass = canvasTex(512, 512, (g, w, h) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#79cc5e' : '#6cc254';
      g.fillRect(0, (i * h) / 8, w, h / 8);
    }
    const R = rng(11);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = R() < 0.5 ? 'rgba(60,140,50,0.35)' : 'rgba(160,230,120,0.3)';
      g.fillRect(R() * w, R() * h, 2, 5);
    }
  }, [30, 30]);
  const ground = add(scene, new THREE.PlaneGeometry(400, 400), std(0xffffff, 0.95, { map: grass }), [0, 0, 0], [-Math.PI / 2, 0, 0.5], [1, 1, 1], false);
  ground.receiveShadow = true;

  // sandy path
  add(scene, new THREE.RingGeometry(16, 18.5, 80), std(0xf2d9a6, 0.95), [0, 0.01, -2], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;

  const R = rng(31);
  const leaf = [[0x58c96a], [0x3fb36a], [0x8fd65a], [0x2fa58a]];
  for (let i = 0; i < 46; i++) {
    const a = R() * Math.PI * 2;
    const r = 13 + R() * 40;
    const x = Math.cos(a) * r, z = Math.sin(a) * r - 6;
    if (z > 6 && Math.abs(x) < 14) continue; // keep behind camera clear
    const tr = makeTree(R, { scale: 1.1 + R() * 0.9, leaf: leaf[Math.floor(R() * 4)], trunk: 0x8f6040, toy: true });
    tr.position.set(x, 0, z);
    scene.add(tr);
  }
  for (let i = 0; i < 30; i++) {
    const a = R() * Math.PI * 2, r = 9 + R() * 18;
    const x = Math.cos(a) * r, z = Math.sin(a) * r - 4;
    if (z > 4 && Math.abs(x) < 10) continue;
    const b = makeBush(R, { scale: 0.9 + R() * 0.6, color: [0x4cb85a, 0x3aa36a, 0x6cc85a][i % 3] });
    b.position.set(x, 0, z);
    scene.add(b);
  }
  // flowers
  const petal = [0xff8fb1, 0xffd84a, 0xffffff, 0xff9a62, 0x9fd8ff];
  for (let i = 0; i < 90; i++) {
    const x = (R() - 0.5) * 34, z = -2 - R() * 22;
    if (Math.abs(x) < 3 && z > -6) continue;
    add(scene, new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshStandardMaterial({ color: petal[i % 5], roughness: 0.6, emissive: petal[i % 5], emissiveIntensity: 0.12 }), [x, 0.12, z], [0, 0, 0], [1, 0.6, 1], false);
  }
  // small goal frame (white posts + net)
  const goal = new THREE.Group();
  const white = std(0xffffff, 0.4);
  add(goal, new THREE.CylinderGeometry(0.09, 0.09, 2.2, 12), white, [-2.4, 1.1, 0]);
  add(goal, new THREE.CylinderGeometry(0.09, 0.09, 2.2, 12), white, [2.4, 1.1, 0]);
  add(goal, new THREE.CylinderGeometry(0.09, 0.09, 4.9, 12), white, [0, 2.2, 0], [0, 0, Math.PI / 2]);
  const net = canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.lineWidth = 3;
    for (let i = 0; i <= 16; i++) {
      g.beginPath();
      g.moveTo((i * w) / 16, 0);
      g.lineTo((i * w) / 16, h);
      g.moveTo(0, (i * h) / 16);
      g.lineTo(w, (i * h) / 16);
      g.stroke();
    }
  });
  add(goal, new THREE.PlaneGeometry(4.8, 2.2), new THREE.MeshBasicMaterial({ map: net, transparent: true, side: THREE.DoubleSide, depthWrite: false }), [0, 1.1, -1.2], [0, 0, 0], [1, 1, 1], false);
  goal.position.set(5.5, 0, -9);
  goal.rotation.y = -0.35;
  scene.add(goal);
  // bench
  const bench = new THREE.Group();
  const wood = std(0xd9874a, 0.7);
  for (let i = 0; i < 3; i++) add(bench, new RoundedBoxGeometry(3, 0.12, 0.28, 2, 0.04), wood, [0, 0.9, -0.35 + i * 0.32]);
  for (let i = 0; i < 2; i++) add(bench, new RoundedBoxGeometry(3, 0.12, 0.26, 2, 0.04), wood, [0, 1.35 + i * 0.32, -0.55], [-0.2, 0, 0]);
  for (const x of [-1.3, 1.3]) add(bench, new THREE.BoxGeometry(0.12, 0.9, 0.9), std(0x2f3b5e, 0.5), [x, 0.45, -0.2]);
  bench.position.set(-6.5, 0, -7.5);
  bench.rotation.y = 0.45;
  scene.add(bench);
  // water bottle on the bench (Affan's)
  add(scene, new THREE.CylinderGeometry(0.16, 0.16, 0.55, 16), std(0x2bb8e8, 0.3), [-6.1, 1.25, -7.2]);

  const ball = new THREE.Group();
  add(ball, new THREE.SphereGeometry(0.32, 32, 20), std(0xffffff, 0.45, { map: ballTexture() }));
  scene.add(ball);

  const aff = makeAffan();
  scene.add(aff.root);
  const mag = holdMagnifier(aff);
  // sweat drops on Affan (head-local), shown during "badan melekit"
  const dropMat = new THREE.MeshStandardMaterial({ color: 0xa8ecff, roughness: 0.05, transparent: true, opacity: 0.85, emissive: 0x3aa0c8, emissiveIntensity: 0.35 });
  const sweat = [];
  for (const [x, y, z, r] of [[-0.62, 0.22, 0.52, 0.055], [0.66, 0.12, 0.5, 0.05], [-0.45, 0.38, 0.66, 0.045], [0.5, 0.33, 0.66, 0.04]]) {
    const d = makeDrop(r, dropMat);
    d.position.set(x, y, z);
    aff.parts.head.add(d);
    sweat.push({ d, x, y, z });
  }
  const motes = moteField(160, 7, [-14, 14, 0.3, 7, -16, 8], [0xfff6c8, 0xffffff, 0xd8ffb8], 5);
  scene.add(motes);
  return { scene, sky, sun, aff, mag, ball, sweat, motes };
}

// ================================================================ SKIN WORLD
// Height of the skin surface at (x, z): soft cell "pillows" separated by
// grooves, a few big furrows, pores and gentle large-scale undulation.
const CELL = 4.2;
const hash = (i, j, k) => {
  const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
export const PORES = [[-5, -3], [3, -18.5], [9, -1], [-10, -15], [12, -20], [-14, -4]];
function cellInfo(x, z) {
  const ci = Math.floor(x / CELL), cj = Math.floor(z / CELL);
  let d1 = 1e9, d2 = 1e9, id = 0;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
    const i = ci + a, j = cj + b;
    const px = (i + 0.15 + 0.7 * hash(i, j, 1)) * CELL, pz = (j + 0.15 + 0.7 * hash(i, j, 2)) * CELL;
    const d = Math.hypot(x - px, z - pz);
    if (d < d1) {
      d2 = d1;
      d1 = d;
      id = hash(i, j, 3);
    } else if (d < d2) d2 = d;
  }
  return { border: d2 - d1, id };
}
export function skinH(x, z) {
  const { border } = cellInfo(x, z);
  let h = 0.55 * Math.sqrt(clamp(border / 1.5));
  h += 0.7 * Math.sin(x * 0.08 + 1.0) * Math.cos(z * 0.065) + 0.35 * Math.sin((x + z) * 0.045 + 2);
  const f = Math.abs(Math.sin((x * 0.6 + z * 0.8) * 0.11 + 0.6));
  h -= 0.85 * (1 - smooth(clamp(f / 0.14)));
  for (const [px, pz] of PORES) {
    const d = Math.hypot(x - px, z - pz);
    h += -1.1 * Math.exp(-((d / 1.1) ** 2)) + 0.28 * Math.exp(-(((d - 1.5) / 0.55) ** 2));
  }
  return h;
}

function skinGround() {
  const size = 150, seg = 300;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  const a = new THREE.Color(0xf6b496), b = new THREE.Color(0xec9c84), groove = new THREE.Color(0xcf6f6a), pore = new THREE.Color(0xa85358);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const h = skinH(x, z);
    p.setY(i, h);
    const { border, id } = cellInfo(x, z);
    c.copy(a).lerp(b, id);
    c.lerp(groove, 1 - smooth(clamp(border / 0.9)));
    let pd = 1e9;
    for (const [px, pz] of PORES) pd = Math.min(pd, Math.hypot(x - px, z - pz));
    c.lerp(pore, Math.exp(-((pd / 1.0) ** 2)) * 0.9);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0, emissive: 0x4a1a10, emissiveIntensity: 0.16 });
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  return m;
}

function hairShaft(x, z, lean, seed) {
  const R = rng(seed);
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const k = i / 8;
    pts.push(new THREE.Vector3(x + lean[0] * k * k * 14 + (R() - 0.5) * 0.4, -1 + k * 46, z + lean[1] * k * k * 14));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.Group();
  const mat = std(0x4a2c1c, 0.42, { emissive: 0x1a0a04, emissiveIntensity: 0.3 });
  add(g, new THREE.TubeGeometry(curve, 64, 1.05, 20, false), mat);
  // cuticle rings for texture
  for (let i = 1; i < 14; i++) {
    const p = curve.getPointAt(i / 15), tg = curve.getTangentAt(i / 15);
    const r = add(g, new THREE.TorusGeometry(1.06, 0.07, 6, 24), mat, [p.x, p.y, p.z], [0, 0, 0], [1, 1, 1], false);
    r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tg);
  }
  add(g, new THREE.TorusGeometry(1.5, 0.45, 12, 32), std(0xe39a88, 0.6), [x, skinH(x, z) - 0.1, z], [Math.PI / 2, 0, 0]);
  return g;
}

export function buildSkin() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf7c2b0, 34, 120);
  const sky = makeSky({ top: 0xffd3c2, mid: 0xf9c0ae, horizon: 0xf7c2b0, bottom: 0xeea893 });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xfff6ee, 0xc8706a, 1.0));
  const key = new THREE.DirectionalLight(0xfff1e0, 2.5);
  key.position.set(10, 22, 14);
  shadowCfg(key, 22);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x7fe4ff, 1.4);
  rim.position.set(-14, 8, -20);
  scene.add(rim);

  const ground = skinGround();
  scene.add(ground);
  for (const [x, z, lean, s] of [[-15, -26, [0.3, -0.2], 3], [13, -30, [-0.2, -0.3], 4], [24, -9, [-0.4, 0.1], 5], [-22, -7, [0.35, 0.05], 6], [-4, -42, [0.1, -0.2], 7]]) {
    scene.add(hairShaft(x, z, lean, s));
  }
  const motes = moteField(420, 9, [-30, 30, 0.5, 18, -45, 18], [0xffffff, 0xbff4ff, 0xfff1c8, 0xffd0e8], 9);
  scene.add(motes);

  const on = (x, z, dy = 0) => new THREE.Vector3(x, skinH(x, z) + dy, z);

  // ---- sweat droplets (clear blue domes)
  const sweatMat = new THREE.MeshStandardMaterial({ color: 0x5fd4ff, roughness: 0.04, metalness: 0.0, transparent: true, opacity: 0.74, emissive: 0x1588c8, emissiveIntensity: 0.55, depthWrite: false });
  const hiMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  const droplets = [];
  const mkDroplet = (x, z, r, carried = true) => {
    const g = new THREE.Group();
    const dome = add(g, new THREE.SphereGeometry(r, 36, 24), sweatMat, [0, 0, 0], [0, 0, 0], [1, 0.82, 1], false);
    dome.renderOrder = 3;
    add(g, new THREE.SphereGeometry(r * 0.22, 12, 8), hiMat, [-r * 0.35, r * 0.45, r * 0.55], [0, 0, 0], [1, 0.6, 0.5], false);
    add(g, new THREE.SphereGeometry(r * 0.1, 8, 6), hiMat, [r * 0.3, r * 0.15, r * 0.75], [0, 0, 0], [1, 1, 0.5], false);
    const base = on(x, z, r * 0.45);
    g.position.copy(base);
    scene.add(g);
    const d = { g, base, r, x, z, carried };
    droplets.push(d);
    return d;
  };
  const D1 = mkDroplet(-5, -3, 1.6);
  for (const [x, z, r] of [[-8.5, -7, 0.9], [7.5, -1.5, 0.7], [-2, -13, 1.0], [9, -12, 0.8], [-11, -10, 0.7], [6, 2, 0.55]]) mkDroplet(x, z, r);
  const D2 = mkDroplet(3, -18.5, 1.5);

  // ---- oil blobs (glossy amber)
  const oilMat = new THREE.MeshStandardMaterial({ color: 0xffc23a, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.9, emissive: 0x8a5200, emissiveIntensity: 0.3 });
  const oils = [];
  const mkOil = (x, z, r) => {
    const g = new THREE.Group();
    const R = rng(Math.floor(x * 13 + z * 7 + 100));
    for (let i = 0; i < 4; i++) {
      const rr = r * (0.55 + R() * 0.45);
      add(g, new THREE.SphereGeometry(rr, 28, 16), oilMat, [(R() - 0.5) * r, 0, (R() - 0.5) * r], [0, 0, 0], [1, 0.32, 1], false).castShadow = true;
    }
    add(g, new THREE.SphereGeometry(r * 0.16, 10, 8), hiMat, [-r * 0.25, r * 0.3, r * 0.25], [0, 0, 0], [1.6, 0.4, 0.8], false);
    const base = on(x, z, 0.15);
    g.position.copy(base);
    scene.add(g);
    const o = { g, base, r, x, z, carried: true };
    oils.push(o);
    return o;
  };
  const O1 = mkOil(4.5, -5.5, 1.5);
  mkOil(-9, -1, 1.0);
  mkOil(8, -10, 1.1);
  mkOil(-6.5, -9.5, 0.8);

  // ---- dirt (crumbly brown rocks)
  const dirtMats = [std(0x7a5232, 0.95, { flatShading: true }), std(0x5e4029, 0.95, { flatShading: true }), std(0x93673f, 0.95, { flatShading: true })];
  const dirts = [];
  const mkDirt = (x, z, r, seed) => {
    const g = new THREE.Group();
    const R = rng(seed);
    const n = 3 + Math.floor(R() * 3);
    for (let i = 0; i < n; i++) {
      const rr = r * (0.35 + R() * 0.55);
      const m = add(g, new THREE.DodecahedronGeometry(rr, 0), dirtMats[i % 3], [(R() - 0.5) * r * 1.4, rr * 0.5, (R() - 0.5) * r * 1.4], [R() * 3, R() * 3, R() * 3], [1, 0.75, 1.1]);
      m.castShadow = true;
    }
    const base = on(x, z, 0);
    g.position.copy(base);
    scene.add(g);
    const d = { g, base, r, x, z, carried: true };
    dirts.push(d);
    return d;
  };
  const K1 = mkDirt(0.5, -7.5, 1.3, 41);
  for (const [x, z, r, s] of [[-12, -5, 0.9, 42], [11, -6, 1.0, 43], [-3, -17, 0.8, 44], [7, -15, 0.7, 45], [-7.5, 2, 0.6, 46]]) mkDirt(x, z, r, s);

  // ---- bacteria
  const bugs = [];
  const mkBug = (x, z, opts, yaw = 0, carried = false) => {
    const b = makeBug(opts);
    const base = on(x, z, 0);
    b.position.copy(base);
    b.rotation.y = yaw;
    scene.add(b);
    const o = { b, base, x, z, yaw, carried, seed: bugs.length * 1.37 };
    bugs.push(o);
    return o;
  };
  // the friendly resident colony (stays after washing)
  const colony = [
    [-4.5, -16.5, { shape: 'rod', color: 0x7ee08a }, 0.4],
    [-1.5, -20.5, { shape: 'ball', color: 0xb9a2ff }, 0.2],
    [7.5, -19.5, { shape: 'pair', color: 0x5fd6d0 }, -0.4],
    [-6.5, -21, { shape: 'chain', color: 0x8fd0ff, size: 0.9 }, 0.5],
    [9.5, -16, { shape: 'ball', color: 0xffd36a, size: 0.85 }, -0.6],
    [0.5, -24, { shape: 'rod', color: 0xff9ec4, size: 0.9 }, 0.1],
    [-9.5, -18, { shape: 'pair', color: 0x9be37a, size: 0.85 }, 0.7],
    [5, -24.5, { shape: 'chain', color: 0xb9a2ff, size: 0.85 }, -0.2],
  ].map(([x, z, o, y]) => mkBug(x, z, o, y, false));
  // odour-making bacteria near the sweat droplet D2 (rinsed away later)
  const odor = [
    [1.0, -16.6, 0.6],
    [5.1, -17.0, -0.7],
    [3.2, -16.0, 0.0],
  ].map(([x, z, y]) => mkBug(x, z, { shape: 'ball', color: 0xffa04a, size: 0.8 }, y, true));
  // a germ that the soap lifts away
  const germ = mkBug(-3.5, -7.2, { shape: 'rod', color: 0xa77bff, size: 0.85 }, 0.2, true);

  // ---- odour puffs rising from D2
  const puffMat = new THREE.MeshStandardMaterial({ color: 0xeaff8a, roughness: 0.9, transparent: true, opacity: 0.3, emissive: 0x9ab020, emissiveIntensity: 0.45, depthWrite: false });
  const puffs = [];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group();
    for (let k = 0; k < 3; k++) add(g, new THREE.SphereGeometry(0.42 - k * 0.08, 16, 12), puffMat, [Math.cos(k * 2.1) * 0.35, k * 0.15, Math.sin(k * 2.1) * 0.35], [0, 0, 0], [1, 1, 1], false);
    g.visible = false;
    scene.add(g);
    puffs.push(g);
  }

  // ---- soap molecules (water-loving cyan head, oil-loving yellow tail)
  const NM = 34;
  const cargos = [O1, K1, germ];
  const NMOL = NM * 3 + 26;
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 16, 12), std(0x2fbaff, 0.25, { emissive: 0x0a5aa0, emissiveIntensity: 0.35 }), NMOL);
  const tails = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.05, 0.38, 4, 8), std(0xffd24a, 0.35, { emissive: 0x7a5a00, emissiveIntensity: 0.25 }), NMOL);
  heads.castShadow = tails.castShadow = true;
  heads.frustumCulled = tails.frustumCulled = false;
  scene.add(heads, tails);
  const molR = rng(77);
  const mols = [];
  for (let i = 0; i < NMOL; i++) {
    const c = i < NM * 3 ? Math.floor(i / NM) : -1;
    // fibonacci sphere direction around the cargo
    const k = i % NM;
    const y = 1 - (2 * (k + 0.5)) / NM;
    const r = Math.sqrt(1 - y * y);
    const phi = k * 2.39996;
    mols.push({
      c,
      dir: new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r),
      start: c >= 0 ? new THREE.Vector3((molR() - 0.5) * 7, 3.5 + molR() * 4, (molR() - 0.5) * 5) : new THREE.Vector3((molR() - 0.5) * 26, 5 + molR() * 5, -10 + (molR() - 0.5) * 14),
      ph: molR() * 10,
      spin: new THREE.Vector3(molR() - 0.5, molR() - 0.5, molR() - 0.5).normalize(),
    });
  }

  // ---- big soap bubbles
  const bubbles = [];
  for (let i = 0; i < 9; i++) {
    const b = makeBubble(1);
    b.visible = false;
    scene.add(b);
    bubbles.push(b);
  }

  // ---- rinse water: translucent sheet behind a rolling foamy front
  const waterMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uFront: { value: -60 }, uA: { value: 0 } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uT; uniform float uFront; uniform float uA; varying vec3 vW;
      void main(){ if (vW.x > uFront) discard;
        float s = sin((vW.x - uT * 14.0) * 0.9 + sin(vW.z * 0.5) * 1.5) * 0.5 + 0.5;
        float s2 = sin((vW.x - uT * 9.0) * 2.3 + vW.z * 1.1) * 0.5 + 0.5;
        float edge = smoothstep(uFront - 3.0, uFront, vW.x);
        vec3 c = mix(vec3(0.36, 0.84, 1.0), vec3(0.75, 0.96, 1.0), s * 0.5 + s2 * 0.3);
        c = mix(c, vec3(1.0), edge * 0.8 + pow(s2, 8.0) * 0.6);
        gl_FragColor = vec4(c, (0.42 + 0.25 * s + edge * 0.4) * uA); }`,
  });
  const waterGeo = new THREE.PlaneGeometry(150, 150, 150, 150);
  waterGeo.rotateX(-Math.PI / 2);
  const wp = waterGeo.attributes.position;
  for (let i = 0; i < wp.count; i++) wp.setY(i, Math.max(skinH(wp.getX(i), wp.getZ(i)) + 0.9, 1.35));
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.renderOrder = 4;
  water.visible = false;
  scene.add(water);
  const foamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, emissive: 0xbfe8ff, emissiveIntensity: 0.4, transparent: true, opacity: 0.92 });
  const front = new THREE.Group();
  const FR = rng(91);
  for (let i = 0; i < 70; i++) {
    add(front, new THREE.SphereGeometry(0.5 + FR() * 0.9, 12, 10), foamMat, [(FR() - 0.5) * 2.0, 1.2 + FR() * 1.6, -60 + i * 1.6 + FR()], [0, 0, 0], [1, 1, 1], false);
  }
  const roll = add(front, new THREE.CylinderGeometry(1.5, 1.5, 150, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x7fdcff, roughness: 0.1, transparent: true, opacity: 0.6, emissive: 0x2a8fd0, emissiveIntensity: 0.3, depthWrite: false }), [-1.2, 1.4, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  roll.renderOrder = 4;
  front.visible = false;
  scene.add(front);

  const aff = makeAffan();
  scene.add(aff.root);
  const mag = holdMagnifier(aff);
  mag.visible = true;

  // ------------------------------------------------------------ world state
  const T_WASH0 = 25.66, T_WASH1 = 27.7; // rinse sweep
  const FRONT0 = -40, FRONT1 = 46;
  const frontX = (t) => lerp(FRONT0, FRONT1, inv(T_WASH0, T_WASH1, t));
  const FORM = [[22.5, 23.7], [23.5, 24.4], [24.4, 25.3]]; // micelle forming windows: oil, dirt, germ
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _m = new THREE.Matrix4(), _up = new THREE.Vector3(0, 1, 0);

  // Rinse displacement for something sitting at x: once the front passes,
  // it rides the water to the right, lifts and fades out.
  function rinse(t, x) {
    const fx = frontX(t);
    if (t < T_WASH0 || fx < x - 1) return { dx: 0, dy: 0, k: 1 };
    const ride = fx - (x - 1);
    return { dx: ride * 0.9, dy: Math.min(2.2, ride * 0.25) + 0.3 * Math.sin(ride), k: clamp(1 - ride / 22) };
  }
  // Cargo lift: once wrapped by soap, it rises off the skin.
  const cargoLift = (t, i) => 1.4 * easeInOut(inv(FORM[i][1] - 0.2, FORM[i][1] + 0.6, t));

  function update(t) {
    motes.userData.update(t);
    sky.position.set(0, 0, 0);
    for (const b of bubbles) b.material.uniforms.uT.value = t;
    // wet sheen after the rinse
    ground.material.roughness = lerp(0.62, 0.3, inv(T_WASH0, T_WASH1 + 0.5, t));
    // droplets: D2 shrinks as odour bacteria use the sweat; all rinse away
    for (const d of droplets) {
      const r = rinse(t, d.x);
      let s = 1;
      if (d === D2) s = lerp(1, 0.62, smooth(inv(16.6, 19.4, t)));
      d.g.position.set(d.base.x + r.dx, d.base.y + r.dy, d.base.z);
      d.g.scale.setScalar(Math.max(0.001, s * r.k));
      d.g.visible = r.k > 0.01;
    }
    for (const o of oils) {
      const r = rinse(t, o.x);
      const lift = o === O1 ? cargoLift(t, 0) : 0;
      o.g.position.set(o.base.x + r.dx, o.base.y + lift + r.dy, o.base.z);
      o.g.scale.setScalar(Math.max(0.001, r.k * (o === O1 ? lerp(1, 0.7, inv(FORM[0][0], FORM[0][1], t)) : 1)));
      o.g.visible = r.k > 0.01;
    }
    for (const d of dirts) {
      const r = rinse(t, d.x);
      const lift = d === K1 ? cargoLift(t, 1) : 0;
      d.g.position.set(d.base.x + r.dx, d.base.y + lift + r.dy, d.base.z);
      d.g.scale.setScalar(Math.max(0.001, r.k * (d === K1 ? lerp(1, 0.75, inv(FORM[1][0], FORM[1][1], t)) : 1)));
      d.g.rotation.y = d === K1 ? t * 0.6 * inv(FORM[1][1], FORM[1][1] + 1, t) : 0;
      d.g.visible = r.k > 0.01;
    }
    for (const o of bugs) {
      const r = o.carried ? rinse(t, o.x) : { dx: 0, dy: 0, k: 1 };
      const lift = o === germ ? cargoLift(t, 2) : 0;
      // odour-making bacteria shuffle up to the sweat droplet
      const ap = odor.includes(o) ? 0.4 * smooth(inv(16.3, 17.6, t)) : 0;
      o.b.position.set(lerp(o.base.x, D2.base.x, ap) + r.dx, o.base.y + lift + r.dy, lerp(o.base.z, D2.base.z, ap));
      o.b.scale.setScalar(Math.max(0.001, r.k) * (o.b.userData.size0 ?? (o.b.userData.size0 = o.b.scale.x)));
      o.b.visible = r.k > 0.01;
      o.b.userData.anim(t, o.seed, o.wave || 0);
    }
    // odour puffs
    const pk = inv(17.9, 18.5, t) * (1 - inv(25.5, 26.0, t));
    puffs.forEach((p, i) => {
      const ph = ((t - 17.9) * 0.45 + i / puffs.length) % 1;
      p.visible = pk > 0 && t > 17.9;
      const ang = i * 2.4;
      p.position.set(D2.base.x + Math.cos(ang) * (0.6 + ph * 1.6), D2.base.y + 0.6 + ph * 5.5, D2.base.z + Math.sin(ang) * (0.6 + ph * 1.6));
      p.scale.setScalar(Math.max(0.001, (0.6 + ph * 1.4) * Math.sin(ph * Math.PI) * pk));
    });
    // soap molecules
    const swarm = inv(21.9, 22.6, t);
    for (let i = 0; i < mols.length; i++) {
      const m = mols[i];
      let pos, aim;
      const drift = _v.set(Math.sin(t * 0.9 + m.ph) * 0.6, Math.sin(t * 1.3 + m.ph * 2) * 0.4, Math.cos(t * 0.8 + m.ph) * 0.6);
      if (m.c >= 0) {
        const cg = cargos[m.c];
        const [f0, f1] = FORM[m.c];
        const k = easeInOut(inv(f0, f1, t));
        const cp = cg.g ? cg.g.position : cg.b.position;
        const rad = (m.c === 0 ? 1.55 : m.c === 1 ? 1.45 : 1.25) + 0.12 * Math.sin(t * 3 + m.ph);
        const target = new THREE.Vector3().copy(m.dir).multiplyScalar(rad).add(cp).add(new THREE.Vector3(0, m.c === 2 ? 0.55 : 0.35, 0));
        const free = new THREE.Vector3().copy(m.start).add(drift).add(cg.base);
        pos = free.lerp(target, k);
        aim = m.dir.clone().lerp(m.spin, 1 - k).normalize(); // tail points inward when wrapped
        const r = rinse(t, cg.x);
        if (r.k < 1) {
          pos.copy(target);
        }
        if (r.k <= 0.01) pos.y = -50;
      } else {
        pos = m.start.clone().add(drift).add(new THREE.Vector3(0, 0, -4));
        aim = m.spin.clone().applyAxisAngle(_up, t * 0.7 + m.ph).normalize();
        const r = rinse(t, pos.x);
        pos.x += r.dx;
        pos.y += r.dy;
        if (r.k <= 0.01) pos.y = -50;
      }
      const show = swarm * (t < T_WASH1 + 1 ? 1 : 0);
      _s.setScalar(Math.max(0.001, show));
      _q.setFromUnitVectors(_up, aim);
      // head sits outward, tail extends inward along -aim
      heads.setMatrixAt(i, _m.compose(new THREE.Vector3().copy(pos).addScaledVector(aim, 0.3 * show), _q, _s));
      tails.setMatrixAt(i, _m.compose(pos, _q, _s));
    }
    heads.instanceMatrix.needsUpdate = true;
    tails.instanceMatrix.needsUpdate = true;
    // water
    const fx = frontX(t);
    const wOn = t >= T_WASH0 && t < T_WASH1 + 1.2;
    water.visible = front.visible = wOn;
    waterMat.uniforms.uT.value = t;
    waterMat.uniforms.uFront.value = fx;
    waterMat.uniforms.uA.value = 1 - inv(T_WASH1, T_WASH1 + 1.2, t);
    front.position.set(fx, 0, 0);
    front.scale.setScalar(1 - 0.6 * inv(T_WASH1 - 0.3, T_WASH1 + 0.6, t));
    front.children.forEach((c, i) => {
      if (c === roll) return;
      c.position.y = 1.2 + ((i * 0.37) % 1.6) + 0.35 * Math.sin(t * 9 + i);
    });
  }

  return { scene, sky, aff, mag, motes, ground, droplets, D1, D2, oils, O1, dirts, K1, bugs, colony, odor, germ, bubbles, puffs, update, on, frontX, FORM, cargoLift };
}

// =================================================================== BATHROOM
function tileTex(c1, c2, n, grout = '#ffffff', repeat = [1, 1]) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = grout;
    g.fillRect(0, 0, w, h);
    const s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = (i + j) % 2 ? c1 : c2;
      g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(i * s + 6, j * s + 6, s * 0.4, 5);
    }
  }, repeat);
}

function foldedShirt(color, w = 1.0, d = 0.8, hgt = 0.16) {
  const g = new THREE.Group();
  add(g, new RoundedBoxGeometry(w, hgt, d, 3, 0.06), std(color, 0.85), [0, hgt / 2, 0]);
  add(g, new RoundedBoxGeometry(w * 0.96, 0.02, 0.08, 1, 0.01), std(new THREE.Color(color).multiplyScalar(0.85).getHex(), 0.85), [0, hgt + 0.005, d * 0.2]);
  return g;
}

export function buildBathroom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcdeefa);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9fd0e0, 1.05));
  const key = new THREE.DirectionalLight(0xfff2e0, 1.9);
  key.position.set(-6, 9, 6);
  shadowCfg(key, 8);
  scene.add(key, key.target);
  const fill = new THREE.PointLight(0xdff6ff, 9, 14, 2);
  fill.position.set(1.5, 5.2, 1.5);
  scene.add(fill);

  // room 9 wide (x -4.5..4.5), back wall z = -4, floor y = 0, height 6.5
  add(scene, new THREE.PlaneGeometry(9, 9), std(0xffffff, 0.5, { map: tileTex('#bfe6f4', '#f4fbff', 8, '#9fc8d8', [1.5, 1.5]) }), [0, 0, -0.5], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  const wallTex = tileTex('#7fd6f2', '#c4effc', 12, '#f4fbff', [1.5, 1]);
  add(scene, new THREE.PlaneGeometry(9, 6.5), std(0xffffff, 0.35, { map: wallTex }), [0, 3.25, -4], [0, 0, 0], [1, 1, 1], false).receiveShadow = true;
  const sideTex = tileTex('#7fd6f2', '#c4effc', 12, '#f4fbff', [1.2, 1]);
  add(scene, new THREE.PlaneGeometry(8, 6.5), std(0xffffff, 0.35, { map: sideTex }), [-4.5, 3.25, 0], [0, Math.PI / 2, 0], [1, 1, 1], false).receiveShadow = true;
  add(scene, new THREE.PlaneGeometry(8, 6.5), std(0xffffff, 0.35, { map: sideTex }), [4.5, 3.25, 0], [0, -Math.PI / 2, 0], [1, 1, 1], false).receiveShadow = true;
  // peach accent band
  add(scene, new THREE.BoxGeometry(9, 0.18, 0.04), std(0xffa47e, 0.5), [0, 2.6, -3.98], [0, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.BoxGeometry(0.04, 0.18, 8), std(0xffa47e, 0.5), [4.48, 2.6, 0], [0, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.BoxGeometry(0.04, 0.18, 8), std(0xffa47e, 0.5), [-4.48, 2.6, 0], [0, 0, 0], [1, 1, 1], false);
  // window (bright) on the left wall
  add(scene, new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshBasicMaterial({ color: 0xf6fdff }), [-4.47, 4.6, 0.8], [0, Math.PI / 2, 0], [1, 1, 1], false);
  const wf = std(0xffffff, 0.4);
  for (const [y, z, w, h] of [[4.6, -0.3, 0.12, 1.8], [4.6, 1.9, 0.12, 1.8], [5.45, 0.8, 2.3, 0.12], [3.75, 0.8, 2.3, 0.12], [4.6, 0.8, 2.2, 0.06]]) add(scene, new THREE.BoxGeometry(0.1, h, w), wf, [-4.44, y, z], [0, 0, 0], [1, 1, 1], false);
  const wg = glow(0xffffff, 5, 0.45);
  wg.position.set(-4.2, 4.6, 0.8);
  scene.add(wg);

  // ---- shower corner (left back)
  const shower = new THREE.Group();
  scene.add(shower);
  add(shower, new RoundedBoxGeometry(3.2, 0.22, 2.8, 3, 0.08), std(0xffffff, 0.3), [-2.85, 0.11, -2.55]);
  add(shower, new THREE.CircleGeometry(0.16, 20), std(0x8aa0b0, 0.3, { metalness: 0.6 }), [-2.85, 0.225, -2.55], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  const chrome = std(0xdfe8ee, 0.15, { metalness: 0.85 });
  add(shower, new THREE.CylinderGeometry(0.05, 0.05, 4.6, 12), chrome, [-2.85, 2.6, -3.92]);
  add(shower, new THREE.CylinderGeometry(0.05, 0.05, 0.8, 12), chrome, [-2.85, 4.9, -3.55], [Math.PI / 2, 0, 0]);
  const headPos = new THREE.Vector3(-2.85, 4.8, -3.12);
  add(shower, new THREE.CylinderGeometry(0.42, 0.28, 0.16, 28), chrome, [headPos.x, headPos.y, headPos.z]);
  add(shower, new THREE.CircleGeometry(0.38, 28), std(0x9fb6c4, 0.3, { metalness: 0.5 }), [headPos.x, headPos.y - 0.085, headPos.z], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  // mixer tap with cyan/peach markers
  add(shower, new THREE.CylinderGeometry(0.16, 0.16, 0.14, 20), chrome, [-2.85, 2.4, -3.9], [Math.PI / 2, 0, 0]);
  add(shower, new THREE.SphereGeometry(0.06, 10, 8), std(0x2fbaff, 0.4), [-3.05, 2.4, -3.8]);
  add(shower, new THREE.SphereGeometry(0.06, 10, 8), std(0xff8a5b, 0.4), [-2.65, 2.4, -3.8]);
  // curtain rod and curtain, pulled open
  // curtain rod across the front of the shower, curtain gathered at the wall
  add(shower, new THREE.CylinderGeometry(0.04, 0.04, 3.3, 10), chrome, [-2.85, 5.6, -1.15], [0, 0, Math.PI / 2]);
  const curtainGeo = new THREE.PlaneGeometry(0.9, 4.8, 24, 4);
  const cp = curtainGeo.attributes.position;
  for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin(cp.getX(i) * 16) * 0.09);
  curtainGeo.computeVertexNormals();
  const curtain = add(shower, curtainGeo, std(0xffd84a, 0.8, { side: THREE.DoubleSide }), [-3.95, 3.2, -1.15], [0, 0, 0]);
  curtain.castShadow = false;
  // rubber duck on the tray edge
  const duck = new THREE.Group();
  add(duck, new THREE.SphereGeometry(0.22, 18, 14), std(0xffd23a, 0.4), [0, 0.2, 0], [0, 0, 0], [1.2, 0.85, 1]);
  add(duck, new THREE.SphereGeometry(0.14, 16, 12), std(0xffd23a, 0.4), [0.12, 0.42, 0]);
  add(duck, new THREE.ConeGeometry(0.06, 0.14, 10), std(0xff8a3d, 0.4), [0.28, 0.4, 0], [0, 0, -Math.PI / 2]);
  add(duck, new THREE.SphereGeometry(0.025, 8, 6), std(0x111111, 0.3), [0.2, 0.47, 0.08]);
  duck.position.set(-1.5, 0.22, -1.4);
  duck.rotation.y = 2.3;
  scene.add(duck);

  // shower water: instanced streaks falling from the head
  const NW = 260;
  const streaks = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.018, 0.32, 2, 6), new THREE.MeshBasicMaterial({ color: 0xbfefff, transparent: true, opacity: 0.75, depthWrite: false }), NW);
  streaks.frustumCulled = false;
  streaks.renderOrder = 3;
  scene.add(streaks);
  const SR = rng(55);
  const sw = Array.from({ length: NW }, () => ({ a: SR() * Math.PI * 2, r: SR() * 0.34, sp: 5 + SR() * 2, ph: SR(), spread: 0.25 + SR() * 0.25 }));
  const splashes = [];
  for (let i = 0; i < 26; i++) {
    const s = glow(0xe8fbff, 0.35, 0.8);
    scene.add(s);
    splashes.push({ s, a: SR() * Math.PI * 2, r: 0.2 + SR() * 0.7, ph: SR() });
  }
  const steam = [];
  for (let i = 0; i < 12; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false }));
    scene.add(s);
    steam.push({ s, ph: SR(), x: -2.85 + (SR() - 0.5) * 2.2, z: -2.6 + (SR() - 0.5) * 1.6 });
  }

  // ---- vanity (right back): counter, basin, mild soap, mirror
  const vanity = new THREE.Group();
  scene.add(vanity);
  add(vanity, new RoundedBoxGeometry(3.4, 2.0, 1.4, 3, 0.08), std(0xffffff, 0.5), [2.6, 1.0, -3.25]);
  for (const x of [1.8, 3.4]) add(vanity, new THREE.BoxGeometry(1.4, 1.5, 0.02), std(0x8fdcff, 0.5), [x, 0.95, -2.54], [0, 0, 0], [1, 1, 1], false);
  for (const x of [2.4, 2.8]) add(vanity, new THREE.SphereGeometry(0.06, 10, 8), std(0xffc928, 0.4), [x, 1.2, -2.5]);
  add(vanity, new RoundedBoxGeometry(3.6, 0.14, 1.6, 2, 0.05), std(0xf2f6f8, 0.25), [2.6, 2.07, -3.2]);
  add(vanity, new THREE.CylinderGeometry(0.62, 0.48, 0.32, 32, 1, true), std(0xffffff, 0.2, { side: THREE.DoubleSide }), [2.9, 2.1, -3.25]);
  add(vanity, new THREE.CircleGeometry(0.5, 28), std(0xdff3fb, 0.2), [2.9, 1.96, -3.25], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  add(vanity, new THREE.CylinderGeometry(0.05, 0.05, 0.6, 10), chrome, [2.9, 2.4, -3.85]);
  add(vanity, new THREE.CylinderGeometry(0.04, 0.04, 0.45, 10), chrome, [2.9, 2.68, -3.65], [Math.PI / 2, 0, 0]);
  add(vanity, new RoundedBoxGeometry(2.6, 2.0, 0.08, 3, 0.25), std(0xd8f4ff, 0.05, { metalness: 0.3, emissive: 0x9fdcf0, emissiveIntensity: 0.2 }), [2.6, 4.1, -3.95], [0, 0, 0], [1, 1, 1], false);
  add(vanity, new RoundedBoxGeometry(2.8, 2.2, 0.06, 3, 0.28), std(0xffa47e, 0.5), [2.6, 4.1, -3.98], [0, 0, 0], [1, 1, 1], false);
  // soap dish + mild soap bar with foam
  const soapSpot = new THREE.Vector3(1.55, 2.14, -2.85);
  add(scene, new THREE.CylinderGeometry(0.42, 0.34, 0.08, 28), std(0x2fbaff, 0.35), [soapSpot.x, soapSpot.y + 0.04, soapSpot.z], [0, 0, 0], [1.25, 1, 1]);
  const soap = add(scene, new RoundedBoxGeometry(0.62, 0.22, 0.4, 4, 0.1), std(0xbfeaff, 0.35, { emissive: 0x3aa8d8, emissiveIntensity: 0.15 }), [soapSpot.x, soapSpot.y + 0.19, soapSpot.z], [0, 0.25, 0]);
  const foam = [];
  const FMR = rng(66);
  for (let i = 0; i < 16; i++) {
    const r = 0.04 + FMR() * 0.07;
    const f = add(scene, new THREE.SphereGeometry(r, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, transparent: true, opacity: 0.88, emissive: 0xcfefff, emissiveIntensity: 0.3 }), [soapSpot.x + (FMR() - 0.5) * 0.55, soapSpot.y + 0.3 + FMR() * 0.06, soapSpot.z + (FMR() - 0.5) * 0.32], [0, 0, 0], [1, 1, 1], false);
    foam.push(f);
  }
  // pump bottle (mild wash)
  add(scene, new THREE.CylinderGeometry(0.22, 0.24, 0.7, 20), std(0xffc4a8, 0.35), [3.95, 2.5, -3.4]);
  add(scene, new THREE.CylinderGeometry(0.05, 0.05, 0.2, 10), std(0xffffff, 0.4), [3.95, 2.95, -3.4]);
  add(scene, new THREE.BoxGeometry(0.22, 0.06, 0.06), std(0xffffff, 0.4), [4.03, 3.06, -3.4]);
  add(scene, new THREE.CylinderGeometry(0.23, 0.23, 0.22, 20), std(0xffffff, 0.4), [3.95, 2.45, -3.4]);

  // ---- towel rail on the right wall with a fluffy towel
  add(scene, new THREE.CylinderGeometry(0.05, 0.05, 2.0, 10), chrome, [4.3, 3.6, 0.0], [Math.PI / 2, 0, 0]);
  for (const z of [-0.95, 0.95]) add(scene, new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), chrome, [4.42, 3.6, z], [0, 0, Math.PI / 2]);
  const towel = new THREE.Group();
  const towelMat = std(0x34c3f0, 0.95);
  add(towel, new RoundedBoxGeometry(0.12, 1.9, 1.5, 3, 0.05), towelMat, [-0.06, -0.85, 0]);
  add(towel, new RoundedBoxGeometry(0.12, 1.3, 1.5, 3, 0.05), towelMat, [0.12, -0.55, 0]);
  add(towel, new THREE.CylinderGeometry(0.13, 0.13, 1.5, 16), towelMat, [0.03, 0.05, 0], [Math.PI / 2, 0, 0]);
  for (const y of [-1.55, -1.45]) add(towel, new THREE.BoxGeometry(0.13, 0.05, 1.52), std(y < -1.5 ? 0xffffff : 0xffa47e, 0.9), [-0.06, y, 0], [0, 0, 0], [1, 1, 1], false);
  towel.position.set(4.3, 3.6, 0);
  scene.add(towel);

  // ---- stool with Affan's clean clothes (peach T-shirt + navy jacket)
  const stool = new THREE.Group();
  add(stool, new THREE.CylinderGeometry(0.75, 0.75, 0.14, 32), std(0xffd84a, 0.5), [0, 1.3, 0]);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    add(stool, new THREE.CylinderGeometry(0.06, 0.07, 1.3, 10), std(0xffffff, 0.5), [Math.cos(a) * 0.5, 0.65, Math.sin(a) * 0.5], [Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1]);
  }
  const navy = foldedShirt(0x1c2752, 1.0, 0.8, 0.18);
  navy.position.set(0, 1.37, 0);
  stool.add(navy);
  add(navy, new THREE.BoxGeometry(1.0, 0.04, 0.06), std(0xf4f2ee, 0.8), [0, 0.12, 0.3], [0, 0, 0], [1, 1, 1], false);
  add(navy, new THREE.BoxGeometry(1.0, 0.04, 0.06), std(0xf2915f, 0.8), [0, 0.12, 0.22], [0, 0, 0], [1, 1, 1], false);
  const peach = foldedShirt(0xff9470, 0.86, 0.7, 0.16);
  peach.position.set(0.02, 1.55, -0.02);
  peach.rotation.y = 0.08;
  stool.add(peach);
  stool.position.set(3.0, 0, 1.2);
  scene.add(stool);
  const clothesSpot = new THREE.Vector3(3.0, 1.85, 1.2);
  // bath mat
  add(scene, new RoundedBoxGeometry(2.0, 0.05, 1.2, 2, 0.02), std(0xffa47e, 0.95), [-2.4, 0.03, -0.5]);
  // plant
  add(scene, new THREE.CylinderGeometry(0.28, 0.22, 0.45, 16), std(0xffffff, 0.5), [-3.9, 2.32, -3.65]);
  for (let i = 0; i < 6; i++) add(scene, new THREE.SphereGeometry(0.22, 12, 10), std(0x4fc48a, 0.8), [-3.9 + Math.cos(i) * 0.15, 2.7 + (i % 3) * 0.12, -3.65 + Math.sin(i) * 0.15], [0, 0, 0], [0.6, 1.3, 0.6]);
  add(scene, new THREE.BoxGeometry(1.2, 0.08, 0.4), std(0xffffff, 0.4), [-3.8, 2.06, -3.75]);

  const bubbles = [];
  for (let i = 0; i < 8; i++) {
    const b = makeBubble(1);
    scene.add(b);
    bubbles.push(b);
  }

  function update(t, flowOn = 1) {
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
    for (let i = 0; i < NW; i++) {
      const w = sw[i];
      const L = headPos.y - 0.3;
      const k = (t * w.sp / L + w.ph) % 1;
      const y = headPos.y - 0.12 - k * L;
      const rr = w.r + k * w.spread;
      _s.setScalar(flowOn > 0 ? 1 : 0.0001);
      streaks.setMatrixAt(i, _m.compose(new THREE.Vector3(headPos.x + Math.cos(w.a) * rr, y, headPos.z + Math.sin(w.a) * rr * 0.8 + k * 0.4), _q, _s));
    }
    streaks.instanceMatrix.needsUpdate = true;
    for (const p of splashes) {
      const k = (t * 3 + p.ph) % 1;
      p.s.position.set(headPos.x + Math.cos(p.a) * p.r * (0.5 + k), 0.3 + Math.sin(k * Math.PI) * 0.35, headPos.z + 0.6 + Math.sin(p.a) * p.r * 0.6);
      p.s.material.opacity = 0.7 * Math.sin(k * Math.PI) * flowOn;
    }
    for (const s of steam) {
      const k = (t * 0.12 + s.ph) % 1;
      s.s.position.set(s.x + Math.sin(t * 0.5 + s.ph * 6) * 0.3, 0.6 + k * 5.5, s.z);
      s.s.scale.setScalar(1.2 + k * 2.4);
      s.s.material.opacity = 0.16 * Math.sin(k * Math.PI) * flowOn;
    }
    foam.forEach((f, i) => f.scale.setScalar(0.85 + 0.15 * Math.sin(t * 2 + i)));
    bubbles.forEach((b, i) => {
      b.material.uniforms.uT.value = t;
      const k = (t * 0.09 + i / bubbles.length) % 1;
      const r = 0.16 + (i % 3) * 0.08;
      b.scale.setScalar(r * clamp(Math.sin(k * Math.PI) * 3));
      b.position.set(soapSpot.x - 0.8 + ((i * 0.53) % 1) * 2.4 + Math.sin(t * 0.8 + i) * 0.25, soapSpot.y + 0.4 + k * 3.2, soapSpot.z + 0.6 + ((i * 0.31) % 1) * 1.2);
    });
  }

  return { scene, update, headPos, soapSpot, soap, towel, clothesSpot, stool, duck };
}

// ================================================================ LIVING ROOM
export function buildLiving() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfff3dc);
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0xc9b49a, 1.5));
  const sun = new THREE.DirectionalLight(0xfff0d0, 2.6);
  sun.position.set(-8, 10, 8);
  shadowCfg(sun, 8);
  scene.add(sun, sun.target);
  const rimL = new THREE.DirectionalLight(0x9fe6ff, 1.3);
  rimL.position.set(6, 6, -6);
  scene.add(rimL);
  const wood = canvasTex(512, 512, (g, w, h) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = ['#d9a26e', '#cf9763', '#e0ab78', '#d49c69'][i % 4];
      g.fillRect(0, (i * h) / 8, w, h / 8 - 3);
      g.fillStyle = '#b47c4e';
      g.fillRect(0, ((i + 1) * h) / 8 - 3, w, 3);
      g.fillRect(((i * 197) % w), (i * h) / 8, 3, h / 8);
    }
  }, [3, 3]);
  add(scene, new THREE.PlaneGeometry(20, 20), std(0xffffff, 0.6, { map: wood }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  add(scene, new THREE.PlaneGeometry(20, 9), std(0xfff0c8, 0.9), [0, 4.5, -6], [0, 0, 0], [1, 1, 1], false).receiveShadow = true;
  add(scene, new THREE.PlaneGeometry(14, 9), std(0xcdeefa, 0.9), [-7, 4.5, 0], [0, Math.PI / 2, 0], [1, 1, 1], false).receiveShadow = true;
  add(scene, new THREE.PlaneGeometry(20, 0.5), std(0xffffff, 0.6), [0, 0.25, -5.98], [0, 0, 0], [1, 1, 1], false);
  // window with daylight + curtains
  add(scene, new THREE.PlaneGeometry(3.6, 3.0), new THREE.MeshBasicMaterial({ color: 0xbfe9ff }), [-2.6, 4.4, -5.97], [0, 0, 0], [1, 1, 1], false);
  for (let i = 0; i < 5; i++) add(scene, new THREE.SphereGeometry(0.8 + i * 0.1, 16, 12), new THREE.MeshBasicMaterial({ color: 0x7fd36a }), [-3.8 + i * 0.7, 3.2 + (i % 2) * 0.3, -5.99], [0, 0, 0], [1, 0.8, 0.01], false);
  const wf = std(0xffffff, 0.4);
  for (const [x, y, w, h] of [[-2.6, 5.95, 3.8, 0.14], [-2.6, 2.85, 3.8, 0.14], [-4.45, 4.4, 0.14, 3.2], [-0.75, 4.4, 0.14, 3.2], [-2.6, 4.4, 0.08, 3.0]]) add(scene, new THREE.BoxGeometry(w, h, 0.1), wf, [x, y, -5.94], [0, 0, 0], [1, 1, 1], false);
  for (const x of [-4.9, -0.3]) add(scene, new RoundedBoxGeometry(0.9, 3.8, 0.15, 3, 0.06), std(0x3fb6e0, 0.9), [x, 4.2, -5.85]);
  const sg = glow(0xffffff, 6, 0.4);
  sg.position.set(-2.6, 4.4, -5.6);
  scene.add(sg);
  // sofa (navy with peach cushions)
  const sofa = new THREE.Group();
  const sn = std(0x2a3a78, 0.85);
  add(sofa, new RoundedBoxGeometry(4.6, 0.9, 1.7, 4, 0.18), sn, [0, 0.75, 0]);
  add(sofa, new RoundedBoxGeometry(4.6, 1.5, 0.5, 4, 0.2), sn, [0, 1.6, -0.65]);
  for (const x of [-2.35, 2.35]) add(sofa, new RoundedBoxGeometry(0.5, 1.4, 1.7, 4, 0.2), sn, [x, 1.0, 0]);
  for (const [x, c] of [[-1.2, 0xffa47e], [1.25, 0xffd84a]]) add(sofa, new RoundedBoxGeometry(1.0, 0.9, 0.3, 4, 0.14), std(c, 0.9), [x, 1.6, -0.3], [-0.15, 0, x * 0.08]);
  sofa.position.set(2.2, 0, -4.3);
  scene.add(sofa);
  // rug
  add(scene, new THREE.CylinderGeometry(3.4, 3.4, 0.04, 48), std(0x5fd0f0, 0.95), [0, 0.02, -0.6]);
  add(scene, new THREE.TorusGeometry(2.9, 0.08, 6, 64), std(0xffffff, 0.9), [0, 0.05, -0.6], [Math.PI / 2, 0, 0]);
  // plant + lamp + bookshelf
  add(scene, new THREE.CylinderGeometry(0.45, 0.35, 0.8, 18), std(0xffa47e, 0.6), [-5.4, 0.4, -4.6]);
  for (let i = 0; i < 9; i++) add(scene, new THREE.SphereGeometry(0.35, 12, 10), std([0x4fc48a, 0x3fb36a][i % 2], 0.85), [-5.4 + Math.cos(i * 0.7) * 0.35, 1.2 + (i % 4) * 0.35, -4.6 + Math.sin(i * 0.7) * 0.35], [0, 0, 0], [0.6, 1.4, 0.6]);
  add(scene, new THREE.CylinderGeometry(0.04, 0.04, 3.2, 10), std(0x333a50, 0.4), [5.4, 1.6, -4.6]);
  add(scene, new THREE.ConeGeometry(0.55, 0.6, 24, 1, true), std(0xfff3c8, 0.6, { side: THREE.DoubleSide, emissive: 0xffe9a0, emissiveIntensity: 0.35 }), [5.4, 3.35, -4.6]);
  // picture frames with science doodles (shapes only)
  for (const [x, c] of [[0.9, 0x2fbaff], [3.3, 0xffd84a]]) {
    add(scene, new RoundedBoxGeometry(1.2, 1.0, 0.08, 2, 0.04), std(0xffffff, 0.5), [x, 4.4, -5.95]);
    add(scene, new THREE.CircleGeometry(0.3, 24), std(c, 0.6), [x, 4.4, -5.9], [0, 0, 0], [1, 1, 1], false);
  }
  const aff = makeAffan();
  scene.add(aff.root);
  const motes = moteField(120, 13, [-6, 6, 0.5, 6.5, -5, 4], [0xfff6c8, 0xffffff, 0xbff4ff], 5);
  scene.add(motes);
  return { scene, aff, motes };
}

// ===================================================================== OUTRO
export function buildOutro() {
  const scene = new THREE.Scene();
  const c = document.createElement('canvas');
  c.width = 540;
  c.height = 960;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(270, 380, 40, 270, 420, 700);
  gr.addColorStop(0, '#8fe6ff');
  gr.addColorStop(0.45, '#2fbaf0');
  gr.addColorStop(1, '#1a4fbf');
  g.fillStyle = gr;
  g.fillRect(0, 0, 540, 960);
  const bg = new THREE.CanvasTexture(c);
  bg.colorSpace = THREE.SRGBColorSpace;
  scene.background = bg;
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x6a7ab8, 1.5));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.4);
  key.position.set(3, 6, 8);
  shadowCfg(key, 5);
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
  const bubbles = [];
  for (let i = 0; i < 10; i++) {
    const b = makeBubble(1);
    scene.add(b);
    bubbles.push(b);
  }
  return { scene, aff, bubbles };
}
