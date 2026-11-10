// THE CURIOUS AFFAN — Episode 027: "Kenapa Kita Menguap?"
// Cover / thumbnail page. The narration is in audio/narration.mp3; the shot
// list for the full video is still to be built. frame(t) renders the cover set
// with Affan lip-syncing to the narration, so --stills works for previews.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, clamp, W, H } from '../../shared/core.js';
import { makeAffan, blinkAt } from '../../shared/affan.js';
import { Overlay, drawLogo } from '../../shared/overlay.js';
import { makeSky, makeStars, makeMoon } from '../../shared/props.js';

const FPS = 30;
const DURATION = 76.3;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
let env = { at: () => 0 };

// ------------------------------------------------------------------ bedtime set
const scene = new THREE.Scene();
const sky = makeSky({ top: 0x120a3a, mid: 0x2b1d72, horizon: 0x6a4bb8, bottom: 0x120a3a });
const stars = makeStars(1100, 1600, 27);
const moon = makeMoon(40);
moon.position.set(-420, 820, -1500);
scene.add(sky, stars, moon);
scene.add(new THREE.HemisphereLight(0xe4dcff, 0x3a2a60, 1.25));
const key = new THREE.DirectionalLight(0xfff0dc, 2.1);
key.position.set(3, 6, 8);
key.castShadow = true;
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.03;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);
const rim = new THREE.DirectionalLight(0xb9a8ff, 1.6);
rim.position.set(-6, 4, -6);
scene.add(rim);
const aff = makeAffan();
scene.add(aff.root);
const cam = new THREE.PerspectiveCamera(30, W / H, 0.05, 6000);

// Big yawn: head tipped back, eyes squeezed shut, one arm stretching up and
// the other hand fisted by the cheek. The open mouth is stretched taller than
// the talking range so it reads as a yawn.
const YAWN = {
  yaw: 0.2, headPitch: -0.14, headRoll: 0.12, headYaw: 0.08, tilt: 0.05,
  blink: 0.92, brow: 0.9, talk: 1, smile: 0, wow: 0,
  armL: { reach: [0.95, 2.05, 0.15], pole: [1, -0.4, -0.6], wz: -0.3 },
  armR: { reach: [-0.8, 1.1, 0.45], pole: [-1, -1, -0.2], wx: -0.6 },
};
const THUMB = { cam: [0.4, 2.9, 11.2], look: [0.05, 2.86, 0], mouth: [1.05, 3.0], fov: 30 };
window.setThumb = (o) => Object.assign(THUMB, o);

function set3D(t, p) {
  aff.pose(p);
  cam.fov = THUMB.fov;
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  cam.position.set(...THUMB.cam);
  cam.lookAt(...THUMB.look);
  sky.position.copy(cam.position);
  stars.position.copy(cam.position);
  stars.userData.update(t);
  renderer.render(scene, cam);
}

function grade(g) {
  const top = g.createLinearGradient(0, 0, 0, 760);
  top.addColorStop(0, 'rgba(14,8,46,0.85)');
  top.addColorStop(1, 'rgba(14,8,46,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 760);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(14,8,46,0)');
  bot.addColorStop(1, 'rgba(14,8,46,0.85)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
}

const ZZZ = (c = '#c9b8ff') => `<svg width="230" height="230" viewBox="0 0 230 230">${[
  [40, 200, 84], [110, 130, 66], [170, 70, 50],
].map(([x, y, s]) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="${s}" fill="${c}" stroke="#17256b" stroke-width="${s * 0.16}" paint-order="stroke" stroke-linejoin="round">Z</text>`).join('')}</svg>`;

// Cover (9:16): Affan mid-yawn under a night sky, big title, episode badge,
// "boleh berjangkit?" hook and the series logo. Key elements stay inside the
// centre 3:4 area (y 240-1680) that profile grids show.
function thumbnail() {
  ov.begin();
  set3D(4.2, YAWN);
  aff.parts.open.scale.set(THUMB.mouth[0], THUMB.mouth[1], 1);
  renderer.render(scene, cam);
  const g = ov.g;
  grade(g);
  ov.vignette(0.3);
  ov.sparkles(1.3, { n: 16, seed: 27, x: 60, y: 620, w: 960, h: 700, size: 22 });
  ov.tag('thBadge', 'EPISOD 27', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'KENAPA KITA\nMENGUAP?', { x: W / 2, y: 475, r: -2 }, { size: 124 });
  ov.html('thZ', ZZZ(), { x: 860, y: 760, r: 8, s: 0.95 });
  ov.tag('thHook', 'BOLEH BERJANGKIT?', { x: W / 2 + 10, y: 1290, r: -3 }, { bg: '#ff4d8d' });
  drawLogo(ov, { y: 1420, scale: 0.5 });
  ov.end();
}

function frame(t) {
  ov.begin();
  set3D(t, { yaw: 0.15, blink: blinkAt(t, 2), talk: clamp(env.at(t) * 1.2), smile: 0.9 });
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
