// Look at the Higgsfield GLB characters as they come (not an episode).
// t=0 Affan front, 1 side, 2 back, 3 face, 4 Mama front, 5 side, 6 face, 7 both
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { makeRenderer, W, H } from '../../shared/core.js';

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfd0d2);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a90, 1.3));
const key = new THREE.DirectionalLight(0xffffff, 1.8);
key.position.set(2, 4, 5);
scene.add(key);
const fill = new THREE.DirectionalLight(0xe8eeff, 0.6);
fill.position.set(-4, 2, 3);
scene.add(fill);
const cam = new THREE.PerspectiveCamera(30, W / H, 0.01, 100);
const loader = new GLTFLoader();
const load = (u) => new Promise((res, rej) => loader.load(u, res, undefined, rej));
let A, M;
const look = (p, t) => {
  cam.position.set(...p);
  cam.updateProjectionMatrix();
  cam.lookAt(new THREE.Vector3(...t));
};
function frame(t) {
  const s = Math.round(t);
  A.scene.visible = s <= 3 || s === 7;
  M.scene.visible = s >= 4;
  A.scene.position.set(s === 7 ? 0.35 : 0, 0, 0);
  M.scene.position.set(s === 7 ? -0.35 : 0, 0, 0);
  A.scene.rotation.y = s === 1 ? -Math.PI / 2 : s === 2 ? Math.PI : 0;
  M.scene.rotation.y = s === 5 ? -Math.PI / 2 : 0;
  if (s <= 2) look([0, 0.6, 3.2], [0, 0.58, 0]);
  if (s === 3) look([0, 0.92, 0.7], [0, 0.9, 0]);
  if (s === 4 || s === 5) look([0, 0.82, 4.4], [0, 0.8, 0]);
  if (s === 6) look([0, 1.42, 0.8], [0, 1.4, 0]);
  if (s === 7) look([0, 0.8, 4.6], [0, 0.78, 0]);
  renderer.setViewport(0, 0, W, H);
  renderer.render(scene, cam);
}
window.EP = {
  fps: 30, duration: 8, frame, thumbnail: () => frame(0),
  ready: (async () => {
    [A, M] = await Promise.all([load('/assets/characters/affan_v2.glb'), load('/assets/characters/mama_v2.glb')]);
    scene.add(A.scene, M.scene);
    frame(0);
    return true;
  })(),
};
