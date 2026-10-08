# TODO Tree

Highlights TODO, FIXME, HACK, BUG and XXX comments in your code and lists every one across the whole project, so nothing gets forgotten.

## Usage

- **In the editor:** the keywords are highlighted as you type: yellow for TODO, HACK and XXX; red for FIXME and BUG.
- **Status bar:** shows **☐ 3** when the open file has three of them. Click it to see the whole project's list.
- **Everywhere:** press **Ctrl+Alt+O**, or type **`/todos`** in the chat, to list all of them with their file and line. Pick one to jump there.

| Command | Keys |
| --- | --- |
| TODO: Show All TODOs in Folder | Ctrl+Alt+O |

## Details

- Keywords must be whole words in capitals: `TODO` matches, `todo` and `TODOS` don't.
- Text after the keyword (`TODO: handle timeouts`) is used as the list entry.
- The project search uses ripgrep, so it respects `.gitignore` and skips hidden folders. It shows up to 500 results.

## Customizing

The keywords are in two places in [`index.js`](index.js): the `KW` pattern, and the search patterns in `highlight()` and `listAll()`. Add a word such as `NOTE` to each and reload the window.
