// Sort, de-duplicate, reverse and re-case text. Works on the selected lines, or the whole file if nothing is selected.
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function onLines(fn) {
  const ed = ocode.editor, model = ed.getModel();
  if (!model) return;
  const sel = ed.getSelection();
  const range = sel.isEmpty() ? model.getFullModelRange()
    : new monaco.Range(sel.startLineNumber, 1, sel.endLineNumber, model.getLineMaxColumn(sel.endLineNumber));
  const lines = model.getValueInRange(range).split(/\r?\n/);
  const trailing = lines.length > 1 && lines[lines.length - 1] === '' ? lines.pop() : null;
  const out = fn(lines);
  if (trailing !== null) out.push('');
  ed.pushUndoStop();
  ed.executeEdits('text-tools', [{ range, text: out.join(model.getEOL()) }]);
  ed.pushUndoStop();
}
function onSelection(fn) {
  const ed = ocode.editor, model = ed.getModel();
  if (!model) return;
  const edits = ed.getSelections().filter(s => !s.isEmpty()).map(s => ({ range: s, text: fn(model.getValueInRange(s)) }));
  if (!edits.length) return ocode.toast('Select some text first', 'warn');
  ed.executeEdits('text-tools', edits);
}
const words = s => s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[\s_\-.]+/).filter(Boolean);

const LINE_TOOLS = {
  'Sort Lines A → Z': l => l.sort(collator.compare),
  'Sort Lines Z → A': l => l.sort(collator.compare).reverse(),
  'Sort Lines by Length': l => l.sort((a, b) => a.length - b.length || collator.compare(a, b)),
  'Remove Duplicate Lines': l => [...new Set(l)],
  'Reverse Lines': l => l.reverse(),
  'Shuffle Lines': l => { for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; },
  'Remove Blank Lines': l => l.filter(x => x.trim()),
  'Trim Trailing Whitespace': l => l.map(x => x.replace(/\s+$/, '')),
};
const CASE_TOOLS = {
  'UPPERCASE': s => s.toUpperCase(),
  'lowercase': s => s.toLowerCase(),
  'Title Case': s => s.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()),
  'snake_case': s => words(s).map(w => w.toLowerCase()).join('_'),
  'camelCase': s => words(s).map((w, i) => i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()).join(''),
  'kebab-case': s => words(s).map(w => w.toLowerCase()).join('-'),
};

for (const [label, fn] of Object.entries(LINE_TOOLS))
  ocode.registerCommand({ id: 'text.' + label.replace(/\W+/g, ''), label: `Text: ${label}`, run: () => onLines(fn) });
for (const [label, fn] of Object.entries(CASE_TOOLS))
  ocode.registerCommand({ id: 'text.case.' + label.replace(/\W+/g, ''), label: `Text: Convert to ${label}`, run: () => onSelection(fn) });

ocode.registerCommand({ id: 'text.sortJson', label: 'Text: Sort JSON Keys (whole file)', run() {
  const model = ocode.editor.getModel();
  if (!model) return;
  const sortKeys = v => Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort(collator.compare).map(k => [k, sortKeys(v[k])])) : v;
  let data;
  try { data = JSON.parse(model.getValue()); } catch (e) { return ocode.toast('Not valid JSON: ' + e.message, 'error'); }
  ocode.editor.executeEdits('text-tools', [{ range: model.getFullModelRange(), text: JSON.stringify(sortKeys(data), null, model.getOptions().tabSize) + '\n' }]);
} });

ocode.registerEditorAction({ id: 'text.sortLines', label: 'Sort Lines A → Z', order: 20, run: () => onLines(LINE_TOOLS['Sort Lines A → Z']) });
