// Episode 035 sets:
//  - the Episode 031 living room: a broken biscuit on the floor, a line of
//    small ants marching from a crack in the skirting board to the biscuit
//    and back, a magnifying glass, and a biscuit jar with a lid;
//  - the "dunia semut" (ant world) imagination world: Affan shrunk to ant
//    size on giant wooden floorboards, the nest in a crack of a giant skirting
//    board, a giant biscuit crumb, friendly big-eyed ants with walking legs
//    and twitching antennae, and a glowing purple scent trail that is laid,
//    grows stronger with every ant, then fades;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, glow, glowTex } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildLivingRoom } from '../031-geletek-diri-sendiri/worlds.js';

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

// a rod (cylinder) between two points, added to parent
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _u = new THREE.Vector3(0, 1, 0);
function rod(parent, p0, p1, r, mat) {
  _a.fromArray(p0);
  _b.fromArray(p1);
  const len = _a.distanceTo(_b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, len, 8), mat);
  m.position.copy(_a).add(_b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(_u, _b.clone().sub(_a).normalize());
  parent.add(m);
  return m;
}

// ------------------------------------------------------------------ the ant
// Friendly cartoon ant, length ~1 along +z, standing on y = 0.
const ANT_BODY = std(0x4a2316, 0.35, { emissive: 0x1a0805, emissiveIntensity: 0.4 });
const ANT_LEG = std(0x3a1a10, 0.5);
const EYE_W = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
const EYE_B = new THREE.MeshBasicMaterial({ color: 0x120806 });
const CRUMB = std(0xe0a85a, 0.8);
export function makeAnt({ eyes = true, shadow = true } = {}) {
  const ant = new THREE.Group();
  const body = new THREE.Group();
  ant.add(body);
  add(body, new THREE.SphereGeometry(0.22, 20, 14), ANT_BODY, [0, 0.3, -0.33], [0.15, 0, 0], [1, 0.85, 1.35]);
  add(body, new THREE.SphereGeometry(0.06, 10, 8), ANT_BODY, [0, 0.27, -0.09]);
  add(body, new THREE.SphereGeometry(0.11, 16, 12), ANT_BODY, [0, 0.29, 0.06], [0, 0, 0], [1, 0.9, 1.6]);
  const head = new THREE.Group();
  head.position.set(0, 0.33, 0.3);
  body.add(head);
  add(head, new THREE.SphereGeometry(0.15, 20, 14), ANT_BODY, [0, 0, 0], [0, 0, 0], [1, 0.95, 1.05]);
  if (eyes) {
    for (const s of [-1, 1]) {
      add(head, new THREE.SphereGeometry(0.062, 14, 10), EYE_W, [0.085 * s, 0.05, 0.1], [0, 0, 0], [1, 1.1, 0.8], false);
      add(head, new THREE.SphereGeometry(0.034, 10, 8), EYE_B, [0.095 * s, 0.055, 0.145], [0, 0, 0], [1, 1, 1], false);
    }
  }
  for (const s of [-1, 1]) add(head, new THREE.ConeGeometry(0.03, 0.12, 8), ANT_LEG, [0.05 * s, -0.08, 0.14], [1.9, 0, -0.5 * s]);
  // antennae: base pivot -> elbow pivot
  const antennae = [];
  for (const s of [-1, 1]) {
    const base = new THREE.Group();
    base.position.set(0.055 * s, 0.11, 0.08);
    head.add(base);
    rod(base, [0, 0, 0], [0.06 * s, 0.2, 0.04], 0.014, ANT_LEG);
    const elbow = new THREE.Group();
    elbow.position.set(0.06 * s, 0.2, 0.04);
    base.add(elbow);
    rod(elbow, [0, 0, 0], [0.04 * s, -0.02, 0.22], 0.012, ANT_LEG);
    add(elbow, new THREE.SphereGeometry(0.022, 8, 6), ANT_LEG, [0.04 * s, -0.02, 0.22]);
    antennae.push({ base, elbow, s });
  }
  // legs: 3 per side from the thorax
  const legs = [];
  [0.14, 0.06, -0.03].forEach((z, k) => {
    for (const s of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(0.07 * s, 0.27, z);
      body.add(hip);
      const fz = (1 - k) * 0.07;
      rod(hip, [0, 0, 0], [0.2 * s, 0.07, fz], 0.016, ANT_LEG);
      rod(hip, [0.2 * s, 0.07, fz], [0.32 * s, -0.27, fz * 1.6], 0.013, ANT_LEG);
      legs.push({ hip, s, k, ph: (k % 2 === 0) === (s > 0) ? 0 : Math.PI });
    }
  });
  // a crumb carried in the mandibles
  const carry = add(head, new RoundedBoxGeometry(0.16, 0.12, 0.14, 2, 0.04), CRUMB, [0, -0.06, 0.24], [0.3, 0.4, 0.1]);
  carry.visible = false;
  ant.traverse((o) => {
    if (o.isMesh) o.castShadow = o.receiveShadow = shadow;
  });
  // phase: walking cycle (radians); sniff 0..1 points the antennae down
  ant.userData.update = (phase, t = 0, { sniff = 0, walk = 1, carrying = false, seed = 0 } = {}) => {
    for (const l of legs) {
      const p = phase + l.ph;
      l.hip.rotation.set(0, 0.4 * Math.sin(p) * walk * l.s, -0.18 * Math.max(0, Math.cos(p)) * walk * l.s);
    }
    body.position.y = 0.012 * Math.abs(Math.sin(phase)) * walk;
    for (const a of antennae) {
      const w = Math.sin(t * 7 + seed + a.s) * 0.25 + Math.sin(t * 13 + seed * 2) * 0.1;
      a.base.rotation.set(0.15 + 0.9 * sniff + w * (1 - 0.5 * sniff), 0.15 * a.s * Math.sin(t * 5 + seed), 0);
      a.elbow.rotation.set(0.5 * sniff + 0.2 * Math.sin(t * 9 + seed + a.s), 0, 0);
    }
    head.rotation.x = 0.25 * sniff;
    carry.visible = carrying;
  };
  ant.userData.update(0);
  return ant;
}

