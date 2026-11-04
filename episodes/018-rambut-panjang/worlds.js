// Episode 018 sets: Affan's bedroom (the hook and the happy ending), the
// "hair forest" on a giant scalp with a cut-away of the skin that shows the
// follicles underneath, and the branded outro.
//
// Scalp world: the skin surface is y = 0 for z < 0. At z = 0 the skin is cut
// open like a slice of cake, so a camera in front of the cut (z > 0) sees the
// layers of skin, the follicles, the hair bulbs ("kilang sel") and the blood
// vessels below, and the hair forest growing above. Affan is ~3.7 units tall.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeSky, glow } from '../../shared/props.js';

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

function shadowCfg(light, size, map = 2048, far = 160) {
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

// ----------------------------------------------------------- Affan's long hair
// Extra shaggy hair parented to Affan's head: a long fringe that hangs over his
// glasses, hair over the ears and a longer nape. setShaggy(k) grows it 0..1.
export function addShaggy(aff) {
  const head = aff.parts.head;
  const mat = std(0x22160f, 0.45, { emissive: 0x0d0805, emissiveIntensity: 0.2 });
  const g = new THREE.Group();
  head.add(g);
  const geo = new THREE.SphereGeometry(1, 18, 12);
  geo.translate(0, -1, 0); // pivot at the top of each lock
  const locks = [];
  const lock = (x, y, z, len, w, rx, rz, d = 0.1) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, 0, rz);
    m.userData = { len, w, d };
    m.castShadow = true;
    g.add(m);
    locks.push(m);
  };
  // fringe: hangs down in front of the forehead and over the glasses
  for (let i = 0; i < 9; i++) {
    const x = -0.56 + i * 0.14;
    const z = 0.79 * Math.sqrt(Math.max(0.05, 1 - (x / 0.85) ** 2 - (0.42 / 0.833) ** 2)) + 0.14;
    lock(x, 0.55, z, 0.46 + 0.06 * Math.sin(i * 1.7) + (i > 2 && i < 7 ? 0.08 : 0), 0.11, -0.25, 0.28 - i * 0.03, 0.07);
  }
  // sides over the ears
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) lock(0.74 * s, 0.42 - i * 0.02, 0.28 - i * 0.22, 0.62, 0.16, 0.0, 0.1 * s, 0.12);
  // back of the head down to the nape
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.62 + (i / 6) * 0.76);
    lock(Math.cos(a) * 0.68, 0.5, Math.sin(a) * 0.62 - 0.08, 0.78, 0.2, 0.25 * Math.sin(a), 0.0, 0.14);
  }
  // fluffy crown on top
  const crown = [];
  for (const [x, y, z, s] of [[0, 0.82, 0.05, 0.42], [0.32, 0.76, -0.05, 0.34], [-0.33, 0.77, -0.02, 0.34], [0.05, 0.8, -0.35, 0.4]]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(s, 18, 12), mat);
    m.position.set(x, y, z);
    m.userData.s = s;
    g.add(m);
    crown.push(m);
  }
  const set = (k) => {
    g.visible = k > 0.01;
    for (const m of locks) {
      const { len, w, d } = m.userData;
      m.scale.set(w, (len / 2) * k + 0.001, d); // the lock geometry is 2 units long
    }
    for (const m of crown) m.scale.set(1.2, 0.5 * (0.6 + 0.4 * k), 1.1);
  };
  set(0);
  return set;
}

// ------------------------------------------------------------------ bedroom
function wallTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#dff1ff';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#cbe7ff';
    for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 26, h);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 18; i++) {
      const x = (i * 97) % w, y = (i * 151) % h;
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2, r = k % 2 ? 6 : 14;
        g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      g.fill();
    }
  }, true);
}
function floorTex() {
  return canvasTex(512, 512, (g, w, h) => {
    for (let y = 0; y < h; y += 64) {
      for (let x = (y / 64) % 2 ? -128 : 0; x < w; x += 256) {
        g.fillStyle = ['#c58a55', '#b97d4a', '#cf9562'][((x + y) / 64) % 3 | 0];
        g.fillRect(x, y, 254, 62);
      }
    }
  }, true);
}
function calendarTex() {
  return canvasTex(256, 300, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff5a3d';
    g.fillRect(0, 0, w, 70);
    g.fillStyle = '#fff';
    g.font = '800 54px "Baloo 2", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('NOV', w / 2, 38);
    g.fillStyle = '#17256b';
    g.font = '700 22px "Baloo 2", sans-serif';
    for (let i = 0; i < 30; i++) g.fillText(String(i + 1), 26 + (i % 7) * 34, 100 + Math.floor(i / 7) * 42);
    g.strokeStyle = '#2fb35a';
    g.lineWidth = 5;
    g.beginPath();
    g.arc(26 + 3 * 34, 100 + 42, 17, 0, Math.PI * 2);
    g.stroke();
  });
}

