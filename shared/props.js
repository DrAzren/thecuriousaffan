// Reusable set pieces: sky, stars, moon, glows, road, car, trees, lamp posts,
// houses. Everything is procedural (no external models) and deterministic.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from './core.js';

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

export function add(parent, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.scale.set(...scale);
  m.castShadow = shadow;
  m.receiveShadow = shadow;
  parent.add(m);
  return m;
}

// ---------------------------------------------------------------- textures
function canvasTex(size, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export const glowTex = canvasTex(256, (g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.2, 'rgba(255,255,255,0.55)');
  r.addColorStop(0.5, 'rgba(255,255,255,0.14)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, s, s);
});

export function glow(color, size, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.scale.set(size, size, 1);
  return s;
}

const moonTex = canvasTex(1024, (g, s) => {
  g.fillStyle = '#f7f0dc';
  g.fillRect(0, 0, s, s);
  const R = rng(7);
  // soft maria
  for (let i = 0; i < 14; i++) {
    const x = R() * s, y = s * 0.25 + R() * s * 0.5, r = s * (0.04 + R() * 0.09);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(196,186,160,0.55)');
    gr.addColorStop(1, 'rgba(196,186,160,0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // craters
  for (let i = 0; i < 70; i++) {
    const x = R() * s, y = s * 0.15 + R() * s * 0.7, r = s * (0.006 + R() * R() * 0.035);
    g.fillStyle = 'rgba(180,168,140,0.45)';
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,252,240,0.6)';
    g.lineWidth = r * 0.25;
    g.beginPath();
    g.arc(x - r * 0.12, y - r * 0.12, r, Math.PI * 0.9, Math.PI * 1.7);
    g.stroke();
  }
});

// ------------------------------------------------------------- sky & stars
export function makeSky({ top = 0x070d2b, mid = 0x1a2a6c, horizon = 0x4a5fb0, bottom = 0x0a0f24, radius = 1800 } = {}) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, mid: { value: new THREE.Color(mid) }, horizon: { value: new THREE.Color(horizon) }, bottom: { value: new THREE.Color(bottom) } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, mid, horizon, bottom; varying vec3 vDir;
      void main(){ float y = vDir.y; vec3 c;
        if (y > 0.0) { c = mix(horizon, mid, smoothstep(0.0, 0.22, y)); c = mix(c, top, smoothstep(0.22, 0.75, y)); }
        else c = mix(horizon, bottom, smoothstep(0.0, 0.08, -y));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), mat);
  m.renderOrder = -10;
  return m;
}

