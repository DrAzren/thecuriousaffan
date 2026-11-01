// Episode 004 sets: Affan's living room (real world), the digestive-system
// learning world (giant friendly stomach + intestine model on a glowing
// observation platform), the peristalsis close-up tube and the outro stage.
// Everything is procedural and deterministic.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, clamp } from '../../shared/core.js';
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
  c.near = 1;
  c.far = 120;
  light.shadow.bias = -0.0005;
  light.shadow.normalBias = 0.03;
}

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

// ---------------------------------------------------------------- gadget
// Affan's magical shrinking gadget: rounded cyan remote with a star button,
// a dial screen and a glowing antenna tip.
export function makeGadget() {
  const g = new THREE.Group();
  add(g, new RoundedBoxGeometry(0.34, 0.52, 0.17, 4, 0.07), std(0x2ec4e8, 0.35, { emissive: 0x0a3c52, emissiveIntensity: 0.4 }), [0, 0, 0]);
  add(g, new RoundedBoxGeometry(0.26, 0.16, 0.04, 2, 0.02), std(0x17256b, 0.3), [0, 0.12, 0.085]);
  const screen = add(g, new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0x9ff5ff }), [0, 0.12, 0.107], [0, 0, 0], [1, 1, 1], false);
  const btn = add(g, new THREE.CylinderGeometry(0.075, 0.08, 0.05, 24), std(0xffc928, 0.3, { emissive: 0xffa000, emissiveIntensity: 0.6 }), [0, -0.1, 0.09], [Math.PI / 2, 0, 0]);
  add(g, new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8), std(0xdfe6f0, 0.3, { metalness: 0.4 }), [0.1, 0.38, 0]);
  const tip = add(g, new THREE.SphereGeometry(0.055, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff27a }), [0.1, 0.55, 0], [0, 0, 0], [1, 1, 1], false);
  const tg = glow(0xfff27a, 0.6, 0.9);
  tg.position.copy(tip.position);
  g.add(tg);
  g.userData = { btn, screen, tip, tg };
  return g;
}

