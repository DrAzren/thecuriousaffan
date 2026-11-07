// Episode 022 sets. Everything is procedural and built once after the fonts
// load (note textures draw text):
//   studio  – green banknote-pattern backdrop with floating notes (hook, recap,
//             polymer notes, piggy bank, outro, cover)
//   field   – sunny cotton field
//   room    – Affan's desk room (ordinary paper, raised ink, night: watermark)
//   factory – paper mill, printing press, numbering line, cutting table
//   town    – toy diorama: Bank Negara Malaysia, a bank, the van
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, glow, makeSky, makeCar, makeTree, makeHouse } from '../../shared/props.js';
import { NOTE_STYLES, NW, NH, makeNote, noteGeo, noteTexture, backlitTexture, bumpTexture, sheetTexture, sheetSize, SHEET } from './notes.js';

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

function shadowCfg(light, size, map = 2048) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  Object.assign(light.shadow.camera, { left: -size, right: size, top: size, bottom: -size, near: 0.5, far: 60 });
  light.shadow.normalBias = 0.03;
  light.shadow.bias = -0.0005;
}

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Radial backdrop with faint banknote line-work rings.
function backdrop(c0, c1, c2) {
  return canvasTex(540, 960, (g) => {
    const gr = g.createRadialGradient(270, 420, 30, 270, 460, 720);
    gr.addColorStop(0, c0);
    gr.addColorStop(0.42, c1);
    gr.addColorStop(1, c2);
    g.fillStyle = gr;
    g.fillRect(0, 0, 540, 960);
    g.strokeStyle = 'rgba(255,255,255,0.10)';
    g.lineWidth = 2;
    for (let r = 60; r < 900; r += 26) {
      g.beginPath();
      for (let i = 0; i <= 240; i++) {
        const a = (i / 240) * Math.PI * 2;
        const rr = r + 7 * Math.sin(a * 12 + r * 0.05);
        const x = 270 + rr * Math.cos(a), y = 470 + rr * Math.sin(a);
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
  });
}

function studioLights(scene, hemi = 1.5) {
  scene.add(new THREE.HemisphereLight(0xf2fff4, 0x4f7d6a, hemi));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.5);
  key.position.set(3, 6, 8);
  shadowCfg(key, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd8ffe8, 2.0);
  rim.position.set(-6, 5, -6);
  scene.add(rim);
  return key;
}

// ================================================================== studio
export function buildStudio() {
  const scene = new THREE.Scene();
  const bgs = {
    green: backdrop('#b9f5c9', '#3cc47c', '#0f6a52'),
    blue: backdrop('#cfe6ff', '#4f93f0', '#1b3f9a'),
    pink: backdrop('#ffe3ef', '#ff9cc4', '#c2457e'),
    gold: backdrop('#fff6c8', '#ffc94d', '#d0770f'),
  };
  scene.background = bgs.green;
  studioLights(scene);
  const halo = glow(0xfff2b0, 9, 0.4);
  halo.position.set(0, 2.6, -2);
  scene.add(halo);
  const aff = makeAffan();
  scene.add(aff.root);
  const hero = makeNote(NOTE_STYLES.green, 1.25, { serial: 'AF 0220221' });
  scene.add(hero);
  // floating notes around Affan: [style, x, y, z, rx, ry, rz, size]
  const FLOAT = [
    ['blue', -2.05, 4.35, -1.2, 0.2, 0.5, 0.45, 1.0],
    ['red', 2.1, 3.65, -0.9, -0.25, -0.6, -0.35, 1.05],
    ['purple', -2.0, 1.25, 0.2, 0.3, 0.7, -0.25, 0.95],
    ['orange', 2.0, 1.5, 0.1, -0.2, -0.55, 0.3, 1.0],
    ['red', -2.6, 6.2, -2.4, 0.1, 0.4, -0.2, 0.9],
    ['purple', 2.7, 6.0, -2.4, -0.1, -0.4, 0.25, 0.9],
  ];
  const floaters = FLOAT.map(([s, x, y, z, rx, ry, rz, w], i) => {
    const n = makeNote(NOTE_STYLES[s], w, { serial: 'AF ' + String(1000000 + i * 7919) });
    n.position.set(x, y, z);
    n.rotation.set(rx, ry, rz);
    n.userData.base = [x, y, z, rx, ry, rz];
    scene.add(n);
    return n;
  });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(3, 48), new THREE.ShadowMaterial({ opacity: 0.25 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // polymer notes (RM1 blue, RM5 purple): glossy, flexible
  const polyMat = (s) => new THREE.MeshPhysicalMaterial({ map: noteTexture(NOTE_STYLES[s], 4, s === 'blue' ? 'AF 1000001' : 'AF 5000005'), roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide });
  const poly = ['blue', 'purple'].map((s) => {
    const m = new THREE.Mesh(noteGeo(1.7, 0), polyMat(s));
    m.castShadow = true;
    m.userData.rest = m.geometry.attributes.position.array.slice();
    scene.add(m);
    return m;
  });
  const sheen = new THREE.PointLight(0xffffff, 0, 6, 2);
  scene.add(sheen);

  // piggy bank on a pedestal
  const piggy = new THREE.Group();
  const pink = std(0xff8fb8, 0.45, { emissive: 0x401020, emissiveIntensity: 0.15 });
  const pinkD = std(0xf06a9a, 0.5);
  add(piggy, new THREE.SphereGeometry(0.62, 40, 28), pink, [0, 0.62, 0], [0, 0, 0], [1.25, 1, 1]);
  add(piggy, new THREE.CylinderGeometry(0.2, 0.22, 0.2, 24), pinkD, [0, 0.62, 0.8], [Math.PI / 2, 0, 0]);
  for (const x of [-0.08, 0.08]) add(piggy, new THREE.SphereGeometry(0.035, 10, 8), std(0x7a2442), [x, 0.64, 0.905]);
  for (const x of [-0.3, 0.3]) add(piggy, new THREE.ConeGeometry(0.14, 0.24, 16), pinkD, [x, 1.17, 0.25], [0.3, 0, x * -0.6]);
  for (const x of [-0.25, 0.25]) {
    add(piggy, new THREE.SphereGeometry(0.07, 14, 10), std(0x1a1a22, 0.3), [x, 0.82, 0.62]);
    add(piggy, new THREE.SphereGeometry(0.022, 8, 6), std(0xffffff, 0.2), [x + 0.02, 0.85, 0.68]);
  }
  for (const [x, z] of [[-0.42, 0.3], [0.42, 0.3], [-0.42, -0.3], [0.42, -0.3]]) add(piggy, new THREE.CylinderGeometry(0.12, 0.13, 0.25, 16), pinkD, [x, 0.12, z]);
  add(piggy, new THREE.TorusGeometry(0.08, 0.025, 8, 16, Math.PI * 1.5), pinkD, [0, 0.75, -0.78], [0, Math.PI / 2, 0]);
  add(piggy, new THREE.BoxGeometry(0.06, 0.03, 0.62), std(0x3a0f20, 0.6), [0, 1.235, 0]);
  const pedestal = new THREE.Group();
  add(pedestal, new THREE.CylinderGeometry(0.75, 0.85, 1.5, 32), std(0xfff4e0, 0.5), [0, 0.75, 0]);
  add(pedestal, new THREE.CylinderGeometry(0.85, 0.85, 0.08, 32), std(0xffc94d, 0.4), [0, 1.52, 0]);
  piggy.position.y = 1.56;
  piggy.rotation.y = Math.PI / 2 + 0.35;
  pedestal.add(piggy);
  pedestal.position.set(-1.55, 0, 0.9);
  pedestal.visible = false;
  scene.add(pedestal);
  const slotWorld = () => piggy.localToWorld(new THREE.Vector3(0, 1.25, 0));

  return { scene, aff, hero, floaters, bgs, poly, sheen, pedestal, piggy, slotWorld, halo };
}

// ============================================================ cotton field
function cottonPlant(R, geos, s = 1) {
  const m = new THREE.Matrix4();
  const put = (geo, key, pos, rot = [0, 0, 0], sc = [1, 1, 1]) => {
    const g = geo.clone();
    m.compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...sc));
    g.applyMatrix4(m);
    geos[key].push(g);
  };
  return { put };
}

export function buildField() {
  const scene = new THREE.Scene();
  const sky = makeSky({ top: 0x3a86e6, mid: 0x6fb2f2, horizon: 0xd6efff, bottom: 0x8fcf6a, radius: 300 });
  scene.add(sky);
  scene.fog = new THREE.Fog(0xcfe9ff, 30, 120);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7a9a5a, 1.5));
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.8);
  sun.position.set(6, 12, 8);
  shadowCfg(sun, 9);
  scene.add(sun);
  add(scene, new THREE.PlaneGeometry(400, 400), std(0x86c95a, 1), [0, 0, 0], [-Math.PI / 2, 0, 0]).castShadow = false;
  // furrows
  for (let z = -40; z < 6; z += 1.3) add(scene, new THREE.BoxGeometry(60, 0.08, 0.5), std(0x9a7650, 1), [0, 0.02, z], [0, 0, 0], [1, 1, 1], false).receiveShadow = true;

  const R = rng(22);
  const geos = { stem: [], leaf: [], boll: [], calyx: [] };
  const stemG = new THREE.CylinderGeometry(0.03, 0.045, 1, 6);
  const leafG = new THREE.SphereGeometry(0.17, 8, 6);
  const bollG = new THREE.SphereGeometry(0.11, 8, 6);
  const calyxG = new THREE.ConeGeometry(0.12, 0.12, 6);
  const { put } = cottonPlant(R, geos);
  const plant = (x, z, h) => {
    put(stemG, 'stem', [x, h / 2, z], [0, 0, 0], [1, h, 1]);
    const n = 3 + Math.floor(R() * 2);
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, y = h * (0.45 + 0.55 * (i / n)), l = 0.25 + R() * 0.2;
      const bx = x + Math.cos(a) * l, bz = z + Math.sin(a) * l;
      put(stemG, 'stem', [(x + bx) / 2, y - 0.08, (z + bz) / 2], [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9], [0.6, l * 1.3, 0.6]);
      put(leafG, 'leaf', [bx + Math.cos(a + 1) * 0.12, y - 0.1, bz + Math.sin(a + 1) * 0.12], [R(), R(), R()], [1.2, 0.35, 1]);
      // fluffy boll: 4 lobes on a brown calyx
      put(calyxG, 'calyx', [bx, y - 0.02, bz], [Math.PI, 0, 0]);
      for (let k = 0; k < 3; k++) {
        const b = (k / 3) * Math.PI * 2 + a;
        put(bollG, 'boll', [bx + Math.cos(b) * 0.07, y + 0.1 + (k % 2) * 0.03, bz + Math.sin(b) * 0.07], [0, 0, 0], [1, 0.95, 1]);
      }
      put(bollG, 'boll', [bx, y + 0.18, bz], [0, 0, 0], [0.9, 0.9, 0.9]);
    }
  };
  for (let z = -22; z < 5; z += 1.3)
    for (let x = -13 + z * 0.3; x < 13 - z * 0.3; x += 0.95 + R() * 0.35) {
      if (Math.abs(x) < 1.1 && z > -1.6 && z < 1.4) continue;
      plant(x + R() * 0.2, z + R() * 0.2, 1.3 + R() * 0.6);
    }
  const mats = { stem: std(0x5f7d35, 0.8), leaf: std(0x3f9d45, 0.7), boll: std(0xffffff, 1, { emissive: 0xffffff, emissiveIntensity: 0.08 }), calyx: std(0x7a4a2a, 0.9) };
  for (const k of Object.keys(geos)) {
    const mesh = new THREE.Mesh(mergeGeometries(geos[k]), mats[k]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
  // clouds
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 5; k++) add(c, new THREE.SphereGeometry(2 + R() * 2, 16, 12), std(0xffffff, 1, { emissive: 0xffffff, emissiveIntensity: 0.35 }), [k * 2.6 - 5, R() * 1.2, R()], [0, 0, 0], [1, 0.7, 1], false);
    c.position.set(-60 + i * 15 + R() * 6, 22 + R() * 10, -90 - R() * 40);
    scene.add(c);
  }
  // Affan's own cotton boll (the one he picks)
  const boll = new THREE.Group();
  for (let k = 0; k < 5; k++) add(boll, new THREE.SphereGeometry(0.13, 16, 12), mats.boll, [Math.cos(k * 1.26) * 0.09 * (k < 4), 0.08 + (k === 4) * 0.08, Math.sin(k * 1.26) * 0.09 * (k < 4)]);
  add(boll, new THREE.ConeGeometry(0.14, 0.14, 8), mats.calyx, [0, -0.04, 0], [Math.PI, 0, 0]);
  scene.add(boll);
  const aff = makeAffan();
  scene.add(aff.root);
  return { scene, sky, sun, aff, boll };
}