export function makeStars(n = 1400, radius = 1600, seed = 3) {
  const R = rng(seed);
  const pos = new Float32Array(n * 3), ph = new Float32Array(n), sz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const y = 0.04 + Math.pow(R(), 0.8) * 0.96;
    const a = R() * Math.PI * 2;
    const r = Math.sqrt(1 - y * y);
    pos.set([Math.cos(a) * r * radius, y * radius, Math.sin(a) * r * radius], i * 3);
    ph[i] = R() * 100;
    sz[i] = 1.5 + Math.pow(R(), 4) * 5.5;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  g.setAttribute('aSz', new THREE.BufferAttribute(sz, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 } },
    vertexShader: `attribute float aPh; attribute float aSz; uniform float uTime; varying float vA;
      void main(){ vA = 0.55 + 0.45 * sin(uTime * (1.2 + fract(aPh) * 2.0) + aPh);
        gl_PointSize = aSz * (0.8 + 0.3 * vA); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uAlpha; varying float vA; void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p);
        float a = smoothstep(0.5, 0.0, d); a = a * a; gl_FragColor = vec4(vec3(1.0, 0.97, 0.9), a * vA * uAlpha); }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.renderOrder = -9;
  pts.frustumCulled = false;
  pts.userData.update = (t) => (mat.uniforms.uTime.value = t);
  return pts;
}

export function makeMoon(radius = 40) {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), new THREE.MeshBasicMaterial({ map: moonTex, color: 0xfff4da, fog: false }));
  ball.rotation.y = -Math.PI / 2;
  g.add(ball);
  const g1 = glow(0xfff1c8, radius * 3.2, 0.55);
  const g2 = glow(0xa9c4ff, radius * 7, 0.35);
  g.add(g1, g2);
  g.userData.ball = ball;
  return g;
}

// ----------------------------------------------------------------- ground
export function makeGround(color = 0x23402f, size = 3000) {
  return add(new THREE.Group(), new THREE.PlaneGeometry(size, size), std(color, 0.95), [0, -0.01, 0], [-Math.PI / 2, 0, 0]);
}

// Straight road along x, centred on z = 0.
export function makeRoad({ x0 = -700, x1 = 400, width = 7, asphalt = 0x2a2e3b, line = 0xf2efe6, edge = 0xd8d4c8, curb = 0x7f8494, dash = 3, gap = 3 } = {}) {
  const g = new THREE.Group();
  const len = x1 - x0, cx = (x0 + x1) / 2;
  add(g, new THREE.PlaneGeometry(len, width), std(asphalt, 0.9), [cx, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  for (const s of [-1, 1]) {
    add(g, new THREE.PlaneGeometry(len, 0.14), std(edge, 0.7), [cx, 0.005, s * (width / 2 - 0.3)], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
    add(g, new THREE.BoxGeometry(len, 0.18, 1.2), std(curb, 0.85), [cx, 0.09, s * (width / 2 + 0.6)], [0, 0, 0], [1, 1, 1], false).receiveShadow = true;
  }
  const n = Math.floor(len / (dash + gap));
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(dash, 0.16), std(line, 0.6, { emissive: line, emissiveIntensity: 0.08 }), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  for (let i = 0; i < n; i++) im.setMatrixAt(i, m.compose(new THREE.Vector3(x0 + i * (dash + gap) + dash / 2, 0.006, 0), q, new THREE.Vector3(1, 1, 1)));
  g.add(im);
  return g;
}

// -------------------------------------------------------------------- car
// Rounded family car, forward = +x, left = -z. ~4.4 long, ~2 tall.
export function makeCar({ color = 0xffbf3f, accent = 0xff7a45 } = {}) {
  const car = new THREE.Group();
  const body = new THREE.Group();
  car.add(body);
  const paint = std(color, 0.32, { metalness: 0.15, emissive: color, emissiveIntensity: 0.05 });
  const dark = std(0x23262f, 0.6);
  const chrome = std(0xdfe3ea, 0.25, { metalness: 0.6 });
  add(body, new RoundedBoxGeometry(4.3, 0.95, 1.95, 4, 0.32), paint, [0, 0.74, 0]);
  add(body, new RoundedBoxGeometry(4.36, 0.16, 2.0, 2, 0.07), std(accent, 0.4), [0, 0.52, 0]);
  // greenhouse: pillars + roof + glass
  add(body, new RoundedBoxGeometry(2.25, 0.13, 1.86, 3, 0.06), paint, [-0.42, 1.96, 0]);
  for (const [x, rz] of [[0.72, -0.5], [-0.38, 0], [-1.46, 0.35]]) add(body, new THREE.BoxGeometry(0.12, 0.82, 1.86), paint, [x, 1.56, 0], [0, 0, rz]);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xbfe3ff, roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false });
  add(body, new THREE.BoxGeometry(2.3, 0.78, 1.82), glass, [-0.38, 1.57, 0], [0, 0, 0], [1, 1, 1], false);
  add(body, new THREE.BoxGeometry(2.2, 0.04, 1.9), chrome, [-0.38, 1.2, 0], [0, 0, 0], [1, 1, 1], false);
  // lights
  for (const s of [-1, 1]) {
    add(body, new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff6d0 }), [2.12, 0.86, 0.62 * s], [0, 0, 0], [0.5, 1, 1.3], false);
    add(body, new THREE.BoxGeometry(0.06, 0.16, 0.36), new THREE.MeshBasicMaterial({ color: 0xff3b3b }), [-2.16, 0.92, 0.66 * s], [0, 0, 0], [1, 1, 1], false);
    const hg = glow(0xfff1c0, 1.4, 0.8);
    hg.position.set(2.3, 0.86, 0.62 * s);
    body.add(hg);
    const tg = glow(0xff3030, 0.8, 0.6);
    tg.position.set(-2.25, 0.92, 0.66 * s);
    body.add(tg);
  }
  // headlight beams (soft additive cones)
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff0b8, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const s of [-1, 1]) add(body, new THREE.ConeGeometry(1.6, 7, 24, 1, true), beamMat, [5.6, 0.6, 0.62 * s], [0, 0, Math.PI / 2 + 0.06], [1, 1, 0.55], false);
  // wheels
  const wheels = [];
  for (const [x, z] of [[1.35, 0.92], [1.35, -0.92], [-1.35, 0.92], [-1.35, -0.92]]) {
    const w = new THREE.Group();
    w.position.set(x, 0.42, z);
    car.add(w);
    add(w, new THREE.CylinderGeometry(0.42, 0.42, 0.32, 28), dark, [0, 0, 0], [Math.PI / 2, 0, 0]);
    add(w, new THREE.CylinderGeometry(0.24, 0.24, 0.34, 20), chrome, [0, 0, 0], [Math.PI / 2, 0, 0]);
    add(w, new THREE.BoxGeometry(0.36, 0.06, 0.345), std(0x9aa3b5, 0.4), [0, 0, 0]);
    wheels.push(w);
  }

  // interior (only shown in in-car shots; the exterior body is hidden then)
  const interior = new THREE.Group();
  interior.visible = false;
  car.add(interior);
  const trim = std(0xd9d2c8, 0.8), fabric = std(0x5d6b8f, 0.9), dash2 = std(0x3a3f4c, 0.7);
  for (const s of [-1, 1]) {
    add(interior, new THREE.BoxGeometry(3.8, 0.95, 0.08), trim, [-0.2, 0.72, 0.93 * s]);
    add(interior, new RoundedBoxGeometry(2.6, 0.1, 0.16, 2, 0.04), dash2, [-0.5, 1.12, 0.88 * s]);
    add(interior, new RoundedBoxGeometry(1.2, 0.08, 0.22, 2, 0.03), std(0xb9b0a3, 0.8), [-0.8, 0.95, 0.83 * s]);
    for (const [x, rz] of [[0.72, -0.5], [-0.38, 0], [-1.46, 0.35]]) add(interior, new THREE.BoxGeometry(0.14, 0.82, 0.08), trim, [x, 1.56, 0.92 * s], [0, 0, rz]);
  }
  add(interior, new THREE.BoxGeometry(3.6, 0.06, 1.9), std(0xcfc9c0, 0.9), [-0.3, 1.97, 0]);
  add(interior, new THREE.BoxGeometry(3.8, 0.06, 1.9), dash2, [-0.2, 0.28, 0]);
  add(interior, new RoundedBoxGeometry(0.75, 0.24, 1.75, 3, 0.08), fabric, [-0.95, 0.62, 0]);
  add(interior, new RoundedBoxGeometry(0.24, 0.95, 1.75, 3, 0.08), fabric, [-1.42, 1.05, 0], [0, 0, 0.12]);
  for (const z of [-0.45, 0.45]) add(interior, new RoundedBoxGeometry(0.14, 0.24, 0.42, 2, 0.06), fabric, [-1.5, 1.62, z], [0, 0, 0.12]);
  // booster seat for Affan (rear left)
  add(interior, new RoundedBoxGeometry(0.62, 0.16, 0.56, 3, 0.07), std(0xff8a5b, 0.7), [-0.92, 0.82, -0.45]);
  for (const s of [-1, 1]) add(interior, new RoundedBoxGeometry(0.5, 0.18, 0.08, 2, 0.04), std(0xff8a5b, 0.7), [-0.95, 0.94, -0.45 + 0.28 * s]);
  // front seats
  for (const z of [-0.47, 0.47]) {
    add(interior, new RoundedBoxGeometry(0.26, 1.0, 0.62, 3, 0.1), fabric, [0.45, 1.05, z], [0, 0, -0.1]);
    add(interior, new RoundedBoxGeometry(0.16, 0.26, 0.4, 2, 0.07), fabric, [0.5, 1.72, z], [0, 0, -0.1]);
  }

  car.userData = { body, interior, wheels, update: (dist) => wheels.forEach((w) => (w.rotation.z = -dist / 0.42)) };
  return car;
}

// ------------------------------------------------------------------ props
export function makeTree(R, { scale = 1, leaf = [0x2f6e45, 0x3c8452, 0x27613c], trunk = 0x6b4a32, toy = false } = {}) {
  const g = new THREE.Group();
  const h = (1.3 + R() * 0.8) * scale;
  add(g, new THREE.CylinderGeometry(0.13 * scale, 0.19 * scale, h, 10), std(trunk, 0.9), [0, h / 2, 0]);
  if (!toy && R() < 0.35) {
    for (let i = 0; i < 3; i++) add(g, new THREE.ConeGeometry((1.3 - i * 0.3) * scale, 1.5 * scale, 14), std(leaf[i % 3], 0.85), [0, h + (0.4 + i * 0.75) * scale, 0]);
  } else {
    const n = toy ? 1 : 3;
    for (let i = 0; i < n; i++) {
      const r = (toy ? 1.0 : 0.85 + R() * 0.35) * scale;
      add(g, new THREE.IcosahedronGeometry(r, toy ? 3 : 2), std(leaf[i % leaf.length], 0.8, { flatShading: !toy }), [(R() - 0.5) * 0.8 * scale * (n > 1), h + r * 0.6 + i * 0.35 * scale, (R() - 0.5) * 0.8 * scale * (n > 1)]);
    }
  }
  return g;
}

export function makeLamp({ scale = 1, pole = 0x5d6474, lamp = 0xffd88a, armDir = 1, pool = true, light = 0.9 } = {}) {
  const g = new THREE.Group();
  const s = scale;
  add(g, new THREE.CylinderGeometry(0.07 * s, 0.1 * s, 5 * s, 10), std(pole, 0.5, { metalness: 0.3 }), [0, 2.5 * s, 0]);
  add(g, new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 1.3 * s, 8), std(pole, 0.5, { metalness: 0.3 }), [0, 4.95 * s, 0.6 * s * armDir], [Math.PI / 2, 0, 0]);
  add(g, new RoundedBoxGeometry(0.5 * s, 0.16 * s, 0.32 * s, 2, 0.05 * s), std(pole, 0.5), [0, 4.92 * s, 1.2 * s * armDir]);
  add(g, new THREE.BoxGeometry(0.4 * s, 0.04 * s, 0.24 * s), new THREE.MeshBasicMaterial({ color: lamp }), [0, 4.83 * s, 1.2 * s * armDir], [0, 0, 0], [1, 1, 1], false);
  const gl = glow(lamp, 3.2 * s, light);
  gl.position.set(0, 4.75 * s, 1.2 * s * armDir);
  g.add(gl);
  if (pool) {
    const p = add(g, new THREE.CircleGeometry(2.6 * s, 32), new THREE.MeshBasicMaterial({ map: glowTex, color: lamp, transparent: true, opacity: 0.35 * light, blending: THREE.AdditiveBlending, depthWrite: false }), [0, 0.03, 1.2 * s * armDir], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
    p.renderOrder = 1;
  }
  g.userData.head = new THREE.Vector3(0, 4.75 * s, 1.2 * s * armDir);
  return g;
}

export function makeHouse(R, { scale = 1, walls = [0xf2e3c6, 0xe9c9b5, 0xcfe0e8, 0xf0d9a8], roofs = [0xc4573a, 0x6d4b8f, 0x3d6f8e, 0xb5473f], lit = 0xffc86b, toy = false } = {}) {
  const g = new THREE.Group();
  const s = scale;
  const w = (4 + R() * 2) * s, h = (2.8 + R() * 0.8) * s, d = (3.6 + R() * 1.2) * s;
  const wall = walls[Math.floor(R() * walls.length)], roof = roofs[Math.floor(R() * roofs.length)];
  add(g, toy ? new RoundedBoxGeometry(w, h, d, 3, 0.12 * s) : new THREE.BoxGeometry(w, h, d), std(wall, 0.85), [0, h / 2, 0]);
  const rf = add(g, new THREE.ConeGeometry(Math.max(w, d) * 0.78, 1.9 * s, 4), std(roof, 0.7), [0, h + 0.95 * s, 0], [0, Math.PI / 4, 0], [1, 1, d / w]);
  rf.scale.set(1, 1, d / Math.max(w, d) * 1.05);
  const win = new THREE.MeshBasicMaterial({ color: lit });
  const off = std(0x2c3550, 0.4);
  for (const x of [-w * 0.27, w * 0.27]) {
    const on = R() < 0.75;
    add(g, new THREE.PlaneGeometry(0.85 * s, 0.85 * s), on ? win : off, [x, h * 0.55, -d / 2 - 0.01], [0, Math.PI, 0], [1, 1, 1], false);
    add(g, new THREE.PlaneGeometry(0.85 * s, 0.85 * s), on ? win : off, [x, h * 0.55, d / 2 + 0.01], [0, 0, 0], [1, 1, 1], false);
    if (on) {
      const gl = glow(lit, 2.2 * s, 0.35);
      gl.position.set(x, h * 0.55, -d / 2 - 0.3);
      g.add(gl);
    }
  }
  add(g, new THREE.PlaneGeometry(0.8 * s, 1.5 * s), std(0x7a4e33, 0.8), [0, 0.75 * s, -d / 2 - 0.01], [0, Math.PI, 0], [1, 1, 1], false);
  return g;
}

export function makeBush(R, { scale = 1, color = 0x2e5e3b } = {}) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) add(g, new THREE.IcosahedronGeometry((0.45 + R() * 0.3) * scale, 1), std(color, 0.9, { flatShading: true }), [(i - 1) * 0.5 * scale, 0.35 * scale, (R() - 0.5) * 0.4 * scale]);
  return g;
}
