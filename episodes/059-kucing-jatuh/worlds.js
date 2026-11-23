// Episode 059 sets:
//  - the Episode 031 living room with a tall wooden cupboard (almari) and a
//    ginger kampung cat that jumps down and lands on its feet;
//  - the "slow-motion" stage: a big cat that can be turned upside down and
//    rights itself (head first, then front body, then back body), with a
//    glowing inner ear, wind streaks for falling, a soft floor to land on and
//    two small floating collarbones;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { add, glow, glowTex } from '../../shared/props.js';
import { makeCat, BREEDS } from '../../shared/cat.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildLivingRoom } from '../031-geletek-diri-sendiri/worlds.js';

export { buildOutro };

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

// the cat's leg groups (the rig keeps them on the root)
export const catLegs = (cat) => cat.root.children.filter((c) => c.userData && c.userData.paw);

// ------------------------------------------------------------ living room
export const A_LR = V3(0.9, 0, 0.9);
export const ALMARI = V3(4.3, 0, -2.3);
export const ALMARI_TOP = 3.3;
export function buildRoom59() {
  const r = buildLivingRoom();
  r.kak.root.visible = false;
  const s = r.scene;
  const wood = std(0xa8703e, 0.6), woodD = std(0x8a5630, 0.6);
  const alm = new THREE.Group();
  alm.position.copy(ALMARI);
  s.add(alm);
  add(alm, new RoundedBoxGeometry(1.8, ALMARI_TOP, 1.0, 3, 0.06), wood, [0, ALMARI_TOP / 2, 0]);
  for (const x of [-0.44, 0.44]) {
    add(alm, new RoundedBoxGeometry(0.84, ALMARI_TOP - 0.3, 0.06, 2, 0.02), woodD, [x, ALMARI_TOP / 2 + 0.05, 0.51]);
    add(alm, new THREE.SphereGeometry(0.05, 10, 8), std(0xffd27a, 0.3, { metalness: 0.6 }), [x * 0.15, ALMARI_TOP / 2, 0.56]);
  }
  const cat = makeCat(BREEDS.kampung, { seed: 59 });
  s.add(cat.root);
  return { ...r, cat, alm };
}

// --------------------------------------------------------- slow-mo stage
export const CAT_AT = V3(0, 1.6, 0);
export const FLOOR_Y = -2.6;
export const CLAV_AT = V3(30, 0, 0);
export function buildStage59() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x5aa8ff, 0x1a3a8a);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a4a7a, 1.4));
  const key = new THREE.DirectionalLight(0xfff4e6, 1.6);
  key.position.set(5, 9, 8);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.6);
  fill.position.set(-6, 2, 4);
  scene.add(fill);
  // a soft cushion floor to land on
  const floor = add(scene, new THREE.CylinderGeometry(5, 5, 0.3, 48), std(0xffc866, 0.9), [0, FLOOR_Y - 0.15, 0], [0, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.TorusGeometry(5, 0.16, 10, 48), std(0xff8a5c, 0.8), [0, FLOOR_Y, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  // the big cat
  const cat = makeCat(BREEDS.kampung, { seed: 59 });
  cat.root.scale.setScalar(2.6);
  scene.add(cat.root);
  // glow on the inner ear and highlights for head / front / back
  const earGlow = glow(0xa0f0ff, 1.6, 0.0);
  scene.add(earGlow);
  const hiGlow = glow(0xfff0a0, 3.2, 0.0);
  scene.add(hiGlow);
  // wind streaks (rising lines = falling)
  const streakMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
  const streaks = Array.from({ length: 22 }, (_, i) => {
    const m = add(scene, new THREE.BoxGeometry(0.035, 1.4, 0.035), streakMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    m.userData = { x: (((i * 37) % 22) / 22 - 0.5) * 9, z: (((i * 13) % 22) / 22 - 0.5) * 4 - 1, ph: i / 22 };
    return m;
  });
  // collarbones demo: a second cat facing the camera, with two small glowing bones
  const cat2 = makeCat(BREEDS.kampung, { seed: 59 });
  cat2.root.scale.setScalar(2.6);
  cat2.root.position.copy(CLAV_AT);
  scene.add(cat2.root);
  const boneM = std(0xfffbe8, 0.3, { emissive: 0xffe9a0, emissiveIntensity: 0.9 });
  const bones = [-1, 1].map((s) => add(scene, new THREE.CapsuleGeometry(0.06, 0.32, 6, 10), boneM, [CLAV_AT.x + s * 0.42, CLAV_AT.y + 1.45, CLAV_AT.z + 1.0], [0, 0, s * 1.2], [1, 1, 1], false));
  const boneGlow = glow(0xfff0a0, 2.4, 0.0);
  boneGlow.position.set(CLAV_AT.x, CLAV_AT.y + 1.45, CLAV_AT.z + 1.1);
  scene.add(boneGlow);
  return { scene, sky, cat, legs: catLegs(cat), earGlow, hiGlow, streaks, floor, cat2, bones, boneGlow };
}
