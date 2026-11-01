// 2D motion-graphics layer drawn over the 3D canvas: synced captions, bubble
// titles, DEKAT/JAUH labels, arrows, icons and a canvas for sparkles/flashes.
// Everything is set per frame from t, so it renders deterministically.
import { clamp, backOut, easeOut, inv, rng, W, H } from './core.js';

export const SAFE = { top: 250, bottom: 1560, left: 70, right: 930 }; // keeps clear of TikTok/Reels/Shorts UI

const css = `
@font-face { font-family: 'Baloo 2'; font-weight: 800; src: url(/node_modules/@fontsource/baloo-2/files/baloo-2-latin-800-normal.woff2) format('woff2'); }
@font-face { font-family: 'Baloo 2'; font-weight: 700; src: url(/node_modules/@fontsource/baloo-2/files/baloo-2-latin-700-normal.woff2) format('woff2'); }
@font-face { font-family: 'Fredoka'; font-weight: 600; src: url(/node_modules/@fontsource/fredoka/files/fredoka-latin-600-normal.woff2) format('woff2'); }
@font-face { font-family: 'Fredoka'; font-weight: 700; src: url(/node_modules/@fontsource/fredoka/files/fredoka-latin-700-normal.woff2) format('woff2'); }
html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: #0b1230; }
#stage { position: absolute; inset: 0; width: ${W}px; height: ${H}px; }
#stage canvas { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; }
#ui { position: absolute; inset: 0; pointer-events: none; font-family: 'Fredoka', sans-serif; }
.o { position: absolute; left: 0; top: 0; will-change: transform, opacity; transform-origin: 50% 50%; }
.cap { left: ${W / 2}px; top: 1430px; width: 900px; margin-left: -450px; text-align: center; }
.cap .pill { display: inline-block; padding: 14px 34px 18px; border-radius: 40px; background: rgba(14, 20, 58, 0.78);
  box-shadow: 0 10px 30px rgba(0,0,0,0.35), inset 0 0 0 4px rgba(255,255,255,0.12); }
.cap .w { display: inline-block; font-weight: 700; font-size: 64px; line-height: 1.15; color: #fff; margin: 0 9px;
  text-shadow: 0 4px 0 rgba(10,14,40,0.6); transform-origin: 50% 70%; }
.tag { padding: 10px 26px 14px; border-radius: 999px; font-family: 'Baloo 2'; font-weight: 800; font-size: 54px; color: #fff; line-height: 1;
  letter-spacing: 2px; white-space: nowrap; box-shadow: 0 8px 0 rgba(0,0,0,0.22), 0 0 0 6px #fff; }
.tag.sm { font-size: 38px; padding: 8px 20px 11px; box-shadow: 0 6px 0 rgba(0,0,0,0.2), 0 0 0 5px #fff; }
.tag .pt { position: absolute; left: 50%; width: 0; height: 0; margin-left: -16px; border: 16px solid transparent; }
svg { overflow: visible; }
`;

const ESC = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function bubbleSVG(text, { size = 120, top = '#ffe45c', bot = '#ffa51f', stroke = '#17256b', outer = '#ffffff', width = W } = {}) {
  const lines = text.split('\n');
  const lh = size * 1.0;
  const h = lh * lines.length + size * 0.5;
  const id = 'g' + Math.random().toString(36).slice(2, 8);
  const tspans = lines.map((l, i) => `<tspan x="${width / 2}" y="${size * 0.95 + i * lh}">${ESC(l)}</tspan>`).join('');
  const t = (extra) => `<text text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="${size}" stroke-linejoin="round" paint-order="stroke" ${extra}>${tspans}</text>`;
  return `<svg width="${width}" height="${h}" viewBox="0 0 ${width} ${h}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs>
    ${t(`fill="${outer}" stroke="${outer}" stroke-width="${size * 0.36}" transform="translate(0 ${size * 0.06})" opacity="0.25"`)}
    ${t(`fill="${outer}" stroke="${outer}" stroke-width="${size * 0.34}"`)}
    ${t(`fill="url(#${id})" stroke="${stroke}" stroke-width="${size * 0.17}"`)}</svg>`;
}

