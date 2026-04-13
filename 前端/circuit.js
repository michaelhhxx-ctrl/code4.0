// ── CIRCUIT EDITOR ──

const TWO_QUBIT_GATES = ['CNOT', 'CZ', 'SWAP'];
function _circL(zh, en) { return window._currentLang === 'en' ? en : zh; }

// ─── CIRCUIT RENDER ───
function updateUndoRedoBtns() {
  const u = document.getElementById('btn-undo');
  const r = document.getElementById('btn-redo');
  if (u) u.disabled = !S.hist.length;
  if (r) r.disabled = !S.redoHist.length;
}
function renderCirc() {
  if (typeof refreshCircuitValidation === 'function') refreshCircuitValidation();
  updateUndoRedoBtns();
  const el = document.getElementById('ci');
  if (!el) return;
  el.innerHTML = '';
  for (let q = 0; q < S.qubits; q++) {
    const row = document.createElement('div'); row.className = 'qrow';
    const lbl = document.createElement('div'); lbl.className = 'qlbl'; lbl.textContent = `|q${q}⟩`;
    row.appendChild(lbl);
    const wire = document.createElement('div'); wire.className = 'qwire';
    const wl = document.createElement('div'); wl.className = 'wl'; wire.appendChild(wl);
    for (let s = 0; s < S.steps; s++) {
      const slot = document.createElement('div');
      slot.className = 'ds' + (S.circ[q][s] ? ' occ' : '');
      slot.dataset.q = q; slot.dataset.s = s;
      if (typeof _stepMode !== 'undefined' && _stepMode) {
        if (s < _stepCursor)  slot.classList.add('step-past');
        if (s === _stepCursor) slot.classList.add('step-cursor');
      }
      if (S.circ[q][s]) {
        const { g, p, role } = S.circ[q][s];
        const box = document.createElement('div'); box.className = `gb ${g}`;

        if (g === 'CNOT') {
          box.textContent = (role === 'ctrl') ? '●' : '⊕';
          if (role === 'ctrl') box.classList.add('cnot-ctrl');
          if (role === 'tgt')  box.classList.add('cnot-tgt');
        } else if (g === 'CZ') {
          box.textContent = (role === 'ctrl') ? 'Z●' : 'Z';
          if (role === 'ctrl') box.classList.add('cz-ctrl');
        } else if (g === 'SWAP') {
          box.textContent = '✕';
        } else {
          box.textContent = g;
        }

        const isRot = ['Rx', 'Ry', 'Rz'].includes(g);
        if (isRot && p != null) {
          const pt = document.createElement('div'); pt.className = 'ptag'; pt.textContent = `${p}°`; box.appendChild(pt);
        }

        const del = document.createElement('div'); del.className = 'delg'; del.textContent = '✕';
        del.onclick = e => {
          e.stopPropagation(); saveHist();
          const gd = S.circ[q][s];
          if (gd && TWO_QUBIT_GATES.includes(gd.g) && gd.role) {
            const partnerQ = (gd.role === 'ctrl') ? gd.tgt : gd.ctrl;
            if (partnerQ !== undefined && S.circ[partnerQ] && S.circ[partnerQ][s]) {
              S.circ[partnerQ][s] = null;
            }
          }
          const removedGate = gd ? gd.g : null;
          S.circ[q][s] = null;
          renderCirc(); updateStats();
          if (removedGate) onGateRemoved(removedGate, q, s);
        };
        slot.appendChild(box); slot.appendChild(del);

        if (isRot) {
          const ep = document.createElement('div'); ep.className = 'editp has'; ep.textContent = 'θ';
          ep.onclick = e => { e.stopPropagation(); showParamPop(slot, q, s, p != null ? p : 90); };
          slot.appendChild(ep);
        }
      }

      // Validation highlight
      const _sv = (typeof getSlotValidation === 'function') ? getSlotValidation(q, s) : null;
      if (_sv && _sv.length > 0) {
        slot.classList.add('v-' + _sv[0].level);
        const _badge = document.createElement('div');
        _badge.className = 'v-badge ' + _sv[0].level;
        _badge.title = _sv.map(v => v.msg).join('\n');
        slot.appendChild(_badge);
      }

      slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('dov'); });
      slot.addEventListener('dragleave', () => slot.classList.remove('dov'));
      slot.addEventListener('drop', e => {
        e.preventDefault(); slot.classList.remove('dov');
        if (!S.dragGate) return;
        if (S.circ[q][s]) {
          setSBMsg(_circL('该位置已有门，请选择空槽位', 'This slot is occupied — choose an empty slot'));
          return;
        }
        saveHist();
        if (TWO_QUBIT_GATES.includes(S.dragGate)) {
          showTwoQubitTargetPicker(slot, q, s, S.dragGate);
        } else {
          const isRot = ['Rx', 'Ry', 'Rz'].includes(S.dragGate);
          S.circ[q][s] = { g: S.dragGate, p: isRot ? 90 : null };
          renderCirc(); updateStats(); onGatePlaced(S.dragGate, q, s);
          if (typeof showGateKnowledge === 'function') showGateKnowledge(S.dragGate);
          const gType = typeof S.dragGate === 'string' ? S.dragGate : (S.dragGate ? S.dragGate.dataset.g : null);
          if (gType && typeof triggerAI_onGateDrop === 'function') triggerAI_onGateDrop(gType);
        }
      });
      wire.appendChild(slot);
    }
    row.appendChild(wire); el.appendChild(row);
  }
  renderQSelBar(); renderProbQSelBar(); renderProbChart(); renderStateVec();
  requestAnimationFrame(renderCircConnectors);
  renderValidationPanel();
}

