// Episode 006 sets: tropical beach, the mountain -> river -> sea landscape,
// underwater sea, the evaporation cross-section diagram and the outro stage.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clamp, lerp, rng, smooth } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeSky, glow, glowTex } from '../../shared/props.js';
import { makeSea, makeGlints, makeCloud, makePalm, makeCrab, makeSub, seatAffan, waveH } from '../../shared/tropical.js';

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

function shadowCfg(light, size, map = 2048, far = 400) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  const c = light.shadow.camera;
  c.left = -size;
  c.right = size;
  c.top = size;
  c.bottom = -size;
  c.near = 1;
  c.far = far;
  light.shadow.bias = -0.0005;
  light.shadow.normalBias = 0.03;
}

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Ballistic droplet burst (instanced spheres). update(t, t0, origin, power)
export function makeSplash(n = 70, seed = 1, { r = 0.07, color = 0xe8fbff } = {}) {
  const R = rng(seed);
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 10, 8), new THREE.MeshStandardMaterial({ color, roughness: 0.1, transparent: true, opacity: 0.9, emissive: 0x7fd8ff, emissiveIntensity: 0.35 }), n);
  im.frustumCulled = false;
  const v = [];
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, up = 0.55 + R() * 0.45, sp = 0.5 + R() * 0.7;
    v.push([Math.cos(a) * (1 - up) * sp, up * sp, Math.sin(a) * (1 - up) * sp, 0.5 + R() * 0.9, 0.55 + R() * 0.7]);
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  im.userData.update = (t, t0, o, power = 6, floor = -1e9) => {
    const dt = t - t0;
    for (let i = 0; i < n; i++) {
      const [vx, vy, vz, sz, life] = v[i];
      const k = dt / life;
      if (dt < 0 || k > 1) {
        im.setMatrixAt(i, m.makeScale(0, 0, 0));
        continue;
      }
      p.set(o.x + vx * power * dt, o.y + vy * power * 1.4 * dt - 4.9 * dt * dt * (power / 6), o.z + vz * power * dt);
      if (p.y < floor) {
        im.setMatrixAt(i, m.makeScale(0, 0, 0));
        continue;
      }
      s.setScalar(sz * (1 - k * 0.6) * (power / 6));
      im.setMatrixAt(i, m.compose(p, q, s));
    }
    im.instanceMatrix.needsUpdate = true;
  };
  im.userData.update(-1, 0, new THREE.Vector3());
  return im;
}

// ===================================================================== BEACH
export const sandY = (x, z) => 0.035 * z + (z > 6 ? 0.12 * Math.sin(x * 0.35) * Math.sin(z * 0.22) * clamp((z - 6) / 8) : 0);

export function buildBeach() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd4f1ff, 140, 700);
  const sky = makeSky({ top: 0x2f8fea, mid: 0x5fb6f5, horizon: 0xd4f1ff, bottom: 0x1d86d6 });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xcbeaff, 0xf6dcae, 1.35));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.9);
  sun.position.set(9, 16, 12);
  shadowCfg(sun, 9, 2048, 60);
  scene.add(sun, sun.target);
  // visible sun disc (off to the side of most shots)
  const sunDisc = new THREE.Group();
  sunDisc.add(new THREE.Mesh(new THREE.SphereGeometry(18, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfffbe0, fog: false })));
  sunDisc.add(glow(0xfff2b0, 120, 0.8), glow(0xffd27a, 260, 0.35));
  sunDisc.position.set(-330, 240, -800);
  scene.add(sunDisc);

  // sand
  const sg = new THREE.PlaneGeometry(260, 140, 180, 120);
  sg.rotateX(-Math.PI / 2);
  sg.translate(0, 0, 60);
  const sp = sg.attributes.position;
  const sc = new Float32Array(sp.count * 3);
  const wet = new THREE.Color(0xcfa86e), dry = new THREE.Color(0xf6dfae), c = new THREE.Color();
  const R = rng(61);
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i), z = sp.getZ(i);
    sp.setY(i, sandY(x, z));
    c.copy(wet).lerp(dry, smooth(clamp((z - 0.5) / 3.5)));
    const n = 0.035 * (R() - 0.5);
    sc.set([c.r + n, c.g + n, c.b + n], i * 3);
  }
  sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  sg.computeVertexNormals();
  const sand = new THREE.Mesh(sg, std(0xffffff, 0.95, { vertexColors: true }));
  sand.receiveShadow = true;
  scene.add(sand);

  const sea = makeSea({ w: 900, d: 700, segW: 150, segD: 150, cz: -348, shore: (x, z) => -z * 1.0, fade: 14, amp: 1 });
  sea.position.y = 0;
  scene.add(sea);
  const glints = makeGlints(500, 7, [-60, 60, 0.25, 0.4, -120, -6], { size: 9, minPx: 3 });
  scene.add(glints);

  // far island + clouds
  const isl = new THREE.Group();
  add(isl, new THREE.SphereGeometry(30, 32, 16), std(0x4fae6a, 0.9), [0, -18, 0], [0, 0, 0], [1.6, 1, 1]);
  add(isl, new THREE.SphereGeometry(18, 24, 12), std(0x3d9a5c, 0.9), [22, -9, 6], [0, 0, 0], [1.4, 1, 1]);
  isl.position.set(-150, 0, -420);
  scene.add(isl);
  const RC = rng(9);
  for (const [x, y, z, s] of [[-120, 70, -460, 9], [60, 90, -520, 11], [200, 60, -430, 8], [-260, 110, -560, 12], [-20, 130, -620, 10], [140, 150, -700, 14]]) {
    const cl = makeCloud(RC, { scale: s });
    cl.position.set(x, y, z);
    scene.add(cl);
  }

  // palms, rocks, sandcastle, bucket, shells, starfish
  const RP = rng(17);
  for (const [x, z, h, l] of [[-9.5, 9, 8.5, 0.35], [-13, 4.5, 7.2, 0.5], [11, 11, 9, 0.3], [15.5, 5, 7.5, 0.55], [-20, 14, 9, 0.25], [24, 15, 8, 0.3]]) {
    const p = makePalm(RP, { height: h, lean: l });
    p.position.set(x, sandY(x, z) - 0.1, z);
    scene.add(p);
  }
  const rockM = std(0x8c8a92, 0.85, { flatShading: true });
  for (const [x, z, s] of [[-6.5, 0.6, 1.1], [-7.6, 1.4, 0.7], [7.5, -0.4, 0.9], [-5.2, -0.6, 0.5]]) {
    add(scene, new THREE.DodecahedronGeometry(s, 1), rockM, [x, sandY(x, z) + s * 0.3, z], [RP(), RP(), RP()], [1.2, 0.7, 1]);
  }
  const castle = new THREE.Group();
  const cs = std(0xe9c98d, 0.95);
  add(castle, new THREE.CylinderGeometry(0.55, 0.65, 0.7, 20), cs, [0, 0.35, 0]);
  add(castle, new THREE.CylinderGeometry(0.32, 0.38, 0.55, 16), cs, [0, 0.97, 0]);
  for (let i = 0; i < 6; i++) add(castle, new THREE.BoxGeometry(0.14, 0.14, 0.14), cs, [Math.cos(i) * 0.5, 0.75, Math.sin(i) * 0.5]);
  for (const [x, z] of [[-0.75, 0.2], [0.75, 0.1]]) add(castle, new THREE.CylinderGeometry(0.22, 0.26, 0.6, 14), cs, [x, 0.3, z]);
  add(castle, new THREE.CylinderGeometry(0.012, 0.012, 0.6, 6), std(0x6b4a32), [0, 1.5, 0]);
  add(castle, new THREE.PlaneGeometry(0.3, 0.18), std(0xff5a5a, 0.6, { side: THREE.DoubleSide }), [0.15, 1.7, 0], [0, 0, 0], [1, 1, 1], false);
  castle.position.set(3.4, sandY(3.4, 4.2), 4.2);
  castle.rotation.y = -0.4;
  scene.add(castle);
  const bucket = new THREE.Group();
  add(bucket, new THREE.CylinderGeometry(0.34, 0.26, 0.55, 20, 1, true), std(0x2f8cff, 0.5, { side: THREE.DoubleSide }), [0, 0.27, 0]);
  add(bucket, new THREE.TorusGeometry(0.34, 0.03, 8, 20), std(0xffd23f, 0.5), [0, 0.55, 0], [Math.PI / 2, 0, 0]);
  bucket.position.set(4.6, sandY(4.6, 5.2), 5.2);
  bucket.rotation.z = 0.15;
  scene.add(bucket);
  const starM = std(0xff9a3c, 0.6);
  for (const [x, z, col] of [[-2.2, 5.3, 0xff9a3c], [5.6, 3.0, 0xff6fa5]]) {
    const st = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2, r = i % 2 ? 0.12 : 0.3;
      i ? st.lineTo(Math.cos(a) * r, Math.sin(a) * r) : st.moveTo(r, 0);
    }
    const m = add(scene, new THREE.ExtrudeGeometry(st, { depth: 0.06, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03 }), std(col, 0.6), [x, sandY(x, z) + 0.05, z], [-Math.PI / 2, 0, RP() * 3]);
    m.castShadow = false;
  }
  for (const [x, z] of [[1.6, 5.8], [-3.6, 3.6], [6.6, 6.5]]) add(scene, new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), std(0xfff0e6, 0.4), [x, sandY(x, z), z], [0, RP() * 3, 0], [1, 0.6, 1.2]);

  const aff = makeAffan();
  scene.add(aff.root);
  const crab = makeCrab();
  crab.scale.setScalar(0.7);
  scene.add(crab);
  const sub = makeSub();
  sub.scale.setScalar(3.33);
  scene.add(sub);
  const splash = makeSplash(80, 3, { r: 0.06 });
  const splash2 = makeSplash(110, 4, { r: 0.1 });
  scene.add(splash, splash2);
  return { scene, sky, sea, glints, sun, aff, crab, sub, splash, splash2 };
}