export function buildRoom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdff1ff);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a6a4a, 1.5));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.3);
  key.position.set(4, 9, 8);
  shadowCfg(key, 7, 2048, 40);
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xbfd8ff, 0.8);
  fill.position.set(-6, 4, 3);
  scene.add(fill);

  const ft = floorTex();
  ft.repeat.set(6, 6);
  add(scene, new THREE.PlaneGeometry(40, 40), std(0xffffff, 0.8, { map: ft }), [0, 0, 0], [-Math.PI / 2, 0, 0]).receiveShadow = true;
  const wt = wallTex();
  wt.repeat.set(4, 1);
  add(scene, new THREE.PlaneGeometry(40, 14), std(0xffffff, 0.95, { map: wt }), [0, 7, -5]);
  add(scene, new THREE.BoxGeometry(40, 0.4, 0.2), std(0xffffff, 0.6), [0, 0.2, -4.9]);

  // window with a sunny view
  const view = canvasTex(512, 384, (g, w, h) => {
    const s = g.createLinearGradient(0, 0, 0, h);
    s.addColorStop(0, '#6fbaf5');
    s.addColorStop(1, '#cfeaff');
    g.fillStyle = s;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#7cc35a';
    g.beginPath();
    g.ellipse(w * 0.3, h * 1.05, w * 0.6, h * 0.35, 0, 0, Math.PI * 2);
    g.ellipse(w * 0.85, h * 1.1, w * 0.5, h * 0.4, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff';
    for (const [x, y, r] of [[120, 90, 40], [160, 80, 50], [200, 95, 36], [380, 140, 30], [410, 130, 40]]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  });
  const win = new THREE.Group();
  win.position.set(-4.4, 5.4, -4.95);
  scene.add(win);
  add(win, new THREE.PlaneGeometry(4.2, 3.2), new THREE.MeshBasicMaterial({ map: view }), [0, 0, 0.01], [0, 0, 0], [1, 1, 1], false);
  const frame = std(0xffffff, 0.5);
  for (const [x, y, w, h] of [[0, 1.65, 4.6, 0.25], [0, -1.65, 4.8, 0.3], [-2.2, 0, 0.25, 3.5], [2.2, 0, 0.25, 3.5], [0, 0, 0.14, 3.2], [0, 0, 4.2, 0.14]]) add(win, new THREE.BoxGeometry(w, h, 0.2), frame, [x, y, 0.08]);
  // curtains
  for (const s of [-1, 1]) add(win, new THREE.BoxGeometry(0.9, 4.2, 0.15), std(0xff9470, 0.9), [2.7 * s, -0.2, 0.2]);

  // wall mirror with a soft sheen (Affan checks his hair in it)
  const mirror = new THREE.Group();
  mirror.position.set(4.0, 5.0, -4.9);
  scene.add(mirror);
  add(mirror, new RoundedBoxGeometry(2.6, 3.6, 0.16, 3, 0.2), std(0xffb34a, 0.5), [0, 0, 0]);
  const glass = canvasTex(256, 360, (g, w, h) => {
    const s = g.createLinearGradient(0, 0, w, h);
    s.addColorStop(0, '#e8f6ff');
    s.addColorStop(0.5, '#b7dcf5');
    s.addColorStop(1, '#d9efff');
    g.fillStyle = s;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.beginPath();
    g.moveTo(30, 120);
    g.lineTo(110, 30);
    g.lineTo(150, 30);
    g.lineTo(30, 170);
    g.fill();
  });
  add(mirror, new THREE.PlaneGeometry(2.2, 3.2), new THREE.MeshBasicMaterial({ map: glass }), [0, 0, 0.09], [0, 0, 0], [1, 1, 1], false);
  // calendar
  add(scene, new THREE.PlaneGeometry(1.5, 1.75), new THREE.MeshBasicMaterial({ map: calendarTex() }), [0.6, 6.9, -4.88], [0, 0, 0], [1, 1, 1], false);
  // bed corner with a blanket and pillow
  const bed = new THREE.Group();
  bed.position.set(-5.6, 0, -1.5);
  scene.add(bed);
  add(bed, new RoundedBoxGeometry(4, 1.0, 6, 3, 0.15), std(0x8a5a2b, 0.6), [0, 0.6, 0]);
  add(bed, new RoundedBoxGeometry(3.8, 0.6, 5.8, 3, 0.25), std(0x2f7bff, 0.85), [0, 1.35, 0.1]);
  add(bed, new RoundedBoxGeometry(2.4, 0.5, 1.2, 3, 0.22), std(0xffffff, 0.9), [0, 1.8, -2.2]);
  // shelf with toys
  add(scene, new THREE.BoxGeometry(3, 0.15, 0.8), std(0xffffff, 0.5), [-1.6, 3.6, -4.6]);
  add(scene, new THREE.BoxGeometry(0.6, 0.6, 0.6), std(0xff5a3d, 0.5), [-2.6, 4.0, -4.5]);
  add(scene, new THREE.SphereGeometry(0.35, 16, 12), std(0xffd84a, 0.4), [-1.6, 4.05, -4.5]);
  add(scene, new THREE.ConeGeometry(0.3, 0.8, 16), std(0x2fb35a, 0.5), [-0.7, 4.08, -4.5]);
  // rug
  add(scene, new THREE.CircleGeometry(3.2, 40), std(0xffd0a8, 1), [0, 0.02, 0.6], [-Math.PI / 2, 0, 0]).receiveShadow = true;

  const aff = makeAffan();
  scene.add(aff.root);
  const shaggy = addShaggy(aff);
  return { scene, aff, shaggy, mirror };
}

// ------------------------------------------------------------- scalp world
// Skin layers on the cut face (y in world units, top = 0).
export const SKIN = { epi: 1.4, dermis: 19, fat: 30 };

function skinTopTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#f2b48e';
    g.fillRect(0, 0, w, h);
    // flat skin cells: a soft polygon pattern
    const R = rng(4);
    for (let i = 0; i < 90; i++) {
      const x = R() * w, y = R() * h, r = 26 + R() * 22;
      g.fillStyle = ['rgba(255,214,186,0.5)', 'rgba(226,150,116,0.35)', 'rgba(250,196,160,0.5)'][i % 3];
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + R() * 0.4;
        g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8);
      }
      g.fill();
    }
    g.strokeStyle = 'rgba(190,110,80,0.28)';
    g.lineWidth = 3;
    for (let i = 0; i < 16; i++) {
      g.beginPath();
      g.moveTo(R() * w, R() * h);
      g.bezierCurveTo(R() * w, R() * h, R() * w, R() * h, R() * w, R() * h);
      g.stroke();
    }
  }, true);
}

