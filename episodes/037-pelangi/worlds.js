// Episode 037 sets:
//  - the Episode 036 playground just after rain: a low afternoon sun behind
//    the camera, grey rain clouds ahead, puddles, last raindrops, and a real
//    rainbow: a ring centred on the anti-solar point at 42°, placed relative
//    to the camera every frame (so the ground hides its lower half); plus a
//    garden hose with spray mist and a small rainbow in the mist;
//  - the "makmal cahaya" (light lab) imagination world: a smiling Sun, a white
//    beam, a glass prism that splits it into six colours on a white screen,
//    and a giant raindrop whose light paths are computed with real refraction
//    and reflection (dispersion exaggerated so the colours separate clearly);
//  - the "padang" (field) diagram: Affan with the Sun behind him, his shadow
//    pointing to the anti-solar point, a 42° cone of sight lines to a full
//    rainbow ring, and a ground that can fade to show the whole circle;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeSky, makeStars, glow, glowTex } from '../../shared/props.js';
import { buildOutro } from '../005-bulan-ikut-kereta/worlds.js';
import { buildPlayground, PLAY_SCALE } from '../036-pening-berpusing/worlds.js';

export { buildOutro, PLAY_SCALE };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

export const COLORS = [0xff4a4a, 0xff9a2a, 0xffe03a, 0x4fd85a, 0x3a8cff, 0xa05aff]; // merah..ungu
export const RAIN_ANGLE = (42 * Math.PI) / 180;
const RAIN_INNER = Math.tan((39.5 * Math.PI) / 180) / Math.tan(RAIN_ANGLE);

