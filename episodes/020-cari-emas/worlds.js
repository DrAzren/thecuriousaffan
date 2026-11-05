// Episode 020 sets: Affan's living room (mama's gold ring), the underground
// cross-section with gold veins, the jungle river with a wooden dulang (and a
// magnified pan rig), the open-pit mine with crusher and a car-vs-rock balance,
// four Olympic pools filled with gold, a science studio (rust vs gold, many
// people vs a little gold) and the branded outro stage.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeSky, makeTree, makeBush, makeCar, glow } from '../../shared/props.js';

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

// Every gold surface shares these materials; episode.js gives them an
// environment map so the metal reflects like real gold.
const GOLDS = [];
export function goldMat({ rough = 0.22, emissive = 0x4a2c00, ei = 0.55, color = 0xffc23a } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: rough, emissive, emissiveIntensity: ei, envMapIntensity: 1.25 });
  GOLDS.push(m);
  return m;
}
export function setGoldEnv(tex) {
  for (const m of GOLDS) {
    m.envMap = tex;
    m.needsUpdate = true;
  }
}

function shadowCfg(light, size, map = 2048) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  const c = light.shadow.camera;
  c.left = -size;
  c.right = size;
  c.top = size;
  c.bottom = -size;
  c.near = 1;
  c.far = 300;
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.02;
}

function tex(w, h, draw, rx = 1, ry = rx) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 8;
  return t;
}

const grassTex = (base, light, dark, seed, rep) =>
  tex(512, 512, (g, s) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    const R = rng(seed);
    for (let i = 0; i < 2600; i++) {
      const x = R() * s, y = R() * s, l = 6 + R() * 14;
      g.strokeStyle = R() < 0.5 ? light : dark;
      g.globalAlpha = 0.25 + R() * 0.35;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (R() - 0.5) * 6, y - l);
      g.stroke();
    }
    g.globalAlpha = 1;
  }, rep);

const speckTex = (base, cols, seed, rep, n = 1800, r0 = 2, r1 = 6) =>
  tex(512, 512, (g, s) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    const R = rng(seed);
    for (let i = 0; i < n; i++) {
      g.fillStyle = cols[Math.floor(R() * cols.length)];
      g.globalAlpha = 0.35 + R() * 0.5;
      g.beginPath();
      g.ellipse(R() * s, R() * s, r0 + R() * (r1 - r0), r0 + R() * (r1 - r0) * 0.7, R() * 3, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }, rep);

export function rock(R, s, color, detail = 2) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 0.82 + R() * 0.32;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, std(color, 0.85));
  m.scale.set(s, s * 0.7, s * 0.9);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Lumpy gold nugget geometry (shared by veins, river flakes and the bean).
function nuggetGeo(R, detail = 1) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 0.7 + R() * 0.45;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

// Hard hat that sits on Affan's head (child of parts.head).
export function addHardHat(aff, color = 0xffc928) {
  const hat = new THREE.Group();
  const m = std(color, 0.35, { emissive: 0x3a2a00, emissiveIntensity: 0.25 });
  add(hat, new THREE.SphereGeometry(0.98, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), m, [0, 0, 0], [0, 0, 0], [1, 0.82, 1.02]);
  add(hat, new THREE.CylinderGeometry(1.12, 1.15, 0.08, 40), m, [0, 0.02, 0.06]);
  add(hat, new RoundedBoxGeometry(0.22, 0.5, 1.6, 2, 0.08), m, [0, 0.55, 0.02], [Math.PI / 2 - 0.2, 0, Math.PI / 2], [1, 1, 1]);
  const lamp = add(hat, new THREE.CylinderGeometry(0.16, 0.16, 0.12, 20), std(0xfff6c8, 0.2, { emissive: 0xfff0a0, emissiveIntensity: 1.2 }), [0, 0.45, 0.88], [Math.PI / 2 - 0.4, 0, 0]);
  lamp.castShadow = false;
  hat.position.set(0, 0.5, -0.02);
  hat.rotation.x = -0.08;
  aff.parts.head.add(hat);
  return hat;
}

// Wooden gold pan (dulang): a wide shallow cone. Bottom at y = 0, rim at y = depth.
export function makeDulang(R0 = 0.62, depth = 0.17) {
  const g = new THREE.Group();
  const prof = [new THREE.Vector2(0, 0), new THREE.Vector2(R0 * 0.18, 0.004), new THREE.Vector2(R0 * 0.96, depth), new THREE.Vector2(R0, depth * 1.06), new THREE.Vector2(R0 * 1.0, depth * 1.12), new THREE.Vector2(R0 * 0.94, depth * 1.1), new THREE.Vector2(R0 * 0.16, depth * 0.1 + 0.03), new THREE.Vector2(0, 0.03)];
  const wood = tex(512, 64, (c, w, h) => {
    c.fillStyle = '#a5672f';
    c.fillRect(0, 0, w, h);
    const R = rng(5);
    for (let i = 0; i < 60; i++) {
      c.strokeStyle = R() < 0.5 ? 'rgba(80,40,15,0.35)' : 'rgba(210,150,90,0.3)';
      c.lineWidth = 1 + R() * 3;
      const y = R() * h;
      c.beginPath();
      c.moveTo(0, y);
      c.bezierCurveTo(w * 0.3, y + (R() - 0.5) * 10, w * 0.7, y + (R() - 0.5) * 10, w, y);
      c.stroke();
    }
  }, 4, 1);
  const m = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), std(0xffffff, 0.75, { map: wood, side: THREE.DoubleSide }));
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  g.userData = { R: R0, depth };
  return g;
}