// The cut face: epidermis band, pink dermis with wavy fibres, yellow fat cells.
// 512 px tall for SKIN.fat (30) units: 17 px per unit.
function cutTex() {
  const PX = 512 / SKIN.fat;
  return canvasTex(1024, 512, (g, w, h) => {
    const e = SKIN.epi * PX, d = SKIN.dermis * PX;
    g.fillStyle = '#e8916a';
    g.fillRect(0, 0, w, e);
    g.fillStyle = '#f4a3a0';
    g.fillRect(0, e, w, d - e);
    const R = rng(8);
    g.strokeStyle = 'rgba(255,214,214,0.7)';
    g.lineWidth = 5;
    for (let i = 0; i < 40; i++) {
      const y = e + 20 + R() * (d - e - 40), x = R() * w;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 1; k < 6; k++) g.lineTo(x + k * 30, y + Math.sin(k * 1.4 + i) * 8);
      g.stroke();
    }
    g.fillStyle = '#ffe08a';
    g.fillRect(0, d, w, h - d);
    for (let i = 0; i < 70; i++) {
      const x = R() * w, y = d + 10 + R() * (h - d - 10), r = 14 + R() * 12;
      g.fillStyle = R() > 0.5 ? '#ffd166' : '#ffeaa8';
      g.strokeStyle = '#e8b44a';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    g.fillStyle = 'rgba(160,60,50,0.35)';
    g.fillRect(0, e - 3, w, 6);
  }, true);
}

