// Episode 019 snake: a friendly cartoon snake built as one tube whose spine
// is rebuilt every frame from a list of centre-line points, so the same model
// can slither in an S, coil up, bunch like a spring or go "x-ray" to show its
// backbone, ribs and muscles. Everything is a pure function of the inputs.
import * as THREE from 'three';
import { clamp, lerp, smooth } from '../../shared/core.js';

export const SNAKE_COL = {
  back: new THREE.Color(0x46c25c),
  dark: new THREE.Color(0x24884a),
  side: new THREE.Color(0x8fe06a),
  belly: new THREE.Color(0xffe28e),
  bellyLine: new THREE.Color(0xe2ac52),
  xray: new THREE.Color(0x58d8ff),
  muscle: new THREE.Color(0xff5a6e),
};

// ------------------------------------------------------------------ paths
// Arc-length parametrised curve built from fn(p) -> Vector3 for p in [p0, p1].
export class Path {
  constructor(fn, p0, p1, n = 800) {
    this.pts = [];
    this.len = [0];
    for (let i = 0; i <= n; i++) this.pts.push(fn(lerp(p0, p1, i / n)));
    for (let i = 1; i <= n; i++) this.len.push(this.len[i - 1] + this.pts[i].distanceTo(this.pts[i - 1]));
    this.total = this.len[n];
  }
  // arc length at the first point whose x passes `x` (paths monotonic in x)
  lenAtX(x) {
    const p = this.pts, n = p.length - 1, up = p[n].x > p[0].x;
    let a = 0, b = n;
    while (b - a > 1) {
      const m = (a + b) >> 1;
      if ((p[m].x < x) === up) a = m;
      else b = m;
    }
    return this.len[a];
  }
  at(l, out = new THREE.Vector3()) {
    const n = this.pts.length - 1;
    if (l <= 0) return out.copy(this.pts[0]).addScaledVector(this.pts[1].clone().sub(this.pts[0]).normalize(), l);
    if (l >= this.total) return out.copy(this.pts[n]).addScaledVector(this.pts[n].clone().sub(this.pts[n - 1]).normalize(), l - this.total);
    let a = 0, b = n;
    while (b - a > 1) {
      const m = (a + b) >> 1;
      if (this.len[m] < l) a = m;
      else b = m;
    }
    const k = (l - this.len[a]) / Math.max(1e-9, this.len[b] - this.len[a]);
    return out.lerpVectors(this.pts[a], this.pts[b], k);
  }
}

// Body thickness along the body: u = 0 at the neck, 1 at the tail tip.
export const bodyR = (u) => (0.78 + 0.22 * smooth(clamp(u / 0.12))) * Math.pow(1 - smooth(clamp((u - 0.45) / 0.55)), 0.75) + 0.012;

