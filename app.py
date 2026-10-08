#!/usr/bin/env python3
import fcntl, json, os, pty, secrets, select, signal, socket, struct, subprocess, sys, termios, threading, time
import urllib.request
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory, send_file, Response, stream_with_context, abort
from flask_sock import Sock

APP_DIR = Path(__file__).resolve().parent
HOME = str(Path.home())
CONFIG_DIR = Path(os.environ.get('XDG_CONFIG_HOME') or Path.home() / '.config') / 'ocode'
PLUGIN_DIR = CONFIG_DIR / 'plugins'
SETTINGS_FILE = CONFIG_DIR / 'settings.json'
MODEL = "hf.co/mradermacher/Qwen2.5-Coder-32B-Instruct-Uncensored-GGUF:Q4_K_M"
OLLAMA = "http://localhost:11434"
TOKEN = os.environ.get('OCODE_TOKEN') or secrets.token_urlsafe(24)
PORT = 0
CWD = [HOME]
MAX_FILE = 5 * 1024 * 1024

DEFAULT_SETTINGS = {
    "theme": "ocode",
    "fontSize": 14,
    "fontFamily": "'JetBrainsMono Nerd Font', 'JetBrains Mono', 'Fira Code', monospace",
    "fontLigatures": True,
    "tabSize": 4,
    "insertSpaces": True,
    "wordWrap": "off",
    "minimap": True,
    "lineNumbers": "on",
    "renderWhitespace": "selection",
    "cursorBlinking": "smooth",
    "smoothScrolling": True,
    "bracketPairColorization": True,
    "stickyScroll": True,
    "autoSave": True,
    "formatOnSave": False,
    "showHidden": False,
    "sortOrder": "name",
    "foldersFirst": True,
    "aiComplete": True,
    "completeHost": "http://127.0.0.1:11435",
    "completeModel": "qwen2.5-coder:3b-base",
    "completeDelay": 250,
    "terminalFontSize": 13,
    "effort": "medium",
    "model": MODEL,
    "cwd": HOME,
    "recentFiles": [],
    "disabledPlugins": [],
    "layout": {},
}

app = Flask(__name__, static_folder=str(APP_DIR / 'static'), static_url_path='/static')
sock = Sock(app)


# ── Auth: per-launch token, stored in a SameSite=Strict cookie ────────────────
@app.before_request
def require_token():
    if request.cookies.get('ocode_token') == TOKEN:
        return
    if request.path == '/' and request.args.get('token') == TOKEN:
        return
    abort(403)

@app.after_request
def set_token_cookie(resp):
    if request.path == '/' and request.args.get('token') == TOKEN:
        resp.set_cookie('ocode_token', TOKEN, httponly=True, samesite='Strict')
    if request.path.startswith('/api/') or request.path.startswith('/plugins/'):
        resp.headers['Cache-Control'] = 'no-store'
    return resp


# ── Settings ──────────────────────────────────────────────────────────────────
_settings_lock = threading.Lock()

def load_settings():
    data = {}
    try:
        data = json.loads(SETTINGS_FILE.read_text())
    except Exception:
        pass
    return {**DEFAULT_SETTINGS, **data}

def save_settings(patch):
    with _settings_lock:
        s = load_settings()
        s.update(patch)
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        SETTINGS_FILE.write_text(json.dumps(s, indent=2))
        return s

@app.route('/api/settings')
def get_settings():
    return jsonify(load_settings())

@app.route('/api/settings', methods=['POST'])
def post_settings():
    return jsonify(save_settings(request.json or {}))

@app.route('/api/info')
def info():
    return jsonify({'home': HOME, 'configDir': str(CONFIG_DIR), 'pluginDir': str(PLUGIN_DIR),
                    'settingsFile': str(SETTINGS_FILE)})


# ── Plugins ───────────────────────────────────────────────────────────────────
@app.route('/api/plugins')
def list_plugins():
    PLUGIN_DIR.mkdir(parents=True, exist_ok=True)
    disabled = set(load_settings().get('disabledPlugins', []))
    return jsonify([{'name': p.stem, 'file': p.name, 'path': str(p), 'enabled': p.stem not in disabled}
                    for p in sorted(PLUGIN_DIR.glob('*.js'))])

