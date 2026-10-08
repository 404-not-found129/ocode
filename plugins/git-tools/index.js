// Extra Git tools on top of ocode's built-in Source Control panel (Ctrl+Shift+G).
// Quick commit, a log graph, whole-file blame and "open on GitHub".
const q = s => `'${String(s).replace(/'/g, `'\\''`)}'`;

async function inRepo() {
  const st = await ocode.git.status();
  if (!st.repo) ocode.toast('This folder is not a Git repository', 'warn');
  return st.repo;
}

async function quickCommit(message) {
  if (!(await inRepo())) return;
  const msg = message || await ocode.ui.input('Commit message — stages everything and commits');
  if (!msg) return;
  await ocode.git.run(['add', '-A']);
  const r = await ocode.git.run(['commit', '-q', '-m', msg], { quiet: true });
  if (r.code === 0) ocode.toast(`Committed: ${msg}`, 'ok');
  else ocode.toast((r.stderr || r.stdout).trim().split('\n').pop(), 'error', 8000);
}

function webUrl(remote) {
  // git@github.com:user/repo.git or https://github.com/user/repo.git → https://github.com/user/repo
  return remote.trim()
    .replace(/^git@([^:]+):/, 'https://$1/')
    .replace(/^ssh:\/\/git@([^/]+)\//, 'https://$1/')
    .replace(/\.git$/, '');
}

ocode.registerCommand({ id: 'gittools.quickCommit', label: 'Git: Quick Commit All…', keys: 'Ctrl+Alt+C', run: () => quickCommit() });
ocode.registerCommand({ id: 'gittools.logGraph', label: 'Git: Log Graph (terminal)', run: () => ocode.terminal.run('git --no-pager log --oneline --graph --decorate --all -40') });
ocode.registerCommand({ id: 'gittools.diffStat', label: 'Git: Diff Summary (terminal)', run: () => ocode.terminal.run('git --no-pager diff --stat') });
ocode.registerCommand({
  id: 'gittools.blameFile', label: 'Git: Blame Whole File (terminal)',
  run: () => ocode.activeFile ? ocode.terminal.run(`git --no-pager blame --date=relative ${q(ocode.activeFile)}`) : ocode.toast('Open a file first', 'warn'),
});
ocode.registerCommand({
  id: 'gittools.openRemote', label: 'Git: Open Repository on GitHub',
  async run() {
    const r = await ocode.exec('git remote get-url origin');
    if (r.code !== 0) return ocode.toast('This repository has no "origin" remote', 'warn');
    let url = webUrl(r.stdout);
    const file = ocode.activeFile, root = (await ocode.exec('git rev-parse --show-toplevel')).stdout.trim();
    const branch = (await ocode.exec('git rev-parse --abbrev-ref HEAD')).stdout.trim();
    if (file && root && file.startsWith(root + '/') && url.includes('github.com')) {
      const line = ocode.editor.getPosition()?.lineNumber;
      url += `/blob/${encodeURIComponent(branch)}/${file.slice(root.length + 1).split('/').map(encodeURIComponent).join('/')}${line ? `#L${line}` : ''}`;
    }
    ocode.openExternal(url);
  },
});

ocode.registerSlashCommand({
  name: 'commit', args: '<message>', desc: 'Stage everything and commit',
  run: args => args.length ? quickCommit(args.join(' ')) : ocode.chat.system('Usage: <code>/commit your message</code>'),
});
