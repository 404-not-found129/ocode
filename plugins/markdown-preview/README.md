# Markdown Preview

A live preview of the Markdown file you're editing, beside the editor, that updates as you type and scrolls along with you.

## Usage

Open a `.md` file and press **Ctrl+Shift+V** (or right-click → **Markdown: Toggle Preview**). Press it again, or click × on the panel, to close it.

| Command | Keys |
| --- | --- |
| Markdown: Toggle Preview | Ctrl+Shift+V |

## What it supports

- GitHub-flavored Markdown: headings, tables, task lists (`- [ ]`), fenced code, block quotes and links
- **Code blocks** highlighted with the same colors as the editor (`` ```python ``, `` ```js `` …)
- **Images** with relative paths, such as `![diagram](images/arch.png)`, loaded from your project
- **Links:** web links open in your browser; links to other files open them in ocode
- **Scroll sync:** the preview follows the editor's scroll position

The preview follows your color theme, and the preview stays tied to the file it was opened for: switching tabs doesn't change it, and it closes when that file's tab closes.

## Notes

The HTML is sanitized before display, so `<script>` tags and inline event handlers in a Markdown file don't run.
