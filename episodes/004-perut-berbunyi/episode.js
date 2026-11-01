// THE CURIOUS AFFAN — Episode 004: "Kenapa Perut Kita Berbunyi Bila Lapar?"
// Every shot is a pure function of time. Shot times below are NARRATION time
// n (seconds into audio/narration.mp3); the video starts OFF seconds earlier
// with a short silent beat of Affan playing.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeInOut, keys, wobble, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, bubbleSVG } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildLivingRoom, buildGutWorld, buildCloseUp, buildOutro } from './worlds.js';

const FPS = 30;
export const OFF = 0.6; // narration starts this many seconds into the video
const DURATION = 49.0;
const N_END = DURATION - OFF;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const room = buildLivingRoom();
const gut = buildGutWorld();
const cu = buildCloseUp();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 3000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (n) => clamp(env.at(n) * 1.2);
const scr = (p) => toScreen(p, cam);
function lookCam(pos, look, fov = 50, shake = 0, n = 0) {
  cam.position.copy(pos);
  if (shake) cam.position.add(V(Math.sin(n * 61) * shake, Math.sin(n * 47 + 1) * shake, 0));
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(look);
  cam.updateMatrixWorld(true);
}
const mixArm = (a, b, k) => ({ ...b, reach: a.reach.map((v, i) => lerp(v, b.reach[i], k)), point: lerp(a.point ?? 0, b.point ?? 0, k), thumb: lerp(a.thumb ?? 0, b.thumb ?? 0, k) });

// ------------------------------------------------------------- arm poses
// torso-local reach targets (x = Affan's left, y up from the waist, z forward)
const ARM = {
  restL: { reach: [0.72, -0.06, 0.1], pole: [0.2, 0, -1] },
  restR: { reach: [-0.72, -0.06, 0.1], pole: [-0.2, 0, -1] },
  tummyL: { reach: [0.2, 0.36, 0.66], pole: [1, -0.5, -0.5], wz: -0.3 },
  tummyR: { reach: [-0.2, 0.42, 0.66], pole: [-1, -0.5, -0.5], wz: 0.3 },
  openL: { reach: [1.05, 1.55, 0.35], pole: [1, -0.6, -0.4] },
  openR: { reach: [-1.05, 1.55, 0.35], pole: [-1, -0.6, -0.4] },
  shhR: { reach: [-0.04, 1.4, 0.86], pole: [-0.6, -1, 0.1], point: 1, wx: -0.25 },
  earL: { reach: [0.92, 1.82, 0.32], pole: [1, -1, 0.1], wy: 0.6 },
  upR: { reach: [-0.5, 1.8, 0.5], pole: [-1, -0.6, -0.3], point: 1 },
  pointL: { reach: [0.95, 1.4, 0.75], pole: [1, -1, -0.4], point: 1 },
  gadgetR: { reach: [-0.22, 0.95, 0.8], pole: [-1, -0.8, -0.2] },
  hipsL: { reach: [0.68, 0.38, 0.05], pole: [1, 0.2, -1] },
  hipsR: { reach: [-0.68, 0.38, 0.05], pole: [-1, 0.2, -1] },
};

// ------------------------------------------------------------ overlay art
const C = { cyan: '#2ec4e8', navy: '#17256b', peach: '#ff9470', yellow: '#ffc928', white: '#ffffff' };
const MONSTER = (fill = '#a98bff', eyes = true, op = 1) => `<svg width="300" height="280" viewBox="0 0 300 280" style="opacity:${op}">
  <path d="M60 250 C20 250 20 190 35 150 C40 80 90 40 150 40 C210 40 260 80 265 150 C280 190 280 250 240 250 C225 270 205 250 195 262 C180 276 165 250 150 262 C135 276 120 250 105 262 C92 272 75 250 60 250 Z" fill="${fill}" stroke="${C.navy}" stroke-width="10" stroke-linejoin="round"/>
  <path d="M95 52 L80 10 L120 42 Z M205 52 L220 10 L180 42 Z" fill="#ffc928" stroke="${C.navy}" stroke-width="8" stroke-linejoin="round"/>
  ${eyes ? `<circle cx="115" cy="130" r="30" fill="#fff" stroke="${C.navy}" stroke-width="7"/><circle cx="185" cy="130" r="30" fill="#fff" stroke="${C.navy}" stroke-width="7"/>
  <circle cx="122" cy="136" r="13" fill="${C.navy}"/><circle cx="178" cy="136" r="13" fill="${C.navy}"/><circle cx="126" cy="131" r="4" fill="#fff"/><circle cx="182" cy="131" r="4" fill="#fff"/>
  <path d="M118 185 Q150 210 182 185" fill="none" stroke="${C.navy}" stroke-width="8" stroke-linecap="round"/><path d="M140 194 L146 206 L152 196 Z" fill="#fff"/>
  <ellipse cx="85" cy="170" rx="14" ry="9" fill="#ff9cc2" opacity="0.8"/><ellipse cx="215" cy="170" rx="14" ry="9" fill="#ff9cc2" opacity="0.8"/>` : ''}</svg>`;
const THOUGHT = `<svg width="520" height="460" viewBox="0 0 520 460">
  <circle cx="70" cy="430" r="16" fill="#fff" stroke="${C.navy}" stroke-width="7"/><circle cx="110" cy="385" r="26" fill="#fff" stroke="${C.navy}" stroke-width="7"/>
  <path d="M150 330 C80 330 70 250 120 230 C90 160 170 110 220 140 C240 70 340 70 360 130 C420 100 490 150 460 215 C510 250 480 330 420 320 C400 370 310 370 290 335 C250 370 170 360 150 330 Z" fill="#fff" stroke="${C.navy}" stroke-width="9" stroke-linejoin="round"/></svg>`;
