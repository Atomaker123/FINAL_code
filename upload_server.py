"""
upload_server.py
Web Uploader UI and API server for adding custom items to Scale of the Universe 2.

Run:
    python upload_server.py
Then open:
    http://localhost:5050
"""

import os
import sys
from flask import Flask, request, jsonify, render_template_string, send_from_directory
from flask_cors import CORS

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'scripts'))
import universe_item_manager as mgr

app = Flask(__name__)
CORS(app)

HTML_TEMPLATE = '''
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scale of the Universe — Custom Item Creator</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Orbitron:wght@600;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090c13;
      --card-bg: rgba(18, 24, 38, 0.85);
      --card-border: rgba(99, 102, 241, 0.2);
      --primary: #6366f1;
      --primary-glow: rgba(99, 102, 241, 0.4);
      --accent: #38bdf8;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --input-bg: #0f172a;
      --input-border: #334155;
      --success: #10b981;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: radial-gradient(circle at 50% 10%, #1e1b4b 0%, var(--bg) 60%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 30px 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      width: 100%;
    }
    header {
      text-align: center;
      margin-bottom: 35px;
    }
    .brand-title {
      font-family: 'Orbitron', sans-serif;
      font-size: 32px;
      font-weight: 800;
      background: linear-gradient(135deg, #a5b4fc, #38bdf8, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 15px;
    }
    .grid-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 25px;
    }
    @media (max-width: 768px) {
      .grid-container { grid-template-columns: 1fr; }
    }
    .card {
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .full-width { grid-column: 1 / -1; }
    .card-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--accent);
    }
    .form-group {
      margin-bottom: 18px;
    }
    label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    input[type="text"], input[type="number"], textarea, select {
      width: 100%;
      padding: 12px 14px;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 8px;
      color: var(--text);
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: all 0.2s;
    }
    input[type="text"]:focus, input[type="number"]:focus, textarea:focus, select:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-glow);
    }
    textarea {
      resize: vertical;
      min-height: 90px;
    }
    /* Drop Zone */
    .drop-zone {
      border: 2px dashed var(--card-border);
      border-radius: 12px;
      padding: 30px 20px;
      text-align: center;
      cursor: pointer;
      background: rgba(15, 23, 42, 0.5);
      transition: all 0.2s;
      position: relative;
    }
    .drop-zone:hover, .drop-zone.dragover {
      border-color: var(--accent);
      background: rgba(56, 189, 248, 0.05);
    }
    .drop-zone input[type="file"] {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      opacity: 0;
      cursor: pointer;
    }
    .preview-container {
      margin-top: 15px;
      display: none;
      text-align: center;
    }
    .preview-img {
      max-width: 180px;
      max-height: 180px;
      border-radius: 8px;
      border: 1px solid var(--card-border);
      background: #000;
      object-fit: contain;
    }
    .size-row {
      display: flex;
      gap: 10px;
    }
    .size-row input { flex: 2; }
    .size-row select { flex: 1.2; }
    .scale-preview-box {
      background: #080c18;
      border: 1px solid rgba(56, 189, 248, 0.2);
      border-radius: 8px;
      padding: 12px;
      margin-top: 10px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: #38bdf8;
    }
    .scale-ruler {
      height: 6px;
      background: linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6, #10b981, #f59e0b, #ef4444);
      border-radius: 3px;
      margin: 10px 0;
      position: relative;
    }
    .scale-indicator {
      width: 14px;
      height: 14px;
      background: #fff;
      border: 2px solid var(--accent);
      border-radius: 50%;
      position: absolute;
      top: -4px;
      left: 50%;
      transform: translateX(-50%);
      transition: left 0.3s;
      box-shadow: 0 0 10px var(--accent);
    }
    .btn {
      width: 100%;
      padding: 14px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .btn-primary {
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: white;
      box-shadow: 0 4px 20px var(--primary-glow);
    }
    .btn-primary:hover {
      opacity: 0.95;
      transform: translateY(-1px);
      box-shadow: 0 6px 25px var(--primary-glow);
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    /* Items List */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    .items-table th, .items-table td {
      padding: 10px 12px;
      text-align: left;
      font-size: 13px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .items-table th { color: var(--text-muted); font-weight: 600; }
    .item-thumb { width: 36px; height: 36px; border-radius: 4px; object-fit: contain; background: #000; }
    .delete-btn {
      background: transparent;
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: var(--danger);
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
    }
    .delete-btn:hover { background: var(--danger); color: white; }
    .status-msg {
      margin-top: 15px;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      display: none;
    }
    .status-msg.success { background: rgba(16, 185, 129, 0.15); border: 1px solid var(--success); color: #34d399; }
    .status-msg.error { background: rgba(239, 68, 68, 0.15); border: 1px solid var(--danger); color: #f87171; }
    .open-link {
      display: inline-block;
      margin-top: 10px;
      padding: 8px 16px;
      background: var(--accent);
      color: #0f172a;
      text-decoration: none;
      font-weight: 600;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand-title">🌌 SCALE OF THE UNIVERSE 2</div>
      <div class="subtitle">Custom Item Creator & Universal Texture Uploader</div>
    </header>

    <div class="grid-container">
      <!-- Left Column: Upload Form -->
      <div class="card">
        <div class="card-title">✨ Add New Item</div>
        <form id="itemForm">
          <div class="form-group">
            <label>1. Item Image (PNG / JPG / WEBP)</label>
            <div class="drop-zone" id="dropZone">
              <span id="dropText">📁 Drag & drop image here or click to browse</span>
              <input type="file" id="imageInput" accept="image/png,image/jpeg,image/webp,image/gif" required>
            </div>
            <div class="preview-container" id="previewContainer">
              <img id="previewImg" class="preview-img" alt="Preview">
            </div>
          </div>

          <div class="form-group">
            <label>2. Item Title</label>
            <input type="text" id="titleInput" placeholder="e.g. James Webb Space Telescope" required>
          </div>

          <div class="form-group">
            <label>3. Description</label>
            <textarea id="descInput" placeholder="Describe what this object is, its interesting facts, and significance..."></textarea>
          </div>

          <div class="form-group">
            <label>4. Real-World Size</label>
            <div class="size-row">
              <input type="number" step="any" id="sizeValInput" value="1.0" required>
              <select id="unitInput">
                <optgroup label="Subatomic & Quantum">
                  <option value="fm">Femtometers (fm = 10⁻¹⁵ m)</option>
                  <option value="pm">Picometers (pm = 10⁻¹² m)</option>
                  <option value="nm">Nanometers (nm = 10⁻⁹ m)</option>
                  <option value="um">Micrometers (µm = 10⁻⁶ m)</option>
                </optgroup>
                <optgroup label="Human Scale">
                  <option value="mm">Millimeters (mm = 10⁻³ m)</option>
                  <option value="cm">Centimeters (cm = 10⁻² m)</option>
                  <option value="m" selected>Meters (m = 10⁰ m)</option>
                  <option value="km">Kilometers (km = 10³ m)</option>
                </optgroup>
                <optgroup label="Cosmic & Galactic">
                  <option value="au">Astronomical Units (AU)</option>
                  <option value="ly">Light-Years (ly)</option>
                  <option value="pc">Parsecs (pc)</option>
                  <option value="kpc">Kiloparsecs (kpc)</option>
                  <option value="mpc">Megaparsecs (Mpc)</option>
                </optgroup>
              </select>
            </div>
            
            <div class="scale-preview-box">
              <div>Scale Formula: <span id="scaleFormula">10^0 × 1.0 m</span></div>
              <div class="scale-ruler">
                <div class="scale-indicator" id="scaleIndicator"></div>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); display:flex; justify-content:space-between;">
                <span>10⁻³⁵m (Planck)</span>
                <span>10⁰m (Human)</span>
                <span>10²⁷m (Observable Universe)</span>
              </div>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" id="submitBtn">
            🚀 Add to Scale of the Universe
          </button>
        </form>

        <div class="status-msg" id="statusMsg"></div>
      </div>

      <!-- Right Column: Library & Controls -->
      <div class="card">
        <div class="card-title">📚 Custom Items in Universe</div>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
          These items are active and dynamically packed into custom spritesheets:
        </p>

        <div style="max-height: 480px; overflow-y: auto;">
          <table class="items-table">
            <thead>
              <tr>
                <th>Preview</th>
                <th>Title</th>
                <th>Size</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="itemsTableBody">
              <tr><td colspan="4" style="text-align:center; color: var(--text-muted);">Loading library...</td></tr>
            </tbody>
          </table>
        </div>

        <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid var(--card-border);">
          <a href="http://localhost:3000/scaleoftheuniverse.html" target="_blank" class="btn btn-primary" style="text-decoration:none;">
            🌌 Open Scale of the Universe App
          </a>
        </div>
      </div>
    </div>
  </div>

  <script>
    const imageInput = document.getElementById('imageInput');
    const dropZone = document.getElementById('dropZone');
    const dropText = document.getElementById('dropText');
    const previewContainer = document.getElementById('previewContainer');
    const previewImg = document.getElementById('previewImg');
    const sizeValInput = document.getElementById('sizeValInput');
    const unitInput = document.getElementById('unitInput');
    const scaleFormula = document.getElementById('scaleFormula');
    const scaleIndicator = document.getElementById('scaleIndicator');
    const itemForm = document.getElementById('itemForm');
    const submitBtn = document.getElementById('submitBtn');
    const statusMsg = document.getElementById('statusMsg');
    const itemsTableBody = document.getElementById('itemsTableBody');

    const unitMultipliers = {
      fm: 1e-15, pm: 1e-12, nm: 1e-9, um: 1e-6,
      mm: 1e-3, cm: 1e-2, m: 1.0, km: 1e3,
      au: 1.495978707e11, ly: 9.460730472e15, pc: 3.085677581e16,
      kpc: 3.085677581e19, mpc: 3.085677581e22
    };

    function updateScaleVisualizer() {
      const val = parseFloat(sizeValInput.value) || 1.0;
      const unit = unitInput.value;
      const mult = unitMultipliers[unit] || 1.0;
      const meters = Math.max(1e-35, val * mult);

      const exponent = Math.floor(Math.log10(meters));
      const coeff = (meters / Math.pow(10, exponent)).toFixed(2);

      scaleFormula.textContent = `10^${exponent} × ${coeff} meters (${val} ${unit})`;

      // Position along -35 to +27
      const clampedExp = Math.max(-35, Math.min(27, exponent));
      const pct = ((clampedExp - (-35)) / (27 - (-35))) * 100;
      scaleIndicator.style.left = `${pct}%`;
    }

    sizeValInput.addEventListener('input', updateScaleVisualizer);
    unitInput.addEventListener('change', updateScaleVisualizer);
    updateScaleVisualizer();

    // Image preview handler
    imageInput.addEventListener('change', function() {
      const file = this.files[0];
      if (file) {
        dropText.textContent = 'Selected: ' + file.name;
        const reader = new FileReader();
        reader.onload = function(e) {
          previewImg.src = e.target.result;
          previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });

    // Drag and Drop
    ['dragenter', 'dragover'].forEach(name => {
      dropZone.addEventListener(name, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(name => {
      dropZone.addEventListener(name, (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); });
    });

    // Form Submission
    itemForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = imageInput.files[0];
      if (!file) {
        alert('Please select an image file.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Adding & Packing Spritesheets...';
      statusMsg.style.display = 'none';

      const formData = new FormData();
      formData.append('image', file);
      formData.append('title', document.getElementById('titleInput').value);
      formData.append('description', document.getElementById('descInput').value);
      formData.append('size_val', sizeValInput.value);
      formData.append('unit_name', unitInput.value);

      try {
        const resp = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const data = await resp.json();

        if (data.success) {
          statusMsg.className = 'status-msg success';
          statusMsg.innerHTML = `
            ✅ <strong>Item added successfully!</strong><br>
            <strong>"${data.item.title}"</strong> (ID ${data.item.objectID}) was added at scale 10^${data.item.exponent} × ${data.item.coeff} m.<br>
            <a href="http://localhost:3000/scaleoftheuniverse.html" target="_blank" class="open-link">🌌 View in Universe</a>
          `;
          statusMsg.style.display = 'block';
          itemForm.reset();
          previewContainer.style.display = 'none';
          dropText.textContent = '📁 Drag & drop image here or click to browse';
          updateScaleVisualizer();
          loadItems();
        } else {
          statusMsg.className = 'status-msg error';
          statusMsg.textContent = '❌ Error: ' + (data.error || 'Failed to add item');
          statusMsg.style.display = 'block';
        }
      } catch (err) {
        statusMsg.className = 'status-msg error';
        statusMsg.textContent = '❌ Network error: ' + err.message;
        statusMsg.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '🚀 Add to Scale of the Universe';
      }
    });

    async function loadItems() {
      try {
        const resp = await fetch('/api/items');
        const items = await resp.json();
        if (!items || items.length === 0) {
          itemsTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">No custom items yet.</td></tr>';
          return;
        }

        itemsTableBody.innerHTML = items.map(it => `
          <tr>
            <td><img src="/library_images/${it.imageFileName}" class="item-thumb" onerror="this.src='/balls.png'"></td>
            <td><strong>${it.title}</strong><div style="font-size:11px; color:var(--text-muted);">ID ${it.objectID}</div></td>
            <td>10^${it.exponent} × ${it.coeff} m</td>
            <td><button class="delete-btn" onclick="deleteItem(${it.objectID})">Delete</button></td>
          </tr>
        `).join('');
      } catch (e) {
        itemsTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: red;">Error loading items.</td></tr>';
      }
    }

    async function deleteItem(id) {
      if (!confirm('Are you sure you want to remove item ID ' + id + '?')) return;
      try {
        const resp = await fetch('/api/items/' + id, { method: 'DELETE' });
        const res = await resp.json();
        if (res.success) {
          loadItems();
        } else {
          alert('Delete failed: ' + res.error);
        }
      } catch (e) {
        alert('Error deleting: ' + e.message);
      }
    }

    loadItems();
  </script>
</body>
</html>
'''

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route('/library_images/<path:filename>')
def serve_library_image(filename):
    return send_from_directory(mgr.LIBRARY_DIR, filename)

