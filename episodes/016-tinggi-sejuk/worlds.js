// Episode 016 sets: a misty Cameron Highlands tea estate (the hook), a big
// mountain above a lowland town with Affan's hot-air balloon (the climb from
// warm ground to the cold summit), and the branded outro.
//
// Scale in the valley: 1 km of height = KM units. Affan is ~3.7 units tall,
// so heights are squashed for the camera, but the order of the stops is
// real: town (~0 km), tea terraces (~1.5 km), granite summit (~4.1 km).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, clamp, lerp } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeSky, makeTree, makeBush, makeHouse, glow, glowTex } from '../../shared/props.js';

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

function shadowCfg(light, size, map = 2048, far = 80) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  const c = light.shadow.camera;
  c.left = -size;
  c.right = size;
  c.top = size;
  c.bottom = -size;
  c.near = 0.5;
  c.far = far;
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.02;
}

function canvasTex(w, h, draw, repeat = false) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// A cylinder stretched between two points (ropes, poles).
function rod(parent, a, b, r, mat) {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  m.castShadow = true;
  parent.add(m);
  return m;
}

// Soft white mist / cloud puff (camera-facing sprite, normal blending).
const puffTex = canvasTex(256, 256, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(255,255,255,0.9)');
  r.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, w, w);
});
function puff(size, opacity = 0.6, color = 0xffffff) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color, transparent: true, opacity, depthWrite: false }));
  s.scale.set(size, size * 0.6, 1);
  return s;
}

function makeSun(parent, pos, size = 260) {
  const g = new THREE.Group();
  g.position.copy(pos);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(size * 0.16, 48), new THREE.MeshBasicMaterial({ color: 0xfff6d0, fog: false }));
  g.add(disc);
  const h1 = glow(0xfff0a8, size, 0.95);
  const h2 = glow(0xffd36b, size * 2.4, 0.45);
  g.add(h1, h2);
  parent.add(g);
  return g;
}

// ----------------------------------------------------------- hot-air balloon
const gores = () =>
  canvasTex(1024, 512, (g, w, h) => {
    const cols = ['#ff9a5a', '#ffd84a', '#1f2f6b', '#ffffff', '#ff9a5a', '#ffd84a', '#1f2f6b', '#ffffff'];
    const n = cols.length * 2;
    for (let i = 0; i < n; i++) {
      g.fillStyle = cols[i % cols.length];
      g.fillRect((i / n) * w, 0, w / n + 1, h);
    }
    // a peach band with stars near the equator
    g.fillStyle = '#ffb38a';
    g.fillRect(0, h * 0.4, w, h * 0.1);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 16; i++) {
      const x = (i + 0.5) * (w / 16), y = h * 0.45;
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 - Math.PI / 2, r = k % 2 ? 8 : 18;
        g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < n; i++) g.fillRect((i / n) * w - 1, 0, 3, h);
  });
const wicker = () =>
  canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#b77a3c';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      for (let x = (y / 16) % 2 ? 0 : 16; x < w; x += 32) {
        g.fillStyle = '#d39a56';
        g.beginPath();
        g.roundRect(x + 2, y + 2, 28, 12, 6);
        g.fill();
      }
    }
    g.fillStyle = 'rgba(80,40,10,0.35)';
    for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 3, h);
  }, true);

