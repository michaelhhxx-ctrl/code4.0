// ── QUANTUM SIMULATOR ──

// ════════════════════════════════════════════════════════════
//  QSim — 前端量子态向量模拟器（最大 8 量子比特）
// ════════════════════════════════════════════════════════════
function _simL(zh, en) { return window._currentLang === 'en' ? en : zh; }

// ─── 未保存警告（beforeunload）───
let _savedCircJson = null;
function _getCircJson() {
  if (!window.S || !S.circ) return '[]';
  return JSON.stringify(S.circ.map((row, q) => row.map((g, s) => g ? { qubit: q, step: s, ...g } : null).filter(Boolean)).flat());
}
function setCircSaved() { _savedCircJson = _getCircJson(); }

class QSim {
  constructor(n) {
    this.n = n; this.dim = 1 << n;
    this.re = new Float64Array(this.dim);
    this.im = new Float64Array(this.dim);
    this.re[0] = 1;
  }
  clone() { const s = new QSim(this.n); s.re.set(this.re); s.im.set(this.im); return s; }

  // 单量子比特门：[[ar+iai, br+ibi],[cr+ici, dr+idi]]
  _g1(q, ar, ai, br, bi, cr, ci, dr, di) {
    const bit = 1 << (this.n - 1 - q);
    for (let i = 0; i < this.dim; i++) {
      if (i & bit) continue; const j = i | bit;
      const xr = this.re[i], xi = this.im[i], yr = this.re[j], yi = this.im[j];
      this.re[i] = ar * xr - ai * xi + br * yr - bi * yi;
      this.im[i] = ar * xi + ai * xr + br * yi + bi * yr;
      this.re[j] = cr * xr - ci * xi + dr * yr - di * yi;
      this.im[j] = cr * xi + ci * xr + dr * yi + di * yr;
    }
  }

  // 单量子比特门（标准矩阵）
  H(q)  { const f = Math.SQRT1_2; this._g1(q, f,0, f,0, f,0,-f,0); }
  X(q)  { this._g1(q, 0,0, 1,0, 1,0, 0,0); }
  Y(q)  { this._g1(q, 0,0, 0,-1, 0,1, 0,0); }
  Z(q)  { this._g1(q, 1,0, 0,0, 0,0,-1,0); }
  S(q)  { this._g1(q, 1,0, 0,0, 0,0, 0,1); }   // [[1,0],[0,i]]
  T(q)  { const c = Math.SQRT1_2, s = Math.SQRT1_2; this._g1(q, 1,0, 0,0, 0,0, c,s); }  // [[1,0],[0,e^{iπ/4}]]
  Rx(q, t) { const c = Math.cos(t/2), s = Math.sin(t/2); this._g1(q, c,0, 0,-s, 0,-s, c,0); }
  Ry(q, t) { const c = Math.cos(t/2), s = Math.sin(t/2); this._g1(q, c,0,-s,0, s,0, c,0); }
  Rz(q, t) { const c = Math.cos(t/2), s = Math.sin(t/2); this._g1(q, c,-s, 0,0, 0,0, c,s); }

  // 双量子比特门
  CNOT(ctrl, tgt) {
    const cb = 1 << (this.n - 1 - ctrl), tb = 1 << (this.n - 1 - tgt);
    for (let i = 0; i < this.dim; i++) {
      if (!(i & cb) || (i & tb)) continue; const j = i | tb;
      let t = this.re[i]; this.re[i] = this.re[j]; this.re[j] = t;
      t = this.im[i]; this.im[i] = this.im[j]; this.im[j] = t;
    }
  }
  CZ(q1, q2) {
    const b1 = 1 << (this.n - 1 - q1), b2 = 1 << (this.n - 1 - q2);
    for (let i = 0; i < this.dim; i++) {
      if ((i & b1) && (i & b2)) { this.re[i] = -this.re[i]; this.im[i] = -this.im[i]; }
    }
  }
  SWAP(q1, q2) {
    const b1 = 1 << (this.n - 1 - q1), b2 = 1 << (this.n - 1 - q2);
    for (let i = 0; i < this.dim; i++) {
      if (!((i & b1) && !(i & b2))) continue; const j = (i ^ b1) | b2;
      let t = this.re[i]; this.re[i] = this.re[j]; this.re[j] = t;
      t = this.im[i]; this.im[i] = this.im[j]; this.im[j] = t;
    }
  }

  probs() {
    return Array.from({ length: this.dim }, (_, i) => this.re[i] * this.re[i] + this.im[i] * this.im[i]);
  }