// --------------------------------------------------------------- the snake
export function makeSnake({ length = 5.5, radius = 0.17, rings = 150, sides = 16 } = {}) {
  const root = new THREE.Group();
  const NR = rings, NS = sides;
  const nv = NR * (NS + 1);
  const pos = new Float32Array(nv * 3);
  const col = new Float32Array(nv * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const idx = [];
  for (let i = 0; i < NR - 1; i++)
    for (let j = 0; j < NS; j++) {
      const a = i * (NS + 1) + j, b = a + 1, c = a + NS + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  geo.setIndex(idx);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0, side: THREE.FrontSide });
  const body = new THREE.Mesh(geo, mat);
  body.castShadow = true;
  body.receiveShadow = true;
  body.frustumCulled = false;
  root.add(body);

  // ---- head (local +z forward, +y up)
  const HR = radius * 1.45;
  const head = new THREE.Group();
  const std = (c, r = 0.45, ex = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...ex });
  const skullGeo = new THREE.SphereGeometry(1, 36, 24);
  {
    const p = skullGeo.attributes.position;
    const cc = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const c = y < -0.32 ? SNAKE_COL.belly : y < -0.18 ? SNAKE_COL.side : SNAKE_COL.back;
      cc.set([c.r, c.g, c.b], i * 3);
    }
    skullGeo.setAttribute('color', new THREE.BufferAttribute(cc, 3));
  }
  const headMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42 });
  const skull = new THREE.Mesh(skullGeo, headMat);
  skull.scale.set(HR * 1.08, HR * 0.74, HR * 1.35);
  skull.castShadow = true;
  head.add(skull);
  const snout = new THREE.Mesh(skullGeo, headMat);
  snout.scale.set(HR * 0.86, HR * 0.58, HR * 0.8);
  snout.position.set(0, -HR * 0.08, HR * 0.72);
  snout.castShadow = true;
  head.add(snout);
  const white = std(0xffffff, 0.25), black = std(0x141420, 0.2), shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(s * HR * 0.6, HR * 0.42, HR * 0.38);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(HR * 0.42, 24, 16), white);
    e.add(ball);
    const pup = new THREE.Group();
    const p = new THREE.Mesh(new THREE.SphereGeometry(HR * 0.25, 20, 14), black);
    p.position.set(s * HR * 0.1, HR * 0.02, HR * 0.26);
    pup.add(p);
    const g1 = new THREE.Mesh(new THREE.SphereGeometry(HR * 0.08, 10, 8), shine);
    g1.position.set(s * HR * 0.14, HR * 0.14, HR * 0.47);
    pup.add(g1);
    e.add(pup);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(HR * 0.45, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0x3db556, 0.45));
    lid.rotation.x = -1.7;
    e.add(lid);
    head.add(e);
    eyes.push({ e, pup, lid });
  }
  // smile and cheeks
  const smile = new THREE.Mesh(new THREE.TorusGeometry(HR * 0.42, HR * 0.045, 8, 24, Math.PI * 0.8), std(0x1c4a2a, 0.5));
  smile.position.set(0, -HR * 0.14, HR * 1.18);
  smile.rotation.set(-0.35, 0, Math.PI + Math.PI * 0.1);
  head.add(smile);
  for (const s of [-1, 1]) {
    const ch = new THREE.Mesh(new THREE.SphereGeometry(HR * 0.17, 14, 10), std(0xff8f9a, 0.6, { transparent: true, opacity: 0.75 }));
    ch.scale.set(1, 0.6, 0.4);
    ch.position.set(s * HR * 0.72, -HR * 0.08, HR * 0.86);
    ch.rotation.y = s * 0.6;
    head.add(ch);
  }
  for (const s of [-1, 1]) {
    const n = new THREE.Mesh(new THREE.SphereGeometry(HR * 0.04, 8, 6), black);
    n.position.set(s * HR * 0.17, HR * 0.12, HR * 1.42);
    head.add(n);
  }
  // forked tongue
  const tongue = new THREE.Group();
  tongue.position.set(0, -HR * 0.2, HR * 1.28);
  const tm = std(0xe8344f, 0.4);
  const t0 = new THREE.Mesh(new THREE.BoxGeometry(HR * 0.08, HR * 0.03, HR * 0.6), tm);
  t0.position.z = HR * 0.3;
  tongue.add(t0);
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(HR * 0.06, HR * 0.03, HR * 0.28), tm);
    f.position.set(s * HR * 0.06, 0, HR * 0.68);
    f.rotation.y = s * 0.45;
    tongue.add(f);
  }
  head.add(tongue);
  root.add(head);

  // ---- x-ray skeleton: vertebrae + ribs
  const NB = NR - 4;
  const vert = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xbfefff, emissiveIntensity: 0.55, roughness: 0.4 }), NB);
  const ribGeo = new THREE.TorusGeometry(1, 0.075, 6, 18, (Math.PI * 130) / 180);
  ribGeo.rotateZ((-70 * Math.PI) / 180);
  const NRIB = Math.floor(NB * 0.78);
  const ribs = new THREE.InstancedMesh(ribGeo, new THREE.MeshStandardMaterial({ color: 0xf4fbff, emissive: 0x9fdcff, emissiveIntensity: 0.45, roughness: 0.5, side: THREE.DoubleSide }), NRIB * 2);
  const skullBone = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xbfefff, emissiveIntensity: 0.5, roughness: 0.4 }));
  skullBone.scale.set(HR * 0.62, HR * 0.4, HR * 1.05);
  skullBone.position.set(0, 0, HR * 0.35);
  head.add(skullBone);
  for (const m of [vert, ribs]) {
    m.frustumCulled = false;
    m.visible = false;
    root.add(m);
  }
  skullBone.visible = false;

  const P = Array.from({ length: NR }, () => new THREE.Vector3());
  const T = new THREE.Vector3(), S = new THREE.Vector3(), U = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  const tmpC = new THREE.Color(), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), Sc = new THREE.Vector3();
  const frames = Array.from({ length: NR }, () => ({ t: new THREE.Vector3(), s: new THREE.Vector3(), u: new THREE.Vector3(), r: 0 }));

  // spine(i, out): centre-line ground point for ring i (0 = neck, NR-1 = tail).
  // Options: xray 0..1, bones 0..1 (reveal from head), muscle 0..1, t (time),
  // lift(u) extra height, tongue 0..1, blink 0..1, look [x, y].
  function update(spine, o = {}) {
    const t = o.t ?? 0;
    for (let i = 0; i < NR; i++) {
      spine(i, P[i]);
      const u = i / (NR - 1);
      const r = radius * bodyR(u);
      P[i].y += r * 0.82 + (o.lift ? o.lift(u) : 0);
      frames[i].r = r;
    }
    for (let i = 0; i < NR; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(NR - 1, i + 1)];
      T.subVectors(a, b).normalize(); // points forward (towards the head)
      S.crossVectors(T, Y);
      if (S.lengthSq() < 1e-6) S.set(1, 0, 0);
      S.normalize();
      U.crossVectors(S, T).normalize();
      frames[i].t.copy(T);
      frames[i].s.copy(S);
      frames[i].u.copy(U);
    }
    const xr = clamp(o.xray ?? 0), mu = clamp(o.muscle ?? 0);
    for (let i = 0; i < NR; i++) {
      const f = frames[i];
      const u = i / (NR - 1);
      for (let j = 0; j <= NS; j++) {
        const th = (j / NS) * Math.PI * 2 - Math.PI / 2; // j = 0 at the belly
        const c = Math.cos(th), s = Math.sin(th);
        const sy = s < 0 ? s * 0.72 : s;
        const k = (i * (NS + 1) + j) * 3;
        pos[k] = P[i].x + f.s.x * c * f.r * 1.12 + f.u.x * sy * f.r;
        pos[k + 1] = P[i].y + f.s.y * c * f.r * 1.12 + f.u.y * sy * f.r;
        pos[k + 2] = P[i].z + f.s.z * c * f.r * 1.12 + f.u.z * sy * f.r;
        // skin pattern
        let cc;
        if (s < -0.45) cc = i % 2 === 0 ? SNAKE_COL.bellyLine : SNAKE_COL.belly;
        else if (s < -0.15) cc = SNAKE_COL.side;
        else {
          const z = Math.abs(((i / 11 + Math.abs(c) * 0.55) % 1) - 0.5);
          cc = z < 0.11 && s > 0.15 ? SNAKE_COL.dark : SNAKE_COL.back;
        }
        tmpC.copy(cc);
        if (xr > 0) {
          tmpC.lerp(SNAKE_COL.xray, xr * 0.85);
          if (mu > 0 && Math.abs(c) > 0.35 && i < NR * 0.85) {
            const side = c > 0 ? 0 : Math.PI;
            const w = 0.5 + 0.5 * Math.sin(i * 0.22 - t * 7 + side);
            tmpC.lerp(SNAKE_COL.muscle, mu * (0.35 + 0.6 * w) * smooth(clamp((Math.abs(c) - 0.35) / 0.4)));
          }
        }
        col[k] = tmpC.r;
        col[k + 1] = tmpC.g;
        col[k + 2] = tmpC.b;
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    mat.transparent = xr > 0.01;
    mat.opacity = lerp(1, 0.38, xr);
    mat.depthWrite = xr < 0.5;
    mat.emissive.setRGB(0.05 * xr, 0.25 * xr, 0.4 * xr);
    headMat.transparent = mat.transparent;
    headMat.opacity = mat.opacity;
    headMat.depthWrite = mat.depthWrite;
    headMat.emissive.copy(mat.emissive);

    // head
    const f0 = frames[0];
    const hp = V.copy(P[0]).addScaledVector(f0.t, HR * 0.85);
    hp.y += HR * 0.08 + (o.headLift ?? 0);
    head.position.copy(hp);
    const fwd = f0.t.clone();
    if (o.headPitch) fwd.y += o.headPitch;
    if (o.headYaw) fwd.applyAxisAngle(Y, o.headYaw);
    fwd.normalize();
    M4.lookAt(new THREE.Vector3(0, 0, 0), fwd.clone().negate(), Y);
    head.quaternion.setFromRotationMatrix(M4);
    const tg = clamp(o.tongue ?? 0);
    tongue.visible = tg > 0.02;
    tongue.scale.set(1, 1, Math.max(0.01, tg));
    tongue.rotation.x = 0.15 + 0.12 * Math.sin(t * 40) * tg;
    const bl = clamp(o.blink ?? 0);
    const look = o.look || [0, 0];
    for (const e of eyes) {
      e.lid.rotation.x = lerp(-1.75, -0.1, bl);
      e.pup.rotation.set(-look[1] * 0.4, look[0] * 0.5, 0);
    }
    skullBone.visible = xr > 0.05;

    // skeleton
    const nb = Math.floor(clamp(o.bones ?? 0) * NB);
    vert.visible = ribs.visible = xr > 0.05 && nb > 0;
    if (vert.visible) {
      vert.count = nb;
      let nr = 0;
      for (let i = 0; i < nb; i++) {
        const ii = i + 1;
        const f = frames[ii];
        M4.makeBasis(f.s, f.u, f.t);
        Q.setFromRotationMatrix(M4);
        const pop = clamp((o.bones * NB - i) / 6);
        Sc.set(f.r * 0.36, f.r * 0.3, f.r * 0.34).multiplyScalar(0.4 + 0.6 * pop);
        vert.setMatrixAt(i, M4.compose(V.copy(P[ii]).addScaledVector(f.u, f.r * 0.25), Q, Sc));
        if (i < NRIB && i % 1 === 0) {
          for (const side of [1, -1]) {
            Sc.set(side * f.r * 0.86 * pop, f.r * 0.74 * pop, f.r * 0.86 * pop);
            ribs.setMatrixAt(nr++, M4.compose(V.copy(P[ii]).addScaledVector(f.u, f.r * 0.12), Q, Sc));
          }
        }
      }
      ribs.count = nr;
      vert.instanceMatrix.needsUpdate = true;
      ribs.instanceMatrix.needsUpdate = true;
    }
  }

  const headPos = () => head.position.clone();
  const ringPos = (i) => P[Math.round(clamp(i, 0, NR - 1))].clone();
  const ringFrame = (i) => frames[Math.round(clamp(i, 0, NR - 1))];
  return { root, body, head, update, NR, length, radius, HR, headPos, ringPos, ringFrame };
}

