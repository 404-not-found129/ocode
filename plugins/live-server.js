// Serves a folder over http://127.0.0.1 and opens it in your browser (uses python3 -m http.server).
const q = s => `'${String(s).replace(/'/g, `'\\''`)}'`;
let server = null;
const item = ocode.addStatusItem({ align: 'right', tooltip: 'Live server running — click to stop', onClick: () => stop() });
item.show(false);

async function start(dir = ocode.cwd, page = '') {
  await stop(true);
  let port = 5500;
  for (; port < 5600; port++) {
    const r = await ocode.exec(`python3 -c 'import socket; socket.socket().bind(("127.0.0.1", ${port}))'`);
    if (r.code === 0) break;
  }
  const r = await ocode.exec(`nohup python3 -m http.server ${port} --bind 127.0.0.1 --directory ${q(dir)} >/dev/null 2>&1 & echo $!`);
  const pid = parseInt(r.stdout, 10);
  if (!pid) return ocode.toast('Could not start the server', 'error');
  server = { pid, port, dir };
  item.set(`● Live :${port}`);
  item.show(true);
  await new Promise(res => setTimeout(res, 500));
  ocode.openExternal(`http://127.0.0.1:${port}/${page}`);
  ocode.toast(`Serving ${dir.split('/').pop()} at http://127.0.0.1:${port}`, 'ok');
}

async function stop(quiet) {
  if (!server) return;
  await ocode.exec(`kill ${server.pid} 2>/dev/null; true`);
  server = null;
  item.show(false);
  if (!quiet) ocode.toast('Live server stopped', 'ok');
}

ocode.registerCommand({ id: 'live.start', label: 'Live Server: Serve Current Folder', run: () => start() });
ocode.registerCommand({ id: 'live.stop', label: 'Live Server: Stop', run: () => stop() });
ocode.registerExplorerAction({ label: 'Serve This Folder in Browser', when: e => e.is_dir, run: e => start(e.path) });
ocode.registerExplorerAction({ label: 'Open with Live Server', when: e => /\.html?$/i.test(e.name), run: e => {
  const dir = e.path.slice(0, e.path.lastIndexOf('/'));
  return start(dir, encodeURIComponent(e.name));
} });
window.addEventListener('beforeunload', () => { if (server) ocode.exec(`kill ${server.pid}`); });
