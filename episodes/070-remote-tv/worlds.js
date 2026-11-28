// Episode 070 sets:
//  - the Episode 031 living room with Affan and Mama on the sofa and a TV on a
//    low cabinet across the room (facing the sofa), plus a remote control;
//  - the "cahaya rahsia" stage: a giant remote standing up, its infrared LED
//    sending blinks (short and long pulses, drawn purple so we can see them)
//    up to a giant TV whose receiver window gets a little cartoon eye;
//  - the phone trick stage: a big phone whose camera screen shows the remote's
//    LED blinking, while the real remote's LED looks dark to our eyes;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { add, glow } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildLivingRoom } from '../031-geletek-diri-sendiri/worlds.js';
import { makeMama } from '../038-bawang-menangis/worlds.js';

export { buildOutro };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
export const IR = 0xb06cff; // the colour we give the invisible light

function gradientSky(top, bot, lo = -0.3, hi = 0.7) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, bot: { value: new THREE.Color(bot) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, bot; varying vec3 vP;
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(${lo.toFixed(2)}, ${hi.toFixed(2)}, vP.y)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}

// ------------------------------------------------------------- the remote
// Long axis along +z (the LED end at +z), buttons on the +y face, length 1.
export function makeRemote() {
  const g = new THREE.Group();
  const body = std(0x2b3040, 0.45, { emissive: 0x0a0c14, emissiveIntensity: 0.3 });
  add(g, new RoundedBoxGeometry(0.3, 0.09, 1.0, 3, 0.04), body, [0, 0, 0]);
  add(g, new RoundedBoxGeometry(0.26, 0.02, 0.92, 2, 0.008), std(0x3a4156, 0.5), [0, 0.046, 0]);
  // the IR LED at the tip: a small dark dome (it looks dark to our eyes)
  const ledMat = std(0x3a1838, 0.15, { emissive: IR, emissiveIntensity: 0, transparent: true, opacity: 0.95 });
  const led = add(g, new THREE.SphereGeometry(0.06, 20, 14), ledMat, [0, 0.0, 0.5], [0, 0, 0], [1, 1, 0.9]);
  add(g, new THREE.CylinderGeometry(0.075, 0.075, 0.02, 20), std(0x161820, 0.5), [0, 0, 0.49], [Math.PI / 2, 0, 0]);
  const btn = (c, x, z, r = 0.035, h = 0.025) => add(g, new THREE.CylinderGeometry(r, r, h, 16), std(c, 0.4, { emissive: c, emissiveIntensity: 0.12 }), [x, 0.06, z]);
  const power = btn(0xff3b4e, -0.08, 0.36, 0.04);
  const buttons = { power };
  // number pad
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) btn(0xdfe4ef, (c - 1) * 0.085, 0.05 - r * 0.085, 0.028, 0.02);
  // volume rocker and channel rocker
  buttons.vol = add(g, new RoundedBoxGeometry(0.06, 0.03, 0.17, 2, 0.02), std(0x4fd18a, 0.4, { emissive: 0x4fd18a, emissiveIntensity: 0.12 }), [-0.08, 0.06, 0.2]);
  buttons.ch = add(g, new RoundedBoxGeometry(0.06, 0.03, 0.17, 2, 0.02), std(0x3fa2ff, 0.4, { emissive: 0x3fa2ff, emissiveIntensity: 0.12 }), [0.08, 0.06, 0.2]);
  btn(0xffd84a, 0.08, 0.36, 0.03);
  const ledGlow = glow(IR, 0.5, 0);
  ledGlow.position.set(0, 0, 0.55);
  g.add(ledGlow);
  g.userData = { led, ledMat, ledGlow, buttons };
  // blink: 0..1 (how bright the LED looks); see: show it (true) or keep it dark to our eyes
  g.userData.setLed = (k, size = 0.5) => {
    ledMat.emissiveIntensity = 2.2 * k;
    ledGlow.material.opacity = 0.95 * k;
    ledGlow.scale.setScalar(size * (0.6 + 0.4 * k));
  };
  g.userData.press = (b, k) => {
    for (const [n, m] of Object.entries(buttons)) {
      const on = n === b ? k : 0;
      m.position.y = 0.06 - 0.012 * on;
      m.material.emissiveIntensity = 0.12 + 0.8 * on;
    }
  };
  return g;
}