// Follow-the-leader spine on a path: the head is at arc length `headAt`, the
// rest of the body trails behind along the same path (lateral undulation).
export function pathSpine(path, headAt, length, NR) {
  return (i, out) => path.at(headAt - (i / (NR - 1)) * length, out);
}

// Lateral-undulation path: forward along +x, sideways wave in z.
export function sPath({ x0 = -20, x1 = 20, amp = 0.8, wave = 3.2, y = 0, z = 0, phase = 0 } = {}) {
  return new Path((x) => new THREE.Vector3(x, y, z + amp * Math.sin((2 * Math.PI * x) / wave + phase)), x0, x1, 2400);
}

// Concertina in a straight channel along +x. extent = straight-line distance
// from tail to head; the body folds into `folds` half-waves to use up its
// full length. Returns a Path from head (arc 0) to tail.
export function concertinaPath(xHead, extent, length, folds = 5, z = 0, y = 0) {
  const shape = (A) => new Path((p) => new THREE.Vector3(xHead - p * extent, y, z + A * Math.sin(Math.PI * folds * p)), 0, 1, 360);
  if (extent >= length * 0.999) return shape(0);
  let a = 0, b = length;
  for (let k = 0; k < 22; k++) {
    const m = (a + b) / 2;
    if (shape(m).total < length) a = m;
    else b = m;
  }
  const p = shape((a + b) / 2);
  p.amp = (a + b) / 2;
  return p;
}

// Coiled spiral (tail in the centre, head outside), as ground points.
export function coilPoints(NR, length, { cx = 0, cz = 0, r0 = 0.25, grow = 0.07, start = 0 } = {}) {
  const pts = [];
  let th = 0, rr = r0;
  const ds = length / (NR - 1);
  const raw = [new THREE.Vector3(cx + rr, 0, cz)];
  for (let i = 1; i < NR; i++) {
    th += ds / rr;
    rr = r0 + grow * th;
    raw.push(new THREE.Vector3(cx + Math.cos(th + start) * rr, 0, cz + Math.sin(th + start) * rr));
  }
  for (let i = NR - 1; i >= 0; i--) pts.push(raw[i]);
  return pts;
}
