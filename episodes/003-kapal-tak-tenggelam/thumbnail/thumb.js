// Episode 003 cover / thumbnail (9:16, 1080x1920), rendered with the same sets
// and Affan rig as the episode.
//   node tools/render.js episodes/003-kapal-tak-tenggelam/thumbnail --stills 0 --out <dir>
import * as THREE from 'three';
import { makeRenderer, toScreen, W, H } from '../../../shared/core.js';
import { Overlay, ICONS, bubbleSVG } from '../../../shared/overlay.js';
import { buildHarbor, SUN, SHIP_POS, SHIP_YAW, DECK_Y } from '../worlds.js';

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const cam = new THREE.PerspectiveCamera(54, W / H, 0.05, 7000);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SHIP_M = new THREE.Matrix4().compose(SHIP_POS, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, SHIP_YAW, 0)), V(1, 1, 1));
const shipPt = (x, y, z) => V(x, y, z).applyMatrix4(SHIP_M);
let HB;

const WEIGHT = `<svg width="170" height="160" viewBox="0 0 170 160"><path d="M60 40 A25 25 0 1 1 110 40" fill="none" stroke="#17256b" stroke-width="26"/><path d="M60 40 A25 25 0 1 1 110 40" fill="none" stroke="#5d6b8f" stroke-width="12"/>
  <path d="M35 50 H135 L160 150 H10 Z" fill="#5d6b8f" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/><text x="85" y="122" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="58" fill="#fff">TAN</text></svg>`;

function frame(t) {
  ov.begin();
  HB.update(2.0);
  HB.drops.visible = HB.crown.visible = HB.bubbles.visible = HB.puff.visible = false;
  HB.stone.visible = false;
  const spot = V(2, DECK_Y, 1.4);
  HB.aff.root.position.copy(spot);
  HB.aff.pose({
    yaw: -0.15, wow: 0.85, brow: 1, smile: 1, blink: 0,
    headYaw: -0.3, headPitch: -0.12, lookX: -0.6, lookY: 0.45,
    armR: { reach: [-1.12, 1.42, -0.4], point: 1, pole: [-1, -0.5, -0.6], wz: -0.15 },
    armL: { reach: [0.85, 1.05, 0.45], pole: [1, -0.6, -0.3] },
  });
  HB.sunLight.target.position.copy(spot);
  HB.sunLight.position.copy(spot).addScaledVector(SUN, 80);
  const C = window.CFG || { pos: [1.0, 2.5, 11.5], look: [-8, 16, -70] };
  cam.position.set(...C.pos);
  cam.lookAt(V(...C.look));
  cam.updateMatrixWorld(true);
  HB.sky.visible = true;
  HB.sky.position.copy(cam.position);
  renderer.render(HB.scene, cam);
  ov.vignette(0.3);

  // title + episode pill
  ov.tag('ep', 'EPISOD 3', { x: W / 2, y: 262 }, { bg: '#2f9bff', small: true });
  ov.bubble('title', 'KENAPA KAPAL\nBESAR TAK\nTENGGELAM?', { x: W / 2, y: 520, r: -2 }, { size: 138 });
  // "heavy" weight on the ship, question marks around Affan
  const head = toScreen(V(spot.x, spot.y + 2.9, spot.z), cam);
  const box = toScreen(shipPt(-20, 34, 0), cam);
  const bx = Math.max(190, Math.min(box.x, head.x - 360));
  ov.tag('berat', 'BERAT!', { x: bx, y: box.y - 40, r: -5 }, { bg: '#ff7a3d', pointer: 'down' });
  ov.html('wt', WEIGHT, { x: Math.max(110, bx - 175), y: box.y + 95, s: 0.72, r: -8 });
  ov.html('q1', ICONS.qmark('#ffcf33'), { x: head.x - 215, y: head.y - 25, s: 0.95, r: -14 });
  ov.html('q2', ICONS.qmark('#3fa2ff'), { x: head.x + 240, y: head.y - 150, s: 0.75, r: 12 });
  ov.sparkles(3.1, { n: 18, seed: 4, x: 80, y: 820, w: 920, h: 600, a: 0.8, size: 26 });
  // brand
  ov.html('brand', `<div style="display:flex;flex-direction:column;align-items:center;line-height:0.9">
    ${bubbleSVG('The Curious', { size: 64, top: '#9fe8ff', bot: '#1d9bf0', width: 560 })}
    <div style="margin-top:-30px">${bubbleSVG('Affan', { size: 92, top: '#ffe45c', bot: '#ff9f1c', width: 400 })}</div></div>`, { x: W / 2, y: 1610 });
  ov.end();
}

window.EP = {
  fps: 30,
  duration: 1,
  frame,
  ready: (async () => {
    await Promise.all(['800 60px "Baloo 2"', '700 60px "Baloo 2"', '700 60px Fredoka', '600 60px Fredoka'].map((f) => document.fonts.load(f)));
    HB = buildHarbor();
    frame(0);
    return true;
  })(),
};
