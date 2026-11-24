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
    fixWeights(a, 'affan');
    fixWeights(m, 'mama');
    GLTF.affan = a;
    GLTF.mama = m;
  });
  return loading;
}

// The auto-rig spreads the arm weights over the chest and (on Mama) the head weights
// down the whole tudung and baju, so raising an arm or turning the head drags the
// clothes sideways. Move those weights to the chest bone: arm weights inside the
// shoulders, head/neck weights below the chin (fading out between chin and shoulders).
export function fixWeights(gltf, who) {
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  let sk = null;
  scene.traverse((o) => { if (o.isSkinnedMesh) sk = o; });
  const bones = sk.skeleton.bones;
  const bi = (n) => bones.findIndex((b) => b.name === n);
  const wp = (n) => scene.getObjectByName(n).getWorldPosition(V());
  const chest = bi('Spine');
  const arms = new Set(['LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm'].map(bi));
  const heads = new Set(['Head', 'neck', 'head_end', 'headfront'].map(bi).filter((i) => i >= 0));
  const shL = wp('LeftArm'), shR = wp('RightArm');
  const cx = (shL.x + shR.x) / 2, halfW = Math.abs(shL.x - shR.x) / 2;
  const shY = (shL.y + shR.y) / 2;
  const chinY = wp('headfront').y + SPEC[who].chin;
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  // arm segments in the bind pose; a vertex far from both is not part of the sleeve
  const segs = ['Left', 'Right'].flatMap((sd) => [[wp(sd + 'Arm'), wp(sd + 'ForeArm')], [wp(sd + 'ForeArm'), wp(sd + 'Hand')]]);
  const line = new THREE.Line3(), cp = V();
  const armDist = (q) => Math.min(...segs.map(([a, b]) => { line.set(a, b); return line.closestPointToPoint(q, true, cp).distanceTo(q); }));
  const R = SPEC[who].sleeve;
  const g = sk.geometry, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
  const p = V(), idx = [0, 0, 0, 0], w = [0, 0, 0, 0];
  for (let i = 0; i < SI.count; i++) {
    sk.getVertexPosition(i, p).applyMatrix4(sk.matrixWorld);
    const fArm = Math.max(1 - sm(0.7 * halfW, halfW, Math.abs(p.x - cx)), sm(R, 1.6 * R, armDist(p)));
    const fHead = sm(chinY, chinY - 0.85 * (chinY - shY), p.y);
    if (fArm <= 0 && fHead <= 0) continue;
    let moved = 0;
    for (let k = 0; k < 4; k++) {
      idx[k] = SI.getComponent(i, k);
      w[k] = SW.getComponent(i, k);
      const f = arms.has(idx[k]) ? fArm : heads.has(idx[k]) ? fHead : 0;
      if (f > 0 && w[k] > 0) {
        moved += w[k] * f;
        w[k] *= 1 - f;
      }
    }
    if (moved <= 1e-4) continue;
    let slot = idx.findIndex((b, k) => b === chest && w[k] > 0);
    if (slot < 0) slot = w.indexOf(Math.min(...w)); // weakest slot (often empty) becomes the chest
    if (idx[slot] !== chest) {
      moved += w[slot];
      w[slot] = 0;
      idx[slot] = chest;
    }
    w[slot] += moved;
    const sum = w[0] + w[1] + w[2] + w[3];
    for (let k = 0; k < 4; k++) {
      SI.setComponent(i, k, idx[k]);
      SW.setComponent(i, k, w[k] / sum);
    }
  }
  SI.needsUpdate = true;
  SW.needsUpdate = true;
}

