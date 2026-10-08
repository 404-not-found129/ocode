// Bookmarks, JetBrains style: F11 toggles a bookmark on the current line, Shift+F11 lists every bookmark.
// Bookmarks move with your edits and are remembered between sessions.
ocode.css(`
  .bm-glyph { background: var(--accent); border-radius: 2px; width: 4px !important; margin-left: 8px; }
  .bm-line  { background: color-mix(in srgb, var(--accent) 7%, transparent); }
`);
const marks = ocode.settings.get('bookmarks') || {};   // file path → [line numbers]
let coll = null, saveTimer;

function render() {
  const ed = ocode.editor, model = ed.getModel();
  coll ||= ed.createDecorationsCollection();
  if (!model) return coll.clear();
  const lines = (marks[model.uri.path] || []).filter(l => l <= model.getLineCount());
  coll.set(lines.map(l => ({ range: new monaco.Range(l, 1, l, 1), options: {
    isWholeLine: true, className: 'bm-line', glyphMarginClassName: 'bm-glyph',
    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
    glyphMarginHoverMessage: { value: 'Bookmark — F11 to remove' } } })));
}

// Decorations move as you type, so read the lines back from them before saving.
function savePositions() {
  const model = ocode.editor.getModel();
  if (model && coll) {
    const lines = [...new Set(coll.getRanges().map(r => r.startLineNumber))].sort((a, b) => a - b);
    if (lines.length) marks[model.uri.path] = lines; else delete marks[model.uri.path];
  }
  ocode.settings.set('bookmarks', marks);
}

function toggle() {
  const ed = ocode.editor, model = ed.getModel();
  if (!model) return ocode.toast('Open a file first', 'warn');
  savePositions();
  const line = ed.getPosition().lineNumber, path = model.uri.path, list = marks[path] || [];
  marks[path] = list.includes(line) ? list.filter(l => l !== line) : [...list, line].sort((a, b) => a - b);
  if (!marks[path].length) delete marks[path];
  render();
  ocode.settings.set('bookmarks', marks);
}

function jump(dir) {
  const ed = ocode.editor, model = ed.getModel();
  const lines = model ? marks[model.uri.path] || [] : [];
  if (!lines.length) return ocode.toast('No bookmarks in this file', 'warn');
  const cur = ed.getPosition().lineNumber;
  const next = dir > 0 ? lines.find(l => l > cur) ?? lines[0] : [...lines].reverse().find(l => l < cur) ?? lines[lines.length - 1];
  ed.revealLineInCenter(next);
  ed.setPosition({ lineNumber: next, column: 1 });
  ed.focus();
}

async function list() {
  savePositions();
  const items = [];
  for (const [path, lines] of Object.entries(marks)) {
    const model = monaco.editor.getModel(monaco.Uri.file(path));
    for (const l of lines) items.push({
      label: `${path.split('/').pop()}:${l}`,
      desc: model && l <= model.getLineCount() ? model.getLineContent(l).trim().slice(0, 80) : path,
      value: { path, line: l }, icon: ocode.icon('bookmark'),
    });
  }
  if (!items.length) return ocode.toast('No bookmarks yet — press F11 on a line to add one', 'warn');
  const v = await ocode.ui.pick('Bookmarks', items);
  if (v) ocode.files.open(v.path, { line: v.line });
}

ocode.editor.updateOptions({ glyphMargin: true });
ocode.editor.onDidChangeModel(render);
ocode.editor.onDidChangeModelContent(() => { clearTimeout(saveTimer); saveTimer = setTimeout(savePositions, 800); });
ocode.registerCommand({ id: 'bookmarks.toggle', label: 'Bookmarks: Toggle Bookmark', keys: 'F11', run: toggle });
ocode.registerCommand({ id: 'bookmarks.list', label: 'Bookmarks: Show All Bookmarks', keys: 'Shift+F11', run: list });
ocode.registerCommand({ id: 'bookmarks.next', label: 'Bookmarks: Next in File', run: () => jump(1) });
ocode.registerCommand({ id: 'bookmarks.prev', label: 'Bookmarks: Previous in File', run: () => jump(-1) });
ocode.registerCommand({
  id: 'bookmarks.clear', label: 'Bookmarks: Clear Bookmarks in File',
  run() { const m = ocode.editor.getModel(); if (m) { delete marks[m.uri.path]; render(); ocode.settings.set('bookmarks', marks); } },
});
render();
