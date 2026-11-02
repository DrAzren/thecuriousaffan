// Episode 011 sets: Affan's bedroom at night (real world), the "shrunk down"
// garden imagination world with giant flowers and cartoon mosquitoes, the
// skin cross-section lab, and the branded outro stage.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, clamp, lerp } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeSky, makeStars, glow } from '../../shared/props.js';

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

function shadowCfg(light, size, map = 2048) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  const c = light.shadow.camera;
  c.left = -size;
  c.right = size;
  c.top = size;
  c.bottom = -size;
  c.near = 0.5;
  c.far = 120;
  light.shadow.bias = -0.0005;
  light.shadow.normalBias = 0.02;
}

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

// ---------------------------------------------------------------- mosquito
// Cartoon Aedes-style mosquito: striped body, big friendly eyes, thin
// proboscis, six banded legs, fluttering wings. Faces +z, ~1.7 units long.
// Males get feathery antennae (as in real mosquitoes); females thin ones.
export function makeMosquito({ male = false } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const dark = std(0x262636, 0.45, { emissive: 0x0a0a18, emissiveIntensity: 0.4 });
  const white = std(0xf4f4f8, 0.5);
  const thorax = add(body, new THREE.SphereGeometry(0.3, 24, 18), dark, [0, 0, 0], [0, 0, 0], [1, 0.92, 1.12]);
  // white lyre marking on the back
  add(body, new THREE.TorusGeometry(0.13, 0.025, 6, 18, Math.PI), white, [0, 0.25, 0.02], [-Math.PI / 2 + 0.35, 0, 0], [1, 1.3, 1], false);
  // abdomen (pivot at the back of the thorax), gets redder as she drinks
  const abdomen = new THREE.Group();
  abdomen.position.set(0, -0.02, -0.25);
  abdomen.rotation.x = -0.18;
  body.add(abdomen);
  const bellyMat = std(0x2e2e40, 0.45, { emissive: 0x0a0a18, emissiveIntensity: 0.4 });
  add(abdomen, new THREE.CapsuleGeometry(0.17, 0.62, 8, 18), bellyMat, [0, 0, -0.42], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 4; i++) add(abdomen, new THREE.TorusGeometry(0.168 - i * 0.008, 0.03, 6, 20), white, [0, 0, -0.18 - i * 0.17], [0, 0, 0], [1, 1, 1], false);
  // head + eyes
  const head = new THREE.Group();
  head.position.set(0, 0.08, 0.36);
  body.add(head);
  add(head, new THREE.SphereGeometry(0.19, 20, 16), dark);
  const eyeW = std(0xffffff, 0.3, { emissive: 0xffffff, emissiveIntensity: 0.15 });
  const eyeB = std(0x111118, 0.2);
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(0.1 * s, 0.07, 0.11);
    head.add(e);
    add(e, new THREE.SphereGeometry(0.1, 18, 14), eyeW, [0, 0, 0], [0, 0, 0], [1, 1.1, 0.9], false);
    add(e, new THREE.SphereGeometry(0.055, 14, 10), eyeB, [0.012 * s, 0, 0.065], [0, 0, 0], [1, 1.1, 0.6], false);
    add(e, new THREE.SphereGeometry(0.018, 8, 6), shine, [0.03 * s + 0.01, 0.03, 0.098], [0, 0, 0], [1, 1, 1], false);
    eyes.push(e);
  }
  // proboscis ("muncung"): pivots at the head, points forward and down
  const prob = new THREE.Group();
  prob.position.set(0, -0.08, 0.15);
  prob.rotation.x = 0.75;
  head.add(prob);
  const probMat = std(0x3a3a4c, 0.4);
  const probMesh = add(prob, new THREE.CylinderGeometry(0.014, 0.024, 0.75, 8), probMat, [0, 0, 0.375], [Math.PI / 2, 0, 0]);
  // palps
  for (const s of [-1, 1]) add(head, new THREE.CylinderGeometry(0.014, 0.018, male ? 0.6 : 0.16, 6), dark, [0.04 * s, -0.08, 0.2 + (male ? 0.22 : 0.05)], [Math.PI / 2 + 0.75, 0, 0], [1, 1, 1], false);
  // antennae
  for (const s of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(0.05 * s, 0.12, 0.12);
    a.rotation.set(-0.7, 0.35 * s, 0.25 * s);
    head.add(a);
    add(a, new THREE.CylinderGeometry(0.01, 0.015, 0.42, 6), dark, [0, 0.21, 0], [0, 0, 0], [1, 1, 1], false);
    const n = male ? 9 : 5;
    for (let i = 0; i < n; i++) {
      const y = 0.06 + (i / n) * 0.36;
      const len = male ? 0.2 * (1 - i / (n * 1.3)) : 0.05;
      for (const r of [0, 1, 2, 3]) {
        const f = add(a, new THREE.CylinderGeometry(0.004, 0.006, len, 4), male ? std(0x6e6e86, 0.6) : dark, [0, y, 0], [0, (r * Math.PI) / 2, 1.2], [1, 1, 1], false);
        f.position.x += Math.sin((r * Math.PI) / 2) * 0;
        f.translateY(len / 2);
      }
    }
  }
  // legs: three per side, each with a femur + long banded tibia
  const legs = [];
  [[0.12, 0.7], [0.0, 0.0], [-0.12, -0.7]].forEach(([z, yaw]) => {
    for (const s of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(0.12 * s, -0.18, z);
      hip.rotation.set(0, yaw * s * 0.6 + (s > 0 ? 0 : Math.PI), 0);
      body.add(hip);
      const up = new THREE.Group();
      up.rotation.z = 0.9; // raise outwards
      hip.add(up);
      add(up, new THREE.CylinderGeometry(0.016, 0.02, 0.5, 6), dark, [0.25, 0, 0], [0, 0, Math.PI / 2], [1, 1, 1], false);
      const knee = new THREE.Group();
      knee.position.set(0.5, 0, 0);
      knee.rotation.z = -2.0;
      up.add(knee);
      add(knee, new THREE.CylinderGeometry(0.01, 0.015, 0.75, 6), dark, [0.375, 0, 0], [0, 0, Math.PI / 2], [1, 1, 1], false);
      for (const b of [0.2, 0.45, 0.68]) add(knee, new THREE.CylinderGeometry(0.017, 0.017, 0.05, 6), white, [b, 0, 0], [0, 0, Math.PI / 2], [1, 1, 1], false);
      legs.push({ hip, up, knee });
    }
  });
  // wings
  const wingMat = new THREE.MeshPhysicalMaterial({ color: 0xcfe6ff, roughness: 0.2, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false, emissive: 0x9ec8ff, emissiveIntensity: 0.25 });
  const wings = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group();
    w.position.set(0.08 * s, 0.2, -0.02);
    body.add(w);
    const m = add(w, new THREE.CircleGeometry(0.5, 24), wingMat, [0.38 * s, 0, -0.32], [-Math.PI / 2, 0, -0.55 * s], [0.38, 1, 1], false);
    m.renderOrder = 3;
    wings.push(w);
  }
  const fill = new THREE.Color();
  const BELLY = new THREE.Color(0x2e2e40), BLOOD = new THREE.Color(0xd8263a);
  root.userData = {
    head, prob, probMesh, eyes, abdomen,
    // flap: 0 resting (wings folded back), 1 flying; blood: 0..1 belly fill
    update(t, { flap = 1, blood = 0, probLen = 1, probPitch = 0.75 } = {}) {
      const a = Math.sin(t * 2 * Math.PI * 9.3);
      wings.forEach((w, i) => {
        const s = i ? 1 : -1;
        w.rotation.set(0, lerp(-0.55 * s, 0, flap), s * (lerp(0.05, 0.25, flap) + 0.55 * flap * a));
      });
      fill.copy(BELLY).lerp(BLOOD, clamp(blood));
      bellyMat.color.copy(fill);
      bellyMat.emissive.setHex(blood > 0.05 ? 0x400008 : 0x0a0a18);
      abdomen.scale.set(1 + 0.35 * blood, 1 + 0.35 * blood, 1 + 0.12 * blood);
      prob.rotation.x = probPitch;
      prob.scale.set(1, 1, probLen);
      legs.forEach((l, i) => {
        l.up.rotation.z = lerp(0.75, 0.95, flap) + 0.04 * Math.sin(t * 3 + i);
        l.knee.rotation.z = lerp(-1.7, -2.2, flap);
      });
    },
  };
  root.userData.update(0);
  return root;
}