const GLOW = 0.3;
const SPEC = {
  // height in units; face feature offsets (metres, model space) from the 'headfront' joint:
  // mouth anchor (on the painted mouth line), eye centres (x, y); M = mouth decal (metres)
  affan: {
    height: 3.8, glow: GLOW, mouth: [-0.0012, 0.026], eyeX: 0.043, eyeY: 0.075,
    M: { R: 0.045, K: 2.4, top: 0.0014, a: 0.0345, bMin: 0.0045, bMax: 0.014, teeth: 0.0014, oA: 0.009, oB: 0.012, oY: -0.002, wowO: true }, lidR: 0.02, lidRy: 1.3, lidRing: 1.7, headK: 0.38, chin: -0.012, sleeve: 0.045 },
  mama: {
    height: 3.3, glow: GLOW, mouth: [-0.003, 0.115], eyeX: 0.047, eyeY: 0.186,
    M: { R: 0.05, K: 2.6, K4: 1400, top: 0.0016, a: 0.0355, bMin: 0.0065, bMax: 0.017, teeth: 0.0018, oA: 0.01, oB: 0.013, oY: -0.001 }, lidR: 0.021, lidRy: 1.5, lidRing: 1.55, headK: 0.5, chin: 0.075, sleeve: 0.06 },
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
  const pos = [], triV = [];
  const t = [V(), V(), V()];
  for (let i = 0; i < I.count; i += 3) {
    for (let k = 0; k < 3; k++) t[k].fromArray(W3, I.getX(i + k) * 3);
    if (!box.containsPoint(t[0]) && !box.containsPoint(t[1]) && !box.containsPoint(t[2])) continue;
    t.forEach((v) => pos.push(v.x, v.y, v.z));
    triV.push(I.getX(i), I.getX(i + 1), I.getX(i + 2));
  }
  const SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
  // the skin vertex a decal vertex copies its bone weights from: the nearest corner of the hit triangle
  const nearestV = (h) => {
    let best = -1, bd = Infinity;
    for (let k = 0; k < 3; k++) {
      const vi = triV[h.faceIndex * 3 + k];
      const d = vv.fromArray(W3, vi * 3).distanceToSquared(h.point);
      if (d < bd) { bd = d; best = vi; }
    }
    return best;
  };
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
  const meshInv = mw.clone().invert();
  // skin vertices are stored un-skinned; undo the current (rest pose) skinning of vertex sv
  const skel = skinned.skeleton, blend = new THREE.Matrix4(), bm = new THREE.Matrix4();
  const unskin = (sv) => {
    blend.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    for (let k = 0; k < 4; k++) {
      const w = SW.getComponent(sv, k);
      if (!w) continue;
      const b = SI.getComponent(sv, k);
      bm.multiplyMatrices(skel.bones[b].matrixWorld, skel.boneInverses[b]);
      for (let e = 0; e < 16; e++) blend.elements[e] += bm.elements[e] * w;
    }
    return new THREE.Matrix4().multiplyMatrices(skinned.bindMatrixInverse, blend).multiply(skinned.bindMatrix).invert();
  };
  // a grid laid onto the face around c (rx, ry in units), skipping anything more than
  // `front` in front of c (Affan's glasses). Returned in the skinned mesh's own space, with the
  // bone weights of the skin under each vertex, so it bends exactly like the face does.
  const patch = (c, rx, ry, front, { uv = null, smooth = 0, flat = false } = {}) => {
    const nx = 16, ny = 14, PL = [], UV = [], BI = [], BW = [], idx = [];
    const hc = castAt(c.x, c.y, c.z + front);
    const vc = hc ? nearestV(hc) : 0;
    const X = [], Y = [], Z = [], SV = [];
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nx; i++) {
        const u = -1 + (2 * i) / nx, v = -1 + (2 * j) / ny;
        const x = c.x + u * rx, y = c.y + v * ry;
        const h = castAt(x, y, c.z + front);
        X.push(x);
        Y.push(y);
        Z.push(h ? h.point.z : c.z - 0.003 * m2u);
        SV.push(h ? nearestV(h) : vc);
        PL.push(u, v);
        UV.push(uv ? uv.x : 0, uv ? uv.y : 0);
      }
    }
    // optional smoothing of the depth (eyelids: one smooth shell over eyeball and lid)
    for (let it = 0; it < smooth; it++) {
      const Z2 = Z.slice();
      for (let j = 1; j < ny; j++) {
        for (let i = 1; i < nx; i++) {
          const a = j * (nx + 1) + i;
          Z2[a] = Math.max(Z[a], (Z[a - 1] + Z[a + 1] + Z[a - nx - 1] + Z[a + nx + 1]) / 4);
        }
      }
      Z.splice(0, Z.length, ...Z2);
    }
    const P2 = [];
    for (let a = 0; a < X.length; a++) {
      const p = V().set(X[a], Y[a], Z[a] + 0.0012 * m2u).applyMatrix4(meshInv).applyMatrix4(unskin(SV[a]));
      P2.push(p.x, p.y, p.z);
      for (let k = 0; k < 4; k++) {
        BI.push(SI.getComponent(SV[a], k));
        BW.push(SW.getComponent(SV[a], k));
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
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(BI, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(BW, 4));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    if (flat) {
      // one normal for the whole lid, so it shades evenly like the skin around the eye
      const N = geo.attributes.normal, avg = V();
      for (let i = 0; i < N.count; i++) avg.x += N.getX(i), avg.y += N.getY(i), avg.z += N.getZ(i);
      avg.normalize();
      for (let i = 0; i < N.count; i++) N.setXYZ(i, avg.x, avg.y, avg.z);
    }
    return geo;
  };
  // average skin colour (linear RGB) of a few texels on a ring around a point
  const img = skinned.material.map.image;
  const cv = new OffscreenCanvas(img.width, img.height);
  const cx2 = cv.getContext('2d', { willReadFrequently: true });
  cx2.drawImage(img, 0, 0);
  const flipY = skinned.material.map.flipY;
  const texel = (uv) => {
    const x = Math.floor((uv.x - Math.floor(uv.x)) * img.width);
    const yy = flipY ? 1 - uv.y : uv.y;
    const y = Math.floor((yy - Math.floor(yy)) * img.height);
    const d = cx2.getImageData(Math.min(img.width - 1, x), Math.min(img.height - 1, y), 1, 1).data;
    return new THREE.Color().setRGB(d[0] / 255, d[1] / 255, d[2] / 255, THREE.SRGBColorSpace);
  };
  const ringColour = (dx, dy, r, angles) => {
    const cs = angles.map((a) => texel(skinUV(dx + Math.cos(a) * r, dy + Math.sin(a) * r)));
    cs.sort((p, q) => p.getHSL({}).l - q.getHSL({}).l);
    return cs[Math.floor(cs.length * 0.6)]; // a little brighter than the median (no shadows, no lashes)
  };
  const mh = hitFace(S.mouth[0], S.mouth[1]);
  const mc = mh ? mh.point : hf.clone();
  const mouth = patch(mc, S.M.R * m2u, S.M.R * m2u, 0.01 * m2u);
  const lids = [], lidColours = [];
  for (const side of [-1, 1]) {
    const eh = hitFace(side * S.eyeX, S.eyeY);
    const ec = eh ? eh.point : hf.clone();
    lids.push(patch(ec, S.lidR * 1.4 * m2u, S.lidR * S.lidRy * m2u, 0.008 * m2u, { smooth: 6 }));
    // skin just outside the eye, below and beside it (above it are lashes, brows, glasses)
    const ang = [-3.0, -2.6, -2.2, -1.9, -1.57, -1.25, -0.95, -0.55, -0.15];
    lidColours.push(ringColour(side * S.eyeX, S.eyeY, S.lidR * S.lidRing, ang));
  }
  return { mouth, lids, lidColours };
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
        // the models come with their colour map as a full-strength emissive map, which flattens
        // them (no shading, Mama washed out); keep only a little of it so the sets light them
        o.material.emissiveIntensity = S.glow;
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
  // that hug the face: small grids laid onto the skin by ray casts in the bind pose and skinned
  // to the same bones as the skin beneath. Shaders cut the open mouth / the closing lids out.
  const head = bones.head;
  const m2u = model.scale.x; // metres -> units
  const F = FACE[who] || (FACE[who] = buildFace(who, S, skinned, bones, m2u));
  const mk = (geo, mat) => {
    const m = new THREE.SkinnedMesh(geo, mat);
    m.frustumCulled = false;
    m.renderOrder = 2;
    m.position.copy(skinned.position);
    m.quaternion.copy(skinned.quaternion);
    m.scale.copy(skinned.scale);
    skinned.parent.add(m);
    m.bind(skinned.skeleton, skinned.bindMatrix);
    return m;
  };
  const MP = S.M;
  const U = {
    mouth: {
      uR: { value: MP.R }, uK: { value: MP.K }, uK4: { value: MP.K4 || 0 }, uTop: { value: MP.top }, uTeeth: { value: MP.teeth },
      uAlpha: { value: 1 },
      uA: { value: 0.01 }, uB: { value: 0.005 }, uMode: { value: 0 }, uOy: { value: 0 },
    },
    lid: { e: { value: 1.3 }, lash: { value: 0 } },
  };
  // The open mouth is drawn exactly over the painted one: its upper edge follows the painted
  // smile's upper line (y = top + K x^2 + K4 x^4, metres from the anchor) from corner to corner, and it
  // opens downwards (depth b, ellipse-shaped) with the voice, so the painted smile is covered.
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  mouthMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U.mouth);
    sh.vertexShader = 'attribute vec2 pl;\nvarying vec2 vPl;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPl = pl;');
    sh.fragmentShader = 'uniform float uR, uK, uK4, uTop, uTeeth, uA, uB, uMode, uOy, uAlpha;\nvarying vec2 vPl;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec2 q = vPl * uR;
      const vec3 DARK = vec3(0.03, 0.004, 0.006), TONGUE = vec3(0.6, 0.14, 0.15), TEETH = vec3(0.95, 0.94, 0.9);
      vec3 col = DARK;
      if (uMode < 0.5) {
        float x2 = q.x * q.x;
        float dy = uTop + uK * x2 + uK4 * x2 * x2 - q.y;
        if (dy < 0.0 || (q.x * q.x) / (uA * uA) + (dy * dy) / (uB * uB) > 1.0) discard;
        float t = dy - uB;
        if ((q.x * q.x) / (uA * uA * 0.3) + (t * t) / (uB * uB * 0.3) < 1.0) col = TONGUE;
        if (dy < uTeeth * sqrt(max(0.0, 1.0 - (q.x * q.x) / (uA * uA * 0.7)))) col = TEETH;
      } else {
        float dy = q.y - uOy;
        if ((q.x * q.x) / (uA * uA) + (dy * dy) / (uB * uB) > 1.0) discard;
        float t = dy + uB;
        if ((q.x * q.x) / (uA * uA * 0.4) + (t * t) / (uB * uB * 0.35) < 1.0) col = TONGUE;
      }
      diffuseColor.rgb = col;
      diffuseColor.a = uAlpha;`);
  };
  const mouth = mk(F.mouth, mouthMat);
  const lidMats = F.lidColours.map((col) => {
    const lidMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: S.glow, roughness: 0.75, metalness: 0, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
    lidMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uE: U.lid.e, uLash: U.lid.lash });
    sh.vertexShader = 'attribute vec2 pl;\nvarying vec2 vPl;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPl = pl;');
    sh.fragmentShader = 'uniform float uE, uLash;\nvarying vec2 vPl;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec2 q = vPl;
      if (q.x * q.x + q.y * q.y > 1.0) discard;
      float edge = uE - 0.22 * (1.0 - q.x * q.x) * uLash;
      if (q.y < edge) discard;
      float lashK = (uLash > 0.0 && q.y < edge + 0.11 && abs(q.x) < 0.97) ? 1.0 : 0.0;
      if (lashK > 0.5) diffuseColor.rgb = vec3(0.04, 0.02, 0.015);`).replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n      totalEmissiveRadiance *= 1.0 - lashK;');
    };
    return lidMat;
  });
  const lids = F.lids.map((g, i) => mk(g, lidMats[i]));

  // parts: expose the bones under the names the sets use
  const arms = {
    L: { shoulder: bones.L.arm, elbow: bones.L.fore, hand: bones.L.hand, index: new THREE.Group(), thumb: new THREE.Group() },
    R: { shoulder: bones.R.arm, elbow: bones.R.fore, hand: bones.R.hand, index: new THREE.Group(), thumb: new THREE.Group() },
  };
  const legs = { L: { hip: bones.LL.up, knee: bones.LL.leg }, R: { hip: bones.RL.up, knee: bones.RL.leg } };
  // seatY: height of the seat under the hips when sitting (root units); to sit on a
  // surface at height h, put root.position.y = h - seatY and pose POSES.seated
  const seatY = bones.LL.up.getWorldPosition(V()).y - 0.045 * S.height;
  const parts = { root, body, torso, seatY, neck: bones.neck, head, legs, arms, model, mouth, lids, face: U, glasses: new THREE.Group() };

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
    if (wow > 0.05 && wow >= talk && !MP.wowO) {
      // surprise as a wide-open smile (Mama's painted smile is too wide to sit beside an O)
      U.mouth.uMode.value = 0;
      U.mouth.uA.value = MP.a * 1.05;
      U.mouth.uB.value = lerp(MP.bMin, MP.bMax * 1.25, wow);
    } else if (wow > 0.05 && wow >= talk) {
      // "O" (surprise), centred on the mouth line
      U.mouth.uMode.value = 1;
      U.mouth.uA.value = lerp(0.003, MP.oA, wow);
      U.mouth.uB.value = lerp(0.004, MP.oB, wow);
      U.mouth.uOy.value = MP.oY;
    } else {
      // talking: the smile opens downwards with the voice
      U.mouth.uMode.value = 0;
      U.mouth.uA.value = lerp(MP.a, MP.a * 1.05, talk);
      U.mouth.uB.value = lerp(MP.bMin, MP.bMax, talk);
    }
    mouth.visible = talk > 0.06 || wow > 0.05;
    // lids: the lower edge comes down from above the eye (1.3) to just under its middle
    const bl = clamp(q.blink);
    U.lid.e.value = lerp(1.05, -0.35, bl);
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
