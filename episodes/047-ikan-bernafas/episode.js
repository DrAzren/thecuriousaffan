// THE CURIOUS AFFAN — Episode 047: "Macam Mana Ikan Bernafas Dalam Air?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildRoom, buildWater, buildGill, buildPond, buildOutro, TANK_AT, A_LR, BIG_AT, N_FIL, POND_Y } from './worlds.js';

const FPS = 30;
const DURATION = 71.05;
const OUTRO = 67.9;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const room = buildRoom();
const sea = buildWater();
const gill = buildGill();
const pond = buildPond();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', YELLOW = '#e0b400', RED = '#ff4d5e', CYAN = '#1fb8c8';

function lookCam(pos, look, fov = 50) {
  cam.position.copy(pos);
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(look);
  cam.updateMatrixWorld(true);
}
function camMove(t, a, b, p0, l0, p1, l1, fov = 50, ease = easeInOut) {
  const k = ease(inv(a, b, t));
  lookCam(V(...mix3(p0, p1, k)), V(...mix3(l0, l1, k)), fov);
}
function pinTag(id, text, p, t, a, b, style, dy = -90) {
  const q = pop(t, a, b);
  if (q.o <= 0 || !p.visible) return;
  ov.tag(id, text, { x: clamp(p.x, 300, 780), y: clamp(p.y + dy, 300, 1380), o: q.o, s: q.s }, style);
}
function bubble(id, text, t, a, b, y = 430, size = 120, style = {}, r = -2) {
  const q = pop(t, a, b, { from: 2 });
  if (q.o > 0) ov.bubble(id, text, { x: W / 2, y, o: q.o, s: q.s, r }, { size, ...style });
}
function topTag(id, text, t, a, b, bg, y = 330) {
  const q = pop(t, a, b);
  if (q.o > 0) ov.tag(id, text, { x: W / 2, y, o: q.o, s: q.s }, { bg, small: true });
}
function qmarks(t, head, a, b, list) {
  list.forEach(([t0, dx, dy, c, r], i) => {
    const q = pop(t, t0, b);
    if (q.o > 0 && t >= a) ov.html('qm' + i, ICONS.qmark(c), { x: clamp(head.x + dx, 110, 970), y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.8, r });
  });
}
// mouth rhythm: open/close about twice a second
const gulp = (t, rate = 2.2) => 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * rate);

