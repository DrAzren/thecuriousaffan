// Episode 027 sets: Affan's bedroom at night (with his dog), the bright
// science stage where the yawn is explained, and the branded outro stage.
// Everything is procedural and deterministic.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, clamp, lerp } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeMoon, glow } from '../../shared/props.js';

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const rbox = (w, h, d, r = 0.08) => new RoundedBoxGeometry(w, h, d, 4, r);

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
  light.shadow.normalBias = 0.03;
}

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}

function starPath(g, x, y, r, n = 5) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i / (n * 2)) * Math.PI * 2;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}

// ---------------------------------------------------------------------- dog
// A friendly cartoon puppy, sitting. pose({ yawn, headYaw, headTilt, look, tail, blink })
export function makeDog() {
  const root = new THREE.Group();
  const fur = std(0xd99a52, 0.75), cream = std(0xfbe8cc, 0.8), dark = std(0x1b1214, 0.35), ear = std(0x9a5a2e, 0.8);
  const body = new THREE.Group();
  root.add(body);
  add(body, new THREE.SphereGeometry(0.62, 32, 24), fur, [0, 0.72, -0.1], [0.25, 0, 0], [1, 1.15, 1.05]);
  add(body, new THREE.SphereGeometry(0.42, 24, 18), cream, [0, 0.82, 0.32], [0.3, 0, 0], [1, 1.2, 0.6]);
  // haunches + feet
  for (const s of [-1, 1]) {
    add(body, new THREE.SphereGeometry(0.34, 20, 16), fur, [0.38 * s, 0.32, -0.2], [0, 0, 0], [0.9, 0.85, 1.3]);
    add(body, new THREE.SphereGeometry(0.16, 16, 12), cream, [0.42 * s, 0.09, 0.22], [0, 0, 0], [1, 0.6, 1.5]);
    add(body, new THREE.CylinderGeometry(0.12, 0.13, 0.75, 14), fur, [0.24 * s, 0.42, 0.34], [0.12, 0, 0]);
    add(body, new THREE.SphereGeometry(0.15, 16, 12), cream, [0.24 * s, 0.07, 0.42], [0, 0, 0], [1, 0.6, 1.3]);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.35, -0.72);
  body.add(tail);
  add(tail, new THREE.CapsuleGeometry(0.08, 0.5, 6, 12), fur, [0, 0.25, -0.05], [-0.5, 0, 0]);
  // head
  const head = new THREE.Group();
  head.position.set(0, 1.42, 0.12);
  body.add(head);
  add(head, new THREE.SphereGeometry(0.5, 32, 24), fur, [0, 0.05, 0], [0, 0, 0], [1.05, 0.95, 0.95]);
  add(head, new THREE.SphereGeometry(0.3, 24, 18), cream, [0, -0.08, 0.38], [0, 0, 0], [1, 0.75, 0.9]);
  add(head, new THREE.SphereGeometry(0.085, 16, 12), dark, [0, 0.02, 0.64], [0, 0, 0], [1.25, 0.9, 0.9]);
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = add(head, new THREE.SphereGeometry(0.07, 16, 12), dark, [0.19 * s, 0.17, 0.42]);
    add(e, new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0.02, 0.03, 0.055], [0, 0, 0], [1, 1, 1], false);
    const lid = add(head, new THREE.SphereGeometry(0.078, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), fur, [0.19 * s, 0.17, 0.42], [-1.8, 0, 0]);
    eyes.push({ e, lid });
    const earG = new THREE.Group();
    earG.position.set(0.42 * s, 0.3, -0.02);
    head.add(earG);
    add(earG, new THREE.SphereGeometry(0.2, 18, 14), ear, [0.06 * s, -0.26, 0], [0, 0, 0.25 * s], [0.55, 1.25, 0.32]);
    eyes[eyes.length - 1].ear = earG;
  }
  // lower jaw hinges open for the yawn
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.2, 0.3);
  head.add(jaw);
  add(jaw, new THREE.SphereGeometry(0.22, 20, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), cream, [0, 0.02, 0.12], [0, 0, 0], [1.05, 0.7, 1.25]);
  const mouth = add(head, new THREE.SphereGeometry(0.2, 20, 14), std(0x5e1f24, 0.6), [0, -0.2, 0.42], [0, 0, 0], [1, 0.1, 0.7], false);
  const tongue = add(jaw, new THREE.SphereGeometry(0.12, 16, 12), std(0xf07c8a, 0.5), [0, 0.05, 0.22], [0, 0, 0], [0.9, 0.35, 1.2], false);
  const parts = { body, head, jaw, mouth, tongue, tail, eyes };

  function pose({ yawn = 0, headYaw = 0, headTilt = 0, headPitch = 0, tail: tw = 0, blink = 0, bob = 0 } = {}) {
    const y = clamp(yawn);
    body.position.y = bob;
    head.rotation.set(headPitch - 0.35 * y, headYaw, headTilt, 'YXZ');
    jaw.rotation.x = 0.85 * y;
    mouth.scale.set(1, lerp(0.1, 1.1, y), 0.7);
    mouth.visible = y > 0.03;
    tongue.position.z = 0.22 + 0.08 * y;
    tail.rotation.set(0, 0, Math.sin(tw) * 0.6);
    const shut = Math.max(clamp(blink), clamp((y - 0.3) / 0.4));
    for (const { lid, ear: er } of eyes) {
      lid.rotation.x = lerp(-1.8, -0.15, shut);
      er.rotation.x = -0.3 * y;
    }
  }
  pose();
  return { root, parts, pose };
}

