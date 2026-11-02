// THE CURIOUS AFFAN — Episode 010: "Kenapa Kita Kena Gosok Gigi?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, wobble, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, bubbleSVG, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildBathroom, buildToothCity, buildOutro } from './worlds.js';

const FPS = 30;
const DURATION = 50.4;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const bath = buildBathroom();
const city = buildToothCity();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 4000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p, c = cam) => toScreen(p, c);
const wpos = (o) => o.getWorldPosition(new THREE.Vector3());

const CYAN = '#18b4e0', NAVY = '#1c2752', PEACH = '#ff8a5c', YELLOW_BUBBLE = { top: '#ffe45c', bot: '#ffb21f' }, CYAN_BUBBLE = { top: '#bff3ff', bot: '#29b6f0' };

function lookCam(c, pos, look, fov = 50, near = 0.05) {
  c.position.copy(pos);
  c.fov = fov;
  c.near = near;
  c.updateProjectionMatrix();
  c.lookAt(look);
  c.updateMatrixWorld(true);
}
// Mirror point of view: the camera sits "inside" the mirror wall. The near
// plane clips the wall and counter-back so we look out at Affan from the mirror.
const MIRROR_Z = 2.12;
function pov(x, y, back, look, fov) {
  lookCam(cam, V(x, y, MIRROR_Z + back), look, fov, back + 0.1);
}

// ------------------------------------------------------------ hand-held props
const _bx = new THREE.Vector3(), _by = new THREE.Vector3(), _bz = new THREE.Vector3(), _bm = new THREE.Matrix4();
// Toothbrush: local +x = handle direction, local -y = bristle direction.
function orientBrush(b, head, handleDir, bristleDir, scale) {
  _bx.copy(handleDir).normalize();
  _by.copy(bristleDir).negate();
  _by.addScaledVector(_bx, -_by.dot(_bx)).normalize();
  _bz.crossVectors(_bx, _by);
  _bm.makeBasis(_bx, _by, _bz);
  b.quaternion.setFromRotationMatrix(_bm);
  b.position.copy(head);
  b.scale.setScalar(scale);
}
// Brush held in a hand: grip at the hand, head pointing towards `target`.
function holdBrush(b, hand, target, bristleDir, scale = 0.105) {
  const dir = hand.clone().sub(target).normalize();
  orientBrush(b, hand.clone().addScaledVector(dir, -b.userData.gripX * scale), dir, bristleDir, scale);
}
// Magnifier: grip at the hand, ring at `ring`, lens facing `facing`.
function holdMag(m, grip, ring, facing) {
  _by.copy(ring).sub(grip);
  const len = _by.length();
  _by.normalize();
  _bz.copy(facing).addScaledVector(_by, -facing.dot(_by)).normalize();
  _bx.crossVectors(_by, _bz);
  _bm.makeBasis(_bx, _by, _bz);
  m.quaternion.setFromRotationMatrix(_bm);
  m.position.copy(grip);
  m.scale.setScalar(len / 0.86);
}

// ------------------------------------------------------------------ bathroom
const A = bath.aff;
function bathState(t, { night = 0 } = {}) {
  bath.nightPane.material.opacity = night;
  bath.hemi.intensity = lerp(1.25, 0.95, night);
  bath.hemi.color.setHex(0xffffff).lerp(new THREE.Color(0xd6dcff), night);
  bath.win.intensity = lerp(0.9, 0.25, night);
  bath.win.color.setHex(0xcfeaff).lerp(new THREE.Color(0x6a78d8), night);
  bath.vanity.intensity = lerp(14, 22, night);
  bath.scene.background.setHex(0xdff3f6);
  bath.brush.visible = true;
  bath.paste.visible = false;
  bath.mag.visible = false;
  bath.ibu.root.visible = false;
  bath.ayah.root.visible = false;
  bath.helper.visible = false;
  bath.pea.position.set(0, -10, 0);
  bath.spit.position.set(0, -10, 0);
  bath.mirror.visible = false;
  for (const o of bath.povHide) o.visible = true;
  A.root.position.set(0, 0.55, 0);
  A.root.rotation.set(0, 0, 0);
  for (const e of A.parts.eyes) e.eye.scale.setScalar(1);
}
function povMode(on) {
  for (const o of bath.povHide) o.visible = !on;
}
// Affan's toothbrush resting in his right hand, bristles up, at his side.
function brushAtRest(t) {
  const hand = wpos(A.parts.arms.R.hand);
  holdBrush(bath.brush, hand, hand.clone().add(V(0.05, 0.6, 0.35)), V(0, 0, 1));
}
// Gentle brushing: small slow circles at the right side of the mouth.
function brushing(t, amp = 1) {
  const ph = t * 2 * Math.PI * 1.7;
  const cx = Math.cos(ph) * 0.03 * amp, cy = Math.sin(ph) * 0.025 * amp;
  return { armR: { reach: [-0.44 + cx, 1.27 + cy, 0.6], pole: [-1, -0.7, -0.3], wx: -0.3 } };
}
function placeBrushing(t) {
  const mouth = wpos(A.parts.mouth);
  const fwd = A.parts.head.getWorldDirection(new THREE.Vector3());
  const right = new THREE.Vector3(-1, 0, 0).applyQuaternion(A.parts.head.getWorldQuaternion(new THREE.Quaternion()));
  const target = mouth.clone().addScaledVector(fwd, 0.07).addScaledVector(right, 0.06);
  holdBrush(bath.brush, wpos(A.parts.arms.R.hand), target, fwd.clone().negate().addScaledVector(right, 0.4));
}
function affPose(t, p = {}, seed = 1) {
  A.pose({ blink: blinkAt(t, seed), talk: talk(t), smile: 0.9, ...p });
}
// Parents: set lean/twist first, then solve hand reach in their torso space.
function parentPose(par, p, reachL, reachR) {
  par.pose({ ...p, armL: {}, armR: {} });
  const armL = reachL ? { reach: par.toTorso(reachL.p), pole: reachL.pole || [0.6, -1, -0.5] } : { z: 0.12, el: -0.25 };
  const armR = reachR ? { reach: par.toTorso(reachR.p), pole: reachR.pole || [-0.6, -1, -0.5] } : { z: -0.12, el: -0.25 };
  par.pose({ ...p, armL, armR });
}

// ---------------------------------------------------------------- tooth city
const C = city;
const brushScale = C.brush.scale.x;
const heroSurf = (lx, ly) => C.surf(lx, ly);
// Precomputed foam spots on the hero tooth face (geometry-space x for clean timing).
const FOAM = (() => {
  const R = rng(55);
  const out = [];
  for (let i = 0; i < C.foam.count; i++) {
    const lx = -3.6 + R() * 7.2, ly = 0.4 + R() * 5.2;
    const s = heroSurf(lx, ly);
    if (!s) continue;
    out.push({ lx, ly, p: s.p.clone().addScaledVector(s.n, 0.1 + R() * 0.35), r: 0.12 + R() * 0.3, ph: R() * 10, late: R() });
  }
  return out;
})();
const SUGAR = C.sugar.map((m, i) => ({ m, b: C.bacteria[(i * 3 + 1) % C.bacteria.length], dx: Math.sin(i * 2.3) * 1.2, dz: Math.cos(i * 1.7) * 1.2, d: i * 0.11 }));
const KEEP = new Set([2, 9, 15]); // a few bacteria stay (brushing never removes every one)

// Brush sweep across the face (geometry-space x of the hero tooth): +5 -> -5.
const SWEEP = [23.3, 24.85];
const cleanX = (t) => lerp(5.2, -5.4, easeInOut(inv(SWEEP[0], SWEEP[1], t)));
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

