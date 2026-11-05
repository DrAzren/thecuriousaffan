// Episode 021 traffic models. Everything is precomputed once at load with a
// fixed time step, then read back by time, so every frame stays a pure
// function of t (deterministic renders).
//
// Units are "real" metres and seconds; the toy world scales them down.
//   brakeWave()  one lane, the leader brakes suddenly; followers react a little
//                late (driver reaction time) and each brakes harder than the
//                car in front, until a car stops: a jam wave that travels backwards.
//   crowding()   cars keep entering a fixed stretch of road; as the gaps shrink
//                everyone has to slow down.
//   bottleneck() three lanes squeeze into one; cars take turns at the neck.

export const CAR_LEN = 4.5;
const DT = 1 / 120;

// Intelligent Driver Model acceleration.
function idm(v, gap, dv, p) {
  const sStar = p.s0 + Math.max(0, v * p.T + (v * dv) / (2 * Math.sqrt(p.a * p.b)));
  return p.a * (1 - Math.pow(v / p.v0, 4) - Math.pow(sStar / Math.max(0.1, gap), 2));
}

// Recorder: samples positions/speeds/accelerations at `fps` from t0 to t1.
function recorder(n, t0, t1, fps) {
  const frames = Math.ceil((t1 - t0) * fps) + 1;
  const x = new Float32Array(frames * n), v = new Float32Array(frames * n), acc = new Float32Array(frames * n);
  const at = (arr, t, i) => {
    const f = Math.min(frames - 1, Math.max(0, (t - t0) * fps));
    const f0 = Math.floor(f), f1 = Math.min(frames - 1, f0 + 1), k = f - f0;
    return arr[f0 * n + i] * (1 - k) + arr[f1 * n + i] * k;
  };
  return {
    frames, x, v, acc, n,
    put(f, i, xi, vi, ai) {
      x[f * n + i] = xi;
      v[f * n + i] = vi;
      acc[f * n + i] = ai;
    },
    x_at: (t, i) => at(x, t, i),
    v_at: (t, i) => at(v, t, i),
    a_at: (t, i) => at(acc, t, i),
  };
}

// ---------------------------------------------------------------- brake wave
// Each driver starts braking a moment after the car in front (reaction time)
// and, because the gap has already shrunk, brakes harder and slows down more.
// From the third car on, cars stop completely and stay stopped longer: the
// jam grows backwards even though the first car has already driven off.
export function brakeWave({ n = 14, t0 = 33, t1 = 49, tBrake = 35.66, fps = 30, react = 1.95, vc = 9, gap0 = 20 } = {}) {
  const vmin = (i) => Math.max(0, 4.5 - 2.6 * i);
  const decel = (i) => 4.2 + 1.1 * Math.min(i, 3);
  const hold = (i) => 0.9 + 0.55 * i;
  const target = (t, i) => {
    const d = t - (tBrake + react * i);
    if (d < 0) return vc;
    const tDown = (vc - vmin(i)) / decel(i);
    if (d < tDown) return vc - decel(i) * d;
    if (d < tDown + hold(i)) return vmin(i);
    return Math.min(vc, vmin(i) + 1.4 * (d - tDown - hold(i)));
  };
  const x = [], v = [];
  for (let i = 0; i < n; i++) {
    x.push(-i * (gap0 + CAR_LEN));
    v.push(vc);
  }
  const rec = recorder(n, t0, t1, fps);
  const steps = Math.round((t1 - t0) / DT);
  const sub = Math.round(1 / (fps * DT));
  for (let s = 0; s <= steps; s++) {
    const t = t0 + s * DT;
    const nv = [];
    for (let i = 0; i < n; i++) {
      let vi = target(t, i);
      if (i > 0) {
        const gap = x[i - 1] - x[i] - CAR_LEN;
        if (gap < 3) vi = Math.min(vi, v[i - 1] * Math.max(0, (gap - 1) / 2));
      }
      nv.push(vi);
    }
    if (s % sub === 0) for (let i = 0; i < n; i++) rec.put(s / sub, i, x[i], v[i], (nv[i] - v[i]) / DT);
    for (let i = 0; i < n; i++) {
      v[i] = nv[i];
      x[i] += v[i] * DT;
    }
  }
  return rec;
}

