// The Curious Affan: the real 3D cast (from Episode 064).
//
// Affan and Mama are the owner's Higgsfield 3D avatars, converted to rigged,
// textured GLB models (Higgsfield "Multi-Image to 3D" with auto-rigging):
//   assets/characters/affan_v2.glb   (from affan_v2_front/side.webp)
//   assets/characters/mama_v2.glb    (from mama_v2_front/side.png)
// They are loaded once by useGlbCast() and cloned per character instance.
//
// makeGlbCast(who) returns the same interface as makeAffan() in affan.js:
//   { root, parts, pose, toTorso }
// so sets and shots written for the procedural rig keep working:
//   - root: feet at y = 0, faces +z; Affan is ~3.8 units tall, Mama ~3.3
//     (the kitchen scales Mama by 0.8 and Affan by 0.52, as before)
//   - parts.head / torso / neck / body, parts.arms.L|R.{shoulder, elbow, hand}
//   - pose({ yaw, lean, tilt, bob, headYaw, headPitch, headRoll, talk, smile,
//     wow, blink, brow, armL, armR, legL, legR }) with the same meaning;
//     arms accept { reach: [x,y,z], pole } (torso-local, the v1 frame: shoulders
//     near y 0.86) or { x, z, el } like v1. point/thumb/look are accepted but
//     the GLB hands and eyes have no separate fingers or irises.
//   - talk/wow open a mouth drawn over the face, blink closes skin-coloured
//     lids taken from the model's own texture.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { clamp, lerp } from './core.js';
import { setCastStyle } from './style.js';

const BASE = new URL('../assets/characters/', import.meta.url).href;
const loader = new GLTFLoader();
const load = (f) => new Promise((res, rej) => loader.load(BASE + f, res, undefined, rej));
const GLTF = {};
let loading = null;
// call once at the top of an episode (top-level await) before any set is built:
//   await useGlbCast();   // makeAffan() / makeMama() then return these models
export function useGlbCast() {
  setCastStyle('glb');
  loading ||= Promise.all([load('affan_v2.glb'), load('mama_v2.glb')]).then(([a, m]) => {
    GLTF.affan = a;
    GLTF.mama = m;
  });
  return loading;
}

const SPEC = {
  // height in units; face feature offsets (metres, model space) from the 'headfront' joint:
  // mouth centre, eye centres (x, y) and mouth width
  affan: { height: 3.8, mouth: [0, 0.026], eyeX: 0.043, eyeY: 0.075, mouthW: 0.05, lidR: 0.02, headK: 0.38 },
  mama: { height: 3.3, mouth: [0, 0.112], eyeX: 0.047, eyeY: 0.186, mouthW: 0.045, lidR: 0.021, headK: 0.5 },
};

const V = () => new THREE.Vector3();
const Q = () => new THREE.Quaternion();
const _a = V(), _b = V(), _c = V(), _q = Q(), _q2 = Q();

// rotate a bone (in world space) so that the direction from it to `child` becomes `dir`
function aimBone(bone, child, dir) {
  bone.updateWorldMatrix(true, false);
  const p = bone.getWorldPosition(_a);
  const c = child.getWorldPosition(_b);
  const cur = c.sub(p).normalize();
  _q.setFromUnitVectors(cur, _c.copy(dir).normalize());
  const wq = bone.getWorldQuaternion(Q());
  const nw = _q.multiply(wq);
  const pq = bone.parent.getWorldQuaternion(_q2);
  bone.quaternion.copy(pq.invert().multiply(nw));
  bone.updateMatrixWorld(true);
}
// rotate a bone about a world-space axis
function turnBone(bone, axis, ang) {
  if (!ang) return;
  bone.updateWorldMatrix(true, false);
  const wq = bone.getWorldQuaternion(Q());
  const nw = Q().setFromAxisAngle(axis, ang).multiply(wq);
  const pq = bone.parent.getWorldQuaternion(Q());
  bone.quaternion.copy(pq.invert().multiply(nw));
  bone.updateMatrixWorld(true);
}

