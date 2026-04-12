// ── 实验报告生成器 (report.js) ──
// 职责：收集当前页面数据，构建 HTML 报告，直接下载为 PDF 文件
// 依赖：state.js(S), circuit.js(S.circ), bloch.js, codegen.js(window._rawCode)
//       html2canvas 1.4.1 + jsPDF 2.5.1（CDN，在 index.html 中加载）

// ─── 双语文本常量 ───
const REPORT_I18N = {
  zh: {
    reportTitle:      '量子实验报告',
    platform:         'Q-Edu 量子计算教育平台',
    generatedAt:      '生成时间',
    scope:            '本报告仅覆盖电路（Circuit）视图数据',
    // 区块标题
    sec_overview:     '实验概况',
    sec_circuit:      '量子线路图',
    sec_sim:          '仿真结果',
    sec_bloch:        '量子比特状态（Bloch 球）',
    sec_validation:   '线路验证报告',
    sec_code:         '生成代码（Qiskit）',
    // 概况字段
    ov_preset:        '实验预设',
    ov_qubits:        '量子比特数',
    ov_steps:         '时间步数',
    ov_total_gates:   '总门数',
    ov_two_qubit:     '双比特门数',
    ov_measure:       '测量门数',
    ov_sim_status:    '仿真状态',
    // 预设名称
    preset_bell:      'Bell 态（双比特最大纠缠）',
    preset_ghz:       'GHZ 态（三体最大纠缠）',
    preset_qft:       '量子傅里叶变换（QFT）',
    preset_grover:    'Grover 搜索算法',
    preset_blank:     '空白线路（自定义）',
    preset_unknown:   '自定义线路',
    // 仿真
    sim_done:         '已完成',
    sim_none:         '未运行',
    sim_basis:        '基态',
    sim_prob:         '概率',
    sim_amplitude:    '振幅（实部 + 虚部·i）',
    sim_no_data:      '尚未运行仿真，请先点击「运行」',
    // Bloch
    bloch_qubit:      '量子比特',
    bloch_theta:      'θ（极角）',
    bloch_phi:        'φ（方位角）',
    bloch_no_data:    '尚未运行仿真，Bloch 球数据不可用',
    // 验证
    val_error:        '错误',
    val_warning:      '警告',
    val_info:         '提示',
    val_clean:        '线路无错误、无警告',
    val_no_data:      '尚未执行验证',
    val_at:           '位于',
    // 代码
    code_no_data:     '尚未生成代码，请先点击「导出代码」',
    // 通用
    no_data:          '— 暂无数据 —',
    empty_circuit:    '空白线路',
    qubit_abbr:       '比特',
    step_abbr:        '步',
    // 下载状态
    report_generating: '正在生成报告，请稍候…',
    report_done:       '报告已下载',
    report_error:      '生成报告失败，请重试',
    report_lib_missing:'PDF 库尚未加载，请检查网络后刷新页面',
  },
  en: {
    reportTitle:      'Quantum Experiment Report',
    platform:         'Q-Edu Quantum Computing Education Platform',
    generatedAt:      'Generated at',
    scope:            'This report covers the Circuit view only',
    sec_overview:     'Experiment Overview',
    sec_circuit:      'Quantum Circuit Diagram',
    sec_sim:          'Simulation Results',
    sec_bloch:        'Qubit States (Bloch Sphere)',
    sec_validation:   'Circuit Validation Report',
    sec_code:         'Generated Code (Qiskit)',
    ov_preset:        'Preset',
    ov_qubits:        'Qubits',
    ov_steps:         'Time Steps',
    ov_total_gates:   'Total Gates',
    ov_two_qubit:     'Two-Qubit Gates',
    ov_measure:       'Measurements',
    ov_sim_status:    'Simulation',
    preset_bell:      'Bell State (Two-Qubit Max Entanglement)',
    preset_ghz:       'GHZ State (Three-Qubit Max Entanglement)',
    preset_qft:       'Quantum Fourier Transform (QFT)',
    preset_grover:    'Grover Search Algorithm',
    preset_blank:     'Blank Circuit (Custom)',
    preset_unknown:   'Custom Circuit',
    sim_done:         'Completed',
    sim_none:         'Not run',
    sim_basis:        'Basis State',
    sim_prob:         'Probability',
    sim_amplitude:    'Amplitude (Re + Im·i)',
    sim_no_data:      'Simulation not run. Please click "Run" first.',
    bloch_qubit:      'Qubit',
    bloch_theta:      'θ (Polar)',
    bloch_phi:        'φ (Azimuthal)',
    bloch_no_data:    'Simulation not run. Bloch sphere data unavailable.',
    val_error:        'Error',
    val_warning:      'Warning',
    val_info:         'Info',
    val_clean:        'No errors or warnings',
    val_no_data:      'Validation not yet run',
    val_at:           'at',
    code_no_data:     'Code not yet generated. Please open "Export Code" first.',
    no_data:          '— No data —',
    empty_circuit:    'Empty circuit',
    qubit_abbr:       'qubits',
    step_abbr:        'steps',
    // download status
    report_generating: 'Generating report, please wait…',
    report_done:       'Report downloaded',
    report_error:      'Failed to generate report. Please try again.',
    report_lib_missing:'PDF library not loaded. Please check network and refresh.',
  },
};

// ─── 辅助：当前语言文本 ───
function _rL(key) {
  const lang = (typeof _currentLang !== 'undefined' && _currentLang === 'en') ? 'en' : 'zh';
  return REPORT_I18N[lang][key] || key;
}

// ─── 辅助：预设显示名称 ───
function _presetLabel(name) {
  const map = { bell: 'preset_bell', ghz: 'preset_ghz', qft: 'preset_qft', grover: 'preset_grover' };
  if (!name) return _rL('preset_blank');
  return map[name] ? _rL(map[name]) : _rL('preset_unknown');
}

// ─── 辅助：canvas → base64 dataURL（失败返回 null）───
function _captureCanvas(el) {
  try {
    if (!el || el.width === 0 || el.height === 0) return null;
    return el.toDataURL('image/png');
  } catch (e) {
    return null;
  }
}

