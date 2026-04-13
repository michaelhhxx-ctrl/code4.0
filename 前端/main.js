// ── MAIN — 视图切换 / 状态栏 / 初始化 ──

// ─── VIEW SWITCH（已修复切换卡顿：用 rAF 延迟 canvas 重绘）───
function setView(v, el) {
  document.querySelectorAll('.ntab').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  const _mob = window.innerWidth <= 768;
  const map = { c: ['cv', _mob ? 'flex' : 'grid'], v: ['vv', _mob ? 'flex' : 'grid'], q: ['qv', _mob ? 'flex' : 'grid'], l: ['lv', 'block'], m: ['microv', 'block'], r: ['resv', 'block'] };
  Object.entries(map).forEach(([key, [id, display]]) => {
    document.getElementById(id).style.display = key === v ? display : 'none';
  });
  // 延迟 canvas 重绘，等待 layout 更新后再执行，避免尺寸为 0
  if (v === 'q') {
    initQAOAIfNeeded();
    requestAnimationFrame(() => { drawQAOAGraph(); if(window.posHandlesQV) posHandlesQV(); });
    setTimeout(() => _showExpBgModal('qaoa'), 350);
  }
  if (v === 'l') { renderAlgoLib(); setTimeout(() => _maybeAutoQuiz('algo'), 3500); }
  if (v === 'm') renderMicroCenter();
  if (v === 'r') renderResourceLib();
  if (v === 'c') requestAnimationFrame(() => { drawBloch(); renderProbChart(); });
  if (v === 'v') {
    requestAnimationFrame(() => {
      if(window.posHandlesVV) posHandlesVV();
      if(typeof vqeData !== 'undefined' && vqeData.length > 1) drawVQEChart();
    });
    setTimeout(() => _showExpBgModal('vqe'), 350);
  }
  if (_mob) _syncMobilePanelDefault(v);
}

// ─── 移动端面板切换 ───
function setMobilePanel(n) {
  ['cv', 'vv', 'qv'].forEach(id => document.getElementById(id)?.setAttribute('data-mpanel', String(n)));
  document.querySelectorAll('.mpb-btn').forEach((b, i) => b.classList.toggle('mpb-act', i + 1 === n));
  // 面板切换后重绘 canvas（切换前 canvas 可能在隐藏容器里，尺寸为 0）
  requestAnimationFrame(() => {
    drawBloch();
    renderProbChart();
    if (typeof drawQAOAGraph  === 'function') drawQAOAGraph();
    if (typeof drawQAOAChart  === 'function') drawQAOAChart();
    if (typeof drawQAOAProbs  === 'function') drawQAOAProbs();
    if (window.VQELandscape?.resize) window.VQELandscape.resize();
    if (typeof vqeData !== 'undefined' && vqeData.length > 1 && typeof drawVQEChart === 'function') drawVQEChart();
  });
}

function _syncMobilePanelDefault(v) {
  const bar = document.getElementById('mobile-panel-bar');
  if (!bar) return;
  if (v === 'l' || v === 'r') {
    bar.style.display = 'none';   // 算法库 / 资料库 不需要面板条
  } else {
    bar.style.display = '';       // 恢复：由 CSS 媒体查询控制显示
    const defaults = { c: 2, v: 1, q: 1 };
    setMobilePanel(defaults[v] ?? 1);
  }
}

// 移动端初始化：给 #cv 设正确 display 并同步按钮状态
if (window.innerWidth <= 768) {
  const _cvEl = document.getElementById('cv');
  if (_cvEl && !_cvEl.style.display) _cvEl.style.display = 'flex';
  setMobilePanel(parseInt(_cvEl?.getAttribute('data-mpanel') || '2', 10));
}

// ─── STATUS BAR ───
function setSBMsg(m) { document.getElementById('sbm').textContent = m; }

// ─── KEYBOARD SHORTCUTS ───
document.addEventListener('keydown', e => {
  if (!e.ctrlKey && !e.metaKey) return;
  if (e.key === 'z' || e.key === 'Z') {
    if (e.shiftKey) { e.preventDefault(); redo(); }
    else            { e.preventDefault(); undo(); }
  } else if (e.key === 'y' || e.key === 'Y') {
    e.preventDefault(); redo();
  }
});

