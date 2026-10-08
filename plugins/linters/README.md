# Linters

Checks your code with real compilers and linters whenever you open or save a file, and underlines the errors and warnings they find.

## Usage

Just open or save a file. Problems show up as squiggles, in the status bar count, in the **Problems** panel (Ctrl+Shift+M) and, with the [Error Lens](../error-lens/README.md) plugin, at the end of the line.

Put the cursor on a squiggle and press **Ctrl+.** → **Fix with ocode** to have the AI fix it, with a diff to review first.

| Command | Keys |
| --- | --- |
| Lint: Check Current File | — |

Auto-save saves a second after you stop typing, so files are re-checked as you work.

## What's checked

| Language | Tool | Notes |
| --- | --- | --- |
| Python | Python's own parser, then ruff if installed | Syntax errors always; ruff adds style and bug checks such as undefined names and unused imports |
| C | `gcc -fsyntax-only -Wall -Wextra` | Errors and warnings, without building anything |
| C++ | `g++ -std=c++20 -fsyntax-only -Wall -Wextra` | |
| Shell | shellcheck if installed, otherwise `bash -n` | `bash -n` only finds syntax errors |
| Lua | `luac -p` | Syntax errors |
| Rust | `rustc --emit=metadata` | Single-file programs; for Cargo projects use `cargo check` (Ctrl+Shift+B) |

JavaScript, TypeScript, JSON, CSS and HTML are already checked by the editor itself.

Optional extras (Arch): `sudo pacman -S ruff shellcheck`. Reload the window after installing them.

## Notes

- Linters read the saved file, so results match the last save.
- C and C++ files are checked on their own. Errors about missing headers or include paths usually mean the project needs flags (`-I…`) that a single-file check doesn't know about.
- Messages are tagged with the source `lint` in the Problems panel.
