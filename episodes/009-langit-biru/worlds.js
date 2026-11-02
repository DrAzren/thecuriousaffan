// Episode 009 sets: the sunny park (day -> sunset), Affan's little science
// rocket, the light-and-air-molecule micro world, the Earth/atmosphere
// cutaway diagram and the branded outro stage. All procedural.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, lerp, clamp } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeTree, makeBush, glow } from '../../shared/props.js';

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const col = (h) => new THREE.Color(h);
const mixC = (a, b, k) => col(a).lerp(col(b), clamp(k));

function shadowCfg(light, size, map = 2048) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  const c = light.shadow.camera;
  c.left = -size;
  c.right = size;
  c.top = size;
  c.bottom = -size;
  c.near = 1;
  c.far = 400;
  light.shadow.bias = -0.0005;
  light.shadow.normalBias = 0.03;
}

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Visible-light colours used across the episode (red -> violet).
export const SPECTRUM = [0xff3b3b, 0xff8a1f, 0xffe23a, 0x3fdc5a, 0x2f8bff, 0x8a4dff];
// Relative wavelengths (red 700 nm ... violet 410 nm), in scene units.
export const LAMBDA = [4.67, 4.13, 3.87, 3.53, 3.0, 2.73];

// --------------------------------------------------------------- sky dome
// Gradient sky with a sun glow. Colours are set per frame (day / sunset /
// altitude / the "green sky?" gag) through setSky().
function makeSkyDome() {
  const u = {
    zen: { value: col(0x2a7de1) }, horSun: { value: col(0xd8f0ff) }, horAway: { value: col(0xa9d8ff) }, gnd: { value: col(0x8fc9e8) },
    sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: col(0xfff4d6) }, glowA: { value: 0.25 }, glowB: { value: 1 }, discA: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: u,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 zen, horSun, horAway, gnd, sunDir, sunCol; uniform float glowA, glowB, discA; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir); vec3 s = normalize(sunDir);
        vec2 dh = normalize(d.xz + vec2(1e-5)); vec2 sh = normalize(s.xz + vec2(1e-5));
        float az = dot(dh, sh) * 0.5 + 0.5;
        vec3 hor = mix(horAway, horSun, az * az);
        float y = d.y;
        vec3 c = mix(hor, zen, pow(clamp(y, 0.0, 1.0), 0.5));
        if (y < 0.0) c = mix(hor, gnd, smoothstep(0.0, 0.12, -y));
        float sd = max(dot(d, s), 0.0);
        c += sunCol * (pow(sd, 7.0) * glowA + pow(sd, 120.0) * glowB);
        c = mix(c, vec3(1.0, 0.93, 0.78), smoothstep(0.99955, 0.9998, sd) * discA);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1500, 64, 32), mat);
  m.renderOrder = -10;
  return m;
}

// ------------------------------------------------------------------ clouds
export function makeCloud(R, mat, s = 1) {
  const g = new THREE.Group();
  add(g, new THREE.SphereGeometry(1, 20, 14), mat, [0, 0.2 * s, 0], [0, 0, 0], [3.2 * s, 0.9 * s, 1.6 * s], false);
  const n = 6 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) {
    const r = (0.9 + R() * 0.9) * s;
    add(g, new THREE.SphereGeometry(1, 20, 14), mat, [(R() - 0.5) * 4.4 * s, (0.5 + R() * 0.9) * s, (R() - 0.5) * 1.4 * s], [0, 0, 0], [r, r * 0.9, r], false);
  }
  return g;
}

