"""
Windows-compatible atom server.
- PyQt5 + VisPy run on the MAIN thread (required on Windows)
- Flask runs in a background daemon thread
- A QTimer captures frames into a shared JPEG buffer
- Mouse/wheel events forwarded from browser → /api/camera → Qt camera

Run:  python atom_server.py
Deps: pip install flask flask-cors vispy PyQt5 PyOpenGL Pillow numpy
"""

import sys, os, io, threading, json, time, random
from math import cos, sin, pi
import numpy as np

import vispy
vispy.use('pyqt5')

from PyQt5 import QtWidgets, QtCore
from vispy import scene as vscene
from vispy.visuals import transforms

from flask import Flask, Response, jsonify, request
from flask_cors import CORS

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# ── Shared frame buffer ────────────────────────────────────────────────────
frame_buf: bytes = b''
frame_lock = threading.Lock()

# ── Load element info JSON ─────────────────────────────────────────────────
_json_candidates = [
    os.path.join(os.path.dirname(__file__), 'src', 'imports', 'elements.json'),
    os.path.join(os.path.dirname(__file__), 'elements.json'),
]
ELEMENT_INFO: dict = {}
for _p in _json_candidates:
    if os.path.exists(_p):
        try:
            with open(_p, 'r', encoding='utf-8') as f:
                ELEMENT_INFO = json.load(f)
            break
        except Exception as e:
            print('Warning: could not load elements.json:', e)

ELEMENT_NAMES = {int(k): v['name'] for k, v in ELEMENT_INFO.items() if 'name' in v}

# ── Scene setup — higher resolution canvas ────────────────────────────────
qt_app = QtWidgets.QApplication(sys.argv)

CANVAS_W, CANVAS_H = 480, 360  # Potato PC optimization: Low res, high speed

canvas = vscene.SceneCanvas(keys='interactive', size=(CANVAS_W, CANVAS_H),
                             show=False, bgcolor='#0d1117')
view = canvas.central_widget.add_view()
view.camera = vscene.TurntableCamera(up='z', fov=55, distance=8)
view.camera.center = (0, 0, 0)
view.camera.autoroll = False
view.camera.elevation = 20

# ── Atom state ─────────────────────────────────────────────────────────────
protons:   list = []
neutrons:  list = []
electrons: list = []
e_params:  list = []
is_black_hole = False
bh_visual = None
state_lock = threading.Lock()

# ── Camera interaction state ───────────────────────────────────────────────
_auto_rotate = True   # disabled the moment user drags

# ── Orbital math ───────────────────────────────────────────────────────────

def rand_unit():
    phi = random.uniform(0, 2*pi)
    ct  = random.uniform(-1, 1)
    st  = (1 - ct*ct)**0.5
    return [st*cos(phi), st*sin(phi), ct]

def rand_nuc_pos(scale=0.18):
    return np.random.normal(scale=scale, size=3)

def s_orbital(a, r, n):
    nv = np.array(n, dtype=float); nv /= np.linalg.norm(nv) or 1
    ref = [0,0,1] if abs(nv[2]) < 0.99 else [0,1,0]
    v = np.cross(nv, ref); v /= np.linalg.norm(v)
    w = np.cross(nv, v)
    return r*(cos(a)*v + sin(a)*w)

def p_orbital(a, r, axis):
    b = r*0.7; off = np.array([r*0.3]*3)
    if axis=='x':   x,y,z,av = r*cos(a), b*sin(a), b*sin(2*a), np.array([1.,0,0])
    elif axis=='y': x,y,z,av = b*sin(a), r*cos(a), b*sin(2*a), np.array([0.,1,0])
    else:           x,y,z,av = b*sin(a), b*sin(2*a), r*cos(a), np.array([0.,0,1])
    av /= np.linalg.norm(av)
    return np.array([x,y,z]) + off + av*(r*0.25)

def d_orbital(a, r, tid):
    if   tid==0: x,y,z,av = r*cos(a)*sin(a), r*sin(a)**2, 0, [0,0,1]
    elif tid==1: x,y,z,av = r*(cos(a)**2-sin(a)**2), 2*r*sin(a)*cos(a), 0, [0,0,1]
    elif tid==2: x,y,z,av = r*cos(a), r*sin(a), r*cos(2*a)/2, [1,1,1]
    elif tid==3: x,y,z,av = r*cos(a), 0, r*sin(a), [0,1,0]
    else:        x,y,z,av = 0, r*cos(a), r*sin(a), [1,0,0]
    av = np.array(av, dtype=float); av /= np.linalg.norm(av)
    return np.array([x,y,z]) + av*(r*0.18)

def f_orbital(a, r, tid):
    if tid==0: x,y,z,av = r*sin(3*a)*cos(a), r*sin(3*a)*sin(a), r*cos(3*a), [1,1,1]
    else:      x,y,z,av = r*cos(3*a)*cos(a), r*cos(3*a)*sin(a), r*sin(3*a), [1,0,1]
    av = np.array(av, dtype=float); av /= np.linalg.norm(av)
    return np.array([x,y,z]) + av*(r*0.12)

