// Snippets: type a trigger word (e.g. "main", "def", "html5") and pick it from the suggestions.
// Add your own in ~/.config/ocode/snippets.json: { "python": { "trigger": ["body with ${1:tabstops}", "description"] } }
const JS = {
  log: ['console.log(${1});', 'console.log'],
  fn: ['function ${1:name}(${2:args}) {\n\t${0}\n}', 'Function'],
  af: ['const ${1:name} = (${2:args}) => {\n\t${0}\n};', 'Arrow function'],
  afn: ['async function ${1:name}(${2:args}) {\n\t${0}\n}', 'Async function'],
  fetch: ['const res = await fetch(${1:url});\nif (!res.ok) throw new Error(`HTTP ${res.status}`);\nconst ${2:data} = await res.json();', 'Fetch JSON'],
  forof: ['for (const ${1:item} of ${2:items}) {\n\t${0}\n}', 'for…of loop'],
  imp: ["import ${2:name} from '${1:module}';", 'Import'],
  try: ['try {\n\t${1}\n} catch (${2:err}) {\n\t${0:console.error(err);}\n}', 'try/catch'],
  class: ['class ${1:Name} {\n\tconstructor(${2}) {\n\t\t${0}\n\t}\n}', 'Class'],
};
const BUILTIN = {
  python: {
    main: ['def main():\n    ${0:pass}\n\n\nif __name__ == "__main__":\n    main()', 'main() + entry guard'],
    ifmain: ['if __name__ == "__main__":\n    ${0:main()}', 'Entry guard'],
    def: ['def ${1:name}(${2:args}):\n    """${3:Describe it.}"""\n    ${0:pass}', 'Function'],
    adef: ['async def ${1:name}(${2:args}):\n    ${0:pass}', 'Async function'],
    class: ['class ${1:Name}:\n    def __init__(self${2:, args}):\n        ${0:pass}', 'Class'],
    dc: ['from dataclasses import dataclass\n\n\n@dataclass\nclass ${1:Name}:\n    ${2:field}: ${3:int}', 'Dataclass'],
    with: ['with open(${1:path}, "${2:r}", encoding="utf-8") as ${3:f}:\n    ${0:data = f.read()}', 'Open a file'],
    try: ['try:\n    ${1:pass}\nexcept ${2:Exception} as e:\n    ${0:print(e)}', 'try/except'],
    argparse: ['import argparse\n\nparser = argparse.ArgumentParser(description="${1}")\nparser.add_argument("${2:path}")\nargs = parser.parse_args()\n${0}', 'Command-line args'],
    req: ['import requests\n\nresp = requests.get(${1:url}, timeout=10)\nresp.raise_for_status()\n${2:data} = resp.json()', 'HTTP GET JSON'],
  },
  javascript: JS,
  typescript: { ...JS, iface: ['interface ${1:Name} {\n\t${0}\n}', 'Interface'] },
  cpp: {
    main: ['#include <iostream>\n\nint main() {\n    ${0:std::cout << "Hello, world!" << std::endl;}\n    return 0;\n}', 'main()'],
    for: ['for (int ${1:i} = 0; ${1:i} < ${2:n}; ++${1:i}) {\n    ${0}\n}', 'for loop'],
    forr: ['for (const auto& ${1:x} : ${2:items}) {\n    ${0}\n}', 'Range-based for'],
    cout: ['std::cout << ${1} << std::endl;', 'Print'],
    class: ['class ${1:Name} {\npublic:\n    ${1:Name}(${2});\n\nprivate:\n    ${0}\n};', 'Class'],
    vec: ['std::vector<${1:int}> ${2:v};', 'std::vector'],
  },
  c: {
    main: ['#include <stdio.h>\n\nint main(void) {\n    ${0:printf("Hello, world!\\n");}\n    return 0;\n}', 'main()'],
    for: ['for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n    ${0}\n}', 'for loop'],
    printf: ['printf("${1:%d}\\n", ${2});', 'printf'],
  },
  rust: {
    main: ['fn main() {\n    ${0:println!("Hello, world!");}\n}', 'main()'],
    fn: ['fn ${1:name}(${2}) -> ${3:()} {\n    ${0}\n}', 'Function'],
    test: ['#[cfg(test)]\nmod tests {\n    use super::*;\n\n    #[test]\n    fn ${1:it_works}() {\n        ${0:assert_eq!(2 + 2, 4);}\n    }\n}', 'Test module'],
  },
  shell: {
    bash: ['#!/usr/bin/env bash\nset -euo pipefail\n\n${0}', 'Script header'],
    if: ['if [[ ${1:condition} ]]; then\n  ${0}\nfi', 'if'],
    for: ['for ${1:f} in ${2:*}; do\n  ${0}\ndone', 'for loop'],
    fn: ['${1:name}() {\n  ${0}\n}', 'Function'],
  },
  html: {
    html5: ['<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${1:Document}</title>\n</head>\n<body>\n  ${0}\n</body>\n</html>', 'HTML5 page'],
  },
  markdown: {
    table: ['| ${1:Column} | ${2:Column} |\n| --- | --- |\n| ${3} | ${4} |', 'Table'],
    code: ['```${1:python}\n${0}\n```', 'Code block'],
    todo: ['- [ ] ${0}', 'Checklist item'],
  },
};

(async () => {
  let user = {};
  try {
    if ((await ocode.files.list(ocode.configDir)).some(e => e.name === 'snippets.json'))
      user = JSON.parse(await ocode.files.read(`${ocode.configDir}/snippets.json`));
  } catch (e) { ocode.toast('snippets.json: ' + e.message, 'error'); }
  const langs = new Set([...Object.keys(BUILTIN), ...Object.keys(user)]);
  for (const lang of langs) {
    const all = { ...(BUILTIN[lang] || {}), ...(user[lang] || {}) };
    monaco.languages.registerCompletionItemProvider(lang, {
      provideCompletionItems(model, pos) {
        const w = model.getWordUntilPosition(pos);
        const range = new monaco.Range(pos.lineNumber, w.startColumn, pos.lineNumber, w.endColumn);
        return { suggestions: Object.entries(all).map(([label, [body, doc]]) => ({
          label, kind: monaco.languages.CompletionItemKind.Snippet, insertText: body, detail: `snippet — ${doc || label}`,
          documentation: { value: '```\n' + body.replace(/\$\{\d+:?([^}]*)\}/g, '$1').replace(/\$\d/g, '') + '\n```' },
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, sortText: '0' + label })) };
      },
    });
  }
})();

ocode.registerCommand({ id: 'snippets.edit', label: 'Snippets: Edit My Snippets', async run() {
  const path = `${ocode.configDir}/snippets.json`;
  try { await ocode.files.read(path); }
  catch { await ocode.files.write(path, JSON.stringify({ python: { hello: ['print("Hello, ${1:world}!")', 'Say hello'] } }, null, 2) + '\n'); }
  ocode.files.open(path);
  ocode.toast('Reload the window after editing snippets', 'ok');
} });