// ------------------------------------------------------------------ rocket
// Affan's tiny magical science rocket: a bubble-top capsule with fins. Affan
// rides in the glass dome. ~4 units tall at scale 1, base at y = 0.
export function makeRocket() {
  const g = new THREE.Group();
  const white = std(0xf7f4ef, 0.32, { emissive: 0x202020, emissiveIntensity: 0.1 });
  const peach = std(0xff9470, 0.45, { emissive: 0x40180a, emissiveIntensity: 0.15 });
  const navy = std(0x1c2752, 0.45, { emissive: 0x060a1c, emissiveIntensity: 0.3 });
  const cyan = std(0x35c6f0, 0.3, { emissive: 0x0a3a50, emissiveIntensity: 0.4 });
  const yellow = std(0xffd23f, 0.4, { emissive: 0x402a00, emissiveIntensity: 0.3 });
  const prof = [[0.0, 0.42], [0.5, 0.42], [0.78, 0.68], [0.98, 1.15], [1.06, 1.8], [1.02, 2.45], [0.95, 2.98], [0.0, 2.98]].map(([r, y]) => new THREE.Vector2(r, y));
  add(g, new THREE.LatheGeometry(prof, 56), white);
  // stripes (white over peach, like Affan's jacket) and a cyan band
  add(g, new THREE.TorusGeometry(1.035, 0.07, 10, 56), peach, [0, 1.42, 0], [Math.PI / 2, 0, 0]);
  add(g, new THREE.TorusGeometry(1.05, 0.05, 10, 56), cyan, [0, 1.6, 0], [Math.PI / 2, 0, 0]);
  add(g, new THREE.TorusGeometry(0.98, 0.09, 12, 56), navy, [0, 2.96, 0], [Math.PI / 2, 0, 0]);
  // porthole + emblem (yellow star in a navy disc)
  const port = new THREE.Group();
  port.position.set(0, 2.12, 1.0);
  port.rotation.x = -0.05;
  g.add(port);
  add(port, new THREE.CylinderGeometry(0.3, 0.3, 0.08, 32), navy, [0, 0, 0], [Math.PI / 2, 0, 0]);
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 0.09 : 0.21;
    i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  add(port, new THREE.ExtrudeGeometry(star, { depth: 0.04, bevelEnabled: false }), yellow, [0, 0, 0.04]);
  // fins (3), the front one is skipped so the porthole stays clear
  const fin = new THREE.Shape();
  fin.moveTo(0.0, 1.35);
  fin.quadraticCurveTo(0.75, 0.75, 0.82, 0.0);
  fin.lineTo(0.45, 0.0);
  fin.quadraticCurveTo(0.25, 0.35, 0.0, 0.45);
  fin.lineTo(0.0, 1.35);
  const finGeo = new THREE.ExtrudeGeometry(fin, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
  finGeo.translate(0, 0, -0.06);
  for (const a of [Math.PI / 3, Math.PI, -Math.PI / 3]) {
    const p = new THREE.Group();
    p.rotation.y = a + Math.PI / 2;
    g.add(p);
    add(p, finGeo, peach, [0.72, 0, 0]);
  }
  // nozzle
  add(g, new THREE.CylinderGeometry(0.34, 0.46, 0.34, 28, 1, true), navy, [0, 0.3, 0]).material.side = THREE.DoubleSide;
  // flame: two nested open cones with a vertical gradient (additive, gentle)
  const flameTex = canvasTex(8, 256, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(255,255,240,1)');
    gr.addColorStop(0.25, 'rgba(255,214,90,0.95)');
    gr.addColorStop(0.6, 'rgba(255,128,60,0.55)');
    gr.addColorStop(1, 'rgba(255,90,60,0)');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
  });
  flameTex.flipY = false;
  const flame = new THREE.Group();
  flame.position.y = 0.16;
  g.add(flame);
  const fmat = (o, c, blend) => new THREE.MeshBasicMaterial({ map: flameTex, color: c, transparent: true, opacity: o, blending: blend, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const outer = add(flame, new THREE.ConeGeometry(0.42, 1.8, 24, 1, true), fmat(0.95, 0xff9a40, THREE.NormalBlending), [0, -0.9, 0], [Math.PI, 0, 0], [1, 1, 1], false);
  const inner = add(flame, new THREE.ConeGeometry(0.22, 1.0, 24, 1, true), fmat(1, 0xffffff, THREE.AdditiveBlending), [0, -0.5, 0], [Math.PI, 0, 0], [1, 1, 1], false);
  const fg = glow(0xffc070, 2.6, 0.7);
  fg.position.y = -0.5;
  flame.add(fg);
  // glass dome
  const dome = add(g, new THREE.SphereGeometry(0.96, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xdff6ff, roughness: 0.05, transparent: true, opacity: 0.14, depthWrite: false, emissive: 0x9fe8ff, emissiveIntensity: 0.08 }), [0, 2.98, 0], [0, 0, 0], [1, 1.14, 1], false);
  dome.renderOrder = 5;
  const shine = add(g, new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }), [-0.42, 3.62, 0.62], [0.3, 0, 0.5], [0.16, 0.07, 0.05], false);
  shine.renderOrder = 6;
  // pilot
  const pilot = makeAffan();
  pilot.root.scale.setScalar(0.5);
  pilot.root.position.set(0, 2.0, 0.05);
  g.add(pilot.root);
  g.userData = {
    pilot,
    flame,
    // f: 0 (off) .. 1 (full thrust); deterministic flicker from t
    setFlame(f, t) {
      flame.visible = f > 0.01;
      const fl = 1 + 0.08 * Math.sin(t * 41) + 0.05 * Math.sin(t * 67 + 1);
      outer.scale.set(0.6 + 0.4 * f, f * fl, 0.6 + 0.4 * f);
      outer.position.y = -0.9 * f * fl;
      inner.scale.set(1, f * fl, 1);
      inner.position.y = -0.5 * f * fl;
      fg.material.opacity = 0.7 * f;
    },
  };
  g.userData.setFlame(0, 0);
  return g;
}

