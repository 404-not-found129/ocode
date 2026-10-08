# ocode

A local AI code editor for Linux, in the spirit of Claude Code and Cursor, that runs entirely on your own machine with [Ollama](https://ollama.com). No accounts, no cloud: your code and prompts never leave your computer.

ocode pairs a full Monaco editor (the editor inside VS Code) with an AI agent that can read, write and edit files and run commands, plus AI autocomplete, inline AI edits, a real terminal, and a plugin system.

## Features

- **Editor:** Monaco with syntax highlighting for 80+ languages, minimap, multi-cursor, find and replace, bracket colors, sticky scroll, and auto-save. Open tabs are restored when you relaunch.
- **AI chat agent:** ask for changes in plain English. The agent uses tools (`read_file`, `write_file`, `edit_file`, `list_files`, `run_command`) and opens the files it changes. It can see your open file and selection.
- **AI autocomplete:** suggestions appear in grey as you type; press Tab to accept. Uses fill-in-the-middle with a small coder model and can run on a second GPU.
- **Inline AI edits (Ctrl+K):** describe a change to the selected code and review it in a side-by-side diff before accepting.
- **Multi-file edits (Ctrl+I):** describe a change and ocode plans which files to edit, create or delete across the whole project, using search to find every usage. It then writes each file and shows a diff of every change; nothing is saved until you click Apply, and Undo puts it all back. Also available as `/edit` in the chat.
- **AI quick fixes:** linter errors get a "Fix with ocode" action (Ctrl+.), and *Fix All Problems in File* fixes everything at once.
- **Integrated terminal:** a real shell (xterm.js on a pseudo-terminal). Press F5 to run the current file in Python, C, C++, Rust, Go, JavaScript, shell and more.
- **Explorer:** sort by name, type, date or size; git status colors; create, rename, and move to trash; quick open (Ctrl+P); search across files with ripgrep (Ctrl+Shift+F).
- **Six color themes:** ocode Dark and Light, One Dark, Dracula, Tokyo Night, Catppuccin Mocha. Plugins can add more.
- **Slash commands in chat:** `/effort`, `/model`, `/theme`, `/compact`, `/run`, `/fix`, `/explain`, `/edit` and more (`/help` lists them).

### Git

- **Source Control panel (Ctrl+Shift+G):** staged and unstaged changes, with stage, unstage and discard for each file or all at once. Discarded changes are kept in Local History.
- **Commit** with Ctrl+Enter, or *Commit & Push*, *Commit All* or *Amend*. The ✦ button has the AI write the commit message from your diff.
- **Branches, push, pull and sync:** switch or create branches from the panel or the status bar, see how far ahead or behind you are, publish new branches, stash and pop, undo the last commit.
- **Diff tabs:** click any changed file to see it side by side (or inline) and edit the working copy directly.
- **Gutter markers:** green, blue and red bars beside the line numbers show added, changed and deleted lines as you type.
- **Inline blame:** the current line shows who last changed it, when, and the commit message.
- **File history:** every commit that touched a file, with the change it made; restore any version.

### Borrowed from JetBrains and VS Code

- **Search Everywhere** (double-tap Shift): files, symbols and commands in one search.
- **Recent Files** (Ctrl+E) and **recent folders** in the Open Folder picker.
- **Outline panel and Go to Symbol** (Ctrl+Shift+O, or `@` in Ctrl+P): classes, functions and methods for Python, JavaScript/TypeScript, C/C++, Go, Rust, Java/Kotlin/C#, Ruby, PHP, shell, Lua, YAML and Markdown headings. The breadcrumbs above the editor show the symbol you're in.
- **Local History:** ocode keeps earlier versions of your files automatically — always before an AI or chat-agent edit, a restore or a Git discard, and every couple of minutes while you work — so you can compare and restore any of them, even outside Git.
- **Problems panel** (Ctrl+Shift+M): every error and warning in your open files, grouped by file.
- **Run Task** (Ctrl+Shift+B): npm/pnpm/yarn/bun scripts, Makefile targets, Cargo, Go, CMake and pytest are detected automatically; add your own in `.ocode/tasks.json`.
- **Bookmarks** (F11 / Shift+F11) via the bundled bookmarks plugin.

## Requirements

- Linux with Wayland or X11 (built on Arch with Hyprland)
- [Ollama](https://ollama.com) with at least one model
- Python 3.11–3.13, Node.js/npm (only needed during install), git, [ripgrep](https://github.com/BurntSushi/ripgrep), and `gio` (for moving files to the trash)

## Install

```bash
git clone https://github.com/404-not-found129/ocode.git ~/Projects/ocode
cd ~/Projects/ocode
./install.sh
```

The installer:
- creates a Python environment
- downloads the editor libraries
- links `ocode-gui` and `ocode` into `~/.local/bin`
- links the bundled plugins into `~/.config/ocode/plugins`
- adds **ocode** to your app launcher

Then start it from your launcher or run `ocode-gui`.

## Models

Pick the chat model with the model button in the chat box (or in the status bar); ocode lists everything installed in Ollama. Coder models work best:

```bash
ollama pull qwen2.5-coder:14b
```

The **effort** setting (`/effort low|medium|high|max`) controls how thorough the agent is. With "thinking" models such as Qwen3, High and Max also let the model reason before answering; Low and Medium skip it for speed.

### Autocomplete

Autocomplete uses a separate, small *base* coder model, set under *Settings → AI*. Base models are trained for fill-in-the-middle, which is what autocomplete needs. Any Ollama server works; point *Autocomplete server* at it:

```bash
ollama pull qwen2.5-coder:3b-base
```

#### Running autocomplete on a second (AMD) GPU

If you have a second GPU, autocomplete can run there so it never competes with the chat model. `./install.sh --amd` installs a user service that runs a second Ollama on `127.0.0.1:11435` using only an AMD card through Vulkan. Vulkan also works on older cards such as the RX 400/500 series that ROCm no longer supports. On Arch:

```bash
sudo pacman -S ollama-vulkan
./install.sh --amd
OLLAMA_HOST=127.0.0.1:11435 ollama pull qwen2.5-coder:3b-base
```

The service file (`systemd/ollama-amd.service`) selects the card through the RADV driver file `radeon_icd.json`. Adjust that path if your distribution names it differently, for example `radeon_icd.x86_64.json`.

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| Shift Shift | Search Everywhere |
| Ctrl+P / Ctrl+Shift+P | Go to file / command palette |
| Ctrl+E | Recent files |
| Ctrl+Shift+O | Go to symbol in file |
| Ctrl+K | Edit selection with AI (diff review) |
| Ctrl+I | Edit multiple files with AI (review every file) |
| Ctrl+L | Add selection to chat |
| Tab / Alt+\ | Accept / request an autocomplete suggestion |
| Ctrl+. | Quick fixes, including "Fix with ocode" |
| F5 | Run the current file in the terminal |
| Ctrl+S | Save (format on save is optional) |
| Ctrl+Shift+F | Search in folder |
| Ctrl+Shift+G | Source Control |
| Ctrl+Shift+M | Problems |
| Ctrl+Shift+B | Run task |
| F11 / Shift+F11 | Toggle bookmark / list bookmarks |
| Ctrl+B / Ctrl+\` / Ctrl+Alt+B | Toggle sidebar / terminal / chat |
| Ctrl+, | Settings |
| Ctrl+Alt+T | Color theme |

`/help` in the chat lists every shortcut, including those added by plugins.

## Plugins

Plugins are plain JavaScript in `~/.config/ocode/plugins/` — a folder with `index.js` and a `README.md`, or a single `.js` file — loaded at startup. Every bundled plugin has its own README (click a name below, or **Readme** on its card in the Plugins panel). **[The plugin guide](plugins/README.md)** covers writing your own, the full API with examples, and every bundled plugin; it also opens from the **Plugin guide** button in the app's Plugins panel. The bundled ones:

| Plugin | What it does |
| --- | --- |
| [bookmarks](plugins/bookmarks/README.md) | JetBrains-style bookmarks that move with your edits (F11 toggle, Shift+F11 list) |
| [organize-files](plugins/organize-files/README.md) | Sorts a messy folder into subfolders by type, month or extension, with a preview and undo |
| [formatters](plugins/formatters/README.md) | Shift+Alt+F with clang-format, rustfmt, ruff/black, gofmt, shfmt, stylua, prettier and others, whichever are installed |
| [linters](plugins/linters/README.md) | Errors from gcc/g++, Python, bash/shellcheck, luac and rustc on open and save |
| [error-lens](plugins/error-lens/README.md) | Shows error messages at the end of the line |
| [git-tools](plugins/git-tools/README.md) | Quick "stage all and commit" (Ctrl+Alt+C, `/commit`), a log graph, whole-file blame, and open the file on GitHub |
| [todo-tree](plugins/todo-tree/README.md) | Highlights TODO/FIXME and lists them across the folder (Ctrl+Alt+O) |
| [markdown-preview](plugins/markdown-preview/README.md) | Live preview beside the editor (Ctrl+Shift+V) |
| [snippets](plugins/snippets/README.md) | Snippets for common languages; add your own in `~/.config/ocode/snippets.json` |
| [live-server](plugins/live-server/README.md) | Serves a folder over HTTP and opens it in your browser |
| [text-tools](plugins/text-tools/README.md) | Sort, dedupe and reverse lines, change case, sort JSON keys |
| [zen-mode](plugins/zen-mode/README.md) | Hides every panel except the editor (Ctrl+Alt+Z) |
| [word-count](plugins/word-count/README.md) | Word count in the status bar |

A minimal plugin:

```js
// ~/.config/ocode/plugins/hello.js
ocode.registerCommand({
  id: 'hello.say',
  label: 'Hello: Say Hi',
  keys: 'Ctrl+Alt+H',
  run: () => ocode.toast('Hi from a plugin!', 'ok'),
});
```

Plugins can add commands, slash commands, themes, status bar items, explorer and editor menu entries, and side panels. They can also run shell commands and Git, call the AI, and use the full Monaco API. See the [plugin guide](plugins/README.md) for the full reference.

## Command-line agent

`ocode` is a small terminal version of the agent:

```bash
ocode                       # interactive session in the current folder
ocode "add type hints to utils.py"
ocode --model qwen2.5-coder:14b "write a README"
```

## Configuration

Settings live in `~/.config/ocode/settings.json`. Edit them in the Settings panel, or open the file with *Preferences: Open settings.json*.

## Security

- **The AI agent can read and write any file your user can and run any shell command.** Use models you trust, and review what the agent does in the tool blocks in the chat.
- The app's server listens only on `127.0.0.1`, on a random port, and every request needs a random token created at launch. Other websites in your browser can't reach the editor, the files, or the terminal.

## License

[MIT](LICENSE)
