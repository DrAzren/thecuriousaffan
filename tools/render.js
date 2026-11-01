#!/usr/bin/env node
// Deterministic frame-by-frame renderer for HTML/Three.js episodes.
//
// The page must expose window.EP = { fps, duration, ready: Promise, frame(t) }.
// frame(t) draws the exact picture for time t (seconds); nothing depends on
// wall-clock time, so every render is identical.
//
//   node tools/render.js episodes/005-bulan-ikut-kereta                 # full silent video
//   node tools/render.js episodes/005-bulan-ikut-kereta --stills 1,5.5   # PNG stills
//   node tools/render.js <ep> --from 10 --to 20 --out part.mp4           # a section
//   node tools/render.js <ep> --stills 1 --eval "window.foo = 1"        # run JS first (for tuning)
//   node tools/render.js <ep> --package                                 # only thumbnail + description
//
// A full render (no --from/--to) also writes output/thumbnail.jpg (when the
// page exposes EP.thumbnail()) and output/description.txt (from meta.json).
//
// Set CHROMIUM_PATH to use a specific Chrome/Chromium binary.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const { writeDescription } = require('./package.js');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const ep = args[0];
if (!ep) {
  console.error('usage: node tools/render.js <episode-dir> [--stills t,t] [--from s] [--to s] [--out file] [--fps n]');
  process.exit(1);
}
const opt = (name, def) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : def;
};

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.svg': 'image/svg+xml' };

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
        res.writeHead(404);
        return res.end();
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

(async () => {
  const srv = await serve();
  const port = srv.address().port;
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && console.error('[page]', m.text()));
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  const url = `http://127.0.0.1:${port}/${ep.replace(/\/$/, '')}/index.html`;
  await page.goto(url);
  await page.waitForFunction(() => window.EP && window.EP.ready);
  await page.evaluate(() => window.EP.ready);
  await page.evaluate(() => document.fonts.ready);
  const info = await page.evaluate(() => ({ fps: window.EP.fps, duration: window.EP.duration }));
  const fps = Number(opt('fps', info.fps));

  const epDir = path.join(ROOT, ep);
  // Cover image + short description that go with every finished render.
  async function packageEpisode() {
    const outDir = path.join(epDir, 'output');
    fs.mkdirSync(outDir, { recursive: true });
    if (await page.evaluate(() => typeof window.EP.thumbnail === 'function')) {
      await page.evaluate(() => window.EP.thumbnail());
      const png = await page.screenshot({ type: 'png' });
      const jpg = path.join(outDir, 'thumbnail.jpg');
      await new Promise((res, rej) => {
        const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-i', '-', '-q:v', '2', jpg], { stdio: ['pipe', 'inherit', 'inherit'] });
        ff.on('close', (c) => (c ? rej(new Error('ffmpeg thumbnail failed')) : res()));
        ff.stdin.end(png);
      });
      console.log('wrote', jpg);
    }
    if (fs.existsSync(path.join(epDir, 'meta.json'))) console.log('wrote', writeDescription(epDir));
  }

  if (args.includes('--package')) {
    await packageEpisode();
    await browser.close();
    srv.close();
    return;
  }

  const pre = opt('eval');
  if (pre) await page.evaluate(pre);
  const stills = opt('stills');
  if (stills) {
    const dir = opt('out', path.join(ROOT, ep, 'stills'));
    fs.mkdirSync(dir, { recursive: true });
    for (const s of stills.split(',').map(Number)) {
      await page.evaluate((t) => window.EP.frame(t), s);
      const f = path.join(dir, `t${s.toFixed(2).padStart(6, '0')}.png`);
      await page.screenshot({ path: f });
      console.log(f);
    }
    await browser.close();
    srv.close();
    return;
  }

  const from = Number(opt('from', 0));
  const to = Number(opt('to', info.duration));
  const out = opt('out', path.join(ROOT, ep, 'output', 'video_silent.mp4'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const n0 = Math.round(from * fps);
  const n1 = Math.round(to * fps);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let n = n0; n < n1; n++) {
    await page.evaluate((t) => window.EP.frame(t), n / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 98 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((n - n0) % 30 === 0) {
      const el = (Date.now() - t0) / 1000;
      const done = n - n0 + 1;
      process.stdout.write(`frame ${n}/${n1}  ${(done / el).toFixed(2)} fps  eta ${(((n1 - n) * el) / done / 60).toFixed(1)} min\n`);
    }
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('wrote', out);
  if (opt('from') === undefined && opt('to') === undefined) await packageEpisode();
  await browser.close();
  srv.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
