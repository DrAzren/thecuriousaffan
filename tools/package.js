#!/usr/bin/env node
// Writes a short social-media description for an episode from its meta.json
// plus the series tagline and hashtags in series.json. Called automatically at the end of
// a full render (tools/render.js); can also be run on its own:
//
//   node tools/package.js episodes/005-bulan-ikut-kereta
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Keep it SHORT: the title, one teaser line, the series tagline and hashtags.
// Never retell the episode's story or list what Affan learns; the video does
// that. meta.json must not grow extra lines (a fact list, a recap, tips).
function description(epDir) {
  const meta = JSON.parse(fs.readFileSync(path.join(epDir, 'meta.json'), 'utf8'));
  const series = JSON.parse(fs.readFileSync(path.join(ROOT, 'series.json'), 'utf8'));
  const tags = [...new Set([...series.hashtags.slice(0, 1), ...meta.hashtags, ...series.hashtags.slice(1)])];
  const lines = [meta.title, meta.teaser, ''];
  if (series.tagline) lines.push(series.tagline, '');
  lines.push(tags.join(' '));
  return lines.join('\n') + '\n';
}

function writeDescription(epDir) {
  const out = path.join(epDir, 'output', 'description.txt');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, description(epDir));
  return out;
}

module.exports = { description, writeDescription };

if (require.main === module) {
  const ep = process.argv[2];
  if (!ep) {
    console.error('usage: node tools/package.js <episode-dir>');
    process.exit(1);
  }
  console.log('wrote', writeDescription(path.resolve(ROOT, ep)));
}
