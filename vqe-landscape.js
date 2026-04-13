// ── VQE ENERGY LANDSCAPE (3D) ─────────────────────────────────────────────────
// Renders the E(θ₁, θ₂) energy landscape as an interactive Three.js surface
// and animates the VQE optimization trajectory on top of it.
// Requires window.THREE (three@0.148, loaded before this file).
//
// Public API (window.VQELandscape):
//   init(canvas)                — create / reset Three.js scene on <canvas>
//   setLandscape(data, source)  — build surface mesh from a grid data object
//   addPoint(theta2d, energy)   — append one trajectory point
//   resetTrajectory()           — clear trajectory, keep surface
//   resize()                    — call when container resizes (auto-wired to window)
//   refreshTheme()              — update 3D colors for current data-theme
//   destroy()                   — full cleanup / dispose
//   buildFallbackData(mol, res) — pure-JS approximate grid (no backend)
//
// ── Implementation scope & limitations ────────────────────────────────────────
// • VISUALIZATION IS A 2D SLICE of the full parameter space.
//   Only θ₁ = theta[0] and θ₂ = theta[1] are swept over [0, 2π].
//   All remaining parameters (theta[2:]) are held fixed at the values
//   supplied in theta_ref (zero-padded to the full ansatz dimension).
//   This is sufficient to show a meaningful optimization landscape for
//   educational purposes, but it is NOT a full-dimensional landscape.
//
// • The "backend" surface (source === 'backend') is computed by the Python
//   backend using the same _build_circuit / _calculate_expectation logic as the
//   VQE optimizer, so the landscape and the trajectory are always consistent.
//
// • The "approximate" surface (source === 'approximate') is a parametric formula:
//     E(θ₁, θ₂) = E_exact + a(1−cosθ₁) + b(1−cosθ₂) + c·sinθ₁·sinθ₂
//   It does NOT represent real quantum chemistry.  Coefficients are tuned to give
//   a visually plausible shape per molecule and are always labelled ⚠ in the UI.
//
// • This module targets educational demonstration and visual explanation of VQE
//   convergence — not high-accuracy quantum chemistry computation.
// ─────────────────────────────────────────────────────────────────────────────

