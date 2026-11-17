// Episode 043 sets:
//  - Affan's bedroom: a bed with a starry blanket, a pillow, a night lamp, a
//    window (night sky with the Moon, or morning light), a few toys on a shelf;
//    Affan can sit up in bed or lie asleep (via two pivot groups); a small
//    glowing "busy brain" above his head and a dream bubble with a mini dragon;
//  - the dream sky: a purple-pink night with stars, the Moon and cloud puffs,
//    and a friendly dragon that Affan rides;
//  - the Episode 031 mind stage (the friendly brain) with a wardrobe of
//    shelves (almari), coloured memory boxes carrying little memories (ball,
//    cake, toy car, book, mini dragon), and a big dream bubble;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, glow, glowTex, makeSky, makeStars, makeCar } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildMindStage, BRAIN } from '../031-geletek-diri-sendiri/worlds.js';

export { buildOutro, BRAIN };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

function lumpy(rx, ry, rz, seed = 4) {
  const g = new THREE.SphereGeometry(1, 64, 40);
  const p = g.attributes.position;
  const R = rng(seed);
  const ph = [R() * 6, R() * 6];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(12 * x + 2 * Math.sin(3 * y + ph[0])) * Math.sin(11 * y + 1.7 * Math.sin(2.6 * z + ph[1]));
    const r = 1 + 0.06 * n;
    p.setXYZ(i, x * r * rx, y * r * ry, z * r * rz);
  }
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- a dragon
// Friendly cartoon dragon, faces +z, ~3 units long. setWings(phase).
export function makeDragon(scale = 1) {
  const root = new THREE.Group();
  root.scale.setScalar(scale);
  const green = std(0x3fc08a, 0.5, { emissive: 0x0a3a20, emissiveIntensity: 0.25 });
  const belly = std(0xffe8a8, 0.6);
  const horn = std(0xffd23a, 0.4);
  add(root, new THREE.CapsuleGeometry(0.55, 1.2, 8, 20), green, [0, 0, 0], [Math.PI / 2, 0, 0]);
  add(root, new THREE.CapsuleGeometry(0.42, 1.0, 8, 16), belly, [0, -0.18, 0.05], [Math.PI / 2, 0, 0], [1, 0.9, 1]);
  // neck and head
  add(root, new THREE.CapsuleGeometry(0.28, 0.7, 8, 12), green, [0, 0.55, 1.0], [0.75, 0, 0]);
  const head = new THREE.Group();
  head.position.set(0, 1.05, 1.45);
  root.add(head);
  add(head, new THREE.SphereGeometry(0.48, 28, 20), green, [0, 0, 0]);
  add(head, new THREE.SphereGeometry(0.32, 24, 16), green, [0, -0.12, 0.42], [0, 0, 0], [1, 0.75, 1]);
  for (const s of [-1, 1]) {
    add(head, new THREE.SphereGeometry(0.15, 16, 12), std(0xffffff, 0.3), [0.2 * s, 0.14, 0.36], [0, 0, 0], [1, 1.1, 0.8], false);
    add(head, new THREE.SphereGeometry(0.08, 12, 10), new THREE.MeshBasicMaterial({ color: 0x101010 }), [0.21 * s, 0.15, 0.47], [0, 0, 0], [1, 1, 1], false);
    add(head, new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0.23 * s, 0.19, 0.53], [0, 0, 0], [1, 1, 1], false);
    add(head, new THREE.ConeGeometry(0.08, 0.36, 10), horn, [0.2 * s, 0.48, -0.1], [-0.4, 0, -0.25 * s]);
    add(head, new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0x1a3a20 }), [0.08 * s, -0.08, 0.72], [0, 0, 0], [1, 1, 1], false);
  }
  add(head, new THREE.TorusGeometry(0.12, 0.025, 6, 14, Math.PI), new THREE.MeshBasicMaterial({ color: 0x1a3a20 }), [0, -0.24, 0.62], [0.3, 0, Math.PI], [1, 1, 1], false);
  // spikes on the back
  for (let i = 0; i < 4; i++) add(root, new THREE.ConeGeometry(0.1, 0.28, 8), horn, [0, 0.62, 0.45 - i * 0.4]);
  // tail
  const tc = new THREE.CatmullRomCurve3([V3(0, 0, -0.8), V3(0, 0.1, -1.5), V3(0, 0.45, -2.1), V3(0, 0.9, -2.4)]);
  add(root, new THREE.TubeGeometry(tc, 20, 0.18, 10), green, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  add(root, new THREE.ConeGeometry(0.22, 0.4, 4), horn, [0, 1.05, -2.45], [0.4, 0, 0]);
  // legs
  for (const [x, z] of [[-0.4, 0.5], [0.4, 0.5], [-0.4, -0.5], [0.4, -0.5]]) add(root, new THREE.CapsuleGeometry(0.13, 0.3, 6, 10), green, [x, -0.55, z]);
  // wings (fan shapes on pivots)
  const wingMat = std(0x8a6af0, 0.5, { side: THREE.DoubleSide, emissive: 0x2a1a6a, emissiveIntensity: 0.3 });
  const ws = new THREE.Shape();
  ws.moveTo(0, 0);
  ws.lineTo(1.9, 0.6);
  ws.quadraticCurveTo(1.7, 0.1, 2.0, -0.3);
  ws.quadraticCurveTo(1.4, -0.4, 1.4, -0.8);
  ws.quadraticCurveTo(0.8, -0.7, 0.6, -1.1);
  ws.lineTo(0, -0.5);
  const wings = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group();
    pv.position.set(0.35 * s, 0.4, 0.2);
    root.add(pv);
    const w = add(pv, new THREE.ShapeGeometry(ws, 16), wingMat, [0, 0, 0], [Math.PI / 2, 0, 0], [s, 1, 1], false);
    void w;
    wings.push({ pv, s });
  }
  const setWings = (ph) => wings.forEach((w) => (w.pv.rotation.z = w.s * (0.35 + 0.55 * Math.sin(ph))));
  setWings(0);
  return { root, head, setWings };
}