export const ICONS = {
  arrow: (c = '#ff8a3d') => `<svg width="220" height="120" viewBox="0 0 220 120"><path d="M10 42 H130 V12 L210 60 L130 108 V78 H10 Z" fill="${c}" stroke="#fff" stroke-width="10" stroke-linejoin="round"/></svg>`,
  bulb: () => `<svg width="200" height="260" viewBox="0 0 200 260">
    <g stroke="#ffd84a" stroke-width="12" stroke-linecap="round"><line x1="100" y1="-40" x2="100" y2="-10"/><line x1="10" y1="10" x2="30" y2="30"/><line x1="190" y1="10" x2="170" y2="30"/><line x1="-25" y1="95" x2="5" y2="95"/><line x1="225" y1="95" x2="195" y2="95"/></g>
    <path d="M100 18 C50 18 25 55 25 95 C25 130 50 148 62 170 L138 170 C150 148 175 130 175 95 C175 55 150 18 100 18 Z" fill="#fff3a6" stroke="#17256b" stroke-width="10"/>
    <path d="M78 165 L78 130 Q100 110 122 130 L122 165" fill="none" stroke="#f0a020" stroke-width="8"/>
    <rect x="66" y="172" width="68" height="44" rx="10" fill="#9aa6c8" stroke="#17256b" stroke-width="10"/>
    <ellipse cx="72" cy="70" rx="14" ry="22" fill="#fff" opacity="0.8"/></svg>`,
  qmark: (c = '#ffcf33') => `<svg width="140" height="180" viewBox="0 0 140 180"><text x="70" y="150" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="190" fill="${c}" stroke="#17256b" stroke-width="12" paint-order="stroke" stroke-linejoin="round">?</text></svg>`,
  cross: () => `<svg width="200" height="200" viewBox="0 0 200 200"><g stroke-linecap="round"><line x1="40" y1="40" x2="160" y2="160" stroke="#fff" stroke-width="54"/><line x1="160" y1="40" x2="40" y2="160" stroke="#fff" stroke-width="54"/><line x1="40" y1="40" x2="160" y2="160" stroke="#ff4d5e" stroke-width="32"/><line x1="160" y1="40" x2="40" y2="160" stroke="#ff4d5e" stroke-width="32"/></g></svg>`,
  ruler: () => `<svg width="760" height="120" viewBox="0 0 760 120"><path d="M20 60 L90 15 V42 H670 V15 L740 60 L670 105 V78 H90 V105 Z" fill="#ffd84a" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/>
    <g stroke="#17256b" stroke-width="6">${Array.from({ length: 11 }, (_, i) => `<line x1="${130 + i * 50}" y1="46" x2="${130 + i * 50}" y2="${i % 2 ? 60 : 70}"/>`).join('')}</g></svg>`,
};

