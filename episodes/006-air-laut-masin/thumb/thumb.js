// Episode 006 cover / thumbnail (9:16). Render with:
//   node tools/render.js episodes/006-air-laut-masin/thumb --stills 0 --out episodes/006-air-laut-masin/output
import * as THREE from 'three';
import { makeRenderer, W, H } from '../../../shared/core.js';
import { Overlay, ICONS, bubbleSVG } from '../../../shared/overlay.js';
import { waveH } from '../../../shared/tropical.js';
import { buildBeach, sandY } from '../worlds.js';

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const beach = buildBeach();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 6000);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const burst = (text) => {
  const pts = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2, r = i % 2 ? 150 : 205;
    return `${230 + Math.cos(a) * r * 1.15},${210 + Math.sin(a) * r * 0.85}`;
  }).join(' ');
  return `<svg width="460" height="420" viewBox="0 0 460 420"><defs><linearGradient id="bu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe45c"/><stop offset="1" stop-color="#ff6b3d"/></linearGradient></defs>
    <polygon points="${pts}" fill="#fff" stroke="#fff" stroke-width="26" stroke-linejoin="round"/><polygon points="${pts}" fill="url(#bu)" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/>
    <text x="230" y="250" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="104" fill="#fff" stroke="#17256b" stroke-width="16" paint-order="stroke" stroke-linejoin="round">${text}</text></svg>`;
};
const shaker = `<svg width="260" height="380" viewBox="0 0 260 380">
  <path d="M60 120 Q60 100 80 96 L180 96 Q200 100 200 120 L214 330 Q214 360 184 360 L76 360 Q46 360 46 330 Z" fill="#e9f8ff" stroke="#17256b" stroke-width="12"/>
  <path d="M58 220 L202 220 L212 330 Q212 352 184 352 L76 352 Q48 352 48 330 Z" fill="#ffffff"/>
  <path d="M70 100 Q70 30 130 30 Q190 30 190 100 Z" fill="#c9d3e6" stroke="#17256b" stroke-width="12"/>
  <g fill="#17256b"><circle cx="110" cy="62" r="7"/><circle cx="130" cy="50" r="7"/><circle cx="150" cy="62" r="7"/><circle cx="130" cy="76" r="7"/></g>
  <ellipse cx="88" cy="190" rx="12" ry="40" fill="#fff" opacity="0.85"/></svg>`;

function frame(t) {
  const T = 0.22; // moment of the splash
  ov.begin();
  beach.sea.userData.update(1.2, 1);
  beach.glints.userData.update(1.2);
  beach.sub.userData.update(1.2);
  // Affan: just tasted the sea -> "Eee!"
  const A = beach.aff;
  A.root.position.set(0.45, sandY(0.45, 2), 2);
  A.pose({
    yaw: -0.08, blink: 0.86, brow: -1.2, smile: 0, talk: 1, lookY: -0.2, headRoll: 0.1, headYaw: -0.12, lean: -0.06,
    armR: { reach: [-0.36, 1.32, 0.8], pole: [-1, -0.6, -0.4], wz: 0.4 },
    armL: { reach: [0.62, 0.9, 0.55], pole: [1, -1, -0.2] },
  });
  beach.splash.userData.update(T, 0, V(0.6, 0.1, 1.4), 5.5);
  // crab peeking in, sub surfacing behind
  beach.crab.position.set(-1.45, sandY(-1.45, 3.6), 3.6);
  beach.crab.rotation.y = 0.45;
  beach.crab.userData.pose({ t: 1.0, wave: 1, look: [0.6, 0.3], claw: 0.5 });
  beach.sub.position.set(-6.2, waveH(-6.2, -26, 1.2) - 0.9, -26);
  beach.sub.rotation.set(0, 0.6, 0.05);
  cam.position.set(0.0, 3.3, 9.9);
  cam.lookAt(0.0, 3.1, 2);
  cam.updateMatrixWorld(true);
  beach.sun.target.position.set(0, 1.5, 2);
  beach.sun.position.set(0, 1.5, 2).addScaledVector(V(0.45, 0.8, 0.55).normalize(), 30);
  beach.sky.position.copy(cam.position);
  renderer.render(beach.scene, cam);
  ov.vignette(0.2);
  // green "yuck" squiggles above Affan's head
  const g = ov.g;
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const cx = 560 + (i - 1) * 95, top = 770 - Math.abs(i - 1) * -25;
    g.beginPath();
    for (let k = 0; k <= 16; k++) {
      const y = top - k * 6, x = cx + (i - 1) * k * 2.2 + Math.sin(k * 0.9 + i) * 12;
      k ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.strokeStyle = '#ffffff';
    g.lineWidth = 20;
    g.stroke();
    g.strokeStyle = '#6fdc5a';
    g.lineWidth = 10;
    g.stroke();
  }
  g.restore();
  ov.tag('ep', 'EPISOD 6', { x: W / 2, y: 205 }, { bg: '#ff8a3d', small: true });
  ov.bubble('title', 'KENAPA\nAIR LAUT\nMASIN?', { x: W / 2, y: 520, r: -2 }, { size: 150, top: '#8ff0ff', bot: '#1d9bf0' });
  ov.html('masin', burst('MASIN!'), { x: 850, y: 870, s: 0.62, r: 10 });
  ov.html('shaker', shaker, { x: 175, y: 905, s: 0.55, r: 150 });
  ov.html('q', ICONS.qmark('#ffcf33'), { x: 300, y: 805, s: 0.55, r: -12 });
  ov.sparkles(2.0, { n: 14, seed: 7, y: 820, h: 300, a: 0.9, size: 24 });
  ov.html('logo', `<div style="display:flex;align-items:center;gap:6px">${bubbleSVG('The Curious Affan', { size: 74, width: 760, top: '#ffe45c', bot: '#ff9f1c' })}</div>`, { x: W / 2, y: 1500 });
  ov.end();
}

window.EP = {
  fps: 30,
  duration: 1,
  frame,
  ready: (async () => {
    await Promise.all(['800 60px "Baloo 2"', '700 60px "Baloo 2"', '700 60px Fredoka', '600 60px Fredoka'].map((f) => document.fonts.load(f)));
    frame(0);
    return true;
  })(),
};
