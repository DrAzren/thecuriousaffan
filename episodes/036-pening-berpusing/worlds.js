// Episode 036 sets:
//  - a sunny playground: a colourful merry-go-round (pusing-pusing) with
//    hand rails, a bench, trees, bushes and a soft play mat;
//  - the "dalam telinga" (inside the ear) imagination world: three clear
//    looped tubes (the semicircular canals) on a soft peach stage, filled with
//    water shown as glowing blue beads, and a bulge on the horizontal tube
//    with tall soft hairs (in a jelly cap) that lean when the water moves;
//    the whole labyrinth can spin like a head turning;
//  - a cup of tea on a table (in the same scene, off to the side) with a
//    spoon and tea leaves, for "like water in a cup we stir";
//  - the Episode 031 "mind stage" with the big friendly brain;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeSky, makeGround, makeTree, makeBush, glow, glowTex } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildMindStage, BRAIN } from '../031-geletek-diri-sendiri/worlds.js';

export { buildOutro, buildMindStage, BRAIN };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

function sunShadow(light, size, map = 2048) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  const c = light.shadow.camera;
  c.left = -size;
  c.right = size;
  c.top = size;
  c.bottom = -size;
  c.near = 1;
  c.far = 120;
  light.shadow.bias = -0.0006;
  light.shadow.normalBias = 0.03;
}

// ------------------------------------------------------------- playground
export const PLAY_SCALE = 0.55; // Affan ~2.1 units tall
export const MGR_R = 2.1; // merry-go-round radius
export const MGR_TOP = 0.36;
export const BENCH = new THREE.Vector3(4.6, 0, 2.4);

