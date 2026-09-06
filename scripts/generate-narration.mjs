#!/usr/bin/env node
// Turns src/narration/script.json into browser-ready audio clips plus a manifest
// with exact durations, so the app can build its timeline without loading media.
//
//   node scripts/generate-narration.mjs [--check] [--force] [--voice=Meijia] [--rate=180]
//
// --check re-measures the committed audio instead of regenerating it, and fails
// when a clip drifts from the manifest or a playback path busts the time budget.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = join(root, 'src/narration/script.json');
const clipsPath = join(root, 'src/narration/clips.generated.json');
const audioDir = join(root, 'public/audio');
const tmpDir = join(root, 'node_modules/.narration-tmp');

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const check = args.includes('--check');
const force = args.includes('--force');

const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
const voice = flag('voice', script.voice);
const rate = Number(flag('rate', script.rate));
const budget = Number(flag('budget', script.budgetSeconds));
const lines = script.lines;

// The two paths a viewer can actually hear end to end. Stage 14 branches on
// whether the member already exists, and a returning member skips stage 15.
const paths = {
  首次登入: [
    'intro',
    's1',
    's2',
    's3',
    's4',
    's5',
    's6',
    's7',
    's8',
    's9',
    's10',
    's11',
    's12',
    's13',
    's14-new',
    's15',
    's16',
    's17-first',
  ],
  再次登入: [
    'intro-again',
    's1',
    's2',
    's3',
    's4',
    's5',
    's6',
    's7',
    's8',
    's9',
    's10',
    's11',
    's12',
    's13',
    's14-found',
    's16',
    's17-return',
  ],
};

const stamp = (text) =>
  createHash('sha1')
    .update(`${voice}|${rate}|${text}`)
    .digest('hex')
    .slice(0, 12);

function durationMs(file) {
  const info = execFileSync('afinfo', [file], { encoding: 'utf8' });
  const match = info.match(/estimated duration: ([\d.]+) sec/);
  if (!match) throw new Error(`afinfo 讀不到長度：${file}`);
  return Math.round(Number(match[1]) * 1000);
}

function speak(cue, text) {
  const aiff = join(tmpDir, `${cue}.aiff`);
  const txt = join(tmpDir, `${cue}.txt`);
  const out = join(audioDir, `${cue}.m4a`);
  writeFileSync(txt, text, 'utf8');
  execFileSync('say', ['-v', voice, '-r', String(rate), '-f', txt, '-o', aiff]);
  execFileSync('afconvert', [
    '-f',
    'm4af',
    '-d',
    'aac',
    '-b',
    '48000',
    aiff,
    out,
  ]);
  rmSync(aiff, { force: true });
  rmSync(txt, { force: true });
  return out;
}

function readClips() {
  if (!existsSync(clipsPath)) return {};
  return JSON.parse(readFileSync(clipsPath, 'utf8')).clips ?? {};
}

function writeClips(clips) {
  writeFileSync(
    clipsPath,
    JSON.stringify({ voice, rate, clips }, null, 2) + '\n',
    'utf8',
  );
}

mkdirSync(audioDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });

const previous = readClips();
const clips = {};
let built = 0;
let reused = 0;

for (const [cue, text] of Object.entries(lines)) {
  const hash = stamp(text);
  const file = join(audioDir, `${cue}.m4a`);
  const old = previous[cue];
  if (check) {
    if (!existsSync(file))
      throw new Error(`缺少音檔：${cue}.m4a（請執行 npm run narration）`);
    const actual = durationMs(file);
    if (!old) throw new Error(`clips.generated.json 缺少 ${cue}`);
    if (old.hash !== hash) throw new Error(`${cue} 的文字已改但音檔未重新產生`);
    if (Math.abs(actual - old.ms) > 50)
      throw new Error(
        `${cue} 長度不符：manifest ${old.ms}ms、實際 ${actual}ms`,
      );
    clips[cue] = { ...old, text };
    continue;
  }
  if (!force && old?.hash === hash && existsSync(file)) {
    clips[cue] = { ...old, text };
    reused++;
    continue;
  }
  speak(cue, text);
  clips[cue] = { src: `/audio/${cue}.m4a`, ms: durationMs(file), hash, text };
  built++;
}

if (!check) writeClips(clips);
rmSync(tmpDir, { recursive: true, force: true });

let over = false;
console.log(
  check ? '檢查旁白音檔…' : `旁白音檔：新產生 ${built} 段、沿用 ${reused} 段`,
);
for (const [name, cues] of Object.entries(paths)) {
  const missing = cues.filter((c) => !clips[c]);
  if (missing.length)
    throw new Error(`${name} 路徑缺少旁白：${missing.join(', ')}`);
  const total = cues.reduce((sum, c) => sum + clips[c].ms, 0) / 1000;
  const mmss = `${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, '0')}`;
  const verdict = total > budget ? `超過預算 ${budget}s` : 'ok';
  if (total > budget) over = true;
  console.log(`  ${name}：${cues.length} 段 / ${mmss}（${verdict}）`);
}
if (over) {
  console.error(
    `\n旁白總長超過 ${budget} 秒，請縮短 src/narration/script.json 的文字。`,
  );
  process.exit(1);
}