// ─── 统计线路中的门数量 ───
function _getCircuitStats() {
  let total = 0, twoQ = 0, measure = 0;
  const isEmpty = !S.circ.some(row => row.some(cell => cell !== null));
  if (!isEmpty) {
    for (let q = 0; q < S.qubits; q++) {
      for (let s = 0; s < S.steps; s++) {
        const cell = S.circ[q][s];
        if (!cell) continue;
        if (cell.role === 'tgt') continue;   // 双比特门只计一次（ctrl 侧计数）
        if (cell.g === 'M') { measure++; total++; }
        else if (['CNOT','CZ','SWAP'].includes(cell.g)) { twoQ++; total++; }
        else { total++; }
      }
    }
  }
  return { total, twoQ, measure, isEmpty };
}

// ─── 线路图：门符号映射 ───
const _GATE_SYM = {
  H:'H', X:'X', Y:'Y', Z:'Z', S:'S', T:'T',
  Rx:'Rx', Ry:'Ry', Rz:'Rz',
  M:'M',
  SWAP:'×',
};

// 获取单个格子的显示符号和 CSS 类
function _cellDisplay(cell) {
  if (!cell) return { sym: '', cls: 'rpt-circ-wire' };
  const g = cell.g;
  if (g === 'CNOT') {
    if (cell.role === 'ctrl') return { sym: '●', cls: 'rpt-circ-ctrl' };
    if (cell.role === 'tgt')  return { sym: '⊕', cls: 'rpt-circ-tgt' };
  }
  if (g === 'CZ') {
    if (cell.role === 'ctrl') return { sym: '●', cls: 'rpt-circ-ctrl' };
    if (cell.role === 'tgt')  return { sym: 'Z', cls: 'rpt-circ-tgt' };
  }
  if (g === 'SWAP') return { sym: '×', cls: 'rpt-circ-swap' };
  if (g === 'M')    return { sym: 'M', cls: 'rpt-circ-measure' };
  const baseSym = _GATE_SYM[g] || g;
  const sym = (cell.p != null) ? `${baseSym}(${Number(cell.p).toFixed(0)}°)` : baseSym;
  return { sym, cls: 'rpt-circ-gate' };
}