function renderCircConnectors() {
  const ci = document.getElementById('ci'); if (!ci) return;
  document.querySelectorAll('.circ-connector').forEach(el => el.remove());
  const ciRect = ci.getBoundingClientRect();
  for (let s = 0; s < S.steps; s++) {
    for (let q = 0; q < S.qubits; q++) {
      const g = S.circ[q][s];
      if (!g || g.role !== 'ctrl') continue;
      const tgtQ = g.tgt;
      if (tgtQ === undefined || tgtQ === null) continue;
      const ctrlSlot = ci.querySelector(`.ds[data-q="${q}"][data-s="${s}"]`);
      const tgtSlot  = ci.querySelector(`.ds[data-q="${tgtQ}"][data-s="${s}"]`);
      if (!ctrlSlot || !tgtSlot) continue;
      const ctrlRect = ctrlSlot.getBoundingClientRect();
      const tgtRect  = tgtSlot.getBoundingClientRect();
      const lineX    = ctrlRect.left + ctrlRect.width / 2 - ciRect.left;
      const top1     = ctrlRect.top  + ctrlRect.height / 2 - ciRect.top;
      const top2     = tgtRect.top   + tgtRect.height  / 2 - ciRect.top;
      const lineTop  = Math.min(top1, top2);
      const lineH    = Math.abs(top2 - top1);
      const line = document.createElement('div');
      line.className = 'circ-connector';
      line.style.left   = (lineX - 1) + 'px';
      line.style.top    = lineTop + 'px';
      line.style.height = lineH + 'px';
      ci.appendChild(line);
    }
  }
}

