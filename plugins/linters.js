// Shows real errors and warnings from compilers/linters when you open or save a file.
// Put the cursor on a squiggle and press Ctrl+. (or click the lightbulb) → "Fix with ocode".
const q = s => `'${String(s).replace(/'/g, `'\\''`)}'`;
const OWNER = 'ocode-lint';
let tools = new Set();

const PY_CHECK = `import ast,json,sys
src=open(sys.argv[1],encoding='utf-8',errors='replace').read()
try:
    ast.parse(src)
    print('[]')
except SyntaxError as e:
    print(json.dumps([{'line':e.lineno or 1,'col':e.offset or 1,'msg':'SyntaxError: '+str(e.msg),'sev':'error'}]))`;

function parseLines(text, re, map) {
  const out = [];
  for (const line of (text || '').split('\n')) { const m = line.match(re); if (m) out.push(map(m)); }
  return out;
}
const gccStyle = (file, cmd) => async () => {
  const r = await ocode.exec(cmd, { timeout: 30 });
  return parseLines(r.stderr, /^(.*?):(\d+):(\d+):\s+(?:fatal )?(error|warning):\s+(.*)$/, m => ({ file: m[1], line: +m[2], col: +m[3], sev: m[4], msg: m[5] }))
    .filter(d => d.file === file || d.file.endsWith('/' + file.split('/').pop()));
};

const LINTERS = {
  python: async f => {
    let out = [];
    try { out = JSON.parse((await ocode.exec(`python3 -c ${q(PY_CHECK)} ${q(f)}`)).stdout); } catch {}
    if (!out.length && tools.has('ruff')) {
      try {
        out = JSON.parse((await ocode.exec(`ruff check --output-format=json --quiet ${q(f)}`)).stdout || '[]').map(d => ({
          line: d.location.row, col: d.location.column, endLine: d.end_location.row, endCol: d.end_location.column,
          msg: `${d.code}: ${d.message}`, sev: /^(E9|F821|F822|F823)/.test(d.code) ? 'error' : 'warning' }));
      } catch {}
    }
    return out;
  },
  c: f => gccStyle(f, `gcc -fsyntax-only -Wall -Wextra -fno-diagnostics-color ${q(f)}`)(),
  cpp: f => gccStyle(f, `g++ -std=c++20 -fsyntax-only -Wall -Wextra -fno-diagnostics-color ${q(f)}`)(),
  shell: async f => {
    if (tools.has('shellcheck')) {
      try {
        return JSON.parse((await ocode.exec(`shellcheck -f json ${q(f)}`)).stdout || '[]').map(d => ({ line: d.line, col: d.column, endLine: d.endLine, endCol: d.endColumn, msg: `SC${d.code}: ${d.message}`, sev: d.level === 'error' ? 'error' : 'warning' }));
      } catch {}
    }
    return parseLines((await ocode.exec(`bash -n ${q(f)}`)).stderr, /line (\d+): (.*)$/, m => ({ line: +m[1], msg: m[2], sev: 'error' }));
  },
  lua: async f => parseLines((await ocode.exec(`luac -p ${q(f)}`)).stderr, /:(\d+): (.*)$/, m => ({ line: +m[1], msg: m[2], sev: 'error' })),
  rust: async f => {
    const r = await ocode.exec(`rustc --edition 2021 --error-format=json --emit=metadata --out-dir /tmp/ocode-rust-lint ${q(f)}`, { timeout: 60 });
    const out = [];
    for (const line of r.stderr.split('\n')) {
      let d; try { d = JSON.parse(line); } catch { continue; }
      const span = d.spans?.find(s => s.is_primary);
      if (!span || !['error', 'warning'].includes(d.level)) continue;
      out.push({ line: span.line_start, col: span.column_start, endLine: span.line_end, endCol: span.column_end, msg: d.message, sev: d.level });
    }
    return out;
  },
};

async function lint(path) {
  const model = monaco.editor.getModel(monaco.Uri.file(path));
  if (!model) return;
  const run = LINTERS[model.getLanguageId()];
  if (!run) return;
  let diags = [];
  try { diags = await run(path); } catch (e) { console.warn('[linters]', e); }
  if (model.isDisposed()) return;
  const lines = model.getLineCount();
  monaco.editor.setModelMarkers(model, OWNER, diags.filter(d => d.line >= 1 && d.line <= lines).map(d => {
    let endCol = d.endCol;
    if (!endCol) {
      const w = d.col ? model.getWordAtPosition({ lineNumber: d.line, column: d.col }) : null;
      endCol = w ? w.endColumn : model.getLineMaxColumn(d.line);
    }
    return { startLineNumber: d.line, startColumn: d.col || 1, endLineNumber: Math.min(d.endLine || d.line, lines), endColumn: endCol,
      message: d.msg, severity: d.sev === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning, source: 'lint' };
  }));
}

(async () => {
  const r = await ocode.exec('for t in ruff shellcheck; do command -v $t >/dev/null && echo $t; done; true');
  tools = new Set(r.stdout.split('\n').filter(Boolean));
  ocode.on('fileOpen', lint);
  ocode.on('fileSave', lint);
  for (const m of monaco.editor.getModels()) lint(m.uri.path);
  ocode.registerCommand({ id: 'linters.run', label: 'Lint: Check Current File', run: () => ocode.activeFile && lint(ocode.activeFile) });
})();