// little memory items
export function makeMemory(kind) {
  const g = new THREE.Group();
  if (kind === 'ball') {
    add(g, new THREE.SphereGeometry(0.28, 24, 16), std(0xff5a5a, 0.4), [0, 0, 0]);
    add(g, new THREE.TorusGeometry(0.28, 0.035, 8, 32), std(0xffffff, 0.4), [0, 0, 0], [Math.PI / 2, 0, 0]);
  } else if (kind === 'cake') {
    add(g, new THREE.CylinderGeometry(0.3, 0.3, 0.22, 24), std(0xffb3d1, 0.6), [0, -0.05, 0]);
    add(g, new THREE.CylinderGeometry(0.31, 0.31, 0.06, 24), std(0xffffff, 0.5), [0, 0.08, 0]);
    add(g, new THREE.CylinderGeometry(0.025, 0.025, 0.2, 8), std(0x5ab0ff, 0.4), [0, 0.2, 0]);
    const f = glow(0xffd060, 0.25, 0.95);
    f.position.set(0, 0.34, 0);
    g.add(f);
  } else if (kind === 'car') {
    const c = makeCar({ color: 0x4aa8ff, accent: 0xffd23a });
    c.scale.setScalar(0.16);
    g.add(c);
  } else if (kind === 'book') {
    add(g, new RoundedBoxGeometry(0.46, 0.12, 0.34, 2, 0.02), std(0x7a5cf0, 0.6), [0, 0, 0]);
    add(g, new THREE.BoxGeometry(0.42, 0.09, 0.3), std(0xfff8e8, 0.8), [0.02, 0, 0]);
  } else if (kind === 'dragon') {
    const d = makeDragon(0.14);
    g.add(d.root);
    g.userData.dragon = d;
  } else if (kind === 'star') {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.13 : 0.3;
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    add(g, new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false }), std(0xffd23a, 0.4, { emissive: 0x6a5000, emissiveIntensity: 0.4 }), [0, 0, -0.04]);
  }
  return g;
}

