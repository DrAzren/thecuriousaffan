// Episode 008 sets: the living room at night (real world), Affan's microscopic
// science world (toe-pad setae and spatulae under the ceiling), the giant toe
// diorama for the peeling demonstration, and the branded outro stage.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, clamp } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { makeGecko } from '../../shared/gecko.js';
import { add, glow } from '../../shared/props.js';

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

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

function shadowCfg(light, size, map = 2048, near = 0.5, far = 80) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  const c = light.shadow.camera;
  c.left = -size;
  c.right = size;
  c.top = size;
  c.bottom = -size;
  c.near = near;
  c.far = far;
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.03;
}

// Simple magnifying glass prop (yellow handle, navy rim, cyan lens).
export function makeMagnifier() {
  const g = new THREE.Group();
  const handle = add(g, new THREE.CylinderGeometry(0.075, 0.09, 0.7, 16), std(0xffc928, 0.4), [0, 0, 0]);
  handle.castShadow = true;
  add(g, new THREE.CylinderGeometry(0.1, 0.1, 0.08, 16), std(0x1c2752, 0.4), [0, 0.38, 0]);
  const head = new THREE.Group();
  head.position.set(0, 0.86, 0);
  g.add(head);
  add(head, new THREE.TorusGeometry(0.42, 0.07, 14, 40), std(0x1c2752, 0.35), [0, 0, 0]);
  add(head, new THREE.TorusGeometry(0.42, 0.035, 10, 40), std(0xffc928, 0.35), [0, 0, 0.05]);
  const lens = add(head, new THREE.CircleGeometry(0.4, 40), new THREE.MeshPhysicalMaterial({ color: 0xbfefff, roughness: 0.05, transparent: true, opacity: 0.35, emissive: 0x2a8fbf, emissiveIntensity: 0.25, side: THREE.DoubleSide, depthWrite: false }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const shine = add(head, new THREE.CircleGeometry(0.09, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }), [-0.15, 0.15, 0.01], [0, 0, 0], [0.7, 1, 1], false);
  return { group: g, head, lens, shine };
}

// ------------------------------------------------------------------ room
export const ROOM = { ceil: 9.4, back: -9, left: -12, right: 12, front: 9 };

export function buildRoom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a2038);
  const { ceil, back, left, right, front } = ROOM;

  // wallpaper: warm cream with soft peach stripes and tiny dots
  const wallTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#f6e7d4';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#f3d9c2';
    g.fillRect(0, 0, 64, h);
    g.fillRect(128, 0, 64, h);
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (let y = 16; y < h; y += 32) for (const x of [96, 224]) {
      g.beginPath();
      g.arc(x, y, 4, 0, Math.PI * 2);
      g.fill();
    }
  }, [6, 3]);
  const floorTex = canvasTex(512, 512, (g, w, h) => {
    const R = rng(4);
    for (let i = 0; i < 8; i++) {
      const c = 150 + Math.floor(R() * 25);
      g.fillStyle = `rgb(${c + 40},${c - 5},${c - 50})`;
      g.fillRect(0, i * 64, w, 64);
      g.fillStyle = 'rgba(90,50,25,0.35)';
      g.fillRect(0, i * 64, w, 3);
      g.fillRect(((i * 197) % 512), i * 64, 3, 64);
      for (let k = 0; k < 10; k++) {
        g.fillStyle = 'rgba(120,70,35,0.12)';
        g.fillRect(R() * w, i * 64 + 8 + R() * 48, 40 + R() * 120, 2);
      }
    }
  }, [5, 5]);
  const ceilTex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#fbf6ee';
    g.fillRect(0, 0, w, h);
    const R = rng(9);
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `rgba(200,185,165,${R() * 0.12})`;
      g.fillRect(R() * w, R() * h, 2, 2);
    }
  }, [10, 10]);
  const wallMat = std(0xffffff, 0.9, { map: wallTex });
  add(scene, new THREE.PlaneGeometry(right - left, ceil), wallMat, [0, ceil / 2, back], [0, 0, 0], [1, 1, 1], false).receiveShadow = true;
  add(scene, new THREE.PlaneGeometry(front - back, ceil), wallMat, [left, ceil / 2, 0], [0, Math.PI / 2, 0], [1, 1, 1], false).receiveShadow = true;
  add(scene, new THREE.PlaneGeometry(front - back, ceil), wallMat, [right, ceil / 2, 0], [0, -Math.PI / 2, 0], [1, 1, 1], false).receiveShadow = true;
  add(scene, new THREE.PlaneGeometry(right - left, ceil), wallMat, [0, ceil / 2, front], [0, Math.PI, 0], [1, 1, 1], false);
  const floor = add(scene, new THREE.PlaneGeometry(right - left, front - back), std(0xffffff, 0.75, { map: floorTex }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  floor.receiveShadow = true;
  const ceiling = add(scene, new THREE.PlaneGeometry(right - left, front - back), std(0xffffff, 0.95, { map: ceilTex }), [0, ceil, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  ceiling.receiveShadow = true;
  // skirting and cornice
  const trim = std(0xffffff, 0.6);
  add(scene, new THREE.BoxGeometry(right - left, 0.45, 0.12), trim, [0, 0.22, back + 0.06], [0, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.BoxGeometry(0.12, 0.45, front - back), trim, [left + 0.06, 0.22, 0], [0, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.BoxGeometry(right - left, 0.3, 0.3), trim, [0, ceil - 0.15, back + 0.15], [0, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.BoxGeometry(0.3, 0.3, front - back), trim, [left + 0.15, ceil - 0.15, 0], [0, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.BoxGeometry(0.3, 0.3, front - back), trim, [right - 0.15, ceil - 0.15, 0], [0, 0, 0], [1, 1, 1], false);

  // window with a night view (kampung lights, moon) and peach curtains
  const nightTex = canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#0b1440');
    gr.addColorStop(0.7, '#27357a');
    gr.addColorStop(1, '#3d4a8f');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    const R = rng(12);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(255,255,240,${0.4 + R() * 0.6})`;
      g.beginPath();
      g.arc(R() * w, R() * h * 0.6, 0.8 + R() * 1.6, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#fff6d8';
    g.beginPath();
    g.arc(w * 0.72, h * 0.24, 34, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#0d1636';
    for (let x = 0; x < w; x += 6) g.fillRect(x, h * 0.8 - Math.abs(Math.sin(x * 0.02)) * 40 - (x % 60 < 30 ? 20 : 0), 6, h);
    for (let i = 0; i < 26; i++) {
      g.fillStyle = R() < 0.5 ? '#ffd27a' : '#ffe9b0';
      g.fillRect(R() * w, h * 0.78 + R() * h * 0.18, 5, 5);
    }
  });
  const win = { x0: 3.4, x1: 9.4, y0: 3.0, y1: 7.6 };
  const wcx = (win.x0 + win.x1) / 2, wcy = (win.y0 + win.y1) / 2;
  add(scene, new THREE.PlaneGeometry(win.x1 - win.x0, win.y1 - win.y0), new THREE.MeshBasicMaterial({ map: nightTex }), [wcx, wcy, back + 0.02], [0, 0, 0], [1, 1, 1], false);
  const frameMat = std(0xffffff, 0.5);
  for (const [w, h, x, y] of [[win.x1 - win.x0 + 0.5, 0.25, wcx, win.y0], [win.x1 - win.x0 + 0.5, 0.25, wcx, win.y1], [0.25, win.y1 - win.y0, win.x0, wcy], [0.25, win.y1 - win.y0, win.x1, wcy], [0.15, win.y1 - win.y0, wcx, wcy], [win.x1 - win.x0, 0.15, wcx, wcy]]) {
    add(scene, new THREE.BoxGeometry(w, h, 0.18), frameMat, [x, y, back + 0.09]);
  }
  add(scene, new THREE.BoxGeometry(win.x1 - win.x0 + 1, 0.2, 0.6), frameMat, [wcx, win.y0 - 0.2, back + 0.3]);
  const curtainMat = std(0xf6a98a, 0.85, { side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(1.7, 6.6, 24, 4);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 6) * 0.12);
    geo.computeVertexNormals();
    add(scene, geo, curtainMat, [side < 0 ? win.x0 - 0.7 : win.x1 + 0.7, 5.0, back + 0.35]);
  }
  add(scene, new THREE.CylinderGeometry(0.06, 0.06, 9, 10), std(0x1c2752, 0.4), [wcx, 8.4, back + 0.4], [0, 0, Math.PI / 2]);

  // sofa (navy) with peach and yellow cushions
  const sofa = new THREE.Group();
  sofa.position.set(-5.2, 0, back + 1.6);
  scene.add(sofa);
  const navy = std(0x24336b, 0.85);
  add(sofa, new RoundedBoxGeometry(7.2, 1.3, 2.6, 4, 0.3), navy, [0, 1.0, 0]);
  add(sofa, new RoundedBoxGeometry(7.2, 2.4, 0.8, 4, 0.3), navy, [0, 2.2, -1.0]);
  for (const s of [-1, 1]) add(sofa, new RoundedBoxGeometry(0.8, 1.9, 2.6, 4, 0.3), navy, [3.6 * s, 1.5, 0]);
  add(sofa, new RoundedBoxGeometry(3.3, 0.5, 2.1, 4, 0.2), std(0x2f4385, 0.85), [-1.7, 1.85, 0.1]);
  add(sofa, new RoundedBoxGeometry(3.3, 0.5, 2.1, 4, 0.2), std(0x2f4385, 0.85), [1.7, 1.85, 0.1]);
  add(sofa, new RoundedBoxGeometry(1.4, 1.3, 0.45, 4, 0.2), std(0xf6a98a, 0.85), [-2.3, 2.6, -0.45], [0.15, 0.2, 0.1]);
  add(sofa, new RoundedBoxGeometry(1.3, 1.2, 0.45, 4, 0.2), std(0xffcf4a, 0.85), [2.4, 2.55, -0.45], [0.15, -0.2, -0.08]);
  for (const x of [-3.2, 3.2]) for (const z of [-0.9, 0.9]) add(sofa, new THREE.CylinderGeometry(0.1, 0.07, 0.4, 8), std(0x6b4a32), [x, 0.2, z]);

  // framed drawing (rocket + stars) and a round wall clock
  const art = canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = '#e8f7ff';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffcf4a';
    for (const [x, y] of [[40, 50], [200, 80], [60, 250], [210, 260]]) {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 7 : 17, a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      g.fill();
    }
    g.save();
    g.translate(128, 170);
    g.rotate(0.35);
    g.fillStyle = '#ff8a5b';
    g.beginPath();
    g.moveTo(0, -95);
    g.quadraticCurveTo(40, -40, 30, 60);
    g.lineTo(-30, 60);
    g.quadraticCurveTo(-40, -40, 0, -95);
    g.fill();
    g.fillStyle = '#2f9bff';
    g.beginPath();
    g.arc(0, -20, 16, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffcf4a';
    g.beginPath();
    g.moveTo(-20, 60);
    g.lineTo(0, 110);
    g.lineTo(20, 60);
    g.fill();
    g.restore();
  });
  add(scene, new THREE.BoxGeometry(2.7, 3.3, 0.15), std(0xffcf4a, 0.5), [-5.2, 6.1, back + 0.08]);
  add(scene, new THREE.PlaneGeometry(2.3, 2.9), new THREE.MeshStandardMaterial({ map: art, roughness: 0.8 }), [-5.2, 6.1, back + 0.17]);
  const clockTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(128, 128, 124, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#24336b';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath();
      g.arc(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100, i % 3 ? 5 : 9, 0, Math.PI * 2);
      g.fill();
    }
    g.lineCap = 'round';
    g.strokeStyle = '#24336b';
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(128, 128);
    g.lineTo(128, 70);
    g.stroke();
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(128, 128);
    g.lineTo(190, 150);
    g.stroke();
  });
  add(scene, new THREE.CylinderGeometry(0.85, 0.85, 0.15, 32), std(0x2f9bff, 0.4), [-0.6, 7.2, back + 0.08], [Math.PI / 2, 0, 0]);
  add(scene, new THREE.CircleGeometry(0.72, 32), new THREE.MeshStandardMaterial({ map: clockTex, roughness: 0.5 }), [-0.6, 7.2, back + 0.17]);

  // plant, side table with lamp, rug, bookshelf
  const pot = add(scene, new THREE.CylinderGeometry(0.75, 0.55, 1.3, 20), std(0xffffff, 0.5), [-10.4, 0.65, back + 1.4]);
  const R = rng(3);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const leaf = add(scene, new THREE.SphereGeometry(0.5, 12, 8), std(0x3fae6a, 0.7), [-10.4 + Math.cos(a) * 0.5, 2.3 + R() * 1.4, back + 1.4 + Math.sin(a) * 0.5], [R(), a, 0.5], [0.45, 1.6, 0.25]);
    leaf.castShadow = true;
  }
  add(scene, new THREE.CylinderGeometry(0.9, 0.9, 0.12, 24), std(0xffffff, 0.5), [0.9, 2.1, back + 1.2]);
  add(scene, new THREE.CylinderGeometry(0.12, 0.12, 2.1, 10), std(0xffffff, 0.5), [0.9, 1.05, back + 1.2]);
  add(scene, new THREE.CylinderGeometry(0.4, 0.55, 0.9, 20), std(0xffcf4a, 0.6, { emissive: 0xffb030, emissiveIntensity: 0.5 }), [0.9, 2.65, back + 1.2]);
  const rugTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#7fd6f2';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 10;
    g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = '#ffcf4a';
    for (let x = 40; x < w; x += 44) for (let y = 40; y < h; y += 44) {
      g.beginPath();
      g.arc(x, y, 6, 0, Math.PI * 2);
      g.fill();
    }
  });
  add(scene, new THREE.CircleGeometry(5, 48), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.95 }), [0, 0.02, -1.5], [-Math.PI / 2, 0, 0], [1.3, 1, 1], false).receiveShadow = true;
  const shelf = new THREE.Group();
  shelf.position.set(right - 0.8, 0, -4);
  scene.add(shelf);
  const wood = std(0xffffff, 0.6);
  add(shelf, new THREE.BoxGeometry(1.4, 6.5, 4.2), wood, [0, 3.25, 0]);
  const bookCols = [0xff8a5b, 0x2f9bff, 0xffcf4a, 0x3fae6a, 0x24336b, 0xf6a98a];
  for (let r = 0; r < 3; r++) {
    add(shelf, new THREE.BoxGeometry(1.2, 0.12, 4.0), std(0xe6d8c6), [-0.15, 0.9 + r * 2, 0]);
    let z = -1.8;
    while (z < 1.6) {
      const t = 0.25 + R() * 0.2, hh = 1.1 + R() * 0.5;
      add(shelf, new THREE.BoxGeometry(0.9, hh, t), std(bookCols[Math.floor(R() * 6)], 0.7), [-0.25, 0.96 + r * 2 + hh / 2, z + t / 2]);
      z += t + 0.03;
    }
  }

  // ceiling lamp (round flush light) with a warm point light underneath
  const lampPos = new THREE.Vector3(0.4, ceil, 1.4);
  add(scene, new THREE.CylinderGeometry(1.35, 1.35, 0.12, 40), std(0xffffff, 0.5), [lampPos.x, ceil - 0.06, lampPos.z]);
  add(scene, new THREE.SphereGeometry(1.2, 40, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xfff0d0, emissiveIntensity: 1.4 }), [lampPos.x, ceil - 0.1, lampPos.z], [0, 0, 0], [1, 0.32, 1], false);
  const lampGlow = glow(0xfff2c8, 6.5, 0.55);
  lampGlow.position.set(lampPos.x, ceil - 0.5, lampPos.z);
  scene.add(lampGlow);

  scene.add(new THREE.HemisphereLight(0xfff1e0, 0x8a6a5a, 1.05));
  const lampLight = new THREE.PointLight(0xffe2b8, 75, 40, 1.6);
  lampLight.position.set(lampPos.x, ceil - 1.0, lampPos.z);
  lampLight.castShadow = true;
  lampLight.shadow.mapSize.set(2048, 2048);
  lampLight.shadow.bias = -0.0008;
  lampLight.shadow.normalBias = 0.02;
  lampLight.shadow.camera.near = 0.2;
  scene.add(lampLight);
  const key = new THREE.DirectionalLight(0xffe9d0, 1.1);
  key.position.set(6, 9, 10);
  key.target.position.set(0, 3, -2);
  shadowCfg(key, 12, 2048, 1, 40);
  scene.add(key, key.target);
  const moonFill = new THREE.PointLight(0x9fb8ff, 8, 14, 2);
  moonFill.position.set(wcx, wcy, back + 1.2);
  scene.add(moonFill);

  // Affan and the two geckos (one on the ceiling, one on the back wall)
  const aff = makeAffan();
  scene.add(aff.root);
  const mag = makeMagnifier();
  aff.parts.arms.R.hand.add(mag.group);
  mag.group.visible = false;
  const gecko = makeGecko();
  gecko.root.scale.setScalar(0.85);
  gecko.root.traverse((o) => (o.castShadow = false)); // a blocky point-light shadow on the ceiling reads badly
  scene.add(gecko.root);
  return { scene, aff, mag, gecko, lampPos, lampLight, lampGlow, ceil, win };
}

// ---------------------------------------------------------- micro world
// Affan, shrunk, stands on a toe pad. Lamellae are broad ridges covered in
// setae (hair-like stalks); each seta branches at the top into many tiny
// spatulae. The ceiling (a slab) can come down to touch the spatula tips.
export const MICRO = { tipY: 6.35, period: 9, spacing: 0.85 };

// lamella ridge profile: plateau (y = 0) with grooves between ridges
export function ridgeY(x) {
  const p = MICRO.period;
  const u = ((((x + p / 2) % p) + p) % p) / p; // 0..1 across one lamella, 0.5 = middle
  const d = Math.abs(u - 0.5) * 2; // 0 middle .. 1 edge
  return -1.8 * Math.pow(clamp((d - 0.72) / 0.28), 1.6);
}

function cylBetween(a, b, r0, r1, radial = 6) {
  const d = new THREE.Vector3().subVectors(b, a);
  const g = new THREE.CylinderGeometry(r1, r0, d.length(), radial, 1, true);
  g.translate(0, d.length() / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  g.applyQuaternion(q);
  g.translate(a.x, a.y, a.z);
  return g;
}

function spatulaGeo(center, dir, size) {
  // flat, slightly cupped fan-shaped pad lying parallel to the ceiling
  const s = new THREE.Shape();
  s.moveTo(-0.15, 0);
  s.quadraticCurveTo(-0.6, 0.7, 0, 0.9);
  s.quadraticCurveTo(0.6, 0.7, 0.15, 0);
  s.lineTo(-0.15, 0);
  const g = new THREE.ShapeGeometry(s, 6);
  g.rotateX(-Math.PI / 2); // into the xz plane, facing up (+y)
  g.scale(size, size, size);
  g.rotateY(-Math.atan2(dir.z, dir.x) + Math.PI / 2);
  g.translate(center.x, center.y, center.z);
  return g;
}

// One seta: curved stalk, then 4 branches x 3 sub-branches, 12 spatula tips.
function setaGeometry(detail) {
  const stalkPts = [new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(0.18, 1.8, 0), new THREE.Vector3(0.55, 3.8, 0), new THREE.Vector3(0.78, 5.3, 0)];
  const top = stalkPts[3];
  const stalk = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(stalkPts), detail ? 14 : 6, 0.058, detail ? 7 : 5);
  const parts = [stalk];
  const spat = [];
  const tips = [];
  const yT = MICRO.tipY;
  if (detail) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.5;
      const p1 = top.clone().add(new THREE.Vector3(Math.cos(a) * 0.42, 0.42, Math.sin(a) * 0.42));
      parts.push(cylBetween(top, p1, 0.04, 0.026, 5));
      for (let j = 0; j < 3; j++) {
        const b = a + (j - 1) * 0.75;
        const p2 = p1.clone().add(new THREE.Vector3(Math.cos(b) * 0.26, 0, Math.sin(b) * 0.26));
        p2.y = yT - 0.05;
        parts.push(cylBetween(p1, p2, 0.018, 0.01, 4));
        spat.push(spatulaGeo(new THREE.Vector3(p2.x, yT, p2.z), new THREE.Vector3(Math.cos(b), 0, Math.sin(b)), 0.24));
        tips.push(new THREE.Vector3(p2.x + Math.cos(b) * 0.1, yT, p2.z + Math.sin(b) * 0.1));
      }
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.3;
      const q = new THREE.Vector3(top.x + Math.cos(a) * 0.38, yT - 0.04, top.z + Math.sin(a) * 0.38);
      parts.push(cylBetween(top, q, 0.04, 0.018, 4));
      spat.push(new THREE.CircleGeometry(0.2, 8).rotateX(-Math.PI / 2).translate(q.x, yT, q.z));
      tips.push(q.clone().setY(yT));
    }
  }
  const body = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false);
  body.computeVertexNormals();
  return { body, spat: mergeGeometries(spat.map((g) => g.index ? g.toNonIndexed() : g), false), tips };
}

export function buildMicro() {
  const scene = new THREE.Scene();
  const bgTex = canvasTex(64, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#071a3e');
    gr.addColorStop(0.55, '#0c3a6e');
    gr.addColorStop(1, '#14639a');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  scene.background = bgTex;
  scene.fog = new THREE.Fog(0x0e3f72, 12, 52);

  scene.add(new THREE.HemisphereLight(0x9fdcff, 0xd0806a, 0.75));
  const key = new THREE.DirectionalLight(0xfff0e0, 2.3);
  key.position.set(8, 14, 10);
  key.target.position.set(0, 2, 0);
  shadowCfg(key, 14, 2048, 1, 60);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x7fe3ff, 2.2);
  rim.position.set(-10, 6, -12);
  scene.add(rim);

  // toe-pad skin: broad lamella ridges
  const skinTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d98a70';
    g.fillRect(0, 0, w, h);
    const R = rng(6);
    for (let i = 0; i < 160; i++) {
      g.strokeStyle = `rgba(255,225,205,${0.25 + R() * 0.3})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(R() * w, R() * h, 6 + R() * 10, 0, Math.PI * 2);
      g.stroke();
    }
  }, [16, 16]);
  const geo = new THREE.PlaneGeometry(120, 120, 480, 8);
  geo.rotateX(-Math.PI / 2);
  const gp = geo.attributes.position;
  for (let i = 0; i < gp.count; i++) gp.setY(i, ridgeY(gp.getX(i)));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, std(0xffffff, 0.75, { map: skinTex, emissive: 0x3a120a, emissiveIntensity: 0.3 }));
  ground.receiveShadow = true;
  scene.add(ground);

  // setae field (instanced). Near the camera paths: detailed setae; further: simple.
  const det = setaGeometry(true), simp = setaGeometry(false);
  const setaMat = std(0x9fe2ff, 0.28, { emissive: 0x0f6a9a, emissiveIntensity: 0.45 });
  const spatMat = std(0xffd36b, 0.4, { emissive: 0xff9a2a, emissiveIntensity: 0.25, side: THREE.DoubleSide });
  const R = rng(17);
  const nearList = [], farList = [];
  const S = MICRO.spacing;

  const CLEAR = new THREE.Vector3(0, 0, 0); // Affan's spot
  for (let x = -34; x <= 34; x += S) {
    for (let z = -34; z <= 26; z += S) {
      const px = x + (R() - 0.5) * S * 0.6, pz = z + (R() - 0.5) * S * 0.6;
      if (ridgeY(px) < -0.02) continue; // no setae in the grooves
      const dc = Math.hypot(px - CLEAR.x, pz - CLEAR.z);
      if (dc < 3.4) continue;
      if (Math.hypot(px - 2.0, pz + 1.4) < 1.6) continue; // keep the hero seta (2, -1.4) clear
      const m = new THREE.Matrix4().compose(new THREE.Vector3(px, 0, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler((R() - 0.5) * 0.06, (R() - 0.5) * 0.5, (R() - 0.5) * 0.06)), new THREE.Vector3(1, 1, 1));
      (Math.hypot(px - 1, pz + 2) < 13 ? nearList : farList).push(m);
    }
  }
  const mk = (g, mat, list) => {
    const im = new THREE.InstancedMesh(g, mat, list.length);
    list.forEach((m, i) => im.setMatrixAt(i, m));
    im.castShadow = mat === setaMat;
    im.receiveShadow = true;
    im.frustumCulled = false;
    scene.add(im);
    return im;
  };
  mk(det.body, setaMat, nearList);
  mk(det.spat, spatMat, nearList);
  mk(simp.body, setaMat, farList);
  mk(simp.spat, spatMat, farList);

  // contact points (one per spatula), activated by a spreading wave
  const tipPos = [], tipR = [], tipRnd = [];
  const v = new THREE.Vector3();
  const pushTips = (list, tips) => {
    for (const m of list) for (const t of tips) {
      v.copy(t).applyMatrix4(m);
      tipPos.push(v.x, v.y - 0.1, v.z);
      tipR.push(Math.hypot(v.x - 1.2, v.z + 1.5));
      tipRnd.push(R());
    }
  };
  pushTips(nearList, det.tips);
  pushTips(farList, simp.tips);
  pushTips([new THREE.Matrix4().makeTranslation(2.0, 0, -1.4)], det.tips); // the hero seta
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(tipPos, 3));
  cg.setAttribute('aR', new THREE.Float32BufferAttribute(tipR, 1));
  cg.setAttribute('aRnd', new THREE.Float32BufferAttribute(tipRnd, 1));
  const contactMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, // glows read through the setae
    uniforms: { uTime: { value: 0 }, uWave: { value: -1 }, uOn: { value: 0 }, uFocus: { value: 0 } },
    vertexShader: `attribute float aR; attribute float aRnd; uniform float uTime, uWave, uOn, uFocus; varying float vA; varying float vHot;
      void main(){
        float on = smoothstep(uWave, uWave - 2.5, aR) * uOn;
        float focus = uFocus * smoothstep(4.5, 2.5, aR);
        vA = max(on, focus) * (0.65 + 0.35 * sin(uTime * 6.0 + aRnd * 40.0));
        vHot = smoothstep(uWave - 0.2, uWave - 1.5, aR);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (24.0 + 10.0 * aRnd) * (12.0 / -mv.z);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; varying float vHot; void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p);
      float core = smoothstep(0.22, 0.12, d); float halo = smoothstep(0.5, 0.15, d);
      float a = max(core, halo * 0.55) * vA; if (a < 0.003) discard;
      vec3 c = mix(vec3(1.0, 0.82, 0.25), vec3(1.0, 1.0, 0.92), core);
      c = mix(c, vec3(0.6, 0.95, 1.0), vHot * 0.35);
      gl_FragColor = vec4(c, a); }`,
  });
  const contacts = new THREE.Points(cg, contactMat);
  contacts.frustumCulled = false;
  scene.add(contacts);

  // the ceiling slab (painted plaster, seen from below), comes down onto the tips
  const slabTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8fa6c8';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 22) for (let x = (y / 22) % 2 ? 11 : 0; x < w; x += 22) {
      g.fillStyle = 'rgba(200,220,245,0.55)';
      g.beginPath();
      g.arc(x, y, 7, 0, Math.PI * 2);
      g.fill();
    }
  }, [30, 30]);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(120, 2, 120), std(0xffffff, 0.8, { map: slabTex, emissive: 0x6a88b8, emissiveIntensity: 0.55 }));
  slab.receiveShadow = true;
  scene.add(slab);
  const setSlab = (gap) => {
    slab.visible = gap < 30;
    slab.position.y = MICRO.tipY + 1 + 0.03 + gap;
  };
  setSlab(99);

  // floating micro specks
  const specks = [];
  for (let i = 0; i < 260; i++) specks.push((R() - 0.5) * 50, R() * 9, (R() - 0.5) * 50);
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(specks, 3));
  const speckPts = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xbff4ff, size: 0.08, transparent: true, opacity: 0.6, depthWrite: false }));
  scene.add(speckPts);

  const aff = makeAffan();
  scene.add(aff.root);
  const mag = makeMagnifier();
  aff.parts.arms.R.hand.add(mag.group);

  // the hero seta right next to Affan, for the branching close-up
  const hero = new THREE.Vector3(2.0, 0, -1.4);
  const heroMesh = new THREE.Mesh(det.body, setaMat);
  heroMesh.position.copy(hero);
  heroMesh.castShadow = true;
  scene.add(heroMesh);
  const heroSpatMat = spatMat.clone();
  const heroSpat = new THREE.Mesh(det.spat, heroSpatMat);
  heroSpat.position.copy(hero);
  scene.add(heroSpat);
  const heroTips = det.tips.map((t) => t.clone().add(hero));

  return { scene, aff, mag, contacts, contactMat, slab, setSlab, spatMat, heroSpatMat, hero, heroTips, speckPts, setaMat };
}