const ICON = {
  wave: `<svg width="64" height="40" viewBox="0 0 64 40"><path d="M4 22 Q14 6 24 22 T44 22 T64 22" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/></svg>`,
  bubbles: `<svg width="56" height="50" viewBox="0 0 56 50"><circle cx="18" cy="30" r="14" fill="none" stroke="#fff" stroke-width="6"/><circle cx="40" cy="14" r="9" fill="none" stroke="#fff" stroke-width="5"/><circle cx="44" cy="38" r="6" fill="#fff"/></svg>`,
  sound: `<svg width="60" height="50" viewBox="0 0 60 50"><path d="M6 18 H16 L30 6 V44 L16 32 H6 Z" fill="#fff"/><path d="M38 15 Q46 25 38 35 M46 8 Q60 25 46 42" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/></svg>`,
};
const chip = (text, icon, bg) => `<div style="display:flex;align-items:center;gap:14px;padding:12px 28px 14px;border-radius:999px;background:${bg};box-shadow:0 7px 0 rgba(0,0,0,0.22),0 0 0 6px #fff;font-family:'Baloo 2';font-weight:800;font-size:46px;color:#fff;line-height:1;white-space:nowrap">${icon}<span>${text}</span></div>`;
const DOWN = `<svg width="60" height="50" viewBox="0 0 60 50"><path d="M10 10 L30 38 L50 10" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CHECK = `<svg width="86" height="86" viewBox="0 0 86 86"><circle cx="43" cy="43" r="40" fill="#3fca6b" stroke="#fff" stroke-width="6"/><path d="M24 44 L38 58 L63 30" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const BOWL = (full) => `<svg width="220" height="170" viewBox="0 0 220 170">
  ${full ? `<ellipse cx="110" cy="78" rx="80" ry="46" fill="#fffaf0" stroke="${C.navy}" stroke-width="7"/><circle cx="90" cy="60" r="7" fill="#ffe7c2"/><circle cx="130" cy="52" r="6" fill="#ffe7c2"/>
  <ellipse cx="140" cy="68" rx="24" ry="17" fill="#fff" stroke="${C.navy}" stroke-width="5"/><circle cx="140" cy="68" r="10" fill="#ffc928"/>` : `<g stroke="#9fb3d9" stroke-width="7" stroke-linecap="round" fill="none"><path d="M80 60 Q70 40 80 22"/><path d="M110 56 Q100 36 110 18"/><path d="M140 60 Q130 40 140 22"/></g>`}
  <path d="M20 86 H200 C196 140 160 162 110 162 C60 162 24 140 20 86 Z" fill="${C.cyan}" stroke="${C.navy}" stroke-width="8" stroke-linejoin="round"/>
  <path d="M40 104 H180" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity="0.7"/></svg>`;
const CLOCK = `<svg width="90" height="90" viewBox="0 0 90 90"><circle cx="45" cy="45" r="38" fill="#fff" stroke="${C.navy}" stroke-width="7"/><path d="M45 22 V45 L62 54" fill="none" stroke="${C.navy}" stroke-width="7" stroke-linecap="round"/></svg>`;
const card = (title, body, bg) => `<div style="width:400px;padding:22px 0 26px;border-radius:44px;background:#fff;box-shadow:0 12px 0 rgba(0,0,0,0.2),0 0 0 8px ${bg};text-align:center;position:relative">
  <div style="height:190px;display:flex;align-items:center;justify-content:center;gap:4px">${body}</div>
  <div style="display:inline-block;margin-top:8px;padding:8px 28px 12px;border-radius:999px;background:${bg};font-family:'Baloo 2';font-weight:800;font-size:50px;color:#fff;line-height:1">${title}</div>
  <div style="position:absolute;right:-26px;top:-30px">${CHECK}</div></div>`;