// ==================================================================== room
export function buildRoom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfde3c8);
  const hemi = new THREE.HemisphereLight(0xfff6ea, 0x8a6a50, 1.4);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff0dc, 2.4);
  key.position.set(3, 7, 6);
  shadowCfg(key, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xcfe4ff, 1.4);
  rim.position.set(-5, 5, -4);
  scene.add(rim);
  const wallMat = std(0xffd9b0, 0.95);
  add(scene, new THREE.PlaneGeometry(30, 14), wallMat, [0, 7, -3.2], [0, 0, 0], [1, 1, 1], false).receiveShadow = true;
  add(scene, new THREE.PlaneGeometry(30, 20), std(0xc58f5e, 0.8), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  // window
  const winMat = std(0xbfe6ff, 0.6, { emissive: 0x9fd6ff, emissiveIntensity: 0.6 });
  const win = add(scene, new THREE.PlaneGeometry(2.6, 2.0), winMat, [2.4, 4.6, -3.15], [0, 0, 0], [1, 1, 1], false);
  for (const [w, h, x, y] of [[2.8, 0.12, 2.4, 5.6], [2.8, 0.12, 2.4, 3.6], [0.12, 2.1, 1.1, 4.6], [0.12, 2.1, 3.7, 4.6], [0.08, 2.0, 2.4, 4.6]]) add(scene, new THREE.BoxGeometry(w, h, 0.1), std(0xffffff, 0.5), [x, y, -3.1]);
  // poster: "SAINS" stars
  add(scene, new THREE.PlaneGeometry(1.6, 2.0), std(0x8fd8ff, 0.8), [-2.6, 4.7, -3.15], [0, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.CircleGeometry(0.45, 5), std(0xffd84a, 0.6), [-2.6, 4.9, -3.12], [0, 0, 0.3], [1, 1, 1], false);
  // desk
  const wood = std(0xb8774a, 0.6);
  add(scene, new RoundedBoxGeometry(3.4, 0.14, 1.7, 2, 0.05), wood, [0, 1.55, 0.35]);
  for (const [x, z] of [[-1.55, -0.35], [1.55, -0.35], [-1.55, 1.05], [1.55, 1.05]]) add(scene, new THREE.BoxGeometry(0.12, 1.5, 0.12), std(0x8a5432, 0.6), [x, 0.75, z]);
  // ordinary paper stack + pencil
  const paper = new THREE.Group();
  for (let i = 0; i < 9; i++) add(paper, new THREE.BoxGeometry(0.85, 0.018, 1.15), std(0xffffff, 0.9), [Math.sin(i * 2.1) * 0.025, 0.01 + i * 0.02, Math.cos(i * 1.7) * 0.025], [0, Math.sin(i) * 0.04, 0]);
  const lines = canvasTex(256, 340, (g) => {
    g.fillStyle = '#fff';
    g.fillRect(0, 0, 256, 340);
    g.strokeStyle = '#9fc6ff';
    g.lineWidth = 3;
    for (let y = 40; y < 340; y += 24) {
      g.beginPath();
      g.moveTo(10, y);
      g.lineTo(246, y);
      g.stroke();
    }
    g.strokeStyle = '#ff9a9a';
    g.beginPath();
    g.moveTo(40, 0);
    g.lineTo(40, 340);
    g.stroke();
  });
  add(paper, new THREE.PlaneGeometry(0.85, 1.15), std(0xffffff, 0.9, { map: lines }), [0, 0.2, 0], [-Math.PI / 2, 0, 0]);
  paper.position.set(0.95, 1.62, 0.45);
  paper.rotation.y = -0.2;
  scene.add(paper);
  const pencil = new THREE.Group();
  add(pencil, new THREE.CylinderGeometry(0.035, 0.035, 0.8, 6), std(0xffc23d, 0.5), [0, 0, 0]);
  add(pencil, new THREE.ConeGeometry(0.035, 0.1, 6), std(0xf0c9a0, 0.6), [0, 0.45, 0]);
  add(pencil, new THREE.CylinderGeometry(0.036, 0.036, 0.08, 6), std(0xff8fa8, 0.6), [0, -0.44, 0]);
  pencil.position.set(0.25, 1.66, 0.85);
  pencil.rotation.set(0, 0, Math.PI / 2 + 0.5);
  scene.add(pencil);
  // the note on the desk, with raised ink (bump)
  const deskNote = makeNote(NOTE_STYLES.green, 1.35, { curl: 0.0, serial: 'AF 0220221', mat: { bumpMap: bumpTexture(NOTE_STYLES.green), bumpScale: 6, roughness: 0.55 } });
  deskNote.rotation.set(-Math.PI / 2, 0, 0.12);
  deskNote.position.set(-0.45, 1.63, 0.6);
  scene.add(deskNote);
  const graze = new THREE.PointLight(0xfff1d0, 0, 3, 2);
  scene.add(graze);
  // night: a lamp glowing behind the raised note
  const lamp = glow(0xfff1c8, 4.2, 1);
  lamp.visible = false;
  scene.add(lamp);
  const lampCore = add(scene, new THREE.SphereGeometry(0.28, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfffbe8 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  lampCore.visible = false;
  const nightNote = makeNote(NOTE_STYLES.green, 1.25, { serial: 'AF 0220221' });
  nightNote.material.color.set(0x6f7a8c);
  const additive = (map) => new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const markPlane = new THREE.Mesh(noteGeo(1.25), additive(backlitTexture('mark')));
  const threadPlane = new THREE.Mesh(noteGeo(1.25), additive(backlitTexture('thread')));
  markPlane.position.z = threadPlane.position.z = 0.004;
  nightNote.add(markPlane, threadPlane);
  nightNote.visible = false;
  scene.add(nightNote);
  const aff = makeAffan();
  aff.root.position.set(0, 0, -0.95);
  scene.add(aff.root);
  function setNight(on) {
    scene.background = new THREE.Color(on ? 0x0b1230 : 0xfde3c8);
    wallMat.color.set(on ? 0x27305c : 0xffd9b0);
    winMat.color.set(on ? 0x1a2552 : 0xbfe6ff);
    winMat.emissive.set(on ? 0x101a40 : 0x9fd6ff);
    hemi.intensity = on ? 0.7 : 1.4;
    key.intensity = on ? 1.1 : 2.4;
    key.color.set(on ? 0xffd9a8 : 0xfff0dc);
    rim.intensity = on ? 1.6 : 1.4;
    rim.color.set(on ? 0x8fb0ff : 0xcfe4ff);
    lamp.visible = lampCore.visible = nightNote.visible = on;
    deskNote.visible = !on;
  }
  return { scene, aff, paper, pencil, deskNote, graze, lamp, lampCore, nightNote, markPlane, threadPlane, setNight };
}

// ================================================================= factory
// Areas along x: mill (-30), press (0), numbering (30), cutting (60).
export const AREA = { mill: -30, press: 0, number: 30, cut: 60 };

function paperTex() {
  const t = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#f7f4ec';
    g.fillRect(0, 0, w, h);
    const R = rng(4);
    g.lineWidth = 1;
    for (let i = 0; i < 260; i++) {
      const x = R() * w, y = R() * h, a = R() * Math.PI, l = 6 + R() * 14;
      g.strokeStyle = 'rgba(160,165,190,0.35)';
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function buildFactory() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffe7c2);
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0x8090a8, 1.45));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.5);
  key.position.set(4, 9, 7);
  shadowCfg(key, 8);
  scene.add(key);
  scene.add(key.target);
  const rim = new THREE.DirectionalLight(0xcfe4ff, 1.3);
  rim.position.set(-6, 6, -5);
  scene.add(rim);
  const focus = (x) => {
    key.position.set(x + 4, 9, 7);
    key.target.position.set(x, 0, 0);
    rim.position.set(x - 6, 6, -5);
  };
  add(scene, new THREE.PlaneGeometry(200, 40), std(0xd5dbe6, 0.85), [20, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  // back wall with coloured panels per area
  add(scene, new THREE.PlaneGeometry(200, 16), std(0xffe2b8, 0.95), [20, 8, -6], [0, 0, 0], [1, 1, 1], false).receiveShadow = true;
  for (const [x, c] of [[AREA.mill, 0x8fded2], [AREA.press, 0xa9c8ff], [AREA.number, 0xd9c2ff], [AREA.cut, 0xffc2c2]]) {
    add(scene, new RoundedBoxGeometry(14, 6, 0.2, 2, 0.1), std(c, 0.9), [x, 4.2, -5.85], [0, 0, 0], [1, 1, 1], false);
    for (let k = -2; k <= 2; k++) add(scene, new THREE.CylinderGeometry(0.5, 0.5, 0.12, 24), std(0xffffff, 0.6, { emissive: 0xfff2c0, emissiveIntensity: 0.5 }), [x + k * 3, 7.6, -5.7], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  }
  const metal = std(0x9aa3b5, 0.35, { metalness: 0.5 });
  const dark = std(0x3a4256, 0.6);
  const pTex = paperTex();

  // ---------------------------------------------------------------- mill
  const mill = new THREE.Group();
  mill.position.x = AREA.mill;
  scene.add(mill);
  const vatX = -3.6;
  add(mill, new THREE.CylinderGeometry(1.35, 1.25, 1.6, 40, 1, true), std(0x4f8cff, 0.5, { side: THREE.DoubleSide }), [vatX, 0.8, 0]);
  add(mill, new THREE.TorusGeometry(1.35, 0.09, 12, 48), std(0xffc23d, 0.4), [vatX, 1.6, 0], [Math.PI / 2, 0, 0]);
  const pulpTex = canvasTex(512, 512, (g) => {
    g.fillStyle = '#eef0f4';
    g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(170,185,210,0.6)';
    g.lineWidth = 6;
    for (let r = 20; r < 256; r += 26) {
      g.beginPath();
      for (let a = 0; a < Math.PI * 2; a += 0.05) {
        const rr = r + a * 7;
        const x = 256 + rr * Math.cos(a), y = 256 + rr * Math.sin(a);
        a ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
  });
  const pulp = add(mill, new THREE.CircleGeometry(1.28, 40), std(0xffffff, 0.4, { map: pulpTex }), [vatX, 1.45, 0], [-Math.PI / 2, 0, 0]);
  // hopper above the vat
  add(mill, new THREE.CylinderGeometry(1.0, 0.3, 1.0, 32, 1, true), std(0xff8a3d, 0.5, { side: THREE.DoubleSide }), [vatX, 4.6, 0]);
  add(mill, new THREE.CylinderGeometry(0.3, 0.3, 0.4, 24, 1, true), std(0xff8a3d, 0.5, { side: THREE.DoubleSide }), [vatX, 3.95, 0]);
  const balls = [];
  const bollMat = std(0xffffff, 1, { emissive: 0xffffff, emissiveIntensity: 0.1 });
  for (let i = 0; i < 12; i++) {
    const b = new THREE.Group();
    for (let k = 0; k < 4; k++) add(b, new THREE.SphereGeometry(0.16, 14, 10), bollMat, [Math.cos(k * 1.6) * 0.1, (k % 2) * 0.08, Math.sin(k * 1.6) * 0.1]);
    mill.add(b);
    balls.push(b);
  }
  // pipe to the paper machine
  add(mill, new THREE.CylinderGeometry(0.18, 0.18, 2.2, 16), metal, [vatX + 1.9, 0.8, 0], [0, 0, Math.PI / 2]);
  // wire bed + press rollers
  add(mill, new RoundedBoxGeometry(7.4, 0.5, 2.6, 2, 0.1), dark, [1.0, 0.85, 0]);
  add(mill, new THREE.BoxGeometry(7.2, 0.04, 2.3), std(0x3fc48a, 0.6), [1.0, 1.12, 0]);
  const rollers = [];
  for (const x of [-0.6, 1.0, 2.6]) {
    for (const y of [1.0, 1.62]) {
      const r = add(mill, new THREE.CylinderGeometry(0.28, 0.28, 2.5, 28), y > 1.2 ? std(0xb8c2d6, 0.3, { metalness: 0.4 }) : metal, [x, y, 0], [Math.PI / 2, 0, 0]);
      rollers.push(r);
    }
    for (const z of [-1.35, 1.35]) add(mill, new RoundedBoxGeometry(0.5, 1.9, 0.2, 2, 0.06), std(0x2f9bff, 0.5), [x, 1.05, z]);
  }
  const ribbon = add(mill, new THREE.PlaneGeometry(6.6, 2.1), std(0xffffff, 0.85, { map: pTex }), [1.2, 1.32, 0], [-Math.PI / 2, 0, 0]);
  pTex.repeat.set(3, 1);
  const roll = add(mill, new THREE.CylinderGeometry(1, 1, 2.2, 40), std(0xffffff, 0.8, { map: pTex }), [5.2, 1.4, 0], [Math.PI / 2, 0, 0]);
  add(mill, new THREE.CylinderGeometry(0.1, 0.1, 2.8, 12), metal, [5.2, 1.4, 0], [Math.PI / 2, 0, 0]);
  for (const z of [-1.4, 1.4]) add(mill, new THREE.BoxGeometry(0.2, 1.4, 0.2), metal, [5.2, 0.7, z]);

  // --------------------------------------------------------------- press
  const press = new THREE.Group();
  scene.add(press);
  add(press, new RoundedBoxGeometry(26, 0.6, 2.8, 2, 0.12), dark, [0, 0.7, 0]);
  add(press, new THREE.BoxGeometry(26, 0.04, 2.4), std(0x2c3242, 0.7), [0, 1.02, 0]);
  for (let x = -12.5; x <= 12.5; x += 1.25) add(press, new THREE.CylinderGeometry(0.08, 0.08, 2.9, 10), metal, [x, 0.72, 0], [Math.PI / 2, 0, 0]);
  const INKS = [0x2fae6b, 0xff5e7e, 0x2f7bff];
  const stations = [-4, 0, 4].map((x, i) => {
    const col = INKS[i];
    for (const z of [-1.55, 1.55]) add(press, new RoundedBoxGeometry(0.9, 2.9, 0.4, 2, 0.12), std(0xffc23d, 0.5), [x, 1.45, z]);
    add(press, new RoundedBoxGeometry(1.5, 1.0, 3.6, 3, 0.2), std(0xffffff, 0.4), [x, 3.1, 0]);
    add(press, new RoundedBoxGeometry(1.52, 0.25, 3.62, 2, 0.1), std(col, 0.4), [x, 2.62, 0]);
    add(press, new THREE.CylinderGeometry(0.42, 0.42, 0.5, 24), std(col, 0.3), [x, 3.85, 0.8]);
    const roller = add(press, new THREE.CylinderGeometry(0.38, 0.38, 2.6, 32), std(col, 0.25), [x, 1.55, 0], [Math.PI / 2, 0, 0]);
    const lamp = add(press, new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshBasicMaterial({ color: 0x444444 }), [x + 0.5, 3.45, 1.81]);
    return { x, roller, lamp, col };
  });
  const [sw, sh] = sheetSize();
  const SHW = 3.0, SHD = (3.0 * sh) / sw;
  const sheetTex = [0, 1, 2, 3, 4].map((s) => sheetTexture(NOTE_STYLES.green, s));
  const sheet = add(press, new THREE.PlaneGeometry(SHW, SHD), std(0xffffff, 0.7, { map: sheetTex[0] }), [0, 1.08, 0], [-Math.PI / 2, 0, 0]);

  // ----------------------------------------------------------- numbering
  const num = new THREE.Group();
  num.position.x = AREA.number;
  scene.add(num);
  add(num, new RoundedBoxGeometry(24, 0.6, 2.4, 2, 0.12), dark, [0, 0.7, 0]);
  add(num, new THREE.BoxGeometry(24, 0.04, 2.0), std(0x2c3242, 0.7), [0, 1.02, 0]);
  add(num, new RoundedBoxGeometry(0.7, 3.2, 0.35, 2, 0.1), std(0x9a5fd8, 0.5), [0, 1.6, -1.3]);
  add(num, new RoundedBoxGeometry(1.6, 1.1, 3.0, 3, 0.2), std(0xffffff, 0.4), [0, 3.4, 0]);
  add(num, new RoundedBoxGeometry(1.62, 0.25, 3.02, 2, 0.1), std(0x9a5fd8, 0.4), [0, 2.9, 0]);
  const stamp = new THREE.Group();
  add(stamp, new THREE.CylinderGeometry(0.12, 0.12, 1.2, 16), metal, [0, 0.6, 0]);
  add(stamp, new RoundedBoxGeometry(0.9, 0.3, 0.6, 2, 0.06), std(0xff5e7e, 0.4), [0, 0, 0]);
  stamp.position.set(0, 2.2, 0.4);
  num.add(stamp);
  const numLamp = add(num, new THREE.SphereGeometry(0.14, 16, 12), new THREE.MeshBasicMaterial({ color: 0x444444 }), [0.55, 3.75, 1.51]);
  const numNotes = [];
  for (let k = 0; k < 12; k++) {
    const serial = 'AF ' + String(220221 + k).padStart(7, '0');
    const m = new THREE.Mesh(noteGeo(1.5, 0), std(0xffffff, 0.7, { map: noteTexture(NOTE_STYLES.green, 3), side: THREE.DoubleSide }));
    m.userData.done = noteTexture(NOTE_STYLES.green, 4, serial);
    m.userData.raw = m.material.map;
    m.userData.serial = serial;
    m.rotation.x = -Math.PI / 2;
    m.castShadow = m.receiveShadow = true;
    num.add(m);
    numNotes.push(m);
  }

  // ------------------------------------------------------------- cutting
  const cut = new THREE.Group();
  cut.position.x = AREA.cut;
  scene.add(cut);
  add(cut, new RoundedBoxGeometry(5.6, 0.25, 4.2, 2, 0.08), std(0x5f6b85, 0.6), [0, 1.0, 0]);
  for (const [x, z] of [[-2.5, -1.8], [2.5, -1.8], [-2.5, 1.8], [2.5, 1.8]]) add(cut, new THREE.BoxGeometry(0.25, 1.0, 0.25), dark, [x, 0.5, z]);
  const { cols, rows, pad, gap } = SHEET;
  const finished = sheetTex[4];
  const sx = SHW / sw, sz = SHD / sh;
  const pieces = [];
  for (let r = 0; r < rows; r++)
    for (let k = 0; k < cols; k++) {
      const x0 = pad + k * (NW + gap) - gap / 2, x1 = x0 + NW + gap;
      const y0 = pad + r * (NH + gap) - gap / 2, y1 = y0 + NH + gap;
      const geo = new THREE.PlaneGeometry((x1 - x0) * sx, (y1 - y0) * sz);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) ? x1 : x0) / sw, 1 - (uv.getY(i) ? y0 : y1) / sh);
      const m = add(cut, geo, std(0xffffff, 0.7, { map: finished, side: THREE.DoubleSide }), [0, 1.14, 0], [-Math.PI / 2, 0, 0]);
      m.userData.home = [((x0 + x1) / 2 - sw / 2) * sx, ((y0 + y1) / 2 - sh / 2) * sz];
      m.userData.rc = [r, k];
      pieces.push(m);
    }
  // trim border (falls away after cutting)
  const trims = [];
  const tm = std(0xf2efe6, 0.8, { transparent: true });
  const bw = (pad - gap / 2) * sx, bd = (pad - gap / 2) * sz;
  for (const [w, d, x, z] of [[SHW, bd, 0, -SHD / 2 + bd / 2], [SHW, bd, 0, SHD / 2 - bd / 2], [bw, SHD, -SHW / 2 + bw / 2, 0], [bw, SHD, SHW / 2 - bw / 2, 0]]) {
    const m = add(cut, new THREE.PlaneGeometry(w, d), tm, [x, 1.141, z], [-Math.PI / 2, 0, 0]);
    m.userData.home = [x, z];
    trims.push(m);
  }
  const blade = new THREE.Group();
  add(blade, new THREE.BoxGeometry(4.4, 0.5, 0.05), std(0xdfe6f2, 0.15, { metalness: 0.9 }), [0, 0.25, 0]);
  add(blade, new RoundedBoxGeometry(4.6, 0.3, 0.3, 2, 0.08), std(0xff5e7e, 0.4), [0, 0.6, 0]);
  for (const x of [-2.2, 2.2]) add(blade, new THREE.CylinderGeometry(0.08, 0.08, 2.2, 12), metal, [x, 1.6, 0]);
  cut.add(blade);
  const cutLines = [];
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x2a2f45 });
  for (let r = 1; r < rows; r++) {
    const z = (pad + r * (NH + gap) - gap / 2 - sh / 2) * sz;
    cutLines.push(add(cut, new THREE.PlaneGeometry(SHW, 0.018), lineMat, [0, 1.143, z], [-Math.PI / 2, 0, 0], [1, 1, 1], false));
  }
  for (let k = 1; k < cols; k++) {
    const x = (pad + k * (NW + gap) - gap / 2 - sw / 2) * sx;
    cutLines.push(add(cut, new THREE.PlaneGeometry(0.018, SHD), lineMat, [x, 1.143, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false));
  }
  const scanner = new THREE.Group();
  add(scanner, new THREE.BoxGeometry(4.6, 0.04, 0.08), new THREE.MeshBasicMaterial({ color: 0x6ff0ff }), [0, 0, 0]);
  const beam = glow(0x6ff0ff, 1.4, 0.8);
  beam.scale.set(5.5, 0.6, 1);
  scanner.add(beam);
  add(scanner, new RoundedBoxGeometry(5.0, 0.3, 0.4, 2, 0.08), std(0x3fc48a, 0.4), [0, 0.5, 0]);
  cut.add(scanner);

  const aff = makeAffan();
  scene.add(aff.root);
  return {
    scene, focus, aff, mill, vatX, pulp, balls, rollers, ribbon, roll, pTex,
    press, stations, sheet, sheetTex, num, stamp, numLamp, numNotes, cut, pieces, trims, blade, cutLines, scanner, SHW, SHD,
  };
}

// ==================================================================== town
function signTex(text, bg, fg, w = 1024, h = 160, size = 92) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.font = `800 ${size}px "Baloo 2"`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = fg;
    g.fillText(text, w / 2, h / 2 + 6);
  });
}

