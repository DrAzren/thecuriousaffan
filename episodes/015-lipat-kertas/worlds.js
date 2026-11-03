// Episode 015 sets: Affan's sunny bedroom desk (where the paper is folded), a
// grass field with a very, very long paper strip (the world-record fold), a
// little Earth with a paper tower reaching the Moon, and the branded outro.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeSky, makeStars, makeMoon, makeTree, makeBush, glow } from '../../shared/props.js';

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

function shadowCfg(light, size, map = 2048, far = 60) {
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

// ---------------------------------------------------------------- paper
// One sheet is A0 x B0 (an A4 page, ~1 unit = 175 mm). Real paper is ~0.1 mm
// thick; the stack thickness is exaggerated 2.5x so the layers read on screen
// while keeping the real proportions of a 7-times-folded page (a chunky block).
export const PAPER = { A0: 1.7, B0: 1.2, th0: 0.0014 };

// State after n folds: odd folds halve the x size (a), even folds halve z (b).
export function paperState(n) {
  let a = PAPER.A0, b = PAPER.B0;
  for (let i = 1; i <= n; i++) {
    if (i % 2) a /= 2;
    else b /= 2;
  }
  return { a, b, L: 2 ** n, h: PAPER.th0 * 2 ** n, axis: n % 2 === 0 ? 'x' : 'z' }; // axis of the NEXT fold
}

const linedTex = () =>
  canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#fffdf6';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(110,160,230,0.55)';
    g.lineWidth = 3;
    for (let y = 16; y < h; y += 32) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
  }, true);

const stripeTex = () =>
  canvasTex(4, 16, (g, w, h) => {
    g.fillStyle = '#fffaf0';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#c9c2b4';
    g.fillRect(0, h - 3, w, 3);
  }, true);

// A paper stack that can show any fold state, including a fold in progress.
export function makePaper() {
  const group = new THREE.Group();
  const top = linedTex();
  const side = stripeTex();
  side.magFilter = THREE.NearestFilter;
  const topM = std(0xffffff, 0.85, { map: top, emissive: 0xfff6e8, emissiveIntensity: 0.08 });
  const botM = std(0xfbf7ee, 0.9);
  const sideM = std(0xffffff, 0.9, { map: side });
  const mats = [sideM, sideM, topM, botM, sideM, sideM];
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const base = new THREE.Mesh(geo, mats);
  const pivot = new THREE.Group();
  const flap = new THREE.Mesh(geo, mats);
  for (const m of [base, flap]) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  pivot.add(flap);
  group.add(base, pivot);
  const _v = new THREE.Vector3();

  // n folds finished; k (0..1) progress of fold n+1 (k may be small and
  // negative-free for the "can't fold" wobble). Returns the far edge of the flap.
  function set(n, k = 0) {
    const s = paperState(n);
    const L = s.L;
    side.repeat.set(1, Math.min(L, 24)); // real count is too fine to read; keep layers visible
    const dens = 3.2;
    top.repeat.set((s.a / PAPER.A0) * dens, (s.b / PAPER.B0) * dens * 0.7);
    const h = Math.max(s.h, 0.0025);
    if (k <= 0) {
      base.scale.set(s.a, h, s.b);
      base.position.set(0, h / 2, 0);
      pivot.visible = false;
      group.position.x = group.position.z = 0;
      return null;
    }
    pivot.visible = true;
    pivot.rotation.set(0, 0, 0);
    const slide = THREE.MathUtils.smootherstep(k, 0, 1);
    if (s.axis === 'x') {
      base.scale.set(s.a / 2, h, s.b);
      base.position.set(-s.a / 4, h / 2, 0);
      pivot.position.set(0, h, 0);
      flap.scale.copy(base.scale);
      flap.position.set(s.a / 4, -h / 2, 0);
      pivot.rotation.z = k * Math.PI;
      group.position.set((s.a / 4) * slide, 0, 0);
      return pivot.localToWorld(_v.set(s.a / 2, 0, 0)).clone();
    }
    base.scale.set(s.a, h, s.b / 2);
    base.position.set(0, h / 2, -s.b / 4);
    pivot.position.set(0, h, 0);
    flap.scale.copy(base.scale);
    flap.position.set(0, -h / 2, s.b / 4);
    pivot.rotation.x = -k * Math.PI;
    group.position.set(0, 0, (s.b / 4) * slide);
    return pivot.localToWorld(_v.set(0, 0, s.b / 2)).clone();
  }
  set(0);
  return { group, set, pivot };
}

