# ocode plugins

A plugin is plain JavaScript in `~/.config/ocode/plugins/`. Each one runs once when ocode starts, so you can add commands, keyboard shortcuts, slash commands, themes, status bar items, menu entries, side panels and editor features. There's no build step and no package format.

This folder holds the plugins that come with ocode, each in its own folder with a README that explains it in detail. `./install.sh` links this folder to `~/.config/ocode/plugins`, so editing a file here changes the plugin you're using.

- [Managing plugins](#managing-plugins)
- [Plugin layout](#plugin-layout)
- [Writing your first plugin](#writing-your-first-plugin)
- [API reference](#api-reference)
- [Examples](#examples)
- [Bundled plugins](#bundled-plugins)
- [Tips and troubleshooting](#tips-and-troubleshooting)

## Managing plugins

Open the **Plugins** panel (the blocks icon in the activity bar, or Ctrl+Shift+X). From there you can:

- **read what a plugin does**: each card shows the first line of the plugin's README. Click the plugin's name or **Readme** to read the whole README beside the editor.
- **turn a plugin on or off** with its switch. Changes apply after **Reload Window** (Ctrl+Shift+P → *Developer: Reload Window*).
- **open a plugin's code** with **Edit source**.
- **create a plugin** with **New plugin**, which makes a folder with a starter `index.js` and `README.md` and opens it.
- **see why a plugin failed**: errors are shown in red under the plugin's name, and a notification appears at startup.

Plugins are loaded in alphabetical order. Disabled plugins are remembered in `~/.config/ocode/settings.json` under `disabledPlugins`.

## Plugin layout

A plugin can be a folder or a single file:

```
~/.config/ocode/plugins/
├── my-tools/             a folder plugin (recommended)
│   ├── index.js          the code: runs at startup
│   └── README.md         shown in the Plugins panel
├── quick-hack.js         a single-file plugin
└── quick-hack.md         its README (optional)
```

The plugin's name is the folder name, or the file name without `.js`.

**Write a README for your plugin.** Its first plain paragraph becomes the description on the plugin's card, so keep that first line to one sentence about what the plugin does. After that, cover:

- **Usage:** how to use it, and a table of its commands and keys
- **Settings or customizing:** settings it reads, or values to change in `index.js`
- **Requirements:** tools it needs, with install commands
- **Limitations:** what it doesn't do

Relative links work in the README viewer: `[the code](index.js)` opens the file, and `[guide](../README.md)` opens another README.

## Writing your first plugin

Create `~/.config/ocode/plugins/hello/index.js` (or use **New plugin**, which also writes the README):

```js
ocode.registerCommand({
  id: 'hello.say',                 // unique id; prefix it with your plugin name
  label: 'Hello: Say Hi',          // what the command palette shows
  keys: 'Ctrl+Alt+H',              // optional keyboard shortcut
  run() {
    ocode.toast(`Hi! You're editing ${ocode.activeFile || 'nothing yet'}`, 'ok');
  },
});
```

Reload the window, then press Ctrl+Alt+H, or open the command palette (Ctrl+Shift+P) and type "Say Hi".

Every plugin gets two variables:

- `ocode`: the plugin API described below
- `monaco`: the full [Monaco editor API](https://microsoft.github.io/monaco-editor/docs.html), the editor engine VS Code uses

Your code runs inside a function, so top-level `const` and `let` stay private to the plugin. Plugins can't use top-level `await`; wrap async setup in `(async () => { … })()`.

## API reference

### Commands and keys

| Call | What it does |
| --- | --- |
| `ocode.registerCommand({ id, label, keys, global, when, run })` | Adds a command to the palette. `keys` is a shortcut like `'Ctrl+Alt+K'`, `'F11'` or `'Shift+F11'`. `global: true` also lets the shortcut work while the terminal is focused. `when()` returning `false` turns the shortcut off. Returns a function that removes the command. |
| `ocode.registerSlashCommand({ name, args, desc, run(args) })` | Adds `/name` to the chat. `args` is the text after the command, split on spaces. |
| `ocode.registerEditorAction({ id, label, keys, order, contextMenu, run(editor) })` | Adds an entry to the editor's right-click menu (and the palette). Set `contextMenu: false` to keep it out of the menu. |
| `ocode.registerExplorerAction({ label, when(entry), run(entry) })` | Adds an entry to the file tree's right-click menu. `entry` is `{ name, path, is_dir }`; `when` decides which items show it. |
| `ocode.registerRunner('ext', 'command {f}')` | Teaches F5 how to run a file type. `{f}` is the quoted file path and `{n}` the file name without its extension. |

### Interface

| Call | What it does |
| --- | --- |
| `ocode.toast(message, kind)` | A small notification. `kind` is `''`, `'ok'`, `'warn'` or `'error'`. |
| `await ocode.ui.input(title, value, hint)` | Asks for a line of text; `null` if cancelled. |
| `await ocode.ui.pick(title, items, { anchor, width })` | Shows a list to choose from. Items are strings or `{ label, desc, icon, value, checked, disabled }`, plus `{ head: 'Section' }` and `{ sep: true }` for headings and dividers. Returns the item's `value`. |
| `await ocode.ui.confirm(message, okLabel)` | `true` if the user confirms. |
| `ocode.ui.menu(x, y, items)` | A right-click style menu at a screen position; items are `{ label, run, kbd, danger }` or `'-'`. |
| `ocode.ui.sidePanel({ title, render(el, panel) })` | A panel beside the editor (Markdown preview uses this). `panel.onClose(fn)`, `panel.close()`, `panel.setTitle(t)`. |
| `await ocode.ui.diff({ original, modified, language, title })` | The review window: shows a diff the user can edit, then returns the accepted text or `null`. |
| `ocode.ui.openDiff({ title, original, modified, language })` | Opens a read-only diff in an editor tab. |
| `ocode.addStatusItem({ text, tooltip, align, onClick })` | A status bar item (`align: 'left'` or `'right'`). Returns `{ set(text), setTooltip(t), show(bool), remove() }`. |
| `ocode.layout.get(name)` / `set(name, show, persist)` / `toggle(name)` | Show or hide `'sidebar'`, `'term'` or `'chat'`. |
| `ocode.registerTheme(id, theme)` | Adds a color theme — see [the theme example](#a-color-theme). |
| `ocode.css(text)` | Injects CSS; returns a function that removes it. Use the theme variables such as `var(--accent)`, `var(--bg1)` and `var(--fg2)` so your styles follow the theme. |
| `ocode.icon(name)` | SVG markup for a built-in icon (`'file'`, `'folder'`, `'search'`, `'gitBranch'`, `'sparkle'`, `'clock'` …). |
| `ocode.h(tag, attrs, ...children)` / `ocode.esc(text)` | Small helpers for building DOM elements and escaping HTML. |

### Editor

| Call | What it does |
| --- | --- |
| `ocode.editor` | The Monaco editor instance (`getModel()`, `getSelection()`, `executeEdits()`, `onDidChangeModel()` …). |
| `ocode.monaco` | The Monaco namespace: languages, providers, decorations, `Range`, … |
| `ocode.activeFile` | Absolute path of the open file, or `null`. |
| `ocode.cwd` / `ocode.home` / `ocode.configDir` | The project folder, your home folder, and `~/.config/ocode`. |

### Files, shell and terminal

| Call | What it does |
| --- | --- |
| `await ocode.files.read(path)` | File contents as text. Relative paths are relative to the project folder. |
| `await ocode.files.write(path, text)` | Writes a file (creating folders) and refreshes it if it's open. |
| `ocode.files.open(path, { line, col })` | Opens a file in the editor. |
| `await ocode.files.list(dir)` | `[{ name, path, is_dir, size, mtime }]` |
| `ocode.files.move(from, to)` / `mkdir(path)` / `trash(path)` | File operations. `trash` moves to the desktop trash rather than deleting. |
| `ocode.refreshExplorer()` | Refreshes the file tree after you change files. |
| `await ocode.exec(command, { cwd, input, timeout })` | Runs a shell command and returns `{ code, stdout, stderr }`. `input` is sent to stdin. |
| `ocode.terminal.run(command)` | Types a command into the integrated terminal and runs it. |
| `ocode.openExternal(url)` | Opens a web link in your browser. |

### AI

| Call | What it does |
| --- | --- |
| `await ocode.ai.ask(prompt, { system, model, temperature, onChunk })` | One question to the chat model; returns the reply text. `onChunk(textSoFar)` streams it. |
| `ocode.ai.edit({ range, instruction })` | Runs Ctrl+K on a range, with the diff review. |
| `ocode.ai.editFiles({ instruction, root })` | Runs a multi-file edit (Ctrl+I) with the review window. |
| `ocode.chat.send(text)` / `insert(text)` / `system(html)` | Sends a chat message, puts text in the chat box, or shows a note in the chat. |

### Git

| Call | What it does |
| --- | --- |
| `await ocode.git.status()` | `{ repo, root, branch, upstream, ahead, behind, files: [{ path, rel, x, y, untracked, conflict }] }` |
| `await ocode.git.run(args, { quiet })` | Runs `git <args>` in the repository: `add`, `commit`, `push`, `pull`, `fetch`, `switch`, `branch`, `stash`, `restore`, `reset`, `diff`, `tag`, `merge`, `revert`, `init`, `rm` and `checkout`. Throws on failure unless `quiet`. |
| `ocode.git.refresh()` | Refreshes the Source Control panel, file colors and gutter markers. |

### Settings and events

| Call | What it does |
| --- | --- |
| `ocode.settings.get(key)` / `set(key, value)` | Reads and writes `~/.config/ocode/settings.json`. Prefix your own keys with your plugin's name. |
| `ocode.on(event, callback)` | Subscribes to `'ready'`, `'fileOpen'` (path), `'fileSave'` (path, content), `'themeChange'` (id), `'cwdChange'` (path), `'settingsChange'` (changed keys) and `'chatResponse'` (text). Returns an unsubscribe function. |

## Examples

### A status bar item

```js
// Shows how many lines the open file has.
const item = ocode.addStatusItem({ tooltip: 'Line count', align: 'right' });
const update = () => {
  const model = ocode.editor.getModel();
  item.show(!!model);
  if (model) item.set(`${model.getLineCount()} lines`);
};
ocode.editor.onDidChangeModel(update);
ocode.editor.onDidChangeModelContent(update);
update();
```

### An AI command

```js
// Explains the selected code in the chat, in one sentence.
ocode.registerEditorAction({
  id: 'oneliner.explain',
  label: 'Explain in One Sentence',
  async run(editor) {
    const code = editor.getModel().getValueInRange(editor.getSelection());
    if (!code) return ocode.toast('Select some code first', 'warn');
    const answer = await ocode.ai.ask(`Explain this code in one sentence:\n${code}`);
    ocode.chat.system(ocode.esc(answer));
  },
});
```

### A formatter

```js
// Formats Python with black (if installed) for Shift+Alt+F and format-on-save.
monaco.languages.registerDocumentFormattingEditProvider('python', {
  async provideDocumentFormattingEdits(model) {
    const r = await ocode.exec('black -q -', { input: model.getValue() });
    if (r.code !== 0) { ocode.toast(r.stderr.split('\n')[0], 'error'); return []; }
    return [{ range: model.getFullModelRange(), text: r.stdout }];
  },
});
```

### A color theme

```js
ocode.registerTheme('gruvbox', {
  label: 'Gruvbox Dark',
  type: 'dark',
  p: { bg0: '#282828', bg1: '#1d2021', bg2: '#32302f', bg3: '#3c3836', bg4: '#504945', bg5: '#665c54',
       fg0: '#fbf1c7', fg1: '#ebdbb2', fg2: '#a89984', fg3: '#7c6f64',
       accent: '#fe8019', accent2: '#fabd2f', 'accent-dim': 'rgba(254,128,25,.16)', border: '#1d2021' },
  tokens: { keyword: '#fb4934', string: '#b8bb26', number: '#d3869b', comment: ['#928374', 'italic'], type: '#fabd2f' },
});
```

Then pick it with Ctrl+Alt+T. Palette keys you leave out fall back to the default theme's colors.

### A chat slash command

```js
// /tree — shows the project's folder structure in the chat.
ocode.registerSlashCommand({
  name: 'tree', desc: 'Show the folder structure',
  async run() {
    const r = await ocode.exec("find . -maxdepth 2 -not -path '*/.git*' | sort | head -60");
    ocode.chat.system(`<pre>${ocode.esc(r.stdout)}</pre>`);
  },
});
```

## Bundled plugins

Click a name for that plugin's README.

| Plugin | What it adds | Keys |
| --- | --- | --- |
| [bookmarks](bookmarks/README.md) ([code](bookmarks/index.js)) | JetBrains-style bookmarks that follow your edits; next/previous/clear commands | F11 toggle, Shift+F11 list |
| [error-lens](error-lens/README.md) ([code](error-lens/index.js)) | Error and warning messages at the end of the line, with a tinted line | — |
| [formatters](formatters/README.md) ([code](formatters/index.js)) | Shift+Alt+F with clang-format, rustfmt, ruff/black, gofmt, shfmt, stylua, xmllint or prettier, whichever are installed | Shift+Alt+F |
| [git-tools](git-tools/README.md) ([code](git-tools/index.js)) | Quick "stage all and commit", a log graph, whole-file blame and "open on GitHub" (adds to the built-in Source Control panel) | Ctrl+Alt+C, `/commit` |
| [linters](linters/README.md) ([code](linters/index.js)) | Real errors from gcc/g++, Python, bash/shellcheck, luac and rustc when you open or save a file | — |
| [live-server](live-server/README.md) ([code](live-server/index.js)) | Serves a folder over HTTP and opens it in your browser | right-click a folder |
| [markdown-preview](markdown-preview/README.md) ([code](markdown-preview/index.js)) | Live Markdown preview beside the editor, scrolling with it | Ctrl+Shift+V |
| [organize-files](organize-files/README.md) ([code](organize-files/index.js)) | Sorts a messy folder into subfolders by type, month or extension, with a preview and undo | `/organize` |
| [snippets](snippets/README.md) ([code](snippets/index.js)) | Snippets for Python, JavaScript/TypeScript, C/C++, Rust, shell, HTML and Markdown; add your own in `~/.config/ocode/snippets.json` | type the trigger |
| [text-tools](text-tools/README.md) ([code](text-tools/index.js)) | Sort, dedupe, reverse and shuffle lines; change case; sort JSON keys | palette: "Text:" |
| [todo-tree](todo-tree/README.md) ([code](todo-tree/index.js)) | Highlights TODO/FIXME/HACK/BUG and lists them across the project | Ctrl+Alt+O, `/todos` |
| [word-count](word-count/README.md) ([code](word-count/index.js)) | Word count of the selection or file in the status bar | — |
| [zen-mode](zen-mode/README.md) ([code](zen-mode/index.js)) | Hides everything except the editor | Ctrl+Alt+Z |

## Tips and troubleshooting

- **Reload after editing.** Plugins load once, at startup: use *Developer: Reload Window* from the command palette. README changes show up without a reload.
- **A plugin failed to load.** The Plugins panel shows the error under the plugin's name. Syntax errors usually point at the line.
- **Shortcut clashes.** If two commands use the same keys, the one registered last wins. Plugins load after the built-in commands, so a plugin can override a built-in shortcut on purpose.
- **Unique ids.** Prefix command ids with your plugin name (`myplugin.doThing`) so they don't replace built-in commands such as `git.push`.
- **Long-running work.** Use `async` functions and show progress with `ocode.toast` or a status item. `ocode.exec` times out after 30 seconds unless you pass `timeout`.
- **Clean up.** Anything that returns a disposer (`registerCommand`, `ocode.css`, `ocode.on`, Monaco providers) can be undone, which is useful for toggles.
- **Security.** Plugins run with the same access as ocode, which means they can read and write your files and run commands. Only install plugins you've read or written yourself.