export const BASKET_RIM = 1.75;
export function makeBalloon() {
  const g = new THREE.Group();
  const wt = wicker();
  wt.repeat.set(2, 1);
  const wm = std(0xffffff, 0.9, { map: wt });
  const rimM = std(0x7a4a22, 0.8);
  const S = 1.2; // half width
  add(g, new THREE.BoxGeometry(S * 2, 0.12, S * 2), rimM, [0, 0.06, 0]);
  for (const [x, z, ry] of [[0, S, 0], [0, -S, 0], [S, 0, Math.PI / 2], [-S, 0, Math.PI / 2]]) add(g, new THREE.BoxGeometry(S * 2, BASKET_RIM, 0.1), wm, [x, BASKET_RIM / 2, z], [0, ry, 0]);
  for (const [x, z, ry] of [[0, S, 0], [0, -S, 0], [S, 0, Math.PI / 2], [-S, 0, Math.PI / 2]]) add(g, new RoundedBoxGeometry(S * 2 + 0.22, 0.2, 0.22, 2, 0.08), rimM, [x, BASKET_RIM, z], [0, ry, 0]);
  // ropes and burner frame
  const MOUTH = 5.0;
  const ropeM = std(0x5a3a1e, 0.8);
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) rod(g, new THREE.Vector3(x * S, BASKET_RIM, z * S), new THREE.Vector3(x * 0.85, MOUTH, z * 0.85), 0.035, ropeM);
  const metal = std(0x9aa3b5, 0.35, { metalness: 0.6 });
  add(g, new THREE.CylinderGeometry(0.32, 0.38, 0.4, 16), metal, [0, MOUTH - 0.45, 0]);
  add(g, new THREE.TorusGeometry(0.85, 0.05, 6, 24), metal, [0, MOUTH - 0.2, 0], [Math.PI / 2, 0, 0]);
  const flame = new THREE.Group();
  flame.position.set(0, MOUTH - 0.2, 0);
  const fc = add(flame, new THREE.ConeGeometry(0.25, 1.2, 12), new THREE.MeshBasicMaterial({ color: 0xffa23a, transparent: true, opacity: 0.85, fog: false }), [0, 0.6, 0], [0, 0, 0], [1, 1, 1], false);
  const fg = glow(0xffa040, 3.2, 0.9);
  fg.position.y = 0.6;
  flame.add(fg);
  flame.userData = { cone: fc, glow: fg };
  g.add(flame);
  // envelope (lathe teardrop)
  const prof = [[0.85, 0], [1.4, 0.9], [2.5, 2.2], [3.4, 3.5], [3.95, 4.8], [4.1, 5.8], [3.9, 6.8], [3.4, 7.7], [2.6, 8.4], [1.5, 8.95], [0.01, 9.2]];
  const curve = new THREE.CatmullRomCurve3(prof.map(([r, y]) => new THREE.Vector3(r, y, 0)));
  const pts = curve.getPoints(48).map((p) => new THREE.Vector2(Math.max(0.01, p.x), p.y));
  const env = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), std(0xffffff, 0.65, { map: gores(), side: THREE.DoubleSide }));
  env.position.y = MOUTH;
  env.castShadow = true;
  g.add(env);
  const aff = makeAffan();
  aff.root.position.set(0, 0.12, 0);
  g.add(aff.root);
  return { group: g, aff, flame, env, top: MOUTH + 9.2 };
}

// ------------------------------------------------------------------ valley
export const KM = 50;
export const PEAK = 4.095 * KM;
const R0 = 330; // base radius of the mountain
export const MTN = new THREE.Vector3(0, 0, -300);
const PROF = 1.45;
// mountain surface height at horizontal distance rho from its axis (no noise)
const shape = (rho) => (rho >= R0 ? 0 : PEAK * Math.pow(1 - rho / R0, PROF));
// horizontal distance of the mountain surface at height h
const rhoAt = (h) => R0 * (1 - Math.pow(clamp(h / PEAK), 1 / PROF));
const ridge = (x, z) => Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.038 - 0.4) + 0.6 * Math.sin(x * 0.11 - z * 0.07) + 0.35 * Math.sin(z * 0.19 + x * 0.05);
// distance from (x, z) to the segment a-b on the ground
function segDist(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const k = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz));
  return Math.hypot(x - ax - dx * k, z - az - dz * k);
}
// height of the land (mountain + plain) at world (x, z)
export function landY(x, z) {
  const rho = Math.hypot(x - MTN.x, z - MTN.z);
  if (rho > R0) return 0.4 * Math.sin(x * 0.05) * Math.cos(z * 0.04) * clamp((rho - R0 - 60) / 200);
  const base = shape(rho);
  const k = base / PEAK;
  return base + ridge(x, z) * 6 * Math.sin(Math.PI * Math.min(1, k * 1.15)) + (k > 0.85 ? Math.sin(x * 0.5) * Math.cos(z * 0.45) * 5 * (k - 0.85) * 6 : 0);
}

