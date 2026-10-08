// Real code formatters for Shift+Alt+F and "Format on Ctrl+S": clang-format, rustfmt, ruff/black,
// gofmt, shfmt, stylua, xmllint and prettier — whichever are installed.
const q = s => `'${String(s).replace(/'/g, `'\\''`)}'`;
const dirOf = p => p.slice(0, p.lastIndexOf('/')) || '/';
const FORMATTERS = [
  { tool: 'clang-format', langs: ['c', 'cpp'], cmd: f => `clang-format --assume-filename=${q(f)}` },
  { tool: 'rustfmt', langs: ['rust'], cmd: () => 'rustfmt --emit stdout --edition 2021' },
  { tool: 'ruff', langs: ['python'], cmd: f => `ruff format --stdin-filename ${q(f)} -` },
  { tool: 'black', langs: ['python'], cmd: () => 'black -q -' },
  { tool: 'gofmt', langs: ['go'], cmd: () => 'gofmt' },
  { tool: 'shfmt', langs: ['shell'], cmd: () => 'shfmt -i 2' },
  { tool: 'stylua', langs: ['lua'], cmd: () => 'stylua -' },
  { tool: 'xmllint', langs: ['xml'], cmd: () => 'xmllint --format -' },
  { tool: 'prettier', langs: ['javascript', 'typescript', 'css', 'scss', 'less', 'html', 'markdown', 'yaml', 'json', 'graphql', 'vue'], cmd: f => `prettier --stdin-filepath ${q(f)}` },
];
const INSTALL_HINTS = { python: 'ruff (sudo pacman -S ruff)', go: 'gofmt (sudo pacman -S go)', shell: 'shfmt (sudo pacman -S shfmt)', lua: 'stylua (sudo pacman -S stylua)' };

(async () => {
  const names = [...new Set(FORMATTERS.map(f => f.tool))];
  const r = await ocode.exec(names.map(n => `command -v ${n} >/dev/null && echo ${n}`).join('; ') + '; true');
  const installed = new Set(r.stdout.split('\n').filter(Boolean));
  const done = new Set();
  for (const fmt of FORMATTERS) {
    if (!installed.has(fmt.tool)) continue;
    for (const lang of fmt.langs) {
      if (done.has(lang)) continue;
      done.add(lang);
      monaco.languages.registerDocumentFormattingEditProvider(lang, {
        displayName: fmt.tool,
        async provideDocumentFormattingEdits(model) {
          const file = model.uri.path;
          const res = await ocode.exec(fmt.cmd(file), { input: model.getValue(), cwd: dirOf(file), timeout: 30 });
          if (res.code !== 0 || !res.stdout) {
            ocode.toast(`${fmt.tool}: ${(res.stderr || res.error || 'failed').trim().split('\n')[0]}`, 'error');
            return [];
          }
          return res.stdout === model.getValue() ? [] : [{ range: model.getFullModelRange(), text: res.stdout }];
        },
      });
    }
  }
  for (const [lang, hint] of Object.entries(INSTALL_HINTS)) {
    if (done.has(lang)) continue;
    monaco.languages.registerDocumentFormattingEditProvider(lang, {
      displayName: 'formatter hint',
      provideDocumentFormattingEdits() { ocode.toast(`No ${lang} formatter installed — install ${hint}, then reload`, 'warn', 6000); return []; },
    });
  }
  ocode.registerCommand({ id: 'formatters.list', label: 'Formatters: Show Installed Formatters',
    run: () => ocode.chat.system(`<b>Formatters</b><br>${FORMATTERS.map(f => `${installed.has(f.tool) ? '✓' : '✗'} <code>${f.tool}</code> — ${f.langs.join(', ')}`).join('<br>')}`) });
})();