BASE_R = {'s':1.5,'p':2.2,'d':2.7,'f':3.2}

def assign_orbital(idx):
    if idx==0:   return ('s', random.uniform(0,2*pi), rand_unit())
    if idx<6:    return ('p', random.uniform(0,2*pi), ['x','x','y','y','z'][idx-1])
    if idx<16:   return ('d', random.uniform(0,2*pi), (idx-6)//2)
    if idx<30:   return ('f', random.uniform(0,2*pi), (idx-16)%2)
    ot = random.choice(['p','d','f'])
    a  = random.uniform(0,2*pi)
    if ot=='p': return ('p', a, random.choice(['x','y','z']))
    if ot=='d': return ('d', a, random.randint(0,4))
    return ('f', a, random.randint(0,1))

def nuc_center():
    pts = [np.array(v.transform.translate)[:3] for v in protons+neutrons]
    return np.mean(pts, axis=0) if pts else np.zeros(3)

def nuc_radius():
    pts = [np.array(v.transform.translate)[:3] for v in protons+neutrons]
    return (max(np.linalg.norm(p) for p in pts) + 0.12) if pts else 0.2

def e_pos(params, nr):
    ot, a, ori = params
    r = BASE_R.get(ot, 1.5) + nr + 0.3
    com = nuc_center()
    if ot=='s':   p = s_orbital(a, r, ori)
    elif ot=='p': p = p_orbital(a, r, ori)
    elif ot=='d': p = d_orbital(a, r, ori)
    else:         p = f_orbital(a, r, ori)
    return p + com

def atom_name():
    if is_black_hole: return "BLACK HOLE"
    p,n,e = len(protons),len(neutrons),len(electrons)
    if p==0 and n==0 and e==0: return "Empty"
    if abs(n-p)>=150: return "BLACK HOLE"
    base = ELEMENT_NAMES.get(p, f"Element Z={p}")
    if p<1 or e<1: return f"{base} (Unstable)"
    if abs(p-n)>2 or abs(p-e)>5: return f"{base} (Unstable)"
    return f"{base} (Stable)"

def get_state():
    p,n,e = len(protons),len(neutrons),len(electrons)
    elem = ELEMENT_INFO.get(str(p), {})
    return {
        "protons": p, "neutrons": n, "electrons": e,
        "name": atom_name(),
        "stability": ("stable" if p>=1 and e>=1 and abs(p-n)<=2 and abs(p-e)<=5
                      else "unstable"),
        "massNumber": p+n, "atomicNumber": p,
        "isBlackHole": is_black_hole,
        "symbol": elem.get("symbol",""),
        "description": elem.get("description",""),
        "uses": elem.get("uses",""),
        "natural_occurrence": elem.get("natural_occurrence",""),
        "history": elem.get("history",""),
    }

# ── Particle operations ────────────────────────────────────────────────────

def _make_sphere(r, color):
    return vscene.visuals.Sphere(radius=r, method='latitude', color=color,
                                 edge_color=color, shading='smooth', rows=5, cols=5)

def _make_black_hole():
    global is_black_hole, bh_visual
    is_black_hole = True
    for v in protons+neutrons+electrons: v.parent = None
    protons.clear(); neutrons.clear(); electrons.clear()
    e_params.clear()
    if bh_visual: bh_visual.parent = None
    bh = _make_sphere(0.9, 'black')
    bh.transform = transforms.STTransform(translate=(0,0,0))
    view.add(bh)
    bh_visual = bh

def do_add(ptype, count=1):
    global is_black_hole
    for _ in range(count):
        if is_black_hole: break
        if ptype in ('proton','neutron'):
            color = 'red' if ptype=='proton' else 'yellow'
            s = _make_sphere(0.12, color)
            s.transform = transforms.STTransform(translate=rand_nuc_pos())
            view.add(s)
            (protons if ptype=='proton' else neutrons).append(s)
        elif ptype=='electron':
            idx = len(electrons)
            params = assign_orbital(idx)
            e_params.append(list(params))
            nr = nuc_radius()
            pos = e_pos(params, nr)
            s = _make_sphere(0.07, '#44aaff')
            s.transform = transforms.STTransform(translate=pos)
            view.add(s)
            electrons.append(s)
        if abs(len(neutrons)-len(protons)) >= 150:
            _make_black_hole(); break
    canvas.update()

def do_remove(ptype, count=1):
    if is_black_hole: return
    for _ in range(count):
        if ptype=='proton' and protons:
            protons.pop().parent = None
        elif ptype=='neutron' and neutrons:
            neutrons.pop().parent = None
        elif ptype=='electron' and electrons:
            electrons.pop().parent = None
            if e_params:  e_params.pop()
    canvas.update()

def do_reset():
    global is_black_hole, bh_visual
    for v in protons+neutrons+electrons: v.parent = None
    protons.clear(); neutrons.clear(); electrons.clear()
    e_params.clear()
    if bh_visual: bh_visual.parent = None; bh_visual = None
    is_black_hole = False
    canvas.update()

def do_camera(action, dx=0.0, dy=0.0, delta=0.0):
    global _auto_rotate
    _auto_rotate = False   # user took control
    cam = view.camera
    if action == 'rotate':
        cam.azimuth   = (cam.azimuth   - dx * 0.4) % 360
        cam.elevation = max(-89, min(89, cam.elevation + dy * 0.4))
    elif action == 'zoom':
        # delta > 0 = wheel up = zoom in
        factor = 0.92 if delta > 0 else 1.09
        cam.distance = max(2.0, min(30.0, cam.distance * factor))
    elif action == 'reset_view':
        cam.azimuth = 0; cam.elevation = 20; cam.distance = 8
        _auto_rotate = True
    canvas.update()

# ── Qt-safe command queue ──────────────────────────────────────────────────
_cmd_queue: list = []
_cmd_lock  = threading.Lock()

def _process_queue():
    with _cmd_lock:
        cmds = _cmd_queue[:]
        _cmd_queue.clear()
    for fn in cmds:
        fn()

def _enqueue(fn) -> dict:
    result = {}
    done   = threading.Event()
    def wrapper():
        fn()
        result.update(get_state())
        done.set()
    with _cmd_lock:
        _cmd_queue.append(wrapper)
    done.wait(timeout=5)
    return result

# Camera enqueue — fire-and-forget (no need to block for state)
def _enqueue_camera(fn):
    with _cmd_lock:
        _cmd_queue.append(fn)

# ── Frame capture ──────────────────────────────────────────────────────────

def _capture_frame():
    global frame_buf
    try:
        pixels = canvas.render(alpha=False)   # (H, W, 3) uint8
        if HAS_PIL:
            img = Image.fromarray(pixels)
            buf = io.BytesIO()
            img.save(buf, format='JPEG', quality=65)
            data = buf.getvalue()
        else:
            import struct, zlib
            h, w = pixels.shape[:2]
            raw = b''.join(b'\x00' + pixels[y].tobytes() for y in range(h))
            def chunk(tag, d):
                c = struct.pack('>I', len(d)) + tag + d
                return c + struct.pack('>I', zlib.crc32(tag+d) & 0xffffffff)
            data = (b'\x89PNG\r\n\x1a\n' +
                    chunk(b'IHDR', struct.pack('>IIBBBBB',w,h,8,2,0,0,0)) +
                    chunk(b'IDAT', zlib.compress(raw, 1)) +
                    chunk(b'IEND', b''))
        with frame_lock:
            frame_buf = data
    except Exception:
        pass

def _animate():
    if is_black_hole: return
    nr = nuc_radius()
    for i in range(len(electrons)):
        ot, a, ori = e_params[i]
        a += 0.03
        e_params[i] = [ot, a, ori]
        pos = e_pos((ot, a, ori), nr)
        electrons[i].transform.translate = pos
    if _auto_rotate:
        view.camera.azimuth = (view.camera.azimuth + 0.2) % 360
    canvas.update()

# ── Flask ──────────────────────────────────────────────────────────────────
flask_app = Flask(__name__)
CORS(flask_app)

@flask_app.route('/stream')
def stream():
    def gen():
        while True:
            with frame_lock:
                data = frame_buf
            if data:
                yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + data + b'\r\n')
            time.sleep(1/24)
    return Response(gen(), mimetype='multipart/x-mixed-replace; boundary=frame')