function cityState(t, { affan = true } = {}) {
  C.heroU.uTime.value = t;
  C.plaqueU.uTime.value = t;
  C.plaqueU.uAmt.value = keys(t, [[6.9, 0.45], [9.2, 1]]);
  const cx = t < SWEEP[0] ? 99 : cleanX(t);
  C.plaqueU.uClean.value = t < SWEEP[0] ? 99 : cx;
  C.heroU.uDemin.value = keys(t, [[17.9, 0], [19.25, 1], [25.6, 1], [28.4, 0.35]]);
  C.heroU.uFluor.value = keys(t, [[25.0, 0], [25.7, 1], [28.2, 1], [28.8, 0.6]]);
  C.updateBubbles(t);
  C.sparkles.userData.update(t);
  C.fluorSparks.userData.update(t, C.heroU.uFluor.value);
  C.aff.root.visible = affan;
  C.mag.visible = false;

  // bacteria: hidden in the plaque until "Dalam plak ada bakteria", then pop out and wiggle
  C.bacteria.forEach((b, i) => {
    const u = b.userData;
    const a = 12.45 + (i % 8) * 0.06;
    let s = t < a ? 0 : easeOut(clamp((t - a) / 0.35)) * (1 + 0.15 * Math.sin(clamp((t - a) / 0.35) * Math.PI));
    const munch = t > 15.5 && t < 16.6 ? 0.12 * Math.abs(Math.sin((t - 15.5) * 14 + i)) : 0;
    b.position.copy(u.home);
    b.quaternion.copy(u.baseQ);
    b.rotateZ(Math.sin(t * 2.2 + u.ph) * 0.35);
    b.rotateY(Math.sin(t * 1.3 + u.ph) * 0.2);
    // swept off by the brush, carried away in the foam
    const off = t > SWEEP[0] && u.lx > cx - 0.6 ? clamp((t - (SWEEP[0] + (1 - inv(-5.4, 5.2, u.lx)) * (SWEEP[1] - SWEEP[0]))) / 0.9) : 0;
    if (t > SWEEP[1] + 0.9 || off > 0) {
      const k = t > SWEEP[1] + 0.9 && !(off > 0) ? 1 : off;
      const kk = easeIn(k);
      b.position.addScaledVector(u.n, kk * (KEEP.has(i) ? 9 : 5)).add(_p.set(0, kk * (KEEP.has(i) ? 5 : 2), -kk * 4 * Math.sign(u.ly - 2.5 || 1)));
      if (KEEP.has(i)) {
        b.position.y += Math.sin(t * 1.5 + i) * 0.3 * k;
        s *= 1;
      } else s *= 1 - easeIn(k);
      b.rotateX(kk * 6);
    }
    const sq = 1 + 0.08 * Math.sin(t * 6 + u.ph) + munch;
    b.scale.set(s * sq, (s / sq) * (1 + munch * 0.5), s);
    b.visible = s > 0.01;
  });

  // sugar cubes float down onto the bacteria, then get eaten
  for (const S of SUGAR) {
    const a = 14.1 + S.d, b1 = 15.45 + S.d;
    if (t < a || t > 16.5 + S.d) {
      S.m.position.set(0, -50, 0);
      continue;
    }
    const k = easeInOut(inv(a, b1, t));
    const home = S.b.userData.home, n = S.b.userData.n;
    const from = home.clone().addScaledVector(n, 3.5).add(_p.set(S.dx, 5.5, S.dz));
    const to = home.clone().addScaledVector(n, 0.45);
    S.m.position.lerpVectors(from, to, k);
    S.m.rotation.set(t * 1.3 + S.d, t * 0.9, t * 0.7);
    S.m.scale.setScalar(Math.max(0.001, 1 - easeIn(inv(b1, 16.4 + S.d, t))) * 0.9);
  }

  // acid droplets made by the bacteria, soaking into the plaque towards the enamel
  let n = 0;
  if (t > 16.5 && t < 22) {
    const live = C.bacteria.filter((b) => b.visible);
    for (let k = 0; k < C.acid.count && live.length; k++) {
      const b = live[k % live.length];
      const birth = 16.5 + ((k * 0.61803) % 1) * 3.2;
      const age = (t - birth) / 1.6;
      if (age < 0 || age > 1) continue;
      const R = rng(k + 7);
      const u = b.userData;
      _p.copy(b.position).add(V((R() - 0.5) * 0.7, (R() - 0.5) * 0.7, (R() - 0.5) * 0.7)).addScaledVector(u.n, 0.25 - age * 0.75);
      const r = (0.06 + R() * 0.07) * Math.sin(Math.PI * Math.min(1, age * 1.4)) * (t > 21 ? 1 - inv(21, 22, t) : 1);
      C.acid.setMatrixAt(n++, _m4.compose(_p, _q.identity(), _s.setScalar(Math.max(0.001, r))));
    }
  }
  C.acid.count = n;
  C.acid.instanceMatrix.needsUpdate = true;

  // foam: appears where the brush has passed, grows into fluoride foam, then fades
  let f = 0;
  if (t > SWEEP[0]) {
    for (const F of FOAM) {
      const passed = F.lx > cx;
      const late = t > 24.9 + F.late * 0.8;
      if (!passed && !late) continue;
      const a0 = passed ? clamp((t - (SWEEP[0] + (1 - inv(-5.4, 5.2, F.lx)) * (SWEEP[1] - SWEEP[0]))) / 0.4) : clamp((t - 24.9 - F.late * 0.8) / 0.4);
      const fade = 1 - inv(28.0 + F.late * 0.4, 28.7, t);
      const r = F.r * easeOut(a0) * fade * (1 + 0.06 * Math.sin(t * 3 + F.ph));
      if (r < 0.01) continue;
      C.foam.setMatrixAt(f++, _m4.compose(_p.copy(F.p).add(V(0, Math.sin(t * 1.2 + F.ph) * 0.05, 0)), _q.identity(), _s.setScalar(r)));
    }
  }
  C.foam.count = f;
  C.foam.instanceMatrix.needsUpdate = true;
  C.brush.position.set(0, -80, 0);
}

// Brush on the tooth face: bristles towards -x (into the tooth), handle up and out.
const BRUSH_TIP_X = -7.2 + 3.6 * 1.25 * 0.97 + 0.35;
function cityBrushAt(z, y, bendZ = 0, lift = 0) {
  const head = V(BRUSH_TIP_X + 1.05 * brushScale + lift, y, z);
  orientBrush(C.brush, head, V(0.45, 1, 0.0), V(-1, 0, 0), brushScale);
  C.brush.userData.bend(0, bendZ);
}
function brushPath(t) {
  const k = easeInOut(inv(SWEEP[0], SWEEP[1], t));
  const ph = (t - SWEEP[0]) * 2 * Math.PI * 1.6;
  const z = lerp(-5.2 * 1.25, 5.4 * 1.25, k) * -1 * -1;
  // gentle small circles while travelling across the face
  return { z: -(lerp(5.2, -5.4, k) * 1.25) + Math.cos(ph) * 0.45, y: 3.4 + Math.sin(ph) * 0.45, bend: -Math.sin(ph) };
}
function cityAffan(t, pos, yaw, p = {}, seed = 2) {
  C.aff.root.position.set(pos[0], pos[1] ?? -0.08, pos[2]);
  C.aff.pose({ yaw, blink: blinkAt(t, seed), talk: talk(t), smile: 0.95, ...p });
}
const yawTo = (from, to) => Math.atan2(to[0] - from[0], to[2] - from[2]);

// ------------------------------------------------------------------ overlays
const ESC = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function pinTag(id, text, p, t, a, b, style, dy = -90) {
  const q = pop(t, a, b);
  if (q.o <= 0 || !p.visible) return;
  ov.tag(id, text, { x: clamp(p.x, 190, 890), y: clamp(p.y + dy, 300, 1500), o: q.o, s: q.s }, style);
}
function bubble(id, text, t, a, b, x, y, style = {}, r = 0) {
  const q = pop(t, a, b);
  if (q.o > 0) ov.bubble(id, text, { x, y: y + Math.sin(t * 3) * 5, o: q.o, s: q.s, r }, style);
}