@app.route('/plugins/<path:name>')
def serve_plugin(name):
    return send_from_directory(PLUGIN_DIR, name, mimetype='text/javascript')


# ── Models ────────────────────────────────────────────────────────────────────
@app.route('/api/models')
def get_models():
    try:
        with urllib.request.urlopen(f"{OLLAMA}/api/tags", timeout=5) as r:
            return jsonify([m["name"] for m in json.loads(r.read()).get("models", [])])
    except Exception:
        return jsonify([MODEL])


# ── Files ─────────────────────────────────────────────────────────────────────
def dir_entry(e):
    try:
        st = e.stat()
    except OSError:
        st = None
    is_dir = e.is_dir()
    return {'name': e.name, 'path': str(e), 'is_dir': is_dir,
            'mtime': st.st_mtime if st else 0, 'size': 0 if is_dir or not st else st.st_size}

@app.route('/api/files')
def list_dir():
    path = request.args.get('path', HOME)
    hidden = request.args.get('hidden') == '1'
    try:
        entries = sorted(Path(path).iterdir(), key=lambda x: (not x.is_dir(), x.name.lower()))
        return jsonify([dir_entry(e) for e in entries if hidden or not e.name.startswith('.')])
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/file')
def read_file_ep():
    p = Path(request.args.get('path', ''))
    try:
        if p.stat().st_size > MAX_FILE:
            return jsonify({'error': 'File is larger than 5 MB'}), 400
        raw = p.read_bytes()
        if b'\0' in raw[:8192]:
            return jsonify({'binary': True})
        return jsonify({'content': raw.decode('utf-8', errors='replace')})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/file', methods=['POST'])
def write_file_ep():
    data = request.json
    try:
        p = Path(data['path'])
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(data.get('content', ''))
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/raw')
def raw_file():
    p = Path(request.args.get('path', ''))
    if not p.is_file():
        abort(404)
    return send_file(p)

@app.route('/api/fs', methods=['POST'])
def fs_op():
    d = request.json or {}
    op, p = d.get('op'), Path(d.get('path', ''))
    try:
        if op == 'newfile':
            if p.exists():
                return jsonify({'error': f'{p.name} already exists'}), 400
            p.parent.mkdir(parents=True, exist_ok=True)
            p.touch()
        elif op == 'mkdir':
            p.mkdir(parents=True, exist_ok=False)
        elif op in ('rename', 'move'):
            to = Path(d['to'])
            if to.exists():
                return jsonify({'error': f'{to.name} already exists'}), 400
            to.parent.mkdir(parents=True, exist_ok=True)
            p.rename(to)
        elif op == 'trash':
            r = subprocess.run(['gio', 'trash', str(p)], capture_output=True, text=True)
            if r.returncode:
                return jsonify({'error': r.stderr.strip() or 'gio trash failed'}), 400
        else:
            return jsonify({'error': 'unknown op'}), 400
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

SKIP_DIRS = {'.git', 'node_modules', '.venv', 'venv', '__pycache__', '.cache', 'dist', 'build', 'target'}

@app.route('/api/find-files')
def find_files():
    root = request.args.get('path', CWD[0])
    proc = subprocess.Popen(['rg', '--files', '--max-depth', '14', root], stdout=subprocess.PIPE,
                            stderr=subprocess.DEVNULL, text=True)
    out = []
    try:
        for line in proc.stdout:
            rel = os.path.relpath(line.rstrip('\n'), root)
            if not any(part in SKIP_DIRS for part in rel.split(os.sep)):
                out.append(rel)
            if len(out) >= 20000:
                break
    finally:
        proc.kill()
    return jsonify({'root': root, 'files': out})

