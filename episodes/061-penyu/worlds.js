// Episode 061 sets:
//  - a moonlit Terengganu-style beach: sand, gentle animated waves, a big moon
//    with its glow on the horizon, stars, palm trees, a mother turtle laying
//    eggs in a nest, hatchlings that dig out and scurry to the sea, a stray
//    plastic bottle for the "don't litter" ending, and Affan;
//  - an ocean globe: a slowly turning Earth with a turtle route that grows
//    across the ocean, magnetic field loops, coloured "magnetic address" pins
//    on the coasts and a little turtle that swims the route and back home;
//  - a sand-temperature stage: a warm nest and a cool nest with thermometers;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, glow, makeSky, makeStars } from '../../shared/props.js';
import { buildOutro } from '../005-bulan-ikut-kereta/worlds.js';

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
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// a shell texture with hexagonal scutes
const shellTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#5a7a3a';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#2f4a1e';
  g.lineWidth = 10;
  const r = 70;
  for (let row = -1; row < 6; row++) for (let col = -1; col < 6; col++) {
    const cx = col * r * 1.5, cy = row * r * 1.732 + (col % 2 ? r * 0.866 : 0);
    g.fillStyle = (row + col) % 2 ? '#6e8c44' : '#7d9a4e';
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const x = cx + Math.cos(a) * r * 0.92, y = cy + Math.sin(a) * r * 0.92;
      if (k) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.closePath();
    g.fill();
    g.stroke();
  }
});

// a cartoon sea turtle facing +z; set(t, {swim, dig}) animates the flippers
export function makeTurtle({ baby = false } = {}) {
  const root = new THREE.Group();
  const shellM = std(0xffffff, 0.6, { map: shellTex, emissive: 0x18240c, emissiveIntensity: 0.25 });
  const skin = std(baby ? 0x5a6a5a : 0x8a9a6a, 0.7, { emissive: 0x1a2010, emissiveIntensity: 0.2 });
  const shell = add(root, new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), shellM, [0, 0.12, 0], [0, 0, 0], [0.82, 0.42, 1]);
  add(root, new THREE.CylinderGeometry(1, 1, 0.12, 32), std(0xe8d8a0, 0.7), [0, 0.1, 0], [0, 0, 0], [0.8, 1, 0.98]);
  const head = new THREE.Group();
  head.position.set(0, 0.25, 1.0);
  root.add(head);
  add(head, new THREE.SphereGeometry(0.26, 20, 16), skin, [0, 0.02, 0.14], [0, 0, 0], [1, 0.85, 1.25]);
  for (const s of [-1, 1]) {
    add(head, new THREE.SphereGeometry(0.075, 12, 10), std(0xffffff, 0.3), [s * 0.14, 0.1, 0.34], [0, 0, 0], [1, 1, 0.6], false);
    add(head, new THREE.SphereGeometry(0.045, 10, 8), std(0x111118, 0.3), [s * 0.15, 0.1, 0.39], [0, 0, 0], [1, 1, 0.6], false);
  }
  add(head, new THREE.TorusGeometry(0.07, 0.015, 6, 14, Math.PI), std(0x2a2a20, 0.5), [0, -0.02, 0.43], [0, 0, Math.PI], [1, 1, 1], false);
  const flips = [];
  for (const [x, z, fr] of [[0.78, 0.45, 1], [-0.78, 0.45, 1], [0.6, -0.65, 0], [-0.6, -0.65, 0]]) {
    const pv = new THREE.Group();
    pv.position.set(x, 0.15, z);
    root.add(pv);
    const s = Math.sign(x);
    add(pv, new THREE.SphereGeometry(1, 16, 10), skin, [s * (fr ? 0.42 : 0.24), 0, fr ? 0.08 : -0.05], [0, fr ? s * -0.5 : s * 0.4, 0], fr ? [0.48, 0.06, 0.2] : [0.26, 0.05, 0.16]);
    flips.push({ pv, s, fr });
  }
  add(root, new THREE.ConeGeometry(0.08, 0.3, 8), skin, [0, 0.12, -1.05], [-Math.PI / 2, 0, 0]);
  function set(t, { swim = 0, dig = 0, look = 0 } = {}) {
    flips.forEach(({ pv, s, fr }, i) => {
      const ph = t * (swim ? 5 : 7) + (fr ? 0 : Math.PI);
      pv.rotation.set(0, (fr ? 0.5 : 0.3) * s * Math.sin(ph) * Math.max(swim, dig), s * 0.25 * Math.sin(ph) * swim);
    });
    head.rotation.set(0.1 * Math.sin(t * 1.3) - 0.15 * dig, look, 0);
  }
  set(0);
  return { root, head, shell, set };
}

