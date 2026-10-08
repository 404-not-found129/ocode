# Text Tools

Sort, de-duplicate, reverse and shuffle lines, change the case of words, and sort JSON keys — on the selected lines, or the whole file if nothing is selected.

## Usage

Open the command palette (Ctrl+Shift+P) and type **"Text:"**. *Sort Lines A → Z* is also in the editor's right-click menu.

### Line tools

Work on every line touched by the selection; with no selection, on the whole file.

| Command | What it does |
| --- | --- |
| Text: Sort Lines A → Z | Natural sort, ignoring case, so `file2` comes before `file10` |
| Text: Sort Lines Z → A | The same, reversed |
| Text: Sort Lines by Length | Shortest first |
| Text: Remove Duplicate Lines | Keeps the first copy of each line |
| Text: Reverse Lines | Last line first |
| Text: Shuffle Lines | Random order |
| Text: Remove Blank Lines | Deletes empty and whitespace-only lines |
| Text: Trim Trailing Whitespace | Removes spaces at line ends |

### Case tools

Work on the selected text (several selections at once are fine).

| Command | `myVariable name` becomes |
| --- | --- |
| Text: Convert to UPPERCASE | `MYVARIABLE NAME` |
| Text: Convert to lowercase | `myvariable name` |
| Text: Convert to Title Case | `Myvariable Name` |
| Text: Convert to snake_case | `my_variable_name` |
| Text: Convert to camelCase | `myVariableName` |
| Text: Convert to kebab-case | `my-variable-name` |

### JSON

**Text: Sort JSON Keys (whole file)** sorts every object's keys alphabetically, at every level, and re-indents the file with its tab size. Arrays keep their order.

## Notes

Every change is a single edit, so **Ctrl+Z** undoes it in one step. To give a tool a shortcut, add `keys: '…'` to its command in [`index.js`](index.js).