// ------------------------------------------------------------------- prism
// Affan's science gadget: a small glass prism that fans sunlight out into
// its colours (the classic spectrum demonstration; not the atmosphere).
function makePrism() {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.85, 0.85, 1.0, 3, 1);
  geo.rotateX(Math.PI / 2); // triangle faces +z (the camera)
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xeefcff, roughness: 0.05, transparent: true, opacity: 0.38, depthWrite: false, emissive: 0xbff4ff, emissiveIntensity: 0.25, side: THREE.DoubleSide });
  const body = add(g, geo, glass, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  body.renderOrder = 4;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
  g.add(edges);
  const hg = glow(0xe8fbff, 2.4, 0.5);
  g.add(hg);
  return g;
}

// A light beam as a (possibly widening) additive cylinder between two points.
const _up = new THREE.Vector3(0, 1, 0);
export function beam(color, r0 = 0.1, r1 = 0.1, opacity = 0.9, blending = THREE.AdditiveBlending) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, 1, 20, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  const halo = new THREE.Mesh(new THREE.CylinderGeometry(r1 * 2.6, r0 * 2.6, 1, 20, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacity * 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  core.renderOrder = halo.renderOrder = 7;
  g.add(core, halo);
  const a = new THREE.Vector3(), d = new THREE.Vector3();
  g.userData.set = (from, to, k = 1, o = 1) => {
    d.subVectors(to, from);
    const len = d.length() * clamp(k);
    g.visible = len > 0.01 && o > 0.01;
    d.normalize();
    a.copy(from).addScaledVector(d, len / 2);
    g.position.copy(a);
    g.quaternion.setFromUnitVectors(_up, d);
    g.scale.set(1, Math.max(0.001, len), 1);
    core.material.opacity = opacity * o;
    halo.material.opacity = opacity * 0.22 * o;
  };
  return g;
}

// ------------------------------------------------------------------- park
export function buildPark() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xbfe4ff, 80, 700);
  const sky = makeSkyDome();
  scene.add(sky);
  const hemi = new THREE.HemisphereLight(0xbfe0ff, 0x5a8a4a, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3e0, 2.6);
  shadowCfg(sun, 9);
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xffffff, 0.45);
  scene.add(fill, fill.target);

  // grass
  const grassTex = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#5fbf55';
    c.fillRect(0, 0, w, h);
    const R = rng(21);
    for (let i = 0; i < 2600; i++) {
      c.fillStyle = ['#56b34d', '#6cc95f', '#4ea646', '#74d067'][i % 4];
      c.globalAlpha = 0.35 + R() * 0.4;
      c.fillRect(R() * w, R() * h, 2 + R() * 3, 6 + R() * 10);
    }
  });
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(220, 220);
  const ground = add(scene, new THREE.PlaneGeometry(3000, 3000), std(0xffffff, 0.95, { map: grassTex }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  ground.receiveShadow = true;
  // curved footpath
  const path = add(scene, new THREE.RingGeometry(9, 11.2, 96, 1, Math.PI * 0.05, Math.PI * 0.9), std(0xead9b4, 0.9), [0, 0.01, -2], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  path.receiveShadow = true;

  const R = rng(9);
  const leaf = [[0x5cc15a], [0x46a84e], [0x7ad06a], [0x3f9a55]];
  const tree = (x, z, s) => {
    const t = makeTree(R, { scale: s, leaf: leaf[Math.floor(R() * 4)], trunk: 0x8a5a3a, toy: true });
    t.position.set(x, 0, z);
    scene.add(t);
  };
  for (let i = 0; i < 26; i++) {
    const a = Math.PI * (0.08 + 0.84 * (i / 25)) + (R() - 0.5) * 0.1;
    const r = 14 + R() * 18;
    tree(Math.cos(a) * r, -Math.sin(a) * r - 2, 1.8 + R() * 1.4);
  }
  for (let i = 0; i < 40; i++) tree((R() - 0.5) * 260, -45 - R() * 90, 3 + R() * 3);
  for (const [x, z] of [[-11, 6], [12, 5], [-16, 12], [17, 13]]) tree(x, z, 2.2 + R());
  for (let i = 0; i < 18; i++) {
    const b = makeBush(R, { scale: 1 + R() * 0.8, color: [0x3f9a4a, 0x4fae52, 0x5bbf5e][i % 3] });
    const a = Math.PI * (0.1 + 0.8 * R());
    const r = 8 + R() * 8;
    b.position.set(Math.cos(a) * r, 0, -Math.sin(a) * r - 1);
    scene.add(b);
  }
  // flowers
  const nF = 160;
  const petal = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 10, 8), std(0xffffff, 0.6), nF);
  const m4 = new THREE.Matrix4();
  const fc = [0xff7aa8, 0xffd84a, 0xffffff, 0xff9470, 0xb48cff];
  for (let i = 0; i < nF; i++) {
    const a = R() * Math.PI * 2, r = 3 + R() * 12;
    m4.makeTranslation(Math.cos(a) * r, 0.18, Math.sin(a) * r * 0.8 - 2);
    petal.setMatrixAt(i, m4);
    petal.setColorAt(i, col(fc[i % fc.length]));
  }
  scene.add(petal);
  // bench
  const bench = new THREE.Group();
  const wood = std(0xd08a4e, 0.7), iron = std(0x1c2752, 0.5);
  for (let i = 0; i < 3; i++) add(bench, new RoundedBoxGeometry(3.2, 0.12, 0.32, 2, 0.04), wood, [0, 0.9, -0.36 + i * 0.36]);
  for (let i = 0; i < 2; i++) add(bench, new RoundedBoxGeometry(3.2, 0.3, 0.1, 2, 0.04), wood, [0, 1.35 + i * 0.38, -0.6], [-0.15, 0, 0]);
  for (const x of [-1.4, 1.4]) {
    add(bench, new THREE.BoxGeometry(0.1, 0.9, 0.9), iron, [x, 0.45, 0]);
    add(bench, new THREE.BoxGeometry(0.1, 1.1, 0.1), iron, [x, 1.45, -0.62], [-0.15, 0, 0]);
  }
  bench.position.set(-6.5, 0, -6);
  bench.rotation.y = 0.5;
  scene.add(bench);
  // distant hills
  for (let i = 0; i < 16; i++) {
    const x = -260 + i * 36 + R() * 20;
    add(scene, new THREE.SphereGeometry(30 + R() * 30, 32, 16), std([0x6fbf6a, 0x5aa85f, 0x7cc87a][i % 3], 1), [x, -12, -160 - R() * 80], [0, 0, 0], [1.8, 0.65, 1], false);
  }
  // sky clouds
  const cloudMat = std(0xffffff, 1, { emissive: 0xffffff, emissiveIntensity: 0.28 });
  const clouds = [];
  for (let i = 0; i < 16; i++) {
    const c = makeCloud(R, cloudMat, 4 + R() * 4);
    c.position.set(-260 + i * 34 + R() * 20, 45 + R() * 50, -170 - R() * 160);
    scene.add(c);
    clouds.push(c);
  }
  // cloud sea (only visible in the flight shots)
  const nC = 520;
  const sea = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 12), cloudMat, nC);
  for (let i = 0; i < nC; i++) {
    let x = (R() - 0.5) * 520, z = (R() - 0.5) * 520;
    if (i < 40) (x = (R() - 0.5) * 30), (z = (R() - 0.5) * 30);
    const r = 5 + R() * 6 + Math.hypot(x, z) * 0.02;
    m4.compose(new THREE.Vector3(x, 44 + R() * 4, z), new THREE.Quaternion(), new THREE.Vector3(r * 1.4, r * 0.55, r));
    sea.setMatrixAt(i, m4);
  }
  sea.visible = false;
  sea.frustumCulled = false;
  scene.add(sea);

  // Affan (standing) and the rocket
  const aff = makeAffan();
  scene.add(aff.root);
  const rocket = makeRocket();
  scene.add(rocket);
  // prism gadget + beams (flight shot only)
  const prism = makePrism();
  prism.visible = false;
  scene.add(prism);
  const white = beam(0xffffff, 0.12, 0.12, 0.95);
  scene.add(white);
  const fan = SPECTRUM.map((c) => {
    const b = beam(c, 0.05, 0.2, 0.92, THREE.NormalBlending);
    scene.add(b);
    return b;
  });

  const sunDir = new THREE.Vector3(0.45, 0.75, 0.5).normalize();
  // k: 0 day .. 1 sunset; green: "green sky?" gag; alt: 0 ground .. 1 above clouds
  function setSky({ k = 0, green = 0, alt = 0, dir = null } = {}) {
    if (dir) sunDir.copy(dir).normalize();
    const u = sky.material.uniforms;
    const zen = mixC(0x2a7de1, 0x1450b8, alt).lerp(col(0x2a3a8a), k).lerp(col(0x2fa15a), green);
    const horSun = mixC(0xd8f0ff, 0xc4e6ff, alt).lerp(col(0xffa347), k).lerp(col(0xd6ffd0), green);
    const horAway = mixC(0xaad8ff, 0xb5dcff, alt).lerp(col(0xf29aa6), k).lerp(col(0xb4f0b0), green);
    u.zen.value.copy(zen);
    u.horSun.value.copy(horSun);
    u.horAway.value.copy(horAway);
    u.gnd.value.copy(mixC(0x8fc9e8, 0xc07a70, k));
    u.sunDir.value.copy(sunDir);
    u.sunCol.value.copy(mixC(0xfff4d6, 0xffa040, k));
    u.glowA.value = lerp(0.22, 0.75, k);
    u.glowB.value = lerp(1.0, 1.6, k);
    u.discA.value = k > 0.3 ? clamp((k - 0.3) / 0.4) : 0;
    scene.fog.color.copy(horAway.clone().lerp(horSun, 0.4));
    hemi.color.copy(mixC(0xbfe0ff, 0xffb48a, k));
    hemi.groundColor.copy(mixC(0x5a8a4a, 0x4a3050, k));
    hemi.intensity = lerp(1.1, 1.3, k);
    sun.color.copy(mixC(0xfff3e0, 0xff9a4a, k));
    sun.intensity = lerp(2.6, 2.0, k);
    fill.color.copy(mixC(0xffffff, 0xffc8a8, k));
    fill.intensity = lerp(0.45, 1.7, k);
    cloudMat.color.copy(mixC(0xffffff, 0xffd2bc, k));
    cloudMat.emissive.copy(mixC(0xffffff, 0xff8f70, k));
    cloudMat.emissiveIntensity = lerp(0.28, 0.42, k);
  }
  // keep the sun's shadow frustum on whatever we are looking at
  function aim(target, camPos) {
    sun.target.position.copy(target);
    sun.position.copy(target).addScaledVector(sunDir, 120);
    fill.target.position.copy(target);
    fill.position.copy(camPos);
  }
  setSky();
  return { scene, sky, aff, rocket, prism, white, fan, sea, clouds, setSky, aim, sunDir };
}