// ================================================================= LANDSCAPE
const G = (x, z, cx, cz, h, s) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * s * s));
export function landNat(x, z) {
  let h = 3 + 0.8 * Math.sin(x * 0.11) * Math.cos(z * 0.09) + 0.5 * Math.sin(x * 0.27 + z * 0.19);
  h += G(x, z, 0, -122, 56, 33) + G(x, z, -52, -140, 40, 26) + G(x, z, 50, -130, 44, 25) + G(x, z, -95, -110, 26, 30) + G(x, z, 95, -105, 28, 30);
  h += G(x, z, -40, -40, 9, 16) + G(x, z, 42, -22, 11, 15) + G(x, z, -38, 28, 7, 13) + G(x, z, 36, 50, 6, 12);
  // jagged rocky detail high up
  h += clamp((h - 24) / 24) * (0.9 * Math.sin(x * 0.31 + z * 0.17) + 0.7 * Math.sin(z * 0.37 - x * 0.21));
  const coast = smooth(clamp((z - 58) / 32));
  return lerp(h, -7, coast);
}

const RIVER_PTS = [[4, -76], [3, -66], [-5, -52], [-12, -34], [-7, -15], [5, 3], [11, 21], [3, 39], [-5, 55], [-1, 70], [2, 84], [4, 100]];
export const ROCKS_AT = new THREE.Vector3(4, 0, -80);