// ------------------------------------------------------------------- home
export const RING_POS = new THREE.Vector3(1.55, 2.1, -0.47);
export function buildHome() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf6e3c8);
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x9a7a5a, 1.25));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.4);
  key.position.set(-5, 9, -7);
  shadowCfg(key, 7);
  scene.add(key, key.target);
  const win = new THREE.DirectionalLight(0xcfe8ff, 1.2);
  win.position.set(4, 5, 8);
  scene.add(win);
  // floor: warm planks
  const planks = tex(512, 512, (g, s) => {
    g.fillStyle = '#c98f5a';
    g.fillRect(0, 0, s, s);
    const R = rng(3);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = ['#c48752', '#cf9862', '#bd7f4c'][i % 3];
      g.fillRect(0, i * 64, s, 62);
      g.fillStyle = 'rgba(90,50,20,0.45)';
      g.fillRect(0, i * 64 + 62, s, 2);
      g.fillRect(((i * 197) % 400) + 40, i * 64, 2, 64);
      for (let k = 0; k < 14; k++) {
        g.strokeStyle = 'rgba(120,70,30,0.18)';
        g.beginPath();
        const y = i * 64 + R() * 60;
        g.moveTo(0, y);
        g.lineTo(s, y + (R() - 0.5) * 6);
        g.stroke();
      }
    }
  }, 6);
  const floor = add(scene, new THREE.PlaneGeometry(60, 60), std(0xffffff, 0.75, { map: planks }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  floor.receiveShadow = true;
  // rug
  const rug = tex(512, 512, (g, s) => {
    g.fillStyle = '#3f7fc8';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#ffd36b';
    g.lineWidth = 18;
    g.strokeRect(30, 30, s - 60, s - 60);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 6;
    g.strokeRect(62, 62, s - 124, s - 124);
    g.fillStyle = '#ffd36b';
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
      g.beginPath();
      g.arc(110 + i * 58, 110 + j * 58, 9, 0, Math.PI * 2);
      g.fill();
    }
  });
  const rg = add(scene, new THREE.CircleGeometry(3.4, 48), std(0xffffff, 0.95, { map: rug }), [0, 0.012, 0.2], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  rg.receiveShadow = true;
  // back wall with window, frame and shelf
  const wallMat = std(0xf3d9b4, 0.9);
  add(scene, new THREE.PlaneGeometry(60, 20), wallMat, [0, 10, 4.2], [0, Math.PI, 0], [1, 1, 1], false).receiveShadow = true;
  add(scene, new THREE.BoxGeometry(60, 0.5, 0.12), std(0xb5794a, 0.7), [0, 0.25, 4.14]);
  const skyT = tex(256, 256, (g, s) => {
    const gr = g.createLinearGradient(0, 0, 0, s);
    gr.addColorStop(0, '#4f9cf0');
    gr.addColorStop(1, '#cfeaff');
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    for (const [x, y, r] of [[60, 80, 26], [90, 70, 32], [125, 84, 24], [190, 140, 20], [214, 132, 26]]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#5fb24e';
    g.fillRect(0, s * 0.82, s, s * 0.18);
  });
  const wx = 3.2;
  add(scene, new THREE.PlaneGeometry(3.2, 2.6), new THREE.MeshBasicMaterial({ map: skyT }), [wx, 3.9, 4.12], [0, Math.PI, 0], [1, 1, 1], false);
  const frameM = std(0xffffff, 0.6);
  for (const [x, y, w, h] of [[wx, 5.25, 3.5, 0.18], [wx, 2.55, 3.5, 0.24], [wx - 1.68, 3.9, 0.18, 2.8], [wx + 1.68, 3.9, 0.18, 2.8], [wx, 3.9, 0.1, 2.6]]) add(scene, new THREE.BoxGeometry(w, h, 0.14), frameM, [x, y, 4.1]);
  // curtains
  for (const s of [-1, 1]) add(scene, new RoundedBoxGeometry(0.7, 3.4, 0.16, 2, 0.06), std(0xff9a7a, 0.9), [wx + s * 2.1, 3.85, 4.0]);
  // picture frame (Affan's family drawing)
  const pic = tex(256, 200, (g, w, h) => {
    g.fillStyle = '#fffaf0';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd84a';
    g.beginPath();
    g.arc(200, 45, 24, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#7fd06a';
    g.fillRect(0, 150, w, 50);
    g.strokeStyle = '#17256b';
    g.lineWidth = 5;
    for (const [x, hh] of [[70, 80], [120, 95], [165, 55]]) {
      g.beginPath();
      g.arc(x, 150 - hh, 14, 0, Math.PI * 2);
      g.moveTo(x, 150 - hh + 14);
      g.lineTo(x, 150);
      g.stroke();
    }
  });
  add(scene, new THREE.BoxGeometry(2.1, 1.7, 0.1), std(0xb5794a, 0.6), [-3.4, 4.3, 4.12]);
  add(scene, new THREE.PlaneGeometry(1.8, 1.4), std(0xffffff, 0.9, { map: pic }), [-3.4, 4.3, 4.06], [0, Math.PI, 0], [1, 1, 1], false);
  // potted plant
  add(scene, new THREE.CylinderGeometry(0.45, 0.35, 0.8, 20), std(0xe0784a, 0.7), [5.4, 0.4, 3.2]);
  const R = rng(20);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    add(scene, new THREE.SphereGeometry(0.42, 12, 8), std([0x3f9a40, 0x4fb84a, 0x2f7d38][i % 3], 0.8), [5.4 + Math.cos(a) * 0.4, 1.3 + R() * 0.9, 3.2 + Math.sin(a) * 0.4], [0, a, 0.5], [0.45, 1.4, 0.2]);
  }
  // low wooden table with mama's jewellery box
  const tableM = std(0x9a5b2f, 0.55);
  const tx = 1.55, tz = -0.55;
  add(scene, new RoundedBoxGeometry(2.4, 0.16, 1.5, 3, 0.06), tableM, [tx, 1.55, tz]);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(scene, new THREE.CylinderGeometry(0.07, 0.06, 1.5, 10), tableM, [tx + dx * 1.05, 0.75, tz + dz * 0.6]);
  const box = new THREE.Group();
  box.position.set(tx, 1.63, tz + 0.08);
  scene.add(box);
  const velvet = std(0xc0283f, 0.85);
  add(box, new RoundedBoxGeometry(0.8, 0.28, 0.62, 3, 0.05), velvet, [0, 0.14, 0]);
  add(box, new RoundedBoxGeometry(0.66, 0.06, 0.48, 2, 0.03), std(0x7a1028, 0.95), [0, 0.27, 0]);
  const lid = new THREE.Group();
  lid.position.set(0, 0.28, 0.3);
  box.add(lid);
  add(lid, new RoundedBoxGeometry(0.8, 0.2, 0.62, 3, 0.05), velvet, [0, 0.06, -0.31]);
  lid.rotation.x = 1.9;
  add(box, new THREE.BoxGeometry(0.08, 0.02, 0.08), goldMat(), [0, 0.2, -0.32]);
  // the ring: gold band + a sparkling stone
  const ring = new THREE.Group();
  ring.position.copy(RING_POS);
  scene.add(ring);
  add(ring, new THREE.TorusGeometry(0.17, 0.048, 24, 64), goldMat({ rough: 0.16 }), [0, 0, 0]);
  const gem = add(ring, new THREE.OctahedronGeometry(0.075, 0), new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.02, transmission: 0.2, emissive: 0xbfe8ff, emissiveIntensity: 0.5 }), [0, 0.22, 0], [0, 0, 0], [1, 1.3, 1]);
  gem.castShadow = false;
  const ringGlow = glow(0xffe28a, 1.4, 0.0);
  ringGlow.position.copy(RING_POS);
  scene.add(ringGlow);
  const aff = makeAffan();
  scene.add(aff.root);
  return { scene, aff, ring, ringGlow, box };
}