  // 单量子比特约化密度矩阵 → {r00,r11,r01r,r01i}
  rho1(q) {
    const bit = 1 << (this.n - 1 - q);
    let r00 = 0, r11 = 0, r01r = 0, r01i = 0;
    for (let i = 0; i < this.dim; i++) {
      if (i & bit) continue; const j = i | bit;
      r00  += this.re[i] * this.re[i] + this.im[i] * this.im[i];
      r11  += this.re[j] * this.re[j] + this.im[j] * this.im[j];
      r01r += this.re[i] * this.re[j] + this.im[i] * this.im[j];
      r01i += this.im[i] * this.re[j] - this.re[i] * this.im[j];
    }
    return { r00, r11, r01r, r01i };
  }

  // 从约化密度矩阵计算 Bloch 矢量 (x, y, z)
  blochVec(q) {
    const { r00, r11, r01r, r01i } = this.rho1(q);
    return { x: 2 * r01r, y: -2 * r01i, z: r00 - r11 };
  }

  // 冯诺依曼熵（衡量与剩余系统的纠缠量）
  entropy(q) {
    const { r00, r11, r01r, r01i } = this.rho1(q);
    const det = r00 * r11 - r01r * r01r - r01i * r01i;
    const disc = Math.max(0, 1 - 4 * Math.max(0, det));
    const lp = (1 + Math.sqrt(disc)) / 2, lm = Math.max(0, 1 - lp);
    const xlx = x => x < 1e-12 ? 0 : -x * Math.log2(x);
    return xlx(lp) + xlx(lm);
  }

  // 完整密度矩阵 ρ = |ψ⟩⟨ψ|
  densityMatrix() {
    const d = this.dim, re = new Float64Array(d * d), im = new Float64Array(d * d);
    for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) {
      re[i * d + j] = this.re[i] * this.re[j] + this.im[i] * this.im[j];
      im[i * d + j] = this.im[i] * this.re[j] - this.re[i] * this.im[j];
    }
    return { re, im, dim: d };
  }

  // 约化密度矩阵（Partial Trace）：保留 keepQubits，trace out 其余比特
  reducedDM(keepQubits) {
    const n = this.n;
    const traceQubits = [];
    for (let q = 0; q < n; q++) if (!keepQubits.includes(q)) traceQubits.push(q);
    const km = keepQubits.length, kd = 1 << km;
    const tm = traceQubits.length, td = 1 << tm;
    const re = new Float64Array(kd * kd), im = new Float64Array(kd * kd);
    const embed = (x, k) => {
      let idx = 0;
      for (let q = 0; q < n; q++) {
        const ki = keepQubits.indexOf(q), ti = traceQubits.indexOf(q);
        const bit = ki >= 0 ? (x >> (km - 1 - ki)) & 1 : (k >> (tm - 1 - ti)) & 1;
        idx |= (bit << (n - 1 - q));
      }
      return idx;
    };
    for (let i = 0; i < kd; i++) for (let j = 0; j < kd; j++) {
      let sr = 0, si = 0;
      for (let k = 0; k < td; k++) {
        const a = embed(i, k), b = embed(j, k);
        sr += this.re[a] * this.re[b] + this.im[a] * this.im[b];
        si += this.im[a] * this.re[b] - this.re[a] * this.im[b];
      }
      re[i * kd + j] = sr; im[i * kd + j] = si;
    }
    return { re, im, dim: kd, keepQubits };
  }
}

