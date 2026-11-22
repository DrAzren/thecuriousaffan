// Episode 054 sets:
//  - the Episode 044 park: Affan with a soda bottle that he shakes and opens
//    (a foam fountain shoots up), and a yellow volcano warning sign;
//  - the Earth cut open: crust, mantle, outer and inner core in a quarter
//    wedge, glowing hotter towards the middle;
//  - a volcano: a half mountain seen in cross-section (magma rising from deep,
//    a magma chamber filling with gas bubbles, a vent up to the crater), and
//    the full mountain outside (lava fountain, lava rivers down the sides that
//    can cool into black rock, an ash plume, new plants on the slopes);
//  - a map of Malaysia and Indonesia with volcano markers;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { add, glow, glowTex } from '../../shared/props.js';
import { buildPark, A_PK, PLAY_SCALE } from '../044-salji-malaysia/worlds.js';
import { buildOutro } from '../005-bulan-ikut-kereta/worlds.js';

export { buildOutro, A_PK, PLAY_SCALE };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

function gradientSky(top, bot, radius = 400) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, bot: { value: new THREE.Color(bot) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, bot; varying vec3 vP;
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.2, 0.6, vP.y)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), mat);
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
  return t;
}

// ------------------------------------------------------------------- park
export function buildPark54() {
  const w = buildPark();
  w.setSnow(0, 0);
  const s = w.scene;
  // soda bottle in Affan's right hand
  const bottle = new THREE.Group();
  const pet = new THREE.MeshPhysicalMaterial({ color: 0x6ad88a, roughness: 0.1, transparent: true, opacity: 0.55 });
  add(bottle, new THREE.CylinderGeometry(0.16, 0.16, 0.6, 20), pet, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  add(bottle, new THREE.CylinderGeometry(0.06, 0.16, 0.2, 20), pet, [0, 0.4, 0], [0, 0, 0], [1, 1, 1], false);
  add(bottle, new THREE.CylinderGeometry(0.165, 0.165, 0.22, 20), std(0xff4d5e, 0.6), [0, -0.02, 0], [0, 0, 0], [1, 1, 1], false);
  add(bottle, new THREE.CylinderGeometry(0.13, 0.13, 0.4, 16), std(0x6a3a1a, 0.4, { transparent: true, opacity: 0.8 }), [0, -0.08, 0], [0, 0, 0], [1, 1, 1], false);
  const cap = add(bottle, new THREE.CylinderGeometry(0.07, 0.07, 0.07, 14), std(0xffffff, 0.5), [0, 0.53, 0], [0, 0, 0], [1, 1, 1], false);
  w.aff.parts.arms.R.hand.add(bottle);
  bottle.position.set(0, -0.1, 0.1);
  bottle.rotation.set(0, 0, Math.PI / 2);
  // foam fountain
  const foamMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xfff4e0, transparent: true, opacity: 0.95, depthWrite: false });
  const foam = Array.from({ length: 70 }, () => {
    const p = new THREE.Sprite(foamMat);
    p.visible = false;
    s.add(p);
    return p;
  });
  // warning sign
  const sign = new THREE.Group();
  sign.position.set(A_PK.x - 2.2, 0, A_PK.z - 0.8);
  sign.rotation.y = 0.35;
  s.add(sign);
  add(sign, new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8), std(0x6a7488, 0.5), [0, 0.8, 0]);
  const tex = canvasTex(512, 512, (g, W, H) => {
    g.fillStyle = '#ffd23a';
    g.strokeStyle = '#1a1a22';
    g.lineWidth = 28;
    g.beginPath();
    g.moveTo(W / 2, 30);
    g.lineTo(W - 30, H - 60);
    g.lineTo(30, H - 60);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#1a1a22';
    g.font = '900 230px "Baloo 2", sans-serif';
    g.textAlign = 'center';
    g.fillText('!', W / 2, H - 120);
  });
  add(sign, new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }), [0, 1.9, 0.04], [0, 0, 0], [1, 1, 1], false);
  sign.visible = false;
  return { ...w, bottle, cap, foam, sign };
}

