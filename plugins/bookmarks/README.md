# Bookmarks

Mark important lines and jump back to them later, JetBrains style. Bookmarks move with your edits and are remembered between sessions.

## Usage

Put the cursor on a line and press **F11**. A bar in your theme's accent color appears in the margin, and the line is lightly tinted. Press F11 again on the same line to remove it.

Press **Shift+F11** to see every bookmark in every file, with a preview of each line. Pick one to jump straight to it, even if that file is closed.

| Command | Keys |
| --- | --- |
| Bookmarks: Toggle Bookmark | F11 |
| Bookmarks: Show All Bookmarks | Shift+F11 |
| Bookmarks: Next in File | — |
| Bookmarks: Previous in File | — |
| Bookmarks: Clear Bookmarks in File | — |

Next and Previous wrap around at the end and start of the file. Give them shortcuts by editing `index.js` and adding `keys: '…'` to those commands.

## How it works

- Each bookmark is an editor decoration that sticks to its line, so typing above it moves the bookmark down with the code.
- Positions are saved to `bookmarks` in `~/.config/ocode/settings.json` (keyed by file path) shortly after you stop typing, and whenever you add or remove one.
- The plugin turns on the editor's glyph margin (the narrow strip left of the line numbers) so the markers have room.

## Limitations

- If a file is renamed or moved outside ocode, its bookmarks stay under the old path.
- Bookmarks in files changed outside ocode may point at shifted lines, because they can only follow edits made in the editor.
