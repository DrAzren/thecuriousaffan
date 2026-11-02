#!/usr/bin/env node
// Writes output/subtitles.srt for an episode from its captions.js (the same
// word-timed chunks that are burned into the video), for platforms that take
// a separate caption file.
//
//   node tools/srt.js episodes/009-langit-biru
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const stamp = (s) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};

async function writeSrt(epDir) {
  // captions.js is an ES module; read it as text and evaluate it as one
  const src = fs.readFileSync(path.join(epDir, 'captions.js'), 'utf8');
  const url = 'data:text/javascript;base64,' + Buffer.from(src).toString('base64');
  const { CAPTIONS } = await import(url);
  const cues = CAPTIONS.map(([end, ...words], i) => `${i + 1}\n${stamp(words[0][1] - 0.08)} --> ${stamp(end)}\n${words.map(([w]) => w).join(' ')}\n`);
  const out = path.join(epDir, 'output', 'subtitles.srt');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, cues.join('\n'));
  return out;
}

module.exports = { writeSrt };

if (require.main === module) {
  const ep = process.argv[2];
  if (!ep) {
    console.error('usage: node tools/srt.js <episode-dir>');
    process.exit(1);
  }
  writeSrt(path.resolve(ROOT, ep)).then((f) => console.log('wrote', f));
}