// A rainbow ring of unit outer radius in its local xy plane (red outside,
// violet inside). Uniform 'op' fades it; 'arcMask' limits it to an arc.
export function makeRainbow({ inner = RAIN_INNER, op = 0.75 } = {}) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
    uniforms: { op: { value: op }, inner: { value: inner }, a0: { value: -10 }, a1: { value: 10 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float op, inner, a0, a1; varying vec2 vP;
      vec3 band(float t){
        vec3 c[6]; c[0]=vec3(0.63,0.35,1.0); c[1]=vec3(0.23,0.55,1.0); c[2]=vec3(0.31,0.85,0.35);
        c[3]=vec3(1.0,0.88,0.23); c[4]=vec3(1.0,0.6,0.16); c[5]=vec3(1.0,0.29,0.29);
        float x = clamp(t, 0.0, 0.999) * 5.0; int i = int(floor(x)); float f = fract(x);
        vec3 a = c[0], b = c[1];
        for (int k = 0; k < 5; k++) { if (k == i) { a = c[k]; b = c[k + 1]; } }
        return mix(a, b, smoothstep(0.0, 1.0, f));
      }
      void main(){
        float r = length(vP);
        float t = (r - inner) / (1.0 - inner);
        float ang = atan(vP.y, vP.x);
        float edge = smoothstep(0.0, 0.12, t) * smoothstep(1.0, 0.88, t);
        float arc = smoothstep(a0 - 0.08, a0 + 0.08, ang) * smoothstep(a1 + 0.08, a1 - 0.08, ang);
        if (t < 0.0 || t > 1.0) discard;
        gl_FragColor = vec4(band(t), op * edge * arc);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.RingGeometry(inner * 0.98, 1.0, 256, 2), mat);
  m.renderOrder = 5;
  m.userData.mat = mat;
  return m;
}
// put a rainbow at distance D from an eye, centred on the anti-solar point
const _a = new THREE.Vector3();
export function placeRainbow(rb, eye, sunDir, D) {
  _a.copy(sunDir).normalize().negate();
  rb.position.copy(eye).addScaledVector(_a, D);
  rb.lookAt(eye);
  rb.scale.setScalar(D * Math.tan(RAIN_ANGLE));
}

// ---------------------------------------------------------- park after rain
export const SUN_DIR = new THREE.Vector3(16, 8.2, 14).normalize(); // low afternoon sun
export function buildPark() {
  const w = buildPlayground();
  const s = w.scene;
  w.sun.position.copy(SUN_DIR).multiplyScalar(30);
  w.sun.color.setHex(0xffe2b8);
  w.sun.intensity = 2.8;
  // after-rain sky: grey ahead, brighter towards the sun
  w.sky.material.uniforms.top.value.setHex(0x5a74a8);
  w.sky.material.uniforms.mid.value.setHex(0x8fa4c8);
  w.sky.material.uniforms.horizon.value.setHex(0xe8d6c0);
  s.fog.color.setHex(0xc8d2e0);
  // the sun itself (far behind the camera in most shots)
  const sunDisc = glow(0xfff2c8, 70, 1);
  sunDisc.position.copy(SUN_DIR).multiplyScalar(400);
  const sunHalo = glow(0xffd28a, 220, 0.5);
  sunHalo.position.copy(sunDisc.position);
  s.add(sunDisc, sunHalo);
  // grey rain clouds on the far side
  const R = rng(37);
  const cloudMat = std(0xaab6cc, 1, { emissive: 0x4a5468, emissiveIntensity: 0.35, transparent: true, opacity: 0.8, fog: false });
  for (let i = 0; i < 16; i++) {
    const a = Math.atan2(-SUN_DIR.z, -SUN_DIR.x) + (R() - 0.5) * 2.0;
    const r = 260 + R() * 60;
    add(s, new THREE.SphereGeometry(18 + R() * 16, 16, 10), cloudMat, [Math.cos(a) * r, 120 + R() * 50, Math.sin(a) * r], [0, 0, 0], [1.8, 0.5, 1], false);
  }
  // soft front fill so faces read when Affan has his back to the sun
  const fill = new THREE.DirectionalLight(0xfff0e0, 1.1);
  fill.position.set(-SUN_DIR.x * 20, 6, -SUN_DIR.z * 20);
  s.add(fill);
  // puddles
  const puddle = new THREE.MeshStandardMaterial({ color: 0x9fb8d8, roughness: 0.05, metalness: 0.7 });
  for (let i = 0; i < 9; i++) {
    const p = add(s, new THREE.CircleGeometry(0.4 + R() * 0.9, 24), puddle, [(R() - 0.5) * 16, 0.07, (R() - 0.5) * 14 - 1], [-Math.PI / 2, 0, R() * 3], [1.4, 1, 1], false);
    p.receiveShadow = true;
  }
  // last raindrops (streaks)
  const dropMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xd8e8ff, transparent: true, opacity: 0.5, depthWrite: false, fog: false });
  const drops = Array.from({ length: 70 }, () => {
    const d = new THREE.Sprite(dropMat);
    d.scale.set(0.04, 0.5, 1);
    d.visible = false;
    s.add(d);
    return d;
  });
  // the big rainbow (camera-relative) and a small one for the hose mist
  const rainbow = makeRainbow({ op: 0.72 });
  const mini = makeRainbow({ op: 0.8 });
  s.add(rainbow, mini);
  // garden hose: coil on the grass, a tube to the hand, a nozzle; spray beads
  const hose = new THREE.Group();
  s.add(hose);
  const green = std(0x2fae4a, 0.5);
  const coil = new THREE.Group();
  hose.add(coil);
  for (let i = 0; i < 4; i++) add(coil, new THREE.TorusGeometry(0.42 - i * 0.03, 0.05, 8, 40), green, [0, 0.05 + i * 0.09, 0], [Math.PI / 2, 0, 0]);
  const tubeMat = green;
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.5, 0, 0), new THREE.Vector3(1, 0.5, 0)]), 30, 0.05, 8), tubeMat);
  s.add(tube);
  const nozzle = new THREE.Group();
  s.add(nozzle);
  add(nozzle, new THREE.CylinderGeometry(0.06, 0.09, 0.32, 12), std(0xffc928, 0.4), [0, 0, 0.16], [Math.PI / 2, 0, 0]);
  const sprayMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xa8dcff, transparent: true, opacity: 0.8, depthWrite: false });
  const spray = Array.from({ length: 140 }, () => {
    const p = new THREE.Sprite(sprayMat);
    p.visible = false;
    s.add(p);
    return p;
  });
  const setTube = (from, to) => {
    const mid = from.clone().lerp(to, 0.5);
    mid.y = Math.max(0.05, mid.y - 0.5);
    const c = new THREE.CatmullRomCurve3([from, from.clone().lerp(mid, 0.5).setY(0.05), mid, to]);
    tube.geometry.dispose();
    tube.geometry = new THREE.TubeGeometry(c, 40, 0.05, 8);
  };
  return { ...w, rainbow, mini, drops, hose, coil, tube, nozzle, spray, setTube, sunDisc };
}

