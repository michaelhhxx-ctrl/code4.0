// ── STEP MODE（逐步演化）──

let _stepMode   = false;
let _stepCursor = 0;   // 0 = 初始态 |0…0⟩；n = 执行完第 0…n-1 列后的态

function _stepL(zh, en) { return window._currentLang === 'en' ? en : zh; }

function enterStepMode() {
  let gc = 0;
  S.circ.forEach(r => r.forEach(g => { if (g && g.role !== 'tgt') gc++; }));
  if (!gc) { setSBMsg(_stepL('线路为空，无法进入逐步演化', 'Circuit is empty')); return; }
  if (typeof _replayRunning !== 'undefined' && _replayRunning) return;

  _stepMode   = true;
  _stepCursor = 0;
  const bar = document.getElementById('step-bar');
  if (bar) bar.style.display = 'flex';
  setSBMsg(_stepL('逐步演化：使用 ← → 键或点击按钮逐步推进', 'Step mode: use ← → keys or buttons to advance'));
  _stepRender();
}

function exitStepMode() {
  _stepMode   = false;
  _stepCursor = 0;
  const bar = document.getElementById('step-bar');
  if (bar) bar.style.display = 'none';
  renderCirc();
  updateBlochFromCirc();
}

function stepForward() {
  if (!_stepMode) return;
  if (_stepCursor < S.steps) { _stepCursor++; _stepRender(); }
  else setSBMsg(_stepL('已到最后一步', 'Already at last step'));
}

function stepBack() {
  if (!_stepMode) return;
  if (_stepCursor > 0) { _stepCursor--; _stepRender(); }
  else setSBMsg(_stepL('已在初始态', 'Already at initial state'));
}

function _stepRender() {
  const nShow = Math.min(S.qubits, 5);
  _ensureQStates(nShow);

  const sim = simCircuit(_stepCursor);
  if (!sim) return;
  S.lastSim = sim;

  for (let q = 0; q < nShow; q++) {
    const bv = sim.blochVec(q), z = Math.max(-1, Math.min(1, bv.z));
    _animBlochQ(q, Math.acos(z), Math.atan2(bv.y, bv.x));
  }

  S.probs = sim.probs();

  // Update step label in control bar
  const lbl = document.getElementById('step-lbl');
  if (lbl) lbl.textContent = _stepL(`第 ${_stepCursor} / ${S.steps} 步`, `Step ${_stepCursor} / ${S.steps}`);

  // renderCirc handles renderProbChart + renderStateVec internally
  renderCirc();

  // Density matrix panel (if active)
  const dmPane = document.getElementById('sp-dm');
  if (dmPane && dmPane.classList.contains('on') && typeof renderDensityMatrix === 'function') renderDensityMatrix();

  setSBMsg(_stepL(
    _stepCursor === 0 ? '初始态 |0…0⟩' : `已执行第 ${_stepCursor} 列`,
    _stepCursor === 0 ? 'Initial state |0…0⟩' : `After column ${_stepCursor}`
  ));
}

// ─── KEYBOARD: ← → navigate, ESC exit ───
document.addEventListener('keydown', e => {
  if (!_stepMode) return;
  if (e.ctrlKey || e.metaKey) return;
  if (window.curPop) return;                                              // param popup open
  const blochZoom = document.getElementById('bloch-zoom-overlay');
  if (blochZoom && blochZoom.classList.contains('on')) return;           // Bloch zoom open
  if (e.key === 'ArrowRight') { e.preventDefault(); stepForward(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); stepBack(); }
  else if (e.key === 'Escape')  { e.preventDefault(); exitStepMode(); }
});