export function buildLand() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfe6f7, 150, 520);
  const sky = makeSky({ top: 0x4d93e0, mid: 0x86bff0, horizon: 0xdcefff, bottom: 0x2a8fd6 });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xd9ecff, 0x7a8a60, 1.25));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
  shadowCfg(sun, 30, 2048, 300);
  scene.add(sun, sun.target);
  sun.userData.dir = new THREE.Vector3(0.55, 0.75, 0.45).normalize();

  // ---- river centreline + bed heights
  const curve = new THREE.CatmullRomCurve3(RIVER_PTS.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'catmullrom', 0.5);
  const NS = 360;
  const samp = curve.getSpacedPoints(NS);
  const tang = [], bed = [], halfW = [];
  let prev = 1e9;
  for (let i = 0; i <= NS; i++) {
    const s = i / NS;
    const tg = curve.getTangentAt(s);
    tang.push(tg);
    const w = lerp(1.6, 4.2, smooth(s));
    halfW.push(w);
    const nx = -tg.z, nz = tg.x;
    let lo = 1e9;
    for (const k of [-1.6, -0.8, 0, 0.8, 1.6]) lo = Math.min(lo, landNat(samp[i].x + nx * w * k, samp[i].z + nz * w * k));
    prev = Math.min(prev - 0.02, lo - 0.15);
    bed.push(Math.max(prev, 0.08));
  }
  // smooth the bed profile
  for (let pass = 0; pass < 6; pass++) for (let i = 1; i < NS; i++) bed[i] = Math.min(bed[i - 1] - 0.01, (bed[i - 1] + bed[i] * 2 + bed[i + 1]) / 4);
  for (let i = 0; i <= NS; i++) bed[i] = Math.max(bed[i], 0.08);
  const nearest = (x, z) => {
    let bd = 1e9, bi = 0;
    for (let i = 0; i <= NS; i += 2) {
      const d = (samp[i].x - x) ** 2 + (samp[i].z - z) ** 2;
      if (d < bd) (bd = d), (bi = i);
    }
    for (let i = Math.max(0, bi - 2); i <= Math.min(NS, bi + 2); i++) {
      const d = (samp[i].x - x) ** 2 + (samp[i].z - z) ** 2;
      if (d < bd) (bd = d), (bi = i);
    }
    return [Math.sqrt(bd), bi];
  };
  const landH = (x, z) => {
    const h = landNat(x, z);
    const [d, i] = nearest(x, z);
    const w = halfW[i];
    const k = smooth(clamp((w * 2.6 - d) / (w * 1.9)));
    return lerp(h, Math.min(h, bed[i] - 0.7 * smooth(clamp(1 - d / (w * 1.2)))), k);
  };

  // ---- terrain
  const tg = new THREE.PlaneGeometry(340, 340, 300, 300);
  tg.rotateX(-Math.PI / 2);
  tg.translate(0, 0, -60);
  const tp = tg.attributes.position;
  const tc = new Float32Array(tp.count * 3);
  const R = rng(5);
  for (let i = 0; i < tp.count; i++) tp.setY(i, landH(tp.getX(i), tp.getZ(i)));
  tg.computeVertexNormals();
  const tn = tg.attributes.normal;
  const C = {
    sand: new THREE.Color(0xf2dca4), grass: new THREE.Color(0x6cc85a), grass2: new THREE.Color(0x48a957), forest: new THREE.Color(0x3c9a55),
    rock: new THREE.Color(0x9a8e86), rock2: new THREE.Color(0xa39a92), top: new THREE.Color(0xc4b8ad), bank: new THREE.Color(0x8f7a5c),
  };
  const c = new THREE.Color();
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), y = tp.getY(i), z = tp.getZ(i);
    const steep = 1 - tn.getY(i);
    const n = Math.sin(x * 0.9) * Math.sin(z * 1.1) * 0.5 + (R() - 0.5) * 0.6;
    c.copy(C.grass).lerp(C.grass2, clamp(0.5 + n * 0.6));
    if (y > 9) c.lerp(C.forest, clamp((y - 9) / 8));
    const rk = clamp((y - 32) / 10 + steep * 1.1 - 0.3);
    c.lerp(n > 0 ? C.rock : C.rock2, rk);
    if (y > 46) c.lerp(C.top, clamp((y - 46) / 8));
    if (y < 1.6) c.lerp(C.sand, smooth(clamp((1.6 - y) / 1.2)));
    const [d, ri] = nearest(x, z);
    if (d < halfW[ri] * 1.7 && y > 0.5) c.lerp(C.bank, 0.55 * clamp(1 - (d - halfW[ri]) / (halfW[ri] * 0.7)));
    tc.set([c.r, c.g, c.b], i * 3);
  }
  tg.setAttribute('color', new THREE.BufferAttribute(tc, 3));
  const terrain = new THREE.Mesh(tg, std(0xffffff, 0.92, { vertexColors: true }));
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  scene.add(terrain);
  // distant ring of hazy mountains
  const RR = rng(77);
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI * 0.95 + (i / 25) * Math.PI * 0.9;
    const r = 300 + RR() * 60;
    add(scene, new THREE.ConeGeometry(50 + RR() * 40, 70 + RR() * 70, 7), std([0x7fa6c8, 0x8db3d2, 0x739cc2][i % 3], 1, { flatShading: true }), [Math.cos(a) * r, 10, -60 + Math.sin(a) * r], [0, RR() * 3, 0], [1, 1, 1], false);
  }

  // ---- sea
  const sea = makeSea({ w: 900, d: 600, segW: 120, segD: 90, cz: 330, amp: 0.9, shore: (x, z) => -landNat(x, z) * 2.2, fade: 12 });
  scene.add(sea);
  const glints = makeGlints(500, 12, [-150, 150, 0.4, 0.6, 85, 300], { size: 16, minPx: 3 });
  scene.add(glints);

  // ---- river ribbon with flowing texture
  const flowTex = canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#2fb3ec';
    g.fillRect(0, 0, w, h);
    const Rf = rng(3);
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = `rgba(220,250,255,${0.25 + Rf() * 0.45})`;
      g.lineWidth = 2 + Rf() * 4;
      const x = Rf() * w, y = Rf() * h, l = 20 + Rf() * 60;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + 6, y + l / 2, x, y + l);
      g.stroke();
    }
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, 'rgba(120,230,240,0.7)');
    gr.addColorStop(0.15, 'rgba(120,230,240,0)');
    gr.addColorStop(0.85, 'rgba(120,230,240,0)');
    gr.addColorStop(1, 'rgba(120,230,240,0.7)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  flowTex.wrapS = flowTex.wrapT = THREE.RepeatWrapping;
  const rv = [], ru = [], ri = [];
  let len = 0;
  for (let i = 0; i <= NS; i++) {
    if (i) len += samp[i].distanceTo(samp[i - 1]);
    const t = tang[i], nx = -t.z, nz = t.x, w = halfW[i], y = bed[i] + 0.12;
    rv.push(samp[i].x - nx * w, y, samp[i].z - nz * w, samp[i].x + nx * w, y, samp[i].z + nz * w);
    ru.push(0, len / 10, 1, len / 10);
    if (i) {
      const a = (i - 1) * 2;
      ri.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(rv, 3));
  rg.setAttribute('uv', new THREE.Float32BufferAttribute(ru, 2));
  rg.setIndex(ri);
  rg.computeVertexNormals();
  const river = new THREE.Mesh(rg, std(0xffffff, 0.15, { map: flowTex, emissive: 0x1a6a9a, emissiveIntensity: 0.35 }));
  river.receiveShadow = true;
  scene.add(river);
  const riverLen = len;
  // riverAt(s): centre point on the water surface, tangent, half width
  const riverAt = (s) => {
    const f = clamp(s) * NS, i = Math.min(NS - 1, Math.floor(f)), k = f - i;
    const p = samp[i].clone().lerp(samp[i + 1], k);
    p.y = lerp(bed[i], bed[i + 1], k) + 0.12;
    return { p, t: tang[i].clone().lerp(tang[i + 1], k).normalize(), w: lerp(halfW[i], halfW[i + 1], k) };
  };

  // ---- rock garden at the river source (with mineral crystals)
  const rocks = new THREE.Group();
  const rockTops = [];
  const rockMats = [std(0x8f8790, 0.85, { flatShading: true }), std(0xa0948a, 0.85, { flatShading: true }), std(0x7d7488, 0.85, { flatShading: true })];
  const crystalCols = [0xff7ad9, 0x9b7bff, 0x52e0ff, 0xffd34a, 0x6bffb0];
  const Rk = rng(31);
  const src = riverAt(0).p;
  ROCKS_AT.set(src.x, landH(src.x, src.z - 4), src.z - 4);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + Rk() * 0.5, r = 2.2 + Rk() * 3.2;
    const x = src.x + Math.cos(a) * r, z = src.z - 4 + Math.sin(a) * r * 0.8;
    const s = 1.1 + Rk() * 1.4;
    const geo = new THREE.IcosahedronGeometry(s, 1);
    const gp = geo.attributes.position;
    for (let j = 0; j < gp.count; j++) {
      const v = new THREE.Vector3().fromBufferAttribute(gp, j);
      v.multiplyScalar(1 + 0.18 * Math.sin(v.x * 3.1 + i) * Math.sin(v.y * 2.7 + v.z * 1.9));
      gp.setXYZ(j, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const y = landH(x, z);
    const m = add(rocks, geo, rockMats[i % 3], [x, y + s * 0.35, z], [Rk(), Rk() * 3, Rk()], [1.15, 0.8, 1]);
    rockTops.push(new THREE.Vector3(x, y + s * 1.05, z));
    for (let k = 0; k < 4; k++) {
      const cc = crystalCols[(i + k) % crystalCols.length];
      const cr = add(rocks, new THREE.OctahedronGeometry(0.16 + Rk() * 0.14, 0), std(cc, 0.2, { emissive: cc, emissiveIntensity: 0.9 }), [0, 0, 0], [Rk(), Rk(), Rk()], [0.7, 1.3, 0.7], false);
      const dir = new THREE.Vector3(Rk() - 0.5, 0.3 + Rk() * 0.7, Rk() - 0.5).normalize();
      cr.position.copy(m.position).addScaledVector(dir, s * 0.9);
    }
  }
  scene.add(rocks);

  // ---- vegetation (instanced)
  const RT = rng(44);
  const canopy = [], cones = [];
  for (let i = 0; i < 1400 && canopy.length + cones.length < 520; i++) {
    const x = -150 + RT() * 300, z = -200 + RT() * 285;
    const h = landH(x, z);
    if (h < 1.8 || h > 24) continue;
    const [d, ri2] = nearest(x, z);
    if (d < halfW[ri2] * 2.4 + 1.5) continue;
    if (Math.hypot(x - ROCKS_AT.x, z - ROCKS_AT.z) < 12) continue;
    (RT() < 0.65 ? canopy : cones).push([x, h, z, 0.8 + RT() * 0.9, RT()]);
  }
  const trunkIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.26, 2, 7), std(0x8a5f3c, 0.9), canopy.length + cones.length);
  const canIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.4, 1), std(0xffffff, 0.8, { flatShading: true }), canopy.length);
  const coneIM = new THREE.InstancedMesh(new THREE.ConeGeometry(1.2, 3.4, 8), std(0xffffff, 0.8, { flatShading: true }), cones.length);
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3();
  const leafCols = [0x4fc45e, 0x3aa655, 0x7bd66a, 0x2f9a62, 0x5cc8a0].map((x) => new THREE.Color(x));
  let ti = 0;
  canopy.forEach(([x, h, z, s, r], i) => {
    trunkIM.setMatrixAt(ti++, M4.compose(V.set(x, h + s, z), Q.identity(), S.setScalar(s)));
    canIM.setMatrixAt(i, M4.compose(V.set(x, h + 2.6 * s, z), Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r * 6), S.set(s, s * 0.9, s)));
    canIM.setColorAt(i, leafCols[Math.floor(r * 5)]);
  });
  cones.forEach(([x, h, z, s, r], i) => {
    trunkIM.setMatrixAt(ti++, M4.compose(V.set(x, h + s * 0.6, z), Q.identity(), S.setScalar(s * 0.7)));
    coneIM.setMatrixAt(i, M4.compose(V.set(x, h + 2.6 * s, z), Q.identity(), S.setScalar(s)));
    coneIM.setColorAt(i, leafCols[Math.floor(r * 5)]);
  });
  for (const im of [trunkIM, canIM, coneIM]) {
    im.castShadow = true;
    im.receiveShadow = true;
    scene.add(im);
  }
  const RPm = rng(8);
  for (const [x, z] of [[-24, 66], [-30, 60], [18, 64], [26, 58], [-14, 70], [12, 72]]) {
    const p = makePalm(RPm, { height: 7, lean: 0.4 });
    p.position.set(x, landH(x, z) - 0.2, z);
    scene.add(p);
  }

  // ---- rain clouds over the mountain + fair-weather clouds
  const RCl = rng(19);
  const rainClouds = [];
  for (const [x, y, z, s] of [[-6, 78, -96, 5.5], [24, 82, -112, 6], [-34, 80, -118, 5], [6, 86, -140, 6.5], [40, 76, -88, 4.5], [-28, 74, -78, 4]]) {
    const cl = makeCloud(RCl, { scale: s, color: 0xf6f9ff, shade: 0xc4d0e4, puffs: 8 });
    cl.position.set(x, y, z);
    scene.add(cl);
    rainClouds.push(cl);
  }
  for (const [x, y, z, s] of [[-120, 70, 40, 6], [110, 80, 20, 7], [60, 95, 160, 8], [-80, 90, 200, 7]]) {
    const cl = makeCloud(RCl, { scale: s });
    cl.position.set(x, y, z);
    scene.add(cl);
  }

  // ---- rain (streak sprites)
  const NR = 9000;
  const rp = new Float32Array(NR * 3), rph = new Float32Array(NR);
  const Rr = rng(23);
  for (let i = 0; i < NR; i++) {
    rp.set([-55 + Rr() * 110, 0, -150 + Rr() * 100], i * 3);
    rph[i] = Rr();
  }
  const rgeo = new THREE.BufferGeometry();
  rgeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  rgeo.setAttribute('aPh', new THREE.BufferAttribute(rph, 1));
  const rainMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 } },
    vertexShader: `attribute float aPh; uniform float uTime; varying float vA;
      void main(){ vec3 p = position; float top = 76.0; float k = fract(aPh * 7.13 + uTime * 0.55);
      p.y = top - k * top; vA = smoothstep(0.0, 0.08, k) * (1.0 - smoothstep(0.9, 1.0, k));
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = clamp(1400.0 / -mv.z, 3.0, 90.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uAlpha; varying float vA; void main(){ vec2 p = gl_PointCoord - 0.5;
      float a = (1.0 - smoothstep(0.0, 0.06, abs(p.x + p.y * 0.12))) * (1.0 - smoothstep(0.3, 0.5, abs(p.y)));
      gl_FragColor = vec4(0.85, 0.95, 1.0, a * vA * 0.75 * uAlpha); }`,
  });
  const rain = new THREE.Points(rgeo, rainMat);
  rain.frustumCulled = false;
  scene.add(rain);
  // drop splashes on the rocks: expanding rings
  const NSp = 160;
  const spp = new Float32Array(NSp * 3), sph = new Float32Array(NSp);
  const Rs = rng(29);
  for (let i = 0; i < NSp; i++) {
    const r = rockTops[i % rockTops.length];
    spp.set([r.x + (Rs() - 0.5) * 2.4, r.y - Rs() * 0.9, r.z + (Rs() - 0.5) * 2.4], i * 3);
    sph[i] = Rs();
  }
  const spg = new THREE.BufferGeometry();
  spg.setAttribute('position', new THREE.BufferAttribute(spp, 3));
  spg.setAttribute('aPh', new THREE.BufferAttribute(sph, 1));
  const splMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 } },
    vertexShader: `attribute float aPh; uniform float uTime; varying float vK;
      void main(){ vK = fract(aPh * 3.7 + uTime * 1.6); vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = (40.0 + 140.0 * vK) * (12.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uAlpha; varying float vK; void main(){ vec2 p = gl_PointCoord - 0.5; p.y *= 2.2; float d = length(p);
      float ring = 1.0 - smoothstep(0.0, 0.06, abs(d - 0.42 * vK - 0.05)); gl_FragColor = vec4(0.9, 0.97, 1.0, ring * (1.0 - vK) * uAlpha); }`,
  });
  const rockSplash = new THREE.Points(spg, splMat);
  rockSplash.frustumCulled = false;
  scene.add(rockSplash);

  // ---- mineral particles: rock surface -> river -> sea
  const NM = 1100;
  const mPos = new Float32Array(NM * 3), mCol = new Float32Array(NM * 3), mA = new Float32Array(NM), mSz = new Float32Array(NM);
  const Rm = rng(37);
  const MCOL = crystalCols.map((x) => new THREE.Color(x));
  const mInfo = [];
  for (let i = 0; i < NM; i++) {
    const r = rockTops[Math.floor(Rm() * rockTops.length)];
    const start = new THREE.Vector3(r.x + (Rm() - 0.5) * 2.2, r.y - Rm() * 0.6, r.z + (Rm() - 0.5) * 2.2);
    const cc = MCOL[i % MCOL.length];
    mCol.set([cc.r, cc.g, cc.b], i * 3);
    mSz[i] = 0.7 + Rm() * 0.7;
    mInfo.push({ start, ph: Rm(), sp: 0.85 + Rm() * 0.3, lat: (Rm() - 0.5) * 1.5, bob: Rm() * 6 });
  }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
  mg.setAttribute('aCol', new THREE.BufferAttribute(mCol, 3));
  mg.setAttribute('aA', new THREE.BufferAttribute(mA, 1));
  mg.setAttribute('aSz', new THREE.BufferAttribute(mSz, 1));
  const minMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uScale: { value: 1 }, uMin: { value: 3 } },
    vertexShader: `attribute vec3 aCol; attribute float aA; attribute float aSz; uniform float uScale; uniform float uMin; varying vec3 vC; varying float vA;
      void main(){ vC = aCol; vA = aA; vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = max(uMin, aSz * uScale * 420.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p);
      float core = smoothstep(0.22, 0.0, d); float halo = smoothstep(0.5, 0.0, d) * 0.55;
      float star = max(0.0, 1.0 - abs(p.x) * 9.0) * max(0.0, 1.0 - abs(p.y) * 2.2) + max(0.0, 1.0 - abs(p.y) * 9.0) * max(0.0, 1.0 - abs(p.x) * 2.2);
      gl_FragColor = vec4(mix(vC, vec3(1.0), core * 0.6), min(1.0, (core * 1.2 + halo * 1.3 + star * 0.8) * vA)); }`,
  });
  const minerals = new THREE.Points(mg, minMat);
  minerals.frustumCulled = false;
  scene.add(minerals);
  // Each particle cycles: on the rock (u<0.1) -> along the river (0.1..1).
  // `release` (0..1) gates how much of the flow has started; `cycle` = seconds per trip.
  const tmp = new THREE.Vector3();
  const updateMinerals = (t, { release = 1, cycle = 14, alpha = 1, scale = 1, minPx = 3, spill = 0 } = {}) => {
    minMat.uniforms.uScale.value = scale;
    minMat.uniforms.uMin.value = minPx;
    for (let i = 0; i < NM; i++) {
      const m = mInfo[i];
      const u = (m.ph + (t / cycle) * m.sp) % 1;
      let a = alpha;
      if (u < 0.2) {
        const k = u / 0.2;
        const head = riverAt(0.002).p;
        tmp.copy(m.start).lerp(head, smooth(k));
        tmp.y += Math.sin(k * Math.PI) * 0.6 + 0.15;
        a *= clamp(k * 6) * (release > 0 ? 1 : 0);
      } else {
        const s = (u - 0.2) / 0.8;
        if (s > release + spill) a = 0;
        const r = riverAt(s * 0.985);
        tmp.copy(r.p);
        const nx = -r.t.z, nz = r.t.x;
        tmp.x += nx * m.lat * r.w * 0.7;
        tmp.z += nz * m.lat * r.w * 0.7;
        tmp.y += 0.22 + 0.08 * Math.sin(t * 3 + m.bob);
      }
      mPos[i * 3] = tmp.x;
      mPos[i * 3 + 1] = tmp.y;
      mPos[i * 3 + 2] = tmp.z;
      mA[i] = a;
    }
    mg.attributes.position.needsUpdate = true;
    mg.attributes.aA.needsUpdate = true;
  };

  const sub = makeSub();
  scene.add(sub);
  const aff = makeAffan();
  seatAffan(sub, aff);
  const wake = makeSplash(60, 9, { r: 0.08 });
  scene.add(wake);

  const update = (t) => {
    flowTex.offset.y = -t * 0.9;
    rainMat.uniforms.uTime.value = t;
    splMat.uniforms.uTime.value = t;
    sea.userData.update(t, 0.9);
    glints.userData.update(t);
    sub.userData.update(t);
  };
  return { scene, sky, sun, sea, glints, terrain, river, riverAt, riverLen, landH, rocks, rockTops, rain, rainMat, splMat, minerals, updateMinerals, sub, aff, rainClouds, update, wake };
}

