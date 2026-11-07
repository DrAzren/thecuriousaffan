// Banknote art for Episode 022. Made-up cartoon notes (no real currency
// design): colour field, guilloche waves, rosette, a flower medallion, a
// watermark window, a security thread, raised value numerals and a serial.
//
// `stage` builds the note up the way the story tells it:
//   0 blank cotton paper (watermark + thread hidden inside)
//   1 + background colour
//   2 + fine line-work, rosette and border
//   3 + flower, value numerals (raised ink)
//   4 + serial number (finished note)
import * as THREE from 'three';

export const NW = 1024, NH = 480;

export const NOTE_STYLES = {
  green: { base: '#2fae6b', dark: '#14663d', light: '#c4f5d6', value: '10' },
  blue: { base: '#3f7ee8', dark: '#1d3f8f', light: '#c9dcff', value: '1' },
  red: { base: '#e8584f', dark: '#8f2420', light: '#ffd0c9', value: '20' },
  purple: { base: '#9a5fd8', dark: '#4b2585', light: '#e6d2ff', value: '5' },
  orange: { base: '#f0a43a', dark: '#99520e', light: '#ffe6b8', value: '50' },
};

function paper(g) {
  g.fillStyle = '#f6f3ea';
  g.fillRect(0, 0, NW, NH);
  // cotton fibres
  let s = 7;
  const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.lineWidth = 1.2;
  for (let i = 0; i < 420; i++) {
    const x = R() * NW, y = R() * NH, a = R() * Math.PI, l = 8 + R() * 22;
    g.strokeStyle = `rgba(${150 + R() * 60},${150 + R() * 60},${170 + R() * 50},0.35)`;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 4, y + Math.sin(a) * l * 0.5 - 4, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
}

function rosette(g, cx, cy, R, r, d, col) {
  g.strokeStyle = col;
  g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i <= 1400; i++) {
    const a = (i / 1400) * Math.PI * 2 * r;
    const x = cx + (R - r) * Math.cos(a) + d * Math.cos(((R - r) / r) * a);
    const y = cy + (R - r) * Math.sin(a) - d * Math.sin(((R - r) / r) * a);
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke();
}

function flower(g, cx, cy, s = 1, col = 'rgba(255,92,110,0.92)') {
  g.save();
  g.translate(cx, cy);
  g.scale(s, s);
  for (let i = 0; i < 5; i++) {
    g.rotate((Math.PI * 2) / 5);
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(0, -42, 30, 46, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#ffd84a';
  g.beginPath();
  g.arc(0, 0, 18, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

const NUMERALS = [[520, 140, 1], [890, 395, 0.6], [100, 400, 0.6]];

// Draw one note into context g at the origin (NW x NH).
export function drawNote(g, { base, dark, light, value, serial = 'AF 0220221' }, stage = 4) {
  if (stage < 1) paper(g);
  else {
    const gr = g.createLinearGradient(0, 0, NW, NH);
    gr.addColorStop(0, light);
    gr.addColorStop(0.45, base);
    gr.addColorStop(1, dark);
    g.fillStyle = gr;
    g.fillRect(0, 0, NW, NH);
  }
  if (stage >= 2) {
    g.lineWidth = 1.6;
    for (let k = 0; k < 26; k++) {
      g.strokeStyle = `rgba(255,255,255,${0.1 + (k % 3) * 0.05})`;
      g.beginPath();
      for (let x = 0; x <= NW; x += 8) {
        const y = 40 + k * 16 + Math.sin(x / 38 + k * 0.6) * 9 + Math.sin(x / 97 + k) * 6;
        x ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
    rosette(g, 250, 245, 120, 23, 70, 'rgba(255,255,255,0.55)');
    rosette(g, 250, 245, 85, 17, 40, 'rgba(10,50,30,0.35)');
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.lineWidth = 10;
    g.strokeRect(18, 18, NW - 36, NH - 36);
    g.strokeStyle = dark;
    g.lineWidth = 4;
    g.strokeRect(34, 34, NW - 68, NH - 68);
  }
  // watermark window and security thread: faint in reflected light
  const wg = g.createRadialGradient(800, 240, 10, 800, 240, 105);
  wg.addColorStop(0, stage < 1 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.75)');
  wg.addColorStop(1, 'rgba(255,255,255,0.15)');
  g.fillStyle = wg;
  g.beginPath();
  g.ellipse(800, 240, 88, 110, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = stage < 1 ? 'rgba(120,120,140,0.18)' : 'rgba(40,40,60,0.55)';
  g.fillRect(600, 34, 12, 412);
  if (stage >= 1) {
    g.fillStyle = 'rgba(220,235,255,0.8)';
    for (let y = 44; y < 440; y += 34) g.fillRect(600, y, 12, 14);
  }
  if (stage >= 3) {
    flower(g, 250, 245);
    g.font = '800 120px "Baloo 2"';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const [x, y, s] of NUMERALS) {
      g.save();
      g.translate(x, y);
      g.scale(s, s);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillText(value, 4, 6);
      g.fillStyle = '#fffdf2';
      g.strokeStyle = dark;
      g.lineWidth = 8;
      g.strokeText(value, 0, 0);
      g.fillText(value, 0, 0);
      g.restore();
    }
    g.font = '800 54px "Baloo 2"';
    g.fillStyle = '#fffdf2';
    g.fillText('RM', 520, 245);
  }
  if (stage >= 4) {
    g.font = '700 30px Fredoka';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = dark;
    g.fillText(serial, 450, 400);
  }
}

function tex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function noteTexture(style, stage = 4, serial) {
  const c = document.createElement('canvas');
  c.width = NW;
  c.height = NH;
  drawNote(c.getContext('2d'), { ...style, serial: serial || style.serial }, stage);
  return tex(c);
}

// Light shining through the note: the watermark flower ('mark') or the
// security thread ('thread') glowing.
export function backlitTexture(part = 'mark') {
  const c = document.createElement('canvas');
  c.width = NW;
  c.height = NH;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, NW, NH);
  if (part === 'mark') {
    const wg = g.createRadialGradient(800, 240, 10, 800, 240, 120);
    wg.addColorStop(0, 'rgba(255,250,225,0.95)');
    wg.addColorStop(1, 'rgba(255,250,225,0.15)');
    g.fillStyle = wg;
    g.beginPath();
    g.ellipse(800, 240, 92, 114, 0, 0, Math.PI * 2);
    g.fill();
    flower(g, 800, 240, 1.15, 'rgba(255,170,90,1)');
  } else {
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.fillRect(598, 34, 16, 412);
    g.fillStyle = 'rgba(140,200,255,1)';
    for (let y = 44; y < 440; y += 34) g.fillRect(598, y, 16, 14);
  }
  return tex(c);
}

// Raised-ink mask: white where the value numerals and medallion are printed.
export function bumpTexture(style) {
  const c = document.createElement('canvas');
  c.width = NW;
  c.height = NH;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, NW, NH);
  g.filter = 'blur(2px)';
  flower(g, 250, 245, 1, '#fff');
  g.font = '800 120px "Baloo 2"';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#fff';
  for (const [x, y, s] of NUMERALS) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.fillText(style.value, 0, 0);
    g.restore();
  }
  g.font = '800 54px "Baloo 2"';
  g.fillText('RM', 520, 245);
  return tex(c, false);
}

// A printing sheet: cols x rows notes with margins, at a given print stage.
export const SHEET = { cols: 3, rows: 4, pad: 40, gap: 30 };
export function sheetSize() {
  const { cols, rows, pad, gap } = SHEET;
  return [pad * 2 + cols * NW + (cols - 1) * gap, pad * 2 + rows * NH + (rows - 1) * gap];
}
export function sheetTexture(style, stage, serial0 = 220221) {
  const { cols, rows, pad, gap } = SHEET;
  const [w, h] = sheetSize();
  const c = document.createElement('canvas');
  c.width = w / 2;
  c.height = h / 2;
  const g = c.getContext('2d');
  g.scale(0.5, 0.5);
  g.fillStyle = '#f2efe6';
  g.fillRect(0, 0, w, h);
  for (let r = 0; r < rows; r++)
    for (let k = 0; k < cols; k++) {
      g.save();
      g.translate(pad + k * (NW + gap), pad + r * (NH + gap));
      drawNote(g, { ...style, serial: 'AF ' + String(serial0 + r * cols + k).padStart(7, '0') }, stage);
      g.restore();
    }
  return tex(c);
}

// A gently curled note mesh (reads as paper rather than a flat card).
export function noteGeo(w = 1.5, curl = 0.06) {
  const geo = new THREE.PlaneGeometry(w, (w * NH) / NW, 24, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, curl * Math.sin((p.getX(i) / w) * Math.PI) - 0.04 * (p.getX(i) / w) ** 2);
  geo.computeVertexNormals();
  return geo;
}

export function makeNote(style, w = 1.5, { stage = 4, serial, curl = 0.06, mat = {} } = {}) {
  const m = new THREE.Mesh(noteGeo(w, curl), new THREE.MeshStandardMaterial({ map: noteTexture(style, stage, serial), roughness: 0.72, side: THREE.DoubleSide, ...mat }));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
