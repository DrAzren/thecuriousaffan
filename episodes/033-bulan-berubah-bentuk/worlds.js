// Episode 033 sets:
//  - the night road from Episode 005, with a moon that can show any phase;
//  - a "toy space" imagination world: a glowing Sun, the Earth with a tiny
//    Affan standing on top, and the Moon on its orbit, lit by sunlight so the
//    lit half always faces the Sun; Earth's shadow cone for the eclipse beat;
//  - the living room from Episode 031 with the lights off and a lamp, for the
//    ball-and-lamp demo;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeSky, makeStars, makeMoon, glow, glowTex } from '../../shared/props.js';
import { buildRoadWorld, buildOutro, carX, CAR_SPEED } from '../005-bulan-ikut-kereta/worlds.js';
import { buildLivingRoom } from '../031-geletek-diri-sendiri/worlds.js';

export { buildOutro, carX, CAR_SPEED };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

// Moon material lit by a world-space sun direction (any phase), with a faint
// earthshine on the dark side. Uses the moon texture from shared/props.js.
export function phaseMaterial(map, { dark = 0.06, tint = 0xfff4da } = {}) {
  return new THREE.ShaderMaterial({
    fog: false,
    uniforms: { map: { value: map }, sunDir: { value: new THREE.Vector3(1, 0, 0) }, dark: { value: dark }, tint: { value: new THREE.Color(tint) }, red: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec2 vUv;
      void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 sunDir; uniform float dark; uniform vec3 tint; uniform float red;
      varying vec3 vN; varying vec2 vUv;
      void main(){
        vec3 c = texture2D(map, vUv).rgb * tint;
        float l = smoothstep(-0.04, 0.10, dot(normalize(vN), normalize(sunDir)));
        vec3 lit = c * (dark + (1.0 - dark) * l);
        lit = mix(lit, c * vec3(0.55, 0.16, 0.08) * 0.8, red);
        gl_FragColor = vec4(lit, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

// ------------------------------------------------------------------ night road
export function buildRoad() {
  const w = buildRoadWorld();
  const ball = w.moon.userData.ball;
  ball.material = phaseMaterial(ball.material.map);
  w.moonGlows = w.moon.children.filter((c) => c.isSprite);
  return w;
}

// ------------------------------------------------------------------ toy space
export const EARTH_R = 1.6;
export const ORBIT_R = 6.2;
export const SUN_POS = new THREE.Vector3(-46, 0, 0);

function earthTex() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#2f7fe0';
  g.fillRect(0, 0, 1024, 512);
  const R = rng(12);
  g.fillStyle = '#3fbf5f';
  for (let i = 0; i < 9; i++) {
    const x = R() * 1024, y = 120 + R() * 280;
    for (let k = 0; k < 7; k++) {
      g.beginPath();
      g.ellipse(x + (R() - 0.5) * 120, y + (R() - 0.5) * 80, 30 + R() * 70, 20 + R() * 50, R() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.fillStyle = '#f4f8ff';
  g.fillRect(0, 0, 1024, 40);
  g.fillRect(0, 472, 1024, 40);
  g.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 40; i++) {
    g.beginPath();
    g.ellipse(R() * 1024, 60 + R() * 390, 20 + R() * 50, 6 + R() * 10, 0, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildSpace() {
  const scene = new THREE.Scene();
  const sky = makeSky({ top: 0x05061a, mid: 0x0d1238, horizon: 0x1c2460, bottom: 0x05061a });
  const stars = makeStars(1800, 1600, 33);
  scene.add(sky, stars);
  const amb = new THREE.AmbientLight(0x8090ff, 0.06);
  scene.add(amb);
  // sunlight: parallel rays travelling towards +x
  const sunLight = new THREE.DirectionalLight(0xfff4e0, 3.2);
  sunLight.position.copy(SUN_POS);
  sunLight.target.position.set(0, 0, 0);
  scene.add(sunLight, sunLight.target);
  // the Sun
  const sun = new THREE.Group();
  sun.position.copy(SUN_POS);
  scene.add(sun);
  add(sun, new THREE.SphereGeometry(7, 48, 32), new THREE.MeshBasicMaterial({ color: 0xffd25a }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const sunGlow1 = glow(0xffc040, 30, 0.8);
  const sunGlow2 = glow(0xff8a20, 60, 0.4);
  sun.add(sunGlow1, sunGlow2);
  // a friendly face on the Sun (towards +x/+z)
  const face = new THREE.Group();
  face.position.set(4.2, 1.0, 5.4);
  face.lookAt(SUN_POS.clone().add(new THREE.Vector3(30, 8, 40)));
  sun.add(face);
  for (const s of [-1, 1]) add(face, new THREE.SphereGeometry(0.55, 16, 12), new THREE.MeshBasicMaterial({ color: 0x5a2a10 }), [1.3 * s, 0.6, 0], [0, 0, 0], [1, 1.3, 0.4], false);
  add(face, new THREE.TorusGeometry(1.1, 0.22, 8, 20, Math.PI), new THREE.MeshBasicMaterial({ color: 0x5a2a10 }), [0, -0.5, 0], [0, 0, Math.PI], [1, 1, 1], false);

  // the Earth with a tiny Affan on top
  const earth = new THREE.Group();
  scene.add(earth);
  const globe = add(earth, new THREE.SphereGeometry(EARTH_R, 64, 48), std(0xffffff, 0.8, { map: earthTex() }), [0, 0, 0], [0.4, 0, 0], [1, 1, 1], false);
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.06, 48, 32), new THREE.MeshBasicMaterial({ color: 0x7fc8ff, transparent: true, opacity: 0.15, depthWrite: false }));
  earth.add(atmo);
  const aff = makeAffan();
  aff.root.scale.setScalar(0.17);
  aff.root.position.set(0, EARTH_R - 0.02, 0);
  earth.add(aff.root);

  // the Moon on its orbit (MeshStandard lit by the sun, so phases are real)
  const moonMat = std(0xfff4da, 0.95, { map: makeMoon(1).userData.ball.material.map });
  const moon = add(scene, new THREE.SphereGeometry(0.55, 48, 32), moonMat, [ORBIT_R, 0, 0], [0, 0, 0], [1, 1, 1], false);
  // orbit path: dashed ring
  const ringPts = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    ringPts.push(new THREE.Vector3(Math.cos(a) * ORBIT_R, 0, -Math.sin(a) * ORBIT_R));
  }
  const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), new THREE.LineDashedMaterial({ color: 0x9fb4ff, dashSize: 0.3, gapSize: 0.2, transparent: true, opacity: 0.7 }));
  orbit.computeLineDistances();
  scene.add(orbit);
  // terminator ring that divides the lit and dark halves of the moon
  const term = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.02, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, depthWrite: false }));
  term.visible = false;
  scene.add(term);
  // Earth's shadow cone (for the eclipse beat)
  const coneGeo = new THREE.CylinderGeometry(EARTH_R * 0.55, EARTH_R, 12, 48, 1, true);
  coneGeo.rotateZ(-Math.PI / 2);
  coneGeo.translate(6, 0, 0);
  const shadow = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0x5a62b0, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
  shadow.visible = false;
  scene.add(shadow);
  // light rays from the sun (sprites)
  const rayMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffe08a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const rays = Array.from({ length: 24 }, () => {
    const s = new THREE.Sprite(rayMat);
    s.scale.setScalar(0.5);
    s.visible = false;
    scene.add(s);
    return s;
  });
  return { scene, sky, stars, sun, sunLight, sunGlow1, sunGlow2, amb, earth, globe, aff, moon, moonMat, orbit, term, shadow, rays, rayMat };
}

// ----------------------------------------------------------------- dark room
export function buildDarkRoom() {
  const w = buildLivingRoom();
  w.kak.root.visible = false;
  const lights = [];
  w.scene.traverse((o) => {
    if (o.isLight) lights.push([o, o.intensity]);
  });
  w.scene.background = new THREE.Color(0xf6e8cf);
  const roomBg = new THREE.Color(0xf6e8cf), darkBg = new THREE.Color(0x07070f);
  // floor lamp (bare bulb shade) to Affan's right
  const lamp = new THREE.Group();
  lamp.position.set(-1.7, 0, 0.5);
  w.scene.add(lamp);
  add(lamp, new THREE.CylinderGeometry(0.4, 0.5, 0.12, 24), std(0x4a4f5e, 0.5), [0, 0.06, 0]);
  add(lamp, new THREE.CylinderGeometry(0.05, 0.05, 2.6, 12), std(0x4a4f5e, 0.4), [0, 1.36, 0]);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff4c8 });
  add(lamp, new THREE.SphereGeometry(0.28, 24, 16), bulbMat, [0, 2.85, 0], [0, 0, 0], [1, 1, 1], false);
  const bulbGlow = glow(0xfff0b0, 3.2, 0.9);
  bulbGlow.position.set(0, 2.85, 0);
  lamp.add(bulbGlow);
  const bulbLight = new THREE.PointLight(0xfff0d0, 0, 30, 2);
  bulbLight.position.set(0, 2.85, 0);
  lamp.add(bulbLight);
  // the ball (same moon texture)
  const ball = add(w.scene, new THREE.SphereGeometry(0.42, 48, 32), std(0xfff4da, 0.9, { map: makeMoon(1).userData.ball.material.map }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  // dark: 0 = room lights on, 1 = only the lamp
  w.setDark = (k) => {
    for (const [l, i0] of lights) l.intensity = i0 * (1 - 0.97 * k);
    bulbLight.intensity = 9 * k;
    bulbGlow.material.opacity = 0.25 + 0.7 * k;
    w.scene.background.copy(roomBg).lerp(darkBg, k);
  };
  w.setDark(0);
  return { ...w, lamp, bulbLight, ball };
}
