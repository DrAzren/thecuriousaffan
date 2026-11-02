// THE CURIOUS AFFAN — Episode 011: "Kenapa Nyamuk Gigit Kita?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeInOut, keys, wobble, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildBedroom, buildGarden, buildSkin, buildOutro } from './worlds.js';

const FPS = 30;
const DURATION = 61.0;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const room = buildBedroom();
const garden = buildGarden();
const skin = buildSkin();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 2000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p, c = cam) => toScreen(p, c);
function lookCam(pos, look, fov = 50) {
  cam.position.copy(pos);
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(look);
  cam.updateMatrixWorld(true);
}
const ORANGE = '#ff8a3d', BLUE = '#2f9bff', PINK = '#ff5fa2', GREEN = '#36b86a', RED = '#e8404f';

// ----------------------------------------------------------- mosquito moves
function placeMos(m, p, yaw, pitch = 0, roll = 0) {
  m.position.copy(p);
  m.rotation.set(pitch, yaw, roll, 'YXZ');
  m.updateMatrixWorld(true);
}
// Fly a mosquito along path(t), facing its direction of travel.
function flyMos(m, path, t, opts = {}) {
  const p = path(t), q = path(t + 0.04);
  const yaw = Math.atan2(q.x - p.x, q.z - p.z);
  const pitch = -clamp((q.y - p.y) * 6, -0.5, 0.5);
  placeMos(m, p, yaw, pitch, Math.sin(t * 5) * 0.12);
  m.userData.update(t, { flap: 1, ...opts });
  return p;
}
// Bedroom buzz around Affan's head.
const buzzPath = (t) => V(0.55 + 0.75 * Math.sin(t * 1.25) + 0.15 * Math.sin(t * 3.9), 3.3 + 0.3 * Math.sin(t * 2.1) + 0.08 * Math.sin(t * 7), 1.6 + 0.45 * Math.cos(t * 1.6));

