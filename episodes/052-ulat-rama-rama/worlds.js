// Episode 052 sets:
//  - the Episode 044 park on a sunny day, with a hibiscus (bunga raya) bush
//    and a nibbled leaf next to Affan, plus a butterfly flitting about;
//  - the macro garden: a huge leaf (its texture can be eaten away bite by
//    bite), tiny eggs, a striped caterpillar that grows and leaves old skins
//    behind, a twig where it hangs and becomes a jade chrysalis, a butterfly
//    that comes out with crumpled wings, a giant hibiscus flower with a
//    butterfly uncoiling its proboscis, and a Rajah Brooke birdwing in a
//    jungle clearing;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { add, glow, glowTex } from '../../shared/props.js';
import { buildPark, A_PK, PLAY_SCALE } from '../044-salji-malaysia/worlds.js';
import { buildOutro } from '../005-bulan-ikut-kereta/worlds.js';

export { buildOutro, A_PK, PLAY_SCALE };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

function gradientSky(top, bot) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, bot: { value: new THREE.Color(bot) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, bot; varying vec3 vP;
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.4, 0.7, vP.y)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData = { canvas: c };
  return t;
}

// ---------------------------------------------------------------- hibiscus
export function makeHibiscus(s = 1) {
  const g = new THREE.Group();
  const petal = std(0xe8203a, 0.5, { side: THREE.DoubleSide, emissive: 0x5a0010, emissiveIntensity: 0.2 });
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.35, 0.2, 0.5, 0.7, 0.25, 1.0);
  shape.bezierCurveTo(0.1, 1.12, -0.1, 1.12, -0.25, 1.0);
  shape.bezierCurveTo(-0.5, 0.7, -0.35, 0.2, 0, 0);
  const geo = new THREE.ShapeGeometry(shape, 12);
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Group();
    p.rotation.set(0, 0, (i / 5) * Math.PI * 2);
    g.add(p);
    add(p, geo, petal, [0, 0, 0], [0.5, 0, 0], [1, 1, 1], false);
  }
  add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), std(0xffd84a, 0.5), [0, 0, 0.42], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  for (let i = 0; i < 6; i++) add(g, new THREE.SphereGeometry(0.05, 8, 6), std(0xffe04a, 0.4, { emissive: 0x5a4a00, emissiveIntensity: 0.3 }), [Math.cos(i) * 0.06, Math.sin(i) * 0.06, 0.82], [0, 0, 0], [1, 1, 1], false);
  add(g, new THREE.SphereGeometry(0.12, 10, 8), std(0x9a1020, 0.6), [0, 0, 0.02], [0, 0, 0], [1, 1, 0.4], false);
  g.scale.setScalar(s);
  return g;
}