// Point the remote's LED (+z) along dir, keeping its buttons towards 'up'.
const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _m = new THREE.Matrix4();
export function aimRemote(r, dir, up = new THREE.Vector3(0, 1, 0)) {
  _z.copy(dir).normalize();
  _y.copy(up).addScaledVector(_z, -up.dot(_z));
  if (_y.lengthSq() < 1e-6) _y.set(0, 0, 1);
  _y.normalize();
  _x.crossVectors(_y, _z).normalize();
  _m.makeBasis(_x, _y, _z);
  r.quaternion.setFromRotationMatrix(_m);
}

// ----------------------------------------------------------------- the TV
// A flat TV (front +z) with a canvas screen. setScreen(state, t, opts):
// state 'off' | 'boot' | 'cartoon' | 'fish'; opts: { boot 0..1, vol 0..1 (shows bars), ch }
export function makeTV(w = 3.2, { stand = true } = {}) {
  const g = new THREE.Group();
  const h = w * 0.58;
  const frame = std(0x1b1f2a, 0.35, { emissive: 0x05060a, emissiveIntensity: 0.3 });
  add(g, new RoundedBoxGeometry(w, h, 0.14, 3, 0.04), frame, [0, 0, 0]);
  // bottom bezel strip (holds the receiver)
  add(g, new RoundedBoxGeometry(w * 0.98, 0.16 * (w / 3.2), 0.16, 2, 0.03), std(0x262b38, 0.35), [0, -h / 2 + 0.06 * (w / 3.2), 0.01]);
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 360;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sw = w * 0.94, sh = h * 0.86;
  const screen = add(g, new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), [0, 0.04 * (w / 3.2), 0.072], [0, 0, 0], [1, 1, 1], false);
  // the receiver window (penerima) on the bottom bezel, right side, with a tiny standby light
  const u = w / 3.2;
  const rx = w * 0.36, ry = -h / 2 + 0.07 * u;
  const recv = add(g, new RoundedBoxGeometry(0.2 * u, 0.1 * u, 0.04, 2, 0.02), std(0x4a0c1c, 0.1, { emissive: 0x2a0410, emissiveIntensity: 0.6, transparent: true, opacity: 0.92 }), [rx, ry, 0.09]);
  const standby = add(g, new THREE.SphereGeometry(0.018 * u, 10, 8), std(0xff3040, 0.3, { emissive: 0xff2030, emissiveIntensity: 1.2 }), [rx - 0.2 * u, ry, 0.09]);
  // a cartoon eye that can appear on the receiver (stage only)
  const eye = new THREE.Group();
  eye.position.set(rx, ry + 0.02 * u, 0.115);
  g.add(eye);
  add(eye, new THREE.SphereGeometry(0.075 * u, 20, 14), std(0xffffff, 0.3, { emissive: 0x404040, emissiveIntensity: 0.4 }), [0, 0, 0], [0, 0, 0], [1.4, 1, 0.4], false);
  const pupil = add(eye, new THREE.SphereGeometry(0.04 * u, 16, 12), std(0x17256b, 0.2), [0, -0.01 * u, 0.025 * u], [0, 0, 0], [1, 1, 0.5], false);
  add(eye, new THREE.SphereGeometry(0.012 * u, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0.015 * u, 0.005 * u, 0.045 * u], [0, 0, 0], [1, 1, 1], false);
  eye.visible = false;
  if (stand) {
    add(g, new THREE.CylinderGeometry(0.06, 0.08, 0.35, 12), frame, [0, -h / 2 - 0.15, -0.02]);
    add(g, new RoundedBoxGeometry(1.0, 0.05, 0.4, 2, 0.02), frame, [0, -h / 2 - 0.32, -0.02]);
  }
  const R = rng(70);
  const fish = Array.from({ length: 6 }, (_, i) => ({ y: 70 + R() * 220, sp: 40 + R() * 60, ph: R() * 640, c: ['#ffcf33', '#ff7a5c', '#5fe08a', '#ff9ab8', '#ffffff', '#ffb02e'][i], s: 0.7 + R() * 0.6 }));
  let lastKey = '';
  function setScreen(state, t = 0, { boot = 1, vol = -1, ch = 0 } = {}) {
    const key = state === 'off' ? 'off' : `${state}|${t.toFixed(2)}|${boot.toFixed(2)}|${vol.toFixed(2)}|${ch}`;
    if (key === lastKey) return;
    lastKey = key;
    const x = c.getContext('2d');
    const W = c.width, H = c.height;
    x.save();
    if (state === 'off') {
      const gr = x.createLinearGradient(0, 0, W, H);
      gr.addColorStop(0, '#272c3a');
      gr.addColorStop(1, '#10131b');
      x.fillStyle = gr;
      x.fillRect(0, 0, W, H);
      x.globalAlpha = 0.12;
      x.fillStyle = '#ffffff';
      x.beginPath();
      x.moveTo(W * 0.55, 0);
      x.lineTo(W * 0.75, 0);
      x.lineTo(W * 0.45, H);
      x.lineTo(W * 0.25, H);
      x.fill();
      x.restore();
      tex.needsUpdate = true;
      return;
    }
    if (state === 'cartoon') {
      const gr = x.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#7cc8ff');
      gr.addColorStop(1, '#d6f0ff');
      x.fillStyle = gr;
      x.fillRect(0, 0, W, H);
      x.fillStyle = '#ffd84a';
      x.beginPath();
      x.arc(520, 80, 46, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#ffffff';
      for (const [cx, cy, s] of [[(120 + t * 30) % 760 - 60, 90, 1], [(380 + t * 20) % 760 - 60, 60, 0.7]]) {
        x.beginPath();
        x.arc(cx, cy, 30 * s, 0, Math.PI * 2);
        x.arc(cx + 34 * s, cy - 10 * s, 36 * s, 0, Math.PI * 2);
        x.arc(cx + 70 * s, cy, 28 * s, 0, Math.PI * 2);
        x.fill();
      }
      x.fillStyle = '#5fc46a';
      x.beginPath();
      x.ellipse(160, 380, 300, 150, 0, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#43a957';
      x.beginPath();
      x.ellipse(520, 400, 280, 160, 0, 0, Math.PI * 2);
      x.fill();
      // a bouncing ball character
      const by = 230 - Math.abs(Math.sin(t * 3.2)) * 90;
      x.fillStyle = '#ff5c7a';
      x.beginPath();
      x.arc(320, by, 34, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#ffffff';
      x.beginPath();
      x.arc(308, by - 6, 8, 0, Math.PI * 2);
      x.arc(332, by - 6, 8, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#17256b';
      x.beginPath();
      x.arc(310, by - 5, 4, 0, Math.PI * 2);
      x.arc(334, by - 5, 4, 0, Math.PI * 2);
      x.fill();
    } else {
      const gr = x.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#3fb4ff');
      gr.addColorStop(1, '#1a5fb0');
      x.fillStyle = gr;
      x.fillRect(0, 0, W, H);
      x.fillStyle = '#f0d89a';
      x.fillRect(0, H - 40, W, 40);
      for (const f of fish) {
        const fx = ((f.ph + t * f.sp) % 760) - 60;
        x.fillStyle = f.c;
        x.beginPath();
        x.ellipse(fx, f.y, 34 * f.s, 20 * f.s, 0, 0, Math.PI * 2);
        x.fill();
        x.beginPath();
        x.moveTo(fx - 30 * f.s, f.y);
        x.lineTo(fx - 56 * f.s, f.y - 18 * f.s);
        x.lineTo(fx - 56 * f.s, f.y + 18 * f.s);
        x.fill();
        x.fillStyle = '#17256b';
        x.beginPath();
        x.arc(fx + 18 * f.s, f.y - 4 * f.s, 4 * f.s, 0, Math.PI * 2);
        x.fill();
      }
      x.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 8; i++) {
        const by = (H - ((t * 50 + i * 47) % H));
        x.beginPath();
        x.arc(80 + i * 70, by, 6 + (i % 3) * 2, 0, Math.PI * 2);
        x.fill();
      }
    }
    // channel number
    x.fillStyle = 'rgba(0,0,0,0.35)';
    x.fillRect(18, 16, 70, 56);
    x.fillStyle = '#7dff9a';
    x.font = '800 44px "Baloo 2", sans-serif';
    x.textAlign = 'center';
    x.fillText(String(ch || (state === 'cartoon' ? 1 : 2)), 53, 60);
    // volume bars
    if (vol >= 0) {
      x.fillStyle = 'rgba(0,0,0,0.45)';
      x.fillRect(110, H - 70, 420, 48);
      for (let i = 0; i < 10; i++) {
        x.fillStyle = i < Math.round(vol * 10) ? '#4fd18a' : 'rgba(255,255,255,0.25)';
        x.fillRect(170 + i * 34, H - 60, 26, 28);
      }
      x.fillStyle = '#ffffff';
      x.beginPath();
      x.moveTo(124, H - 54);
      x.lineTo(136, H - 54);
      x.lineTo(150, H - 66);
      x.lineTo(150, H - 26);
      x.lineTo(136, H - 38);
      x.lineTo(124, H - 38);
      x.fill();
    }
    // power-on: a bright line that opens into the picture
    if (boot < 1) {
      const k = boot;
      x.fillStyle = '#05060a';
      const open = H * Math.max(0.01, (k - 0.25) / 0.75);
      x.fillRect(0, 0, W, (H - open) / 2);
      x.fillRect(0, (H + open) / 2, W, (H - open) / 2);
      x.globalAlpha = 1 - k;
      x.fillStyle = '#ffffff';
      x.fillRect(0, (H - open) / 2, W, open);
    }
    x.restore();
    tex.needsUpdate = true;
  }
  setScreen('off');
  g.userData = { setScreen, screen, recv, standby, eye, pupil, recvPos: new THREE.Vector3(rx, ry, 0.12), h };
  return g;
}

// ------------------------------------------------------------ IR pulses
// A pool of capsules that run along a beam from 'a' to 'b'.
export function makePulses(scene, n = 24, r = 0.12) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 14, 1), new THREE.MeshBasicMaterial({ color: IR, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
    const cap = new THREE.Group();
    cap.add(m);
    const h = glow(IR, r * 6, 0.6);
    cap.add(h);
    cap.visible = false;
    scene.add(cap);
    list.push({ cap, m, h });
  }
  const dir = new THREE.Vector3(), mid = new THREE.Vector3(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
  // segs: [[s0, s1]] distances along the beam (0 = LED, len = receiver) to draw
  function draw(a, b, segs, op = 0.9) {
    dir.subVectors(b, a);
    const len = dir.length();
    dir.normalize();
    q.setFromUnitVectors(Y, dir);
    list.forEach((p, i) => {
      const s = segs[i];
      p.cap.visible = !!s && op > 0.01;
      if (!p.cap.visible) return;
      const s0 = Math.max(0, s[0]), s1 = Math.min(len, s[1]);
      if (s1 <= s0) {
        p.cap.visible = false;
        return;
      }
      mid.copy(a).addScaledVector(dir, (s0 + s1) / 2);
      p.cap.position.copy(mid);
      p.cap.quaternion.copy(q);
      p.m.scale.set(1, s1 - s0, 1);
      p.m.material.opacity = op;
      p.h.material.opacity = 0.5 * op;
      p.h.scale.set(r * 6, Math.max(r * 6, (s1 - s0) * 1.2), 1);
    });
    return len;
  }
  return { list, draw };
}

// ------------------------------------------------------------- living room
export const A_LR = new THREE.Vector3(-1.4, 0, -1.9); // Affan on the sofa
export const MAMA_LR = new THREE.Vector3(-3.15, -0.1, -1.95);
export const TV_AT = new THREE.Vector3(-1.4, 0, 5.4);
export function buildRoom() {
  const w = buildLivingRoom();
  w.kak.root.visible = false;
  const s = w.scene;
  // a front wall behind the TV (the room seen from the sofa)
  add(s, new THREE.PlaneGeometry(24, 14), std(0xf3dcbc, 0.95, { emissive: 0x2a1a0a, emissiveIntensity: 0.25 }), [0, 7, 7.2], [0, Math.PI, 0], [1, 1, 1], false).receiveShadow = true;
  add(s, new THREE.BoxGeometry(24, 0.3, 0.08), std(0xffffff, 0.6), [0, 0.15, 7.15], [0, 0, 0], [1, 1, 1], false);
  // a wall clock and a little shelf
  const clock = new THREE.Group();
  clock.position.set(1.6, 4.6, 7.1);
  clock.rotation.y = Math.PI;
  s.add(clock);
  add(clock, new THREE.CylinderGeometry(0.5, 0.5, 0.08, 32), std(0xffffff, 0.4), [0, 0, 0], [Math.PI / 2, 0, 0]);
  add(clock, new THREE.TorusGeometry(0.5, 0.05, 8, 32), std(0xff8a5c, 0.5), [0, 0, 0.02]);
  add(clock, new THREE.BoxGeometry(0.04, 0.32, 0.02), std(0x17256b, 0.4), [0, 0.13, 0.06]);
  add(clock, new THREE.BoxGeometry(0.22, 0.04, 0.02), std(0x17256b, 0.4), [0.1, 0, 0.06]);
  const shelf = new THREE.Group();
  shelf.position.set(-4.6, 0, 6.6);
  s.add(shelf);
  add(shelf, new RoundedBoxGeometry(1.4, 2.4, 0.6, 2, 0.05), std(0xc98a4a, 0.6), [0, 1.2, 0]);
  const R = rng(17);
  for (let i = 0; i < 6; i++) add(shelf, new THREE.BoxGeometry(0.16, 0.5 + R() * 0.2, 0.4), std([0xff6b6b, 0x3fa2ff, 0xffd166, 0x43b85c][i % 4], 0.7), [-0.45 + i * 0.18, 1.55, -0.02]);
  add(shelf, new THREE.SphereGeometry(0.22, 16, 12), std(0xffd166, 0.5), [0.2, 0.62, -0.05]);
  // TV cabinet and TV, facing the sofa
  const cab = new THREE.Group();
  cab.position.copy(TV_AT);
  cab.rotation.y = Math.PI;
  s.add(cab);
  add(cab, new RoundedBoxGeometry(3.8, 0.75, 0.9, 2, 0.06), std(0xb97a44, 0.6), [0, 0.375, 0]);
  for (const x of [-0.95, 0.95]) add(cab, new RoundedBoxGeometry(1.7, 0.5, 0.04, 2, 0.02), std(0xd39a5e, 0.6), [x, 0.4, 0.46]);
  for (const x of [-0.3, 0.3]) add(cab, new THREE.SphereGeometry(0.04, 10, 8), std(0x7a5434, 0.5), [x, 0.4, 0.5]);
  const tv = makeTV(3.2);
  tv.position.set(0, 0.75 + 0.36 + tv.userData.h / 2, 0);
  cab.add(tv);
  // the TV's light on the room when it is on
  const tvLight = new THREE.PointLight(0x9fd0ff, 0, 9, 2);
  tvLight.position.set(0, 2.0, -1.2);
  cab.add(tvLight);
  const remote = makeRemote();
  remote.scale.setScalar(0.5);
  s.add(remote);
  const mama = makeMama();
  mama.root.scale.setScalar(1.25);
  s.add(mama.root);
  const pulses = makePulses(s, 24, 0.085);
  return { ...w, tv, tvLight, cab, remote, mama, pulses };
}

// ---------------------------------------------------- the IR light stage
// Giant remote at the bottom pointing up at a giant TV near the top.
export const LED_AT = new THREE.Vector3(-0.7, 1.7, 0);
export function buildBeam() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x2a2266, 0x0e1430, -0.5, 0.8);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x303050, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(-4, 6, 9);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc0a0ff, 1.0);
  rim.position.set(5, 3, -4);
  scene.add(rim);
  // soft sparkles in the background
  const R = rng(71);
  for (let i = 0; i < 26; i++) {
    const b = glow([0x8f7cff, 0x5fb8ff, 0xff9ad8][i % 3], 0.6 + R() * 1.8, 0.25 + R() * 0.25);
    b.position.set((R() - 0.5) * 18, -3 + R() * 16, -6 - R() * 8);
    scene.add(b);
  }
  const remote = makeRemote();
  remote.scale.setScalar(3.6);
  scene.add(remote);
  const tv = makeTV(5.2, { stand: false });
  tv.position.set(0, 9.2, -0.4);
  scene.add(tv);
  tv.userData.eye.visible = false;
  const pulses = makePulses(scene, 24, 0.13);
  return { scene, sky, remote, tv, pulses };
}

