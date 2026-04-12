// ── CODE GENERATION ──

function _codeL(zh, en) { return window.isEnglish?.() ? en : zh; }

function htmlToPlainText(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent;
}

function generateCodeStr() {
  let ops = [];
  S.circ.forEach((row, q) => row.forEach((g, s) => {
    if (g && g.role !== 'tgt') ops.push({ q, s, g: g.g, p: g.p, ctrl: g.ctrl, tgt: g.tgt, role: g.role });
  }));
  ops.sort((a, b) => a.s - b.s || a.q - b.q);

  const locale = window.isEnglish?.() ? 'en-US' : 'zh-CN';
  const qiskitLabel = _codeL('测量结果:', 'Measurement results:');
  const mindLabel = _codeL('量子态向量:', 'State vector:');

  let qiskit = `<span class="cc"># Q-Edu auto-generated · Qiskit · ${new Date().toLocaleDateString(locale)}</span>\n`;
  qiskit += `<span class="ck">from</span> <span class="cs">qiskit</span> <span class="ck">import</span> QuantumCircuit, transpile\n`;
  qiskit += `<span class="ck">from</span> <span class="cs">qiskit_aer</span> <span class="ck">import</span> AerSimulator\n\n`;
  qiskit += `<span class="cc"># Initialize a ${S.qubits}-qubit circuit</span>\n`;
  qiskit += `qc = QuantumCircuit(<span class="cn">${S.qubits}</span>, <span class="cn">${S.qubits}</span>)\n\n`;
  if (ops.length === 0) qiskit += `<span class="cc"># The circuit is empty. Add gates first.</span>\n`;

  ops.forEach(o => {
    const pc = `<span class="cn">${o.q}</span>`;
    const ctrlIdx = (o.ctrl !== undefined) ? o.ctrl : (o.q > 0 ? o.q - 1 : 0);
    const tgtIdx  = (o.tgt  !== undefined) ? o.tgt  : o.q;
    const ctrlSpan = `<span class="cn">${ctrlIdx}</span>`;
    const tgtSpan  = `<span class="cn">${tgtIdx}</span>`;

    if      (o.g === 'H')    qiskit += `<span class="cf">qc.h</span>(${pc})`;
    else if (o.g === 'X')    qiskit += `qc.x(${pc})`;
    else if (o.g === 'Y')    qiskit += `qc.y(${pc})`;
    else if (o.g === 'Z')    qiskit += `qc.z(${pc})`;
    else if (o.g === 'S')    qiskit += `qc.s(${pc})`;
    else if (o.g === 'T')    qiskit += `qc.t(${pc})`;
    else if (o.g === 'CNOT') qiskit += `qc.cx(${ctrlSpan}, ${tgtSpan})`;
    else if (o.g === 'CZ')   qiskit += `qc.cz(${ctrlSpan}, ${tgtSpan})`;
    else if (o.g === 'SWAP') qiskit += `qc.swap(${ctrlSpan}, ${tgtSpan})`;
    else if (o.g === 'Rx')   qiskit += `qc.rx(<span class="cn">${((o.p ?? 90) * Math.PI / 180).toFixed(4)}</span>, ${pc})`;
    else if (o.g === 'Ry')   qiskit += `qc.ry(<span class="cn">${((o.p ?? 90) * Math.PI / 180).toFixed(4)}</span>, ${pc})`;
    else if (o.g === 'Rz')   qiskit += `qc.rz(<span class="cn">${((o.p ?? 90) * Math.PI / 180).toFixed(4)}</span>, ${pc})`;
    else if (o.g === 'M')    qiskit += `qc.measure(${pc}, ${pc})`;
    qiskit += ` <span class="cc"># step ${o.s}</span>\n`;
  });

  const hasMeasure = ops.some(o => o.g === 'M');
  qiskit += `\n<span class="cc"># Run simulation</span>\n`;
  if (!hasMeasure) qiskit += `qc.measure_all()\n`;
  qiskit += `sim = AerSimulator()\n`;
  qiskit += `job = sim.run(transpile(qc, sim), shots=<span class="cn">1024</span>)\n`;
  qiskit += `counts = job.result().get_counts()\n`;
  qiskit += `<span class="cf">print</span>(<span class="cs">"${qiskitLabel}"</span>, counts)`;

  let mind = `<span class="cc"># Q-Edu auto-generated · MindQuantum · ${new Date().toLocaleDateString(locale)}</span>\n`;
  mind += `<span class="ck">import</span> mindquantum <span class="ck">as</span> mq\n`;
  mind += `<span class="ck">from</span> mindquantum.core.circuit <span class="ck">import</span> Circuit\n`;
  mind += `<span class="ck">from</span> mindquantum.core.gates <span class="ck">import</span> H, X, Y, Z, S, T, CNOT, CZ, SWAP, RX, RY, RZ\n`;
  mind += `<span class="ck">from</span> mindquantum.core.gates <span class="ck">import</span> Measure\n`;
  mind += `<span class="ck">from</span> mindquantum.simulator <span class="ck">import</span> Simulator\n\n`;
  mind += `circ = Circuit()\n`;

  ops.forEach(o => {
    const ctrlIdx = (o.ctrl !== undefined) ? o.ctrl : (o.q > 0 ? o.q - 1 : 0);
    const tgtIdx  = (o.tgt  !== undefined) ? o.tgt  : o.q;

    if      (o.g === 'H')    mind += `circ += H.on(<span class="cn">${o.q}</span>)`;
    else if (o.g === 'X')    mind += `circ += X.on(<span class="cn">${o.q}</span>)`;
    else if (o.g === 'Y')    mind += `circ += Y.on(<span class="cn">${o.q}</span>)`;
    else if (o.g === 'Z')    mind += `circ += Z.on(<span class="cn">${o.q}</span>)`;
    else if (o.g === 'S')    mind += `circ += S.on(<span class="cn">${o.q}</span>)`;
    else if (o.g === 'T')    mind += `circ += T.on(<span class="cn">${o.q}</span>)`;
    else if (o.g === 'CNOT') mind += `circ += CNOT.on(<span class="cn">${tgtIdx}</span>, <span class="cn">${ctrlIdx}</span>)`;
    else if (o.g === 'CZ')   mind += `circ += CZ.on(<span class="cn">${tgtIdx}</span>, <span class="cn">${ctrlIdx}</span>)`;
    else if (o.g === 'SWAP') mind += `circ += SWAP.on([<span class="cn">${ctrlIdx}</span>, <span class="cn">${tgtIdx}</span>])`;
    else if (o.g === 'M')    mind += `circ += Measure(<span class="cn">${o.q}</span>)`;
    else if (o.g === 'Rx')   mind += `circ += RX(<span class="cn">${((o.p ?? 90) * Math.PI / 180).toFixed(4)}</span>).on(<span class="cn">${o.q}</span>)`;
    else if (o.g === 'Ry')   mind += `circ += RY(<span class="cn">${((o.p ?? 90) * Math.PI / 180).toFixed(4)}</span>).on(<span class="cn">${o.q}</span>)`;
    else if (o.g === 'Rz')   mind += `circ += RZ(<span class="cn">${((o.p ?? 90) * Math.PI / 180).toFixed(4)}</span>).on(<span class="cn">${o.q}</span>)`;
    mind += `\n`;
  });

  mind += `\n<span class="cf">print</span>(circ)\n`;
  mind += `sim = Simulator(<span class="cs">'mqvector'</span>, circ.n_qubits)\n`;
  mind += `sim.apply_circuit(circ)\n`;
  mind += `qs = sim.get_qs()\n`;
  mind += `<span class="cf">print</span>(<span class="cs">"${mindLabel}"</span>, qs)`;

  window._code = { qiskit, mind };
  window._rawCode = {
    qiskit: htmlToPlainText(qiskit),
    mind:   htmlToPlainText(mind)
  };
}