export class Overlay {
  constructor(root) {
    const st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
    this.ui = document.createElement('div');
    this.ui.id = 'ui';
    root.appendChild(this.ui);
    this.fx = document.createElement('canvas');
    this.fx.width = W;
    this.fx.height = H;
    this.fx.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px`;
    root.insertBefore(this.fx, this.ui);
    this.g = this.fx.getContext('2d');
    this.pool = new Map();
    this.used = new Set();
  }

  begin() {
    this.used.clear();
    this.g.clearRect(0, 0, W, H);
  }

  end() {
    for (const [id, e] of this.pool) if (!this.used.has(id)) e.el.style.display = 'none';
  }

  _get(id, make) {
    let e = this.pool.get(id);
    if (!e) {
      const el = document.createElement('div');
      el.className = 'o';
      this.ui.appendChild(el);
      e = { el, key: null };
      this.pool.set(id, e);
    }
    this.used.add(id);
    e.el.style.display = 'block';
    return e;
  }

  // Place element centred at (x, y) with opacity o, scale s, rotation r (deg).
  _place(e, { x = W / 2, y = H / 2, o = 1, s = 1, r = 0, ax = 0.5, ay = 0.5 }) {
    const el = e.el;
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.opacity = clamp(o);
    el.style.transform = `translate(${x - w * ax}px, ${y - h * ay}px) rotate(${r}deg) scale(${Math.max(0.0001, s)})`;
  }

  html(id, markup, p) {
    const e = this._get(id);
    if (e.key !== markup) {
      e.el.innerHTML = markup;
      e.key = markup;
    }
    this._place(e, p);
    return e.el;
  }

  bubble(id, text, p = {}, style = {}) {
    return this.html(id, bubbleSVG(text, style), p);
  }

  tag(id, text, p = {}, { bg = '#ff8a3d', small = false, pointer = null } = {}) {
    const pt = pointer === 'down' ? `<span class="pt" style="bottom:-30px;border-top-color:${bg}"></span>` : pointer === 'up' ? `<span class="pt" style="top:-30px;border-bottom-color:${bg}"></span>` : '';
    return this.html(id, `<div class="tag${small ? ' sm' : ''}" style="background:${bg};position:relative">${ESC(text)}${pt}</div>`, p);
  }

  // Animated caption pill for the chunk active at time t.
  captions(t, chunks, keywords) {
    let idx = -1;
    for (let i = 0; i < chunks.length; i++) if (t >= chunks[i][1][1] - 0.08 && t < chunks[i][0]) idx = i;
    if (idx < 0) return;
    const [end, ...words] = chunks[idx];
    const start = words[0][1] - 0.08;
    const markup = words.map(([w], i) => `<span class="w" data-i="${i}">${ESC(w)}</span>`).join('');
    const e = this._get('caption');
    e.el.className = 'o cap';
    if (e.key !== markup) {
      e.el.innerHTML = `<div class="pill">${markup}</div>`;
      e.key = markup;
    }
    const kin = clamp((t - start) / 0.18);
    const kout = clamp((end - t) / 0.12);
    e.el.style.opacity = Math.min(kin, kout);
    e.el.style.transform = `translateY(${(1 - easeOut(kin)) * 24}px) scale(${0.92 + 0.08 * backOut(kin)})`;
    const spans = e.el.querySelectorAll('.w');
    words.forEach(([w, ws], i) => {
      const next = i + 1 < words.length ? words[i + 1][1] : end;
      const active = t >= ws - 0.04 && t < next;
      const said = t >= ws - 0.04;
      const kw = keywords[w.toLowerCase().replace(/[^a-z-]/g, '')];
      const pop = clamp((t - ws + 0.04) / 0.16);
      const sp = spans[i];
      sp.style.color = active ? kw || '#ffd84a' : said ? kw || '#ffffff' : 'rgba(255,255,255,0.55)';
      sp.style.transform = `scale(${active ? 1 + 0.12 * Math.sin(pop * Math.PI) + 0.04 : 1})`;
    });
  }

  // ---------- canvas fx ----------
  star(x, y, r, a, color = '#fff6c8', rot = 0) {
    const g = this.g;
    g.save();
    g.globalAlpha = clamp(a);
    g.translate(x, y);
    g.rotate(rot);
    g.fillStyle = color;
    g.shadowColor = color;
    g.shadowBlur = r * 1.2;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 ? r * 0.28 : r;
      const ang = (i / 8) * Math.PI * 2;
      g.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
    }
    g.closePath();
    g.fill();
    g.restore();
  }

  // Twinkling sparkles scattered in a region, deterministic for seed.
  sparkles(t, { n = 30, seed = 1, x = 0, y = 0, w = W, h = H, a = 1, size = 22, colors = ['#fff6c8', '#ffd84a', '#9fe0ff', '#ffb3d1'] } = {}) {
    const R = rng(seed);
    for (let i = 0; i < n; i++) {
      const px = x + R() * w, py = y + R() * h, ph = R() * 10, sp = 1.5 + R() * 2.5, sz = size * (0.4 + R() * 0.8);
      const tw = Math.max(0, Math.sin(t * sp + ph));
      this.star(px, py - ((t * 20 * (0.5 + R())) % 60), sz * tw, a * tw, colors[i % colors.length], t * 0.8 + ph);
    }
  }

  // Swirl of sparkles orbiting a point, used for the "magic" transition.
  swirl(t, cx, cy, k, seed = 5) {
    const R = rng(seed);
    for (let i = 0; i < 90; i++) {
      const a0 = R() * Math.PI * 2, r0 = 80 + R() * 520, sp = 2 + R() * 3, sz = 10 + R() * 26;
      const ang = a0 + t * sp;
      const rr = r0 * (1.2 - 0.9 * k);
      this.star(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * 0.8, sz * (0.6 + k), clamp(k * 1.6) * (0.5 + 0.5 * Math.sin(t * 9 + i)), ['#fff6c8', '#ffd84a', '#9fe0ff', '#ffb3d1'][i % 4], ang);
    }
  }

  flash(k, color = '255,250,235') {
    if (k <= 0) return;
    const g = this.g;
    const gr = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, H * 0.75);
    gr.addColorStop(0, `rgba(${color},${clamp(k)})`);
    gr.addColorStop(1, `rgba(${color},${clamp(k * 0.85)})`);
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
  }

  vignette(a = 0.35) {
    const g = this.g;
    const gr = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.72);
    gr.addColorStop(0, 'rgba(5,8,30,0)');
    gr.addColorStop(1, `rgba(5,8,30,${a})`);
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
  }

  // Horizontal speed streaks (dir = -1 streaks move left).
  speedLines(t, { y0 = 0, y1 = H, n = 18, a = 0.6, dir = -1, seed = 9, color = '255,255,255' } = {}) {
    const g = this.g;
    const R = rng(seed);
    for (let i = 0; i < n; i++) {
      const y = y0 + R() * (y1 - y0), len = 120 + R() * 260, sp = 1800 + R() * 1600, ph = R() * 3000;
      let x = (ph + t * sp) % (W + len * 2) - len;
      if (dir < 0) x = W - x;
      const gr = g.createLinearGradient(x, 0, x - dir * len, 0);
      gr.addColorStop(0, `rgba(${color},${a})`);
      gr.addColorStop(1, `rgba(${color},0)`);
      g.strokeStyle = gr;
      g.lineWidth = 3 + R() * 5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - dir * len, y);
      g.stroke();
    }
  }

  // Dashed line between two screen points with animated dash offset.
  dashed(x1, y1, x2, y2, t, { color = '#7cc4ff', w = 10, a = 1, dash = [30, 22] } = {}) {
    const g = this.g;
    g.save();
    g.globalAlpha = clamp(a);
    g.setLineDash(dash);
    g.lineDashOffset = -t * 120;
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = w + 8;
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
    g.strokeStyle = color;
    g.lineWidth = w;
    g.stroke();
    g.restore();
  }

  line(x1, y1, x2, y2, { color = '#ff8a3d', w = 10, a = 1 } = {}) {
    const g = this.g;
    g.save();
    g.globalAlpha = clamp(a);
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = w + 8;
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
    g.strokeStyle = color;
    g.lineWidth = w;
    g.stroke();
    g.restore();
  }

  dot(x, y, r, color, a = 1) {
    const g = this.g;
    g.save();
    g.globalAlpha = clamp(a);
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(x, y, r + 6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
}

const MAGNIFIER = `<svg width="190" height="190" viewBox="0 0 190 190"><line x1="60" y1="130" x2="20" y2="172" stroke="#17256b" stroke-width="40" stroke-linecap="round"/><line x1="60" y1="130" x2="20" y2="172" stroke="#ffc928" stroke-width="22" stroke-linecap="round"/><circle cx="110" cy="80" r="62" fill="#8fdcff" stroke="#17256b" stroke-width="34"/><circle cx="110" cy="80" r="62" fill="none" stroke="#ffc928" stroke-width="16"/><ellipse cx="92" cy="62" rx="16" ry="22" fill="#fff" opacity="0.85"/></svg>`;

// "The Curious Affan" series logo. (cx, y) is the centre of "The"; k holds the
// {o, s} pop state of the three words so the logo can animate in.
export function drawLogo(ov, { cx = W / 2, y = 1110, scale = 1, k = [{ o: 1, s: 1 }, { o: 1, s: 1 }, { o: 1, s: 1 }], star = { o: 1, s: 1 } } = {}) {
  const at = (dx, dy) => ({ x: cx + dx * scale, y: y + dy * scale });
  ov.html('lThe', bubbleSVG('The', { size: 120, top: '#ffffff', bot: '#e8eefc' }), { ...at(10, 0), o: k[0].o, s: k[0].s * scale });
  ov.html('lCur', bubbleSVG('Curious', { size: 200, top: '#9fe8ff', bot: '#1d9bf0' }), { ...at(40, 160), o: k[1].o, s: k[1].s * scale });
  ov.html('lMag', MAGNIFIER, { ...at(-375, 190), o: k[1].o, s: k[1].s * 0.9 * scale, r: -8 });
  ov.html('lAff', bubbleSVG('Affan', { size: 220, top: '#ffe45c', bot: '#ff9f1c' }), { ...at(0, 340), o: k[2].o, s: k[2].s * scale });
  const st = at(72, 40);
  ov.star(st.x, st.y, 34 * star.s * scale, star.o, '#ffd84a', 0.3);
}

// Pop-in / pop-out helper for overlay elements: returns {o, s} for time t.
export function pop(t, a, b = Infinity, { fin = 0.35, fout = 0.2, from = 0.3 } = {}) {
  if (t < a || t > b) return { o: 0, s: from };
  const kin = clamp((t - a) / fin);
  const kout = b === Infinity ? 1 : clamp((b - t) / fout);
  return { o: Math.min(clamp(kin * 3), kout), s: (from + (1 - from) * backOut(kin, 2.2)) * (0.85 + 0.15 * kout) };
}

export { inv };
