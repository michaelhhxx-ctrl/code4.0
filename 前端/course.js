// ── course.js — 课程模式模块 ──
// 职责：课程模式入口、知识地图、引导实验、前后测题库
// 原则：只增加UI和外挂逻辑，绝不修改仿真引擎和拖拽逻辑

// ─── CSS 注入 (IIFE) ─────────────────────────────────────────────
;(function _injectCourseCss() {
  const s = document.createElement('style');
  s.id = 'course-styles';
  s.textContent = `
  /* ── 课程模式 overlay 辅助变量（跨主题半透明背景）── */
  :root {
    --co-overlay: rgba(239,241,245,.97);
    --co-card:    #F7F8FB;
  }
  :root[data-theme="dark"]   { --co-overlay:rgba(15,23,42,.97);   --co-card:#172135; }
  :root[data-theme="aurora"] { --co-overlay:rgba(12,7,32,.97);    --co-card:#1C1248; }
  :root[data-theme="space"]  { --co-overlay:rgba(10,14,26,.97);   --co-card:#141a2e; }
  :root[data-theme="amber"]  { --co-overlay:rgba(17,19,25,.97);   --co-card:#14161d; }

  /* ════════ course-map-overlay（知识地图全屏浮层）════════ */
  #course-map-overlay {
    display:none; position:fixed; inset:0; z-index:9990;
    background:var(--co-overlay); backdrop-filter:blur(12px);
    overflow-y:auto;
  }
  #course-map-overlay.visible {
    display:flex; flex-direction:column; align-items:center;
    justify-content:center; padding:24px;
  }
  .cmap-wrap { max-width:720px; width:100%; }
  .cmap-hd { text-align:center; margin-bottom:36px; }
  .cmap-hd h2 { font-size:24px; font-weight:700; color:var(--t9); margin:0 0 6px; }
  .cmap-hd p  { font-size:14px; color:var(--t5); margin:0; }
  .cmap-nodes {
    display:flex; align-items:center; justify-content:center;
    flex-wrap:wrap; gap:0; padding:8px 0;
  }
  .cmap-node { display:flex; flex-direction:column; align-items:center; }
  .cmap-circle {
    width:76px; height:76px; border-radius:50%; cursor:pointer;
    border:2px solid var(--b1); background:var(--surf);
    display:flex; flex-direction:column; align-items:center;
    justify-content:center; font-size:22px; transition:.25s;
  }
  .cmap-node.locked   .cmap-circle { opacity:.38; cursor:not-allowed; }
  .cmap-node.active   .cmap-circle {
    border-color:#f6e05e;
    box-shadow:0 0 20px rgba(246,224,94,.4);
    background:rgba(120,90,0,.15);
  }
  .cmap-node.unlocked .cmap-circle {
    border-color:var(--navy); background:var(--navy-xs,rgba(49,130,206,.06));
  }
  .cmap-node.done .cmap-circle {
    border-color:var(--green); background:var(--green-lt,rgba(56,161,105,.1));
  }
  .cmap-label {
    font-size:11px; font-weight:700; color:var(--t7);
    margin-top:7px; text-align:center; width:90px; line-height:1.4;
  }
  .cmap-score { font-size:10px; color:var(--green); margin-top:2px; }
  .cmap-arrow {
    width:36px; height:2px; background:var(--b2,var(--b1));
    align-self:center; margin:0 2px; margin-bottom:32px;
    position:relative; flex-shrink:0;
  }
  .cmap-arrow::after {
    content:''; position:absolute; right:-6px; top:-4px;
    border:5px solid transparent; border-left-color:var(--b2,var(--b1));
  }
  .cmap-foot { margin-top:28px; display:flex; gap:12px; justify-content:center; }
  .cmap-btn-exit {
    padding:9px 24px; background:var(--navy-xs,rgba(0,0,0,.04));
    color:var(--t5); border:1px solid var(--b1);
    border-radius:8px; font-size:13px; cursor:pointer; transition:.2s;
    font-family:var(--sans);
  }
  .cmap-btn-exit:hover { background:var(--surf); color:var(--t9); }
  .cmap-gain {
    margin-top:20px; padding:14px 24px;
    background:var(--green-lt,rgba(56,161,105,.1)); border:1px solid var(--green);
    border-radius:12px; text-align:center; color:var(--green);
    font-size:15px; font-weight:600; opacity:.9;
  }

  /* ════════ course-exp-overlay（引导气泡，可拖拽浮窗）════════ */
  #course-exp-overlay {
    display:none; position:fixed;
    bottom:80px; left:calc(100vw - 524px); /* 默认右侧 */
    z-index:9985; width:500px; max-width:calc(100vw - 40px);
    max-height:calc(100vh - 140px); overflow-y:auto;
    transition:left .38s cubic-bezier(.4,0,.2,1),
               top  .38s cubic-bezier(.4,0,.2,1);
    user-select:none;
  }
  #course-exp-overlay.visible { display:block; }
  /* 智能定位类 */
  #course-exp-overlay.cexp-pos-right { left:calc(100vw - 524px); }
  #course-exp-overlay.cexp-pos-left  { left:24px; }
  /* 拖拽中禁用 transition */
  #course-exp-overlay.cexp-dragging  { transition:none !important; }
  /* 拖拽条 */
  .cexp-drag-bar {
    display:flex; align-items:center; justify-content:space-between;
    margin:-22px -26px 14px; padding:8px 14px 8px 16px;
    border-radius:16px 16px 0 0;
    background:var(--navy-xs,rgba(49,130,206,.06));
    border-bottom:1px solid var(--b1);
    cursor:grab; user-select:none;
  }
  .cexp-drag-bar:active { cursor:grabbing; }
  .cexp-drag-dots {
    display:flex; gap:3px; align-items:center;
  }
  .cexp-drag-dots span {
    display:block; width:4px; height:4px; border-radius:50%;
    background:var(--t3); opacity:.6;
  }
  .cexp-drag-tip {
    font-size:10px; color:var(--t3); opacity:.6; letter-spacing:.5px;
  }
  /* 跳位提示按钮（右上角切换） */
  .cexp-pos-toggle {
    background:none; border:none; cursor:pointer;
    font-size:14px; padding:2px 5px; border-radius:5px;
    color:var(--t5); transition:.15s; line-height:1;
  }
  .cexp-pos-toggle:hover { background:var(--navy-xs); color:var(--navy); }
  .cexp-card {
    background:var(--co-card); border:1px solid var(--navy-lt,var(--b1));
    border-radius:16px; padding:22px 26px; color:var(--t9);
    box-shadow:0 12px 48px rgba(0,0,0,.28);
  }
  .cexp-badge {
    font-size:11px; color:var(--navy); font-weight:700;
    letter-spacing:.8px; margin-bottom:7px;
  }
  .cexp-title { font-size:17px; font-weight:700; color:var(--t9); margin-bottom:12px; }
  .cexp-body  {
    font-size:13.5px; color:var(--t7);
    line-height:1.85; margin-bottom:14px;
  }
  .cexp-tip {
    background:var(--navy-xs,rgba(49,130,206,.07));
    border-left:3px solid var(--navy); border-radius:0 8px 8px 0;
    padding:9px 13px; margin:10px 0; font-size:12.5px;
    color:var(--t7); line-height:1.72;
  }
  .cexp-actions { display:flex; gap:8px; flex-wrap:wrap; }
  .cexp-btn {
    padding:8px 18px; border-radius:8px; font-size:13px;
    font-weight:600; cursor:pointer; border:none; transition:.2s;
    font-family:var(--sans);
  }
  .cexp-btn-p { background:var(--navy); color:#fff; }
  .cexp-btn-p:hover { filter:brightness(1.1); }
  .cexp-btn-s {
    background:var(--navy-xs,rgba(0,0,0,.04)); color:var(--t5);
    border:1px solid var(--b1) !important;
  }
  .cexp-btn-s:hover { background:var(--surf); color:var(--t9); }
  .cexp-wait {
    font-size:12px; color:var(--navy); opacity:.8;
    font-style:italic;
  }
  .cexp-prog {
    font-size:11px; color:var(--t5); opacity:.5; margin-top:10px;
  }
  .cexp-quiz {
    margin-top:12px; padding:14px 14px;
    background:var(--amber-lt,rgba(246,224,94,.07));
    border:1px solid var(--amber,rgba(246,224,94,.22)); border-radius:10px;
  }
  .cexp-quiz-q {
    font-size:13px; font-weight:600; color:var(--amber,#f6e05e); margin-bottom:10px; line-height:1.6;
  }
  .cexp-quiz-opts { display:flex; flex-direction:column; gap:7px; }
  .cexp-quiz-opt {
    background:var(--navy-xs,rgba(0,0,0,.04)); border:1px solid var(--b1);
    border-radius:8px; padding:9px 13px; font-size:13px;
    color:var(--t7); cursor:pointer; transition:.18s;
    text-align:left; width:100%; font-family:var(--sans);
  }
  .cexp-quiz-opt:hover {
    background:var(--navy-xs); border-color:var(--navy);
  }
  .cexp-quiz-opt.ok {
    background:var(--green-lt,rgba(56,161,105,.15)); border-color:var(--green); color:var(--green);
  }
  .cexp-quiz-opt.no {
    background:var(--red-lt,rgba(229,62,62,.08)); border-color:var(--red,rgba(229,62,62,.5));
    color:var(--red,rgba(229,62,62,.85));
  }

  /* ════════ course-test-overlay（前后测全屏）════════ */
  #course-test-overlay {
    display:none; position:fixed; inset:0; z-index:9995;
    background:var(--co-overlay); backdrop-filter:blur(16px);
    overflow-y:auto;
  }
  #course-test-overlay.visible {
    display:flex; flex-direction:column; align-items:center;
    justify-content:center; padding:24px;
  }
  .ctest-wrap { max-width:600px; width:100%; }
  .ctest-hd { margin-bottom:18px; }
  .ctest-hd h2 { font-size:20px; font-weight:700; color:var(--t9); margin:0 0 4px; }
  .ctest-hd p  { font-size:12px; color:var(--t5); margin:0; }
  .ctest-dots  { display:flex; gap:7px; margin-bottom:22px; }
  .ctest-dot {
    width:9px; height:9px; border-radius:50%;
    background:var(--navy-xs); border:1px solid var(--b1);
    transition:.2s;
  }
  .ctest-dot.done { background:var(--green); border-color:var(--green); }
  .ctest-dot.cur  {
    background:#f6e05e; border-color:#f6e05e;
    box-shadow:0 0 6px rgba(246,224,94,.45);
  }
  .ctest-qn {
    font-size:10px; color:var(--navy); font-weight:700;
    letter-spacing:.8px; margin-bottom:6px;
  }
  .ctest-qt {
    font-size:16px; font-weight:600; color:var(--t9);
    margin-bottom:18px; line-height:1.65;
  }
  .ctest-opts { display:flex; flex-direction:column; gap:9px; }
  .ctest-opt {
    background:var(--surf); border:1.5px solid var(--b1);
    border-radius:10px; padding:12px 16px; font-size:14px;
    color:var(--t7); cursor:pointer; transition:.2s; text-align:left;
    font-family:var(--sans);
  }
  .ctest-opt:hover {
    background:var(--navy-xs); border-color:var(--navy);
  }
  .ctest-opt.ok {
    border-color:var(--green); background:var(--green-lt,rgba(56,161,105,.12)); color:var(--green);
  }
  .ctest-opt.no {
    border-color:var(--red,rgba(229,62,62,.5)); background:var(--red-lt,rgba(229,62,62,.08));
    color:var(--red,rgba(229,62,62,.85));
  }
  .ctest-next {
    margin-top:18px; padding:11px 32px; background:var(--navy); color:#fff;
    border:none; border-radius:10px; font-size:14px; font-weight:600;
    cursor:pointer; display:none; transition:.2s; font-family:var(--sans);
  }
  .ctest-next:hover { filter:brightness(1.1); }
  .ctest-result { text-align:center; padding:40px 0; }
  .ctest-result-score {
    font-size:52px; font-weight:700; color:#f6e05e; line-height:1;
  }
  .ctest-result-denom { font-size:24px; color:rgba(246,224,94,.6); }
  .ctest-result-tag { font-size:15px; color:var(--t5); margin:8px 0 0; }
  .ctest-result-msg {
    font-size:13px; color:var(--t5); margin:14px auto 0;
    max-width:380px; line-height:1.7;
  }
  .ctest-result-btn {
    margin-top:22px; padding:11px 36px; background:var(--navy); color:#fff;
    border:none; border-radius:10px; font-size:14px; font-weight:600;
    cursor:pointer; font-family:var(--sans);
  }
  .ctest-result-btn:hover { filter:brightness(1.1); }

  /* ════════ course-video-modal（微课视频模态）════════ */
  .cvid-modal {
    position:fixed; inset:0; z-index:9999;
    background:rgba(0,0,0,.85); backdrop-filter:blur(12px);
    display:flex; align-items:center; justify-content:center; padding:24px;
  }
  .cvid-box { max-width:700px; width:100%; }
  .cvid-badge {
    font-size:10px; color:var(--navy); font-weight:700;
    letter-spacing:.8px; margin-bottom:8px;
  }
  .cvid-title { font-size:18px; font-weight:700; color:#e2e8f0; margin-bottom:16px; }
  .cvid-player {
    width:100%; border-radius:12px; background:#000;
    display:block; max-height:380px; outline:none;
  }
  .cvid-nf {
    padding:64px 20px; text-align:center;
    font-size:13px; color:rgba(226,232,240,.45); line-height:1.8;
  }
  .cvid-actions { display:flex; gap:10px; margin-top:16px; justify-content:flex-end; }
  .cvid-btn {
    padding:9px 22px; border-radius:8px; font-size:13px;
    font-weight:600; cursor:pointer; border:none; transition:.2s;
    font-family:var(--sans);
  }
  .cvid-btn-p { background:var(--navy); color:#fff; }
  .cvid-btn-p:hover { filter:brightness(1.1); }
  .cvid-btn-s {
    background:rgba(255,255,255,.08); color:rgba(226,232,240,.6);
    border:1px solid rgba(255,255,255,.14) !important;
  }
  .cvid-btn-s:hover { background:rgba(255,255,255,.15); color:#e2e8f0; }
  `;
  document.head.appendChild(s);
})();