// ----------------------------------------------------------------- room
const woodTex = () =>
  canvasTex(512, 512, (g, w, h) => {
    const R = rng(4);
    for (let i = 0; i < 8; i++) {
      const c = ['#d79a5e', '#cf9054', '#dca266', '#c98b50'][i % 4];
      g.fillStyle = c;
      g.fillRect(0, (i * h) / 8, w, h / 8);
      g.fillStyle = 'rgba(120,70,30,0.35)';
      g.fillRect(0, (i * h) / 8, w, 3);
      const off = R() * w;
      g.fillRect(off, (i * h) / 8, 3, h / 8);
      g.strokeStyle = 'rgba(150,90,40,0.18)';
      g.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        const y = (i * h) / 8 + 8 + R() * (h / 8 - 16);
        g.beginPath();
        g.moveTo(0, y);
        g.bezierCurveTo(w * 0.3, y + R() * 6 - 3, w * 0.6, y + R() * 6 - 3, w, y);
        g.stroke();
      }
    }
  }, true);

const wallTex = () =>
  canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#bfe3ff';
    g.fillRect(0, 0, w, h);
    // soft polka stars
    const R = rng(9);
    for (let i = 0; i < 26; i++) {
      const x = R() * w, y = R() * h, r = 6 + R() * 8;
      g.fillStyle = i % 2 ? 'rgba(255,255,255,0.55)' : 'rgba(255,236,150,0.55)';
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const rr = k % 2 ? r * 0.45 : r;
        const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
        g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.fill();
    }
  }, true);

function makeBook(w, h, d, color, spine = 0xffffff) {
  const g = new THREE.Group();
  add(g, new RoundedBoxGeometry(w, h, d, 2, Math.min(h, 0.02) * 0.45), std(color, 0.6), [0, h / 2, 0]);
  add(g, new THREE.BoxGeometry(w * 0.96, h * 0.8, d * 0.98), std(0xfdf8ec, 0.9), [0.01 * w, h / 2, 0], [0, 0, 0], [1, 1, 1], false);
  add(g, new THREE.BoxGeometry(w * 0.06, h * 1.02, d * 0.7), std(spine, 0.5), [-w / 2 + w * 0.06, h / 2, 0], [0, 0, 0], [1, 1, 1], false);
  return g;
}

export const DESK_Y = 1.3;
export const AFF_Z = -1.15;
export const PAPER_POS = new THREE.Vector3(0, DESK_Y, 0.05);