export function buildPlayground() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfe6ff, 40, 160);
  const sky = makeSky({ top: 0x3d86e0, mid: 0x7db8f4, horizon: 0xffe6c4, bottom: 0x6a9a5a });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x6a8a4a, 1.2));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
  sun.position.set(12, 18, 10);
  sunShadow(sun, 14);
  scene.add(sun, sun.target);
  scene.add(makeGround(0x5fae54, 600));
  // soft play mat
  const mat = add(scene, new THREE.CylinderGeometry(4.6, 4.6, 0.06, 64), std(0x3fb8b0, 0.95), [0, 0.03, 0]);
  mat.receiveShadow = true;
  add(scene, new THREE.TorusGeometry(4.6, 0.09, 8, 96), std(0xffd166, 0.8), [0, 0.06, 0], [Math.PI / 2, 0, 0]).receiveShadow = true;

  // merry-go-round: coloured wedges, centre post, rails
  const mgr = new THREE.Group();
  scene.add(mgr);
  const cols = [0xff5a5a, 0xffd166, 0x4aa8ff, 0x5ccf6a, 0xff8a3d, 0xb07aff];
  for (let i = 0; i < 6; i++) {
    add(mgr, new THREE.CylinderGeometry(MGR_R, MGR_R, 0.18, 24, 1, false, (i / 6) * Math.PI * 2, Math.PI / 3), std(cols[i], 0.5), [0, MGR_TOP - 0.09, 0]);
  }
  add(mgr, new THREE.TorusGeometry(MGR_R, 0.06, 8, 64), std(0xf4f4f4, 0.4, { metalness: 0.3 }), [0, MGR_TOP - 0.02, 0], [Math.PI / 2, 0, 0]);
  add(scene, new THREE.CylinderGeometry(0.5, 0.7, MGR_TOP - 0.18, 24), std(0x6b7280, 0.6), [0, (MGR_TOP - 0.18) / 2, 0]);
  const rail = std(0xf4f4f4, 0.35, { metalness: 0.4 });
  add(mgr, new THREE.CylinderGeometry(0.09, 0.09, 1.6, 12), rail, [0, MGR_TOP + 0.8, 0]);
  add(mgr, new THREE.SphereGeometry(0.16, 16, 12), std(0xff5a5a, 0.4), [0, MGR_TOP + 1.65, 0]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const g = new THREE.Group();
    g.rotation.y = a;
    mgr.add(g);
    add(g, new THREE.CylinderGeometry(0.045, 0.045, 1.0, 10), rail, [MGR_R * 0.82, MGR_TOP + 0.5, 0]);
    add(g, new THREE.CylinderGeometry(0.045, 0.045, MGR_R * 0.82, 10), rail, [MGR_R * 0.41, MGR_TOP + 1.0, 0], [0, 0, Math.PI / 2]);
  }
  // Affan rides on the disk (child of mgr)
  const aff = makeAffan();
  aff.root.scale.setScalar(PLAY_SCALE);
  scene.add(aff.root);

  // bench
  const bench = new THREE.Group();
  bench.position.copy(BENCH);
  bench.rotation.y = -0.6;
  scene.add(bench);
  const wood = std(0xc98a4a, 0.7), iron = std(0x3a3f4f, 0.5, { metalness: 0.3 });
  for (let i = 0; i < 3; i++) add(bench, new RoundedBoxGeometry(2.4, 0.08, 0.22, 2, 0.03), wood, [0, 0.62, -0.25 + i * 0.25]);
  for (let i = 0; i < 2; i++) add(bench, new RoundedBoxGeometry(2.4, 0.18, 0.06, 2, 0.03), wood, [0, 0.95 + i * 0.25, -0.42], [-0.15, 0, 0]);
  for (const s of [-1, 1]) {
    add(bench, new THREE.BoxGeometry(0.08, 0.62, 0.6), iron, [1.0 * s, 0.31, -0.05]);
    add(bench, new THREE.BoxGeometry(0.08, 0.7, 0.08), iron, [1.0 * s, 0.95, -0.45], [-0.15, 0, 0]);
  }

  // trees, bushes, a little slide in the distance
  const R = rng(36);
  for (let i = 0; i < 26; i++) {
    const a = R() * Math.PI * 2, r = 11 + R() * 22;
    const tr = makeTree(R, { scale: 1.3 + R() * 0.6, leaf: [0x3f9a50, 0x4fb060, 0x2f8a45], toy: true });
    tr.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 4);
    scene.add(tr);
  }
  for (let i = 0; i < 18; i++) {
    const a = R() * Math.PI * 2, r = 7 + R() * 5;
    const b = makeBush(R, { scale: 1.2, color: 0x3f8f45 });
    b.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 2);
    scene.add(b);
  }
  const slide = new THREE.Group();
  slide.position.set(-7, 0, -6);
  slide.rotation.y = 0.5;
  scene.add(slide);
  add(slide, new THREE.BoxGeometry(1.2, 0.1, 4.2), std(0xffd166, 0.4), [0, 1.3, 0.6], [0.55, 0, 0]);
  add(slide, new THREE.BoxGeometry(1.4, 2.4, 1.2), std(0xff5a5a, 0.5), [0, 1.2, -1.6]);
  for (let i = 0; i < 6; i++) add(slide, new THREE.BoxGeometry(1.0, 0.08, 0.2), std(0x4aa8ff, 0.5), [0, 0.3 + i * 0.4, -2.35 - i * 0.05]);
  return { scene, sky, sun, mgr, aff, bench };
}

// -------------------------------------------------------------- inside the ear
export const CANAL_R = 1.7; // loop radius
export const TUBE_R = 0.3; // tube radius
export const AMP_ANGLE = Math.PI * 0.42; // where the hair bulge sits on the horizontal loop
export const N_BEADS = 34;
export const CUP = new THREE.Vector3(60, 0, 0);

function softBack(top, bot) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, bot: { value: new THREE.Color(bot) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, bot; varying vec3 vP;
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.2, 0.7, vP.y)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}