// ------------------------------------------------------------ micro world
// Waves are thin tubes along x whose vertices are displaced by
// sin(2*pi*x/lambda - phase) between a tail and a head position, so a wave
// can travel in, and its amplitude can change after a molecule (xCut).
function waveMaterial(color, lambda, opacity) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uCol: { value: col(color) }, uLam: { value: lambda }, uPh: { value: 0 }, uAmp: { value: 0.5 }, uAmp2: { value: 0.5 }, uCut: { value: 1e9 }, uHead: { value: 1e9 }, uTail: { value: -1e9 }, uOp: { value: opacity } },
    vertexShader: `uniform float uLam, uPh, uAmp, uAmp2, uCut, uHead, uTail; varying float vA; varying float vN;
      void main(){ vec3 p = position; float x = p.x;
        float a = x < uCut ? uAmp : uAmp2;
        float env = (1.0 - smoothstep(uHead - 1.2, uHead, x)) * smoothstep(uTail, uTail + 1.2, x);
        p.y += a * sin(6.2831853 * x / uLam - uPh);
        vA = env; vN = normal.z;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform vec3 uCol; uniform float uOp; varying float vA; varying float vN;
      void main(){ float core = 0.55 + 0.45 * abs(vN); gl_FragColor = vec4(uCol * core, vA * uOp); }`,
  });
}