// ─── CIRCUIT SIMULATION ───
// 模拟当前线路 S，最多到第 upTo 步（含）
function simCircuit(upTo = Infinity) {
  if (S.qubits > 8) return null;
  const sim = new QSim(S.qubits);
  for (let s = 0; s < S.steps && s < upTo; s++) {
    // 旧格式兼容：若无 role 字段，收集同步骤的双量子比特门对
    const legacyPairs = { CNOT: [], CZ: [], SWAP: [] };
    for (let q = 0; q < S.qubits; q++) {
      const g = S.circ[q][s];
      if (g && !g.role && legacyPairs[g.g]) legacyPairs[g.g].push(q);
    }

    for (let q = 0; q < S.qubits; q++) {
      const gate = S.circ[q][s]; if (!gate) continue;
      // 目标位标记：不执行门操作，由控制位统一处理
      if (gate.role === 'tgt') continue;

      const rad = (gate.p != null) ? gate.p * Math.PI / 180 : 0;

      if (gate.g === 'CNOT') {
        if (gate.role === 'ctrl') {
          // 新格式：使用显式 ctrl/tgt
          sim.CNOT(gate.ctrl, gate.tgt);
        } else if (!gate.role && legacyPairs.CNOT.length >= 2 && legacyPairs.CNOT[0] === q) {
          // 旧格式兼容：根据同步骤配对检测
          sim.CNOT(legacyPairs.CNOT[0], legacyPairs.CNOT[1]);
        }
      } else if (gate.g === 'CZ') {
        if (gate.role === 'ctrl') {
          sim.CZ(gate.ctrl, gate.tgt);
        } else if (!gate.role && legacyPairs.CZ.length >= 2 && legacyPairs.CZ[0] === q) {
          sim.CZ(legacyPairs.CZ[0], legacyPairs.CZ[1]);
        }
      } else if (gate.g === 'SWAP') {
        if (gate.role === 'ctrl') {
          sim.SWAP(gate.ctrl, gate.tgt);
        } else if (!gate.role && legacyPairs.SWAP.length >= 2 && legacyPairs.SWAP[0] === q) {
          sim.SWAP(legacyPairs.SWAP[0], legacyPairs.SWAP[1]);
        }
      } else if (gate.g !== 'M') {
        switch (gate.g) {
          case 'H':  sim.H(q); break;
          case 'X':  sim.X(q); break;
          case 'Y':  sim.Y(q); break;
          case 'Z':  sim.Z(q); break;
          case 'S':  sim.S(q); break;
          case 'T':  sim.T(q); break;
          case 'Rx': sim.Rx(q, rad); break;
          case 'Ry': sim.Ry(q, rad); break;
          case 'Rz': sim.Rz(q, rad); break;
        }
      }
    }
  }
  return sim;
}

// ─── SP TAB SWITCHER ───
function switchSpTab(tab, el) {
  document.querySelectorAll('.sp-tab').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  document.querySelectorAll('.sp-pane').forEach(p => p.classList.remove('on'));
  document.getElementById('sp-' + tab).classList.add('on');
  if (tab === 'dm') requestAnimationFrame(renderDensityMatrix);
  if (tab === 'ent') requestAnimationFrame(renderEntanglement);
}

// ─── DENSITY MATRIX ───
function _dmDefaultKeep(n) {
  return Array.from({ length: Math.min(n, 3) }, (_, i) => i);
}

function renderDensityMatrix() {
  try {
    if (S.simSource === null && S.lastSim === null) {
      ['dm-cv','dm-cv-im'].forEach(id => {
        const cv = document.getElementById(id); if (!cv) return;
        const ctx = setupHiDPICanvas(cv, 260, 36);
        ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, 0, 260, 36);
        ctx.fillStyle = '#334155'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
        ctx.fillText(window._currentLang === 'en' ? 'Click "Run Sim" to see results' : '请先点击"运行模拟"查看结果', 130, 22);
      });
      return;
    }
    const sim = simCircuit();
    if (!sim) return;
    if (window._dmKeepQubits) {
      const valid = window._dmKeepQubits.filter(q => q < S.qubits);
      window._dmKeepQubits = valid.length > 0 ? valid : null;
    }
    const keep = window._dmKeepQubits || _dmDefaultKeep(S.qubits);
    const mat = sim.reducedDM(keep);
    _drawDMCanvas('dm-cv', mat, false);
    _drawDMCanvas('dm-cv-im', mat, true);
    const note = document.getElementById('dm-note'); if (note) note.style.display = 'block';
    renderDMQSelBar();
    _initDMHover();
  } catch(e) {
    console.error('[DM]', e);
  }
}

function renderDMQSelBar() {
  const bar = document.getElementById('dm-qsel-bar'); if (!bar) return;
  bar.innerHTML = '';
  const keep = window._dmKeepQubits || _dmDefaultKeep(S.qubits);
  for (let q = 0; q < S.qubits; q++) {
    const btn = document.createElement('div');
    const on = keep.includes(q);
    btn.className = 'dm-qsb' + (on ? ' on' : '');
    btn.textContent = `q${q}`;
    btn.onclick = () => {
      let k = [...(window._dmKeepQubits || _dmDefaultKeep(S.qubits))];
      if (k.includes(q)) { if (k.length > 1) k = k.filter(x => x !== q); }
      else { if (k.length < 4) { k.push(q); k.sort((a, b) => a - b); } }
      window._dmKeepQubits = k;
      renderDMQSelBar(); renderDensityMatrix();
    };
    bar.appendChild(btn);
  }
}

