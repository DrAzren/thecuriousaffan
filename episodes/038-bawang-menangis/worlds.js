// Episode 038 sets:
//  - a bright home kitchen: an island counter with a cutting board, a halved
//    onion and chopped pieces, a knife, a tall fridge (its door can open to
//    show a cold onion), wall tiles, a window and cabinets;
//  - Mama: built from Affan's rig with a tudung (head scarf), a teal baju
//    kurung and no glasses, ~35% taller;
//  - the "dalam bawang" (inside the onion) imagination world: a wall of clear
//    onion cells, each storing yellow and purple "bahan" apart, a giant knife
//    that slices through, cells that burst, and green gas puffs that rise;
//  - a giant cartoon eye set into a cheek: a glossy wet eye that can redden
//    and squint, a tear gland, tear drops and gas puffs;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan, AFFAN } from '../../shared/affan.js';
import { add, glow, glowTex } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';

export { buildOutro };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

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
function gradientSky(top, bot) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, bot: { value: new THREE.Color(bot) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, bot; varying vec3 vP;
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.3, 0.7, vP.y)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}

// --------------------------------------------------------------------- Mama
export const MAMA = { baju: 0x2fa39a, inner: 0xfff0f4, stripe: 0xf7c948, kain: 0x22706a, tudung: 0xf2a8c8 };
export function makeMama() {
  const k = makeAffan();
  const swap = new Map([
    [AFFAN.navy, MAMA.baju],
    [AFFAN.shirt, MAMA.inner],
    [AFFAN.peach, MAMA.stripe],
    [AFFAN.pants, MAMA.kain],
  ]);
  const near = (c, hex) => {
    const d = new THREE.Color(hex);
    return Math.abs(c.r - d.r) + Math.abs(c.g - d.g) + Math.abs(c.b - d.b) < 0.01;
  };
  const done = new Set();
  k.root.traverse((o) => {
    if (!o.isMesh || !o.material || !o.material.color) return;
    // hide Affan's hair (the tudung covers the head)
    if (near(o.material.color, AFFAN.hair) || near(o.material.color, AFFAN.hairHi)) {
      if (o.parent === k.parts.head) o.visible = false;
      return;
    }
    if (done.has(o.material)) return;
    done.add(o.material);
    for (const [from, to] of swap) {
      if (!near(o.material.color, from)) continue;
      o.material.color.setHex(to);
      if (o.material.emissive) o.material.emissive.setHex(0x061a18);
      break;
    }
  });
  k.parts.glasses.visible = false;
  const head = k.parts.head;
  const tud = std(MAMA.tudung, 0.85, { emissive: 0x3a1020, emissiveIntensity: 0.15, side: THREE.DoubleSide });
  // shell over the head, open at the face (front = +z, phi = PI/2)
  const open = 1.15;
  add(head, new THREE.SphereGeometry(0.97, 48, 32, Math.PI / 2 + open, Math.PI * 2 - open * 2, 0, Math.PI * 0.74), tud, [0, 0.02, -0.02], [0, 0, 0], [1, 1.02, 0.98]);
  // band framing the face
  add(head, new THREE.TorusGeometry(0.74, 0.07, 10, 40, Math.PI * 1.35), tud, [0, 0.02, 0.58], [0, 0, -Math.PI * 0.175 + Math.PI], [1.02, 1.12, 1]);
  // drape over the neck and shoulders
  add(head, new THREE.CylinderGeometry(0.7, 1.25, 1.1, 40, 1, true), tud, [0, -0.95, -0.05], [0.08, 0, 0], [1, 1, 0.85]);
  add(head, new THREE.SphereGeometry(0.62, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), tud, [0, -0.62, 0.22], [0, 0, 0], [1.05, 0.55, 0.8]);
  // a long kain to the ankles
  add(k.parts.body, new THREE.CylinderGeometry(0.42, 0.55, 1.05, 32, 1, true), std(MAMA.kain, 0.8, { side: THREE.DoubleSide }), [0, 0.55, 0]);
  // gentle lashes / softer look: slightly rounder blush
  k.root.scale.setScalar(1);
  k.root.name = 'Mama';
  return k;
}

// ------------------------------------------------------------------ kitchen
export const ISLAND = new THREE.Vector3(0, 0, -1.0);
export const ISLAND_TOP = 1.25;
export const BOARD = new THREE.Vector3(-0.15, ISLAND_TOP, -1.22);
export const MAMA_POS = new THREE.Vector3(-0.1, 0, -1.98);
export const AFF_POS = new THREE.Vector3(1.75, 0.42, -0.35); // on a stool
export const MAMA_SCALE = 0.8;
export const AFF_SCALE = 0.52;
export const FRIDGE = new THREE.Vector3(-3.4, 0, -3.0);