export function buildRoom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfe3ff);
  scene.add(new THREE.HemisphereLight(0xfff6ea, 0xb98a62, 1.35));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
  sun.position.set(-5, 9, 6);
  shadowCfg(sun, 4.5, 2048, 30);
  scene.add(sun, sun.target);
  const fill = new THREE.PointLight(0xffd9b8, 6, 12, 2);
  fill.position.set(2.5, 3.5, 3.5);
  scene.add(fill);

  // floor + walls
  const fl = woodTex();
  fl.repeat.set(4, 4);
  add(scene, new THREE.PlaneGeometry(14, 14), std(0xffffff, 0.8, { map: fl }), [0, 0, 0], [-Math.PI / 2, 0, Math.PI / 2], [1, 1, 1]).castShadow = false;
  const wt = wallTex();
  wt.repeat.set(3, 1.5);
  const wallM = std(0xffffff, 0.95, { map: wt });
  add(scene, new THREE.PlaneGeometry(14, 8), wallM, [0, 4, -3.4]).castShadow = false;
  add(scene, new THREE.PlaneGeometry(14, 8), wallM, [-5, 4, 0], [0, Math.PI / 2, 0]).castShadow = false;
  add(scene, new THREE.PlaneGeometry(14, 8), wallM, [5, 4, 0], [0, -Math.PI / 2, 0]).castShadow = false;
  add(scene, new THREE.BoxGeometry(14, 0.3, 0.06), std(0xffffff, 0.6), [0, 0.15, -3.37]);

  // window with a sunny sky, frame and curtains (back wall, left)
  const skyT = canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#5fb6ff');
    gr.addColorStop(1, '#d4f0ff');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.95)';
    for (const [x, y, s] of [[60, 70, 1], [180, 120, 0.8], [120, 190, 0.6]]) {
      for (const [dx, dy, r] of [[0, 0, 22], [22, -8, 26], [46, 2, 20], [24, 10, 22]]) {
        g.beginPath();
        g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
  add(scene, new THREE.PlaneGeometry(2.2, 1.8), new THREE.MeshBasicMaterial({ map: skyT }), [-2.6, 3.4, -3.38], [0, 0, 0], [1, 1, 1], false);
  const frameM = std(0xffffff, 0.5);
  for (const [x, y, w, h] of [[-2.6, 4.33, 2.36, 0.14], [-2.6, 2.47, 2.36, 0.14], [-3.73, 3.4, 0.14, 1.94], [-1.47, 3.4, 0.14, 1.94], [-2.6, 3.4, 0.07, 1.8], [-2.6, 3.4, 2.2, 0.07]]) add(scene, new THREE.BoxGeometry(w, h, 0.1), frameM, [x, y, -3.33]);
  add(scene, new THREE.BoxGeometry(2.6, 0.08, 0.3), frameM, [-2.6, 2.4, -3.22]);
  const curtain = std(0xffb37a, 0.9, { side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const c = add(scene, new THREE.CylinderGeometry(0.28, 0.36, 2.4, 16, 1, true, 0, Math.PI), curtain, [-2.6 + s * 1.45, 3.35, -3.25], [0, Math.PI, 0], [1, 1, 0.35]);
    c.castShadow = false;
  }
  // sunbeam
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 6), new THREE.MeshBasicMaterial({ color: 0xfff2c4, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.set(-1.6, 2.4, -1.6);
  beam.rotation.set(-0.7, 0.5, 0.3);
  scene.add(beam);

  // bookshelf (back wall, right) with colourful books, plant and a globe
  const shelfM = std(0xf7f1e6, 0.7);
  for (const y of [2.6, 3.6]) add(scene, new THREE.BoxGeometry(2.4, 0.08, 0.45), shelfM, [2.6, y, -3.15]);
  const R = rng(15);
  const bookCols = [0xff6b6b, 0x4f8cff, 0xffc23b, 0x5fd07a, 0xb36bff, 0xff9a3c];
  for (const y of [2.64, 3.64]) {
    let x = 1.55;
    while (x < 3.3) {
      const w = 0.1 + R() * 0.08, h = 0.45 + R() * 0.25;
      add(scene, new RoundedBoxGeometry(w, h, 0.34, 2, 0.02), std(bookCols[Math.floor(R() * 6)], 0.6), [x + w / 2, y + h / 2, -3.12], [0, 0, x > 3.0 ? -0.2 : 0]);
      x += w + 0.015;
    }
  }
  const pot = add(scene, new THREE.CylinderGeometry(0.2, 0.15, 0.3, 18), std(0xff8a5b, 0.6), [3.6, 3.79, -3.1]);
  for (let i = 0; i < 5; i++) add(scene, new THREE.SphereGeometry(0.16, 12, 10), std(0x4fc46a, 0.8), [3.6 + Math.cos(i * 1.3) * 0.12, 4.05 + (i % 2) * 0.12, -3.1 + Math.sin(i * 1.3) * 0.1], [0, 0, 0], [1, 1.5, 1]);
  void pot;

  // desk
  const deskM = std(0xf3c987, 0.55);
  add(scene, new RoundedBoxGeometry(3.6, 0.12, 1.7, 3, 0.04), deskM, [0, DESK_Y - 0.06, 0.25]);
  for (const [x, z] of [[-1.65, -0.45], [1.65, -0.45], [-1.65, 0.95], [1.65, 0.95]]) add(scene, new THREE.CylinderGeometry(0.06, 0.05, DESK_Y - 0.12, 12), std(0xe2ab63, 0.6), [x, (DESK_Y - 0.12) / 2, z]);
  // desk props: pencil cup, a stack of books, a small notebook for "tebal macam buku"
  const cup = new THREE.Group();
  add(cup, new THREE.CylinderGeometry(0.13, 0.12, 0.3, 20), std(0x4f8cff, 0.5), [0, 0.15, 0]);
  for (const [dx, dz, c, rz] of [[-0.04, 0.02, 0xffc23b, 0.12], [0.04, -0.02, 0xff6b6b, -0.1], [0.0, 0.05, 0x5fd07a, 0.05]]) {
    add(cup, new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6), std(c, 0.5), [dx, 0.4, dz], [rz, 0, rz]);
  }
  cup.position.set(-1.35, DESK_Y, -0.2);
  scene.add(cup);
  const books = new THREE.Group();
  books.add(makeBook(0.7, 0.09, 0.5, 0xff6b6b));
  const b2 = makeBook(0.62, 0.08, 0.46, 0x5fd07a);
  b2.position.y = 0.09;
  b2.rotation.y = 0.12;
  books.add(b2);
  books.position.set(1.3, DESK_Y, -0.15);
  books.rotation.y = -0.2;
  scene.add(books);
  // the comparison notebook: about as thick as the 7-fold block
  const note = makeBook(0.46, 0.17, 0.34, 0xffc23b, 0xff8a3d);
  note.position.set(0.45, DESK_Y, -0.05);
  note.rotation.y = -0.25;
  note.visible = false;
  scene.add(note);

  const paper = makePaper();
  paper.group.position.copy(PAPER_POS);
  const paperRoot = new THREE.Group();
  paperRoot.position.copy(PAPER_POS);
  paperRoot.add(paper.group);
  paper.group.position.set(0, 0, 0);
  scene.add(paperRoot);

  const aff = makeAffan();
  aff.root.position.set(0, 0, AFF_Z);
  scene.add(aff.root);
  // a chair behind Affan
  const chairM = std(0xff8a5b, 0.6);
  add(scene, new RoundedBoxGeometry(1.3, 0.12, 1.0, 3, 0.05), chairM, [0, 0.85, AFF_Z - 0.6]);
  add(scene, new RoundedBoxGeometry(1.3, 1.1, 0.12, 3, 0.05), chairM, [0, 1.45, AFF_Z - 1.1]);
  return { scene, aff, paper, paperRoot, note, sun };
}

// ---------------------------------------------------------- record field
export const STRIP_LEN = 1400;
export function buildField() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfeaff, 30, 420);
  const sky = makeSky({ top: 0x3d8fe8, mid: 0x6fb6ff, horizon: 0xd8f0ff, bottom: 0x9ccf7a });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xf2f8ff, 0x6a9a4a, 1.5));
  const sun = new THREE.DirectionalLight(0xfff0d0, 2.6);
  sun.position.set(8, 14, 6);
  shadowCfg(sun, 8, 2048, 60);
  scene.add(sun, sun.target);
  const grassT = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#7cc95a';
    g.fillRect(0, 0, w, h);
    const R = rng(3);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = R() < 0.5 ? 'rgba(90,170,70,0.5)' : 'rgba(150,215,110,0.5)';
      g.fillRect(R() * w, R() * h, 2, 5);
    }
  }, true);
  grassT.repeat.set(300, 300);
  const ground = add(scene, new THREE.PlaneGeometry(3000, 3000), std(0xffffff, 0.95, { map: grassT }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  ground.receiveShadow = true;

  // the very long paper strip, running away from the camera along -z
  const lt = linedTex();
  lt.repeat.set(1, STRIP_LEN / 1.1);
  const strip = add(scene, new THREE.BoxGeometry(1.1, 0.02, STRIP_LEN), std(0xffffff, 0.85, { map: lt, emissive: 0xfff8ec, emissiveIntensity: 0.12 }), [0, 0.012, -STRIP_LEN / 2 + 1.5], [0, 0, 0], [1, 1, 1], false);
  strip.receiveShadow = true;
  // gentle curl at the start
  add(scene, new THREE.CylinderGeometry(0.12, 0.12, 1.1, 18), std(0xfffdf6, 0.85), [0, 0.12, 1.55], [0, 0, Math.PI / 2]);

  const R = rng(31);
  const leafSets = [[0x5fbf4a], [0x4fae5a], [0x7ccf4a], [0x3f9f50]];
  for (let i = 0; i < 160; i++) {
    const side = i % 2 ? 1 : -1;
    const z = 6 - R() * 700;
    const x = side * (5 + R() * 40);
    const o = R() < 0.7 ? makeTree(R, { scale: 0.9 + R() * 0.7, leaf: leafSets[Math.floor(R() * 4)], trunk: 0x8a5a35, toy: true }) : makeBush(R, { scale: 1.2, color: 0x4fae5a });
    o.position.set(x, 0, z);
    scene.add(o);
  }
  // hills on the horizon
  for (let i = 0; i < 30; i++) {
    add(scene, new THREE.SphereGeometry(40 + R() * 50, 20, 12), std([0x8fd06a, 0x7cc45e, 0x9cd877][i % 3], 1), [-600 + i * 42 + R() * 20, -20, -520 - R() * 120], [0, 0, 0], [1.8, 0.6, 1], false);
  }
  // clouds
  const cloudM = std(0xffffff, 1, { emissive: 0xffffff, emissiveIntensity: 0.35 });
  for (let i = 0; i < 18; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 4; k++) add(c, new THREE.SphereGeometry(4 + R() * 4, 16, 12), cloudM, [k * 5 - 7, R() * 2, R() * 2], [0, 0, 0], [1, 0.7, 1], false);
    c.position.set(-200 + R() * 400, 40 + R() * 40, -100 - R() * 400);
    scene.add(c);
  }
  const aff = makeAffan();
  aff.root.position.set(-1.2, 0, 2.2);
  scene.add(aff.root);
  return { scene, sky, aff, sun };
}