export function makeWave(color, lambda, { x0 = -30, x1 = 30, radius = 0.07, glowR = 0.24 } = {}) {
  const g = new THREE.Group();
  const len = x1 - x0;
  const mk = (r, op) => {
    const geo = new THREE.CylinderGeometry(r, r, len, 10, Math.ceil(len * 12), true);
    geo.rotateZ(-Math.PI / 2);
    geo.translate((x0 + x1) / 2, 0, 0);
    const m = new THREE.Mesh(geo, waveMaterial(color, lambda, op));
    m.frustumCulled = false;
    m.renderOrder = 6;
    g.add(m);
    return m;
  };
  const core = mk(radius, 1);
  const halo = mk(glowR, 0.22);
  g.userData.set = ({ ph = 0, amp = 0.5, amp2 = amp, cut = 1e9, head = 1e9, tail = -1e9, op = 1 }) => {
    for (const [m, base] of [[core, 1], [halo, 0.22]]) {
      const u = m.material.uniforms;
      u.uPh.value = ph;
      u.uAmp.value = amp;
      u.uAmp2.value = amp2;
      u.uCut.value = cut;
      u.uHead.value = head;
      u.uTail.value = tail;
      u.uOp.value = base * op;
    }
    g.visible = op > 0.01;
  };
  return g;
}