// Hair shaft texture: overlapping cuticle scales.
function hairTex() {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#3a2416';
    g.fillRect(0, 0, w, h);
    for (let y = -16; y < h; y += 24) {
      g.fillStyle = 'rgba(120,80,50,0.55)';
      g.beginPath();
      g.moveTo(0, y + 18);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + 18 + Math.sin(x * 0.2 + y) * 5);
      g.lineTo(w, y + 24);
      g.lineTo(0, y + 24);
      g.fill();
      g.strokeStyle = 'rgba(20,10,5,0.6)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, y + 24);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + 24 + Math.sin(x * 0.2 + y) * 5);
      g.stroke();
    }
  }, true);
}

function curve(points) {
  return new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
}

export function buildScalp() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffd9c4, 70, 330);
  scene.add(makeSky({ top: 0xffb08a, mid: 0xffcfae, horizon: 0xffe6d2, bottom: 0xf2b48e }));
  scene.add(new THREE.HemisphereLight(0xfff2ea, 0xb86a50, 1.4));
  const sunL = new THREE.DirectionalLight(0xfff0dc, 2.4);
  sunL.position.set(18, 40, 26);
  shadowCfg(sunL, 34, 2048, 160);
  scene.add(sunL, sunL.target);
  const fill = new THREE.DirectionalLight(0xffc0d0, 0.7);
  fill.position.set(-20, 10, 30);
  scene.add(fill);

  const R = rng(1818);
  // the skin slab: top surface at y = 0, cut face at z = 0
  const top = skinTopTex();
  top.repeat.set(30, 15);
  const cut = cutTex();
  cut.repeat.set(10, 1);
  const side = std(0xf4a3a0, 0.8);
  const slabMats = [side, side, std(0xffffff, 0.75, { map: top }), side, std(0xffffff, 0.8, { map: cut }), side];
  const slab = new THREE.Mesh(new THREE.BoxGeometry(500, SKIN.fat, 300), slabMats);
  slab.position.set(0, -SKIN.fat / 2, -150);
  slab.receiveShadow = true;
  scene.add(slab);
  // a pale floor far below the cut so it never shows a void
  add(scene, new THREE.PlaneGeometry(800, 400), std(0xf7c2a8, 1), [0, -SKIN.fat - 0.05, 150], [-Math.PI / 2, 0, 0]).receiveShadow = true;

  // cylinders run their texture v along the height; tubes run u along the length
  const hairMat = std(0xffffff, 0.45, { map: hairTex(), emissive: 0x120804, emissiveIntensity: 0.25 });
  hairMat.map.repeat.set(2, 6);
  const tubeTex = hairTex();
  tubeTex.center.set(0.5, 0.5);
  tubeTex.rotation = Math.PI / 2;
  tubeTex.repeat.set(2, 14);
  const hairTube = std(0xffffff, 0.45, { map: tubeTex, emissive: 0x120804, emissiveIntensity: 0.25 });
  const poreMat = std(0xb8664a, 0.9);
  const rimMat = std(0xe8916a, 0.85);
  // one hair strand rising out of a pore at (x, z) on the surface
  function strand(x, z, { r = 0.9, h = 70, lean = 0.12, seed = 0 } = {}) {
    const a = seed * 2.3;
    const c = curve([[0, -1, 0], [0, h * 0.3, 0], [Math.cos(a) * h * lean, h * 0.65, Math.sin(a) * h * lean], [Math.cos(a) * h * lean * 2.4, h, Math.sin(a) * h * lean * 2.4]]);
    const geo = new THREE.TubeGeometry(c, 24, r, 14, false);
    const m = new THREE.Mesh(geo, hairTube);
    m.position.set(x, 0, z);
    m.castShadow = true;
    scene.add(m);
    // pore: a raised rim and a dark ring around the base
    add(scene, new THREE.TorusGeometry(r * 1.55, r * 0.45, 10, 24), rimMat, [x, 0.05, z], [Math.PI / 2, 0, 0], [1, 1, 0.5]);
    add(scene, new THREE.CircleGeometry(r * 1.4, 24), poreMat, [x, 0.03, z], [-Math.PI / 2, 0, 0]);
    return m;
  }
  // the hair forest (kept off the cut edge, z < -6)
  const forest = [];
  for (let i = 0; i < 140; i++) {
    const x = (R() - 0.5) * 260, z = -8 - R() * 160;
    if (Math.abs(x) < 7 && z > -16) continue; // clear space near the hub
    forest.push(strand(x, z, { r: 0.8 + R() * 0.35, h: 55 + R() * 45, lean: 0.06 + R() * 0.12, seed: R() * 10 }));
  }
  // flakes / dust motes drifting in the light (animated by the episode)
  const motes = [];
  const moteMat = new THREE.MeshBasicMaterial({ color: 0xfff3e0, transparent: true, opacity: 0.7, depthWrite: false });
  for (let i = 0; i < 40; i++) {
    const m = add(scene, new THREE.SphereGeometry(0.12 + R() * 0.12, 8, 6), moteMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    m.userData = { x: (R() - 0.5) * 60, y: 2 + R() * 18, z: -R() * 40 + 6, s: R() * 10 };
    motes.push(m);
  }

  // -------------------------------------------------- follicles on the cut face
  // Each follicle sits half sunk into the cut face (centre at z = 0), so its
  // inside is visible. The hero follicle is at x = 0; a second one at x = 16 is
  // used for the "old hair falls out, new hair grows" beat.
  const pocketEdge = new THREE.MeshStandardMaterial({ color: 0xc8506a, roughness: 0.8 });
  const pocketFill = new THREE.MeshStandardMaterial({ color: 0xffd0d4, roughness: 0.8 });
  const bulbMat = std(0xffe06a, 0.35, { emissive: 0xff9a2a, emissiveIntensity: 0.35 });
  const papMat = std(0xff5a6a, 0.4, { emissive: 0x801010, emissiveIntensity: 0.35 });
  const DEPTH = 16; // bulb centre below the surface
  function follicle(x) {
    const f = new THREE.Group();
    f.position.set(x, 0, 0);
    scene.add(f);
    // the follicle cut lengthwise: a pale pocket with a dark rim, drawn on the cut face
    const by = -DEPTH - 0.8;
    add(f, new THREE.PlaneGeometry(4.6, DEPTH), pocketEdge, [0, -DEPTH / 2, 0.02], [0, 0, 0], [1, 1, 1], false);
    add(f, new THREE.CircleGeometry(3.4, 32), pocketEdge, [0, by, 0.02], [0, 0, 0], [1, 1, 1], false);
    add(f, new THREE.PlaneGeometry(3.6, DEPTH), pocketFill, [0, -DEPTH / 2 + 0.25, 0.05], [0, 0, 0], [1, 1, 1], false);
    add(f, new THREE.CircleGeometry(2.95, 32), pocketFill, [0, by, 0.05], [0, 0, 0], [1, 1, 1], false);
    // bulb (the "factory") with the papilla tucked in underneath
    const bulb = add(f, new THREE.SphereGeometry(2.5, 32, 24), bulbMat, [0, by, 0], [0, 0, 0], [1, 1.05, 0.8]);
    const pap = add(f, new THREE.SphereGeometry(1.2, 20, 14), papMat, [0, by - 1.3, 1.5], [0, 0, 0], [1.1, 0.8, 0.6]);
    const bulbGlow = glow(0xffd36b, 11, 0.0);
    bulbGlow.position.set(0, by + 0.2, 2.6);
    f.add(bulbGlow);
    // hair shaft inside: a cylinder from the bulb top up to `top` (set per frame)
    const shaftGeo = new THREE.CylinderGeometry(1, 1, 1, 18);
    shaftGeo.translate(0, 0.5, 0);
    const shaft = add(f, shaftGeo, hairMat, [0, -DEPTH + 1.2, 0], [0, 0, 0], [1.0, 40, 1.0]);
    // a second shaft for a new hair growing in after the old one falls out
    const fresh = add(f, shaftGeo, hairMat, [0, -DEPTH + 1.2, 0], [0, 0, 0], [0.9, 0.01, 0.9]);
    fresh.visible = false;
    return { f, bulb, pap, bulbGlow, shaft, fresh };
  }
  const hero = follicle(0);
  const second = follicle(17);
  for (const x of [-17, -34, 34, -52, 52]) {
    const o = follicle(x);
    o.shaft.scale.y = 60 + (x % 7);
  }
  // hair shaft pieces for the haircut beat: the hero hair above a cut line
  const cutY = 8;
  const topGeo = new THREE.CylinderGeometry(1, 1, 1, 18);
  topGeo.translate(0, 0.5, 0);
  const snipped = new THREE.Group(); // pivot at the cut line
  snipped.position.set(0, cutY, 0);
  scene.add(snipped);
  const snipTop = add(snipped, topGeo, hairMat, [0, 0, 0], [0, 0, 0], [1, 50, 1]);
  snipped.visible = false;

  // new cells travelling up the hero shaft (spheres, animated by the episode)
  const cellMat = [std(0x8fe39a, 0.4, { emissive: 0x2a7a30, emissiveIntensity: 0.4 }), std(0xb5f0a0, 0.4, { emissive: 0x3a8a30, emissiveIntensity: 0.4 })];
  const cells = [];
  for (let i = 0; i < 14; i++) {
    const c = add(scene, new THREE.SphereGeometry(0.55, 16, 12), cellMat[i % 2], [0, 0, 0], [0, 0, 0], [1, 0.8, 1], false);
    c.visible = false;
    cells.push(c);
  }
  // blood vessels: a loop that dips to the papilla, with red cells flowing
  const vesselMat = std(0xd8343a, 0.45, { emissive: 0x500808, emissiveIntensity: 0.3 });
  // runs along the bottom of the dermis, below every bulb, and loops up to the
  // hero follicle's papilla (so it never crosses a hair shaft)
  const vPath = curve([[-60, -21.2, 0.6], [-20, -21.2, 0.8], [-6, -21.0, 1.2], [-2.2, -DEPTH - 3.0, 1.9], [0, -DEPTH - 2.4, 2.1], [2.2, -DEPTH - 3.0, 1.9], [6, -21.0, 1.2], [20, -21.2, 0.8], [60, -21.2, 0.6]]);
  const vessel = add(scene, new THREE.TubeGeometry(vPath, 140, 0.8, 12, false), vesselMat, [0, 0, 0]);
  const rbcMat = std(0xff4a4a, 0.4, { emissive: 0x700a0a, emissiveIntensity: 0.4 });
  const rbc = [];
  const discGeo = new THREE.TorusGeometry(0.42, 0.26, 10, 20);
  for (let i = 0; i < 18; i++) {
    const c = add(scene, discGeo, rbcMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    rbc.push(c);
  }
  // nutrient sparkles that leave the vessel and enter the bulb
  const food = [];
  const foodMat = new THREE.MeshBasicMaterial({ color: 0xfff1a0 });
  for (let i = 0; i < 8; i++) {
    const c = add(scene, new THREE.OctahedronGeometry(0.4), foodMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    c.visible = false;
    food.push(c);
  }

  const aff = makeAffan();
  scene.add(aff.root);
  const shaggy = addShaggy(aff);
  const focus = (p) => {
    sunL.position.set(p.x + 18, 40, p.z + 26);
    sunL.target.position.set(p.x, 0, p.z - 6);
    sunL.target.updateMatrixWorld();
  };
  return { scene, aff, shaggy, focus, hero, second, snipped, snipTop, cutY, cells, vPath, rbc, food, motes, forest, vessel, DEPTH, sunL };
}

// ------------------------------------------------------------------ outro
export function buildOutro() {
  const scene = new THREE.Scene();
  const c = document.createElement('canvas');
  c.width = 540;
  c.height = 960;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(270, 380, 40, 270, 420, 700);
  gr.addColorStop(0, '#ffe0c8');
  gr.addColorStop(0.45, '#ff9f7a');
  gr.addColorStop(1, '#c2456a');
  g.fillStyle = gr;
  g.fillRect(0, 0, 540, 960);
  const bg = new THREE.CanvasTexture(c);
  bg.colorSpace = THREE.SRGBColorSpace;
  scene.background = bg;
  scene.add(new THREE.HemisphereLight(0xfff4ea, 0x8a6a6a, 1.5));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.4);
  key.position.set(3, 6, 8);
  shadowCfg(key, 5);
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe0f0, 2.0);
  rim.position.set(-6, 5, -6);
  scene.add(rim);
  const aff = makeAffan();
  scene.add(aff.root);
  const halo = glow(0xfff2b0, 9, 0.35);
  halo.position.set(0, 2.9, -2);
  scene.add(halo);
  // a little comb held in his left hand
  const held = new THREE.Group();
  const combM = std(0x2f7bff, 0.4);
  add(held, new RoundedBoxGeometry(0.7, 0.14, 0.06, 2, 0.03), combM, [0, 0.1, 0]);
  for (let i = 0; i < 9; i++) add(held, new THREE.BoxGeometry(0.035, 0.2, 0.05), combM, [-0.3 + i * 0.075, -0.05, 0]);
  held.rotation.set(0, 0, 0.5);
  scene.add(held);
  return { scene, aff, held };
}
