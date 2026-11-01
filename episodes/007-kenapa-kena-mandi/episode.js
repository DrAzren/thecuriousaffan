// THE CURIOUS AFFAN — Episode 007: "Kenapa Kita Kena Mandi?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
//
// Science shown (kept accurate and gentle):
//   - sweat, natural skin oil and dirt build up on skin;
//   - skin naturally has bacteria; certain bacteria + sweat can make body odour;
//   - soap molecules (water-loving head, oil-loving tail) surround oil, dirt and
//     some germs so water can rinse them away; soap does not remove everything;
//   - not all bacteria are bad; a gentle wash, rinse, dry and clean clothes.
// Affan stays fully dressed throughout; the bathroom is shown with props only.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, smooth, easeOut, easeIn, easeInOut, backOut, keys, wobble, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildPark, buildSkin, buildBathroom, buildLiving, buildOutro, skinH } from './worlds.js';

const FPS = 30;
const DURATION = 45.5;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const park = buildPark();
const skin = buildSkin();
const bath = buildBathroom();
const living = buildLiving();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 3000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
function lookCam(pos, look, fov = 50) {
  cam.position.copy(pos);
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(look);
  cam.updateMatrixWorld(true);
}
const camKeys = (t, ks, ease = easeInOut) => {
  const v = keys(t, ks, ease);
  return { pos: V(v[0], v[1], v[2]), look: V(v[3], v[4], v[5]), fov: v[6] ?? 45 };
};
const shoot = (t, ks, ease) => {
  const c = camKeys(t, ks, ease);
  lookCam(c.pos, c.look, c.fov);
};

// Brand colours
const CYAN = '#1fb6e8', NAVY = '#17256b', PEACH = '#ff9a6b', YELLOW = '#ffc928', ORANGE = '#ff8a3d', GREEN = '#3fbf6a', PURPLE = '#8f6bff';

// ------------------------------------------------------------- overlay art
const SVG = {
  drop: (c = '#7fe0ff') => `<svg width="90" height="120" viewBox="0 0 90 120"><path d="M45 8 C60 40 80 58 80 80 A35 35 0 0 1 10 80 C10 58 30 40 45 8 Z" fill="${c}" stroke="#ffffff" stroke-width="9" stroke-linejoin="round"/><path d="M45 8 C60 40 80 58 80 80 A35 35 0 0 1 10 80 C10 58 30 40 45 8 Z" fill="none" stroke="${NAVY}" stroke-width="4" stroke-linejoin="round" opacity="0.35"/><ellipse cx="32" cy="78" rx="8" ry="13" fill="#fff" opacity="0.85"/></svg>`,
  bug: (c = '#7ee08a') => `<svg width="170" height="120" viewBox="0 0 170 120"><g stroke="${NAVY}" stroke-width="6" stroke-linecap="round" fill="none"><path d="M18 60 C6 50 10 38 2 30"/><path d="M152 60 C164 70 160 84 168 92"/></g>
    <rect x="18" y="22" width="134" height="76" rx="38" fill="${c}" stroke="${NAVY}" stroke-width="8"/>
    <circle cx="68" cy="54" r="13" fill="#fff"/><circle cx="102" cy="54" r="13" fill="#fff"/><circle cx="70" cy="56" r="7" fill="${NAVY}"/><circle cx="104" cy="56" r="7" fill="${NAVY}"/>
    <circle cx="73" cy="52" r="2.5" fill="#fff"/><circle cx="107" cy="52" r="2.5" fill="#fff"/><path d="M74 74 Q85 84 96 74" stroke="${NAVY}" stroke-width="6" fill="none" stroke-linecap="round"/>
    <ellipse cx="52" cy="70" rx="8" ry="5" fill="#ff7aa8" opacity="0.5"/><ellipse cx="118" cy="70" rx="8" ry="5" fill="#ff7aa8" opacity="0.5"/></svg>`,
  check: () => `<svg width="90" height="90" viewBox="0 0 90 90"><circle cx="45" cy="45" r="40" fill="#3fd17a" stroke="#fff" stroke-width="8"/><path d="M25 46 L40 61 L66 31" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  heart: () => `<svg width="90" height="80" viewBox="0 0 90 80"><path d="M45 74 C10 50 4 34 4 22 A20 20 0 0 1 45 14 A20 20 0 0 1 86 22 C86 34 80 50 45 74 Z" fill="#ff6b9a" stroke="#fff" stroke-width="8" stroke-linejoin="round"/><ellipse cx="25" cy="24" rx="7" ry="5" fill="#fff" opacity="0.7"/></svg>`,
  plus: () => `<svg width="80" height="80" viewBox="0 0 80 80"><path d="M40 10 V70 M10 40 H70" stroke="#fff" stroke-width="24" stroke-linecap="round"/><path d="M40 10 V70 M10 40 H70" stroke="${NAVY}" stroke-width="12" stroke-linecap="round"/></svg>`,
  arrowDown: () => `<svg width="80" height="90" viewBox="0 0 80 90"><path d="M40 8 V60 M16 40 L40 70 L64 40" fill="none" stroke="#fff" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/><path d="M40 8 V60 M16 40 L40 70 L64 40" fill="none" stroke="${NAVY}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // soap molecule legend: water-loving head, oil-loving tail
  molecule: () => `<div style="background:rgba(255,255,255,0.94);border-radius:36px;padding:16px 30px 18px;box-shadow:0 8px 0 rgba(0,0,0,0.15),0 0 0 6px ${NAVY};display:flex;align-items:center;gap:22px;font-family:'Baloo 2';font-weight:800;">
    <svg width="230" height="70" viewBox="0 0 230 70"><path d="M60 35 C85 15 105 55 130 35 S175 15 200 35 S225 50 228 40" fill="none" stroke="#e8a800" stroke-width="12" stroke-linecap="round"/><path d="M60 35 C85 15 105 55 130 35 S175 15 200 35 S225 50 228 40" fill="none" stroke="#ffd24a" stroke-width="7" stroke-linecap="round"/><circle cx="34" cy="35" r="28" fill="#2fbaff" stroke="${NAVY}" stroke-width="5"/><ellipse cx="25" cy="25" rx="8" ry="6" fill="#fff" opacity="0.8"/></svg>
    <div style="line-height:1.0;font-size:48px;"><div style="color:#1d9be0">KEPALA suka AIR</div><div style="color:#d99400">EKOR suka MINYAK</div></div></div>`,
};

