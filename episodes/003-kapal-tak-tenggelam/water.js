// Stylised water for Episode 003.
//
// makeSea():   harbour water. Gentle analytic waves (same function in JS as
//              waveH), sky reflection, sun glints, foam hugging the ship's
//              waterline, ring ripples (stone splash) and a proper look from
//              below the surface (Snell's window) for the underwater shots.
// makeTank():  the science-world cross-section: a water surface and a cut
//              face at z = 0, both cut exactly around the cutaway ship hull.
import * as THREE from 'three';
import { HULL_GLSL } from './ship.js';

const WAVES_GLSL = `
uniform float uTime;
uniform vec4 uRip;      // x, z, start time, amplitude
float waveH(vec2 p) {
  float t = uTime;
  return 0.10 * sin(dot(p, vec2(0.8, 0.6)) * 0.35 + t * 1.1)
       + 0.07 * sin(dot(p, vec2(-0.5, 0.86)) * 0.55 + t * 1.5)
       + 0.04 * sin(dot(p, vec2(0.95, -0.3)) * 0.9 + t * 2.1)
       + 0.025 * sin(dot(p, vec2(-0.2, -0.98)) * 1.6 + t * 2.9);
}
float ripple(vec2 p) {
  float a = uTime - uRip.z;
  if (a < 0.0 || a > 5.0) return 0.0;
  float r = length(p - uRip.xy);
  float front = a * 2.2;
  return uRip.w * exp(-a * 0.8) * sin(r * 5.0 - a * 11.0) * exp(-pow((r - front) / 0.9, 2.0)) * smoothstep(0.0, 0.4, r + 0.1);
}
float detail(vec2 p) {
  float t = uTime;
  return 0.012 * sin(dot(p, vec2(0.7, 0.7)) * 3.1 + t * 3.3) + 0.01 * sin(dot(p, vec2(-0.9, 0.4)) * 4.3 + t * 3.9)
       + 0.007 * sin(dot(p, vec2(0.2, -1.0)) * 6.7 + t * 5.1) + 0.006 * sin(dot(p, vec2(-0.6, -0.8)) * 9.1 + t * 6.3);
}
`;

// JS twin of waveH (for floating props and the ship's bob)
export function waveH(x, z, t) {
  return 0.1 * Math.sin((x * 0.8 + z * 0.6) * 0.35 + t * 1.1) + 0.07 * Math.sin((-x * 0.5 + z * 0.86) * 0.55 + t * 1.5)
    + 0.04 * Math.sin((x * 0.95 - z * 0.3) * 0.9 + t * 2.1) + 0.025 * Math.sin((-x * 0.2 - z * 0.98) * 1.6 + t * 2.9);
}

export function seabedY(z) {
  const k = Math.min(1, Math.max(0, (-5 - z) / 19));
  return -6 - 20 * k * k * (3 - 2 * k);
}