@app.route('/api/search')
def search():
    q = request.args.get('q', '')
    root = request.args.get('path', CWD[0])
    if not q:
        return jsonify([])
    cmd = ['rg', '--json', '--max-count', '50', '--max-columns', '400', '--max-filesize', '2M']
    if request.args.get('regex') != '1':
        cmd.append('-F')
    if request.args.get('case') != '1':
        cmd.append('-i')
    cmd += ['--', q, root]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
    results, deadline = [], time.time() + 15
    try:
        for line in proc.stdout:
            ev = json.loads(line)
            if ev.get('type') != 'match':
                continue
            d = ev['data']
            sub = d.get('submatches') or [{}]
            results.append({'path': d['path'].get('text', ''), 'line': d['line_number'],
                            'text': d['lines'].get('text', '').rstrip('\n'),
                            'start': sub[0].get('start', 0), 'end': sub[0].get('end', 0)})
            if len(results) >= 1000 or time.time() > deadline:
                break
    finally:
        proc.kill()
    return jsonify(results)

@app.route('/api/git')
def git_info():
    path = request.args.get('path', CWD[0])
    def git(*args):
        return subprocess.run(['git', '-C', path, *args], capture_output=True, text=True, timeout=5)
    try:
        top = git('rev-parse', '--show-toplevel')
        if top.returncode:
            return jsonify({})
        root = top.stdout.strip()
        branch = git('rev-parse', '--abbrev-ref', 'HEAD').stdout.strip()
        files = {}
        for line in git('status', '--porcelain', '-uall').stdout.splitlines():
            code, rel = line[:2], line[3:].split(' -> ')[-1].strip('"')
            files[os.path.join(root, rel)] = '?' if code == '??' else code.strip()[:1]
        return jsonify({'branch': branch, 'root': root, 'changes': len(files), 'files': files})
    except Exception:
        return jsonify({})


@app.route('/api/exec', methods=['POST'])
def exec_cmd():
    d = request.json or {}
    try:
        r = subprocess.run(d['command'], shell=True, capture_output=True, text=True, input=d.get('input'),
                           timeout=d.get('timeout') or 30, cwd=d.get('cwd') or CWD[0])
        return jsonify({'code': r.returncode, 'stdout': r.stdout, 'stderr': r.stderr})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/open-external', methods=['POST'])
