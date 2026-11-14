// Episode 034 sets:
//  - a quiet housing-estate street at night: a pale pavement under one hero
//    street lamp whose point light casts Affan's real shadow (short under the
//    lamp, long as he walks away), plus invisible "monster horns" that only
//    show up in the shadow;
//  - the "pentas cahaya" (light stage) imagination world: a cream floor, a toy
//    street lamp, visible straight light rays that stop where Affan blocks
//    them, a purple highlight on the shadow, and a Sun that can replace the
//    lamp (directional light, high at noon, low in the evening);
//  - the Episode 031 living room with the lights off, a toy robot on the floor
//    and a torch (spot light) for the try-at-home demo;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeSky, makeStars, makeMoon, makeGround, makeRoad, makeTree, makeLamp, makeHouse, makeBush, glow, glowTex } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildLivingRoom } from '../031-geletek-diri-sendiri/worlds.js';

export { buildOutro };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

export const AFF_SCALE = 0.42; // Affan ~1.6 units tall next to a 4.75-unit lamp
export const AFF_H = 1.62;

function canvasTex(w, h, draw, repeat = null) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}

function pointShadow(light, map = 2048) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  light.shadow.camera.near = 0.2;
  light.shadow.camera.far = 60;
  light.shadow.bias = -0.002;
  light.shadow.normalBias = 0.02;
  light.shadow.radius = 3;
}

// Horns that only show up in the shadow (they are never drawn themselves).
function shadowHorns(aff) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.26, 1.0, 12), mat);
    h.position.set(0.45 * s, 0.95, -0.05);
    h.rotation.z = -0.45 * s;
    h.castShadow = true;
    g.add(h);
  }
  // spiky back
  for (let i = 0; i < 3; i++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.45, 10), mat);
    sp.position.set(0, 0.55 - i * 0.45, -0.62 - i * 0.05);
    sp.rotation.x = -1.2;
    sp.castShadow = true;
    g.add(sp);
  }
  g.scale.setScalar(0.0001);
  aff.parts.head.add(g);
  return g;
}

// ---------------------------------------------------------------- the street
export const LAMP_HEAD = new THREE.Vector3(0, 4.75, 8.2);
export const WALK_Z = 8.2;

export function buildStreet() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x161d48, 0.018);
  const sky = makeSky({ top: 0x050a24, mid: 0x14205a, horizon: 0x34448c, bottom: 0x0b1028 });
  const stars = makeStars(1500, 1600, 34);
  const moon = makeMoon(22);
  moon.position.set(-300, 420, 900);
  scene.add(sky, stars, moon);
  scene.add(new THREE.HemisphereLight(0x6f86d8, 0x1a1e34, 0.32));
  const moonLight = new THREE.DirectionalLight(0xc8d6ff, 0.25);
  moonLight.position.set(-10, 20, 30);
  scene.add(moonLight);
  // soft front fill from the road side so faces read (no shadows)
  const fill = new THREE.DirectionalLight(0xffe2c4, 0.9);
  fill.position.set(3, 3, -6);
  fill.target.position.set(3, 1, 8.2);
  scene.add(fill, fill.target);
  scene.add(makeGround(0x1c3528));
  scene.add(makeRoad({ x0: -120, x1: 120 }));

  // pale pavement with tiles so the shadow reads clearly
  const tiles = canvasTex(512, 512, (g, w) => {
    g.fillStyle = '#b4b2ad';
    g.fillRect(0, 0, w, w);
    const R = rng(4);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const v = 170 + Math.floor(R() * 22);
        g.fillStyle = `rgb(${v},${v - 2},${v - 6})`;
        g.fillRect(x * 128 + 3, y * 128 + 3, 122, 122);
      }
  }, [60, 2.6]);
  const pave = add(scene, new THREE.PlaneGeometry(240, 5.6), std(0xffffff, 0.92, { map: tiles }), [0, 0.02, 7.5], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  pave.receiveShadow = true;
  add(scene, new THREE.BoxGeometry(240, 0.16, 0.25), std(0x8d8f99, 0.8), [0, 0.08, 10.35], [0, 0, 0], [1, 1, 1], false).receiveShadow = true;

  // the hero lamp (its pole stands at the back edge of the pavement)
  const hero = makeLamp({ armDir: -1, light: 1 });
  hero.position.set(0, 0, 9.4);
  scene.add(hero);
  const lampLight = new THREE.PointLight(0xffd9a0, 60, 0, 1.25);
  lampLight.position.copy(LAMP_HEAD).add(new THREE.Vector3(0, -0.18, 0));
  pointShadow(lampLight);
  scene.add(lampLight);

  // other lamps further along the street (no shadows)
  for (const x of [-26, 26, -52, 52, -78, 78]) {
    const l = makeLamp({ armDir: -1, light: 0.8 });
    l.position.set(x, 0, 9.4);
    scene.add(l);
    const pl = new THREE.PointLight(0xffd9a0, 18, 14, 1.6);
    pl.position.set(x, 4.5, 8.2);
    scene.add(pl);
  }
  for (const x of [-13, 13, -39, 39, -65, 65]) {
    const l = makeLamp({ armDir: 1, light: 0.7 });
    l.position.set(x, 0, -5.3);
    scene.add(l);
  }

  const R = rng(21);
  // houses facing the street on both sides, with hedges and trees
  for (let x = -110; x < 110; x += 11 + R() * 4) {
    const h = makeHouse(R, { scale: 1.1 });
    h.position.set(x, 0, 16.5 + R() * 1.5);
    scene.add(h);
    const h2 = makeHouse(R, { scale: 1.1 });
    h2.position.set(x + 5, 0, -15 - R() * 2);
    h2.rotation.y = Math.PI;
    scene.add(h2);
  }
  for (let x = -110; x < 110; x += 3 + R() * 3) {
    const b = makeBush(R, { scale: 0.9 });
    b.position.set(x, 0, 11.3 + R() * 0.5);
    scene.add(b);
  }
  for (let x = -110; x < 110; x += 7 + R() * 6) {
    if (Math.abs(x) < 4) continue;
    const tr = makeTree(R, { scale: 1.1 + R() * 0.3 });
    tr.position.set(x, 0, 12.8 + R() * 1.5);
    scene.add(tr);
    const tr2 = makeTree(R, { scale: 1.1 + R() * 0.3 });
    tr2.position.set(x + 3, 0, -8.5 - R() * 2);
    scene.add(tr2);
  }

  const aff = makeAffan();
  aff.root.scale.setScalar(AFF_SCALE);
  scene.add(aff.root);
  const horns = shadowHorns(aff);
  return { scene, sky, stars, moon, aff, horns, hero, lampLight };
}