// ----------------------------------------------------------------- flowers
export function makeFlower(R, { scale = 1, petal = 0xff7eb6, center = 0xffd23f, stem = 3.2 } = {}) {
  const g = new THREE.Group();
  const s = scale;
  const stemMat = std(0x3fae55, 0.7);
  add(g, new THREE.CylinderGeometry(0.08 * s, 0.12 * s, stem * s, 10), stemMat, [0, (stem * s) / 2, 0]);
  for (const side of [-1, 1]) {
    const leaf = add(g, new THREE.SphereGeometry(0.5 * s, 16, 10), std(0x49c05f, 0.65), [0.45 * s * side, stem * s * 0.35, 0], [0, 0, -0.7 * side], [1, 0.12, 0.45]);
    leaf.castShadow = true;
  }
  const head = new THREE.Group();
  head.position.set(0, stem * s, 0);
  head.rotation.x = 0.35;
  g.add(head);
  const pm = std(petal, 0.55, { emissive: petal, emissiveIntensity: 0.08 });
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const p = add(head, new THREE.SphereGeometry(0.55 * s, 18, 12), pm, [Math.cos(a) * 0.62 * s, 0.05 * s, Math.sin(a) * 0.62 * s], [0, -a, 0.18], [1, 0.16, 0.5]);
    p.castShadow = true;
  }
  add(head, new THREE.SphereGeometry(0.36 * s, 20, 14), std(center, 0.6, { emissive: 0x6a4a00, emissiveIntensity: 0.25 }), [0, 0.1 * s, 0], [0, 0, 0], [1, 0.45, 1]);
  const nectar = glow(0xfff2a0, 1.4 * s, 0);
  nectar.position.set(0, 0.32 * s, 0);
  head.add(nectar);
  g.userData = { head, nectar, top: new THREE.Vector3(0, stem * s + 0.25 * s, 0) };
  void R;
  return g;
}

