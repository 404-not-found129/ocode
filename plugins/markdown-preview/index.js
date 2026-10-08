// Live Markdown preview beside the editor (Ctrl+Shift+V). Scrolls along with the editor.
ocode.css(`
  .mdp { padding: 26px 34px 60px; max-width: 860px; margin: 0 auto; line-height: 1.65; color: var(--fg1); font-size: 14.5px; user-select: text; }
  .mdp h1, .mdp h2 { border-bottom: 1px solid var(--border); padding-bottom: .3em; }
  .mdp h1, .mdp h2, .mdp h3, .mdp h4 { color: var(--fg0); margin: 1.3em 0 .5em; line-height: 1.25; }
  .mdp h1:first-child { margin-top: 0; }
  .mdp a { color: var(--accent2); }
  .mdp code { background: var(--bg3); padding: 1px 5px; border-radius: 4px; font-family: var(--font-mono); font-size: .88em; }
  .mdp pre { background: var(--bg1); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; overflow: auto; font-size: 13px; }
  .mdp pre code { background: none; padding: 0; }
  .mdp blockquote { border-left: 3px solid var(--accent); margin: 0; padding: 2px 14px; color: var(--fg2); }
  .mdp table { border-collapse: collapse; } .mdp th, .mdp td { border: 1px solid var(--border); padding: 5px 10px; }
  .mdp img { max-width: 100%; border-radius: 6px; }
  .mdp ul, .mdp ol { padding-left: 26px; } .mdp li { margin: .2em 0; }
  .mdp p, .mdp ul, .mdp ol, .mdp pre, .mdp table, .mdp blockquote { margin: .75em 0; }
  .mdp hr { border: none; border-top: 1px solid var(--border); margin: 1.5em 0; }
  .mdp input[type=checkbox] { margin-right: 6px; }
`);
let panel = null;
const resolveFrom = (dir, rel) => decodeURIComponent(new URL(rel, `file://${dir}/`).pathname);

function open() {
  const ed = ocode.editor, model = ed.getModel();
  if (!model || model.getLanguageId() !== 'markdown') return ocode.toast('Open a Markdown (.md) file first', 'warn');
  const file = model.uri.path, dir = file.slice(0, file.lastIndexOf('/'));
  const div = ocode.h('div', { class: 'mdp' });
  let t;
  const render = () => {
    div.innerHTML = DOMPurify.sanitize(marked.parse(model.getValue(), { gfm: true }));
    for (const img of div.querySelectorAll('img')) {
      const src = img.getAttribute('src') || '';
      if (src && !/^(https?:|data:)/.test(src)) img.src = '/api/raw?path=' + encodeURIComponent(resolveFrom(dir, src));
    }
    for (const code of div.querySelectorAll('pre > code[class*="language-"]')) {
      const lang = code.className.match(/language-([\w+#-]+)/)[1];
      const id = monaco.languages.getLanguages().find(l => l.id === lang || (l.aliases || []).some(a => a.toLowerCase() === lang))?.id;
      if (id) monaco.editor.colorize(code.textContent, id, {}).then(html => { code.innerHTML = html; });
    }
  };
  div.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    const href = a.getAttribute('href') || '';
    if (/^https?:/.test(href)) ocode.openExternal(href);
    else if (href && !href.startsWith('#')) ocode.files.open(resolveFrom(dir, href.split('#')[0]));
  });
  panel = ocode.ui.sidePanel({ title: `Preview · ${file.split('/').pop()}`, render: el => el.append(div) });
  const subs = [
    model.onDidChangeContent(() => { clearTimeout(t); t = setTimeout(render, 150); }),
    model.onWillDispose(() => panel?.close()),
    ed.onDidScrollChange(() => {
      if (ed.getModel() !== model) return;
      const max = ed.getScrollHeight() - ed.getLayoutInfo().height, body = div.parentElement;
      if (body) body.scrollTop = max > 0 ? ed.getScrollTop() / max * (body.scrollHeight - body.clientHeight) : 0;
    }),
  ];
  panel.onClose(() => { subs.forEach(s => s.dispose()); panel = null; });
  render();
}

ocode.registerEditorAction({ id: 'markdown.preview', label: 'Markdown: Toggle Preview', keys: 'Ctrl+Shift+V', order: 10,
  run: () => (panel ? panel.close() : open()) });
