// Marker grid on the faces, to place the talking mouth and blinking lids.
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
const cam = new THREE.PerspectiveCamera(20, W / H, 0.01, 100);
const loader = new GLTFLoader();
const load = (u) => new Promise((res, rej) => loader.load(u, res, undefined, rej));
let G = {};
function frame(t) {
  const who = t < 0.5 ? 'affan' : 'mama';
  for (const k in G) G[k].scene.visible = k === who;
  const g = G[who];
  const hf = g.scene.getObjectByName('headfront');
  const p = hf.getWorldPosition(new THREE.Vector3());
  const oy = who === 'mama' ? 0.18 : 0;
  cam.position.set(p.x, p.y + oy, p.z + 0.9);
  cam.lookAt(p.x, p.y + oy, p.z);
  renderer.render(scene, cam);
  window.__info = JSON.stringify({ who, hf: p.toArray().map((v) => +v.toFixed(4)) });
}
window.EP = {
  fps: 30, duration: 2, frame, thumbnail: () => frame(0),
  ready: (async () => {
    for (const k of ['affan', 'mama']) {
      G[k] = await load(`/assets/characters/${k}_v2.glb`);
      scene.add(G[k].scene);
      G[k].scene.updateMatrixWorld(true);
      const hf = G[k].scene.getObjectByName('headfront');
      const head = G[k].scene.getObjectByName('Head');
      // grid of markers in head space, every 1 cm, around headfront
      const hp = hf.getWorldPosition(new THREE.Vector3());
      for (let i = -6; i <= 6; i += 2) for (let j = -10; j <= 6; j += 2) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 8, 6), new THREE.MeshBasicMaterial({ color: (i === 0 && j === 0) ? 0xff0000 : (j % 4 === 0 && i % 4 === 0 ? 0x0000ff : 0x00aa00) }));
        m.position.set(hp.x + i / 100, hp.y + j / 100 + (k === 'mama' ? 0.18 : 0), hp.z + (k === 'mama' ? 0.06 : 0.01));
        scene.add(m);
      }
    }
    frame(0);
    return true;
  })(),
};