// ------------------------------------------------------------ the light lab
export const LAB_SUN = new THREE.Vector3(-3.4, 10.4, 0);
export const PRISM = new THREE.Vector3(-0.7, 5.9, 0);
export const SCREEN_X = 3.4;
export const DROP = new THREE.Vector3(0.8, 5.4, 0);
export const DROP_R = 2.6;

function gradientSky(top, bot) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, bot: { value: new THREE.Color(bot) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, bot; varying vec3 vP;
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.1, 0.6, vP.y)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}
function sunFace(parent, r) {
  add(parent, new THREE.SphereGeometry(r, 40, 24), new THREE.MeshBasicMaterial({ color: 0xffd23a }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  parent.add(glow(0xffc040, r * 6, 0.8), glow(0xff9a30, r * 12, 0.35));
  for (const s of [-1, 1]) add(parent, new THREE.SphereGeometry(r * 0.11, 10, 8), new THREE.MeshBasicMaterial({ color: 0x6a3410 }), [r * 0.33 * s, r * 0.16, r * 0.95], [0, 0, 0], [1, 1.4, 0.5], false);
  add(parent, new THREE.TorusGeometry(r * 0.3, r * 0.05, 8, 16, Math.PI), new THREE.MeshBasicMaterial({ color: 0x6a3410 }), [0, -r * 0.12, r * 0.95], [0, 0, Math.PI], [1, 1, 1], false);
}

export function buildLab() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x141a4a, 0x2a2f72);
  const stars = makeStars(700, 190, 12);
  scene.add(sky, stars);
  scene.add(new THREE.HemisphereLight(0xbfc8ff, 0x40306a, 0.9));
  const key = new THREE.DirectionalLight(0xfff2e6, 1.4);
  key.position.set(4, 10, 8);
  scene.add(key);
  const floor = add(scene, new THREE.CylinderGeometry(14, 14.4, 0.4, 64), std(0x2a2f5a, 0.6, { metalness: 0.2 }), [0, -0.2, 0]);
  floor.receiveShadow = true;
  add(scene, new THREE.TorusGeometry(14.1, 0.1, 8, 96), new THREE.MeshBasicMaterial({ color: 0xffd84a }), [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);

  const sun = new THREE.Group();
  sun.position.copy(LAB_SUN);
  sun.rotation.y = 0.5;
  scene.add(sun);
  sunFace(sun, 1.3);

  // beams: rods (unit length along +y from the origin)
  const rodGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
  rodGeo.translate(0, 0.5, 0);
  const mkRod = (color, op = 0.95) => {
    const m = new THREE.Mesh(rodGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.visible = false;
    m.renderOrder = 4;
    scene.add(m);
    return m;
  };
  const white = mkRod(0xffffff);
  const white2 = mkRod(0xffffff);
  const white3 = mkRod(0xffffff);
  const white4 = mkRod(0xffffff);
  const fan = COLORS.map((c) => mkRod(c)); // prism fan / drop exit
  const inA = COLORS.map((c) => mkRod(c)); // inside the drop: entry -> back
  const inB = COLORS.map((c) => mkRod(c)); // inside the drop: back -> exit
  const spots = COLORS.map((c) => {
    const s = glow(c, 1.2, 0);
    s.visible = false;
    scene.add(s);
    return s;
  });

  // prism (triangle facing the camera)
  const tri = new THREE.Shape();
  tri.moveTo(0, 1.25);
  tri.lineTo(-1.08, -0.62);
  tri.lineTo(1.08, -0.62);
  tri.lineTo(0, 1.25);
  const triGeo = new THREE.ExtrudeGeometry(tri, { depth: 1.4, bevelEnabled: false });
  triGeo.translate(0, 0, -0.7);
  const prism = add(scene, triGeo, new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.5, roughness: 0.05, clearcoat: 1, depthWrite: false }), PRISM.toArray(), [0, 0, 0.3], [1, 1, 1], false);
  prism.renderOrder = 6;
  const prismEdge = new THREE.LineSegments(new THREE.EdgesGeometry(prism.geometry), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
  prism.add(prismEdge);
  // white screen
  const screen = add(scene, new THREE.BoxGeometry(0.2, 4.8, 2.6), std(0xf4f4f4, 0.8, { emissive: 0x404040, emissiveIntensity: 0.4 }), [SCREEN_X, 3.4, 0]);
  add(screen, new THREE.CylinderGeometry(0.08, 0.08, 1.0, 10), std(0x8a90a8, 0.5), [0, -2.9, 0]);
  // the giant raindrop
  const dropMat = new THREE.MeshPhysicalMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.32, roughness: 0.02, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  const drop = new THREE.Group();
  drop.position.copy(DROP);
  scene.add(drop);
  const ball = add(drop, new THREE.SphereGeometry(DROP_R, 64, 40), dropMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  ball.renderOrder = 6;
  // a raindrop "tip" so it reads as a drop
  add(drop, new THREE.ConeGeometry(DROP_R * 0.72, DROP_R * 1.2, 48, 1, true), dropMat, [0, DROP_R * 1.08, 0], [0, 0, 0], [1, 1, 1], false).renderOrder = 6;
  const hl = glow(0xffffff, 1.2, 0.6);
  hl.position.set(-0.9, 1.0, 1.6);
  drop.add(hl);

  const aff = makeAffan();
  aff.root.scale.setScalar(0.5);
  scene.add(aff.root);
  return { scene, sky, stars, sun, white, white2, white3, white4, fan, inA, inB, spots, prism, screen, drop, aff };
}

// ---------------------------------------------------------------- the field
export const FIELD_SUN = new THREE.Vector3(0, Math.sin(0.42), Math.cos(0.42)); // 24° high, behind Affan (+z)
export const FIELD_D = 34;
export function buildField() {
  const scene = new THREE.Scene();
  const sky = makeSky({ top: 0x3d7ed8, mid: 0x86b8ef, horizon: 0xffe8c8, bottom: 0x9fc8f0 });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x6a8a4a, 1.1));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.4);
  key.position.copy(FIELD_SUN).multiplyScalar(40);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera;
  sc.left = -10;
  sc.right = 10;
  sc.top = 10;
  sc.bottom = -10;
  sc.near = 1;
  sc.far = 120;
  key.shadow.bias = -0.0006;
  scene.add(key, key.target);
  const groundMat = std(0x6fbf5a, 0.95, { transparent: true, opacity: 1 });
  const ground = add(scene, new THREE.CircleGeometry(220, 96), groundMat, [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  ground.receiveShadow = true;
  const sun = new THREE.Group();
  sun.position.copy(FIELD_SUN).multiplyScalar(60);
  scene.add(sun);
  sunFace(sun, 3.2);
  sun.lookAt(0, 2, -10);
  // full rainbow ring (bigger than the screen-space band, real 42° geometry)
  const rainbow = makeRainbow({ op: 0.85 });
  scene.add(rainbow);
  // sight lines (rods) from the eye to points on the ring
  const rodGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
  rodGeo.translate(0, 0.5, 0);
  const lines = Array.from({ length: 16 }, () => {
    const m = new THREE.Mesh(rodGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false }));
    m.visible = false;
    scene.add(m);
    return m;
  });
  const axis = new THREE.Mesh(rodGeo, new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0.9, depthWrite: false }));
  axis.visible = false;
  scene.add(axis);
  const aff = makeAffan();
  scene.add(aff.root);
  return { scene, sky, ground, groundMat, sun, rainbow, lines, axis, aff };
}