function makeGrass(R, scale = 1) {
  const g = new THREE.Group();
  const cols = [0x3fae55, 0x52c266, 0x2f9548, 0x66cf6e];
  for (let i = 0; i < 5; i++) {
    const h = (1.6 + R() * 2.2) * scale;
    const b = add(g, new THREE.ConeGeometry(0.16 * scale, h, 5), std(cols[i % 4], 0.75, { flatShading: true }), [(R() - 0.5) * 0.9 * scale, h / 2, (R() - 0.5) * 0.9 * scale], [(R() - 0.5) * 0.35, R() * 3, (R() - 0.5) * 0.35]);
    b.castShadow = true;
  }
  return g;
}

// Clay pot holding stagnant water with wriggling larvae ("jentik-jentik").
function makePot() {
  const g = new THREE.Group();
  const tilt = new THREE.Group();
  g.add(tilt);
  const body = new THREE.Group();
  body.position.set(1.0, 0, 0); // pivot at the left base edge so it tips over towards -x
  tilt.position.set(-1.0, 0, 0);
  tilt.add(body);
  const clay = std(0xd06a3c, 0.8);
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const k = i / 12;
    pts.push(new THREE.Vector2(0.95 + 0.3 * k + 0.08 * Math.sin(k * Math.PI), k * 1.5));
  }
  add(body, new THREE.LatheGeometry(pts, 40), clay, [0, 0, 0]).material.side = THREE.DoubleSide;
  add(body, new THREE.TorusGeometry(1.27, 0.09, 10, 40), std(0xb9562f, 0.8), [0, 1.5, 0], [Math.PI / 2, 0, 0]);
  add(body, new THREE.CircleGeometry(0.95, 32), clay, [0, 0.02, 0], [-Math.PI / 2, 0, 0]);
  const water = add(body, new THREE.CircleGeometry(1.2, 40), new THREE.MeshStandardMaterial({ color: 0x5f8f7a, roughness: 0.15, transparent: true, opacity: 0.85 }), [0, 1.3, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  const larvae = [];
  const lm = std(0x2c2a24, 0.6);
  for (let i = 0; i < 6; i++) {
    const l = new THREE.Group();
    const a = (i / 6) * Math.PI * 2 + 0.4;
    l.position.set(Math.cos(a) * 0.62, 1.22, Math.sin(a) * 0.62);
    l.rotation.y = a;
    add(l, new THREE.CapsuleGeometry(0.05, 0.22, 4, 8), lm, [0, 0, 0], [0, 0, Math.PI / 2], [1, 1, 1], false);
    add(l, new THREE.SphereGeometry(0.07, 10, 8), lm, [0.16, 0, 0], [0, 0, 0], [1, 1, 1], false);
    body.add(l);
    larvae.push(l);
  }
  g.userData = { tilt, water, larvae };
  return g;
}

// ---------------------------------------------------------------- bedroom
export function buildBedroom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x141a3a);
  scene.add(new THREE.HemisphereLight(0x8fa2ff, 0x2a2440, 1.1));
  const moonLight = new THREE.DirectionalLight(0xb9c8ff, 1.6);
  moonLight.position.set(4, 7, -6);
  shadowCfg(moonLight, 6);
  scene.add(moonLight, moonLight.target);
  const lampLight = new THREE.PointLight(0xffb36a, 26, 14, 1.6);
  lampLight.position.set(-3.6, 2.9, 0.6);
  lampLight.castShadow = true;
  lampLight.shadow.mapSize.set(1024, 1024);
  lampLight.shadow.bias = -0.002;
  scene.add(lampLight);
  const front = new THREE.PointLight(0xffe2c8, 10, 12, 1.8);
  front.position.set(1.5, 3.4, 5);
  scene.add(front);

  // room
  const floorTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#8a5a3c';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#93613f' : '#7f5236';
      g.fillRect(0, i * 64, w, 62);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(0, i * 64 + 62, w, 2);
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(3, 3);
  add(scene, new THREE.PlaneGeometry(20, 20), std(0xffffff, 0.8, { map: floorTex }), [0, 0, 0], [-Math.PI / 2, 0, 0]);
  const wallMat = std(0x8fb3d9, 0.9);
  add(scene, new THREE.PlaneGeometry(20, 9), wallMat, [0, 4.5, -2.2]);
  add(scene, new THREE.PlaneGeometry(10, 9), std(0x86a8cf, 0.9), [-5.5, 4.5, 2.8], [0, Math.PI / 2, 0]);
  add(scene, new THREE.BoxGeometry(20, 0.25, 0.08), std(0xffffff, 0.7), [0, 0.12, -2.16]);

  // window with the night sky
  const nightTex = canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#0a1036');
    gr.addColorStop(1, '#2b3c88');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    const R = rng(4);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(255,250,230,${0.4 + R() * 0.6})`;
      g.beginPath();
      g.arc(R() * w, R() * h * 0.8, 0.8 + R() * 2, 0, Math.PI * 2);
      g.fill();
    }
    const mg = g.createRadialGradient(360, 150, 10, 360, 150, 120);
    mg.addColorStop(0, 'rgba(255,245,210,0.9)');
    mg.addColorStop(1, 'rgba(255,245,210,0)');
    g.fillStyle = mg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff6da';
    g.beginPath();
    g.arc(360, 150, 46, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1a2560';
    g.beginPath();
    g.arc(382, 138, 42, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#16305a';
    for (let i = 0; i < 9; i++) {
      const x = i * 64 - 10;
      g.beginPath();
      g.arc(x, h, 60 + (i % 3) * 18, Math.PI, 0);
      g.fill();
    }
  });
  const win = new THREE.Group();
  win.position.set(2.0, 3.6, -2.18);
  scene.add(win);
  add(win, new THREE.PlaneGeometry(2.6, 2.2), new THREE.MeshBasicMaterial({ map: nightTex }), [0, 0, 0.01], [0, 0, 0], [1, 1, 1], false);
  const frameMat = std(0xffffff, 0.6);
  add(win, new THREE.BoxGeometry(2.8, 0.14, 0.14), frameMat, [0, 1.12, 0.06]);
  add(win, new THREE.BoxGeometry(2.8, 0.14, 0.14), frameMat, [0, -1.12, 0.06]);
  add(win, new THREE.BoxGeometry(0.14, 2.3, 0.14), frameMat, [-1.33, 0, 0.06]);
  add(win, new THREE.BoxGeometry(0.14, 2.3, 0.14), frameMat, [1.33, 0, 0.06]);
  add(win, new THREE.BoxGeometry(0.08, 2.2, 0.08), frameMat, [0, 0, 0.06]);
  add(win, new THREE.BoxGeometry(3.0, 0.12, 0.4), frameMat, [0, -1.2, 0.2]);
  const curtain = std(0xffc94d, 0.85);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) add(win, new THREE.CylinderGeometry(0.16, 0.2, 2.8, 12), curtain, [s * (1.55 + i * 0.22), -0.2, 0.2], [0, 0, 0], [1, 1, 0.6]);
  }
  const winGlow = glow(0x9fb6ff, 4.5, 0.25);
  winGlow.position.set(0, 0, 0.3);
  win.add(winGlow);

  // bed (long axis along x), Affan sits on its front edge
  const bed = new THREE.Group();
  bed.position.set(0.4, 0, -0.85);
  scene.add(bed);
  add(bed, new RoundedBoxGeometry(5.6, 0.7, 2.6, 3, 0.1), std(0x6d4a8f, 0.8), [0, 0.45, 0]);
  add(bed, new RoundedBoxGeometry(5.4, 0.35, 2.45, 3, 0.15), std(0xf4f1ea, 0.85), [0, 0.97, 0]);
  add(bed, new RoundedBoxGeometry(0.25, 2.4, 2.7, 3, 0.1), std(0x7b55a0, 0.8), [-2.85, 1.2, 0]);
  add(bed, new RoundedBoxGeometry(1.2, 0.36, 1.8, 4, 0.16), std(0xffffff, 0.85), [-2.0, 1.32, 0]);
  const blanketTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3d7be0';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd84a';
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const cx = x * 64 + 32 + (y % 2) * 16, cy = y * 64 + 32;
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const r = k % 2 ? 6 : 14, a = (k / 10) * Math.PI * 2 - Math.PI / 2;
        g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      g.fill();
    }
  });
  blanketTex.wrapS = blanketTex.wrapT = THREE.RepeatWrapping;
  blanketTex.repeat.set(2, 1);
  add(bed, new RoundedBoxGeometry(3.4, 0.22, 2.7, 3, 0.1), std(0xffffff, 0.9, { map: blanketTex }), [1.0, 1.2, 0.02]);

  // bedside table + lamp
  const tb = new THREE.Group();
  tb.position.set(-3.8, 0, -1.0);
  scene.add(tb);
  add(tb, new RoundedBoxGeometry(1.2, 1.3, 1.0, 3, 0.08), std(0xc98b55, 0.7), [0, 0.65, 0]);
  add(tb, new THREE.CylinderGeometry(0.1, 0.16, 0.8, 12), std(0xf2f2f2, 0.5), [0, 1.7, 0]);
  add(tb, new THREE.CylinderGeometry(0.3, 0.5, 0.6, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb050, emissiveIntensity: 0.9, side: THREE.DoubleSide }), [0, 2.3, 0]);
  const lg = glow(0xffc070, 4, 0.7);
  lg.position.set(0, 2.3, 0.2);
  tb.add(lg);
  // wall frame with a rocket doodle
  const art = canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = '#fff8e6';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff6b5e';
    g.beginPath();
    g.moveTo(128, 40);
    g.quadraticCurveTo(190, 120, 170, 230);
    g.lineTo(86, 230);
    g.quadraticCurveTo(66, 120, 128, 40);
    g.fill();
    g.fillStyle = '#5ab0ff';
    g.beginPath();
    g.arc(128, 135, 26, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffc94d';
    g.beginPath();
    g.moveTo(96, 230);
    g.lineTo(128, 300);
    g.lineTo(160, 230);
    g.fill();
  });
  add(scene, new THREE.BoxGeometry(1.25, 1.55, 0.08), std(0xffffff, 0.6), [-2.2, 4.0, -2.15]);
  add(scene, new THREE.PlaneGeometry(1.05, 1.35), new THREE.MeshBasicMaterial({ map: art, color: 0xc8c8d8 }), [-2.2, 4.0, -2.1], [0, 0, 0], [1, 1, 1], false);

  const aff = makeAffan();
  aff.root.position.set(0, 0.26, 0.45);
  scene.add(aff.root);
  // a little red mosquito bump on the back of Affan's left hand
  const bump = add(aff.parts.arms.L.hand, new THREE.SphereGeometry(0.05, 12, 10), std(0xf0605a, 0.5, { emissive: 0x801010, emissiveIntensity: 0.3 }), [0.09, 0.0, 0.03], [0, 0, 0], [1, 0.7, 1], false);
  const mos = makeMosquito();
  mos.scale.setScalar(0.34);
  scene.add(mos);
  return { scene, aff, mos, bump, moonLight };
}

// ------------------------------------------------------- macro garden world
export const POT = new THREE.Vector3(-3.4, 0, 5.0);
export function buildGarden() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffd9b0, 30, 120);
  const sky = makeSky({ top: 0x5f8fe8, mid: 0x9cc4ff, horizon: 0xffd2a8, bottom: 0xf3c99a, radius: 400 });
  const stars = makeStars(10, 380, 1);
  stars.visible = false;
  scene.add(sky, stars);
  scene.add(new THREE.HemisphereLight(0xdfeeff, 0x6a8a4a, 1.6));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
  sun.position.set(-8, 14, 10);
  shadowCfg(sun, 14);
  scene.add(sun, sun.target);
  const ground = add(scene, new THREE.CircleGeometry(160, 64), std(0x7cc46a, 0.95), [0, 0, 0], [-Math.PI / 2, 0, 0]);
  ground.receiveShadow = true;
  const R = rng(21);
  // soft hills far away
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    add(scene, new THREE.SphereGeometry(14 + R() * 10, 18, 10), std(i % 2 ? 0x8fd07a : 0x76bf66, 1), [Math.cos(a) * 85, -6, Math.sin(a) * 85], [0, 0, 0], [1.6, 0.7, 1], false);
  }
  // keep the front of the set (where the cameras stand) clear
  const blocked = (x, z) => (z > 1.5 && Math.abs(x) < 16) || Math.hypot(x - POT.x, z - POT.z) < 3.5;
  for (let i = 0; i < 110; i++) {
    const a = R() * Math.PI * 2, r = 7 + R() * 40;
    if (blocked(Math.cos(a) * r, Math.sin(a) * r)) continue;
    const gr = makeGrass(R, 0.8 + R() * 0.8);
    gr.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    scene.add(gr);
  }
  // pebbles
  for (let i = 0; i < 26; i++) {
    const a = R() * Math.PI * 2, r = 4 + R() * 22;
    if (blocked(Math.cos(a) * r, Math.sin(a) * r)) continue;
    add(scene, new THREE.IcosahedronGeometry(0.3 + R() * 0.6, 1), std([0xcfc6b8, 0xb9ae9e, 0xe0d8c8][i % 3], 0.9, { flatShading: true }), [Math.cos(a) * r, 0.1, Math.sin(a) * r], [R(), R(), R()], [1, 0.6, 1]);
  }
  // hero flower (male mosquito sips here), plus a ring of others
  const hero = makeFlower(R, { scale: 1.6, petal: 0xff7eb6, stem: 3.0 });
  hero.position.set(-3.2, 0, -2.5);
  scene.add(hero);
  const cols = [0xffd84a, 0xb98aff, 0xff8a5b, 0x7cc8ff, 0xff7eb6, 0xffffff];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + R() * 0.3, r = 9 + R() * 18;
    const f = makeFlower(R, { scale: 1 + R() * 0.8, petal: cols[i % cols.length], stem: 2.4 + R() * 2.2 });
    if (blocked(Math.cos(a) * r, Math.sin(a) * r - 4)) continue;
    f.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 4);
    f.rotation.y = R() * 6;
    scene.add(f);
  }
  const f2 = makeFlower(R, { scale: 1.3, petal: 0xffd84a, stem: 2.2 });
  f2.position.set(4.6, 0, -4.2);
  scene.add(f2);

  const aff = makeAffan();
  scene.add(aff.root);
  const male = makeMosquito({ male: true });
  male.scale.setScalar(1.5);
  scene.add(male);
  const female = makeMosquito();
  female.scale.setScalar(1.5);
  scene.add(female);
  const pot = makePot();
  pot.position.copy(POT);
  scene.add(pot);
  // water splash drops for the pot tip-over
  const drops = [];
  const dm = new THREE.MeshStandardMaterial({ color: 0x8fd3ff, roughness: 0.1, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 40; i++) {
    const d = add(scene, new THREE.SphereGeometry(0.09 + R() * 0.1, 10, 8), dm, [0, -5, 0], [0, 0, 0], [1, 1, 1], false);
    d.userData.v = [-(1.8 + R() * 3.5), 2 + R() * 3.5, (R() - 0.5) * 3];
    drops.push(d);
  }
  // floating pollen sparkles
  const sparkles = new THREE.Group();
  for (let i = 0; i < 60; i++) {
    const s = glow([0xfff6c8, 0xffe08a, 0xffffff][i % 3], 0.35 + R() * 0.4, 0.8);
    s.position.set((R() - 0.5) * 30, 0.5 + R() * 7, (R() - 0.5) * 24);
    s.userData.ph = R() * 10;
    sparkles.add(s);
  }
  scene.add(sparkles);
  sparkles.userData.update = (t) => sparkles.children.forEach((s, i) => {
    s.position.y += Math.sin(t * 0.7 + s.userData.ph) * 0.002;
    s.material.opacity = 0.35 + 0.45 * Math.max(0, Math.sin(t * 1.6 + s.userData.ph));
    void i;
  });
  return { scene, sky, stars, sun, aff, hero, male, female, pot, drops, sparkles };
}

// ------------------------------------------------------- skin cross-section
// A slice of skin seen from the side: top layer, lower layer with a blood
// vessel, the mosquito's proboscis, saliva, body defenders and the bump.
export function buildSkin() {
  const scene = new THREE.Scene();
  const bgTex = canvasTex(540, 960, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#bfe6ff');
    gr.addColorStop(0.5, '#e9f6ff');
    gr.addColorStop(1, '#ffe7d6');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  scene.background = bgTex;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8b8a8, 1.7));
  const key = new THREE.DirectionalLight(0xfff4e8, 2.0);
  key.position.set(3, 8, 9);
  shadowCfg(key, 9);
  scene.add(key);
  // layers: x along the slice, the cut face is at z = 0
  const W = 14;
  const top = add(scene, new THREE.BoxGeometry(W, 0.8, 8), std(0xe8a57c, 0.6, { emissive: 0x3a1608, emissiveIntensity: 0.12 }), [0, -0.4, -4]);
  add(scene, new THREE.BoxGeometry(W, 3.6, 8), std(0xf7c3ad, 0.7), [0, -2.6, -4]);
  add(scene, new THREE.BoxGeometry(W, 2, 8), std(0xfbe2b8, 0.8), [0, -5.4, -4]);
  // fine skin texture bumps on top
  const R = rng(31);
  for (let i = 0; i < 80; i++) add(scene, new THREE.SphereGeometry(0.06 + R() * 0.06, 8, 6), std(0xdc9670, 0.7), [(R() - 0.5) * W, 0.0, -R() * 7.5], [0, 0, 0], [1, 0.3, 1], false);
  // blood vessel tube along x, half out of the cut face
  add(scene, new THREE.CylinderGeometry(0.55, 0.55, W, 32), std(0xc8283a, 0.45, { emissive: 0x500008, emissiveIntensity: 0.3 }), [0, -2.6, 0], [0, 0, Math.PI / 2]);
  const cells = [];
  const cm = std(0xff4a5a, 0.4, { emissive: 0x700010, emissiveIntensity: 0.4 });
  for (let i = 0; i < 16; i++) {
    const c = add(scene, new THREE.TorusGeometry(0.16, 0.08, 8, 16), cm, [0, -2.6 + (R() - 0.5) * 0.5, 0.55], [0, R(), 0], [1, 1, 0.6], false);
    c.userData.x0 = R() * W;
    cells.push(c);
  }
  // the bump (bentol) grows from the surface
  const bump = add(scene, new THREE.SphereGeometry(1.6, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), std(0xf08a74, 0.5, { emissive: 0x501008, emissiveIntensity: 0.25 }), [0, 0, -1.2], [0, 0, 0], [1, 0.001, 1]);
  const redness = add(scene, new THREE.CircleGeometry(2.4, 40), new THREE.MeshBasicMaterial({ map: glowTexLocal(), color: 0xff5050, transparent: true, opacity: 0, depthWrite: false }), [0, 0.02, -1.2], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  // proboscis inside the skin, drawn on the cut face
  const probIn = add(scene, new THREE.CylinderGeometry(0.06, 0.09, 1, 10), std(0x3a3a4c, 0.4), [0, 0, 0.12], [0, 0, 0], [1, 1, 1], false);
  // saliva and defender blobs
  const saliva = [];
  const sm = std(0x7fe08a, 0.3, { emissive: 0x1c6020, emissiveIntensity: 0.5 });
  for (let i = 0; i < 22; i++) {
    const s = add(scene, new THREE.SphereGeometry(0.11 + R() * 0.07, 12, 10), sm, [0, -5, 0.2], [0, 0, 0], [1, 1, 0.5], false);
    s.userData = { a: (R() - 0.5) * 2.6, r: 0.4 + R() * 1.6, d: R() * 0.8 };
    saliva.push(s);
  }
  const defenders = [];
  const dmat = std(0xf6f3ff, 0.4, { emissive: 0x6a5aa0, emissiveIntensity: 0.25 });
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x1a1a30 });
  for (let i = 0; i < 9; i++) {
    const d = new THREE.Group();
    add(d, new THREE.SphereGeometry(0.26, 16, 12), dmat, [0, 0, 0], [0, 0, 0], [1, 0.9, 0.5], false);
    for (const s of [-1, 1]) add(d, new THREE.SphereGeometry(0.04, 8, 6), eyeM, [0.08 * s, 0.05, 0.13], [0, 0, 0], [1, 1.3, 1], false);
    d.userData = { x0: (i - 4) * 1.4 + (R() - 0.5) * 0.5, ph: R() * 6 };
    d.position.set(0, -5, 0.25);
    scene.add(d);
    defenders.push(d);
  }
  const mos = makeMosquito();
  mos.scale.setScalar(2.2);
  scene.add(mos);
  return { scene, top, bump, redness, probIn, saliva, defenders, cells, mos, W };
}

function glowTexLocal() {
  return canvasTex(128, 128, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, w, w);
  });
}

// -------------------------------------------------------------------- outro
export function buildOutro() {
  const scene = new THREE.Scene();
  const bg = canvasTex(540, 960, (g) => {
    const gr = g.createRadialGradient(270, 380, 40, 270, 420, 700);
    gr.addColorStop(0, '#8fd0ff');
    gr.addColorStop(0.45, '#3f9cf2');
    gr.addColorStop(1, '#1a5fcf');
    g.fillStyle = gr;
    g.fillRect(0, 0, 540, 960);
  });
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
  const mos = makeMosquito();
  mos.scale.setScalar(0.5);
  scene.add(mos);
  return { scene, aff, mos };
}
