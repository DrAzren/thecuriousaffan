// Episode 029 sets. The night road comes from Episode 005 (now with shooting
// stars in the sky). The imagination world is a storybook solar system: the
// Sun, a comet that leaves a dusty trail, the Earth crossing that trail, and a
// close-up of the Earth where a grain of dust streaks through the air.
import * as THREE from 'three';
import { rng, clamp } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { makeSky, makeStars, glow, glowTex } from '../../shared/props.js';
import { buildRoadWorld, buildOutro, carX, CAR_SPEED } from '../005-bulan-ikut-kereta/worlds.js';

export { buildOutro, carX, CAR_SPEED };

// ------------------------------------------------------------------ meteor
// A glowing streak: bright head, tail fading to nothing. update() places it.
export function makeMeteor({ width = 1, color = 0xfff4d0, head = 0xffe9a8 } = {}) {
  const g = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uColor: { value: new THREE.Color(color) }, uAlpha: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uColor; uniform float uAlpha; varying vec2 vUv;
      void main(){ float a = pow(vUv.y, 1.6); gl_FragColor = vec4(uColor, a * uAlpha); }`,
  });
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(width, width * 0.15, 1, 10, 1, true), mat);
  g.add(tail);
  const hg = glow(head, width * 9, 1);
  g.add(hg);
  g.frustumCulled = false;
  tail.frustumCulled = false;
  const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();
  g.userData.update = (headPos, dir, len, alpha) => {
    g.visible = alpha > 0.001 && len > 0.001;
    if (!g.visible) return;
    d.copy(dir).normalize();
    hg.position.copy(headPos);
    hg.material.opacity = alpha;
    tail.quaternion.setFromUnitVectors(up, d);
    tail.scale.set(1, len, 1);
    tail.position.copy(headPos).addScaledVector(d, -len / 2);
    mat.uniforms.uAlpha.value = alpha;
  };
  g.visible = false;
  return g;
}

// Meteor that flies from a to b between t0 and t0+dur; tail grows then fades.
export function flyMeteor(m, t, t0, dur, a, b, maxLen) {
  const k = (t - t0) / dur;
  if (k < 0 || k > 1.35) return m.userData.update(a, a, 0, 0);
  const dir = new THREE.Vector3().subVectors(b, a);
  const dist = dir.length();
  const head = a.clone().addScaledVector(dir.normalize(), dist * Math.min(k, 1));
  const len = Math.min(maxLen, dist * Math.min(k, 1));
  const alpha = clamp(k / 0.12) * (k < 1 ? 1 : 1 - (k - 1) / 0.35);
  m.userData.update(head, dir, len * (k < 1 ? 1 : 1 - (k - 1) / 0.35), alpha);
}

// ----------------------------------------------------------------- road sky
export function buildMeteorRoad() {
  const w = buildRoadWorld();
  w.meteors = [];
  for (let i = 0; i < 14; i++) {
    const m = makeMeteor({ width: 2.6 });
    w.scene.add(m);
    w.meteors.push(m);
  }
  return w;
}

// ------------------------------------------------------------------ earth
function earthTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  const R = rng(29);
  const sea = g.createLinearGradient(0, 0, 0, 512);
  sea.addColorStop(0, '#3d8ff0');
  sea.addColorStop(0.5, '#2a74dc');
  sea.addColorStop(1, '#3d8ff0');
  g.fillStyle = sea;
  g.fillRect(0, 0, 1024, 512);
  const blob = (x, y, r, color) => {
    g.fillStyle = color;
    g.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const rr = r * (0.75 + 0.35 * Math.sin(a * 3 + x) * Math.cos(a * 2 + y));
      g.lineTo(x + Math.cos(a) * rr * 1.4, y + Math.sin(a) * rr);
    }
    g.fill();
  };
  for (let i = 0; i < 16; i++) {
    const x = R() * 1024, y = 120 + R() * 280, r = 30 + R() * 60;
    blob(x, y, r, '#4fc46a');
    blob(x + r * 0.3, y - r * 0.2, r * 0.55, '#7bd66a');
    if (R() < 0.4) blob(x - r * 0.2, y + r * 0.3, r * 0.3, '#e8c36a');
  }
  g.fillStyle = '#f4f8ff';
  g.fillRect(0, 0, 1024, 34);
  g.fillRect(0, 478, 1024, 34);
  g.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 40; i++) {
    const x = R() * 1024, y = 60 + R() * 390;
    g.beginPath();
    g.ellipse(x, y, 30 + R() * 60, 7 + R() * 8, 0, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Soft rim glow shell (the air around the Earth).
function atmosphere(radius, color = 0x7cc8ff, power = 2.2, strength = 1.2) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uK: { value: strength } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uK; varying vec3 vN; varying vec3 vV;
      void main(){ float f = 1.0 - max(dot(vN, vV), 0.0); float a = pow(f, ${power.toFixed(2)}) * uK; gl_FragColor = vec4(uColor, a); }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64), mat);
}

function makeEarth(radius, tex) {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, emissive: 0x0a1a40, emissiveIntensity: 0.6 }));
  g.add(ball);
  const air = atmosphere(radius * 1.1);
  g.add(air);
  g.userData = { ball, air };
  return g;
}

// ----------------------------------------------------------------- space
// Comet orbit: ellipse with the Sun at a focus, in the xz-plane.
export const ORBIT = { a: 30, e: 0.75 };
export const EARTH_R_ORBIT = 18;
export function cometAt(theta) {
  const { a, e } = ORBIT;
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
  return new THREE.Vector3(r * Math.cos(theta), 0, -r * Math.sin(theta));
}
// Where the comet's path crosses the Earth's orbit (theta in radians).
export const CROSS_THETA = Math.acos(((ORBIT.a * (1 - ORBIT.e ** 2)) / EARTH_R_ORBIT - 1) / ORBIT.e);
export const earthOnOrbit = (phi) => new THREE.Vector3(EARTH_R_ORBIT * Math.cos(phi), 0, -EARTH_R_ORBIT * Math.sin(phi));

// Big Earth for the close-up (top of the ball sits at y = 0 near BIG.x).
export const BIG = { x: 600, r: 40, air: 46 };

export function buildSpace() {
  const scene = new THREE.Scene();
  const sky = makeSky({ top: 0x0a0630, mid: 0x150c48, horizon: 0x1d1258, bottom: 0x0a0630, radius: 1800 });
  const stars = makeStars(1800, 1600, 29);
  const stars2 = makeStars(1400, 1600, 30);
  stars2.rotation.x = Math.PI;
  const starsG = new THREE.Group();
  starsG.add(stars, stars2);
  starsG.userData.update = (t) => {
    stars.userData.update(t);
    stars2.userData.update(t);
  };
  scene.add(sky, starsG);
  scene.add(new THREE.HemisphereLight(0xc8d4ff, 0x3a2a70, 1.1));
  const sunLight = new THREE.PointLight(0xfff0d0, 3.2, 0, 0);
  scene.add(sunLight);
  const fill = new THREE.DirectionalLight(0xbfd0ff, 1.0);
  fill.position.set(0, 10, 50);
  scene.add(fill);

  // Sun
  const sun = new THREE.Group();
  sun.add(new THREE.Mesh(new THREE.SphereGeometry(5, 48, 32), new THREE.MeshBasicMaterial({ color: 0xffd65a, toneMapped: false })));
  sun.add(glow(0xffb347, 34, 0.9), glow(0xfff1b0, 16, 1));
  scene.add(sun);

  // Comet: icy nucleus, glowing coma, tail pointing away from the Sun
  const comet = new THREE.Group();
  const nucleus = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), new THREE.MeshStandardMaterial({ color: 0xa9b8d8, roughness: 0.9, flatShading: true }));
  comet.add(nucleus, glow(0x9fe8ff, 4.5, 0.95));
  const tailMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(0x9fe0ff) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uColor; varying vec2 vUv; void main(){ gl_FragColor = vec4(uColor, pow(vUv.y, 1.3) * 0.7); }',
  });
  const tail = new THREE.Mesh(new THREE.ConeGeometry(1.6, 12, 24, 1, true), tailMat);
  const tailPivot = new THREE.Group();
  tail.rotation.z = Math.PI; // cone tip at the nucleus, widening away along +y
  tail.position.y = 6;
  tailPivot.add(tail);
  comet.add(tailPivot);
  scene.add(comet);
  const up = new THREE.Vector3(0, 1, 0);
  const setComet = (theta) => {
    const p = cometAt(theta);
    comet.position.copy(p);
    // tail points away from the Sun
    tailPivot.quaternion.setFromUnitVectors(up, p.clone().normalize());
    const sc = clamp(14 / p.length(), 0.6, 1.6);
    tailPivot.scale.set(sc, sc, sc);
  };

  // Dust trail along the comet's orbit (fades in as the comet passes)
  const R = rng(9);
  const N = 2400;
  const pos = new Float32Array(N * 3), th = new Float32Array(N), sz = new Float32Array(N), ph = new Float32Array(N);
  const tmp = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const theta = -Math.PI * 0.85 + R() * Math.PI * 1.7;
    tmp.copy(cometAt(theta));
    const spread = 0.6 + 0.04 * tmp.length();
    pos.set([tmp.x + (R() - 0.5) * spread * 2, (R() - 0.5) * spread * 1.2, tmp.z + (R() - 0.5) * spread * 2], i * 3);
    th[i] = theta;
    sz[i] = 2 + R() * 4;
    ph[i] = R() * 100;
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  dg.setAttribute('aTh', new THREE.BufferAttribute(th, 1));
  dg.setAttribute('aSz', new THREE.BufferAttribute(sz, 1));
  dg.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTheta: { value: -10 }, uTime: { value: 0 }, uAlpha: { value: 1 } },
    vertexShader: `attribute float aTh; attribute float aSz; attribute float aPh; uniform float uTheta; uniform float uTime; varying float vA;
      void main(){ float laid = smoothstep(0.0, 0.25, uTheta - aTh); vA = laid * (0.55 + 0.45 * sin(uTime * 2.0 + aPh));
        vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSz * (130.0 / -mv.z) * (0.4 + 0.6 * laid); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uAlpha; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, d);
        gl_FragColor = vec4(1.0, 0.86, 0.62, a * vA * uAlpha); }`,
  });
  const dust = new THREE.Points(dg, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  // Comet orbit and Earth orbit guide lines
  const orbitLine = (pts, color, opacity) => {
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: 0.8, gapSize: 0.6 }));
    l.computeLineDistances();
    scene.add(l);
    return l;
  };
  const earthPath = orbitLine(Array.from({ length: 181 }, (_, i) => earthOnOrbit((i / 180) * Math.PI * 2)), 0x8fd0ff, 0.45);

  // Small Earth on its orbit
  const tex = earthTexture();
  const earth = makeEarth(1.4, tex);
  scene.add(earth);

  // Big Earth for the close-up, far away from the diorama
  const big = makeEarth(BIG.r, tex);
  big.userData.air.scale.setScalar(BIG.air / (BIG.r * 1.1));
  big.position.set(BIG.x, -BIG.r, 0);
  big.rotation.z = 0.3;
  scene.add(big);
  const bigLight = new THREE.DirectionalLight(0xfff0d8, 2.0);
  bigLight.position.set(BIG.x - 60, 40, 50);
  bigLight.target.position.set(BIG.x, 0, 0);
  scene.add(bigLight, bigLight.target);

  // a grain of dust and some meteors for the close-up
  const grain = new THREE.Group();
  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), new THREE.MeshStandardMaterial({ color: 0x8a7d70, roughness: 1, flatShading: true, emissive: 0xff7a1a, emissiveIntensity: 0 }));
  const heat = glow(0xff9a3c, 3, 0);
  grain.add(rock, heat);
  scene.add(grain);
  const grainTrail = makeMeteor({ width: 0.5, color: 0xffe2a8, head: 0xffb04a });
  scene.add(grainTrail);
  const meteors = [];
  for (let i = 0; i < 16; i++) {
    const m = makeMeteor({ width: 0.22 });
    scene.add(m);
    meteors.push(m);
  }

  const aff = makeAffan();
  scene.add(aff.root);

  const setGrain = (p, heatK) => {
    grain.visible = true;
    grain.position.copy(p);
    rock.material.emissiveIntensity = 2.5 * heatK;
    rock.material.color.setRGB(0.54 + 0.46 * heatK, 0.49 + 0.3 * heatK, 0.44 - 0.2 * heatK);
    heat.material.opacity = heatK;
    heat.scale.setScalar(1 + 4 * heatK);
  };

  return {
    scene, sky, stars: starsG, sun, comet, setComet, dust, dustMat, earth, earthPath, big, grain, setGrain, grainTrail, meteors, aff, sunLight,
  };
}