// ------------------------------------------------------------ the light stage
// Side-on diagram world. Affan walks along z = 0; the lamp head is at x = 0.
export const STAGE_LAMP = new THREE.Vector3(0, 4.75, 0);
const N_RAYS = 30;

function gradientSky(top, bot) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, bot: { value: new THREE.Color(bot) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, bot; varying vec3 vP;
      void main(){ vec3 c = mix(bot, top, smoothstep(-0.05, 0.6, vP.y)); gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}

export function buildStage() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x161b52, 0x3a3f8a);
  scene.add(sky);
  const stars = makeStars(900, 190, 8);
  scene.add(stars);
  const hemi = new THREE.HemisphereLight(0xbfc8ff, 0x50407a, 0.5);
  scene.add(hemi);

  const floorTex = canvasTex(512, 512, (g, w) => {
    g.fillStyle = '#f6eedd';
    g.fillRect(0, 0, w, w);
    g.strokeStyle = 'rgba(160,140,200,0.35)';
    g.lineWidth = 4;
    for (let i = 0; i <= 4; i++) {
      g.beginPath();
      g.moveTo(i * 128, 0);
      g.lineTo(i * 128, w);
      g.moveTo(0, i * 128);
      g.lineTo(w, i * 128);
      g.stroke();
    }
  }, [16, 16]);
  const floor = add(scene, new THREE.CircleGeometry(30, 72), std(0xffffff, 0.9, { map: floorTex }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  floor.receiveShadow = true;
  const rim = add(scene, new THREE.TorusGeometry(30, 0.25, 8, 96), std(0xffc94a, 0.5), [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  rim.receiveShadow = false;

  // toy street lamp: pole behind the walking line, head right above x = 0
  const lamp = makeLamp({ armDir: 1, light: 1, pool: false, pole: 0x6a5acd });
  lamp.position.set(0, 0, -1.2);
  scene.add(lamp);
  const bulbGlow = glow(0xfff0a0, 2.6, 0.9);
  bulbGlow.position.copy(STAGE_LAMP).add(new THREE.Vector3(0, -0.12, 0));
  scene.add(bulbGlow);
  const lampLight = new THREE.PointLight(0xfff0c8, 30, 0, 1.6);
  lampLight.position.copy(STAGE_LAMP).add(new THREE.Vector3(0, -0.15, 0));
  pointShadow(lampLight);
  scene.add(lampLight);

  // the Sun (moved around by the episode); directional light with its own shadow
  const sun = new THREE.Group();
  scene.add(sun);
  add(sun, new THREE.SphereGeometry(0.75, 40, 24), new THREE.MeshBasicMaterial({ color: 0xffd23a }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const sg1 = glow(0xffc040, 4.5, 0.8);
  const sg2 = glow(0xff9a30, 9, 0.35);
  sun.add(sg1, sg2);
  for (const s of [-1, 1]) add(sun, new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: 0x6a3410 }), [0.25 * s, 0.12, 0.72], [0, 0, 0], [1, 1.4, 0.5], false);
  add(sun, new THREE.TorusGeometry(0.22, 0.04, 8, 16, Math.PI), new THREE.MeshBasicMaterial({ color: 0x6a3410 }), [0, -0.1, 0.72], [0, 0, Math.PI], [1, 1, 1], false);
  const sunLight = new THREE.DirectionalLight(0xfff2d8, 0);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  const sc = sunLight.shadow.camera;
  sc.left = -10;
  sc.right = 10;
  sc.top = 10;
  sc.bottom = -10;
  sc.near = 0.5;
  sc.far = 80;
  sunLight.shadow.bias = -0.0008;
  sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight, sunLight.target);

  // light rays: thin glowing rods, laid out every frame by the episode
  const rayGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
  rayGeo.translate(0, 0.5, 0); // base at the origin, grows along +y
  const rayMat = new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const rays = Array.from({ length: N_RAYS }, () => {
    const m = new THREE.Mesh(rayGeo, rayMat.clone());
    m.visible = false;
    m.renderOrder = 2;
    scene.add(m);
    return m;
  });
  const keyMat = new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 1, depthWrite: false, fog: false });
  const keyRay = new THREE.Mesh(rayGeo, keyMat);
  keyRay.visible = false;
  keyRay.renderOrder = 3;
  scene.add(keyRay);
  const photonMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xfff2b0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const photons = Array.from({ length: N_RAYS * 2 }, () => {
    const s = new THREE.Sprite(photonMat);
    s.scale.setScalar(0.32);
    s.visible = false;
    s.renderOrder = 3;
    scene.add(s);
    return s;
  });
  // "bonk" sparks where light hits Affan
  const hitMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffa040, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const hits = Array.from({ length: 12 }, () => {
    const s = new THREE.Sprite(hitMat);
    s.visible = false;
    s.renderOrder = 4;
    scene.add(s);
    return s;
  });
  // purple highlight laid over the shadow on the floor
  const hlGeo = new THREE.PlaneGeometry(1, 1);
  hlGeo.translate(0.5, 0, 0);
  const shadowHL = new THREE.Mesh(hlGeo, new THREE.MeshBasicMaterial({ color: 0x8a5cff, transparent: true, opacity: 0.4, depthWrite: false }));
  shadowHL.rotation.x = -Math.PI / 2;
  shadowHL.position.y = 0.025;
  shadowHL.visible = false;
  shadowHL.renderOrder = 1;
  scene.add(shadowHL);

  const aff = makeAffan();
  aff.root.scale.setScalar(AFF_SCALE);
  scene.add(aff.root);

  const noonTop = new THREE.Color(0x3c8cf0), noonBot = new THREE.Color(0xa8dcff);
  const eveTop = new THREE.Color(0x5a4aa8), eveBot = new THREE.Color(0xff9a5a);
  const nightTop = new THREE.Color(0x161b52), nightBot = new THREE.Color(0x3a3f8a);
  // mode: 0 = lamp at night, 1 = sun. evening: 0 = noon sky, 1 = evening sky.
  const setMode = (k, evening = 0) => {
    lamp.visible = k < 0.98;
    lamp.traverse((o) => {
      if (o.material) {
        o.material.transparent = k > 0.001;
        o.material.opacity = (o.isSprite ? 1 : 1) * (1 - k);
      }
    });
    bulbGlow.material.opacity = 0.9 * (1 - k);
    lampLight.intensity = 30 * (1 - k);
    lampLight.castShadow = k < 0.5;
    sun.visible = k > 0.02;
    sun.scale.setScalar(Math.max(0.001, k));
    sunLight.intensity = 3.0 * k;
    hemi.intensity = 0.5 + 0.9 * k;
    stars.material.uniforms.uAlpha.value = 1 - k;
    const dayTop = noonTop.clone().lerp(eveTop, evening), dayBot = noonBot.clone().lerp(eveBot, evening);
    sky.material.uniforms.top.value.copy(nightTop).lerp(dayTop, k);
    sky.material.uniforms.bot.value.copy(nightBot).lerp(dayBot, k);
    sunLight.color.setHex(0xfff2d8).lerp(new THREE.Color(0xffb070), evening);
  };
  setMode(0);
  return { scene, sky, stars, hemi, lamp, lampLight, bulbGlow, sun, sunLight, rays, keyRay, photons, hits, shadowHL, aff, setMode, floor };
}