export function makeSea({ size = 3000, seg = 320, center = [0, -15] } = {}) {
  const geo = new THREE.PlaneGeometry(1, 1, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const half = size / 2;
  const f = (u) => Math.sign(u) * (70 * Math.abs(2 * u) + (half - 70) * Math.pow(Math.abs(2 * u), 4));
  for (let i = 0; i < p.count; i++) p.setXYZ(i, f(p.getX(i)) + center[0], 0, f(p.getZ(i)) + center[1]);
  geo.computeBoundingSphere();
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uRip: { value: new THREE.Vector4(0, 0, -99, 0) },
      uSun: { value: new THREE.Vector3(0.4, 0.55, -0.7).normalize() },
      uShip: { value: new THREE.Vector4(0, -48, 0, 0) },
      uZenith: { value: new THREE.Color(0x4f9ff0) },
      uHorizon: { value: new THREE.Color(0xa9d4f2) },
      uDeep: { value: new THREE.Color(0x0b5a7a) },
      uShallow: { value: new THREE.Color(0x24b5b8) },
      uHaze: { value: new THREE.Color(0xd2ebfb) },
      uHazeDen: { value: 0.0011 },
      uUnder: { value: new THREE.Color(0x0e6f8f) },
      uUnderDen: { value: 0.03 },
      uWindow: { value: new THREE.Color(0xc8fbff) },
    },
    vertexShader: `${WAVES_GLSL}
      varying vec3 vW;
      void main() {
        vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
        p.y += waveH(p.xz);
        vW = p;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `${WAVES_GLSL}
      ${HULL_GLSL}
      uniform vec3 uSun, uZenith, uHorizon, uDeep, uShallow, uHaze, uUnder, uWindow;
      uniform float uHazeDen, uUnderDen;
      uniform vec4 uShip; // x, z, yaw, bob
      varying vec3 vW;
      float H(vec2 p) { return waveH(p) + ripple(p) + detail(p); }
      float seabed(float z) { float k = clamp((-5.0 - z) / 19.0, 0.0, 1.0); return -6.0 - 20.0 * k * k * (3.0 - 2.0 * k); }
      void main() {
        vec2 p = vW.xz;
        float e = 0.08;
        float h0 = H(p);
        vec3 N = normalize(vec3(-(H(p + vec2(e, 0.0)) - h0) / e, 1.0, -(H(p + vec2(0.0, e)) - h0) / e));
        vec3 V = normalize(cameraPosition - vW);
        float dist = length(cameraPosition - vW);
        // foam along the ship's waterline
        vec2 d = p - uShip.xy;
        float cy = cos(uShip.z), sy = sin(uShip.z);
        vec2 l = vec2(cy * d.x - sy * d.y, sy * d.x + cy * d.y);
        float hw = hullHalfWAt(l.x, -uShip.w);
        float od = hw > 0.0 ? abs(l.y) - hw : 99.0;
        float n1 = sin(p.x * 1.7 + uTime * 1.3) * sin(p.y * 2.3 - uTime * 1.1) + sin(p.x * 4.1 - p.y * 3.3 + uTime * 2.0) * 0.5;
        float foam = 0.75 * smoothstep(1.5, 0.1, od) * smoothstep(0.2, 0.9, n1 + 0.6 - od * 0.6);
        // ripple crest foam
        float ra = uTime - uRip.z;
        float rr = length(p - uRip.xy);
        foam += (ra > 0.0 && ra < 3.0) ? 0.8 * exp(-ra * 1.4) * exp(-pow((rr - ra * 2.2) / 0.25, 2.0)) * uRip.w * 6.0 : 0.0;
        foam += (ra > 0.0 && ra < 1.5) ? exp(-ra * 3.0) * smoothstep(0.7, 0.0, rr) : 0.0;
        foam = clamp(foam, 0.0, 1.0);
        vec3 col;
        float alpha;
        if (gl_FrontFacing) {
          float ndv = max(dot(N, V), 0.0);
          float fres = 0.03 + 0.97 * pow(1.0 - ndv, 5.0);
          vec3 R = reflect(-V, N);
          vec3 sky = mix(uHorizon, uZenith, smoothstep(0.0, 0.45, R.y));
          float depth = -seabed(p.y);
          vec3 body = mix(uShallow, uDeep, smoothstep(5.0, 16.0, depth));
          body *= 0.85 + 0.15 * smoothstep(-0.15, 0.15, h0);
          col = mix(body, sky, fres * 0.6);
          float s = max(dot(R, uSun), 0.0);
          col += vec3(1.0, 0.95, 0.85) * (pow(s, 400.0) * 6.0 + pow(s, 40.0) * 0.25);
          col = mix(col, vec3(0.97, 1.0, 1.0), foam * 0.85);
          col = mix(col, uHaze, 1.0 - exp(-dist * uHazeDen));
          alpha = mix(0.8, 1.0, max(fres, foam));
        } else {
          // seen from below
          vec3 Nd = -N;
          float c = max(-V.y, 0.0) + 0.25 * (N.x * 0.6 + N.z * 0.6);
          float win = smoothstep(0.62, 0.78, c);
          float shim = 0.5 + 0.5 * sin(p.x * 3.0 + uTime * 2.0) * sin(p.y * 2.6 - uTime * 1.7);
          col = mix(uUnder * 1.25, uWindow * (0.9 + 0.3 * shim), win);
          col = mix(col, vec3(1.0), foam * 0.5);
          col = mix(col, uUnder, 1.0 - exp(-dist * uUnderDen));
          alpha = 0.97;
        }
        gl_FragColor = vec4(col, alpha);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  return mesh;
}

// ------------------------------------------------------------------- tank
// Science-world cross-section. Tank spans x in [x0, x1], z in [z0, 0],
// floor at y = 0. Uniforms: uLevel (still-water level), uShipE (ship x, y,
// scale), uRip (ripple). Returns { surface, face, set(t, level, ship) }.
export function makeTank({ x0 = -7, x1 = 7, z0 = -4, height = 7 } = {}) {
  const shared = {
    uTime: { value: 0 },
    uRip: { value: new THREE.Vector4(0, 0, -99, 0) },
    uLevel: { value: 3 },
    uShipE: { value: new THREE.Vector3(0, 10, 0.05) },
  };
  const COMMON = `${WAVES_GLSL}
    ${HULL_GLSL}
    uniform float uLevel;
    uniform vec3 uShipE;
    float tankH(vec2 p) { return uLevel + 0.25 * (waveH(p * 3.0) * 0.35 + ripple(p)); }
    float inHull(vec3 w) {
      vec3 l = vec3((w.x - uShipE.x) / uShipE.z, (w.y - uShipE.y) / uShipE.z, w.z / uShipE.z);
      float hw = hullHalfWAt(l.x, l.y);
      return hw > 0.0 && abs(l.z) < hw ? 1.0 : 0.0;
    }`;
  const surfGeo = new THREE.PlaneGeometry(x1 - x0, -z0, 200, 50);
  surfGeo.rotateX(-Math.PI / 2);
  surfGeo.translate((x0 + x1) / 2, 0, z0 / 2);
  const surface = new THREE.Mesh(surfGeo, new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: { ...shared, uSun: { value: new THREE.Vector3(0.3, 0.8, 0.5).normalize() } },
    vertexShader: `${COMMON}
      varying vec3 vW;
      void main() {
        vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
        p.y = tankH(p.xz);
        vW = p;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `${COMMON}
      uniform vec3 uSun;
      varying vec3 vW;
      void main() {
        if (inHull(vW) > 0.5) discard;
        float e = 0.03;
        float h0 = tankH(vW.xz);
        vec3 N = normalize(vec3(-(tankH(vW.xz + vec2(e, 0.0)) - h0) / e, 1.0, -(tankH(vW.xz + vec2(0.0, e)) - h0) / e));
        vec3 V = normalize(cameraPosition - vW);
        float fres = 0.05 + 0.95 * pow(1.0 - max(dot(N, V), 0.0), 4.0);
        vec3 col = mix(vec3(0.1, 0.55, 0.9), vec3(0.75, 0.9, 1.0), fres);
        vec3 R = reflect(-V, N);
        col += pow(max(dot(R, uSun), 0.0), 120.0) * 1.2;
        // bright rim where the surface meets the cut face
        col = mix(col, vec3(1.0), smoothstep(-0.06, 0.0, vW.z) * 0.6);
        gl_FragColor = vec4(col, 0.82);
        #include <colorspace_fragment>
      }`,
  }));
  surface.renderOrder = 3;

  const faceGeo = new THREE.PlaneGeometry(x1 - x0, height, 1, 1);
  faceGeo.translate((x0 + x1) / 2, height / 2, 0.002);
  const face = new THREE.Mesh(faceGeo, new THREE.ShaderMaterial({
    transparent: true,
    uniforms: shared,
    vertexShader: `varying vec3 vW; void main() { vec3 p = (modelMatrix * vec4(position, 1.0)).xyz; vW = p; gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `${COMMON}
      varying vec3 vW;
      void main() {
        float top = tankH(vec2(vW.x, 0.0));
        if (vW.y > top) discard;
        if (inHull(vec3(vW.xy, 0.0)) > 0.5) discard;
        float k = clamp(vW.y / max(top, 0.01), 0.0, 1.0);
        vec3 col = mix(vec3(0.01, 0.1, 0.42), vec3(0.06, 0.42, 0.85), pow(k, 0.9));
        // soft caustic bands
        float c = sin(vW.x * 2.3 + uTime * 1.4 + sin(vW.y * 1.7 + uTime)) * sin(vW.x * 1.3 - uTime * 0.9 + vW.y * 2.1);
        col += vec3(0.05, 0.12, 0.16) * smoothstep(0.55, 1.0, c) * k;
        // meniscus highlight
        col = mix(col, vec3(0.92, 0.99, 1.0), smoothstep(0.09, 0.0, top - vW.y));
        gl_FragColor = vec4(col, 0.9);
        #include <colorspace_fragment>
      }`,
  }));
  face.renderOrder = 4;
  return {
    surface,
    face,
    u: shared,
    set(t, level, ship) {
      shared.uTime.value = t;
      shared.uLevel.value = level;
      shared.uShipE.value.set(ship.position.x, ship.position.y, ship.scale.x);
    },
  };
}