// ---- face decals: computed once per character, in head-bone space ----
const FACE = {};
function buildFace(who, S, skinned, bones, m2u) {
  // a plain mesh of the face triangles in the bind pose (ray casts on it are fast)
  const hf = bones.headfront.getWorldPosition(V());
  const g = skinned.geometry, I = g.index;
  const mw = skinned.matrixWorld;
  const lo = V().set(hf.x - 0.14 * m2u, hf.y - 0.06 * m2u, hf.z - 0.15 * m2u);
  const hi = V().set(hf.x + 0.14 * m2u, hf.y + 0.32 * m2u, hf.z + 0.2 * m2u);
  const box = new THREE.Box3(lo, hi);
  // skinned (bind pose) vertex positions in world space
  const n = g.attributes.position.count, W3 = new Float32Array(n * 3), vv = V();
  for (let i = 0; i < n; i++) {
    skinned.getVertexPosition(i, vv).applyMatrix4(mw);
    W3[i * 3] = vv.x; W3[i * 3 + 1] = vv.y; W3[i * 3 + 2] = vv.z;
  }
  const pos = [];
  const t = [V(), V(), V()];
  for (let i = 0; i < I.count; i += 3) {
    for (let k = 0; k < 3; k++) t[k].fromArray(W3, I.getX(i + k) * 3);
    if (!box.containsPoint(t[0]) && !box.containsPoint(t[1]) && !box.containsPoint(t[2])) continue;
    t.forEach((v) => pos.push(v.x, v.y, v.z));
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const faceMesh = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const ray = new THREE.Raycaster();
  const down = V().set(0, 0, -1);
  const castAt = (x, y, zMax) => {
    ray.set(V().set(x, y, hf.z + 2 * m2u), down);
    return ray.intersectObject(faceMesh, false).find((h) => h.point.z < zMax) || null;
  };
  const hitFace = (dx, dy) => castAt(hf.x + dx * m2u, hf.y + dy * m2u, Infinity);
  // UV of a skin texel (on the full skinned mesh: the face mesh above has no UVs)
  const skinUV = (dx, dy) => {
    ray.set(V().set(hf.x + dx * m2u, hf.y + dy * m2u, hf.z + 2 * m2u), down);
    const h = ray.intersectObject(skinned, false)[0];
    return h && h.uv ? h.uv.clone() : new THREE.Vector2(0.5, 0.5);
  };
  const headInv = bones.head.matrixWorld.clone().invert();
  // a grid laid onto the face around c (rx, ry in units), skipping anything more than
  // `front` in front of c (Affan's glasses), returned in head-bone space
  const patch = (c, rx, ry, front, uv) => {
    const nx = 16, ny = 14, P2 = [], PL = [], UV = [], idx = [];
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nx; i++) {
        const u = -1 + (2 * i) / nx, v = -1 + (2 * j) / ny;
        const x = c.x + u * rx, y = c.y + v * ry;
        const h = castAt(x, y, c.z + front);
        const z = h ? h.point.z : c.z - 0.01 * m2u;
        const p = V().set(x, y, z + 0.0012 * m2u).applyMatrix4(headInv);
        P2.push(p.x, p.y, p.z);
        PL.push(u, v);
        UV.push(uv ? uv.x : 0, uv ? uv.y : 0);
      }
    }
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i, b = a + 1, c2 = a + nx + 1, d = c2 + 1;
        idx.push(a, b, d, a, d, c2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P2, 3));
    geo.setAttribute('pl', new THREE.Float32BufferAttribute(PL, 2));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  };
  const mh = hitFace(S.mouth[0], S.mouth[1]);
  const mc = mh ? mh.point : hf.clone();
  const mouth = patch(mc, S.mouthW * 0.62 * m2u, S.mouthW * 0.62 * m2u, 0.01 * m2u);
  const lids = [-1, 1].map((side) => {
    const eh = hitFace(side * S.eyeX, S.eyeY);
    const ec = eh ? eh.point : hf.clone();
    const uv = skinUV(side * S.eyeX * 1.1, S.eyeY - S.lidR * 1.9);
    return patch(ec, S.lidR * 1.4 * m2u, S.lidR * 1.3 * m2u, 0.008 * m2u, uv);
  });
  return { mouth, lids };
}