// ─── RESIZE EVENT ───
window.addEventListener('resize', () => {
  drawBloch();
  renderProbChart();
  if (typeof vqeData !== 'undefined' && vqeData.length > 1) drawVQEChart();
  const dm = document.getElementById('sp-dm');
  if (dm && dm.classList.contains('on')) renderDensityMatrix();
  const ent = document.getElementById('sp-ent');
  if (ent && ent.classList.contains('on')) renderEntanglement();
});

// ─── INIT ───
renderCirc();
initBlochDrag();
drawBloch();
animateMascot();
checkBackendConn();
generateCodeStr();
updateUserUI();
// 必须在 checkShareHash() 之前记录，因为它会调用 history.replaceState 清除 hash
const _hadShareHash = location.hash.startsWith('#circ=');
checkShareHash();
loadSavedSettings();
// 首屏（宇宙动画落地页）：只要不是分享链接打开就显示；主题/关于 改由用户点击进入工作台时再触发，避免与入口逻辑重复弹窗
const _willShowHomeScreen = !_hadShareHash;
loadTheme();
// ── 视频分级加载 ──
function _loadVid(video) {
  if (!video) return;
  const src = video.querySelector('source[data-src]');
  if (src) { src.setAttribute('src', src.dataset.src); src.removeAttribute('data-src'); video.load(); }
  video.play().catch(() => {});
}
window.addEventListener('load', () => {
  ['.mhp-features .mhp-sec-video', '.mhp-bloch-sec .mhp-sec-video',
   '.mhp-metrics .mhp-sec-video', '.mhp-cta .mhp-sec-video',
   '#home-screen .screen-bg-video'
  ].forEach(sel => _loadVid(document.querySelector(sel)));
});

// 新手指南：前言/主题选择都不显示时才自动弹；首屏显示时同样跳过
setTimeout(() => {
  if (_willShowHomeScreen) return;
  const ip = document.getElementById('intro-overlay').classList.contains('on');
  const tp = document.getElementById('tp-overlay').classList.contains('on');
  if (!ip && !tp && typeof openGuide === 'function' && localStorage.getItem('qedu_guide_skip') !== '1') openGuide(0);
}, 900);