// ------------------------------------------------------------ living room
export function buildLivingRoom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf6e2c6);
  scene.fog = new THREE.Fog(0xf6e2c6, 22, 60);
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x9a7a5a, 1.25));
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.6);
  sun.position.set(-5, 9, 8);
  shadowCfg(sun, 8);
  scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight(0xbfe6ff, 1.2);
  rim.position.set(6, 6, -6);
  scene.add(rim);

  // wooden floor
  const floorTex = canvasTex(1024, 1024, (g, w, h) => {
    const R = rng(4);
    const n = 8;
    for (let i = 0; i < n; i++) {
      const base = [212, 160, 112].map((c) => c + (R() - 0.5) * 22);
      g.fillStyle = `rgb(${base.join(',')})`;
      g.fillRect(0, (i * h) / n, w, h / n);
      for (let k = 0; k < 30; k++) {
        g.strokeStyle = `rgba(150,100,60,${0.05 + R() * 0.08})`;
        g.lineWidth = 1 + R() * 2;
        const y = (i * h) / n + R() * (h / n);
        g.beginPath();
        g.moveTo(0, y);
        g.bezierCurveTo(w * 0.3, y + (R() - 0.5) * 8, w * 0.6, y + (R() - 0.5) * 8, w, y);
        g.stroke();
      }
      g.fillStyle = 'rgba(110,70,40,0.55)';
      g.fillRect(0, (i * h) / n, w, 3);
      const cut = R() * w;
      g.fillRect(cut, (i * h) / n, 3, h / n);
    }
  }, [5, 5]);
  add(scene, new THREE.PlaneGeometry(40, 40), std(0xffffff, 0.7, { map: floorTex }), [0, 0, 0], [-Math.PI / 2, 0, 0]).castShadow = false;

  // round rug
  const rugTex = canvasTex(1024, 1024, (g, w) => {
    const c = w / 2;
    const rings = ['#2ec4e8', '#ffffff', '#ffc928', '#ffffff', '#2ec4e8', '#ffb08a', '#ffffff', '#2ec4e8'];
    rings.forEach((col, i) => {
      g.fillStyle = col;
      g.beginPath();
      g.arc(c, c, c * (1 - i * 0.11), 0, Math.PI * 2);
      g.fill();
    });
    g.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.beginPath();
      g.arc(c + Math.cos(a) * c * 0.835, c + Math.sin(a) * c * 0.835, 9, 0, Math.PI * 2);
      g.fill();
    }
    const R = rng(8);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `rgba(0,0,0,${R() * 0.05})`;
      g.fillRect(R() * w, R() * w, 2, 2);
    }
  });
  const rug = add(scene, new THREE.CircleGeometry(3.6, 64), std(0xffffff, 0.95, { map: rugTex }), [0, 0.012, 0.6], [-Math.PI / 2, 0, 0]);
  rug.castShadow = false;

  // back wall with wainscot, skirting and a window
  const wall = add(scene, new THREE.PlaneGeometry(40, 14), std(0xfbe8cf, 0.95), [0, 7, -5.5]);
  wall.castShadow = false;
  add(scene, new THREE.PlaneGeometry(40, 2.1), std(0xffcfae, 0.9), [0, 1.05, -5.49], [0, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.BoxGeometry(40, 0.12, 0.08), std(0xffffff, 0.6), [0, 2.12, -5.45], [0, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.BoxGeometry(40, 0.3, 0.1), std(0xffffff, 0.6), [0, 0.15, -5.45], [0, 0, 0], [1, 1, 1], false);
  const skyTex = canvasTex(256, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#5cc8ff');
    gr.addColorStop(1, '#d9f4ff');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.95)';
    for (const [x, y, r] of [[70, 150, 34], [110, 140, 44], [150, 152, 32], [180, 330, 26], [210, 320, 34]]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#7fcf7a';
    g.beginPath();
    g.ellipse(60, h + 20, 160, 110, 0, 0, Math.PI * 2);
    g.ellipse(230, h + 40, 140, 120, 0, 0, Math.PI * 2);
    g.fill();
  });
  const winX = -3.6;
  add(scene, new THREE.PlaneGeometry(2.6, 3.0), new THREE.MeshBasicMaterial({ map: skyTex }), [winX, 4.6, -5.47], [0, 0, 0], [1, 1, 1], false);
  const frameM = std(0xffffff, 0.5);
  for (const [x, y, w, h] of [[0, 1.5, 2.9, 0.16], [0, -1.5, 3.1, 0.22], [-1.35, 0, 0.16, 3.1], [1.35, 0, 0.16, 3.1], [0, 0, 0.08, 3.0], [0, 0.2, 2.6, 0.08]]) {
    add(scene, new THREE.BoxGeometry(w, h, 0.14), frameM, [winX + x, 4.6 + y, -5.42]);
  }
  // curtains
  const curtain = std(0x2ec4e8, 0.85);
  for (const s of [-1, 1]) {
    const geo = new THREE.CylinderGeometry(0.45, 0.6, 3.9, 20, 1, true);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const a = Math.atan2(p.getZ(i), p.getX(i));
      const k = 1 + 0.12 * Math.sin(a * 7);
      p.setX(i, p.getX(i) * k);
      p.setZ(i, p.getZ(i) * k * 0.35);
    }
    geo.computeVertexNormals();
    const c = add(scene, geo, curtain, [winX + s * 1.75, 4.35, -5.2]);
    c.material.side = THREE.DoubleSide;
  }
  add(scene, new THREE.CylinderGeometry(0.05, 0.05, 4.6, 10), std(0xf2b36b, 0.4), [winX, 6.35, -5.15], [0, 0, Math.PI / 2]);
  const sunGlow = glow(0xfff6d0, 6, 0.35);
  sunGlow.position.set(winX, 4.8, -5.3);
  scene.add(sunGlow);

  // picture frames: a rocket and a smiling sun (Affan's drawings)
  const pic = (draw) => canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = '#fffaf0';
    g.fillRect(0, 0, w, h);
    draw(g, w, h);
  });
  const rocketPic = pic((g) => {
    g.fillStyle = '#ff8a5b';
    g.beginPath();
    g.moveTo(128, 40);
    g.quadraticCurveTo(190, 120, 170, 230);
    g.lineTo(86, 230);
    g.quadraticCurveTo(66, 120, 128, 40);
    g.fill();
    g.fillStyle = '#2ec4e8';
    g.beginPath();
    g.arc(128, 130, 26, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffc928';
    g.beginPath();
    g.moveTo(96, 232);
    g.lineTo(128, 300);
    g.lineTo(160, 232);
    g.fill();
  });
  const sunPic = pic((g) => {
    g.fillStyle = '#ffc928';
    g.beginPath();
    g.arc(128, 160, 62, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#ffc928';
    g.lineWidth = 12;
    g.lineCap = 'round';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      g.beginPath();
      g.moveTo(128 + Math.cos(a) * 80, 160 + Math.sin(a) * 80);
      g.lineTo(128 + Math.cos(a) * 108, 160 + Math.sin(a) * 108);
      g.stroke();
    }
    g.fillStyle = '#17256b';
    g.beginPath();
    g.arc(106, 150, 8, 0, Math.PI * 2);
    g.arc(150, 150, 8, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#17256b';
    g.lineWidth = 7;
    g.beginPath();
    g.arc(128, 168, 26, 0.2, Math.PI - 0.2);
    g.stroke();
  });
  for (const [x, y, tex, col] of [[1.6, 4.9, rocketPic, 0x17256b], [3.6, 4.4, sunPic, 0xff8a5b]]) {
    add(scene, new RoundedBoxGeometry(1.25, 1.55, 0.1, 2, 0.04), std(col, 0.5), [x, y, -5.44]);
    add(scene, new THREE.PlaneGeometry(1.02, 1.3), new THREE.MeshBasicMaterial({ map: tex }), [x, y, -5.38], [0, 0, 0], [1, 1, 1], false);
  }

  // sofa
  const sofaM = std(0x1c2752, 0.8, { emissive: 0x060a1c, emissiveIntensity: 0.25 });
  add(scene, new RoundedBoxGeometry(4.6, 0.95, 1.6, 4, 0.2), sofaM, [2.4, 0.62, -4.4]);
  add(scene, new RoundedBoxGeometry(4.6, 1.5, 0.5, 4, 0.2), sofaM, [2.4, 1.6, -5.0]);
  for (const s of [-1, 1]) add(scene, new RoundedBoxGeometry(0.5, 1.35, 1.7, 4, 0.2), sofaM, [2.4 + s * 2.35, 0.9, -4.4]);
  for (const [x, c] of [[1.3, 0xff9470], [3.5, 0xffc928]]) add(scene, new RoundedBoxGeometry(1.2, 1.0, 0.35, 4, 0.16), std(c, 0.85), [x, 1.55, -4.6], [-0.2, 0, x < 2 ? 0.08 : -0.08]);
  for (const s of [-1, 1]) add(scene, new THREE.CylinderGeometry(0.07, 0.05, 0.3, 8), std(0xb07a4a, 0.6), [2.4 + s * 2.1, 0.15, -3.8]);

  // plant + floor lamp
  add(scene, new THREE.CylinderGeometry(0.5, 0.38, 0.9, 24), std(0xffffff, 0.5), [-6.3, 0.45, -4.4]);
  const leafM = std(0x3fae5a, 0.7);
  const R = rng(21);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const l = add(scene, new THREE.SphereGeometry(0.42, 16, 10), leafM, [-6.3 + Math.cos(a) * 0.35, 1.45 + R() * 0.9, -4.4 + Math.sin(a) * 0.35], [R() - 0.5, a, 0.6 * Math.cos(a)], [0.45, 1.25, 0.18]);
    l.castShadow = true;
  }
  add(scene, new THREE.CylinderGeometry(0.04, 0.04, 4.2, 10), std(0x2a2f3c, 0.4), [6.3, 2.1, -4.2]);
  add(scene, new THREE.CylinderGeometry(0.45, 0.45, 0.06, 24), std(0x2a2f3c, 0.4), [6.3, 0.03, -4.2]);
  add(scene, new THREE.CylinderGeometry(0.42, 0.7, 0.75, 24, 1, true), std(0xfff1d6, 0.8, { emissive: 0xffd9a0, emissiveIntensity: 0.6, side: THREE.DoubleSide }), [6.3, 4.4, -4.2]);
  const lg = glow(0xffd9a0, 3.2, 0.5);
  lg.position.set(6.3, 4.2, -4.2);
  scene.add(lg);

  // toys: letter blocks, a block tower Affan is building, a ball, a toy rocket
  const letter = (ch, bg) => canvasTex(128, 128, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.lineWidth = 10;
    g.strokeRect(10, 10, 108, 108);
    g.fillStyle = '#ffffff';
    g.font = 'bold 86px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(ch, 64, 70);
  });
  const blockCols = ['#2ec4e8', '#ffc928', '#ff8a5b', '#1c2752', '#5bd17a'];
  const blocks = [];
  const block = (x, y, z, ry, i, s = 0.62) => {
    const m = std(0xffffff, 0.5, { map: letter('ABCDE'[i % 5], blockCols[i % 5]) });
    const b = add(scene, new RoundedBoxGeometry(s, s, s, 3, 0.06), m, [x, y + s / 2, z], [0, ry, 0]);
    blocks.push(b);
    return b;
  };
  // tower to Affan's left (+x)
  block(1.45, 0, 0.55, 0.1, 0);
  block(1.45, 0.62, 0.55, -0.15, 1);
  block(1.45, 1.24, 0.55, 0.2, 2);
  const handBlock = block(0, 0, 0, 0, 3); // the one Affan places (moved per frame)
  // scattered
  block(-1.7, 0, 1.4, 0.6, 4);
  block(-2.3, 0, 0.6, -0.3, 1);
  block(-2.0, 0.62, 0.95, 0.2, 2);
  block(2.6, 0, 1.9, 0.8, 0);
  const ball = add(scene, new THREE.SphereGeometry(0.42, 32, 20), std(0xff5d6c, 0.35), [-2.6, 0.42, 2.3]);
  const stripe = add(ball, new THREE.TorusGeometry(0.42, 0.06, 10, 40), std(0xffffff, 0.4), [0, 0, 0], [0.4, 0, 0]);
  stripe.castShadow = false;
  const rocket = new THREE.Group();
  add(rocket, new THREE.CylinderGeometry(0.22, 0.24, 0.9, 20), std(0xffffff, 0.4), [0, 0.6, 0]);
  add(rocket, new THREE.ConeGeometry(0.22, 0.45, 20), std(0xff8a5b, 0.4), [0, 1.27, 0]);
  add(rocket, new THREE.SphereGeometry(0.1, 16, 10), std(0x2ec4e8, 0.2), [0, 0.75, 0.2], [0, 0, 0], [1, 1, 0.4]);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    add(rocket, new THREE.BoxGeometry(0.04, 0.35, 0.25), std(0xffc928, 0.4), [Math.sin(a) * 0.24, 0.3, Math.cos(a) * 0.24], [0, a, 0]);
  }
  rocket.position.set(3.0, 0, 0.3);
  rocket.rotation.z = -0.1;
  scene.add(rocket);

  const aff = makeAffan();
  scene.add(aff.root);
  const gadget = makeGadget();
  gadget.visible = false;
  scene.add(gadget);

  // portal ring for the trip into the learning world
  const portal = new THREE.Group();
  const pm = new THREE.MeshBasicMaterial({ color: 0x7ff3ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  portal.add(new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 12, 64), pm));
  const pg = glow(0x7ff3ff, 3.4, 0.6);
  portal.add(pg);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0xbff8ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  portal.add(disc);
  portal.visible = false;
  scene.add(portal);

  return { scene, aff, gadget, handBlock, blocks, sun, portal, portalMat: pm, portalDisc: disc };
}