export function buildKitchen() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf6efe4);
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0x9a8a7a, 1.3));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.2);
  key.position.set(4, 8, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera;
  sc.left = -8;
  sc.right = 8;
  sc.top = 8;
  sc.bottom = -8;
  sc.near = 1;
  sc.far = 40;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe0ecff, 0.7);
  fill.position.set(-6, 4, 6);
  scene.add(fill);

  const floorTex = canvasTex(512, 512, (g, w) => {
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        g.fillStyle = (x + y) % 2 ? '#e9dcc8' : '#f7efe2';
        g.fillRect(x * 128, y * 128, 128, 128);
      }
  }, [10, 10]);
  const floor = add(scene, new THREE.PlaneGeometry(40, 40), std(0xffffff, 0.8, { map: floorTex }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  floor.receiveShadow = true;
  const tileTex = canvasTex(512, 512, (g, w) => {
    g.fillStyle = '#f4fbff';
    g.fillRect(0, 0, w, w);
    g.strokeStyle = '#cfe3ee';
    g.lineWidth = 6;
    for (let i = 0; i <= 8; i++) {
      g.beginPath();
      g.moveTo(i * 64, 0);
      g.lineTo(i * 64, w);
      g.moveTo(0, i * 64);
      g.lineTo(w, i * 64);
      g.stroke();
    }
  }, [6, 3]);
  const back = add(scene, new THREE.PlaneGeometry(24, 9), std(0xffffff, 0.6, { map: tileTex }), [0, 4.5, -4.2], [0, 0, 0], [1, 1, 1], false);
  back.receiveShadow = true;
  // back counter + cabinets
  add(scene, new THREE.BoxGeometry(9, 1.2, 1.0), std(0x8fd0c0, 0.6), [1.5, 0.6, -3.7]);
  add(scene, new THREE.BoxGeometry(9.1, 0.08, 1.1), std(0xfaf6f0, 0.4), [1.5, 1.24, -3.65]);
  for (let i = 0; i < 4; i++) add(scene, new RoundedBoxGeometry(2.1, 1.2, 0.7, 2, 0.06), std(0x8fd0c0, 0.6), [-1.4 + i * 2.2, 4.4, -3.85]);
  // window
  const win = new THREE.Group();
  win.position.set(1.8, 2.7, -4.15);
  scene.add(win);
  add(win, new THREE.PlaneGeometry(2.2, 1.4), new THREE.MeshBasicMaterial({ color: 0xbfe6ff }), [0, 0, 0.01], [0, 0, 0], [1, 1, 1], false);
  for (const [x, y, w, h] of [[0, 0.72, 2.4, 0.1], [0, -0.72, 2.4, 0.1], [-1.15, 0, 0.1, 1.5], [1.15, 0, 0.1, 1.5], [0, 0, 0.06, 1.4]]) add(win, new THREE.BoxGeometry(w, h, 0.1), std(0xffffff, 0.5), [x, y, 0.05]);
  // pots on the back counter
  add(scene, new THREE.CylinderGeometry(0.35, 0.3, 0.45, 24), std(0xff7a5a, 0.4), [3.6, 1.5, -3.6]);
  add(scene, new THREE.CylinderGeometry(0.22, 0.22, 0.6, 16), std(0xffd166, 0.5), [4.4, 1.55, -3.6]);

  // island counter
  add(scene, new THREE.BoxGeometry(3.6, ISLAND_TOP - 0.06, 1.2), std(0xf2c18f, 0.6), [ISLAND.x, (ISLAND_TOP - 0.06) / 2, ISLAND.z]);
  add(scene, new THREE.BoxGeometry(3.8, 0.08, 1.35), std(0xffffff, 0.35), [ISLAND.x, ISLAND_TOP - 0.02, ISLAND.z]).receiveShadow = true;
  // cutting board
  add(scene, new RoundedBoxGeometry(1.3, 0.07, 0.75, 2, 0.03), std(0xd8a46a, 0.7), [BOARD.x, ISLAND_TOP + 0.035, BOARD.z]);
  // the onion: a halved bulb with rings on the cut face, plus chopped pieces
  const onion = new THREE.Group();
  onion.position.set(BOARD.x - 0.25, ISLAND_TOP + 0.07, BOARD.z);
  scene.add(onion);
  const ringTex = canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#fbf2fb';
    g.fillRect(0, 0, w, w);
    for (let r = 120; r > 6; r -= 15) {
      g.strokeStyle = 'rgba(190,140,200,0.8)';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(128, 128, r, 0, Math.PI * 2);
      g.stroke();
    }
  });
  const skin = std(0xb06ab8, 0.5, { emissive: 0x30102e, emissiveIntensity: 0.2 });
  add(onion, new THREE.SphereGeometry(0.24, 32, 20, 0, Math.PI), skin, [0, 0.0, 0], [0, Math.PI / 2, 0], [1, 1.05, 1]);
  add(onion, new THREE.CircleGeometry(0.24, 32), std(0xffffff, 0.6, { map: ringTex }), [0.0, 0, 0.001], [0, Math.PI / 2, 0], [1, 1.05, 1], false);
  const pieces = [];
  const R = rng(38);
  for (let i = 0; i < 9; i++) {
    const p = add(scene, new THREE.TorusGeometry(0.06 + R() * 0.03, 0.018, 6, 12, Math.PI * (0.6 + R() * 0.5)), std(0xf4e2f2, 0.6), [BOARD.x + 0.15 + R() * 0.35, ISLAND_TOP + 0.09, BOARD.z - 0.2 + R() * 0.4], [-Math.PI / 2, 0, R() * 6]);
    pieces.push(p);
  }
  // knife (blade along local +x, edge down)
  const knife = new THREE.Group();
  scene.add(knife);
  const blade = add(knife, new THREE.BoxGeometry(0.55, 0.13, 0.015), std(0xd8dde6, 0.18, { metalness: 0.85 }), [0.36, -0.02, 0]);
  add(knife, new RoundedBoxGeometry(0.28, 0.07, 0.06, 2, 0.02), std(0x3a2a20, 0.6), [-0.06, 0, 0]);
  const shine = glow(0xffffff, 0.5, 0);
  shine.position.set(0.5, 0.02, 0.02);
  knife.add(shine);
  void blade;
  // stool for Affan
  add(scene, new THREE.CylinderGeometry(0.32, 0.32, 0.08, 24), std(0xff8a5a, 0.5), [AFF_POS.x, AFF_POS.y - 0.04, AFF_POS.z]);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    add(scene, new THREE.CylinderGeometry(0.03, 0.03, AFF_POS.y - 0.08, 8), std(0x6a4a3a, 0.6), [AFF_POS.x + Math.cos(a) * 0.22, (AFF_POS.y - 0.08) / 2, AFF_POS.z + Math.sin(a) * 0.22]);
  }

  // fridge with a door that opens (hinged on its left side)
  const fridge = new THREE.Group();
  fridge.position.copy(FRIDGE);
  fridge.rotation.y = 0.35;
  scene.add(fridge);
  add(fridge, new RoundedBoxGeometry(1.5, 3.4, 1.2, 3, 0.1), std(0xf4f6fa, 0.35), [0, 1.7, 0]);
  add(fridge, new THREE.BoxGeometry(1.32, 2.0, 0.05), std(0xbfe0ff, 0.6, { emissive: 0x6080a0, emissiveIntensity: 0.4 }), [0, 1.35, 0.56]);
  // inside: shelf and a cold onion
  add(fridge, new THREE.BoxGeometry(1.3, 0.04, 0.9), std(0xe8f4ff, 0.3, { transparent: true, opacity: 0.8 }), [0, 1.2, 0.15]);
  const coldOnion = add(fridge, new THREE.SphereGeometry(0.2, 24, 16), skin, [0.1, 1.42, 0.25], [0, 0, 0], [1, 1.1, 1]);
  add(coldOnion, new THREE.ConeGeometry(0.05, 0.14, 8), std(0x8a5a30, 0.7), [0, 0.24, 0]);
  const door = new THREE.Group();
  door.position.set(-0.75, 0, 0.62);
  fridge.add(door);
  add(door, new RoundedBoxGeometry(1.5, 2.2, 0.12, 3, 0.05), std(0xf8fafc, 0.3), [0.75, 1.3, 0]);
  add(door, new RoundedBoxGeometry(1.5, 1.05, 0.12, 3, 0.05), std(0xf8fafc, 0.3), [0.75, 2.95, 0]);
  add(door, new THREE.BoxGeometry(0.06, 0.6, 0.06), std(0x9aa4b4, 0.3, { metalness: 0.5 }), [1.3, 1.6, 0.08]);
  add(fridge, new THREE.BoxGeometry(0.06, 0.4, 0.06), std(0x9aa4b4, 0.3, { metalness: 0.5 }), [0.55, 2.95, 0.7]);

  const mama = makeMama();
  mama.root.scale.setScalar(MAMA_SCALE);
  scene.add(mama.root);
  const aff = makeAffan();
  aff.root.scale.setScalar(AFF_SCALE);
  scene.add(aff.root);
  // tears (on Mama's cheeks)
  const tearMat = new THREE.MeshStandardMaterial({ color: 0x8fd8ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.9, emissive: 0x2a6aa0, emissiveIntensity: 0.3 });
  const tears = Array.from({ length: 4 }, () => {
    const d = add(scene, new THREE.SphereGeometry(0.035, 12, 10), tearMat, [0, 0, 0], [0, 0, 0], [0.8, 1.2, 0.8], false);
    d.visible = false;
    return d;
  });
  return { scene, mama, aff, knife, shine, onion, pieces, fridge, door, coldOnion, tears };
}

