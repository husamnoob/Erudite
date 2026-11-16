// Erudite lessons helper. Keeps lessons.json safe and makes Erudite really write lessons.
//   node lessons.js add "rule"   save one lesson (Erudite uses this, never edits the file by hand)
//   node lessons.js show         list the lessons
//   node lessons.js build lean|classic   builds combined_prompt.txt (Erudite.cmd runs this at start)
//   hook-prompt / hook-stop      used by the hooks in settings.json, not by you
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = __dirname;
const LESSONS = path.join(DIR, 'lessons.json');
const STATE = path.join(DIR, 'lessons.state.json');
const MAX_WORDS = 6000; // safety limit for ALL lessons together (each request sends them all)
const MAX_TRIES = 2;    // how many times the Stop hook may push before it gives up

const CORRECTION = /\b(wrong|incorrect|mistake|broken|broke|failed|fails|error|bug|not working|doesn'?t work|didn'?t work|does not work|did not work|isn'?t working|still (not|doesn'?t|didn'?t|broken|fails)|you (forgot|missed|ignored|deleted|broke|didn'?t|did not)|that'?s not)\b/i;
const MISSING_TOOL = /No such tool available|unknown tool|tool[^\n]{0,60}(does not exist|doesn'?t exist|not found|is not available)/i;

function readLessons() {
  if (!fs.existsSync(LESSONS)) return [];
  const data = JSON.parse(fs.readFileSync(LESSONS, 'utf8'));
  if (!Array.isArray(data) || data.some((x) => typeof x !== 'string')) throw new Error('lessons.json must be a list of text rules');
  return data;
}
function writeLessons(list) {
  try { if (fs.existsSync(LESSONS)) fs.copyFileSync(LESSONS, LESSONS + '.bak'); } catch (e) {}
  const tmp = LESSONS + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, LESSONS);
}
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const words = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);
function lessonsHash() {
  try { return crypto.createHash('md5').update(fs.readFileSync(LESSONS)).digest('hex'); } catch (e) { return 'none'; }
}
function readStdin(cb) {
  let raw = '', done = false;
  const finish = () => {
    if (done) return;
    done = true;
    let o = {};
    try { o = JSON.parse(raw || '{}'); } catch (e) {}
    cb(o);
  };
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => (raw += c));
  process.stdin.on('end', finish);
  process.stdin.on('error', finish);
  setTimeout(finish, 3000).unref();
}
function log(msg) {
  try {
    const f = path.join(DIR, 'lessons.hook.log');
    if (fs.existsSync(f) && fs.statSync(f).size > 50000) fs.writeFileSync(f, '');
    fs.appendFileSync(f, new Date().toISOString() + ' ' + msg + '\n');
  } catch (e) {}
}
function readState() { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) { return {}; } }
function writeState(s) { try { fs.writeFileSync(STATE, JSON.stringify(s), 'utf8'); } catch (e) {} }
function fileSize(p) { try { return fs.statSync(p).size; } catch (e) { return 0; } }

function lessonsBlock(list) {
  return 'LESSONS FROM PAST MISTAKES. Follow every one:\n' + list.map((r, i) => 'L' + (i + 1) + '. ' + r).join('\n') + '\n';
}

const cmd = process.argv[2];