function makeMolecule(kind, R) {
  // N2: two lavender-white atoms; O2: two peach atoms
  const g = new THREE.Group();
  const c = kind === 'N2' ? 0xdcd6ff : 0xffb894;
  const mat = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.25, clearcoat: 0.8, emissive: c, emissiveIntensity: 0.18 });
  const r = 0.2;
  for (const s of [-1, 1]) add(g, new THREE.SphereGeometry(r, 24, 16), mat, [s * r * 0.72, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const h = glow(c, 1.3, 0.25);
  g.add(h);
  g.userData = { kind, ph: R() * 100, sp: 0.6 + R() * 0.8, axis: new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(), halo: h };
  return g;
}

export function buildMicro() {
  const scene = new THREE.Scene();
  const bg = canvasTex(540, 960, (c, w, h) => {
    const gr = c.createRadialGradient(w / 2, h * 0.45, 30, w / 2, h * 0.5, h * 0.75);
    gr.addColorStop(0, '#1d4c9e');
    gr.addColorStop(0.55, '#10285f');
    gr.addColorStop(1, '#070f30');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
  });
  scene.background = bg;
  scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x203060, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(4, 8, 10);
  scene.add(key);
  const R = rng(31);
  // soft bokeh
  for (let i = 0; i < 70; i++) {
    const s = glow([0x7fd6ff, 0xffc2a0, 0xffffff, 0x9fb4ff][i % 4], 2 + R() * 5, 0.06 + R() * 0.1);
    s.position.set((R() - 0.5) * 70, (R() - 0.5) * 90, -25 - R() * 40);
    scene.add(s);
  }
  // air: ~4 nitrogen for every oxygen molecule, about 10 molecule-sizes apart
  const mols = [];
  for (let i = 0; i < 90; i++) {
    const m = makeMolecule(R() < 0.79 ? 'N2' : 'O2', R);
    m.userData.home = new THREE.Vector3((R() - 0.5) * 40, (R() - 0.5) * 56, -14 + R() * 18);
    scene.add(m);
    mols.push(m);
  }
  // the "hero" molecules used in close-ups and in the two scattering lanes
  const hero = makeMolecule('N2', R);
  hero.scale.setScalar(1.25);
  scene.add(hero);
  const heroO = makeMolecule('O2', R);
  scene.add(heroO);
  const laneB = makeMolecule('N2', R);
  const laneR = makeMolecule('N2', R);
  laneB.scale.setScalar(2.0);
  laneR.scale.setScalar(2.0);
  scene.add(laneB, laneR);
  // white light = a braid of all the colours
  const braid = SPECTRUM.map((c, i) => makeWave(c, LAMBDA[i], { x0: -40, x1: 40, radius: 0.05, glowR: 0.16 }));
  braid.forEach((w) => scene.add(w));
  // lanes: blue vs red
  const waveB = makeWave(SPECTRUM[4], LAMBDA[4], { x0: -12, x1: 12 });
  const waveR = makeWave(SPECTRUM[0], LAMBDA[0], { x0: -12, x1: 12 });
  scene.add(waveB, waveR);
  // scattered wavelets (rings) and photons
  const ringGeo = new THREE.RingGeometry(0.94, 1, 96);
  const rings = { B: [], R: [] };
  for (const k of ['B', 'R']) {
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: k === 'B' ? 0x58b4ff : 0xff5a4a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.renderOrder = 7;
      scene.add(m);
      rings[k].push(m);
    }
  }
  // photons: crisp bright dots with a soft halo
  const dotTex = canvasTex(128, 128, (c, w) => {
    const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.28, 'rgba(255,255,255,1)');
    gr.addColorStop(0.42, 'rgba(255,255,255,0.45)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, w);
  });
  const photons = { B: [], R: [] };
  for (const k of ['B', 'R']) {
    for (let i = 0; i < 90; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: k === 'B' ? 0x7cc8ff : 0xff6a50, transparent: true, opacity: 0, depthWrite: false, fog: false }));
      s.renderOrder = 8;
      scene.add(s);
      photons[k].push(s);
    }
  }
  // mini rocket with Affan (micro-scale visitor)
  const rocket = makeRocket();
  rocket.scale.setScalar(0.55);
  scene.add(rocket);

  function update(t) {
    for (const m of mols) {
      const u = m.userData;
      m.position.set(u.home.x + 0.25 * Math.sin(t * u.sp + u.ph), u.home.y + 0.25 * Math.sin(t * u.sp * 1.3 + u.ph * 2), u.home.z + 0.2 * Math.sin(t * u.sp * 0.8 + u.ph * 3));
      m.setRotationFromAxisAngle(u.axis, t * u.sp + u.ph);
    }
    for (const m of [hero, heroO, laneB, laneR]) m.setRotationFromAxisAngle(m.userData.axis, 0.6 * t + m.userData.ph);
  }
  return { scene, mols, hero, heroO, laneB, laneR, braid, waveB, waveR, rings, photons, rocket, update };
}