// ---------------------------------------------------------------- caterpillar
// along +x (head at +x), ~2 units long, sitting on y = 0
export function makeCaterpillar() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const green = std(0x8ad84a, 0.5), green2 = std(0x6ac83a, 0.5);
  const black = std(0x1a1a22, 0.5), yellow = std(0xffd23a, 0.5);
  const segs = [];
  const N = 9;
  for (let i = 0; i < N; i++) {
    const s = new THREE.Group();
    body.add(s);
    const r = 0.17 + 0.03 * Math.sin((i / (N - 1)) * Math.PI);
    add(s, new THREE.SphereGeometry(r, 16, 12), i % 2 ? green : green2, [0, r, 0], [0, 0, 0], [0.9, 1, 1], false);
    add(s, new THREE.TorusGeometry(r * 0.97, 0.025, 6, 20), i % 2 ? black : yellow, [0, r, 0], [0, Math.PI / 2, 0], [1, 1, 1], false);
    for (const z of [-1, 1]) add(s, new THREE.CylinderGeometry(0.03, 0.025, 0.08, 6), green2, [0, 0.03, z * r * 0.6], [0, 0, 0], [1, 1, 1], false);
    s.userData = { i, r };
    segs.push(s);
  }
  const head = new THREE.Group();
  body.add(head);
  add(head, new THREE.SphereGeometry(0.2, 18, 14), std(0x5ab83a, 0.5), [0, 0.2, 0], [0, 0, 0], [1, 1, 1], false);
  for (const z of [-1, 1]) {
    add(head, new THREE.SphereGeometry(0.06, 12, 10), std(0xffffff, 0.3), [0.14, 0.27, z * 0.08], [0, 0, 0], [1, 1, 1], false);
    add(head, new THREE.SphereGeometry(0.035, 10, 8), black, [0.18, 0.27, z * 0.08], [0, 0, 0], [1, 1, 1], false);
    add(head, new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6), black, [0.04, 0.44, z * 0.08], [z * 0.3, 0, -0.3], [1, 1, 1], false);
    add(head, new THREE.SphereGeometry(0.025, 8, 6), yellow, [0.07, 0.52, z * 0.11], [0, 0, 0], [1, 1, 1], false);
  }
  const mouth = add(head, new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), black, [0.19, 0.14, 0], [0, Math.PI / 2, Math.PI], [1, 1, 1], false);
  // crawl / chew animation
  const set = (t, { crawl = 0, chew = 0, squash = 0 } = {}) => {
    segs.forEach((s) => {
      const i = s.userData.i;
      s.position.set(-0.95 + i * 0.22 - 0.03 * crawl * Math.sin(t * 6 - i * 0.7), 0.05 * crawl * Math.max(0, Math.sin(t * 6 - i * 0.7)), 0);
      s.scale.set(1 + 0.12 * squash, 1 - 0.1 * squash, 1 + 0.12 * squash);
    });
    head.position.set(1.05 + 0.04 * chew * Math.sin(t * 14), 0.02 * chew * Math.sin(t * 14), 0);
    mouth.scale.setScalar(1 + 0.5 * chew * Math.max(0, Math.sin(t * 14)));
  };
  set(0);
  return { root, body, segs, head, set };
}
// an empty shed skin: a pale, wrinkled copy
function makeSkin() {
  const g = new THREE.Group();
  const m = std(0xd8e0a8, 0.8, { transparent: true, opacity: 0.6 });
  for (let i = 0; i < 5; i++) add(g, new THREE.SphereGeometry(0.14, 10, 8), m, [-0.3 + i * 0.15, 0.09, 0], [0, 0, 0], [1, 0.55, 1], false);
  return g;
}

// ---------------------------------------------------------------- butterfly
// body along +x; wings flap about x. kind: 'tiger' (orange) or 'rajah' (black + green)
function wingTex(kind) {
  return canvasTex(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    if (kind === 'rajah') {
      g.fillStyle = '#121418';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#2fe86a';
      for (let i = 0; i < 7; i++) {
        g.beginPath();
        const x = 60 + i * 60, y = 120 + Math.abs(i - 3) * 18;
        g.moveTo(x, y);
        g.lineTo(x + 50, y - 60);
        g.lineTo(x + 70, y + 30);
        g.closePath();
        g.fill();
      }
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.ellipse(100 + i * 60, 380, 22, 34, 0.3, 0, Math.PI * 2);
        g.fill();
      }
    } else {
      g.fillStyle = '#ff9a2a';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#1a1210';
      g.lineWidth = 14;
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.moveTo(0, h / 2);
        g.lineTo(w, i * (h / 5));
        g.stroke();
      }
      g.lineWidth = 46;
      g.strokeRect(0, 0, w, h);
      g.fillStyle = '#ffffff';
      for (let i = 0; i < 12; i++) {
        g.beginPath();
        g.arc(30 + (i % 6) * 90, i < 6 ? 22 : h - 22, 12, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
}
export function makeButterfly(kind = 'tiger', s = 1) {
  const root = new THREE.Group();
  const tex = wingTex(kind);
  const wm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 });
  const fore = new THREE.Shape();
  fore.moveTo(0, 0);
  fore.bezierCurveTo(0.2, 0.3, 0.6, 0.9, 0.35, 1.25);
  fore.bezierCurveTo(0.1, 1.35, -0.3, 1.1, -0.15, 0.05);
  const hind = new THREE.Shape();
  hind.moveTo(0, 0);
  hind.bezierCurveTo(-0.1, 0.4, -0.7, 0.9, -0.6, 0.55);
  hind.bezierCurveTo(-0.65, 0.25, -0.4, 0.02, 0, 0);
  const uvFix = (geo) => {
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + 0.7) / 1.4, p.getY(i) / 1.4);
    return geo;
  };
  const fg = uvFix(new THREE.ShapeGeometry(fore, 16)), hg = uvFix(new THREE.ShapeGeometry(hind, 16));
  const wings = [];
  for (const side of [1, -1]) {
    const pv = new THREE.Group();
    root.add(pv);
    const inner = new THREE.Group();
    inner.rotation.set(-Math.PI / 2 * side, 0, 0);
    pv.add(inner);
    add(inner, fg, wm, [0.08, 0, 0], [0, 0, 0], [1, side, 1], false);
    add(inner, hg, wm, [-0.05, 0, 0], [0, 0, 0], [1, side, 1], false);
    pv.userData.side = side;
    wings.push(pv);
  }
  const bodyM = std(kind === 'rajah' ? 0x1a1a20 : 0x2a1a10, 0.5);
  add(root, new THREE.CapsuleGeometry(0.06, 0.6, 6, 10), bodyM, [-0.05, 0, 0], [0, 0, Math.PI / 2], [1, 1, 1], false);
  add(root, new THREE.SphereGeometry(0.08, 12, 10), kind === 'rajah' ? std(0xe8304a, 0.5) : bodyM, [0.33, 0.01, 0], [0, 0, 0], [1, 1, 1], false);
  for (const z of [-1, 1]) {
    add(root, new THREE.CylinderGeometry(0.008, 0.008, 0.5, 5), bodyM, [0.5, 0.12, z * 0.08], [z * 0.3, 0, -1.0], [1, 1, 1], false);
    add(root, new THREE.SphereGeometry(0.025, 8, 6), bodyM, [0.69, 0.27, z * 0.15], [0, 0, 0], [1, 1, 1], false);
  }
  root.scale.setScalar(s);
  const set = (t, { flap = 1, open = 1, crumple = 0 } = {}) => {
    const a = flap * (0.25 + 0.9 * (0.5 + 0.5 * Math.sin(t * 18)));
    wings.forEach((w) => {
      w.rotation.x = w.userData.side * (lerpF(1.35, a, open));
      w.scale.set(1 - 0.55 * crumple, 1 - 0.55 * crumple, 1);
    });
  };
  set(0);
  return { root, wings, set, wm };
}
const lerpF = (a, b, k) => a + (b - a) * k;

