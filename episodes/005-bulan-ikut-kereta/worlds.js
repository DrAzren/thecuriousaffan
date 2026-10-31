// Episode 005 sets: the night road (real-world car ride), Affan's science
// imagination world (toy road diorama) and the branded outro stage.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeSky, makeStars, makeMoon, makeGround, makeRoad, makeCar, makeTree, makeLamp, makeHouse, makeBush } from '../../shared/props.js';

export const CAR_SPEED = 12; // road world, units/s
export const carX = (t) => 200 - CAR_SPEED * t;

function shadowCfg(light, size, map = 2048) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  const c = light.shadow.camera;
  c.left = -size;
  c.right = size;
  c.top = size;
  c.bottom = -size;
  c.near = 1;
  c.far = 300;
  light.shadow.bias = -0.0005;
  light.shadow.normalBias = 0.02;
}

function seatbelt(aff) {
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.25, 0.03), new THREE.MeshStandardMaterial({ color: 0x2f3340, roughness: 0.7 }));
  strap.position.set(0.02, 0.5, 0.56);
  strap.rotation.set(-0.12, 0, -0.62);
  aff.parts.torso.add(strap);
  return strap;
}

// ------------------------------------------------------------------ road
export function buildRoadWorld() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1a2456, 0.0095);
  const sky = makeSky({ top: 0x050a24, mid: 0x14205a, horizon: 0x3b4b98, bottom: 0x0b1028 });
  const stars = makeStars(1500, 1600, 3);
  const moon = makeMoon(26);
  scene.add(sky, stars, moon);
  scene.add(new THREE.HemisphereLight(0x8098ea, 0x1a2036, 0.9));
  const moonLight = new THREE.DirectionalLight(0xd2ddff, 2.2);
  shadowCfg(moonLight, 7);
  scene.add(moonLight, moonLight.target);
  scene.add(makeGround(0x1d3a2b));
  scene.add(makeRoad({ x0: -720, x1: 460 }));

  const car = makeCar();
  car.rotation.y = Math.PI; // drives towards -x; its left side (window to the moon) faces +z
  scene.add(car);
  const aff = makeAffan();
  aff.root.scale.setScalar(0.32);
  aff.root.position.set(-0.92, 0.574, -0.45);
  car.add(aff.root);
  seatbelt(aff);
  const fill = new THREE.PointLight(0xffc49a, 0, 4, 2);
  car.add(fill);
  const lampLight = new THREE.PointLight(0xffc46a, 0, 20, 2);
  scene.add(lampLight);

  const R = rng(11);
  const lampHeads = [];
  const lamp = (x, z, dir) => {
    const l = makeLamp({ armDir: dir });
    l.position.set(x, 0, z);
    l.userData.prop = true;
    scene.add(l);
    lampHeads.push(new THREE.Vector3(x, 4.75, z + 1.2 * dir));
  };
  for (const [a, b] of [[-570, -250], [-70, 290]]) {
    for (let x = a; x < b; x += 18) {
      lamp(x, 5.3, -1);
      lamp(x + 9, -5.3, 1);
    }
    for (let x = a; x < b; x += 5 + R() * 5) {
      const tr = makeTree(R, { scale: 1 + R() * 0.4 });
      tr.position.set(x, 0, 7.3 + R() * 3);
      tr.userData.prop = true;
      scene.add(tr);
    }
    for (let x = a; x < b; x += 7 + R() * 7) {
      const tr = makeTree(R, { scale: 1 + R() * 0.3 });
      tr.position.set(x, 0, -7.3 - R() * 3);
      tr.userData.prop = true;
      scene.add(tr);
    }
    for (let x = a; x < b; x += 12 + R() * 7) {
      const h = makeHouse(R);
      h.position.set(x, 0, 16 + R() * 3);
      scene.add(h);
      const h2 = makeHouse(R);
      h2.position.set(x + 6, 0, -16 - R() * 3);
      h2.rotation.y = Math.PI;
      scene.add(h2);
    }
    for (let x = a; x < b; x += 6 + R() * 8) {
      const bu = makeBush(R);
      bu.position.set(x, 0, (R() < 0.5 ? 1 : -1) * (6.6 + R() * 0.6));
      scene.add(bu);
    }
  }
  // distant hills on the moon side for depth
  for (let i = 0; i < 40; i++) {
    const x = -760 + i * 30 + R() * 20;
    add(scene, new THREE.SphereGeometry(30 + R() * 30, 20, 12), new THREE.MeshStandardMaterial({ color: 0x1b2d3a, roughness: 1 }), [x, -12, 120 + R() * 60], [0, 0, 0], [1.6, 0.6, 1], false);
  }
  const props = scene.children.filter((o) => o.userData.prop);
  // Hide props that would sit right in front of (or around) the camera lens.
  const clearAround = (p, r = 3) => {
    for (const o of props) o.visible = Math.hypot(o.position.x - p.x, o.position.z - p.z) > r;
  };
  return { scene, sky, stars, moon, moonLight, car, aff, fill, lampLight, lampHeads, clearAround };
}