// ─── TWO-QUBIT GATE TARGET PICKER ───
function showTwoQubitTargetPicker(slot, ctrlQ, s, gateName) {
  document.querySelectorAll('.tq-picker').forEach(p => p.remove());

  const available = [];
  for (let q = 0; q < S.qubits; q++) {
    if (q !== ctrlQ && !S.circ[q][s]) available.push(q);
  }

  if (available.length === 0) {
    setSBMsg(_circL(`步骤 ${s} 中无可用目标比特，请清理该列`, `No available target qubit at step ${s}. Clear this column first.`));
    return;
  }

  const picker = document.createElement('div');
  picker.className = 'tq-picker';
  picker.innerHTML = `<div class="tq-title">${_circL('选择目标比特', 'Choose target qubit')}</div>` +
    available.map(q => `<button class="tq-btn" data-q="${q}">q${q}</button>`).join('') +
    `<button class="tq-cancel">${_circL('取消', 'Cancel')}</button>`;

  picker.querySelector('.tq-cancel').onclick = () => picker.remove();
  picker.querySelectorAll('.tq-btn').forEach(btn => {
    btn.onclick = () => {
      const tgtQ = parseInt(btn.dataset.q);
      placeTwoQubitGate(gateName, ctrlQ, tgtQ, s);
      picker.remove();
    };
  });

  // 使用 fixed 定位挂到 body，避免被父级 overflow:hidden 截断，始终显示在 slot 下方
  const slotRect = slot.getBoundingClientRect();
  picker.style.position = 'fixed';
  picker.style.left = (slotRect.left + slotRect.width / 2) + 'px';
  picker.style.transform = 'translateX(-50%)';
  picker.style.top = (slotRect.bottom + 8) + 'px';
  document.body.appendChild(picker);
  setTimeout(() => {
    document.addEventListener('click', function onOut(e) {
      if (!picker.contains(e.target)) { picker.remove(); document.removeEventListener('click', onOut); }
    });
  }, 50);
}

function placeTwoQubitGate(gateName, ctrlQ, tgtQ, s) {
  S.circ[ctrlQ][s] = { g: gateName, p: null, ctrl: ctrlQ, tgt: tgtQ, role: 'ctrl' };
  S.circ[tgtQ][s]  = { g: gateName, p: null, ctrl: ctrlQ, tgt: tgtQ, role: 'tgt'  };
  renderCirc(); updateStats(); onGatePlaced(gateName, ctrlQ, s);
  if (typeof showGateKnowledge === 'function') showGateKnowledge(gateName);
  if (typeof triggerAI_onGateDrop === 'function') triggerAI_onGateDrop(gateName);
}

