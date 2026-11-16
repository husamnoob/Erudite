// Erudite instant commands. Runs when you press Enter, BEFORE the AI sees your message.
// /cards -> opens the CARDS folder and lists the cards. No AI, no quota used.
// Anything else passes through untouched.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let prompt = '';
  try { prompt = String(JSON.parse(raw).prompt || '').trim(); } catch (e) { process.exit(0); }
  if (!/^\/cards$/i.test(prompt)) process.exit(0); // not ours: let the message through

  const dir = path.join(__dirname, 'CARDS');
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}

  try {
    const p = spawn('explorer.exe', [dir], { detached: true, stdio: 'ignore' });
    p.on('error', () => {});
    p.unref();
  } catch (e) {}

  const lines = [];
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => /\.json$/i.test(f)).sort(); } catch (e) {}
  for (const f of files) {
    try {
      const card = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      const name = card.name || f.replace(/\.json$/i, '');
      let desc = String(card.description || '').replace(/\s+/g, ' ');
      if (desc.length > 90) desc = desc.slice(0, 90).replace(/\s+\S*$/, '') + '...';
      lines.push('- ' + name + (desc ? ' - ' + desc : ''));
    } catch (e) {
      lines.push('- ' + f + ' - cannot be read (garbled JSON?)');
    }
  }

  let reason = 'Opened the CARDS folder.\n\n';
  if (lines.length === 0) {
    reason += 'No cards yet. Drop card .json files in there, then type /cardadd.';
  } else {
    reason += lines.join('\n') + '\n\nTo add one: /cardadd NAME // what to do with it';
  }
  process.stdout.write(JSON.stringify({ decision: 'block', reason, suppressOriginalPrompt: true }), () => process.exit(0));
});