// ----------------------------------------------------------------- tubes
// A swept tube along a centreline whose radius can be animated every frame
// (used for peristalsis: rings of muscle squeezing in a travelling wave).
export class Tube {
  constructor(points, { radius = () => 1, segs = 240, radial = 36, material, uRepeat = 8, tension = 0.5 }) {
    this.curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', tension);
    this.segs = segs;
    this.radial = radial;
    const fr = this.curve.computeFrenetFrames(segs, false);
    this.C = [];
    this.N = fr.normals;
    this.B = fr.binormals;
    this.T = fr.tangents;
    this.R0 = [];
    this.len = this.curve.getLength();
    for (let i = 0; i <= segs; i++) {
      const s = i / segs;
      this.C.push(this.curve.getPointAt(s));
      this.R0.push(radius(s));
    }
    const n = (segs + 1) * (radial + 1);
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3);
    this.nrm = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3).fill(1);
    const uv = new Float32Array(n * 2);
    const idx = [];
    for (let i = 0; i <= segs; i++) {
      for (let j = 0; j <= radial; j++) {
        const k = i * (radial + 1) + j;
        uv[k * 2] = (i / segs) * uRepeat;
        uv[k * 2 + 1] = j / radial;
        if (i < segs && j < radial) {
          const a = k, b = k + radial + 1, c = k + 1, d = k + radial + 2;
          idx.push(a, c, b, c, d, b);
        }
      }
    }
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    this.geo = g;
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.r = new Float32Array(segs + 1);
    this.update(() => 1);
  }

  // mult(s) -> radius multiplier; tint(s) -> [r, g, b] vertex colour (optional)
  update(mult, tint = null) {
    const { segs, radial, C, N, B, T, R0, r, pos, nrm, col } = this;
    for (let i = 0; i <= segs; i++) r[i] = R0[i] * mult(i / segs);
    const ds = this.len / segs;
    for (let i = 0; i <= segs; i++) {
      const dr = (r[Math.min(segs, i + 1)] - r[Math.max(0, i - 1)]) / (ds * (i === 0 || i === segs ? 1 : 2));
      const tc = tint ? tint(i / segs) : null;
      for (let j = 0; j <= radial; j++) {
        const a = (j / radial) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const dx = ca * N[i].x + sa * B[i].x, dy = ca * N[i].y + sa * B[i].y, dz = ca * N[i].z + sa * B[i].z;
        const k = (i * (radial + 1) + j) * 3;
        pos[k] = C[i].x + dx * r[i];
        pos[k + 1] = C[i].y + dy * r[i];
        pos[k + 2] = C[i].z + dz * r[i];
        let nx = dx - T[i].x * dr, ny = dy - T[i].y * dr, nz = dz - T[i].z * dr;
        const l = Math.hypot(nx, ny, nz) || 1;
        nrm[k] = nx / l;
        nrm[k + 1] = ny / l;
        nrm[k + 2] = nz / l;
        if (tc) {
          col[k] = tc[0];
          col[k + 1] = tc[1];
          col[k + 2] = tc[2];
        }
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.normal.needsUpdate = true;
    if (tint) this.geo.attributes.color.needsUpdate = true;
  }

  // world point at arc fraction s, offset radially (angle a, fraction of local radius rho)
  at(s, a = 0, rho = 0, out = new THREE.Vector3()) {
    const i = Math.round(clamp(s) * this.segs);
    const ca = Math.cos(a), sa = Math.sin(a);
    out.copy(this.C[i]);
    out.x += (ca * this.N[i].x + sa * this.B[i].x) * rho * this.r[i];
    out.y += (ca * this.N[i].y + sa * this.B[i].y) * rho * this.r[i];
    out.z += (ca * this.N[i].z + sa * this.B[i].z) * rho * this.r[i];
    return out;
  }
  radiusAt(s) {
    return this.r[Math.round(clamp(s) * this.segs)];
  }
}

// Soft glossy organ material with a gentle cyan rim light (friendly, not gory).
function organMat(color, { map = null, rim = 0x9ff0ff, rimK = 0.55, opacity = 1, side = THREE.FrontSide } = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color: map ? 0xffffff : color, map, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.25, vertexColors: true, side,
    transparent: opacity < 1, opacity, depthWrite: opacity >= 1,
    emissive: new THREE.Color(color).multiplyScalar(0.32),
  });
  const rc = new THREE.Color(rim);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRim = { value: new THREE.Vector3(rc.r * rimK, rc.g * rimK, rc.b * rimK) };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += uRim * pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.6);');
  };
  m.customProgramCacheKey = () => 'organ-' + rimK + '-' + side + '-' + opacity;
  return m;
}