// ------------------------------------------------------------------ bedroom
export function buildBedroom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1640);
  const hemi = new THREE.HemisphereLight(0xb8b4ff, 0x3a2a50, 1.05);
  scene.add(hemi);
  // moonlight through the window
  const moonL = new THREE.DirectionalLight(0xc8d4ff, 1.4);
  moonL.position.set(-6, 9, -12);
  shadowCfg(moonL, 7);
  scene.add(moonL, moonL.target);
  // warm lamp + soft front fill so faces read
  const lampL = new THREE.PointLight(0xffb86a, 14, 9, 1.6);
  lampL.position.set(2.0, 2.6, -1.9);
  scene.add(lampL);
  const fill = new THREE.DirectionalLight(0xffe6cc, 1.25);
  fill.position.set(2, 5, 9);
  scene.add(fill);

  // floor: warm planks
  const floorTex = canvasTex(512, 512, (g, w, h) => {
    const R = rng(4);
    for (let i = 0; i < 8; i++) {
      const c = 150 + Math.floor(R() * 25);
      g.fillStyle = `rgb(${c + 40},${c - 10},${c - 60})`;
      g.fillRect(0, i * 64, w, 64);
      g.fillStyle = 'rgba(70,35,20,0.35)';
      g.fillRect(0, i * 64, w, 3);
      g.fillRect(((i * 197) % 400) + 40, i * 64, 3, 64);
    }
  }, [6, 6]);
  add(scene, new THREE.PlaneGeometry(30, 30), std(0xffffff, 0.8, { map: floorTex }), [0, 0, 0], [-Math.PI / 2, 0, 0]).castShadow = false;

  // wallpaper with little stars and moons
  const wallTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#3b3f8f';
    g.fillRect(0, 0, w, h);
    const R = rng(11);
    for (let i = 0; i < 26; i++) {
      g.fillStyle = i % 3 ? 'rgba(255,226,140,0.55)' : 'rgba(190,210,255,0.5)';
      starPath(g, R() * w, R() * h, 8 + R() * 10);
      g.fill();
    }
  }, [4, 2]);
  const wallMat = std(0xffffff, 0.9, { map: wallTex });
  add(scene, new THREE.PlaneGeometry(30, 12), wallMat, [0, 6, -3.2]).castShadow = false;
  add(scene, new THREE.PlaneGeometry(14, 12), wallMat, [-6.5, 6, 3.8], [0, Math.PI / 2, 0]).castShadow = false;
  // skirting
  add(scene, new THREE.BoxGeometry(30, 0.3, 0.08), std(0xf2e6d8, 0.6), [0, 0.15, -3.15]);

  // window with a night sky
  const skyTex = canvasTex(512, 560, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#0b1240');
    gr.addColorStop(1, '#3a3f9a');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    const R = rng(21);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(255,250,230,${0.4 + R() * 0.6})`;
      g.beginPath();
      g.arc(R() * w, R() * h * 0.85, 1 + R() * 2.4, 0, Math.PI * 2);
      g.fill();
    }
    // rooftops silhouette
    g.fillStyle = '#141838';
    for (let x = -20; x < w; x += 110) {
      const hh = 70 + ((x * 37) % 60);
      g.fillRect(x, h - hh, 100, hh);
      g.beginPath();
      g.moveTo(x - 10, h - hh);
      g.lineTo(x + 50, h - hh - 45);
      g.lineTo(x + 110, h - hh);
      g.fill();
      g.fillStyle = 'rgba(255,200,110,0.8)';
      g.fillRect(x + 30, h - hh + 20, 16, 16);
      g.fillStyle = '#141838';
    }
  });
  const win = new THREE.Group();
  win.position.set(-2.2, 3.4, -3.15);
  scene.add(win);
  add(win, new THREE.PlaneGeometry(2.4, 2.6), new THREE.MeshBasicMaterial({ map: skyTex }), [0, 0, 0.0], [0, 0, 0], [1, 1, 1], false);
  const moon = makeMoon(0.34);
  moon.position.set(0.55, 0.62, 0.04);
  moon.userData.ball.material.depthWrite = false;
  win.add(moon);
  const frameMat = std(0xf6efe4, 0.5);
  for (const [x, y, w, h] of [[0, 1.37, 2.7, 0.18], [0, -1.37, 2.9, 0.22], [-1.27, 0, 0.18, 2.9], [1.27, 0, 0.18, 2.9], [0, 0, 0.09, 2.6], [0, 0, 2.4, 0.09]]) {
    add(win, rbox(w, h, 0.16, 0.03), frameMat, [x, y, 0.06]);
  }
  // curtains
  const curtain = std(0x6fd0c4, 0.85);
  for (const s of [-1, 1]) {
    const c = add(win, new THREE.CylinderGeometry(0.32, 0.42, 3.4, 18, 1, false, 0, Math.PI), curtain, [s * 1.65, -0.15, 0.25], [0, s > 0 ? Math.PI : 0, 0], [1, 1, 0.45]);
    c.castShadow = false;
  }
  add(win, new THREE.CylinderGeometry(0.04, 0.04, 4.1, 10), std(0xd9b26a, 0.4), [0, 1.62, 0.3], [0, 0, Math.PI / 2]);

  // bed (head against the back wall)
  const bed = new THREE.Group();
  bed.position.set(3.4, 0, -0.6);
  scene.add(bed);
  const wood = std(0xc98a55, 0.6);
  add(bed, rbox(2.5, 0.55, 4.6, 0.1), wood, [0, 0.45, 0]);
  add(bed, rbox(2.6, 1.9, 0.22, 0.1), wood, [0, 1.0, -2.35]);
  add(bed, rbox(2.35, 0.42, 4.3, 0.18), std(0xf7f4ee, 0.85), [0, 0.9, 0]);
  add(bed, rbox(2.42, 0.3, 2.9, 0.15), std(0x4f8ff0, 0.85), [0, 1.05, 0.7]);
  add(bed, rbox(1.5, 0.32, 0.75, 0.16), std(0xffffff, 0.9), [0, 1.25, -1.7], [0.15, 0, 0]);
  // star on the blanket
  const st = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? 0.17 : 0.4;
    const a = Math.PI / 2 + (i / 10) * Math.PI * 2;
    i ? st.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : st.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  add(bed, new THREE.ShapeGeometry(st), std(0xffd84a, 0.6), [0, 1.205, 0.8], [-Math.PI / 2, 0, 0.3], [1, 1, 1], false);

  // bedside table + lamp
  add(scene, rbox(1.1, 1.2, 1.0, 0.08), std(0xf2e2c8, 0.6), [1.55, 0.6, -2.4]);
  add(scene, new THREE.CylinderGeometry(0.18, 0.24, 0.5, 16), std(0x6fd0c4, 0.5), [1.55, 1.45, -2.4]);
  add(scene, new THREE.CylinderGeometry(0.26, 0.42, 0.45, 20, 1, true), std(0xffe0a8, 0.5, { emissive: 0xffb050, emissiveIntensity: 0.9, side: THREE.DoubleSide }), [1.55, 1.92, -2.4]);
  const lampGlow = glow(0xffc070, 3.2, 0.6);
  lampGlow.position.set(1.55, 1.95, -2.3);
  scene.add(lampGlow);
  lampL.position.set(1.55, 2.1, -2.0);

  // rug + toys
  add(scene, new THREE.CylinderGeometry(2.4, 2.4, 0.03, 48), std(0xf28fb0, 0.95), [-0.6, 0.015, 0.6]).castShadow = false;
  add(scene, new THREE.CylinderGeometry(1.7, 1.7, 0.035, 48), std(0xffc4d6, 0.95), [-0.6, 0.02, 0.6]).castShadow = false;
  const R = rng(9);
  [[0xffcf33, -4.3, -1.7], [0x4f8ff0, -3.6, -2.2], [0xff6f61, -3.9, -1.2]].forEach(([c, x, z], i) => {
    add(scene, rbox(0.55, 0.55, 0.55, 0.08), std(c, 0.5), [x, 0.275 + (i === 2 ? 0.55 : 0), z], [0, R() * 1.5, 0]);
  });
  add(scene, new THREE.SphereGeometry(0.42, 24, 18), std(0x7cd67a, 0.5), [-4.6, 0.42, 0.4]);

  const aff = makeAffan();
  scene.add(aff.root);
  const dog = makeDog();
  dog.root.position.set(-1.9, 0, 0.9);
  dog.root.rotation.y = 0.6;
  scene.add(dog.root);
  moonL.target.position.set(0, 0, 0);
  return { scene, aff, dog, moon };
}

// ------------------------------------------------------------- science stage
export function buildLab() {
  const scene = new THREE.Scene();
  const bgTex = canvasTex(540, 960, (g, w, h) => {
    const gr = g.createRadialGradient(270, 400, 30, 270, 460, 720);
    gr.addColorStop(0, '#b7f1ff');
    gr.addColorStop(0.45, '#5bb8f5');
    gr.addColorStop(1, '#3b55c9');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    // faint grid of dots
    g.fillStyle = 'rgba(255,255,255,0.18)';
    for (let y = 20; y < h; y += 36) for (let x = 20; x < w; x += 36) {
      g.beginPath();
      g.arc(x + ((y / 36) % 2) * 18, y, 2.2, 0, Math.PI * 2);
      g.fill();
    }
  });
  scene.background = bgTex;
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x5a6ab8, 1.45));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.3);
  key.position.set(3, 7, 8);
  shadowCfg(key, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc8e8ff, 2.0);
  rim.position.set(-6, 5, -6);
  scene.add(rim);
  // round stage
  add(scene, new THREE.CylinderGeometry(3.2, 3.4, 0.4, 64), std(0xffffff, 0.5), [0, -0.2, 0]);
  add(scene, new THREE.TorusGeometry(3.25, 0.08, 12, 96), std(0xffd84a, 0.4, { emissive: 0xffb820, emissiveIntensity: 0.5 }), [0, 0.0, 0], [Math.PI / 2, 0, 0]);
  add(scene, new THREE.CylinderGeometry(2.2, 2.2, 0.02, 64), std(0xdff3ff, 0.6), [0, 0.01, 0]).castShadow = false;
  // floating shapes
  const floaters = [];
  const R = rng(27);
  const cols = [0xffd84a, 0xff8fb8, 0x7cf0c0, 0xffffff, 0xb9a0ff];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + R() * 0.3;
    const r = 5 + R() * 4;
    const geo = [new THREE.SphereGeometry(0.3, 20, 14), new THREE.TorusGeometry(0.3, 0.11, 12, 28), new THREE.OctahedronGeometry(0.34), new THREE.IcosahedronGeometry(0.3)][i % 4];
    const m = add(scene, geo, std(cols[i % cols.length], 0.4), [Math.cos(a) * r, 1 + R() * 6, -Math.abs(Math.sin(a)) * r - 2], [R() * 3, R() * 3, 0], [1, 1, 1], false);
    floaters.push({ m, y0: m.position.y, ph: R() * 6, sp: 0.5 + R() * 0.6 });
  }
  const halo = glow(0xffffff, 10, 0.3);
  halo.position.set(0, 3, -3);
  scene.add(halo);
  const aff = makeAffan();
  scene.add(aff.root);
  const update = (t) => {
    for (const f of floaters) {
      f.m.position.y = f.y0 + Math.sin(t * f.sp + f.ph) * 0.25;
      f.m.rotation.y = t * 0.4 + f.ph;
    }
  };
  return { scene, aff, update };
}

// ---------------------------------------------------------------- outro
export function buildOutro() {
  const scene = new THREE.Scene();
  scene.background = canvasTex(540, 960, (g) => {
    const gr = g.createRadialGradient(270, 380, 40, 270, 420, 700);
    gr.addColorStop(0, '#8fd0ff');
    gr.addColorStop(0.45, '#3f9cf2');
    gr.addColorStop(1, '#1a5fcf');
    g.fillStyle = gr;
    g.fillRect(0, 0, 540, 960);
  });
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x6a7ab8, 1.5));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.4);
  key.position.set(3, 6, 8);
  shadowCfg(key, 5);
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