// ------------------------------------------------------------ the dark room
export function buildRoom() {
  const w = buildLivingRoom();
  w.kak.root.visible = false;
  // only the toy's shadow matters here: Affan's arm must not block the torch
  w.aff.root.traverse((o) => o.isMesh && (o.castShadow = false));
  const lights = [];
  w.scene.traverse((o) => {
    if (o.isLight) lights.push([o, o.intensity]);
  });
  const roomBg = new THREE.Color(0xf6e8cf), darkBg = new THREE.Color(0x07070f);

  // toy robot standing on the rug
  const toy = new THREE.Group();
  w.scene.add(toy);
  const red = std(0xff5a5a, 0.45), grey = std(0xc8d0e0, 0.4, { metalness: 0.2 }), dark = std(0x2a3050, 0.5);
  add(toy, new RoundedBoxGeometry(0.22, 0.2, 0.18, 2, 0.04), grey, [-0.07, 0.1, 0]);
  add(toy, new RoundedBoxGeometry(0.22, 0.2, 0.18, 2, 0.04), grey, [0.07, 0.1, 0]);
  add(toy, new RoundedBoxGeometry(0.36, 0.3, 0.24, 2, 0.06), red, [0, 0.36, 0]);
  add(toy, new RoundedBoxGeometry(0.3, 0.22, 0.24, 2, 0.06), grey, [0, 0.63, 0]);
  for (const s of [-1, 1]) {
    add(toy, new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshBasicMaterial({ color: 0x4ad8ff }), [0.07 * s, 0.65, 0.12], [0, 0, 0], [1, 1, 1], false);
    add(toy, new RoundedBoxGeometry(0.08, 0.26, 0.08, 2, 0.03), red, [0.23 * s, 0.36, 0], [0, 0, 0.25 * s]);
  }
  add(toy, new THREE.CylinderGeometry(0.012, 0.012, 0.14, 6), dark, [0, 0.8, 0]);
  add(toy, new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd84a }), [0, 0.88, 0], [0, 0, 0], [1, 1, 1], false);
  toy.traverse((o) => o.isMesh && (o.castShadow = true));

  // torch: body along local +z, light at the front
  const torch = new THREE.Group();
  w.scene.add(torch);
  const tb = add(torch, new THREE.CylinderGeometry(0.06, 0.06, 0.34, 16), std(0x2f6fff, 0.4), [0, 0, 0.02], [Math.PI / 2, 0, 0]);
  tb.castShadow = false;
  add(torch, new THREE.CylinderGeometry(0.1, 0.065, 0.12, 20), std(0xdfe4ee, 0.3, { metalness: 0.4 }), [0, 0, 0.24], [Math.PI / 2, 0, 0]).castShadow = false;
  const lens = add(torch, new THREE.CircleGeometry(0.085, 20), new THREE.MeshBasicMaterial({ color: 0xfff6d0 }), [0, 0, 0.305], [0, 0, 0], [1, 1, 1], false);
  const lensGlow = glow(0xfff2c0, 0.9, 0.9);
  lensGlow.position.set(0, 0, 0.36);
  torch.add(lensGlow);
  // faint visible beam cone
  const beamGeo = new THREE.ConeGeometry(0.75, 1.6, 32, 1, true);
  beamGeo.translate(0, -0.8, 0);
  beamGeo.rotateX(-Math.PI / 2);
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.z = 0.3;
  torch.add(beam);
  const spot = new THREE.SpotLight(0xfff0d0, 0, 0, 0.95, 0.5, 1.2);
  spot.castShadow = true;
  spot.shadow.mapSize.set(2048, 2048);
  spot.shadow.camera.near = 0.05;
  spot.shadow.camera.far = 20;
  spot.shadow.bias = -0.0006;
  spot.shadow.normalBias = 0.01;
  spot.position.set(0, 0, 0.3);
  torch.add(spot);
  w.scene.add(spot.target);

  w.scene.background = roomBg.clone();
  // dark: 0 = room lights on, 1 = only the torch
  w.setDark = (k) => {
    for (const [l, i0] of lights) l.intensity = i0 * (1 - 0.96 * k);
    w.scene.background.copy(roomBg).lerp(darkBg, k);
  };
  w.setTorch = (on) => {
    spot.intensity = 14 * on;
    lensGlow.material.opacity = 0.9 * on;
    lens.material.color.setHex(on > 0.5 ? 0xfff6d0 : 0x8a8f9a);
    beam.material.opacity = 0.08 * on;
  };
  w.setDark(0);
  w.setTorch(0);
  return { ...w, toy, torch, spot, beam };
}
