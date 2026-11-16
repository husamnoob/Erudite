// install-look.js  -  runs by itself from Erudite.cmd (or by hand:  node install-look.js)
// Adds a profile called "Erudite Glass" (dark gray + see-through) to Windows Terminal,
// and makes Erudite.cmd open that profile. Makes backups first. Touches no API key.
const fs = require('fs');
const path = require('path');

const PROFILE_NAME = 'Erudite Glass';
const SCHEME_NAME = 'Erudite Mac';
const GUID = '{b3d6a1f0-5e2c-4c8a-9a47-3e1f6d2c8b90}';
const here = __dirname;
const local = process.env.LOCALAPPDATA || '';

const profile = {
  name: PROFILE_NAME,
  guid: GUID,
  commandline: 'cmd.exe',
  hidden: false,
  colorScheme: SCHEME_NAME,
  useAcrylic: true,
  opacity: 88,
  font: { face: 'Cascadia Mono', size: 12 },
  padding: '18, 14, 18, 14',
  cursorShape: 'filledBox',
  scrollbarState: 'hidden',
  tabTitle: 'Erudite v1.0',
  suppressApplicationTitle: true,
};
const iconPath = path.join(here, 'Erudite.ico');
if (fs.existsSync(iconPath)) profile.icon = iconPath;

const scheme = {
  name: SCHEME_NAME,
  background: '#1E1E1E', foreground: '#E6E6E6', cursorColor: '#F2F2F2',
  selectionBackground: '#3F638B',
  black: '#1E1E1E', red: '#FF5F57', green: '#28C840', yellow: '#FEBC2E',
  blue: '#5C9DFF', purple: '#D07BFF', cyan: '#4FD8E8', white: '#D4D4D4',
  brightBlack: '#6E6E6E', brightRed: '#FF8A84', brightGreen: '#5FE67A',
  brightYellow: '#FFD866', brightBlue: '#8DBBFF', brightPurple: '#E3A6FF',
  brightCyan: '#86EAF5', brightWhite: '#FFFFFF',
};

