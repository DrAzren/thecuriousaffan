// Skin-weight view of the GLB cast (not an episode): red = upper/fore arm weights,
// green = head + neck weights, after fixWeights() (t >= 4: as the auto-rig left them).
//   node tools/render.js tools/glb-weights --stills 0,1,2,3 --out <dir>
// t=0 Affan front, 1 Affan side, 2 Mama front, 3 Mama side
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { makeRenderer, W, H } from '../../shared/core.js';
import { fixWeights } from '../../shared/glbcast.js';

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x303034);
const cam = new THREE.PerspectiveCamera(30, W / H, 0.01, 100);
const loader = new GLTFLoader();
const load = (u) => new Promise((res, rej) => loader.load(u, res, undefined, rej));
const G = {};
function paint(g, who) {
  let sk;
  g.scene.traverse((o) => { if (o.isSkinnedMesh) sk = o; });
  const names = sk.skeleton.bones.map((b) => b.name);
  const arm = new Set(['LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm'].map((n) => names.indexOf(n)));
  const hd = new Set(['Head', 'neck'].map((n) => names.indexOf(n)));
  const geo = sk.geometry, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight;
  const col = new Float32Array(SI.count * 3);
  for (let i = 0; i < SI.count; i++) {
    let a = 0, h = 0;
    for (let k = 0; k < 4; k++) {
      const b = SI.getComponent(i, k), w = SW.getComponent(i, k);
      if (arm.has(b)) a += w;
      if (hd.has(b)) h += w;
    }
    col.set([0.15 + a * 0.85, 0.15 + h * 0.85, 0.15], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  sk.material = new THREE.MeshBasicMaterial({ vertexColors: true });
}
function frame(t) {
  const s = Math.round(t);
  const who = s < 2 ? 'affan' : 'mama';
  G.affan.scene.visible = who === 'affan';
  G.mama.scene.visible = who === 'mama';
  G[who].scene.rotation.y = s % 2 ? -Math.PI / 2 : 0;
  const h = who === 'affan' ? 1.15 : 1.6;
  cam.position.set(0, h * 0.55, h * 2.8);
  cam.lookAt(0, h * 0.52, 0);
  renderer.render(scene, cam);
}
window.EP = {
  fps: 30, duration: 4, frame, thumbnail: () => frame(0),
  ready: (async () => {
    for (const k of ['affan', 'mama']) {
      G[k] = await load(`/assets/characters/${k}_v2.glb`);
      fixWeights(G[k], k);
      paint(G[k], k);
      scene.add(G[k].scene);
    }
    frame(0);
    return true;
  })(),
};
