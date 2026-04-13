// ── VQE EXPERIMENT ──

let vqeData = [], vqeRunning = false, vqeTimer = null, curMol = 'H2';
function _vqeL(zh, en) { return window.isEnglish?.() ? en : zh; }

// ── Landscape request token (race-condition prevention) ──────────────────────
// Each call to _startLandscape() increments this counter and captures the value.
// The async result is only applied if the token still matches, discarding any
// response from a previous (stale) request.
let _lsToken = 0;

// ── _startLandscape ─────────────────────────────────────────────────────────
// Sets up the 3D landscape for a new VQE run.
//
// Visualisation strategy (2D slice)
// ───────────────────────────────────
// The backend sweeps θ₁ = theta[0] and θ₂ = theta[1] over [0, 2π] on a
// resolution×resolution grid; all other parameters are fixed at theta_ref
// (zero-padded to the full ansatz dimension).  This gives a representative
// cross-section of the optimisation landscape without requiring a full
// high-dimensional scan.
//
// Race-condition safety
// ──────────────────────
// _lsToken is incremented each call.  If a newer call fires before the backend
// responds to an earlier one, the stale result is silently discarded.
//
// Fallback strategy
// ─────────────────
// An analytical approximate surface is applied immediately so the canvas is
// never blank, then replaced by the real backend surface once it arrives.
// The fallback is always labelled "⚠ approximate" in the UI; the backend
// surface is labelled "(θ₁/θ₂ slice)" to clarify its 2D nature.
async function _startLandscape(molecule, ansatzType, depth) {
  if (!window.VQELandscape) return;

  const myToken = ++_lsToken;           // claim a new token

  const cv = document.getElementById('vqe3dcv');
  if (!cv) return;

  // ① Initialise / reset Three.js scene
  VQELandscape.init(cv);

  // ② Immediately apply local fallback so the canvas is never empty
  const fallback = VQELandscape.buildFallbackData(molecule, 16);
  VQELandscape.setLandscape(fallback, 'approximate');

  // ③ Request real landscape from backend (async)
  const params = {
    molecule,
    ansatz_type:  ansatzType,
    ansatz_depth: depth,
    resolution:   16,
    theta_ref:    [],   // no prior params yet; backend uses zeros for fixed axes
  };
  const data = await API.fetchLandscape(params);

  // ④ Discard if a newer request was issued while we were waiting
  if (myToken !== _lsToken) return;

  // ⑤ Upgrade to real landscape if successful (trajectory is re-mapped inside)
  if (data && Array.isArray(data.grid) && data.grid.length) {
    VQELandscape.setLandscape(data, 'backend');
  }
  // else: keep the fallback that was already applied in step ②
}

function updateVQEText() {
  const veExact = document.getElementById('ve-exact');
  if (veExact) veExact.textContent = _vqeL(`精确值: ${EXACT[curMol]}`, `Exact: ${EXACT[curMol]}`);
  const veErr = document.getElementById('ve-err');
  if (veErr && (veErr.textContent === '—' || veErr.textContent === 'Error: —' || veErr.textContent === '误差: —')) {
    veErr.textContent = _vqeL('误差: —', 'Error: —');
  }
}

function selMol(el, mol) {
  document.querySelectorAll('.mb').forEach(b => b.classList.remove('on'));
  el.classList.add('on'); curMol = mol;
  updateVQEText();
}