// ================================================================ UNDERWATER
function causticTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const u = (x / w) * Math.PI * 2, v = (y / h) * Math.PI * 2;
        const a = Math.sin(3 * u + 2 * Math.sin(2 * v)) + Math.sin(3 * v + 2 * Math.sin(2 * u + 1.3)) + Math.sin(2 * (u + v) + 1.7 * Math.sin(u - v));
        const k = Math.pow(clamp(1 - Math.abs(a) / 0.55), 2.2);
        const i = (y * w + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = k * 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
}

function makeFish(color, stripe = 0xffffff) {
  const f = new THREE.Group();
  const m = std(color, 0.4, { emissive: color, emissiveIntensity: 0.15 });
  add(f, new THREE.SphereGeometry(0.3, 18, 12), m, [0, 0, 0], [0, 0, 0], [0.55, 0.85, 1.2], false);
  add(f, new THREE.TorusGeometry(0.25, 0.04, 6, 16), std(stripe, 0.5), [0, 0, 0.05], [0, Math.PI / 2, 0], [1, 1.25, 0.9], false);
  const tail = new THREE.Group();
  tail.position.set(0, 0, -0.33);
  f.add(tail);
  add(tail, new THREE.ConeGeometry(0.2, 0.32, 3), m, [0, 0, -0.12], [-Math.PI / 2, 0, 0], [0.3, 1, 1.2], false);
  for (const s of [-1, 1]) {
    add(f, new THREE.SphereGeometry(0.07, 10, 8), std(0xffffff, 0.3), [0.14 * s, 0.06, 0.2], [0, 0, 0], [1, 1, 1], false);
    add(f, new THREE.SphereGeometry(0.04, 8, 6), std(0x111111, 0.3), [0.175 * s, 0.07, 0.235], [0, 0, 0], [1, 1, 1], false);
  }
  f.userData.tail = tail;
  return f;
}

