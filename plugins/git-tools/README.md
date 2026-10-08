# Git Tools

Extra Git shortcuts on top of ocode's built-in Source Control panel: one-step "stage everything and commit", a log graph, whole-file blame, and opening the current file on GitHub.

## Usage

| Command | Keys | What it does |
| --- | --- | --- |
| Git: Quick Commit All… | Ctrl+Alt+C | Asks for a message, stages every change and commits |
| Git: Log Graph (terminal) | — | Last 40 commits on all branches as a graph |
| Git: Diff Summary (terminal) | — | Which files changed and by how much (`git diff --stat`) |
| Git: Blame Whole File (terminal) | — | Who last changed every line of the open file |
| Git: Open Repository on GitHub | — | Opens the open file, at the cursor's line, on GitHub |

In the chat, **`/commit your message`** stages everything and commits in one go.

## Notes

- **Commit name and email.** Commits use your Git identity. If Git doesn't have one, set **Commit author name** and **Commit author email** in Settings → Git (the built-in Commit button also asks the first time).
- **Open on GitHub** works with both `https://` and `git@github.com:` remotes named `origin`. For other hosts it opens the repository's home page.
- The terminal commands use `--no-pager`, so their output prints straight into the terminal.

## Where's everything else?

Committing with review, staging single files, branches, push/pull/sync, diffs, gutter markers, inline blame and file history are built into ocode. Open **Source Control** with Ctrl+Shift+G, or search for "Git:" in the command palette.