// Wall texture: soft folds (rugae) and rings of muscle.
function wallTex(base, ring, fold, seed) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const R = rng(seed);
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = fold;
      g.lineWidth = 6 + R() * 8;
      g.globalAlpha = 0.25 + R() * 0.2;
      const y = R() * h;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 14 + (R() - 0.5) * 6);
      g.stroke();
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 4; i++) {
      g.fillStyle = ring;
      g.globalAlpha = 0.35;
      g.fillRect((i * w) / 4, 0, w / 10, h);
    }
    g.globalAlpha = 1;
  }, [1, 1]);
}

// --------------------------------------------------------- learning world
export const GUT = {
  stomachTop: new THREE.Vector3(6.6, 25.2, 0),
};

export function buildGutWorld() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x16306e, 0.006);
  const sky = makeSky({ top: 0x0a1440, mid: 0x15307a, horizon: 0x2272b4, bottom: 0x0b1840, radius: 900 });
  const stars = makeStars(900, 800, 13);
  scene.add(sky, stars);
  scene.add(new THREE.HemisphereLight(0xd8f1ff, 0x3a2f78, 1.35));
  const key = new THREE.DirectionalLight(0xfff0e0, 2.6);
  key.position.set(14, 30, 30);
  shadowCfg(key, 26, 2048);
  key.shadow.camera.far = 140;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0x7fe0ff, 1.3);
  fill.position.set(-20, 6, 10);
  scene.add(fill);

  // giant friendly digestive model (body's left = +x on screen)
  const model = new THREE.Group();
  scene.add(model);
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const tubes = {};
  const stomachMap = wallTex('#ff9f8f', '#ff7a72', '#ff8a7e', 3);
  const intMap = wallTex('#ff94b4', '#ff7598', '#ff86a6', 5);
  const colonMap = wallTex('#ffb878', '#ff9a52', '#ffa862', 7);
  tubes.eso = new Tube([V(2.2, 36, -1.5), V(2.6, 31, -0.8), V(3.8, 27, 0), V(5.2, 24.4, 0.4), V(6.0, 23.2, 0.6)], {
    radius: (s) => 0.85 * Math.sqrt(1 - (1 - clamp(s / 0.03)) ** 2), segs: 60, radial: 28, material: organMat(0xff8c7a, { map: stomachMap }), uRepeat: 3,
  });
  // stomach J: fundus top -> greater curve -> antrum -> pylorus (narrow)
  tubes.stomach = new Tube([V(6.6, 25.2, 0), V(8.4, 22.6, 0.3), V(8.9, 18.6, 0.6), V(7.6, 14.6, 0.8), V(4.6, 12.4, 1.0), V(1.0, 12.6, 1.0), V(-1.4, 14.0, 0.8)], {
    radius: (s) => {
      const body = 3.3 - 0.9 * Math.pow(s, 1.4);
      const top = Math.sqrt(1 - (1 - clamp(s / 0.12)) ** 2);
      return Math.max(0.75, body * (0.35 + 0.65 * top) * (1 - 0.55 * Math.pow(clamp((s - 0.72) / 0.28), 1.5)));
    },
    segs: 220, radial: 44, material: organMat(0xff8c7a, { map: stomachMap }), uRepeat: 6,
  });
  // duodenum + small intestine coils
  const si = [V(-1.4, 14.0, 0.8), V(-3.4, 12.8, 1.0), V(-4.2, 10.2, 1.2), V(-2.6, 8.4, 1.6)];
  const rows = [5.6, 3.8, 2.0, 0.2, -1.6, -3.4];
  rows.forEach((y, i) => {
    const dir = i % 2 ? -1 : 1;
    for (let k = 0; k <= 5; k++) {
      const u = k / 5;
      const x = dir > 0 ? -5.6 + u * 11.2 : 5.6 - u * 11.2;
      si.push(V(x, y + Math.sin(u * Math.PI * 3 + i) * 0.55, 2.2 + Math.sin(u * 7 + i * 2) * 0.9));
    }
  });
  si.push(V(-5.4, -4.8, 1.8), V(-8.0, -4.4, 0.8));
  tubes.small = new Tube(si, { radius: () => 0.78, segs: 900, radial: 24, material: organMat(0xff7fa3, { map: intMap }), uRepeat: 60 });
  // large intestine frame with haustra bumps
  const li = [V(-8.6, -7.2, 0.4), V(-9.2, -4.6, 0.2), V(-9.6, 1.0, 0), V(-9.4, 6.0, 0), V(-7.6, 8.0, 0.6), V(-3.0, 7.8, 2.6), V(2.0, 8.2, 2.8), V(7.0, 7.8, 2.4), V(9.8, 7.2, 1.0), V(10.4, 3.0, 0), V(10.2, -3.6, 0), V(8.4, -6.8, 0.6), V(4.8, -7.6, 1.0), V(2.6, -9.6, 0.6)];
  const dome = (s, a, b) => Math.sqrt(1 - (1 - clamp(s / a)) ** 2) * Math.sqrt(1 - (1 - clamp((1 - s) / b)) ** 2);
  tubes.large = new Tube(li, {
    radius: (s) => Math.max(0.02, (1.45 - 0.35 * clamp((s - 0.85) / 0.15)) * (1 + 0.12 * Math.sin(s * 150)) * dome(s, 0.025, 0.02)),
    segs: 520, radial: 32, material: organMat(0xffa060, { map: colonMap }), uRepeat: 24,
  });
  for (const t of Object.values(tubes)) model.add(t.mesh);

  // hologram rings around the model + soft halo
  const holo = new THREE.Group();
  const hm = new THREE.MeshBasicMaterial({ color: 0x7ff3ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  for (const [r, y, tilt] of [[17, 8, 0.25], [20, 12, -0.18], [14, 20, 0.12]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.08, 8, 160), hm);
    ring.position.set(0.5, y, 0);
    ring.rotation.set(Math.PI / 2 + tilt, 0, tilt * 0.5);
    holo.add(ring);
  }
  scene.add(holo);
  const halo = glow(0x6fd8ff, 70, 0.22);
  halo.position.set(0.5, 9, -14);
  scene.add(halo);

  // observation platform (front-left of the model)
  const platform = new THREE.Group();
  platform.position.set(-6.2, -1.2, 17);
  scene.add(platform);
  add(platform, new THREE.CylinderGeometry(3.0, 2.6, 0.5, 48), std(0xf4f7ff, 0.35), [0, -0.25, 0]);
  add(platform, new THREE.CylinderGeometry(3.04, 3.04, 0.12, 48), std(0x1c2752, 0.4), [0, -0.05, 0]).castShadow = false;
  const edge = add(platform, new THREE.TorusGeometry(2.8, 0.06, 8, 64), new THREE.MeshBasicMaterial({ color: 0x7ff3ff }), [0, -0.52, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  const pg = glow(0x7ff3ff, 9, 0.35);
  pg.position.set(0, -1.2, 0);
  platform.add(pg);
  add(platform, new THREE.TorusGeometry(2.85, 0.07, 10, 64, Math.PI * 1.3), std(0xffc928, 0.35, { emissive: 0x6a4a00, emissiveIntensity: 0.3 }), [0, 1.35, 0], [Math.PI / 2, 0, Math.PI * 0.85]);
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI * 0.85 + (i / 6) * Math.PI * 1.3;
    add(platform, new THREE.CylinderGeometry(0.05, 0.05, 1.35, 8), std(0xffc928, 0.35), [Math.cos(a) * 2.85, 0.68, -Math.sin(a) * 2.85]);
  }
  edge.castShadow = false;

  const aff = makeAffan();
  platform.add(aff.root);

  // a few floating light motes near the model
  const motes = [];
  const R = rng(31);
  const mm = new THREE.MeshBasicMaterial({ color: 0xbff8ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.08 + R() * 0.14, 10, 8), mm);
    m.userData = { x: (R() - 0.5) * 50, y: -6 + R() * 36, z: -10 + R() * 30, ph: R() * 10, sp: 0.2 + R() * 0.4 };
    scene.add(m);
    motes.push(m);
  }
  const update = (t) => {
    stars.userData.update(t);
    holo.children.forEach((r, i) => (r.rotation.z = t * (0.05 + i * 0.03) * (i % 2 ? -1 : 1)));
    for (const m of motes) {
      const u = m.userData;
      m.position.set(u.x + Math.sin(t * u.sp + u.ph) * 0.8, u.y + ((t * u.sp * 0.6 + u.ph) % 4) - 2, u.z);
    }
  };

  return { scene, sky, stars, tubes, model, platform, aff, key, update };
}