// ─── 状态读写 ─────────────────────────────────────────────────────
function _cs() {
  try { return JSON.parse(localStorage.getItem('qedu_cstate') || '{}'); }
  catch(e) { return {}; }
}
function _setCs(upd) {
  const s = _cs();
  Object.assign(s, upd);
  localStorage.setItem('qedu_cstate', JSON.stringify(s));
}

// ─── 公共 API ─────────────────────────────────────────────────────

/** 判断当前是否处于课程模式（供 ai.js 等外部调用） */
function inCourseMode() {
  return _cs().mode === true;
}

/** 课程模式入口（供首屏按钮调用） */
function openCourseMode() {
  _setCs({ mode: true });
  _logEvent('enter_course');
  // 隐藏首屏
  if (typeof hideHomeScreen === 'function') hideHomeScreen();
  if (typeof hideMainHome  === 'function') hideMainHome();
  // 未完成前测 → 先测
  if (_cs().preScore == null) {
    _showTestOverlay(
      '前测：量子计算基础测验',
      '请独立完成以下 5 道题，了解你的量子计算基础。',
      _PRETEST_QS,
      function(score) {
        _setCs({ preScore: score });
        _logEvent('pretest_done', { score });
        localStorage.setItem('qedu_pretest_score', String(score));
        _showCourseMap();
      }
    );
  } else {
    _showCourseMap();
  }
}

