// Zen mode: hides the sidebar, terminal and chat so it's just you and the code. Ctrl+Alt+Z toggles.
let saved = null;
ocode.registerCommand({
  id: 'zen.toggle', label: 'View: Toggle Zen Mode', keys: 'Ctrl+Alt+Z', global: true,
  run() {
    if (saved) {
      for (const [panel, shown] of Object.entries(saved)) ocode.layout.set(panel, shown, false);
      saved = null;
      ocode.toast('Zen mode off', 'ok', 1200);
    } else {
      saved = { sidebar: ocode.layout.get('sidebar'), term: ocode.layout.get('term'), chat: ocode.layout.get('chat') };
      for (const panel of Object.keys(saved)) ocode.layout.set(panel, false, false);
      ocode.editor.focus();
      ocode.toast('Zen mode — Ctrl+Alt+Z to exit', 'ok', 1800);
    }
  },
});