def open_external():
    url = (request.json or {}).get('url', '')
    if not url.startswith(('http://', 'https://')):
        return jsonify({'error': 'only http(s) links'}), 400
    subprocess.Popen(['xdg-open', url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    return jsonify({'success': True})


# ── Streaming AI helpers ──────────────────────────────────────────────────────
def ollama_stream(base, path, payload, pick):
    req = urllib.request.Request(f"{base}{path}", data=json.dumps({**payload, 'stream': True}).encode(),
                                 headers={'Content-Type': 'application/json'})
    resp = urllib.request.urlopen(req, timeout=600)
    try:
        for line in resp:
            if not line.strip():
                continue
            obj = json.loads(line)
            if obj.get('error'):
                raise RuntimeError(obj['error'])
            text = pick(obj)
            if text:
                yield text
            if obj.get('done'):
                break
    finally:
        # Closing the upstream socket makes Ollama cancel generation when the editor aborts.
        resp.close()

def text_stream(gen):
    def run():
        try:
            yield from gen
        except Exception as e:
            yield f"\x00ERROR:{e}"
    return Response(stream_with_context(run()), mimetype='text/plain; charset=utf-8',
                    headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})

def complete_host(s):
    return (s.get('completeHost') or OLLAMA).rstrip('/')

FIM_TEMPLATES = [
    (('qwen', 'codegemma'), '<|fim_prefix|>{p}<|fim_suffix|>{s}<|fim_middle|>'),
    (('deepseek-coder',), '<｜fim▁begin｜>{p}<｜fim▁hole｜>{s}<｜fim▁end｜>'),
    (('starcoder', 'stable-code'), '<fim_prefix>{p}<fim_suffix>{s}<fim_middle>'),
    (('codellama',), '<PRE> {p} <SUF>{s} <MID>'),
]
FIM_STOPS = ['<|endoftext|>', '<|fim_pad|>', '<|file_sep|>', '<|im_end|>', '<|fim_prefix|>', '<|fim_suffix|>',
             '<|fim_middle|>', '<|repo_name|>', '<｜end▁of▁sentence｜>', '<fim_prefix>', '<file_sep>', '<EOT>', '\n\n\n']

@app.route('/api/complete', methods=['POST'])
def complete():
    d = request.json or {}
    s = load_settings()
    model = s.get('completeModel') or MODEL
    prefix, suffix = d.get('prefix', ''), d.get('suffix', '')
    opts = {'num_predict': int(d.get('maxTokens', 128)), 'temperature': 0.15, 'top_p': 0.9,
            'stop': FIM_STOPS + [s for s in d.get('stop', []) if isinstance(s, str) and s]}
    tpl = next((t for keys, t in FIM_TEMPLATES if any(k in model.lower() for k in keys)), None)
    if tpl:
        payload = {'model': model, 'prompt': tpl.format(p=prefix, s=suffix), 'raw': True, 'options': opts, 'keep_alive': '30m'}
    else:
        payload = {'model': model, 'prompt': prefix, 'suffix': suffix, 'options': opts, 'keep_alive': '30m'}
    return text_stream(ollama_stream(complete_host(s), '/api/generate', payload, lambda o: o.get('response', '')))

@app.route('/api/complete-status')
def complete_status():
    s = load_settings()
    host, want = complete_host(s), s.get('completeModel', '')
    try:
        with urllib.request.urlopen(f"{host}/api/tags", timeout=2) as r:
            models = [m['name'] for m in json.loads(r.read()).get('models', [])]
    except Exception as e:
        return jsonify({'online': False, 'host': host, 'model': want, 'error': str(e)})
    has = want in models or f"{want}:latest" in models
    return jsonify({'online': True, 'host': host, 'model': want, 'models': models, 'hasModel': has})

@app.route('/api/complete-pull', methods=['POST'])
def complete_pull():
    s = load_settings()
    def pick(o):
        if o.get('total'):
            return f"{o.get('status', '')} {o.get('completed', 0) * 100 // o['total']}%\n"
        return f"{o.get('status', '')}\n"
    return text_stream(ollama_stream(complete_host(s), '/api/pull', {'model': s.get('completeModel')}, pick))

@app.route('/api/ai', methods=['POST'])
def ai_oneshot():
    d = request.json or {}
    model = d.get('model') or load_settings().get('model') or MODEL
    msgs = d.get('messages') or [{'role': 'user', 'content': d.get('prompt', '')}]
    if d.get('system'):
        msgs = [{'role': 'system', 'content': d['system']}] + msgs
    opts = {'temperature': d.get('temperature', 0.2), 'num_predict': int(d.get('maxTokens') or 2048)}
    payload = {'model': model, 'messages': msgs, 'options': opts}
    return text_stream(ollama_stream(OLLAMA, '/api/chat', payload, lambda o: o.get('message', {}).get('content', '')))


# ── AI agent ──────────────────────────────────────────────────────────────────
TOOLS = [
    {"type": "function", "function": {"name": "read_file", "description": "Read the contents of a file.",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}}},
    {"type": "function", "function": {"name": "write_file", "description": "Create or overwrite a file.",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}, "content": {"type": "string"}},
                       "required": ["path", "content"]}}},
    {"type": "function", "function": {"name": "edit_file",
        "description": "Replace an exact string in a file with new text. Read the file first.",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}, "old_string": {"type": "string"},
                       "new_string": {"type": "string"}}, "required": ["path", "old_string", "new_string"]}}},
    {"type": "function", "function": {"name": "list_files", "description": "List files and folders in a directory.",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": []}}},
    {"type": "function", "function": {"name": "run_command", "description": "Run a shell command and return output.",
        "parameters": {"type": "object", "properties": {"command": {"type": "string"}}, "required": ["command"]}}},
]

def resolve(path):
    p = Path(path).expanduser()
    return p if p.is_absolute() else Path(CWD[0]) / p

def run_tool(name, args):
    try:
        if name in ("write_file", "create_file"):
            p = resolve(args["path"])
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(args.get("content", ""))
            return f"Written: {p}"
        if name == "read_file":
            p = resolve(args["path"])
            return p.read_text(errors="replace") if p.exists() else f"Error: {p} not found"
        if name == "edit_file":
            p = resolve(args["path"])
            if not p.exists():
                return f"Error: {p} not found"
            orig = p.read_text(errors="replace")
            old = args.get("old_string", "")
            if old not in orig:
                return "Error: old_string not found"
            p.write_text(orig.replace(old, args.get("new_string", ""), 1))
            return f"Edited: {p}"
        if name == "list_files":
            p = resolve(args.get("path") or CWD[0])
            entries = sorted(p.iterdir(), key=lambda x: (x.is_file(), x.name))
            return "\n".join(("/" if e.is_dir() else " ") + e.name for e in entries)
        if name == "run_command":
            r = subprocess.run(args["command"], shell=True, capture_output=True, text=True, timeout=60, cwd=CWD[0])
            return (r.stdout + r.stderr)[:6000] or "(no output)"
    except Exception as e:
        return f"Error: {e}"
    return f"Unknown tool: {name}"

def extract_tool_calls(content):
    calls, decoder, i = [], json.JSONDecoder(), 0
    while i < len(content):
        if content[i] == '{':
            try:
                obj, end = decoder.raw_decode(content, i)
                if isinstance(obj, dict) and "name" in obj and "arguments" in obj:
                    calls.append({"function": {"name": obj["name"], "arguments": obj["arguments"]}})
                i = end
                continue
            except Exception:
                pass
        i += 1
    return calls

@app.route('/api/cwd', methods=['POST'])
def set_cwd():
    CWD[0] = (request.json or {}).get('cwd') or HOME
    return jsonify({'success': True})

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    model = data.get('model', MODEL)
    CWD[0] = data.get('cwd', HOME)
    full_messages = [{"role": "system", "content": data.get('system', '')}] + list(data.get('messages', []))

    def event(**kw):
        return f"data: {json.dumps(kw)}\n\n"

    def generate():
        for _ in range(25):
            payload = json.dumps({"model": model, "messages": full_messages, "tools": TOOLS, "stream": False}).encode()
            req = urllib.request.Request(f"{OLLAMA}/api/chat", data=payload, headers={"Content-Type": "application/json"})
            try:
                with urllib.request.urlopen(req, timeout=600) as resp:
                    msg = json.loads(resp.read()).get("message", {})
            except Exception as e:
                yield event(type='error', content=str(e))
                return
            tool_calls = msg.get("tool_calls") or []
            content = msg.get("content", "")
            if not tool_calls and content:
                tool_calls = extract_tool_calls(content)
                if tool_calls:
                    content = ""
            if not tool_calls:
                yield event(type='message', content=content)
                yield event(type='done')
                return
            full_messages.append({"role": "assistant", "content": content, "tool_calls": tool_calls})
            for tc in tool_calls:
                fn = tc.get("function", {})
                args = fn.get("arguments", {})
                if isinstance(args, str):
                    try:
                        args = json.loads(args)
                    except Exception:
                        args = {}
                yield event(type='tool_call', name=fn.get("name", ""), args=args)
                result = run_tool(fn.get("name", ""), args)
                yield event(type='tool_result', result=result)
                full_messages.append({"role": "tool", "content": result})
        yield event(type='error', content='Stopped after 25 tool rounds')

    return Response(stream_with_context(generate()), mimetype='text/event-stream',
                    headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})