// ─── PARAM POPUP ───
let curPop = null;
function showParamPop(slot, q, s, initVal) {
  document.querySelectorAll('.ppop').forEach(p => p.remove());
  const safeVal = (initVal != null && !isNaN(Number(initVal))) ? Number(initVal) : 90;

  const pop = document.createElement('div'); pop.className = 'ppop';
  pop.innerHTML = `
    <div class="ppop-label">${_circL('θ（旋转角度）', 'θ (rotation angle)')}</div>
    <div class="ppop-drag-area" title="${_circL('左右拖动调节角度', 'Drag left/right to adjust')}">
      <div class="ppop-drag-hint">${_circL('← 拖动调节 →', '← drag →')}</div>
      <div class="ppop-val-big" id="ppop-val-big">${safeVal}°</div>
    </div>
    <div class="ppop-btn-row">
      <button class="ppop-arrow" id="ppop-dec">◄</button>
      <div class="ppop-steps-grp">
        <button class="ppop-sz" data-step="0.1">0.1°</button>
        <button class="ppop-sz ppop-sz-on" data-step="1">1°</button>
        <button class="ppop-sz" data-step="10">10°</button>
      </div>
      <button class="ppop-arrow" id="ppop-inc">►</button>
    </div>
    <button class="ppop-confirm" id="ppop-confirm">${_circL('确定', 'Confirm')}</button>`;

  let val = safeVal, stepSize = 1;
  const valEl = pop.querySelector('#ppop-val-big');

  function setVal(v) {
    val = Math.min(360, Math.max(0, Math.round(v * 10) / 10));
    valEl.textContent = val + '°';
    if (S.circ[q] && S.circ[q][s]) S.circ[q][s].p = val;
  }

  // Step size toggle
  pop.querySelectorAll('.ppop-sz').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      stepSize = parseFloat(btn.dataset.step);
      pop.querySelectorAll('.ppop-sz').forEach(b => b.classList.remove('ppop-sz-on'));
      btn.classList.add('ppop-sz-on');
    });
  });

  // ±step buttons
  pop.querySelector('#ppop-dec').addEventListener('click', e => { e.stopPropagation(); setVal(val - stepSize); });
  pop.querySelector('#ppop-inc').addEventListener('click', e => { e.stopPropagation(); setVal(val + stepSize); });

  // Drag on value display
  const dragArea = pop.querySelector('.ppop-drag-area');
  let dragging = false, dragStartX = 0, dragStartVal = 0;
  dragArea.addEventListener('mousedown', e => {
    dragging = true; dragStartX = e.clientX; dragStartVal = val;
    dragArea.classList.add('ppop-dragging');
    e.preventDefault(); e.stopPropagation();
  });
  const onDragMove = e => { if (dragging) setVal(dragStartVal + (e.clientX - dragStartX) * 0.5); };
  const onDragUp   = () => { if (!dragging) return; dragging = false; dragArea.classList.remove('ppop-dragging'); };
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup',   onDragUp);

  // 触屏端：手指左右滑动调节角度（与鼠标事件完全并行，互不干扰）
  let touchDragging = false, touchStartX = 0, touchStartVal = 0;
  dragArea.addEventListener('touchstart', e => {
    touchDragging = true; touchStartX = e.touches[0].clientX; touchStartVal = val;
    dragArea.classList.add('ppop-dragging');
    e.preventDefault(); e.stopPropagation();
  }, { passive: false });
  const onTouchMove = e => {
    if (!touchDragging) return;
    e.preventDefault();
    setVal(touchStartVal + (e.touches[0].clientX - touchStartX) * 0.5);
  };
  const onTouchUp = () => { if (!touchDragging) return; touchDragging = false; dragArea.classList.remove('ppop-dragging'); };
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend',  onTouchUp);

  // Position popup using fixed coords relative to slot so parent overflow:hidden can't clip it
  const slotRect = slot.getBoundingClientRect();
  pop.style.position = 'fixed';
  pop.style.left = (slotRect.left + slotRect.width / 2) + 'px';
  pop.style.transform = 'translateX(-50%)';
  // 始终显示在 slot 下方
  pop.style.top = (slotRect.bottom + 8) + 'px';
  document.body.appendChild(pop);
  curPop = pop;

  const closePop = () => { pop.remove(); cleanup(); renderCirc(); updateBlochFromCirc(); };

  const cleanup = () => {
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup',   onDragUp);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend',  onTouchUp);
    document.removeEventListener('keydown',   _closeOnEsc);
  };
  const _closeOnEsc = e => {
    if (e.key === 'Escape') { closePop(); }
    else if (e.key === 'ArrowLeft')  { e.preventDefault(); setVal(val - stepSize); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setVal(val + stepSize); }
  };
  pop.querySelector('#ppop-confirm').addEventListener('click', e => {
    e.stopPropagation(); closePop();
  });
  setTimeout(() => {
    document.addEventListener('keydown', _closeOnEsc);
  }, 120);
}

// ─── STATS ───
function updateStats() {
  let n = 0, depth = 0;
  S.circ.forEach(row => row.forEach((g, s) => {
    if (g && g.role !== 'tgt') { n++; if (s + 1 > depth) depth = s + 1; }
  }));
  const gcLbl = document.getElementById('gcount-lbl'); if (gcLbl) gcLbl.textContent = _circL(`${n} 门`, `${n} ops`);
  const sgLbl = document.getElementById('stat-gates'); if (sgLbl) sgLbl.textContent = _circL(`${n} 门`, `${n} gates`);
  const dpLbl = document.getElementById('depth-lbl'); if (dpLbl) dpLbl.textContent = _circL(`深度 ${depth}`, `depth ${depth}`);
  const qd = document.getElementById('qcount-d'); if (qd) qd.textContent = _circL(`${S.qubits} 量子比特`, `${S.qubits} qubits`);
  updateBlochFromCirc();
  generateCodeStr();
  // 若密度矩阵面板激活则立即刷新
  const _dmP = document.getElementById('sp-dm');
  if (_dmP && _dmP.classList.contains('on') && typeof renderDensityMatrix === 'function') {
    requestAnimationFrame(renderDensityMatrix);
  }
}