function startVQE() {
  if (vqeRunning) return;
  vqeRunning = true; vqeData = [];
  const btn = document.getElementById('vrun-btn');
  if (btn) { btn.textContent = _vqeL('⏸ 优化中...', '⏸ Optimizing...'); btn.disabled = true; }
  const vlog = document.getElementById('vlog'); if (vlog) vlog.innerHTML = '';
  const bwarn = document.getElementById('bwarn'); if (bwarn) bwarn.style.display = 'none';

  const maxIterVal = parseInt(document.getElementById('vqe-inp-iter')?.value || '80', 10);
  const optimizer  = document.getElementById('vqe-sel-opt')?.value || 'COBYLA';
  const depth      = parseInt(document.getElementById('vqe-inp-depth')?.value || '2', 10);
  const ansatzType = document.getElementById('vqe-sel-type')?.value || 'Hardware-Efficient';

  // Start landscape scene (async; applies fallback immediately, upgrades if backend responds)
  _startLandscape(curMol, ansatzType, depth);

  const wsParams = { molecule: curMol, optimizer, max_iter: maxIterVal, ansatz_depth: depth, ansatz_type: ansatzType };
  const wsOk = API.startVQEws(wsParams,
    d => {
      vqeData.push(d.energy); drawVQEChart();
      const veVal = document.getElementById('ve-val'); if (veVal) veVal.textContent = d.energy.toFixed(6);
      const vIter = document.getElementById('v-iter'); if (vIter) vIter.textContent = d.iter;
      const exact = EXACT[curMol];
      const err = Math.abs((d.energy - exact) / exact * 100);
      const veErr = document.getElementById('ve-err'); if (veErr) veErr.textContent = _vqeL(`误差: ${err.toFixed(3)}%`, `Error: ${err.toFixed(3)}%`);
      const vAcc = document.getElementById('v-acc'); if (vAcc) vAcc.textContent = err.toFixed(2) + '%';
      const vStatus = document.getElementById('v-status');
      if (vStatus) { vStatus.textContent = _vqeL('优化中', 'Optimizing'); vStatus.style.color = '#92580A'; }
      if (d.gradients) d.gradients.slice(0, 4).forEach((g, i) => {
        const el = document.getElementById(`g${i+1}`);
        if (el) { el.textContent = g.toFixed(5); el.style.color = Math.abs(g) < 0.005 ? '#276749' : '#475569'; }
      });
      // Forward backend theta2d + energy to 3D landscape.
      // theta2d = [theta_before[0], theta_before[1]] — the parameter snapshot
      // BEFORE the optimizer step; d.energy = E(theta_before).
      // Using the pre-update snapshot ensures the trajectory point sits at the
      // exact height on the landscape surface (no off-by-one-step misalignment).
      // d.params_all carries the full theta_before vector and is available for
      // future landscape re-slicing; not yet consumed by the frontend.
      if (window.VQELandscape && Array.isArray(d.theta2d) && d.theta2d.length >= 2) {
        VQELandscape.addPoint(d.theta2d, d.energy);
      }
    },
    () => {
      vqeRunning = false;
      if (btn) { btn.textContent = _vqeL('▶ 重新优化', '▶ Run again'); btn.disabled = false; }
      const vStatus = document.getElementById('v-status');
      if (vStatus) { vStatus.textContent = _vqeL('已收敛', 'Converged'); vStatus.style.color = '#276749'; }
    },
    (errMsg) => {
      if (errMsg) setSBMsg(_vqeL(`VQE 错误: ${errMsg}`, `VQE error: ${errMsg}`));
      if (!vqeTimer) startVQELocal();
    }
  );
  if (!wsOk) startVQELocal();
}