# ── Terminal ──────────────────────────────────────────────────────────────────
# A fresh interpreter makes the pty its controlling tty; doing this in a forked
# copy of this multithreaded process is not safe.
TTY_SHIM = "import fcntl,os,sys,termios; fcntl.ioctl(0, termios.TIOCSCTTY, 0); os.execvp(sys.argv[1], sys.argv[1:])"

@sock.route('/ws/terminal')
def terminal_ws(ws):
    origin = request.headers.get('Origin')
    if origin not in (None, f'http://127.0.0.1:{PORT}', f'http://localhost:{PORT}'):
        return
    cwd = request.args.get('cwd') or HOME
    if not os.path.isdir(cwd):
        cwd = HOME
    shell = os.environ.get('SHELL', '/bin/bash')
    master, slave = pty.openpty()
    env = {**os.environ, 'TERM': 'xterm-256color', 'COLORTERM': 'truecolor', 'TERM_PROGRAM': 'ocode'}
    proc = subprocess.Popen([sys.executable, '-c', TTY_SHIM, shell, '-l'], stdin=slave, stdout=slave, stderr=slave,
                            cwd=cwd, env=env, start_new_session=True, close_fds=True)
    os.close(slave)
    alive = [True]

    def pump():
        while alive[0]:
            try:
                r, _, _ = select.select([master], [], [], 0.1)
                if r:
                    data = os.read(master, 65536)
                    if not data:
                        break
                    ws.send(data.decode('utf-8', errors='replace'))
            except OSError:
                break
        alive[0] = False
        try:
            ws.close()
        except Exception:
            pass

    threading.Thread(target=pump, daemon=True).start()
    try:
        while alive[0]:
            raw = ws.receive(timeout=1)
            if raw is None:
                continue
            msg = json.loads(raw)
            if msg.get('type') == 'input':
                os.write(master, msg['data'].encode())
            elif msg.get('type') == 'resize':
                fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack('HHHH', msg['rows'], msg['cols'], 0, 0))
    except Exception:
        pass
    finally:
        alive[0] = False
        try:
            os.killpg(proc.pid, signal.SIGHUP)
        except Exception:
            pass
        try:
            os.close(master)
        except Exception:
            pass