function stink(x, y, k, t, seed = 0, n = 3, len = 170) {
  if (k <= 0) return;
  const g = ov.g;
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const ox = (i - (n - 1) / 2) * 62;
    const ph = t * 4 + i * 1.7 + seed;
    const rise = ((t * 0.9 + i * 0.33) % 1);
    const a = k * Math.sin(rise * Math.PI);
    if (a <= 0.02) continue;
    const y0 = y - rise * 70;
    const pts = [];
    for (let s = 0; s <= 20; s++) {
      const u = s / 20;
      pts.push([x + ox + Math.sin(ph + u * 7) * 18, y0 - u * len]);
    }
    for (const [w, c] of [[24, `rgba(255,255,255,${a * 0.9})`], [12, `rgba(150,205,60,${a})`]]) {
      g.strokeStyle = c;
      g.lineWidth = w;
      g.beginPath();
      pts.forEach(([px, py], j) => (j ? g.lineTo(px, py) : g.moveTo(px, py)));
      g.stroke();
    }
  }
  g.restore();
}

function pinTag(id, text, p, t, a, b, style, dy = -110, minY = 300) {
  const q = pop(t, a, b);
  if (q.o <= 0 || !p.visible) return;
  ov.tag(id, text, { x: clamp(p.x, 190, 890), y: clamp(p.y + dy, minY, 1360), o: q.o, s: q.s }, style);
}

function hookTitle(t, a, b, y = 430, size = 104) {
  const p = pop(t, a, b, { fin: 0.45 });
  const fl = Math.sin(t * 3) * 6;
  ov.bubble('hook', 'KENAPA KENA\nMANDI?', { x: W / 2, y: y + fl, o: p.o, s: p.s }, { size, top: '#ffe45c', bot: '#ffa51f' });
  return p;
}

// --------------------------------------------------------------- Affan helpers
function affPose(a, t, seed, p = {}) {
  a.pose({ blink: blinkAt(t, seed), talk: talk(t), ...p });
}
// Magnifier grip: hand local angles that keep the handle up through the fist.
const magArm = (reach, pole = [-1, -0.6, -0.3], extra = {}) => ({ reach, pole, ...extra });
// Orient the held magnifier in world space: lens facing lensDir, handle up.
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _mb = new THREE.Matrix4();
function aimMag(aff, lensDir, up = V(0, 1, 0)) {
  const hand = aff.parts.arms.R.hand;
  aff.root.updateMatrixWorld(true);
  const x = lensDir.clone().normalize();
  const z = up.clone().addScaledVector(x, -up.dot(x)).normalize();
  const y = new THREE.Vector3().crossVectors(z, x);
  _qb.setFromRotationMatrix(_mb.makeBasis(x, y, z));
  hand.parent.getWorldQuaternion(_qa);
  hand.quaternion.copy(_qa.invert().multiply(_qb));
  hand.updateMatrixWorld(true);
}
const facing = (yaw, tilt = 0) => V(Math.sin(yaw), tilt, Math.cos(yaw));

// Ball bounce path in the park.
const BOUNCES = [[-0.35, 0.35, 1.9], [0.35, 0.95, 0.75], [0.95, 1.38, 0.32], [1.38, 1.64, 0.12], [1.64, 1.8, 0.04]];
function ballAt(t) {
  let y = 0;
  for (const [a, b, h] of BOUNCES) if (t >= a && t < b) {
    const k = (t - a) / (b - a);
    y = 4 * h * k * (1 - k);
  }
  const x = lerp(0.9, 2.3, easeOut(clamp(t / 2.6)));
  return { x, y: 0.32 + y, z: 1.3 - 0.3 * clamp(t / 2.6), roll: -x / 0.32 };
}