// ------------------------------------------------------- inside the onion
export const COLS = 5, ROWS = 6;
export const CELL_W = 1.5, CELL_H = 1.1;
export function buildCells() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0xf3e6ff, 0xffd8ee);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8b8e8, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 6, 8);
  scene.add(key);
  add(scene, new THREE.PlaneGeometry(60, 30), std(0xeed8f4, 0.9), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  const wallMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, roughness: 0.1, clearcoat: 1, depthWrite: false });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xb07ad0, transparent: true, opacity: 0.9 });
  const yellow = std(0xffd23a, 0.4, { emissive: 0x7a5000, emissiveIntensity: 0.3 });
  const purple = std(0x9a5ae0, 0.4, { emissive: 0x30105a, emissiveIntensity: 0.3 });
  const vacMat = new THREE.MeshStandardMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.35, roughness: 0.2, depthWrite: false });
  const R = rng(5);
  const cells = [];
  const cellGeo = new RoundedBoxGeometry(CELL_W * 0.94, CELL_H * 0.92, 0.9, 3, 0.18);
  const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(CELL_W * 0.94, CELL_H * 0.92, 0.9));
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const g = new THREE.Group();
      const x = (c - (COLS - 1) / 2) * CELL_W + (r % 2) * CELL_W * 0.5 - CELL_W * 0.25;
      const y = 0.65 + r * CELL_H;
      g.position.set(x, y, 0);
      scene.add(g);
      const wall = new THREE.Mesh(cellGeo, wallMat.clone());
      wall.renderOrder = 5;
      g.add(wall);
      const edge = new THREE.LineSegments(edgeGeo, edgeMat.clone());
      g.add(edge);
      // stored apart: yellow inside a little bubble, purple dots outside it
      const vac = add(g, new THREE.SphereGeometry(0.28, 20, 14), vacMat.clone(), [-0.22, 0.02, 0.1], [0, 0, 0], [1, 1, 1], false);
      vac.renderOrder = 4;
      const ys = [], ps = [];
      for (let i = 0; i < 3; i++) ys.push(add(g, new THREE.SphereGeometry(0.075, 12, 10), yellow.clone(), [-0.22 + (i - 1) * 0.11, 0.02 + (i % 2) * 0.06, 0.1], [0, 0, 0], [1, 1, 1], false));
      for (let i = 0; i < 4; i++) ps.push(add(g, new THREE.SphereGeometry(0.055, 10, 8), purple.clone(), [0.25 + (i % 2) * 0.16, -0.15 + Math.floor(i / 2) * 0.28, 0.12], [0, 0, 0], [1, 1, 1], false));
      cells.push({ g, wall, edge, vac, ys, ps, x, y, ph: R() * 10, home: { ys: ys.map((m) => m.position.clone()), ps: ps.map((m) => m.position.clone()) } });
    }
  // giant knife (blade in the x/y plane, edge down)
  const knife = new THREE.Group();
  scene.add(knife);
  add(knife, new THREE.BoxGeometry(0.16, 6.5, 3.0), std(0xdfe4ec, 0.15, { metalness: 0.9 }), [0, 3.25, 0]);
  add(knife, new THREE.BoxGeometry(0.5, 2.2, 0.9), std(0x3a2a20, 0.6), [0, 7.6, 0]);
  // gas puffs
  const gasMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xb8ff6a, transparent: true, depthWrite: false });
  const gas = Array.from({ length: 40 }, () => {
    const s = new THREE.Sprite(gasMat.clone());
    s.visible = false;
    scene.add(s);
    return s;
  });
  const aff = makeAffan();
  aff.root.scale.setScalar(0.42);
  scene.add(aff.root);
  return { scene, sky, cells, knife, gas, aff };
}