// ------------------------------------------------------------- Earth cut
export const EARTH_R = 4;
const LAYERS = [[1.0, '#8a5a3a'], [0.94, '#ff6a2a'], [0.55, '#ffa33a'], [0.3, '#fff2a0']];
export function buildEarthCut() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060a1c);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a3a, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.3);
  key.position.set(6, 8, 10);
  scene.add(key);
  const R = rng(5400);
  const starM = new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.8 });
  for (let i = 0; i < 120; i++) {
    const s = new THREE.Sprite(starM);
    s.position.set((R() - 0.5) * 80, (R() - 0.5) * 80, -30 - R() * 20);
    s.scale.setScalar(0.1 + R() * 0.25);
    scene.add(s);
  }
  const earth = new THREE.Group();
  earth.rotation.set(0.3, 2.55, 0);
  scene.add(earth);
  // outer shell: 3/4 sphere with simple land texture
  const tex = canvasTex(1024, 512, (g, W, H) => {
    g.fillStyle = '#2a7ad8';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#4ab84a';
    for (let i = 0; i < 22; i++) {
      g.beginPath();
      g.ellipse(R() * W, 80 + R() * (H - 160), 40 + R() * 110, 25 + R() * 70, R() * 3, 0, Math.PI * 2);
      g.fill();
    }
  });
  add(earth, new THREE.SphereGeometry(EARTH_R, 64, 40, 0, Math.PI * 1.5), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, side: THREE.DoubleSide }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  // cut faces: two half discs with rings
  const ringTex = canvasTex(1024, 1024, (g, W) => {
    const c = W / 2;
    LAYERS.forEach(([r, col]) => {
      g.fillStyle = col;
      g.beginPath();
      g.arc(c, c, r * c, 0, Math.PI * 2);
      g.fill();
    });
    const gr = g.createRadialGradient(c, c, 0, c, c, c * 0.35);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, W);
  });
  const faceM = new THREE.MeshBasicMaterial({ map: ringTex, side: THREE.DoubleSide });
  const face1 = add(earth, new THREE.CircleGeometry(EARTH_R, 64, -Math.PI / 2, Math.PI), faceM, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  face1.rotation.y = Math.PI / 2; // plane x = 0, facing +x... covers z >= 0 half
  const face2 = add(earth, new THREE.CircleGeometry(EARTH_R, 64, Math.PI / 2, Math.PI), faceM, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  // heat shimmer sprites in the core
  const hot = glow(0xffd27a, 3.5, 0.8);
  earth.add(hot);
  // a chunk of rock that melts into magma
  const rock = new THREE.Group();
  scene.add(rock);
  const rockM = std(0x7a6a5a, 0.9, { flatShading: true, emissive: 0xff4a10, emissiveIntensity: 0 });
  add(rock, new THREE.DodecahedronGeometry(0.9, 0), rockM, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  rock.visible = false;
  return { scene, earth, face1, face2, hot, rock, rockM };
}

// ---------------------------------------------------------------- volcano
export const CHAMBER = V3(0, -3.2, 0);
export const CRATER_Y = 7.2;
function volcanoGeo(thetaLength) {
  const pts = [];
  const prof = [[0.0, 7.2, 1.0], [1.2, 6.9, 1.0], [3.0, 4.6, 1.0], [5.5, 2.0, 1.0], [8.5, 0.3, 1.0], [11, 0, 1]];
  for (const [r, y] of prof) pts.push(new THREE.Vector2(r, y));
  pts.reverse();
  const g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(Math.max(0.001, p.x), p.y)), 64, 0, thetaLength);
  const p = g.attributes.position;
  const R = rng(54);
  const ph = [R() * 6, R() * 6];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 + 0.06 * Math.sin(a * 7 + ph[0]) * Math.sin(y * 1.3 + ph[1]);
    p.setXYZ(i, x * k, y, z * k);
  }
  g.computeVertexNormals();
  return g;
}
export function buildVolcano() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x4a7ad0, 0xf0d8b0);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x5a4a3a, 1.2));
  const key = new THREE.DirectionalLight(0xfff0d8, 1.6);
  key.position.set(10, 16, 12);
  scene.add(key);
  const lavaLight = new THREE.PointLight(0xff6a2a, 0, 40);
  lavaLight.position.set(0, CRATER_Y + 1, 0);
  scene.add(lavaLight);
  add(scene, new THREE.CircleGeometry(90, 48), std(0x7a8a4a, 0.95), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  const rockM = std(0x7a6a5a, 0.9, { flatShading: true });
  // full mountain (outside) and half mountain (cross-section)
  const full = add(scene, volcanoGeo(Math.PI * 2), rockM, [0, 0, 0], [0, 0, 0], [1, 1, 1]);
  const half = add(scene, volcanoGeo(Math.PI), rockM, [0, 0, 0], [0, Math.PI / 2, 0], [1, 1, 1]);
  // cross-section face: the mountain profile plus underground layers, on plane z = 0
  const sec = new THREE.Group();
  scene.add(sec);
  const faceTex = canvasTex(1024, 1024, (g, W, H) => {
    // world x -11..11, y -8..8  ->  canvas
    const X = (x) => ((x + 11) / 22) * W, Y = (y) => ((8 - y) / 16) * H;
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#5a4030';
    g.fillRect(0, Y(0), W, H);
    for (let i = 0; i < 6; i++) {
      g.fillStyle = i % 2 ? '#6a4a36' : '#4e3626';
      g.fillRect(0, Y(-1.2 * i), W, Y(-1.2 * (i + 1)) - Y(-1.2 * i));
    }
    g.fillStyle = '#8a7a6a';
    g.beginPath();
    g.moveTo(X(-11), Y(0));
    for (const [x, y] of [[-8.5, 0.3], [-5.5, 2.0], [-3.0, 4.6], [-1.2, 6.9], [1.2, 6.9], [3.0, 4.6], [5.5, 2.0], [8.5, 0.3], [11, 0]]) g.lineTo(X(x), Y(y));
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(60,40,30,0.5)';
    g.lineWidth = 6;
    for (let i = 1; i < 5; i++) {
      g.beginPath();
      g.moveTo(X(-11 + i * 0.5), Y(0.2));
      g.lineTo(X(0), Y(7 - i * 1.4));
      g.lineTo(X(11 - i * 0.5), Y(0.2));
      g.stroke();
    }
  });
  add(sec, new THREE.PlaneGeometry(22, 16), new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.9, alphaTest: 0.5 }), [0, 0, 0.01], [0, 0, 0], [1, 1, 1], false);
  const magmaM = std(0xff6a1a, 0.4, { emissive: 0xff4a00, emissiveIntensity: 0.9 });
  const vent = add(sec, new THREE.BoxGeometry(0.7, 1, 0.1), magmaM, [0, 0, 0.06], [0, 0, 0], [1, 1, 1], false);
  const chamber = add(sec, new THREE.SphereGeometry(1, 32, 20), magmaM, [CHAMBER.x, CHAMBER.y, 0.05], [0, 0, 0], [3.2, 1.6, 0.05], false);
  const feed = add(sec, new THREE.BoxGeometry(0.5, 4, 0.1), magmaM, [0, -6.5, 0.06], [0, 0, 0], [1, 1, 1], false);
  const blobs = Array.from({ length: 10 }, () => add(sec, new THREE.SphereGeometry(0.35, 16, 12), magmaM, [0, 0, 0.12], [0, 0, 0], [1, 1, 0.3], false));
  const bubM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, transparent: true, opacity: 0.6, emissive: 0xffe0c0, emissiveIntensity: 0.3 });
  const bubbles = Array.from({ length: 26 }, () => add(sec, new THREE.SphereGeometry(0.16, 12, 10), bubM, [0, 0, 0.2], [0, 0, 0], [1, 1, 1], false));
  // eruption: fountain sprites, ash puffs, lava rivers
  const lavaSpr = new THREE.SpriteMaterial({ map: glowTex, color: 0xffa040, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
  const fountain = Array.from({ length: 80 }, () => {
    const s2 = new THREE.Sprite(lavaSpr);
    s2.visible = false;
    scene.add(s2);
    return s2;
  });
  const ashM = std(0x9a9aa2, 1, { transparent: true, opacity: 0.9 });
  const R = rng(5401);
  const ash = Array.from({ length: 40 }, () => {
    const m = add(scene, new THREE.SphereGeometry(1, 12, 10), ashM, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    m.userData = { dx: (R() - 0.5) * 3, dz: (R() - 0.5) * 3, ph: R(), s: 0.8 + R() * 1.6 };
    m.visible = false;
    return m;
  });
  const lavaRiverM = std(0xff5a10, 0.4, { emissive: 0xff4000, emissiveIntensity: 1.0 });
  const rivers = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      const r = 0.9 + u * 8.5;
      const y = r < 1.2 ? 7.0 : r < 3 ? 6.9 - (r - 1.2) * 1.28 : r < 5.5 ? 4.6 - (r - 3) * 1.04 : r < 8.5 ? 2.0 - (r - 5.5) * 0.57 : 0.3;
      const wob = 0.25 * Math.sin(u * 9 + k);
      pts.push(V3(Math.cos(a + wob * 0.1) * r * 1.04, y + 0.12, Math.sin(a + wob * 0.1) * r * 1.04));
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.28, 6);
    const m = add(scene, geo, lavaRiverM, [0, 0, 0], [0, 0, 0], [1, 1, 0.45], false);
    m.scale.set(1, 1, 1);
    rivers.push(m);
  }
  // new plants on cooled slopes
  const plants = [];
  const leaf = std(0x4ab84a, 0.7);
  for (let i = 0; i < 40; i++) {
    const a = R() * Math.PI * 2, r = 3 + R() * 6;
    const y = r < 5.5 ? 4.6 - (r - 3) * 1.04 : 2.0 - (r - 5.5) * 0.57;
    const p = add(scene, new THREE.ConeGeometry(0.25, 0.7, 6), leaf, [Math.cos(a) * r, y + 0.3, Math.sin(a) * r], [0, 0, 0], [1, 1, 1], false);
    p.visible = false;
    plants.push(p);
  }
  return { scene, sky, key, lavaLight, full, half, sec, vent, chamber, feed, blobs, bubbles, magmaM, fountain, ash, ashM, rivers, lavaRiverM, plants };
}