// ------------------------------------------------------------------- toy
function gridTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#7f8fe8';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(205,215,255,0.55)';
  g.lineWidth = 3;
  g.strokeRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(205,215,255,0.22)';
  g.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    g.beginPath();
    g.moveTo(i * 64, 0);
    g.lineTo(i * 64, 256);
    g.moveTo(0, i * 64);
    g.lineTo(256, i * 64);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(300, 300);
  t.anisotropy = 8;
  return t;
}

function sparkleField(n, seed, box) {
  const R = rng(seed);
  const pos = new Float32Array(n * 3), ph = new Float32Array(n), sz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos.set([box[0] + R() * (box[1] - box[0]), box[2] + R() * (box[3] - box[2]), box[4] + R() * (box[5] - box[4])], i * 3);
    ph[i] = R() * 100;
    sz[i] = 6 + R() * 16;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  g.setAttribute('aSz', new THREE.BufferAttribute(sz, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `attribute float aPh; attribute float aSz; uniform float uTime; varying float vA;
      void main(){ vec3 p = position; p.y += sin(uTime * 0.6 + aPh) * 0.25; vA = 0.5 + 0.5 * sin(uTime * 2.5 + aPh);
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = aSz * (6.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p);
      float star = max(0.0, 1.0 - abs(p.x) * 9.0) * max(0.0, 1.0 - abs(p.y) * 1.6) + max(0.0, 1.0 - abs(p.y) * 9.0) * max(0.0, 1.0 - abs(p.x) * 1.6);
      float a = (smoothstep(0.5, 0.0, d) * 0.5 + star) * vA; gl_FragColor = vec4(1.0, 0.95, 0.8, a); }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  pts.userData.update = (t) => (mat.uniforms.uTime.value = t);
  return pts;
}

export const TOY_SPEED = 1.7;

export function buildToyWorld() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x8c7de0, 28, 230);
  const sky = makeSky({ top: 0x1a1660, mid: 0x3c2d94, horizon: 0xa08ae8, bottom: 0x6a5cc0 });
  const stars = makeStars(1200, 1600, 8);
  const moon = makeMoon(46);
  moon.position.set(-14, 215, 900);
  scene.add(sky, stars, moon);
  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x6a58b8, 1.25));
  const moonLight = new THREE.DirectionalLight(0xf0f3ff, 2.3);
  moonLight.position.set(-14, 215, 900).normalize().multiplyScalar(80);
  shadowCfg(moonLight, 9);
  scene.add(moonLight, moonLight.target);
  const front = new THREE.DirectionalLight(0xffd8bc, 0.9);
  front.position.set(10, 14, -30);
  scene.add(front);

  const ground = add(scene, new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ map: gridTexture(), roughness: 0.9 }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  ground.receiveShadow = true;

  // toy road (x from -140 to 60), 1.4 wide
  const road = new THREE.Group();
  add(road, new THREE.PlaneGeometry(200, 1.4), new THREE.MeshStandardMaterial({ color: 0x484d78, roughness: 0.85 }), [-40, 0.01, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  for (const s of [-1, 1]) {
    add(road, new THREE.BoxGeometry(200, 0.05, 0.12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }), [-40, 0.025, 0.76 * s], [0, 0, 0], [1, 1, 1], false).receiveShadow = true;
  }
  const dashes = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.32, 0.06), new THREE.MeshBasicMaterial({ color: 0xfff1a8 }), 300);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  for (let i = 0; i < 300; i++) dashes.setMatrixAt(i, m.compose(new THREE.Vector3(-140 + i * 0.66, 0.015, 0), q, new THREE.Vector3(1, 1, 1)));
  road.add(dashes);
  scene.add(road);

  const car = makeCar({ color: 0xffbf3f, accent: 0xff7a45 });
  car.scale.setScalar(0.21);
  car.rotation.y = Math.PI;
  car.position.set(6, 0, 0.32);
  scene.add(car);

  const aff = makeAffan();
  scene.add(aff.root);

  const R = rng(21);
  const leafSets = [[0x7bd66a], [0x4fc48a], [0x9be05c], [0x3fb6a0]];
  const poles = [0xff6b6b, 0x4f8cff, 0xffb13b, 0xb36bff];
  const near = [];
  let kind = 0;
  for (let x = -130; x < 40; x += 0.75 + R() * 0.55) {
    let o;
    const k = kind++ % 3;
    if (k === 0) o = makeTree(R, { scale: 0.27, leaf: leafSets[Math.floor(R() * 4)], trunk: 0x9a6a45, toy: true });
    else if (k === 1) o = makeLamp({ scale: 0.17, pole: poles[Math.floor(R() * 4)], lamp: 0xfff0a0, armDir: 1, pool: false, light: 0.7 });
    else o = makeHouse(R, { scale: 0.19, walls: [0xffd6e0, 0xfff1b8, 0xc9f0ff, 0xd9ffd0], roofs: [0xff6b6b, 0x4f8cff, 0xffa53b, 0x9b6bff], toy: true });
    o.position.set(x, 0, -1.05 - (k === 2 ? 0 : R() * 0.25));
    if (k === 2) {
      o.rotation.y = Math.PI;
      o.scale.setScalar(0.6);
    }
    scene.add(o);
    near.push(o);
  }
  for (let x = -130; x < 40; x += 1.0 + R() * 0.9) {
    const k = Math.floor(R() * 3);
    let o;
    if (k === 0) o = makeTree(R, { scale: 0.3 + R() * 0.1, leaf: leafSets[Math.floor(R() * 4)], trunk: 0x9a6a45, toy: true });
    else if (k === 1) o = makeLamp({ scale: 0.17, pole: poles[Math.floor(R() * 4)], lamp: 0xfff0a0, armDir: -1, pool: false, light: 0.7 });
    else o = makeHouse(R, { scale: 0.2, walls: [0xffd6e0, 0xfff1b8, 0xc9f0ff, 0xd9ffd0], roofs: [0xff6b6b, 0x4f8cff, 0xffa53b, 0x9b6bff], toy: true });
    o.position.set(x, 0, 1.15 + (k === 2 ? 0.5 : 0) + R() * 0.8);
    scene.add(o);
  }
  // background: rounded hills and big lollipop trees
  for (let i = 0; i < 70; i++) {
    const x = -160 + i * 3.5 + R() * 2;
    const tr = makeTree(R, { scale: 0.6 + R() * 0.8, leaf: leafSets[Math.floor(R() * 4)], trunk: 0x9a6a45, toy: true });
    tr.position.set(x, 0, 6 + R() * 22);
    scene.add(tr);
  }
  for (let i = 0; i < 26; i++) {
    add(scene, new THREE.SphereGeometry(10 + R() * 14, 24, 14), new THREE.MeshStandardMaterial({ color: [0x6f7ee0, 0x7f6fd8, 0x5f8fe0][i % 3], roughness: 1 }), [-200 + i * 14, -5, 60 + R() * 50], [0, 0, 0], [1.6, 0.7, 1], false);
  }
  const sparkles = sparkleField(500, 4, [-90, 30, 0.3, 9, -4, 14]);
  scene.add(sparkles);
  return { scene, sky, stars, moon, moonLight, car, aff, sparkles, near };
}

export { RoundedBoxGeometry };