// ─── DRAG & DROP ───
document.querySelectorAll('.gi').forEach(el => {
  el.addEventListener('dragstart', () => {
    S.dragGate = el.dataset.g; el.style.opacity = '0.4';
    const dg = document.getElementById('dg');
    if (dg) {
      dg.textContent = S.dragGate === 'CNOT' ? '⊕' : S.dragGate === 'SWAP' ? '✕' : S.dragGate;
      dg.style.display = 'flex';
    }
  });
  el.addEventListener('dragend', () => {
    el.style.opacity = '';
    const dg = document.getElementById('dg'); if (dg) dg.style.display = 'none';
    S.dragGate = null;
  });
});
document.addEventListener('dragover', e => {
  const dg = document.getElementById('dg');
  if (dg && dg.style.display !== 'none') { dg.style.left = e.clientX + 'px'; dg.style.top = e.clientY + 'px'; }
});

// ─── GATE PLACED / REMOVED → AI ───
window._isLoadingPreset = false;

function onGatePlaced(g, q, s) {
  explainGateAction(g, q, s, 'placed');
  setSBMsg(_circL(`q${q} ← ${g} 门`, `q${q} ← ${g} gate`));
}

// ─── HISTORY (UNDO / REDO) ───
function _snapCirc() {
  return { qubits: S.qubits, circ: S.circ.map(row => row.map(c => c ? { ...c } : null)) };
}
function saveHist() {
  S.hist.push(_snapCirc());
  if (S.hist.length > 30) S.hist.shift();
  S.redoHist = [];          // new action always clears redo stack
}
function undo() {
  if (!S.hist.length) return;
  S.redoHist.push(_snapCirc());
  const snap = S.hist.pop();
  S.qubits = snap.qubits; S.circ = snap.circ;
  renderCirc(); updateStats(); setSBMsg(_circL('已撤销', 'Undone'));
}
function redo() {
  if (!S.redoHist.length) return;
  S.hist.push(_snapCirc());
  const snap = S.redoHist.pop();
  S.qubits = snap.qubits; S.circ = snap.circ;
  renderCirc(); updateStats(); setSBMsg(_circL('已重做', 'Redone'));
}

// ─── CONTROLS ───
function addQ() {
  if (S.qubits >= 8) return;
  saveHist();
  S.qubits++; S.circ.push(Array(S.steps).fill(null));
  renderCirc(); updateStats();
}
function rmQ() {
  if (S.qubits <= 1) return;
  saveHist();
  const removedQ = S.qubits - 1;
  for (let q = 0; q < removedQ; q++) {
    for (let s = 0; s < S.steps; s++) {
      const g = S.circ[q][s];
      if (g && TWO_QUBIT_GATES.includes(g.g) && (g.ctrl === removedQ || g.tgt === removedQ)) {
        S.circ[q][s] = null;
      }
    }
  }
  S.qubits--; S.circ.pop();
  if (S.selQ >= S.qubits) S.selQ = S.qubits - 1;
  renderCirc(); updateStats();
}
function clearCircuit() { saveHist(); initCirc(); renderCirc(); updateStats(); animBloch(0, 0); setSBMsg(_circL('线路已清空', 'Circuit cleared')); }