function _drawDMCanvas(cvId, matrix, useIm) {
  const cv = document.getElementById(cvId); if (!cv) return;
  const { re, im, dim, keepQubits } = matrix;
  const data = useIm ? im : re;
  let mx = 0; for (let i = 0; i < dim * dim; i++) mx = Math.max(mx, Math.abs(data[i]));
  mx = Math.max(mx, 0.001);
  const dmWrap = document.getElementById('dm-wrap');
  const wrapW = (dmWrap && dmWrap.clientWidth > 0) ? dmWrap.clientWidth : (cv.parentElement.clientWidth || 280);
  const maxW = wrapW - 16;
  const cell = Math.max(8, Math.floor((maxW - 32) / dim));
  const ox = 28, oy = 4;
  const W = cell * dim + ox + 4, H = cell * dim + oy + 24;
  const ctx = setupHiDPICanvas(cv, W, H);
  ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H);
  const km = keepQubits.length;
  const basisLabels = Array.from({ length: dim }, (_, i) => '|' + i.toString(2).padStart(km, '0') + '⟩');
  for (let i = 0; i < dim; i++) for (let j = 0; j < dim; j++) {
    const v = data[i * dim + j], x = ox + j * cell, y = oy + i * cell;
    const t = Math.abs(v) / mx;
    let r, g, b;
    if (v >= 0) { r = Math.round(235 - 185 * t); g = Math.round(242 - 155 * t); b = 255; }
    else { r = 255; g = Math.round(242 - 155 * t); b = Math.round(235 - 185 * t); }
    ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(x, y, cell - 1, cell - 1);
    if (cell >= 18 && Math.abs(v) > 0.005) {
      ctx.fillStyle = t > 0.55 ? '#fff' : '#334155';
      ctx.font = `${Math.min(10, cell / 1.8)}px 'JetBrains Mono',monospace`; ctx.textAlign = 'center';
      ctx.fillText(v.toFixed(2), x + cell / 2, y + cell / 2 + 3);
    }
  }
  for (let i = 0; i < dim; i++) {
    ctx.fillStyle = '#334155'; ctx.font = "10px 'JetBrains Mono',monospace"; ctx.textAlign = 'right';
    ctx.fillText(basisLabels[i], ox - 2, oy + i * cell + cell / 2 + 3);
  }
  // 存储元数据供 hover 使用
  cv._dmMeta = { cell, ox, oy, dim, re, im, keepQubits, basisLabels };
}

function _initDMHover() {
  ['dm-cv', 'dm-cv-im'].forEach(id => {
    const cv = document.getElementById(id); if (!cv) return;
    cv.onmousemove = e => {
      const meta = cv._dmMeta; if (!meta) return;
      const rect = cv.getBoundingClientRect();
      const cssZoom = rect.width / (meta.cell * meta.dim + meta.ox + 4);
      const mx = (e.clientX - rect.left) / cssZoom;
      const my = (e.clientY - rect.top) / cssZoom;
      const col = Math.floor((mx - meta.ox) / meta.cell);
      const row = Math.floor((my - meta.oy) / meta.cell);
      if (col < 0 || col >= meta.dim || row < 0 || row >= meta.dim) { _hideDMTooltip(); return; }
      _showDMTooltip(e, meta, row, col);
    };
    cv.onmouseleave = _hideDMTooltip;
  });
}