// ----------------------------------------------------------- Earth to Moon
export const EARTH_R = 40;
export const MOON_Y = 300;
export const MOON_R = 15;
const earthTex = () =>
  canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#2f8bea';
    g.fillRect(0, 0, w, h);
    const R = rng(12);
    const blob = (x, y, r, col) => {
      g.fillStyle = col;
      for (let i = 0; i < 9; i++) {
        g.beginPath();
        g.arc(x + (R() - 0.5) * r * 1.6, y + (R() - 0.5) * r, r * (0.4 + R() * 0.6), 0, Math.PI * 2);
        g.fill();
      }
    };
    for (let i = 0; i < 9; i++) blob(R() * w, h * 0.2 + R() * h * 0.6, 40 + R() * 50, i % 3 ? '#4cc46a' : '#8fd65a');
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.fillRect(0, 0, w, 26);
    g.fillRect(0, h - 26, w, 26);
    for (let i = 0; i < 26; i++) blob(R() * w, R() * h, 14 + R() * 18, 'rgba(255,255,255,0.55)');
  });

export function buildSpace() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060a26);
  const sky = makeSky({ top: 0x050824, mid: 0x0d1450, horizon: 0x1c2470, bottom: 0x0a0f30, radius: 1800 });
  const stars = makeStars(2200, 1600, 19);
  scene.add(sky, stars);
  // stars below the horizon too, for open space
  const stars2 = makeStars(1200, 1600, 23);
  stars2.rotation.x = Math.PI;
  scene.add(stars2);
  scene.add(new THREE.HemisphereLight(0xcfd9ff, 0x20306a, 1.0));
  const sun = new THREE.DirectionalLight(0xfff4e0, 3.0);
  sun.position.set(60, 120, 90);
  shadowCfg(sun, 12, 2048, 400);
  scene.add(sun, sun.target);

  const earth = add(scene, new THREE.SphereGeometry(EARTH_R, 96, 64), std(0xffffff, 0.7, { map: earthTex(), emissive: 0x0a2a60, emissiveIntensity: 0.25 }), [0, -EARTH_R, 0], [0.3, 0, 0.1]);
  const atm = glow(0x7fc4ff, EARTH_R * 2.9, 0.55);
  atm.position.set(0, -EARTH_R, -2);
  scene.add(atm);
  const moon = makeMoon(MOON_R);
  moon.position.set(0, MOON_Y + MOON_R, 0);
  scene.add(moon);

  // paper tower: a tall stack of sheets standing on Earth (height set per frame)
  const st = stripeTex();
  st.magFilter = THREE.LinearFilter;
  const towerM = std(0xffffff, 0.8, { map: st, emissive: 0xfff6e0, emissiveIntensity: 0.25 });
  const topM = std(0xfffdf6, 0.8, { emissive: 0xfff6e0, emissiveIntensity: 0.25 });
  const tower = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [towerM, towerM, topM, topM, towerM, towerM]);
  tower.castShadow = true;
  scene.add(tower);
  const towerGlow = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(towerGlow);
  const W0 = 2.2;
  const setTower = (h) => {
    const hh = Math.max(0.01, h);
    tower.scale.set(W0, hh, W0);
    tower.position.set(0, hh / 2, 0);
    towerGlow.scale.set(W0 * 1.6, hh + 0.4, W0 * 1.6);
    towerGlow.position.set(0, hh / 2, 0);
    st.repeat.set(1, Math.min(4000, hh / 0.03));
  };
  setTower(0.01);

  const aff = makeAffan();
  aff.root.position.set(3.2, -0.13, 0.6);
  scene.add(aff.root);
  return { scene, sky, stars, stars2, earth, moon, tower, setTower, aff, sun };
}

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
