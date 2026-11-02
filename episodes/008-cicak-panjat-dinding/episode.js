// THE CURIOUS AFFAN — Episode 008: "Kenapa Cicak Boleh Panjat Dinding Tanpa Jatuh?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.flac.
//
// Science shown (dry adhesion): toe pads carry lamellae covered in setae
// (hair-like stalks). Each seta branches into tiny flat spatulae. When the
// spatulae touch a surface very closely, weak attractions between molecules
// (van der Waals forces) pull a little at each tip; millions of tips together
// make a strong grip. The gecko lets go by curling its toes up from the tips,
// peeling the setae off at an angle, like peeling a sticker. No glue, no
// suction cups, no magnets.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { placeOnSurface } from '../../shared/gecko.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildRoom, buildMicro, buildToe, buildOutro, MICRO } from './worlds.js';

const FPS = 30;
const DURATION = 47.4;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const room = buildRoom();
const micro = buildMicro();
const toe = buildToe();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 400);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p, c = cam) => toScreen(p, c);
function lookCam(pos, look, fov = 50, up = null) {
  cam.position.copy(pos);
  cam.up.copy(up || V(0, 1, 0));
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(look);
  cam.updateMatrixWorld(true);
}

const CYAN = '#1fb6e8', NAVY = '#1c2752', PEACH = '#ff9470', YELLOW = '#ffc928', GREEN = '#3fae6a', RED = '#ff4d5e';

// ------------------------------------------------------------- room actors
const AFF_POS = V(1.4, 0, 0.6);
// The ceiling gecko walks slowly towards the lamp (where the insects are).
const CEIL_START = V(3.3, room.ceil, 3.3);
const CEIL_DIR = V(-1, 0, -0.12).normalize();
// walks, pauses (feet planted) for the toe close-up, then walks on
const ceilD = (t) => 0.2 * Math.min(t, 5.3) + 0.2 * Math.max(0, t - 8.6);
const ceilPlant = (t) => (t >= 5.3 && t < 8.6 ? 1 : 0);
function ceilingGecko(t, extra = {}) {
  const g = room.gecko;
  g.root.scale.setScalar(0.85);
  const D = ceilD(t);
  placeOnSurface(g.root, CEIL_START.clone().addScaledVector(CEIL_DIR, D * 0.85), V(0, -1, 0), CEIL_DIR);
  g.update({ D, plant: ceilPlant(t), headYaw: 0.15 * Math.sin(t * 0.9), ...extra });
  g.root.updateMatrixWorld(true);
}
// The wall gecko climbs the back wall, left of Affan, below the clock.
function wallGecko(t, t0) {
  const g = room.gecko;
  g.root.scale.setScalar(1.05);
  const D = 0.24 * Math.max(0, t - t0);
  const dir = V(0.12, 1, 0).normalize();
  placeOnSurface(g.root, V(-0.3, 3.0, -8.995).addScaledVector(dir, D * 1.05), V(0, 0, 1), dir);
  g.update({ D, headYaw: -0.25 + 0.1 * Math.sin(t * 1.3) });
  g.root.updateMatrixWorld(true);
}
const geckoHead = () => room.gecko.head.getWorldPosition(V(0, 0, 0));
const geckoMid = () => room.gecko.rig.localToWorld(V(-0.05, 0.04, 0));
function roomAffan(t, p = {}) {
  room.aff.root.position.copy(AFF_POS);
  room.aff.root.scale.setScalar(1);
  room.aff.pose({ yaw: 0, blink: blinkAt(t, 1), talk: talk(t), smile: 0.8, ...p });
  room.aff.root.updateMatrixWorld(true);
}
const affHead = (a = room.aff) => a.parts.head.getWorldPosition(V(0, 0, 0));
const affHand = (a = room.aff, s = 'R') => a.parts.arms[s].hand.getWorldPosition(V(0, 0, 0));

// magnifier held in the right hand: handle along the fist, lens out front
function holdMagnifier(mag, on, s = 1) {
  mag.group.visible = on;
  mag.group.position.set(0, -0.12, 0.08);
  mag.group.rotation.set(-1.45, 0, 0);
  mag.group.scale.setScalar(s);
}

