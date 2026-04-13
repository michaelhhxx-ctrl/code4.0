// ── STEP REPLAY ──

function _replayL(zh, en) { return (typeof window.isEnglish === 'function' && window.isEnglish()) || window._currentLang === 'en' ? en : zh; }

let _replayRunning = false, _replayTimer = null;

function replayButtonLabel(mode) {
  if (mode === 'idle') return _replayL('▷ 逐步播放', '▷ Step Replay');
  if (mode === 'running') return _replayL('⏹ 停止播放', '⏹ Stop Replay');
  return _replayL('▷ 逐步播放', '▷ Step Replay');
}

function startReplay() {
  if (typeof _stepMode !== 'undefined' && _stepMode) return;
  if (_replayRunning) {
    clearTimeout(_replayTimer); _replayRunning = false;
    const btn = document.getElementById('replay-btn');
    if (btn) {
      btn.textContent = replayButtonLabel('idle');
      btn.classList.remove('active');
    }
    return;
  }
  const steps = [];
  for (let s = 0; s < S.steps; s++) {
    const sg = [];
    for (let q = 0; q < S.qubits; q++) if (S.circ[q][s]) sg.push({ q, s, ...S.circ[q][s] });
    if (sg.length) steps.push(sg);
  }
  if (!steps.length) { setSBMsg(_replayL('线路为空，无法播放', 'The circuit is empty and cannot be replayed')); return; }
  _replayRunning = true;
  const btn = document.getElementById('replay-btn');
  btn.textContent = replayButtonLabel('running'); btn.classList.add('active');
  const saved = S.circ.map(r => r.map(g => g ? { ...g } : null));
  for (let q = 0; q < S.qubits; q++) S.circ[q] = Array(S.steps).fill(null);
  renderCirc(); updateStats(); animBloch(0, 0);
  let idx = 0;
  function next() {
    if (!_replayRunning || idx >= steps.length) {
      S.circ = saved; renderCirc(); updateStats(); updateBlochFromCirc();
      _replayRunning = false; btn.textContent = replayButtonLabel('idle'); btn.classList.remove('active');
      setSBMsg(_replayL('回放完成', 'Replay finished')); return;
    }
    steps[idx].forEach(g => {
      const entry = { g: g.g, p: g.p };
      if (g.ctrl !== undefined) entry.ctrl = g.ctrl;
      if (g.tgt  !== undefined) entry.tgt = g.tgt;
      if (g.role !== undefined) entry.role = g.role;
      S.circ[g.q][g.s] = entry;
    });
    renderCirc(); updateStats(); updateBlochFromCirc(true);
    if (document.getElementById('sp-dm')?.classList.contains('on')) renderDensityMatrix();
    if (document.getElementById('sp-ent')?.classList.contains('on')) renderEntanglement();
    setSBMsg(_replayL(
      `回放 ${idx + 1}/${steps.length}: ${steps[idx].map(g => g.g).join('+')} 门`,
      `Replay ${idx + 1}/${steps.length}: ${steps[idx].map(g => g.g).join('+')} gate(s)`
    ));
    idx++; _replayTimer = setTimeout(next, 700);
  }
  next();
}

function refreshReplayI18n() {
  const btn = document.getElementById('replay-btn');
  if (!btn) return;
  if (_replayRunning) btn.textContent = replayButtonLabel('running');
  else btn.textContent = replayButtonLabel('idle');
}
window.refreshReplayI18n = refreshReplayI18n;
window.refreshReplayI18N = refreshReplayI18n;