// ── 知识点自测：情景化自动弹出 ──
// context: 'algo'=算法库, 'video'=看完微课, 'vqe'=VQE收敛, 'qaoa'=QAOA完成
function _maybeAutoQuiz(context) {
  // 同一个 context 每次 session 只弹一次（用 sessionStorage）
  const key = 'qedu_quiz_shown_' + context;
  if (sessionStorage.getItem(key)) return;
  // 如果此时有其他弹窗打开则跳过
  const activeOverlays = ['tp-overlay','intro-overlay','guide-overlay','settings-overlay','course-map-overlay','course-test-overlay','exp-bg-modal-overlay'];
  if (activeOverlays.some(id => {
    const el = document.getElementById(id);
    return el && (el.classList.contains('on') || el.classList.contains('visible') || el.style.display === 'flex');
  })) return;
  sessionStorage.setItem(key, '1');

  const cfg = {
    algo:  { icon:'📚', title:'算法学完了？来测测！', body:'浏览了算法库之后，做几道知识点自测，巩固对量子门和线路的理解。', module: null },
    video: { icon:'🎬', title:'视频看完了！来测一测', body:'学完本节微课，马上做 5 道知识点题目，查漏补缺效果最好。', module: null },
    vqe:   { icon:'⚗️', title:'VQE 实验结束，测测掌握情况', body:'做几道 VQE 相关题目，检验变分原理和 Ansatz 的理解。', module: 'VQE实验' },
    qaoa:  { icon:'🕸️', title:'QAOA 优化完成，来自测', body:'做几道 QAOA 和 Max-Cut 相关题目，强化对量子近似优化的认知。', module: 'QAOA实验' },
  };
  const c = cfg[context];
  if (!c) return;

  // 创建提示卡（右下角，不遮挡主界面）
  const old = document.getElementById('_quiz-prompt');
  if (old) old.remove();

  const card = document.createElement('div');
  card.id = '_quiz-prompt';
  card.style.cssText =
    'position:fixed;bottom:90px;right:28px;z-index:8200;' +
    'background:var(--surf);border:1px solid var(--navy-lt,var(--b1));' +
    'border-radius:16px;padding:16px 18px;width:270px;' +
    'box-shadow:0 8px 32px rgba(0,0,0,.18);' +
    'animation:_qpSlideIn .28s cubic-bezier(.34,1.4,.64,1);';
  card.innerHTML =
    '<style>@keyframes _qpSlideIn{from{opacity:0;transform:translateY(18px) scale(.96)}to{opacity:1;transform:none}}</style>' +
    '<div style="display:flex;align-items:flex-start;gap:10px;">' +
      '<span style="font-size:1.6rem;line-height:1;flex-shrink:0">' + c.icon + '</span>' +
      '<div style="flex:1;">' +
        '<div style="font-size:13px;font-weight:700;color:var(--t9);margin-bottom:5px">' + c.title + '</div>' +
        '<div style="font-size:11.5px;color:var(--t5);line-height:1.6;margin-bottom:12px">' + c.body + '</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button onclick="document.getElementById(\'_quiz-prompt\').remove();openQuiz(' + (c.module ? '\'' + c.module + '\'' : '') + ')" ' +
            'style="flex:1;background:var(--navy);color:#fff;border:none;border-radius:8px;padding:7px 10px;font-size:12px;font-weight:600;cursor:pointer;">📝 开始自测</button>' +
          '<button onclick="document.getElementById(\'_quiz-prompt\').remove()" ' +
            'style="background:none;border:1px solid var(--b1);border-radius:8px;padding:7px 12px;font-size:12px;color:var(--t5);cursor:pointer;">以后再说</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(card);
  // 12 秒后自动消失（若用户未操作）
  setTimeout(() => { if (document.getElementById('_quiz-prompt')) document.getElementById('_quiz-prompt').remove(); }, 12000);
}