// --------------------------------------------------- peristalsis close-up
// One section of intestine running top to bottom, cut away so we can see
// inside: muscle rings squeeze in a travelling wave and push gas bubbles
// and liquid along.
export function buildCloseUp() {
  const scene = new THREE.Scene();
  const sky = makeSky({ top: 0x0a1440, mid: 0x15307a, horizon: 0x2a8fc9, bottom: 0x0b1840, radius: 400 });
  const stars = makeStars(500, 380, 17);
  scene.add(sky, stars);
  scene.add(new THREE.HemisphereLight(0xe2f4ff, 0x4a3a80, 1.5));
  const key = new THREE.DirectionalLight(0xfff2e6, 2.2);
  key.position.set(8, 10, 14);
  scene.add(key);
  const back = new THREE.PointLight(0xffd0c0, 60, 30, 2);
  back.position.set(0, 0, -2);
  scene.add(back);

  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const y = 9 - i * 2.25;
    pts.push(V(1.1 * Math.sin(i * 0.8), y, 0));
  }
  const R0 = 2.15;
  const ringTex = canvasTex(512, 256, (g, w, h) => {
    // mostly see-through shell: faint pink tint, bands of circular muscle
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,175,190,0.16)';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) {
      g.fillStyle = 'rgba(255,120,145,0.55)';
      g.fillRect((i * w) / 12, 0, w / 40, h);
    }
    g.strokeStyle = 'rgba(255,255,255,0.22)';
    g.lineWidth = 3;
    for (let j = 0; j < 12; j++) {
      g.beginPath();
      g.moveTo(0, (j * h) / 12);
      g.lineTo(w, (j * h) / 12);
      g.stroke();
    }
  }, [1, 1]);
  const innerTex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#ff9aaa';
    g.fillRect(0, 0, w, h);
    const R = rng(9);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(255,${190 + R() * 40},${200 + R() * 30},0.5)`;
      g.beginPath();
      g.ellipse(R() * w, R() * h, 6 + R() * 10, 18 + R() * 20, 0, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 16; i++) {
      g.fillStyle = 'rgba(230,90,120,0.35)';
      g.fillRect((i * w) / 16, 0, w / 40, h);
    }
  }, [1, 1]);
  // inner wall (far half, opaque) + outer shell (front, see-through)
  const innerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: innerTex, roughness: 0.45, side: THREE.BackSide, vertexColors: true, emissive: 0x3a0a14, emissiveIntensity: 0.3 });
  const inner = new Tube(pts, { radius: () => R0 * 0.97, segs: 260, radial: 48, material: innerMat, uRepeat: 4 });
  const outerMat = organMat(0xffffff, { map: ringTex, rimK: 0.25, opacity: 0.99 });
  const outer = new Tube(pts, { radius: () => R0, segs: 260, radial: 48, material: outerMat, uRepeat: 4 });
  outer.mesh.renderOrder = 5;
  outer.mesh.castShadow = inner.mesh.castShadow = false;
  scene.add(inner.mesh, outer.mesh);

  // contents: gas bubbles (white, shiny) and liquid blobs (cyan)
  const gasMat = new THREE.MeshPhysicalMaterial({ color: 0xf4fdff, roughness: 0.08, clearcoat: 1, emissive: 0x6a8aa0, emissiveIntensity: 0.25, transparent: true, opacity: 0.92 });
  const fluidMat = new THREE.MeshPhysicalMaterial({ color: 0x3fd6ff, roughness: 0.12, clearcoat: 1, emissive: 0x0a5a7a, emissiveIntensity: 0.4, transparent: true, opacity: 0.85 });
  const R = rng(77);
  const parts = [];
  for (let i = 0; i < 34; i++) {
    const gas = i % 3 === 0;
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), gas ? gasMat : fluidMat);
    m.renderOrder = 2;
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    shine.position.set(-0.35, 0.4, 0.75);
    m.add(shine);
    scene.add(m);
    parts.push({ m, gas, s0: R(), a: R() * Math.PI * 2, rho: 0.15 + R() * 0.5, size: gas ? 0.42 + R() * 0.3 : 0.24 + R() * 0.18, ph: R() * 10 });
  }
  return { scene, sky, stars, inner, outer, parts, update: (t) => stars.userData.update(t) };
}

// ------------------------------------------------------------------ outro
export function buildOutro() {
  const scene = new THREE.Scene();
  const c = document.createElement('canvas');
  c.width = 540;
  c.height = 960;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(270, 380, 40, 270, 420, 700);
  gr.addColorStop(0, '#8fe6ff');
  gr.addColorStop(0.45, '#2ec4e8');
  gr.addColorStop(1, '#1c2752');
  g.fillStyle = gr;
  g.fillRect(0, 0, 540, 960);
  const bg = new THREE.CanvasTexture(c);
  bg.colorSpace = THREE.SRGBColorSpace;
  scene.background = bg;
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