export function buildTown() {
  const scene = new THREE.Scene();
  const sky = makeSky({ top: 0x3a86e6, mid: 0x6fb2f2, horizon: 0xd6efff, bottom: 0x8fcf6a, radius: 300 });
  scene.add(sky);
  scene.fog = new THREE.Fog(0xd6efff, 40, 140);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7a9a5a, 1.5));
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.7);
  sun.position.set(6, 14, 9);
  shadowCfg(sun, 14);
  scene.add(sun);
  add(scene, new THREE.PlaneGeometry(400, 400), std(0x86c95a, 1), [0, 0, 0], [-Math.PI / 2, 0, 0]).castShadow = false;
  add(scene, new THREE.PlaneGeometry(60, 2.2), std(0x4a5068, 0.9), [0, 0.01, 1.8], [-Math.PI / 2, 0, 0]).castShadow = false;
  for (let x = -29; x < 30; x += 1.6) add(scene, new THREE.PlaneGeometry(0.8, 0.09), std(0xfff1a8, 0.8), [x, 0.02, 1.8], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.PlaneGeometry(60, 0.9), std(0xd9d4c8, 0.9), [0, 0.03, 0.35], [-Math.PI / 2, 0, 0], [1, 1, 1], false);

  // central bank: white classical hall with columns (generic, no real logo)
  const bnm = new THREE.Group();
  const white = std(0xf7f5ef, 0.55);
  add(bnm, new RoundedBoxGeometry(4.6, 2.2, 2.4, 2, 0.06), white, [0, 1.4, -0.8]);
  add(bnm, new THREE.BoxGeometry(5.2, 0.3, 3.4), std(0xe0dccf, 0.7), [0, 0.15, -0.4]);
  add(bnm, new THREE.BoxGeometry(4.8, 0.2, 3.0), std(0xe0dccf, 0.7), [0, 0.4, -0.4]);
  for (let i = 0; i < 6; i++) add(bnm, new THREE.CylinderGeometry(0.14, 0.16, 2.0, 16), white, [-2.0 + i * 0.8, 1.5, 0.7]);
  add(bnm, new THREE.BoxGeometry(5.0, 0.35, 3.0), white, [0, 2.65, -0.25]);
  const ped = new THREE.Shape();
  ped.moveTo(-2.6, 0);
  ped.lineTo(2.6, 0);
  ped.lineTo(0, 0.9);
  ped.closePath();
  add(bnm, new THREE.ExtrudeGeometry(ped, { depth: 2.9, bevelEnabled: false }), std(0x2f7bff, 0.5), [0, 2.82, -1.7]);
  add(bnm, new THREE.PlaneGeometry(4.6, 0.32), std(0xffffff, 0.5, { map: signTex('BANK NEGARA MALAYSIA', '#1d3f8f', '#ffd84a', 1536, 110, 78) }), [0, 2.65, 1.255]);
  add(bnm, new THREE.BoxGeometry(0.9, 1.3, 0.1), std(0x8a5432, 0.6), [0, 1.15, 0.42]);
  bnm.position.set(-7.5, 0, -1.2);
  scene.add(bnm);

  // the neighbourhood bank
  const bank = new THREE.Group();
  add(bank, new RoundedBoxGeometry(3.0, 2.0, 2.0, 2, 0.08), std(0xfff1d6, 0.6), [0, 1.0, -0.6]);
  add(bank, new RoundedBoxGeometry(3.2, 0.2, 2.2, 2, 0.06), std(0xff8a3d, 0.5), [0, 2.08, -0.6]);
  add(bank, new THREE.PlaneGeometry(2.4, 0.5), std(0xffffff, 0.5, { map: signTex('BANK', '#ff8a3d', '#ffffff', 512, 110, 90) }), [0, 1.7, 0.41]);
  add(bank, new THREE.BoxGeometry(0.8, 1.15, 0.06), std(0x8fd8ff, 0.3, { emissive: 0x8fd8ff, emissiveIntensity: 0.2 }), [-0.6, 0.6, 0.41]);
  add(bank, new THREE.BoxGeometry(0.8, 0.7, 0.06), std(0x8fd8ff, 0.3), [0.65, 0.95, 0.41]);
  bank.position.set(5.2, 0, -0.9);
  scene.add(bank);

  const R = rng(9);
  for (let i = 0; i < 26; i++) {
    const tr = makeTree(R, { scale: 0.35 + R() * 0.35, leaf: [[0x7bd66a], [0x4fc48a], [0x9be05c]][i % 3], trunk: 0x9a6a45, toy: true });
    const x = -26 + i * 2.1 + R();
    if (Math.abs(x + 7.5) < 3.4 || Math.abs(x - 5.2) < 2.4) continue;
    tr.position.set(x, 0, -1.8 - R() * 2.5);
    scene.add(tr);
  }
  for (let i = 0; i < 10; i++) {
    const h = makeHouse(R, { scale: 0.32, walls: [0xffd6e0, 0xfff1b8, 0xc9f0ff, 0xd9ffd0], roofs: [0xff6b6b, 0x4f8cff, 0xffa53b, 0x9b6bff], toy: true });
    h.position.set(-24 + i * 5.2, 0, -8 - R() * 4);
    scene.add(h);
  }
  const van = makeCar({ color: 0xe9edf5, accent: 0x2f7bff });
  van.scale.setScalar(0.42);
  scene.add(van);
  const flyers = [];
  for (let i = 0; i < 6; i++) {
    const n = makeNote(NOTE_STYLES[['green', 'red', 'blue', 'orange', 'purple', 'green'][i]], 0.7, { serial: 'AF ' + String(3300000 + i) });
    n.visible = false;
    scene.add(n);
    flyers.push(n);
  }
  const aff = makeAffan();
  scene.add(aff.root);
  return { scene, sky, sun, bnm, bank, van, flyers, aff };
}
