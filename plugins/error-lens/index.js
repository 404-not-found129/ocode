// Shows each error/warning message right at the end of its line, and tints the line.
ocode.css(`
  .el-line-err  { background: color-mix(in srgb, var(--red) 8%, transparent); }
  .el-line-warn { background: color-mix(in srgb, var(--yellow) 6%, transparent); }
  [class*="el-msg-"]::after { margin-left: 2.5em; font-style: italic; white-space: pre; pointer-events: none; }
`);
const { MarkerSeverity, Range } = monaco;
const style = ocode.h('style');
document.head.append(style);
let enabled = ocode.settings.get('errorLens') !== false;
let coll = null;

function update() {
  const ed = ocode.editor, model = ed.getModel();
  coll ||= ed.createDecorationsCollection();
  if (!model || !enabled) { coll.clear(); style.textContent = ''; return; }
  const byLine = new Map();
  for (const m of monaco.editor.getModelMarkers({ resource: model.uri })) {
    if (m.severity < MarkerSeverity.Warning) continue;
    const cur = byLine.get(m.startLineNumber);
    if (!cur || m.severity > cur.severity) byLine.set(m.startLineNumber, m);
  }
  const decos = [], rules = [];
  let i = 0;
  for (const [line, m] of byLine) {
    if (line > model.getLineCount()) continue;
    const err = m.severity === MarkerSeverity.Error, end = model.getLineMaxColumn(line), cls = `el-msg-${i++}`;
    const text = `${err ? '✖' : '⚠'} ${m.message.split('\n')[0].slice(0, 160)}`;
    rules.push(`.${cls}::after { content: ${JSON.stringify(text)}; color: var(${err ? '--red' : '--yellow'}); opacity: ${err ? .9 : .85}; }`);
    decos.push({ range: new Range(line, 1, line, 1), options: { isWholeLine: true, className: err ? 'el-line-err' : 'el-line-warn' } });
    decos.push({ range: new Range(line, end, line, end), options: { afterContentClassName: cls, showIfCollapsed: true } });
  }
  style.textContent = rules.join('\n');
  coll.set(decos);
}

monaco.editor.onDidChangeMarkers(update);
ocode.editor.onDidChangeModel(update);
ocode.registerCommand({ id: 'errorLens.toggle', label: 'Error Lens: Toggle Inline Errors', run() {
  enabled = !enabled; ocode.settings.set('errorLens', enabled); update();
  ocode.toast(`Inline errors ${enabled ? 'on' : 'off'}`, 'ok', 1500);
} });
update();