function _showDMTooltip(e, meta, row, col) {
  const tip = document.getElementById('dm-tooltip'); if (!tip) return;
  const re = meta.re[row * meta.dim + col];
  const im = meta.im[row * meta.dim + col];
  const mag = Math.sqrt(re * re + im * im);
  const phase = (Math.atan2(im, re) * 180 / Math.PI).toFixed(1);
  const rLabel = meta.basisLabels[row], cLabel = meta.basisLabels[col];
  const isDiag = row === col;
  const rho_ii = meta.re[row * meta.dim + row], rho_jj = meta.re[col * meta.dim + col];
  const coherence = (rho_ii > 0 && rho_jj > 0) ? (mag / Math.sqrt(rho_ii * rho_jj)).toFixed(3) : '—';
  const _en = window._currentLang === 'en';
  tip.innerHTML = `
    <div class="dmt-title">ρ[${rLabel}, ${cLabel}]</div>
    <div class="dmt-row"><span>${_en ? 'Real Re' : '实部 Re'}</span><span>${re.toFixed(4)}</span></div>
    <div class="dmt-row"><span>${_en ? 'Imag Im' : '虚部 Im'}</span><span>${im.toFixed(4)}</span></div>
    <div class="dmt-row"><span>${_en ? 'Mag |ρ|' : '模 |ρ|'}</span><span>${mag.toFixed(4)}</span></div>
    <div class="dmt-row"><span>${_en ? 'Phase arg' : '相位 arg'}</span><span>${phase}°</span></div>
    ${!isDiag ? `<div class="dmt-row"><span>${_en ? 'Coherence' : '相干强度'}</span><span>${coherence}</span></div>` : ''}
    <div class="dmt-type">${isDiag ? (_en ? 'Diagonal: P(' + rLabel + ')' : '对角元：测量概率 P(' + rLabel + ')') : (_en ? 'Off-diag: coherence' : '非对角元：量子相干')}</div>
  `;
  tip.style.display = 'block';
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  const x = (e.clientX - tw - 14 >= 0) ? e.clientX - tw - 14 : e.clientX + 14;
  const y = (e.clientY + th + 10 <= window.innerHeight) ? e.clientY + 10 : e.clientY - th - 10;
  tip.style.left = x + 'px';
  tip.style.top  = y + 'px';
}
function _hideDMTooltip() {
  const tip = document.getElementById('dm-tooltip');
  if (tip) tip.style.display = 'none';
}
function getThemeVar(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

// ─── ENTANGLEMENT VISUALIZATION ───
function renderEntanglement() {
  const cv = document.getElementById('ent-cv'); if (!cv) return;
  const n = S.qubits;
  let gc = 0; S.circ.forEach(r => r.forEach(g => { if (g && g.role !== 'tgt') gc++; }));
  if (S.simSource === null && S.lastSim === null && gc > 0) {
    const ctx = setupHiDPICanvas(cv, 240, 40); ctx.clearRect(0, 0, 240, 40);
    ctx.fillStyle = '#475569'; ctx.font = "13px 'JetBrains Mono',monospace"; ctx.textAlign = 'center';
    ctx.fillText(window._currentLang === 'en' ? 'Click "Run Sim" to see results' : '请先点击"运行模拟"查看结果', 120, 22); return;
  }
  if (gc === 0 || n < 1) {
    const ctx = setupHiDPICanvas(cv, 240, 40); ctx.clearRect(0, 0, 240, 40);
    ctx.fillStyle = '#475569'; ctx.font = "13px 'JetBrains Mono',monospace"; ctx.textAlign = 'center';
    ctx.fillText(_simL('请先在线路中放置量子门', 'Place gates on the circuit first'), 120, 22); return;
  }
  const sim = simCircuit(); if (!sim) return;
  const entropies = Array.from({ length: n }, (_, q) => sim.entropy(q));
  const W = cv.parentElement.clientWidth || 240;
  const H = Math.max(80, 40 + n * 6);
  const ctx = setupHiDPICanvas(cv, W, H); ctx.clearRect(0, 0, W, H);
  const _entTh = document.documentElement.getAttribute('data-theme');
  const _entLblColor = (_entTh==='dark'||_entTh==='aurora') ? '#CBD5E1' : _entTh==='amber' ? '#D8C4A8' : '#334155';
  const nodeY = H - 28, spacing = W / (n + 1);
  const nodeX = Array.from({ length: n }, (_, i) => (i + 1) * spacing);
  for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) {
    const ent = Math.min(entropies[i], entropies[j]);
    if (ent < 0.03) continue;
    const alpha = Math.min(1, ent * 1.8);
    const hue = Math.round(250 - ent * 100);
    ctx.beginPath(); ctx.moveTo(nodeX[i], nodeY);
    ctx.quadraticCurveTo((nodeX[i] + nodeX[j]) / 2, nodeY - 20 - 12 * (j - i), nodeX[j], nodeY);
    ctx.strokeStyle = `hsla(${hue},65%,55%,${alpha})`; ctx.lineWidth = 1 + ent * 3; ctx.stroke();
  }
  entropies.forEach((ent, i) => {
    const x = nodeX[i];
    const hue = Math.round(250 - ent * 100);
    const col = ent > 0.03 ? `hsl(${hue},65%,50%)` : '#94A3B8';
    ctx.beginPath(); ctx.arc(x, nodeY, 10, 0, Math.PI * 2);
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = "bold 11px 'JetBrains Mono',monospace"; ctx.textAlign = 'center';
    ctx.fillText(i, x, nodeY + 4);
    ctx.fillStyle = _entLblColor; ctx.font = "10px 'JetBrains Mono',monospace";
    ctx.fillText('q' + i, x, nodeY + 22);
  });
  const detail = document.getElementById('ent-detail');
  if (detail) {
    detail.innerHTML = entropies.map((e, i) =>
      `q${i}: S=${e.toFixed(3)} ${e > 0.5 ? '■■■' : e > 0.15 ? '■■ ' : e > 0.03 ? '■  ' : '   '}${e > 0.5 ? tr('sim.ent.strong') : e > 0.15 ? tr('sim.ent.medium') : e > 0.03 ? tr('sim.ent.weak') : tr('sim.ent.none')}`
    ).join('<br>');
  }
}

