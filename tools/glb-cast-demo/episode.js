// Short silent demo of the real 3D cast in the Episode 038 kitchen (not an episode).
//   node tools/render.js tools/glb-cast-demo --out <file.mp4>
// 0-4 s wide: Mama chops and chats, Affan watches from his stool; 4-7 s Affan turns
// to the camera, waves and talks; 7-10 s Mama close-up, talking and smiling.
import * as THREE from 'three';
import { makeRenderer, clamp, lerp, inv, easeInOut, W, H } from '../../shared/core.js';
import { useGlbCast } from '../../shared/glbcast.js';

await useGlbCast();
const { POSES, blinkAt } = await import('../../shared/affan.js');
const { buildKitchen, BOARD, ISLAND_TOP, MAMA_POS, AFF_POS } = await import('../../episodes/038-bawang-menangis/worlds.js');

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const kit = buildKitchen();
kit.door.rotation.y = 0;
kit.coldOnion.visible = false;
kit.tears.forEach((d) => (d.visible = false));
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 600);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
function lookCam(pos, look, fov = 50) {
  cam.position.copy(pos);
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(look);
}
function camMove(t, a, b, p0, l0, p1, l1, fov = 50) {
  const k = easeInOut(inv(a, b, t));
  lookCam(V(...mix3(p0, p1, k)), V(...mix3(l0, l1, k)), fov);
}
// a fake speech envelope: syllables with pauses
const speak = (t, a, b) => (t > a && t < b ? clamp(0.25 + 0.75 * Math.abs(Math.sin(t * 11)) * (0.6 + 0.4 * Math.sin(t * 2.3))) : 0);
const AFF_YAW = Math.atan2(MAMA_POS.x - AFF_POS.x, MAMA_POS.z - AFF_POS.z);

function mamaSet(t, { chop = 1, talk = 0, p = {} } = {}) {
  const m = kit.mama;
  m.root.position.copy(MAMA_POS);
  const base = { yaw: 0, lean: 0.15, blink: blinkAt(t, 5), talk, ...p };
  m.pose(base);
  m.root.updateMatrixWorld(true);
  const up = 0.12 * Math.abs(Math.sin(t * 6.5)) * chop;
  const kT = V(BOARD.x - 0.42, ISLAND_TOP + 0.24 + up, BOARD.z + 0.05);
  const oT = V(BOARD.x - 0.05, ISLAND_TOP + 0.2, BOARD.z + 0.05);
  m.pose({ ...base, armR: { reach: m.toTorso(kT), pole: [-1, -0.6, -0.4] }, armL: { reach: m.toTorso(oT), pole: [1, -0.6, -0.4] } });
  m.root.updateMatrixWorld(true);
  kit.knife.position.copy(m.parts.arms.R.hand.getWorldPosition(V()));
  kit.knife.rotation.set(0, -0.35, -0.25 - 0.3 * (up / 0.12));
  kit.shine.material.opacity = 0;
  kit.onion.position.set(BOARD.x - 0.15, ISLAND_TOP + 0.07, BOARD.z + 0.02);
}
function affSet(t, p = {}) {
  const a = kit.aff;
  a.root.position.copy(AFF_POS);
  a.root.position.y -= a.parts.seatY * a.root.scale.y; // sit on the stool
  a.pose({ yaw: AFF_YAW, blink: blinkAt(t, 1), ...p });
  a.root.updateMatrixWorld(true);
}
const head = (c) => c.parts.head.getWorldPosition(V());

function frame(t) {
  if (t < 4) {
    mamaSet(t, { chop: 1, talk: speak(t, 0.4, 1.8) });
    affSet(t, { talk: speak(t, 2.2, 3.7), headPitch: 0.05, ...POSES.seated });
    camMove(t, 0, 4, [1.0, 2.6, 6.0], [0.75, 1.7, -1.0], [0.9, 2.5, 5.2], [0.75, 1.7, -1.0], 50);
  } else if (t < 7) {
    const k = easeInOut(inv(4, 4.6, t));
    const wave = Math.sin((t - 4.6) * 7) * 0.18 * clamp((t - 4.6) * 3);
    mamaSet(t, { chop: 0.3 });
    affSet(t, { yaw: lerp(AFF_YAW, 0.35, k), talk: speak(t, 4.7, 6.8), headRoll: 0.06 * Math.sin(t * 2), ...POSES.seated,
      armR: k > 0.2 ? { reach: [lerp(-0.4, -0.75 + wave, k), lerp(0.4, 1.5, k), 0.35], pole: [-1, -0.3, -0.5] } : undefined });
    const ah = head(kit.aff);
    lookCam(ah.clone().add(V(0.55, 0.05, 2.3)), ah.clone().add(V(0, -0.2, 0)), 46);
  } else {
    mamaSet(t, { chop: 0, talk: speak(t, 7.3, 9.6), p: { headRoll: 0.06 * Math.sin(t * 1.7), headYaw: 0.25 } });
    affSet(t, { ...POSES.seated });
    const mh = head(kit.mama);
    lookCam(mh.clone().add(V(0.7, 0.05, 2.4)), mh.clone().add(V(0, -0.15, 0)), 40);
  }
  renderer.setViewport(0, 0, W, H);
  renderer.render(kit.scene, cam);
}
window.EP = { fps: 30, duration: 10, frame, thumbnail: () => frame(5.5), ready: Promise.resolve(true).then(() => (frame(0), true)) };
