// Episode 003 hero prop: a big, friendly container ship in The Curious Affan
// colours (navy hull, peach and white stripes, peach funnel).
//
// The hull is lofted from a few analytic profile functions. The same
// functions exist in GLSL (HULL_GLSL) so the water shaders can cut the water
// exactly around the hull (cross-section diagram) and draw foam at the
// waterline. Local units: length 200 along x (bow at +x), waterline at y = 0
// when the ship floats at its design draft, keel at y = -12.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from '../../shared/core.js';

export const HULL = { L: 200, W: 17, KB: -12, D0: 16, N: 6 };

const sat = (x) => Math.min(1, Math.max(0, x));
// half-beam at deck level, xn = x / (L/2) in [-1, 1]
export function halfW(xn) {
  if (xn > 0.35) {
    const k = (xn - 0.35) / 0.65;
    return HULL.W * Math.pow(Math.max(0, 1 - k * k), 0.55);
  }
  if (xn < -0.8) {
    const k = (-0.8 - xn) / 0.2;
    return HULL.W * (1 - 0.18 * k * k);
  }
  return HULL.W;
}
export function yBot(xn) {
  if (xn > 0.62) return HULL.KB + (HULL.D0 - HULL.KB) * 0.5 * Math.pow((xn - 0.62) / 0.38, 1.8);
  if (xn < -0.78) return HULL.KB + (HULL.D0 - HULL.KB) * 0.38 * Math.pow((-0.78 - xn) / 0.22, 2);
  return HULL.KB;
}
export function yDeck(xn) {
  return HULL.D0 + 3.5 * Math.pow(sat((xn - 0.5) / 0.5), 2);
}
// half-width of the hull at height y (local), or 0 outside the hull
export function halfWAt(xn, y) {
  if (xn < -1 || xn > 1) return 0;
  const yb = yBot(xn), d = yDeck(xn);
  if (y < yb) return 0;
  if (y > d) return halfW(xn);
  const c = Math.pow((d - y) / (d - yb), HULL.N / 2);
  return halfW(xn) * Math.pow(Math.sqrt(Math.max(0, 1 - c * c)), 2 / HULL.N);
}

// GLSL twins of the functions above (local hull coordinates).
export const HULL_GLSL = `
float hullHalfW(float xn) {
  if (xn > 0.35) { float k = (xn - 0.35) / 0.65; return ${HULL.W.toFixed(1)} * pow(max(0.0, 1.0 - k * k), 0.55); }
  if (xn < -0.8) { float k = (-0.8 - xn) / 0.2; return ${HULL.W.toFixed(1)} * (1.0 - 0.18 * k * k); }
  return ${HULL.W.toFixed(1)};
}
float hullBot(float xn) {
  if (xn > 0.62) return ${HULL.KB.toFixed(1)} + ${(HULL.D0 - HULL.KB).toFixed(1)} * 0.5 * pow((xn - 0.62) / 0.38, 1.8);
  if (xn < -0.78) return ${HULL.KB.toFixed(1)} + ${(HULL.D0 - HULL.KB).toFixed(1)} * 0.38 * pow((-0.78 - xn) / 0.22, 2.0);
  return ${HULL.KB.toFixed(1)};
}
float hullDeck(float xn) { return ${HULL.D0.toFixed(1)} + 3.5 * pow(clamp((xn - 0.5) / 0.5, 0.0, 1.0), 2.0); }
// > 0 inside the hull solid at local (x, y, z)
float hullHalfWAt(float x, float y) {
  float xn = x / ${(HULL.L / 2).toFixed(1)};
  if (xn < -1.0 || xn > 1.0) return -1.0;
  float yb = hullBot(xn), d = hullDeck(xn);
  if (y < yb) return -1.0;
  if (y > d) return hullHalfW(xn);
  float c = pow((d - y) / (d - yb), ${(HULL.N / 2).toFixed(1)});
  return hullHalfW(xn) * pow(sqrt(max(0.0, 1.0 - c * c)), ${(2 / HULL.N).toFixed(4)});
}
`;

