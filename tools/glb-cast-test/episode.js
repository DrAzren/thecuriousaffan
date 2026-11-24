// Pose test for the GLB cast (shared/glbcast.js), not an episode.
//   node tools/render.js tools/glb-cast-test --stills 0,1,2,3,4,5,6,7,8 --out <dir>
// t=0 Affan front rest, 1 Affan 3/4 waving, 2 Affan think, 3 thumbs up + both,
// 4 Affan face talking, 5 Affan face blink, 6 Mama front, 7 Mama face talking, 8 Affan wow seated-ish
import * as THREE from 'three';
import { makeRenderer, W, H } from '../../shared/core.js';
import { POSES } from '../../shared/affan.js';
import { makeGlbCast, useGlbCast } from '../../shared/glbcast.js';

await useGlbCast();

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfd0d2);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a90, 1.3));
const key = new THREE.DirectionalLight(0xffffff, 1.8);
key.position.set(3, 6, 8);
scene.add(key);
const fill = new THREE.DirectionalLight(0xe8eeff, 0.6);
fill.position.set(-5, 3, 4);
scene.add(fill);
const floor = new THREE.Mesh(new THREE.CircleGeometry(20, 48), new THREE.MeshStandardMaterial({ color: 0xc8c9cc, roughness: 1 }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
const aff = makeGlbCast('affan');
const mama = makeGlbCast('mama');
scene.add(aff.root, mama.root);
const cam = new THREE.PerspectiveCamera(30, W / H, 0.05, 200);
const look = (p, t, fov = 30) => {
  cam.position.set(...p);
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(new THREE.Vector3(...t));
};
const faceCam = (c, dx = 0.1) => {
  c.root.updateMatrixWorld(true);
  const h = c.parts.head.getWorldPosition(new THREE.Vector3());
  look([h.x + dx, h.y + 0.3, h.z + 3.2], [h.x, h.y + 0.25, h.z], 22);
};
function frame(t) {
  const s = Math.round(t);
  aff.root.visible = s !== 6 && s !== 7 && s !== 9;
  mama.root.visible = s === 3 || s === 6 || s === 7 || s === 9;
  aff.root.position.set(0, 0, 0);
  mama.root.position.set(0, 0, 0);
  aff.pose({});
  mama.pose({});
  aff.parts.face.mouth.uAlpha.value = 1;
  mama.parts.face.mouth.uAlpha.value = 1;
  if (s === 0) look([0, 2.0, 15], [0, 1.9, 0]);
  if (s === 1) {
    aff.pose({ yaw: 0.5, talk: 0.5, armR: { reach: [-0.75, 1.55, 0.3], pole: [-1, -0.3, -0.5] } });
    look([0, 2.0, 15], [0, 1.9, 0]);
  }
  if (s === 2) {
    aff.pose({ ...POSES.thinkR, headRoll: 0.15, headPitch: -0.1 });
    look([0.5, 2.6, 9], [0, 2.4, 0]);
  }
  if (s === 3) {
    aff.root.position.set(1.1, 0, 0.4);
    mama.root.position.set(-1.0, 0, 0);
    aff.pose({ yaw: -0.25, ...POSES.thumbsUpR });
    mama.pose({ yaw: 0.3, talk: 0.4, armR: { reach: [-0.3, 0.5, 0.5], pole: [-1, -0.6, -0.3] }, armL: { x: -0.2, z: 0.3, el: -1.2 } });
    look([0, 2.4, 17], [0, 2.0, 0]);
  }
  if (s === 4) { aff.pose({ talk: 0.8, headYaw: 0.15 }); faceCam(aff); }
  if (s === 5) { aff.pose({ blink: 1 }); faceCam(aff); }
  if (s === 6) {
    mama.pose({ armL: { reach: [0.4, 0.55, 0.55] }, armR: { reach: [-0.4, 0.55, 0.55] } });
    look([0, 1.8, 14], [0, 1.65, 0]);
  }
  if (s === 7) { mama.pose({ talk: 0.6 }); faceCam(mama, -0.1); }
  if (s === 9) { mama.root.visible = true; aff.root.visible = false; mama.pose({ blink: 1 }); faceCam(mama, -0.1); }
  if (s === 10) { aff.pose({ blink: 0.5, talk: 0.3 }); faceCam(aff); }
  if (s === 11) { mama.root.visible = true; aff.root.visible = false; mama.pose({ talk: 0.7, blink: 0.3, headYaw: 0.35 }); faceCam(mama, 0.9); }
  if (s === 13) { mama.root.visible = true; aff.root.visible = false; mama.pose({ talk: 0.25 }); faceCam(mama, -0.1); }
  if (s === 14) { mama.root.visible = true; aff.root.visible = false; mama.pose({ wow: 1 }); faceCam(mama, -0.1); }
  if (s === 15) { aff.pose({ talk: 0.3 }); faceCam(aff); }
  if (s === 16 || s === 17) {
    const c = s === 16 ? aff : mama;
    aff.root.visible = c === aff; mama.root.visible = c === mama;
    // the mouth at its smallest, half transparent over the painted mouth
    c.pose({ talk: 0.07 });
    c.parts.face.mouth.uAlpha.value = 0.45;
    const h = c.parts.head.getWorldPosition(new THREE.Vector3());
    const dy = c === aff ? 0.086 : 0.237;
    look([h.x, h.y + dy, h.z + 1.2], [h.x, h.y + dy, h.z], 40);
  }
  if (s === 12) { aff.pose({ wow: 1, headYaw: -0.3 }); faceCam(aff, -0.9); }
  if (s === 8) {
    aff.pose({ wow: 1, lean: -0.15, armL: { x: -0.6, z: 0.9, el: -1.3 }, armR: { x: -0.6, z: -0.9, el: -1.3 }, legL: { x: -0.4, knee: 0.6 } });
    look([1.5, 2.2, 12], [0, 1.9, 0]);
  }
  renderer.setViewport(0, 0, W, H);
  renderer.render(scene, cam);
}
window.EP = { fps: 30, duration: 18, frame, thumbnail: () => frame(0), ready: Promise.resolve(true).then(() => (frame(0), true)) };