@flask_app.route('/api/state')
def api_state():
    return jsonify(get_state())

@flask_app.route('/api/add', methods=['POST'])
def api_add():
    ptype = request.json.get('type','')
    count = int(request.json.get('count', 1))
    return jsonify(_enqueue(lambda: do_add(ptype, count)))

@flask_app.route('/api/remove', methods=['POST'])
def api_remove():
    ptype = request.json.get('type','')
    count = int(request.json.get('count', 1))
    return jsonify(_enqueue(lambda: do_remove(ptype, count)))

@flask_app.route('/api/reset', methods=['POST'])
def api_reset():
    return jsonify(_enqueue(do_reset))

@flask_app.route('/api/camera', methods=['POST'])
def api_camera():
    data   = request.json or {}
    action = data.get('action', 'rotate')
    dx     = float(data.get('dx', 0))
    dy     = float(data.get('dy', 0))
    delta  = float(data.get('delta', 0))
    _enqueue_camera(lambda: do_camera(action, dx, dy, delta))
    return ('', 204)

def _run_flask():
    flask_app.run(host='0.0.0.0', port=5000, threaded=True, use_reloader=False)

# ── Main ───────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    threading.Thread(target=_run_flask, daemon=True).start()
    print("3D Atom Renderer active -> http://localhost:5000")

    capture_timer = QtCore.QTimer()
    capture_timer.timeout.connect(_capture_frame)
    capture_timer.start(42)          # 24 fps capture

    anim_timer = QtCore.QTimer()
    anim_timer.timeout.connect(_animate)
    anim_timer.start(42)             # 24 fps animation

    cmd_timer = QtCore.QTimer()
    cmd_timer.timeout.connect(_process_queue)
    cmd_timer.start(16)              # drain queue fast for responsive controls

    sys.exit(qt_app.exec_())