if (cmd === 'add') {
  let rule = process.argv.slice(3).join(' ').trim().replace(/^["']+|["']+$/g, '').trim();
  if (!rule) { console.error('Nothing to save. Use: node lessons.js add "the rule"'); process.exit(1); }
  let list;
  try { list = readLessons(); } catch (e) { console.error('lessons.json is damaged (' + e.message + '). Tell the user. Your lesson was NOT saved.'); process.exit(1); }
  if (list.some((r) => norm(r) === norm(rule))) { console.error('That lesson is already saved. Do not add it again.'); process.exit(0); }
  const total = list.reduce((n, r) => n + words(r), 0) + words(rule);
  if (total > MAX_WORDS) {
    console.error('The lessons file is full (' + MAX_WORDS + ' words). Tell the user to tidy lessons.json. Your lesson was NOT saved.');
    process.exit(1);
  }
  list.push(rule);
  writeLessons(list);
  console.log('Saved lesson L' + list.length + '.');
} else if (cmd === 'show') {
  try { const l = readLessons(); console.log(l.length ? l.map((r, i) => 'L' + (i + 1) + '. ' + r).join('\n') : 'No lessons yet.'); }
  catch (e) { console.error('lessons.json is damaged: ' + e.message); process.exit(1); }
} else if (cmd === 'build') {
  const lean = process.argv[3] !== 'classic';
  const parts = [];
  for (const f of lean ? ['erudite_core.txt', 'erudite_prompt_short.txt'] : ['erudite_prompt_short.txt']) {
    try { parts.push(fs.readFileSync(path.join(DIR, f), 'utf8').replace(/\s+$/, '')); } catch (e) { console.error('Missing ' + f); }
  }
  let list = [];
  try { list = readLessons(); } catch (e) { console.error('WARNING: lessons.json is damaged, starting without lessons: ' + e.message); }
  parts.push(lessonsBlock(list));
  fs.writeFileSync(path.join(DIR, 'combined_prompt.txt'), parts.join('\n\n'), 'utf8');
} else if (cmd === 'hook-prompt') {
  readStdin((input) => {
    try {
      const prompt = String(input.prompt || '').trim();
      const st = { owed: null, attempts: 0, offset: fileSize(input.transcript_path), hash: lessonsHash() };
      const hit = !!prompt && !prompt.startsWith('/') && CORRECTION.test(prompt);
      if (hit) {
        st.owed = 'correction';
        process.stdout.write('REMINDER: the user may be correcting you. If you made a mistake, you must save a lesson with node lessons.js add before you finish.');
      }
      writeState(st);
      log('hook-prompt ran | prompt chars=' + prompt.length + ' | correction=' + hit + ' | transcript=' + (input.transcript_path ? 'yes' : 'NO'));
    } catch (e) { log('hook-prompt error ' + e.message); }
    process.exit(0);
  });
} else if (cmd === 'hook-stop') {
  readStdin((input) => {
    try {
      const st = readState();
      if (st.hash === undefined) { log('hook-stop ran | no state yet, allowing'); process.exit(0); }
      const size = fileSize(input.transcript_path);
      let missingTool = false;
      try {
        const len = Math.min(Math.max(size - (st.offset || 0), 0), 2000000);
        if (len > 0) {
          const fd = fs.openSync(input.transcript_path, 'r');
          const buf = Buffer.alloc(len);
          fs.readSync(fd, buf, 0, len, size - len);
          fs.closeSync(fd);
          missingTool = MISSING_TOOL.test(buf.toString('utf8'));
        }
      } catch (e) {}
      if (st.owed !== 'correction' && !missingTool) { log('hook-stop ran | nothing owed, allowing'); process.exit(0); }

      const now = lessonsHash();
      if (now !== st.hash || (st.attempts || 0) >= MAX_TRIES) {
        log('hook-stop ran | ' + (now !== st.hash ? 'lesson saved, allowing' : 'gave up after ' + MAX_TRIES + ' tries, allowing'));
        writeState({ owed: null, attempts: 0, offset: size, hash: now });
        process.exit(0);
      }
      st.attempts = (st.attempts || 0) + 1;
      writeState(st);
      log('hook-stop ran | BLOCKED, try ' + st.attempts + ' | correction=' + (st.owed === 'correction') + ' missingTool=' + missingTool);
      let msg = 'STOP. You may not finish yet. Save what you learned first.\n';
      if (st.owed === 'correction') msg += '- The user corrected you.\n';
      if (missingTool) msg += '- You called a tool, function or API that is missing.\n';
      msg += 'Run exactly: node lessons.js add "<rule>"\n' +
        'Write the whole error and the fix in the rule, in general words that help in ANY game (no one-off facts). ' +
        'For a missing tool or API, say that it never existed and what to use instead. ' +
        'Use single quotes inside the rule, never double quotes. If this exact lesson is already saved, you may finish. After saving, finish your answer.';
      process.stderr.write(msg);
      process.exit(2);
    } catch (e) { log('hook-stop error ' + e.message); process.exit(0); }
  });
} else {
  console.error('Usage: node lessons.js add "rule" | show | build lean|classic');
  process.exit(1);
}