// Balloon flight line: straight up the near side of the mountain, a little
// out from the slope so the flank fills the background.
export function balloonPos(h) {
  const off = lerp(70, 40, clamp(h / PEAK));
  return new THREE.Vector3(lerp(0, -10, clamp(h / PEAK)), h, MTN.z + rhoAt(h) + off);
}

function mountainColor(y, slope, x, z) {
  const c = new THREE.Color();
  const H = y / KM; // km
  const n = 0.5 + 0.5 * Math.sin(x * 0.7) * Math.cos(z * 0.6);
  if (H < 0.25) c.setHex(0x69b84e).lerp(new THREE.Color(0x4f9e45), n * 0.5);
  else if (H < 1.15) c.setHex(0x2f7f3e).lerp(new THREE.Color(0x3c8f46), n);
  else if (H < 1.95) {
    // tea terraces: bright rows following the contours
    const row = Math.sin(y * 2.4) > 0.1;
    c.setHex(row ? 0x86d14e : 0x4f9a3c);
  } else if (H < 3.0) c.setHex(0x3d7a48).lerp(new THREE.Color(0x56885a), n);
  else if (H < 3.55) c.setHex(0x8a9877).lerp(new THREE.Color(0x9aa38a), n);
  else if (H < 3.95) c.setHex(0x9c9ca4).lerp(new THREE.Color(0xb4b2b8), n);
  else c.setHex(0xe9eef6);
  if (slope > 0.9 && H > 2.8) c.lerp(new THREE.Color(0x8d8d96), 0.5);
  return c;
}

