# Error Lens

Shows each error or warning right at the end of its line and tints the line, so you see problems without hovering over squiggles.

## Usage

Nothing to set up. Whenever a line has an error or warning, the message appears in italics after the code:

```
    printf("%d\n", missing);    ✖ 'missing' undeclared (first use in this function)
```

Errors are red with ✖, warnings yellow with ⚠, and the whole line gets a faint matching background.

| Command | Keys |
| --- | --- |
| Error Lens: Toggle Inline Errors | — |

The toggle is remembered (`errorLens` in settings).

## Where the problems come from

Error Lens shows whatever the editor knows about:

- the **[linters](../linters/README.md)** plugin: gcc, g++, Python, shellcheck/bash, luac and rustc
- Monaco's built-in checks for JavaScript, TypeScript, JSON, CSS and HTML
- any other plugin that adds editor markers

Every problem is also listed in the **Problems** panel (Ctrl+Shift+M). Put the cursor on one and press **Ctrl+.** for *Fix with ocode*.

## Details

- Only errors and warnings are shown (not hints or info), one per line: the most severe one.
- Messages are cut to their first line and 160 characters; hover the squiggle for the full text.