// ------------------------------------------------------------------ textures
const V0 = HULL.KB, V1 = HULL.D0 + 3.5;
function hullTexture() {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 512;
  const g = c.getContext('2d');
  const py = (y) => ((V1 - y) / (V1 - V0)) * 512;
  const px = (x) => ((x + 100) / 200) * 2048;
  const band = (y0, y1, col) => {
    g.fillStyle = col;
    g.fillRect(0, py(y1), 2048, py(y0) - py(y1));
  };
  band(V0 - 1, -0.55, '#d8443a');
  // subtle darker streaks on the red bottom
  for (let i = 0; i < 40; i++) {
    g.fillStyle = 'rgba(120,20,20,0.08)';
    g.fillRect((i * 53) % 2048, py(-0.6), 18, py(V0) - py(-0.6));
  }
  band(-0.55, 0.55, '#f4f2ee');
  band(0.55, V1 + 1, '#1f2b5c');
  band(11.2, 12.6, '#f2915f');
  band(12.6, 13.5, '#f4f2ee');
  band(V1 - 0.35, V1 + 1, '#f4f2ee');
  // name near the bow (reads correctly on the +z side)
  g.save();
  g.translate(px(48), py(6.3));
  g.scale(1, 16.25 / 10.24);
  g.font = '800 64px "Baloo 2"';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#ffffff';
  g.fillText('AFFAN', 0, 0);
  g.restore();
  g.save();
  g.translate(px(-60), py(6.3));
  g.scale(1, 16.25 / 10.24);
  g.font = '700 40px "Baloo 2"';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillText('CURIOUS LINE', 0, 0);
  g.restore();
  // hawse pipe (anchor hole) near the bow
  g.fillStyle = '#0d1430';
  g.beginPath();
  g.ellipse(px(84), py(9.6), 14, 12, 0, 0, Math.PI * 2);
  g.fill();
  // draft marks at the bow
  g.fillStyle = '#ffffff';
  for (let y = -6; y < 0; y += 1.5) g.fillRect(px(92), py(y + 0.5), 10, 6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function ribTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 256; i += 12) {
    g.fillStyle = 'rgba(0,0,0,0.13)';
    g.fillRect(i, 0, 4, 64);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.fillRect(i + 5, 0, 2, 64);
  }
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(0, 0, 256, 4);
  g.fillRect(0, 60, 256, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

function hullGeometry() {
  const NX = 150, NP = 44;
  const pos = [], uv = [], idx = [];
  const xs = [];
  for (let i = 0; i <= NX; i++) {
    const u = i / NX;
    // denser sampling towards the bow and stern
    xs.push(-1 + 2 * (u - Math.sin(u * Math.PI * 2) * 0.08));
  }
  for (let i = 0; i <= NX; i++) {
    const xn = xs[i];
    const w = halfW(xn), yb = yBot(xn), d = yDeck(xn);
    for (let j = 0; j <= NP; j++) {
      const ph = -Math.PI / 2 + (j / NP) * Math.PI;
      const s = Math.sin(ph), c = Math.cos(ph);
      const z = w * Math.sign(s) * Math.pow(Math.abs(s), 2 / HULL.N);
      const y = d - (d - yb) * Math.pow(Math.abs(c), 2 / HULL.N);
      pos.push(xn * 100, y, z);
      uv.push((xn * 100 + 100) / 200, (y - V0) / (V1 - V0));
    }
  }
  for (let i = 0; i < NX; i++) {
    for (let j = 0; j < NP; j++) {
      const a = i * (NP + 1) + j, b = a + NP + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { g, xs };
}

function deckGeometry(xs) {
  const pos = [], idx = [];
  xs.forEach((xn, i) => {
    const w = halfW(xn), d = yDeck(xn);
    pos.push(xn * 100, d, -w, xn * 100, d, w);
    if (i) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function bulwarkGeometry(xs, h) {
  const pos = [], idx = [];
  let n = 0;
  for (const side of [-1, 1]) {
    xs.forEach((xn, i) => {
      const w = halfW(xn), d = yDeck(xn);
      pos.push(xn * 100, d - 0.1, w * side, xn * 100, d + h, w * side);
      if (i) {
        const a = n + (i - 1) * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    });
    n += xs.length * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function transomGeometry() {
  const NP = 44, xn = -1;
  const w = halfW(xn), yb = yBot(xn), d = yDeck(xn);
  const pos = [-100, (yb + d) / 2, 0], idx = [];
  for (let j = 0; j <= NP; j++) {
    const ph = -Math.PI / 2 + (j / NP) * Math.PI;
    const s = Math.sin(ph), c = Math.cos(ph);
    pos.push(-100, d - (d - yb) * Math.pow(Math.abs(c), 2 / HULL.N), w * Math.sign(s) * Math.pow(Math.abs(s), 2 / HULL.N));
    if (j) idx.push(0, j, j + 1);
  }
  // close the top edge
  idx.push(0, NP + 1, 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// cut: build the cross-section version (front half, z > 0, removed by a
// clipping plane; the inside of the hull is shown as a pale shell).
export function makeShip({ cut = false, clip = null } = {}) {
  const ship = new THREE.Group();
  const mats = [];
  const M = (m) => {
    if (clip) m.clippingPlanes = [clip];
    if (cut) m.side = THREE.DoubleSide;
    mats.push(m);
    return m;
  };
  const add = (geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], shadow = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.rotation.set(...rot);
    m.scale.set(...scale);
    m.castShadow = shadow;
    m.receiveShadow = shadow;
    ship.add(m);
    return m;
  };

  const { g: hg, xs } = hullGeometry();
  const hullMat = M(std(0xffffff, 0.45, { map: hullTexture() }));
  if (cut) hullMat.side = THREE.FrontSide;
  const hull = add(hg, hullMat);
  if (cut) {
    // inside of the hull: a pale shell so the hollow, air-filled hull reads clearly
    const inner = M(std(0xfff0dc, 0.8, { emissive: 0x6a4a30, emissiveIntensity: 0.12 }));
    inner.side = THREE.BackSide;
    add(hg, inner);
  }
  add(transomGeometry(), M(std(0x1f2b5c, 0.6, { side: THREE.DoubleSide })));
  const deckMat = M(std(0x8b93a6, 0.85));
  add(deckGeometry(xs), deckMat);
  add(bulwarkGeometry(xs, 1.3), M(std(0xf4f2ee, 0.6, { side: THREE.DoubleSide })));

  // accommodation block + bridge (stern)
  const white = M(std(0xf6f4ef, 0.55));
  const glass = M(std(0x1b3a66, 0.15, { emissive: 0x2a5d9a, emissiveIntensity: 0.25, metalness: 0.2 }));
  const decks = [[-80, 26, 30, 7], [-80.5, 24, 28, 5], [-81, 22, 26, 5], [-81.5, 20, 24, 5]];
  let y = HULL.D0;
  for (const [x, len, wid, h] of decks) {
    add(new RoundedBoxGeometry(len, h, wid, 3, 0.8), white, [x, y + h / 2, 0]);
    // window strips: front and both sides
    add(new THREE.BoxGeometry(0.3, h * 0.38, wid * 0.8), glass, [x + len / 2 + 0.05, y + h * 0.55, 0], [0, 0, 0], [1, 1, 1], false);
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(len * 0.8, h * 0.38, 0.3), glass, [x, y + h * 0.55, s * (wid / 2 + 0.05)], [0, 0, 0], [1, 1, 1], false);
    y += h;
  }
  // bridge with wings across the full beam
  add(new RoundedBoxGeometry(16, 5, 38, 3, 0.8), white, [-77, y + 2.5, 0]);
  add(new THREE.BoxGeometry(0.3, 2.2, 36), glass, [-68.9, y + 3, 0], [0, 0, 0], [1, 1, 1], false);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(14, 2.2, 0.3), glass, [-77, y + 3, s * 19.05], [0, 0, 0], [1, 1, 1], false);
  add(new RoundedBoxGeometry(17, 0.7, 39, 2, 0.3), M(std(0x1f2b5c, 0.6)), [-77, y + 5.3, 0]);
  const bridgeTop = y + 5.6;
  // mast + radar
  const mastMat = M(std(0xf2915f, 0.5));
  add(new THREE.CylinderGeometry(0.35, 0.45, 9, 10), mastMat, [-78, bridgeTop + 4.5, 0]);
  add(new THREE.BoxGeometry(0.6, 0.6, 8), mastMat, [-78, bridgeTop + 6.5, 0]);
  const radar = new THREE.Group();
  radar.position.set(-78, bridgeTop + 9.3, 0);
  ship.add(radar);
  const rm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 6), M(std(0xffffff, 0.4)));
  radar.add(rm);
  // funnel (peach, navy top, white stripe)
  const fy = HULL.D0 + 26;
  add(new THREE.CylinderGeometry(4.2, 5.0, 14, 28), M(std(0xf2915f, 0.5, { emissive: 0x3a1206, emissiveIntensity: 0.12 })), [-93, fy + 7, 0], [0, 0, 0], [1.25, 1, 1]);
  add(new THREE.CylinderGeometry(4.25, 4.35, 2.4, 28), M(std(0x1f2b5c, 0.5)), [-93, fy + 13.3, 0], [0, 0, 0], [1.25, 1, 1]);
  add(new THREE.CylinderGeometry(4.5, 4.6, 1.0, 28), M(std(0xf4f2ee, 0.5)), [-93, fy + 9.6, 0], [0, 0, 0], [1.25, 1, 1]);
  add(new THREE.CylinderGeometry(4.0, 4.0, 0.3, 28), M(std(0x10142a, 0.9)), [-93, fy + 14.4, 0], [0, 0, 0], [1.25, 1, 1], false);
  // funnel base housing
  add(new RoundedBoxGeometry(14, HULL.D0 + 26 - HULL.D0 + 0.5, 14, 2, 0.6), white, [-93, HULL.D0 + 13, 0]);
  // lifeboats (orange) on both sides of the accommodation
  const orange = M(std(0xff7a1f, 0.45, { emissive: 0x401800, emissiveIntensity: 0.2 }));
  for (const s of [-1, 1]) {
    const lb = add(new THREE.CapsuleGeometry(1.6, 6, 6, 14), orange, [-84, HULL.D0 + 14, s * 16.6], [0, 0, Math.PI / 2]);
    lb.scale.set(1, 1, 0.9);
  }

  // forward mast with a light
  add(new THREE.CylinderGeometry(0.3, 0.4, 10, 8), mastMat, [86, yDeck(0.86) + 5, 0]);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff1b0 });
  if (clip) lightMat.clippingPlanes = [clip];
  add(new THREE.SphereGeometry(0.7, 12, 8), lightMat, [86, yDeck(0.86) + 10.3, 0], [0, 0, 0], [1, 1, 1], false);

  // containers
  const R = rng(17);
  const colors = [0xe8473f, 0x2f7bff, 0xffc233, 0x2fb36b, 0xff8a3d, 0x1fb5c9, 0x9b6bff, 0xf2915f, 0xe8473f, 0x2f7bff];
  const CL = 12.2, CW = 4.7, CH = 4.4;
  const boxes = [];
  for (let bx = -62; bx <= 70; bx += 13) {
    const xn = bx / 100;
    const w = Math.min(halfW((bx + CL / 2) / 100), halfW((bx - CL / 2) / 100));
    const rows = Math.min(6, Math.floor((2 * w - 1.2) / CW));
    const tiers = bx > 52 ? 2 : bx > 30 ? 3 : 4;
    for (let r = 0; r < rows; r++) {
      const z = (r - (rows - 1) / 2) * CW;
      if (cut && z > 0) continue;
      const tierHere = tiers - (R() < 0.25 ? 1 : 0);
      for (let k = 0; k < tierHere; k++) boxes.push([bx, yDeck(xn) + 0.2 + CH / 2 + k * CH, z, colors[Math.floor(R() * colors.length)]]);
    }
  }
  const cMat = M(std(0xffffff, 0.55, { map: ribTexture() }));
  const im = new THREE.InstancedMesh(new RoundedBoxGeometry(CL - 0.4, CH - 0.15, CW - 0.25, 2, 0.18), cMat, boxes.length);
  const m4 = new THREE.Matrix4();
  const col = new THREE.Color();
  boxes.forEach(([x, yy, z, c], i) => {
    im.setMatrixAt(i, m4.makeTranslation(x, yy, z));
    im.setColorAt(i, col.setHex(c));
  });
  im.castShadow = true;
  im.receiveShadow = true;
  ship.add(im);

  if (cut) {
    // inside the hull: two bulkheads, a tank-top floor and an engine block
    const inMat = M(std(0xe8d7bf, 0.85));
    for (const bx of [-40, 30]) {
      const xn = bx / 100;
      const shape = new THREE.Shape();
      const yb = yBot(xn), d = yDeck(xn);
      const n = 24;
      for (let j = 0; j <= n; j++) {
        const yy = yb + ((d - yb) * j) / n;
        const zz = halfWAt(xn, yy) * 0.98;
        if (j === 0) shape.moveTo(0, yy);
        shape.lineTo(zz, yy);
      }
      shape.lineTo(0, d);
      const sg = new THREE.ShapeGeometry(shape);
      add(sg, inMat, [bx, 0, 0], [0, Math.PI / 2, 0]);
    }
    add(new THREE.BoxGeometry(110, 0.6, 11), inMat, [-5, HULL.KB + 3, -5.5]);
    add(new RoundedBoxGeometry(18, 7, 10, 2, 1), M(std(0x7d8aa8, 0.5, { metalness: 0.3 })), [-70, HULL.KB + 6.8, -6]);
  }

  ship.userData = {
    hull,
    mats,
    update(t) {
      radar.rotation.y = t * 2.2;
    },
  };
  return ship;
}
