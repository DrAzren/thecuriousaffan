// THE CURIOUS AFFAN — Episode 022: "Macam Mana Duit Kertas Terhasil?"
// Every shot is a pure function of time t (seconds), synced to
// audio/narration.mp3 (Affan's voice). Captions are timed word by word from
// audio/narration_words.json.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, keys, wobble, easeOut, easeInOut, backOut, W, H } from '../../shared/core.js';
import { blinkAt, POSES } from '../../shared/affan.js';
import { Overlay, ICONS, drawLogo, pop } from '../../shared/overlay.js';
import { buildStudio, buildField, buildRoom, buildFactory, buildTown, AREA } from './worlds.js';

const FPS = 30;
let DURATION = 72;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const cam = new THREE.PerspectiveCamera(40, W / H, 0.05, 600);
let env = { at: () => 0 };
let studio, field, room, factory, town;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const _v = new THREE.Vector3();
const scr = (p) => toScreen(p, cam);
const talk = (t) => clamp(env.at(t) * 1.2);

function lookCam(pos, look, fov = 40) {
  cam.position.set(...pos);
  cam.fov = fov;
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  cam.lookAt(...look);
  cam.updateMatrixWorld(true);
}
const lin = (k) => k;

// ------------------------------------------------------------------ acting
const MOOD = {
  curious: { smile: 0.4, brow: 0.6, headRoll: 0.14 },
  excited: { smile: 1, brow: 1, headRoll: -0.05 },
  surprised: { wow: 0.9, brow: 1 },
  happy: { smile: 1, brow: 0.5, headRoll: 0.06 },
  whisper: { smile: 0.5, brow: -0.2, headPitch: 0.15 },
  warm: { smile: 1, brow: 0.3, headRoll: -0.1 },
};
const REST = { armL: { reach: [0.55, 0.15, 0.2], pole: [1, -1, -0.5] }, armR: { reach: [-0.55, 0.15, 0.2], pole: [-1, -1, -0.5] } };
const THUMB_L = { reach: [0.62, 0.95, 0.5], pole: [1, -0.8, -0.3], thumb: 1, wy: 1.2, wx: 0.15 };
const HOLD_R = { reach: [-0.95, 1.3, 0.38], pole: [-1, -0.9, 0.1], wx: -0.2 };
function act(aff, t, mood, p = {}) {
  const tk = p.mute ? 0 : talk(t);
  const m = MOOD[mood] || {};
  const wow = (p.wow ?? m.wow ?? 0) * (1 - clamp(tk * 2.5));
  aff.pose({
    blink: blinkAt(t, 22), bob: 0.02 * wobble(t, 2), ...m, ...p, talk: tk, wow,
    armL: { ...REST.armL, ...(p.armL || {}) }, armR: { ...REST.armR, ...(p.armR || {}) },
  });
  aff.root.updateMatrixWorld(true);
}
const handPos = (aff, side = 'R') => aff.parts.arms[side].hand.getWorldPosition(new THREE.Vector3());
const reachTo = (aff, p) => aff.toTorso(p);

