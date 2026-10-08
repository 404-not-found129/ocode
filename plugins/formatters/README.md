# Formatters

Formats your code with the real formatter for each language — clang-format, rustfmt, ruff or black, gofmt, shfmt, stylua, xmllint or prettier — whichever are installed.

## Usage

Press **Shift+Alt+F** (or right-click → *Format Document*). To format every time you press Ctrl+S, turn on **Format on Ctrl+S** in Settings.

| Command | Keys |
| --- | --- |
| Format Document (built into the editor) | Shift+Alt+F |
| Formatters: Show Installed Formatters | — |

*Show Installed Formatters* lists each tool in the chat with ✓ or ✗, so you can see what's missing.

## Supported tools

| Language | Formatter | Install on Arch |
| --- | --- | --- |
| C, C++ | clang-format | `sudo pacman -S clang` |
| Rust | rustfmt | `sudo pacman -S rust` |
| Python | ruff, or black if ruff isn't installed | `sudo pacman -S ruff` |
| Go | gofmt | `sudo pacman -S go` |
| Shell | shfmt (2-space indent) | `sudo pacman -S shfmt` |
| Lua | stylua | `sudo pacman -S stylua` |
| XML | xmllint | `sudo pacman -S libxml2` |
| JavaScript, TypeScript, CSS, SCSS, Less, HTML, Markdown, YAML, JSON, GraphQL, Vue | prettier | `npm install -g prettier` |

JavaScript, TypeScript, JSON, CSS and HTML already format with the editor's built-in formatter, so prettier is optional for those.

Tools are detected once at startup; reload the window after installing one. For Python, Go, shell and Lua, if no formatter is installed, Shift+Alt+F tells you which one to install.

## Configuration

Each tool runs in the file's own folder, so your project settings apply: `.clang-format`, `rustfmt.toml`, `pyproject.toml` (ruff/black), `.prettierrc`, `.editorconfig` and so on.

## How it works

The plugin registers a formatting provider for each language. Your unsaved text is piped to the tool's standard input, and its output replaces the document as one undoable edit (Ctrl+Z restores the original). If the tool reports an error, it's shown as a notification and nothing changes.