// ─── 知识地图 ─────────────────────────────────────────────────────

function _showCourseMap() {
  const overlay = document.getElementById('course-map-overlay');
  if (!overlay) return;
  const st = _cs();

  const preTestDone  = st.preScore  != null;
  const exp1Done     = !!st.exp1Done;
  const exp2Done     = !!st.exp2Done;
  const exp3Done     = !!st.exp3Done;
  const postTestDone = st.postScore != null;

  const nodes = [
    {
      id:0, icon:'📋', label:'前测',
      status: preTestDone ? 'done' : 'active',
      score: preTestDone ? (st.preScore + ' / 5') : null,
    },
    {
      id:1, icon:'⚛', label:'实验一<br>叠加态',
      status: !preTestDone ? 'locked' : (exp1Done ? 'done' : 'active'),
    },
    {
      id:2, icon:'🔗', label:'实验二<br>Bell 态',
      status: !exp1Done ? 'locked' : (exp2Done ? 'done' : 'active'),
    },
    {
      id:3, icon:'🔍', label:'实验三<br>Grover',
      status: !exp2Done ? 'locked' : (exp3Done ? 'done' : 'active'),
    },
    {
      id:4, icon:'🎓', label:'后测',
      status: !exp3Done ? 'locked' : (postTestDone ? 'done' : 'active'),
      score: postTestDone ? (st.postScore + ' / 5') : null,
    },
  ];

  const gainHtml = (preTestDone && postTestDone)
    ? `<div class="cmap-gain">
        🎉 学习增益：前测 ${st.preScore}/5 → 后测 ${st.postScore}/5，提升 +${st.postScore - st.preScore} 题
        <br>
        <button onclick="_downloadCertificate()" style="margin-top:12px;padding:8px 22px;background:rgba(104,211,145,.12);border:1px solid rgba(104,211,145,.35);border-radius:8px;color:#68d391;font-size:13px;font-weight:600;cursor:pointer;transition:.2s;"
          onmouseover="this.style.background='rgba(104,211,145,.22)'" onmouseout="this.style.background='rgba(104,211,145,.12)'">
          🎓 下载学习证书
        </button>
      </div>`
    : '';

  const nodesHtml = nodes.map(function(n, i) {
    const arrow = i < nodes.length - 1
      ? '<div class="cmap-arrow"></div>'
      : '';
    const scoreHtml = n.score
      ? `<div class="cmap-score">${n.score}</div>`
      : '';
    return `
      <div class="cmap-node ${n.status}">
        <div class="cmap-circle" onclick="_cmapNodeClick(${n.id})">${n.icon}</div>
        <div class="cmap-label">${n.label}</div>
        ${scoreHtml}
      </div>
      ${arrow}
    `;
  }).join('');

  overlay.innerHTML = `
    <div class="cmap-wrap">
      <div class="cmap-hd">
        <h2>量子计算学习地图</h2>
        <p>依次完成 前测 → 引导实验一二三 → 后测，逐步解锁全部内容</p>
      </div>
      <div class="cmap-nodes">${nodesHtml}</div>
      ${gainHtml}
      <div class="cmap-foot">
        <button class="cmap-btn-exit" onclick="_exitCourseMode()">退出课程模式</button>
      </div>
    </div>
  `;
  overlay.classList.add('visible');
}

function _cmapNodeClick(nodeId) {
  const st = _cs();
  const pre  = st.preScore  != null;
  const e1   = !!st.exp1Done;
  const e2   = !!st.exp2Done;
  const e3   = !!st.exp3Done;

  // 前测：始终可进入（无前置条件）
  if (nodeId === 0) {
    _showTestOverlay(
      '前测：量子计算基础测验',
      '请独立完成以下 5 道题，了解你的量子计算基础。',
      _PRETEST_QS,
      function(score) {
        _setCs({ preScore: score });
        _logEvent('pretest_done', { score });
        localStorage.setItem('qedu_pretest_score', String(score));
        _showCourseMap();
      }
    );
  // 实验一：完成前测后可进入（可复习）
  } else if (nodeId === 1 && pre) {
    _hideCourseMap();
    _startExp(1);
  // 实验二：完成实验一后可进入（可复习）
  } else if (nodeId === 2 && e1) {
    _hideCourseMap();
    _startExp(2);
  // 实验三：完成实验二后可进入（可复习）
  } else if (nodeId === 3 && e2) {
    _hideCourseMap();
    _startExp(3);
  // 后测：完成三个实验后可进入（可复习）
  } else if (nodeId === 4 && e3) {
    _hideCourseMap();
    _showTestOverlay(
      '后测：量子计算掌握测验',
      '完成以下 5 道题，检验你通过三个实验的学习成果！',
      _POSTTEST_QS,
      function(score) {
        _setCs({ postScore: score });
        _logEvent('posttest_done', { score });
        localStorage.setItem('qedu_posttest_score', String(score));
        _showCourseMap();
      }
    );
  }
  // 尚未解锁的节点：不响应
}

function _hideCourseMap() {
  const overlay = document.getElementById('course-map-overlay');
  if (overlay) overlay.classList.remove('visible');
}

function _exitCourseMode() {
  _setCs({ mode: false });
  _hideCourseMap();
  if (typeof showHomeScreen === 'function') showHomeScreen();
}

// ─── 引导实验脚本 ─────────────────────────────────────────────────

