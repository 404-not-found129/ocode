// Shows the word count of the selection (or the whole file) in the status bar.
const item = ocode.addStatusItem({ tooltip: 'Word count', align: 'right' });
let timer;

function update() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const ed = ocode.editor, model = ed.getModel();
    if (!model) return item.show(false);
    const sel = ed.getSelection();
    const text = sel && !sel.isEmpty() ? model.getValueInRange(sel) : model.getValue();
    const words = (text.match(/\S+/g) || []).length;
    item.set(`${words.toLocaleString()} word${words === 1 ? '' : 's'}`);
    item.show(true);
  }, 150);
}

ocode.editor.onDidChangeModel(update);
ocode.editor.onDidChangeModelContent(update);
ocode.editor.onDidChangeCursorSelection(update);
update();
