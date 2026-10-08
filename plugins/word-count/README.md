# Word Count

Shows how many words are in the open file, or in your selection, in the status bar.

## Usage

Nothing to do: open any text file and look at the right side of the status bar ("1,284 words"). Select some text and it counts just the selection.

## Details

- A word is any run of non-space characters, so `don't` and `x+1` each count as one.
- The count updates a moment after you stop typing or change the selection.
- It's hidden when no file is open.

This is also a good first plugin to read if you want to write your own: it's about 25 lines and uses a status bar item and editor events.