const _EXP_SCRIPTS = {
  1: [
    {
      badge:    '实验一 · 步骤 1 / 6',
      title:    '认识量子比特',
      body:     '传统计算机用<b>比特（bit）</b>存储信息，每个比特只能是 0 或 1，就像只有开/关两种状态的电灯开关。<br><br>量子比特（<b>Qubit</b>）则完全不同：它可以同时处于 0 和 1 的混合状态，称为<b>叠加态（Superposition）</b>。好比一枚旋转中的硬币——落地前既不是正面也不是反面，而是"同时都是"；只有落地（被测量）才确定。<br><br><div class="cexp-tip">💡 <b>关键点：</b>叠加态不是"我们不知道答案"，而是量子比特<b>真实地同时存在于两种状态</b>。这是量子力学的核心，也是量子计算能并行探索大量可能性的物理基础。</div>',
      aiPrompt: '请用通俗语言解释量子比特和叠加态，用抛硬币的类比来说明，不要出现数学公式，不超过80字。',
      action:   'click',
    },
    {
      badge:    '实验一 · 步骤 2 / 6',
      title:    '添加 H 门（Hadamard 门）',
      body:     '💡 请将左侧工具栏中的 <b>H 门</b>（Hadamard 门）拖放到量子线路第 1 行（q0）的第一个时间步。<br><br>H 门是量子计算中最重要的"叠加门"。它将确定的 |0⟩ 态变为均匀叠加：<br>&nbsp;&nbsp;&nbsp;|0⟩ → ( |0⟩ + |1⟩ ) / √2<br><br>测量时 0 和 1 各有 <b>50% 的概率</b>，完全无法预测——但正是这种量子随机性赋予了量子计算并行能力。<br><br><div class="cexp-tip">🔑 <b>Bloch 球视角：</b>H 门将量子比特从北极（|0⟩）旋转到赤道，在几何上代表均匀叠加态。</div>',
      aiPrompt: '请用通俗语言解释H门（Hadamard门）的作用，使用旋转硬币的类比，不超过80字。',
      action:   'gate',
      expectGate: 'H',
    },
    {
      badge:    '实验一 · 步骤 3 / 6',
      title:    '太好了！叠加态创建成功',
      body:     '✅ H 门已成功放置！量子线路准备就绪。<br><br>现在点击上方工具栏的 <b>「运行」</b> 按钮，仿真器将用矩阵运算计算量子态演化，给出：<br>• <b>概率分布</b>：每种测量结果的概率<br>• <b>Bloch 球</b>：量子态的几何可视化<br>• <b>态矢量</b>：量子态的完整数学表示<br><br><div class="cexp-tip">📐 <b>仿真器背后：</b>量子线路仿真使用矩阵-向量乘法。n 个量子比特的状态向量有 2ⁿ 个分量——这也是经典计算机难以模拟大量子系统的原因。</div>',
      aiPrompt: '请解释H门后量子比特变成叠加态，测量时各有50%概率得到0或1，用通俗语言，不超过80字。',
      action:   'run',
    },
    {
      badge:    '实验一 · 步骤 4 / 6',
      title:    '观察仿真结果',
      body:     '✅ 仿真完成！请观察两个关键图形：<br><br>📊 <b>概率图（右侧面板）</b><br>|0⟩ 和 |1⟩ 各约 50%，两根柱形等高——这就是"均匀叠加"的完美体现。<br><br>🌐 <b>Bloch 球</b><br>• 北极点 = |0⟩（确定的 0 态）<br>• 南极点 = |1⟩（确定的 1 态）<br>• <b>赤道上的点 = 均匀叠加态</b><br><br>经过 H 门后，箭头从北极旋转到了赤道，代表 50/50 的完美叠加。',
      aiPrompt: '请解释Bloch球上赤道位置代表量子叠加态，与北极点|0⟩和南极点|1⟩的区别，不超过80字。',
      action:   'click',
    },
    {
      badge:    '实验一 · 步骤 5 / 6',
      title:    '量子测量与坍缩',
      body:     '叠加态背后藏着量子力学最深刻的谜题——<b>测量导致坍缩</b>：<br><br>在被测量之前，量子比特真实地处于 0 和 1 的叠加中。一旦被测量（或与外界交互），叠加态立刻"坍缩"为确定的 0 或 1。<br><br>• 每次测量结果随机（各 50%）<br>• 测量后叠加消失，无法恢复<br>• 这<b>不是</b>经典概率（如硬币已落被遮住），而是量子世界的本质——叠加在测量前真实存在<br><br><div class="cexp-tip">🔬 <b>算法设计意义：</b>量子算法的精髓在于，在测量之前利用量子干涉将"好答案"的概率放大，再一次性读出。过早测量会破坏计算过程。</div>',
      aiPrompt: '请用通俗语言解释量子测量导致波函数坍缩，用"观察旋转硬币让它停下"的类比，不超过80字。',
      action:   'click',
    },
    {
      badge:    '实验一 · 步骤 6 / 6',
      title:    '小测验 — 完成即解锁实验二',
      body:     '回答以下问题，验证你对叠加态的理解。',
      aiPrompt: null,
      action:   'quiz',
      quiz: {
        q:    'H 门（Hadamard 门）作用于 |0⟩ 态，结果是：',
        opts: [
          '量子比特保持在 |0⟩ 不变',
          '量子比特变成确定的 |1⟩',
          '量子比特变成 |0⟩ 和 |1⟩ 各 50% 的均匀叠加态',
          '量子比特被销毁',
        ],
        ans: 2,
      },
    },
  ],

  2: [
    {
      badge:    '实验二 · 步骤 1 / 6',
      title:    '量子纠缠：神奇的关联',
      body:     '量子纠缠是量子力学最令人惊叹的特性，也是量子密码、量子通信的核心资源。<br><br><b>什么是纠缠？</b><br>当两个量子比特"纠缠"时，它们共同处于一个<b>联合量子态</b>，不能再被单独描述。无论相距多远，测量其中一个会<b>立即</b>确定另一个的状态。<br><br>爱因斯坦称此为 <b>"鬼魅般的超距作用"</b>（Spooky action at a distance），认为这违反了相对论。然而贝尔不等式实验（2015年最终确认）证明：量子纠缠是真实的物理现象，<b>无法</b>用任何经典隐变量理论解释。',
      aiPrompt: '请用通俗语言解释量子纠缠，使用双胞胎心灵感应的类比，不要出现数学公式，不超过100字。',
      action:   'click',
    },
    {
      badge:    '实验二 · 步骤 2 / 6',
      title:    '第一步：添加 H 门',
      body:     '💡 请将 <b>H 门</b> 拖放到第 1 行（q0）的第一个时间步。<br><br><b>为什么要先用 H 门？</b><br>创建纠缠的标准步骤是"叠加 + 受控操作"：<br>① H 门让 q0 进入叠加态：( |0⟩ + |1⟩ ) / √2<br>② 后续 CNOT 门根据 q0 的状态同步修改 q1<br><br>由于 q0 处于叠加，q1 的变化也是叠加的——两者就相互"绑定"，形成纠缠。<br><br><div class="cexp-tip">🧩 <b>类比：</b>想象 q0 是旋转中的硬币，CNOT 让 q1 镜像 q0 的旋转。硬币停下时，两者必然正面朝同一方向。</div>',
      aiPrompt: '为什么创建Bell态（量子纠缠）需要先用H门创造叠加态？用通俗语言解释，不超过80字。',
      action:   'gate',
      expectGate: 'H',
    },
    {
      badge:    '实验二 · 步骤 3 / 6',
      title:    '第二步：添加 CNOT 门',
      body:     '💡 请将 <b>CNOT 门</b>（受控非门）放到 q0 行的下一时间步，并将 q1 设为目标比特（点击 q1 行的对应位置）。<br><br><b>CNOT 门规则：</b><br>• 控制比特 q0 = |0⟩ → q1 <b>不变</b><br>• 控制比特 q0 = |1⟩ → q1 <b>翻转</b>（0↔1）<br><br>由于 q0 处于叠加，CNOT 的两种效果同时发生：<br>&nbsp;&nbsp;&nbsp;|0⟩|0⟩ → |0⟩|0⟩ 且 |1⟩|0⟩ → |1⟩|1⟩<br><br>叠加后形成 <b>Bell 态</b>：( |00⟩ + |11⟩ ) / √2',
      aiPrompt: '请用通俗语言解释CNOT门的作用，以及H门+CNOT门为什么能创造Bell态，不超过80字。',
      action:   'gate',
      expectGate: 'CNOT',
    },
    {
      badge:    '实验二 · 步骤 4 / 6',
      title:    '运行仿真，观察 Bell 态',
      body:     '💡 点击「<b>运行</b>」按钮，仿真 Bell 态量子线路。<br><br><b>期待看到的结果：</b><br>概率图出现<b>两根等高柱形</b>：<br>&nbsp;&nbsp;&nbsp;|00⟩ ≈ 50%&nbsp;&nbsp;&nbsp;|11⟩ ≈ 50%<br>&nbsp;&nbsp;&nbsp;|01⟩ = 0%&nbsp;&nbsp;&nbsp;&nbsp;|10⟩ = 0%<br><br><div class="cexp-tip">❓ <b>为什么 |01⟩ 和 |10⟩ 恰好为 0？</b><br>这正是纠缠的体现：两个比特的测量结果永远一致（要么都 0，要么都 1）。这与"两枚各自随机的硬币凑巧一致"有本质区别——纠缠是更深层的量子关联。</div>',
      aiPrompt: '请解释Bell态(|00⟩+|11⟩)/√2的含义，为什么说这两个比特是纠缠的，用通俗语言，不超过80字。',
      action:   'run',
    },
    {
      badge:    '实验二 · 步骤 5 / 6',
      title:    '纠缠的含义',
      body:     '✅ 你已成功创建 Bell 态！深入理解纠缠的物理意义：<br><br><b>经典关联 vs. 量子纠缠</b><br>• 经典相关（如一双手套）：手套颜色已经确定，只是你还没看——这是<b>隐变量</b>理论。<br>• 量子纠缠：测量前两个比特<b>都没有</b>确定的值，它们共同处于一个叠加态；测量那一刻，关联瞬间显现。<br><br>贝尔不等式给出了可测量的区分标准，1972 年以来所有实验都支持量子纠缠，而非经典隐变量。<br><br><div class="cexp-tip">📡 <b>应用：</b>量子密钥分发（QKD）、量子隐形传态、分布式量子计算、量子纠错码——纠缠是这些技术的物理基础。</div>',
      aiPrompt: '请解释量子纠缠和经典相关性的区别，为什么量子纠缠比经典随机关联更深刻，用生活类比，不超过80字。',
      action:   'click',
    },
    {
      badge:    '实验二 · 步骤 6 / 6',
      title:    '小测验 — 完成即解锁实验三',
      body:     '回答以下问题，检验你对量子纠缠的理解。',
      aiPrompt: null,
      action:   'quiz',
      quiz: {
        q:    'Bell 态 (|00⟩+|11⟩)/√2 中，测量第一个比特得到 |1⟩，第二个比特的状态是：',
        opts: [
          '随机，各有 50% 概率是 0 或 1',
          '一定是 |0⟩',
          '一定是 |1⟩',
          '保持不变，仍处于叠加态',
        ],
        ans: 2,
      },
    },
  ],

  3: [
    {
      badge:    '实验三 · 步骤 1 / 4',
      title:    'Grover 搜索：量子加速',
      body:     '设想在 <b>100 万个</b>未排序的箱子里找一个宝藏：<br>• 经典计算机（顺序搜索）：平均打开 <b>50 万</b> 个箱子<br>• Grover 量子算法：仅需约 <b>√1000000 ≈ 1000 次</b>操作<br><br><b>为什么量子能加速？</b><br>Grover 算法利用<b>量子干涉</b>：反复执行"标记目标 + 放大振幅"的循环，让目标态的概率越来越大，其他态越来越小，直到目标以接近 100% 的概率"浮出水面"。<br><br><div class="cexp-tip">📐 <b>数学意义：</b>Grover 的 O(√N) 是无结构搜索的量子下界——数学上已证明无法做得更好。在密码学中，它意味着对称密钥长度需要<b>加倍</b>才能维持相同安全强度。</div>',
      aiPrompt: '请用通俗语言解释Grover搜索算法的"平方加速"，用在图书馆找书的类比，不要出现数学公式，不超过100字。',
      action:   'click',
    },
    {
      badge:    '实验三 · 步骤 2 / 4',
      title:    '加载 Grover 预设线路',
      body:     '点击下方按钮加载完整的 Grover 搜索预设线路。<br><br><b>线路结构（3 量子比特 / 8 个搜索空间）：</b><br>① <b>初始化</b>：对所有量子比特施加 H 门，形成 8 个状态的均匀叠加，各有 1/8 概率<br>② <b>Oracle 门</b>：对目标态施加相位翻转，"标记"目标（把目标振幅变为负数）<br>③ <b>Diffusion 算子</b>：以平均振幅为轴反射，"放大"被标记的目标振幅<br>④ 重复②③约 π√N/4 次后测量<br><br><div class="cexp-tip">🔑 <b>Oracle 的关键：</b>Oracle 只需能<b>验证</b>一个候选是否正确，而不需要"找到"它。就像验证数独解比求解容易得多——这使 Grover 算法具有广泛适用性。</div>',
      aiPrompt: '请解释Grover算法中Oracle门和Diffusion算子的作用，用"放大目标信号"的类比，不超过80字。',
      action:   'preset',
    },
    {
      badge:    '实验三 · 步骤 3 / 4',
      title:    '运行 Grover 搜索',
      body:     '💡 点击「<b>运行</b>」按钮，观察量子干涉使目标振幅放大的效果。<br><br><b>期待看到的结果：</b><br>概率图中，目标态的概率柱<b>显著高于</b>其他态（通常超过 90%）——这就是量子干涉的力量。<br><br><b>振幅放大的原理：</b><br>每次 Oracle + Diffusion 迭代后：<br>• 目标振幅 ↑（趋近 +1）<br>• 非目标振幅 ↓（趋近 0）<br><br><div class="cexp-tip">⚠️ <b>注意：</b>Grover 迭代有最优次数（≈ π√N/4 次）。迭代太少则目标概率不足；迭代过多则概率又会下降——振幅如同钟摆来回振荡。选对迭代次数是实际工程中的关键。</div>',
      aiPrompt: '请解释Grover算法通过量子干涉放大目标态振幅的原理，用通俗类比，不超过80字。',
      action:   'run',
    },
    {
      badge:    '实验三 · 步骤 4 / 4',
      title:    '小测验 — 完成即解锁后测',
      body:     '回答以下问题，检验你对 Grover 搜索的理解。',
      aiPrompt: null,
      action:   'quiz',
      quiz: {
        q:    'Grover 搜索算法在 N 个元素中查找目标，需要约多少次操作？',
        opts: [
          'N 次（与经典搜索相同）',
          '√N 次（平方加速）',
          'log₂N 次（对数加速）',
          'N² 次（比经典更慢）',
        ],
        ans: 1,
      },
    },
  ],
};

