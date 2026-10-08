// Sorts a messy folder (Downloads, Desktop…) into subfolders by type, month or extension.
// Always shows what will happen first, only touches top-level files, and can be undone.
const CATEGORIES = {
  Images: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'heic', 'avif', 'ico', 'tif', 'tiff', 'psd', 'xcf', 'kra'],
  Videos: ['mp4', 'mkv', 'webm', 'mov', 'avi', 'm4v', 'flv', 'wmv'],
  Audio: ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'opus', 'aac', 'mid'],
  Documents: ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'epub', 'xls', 'xlsx', 'ods', 'csv', 'ppt', 'pptx', 'odp'],
  Archives: ['zip', 'tar', 'gz', 'tgz', 'xz', 'bz2', '7z', 'rar', 'zst'],
  Code: ['py', 'js', 'ts', 'jsx', 'tsx', 'c', 'cpp', 'h', 'hpp', 'rs', 'go', 'java', 'kt', 'rb', 'php', 'lua', 'sh', 'html', 'css', 'json', 'yaml', 'yml', 'toml', 'sql', 'ipynb'],
  Installers: ['deb', 'rpm', 'appimage', 'pkg', 'exe', 'msi', 'dmg', 'iso', 'flatpakref', 'run'],
  Fonts: ['ttf', 'otf', 'woff', 'woff2'],
  Models: ['gguf', 'safetensors', 'ckpt', 'pt', 'onnx', 'bin'],
};
const extOf = n => { const i = n.lastIndexOf('.'); return i > 0 ? n.slice(i + 1).toLowerCase() : ''; };
const MODES = {
  type: ['By type — Images, Videos, Documents, …', f => Object.entries(CATEGORIES).find(([, exts]) => exts.includes(extOf(f.name)))?.[0] || 'Other'],
  month: ['By month modified — 2026-10, 2026-09, …', f => { const d = new Date(f.mtime * 1000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }],
  ext: ['By extension — PDF, PNG, ZIP, …', f => (extOf(f.name) || 'no extension').toUpperCase()],
};
const q = s => `'${String(s).replace(/'/g, `'\\''`)}'`;
const base = p => p.split('/').pop();

async function organize(dir = ocode.cwd) {
  const mode = await ocode.ui.pick(`Organize ${base(dir)} — how should files be grouped?`, Object.entries(MODES).map(([k, [label]]) => ({ label, value: k })));
  if (!mode) return;
  const entries = await ocode.files.list(dir);
  const names = new Set(entries.map(e => e.name));
  const files = entries.filter(e => !e.is_dir && !e.name.startsWith('.'));
  if (!files.length) return ocode.toast('There are no loose files to organize here', 'warn');
  const plan = files.map(f => ({ from: f.path, name: f.name, folder: MODES[mode][1](f) }))
    .filter(p => !names.has(p.folder) || entries.find(e => e.name === p.folder)?.is_dir);
  const counts = {};
  for (const p of plan) counts[p.folder] = (counts[p.folder] || 0) + 1;
  const summary = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · ');
  if (!await ocode.ui.confirm(`Move ${plan.length} files → ${summary}`, `Move ${plan.length} files`)) return;

  const moves = [];
  let failed = 0;
  for (const p of plan) {
    const dot = p.name.lastIndexOf('.');
    for (let i = 0; i < 100; i++) {
      const name = i === 0 ? p.name : dot > 0 ? `${p.name.slice(0, dot)} (${i})${p.name.slice(dot)}` : `${p.name} (${i})`;
      const to = `${dir}/${p.folder}/${name}`;
      try { await ocode.files.move(p.from, to); moves.push({ from: p.from, to }); break; }
      catch (e) { if (!/already exists/.test(e.message)) { failed++; console.warn('[organize]', p.from, e); break; } }
    }
  }
  ocode.settings.set('organizeLastRun', { dir, moves, at: Date.now() });
  ocode.refreshExplorer();
  ocode.toast(`Moved ${moves.length} files into ${Object.keys(counts).length} folders${failed ? ` (${failed} skipped)` : ''} — "Organize: Undo" puts them back`, failed ? 'warn' : 'ok', 6000);
}

async function undo() {
  const last = ocode.settings.get('organizeLastRun');
  if (!last?.moves?.length) return ocode.toast('Nothing to undo', 'warn');
  if (!await ocode.ui.confirm(`Move ${last.moves.length} files back to ${base(last.dir)}?`, 'Undo organize')) return;
  let back = 0;
  for (const m of [...last.moves].reverse()) { try { await ocode.files.move(m.to, m.from); back++; } catch (e) { console.warn('[organize undo]', e); } }
  const folders = [...new Set(last.moves.map(m => m.to.slice(0, m.to.lastIndexOf('/'))))];
  await ocode.exec(`rmdir ${folders.map(q).join(' ')} 2>/dev/null; true`);
  ocode.settings.set('organizeLastRun', null);
  ocode.refreshExplorer();
  ocode.toast(`Moved ${back} files back`, 'ok');
}

ocode.registerCommand({ id: 'organize.folder', label: 'Organize: Sort Files in Current Folder into Subfolders…', run: () => organize() });
ocode.registerCommand({ id: 'organize.downloads', label: 'Organize: Sort My Downloads Folder…', run: () => organize(`${ocode.home}/Downloads`) });
ocode.registerCommand({ id: 'organize.undo', label: 'Organize: Undo Last Organize', run: undo });
ocode.registerExplorerAction({ label: 'Organize Files in This Folder…', when: e => e.is_dir, run: e => organize(e.path) });
ocode.registerSlashCommand({ name: 'organize', args: '[folder]', desc: 'Sort loose files into subfolders', run: a => organize(a.length ? a.join(' ').replace(/^~/, ocode.home) : ocode.cwd) });
