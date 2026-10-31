// The Curious Affan branded outro, shared by every episode: Affan in a
// thinking pose on a bright blue stage, a golden ring, sparkles and the
// "The Curious Affan" logo popping in.
//
//   const outro = buildOutro();
//   // inside the outro shot, with t0 = the time the outro starts:
//   outroShot(t, t0, { ov, cam, outro, lookCam });   // returns outro (has .scene)
import * as THREE from 'three';
import { inv, lerp, easeOut, W } from './core.js';
import { makeAffan, POSES, blinkAt } from './affan.js';
import { glow } from './props.js';
import { pop, ICONS, bubbleSVG } from './overlay.js';
import { toScreen } from './core.js';

export function buildOutro() {
  const scene = new THREE.Scene();
  const c = document.createElement('canvas');
  c.width = 540;
  c.height = 960;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(270, 380, 40, 270, 420, 700);
  gr.addColorStop(0, '#8fd0ff');
  gr.addColorStop(0.45, '#3f9cf2');
  gr.addColorStop(1, '#1a5fcf');
  g.fillStyle = gr;
  g.fillRect(0, 0, 540, 960);
  const bg = new THREE.CanvasTexture(c);
  bg.colorSpace = THREE.SRGBColorSpace;
  scene.background = bg;
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x6a7ab8, 1.5));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.4);
  key.position.set(3, 6, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 300 });
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfe0ff, 2.0);
  rim.position.set(-6, 5, -6);
  scene.add(rim);
  const aff = makeAffan();
  scene.add(aff.root);
  const halo = glow(0xfff2b0, 9, 0.35);
  halo.position.set(0, 2.9, -2);
  scene.add(halo);
  return { scene, aff };
}

const MAGNIFIER = `<svg width="190" height="190" viewBox="0 0 190 190"><line x1="60" y1="130" x2="20" y2="172" stroke="#17256b" stroke-width="40" stroke-linecap="round"/><line x1="60" y1="130" x2="20" y2="172" stroke="#ffc928" stroke-width="22" stroke-linecap="round"/><circle cx="110" cy="80" r="62" fill="#8fdcff" stroke="#17256b" stroke-width="34"/><circle cx="110" cy="80" r="62" fill="none" stroke="#ffc928" stroke-width="16"/><ellipse cx="92" cy="62" rx="16" ry="22" fill="#fff" opacity="0.85"/></svg>`;

// One frame of the outro, t0 = outro start time. All timings are relative.
export function outroShot(t, t0, { ov, cam, outro, lookCam }) {
  const r = (x) => t0 + x;
  const k = easeOut(inv(r(0), r(0.7), t));
  outro.aff.root.position.set(0, 0, 0);
  const th2 = POSES.thinkR.armR;
  outro.aff.pose({ ...POSES.thinkR, armR: { ...th2 }, smile: 1, blink: blinkAt(t, 9), headRoll: -0.08, lookX: 0.25, lookY: 0.15, headYaw: 0.08 });
  lookCam(cam, new THREE.Vector3(0, 2.6, lerp(7.5, 5.4, k)), new THREE.Vector3(0, 2.3, 0), 40);
  const hc = toScreen(new THREE.Vector3(0, 2.95, 0), cam);
  ov.flash(1 - inv(r(0), r(0.35), t));
  // golden ring + sparkles
  const g = ov.g;
  const ra = inv(r(0.1), r(0.7), t);
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
  const ic = pop(t, r(0.6), 1e9);
  ov.html('oBulb', ICONS.bulb(), { x: 175, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.55, r: -10 });
  ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
  ov.html('oQ2', ICONS.qmark('#2f6fff'), { x: 220, y: 720 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.6, r: -12 });
  const l1 = pop(t, r(0.3), 1e9), l2 = pop(t, r(0.5), 1e9), l3 = pop(t, r(0.7), 1e9);
  ov.html('lThe', bubbleSVG('The', { size: 120, top: '#ffffff', bot: '#e8eefc' }), { x: W / 2 + 10, y: 1110, o: l1.o, s: l1.s });
  ov.html('lCur', bubbleSVG('Curious', { size: 200, top: '#9fe8ff', bot: '#1d9bf0' }), { x: W / 2 + 40, y: 1270, o: l2.o, s: l2.s });
  ov.html('lMag', MAGNIFIER, { x: 165, y: 1300, o: l2.o, s: l2.s * 0.9, r: -8 });
  ov.html('lAff', bubbleSVG('Affan', { size: 220, top: '#ffe45c', bot: '#ff9f1c' }), { x: W / 2, y: 1450, o: l3.o, s: l3.s });
  const st = pop(t, r(0.9), 1e9);
  ov.star(612, 1150, 34 * st.s, st.o, '#ffd84a', 0.3);
  return outro;
}