const IC = {
  sun: () => `<svg width="170" height="170" viewBox="-85 -85 170 170"><g stroke="#ffc928" stroke-width="12" stroke-linecap="round">${Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return `<line x1="${Math.cos(a) * 52}" y1="${Math.sin(a) * 52}" x2="${Math.cos(a) * 74}" y2="${Math.sin(a) * 74}"/>`;
  }).join('')}</g><circle r="40" fill="#ffe45c" stroke="#1c2752" stroke-width="9"/><circle cx="-14" cy="-12" r="9" fill="#fff" opacity="0.8"/></svg>`,
  moon: () => `<svg width="170" height="170" viewBox="-85 -85 170 170"><circle r="70" fill="#1c2752"/><path d="M14 -46 A48 48 0 1 0 38 30 A38 38 0 1 1 14 -46 Z" fill="#ffe45c" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
    <circle cx="36" cy="-30" r="5" fill="#fff"/><circle cx="48" cy="-2" r="3.5" fill="#fff"/></svg>`,
  zzz: () => `<svg width="120" height="110" viewBox="0 0 120 110"><g font-family="Baloo 2" font-weight="800" fill="#bff3ff" stroke="#1c2752" stroke-width="7" paint-order="stroke"><text x="8" y="100" font-size="48">z</text><text x="44" y="68" font-size="40">z</text><text x="78" y="40" font-size="32">z</text></g></svg>`,
  cupNo: () => `<svg width="190" height="190" viewBox="0 0 190 190"><path d="M50 50 H140 L130 160 Q128 172 116 172 H74 Q62 172 60 160 Z" fill="#ff9470" stroke="#1c2752" stroke-width="10" stroke-linejoin="round"/>
    <path d="M58 82 H132" stroke="#fff" stroke-width="8" opacity="0.7"/><path d="M72 64 Q95 40 118 64" fill="none" stroke="#6fe0ff" stroke-width="8" stroke-linecap="round"/>
    <g stroke-linecap="round"><line x1="20" y1="20" x2="170" y2="170" stroke="#fff" stroke-width="36"/><line x1="20" y1="20" x2="170" y2="170" stroke="#ff4d5e" stroke-width="20"/></g></svg>`,
  sugar: () => `<svg width="110" height="110" viewBox="0 0 110 110"><path d="M20 38 L55 20 L90 38 L90 78 L55 96 L20 78 Z" fill="#ffffff" stroke="#1c2752" stroke-width="8" stroke-linejoin="round"/><path d="M20 38 L55 56 L90 38 M55 56 V96" fill="none" stroke="#1c2752" stroke-width="6" stroke-linejoin="round" opacity="0.5"/><circle cx="40" cy="46" r="4" fill="#bff3ff"/><circle cx="68" cy="70" r="4" fill="#bff3ff"/></svg>`,
  germ: () => `<svg width="130" height="100" viewBox="0 0 130 100"><rect x="12" y="22" width="106" height="56" rx="28" fill="#9be8a8" stroke="#1c2752" stroke-width="8"/><circle cx="50" cy="46" r="7" fill="#1c2752"/><circle cx="80" cy="46" r="7" fill="#1c2752"/><path d="M56 60 Q65 68 74 60" fill="none" stroke="#1c2752" stroke-width="5" stroke-linecap="round"/></svg>`,
  drop: (c = '#e4ff6a') => `<svg width="90" height="120" viewBox="0 0 90 120"><path d="M45 8 C60 40 80 58 80 78 A35 35 0 0 1 10 78 C10 58 30 40 45 8 Z" fill="${c}" stroke="#1c2752" stroke-width="8" stroke-linejoin="round"/><ellipse cx="32" cy="76" rx="8" ry="12" fill="#fff" opacity="0.7"/></svg>`,
  plus: () => `<svg width="70" height="70" viewBox="0 0 70 70"><path d="M35 10 V60 M10 35 H60" stroke="#fff" stroke-width="16" stroke-linecap="round"/><path d="M35 10 V60 M10 35 H60" stroke="#1c2752" stroke-width="7" stroke-linecap="round"/></svg>`,
  sparkleTooth: () => `<svg width="150" height="160" viewBox="0 0 150 160"><path d="M30 30 Q75 0 120 30 Q140 60 118 100 Q110 150 96 150 Q86 150 82 118 Q75 100 68 118 Q64 150 54 150 Q40 150 32 100 Q10 60 30 30 Z" fill="#fff" stroke="#1c2752" stroke-width="9" stroke-linejoin="round"/><path d="M48 44 Q60 34 74 38" fill="none" stroke="#6fe0ff" stroke-width="8" stroke-linecap="round"/></svg>`,
};
const arrowSVG = `<svg width="120" height="70" viewBox="0 0 120 70"><path d="M8 35 H92 M70 12 L100 35 L70 58" fill="none" stroke="#fff" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 35 H92 M70 12 L100 35 L70 58" fill="none" stroke="#1c2752" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Sugar + bacteria -> acid explainer strip.
function equation(t, a, b, y = 330) {
  const items = [['sugar', IC.sugar(), 'GULA', a, -330], ['plus', IC.plus(), null, a + 0.4, -200], ['germ', IC.germ(), 'BAKTERIA', a + 0.5, -60], ['arr', arrowSVG, null, a + 1.5, 110], ['drop', IC.drop(), 'ASID', 17.16, 270]];
  ov.html('eqBg', `<div style="width:900px;height:250px;border-radius:60px;background:rgba(255,255,255,0.88);box-shadow:0 10px 0 rgba(28,39,82,0.18),0 0 0 6px #6fe0ff"></div>`, { x: W / 2, y: y + 30, ...pop(t, a - 0.1, b) });
  for (const [id, svg, label, at, dx] of items) {
    const q = pop(t, at, b);
    if (q.o <= 0) continue;
    ov.html('eq' + id, svg, { x: W / 2 + dx, y: y + (label ? -10 : 0) + Math.sin(t * 4 + dx) * 3, o: q.o, s: q.s * (id === 'germ' ? 0.95 : 1) });
    if (label) ov.html('eqL' + id, `<div style="font-family:'Baloo 2';font-weight:800;font-size:40px;color:${id === 'drop' ? '#3b7a00' : NAVY};letter-spacing:1px">${label}</div>`, { x: W / 2 + dx, y: y + 85, o: q.o, s: q.s });
  }
}

// Enamel close-up "lens": mineral crystals (hexagons) leave with acid, and come
// back (cyan-edged, stronger) with fluoride. A simplified model of
// demineralisation / remineralisation, not a literal picture.
const HEX = (() => {
  const R = rng(77);
  const s = 27, cells = [];
  for (let col = -8; col <= 8; col++) for (let row = 0; row < 8; row++) {
    const x = col * s * 1.5, y = row * s * Math.sqrt(3) + (col & 1 ? (s * Math.sqrt(3)) / 2 : 0);
    const depth = row / 7;
    cells.push({ x, y, row, th: 0.08 + 0.55 * depth + 0.25 * R() + 0.18 * Math.abs(col) / 8, th2: R(), ph: R() * 6 });
  }
  return { s, cells };
})();
function hexPath(g, x, y, s) {
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
  }
  g.closePath();
}
function lens(t, { cx = W / 2, cy = 700, r = 245, o = 1, s = 1, loss = 0, acid = 0, fluor = 0, base = 0, clock = 0 } = {}) {
  if (o <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = clamp(o);
  g.translate(cx, cy);
  g.scale(s, s);
  // drop shadow + ring
  g.fillStyle = 'rgba(10,16,50,0.25)';
  g.beginPath();
  g.arc(0, 12, r + 34, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.clip();
  const bg = g.createLinearGradient(0, -r, 0, r);
  bg.addColorStop(0, '#ffe1ea');
  bg.addColorStop(0.45, '#ffd0de');
  bg.addColorStop(1, '#f7bfd0');
  g.fillStyle = bg;
  g.fillRect(-r, -r, 2 * r, 2 * r);
  const top = -r * 0.12;
  const { s: hs, cells } = HEX;
  for (const c of cells) {
    const x = c.x, y = top + c.y;
    const gone = Math.max(base, loss) > c.th;
    const back = gone && fluor > c.th2 * 0.85 + 0.05;
    if (back) {
      const k = clamp((fluor - (c.th2 * 0.85 + 0.05)) / 0.12);
      g.globalAlpha = clamp(o) * k;
      hexPath(g, x, y + (1 - easeOut(k)) * -40, hs - 2.5);
      g.fillStyle = '#f7fdff';
      g.fill();
      g.lineWidth = 5;
      g.strokeStyle = '#2cc8f0';
      g.stroke();
      g.globalAlpha = clamp(o);
      continue;
    }
    if (gone) {
      if (base > c.th) continue; // already missing before this scene
      const u = clamp((loss - c.th) / 0.18);
      if (u >= 1) continue;
      g.globalAlpha = clamp(o) * (1 - u);
      hexPath(g, x + Math.sin(c.ph + u * 3) * 12 * u, y - u * 90, (hs - 2.5) * (1 - 0.4 * u));
      g.fillStyle = '#fff6e0';
      g.fill();
      g.globalAlpha = clamp(o);
      continue;
    }
    hexPath(g, x, y, hs - 2.5);
    const sh = 0.9 + 0.1 * (c.row / 7);
    g.fillStyle = `rgb(${Math.round(255 * sh)},${Math.round(250 * sh)},${Math.round(236 * sh)})`;
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(200,180,150,0.55)';
    g.stroke();
  }
  // acid drops falling onto the surface
  if (acid > 0) {
    const R = rng(91);
    for (let i = 0; i < 9; i++) {
      const x0 = (R() - 0.5) * r * 1.5, sp = 0.9 + R() * 0.6, ph = R();
      const k = (t * sp * 0.9 + ph) % 1;
      const y = lerp(-r * 0.95, top + 10, k);
      g.globalAlpha = clamp(o) * acid * Math.sin(Math.PI * Math.min(1, k * 1.15));
      g.fillStyle = '#d8ff4a';
      g.strokeStyle = '#3b7a00';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(x0, y - 20);
      g.quadraticCurveTo(x0 + 13, y, x0, y + 12);
      g.quadraticCurveTo(x0 - 13, y, x0, y - 20);
      g.fill();
      g.stroke();
    }
    g.globalAlpha = clamp(o);
  }
  // fluoride ions drifting in and docking
  if (fluor > 0) {
    const R = rng(93);
    for (let i = 0; i < 10; i++) {
      const x0 = (R() - 0.5) * r * 1.5, ph = R();
      const k = (t * 0.8 + ph) % 1;
      const y = lerp(-r * 0.95, top + 30, easeInOut(k));
      g.globalAlpha = clamp(o) * Math.min(1, fluor * 2) * Math.sin(Math.PI * k);
      g.fillStyle = '#2cc8f0';
      g.beginPath();
      g.arc(x0 + Math.sin(t * 2 + i) * 10, y, 19, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.font = "800 26px 'Baloo 2'";
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('F', x0 + Math.sin(t * 2 + i) * 10, y + 2);
    }
    g.globalAlpha = clamp(o);
  }
  g.restore();
  g.lineWidth = 30;
  g.strokeStyle = NAVY;
  g.beginPath();
  g.arc(0, 0, r + 12, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 14;
  g.strokeStyle = '#ffc928';
  g.stroke();
  // time-lapse clock (repeated acid attacks over many days)
  if (clock > 0) {
    g.globalAlpha = clamp(o) * clock;
    const kx = r * 0.72, ky = -r * 0.72;
    g.fillStyle = '#fff';
    g.strokeStyle = NAVY;
    g.lineWidth = 9;
    g.beginPath();
    g.arc(kx, ky, 48, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.lineCap = 'round';
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(kx, ky);
    g.lineTo(kx + Math.cos(t * 9) * 30, ky + Math.sin(t * 9) * 30);
    g.moveTo(kx, ky);
    g.lineTo(kx + Math.cos(t * 0.75 - 1.5) * 20, ky + Math.sin(t * 0.75 - 1.5) * 20);
    g.stroke();
    g.fillStyle = PEACH;
    g.font = "800 40px 'Baloo 2'";
    g.textAlign = 'center';
    g.fillText('»', kx + 72, ky + 14);
  }
  g.restore();
}

function timer(t, a, b, x, y) {
  const q = pop(t, a, b);
  if (q.o <= 0) return;
  const g = ov.g;
  const k = inv(a + 0.2, 34.0, t);
  const left = Math.max(0, Math.ceil(120 * (1 - k)));
  g.save();
  g.globalAlpha = q.o;
  g.translate(x, y);
  g.scale(q.s, q.s);
  g.fillStyle = 'rgba(10,16,50,0.25)';
  g.beginPath();
  g.arc(0, 10, 128, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(0, 0, 118, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 22;
  g.strokeStyle = '#d6f4fb';
  g.beginPath();
  g.arc(0, 0, 92, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = CYAN;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(0, 0, 92, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - k));
  g.stroke();
  g.lineWidth = 8;
  g.strokeStyle = NAVY;
  g.beginPath();
  g.arc(0, 0, 118, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = NAVY;
  g.font = "800 58px 'Baloo 2'";
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`, 0, 6);
  g.restore();
}