// ─── 微课视频配置 ─────────────────────────────────────────────────
// 录制完成后将视频文件放入 前端/videos/ 目录，更新 file 字段即可

var _EXP_VIDEOS = {
  1: { title: '微课：量子比特与叠加态',  file: 'videos/exp1_superposition.mp4', duration: '约3分钟' },
  2: { title: '微课：量子纠缠与Bell态',  file: 'videos/exp2_entanglement.mp4',  duration: '约3分钟' },
  3: { title: '微课：Grover量子搜索',    file: 'videos/exp3_grover.mp4',         duration: '约2分钟' },
};

var _videoOnContinue = null;

function _showVideoModal(expN, onContinue) {
  _videoOnContinue = onContinue;
  var existing = document.getElementById('course-video-modal');
  if (existing) existing.remove();

  var v = _EXP_VIDEOS[expN] || {};
  var modal = document.createElement('div');
  modal.id = 'course-video-modal';
  modal.className = 'cvid-modal';
  modal.innerHTML =
    '<div class="cvid-box">' +
      '<div class="cvid-badge">📹 微课视频 · 实验 ' + expN + ' / 3</div>' +
      '<div class="cvid-title">' + (v.title || '') + '</div>' +
      '<video class="cvid-player" controls preload="metadata">' +
        '<source src="' + (v.file || '') + '" type="video/mp4">' +
        '<div class="cvid-nf">📽 视频尚未就绪<br>录制完成后放入 前端/videos/ 目录即可</div>' +
      '</video>' +
      '<div class="cvid-actions">' +
        '<button class="cvid-btn cvid-btn-p" onclick="_videoContinue()">已观看，开始实验 →</button>' +
        '<button class="cvid-btn cvid-btn-s" onclick="_videoContinue()">跳过视频</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
}

function _videoContinue() {
  var modal = document.getElementById('course-video-modal');
  if (modal) {
    // 暂停视频防止背景音
    var v = modal.querySelector('video');
    if (v) { v.pause(); }
    modal.remove();
  }
  if (_videoOnContinue) {
    var cb = _videoOnContinue;
    _videoOnContinue = null;
    cb();
  }
}