// ─── PRESETS ───
function loadPreset(name) {
  window._isLoadingPreset = true;
  saveHist(); initCirc();
  if (name === 'bell') {
    if (S.qubits < 2) { S.qubits = 2; S.circ.push(Array(S.steps).fill(null)); }
    S.circ[0][0] = { g: 'H', p: null };
    S.circ[0][1] = { g: 'CNOT', p: null, ctrl: 0, tgt: 1, role: 'ctrl' };
    S.circ[1][1] = { g: 'CNOT', p: null, ctrl: 0, tgt: 1, role: 'tgt'  };
    S.circ[0][2] = { g: 'M', p: null };
    S.circ[1][2] = { g: 'M', p: null };
    addMsg(_circL('已加载 <b>Bell 态</b>：H 门创造叠加，CNOT 产生纠缠。最终态为 <span class="fm">(|00⟩+|11⟩)/√2</span>，两粒子完全纠缠。', 'Loaded <b>Bell state</b>: the H gate creates superposition and CNOT creates entanglement. The final state is <span class="fm">(|00⟩+|11⟩)/√2</span>, the canonical two-qubit entangled pair.'));
  } else if (name === 'ghz') {
    if (S.qubits < 3) { S.qubits = 3; while (S.circ.length < 3) S.circ.push(Array(S.steps).fill(null)); }
    S.circ[0][0] = { g: 'H', p: null };
    S.circ[0][1] = { g: 'CNOT', p: null, ctrl: 0, tgt: 1, role: 'ctrl' };
    S.circ[1][1] = { g: 'CNOT', p: null, ctrl: 0, tgt: 1, role: 'tgt'  };
    S.circ[0][2] = { g: 'CNOT', p: null, ctrl: 0, tgt: 2, role: 'ctrl' };
    S.circ[2][2] = { g: 'CNOT', p: null, ctrl: 0, tgt: 2, role: 'tgt'  };
    addMsg(_circL('已加载 <b>GHZ 态</b>：三体最大纠缠态 <span class="fm">(|000⟩+|111⟩)/√2</span>，可用来展示多体量子非局域性。', 'Loaded <b>GHZ state</b>: the three-qubit maximally entangled state <span class="fm">(|000⟩+|111⟩)/√2</span>, useful for demonstrating multi-particle nonlocality.'));
  } else if (name === 'qft') {
    S.circ[0][0] = { g: 'H', p: null }; S.circ[0][1] = { g: 'S', p: null }; S.circ[0][2] = { g: 'T', p: null };
    S.circ[1][1] = { g: 'H', p: null }; S.circ[1][2] = { g: 'S', p: null };
    S.circ[2][2] = { g: 'H', p: null };
    addMsg(_circL('已加载 <b>量子傅里叶变换（QFT）</b>：它是 Shor 因式分解和量子相位估计的核心子程序。', 'Loaded <b>Quantum Fourier Transform (QFT)</b>: a core subroutine in Shor’s factoring algorithm and quantum phase estimation.'));
  } else if (name === 'grover') {
    S.circ[0][0] = { g: 'H', p: null }; S.circ[1][0] = { g: 'H', p: null };
    S.circ[0][1] = { g: 'Z', p: null }; S.circ[1][1] = { g: 'Z', p: null };
    S.circ[0][2] = { g: 'CNOT', p: null, ctrl: 0, tgt: 1, role: 'ctrl' };
    S.circ[1][2] = { g: 'CNOT', p: null, ctrl: 0, tgt: 1, role: 'tgt'  };
    S.circ[0][3] = { g: 'H', p: null }; S.circ[1][3] = { g: 'H', p: null };
    addMsg(_circL('已加载 <b>Grover 搜索算法</b>：其核心由 Oracle 与扩散算子组成，可把无结构搜索从 O(N) 加速到 O(√N)。', 'Loaded <b>Grover search</b>: its core consists of an oracle and a diffusion operator, reducing unstructured search from O(N) to O(√N).'));
  }
  S.currentPreset = name;   // 记录当前预设，供实验报告使用
  window._isLoadingPreset = false;
  renderCirc(); updateStats();
}