const VQELandscape = (() => {
  // ── Three.js objects ─────────────────────────────────────────────────────
  let _T        = null;   // window.THREE reference, set on init
  let _R        = null;   // WebGLRenderer
  let _scene    = null;
  let _camera   = null;
  let _rotGroup = null;   // all scene objects that rotate together
  let _surfMesh = null;   // E(θ₁,θ₂) surface mesh, replaced on each setLandscape()
  let _exactLine= null;   // exact-energy reference level outline (horizontal rectangle)
  let _trajGeo  = null;   // trajectory BufferGeometry, rebuilt on each addPoint()
  let _trajLine = null;
  let _marker   = null;   // current-position sphere (latest VQE step)
  let _animId   = null;
  let _canvas   = null;

  // Axis line objects — tracked so refreshTheme() can update colors in-place
  // without tearing down and rebuilding the whole scene.
  let _axisLines = [];
  let _axisMats  = [];

  // ── Interaction state ─────────────────────────────────────────────────────
  let _drag     = { active: false, lx: 0, ly: 0 };
  let _rotEuler = { x: -0.45, y: 0.35 };  // current rotation (radians)
  let _zoom     = 4.6;                      // camera.position.z

  // ── Data state ────────────────────────────────────────────────────────────
  let _eMin    = 0;
  let _eMax    = 1;
  let _source  = null;   // 'backend' | 'approximate' | null
  // _trajRaw keeps every step as {theta2d, energy} so we can re-map Y coordinates
  // when the landscape is upgraded (fallback → backend changes _eMin/_eMax).
  let _trajRaw = [];

  // ── Saved event-handler references ────────────────────────────────────────
  // ALL handlers are stored here.  destroy() removes every one of them to
  // prevent listener accumulation across repeated init → destroy cycles.
  let _hDown       = null;
  let _hMove       = null;
  let _hUp         = null;
  let _hTouchStart = null;
  let _hTouchMove  = null;
  let _hTouchEnd   = null;
  let _hWheel      = null;
  let _hResize     = null;
  let _hVis        = null;  // visibilitychange: pause rAF when tab is hidden
  let _boundCanvas = null;  // canvas element that owns the per-canvas listeners

  // ── Theme palette ─────────────────────────────────────────────────────────
  const _THEME = {
    classic: { axisX: 0xCC3333, axisY: 0x33AA55, axisZ: 0x3355CC, traj: 0xFF9900, marker: 0xFF3333, exact: 0x00CC66 },
    dark:    { axisX: 0xFF5555, axisY: 0x4ADE80, axisZ: 0x4A86E8, traj: 0xFFCC00, marker: 0xFF6666, exact: 0x00DD88 },
    aurora:  { axisX: 0xFF6B6B, axisY: 0x4ADE80, axisZ: 0x9B7FFF, traj: 0xFFDD44, marker: 0xFF8080, exact: 0x00DD88 },
    amber:   { axisX: 0xFF7744, axisY: 0x8FB676, axisZ: 0xF7A84D, traj: 0xFFB040, marker: 0xFF6633, exact: 0x8FB676 },
  };
  function _tc() {
    const id = document.documentElement.getAttribute('data-theme') || 'classic';
    return _THEME[id] || _THEME.classic;
  }

  // ── i18n helper ───────────────────────────────────────────────────────────
  function _isEn() {
    return (typeof window.isEnglish === 'function' && window.isEnglish()) || window._currentLang === 'en';
  }
  function _l(zh, en) { return _isEn() ? en : zh; }

  // ── Status label ──────────────────────────────────────────────────────────
  function _setStatus(text) {
    const el = document.getElementById('vqe3d-status');
    if (el) el.textContent = text;
  }

  // Keeps the status label honest: clearly distinguish backend slice from
  // approximate fallback, and note the 2D slice nature to avoid over-claiming.
  function _updateStatusLabel() {
    if (_source === 'backend') {
      _setStatus(_l('后端计算景观（θ₁/θ₂ 切片）', 'Backend landscape (θ₁/θ₂ slice)'));
    } else if (_source === 'approximate') {
      _setStatus(_l('⚠ 本地近似景观（后端离线）', '⚠ Approx. landscape (backend offline)'));
    } else {
      _setStatus(_l('正在加载后端景观...', 'Loading backend landscape...'));
    }
  }

  // ── Energy ↔ scene-Y mapping ──────────────────────────────────────────────
  // Maps [_eMin, _eMax] → scene Y ∈ [−0.7, +0.7].
  function _energyToY(e) {
    const range = _eMax - _eMin;
    if (range < 1e-9) return 0;
    return ((e - _eMin) / range) * 1.4 - 0.7;
  }

  // Cool-warm vertex colormap: low energy → blue, mid → white, high → red.
  function _energyColor(e) {
    const t = Math.max(0, Math.min(1, (e - _eMin) / (_eMax - _eMin || 1)));
    if (t < 0.5) {
      const s = t * 2;
      return [s, s, 1.0];
    } else {
      const s = (t - 0.5) * 2;
      return [1.0, 1 - s, 1 - s];
    }
  }

  // θ ∈ [0, 2π] → scene X or Z ∈ [−1, +1]
  function _tToX(t) { return (t / (2 * Math.PI)) * 2 - 1; }

  // ── init ──────────────────────────────────────────────────────────────────
  function init(cv) {
    if (!window.THREE) {
      _setStatus(_l('THREE.js 未加载，3D 景观不可用', 'THREE.js not loaded'));
      return false;
    }

    // Preserve camera orientation across VQE re-runs so the user doesn't lose
    // their chosen viewing angle when clicking "Run again".
    const savedRot  = { x: _rotEuler.x, y: _rotEuler.y };
    const savedZoom = _zoom;

    if (_R) destroy();   // tear down old scene before creating a new one

    _rotEuler = savedRot;
    _zoom     = savedZoom;

    _T      = window.THREE;
    _canvas = cv;

    const W = cv.offsetWidth  || 400;
    const H = cv.offsetHeight || 260;

    // alpha: true keeps the canvas transparent so the CSS --surf background
    // shows through, making the 3D area automatically theme-aware.
    _R = new _T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    _R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    _R.setSize(W, H, false);  // false: don't override CSS size

    _scene  = new _T.Scene();
    _camera = new _T.PerspectiveCamera(50, W / H, 0.1, 50);
    _camera.position.set(0, 0, _zoom);

    // Lights live in world space (not inside _rotGroup) so they stay fixed
    // relative to the camera as the landscape rotates.
    _scene.add(new _T.AmbientLight(0xffffff, 0.6));
    const sun = new _T.DirectionalLight(0xffffff, 0.9);
    sun.position.set(-2, 3, 2);
    _scene.add(sun);
    const fill = new _T.DirectionalLight(0xffffff, 0.15);
    fill.position.set(2, -1, -1);
    _scene.add(fill);

    // _rotGroup holds the surface mesh, axes, and trajectory so they all
    // rotate together when the user drags.
    _rotGroup = new _T.Group();
    _scene.add(_rotGroup);

    _buildAxes();
    _buildTrajLine();

    // ── Register all event handlers (saved for later removeEventListener) ──
    _hDown = e => {
      _drag.active = true;
      _drag.lx = e.clientX;
      _drag.ly = e.clientY;
    };
    _hMove = e => {
      if (!_drag.active) return;
      const dx = e.clientX - _drag.lx;
      const dy = e.clientY - _drag.ly;
      _drag.lx = e.clientX;
      _drag.ly = e.clientY;
      _rotEuler.y += dx * 0.012;
      _rotEuler.x += dy * 0.012;
      _rotEuler.x = Math.max(-1.4, Math.min(1.4, _rotEuler.x));  // prevent gimbal flip
    };
    _hUp         = () => { _drag.active = false; };
    _hTouchStart = e => { const t = e.touches[0]; _hDown({ clientX: t.clientX, clientY: t.clientY }); };
    _hTouchMove  = e => { if (!_drag.active) return; const t = e.touches[0]; _hMove({ clientX: t.clientX, clientY: t.clientY }); };
    _hTouchEnd   = () => _hUp();
    _hWheel      = e => {
      _zoom = Math.max(2.5, Math.min(8.0, _zoom + e.deltaY * 0.01));
      if (_camera) _camera.position.z = _zoom;
    };
    _hResize = () => resize();
    // Pause the rAF loop when the browser tab is hidden (saves CPU/GPU); resume
    // when the tab becomes visible again.  The handler is document-level.
    _hVis = () => {
      if (document.hidden) {
        if (_animId) { cancelAnimationFrame(_animId); _animId = null; }
      } else {
        if (_R && !_animId) _tick();
      }
    };

    cv.addEventListener('mousedown',       _hDown);
    window.addEventListener('mousemove',   _hMove);
    window.addEventListener('mouseup',     _hUp);
    cv.addEventListener('touchstart',      _hTouchStart, { passive: true });
    window.addEventListener('touchmove',   _hTouchMove,  { passive: true });
    window.addEventListener('touchend',    _hTouchEnd);
    cv.addEventListener('wheel',           _hWheel,      { passive: true });
    window.addEventListener('resize',      _hResize);
    document.addEventListener('visibilitychange', _hVis);

    _boundCanvas = cv;

    _tick();
    _setStatus(_l('正在加载后端景观...', 'Loading backend landscape...'));
    return true;
  }

  // ── Axis lines ────────────────────────────────────────────────────────────
  // Three lines: x → θ₁, y → E, z → θ₂.  Material refs stored so
  // refreshTheme() can update colors without rebuilding the scene.
  function _buildAxes() {
    const colors = _tc();
    const L = 1.15;
    [
      [L, 0, 0, colors.axisX],  // x-axis → θ₁ parameter
      [0, L, 0, colors.axisY],  // y-axis → energy E
      [0, 0, L, colors.axisZ],  // z-axis → θ₂ parameter
    ].forEach(([x, y, z, col]) => {
      const mat  = new _T.LineBasicMaterial({ color: col, transparent: true, opacity: 0.50 });
      const line = new _T.Line(
        new _T.BufferGeometry().setFromPoints([new _T.Vector3(0, 0, 0), new _T.Vector3(x, y, z)]),
        mat
      );
      _rotGroup.add(line);
      _axisLines.push(line);
      _axisMats.push(mat);
    });
  }

  // ── Trajectory line + current-position marker ─────────────────────────────
  function _buildTrajLine() {
    const colors = _tc();
    _trajGeo = new _T.BufferGeometry();
    _trajGeo.setAttribute('position', new _T.BufferAttribute(new Float32Array(0), 3));
    _trajLine = new _T.Line(
      _trajGeo,
      new _T.LineBasicMaterial({ color: colors.traj, transparent: true, opacity: 0.92 })
    );
    _rotGroup.add(_trajLine);

    _marker = new _T.Mesh(
      new _T.SphereGeometry(0.048, 12, 8),
      new _T.MeshPhongMaterial({ color: colors.marker, emissive: colors.marker, emissiveIntensity: 0.5 })
    );
    _marker.visible = false;
    _rotGroup.add(_marker);
  }

  // ── refreshTheme ──────────────────────────────────────────────────────────
  // Updates all material colors in-place without rebuilding any geometry.
  // Called by window.refreshVQELandscapeTheme, which is hooked into
  // settings.js applyTheme() so theme switches propagate here automatically.
  function refreshTheme() {
    if (!_T || !_rotGroup) return;
    const colors   = _tc();
    const axisCols = [colors.axisX, colors.axisY, colors.axisZ];
    _axisMats.forEach((mat, i) => mat.color.set(axisCols[i]));
    if (_trajLine)  _trajLine.material.color.set(colors.traj);
    if (_marker)    { _marker.material.color.set(colors.marker); _marker.material.emissive.set(colors.marker); }
    if (_exactLine) _exactLine.material.color.set(colors.exact);
    _updateStatusLabel();  // also refreshes the i18n-aware status text
  }

  // ── Fallback landscape data (no backend required) ─────────────────────────
  // Uses an analytical formula to generate a plausible energy surface shape
  // for educational visualization when the backend is unavailable.
  //
  // Formula: E(θ₁,θ₂) = E_exact + a(1−cosθ₁) + b(1−cosθ₂) + c·sinθ₁·sinθ₂
  //   → global minimum at (θ₁=0, θ₂=0) where E = E_exact
  //   → consistent with the simulated local-mode trajectory in vqe.js, which
  //     also converges toward θ = 0 using the gradient of this formula.
  //
  // IMPORTANT: Coefficients (a, b, c) are tuned for visual appeal only.
  // They do NOT represent physical UCCSD amplitudes or any rigorous ansatz.
  // This surface is always labelled "⚠ approximate" in the UI.
  const _FALLBACK_PARAMS = {
    H2:   { exact: -1.1372,   a: 0.40, b: 0.30, c:  0.18 },
    HeH:  { exact: -2.8628,   a: 0.28, b: 0.22, c:  0.08 },
    LiH:  { exact: -7.8824,   a: 0.50, b: 0.40, c:  0.12 },
    BeH2: { exact: -15.5937,  a: 0.55, b: 0.45, c:  0.10 },
    H2O:  { exact: -74.9654,  a: 0.60, b: 0.50, c:  0.14 },
  };

  function buildFallbackData(molecule, resolution) {
    const p = _FALLBACK_PARAMS[molecule] || _FALLBACK_PARAMS.H2;
    const { exact, a, b, c } = p;
    const n = Math.max(10, Math.min(24, resolution || 16));
    const grid = [];
    for (let i = 0; i < n; i++) {
      const row = [];
      const t1 = (i / (n - 1)) * 2 * Math.PI;
      for (let j = 0; j < n; j++) {
        const t2 = (j / (n - 1)) * 2 * Math.PI;
        row.push(exact + a * (1 - Math.cos(t1)) + b * (1 - Math.cos(t2)) + c * Math.sin(t1) * Math.sin(t2));
      }
      grid.push(row);
    }
    return {
      grid,
      theta1_range: [0, 2 * Math.PI],
      theta2_range: [0, 2 * Math.PI],
      exact,
      resolution: n,
    };
  }

  // ── setLandscape ──────────────────────────────────────────────────────────
  // Replaces the surface mesh with the grid in `data`.
  // `source` must be 'backend' or 'approximate'.
  //
  // Visualization strategy
  // ──────────────────────
  // The grid is a resolution×resolution matrix of E values where:
  //   row i  → θ₁ = theta[0] at step i / (n−1) × 2π   (x-axis in scene)
  //   col j  → θ₂ = theta[1] at step j / (m−1) × 2π   (z-axis in scene)
  //   value  → E(θ₁, θ₂, theta_ref[2:])                (y-axis in scene)
  // This is a 2D SLICE of the full parameter space; all theta[2:] are fixed.
  //
  // When upgrading from fallback → backend, _trajRaw is re-mapped to the new
  // energy scale so already-collected trajectory points retain correct heights.
  function setLandscape(data, source) {
    if (!_rotGroup || !_T) return;

    // Dispose and remove old mesh
    if (_surfMesh) {
      _rotGroup.remove(_surfMesh);
      _surfMesh.geometry.dispose();
      _surfMesh.material.dispose();
      _surfMesh = null;
    }
    if (_exactLine) {
      _rotGroup.remove(_exactLine);
      _exactLine.geometry.dispose();
      _exactLine.material.dispose();
      _exactLine = null;
    }

    const grid = data.grid;
    const n = grid.length;
    const m = grid[0] ? grid[0].length : 0;
    if (!n || !m) return;

    // Compute energy range; pin eMin to exact so the reference level is never
    // clipped off the bottom of the visualization.
    let eMin = Infinity, eMax = -Infinity;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        const e = grid[i][j];
        if (e < eMin) eMin = e;
        if (e > eMax) eMax = e;
      }
    }
    if (data.exact != null) eMin = Math.min(eMin, data.exact);
    _eMin = eMin;
    _eMax = eMax;

    // Build vertex buffer: x = θ₁, z = θ₂, y = E (scene space)
    const vc  = n * m;
    const pos = new Float32Array(vc * 3);
    const col = new Float32Array(vc * 3);
    const idx = [];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        const k = i * m + j;
        pos[k * 3]     = (i / (n - 1)) * 2 - 1;          // x → θ₁
        pos[k * 3 + 1] = _energyToY(grid[i][j]);           // y → E
        pos[k * 3 + 2] = (j / (m - 1)) * 2 - 1;           // z → θ₂
        const [r, g, b] = _energyColor(grid[i][j]);
        col[k * 3] = r;  col[k * 3 + 1] = g;  col[k * 3 + 2] = b;
      }
    }
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < m - 1; j++) {
        const a  = i * m + j,     b2 = i * m + j + 1,
              c2 = (i+1)*m + j,   d  = (i+1)*m + j + 1;
        idx.push(a, b2, c2, b2, d, c2);
      }
    }

    const geo = new _T.BufferGeometry();
    geo.setAttribute('position', new _T.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new _T.BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    _surfMesh = new _T.Mesh(geo, new _T.MeshPhongMaterial({
      vertexColors: true, side: _T.DoubleSide, shininess: 35, transparent: true, opacity: 0.88,
    }));
    _rotGroup.add(_surfMesh);

    // ── Exact-energy reference level outline ──────────────────────────────
    // A horizontal rectangle at y = E_exact — shows where the ground-state
    // energy lies relative to the landscape surface.  This is a reference
    // line, not a contour of the surface itself.
    if (data.exact != null) {
      const colors = _tc();
      const ey  = _energyToY(data.exact);
      const pts = [
        new _T.Vector3(-1, ey, -1), new _T.Vector3( 1, ey, -1),
        new _T.Vector3( 1, ey,  1), new _T.Vector3(-1, ey,  1),
        new _T.Vector3(-1, ey, -1),
      ];
      _exactLine = new _T.Line(
        new _T.BufferGeometry().setFromPoints(pts),
        new _T.LineBasicMaterial({ color: colors.exact, transparent: true, opacity: 0.65 })
      );
      _rotGroup.add(_exactLine);
    }

    // Re-map existing trajectory to the new energy scale.
    // Critical for the fallback → backend upgrade path: _eMin/_eMax change,
    // so all previously collected Y coordinates must be recalculated.
    _rebuildTrajFromRaw();

    _source = source;
    _updateStatusLabel();
  }

  // Recompute all trajectory geometry from _trajRaw using the current
  // _eMin/_eMax.  Called after setLandscape() and after each addPoint().
  function _rebuildTrajFromRaw() {
    if (!_trajGeo || !_T) return;
    const n   = _trajRaw.length;
    const pts = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const { theta2d, energy } = _trajRaw[i];
      pts[i * 3]     = _tToX(theta2d[0]);
      pts[i * 3 + 1] = _energyToY(energy);
      pts[i * 3 + 2] = _tToX(theta2d[1]);
    }
    _trajGeo.setAttribute('position', new _T.BufferAttribute(pts, 3));
    _trajGeo.setDrawRange(0, n);

    if (_marker && n > 0) {
      const last = _trajRaw[n - 1];
      _marker.position.set(_tToX(last.theta2d[0]), _energyToY(last.energy), _tToX(last.theta2d[1]));
      _marker.visible = true;
    }
  }

  // ── addPoint ──────────────────────────────────────────────────────────────
  // Appends one trajectory point.
  //
  // theta2d: [θ₁, θ₂] = [theta_before[0], theta_before[1]] from the backend step.
  // energy:  E(theta_before) — the expectation value BEFORE the optimizer update.
  //
  // Both values come from the same theta_before snapshot, guaranteeing alignment:
  // the 3D marker sits exactly on the landscape surface at the correct energy.
  //
  // The same function handles both backend steps (real theta2d) and local-mode
  // steps (simulated theta that mimics convergence toward the fallback minimum).
  function addPoint(theta2d, energy) {
    if (!_T || !_trajGeo) return;
    if (!Array.isArray(theta2d) || theta2d.length < 2) return;
    _trajRaw.push({ theta2d: [theta2d[0], theta2d[1]], energy });
    _rebuildTrajFromRaw();
  }

  // ── resetTrajectory ───────────────────────────────────────────────────────
  function resetTrajectory() {
    _trajRaw = [];
    if (_trajGeo && _T) {
      _trajGeo.setAttribute('position', new _T.BufferAttribute(new Float32Array(0), 3));
      _trajGeo.setDrawRange(0, 0);
    }
    if (_marker) _marker.visible = false;
  }

  // ── resize ────────────────────────────────────────────────────────────────
  // Auto-wired to window 'resize' in init(); removed in destroy().
  function resize() {
    if (!_R || !_canvas || !_camera) return;
    const W = _canvas.offsetWidth  || 400;
    const H = _canvas.offsetHeight || 260;
    _R.setSize(W, H, false);
    _camera.aspect = W / H;
    _camera.updateProjectionMatrix();
  }

  // ── Render loop ───────────────────────────────────────────────────────────
  function _tick() {
    if (!_R) return;
    _animId = requestAnimationFrame(_tick);
    if (_rotGroup) {
      _rotGroup.rotation.x = _rotEuler.x;
      _rotGroup.rotation.y = _rotEuler.y;
    }
    _R.render(_scene, _camera);
  }

  // ── destroy / dispose ─────────────────────────────────────────────────────
  // Removes ALL registered event listeners (canvas-level and window/document-
  // level), cancels the rAF loop, and disposes all Three.js GPU objects.
  // Must be called before re-initialising to prevent listener accumulation.
  function destroy() {
    if (_animId) { cancelAnimationFrame(_animId); _animId = null; }

    // Per-canvas listeners
    if (_boundCanvas) {
      if (_hDown)       _boundCanvas.removeEventListener('mousedown',  _hDown);
      if (_hTouchStart) _boundCanvas.removeEventListener('touchstart', _hTouchStart);
      if (_hWheel)      _boundCanvas.removeEventListener('wheel',      _hWheel);
      _boundCanvas = null;
    }
    // Window-level listeners
    if (_hMove)      { window.removeEventListener('mousemove', _hMove);       _hMove      = null; }
    if (_hUp)        { window.removeEventListener('mouseup',   _hUp);         _hUp        = null; }
    if (_hTouchMove) { window.removeEventListener('touchmove', _hTouchMove);  _hTouchMove = null; }
    if (_hTouchEnd)  { window.removeEventListener('touchend',  _hTouchEnd);   _hTouchEnd  = null; }
    if (_hResize)    { window.removeEventListener('resize',    _hResize);     _hResize    = null; }
    // Document-level listener
    if (_hVis)       { document.removeEventListener('visibilitychange', _hVis); _hVis     = null; }
    _hDown = _hTouchStart = _hWheel = null;

    // Dispose Three.js GPU resources
    if (_surfMesh)  { _surfMesh.geometry.dispose();  _surfMesh.material.dispose(); }
    if (_exactLine) { _exactLine.geometry.dispose(); _exactLine.material.dispose(); }
    if (_trajGeo)   _trajGeo.dispose();
    if (_trajLine)  _trajLine.material.dispose();
    if (_marker)    { _marker.geometry.dispose();    _marker.material.dispose(); }
    _axisLines.forEach(l => { l.geometry.dispose(); l.material.dispose(); });
    _axisLines = [];
    _axisMats  = [];

    if (_R) { _R.dispose(); _R = null; }

    // Clear all object references
    _scene    = null;
    _camera   = null;
    _rotGroup = null;
    _surfMesh = null;
    _exactLine= null;
    _trajGeo  = null;
    _trajLine = null;
    _marker   = null;
    _canvas   = null;
    _source   = null;
    _T        = null;
    _trajRaw  = [];
    _eMin     = 0;
    _eMax     = 1;
    _drag     = { active: false, lx: 0, ly: 0 };
    // _rotEuler and _zoom intentionally NOT reset: init() preserves them
    // across re-runs so the user's camera orientation is maintained.
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return { init, setLandscape, addPoint, resetTrajectory, resize, refreshTheme, destroy, buildFallbackData };
})();

window.VQELandscape = VQELandscape;
// Hooked into settings.js applyTheme() so theme switches automatically
// propagate to the 3D scene colors and the i18n-aware status label.
window.refreshVQELandscapeTheme = () => VQELandscape.refreshTheme();