// --------------------------------------------------------------- overlays
function pinTag(id, text, p, t, a, b, style = {}, dy = -110) {
  const q = pop(t, a, b);
  if (q.o <= 0 || !p.visible) return;
  const hw = Math.min(400, text.length * (style.small ? 11 : 17) + 50);
  ov.tag(id, text, { x: clamp(p.x, 40 + hw, 1040 - hw), y: clamp(p.y + dy, 380, 1330), o: q.o, s: q.s }, style);
}
const TICK = `<svg width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill="#3fc48a" stroke="#fff" stroke-width="10"/><path d="M36 62 L54 80 L86 42" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const badge = (inner, label, col) => `<div style="text-align:center;font-family:'Baloo 2';font-weight:800;font-size:40px;color:#fff;text-shadow:0 4px 0 rgba(10,20,40,0.45)">
  <svg width="190" height="190" viewBox="0 0 190 190"><circle cx="95" cy="95" r="82" fill="${col}" stroke="#fff" stroke-width="12"/>${inner}</svg><div style="margin-top:-6px">${label}</div></div>`;
const BADGES = [
  [badge('<g fill="#fff" stroke="#17256b" stroke-width="5"><circle cx="72" cy="88" r="26"/><circle cx="118" cy="88" r="26"/><circle cx="95" cy="66" r="28"/><circle cx="95" cy="104" r="26"/></g><path d="M80 128 L95 118 L110 128 L95 142 Z" fill="#7a4a2a"/>', 'KAPAS', '#3fc48a')],
  [badge('<rect x="55" y="45" width="80" height="100" rx="8" fill="#fff" stroke="#17256b" stroke-width="6"/><g stroke="#9fc6ff" stroke-width="6"><line x1="68" y1="72" x2="122" y2="72"/><line x1="68" y1="92" x2="122" y2="92"/><line x1="68" y1="112" x2="110" y2="112"/></g>', 'KERTAS', '#2f9bff')],
  [badge('<rect x="40" y="72" width="110" height="46" rx="10" fill="#fff" stroke="#17256b" stroke-width="6"/><circle cx="70" cy="70" r="22" fill="#ff5e7e" stroke="#17256b" stroke-width="6"/><circle cx="120" cy="70" r="22" fill="#2fae6b" stroke="#17256b" stroke-width="6"/><rect x="58" y="120" width="74" height="22" fill="#ffd84a" stroke="#17256b" stroke-width="5"/>', 'CETAK', '#ff8a3d')],
  [badge('<text x="95" y="118" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="76" fill="#fff" stroke="#17256b" stroke-width="6" paint-order="stroke">123</text>', 'NOMBOR', '#9a5fd8')],
  [badge('<g stroke="#17256b" stroke-width="7" fill="#fff"><circle cx="66" cy="126" r="20"/><circle cx="124" cy="126" r="20"/></g><g stroke="#fff" stroke-width="14" stroke-linecap="round"><line x1="78" y1="112" x2="128" y2="48"/><line x1="112" y1="112" x2="62" y2="48"/></g>', 'POTONG', '#ff5e7e')],
  [badge('<path d="M40 76 L95 42 L150 76 Z" fill="#fff" stroke="#17256b" stroke-width="6" stroke-linejoin="round"/><g fill="#fff" stroke="#17256b" stroke-width="5"><rect x="54" y="82" width="16" height="44"/><rect x="87" y="82" width="16" height="44"/><rect x="120" y="82" width="16" height="44"/><rect x="44" y="128" width="102" height="16"/></g>', 'BANK', '#2f7bff')],
];

// ================================================================== SHOTS
function studioCommon(t, bg = 'green', floaters = true) {
  studio.scene.background = studio.bgs[bg];
  for (const [i, n] of studio.floaters.entries()) {
    const [x, y, z, rx, ry, rz] = n.userData.base;
    n.visible = floaters;
    n.position.set(x, y + 0.06 * Math.sin(t * 1.4 + i), z);
    n.rotation.set(rx + 0.08 * Math.sin(t * 1.1 + i * 2), ry, rz + 0.06 * Math.sin(t * 0.9 + i));
  }
  studio.poly.forEach((m) => (m.visible = false));
  studio.pedestal.visible = false;
  studio.hero.visible = true;
  studio.aff.root.position.set(0, 0, 0);
}
function heroInHand(t, off = [-0.36, 0.2, 0.14], rot = [-0.05, 0.3, 0.32]) {
  studio.hero.position.copy(handPos(studio.aff)).add(V(...off));
  studio.hero.rotation.set(rot[0], rot[1], rot[2] + 0.03 * Math.sin(t * 2));
}

const SHOTS = [
  // S1 hook — Affan studies a banknote: "datang dari mana?"
  [0, 4.1, (t) => {
    studioCommon(t);
    act(studio.aff, t, 'curious', { yaw: 0.12, headYaw: -0.32, headPitch: 0.08, lookX: -0.55, lookY: 0.25, armR: HOLD_R, armL: { reach: [0.12, 1.3, 0.6], pole: [1, -1, 0.1], point: 0, wx: -0.3 } });
    heroInHand(t);
    lookCam([0.3 * Math.sin(t * 0.4), 2.6, keys(t, [[0, 12.5], [4.1, 10.8]], lin)], [0, 2.9, 0]);
    return studio;
  }],
  // S2 — "Korang pernah terfikir tak? Jom ikut Affan!" (wave + hop)
  [4.1, 7.7, (t) => {
    studioCommon(t);
    const hop = Math.max(0, Math.sin(clamp((t - 5.85) / 0.45) * Math.PI)) * 0.35;
    act(studio.aff, t, 'excited', { yaw: -0.05, headYaw: 0.1, lookX: 0.1, armR: HOLD_R, armL: { reach: [0.78, 1.6, 0.35 + Math.sin(t * 10) * 0.14], pole: [1, -0.5, -0.4] } });
    studio.aff.root.position.y = hop;
    heroInHand(t);
    lookCam([keys(t, [[4.1, -2.8], [7.7, -2.0]]), 2.0, 9.2], [0, 2.75, 0]);
    return studio;
  }],
  // S3 — ordinary paper on the desk: "BUKAN kertas biasa"
  [7.7, 12.6, (t) => {
    room.setNight(false);
    room.aff.root.position.set(0, 0, -0.95);
    room.deskNote.position.set(-0.45, 1.63, 0.2);
    const pTop = room.paper.localToWorld(V(0, 0.35, 0));
    const shake = t > 9.9 && t < 10.7 ? Math.sin((t - 9.9) * 22) * 0.18 * (1 - inv(9.9, 10.7, t)) : 0;
    act(room.aff, t, 'curious', { headYaw: 0.35 + shake, headPitch: 0.15, lookX: 0.5, lookY: -0.3, armL: { reach: reachTo(room.aff, pTop), pole: [1, -1, -0.2], point: 1 }, armR: { reach: [-0.6, 0.55, 0.45], pole: [-1, -1, 0] } });
    lookCam([keys(t, [[7.7, 1.2], [12.6, 0.6]]), 3.2, keys(t, [[7.7, 7.2], [12.6, 6.3]])], [0.35, 2.3, 0], 40);
    const ps = scr(room.paper.localToWorld(V(0, 0.2, 0)));
    const c = pop(t, 9.95, 12.5);
    if (c.o > 0) ov.html('cross', ICONS.cross(), { x: ps.x, y: ps.y - 30, o: c.o, s: c.s * 0.9, r: 0 });
    pinTag('kb', 'KERTAS BIASA', ps, t, 10.9, 12.55, { bg: '#7f8494', small: true }, -170);
    return room;
  }],
  // S4 — cotton field: "Ia dibuat daripada... kapas!"
  [12.6, 15.95, (t) => {
    const raise = easeInOut(inv(12.8, 13.9, t));
    act(field.aff, t, t < 14.2 ? 'curious' : 'surprised', {
      headYaw: -0.3, headPitch: 0.1, lookX: -0.5, lookY: 0.2,
      ...(t > 15.1 ? { smile: 1, wow: 0, headRoll: 0.12 * Math.sin(t * 14) } : {}),
      armR: { reach: [lerp(-0.6, -0.8, raise), lerp(0.45, 1.4, raise), lerp(0.45, 0.6, raise)], pole: [-1, -0.9, 0.1], wx: -0.2 },
      armL: t > 14.2 ? THUMB_L : {},
    });
    const b = handPos(field.aff).add(V(-0.02, 0.18, 0.12));
    field.boll.position.copy(b);
    field.boll.scale.setScalar(1 + 0.35 * Math.sin(clamp((t - 14.24) / 0.3) * Math.PI));
    field.sky.position.copy(cam.position);
    lookCam([keys(t, [[12.6, 0.8], [14.2, -0.2], [15.95, -0.5]]), keys(t, [[12.6, 3.0], [15.95, 3.0]]), keys(t, [[12.6, 10.5], [14.2, 6.5], [15.95, 5.8]])], [-0.4, 2.8, 0], 40);
    field.sky.position.copy(cam.position);
    const bs = scr(b);
    if (t > 14.2) ov.sparkles(t, { n: 18, seed: 4, x: bs.x - 170, y: bs.y - 170, w: 340, h: 340, size: 26 });
    pinTag('kapas', 'KAPAS', bs, t, 14.24, 15.95, { bg: '#3fc48a' }, -150);
    return field;
  }],
  // S5 — paper mill: cotton -> pulp -> strong special paper
  [15.95, 21.4, (t) => {
    const f = factory, X = AREA.mill;
    f.focus(X + 1);
    for (const [i, b] of f.balls.entries()) {
      const t0 = 15.95 + i * 0.16, dt = t - t0;
      const y = 3.75 - 3.2 * dt * dt;
      b.visible = dt > 0 && y > 1.45;
      b.position.set(f.vatX + Math.sin(i * 2.3) * 0.25, y, Math.cos(i * 1.7) * 0.25);
      b.rotation.set(dt * 3, i, dt * 2);
    }
    f.pulp.rotation.z = t * 0.8;
    for (const r of f.rollers) r.rotation.y = t * 3;
    f.pTex.offset.x = -t * 0.45;
    const rr = lerp(0.55, 0.85, inv(16, 21.4, t));
    f.roll.scale.set(rr, 1, rr);
    f.roll.rotation.y = -t * 2.2;
    f.aff.root.position.set(X + 6.9, 0, -1.4);
    act(f.aff, t, t < 19 ? 'happy' : 'excited', { yaw: -0.5, headYaw: -0.25, lookX: -0.4, armR: t > 18.6 ? { reach: [-1.0, 1.25, 0.45], pole: [-1, -0.6, 0], point: 1 } : {}, armL: t > 19.5 ? THUMB_L : {} });
    lookCam(keys(t, [[15.95, [X - 2.6, 6.4, 10.5]], [17.6, [X - 2.0, 6.2, 10.8]], [19.4, [X + 4.2, 5.4, 11.0]], [21.4, [X + 4.8, 5.2, 10.4]]]), keys(t, [[15.95, [X - 2.8, 1.9, 0]], [17.6, [X - 2.2, 1.9, 0]], [19.4, [X + 4.6, 2.2, -0.5]], [21.4, [X + 5.1, 2.3, -0.5]]]), 44);
    pinTag('mk', 'KAPAS', scr(V(X + f.vatX, 2.0, 0)), t, 16.3, 17.9, { bg: '#3fc48a', small: true }, -120);
    pinTag('mp', 'KERTAS KHAS', scr(V(X + 0.6, 1.4, 0)), t, 17.2, 19.0, { bg: '#2f9bff', small: true }, -140);
    pinTag('mt', 'LEBIH TAHAN!', scr(V(X + 5.2, 2.3, 0)), t, 19.5, 21.4, { bg: '#ff8a3d' }, -120);
    return f;
  }],
  // S6 — RM1 and RM5 are made of special plastic (polymer)
  [21.4, 25.7, (t) => {
    studioCommon(t, 'blue', false);
    studio.hero.visible = false;
    act(studio.aff, t, 'excited', { headYaw: 0.05, lookY: 0.1, armL: THUMB_L, armR: { reach: [-0.62, 0.95, 0.5], pole: [-1, -0.8, -0.3], thumb: 1, wy: -1.2, wx: 0.15 } });
    studio.poly.forEach((m, i) => {
      m.visible = true;
      const k = pop(t, 21.5 + i * 0.95, 99).s;
      m.position.set(i ? 0.95 : -0.95, (i ? 2.15 : 2.75) + 0.08 * Math.sin(t * 2 + i), 2.4);
      m.rotation.set(0.1, Math.sin(t * 1.6 + i * 2) * 0.55, (i ? -0.18 : 0.15));
      m.scale.setScalar(k);
      // flexible plastic: a travelling wave bends the note
      const p = m.geometry.attributes.position, r = m.userData.rest;
      for (let j = 0; j < p.count; j++) p.setZ(j, r[j * 3 + 2] + 0.14 * Math.sin(r[j * 3] * 3.4 - t * 5 + i) * clamp((t - 23.3) / 0.5));
      p.needsUpdate = true;
      m.geometry.computeVertexNormals();
    });
    studio.sheen.intensity = 6;
    studio.sheen.position.set(Math.sin(t * 1.3) * 2.2, 2.8, 3.8);
    lookCam([0, 2.75, keys(t, [[21.4, 9.0], [25.7, 8.2]])], [0, 2.6, 0], 40);
    pinTag('rm1', 'RM1', scr(studio.poly[0].position), t, 21.7, 25.7, { bg: '#2f7bff' }, -150);
    pinTag('rm5', 'RM5', scr(studio.poly[1].position), t, 22.56, 25.7, { bg: '#9a5fd8' }, -150);
    const q = pop(t, 24.5, 25.7);
    if (q.o > 0) ov.tag('plastik', 'PLASTIK KHAS!', { x: W / 2, y: 520, o: q.o, s: q.s, r: -3 }, { bg: '#ff8a3d' });
    return studio;
  }],
  // S7a — night, a whisper: "ada rahsia..."
  [25.7, 28.3, (t) => {
    room.setNight(true);
    room.aff.root.position.set(0, 0, -0.95);
    room.nightNote.visible = false;
    room.lamp.position.set(-2.3, 4.8, -2.4);
    room.lampCore.position.copy(room.lamp.position);
    act(room.aff, t, 'whisper', { headYaw: 0.15, lookX: 0.25, lookY: -0.1, armL: { reach: [0.1, 1.42, 0.62], pole: [1, -1, 0.1], point: 1, wx: -0.4 }, ...(t > 27.3 ? { smile: 1, brow: 1, headRoll: -0.1 } : {}) });
    lookCam([keys(t, [[25.7, 0.6], [28.3, 0.4]]), 3.35, keys(t, [[25.7, 4.6], [28.3, 3.9]])], [0, 3.2, -0.95], 38);
    return room;
  }],
  // S7b — holding the note up to the lamp: watermark + security thread appear
  [28.3, 31.75, (t) => {
    room.setNight(true);
    room.aff.root.position.set(0, 0, -0.95);
    const up = easeOut(inv(28.3, 28.8, t));
    act(room.aff, t, t < 28.5 ? 'whisper' : 'surprised', { headYaw: -0.45, headPitch: -0.25, lookX: -0.6, lookY: 0.5, armR: { reach: [lerp(-0.7, -1.0, up), lerp(1.1, 1.65, up), 0.5], pole: [-1, -0.6, 0.2] }, armL: { reach: [-0.15, 1.75, 0.65], pole: [1, -0.8, 0.2] } });
    const n = room.nightNote;
    n.visible = true;
    n.position.copy(handPos(room.aff)).add(V(-0.45, 0.3, 0.45));
    lookCam([keys(t, [[28.3, -2.2], [31.75, -1.9]]), keys(t, [[28.3, 3.2], [31.75, 3.1]]), keys(t, [[28.3, 4.0], [31.75, 3.4]])], [n.position.x + 0.35, n.position.y - 0.45, n.position.z], 42);
    n.lookAt(cam.position);
    n.rotateZ(0.05 * Math.sin(t * 1.5));
    // lamp sits right behind the note as seen from the camera
    _v.subVectors(n.position, cam.position).normalize();
    room.lamp.position.copy(n.position).addScaledVector(_v, 1.1).add(V(0.12, 0.05, 0));
    room.lampCore.position.copy(room.lamp.position);
    room.markPlane.material.opacity = 0.95 * easeOut(inv(28.5, 29.3, t));
    room.threadPlane.material.opacity = 0.95 * easeOut(inv(30.1, 30.6, t));
    const mk = scr(n.localToWorld(V(0.35, 0, 0)));
    const th = scr(n.localToWorld(V(0.12, 0.2, 0)));
    if (t > 28.6) ov.sparkles(t, { n: 12, seed: 8, x: mk.x - 140, y: mk.y - 140, w: 280, h: 280, size: 22 });
    pinTag('wm', 'TERA AIR (GAMBAR TERSEMBUNYI)', mk, t, 28.6, 31.75, { bg: '#ff8a3d', small: true }, -210);
    pinTag('thr', 'BENANG KESELAMATAN', th, t, 30.25, 31.75, { bg: '#2f7bff', small: true }, 330);
    return room;
  }],
  // S8 — the printing press: colour, line-work, picture, layer by layer
  [31.75, 38.3, (t) => {
    const f = factory;
    const sx = keys(t, [[31.75, -9], [33.7, -4], [35.7, 0], [37.0, 4], [38.3, 8.5]], lin);
    f.focus(sx);
    let stg = 0;
    for (const s of f.stations) {
      if (sx > s.x) stg++;
      s.roller.rotation.y = t * 4;
      s.lamp.material.color.set(Math.abs(sx - s.x) < 1.6 ? s.col : 0x444444);
    }
    f.sheet.position.x = sx;
    f.sheet.material.map = f.sheetTex[stg];
    f.aff.root.position.set(9.8, 0, -2.4);
    act(f.aff, t, 'excited', { yaw: -0.6, headYaw: -0.2, lookX: -0.4, armR: { reach: [-1.0, 1.25, 0.45], pole: [-1, -0.6, 0], point: 1 }, armL: THUMB_L });
    const cx = Math.min(sx * 0.85, 7.2);
    lookCam([cx + 0.6, 4.8, 6.2], [cx + 0.4, 1.3, -0.2], 46);
    const ss = scr(V(sx, 1.1, 0));
    const L = [['LAPIS 1: WARNA', '#2fae6b', 33.7, 35.7], ['LAPIS 2: CORAK', '#ff5e7e', 35.7, 37.0], ['LAPIS 3: GAMBAR', '#2f7bff', 37.0, 38.3]];
    for (const [i, [txt, bg, a, b]] of L.entries()) {
      pinTag('lap' + i, txt, ss, t, a, b, { bg }, -230);
      if (t > a && t < a + 0.6) ov.sparkles(t, { n: 14, seed: 30 + i, x: ss.x - 220, y: ss.y - 120, w: 440, h: 240, size: 24, a: 1 - inv(a, a + 0.6, t) });
    }
    pinTag('mesin', 'MESIN CETAK', scr(V(-4, 3.6, 0)), t, 32.6, 33.6, { bg: '#ff8a3d' }, -60);
    return f;
  }],
  // S9a — raised ink: finger glides over the numerals
  [38.3, 41.55, (t) => {
    room.setNight(false);
    room.deskNote.position.set(-0.45, 1.63, 0.2);
    room.aff.root.position.set(0.15, 0, -0.75);
    const slide = inv(40.15, 41.5, t);
    const target = t < 39.9 ? V(-0.55, 1.95, 0.05) : V(lerp(-0.85, -0.15, slide), 1.665 + 0.012 * Math.abs(Math.sin(slide * 18)), 0.07);
    act(room.aff, t, 'surprised', { lean: 0.22, headPitch: 0.25, headYaw: -0.35, lookY: -0.7, lookX: -0.3, armR: { reach: reachTo(room.aff, target), pole: [-1, 0.2, -0.6], point: 1, wx: 0.5 } });
    room.graze.intensity = 7;
    room.graze.position.set(lerp(-1.6, 0.8, inv(38.3, 41.5, t)), 1.78, 0.75);
    lookCam([-1.7, 2.35, 3.4], [-0.5, 1.9, 0.05], 36);
    const ns = scr(V(-0.44, 1.66, 0.07));
    pinTag('timbul', 'DAKWAT TIMBUL', ns, t, 38.5, 41.55, { bg: '#ff8a3d' }, -330);
    if (t > 40.1) {
      const fs = scr(handPos(room.aff));
      ov.sparkles(t, { n: 8, seed: 12, x: fs.x - 90, y: fs.y - 40, w: 180, h: 140, size: 16, colors: ['#ffd84a', '#ffffff'] });
    }
    return room;
  }],
  // S9b — gasp: "kasar sikit, kan?"
  [41.55, 43.65, (t) => {
    room.setNight(false);
    room.aff.root.position.set(0, 0, -0.95);
    act(room.aff, t, t < 42.25 ? 'surprised' : 'happy', { headRoll: t > 42.3 ? 0.14 : 0, headYaw: 0.1, armR: { reach: [-0.4, 1.0, 0.7], pole: [-1, -1, 0], point: 1, wx: -0.4 }, armL: t > 42.3 ? THUMB_L : {} });
    lookCam([keys(t, [[41.55, -0.4], [43.65, -0.1]]), 3.2, keys(t, [[41.55, 5.4], [43.65, 5.0]])], [0, 2.85, -0.9], 40);
    const q = pop(t, 42.25, 43.65);
    if (q.o > 0) ov.tag('kasar', 'KASAR SIKIT!', { x: 760, y: 560, o: q.o, s: q.s, r: 6 }, { bg: '#ff5e7e' });
    return room;
  }],
  // S10 — numbering: every note gets its own serial number
  [43.65, 47.65, (t) => {
    const f = factory, X = AREA.number;
    f.focus(X);
    let last = null;
    f.numNotes.forEach((m, idx) => {
      const k = idx - 3;
      const x = 2.0 * (t - 43.8 - k);
      m.position.set(x, 1.06, 0.4);
      m.visible = Math.abs(x) < 12;
      m.material.map = x > 0.02 ? m.userData.done : m.userData.raw;
      if (x > 0.02 && k >= 0) last = m.userData.serial;
    });
    const ts = 43.8 + Math.round(t - 43.8);
    const pulse = Math.exp(-(((t - ts) / 0.09) ** 2));
    f.stamp.position.y = 2.2 - 1.0 * pulse;
    f.numLamp.material.color.set(pulse > 0.3 ? 0x3fc48a : 0x444444);
    f.aff.root.position.set(X + 3.9, 0, -2.2);
    act(f.aff, t, t < 46.35 ? 'curious' : 'excited', { yaw: -0.55, headYaw: -0.3, lookX: -0.5, lookY: -0.3, armL: t > 46.35 ? THUMB_L : {} });
    lookCam([X + 0.6 - 0.2 * (t - 43.65), 5.0, 7.4], [X + 0.5, 1.6, 0], 42);
    if (last) {
      const q = pop(t, 43.85, 99);
      const bump = 1 + 0.12 * Math.exp(-(((t - ts - 0.05) / 0.12) ** 2));
      ov.tag('serial', last, { x: W / 2, y: 470, o: q.o, s: q.s * bump }, { bg: '#17256b' });
    }
    pinTag('ns', 'NOMBOR SIRI', scr(V(X, 3.9, 0)), t, 44.0, 46.3, { bg: '#9a5fd8' }, -80);
    const q2 = pop(t, 46.4, 47.65);
    if (q2.o > 0) ov.tag('tsama', 'TAK ADA YANG SAMA!', { x: W / 2, y: 330, o: q2.o, s: q2.s, r: -2 }, { bg: '#ff8a3d' });
    return f;
  }],
  // S11 — cutting the big sheet, then checking each note
  [47.65, 53.95, (t) => {
    const f = factory, X = AREA.cut;
    f.focus(X);
    const rowZ = (r) => (r - 1.5) * (f.SHD / 4) + 0; // approx row lines
    const CH = [[49.45, 0, -f.SHD / 4], [49.75, 0, 0], [50.05, 0, f.SHD / 4], [50.45, 1, -f.SHW / 6], [50.8, 1, f.SHW / 6]];
    let n = CH.findIndex(([tc]) => tc + 0.12 > t);
    const lifted = n < 0;
    if (lifted) n = CH.length - 1;
    const [tc, dir, pos] = CH[n];
    const prev = CH[Math.max(0, n - 1)];
    const mv = n > 0 ? easeInOut(inv(prev[0] + 0.1, tc - 0.08, t)) : 1;
    f.blade.rotation.y = dir ? Math.PI / 2 : 0;
    const from = prev[1] === dir ? prev[2] : pos;
    const p = lerp(from, pos, mv);
    f.blade.position.set(dir ? p : 0, 0, dir ? 0 : p);
    const drop = Math.exp(-(((t - tc) / 0.07) ** 2));
    f.blade.position.y = lifted ? 1.15 + 0.85 + 3 * easeIn2(inv(50.95, 51.6, t)) : 1.15 + 0.85 * (1 - drop) + (t < 49.1 ? 2 * (1 - easeOut(inv(48.4, 49.1, t))) : 0);
    f.cutLines.forEach((l, i) => (l.visible = t > CH[i][0]));
    const spread = easeOut(inv(50.95, 51.6, t));
    for (const m of f.pieces) {
      const [hx, hz] = m.userData.home;
      m.position.set(hx * (1 + 0.28 * spread), 1.14 + 0.03 * spread, hz * (1 + 0.32 * spread));
    }
    f.trims.forEach((m) => {
      const [hx, hz] = m.userData.home;
      m.position.set(hx * (1 + 0.6 * spread), 1.141, hz * (1 + 0.6 * spread));
      m.material.opacity = 1 - spread;
      m.visible = spread < 0.99;
    });
    const scanZ = lerp(-1.75, 1.75, inv(51.9, 53.6, t));
    f.scanner.visible = t > 51.75 && t < 53.85;
    f.scanner.position.set(0, 1.42, scanZ);
    f.aff.root.position.set(X, 0, -2.7);
    act(f.aff, t, t < 51.8 ? 'excited' : 'curious', { headPitch: 0.3, lookY: -0.6, armL: t > 50.9 && t < 51.9 ? THUMB_L : {} });
    lookCam([X + 0.2, 8.2, 6.2], [X, 1.7, -0.7], 46);
    for (const [i, m] of f.pieces.entries()) {
      if (!(t > 51.9 && scanZ > m.position.z)) continue;
      const tp = 51.9 + (inv(-1.75, 1.75, m.position.z) * 1.7);
      const q = pop(t, tp, 99);
      const s = scr(_v.set(X + m.position.x, 1.2, m.position.z));
      ov.html('tick' + i, TICK, { x: s.x + 70, y: s.y - 30, o: q.o, s: q.s * 0.55 });
    }
    pinTag('ptg', 'DIPOTONG!', scr(V(X, 2.0, 0)), t, 49.45, 51.0, { bg: '#ff5e7e' }, -260);
    pinTag('prk', 'DIPERIKSA SATU-SATU', scr(V(X, 1.2, -1.8)), t, 51.9, 53.95, { bg: '#3fc48a', small: true }, -160);
    return f;
  }],
  // S12 — central bank -> bank -> us
  [53.95, 59.65, (t) => {
    const T = town;
    const vx = keys(t, [[53.95, -7.5], [55.0, -7.5], [57.2, 4.6]], easeInOut);
    T.van.position.set(vx, 0, 1.75);
    T.van.userData.update((vx + 7.5) / 0.42);
    // notes fly from the central bank into the van, then from the bank to Affan
    T.flyers.forEach((n, i) => {
      let a, b, t0, dur = 0.55;
      if (i < 4) {
        t0 = 54.15 + i * 0.18;
        a = V(-7.5, 1.3, -0.3);
        b = V(vx, 0.9, 1.75);
      } else {
        t0 = i === 4 ? 57.35 : 57.95;
        dur = i === 4 ? 0.5 : 0.95;
        a = i === 4 ? V(4.6, 0.9, 1.75) : V(4.6, 1.2, -0.3);
        b = i === 4 ? V(4.6, 1.2, -0.3) : handPos(T.aff).add(V(-0.1, 0.12, 0.08));
      }
      const k = inv(t0, t0 + dur, t);
      n.visible = k > 0 && (k < 1 || i === 5);
      n.position.lerpVectors(a, b, easeInOut(k));
      n.position.y += Math.sin(k * Math.PI) * (i === 5 ? 1.3 : 1.0);
      n.rotation.set(-0.3 + Math.sin(t * 6 + i) * 0.4, t * 3 + i, 0.2);
      if (i === 5 && k >= 1) n.rotation.set(-0.05, 0.4, 0.3);
    });
    T.aff.root.position.set(8.0, 0, -0.9);
    const rx = easeInOut(inv(57.7, 58.4, t));
    act(T.aff, t, t < 58.9 ? 'curious' : 'happy', { yaw: -0.55, headYaw: -0.2, lookX: -0.5, lookY: -0.3, armR: { reach: [lerp(-0.55, -0.85, rx), lerp(0.15, 1.05, rx), lerp(0.2, 0.75, rx)], pole: [-1, -0.8, 0.1] }, armL: t > 58.9 ? THUMB_L : {} });
    // re-place the last flyer after the pose so it sits in the hand
    if (t > 58.9) T.flyers[5].position.copy(handPos(T.aff)).add(V(-0.1, 0.12, 0.08));
    const cxv = lerp(-7.5, 4.6, easeInOut(inv(55.0, 57.3, t)));
    lookCam(t < 57.4 ? [cxv, 5.0, 13.5] : keys(t, [[57.4, [cxv, 5.0, 13.5]], [58.4, [6.6, 3.6, 9.4]], [59.65, [6.9, 3.5, 8.8]]]),
      t < 57.4 ? [cxv, 1.4, -0.5] : keys(t, [[57.4, [cxv, 1.4, -0.5]], [58.4, [6.9, 2.4, -0.5]], [59.65, [7.1, 2.5, -0.5]]]), 42);
    T.sky.position.copy(cam.position);
    pinTag('bnm', 'BANK NEGARA MALAYSIA', scr(V(-7.5, 3.8, -1.2)), t, 55.1, 57.0, { bg: '#1d3f8f', small: true }, -60);
    pinTag('bank', 'BANK', scr(V(5.2, 2.4, -0.9)), t, 57.15, 58.5, { bg: '#ff8a3d' }, -60);
    pinTag('kita', 'KITA!', scr(V(8.0, 4.2, -0.9)), t, 58.85, 59.65, { bg: '#3fc48a' }, -60);
    return T;
  }],
  // S13 — recap: "rupanya duit kertas lalu banyak langkah!"
  [59.65, 63.5, (t) => {
    studioCommon(t);
    act(studio.aff, t, t < 61 ? 'surprised' : 'excited', { headYaw: -0.1, armR: HOLD_R, armL: t > 61 ? THUMB_L : {} });
    heroInHand(t);
    lookCam([0, 2.5, keys(t, [[59.65, 12.8], [63.5, 12.0]])], [0, 3.0, 0], 40);
    BADGES.forEach(([svg], i) => {
      const q = pop(t, 59.85 + i * 0.4, 99);
      const x = [220, 540, 860][i % 3], y = i < 3 ? 330 : 600;
      ov.html('badge' + i, svg, { x, y: y + Math.sin(t * 2.4 + i) * 6, o: q.o, s: q.s * 0.92 });
    });
    return studio;
  }],
  // S14 — look after your money: into the piggy bank
  [63.5, 66.75, (t) => {
    studioCommon(t, 'pink', false);
    const P = studio.pedestal;
    P.visible = true;
    P.position.set(-1.0, 0, 0.6);
    const slot = studio.slotWorld();
    const drop = keys(t, [[63.5, 0.2], [64.7, 0.2], [65.4, -0.36]], easeInOut);
    const h = studio.hero;
    h.visible = t < 65.45;
    h.position.copy(slot).add(V(0, 0.32 + drop, 0));
    h.rotation.set(0, studio.piggy.rotation.y + P.rotation.y - Math.PI / 2, Math.PI / 2 * 0);
    const grip = h.position.clone().add(V(0.22, 0.27, 0.05));
    act(studio.aff, t, 'warm', { yaw: -0.4, headYaw: -0.15, lookX: -0.4, lookY: -0.4, armR: t < 65.3 ? { reach: reachTo(studio.aff, grip), pole: [-1, -0.6, -0.2] } : { reach: [-0.62, 0.95, 0.5], pole: [-1, -0.8, -0.3], thumb: 1, wy: -1.2, wx: 0.15 } });
    studio.piggy.scale.setScalar(1 + 0.06 * Math.exp(-(((t - 65.45) / 0.12) ** 2)));
    lookCam([-0.5, 3.0, keys(t, [[63.5, 9.6], [66.75, 8.8]])], [-0.6, 2.55, 0], 40);
    const ps = scr(slot);
    if (t > 65.4) ov.sparkles(t, { n: 14, seed: 41, x: ps.x - 160, y: ps.y - 200, w: 320, h: 260, size: 24 });
    const q = pop(t, 64.0, 66.75);
    if (q.o > 0) ov.tag('jaga', 'JAGA DUIT BAIK-BAIK', { x: W / 2, y: 400, o: q.o, s: q.s, r: -2 }, { bg: '#c2457e' });
    return studio;
  }],
  // S15 — outro: "Apa lagi kita nak belajar lepas ni?"
  [66.75, 999, (t) => {
    studioCommon(t);
    studio.hero.visible = false;
    act(studio.aff, t, 'excited', { ...POSES.thinkR, smile: 1, headRoll: -0.08, lookX: 0.25, lookY: 0.2, headYaw: 0.08, mute: t > 69.2 });
    lookCam([0, 2.6, keys(t, [[66.75, 11.5], [72, 10.4]])], [0, 3.55, 0], 40);
    const ic = pop(t, 67.0, 99);
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 870, y: 780 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.85, r: 12 });
    ov.html('oQ2', ICONS.qmark('#2f6fff'), { x: 200, y: 860 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.6, r: -12 });
    const l1 = pop(t, 67.1, 99), l2 = pop(t, 67.3, 99), l3 = pop(t, 67.5, 99);
    drawLogo(ov, { y: 330, scale: 0.72, k: [l1, l2, l3], star: pop(t, 67.7, 99) });
    return studio;
  }],
];
function easeIn2(k) {
  return k * k;
}

// ------------------------------------------------------------- step chips
const STEPS = [
  [7.7, 12.6, 'LANGKAH 1: BUKAN KERTAS BIASA'], [12.6, 21.4, 'LANGKAH 1: KAPAS JADI KERTAS'],
  [25.7, 31.75, 'LANGKAH 2: RAHSIA DALAM KERTAS'], [31.75, 43.65, 'LANGKAH 3: MENCETAK'],
  [43.65, 47.65, 'LANGKAH 4: NOMBOR SIRI'], [47.65, 53.95, 'LANGKAH 5: POTONG & PERIKSA'], [53.95, 59.65, 'LANGKAH 6: KE BANK'],
];
const CHIP_COL = ['#2fae6b', '#2fae6b', '#9a5fd8', '#2f7bff', '#9a5fd8', '#ff5e7e', '#1d3f8f'];

// ------------------------------------------------------------- captions
const KEYWORDS = { kapas: '#7cf0b0', plastik: '#8fd8ff', rahsia: '#ffb3d1', tersembunyi: '#ffb3d1', keselamatan: '#ffb3d1', timbul: '#ffa149', siri: '#ffd84a', duit: '#9df2c0', bank: '#8fd8ff', lapis: '#ffd84a', dipotong: '#ff9aa8', diperiksa: '#7cf0b0' };
let CAPTIONS = [];
let SPEECH_END = 69;
function buildCaptions(words) {
  const w = words.filter((x) => !/^\[.*\]$/.test(x.text));
  const out = [];
  let cur = [];
  w.forEach((x, i) => {
    cur.push([x.text.replace(/…/g, ''), x.start]);
    const next = w[i + 1];
    const brk = /[.!?…]$/.test(x.text) || (/,$/.test(x.text) && cur.length >= 2) || cur.length >= 3 || !next || next.start - x.end > 0.45;
    if (brk) {
      out.push([next ? Math.min(next.start - 0.02, x.end + 0.6) : x.end + 0.6, ...cur]);
      cur = [];
    }
  });
  return out;
}

// ------------------------------------------------------------------ frame
let lastWorld = null;
function frame(t) {
  ov.begin();
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  const world = shot[2](t);
  renderer.render(world.scene, cam);
  lastWorld = world;
  if (world !== studio) ov.vignette(0.28);
  // title over the hook
  const ti = pop(t, 0.15, 7.45);
  if (ti.o > 0) {
    const fl = Math.sin(t * 3) * 6;
    ov.tag('inBadge', 'EPISOD 22', { x: W / 2, y: 300, o: ti.o, s: ti.s }, { bg: '#2f7bff', small: true });
    ov.bubble('inTitle', 'MACAM MANA\nDUIT KERTAS\nTERHASIL?', { x: W / 2, y: 540 + fl, r: -2, o: ti.o, s: ti.s }, { size: 112 });
  }
  for (const [i, [a, b, txt]] of STEPS.entries()) {
    const q = pop(t, a + 0.1, b);
    if (q.o > 0) ov.tag('step' + i, txt, { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: CHIP_COL[i], small: true });
  }
  // quick white flash on each cut
  const cut = SHOTS.find(([a]) => a > 0 && t >= a && t < a + 0.12);
  if (cut) ov.flash((1 - (t - cut[0]) / 0.12) * 0.35);
  ov.flash(clamp(1 - t / 0.35) * 0.8);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan amazed, holding up a banknote among flying
// notes, with a big title, episode badge and the series logo. Key elements
// stay inside the centre 3:4 area (y 240-1680) that profile grids show.
function thumbnail() {
  ov.begin();
  studioCommon(0.6);
  act(studio.aff, 0.6, 'surprised', { yaw: 0.12, headYaw: -0.32, headPitch: 0.08, headRoll: 0.06, lookX: -0.55, lookY: 0.25, wow: 0.9, blink: 0, mute: true, armR: HOLD_R, armL: THUMB_L });
  heroInHand(0.6);
  lookCam([0.25 * Math.sin(0.126), 2.6, 12], [0, 2.9, 0]);
  renderer.render(studio.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 820);
  top.addColorStop(0, 'rgba(6,48,36,0.78)');
  top.addColorStop(1, 'rgba(6,48,36,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 820);
  const bot = g.createLinearGradient(0, H - 760, 0, H);
  bot.addColorStop(0, 'rgba(6,48,36,0)');
  bot.addColorStop(1, 'rgba(6,48,36,0.75)');
  g.fillStyle = bot;
  g.fillRect(0, H - 760, W, 760);
  ov.vignette(0.28);
  const n = scr(studio.hero.position);
  ov.sparkles(1.3, { n: 16, seed: 22, x: n.x - 230, y: n.y - 200, w: 460, h: 400, size: 26 });
  ov.tag('thBadge', 'EPISOD 22', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'MACAM MANA\nDUIT KERTAS\nTERHASIL?', { x: W / 2, y: 540, r: -2 }, { size: 112 });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 955, y: 1015, r: 14, s: 0.8 });
  drawLogo(ov, { y: 1430, scale: 0.55 });
  ov.end();
}

window.EP = {
  fps: FPS,
  get duration() {
    return DURATION;
  },
  frame,
  thumbnail,
  ready: (async () => {
    await Promise.all(['800 60px "Baloo 2"', '700 60px "Baloo 2"', '700 60px Fredoka', '600 60px Fredoka'].map((f) => document.fonts.load(f)));
    studio = buildStudio();
    field = buildField();
    room = buildRoom();
    factory = buildFactory();
    town = buildTown();
    try {
      env = await loadEnvelope('./audio/narration.mp3', FPS);
      SPEECH_END = env.duration;
      DURATION = Math.ceil(env.duration + 3);
      CAPTIONS = buildCaptions((await (await fetch('./audio/narration_words.json')).json()).words);
    } catch (e) {
      console.warn('no narration yet', e);
    }
    frame(0);
    return true;
  })(),
};