// ─── VALIDATION PANEL ───
function renderValidationPanel() {
  const panel = document.getElementById('cval-panel');
  if (!panel) return;
  const v = S.validation;
  if (!v || (v.summary.errorCount === 0 && v.summary.warningCount === 0 && v.summary.infoCount === 0)) {
    panel.className = 'cval-panel hidden'; return;
  }
  const { errors, warnings, infos, summary } = v;
  let tier, icon, hdr;
  if (summary.errorCount > 0) {
    tier = 'has-error'; icon = '✕';
    hdr = summary.errorCount === 1
      ? _circL('1 个错误', '1 error')
      : _circL(`${summary.errorCount} 个错误`, `${summary.errorCount} errors`);
    if (summary.warningCount > 0)
      hdr += _circL(`，${summary.warningCount} 个警告`, `, ${summary.warningCount} warnings`);
  } else if (summary.warningCount > 0) {
    tier = 'has-warning'; icon = '△';
    hdr = summary.warningCount === 1
      ? _circL('1 个警告', '1 warning')
      : _circL(`${summary.warningCount} 个警告`, `${summary.warningCount} warnings`);
  } else {
    tier = 'has-info'; icon = 'ℹ';
    hdr = _circL('提示', 'Info');
  }
  const items = [
    ...errors.map(e   => `<div class="cval-item error">${escHtml(e.msg)}</div>`),
    ...warnings.map(w => `<div class="cval-item warning">${escHtml(w.msg)}</div>`),
    ...infos.map(i    => `<div class="cval-item info">${escHtml(i.msg)}</div>`),
  ].join('');
  panel.className = `cval-panel ${tier}`;
  panel.innerHTML =
    `<div class="cval-hdr"><span>${icon}</span><span>${escHtml(hdr)}</span></div>` +
    `<div class="cval-body">${items}</div>`;
}

function refreshCircuitI18n() {
  renderCirc();
  updateStats();
}
window.refreshCircuitI18n = refreshCircuitI18n;
window.refreshCircuitI18N = refreshCircuitI18n;