// ------------------------------------------------------------------ beach
export const SHORE_Z = -6;
export const NEST = V3(0, 0, 1.2);
export const A_BEACH = V3(3.2, 0, 4.2);
export function buildBeach() {
  const scene = new THREE.Scene();
  const sky = makeSky({ top: 0x050a24, mid: 0x14205a, horizon: 0x3a4a8a, bottom: 0x0a1030, radius: 400 });
  scene.add(sky);
  const stars = makeStars(900, 380, 61);
  scene.add(stars);
  scene.add(new THREE.HemisphereLight(0x9ab0ff, 0x2a2440, 1.1));
  const moonL = new THREE.DirectionalLight(0xe8eeff, 1.6);
  moonL.position.set(-6, 10, -14);
  scene.add(moonL);
  const fill = new THREE.DirectionalLight(0xffe8c8, 1.3);
  fill.position.set(6, 5, 10);
  scene.add(fill);
  // moon and its glow on the horizon
  const moon = add(scene, new THREE.SphereGeometry(6, 32, 24), new THREE.MeshBasicMaterial({ color: 0xfff6dc }), [-30, 32, -160], [0, 0, 0], [1, 1, 1], false);
  const moonGlow = glow(0xfff0c8, 50, 0.5);
  moonGlow.position.copy(moon.position);
  scene.add(moonGlow);
  const horizonGlow = glow(0xbfd0ff, 120, 0.35);
  horizonGlow.position.set(-10, 2, -160);
  scene.add(horizonGlow);
  // sand
  const sandTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d8c08a';
    g.fillRect(0, 0, w, h);
    const R = rng(611);
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = R() > 0.5 ? 'rgba(255,240,200,0.35)' : 'rgba(120,90,50,0.25)';
      g.fillRect(R() * w, R() * h, 1.5, 1.5);
    }
  });
  sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping;
  sandTex.repeat.set(12, 12);
  add(scene, new THREE.PlaneGeometry(120, 80), std(0xffffff, 0.95, { map: sandTex }), [0, 0, 20], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  // sea: an animated wavy plane
  const seaGeo = new THREE.PlaneGeometry(400, 200, 120, 60);
  seaGeo.rotateX(-Math.PI / 2);
  seaGeo.translate(0, 0.05, SHORE_Z - 100);
  const sea = add(scene, seaGeo, std(0x1a3a7a, 0.25, { emissive: 0x0a1a40, emissiveIntensity: 0.4, metalness: 0.2 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const base = seaGeo.attributes.position.array.slice();
  sea.userData.update = (t) => {
    const p = seaGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      p.setY(i, 0.05 + 0.12 * Math.sin(x * 0.15 + t * 1.2) + 0.1 * Math.sin(z * 0.3 - t * 1.6));
    }
    p.needsUpdate = true;
    seaGeo.computeVertexNormals();
  };
  // foam line
  const foam = add(scene, new THREE.PlaneGeometry(400, 0.9), new THREE.MeshBasicMaterial({ color: 0xe8f2ff, transparent: true, opacity: 0.7 }), [0, 0.09, SHORE_Z + 0.2], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  // palm trees
  const trunkM = std(0x8a6a44, 0.8), leafM = std(0x2f6a3a, 0.7, { side: THREE.DoubleSide });
  for (const [x, z, s] of [[-9, 6, 1], [11, 9, 1.2], [-14, 14, 1.1]]) {
    const p = new THREE.Group();
    p.position.set(x, 0, z);
    p.scale.setScalar(s);
    scene.add(p);
    const curve = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0.4, 2.5, 0), V3(1.2, 5.2, 0)]);
    add(p, new THREE.TubeGeometry(curve, 20, 0.22, 8), trunkM);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      add(p, new THREE.SphereGeometry(1, 10, 6), leafM, [1.2 + Math.cos(a) * 1.3, 5.0, Math.sin(a) * 1.3], [0, -a, -0.5], [1.6, 0.08, 0.38]);
    }
  }
  // nest: a dug hollow with eggs
  const nest = new THREE.Group();
  nest.position.copy(NEST);
  scene.add(nest);
  add(nest, new THREE.CircleGeometry(1.0, 28), std(0x8a7048, 0.95), [0, 0.02, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  add(nest, new THREE.TorusGeometry(1.05, 0.18, 8, 28), std(0xc8ac78, 0.95), [0, 0.04, 0], [Math.PI / 2, 0, 0], [1, 1, 0.6], false);
  const eggM = std(0xfbf6ea, 0.4);
  const R = rng(616);
  const eggs = Array.from({ length: 14 }, (_, i) => {
    const e = add(nest, new THREE.SphereGeometry(0.12, 14, 10), eggM, [(R() - 0.5) * 0.9, 0.08 + (i % 3) * 0.05, (R() - 0.5) * 0.7], [0, 0, 0], [1, 1, 1], false);
    e.userData.home = e.position.clone();
    return e;
  });
  // mother turtle (big) and hatchlings
  const mom = makeTurtle();
  mom.root.scale.setScalar(1.3);
  scene.add(mom.root);
  const babies = Array.from({ length: 9 }, (_, i) => {
    const b = makeTurtle({ baby: true });
    b.root.scale.setScalar(0.17);
    b.root.userData = { x: (R() - 0.5) * 3.4, ph: R(), lane: (R() - 0.5) * 2 };
    scene.add(b.root);
    return b;
  });
  // a plastic bottle on the sand
  const bottle = new THREE.Group();
  scene.add(bottle);
  add(bottle, new THREE.CylinderGeometry(0.07, 0.07, 0.32, 14), new THREE.MeshPhysicalMaterial({ color: 0x9adfff, roughness: 0.1, transparent: true, opacity: 0.7 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  add(bottle, new THREE.CylinderGeometry(0.035, 0.035, 0.06, 10), std(0x2f6fff, 0.4), [0, 0.19, 0], [0, 0, 0], [1, 1, 1], false);
  const aff = makeAffan();
  scene.add(aff.root);
  return { scene, sky, stars, sea, foam, moon, nest, eggs, mom, babies, bottle, aff };
}

// ----------------------------------------------------------- ocean globe
export const GLOBE_AT = V3(0, 0, 0);
export const GLOBE_R = 3;
export const lonLat = (lon, lat, r = GLOBE_R) => {
  const p = (lat * Math.PI) / 180, l = (lon * Math.PI) / 180;
  return V3(r * Math.cos(p) * Math.sin(l), r * Math.sin(p), r * Math.cos(p) * Math.cos(l));
};
export function buildOcean() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x1a2a6a, 0x05081a);
  scene.add(sky);
  const stars = makeStars(700, 250, 617);
  scene.add(stars);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3a6a, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(6, 6, 10);
  scene.add(sun);
  const earth = new THREE.Group();
  earth.position.copy(GLOBE_AT);
  scene.add(earth);
  // simple map: equirectangular canvas with rough continents
  const mapTex = canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#2a6ad0';
    g.fillRect(0, 0, w, h);
    const X = (lon) => ((lon + 180) / 360) * w, Y = (lat) => ((90 - lat) / 180) * h;
    g.fillStyle = '#4cb85a';
    const blob = (lon, lat, rx, ry, rot = 0) => {
      g.beginPath();
      g.ellipse(X(lon), Y(lat), (rx / 360) * w, (ry / 180) * h, rot, 0, Math.PI * 2);
      g.fill();
    };
    blob(-100, 45, 30, 20); blob(-60, -15, 18, 28); blob(20, 5, 22, 30); blob(15, 50, 25, 12); blob(90, 45, 50, 20);
    blob(78, 20, 10, 10); blob(102, 4, 5, 5, 0.5); blob(113, 2, 6, 4); blob(120, -3, 8, 3); blob(135, -25, 18, 12); blob(140, 38, 4, 8);
    g.fillStyle = '#f4faff';
    g.fillRect(0, 0, w, 22);
    g.fillRect(0, h - 26, w, 26);
  });
  mapTex.colorSpace = THREE.SRGBColorSpace;
  add(earth, new THREE.SphereGeometry(GLOBE_R, 48, 32), std(0xffffff, 0.6, { map: mapTex }));
  // magnetic field loops
  const loopM = new THREE.MeshBasicMaterial({ color: 0xffd860, transparent: true, opacity: 0.8 });
  const loops = [];
  for (const L of [4.3, 5.8, 7.5]) for (let k = 0; k < 6; k++) {
    const phi = (k / 6) * Math.PI * 2;
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const th = 0.12 + (i / 60) * (Math.PI - 0.24);
      const r = L * Math.sin(th) ** 2;
      if (r < GLOBE_R + 0.05) continue;
      pts.push(V3(r * Math.sin(th) * Math.cos(phi), r * Math.cos(th), r * Math.sin(th) * Math.sin(phi)));
    }
    if (pts.length < 4) continue;
    const tube = add(earth, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.035, 6), loopM, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    tube.visible = false;
    loops.push(tube);
  }
  // the turtle's route: from Terengganu out across the Pacific and back
  const routeLL = [[103.4, 5.3], [109, 7], [118, 9], [128, 12], [140, 14], [152, 10], [158, 2], [150, -6], [138, -4], [126, 2], [115, 5], [103.4, 5.3]];
  const routePts = routeLL.map(([lo, la]) => lonLat(lo, la, GLOBE_R + 0.06));
  const route = new THREE.CatmullRomCurve3(routePts, false, 'catmullrom', 0.3);
  const routeTube = add(earth, new THREE.TubeGeometry(route, 200, 0.045, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  // "magnetic address" pins on several coasts
  const pins = [[103.4, 5.3, 0xff5c9a], [80, 12, 0x5fe08a], [125, 8, 0xffcf33], [148, -20, 0x7ad8ff], [-90, 20, 0xc39aff], [30, -30, 0xff9a5a]].map(([lo, la, c]) => {
    const g = new THREE.Group();
    g.position.copy(lonLat(lo, la, GLOBE_R));
    g.lookAt(g.position.clone().multiplyScalar(2));
    earth.add(g);
    add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), std(0xffffff, 0.4), [0, 0, 0.25], [Math.PI / 2, 0, 0], [1, 1, 1], false);
    add(g, new THREE.SphereGeometry(0.14, 14, 10), std(c, 0.3, { emissive: c, emissiveIntensity: 0.5 }), [0, 0, 0.55], [0, 0, 0], [1, 1, 1], false);
    g.visible = false;
    return g;
  });
  const swimmer = makeTurtle();
  swimmer.root.scale.setScalar(0.12);
  earth.add(swimmer.root);
  return { scene, sky, stars, earth, loops, route, routeTube, pins, swimmer };
}