export function buildEar() {
  const scene = new THREE.Scene();
  const sky = softBack(0xffd9c8, 0xff9fa8);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xfff2ea, 0xb06070, 1.3));
  const key = new THREE.DirectionalLight(0xfff4ec, 2.0);
  key.position.set(6, 12, 9);
  sunShadow(key, 8);
  scene.add(key, key.target);
  const rimL = new THREE.DirectionalLight(0xc8e4ff, 1.0);
  rimL.position.set(-8, 4, -6);
  scene.add(rimL);

  // soft stage
  const stage = add(scene, new THREE.CylinderGeometry(5.5, 5.8, 0.5, 64), std(0xffe8dc, 0.85), [0, -0.25, 0]);
  stage.receiveShadow = true;
  add(scene, new THREE.TorusGeometry(5.55, 0.08, 8, 96), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0, 0.0, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  // floating soft bubbles in the background
  const R = rng(9);
  for (let i = 0; i < 22; i++) {
    const a = R() * Math.PI * 2, r = 9 + R() * 12;
    add(scene, new THREE.SphereGeometry(0.3 + R() * 0.8, 16, 12), std([0xffffff, 0xffd6e0, 0xffe9c8][i % 3], 0.6, { transparent: true, opacity: 0.8 }), [Math.cos(a) * r, 1 + R() * 9, -4 - Math.abs(Math.sin(a)) * r], [0, 0, 0], [1, 1, 1], false);
  }

  // the labyrinth (spins as a whole, like the head)
  const lab = new THREE.Group();
  lab.position.set(0, 2.6, 0);
  scene.add(lab);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xd8f4ff, transparent: true, opacity: 0.42, roughness: 0.08, metalness: 0, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1 });
  const glassEdge = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.45, roughness: 0.3, depthWrite: false });
  // horizontal loop in the xz plane; two upright loops at right angles
  const loops = [];
  const mk = (rot, color) => {
    const g = new THREE.Group();
    g.rotation.set(...rot);
    lab.add(g);
    const tube = new THREE.Mesh(new THREE.TorusGeometry(CANAL_R, TUBE_R, 20, 96, Math.PI * 1.7), glass);
    tube.rotation.set(Math.PI / 2, 0, 0); // lie in the local xz plane
    tube.renderOrder = 3;
    g.add(tube);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(CANAL_R, TUBE_R * 1.02, 6, 96, Math.PI * 1.7), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, wireframe: true, depthWrite: false }));
    rim.rotation.copy(tube.rotation);
    g.add(rim);
    loops.push(g);
    return g;
  };
  const hor = mk([0, 0, 0], 0x4aa8ff);
  const ant = mk([0, 0, Math.PI / 2], 0xff8ab0);
  ant.position.set(-0.6, 0.9, -0.2);
  const post = mk([Math.PI / 2, 0, 0], 0x7ad89a);
  post.position.set(0.2, 0.9, -0.6);
  // the vestibule: a soft bulb where the loops meet
  add(lab, new THREE.SphereGeometry(0.85, 32, 20), glassEdge, [0.9, 0.2, -1.0], [0, 0, 0], [1.3, 0.9, 1], false);
  // the bulge (ampulla) on the horizontal loop, with hairs in a jelly cap
  const amp = new THREE.Group();
  // torus points after the tube's x-rotation: (R cos θ, 0, R sin θ)
  amp.position.set(CANAL_R * Math.cos(AMP_ANGLE), 0, CANAL_R * Math.sin(AMP_ANGLE));
  amp.rotation.y = -AMP_ANGLE; // local x = radial, local z = along the tube (+θ)
  hor.add(amp);
  add(amp, new THREE.SphereGeometry(TUBE_R * 1.9, 24, 16), glassEdge, [0, 0, 0], [0, 0, 0], [1, 1, 1.25], false);
  const hairs = new THREE.Group();
  hairs.position.y = -TUBE_R * 1.6;
  hairs.scale.setScalar(1.35);
  amp.add(hairs);
  const hairMat = std(0xff4f9a, 0.35, { emissive: 0xff2a7a, emissiveIntensity: 0.6 });
  for (let i = 0; i < 7; i++) {
    const h = new THREE.Group();
    h.position.set((i - 3) * 0.07, 0, ((i * 5) % 3 - 1) * 0.06);
    hairs.add(h);
    add(h, new THREE.CylinderGeometry(0.018, 0.026, 0.62, 8), hairMat, [0, 0.31, 0], [0, 0, 0], [1, 1, 1], false);
    add(h, new THREE.SphereGeometry(0.035, 8, 6), hairMat, [0, 0.62, 0], [0, 0, 0], [1, 1, 1], false);
  }
  const cap = add(hairs, new THREE.SphereGeometry(0.42, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.35, roughness: 0.2, depthWrite: false }), [0, 0, 0], [0, 0, 0], [0.75, 1.65, 0.75], false);
  // water beads (positions set every frame) in the horizontal loop, plus a few in the others
  const beadMat = new THREE.MeshStandardMaterial({ color: 0x3f9bff, emissive: 0x1a6aff, emissiveIntensity: 0.6, roughness: 0.2 });
  const beadGeo = new THREE.SphereGeometry(0.1, 12, 8);
  const beads = Array.from({ length: N_BEADS }, () => {
    const b = new THREE.Mesh(beadGeo, beadMat);
    b.visible = false;
    scene.add(b);
    return b;
  });
  const sideBeads = [ant, post].map((g) =>
    Array.from({ length: 14 }, () => {
      const b = new THREE.Mesh(beadGeo, beadMat);
      b.visible = false;
      g.add(b);
      return b;
    })
  );
  // signal dots that fly from the hairs up to the brain
  const sigMat = new THREE.SpriteMaterial({ map: glowTex, color: 0x7affd8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const sig = Array.from({ length: 10 }, () => {
    const s = new THREE.Sprite(sigMat);
    s.scale.setScalar(0.45);
    s.visible = false;
    scene.add(s);
    return s;
  });
  // tiny Affan beside the stage edge, watching
  const aff = makeAffan();
  aff.root.scale.setScalar(0.42);
  scene.add(aff.root);

  // --------------------------------------------------------- cup of tea
  const cupSet = new THREE.Group();
  cupSet.position.copy(CUP);
  scene.add(cupSet);
  const table = add(cupSet, new THREE.CylinderGeometry(4, 4, 0.3, 48), std(0xc98a4a, 0.6), [0, -0.15, 0]);
  table.receiveShadow = true;
  const cupMat = std(0xffffff, 0.3);
  add(cupSet, new THREE.CylinderGeometry(1.25, 1.0, 1.7, 48, 1, true), cupMat, [0, 0.85, 0]).material.side = THREE.DoubleSide;
  add(cupSet, new THREE.CylinderGeometry(1.0, 1.0, 0.06, 48), cupMat, [0, 0.03, 0]);
  add(cupSet, new THREE.TorusGeometry(1.25, 0.05, 8, 64), std(0x4aa8ff, 0.4), [0, 1.7, 0], [Math.PI / 2, 0, 0]);
  add(cupSet, new THREE.TorusGeometry(0.45, 0.1, 12, 32, Math.PI * 1.2), cupMat, [1.3, 0.9, 0], [0, 0, -Math.PI * 0.6]);
  add(cupSet, new THREE.CylinderGeometry(1.9, 1.9, 0.08, 48), std(0xffffff, 0.35), [0, 0.04, 0]);
  // tea surface with a swirl texture (rotated every frame)
  const swirl = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#c8823a';
    g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(255,230,190,0.55)';
    g.lineWidth = 10;
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      for (let i = 0; i <= 200; i++) {
        const a = (i / 200) * Math.PI * 3 + (k * Math.PI) / 2;
        const r = (i / 200) * 240;
        g.lineTo(256 + Math.cos(a) * r, 256 + Math.sin(a) * r);
      }
      g.stroke();
    }
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    return tx;
  })();
  const tea = add(cupSet, new THREE.CircleGeometry(1.2, 48), std(0xffffff, 0.15, { map: swirl }), [0, 1.45, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  const leaves = Array.from({ length: 10 }, (_, i) => {
    const l = add(cupSet, new THREE.SphereGeometry(0.07, 8, 6), std(0x3a5a20, 0.8), [0, 1.47, 0], [0, 0, 0], [1.6, 0.4, 0.8], false);
    l.userData.r = 0.25 + (i % 5) * 0.18;
    l.userData.a = i * 2.1;
    return l;
  });
  const spoon = new THREE.Group();
  cupSet.add(spoon);
  add(spoon, new THREE.CylinderGeometry(0.06, 0.06, 2.4, 10), std(0xd8dde6, 0.25, { metalness: 0.7 }), [0, 1.2, 0]);
  add(spoon, new THREE.SphereGeometry(0.22, 16, 10), std(0xd8dde6, 0.25, { metalness: 0.7 }), [0, 0, 0], [0, 0, 0], [1, 0.4, 1.4]);

  return { scene, sky, lab, loops, hor, amp, hairs, cap, beads, sideBeads, sig, aff, cupSet, tea, leaves, spoon };
}