// a translucent dream bubble with cloud puffs underneath
function makeDreamBubble(r = 1) {
  const g = new THREE.Group();
  const shell = add(g, new THREE.SphereGeometry(r, 40, 28), new THREE.MeshPhysicalMaterial({ color: 0xe8d8ff, roughness: 0.1, transparent: true, opacity: 0.28, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide, emissive: 0x4a2a8a, emissiveIntensity: 0.25 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  shell.renderOrder = 6;
  const puff = std(0xffffff, 0.9, { emissive: 0x8a7ab0, emissiveIntensity: 0.25 });
  for (let i = 0; i < 6; i++) add(g, new THREE.SphereGeometry(r * (0.32 + 0.08 * (i % 3)), 16, 12), puff, [Math.cos(i * 1.05) * r * 0.75, -r * 0.85, Math.sin(i * 1.05) * r * 0.3], [0, 0, 0], [1, 0.7, 1], false);
  const trail = [];
  for (let i = 0; i < 3; i++) trail.push(add(g, new THREE.SphereGeometry(r * (0.08 + i * 0.05), 14, 10), puff, [0, 0, 0], [0, 0, 0], [1, 1, 1], false));
  const content = new THREE.Group();
  g.add(content);
  return { g, shell, content, trail };
}

// ----------------------------------------------------------------- bedroom
export const BED = V3(0, 0, -0.6);
export const MATTRESS_Y = 0.95;
export const AFF_S = 0.55;
export function buildBedroom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101830);
  const hemi = new THREE.HemisphereLight(0xfff4e8, 0x6a5a7a, 1.2);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff0d8, 1.8);
  key.position.set(3, 7, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -3, near: 1, far: 30 });
  scene.add(key, key.target);
  const moonLight = new THREE.DirectionalLight(0x8aa8ff, 0);
  moonLight.position.set(-2, 5, -6);
  scene.add(moonLight);
  // night lamp on the bedside table
  const lampLight = new THREE.PointLight(0xffc070, 0, 12, 1.6);
  lampLight.position.set(2.35, 1.95, -1.2);
  scene.add(lampLight);
  // floor and walls
  add(scene, new THREE.PlaneGeometry(20, 20), std(0xc89a6a, 0.8), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  const wallMat = std(0xbfd8f6, 0.9);
  add(scene, new THREE.PlaneGeometry(20, 10), wallMat, [0, 5, -2.6], [0, 0, 0], [1, 1, 1], false).receiveShadow = true;
  add(scene, new THREE.PlaneGeometry(20, 10), wallMat, [-4.6, 5, 0], [0, Math.PI / 2, 0], [1, 1, 1], false).receiveShadow = true;
  // little stars painted on the wall
  const starMat = std(0xfff2a8, 0.6, { emissive: 0x6a5a20, emissiveIntensity: 0.4 });
  const R = rng(43);
  for (let i = 0; i < 18; i++) add(scene, new THREE.CircleGeometry(0.06 + R() * 0.06, 5), starMat, [(R() - 0.5) * 9, 2.2 + R() * 3.5, -2.59], [0, 0, R() * 3], [1, 1, 1], false);
  // window with the sky
  const win = new THREE.Group();
  win.position.set(-1.3, 3.1, -2.58);
  scene.add(win);
  const skyMat = new THREE.MeshBasicMaterial({ color: 0x1a2458 });
  add(win, new THREE.PlaneGeometry(2.0, 1.6), skyMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const frameMat = std(0xffffff, 0.5);
  for (const [w, h, x, y] of [[2.2, 0.1, 0, 0.85], [2.2, 0.1, 0, -0.85], [0.1, 1.8, 1.05, 0], [0.1, 1.8, -1.05, 0], [0.06, 1.6, 0, 0], [2.0, 0.06, 0, 0]]) add(win, new THREE.BoxGeometry(w, h, 0.08), frameMat, [x, y, 0.04]);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), new THREE.MeshBasicMaterial({ color: 0xfff4c8 }));
  moon.position.set(0.5, 0.35, 0.01);
  win.add(moon);
  const moonGlow = glow(0xfff0c0, 1.2, 0.7);
  moonGlow.position.set(0.5, 0.35, 0.02);
  win.add(moonGlow);
  const winStars = [];
  for (let i = 0; i < 10; i++) {
    const s = glow(0xffffff, 0.1, 0.9);
    s.position.set((R() - 0.5) * 1.8, (R() - 0.5) * 1.4, 0.02);
    win.add(s);
    winStars.push(s);
  }
  const sunGlow = glow(0xfff0b0, 2.4, 0);
  sunGlow.position.set(-0.3, 0.2, 0.03);
  win.add(sunGlow);
  // bed
  const bed = new THREE.Group();
  bed.position.copy(BED);
  scene.add(bed);
  const wood = std(0xa86a3a, 0.6);
  add(bed, new RoundedBoxGeometry(3.4, 0.4, 1.7, 2, 0.08), wood, [0, 0.5, 0]);
  add(bed, new RoundedBoxGeometry(0.2, 1.6, 1.8, 2, 0.08), wood, [-1.75, 0.8, 0]);
  add(bed, new RoundedBoxGeometry(0.2, 1.0, 1.8, 2, 0.08), wood, [1.75, 0.5, 0]);
  add(bed, new RoundedBoxGeometry(3.3, 0.25, 1.6, 2, 0.1), std(0xffffff, 0.8), [0, 0.82, 0]);
  add(bed, new RoundedBoxGeometry(0.7, 0.22, 1.0, 3, 0.1), std(0xfff6e0, 0.9), [-1.3, 1.05, 0]);
  // blanket with stars (canvas texture)
  const bTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#3a5ad8';
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#ffe46a';
    for (let i = 0; i < 26; i++) {
      const x = (i * 97) % 256, y = (i * 53 + 20) % 256;
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2, r = k % 2 ? 5 : 12;
        g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 1);
    return t;
  })();
  const blanket = add(bed, new RoundedBoxGeometry(2.3, 0.3, 1.72, 3, 0.12), std(0xffffff, 0.8, { map: bTex }), [0.5, 1.02, 0]);
  // bedside table, night lamp, toy shelf
  add(scene, new RoundedBoxGeometry(0.9, 1.1, 0.8, 2, 0.06), std(0xe8b47a, 0.6), [2.35, 0.55, -1.4]);
  add(scene, new THREE.CylinderGeometry(0.12, 0.18, 0.4, 16), std(0x7a5cf0, 0.5), [2.35, 1.3, -1.3]);
  const shade = add(scene, new THREE.CylinderGeometry(0.22, 0.36, 0.4, 24, 1, true), std(0xfff0c8, 0.7, { side: THREE.DoubleSide, emissive: 0xffb050, emissiveIntensity: 0 }), [2.35, 1.7, -1.3]);
  const lampGlow = glow(0xffc070, 2.6, 0);
  lampGlow.position.set(2.35, 1.75, -1.2);
  scene.add(lampGlow);
  add(scene, new THREE.BoxGeometry(2.4, 0.08, 0.5), std(0xffffff, 0.6), [2.6, 3.2, -2.35]);
  const toyBall = makeMemory('ball');
  toyBall.position.set(1.9, 3.52, -2.3);
  scene.add(toyBall);
  const toyCar = makeMemory('car');
  toyCar.position.set(2.7, 3.26, -2.3);
  scene.add(toyCar);
  const toyDragon = makeMemory('dragon');
  toyDragon.position.set(3.4, 3.4, -2.3);
  toyDragon.rotation.y = -0.6;
  scene.add(toyDragon);
  // Affan: two pivots so he can lie down (head towards -x, face up)
  const outer = new THREE.Group();
  const inner = new THREE.Group();
  outer.add(inner);
  scene.add(outer);
  const aff = makeAffan();
  aff.root.scale.setScalar(AFF_S);
  inner.add(aff.root);
  // a little glowing busy brain (shown above his head while he sleeps)
  const brain = new THREE.Group();
  scene.add(brain);
  add(brain, lumpy(0.42, 0.3, 0.34, 7), std(0xff9ec4, 0.5, { emissive: 0xff5aa0, emissiveIntensity: 0.35 }), [0, 0, 0]);
  const brainGlow = glow(0xffa0d0, 2.2, 0.6);
  brain.add(brainGlow);
  const gears = [];
  for (let i = 0; i < 3; i++) {
    const gr = new THREE.Mesh(new THREE.TorusGeometry(0.11 + i * 0.03, 0.03, 6, 8), std(0xffd23a, 0.4, { emissive: 0x6a5000, emissiveIntensity: 0.4 }));
    gr.position.set(-0.4 + i * 0.4, 0.42 + (i % 2) * 0.1, 0);
    brain.add(gr);
    gears.push(gr);
  }
  brain.visible = false;
  // dream bubble with a mini dragon and a mini Affan
  const dream = makeDreamBubble(0.8);
  scene.add(dream.g);
  const dd = makeDragon(0.22);
  dream.content.add(dd.root);
  const da = makeAffan();
  da.root.scale.setScalar(0.12);
  dream.content.add(da.root);
  dream.g.visible = false;
  // zzz sprites
  const zzz = [];
  const setTime = (night) => {
    // night: 1 = dark night with the lamp, 0 = bright morning
    hemi.intensity = 1.2 - 0.85 * night;
    hemi.color.setHex(0xfff4e8).lerp(new THREE.Color(0x8aa0ff), night);
    key.intensity = 1.8 * (1 - night);
    moonLight.intensity = 0.9 * night;
    lampLight.intensity = 6 * night;
    lampGlow.material.opacity = 0.8 * night;
    shade.material.emissiveIntensity = 0.8 * night;
    skyMat.color.setHex(0xbfe4ff).lerp(new THREE.Color(0x14205a), night);
    moon.visible = moonGlow.visible = night > 0.3;
    winStars.forEach((s) => (s.visible = night > 0.3));
    sunGlow.material.opacity = 0.9 * (1 - night);
    wallMat.color.setHex(0xbfd8f6).lerp(new THREE.Color(0x5a6aa8), night * 0.6);
    scene.background.setHex(0xbfd8f6).lerp(new THREE.Color(0x101830), night);
  };
  setTime(0);
  return { scene, bed, blanket, aff, outer, inner, brain, gears, dream, dd, da, setTime, zzz, toyDragon };
}