@app.route('/balls.png')
def serve_balls_fallback():
    return send_from_directory(mgr.ROOT_DIR, 'balls.png')

@app.route('/api/items', methods=['GET'])
def get_items():
    return jsonify(mgr.get_library_items())

@app.route('/api/upload', methods=['POST'])
def upload_item():
    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': 'No image file uploaded'}), 400

        img_file = request.files['image']
        if img_file.filename == '':
            return jsonify({'success': False, 'error': 'Empty image filename'}), 400

        title = request.form.get('title', '').strip()
        if not title:
            return jsonify({'success': False, 'error': 'Item title is required'}), 400

        description = request.form.get('description', '').strip()
        size_val = request.form.get('size_val')
        unit_name = request.form.get('unit_name')
        exp_val = request.form.get('exponent')
        coeff_val = request.form.get('coeff')

        bound_w = float(request.form.get('bound_w', 200.0))
        bound_h = float(request.form.get('bound_h', 200.0))
        title_y = float(request.form.get('title_y', -150.0))

        item = mgr.add_custom_item(
            image_path_or_file=img_file,
            title=title,
            description=description,
            size_val=size_val,
            unit_name=unit_name,
            exponent_val=exp_val,
            coeff_val=coeff_val,
            bound_w=bound_w,
            bound_h=bound_h,
            title_y=title_y
        )

        return jsonify({'success': True, 'item': item})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/items/<int:object_id>', methods=['DELETE'])
def delete_item(object_id):
    try:
        ok = mgr.delete_custom_item(object_id)
        if ok:
            return jsonify({'success': True})
        return jsonify({'success': False, 'error': 'Item not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sync', methods=['POST'])
def sync_universe():
    try:
        mgr.sync_all()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5050))
    print(f"\n{'='*60}")
    print(f"  🌌 Scale of the Universe Item Uploader Server")
    print(f"  Running at: http://localhost:{port}")
    print(f"{'='*60}\n")
    app.run(host='0.0.0.0', port=port, debug=False)
