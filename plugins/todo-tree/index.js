// Highlights TODO / FIXME / HACK / BUG / XXX in the editor and lists them across the whole folder.
ocode.css(`
  .todo-kw  { background: var(--yellow); color: #1a1a1a !important; border-radius: 3px; font-weight: 700; }
  .todo-fix { background: var(--red);    color: #ffffff !important; border-radius: 3px; font-weight: 700; }
`);
const KW = /\b(TODO|FIXME|HACK|BUG|XXX)\b[:\s]*(.*)/;
let coll = null, timer;
const item = ocode.addStatusItem({ align: 'left', tooltip: 'TODOs in this file — click to list all in the folder', onClick: () => listAll() });

function highlight() {
  const ed = ocode.editor, model = ed.getModel();
  coll ||= ed.createDecorationsCollection();
  if (!model) { coll.clear(); item.show(false); return; }
  const matches = model.findMatches('\\b(TODO|FIXME|HACK|BUG|XXX)\\b', false, true, true, null, true);
  coll.set(matches.map(m => ({ range: m.range, options: { inlineClassName: /FIXME|BUG/.test(m.matches[0]) ? 'todo-fix' : 'todo-kw' } })));
  item.set(`☐ ${matches.length}`);
  item.show(matches.length > 0);
}

async function listAll() {
  const r = await ocode.exec(`rg -n --no-heading --color never -e '\\b(TODO|FIXME|HACK|BUG|XXX)\\b' .`, { timeout: 20 });
  const items = r.stdout.split('\n').filter(Boolean).slice(0, 500).map(l => {
    const m = l.match(/^(.*?):(\d+):(.*)$/);
    if (!m) return null;
    const k = m[3].match(KW);
    return { label: (k ? `${k[1]}: ${k[2].replace(/\*\/|-->|#}$/g, '').trim() || '(no text)'}` : m[3].trim()).slice(0, 140), detail: `${m[1].replace(/^\.\//, '')}:${m[2]}`, value: { path: m[1], line: +m[2] } };
  }).filter(Boolean);
  if (!items.length) return ocode.toast('No TODOs in this folder', 'ok');
  const v = await ocode.ui.pick(`${items.length} TODOs in ${ocode.cwd.split('/').pop()}`, items);
  if (v) ocode.files.open(v.path, { line: v.line });
}

const later = () => { clearTimeout(timer); timer = setTimeout(highlight, 300); };
ocode.editor.onDidChangeModel(highlight);
ocode.editor.onDidChangeModelContent(later);
ocode.registerCommand({ id: 'todo.list', label: 'TODO: Show All TODOs in Folder', keys: 'Ctrl+Alt+O', run: listAll });
ocode.registerSlashCommand({ name: 'todos', desc: 'List TODO/FIXME comments in the folder', run: listAll });
highlight();
