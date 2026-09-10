import fs from 'node:fs';
const file = process.argv[2];
const raw = fs.readFileSync(file, 'utf8');
const html = raw
  .replace(/<!--[\s\S]*?-->/g, ' ')          /* comments can mention tags */
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<svg[\s\S]*?<\/svg>/g, ' ');
const VOID = new Set(['br', 'img', 'input', 'meta', 'link', 'hr', 'source', 'area', 'base', 'col', 'embed', 'param', 'track', 'wbr']);
const stack = [];
const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
let m;
while ((m = re.exec(html))) {
  const [full, slash, name, attrs] = m;
  const tag = name.toLowerCase();
  if (VOID.has(tag) || /\/\s*$/.test(attrs)) continue;
  const line = html.slice(0, m.index).split('\n').length;
  if (!slash) { stack.push({ tag, line }); continue; }
  // closing tag
  if (stack.length === 0) { console.log(`line ${line}: </${tag}> with nothing open`); continue; }
  const top = stack[stack.length - 1];
  if (top.tag === tag) { stack.pop(); continue; }
  const idx = stack.map(s => s.tag).lastIndexOf(tag);
  if (idx > -1) {
    const unclosed = stack.slice(idx + 1);
    console.log(`line ${line}: </${tag}> closed while still open: ${unclosed.map(u => `${u.tag} (opened line ${u.line})`).join(', ')}`);
    stack.length = idx;
  } else {
    console.log(`line ${line}: </${tag}> has no matching opening tag`);
  }
}
if (stack.length) console.log('unclosed at end of file:', stack.map(s => `${s.tag} (line ${s.line})`).join(', '));
else console.log('balanced');