// ------------------------------------------------------------ underground
// A giant cut-away slice of the earth. The cut face is the plane z = 0 and
// faces the camera (-z); the surface is y = 0. Gold sits in quartz veins deep down.
export const VEIN = [[-2.4, -17.2], [-1.2, -18.2], [0.4, -17.6], [1.6, -18.8], [2.6, -18.0], [-0.4, -19.4], [0.9, -16.6]];
export function buildUnderground() {
  const scene = new THREE.Scene();
  const sky = makeSky({ top: 0x2f7fe0, mid: 0x6fb6f2, horizon: 0xd8efff, bottom: 0x7cbf62 });
  scene.add(sky);
  scene.fog = new THREE.Fog(0x0e1630, 40, 140);
  scene.add(new THREE.HemisphereLight(0xe6f2ff, 0x5a4030, 1.3));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.2);
  key.position.set(-6, 10, -14);
  shadowCfg(key, 14);
  scene.add(key, key.target);
  const W0 = 40, D = 30;
  const face = tex(1024, 768, (g, w, h) => {
    const ppu = h / D; // pixels per unit, face spans y 0..-30
    const band = (y0, y1, c) => {
      g.fillStyle = c;
      g.fillRect(0, y0 * ppu, w, (y1 - y0) * ppu + 1);
    };
    band(0, 0.7, '#4fa244');
    band(0.7, 4.5, '#8a5a34');
    band(4.5, 9.5, '#b9733f');
    band(9.5, 14, '#8f6a52');
    band(14, 30, '#5e5470');
    // wavy layer edges
    const R = rng(8);
    for (const [y, c] of [[4.5, '#6f4527'], [9.5, '#9a5e33'], [14, '#4a4258']]) {
      g.strokeStyle = c;
      g.lineWidth = 10;
      g.beginPath();
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y * ppu + Math.sin(x * 0.02 + y) * 8);
      g.stroke();
    }
    // pebbles and roots
    for (let i = 0; i < 520; i++) {
      const y = 0.9 + R() * 29, x = R() * w;
      g.fillStyle = y < 4.5 ? 'rgba(60,35,20,0.5)' : y < 9.5 ? 'rgba(230,170,110,0.45)' : y < 14 ? 'rgba(200,180,170,0.4)' : 'rgba(150,140,175,0.5)';
      g.beginPath();
      g.ellipse(x, y * ppu, 3 + R() * 9, 2 + R() * 6, R() * 3, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = 'rgba(70,40,20,0.7)';
    g.lineWidth = 3;
    for (let i = 0; i < 18; i++) {
      let x = R() * w, y = 0.7 * ppu;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (R() - 0.5) * 24;
        y += 6 + R() * 10;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    // quartz veins (white) running through the deep rock
    const cx = w / 2, uu = w / W0;
    g.lineCap = 'round';
    for (const [lw, col] of [[34, 'rgba(255,255,255,0.35)'], [20, '#f4f1ea']]) {
      g.strokeStyle = col;
      g.lineWidth = lw;
      g.beginPath();
      g.moveTo(cx - 9 * uu, 15.5 * ppu);
      g.bezierCurveTo(cx - 4 * uu, 17.5 * ppu, cx - 1 * uu, 18.4 * ppu, cx + 3 * uu, 17.6 * ppu);
      g.bezierCurveTo(cx + 6 * uu, 17 * ppu, cx + 9 * uu, 19.5 * ppu, cx + 12 * uu, 21 * ppu);
      g.moveTo(cx - 1 * uu, 18.3 * ppu);
      g.lineTo(cx - 0.6 * uu, 20.5 * ppu);
      g.moveTo(cx + 0.9 * uu, 18 * ppu);
      g.lineTo(cx + 1.1 * uu, 16.2 * ppu);
      g.stroke();
    }
  });
  add(scene, new THREE.PlaneGeometry(W0, D), std(0xffffff, 0.92, { map: face }), [0, -D / 2, 0], [0, Math.PI, 0], [1, 1, 1], false).receiveShadow = true;
  // side face (gives the slab depth at the right edge)
  add(scene, new THREE.PlaneGeometry(20, D), std(0x6a4a36, 0.95), [-W0 / 2, -D / 2, 10], [0, Math.PI / 2, 0], [1, 1, 1], false);
  // surface: grass with trees and a tiny kampung house
  const top = add(scene, new THREE.PlaneGeometry(W0, 80), std(0xffffff, 0.95, { map: grassTex('#5fb24e', '#86d066', '#3f8f3a', 4, 30) }), [0, 0, 40], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  top.receiveShadow = true;
  const R = rng(21);
  for (let i = 0; i < 12; i++) {
    const tr = makeTree(R, { scale: 1.2 + R() * 0.6, leaf: [0x3c8f45, 0x4aa34e, 0x2f7a3a], trunk: 0x7a5a3c });
    tr.position.set(-16 + i * 3 + R(), 0, 2 + R() * 10);
    scene.add(tr);
  }
  const house = new THREE.Group();
  add(house, new THREE.BoxGeometry(3, 2, 2.6), std(0xfff0d6, 0.9), [0, 1.6, 0]);
  for (const [x, z] of [[-1.3, -1.1], [1.3, -1.1], [-1.3, 1.1], [1.3, 1.1]]) add(house, new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6), std(0x7a5a3c), [x, 0.35, z]);
  add(house, new THREE.ConeGeometry(2.6, 1.5, 4), std(0xc4573a, 0.7), [0, 3.35, 0], [0, Math.PI / 4, 0], [1, 1, 0.8]);
  house.position.set(4.5, 0, 2.5);
  scene.add(house);
  // embedded 3D rocks on the cut face
  for (let i = 0; i < 26; i++) {
    const y = -5 - R() * 24, s = 0.35 + R() * 0.7;
    const r = rock(R, s, y > -14 ? 0x9a7a62 : 0x7a7090);
    r.position.set((R() - 0.5) * 30, y, -0.05 * s);
    if (Math.abs(r.position.x) > 5 || y > -14) scene.add(r);
  }
  // gold nuggets in the vein, each with a soft glow sprite
  const nuggets = [];
  const gm = goldMat({ rough: 0.25, ei: 0.8 });
  VEIN.forEach(([x, y], i) => {
    const n = new THREE.Mesh(nuggetGeo(R, 1), gm);
    const s = 0.32 + R() * 0.22;
    n.scale.setScalar(s);
    n.position.set(x, y, -0.12);
    n.rotation.set(R() * 3, R() * 3, R() * 3);
    n.castShadow = true;
    scene.add(n);
    const gl = glow(0xffd860, 2.4, 0);
    gl.position.set(x, y, -0.5);
    scene.add(gl);
    nuggets.push({ n, gl, s });
  });
  // dark space under the slab
  add(scene, new THREE.PlaneGeometry(400, 400), std(0x0e1630, 1), [0, -D - 0.1, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  const aff = makeAffan();
  aff.root.scale.setScalar(0.55);
  scene.add(aff.root);
  return { scene, sky, nuggets, aff };
}

// ------------------------------------------------------------------ river
// River runs along x; flow towards -x (screen right when the camera looks +z).
// Affan stands in the shallows at the origin. The magnified pan rig sits at PAN0.
export const PAN0 = new THREE.Vector3(0, 0, 80);
export const PAN_R = 3.2, PAN_D = 0.85;
export function buildRiver() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfeaff, 30, 110);
  const sky = makeSky({ top: 0x2f7fe0, mid: 0x6fb6f2, horizon: 0xe2f2ff, bottom: 0x5a9a50 });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xe6f4ff, 0x4a7a3c, 1.35));
  const sun = new THREE.DirectionalLight(0xfff1d8, 2.6);
  sun.position.set(-8, 14, -8);
  shadowCfg(sun, 10);
  scene.add(sun, sun.target);
  // riverbed (sand + pebbles) under a moving water surface
  const bed = add(scene, new THREE.PlaneGeometry(200, 14), std(0xffffff, 0.95, { map: speckTex('#c9ad7a', ['#8d7a5a', '#e2cfa0', '#a08a6a', '#6f6a62'], 11, 1, 2600) }), [0, -0.55, 2.5], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  bed.material.map.repeat.set(24, 2);
  bed.receiveShadow = true;
  const ripple = tex(512, 512, (g, s) => {
    g.fillStyle = '#2f9fd0';
    g.fillRect(0, 0, s, s);
    const R = rng(12);
    for (let i = 0; i < 160; i++) {
      const x = R() * s, y = R() * s, l = 30 + R() * 90;
      g.strokeStyle = `rgba(220,248,255,${0.25 + R() * 0.45})`;
      g.lineWidth = 3 + R() * 4;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + l / 2, y + (R() - 0.5) * 14, x + l, y);
      g.stroke();
    }
  });
  ripple.repeat.set(18, 2);
  const water = add(scene, new THREE.PlaneGeometry(200, 14), new THREE.MeshStandardMaterial({ color: 0x8fdcff, map: ripple, transparent: true, opacity: 0.6, roughness: 0.12, metalness: 0.05, depthWrite: false }), [0, -0.18, 2.5], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  water.renderOrder = 2;
  // banks
  const gt = grassTex('#5fb24e', '#86d066', '#3f8f3a', 4, 40);
  for (const [z, d] of [[-4.5 - 20, 40], [9.5 + 20, 40]]) add(scene, new THREE.BoxGeometry(200, 1, d), std(0xffffff, 0.95, { map: gt }), [0, -0.3, z], [0, 0, 0], [1, 1, 1], false).receiveShadow = true;
  // muddy bank edges
  for (const z of [-4.45, 9.45]) add(scene, new THREE.BoxGeometry(200, 0.6, 0.6), std(0x9a7a52, 0.95), [0, -0.25, z], [0, 0, 0], [1, 1, 1], false);
  const R = rng(31);
  // stones in and along the river
  for (let i = 0; i < 40; i++) {
    const near = R() < 0.5;
    const r = rock(R, 0.25 + R() * 0.5, [0x9a9aa6, 0x8a8f9a, 0xb0a898][i % 3]);
    r.position.set((R() - 0.5) * 50, -0.35, near ? -4.2 + R() * 1.5 : 7.6 + R() * 2);
    if (Math.abs(r.position.x) > 2.5 || !near) scene.add(r);
  }
  // jungle on the far bank
  for (let i = 0; i < 22; i++) {
    const tr = makeTree(R, { scale: 1.8 + R() * 1.2, leaf: [0x2f8a3c, 0x3fa24a, 0x26703a], trunk: 0x6a4a32 });
    tr.position.set(-40 + i * 3.8 + R() * 2, 0.2, 12 + R() * 9);
    scene.add(tr);
  }
  for (let i = 0; i < 16; i++) {
    const b = makeBush(R, { scale: 1.2 + R() * 0.8, color: [0x3f8f3a, 0x4fa244, 0x2f7d38][i % 3] });
    b.position.set(-30 + i * 4 + R(), 0.2, 10.4 + R());
    scene.add(b);
  }
  // hills
  for (let i = 0; i < 6; i++) add(scene, new THREE.SphereGeometry(18 + R() * 8, 24, 12), std([0x3f8f4a, 0x4a9a52, 0x357f42][i % 3], 0.95), [-60 + i * 24, -6, 50 + R() * 10], [0, 0, 0], [1, 0.6, 0.6], false);
  // drifting gold specks along the riverbed (used in the "serbuk emas" shot)
  const NF = 110;
  const flakes = new THREE.InstancedMesh(nuggetGeo(R, 0), goldMat({ rough: 0.2, ei: 1.0 }), NF);
  flakes.userData.seed = Array.from({ length: NF }, () => [R() * 40, R() * 3.0 - 0.2, R(), 0.07 + R() * 0.07]);
  scene.add(flakes);
  const aff = makeAffan();
  scene.add(aff.root);
  // Affan's dulang, held in front (child of his torso so it follows his body)
  const pan = makeDulang(0.62, 0.17);
  pan.position.set(0, 0.78, 0.78);
  pan.rotation.x = 0.12;
  aff.parts.torso.add(pan);
  const panWater = add(pan, new THREE.CircleGeometry(0.55, 32), new THREE.MeshStandardMaterial({ color: 0x8fdcff, transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false }), [0, 0.12, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  panWater.renderOrder = 3;

  // ---- magnified pan rig (sand vs gold), standing on its own riverbed
  const rig = new THREE.Group();
  rig.position.copy(PAN0);
  scene.add(rig);
  add(rig, new THREE.PlaneGeometry(60, 60), std(0xffffff, 0.95, { map: speckTex('#b89a68', ['#8d7a5a', '#e2cfa0', '#a08a6a'], 13, 6, 2000) }), [0, -1.6, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  const big = makeDulang(PAN_R, PAN_D);
  rig.add(big);
  const bigWater = add(big, new THREE.CircleGeometry(PAN_R * 0.97, 64), new THREE.MeshStandardMaterial({ color: 0xbfefff, transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false, map: ripple.clone() }), [0, PAN_D * 0.92, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  bigWater.material.map.repeat.set(2, 2);
  bigWater.renderOrder = 3;
  const NS = 420, NG = 34;
  const sand = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.08, 0), std(0xffffff, 0.9, { flatShading: true }), NS);
  sand.castShadow = true;
  sand.userData.seed = Array.from({ length: NS }, () => [Math.sqrt(R()) * 0.9, R() * Math.PI * 2, R(), 0.7 + R() * 0.8, [0xe6cf9a, 0xd8bb82, 0xf2e0b4, 0xb59a6a][Math.floor(R() * 4)]]);
  sand.userData.seed.forEach((s, i) => sand.setColorAt(i, new THREE.Color(s[4])));
  big.add(sand);
  const gold = new THREE.InstancedMesh(nuggetGeo(R, 1), goldMat({ rough: 0.18, ei: 0.9 }), NG);
  gold.castShadow = true;
  gold.userData.seed = Array.from({ length: NG }, () => [Math.sqrt(R()) * 0.85, R() * Math.PI * 2, R(), 0.11 + R() * 0.08, R() * 6]);
  big.add(gold);
  return { scene, sky, sun, aff, pan, water, ripple, flakes, rig, big, bigWater, sand, gold };
}

// ------------------------------------------------------------------- mine
// Terraced open pit centred at the origin (bottom at y = -PIT_D), a crusher
// on the rim at CRUSH, and the car-vs-rock balance at BAL.
export const PIT_D = 12;
export const CRUSH = new THREE.Vector3(-22, 0, 4);
export const BAL = new THREE.Vector3(60, 0, 0);
export function buildMine() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf2dcc0, 40, 150);
  const sky = makeSky({ top: 0x4a8ee0, mid: 0x8fc0f0, horizon: 0xf6e6cf, bottom: 0xc08a5a });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xfff0e0, 0x8a5a3a, 1.4));
  const sun = new THREE.DirectionalLight(0xfff0d4, 2.5);
  sun.position.set(-10, 18, -12);
  shadowCfg(sun, 26);
  scene.add(sun, sun.target);
  // terraced pit (lathe of a stepped profile)
  const prof = [];
  const steps = 6, r0 = 24, r1 = 4;
  prof.push(new THREE.Vector2(0, -PIT_D));
  prof.push(new THREE.Vector2(r1, -PIT_D));
  for (let i = steps - 1; i >= 0; i--) {
    const r = r1 + ((r0 - r1) * (steps - i)) / steps;
    const yTop = -PIT_D + (PIT_D * (steps - i)) / steps;
    const yBot = yTop - PIT_D / steps;
    prof.push(new THREE.Vector2(r - 1.1, yBot));
    prof.push(new THREE.Vector2(r - 0.4, yTop));
    prof.push(new THREE.Vector2(r, yTop));
  }
  prof.push(new THREE.Vector2(200, 0));
  const bands = tex(64, 1024, (g, w, h) => {
    for (let i = 0; i < 32; i++) {
      g.fillStyle = ['#c98a52', '#b5743f', '#d89a5f', '#a8683a'][i % 4];
      g.fillRect(0, (i * h) / 32, w, h / 32 + 1);
    }
  }, 1, 1);
  const pit = add(scene, new THREE.LatheGeometry(prof, 96), std(0xffffff, 0.95, { map: bands, side: THREE.DoubleSide }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  pit.receiveShadow = true;
  pit.castShadow = true;
  // ground outside (dusty)
  const R = rng(41);
  for (let i = 0; i < 60; i++) {
    const a = R() * Math.PI * 2, rr = 27 + R() * 40;
    const r = rock(R, 0.3 + R() * 0.8, [0xb5835a, 0x9a6a48, 0xc89a70][i % 3]);
    r.position.set(Math.cos(a) * rr, 0.05, Math.sin(a) * rr);
    if (Math.hypot(r.position.x - CRUSH.x, r.position.z - CRUSH.z) > 6 && Math.hypot(r.position.x - BAL.x, r.position.z - BAL.z) > 16) scene.add(r);
  }
  // rocks on the terraces
  for (let i = 0; i < 50; i++) {
    const k = Math.floor(R() * steps);
    const rr = r1 + ((r0 - r1) * (k + 0.5)) / steps;
    const y = -PIT_D + (PIT_D * k) / steps;
    const a = R() * Math.PI * 2;
    const r = rock(R, 0.3 + R() * 0.5, [0xa8784e, 0x8a6a52, 0xc08a5c][i % 3]);
    r.position.set(Math.cos(a) * rr, y + 0.1, Math.sin(a) * rr);
    scene.add(r);
  }
  // excavator on the second terrace
  const yellow = std(0xffc21f, 0.45, { emissive: 0x3a2800, emissiveIntensity: 0.2 });
  const dark = std(0x2a2e3b, 0.6);
  const dig = new THREE.Group();
  add(dig, new RoundedBoxGeometry(3.2, 0.8, 2.2, 2, 0.2), dark, [0, 0.4, 0]);
  const upper = new THREE.Group();
  upper.position.y = 0.85;
  dig.add(upper);
  add(upper, new RoundedBoxGeometry(2.6, 1.1, 2.0, 2, 0.15), yellow, [-0.3, 0.55, 0]);
  add(upper, new RoundedBoxGeometry(1.1, 1.2, 1.0, 2, 0.12), yellow, [0.55, 1.6, 0.45]);
  add(upper, new THREE.BoxGeometry(0.9, 0.7, 0.02), std(0x9fdcff, 0.1), [0.55, 1.75, 0.96], [0, 0, 0], [1, 1, 1], false);
  const boom = new THREE.Group();
  boom.position.set(0.9, 1.0, -0.35);
  upper.add(boom);
  add(boom, new RoundedBoxGeometry(3.4, 0.4, 0.4, 2, 0.1), yellow, [1.6, 0, 0]);
  const stick = new THREE.Group();
  stick.position.set(3.3, 0, 0);
  boom.add(stick);
  add(stick, new RoundedBoxGeometry(2.4, 0.32, 0.32, 2, 0.08), yellow, [1.1, 0, 0]);
  const bucket = new THREE.Group();
  bucket.position.set(2.3, 0, 0);
  stick.add(bucket);
  add(bucket, new RoundedBoxGeometry(0.8, 0.8, 0.9, 2, 0.1), dark, [0.25, -0.3, 0]);
  const k2 = 1;
  const rr2 = r1 + ((r0 - r1) * (k2 + 0.5)) / steps;
  dig.position.set(-rr2 * 0.7, -PIT_D + (PIT_D * k2) / steps, -rr2 * 0.7);
  dig.rotation.y = Math.PI * 0.25;
  scene.add(dig);
  // dump truck on the third terrace
  const truck = new THREE.Group();
  add(truck, new RoundedBoxGeometry(4.2, 1.2, 2.4, 2, 0.2), yellow, [0, 1.6, 0]);
  add(truck, new RoundedBoxGeometry(1.4, 1.4, 2.2, 2, 0.15), yellow, [2.7, 1.5, 0]);
  for (const [x, z] of [[-1.3, -1.2], [-1.3, 1.2], [1.6, -1.2], [1.6, 1.2], [2.8, -1.2], [2.8, 1.2]]) add(truck, new THREE.CylinderGeometry(0.6, 0.6, 0.5, 20), dark, [x, 0.6, z], [Math.PI / 2, 0, 0]);
  const load = rock(R, 1.0, 0xa8784e);
  load.position.set(-0.2, 2.4, 0);
  truck.add(load);
  const k3 = 3;
  const rr3 = r1 + ((r0 - r1) * (k3 + 0.5)) / steps;
  truck.position.set(rr3 * 0.75, -PIT_D + (PIT_D * k3) / steps, -rr3 * 0.65);
  truck.rotation.y = -0.9;
  scene.add(truck);

  // crusher on the rim: a hopper over two big rollers (seen from the side)
  const cr = new THREE.Group();
  cr.position.copy(CRUSH);
  scene.add(cr);
  const steel = std(0x5f6f8a, 0.4, { metalness: 0.5 });
  const red = std(0xe8503a, 0.5);
  for (const s of [-1, 1]) add(cr, new THREE.BoxGeometry(0.3, 5.5, 3.2), red, [s * 2.2, 2.75, 0]);
  add(cr, new THREE.BoxGeometry(4.7, 0.3, 3.2), red, [0, 5.4, 0]);
  // hopper walls (sloped)
  for (const s of [-1, 1]) add(cr, new THREE.BoxGeometry(2.4, 0.18, 2.8), steel, [s * 1.35, 6.4, 0], [0, 0, s * 0.7]);
  const rollers = [];
  for (const s of [-1, 1]) {
    const r = add(cr, new THREE.CylinderGeometry(0.95, 0.95, 2.8, 24), steel, [s * 1.0, 3.6, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      add(r, new THREE.BoxGeometry(0.22, 2.82, 0.22), std(0x3a4458, 0.5), [Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95], [0, a, 0]);
    }
    rollers.push(r);
  }
  // chute + gravel pile underneath
  add(cr, new THREE.BoxGeometry(3.6, 0.15, 2.4), steel, [0.6, 1.6, 0], [0, 0, -0.25]);
  const chunks = [];
  for (let i = 0; i < 9; i++) {
    const c = rock(R, 0.55 + R() * 0.25, [0xa8784e, 0x8a6a52, 0xc08a5c][i % 3], 1);
    cr.add(c);
    chunks.push(c);
  }
  const gravel = [];
  for (let i = 0; i < 60; i++) {
    const c = rock(R, 0.13 + R() * 0.1, [0xa8784e, 0x8a6a52, 0xc08a5c][i % 3], 0);
    c.userData.seed = [R(), R(), R()];
    cr.add(c);
    gravel.push(c);
  }
  const pile = add(cr, new THREE.ConeGeometry(2.0, 1.1, 18), std(0xa8784e, 0.95, { flatShading: true }), [3.2, 0.55, 0]);

  // ---- balance: a car on one pan, a (smaller, denser) rock on the other
  const bal = new THREE.Group();
  bal.position.copy(BAL);
  scene.add(bal);
  add(bal, new THREE.PlaneGeometry(80, 80), std(0xffffff, 0.95, { map: speckTex('#d9b48a', ['#b58a5e', '#e8cca8', '#c49a6a'], 17, 10, 1600) }), [0, 0.02, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  const blue = std(0x3f7fe0, 0.45);
  add(bal, new THREE.CylinderGeometry(0.5, 1.6, 4.2, 4), blue, [0, 2.1, 0], [0, Math.PI / 4, 0]);
  const beam = new THREE.Group();
  beam.position.set(0, 4.4, 0);
  bal.add(beam);
  add(beam, new RoundedBoxGeometry(13, 0.4, 0.6, 2, 0.15), std(0xffd36b, 0.45), [0, 0, 0]);
  add(beam, new THREE.SphereGeometry(0.45, 20, 14), std(0xff7a45, 0.4), [0, 0, 0]);
  const plates = [];
  for (const s of [-1, 1]) {
    const p = new THREE.Group();
    p.position.set(s * 6, 4.4, 0);
    bal.add(p);
    add(p, new THREE.CylinderGeometry(0.08, 0.08, 2.0, 8), std(0x9aa6c8, 0.4), [0, -1.0, 0]);
    add(p, new RoundedBoxGeometry(4.8, 0.28, 2.8, 2, 0.1), std(0xffffff, 0.5), [0, -2.1, 0]);
    plates.push(p);
  }
  const car = makeCar({ color: 0xff5a5a, accent: 0xffd36b });
  car.traverse((o) => {
    if (o.material && o.material.blending === THREE.AdditiveBlending) o.visible = false;
  });
  car.scale.setScalar(0.95);
  car.position.set(0, -1.95, 0);
  plates[0].add(car);
  // the rock is built from many chunks so it can crumble into gravel
  const boulder = new THREE.Group();
  boulder.position.set(0, -1.95, 0);
  plates[1].add(boulder);
  const NB = 70;
  const bChunks = [];
  const chunkGeo = new THREE.IcosahedronGeometry(1, 0);
  for (let i = 0; i < NB; i++) {
    const u = R() * 2 - 1, a = R() * Math.PI * 2, rr = Math.cbrt(R()) * 0.9;
    const p0 = new THREE.Vector3(Math.sqrt(1 - u * u) * Math.cos(a) * rr * 1.15, 1.05 + u * rr * 0.85, Math.sin(a) * Math.sqrt(1 - u * u) * rr);
    const m = new THREE.Mesh(chunkGeo, std([0x8f7f74, 0x7a6e66, 0xa0948a, 0x6a625c][i % 4], 0.85, { flatShading: true }));
    m.scale.setScalar(0.32 + R() * 0.2);
    m.position.copy(p0);
    m.rotation.set(R() * 3, R() * 3, R() * 3);
    m.castShadow = true;
    m.receiveShadow = true;
    boulder.add(m);
    // landing spot in a low pile on the ground beside the balance
    const la = R() * Math.PI * 2, lr = Math.sqrt(R()) * 2.6;
    bChunks.push({ m, p0, s0: m.scale.x, r0: m.rotation.clone(), land: new THREE.Vector3(Math.cos(la) * lr, 0.18 + (2.6 - lr) * 0.22 * R(), Math.sin(la) * lr * 0.8), d: R() * 0.35 });
  }
  const bean = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), goldMat({ rough: 0.12, ei: 1.2 }));
  bean.scale.set(0.22, 0.16, 0.18);
  bal.add(bean);
  const beanGlow = glow(0xffe070, 1.4, 0);
  bal.add(beanGlow);
  const aff = makeAffan();
  scene.add(aff.root);
  addHardHat(aff);
  return { scene, sky, sun, aff, dig, upper, boom, stick, bucket, truck, cr, rollers, chunks, gravel, pile, bal, beam, plates, car, boulder, bChunks, bean, beanGlow };
}

// ------------------------------------------------------------------ pools
// Four Olympic-size pools in a column along z (they stack up the 9:16 frame),
// sunk into a raised deck of height POOL.D, that fill up with gold.
export const POOL = { L: 20, Wd: 9, D: 2.2, gap: 4 };
export const poolZ = (i) => (i - 1.5) * (POOL.Wd + POOL.gap);
export function buildPools() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd8f0ff, 80, 260);
  const sky = makeSky({ top: 0x2f7fe0, mid: 0x7fbcf4, horizon: 0xe6f6ff, bottom: 0xb0d8f0 });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xf0f8ff, 0x8ab0c8, 1.4));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.6);
  sun.position.set(-14, 30, -20);
  shadowCfg(sun, 36);
  scene.add(sun, sun.target);
  const P = POOL;
  const tileTex = (base, line, rep) => tex(256, 256, (g, s) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = line;
    g.lineWidth = 4;
    for (let i = 0; i <= 4; i++) {
      g.beginPath();
      g.moveTo((i * s) / 4, 0);
      g.lineTo((i * s) / 4, s);
      g.moveTo(0, (i * s) / 4);
      g.lineTo(s, (i * s) / 4);
      g.stroke();
    }
  }, rep);
  add(scene, new THREE.PlaneGeometry(400, 400), std(0x9fd27a, 0.95), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  const deckM = std(0xffffff, 0.75, { map: tileTex('#f4f8fb', '#c9d8e6', 4) });
  const X0 = 26, Z0 = 30, hx = P.L / 2;
  const zs = [0, 1, 2, 3].map(poolZ);
  const box = (x0, x1, z0, z1) => {
    const m = add(scene, new THREE.BoxGeometry(x1 - x0, P.D, z1 - z0), deckM, [(x0 + x1) / 2, P.D / 2, (z0 + z1) / 2]);
    m.receiveShadow = true;
  };
  box(-X0, -hx, -Z0, Z0);
  box(hx, X0, -Z0, Z0);
  const edges = [-Z0, ...zs.flatMap((z) => [z - P.Wd / 2, z + P.Wd / 2]), Z0];
  for (let i = 0; i < edges.length; i += 2) box(-hx, hx, edges[i], edges[i + 1]);
  const blue = std(0x3fb8e8, 0.4, { map: tileTex('#4cc0ee', '#2f9fd0', 6) });
  const coping = std(0xffffff, 0.45);
  const bars = tex(512, 256, (g, w, h) => {
    g.fillStyle = '#d9951c';
    g.fillRect(0, 0, w, h);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) {
      const x = i * 64 + (j % 2) * 32, y = j * 64;
      const gr = g.createLinearGradient(x, y, x, y + 64);
      gr.addColorStop(0, '#ffe58a');
      gr.addColorStop(0.5, '#ffc93c');
      gr.addColorStop(1, '#e0a020');
      g.fillStyle = gr;
      g.fillRect(x + 4, y + 4, 56, 56);
      g.strokeStyle = '#b5770f';
      g.lineWidth = 3;
      g.strokeRect(x + 4, y + 4, 56, 56);
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.fillRect(x + 10, y + 10, 30, 6);
    }
  }, 5, 2.5);
  const pools = [];
  zs.forEach((z, i) => {
    const c = new THREE.Vector3(0, 0, z);
    add(scene, new THREE.PlaneGeometry(P.L, P.Wd), blue, [0, 0.02, z], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
    // blue inner walls
    for (const [x, zz, w, d, ry] of [[0, z - P.Wd / 2 + 0.01, P.L, P.D, 0], [0, z + P.Wd / 2 - 0.01, P.L, P.D, Math.PI], [-hx + 0.01, z, P.Wd, P.D, Math.PI / 2], [hx - 0.01, z, P.Wd, P.D, -Math.PI / 2]]) add(scene, new THREE.PlaneGeometry(w, d), blue, [x, P.D / 2, zz], [0, ry, 0], [1, 1, 1], false);
    for (const [x, zz, w, d] of [[0, z - P.Wd / 2 - 0.3, P.L + 1.2, 0.6], [0, z + P.Wd / 2 + 0.3, P.L + 1.2, 0.6], [-hx - 0.3, z, 0.6, P.Wd], [hx + 0.3, z, 0.6, P.Wd]]) add(scene, new RoundedBoxGeometry(w, 0.22, d, 2, 0.08), coping, [x, P.D + 0.08, zz]);
    // gold fill, scaled in y by the episode
    const gm = goldMat({ rough: 0.3, ei: 0.55 });
    gm.map = bars;
    const fill = add(scene, new THREE.BoxGeometry(P.L - 0.04, 1, P.Wd - 0.04), gm, [0, 0.5, z]);
    fill.visible = false;
    pools.push({ fill, c });
    // starting blocks
    for (let k = 0; k < 4; k++) add(scene, new RoundedBoxGeometry(0.9, 0.5, 0.9, 2, 0.1), std(0xff6b6b, 0.5), [-hx - 1.0, P.D + 0.25, z - P.Wd / 2 + 1.1 + k * 2.27]);
  });
  const R = rng(51);
  for (let i = 0; i < 14; i++) {
    const tr = makeTree(R, { scale: 2 + R(), leaf: [0x3fa24a, 0x4ab854, 0x2f8a3c], trunk: 0x8a6a4a, toy: true });
    const s = i % 2 ? 1 : -1;
    tr.position.set(s * (X0 + 4 + R() * 6), 0, -28 + (i >> 1) * 9);
    scene.add(tr);
  }
  for (let i = 0; i < 5; i++) add(scene, new RoundedBoxGeometry(1.2, 0.4, 3, 2, 0.15), std([0xff8a5b, 0xffd36b, 0x7cc4ff][i % 3], 0.6), [-hx - 4, P.D + 0.2, -22 + i * 10]);
  const aff = makeAffan();
  scene.add(aff.root);
  return { scene, sky, sun, pools, aff };
}

