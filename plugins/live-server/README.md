# Live Server

Serves a folder over a local web server and opens it in your browser, so HTML pages load their scripts, styles and images the way they would on a real site.

## Usage

- Right-click a folder in the Explorer → **Serve This Folder in Browser**
- Right-click an `.html` file → **Open with Live Server** (serves its folder and opens that page)
- Or run **Live Server: Serve Current Folder** from the command palette

While a server is running, the status bar shows **● Live :5500**. Click it, or run **Live Server: Stop**, to stop it.

| Command | Keys |
| --- | --- |
| Live Server: Serve Current Folder | — |
| Live Server: Stop | — |

## Details

- Uses `python3 -m http.server`, which is already on your system, so there's nothing to install.
- Listens on `127.0.0.1` only (not on your network), on the first free port from 5500 to 5599.
- One server at a time: starting another stops the previous one.
- The server is stopped when ocode closes normally.

## Limitations

- No automatic reload: refresh the browser (F5) after saving.
- It's a plain static file server, so there's no server-side code, routing rewrites or HTTPS. For frameworks like Vite or Next.js, use their dev server (Ctrl+Shift+B → `npm: dev`).
