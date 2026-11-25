// THE CURIOUS AFFAN — Episode 064: "Kenapa Bertih Jagung Meletup?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, backOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';

import { buildKitchen64, buildKernelLab, buildOutro, AFF_POS, MAMA_POS, BURNER_AT, KERN_AT, COMP_AT } from './worlds.js';

const FPS = 30;
const DURATION = 55.65;
const OUTRO = 52.5;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const kit = buildKitchen64();
const lab = buildKernelLab();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', RED = '#ff4d5e', GOLD = '#d8a020', CORN = '#e89a10';
const CREAM = { top: '#fffbe6', bot: '#f0c040' };

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

// ================================================================ kitchen
const AFF_SCALE = kit.aff.root.scale.x;
const AFF_YAW = Math.atan2(BURNER_AT.x - AFF_POS.x, BURNER_AT.z - AFF_POS.z);
const YAW_CAM = Math.atan2(0.4, 1);
const POPS = [5.96, 6.28, 6.6];
// Mama shakes the pot over the burner (shake 0..1); lid rattles and corn pops (popping 0..1)
function mamaSet(t, { shake = 1, popping = 0, p = {} } = {}) {
  const m = kit.mama;
  m.root.position.copy(MAMA_POS);
  const sx = 0.05 * Math.sin(t * 9) * shake;
  kit.pot.position.set(sx, 0.12, 0);
  // the lid jumps at each pop
  let lift = 0;
  POPS.forEach((tp) => { if (popping && t > tp && t < tp + 0.25) lift = Math.max(lift, Math.sin(((t - tp) / 0.25) * Math.PI) * 0.05); });
  lift += popping * 0.008 * Math.abs(Math.sin(t * 31));
  kit.lid.position.y = 0.3 + lift;
  kit.lid.rotation.z = lift * 1.2;
  const base = { yaw: 0, lean: 0.12, blink: blinkAt(t, 5), smile: 0.9, ...p };
  m.pose(base);
  m.root.updateMatrixWorld(true);
  kit.pot.updateMatrixWorld(true);
  const hR = kit.pot.localToWorld(V(-0.33, 0.25, 0.02)), hL = kit.pot.localToWorld(V(0.33, 0.25, 0.02));
  if (!p.armR) base.armR = { reach: m.toTorso(hR), pole: [-1, -0.7, -0.2] };
  if (!p.armL) base.armL = { reach: m.toTorso(hL), pole: [1, -0.7, -0.2] };
  m.pose(base);
  m.root.updateMatrixWorld(true);
  // flames flicker
  kit.flames.forEach((f, i) => f.scale.set(1, 0.8 + 0.4 * Math.abs(Math.sin(t * 13 + i * 1.7)), 1));
  // popcorn in the pot rises as it pops
  const fill = clamp(popping);
  kit.inside.forEach((c, i) => {
    c.visible = i / kit.inside.length < 0.25 + 0.75 * fill;
    c.position.y = c.userData.h + 0.01 * Math.sin(t * 20 + i);
  });
  // jumpers fly out of the pot at each pop
  kit.jumpers.forEach((j, i) => {
    const tp = POPS[i % 3] + (i >= 3 ? 0.12 : 0);
    const u = t - tp;
    j.visible = popping > 0 && u > 0 && u < 0.9;
    if (!j.visible) return;
    const top = kit.pot.localToWorld(V(0, 0.33, 0));
    const a = i * 2.1 + 0.4;
    j.position.set(top.x + Math.cos(a) * 0.5 * u, top.y + 1.4 * u - 2.4 * u * u, top.z + Math.sin(a) * 0.35 * u + 0.12 * u);
    j.rotation.set(u * 9 + i, u * 7, u * 5);
  });
  // a little steam
  kit.steam.forEach((sp, i) => {
    const ph = (t * 0.45 + i / kit.steam.length) % 1;
    const top = kit.pot.localToWorld(V(0, 0.36, 0));
    sp.position.set(top.x + 0.08 * Math.sin(ph * 6 + i), top.y + ph * 0.6, top.z);
    sp.scale.setScalar(0.12 + ph * 0.25);
    sp.material.opacity = 0.35 * Math.sin(ph * Math.PI) * clamp(0.4 + popping);
  });
}
// Affan stands on his stool at the island, by the bowl of popcorn
function affSet(t, p = {}) {
  const a = kit.aff;
  a.root.position.copy(AFF_POS);
  a.pose({ yaw: AFF_YAW, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
const affHead = () => kit.aff.parts.head.getWorldPosition(V());
const mamaHead = () => kit.mama.parts.head.getWorldPosition(V());
// a point in front of Affan's face along his facing
const affFace = (yaw, d) => affHead().add(V(Math.sin(yaw) * d, 0.12, Math.cos(yaw) * d));
// eating: the right hand goes bowl -> mouth (e 0..1), with the snack in it
function eat(t, e, yaw) {
  const a = kit.aff;
  const bowl = kit.bowl.localToWorld(V(-0.05, 0.25, 0.08));
  const mouth = affFace(yaw, 0.6).add(V(0, -0.3, 0));
  const hand = bowl.clone().lerp(mouth, e);
  return { armR: { reach: a.toTorso(hand), pole: [-1, -0.6, -0.3] } };
}
function snackFollow(e) {
  kit.snack.visible = e > 0.05 && e < 0.97;
  if (kit.snack.visible) kit.snack.position.copy(kit.aff.parts.arms.R.hand.getWorldPosition(V())).add(V(0, 0.04, 0.03));
}
function kitReset() {
  kit.snack.visible = false;
}

// ============================================================ kernel lab
const sm = (a, b, t) => easeInOut(inv(a, b, t));
// heat 0..1 (flames), steam 0..1 (droplets -> puffs), push 0..1 (arrows), burst time
function kernSet(t, { heat = 0, steam = 0, push = 0, shake = 0, burst = -1 } = {}) {
  const k = lab.kern;
  lab.fire.visible = heat > 0.01;
  lab.flames.forEach((f, i) => {
    const s = heat * (0.75 + 0.35 * Math.abs(Math.sin(t * 9 + f.userData.seed)));
    f.scale.set(heat, s, heat);
    f.position.y = 0.45 * s;
  });
  lab.fireGlow.material.opacity = 0.6 * heat;
  const b = burst >= 0 ? t - burst : -1;
  const whole = b < 0;
  // shaking under pressure
  k.position.set(KERN_AT.x + shake * 0.06 * Math.sin(t * 47), KERN_AT.y + 0.9 + shake * 0.04 * Math.sin(t * 53), KERN_AT.z);
  k.rotation.z = shake * 0.03 * Math.sin(t * 37);
  k.visible = whole;
  lab.drops.forEach((d, i) => {
    const h = d.userData.home, sd = d.userData.seed;
    const jig = 0.04 * heat;
    d.position.set(h.x + jig * Math.sin(t * 17 + sd), h.y + jig * Math.cos(t * 19 + sd), h.z);
    const gone = clamp(steam * 1.4 - (i / lab.drops.length) * 0.4);
    d.scale.setScalar(1 - gone);
    d.visible = gone < 0.98;
    const p = lab.puffs[i];
    p.visible = gone > 0.02;
    // steam zips around inside the hull
    const sp = 1 + 3 * steam;
    p.position.set(h.x * (0.6 + 0.4 * Math.sin(t * 2.3 * sp + sd)) + 0.3 * Math.sin(t * 3.1 * sp + sd * 2), h.y + 0.35 * Math.sin(t * 2.7 * sp + sd), 0.35 + 0.2 * Math.cos(t * 2.1 * sp + sd));
    p.scale.setScalar(0.3 + 0.7 * gone + 0.25 * push);
    p.material.opacity = 0.8 * gone;
  });
  lab.arrows.forEach((g, i) => {
    g.visible = push > 0.02;
    const s = push * (0.8 + 0.25 * Math.sin(t * 10 + i));
    g.scale.setScalar(Math.max(0.01, s));
  });
  lab.starch.children.forEach((m) => {
    m.scale.set(1, 0.85, 1).multiplyScalar(1 + 0.04 * push * Math.sin(t * 12 + m.userData.home.x * 5));
  });
  // burst: shards fly, starch foam blows up into a big popcorn
  lab.shards.forEach((s, i) => {
    s.visible = !whole && b < 2.2;
    if (!s.visible) return;
    const d = s.userData.dir;
    const u = b;
    s.position.set(KERN_AT.x + d.x * 5 * u, KERN_AT.y + 0.9 + d.y * 6 * u - 4 * u * u, KERN_AT.z + d.z * 5 * u);
    s.rotation.set(s.userData.spin.x * u, s.userData.spin.y * u, s.userData.spin.z * u);
  });
  lab.bigPop.visible = !whole;
  if (!whole) {
    const g = backOut(clamp(b / 0.7), 2.2);
    lab.bigPop.scale.setScalar(Math.max(0.05, 0.4 + 1.25 * g));
    lab.bigPop.rotation.set(0.2 * Math.sin(t * 0.8), t * 0.35, 0.1);
    lab.bigPop.position.set(KERN_AT.x, KERN_AT.y + 2.6 + 0.12 * Math.sin(t * 2), KERN_AT.z);
  }
  return b;
}
function gaugeSet(level) {
  lab.gauge.visible = level >= 0;
  lab.needle.rotation.z = lerp(Math.PI * 0.72, -Math.PI * 0.72, clamp(level));
}
function compSet(t, heat = 1) {
  lab.compFire.forEach((f) => {
    const s = heat * (0.75 + 0.35 * Math.abs(Math.sin(t * 9 + f.userData.seed)));
    f.scale.set(heat, s, heat);
  });
  // the ordinary kernel leaks steam through its cracks
  const pk = lab.plain.position;
  lab.leaks.forEach((p, i) => {
    const ph = (t * 0.6 + i / lab.leaks.length) % 1;
    const c = lab.cracks[i % lab.cracks.length];
    const at = lab.plain.localToWorld(c.position.clone());
    const out = V((c.position.x > 0 ? 1 : -1) * 0.6, 1, 0.6).normalize();
    p.position.copy(at).addScaledVector(out, ph * 1.6);
    p.scale.setScalar(0.35 + ph * 1.1);
    p.material.opacity = 0.95 * Math.sin(ph * Math.PI) * heat;
  });
  // the popcorn kernel holds its steam (a warm glow), the ordinary one shrinks a little
  lab.holdGlow.material.opacity = 0.5 * heat * (0.8 + 0.2 * Math.sin(t * 6));
  lab.good.position.y = 0.3 + 0.02 * Math.sin(t * 31) * heat;
  void pk;
}

// ================================================================== SHOTS
const SHOTS = [
  // S1 — kitchen: Mama pops corn in a pot, Affan watches from his stool
  [0, 2.04, (t) => {
    kitReset();
    mamaSet(t, { shake: 1, popping: 0 });
    affSet(t, { talk: 0, headPitch: 0.08 });
    camMove(t, 0, 2.04, [1.2, 2.6, 5.6], [0.6, 1.75, -1.0], [1.05, 2.5, 5.0], [0.6, 1.75, -1.0], 50);
    const q = pop(t, 0.4, 2.0);
    ov.tag('ep', 'EPISOD 64', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return kit;
  }],
  // S2 — "Papa! Mama masak jagung dalam periuk..."
  [2.04, 5.12, (t) => {
    kitReset();
    mamaSet(t, { shake: 1, popping: 0, p: { headYaw: 0.25 * sm(3.3, 3.8, t) - 0.25 * sm(4.6, 5.0, t) } });
    affSet(t, { yaw: YAW_CAM, armL: { reach: kit.aff.toTorso(BURNER_AT.clone().add(V(0.2, 0.7, 0.2))), pole: [1, -0.5, -0.3] } });
    const mh = mamaHead();
    camMove(t, 2.04, 5.12, mh.clone().add(V(1.2, -0.2, 3.6)).toArray(), mh.clone().add(V(0.05, -0.55, 0)).toArray(), mh.clone().add(V(1.0, -0.25, 3.2)).toArray(), mh.clone().add(V(0.05, -0.6, 0)).toArray(), 46);
    const pp = pop(t, 2.06, 3.0, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    pinTag('mama', 'MAMA', scr(mh.clone().add(V(0, 0.6, 0))), t, 3.0, 5.1, { bg: PINK, pointer: 'down' }, -40);
    pinTag('periuk', 'PERIUK JAGUNG', scr(kit.pot.localToWorld(V(0, 0.4, 0))), t, 3.72, 5.1, { bg: CORN, pointer: 'down' }, -50);
    return kit;
  }],
  // S3 — "tiba-tiba... pop! pop! pop!"
  [5.12, 7.12, (t) => {
    kitReset();
    mamaSet(t, { shake: 0.4, popping: inv(5.9, 7.0, t) });
    affSet(t, { wow: keys(t, [[5.9, 0], [6.05, 1], [7.0, 1]]), yaw: AFF_YAW });
    const top = kit.pot.localToWorld(V(0, 0.3, 0));
    camMove(t, 5.12, 7.12, top.clone().add(V(0.45, 0.35, 1.4)).toArray(), top.clone().add(V(0, 0.05, 0)).toArray(), top.clone().add(V(0.35, 0.45, 1.75)).toArray(), top.clone().add(V(0, 0.2, 0)).toArray(), 50);
    topTag('tiba', 'TIBA-TIBA...', t, 5.18, 5.95, PURPLE);
    POPS.forEach((tp, i) => {
      const q = pop(t, tp, tp + 0.9, { from: 2.2 });
      if (q.o > 0) ov.bubble('pop' + i, 'POP!', { x: [250, 830, 560][i], y: [760, 640, 1180][i], o: q.o, s: q.s * 0.75, r: [-10, 8, -4][i] }, { size: 110, top: '#fff3d6', bot: '#ff8a3d' });
    });
    return kit;
  }],
  // S4 — "Jadi bertih!" Affan picks one from his bowl
  [7.12, 8.44, (t) => {
    kitReset();
    mamaSet(t, { shake: 0.3, popping: 1 });
    const e = keys(t, [[7.15, 0], [7.7, 0.55], [8.4, 0.55]]);
    affSet(t, { yaw: YAW_CAM * 0.6, wow: 0, ...eat(t, e, YAW_CAM * 0.6) });
    snackFollow(e);
    const ah = affHead();
    lookCam(ah.clone().add(V(0.35, 0.0, 2.9)), ah.clone().add(V(-0.05, -0.4, 0)), 46);
    bubble('bertih', 'JADI BERTIH!', t, 7.18, 8.42, 430, 120, CREAM);
    return kit;
  }],
  // S5 — "Kenapa jagung meletup?"
  [8.44, 10.16, (t) => {
    kitReset();
    mamaSet(t, { shake: 0.3, popping: 1 });
    affSet(t, { yaw: YAW_CAM, ...POSES.thinkR, headRoll: 0.1, headPitch: -0.05 });
    const ah = affHead();
    lookCam(ah.clone().add(V(0.6, 0.05, 3.0)), ah.clone().add(V(0, -0.4, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    qmarks(t, hd, 8.46, 10.14, [[8.5, -260, 80, '#ffcf33', -12], [8.8, 250, 40, '#3fa2ff', 10], [9.1, 280, 220, '#ffcf33', 14]]);
    bubble('kenapa', 'KENAPA JAGUNG\nMELETUP?', t, 8.5, 10.14, 430, 110, CREAM);
    return kit;
  }],
  // S6 — "Jom ikut Affan cari jawapan!" then dive into the pot
  [10.16, 12.12, (t) => {
    kitReset();
    mamaSet(t, { shake: 0.3, popping: 1 });
    const up = keys(t, [[10.18, 0], [10.45, 1], [11.2, 1], [11.5, 0.5]], easeOut);
    affSet(t, { yaw: YAW_CAM, armR: { reach: [lerp(-0.6, -0.6, up), lerp(0.3, 1.9 + 0.06 * Math.sin(t * 14), up), lerp(0.25, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(11.0, 12.12, t));
    const top = kit.pot.localToWorld(V(0, 0.32, 0));
    lookCam(ah.clone().add(V(0.6, 0.05, 3.0)).lerp(top.clone().add(V(0, 0.25, 0.25)), k), ah.clone().add(V(0, -0.4, 0)).lerp(top, k), 46);
    ov.swirl(t, W / 2, 820, inv(10.3, 12.0, t));
    ov.flash(inv(11.7, 12.12, t) ** 2, '255,246,220');
    return kit;
  }],
  // S7 — inside every kernel: a little water, soft starch, wrapped in a very hard hull
  [12.12, 19.44, (t) => {
    kernSet(t);
    gaugeSet(-1);
    const a = lerp(-0.35, 0.25, sm(12.12, 19.44, t));
    lookCam(V(KERN_AT.x + Math.sin(a) * 9.4, 3.2, KERN_AT.z + Math.cos(a) * 9.4), V(KERN_AT.x, 2.2, KERN_AT.z), 50);
    ov.flash(1 - inv(12.12, 12.45, t));
    topTag('biji', 'SEBIJI JAGUNG (DIBESARKAN)', t, 12.2, 19.42, CORN);
    pinTag('air', 'AIR', scr(lab.kern.localToWorld(lab.drops[3].position.clone())), t, 14.02, 19.42, { bg: BLUE, pointer: 'down' }, -60);
    pinTag('kanji', 'KANJI LEMBUT', scr(lab.kern.localToWorld(V(-0.6, 2.4, 0.4))), t, 15.28, 19.42, { bg: '#c8a050', pointer: 'down' }, -60);
    pinTag('kulit', 'KULIT SANGAT KERAS', scr(lab.kern.localToWorld(V(1.4, 1.3, -0.3))), t, 17.3, 19.42, { bg: '#c86a10', pointer: 'left' }, 0);
    return lab;
  }],
  // S8 — heated: the water becomes steam; steam needs lots of room but the hull won't let it out
  [19.44, 27.16, (t) => {
    const heat = sm(19.5, 20.4, t);
    const steam = sm(21.0, 22.4, t);
    const push = sm(22.5, 23.6, t);
    kernSet(t, { heat, steam, push, shake: 0.3 * push });
    gaugeSet(-1);
    camMove(t, 19.44, 27.16, [KERN_AT.x + 2.0, 2.8, KERN_AT.z + 9.6], [KERN_AT.x, 2.0, KERN_AT.z], [KERN_AT.x + 1.2, 2.9, KERN_AT.z + 8.6], [KERN_AT.x, 2.1, KERN_AT.z], 50);
    ov.flash(1 - inv(19.44, 19.7, t));
    topTag('panas', 'DIPANASKAN 🔥', t, 19.5, 21.0, ORANGE);
    topTag('wap', 'AIR ➜ WAP', t, 21.02, 22.48, BLUE);
    topTag('ruang', 'WAP PERLUKAN BANYAK RUANG', t, 22.5, 27.14, PURPLE);
    bubble('keluar', 'TAK BAGI\nKELUAR!', t, 24.44, 27.14, 1180, 110, { top: '#fff0f0', bot: '#ff6b6b' });
    return lab;
  }],
  // S9 — pressure builds... POP! The hull splits and the starch puffs into fluffy foam
  [27.16, 35.42, (t) => {
    const BURST = 30.4;
    const lvl = t < BURST ? 0.15 + 0.85 * sm(27.2, 30.3, t) : lerp(1, 0.1, sm(BURST, BURST + 0.6, t));
    const b = kernSet(t, { heat: t < BURST ? 1 : 1 - sm(BURST, 31.2, t), steam: 1, push: 1 + 0.4 * sm(27.2, 30.3, t), shake: t < BURST ? 0.4 + 1.2 * sm(27.2, 30.3, t) : 0, burst: t >= BURST ? BURST : -1 });
    gaugeSet(t < BURST + 0.8 ? lvl : -1);
    if (t < BURST) camMove(t, 27.16, BURST, [KERN_AT.x + 1.6, 2.8, KERN_AT.z + 10.4], [KERN_AT.x + 0.9, 2.3, KERN_AT.z], [KERN_AT.x + 1.4, 2.7, KERN_AT.z + 9.4], [KERN_AT.x + 0.9, 2.4, KERN_AT.z], 50);
    else camMove(t, BURST, 35.42, [KERN_AT.x + 1.0, 3.0, KERN_AT.z + 11.5], [KERN_AT.x, 2.6, KERN_AT.z], [KERN_AT.x + 0.6, 3.0, KERN_AT.z + 10.2], [KERN_AT.x, 2.6, KERN_AT.z], 50);
    if (t < BURST) {
      topTag('tekanan', 'TEKANAN MAKIN KUAT!', t, 27.22, 30.38, RED);
      pinTag('gauge', 'TEKANAN', scr(lab.gauge.localToWorld(V(0, 3.75, 0))), t, 27.22, 30.38, { bg: RED, pointer: 'down' }, -30);
    }
    ov.flash(clamp(1 - (t - BURST) / 0.35) * (t >= BURST ? 1 : 0), '255,250,235');
    if (b >= 0) ov.sparkles(t, { n: 34, seed: 64, y: 300, h: 1000, a: clamp(1 - (t - BURST) / 2.2) });
    const q = pop(t, BURST, 31.3, { from: 2.6 });
    if (q.o > 0) ov.bubble('POP', 'POP!', { x: W / 2, y: 520, o: q.o, s: q.s, r: -6 }, { size: 190, top: '#fff3d6', bot: '#ff8a3d' });
    topTag('pecah', 'KULIT PECAH!', t, 31.24, 32.48, ORANGE);
    topTag('kembang', 'KANJI MENGEMBANG', t, 32.5, 35.4, GOLD);
    bubble('gebu', 'BUIH PUTIH\nYANG GEBU!', t, 33.44, 35.4, 1180, 110, CREAM);
    return lab;
  }],
  // S10 — "Tahu tak? Jagung biasa tak boleh jadi bertih. Kulitnya tak cukup kuat..."
  [35.42, 42.44, (t) => {
    compSet(t, sm(35.5, 36.3, t));
    camMove(t, 35.42, 42.44, [COMP_AT.x, 2.0, COMP_AT.z + 10.5], [COMP_AT.x, 1.0, COMP_AT.z], [COMP_AT.x + 0.3, 1.9, COMP_AT.z + 9.4], [COMP_AT.x + 0.2, 1.0, COMP_AT.z], 50);
    ov.flash(1 - inv(35.42, 35.75, t));
    topTag('tahu', 'TAHU TAK?', t, 35.48, 36.58, ORANGE);
    pinTag('bertihK', 'JAGUNG BERTIH', scr(lab.good.position.clone().add(V(0, 1.9, 0))), t, 36.0, 42.42, { bg: CORN, pointer: 'down' }, -20);
    pinTag('biasaK', 'JAGUNG BIASA', scr(lab.plain.position.clone().add(V(0, 1.9, 0))), t, 36.6, 42.42, { bg: PURPLE, pointer: 'down' }, -20);
    const xq = pop(t, 37.42, 42.42);
    const pc = scr(lab.plain.position.clone().add(V(0, 0.8, 0.6)));
    if (xq.o > 0) ov.html('x', ICONS.cross(), { x: pc.x, y: pc.y, o: xq.o * (t < 39.3 ? 1 : 0.0), s: xq.s * 0.7, r: 0 });
    bubble('takboleh', 'TAK BOLEH\nJADI BERTIH!', t, 37.42, 39.3, 1180, 104, { top: '#f2e6ff', bot: '#a070ff' });
    topTag('retak', 'KULIT TAK CUKUP KUAT', t, 39.36, 42.42, RED);
    bubble('lepas', 'WAP TERLEPAS!', t, 40.86, 42.42, 1180, 104, { top: '#eaf6ff', bot: '#4aa8ff' });
    return lab;
  }],
  // S11 — "Waaah, rupanya wap air yang buat jagung meletup! Jangan lupa, minta tolong mama..."
  [42.44, 50.2, (t) => {
    kitReset();
    const mamaTurn = sm(46.3, 46.9, t);
    mamaSet(t, { shake: 0.25 * (1 - mamaTurn), popping: 1, p: { headYaw: 0.45 * mamaTurn, headRoll: 0.05 * Math.sin(t * 2) * mamaTurn } });
    const e = keys(t, [[42.44, 0], [43.0, 0], [43.6, 1], [44.2, 1], [44.6, 0], [45.4, 0], [46.0, 1], [46.4, 0]]);
    const yaw = YAW_CAM;
    affSet(t, { yaw, wow: keys(t, [[42.44, 0], [42.6, 1], [43.0, 1], [43.2, 0]]), talk: e > 0.85 ? 0 : talk(t), ...(t < 46.4 ? eat(t, e, yaw) : POSES.thumbsUpR) });
    snackFollow(t < 46.4 ? e : 0);
    const ah = affHead(), mh = mamaHead();
    if (t < 46.36) lookCam(ah.clone().add(V(0.6, 0.05, 3.0)), ah.clone().add(V(0, -0.4, 0)), 46);
    else {
      const mid = ah.clone().lerp(mh, 0.5);
      camMove(t, 46.36, 50.2, mid.clone().add(V(0.6, -0.1, 6.4)).toArray(), mid.clone().add(V(0, -0.45, 0)).toArray(), mid.clone().add(V(0.5, -0.1, 5.8)).toArray(), mid.clone().add(V(0, -0.45, 0)).toArray(), 50);
    }
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 42.5, 46.3);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 230, 150, 900), y: clamp(hd.y - 150, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(42.5, 42.8, t) * (1 - inv(45.8, 46.3, t)) });
    bubble('wapAir', 'WAP AIR BUAT\nJAGUNG MELETUP!', t, 43.46, 46.3, 430, 104, CREAM);
    bubble('mamaTolong', 'MINTA TOLONG MAMA\nBILA GUNA DAPUR', t, 46.36, 50.18, 430, 92, { top: '#fff0f6', bot: '#ff7ab0' });
    pinTag('mamaT', 'MAMA', scr(mh.clone().add(V(0, 0.6, 0))), t, 47.5, 50.18, { bg: PINK, pointer: 'down' }, -40);
    return kit;
  }],
  // S12 — "Apa lagi kita nak belajar lepas ni?"
  [50.2, OUTRO, (t) => {
    kitReset();
    mamaSet(t, { shake: 0, popping: 1, p: { headYaw: 0.45 } });
    const tk = keys(t, [[50.22, 0], [50.6, 1]]);
    const th2 = POSES.thinkR.armR;
    affSet(t, { yaw: YAW_CAM, headRoll: -0.1 * tk, headPitch: -0.06 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(ah.clone().add(V(0.6, 0.05, 3.0)), ah.clone().add(V(0, -0.4, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    qmarks(t, hd, 50.2, OUTRO - 0.05, [[50.25, -260, -100, '#ffcf33', -12], [50.55, 250, -160, '#3fa2ff', 10], [50.85, 300, 60, '#ffcf33', 14]]);
    return kit;
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

// Cover / thumbnail (9:16): the giant kernel bursting into a fluffy popcorn.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  kernSet(30.75, { heat: 0.6, steam: 1, push: 1, burst: 30.4 });
  gaugeSet(-1);
  lookCam(V(KERN_AT.x + 0.8, 3.0, KERN_AT.z + 8.4), V(KERN_AT.x, 3.1, KERN_AT.z), 50);
  lab.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(lab.scene, cam);
  ov.vignette(0.3);
  ov.sparkles(31, { n: 34, seed: 64, y: 300, h: 1000, a: 1 });
  ov.tag('thBadge', 'EPISOD 64', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'JAGUNG', { x: W / 2, y: 445, r: -3 }, { size: 140, ...CREAM });
  ov.bubble('thTitle2', 'MELETUP?!', { x: W / 2, y: 600, r: 2 }, { size: 140, top: '#fff3d6', bot: '#ff8a3d' });
  drawLogo(ov, { y: 1460, scale: 0.55 });
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
