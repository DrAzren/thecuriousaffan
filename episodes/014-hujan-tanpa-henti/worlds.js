// Episode 014 sets: a Malaysian kampung in the rain (stilt houses, drains,
// river, school, a hill that slides, an evacuation hall on high ground), with
// one flood-water surface whose level rises day by day, camera-following rain,
// moving storm clouds, sun and rainbow; plus the branded outro stage.
// Units are metres: Affan is scaled to ~1.1 m.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, lerp, clamp } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeSky, makeCar, makeTree, makeBush, glow } from '../../shared/props.js';

export const AFF_SCALE = 0.3;
const std = (color, rough = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

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

function signTex(text, { w = 1024, h = 256, bg = '#1f5fbf', fg = '#ffffff', size = 150, border = '#ffffff' } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = border;
  g.fillRect(0, 0, w, h);
  g.fillStyle = bg;
  g.fillRect(14, 14, w - 28, h - 28);
  g.fillStyle = fg;
  g.font = `800 ${size}px "Baloo 2", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + size * 0.06);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ------------------------------------------------------------- water surface
function makeWater() {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uRain: { value: 1 },
        uDeep: { value: new THREE.Color(0x6a5232) },
        uShallow: { value: new THREE.Color(0xa88a5c) },
        uSky: { value: new THREE.Color(0xc9d3dc) },
        uLight: { value: 1 },
      },
    ]),
    vertexShader: `#include <fog_pars_vertex>
      varying vec3 vW;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `#include <fog_pars_fragment>
      uniform float uTime, uRain, uLight; uniform vec3 uDeep, uShallow, uSky; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float rings(vec2 p, float s, float t){
        vec2 c = floor(p / s); float acc = 0.0;
        for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
          vec2 cc = c + vec2(float(i), float(j));
          float r0 = h(cc); vec2 o = (cc + vec2(h(cc + 7.1), h(cc + 3.3))) * s;
          float ph = fract(t * (0.9 + r0 * 0.6) + r0 * 10.0);
          float d = length(p - o); float rr = ph * s * 0.7;
          acc += smoothstep(0.035, 0.0, abs(d - rr)) * (1.0 - ph);
        }
        return acc;
      }
      void main(){
        vec3 V = normalize(cameraPosition - vW);
        float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
        float sw = 0.5 + 0.5 * sin(vW.x * 0.35 + uTime * 0.8) * sin(vW.z * 0.31 - uTime * 0.6);
        vec3 c = mix(uDeep, uShallow, 0.35 + 0.3 * sw);
        c = mix(c, uSky, 0.12 + 0.45 * fres);
        float r = rings(vW.xz, 0.9, uTime) + 0.6 * rings(vW.xz + 13.0, 0.55, uTime * 1.3);
        c += vec3(0.85, 0.9, 1.0) * r * 0.32 * uRain;
        c *= uLight;
        gl_FragColor = vec4(c, 0.93);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat);
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 2;
  m.receiveShadow = false;
  return m;
}

// --------------------------------------------------------- rain (instanced)
function makeRain(n = 9000) {
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  const R = rng(77);
  const base = new Float32Array(n * 3), rnd = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    base.set([R(), R(), R()], i * 3);
    rnd[i] = R();
  }
  geo.setAttribute('aBase', new THREE.InstancedBufferAttribute(base, 3));
  geo.setAttribute('aRnd', new THREE.InstancedBufferAttribute(rnd, 1));
  geo.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uAmt: { value: 1 }, uBox: { value: new THREE.Vector3(36, 26, 36) }, uColor: { value: new THREE.Color(0xdfe9f5) } },
    vertexShader: `attribute vec3 aBase; attribute float aRnd; uniform float uTime, uAmt; uniform vec3 uCam, uBox; varying float vA; varying float vY;
      void main(){
        vec3 vel = vec3(1.2, -11.0 - aRnd * 3.0, 0.4);
        vec3 p = aBase * uBox + vel * uTime;
        p = mod(p - (uCam - uBox * 0.5), uBox) + (uCam - uBox * 0.5);
        vec3 dir = normalize(vel);
        vec3 toCam = normalize(cameraPosition - p);
        vec3 side = normalize(cross(dir, toCam));
        float len = 0.55 + aRnd * 0.35;
        vec3 wp = p + side * position.x * 0.022 + dir * position.y * len;
        float d = length(cameraPosition - p);
        vA = (aRnd < uAmt ? 1.0 : 0.0) * smoothstep(1.3, 2.6, d) * (1.0 - smoothstep(14.0, 18.0, d));
        vY = position.y;
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: `uniform vec3 uColor; varying float vA; varying float vY;
      void main(){ float a = vA * 0.5 * smoothstep(0.0, 0.5, vY) * smoothstep(1.0, 0.6, vY); if (a < 0.003) discard;
        gl_FragColor = vec4(uColor, a);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  mesh.userData.update = (t, cam, amt) => {
    mat.uniforms.uTime.value = t;
    mat.uniforms.uCam.value.copy(cam.position);
    mat.uniforms.uAmt.value = amt;
    mesh.visible = amt > 0.001;
  };
  return mesh;
}

// ----------------------------------------------------------------- clouds
function makeClouds(R) {
  const g = new THREE.Group();
  const mats = [std(0x8a94a3, 1), std(0x9aa3b0, 1), std(0x7b8494, 1)];
  const geo = new THREE.IcosahedronGeometry(1, 3);
  for (let i = 0; i < 46; i++) {
    const c = new THREE.Group();
    const x = -110 + R() * 200, z = -90 + R() * 120, y = 24 + R() * 10;
    c.position.set(x, y, z);
    const k = 4 + Math.floor(R() * 4);
    for (let j = 0; j < k; j++) {
      const s = 4 + R() * 5;
      const m = new THREE.Mesh(geo, mats[j % 3]);
      m.position.set((j - k / 2) * 3.4 + R() * 2, R() * 2.2, (R() - 0.5) * 5);
      m.scale.set(s, s * 0.7, s);
      c.add(m);
    }
    g.add(c);
  }
  g.userData.mats = mats;
  return g;
}

function makeRainbow() {
  const geo = new THREE.RingGeometry(52, 62, 96, 1, 0, Math.PI);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
    uniforms: { uO: { value: 0 } },
    vertexShader: 'varying float vR; void main(){ vR = (length(position.xy) - 52.0) / 10.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uO; varying float vR;
      vec3 band(float r){ r = clamp(r, 0.0, 1.0); return clamp(abs(mod(r * 4.2 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
      void main(){ float edge = smoothstep(0.0, 0.12, vR) * smoothstep(1.0, 0.88, vR);
        gl_FragColor = vec4(band(1.0 - vR), uO * edge * 0.75);
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

// ------------------------------------------------------------------ props
function prism(w, h, d) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return g;
}

// Traditional stilt house (rumah panggung). Front (veranda) faces -z.
export function makeStiltHouse(R, { wall = 0xb07a4a, trim = 0xf4e3c0, roof = 0xc0473a, stilt = 1.6, w = 6, d = 5, hw = 2.5 } = {}) {
  const g = new THREE.Group();
  const wood = std(0x7a5233, 0.9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) add(g, new THREE.BoxGeometry(0.2, stilt, 0.2), wood, [(-w / 2 + 0.3) + i * (w - 0.6) / 2, stilt / 2, (-d / 2 + 0.3) + j * (d - 0.6) / 2]);
  for (let i = 0; i < 3; i++) add(g, new THREE.BoxGeometry(0.2, stilt, 0.2), wood, [(-w / 2 + 0.3) + i * (w - 0.6) / 2, stilt / 2, -d / 2 - 1.5]);
  add(g, new THREE.BoxGeometry(w + 0.2, 0.18, d + 1.8), std(0x8a5e3b, 0.85), [0, stilt + 0.09, -0.85]);
  add(g, new THREE.BoxGeometry(w, hw, d), std(wall, 0.9), [0, stilt + 0.18 + hw / 2, 0]);
  // trim bands
  add(g, new THREE.BoxGeometry(w + 0.04, 0.14, d + 0.04), std(trim, 0.7), [0, stilt + 0.2 + hw, 0]);
  add(g, new THREE.BoxGeometry(w + 0.04, 0.14, d + 0.04), std(trim, 0.7), [0, stilt + 0.25, 0]);
  // windows + door on the front
  const winM = std(0x3a2a20, 0.6), lit = new THREE.MeshBasicMaterial({ color: 0xffd28a });
  for (const x of [-w * 0.3, w * 0.3]) {
    add(g, new THREE.PlaneGeometry(1.0, 1.0), R() < 0.6 ? lit : winM, [x, stilt + 1.45, -d / 2 - 0.01], [0, Math.PI, 0], [1, 1, 1], false);
    add(g, new THREE.BoxGeometry(1.2, 0.12, 0.1), std(trim, 0.7), [x, stilt + 0.9, -d / 2 - 0.05]);
  }
  add(g, new THREE.PlaneGeometry(0.95, 1.9), std(0x5a3a22, 0.8), [0, stilt + 1.15, -d / 2 - 0.01], [0, Math.PI, 0], [1, 1, 1], false);
  // veranda railing
  const rail = std(trim, 0.7);
  add(g, new THREE.BoxGeometry(w, 0.08, 0.08), rail, [0, stilt + 0.62, -d / 2 - 1.65]);
  for (let i = 0; i <= 12; i++) add(g, new THREE.BoxGeometry(0.06, 0.44, 0.06), rail, [-w / 2 + i * (w / 12), stilt + 0.4, -d / 2 - 1.65]);
  // main gable roof (ridge along x) + veranda roof
  const rm = std(roof, 0.6);
  const r = add(g, prism(d + 1.6, 2.2, w + 0.8), rm, [0, stilt + 0.18 + hw, 0], [0, Math.PI / 2, 0]);
  r.castShadow = true;
  add(g, new THREE.BoxGeometry(w + 0.6, 0.1, 2.0), rm, [0, stilt + 0.18 + hw - 0.2, -d / 2 - 0.9], [-0.28, 0, 0]);
  // stairs down to the ground
  for (let i = 0; i < 6; i++) add(g, new THREE.BoxGeometry(1.1, 0.08, 0.32), wood, [w / 2 - 0.9, stilt - i * (stilt / 6), -d / 2 - 1.8 - i * 0.3]);
  g.userData.floor = stilt + 0.18;
  g.userData.veranda = new THREE.Vector3(0, stilt + 0.18, -d / 2 - 0.9);
  return g;
}

function makePalm(R, s = 1) {
  const g = new THREE.Group();
  const h = (6 + R() * 3) * s;
  const lean = (R() - 0.5) * 0.5;
  const trunkM = std(0x8b6b4a, 0.95);
  const segs = 8;
  let p = new THREE.Vector3();
  for (let i = 0; i < segs; i++) {
    const k = i / segs;
    const q = new THREE.Vector3(Math.sin(lean) * h * k * k, h * k, 0);
    const n = new THREE.Vector3(Math.sin(lean) * h * ((i + 1) / segs) ** 2, h * (i + 1) / segs, 0);
    const len = q.distanceTo(n);
    const m = add(g, new THREE.CylinderGeometry(0.17 * s, 0.21 * s, len * 1.05, 8), trunkM, [(q.x + n.x) / 2, (q.y + n.y) / 2, 0]);
    m.rotation.z = -Math.atan2(n.x - q.x, n.y - q.y);
    p = n;
  }
  const leafM = std(0x3f8f3a, 0.8, { side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + R();
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.45 * s, 3.6 * s, 4, 1), leafM);
    leaf.scale.set(1, 1, 0.18);
    leaf.position.copy(p);
    leaf.rotation.set(0, a, 0);
    leaf.rotateX(1.95 + R() * 0.3);
    leaf.translateY(1.6 * s);
    leaf.castShadow = true;
    g.add(leaf);
  }
  add(g, new THREE.SphereGeometry(0.35 * s, 10, 8), std(0x6b4a2a, 0.8), [p.x, p.y - 0.2, 0]);
  return g;
}

export function makePerson(R, { shirt = 0x4f8cff, umbrella = 0xff5a6a, scale = 1 } = {}) {
  const g = new THREE.Group();
  add(g, new THREE.CapsuleGeometry(0.22, 0.75, 4, 10), std(shirt, 0.8), [0, 0.65, 0]);
  add(g, new THREE.SphereGeometry(0.2, 14, 10), std(0xd99a70, 0.6), [0, 1.42, 0]);
  add(g, new THREE.CylinderGeometry(0.015, 0.015, 1.0, 6), std(0x333333, 0.5), [0.22, 1.55, 0]);
  add(g, new THREE.ConeGeometry(0.85, 0.42, 10, 1, true), std(umbrella, 0.6, { side: THREE.DoubleSide }), [0.22, 2.05, 0]);
  g.scale.setScalar(scale);
  return g;
}

function makeBoat() {
  const g = new THREE.Group();
  const hull = new THREE.Shape();
  hull.moveTo(-2, 0.4);
  hull.lineTo(1.6, 0.4);
  hull.lineTo(2.4, 0);
  hull.lineTo(1.6, -0.4);
  hull.lineTo(-2, -0.4);
  hull.closePath();
  const geo = new THREE.ExtrudeGeometry(hull, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2 });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0.45, 0);
  add(g, geo, std(0xff7a1a, 0.5));
  add(g, new THREE.BoxGeometry(3.4, 0.08, 0.95), std(0xffffff, 0.6), [-0.2, 0.47, 0]);
  const p1 = makePerson(null, { shirt: 0xff9a2a, umbrella: 0xffd23f, scale: 0.8 });
  p1.children.slice(2).forEach((m) => (m.visible = false));
  p1.position.set(-1.2, 0.3, 0);
  g.add(p1);
  const p2 = makePerson(null, { shirt: 0xff9a2a, umbrella: 0xffd23f, scale: 0.8 });
  p2.children.slice(2).forEach((m) => (m.visible = false));
  p2.position.set(0.6, 0.3, 0);
  g.add(p2);
  return g;
}

// ---------------------------------------------------------------- kampung
export const RIVER = { z0: 15, z1: 23 };

export function buildKampung() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xaeb8c4, 0.012);
  const sky = makeSky({ top: 0x6e7a8c, mid: 0x8d98a8, horizon: 0xb9c2cc, bottom: 0x8f9aa5, radius: 600 });
  scene.add(sky);
  const hemi = new THREE.HemisphereLight(0xdde6f0, 0x4d5a3c, 1.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.1);
  sun.position.set(-30, 50, -40);
  shadowCfg(sun, 45);
  scene.add(sun, sun.target);
  const R = rng(14);

  // ground strips with gaps for the two drains and the river
  const grass = std(0x5d8f45, 0.95);
  const strip = (z0, z1, mat = grass, y = 0) => {
    const m = add(scene, new THREE.PlaneGeometry(600, z1 - z0), mat, [0, y, (z0 + z1) / 2], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
    m.receiveShadow = true;
    return m;
  };
  strip(-300, -4.2);
  strip(-3.4, 3.4, std(0x7d7a6a, 0.95));
  strip(4.2, RIVER.z0);
  strip(RIVER.z1, 300);
  // road
  add(scene, new THREE.PlaneGeometry(600, 5.4), std(0x3a3d48, 0.85), [0, 0.01, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.5, 0.14), new THREE.MeshBasicMaterial({ color: 0xf2efe6 }), 120);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  for (let i = 0; i < 120; i++) dash.setMatrixAt(i, mtx.compose(new THREE.Vector3(-300 + i * 5, 0.015, 0), q, new THREE.Vector3(1, 1, 1)));
  scene.add(dash);
  // drains (longkang): concrete U-channels
  const conc = std(0x9a9a92, 0.9);
  for (const s of [-1, 1]) {
    const zc = s * 3.8;
    add(scene, new THREE.PlaneGeometry(600, 0.8), std(0x6c6c66, 0.9), [0, -0.75, zc], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
    add(scene, new THREE.PlaneGeometry(600, 0.75), conc, [0, -0.375, zc - 0.4], [0, 0, 0], [1, 1, 1], false);
    add(scene, new THREE.PlaneGeometry(600, 0.75), conc, [0, -0.375, zc + 0.4], [0, Math.PI, 0], [1, 1, 1], false);
    add(scene, new THREE.BoxGeometry(600, 0.08, 0.12), std(0xc8c8c0, 0.8), [0, 0.04, zc - 0.43], [0, 0, 0], [1, 1, 1], false);
    add(scene, new THREE.BoxGeometry(600, 0.08, 0.12), std(0xc8c8c0, 0.8), [0, 0.04, zc + 0.43], [0, 0, 0], [1, 1, 1], false);
  }
  // river channel: muddy bed and banks
  const mud = std(0x7a5f3e, 1);
  add(scene, new THREE.PlaneGeometry(600, RIVER.z1 - RIVER.z0), mud, [0, -2.2, (RIVER.z0 + RIVER.z1) / 2], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.PlaneGeometry(600, 2.2), mud, [0, -1.1, RIVER.z0], [0, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.PlaneGeometry(600, 2.2), mud, [0, -1.1, RIVER.z1], [0, Math.PI, 0], [1, 1, 1], false);

  // houses: north row (front faces the road, -z) and south row (rotated)
  const houses = [];
  const roofs = [0xc0473a, 0x3f6f9e, 0x8a8f99, 0xb5563a, 0x5f8f6a];
  const walls = [0xb07a4a, 0xc89a62, 0x9a6a42, 0xd9b58a];
  let home = null;
  for (let i = 0; i < 9; i++) {
    const x = -44 + i * 11 + R() * 2;
    const h = makeStiltHouse(R, { roof: roofs[i % 5], wall: walls[i % 4], w: 5.5 + R(), d: 4.5 + R() });
    h.position.set(x, 0, 10.2);
    scene.add(h);
    houses.push(h);
    if (i === 4) home = h;
    const h2 = makeStiltHouse(R, { roof: roofs[(i + 2) % 5], wall: walls[(i + 1) % 4], w: 5.5 + R(), d: 4.5 + R() });
    h2.position.set(x + 5, 0, -10.2);
    h2.rotation.y = Math.PI;
    if (i !== 2 && i !== 3 && i !== 5) {
      scene.add(h2);
      houses.push(h2);
    }
  }
  // school (two storeys) on the south side
  const school = new THREE.Group();
  school.position.set(-16, 0, -14);
  add(school, new THREE.BoxGeometry(16, 7, 6), std(0xf2e6c4, 0.85), [0, 3.5, 0]);
  add(school, new THREE.BoxGeometry(16.4, 0.3, 6.6), std(0x3f6fb5, 0.6), [0, 7.15, 0]);
  add(school, new THREE.BoxGeometry(16.2, 0.25, 0.4), std(0x3f6fb5, 0.6), [0, 3.55, 3.1]);
  for (let i = 0; i < 6; i++) for (const y of [1.8, 5.3]) add(school, new THREE.PlaneGeometry(1.6, 1.4), std(0x6f9fd0, 0.3), [-6.5 + i * 2.6, y, 3.01], [0, 0, 0], [1, 1, 1], false);
  add(school, new THREE.PlaneGeometry(6, 1.4), new THREE.MeshBasicMaterial({ map: signTex('SEKOLAH', { bg: '#2f6fd6' }) }), [0, 8.2, 3.02], [0, 0, 0], [1, 1, 1], false);
  add(school, new THREE.BoxGeometry(0.2, 1.3, 0.2), std(0x555555, 0.5), [-2.6, 7.6, 3.0]);
  add(school, new THREE.BoxGeometry(0.2, 1.3, 0.2), std(0x555555, 0.5), [2.6, 7.6, 3.0]);
  scene.add(school);

  // landslide hill (east) and evacuation hill (west) on the south side
  const hillM = std(0x4f8a3f, 0.95);
  const slideHill = add(scene, new THREE.SphereGeometry(16, 40, 24), hillM, [30, -4, -34], [0, 0, 0], [1.2, 0.75, 1]);
  slideHill.receiveShadow = true;
  const scar = add(scene, new THREE.SphereGeometry(4.2, 24, 16), std(0x8a5a32, 1), [22.5, 4.2, -24.3], [0, 0, 0], [1.1, 1.0, 0.5], false);
  const slab = new THREE.Group();
  add(slab, new THREE.SphereGeometry(3.6, 20, 14), std(0x7a4f2c, 1), [0, 0, 0], [1.2, 0.6, 0.9]);
  add(slab, new THREE.SphereGeometry(3.6, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2.4), std(0x4f8a3f, 0.95), [0, 0.12, 0], [1.22, 0.62, 0.92]);
  for (let i = 0; i < 3; i++) {
    const tr = makeTree(R, { scale: 0.9, leaf: [0x3f7f3a, 0x4f8f45, 0x2f6f35] });
    tr.position.set(-1.6 + i * 1.6, 1.4, (R() - 0.5) * 1.5);
    slab.add(tr);
  }
  slab.position.set(22.8, 4.8, -24.0);
  scene.add(slab);
  slab.userData.from = slab.position.clone();
  slab.userData.to = new THREE.Vector3(19.5, 0.4, -15.5);
  const evacHill = add(scene, new THREE.SphereGeometry(18, 40, 24), hillM, [-40, -6, -36], [0, 0, 0], [1.3, 0.72, 1]);
  evacHill.receiveShadow = true;
  const hall = new THREE.Group();
  hall.position.set(-40, 6.75, -33);
  add(hall, new THREE.BoxGeometry(13.4, 4.4, 10.6), std(0xc9b394, 0.95), [0, -2.5, 1.0]);
  for (let i = 0; i < 5; i++) add(hall, new THREE.BoxGeometry(2.4, 0.3, 0.5), std(0xb9b9b0, 0.9), [1.6, -0.3 - i * 0.42, 6.3 + i * 0.5]);
  add(hall, new THREE.BoxGeometry(12, 4, 7), std(0xf0f0e6, 0.85), [0, 1.6, 0]);
  add(hall, prism(8.4, 2.4, 13), std(0x2f8f6a, 0.6), [0, 3.6, 0], [0, Math.PI / 2, 0]);
  add(hall, new THREE.BoxGeometry(13, 0.12, 2.4), std(0x2f8f6a, 0.6), [0, 3.4, 4.6], [0.25, 0, 0]);
  for (const x of [-6, -2, 2, 6]) add(hall, new THREE.BoxGeometry(0.2, 3.4, 0.2), std(0xdedede, 0.6), [x, 1.7, 5.6]);
  add(hall, new THREE.BoxGeometry(13, 0.3, 3.2), std(0xb9b9b0, 0.9), [0, -0.15, 4.4]);
  add(hall, new THREE.PlaneGeometry(9, 1.3), new THREE.MeshBasicMaterial({ map: signTex('PUSAT PEMINDAHAN', { bg: '#e0472f', size: 120, w: 1280 }) }), [0, 2.75, 3.52], [0, 0, 0], [1, 1, 1], false);
  add(hall, new THREE.PlaneGeometry(2.2, 2.4), std(0x6a4a30, 0.8), [0, 1.0, 3.51], [0, 0, 0], [1, 1, 1], false);
  const lit = new THREE.MeshBasicMaterial({ color: 0xffe2a0 });
  for (const x of [-4.2, 4.2]) add(hall, new THREE.PlaneGeometry(1.8, 1.2), lit, [x, 1.8, 3.51], [0, 0, 0], [1, 1, 1], false);
  scene.add(hall);
  // path of people walking up to the hall
  const people = [];
  const cols = [[0x4f8cff, 0xff5a6a], [0xffb13b, 0x3fb6a0], [0xe8606a, 0x4f8cff], [0x7dcf5a, 0xffd23f], [0xb36bff, 0xff8a3d], [0x3fb6a0, 0xe8606a]];
  cols.forEach(([s, u]) => {
    const p = makePerson(R, { shirt: s, umbrella: u });
    scene.add(p);
    people.push(p);
  });

  // palms and trees scattered on the flats
  for (let i = 0; i < 40; i++) {
    const x = -70 + R() * 140;
    const zs = [[5.5, 14], [-14, -5.5], [24, 50], [-60, -18]];
    const [z0, z1] = zs[i % 4];
    const z = z0 + R() * (z1 - z0);
    if (Math.abs(x + 16) < 10 && z < -8 && z > -20) continue;
    if (Math.hypot(x + 39, z + 27) < 16 || Math.hypot(x - 24, z + 24) < 9 || Math.hypot(x - 13, z + 9) < 8) continue;
    const p = R() < 0.55 ? makePalm(R, 0.9 + R() * 0.3) : makeTree(R, { scale: 1.2 + R() * 0.5, leaf: [0x3f7f3a, 0x4f8f45, 0x2f6f35] });
    p.position.set(x, 0, z);
    scene.add(p);
  }
  for (let i = 0; i < 26; i++) {
    const b = makeBush(R, { scale: 0.8, color: 0x3f7a35 });
    b.position.set(-60 + R() * 120, 0, (R() < 0.5 ? 1 : -1) * (5 + R() * 1.2));
    scene.add(b);
  }
  // distant forested hills
  for (let i = 0; i < 18; i++) add(scene, new THREE.SphereGeometry(30 + R() * 25, 24, 12), std([0x4a7a4a, 0x557f50, 0x46704a][i % 3], 1), [-260 + i * 30, -10, 120 + R() * 50], [0, 0, 0], [1.5, 0.7, 1], false);
  for (let i = 0; i < 12; i++) add(scene, new THREE.SphereGeometry(30 + R() * 25, 24, 12), std([0x4a7a4a, 0x557f50, 0x46704a][i % 3], 1), [-200 + i * 36, -10, -130 - R() * 40], [0, 0, 0], [1.5, 0.7, 1], false);

  const car = makeCar({ color: 0xe8453c, accent: 0xffd23f });
  car.position.set(-1, 0, 6.2);
  car.scale.setScalar(0.95);
  scene.add(car);
  const movingCar = makeCar({ color: 0x3f8cff, accent: 0xffd23f });
  movingCar.scale.setScalar(0.95);
  scene.add(movingCar);
  const boat = makeBoat();
  scene.add(boat);

  // puddles on the road (flash flood)
  const puddleM = new THREE.MeshBasicMaterial({ color: 0x8a9bb0, transparent: true, opacity: 0.85 });
  const puddles = [];
  for (let i = 0; i < 16; i++) {
    const p = add(scene, new THREE.CircleGeometry(1, 28), puddleM, [-20 + i * 2.7 + R() * 1.5, 0.03, (R() - 0.5) * 4], [-Math.PI / 2, 0, 0], [1.2 + R(), 0.7 + R() * 0.5, 1], false);
    p.userData.k = R();
    puddles.push(p);
  }

  const water = makeWater();
  scene.add(water);
  const rain = makeRain();
  scene.add(rain);
  const clouds = makeClouds(R);
  scene.add(clouds);
  const sunDisc = glow(0xfff2b0, 60, 1);
  sunDisc.position.set(40, 90, -220);
  scene.add(sunDisc);
  const rainbow = makeRainbow();
  rainbow.position.set(-10, -8, 170);
  rainbow.rotation.y = Math.PI;
  scene.add(rainbow);

  const aff = makeAffan();
  aff.root.scale.setScalar(AFF_SCALE);
  scene.add(aff.root);
  const fill = new THREE.PointLight(0xffe6cc, 0, 8, 2);
  scene.add(fill);

  // mood: 0 = light rain (start), 1 = heavy grey, 2 = dark storm, 3 = clearing blue
  const skies = [
    { top: 0x7c8899, mid: 0x98a3b2, horizon: 0xc3cbd4, fog: 0xb4bec9, hemi: 1.5, sun: 1.0, dens: 0.010 },
    { top: 0x5f6a7a, mid: 0x7d8796, horizon: 0xa4adb8, fog: 0x9aa4b0, hemi: 1.3, sun: 0.7, dens: 0.014 },
    { top: 0x3a4250, mid: 0x535c6b, horizon: 0x7a8390, fog: 0x6f7884, hemi: 1.0, sun: 0.35, dens: 0.018 },
    { top: 0x2f78d6, mid: 0x5aa2ea, horizon: 0xbfe2ff, fog: 0xc8e2f5, hemi: 1.7, sun: 2.3, dens: 0.006 },
  ];
  const ca = new THREE.Color(), cb = new THREE.Color();
  const mix = (a, b, k) => ca.setHex(a).lerp(cb.setHex(b), k);
  function setMood(m) {
    const i = Math.min(2, Math.floor(m));
    const k = clamp(m - i);
    const A = skies[i], B = skies[i + 1];
    const u = sky.material.uniforms;
    u.top.value.copy(mix(A.top, B.top, k));
    u.mid.value.copy(mix(A.mid, B.mid, k));
    u.horizon.value.copy(mix(A.horizon, B.horizon, k));
    u.bottom.value.copy(mix(A.horizon, B.horizon, k));
    scene.fog.color.copy(mix(A.fog, B.fog, k));
    scene.fog.density = lerp(A.dens, B.dens, k);
    hemi.intensity = lerp(A.hemi, B.hemi, k);
    sun.intensity = lerp(A.sun, B.sun, k);
    water.material.uniforms.uSky.value.copy(mix(A.horizon, B.horizon, k));
    for (const mt of clouds.userData.mats) mt.color.copy(mix([0x9aa3b0, 0x7d8696, 0x4f5766, 0xf4f6fa][i], [0x9aa3b0, 0x7d8696, 0x4f5766, 0xf4f6fa][i + 1], k));
  }

  return { scene, fill, sky, hemi, sun, water, rain, clouds, sunDisc, rainbow, aff, houses, home, school, slab, scar, hall, people, car, movingCar, boat, puddles, setMood };
}

// ----------------------------------------------------------------- outro
export function buildOutro() {
  const scene = new THREE.Scene();
  const c = document.createElement('canvas');
  c.width = 540;
  c.height = 960;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(270, 380, 40, 270, 420, 700);
  gr.addColorStop(0, '#8fd0ff');
  gr.addColorStop(0.45, '#3f9cf2');
  gr.addColorStop(1, '#1a5fcf');
  g.fillStyle = gr;
  g.fillRect(0, 0, 540, 960);
  const bg = new THREE.CanvasTexture(c);
  bg.colorSpace = THREE.SRGBColorSpace;
  scene.background = bg;
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x6a7ab8, 1.5));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.4);
  key.position.set(3, 6, 8);
  shadowCfg(key, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfe0ff, 2.0);
  rim.position.set(-6, 5, -6);
  scene.add(rim);
  const aff = makeAffan();
  scene.add(aff.root);
  const halo = glow(0xfff2b0, 9, 0.35);
  halo.position.set(0, 2.9, -2);
  scene.add(halo);
  return { scene, aff };
}

export { RoundedBoxGeometry };
