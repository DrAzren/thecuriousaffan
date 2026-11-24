// Episode 063 sets:
//  - the Episode 053 park at night (lamp posts, stars) with a sky group that
//    follows the camera: a bright twinkling "hero" star and a steady moon;
//  - the sky lab: deep space with a far star and a ray of light travelling
//    to the Earth as a tiny point; the air above the ground as moving warm
//    and cool layers that bend the ray this way and that while a little Affan
//    below sees the star jump and flicker; a moon / planet / star comparison;
//    and Affan floating in space in a bubble helmet above the Earth;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, glow, makeStars } from '../../shared/props.js';
import { buildPark53, buildOutro, A_PK } from '../053-siang-malam/worlds.js';

export { buildOutro, A_PK };

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
// a four-pointed sparkle texture for stars
const sparkTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.12, 'rgba(255,250,220,0.9)');
  r.addColorStop(0.4, 'rgba(255,240,180,0.15)');
  r.addColorStop(1, 'rgba(255,240,180,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = 'rgba(255,255,240,0.9)';
  for (const [w, h] of [[8, 240], [240, 8]]) {
    g.beginPath();
    g.ellipse(128, 128, w / 2, h / 2, 0, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
export function makeStarSprite(size = 1, color = 0xfff6d8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  s.scale.setScalar(size);
  return s;
}
// a twinkle signal 0..1 (fast, irregular)
export const twinkle = (t, seed = 0) => 0.55 + 0.45 * (0.5 * Math.sin(t * 17.3 + seed) + 0.3 * Math.sin(t * 29.1 + seed * 2.1) + 0.2 * Math.sin(t * 7.7 + seed * 3.3));

// -------------------------------------------------------------------- park
export function buildPark63() {
  const w = buildPark53();
  w.ball.visible = false;
  const face = new THREE.DirectionalLight(0xd8e4ff, 1.1);
  face.position.set(A_PK.x + 2, 4, A_PK.z + 8);
  face.target.position.copy(A_PK);
  w.scene.add(face, face.target);
  // sky group follows the camera: hero star and a steady moon
  const skyG = new THREE.Group();
  w.scene.add(skyG);
  const moon = add(skyG, new THREE.SphereGeometry(9, 32, 24), new THREE.MeshBasicMaterial({ color: 0xfff4d6, fog: false }), [-14, 86, -150], [0, 0, 0], [1, 1, 1], false);
  const moonGlow = glow(0xfff0c8, 60, 0.45);
  moonGlow.position.copy(moon.position);
  skyG.add(moonGlow);
  const heroes = [[24, 114, -140, 22], [40, 70, -160, 12], [-24, 126, -125, 11], [6, 132, -150, 9]].map(([x, y, z, s], i) => {
    const sp = makeStarSprite(s);
    sp.position.set(x, y, z);
    sp.userData = { base: s, seed: i * 1.7 };
    skyG.add(sp);
    return sp;
  });
  return { ...w, skyG, moon, heroes };
}

// --------------------------------------------------------------- sky lab
export const SPACE_AT = V3(0, 0, 0);
export const AIR_AT = V3(40, 0, 0);
export const COMP_AT = V3(80, 0, 0);
export const ASTRO_AT = V3(120, 0, 0);
export const LAYER_Y = [7.0, 5.6, 4.2, 2.8];
export function buildSkyLab() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x101a4a, 0x02040e);
  scene.add(sky);
  const stars = makeStars(1200, 250, 630);
  scene.add(stars);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a4a, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(5, 8, 10);
  scene.add(key);
  // 1) space: Earth below, a far star, a ray of light
  const earth = add(scene, new THREE.SphereGeometry(2.6, 40, 28), std(0x2f7be0, 0.5, { emissive: 0x0a2a5a, emissiveIntensity: 0.3 }), [SPACE_AT.x, SPACE_AT.y - 3.2, SPACE_AT.z], [0, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.SphereGeometry(2.85, 40, 28), new THREE.MeshBasicMaterial({ color: 0x7ac8ff, transparent: true, opacity: 0.25, depthWrite: false }), earth.position.toArray(), [0, 0, 0], [1, 1, 1], false);
  for (const [x, y, z, sx, sy] of [[-0.8, 0.9, 2.0, 1.1, 0.6], [1.0, -0.3, 2.2, 0.8, 0.9], [-0.2, -1.2, 2.3, 1.0, 0.5]]) add(scene, new THREE.SphereGeometry(1, 16, 12), std(0x4cb85a, 0.7), [earth.position.x + x, earth.position.y + y, earth.position.z + z * 0.6], [0, 0, 0], [sx, sy, 0.3], false);
  const farStar = makeStarSprite(5);
  farStar.position.set(SPACE_AT.x + 2.0, SPACE_AT.y + 9, SPACE_AT.z - 40);
  scene.add(farStar);
  const rayLine = add(scene, new THREE.CylinderGeometry(0.02, 0.02, 1, 6), new THREE.MeshBasicMaterial({ color: 0xfff4c0, transparent: true, opacity: 0.6 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const photon = makeStarSprite(1.4);
  scene.add(photon);
  // 2) the air: moving warm and cool layers over the ground, a little Affan below
  const air = new THREE.Group();
  air.position.copy(AIR_AT);
  scene.add(air);
  add(air, new THREE.BoxGeometry(14, 0.6, 4), std(0x3a7a3a, 0.9), [0, 0.3, 0]);
  const layers = LAYER_Y.map((y, i) => {
    const geo = new THREE.PlaneGeometry(14, 1.1, 60, 4);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: i % 2 ? 0x5ab0ff : 0xff9a4a, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(0, y, 0);
    air.add(m);
    m.userData.base = geo.attributes.position.array.slice();
    return m;
  });
  const littleAff = makeAffan();
  littleAff.root.scale.setScalar(0.42);
  littleAff.root.position.set(0, 0.6, 0.6);
  air.add(littleAff.root);
  const airStar = makeStarSprite(2.2);
  air.add(airStar);
  const rayMat = new THREE.MeshBasicMaterial({ color: 0xfff0a0 });
  const ray = add(air, new THREE.BufferGeometry(), rayMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  // 3) comparison: moon (big disc), planet (ringed), star (point) over a band of air
  const comp = new THREE.Group();
  comp.position.copy(COMP_AT);
  scene.add(comp);
  const cMoon = add(comp, new THREE.SphereGeometry(1.2, 32, 24), new THREE.MeshBasicMaterial({ color: 0xfff4d6 }), [-2.2, 6.0, 0], [0, 0, 0], [1, 1, 1], false);
  const cMoonGlow = glow(0xfff0c8, 5, 0.5);
  cMoonGlow.position.set(-2.2, 6.0, -0.2);
  comp.add(cMoonGlow);
  const planet = new THREE.Group();
  planet.position.set(0, 6.2, 0);
  comp.add(planet);
  add(planet, new THREE.SphereGeometry(0.6, 28, 20), std(0xe8c88a, 0.5, { emissive: 0x6a4a20, emissiveIntensity: 0.6 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  add(planet, new THREE.RingGeometry(0.85, 1.25, 40), new THREE.MeshBasicMaterial({ color: 0xf0d8a0, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }), [0, 0, 0], [1.2, 0.3, 0], [1, 1, 1], false);
  const cStar = makeStarSprite(1.6);
  cStar.position.set(2.3, 6.2, 0);
  comp.add(cStar);
  const compLayers = [3.8, 2.8].map((y, i) => add(comp, new THREE.PlaneGeometry(10, 0.8), new THREE.MeshBasicMaterial({ color: i ? 0x5ab0ff : 0xff9a4a, transparent: true, opacity: 0.3, depthWrite: false }), [0, y, 0], [0, 0, 0], [1, 1, 1], false));
  add(comp, new THREE.BoxGeometry(10, 0.5, 3), std(0x3a7a3a, 0.9), [0, 0.25, 0]);
  const compRays = [];
  const rayM2 = new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.75 });
  for (let i = 0; i < 7; i++) compRays.push({ m: add(comp, new THREE.BufferGeometry(), rayM2, [0, 0, 0], [0, 0, 0], [1, 1, 1], false), src: 'moon', k: i });
  for (let i = 0; i < 4; i++) compRays.push({ m: add(comp, new THREE.BufferGeometry(), rayM2, [0, 0, 0], [0, 0, 0], [1, 1, 1], false), src: 'planet', k: i });
  compRays.push({ m: add(comp, new THREE.BufferGeometry(), rayM2, [0, 0, 0], [0, 0, 0], [1, 1, 1], false), src: 'star', k: 0 });
  // 4) astronaut Affan floating above the Earth
  const astro = new THREE.Group();
  astro.position.copy(ASTRO_AT);
  scene.add(astro);
  const bigEarth = add(astro, new THREE.SphereGeometry(9, 48, 32), std(0x2f7be0, 0.5, { emissive: 0x0a2a5a, emissiveIntensity: 0.3 }), [0, -11, -2], [0, 0, 0], [1, 1, 1], false);
  add(astro, new THREE.SphereGeometry(9.4, 48, 32), new THREE.MeshBasicMaterial({ color: 0x7ac8ff, transparent: true, opacity: 0.22, depthWrite: false }), [0, -11, -2], [0, 0, 0], [1, 1, 1], false);
  for (const [x, y, sx] of [[-3, -2.5, 3], [3.5, -3.2, 2.2], [0.5, -2.2, 1.6]]) add(astro, new THREE.SphereGeometry(1, 16, 12), std(0x4cb85a, 0.7), [x, y, 5.2], [0, 0, 0], [sx, 0.5, 0.3], false);
  const astroAff = makeAffan();
  astroAff.root.scale.setScalar(0.8);
  astro.add(astroAff.root);
  const helmet = add(astro, new THREE.SphereGeometry(0.95, 32, 24), new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const steady = Array.from({ length: 6 }, (_, i) => {
    const s = makeStarSprite(1.2 + (i % 3) * 0.4);
    s.position.set(-4 + i * 1.6, 3 + (i % 2) * 2.2, -3 - (i % 3));
    astro.add(s);
    return s;
  });
  return { scene, sky, stars, farStar, rayLine, photon, earth, air, layers, littleAff, airStar, ray, comp, cMoon, planet, cStar, compLayers, compRays, astro, astroAff, helmet, steady };
}

// a thin ribbon tube through a list of points
export function setRay(mesh, pts, r = 0.035) {
  mesh.geometry.dispose();
  mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05), Math.max(8, pts.length * 6), r, 6);
}