// ------------------------------------------------------------- giant eye
export const EYE_R = 2.6;
export function buildEye() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0xffe8d8, 0xffd0b8);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xfff4ec, 0xb07060, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(-3, 6, 8);
  scene.add(key);
  // cheek / face surface
  const skinCol = AFFAN.skin;
  add(scene, new THREE.SphereGeometry(14, 64, 40), std(skinCol, 0.6, { emissive: 0x3a1608, emissiveIntensity: 0.18 }), [0, 0, -12.6], [0, 0, 0], [1.3, 1, 1], false).receiveShadow = true;
  const eye = new THREE.Group();
  eye.position.set(0, 0.4, 0.6);
  scene.add(eye);
  const scleraMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05 });
  add(eye, new THREE.SphereGeometry(EYE_R, 64, 48), scleraMat, [0, 0, 0], [0, 0, 0], [1.25, 1, 0.8], false);
  const iris = new THREE.Group();
  iris.position.set(0, 0, EYE_R * 0.8 + 0.06);
  eye.add(iris);
  add(iris, new THREE.SphereGeometry(1.05, 40, 24), std(0x6a3a1a, 0.3, { emissive: 0x2a1006, emissiveIntensity: 0.3 }), [0, 0, -0.55], [0, 0, 0], [1, 1, 0.55], false);
  add(iris, new THREE.SphereGeometry(0.5, 32, 20), std(0x120806, 0.2), [0, 0, -0.2], [0, 0, 0], [1, 1, 0.5], false);
  add(iris, new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0.4, 0.42, 0.12], [0, 0, 0], [1, 1, 0.4], false);
  // eyelids (skin shells that rotate closed)
  const lidMat = std(skinCol, 0.55, { emissive: 0x3a1608, emissiveIntensity: 0.18, side: THREE.DoubleSide });
  const lidU = new THREE.Group(), lidL = new THREE.Group();
  eye.add(lidU, lidL);
  add(lidU, new THREE.SphereGeometry(EYE_R * 1.04, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), lidMat, [0, 0, 0], [0, 0, 0], [1.25, 1, 0.82], false);
  add(lidL, new THREE.SphereGeometry(EYE_R * 1.03, 48, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lidMat, [0, 0, 0], [0, 0, 0], [1.25, 1, 0.81], false);
  // lashes on the upper lid edge (follow the lid)
  const lashMat = std(0x1a1010, 0.5);
  const lashes = new THREE.Group();
  lidU.add(lashes);
  for (let i = 0; i < 9; i++) {
    const a = -0.9 + (i / 8) * 1.8;
    add(lashes, new THREE.CylinderGeometry(0.035, 0.02, 0.55, 6), lashMat, [Math.sin(a) * EYE_R * 1.25, 0.05, Math.cos(a) * EYE_R * 0.84], [0.9, 0, -a * 0.6], [1, 1, 1], false);
  }
  // tear gland (upper outer corner) and tear drops
  const gland = add(scene, new THREE.SphereGeometry(0.45, 24, 16), std(0xff8aa8, 0.4, { emissive: 0x7a2040, emissiveIntensity: 0.3 }), [3.4, 2.5, 0.9], [0, 0, 0], [1.2, 0.8, 0.8], false);
  const tearMat = new THREE.MeshPhysicalMaterial({ color: 0x8fd8ff, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.85, emissive: 0x2a6aa0, emissiveIntensity: 0.25 });
  const tears = Array.from({ length: 26 }, () => {
    const d = add(scene, new THREE.SphereGeometry(0.16, 16, 12), tearMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    d.visible = false;
    return d;
  });
  const gasMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xb8ff6a, transparent: true, depthWrite: false });
  const gas = Array.from({ length: 30 }, () => {
    const s = new THREE.Sprite(gasMat.clone());
    s.visible = false;
    scene.add(s);
    return s;
  });
  const redMat = new THREE.MeshBasicMaterial({ color: 0xff5a6a, transparent: true, opacity: 0, depthWrite: false });
  const red = add(eye, new THREE.SphereGeometry(EYE_R * 1.002, 48, 32), redMat, [0, 0, 0], [0, 0, 0], [1.25, 1, 0.8], false);
  red.renderOrder = 3;
  return { scene, sky, eye, iris, lidU, lidL, gland, tears, gas, redMat, scleraMat };
}