// a proboscis that can uncoil: rebuilds its tube for k = 0 (coiled) .. 1 (straight)
function makeProboscis(parent, mat) {
  const m = new THREE.Mesh(new THREE.BufferGeometry(), mat);
  parent.add(m);
  let last = -1;
  const set = (k) => {
    if (Math.abs(k - last) < 0.01) return;
    last = k;
    const pts = [];
    for (let i = 0; i <= 30; i++) {
      const s = i / 30;
      const a = s * Math.PI * 4;
      const r = 0.12 * (1 - s * 0.8);
      const coil = V3(0.38 + r * Math.sin(a) + 0.02, -0.02 - r * (1 - Math.cos(a)), 0);
      const straight = V3(0.38 + s * 0.75, -0.02 - s * 0.35, 0);
      pts.push(coil.lerp(straight, k));
    }
    m.geometry.dispose();
    m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.012, 5);
  };
  set(0);
  return set;
}

// ------------------------------------------------------------------ park
export function buildPark52() {
  const w = buildPark();
  w.setSnow(0, 0);
  const s = w.scene;
  const bush = new THREE.Group();
  bush.position.set(A_PK.x - 1.4, 0, A_PK.z - 0.4);
  s.add(bush);
  const R = rng(52);
  const leafM = [std(0x2f8a3a, 0.7), std(0x3a9a42, 0.7)];
  for (let i = 0; i < 10; i++) add(bush, new THREE.SphereGeometry(0.45 + R() * 0.2, 12, 10), leafM[i % 2], [(R() - 0.5) * 1.1, 0.5 + R() * 0.8, (R() - 0.5) * 0.8], [0, 0, 0], [1, 0.85, 1]);
  for (let i = 0; i < 7; i++) {
    const f = makeHibiscus(0.28);
    const a = R() * Math.PI * 2;
    f.position.set(Math.cos(a) * 0.6, 0.6 + R() * 0.8, Math.sin(a) * 0.5 + 0.2);
    f.lookAt(f.position.clone().multiplyScalar(3).add(V3(0, 0, 2)));
    bush.add(f);
  }
  // the nibbled leaf in front
  const leafTex = canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#4aa83a';
    g.beginPath();
    g.ellipse(W / 2, H / 2, W * 0.32, H * 0.48, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#2f7a2a';
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(W / 2, 10);
    g.lineTo(W / 2, H - 10);
    g.stroke();
    g.globalCompositeOperation = 'destination-out';
    for (const [x, y, r] of [[60, 80, 26], [190, 140, 30], [80, 170, 22], [170, 60, 18]]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  });
  const nib = add(s, new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 }), [A_PK.x - 0.55, 1.3, A_PK.z + 0.95], [-0.5, 0.4, 0.1], [1, 1, 1], false);
  const ghost = makeCaterpillar();
  ghost.root.scale.setScalar(0.12);
  ghost.root.position.copy(nib.position).add(V3(-0.05, 0.03, 0.05));
  ghost.root.rotation.set(-0.5, 0.4, 0.1);
  ghost.root.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; } });
  s.add(ghost.root);
  const fly = makeButterfly('tiger', 0.22);
  s.add(fly.root);
  const caterpillar = makeCaterpillar();
  caterpillar.root.scale.setScalar(0.1);
  caterpillar.root.position.set(A_PK.x - 0.6, 1.33, A_PK.z + 0.98);
  caterpillar.root.rotation.set(-0.5, 0.4, 0.1);
  caterpillar.root.visible = false;
  s.add(caterpillar.root);
  return { ...w, bush, nib, ghost, fly, caterpillar };
}