// 构建线路图 HTML 表格
function buildCircuitTable(data) {
  const { circ, qubits, steps, stats } = data;

  if (stats.isEmpty) {
    return `<p class="rpt-empty">${_rL('empty_circuit')}</p>`;
  }

  // 预先计算每一列（时间步）里有哪些双比特门，用于绘制连接线
  // connCols[s] = [ {ctrl, tgt}, ... ]
  const connCols = Array.from({ length: steps }, () => []);
  for (let q = 0; q < qubits; q++) {
    for (let s = 0; s < steps; s++) {
      const cell = circ[q][s];
      if (cell && cell.role === 'ctrl' && cell.tgt != null) {
        connCols[s].push({ ctrl: q, tgt: cell.tgt });
      }
    }
  }

  // 判断某格是否处于同列某条连接线的中间（ctrl 与 tgt 之间但不是两端）
  function isMidWire(q, s) {
    for (const { ctrl, tgt } of connCols[s]) {
      const lo = Math.min(ctrl, tgt);
      const hi = Math.max(ctrl, tgt);
      if (q > lo && q < hi) return true;
    }
    return false;
  }

  // ── 构建表格 ──
  let html = '<table class="rpt-circ-table"><thead><tr>';
  html += '<th class="rpt-circ-qlabel"></th>';
  for (let s = 0; s < steps; s++) {
    // 只渲染有内容的列（该步骤至少有一个门）
    const hasGate = circ.some(row => row[s] !== null);
    if (hasGate) html += `<th class="rpt-circ-step">t${s}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (let q = 0; q < qubits; q++) {
    html += `<tr><td class="rpt-circ-qlabel">q${q}</td>`;
    for (let s = 0; s < steps; s++) {
      const hasGate = circ.some(row => row[s] !== null);
      if (!hasGate) continue;   // 跳过空列

      const cell = circ[q][s];
      const { sym, cls } = _cellDisplay(cell);
      const mid = (!cell && isMidWire(q, s)) ? ' rpt-circ-mid' : '';

      // 连接线：ctrl 格加 bottom border，tgt 格加 top border，中间格两侧都加
      let connStyle = '';
      for (const { ctrl, tgt } of connCols[s]) {
        const lo = Math.min(ctrl, tgt);
        const hi = Math.max(ctrl, tgt);
        if (q === lo) connStyle += 'border-bottom:2px solid #6366f1;';
        if (q === hi) connStyle += 'border-top:2px solid #6366f1;';
        if (q > lo && q < hi) connStyle += 'border-top:2px solid #6366f1;border-bottom:2px solid #6366f1;';
      }

      html += `<td class="${cls}${mid}" style="${connStyle}">${sym}</td>`;
    }
    html += '</tr>';
  }

  html += '</tbody></table>';
  return html;
}

// ─── 收集报告所需的全部数据 ───
function collectReportData() {
  const lang = (typeof _currentLang !== 'undefined') ? _currentLang : 'zh';
  const stats = _getCircuitStats();

  // 概率图截图
  const probImg = _captureCanvas(document.getElementById('prob-cv'));

  // Bloch 球截图（每个量子比特一张）
  const blochImgs = [];
  for (let q = 0; q < Math.min(S.qubits, 5); q++) {
    blochImgs.push(_captureCanvas(document.getElementById('bloch-cv-' + q)));
  }

  // 态矢量数据（来自 S.lastSim）
  let stateVec = null;
  if (S.lastSim) {
    stateVec = [];
    const dim = S.lastSim.dim;
    const re = S.lastSim.re;
    const im = S.lastSim.im;
    const probs = S.lastSim.probs();
    for (let i = 0; i < dim; i++) {
      const p = probs[i];
      if (p < 1e-9) continue;   // 忽略概率极小的分量
      const bits = i.toString(2).padStart(S.qubits, '0');
      stateVec.push({ basis: '|' + bits + '⟩', re: re[i], im: im[i], prob: p });
    }
  }

  // Bloch 球角度数据（来自 S.lastSim.blochVec）
  let blochAngles = null;
  if (S.lastSim) {
    blochAngles = [];
    for (let q = 0; q < S.qubits; q++) {
      const bv = S.lastSim.blochVec(q);   // {x, y, z}
      const r = Math.sqrt(bv.x*bv.x + bv.y*bv.y + bv.z*bv.z);
      const theta = r > 1e-9 ? (Math.acos(Math.max(-1, Math.min(1, bv.z/r))) * 180 / Math.PI) : 0;
      const phi   = (Math.abs(bv.x) > 1e-9 || Math.abs(bv.y) > 1e-9)
                    ? (Math.atan2(bv.y, bv.x) * 180 / Math.PI)
                    : 0;
      blochAngles.push({ q, theta, phi, r });
    }
  }

  // 验证数据
  const validation = S.validation;

  // Qiskit 代码（_rawCode 由 generateCodeStr() 维护，始终最新）
  const qiskitCode = (window._rawCode && window._rawCode.qiskit) ? window._rawCode.qiskit : null;

  return {
    lang,
    timestamp: new Date().toLocaleString(lang === 'en' ? 'en-US' : 'zh-CN'),
    preset:    S.currentPreset,
    qubits:    S.qubits,
    steps:     S.steps,
    circ:      S.circ,           // 二维门数组，供线路图渲染使用
    stats,
    simDone:   !!S.lastSim,
    probs:     S.probs,
    stateVec,
    blochAngles,
    blochImgs,
    probImg,
    validation,
    qiskitCode,
  };
}

// ─── 入口：一键生成并直接下载 PDF ───
async function generateReport() {
  // 检查依赖库是否已加载
  if (!window.html2canvas || !window.jspdf) {
    if (typeof setSBMsg === 'function') setSBMsg(_rL('report_lib_missing'));
    return;
  }

  if (typeof setSBMsg === 'function') setSBMsg(_rL('report_generating'));

  const data = collectReportData();
  const html = buildReportHTML(data);

  // 用 srcdoc 创建隐藏 iframe，在其中渲染报告 HTML（同源，html2canvas 可访问）
  const iframe = document.createElement('iframe');
  iframe.setAttribute('srcdoc', html);
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:none;visibility:hidden;';
  document.body.appendChild(iframe);

  iframe.addEventListener('load', async () => {
    try {
      const body = iframe.contentDocument.body;
      // 将 iframe 高度撑满内容，避免 html2canvas 截断
      const fullH = body.scrollHeight;
      iframe.style.height = fullH + 'px';

      // 用 html2canvas 将报告渲染为高分辨率 canvas
      const canvas = await html2canvas(body, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        width: 794,
        height: fullH,
        scrollX: 0,
        scrollY: 0,
      });

      // 单页可变高度 PDF：内容多高页就多高，彻底避免分页截断表格/文字
      const { jsPDF } = window.jspdf;
      const pdfW = 210;                                      // A4 宽度 mm
      const pdfH = canvas.height / (canvas.width / pdfW);   // 按比例算出内容总高度 mm
      const pdf = new jsPDF({ unit: 'mm', format: [pdfW, pdfH], orientation: 'portrait' });

      const imgData = canvas.toDataURL('image/jpeg', 0.93);
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);

      // 生成文件名：Q-Edu_实验报告_bell_2025-01-01.pdf
      const dateStr = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
      const presetPart = data.preset ? `_${data.preset}` : '';
      pdf.save(`Q-Edu_实验报告${presetPart}_${dateStr}.pdf`);

      if (typeof setSBMsg === 'function') setSBMsg(_rL('report_done'));
    } catch (e) {
      console.error('[report] PDF 生成失败', e);
      if (typeof setSBMsg === 'function') setSBMsg(_rL('report_error'));
    } finally {
      document.body.removeChild(iframe);
    }
  });
}

// ─── 构建完整报告 HTML 字符串 ───
function buildReportHTML(data) {

  // ── 内联 CSS ──
  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;
      font-size: 13px; color: #1a202c; background: #fff;
    }
    .rpt-page { width: 210mm; margin: 0 auto; padding: 16mm 20mm 20mm; }

    /* ── 封面 ── */
    .rpt-cover {
      text-align: center; padding: 44px 0 36px;
      border-bottom: 2px solid #6366f1; margin-bottom: 36px;
    }
    .rpt-cover-logo {
      font-size: 2.4rem; font-weight: 900; color: #6366f1;
      letter-spacing: 3px; margin-bottom: 14px;
    }
    .rpt-cover-title { font-size: 1.7rem; font-weight: 700; color: #1a202c; margin-bottom: 10px; }
    .rpt-cover-sub   { font-size: 0.88rem; color: #64748b; line-height: 1.9; }
    .rpt-cover-scope { font-size: 0.75rem; color: #94a3b8; margin-top: 10px; font-style: italic; }

    /* ── 区块 ── */
    .rpt-section { margin-bottom: 36px; }
    .rpt-section-title {
      font-size: 1rem; font-weight: 700; color: #1e293b;
      border-left: 4px solid #6366f1; padding: 5px 0 5px 12px;
      margin-bottom: 14px; background: #f8fafc;
    }
    .rpt-empty { color: #94a3b8; font-style: italic; padding: 6px 2px; }

    /* ── 通用表格 ── */
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; vertical-align: middle; }
    th { background: #f1f5f9; font-weight: 600; color: #475569; }

    /* ── 概况表格 ── */
    .rpt-overview-table td:first-child {
      width: 150px; font-weight: 600; color: #475569; background: #f8fafc;
    }

    /* ── 线路图表格 ── */
    .rpt-circ-table { font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; }
    .rpt-circ-table th,
    .rpt-circ-table td  { text-align: center; min-width: 40px; padding: 5px 4px; }
    .rpt-circ-qlabel    { font-weight: 700; color: #475569; background: #f8fafc !important; min-width: 34px; }
    .rpt-circ-step      { color: #94a3b8; font-size: 10px; }
    .rpt-circ-gate      { background: #eef2ff; color: #4338ca; font-weight: 700; }
    .rpt-circ-ctrl      { background: #faf5ff; color: #7c3aed; font-weight: 900; }
    .rpt-circ-tgt       { background: #faf5ff; color: #7c3aed; font-weight: 700; }
    .rpt-circ-swap      { background: #fdf4ff; color: #9333ea; font-weight: 700; }
    .rpt-circ-measure   { background: #f0fdf4; color: #15803d; font-weight: 700; }
    .rpt-circ-wire      { color: #cbd5e1; }
    .rpt-circ-mid       { background: #f5f3ff; }

    /* ── 概率表格 ── */
    .rpt-prob-pct       { font-weight: 600; color: #4338ca; white-space: nowrap; }
    .rpt-prob-bar-wrap  { background: #f1f5f9; border-radius: 3px; height: 10px; min-width: 100px; }
    .rpt-prob-bar       { background: linear-gradient(90deg,#6366f1,#8b5cf6); height: 10px; border-radius: 3px; }

    /* ── 态矢量表格 ── */
    .rpt-sv-re { color: #1d4ed8; font-family: monospace; }
    .rpt-sv-im { color: #be185d; font-family: monospace; }

    /* ── 概率图 ── */
    .rpt-chart-img {
      max-width: 480px; width: 100%; display: block;
      margin: 14px 0; border: 1px solid #e2e8f0; border-radius: 6px;
    }

    /* ── Bloch 球图 ── */
    .rpt-bloch-imgs { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 14px; }
    .rpt-bloch-img-wrap { text-align: center; }
    .rpt-bloch-img-wrap img {
      width: 120px; height: 120px; object-fit: contain;
      border: 1px solid #e2e8f0; border-radius: 8px; display: block;
    }
    .rpt-bloch-img-label { font-size: 11px; color: #64748b; margin-top: 4px; }

    /* ── 验证报告 ── */
    .rpt-val-item {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 6px 2px; border-bottom: 1px solid #f1f5f9; font-size: 12px;
    }
    .rpt-val-badge {
      font-size: 10px; font-weight: 700; padding: 2px 7px;
      border-radius: 4px; white-space: nowrap; flex-shrink: 0;
    }
    .rpt-val-error   .rpt-val-badge { background: #fee2e2; color: #dc2626; }
    .rpt-val-warning .rpt-val-badge { background: #fef9c3; color: #ca8a04; }
    .rpt-val-info    .rpt-val-badge { background: #dbeafe; color: #2563eb; }
    .rpt-val-clean { color: #16a34a; font-weight: 600; padding: 6px 2px; }

    /* ── 代码块 ── */
    .rpt-code {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;
      padding: 14px 16px; font-family: 'Consolas', 'Courier New', monospace;
      font-size: 11.5px; line-height: 1.65; white-space: pre-wrap;
      word-break: break-all; color: #1e293b;
    }

    /* ── 打印优化 ── */
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .rpt-page { width: 100%; padding: 8mm 12mm; }
      .rpt-section { page-break-inside: avoid; }
      .rpt-section-code { page-break-before: always; }
      .rpt-cover { page-break-after: avoid; }
    }
  `;

  // ── 封面 ──
  const cover = `
    <div class="rpt-cover">
      <div class="rpt-cover-logo">Q·Edu</div>
      <div class="rpt-cover-title">${_rL('reportTitle')}</div>
      <div class="rpt-cover-sub">${_rL('platform')}</div>
      <div class="rpt-cover-sub">${_rL('generatedAt')}：${data.timestamp}</div>
      <div class="rpt-cover-scope">${_rL('scope')}</div>
    </div>`;

  // ── 第一区块：实验概况 ──
  const ovRows = [
    [_rL('ov_preset'),      _presetLabel(data.preset)],
    [_rL('ov_qubits'),      String(data.qubits)],
    [_rL('ov_steps'),       String(data.steps)],
    [_rL('ov_total_gates'), String(data.stats.total)],
    [_rL('ov_two_qubit'),   String(data.stats.twoQ)],
    [_rL('ov_measure'),     String(data.stats.measure)],
    [_rL('ov_sim_status'),  data.simDone ? _rL('sim_done') : _rL('sim_none')],
  ];
  // ── 课程模式前后测成绩注入 ──
  const preScore  = localStorage.getItem('qedu_pretest_score')  || '未完成';
  const postScore = localStorage.getItem('qedu_posttest_score') || '未完成';
  const gain = (preScore !== '未完成' && postScore !== '未完成')
    ? '+' + (parseInt(postScore) - parseInt(preScore)) + ' 题'
    : '—';
  ovRows.push(
    ['前测得分', preScore  === '未完成' ? preScore  : preScore  + ' / 5'],
    ['后测得分', postScore === '未完成' ? postScore : postScore + ' / 5'],
    ['得分提升', gain]
  );
  const secOverview = `
    <div class="rpt-section">
      <div class="rpt-section-title">${_rL('sec_overview')}</div>
      <table class="rpt-overview-table"><tbody>
        ${ovRows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('\n        ')}
      </tbody></table>
    </div>`;

  // ── 第二区块：量子线路图 ──
  const secCircuit = `
    <div class="rpt-section">
      <div class="rpt-section-title">${_rL('sec_circuit')}</div>
      ${buildCircuitTable(data)}
    </div>`;

  // ── 第三区块：仿真结果 ──
  let simBody = '';
  if (!data.simDone) {
    simBody = `<p class="rpt-empty">${_rL('sim_no_data')}</p>`;
  } else {
    // 概率分布表
    const probRows = data.probs
      .map((p, i) => ({ p, basis: '|' + i.toString(2).padStart(data.qubits, '0') + '⟩' }))
      .filter(r => r.p > 1e-9)
      .map(({ p, basis }) => {
        const pct = (p * 100).toFixed(2);
        const barW = Math.max(1, Math.round(p * 100));
        return `<tr>
          <td style="font-family:monospace;font-weight:700">${basis}</td>
          <td class="rpt-prob-pct">${pct}%</td>
          <td><div class="rpt-prob-bar-wrap"><div class="rpt-prob-bar" style="width:${barW}%"></div></div></td>
        </tr>`;
      }).join('');
    simBody += `<table>
      <thead><tr>
        <th>${_rL('sim_basis')}</th>
        <th>${_rL('sim_prob')}</th>
        <th style="min-width:120px"></th>
      </tr></thead>
      <tbody>${probRows}</tbody>
    </table>`;
    // 概率图截图
    if (data.probImg) {
      simBody += `<img class="rpt-chart-img" src="${data.probImg}" alt="probability chart">`;
    }
    // 态矢量表
    if (data.stateVec && data.stateVec.length > 0) {
      const svRows = data.stateVec.map(({ basis, re, im, prob }) => {
        const reStr = re.toFixed(4);
        const imStr = (im >= 0 ? '+' : '') + im.toFixed(4) + 'i';
        return `<tr>
          <td style="font-family:monospace;font-weight:700">${basis}</td>
          <td class="rpt-sv-re">${reStr}</td>
          <td class="rpt-sv-im">${imStr}</td>
          <td class="rpt-prob-pct">${(prob * 100).toFixed(2)}%</td>
        </tr>`;
      }).join('');
      simBody += `<br><table>
        <thead><tr>
          <th>${_rL('sim_basis')}</th>
          <th colspan="2">${_rL('sim_amplitude')}</th>
          <th>${_rL('sim_prob')}</th>
        </tr></thead>
        <tbody>${svRows}</tbody>
      </table>`;
    }
  }
  const secSim = `
    <div class="rpt-section">
      <div class="rpt-section-title">${_rL('sec_sim')}</div>
      ${simBody}
    </div>`;

  // ── 第四区块：Bloch 球 ──
  let blochBody = '';
  if (!data.blochAngles) {
    blochBody = `<p class="rpt-empty">${_rL('bloch_no_data')}</p>`;
  } else {
    const blochRows = data.blochAngles.map(({ q, theta, phi, r }) =>
      `<tr>
        <td style="font-weight:700">q${q}</td>
        <td>${theta.toFixed(2)}°</td>
        <td>${phi.toFixed(2)}°</td>
        <td>${r.toFixed(4)}</td>
      </tr>`
    ).join('');
    blochBody += `<table>
      <thead><tr>
        <th>${_rL('bloch_qubit')}</th>
        <th>${_rL('bloch_theta')}</th>
        <th>${_rL('bloch_phi')}</th>
        <th>|r|</th>
      </tr></thead>
      <tbody>${blochRows}</tbody>
    </table>`;
    // Bloch 球截图
    const validImgs = data.blochImgs.filter(Boolean);
    if (validImgs.length > 0) {
      const imgHtml = data.blochImgs.map((img, q) =>
        img ? `<div class="rpt-bloch-img-wrap">
                 <img src="${img}" alt="q${q}">
                 <div class="rpt-bloch-img-label">q${q}</div>
               </div>` : ''
      ).join('');
      blochBody += `<div class="rpt-bloch-imgs">${imgHtml}</div>`;
    }
  }
  const secBloch = `
    <div class="rpt-section">
      <div class="rpt-section-title">${_rL('sec_bloch')}</div>
      ${blochBody}
    </div>`;

  // ── 第五区块：线路验证 ──
  let valBody = '';
  if (!data.validation) {
    valBody = `<p class="rpt-empty">${_rL('val_no_data')}</p>`;
  } else {
    const v = data.validation;
    if (v.summary.errorCount === 0 && v.summary.warningCount === 0 && v.summary.infoCount === 0) {
      valBody = `<p class="rpt-val-clean">✓ ${_rL('val_clean')}</p>`;
    } else {
      const mkItem = (item, level) => {
        const loc = (item.q != null && item.s != null)
          ? ` <span style="color:#94a3b8">(${_rL('val_at')} q${item.q}, t${item.s})</span>` : '';
        return `<div class="rpt-val-item rpt-val-${level}">
          <span class="rpt-val-badge">${_rL('val_' + level)}</span>
          <span>${item.msg}${loc}</span>
        </div>`;
      };
      if (v.errors)   valBody += v.errors.map(i => mkItem(i, 'error')).join('');
      if (v.warnings) valBody += v.warnings.map(i => mkItem(i, 'warning')).join('');
      if (v.infos)    valBody += v.infos.map(i => mkItem(i, 'info')).join('');
    }
  }
  const secValidation = `
    <div class="rpt-section">
      <div class="rpt-section-title">${_rL('sec_validation')}</div>
      ${valBody}
    </div>`;

  // ── 第六区块：生成代码 ──
  let codeBody = '';
  if (!data.qiskitCode) {
    codeBody = `<p class="rpt-empty">${_rL('code_no_data')}</p>`;
  } else {
    const escaped = data.qiskitCode
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    codeBody = `<pre class="rpt-code">${escaped}</pre>`;
  }
  const secCode = `
    <div class="rpt-section rpt-section-code">
      <div class="rpt-section-title">${_rL('sec_code')}</div>
      ${codeBody}
    </div>`;

  // ── 组装完整 HTML ──
  return `<!DOCTYPE html>
<html lang="${data.lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${_rL('reportTitle')} — Q-Edu</title>
  <style>${css}</style>
</head>
<body>
  <div class="rpt-page">
    ${cover}
    ${secOverview}
    ${secCircuit}
    ${secSim}
    ${secBloch}
    ${secValidation}
    ${secCode}
  </div>
</body>
</html>`;
}

// ── 报告公共 CSS（中文字体优先）──
function _reportCommonCSS() {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', 'SimHei', sans-serif;
           font-size: 13px; color: #1a202c; background: #fff; }
    .rpt-page { width: 794px; padding: 60px 72px 56px; }
    .rpt-cover { text-align: center; padding: 36px 0 28px;
                 border-bottom: 2.5px solid #1B3A6B; margin-bottom: 28px; }
    .rpt-logo  { font-size: 2rem; font-weight: 900; color: #1B3A6B;
                 letter-spacing: 3px; margin-bottom: 10px; }
    .rpt-title { font-size: 1.55rem; font-weight: 700; color: #1a202c; margin-bottom: 8px; }
    .rpt-sub   { font-size: 0.82rem; color: #64748b; line-height: 2; }
    .rpt-sec   { margin-bottom: 26px; }
    .rpt-sec-title {
      font-size: 0.92rem; font-weight: 700; color: #1B3A6B;
      border-left: 4px solid #1B3A6B; padding: 4px 0 4px 10px; margin-bottom: 12px; }
    .rpt-kv { width: 100%; border-collapse: collapse; }
    .rpt-kv td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; vertical-align: top; }
    .rpt-kv td:first-child { font-weight: 600; color: #475569; width: 42%; }
    .rpt-kv tr:nth-child(even) td { background: #f8fafc; }
    .rpt-theory { background: #eff6ff; border: 1px solid #bfdbfe;
                  border-radius: 6px; padding: 14px 16px; }
    .rpt-theory p { font-size: 12px; color: #1e40af; line-height: 1.85; margin-bottom: 5px; }
    .rpt-theory p:last-child { margin-bottom: 0; }
    .rpt-data { font-family: 'Courier New', Consolas, monospace; font-size: 11px;
                color: #475569; background: #f8fafc; border: 1px solid #e2e8f0;
                border-radius: 4px; padding: 10px 14px; line-height: 1.9; word-break: break-all; }
    .rpt-concl      { border-radius: 6px; padding: 12px 16px; font-size: 12px; line-height: 1.8; }
    .rpt-concl.good { background: #f0fdf4; border: 1px solid #86efac; color: #166534; }
    .rpt-concl.warn { background: #fefce8; border: 1px solid #fde047; color: #854d0e; }
    .rpt-concl.bad  { background: #fff1f2; border: 1px solid #fca5a5; color: #991b1b; }
    .rpt-scores { display: flex; gap: 16px; margin-top: 10px; }
    .rpt-scard  { flex: 1; text-align: center; background: #f8fafc;
                  border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 10px; }
    .rpt-snum   { font-size: 2rem; font-weight: 700; }
    .rpt-snum.pre  { color: #2b6cb0; }
    .rpt-snum.post { color: #276749; }
    .rpt-snum.gain { color: #1B3A6B; }
    .rpt-slabel { font-size: 11px; color: #94a3b8; margin-top: 4px; }
    .rpt-footer { text-align: center; font-size: 10px; color: #94a3b8;
                  margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
  `;
}

// ── 共享渲染器：html字符串 → PDF 下载 ──
async function _renderReportToPDF(htmlStr, filename) {
  if (!window.html2canvas || !window.jspdf) {
    if (typeof setSBMsg === 'function') setSBMsg('PDF 库尚未加载，请检查网络后刷新');
    return;
  }
  if (typeof setSBMsg === 'function') setSBMsg('正在生成报告，请稍候…');
  const iframe = document.createElement('iframe');
  iframe.setAttribute('srcdoc', htmlStr);
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:none;visibility:hidden;';
  document.body.appendChild(iframe);
  iframe.addEventListener('load', async () => {
    try {
      const body = iframe.contentDocument.body;
      const fullH = body.scrollHeight;
      iframe.style.height = fullH + 'px';
      const canvas = await html2canvas(body, {
        scale: 2, useCORS: true, allowTaint: false,
        backgroundColor: '#ffffff', width: 794, height: fullH, scrollX: 0, scrollY: 0,
      });
      const { jsPDF } = window.jspdf;
      const pdfW = 210;
      const pdfH = canvas.height / (canvas.width / pdfW);
      const pdf = new jsPDF({ unit: 'mm', format: [pdfW, pdfH], orientation: 'portrait' });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, pdfW, pdfH);
      pdf.save(filename);
      if (typeof setSBMsg === 'function') setSBMsg('报告已下载');
    } catch (e) {
      console.error('[report] PDF 生成失败', e);
      if (typeof setSBMsg === 'function') setSBMsg('生成报告失败，请重试');
    } finally {
      document.body.removeChild(iframe);
    }
  });
}

// ── VQE实验报告生成器（html2canvas版，支持中文）──
function generateVQEReport() {
  if (!window.html2canvas || !window.jspdf) {
    alert('PDF 库尚未加载，请检查网络后刷新页面'); return;
  }
  const now       = new Date().toLocaleString('zh-CN');
  const mol       = (typeof curMol !== 'undefined' ? curMol : null) || 'H2';
  const _EXACT    = typeof EXACT !== 'undefined' ? EXACT : {};
  const exact     = _EXACT[mol] != null ? _EXACT[mol] : '—';
  const finalE    = document.getElementById('ve-val')?.textContent   || '—';
  const iters     = document.getElementById('v-iter')?.textContent   || '—';
  const acc       = document.getElementById('v-acc')?.textContent    || '—';
  const status    = document.getElementById('v-status')?.textContent || '—';
  const optimizer = document.getElementById('vqe-sel-opt')?.value    || '—';
  const depth     = document.getElementById('vqe-inp-depth')?.value  || '—';
  const ansatz    = document.getElementById('vqe-sel-type')?.value   || '—';
  const maxIter   = document.getElementById('vqe-inp-iter')?.value   || '—';
  const energyArr = (typeof vqeData !== 'undefined' && Array.isArray(vqeData)) ? vqeData : [];

  const preScore  = localStorage.getItem('qedu_pretest_score')  || '未完成';
  const postScore = localStorage.getItem('qedu_posttest_score') || '未完成';
  const hasScores = preScore !== '未完成' && postScore !== '未完成';
  const gain      = hasScores ? (parseInt(postScore) - parseInt(preScore)) : null;

  const errorVal = parseFloat(acc);
  const conclCls = isNaN(errorVal) ? '' : (errorVal < 1 ? 'good' : errorVal < 5 ? 'warn' : 'bad');
  const conclTxt = isNaN(errorVal)
    ? '请先运行 VQE 优化以获取实验结论。'
    : errorVal < 1
      ? `VQE 优化成功收敛，最终能量与精确值误差仅 ${acc}，优化效果良好。`
      : errorVal < 5
        ? `VQE 优化基本收敛，误差 ${acc}，可尝试增大迭代次数或调整 Ansatz 结构以进一步优化。`
        : `VQE 优化误差较大（${acc}），建议调整优化器参数、增加 Ansatz 深度，或排查 Barren Plateau 问题。`;

  const kvRows = [
    ['研究分子', mol],
    ['精确基态能量（Hartree）', String(exact)],
    ['优化器', optimizer],
    ['Ansatz 类型', ansatz],
    ['Ansatz 深度', String(depth)],
    ['最大迭代次数', String(maxIter)],
    ['实际迭代次数', String(iters)],
    ['最终能量（Hartree）', finalE],
    ['与精确值误差率', acc],
    ['优化状态', status],
  ].map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');

  let dataBlock = '';
  if (energyArr.length === 0) {
    dataBlock = '<p style="color:#94a3b8;font-style:italic;padding:10px">无收敛数据，请先运行 VQE 优化</p>';
  } else {
    const show = energyArr.slice(0, 100);
    const lines = [];
    for (let i = 0; i < show.length; i += 10) {
      lines.push(show.slice(i, i+10).map((v, j) => `[${i+j+1}] ${Number(v).toFixed(6)}`).join('   '));
    }
    dataBlock = `<div class="rpt-data">${lines.join('\n')}${energyArr.length > 100 ? '\n（共 ' + energyArr.length + ' 个数据点，仅显示前 100 个）' : ''}</div>`;
  }

  const scoresHtml = hasScores ? `
    <div class="rpt-sec">
      <div class="rpt-sec-title">前后测成绩</div>
      <div class="rpt-scores">
        <div class="rpt-scard"><div class="rpt-snum pre">${preScore}<span style="font-size:1rem;color:#94a3b8">/5</span></div><div class="rpt-slabel">前测得分</div></div>
        <div class="rpt-scard"><div class="rpt-snum gain" style="font-size:1.5rem">${gain >= 0 ? '+' : ''}${gain} 题</div><div class="rpt-slabel">学习提升</div></div>
        <div class="rpt-scard"><div class="rpt-snum post">${postScore}<span style="font-size:1rem;color:#94a3b8">/5</span></div><div class="rpt-slabel">后测得分</div></div>
      </div>
    </div>` : '';

  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
<style>${_reportCommonCSS()}</style></head><body>
<div class="rpt-page">
  <div class="rpt-cover">
    <div class="rpt-logo">Q-Edu</div>
    <div class="rpt-title">VQE 变分量子本征求解器实验报告</div>
    <div class="rpt-sub">Q-Edu 量子计算教育平台 · 生成时间：${now}</div>
  </div>
  <div class="rpt-sec">
    <div class="rpt-sec-title">实验概况</div>
    <table class="rpt-kv">${kvRows}</table>
  </div>
  <div class="rpt-sec">
    <div class="rpt-sec-title">算法原理与知识点</div>
    <div class="rpt-theory">
      <p>VQE（Variational Quantum Eigensolver）是求解分子基态能量的核心量子-经典混合算法。</p>
      <p>核心思想：构造参数化量子线路（Ansatz）|ψ(θ)⟩，最小化期望能量 E(θ)=⟨ψ(θ)|H|ψ(θ)⟩。</p>
      <p>变分原理保证：任意量子态的期望能量不低于基态能量，故最小化 E(θ) 趋近基态。</p>
      <p>本实验分子：${mol}，Ansatz 类型：${ansatz}，优化器：${optimizer}。</p>
      <p>覆盖知识点：哈密顿量、变分原理、参数化量子线路、梯度下降、量子-经典混合算法。</p>
    </div>
  </div>
  <div class="rpt-sec">
    <div class="rpt-sec-title">收敛曲线数据（能量 vs 迭代次数）</div>
    ${dataBlock}
  </div>
  <div class="rpt-sec">
    <div class="rpt-sec-title">实验结论</div>
    <div class="rpt-concl ${conclCls}">${conclTxt}</div>
  </div>
  ${scoresHtml}
  <div class="rpt-footer">本报告由 Q-Edu 量子计算教育平台自动生成 · 仅供教学使用</div>
</div>
</body></html>`;

  const filename = 'VQE实验报告_' + mol + '_' + new Date().toLocaleDateString('zh-CN').replace(/\//g,'-') + '.pdf';
  _renderReportToPDF(html, filename);
}

// ── QAOA实验报告生成器（html2canvas版，支持中文）──
function generateQAOAReport() {
  if (!window.html2canvas || !window.jspdf) {
    alert('PDF 库尚未加载，请检查网络后刷新页面'); return;
  }
  const now      = new Date().toLocaleString('zh-CN');
  const QS       = (typeof QAOA_S !== 'undefined' ? QAOA_S : null) || {};
  const nodes    = QS.nodes    || [];
  const edges    = QS.edges    || [];
  const bestCut  = QS.bestCut  != null ? QS.bestCut  : '—';
  const maxCut   = QS.maxCut   != null ? QS.maxCut   : '—';
  const bestBits = QS.bestBits;
  const iters    = document.getElementById('qaoa-iter')?.textContent  || '—';
  const ratio    = document.getElementById('qaoa-ratio')?.textContent || '—';
  const gamma    = document.getElementById('qaoa-gamma')?.value || '—';
  const beta     = document.getElementById('qaoa-beta')?.value  || '—';
  const iterData = Array.isArray(QS.data) ? QS.data : [];

  const preScore  = localStorage.getItem('qedu_pretest_score')  || '未完成';
  const postScore = localStorage.getItem('qedu_posttest_score') || '未完成';
  const hasScores = preScore !== '未完成' && postScore !== '未完成';
  const gain      = hasScores ? (parseInt(postScore) - parseInt(preScore)) : null;

  const ratioVal = parseFloat(ratio);
  const conclCls = isNaN(ratioVal) ? '' : (ratioVal >= 0.9 ? 'good' : ratioVal >= 0.693 ? 'warn' : 'bad');
  const conclTxt = isNaN(ratioVal)
    ? '请先运行 QAOA 优化以获取实验结论。'
    : ratioVal >= 0.9
      ? `QAOA 优化表现优秀，近似比 ${ratio}，非常接近最优解，量子优化效果显著。`
      : ratioVal >= 0.693
        ? `QAOA 优化成功，近似比 ${ratio}，达到理论下界（0.6924），结果有效。`
        : `近似比 ${ratio} 偏低，可尝试增加 QAOA 层数 p 或优化参数初始值以提升近似质量。`;

  const kvRows = [
    ['问题类型', 'Max-Cut（最大割问题）'],
    ['图节点数', String(nodes.length)],
    ['图边数',   String(edges.length)],
    ['QAOA 层数（p）', '1'],
    ['最优 γ 参数', gamma + '°'],
    ['最优 β 参数', beta  + '°'],
    ['迭代次数', String(iters)],
    ['最优割值', String(bestCut)],
    ['理论最大割', String(maxCut)],
    ['近似比 r',  String(ratio)],
  ].map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');

  const edgeStr = edges.map(e => `(${e.a}-${e.b})`).join(', ') || '无';
  let splitHtml = '';
  if (bestBits != null) {
    const setS = nodes.filter((_,i) => (bestBits >> i) & 1).map(n => n.id);
    const setT = nodes.filter((_,i) => !((bestBits >> i) & 1)).map(n => n.id);
    splitHtml = `<p>最优分割：集合 S = {${setS.join(', ')}}，集合 S̄ = {${setT.join(', ')}}</p>
                 <p>割集（跨越 S 和 S̄ 的边）：${bestCut} 条</p>`;
  }

  let convBlock = '';
  if (iterData.length === 0) {
    convBlock = '<p style="color:#94a3b8;font-style:italic;padding:10px">无收敛数据，请先运行 QAOA 优化</p>';
  } else {
    const show = iterData.slice(0, 80);
    const lines = [];
    for (let i = 0; i < show.length; i += 8) {
      lines.push(show.slice(i, i+8).map((v, j) => {
        const val = typeof v === 'object' ? (v.ratio ?? v.r ?? v) : v;
        return `[${i+j+1}] ${Number(val).toFixed(4)}`;
      }).join('  '));
    }
    convBlock = `<div class="rpt-data">${lines.join('\n')}</div>`;
  }

  const scoresHtml = hasScores ? `
    <div class="rpt-sec">
      <div class="rpt-sec-title">前后测成绩</div>
      <div class="rpt-scores">
        <div class="rpt-scard"><div class="rpt-snum pre">${preScore}<span style="font-size:1rem;color:#94a3b8">/5</span></div><div class="rpt-slabel">前测得分</div></div>
        <div class="rpt-scard"><div class="rpt-snum gain" style="font-size:1.5rem">${gain >= 0 ? '+' : ''}${gain} 题</div><div class="rpt-slabel">学习提升</div></div>
        <div class="rpt-scard"><div class="rpt-snum post">${postScore}<span style="font-size:1rem;color:#94a3b8">/5</span></div><div class="rpt-slabel">后测得分</div></div>
      </div>
    </div>` : '';

  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
<style>${_reportCommonCSS()}</style></head><body>
<div class="rpt-page">
  <div class="rpt-cover">
    <div class="rpt-logo">Q-Edu</div>
    <div class="rpt-title">QAOA 量子近似优化算法实验报告</div>
    <div class="rpt-sub">Q-Edu 量子计算教育平台 · 生成时间：${now}</div>
  </div>
  <div class="rpt-sec">
    <div class="rpt-sec-title">实验概况</div>
    <table class="rpt-kv">${kvRows}</table>
  </div>
  <div class="rpt-sec">
    <div class="rpt-sec-title">图结构</div>
    <div class="rpt-theory">
      <p>节点：${nodes.map(n => n.id).join(', ') || '—'}</p>
      <p>边：${edgeStr}</p>
      ${splitHtml}
    </div>
  </div>
  <div class="rpt-sec">
    <div class="rpt-sec-title">算法原理与知识点</div>
    <div class="rpt-theory">
      <p>QAOA 将 Max-Cut 问题编码为量子哈密顿量 C = Σ(ij)∈E (I-ZiZj)/2，</p>
      <p>通过制备参数化量子态 |ψ(γ,β)⟩ = e^{-iβB} e^{-iγC} |+⟩^⊗n 来近似最优解。</p>
      <p>近似比 r = 割值/最大割 ∈ [0,1]，QAOA p=1 理论保证 r ≥ 0.6924（对任意图）。</p>
      <p>覆盖知识点：组合优化 · Max-Cut · 量子叠加 · 参数优化 · 近似比分析。</p>
    </div>
  </div>
  <div class="rpt-sec">
    <div class="rpt-sec-title">近似比收敛过程</div>
    ${convBlock}
  </div>
  <div class="rpt-sec">
    <div class="rpt-sec-title">实验结论</div>
    <div class="rpt-concl ${conclCls}">${conclTxt}</div>
  </div>
  ${scoresHtml}
  <div class="rpt-footer">本报告由 Q-Edu 量子计算教育平台自动生成 · 仅供教学使用</div>
</div>
</body></html>`;

  const filename = 'QAOA实验报告_' + nodes.length + '节点_' + new Date().toLocaleDateString('zh-CN').replace(/\//g,'-') + '.pdf';
  _renderReportToPDF(html, filename);
}