export function makeGlbCast(who = 'affan') {
  const S = SPEC[who];
  if (!GLTF[who]) throw new Error('makeGlbCast: call await useGlbCast() first');
  const root = new THREE.Group();
  root.name = who === 'mama' ? 'Mama' : 'Affan';
  const body = new THREE.Group();
  root.add(body);
  const model = SkeletonUtils.clone(GLTF[who].scene);
  body.add(model);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  model.scale.setScalar(S.height / (box.max.y - box.min.y));
  model.updateMatrixWorld(true);
  let skinned = null;
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
      if (o.isSkinnedMesh) skinned = o;
      if (o.material) {
        o.material = o.material.clone();
        o.material.roughness = Math.max(0.55, o.material.roughness ?? 0.6);
        o.material.metalness = 0;
      }
    }
  });
  const B = (n) => model.getObjectByName(n);
  const bones = {
    hips: B('Hips'), spine: B('Spine02'), spine1: B('Spine01'), chest: B('Spine'), neck: B('neck'), head: B('Head'), headfront: B('headfront'),
    L: { sh: B('LeftShoulder'), arm: B('LeftArm'), fore: B('LeftForeArm'), hand: B('LeftHand') },
    R: { sh: B('RightShoulder'), arm: B('RightArm'), fore: B('RightForeArm'), hand: B('RightHand') },
    LL: { up: B('LeftUpLeg'), leg: B('LeftLeg'), foot: B('LeftFoot'), toe: B('LeftToeBase') },
    RL: { up: B('RightUpLeg'), leg: B('RightLeg'), foot: B('RightFoot'), toe: B('RightToeBase') },
  };
  const all = [];
  model.traverse((o) => { if (o.isBone) all.push(o); });
  const rest = new Map(all.map((b) => [b, b.quaternion.clone()]));

  // torso proxy: the v1 torso-local frame (shoulders at y 0.86)
  const shoulderY = bones.L.arm.getWorldPosition(V()).y;
  const torso = new THREE.Group();
  torso.position.set(0, shoulderY - 0.86, 0);
  body.add(torso);
  const L1 = bones.L.arm.getWorldPosition(V()).distanceTo(bones.L.fore.getWorldPosition(V()));
  const L2 = bones.L.fore.getWorldPosition(V()).distanceTo(bones.L.hand.getWorldPosition(V())) * 1.08;

  // ---------- face overlays ----------
  // The GLB faces are painted (no face bones), so talking and blinking are drawn as decals
  // that hug the face: small grids laid onto the skin by ray casts in the bind pose, then
  // fixed to the head bone. Shaders cut the open mouth / the closing lids out of them.
  const head = bones.head;
  const m2u = model.scale.x; // metres -> units
  const F = FACE[who] || (FACE[who] = buildFace(who, S, skinned, bones, m2u));
  const tex = skinned.material.map;
  const faceGroup = new THREE.Group();
  head.add(faceGroup);
  const mk = (geo, mat) => {
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false;
    m.renderOrder = 2;
    faceGroup.add(m);
    return m;
  };
  const U = {
    mouth: { a: { value: 0.7 }, b: { value: 0.3 }, cy: { value: 0 }, flat: { value: 1 } },
    lid: { e: { value: 1.3 }, lash: { value: 0 } },
  };
  const mouthMat = new THREE.MeshBasicMaterial({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  mouthMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uA: U.mouth.a, uB: U.mouth.b, uCy: U.mouth.cy, uFlat: U.mouth.flat });
    sh.vertexShader = 'attribute vec2 pl;\nvarying vec2 vPl;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPl = pl;');
    sh.fragmentShader = 'uniform float uA, uB, uCy, uFlat;\nvarying vec2 vPl;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec2 q = vPl;
      float dy = q.y - uCy;
      if (uFlat > 0.5 && dy > 0.06 * (1.0 - q.x * q.x / (uA * uA))) discard;
      if ((q.x * q.x) / (uA * uA) + (dy * dy) / (uB * uB) > 1.0) discard;
      float ty = dy + uB * 0.78;
      float tg = (q.x * q.x) / (uA * uA * 0.42) + (ty * ty) / (uB * uB * 0.3);
      diffuseColor.rgb = tg < 1.0 ? vec3(0.62, 0.15, 0.17) : vec3(0.07, 0.008, 0.012);`);
  };
  const mouth = mk(F.mouth, mouthMat);
  const lidMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, metalness: 0, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
  lidMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uE: U.lid.e, uLash: U.lid.lash });
    sh.vertexShader = 'attribute vec2 pl;\nvarying vec2 vPl;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPl = pl;');
    sh.fragmentShader = 'uniform float uE, uLash;\nvarying vec2 vPl;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      vec2 q = vPl;
      if (q.x * q.x + q.y * q.y > 1.0) discard;
      float edge = uE - 0.22 * (1.0 - q.x * q.x) * uLash;
      if (q.y < edge) discard;
      if (uLash > 0.0 && q.y < edge + 0.11 && abs(q.x) < 0.97) diffuseColor.rgb = vec3(0.11, 0.06, 0.05);`);
  };
  const lids = F.lids.map((g) => mk(g, lidMat));

  // parts: expose the bones under the names the sets use
  const arms = {
    L: { shoulder: bones.L.arm, elbow: bones.L.fore, hand: bones.L.hand, index: new THREE.Group(), thumb: new THREE.Group() },
    R: { shoulder: bones.R.arm, elbow: bones.R.fore, hand: bones.R.hand, index: new THREE.Group(), thumb: new THREE.Group() },
  };
  const legs = { L: { hip: bones.LL.up, knee: bones.LL.leg }, R: { hip: bones.RL.up, knee: bones.RL.leg } };
  // seatY: height of the seat under the hips when sitting (root units); to sit on a
  // surface at height h, put root.position.y = h - seatY and pose POSES.seated
  const seatY = bones.LL.up.getWorldPosition(V()).y - 0.045 * S.height;
  const parts = { root, body, torso, seatY, neck: bones.neck, head, legs, arms, model, mouth, lids, glasses: new THREE.Group() };

  const DEF = {
    yaw: 0, lean: 0, tilt: 0, bob: 0, headYaw: 0, headPitch: 0, headRoll: 0, lookX: 0, lookY: 0, blink: 0,
    talk: 0, smile: 0.6, wow: 0, brow: 0,
    armL: { x: 0, z: 0.1, el: -0.15 }, armR: { x: 0, z: -0.1, el: -0.15 },
    legL: { x: 0, knee: 0 }, legR: { x: 0, knee: 0 },
  };
  const ax = { x: V(), y: V(), z: V() };
  const tq = Q();
  const toWorldDir = (v) => V().fromArray(v).applyQuaternion(tq).normalize();
  const rotX = (v, a) => v.applyAxisAngle(V().set(1, 0, 0), a);
  const rotZ = (v, a) => v.applyAxisAngle(V().set(0, 0, 1), a);

  function setArm(k, p, side) {
    const b = bones[k];
    const S0 = b.arm.getWorldPosition(V());
    let E, T;
    if (p.reach) {
      // the v1 head is about twice as big: pull targets above the shoulders down towards them
      const r = p.reach;
      const y = r[1] > 0.86 ? 0.86 + (r[1] - 0.86) * S.headK : r[1];
      T = torso.localToWorld(V().set(r[0], y, r[2]));
      const d = T.clone().sub(S0);
      const dist = clamp(d.length(), 0.1, (L1 + L2) * 0.995);
      d.normalize();
      const ang = Math.acos(clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1));
      const n = toWorldDir(p.pole || [0.3 * side, -1, -0.6]);
      n.sub(d.clone().multiplyScalar(n.dot(d))).normalize();
      const u = d.clone().multiplyScalar(Math.cos(ang)).addScaledVector(n, Math.sin(ang)).normalize();
      E = S0.clone().addScaledVector(u, L1);
      T = S0.clone().addScaledVector(d, dist);
    } else {
      const d1 = rotX(rotZ(V().set(0, -1, 0), p.z ?? 0), p.x ?? 0);
      const d2 = rotX(d1.clone(), p.el ?? 0);
      E = S0.clone().addScaledVector(d1.applyQuaternion(tq), L1);
      T = E.clone().addScaledVector(d2.applyQuaternion(tq), L2);
    }
    aimBone(b.arm, b.fore, E.clone().sub(S0));
    aimBone(b.fore, b.hand, T.clone().sub(b.fore.getWorldPosition(V())));
    if (p.wx || p.wy || p.wz) {
      turnBone(b.hand, ax.x, p.wx || 0);
      turnBone(b.hand, ax.y, (p.wy || 0) * 0.5);
      turnBone(b.hand, ax.z, p.wz || 0);
    }
  }
  function setLeg(k, l) {
    const b = bones[k];
    const x = l.x ?? 0, kn = l.knee ?? 0;
    if (!x && !kn && !l.z) return;
    const d1 = rotZ(rotX(V().set(0, -1, 0), x), l.z ?? 0).applyQuaternion(tq);
    const d2 = rotX(V().set(0, -1, 0), x + kn).applyQuaternion(tq);
    aimBone(b.up, b.leg, d1);
    aimBone(b.leg, b.foot, d2);
  }

  function pose(p = {}) {
    const q = { ...DEF, ...p, armL: { ...DEF.armL, ...(p.armL || {}) }, armR: { ...DEF.armR, ...(p.armR || {}) } };
    for (const [b, r] of rest) b.quaternion.copy(r);
    root.rotation.y = q.yaw;
    body.position.y = q.bob;
    root.updateMatrixWorld(true);
    root.getWorldQuaternion(tq);
    ax.x.set(1, 0, 0).applyQuaternion(tq);
    ax.y.set(0, 1, 0).applyQuaternion(tq);
    ax.z.set(0, 0, 1).applyQuaternion(tq);
    turnBone(bones.spine, ax.x, q.lean * 0.6);
    turnBone(bones.chest, ax.x, q.lean * 0.4);
    turnBone(bones.spine, ax.z, -q.tilt);
    // head: yaw, then pitch (+ = down), then roll
    turnBone(bones.neck, ax.y, q.headYaw * 0.35);
    turnBone(head, ax.y, q.headYaw * 0.65);
    turnBone(bones.neck, ax.x, q.headPitch * 0.35);
    turnBone(head, ax.x, q.headPitch * 0.65);
    turnBone(head, ax.z, -q.headRoll);
    setArm('L', q.armL, 1);
    setArm('R', q.armR, -1);
    setLeg('LL', q.legL || {});
    setLeg('RL', q.legR || {});
    // face
    const talk = clamp(q.talk), wow = clamp(q.wow);
    if (wow > 0.05 && wow >= talk) {
      // "O": a round opening centred a little under the mouth line
      U.mouth.flat.value = 0;
      U.mouth.a.value = lerp(0.1, 0.42, wow);
      U.mouth.b.value = lerp(0.1, 0.55, wow);
      U.mouth.cy.value = -0.35 * wow;
    } else {
      // "D": flat top on the mouth line, opening downwards with the voice
      U.mouth.flat.value = 1;
      U.mouth.a.value = lerp(0.62, 0.8, talk);
      U.mouth.b.value = lerp(0.12, 0.72, talk);
      U.mouth.cy.value = 0;
    }
    mouth.visible = talk > 0.06 || wow > 0.05;
    // lids: the lower edge comes down from above the eye (1.3) to just under its middle
    const bl = clamp(q.blink);
    U.lid.e.value = lerp(1.05, -0.2, bl);
    U.lid.lash.value = bl > 0.45 ? 1 : 0;
    lids.forEach((l) => (l.visible = bl > 0.05));
    root.updateMatrixWorld(true);
  }
  pose();
  const toTorso = (v) => {
    root.updateMatrixWorld(true);
    return torso.worldToLocal(v.clone()).toArray();
  };
  return { root, parts, pose, toTorso };
}