// ─── 完课证书 ─────────────────────────────────────────────────────

function _downloadCertificate() {
  var st = _cs();
  var pre  = st.preScore  != null ? st.preScore  : 0;
  var post = st.postScore != null ? st.postScore : 0;
  var gain = post - pre;
  var date = new Date().toLocaleDateString('zh-CN');

  var html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">' +
    '<title>Q-Edu 量子计算学习证书</title><style>' +
    'body{margin:0;background:#040818;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:-apple-system,"PingFang SC",sans-serif;}' +
    '.cert{width:820px;padding:60px 72px;background:#040818;border:2.5px solid #63b3ed;border-radius:18px;text-align:center;color:#e2e8f0;}' +
    '.logo{font-size:42px;margin-bottom:10px;}' +
    '.title{font-size:30px;font-weight:700;color:#f6e05e;margin:0 0 6px;}' +
    '.platform{font-size:13px;color:rgba(226,232,240,.45);margin:0 0 40px;}' +
    '.body{font-size:15px;color:rgba(226,232,240,.75);margin-bottom:36px;line-height:1.8;}' +
    '.scores{display:flex;justify-content:center;align-items:center;gap:40px;margin-bottom:20px;}' +
    '.sbox{text-align:center;}.snum{font-size:52px;font-weight:700;line-height:1;}' +
    '.snum.pre{color:#63b3ed;}.snum.post{color:#68d391;}' +
    '.sdenom{font-size:20px;color:rgba(226,232,240,.35);}' +
    '.slabel{font-size:11px;color:rgba(226,232,240,.4);margin-top:5px;}' +
    '.arrow{font-size:26px;color:rgba(246,224,94,.4);}' +
    '.gain{font-size:22px;font-weight:700;color:#68d391;margin:10px 0 36px;}' +
    '.exps{font-size:13px;color:rgba(226,232,240,.55);margin-bottom:40px;line-height:2;}' +
    '.foot{font-size:11px;color:rgba(226,232,240,.25);border-top:1px solid rgba(99,179,237,.15);padding-top:18px;margin-top:8px;}' +
    '.print-hint{position:fixed;top:20px;right:20px;padding:10px 22px;background:#3182ce;color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer;}' +
    '@media print{.print-hint{display:none;}body{background:#fff;}.cert{border-color:#aaa;color:#111;}.title{color:#333;}.snum.pre{color:#2b6cb0;}.snum.post{color:#276749;}.gain{color:#276749;}.platform,.slabel,.exps,.foot{color:#555;}}' +
    '</style></head><body>' +
    '<button class="print-hint" onclick="window.print()">🖨 打印 / 保存 PDF</button>' +
    '<div class="cert">' +
      '<div class="logo">⚛</div>' +
      '<div class="title">量子计算虚拟仿真学习证书</div>' +
      '<div class="platform">Q-Edu 量子计算虚拟仿真教学平台 · 《人工智能通识》·《大学计算机基础》</div>' +
      '<div class="body">恭喜你完整体验了量子计算课程学习！<br>你掌握了量子叠加态、Bell态纠缠与Grover搜索三个核心量子算法。</div>' +
      '<div class="scores">' +
        '<div class="sbox"><div class="snum pre">' + pre + '<span class="sdenom">/5</span></div><div class="slabel">前测得分</div></div>' +
        '<div class="arrow">→</div>' +
        '<div class="sbox"><div class="snum post">' + post + '<span class="sdenom">/5</span></div><div class="slabel">后测得分</div></div>' +
      '</div>' +
      '<div class="gain">学习提升 ' + (gain >= 0 ? '+' : '') + gain + ' 题 🎉</div>' +
      '<div class="exps">✅ 实验一：量子叠加态 &nbsp;|&nbsp; ✅ 实验二：Bell 态纠缠 &nbsp;|&nbsp; ✅ 实验三：Grover 搜索</div>' +
      '<div class="foot">完成日期：' + date + ' &nbsp;·&nbsp; 量子计算虚拟仿真教学平台 · 适用于计算机基础与应用类课程</div>' +
    '</div></body></html>';

  var win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
}

// ─── 启动引导实验 ──────────────────────────────────────────────────

function _startExp(n) {
  _showVideoModal(n, function() { _startExpDirect(n); });
}

function _startExpDirect(n) {
  _setCs({ currentExp: n, expStep: 0, expectGate: null, expectRun: false, expStartTs: Date.now() });
  _logEvent('start_exp', { exp: n });

  // 进入工作台（不破坏仿真引擎）
  if (n === 3) {
    if (typeof hsStartPreset === 'function') hsStartPreset('grover');
    else if (typeof hsEnterApp === 'function') hsEnterApp();
  } else {
    if (typeof hsStartBlank === 'function') hsStartBlank();
    else if (typeof hsEnterApp === 'function') hsEnterApp();
  }

  _showExpStep(n, 0);
}

function _showExpStep(expN, step) {
  const scripts = _EXP_SCRIPTS[expN];
  if (!scripts || step >= scripts.length) return;

  const s = scripts[step];
  const overlay = document.getElementById('course-exp-overlay');
  if (!overlay) return;

  // 更新期望状态
  _setCs({ expStep: step, expectGate: s.expectGate || null, expectRun: s.action === 'run' });

  // 构建操作区
  let actHtml = '';
  if (s.action === 'click') {
    const label = step < scripts.length - 1 ? '下一步 →' : '完成实验';
    actHtml = `<div class="cexp-actions">
      <button class="cexp-btn cexp-btn-p" onclick="_expNextStep(${expN},${step})">${label}</button>
    </div>`;
  } else if (s.action === 'preset') {
    actHtml = `<div class="cexp-actions">
      <button class="cexp-btn cexp-btn-p" onclick="_expNextStep(${expN},${step})">加载 Grover 预设</button>
    </div>`;
  } else if (s.action === 'gate') {
    actHtml = `<div class="cexp-wait">⌛ 等待你拖入 ${s.expectGate} 门…</div>`;
  } else if (s.action === 'run') {
    actHtml = `<div class="cexp-wait">⌛ 等待你点击「运行」…</div>`;
  }

  // 构建小测验区
  let quizHtml = '';
  if (s.action === 'quiz' && s.quiz) {
    const optsHtml = s.quiz.opts.map(function(o, i) {
      return `<button class="cexp-quiz-opt" onclick="_expQuizAnswer(${expN},${step},${i},${s.quiz.ans})">${o}</button>`;
    }).join('');
    quizHtml = `
      <div class="cexp-quiz">
        <div class="cexp-quiz-q">🧪 ${s.quiz.q}</div>
        <div class="cexp-quiz-opts">${optsHtml}</div>
      </div>`;
  }

  // 是否需要跳到左侧（用户需要与线路交互、或查看右侧结果）
  const needsLeft = (s.action === 'gate' || s.action === 'run');
  const sideLabel = needsLeft ? '→ 移至右侧' : '← 移至左侧';
  const sideToggle = `<button class="cexp-pos-toggle" title="手动切换位置"
    onclick="_cexpTogglePos()" tabindex="-1">${sideLabel}</button>`;

  overlay.innerHTML = `
    <div class="cexp-card">
      <div class="cexp-drag-bar" id="cexp-drag-handle">
        <div class="cexp-drag-dots">
          <span></span><span></span><span></span>
          <span></span><span></span><span></span>
        </div>
        <span class="cexp-drag-tip">拖动移位</span>
        ${sideToggle}
      </div>
      <div class="cexp-badge">${s.badge}</div>
      <div class="cexp-title">${s.title}</div>
      <div class="cexp-body">${s.body}</div>
      ${s.action !== 'quiz' ? actHtml : ''}
      ${quizHtml}
      <div class="cexp-prog">实验 ${expN} / 3 &nbsp;·&nbsp; 步骤 ${step + 1} / ${scripts.length}</div>
    </div>
  `;
  overlay.classList.add('visible');

  // 自动定位（用户未手动拖拽时）
  _cexpAutoPos(overlay, needsLeft);

  // 初始化拖拽
  _cexpInitDrag(overlay);

  // 延迟触发 AI 主动气泡（不阻塞主线程）
  if (s.aiPrompt && typeof proactiveAIMessage === 'function') {
    setTimeout(function() { proactiveAIMessage(s.aiPrompt); }, 800);
  }
}