export function buildValley() {
  const scene = new THREE.Scene();
  const fog = new THREE.Fog(0xcfe6ff, 160, 1700);
  scene.fog = fog;
  const sky = makeSky({ top: 0x2f7fe0, mid: 0x5aa8ff, horizon: 0xd6ecff, bottom: 0x9ccf7a });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xeef6ff, 0x5a8a4a, 1.45));
  const sunL = new THREE.DirectionalLight(0xfff0d0, 2.6);
  sunL.position.set(20, 30, 14);
  shadowCfg(sunL, 14, 2048, 120);
  scene.add(sunL, sunL.target);
  const sun = makeSun(scene, new THREE.Vector3(700, 900, -700));

  // mountain + plain as one displaced plane with vertex colours
  const SIZE = 2600, SEG = 400;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i) + MTN.z + 300;
    p.setXYZ(i, x, landY(x, z), z);
  }
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const c = mountainColor(p.getY(i), 1 - nrm.getY(i), p.getX(i), p.getZ(i));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const land = new THREE.Mesh(geo, std(0xffffff, 0.95, { vertexColors: true, flatShading: false }));
  land.receiveShadow = true;
  scene.add(land);

  const R = rng(16);
  // the lowland town around the launch spot
  const L0 = balloonPos(0);
  const town = new THREE.Group();
  scene.add(town);
  for (let i = 0; i < 70; i++) {
    const x = (R() - 0.5) * 220, z = L0.z - 20 + R() * 160;
    if (Math.abs(x - L0.x) < 12 && Math.abs(z - L0.z) < 14) continue;
    if (segDist(x, z, L0.x + 36, L0.z + 22, L0.x, L0.z - 40) < 24) continue; // keep the camera's view clear
    if (Math.hypot(x - MTN.x, z - MTN.z) < R0 + 8) continue;
    const h = makeHouse(R, { scale: 1.3 + R() * 0.5, toy: true, walls: [0xfff1d6, 0xffd9c2, 0xd6ecf5, 0xffe9a8], roofs: [0xe0603e, 0x7a5ab0, 0x3f7fb0, 0xd44f45] });
    h.position.set(x, 0, z);
    h.rotation.y = R() * Math.PI;
    town.add(h);
  }
  // a few city blocks further out (Kuala Lumpur feel)
  for (let i = 0; i < 22; i++) {
    const x = (R() - 0.5) * 420, z = L0.z + 120 + R() * 200;
    const hh = 12 + R() * 40;
    const b = add(town, new RoundedBoxGeometry(8 + R() * 6, hh, 8 + R() * 6, 2, 0.6), std([0xdfe8f2, 0xc9d8ea, 0xf2e6d8, 0xbfd3e6][i % 4], 0.5), [x, hh / 2, z]);
    b.castShadow = false;
  }
  for (let i = 0; i < 140; i++) {
    const x = (R() - 0.5) * 300, z = L0.z - 30 + R() * 200;
    if (Math.abs(x - L0.x) < 10 && Math.abs(z - L0.z) < 12) continue;
    if (segDist(x, z, L0.x + 36, L0.z + 22, L0.x, L0.z - 40) < 18) continue;
    if (Math.hypot(x - MTN.x, z - MTN.z) < R0 + 4) continue;
    const o = R() < 0.8 ? makeTree(R, { scale: 1.6 + R() * 0.8, leaf: [0x5fbf4a, 0x4fae5a, 0x7ccf4a], trunk: 0x8a5a35, toy: true }) : makeBush(R, { scale: 2, color: 0x4fae5a });
    o.position.set(x, 0, z);
    town.add(o);
  }
  // launch field
  add(scene, new THREE.CircleGeometry(16, 40), std(0x8fd16a, 1), [L0.x, 0.05, L0.z], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;

  // trees climbing the lower slopes (rainforest)
  for (let i = 0; i < 260; i++) {
    const a = -Math.PI / 2 + (R() - 0.5) * 2.2;
    const h = R() * 1.1 * KM;
    const rho = rhoAt(h) + 2;
    const x = MTN.x + Math.cos(a) * rho, z = MTN.z - Math.sin(a) * rho;
    const t = makeTree(R, { scale: 2.4 + R() * 1.2, leaf: [0x2f7f3e, 0x3c8f46, 0x24703a], trunk: 0x6b4a32, toy: true });
    t.position.set(x, landY(x, z) - 1.2, z);
    scene.add(t);
  }
  // mist around the tea band, clouds higher up
  const mists = new THREE.Group();
  scene.add(mists);
  for (let i = 0; i < 40; i++) {
    const h = (1.3 + R() * 0.6) * KM;
    const a = -Math.PI / 2 + (R() - 0.5) * 2.4;
    const rho = rhoAt(h) + 10 + R() * 30;
    const m = puff(40 + R() * 40, 0.35);
    m.position.set(MTN.x + Math.cos(a) * rho, h, MTN.z - Math.sin(a) * rho);
    mists.add(m);
  }
  const clouds = new THREE.Group();
  scene.add(clouds);
  for (let i = 0; i < 46; i++) {
    const h = (2.2 + R() * 0.9) * KM;
    const c = puff(60 + R() * 70, 0.75);
    const a = R() * Math.PI * 2;
    const rho = rhoAt(h) + 40 + R() * 420;
    c.position.set(MTN.x + Math.cos(a) * rho, h, MTN.z + Math.sin(a) * rho);
    clouds.add(c);
  }
  // little frost sparkles near the summit
  const frost = new THREE.Group();
  scene.add(frost);
  for (let i = 0; i < 30; i++) {
    const f = glow(0xffffff, 3 + R() * 3, 0.6);
    const h = (3.85 + R() * 0.22) * KM;
    const a = -Math.PI / 2 + (R() - 0.5) * 1.6;
    const rho = rhoAt(h) + 1;
    f.position.set(MTN.x + Math.cos(a) * rho, 0, MTN.z - Math.sin(a) * rho);
    f.position.y = landY(f.position.x, f.position.z) + 1;
    frost.add(f);
  }

  // warm-ground glow (opacity driven per frame)
  const heat = new THREE.Group();
  scene.add(heat);
  const heatM = new THREE.MeshBasicMaterial({ map: glowTex, color: 0xff3a10, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  for (let i = 0; i < 14; i++) {
    const m = add(heat, new THREE.CircleGeometry(30 + R() * 26, 32), heatM, [L0.x - 40 + (i % 5) * 26 + R() * 10, 0.3 + i * 0.01, L0.z - 10 + Math.floor(i / 5) * 40 + R() * 10], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
    m.renderOrder = 2;
  }
  heat.userData.mat = heatM;

  const bal = makeBalloon();
  scene.add(bal.group);

  // sky gets deeper blue and the light cooler as we climb
  const skyLow = { top: new THREE.Color(0x2f7fe0), mid: new THREE.Color(0x5aa8ff), horizon: new THREE.Color(0xd6ecff) };
  const skyHigh = { top: new THREE.Color(0x0f3fae), mid: new THREE.Color(0x2c6fe0), horizon: new THREE.Color(0xbcd8ff) };
  function setAlt(h) {
    const k = clamp(h / PEAK);
    for (const key of ['top', 'mid', 'horizon']) sky.material.uniforms[key].value.copy(skyLow[key]).lerp(skyHigh[key], k);
    fog.color.copy(new THREE.Color(0xcfe6ff)).lerp(new THREE.Color(0xc4dcff), k);
    sunL.color.copy(new THREE.Color(0xfff0d0)).lerp(new THREE.Color(0xeaf2ff), k);
  }
  // keep the shadow camera on the balloon
  function follow(pos) {
    sunL.target.position.copy(pos);
    sunL.position.copy(pos).add(new THREE.Vector3(20, 30, 14));
  }
  return { scene, sky, sun, sunL, bal, aff: bal.aff, town, setAlt, follow, mists, clouds, frost, heat };
}

// -------------------------------------------------------- tea estate (hook)
const hill = (x, z) => 2.2 * Math.sin(x * 0.07 + 0.5) * Math.cos(z * 0.05) + 1.4 * Math.sin(z * 0.11 + x * 0.03) - z * 0.12;
export function teaY(x, z) {
  const d = Math.hypot(x, z);
  const k = clamp((d - 3.5) / 8);
  return hill(x, z) * k + hill(0, 0) * (1 - k) - hill(0, 0);
}
const signTex = () =>
  canvasTex(1024, 420, (g, w, h) => {
    g.fillStyle = '#2f6b3a';
    g.beginPath();
    g.roundRect(8, 8, w - 16, h - 16, 40);
    g.fill();
    g.strokeStyle = '#fff6dc';
    g.lineWidth = 16;
    g.stroke();
    g.fillStyle = '#fff6dc';
    g.textAlign = 'center';
    g.font = '800 116px "Baloo 2"';
    g.fillText('CAMERON', w / 2, 160);
    g.fillText('HIGHLANDS', w / 2, 275);
    g.font = '700 74px "Baloo 2"';
    g.fillStyle = '#ffd84a';
    g.fillText('± 1,500 m', w / 2, 370);
  });

export function buildTea() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe4eef0, 18, 150);
  const sky = makeSky({ top: 0x4a90e0, mid: 0x86bdf0, horizon: 0xe6f0f2, bottom: 0xa8cf8a });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xf2f8ff, 0x5f8f4a, 1.4));
  const sunL = new THREE.DirectionalLight(0xfff2da, 2.2);
  sunL.position.set(7, 14, 8);
  shadowCfg(sunL, 9, 2048, 60);
  scene.add(sunL, sunL.target);
  const sun = makeSun(scene, new THREE.Vector3(230, 210, -620), 200);

  const SIZE = 260, SEG = 200;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, teaY(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, std(0x6a4a30, 1));
  ground.receiveShadow = true;
  scene.add(ground);
  // a little red-earth path where Affan stands
  add(scene, new THREE.CircleGeometry(3.6, 32), std(0xb0703f, 1), [0, 0.03, 0], [-Math.PI / 2, 0, 0], [1, 1.6, 1], false).receiveShadow = true;

  // tea bushes in contour rows
  const R = rng(7);
  const bushGeo = new THREE.SphereGeometry(0.75, 14, 10);
  const mat = std(0xffffff, 0.85);
  const MAX = 14000;
  const inst = new THREE.InstancedMesh(bushGeo, mat, MAX);
  inst.castShadow = true;
  inst.receiveShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  const greens = [0x5fae3a, 0x6fc044, 0x4f9e34, 0x7acb4c].map((c) => new THREE.Color(c));
  let n = 0;
  for (let row = -60; row <= 20 && n < MAX; row++) {
    const z0 = row * 1.9;
    for (let x = -64; x <= 64 && n < MAX; x += 1.05) {
      const z = z0 + Math.sin(x * 0.08 + row) * 1.2;
      if (Math.hypot(x * 0.9, z * 0.62) < 4.6) continue;
      if (Math.hypot(x + 4.2, z - 0.5) < 1.6) continue; // signpost
      ps.set(x + (R() - 0.5) * 0.2, teaY(x, z) + 0.35, z);
      sc.set(1 + R() * 0.15, 0.62 + R() * 0.1, 1.05);
      m4.compose(ps, q, sc);
      inst.setMatrixAt(n, m4);
      inst.setColorAt(n, greens[Math.floor(R() * 4)]);
      n++;
    }
  }
  inst.count = n;
  scene.add(inst);
  // shade trees + distant blue hills
  for (let i = 0; i < 26; i++) {
    const x = (R() - 0.5) * 160, z = -20 - R() * 100;
    const t = makeTree(R, { scale: 1.4 + R(), leaf: [0x3c8f46, 0x2f7f3e], trunk: 0x6b4a32, toy: true });
    t.position.set(x, teaY(x, z), z);
    scene.add(t);
  }
  for (let i = 0; i < 24; i++) add(scene, new THREE.SphereGeometry(40 + R() * 40, 20, 12), std([0x7fa8c8, 0x8fb5d0, 0x6f9bbf][i % 3], 1), [-400 + i * 36, -10, -230 - R() * 80], [0, 0, 0], [1.6, 0.7, 1], false);
  // signpost
  const sign = new THREE.Group();
  sign.position.set(-4.2, 0, 0.5);
  const wood = std(0x7a4e2c, 0.85);
  add(sign, new THREE.BoxGeometry(0.22, 3.6, 0.22), wood, [-1.3, 1.8, 0]);
  add(sign, new THREE.BoxGeometry(0.22, 3.6, 0.22), wood, [1.3, 1.8, 0]);
  add(sign, new THREE.BoxGeometry(3.2, 1.32, 0.12), new THREE.MeshStandardMaterial({ map: signTex(), roughness: 0.8 }), [0, 3.0, 0.1]);
  sign.rotation.y = 0.35;
  scene.add(sign);
  // mist banks
  const mists = new THREE.Group();
  scene.add(mists);
  for (let i = 0; i < 26; i++) {
    const m = puff(18 + R() * 26, 0.5);
    m.position.set((R() - 0.5) * 120, 2 + R() * 6, -14 - R() * 70);
    m.userData.v = 0.3 + R() * 0.6;
    m.userData.x = m.position.x;
    mists.add(m);
  }
  // Affan's cold breath puffs
  const breath = [];
  for (let i = 0; i < 4; i++) {
    const b = puff(0.6, 0.0, 0xf4f8ff);
    scene.add(b);
    breath.push(b);
  }
  const aff = makeAffan();
  scene.add(aff.root);
  return { scene, sky, sun, aff, mists, breath, sign };
}

// ------------------------------------------------------------------ outro
export function buildOutro() {
  const scene = new THREE.Scene();
  const c = document.createElement('canvas');
  c.width = 540;
  c.height = 960;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(270, 380, 40, 270, 420, 700);
  gr.addColorStop(0, '#8fd0ff');
  gr.addColorStop(0.45, '#3f9cf2');
  gr.addColorStop(1, '#1a5fcf');
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
  return { scene, aff };
}

export { glowTex };