// expanding sound-wave arcs on both sides of a point
function soundRings(x, y, n, { a = 1, color = '#ffffff', glow = '#7ff3ff', rmax = 300, r0 = 60, speed = 1.6, spread = 0.75, w = 12 } = {}) {
  if (a <= 0) return;
  const g = ov.g;
  g.save();
  g.lineCap = 'round';
  for (let k = 0; k < 4; k++) {
    const ph = (n * speed + k / 4) % 1;
    const r = r0 + ph * rmax;
    const al = a * Math.sin(ph * Math.PI) * 0.95;
    for (const side of [0, Math.PI]) {
      g.globalAlpha = clamp(al);
      g.strokeStyle = glow;
      g.lineWidth = w + 10;
      g.shadowColor = glow;
      g.shadowBlur = 20;
      g.beginPath();
      g.arc(x, y, r, side - spread, side + spread);
      g.stroke();
      g.shadowBlur = 0;
      g.strokeStyle = color;
      g.lineWidth = w;
      g.stroke();
    }
  }
  g.restore();
}
// little wiggly "rumble" lines around the tummy
function rumbleLines(x, y, n, a = 1, scale = 1) {
  if (a <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = clamp(a);
  g.lineCap = 'round';
  for (const [dx, dy, rot] of [[-1, -0.5, -0.4], [-1.15, 0.25, 0.1], [1, -0.5, 0.4], [1.15, 0.25, -0.1], [0, -1.05, 0]]) {
    g.save();
    g.translate(x + dx * 120 * scale, y + dy * 100 * scale);
    g.rotate(rot + (dx === 0 ? Math.PI / 2 : 0));
    const j = Math.sin(n * 40 + dx * 3) * 4;
    for (const [col, lw] of [['#ffffff', 16], ['#ff8a3d', 8]]) {
      g.strokeStyle = col;
      g.lineWidth = lw * scale;
      g.beginPath();
      for (let i = 0; i <= 12; i++) {
        const u = i / 12;
        const px = (dx === 0 ? 0 : 0) + Math.sin(u * Math.PI * 3 + n * 20) * 9 * scale + j;
        const py = (u - 0.5) * 70 * scale;
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.stroke();
    }
    g.restore();
  }
  g.restore();
}
function kruk(id, n, a, b, x, y, size = 150) {
  const q = pop(n, a, b, { fin: 0.3, from: 0.2 });
  if (q.o <= 0) return;
  ov.bubble(id, 'KRUUUKKK!', { x: x + Math.sin(n * 53) * 5, y: y + Math.sin(n * 41) * 5, o: q.o, s: q.s * (1 + 0.04 * Math.sin(n * 30)), r: 4 * Math.sin(n * 22) }, { size, top: '#fff27a', bot: '#ffa51f' });
}
function banner(id, text, n, a, b, y = 330, style = {}, size = 112) {
  const q = pop(n, a, b);
  if (q.o <= 0) return;
  ov.bubble(id, text, { x: W / 2, y: y + Math.sin(n * 3) * 5, o: q.o, s: q.s }, { size, ...style });
}
function pinTag(id, text, p, n, a, b, style, dy = -90, dx = 0, y0 = 300, y1 = 1300) {
  const q = pop(n, a, b);
  if (q.o <= 0 || !p.visible) return;
  ov.tag(id, text, { x: clamp(p.x + dx, 170, 910), y: clamp(p.y + dy, y0, y1), o: q.o, s: q.s }, style);
}
function recap(n, a, b, x = W / 2, y = 330, gap = 132) {
  const items = [['OTOT BERGERAK', ICON.wave, '#ff8a5b'], ['GAS + CECAIR', ICON.bubbles, '#1fa9d6'], ['BUNYI PERUT', ICON.sound, '#f2a91c']];
  items.forEach(([t, ic, bg], i) => {
    const q = pop(n, a + i * 0.28, b);
    ov.html('rc' + i, chip(t, ic, bg), { x, y: y + i * gap, o: q.o, s: q.s });
    if (i < 2) {
      const d = pop(n, a + i * 0.28 + 0.18, b);
      ov.html('rcA' + i, DOWN, { x, y: y + i * gap + gap / 2 + 4, o: d.o, s: d.s * 0.7 });
    }
  });
}

// ------------------------------------------------------------ world rigs
const roomAff = room.aff;
function roomPose(n, p) {
  roomAff.pose({ blink: blinkAt(n, 1), talk: talk(n), ...p });
}
function roomScene(n, { scale = 1, x = 0, z = 0, gadget = false } = {}) {
  roomAff.root.scale.setScalar(scale);
  roomAff.root.position.set(x, 0, z);
  room.gadget.visible = gadget;
  room.portal.visible = false;
  // the block Affan was placing sits on the tower once placed
  room.handBlock.position.set(1.45, 1.86 + 0.31, 0.55);
  room.handBlock.rotation.set(0, -0.1, 0);
  return { scene: room.scene };
}
const roomHead = () => roomAff.parts.head.getWorldPosition(V(0, 0, 0));
const roomBelly = () => roomAff.parts.torso.localToWorld(V(0, 0.4, 0.55));

const gAff = gut.aff;
// peristaltic waves on the big model; k = strength 0..1
function gutWaves(n, k = 0.4, rumble = 0) {
  const spec = { eso: [10, 1.4, 4, 0.18], stomach: [12, 2.0, 4.2, 0.16], small: [7, 0.9, 5, 0.3], large: [12, 1.6, 4, 0.16] };
  for (const [name, tube] of Object.entries(gut.tubes)) {
    const [spacing, width, speed, amp] = spec[name];
    const L = tube.len;
    const con = (s) => {
      const ph = (((s * L - n * speed) % spacing) + spacing) % spacing;
      return Math.exp(-(((ph - spacing / 2) / width) ** 2));
    };
    const rum = name === 'stomach' || name === 'small' ? rumble : 0;
    tube.update(
      (s) => 1 - amp * k * con(s) + 0.05 * k * con(s + width / L * 1.6) + rum * 0.07 * Math.sin(n * 38 + s * 30),
      (s) => {
        const c = con(s) * k;
        return [1, 1 - 0.18 * c, 1 - 0.38 * c];
      },
    );
  }
}
function gutScene(n, k = 0.35, rumble = 0) {
  gut.update(n);
  gutWaves(n, k, rumble);
  return { scene: gut.scene };
}
const gutAffPose = (n, p) => gAff.pose({ blink: blinkAt(n, 2), talk: talk(n), ...p });
const affWorld = (lx, ly, lz) => gAff.parts.torso.localToWorld(V(lx, ly, lz));
const stomachPt = () => gut.tubes.stomach.at(0.38);
const yawTo = (target) => {
  const p = gut.platform.position;
  return Math.atan2(target.x - p.x, target.z - p.z);
};

// close-up: wave positions (fraction of tube length, top -> bottom)
const CU0 = 19.86;
const WAVE_SPEED = 0.36;
const waveAt = (n, i) => (((n - CU0) * WAVE_SPEED + i * 0.62 + 0.1) % 1.24) - 0.12;
function cuContraction(s, n) {
  let c = 0;
  for (let i = 0; i < 2; i++) c = Math.max(c, Math.exp(-(((s - waveAt(n, i)) / 0.055) ** 2)));
  return c;
}
function cuParticles(n) {
  const dt = 1 / 60;
  const n0 = CU0;
  for (const p of cu.parts) {
    let s = p.s0 * 1.1 - 0.05;
    for (let tt = n0; tt < n; tt += dt) {
      let push = 0;
      for (let i = 0; i < 2; i++) {
        const d = s - waveAt(tt, i);
        if (d > -0.02) push = Math.max(push, Math.exp(-(((d - 0.07) / 0.08) ** 2)));
      }
      s += (0.02 + WAVE_SPEED * 0.95 * push) * dt;
      if (s > 1.08) s -= 1.16;
    }
    p.s = s;
  }
}
function cuScene(n) {
  cu.update(n);
  const mult = (s) => 1 - 0.6 * cuContraction(s, n) + 0.08 * cuContraction(s - 0.09, n);
  const tint = (s) => {
    const c = cuContraction(s, n);
    return [1, 1 - 0.25 * c, 1 - 0.5 * c];
  };
  cu.inner.update(mult, tint);
  cu.outer.update(mult, tint);
  cuParticles(n);
  for (const p of cu.parts) {
    const s = clamp(p.s, 0, 1);
    const r = cu.outer.radiusAt(s) / 2.15;
    const vis = p.s > -0.04 && p.s < 1.04;
    p.m.visible = vis;
    cu.outer.at(s, p.a + Math.sin(n * 1.3 + p.ph) * 0.3, p.rho * r * 0.95, p.m.position);
    const sz = p.size * (0.55 + 0.45 * clamp(r * 1.2));
    p.m.scale.set(sz * (1 + 0.15 * (1 - r)), sz * (1 - 0.1 * (1 - r)), sz);
  }
  return { scene: cu.scene };
}

// =================================================================== SHOTS
const SHOTS = [
  // A — living room hook: playing with blocks, then KRUUUKKK!
  [-OFF, 5.62, (n) => {
    const w = roomScene(n);
    const place = keys(n, [[-0.6, 0], [-0.15, 1]]);
    const tum = keys(n, [[-0.02, 0], [0.22, 1]], easeOut);
    const hop = n > 0 && n < 0.45 ? Math.sin((n / 0.45) * Math.PI) * 0.18 : 0;
    const look = n < 1.08 ? 0 : 1;
    const thinkUp = keys(n, [[3.3, 0], [3.7, 1]]);
    // while placing, the block rides in the left hand
    let armL = mixArm(ARM.restL, ARM.tummyL, tum);
    if (n < 0) {
      armL = { reach: [lerp(0.85, 1.22, place), lerp(1.05, 1.32, place), lerp(0.45, 0.6, place)], pole: [1, -1, -0.3] };
    }
    roomPose(n, {
      yaw: n < 0 ? 0.55 : keys(n, [[0, 0.55], [0.3, 0.05]]), bob: -hop * 0.3,
      wow: keys(n, [[0, 0], [0.12, 0.9], [0.9, 0.9], [1.1, 0]]), brow: keys(n, [[0, 0], [0.15, 1], [5.5, 0.7]]), smile: n < 0 ? 1 : 0.4,
      headPitch: lerp(lerp(n < 0 ? -0.05 : 0.0, 0.4, look * keys(n, [[1.08, 0], [1.4, 1], [3.2, 1], [3.6, 0]])), -0.12, thinkUp),
      lookY: lerp(look * keys(n, [[1.08, 0], [1.4, -0.7], [3.2, -0.7], [3.6, 0]]), 0.55, thinkUp), lookX: lerp(0, -0.6, thinkUp),
      headYaw: lerp(0, -0.25, thinkUp), headRoll: 0.08 * thinkUp,
      armL, armR: mixArm(ARM.restR, ARM.tummyR, tum),
    });
    if (n < -0.15) {
      room.handBlock.position.copy(roomAff.parts.arms.L.hand.getWorldPosition(V(0, 0, 0))).add(V(0.0, 0.12, 0.08));
      room.handBlock.rotation.set(0, 0.2, 0);
    }
    const k = easeInOut(inv(1.0, 5.6, n));
    lookCam(V(lerp(0.4, 0.3, k), lerp(2.7, 2.6, k), lerp(8.6, 7.3, k)), V(0.15, lerp(2.15, 2.25, k), 0), 42, n > 0 && n < 0.8 ? 0.03 : 0, n);
    const belly = scr(roomBelly());
    rumbleLines(belly.x, belly.y, n, keys(n, [[0, 0], [0.08, 1], [1.0, 1], [1.4, 0]]), 1.6);
    kruk('kA', n, 0.02, 1.55, W / 2, 380, 160);
    // hook title + episode tag
    const tq = pop(n, 1.65, 3.35, { fin: 0.45 });
    ov.bubble('hook', 'KENAPA PERUT\nBERBUNYI?', { x: W / 2, y: 400 + Math.sin(n * 3) * 6, o: tq.o, s: tq.s }, { size: 104, top: '#9ff0ff', bot: C.cyan });
    const eq = pop(n, 1.9, 3.35);
    ov.tag('ep', 'EPISOD 4', { x: W / 2, y: 262, o: eq.o, s: eq.s }, { bg: C.navy, small: true });
    // imagined monster in a thought bubble
    const head = scr(roomHead());
    const th = pop(n, 3.35, 5.6, { fin: 0.4 });
    if (th.o > 0) {
      const bx = clamp(head.x + 200, 300, 780), by = clamp(head.y - 380, 330, 900);
      ov.html('thought', THOUGHT, { x: bx, y: by, o: th.o, s: th.s * 0.95 });
      ov.html('tMon', MONSTER(), { x: bx + 30, y: by - 20 + Math.sin(n * 4) * 8, o: th.o, s: th.s * 0.62, r: Math.sin(n * 3) * 5 });
      const qm = pop(n, 3.6, 5.6);
      ov.html('tQ', ICONS.qmark(C.yellow), { x: bx + 205, y: by - 120, o: qm.o, s: qm.s * 0.6, r: 12 });
    }
    return w;
  }],
  // B — "Jom, kita pergi tengok." the shrinking gadget
  [5.62, 7.14, (n) => {
    const w = roomScene(n, { gadget: true });
    const out = keys(n, [[5.62, 0], [6.0, 1]], easeOut);
    const press = keys(n, [[6.3, 0], [6.6, 1], [6.9, 1], [7.05, 0.8]]);
    const k = easeInOut(inv(5.62, 7.14, n));
    lookCam(V(lerp(0.7, 0.4, k), lerp(2.75, 2.65, k), lerp(7.0, 5.9, k)), V(0.05, 2.15, 0), 42);
    const wob = Math.sin(n * 6) * 0.03;
    const base = { yaw: 0, smile: 1, brow: 0.6, headPitch: 0.04 + wob + 0.22 * press, headRoll: -0.05, lookY: lerp(0, -0.55, press) };
    roomPose(n, { ...base, armR: mixArm(ARM.restR, ARM.gadgetR, out) });
    roomAff.root.updateMatrixWorld(true);
    const hand = roomAff.parts.arms.R.hand.getWorldPosition(V(0, 0, 0));
    const gd = room.gadget;
    gd.position.copy(hand).add(V(0.02, 0.2, 0.12));
    gd.lookAt(cam.position.clone().setY(gd.position.y + 0.5));
    gd.scale.setScalar(lerp(0.4, 1, out));
    gd.updateMatrixWorld(true);
    const btn = roomAff.toTorso(gd.userData.btn.getWorldPosition(V(0, 0, 0)));
    const pressL = { reach: [btn[0] + 0.05, btn[1] - 0.1, btn[2] + 0.02], pole: [1, -1, -0.3], point: 1 };
    roomPose(n, { ...base, armR: mixArm(ARM.restR, ARM.gadgetR, out), armL: mixArm(ARM.restL, pressL, press) });
    gd.userData.tg.scale.setScalar(0.6 + 1.6 * press + 0.2 * Math.sin(n * 20));
    gd.userData.screen.material.color.setHSL(0.5 + 0.1 * Math.sin(n * 8), 1, 0.75);
    const sk = inv(6.55, 7.1, n);
    const gp = scr(gd.position);
    ov.swirl(n, gp.x, gp.y, sk, 5);
    ov.flash(inv(6.92, 7.14, n) ** 2);
    return w;
  }],
  // C — "Wah, Affan dah jadi kecil." tiny Affan among giant toys
  [7.14, 9.8, (n) => {
    const S = 0.15;
    const AX = 1.05, AZ = 1.5;
    const w = roomScene(n, { scale: S, x: AX, z: AZ });
    const hands = keys(n, [[8.2, 0], [8.5, 1], [9.2, 1], [9.45, 0]]);
    const handsL = { reach: [0.32, 1.0, 0.75], pole: [1, -1, -0.3] }, handsR = { reach: [-0.32, 1.0, 0.75], pole: [-1, -1, -0.3] };
    const open = keys(n, [[7.14, 0.6], [7.3, 1], [7.9, 1], [8.2, 0]]);
    roomPose(n, {
      yaw: keys(n, [[7.14, 0], [9.5, -0.25]]), smile: 1, wow: keys(n, [[7.14, 0.3], [7.25, 1], [7.85, 1], [8.1, 0]]), brow: 1,
      headPitch: lerp(-0.25, 0.45, hands), lookY: lerp(0.5, -0.6, hands), headYaw: keys(n, [[9.3, 0], [9.6, 0.35]]),
      armL: hands > 0 ? mixArm(ARM.openL, handsL, hands) : mixArm(ARM.restL, ARM.openL, open),
      armR: hands > 0 ? mixArm(ARM.openR, handsR, hands) : mixArm(ARM.restR, ARM.openR, open),
    });
    const k = easeInOut(inv(7.14, 9.8, n));
    lookCam(V(lerp(AX + 0.35, AX + 0.15, k), lerp(0.2, 0.24, k), lerp(AZ + 1.75, AZ + 1.45, k)), V(lerp(AX + 0.2, AX + 0.1, k), lerp(0.62, 0.55, k), AZ - 1.2), 55);
    // portal opens around tiny Affan
    const pk = inv(9.2, 9.65, n);
    if (pk > 0) {
      room.portal.visible = true;
      room.portal.position.set(AX, 0.3, AZ);
      room.portal.scale.setScalar(0.34 * easeOut(pk) + 0.02 * Math.sin(n * 30));
      room.portal.rotation.z = n * 3;
      room.portalDisc.material.opacity = 0.35 * pk;
    }
    ov.flash(1 - inv(7.14, 7.5, n));
    ov.sparkles(n, { n: 18, seed: 4, y: 300, h: 900, a: 0.7 * (1 - inv(7.6, 8.4, n)) + inv(9.1, 9.5, n) });
    const kq = pop(n, 8.85, 9.75);
    ov.bubble('kecil', 'KECIL!', { x: W / 2 + 160, y: 420, o: kq.o, s: kq.s, r: 6 }, { size: 120, top: '#ffe45c', bot: '#ff9f1c' });
    const pp = scr(V(AX, 0.3, AZ));
    ov.swirl(n, pp.x, pp.y, inv(9.25, 9.8, n), 9);
    ov.flash(inv(9.6, 9.8, n) ** 2, '200,250,255');
    return w;
  }],
  // D — "Besarnya perut ni." reveal of the learning world
  [9.8, 11.8, (n) => {
    const w = gutScene(n, 0.3);
    gutAffPose(n, {
      yaw: 0.12, wow: keys(n, [[9.8, 0.4], [10.0, 1], [10.9, 1], [11.2, 0]]), smile: 1, brow: 1, headPitch: -0.35, lookY: 0.6,
      armL: ARM.openL, armR: ARM.openR,
    });
    const k = easeInOut(inv(9.8, 11.8, n));
    lookCam(V(lerp(-5.4, -3.0, k), lerp(2.6, 7.5, k), lerp(22.5, 44, k)), V(lerp(-6.0, -0.5, k), lerp(2.5, 9.5, k), lerp(17, 3, k)), lerp(44, 56, k));
    ov.flash((1 - inv(9.8, 10.2, n)) * 0.95, '200,250,255');
    ov.sparkles(n, { n: 20, seed: 6, y: 260, h: 800, a: 0.6 });
    const bq = pop(n, 10.05, 11.75);
    ov.bubble('besar', 'BESARNYA!', { x: W / 2, y: 330, o: bq.o, s: bq.s }, { size: 120, top: '#9ff0ff', bot: C.cyan });
    return w;
  }],
  // E — "Shhh, korang dengar tak?"
  [11.8, 13.98, (n) => {
    const w = gutScene(n, 0.3);
    const shh = keys(n, [[11.8, 0], [11.98, 1], [12.4, 1], [12.62, 0]]);
    const ear = keys(n, [[12.5, 0], [12.8, 1], [13.98, 1]]);
    gutAffPose(n, {
      yaw: 0.15, smile: lerp(0.5, 0.8, ear), brow: 0.6, headRoll: -0.22 * ear, headYaw: -0.15 * ear, lookX: 0.7 * ear, lookY: 0.15,
      talk: shh > 0.5 ? talk(n) * 0.25 : talk(n), lean: 0.05 * ear,
      armR: mixArm(ARM.restR, ARM.shhR, shh), armL: mixArm(ARM.restL, ARM.earL, ear),
    });
    const k = easeInOut(inv(11.8, 13.98, n));
    lookCam(V(lerp(-4.6, -4.9, k), lerp(3.2, 3.0, k), lerp(25.5, 24.0, k)), V(-6.0, lerp(2.0, 2.1, k), 17), 40);
    const head = scr(affWorld(0, 1.9, 0));
    soundRings(head.x, head.y - 40, n, { a: ear * 0.6, rmax: 220, r0: 170, speed: 0.9, spread: 0.5, w: 8 });
    const sq = pop(n, 11.85, 12.75);
    ov.bubble('shh', 'SHHH...', { x: W / 2 - 170, y: 420, o: sq.o, s: sq.s, r: -6 }, { size: 110, top: '#ffffff', bot: '#cfe9ff' });
    return w;
  }],
  // F — "Kruuukkk, kruuukkk." the stomach rumbles
  [13.98, 15.84, (n) => {
    const r = Math.max(keys(n, [[14.0, 0], [14.1, 1], [14.6, 0.5], [14.75, 1], [15.5, 0.4], [15.84, 0]]), 0);
    const w = gutScene(n, 0.45, r);
    const hop = n > 14.02 && n < 14.45 ? Math.sin(((n - 14.02) / 0.43) * Math.PI) * 0.25 : 0;
    gutAffPose(n, {
      yaw: yawTo(V(4, 16, 0)) - 0.3, bob: hop, wow: keys(n, [[14.0, 0], [14.12, 1], [15.5, 1], [15.8, 0.3]]), brow: 1, headPitch: -0.25, lookY: 0.4,
      armL: mixArm(ARM.restL, ARM.openL, 0.6), armR: mixArm(ARM.restR, ARM.openR, 0.6),
      legL: { x: -0.3 * hop, knee: 0.6 * hop }, legR: { x: -0.3 * hop, knee: 0.6 * hop },
    });
    lookCam(V(-15, 3.5, 34), V(1.5, 12.5, 2), 54, 0.12 * r, n);
    const st = scr(stomachPt());
    soundRings(st.x, st.y, n, { a: r, rmax: 380, r0: 170, speed: 1.8 });
    kruk('kF1', n, 14.02, 14.72, W / 2, 360, 150);
    kruk('kF2', n, 14.74, 15.82, W / 2, 360, 165);
    return w;
  }],
  // G — "Oh, rupa-rupanya otot dalam perut dan usus kita..." waves on the model
  [15.84, 19.86, (n) => {
    const k0 = inv(15.84, 17.0, n);
    const w = gutScene(n, 0.35 + 0.65 * k0);
    const pt = keys(n, [[16.0, 0], [16.4, 1], [19.86, 1]]);
    gutAffPose(n, {
      yaw: 1.0, wow: keys(n, [[15.84, 0], [15.95, 0.8], [16.5, 0.8], [16.8, 0]]), smile: 1, brow: 0.8, headPitch: -0.3, lookY: 0.4, headYaw: -0.25,
      armL: mixArm(ARM.restL, { reach: [0.3, 1.75, 0.78], pole: [1, -1, -0.3], point: 1 }, pt),
    });
    const k = easeInOut(inv(15.84, 19.86, n));
    lookCam(V(lerp(-5.0, -1.5, k), lerp(4.0, 7.0, k), lerp(34, 31, k)), V(lerp(-3.2, 0.5, k), lerp(8.0, 10.0, k), lerp(6, 2, k)), lerp(54, 48, k));
    banner('otot1', 'OTOT BERGERAK', n, 17.86, 19.82, 330, { top: '#ffd2b8', bot: '#ff8a5b' });
    pinTag('pPerut', 'PERUT', scr(gut.tubes.stomach.at(0.45, 0, 1.1)), n, 18.82, 19.82, { bg: '#ff6f61', pointer: 'down' }, -80);
    pinTag('pUsus', 'USUS', scr(gut.tubes.small.at(0.5, 0, 1.2)), n, 19.42, 19.82, { bg: '#e8508a', pointer: 'down' }, -80);
    return w;
  }],
  // H — close-up: muscle wave, gas + liquid pushed along, the sound
  [19.86, 29.06, (n) => {
    const w = cuScene(n);
    const k = easeInOut(inv(19.86, 26.4, n));
    const k2 = easeInOut(inv(26.4, 29.06, n));
    lookCam(V(lerp(2.4, 1.0, k) + lerp(0, -1.4, k2), lerp(1.2, 0.3, k), lerp(17.5, 16.0, k) + lerp(0, 2.0, k2)), V(lerp(0.5, 0.2, k), lerp(0.2, -0.2, k), 0), 50);
    // wave direction arrow on the side
    const aw = pop(n, 20.0, 22.9);
    if (aw.o > 0) {
      const g = ov.g;
      const x = 900, y0 = 560, y1 = 1180;
      const ph = ((n - 20) * 0.9) % 1;
      g.save();
      g.globalAlpha = aw.o;
      g.lineCap = 'round';
      for (const [col, lw] of [['#ffffff', 30], ['#ff8a5b', 16]]) {
        g.strokeStyle = col;
        g.lineWidth = lw;
        g.beginPath();
        for (let i = 0; i <= 40; i++) {
          const u = i / 40;
          const y = lerp(y0, y1, u);
          const xx = x + Math.sin(u * Math.PI * 4 - n * 6) * 18;
          i ? g.lineTo(xx, y) : g.moveTo(xx, y);
        }
        g.stroke();
      }
      g.restore();
      ov.html('waveHead', `<svg width="90" height="70" viewBox="0 0 90 70"><path d="M8 10 L45 62 L82 10 Z" fill="#ff8a5b" stroke="#fff" stroke-width="10" stroke-linejoin="round"/></svg>`, { x, y: y1 + 30, o: aw.o, s: aw.s });
      ov.html('waveDot', `<svg width="44" height="44"><circle cx="22" cy="22" r="16" fill="#fff"/></svg>`, { x: x + Math.sin(ph * Math.PI * 4 - n * 6) * 18, y: lerp(y0, y1, ph), o: aw.o * Math.sin(ph * Math.PI), s: 1 });
    }
    const om = pop(n, 20.7, 22.9);
    ov.tag('ombak', 'MACAM OMBAK', { x: 300, y: 1300, o: om.o, s: om.s }, { bg: '#1f8fe0', small: true });
    banner('otot2', 'OTOT BERGERAK', n, 19.95, 22.88, 330, { top: '#ffd2b8', bot: '#ff8a5b' });
    // pin "OTOT" to the squeezing ring that is on screen
    let best = 0, bs = 0.5;
    for (let i = 0; i < 2; i++) {
      const s = waveAt(n, i);
      if (s > 0.25 && s < 0.75) (best = s), (bs = s);
    }
    if (best) pinTag('otot', 'OTOT', scr(cu.outer.at(bs, Math.PI, 1.05)), n, 21.94, 23.0, { bg: '#ff6f61', small: true }, 0, -170, 520, 1250);
    // gas + liquid labels
    const vis = cu.parts.filter((p) => p.s > 0.3 && p.s < 0.7);
    const gasP = vis.find((p) => p.gas) || cu.parts[0];
    const flP = vis.find((p) => !p.gas) || cu.parts[1];
    pinTag('gas', 'GAS', scr(gasP.m.position), n, 22.92, 26.36, { bg: '#5a7bd6', pointer: 'down' }, -95, 0, 520, 1250);
    pinTag('cecair', 'CECAIR', scr(flP.m.position), n, 23.56, 26.36, { bg: '#1fa9d6', pointer: 'down' }, -95, 0, 520, 1250);
    banner('gc', 'GAS + CECAIR', n, 23.56, 26.36, 330, { top: '#d6fbff', bot: '#2ec4e8' });
    const mv = pop(n, 25.5, 26.36);
    if (mv.o > 0) for (let i = 0; i < 3; i++) {
      const ph = (n * 2 + i / 3) % 1;
      ov.html('mv' + i, DOWN, { x: 170, y: 700 + i * 110 + ph * 40, o: mv.o * Math.sin(ph * Math.PI), s: 1.1 });
    }
    // the sound: rings radiate from the squeeze, KRUUUKKK!
    const sa = inv(26.42, 26.8, n);
    if (sa > 0) {
      let sq = 0.5;
      for (let i = 0; i < 2; i++) {
        const s = waveAt(n, i);
        if (s > 0.2 && s < 0.8) sq = s;
      }
      const p = scr(cu.outer.at(sq, 0, 0));
      soundRings(p.x, p.y, n, { a: sa, rmax: 420, r0: 200, speed: 1.4 });
    }
    banner('bunyi', 'BUNYI PERUT', n, 27.66, 29.02, 330, { top: '#fff27a', bot: '#ffa51f' });
    kruk('kH', n, 28.18, 29.04, W / 2, 1220, 140);
    return w;
  }],
  // I — "Oh, jadi bukan monsterlah." the imaginary monster vanishes
  [29.06, 32.62, (n) => {
    const w = gutScene(n, 0.4);
    const laugh = n > 29.1 && n < 30.0 ? Math.abs(Math.sin((n - 29.1) * 12)) * 0.04 : 0;
    const wag = keys(n, [[31.0, 0], [31.25, 1], [32.4, 1], [32.62, 0.6]]);
    const wg = POSES.wagR(n).armR;
    const hips = keys(n, [[29.1, 0], [29.45, 1], [30.9, 1], [31.2, 0]]);
    gutAffPose(n, {
      yaw: 0.1, bob: laugh, smile: 1, brow: 0.5, wow: keys(n, [[29.06, 0], [29.15, 0.7], [29.6, 0.7], [29.85, 0]]),
      headYaw: wag * 0.18 * Math.sin(n * 8) + 0.1 * hips, headRoll: 0.12 * hips * Math.sin(n * 6),
      armL: mixArm(ARM.restL, ARM.hipsL, Math.max(hips, wag)),
      armR: wag > 0.02 ? mixArm(ARM.restR, { reach: wg.reach, pole: wg.pole, point: 1, wz: wg.wz }, wag) : mixArm(ARM.restR, ARM.hipsR, hips),
    });
    const k = easeInOut(inv(29.06, 32.62, n));
    lookCam(V(lerp(-6.4, -6.1, k), lerp(1.4, 1.3, k), lerp(26.5, 25.5, k)), V(lerp(-5.6, -5.9, k), lerp(4.6, 4.4, k), 12), 50);
    // monster silhouette over the stomach, then poof
    const mx = 760, my = 520;
    const mIn = inv(29.1, 29.5, n);
    const gone = inv(31.08, 31.4, n);
    if (mIn > 0 && gone < 1) {
      const wob2 = Math.sin(n * 5) * 8;
      ov.html('mon', MONSTER('rgba(140,110,255,0.75)', true), { x: mx, y: my + wob2, o: mIn * (1 - gone) * (n > 30.04 ? 0.6 + 0.4 * Math.abs(Math.sin(n * 7)) : 1), s: (0.9 + 0.1 * Math.sin(n * 3)) * (1 + gone * 0.5) });
      const qm = pop(n, 29.3, 31.1);
      ov.html('monQ', ICONS.qmark('#fff'), { x: mx + 150, y: my - 130, o: qm.o * (1 - gone), s: qm.s * 0.5, r: 14 });
    }
    if (gone > 0) {
      const R = Math.min(1, gone * 1.2);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        ov.star(mx + Math.cos(a) * 260 * easeOut(inv(31.08, 31.8, n)), my + Math.sin(a) * 220 * easeOut(inv(31.08, 31.8, n)), 26, (1 - inv(31.3, 32.0, n)) * R, ['#fff6c8', '#9ff0ff', '#ffd84a'][i % 3], n * 2 + i);
      }
      const cx = pop(n, 31.08, 32.6, { from: 2 });
      ov.html('cross', ICONS.cross(), { x: mx, y: my, o: cx.o * (1 - inv(31.7, 32.0, n)), s: cx.s * 0.8 });
    }
    banner('bukan', 'BUKAN MONSTER!', n, 31.1, 32.6, 330, { top: '#ffffff', bot: '#9fe6ff' }, 110);
    // discovery visualisation replaces the monster
    recap(n, 31.7, 32.6, mx - 40, 560, 120);
    return w;
  }],
  // J — back home: not only when hungry, also after eating
  [32.62, 39.12, (n) => {
    const w = roomScene(n);
    const up = keys(n, [[32.7, 0], [33.0, 1], [33.9, 1], [34.15, 0]]);
    const tum = keys(n, [[34.0, 0], [34.3, 1], [35.0, 1], [35.25, 0]]);
    const wag = keys(n, [[35.1, 0], [35.35, 1], [36.2, 1], [36.4, 0]]);
    const rub = keys(n, [[37.2, 0], [37.5, 1], [39.12, 1]]);
    const wg = POSES.wagR(n).armR;
    let armR = ARM.restR;
    if (up > 0) armR = mixArm(ARM.restR, ARM.upR, up);
    else if (wag > 0) armR = mixArm(ARM.restR, { reach: wg.reach, pole: wg.pole, point: 1, wz: wg.wz }, wag);
    else if (tum > 0) armR = mixArm(ARM.restR, ARM.tummyR, tum);
    else if (rub > 0) armR = mixArm(ARM.restR, { ...ARM.tummyR, reach: [ARM.tummyR.reach[0] + 0.08 * Math.sin(n * 9), ARM.tummyR.reach[1] + 0.06 * Math.cos(n * 9), ARM.tummyR.reach[2]] }, rub);
    roomPose(n, {
      yaw: 0, smile: 1, brow: 0.5 + 0.4 * up, headRoll: -0.06 * up + 0.05 * wobble(n, 3), headYaw: wag * 0.15 * Math.sin(n * 8), headPitch: 0.03,
      armR, armL: mixArm(ARM.restL, ARM.tummyL, Math.max(tum, rub)),
    });
    const k = easeInOut(inv(32.62, 39.12, n));
    lookCam(V(lerp(0.5, 0.25, k), lerp(2.35, 2.3, k), lerp(9.6, 9.0, k)), V(0.1, lerp(2.95, 2.85, k), 0), 46);
    ov.flash((1 - inv(32.62, 32.95, n)) * 0.9, '200,250,255');
    ov.sparkles(n, { n: 16, seed: 14, y: 260, h: 900, a: 1 - inv(32.7, 33.4, n) });
    const tq = pop(n, 32.75, 34.0);
    ov.bubble('tahu', 'TAHU TAK?', { x: W / 2, y: 360, o: tq.o, s: tq.s, r: -3 }, { size: 120, top: '#ffe45c', bot: '#ff9f1c' });
    const belly = scr(roomBelly());
    rumbleLines(belly.x, belly.y, n, keys(n, [[34.05, 0], [34.2, 0.8], [35.0, 0.8], [35.2, 0]]), 0.8);
    const bq = pop(n, 34.66, 36.1);
    ov.tag('bpq', 'BUNYI PERUT', { x: W / 2, y: 330, o: bq.o, s: bq.s }, { bg: '#f2a91c' });
    const c1 = pop(n, 36.3, 39.1), c2 = pop(n, 37.16, 39.1);
    ov.html('cLapar', card('LAPAR', BOWL(false) + CLOCK, C.peach), { x: 290, y: 420, o: c1.o, s: c1.s * 0.95, r: -3 });
    ov.html('cMakan', card('LEPAS MAKAN', BOWL(true), C.cyan), { x: 790, y: 420, o: c2.o, s: c2.s * 0.95, r: 3 });
    return w;
  }],
  // K — "Ha, sekarang korang dah tahu. Apa lagi Affan nak siasat lepas ni?"
  [39.12, 43.45, (n) => {
    const w = roomScene(n);
    const th = keys(n, [[39.2, 0], [39.5, 1], [40.9, 1], [41.2, 0]]);
    const tk = keys(n, [[41.2, 0], [41.55, 1], [43.45, 1]]);
    const up = POSES.thumbsUpR.armR, th2 = POSES.thinkR.armR;
    let armR = ARM.restR;
    if (th > 0) armR = { ...mixArm(ARM.restR, up, th), wy: up.wy * th, wx: up.wx * th };
    else if (tk > 0) armR = { ...mixArm(ARM.restR, th2, tk), wx: th2.wx * tk };
    roomPose(n, {
      yaw: 0, smile: 1, brow: 0.4 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk,
      armR, armL: ARM.restL,
    });
    const k = easeInOut(inv(40.9, 43.45, n));
    lookCam(V(lerp(0.25, 0.15, k), lerp(2.3, 2.95, k), lerp(9.0, 5.0, k)), V(lerp(0.1, 0.05, k), lerp(2.85, 2.75, k), 0), 46);
    if (th > 0.5) {
      const hand = scr(roomAff.parts.arms.R.hand.getWorldPosition(V(0, 0, 0)));
      ov.sparkles(n, { n: 12, seed: 33, x: hand.x - 160, y: hand.y - 200, w: 320, h: 300, a: inv(39.3, 39.6, n) * (1 - inv(40.8, 41.1, n)), size: 30 });
    }
    recap(n, 39.3, 41.05, W / 2, 330, 128);
    const head = scr(roomHead());
    [[41.4, -270, -260, C.yellow, -12], [41.7, 260, -300, '#3fa2ff', 10], [41.95, 310, -60, C.yellow, 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(n, a, 43.45);
      ov.html('q' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(n * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    return w;
  }],
  // Outro — THE CURIOUS AFFAN logo + tagline
  [43.45, N_END + 1, (n) => {
    const k = easeOut(inv(43.45, 44.2, n));
    const th2 = POSES.thinkR.armR;
    outro.aff.pose({ ...POSES.thumbsUpR, armR: { ...POSES.thumbsUpR.armR }, smile: 1, blink: blinkAt(n, 9), headRoll: -0.06, headYaw: 0.08, talk: 0 });
    void th2;
    lookCam(V(0, 2.6, lerp(7.5, 5.6, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash((1 - inv(43.45, 43.8, n)) * 1.0);
    const g = ov.g;
    const ra = inv(43.55, 44.2, n);
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
    ov.sparkles(n, { n: 30, seed: 41, y: 260, h: 1150, a: ra });
    const ic = pop(n, 44.0, 99);
    ov.html('oBulb', ICONS.bulb(), { x: 175, y: 470 + Math.sin(n * 2) * 8, o: ic.o, s: ic.s * 0.55, r: -10 });
    ov.html('oQ1', ICONS.qmark(C.yellow), { x: 880, y: 420 + Math.sin(n * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    ov.html('oQ2', ICONS.qmark('#2f6fff'), { x: 220, y: 720 + Math.sin(n * 2 + 2) * 8, o: ic.o, s: ic.s * 0.6, r: -12 });
    const l1 = pop(n, 43.75, 99), l2 = pop(n, 43.95, 99), l3 = pop(n, 44.15, 99), l4 = pop(n, 44.6, 99);
    ov.html('lThe', bubbleSVG('THE', { size: 110, top: '#ffffff', bot: '#e8eefc' }), { x: W / 2 + 10, y: 1100, o: l1.o, s: l1.s });
    ov.html('lCur', bubbleSVG('CURIOUS', { size: 170, top: '#9fe8ff', bot: '#1d9bf0' }), { x: W / 2 + 40, y: 1250, o: l2.o, s: l2.s });
    ov.html('lMag', `<svg width="190" height="190" viewBox="0 0 190 190"><line x1="60" y1="130" x2="20" y2="172" stroke="#17256b" stroke-width="40" stroke-linecap="round"/><line x1="60" y1="130" x2="20" y2="172" stroke="#ffc928" stroke-width="22" stroke-linecap="round"/><circle cx="110" cy="80" r="62" fill="#8fdcff" stroke="#17256b" stroke-width="34"/><circle cx="110" cy="80" r="62" fill="none" stroke="#ffc928" stroke-width="16"/><ellipse cx="92" cy="62" rx="16" ry="22" fill="#fff" opacity="0.85"/></svg>`, { x: 120, y: 1260, o: l2.o, s: l2.s * 0.75, r: -8 });
    ov.html('lAff', bubbleSVG('AFFAN', { size: 210, top: '#ffe45c', bot: '#ff9f1c' }), { x: W / 2, y: 1420, o: l3.o, s: l3.s });
    ov.tag('tagline', 'Little Questions. Big Discoveries!', { x: W / 2, y: 1590, o: l4.o, s: l4.s }, { bg: C.navy, small: true });
    const st = pop(n, 44.4, 99);
    ov.star(250, 1100, 34 * st.s, st.o, '#ffd84a', 0.3);
    return { scene: outro.scene, outro: true };
  }],
];

const CAPS = CAPTIONS;
function frame(t) {
  const n = t - OFF;
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const shot = SHOTS.find(([a, b]) => n >= a && n < b) || SHOTS[SHOTS.length - 1];
  const world = shot[2](n);
  renderer.render(world.scene, cam);
  if (!world.outro) ov.vignette(0.28);
  ov.captions(n, CAPS, KEYWORDS);
  ov.end();
}

// ---------------------------------------------------------------- thumbnail
// 9:16 cover: low angle on a surprised Affan holding his tummy, the giant
// stomach rumbling behind him, an imagined monster asking "?".
// Render: node tools/render.js episodes/004-perut-berbunyi --stills 0 --eval "EP.frame = EP.thumb" --out <dir>
let thumbLight = null;
function thumb() {
  const n = 14.3;
  if (!thumbLight) {
    // soft front key so Affan's face reads at thumbnail size
    thumbLight = new THREE.SpotLight(0xfff1e2, 45, 30, 0.5, 0.6, 1.6);
    thumbLight.position.set(-7.4, 4.5, 23.5);
    thumbLight.target.position.set(-6.2, 1.6, 17);
    gut.scene.add(thumbLight, thumbLight.target);
  }
  ov.begin();
  cam.aspect = W / H;
  const w = gutScene(n, 0.7, 0.35);
  gutAffPose(n, {
    yaw: -0.2, blink: 0, talk: 0, wow: 1, brow: 1, headPitch: 0.05, headYaw: -0.05, headRoll: 0.06, lookX: 0, lookY: 0.05,
    armL: ARM.tummyL, armR: ARM.tummyR,
  });
  lookCam(V(-8.2, 1.4, 24.5), V(-3.8, 6.1, 8), 60);
  renderer.render(w.scene, cam);
  ov.vignette(0.3);
  const st = scr(stomachPt());
  soundRings(st.x, st.y, 0.12, { a: 1, rmax: 360, r0: 150, speed: 1.8, w: 14 });
  soundRings(st.x, st.y, 0.42, { a: 0.8, rmax: 360, r0: 150, speed: 1.8, w: 14 });
  ov.tag('thEp', 'EPISOD 4', { x: W / 2, y: 255 }, { bg: C.navy, small: true });
  ov.bubble('thT', 'KENAPA PERUT\nBERBUNYI?', { x: W / 2, y: 470, r: -2 }, { size: 128, top: '#9ff0ff', bot: C.cyan });
  ov.bubble('thK', 'KRUUUKKK!', { x: W / 2 - 40, y: 860, r: -7 }, { size: 160, top: '#fff27a', bot: '#ffa51f' });
  ov.html('thMon', MONSTER(), { x: 860, y: 1080, s: 0.6, r: 8 });
  ov.html('thQ', ICONS.qmark(C.yellow), { x: 975, y: 930, s: 0.7, r: 14 });
  ov.html('thLogo', `<div style="display:flex;align-items:center;gap:10px;padding:10px 30px 14px;border-radius:999px;background:#fff;box-shadow:0 8px 0 rgba(0,0,0,0.25);font-family:'Baloo 2';font-weight:800;font-size:46px;line-height:1;color:${C.navy}">THE <span style="color:#1d9bf0">CURIOUS</span> <span style="color:#ff9f1c">AFFAN</span></div>`, { x: W / 2, y: 1625 });
  ov.end();
}

window.EP = {
  fps: FPS,
  duration: DURATION,
  frame,
  thumb,
  ready: (async () => {
    const e = await loadEnvelope('./audio/narration.mp3', FPS);
    env = { at: (n) => (n < 0 ? 0 : e.at(n)) };
    await Promise.all(['800 60px "Baloo 2"', '700 60px "Baloo 2"', '700 60px Fredoka', '600 60px Fredoka'].map((f) => document.fonts.load(f)));
    frame(0);
    return true;
  })(),
};