// --------------------------------------------------------------- 2D effects
function puff(x, y, r, a, color = '200,235,255') {
  if (a <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = clamp(a);
  g.fillStyle = `rgba(${color},0.9)`;
  g.strokeStyle = 'rgba(255,255,255,0.95)';
  g.lineWidth = 5;
  g.beginPath();
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    g.moveTo(x + Math.cos(ang) * r * 0.55 + r * 0.45, y + Math.sin(ang) * r * 0.45);
    g.arc(x + Math.cos(ang) * r * 0.55, y + Math.sin(ang) * r * 0.45, r * 0.45, 0, Math.PI * 2);
  }
  g.fill();
  g.restore();
}
function wavy(x, y, len, t, { color = '#8ee58f', a = 1, w = 9, amp = 14, vertical = true } = {}) {
  if (a <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = clamp(a);
  g.lineCap = 'round';
  for (const [c, lw] of [['rgba(255,255,255,0.9)', w + 7], [color, w]]) {
    g.strokeStyle = c;
    g.lineWidth = lw;
    g.beginPath();
    for (let i = 0; i <= 24; i++) {
      const k = i / 24;
      const o = Math.sin(k * 9 - t * 7) * amp;
      vertical ? g.lineTo(x + o, y - k * len) : g.lineTo(x + k * len, y + o);
    }
    g.stroke();
  }
  g.restore();
}
function heatGlow(x, y, r, a) {
  if (a <= 0) return;
  const g = ov.g;
  const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r);
  gr.addColorStop(0, `rgba(255,120,40,${0.0})`);
  gr.addColorStop(0.55, `rgba(255,140,50,${0.32 * a})`);
  gr.addColorStop(0.8, `rgba(255,90,40,${0.22 * a})`);
  gr.addColorStop(1, 'rgba(255,90,40,0)');
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}
function itchMarks(x, y, t, a, s = 1) {
  if (a <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = clamp(a);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  [[-1, -0.9], [0, -1.15], [1, -0.9]].forEach(([dx, dy], i) => {
    const j = Math.sin(t * 22 + i * 2) * 4;
    const bx = x + dx * 70 * s + j, by = y + dy * 60 * s;
    for (const [c, lw] of [['#ffffff', 16 * s], ['#ff4d5e', 8 * s]]) {
      g.strokeStyle = c;
      g.lineWidth = lw;
      g.beginPath();
      g.moveTo(bx - 12 * s, by + 22 * s);
      g.lineTo(bx + 8 * s, by + 8 * s);
      g.lineTo(bx - 8 * s, by - 6 * s);
      g.lineTo(bx + 12 * s, by - 22 * s);
      g.stroke();
    }
  });
  g.restore();
}

const SVG = {
  drop: () => `<svg width="130" height="170" viewBox="0 0 130 170"><path d="M65 10 C65 10 15 80 15 112 C15 142 38 160 65 160 C92 160 115 142 115 112 C115 80 65 10 65 10 Z" fill="#e8404f" stroke="#fff" stroke-width="12"/><ellipse cx="45" cy="112" rx="10" ry="18" fill="#fff" opacity="0.7"/></svg>`,
  eggs: () => `<svg width="220" height="150" viewBox="0 0 220 150">${[[50, 95], [110, 70], [170, 95], [80, 120], [140, 120]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="22" ry="34" transform="rotate(${(x - 110) / 3} ${x} ${y})" fill="#fff6dc" stroke="#17256b" stroke-width="8"/>`).join('')}</svg>`,
  flower: () => `<svg width="170" height="170" viewBox="0 0 170 170">${Array.from({ length: 8 }, (_, i) => `<ellipse cx="85" cy="40" rx="22" ry="34" fill="#ff7eb6" stroke="#17256b" stroke-width="7" transform="rotate(${i * 45} 85 85)"/>`).join('')}<circle cx="85" cy="85" r="28" fill="#ffd23f" stroke="#17256b" stroke-width="7"/></svg>`,
  straw: () => `<svg width="140" height="260" viewBox="0 0 140 260"><path d="M30 120 L110 120 L98 250 L42 250 Z" fill="#bfe8ff" stroke="#17256b" stroke-width="9" opacity="0.95"/><path d="M38 175 L102 175 L98 250 L42 250 Z" fill="#ff8fb3"/><g><rect x="78" y="10" width="22" height="210" rx="8" transform="rotate(12 89 115)" fill="#ff5a5a" stroke="#17256b" stroke-width="8"/><g transform="rotate(12 89 115)" fill="#fff"><rect x="80" y="40" width="18" height="16"/><rect x="80" y="80" width="18" height="16"/><rect x="80" y="120" width="18" height="16"/></g></g></svg>`,
  teeth: () => `<svg width="190" height="140" viewBox="0 0 190 140"><path d="M15 40 Q95 -10 175 40 Q175 120 95 130 Q15 120 15 40 Z" fill="#c2384a" stroke="#17256b" stroke-width="9"/><path d="M30 42 Q95 10 160 42 L160 62 L30 62 Z" fill="#fff" stroke="#17256b" stroke-width="6"/><g stroke="#17256b" stroke-width="5"><line x1="62" y1="30" x2="62" y2="62"/><line x1="95" y1="24" x2="95" y2="62"/><line x1="128" y1="30" x2="128" y2="62"/></g></svg>`,
  plus: () => `<svg width="90" height="90" viewBox="0 0 90 90"><path d="M35 10 H55 V35 H80 V55 H55 V80 H35 V55 H10 V35 H35 Z" fill="#fff" stroke="#17256b" stroke-width="7"/></svg>`,
};

function hook(t) {
  const p = pop(t, 0.15, 5.2, { fin: 0.45 });
  const fl = Math.sin(t * 3) * 6;
  ov.bubble('hook', 'KENAPA NYAMUK\nGIGIT KITA?', { x: W / 2, y: 430 + fl, o: p.o, s: p.s }, { size: 104 });
  const q = pop(t, 0.5, 5.2);
  ov.tag('ep', 'EPISOD 11', { x: W / 2, y: 278, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
}
function pinTag(id, text, p, t, a, b, style, dy = -90) {
  const q = pop(t, a, b);
  if (q.o <= 0 || !p.visible) return;
  ov.tag(id, text, { x: clamp(p.x, 190, 890), y: clamp(p.y + dy, 300, 1360), o: q.o, s: q.s }, style);
}

// --------------------------------------------------------- Affan pose bits
const sitRest = { armL: { reach: [0.62, 0.3, 0.42], pole: [1, -1, -0.3] }, armR: { reach: [-0.62, 0.3, 0.42], pole: [-1, -1, -0.3] } };
function roomAffan(t, p = {}) {
  room.aff.pose({ ...POSES.seated, blink: blinkAt(t, 1), talk: talk(t), ...p, armL: { ...sitRest.armL, ...(p.armL || {}) }, armR: { ...sitRest.armR, ...(p.armR || {}) } });
}
const AFF_HEAD = V(0, 3.14, 0.5); // bedroom
// Head-tracking: yaw/pitch so Affan looks at a world point (bedroom).
function lookAt(target, from = AFF_HEAD) {
  const d = target.clone().sub(from);
  return { headYaw: clamp(Math.atan2(d.x, d.z) * 0.8, -0.9, 0.9), headPitch: clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)) * 0.6, -0.45, 0.4), lookX: clamp(d.x * 0.35, -0.8, 0.8), lookY: clamp(d.y * 0.5, -0.6, 0.7) };
}
function gardenAffan(t, pos, yaw, p = {}) {
  garden.aff.root.position.copy(pos);
  garden.aff.pose({ yaw, blink: blinkAt(t, 2), talk: talk(t), smile: 0.8, ...p });
}
const GA = V(0.6, 0, 2.2); // Affan's spot in the garden
const hideGardenMos = () => {
  garden.male.position.set(0, -50, 0);
  garden.female.position.set(0, -50, 0);
};
// Male mosquito perched on the hero flower, sipping nectar.
function tipTo(m, target) {
  m.updateMatrixWorld(true);
  const tip = m.userData.prob.localToWorld(V(0, 0, 0.75));
  m.position.add(target.clone().sub(tip));
  m.updateMatrixWorld(true);
}
function malePerched(t, sip = 1) {
  const top = garden.hero.localToWorld(garden.hero.userData.top.clone());
  placeMos(garden.male, top.clone().add(V(0.05, 1.35, -1.05)), 0.5, 0.12, 0);
  garden.male.userData.update(t, { flap: 0, probPitch: 0.95 + 0.05 * Math.sin(t * 4) * sip });
  tipTo(garden.male, top.clone().add(V(0, -0.12, 0.05)));
  garden.hero.userData.nectar.material.opacity = 0.55 + 0.25 * Math.sin(t * 5);
  return top;
}
function potState(t) {
  const pot = garden.pot.userData;
  const k = easeInOut(inv(49.75, 50.35, t));
  pot.tilt.rotation.z = k * 1.45;
  pot.water.visible = k < 0.35;
  pot.larvae.forEach((l, i) => {
    l.visible = k < 0.35;
    l.rotation.z = Math.sin(t * 9 + i * 1.7) * 0.5;
    l.position.y = 1.18 + 0.05 * Math.sin(t * 2 + i);
  });
  const st = 50.05;
  const base = garden.pot.position;
  garden.drops.forEach((d, i) => {
    const tt = t - st - (i % 8) * 0.02;
    if (tt < 0 || tt > 1.4) return void d.position.set(0, -5, 0);
    const [vx, vy, vz] = d.userData.v;
    d.position.set(base.x - 0.3 + vx * tt, Math.max(0.05, 1.3 + vy * tt - 4.9 * tt * tt), base.z + vz * tt);
  });
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — hook: itchy bump, Affan scratches; a mosquito buzzes around
  [0, 5.3, (t) => {
    const m = flyMos(room.mos, buzzPath, t);
    const look = t < 2.6 ? { headPitch: 0.42, headYaw: 0.35, lookY: -0.6, lookX: 0.4 } : lookAt(m);
    const sc = t < 2.6 ? 1 : keys(t, [[2.6, 1], [3.0, 0]]);
    const s = Math.sin(t * 30);
    roomAffan(t, {
      ...look, brow: t < 2.6 ? -0.8 : 0.4, smile: t < 2.6 ? 0.05 : 0.2, wow: t > 2.7 && t < 3.3 ? 0.5 : 0,
      armL: { reach: [lerp(0.62, 0.32, sc), lerp(0.3, 0.62, sc), lerp(0.42, 0.62, sc)], pole: [1, -1, -0.3], wz: -0.4 * sc },
      armR: { reach: [lerp(-0.62, 0.2 + 0.05 * s, sc), lerp(0.3, 0.74 + 0.03 * s, sc), lerp(0.42, 0.7, sc)], pole: [-1, -0.6, -0.4], wx: 0.5 * sc },
    });
    const k = easeInOut(inv(0, 5.3, t));
    lookCam(V(lerp(0.9, 0.5, k), lerp(3.1, 3.0, k), lerp(7.4, 6.2, k)), V(0.1, 2.75, 0.4), 46);
    hook(t);
    const hand = scr(room.aff.parts.arms.L.hand.getWorldPosition(V(0, 0, 0)));
    itchMarks(hand.x, hand.y - 30, t, win2(t, 0.1, 2.6), 0.9);
    const g = pop(t, 1.12, 2.6);
    ov.bubble('gatal', 'GATALNYA!', { x: hand.x + 40, y: hand.y - 210, o: g.o, s: g.s, r: -6 }, { size: 96, top: '#ffb36b', bot: '#ff5a3d' });
    const mp = scr(m);
    pinTag('nyamuk1', 'NYAMUK!', mp, t, 2.75, 5.2, { bg: RED, pointer: 'up', small: true }, 95);
    return room;
  }],
  // S2 — "Kenapa nyamuk suka sangat gigit kita, ya?"
  [5.3, 8.1, (t) => {
    const m = flyMos(room.mos, buzzPath, t);
    const th = keys(t, [[5.3, 0], [5.7, 1], [7.9, 1], [8.1, 0.6]]);
    const tr = POSES.thinkR.armR;
    roomAffan(t, {
      ...lookAt(m), brow: 0.6, smile: 0.4, headRoll: -0.1 * th,
      armR: { reach: sitRest.armR.reach.map((r, i) => lerp(r, tr.reach[i], th)), pole: tr.pole, point: th, wx: tr.wx * th },
    });
    const k = easeInOut(inv(5.3, 8.1, t));
    lookCam(V(lerp(-0.5, -0.2, k), lerp(3.3, 3.2, k), lerp(6.2, 5.6, k)), V(0.1, 2.95, 0.4), 46);
    const head = scr(AFF_HEAD);
    [[5.6, -300, -320, '#ffcf33', -12], [6.2, 280, -360, '#3fa2ff', 10], [6.8, 330, -120, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, 8.05);
      ov.html('q' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.8, r });
    });
    return room;
  }],
  // S3 — "Jom ikut Affan cari jawapan!" + magic swirl
  [8.1, 10.1, (t) => {
    flyMos(room.mos, buzzPath, t);
    const up = keys(t, [[8.1, 0], [8.35, 1], [9.6, 1], [9.9, 0.6]], easeOut);
    roomAffan(t, {
      headYaw: -0.05, smile: 1, brow: 0.7, lookX: 0.05,
      armR: { reach: [lerp(-0.62, -0.6, up), lerp(0.3, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.42, 0.35, up)], pole: [-1, -0.3, -0.5] },
    });
    const k = easeInOut(inv(8.1, 10.1, t));
    lookCam(V(0.2, 3.1, lerp(5.6, 4.9, k)), V(0, 2.9, 0.4), 46);
    ov.swirl(t, W / 2, 820, inv(8.5, 10.0, t));
    ov.flash(inv(9.7, 10.1, t) ** 2);
    return room;
  }],
  // S4 — shrunk down into the garden: "Shhh... bukan semua nyamuk gigit kita."
  [10.1, 14.1, (t) => {
    malePerched(t);
    const fp = flyMos(garden.female, (u) => V(2.6 + 0.8 * Math.sin(u * 1.4), 4.6 + 0.35 * Math.sin(u * 2.3), -1.0 + 0.6 * Math.cos(u * 1.1)), t);
    const sh = keys(t, [[10.3, 0], [10.55, 1], [11.6, 1], [11.95, 0]]);
    const gs = keys(t, [[12.1, 0], [12.5, 1], [14.1, 1]]);
    gardenAffan(t, GA, 0.15, {
      smile: 0.5 + 0.4 * gs, brow: 0.5, headYaw: lerp(0, -0.3, gs), lookX: lerp(0, -0.5, gs), headPitch: -0.05,
      armR: sh > 0.01 ? { reach: [lerp(-0.6, -0.05, sh), lerp(0.25, 1.5, sh), lerp(0.1, 0.85, sh)], point: sh, pole: [-1, -0.8, 0.2], wx: -1.2 * sh } : {},
      armL: { reach: [lerp(0.6, 1.0, gs), lerp(0.25, 1.4, gs), lerp(0.1, 0.5, gs)], pole: [1, -0.6, -0.4], point: gs },
    });
    const k = easeOut(inv(10.1, 14.1, t));
    lookCam(V(lerp(2.6, 3.4, k), lerp(5.2, 3.6, k), lerp(13.5, 11, k)), V(-0.4, lerp(3.4, 3.2, k), -0.8), 50);
    ov.flash(1 - inv(10.1, 10.5, t));
    ov.sparkles(t, { n: 22, seed: 3, y: 250, h: 1000, a: 0.6 * (1 - inv(11, 12, t)) });
    const q = pop(t, 11.84, 14.05);
    ov.bubble('bukan', 'BUKAN SEMUA!', { x: W / 2, y: 400, o: q.o, s: q.s, r: -3 }, { size: 120 });
    pinTag('mA', '?', scr(garden.male.position), t, 12.7, 14.05, { bg: BLUE, pointer: 'down', small: true }, -110);
    pinTag('mB', '?', scr(fp), t, 12.9, 14.05, { bg: PINK, pointer: 'down', small: true }, -110);
    return garden;
  }],
  // S5 — male mosquito sips sweet nectar from the flower
  [14.1, 17.35, (t) => {
    const top = malePerched(t);
    garden.female.position.set(0, -50, 0);
    garden.aff.root.position.set(0, -50, 0);
    const k = easeInOut(inv(14.1, 17.35, t));
    const c = garden.male.position;
    lookCam(V(c.x + lerp(5.2, 4.2, k), c.y + lerp(1.4, 0.9, k), c.z + lerp(5.0, 4.2, k)), V(c.x + 0.2, c.y - 0.9, c.z + 0.6), 46);
    pinTag('jantan', 'JANTAN', scr(c.clone().add(V(0, 1.0, 0))), t, 14.45, 17.3, { bg: BLUE, pointer: 'down' }, -60);
    const q = pop(t, 15.6, 17.3);
    ov.tag('manis', 'AIR MANIS BUNGA', { x: W / 2, y: 1270, o: q.o, s: q.s }, { bg: '#ff5fa2' });
    ov.html('flw', SVG.flower(), { x: 860, y: 1110 + Math.sin(t * 3) * 6, o: q.o, s: q.s * 0.8, r: Math.sin(t * 2) * 8 });
    const nec = scr(top.clone().add(V(0, 0.2, 0)));
    ov.sparkles(t, { n: 10, seed: 15, x: nec.x - 140, y: nec.y - 140, w: 280, h: 240, a: 0.8, size: 20, colors: ['#fff6c8', '#ffe08a'] });
    return garden;
  }],
  // S6 — the female bites: she needs blood to make eggs
  [17.35, 22.0, (t) => {
    malePerched(t);
    garden.aff.root.position.set(0, -50, 0);
    const p = flyMos(garden.female, (u) => V(1.5 + 0.35 * Math.sin(u * 1.7), 4.0 + 0.25 * Math.sin(u * 2.6), 1.0 + 0.25 * Math.cos(u * 1.3)), t);
    garden.female.rotation.y = 0.9 + 0.15 * Math.sin(t * 1.3);
    garden.female.updateMatrixWorld(true);
    lookCam(V(p.x + 3.4, p.y + 0.7, p.z + 4.8), V(p.x - 0.1, p.y - 0.5, p.z), lerp(46, 42, easeInOut(inv(17.35, 22, t))));
    const b = pop(t, 18.64, 21.95);
    ov.tag('betina', 'BETINA', { x: W / 2, y: 420, o: b.o, s: b.s }, { bg: PINK });
    ov.html('mPlus', ICONS.cross(), { x: -999, y: -999, o: 0 });
    const d = pop(t, 20.56, 21.95), a = pop(t, 20.85, 21.95), e = pop(t, 21.28, 21.95);
    ov.html('drop', SVG.drop(), { x: 230, y: 1220 + Math.sin(t * 4) * 6, o: d.o, s: d.s * 0.8 });
    ov.html('arrE', ICONS.arrow(ORANGE), { x: W / 2, y: 1220, o: a.o, s: a.s * 0.8 });
    ov.html('eggs', SVG.eggs(), { x: 840, y: 1220, o: e.o, s: e.s * 0.85 });
    const lbl = pop(t, 20.56, 21.95);
    ov.tag('darahT', 'DARAH', { x: 230, y: 1360, o: lbl.o, s: lbl.s }, { bg: RED, small: true });
    ov.tag('telurT', 'TELUR', { x: 840, y: 1360, o: e.o, s: e.s }, { bg: '#f2a91c', small: true });
    return garden;
  }],
  // S7 — "Tapi, macam mana dia jumpa kita?"
  [22.0, 24.6, (t) => {
    malePerched(t);
    const p = flyMos(garden.female, (u) => V(GA.x + 1.8 * Math.sin(u * 1.6), 4.5 + 0.3 * Math.sin(u * 2.4), GA.z + 0.6 + 1.2 * Math.cos(u * 1.6)), t);
    const d = p.clone().sub(GA.clone().add(V(0, 3.4, 0)));
    const ch = keys(t, [[22.0, 0], [22.35, 1], [24.6, 1]]);
    gardenAffan(t, GA, 0, {
      smile: 0.4, brow: 0.8, headYaw: clamp(Math.atan2(d.x, d.z), -0.9, 0.9), headPitch: -0.25, lookX: clamp(d.x * 0.3, -0.8, 0.8), lookY: 0.4,
      armR: { reach: [lerp(-0.6, -0.15, ch), lerp(0.25, 1.15, ch), lerp(0.1, 0.75, ch)], pole: [-1, -0.8, 0], point: 0.4 * ch, wx: -0.6 * ch },
    });
    lookCam(V(GA.x + 0.4, 3.9, GA.z + 9.0), V(GA.x, 3.5, GA.z), 50);
    const head = scr(GA.clone().add(V(0, 3.4, 0)));
    [[22.2, -300, -300, '#ffcf33', -12], [22.6, 290, -330, '#3fa2ff', 10]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, 24.55);
      ov.html('gq' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.8, r });
    });
    return garden;
  }],
  // S8 — clues: breath, body heat, sweat smell
  [24.6, 29.5, (t) => {
    malePerched(t);
    const k = easeInOut(inv(24.6, 29.4, t));
    const p = flyMos(garden.female, (u) => V(GA.x + lerp(3.6, 2.0, easeInOut(inv(24.6, 29.4, u))) + 0.2 * Math.sin(u * 3), 3.9 + 0.3 * Math.sin(u * 2.2), GA.z + 0.4 + 0.3 * Math.cos(u * 2.6)), t);
    garden.female.rotation.y = -Math.PI / 2 + 0.2 * Math.sin(t * 2);
    garden.female.updateMatrixWorld(true);
    gardenAffan(t, GA, 0.25, { smile: 0.6, brow: 0.3, headYaw: 0.25, lookX: 0.6, lookY: 0.15 });
    lookCam(V(GA.x + 0.9, 3.4, GA.z + 10.0), V(GA.x + 0.9, 2.7, GA.z), 50);
    void k;
    const mouth = scr(GA.clone().add(V(0.15, 3.15, 0.75)));
    const body = scr(GA.clone().add(V(0, 1.8, 0)));
    const ms = scr(p);
    // breath: puffs drifting towards the mosquito
    const na = inv(25.6, 26.0, t);
    for (let i = 0; i < 4; i++) {
      const ph = ((t - 25.6) * 0.55 + i / 4) % 1;
      puff(lerp(mouth.x + 40, ms.x - 60, ph), lerp(mouth.y, ms.y, ph) - Math.sin(ph * Math.PI) * 40, 26 + 34 * ph, na * Math.sin(ph * Math.PI));
    }
    // body heat
    heatGlow(body.x, body.y, 330 + 20 * Math.sin(t * 4), inv(26.7, 27.2, t));
    // sweat smell: green wavy lines rising
    const sa = inv(28.0, 28.4, t);
    for (let i = 0; i < 3; i++) wavy(body.x - 160 + i * 160, body.y + 120 - ((t * 60 + i * 40) % 60), 260, t + i, { a: sa * 0.9, amp: 12 });
    const q1 = pop(t, 25.84, 29.45), q2 = pop(t, 26.88, 29.45), q3 = pop(t, 28.16, 29.45);
    ov.tag('nafas', 'NAFAS', { x: 210, y: 360, o: q1.o, s: q1.s }, { bg: '#2fa7e8' });
    ov.tag('haba', 'HABA BADAN', { x: W / 2 + 120, y: 360, o: q2.o, s: q2.s }, { bg: ORANGE });
    ov.tag('peluh', 'BAU PELUH', { x: W / 2, y: 485, o: q3.o, s: q3.s }, { bg: GREEN });
    const dl = inv(25.2, 25.7, t);
    if (dl > 0) ov.dashed(ms.x - 50, ms.y + 10, lerp(ms.x - 50, mouth.x + 60, easeOut(dl)), lerp(ms.y + 10, mouth.y, easeOut(dl)), t, { color: '#ffd84a', w: 8, a: 0.8 * dl });
    return garden;
  }],
  // S9a — the mosquito lands on skin: it doesn't really bite!
  [29.5, 32.4, (t) => {
    skinState(t);
    const land = easeOut(inv(29.5, 30.6, t));
    placeMos(skin.mos, V(lerp(-6, -1.3, land), lerp(5.5, 2.15, land), -1.2), Math.PI / 2, 0.15 * (1 - land), 0);
    skin.mos.userData.update(t, { flap: 1 - inv(30.4, 30.8, t), probPitch: 1.1 });
    if (land > 0.999) settleTip(0, 0.05);
    const k = easeInOut(inv(29.5, 32.4, t));
    lookCam(V(lerp(3.5, 2.6, k), lerp(5.5, 4.6, k), lerp(7.5, 6.4, k)), V(-0.8, 1.0, -1.2), 50);
    const q = pop(t, 31.0, 32.35);
    ov.bubble('takgigit', 'TAK GIGIT PUN!', { x: W / 2, y: 400, o: q.o, s: q.s, r: -3 }, { size: 116 });
    const tq = pop(t, 30.7, 32.35);
    ov.html('teeth', SVG.teeth(), { x: 820, y: 1150, o: tq.o, s: tq.s * 0.9 });
    const x = pop(t, 31.0, 32.35, { from: 2 });
    ov.html('tx', ICONS.cross(), { x: 820, y: 1150, o: x.o, s: x.s * 0.6 });
    return skin;
  }],
  // S9b — side cut: the proboscis pokes in like a straw and sips blood
  [32.4, 35.95, (t) => {
    skinState(t);
    lookCam(V(-0.5, -0.2, 12.2), V(-0.7, -0.1, 0), 50);
    const tip = V(0, -2.3, 0.12);
    return skin;
  }],
  // S10 — "Habis tu, kenapa gatal?"
  [35.95, 38.05, (t) => {
    malePerched(t);
    hideFemaleGarden();
    const sc = keys(t, [[35.95, 0], [36.3, 1], [37.8, 1], [38.05, 0.5]]);
    gardenAffan(t, GA, 0.1, {
      smile: 0.2, brow: 0.9, headRoll: 0.12 * sc, lookY: 0.3, lookX: -0.2,
      armR: { reach: [lerp(-0.6, -0.35, sc), lerp(0.25, 2.3 + 0.05 * Math.sin(t * 24), sc), lerp(0.1, 0.1, sc)], pole: [-1, -0.2, -0.6] },
    });
    lookCam(V(GA.x + 0.4, 3.5, GA.z + 6.4), V(GA.x, 3.1, GA.z), 48);
    const q = pop(t, 36.88, 38.0);
    ov.bubble('kgatal', 'KENAPA GATAL?', { x: W / 2, y: 420, o: q.o, s: q.s, r: 3 }, { size: 116, top: '#ffb36b', bot: '#ff5a3d' });
    const head = scr(GA.clone().add(V(0, 3.4, 0)));
    const qq = pop(t, 36.1, 38.0);
    ov.html('kq', ICONS.qmark('#ffcf33'), { x: head.x + 300, y: head.y - 250 + Math.sin(t * 3) * 10, o: qq.o, s: qq.s * 0.9, r: 12 });
    return garden;
  }],
  // S11 — saliva goes in, the body reacts, an itchy bump rises
  [38.05, 44.75, (t) => {
    skinState(t);
    const k = easeInOut(inv(42.6, 44.0, t));
    lookCam(V(lerp(-0.5, 0.6, k), lerp(-0.2, 1.8, k), lerp(12.2, 10.0, k)), V(lerp(-0.7, -0.2, k), lerp(-0.1, -0.2, k), 0), 50);
    return skin;
  }],
  // S12 — "Waaah, rupanya sebab tu!"
  [44.75, 47.3, (t) => {
    malePerched(t);
    hideFemaleGarden();
    const jump = t > 44.8 && t < 45.4 ? Math.sin(((t - 44.8) / 0.6) * Math.PI) * 0.45 : 0;
    const up = keys(t, [[44.75, 0], [44.95, 1], [45.5, 1], [45.8, 0]]);
    const idx = keys(t, [[45.75, 0], [46.05, 1], [47.3, 1]]);
    gardenAffan(t, GA, 0, {
      blink: t < 45.6 ? 0 : blinkAt(t, 6), bob: jump, smile: 1,
      wow: keys(t, [[44.75, 0], [44.9, 1], [45.5, 1], [45.8, 0]]), brow: keys(t, [[44.75, 0], [44.9, 1], [46.5, 0.5]]),
      legL: { x: -0.25 * jump, knee: 0.6 * jump }, legR: { x: -0.25 * jump, knee: 0.6 * jump },
      armL: { reach: [lerp(0.55, 0.85, up), lerp(0.25, 1.85, up), lerp(0.1, 0.3, up)], pole: [1, -0.4, -0.5] },
      armR: idx > 0.01 ? { reach: [lerp(-0.85, -0.5, idx), lerp(1.85, 1.6, idx), lerp(0.3, 0.45, idx)], point: idx, pole: [-1, -0.8, -0.3] } : { reach: [lerp(-0.55, -0.85, up), lerp(0.25, 1.85, up), lerp(0.1, 0.3, up)], pole: [-1, -0.4, -0.5] },
    });
    const k = easeOut(inv(44.75, 47.3, t));
    lookCam(V(GA.x + 0.1, 3.0, GA.z + lerp(6.6, 5.6, k)), V(GA.x, 2.8, GA.z), 50);
    const head = scr(GA.clone().add(V(0, 4.3 + jump, 0)));
    const b = pop(t, 44.95, 47.25);
    ov.html('bulb', ICONS.bulb(), { x: head.x + 260, y: head.y - 80 + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.75, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(44.8, 45.2, t) });
    return garden;
  }],
  // S13 — "Jadi, jangan garu tau!"
  [47.3, 49.25, (t) => {
    malePerched(t);
    hideFemaleGarden();
    const wag = keys(t, [[47.3, 0], [47.6, 1], [49.0, 1], [49.25, 0]]);
    const w = POSES.wagR(t).armR;
    gardenAffan(t, GA, 0, {
      smile: 0.6, brow: 0.5, headYaw: wag * 0.12 * Math.sin(t * 8), headRoll: -0.05,
      armR: { reach: [lerp(-0.55, w.reach[0], wag), lerp(0.25, w.reach[1], wag), lerp(0.1, w.reach[2], wag)], pole: w.pole, point: wag, wz: w.wz * wag },
    });
    lookCam(V(GA.x - 0.2, 3.3, GA.z + 5.6), V(GA.x - 0.3, 3.0, GA.z), 50);
    const q = pop(t, 48.0, 49.2);
    ov.bubble('jgaru', 'JANGAN GARU!', { x: W / 2, y: 410, o: q.o, s: q.s }, { size: 120 });
    const x = pop(t, 48.32, 49.2, { from: 2 });
    ov.html('jx', ICONS.cross(), { x: 860, y: 280, o: x.o, s: x.s * 0.5 });
    return garden;
  }],
  // S14 — tip out standing water so mosquitoes can't lay eggs
  [49.25, 52.38, (t) => {
    malePerched(t);
    hideFemaleGarden();
    potState(t);
    const push = keys(t, [[49.4, 0], [49.75, 1], [50.4, 1], [50.8, 0]]);
    const ap = garden.pot.position.clone().add(V(2.2, 0, 0.1));
    gardenAffan(t, ap, -Math.PI / 2 + 0.25, {
      smile: 0.9, brow: 0.4, lean: 0.12 * push, headPitch: 0.25, lookY: -0.3,
      armL: { reach: [lerp(0.6, 0.35, push), lerp(0.25, 0.95, push), lerp(0.1, 0.85, push)], pole: [1, -0.6, -0.3] },
      armR: { reach: [lerp(-0.6, -0.35, push), lerp(0.25, 0.95, push), lerp(0.1, 0.85, push)], pole: [-1, -0.6, -0.3] },
    });
    const pp = garden.pot.position;
    lookCam(V(pp.x + 0.1, 3.4, pp.z + 8.8), V(pp.x + 0.2, 1.3, pp.z), 50);
    const lp = scr(pp.clone().add(V(0, 1.4, 0)));
    pinTag('jentik', 'JENTIK-JENTIK', lp, t, 49.3, 50.1, { bg: '#6d5a3a', pointer: 'down', small: true }, -110);
    const q = pop(t, 49.28, 52.33);
    ov.tag('buang', 'BUANG AIR BERTAKUNG', { x: W / 2, y: 380, o: q.o, s: q.s }, { bg: BLUE });
    const e = pop(t, 51.4, 52.33);
    ov.html('eggs2', SVG.eggs(), { x: 250, y: 620, o: e.o, s: e.s * 0.7 });
    const x = pop(t, 51.5, 52.33, { from: 2 });
    ov.html('ex', ICONS.cross(), { x: 250, y: 620, o: x.o, s: x.s * 0.45 });
    const ok = pop(t, 50.6, 52.33);
    ov.sparkles(t, { n: 14, seed: 44, x: lp.x - 250, y: lp.y - 150, w: 500, h: 300, a: ok.o });
    return garden;
  }],
  // S15 — back in the bedroom: thumbs up
  [52.38, 55.9, (t) => {
    room.mos.position.set(0, -20, 0);
    const th = keys(t, [[52.6, 0], [52.95, 1], [55.6, 1], [55.9, 0.6]]);
    const up = { ...POSES.thumbsUpR.armR, reach: [-0.45, 0.98, 0.68] };
    roomAffan(t, {
      headYaw: -0.08 + 0.05 * wobble(t, 2), smile: 1, brow: 0.6,
      armR: { reach: sitRest.armR.reach.map((r, i) => lerp(r, up.reach[i], th)), pole: up.pole, thumb: th, wy: up.wy * th, wx: up.wx * th },
    });
    const k = easeInOut(inv(52.38, 55.9, t));
    lookCam(V(lerp(0.9, 0.4, k), 3.1, lerp(6.6, 5.6, k)), V(0, 2.7, 0.4), 46);
    ov.flash((1 - inv(52.38, 52.7, t)) * 0.9, '20,40,120');
    if (th > 0.5) {
      const hand = scr(room.aff.parts.arms.R.hand.getWorldPosition(V(0, 0, 0)));
      ov.sparkles(t, { n: 12, seed: 33, x: hand.x - 160, y: hand.y - 200, w: 320, h: 300, a: inv(52.9, 53.3, t), size: 30 });
    }
    return room;
  }],
  // S16 — "Apa lagi kita nak belajar lepas ni?"
  [55.9, 58.1, (t) => {
    room.mos.position.set(0, -20, 0);
    const tk = keys(t, [[55.9, 0], [56.25, 1], [58.1, 1]]);
    const th2 = POSES.thinkR.armR;
    roomAffan(t, {
      smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, headYaw: 0.05,
      armR: { reach: sitRest.armR.reach.map((r, i) => lerp(r, th2.reach[i], tk)), pole: th2.pole, point: tk, wx: th2.wx * tk },
    });
    lookCam(V(0.3, 3.2, 4.4), V(0, 3.0, 0.4), 46);
    const head = scr(AFF_HEAD);
    [[56.0, -290, -300, '#ffcf33', -12], [56.3, 280, -340, '#3fa2ff', 10], [56.6, 320, -90, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, 58.05);
      ov.html('eq' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    return room;
  }],
  // Outro — The Curious Affan logo
  [58.1, DURATION, (t) => {
    const k = easeOut(inv(58.1, 58.8, t));
    outro.aff.root.position.set(0, 0, 0);
    const th2 = POSES.thinkR.armR;
    outro.aff.pose({ ...POSES.thinkR, armR: { ...th2 }, smile: 1, blink: blinkAt(t, 9), headRoll: -0.08, lookX: 0.25, lookY: 0.15, headYaw: 0.08 });
    flyMos(outro.mos, (u) => V(1.9 * Math.sin(u * 1.5), 3.4 + 0.5 * Math.sin(u * 2.4), 1.2 * Math.cos(u * 1.5)), t);
    lookCam(V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash((1 - inv(58.1, 58.45, t)) * 1.0);
    const g = ov.g;
    const ra = inv(58.2, 58.8, t);
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
    const ic = pop(t, 58.7, 99);
    ov.html('oBulb', ICONS.bulb(), { x: 175, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.55, r: -10 });
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    ov.html('oQ2', ICONS.qmark('#2f6fff'), { x: 220, y: 720 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.6, r: -12 });
    const l1 = pop(t, 58.4, 99), l2 = pop(t, 58.6, 99), l3 = pop(t, 58.8, 99);
    drawLogo(ov, { k: [l1, l2, l3], star: pop(t, 59.0, 99) });
    return outro;
  }],
];

function win2(t, a, b, f = 0.2) {
  return t < a || t > b ? 0 : Math.min(clamp((t - a) / f), clamp((b - t) / f));
}
function hideFemaleGarden() {
  garden.female.position.set(0, -50, 0);
}

// ------------------------------------------------------------- skin story
// One timeline for the cross-section (S9a, S9b, S11): poke in -> sip blood ->
// saliva -> defenders -> mosquito leaves -> bump rises.
const SKIN_MOS_X = -1.3;
// Shift the skin mosquito so its proboscis tip touches (x, y) on the surface.
function settleTip(x, y) {
  const m = skin.mos;
  m.updateMatrixWorld(true);
  const tip = m.userData.prob.localToWorld(V(0, 0, 0.75));
  m.position.x += x - tip.x;
  m.position.y += y - tip.y;
  m.updateMatrixWorld(true);
}
function skinState(t) {
  const s = skin;
  // blood cells flow along the vessel
  s.cells.forEach((c, i) => {
    c.position.x = ((c.userData.x0 + t * 1.6) % s.W) - s.W / 2;
    c.rotation.y = t * 2 + i;
  });
  const poke = easeInOut(inv(32.7, 33.6, t));
  const depth = lerp(0, 2.05, poke); // how far the proboscis is in
  const leave = easeIn2(inv(42.6, 43.6, t));
  // mosquito standing on the skin, proboscis pointing straight down at x = 0
  if (t >= 32.4) {
    placeMos(s.mos, V(SKIN_MOS_X - 0.0, 2.15 + leave * 6, -1.2 + leave * 2), Math.PI / 2, 0.0, 0);
    s.mos.userData.update(t, { flap: leave > 0 ? 1 : 0, probPitch: 1.1, blood: clamp(inv(34.4, 37.8, t)) });
    settleTip(0, 0.05 + leave * 6 - 0.0);
  }
  // proboscis inside the skin: vertical, from surface down to the vessel
  const showIn = depth > 0.02 && leave < 0.05;
  s.probIn.visible = showIn;
  s.probIn.scale.set(1, Math.max(0.001, depth), 1);
  s.probIn.position.set(0, -depth / 2, 0.12);
  // saliva leaves the tip and spreads
  const sal = inv(38.2, 40.4, t);
  s.saliva.forEach((b) => {
    const k = clamp(sal * 1.4 - b.userData.d);
    const fade = 1 - inv(41.6, 42.9, t);
    if (k <= 0 || fade <= 0) return void b.position.set(0, -20, 0.2);
    b.position.set(Math.sin(b.userData.a) * b.userData.r * easeOut(k), -1.9 + Math.cos(b.userData.a) * b.userData.r * 0.5 * easeOut(k) + 0.6 * easeOut(k), 0.2);
    b.scale.setScalar(fade);
  });
  // defenders swarm from the vessel to the saliva
  const df = inv(40.7, 41.9, t);
  s.defenders.forEach((d, i) => {
    if (df <= 0) return void d.position.set(0, -20, 0.25);
    const k = easeOut(df);
    const tx = d.userData.x0 * 0.35, ty = -1.3 + (i % 3) * 0.35;
    d.position.set(lerp(d.userData.x0, tx, k) + 0.08 * Math.sin(t * 6 + d.userData.ph), lerp(-2.6, ty, k) + 0.06 * Math.cos(t * 7 + i), 0.3);
    d.rotation.z = 0.2 * Math.sin(t * 5 + i);
  });
  // the bump rises
  const bu = easeOut(inv(42.9, 43.9, t));
  s.bump.scale.set(1, Math.max(0.001, 0.55 * bu), 1);
  s.bump.position.set(0, 0, -1.2);
  s.redness.material.opacity = 0.55 * bu;
}
const easeIn2 = (k) => k * k;

// S9b and S11 overlays need the skin camera, so they are drawn after the shot sets it.
function skinOverlays(t) {
  if (t < 32.4 || t >= 44.75 || (t >= 35.95 && t < 38.05)) return;
  const tipW = V(0, -lerp(0, 2.05, easeInOut(inv(32.7, 33.6, t))), 0.12);
  const tip = scr(tipW);
  const surf = scr(V(0, 0, 0.12));
  if (t < 35.95) {
    pinTag('kulit', 'KULIT', scr(V(-4.5, -0.4, 0)), t, 33.32, 35.9, { bg: '#c9805a', small: true }, -10);
    pinTag('salur', 'SALUR DARAH', scr(V(4.2, -2.6, 0.6)), t, 33.0, 35.9, { bg: RED, small: true }, 110);
    const q = pop(t, 33.88, 35.9);
    if (q.o > 0) ov.tag('muncung', 'MUNCUNG HALUS', { x: clamp(surf.x + 250, 260, 820), y: surf.y - 240, o: q.o, s: q.s }, { bg: ORANGE, small: true });
    if (q.o > 0) ov.line(clamp(surf.x + 250, 260, 820) - 120, surf.y - 210, surf.x + 20, surf.y - 120, { color: ORANGE, w: 8, a: q.o });
    const st = pop(t, 35.0, 35.9);
    ov.bubble('straw', 'MACAM STRAW!', { x: W / 2 - 60, y: 420, o: st.o, s: st.s, r: -3 }, { size: 110 });
    ov.html('strawI', SVG.straw(), { x: 860, y: 380 + Math.sin(t * 3) * 6, o: st.o, s: st.s * 0.75, r: 8 });
    // blood drawn up the proboscis
    const up = inv(34.4, 35.9, t);
    if (up > 0) for (let i = 0; i < 5; i++) {
      const ph = (t * 1.4 + i / 5) % 1;
      ov.dot(lerp(tip.x, surf.x, ph), lerp(tip.y, surf.y - 120, ph), 9, '#e8404f', up * Math.sin(ph * Math.PI));
    }
  } else {
    const a = pop(t, 38.4, 42.5);
    if (a.o > 0) ov.tag('liur', 'AIR LIUR', { x: clamp(tip.x - 300, 190, 890), y: tip.y - 170, o: a.o, s: a.s }, { bg: GREEN });
    const b = pop(t, 40.67, 42.85);
    ov.tag('lawan', 'BADAN BERTINDAK BALAS!', { x: W / 2, y: 400, o: b.o, s: b.s }, { bg: '#7a5ad8', small: true });
    const bt = pop(t, 43.44, 44.7);
    const bp = scr(V(0, 0.95, -1.2));
    ov.tag('bentol', 'BENTOL', { x: bp.x, y: bp.y - 170, o: bt.o, s: bt.s }, { bg: '#ff6a5a', pointer: 'down' });
    itchMarks(bp.x, bp.y - 60, t, inv(43.9, 44.2, t) * (1 - inv(44.5, 44.75, t)), 1.3);
    const gt = pop(t, 43.96, 44.7);
    ov.bubble('gatal2', 'GATAL!', { x: W / 2, y: 330, o: gt.o, s: gt.s, r: -4 }, { size: 130, top: '#ffb36b', bot: '#ff5a3d' });
  }
}

function frame(t) {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  garden.sparkles.userData.update(t);
  hideDefaults();
  const world = shot[2](t);
  if (world.sky) world.sky.position.copy(cam.position);
  if (world === skin) skinOverlays(t);
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(world === skin ? 0.18 : 0.3);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}
// Reset per-shot props that other shots may have moved.
function hideDefaults() {
  potState(0);
}

// Cover / thumbnail (9:16): Affan in bed, surprised, with a big friendly
// mosquito up front, a big title, episode badge and the series logo. Key
// elements stay inside the centre 3:4 area (y 240-1680) that profile grids show.
const THUMB = { mos: [1.25, 2.85, 2.7], yaw: -0.95, scale: 0.62, cam: [0.25, 3.0, 7.6], look: [0.4, 2.6, 0.8], fov: 44 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 3.4;
  const mp = V(...THUMB.mos);
  room.mos.scale.setScalar(THUMB.scale);
  placeMos(room.mos, mp, THUMB.yaw, 0.1, 0.15);
  room.mos.userData.update(t, { flap: 1 });
  roomAffan(t, {
    ...lookAt(mp), blink: 0, talk: 0, wow: 0.9, brow: 1,
    armL: { reach: [0.32, 0.62, 0.62], pole: [1, -1, -0.3], wz: -0.4 },
    armR: { reach: [0.25, 0.74, 0.7], pole: [-1, -0.6, -0.4], wx: 0.5 },
  });
  lookCam(V(...THUMB.cam), V(...THUMB.look), THUMB.fov);
  const key = new THREE.PointLight(0xffe2c4, 14, 9, 1.6);
  key.position.set(0.6, 3.6, 3.4);
  room.scene.add(key);
  renderer.render(room.scene, cam);
  room.scene.remove(key);
  room.mos.scale.setScalar(0.34);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 780);
  top.addColorStop(0, 'rgba(8,12,44,0.85)');
  top.addColorStop(1, 'rgba(8,12,44,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 780);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(8,12,44,0)');
  bot.addColorStop(1, 'rgba(8,12,44,0.8)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  const hand = scr(room.aff.parts.arms.L.hand.getWorldPosition(V(0, 0, 0)));
  itchMarks(hand.x, hand.y - 30, 0.3, 1, 0.9);
  ov.tag('thBadge', 'EPISOD 11', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'KENAPA NYAMUK\nGIGIT KITA?', { x: W / 2, y: 485, r: -2 }, { size: 118 });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 130, y: 760, r: -14, s: 0.9 });
  const ms = scr(mp);
  ov.tag('thMos', 'NYAMUK!', { x: clamp(ms.x, 200, 880), y: ms.y + 190 }, { bg: RED, pointer: 'up', small: true });
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
