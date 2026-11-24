// Turnaround and pose check for the version 2 cast (not an episode).
//   node tools/render.js tools/cast-preview --stills 0,1,2,3,4,5,6,7 --out <dir>
// t=0 Affan front, 1 Affan 3/4, 2 Affan side, 3 Mama front, 4 Mama side,
// 5 Affan and Mama together, 6 Affan face close-up talking, 7 poses (think, jom, thumbs up).
import * as THREE from 'three';
import { makeRenderer, W, H } from '../../shared/core.js';
import { POSES } from '../../shared/affan.js';
import { makeCast2 } from '../../shared/cast2.js';

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfd0d2);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a90, 1.4));
const key = new THREE.DirectionalLight(0xffffff, 1.8);
key.position.set(3, 6, 8);
scene.add(key);
const fill = new THREE.DirectionalLight(0xe8eeff, 0.7);
fill.position.set(-5, 3, 4);
scene.add(fill);
const floor = new THREE.Mesh(new THREE.CircleGeometry(20, 48), new THREE.MeshStandardMaterial({ color: 0xc8c9cc, roughness: 1 }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
const aff = makeCast2('affan');
const mama = makeCast2('mama');
scene.add(aff.root, mama.root);
const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 200);
const look = (p, t, fov = 30) => {
  cam.position.set(...p);
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(new THREE.Vector3(...t));
};
const A = { armL: { z: 0.75, el: -0.1 }, armR: { z: -0.75, el: -0.1 } };
function frame(t) {
  const s = Math.round(t);
  aff.root.visible = s !== 3 && s !== 4;
  mama.root.visible = s === 3 || s === 4 || s === 5 || s === 8;
  aff.root.position.set(0, 0, 0);
  mama.root.position.set(0, 0, 0);
  aff.pose({ smile: 0.8, ...A });
  mama.pose({ smile: 0.8, ...A });
  if (s === 0) look([0, 2.0, 15], [0, 1.9, 0]);
  if (s === 1) { aff.pose({ smile: 0.8, yaw: 0.7 }); look([0, 2.0, 15], [0, 1.9, 0]); }
  if (s === 2) { aff.pose({ smile: 0.8, yaw: -Math.PI / 2 }); look([0, 2.0, 15], [0, 1.9, 0]); }
  if (s === 3) look([0, 2.4, 17], [0, 2.3, 0]);
  if (s === 4) { mama.pose({ smile: 0.8, yaw: -Math.PI / 2 }); look([0, 2.4, 17], [0, 2.3, 0]); }
  if (s === 5) {
    aff.root.position.set(1.1, 0, 0.4);
    mama.root.position.set(-1.0, 0, 0);
    aff.pose({ smile: 1, yaw: -0.25, armR: { reach: [-0.32, 0.62, 0.62], pole: [-1, -0.6, -0.3], thumb: 1, wy: -1.2, wx: 0.15 } });
    mama.pose({ smile: 1, yaw: 0.3, armR: { reach: [-0.3, 0.5, 0.5], pole: [-1, -0.6, -0.3] } });
    look([0, 2.4, 17], [0, 2.2, 0]);
  }
  if (s === 6) {
    aff.pose({ smile: 0.9, talk: 0.7, lookX: 0.1 });
    aff.root.updateMatrixWorld(true);
    const h = aff.parts.head.getWorldPosition(new THREE.Vector3());
    look([h.x + 0.2, h.y + 0.05, h.z + 3.2], [h.x, h.y - 0.1, h.z], 30);
  }
  if (s === 8) {
    mama.root.visible = true;
    aff.root.visible = false;
    mama.pose({ smile: 0.9, talk: 0.5 });
    mama.root.updateMatrixWorld(true);
    const h = mama.parts.head.getWorldPosition(new THREE.Vector3());
    look([h.x + 0.2, h.y + 0.05, h.z + 3.4], [h.x, h.y - 0.15, h.z], 30);
  }
  if (s === 7) {
    aff.pose({ ...POSES.thinkR, brow: -0.3, smile: 0.5, lookY: 0.3, lookX: 0.3 });
    look([0.5, 2.6, 8], [0, 2.6, 0], 30);
  }
  renderer.setViewport(0, 0, W, H);
  renderer.render(scene, cam);
}
window.EP = { fps: 30, duration: 9, frame, thumbnail: () => frame(0), ready: Promise.resolve(true).then(() => (frame(0), true)) };