// ------------------------------------------------------- Earth cutaway
// Orthographic diagram: Earth (radius ER) with an exaggerated atmosphere
// shell (thickness AH), black space and stars. Affan stands at the top.
export const ER = 12;
export const AH = 1.6;
export function buildDiagram() {
  const scene = new THREE.Scene();
  scene.background = col(0x040817);
  // flat star field behind the diagram (space is black, not blue)
  const SR = rng(13);
  const sp = new Float32Array(700 * 3);
  for (let i = 0; i < 700; i++) sp.set([(SR() - 0.5) * 70, -20 + SR() * 70, -30], i * 3);
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xfff6e8, size: 2.6, sizeAttenuation: false, transparent: true, opacity: 0.85, depthWrite: false }));
  scene.add(stars);
  const hemi = new THREE.HemisphereLight(0xb8ccff, 0x202a50, 1.0);
  scene.add(hemi);
  const front = new THREE.DirectionalLight(0xffffff, 0.9);
  front.position.set(0.3, 0.6, 1);
  scene.add(front);
  const sun = new THREE.DirectionalLight(0xfff2dc, 3.0);
  scene.add(sun, sun.target);
  const earthTex = canvasTex(1024, 512, (c, w, h) => {
    c.fillStyle = '#2f7fe0';
    c.fillRect(0, 0, w, h);
    const R = rng(4);
    for (let i = 0; i < 26; i++) {
      const x = R() * w, y = h * 0.15 + R() * h * 0.7, r = 30 + R() * 70;
      c.fillStyle = ['#4fb85a', '#62c768', '#3f9f4f'][i % 3];
      c.beginPath();
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2, rr = r * (0.6 + R() * 0.6);
        c.lineTo(x + Math.cos(a) * rr * 1.4, y + Math.sin(a) * rr);
      }
      c.fill();
    }
  });
  const earth = add(scene, new THREE.SphereGeometry(ER, 96, 64), std(0xffffff, 0.8, { map: earthTex }), [0, 0, 0], [0.3, -0.6, 0], [1, 1, 1], false);
  // atmosphere cutaway: annulus, denser (more opaque) near the ground
  const atmo = new THREE.Mesh(new THREE.RingGeometry(ER, ER + AH, 256, 1), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uR: { value: ER }, uH: { value: AH }, uOp: { value: 1 }, uCol: { value: col(0x5cc8ff) } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uR, uH, uOp; uniform vec3 uCol; varying vec2 vP;
      void main(){ float h = clamp((length(vP) - uR) / uH, 0.0, 1.0); float a = mix(0.9, 0.22, pow(h, 0.8));
        float edge = smoothstep(0.96, 1.0, h) * 0.5; gl_FragColor = vec4(uCol * (1.15 - 0.3 * h) + edge, (a + edge) * uOp);
        #include <colorspace_fragment>
      }`,
  }));
  atmo.position.z = 0.01;
  atmo.renderOrder = 2;
  scene.add(atmo);
  // a thin crisp outline at the top of the atmosphere
  const rim = new THREE.Mesh(new THREE.RingGeometry(ER + AH - 0.04, ER + AH, 256, 1), new THREE.MeshBasicMaterial({ color: 0xbff0ff, transparent: true, opacity: 0.8, depthWrite: false }));
  rim.position.z = 0.02;
  scene.add(rim);
  // sun
  const sunG = new THREE.Group();
  sunG.add(glow(0xfff6d0, 3.2, 1), glow(0xffe08a, 7, 0.55), glow(0xffd070, 13, 0.25));
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.9, 48), new THREE.MeshBasicMaterial({ color: 0xfff8e0 }));
  sunG.add(disc);
  sunG.position.z = 1;
  scene.add(sunG);
  // Affan on top of the world
  const aff = makeAffan();
  aff.root.scale.setScalar(0.3);
  aff.root.position.set(0, ER - 0.02, 0.4);
  scene.add(aff.root);
  // air dots inside the atmosphere band (twinkle)
  const R = rng(17);
  const dots = [];
  for (let i = 0; i < 160; i++) {
    const a = Math.PI * (0.35 + R() * 0.45), r = ER + 0.1 + Math.pow(R(), 1.6) * (AH - 0.2);
    const s = glow(0xe6f6ff, 0.22, 0.6);
    s.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.5);
    s.renderOrder = 3;
    scene.add(s);
    dots.push(s);
  }
  return { scene, stars, earth, atmo, sun, sunG, aff, dots, hemi };
}

// ------------------------------------------------------------------ outro
export function buildOutro() {
  const scene = new THREE.Scene();
  const bg = canvasTex(540, 960, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#2a7de1');
    gr.addColorStop(0.5, '#62b8ff');
    gr.addColorStop(0.8, '#ffc7a0');
    gr.addColorStop(1, '#ff9a6a');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
  });
  scene.background = bg;
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x6a7ab8, 1.5));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.4);
  key.position.set(3, 6, 8);
  shadowCfg(key, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd0b0, 2.0);
  rim.position.set(-6, 5, -6);
  scene.add(rim);
  const aff = makeAffan();
  scene.add(aff.root);
  const halo = glow(0xfff2b0, 9, 0.35);
  halo.position.set(0, 2.9, -2);
  scene.add(halo);
  return { scene, aff };
}