// ─── RUN SIMULATION（统一上限 8 qubits）───
async function runSim() {
  if (typeof refreshCircuitValidation === 'function') refreshCircuitValidation();
  const _val = S.validation;
  if (_val && _val.summary.blocking) {
    const msg = _val.errors[0]?.msg || _simL('线路存在错误，无法运行', 'Circuit has errors and cannot be executed');
    setSBMsg(msg); addMsg(msg); return;
  }
  const btn = document.querySelector('.crun');
  const origText = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.classList.add('running'); btn.textContent = _simL('运行中...', 'Running...'); }
  setSBMsg(_simL('模拟运行中...', 'Running simulation...'));
  let gc = 0; S.circ.forEach(r => r.forEach(g => { if (g && g.role !== 'tgt') gc++; }));
  const circJson = S.circ.map((row, q) => row.map((g, s) => g ? { qubit: q, step: s, ...g } : null).filter(Boolean)).flat();
  try {
    const result = await API.simulate(circJson, S.qubits);
    if (result) {
      if (result.bloch && result.bloch[S.selQ]) {
        const b = result.bloch[S.selQ];
        animBloch(Math.acos(Math.max(-1, Math.min(1, b.z))), Math.atan2(b.y, b.x));
      }
      if (result.probabilities) { S.probs = result.probabilities; renderProbQSelBar(); renderProbChart(); renderStateVec(); }
      S.simSource = 'backend'; _updateSimSrcLabel();
      const _dmP = document.getElementById('sp-dm');
      if (_dmP && _dmP.classList.contains('on')) renderDensityMatrix();
      addMsg(_simL(`[Qiskit AerSimulator] 模拟完成，线路深度 ${result.depth || gc}，共 ${gc} 个门操作。Bloch 坐标与概率分布来自后端精确计算。`, `[Qiskit AerSimulator] Simulation finished. Circuit depth: ${result.depth || gc}, total gate operations: ${gc}. The Bloch coordinates and probability distribution were computed precisely by the backend.`));
      setSBMsg(_simL('模拟完成 · Qiskit', 'Simulation complete · Qiskit'));
    } else {
      updateBlochFromCirc(true);
      S.simSource = 'local'; _updateSimSrcLabel();
      addMsg(_simL(`[本地精确模拟] 完成，${gc} 个门操作。后端未连接，使用前端态向量模拟器。`, `[Local exact simulation] Completed with ${gc} gate operations. Backend unavailable; using the frontend state-vector simulator.`));
      setSBMsg(_simL('模拟完成（本地精确）', 'Simulation complete (local exact mode)'));
    }
    recordSimHistory();
    if (typeof triggerAI_afterRun === 'function') triggerAI_afterRun();
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('running'); btn.textContent = origText; }
  }
}

// ─── 记录模拟历史 ───
function recordSimHistory() {
  const user = Auth.currentUser(); if (!user) return;
  let gc = 0; S.circ.forEach(r => r.forEach(g => { if (g && g.role !== 'tgt') gc++; }));
  UserData.addHistory({ ts: Date.now(), desc: _simL(`运行量子模拟（${gc} 门，${S.qubits} 比特）`, `Ran a quantum simulation (${gc} gates, ${S.qubits} qubits)`), type: 'sim' });
}

window.addEventListener('beforeunload', e => {
  const current = _getCircJson();
  if (current !== '[]' && current !== _savedCircJson) {
    e.preventDefault();
    e.returnValue = '';
  }
});

function refreshSimI18n() {
  const dm = document.getElementById('sp-dm');
  const ent = document.getElementById('sp-ent');
  if (dm && dm.classList.contains('on')) renderDensityMatrix();
  if (ent && ent.classList.contains('on')) renderEntanglement();
}
window.refreshSimI18n = refreshSimI18n;
window.refreshSimI18N = refreshSimI18n;