// ===================================================================== SHOTS
const SHOTS = [
  // S1a — hook: sunny park, ball bounces, "Yeay!", title within the first second
  [0, 3.0, (t) => {
    const b = ballAt(t);
    park.ball.position.set(b.x, b.y, b.z);
    park.ball.rotation.set(0, 0, b.roll);
    park.aff.root.position.set(0, 0, 0);
    park.aff.root.scale.setScalar(1);
    park.mag.visible = false;
    const hop = t > 0.05 && t < 0.6 ? Math.sin(((t - 0.05) / 0.55) * Math.PI) * 0.32 : 0;
    const up = keys(t, [[0, 0.85], [0.15, 1], [1.05, 1], [1.45, 0]]);
    const gest = keys(t, [[1.5, 0], [1.8, 1], [2.75, 1], [3.0, 0.6]]);
    affPose(park.aff, t, 1, {
      bob: hop + 0.02 * Math.sin(t * 7), smile: 1, brow: 0.5 + 0.4 * up, headYaw: keys(t, [[0, -0.05], [1.4, -0.05], [1.9, 0.35], [2.6, 0.1]]), headPitch: -0.05,
      lookX: keys(t, [[1.4, 0], [1.9, 0.6], [2.6, 0.1]]),
      legL: { x: -0.3 * hop, knee: 0.7 * hop }, legR: { x: -0.3 * hop, knee: 0.7 * hop },
      armL: up > 0.01 ? { reach: [lerp(0.6, 0.85, up), lerp(0.25, 2.05, up), lerp(0.1, 0.35, up)], pole: [1, -0.3, -0.5] } : { reach: [0.62, 0.32, 0.05], pole: [1, 0, -1] },
      armR: up > 0.01 ? { reach: [lerp(-0.6, -0.85, up), lerp(0.25, 2.05, up), lerp(0.1, 0.35, up)], pole: [-1, -0.3, -0.5] } : { reach: [lerp(-0.6, -0.95, gest), lerp(0.25, 1.05, gest), lerp(0.1, 0.55, gest)], pole: [-1, -0.8, -0.2], wz: 0.4 * gest },
    });
    shoot(t, [[0, [0.9, 2.9, 9.4, 0.1, 2.75, 0, 42]], [3.0, [0.5, 2.8, 8.0, 0.1, 2.6, 0, 42]]]);
    hookTitle(t, 0.12, 2.9);
    const q = pop(t, 0.45, 2.9);
    ov.tag('ep', 'EPISOD 7', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    ov.sparkles(t, { n: 10, seed: 2, y: 250, h: 500, a: 0.5 * inv(0.1, 0.6, t) * (1 - inv(2.6, 2.9, t)) });
    return park;
  }],
  // S1b — "Eh, badan melekit." sweat on the forehead, sticky shirt
  [3.0, 4.9, (t) => {
    park.ball.position.set(2.3, 0.32, 1.0);
    park.mag.visible = false;
    const wipe = keys(t, [[3.05, 0], [3.3, 1], [3.85, 1], [4.05, 0]]);
    const pinch = keys(t, [[4.0, 0], [4.2, 1], [4.9, 1]]);
    const sweep = inv(3.3, 3.85, t);
    let armR;
    if (wipe > 0.01) armR = { reach: [lerp(-0.6, lerp(-0.55, 0.15, sweep), wipe), lerp(0.25, 2.05, wipe), lerp(0.1, 0.78, wipe)], pole: [-1, -0.7, -0.2], wx: -0.6 * wipe };
    else armR = { reach: [lerp(-0.6, -0.22, pinch), lerp(0.25, 0.92 + 0.07 * Math.sin(t * 20) * pinch, pinch), lerp(0.1, 0.66, pinch)], pole: [-1, -0.8, -0.2] };
    affPose(park.aff, t, 2, {
      smile: 0.25, brow: 0.9, headRoll: 0.1, headPitch: 0.05 + 0.1 * pinch, headYaw: -0.1, lookY: -0.3 * pinch, lookX: -0.1,
      armR, armL: { reach: [0.6, 0.3, 0.1], pole: [1, 0, -1] }, bob: 0.015 * Math.sin(t * 6),
    });
    for (const s of park.sweat) {
      const k = backOut(inv(3.05, 3.35, t));
      s.d.scale.setScalar(Math.max(0.001, k));
      s.d.position.y = s.y - 0.12 * smooth(inv(3.4, 4.9, t));
    }
    shoot(t, [[3.0, [-0.4, 3.0, 4.9, 0.05, 2.75, 0, 38]], [4.9, [-0.25, 2.9, 4.3, 0.0, 2.6, 0, 38]]]);
    const head = scr(V(0, 3.35, 0.2));
    [[3.2, -230, -40, 0.75], [3.4, 220, -80, 0.6], [3.6, 250, 70, 0.5]].forEach(([a, dx, dy, s], i) => {
      const q = pop(t, a, 4.85);
      ov.html('dr' + i, SVG.drop(), { x: head.x + dx, y: head.y + dy + ((t * 50) % 30), o: q.o, s: q.s * s, r: i ? 12 : -10 });
    });
    const m = pop(t, 4.15, 4.85);
    ov.tag('melekit', 'MELEKIT!', { x: W / 2 + 250, y: 1250, o: m.o, s: m.s, r: -4 }, { bg: PEACH });
    return park;
  }],
  // S1c — "Kenapa ada bau ni?" sniff the collar, comedic close-up, surprise
  [4.9, 6.3, (t) => {
    park.mag.visible = false;
    for (const s of park.sweat) s.d.scale.setScalar(1);
    const pull = keys(t, [[4.9, 0.4], [5.05, 1], [5.6, 1], [5.85, 0.2]]);
    const sniff = t > 4.98 && t < 5.5 ? Math.sin((t - 4.98) * 30) * 0.04 : 0;
    const shock = keys(t, [[5.5, 0], [5.62, 1], [6.3, 1]], easeOut);
    affPose(park.aff, t, 3, {
      blink: shock > 0.2 ? 0 : 0.65, smile: 0.3, wow: shock, brow: lerp(0.2, 1.2, shock),
      headPitch: lerp(0.38 + sniff, -0.12, shock), headYaw: 0, headRoll: lerp(-0.05, 0.08, shock), lean: lerp(0.08, -0.16, shock),
      armR: { reach: [lerp(-0.6, -0.16, pull), lerp(0.25, 1.12, pull), lerp(0.1, 0.62, pull)], pole: [-1, -0.8, -0.3] },
      armL: { reach: [lerp(0.6, 0.16, pull) + 0.5 * shock, lerp(0.25, 1.12, pull) + 0.3 * shock, lerp(0.1, 0.62, pull)], pole: [1, -0.8, -0.3] },
    });
    const zoom = easeOut(inv(5.52, 5.68, t));
    shoot(t, [[4.9, [0.3, 3.0, 4.9, 0, 2.45, 0, 40]], [6.3, [0.2, 3.0, 4.6, 0, 2.5, 0, 40]]]);
    cam.fov = lerp(40, 30, zoom);
    cam.updateProjectionMatrix();
    const collar = scr(V(0, 2.25, 0.6));
    stink(collar.x, collar.y + 90, inv(5.0, 5.25, t) * (1 - inv(6.1, 6.3, t)), t, 0, 3, 160);
    const q = pop(t, 5.58, 6.25, { from: 1.8 });
    ov.bubble('huh', '?!', { x: W / 2 + 320, y: 400, o: q.o, s: q.s, r: 10 }, { size: 170, top: '#ffe45c', bot: '#ff8a3d' });
    return park;
  }],
  // S2a — "Kenapa kita kena mandi?" title + the magical magnifying glass appears
  [6.3, 7.95, (t) => {
    for (const s of park.sweat) s.d.scale.setScalar(Math.max(0.001, 1 - inv(6.3, 6.6, t)));
    park.mag.visible = true;
    const m = backOut(inv(6.45, 6.85, t), 2.2);
    park.mag.scale.setScalar(Math.max(0.001, m));
    const raise = keys(t, [[6.3, 0], [6.7, 1]]);
    affPose(park.aff, t, 4, {
      smile: 0.9, brow: 0.9, headRoll: 0.12, headYaw: -0.25, lookX: -0.5, lookY: 0.2,
      armR: magArm([lerp(-0.6, -0.72, raise), lerp(0.25, 1.45, raise), lerp(0.1, 0.62, raise)]),
      armL: { reach: [0.1, 1.38, 0.62], pole: [0.6, -1, 0.1], point: 1, wx: -0.4 },
    });
    aimMag(park.aff, V(0.25, 0, 1));
    shoot(t, [[6.3, [0.6, 2.7, 6.4, 0, 2.3, 0, 42]], [7.95, [0.3, 2.65, 5.6, 0, 2.35, 0, 42]]]);
    hookTitle(t, 6.32, 7.95, 420, 112);
    const mp = scr(park.mag.userData.head.getWorldPosition(V(0, 0, 0)));
    ov.sparkles(t, { n: 14, seed: 21, x: mp.x - 170, y: mp.y - 170, w: 340, h: 340, size: 30, a: inv(6.5, 6.8, t) });
    return park;
  }],
  // S2b — "Jom masuk dunia kulit." Affan shrinks with a magic swirl
  [7.95, 9.5, (t) => {
    park.mag.visible = true;
    park.mag.scale.setScalar(1);
    const up = keys(t, [[7.95, 0], [8.3, 1]]);
    const sh = easeIn(inv(8.55, 9.3, t));
    park.aff.root.scale.setScalar(Math.max(0.01, 1 - 0.97 * sh));
    park.aff.root.rotation.y = 0;
    affPose(park.aff, t, 5, {
      yaw: sh * 7, smile: 1, brow: 1, bob: 0.1 * Math.sin(inv(7.95, 8.4, t) * Math.PI),
      armR: magArm([lerp(-0.72, -0.62, up), lerp(1.45, 2.2, up), lerp(0.62, 0.45, up)]),
      armL: { reach: [lerp(0.1, 0.85, up), lerp(1.38, 1.95, up), lerp(0.62, 0.35, up)], pole: [1, -0.4, -0.5] },
    });
    aimMag(park.aff, facing(sh * 7 + 0.2));
    shoot(t, [[7.95, [0.3, 2.65, 5.6, 0, 2.35, 0, 42]], [8.5, [0.25, 2.5, 5.2, 0, 2.2, 0, 42]], [9.5, [0.1, 1.0, 3.3, 0, 0.2, 0, 42]]]);
    const c = scr(V(0, 2.2 * (1 - sh) + 0.1, 0));
    ov.swirl(t, c.x, c.y, inv(8.2, 9.2, t));
    ov.flash(inv(9.15, 9.5, t) ** 2);
    return park;
  }],
  // S3 — inside the skin world: sweat, oil, dirt
  [9.5, 13.3, (t) => {
    const ax = -0.5, az = 2.0;
    skin.aff.root.position.set(ax, skinH(ax, az), az);
    skin.aff.root.scale.setScalar(1);
    skin.mag.visible = true;
    const look = keys(t, [[9.5, 0.25], [10.45, 0.25], [10.95, -2.3], [11.55, -2.3], [11.95, 2.57 - Math.PI * 2], [12.25, 2.57 - Math.PI * 2], [12.6, 3.09 - Math.PI * 2]]);
    const wow = keys(t, [[9.5, 0.4], [9.62, 1], [10.25, 1], [10.5, 0]]);
    const insp = keys(t, [[10.6, 0], [11.0, 1]]);
    affPose(skin.aff, t, 6, {
      yaw: look, wow, brow: 0.8 + 0.4 * wow, smile: 1,
      armL: wow > 0.05 ? { reach: [0.95, 1.6, 0.35], pole: [1, -0.5, -0.5] } : { reach: [0.6, 0.3, 0.12], pole: [1, -0.2, -1] },
      armR: insp > 0 ? magArm([lerp(-0.95, -0.42, insp), lerp(1.6, 1.62, insp), lerp(0.35, 0.95, insp)], [-1, -0.6, -0.2]) : magArm([-0.95, 1.6, 0.35]),
      headPitch: 0.15 * insp, lookY: -0.3 * insp,
    });
    aimMag(skin.aff, insp > 0.5 ? facing(look, -0.25) : facing(0.25), insp > 0.5 ? facing(look, 2.5) : V(0, 1, 0));
    shoot(t, [
      [9.5, [1.5, 15, 24, 0, 2.5, -2, 48]],
      [10.6, [0.4, 4.3, 9.5, -0.5, 2.6, 1.5, 46]],
      [13.3, [-3.4, 6.2, 11.0, 0.6, 1.0, -4.5, 48]],
    ]);
    ov.flash((1 - inv(9.5, 9.95, t)) * 1.0);
    pinTag('peluh', 'PELUH', scr(V(-5, skinH(-5, -3) + 2.2, -3)), t, 11.0, 13.25, { bg: CYAN, pointer: 'down' });
    pinTag('minyak', 'MINYAK', scr(V(4.5, skinH(4.5, -5.5) + 1.1, -5.5)), t, 11.76, 13.25, { bg: YELLOW, pointer: 'down' });
    pinTag('kotoran', 'KOTORAN', scr(V(0.5, skinH(0.5, -7.5) + 1.7, -7.5)), t, 12.42, 13.25, { bg: '#a0652f', pointer: 'down' });
    const w = pop(t, 9.56, 10.5, { from: 1.6 });
    ov.bubble('wah', 'WAH!', { x: W / 2, y: 430, o: w.o, s: w.s, r: -3 }, { size: 150 });
    return skin;
  }],
  // S4a — "Kulit kita memang ada bakteria." the friendly resident colony
  [13.3, 15.6, (t) => {
    const ax = -0.6, az = -10.5;
    skin.aff.root.position.set(ax, skinH(ax, az), az);
    skin.mag.visible = true;
    affPose(skin.aff, t, 7, {
      yaw: Math.PI - 0.15, smile: 1, brow: 0.8, headPitch: 0.1,
      armR: magArm([-0.42, 1.55, 0.95], [-1, -0.6, -0.2]), armL: { reach: [0.6, 0.3, 0.12], pole: [1, -0.2, -1] },
    });
    aimMag(skin.aff, facing(Math.PI - 0.15, -0.2), facing(Math.PI - 0.15, 2.5));
    for (const o of skin.colony) o.wave = clamp(inv(13.4, 13.9, t)) * (t < 15.4 ? 1 : 0);
    shoot(t, [[13.3, [1.4, 10.5, 0.5, -0.2, 0.6, -18.5, 46]], [15.6, [1.0, 9.6, -1.2, -0.2, 0.6, -18.5, 46]]]);
    const b = skin.colony[1];
    pinTag('bakteria', 'BAKTERIA', scr(b.b.position.clone().add(V(0, 1.6, 0))), t, 14.92, 15.55, { bg: GREEN, pointer: 'down' });
    return skin;
  }],
  // S4b — "Bila peluh bercampur dengan bakteria tertentu, badan boleh berbau."
  [15.6, 19.85, (t) => {
    skin.aff.root.position.set(100, 0, 100);
    for (const o of skin.colony) o.wave = 0;
    for (const o of skin.odor) o.wave = 0.6 * inv(17.6, 18.0, t);
    shoot(t, [[15.6, [4.6, 3.3, -9.6, 3, 1.3, -18, 44]], [19.85, [4.0, 2.8, -11.2, 3, 1.4, -18, 44]]]);
    const d2 = scr(skin.D2.g.position.clone().add(V(0, 1.4, 0)));
    // equation: PELUH + BAKTERIA TERTENTU = BAU
    const p1 = pop(t, 16.14, 19.82), pl = pop(t, 16.9, 19.82), p2 = pop(t, 17.18, 19.82), eq = pop(t, 19.0, 19.82, { from: 1.8 });
    ov.tag('eqPeluh', 'PELUH', { x: 250, y: 300, o: p1.o, s: p1.s }, { bg: CYAN, small: true });
    ov.html('eqPlus', SVG.plus(), { x: 395, y: 300, o: pl.o, s: pl.s * 0.7 });
    ov.tag('eqBak', 'BAKTERIA TERTENTU', { x: 670, y: 300, o: p2.o, s: p2.s }, { bg: ORANGE, small: true });
    ov.html('eqDown', SVG.arrowDown(), { x: W / 2, y: 420, o: eq.o, s: eq.s * 0.8 });
    ov.tag('eqBau', 'BAU BADAN', { x: W / 2, y: 540, o: eq.o, s: eq.s }, { bg: '#7fae2a' });
    stink(W / 2, 500, eq.o * 0.9, t, 2, 3, 120);
    pinTag('d2', 'PELUH', d2, t, 16.14, 17.1, { bg: CYAN, pointer: 'down', small: true }, -70);
    return skin;
  }],
  // S5a — "Habis tu, apa sabun buat?" Affan wonders; big soap bubbles drift in
  [19.85, 22.1, (t) => {
    const ax = 8.5, az = -3;
    const ay = skinH(ax, az);
    skin.aff.root.position.set(ax, ay, az);
    skin.mag.visible = true;
    affPose(skin.aff, t, 8, {
      yaw: -0.35, smile: 0.9, brow: 0.9, headRoll: -0.12, lookX: 0.4, lookY: 0.5, headPitch: -0.1,
      armL: { reach: [0.02, 1.36, 0.62], pole: [0.6, -1, 0.1], point: 1, wx: -0.4 },
      armR: magArm([-0.72, 0.85, 0.5], [-1, -0.6, -0.4]),
    });
    aimMag(skin.aff, facing(-0.35 - 1.2), facing(-0.35, 1.5));
    const R = rng(3);
    skin.bubbles.forEach((b, i) => {
      const a0 = 19.95 + i * 0.18;
      const k = easeOut(inv(a0, a0 + 1.1, t));
      const r = 0.55 + R() * 1.1;
      const bx = ax - 4 + R() * 8, by = ay + 1 + R() * 6, bz = az - 2 - R() * 6;
      b.visible = k > 0;
      b.scale.setScalar(Math.max(0.001, r * k));
      b.position.set(bx + Math.sin(t * 0.8 + i) * 0.4, by - (1 - k) * 4 + Math.sin(t * 1.2 + i) * 0.3, bz);
    });
    shoot(t, [[19.85, [10.3, 3.2, 3.6, 8.2, 2.7, -3, 46]], [22.1, [10.0, 3.0, 2.6, 8.3, 2.6, -3, 46]]]);
    const head = scr(V(ax, ay + 4.2, az));
    [[20.1, -250, -220, '#ffcf33', -12], [20.5, 240, -260, '#3fa2ff', 10]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, 22.05);
      ov.html('q' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.8, r });
    });
    const s = pop(t, 21.22, 22.05);
    ov.tag('sabunQ', 'SABUN?', { x: W / 2, y: 330, o: s.o, s: s.s }, { bg: CYAN });
    return skin;
  }],
  // S5b — soap molecules wrap oil, dirt and a germ, lifting them off the skin
  [22.1, 25.62, (t) => {
    skin.aff.root.position.set(100, 0, 100);
    skin.bubbles.forEach((b, i) => {
      b.visible = true;
      const k = inv(22.1, 23.2, t);
      b.scale.setScalar(Math.max(0.001, (0.5 + (i % 3) * 0.35) * (1 - k * 0.3)));
      b.position.set(-4 + i * 1.6 + Math.sin(t + i) * 0.4, 6 + (i % 3) * 1.3 + Math.sin(t * 1.3 + i) * 0.3, -9 - (i % 2) * 3);
    });
    const O1 = skin.O1.base, K1 = skin.K1.base, G = skin.germ.base;
    shoot(t, [
      [22.1, [O1.x + 4.0, O1.y + 4.6, O1.z + 8.0, O1.x, O1.y + 1.0, O1.z, 46]],
      [23.75, [O1.x + 3.0, O1.y + 3.6, O1.z + 6.6, O1.x - 0.3, O1.y + 1.4, O1.z, 46]],
      [24.4, [K1.x + 2.8, K1.y + 3.6, K1.z + 6.6, K1.x - 0.2, K1.y + 1.5, K1.z, 46]],
      [25.0, [G.x + 3.0, G.y + 3.6, G.z + 6.6, G.x + 0.4, G.y + 1.6, G.z, 46]],
      [25.62, [G.x + 2.6, G.y + 4.4, G.z + 7.6, G.x + 0.8, G.y + 1.8, G.z, 48]],
    ]);
    const sa = pop(t, 22.18, 25.6);
    ov.tag('sabunAir', 'SABUN + AIR', { x: W / 2, y: 300, o: sa.o, s: sa.s }, { bg: CYAN });
    const lg = pop(t, 22.6, 25.55);
    ov.html('legend', SVG.molecule(), { x: W / 2, y: 455, o: lg.o, s: lg.s * 0.9 });
    pinTag('mO', 'MINYAK', scr(skin.O1.g.position.clone().add(V(0, 2.4, 0))), t, 23.68, 24.3, { bg: YELLOW, pointer: 'down', small: true }, -40, 600);
    pinTag('mK', 'KOTORAN', scr(skin.K1.g.position.clone().add(V(0, 2.4, 0))), t, 24.24, 24.95, { bg: '#a0652f', pointer: 'down', small: true }, -40, 600);
    pinTag('mG', 'KUMAN', scr(skin.germ.b.position.clone().add(V(0, 2.4, 0))), t, 25.1, 25.6, { bg: PURPLE, pointer: 'down', small: true }, -40, 600);
    return skin;
  }],
  // S5c — "Air pula bilas semuanya." a clear wave rinses everything away
  [25.62, 27.6, (t) => {
    skin.aff.root.position.set(100, 0, 100);
    skin.bubbles.forEach((b) => (b.visible = false));
    const fx = skin.frontX(t);
    shoot(t, [[25.62, [-4, 8.5, 9.5, 1, 0.5, -8, 50]], [27.6, [3, 8.0, 8.5, 6, 0.5, -8, 50]]]);
    const sa = pop(t, 25.62, 27.55);
    ov.tag('sabunAir2', 'SABUN + AIR', { x: W / 2, y: 300, o: sa.o, s: sa.s }, { bg: CYAN });
    const b = pop(t, 26.6, 27.55, { from: 1.6 });
    ov.bubble('bilas', 'BILAS BERSIH!', { x: W / 2, y: 470, o: b.o, s: b.s, r: -2 }, { size: 120, top: '#bff4ff', bot: '#1fb6e8' });
    const f = scr(V(fx, 2.5, -6));
    if (f.visible) ov.sparkles(t, { n: 10, seed: 51, x: f.x - 200, y: f.y - 260, w: 280, h: 420, size: 24, a: 0.7, colors: ['#ffffff', '#bff4ff'] });
    return skin;
  }],
  // S6 — "Tapi bukan semua bakteria jahat tau." Affan with the friendly residents
  [27.6, 30.55, (t) => {
    const ax = 1.5, az = -14.8;
    skin.aff.root.position.set(ax, skinH(ax, az), az);
    skin.aff.root.scale.setScalar(1);
    skin.mag.visible = false;
    for (const o of skin.colony) o.wave = inv(27.7, 28.1, t);
    const hop = t > 27.62 && t < 28.1 ? Math.sin(((t - 27.62) / 0.48) * Math.PI) * 0.3 : 0;
    const wag = keys(t, [[28.15, 0], [28.4, 1], [29.15, 1], [29.4, 0]]);
    const open = keys(t, [[29.3, 0], [29.6, 1], [30.55, 1]]);
    const w = POSES.wagR(t).armR;
    affPose(skin.aff, t, 9, {
      yaw: 0.1, bob: hop, smile: 1, brow: 1, wow: keys(t, [[27.6, 0], [27.7, 0.7], [28.1, 0]]), headYaw: 0.15 * wag * Math.sin(t * 8), headRoll: -0.05,
      legL: { x: -0.25 * hop, knee: 0.6 * hop }, legR: { x: -0.25 * hop, knee: 0.6 * hop },
      armR: wag > 0.01 ? { reach: [lerp(-0.6, w.reach[0], wag), lerp(0.25, w.reach[1], wag), lerp(0.1, w.reach[2], wag)], pole: w.pole, point: wag, wz: w.wz * wag } : { reach: [lerp(-0.6, -1.0, open), lerp(0.25, 1.15, open), lerp(0.1, 0.45, open)], pole: [-1, -0.6, -0.4] },
      armL: { reach: [lerp(0.6, 1.0, open), lerp(0.25, 1.15, open), lerp(0.1, 0.45, open)], pole: [1, -0.6, -0.4] },
    });
    shoot(t, [[27.6, [2.8, 4.4, -5.6, 1.2, 2.9, -17.5, 48]], [30.55, [2.4, 4.2, -6.6, 1.0, 3.0, -17.5, 48]]]);
    const q = pop(t, 28.24, 30.3);
    ov.bubble('bukan', 'BUKAN SEMUA\nBAKTERIA JAHAT!', { x: W / 2, y: 410, o: q.o, s: q.s }, { size: 92, top: '#d6ffb8', bot: '#3fbf6a' });
    skin.colony.forEach((o, i) => {
      const h = pop(t, 29.3 + i * 0.08, 30.3);
      const p = scr(o.b.position.clone().add(V(0, 1.9, 0)));
      if (p.visible && p.x > 60 && p.x < W - 60 && p.y > 600 && p.y < 1400) ov.html('heart' + i, SVG.heart(), { x: p.x, y: p.y + Math.sin(t * 4 + i) * 8, o: h.o, s: h.s * 0.55 });
    });
    ov.sparkles(t, { n: 14, seed: 61, y: 600, h: 700, a: inv(29.2, 29.6, t) * 0.8 });
    const c = scr(V(ax, skinH(ax, az) + 2.2, az));
    ov.swirl(t, c.x, c.y, inv(29.9, 30.5, t) * 0.8, 9);
    ov.flash(inv(30.25, 30.55, t) ** 2);
    return skin;
  }],
  // S7a — back to normal size: a bright bathroom (props only), the shower running
  [30.55, 32.75, (t) => {
    bath.update(t);
    shoot(t, [[30.55, [0.6, 3.9, 6.6, -0.4, 2.7, -3.2, 66]], [32.75, [0.2, 3.7, 5.2, -0.8, 2.6, -3.2, 62]]]);
    ov.flash((1 - inv(30.55, 30.95, t)) * 1.0);
    return bath;
  }],
  // S7b — "mandilah dengan lembut" mild soap close-up with foam bubbles
  [32.75, 34.95, (t) => {
    bath.update(t);
    const s = bath.soapSpot;
    shoot(t, [[32.75, [s.x + 1.5, s.y + 1.0, s.z + 2.3, s.x - 0.1, s.y + 0.3, s.z, 40]], [34.95, [s.x + 0.6, s.y + 0.85, s.z + 2.2, s.x - 0.2, s.y + 0.35, s.z, 38]]]);
    const q = pop(t, 33.36, 34.9);
    ov.bubble('lembut', 'MANDI DENGAN\nLEMBUT', { x: W / 2, y: 420, o: q.o, s: q.s }, { size: 100, top: '#bff4ff', bot: '#1fb6e8' });
    const sp = scr(V(s.x, s.y + 0.6, s.z));
    ov.sparkles(t, { n: 8, seed: 71, x: sp.x - 180, y: sp.y - 200, w: 360, h: 260, size: 24, a: 0.7, colors: ['#ffffff', '#bff4ff', '#ffd84a'] });
    return bath;
  }],
  // S7c — "Bilas, lap kering dan pakai baju bersih." checklist across the room
  [34.95, 38.02, (t) => {
    bath.update(t);
    const h = bath.headPos;
    shoot(t, [
      [34.95, [-1.3, 3.5, 2.4, h.x, 2.7, h.z + 0.2, 50]],
      [35.55, [-1.1, 3.4, 2.2, h.x, 2.6, h.z + 0.2, 50]],
      [36.05, [1.4, 3.1, 2.4, 4.3, 2.7, 0, 46]],
      [36.75, [1.5, 3.0, 2.6, 4.3, 2.6, 0, 46]],
      [37.2, [1.0, 3.0, 4.6, 3.0, 1.55, 1.2, 44]],
      [38.02, [1.3, 2.9, 4.3, 3.0, 1.6, 1.2, 42]],
    ]);
    const rows = [['BILAS BERSIH', 34.98, CYAN], ['LAP KERING', 35.76, YELLOW], ['BAJU BERSIH', 37.14, PEACH]];
    rows.forEach(([txt, a, c], i) => {
      const q = pop(t, a, 38.0);
      const y = 300 + i * 112;
      ov.html('ck' + i, SVG.check(), { x: 270, y, o: q.o, s: q.s * 0.85 });
      ov.tag('row' + i, txt, { x: 330, y, o: q.o, s: q.s, ax: 0 }, { bg: c, small: false });
    });
    return bath;
  }],
  // S8 — "Haa, sekarang Affan dah segar." living room, thumbs-up, then "what next?"
  [38.02, 42.3, (t) => {
    living.motes.userData.update(t);
    living.aff.root.position.set(0, 0, -0.6);
    const hop = t > 38.04 && t < 38.5 ? Math.sin(((t - 38.04) / 0.46) * Math.PI) * 0.35 : 0;
    const th = keys(t, [[38.5, 0], [38.85, 1], [40.2, 1], [40.5, 0]]);
    const tk = keys(t, [[40.5, 0], [40.85, 1], [42.3, 1]]);
    const up = POSES.thumbsUpR.armR, th2 = POSES.thinkR.armR;
    const rest = [-0.6, 0.25, 0.1];
    let armR = { reach: rest, pole: [-1, -0.4, -0.5] };
    if (th > 0) armR = { reach: rest.map((r, i) => lerp(r, up.reach[i], th)), pole: up.pole, thumb: th, wy: up.wy * th, wx: up.wx * th };
    else if (tk > 0) armR = { reach: rest.map((r, i) => lerp(r, th2.reach[i], tk)), pole: th2.pole, point: tk, wx: th2.wx * tk };
    affPose(living.aff, t, 10, {
      bob: hop, smile: 1, brow: 0.6 + 0.4 * tk, wow: 0, headYaw: 0.05 * wobble(t, 3), headRoll: -0.1 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.06 * tk,
      legL: { x: -0.25 * hop, knee: 0.6 * hop }, legR: { x: -0.25 * hop, knee: 0.6 * hop },
      armL: hop > 0.01 ? { reach: [0.85, 1.9, 0.3], pole: [1, -0.4, -0.5] } : { reach: [0.6, 0.3, 0.1], pole: [1, -0.2, -1] },
      armR: hop > 0.01 ? { reach: [-0.85, 1.9, 0.3], pole: [-1, -0.4, -0.5] } : armR,
    });
    shoot(t, [[38.02, [0.4, 2.65, 6.6, 0, 2.2, -0.6, 42]], [42.3, [0.2, 2.6, 5.4, 0, 2.3, -0.6, 42]]]);
    ov.flash((1 - inv(38.02, 38.3, t)) * 0.6, '235,250,255');
    const s = pop(t, 39.86, 40.45, { from: 1.8 });
    ov.bubble('segar', 'SEGAR!', { x: W / 2, y: 420, o: s.o, s: s.s, r: -3 }, { size: 150 });
    ov.sparkles(t, { n: 22, seed: 81, x: 160, y: 520, w: 760, h: 900, size: 30, a: inv(38.1, 38.5, t) * (1 - inv(40.3, 40.6, t)) });
    if (th > 0.5) {
      const hand = scr(living.aff.parts.arms.R.hand.getWorldPosition(V(0, 0, 0)));
      ov.sparkles(t, { n: 10, seed: 82, x: hand.x - 140, y: hand.y - 180, w: 280, h: 260, size: 28, a: inv(38.9, 39.2, t) });
    }
    const head = scr(V(0, 3.6, -0.6));
    [[40.6, -260, -170, '#ffcf33', -12], [40.9, 250, -230, '#3fa2ff', 10], [41.2, 300, -20, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, 42.25);
      ov.html('lq' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    return living;
  }],
  // Outro — The Curious Affan logo + "Little Questions. Big Discoveries!"
  [42.3, DURATION, (t) => {
    const k = easeOut(inv(42.3, 43.0, t));
    outro.aff.root.position.set(0, 0, 0);
    outro.aff.pose({ ...POSES.thumbsUpR, smile: 1, blink: blinkAt(t, 9), headRoll: -0.06, headYaw: 0.08, lookY: 0.05 });
    lookCam(V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    outro.bubbles.forEach((b, i) => {
      b.material.uniforms.uT.value = t;
      const ph = (t * 0.12 + i / 10) % 1;
      b.scale.setScalar(0.18 + (i % 3) * 0.1);
      b.position.set(-2.4 + ((i * 0.37) % 1) * 4.8, -0.5 + ph * 6, -1.5 - (i % 2));
    });
    const hc = scr(V(0, 2.95, 0));
    ov.flash((1 - inv(42.3, 42.65, t)) * 1.0);
    const g = ov.g;
    const ra = inv(42.4, 43.0, t);
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
    const ic = pop(t, 42.9, 99);
    ov.html('oBulb', ICONS.bulb(), { x: 130, y: 330 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.5, r: -10 });
    ov.html('oDrop', SVG.drop(), { x: 955, y: 320 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.65, r: 12 });
    const l1 = pop(t, 42.6, 99), l2 = pop(t, 42.8, 99), l3 = pop(t, 43.0, 99);
    drawLogo(ov, { y: 1040, k: [l1, l2, l3], star: pop(t, 43.2, 99) });
    const tg = pop(t, 43.5, 99);
    ov.html('tagline', `<div style="font-family:'Baloo 2';font-weight:800;font-size:50px;color:#fff;background:${NAVY};padding:12px 34px 16px;border-radius:999px;box-shadow:0 0 0 6px #fff,0 10px 0 rgba(0,0,0,0.2);white-space:nowrap">Little Questions. <span style="color:#ffd84a">Big Discoveries!</span></div>`, { x: W / 2, y: 1545, o: tg.o, s: tg.s * 0.92 });
    return outro;
  }],
];

function frame(t) {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  // reset per-shot state
  park.aff.root.scale.setScalar(1);
  park.motes.userData.update(t);
  skin.update(t);
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  const world = shot[2](t);
  if (world.sky) world.sky.position.copy(cam.position);
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(0.28);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan amazed with his magnifying glass in the
// sunny park, soap bubbles and friendly bacteria around, big title, episode
// badge and series logo. Key elements stay inside the centre 3:4 area.
const THUMB = { cam: [0.25, 2.85, 5.8], look: [-0.2, 2.72, 0], fov: 42 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 6.9;
  park.aff.root.position.set(0, 0, 0);
  park.aff.root.scale.setScalar(1);
  park.mag.visible = true;
  park.mag.scale.setScalar(1);
  for (const s of park.sweat) {
    s.d.scale.setScalar(1.15);
    s.d.position.y = s.y;
  }
  park.ball.position.set(1.6, 0.32, 1.2);
  park.aff.pose({
    blink: 0, talk: 0, wow: 0.9, brow: 1.2, smile: 1, headYaw: -0.12, headRoll: 0.08, lookX: -0.35, lookY: 0.15,
    armR: magArm([-0.78, 1.5, 0.62]),
    armL: { reach: [0.9, 1.75, 0.4], pole: [1, -0.4, -0.5] },
  });
  aimMag(park.aff, V(0.15, 0, 1));
  lookCam(V(...THUMB.cam), V(...THUMB.look), THUMB.fov);
  // a few soap bubbles in the park for the cover
  const extra = [];
  for (const [x, y, z, r] of [[-1.6, 3.6, -0.6, 0.38], [1.5, 3.9, -0.4, 0.3], [-1.2, 2.0, 0.4, 0.22], [1.25, 2.3, 0.6, 0.18], [-0.4, 4.3, -1.2, 0.2]]) {
    const b = skin.bubbles[0].clone();
    b.material = skin.bubbles[0].material.clone();
    b.material.uniforms.uT.value = 1.3;
    b.visible = true;
    b.position.set(x, y, z);
    b.scale.setScalar(r);
    park.scene.add(b);
    extra.push(b);
  }
  park.motes.userData.update(t);
  park.sky.position.copy(cam.position);
  renderer.render(park.scene, cam);
  extra.forEach((b) => park.scene.remove(b));
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 760);
  top.addColorStop(0, 'rgba(10,40,110,0.7)');
  top.addColorStop(1, 'rgba(10,40,110,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 760);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(8,12,44,0)');
  bot.addColorStop(1, 'rgba(8,12,44,0.78)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.25);
  ov.tag('thBadge', 'EPISOD 7', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'KENAPA KITA\nKENA MANDI?', { x: W / 2, y: 478, r: -2 }, { size: 116 });
  ov.html('thBug1', SVG.bug('#7ee08a'), { x: 140, y: 1160, r: -14, s: 0.85 });
  ov.html('thBug2', SVG.bug('#b9a2ff'), { x: 945, y: 1230, r: 12, s: 0.7 });
  ov.html('thDrop', SVG.drop(), { x: 930, y: 700, r: 14, s: 0.8 });
  ov.sparkles(1.3, { n: 14, seed: 17, x: 120, y: 620, w: 840, h: 600, size: 26 });
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