// --------------------------------------------------------- sand thermometers
export const WARM_AT = V3(-2.0, 0, 0);
export const COOL_AT = V3(2.0, 0, 0);
export function buildSand() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x3a6ac8, 0x10204a);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a5a, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 8, 8);
  scene.add(key);
  const mk = (at, col, glowCol) => {
    const g = new THREE.Group();
    g.position.copy(at);
    scene.add(g);
    add(g, new THREE.SphereGeometry(1.7, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), std(col, 0.95), [0, 0, 0], [0, 0, 0], [1, 0.5, 0.8]);
    const gl = glow(glowCol, 4.6, 0.5);
    gl.position.set(0, 0.5, 0.3);
    g.add(gl);
    // thermometer
    const th = new THREE.Group();
    th.position.set(0, 1.6, 0.9);
    g.add(th);
    add(th, new THREE.CylinderGeometry(0.16, 0.16, 2.0, 16), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.1, transparent: true, opacity: 0.5 }), [0, 0.6, 0], [0, 0, 0], [1, 1, 1], false);
    add(th, new THREE.SphereGeometry(0.26, 16, 12), std(0xe8404a, 0.3), [0, -0.45, 0], [0, 0, 0], [1, 1, 1], false);
    const fluid = add(th, new THREE.CylinderGeometry(0.09, 0.09, 1, 12), std(0xe8404a, 0.3), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    const babies = Array.from({ length: 3 }, (_, i) => {
      const b = makeTurtle({ baby: true });
      b.root.scale.setScalar(0.32);
      b.root.position.set(-0.8 + i * 0.8, 0.5, 1.2);
      g.add(b.root);
      return b;
    });
    return { g, fluid, babies, gl };
  };
  const warm = mk(WARM_AT, 0xe0a860, 0xff8a3a);
  const cool = mk(COOL_AT, 0xb8b4a0, 0x5ab0ff);
  // pink bows for girls
  warm.babies.forEach((b) => {
    const bow = new THREE.Group();
    bow.position.set(0, 0.55, 1.05);
    b.root.add(bow);
    for (const s of [-1, 1]) add(bow, new THREE.ConeGeometry(0.16, 0.3, 10), std(0xff6aa8, 0.4), [s * 0.14, 0, 0], [0, 0, s * Math.PI / 2], [1, 1, 1], false);
    add(bow, new THREE.SphereGeometry(0.08, 10, 8), std(0xff6aa8, 0.4), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  });
  return { scene, sky, warm, cool };
}