// ── 量子门知识点数据库 ──
const GATE_KNOWLEDGE = {
  'H':    { name:'Hadamard门（H门）',    math:'H|0⟩=(|0⟩+|1⟩)/√2',   bloch:'绕X+Z轴旋转180°，北极→赤道',              use:'构建叠加态 · QFT起始步 · 纠缠第一步',      chapter:'量子计算导论 第3章 · 量子叠加态' },
  'X':    { name:'Pauli-X门（量子NOT）', math:'X|0⟩=|1⟩, X|1⟩=|0⟩',  bloch:'绕X轴旋转180°，北极↔南极',               use:'初态制备 · 量子纠错 · 翻转比特',           chapter:'量子计算导论 第3章 · 单比特量子门' },
  'Y':    { name:'Pauli-Y门',            math:'Y=iXZ',                  bloch:'绕Y轴旋转180°',                           use:'量子纠错码 · 参数化线路',                  chapter:'量子计算导论 第3章 · 单比特量子门' },
  'Z':    { name:'Pauli-Z门（相位翻转）',math:'Z|0⟩=|0⟩, Z|1⟩=-|1⟩', bloch:'绕Z轴旋转180°（相位翻转）',              use:'相位标记 · Grover Oracle · 量子纠错',     chapter:'量子计算导论 第3章 · 单比特量子门' },
  'S':    { name:'S门（√Z）',            math:'S=diag(1,i)',             bloch:'绕Z轴旋转90°',                            use:'T门的平方 · QFT相位调制',                 chapter:'量子计算导论 第3章 · 相位门' },
  'T':    { name:'T门（π/8门）',         math:'T=diag(1,e^{iπ/4})',     bloch:'绕Z轴旋转45°',                            use:'量子计算通用门集 · 量子纠错',             chapter:'量子计算导论 第3章 · 通用量子门' },
  'Rx':   { name:'X轴旋转门（Rx）',      math:'Rx(θ)=exp(-iθX/2)',      bloch:'绕Bloch球X轴旋转θ角',                    use:'VQE参数化Ansatz · 量子机器学习',          chapter:'量子计算导论 第3章 · 参数化量子门' },
  'Ry':   { name:'Y轴旋转门（Ry）',      math:'Ry(θ)=exp(-iθY/2)',      bloch:'绕Bloch球Y轴旋转θ角，保持实系数',        use:'VQE Ansatz主力 · 实振幅量子线路',         chapter:'量子计算导论 第3章 · 参数化量子门' },
  'Rz':   { name:'Z轴旋转门（Rz）',      math:'Rz(θ)=exp(-iθZ/2)',      bloch:'绕Bloch球Z轴旋转θ角（相位旋转）',        use:'QFT相位调制 · 量子相位估计',             chapter:'量子计算导论 第3章 · 参数化量子门' },
  'CNOT': { name:'受控非门（CNOT）',      math:'|c,t⟩→|c,t⊕c⟩',        bloch:'双比特操作，产生量子纠缠',                use:'产生Bell态 · 量子隐形传态 · 量子纠错',   chapter:'量子计算导论 第4章 · 双比特门与量子纠缠' },
  'CZ':   { name:'受控Z门（CZ）',         math:'CZ|11⟩=-|11⟩',           bloch:'仅|11⟩态获得-1相位',                     use:'图态制备 · 拓扑量子计算 · 量子纠错',     chapter:'量子计算导论 第4章 · 双比特量子门' },
  'SWAP': { name:'SWAP门',               math:'SWAP|ab⟩=|ba⟩',          bloch:'交换两量子比特全部状态',                  use:'量子路由 · 量子网络 · 线路优化',         chapter:'量子计算导论 第4章 · 双比特量子门' },
  'M':    { name:'测量门',               math:'P(0)=|α|², P(1)=|β|²',  bloch:'矢量坍缩至北极（|0⟩）或南极（|1⟩）',   use:'读取量子计算结果 · 量子密钥分发',        chapter:'量子计算导论 第5章 · 量子测量' },
};

let _knowledgeTimer = null;
function showGateKnowledge(g) {
  const k = GATE_KNOWLEDGE[g];
  if (!k) return;
  let el = document.getElementById('gate-knowledge-card');
  if (!el) {
    el = document.createElement('div');
    el.id = 'gate-knowledge-card';
    el.style.cssText = [
      'position:fixed', 'top:56px', 'right:12px', 'z-index:1500',
      'background:var(--white)', 'border:1px solid var(--b1)', 'border-radius:8px',
      'padding:10px 14px', 'max-width:290px', 'min-width:220px',
      'box-shadow:0 4px 20px rgba(0,0,0,.18)',
      'font-size:12px', 'line-height:1.75',
      'transition:opacity .3s', 'pointer-events:none'
    ].join(';');
    document.body.appendChild(el);
  }
  el.innerHTML = `
    <div style="font-weight:600;color:var(--navy);margin-bottom:5px;font-size:13px">📖 ${k.name}</div>
    <div style="font-family:var(--mono);color:var(--t7);margin-bottom:4px;font-size:11px">${k.math}</div>
    <div style="color:var(--t5);margin-bottom:3px"><b>Bloch球：</b>${k.bloch}</div>
    <div style="color:var(--t5);margin-bottom:4px"><b>应用场景：</b>${k.use}</div>
    <div style="color:var(--teal);font-size:11px;border-top:1px solid var(--b1);padding-top:4px;margin-top:4px">📘 ${k.chapter}</div>`;
  el.style.opacity = '1';
  el.style.display = 'block';
  clearTimeout(_knowledgeTimer);
  _knowledgeTimer = setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => { if (el) el.style.display = 'none'; }, 300);
  }, 5000);
}