function _expNextStep(expN, currentStep) {
  const scripts = _EXP_SCRIPTS[expN];
  const s = scripts[currentStep];

  // preset 步骤：先加载预设
  if (s.action === 'preset') {
    if (typeof hsStartPreset === 'function') hsStartPreset('grover');
  }

  // 清除手动拖拽标记，让下一步自动定位
  _cexpManualPos = false;

  const next = currentStep + 1;
  if (next < scripts.length) {
    _showExpStep(expN, next);
  }
}

/* ── 浮窗定位辅助 ─────────────────────────────────────── */

// 自动定位：needsLeft=true 跳左侧，false 跳右侧
function _cexpAutoPos(overlay, needsLeft) {
  if (_cexpManualPos) return;           // 用户手动拖拽后不干预
  overlay.style.bottom = '';
  overlay.style.top    = '';
  overlay.classList.remove('cexp-pos-left', 'cexp-pos-right');
  // 用 requestAnimationFrame 确保 display:block 生效后再添加 class（触发 transition）
  requestAnimationFrame(function() {
    overlay.classList.add(needsLeft ? 'cexp-pos-left' : 'cexp-pos-right');
    // 同步重置 bottom（防止拖拽后残留 top 值）
    overlay.style.bottom = '';
    overlay.style.top    = '';
  });
}

// 手动点击切换左右
function _cexpTogglePos() {
  const overlay = document.getElementById('course-exp-overlay');
  if (!overlay) return;
  _cexpManualPos = true;
  // 若当前有 inline left（拖拽后），先清除，改用 class
  overlay.style.left   = '';
  overlay.style.top    = '';
  overlay.style.bottom = '';
  overlay.classList.toggle('cexp-pos-left');
  overlay.classList.toggle('cexp-pos-right');
  // 更新按钮文字
  const btn = overlay.querySelector('.cexp-pos-toggle');
  if (btn) {
    btn.textContent = overlay.classList.contains('cexp-pos-left') ? '→ 移至右侧' : '← 移至左侧';
  }
}

// 浮窗位置相关全局状态
var _cexpManualPos = false;   // true = 用户手动操作过，跳过自动定位
var _cexpDragState = { dragging: false, ox: 0, oy: 0, overlay: null };

function _cexpMoveHandler(e) {
  if (!_cexpDragState.dragging) return;
  var ov = _cexpDragState.overlay;
  var nx = e.clientX - _cexpDragState.ox;
  var ny = e.clientY - _cexpDragState.oy;
  var maxX = window.innerWidth  - ov.offsetWidth  - 4;
  var maxY = window.innerHeight - ov.offsetHeight - 4;
  ov.style.left = Math.max(4, Math.min(nx, maxX)) + 'px';
  ov.style.top  = Math.max(4, Math.min(ny, maxY)) + 'px';
}

function _cexpUpHandler() {
  if (!_cexpDragState.dragging) return;
  _cexpDragState.dragging = false;
  var ov = _cexpDragState.overlay;
  if (ov) {
    ov.classList.remove('cexp-dragging');
    // 更新切换按钮文字
    var btn = ov.querySelector('.cexp-pos-toggle');
    if (btn) {
      var cx = parseFloat(ov.style.left) || 0;
      btn.textContent = cx < window.innerWidth / 2 ? '→ 移至右侧' : '← 移至左侧';
    }
  }
}

// 在页面加载时绑定一次，后续复用
document.addEventListener('mousemove', _cexpMoveHandler);
document.addEventListener('mouseup',   _cexpUpHandler);

function _cexpInitDrag(overlay) {
  const handle = document.getElementById('cexp-drag-handle');
  if (!handle) return;

  handle.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    _cexpManualPos = true;

    const rect = overlay.getBoundingClientRect();
    overlay.classList.add('cexp-dragging');
    overlay.classList.remove('cexp-pos-left', 'cexp-pos-right');
    overlay.style.left   = rect.left + 'px';
    overlay.style.top    = rect.top  + 'px';
    overlay.style.bottom = 'auto';

    _cexpDragState.dragging = true;
    _cexpDragState.ox       = e.clientX - rect.left;
    _cexpDragState.oy       = e.clientY - rect.top;
    _cexpDragState.overlay  = overlay;
  });
}

function _expQuizAnswer(expN, step, chosen, correct) {
  // 禁用所有选项
  document.querySelectorAll('.cexp-quiz-opt').forEach(function(btn, i) {
    btn.disabled = true;
    if (i === correct) btn.classList.add('ok');
    else if (i === chosen && chosen !== correct) btn.classList.add('no');
  });

  if (chosen === correct) {
    // 答对：记录用时，标记实验完成，延迟返回地图
    var startTs  = _cs().expStartTs;
    var duration = startTs ? Math.round((Date.now() - startTs) / 1000) : 0;
    var key = 'exp' + expN + 'Done';
    var upd = {}; upd[key] = true;
    _setCs(upd);
    var dkey = 'exp' + expN + 'Duration'; var dupd = {}; dupd[dkey] = duration;
    _setCs(dupd);
    _setCs({ currentExp: null, expStep: 0 });
    _logEvent('exp_done', { exp: expN, duration: duration });

    setTimeout(function() {
      var ov = document.getElementById('course-exp-overlay');
      if (ov) { ov.classList.remove('visible'); ov.innerHTML = ''; }
      _showCourseMap();
    }, 1400);
  } else {
    // 答错：提示 + 触发 AI 针对性解释 + 延迟重试
    var quiz = document.querySelector('.cexp-quiz');
    if (quiz) {
      var msg = document.createElement('div');
      msg.style.cssText = 'font-size:11px;color:rgba(229,62,62,.75);margin-top:8px;';
      msg.textContent = '答案不对，AI 正在为你解释…稍后可重试。';
      quiz.appendChild(msg);
      setTimeout(function() { _showExpStep(expN, step); }, 2600);
    }
    // AI 主动解释错误原因（用生活类比，不超过 60 字）
    var quizData = _EXP_SCRIPTS[expN] && _EXP_SCRIPTS[expN][step] && _EXP_SCRIPTS[expN][step].quiz;
    if (quizData && typeof proactiveAIMessage === 'function') {
      proactiveAIMessage(
        '学生在量子计算课程练习题中答错了。' +
        '题目是：「' + quizData.q + '」' +
        '学生选了：「' + quizData.opts[chosen] + '」，' +
        '正确答案是：「' + quizData.opts[correct] + '」。' +
        '请用一句生活类比，温和地解释为什么正确答案是对的，' +
        '不要说"你答错了"，不要用数学公式，不超过60字。'
      );
    }
  }
}

// ─── 触发器（由 circuit.js / sim.js 调用）─────────────────────────

/** 门放置触发器 */
function triggerAI_onGateDrop(gateName) {
  if (!inCourseMode()) return;
  var st = _cs();
  if (st.currentExp == null || !st.expectGate) return;

  var placed   = (gateName || '').toUpperCase();
  var expected = st.expectGate.toUpperCase();

  var match = placed === expected
    || (expected === 'CNOT' && (placed === 'CX' || placed === 'CNOT'))
    || (expected === 'H'    && placed === 'H');

  if (match) {
    var expN = st.currentExp;
    var step = st.expStep || 0;
    _setCs({ expectGate: null }); // 清除期望，避免重复触发
    setTimeout(function() { _expNextStep(expN, step); }, 350);
  }
}