// ------------------------------------------------------------- giant toe
// One gecko toe, giant, lying on a smooth wall surface. Its shape is a smooth
// loft along a bendable centreline, so it can peel up from the tip
// (digital hyperextension) the way real geckos release their grip.
export const TOE = { len: 22, x0: -12, lamellae: 12 };

export function buildToe() {
  const scene = new THREE.Scene();
  const bgTex = canvasTex(64, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#0b2a5c');
    gr.addColorStop(0.6, '#17609e');
    gr.addColorStop(1, '#3f9fd0');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  scene.background = bgTex;
  scene.fog = new THREE.Fog(0x2a74b0, 34, 120);
  scene.add(new THREE.HemisphereLight(0xdff6ff, 0x8a7a8a, 1.1));
  const key = new THREE.DirectionalLight(0xfff0e0, 2.5);
  key.position.set(10, 22, 16);
  key.target.position.set(0, 0, 0);
  shadowCfg(key, 24, 2048, 1, 80);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x7fe3ff, 2.0);
  rim.position.set(-12, 8, -14);
  scene.add(rim);

  // smooth wall surface with faint tile lines
  const wallTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#dfe8f4';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(140,170,210,0.4)';
    g.lineWidth = 3;
    g.strokeRect(0, 0, w, h);
  }, [24, 24]);
  const surf = add(scene, new THREE.PlaneGeometry(200, 200), std(0xffffff, 0.35, { map: wallTex }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  surf.receiveShadow = true;

  // foot the toe comes from
  const backMat = std(0xffffff, 0.6, { map: canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d4a684';
    g.fillRect(0, 0, w, h);
    const R = rng(8);
    for (let i = 0; i < 120; i++) {
      g.fillStyle = `rgba(255,236,215,${0.2 + R() * 0.3})`;
      g.beginPath();
      g.arc(R() * w, R() * h, 2 + R() * 3, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(150,100,70,${0.1 + R() * 0.15})`;
      g.beginPath();
      g.arc(R() * w, R() * h, 6 + R() * 10, 0, Math.PI * 2);
      g.fill();
    }
  }, [3, 2]), emissive: 0x3a1c0c, emissiveIntensity: 0.18 });
  add(scene, new THREE.SphereGeometry(1, 40, 24), backMat, [TOE.x0 - 4.0, 1.8, 0], [0, 0, 0], [6.5, 2.7, 7.5]);

  // toe loft: rings along s (0 = base, 1 = tip)
  const NS = 72, NR = 28;
  const widthAt = (s) => 1.4 + 1.25 * Math.sin(Math.PI * clamp(s * 0.85 + 0.1)) - 0.5 * Math.pow(Math.max(0, s - 0.9) / 0.1, 2); // half-width
  const thickAt = (s) => 2.5 - 1.1 * s - 0.6 * Math.pow(Math.max(0, s - 0.9) / 0.1, 2); // full height
  const pos = new Float32Array(NS * NR * 3), uv = new Float32Array(NS * NR * 2), idx = [];
  for (let i = 0; i < NS; i++) for (let j = 0; j < NR; j++) {
    uv.set([j / (NR - 1), i / (NS - 1)], (i * NR + j) * 2);
    if (i < NS - 1 && j < NR - 1) {
      const a = i * NR + j, b = a + NR;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  // texture: x around the ring (0.5 = top), y along the toe. Top = scaly skin,
  // underside = pink pad with lamella rows.
  const toeTex = canvasTex(512, 1024, (g, w, h) => {
    for (let x = 0; x < w; x++) {
      const top = -Math.cos((x / w) * Math.PI * 2);
      g.fillStyle = top > -0.15 ? '#d4a684' : '#eaa58e';
      g.fillRect(x, 0, 1, h);
    }
    const R = rng(5);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = `rgba(255,236,215,${0.2 + R() * 0.3})`;
      g.beginPath();
      g.arc(w * (0.3 + R() * 0.4), R() * h, 2 + R() * 4, 0, Math.PI * 2);
      g.fill();
    }
  });
  toeTex.flipY = false;
  const toeMesh = new THREE.Mesh(geo, std(0xffffff, 0.55, { map: toeTex, emissive: 0x3a1c0c, emissiveIntensity: 0.18 }));
  toeMesh.castShadow = toeMesh.receiveShadow = true;
  toeMesh.frustumCulled = false;
  scene.add(toeMesh);
  const claw = add(scene, new THREE.ConeGeometry(0.32, 1.8, 14), std(0xf3ebe0, 0.3), [0, 0, 0]);

  // lamellae: pink plates under the pad, each with a contact glow on the wall
  const lamMat = std(0xf7c0ad, 0.5, { emissive: 0x4a1d0e, emissiveIntensity: 0.18 });
  const glows = [];
  for (let i = 0; i < TOE.lamellae; i++) {
    const s = 0.4 + (i / (TOE.lamellae - 1)) * 0.52;
    const lam = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.42, widthAt(s) * 1.9, 3, 0.18), lamMat);
    lam.castShadow = true;
    scene.add(lam);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0, depthWrite: false });
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.8, widthAt(s) * 2.3), mat);
    strip.rotation.x = -Math.PI / 2;
    scene.add(strip);
    const halo = glow(0xffe27a, 2.6, 0);
    scene.add(halo);
    glows.push({ s, lam, mesh: strip, halo, i, q: 0, lift: 0, contact: 1 });
  }

  const aff = makeAffan();
  scene.add(aff.root);

  // centreline from bend angles: angle(s) grows past the peel front
  const P = [], ANG = [];
  const _v = new THREE.Vector3();
  function centre(k) {
    let x = TOE.x0, y = 0, a = 0;
    const ds = 1 / (NS - 1);
    const front = 1 - k * 1.05; // peel front moves tip -> base
    for (let i = 0; i < NS; i++) {
      const s = i / (NS - 1);
      P[i] = [x, y];
      ANG[i] = a;
      const curv = s > front ? 2.6 * clamp((s - front) / 0.12) : 0; // radians per unit s
      a = Math.min(1.0, a + curv * ds);
      x += Math.cos(a) * TOE.len * ds;
      y += Math.sin(a) * TOE.len * ds;
    }
  }
  const at = (s) => {
    const f = s * (NS - 1), i = Math.min(NS - 2, Math.floor(f)), r = f - i;
    return [lerpN(P[i][0], P[i + 1][0], r), lerpN(P[i][1], P[i + 1][1], r), lerpN(ANG[i], ANG[i + 1], r)];
  };
  function peel(k) {
    centre(k);
    for (let i = 0; i < NS; i++) {
      const s = i / (NS - 1);
      const [x, y] = P[i], a = ANG[i];
      const hw = Math.max(0.05, widthAt(s)), th = Math.max(0.05, thickAt(s));
      const nx = -Math.sin(a), ny = Math.cos(a); // up normal of the toe
      const lift = 0.42; // pad sits on the lamellae
      for (let j = 0; j < NR; j++) {
        const t = -Math.PI / 2 + (j / (NR - 1)) * Math.PI * 2; // seam under the pad
        const sy = Math.sin(t), cz = Math.cos(t);
        const up = sy > 0 ? sy * th * 0.75 : sy * th * 0.25; // flat-ish underside
        const cy = th * 0.25 + lift;
        _v.set(x + nx * (cy + up), y + ny * (cy + up), cz * hw * (sy < 0 ? 1 : 0.92 + 0.08 * (1 - sy)));
        pos.set([_v.x, _v.y, _v.z], (i * NR + j) * 3);
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
    const [tx, ty, ta] = at(0.985);
    claw.position.set(tx + Math.cos(ta) * 0.6 - Math.sin(ta) * 0.9, ty + Math.sin(ta) * 0.6 + Math.cos(ta) * 0.9, 0);
    claw.rotation.set(0, 0, ta - Math.PI / 2 - 0.35);
    for (const g of glows) {
      const [x, y, a] = at(g.s);
      g.lam.position.set(x - Math.sin(a) * 0.21, y + Math.cos(a) * 0.21, 0);
      g.lam.rotation.z = a;
      g.lift = y;
      g.contact = clamp(1 - y / 0.25);
      g.mesh.position.set(x, 0.02, 0);
      g.halo.position.set(x, 0.25, widthAt(g.s) * 1.15);
    }
    return glows;
  }
  peel(0);
  return { scene, aff, glows, peel, toeMesh };
}
const lerpN = (a, b, k) => a + (b - a) * k;

// ----------------------------------------------------------------- outro
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
  // the backdrop is a wall the gecko can climb across
  const wall = add(scene, new THREE.PlaneGeometry(16, 28.5), new THREE.MeshBasicMaterial({ map: bg }), [0, 2.5, -4], [0, 0, 0], [1, 1, 1], false);
  wall.renderOrder = -1;
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
  const gecko = makeGecko();
  gecko.root.scale.setScalar(1.3);
  scene.add(gecko.root);
  return { scene, aff, gecko };
}

export { RoundedBoxGeometry };
