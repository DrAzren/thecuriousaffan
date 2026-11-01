// Tropical set pieces: animated sea surface, palm trees, puffy clouds, the
// crab sidekick and Affan's magic mini submarine. Procedural and deterministic
// (every animated piece is driven by an explicit time value).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clamp, lerp, rng } from './core.js';
import { add, glow } from './props.js';

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

// ------------------------------------------------------------------- waves
// Height of the stylised sea surface at world (x, z), time t.
export function waveH(x, z, t, amp = 1) {
  return amp * (0.16 * Math.sin(0.42 * x + 1.3 * t) + 0.12 * Math.sin(0.31 * z - 1.1 * t + 0.7) +
    0.07 * Math.sin(0.54 * x + 0.72 * z + 2.1 * t) + 0.04 * Math.sin(-0.85 * x + 1.46 * z + 2.9 * t));
}

// Animated sea: a displaced, vertex-coloured plane. `shore(x, z)` returns the
// distance (>= 0) from the waterline, used to fade shallow water to turquoise
// and transparent so wet sand shows through. Call mesh.userData.update(t).
export function makeSea({ w = 400, d = 300, segW = 160, segD = 140, cx = 0, cz = 0, amp = 1, shallow = 0x6ff0e0, mid = 0x23b3e6, deep = 0x1572cf, shore = null, fade = 10, opacity = 1 } = {}) {
  const geo = new THREE.PlaneGeometry(w, d, segW, segD);
  geo.rotateX(-Math.PI / 2);
  geo.translate(cx, 0, cz);
  const pos = geo.attributes.position;
  const n = pos.count;
  const col = new Float32Array(n * 4);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
  const base = new Float32Array(n * 3);
  const dist = new Float32Array(n);
  const cS = new THREE.Color(shallow), cM = new THREE.Color(mid), cD = new THREE.Color(deep), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const ds = shore ? Math.max(0, shore(x, z)) : 999;
    dist[i] = ds;
    const k = clamp(ds / fade);
    if (k < 0.5) c.copy(cS).lerp(cM, k * 2);
    else c.copy(cM).lerp(cD, clamp((ds - fade * 0.5) / (fade * 6)));
    base.set([c.r, c.g, c.b], i * 3);
  }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.16, metalness: 0.05, transparent: true, opacity, emissive: 0x0a3a5a, emissiveIntensity: 0.25 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.userData.update = (t, a = amp) => {
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const ds = dist[i];
      const calm = shore ? clamp(ds / 5) : 1; // flatter right at the shore
      const y = waveH(x, z, t, a) * (0.25 + 0.75 * calm) + (shore ? 0.05 * Math.sin(t * 1.1) * (1 - calm) : 0);
      pos.setY(i, y);
      const crest = clamp((y / (0.3 * a + 1e-6) - 0.55) * 2.2) * 0.55 + (shore ? clamp(1 - ds / 1.2) * 0.8 : 0);
      col[i * 4] = lerp(base[i * 3], 1, crest);
      col[i * 4 + 1] = lerp(base[i * 3 + 1], 1, crest);
      col[i * 4 + 2] = lerp(base[i * 3 + 2], 1, crest);
      col[i * 4 + 3] = shore ? lerp(0.35, 1, clamp(ds / 6)) : 1;
    }
    pos.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.computeVertexNormals();
  };
  mesh.userData.update(0);
  return mesh;
}