// Shrink / grow magic transition.
function magic(t, a, b, cx = W / 2, cy = 820) {
  const k = inv(a, b, t);
  if (k <= 0 || k >= 1) return;
  ov.swirl(t, cx, cy, Math.sin(k * Math.PI));
}

// ======================================================================= SHOTS
const AFF_HEAD = () => wpos(A.parts.head);
const SHOTS = [
  // S1 — hook at the mirror: "Eh! Gigi Affan nampak bersih! Tapi kenapa kena gosok lagi?"
  [0, 5.0, (t) => {
    bathState(t);
    povMode(true);
    const grin = keys(t, [[0.7, 0], [1.0, 1], [2.5, 1], [2.75, 0]]);
    const pt = keys(t, [[0.75, 0], [1.1, 1], [2.4, 1], [2.75, 0]]);
    const think = keys(t, [[2.75, 0], [3.2, 1], [5.0, 1]]);
    const th = POSES.thinkR.armR;
    affPose(t, {
      grin, teeth: grin, wow: keys(t, [[0, 0.7], [0.45, 0]]), brow: 0.4 + 0.6 * think,
      headRoll: -0.14 * think + 0.04 * Math.sin(t * 2), headYaw: 0.08 * Math.sin(t * 1.3), lookX: 0.35 * think, lookY: 0.3 * think,
      armR: pt > 0.01 ? { reach: [lerp(-0.6, -0.26, pt), lerp(0.35, 1.38, pt), lerp(0.1, 0.78, pt)], point: pt, pole: [-1, -0.8, -0.2], wx: -0.9 * pt } : think > 0 ? { reach: [lerp(-0.6, th.reach[0], think), lerp(0.35, th.reach[1], think), lerp(0.1, th.reach[2], think)], pole: th.pole, point: think, wx: th.wx * think } : {},
      armL: { reach: [0.62, 0.5, 0.25] },
    });
    brushAtRest(t);
    bath.brush.visible = false;
    const k = easeOut(inv(0, 5, t));
    pov(lerp(0.1, -0.05, k), 3.75, lerp(4.4, 3.7, k), V(0, 3.12, 0), 34);
    const p = pop(t, 0.12, 4.9, { fin: 0.45 });
    ov.bubble('hook', 'KENAPA\nGOSOK GIGI?', { x: W / 2, y: 430 + Math.sin(t * 3) * 6, o: p.o, s: p.s }, { size: 118 });
    const q = pop(t, 0.5, 4.9);
    ov.tag('ep', 'EPISOD 10', { x: W / 2, y: 280, o: q.o, s: q.s }, { bg: CYAN, small: true });
    if (grin > 0.5) {
      const m = scr(wpos(A.parts.mouth));
      const s1 = inv(1.4, 1.7, t) * (1 - inv(2.3, 2.6, t));
      ov.star(m.x + 40, m.y - 10, 46 * s1, s1, '#ffffff', t * 2);
      ov.star(m.x - 50, m.y + 6, 30 * s1, s1 * 0.8, '#bff3ff', -t * 2);
    }
    const head = scr(AFF_HEAD());
    [[3.2, -300, -150, '#ffcf33', -12], [3.45, 300, -190, CYAN, 10]].forEach(([a, dx, dy, c, r], i) => {
      const qq = pop(t, a, 4.95);
      ov.html('q' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: qq.o, s: qq.s * 0.75, r });
    });
    return bath;
  }],
  // S2 — "Jom Affan tengok dekat-dekat!": magnifying glass, push into the lens
  [5.0, 6.9, (t) => {
    bathState(t);
    povMode(true);
    const up = easeOut(inv(5.0, 5.45, t));
    affPose(t, {
      smile: 1, brow: 0.7, headPitch: 0.04,
      armR: { reach: [lerp(-0.6, -0.36, up), lerp(0.35, 1.2, up), lerp(0.1, 0.72, up)], pole: [-1, -0.6, -0.4] },
      armL: { reach: [0.62, 0.5, 0.25] },
    });
    bath.brush.visible = false;
    bath.mag.visible = up > 0.02;
    const eye = wpos(A.parts.eyes[0].eye);
    const fwd = A.parts.head.getWorldDirection(new THREE.Vector3());
    const grip = wpos(A.parts.arms.R.hand);
    const ring = eye.clone().addScaledVector(fwd, lerp(0.6, 0.3, up)).add(V(0, lerp(-0.6, 0, up), 0));
    holdMag(bath.mag, grip, ring, fwd);
    A.parts.eyes[0].eye.scale.setScalar(lerp(1, 1.55, inv(5.35, 5.6, t)));
    const push = easeIn(inv(5.75, 6.9, t));
    const ringW = wpos(bath.mag.userData.ring);
    const start = V(-0.05, 3.7, MIRROR_Z + 3.4);
    lookCam(cam, start.lerp(ringW.clone().addScaledVector(fwd, 0.25), push), V(0, 3.2, 0).lerp(ringW, push * 0.8 + 0.2), lerp(34, 22, push), lerp(3.5, 0.03, push));
    magic(t, 5.85, 6.9, W / 2, H / 2);
    ov.flash(inv(6.55, 6.9, t) ** 2);
    return bath;
  }],
  // S3a — Tooth City reveal: "Waaaah! Ada lapisan melekit dekat gigi!"
  [6.9, 9.05, (t) => {
    cityState(t);
    const ap = [2.2, -0.08, 7.2];
    const turn = easeInOut(inv(7.9, 8.5, t));
    const open = keys(t, [[6.95, 0], [7.3, 1], [7.85, 1], [8.3, 0]]);
    const pt = keys(t, [[8.3, 0], [8.7, 1], [9.05, 1]]);
    cityAffan(t, ap, lerp(yawTo(ap, [-1, 0, -6]), yawTo(ap, [-3, 0, 0]), turn), {
      wow: keys(t, [[6.9, 1], [7.7, 1], [7.95, 0]]), brow: 1, headPitch: lerp(-0.35, -0.12, turn), lookY: lerp(0.6, 0.2, turn),
      armL: { reach: [lerp(0.55, 1.0, open), lerp(0.3, 1.6, open), lerp(0.15, 0.35, open)], pole: [1, -0.6, -0.4] },
      armR: pt > 0.01 ? { reach: [lerp(-0.55, -0.6, pt), lerp(0.3, 1.25, pt), lerp(0.15, 0.85, pt)], point: pt, pole: [-1, -0.6, -0.4] } : { reach: [lerp(-0.55, -1.0, open), lerp(0.3, 1.6, open), lerp(0.15, 0.35, open)], pole: [-1, -0.6, -0.4] },
    });
    const k = easeInOut(inv(6.9, 8.9, t));
    lookCam(cam, V(lerp(15, 7.6, k), lerp(24, 4.4, k), lerp(32, 16, k)), V(lerp(-3, -0.8, k), lerp(6, 4.0, k), lerp(-2, 2.5, k)), lerp(55, 46, k));
    ov.flash(1 - inv(6.9, 7.3, t));
    ov.sparkles(t, { n: 22, seed: 3, y: 260, h: 1100, a: 0.7 });
    return city;
  }],
  // S3b — over the shoulder: "...dekat gigi! Namanya plak!"
  [9.05, 11.6, (t) => {
    cityState(t);
    const ap = [1.3, -0.08, 3.1];
    cityAffan(t, ap, yawTo(ap, [-3, 0, -0.5]), {
      brow: 0.6, headPitch: -0.1,
      armR: { reach: [-0.55, 1.3, 0.85], point: 1, pole: [-1, -0.6, -0.4] }, armL: { reach: [0.6, 0.5, 0.2] },
    });
    const k = easeInOut(inv(9.05, 11.6, t));
    lookCam(cam, V(lerp(5.6, 4.6, k), lerp(6.4, 5.6, k), lerp(10.5, 8.6, k)), V(lerp(-2.6, -2.9, k), lerp(2.4, 2.2, k), lerp(-0.8, -0.4, k)), 44);
    const s = heroSurf(-0.6, 2.4);
    if (s) pinTag('plak', 'PLAK', scr(s.p.clone().addScaledVector(s.n, 0.5)), t, 10.9, 11.55, { bg: '#f2a91c', pointer: 'down' }, -110);
    const gl = pop(t, 8.0, 11.55);
    if (gl.o > 0 && s) {
      const pp = scr(s.p);
      ov.sparkles(t, { n: 8, seed: 21, x: pp.x - 220, y: pp.y - 200, w: 440, h: 360, a: 0.6 * gl.o, size: 18, colors: ['#fff6c8', '#ffe066'] });
    }
    return city;
  }],
  // S4 — macro: "Dalam plak ada bakteria. Bila dapat gula,"
  [11.6, 15.2, (t) => {
    cityState(t, { affan: false });
    const k = easeInOut(inv(11.6, 15.2, t));
    const c = heroSurf(0.2, 2.2);
    const look = c.p.clone();
    const posA = c.p.clone().addScaledVector(c.n, 9.5).add(V(0, 2.4, 3.2));
    const posB = c.p.clone().addScaledVector(c.n, 6.2).add(V(0, 1.3, 1.2));
    lookCam(cam, posA.lerp(posB, k), look.add(V(0, lerp(0.6, 0.2, k), 0)), 40);
    const b = C.bacteria[4];
    if (b) pinTag('bak', 'BAKTERIA', scr(b.position), t, 12.8, 15.15, { bg: PEACH, pointer: 'down' }, -95);
    ov.flash((1 - inv(11.6, 11.85, t)) * 0.6);
    return city;
  }],
  // S5 — "bakteria tertentu boleh hasilkan asid yang merosakkan gigi!"
  [15.2, 19.3, (t) => {
    cityState(t, { affan: false });
    const k = easeInOut(inv(15.2, 19.3, t));
    const c = heroSurf(0.8, 1.9);
    lookCam(cam, c.p.clone().addScaledVector(c.n, lerp(10.5, 8.5, k)).add(V(0, lerp(1.0, 2.4, k), lerp(-3.6, -1.6, k))), c.p.clone().add(V(0, lerp(0.1, -0.6, k), 0)), 40);
    if (t < 17.75) equation(t, 15.3, 17.75, 330);
    const acidP = C.bacteria[7] ? scr(C.bacteria[7].position) : null;
    if (acidP && t < 17.8) pinTag('asid', 'ASID', acidP, t, 17.16, 17.75, { bg: '#7cb518', pointer: 'down' }, -90);
    const lp = pop(t, 17.8, 19.25, { fin: 0.4 });
    lens(t, { cx: W / 2, cy: 680, r: 290, o: lp.o, s: lp.s, loss: keys(t, [[18.0, 0], [19.2, 0.6]]), acid: inv(17.8, 18.1, t), clock: inv(18.0, 18.3, t) });
    if (lp.o > 0) {
      ov.tag('lap1', 'LAPISAN GIGI', { x: W / 2, y: 1010, o: lp.o, s: lp.s }, { bg: NAVY, small: true });
      ov.tag('asid2', 'ASID', { x: W / 2 - 270, y: 400, o: lp.o, s: lp.s * 0.9, r: -8 }, { bg: '#7cb518', small: true });
    }
    return city;
  }],
  // S6 — "Alamak! Habis tu macam mana?!"
  [19.3, 21.6, (t) => {
    cityState(t);
    const ap = [2.4, -0.08, 5.0];
    const cheeks = keys(t, [[19.35, 0], [19.6, 1], [20.25, 1], [20.5, 0]]);
    const shrug = keys(t, [[20.4, 0], [20.75, 1], [21.6, 1]]);
    const yaw = yawTo(ap, [7, 0, 13]);
    cityAffan(t, ap, yaw, {
      wow: keys(t, [[19.3, 0], [19.45, 1], [20.2, 1], [20.4, 0]]), brow: 1, smile: lerp(0.3, 0.5, shrug),
      headRoll: 0.12 * shrug * Math.sin(t * 5), headPitch: 0.05,
      armL: cheeks > shrug ? { reach: [lerp(0.6, 0.38, cheeks), lerp(0.4, 1.62, cheeks), lerp(0.15, 0.62, cheeks)], pole: [1, -0.8, -0.2] } : { reach: [lerp(0.6, 0.95, shrug), lerp(0.4, 0.95, shrug), lerp(0.15, 0.55, shrug)], pole: [1, -0.8, -0.3] },
      armR: cheeks > shrug ? { reach: [lerp(-0.6, -0.38, cheeks), lerp(0.4, 1.62, cheeks), lerp(0.15, 0.62, cheeks)], pole: [-1, -0.8, -0.2] } : { reach: [lerp(-0.6, -0.95, shrug), lerp(0.4, 0.95, shrug), lerp(0.15, 0.55, shrug)], pole: [-1, -0.8, -0.3] },
      bob: 0.12 * Math.max(0, Math.sin(clamp((t - 19.35) / 0.4) * Math.PI)),
    });
    const k = easeOut(inv(19.3, 21.6, t));
    lookCam(cam, V(lerp(6.0, 5.2, k), 3.5, lerp(12.6, 11.4, k)), V(2.0, 3.2, 4.6), 38);
    bubble('alamak', 'ALAMAK!', t, 19.45, 20.35, W / 2, 420, { size: 150, top: '#ffb36b', bot: '#ff6a3d' }, -4);
    const head = scr(wpos(C.aff.parts.head));
    [[20.5, -270, -160, '#ffcf33', -12], [20.7, 260, -200, CYAN, 12]].forEach(([a, dx, dy, c, r], i) => {
      const qq = pop(t, a, 21.55);
      ov.html('mq' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 8, o: qq.o, s: qq.s * 0.7, r });
    });
    return city;
  }],
  // S7 — "Haaa! Berus gigi..." the giant soft toothbrush arrives
  [21.6, 23.3, (t) => {
    cityState(t);
    const ap = [2.4, -0.08, 5.6];
    const idea = keys(t, [[21.65, 0], [21.95, 1], [23.3, 1]]);
    cityAffan(t, ap, yawTo(ap, [9.5, 0, 15.5]) - 0.35, {
      wow: keys(t, [[21.6, 0], [21.75, 0.6], [22.0, 0]]), brow: 1, smile: 1, headPitch: -0.3 * idea, lookY: 0.6 * idea,
      armR: { reach: [lerp(-0.6, -0.5, idea), lerp(0.4, 1.95, idea), lerp(0.15, 0.4, idea)], point: idea, pole: [-1, -0.4, -0.5] },
      armL: { reach: [0.6, 0.45, 0.25] },
      bob: 0.1 * Math.max(0, Math.sin(clamp((t - 21.66) / 0.4) * Math.PI)),
    });
    const d = easeOut(inv(21.7, 23.25, t));
    const p0 = brushPath(SWEEP[0]);
    cityBrushAt(p0.z, p0.y + lerp(30, 0.4, d), 0, lerp(6, 0.6, d));
    C.brush.position.x += 0;
    lookCam(cam, V(9.5, 1.6, 15.5), V(-0.5, lerp(7.5, 5.5, d), 1.0), 52);
    const head = scr(wpos(C.aff.parts.head));
    const b = pop(t, 21.75, 23.25);
    ov.html('bulb', ICONS.bulb(), { x: head.x + 220, y: head.y - 120 + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    bubble('bbp1', 'BERUS\nBUANG PLAK', t, 22.6, 23.28, W / 2, 380, { ...CYAN_BUBBLE, size: 110 });
    return city;
  }],
  // S8 — macro brushing: gentle circles lift the sticky plaque away
  [23.3, 24.8, (t) => {
    cityState(t, { affan: false });
    const bp = brushPath(t);
    cityBrushAt(bp.z, bp.y, bp.bend * 0.8);
    const k = easeInOut(inv(23.3, 24.8, t));
    lookCam(cam, V(lerp(7.5, 8.5, k), lerp(8.5, 7.5, k), lerp(-13, -11, k)), V(-2.6, 3.2, lerp(-1.5, 1.5, k)), 46);
    bubble('bbp2', 'BERUS\nBUANG PLAK', t, 23.3, 24.75, W / 2, 380, { ...CYAN_BUBBLE, size: 110 });
    ov.flash((1 - inv(23.3, 23.5, t)) * 0.4);
    return city;
  }],
  // S9 — "Ubat gigi berfluorida pula bantu kuatkan lapisan gigi!"
  [24.8, 28.8, (t) => {
    cityState(t);
    const ap = [2.2, -0.08, 4.6];
    const th = keys(t, [[26.9, 0], [27.3, 1], [28.8, 1]]);
    const up = POSES.thumbsUpR.armR;
    cityAffan(t, ap, yawTo(ap, [7.5, 0, 12]), {
      smile: 1, brow: 0.5, headYaw: 0.2,
      armR: th > 0.01 ? { reach: [lerp(-0.6, up.reach[0], th), lerp(0.4, up.reach[1], th), lerp(0.15, up.reach[2], th)], pole: up.pole, thumb: th, wy: up.wy * th, wx: up.wx * th } : { reach: [-0.6, 0.4, 0.15] },
      armL: { reach: [0.6, 0.45, 0.2] },
    });
    // brush lifts away
    const bp = brushPath(SWEEP[1]);
    const lift = easeIn(inv(24.8, 25.6, t));
    if (lift < 1) cityBrushAt(bp.z, bp.y + lift * 30, 0, lift * 8);
    const k = easeInOut(inv(24.8, 28.8, t));
    lookCam(cam, V(lerp(9.0, 7.0, k), lerp(5.6, 4.2, k), lerp(9.5, 12.5, k)), V(-2.6, 3.4, lerp(0.4, 1.8, k)), 46);
    const s = heroSurf(-1.6, 4.2);
    if (s) pinTag('fl', 'FLUORIDA', scr(s.p.clone().addScaledVector(s.n, 0.6)), t, 25.48, 28.7, { bg: CYAN, pointer: 'down' }, -100);
    const lp = pop(t, 26.1, 28.6, { fin: 0.4 });
    lens(t, { cx: W / 2 + 120, cy: 700, r: 240, o: lp.o, s: lp.s, base: 0.42, fluor: keys(t, [[26.3, 0], [28.2, 1]]) });
    if (lp.o > 0) ov.tag('lap2', 'LAPISAN GIGI', { x: W / 2 + 120, y: 975, o: lp.o, s: lp.s }, { bg: NAVY, small: true });
    magic(t, 28.2, 28.8, W / 2, 860);
    ov.flash(inv(28.5, 28.8, t) ** 2);
    return city;
  }],
  // S10 — back in the bathroom: gentle brushing with Ibu, 2 minutes, twice a day, before bed
  [28.8, 34.2, (t) => {
    const night = keys(t, [[31.7, 0], [32.0, 1], [32.25, 0], [32.55, 1]], (k) => k);
    bathState(t, { night: t > 32.55 ? 1 : night });
    povMode(true);
    affPose(t, { teeth: 1, grin: 0.55, smile: 1, headPitch: 0.02, lookX: -0.1, ...brushing(t), armL: { reach: [0.6, 0.5, 0.3] } }, 3);
    placeBrushing(t);
    bath.ibu.root.visible = true;
    const shR = wpos(A.parts.arms.R.shoulder);
    const nodI = 0.06 * Math.sin(t * 2.2);
    parentPose(bath.ibu, { lean: 0.36, twist: 0.5, tilt: -0.05, headYaw: 0.3, headPitch: 0.3 + nodI, headRoll: 0.06, smile: 1, blink: blinkAt(t, 5), brow: 0.3 }, { p: shR.clone().add(V(-0.05, 0.16, -0.12)), pole: [0.3, -1, -1] }, null);
    const k = easeInOut(inv(28.8, 34.2, t));
    pov(lerp(-0.55, -0.4, k), 4.3, lerp(6.2, 5.4, k), V(-0.5, 4.05, -0.4), 40);
    ov.flash((1 - inv(28.8, 29.2, t)) * 1.0);
    // 2-minute timer
    timer(t, 30.2, 34.15, 200, 390);
    const tq = pop(t, 30.3, 34.15);
    ov.tag('2min', '2 MINIT', { x: 200, y: 560, o: tq.o, s: tq.s }, { bg: CYAN });
    // twice a day: morning + night
    const sq = pop(t, 31.1, 34.15), mq = pop(t, 31.35, 34.15);
    const moonBig = 1 + 0.35 * easeOut(inv(33.1, 33.4, t));
    ov.html('sun', IC.sun(), { x: 735, y: 360, o: sq.o * (1 - 0.5 * inv(33.1, 33.4, t)), s: sq.s * 0.85 });
    ov.html('moon', IC.moon(), { x: 900, y: 360, o: mq.o, s: mq.s * 0.85 * moonBig });
    const kq = pop(t, 31.15, 34.15);
    ov.tag('2kali', '2 KALI SEHARI', { x: 815, y: 500, o: kq.o, s: kq.s }, { bg: PEACH, small: true });
    const tt = pop(t, 33.18, 34.15);
    ov.tag('tidur', 'SEBELUM TIDUR', { x: 790, y: 600, o: tt.o, s: tt.s }, { bg: NAVY });
    if (tt.o > 0) ov.html('zzz', IC.zzz(), { x: 990, y: 260 + Math.sin(t * 3) * 6, o: tt.o, s: tt.s * 0.8 });
    return bath;
  }],
  // S11 — close-up: a pea-sized amount of fluoride toothpaste, squeezed by Ibu
  [34.2, 36.7, (t) => {
    bathState(t, { night: 1 });
    povMode(false);
    A.root.position.set(0, -20, 0);
    const bx = 1.15, bz = 1.05, by = 2.17;
    orientBrush(bath.brush, V(bx, by, bz), V(-1, 0, 0.12), V(0, -1, 0).negate(), 0.105);
    const grow = easeOut(inv(34.55, 35.25, t));
    bath.paste.visible = grow > 0.01;
    bath.paste.scale.set(0.42 * grow, 0.36 * grow, 0.4 * grow);
    bath.helper.visible = true;
    const squeeze = Math.sin(clamp((t - 34.45) / 0.85) * Math.PI);
    const lift = easeIn(inv(35.25, 35.75, t));
    bath.helper.position.set(bx + 0.02, by + 0.47 + 0.04 * (1 - easeOut(inv(34.2, 34.5, t))) + lift * 0.6, bz - 0.04);
    bath.helper.rotation.set(-0.25, 0.4, 0.12);
    bath.hTube.scale.set(0.32 * (1 - 0.06 * squeeze), 0.32 * (1 - 0.14 * squeeze), 0.32 * (1 + 0.12 * squeeze));
    const pk = easeOut(inv(35.3, 35.75, t));
    bath.pea.position.set(lerp(bx + 0.62, bx + 0.17, pk), by + 0.045, bz + 0.03);
    bath.pea.rotation.set(0, 0, pk * 6);
    bath.pea.scale.setScalar(0.32);
    const k = easeInOut(inv(34.2, 36.7, t));
    lookCam(cam, V(bx + 0.06, by + 0.72 - 0.06 * k, bz + 0.78 - 0.08 * k), V(bx + 0.08, by + 0.13, bz), 30);
    ov.flash((1 - inv(34.2, 34.4, t)) * 0.5);
    bubble('pea', 'UBAT GIGI SEBESAR\nKACANG PIS', t, 35.32, 36.65, W / 2, 420, { size: 86, top: '#d9ff9a', bot: '#7fd44a' });
    const ag = pop(t, 35.6, 36.65);
    ov.tag('age', 'UMUR 3–6 TAHUN', { x: W / 2, y: 625, o: ag.o, s: ag.s }, { bg: NAVY, small: true });
    return bath;
  }],
  // S12 — "Minta ibu ayah bantu, ya!"
  [36.7, 38.45, (t) => {
    bathState(t, { night: 1 });
    povMode(true);
    const nod = t > 37.95 ? Math.sin(clamp((t - 37.95) / 0.45) * Math.PI * 2) * 0.12 : 0;
    affPose(t, { teeth: 1, grin: 0.35, smile: 1, headPitch: nod, ...brushing(t, 0.7), armL: { reach: [0.6, 0.5, 0.3] } }, 4);
    placeBrushing(t);
    bath.ibu.root.visible = bath.ayah.root.visible = true;
    const shR = wpos(A.parts.arms.R.shoulder);
    parentPose(bath.ibu, { lean: 0.36, twist: 0.5, headYaw: 0.25, headPitch: 0.3, smile: 1, blink: blinkAt(t, 6) }, { p: shR.clone().add(V(-0.05, 0.16, -0.12)), pole: [0.3, -1, -1] }, null);
    const sh = A.parts.arms.L.shoulder.getWorldPosition(new THREE.Vector3());
    const wave = keys(t, [[37.1, 0], [37.4, 1], [38.45, 1]]);
    parentPose(bath.ayah, { lean: 0.22, twist: -0.4, headYaw: -0.3, headPitch: 0.25, smile: 1, blink: blinkAt(t, 8), brow: 0.4 }, wave > 0 ? { p: V(2.0 + 0.08 * Math.sin(t * 9), lerp(3.2, 4.4, wave), -0.3) } : null, { p: sh.clone().add(V(0.05, 0.12, -0.05)) });
    const k = easeOut(inv(36.7, 38.45, t));
    pov(0, 4.5, lerp(6.6, 6.0, k), V(0, 4.0, -0.5), 42);
    ov.flash((1 - inv(36.7, 36.9, t)) * 0.4);
    const ib = scr(wpos(bath.ibu.parts.head)), ay = scr(wpos(bath.ayah.parts.head));
    const q1 = pop(t, 37.04, 38.4), q2 = pop(t, 37.3, 38.4);
    const heart = (c) => `<svg width="90" height="80" viewBox="0 0 90 80"><path d="M45 74 C10 50 4 30 14 16 C24 4 40 8 45 22 C50 8 66 4 76 16 C86 30 80 50 45 74 Z" fill="${c}" stroke="#fff" stroke-width="7"/></svg>`;
    ov.html('h1', heart('#ff8a8a'), { x: ib.x + 30, y: ib.y - 230 + Math.sin(t * 3) * 8, o: q1.o, s: q1.s * 0.8 });
    ov.html('h2', heart('#ffb38a'), { x: ay.x - 30, y: ay.y - 230 + Math.sin(t * 3 + 1) * 8, o: q2.o, s: q2.s * 0.8 });
    return bath;
  }],
  // S13 — "Lepas tu ludah, tak perlu kumur!"
  [38.45, 40.85, (t) => {
    bathState(t, { night: 1 });
    povMode(false);
    bath.mirror.visible = true;
    A.root.position.set(0, 0.55, -0.15);
    const lean = keys(t, [[38.5, 0], [38.85, 0.14], [39.5, 0.14], [39.8, 0]]);
    const wag = keys(t, [[39.75, 0], [40.0, 1], [40.85, 1]]);
    const w = POSES.wagR(t).armR;
    affPose(t, {
      lean, headPitch: 0.1 * lean / 0.14, smile: 0.9, brow: 0.3 + 0.4 * wag, headYaw: lerp(0, 0.75, wag), lookX: 0.6 * wag,
      wow: keys(t, [[38.95, 0], [39.08, 0.55], [39.35, 0.55], [39.5, 0]]),
      armL: { reach: [0.62, 0.65, 0.45], pole: [1, -1, -0.3] },
      armR: wag > 0 ? { reach: [lerp(-0.55, -0.85, wag), lerp(0.55, 1.35, wag), lerp(0.4, 0.6, wag)], point: wag, wz: w.wz * wag, pole: [-1, -1, 0] } : { reach: [-0.55, 0.55, 0.4] },
    }, 5);
    brushAtRest(t);
    // spit: a little foam drops into the basin
    const sp = inv(39.08, 39.5, t);
    if (sp > 0 && sp < 1) {
      const m = wpos(A.parts.mouth);
      bath.spit.position.set(lerp(m.x, 0, sp), lerp(m.y - 0.05, 1.82, easeIn(sp)), lerp(m.z + 0.05, 1.32, sp));
      bath.spit.scale.setScalar(lerp(0.8, 1.2, sp));
    }
    const k = easeInOut(inv(38.45, 40.85, t));
    lookCam(cam, V(lerp(3.6, 3.4, k), lerp(3.7, 3.8, k), 2.05), V(-0.35, 3.0, 0.2), 48);
    bubble('ludah', 'LUDAH,\nTAK PERLU KUMUR!', t, 39.08, 40.8, W / 2, 400, { ...CYAN_BUBBLE, size: 96 });
    const cq = pop(t, 39.7, 40.8, { from: 1.8 });
    ov.html('cup', IC.cupNo(), { x: 190, y: 700, o: cq.o, s: cq.s * 1.1, r: -6 });
    return bath;
  }],
  // S14 — "Yeay! Gigi sihat, senyuman ceria!"
  [40.85, 43.9, (t) => {
    bathState(t, { night: 1 });
    povMode(true);
    const yeay = keys(t, [[40.9, 0], [41.15, 1], [41.6, 1], [41.9, 0]]);
    const jump = t > 40.95 && t < 41.5 ? Math.sin(((t - 40.95) / 0.55) * Math.PI) * 0.22 : 0;
    const th = keys(t, [[42.6, 0], [42.95, 1], [43.9, 1]]);
    const up = POSES.thumbsUpR.armR;
    const grin = keys(t, [[41.9, 0], [42.1, 1], [43.9, 1]]);
    affPose(t, {
      bob: jump, smile: 1, brow: 0.6, grin: Math.max(grin, yeay * 0.6), teeth: 1,
      armL: { reach: [lerp(0.6, 0.85, yeay), lerp(0.5, 1.9, yeay), lerp(0.25, 0.35, yeay)], pole: [1, -0.4, -0.5] },
      armR: th > 0.01 ? { reach: [lerp(-0.6, up.reach[0], th), lerp(0.5, up.reach[1], th), lerp(0.25, up.reach[2], th)], pole: up.pole, thumb: th, wy: up.wy * th, wx: up.wx * th } : { reach: [lerp(-0.6, -0.85, yeay), lerp(0.5, 1.9, yeay), lerp(0.25, 0.35, yeay)], pole: [-1, -0.4, -0.5] },
    }, 6);
    bath.brush.visible = false;
    const k = easeOut(inv(40.85, 43.9, t));
    pov(0, 3.6, lerp(3.4, 2.6, k), V(0, 3.15, 0), 36);
    const m = scr(wpos(A.parts.mouth));
    const s1 = inv(42.05, 42.3, t) * (1 - inv(43.5, 43.85, t));
    ov.star(m.x + 60, m.y - 20, 60 * s1, s1, '#ffffff', t * 2);
    ov.star(m.x - 70, m.y, 38 * s1, s1 * 0.85, '#bff3ff', -t * 2);
    ov.sparkles(t, { n: 26, seed: 14, y: 260, h: 1000, a: inv(40.9, 41.2, t) });
    bubble('yeay', 'YEAY!', t, 40.95, 41.95, W / 2, 400, { size: 170 });
    const tq = pop(t, 42.06, 43.85);
    ov.html('tooth', IC.sparkleTooth(), { x: 190, y: 420 + Math.sin(t * 3) * 8, o: tq.o, s: tq.s * 0.9, r: -8 });
    return bath;
  }],
  // S15 — "Apa lagi Affan nak siasat?"
  [43.9, 45.9, (t) => {
    bathState(t, { night: 1 });
    povMode(true);
    const tk = keys(t, [[43.95, 0], [44.35, 1], [45.9, 1]]);
    const th2 = POSES.thinkR.armR;
    affPose(t, {
      smile: 1, brow: 0.3 + 0.5 * tk, headRoll: -0.13 * tk, lookX: 0.4 * tk, lookY: 0.45 * tk, headPitch: -0.08 * tk,
      armR: { reach: [lerp(-0.6, th2.reach[0], tk), lerp(0.5, th2.reach[1], tk), lerp(0.25, th2.reach[2], tk)], pole: th2.pole, point: tk, wx: th2.wx * tk },
      armL: { reach: [0.62, 0.5, 0.25] },
    }, 7);
    bath.brush.visible = false;
    const k = easeInOut(inv(43.9, 45.9, t));
    pov(lerp(0.2, 0.05, k), 3.65, lerp(3.0, 2.6, k), V(0, 3.3, 0), 36);
    const head = scr(AFF_HEAD());
    [[44.0, -270, -230, '#ffcf33', -12], [44.3, 260, -280, CYAN, 10], [44.6, 300, -40, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, 45.85);
      ov.html('eq' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    return bath;
  }],
  // Outro — The Curious Affan logo
  [45.9, DURATION, (t) => {
    const k = easeOut(inv(45.9, 46.6, t));
    outro.aff.root.position.set(0, 0, 0);
    const up = POSES.thumbsUpR.armR;
    outro.aff.pose({ armR: { ...up, thumb: 1 }, armL: { reach: [0.62, 1.05, 0.55], pole: [1, -1, -0.3] }, smile: 1, grin: 0.7, teeth: 1, blink: blinkAt(t, 9), headRoll: 0.06, headYaw: -0.06 });
    const hand = wpos(outro.aff.parts.arms.L.hand);
    holdBrush(outro.brush, hand, hand.clone().add(V(-0.12, 1, 0.15)), V(0, 0, 1));
    lookCam(cam, V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash((1 - inv(45.9, 46.25, t)) * 1.0);
    const g = ov.g;
    const ra = inv(46.0, 46.6, t);
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
    const ic = pop(t, 46.5, 99);
    ov.html('oTooth', IC.sparkleTooth(), { x: 175, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.75, r: -10 });
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    ov.html('oQ2', ICONS.qmark(NAVY), { x: 220, y: 760 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.6, r: -12 });
    const l1 = pop(t, 46.2, 99), l2 = pop(t, 46.4, 99), l3 = pop(t, 46.6, 99);
    drawLogo(ov, { k: [l1, l2, l3], star: pop(t, 46.8, 99) });
    const tg = pop(t, 47.2, 99);
    ov.html('tagline', `<div style="font-family:'Baloo 2';font-weight:800;font-size:50px;color:#fff;text-shadow:0 5px 0 rgba(28,39,82,0.55);white-space:nowrap">Little Questions. Big Discoveries!</div>`, { x: W / 2, y: 1560, o: tg.o, s: tg.s });
    return outro;
  }],
];

function frame(t) {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  const world = shot[2](t);
  if (world.sky) world.sky.position.copy(cam.position);
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(0.28);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan grinning at the mirror with his toothbrush,
// a magnifier-lens inset of Tooth City (plaque + friendly bacteria), big title,
// episode badge and the logo. Key elements stay inside the centre 3:4 area.
const THUMB = { bug: 4 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  // 1) Tooth City macro (same framing as the bacteria shot) into an offscreen copy
  const t0 = 14.6;
  cityState(t0, { affan: false });
  const bt = C.bacteria[THUMB.bug].position.clone();
  lookCam(cam, bt.clone().addScaledVector(C.bacteria[THUMB.bug].userData.n, 3.4).add(V(0, 0.9, 0.6)), bt, 40);
  C.sky.position.copy(cam.position);
  renderer.render(C.scene, cam);
  const snap = document.createElement('canvas');
  snap.width = W;
  snap.height = H;
  snap.getContext('2d').drawImage(renderer.domElement, 0, 0);
  // 2) bathroom: Affan grinning, toothbrush up
  const t = 2.0;
  bathState(t);
  povMode(true);
  A.pose({ blink: 0, talk: 0, grin: 1, teeth: 1, smile: 1, brow: 0.8, wow: 0, headRoll: -0.08, lookX: 0.15, lookY: 0.1,
    armL: { reach: [0.55, 1.15, 0.6], pole: [1, -1, -0.3] }, armR: { ...POSES.thumbsUpR.armR, thumb: 1 } });
  const hand = wpos(A.parts.arms.L.hand);
  holdBrush(bath.brush, hand, hand.clone().add(V(0.1, 1, 0.2)), V(0, 0, 1));
  bath.paste.visible = true;
  bath.paste.scale.set(0.42, 0.3, 0.32);
  pov(0.4, 3.7, 5.4, V(0.35, 3.05, 0), 38);
  renderer.render(bath.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 760);
  top.addColorStop(0, 'rgba(12,30,70,0.8)');
  top.addColorStop(1, 'rgba(12,30,70,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 760);
  const bot = g.createLinearGradient(0, H - 640, 0, H);
  bot.addColorStop(0, 'rgba(12,30,70,0)');
  bot.addColorStop(0.45, 'rgba(12,30,70,0.8)');
  bot.addColorStop(1, 'rgba(12,30,70,0.95)');
  g.fillStyle = bot;
  g.fillRect(0, H - 640, W, 640);
  ov.vignette(0.25);
  // magnifier inset
  const ix = 245, iy = 1150, ir = 180;
  g.save();
  g.fillStyle = 'rgba(10,16,50,0.3)';
  g.beginPath();
  g.arc(ix, iy + 14, ir + 36, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(ix, iy, ir, 0, Math.PI * 2);
  g.clip();
  g.drawImage(snap, 140, 560, 800, 800, ix - ir, iy - ir, ir * 2, ir * 2);
  g.restore();
  g.save();
  g.lineCap = 'round';
  g.lineWidth = 58;
  g.strokeStyle = NAVY;
  g.beginPath();
  g.moveTo(ix + ir * 0.72, iy + ir * 0.72);
  g.lineTo(ix + ir * 1.15, iy + ir * 1.15);
  g.stroke();
  g.lineWidth = 34;
  g.strokeStyle = '#ffc928';
  g.stroke();
  g.lineWidth = 30;
  g.strokeStyle = NAVY;
  g.beginPath();
  g.arc(ix, iy, ir + 12, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 15;
  g.strokeStyle = '#ffc928';
  g.stroke();
  g.restore();
  ov.tag('thPlak', 'PLAK!', { x: ix, y: iy - ir - 45, r: -6 }, { bg: '#f2a91c', small: true });
  ov.tag('thBadge', 'EPISOD 10', { x: W / 2, y: 290 }, { bg: CYAN, small: true });
  ov.bubble('thTitle', 'KENAPA KITA KENA\nGOSOK GIGI?', { x: W / 2, y: 470, r: -2 }, { size: 104 });
  const m = scr(wpos(A.parts.mouth));
  ov.star(m.x + 60, m.y - 20, 56, 1, '#ffffff', 0.3);
  ov.star(m.x - 64, m.y + 4, 34, 0.9, '#bff3ff', 0.8);
  ov.sparkles(1.3, { n: 14, seed: 17, y: 700, h: 700, size: 24 });
  drawLogo(ov, { cx: W / 2 + 40, y: 1500, scale: 0.48 });
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