// ---------------------------------------------------------- phone stage
// A big phone (screen +z) with a camera view of the remote's LED, and the real
// remote behind it, pointing at the phone's camera.
export function buildPhone() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0xffe9cf, 0xf4c99a, -0.6, 0.8);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xfff6ea, 0x9a7a5a, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(-4, 6, 8);
  scene.add(key);
  const R = rng(72);
  for (let i = 0; i < 18; i++) {
    const b = glow([0xffd8a0, 0xbfe6ff, 0xffc0d0][i % 3], 1.5 + R() * 2.5, 0.3);
    b.position.set((R() - 0.5) * 16, -4 + R() * 14, -8 - R() * 6);
    scene.add(b);
  }
  const phone = new THREE.Group();
  scene.add(phone);
  add(phone, new RoundedBoxGeometry(2.5, 5.0, 0.22, 4, 0.3), std(0x30364a, 0.3, { emissive: 0x0a0c14, emissiveIntensity: 0.3 }), [0, 0, 0]);
  const c = document.createElement('canvas');
  c.width = 360;
  c.height = 720;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  add(phone, new THREE.PlaneGeometry(2.3, 4.6), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), [0, 0, 0.115], [0, 0, 0], [1, 1, 1], false);
  // the screen: what the phone camera sees (the remote, end-on, with its LED)
  function setScreen(t, blink) {
    const x = c.getContext('2d');
    const W = c.width, H = c.height;
    const gr = x.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#6b6470');
    gr.addColorStop(1, '#3a3640');
    x.fillStyle = gr;
    x.fillRect(0, 0, W, H);
    // blurry room behind
    x.globalAlpha = 0.35;
    for (const [bx, by, br, bc] of [[60, 140, 90, '#c98a4a'], [300, 200, 110, '#2f9e9a'], [200, 560, 140, '#ffc866']]) {
      x.fillStyle = bc;
      x.beginPath();
      x.arc(bx, by, br, 0, Math.PI * 2);
      x.fill();
    }
    x.globalAlpha = 1;
    // the remote, seen from its tip
    x.save();
    x.translate(W / 2, H * 0.55);
    x.rotate(-0.12);
    x.fillStyle = '#23262f';
    x.beginPath();
    x.roundRect(-70, -110, 140, 330, 34);
    x.fill();
    x.fillStyle = '#ff3b4e';
    x.beginPath();
    x.arc(-30, -40, 14, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#dfe4ef';
    for (let r = 0; r < 3; r++) for (let cc = 0; cc < 3; cc++) {
      x.beginPath();
      x.arc((cc - 1) * 38, 30 + r * 40, 11, 0, Math.PI * 2);
      x.fill();
    }
    // the LED
    x.fillStyle = '#2a1030';
    x.beginPath();
    x.arc(0, -86, 18, 0, Math.PI * 2);
    x.fill();
    if (blink > 0.01) {
      const rg = x.createRadialGradient(0, -86, 0, 0, -86, 110);
      rg.addColorStop(0, `rgba(255,255,255,${blink})`);
      rg.addColorStop(0.15, `rgba(220,170,255,${blink})`);
      rg.addColorStop(0.5, `rgba(170,100,255,${0.45 * blink})`);
      rg.addColorStop(1, 'rgba(150,80,255,0)');
      x.fillStyle = rg;
      x.beginPath();
      x.arc(0, -86, 110, 0, Math.PI * 2);
      x.fill();
    }
    x.restore();
    // camera UI: frame corners, a shutter button, a red REC dot
    x.strokeStyle = 'rgba(255,255,255,0.85)';
    x.lineWidth = 6;
    for (const [cx, cy, sx, sy] of [[40, 110, 1, 1], [W - 40, 110, -1, 1], [40, H - 150, 1, -1], [W - 40, H - 150, -1, -1]]) {
      x.beginPath();
      x.moveTo(cx, cy + sy * 50);
      x.lineTo(cx, cy);
      x.lineTo(cx + sx * 50, cy);
      x.stroke();
    }
    x.fillStyle = 'rgba(0,0,0,0.55)';
    x.fillRect(0, 0, W, 70);
    x.fillRect(0, H - 110, W, 110);
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.arc(W / 2, H - 55, 36, 0, Math.PI * 2);
    x.fill();
    x.strokeStyle = '#ffffff';
    x.lineWidth = 5;
    x.beginPath();
    x.arc(W / 2, H - 55, 44, 0, Math.PI * 2);
    x.stroke();
    x.fillStyle = Math.floor(t * 2) % 2 ? '#ff3040' : 'rgba(255,48,64,0.4)';
    x.beginPath();
    x.arc(36, 35, 12, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#ffffff';
    x.font = '700 30px Fredoka, sans-serif';
    x.fillText('KAMERA', 60, 46);
    tex.needsUpdate = true;
  }
  setScreen(0, 0);
  const remote = makeRemote();
  remote.scale.setScalar(2.5);
  scene.add(remote);
  return { scene, sky, phone, remote, setScreen };
}