// ------------------------------------------------------------------ crowding
// More and more cars join the same road. Everybody needs a safe gap, and that
// gap must be bigger when driving faster (gap = 3 m + 1.6 s x speed). As more
// cars squeeze in behind, the gaps shrink, so everybody has to slow down.
// At first only 3 cars use the road; from t = 15.3 more cars arrive from behind.
export function crowding({ n = 11, tFill = 15.3 } = {}) {
  const sm = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
  const speed = (t) => 15 - 13 * sm((t - tFill) / 5.4);
  const gap = (t) => CAR_LEN + 3 + 1.6 * speed(t); // centre-to-centre spacing
  const T0 = 12.0, T1 = 23.0, F = 1100;
  const head = new Float32Array(F + 1);
  for (let k = 1; k <= F; k++) {
    const ta = T0 + ((k - 1) / F) * (T1 - T0), tb = T0 + (k / F) * (T1 - T0);
    head[k] = head[k - 1] + 0.5 * (speed(ta) + speed(tb)) * (tb - ta);
  }
  const headAt = (t) => {
    const f = Math.min(F, Math.max(0, ((t - T0) / (T1 - T0)) * F));
    const f0 = Math.floor(f), f1 = Math.min(F, f0 + 1);
    return head[f0] + (head[f1] - head[f0]) * (f - f0);
  };
  // distance of car i behind the first car
  const rel = (t, i) => -i * gap(t) - (i < 3 ? 0 : 160 * (1 - sm((t - tFill + 0.3) / 2.6)));
  return { n, speed, gap, head: headAt, rel, x_at: (t, i) => headAt(t) + rel(t, i) };
}

// ---------------------------------------------------------------- bottleneck
// Lanes 0, 1, 2 squeeze into lane 1 at x = NECK. Cars take turns (lane 1,
// lane 0, lane 1, lane 2, ...) and only one car can pass every `serve` seconds,
// so the three queues behind the neck shrink slowly: "satu demi satu".
export const NECK = 0;
export function bottleneck({ t0 = 22.6, t1 = 32.4, perLane = 9, serve = 1.1, tFirst = 23.4, vm = 7.5, fps = 30 } = {}) {
  const n = perLane * 3;
  const lane = [], served = new Array(n).fill(Infinity);
  for (let l = 0; l < 3; l++) for (let k = 0; k < perLane; k++) lane.push(l);
  const seq = [1, 0, 1, 2];
  const idx = [0, 0, 0];
  for (let s = 0, k = 0; k < n && s < 4 * n; s++) {
    const l = seq[s % 4];
    if (idx[l] < perLane) served[l * perLane + idx[l]++] = tFirst + serve * k++;
  }
  const slot = CAR_LEN + 2.2;
  const queueX = (t, i) => {
    // place in its lane's queue = cars of the same lane ahead of it not yet served
    const l = lane[i], k = i - l * perLane;
    let r = 0;
    for (let j = l * perLane; j < l * perLane + k; j++) if (served[j] > t) r++;
    return NECK - 2 - r * slot - (l === 1 ? 0 : 1.2);
  };
  // queued cars creep forward smoothly: precompute with a first-order follow
  const frames = Math.ceil((t1 - t0) * fps) + 1;
  const qx = new Float32Array(frames * n);
  const cur = [];
  for (let i = 0; i < n; i++) cur.push(queueX(t0, i));
  const sub = 8;
  for (let f = 0; f < frames; f++) {
    for (let s = 0; s < sub; s++) {
      const t = t0 + (f + s / sub) / fps;
      for (let i = 0; i < n; i++) {
        const target = queueX(t, i);
        const step = Math.min(3.2 / (fps * sub), Math.max(0, target - cur[i]) * (2.6 / (fps * sub)) + 0.0);
        cur[i] = Math.min(target, cur[i] + Math.max(step, Math.min(target - cur[i], 0.004)));
      }
    }
    for (let i = 0; i < n; i++) qx[f * n + i] = cur[i];
  }
  const ease = (tau) => vm * (tau - 0.35 * (1 - Math.exp(-tau / 0.35)));
  const x_at = (t, i) => {
    const f = Math.min(frames - 1, Math.max(0, Math.round((t - t0) * fps)));
    let q = qx[f * n + i];
    if (t < served[i]) {
      // stay behind any car that has just squeezed into this lane in front
      for (let j = 0; j < n; j++) {
        if (j === i || t < served[j] || served[j] > served[i]) continue;
        if (Math.abs(lane_at(t, j) - lane[i]) < 0.85) q = Math.min(q, x_at(t, j) - slot);
      }
      // and behind the queued car ahead in the same lane
      const l = lane[i];
      for (let j = i - 1; j >= l * perLane; j--) {
        if (t < served[j]) {
          q = Math.min(q, x_at(t, j) - slot);
          break;
        }
      }
      return q;
    }
    const fs = Math.min(frames - 1, Math.max(0, Math.round((served[i] - t0) * fps)));
    return qx[fs * n + i] + ease(t - served[i]);
  };
  // lateral lane position (0..2): side lanes slide into lane 1 just after the neck
  const lane_at = (t, i) => {
    const l = lane[i];
    if (l === 1 || t < served[i]) return l;
    const k = Math.min(1, Math.max(0, (t - served[i]) / 0.9));
    return l + (1 - l) * k * k * (3 - 2 * k);
  };
  const isServed = (t, i) => t >= served[i];
  return { n, lane, served, x_at, lane_at, isServed, perLane };
}