// ------------------------------------------------------------- living room
export const CRACK = new THREE.Vector3(-7.45, 0, 0.9);
export const BISCUIT = new THREE.Vector3(0.0, 0, 1.35);
export const A_ROOM = new THREE.Vector3(0.95, 0, 0.05);
export const N_ROOM_ANTS = 56;
export const ROOM_ANT_SCALE = 0.13;

export function buildRoom() {
  const w = buildLivingRoom();
  w.kak.root.visible = false;
  const s = w.scene;
  // crack in the skirting board (the ants' door)
  const crack = new THREE.Shape();
  crack.moveTo(-0.16, 0);
  crack.quadraticCurveTo(-0.12, 0.2, 0, 0.26);
  crack.quadraticCurveTo(0.12, 0.2, 0.16, 0);
  crack.lineTo(-0.16, 0);
  add(s, new THREE.ShapeGeometry(crack), new THREE.MeshBasicMaterial({ color: 0x1a120c }), [-7.49, 0.0, CRACK.z], [0, Math.PI / 2, 0], [1.6, 1.6, 1.6], false);
  // ant path from the crack to the biscuit (along the floor, over the rug)
  const path = new THREE.CatmullRomCurve3([
    CRACK.clone().add(new THREE.Vector3(0.05, 0.003, 0)),
    new THREE.Vector3(-5.6, 0.003, 1.5),
    new THREE.Vector3(-3.6, 0.02, 0.85),
    new THREE.Vector3(-1.9, 0.02, 1.6),
    new THREE.Vector3(-0.8, 0.02, 1.2),
    BISCUIT.clone().add(new THREE.Vector3(-0.36, 0.02, -0.02)),
  ]);
  const ants = Array.from({ length: N_ROOM_ANTS }, () => {
    const a = makeAnt({ eyes: false, shadow: false });
    a.scale.setScalar(ROOM_ANT_SCALE);
    s.add(a);
    return a;
  });
  // faint "magic" trail under the ants for the payoff shot
  const trail = makeTrail(path, 0.07, 0x9a6cff);
  trail.mesh.position.y = 0.012;
  s.add(trail.mesh);
  // broken biscuit with chocolate chips, plus crumbs
  const biscuit = new THREE.Group();
  biscuit.position.copy(BISCUIT);
  s.add(biscuit);
  const bmat = std(0xd9a35c, 0.85, { emissive: 0x3a1a06, emissiveIntensity: 0.15 });
  const chip = std(0x4a2a1a, 0.6);
  add(biscuit, new THREE.CylinderGeometry(0.34, 0.34, 0.09, 32, 1, false, 0.5, Math.PI * 1.55), bmat, [0, 0.045, 0]);
  const R = rng(5);
  for (let i = 0; i < 9; i++) {
    const a = 0.6 + R() * Math.PI * 1.45, r = 0.08 + R() * 0.22;
    add(biscuit, new THREE.SphereGeometry(0.03, 8, 6), chip, [Math.sin(a) * r, 0.09, Math.cos(a) * r], [0, 0, 0], [1, 0.6, 1]);
  }
  const crumbs = [];
  for (let i = 0; i < 7; i++) {
    const c = add(s, new RoundedBoxGeometry(0.05, 0.035, 0.045, 1, 0.01), bmat, [BISCUIT.x - 0.32 + R() * 0.25, 0.018, BISCUIT.z - 0.15 + R() * 0.3], [0, R() * 3, 0]);
    crumbs.push(c);
  }
  // magnifying glass (handle along local -y, lens facing local +z)
  const mag = new THREE.Group();
  s.add(mag);
  add(mag, new THREE.CylinderGeometry(0.045, 0.05, 0.42, 12), std(0xffc928, 0.4), [0, -0.38, 0]);
  add(mag, new THREE.TorusGeometry(0.2, 0.035, 10, 32), std(0x2c3f8a, 0.35), [0, 0, 0]);
  const lens = add(mag, new THREE.CircleGeometry(0.19, 32), new THREE.MeshPhysicalMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.25, roughness: 0.05 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  lens.material.side = THREE.DoubleSide;
  // biscuit jar with a lid
  const jar = new THREE.Group();
  s.add(jar);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.35, roughness: 0.08, side: THREE.DoubleSide, depthWrite: false });
  add(jar, new THREE.CylinderGeometry(0.42, 0.42, 0.75, 32, 1, true), glass, [0, 0.375, 0], [0, 0, 0], [1, 1, 1], false);
  add(jar, new THREE.CircleGeometry(0.42, 32), glass, [0, 0.005, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  const lid = new THREE.Group();
  jar.add(lid);
  add(lid, new THREE.CylinderGeometry(0.46, 0.46, 0.1, 32), std(0xff5a5a, 0.4), [0, 0, 0]);
  add(lid, new THREE.SphereGeometry(0.08, 16, 10), std(0xffd84a, 0.4), [0, 0.08, 0]);
  return { ...w, path, ants, trail, biscuit, crumbs, mag, jar, lid };
}

// ------------------------------------------------------------ scent trail
// A flat ribbon along a curve. 'reveal' shows it from the food end back to the
// nest end (that is how the scout lays it); 'strength' sets brightness and width.
export function makeTrail(curve, width, color) {
  const N = 220;
  const pos = [], along = [], side = [], idx = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const p = curve.getPointAt(u), tg = curve.getTangentAt(u);
    const nrm = new THREE.Vector3().crossVectors(up, tg).normalize();
    for (const sd of [-1, 1]) {
      const q = p.clone().addScaledVector(nrm, sd * width);
      pos.push(q.x, q.y, q.z);
      along.push(u);
      side.push(sd);
    }
    if (i < N) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
  g.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { reveal: { value: 0 }, strength: { value: 0 }, time: { value: 0 }, color: { value: new THREE.Color(color) } },
    vertexShader: `attribute float aAlong; attribute float aSide; varying float vA; varying float vS;
      void main(){ vA = aAlong; vS = aSide; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float reveal, strength, time; uniform vec3 color; varying float vA; varying float vS;
      void main(){
        float shown = smoothstep(1.0 - reveal - 0.02, 1.0 - reveal + 0.02, vA);
        float core = 1.0 - smoothstep(0.15 + 0.55 * strength, 1.0, abs(vS));
        float pulse = 0.75 + 0.25 * sin(vA * 60.0 - time * 4.0);
        float a = shown * core * pulse * clamp(strength, 0.0, 1.0);
        gl_FragColor = vec4(color * (1.0 + 0.6 * strength), a * 0.85);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.renderOrder = 2;
  return {
    mesh,
    set(reveal, strength, time) {
      mat.uniforms.reveal.value = reveal;
      mat.uniforms.strength.value = strength;
      mat.uniforms.time.value = time;
      mesh.visible = strength > 0.005 && reveal > 0.001;
    },
  };
}

// ---------------------------------------------------------------- ant world
export const NEST = new THREE.Vector3(-8, 0, -16.6);
export const FOOD = new THREE.Vector3(9, 0, 6);
export const N_WORLD_ANTS = 26;
export const WORLD_ANT_SCALE = 1.35;
export const MINI = 0.42; // tiny Affan scale

function warmSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(0xffe9c8) }, bot: { value: new THREE.Color(0xf6c9a0) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, bot; varying vec3 vP;
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.05, 0.5, vP.y)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}

export function buildAntWorld() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf6d2aa, 40, 120);
  const sky = warmSky();
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xfff4e4, 0x8a5a3a, 1.25));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.4);
  key.position.set(14, 30, 18);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera;
  sc.left = -26;
  sc.right = 26;
  sc.top = 26;
  sc.bottom = -26;
  sc.near = 1;
  sc.far = 90;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.03;
  scene.add(key, key.target);

  // giant floorboards
  const planks = canvasTex(1024, 1024, (g, w) => {
    const R = rng(3);
    const n = 4;
    for (let i = 0; i < n; i++) {
      const v = R();
      g.fillStyle = `rgb(${196 + v * 22},${142 + v * 18},${92 + v * 14})`;
      g.fillRect(0, (i * w) / n, w, w / n);
      g.strokeStyle = 'rgba(120,70,35,0.25)';
      g.lineWidth = 3;
      for (let k = 0; k < 9; k++) {
        const y = (i * w) / n + 12 + R() * (w / n - 24);
        g.beginPath();
        g.moveTo(0, y);
        for (let x = 0; x <= w; x += 64) g.lineTo(x, y + Math.sin(x * 0.01 + k) * 6);
        g.stroke();
      }
      g.fillStyle = 'rgba(70,38,18,0.75)';
      g.fillRect(0, (i * w) / n - 4, w, 8);
    }
  }, [6, 6]);
  const floor = add(scene, new THREE.PlaneGeometry(160, 160), std(0xffffff, 0.75, { map: planks }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  floor.receiveShadow = true;

  // giant skirting board + wall with the crack (nest door)
  const wallZ = NEST.z - 0.6;
  add(scene, new THREE.BoxGeometry(160, 6, 1.2), std(0xfdfaf2, 0.6), [0, 3, wallZ - 0.6]).receiveShadow = true;
  add(scene, new THREE.PlaneGeometry(160, 60), std(0xf4e2c4, 0.95), [0, 30, wallZ - 1.25], [0, 0, 0], [1, 1, 1], false);
  const crack = new THREE.Shape();
  crack.moveTo(-1.9, 0);
  crack.quadraticCurveTo(-1.6, 2.4, -0.2, 3.1);
  crack.quadraticCurveTo(0.3, 2.2, 0.9, 2.6);
  crack.quadraticCurveTo(1.6, 1.4, 1.9, 0);
  crack.lineTo(-1.9, 0);
  add(scene, new THREE.ShapeGeometry(crack), new THREE.MeshBasicMaterial({ color: 0x1a0f08 }), [NEST.x, 0.01, wallZ + 0.02], [0, 0, 0], [1, 1, 1], false);
  // a little dirt mound at the door
  const R = rng(17);
  for (let i = 0; i < 14; i++) add(scene, new THREE.SphereGeometry(0.25 + R() * 0.3, 8, 6), std(0x8a5a36, 0.95), [NEST.x + (R() - 0.5) * 3.6, 0.05, wallZ + 0.6 + R() * 1.2], [0, 0, 0], [1, 0.45, 1]);

  // giant biscuit crumb with chocolate chips
  const food = new THREE.Group();
  food.position.copy(FOOD);
  scene.add(food);
  const fg = new THREE.IcosahedronGeometry(2.4, 2);
  const p = fg.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    const n = 1 + 0.12 * Math.sin(v.x * 2.1 + v.z * 1.3) + 0.08 * Math.sin(v.y * 3.7 + v.x);
    v.multiplyScalar(n);
    v.y *= 0.7;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  fg.computeVertexNormals();
  const crumbMat = std(0xe2a85c, 0.85, { emissive: 0x4a2208, emissiveIntensity: 0.15, flatShading: true });
  const lump = add(food, fg, crumbMat, [0, 1.1, 0]);
  for (let i = 0; i < 10; i++) {
    const a = R() * Math.PI * 2, e = R() * 0.9;
    add(lump, new THREE.SphereGeometry(0.28, 10, 8), std(0x4a2a1a, 0.6), [Math.cos(a) * 2.2 * Math.cos(e), 1.4 * Math.sin(e), Math.sin(a) * 2.2 * Math.cos(e)], [0, 0, 0], [1, 0.7, 1]);
  }
  const bits = [];
  for (let i = 0; i < 9; i++) {
    const b = add(scene, new RoundedBoxGeometry(0.5, 0.35, 0.45, 2, 0.1), crumbMat, [FOOD.x + (R() - 0.5) * 7, 0.17, FOOD.z + (R() - 0.5) * 6], [0, R() * 3, 0]);
    bits.push(b);
  }

  // the trail (smooth) and the scout's wandering search path
  const trailCurve = new THREE.CatmullRomCurve3([
    NEST.clone().add(new THREE.Vector3(0, 0.03, 0.4)),
    new THREE.Vector3(-6.5, 0.03, -10.5),
    new THREE.Vector3(-2.5, 0.03, -5.5),
    new THREE.Vector3(2.5, 0.03, -0.5),
    new THREE.Vector3(6.8, 0.03, 3.4),
    FOOD.clone().add(new THREE.Vector3(-2.3, 0.03, -1.2)),
  ]);
  const searchCurve = new THREE.CatmullRomCurve3([
    NEST.clone().add(new THREE.Vector3(0, 0, 0.4)),
    new THREE.Vector3(-4.5, 0, -13.5),
    new THREE.Vector3(-10, 0, -9.5),
    new THREE.Vector3(-5, 0, -6),
    new THREE.Vector3(0.5, 0, -9),
    new THREE.Vector3(3.5, 0, -3.5),
    new THREE.Vector3(-0.5, 0, 0.5),
    new THREE.Vector3(4.5, 0, 2.5),
    FOOD.clone().add(new THREE.Vector3(-2.3, 0, -1.2)),
  ]);
  const trail = makeTrail(trailCurve, 0.75, 0xa070ff);
  scene.add(trail.mesh);
  // rising scent wisps along the trail
  const wispMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xb48cff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const wisps = Array.from({ length: 70 }, () => {
    const s = new THREE.Sprite(wispMat.clone());
    s.visible = false;
    scene.add(s);
    return s;
  });

  const ants = Array.from({ length: N_WORLD_ANTS }, () => {
    const a = makeAnt();
    a.scale.setScalar(WORLD_ANT_SCALE);
    scene.add(a);
    return a;
  });
  const aff = makeAffan();
  aff.root.scale.setScalar(MINI);
  scene.add(aff.root);
  return { scene, sky, key, floor, food, lump, bits, trail, trailCurve, searchCurve, wisps, ants, aff };
}