// --------------------------------------------------------------- dream sky
export function buildDreamSky() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x8a6ac8, 30, 120);
  const sky = makeSky({ top: 0x1a1050, mid: 0x5a3aa8, horizon: 0xff9ad0, bottom: 0x6a4aa8, radius: 1500 });
  const stars = makeStars(900, 1400, 43);
  scene.add(sky, stars);
  scene.add(new THREE.HemisphereLight(0xffe8ff, 0x6a4aa8, 1.3));
  const key = new THREE.DirectionalLight(0xfff0e0, 1.8);
  key.position.set(5, 8, 6);
  scene.add(key);
  const moon = new THREE.Group();
  moon.position.set(-14, 16, -40);
  scene.add(moon);
  add(moon, new THREE.SphereGeometry(4, 32, 20), new THREE.MeshBasicMaterial({ color: 0xfff4d0 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  moon.add(glow(0xfff0c0, 22, 0.6));
  // cloud puffs, in a long band the dragon flies along (+x)
  const puff = std(0xffffff, 0.9, { emissive: 0x9a7ad0, emissiveIntensity: 0.3 });
  const R = rng(430);
  const clouds = new THREE.Group();
  scene.add(clouds);
  for (let i = 0; i < 46; i++) {
    const c = new THREE.Group();
    c.position.set(-40 + R() * 120, -4 + R() * 9 - (R() < 0.5 ? 5 : 0), -14 - R() * 26);
    clouds.add(c);
    for (let k = 0; k < 5; k++) add(c, new THREE.SphereGeometry(1.2 + R() * 1.6, 16, 12), puff, [(k - 2) * 1.5, R() * 0.6, R() * 0.8], [0, 0, 0], [1, 0.7, 1], false);
  }
  const dragon = makeDragon(1);
  scene.add(dragon.root);
  const aff = makeAffan();
  aff.root.scale.setScalar(0.42);
  dragon.root.add(aff.root);
  aff.root.position.set(0, 0.25, -0.1);
  aff.root.scale.setScalar(0.42);
  const sparkles = Array.from({ length: 20 }, () => {
    const s = glow(0xfff0a0, 0.3, 0.9);
    s.visible = false;
    scene.add(s);
    return s;
  });
  return { scene, sky, stars, clouds, dragon, aff, sparkles };
}

// ------------------------------------------------------------- mind stage
export const SHELF = V3(3.6, 0, -0.6);
export const KINDS = ['ball', 'cake', 'car', 'book', 'dragon', 'star'];
export const BOX_COLS = [0xff5a5a, 0xffb3d1, 0x4aa8ff, 0x7a5cf0, 0x3fc08a, 0xffd23a];
export function buildMind() {
  const w = buildMindStage();
  w.kak.root.visible = false;
  w.guard.group.visible = false;
  w.ring.visible = false;
  const s = w.scene;
  // almari (shelves)
  const shelf = new THREE.Group();
  shelf.position.copy(SHELF);
  shelf.rotation.y = -0.35;
  s.add(shelf);
  const wood = std(0xc8884a, 0.6);
  add(shelf, new RoundedBoxGeometry(2.6, 0.12, 1.0, 2, 0.04), wood, [0, 0.06, 0]);
  for (let i = 1; i <= 3; i++) add(shelf, new RoundedBoxGeometry(2.6, 0.1, 1.0, 2, 0.03), wood, [0, i * 1.1, 0]);
  add(shelf, new RoundedBoxGeometry(2.6, 3.4, 0.08, 2, 0.03), std(0xa86a3a, 0.7), [0, 1.7, -0.5]);
  for (const x of [-1.3, 1.3]) add(shelf, new RoundedBoxGeometry(0.1, 3.4, 1.0, 2, 0.03), wood, [x, 1.7, 0]);
  // memory boxes, each with a little memory on top
  const boxes = KINDS.map((k, i) => {
    const g = new THREE.Group();
    s.add(g);
    add(g, new RoundedBoxGeometry(0.62, 0.48, 0.5, 3, 0.08), std(BOX_COLS[i], 0.5, { emissive: BOX_COLS[i], emissiveIntensity: 0.15 }), [0, 0, 0]);
    add(g, new RoundedBoxGeometry(0.68, 0.08, 0.56, 2, 0.03), std(0xffffff, 0.5), [0, 0.26, 0]);
    const mem = makeMemory(k);
    mem.position.set(0, 0.62, 0);
    g.add(mem);
    return { g, mem, kind: k };
  });
  shelf.updateMatrixWorld(true);
  // shelf slots (world), two per shelf level
  const slots = KINDS.map((_, i) => {
    const lv = Math.floor(i / 2), sd = i % 2 ? 0.6 : -0.6;
    return shelf.localToWorld(V3(sd, 0.4 + lv * 1.1, 0.1));
  });
  const dream = makeDreamBubble(1.5);
  s.add(dream.g);
  dream.g.visible = false;
  return { ...w, shelf, boxes, slots, dream };
}