// Twinkling sun glints / magic sparkles as additive point sprites.
export function makeGlints(n, seed, box, { size = 10, color = [1, 0.98, 0.85], minPx = 2, rate = 2.5 } = {}) {
  const R = rng(seed);
  const pos = new Float32Array(n * 3), ph = new Float32Array(n), sz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos.set([box[0] + R() * (box[1] - box[0]), box[2] + R() * (box[3] - box[2]), box[4] + R() * (box[5] - box[4])], i * 3);
    ph[i] = R() * 100;
    sz[i] = size * (0.4 + R() * 0.9);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  g.setAttribute('aSz', new THREE.BufferAttribute(sz, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 }, uColor: { value: new THREE.Vector3(...color) } },
    vertexShader: `attribute float aPh; attribute float aSz; uniform float uTime; varying float vA;
      void main(){ vA = pow(max(0.0, sin(uTime * (${rate.toFixed(2)} + fract(aPh) * 2.0) + aPh)), 3.0);
      vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(${minPx.toFixed(1)}, aSz * (40.0 / -mv.z)) * (0.4 + 0.6 * vA); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uAlpha; uniform vec3 uColor; varying float vA; void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p);
      float star = max(0.0, 1.0 - abs(p.x) * 10.0) * max(0.0, 1.0 - abs(p.y) * 2.0) + max(0.0, 1.0 - abs(p.y) * 10.0) * max(0.0, 1.0 - abs(p.x) * 2.0);
      float a = (smoothstep(0.5, 0.0, d) * 0.45 + star) * vA * uAlpha; gl_FragColor = vec4(uColor, a); }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  pts.userData.update = (t, a = 1) => {
    mat.uniforms.uTime.value = t;
    mat.uniforms.uAlpha.value = a;
  };
  return pts;
}

// ------------------------------------------------------------------ clouds
export function makeCloud(R, { scale = 1, color = 0xffffff, shade = 0xdbe6f5, puffs = 7 } = {}) {
  const g = new THREE.Group();
  const top = std(color, 0.95, { emissive: color, emissiveIntensity: 0.28 });
  const bot = std(shade, 0.95, { emissive: shade, emissiveIntensity: 0.18 });
  for (let i = 0; i < puffs; i++) {
    const u = puffs > 1 ? i / (puffs - 1) : 0.5;
    const r = (0.9 + Math.sin(u * Math.PI) * 1.1 + R() * 0.4) * scale;
    const x = (u - 0.5) * 5.2 * scale, y = Math.sin(u * Math.PI) * 0.6 * scale + R() * 0.3 * scale;
    add(g, new THREE.SphereGeometry(r, 24, 16), top, [x, y + r * 0.35, (R() - 0.5) * 1.2 * scale], [0, 0, 0], [1, 0.85, 0.9], false);
  }
  add(g, new THREE.SphereGeometry(2.9 * scale, 28, 12), bot, [0, 0.2 * scale, 0], [0, 0, 0], [1.25, 0.32, 0.55], false);
  return g;
}

// -------------------------------------------------------------- palm tree
function frondGeo(L, Wd, droop) {
  const g = new THREE.PlaneGeometry(L, Wd, 18, 4);
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  const c1 = new THREE.Color(0x2fa84f), c2 = new THREE.Color(0x7ad35a), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const u = (p.getX(i) + L / 2) / L; // 0 at trunk, 1 at tip
    const v = p.getY(i) / (Wd / 2); // -1..1 across
    const w = Math.pow(Math.sin(Math.PI * clamp(u * 0.95 + 0.04)), 0.6);
    const serr = 1 - 0.18 * Math.abs(Math.sin(u * 40));
    p.setXYZ(i, u * L, v * (Wd / 2) * w * serr, -droop * u * u * L + Math.abs(v) * 0.12 * Wd * w);
    c.copy(c1).lerp(c2, Math.abs(v) * 0.7 + u * 0.2);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.rotateX(-Math.PI / 2); // lie flat: length along +x, width along z, droop along -y
  g.computeVertexNormals();
  return g;
}

export function makePalm(R, { height = 7, lean = 0.25, scale = 1 } = {}) {
  const g = new THREE.Group();
  const trunkA = std(0x9b6b43, 0.9), trunkB = std(0x7d5233, 0.9);
  const seg = 9;
  let x = 0, y = 0;
  const dir = R() * Math.PI * 2;
  const top = new THREE.Vector3();
  for (let i = 0; i < seg; i++) {
    const u = i / seg;
    const h = height / seg;
    const bend = lean * (u * u * 2 + u);
    const r0 = lerp(0.32, 0.17, u);
    const m = add(g, new THREE.CylinderGeometry(r0 * 0.92, r0, h * 1.06, 12), i % 2 ? trunkA : trunkB, [0, 0, 0], [0, 0, 0], [1, 1, 1]);
    m.position.set(Math.cos(dir) * x, y + h / 2, Math.sin(dir) * x);
    m.rotation.set(Math.sin(dir) * -bend * 0.6, 0, Math.cos(dir) * -bend * 0.6);
    x += Math.sin(bend * 0.6) * h;
    y += Math.cos(bend * 0.6) * h;
  }
  top.set(Math.cos(dir) * x, y, Math.sin(dir) * x);
  const fm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide, emissive: 0x0c2a10, emissiveIntensity: 0.3 });
  const crown = new THREE.Group();
  crown.position.copy(top);
  g.add(crown);
  const nf = 9;
  for (let i = 0; i < nf; i++) {
    const L = 3.2 + R() * 0.9;
    const f = new THREE.Mesh(frondGeo(L, 1.1, 0.32 + R() * 0.12), fm);
    f.castShadow = true;
    f.rotation.set(0, (i / nf) * Math.PI * 2 + R() * 0.3, 0.25 - R() * 0.25, 'YXZ');
    crown.add(f);
  }
  const nut = std(0x5a3a1e, 0.6);
  for (let i = 0; i < 4; i++) add(crown, new THREE.SphereGeometry(0.2, 12, 10), nut, [Math.cos(i * 1.7) * 0.25, -0.25, Math.sin(i * 1.7) * 0.25]);
  g.scale.setScalar(scale);
  g.userData.crown = crown;
  return g;
}

// ------------------------------------------------------------------- crab
// Cute crab sidekick. ~2.2 units wide, body centre ~0.75 above the ground.
// Call crab.userData.pose({ t, wave, wave2, claw, walk, look, blink, bounce, happy }).
export function makeCrab() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const shell = std(0xff5d3f, 0.45, { emissive: 0x5a1004, emissiveIntensity: 0.25 });
  const belly = std(0xffb38a, 0.6);
  const dark = std(0x16131c, 0.3);
  const white = std(0xffffff, 0.3, { emissive: 0xffffff, emissiveIntensity: 0.1 });
  const spot = std(0xff8a5c, 0.5);
  add(body, new THREE.SphereGeometry(0.62, 40, 28), shell, [0, 0, 0], [0, 0, 0], [1.25, 0.62, 0.92]);
  add(body, new THREE.SphereGeometry(0.6, 32, 20), belly, [0, -0.12, 0.05], [0, 0, 0], [1.15, 0.42, 0.85]);
  for (const [x, z, s] of [[-0.35, 0.18, 0.11], [0.3, 0.24, 0.09], [0.05, -0.1, 0.13], [-0.1, 0.38, 0.07]]) add(body, new THREE.SphereGeometry(s, 12, 8), spot, [x, 0.33, z], [0, 0, 0], [1, 0.35, 1]);
  // smile + blush
  const smile = add(body, new THREE.TorusGeometry(0.13, 0.025, 8, 20, Math.PI), dark, [0, 0.0, 0.55], [0, 0, Math.PI], [1, 0.8, 1], false);
  for (const s of [-1, 1]) {
    const b = add(body, new THREE.CircleGeometry(0.07, 16), new THREE.MeshBasicMaterial({ color: 0xff9aa0, transparent: true, opacity: 0.6 }), [0.3 * s, 0.03, 0.54], [0, 0.4 * s, 0], [1, 0.7, 1], false);
    b.renderOrder = 2;
  }
  // eyes on stalks
  const eyes = [];
  for (const s of [-1, 1]) {
    const stalk = new THREE.Group();
    stalk.position.set(0.24 * s, 0.25, 0.3);
    body.add(stalk);
    add(stalk, new THREE.CylinderGeometry(0.045, 0.06, 0.42, 10), shell, [0, 0.2, 0]);
    const eye = new THREE.Group();
    eye.position.set(0, 0.48, 0);
    stalk.add(eye);
    add(eye, new THREE.SphereGeometry(0.17, 20, 16), white, [0, 0, 0], [0, 0, 0], [1, 1.1, 1], false);
    const pupil = new THREE.Group();
    eye.add(pupil);
    add(pupil, new THREE.SphereGeometry(0.095, 16, 12), dark, [0, 0, 0.12], [0, 0, 0], [1, 1.1, 0.5], false);
    add(pupil, new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0.03, 0.04, 0.17], [0, 0, 0], [1, 1, 1], false);
    const lid = add(eye, new THREE.SphereGeometry(0.18, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), shell, [0, 0, 0], [-1.6, 0, 0], [1, 1.12, 1], false);
    eyes.push({ stalk, eye, pupil, lid, s });
  }
  // claws: shoulder -> forearm -> pincer (fixed palm + moving finger)
  const claws = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(0.62 * s, 0.0, 0.32);
    body.add(sh);
    add(sh, new THREE.CapsuleGeometry(0.075, 0.32, 4, 10), shell, [0.2 * s, 0, 0], [0, 0, Math.PI / 2]);
    const el = new THREE.Group();
    el.position.set(0.42 * s, 0, 0);
    sh.add(el);
    add(el, new THREE.CapsuleGeometry(0.075, 0.26, 4, 10), shell, [0, 0.17, 0]);
    const pin = new THREE.Group();
    pin.position.set(0, 0.38, 0);
    el.add(pin);
    add(pin, new THREE.SphereGeometry(0.22, 20, 16), shell, [0, 0.1, 0], [0, 0, 0], [0.85, 1.05, 0.7]);
    add(pin, new THREE.ConeGeometry(0.1, 0.36, 12), shell, [-0.07 * s, 0.38, 0], [0, 0, 0.12 * s]);
    const finger = new THREE.Group();
    finger.position.set(0.1 * s, 0.22, 0);
    pin.add(finger);
    add(finger, new THREE.ConeGeometry(0.085, 0.34, 12), shell, [0, 0.16, 0]);
    claws.push({ sh, el, pin, finger, s });
  }
  // legs
  const legs = [];
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const hip = new THREE.Group();
      hip.position.set(0.6 * s, -0.08, 0.12 - i * 0.24);
      hip.rotation.y = s * (0.25 - i * 0.25);
      body.add(hip);
      add(hip, new THREE.CapsuleGeometry(0.05, 0.3, 4, 8), shell, [0.18 * s, 0.05, 0], [0, 0, (Math.PI / 2) * s - 0.5 * s]);
      const knee = new THREE.Group();
      knee.position.set(0.34 * s, 0.17, 0);
      hip.add(knee);
      add(knee, new THREE.CapsuleGeometry(0.045, 0.42, 4, 8), shell, [0.07 * s, -0.25, 0], [0, 0, 0.3 * s]);
      legs.push({ hip, knee, s, i });
    }
  }
  body.position.y = 0.72;
  root.userData.pose = ({ t = 0, wave = 0, wave2 = 0, claw = 0, walk = 0, look = [0, 0], blink = 0, bounce = 0, happy = 1, snap = 1 } = {}) => {
    body.position.y = 0.72 + bounce + 0.02 * Math.sin(t * 3);
    body.rotation.z = 0.05 * Math.sin(walk * 2);
    smile.scale.set(1, lerp(0.4, 0.9, happy), 1);
    for (const e of eyes) {
      e.stalk.rotation.z = -0.15 * e.s + 0.06 * Math.sin(t * 2.3 + e.s);
      e.pupil.rotation.set(-look[1] * 0.5, look[0] * 0.6, 0);
      e.lid.rotation.x = lerp(-1.75, -0.05, clamp(blink));
    }
    claws.forEach((c, i) => {
      const w = i === 1 ? wave : wave2; // right claw (+x) = wave
      const sw = Math.sin(t * 9 + i) * 0.35 * w;
      c.sh.rotation.set(0, -0.35 * c.s, c.s * (0.25 + 0.9 * w) + sw * c.s);
      c.el.rotation.set(-0.2, 0, c.s * (0.55 - 0.4 * w));
      const open = clamp(claw + (snap ? Math.max(0, Math.sin(t * 7 + i * 2)) * 0.6 * Math.max(w, claw > 0 ? 0.6 : 0.15) : 0));
      c.finger.rotation.z = -c.s * lerp(0.05, 0.6, open);
    });
    for (const l of legs) {
      const ph = walk * 6 + l.i * 2.1 + (l.s > 0 ? Math.PI : 0);
      l.hip.rotation.z = l.s * (0.1 * Math.sin(ph));
      l.knee.rotation.z = l.s * (0.15 * Math.max(0, Math.sin(ph)));
    }
  };
  root.userData.pose();
  return root;
}

// -------------------------------------------------------------- submarine
// Magic mini submarine. Forward = +z, ~3.1 long. Affan sits in `seat` at
// scale 0.3 (so sub.scale 3.33 makes him full size). Call userData.update(t).
export function makeSub({ body = 0xffc93c, accent = 0xff7a45, trim = 0x1c2752 } = {}) {
  const root = new THREE.Group();
  const paint = std(body, 0.32, { emissive: body, emissiveIntensity: 0.08 });
  const acc = std(accent, 0.4, { emissive: accent, emissiveIntensity: 0.06 });
  const nav = std(trim, 0.5);
  const th0 = 0.656; // hull opening for the cockpit
  const hullGeo = new THREE.SphereGeometry(1, 48, 32, 0, Math.PI * 2, th0, Math.PI - th0);
  add(root, hullGeo, paint, [0, 0, 0], [0, 0, 0], [0.95, 0.72, 1.55]);
  add(root, hullGeo, std(0x26305e, 0.8, { side: THREE.BackSide }), [0, 0, 0], [0, 0, 0], [0.94, 0.71, 1.54], false);
  const rimY = Math.cos(th0) * 0.72;
  const rx = Math.sin(th0) * 0.95, rz = Math.sin(th0) * 1.55;
  const collar = add(root, new THREE.TorusGeometry(1, 0.06, 10, 48), acc, [0, rimY, 0], [Math.PI / 2, 0, 0], [rx, rz, 1]);
  collar.castShadow = false;
  // stripes
  for (const [z, c] of [[-0.85, acc], [-1.0, std(0xffffff, 0.5)]]) {
    const k = Math.sqrt(1 - (z / 1.55) ** 2);
    add(root, new THREE.TorusGeometry(1, 0.05, 8, 48), c, [0, 0, z], [0, 0, 0], [0.955 * k, 0.725 * k, 1], false);
  }
  // glass dome
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xd8f4ff, roughness: 0.04, transparent: true, opacity: 0.16, depthWrite: false, clearcoat: 1, side: THREE.DoubleSide });
  const dome = add(root, new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), glass, [0, rimY, 0], [0, 0, 0], [rx, 0.62, rz], false);
  dome.renderOrder = 5;
  const hi = add(root, new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }), [-0.22, rimY + 0.45, 0.32], [0.4, 0, 0.5], [0.1, 0.05, 0.22], false);
  hi.renderOrder = 6;
  // portholes
  for (const s of [-1, 1]) {
    for (const z of [0.55, -0.2]) {
      const k = Math.sqrt(1 - (z / 1.55) ** 2);
      const p = new THREE.Group();
      p.position.set(0.95 * k * s * 0.985, -0.05, z);
      p.rotation.y = (Math.PI / 2) * s;
      root.add(p);
      add(p, new THREE.TorusGeometry(0.15, 0.04, 8, 20), nav, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
      add(p, new THREE.CircleGeometry(0.15, 20), std(0x9fe6ff, 0.1, { emissive: 0x6fd6ff, emissiveIntensity: 0.6 }), [0, 0, -0.005], [0, 0, 0], [1, 1, 1], false);
    }
  }
  // tail fins + propeller
  add(root, new RoundedBoxGeometry(0.08, 0.7, 0.55, 2, 0.03), acc, [0, 0.3, -1.45], [0.35, 0, 0]);
  add(root, new RoundedBoxGeometry(0.9, 0.08, 0.45, 2, 0.03), acc, [0, 0, -1.4]);
  for (const s of [-1, 1]) add(root, new RoundedBoxGeometry(0.42, 0.07, 0.36, 2, 0.03), acc, [0.95 * s, -0.12, 0.15], [0, 0, -0.15 * s]);
  add(root, new THREE.ConeGeometry(0.13, 0.3, 14), nav, [0, 0, -1.62], [-Math.PI / 2, 0, 0]);
  const prop = new THREE.Group();
  prop.position.set(0, 0, -1.72);
  root.add(prop);
  for (let i = 0; i < 3; i++) add(prop, new RoundedBoxGeometry(0.12, 0.5, 0.03, 2, 0.015), std(0xdfe3ea, 0.3, { metalness: 0.4 }), [Math.cos((i * 2 * Math.PI) / 3) * 0.2, Math.sin((i * 2 * Math.PI) / 3) * 0.2, 0], [0.4, 0, (i * 2 * Math.PI) / 3 - Math.PI / 2]);
  // periscope + antenna light
  add(root, new THREE.CylinderGeometry(0.05, 0.05, 0.55, 10), nav, [0.18, 0.75, -0.95]);
  add(root, new THREE.CylinderGeometry(0.06, 0.06, 0.2, 10), nav, [0.18, 1.02, -0.88], [Math.PI / 2, 0, 0]);
  add(root, new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6), nav, [-0.2, 0.82, -0.95]);
  const bulb = add(root, new THREE.SphereGeometry(0.06, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff5a5a }), [-0.2, 1.04, -0.95], [0, 0, 0], [1, 1, 1], false);
  const bulbGlow = glow(0xff6a6a, 0.5, 0.8);
  bulbGlow.position.copy(bulb.position);
  root.add(bulbGlow);
  // headlight
  add(root, new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff6d0 }), [0, -0.18, 1.5], [0, 0, 0], [1, 1, 0.5], false);
  const headGlow = glow(0xfff0b0, 1.3, 0.7);
  headGlow.position.set(0, -0.18, 1.62);
  root.add(headGlow);
  const seat = new THREE.Group();
  seat.position.set(0, 0.0, 0.05);
  root.add(seat);
  root.userData = {
    seat, prop, headGlow, bulbGlow, rimY,
    update: (t, spin = 1) => {
      prop.rotation.z = t * 14 * spin;
      bulbGlow.material.opacity = 0.5 + 0.4 * Math.max(0, Math.sin(t * 5));
    },
  };
  return root;
}

// Place Affan (from makeAffan) in a submarine seat.
export function seatAffan(sub, aff) {
  aff.root.scale.setScalar(0.3);
  aff.root.position.set(0, -0.02, 0);
  sub.userData.seat.add(aff.root);
}

export const SEATED = { legL: { x: -1.5, knee: 1.45 }, legR: { x: -1.5, knee: 1.45 } };
