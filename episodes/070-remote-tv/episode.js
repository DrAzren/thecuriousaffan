// THE CURIOUS AFFAN — Episode 070: "Kenapa Remote Boleh On TV dari Jauh?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildRoom, buildBeam, buildPhone, buildOutro, aimRemote, A_LR, MAMA_LR, LED_AT } from './worlds.js';

const FPS = 30;
const DURATION = 53.75;
const OUTRO = 50.6;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const room = buildRoom();
const beam = buildBeam();
const ph = buildPhone();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const sm = (a, b, t) => easeInOut(inv(a, b, t));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', RED = '#ff4d5e';
const IRS = { top: '#f3e6ff', bot: '#9a5cff' };
const TVS = { top: '#e6f4ff', bot: '#2f9bff' };

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
const EYE_NO = `<svg width="190" height="130" viewBox="0 0 190 130"><path d="M12 65 Q95 -12 178 65 Q95 142 12 65 Z" fill="#fff" stroke="#17256b" stroke-width="10"/><circle cx="95" cy="65" r="28" fill="#17256b"/><circle cx="104" cy="56" r="8" fill="#fff"/><line x1="30" y1="118" x2="160" y2="12" stroke="#fff" stroke-width="30" stroke-linecap="round"/><line x1="30" y1="118" x2="160" y2="12" stroke="#ff4d5e" stroke-width="16" stroke-linecap="round"/></svg>`;
const CAM_OK = `<svg width="190" height="140" viewBox="0 0 190 140"><rect x="10" y="30" width="150" height="100" rx="20" fill="#3fa2ff" stroke="#17256b" stroke-width="10"/><rect x="50" y="12" width="60" height="30" rx="8" fill="#3fa2ff" stroke="#17256b" stroke-width="10"/><circle cx="85" cy="80" r="30" fill="#fff" stroke="#17256b" stroke-width="10"/><circle cx="85" cy="80" r="12" fill="#b06cff"/><circle cx="160" cy="40" r="28" fill="#2fbf5f" stroke="#fff" stroke-width="8"/><path d="M146 40 L157 52 L176 30" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// a row of short / long blinks (the code) drawn on the overlay canvas
const CODES = { BUKA: [1, 1, 2, 1, 2], KUAT: [2, 1, 1, 2, 1], SALURAN: [1, 2, 2, 1, 1] };
function codeStrip(x, y, label, pat, k, color, a = 1) {
  if (a <= 0.01) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = a;
  const pw = pat.reduce((s, p) => s + (p === 1 ? 44 : 118) + 18, 0) - 18;
  const lw = 230;
  const w = lw + pw + 50;
  const x0 = x - w / 2;
  g.fillStyle = 'rgba(255,255,255,0.94)';
  g.strokeStyle = '#17256b';
  g.lineWidth = 8;
  g.beginPath();
  g.roundRect(x0, y - 44, w, 88, 44);
  g.fill();
  g.stroke();
  g.fillStyle = color;
  g.font = '800 46px "Baloo 2"';
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillText(label, x0 + 30, y + 3);
  let px = x0 + lw + 20;
  pat.forEach((p, i) => {
    const pw1 = p === 1 ? 44 : 118;
    const on = k * pat.length > i;
    g.fillStyle = on ? '#9a5cff' : '#d9d2ee';
    if (on) {
      g.shadowColor = '#c89aff';
      g.shadowBlur = 18;
    }
    g.beginPath();
    g.roundRect(px, y - 18, pw1, 36, 18);
    g.fill();
    g.shadowBlur = 0;
    px += pw1 + 18;
  });
  g.restore();
}

// ------------------------------------------------------------ IR code timing
// A code sent at t0: a list of blinks [start, dur]. Short 0.09 s, long 0.26 s.
function blinks(t0, pat, sh = 0.09, lo = 0.26, gap = 0.09) {
  const out = [];
  let s = t0;
  for (const p of pat) {
    const d = p === 1 ? sh : lo;
    out.push([s, d]);
    s += d + gap;
  }
  return out;
}
// segments along the beam at time t for a list of blinks, at speed v
function segsAt(t, list, v) {
  return list.map(([s, d]) => (t >= s ? [v * (t - s - d), v * (t - s)] : null)).filter(Boolean);
}
const ledOn = (t, list) => (list.some(([s, d]) => t >= s && t < s + d) ? 1 : 0);
// a continuous stream of codes from a to b
function stream(a, b, pat = CODES.BUKA, every = 0.9) {
  const out = [];
  for (let s = a; s < b; s += every) out.push(...blinks(s, pat).filter(([x]) => x < b));
  return out;
}

// ================================================================ the room
const SIT_Y = 0.16;
const affHead = () => room.aff.parts.head.getWorldPosition(V());
const recvWorld = () => room.tv.localToWorld(room.tv.userData.recvPos.clone());
function sitAff(t, p = {}) {
  const a = room.aff;
  a.root.position.copy(A_LR).add(V(0, SIT_Y, 0));
  a.pose({ ...POSES.seated, yaw: 0, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
// the remote in Affan's right hand; aim: a world point (or null = resting on his lap)
function holdRemote(aim, press = null, pk = 0) {
  const r = room.remote;
  const hand = room.aff.parts.arms.R.hand.getWorldPosition(V());
  const dir = aim ? aim.clone().sub(hand).normalize() : V(0.1, -0.35, 1).normalize();
  aimRemote(r, dir);
  r.position.copy(hand).addScaledVector(dir, 0.12).add(V(0, 0.03, 0));
  r.userData.press(press, pk);
  r.userData.setLed(0);
  r.updateMatrixWorld(true);
}
const ARM_LAP = { reach: [-0.3, 0.42, 0.5], pole: [-1, -0.8, -0.2] };
const ARM_AIM = { reach: [-0.26, 0.86, 0.74], pole: [-1, -0.6, -0.3] };
const ARM_LOOK = { reach: [-0.12, 1.05, 0.62], pole: [-1, -0.8, -0.1] };
function tvSet(t, on, { boot = 1, ch = 1, vol = -1 } = {}) {
  const ud = room.tv.userData;
  if (!on) {
    ud.setScreen('off');
    room.tvLight.intensity = 0;
    ud.standby.material.emissiveIntensity = 1.2;
  } else {
    ud.setScreen(ch === 1 ? 'cartoon' : 'fish', t, { boot, vol, ch });
    room.tvLight.intensity = 5 * clamp(boot * 1.3);
    ud.standby.material.emissiveIntensity = 0.1;
  }
}
function mamaSet(t, show, p = {}) {
  const m = room.mama;
  m.root.visible = show;
  if (!show) return;
  m.root.position.copy(MAMA_LR);
  m.pose({ ...POSES.seated, yaw: 0.25, blink: blinkAt(t, 5), smile: 1, ...p });
  m.root.updateMatrixWorld(true);
}
function roomPulses(t, list, op = 0.85) {
  const a = room.remote.localToWorld(V(0, 0, 0.55));
  const b = recvWorld();
  room.pulses.draw(a, b, list ? segsAt(t, list, 14) : [], op);
  room.remote.userData.setLed(list ? 0.9 * ledOn(t, list) * op : 0, 0.5);
}
const closeCam = (dx = 0.4, dz = 3.7, dy = 0) => {
  const ah = affHead();
  lookCam(ah.clone().add(V(dx, dy + 0.1, dz)), ah.clone().add(V(0, -0.4, 0)), 48);
};
const REV_P = [0.1, 4.0, -3.95], REV_L = [-1.7, 1.55, 5.4];

// ============================================================ beam stage
const RECV_B = () => beam.tv.localToWorld(beam.tv.userData.recvPos.clone());
function beamSet(t, { list = null, op = 0.9, v = 9, eye = 0, look = 0, tv = 'off', ch = 1, boot = 1, vol = -1, press = null, pk = 0 } = {}) {
  const r = beam.remote;
  const tgt = RECV_B();
  const dir = tgt.clone().sub(LED_AT).normalize();
  aimRemote(r, dir, V(0, 0, 1));
  r.position.copy(LED_AT).addScaledVector(dir, -0.5 * 3.6);
  r.updateMatrixWorld(true);
  r.userData.press(press, pk);
  const a = r.localToWorld(V(0, 0, 0.53));
  beam.pulses.draw(a, tgt, list ? segsAt(t, list, v) : [], op);
  r.userData.setLed(list ? ledOn(t, list) * Math.max(0.35, op) : 0, 1.4);
  const ud = beam.tv.userData;
  ud.eye.visible = eye > 0.01;
  ud.eye.scale.setScalar(Math.max(0.001, eye));
  ud.pupil.position.set(0.06 * look, -0.03 - 0.02 * Math.abs(look), 0.03);
  if (tv === 'off') ud.setScreen('off');
  else ud.setScreen(tv, t, { boot, ch, vol });
  return { a, tgt };
}
const BEAM_WIDE = [[0.6, 5.0, 15.5], [0, 5.1, 0]];

// ============================================================ phone stage
const PH_R = V(2.15, -2.7, -1.3);
function phoneSet(t, { slide = 1, list = null, press = null, pk = 0 } = {}) {
  const r = ph.remote;
  const p = PH_R.clone().add(V(2.5 * (1 - slide), -2.5 * (1 - slide), 0));
  const aim = V(0, 1.6, -0.15).sub(p).normalize();
  aimRemote(r, aim, V(0, 0, 1));
  r.position.copy(p);
  r.userData.press(press, pk);
  r.userData.setLed(0);
  ph.setScreen(t, list ? ledOn(t, list) : 0);
  ph.phone.rotation.set(0, 0.05 * Math.sin(t * 0.8), 0.02 * Math.sin(t * 0.6));
}

// ================================================================== SHOTS
const PRESS1 = blinks(4.3, CODES.BUKA);
const STREAM = stream(14.84, 19.5);
const CODE_A = blinks(29.55, CODES.BUKA), CODE_B = blinks(30.6, CODES.KUAT), CODE_C = blinks(31.5, CODES.SALURAN);
const TALK = stream(42.2, 45.2, CODES.SALURAN, 1.1);
const OFF = blinks(47.45, CODES.BUKA);
const PHONE = stream(37.45, 41.0, CODES.KUAT, 0.8);

const SHOTS = [
  // S1 — Affan on the sofa with the remote on his lap
  [0, 2.18, (t) => {
    tvSet(t, false);
    mamaSet(t, false);
    sitAff(t, { talk: 0, armR: ARM_LAP, headPitch: 0.05 });
    holdRemote(null);
    roomPulses(t, null);
    camMove(t, 0, 2.18, [-0.5, 2.6, 3.4], [-1.4, 1.75, -1.9], [-0.8, 2.55, 2.8], [-1.4, 1.8, -1.9], 46);
    const q = pop(t, 0.4, 2.15);
    ov.tag('ep', 'EPISOD 70', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return room;
  }],
  // S2 — "Papa! Affan tekan butang remote,"
  [2.18, 4.66, (t) => {
    tvSet(t, false);
    mamaSet(t, false);
    const up = sm(2.9, 3.6, t);
    sitAff(t, { armR: { reach: mix3(ARM_LAP.reach, ARM_AIM.reach, up), pole: ARM_AIM.pole }, brow: 0.4, smile: 1 });
    holdRemote(up > 0.5 ? recvWorld() : null, 'power', keys(t, [[4.2, 0], [4.3, 1], [4.55, 1], [4.65, 0]]));
    if (up <= 0.5) {
      const r = room.remote, hand = room.aff.parts.arms.R.hand.getWorldPosition(V());
      const d = V(0.1, -0.35, 1).normalize().lerp(recvWorld().sub(hand).normalize(), up * 2).normalize();
      aimRemote(r, d);
      r.position.copy(hand).addScaledVector(d, 0.12).add(V(0, 0.03, 0));
    }
    roomPulses(t, null);
    closeCam(0.6, 4.5);
    const pp = pop(t, 2.2, 3.1, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    pinTag('tekan', 'TEKAN!', scr(room.remote.localToWorld(V(0, 0.1, 0.2))), t, 3.7, 4.64, { bg: RED, pointer: 'down' }, -110);
    return room;
  }],
  // S3 — "TV jauh di sana terus menyala!" (seen from behind the sofa)
  [4.66, 7.46, (t) => {
    const boot = inv(4.85, 5.5, t);
    tvSet(t, t > 4.85, { boot });
    mamaSet(t, false);
    sitAff(t, { armR: ARM_AIM, talk: 0 });
    holdRemote(recvWorld());
    roomPulses(t, null);
    camMove(t, 4.66, 7.46, REV_P, REV_L, [0.0, 3.9, -3.9], [-1.65, 1.65, 5.4], 46);
    pinTag('jauh', 'JAUH DI SANA!', scr(V(-1.4, 3.3, 5.4)), t, 4.72, 6.0, { bg: ORANGE, pointer: 'down' }, -60);
    bubble('nyala', 'TERUS MENYALA!', t, 6.1, 7.44, 430, 112, TVS);
    return room;
  }],
  // S4 — "Remote ni ada sihir ke?"
  [7.46, 9.58, (t) => {
    tvSet(t, true, { ch: 1 });
    mamaSet(t, false);
    sitAff(t, { armR: ARM_LOOK, brow: -0.3, smile: 0.5, headPitch: 0.25, lookY: -0.5, lookX: -0.2 });
    const hand = room.aff.parts.arms.R.hand.getWorldPosition(V());
    holdRemote(hand.clone().add(V(-0.05, 0.5, 0.6)));
    roomPulses(t, null);
    const ah = affHead();
    lookCam(ah.clone().add(V(0.5, 0.0, 4.0)), ah.clone().add(V(0, -0.45, 0)), 48);
    const rp = scr(room.remote.position);
    ov.sparkles(t, { n: 14, seed: 70, x: rp.x - 160, y: rp.y - 160, w: 320, h: 320, a: inv(7.6, 8.0, t), colors: ['#e9d4ff', '#c89aff', '#fff6c8'] });
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 7.5, 9.56, [[7.55, -260, 60, '#ffcf33', -12], [7.85, 250, 20, '#b06cff', 10], [8.15, 280, 200, '#ffcf33', 14]]);
    bubble('sihir', 'ADA SIHIR KE?', t, 8.3, 9.56, 430, 116, IRS);
    return room;
  }],
  // S5 — "Jom ikut Affan cari jawapan!"
  [9.58, 11.44, (t) => {
    tvSet(t, true, { ch: 1 });
    mamaSet(t, false);
    const up = keys(t, [[9.6, 0], [9.85, 1], [10.7, 1], [11.0, 0.6]], easeOut);
    sitAff(t, { smile: 1, brow: 0.6, armL: { reach: [lerp(0.5, 0.55, up), lerp(0.3, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.25, 0.35, up)], pole: [1, -0.3, -0.5] }, armR: ARM_LAP });
    holdRemote(null);
    roomPulses(t, null);
    const ah = affHead();
    const k = easeIn(inv(10.6, 11.44, t));
    lookCam(ah.clone().add(V(0.4, 0.1, 3.6)).lerp(ah.clone().add(V(0.1, -0.3, 0.9)), k), ah.clone().add(V(0, -0.4, 0)), 46);
    ov.swirl(t, W / 2, 820, inv(9.7, 11.3, t));
    ov.flash(inv(11.05, 11.44, t) ** 2, '240,230,255');
    return room;
  }],
  // S6 — "Di hujung remote, ada lampu kecil. Lampu ni pancarkan cahaya inframerah,"
  [11.44, 16.9, (t) => {
    const op = sm(14.8, 15.3, t);
    beamSet(t, { list: t > 14.84 ? STREAM : null, op: 0.9 * op });
    const k = sm(13.6, 15.6, t);
    lookCam(V(...mix3([LED_AT.x + 1.2, LED_AT.y + 0.6, 3.6], BEAM_WIDE[0], k)), V(...mix3([LED_AT.x, LED_AT.y - 0.2, 0], BEAM_WIDE[1], k)), 50);
    ov.flash(1 - inv(11.44, 11.8, t));
    pinTag('hujung', 'HUJUNG REMOTE', scr(LED_AT), t, 11.5, 12.6, { bg: ORANGE, pointer: 'down' }, -110);
    pinTag('lampu', 'LAMPU KECIL', scr(LED_AT), t, 12.68, 14.1, { bg: PURPLE, pointer: 'down' }, -110);
    bubble('ir', 'CAHAYA\nINFRAMERAH', t, 15.4, 16.88, 1150, 108, IRS);
    return beam;
  }],
  // S7 — "cahaya yang mata kita tak boleh nampak."
  [16.9, 19.54, (t) => {
    const ghost = sm(17.3, 18.0, t);
    beamSet(t, { list: STREAM, op: lerp(0.9, 0.16, ghost) });
    lookCam(V(...BEAM_WIDE[0]), V(...BEAM_WIDE[1]), 50);
    const m = scr(LED_AT.clone().lerp(RECV_B(), 0.5));
    const q = pop(t, 17.62, 19.5);
    if (q.o > 0) ov.html('eyeNo', EYE_NO, { x: clamp(m.x + 250, 200, 880), y: m.y, o: q.o, s: q.s * 1.1 });
    topTag('tak', 'MATA KITA TAK NAMPAK!', t, 18.3, 19.52, RED, 1180);
    return beam;
  }],
  // S8 — "Setiap butang hantar kelipan cahaya yang berbeza, macam kod rahsia!"
  [19.54, 24.56, (t) => {
    const pb = keys(t, [[19.7, 0], [19.8, 1], [20.4, 1], [20.5, 0]]);
    const pv = keys(t, [[20.6, 0], [20.7, 1], [21.3, 1], [21.4, 0]]);
    const pc = keys(t, [[21.5, 0], [21.6, 1], [22.2, 1], [22.3, 0]]);
    const press = pb > 0 ? 'power' : pv > 0 ? 'vol' : pc > 0 ? 'ch' : null;
    const list = [...blinks(19.8, CODES.BUKA), ...blinks(20.7, CODES.KUAT), ...blinks(21.6, CODES.SALURAN), ...stream(22.5, 24.5, CODES.BUKA, 1.0)];
    beamSet(t, { list, op: 0.9, press, pk: Math.max(pb, pv, pc) });
    const k = sm(22.8, 24.5, t);
    const rc = beam.remote.localToWorld(V(0, 0, 0.1));
    lookCam(V(...mix3([rc.x + 1.5, rc.y + 0.4, 5.8], BEAM_WIDE[0], k)), V(...mix3([rc.x, rc.y + 0.5, 0], BEAM_WIDE[1], k)), 50);
    codeStrip(W / 2, 360, 'BUKA', CODES.BUKA, inv(19.8, 20.5, t), RED, pop(t, 19.8, 24.5).o);
    codeStrip(W / 2, 470, 'KUAT', CODES.KUAT, inv(20.7, 21.4, t), GREEN, pop(t, 20.7, 24.5).o);
    codeStrip(W / 2, 580, 'SALURAN', CODES.SALURAN, inv(21.6, 22.3, t), BLUE, pop(t, 21.6, 24.5).o);
    bubble('kod', 'MACAM KOD RAHSIA!', t, 23.38, 24.54, 1180, 104, IRS);
    return beam;
  }],
  // S9 — "Kelip pendek, kelip panjang."
  [24.56, 26.37, (t) => {
    const list = [[24.7, 0.09], [25.7, 0.3]];
    beamSet(t, { list, op: 0.95, v: 5 });
    lookCam(V(...BEAM_WIDE[0]), V(...BEAM_WIDE[1]), 50);
    const a = beam.remote.localToWorld(V(0, 0, 0.53)), b = RECV_B();
    const dir = b.clone().sub(a).normalize();
    const at = (s) => scr(a.clone().addScaledVector(dir, s));
    pinTag('pendek', 'PENDEK', at(5 * (t - 24.7) - 0.2), t, 24.75, 25.6, { bg: PURPLE }, 0);
    pinTag('panjang', 'PANJANG', at(5 * (t - 25.7) - 0.75), t, 25.8, 26.35, { bg: PINK }, 0);
    return beam;
  }],
  // S10 — "TV pula ada mata kecil yang baca kod tu."
  [26.37, 29.5, (t) => {
    const eye = easeOut(inv(27.75, 28.2, t));
    beamSet(t, { eye: eye * (1 + 0.15 * Math.sin(t * 9) * (1 - inv(28.2, 28.8, t))), look: Math.sin(t * 2) * 0.5 });
    const rv = RECV_B();
    camMove(t, 26.37, 28.0, [0.4, 6.6, 7.5], [0.4, 7.8, 0], [rv.x - 0.3, rv.y + 0.2, 3.4], [rv.x, rv.y + 0.1, 0], 50);
    ov.flash(1 - inv(26.37, 26.7, t));
    topTag('tvpula', 'TV PULA...', t, 26.42, 27.7, BLUE, 1180);
    pinTag('mata', 'MATA KECIL (PENERIMA)', scr(rv), t, 27.8, 29.48, { bg: ORANGE, pointer: 'up' }, 170);
    return beam;
  }],
  // S11 — "Kod buka, kod kuat, kod tukar saluran!"
  [29.5, 33.34, (t) => {
    const list = [...CODE_A, ...CODE_B, ...CODE_C];
    const boot = inv(30.25, 30.7, t);
    const ch = t > 32.3 ? 2 : 1;
    const vol = t > 31.3 && t < 32.3 ? clamp(0.3 + (t - 31.3) * 1.2, 0, 0.9) : -1;
    const press = t > 29.45 && t < 29.95 ? 'power' : t > 30.5 && t < 31.0 ? 'vol' : t > 31.4 && t < 31.9 ? 'ch' : null;
    beamSet(t, { list, op: 0.9, v: 12, eye: 1, look: -0.3, tv: t > 30.25 ? (ch === 1 ? 'cartoon' : 'fish') : 'off', ch, boot, vol, press, pk: 1 });
    camMove(t, 29.5, 30.3, [0.2, 7.4, 5.0], [0.6, 7.6, 0], BEAM_WIDE[0], BEAM_WIDE[1], 50);
    const m = scr(LED_AT.clone().lerp(RECV_B(), 0.45));
    const tg = (id, txt, a, b, bg) => {
      const q = pop(t, a, b);
      if (q.o > 0) ov.tag(id, txt, { x: clamp(m.x + 250, 330, 800), y: m.y + 120, o: q.o, s: q.s }, { bg });
    };
    tg('kBuka', 'KOD BUKA', 30.14, 31.04, RED);
    tg('kKuat', 'KOD KUAT', 31.08, 31.94, GREEN);
    tg('kCh', 'KOD TUKAR SALURAN', 31.98, 33.3, BLUE);
    return beam;
  }],
  // S12 — "Tahu tak? Kalau kita halakan remote ke kamera telefon dan tekan butang,
  //        kamera boleh nampak lampu tu berkelip!"
  [33.34, 41.08, (t) => {
    const slide = easeOut(inv(34.6, 36.4, t));
    const pk = keys(t, [[37.3, 0], [37.42, 1], [40.9, 1], [41.0, 0]]);
    phoneSet(t, { slide, list: PHONE, press: 'vol', pk });
    camMove(t, 33.34, 41.08, [0.6, 0.1, 10.6], [0.2, -0.5, 0], [0.3, 0.3, 9.4], [0.2, -0.3, 0], 50);
    ov.flash(1 - inv(33.34, 33.7, t));
    topTag('tahu', 'TAHU TAK?', t, 33.4, 34.3, ORANGE);
    topTag('halakan', 'HALAKAN REMOTE KE KAMERA TELEFON', t, 34.34, 37.0, BLUE);
    const led = scr(ph.remote.localToWorld(V(0, 0, 0.5)));
    const qe = pop(t, 38.0, 41.06);
    if (qe.o > 0) ov.html('eyeNo2', EYE_NO, { x: clamp(led.x - 30, 160, 920), y: clamp(led.y + 150, 300, 1380), o: qe.o, s: qe.s * 0.8 });
    const qc = pop(t, 38.58, 41.06);
    if (qc.o > 0) ov.html('camOk', CAM_OK, { x: 250, y: 560, o: qc.o, s: qc.s * 0.9, r: -6 });
    bubble('nampak', 'KAMERA NAMPAK\nLAMPU BERKELIP!', t, 39.5, 41.06, 330, 96, IRS);
    return ph;
  }],
  // S13 — "Waaah,"
  [41.08, 42.0, (t) => {
    tvSet(t, true, { ch: 2 });
    mamaSet(t, false);
    sitAff(t, { wow: keys(t, [[41.1, 0], [41.3, 1], [41.8, 1], [42.0, 0.3]]), brow: 0.8, armR: ARM_AIM, talk: 0 });
    holdRemote(recvWorld());
    roomPulses(t, null);
    closeCam(0.5, 4.0);
    ov.flash(1 - inv(41.08, 41.4, t));
    bubble('waah', 'WAAAH!', t, 41.14, 41.98, 430, 140);
    return room;
  }],
  // S14 — "rupanya remote bercakap dengan TV guna cahaya!"
  [42.0, 45.72, (t) => {
    tvSet(t, true, { ch: t > 44.2 ? 1 : 2 });
    mamaSet(t, false);
    sitAff(t, { armR: ARM_AIM, talk: 0 });
    holdRemote(recvWorld(), 'ch', 1);
    roomPulses(t, TALK, 0.85);
    camMove(t, 42.0, 45.72, REV_P, REV_L, [0.0, 3.9, -3.9], [-1.65, 1.65, 5.4], 46);
    bubble('cakap', 'REMOTE BERCAKAP\nGUNA CAHAYA!', t, 42.6, 45.7, 430, 100, IRS);
    return room;
  }],
  // S15 — "Tapi jangan tengok TV lama-lama, ya."
  [45.72, 47.35, (t) => {
    tvSet(t, true, { ch: 1 });
    mamaSet(t, true, { talk: talk(t) * 0, smile: 1, headYaw: 0.3, armR: { reach: [-0.35, 1.45, 0.45], pole: [-1, -1, 0], point: 1, wz: Math.sin(t * 14) * 0.4 } });
    sitAff(t, { armR: ARM_LAP, headYaw: 0.3, smile: 0.8 });
    holdRemote(null);
    roomPulses(t, null);
    lookCam(V(-2.15, 2.85, 4.85), V(-2.2, 2.0, -1.9), 58);
    const q = pop(t, 45.8, 47.33);
    if (q.o > 0) ov.tag('lama', '⏰ JANGAN LAMA-LAMA!', { x: W / 2, y: 360, o: q.o, s: q.s }, { bg: ORANGE });
    return room;
  }],
  // S16 — Affan switches the TV off
  [47.35, 48.3, (t) => {
    const off = t > 47.9;
    tvSet(t, !off, { ch: 1 });
    mamaSet(t, true, { smile: 1, headYaw: 0.4 });
    sitAff(t, { armR: ARM_AIM, talk: 0 });
    holdRemote(recvWorld(), 'power', keys(t, [[47.4, 0], [47.5, 1], [47.9, 1], [48.0, 0]]));
    roomPulses(t, null);
    lookCam(V(...REV_P), V(...REV_L), 46);
    pinTag('tutup', 'TUTUP!', scr(V(-1.4, 3.3, 5.4)), t, 47.95, 48.28, { bg: GREEN, pointer: 'down' }, -60);
    return room;
  }],
  // S17 — "Apa lagi kita nak belajar lepas ni?"
  [48.3, OUTRO, (t) => {
    tvSet(t, false);
    mamaSet(t, false);
    sitAff(t, { ...POSES.thinkR, brow: -0.2, smile: 0.7 });
    room.remote.visible = false;
    roomPulses(t, null);
    const ah = affHead();
    lookCam(ah.clone().add(V(0.4, 0.1, 4.2)), ah.clone().add(V(0, -0.4, 0)), 48);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 48.36, OUTRO - 0.05, [[48.4, -260, -100, '#ffcf33', -12], [48.7, 250, -160, '#3fa2ff', 10], [49.0, 300, 60, '#ffcf33', 14]]);
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
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  room.remote.visible = true;
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  const w = shot[2](t);
  if (w.sky) w.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(w.scene, cam);
  if (w !== outro) ov.vignette(0.2);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): the giant remote sending purple blinks to the TV with an eye.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 31.0;
  beamSet(t, { list: stream(29.4, 31.0, CODES.BUKA, 0.55), op: 0.95, v: 12, eye: 1.15, look: -0.3, tv: 'cartoon', ch: 1, boot: 1, press: 'power', pk: 1 });
  lookCam(V(0.8, 3.6, 14.0), V(0, 5.0, 0), 52);
  beam.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(beam.scene, cam);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 70', { x: W / 2, y: 920 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'REMOTE TV', { x: W / 2, y: 1060, r: -3 }, { size: 130 });
  ov.bubble('thTitle2', 'ADA SIHIR?!', { x: W / 2, y: 1215, r: 2 }, { size: 140, ...IRS });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 920, y: 1180, r: 14, s: 0.8 });
  drawLogo(ov, { y: 1460, scale: 0.5 });
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
