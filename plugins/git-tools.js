// Git shortcuts. Commands run in the integrated terminal so you can see the output.
const q = s => `'${String(s).replace(/'/g, `'\\''`)}'`;
const git = args => ocode.terminal.run(`git ${args}`);

async function inRepo() {
  const r = await ocode.exec('git rev-parse --is-inside-work-tree');
  if (r.code !== 0) ocode.toast('This folder is not a git repository', 'warn');
  return r.code === 0;
}

ocode.registerCommand({
  id: 'git.commitAll', label: 'Git: Commit All…', keys: 'Ctrl+Alt+C',
  async run() {
    if (!(await inRepo())) return;
    const msg = await ocode.ui.input('Commit message');
    if (msg) git(`add -A && git commit -m ${q(msg)}`);
  },
});

ocode.registerCommand({ id: 'git.push', label: 'Git: Push', run: () => git('push') });
ocode.registerCommand({ id: 'git.pull', label: 'Git: Pull', run: () => git('pull') });
ocode.registerCommand({ id: 'git.status', label: 'Git: Status', run: () => git('status') });
ocode.registerCommand({ id: 'git.log', label: 'Git: Log (last 30)', run: () => git('--no-pager log --oneline --graph --decorate -30') });
ocode.registerCommand({ id: 'git.diff', label: 'Git: Diff Summary', run: () => git('--no-pager diff --stat') });
ocode.registerCommand({ id: 'git.init', label: 'Git: Initialize Repository', run: () => git('init') });

ocode.registerCommand({
  id: 'git.switch', label: 'Git: Switch Branch…',
  async run() {
    if (!(await inRepo())) return;
    const r = await ocode.exec("git branch --format='%(refname:short)'");
    const branches = r.stdout.split('\n').filter(Boolean);
    const pick = await ocode.ui.pick('Switch to branch', [...branches, { label: '+ Create new branch…', value: '__new' }]);
    if (pick === '__new') {
      const name = await ocode.ui.input('New branch name');
      if (name) git(`switch -c ${q(name)}`);
    } else if (pick) git(`switch ${q(pick)}`);
  },
});

ocode.registerCommand({
  id: 'git.aiCommitMessage', label: 'Git: Write Commit Message with ocode',
  async run() {
    if (!(await inRepo())) return;
    let diff = (await ocode.exec('git --no-pager diff --staged')).stdout;
    if (!diff.trim()) diff = (await ocode.exec('git --no-pager diff')).stdout;
    if (!diff.trim()) return ocode.toast('No changes to describe', 'warn');
    ocode.toast('ocode is reading your changes…', '', 2500);
    const text = await ocode.ai.ask('Write a git commit message for this diff: one imperative subject line under 65 characters. Reply with the subject line only.\n```diff\n' + diff.slice(0, 12000) + '\n```',
      { system: 'You write concise, specific git commit messages.' });
    const suggested = text.replace(/```\w*|```/g, '').trim().split('\n')[0].replace(/^["'`]|["'`]$/g, '');
    const msg = await ocode.ui.input('Commit message (written by ocode — edit or press Enter)', suggested);
    if (msg) git(`add -A && git commit -m ${q(msg)}`);
  },
});

ocode.registerSlashCommand({
  name: 'commit', args: '<message>', desc: 'git add -A && git commit',
  run: args => args.length ? git(`add -A && git commit -m ${q(args.join(' '))}`) : ocode.chat.system('Usage: <code>/commit your message</code>'),
});