function startVQELocal() {
  if (vqeTimer) { clearInterval(vqeTimer); vqeTimer = null; }
  vqeRunning = true;

  const btn = document.getElementById('vrun-btn');
  if (btn) { btn.textContent = _vqeL('⏸ 优化中（本地）...', '⏸ Optimizing (local)...'); btn.disabled = true; }

  const exact = EXACT[curMol];
  const start = exact + 0.7 + Math.random() * 0.4;
  let it = 0;
  const maxIt = parseInt(document.getElementById('vqe-inp-iter')?.value || '80', 10);

  // Simulated parameter trajectory for 3D landscape display.
  // Starts away from the fallback minimum (θ₁=θ₂=0) and converges toward it,
  // mirroring the energy descent produced by the local energy simulation below.
  // The fallback formula has its minimum at (0,0), so gradient descent in that
  // space is sin-based: Δθ ∝ −sin(θ).
  let _lt1 = (1.2 + Math.random()) * Math.PI;  // start ∈ (1.2π, 2.2π)
  let _lt2 = (1.0 + Math.random()) * Math.PI;

  // Start landscape for local run (applies fallback immediately)
  if (window.VQELandscape) {
    const ansatzType = document.getElementById('vqe-sel-type')?.value || 'Hardware-Efficient';
    const depth      = parseInt(document.getElementById('vqe-inp-depth')?.value || '2', 10);
    _startLandscape(curMol, ansatzType, depth);
  }

  vqeTimer = setInterval(() => {
    const veVal   = document.getElementById('ve-val');
    const vIter   = document.getElementById('v-iter');
    const veErr   = document.getElementById('ve-err');
    const vAcc    = document.getElementById('v-acc');
    const vStatus = document.getElementById('v-status');
    const bwarn   = document.getElementById('bwarn');
    const vlog    = document.getElementById('vlog');

    const prog = it / maxIt;
    const noise = (1 - prog) * 0.12 * (Math.random() - 0.5);
    const e = exact + (start - exact) * Math.exp(-4 * prog) + noise;
    vqeData.push(e); drawVQEChart();

    if (veVal) veVal.textContent = e.toFixed(6);
    if (vIter) vIter.textContent = it + 1;
    const err = Math.abs((e - exact) / exact * 100);
    if (veErr) veErr.textContent = _vqeL(`误差: ${err.toFixed(3)}%`, `Error: ${err.toFixed(3)}%`);
    if (vAcc)  vAcc.textContent = err.toFixed(2) + '%';
    if (vStatus) {
      vStatus.textContent = it < maxIt - 6 ? _vqeL('优化中（本地）', 'Optimizing (local)') : _vqeL('已收敛', 'Converged');
      vStatus.style.color  = it < maxIt - 6 ? '#92580A' : '#276749';
    }
    const gScale = 1 - prog;
    ['g1','g2','g3','g4'].forEach(id => {
      const g = (gScale * (Math.random() - 0.5) * 0.4).toFixed(5);
      const el = document.getElementById(id);
      if (el) { el.textContent = g; el.style.color = Math.abs(parseFloat(g)) < 0.005 ? '#276749' : '#475569'; }
    });
    if (prog > 0.6 && gScale < 0.15 && bwarn) bwarn.style.display = 'block';

    // Simulate θ₁, θ₂ converging toward the fallback minimum at (0, 0).
    // Uses simple gradient descent on the fallback formula's analytic gradient:
    //   ∂E/∂θ₁ ≈ a·sin(θ₁)  →  θ₁ -= lr·a·sin(θ₁) + noise
    // This keeps the simulated trajectory physically coherent with the displayed
    // fallback landscape even without a real backend.
    const lr = 0.30 * (1 - prog);
    _lt1 = ((_lt1 - lr * Math.sin(_lt1) + (Math.random() - 0.5) * 0.18 * (1 - prog)) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    _lt2 = ((_lt2 - lr * Math.sin(_lt2) + (Math.random() - 0.5) * 0.15 * (1 - prog)) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    if (window.VQELandscape) VQELandscape.addPoint([_lt1, _lt2], e);

    if (it % 5 === 0 && vlog) {
      const line = document.createElement('div');
      line.className = 'il' + (it >= maxIt - 6 ? ' ilc' : '');
      line.textContent = _vqeL(
        `iter ${String(it+1).padStart(3,'0')} | E = ${e.toFixed(6)} Ha | Δ = ${Math.abs(noise).toFixed(6)}`,
        `iter ${String(it+1).padStart(3,'0')} | E = ${e.toFixed(6)} Ha | Δ = ${Math.abs(noise).toFixed(6)}`
      );
      vlog.appendChild(line); vlog.scrollTop = vlog.scrollHeight;
    }
    it++;
    if (it >= maxIt) {
      clearInterval(vqeTimer); vqeTimer = null; vqeRunning = false;
      const btnFinal = document.getElementById('vrun-btn');
      if (btnFinal) { btnFinal.textContent = _vqeL('▶ 重新优化', '▶ Run again'); btnFinal.disabled = false; }
    }
  }, 90);
}

function drawVQEChart() {
  const cv = document.getElementById('vqecv'); if (!cv) return;
  const col = cv.parentElement;
  // Keep the convergence chart compact — it sits below the 260 px 3D canvas,
  // so it should be a secondary visual, not dominate the column.
  const W = col.clientWidth - 28, H = Math.max(120, Math.min(150, Math.round(W * 0.42)));
  const ctx = setupHiDPICanvas(cv, W, H); if (!ctx) return;
  ctx.clearRect(0, 0, W, H);
  const _th = document.documentElement.getAttribute('data-theme') || 'classic';
  const _chartTheme = {
    classic: { bg:'#F7F8FB', grid:'#E2E8F0', label:'#64748B', exact:'#276749', areaTop:'rgba(27,58,107,0.12)', areaBottom:'rgba(27,58,107,0.01)', line:'#1B3A6B', point:'#1B3A6B' },
    dark:    { bg:'#172135', grid:'rgba(148,163,184,0.18)', label:'#94A3B8', exact:'#4ADE80', areaTop:'rgba(74,134,232,0.18)', areaBottom:'rgba(74,134,232,0.02)', line:'#4A86E8', point:'#7FB3FF' },
    aurora:  { bg:'#1C1248', grid:'rgba(180,159,255,0.16)', label:'#C4B5FD', exact:'#4ADE80', areaTop:'rgba(155,127,255,0.18)', areaBottom:'rgba(155,127,255,0.02)', line:'#9B7FFF', point:'#C4B5FD' },
    amber:   { bg:'#13161C', grid:'rgba(255,176,92,0.12)', label:'#B49B7B', exact:'#8FB676', areaTop:'rgba(247,168,77,0.18)', areaBottom:'rgba(247,168,77,0.02)', line:'#F7A84D', point:'#FFCC8A' }
  }[_th] || { bg:'#F7F8FB', grid:'#E2E8F0', label:'#64748B', exact:'#276749', areaTop:'rgba(27,58,107,0.12)', areaBottom:'rgba(27,58,107,0.01)', line:'#1B3A6B', point:'#1B3A6B' };
  ctx.fillStyle = _chartTheme.bg; ctx.fillRect(0, 0, W, H);
  const data = vqeData; if (data.length < 2) return;
  const ex = EXACT[curMol];
  const minE = Math.min(...data, ex) - 0.08, maxE = Math.max(...data) + 0.08;
  const L = 54, R = 12, B = 20;
  const toX = i => L + (W-L-R) * (i / (data.length-1));
  const toY = e => H*0.9 - (H*0.8) * (e - minE) / (maxE - minE);
  const MF = "'JetBrains Mono',monospace";
  for (let i = 0; i <= 4; i++) {
    const y = H*0.1 + (H*0.8) * (i/4);
    ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(W-R, y);
    ctx.strokeStyle = _chartTheme.grid; ctx.lineWidth = 1; ctx.stroke();
    const val = (maxE - (maxE-minE) * (i/4)).toFixed(3);
    ctx.fillStyle = _chartTheme.label; ctx.font = `11px ${MF}`; ctx.textAlign = 'right'; ctx.fillText(val, L-4, y+4);
  }
  const exY = toY(ex);
  ctx.beginPath(); ctx.moveTo(L, exY); ctx.lineTo(W-R, exY);
  ctx.strokeStyle = _chartTheme.exact; ctx.lineWidth = 1.5; ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = _chartTheme.exact; ctx.font = `bold 11px ${MF}`; ctx.textAlign = 'left'; ctx.fillText(`E₀=${ex}`, L+4, exY-4);
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, _chartTheme.areaTop); grd.addColorStop(1, _chartTheme.areaBottom);
  ctx.beginPath(); data.forEach((e, i) => i === 0 ? ctx.moveTo(toX(i), toY(e)) : ctx.lineTo(toX(i), toY(e)));
  ctx.lineTo(toX(data.length-1), H); ctx.lineTo(toX(0), H); ctx.closePath();
  ctx.fillStyle = grd; ctx.fill();
  ctx.beginPath(); data.forEach((e, i) => i === 0 ? ctx.moveTo(toX(i), toY(e)) : ctx.lineTo(toX(i), toY(e)));
  ctx.strokeStyle = _chartTheme.line; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.arc(toX(data.length-1), toY(data[data.length-1]), 5, 0, Math.PI*2);
  ctx.fillStyle = _chartTheme.point; ctx.fill();
  ctx.fillStyle = _chartTheme.label; ctx.font = `11px ${MF}`; ctx.textAlign = 'center';
  ctx.fillText(_vqeL('迭代步数', 'Iterations'), W/2, H-4);
}

function refreshVQEI18n() {
  updateVQEText();
  const btn = document.getElementById('vrun-btn');
  if (btn && !vqeRunning) btn.textContent = _vqeL('▶ 开始 VQE 优化', '▶ Start VQE optimization');
  const vStatus = document.getElementById('v-status');
  if (vStatus && (vStatus.textContent === '待开始' || vStatus.textContent === 'Pending')) vStatus.textContent = _vqeL('待开始', 'Pending');
  // New elements in vqecol-2
  const col2hd = document.getElementById('vqe-col2-hd');
  if (col2hd) col2hd.textContent = _vqeL('能量景观 & 收敛曲线', 'Energy Landscape & Convergence');
  const hint = document.getElementById('vqe3d-hint');
  if (hint) hint.textContent = _vqeL('θ₁/θ₂ 切片 · 拖拽旋转 · 滚轮缩放', 'θ₁/θ₂ slice · Drag to rotate · Scroll to zoom');
  // Refresh 3D scene status text (i18n-aware via VQELandscape.refreshTheme)
  window.VQELandscape?.refreshTheme?.();
  if (vqeData.length > 1) drawVQEChart();
}
window.refreshVQEI18n = refreshVQEI18n;
window.refreshVQEI18N = refreshVQEI18n;

function refreshVQEAnsatzLabel() {
  const depth = parseInt(document.getElementById('vqe-inp-depth')?.value || '2');
  const el = document.querySelector('#vqecol-3 > div:nth-of-type(2)');
  if (el && typeof window.tr === 'function') el.textContent = window.tr('vqe.ansatz.subtitle', {depth});
}
window.refreshVQEAnsatzLabel = refreshVQEAnsatzLabel;