// ---------------------------------------------------------- overlay pieces
const SVG = {
  glue: () => `<svg width="200" height="240" viewBox="0 0 200 240">
    <path d="M85 8 L115 8 L112 52 L88 52 Z" fill="#ff9470" stroke="#17256b" stroke-width="9" stroke-linejoin="round"/>
    <rect x="62" y="50" width="76" height="26" rx="8" fill="#ff9470" stroke="#17256b" stroke-width="9"/>
    <path d="M45 82 Q45 70 60 70 L140 70 Q155 70 155 82 L160 215 Q160 232 142 232 L58 232 Q40 232 40 215 Z" fill="#ffffff" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/>
    <rect x="52" y="118" width="96" height="62" rx="10" fill="#1fb6e8"/>
    <text x="100" y="163" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="40" fill="#fff">GAM</text>
    <path d="M100 2 Q112 -20 104 -34" fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round" opacity="0.9"/></svg>`,
  magnet: () => `<svg width="220" height="220" viewBox="0 0 220 220">
    <path d="M40 30 L90 30 L90 120 Q90 150 110 150 Q130 150 130 120 L130 30 L180 30 L180 120 Q180 200 110 200 Q40 200 40 120 Z" fill="#ff4d5e" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/>
    <rect x="40" y="30" width="50" height="34" fill="#e8eefc" stroke="#17256b" stroke-width="10"/>
    <rect x="130" y="30" width="50" height="34" fill="#e8eefc" stroke="#17256b" stroke-width="10"/></svg>`,
  check: () => `<svg width="200" height="200" viewBox="0 0 200 200"><path d="M35 105 L82 150 L168 52" fill="none" stroke="#fff" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/><path d="M35 105 L82 150 L168 52" fill="none" stroke="#3fae6a" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  setae: () => `<svg width="220" height="200" viewBox="0 0 220 200"><rect x="10" y="150" width="200" height="34" rx="14" fill="#ff9470" stroke="#17256b" stroke-width="9"/>
    ${[40, 80, 120, 160].map((x) => `<path d="M${x} 152 Q${x + 6} 100 ${x + 14} 60" fill="none" stroke="#17256b" stroke-width="14" stroke-linecap="round"/><path d="M${x} 152 Q${x + 6} 100 ${x + 14} 60" fill="none" stroke="#bff0ff" stroke-width="7" stroke-linecap="round"/>
    ${[-14, 0, 14].map((d) => `<line x1="${x + 14}" y1="60" x2="${x + 14 + d}" y2="36" stroke="#17256b" stroke-width="6" stroke-linecap="round"/><circle cx="${x + 14 + d}" cy="34" r="6" fill="#ffc928" stroke="#17256b" stroke-width="3"/>`).join('')}`).join('')}</svg>`,
  sticker: (k) => {
    // a star sticker peeled from its corner by amount k (0..1)
    const f = 30 + 70 * k;
    return `<svg width="240" height="240" viewBox="0 0 240 240">
      <rect x="20" y="20" width="200" height="200" rx="26" fill="#e8f7ff" stroke="#17256b" stroke-width="8" stroke-dasharray="14 10"/>
      <clipPath id="stk"><path d="M20 20 H220 V${220 - f} L${220 - f} 220 H20 Z"/></clipPath>
      <g clip-path="url(#stk)"><rect x="30" y="30" width="180" height="180" rx="24" fill="#ffc928" stroke="#17256b" stroke-width="8"/>
      <path d="M120 62 L136 102 L178 104 L145 130 L157 170 L120 147 L83 170 L95 130 L62 104 L104 102 Z" fill="#ff9470" stroke="#17256b" stroke-width="6" stroke-linejoin="round"/></g>
      <path d="M${210 - f} 210 L210 ${210 - f} Q${215 - f * 0.4} ${215 - f * 0.4} ${210 - f * 0.9} ${210 - f * 0.9} Z" fill="#fff3c0" stroke="#17256b" stroke-width="7" stroke-linejoin="round"/>
      <path d="M${200 - f * 0.9} ${200 - f * 0.9} l -26 -26 m 0 0 l 4 18 m -4 -18 l 18 4" fill="none" stroke="#17256b" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  },
  arrowR: () => `<svg width="70" height="40" viewBox="0 0 70 40"><path d="M6 20 H52 M38 6 L56 20 L38 34" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

function hookTitle(t) {
  const p = pop(t, 0.12, 1.98, { fin: 0.45 });
  const fl = Math.sin(t * 3) * 6;
  ov.bubble('hook', 'KENAPA CICAK\nTAK JATUH?', { x: W / 2, y: 430 + fl, o: p.o, s: p.s }, { size: 108 });
  const q = pop(t, 0.45, 1.98);
  ov.tag('ep', 'EPISOD 8', { x: W / 2, y: 280, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
}

function pinTag(id, text, p, t, a, b, style, dy = -90) {
  const q = pop(t, a, b);
  if (q.o <= 0 || !p.visible) return;
  ov.tag(id, text, { x: clamp(p.x, 190, 890), y: clamp(p.y + dy, 300, 1360), o: q.o, s: q.s }, style);
}

// soft highlight ring around a screen point
function ring(p, r, a, color = '#7fe3ff', t = 0) {
  if (a <= 0 || !p.visible) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = clamp(a);
  g.strokeStyle = color;
  g.shadowColor = color;
  g.shadowBlur = 24;
  g.lineWidth = 8;
  g.setLineDash([22, 14]);
  g.lineDashOffset = -t * 60;
  g.beginPath();
  g.arc(p.x, p.y, r, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

// Inset diagram: weak attraction between the molecules of a spatula tip and of the wall.
function attractionInset(t, cx, cy, R, a) {
  if (a <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = clamp(a);
  g.translate(cx, cy);
  g.scale(0.6 + 0.4 * easeOut(clamp(a)), 0.6 + 0.4 * easeOut(clamp(a)));
  g.fillStyle = 'rgba(10,30,80,0.92)';
  g.beginPath();
  g.arc(0, 0, R, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.clip();
  // wall (ceiling) on top — the gecko hangs below it
  g.fillStyle = '#d9e6f5';
  g.fillRect(-R, -R, 2 * R, R * 0.62);
  for (let i = -6; i <= 6; i++) {
    g.fillStyle = '#7fd0f0';
    g.strokeStyle = NAVY;
    g.lineWidth = 4;
    g.beginPath();
    g.arc(i * 38, -R * 0.38 + 18, 16, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  // spatula tip below, very close to the wall
  const sy = R * 0.2;
  g.fillStyle = '#ffd98a';
  g.strokeStyle = NAVY;
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(-R * 0.85, sy + 70);
  g.quadraticCurveTo(-R * 0.6, sy - 4, -R * 0.2, sy - 4);
  g.lineTo(R * 0.2, sy - 4);
  g.quadraticCurveTo(R * 0.6, sy - 4, R * 0.85, sy + 70);
  g.lineTo(R * 0.85, R);
  g.lineTo(-R * 0.85, R);
  g.closePath();
  g.fill();
  g.stroke();
  for (let i = -4; i <= 4; i++) {
    g.fillStyle = '#ff9470';
    g.beginPath();
    g.arc(i * 38, sy + 14, 15, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  // gentle pulses of attraction between neighbouring molecules (not sparks)
  const top = -R * 0.38 + 34, bot = sy - 2;
  for (let i = -4; i <= 4; i++) {
    const x = i * 38;
    const ph = (t * 1.6 + i * 0.13) % 1;
    for (let k = 0; k < 3; k++) {
      const y = lerp(bot, top, (k + 0.5) / 3);
      g.fillStyle = `rgba(255,236,140,${0.35 + 0.65 * Math.sin((ph + k / 3) * Math.PI) ** 2})`;
      g.beginPath();
      g.arc(x, y, 4.5, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.restore();
  g.lineWidth = 12;
  g.strokeStyle = '#ffffff';
  g.beginPath();
  g.arc(0, 0, R, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 5;
  g.strokeStyle = CYAN;
  g.stroke();
  g.restore();
}

// Inset diagram: setae peel off at an angle as the toe curls up (front moves tip -> base).
function peelInset(t, k, cx, cy, w, h, a) {
  if (a <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = clamp(a);
  g.translate(cx - w / 2, cy - h / 2);
  g.fillStyle = 'rgba(10,30,80,0.9)';
  g.strokeStyle = '#fff';
  g.lineWidth = 10;
  g.beginPath();
  g.roundRect(0, 0, w, h, 34);
  g.fill();
  g.stroke();
  g.save();
  g.beginPath();
  g.roundRect(6, 6, w - 12, h - 12, 30);
  g.clip();
  // wall at the bottom
  const wy = h - 70;
  g.fillStyle = '#d9e6f5';
  g.fillRect(0, wy, w, 70);
  const n = 11;
  const front = lerp(w + 60, -60, k); // peel front x
  // toe skin bar: flat on the left of the front, curling up on the right
  const pts = [];
  for (let x = 20; x <= w - 20; x += 8) {
    const lift = Math.min(150, Math.max(0, x - front));
    pts.push([x, 70 - 0.0028 * lift * lift - 0.25 * lift]);
  }
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = 50 + i * ((w - 100) / (n - 1));
    const lift = Math.min(150, Math.max(0, x - front));
    const baseY = 70 - 0.0028 * lift * lift - 0.25 * lift + 18;
    const off = clamp(lift / 50);
    const tipX = x + 34 + off * 40;
    const tipY = lerp(wy - 2, baseY + 40, off);
    g.strokeStyle = NAVY;
    g.lineWidth = 12;
    g.beginPath();
    g.moveTo(x, baseY);
    g.quadraticCurveTo(x + 4, (baseY + tipY) / 2, tipX, tipY);
    g.stroke();
    g.strokeStyle = '#bff0ff';
    g.lineWidth = 6;
    g.stroke();
    // contact glow at the tip while attached
    const on = 1 - off;
    if (on > 0.02) {
      g.fillStyle = `rgba(255,230,120,${on})`;
      g.shadowColor = '#ffe27a';
      g.shadowBlur = 18;
      g.beginPath();
      g.arc(tipX, wy - 2, 9, 0, Math.PI * 2);
      g.fill();
      g.shadowBlur = 0;
    }
  }
  g.strokeStyle = NAVY;
  g.lineWidth = 40;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
  g.strokeStyle = '#ff9470';
  g.lineWidth = 28;
  g.stroke();
  g.restore();
  g.restore();
}

// "CENGKAMAN" meter that fills as more tips join in
function gripMeter(t, k, a) {
  if (a <= 0) return;
  const g = ov.g;
  const x = 160, y = 1235, w = 760, h = 64;
  g.save();
  g.globalAlpha = clamp(a);
  g.fillStyle = 'rgba(10,20,60,0.75)';
  g.beginPath();
  g.roundRect(x - 10, y - 10, w + 20, h + 20, 42);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.roundRect(x, y, w, h, 32);
  g.fill();
  const gr = g.createLinearGradient(x, 0, x + w, 0);
  gr.addColorStop(0, '#7fe3ff');
  gr.addColorStop(0.6, '#ffc928');
  gr.addColorStop(1, '#ff7a45');
  g.fillStyle = gr;
  g.beginPath();
  g.roundRect(x + 6, y + 6, Math.max(52, (w - 12) * clamp(k)), h - 12, 26);
  g.fill();
  g.restore();
}

// ======================================================================= SHOTS
const contactsOff = () => {
  micro.contactMat.uniforms.uOn.value = 0;
  micro.contactMat.uniforms.uFocus.value = 0;
};
function microAffan(t, p = {}) {
  const a = micro.aff;
  a.root.position.set(0, 0, 0);
  a.root.scale.setScalar(1);
  a.pose({ blink: blinkAt(t, 2), talk: talk(t), smile: 0.9, ...p });
  holdMagnifier(micro.mag, p.mag ?? false);
}

const SHOTS = [
  // S1a — hook: gecko walking upside down on the ceiling (seen from below)
  [0, 2.0, (t) => {
    ceilingGecko(t);
    roomAffan(t, { headPitch: -0.45, lookY: 0.8 });
    const gp = geckoMid();
    const k = easeOut(inv(0, 2.0, t));
    lookCam(V(gp.x + 0.1, room.ceil - lerp(1.35, 1.1, k), gp.z + lerp(0.9, 0.75, k)), V(gp.x - 0.05, room.ceil, gp.z - 0.05), 50);
    hookTitle(t);
    return room;
  }],
  // S1b — "Cicak tu jalan terbalik atas siling!": Affan points up at it
  [2.0, 3.6, (t) => {
    ceilingGecko(t);
    const pt = keys(t, [[2.0, 0.3], [2.3, 1], [3.6, 1]]);
    const wow = keys(t, [[2.0, 0.7], [2.4, 0]]);
    roomAffan(t, {
      yaw: -0.3, headPitch: -0.5, headYaw: 0.45, lookY: 0.9, lookX: 0.1, brow: 0.9, wow, smile: 0.9,
      armR: { reach: [lerp(-0.55, -0.42, pt), lerp(0.3, 2.05, pt), lerp(0.1, 0.25, pt)], point: pt, pole: [-1, -0.4, -0.5] },
    });
    const k = easeInOut(inv(1.25, 3.6, t));
    // three-quarter view: Affan below, looking up at the gecko on the ceiling
    const gq = geckoMid(), hd = affHead();
    const cp = V(lerp(-7.6, -7.0, k), lerp(3.0, 3.2, k), lerp(6.8, 6.4, k));
    const dirH = hd.clone().sub(cp).normalize(), dirG = gq.clone().sub(cp).normalize();
    lookCam(cp, cp.clone().addScaledVector(dirH, 0.6).addScaledVector(dirG, 0.4), 55);
    const gp = scr(geckoMid());
    ring(gp, 80, inv(2.1, 2.4, t), '#ffc928', t);
    const cq = pop(t, 2.15, 3.55);
    if (gp.visible) ov.tag('cicak', 'CICAK', { x: clamp(gp.x, 190, 890), y: Math.max(260, gp.y - 115), o: cq.o, s: cq.s }, { bg: PEACH, pointer: 'down', small: true });
    const tb = pop(t, 2.5, 3.55);
    ov.tag('terbalik', 'TERBALIK!', { x: clamp(gp.x + 40, 260, 820), y: clamp(gp.y + 125, 300, 1300), o: tb.o, s: tb.s, r: -4 }, { bg: '#2f7bff', small: true });
    return room;
  }],
  // S1c — "Kenapa dia tak jatuh?": puzzled close-up, question marks
  [3.6, 5.3, (t) => {
    ceilingGecko(t);
    const th = POSES.thinkR.armR;
    const k0 = keys(t, [[3.6, 0], [3.95, 1]]);
    roomAffan(t, {
      yaw: -0.1, headPitch: -0.32, headRoll: -0.12 * k0, lookY: 0.75, lookX: 0.3, brow: 0.5 + 0.5 * k0, smile: 0.45,
      armR: { reach: [lerp(-0.55, th.reach[0], k0), lerp(0.3, th.reach[1], k0), lerp(0.1, th.reach[2], k0)], pole: th.pole, point: k0, wx: th.wx * k0 },
    });
    const k = easeOut(inv(3.6, 5.3, t));
    const h = affHead();
    lookCam(V(h.x + 0.5, h.y - lerp(0.9, 1.0, k), h.z + lerp(4.6, 4.0, k)), V(h.x - 0.1, h.y + 0.6, h.z), 50);
    [[3.85, -280, -330, '#ffcf33', -12], [4.2, 270, -380, '#3fa2ff', 10], [4.55, 330, -150, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, 5.25);
      ov.html('q' + i, ICONS.qmark(c), { x: W / 2 + dx, y: 980 + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    const b = pop(t, 4.4, 5.25);
    ov.bubble('takjatuh', 'TAK JATUH?', { x: W / 2, y: 360, o: b.o, s: b.s, r: -3 }, { size: 112, top: '#bfe8ff', bot: '#3fa2ff' });
    return room;
  }],
  // S1d — "Kaki dia ada gam ke?": the toe pads, close, from below — and a glue bottle with "?"
  [5.3, 7.0, (t) => {
    ceilingGecko(t);
    roomAffan(t);
    const g = room.gecko;
    const foot = g.legs[0].foot.getWorldPosition(V(0, 0, 0));
    const body = geckoMid();
    const out = V(foot.x - body.x, 0, foot.z - body.z).normalize();
    const k = easeInOut(inv(5.3, 7.0, t));
    lookCam(V(foot.x + out.x * lerp(0.2, 0.14, k), room.ceil - lerp(0.3, 0.22, k), foot.z + out.z * lerp(0.2, 0.14, k)), V(foot.x + out.x * 0.02, room.ceil, foot.z + out.z * 0.02), 45);
    ring(scr(foot), 230, inv(5.45, 5.75, t), '#ffc928', t);
    const q = pop(t, 6.1, 6.95);
    ov.html('glue', SVG.glue(), { x: 790, y: 1040 + Math.sin(t * 4) * 8, o: q.o, s: q.s * 0.95, r: 10 });
    ov.html('glueQ', ICONS.qmark('#ffcf33'), { x: 930, y: 900, o: q.o, s: q.s * 0.6, r: 14 });
    const tg = pop(t, 6.15, 6.95);
    ov.tag('gamq', 'GAM?', { x: 300, y: 380, o: tg.o, s: tg.s, r: -4 }, { bg: PEACH });
    return room;
  }],
  // S2a — "Jom Affan siasat!": the magnifying glass comes out
  [7.0, 8.35, (t) => {
    ceilingGecko(t);
    const up = keys(t, [[7.0, 0], [7.35, 1]], easeOut);
    roomAffan(t, {
      yaw: -0.05, smile: 1, brow: 0.7, headPitch: -0.1, lookY: 0.3, bob: 0.1 * Math.max(0, Math.sin((t - 7.5) * 9)) * inv(7.5, 7.6, t),
      armR: { reach: [lerp(-0.55, -0.62, up), lerp(0.3, 1.75, up), lerp(0.1, 0.55, up)], pole: [-1, -0.4, -0.5], wx: -0.3 },
      armL: { reach: [0.6, lerp(0.3, 0.55, up), 0.45], thumb: up },
    });
    holdMagnifier(room.mag, true, lerp(0.4, 1, up));
    const h = affHead();
    const k = easeInOut(inv(7.0, 8.35, t));
    lookCam(V(h.x + 0.4, h.y - 0.6, h.z + lerp(5.6, 5.0, k)), V(h.x - 0.1, h.y - 0.4, h.z), 50);
    const s = pop(t, 7.2, 8.3);
    if (s.o > 0) ov.sparkles(t, { n: 14, seed: 21, x: 520, y: 520, w: 420, h: 420, a: s.o, size: 26 });
    return room;
  }],
  // S2b — shrink! Affan lifts the lens, sparkles swirl, and he shrinks away
  [8.35, 9.7, (t) => {
    ceilingGecko(t);
    const sh = easeIn(inv(8.75, 9.55, t));
    roomAffan(t, {
      yaw: 0, smile: 1, wow: keys(t, [[8.6, 0], [8.85, 0.8]]), brow: 1, headPitch: -0.2, lookY: 0.5,
      armR: { reach: [-0.4, 1.95, 0.6], pole: [-1, -0.4, -0.5], wx: -0.6 },
      armL: { reach: [0.75, 1.55, 0.35], pole: [1, -0.5, -0.4] },
    });
    room.aff.root.scale.setScalar(lerp(1, 0.04, sh));
    holdMagnifier(room.mag, true, 1);
    const k = easeIn(inv(8.35, 9.7, t));
    lookCam(V(AFF_POS.x + 0.3, lerp(2.6, 1.0, k), AFF_POS.z + lerp(6.2, 3.0, k)), V(AFF_POS.x, lerp(2.5, 0.4, k), AFF_POS.z), lerp(50, 40, k));
    const c = scr(room.aff.root.localToWorld(V(0, 2.6, 0)));
    ov.swirl(t, c.x, c.y, inv(8.45, 9.4, t));
    ov.flash(inv(9.35, 9.7, t) ** 2);
    return room;
  }],
  // S3a — "Waaaah!": tiny Affan in a forest of setae on the toe pad
  [9.7, 11.0, (t) => {
    micro.setSlab(99);
    contactsOff();
    microAffan(t, {
      yaw: 0.2, wow: keys(t, [[9.75, 0.2], [9.95, 1], [10.7, 1], [10.95, 0.2]]), brow: 1, smile: 1, headPitch: -0.3, lookY: 0.6,
      armL: { reach: [0.85, 1.85, 0.3], pole: [1, -0.4, -0.5] }, armR: { reach: [-0.85, 1.85, 0.3], pole: [-1, -0.4, -0.5] },
      bob: 0.25 * Math.max(0, Math.sin((t - 9.75) * 7)) * (t < 10.2 ? 1 : 0),
    });
    const k = easeOut(inv(9.7, 11.0, t));
    lookCam(V(lerp(0.4, 0.8, k), lerp(1.0, 1.2, k), lerp(2.7, 3.2, k)), V(0.1, lerp(3.4, 3.9, k), 0), 66);
    ov.flash(1 - inv(9.7, 10.0, t));
    ov.sparkles(t, { n: 22, seed: 31, y: 260, h: 900, a: 0.7 });
    return micro;
  }],
  // S3b — "Tapak kaki cicak ada banyak struktur macam bulu yang sangat halus!"
  [11.0, 15.5, (t) => {
    micro.setSlab(99);
    contactsOff();
    microAffan(t, {
      yaw: keys(t, [[11.0, 0.2], [12.0, 0.9]]), smile: 1, brow: 0.6, headPitch: -0.35, lookY: 0.6, lookX: 0.4,
      armR: { reach: [-0.55, lerp(0.3, 1.95, keys(t, [[12.6, 0], [12.9, 1], [15.0, 1], [15.4, 0]])), 0.45], point: keys(t, [[12.6, 0], [12.9, 1]]), pole: [-1, -0.3, -0.5] },
    });
    const k = easeInOut(inv(11.0, 15.5, t));
    lookCam(V(lerp(0.8, 6.5, k), lerp(1.4, 8.6, k), lerp(3.2, 12.0, k)), V(lerp(0.2, -1.0, k), lerp(3.6, 2.6, k), lerp(0, -4, k)), lerp(64, 54, k));
    const s1 = scr(micro.hero.clone().add(V(0.6, 4.2, 0)));
    pinTag('setae', 'SETAE', s1, t, 12.72, 15.45, { bg: CYAN, pointer: 'down' }, -95);
    const b = pop(t, 13.64, 15.45);
    ov.bubble('bulu', 'BULU SANGAT\nHALUS', { x: W / 2, y: 420, o: b.o, s: b.s, r: -2 }, { size: 104, top: '#d8f6ff', bot: '#4fc3f7' });
    return micro;
  }],
  // S3c — "Hujungnya pula bercabang jadi lebih kecil": up the hero seta to its branching tip
  [15.5, 19.4, (t) => {
    micro.setSlab(99);
    contactsOff();
    microAffan(t, { yaw: 0.8, headPitch: -0.5, lookY: 0.9, smile: 1, wow: keys(t, [[16.7, 0], [16.9, 0.7], [17.6, 0]]) });
    const h = micro.hero;
    const top = h.clone().add(V(0.78, MICRO.tipY - 0.3, 0));
    const k = easeInOut(inv(15.5, 17.4, t));
    const k2 = easeInOut(inv(17.4, 19.4, t));
    const camP = V(h.x + lerp(3.2, 1.9, k) - 0.5 * k2, lerp(2.4, MICRO.tipY - 0.9, k) - 0.2 * k2, h.z + lerp(4.5, 2.4, k) - 0.9 * k2);
    const look = V(lerp(h.x + 0.4, top.x, k), lerp(3.0, top.y + 0.1, k), lerp(h.z, top.z, k));
    lookCam(camP, look, 50);
    const glowK = inv(16.6, 17.1, t);
    micro.heroSpatMat.emissiveIntensity = 0.15 + 1.1 * glowK * (0.8 + 0.2 * Math.sin(t * 8));
    const tipS = scr(micro.heroTips[4]);
    pinTag('cabang', 'BERCABANG', scr(top.clone().add(V(0, 0.15, 0))), t, 16.6, 17.6, { bg: YELLOW, small: true }, 150);
    pinTag('spatula', 'SPATULA', tipS, t, 17.66, 19.35, { bg: YELLOW, pointer: 'down' }, -110);
    const sm = pop(t, 17.96, 19.35);
    ov.tag('kecil', 'LEBIH KECIL', { x: W / 2, y: 1300, o: sm.o, s: sm.s }, { bg: '#2f7bff', small: true });
    return micro;
  }],
  // S4a — "Bila semua tu sentuh dinding, terhasil daya tarikan yang kecil."
  [19.4, 23.65, (t) => {
    micro.heroSpatMat.emissiveIntensity = 0.15;
    const gap = lerp(3.2, 0, easeInOut(inv(19.5, 20.75, t)));
    micro.setSlab(gap);
    micro.contactMat.uniforms.uOn.value = 0;
    micro.contactMat.uniforms.uFocus.value = inv(20.75, 21.2, t);
    micro.aff.root.scale.setScalar(0.0001);
    holdMagnifier(micro.mag, false);
    const h = micro.hero;
    const k = easeInOut(inv(19.4, 23.65, t));
    lookCam(V(h.x + lerp(3.6, 2.8, k), MICRO.tipY - lerp(1.6, 1.25, k), h.z + lerp(5.2, 4.2, k)), V(h.x + 0.6, MICRO.tipY - 0.35, h.z), 50);
    const se = pop(t, 20.5, 21.6);
    ov.tag('sentuh', 'SENTUH!', { x: 300, y: 380, o: se.o, s: se.s, r: -4 }, { bg: '#2f7bff', small: true });
    const ia = inv(21.75, 22.15, t) * (1 - inv(23.45, 23.65, t));
    attractionInset(t, W / 2, 1010, 250, ia);
    const tg = pop(t, 22.18, 23.6);
    ov.tag('daya', 'DAYA TARIKAN', { x: W / 2, y: 690, o: tg.o, s: tg.s }, { bg: YELLOW });
    const sm = pop(t, 23.0, 23.6);
    ov.tag('kecilT', 'kecil', { x: W / 2 + 210, y: 1270, o: sm.o, s: sm.s }, { bg: '#2f7bff', small: true });
    return micro;
  }],
  // S4b — "Tapi bila banyak-banyak bergabung... cengkamannya jadi kuat!"
  [23.65, 28.0, (t) => {
    micro.setSlab(0);
    micro.aff.root.scale.setScalar(0.0001);
    holdMagnifier(micro.mag, false);
    const wave = lerp(0.5, 46, easeIn(inv(24.3, 26.9, t)));
    micro.contactMat.uniforms.uWave.value = wave;
    micro.contactMat.uniforms.uOn.value = 1;
    micro.contactMat.uniforms.uFocus.value = 1;
    const k = easeInOut(inv(23.65, 27.2, t));
    const h = micro.hero;
    lookCam(V(h.x + lerp(2.8, 10, k), MICRO.tipY - lerp(1.25, 1.5, k), h.z + lerp(4.2, 16, k)), V(h.x + lerp(0.6, -4, k), MICRO.tipY - lerp(0.35, 0.1, k), h.z - lerp(0, 10, k)), lerp(50, 60, k));
    const n = Math.round(lerp(1, 1000000, Math.pow(inv(24.3, 26.9, t), 3)));
    const ca = pop(t, 24.6, 27.95);
    ov.html('count', `<div style="font-family:'Baloo 2';font-weight:800;font-size:64px;color:#fff;text-shadow:0 5px 0 #17256b,0 0 18px #1fb6e8;white-space:nowrap">${n.toLocaleString('ms-MY')} ✦</div>`, { x: W / 2, y: 1130, o: ca.o, s: 0.9 + 0.1 * ca.s });
    gripMeter(t, easeOut(inv(24.4, 27.4, t)), inv(24.4, 24.7, t) * (1 - inv(27.8, 28.0, t)));
    const mk = pop(t, 24.4, 27.95);
    ov.html('mLbl', `<div class="tag sm" style="background:${NAVY}">CENGKAMAN</div>`, { x: 300, y: 1190, o: mk.o, s: mk.s });
    const b = pop(t, 27.3, 27.98, { from: 2 });
    ov.bubble('kuat', 'CENGKAMAN\nKUAT!', { x: W / 2, y: 430, o: b.o, s: b.s, r: -3 }, { size: 124, top: '#ffd36b', bot: '#ff7a45' });
    if (t > 27.3) ov.sparkles(t, { n: 26, seed: 44, y: 250, h: 700, a: inv(27.3, 27.5, t) });
    return micro;
  }],
  // S5a — "Eh, macam mana cicak nak lepaskan kaki pula?": tiny Affan beside a giant toe
  [28.0, 31.85, (t) => {
    toe.peel(0);
    const a = toe.aff;
    a.root.position.set(9.5, 0, 5.4);
    a.root.scale.setScalar(1);
    const th = POSES.thinkR.armR;
    const k0 = keys(t, [[29.3, 0], [29.7, 1], [31.5, 1], [31.85, 0.3]]);
    a.pose({
      yaw: -2.5, blink: blinkAt(t, 5), talk: talk(t), smile: 0.5, brow: 0.9, headRoll: -0.12 * k0, headYaw: 0.2, lookX: 0.2,
      armR: { reach: [lerp(-0.55, th.reach[0], k0), lerp(0.3, th.reach[1], k0), lerp(0.1, th.reach[2], k0)], pole: th.pole, point: k0, wx: th.wx * k0 },
    });
    const k = easeInOut(inv(28.0, 31.85, t));
    lookCam(V(lerp(20, 18.5, k), lerp(6.5, 5.8, k), lerp(18, 16.5, k)), V(lerp(4.5, 5.5, k), 2.0, 1.5), 50);
    for (const g of toe.glows) {
      const o = g.contact * (0.85 + 0.15 * Math.sin(t * 5 + g.i));
      g.mesh.material.opacity = 0.8 * o;
      g.halo.material.opacity = 0.85 * o;
    }
    ov.flash((1 - inv(28.0, 28.3, t)) * 0.8, '210,240,255');
    const hd = scr(affHead(a));
    [[29.0, -230, -260, '#ffcf33', -12], [29.4, 200, -300, '#3fa2ff', 10]].forEach(([s, dx, dy, c, r], i) => {
      const q = pop(t, s, 31.8);
      ov.html('tq' + i, ICONS.qmark(c), { x: hd.x + dx, y: hd.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.75, r });
    });
    const lp = pop(t, 30.38, 31.8);
    ov.tag('lepas', 'LEPAS?', { x: 300, y: 380, o: lp.o, s: lp.s, r: -4 }, { bg: GREEN });
    return toe;
  }],
  // S5b — "Dia angkat jarinya macam kita mengupas pelekat!": slow-motion peel
  [31.85, 35.3, (t) => {
    const pk = easeInOut(inv(32.0, 34.7, t));
    const glows = toe.peel(pk);
    for (const g of glows) {
      g.mesh.material.opacity = 0.8 * g.contact;
      g.halo.material.opacity = 0.85 * g.contact;
    }
    const a = toe.aff;
    a.root.position.set(9.5, 0, 5.4);
    a.pose({ yaw: -2.5, blink: blinkAt(t, 6), talk: talk(t), smile: 1, wow: keys(t, [[32.6, 0], [32.9, 0.7], [33.4, 0]]), brow: 0.7, headPitch: -0.25, lookY: 0.4 });
    const k = easeInOut(inv(31.85, 35.3, t));
    lookCam(V(lerp(19, 19, k), lerp(4.2, 6.0, k), lerp(19, 21, k)), V(lerp(2.5, 3.0, k), lerp(3.2, 5.6, k), 0), 50);
    // detach sparkles where lamellae just let go
    for (const g of glows) {
      const just = g.lift > 0.05 && g.lift < 0.7;
      if (just) {
        const p = scr(g.mesh.position);
        ov.star(p.x + Math.sin(g.i * 7) * 30, p.y - 10, 26 * (1 - g.lift / 0.7), 0.9, '#fff6c8', t * 2);
      }
    }
    const tg = pop(t, 32.2, 35.25);
    ov.html('jari', `<div class="tag" style="background:${GREEN};display:flex;align-items:center;gap:14px">JARI DIANGKAT ${SVG.arrowR()} LEPAS!</div>`, { x: W / 2, y: 330, o: tg.o, s: tg.s * 0.92 });
    const slow = pop(t, 31.95, 35.25);
    ov.tag('slow', 'GERAK PERLAHAN', { x: 250, y: 470, o: slow.o * 0.95, s: slow.s }, { bg: NAVY, small: true });
    peelInset(t, pk, W / 2, 1110, 640, 300, inv(32.3, 32.7, t) * (1 - inv(35.1, 35.3, t)));
    const st = pop(t, 33.84, 35.25);
    ov.html('sticker', SVG.sticker(clamp(inv(33.9, 34.8, t))), { x: 850, y: 640, o: st.o, s: st.s * 0.75, r: 8 });
    ov.tag('pelekat', 'PELEKAT', { x: 850, y: 790, o: st.o, s: st.s }, { bg: YELLOW, small: true });
    return toe;
  }],
  // S6 — back to normal size: "Haaa! Bukan gam, bukan magnet!"
  [35.3, 38.45, (t) => {
    ceilingGecko(t);
    const wag = keys(t, [[36.4, 0], [36.65, 1], [38.2, 1], [38.45, 0]]);
    const w = POSES.wagR(t).armR;
    const grow = easeOut(inv(35.3, 35.75, t));
    roomAffan(t, {
      yaw: -0.08, smile: 1, brow: keys(t, [[35.4, 1], [36.4, 0.5]]), headRoll: 0.06 * Math.sin(t * 4) * (t < 36.3 ? 1 : 0), headYaw: wag * 0.14 * Math.sin(t * 8),
      armR: wag > 0 ? { reach: [lerp(-0.55, w.reach[0], wag), lerp(0.3, w.reach[1], wag), lerp(0.1, w.reach[2], wag)], pole: w.pole, point: wag, wz: w.wz * wag } : {},
      armL: { reach: [0.62, 0.62, 0.42] },
    });
    room.aff.root.scale.setScalar(lerp(0.3, 1, grow));
    holdMagnifier(room.mag, false);
    const h = affHead();
    const k = easeOut(inv(35.3, 38.45, t));
    lookCam(V(h.x + 0.3, h.y - 1.0, h.z + lerp(7.2, 6.4, k)), V(h.x, h.y - 1.0, h.z), 50);
    ov.flash((1 - inv(35.3, 35.6, t)) * 0.95);
    if (t < 35.8) ov.swirl(t, W / 2, 960, 1 - inv(35.3, 35.8, t));
    const b = pop(t, 36.54, 38.4);
    ov.bubble('bukangam', 'BUKAN GAM!', { x: W / 2, y: 340, o: b.o, s: b.s, r: -2 }, { size: 120, top: '#ffb3b8', bot: '#ff4d5e' });
    const cards = [['glue', SVG.glue(), 36.86, 210], ['magnet', SVG.magnet(), 37.76, 540], ['setae', SVG.setae(), 38.0, 870]];
    for (const [id, svg, at, x] of cards) {
      const q = pop(t, at, 38.4);
      ov.html('c_' + id, `<div style="width:270px;height:270px;border-radius:44px;background:#fff;box-shadow:0 10px 0 rgba(0,0,0,0.2),0 0 0 8px ${id === 'setae' ? GREEN : RED};display:flex;align-items:center;justify-content:center">${svg}</div>`, { x, y: 1170, o: q.o, s: q.s * 0.85 });
      const x2 = pop(t, at + 0.12, 38.4, { from: 2 });
      ov.html('x_' + id, id === 'setae' ? SVG.check() : ICONS.cross(), { x: x + 75, y: 1250, o: x2.o, s: x2.s * 0.6 });
    }
    return room;
  }],
  // S7a — "Hebatnya kaki cicak!": thumbs-up while the gecko climbs the wall behind
  [38.45, 40.45, (t) => {
    wallGecko(t, 37.5);
    const th = keys(t, [[38.5, 0], [38.85, 1], [40.45, 1]]);
    const up = POSES.thumbsUpR.armR;
    roomAffan(t, {
      yaw: 0.25, smile: 1, brow: 0.6, headYaw: -0.15, lookX: -0.2,
      armR: { reach: [lerp(-0.55, up.reach[0], th), lerp(0.3, up.reach[1], th), lerp(0.1, up.reach[2], th)], pole: up.pole, thumb: th, wy: up.wy * th, wx: up.wx * th },
    });
    room.aff.root.position.set(1.0, 0, -4.6);
    room.aff.pose({ yaw: 0.25, blink: blinkAt(t, 1), talk: talk(t), smile: 1, brow: 0.6, headYaw: -0.15, lookX: -0.2,
      armR: { reach: [lerp(-0.55, up.reach[0], th), lerp(0.3, up.reach[1], th), lerp(0.1, up.reach[2], th)], pole: up.pole, thumb: th, wy: up.wy * th, wx: up.wx * th } });
    room.aff.root.updateMatrixWorld(true);
    const k = easeInOut(inv(38.45, 40.45, t));
    lookCam(V(lerp(0.2, 0.5, k), 2.6, lerp(1.6, 1.0, k)), V(lerp(1.6, 1.7, k), 3.9, -7), 52);
    ov.flash((1 - inv(38.45, 38.7, t)) * 0.5);
    const gp = scr(geckoMid());
    ring(gp, 80, inv(38.6, 38.9, t), '#ffc928', t);
    const hand = scr(affHand());
    if (th > 0.5) ov.sparkles(t, { n: 12, seed: 33, x: hand.x - 160, y: hand.y - 200, w: 320, h: 300, a: inv(38.9, 39.2, t), size: 30 });
    const hb = pop(t, 38.5, 40.4);
    ov.bubble('hebat', 'HEBAT!', { x: W / 2 + 140, y: 380, o: hb.o, s: hb.s, r: 4 }, { size: 130 });
    return room;
  }],
  // S7b — "Apa pula Affan nak siasat lepas ni?"
  [40.45, 42.75, (t) => {
    wallGecko(t, 37.5);
    const tk = keys(t, [[40.45, 0], [40.85, 1]]);
    const th2 = POSES.thinkR.armR;
    room.aff.root.position.set(1.0, 0, -4.6);
    room.aff.root.scale.setScalar(1);
    room.aff.pose({
      yaw: 0.15, blink: blinkAt(t, 3), talk: talk(t), smile: 1, brow: 0.3 + 0.5 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk,
      armR: { reach: [lerp(-0.55, th2.reach[0], tk), lerp(0.3, th2.reach[1], tk), lerp(0.1, th2.reach[2], tk)], pole: th2.pole, point: tk, wx: th2.wx * tk },
    });
    room.aff.root.updateMatrixWorld(true);
    const h = affHead();
    const k = easeInOut(inv(40.45, 42.75, t));
    lookCam(V(h.x + 0.2, h.y - 0.5, h.z + lerp(5.4, 4.6, k)), V(h.x + 0.3, h.y + 0.3, h.z), 50);
    [[40.75, -260, -230, '#ffcf33', -12], [41.05, 250, -280, '#3fa2ff', 10], [41.35, 300, -60, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, 42.7);
      const hp = scr(h);
      ov.html('nq' + i, ICONS.qmark(c), { x: hp.x + dx, y: hp.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    return room;
  }],
  // Outro — logo, tagline; Affan thumbs-up while the gecko climbs across the backdrop
  [42.75, DURATION, (t) => {
    const k = easeOut(inv(42.75, 43.45, t));
    outro.aff.root.position.set(0, 0, 0);
    const up = { reach: [-0.62, 1.42, 0.62], pole: [-1, -0.6, -0.3], wy: -1.2, wx: 0.15 };
    const th = keys(t, [[43.0, 0], [43.4, 1]]);
    outro.aff.pose({ smile: 1, blink: blinkAt(t, 9), headRoll: -0.06, lookX: 0.1, headYaw: 0.06,
      armR: { reach: [lerp(-0.55, up.reach[0], th), lerp(0.3, up.reach[1], th), lerp(0.1, up.reach[2], th)], pole: up.pole, thumb: th, wy: up.wy * th, wx: up.wx * th } });
    const g = outro.gecko;
    const D = 0.26 * (t - 42.75);
    const dir = V(-1, 0.22, 0).normalize();
    placeOnSurface(g.root, V(2.3, 4.55, -3.98).addScaledVector(dir, D * 1.3), V(0, 0, 1), dir);
    g.update({ D, headYaw: 0.15 * Math.sin(t * 1.4) });
    lookCam(V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash((1 - inv(42.75, 43.1, t)) * 1.0);
    const gg = ov.g;
    const ra = inv(42.85, 43.45, t);
    gg.save();
    gg.globalAlpha = ra;
    gg.strokeStyle = '#ffe58a';
    gg.shadowColor = '#fff3b0';
    gg.shadowBlur = 40;
    gg.lineWidth = 14;
    gg.beginPath();
    gg.arc(W / 2, hc.y, 420 * (0.85 + 0.15 * easeOut(ra)), 0, Math.PI * 2);
    gg.stroke();
    gg.restore();
    ov.sparkles(t, { n: 30, seed: 41, y: 260, h: 1150, a: ra });
    const l1 = pop(t, 43.05, 99), l2 = pop(t, 43.25, 99), l3 = pop(t, 43.45, 99);
    drawLogo(ov, { y: 1060, k: [l1, l2, l3], star: pop(t, 43.65, 99) });
    const tl = pop(t, 44.0, 99);
    ov.html('tagline', `<div style="font-family:'Baloo 2';font-weight:800;font-size:58px;color:#fff;white-space:nowrap;padding:10px 34px 14px;border-radius:999px;background:rgba(28,39,82,0.82);box-shadow:0 0 0 6px #ffc928">Little Questions. Big Discoveries!</div>`, { x: W / 2, y: 1555, o: tl.o, s: tl.s * 0.92 });
    return outro;
  }],
];

function frame(t) {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  micro.contactMat.uniforms.uTime.value = t;
  const world = shot[2](t);
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(0.28);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan amazed under the ceiling gecko, with a big
// title, the episode badge and the series logo. No captions. Key elements stay
// inside the centre 3:4 area (y 240-1680) that profile grids show.
const THUMB = { cam: [2.0, 3.6, 7.5], look: [2.0, 3.65, 0], fov: 46 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  // gecko big on the back wall, upper right, climbing; Affan amazed, pointing at it
  const g = room.gecko;
  g.root.scale.setScalar(2.4);
  const dir = V(-0.35, 1, 0).normalize();
  placeOnSurface(g.root, V(4.6, 5.0, -8.99), V(0, 0, 1), dir);
  g.update({ D: 0.05, headYaw: -0.35 });
  room.aff.root.position.copy(AFF_POS);
  room.aff.root.scale.setScalar(1);
  room.aff.pose({
    yaw: 0.1, headPitch: -0.12, headYaw: 0.18, lookY: 0.45, lookX: 0.55, blink: 0, talk: 0, wow: 0.9, brow: 1, smile: 1,
    armL: { reach: [0.62, 2.0, 0.45], point: 1, pole: [1, -0.5, -0.4] },
    armR: { reach: [-0.62, 0.62, 0.42] },
  });
  holdMagnifier(room.mag, false);
  room.aff.root.updateMatrixWorld(true);
  lookCam(V(...THUMB.cam), V(...THUMB.look), THUMB.fov);
  renderer.render(room.scene, cam);
  const gr = ov.g;
  const top = gr.createLinearGradient(0, 0, 0, 700);
  top.addColorStop(0, 'rgba(8,12,44,0.75)');
  top.addColorStop(1, 'rgba(8,12,44,0)');
  gr.fillStyle = top;
  gr.fillRect(0, 0, W, 700);
  const bot = gr.createLinearGradient(0, H - 800, 0, H);
  bot.addColorStop(0, 'rgba(8,12,44,0)');
  bot.addColorStop(1, 'rgba(8,12,44,0.75)');
  gr.fillStyle = bot;
  gr.fillRect(0, H - 800, W, 800);
  ov.vignette(0.28);
  const gp = scr(geckoMid());
  ring(gp, 150, 1, '#ffc928', 0);
  ov.tag('thBadge', 'EPISOD 8', { x: W / 2, y: 290 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'KENAPA CICAK\nTAK JATUH?', { x: W / 2, y: 470, r: -2 }, { size: 120 });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 130, y: 790, r: -14, s: 0.85 });
  ov.html('thGlue', SVG.glue(), { x: 900, y: 1220, r: 10, s: 0.7 });
  ov.html('thX', ICONS.cross(), { x: 950, y: 1285, s: 0.42 });
  drawLogo(ov, { y: 1440, scale: 0.58 });
  ov.end();
}

window.EP = {
  fps: FPS,
  duration: DURATION,
  frame,
  thumbnail,
  ready: (async () => {
    env = await loadEnvelope('./audio/narration.flac', FPS);
    await Promise.all(['800 60px "Baloo 2"', '700 60px "Baloo 2"', '700 60px Fredoka', '600 60px Fredoka'].map((f) => document.fonts.load(f)));
    frame(0);
    return true;
  })(),
};