// ------------------------------------------------------------------ studio
// A science stage for the "why expensive" reasons. Set A at x = 0 (Affan +
// a gold bar), set B at x = 40 (rusty nail vs gold coin), set C at x = 80
// (many people, a little gold).
export const STUDIO = { A: 0, B: 40, C: 80 };
export function buildStudio() {
  const scene = new THREE.Scene();
  const c = document.createElement('canvas');
  c.width = 540;
  c.height = 960;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(270, 420, 40, 270, 460, 720);
  gr.addColorStop(0, '#7f6cf0');
  gr.addColorStop(0.5, '#3f3aa8');
  gr.addColorStop(1, '#161a52');
  g.fillStyle = gr;
  g.fillRect(0, 0, 540, 960);
  const bg = new THREE.CanvasTexture(c);
  bg.colorSpace = THREE.SRGBColorSpace;
  scene.background = bg;
  scene.add(new THREE.HemisphereLight(0xeaf0ff, 0x3a3a8a, 1.4));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.5);
  key.position.set(-4, 10, -8);
  shadowCfg(key, 60);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xb4c8ff, 1.6);
  rim.position.set(6, 5, 8);
  scene.add(rim);
  const floor = add(scene, new THREE.PlaneGeometry(400, 100), std(0x2a2f7a, 0.5), [40, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  floor.receiveShadow = true;
  const R = rng(61);
  for (const x of [STUDIO.A, STUDIO.B, STUDIO.C]) {
    add(scene, new THREE.CylinderGeometry(5.5, 5.8, 0.4, 64), std(0x4a52c8, 0.4), [x, 0.2, 0.5]).receiveShadow = true;
    add(scene, new THREE.TorusGeometry(5.6, 0.07, 8, 96), new THREE.MeshBasicMaterial({ color: 0x9fe8ff }), [x, 0.4, 0.5], [Math.PI / 2, 0, 0], [1, 1, 1], false);
    for (let i = 0; i < 24; i++) {
      const gl = glow([0x9fe8ff, 0xffe28a, 0xffb3d1][i % 3], 0.3 + R() * 0.5, 0.55);
      gl.position.set(x + (R() - 0.5) * 18, 1 + R() * 9, 3 + R() * 8);
      scene.add(gl);
    }
  }
  // A: floating gold bar
  const barGeo = new THREE.CylinderGeometry(0.62, 0.9, 0.55, 4, 1);
  barGeo.rotateY(Math.PI / 4);
  barGeo.scale(1.8, 1, 0.8);
  const bar = add(scene, barGeo, goldMat({ rough: 0.15, ei: 0.7 }), [STUDIO.A - 1.9, 2.6, 0.6]);
  const barGlow = glow(0xffe28a, 4, 0.5);
  scene.add(barGlow);
  // B: two pedestals, iron nail and gold coin
  const ped = std(0xffffff, 0.5);
  for (const s of [-1, 1]) add(scene, new RoundedBoxGeometry(2.0, 2.2, 2.0, 3, 0.15), ped, [STUDIO.B + s * 1.9, 1.5, 0.8]);
  const iron = new THREE.MeshStandardMaterial({ color: 0x9aa4b4, metalness: 0.85, roughness: 0.32 });
  GOLDS.push(iron); // reflects the same environment
  const nail = new THREE.Group();
  add(nail, new THREE.CylinderGeometry(0.12, 0.12, 2.0, 16), iron, [0, 0, 0]);
  add(nail, new THREE.ConeGeometry(0.12, 0.35, 16), iron, [0, -1.17, 0], [Math.PI, 0, 0]);
  add(nail, new THREE.CylinderGeometry(0.34, 0.34, 0.1, 24), iron, [0, 1.02, 0]);
  nail.position.set(STUDIO.B + 1.9, 3.6, 0.8);
  nail.rotation.z = 0.5;
  scene.add(nail);
  const rustSpots = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), std(0xa8481c, 1, { flatShading: true }), 80);
  rustSpots.userData.seed = Array.from({ length: 80 }, () => [R() * 2.2 - 1.15, R() * Math.PI * 2, 0.7 + R() * 0.9, R()]);
  nail.add(rustSpots);
  const coin = new THREE.Group();
  add(coin, new THREE.CylinderGeometry(0.85, 0.85, 0.16, 48), goldMat({ rough: 0.14, ei: 0.7 }), [0, 0, 0], [Math.PI / 2, 0, 0]);
  add(coin, new THREE.TorusGeometry(0.72, 0.04, 8, 48), goldMat({ rough: 0.1, ei: 0.8 }), [0, 0, -0.09]);
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.2 : 0.45;
    i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  add(coin, new THREE.ExtrudeGeometry(star, { depth: 0.04, bevelEnabled: false }), goldMat({ rough: 0.1, ei: 0.9 }), [0, 0, -0.12]);
  coin.position.set(STUDIO.B - 1.9, 3.5, 0.8);
  scene.add(coin);
  const coinGlow = glow(0xffe28a, 3, 0.4);
  coinGlow.position.set(STUDIO.B - 1.9, 3.5, 0.2);
  scene.add(coinGlow);
  // C: a little gold on a pedestal, lots of people who want it
  add(scene, new RoundedBoxGeometry(1.6, 2.0, 1.6, 3, 0.12), ped, [STUDIO.C, 1.4, 1.5]);
  const nug = new THREE.Mesh(nuggetGeo(R, 1), goldMat({ rough: 0.15, ei: 1.0 }));
  nug.scale.setScalar(0.42);
  nug.position.set(STUDIO.C, 2.75, 1.5);
  nug.castShadow = true;
  scene.add(nug);
  const nugGlow = glow(0xffe070, 2.6, 0.6);
  nugGlow.position.set(STUDIO.C, 2.8, 1.2);
  scene.add(nugGlow);
  const people = [];
  const shirts = [0xff6b6b, 0x4fa3ff, 0x5fd17a, 0xffb84a, 0xb57cff, 0xff8fc8, 0x3fd0d0, 0xffd84a];
  const skins = [0xe8a57c, 0xc98a5e, 0xf2c3a0, 0x9a6a48];
  for (let i = 0; i < 18; i++) {
    const p = new THREE.Group();
    const sc = 0.85 + R() * 0.4;
    add(p, new THREE.CapsuleGeometry(0.42, 0.9, 6, 16), std(shirts[i % shirts.length], 0.6), [0, 1.0, 0]);
    add(p, new THREE.SphereGeometry(0.42, 20, 14), std(skins[i % 4], 0.55), [0, 2.15, 0]);
    add(p, new THREE.SphereGeometry(0.44, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0x22160f, 0.5), [0, 2.2, -0.04]);
    for (const s of [-1, 1]) add(p, new THREE.SphereGeometry(0.06, 8, 6), std(0x111114, 0.3), [0.15 * s, 2.2, 0.38]);
    p.scale.setScalar(sc);
    const a = Math.PI * (0.15 + 0.7 * (i / 17)) + (R() - 0.5) * 0.15;
    const r1 = 3.2 + (i % 3) * 1.1;
    p.userData = { a, r1, r0: r1 + 7 + R() * 4, d: R() * 0.8, ph: R() * 6 };
    scene.add(p);
    people.push(p);
  }
  const aff = makeAffan();
  scene.add(aff.root);
  return { scene, bar, barGlow, nail, iron, rustSpots, coin, coinGlow, nug, nugGlow, people, aff };
}

// ------------------------------------------------------------------ outro
export function buildOutro() {
  const scene = new THREE.Scene();
  const c = document.createElement('canvas');
  c.width = 540;
  c.height = 960;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(270, 380, 40, 270, 420, 700);
  gr.addColorStop(0, '#fff0a8');
  gr.addColorStop(0.45, '#f5b730');
  gr.addColorStop(1, '#b56a12');
  g.fillStyle = gr;
  g.fillRect(0, 0, 540, 960);
  const bg = new THREE.CanvasTexture(c);
  bg.colorSpace = THREE.SRGBColorSpace;
  scene.background = bg;
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x8a6a3a, 1.5));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.4);
  key.position.set(3, 6, 8);
  shadowCfg(key, 5);
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xfff0c0, 2.0);
  rim.position.set(-6, 5, -6);
  scene.add(rim);
  const aff = makeAffan();
  scene.add(aff.root);
  const halo = glow(0xfff2b0, 9, 0.35);
  halo.position.set(0, 2.9, -2);
  scene.add(halo);
  return { scene, aff };
}