// ── 实验背景弹窗（每次切换到对应实验时弹出）──
function _showExpBgModal(type) {
  // 移除上次残留的弹窗（如有）
  document.getElementById('exp-bg-modal-overlay')?.remove();

  const cfg = {
    vqe: {
      title: 'VQE 变分量子本征求解器',
      color: '#6366f1',
      icon: '📉',
      videoId: 10,
      body: '<p><b>VQE</b>（Variational Quantum Eigensolver）是求解分子基态能量的核心量子-经典混合算法，是量子化学的重要工具。</p>' +
            '<p><b>核心思想：</b>用参数化量子线路（Ansatz）近似基态波函数，通过经典优化器调节参数使期望能量最小化。</p>' +
            '<p><b>知识点：</b>哈密顿量 · 变分原理 · 参数化量子线路 · 经典-量子混合算法 · Barren Plateau</p>' +
            '<p><b>应用：</b>药物分子设计 · 材料科学 · 量子化学模拟</p>' +
            '<p><b>对应课程：</b>量子计算导论 第 8 章 · 变分量子算法</p>',
    },
    qaoa: {
      title: 'QAOA 量子近似优化算法',
      color: '#0ea5e9',
      icon: '🕸️',
      videoId: 8,
      body: '<p>这是一个图分组优化问题，类似于把一群人分成两组，让组间相互认识的人最多。</p>' +
            '<p><b>QAOA</b>（Quantum Approximate Optimization Algorithm）将组合优化问题映射到量子哈密顿量，利用量子叠加寻找近似最优解。</p>' +
            '<p><b>核心思想：</b>|ψ(γ,β)⟩ = e^{-iβB} e^{-iγC} |+⟩^⊗n，通过优化 γ 和 β 参数最大化目标函数期望值。</p>' +
            '<p><b>知识点：</b>组合优化 · Max-Cut 问题 · 量子近似 · 近似比 · 量子-经典混合优化</p>' +
            '<p><b>应用：</b>物流调度 · 金融投资组合优化 · 芯片布局设计</p>' +
            '<p><b>对应课程：</b>量子计算导论 第 9 章 · 量子优化算法</p>',
    },
  };

  const c = cfg[type];
  if (!c) return;

  const overlay = document.createElement('div');
  overlay.id = 'exp-bg-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.52);' +
    'backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;' +
    'animation:_ebmFadeIn 0.22s ease;';

  overlay.innerHTML =
    '<style>' +
    '@keyframes _ebmFadeIn{from{opacity:0}to{opacity:1}}' +
    '@keyframes _ebmSlideIn{from{opacity:0;transform:translateY(28px) scale(0.96)}to{opacity:1;transform:none}}' +
    '#_ebm-box{background:var(--surf,#fff);border-radius:18px;width:min(560px,92vw);max-height:90vh;' +
      'overflow-y:auto;box-shadow:0 28px 90px rgba(0,0,0,0.3);animation:_ebmSlideIn 0.32s cubic-bezier(0.22,1,0.36,1);}' +
    '._ebm-accent{height:5px;background:' + c.color + ';border-radius:18px 18px 0 0;}' +
    '._ebm-head{padding:22px 26px 0;display:flex;align-items:flex-start;gap:13px;}' +
    '._ebm-icon{font-size:2rem;line-height:1;flex-shrink:0;margin-top:1px;}' +
    '._ebm-htitle{font-size:1.05rem;font-weight:700;color:var(--t9,#1e293b);line-height:1.3;}' +
    '._ebm-hsub{font-size:11px;color:var(--t5,#64748b);margin-top:4px;}' +
    '._ebm-close{margin-left:auto;background:none;border:none;cursor:pointer;font-size:18px;' +
      'color:var(--t5,#64748b);padding:0 2px;line-height:1;flex-shrink:0;}' +
    '._ebm-body{padding:16px 26px 0;font-size:13px;color:var(--t7,#334155);line-height:1.9;}' +
    '._ebm-body p{margin-bottom:9px;}' +
    '._ebm-body b{color:var(--t9,#1e293b);}' +
    '._ebm-foot{padding:18px 26px 22px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid var(--b1,#e2e8f0);margin-top:16px;}' +
    '._ebm-skip{background:none;border:1px solid var(--b1,#e2e8f0);border-radius:8px;' +
      'padding:8px 16px;font-size:13px;color:var(--t5,#64748b);cursor:pointer;}' +
    '._ebm-skip:hover{background:var(--b0,#f8fafc);}' +
    '._ebm-learn{background:' + c.color + ';color:#fff;border:none;border-radius:8px;' +
      'padding:8px 20px;font-size:13px;font-weight:600;cursor:pointer;transition:filter 0.15s;}' +
    '._ebm-learn:hover{filter:brightness(1.12);}' +
    '</style>' +
    '<div id="_ebm-box">' +
      '<div class="_ebm-accent"></div>' +
      '<div class="_ebm-head">' +
        '<div class="_ebm-icon">' + c.icon + '</div>' +
        '<div><div class="_ebm-htitle">📘 实验背景与知识点</div><div class="_ebm-hsub">' + c.title + '</div></div>' +
        '<button class="_ebm-close" onclick="document.getElementById(\'exp-bg-modal-overlay\').remove()">✕</button>' +
      '</div>' +
      '<div class="_ebm-body">' + c.body + '</div>' +
      '<div class="_ebm-foot">' +
        '<button class="_ebm-skip" onclick="document.getElementById(\'exp-bg-modal-overlay\').remove()">跳过，直接实验</button>' +
        '<button class="_ebm-learn" onclick="_ebmLearn(' + c.videoId + ')">🎬 一键学习</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  // 点击遮罩关闭
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
}

// 一键学习：关闭弹窗 → 切换到微课中心 → 打开对应视频
function _ebmLearn(videoId) {
  document.getElementById('exp-bg-modal-overlay')?.remove();
  const mcTab = document.querySelector('.ntab[onclick*="\'m\'"]');
  if (mcTab) setView('m', mcTab);
  requestAnimationFrame(function() {
    setTimeout(function() {
      if (typeof openMicroVideo === 'function') openMicroVideo(videoId);
    }, 120);
  });
}