// ---- tiny JSON-with-comments reader (keeps the file's comments intact) ----
function tokenize(t) {
  const out = [];
  let i = 0;
  while (i < t.length) {
    const c = t[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && t[i + 1] === '/') { while (i < t.length && t[i] !== '\n') i++; continue; }
    if (c === '/' && t[i + 1] === '*') { const e = t.indexOf('*/', i + 2); i = e < 0 ? t.length : e + 2; continue; }
    if (c === '"') {
      let j = i + 1;
      while (j < t.length && t[j] !== '"') j += (t[j] === '\\' ? 2 : 1);
      out.push({ type: 'str', start: i, end: j + 1, value: JSON.parse(t.slice(i, j + 1)) });
      i = j + 1; continue;
    }
    if ('{}[],:'.includes(c)) { out.push({ type: 'p', start: i, end: i + 1, value: c }); i++; continue; }
    let j = i;
    while (j < t.length && !/[\s{}\[\],:"\/]/.test(t[j])) j++;
    if (j === i) j = i + 1;
    out.push({ type: 'o', start: i, end: j, value: t.slice(i, j) });
    i = j;
  }
  return out;
}
const isOpen = (k) => k.type === 'p' && (k.value === '{' || k.value === '[');
const isClose = (k) => k.type === 'p' && (k.value === '}' || k.value === ']');
function matching(tk, o) {
  let d = 0;
  for (let i = o; i < tk.length; i++) {
    if (isOpen(tk[i])) d++;
    else if (isClose(tk[i])) { d--; if (d === 0) return i; }
  }
  return -1;
}
function valueOfKey(tk, objOpen, key) {
  let d = 0;
  for (let i = objOpen; i < tk.length; i++) {
    if (isOpen(tk[i])) d++;
    else if (isClose(tk[i])) { d--; if (d === 0) break; }
    else if (d === 1 && tk[i].type === 'str' && tk[i].value === key && tk[i + 1] && tk[i + 1].value === ':') return i + 2;
  }
  return -1;
}
function toPlainJson(text) {
  const tk = tokenize(text);
  let s = '';
  for (let i = 0; i < tk.length; i++) {
    if (tk[i].value === ',' && tk[i].type === 'p' && tk[i + 1] && isClose(tk[i + 1])) continue;
    s += text.slice(tk[i].start, tk[i].end);
  }
  return JSON.parse(s);
}
function insertIntoArray(text, tk, openIdx, obj, indent) {
  const closeIdx = matching(tk, openIdx);
  if (closeIdx < 0) throw new Error('unbalanced brackets');
  const prev = tk[closeIdx - 1];
  const empty = closeIdx - 1 === openIdx;
  const needComma = !empty && !(prev.type === 'p' && prev.value === ',');
  const body = JSON.stringify(obj, null, 4).split('\n').map((l) => indent + l).join('\n');
  const closeStart = tk[closeIdx].start;
  if (needComma) {
    return text.slice(0, prev.end) + ',' + text.slice(prev.end, closeStart) + '\n' + body + '\n' + text.slice(closeStart);
  }
  return text.slice(0, closeStart) + '\n' + body + '\n' + text.slice(closeStart);
}

function patchSettings(file) {
  let raw = fs.readFileSync(file, 'utf8');
  const bom = raw.charCodeAt(0) === 0xfeff;
  if (bom) raw = raw.slice(1);
  let text = raw;
  const before = toPlainJson(text);
  const hasProfile = (j) => {
    const p = j.profiles;
    const list = Array.isArray(p) ? p : (p && p.list) || [];
    return list.some((x) => x && x.name === PROFILE_NAME);
  };
  const hasScheme = (j) => (j.schemes || []).some((x) => x && x.name === SCHEME_NAME);
  if (hasProfile(before) && hasScheme(before)) return 'already-installed';

  // 1) add the profile
  if (!hasProfile(before)) {
    let tk = tokenize(text);
    const pv = valueOfKey(tk, 0, 'profiles');
    if (pv < 0) throw new Error('no "profiles" section found');
    let arr = pv;
    if (tk[pv].value === '{') {
      arr = valueOfKey(tk, pv, 'list');
      if (arr < 0 || tk[arr].value !== '[') throw new Error('no profile "list" found');
    } else if (tk[pv].value !== '[') throw new Error('unexpected profiles format');
    text = insertIntoArray(text, tk, arr, profile, '        ');
  }
  // 2) add the color scheme
  if (!hasScheme(before)) {
    const tk = tokenize(text);
    const sv = valueOfKey(tk, 0, 'schemes');
    if (sv >= 0) {
      if (tk[sv].value !== '[') throw new Error('"schemes" is not a list');
      text = insertIntoArray(text, tk, sv, scheme, '        ');
    } else {
      const closeIdx = matching(tk, 0);
      const prev = tk[closeIdx - 1];
      const needComma = !(prev.type === 'p' && (prev.value === ',' || prev.value === '{'));
      const block = '    "schemes": [\n' +
        JSON.stringify(scheme, null, 4).split('\n').map((l) => '        ' + l).join('\n') + '\n    ]\n';
      const closeStart = tk[closeIdx].start;
      text = text.slice(0, prev.end) + (needComma ? ',' : '') + text.slice(prev.end, closeStart) + '\n' + block + text.slice(closeStart);
    }
  }
  // check the result before writing anything
  const after = toPlainJson(text);
  if (!hasProfile(after) || !hasScheme(after)) throw new Error('self-check failed');
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const strip = (j) => { const c = JSON.parse(JSON.stringify(j)); return c; };
  const a = strip(before), b = strip(after);
  const aList = Array.isArray(a.profiles) ? a.profiles : (a.profiles.list || []);
  const bList = Array.isArray(b.profiles) ? b.profiles : (b.profiles.list || []);
  const keepOld = (l) => l.filter((x) => x.name !== PROFILE_NAME);
  if (!same(keepOld(aList), keepOld(bList))) throw new Error('self-check: existing profiles changed');
  const backup = file + '.erudite-backup';
  if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
  fs.writeFileSync(file, (bom ? '\ufeff' : '') + text, 'utf8');
  return 'installed (backup: ' + backup + ')';
}

// ---- 1. Windows Terminal settings ----
const candidates = [
  path.join(local, 'Packages', 'Microsoft.WindowsTerminal_8wekyb3d8bbwe', 'LocalState', 'settings.json'),
  path.join(local, 'Packages', 'Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe', 'LocalState', 'settings.json'),
  path.join(local, 'Microsoft', 'Windows Terminal', 'settings.json'),
].concat(process.env.ERUDITE_TEST_SETTINGS ? [process.env.ERUDITE_TEST_SETTINGS] : []);
let touched = 0;
for (const f of candidates) {
  if (!fs.existsSync(f)) continue;
  try { console.log('Windows Terminal settings: ' + patchSettings(f) + '\n  ' + f); touched++; }
  catch (e) { console.log('SKIPPED ' + f + '\n  reason: ' + e.message + '\n  (file was not changed)'); }
}
if (!touched) console.log('Could not find or safely edit Windows Terminal settings. Nothing was changed there.');

// ---- 2. Make the launcher open the new profile ----
const cmdFile = path.join(here, 'Erudite.cmd');
if (process.argv.includes('--auto')) {
  // started by the launcher itself: never edit the launcher while it is running
} else if (fs.existsSync(cmdFile)) {
  const c = fs.readFileSync(cmdFile, 'utf8');
  const oldArg = '-p "Erudite" ';
  const newArg = '-p "' + PROFILE_NAME + '" ';
  if (c.includes(newArg)) console.log('Erudite.cmd: already points to ' + PROFILE_NAME);
  else if (c.split(oldArg).length === 2) {
    if (!fs.existsSync(cmdFile + '.bak')) fs.copyFileSync(cmdFile, cmdFile + '.bak');
    fs.writeFileSync(cmdFile, c.replace(oldArg, newArg), 'utf8');
    console.log('Erudite.cmd: updated (backup: Erudite.cmd.bak)');
  } else console.log('Erudite.cmd: expected line not found, left unchanged.');
} else console.log('Erudite.cmd not found next to this script, left unchanged.');

console.log('\nDONE. Close all Windows Terminal windows, then start Erudite.');
