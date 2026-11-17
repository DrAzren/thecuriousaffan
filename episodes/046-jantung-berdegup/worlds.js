// Episode 046 sets:
//  - the Episode 044 playground (Episode 036 playground, trees cleared in front
//    of Affan), on a normal sunny day, plus a tiny heart that floats beside
//    Affan's fist;
//  - the "badan" (body) stage: a big friendly heart that beats, with red blood
//    tubes up to the brain, out to an arm muscle and down to a foot; red blood
//    cells carry blue oxygen and yellow food bubbles along the tubes;
//  - the valves: a cut-away heart tube with two pairs of flaps (injap) that
//    open to let blood through and snap shut ("dup!", "dap!");
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, glow, glowTex } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildPark, A_PK, PLAY_SCALE } from '../044-salji-malaysia/worlds.js';

export { buildOutro, buildPark, A_PK, PLAY_SCALE };

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
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.3, 0.7, vP.y)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}
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

// a cute heart (unit height ~2), faces +z; pulse(k) squeezes it
export function makeHeart(withFace = true) {
  const outer = new THREE.Group();
  const g = new THREE.Group();
  outer.add(g);
  const s = new THREE.Shape();
  s.moveTo(0, -1.0);
  s.bezierCurveTo(-0.3, -0.7, -1.1, -0.2, -1.05, 0.35);
  s.bezierCurveTo(-1.0, 0.95, -0.25, 1.15, 0, 0.6);
  s.bezierCurveTo(0.25, 1.15, 1.0, 0.95, 1.05, 0.35);
  s.bezierCurveTo(1.1, -0.2, 0.3, -0.7, 0, -1.0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.3, bevelSegments: 8, curveSegments: 32 });
  geo.translate(0, 0, -0.25);
  const body = add(g, geo, std(0xe8384a, 0.4, { emissive: 0x6a0810, emissiveIntensity: 0.35 }), [0, 0, 0]);
  if (withFace) {
    for (const sd of [-1, 1]) {
      add(g, new THREE.SphereGeometry(0.17, 16, 12), std(0xffffff, 0.3), [0.36 * sd, 0.3, 0.62], [0, 0, 0], [1, 1.15, 0.6], false);
      add(g, new THREE.SphereGeometry(0.09, 12, 10), new THREE.MeshBasicMaterial({ color: 0x101010 }), [0.37 * sd, 0.3, 0.72], [0, 0, 0], [1, 1, 1], false);
      add(g, new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0.4 * sd, 0.35, 0.79], [0, 0, 0], [1, 1, 1], false);
      add(g, new THREE.SphereGeometry(0.1, 10, 8), std(0xff8a9a, 0.6), [0.62 * sd, 0.05, 0.56], [0, 0, 0], [1, 0.6, 0.4], false);
    }
    add(g, new THREE.TorusGeometry(0.16, 0.035, 8, 16, Math.PI), new THREE.MeshBasicMaterial({ color: 0x3a0a10 }), [0, 0.02, 0.68], [0, 0, Math.PI], [1, 1, 1], false);
  }
  // big vessels on top
  add(g, new THREE.CylinderGeometry(0.16, 0.2, 0.7, 14), std(0xd8384a, 0.5), [-0.3, 0.95, -0.1], [0, 0, 0.3]);
  add(g, new THREE.CylinderGeometry(0.14, 0.18, 0.6, 14), std(0x5a6ad8, 0.5), [0.35, 0.95, -0.15], [0, 0, -0.35]);
  const pulse = (k) => g.scale.set(1 + 0.08 * k, 1 - 0.06 * k, 1 + 0.08 * k);
  return { g: outer, body, pulse };
}
// beat shape: two quick squeezes per beat (dup-dap)
export function beat(t, bpm = 80) {
  const ph = (t * bpm / 60) % 1;
  return Math.exp(-(((ph - 0.05) / 0.05) ** 2)) + 0.7 * Math.exp(-(((ph - 0.28) / 0.05) ** 2));
}