@app.route('/')
def index():
    return send_from_directory(APP_DIR / 'static', 'index.html')


# ── Startup ───────────────────────────────────────────────────────────────────
def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def serve():
    import logging
    logging.getLogger('werkzeug').setLevel(logging.ERROR)
    app.run(host='127.0.0.1', port=PORT, debug=False, threaded=True, use_reloader=False)

def wait_for_port():
    for _ in range(100):
        try:
            with socket.create_connection(('127.0.0.1', PORT), timeout=0.2):
                return
        except OSError:
            time.sleep(0.05)

if __name__ == '__main__':
    PORT = int(os.environ.get('OCODE_PORT') or free_port())
    threading.Thread(target=serve, daemon=True).start()
    wait_for_port()
    url = f'http://127.0.0.1:{PORT}/?token={TOKEN}'

    if '--server' in sys.argv:
        print(url, flush=True)
        threading.Event().wait()

    os.environ.setdefault('QT_QPA_PLATFORM', 'wayland;xcb')
    from PyQt6.QtWidgets import QApplication, QMainWindow
    from PyQt6.QtWebEngineWidgets import QWebEngineView
    from PyQt6.QtWebEngineCore import QWebEngineSettings
    from PyQt6.QtCore import QUrl
    from PyQt6.QtGui import QColor, QIcon

    qt_app = QApplication(sys.argv)
    qt_app.setApplicationName('ocode')
    qt_app.setDesktopFileName('ocode-gui')
    qt_app.setWindowIcon(QIcon(str(APP_DIR / 'icon.png')))

    win = QMainWindow()
    win.setWindowTitle('ocode')
    win.resize(1500, 950)
    win.setMinimumSize(900, 600)

    view = QWebEngineView()
    s = view.settings()
    for attr in ('JavascriptCanAccessClipboard', 'JavascriptCanPaste', 'LocalStorageEnabled'):
        s.setAttribute(getattr(QWebEngineSettings.WebAttribute, attr), True)
    view.page().setBackgroundColor(QColor('#0d0d0f'))
    view.page().titleChanged.connect(lambda t: win.setWindowTitle(t or 'ocode'))
    view.load(QUrl(url))
    win.setCentralWidget(view)
    win.show()
    sys.exit(qt_app.exec())
