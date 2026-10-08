# Snippets

Type a short trigger word, like `main`, `def` or `html5`, and expand it into a full code template with Tab stops for the parts you'll change.

## Usage

Start typing a trigger. Snippets appear in the suggestion list (marked *snippet*) alongside normal completions; press **Enter** or **Tab** to insert one. Then press **Tab** to jump between the highlighted placeholders, and **Esc** when you're done.

## Built-in snippets

| Language | Triggers |
| --- | --- |
| Python | `main`, `ifmain`, `def`, `adef`, `class`, `dc` (dataclass), `with` (open a file), `try`, `argparse`, `req` (HTTP GET JSON) |
| JavaScript | `log`, `fn`, `af` (arrow function), `afn` (async function), `fetch`, `forof`, `imp`, `try`, `class` |
| TypeScript | the JavaScript ones plus `iface` |
| C++ | `main`, `for`, `forr` (range-based for), `cout`, `class`, `vec` |
| C | `main`, `for`, `printf` |
| Rust | `main`, `fn`, `test` |
| Shell | `bash` (script header with `set -euo pipefail`), `if`, `for`, `fn` |
| HTML | `html5` |
| Markdown | `table`, `code`, `todo` |

## Your own snippets

Run **Snippets: Edit My Snippets**. It creates and opens `~/.config/ocode/snippets.json`:

```json
{
  "python": {
    "hello": ["print(\"Hello, ${1:world}!\")", "Say hello"],
    "todo": ["# TODO(${1:me}): ${0}", "TODO comment"]
  },
  "javascript": {
    "clg": ["console.log('${1:label}:', ${2:value});", "Labelled log"]
  }
}
```

Each entry is `"trigger": ["body", "description"]`, grouped by language id (`python`, `javascript`, `typescript`, `c`, `cpp`, `rust`, `go`, `shell`, `html`, `css`, `markdown` …). Your snippets are added to the built-in ones, and replace a built-in snippet with the same trigger.

**Placeholders:** `${1:default}` is the first Tab stop, with default text; `${2}` is the next; `$0` is where the cursor ends up. Use the same number twice to edit both places at once. Write newlines as `\n` and indent with spaces or `\t`.

Reload the window after editing (Ctrl+Shift+P → *Developer: Reload Window*). If the file has a JSON error, a notification says so at startup.