// ================================================================== room
const YAW_TANK = Math.atan2(TANK_AT.x - A_LR.x, TANK_AT.z - A_LR.z);
const affHead = () => room.aff.parts.head.getWorldPosition(V());
function roomAff(t, p = {}) {
  const a = room.aff;
  a.root.position.copy(A_LR);
  a.pose({ yaw: YAW_TANK, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
function tankLife(t, { star = -1 } = {}) {
  room.fish.forEach((f, i) => {
    const sp = 0.35 + i * 0.08;
    const ph = t * sp + i * 2.1;
    const x = 0.75 * Math.sin(ph);
    const dir = Math.cos(ph) >= 0 ? 1 : -1;
    let p = V(x, 0.45 + 0.25 * i + 0.06 * Math.sin(t * 1.3 + i), -0.25 + 0.18 * i);
    let yaw = dir > 0 ? 0 : Math.PI;
    if (i === star) {
      p = V(-0.15 + 0.05 * Math.sin(t * 0.8), 0.62, 0.28);
      yaw = 0;
    }
    f.root.position.copy(p);
    f.root.rotation.set(0, yaw, 0);
    f.set(t, 0.8);
    f.mouthOpen(gulp(t + i * 0.3));
  });
  room.bubbles.forEach((b, i) => {
    const u = ((t * 0.5 + i / room.bubbles.length) % 1);
    b.position.set(0.75 + 0.03 * Math.sin(t * 6 + i), 0.12 + u * 1.0, 0.2);
  });
  room.plants.forEach((pl, i) => (pl.rotation.z = 0.08 * Math.sin(t * 1.2 + i)));
  room.jug.visible = false;
}
const tankFront = () => TANK_AT.clone().add(V(0, 0.65, 0.48));

// ============================================================ underwater
function seaSet(t, { oxy = 0, flow = 0 } = {}) {
  const f = sea.big;
  f.root.position.copy(BIG_AT).add(V(0, 0.12 * Math.sin(t * 1.1), 0));
  f.root.rotation.set(0, 0, 0.04 * Math.sin(t * 0.9));
  f.set(t, 1);
  f.mouthOpen(gulp(t, 1.6));
  sea.oxy.forEach((s) => {
    const d = s.userData;
    s.visible = oxy > 0.01;
    s.position.set(d.x + 0.2 * Math.sin(t * 0.6 + d.ph), d.y + 0.2 * Math.sin(t * 0.8 + d.ph), d.z);
    s.scale.setScalar(0.32 * oxy * (0.8 + 0.3 * Math.sin(t * 3 + d.ph)));
  });
  const S = 2.6;
  const path = new THREE.CatmullRomCurve3([
    V(4.8, 3.3, 0.2), V(1.75, 3.15, 0), V(0.9, 3.15, 0), V(0.34, 3.1, 0.75), V(-0.6, 2.7, 2.2),
  ]);
  sea.flow.forEach((s, i) => {
    const u = ((t * 0.3 + i / sea.flow.length) % 1);
    s.visible = flow > 0.01 && !(u > 0.42 && u < 0.6);
    s.position.copy(path.getPoint(u)).add(V(0, 0.15 * Math.sin(i * 2.3), 0.12 * Math.cos(i * 1.7)));
    s.scale.setScalar(0.45 * flow);
  });
  sea.aff.root.position.set(-1.3, 4.6 + 0.15 * Math.sin(t * 1.4), 0.9);
  sea.aff.pose({ yaw: 0.6, blink: blinkAt(t, 2), talk: talk(t) * 0.5, smile: 1, lean: 0.5, armL: { reach: [0.8, 1.3, 0.3 + 0.2 * Math.sin(t * 3)] }, armR: { reach: [-0.8, 1.3, 0.3 - 0.2 * Math.sin(t * 3)] }, legL: { x: 0.3 * Math.sin(t * 4) }, legR: { x: -0.3 * Math.sin(t * 4) } });
  void S;
}

// ================================================================== gill
const RED_C = new THREE.Color(0xe8384a), DULL = new THREE.Color(0x9a6a6a);
function gillSet(t, { flow = 0, absorb = 0, clump = 0, dry = 0, lungs = 0 } = {}) {
  gill.fils.forEach((f, i) => {
    const c = (i - (N_FIL - 1) / 2) / ((N_FIL - 1) / 2);
    // clumping: neighbours lean together in pairs and sag
    const pair = i % 2 === 0 ? 1 : -1;
    f.pv.rotation.z = 0.05 * Math.sin(t * 2 + i) * (1 - clump) + clump * (0.25 * pair - 0.15 * c);
    f.pv.visible = lungs < 0.5;
    f.m.material.color.copy(RED_C).lerp(DULL, clump).offsetHSL(0, 0, 0.12 * absorb * (0.5 + 0.5 * Math.sin(t * 4 + i)));
    f.m.material.emissiveIntensity = 0.3 + 0.5 * absorb;
  });
  gill.water.forEach((s, i) => {
    const R = rng(i * 7 + 1);
    const u = ((t * 0.35 + R()) % 1);
    s.visible = flow > 0.01;
    s.position.set(lerp(-4.5, 4.5, R()), lerp(4.6, -2.0, u), 0.7 + R() * 0.8);
    s.scale.setScalar(0.5 * flow);
  });
  gill.oxy.forEach((s, i) => {
    const R = rng(i * 13 + 2);
    const f = gill.fils[Math.floor(R() * N_FIL)];
    const u = ((t * 0.4 + R()) % 1);
    s.visible = absorb > 0.01 && u < 0.95;
    const start = V(f.home.x + (R() - 0.5) * 0.6, f.home.y - 0.6 - R() * 2.2, 1.6);
    const end = V(f.home.x, start.y, 0.1);
    s.position.copy(start).lerp(end, easeIn(u));
    s.scale.setScalar(0.5 * (1 - u * 0.6) * absorb);
  });
  gill.sky.material.uniforms.top.value.setHex(0x2a8ac8).lerp(new THREE.Color(0xf4e8d0), dry);
  gill.sky.material.uniforms.bot.value.setHex(0x0a2a5a).lerp(new THREE.Color(0xd8c8a8), dry);
  gill.lungs.visible = lungs > 0.5;
  gill.scene.children.forEach((c) => { if (c.geometry && c.geometry.type === 'TubeGeometry') c.visible = lungs < 0.5; });
  gill.lungs.scale.setScalar(1 + 0.04 * Math.sin(t * 2));
}

// ================================================================== pond
function pondSet(t, rise = [0, 0, 0]) {
  const lanes = [1.2, 2.0, 2.6];
  pond.fish.forEach((f, i) => {
    const sp = 0.25 + i * 0.05;
    const x = 2.8 * Math.sin(t * sp + i * 2);
    const dir = Math.cos(t * sp + i * 2) >= 0 ? 1 : -1;
    const r = easeInOut(clamp(rise[i]));
    const y = lerp(lanes[i], POND_Y - 0.25, r);
    f.root.position.set(lerp(x, -2.4 + i * 2.4, r), y, 0.2 - i * 0.3);
    f.root.rotation.set(0, dir > 0 || r > 0.5 ? 0 : Math.PI, r * 1.0);
    f.set(t, 1);
    f.mouthOpen(r > 0.9 ? gulp(t, 3) : 0.2);
    const ring = pond.rings[i];
    const g = r > 0.95 ? ((t * 0.8) % 1) : -1;
    ring.visible = g >= 0;
    if (ring.visible) {
      ring.position.set(f.root.position.x + 0.5, POND_Y + 0.03, f.root.position.z);
      ring.scale.setScalar(0.5 + 2.5 * g);
      ring.material.opacity = 0.8 * (1 - g);
    }
  });
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — living room: Affan watches the aquarium
  [0, 2.84, (t) => {
    tankLife(t);
    roomAff(t, { headPitch: 0.1 });
    camMove(t, 0, 2.84, [-2.6, 2.4, 5.4], [-0.3, 1.2, -0.4], [-2.2, 2.2, 4.8], [-0.3, 1.2, -0.4], 55);
    const q = pop(t, 0.4, 2.8);
    ov.tag('ep', 'EPISOD 47', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return room;
  }],
  // S2 — "Papa! Mulut ikan ni buka tutup, buka tutup... ikan minum air ke?"
  [2.84, 7.88, (t) => {
    tankLife(t, { star: 0 });
    roomAff(t);
    const f = room.fish[0];
    const fp = room.tank.localToWorld(f.root.position.clone());
    lookCam(fp.clone().add(V(0.15, 0.08, 1.6)), fp.clone().add(V(0.08, 0, 0)), 40);
    const pp = pop(t, 2.84, 3.6, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    [[3.88, 'BUKA'], [4.38, 'TUTUP'], [4.98, 'BUKA'], [5.44, 'TUTUP']].forEach(([a, txt], i) => {
      const q = pop(t, a, a + 0.9, { from: 2 });
      if (q.o > 0) ov.tag('bt' + i, txt, { x: 300 + (i % 2) * 480, y: 1100 - (i > 1 ? 110 : 0), o: q.o, s: q.s }, { bg: i % 2 ? PURPLE : ORANGE });
    });
    bubble('minum', 'IKAN MINUM AIR?', t, 6.3, 7.85, 430, 110, { top: '#e0f6ff', bot: '#2fa8d8' });
    return room;
  }],
  // S3 — "Kita tak boleh bernafas dalam air... macam mana ikan boleh?"
  [7.88, 11.84, (t) => {
    tankLife(t);
    roomAff(t, { yaw: YAW_TANK + 1.6, ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    const ah = affHead();
    lookCam(ah.clone().add(V(0.6, 0.0, 3.4)), ah.clone().add(V(-0.3, -0.4, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.4, 0)));
    qmarks(t, hd, 10.3, 11.8, [[10.35, -260, 100, '#ffcf33', -12], [10.6, 250, 60, '#3fa2ff', 10], [10.85, 280, 240, '#ffcf33', 14]]);
    topTag('kita', 'KITA TAK BOLEH BERNAFAS DALAM AIR', t, 7.88, 10.3, BLUE);
    bubble('macam', 'MACAM MANA IKAN BOLEH?', t, 10.34, 11.8, 430, 96, { top: '#fff6d0', bot: '#ffb21f' });
    return room;
  }],
  // S4 — "Jom ikut Affan cari jawapan!" into the tank
  [11.84, 14.3, (t) => {
    tankLife(t);
    const up = keys(t, [[11.86, 0], [12.1, 1], [13.3, 1], [13.6, 0.6]], easeOut);
    roomAff(t, { yaw: YAW_TANK + 1.6, smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(12.6, 14.3, t));
    lookCam(ah.clone().add(V(0.6, 0.0, 3.4)).lerp(tankFront().add(V(0, 0, 0.3)), k), ah.clone().add(V(-0.3, -0.4, 0)).lerp(tankFront().add(V(0, 0, -1)), k), 46);
    ov.swirl(t, W / 2, 820, inv(12.0, 14.1, t));
    ov.flash(inv(13.85, 14.3, t) ** 2, '200,240,255');
    return room;
  }],
  // S5 — there's oxygen in water too, but very little, hidden in it
  [14.3, 20.6, (t) => {
    seaSet(t, { oxy: inv(16.0, 16.6, t), flow: 0 });
    camMove(t, 14.3, 20.6, [0.6, 3.6, 10.5], [0, 3.6, 0], [-0.4, 3.9, 8.2], [-0.6, 3.9, 0], 50);
    ov.flash(1 - inv(14.3, 14.6, t), '200,240,255');
    const q = pop(t, 16.12, 20.55);
    if (q.o > 0) {
      let best = null, bd = 1e9;
      sea.oxy.forEach((o) => {
        const sp = scr(o.position.clone());
        const d = Math.hypot(sp.x - 540, sp.y - 1000);
        if (sp.visible && d < bd) { bd = d; best = sp; }
      });
      const p = best || { x: 540, y: 1000 };
      ov.tag('oks', 'OKSIGEN', { x: clamp(p.x, 300, 780), y: p.y - 60, o: q.o, s: q.s }, { bg: CYAN, pointer: 'down' });
    }
    topTag('sedikit', 'SEDIKIT SANGAT!', t, 17.92, 20.55, PURPLE, 1230);
    topTag('tersorok', 'TERSOROK DALAM AIR', t, 18.98, 20.55, BLUE, 1310);
    return sea;
  }],
  // S6 — fish breathe with gills: water in at the mouth, over the gills, out the side
  [20.6, 28.62, (t) => {
    seaSet(t, { oxy: 1, flow: inv(22.8, 23.2, t) });
    camMove(t, 20.6, 28.62, [-0.4, 3.9, 8.2], [-0.6, 3.9, 0], [0.7, 3.4, 8.0], [0.7, 3.2, 0], 48);
    const slit = V(0.34, 3.1, 0.75);
    pinTag('insang', 'INSANG', scr(slit.clone().add(V(0, 0.5, 0))), t, 21.88, 28.6, { bg: RED, pointer: 'down' }, -40);
    pinTag('mulut', 'MASUK MELALUI MULUT', scr(V(1.9, 2.8, 0)), t, 23.18, 25.4, { bg: BLUE, pointer: 'up' }, 90);
    pinTag('celah', 'KELUAR DI CELAH', scr(V(-0.4, 2.6, 2.0)), t, 26.38, 28.6, { bg: BLUE, pointer: 'up' }, 80);
    bubble('guna', 'GUNA INSANG!', t, 21.88, 23.0, 430, 130, { top: '#ffe0e0', bot: '#ff4d5e' });
    return sea;
  }],
  // S7 — gill filaments: thin red plates full of tiny blood vessels; oxygen passes into the blood
  [28.62, 38.22, (t) => {
    gillSet(t, { flow: inv(34.3, 34.7, t), absorb: inv(35.6, 36.2, t) });
    if (t < 33.0) camMove(t, 28.62, 33.0, [0, 1.8, 12.5], [0, 1.4, 0], [-0.4, 1.6, 8.0], [-0.6, 1.2, 0], 50);
    else camMove(t, 33.0, 38.22, [-0.4, 1.6, 8.0], [-0.6, 1.2, 0], [0.2, 1.2, 9.5], [0, 1.0, 0], 50);
    ov.flash(1 - inv(28.62, 28.9, t));
    pinTag('keping', 'KEPINGAN HALUS', scr(gill.fils[8].home.clone().add(V(0, -3.6, 0.4))), t, 29.74, 31.8, { bg: PINK, pointer: 'up' }, -20);
    topTag('merah', 'BERWARNA MERAH', t, 31.12, 32.5, RED);
    topTag('saluran', 'PENUH SALURAN DARAH KECIL', t, 32.56, 34.3, RED, 410);
    topTag('airlalu', 'AIR LALU...', t, 34.34, 35.7, BLUE);
    bubble('masuk', 'OKSIGEN MASUK\nKE DALAM DARAH!', t, 36.06, 38.2, 430, 100, { top: '#e0ffff', bot: '#1fb8c8' });
    return gill;
  }],
  // S8 — out of water, the gills stick together and stop working
  [38.22, 43.74, (t) => {
    const dry = easeInOut(inv(38.6, 39.6, t));
    gillSet(t, { flow: 1 - dry, absorb: 0, clump: easeInOut(inv(40.6, 41.6, t)), dry });
    camMove(t, 38.22, 43.74, [0.2, 1.2, 9.5], [0, 1.0, 0], [0.1, 1.4, 8.4], [0, 1.2, 0], 50);
    topTag('keluar', 'KELUAR DARI AIR', t, 38.4, 40.5, ORANGE);
    bubble('lekat', 'MELEKAT-LEKAT!', t, 41.14, 42.5, 430, 120, { top: '#f6e8d0', bot: '#a87a3a' });
    const cq = pop(t, 42.58, 43.7, { from: 2 });
    if (cq.o > 0) ov.html('x1', ICONS.cross(), { x: W / 2, y: 820, o: cq.o, s: cq.s });
    return gill;
  }],
  // S9 — our lungs can't take oxygen from water
  [43.74, 47.12, (t) => {
    gillSet(t, { flow: 1, absorb: 0, lungs: 1 });
    lookCam(V(0, 2.2, 8.5), V(0, 1.8, 0), 50);
    ov.flash((1 - inv(43.74, 44.0, t)) * 0.5);
    pinTag('paru', 'PARU-PARU KITA', scr(V(0, 4.0, 0)), t, 43.74, 47.1, { bg: PINK, pointer: 'down' }, -30);
    const cq = pop(t, 45.34, 47.1, { from: 2 });
    if (cq.o > 0) ov.html('x2', ICONS.cross(), { x: W / 2, y: 900, o: cq.o, s: cq.s * 1.1 });
    bubble('tak', 'TAK BOLEH AMBIL\nOKSIGEN DARI AIR!', t, 45.34, 47.1, 430, 92, { top: '#ffe0e0', bot: '#ff4d5e' });
    return gill;
  }],
  // S10 — keli, puyu and haruan have an extra breathing organ: they gulp air at the surface
  [47.12, 56.1, (t) => {
    const r = (a) => keys(t, [[a, 0], [a + 0.7, 1], [52.6, 1], [53.2, 0], [53.5, 0], [54.4, 1]], easeInOut);
    pondSet(t, [r(48.3), r(49.2), r(49.9)]);
    camMove(t, 47.12, 56.1, [0.2, 4.6, 11.5], [0, 2.6, 0], [0.0, 4.4, 10.5], [0, 2.8, 0], 50);
    ov.flash(1 - inv(47.12, 47.4, t));
    topTag('tahu', 'TAHU TAK?', t, 47.12, 48.1, PURPLE);
    pond.fish.forEach((f, i) => {
      const nm = ['KELI', 'PUYU', 'HARUAN'][i];
      const a = [48.46, 49.34, 50.0][i];
      pinTag('nm' + i, nm, scr(f.root.position.clone().add(V(0, 0.8, 0))), t, a, 52.9, { bg: ['#6a6a7a', '#6a8a4a', '#8a6a3a'][i], pointer: 'down' }, -30);
    });
    bubble('organ', 'ORGAN NAFAS\nTAMBAHAN!', t, 51.16, 53.4, 430, 100, { top: '#efe0ff', bot: '#8a5cff' });
    bubble('hirup', 'HIRUP UDARA!', t, 55.14, 56.05, 430, 130, { top: '#e0f6ff', bot: '#2fa8d8' });
    return pond;
  }],
  // S11 — "Waaah, rupanya insang tu macam penapis oksigen! Jangan lupa tukar air akuarium..."
  [56.1, 65.68, (t) => {
    tankLife(t);
    const pour = t > 60.6 && t < 64.6;
    const pk = easeInOut(inv(60.7, 61.4, t)) * (1 - easeInOut(inv(64.0, 64.5, t)));
    roomAff(t, {
      yaw: pour ? YAW_TANK + 0.6 : YAW_TANK + 1.6,
      wow: keys(t, [[56.15, 0], [56.3, 0.9], [56.9, 0.9], [57.2, 0]]), smile: 1, brow: 0.5,
      ...(pour ? { armR: { reach: mix3([-0.55, 0.3, 0.2], [-0.35, 1.25, 0.75], pk), pole: [-1, -0.5, -0.3] }, armL: { reach: mix3([0.55, 0.3, 0.2], [0.15, 1.15, 0.75], pk), pole: [1, -0.5, -0.3] } } : {}),
    });
    if (pour) {
      const hand = room.aff.parts.arms.R.hand.getWorldPosition(V());
      room.jug.visible = true;
      room.jug.position.copy(hand).add(V(0.05, 0.05, 0));
      room.jug.rotation.set(0, 0, 0.9 * pk);
    }
    const ah = affHead();
    if (t < 60.6) lookCam(ah.clone().add(V(0.6, 0.0, 3.4)), ah.clone().add(V(-0.3, -0.4, 0)), 46);
    else lookCam(V(-2.2, 2.2, 4.8), V(-0.3, 1.2, -0.4), 55);
    ov.flash((1 - inv(56.1, 56.4, t)) * 0.9, '255,250,235');
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 56.15, 60.5);
    if (t < 60.6) ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 200, 150, 900), y: clamp(hd.y - 160, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(56.2, 56.5, t) * (1 - inv(58.6, 59.2, t)) });
    bubble('penapis', 'MACAM PENAPIS\nOKSIGEN!', t, 57.96, 60.6, 440, 104, { top: '#e0ffff', bot: '#1fb8c8' });
    topTag('tukar', 'TUKAR AIR AKUARIUM', t, 61.26, 65.6, BLUE);
    bubble('cukup', 'OKSIGEN CUKUP!', t, 63.86, 65.6, 440, 124, { top: '#e0ffff', bot: '#1fb8c8' }, 3);
    return room;
  }],
  // S12 — "Apa lagi kita nak belajar lepas ni?"
  [65.68, OUTRO, (t) => {
    tankLife(t);
    const tk = keys(t, [[65.7, 0], [66.1, 1]]);
    const th2 = POSES.thinkR.armR;
    roomAff(t, { yaw: YAW_TANK + 1.6, smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(ah.clone().add(V(0.6, 0.0, 3.3)), ah.clone().add(V(-0.3, -0.4, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 65.68, OUTRO - 0.05, [[65.7, -260, -100, '#ffcf33', -12], [66.0, 250, -160, '#3fa2ff', 10], [66.3, 300, 60, '#ffcf33', 14]]);
    return room;
  }],
  // Outro — The Curious Affan logo
  [OUTRO, DURATION, (t) => {
    const k = easeOut(inv(OUTRO, OUTRO + 0.7, t));
    outro.aff.root.position.set(0, 0, 0);
    outro.aff.pose({ ...POSES.thinkR, smile: 1, blink: blinkAt(t, 9), headRoll: -0.08, lookX: 0.25, lookY: 0.15, headYaw: 0.08 });
    lookCam(V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash(1 - inv(OUTRO, OUTRO + 0.35, t));
    const g = ov.g;
    const ra = inv(OUTRO + 0.1, OUTRO + 0.7, t);
    g.save();
    g.globalAlpha = ra;
    g.strokeStyle = '#ffe58a';
    g.shadowColor = '#fff3b0';
    g.shadowBlur = 40;
    g.lineWidth = 14;
    g.beginPath();
    g.arc(W / 2, hc.y, 420 * (0.85 + 0.15 * easeOut(ra)), 0, Math.PI * 2);
    g.stroke();
    g.restore();
    ov.sparkles(t, { n: 30, seed: 41, y: 260, h: 1150, a: ra });
    const ic = pop(t, OUTRO + 0.6, 99);
    ov.html('oBulb', ICONS.bulb(), { x: 175, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.55, r: -10 });
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    ov.html('oQ2', ICONS.qmark('#2f6fff'), { x: 220, y: 720 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.6, r: -12 });
    drawLogo(ov, { k: [pop(t, OUTRO + 0.3, 99), pop(t, OUTRO + 0.5, 99), pop(t, OUTRO + 0.7, 99)], star: pop(t, OUTRO + 0.9, 99) });
    return outro;
  }],
];

function frame(t) {
  ov.begin();
  cam.up.set(0, 1, 0);
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  const w = shot[2](t);
  if (w.sky) w.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(w.scene, cam);
  if (w !== outro) ov.vignette(0.2);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): the big fish underwater with water flowing through its gills.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 24.0;
  seaSet(t, { oxy: 1, flow: 1 });
  sea.big.mouthOpen(1);
  lookCam(V(0.8, 3.4, 7.2), V(0.5, 3.4, 0), 50);
  sea.sky.position.copy(cam.position);
  sea.aff.root.visible = false;
  renderer.setViewport(0, 0, W, H);
  renderer.render(sea.scene, cam);
  sea.aff.root.visible = true;
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 720);
  top.addColorStop(0, 'rgba(0,30,70,0.5)');
  top.addColorStop(1, 'rgba(0,30,70,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 720);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(0,20,50,0)');
  bot.addColorStop(1, 'rgba(0,20,50,0.55)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 47', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'IKAN MINUM', { x: W / 2, y: 445, r: -3 }, { size: 120 });
  ov.bubble('thTitle2', 'AIR?!', { x: W / 2, y: 600, r: 2 }, { size: 170, top: '#e0f6ff', bot: '#2fa8d8' });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 930, y: 790, r: 14, s: 0.9 });
  drawLogo(ov, { y: 1425, scale: 0.58 });
  ov.end();
}

window.EP = {
  fps: FPS,
  duration: DURATION,
  frame,
  thumbnail,
  ready: (async () => {
    env = await loadEnvelope('./audio/narration.mp3', FPS);
    await Promise.all(['800 60px "Baloo 2"', '700 60px "Baloo 2"', '700 60px Fredoka', '600 60px Fredoka'].map((f) => document.fonts.load(f)));
    frame(0);
    return true;
  })(),
};