/** 运行完成触发器 */
function triggerAI_afterRun() {
  if (!inCourseMode()) return;
  var st = _cs();
  if (st.currentExp == null || !st.expectRun) return;

  var expN = st.currentExp;
  var step = st.expStep || 0;
  _setCs({ expectRun: false }); // 清除期望，避免重复触发
  setTimeout(function() { _expNextStep(expN, step); }, 550);
}

// ─── 前测题库 ─────────────────────────────────────────────────────

var _PRETEST_QS = [
  {
    q: '量子比特（Qubit）与经典比特最大的区别是：',
    opts: [
      '量子比特计算速度更快',
      '量子比特可以同时处于 0 和 1 的叠加状态',
      '量子比特能存储更大的数字',
      '量子比特不需要能量就能工作',
    ],
    ans: 1,
  },
  {
    q: '量子叠加态在被测量后会发生什么？',
    opts: [
      '保持叠加状态不变',
      '同时给出 0 和 1 两个结果',
      '随机坍缩为 0 或 1 中的一个确定值',
      '变成一个新的量子比特',
    ],
    ans: 2,
  },
  {
    q: '量子纠缠的含义是：',
    opts: [
      '两个量子比特物理上绑在一起',
      '两个量子比特的状态存在超越距离的关联',
      '量子比特互相传输信息',
      '量子比特同时在两个地方',
    ],
    ans: 1,
  },
  {
    q: '量子计算机相比经典计算机的优势主要在于：',
    opts: [
      '能运行所有经典程序且速度更快',
      '不会出错，计算结果 100% 正确',
      '在特定问题（如搜索、因式分解）上可实现指数级或平方级加速',
      '体积更小，功耗更低',
    ],
    ans: 2,
  },
  {
    q: 'H 门（Hadamard 门）的作用是：',
    opts: [
      '将量子比特从 |0⟩ 翻转到 |1⟩',
      '测量量子比特的状态',
      '将量子比特变成 |0⟩ 和 |1⟩ 的均匀叠加态',
      '连接两个量子比特产生纠缠',
    ],
    ans: 2,
  },
];

// ─── 后测题库 ─────────────────────────────────────────────────────

var _POSTTEST_QS = [
  {
    q: 'H 门作用于 |0⟩ 后，测量得到 |1⟩ 的概率是：',
    opts: ['0%', '25%', '50%', '100%'],
    ans: 2,
  },
  {
    q: 'Bell 态 (|00⟩+|11⟩)/√2 中，测量第一个比特得到 0 后，第二个比特的状态是：',
    opts: [
      '叠加态，各 50% 概率',
      '一定是 |0⟩',
      '一定是 |1⟩',
      '完全随机',
    ],
    ans: 1,
  },
  {
    q: 'Grover 搜索算法在 N 个元素中查找一个目标，需要约多少次查询？',
    opts: ['N 次', '√N 次', 'N/2 次', 'log₂N 次'],
    ans: 1,
  },
  {
    q: '量子叠加态的本质含义是：',
    opts: [
      '量子比特"不知道"自己是什么状态',
      '量子比特以不同概率振幅同时处于多个基态的线性组合',
      '量子比特在 0 和 1 之间快速切换',
      '量子计算机同时运行两个程序',
    ],
    ans: 1,
  },
  {
    q: 'CNOT 门（受控非门）的作用是：',
    opts: [
      '将两个量子比特都翻转',
      '当控制比特为 |1⟩ 时，翻转目标比特；否则不变',
      '无论控制比特状态如何，都将两个比特纠缠',
      '测量两个量子比特并输出经典结果',
    ],
    ans: 1,
  },
];

// ─── 前后测浮层渲染 ───────────────────────────────────────────────

function _showTestOverlay(title, subtitle, questions, onComplete) {
  var overlay = document.getElementById('course-test-overlay');
  if (!overlay) return;

  var currentQ = 0;
  var scores   = new Array(questions.length).fill(null);

  function renderQ(idx) {
    var q = questions[idx];
    var dotsHtml = questions.map(function(_, i) {
      var cls = i < idx ? 'done' : (i === idx ? 'cur' : '');
      return '<div class="ctest-dot ' + cls + '"></div>';
    }).join('');
    var optsHtml = q.opts.map(function(o, i) {
      return '<button class="ctest-opt" data-i="' + i + '">' + o + '</button>';
    }).join('');

    overlay.innerHTML = `
      <div class="ctest-wrap">
        <div class="ctest-hd">
          <h2>${title}</h2>
          <p>${subtitle}</p>
        </div>
        <div class="ctest-dots">${dotsHtml}</div>
        <div class="ctest-qn">第 ${idx + 1} 题 / 共 ${questions.length} 题</div>
        <div class="ctest-qt">${q.q}</div>
        <div class="ctest-opts">${optsHtml}</div>
        <button class="ctest-next" id="ctest-next-btn">
          ${idx < questions.length - 1 ? '下一题 →' : '查看结果'}
        </button>
      </div>
    `;

    // 绑定选项事件
    overlay.querySelectorAll('.ctest-opt').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var chosen = parseInt(btn.dataset.i);
        var correct = questions[idx].ans;
        scores[idx] = chosen === correct ? 1 : 0;

        overlay.querySelectorAll('.ctest-opt').forEach(function(b, i) {
          b.disabled = true;
          if (i === correct) b.classList.add('ok');
          else if (i === chosen && chosen !== correct) b.classList.add('no');
        });

        var nextBtn = document.getElementById('ctest-next-btn');
        if (nextBtn) nextBtn.style.display = 'block';
      });
    });

    // 绑定下一题
    var nextBtn = document.getElementById('ctest-next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        currentQ++;
        if (currentQ < questions.length) {
          renderQ(currentQ);
        } else {
          showResult();
        }
      });
    }
  }

  function showResult() {
    var total = scores.filter(function(v) { return v === 1; }).length;
    var msgs = [
      '继续加油！建议再做一遍实验，带着问题仔细观察现象。',
      '不错的开始！多做几次实验会让你更熟悉这些概念。',
      '很好！你对量子计算已有初步理解。',
      '太棒了！你已掌握了量子计算的核心概念。',
      '非常出色！量子计算的精髓你已经把握住了！',
      '满分！恭喜你，量子计算高手！',
    ];
    var msg = msgs[Math.min(total, msgs.length - 1)];

    overlay.innerHTML = `
      <div class="ctest-wrap">
        <div class="ctest-result">
          <div class="ctest-result-score">${total}<span class="ctest-result-denom"> / ${questions.length}</span></div>
          <div class="ctest-result-tag">答对 ${total} 题</div>
          <div class="ctest-result-msg">${msg}</div>
          <button class="ctest-result-btn" id="ctest-close-btn">继续学习 →</button>
        </div>
      </div>
    `;

    var closeBtn = document.getElementById('ctest-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        overlay.classList.remove('visible');
        overlay.innerHTML = '';
        onComplete(total);
      });
    }
  }

  overlay.classList.add('visible');
  renderQ(0);
}

// ─── 行为日志 ─────────────────────────────────────────────────────

function _logEvent(type, data) {
  try {
    var log = JSON.parse(localStorage.getItem('qedu_course_log') || '[]');
    log.push({ type: type, data: data || {}, ts: Date.now() });
    // 只保留最近 200 条
    if (log.length > 200) log = log.slice(-200);
    localStorage.setItem('qedu_course_log', JSON.stringify(log));
  } catch(e) {}
}