export function buildUnder() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1590cf, 0.032);
  const sky = makeSky({ top: 0x8fe8ff, mid: 0x2aa6dc, horizon: 0x1786c8, bottom: 0x0c4f94 });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xbff2ff, 0x1a5a8a, 1.6));
  const key = new THREE.DirectionalLight(0xe6fbff, 2.0);
  key.position.set(4, 20, 6);
  shadowCfg(key, 14, 2048, 60);
  scene.add(key, key.target);

  // sand floor with ripples
  const fg = new THREE.PlaneGeometry(160, 160, 160, 160);
  fg.rotateX(-Math.PI / 2);
  const fp = fg.attributes.position;
  for (let i = 0; i < fp.count; i++) {
    const x = fp.getX(i), z = fp.getZ(i);
    fp.setY(i, 0.12 * Math.sin(x * 1.3 + Math.sin(z * 0.4) * 2) + 0.6 * Math.sin(x * 0.11) * Math.cos(z * 0.13));
  }
  fg.computeVertexNormals();
  const floor = new THREE.Mesh(fg, std(0xf0d9a0, 0.95));
  floor.receiveShadow = true;
  scene.add(floor);
  const ct = causticTex();
  ct.wrapS = ct.wrapT = THREE.RepeatWrapping;
  ct.repeat.set(14, 14);
  const ct2 = ct.clone();
  ct2.repeat.set(10, 10);
  ct2.needsUpdate = true;
  const caus = [];
  for (const [tex, a] of [[ct, 0.32], [ct2, 0.22]]) {
    const cg = fg.clone();
    cg.translate(0, 0.04, 0);
    const m = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: a, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xcff8ff }));
    m.renderOrder = 1;
    scene.add(m);
    caus.push(tex);
  }

  // coral garden, seaweed, rocks, starfish
  const R = rng(51);
  const coralCols = [0xff6f91, 0xffa94d, 0xb07cff, 0xff5e7a, 0x4fd8c4, 0xffd65c];
  const weeds = [];
  const place = (x, z) => [x, 0.6 * Math.sin(x * 0.11) * Math.cos(z * 0.13), z];
  for (let i = 0; i < 46; i++) {
    const x = -26 + R() * 52, z = -22 + R() * 30;
    if (Math.abs(x) < 4 && z > -6) continue;
    const [px, py, pz] = place(x, z);
    const col = coralCols[Math.floor(R() * coralCols.length)];
    const k = R();
    const g = new THREE.Group();
    g.position.set(px, py, pz);
    scene.add(g);
    if (k < 0.35) {
      // branching coral
      const m = std(col, 0.6, { emissive: col, emissiveIntensity: 0.12 });
      for (let b = 0; b < 6; b++) {
        const a = R() * Math.PI * 2, tilt = 0.2 + R() * 0.5, h = 0.8 + R() * 1.2;
        const br = add(g, new THREE.CapsuleGeometry(0.12, h, 4, 8), m, [Math.cos(a) * 0.2, h / 2, Math.sin(a) * 0.2], [Math.sin(a) * tilt, 0, Math.cos(a) * tilt]);
        add(g, new THREE.SphereGeometry(0.17, 10, 8), m, [br.position.x + Math.sin(a) * tilt * h * 0.5, h, br.position.z + Math.cos(a) * tilt * h * 0.5]);
      }
    } else if (k < 0.6) {
      add(g, new THREE.SphereGeometry(0.7 + R() * 0.5, 20, 14), std(col, 0.8, { emissive: col, emissiveIntensity: 0.08 }), [0, 0.3, 0], [0, 0, 0], [1, 0.7, 1]);
    } else if (k < 0.8) {
      // fan coral
      add(g, new THREE.CircleGeometry(1 + R() * 0.6, 20, 0, Math.PI), std(col, 0.7, { side: THREE.DoubleSide, emissive: col, emissiveIntensity: 0.1 }), [0, 0.1, 0], [0, R() * 3, 0]);
    } else {
      // seaweed: chain of segments, swayed per frame
      const segs = [];
      let parent = g;
      const n = 6 + Math.floor(R() * 4);
      for (let s = 0; s < n; s++) {
        const seg = new THREE.Group();
        seg.position.y = s ? 0.55 : 0;
        parent.add(seg);
        add(seg, new THREE.CapsuleGeometry(0.1, 0.45, 3, 6), std(0x3fbf6a, 0.7, { emissive: 0x0b3a1a, emissiveIntensity: 0.3 }), [0, 0.27, 0], [0, 0, 0], [1.6, 1, 0.5]);
        segs.push(seg);
        parent = seg;
      }
      weeds.push({ segs, ph: R() * 6 });
    }
  }
  const rockM = std(0x6f7f99, 0.9, { flatShading: true });
  for (let i = 0; i < 14; i++) {
    const x = -30 + R() * 60, z = -30 + R() * 30;
    if (Math.abs(x) < 5 && z > -8) continue;
    add(scene, new THREE.DodecahedronGeometry(0.8 + R() * 1.6, 1), rockM, place(x, z), [R(), R(), R()], [1.3, 0.7, 1]);
  }
  // light rays from the surface
  const rayTex = canvasTex(64, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    const gx = g.createLinearGradient(0, 0, w, 0);
    gx.addColorStop(0, 'rgba(0,0,0,1)');
    gx.addColorStop(0.5, 'rgba(0,0,0,0)');
    gx.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = gx;
    g.fillRect(0, 0, w, h);
  });
  const rays = [];
  for (let i = 0; i < 9; i++) {
    const m = add(scene, new THREE.PlaneGeometry(2.2 + R() * 2.5, 30), new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, color: 0xd8fbff }), [-16 + i * 4 + R() * 2, 8, -14 + R() * 10], [0, R() * 3, 0.32], [1, 1, 1], false);
    m.renderOrder = 3;
    rays.push({ m, ph: R() * 6 });
  }
  // surface ceiling shimmer
  const surf = add(scene, new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ map: ct2, color: 0xbff4ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, fog: false }), [0, 16, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  surf.renderOrder = -1;

  // fish
  const fish = [];
  const FC = [[0xff8a3d, 0xffffff], [0xffd23f, 0x2f6fff], [0x3fa2ff, 0xffe45c], [0xff6fa5, 0xffffff]];
  for (let i = 0; i < 18; i++) {
    const [a, b] = FC[i % FC.length];
    const f = makeFish(a, b);
    f.scale.setScalar(0.9 + R() * 0.7);
    scene.add(f);
    fish.push({ f, r: 6 + R() * 10, y: 2 + R() * 6, sp: 0.18 + R() * 0.15, ph: R() * 6, cz: -6 - R() * 8, cx: (R() - 0.5) * 10 });
  }
  // bubbles
  const bubbles = makeGlints(260, 66, [-14, 14, 0, 14, -16, 6], { size: 7, color: [0.85, 0.97, 1], minPx: 2, rate: 1.2 });
  scene.add(bubbles);

  // dissolved salt / incoming minerals: particles stream in from the river
  // mouth (left), then spread through the water and turn into white salt.
  const NP = 1600;
  const pPos = new Float32Array(NP * 3), pCol = new Float32Array(NP * 3), pA = new Float32Array(NP), pSz = new Float32Array(NP);
  const Rp = rng(57);
  const MC = [0xff7ad9, 0x9b7bff, 0x52e0ff, 0xffd34a, 0x6bffb0].map((x) => new THREE.Color(x));
  const pInfo = [];
  for (let i = 0; i < NP; i++) {
    pInfo.push({
      t0: (i / NP) * 1.0 + Rp() * 0.04, // order of arrival (0..1)
      end: new THREE.Vector3(-14 + Rp() * 28, 0.6 + Rp() * 11, -14 + Rp() * 16),
      lane: new THREE.Vector3((Rp() - 0.5) * 1.2, (Rp() - 0.5) * 1.2, (Rp() - 0.5) * 1.2),
      c: MC[i % MC.length], ph: Rp() * 6,
    });
    pSz[i] = 0.6 + Rp() * 0.6;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pg.setAttribute('aCol', new THREE.BufferAttribute(pCol, 3));
  pg.setAttribute('aA', new THREE.BufferAttribute(pA, 1));
  pg.setAttribute('aSz', new THREE.BufferAttribute(pSz, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `attribute vec3 aCol; attribute float aA; attribute float aSz; varying vec3 vC; varying float vA;
      void main(){ vC = aCol; vA = aA; vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = max(3.0, aSz * 300.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 p = gl_PointCoord - 0.5;
      float sq = max(abs(p.x + p.y), abs(p.x - p.y)) * 0.7071; float d = length(p);
      float cube = 1.0 - smoothstep(0.17, 0.22, sq); float halo = smoothstep(0.5, 0.0, d) * 0.45;
      gl_FragColor = vec4(mix(vC, vec3(1.0), cube * 0.5), (cube * 0.9 + halo) * vA); }`,
  });
  const salt = new THREE.Points(pg, pMat);
  salt.frustumCulled = false;
  scene.add(salt);
  const inlet = new THREE.Vector3(-22, 5, -4);
  const tmp = new THREE.Vector3(), white = new THREE.Color(0xffffff), cc = new THREE.Color();
  // progress: 0..1 portion of particles that have arrived; travel: seconds to cross
  const updateSalt = (t, progress, { travel = 2.6, rate = 0.12, alpha = 1 } = {}) => {
    for (let i = 0; i < NP; i++) {
      const p = pInfo[i];
      const age = (progress - p.t0) / rate; // in "travel units"
      if (age <= 0) {
        pA[i] = 0;
        continue;
      }
      const k = clamp(age);
      // fly in along a lane from the inlet, then drift outwards
      tmp.copy(inlet).add(p.lane).lerp(p.end, smooth(k));
      tmp.x += Math.sin(t * 0.7 + p.ph) * 0.3 * k;
      tmp.y += Math.sin(t * 0.9 + p.ph * 1.3) * 0.25 * k;
      pPos[i * 3] = tmp.x;
      pPos[i * 3 + 1] = tmp.y;
      pPos[i * 3 + 2] = tmp.z;
      cc.copy(p.c).lerp(white, smooth(clamp((age - 0.5) / 0.6)));
      pCol[i * 3] = cc.r;
      pCol[i * 3 + 1] = cc.g;
      pCol[i * 3 + 2] = cc.b;
      pA[i] = alpha * clamp(age * 4) * (0.65 + 0.35 * Math.sin(t * 3 + p.ph));
    }
    pg.attributes.position.needsUpdate = true;
    pg.attributes.aCol.needsUpdate = true;
    pg.attributes.aA.needsUpdate = true;
  };

  const sub = makeSub();
  scene.add(sub);
  const aff = makeAffan();
  seatAffan(sub, aff);
  const subBubbles = makeGlints(60, 71, [-0.4, 0.4, -0.4, 0.4, -2.2, -1.6], { size: 10, color: [0.9, 0.98, 1], minPx: 3, rate: 3 });
  sub.add(subBubbles);

  const update = (t) => {
    ct.offset.set(t * 0.03, t * 0.02);
    ct2.offset.set(-t * 0.025, t * 0.03);
    for (const w of weeds) w.segs.forEach((s, i) => (s.rotation.z = 0.12 * Math.sin(t * 1.4 + w.ph + i * 0.5)));
    for (const r of rays) r.m.material.opacity = 0.11 + 0.07 * Math.sin(t * 0.8 + r.ph);
    for (const f of fish) {
      const a = f.ph + t * f.sp;
      f.f.position.set(f.cx + Math.cos(a) * f.r, f.y + 0.4 * Math.sin(a * 3), f.cz + Math.sin(a) * f.r * 0.5);
      f.f.rotation.y = -a;
      f.f.userData.tail.rotation.y = 0.5 * Math.sin(t * 12 + f.ph);
    }
    bubbles.position.y = 0;
    bubbles.userData.update(t);
    subBubbles.userData.update(t);
    sub.userData.update(t);
  };
  return { scene, sky, sub, aff, salt, updateSalt, update, key };
}

// ============================================================ CROSS-SECTION
export const SLICE = { x0: -4.5, x1: 4.5, y0: -7, y1: 0, z0: -2.5, z1: 2.5 };

export function buildSlice() {
  const scene = new THREE.Scene();
  const bg = canvasTex(540, 960, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#2f8fea');
    gr.addColorStop(0.42, '#9fdcff');
    gr.addColorStop(0.6, '#e2f6ff');
    gr.addColorStop(1, '#bfe9ff');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  scene.background = bg;
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x5a8ab8, 1.5));
  const key = new THREE.DirectionalLight(0xfff2dc, 2.4);
  key.position.set(5, 12, 10);
  shadowCfg(key, 10, 2048, 60);
  scene.add(key, key.target);
  const { x0, x1, y0, y1, z0, z1 } = SLICE;
  const W = x1 - x0, D = z1 - z0;

  // sun with rotating rays
  const sun = new THREE.Group();
  sun.position.set(2.9, 7.4, -1.5);
  scene.add(sun);
  add(sun, new THREE.SphereGeometry(1.15, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffe14a }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  add(sun, new THREE.SphereGeometry(0.85, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff6b8 }), [0, 0, 0.5], [0, 0, 0], [1, 1, 0.3], false);
  sun.add(glow(0xfff0a0, 6.5, 0.7));
  const rays = new THREE.Group();
  sun.add(rays);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    add(rays, new THREE.ConeGeometry(0.18, 0.75, 8), new THREE.MeshBasicMaterial({ color: 0xffc23a }), [Math.cos(a) * 1.65, Math.sin(a) * 1.65, 0], [0, 0, a - Math.PI / 2], [1, 1, 0.4], false);
  }
  // cloud that collects the vapour
  const cloud = makeCloud(rng(4), { scale: 0.55, puffs: 7 });
  cloud.position.set(-2.2, 7.4, -1.2);
  scene.add(cloud);

  // base plate + sand
  add(scene, new RoundedBoxGeometry(W + 0.8, 0.7, D + 0.8, 3, 0.18), std(0xffffff, 0.6), [0, y0 - 0.85, 0]);
  const sandG = new THREE.BoxGeometry(W, 1.0, D, 40, 1, 10);
  const sgp = sandG.attributes.position;
  for (let i = 0; i < sgp.count; i++) if (sgp.getY(i) > 0) sgp.setY(i, 0.5 + 0.18 * Math.sin(sgp.getX(i) * 1.7) * Math.cos(sgp.getZ(i) * 1.3));
  sandG.computeVertexNormals();
  add(scene, sandG, std(0xf0d59a, 0.95), [0, y0 - 0.0, 0]);
  // small coral + rocks on the sand
  const R = rng(13);
  for (let i = 0; i < 7; i++) {
    const col = [0xff6f91, 0xffa94d, 0xb07cff, 0x4fd8c4][i % 4];
    add(scene, new THREE.SphereGeometry(0.25 + R() * 0.25, 14, 10), std(col, 0.7, { emissive: col, emissiveIntensity: 0.1 }), [x0 + 0.6 + R() * (W - 1.2), y0 + 0.55, z0 + 0.6 + R() * (D - 1.2)], [0, 0, 0], [1, 0.75, 1]);
  }
  // back wall: deep-water gradient (opaque) so the slice reads as a body of water
  const backG = new THREE.PlaneGeometry(W, y1 - y0 + 0.6, 48, 1);
  const bcol = new Float32Array(backG.attributes.position.count * 3);
  const top = new THREE.Color(0x3cc8f0), bot = new THREE.Color(0x1260b8);
  for (let i = 0; i < backG.attributes.position.count; i++) {
    const k = backG.attributes.position.getY(i) > 0 ? 0 : 1;
    const c = top.clone().lerp(bot, k);
    bcol.set([c.r, c.g, c.b], i * 3);
  }
  backG.setAttribute('color', new THREE.BufferAttribute(bcol, 3));
  const back = add(scene, backG, new THREE.MeshBasicMaterial({ vertexColors: true }), [0, (y0 + y1) / 2 + 0.3, z0 + 0.01], [0, 0, 0], [1, 1, 1], false);
  // side walls (tinted)
  for (const s of [-1, 1]) {
    const m = add(scene, new THREE.PlaneGeometry(D, y1 - y0), new THREE.MeshBasicMaterial({ color: 0x1a8ad6, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }), [s * (W / 2), (y0 + y1) / 2, 0], [0, Math.PI / 2, 0], [1, 1, 1], false);
    m.renderOrder = 4;
  }
  // front glass face whose top edge follows the waves
  const frontG = new THREE.PlaneGeometry(W, y1 - y0, 60, 1);
  frontG.translate(0, (y0 + y1) / 2, 0);
  const fcol = new Float32Array(frontG.attributes.position.count * 4);
  const ftop = new THREE.Color(0x6fe0ff), fbot = new THREE.Color(0x1f7fd6);
  for (let i = 0; i < frontG.attributes.position.count; i++) {
    const k = frontG.attributes.position.getY(i) > (y0 + y1) / 2 ? 0 : 1;
    const c = ftop.clone().lerp(fbot, k);
    fcol.set([c.r, c.g, c.b, k ? 0.62 : 0.38], i * 4);
  }
  frontG.setAttribute('color', new THREE.BufferAttribute(fcol, 4));
  const front = new THREE.Mesh(frontG, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
  front.position.z = z1;
  front.renderOrder = 6;
  scene.add(front);
  // white rounded glass edges
  const edgeM = std(0xffffff, 0.4, { emissive: 0xffffff, emissiveIntensity: 0.2 });
  for (const [x, z] of [[x0, z1], [x1, z1], [x0, z0], [x1, z0]]) add(scene, new THREE.CylinderGeometry(0.06, 0.06, y1 - y0, 8), edgeM, [x, (y0 + y1) / 2, z], [0, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.CylinderGeometry(0.06, 0.06, W, 8), edgeM, [0, y0, z1], [0, 0, Math.PI / 2], [1, 1, 1], false);
  // water surface
  const sea = makeSea({ w: W, d: D, segW: 60, segD: 24, amp: 0.55, shallow: 0x5fe3f0, mid: 0x3cc8f0, deep: 0x3cc8f0, opacity: 0.88 });
  sea.renderOrder = 5;
  scene.add(sea);
  const posF = frontG.attributes.position;
  const updateWater = (t) => {
    sea.userData.update(t, 0.55);
    for (let i = 0; i < posF.count; i++) {
      if (posF.getY(i) > (y0 + y1) / 2) posF.setY(i, waveH(posF.getX(i), z1, t, 0.55));
    }
    posF.needsUpdate = true;
  };

  // salt crystals (white cubes) inside the water
  const NSALT = 90;
  const saltIM = new THREE.InstancedMesh(new RoundedBoxGeometry(0.2, 0.2, 0.2, 1, 0.03), std(0xffffff, 0.35, { emissive: 0xdff6ff, emissiveIntensity: 0.3 }), NSALT);
  saltIM.castShadow = false;
  scene.add(saltIM);
  const Rs = rng(91);
  const saltInfo = [];
  for (let i = 0; i < NSALT; i++) saltInfo.push({ p: new THREE.Vector3(x0 + 0.35 + Rs() * (W - 0.7), y0 + 0.9 + Rs() * (y1 - y0 - 1.6), z0 + 0.4 + Rs() * (D - 0.8)), ph: Rs() * 6, r: [Rs() * 3, Rs() * 3, Rs() * 3] });
  // three "jumpers" that try to follow the vapour up but fall back
  const JUMP = [12, 57, 77];
  for (const [j, x] of [[12, -1.4], [57, 0.4], [77, 2.0]]) saltInfo[j].p.set(x, -1.6, 1.2);
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), P = new THREE.Vector3();
  const updateSalt = (t, { glowK = 0, jumpAt = 1e9, scale = 1 } = {}) => {
    for (let i = 0; i < NSALT; i++) {
      const s = saltInfo[i];
      P.copy(s.p);
      P.x += 0.12 * Math.sin(t * 1.3 + s.ph);
      P.y += 0.1 * Math.sin(t * 1.1 + s.ph * 1.7);
      const ji = JUMP.indexOf(i);
      if (ji >= 0) {
        const dt = t - jumpAt - ji * 0.15;
        if (dt > 0 && dt < 1.3) {
          // up to just under the surface, bump, fall back
          const up = dt < 0.45 ? smooth(dt / 0.45) : dt < 0.6 ? 1 : 1 - smooth((dt - 0.6) / 0.7);
          P.y = lerp(s.p.y, -0.35, up);
        }
      }
      E.set(s.r[0] + t * 0.4, s.r[1] + t * 0.3, s.r[2]);
      S.setScalar(scale * (1 + glowK * 0.35 * (0.5 + 0.5 * Math.sin(t * 6 + s.ph))));
      saltIM.setMatrixAt(i, M4.compose(P, Q.setFromEuler(E), S));
    }
    saltIM.instanceMatrix.needsUpdate = true;
    saltIM.material.emissiveIntensity = 0.3 + glowK * 0.6;
  };
  const jumperPos = (i) => {
    saltIM.getMatrixAt(JUMP[i], M4);
    return new THREE.Vector3().setFromMatrixPosition(M4);
  };

  // vapour: soft droplets rising from the surface to the cloud
  const NV = 240;
  const vPos = new Float32Array(NV * 3), vA = new Float32Array(NV), vSz = new Float32Array(NV);
  const Rv = rng(97);
  const vInfo = [];
  for (let i = 0; i < NV; i++) {
    vInfo.push({ x: x0 + 0.3 + Rv() * (W - 0.6), z: z0 + 0.3 + Rv() * (D - 0.6), ph: Rv(), sp: 0.8 + Rv() * 0.5, w: Rv() * 6 });
    vSz[i] = 0.6 + Rv() * 0.6;
  }
  const vg = new THREE.BufferGeometry();
  vg.setAttribute('position', new THREE.BufferAttribute(vPos, 3));
  vg.setAttribute('aA', new THREE.BufferAttribute(vA, 1));
  vg.setAttribute('aSz', new THREE.BufferAttribute(vSz, 1));
  const vMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `attribute float aA; attribute float aSz; varying float vA;
      void main(){ vA = aA; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSz * 520.0 / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p);
      float a = smoothstep(0.5, 0.15, d); float rim = smoothstep(0.32, 0.22, d) * smoothstep(0.1, 0.25, d);
      vec3 c = mix(vec3(0.45, 0.78, 1.0), vec3(0.95, 0.99, 1.0), 0.6 * rim); gl_FragColor = vec4(c, a * vA * 0.9); }`,
  });
  const vapour = new THREE.Points(vg, vMat);
  vapour.frustumCulled = false;
  vapour.renderOrder = 7;
  scene.add(vapour);
  const cloudAt = cloud.position;
  const updateVapour = (t, { on = 1, cycle = 3.2 } = {}) => {
    for (let i = 0; i < NV; i++) {
      const v = vInfo[i];
      const k = (v.ph + (t / cycle) * v.sp) % 1;
      const y = lerp(0.2, cloudAt.y - 0.4, k);
      const pull = smooth(clamp((k - 0.35) / 0.65));
      vPos[i * 3] = lerp(v.x + 0.25 * Math.sin(t * 2 + v.w + k * 6), cloudAt.x + (v.x - cloudAt.x) * 0.15, pull);
      vPos[i * 3 + 1] = y;
      vPos[i * 3 + 2] = lerp(v.z, cloudAt.z + 0.6, pull);
      vA[i] = on * clamp(k * 8) * (1 - smooth(clamp((k - 0.82) / 0.18)));
    }
    vg.attributes.position.needsUpdate = true;
    vg.attributes.aA.needsUpdate = true;
  };

  const sub = makeSub();
  sub.scale.setScalar(0.8);
  scene.add(sub);
  const aff = makeAffan();
  seatAffan(sub, aff);
  const update = (t) => {
    rays.rotation.z = t * 0.25;
    sun.scale.setScalar(1 + 0.03 * Math.sin(t * 3));
    updateWater(t);
    sub.userData.update(t);
  };
  return { scene, sun, cloud, sea, saltIM, updateSalt, jumperPos, vapour, updateVapour, sub, aff, update, back };
}

// ===================================================================== OUTRO
export function buildOutro() {
  const scene = new THREE.Scene();
  const bg = canvasTex(540, 960, (g) => {
    const gr = g.createRadialGradient(270, 380, 40, 270, 420, 700);
    gr.addColorStop(0, '#9ff0ff');
    gr.addColorStop(0.45, '#33b6ea');
    gr.addColorStop(1, '#1466c8');
    g.fillStyle = gr;
    g.fillRect(0, 0, 540, 960);
  });
  scene.background = bg;
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x6a7ab8, 1.5));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.4);
  key.position.set(3, 6, 8);
  shadowCfg(key, 5, 2048, 40);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfe0ff, 2.0);
  rim.position.set(-6, 5, -6);
  scene.add(rim);
  const aff = makeAffan();
  scene.add(aff.root);
  const crab = makeCrab();
  crab.scale.setScalar(0.62);
  scene.add(crab);
  const halo = glow(0xfff2b0, 9, 0.35);
  halo.position.set(0, 2.9, -2);
  scene.add(halo);
  return { scene, aff, crab };
}

export { RoundedBoxGeometry, glowTex };