// --------------------------------------------------------------------- map
export const MAP_POS = {
  my: V3(-1.4, 0, -2.6),
  sb: V3(2.6, 0, -2.4),
  id: V3(0.6, 0, 1.8),
};
export function buildMap() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e2a5a);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3a5a, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(3, 10, 6);
  scene.add(key);
  // map plane: x -8..8 (lon 94..142), z -6..6 (lat 8..-11)
  const L = (lon, lat) => [((lon - 94) / 48) * 1024, ((8 - lat) / 19) * 768];
  const tex = canvasTex(1024, 768, (g) => {
    g.fillStyle = '#3a8ad8';
    g.fillRect(0, 0, 1024, 768);
    const poly = (pts, col) => {
      g.fillStyle = col;
      g.beginPath();
      pts.forEach(([lo, la], i) => {
        const [x, y] = L(lo, la);
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      });
      g.closePath();
      g.fill();
    };
    const MY = '#5ac85a', ID = '#d8b878', OT = '#9ab89a';
    poly([[100.2, 6.6], [102.3, 6.2], [103.4, 4.5], [104.3, 1.4], [103.4, 1.3], [101.3, 2.9], [100.3, 5.4]], MY); // Peninsular Malaysia
    poly([[109.6, 1.5], [111, 1.8], [113.5, 3.8], [115.5, 5], [117.2, 6.9], [119.3, 5.2], [117.6, 4.2], [115.4, 4.4], [113.2, 2.2], [111.6, 1.2], [110, 0.9]], MY); // Sarawak + Sabah
    poly([[95.2, 5.6], [97.5, 5.2], [100.4, 2.2], [104, -1], [106, -3.8], [105.8, -5.8], [104.3, -5.6], [101.2, -2.8], [98.6, 1.6], [95.3, 4.2]], ID); // Sumatra
    poly([[105.2, -6.8], [108.5, -6.3], [111.5, -6.6], [114.6, -7.8], [114.3, -8.7], [110.4, -8.1], [106.4, -7.4]], ID); // Java
    poly([[115, -8.3], [116.4, -8.1], [119, -8.5], [124, -8.3], [124.5, -9.3], [119, -9.2], [115.6, -8.8]], ID); // Nusa Tenggara
    poly([[109, 0.9], [111.6, 1.2], [113.2, 2.2], [115.4, 4.4], [117.6, 4.2], [118, 1.3], [116.3, -1.8], [116, -3.8], [114.5, -3.5], [111.6, -3], [110.1, -1.5]], ID); // Kalimantan
    poly([[119.4, -5.5], [120.4, -1], [121.5, 1], [124.8, 1.5], [125, 0.8], [122, 0.6], [121, -1], [123.4, -1], [121.5, -2.5], [122.6, -4.8], [120.5, -4.2], [120.4, -5.6]], ID); // Sulawesi
    poly([[127.4, 2], [128.6, 1.2], [128.3, -1], [127.5, -0.3]], ID); // Halmahera
    poly([[131, -1], [134, -0.9], [138, -1.7], [141, -2.6], [141, -9], [138, -8.3], [135, -4.3], [132.5, -4], [131.3, -1.8]], ID); // Papua
    poly([[103.6, 1.45], [104.1, 1.45], [104.1, 1.25], [103.6, 1.25]], OT); // Singapore
    poly([[114, 4.9], [115.3, 5.0], [115.3, 4.0], [114.1, 4.3]], OT); // Brunei
  });
  add(scene, new THREE.PlaneGeometry(16, 12), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  // volcano markers (lon, lat) along the Indonesian arcs
  const VOLCS = [[95.4, 5.4], [98.4, 3.2], [99.5, 1.2], [100.5, -0.4], [101.3, -1.7], [102.3, -3.5], [104.3, -5.0], [105.4, -6.1], [107.6, -6.8], [108.2, -7.2], [110.4, -7.5], [110.9, -7.6], [112.3, -7.9], [112.9, -8.0], [114.0, -8.0], [115.5, -8.3], [116.5, -8.4], [118.0, -8.2], [121.7, -8.6], [123.6, -8.4], [124.8, 1.3], [125.4, 2.8], [127.3, 1.4], [127.6, 0.8], [129.9, -4.5], [121.4, -2.2]];
  const toWorld = (lon, lat) => V3(((lon - 94) / 48) * 16 - 8, 0, ((8 - lat) / 19) * 12 - 6);
  const volM = std(0xff3a2a, 0.4, { emissive: 0xff2a10, emissiveIntensity: 0.5 });
  const marks = VOLCS.map(([lo, la]) => {
    const m = add(scene, new THREE.ConeGeometry(0.26, 0.6, 3), volM, toWorld(lo, la).add(V3(0, 0.3, 0)).toArray(), [0, 0, 0], [1, 1, 1], false);
    m.scale.setScalar(0.001);
    return m;
  });
  return { scene, marks, toWorld };
}