// ---------------------------------------------------------- the body stage
export const HEART = V3(0, 4.6, 0);
export const SPOTS = { otak: V3(0, 9.0, -0.4), otot: V3(3.0, 5.6, -0.3), kaki: V3(0.6, 0.4, -0.2) };
export function buildBody() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0xffd0dc, 0xff9aae);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa05060, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(3, 8, 10);
  scene.add(key);
  const R = rng(46);
  for (let i = 0; i < 14; i++) {
    const b = glow([0xffffff, 0xffe0e8, 0xffc0d0][i % 3], 2 + R() * 3, 0.35);
    b.position.set((R() - 0.5) * 18, R() * 14 - 2, -10 - R() * 6);
    scene.add(b);
  }
  const heart = makeHeart();
  heart.g.position.copy(HEART);
  heart.g.scale.setScalar(1.25);
  scene.add(heart.g);
  // brain, arm muscle, foot
  const brain = add(scene, lumpy(1.3, 0.9, 1.0, 9), std(0xff9ec4, 0.5, { emissive: 0x5a1030, emissiveIntensity: 0.2 }), SPOTS.otak.toArray());
  const muscle = new THREE.Group();
  muscle.position.copy(SPOTS.otot);
  muscle.rotation.z = 0.3;
  scene.add(muscle);
  add(muscle, new THREE.CapsuleGeometry(0.55, 1.1, 10, 20), std(0xc8505a, 0.6, { emissive: 0x3a0a10, emissiveIntensity: 0.2 }), [0, 0, 0]);
  for (let i = 0; i < 5; i++) add(muscle, new THREE.TorusGeometry(0.56, 0.02, 6, 24), std(0xe87a80, 0.6), [0, -0.5 + i * 0.25, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  const foot = new THREE.Group();
  foot.position.copy(SPOTS.kaki);
  scene.add(foot);
  const skin = std(0xe8a57c, 0.55, { emissive: 0x3a1608, emissiveIntensity: 0.18 });
  add(foot, new RoundedBoxGeometry(1.0, 0.5, 1.8, 4, 0.22), skin, [0, 0, 0.3]);
  for (let i = 0; i < 5; i++) add(foot, new THREE.SphereGeometry(0.12 - i * 0.012, 12, 10), skin, [-0.36 + i * 0.18, 0.05, 1.25 - Math.abs(i - 1) * 0.04]);
  // tubes from the heart to each spot (curves)
  const curves = {
    otak: new THREE.CatmullRomCurve3([HEART.clone().add(V3(-0.3, 1.2, 0)), V3(-0.5, 6.8, 0.2), SPOTS.otak.clone().add(V3(0, -0.8, 0.3))]),
    otot: new THREE.CatmullRomCurve3([HEART.clone().add(V3(0.9, 0.6, 0)), V3(2.0, 5.6, 0.2), SPOTS.otot.clone().add(V3(-0.6, -0.4, 0.2))]),
    kaki: new THREE.CatmullRomCurve3([HEART.clone().add(V3(0.1, -1.2, 0)), V3(0.6, 2.6, 0.3), SPOTS.kaki.clone().add(V3(0, 0.3, 0.2))]),
  };
  const tubeMat = new THREE.MeshPhysicalMaterial({ color: 0xff5a6a, roughness: 0.2, transparent: true, opacity: 0.35, clearcoat: 1, depthWrite: false });
  Object.values(curves).forEach((c) => {
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, 60, 0.32, 16), tubeMat);
    m.renderOrder = 4;
    scene.add(m);
  });
  // red blood cells (biconcave discs) carrying oxygen (blue) or food (yellow)
  const cellGeo = new THREE.TorusGeometry(0.16, 0.1, 10, 20);
  const cellMat = std(0xd8202e, 0.45, { emissive: 0x5a0008, emissiveIntensity: 0.35 });
  const cells = Array.from({ length: 36 }, (_, i) => {
    const g = new THREE.Group();
    add(g, cellGeo, cellMat, [0, 0, 0], [0, 0, 0], [1, 1, 0.7], false);
    add(g, new THREE.CylinderGeometry(0.1, 0.1, 0.06, 16), cellMat, [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
    const load = add(g, new THREE.SphereGeometry(0.1, 12, 10), std(i % 3 === 2 ? 0xffd23a : 0x4ab8ff, 0.3, { emissive: i % 3 === 2 ? 0x6a5000 : 0x0a3a8a, emissiveIntensity: 0.6 }), [0, 0.2, 0.08], [0, 0, 0], [1, 1, 1], false);
    g.visible = false;
    scene.add(g);
    return { g, load };
  });
  const aff = makeAffan();
  aff.root.scale.setScalar(0.42);
  aff.root.position.set(-2.4, 2.6, 0.6);
  scene.add(aff.root);
  // a little platform for Affan
  add(scene, new THREE.CylinderGeometry(0.8, 0.9, 0.2, 24), std(0xffffff, 0.6), [-2.4, 2.5, 0.6]);
  return { scene, sky, heart, brain, muscle, foot, curves, cells, aff };
}

// ---------------------------------------------------------- the valves
export const VALVES = [V3(0, 2.0, 0), V3(0, 5.6, 0)];
export function buildValves() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x6a1020, 0x2a0610);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffe0e8, 0x501020, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(2, 6, 10);
  scene.add(key);
  const fill = new THREE.PointLight(0xff8090, 30, 30, 1.5);
  fill.position.set(0, 4, 5);
  scene.add(fill);
  // cut-away tube (back half), pink inside
  const wall = add(scene, new THREE.CylinderGeometry(1.6, 1.6, 9, 48, 1, true, Math.PI / 2, Math.PI), std(0xf07a8a, 0.55, { side: THREE.DoubleSide, emissive: 0x5a1020, emissiveIntensity: 0.3 }), [0, 3.8, 0]);
  void wall;
  for (const y of [-0.6, 8.2]) add(scene, new THREE.TorusGeometry(1.6, 0.12, 10, 48, Math.PI), std(0xd84a5a, 0.5), [0, y, 0], [Math.PI / 2, 0, Math.PI]);
  // valves: two flaps each, hinged at the side walls
  const flapMat = std(0xffd0d8, 0.4, { emissive: 0x6a2030, emissiveIntensity: 0.25, side: THREE.DoubleSide });
  const valves = VALVES.map((p) => {
    const flaps = [-1, 1].map((sd) => {
      const pv = new THREE.Group();
      pv.position.set(1.5 * sd, p.y, 0.3);
      scene.add(pv);
      add(pv, new RoundedBoxGeometry(1.5, 0.08, 1.4, 2, 0.03), flapMat, [-0.75 * sd, 0, 0]);
      return { pv, sd };
    });
    add(scene, new THREE.TorusGeometry(1.55, 0.08, 8, 48, Math.PI), std(0xd84a5a, 0.5), [0, p.y, 0], [Math.PI / 2, 0, Math.PI]);
    return { p, flaps };
  });
  const cellGeo = new THREE.TorusGeometry(0.2, 0.12, 10, 20);
  const cellMat = std(0xd8202e, 0.45, { emissive: 0x5a0008, emissiveIntensity: 0.35 });
  const cells = Array.from({ length: 26 }, () => {
    const g = new THREE.Group();
    add(g, cellGeo, cellMat, [0, 0, 0], [0, 0, 0], [1, 1, 0.7], false);
    add(g, new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16), cellMat, [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
    g.visible = false;
    scene.add(g);
    return g;
  });
  return { scene, sky, valves, cells };
}