function openModal() {
  const _val = S.validation || (typeof refreshCircuitValidation === 'function' ? refreshCircuitValidation() : null);
  if (_val && _val.summary.blocking) {
    const msg = _val.errors[0]?.msg || _codeL('线路存在错误，请先修正后再导出', 'Circuit has errors — fix them before exporting');
    setSBMsg(msg); return;
  }
  generateCodeStr();
  const carea = document.getElementById('carea');
  if (carea) carea.innerHTML = window._code?.qiskit || '';
  document.getElementById('mbg').classList.add('op');
}
function closeModal() { document.getElementById('mbg').classList.remove('op'); }
function switchTab(tab, el) {
  S.codeTab = tab;
  document.querySelectorAll('.mt').forEach(t => t.classList.remove('on')); el.classList.add('on');
  const carea = document.getElementById('carea');
  if (carea) carea.innerHTML = tab === 'qiskit' ? (window._code?.qiskit || '') : (window._code?.mind || '');
}
function copyCode(evtOrBtn) {
  generateCodeStr();
  const raw = S.codeTab === 'qiskit' ? window._rawCode?.qiskit : window._rawCode?.mind;
  const txt = raw || htmlToPlainText(document.getElementById('carea').innerHTML || '');
  const btn = (evtOrBtn instanceof Event ? evtOrBtn.target : evtOrBtn)
    || document.querySelector('.cpybtn');
  const copiedText = _codeL('✓ 已复制', '✓ Copied');
  const normalText = _codeL('复制代码', 'Copy Code');
  const markCopied = () => {
    if (btn) { btn.textContent = copiedText; setTimeout(() => btn.textContent = normalText, 1500); }
  };
  navigator.clipboard.writeText(txt).then(markCopied).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = txt; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    markCopied();
  });
}

function refreshCodegenI18n() {
  if (document.getElementById('mbg')?.classList.contains('op')) {
    generateCodeStr();
    const carea = document.getElementById('carea');
    if (carea) carea.innerHTML = S.codeTab === 'mind' ? (window._code?.mind || '') : (window._code?.qiskit || '');
  }
}
window.refreshCodegenI18n = refreshCodegenI18n;
window.refreshCodegenI18N = refreshCodegenI18n;