// ---------------------------------------------------------------- macro garden
export const STAGE = { leaf: V3(0, 0, 0), twig: V3(14, 0, 0), flower: V3(28, 0, 0), rajah: V3(42, 0, 0) };
export function buildMacro() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0xbfe8a8, 0x4a8a3a);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a5a2a, 1.4));
  const key = new THREE.DirectionalLight(0xfff4e0, 1.6);
  key.position.set(4, 10, 8);
  scene.add(key);
  const under = new THREE.DirectionalLight(0xeaffd8, 0.9);
  under.position.set(1, -8, 5);
  scene.add(under);
  const R = rng(5200);
  // soft bokeh
  const bokMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xeaffc8, transparent: true, opacity: 0.35, depthWrite: false });
  for (let i = 0; i < 60; i++) {
    const b = new THREE.Sprite(bokMat);
    b.position.set(-8 + R() * 60, -3 + R() * 9, -9 - R() * 6);
    b.scale.setScalar(1 + R() * 2.5);
    scene.add(b);
  }
  // the big leaf: its texture can be eaten away
  const leafC = document.createElement('canvas');
  leafC.width = leafC.height = 512;
  const leafTex = new THREE.CanvasTexture(leafC);
  leafTex.colorSpace = THREE.SRGBColorSpace;
  let eatenLast = -1;
  const bites = Array.from({ length: 40 }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    const y = 80 + (i / 40) * 360;
    return [256 + side * (150 - Math.abs(y - 256) * 0.35), y, 26 + R() * 18];
  });
  const drawLeaf = (eaten) => {
    if (Math.abs(eaten - eatenLast) < 0.01) return;
    eatenLast = eaten;
    const g = leafC.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, 512, 512);
    const gr = g.createLinearGradient(0, 0, 512, 512);
    gr.addColorStop(0, '#6ac84a');
    gr.addColorStop(1, '#3a9a3a');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(256, 12);
    g.bezierCurveTo(470, 140, 470, 380, 256, 500);
    g.bezierCurveTo(42, 380, 42, 140, 256, 12);
    g.fill();
    g.strokeStyle = '#2f7a2a';
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(256, 20);
    g.lineTo(256, 495);
    g.stroke();
    g.lineWidth = 4;
    for (let i = 0; i < 7; i++) {
      const y = 90 + i * 55;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(256, y);
        g.quadraticCurveTo(256 + s * 80, y - 10, 256 + s * 160, y - 50);
        g.stroke();
      }
    }
    g.globalCompositeOperation = 'destination-out';
    const n = Math.floor(eaten * bites.length);
    for (let i = 0; i < n; i++) {
      const [x, y, r] = bites[i];
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    leafTex.needsUpdate = true;
  };
  drawLeaf(0);
  const leaf = add(scene, new THREE.PlaneGeometry(9, 9), new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 }), [STAGE.leaf.x, 0, -1], [-Math.PI / 2 + 0.35, 0, -Math.PI / 2], [1, 1, 1], false);
  // eggs (on the underside, near the front)
  const eggM = std(0xfff6c8, 0.4, { emissive: 0x5a5a3a, emissiveIntensity: 0.2 });
  const eggs = Array.from({ length: 6 }, (_, i) => {
    const e = add(scene, new THREE.SphereGeometry(0.1, 14, 10), eggM, [STAGE.leaf.x - 1 + i * 0.35, -0.15 + Math.sin(i) * 0.05, 1.2 + (i % 2) * 0.25], [0, 0, 0], [1, 1.25, 1], false);
    e.visible = false;
    return e;
  });
  const cat = makeCaterpillar();
  scene.add(cat.root);
  const skins = Array.from({ length: 4 }, () => {
    const s = makeSkin();
    s.visible = false;
    scene.add(s);
    return s;
  });
  // twig + chrysalis
  const bark = std(0x7a5a3a, 0.9);
  add(scene, new THREE.CylinderGeometry(0.12, 0.16, 10, 10), bark, [STAGE.twig.x, 3.2, 0], [0, 0, Math.PI / 2 - 0.08]);
  for (let i = 0; i < 4; i++) add(scene, new THREE.PlaneGeometry(1.4, 0.7), std(0x3a9a3a, 0.7, { side: THREE.DoubleSide }), [STAGE.twig.x - 3 + i * 2, 3.5, -0.3], [0.4, 0, 0.3 * (i % 2 ? 1 : -1)], [1, 1, 1], false);
  const hang = makeCaterpillar();
  scene.add(hang.root);
  const prof = [];
  for (let i = 0; i <= 20; i++) {
    const u = i / 20;
    prof.push(new THREE.Vector2(Math.max(0.01, 0.42 * Math.sin(Math.PI * u) ** 0.7 * (1 - 0.3 * u)), -u * 1.9));
  }
  const chrysMat = std(0x5ad87a, 0.3, { transparent: true, opacity: 1, emissive: 0x1a5a2a, emissiveIntensity: 0.3 });
  const chrys = new THREE.Group();
  chrys.position.set(STAGE.twig.x, 3.05, 0);
  scene.add(chrys);
  add(chrys, new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6), std(0x3a2a1a, 0.8), [0, 0.05, 0], [0, 0, 0], [1, 1, 1], false);
  const shellL = add(chrys, new THREE.LatheGeometry(prof, 24, 0, Math.PI), chrysMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const shellR = add(chrys, new THREE.LatheGeometry(prof, 24, Math.PI, Math.PI), chrysMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  for (let i = 0; i < 7; i++) add(chrys, new THREE.SphereGeometry(0.035, 8, 6), std(0xffd84a, 0.2, { metalness: 0.7 }), [Math.cos(i) * 0.36, -0.5 - (i % 3) * 0.08, Math.sin(i) * 0.36 + 0.05], [0, 0, 0], [1, 1, 1], false);
  // transformation swirl inside
  const swirlMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffe08a, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  const swirl = Array.from({ length: 24 }, () => {
    const p = new THREE.Sprite(swirlMat);
    p.visible = false;
    chrys.add(p);
    return p;
  });
  const fresh = makeButterfly('tiger', 1.0);
  scene.add(fresh.root);
  // flower stage
  const flower = makeHibiscus(2.6);
  flower.position.set(STAGE.flower.x, 0.6, -0.6);
  flower.rotation.set(-0.9, 0, 0);
  scene.add(flower);
  add(scene, new THREE.CylinderGeometry(0.08, 0.1, 5, 8), std(0x3a8a3a, 0.7), [STAGE.flower.x, -2.1, -1.4], [-0.35, 0, 0]);
  const sipper = makeButterfly('tiger', 1.0);
  scene.add(sipper.root);
  const probe = makeProboscis(sipper.root, std(0x2a1a10, 0.5));
  // jungle clearing for Rajah Brooke
  const jungle = new THREE.Group();
  jungle.position.copy(STAGE.rajah);
  scene.add(jungle);
  for (let i = 0; i < 14; i++) {
    const tr = new THREE.Group();
    tr.position.set((R() - 0.5) * 14, -3, -4 - R() * 6);
    jungle.add(tr);
    add(tr, new THREE.CylinderGeometry(0.25, 0.35, 10, 8), bark, [0, 5, 0]);
    for (let k = 0; k < 4; k++) add(tr, new THREE.SphereGeometry(1.4 + R(), 10, 8), std([0x2f7a3a, 0x3a8a42, 0x256a32][k % 3], 0.8), [(R() - 0.5) * 2, 9 + R() * 2, (R() - 0.5) * 2]);
  }
  for (let i = 0; i < 6; i++) {
    const f = makeHibiscus(0.6);
    f.position.set((R() - 0.5) * 6, -1.8 + R() * 1.5, -1 - R() * 2);
    jungle.add(f);
  }
  const rajah = makeButterfly('rajah', 1.2);
  scene.add(rajah.root);
  return { scene, sky, drawLeaf, leaf, eggs, cat, skins, hang, chrys, shellL, shellR, chrysMat, swirl, fresh, flower, sipper, probe, rajah };
}
