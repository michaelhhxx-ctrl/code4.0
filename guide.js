// ── BEGINNER GUIDE ──

function _guideL(zh, en) { return window.isEnglish?.() ? en : zh; }

function getGuideSteps() {
  return [
    // ── 步骤 1：欢迎 ──────────────────────────────────────────
    {
      tab: _guideL('欢迎', 'Welcome'),
      icon: '⚛',
      title: _guideL('欢迎来到 Q-Edu', 'Welcome to Q-Edu'),
      desc: _guideL(
        'Q-Edu 是一个交互式量子计算教学平台，无需量子物理基础。平台提供两种学习路径：<b>课程模式</b>（结构化引导）和<b>自由探索</b>（线路编辑、VQE、QAOA 等）。跟着这份 9 步指南，快速掌握平台全貌。',
        'Q-Edu is an interactive quantum-computing learning platform — no physics background needed. It offers two paths: <b>Course Mode</b> (structured guidance) and <b>Free Explore</b> (circuit editor, VQE, QAOA, and more). This 9-step guide walks you through the whole platform.'
      ),
      tip: _guideL(
        '💡 本指南共 9 步，可随时通过右上角"⋮"菜单 → 新手指南重新打开。',
        '💡 This guide has 9 steps. Reopen it anytime from the "⋮" menu → Beginner Guide.'
      ),
      items: [
        _guideL('📚 课程模式：前测 → 3 个引导实验 → 后测 → 学习证书', '📚 Course Mode: pre-test → 3 guided experiments → post-test → certificate'),
        _guideL('🔬 自由探索：拖拽量子门，实时 Bloch 球，AI 导师陪伴', '🔬 Free Explore: drag gates, real-time Bloch sphere, AI tutor'),
        _guideL('⚛️ 进阶实验：VQE 分子模拟 · QAOA 组合优化', '⚛️ Advanced: VQE molecular simulation · QAOA combinatorial optimization'),
        _guideL('🎬 微课中心：10 节精品视频，理论与实验无缝衔接', '🎬 Microcourse: 10 curated videos bridging theory and experiment')
      ]
    },
    // ── 步骤 2：界面布局 ──────────────────────────────────────
    {
      tab: _guideL('界面', 'Layout'),
      icon: '🗂',
      title: _guideL('界面布局', 'Interface layout'),
      desc: _guideL(
        '进入工作台后，界面分为四个区域，拖动分割线可自由调整各区域大小。导航栏可在五个主要模块间切换。',
        'The workbench is divided into four resizable areas. Use the navigation bar to switch between the five main modules.'
      ),
      tip: _guideL(
        '💡 拖动分割线：左右竖线调整列宽，中间横线调整线路区与 AI 区高度比例。右上角"⋮"可访问设置、关于、新手指南。',
        '💡 Drag splitters to resize panels. The "⋮" menu gives access to settings, about, and this guide.'
      ),
      items: [
        _guideL('左侧工具栏：所有量子门，按类分组，可直接拖拽', 'Left toolbar: quantum gates grouped by category, drag to place'),
        _guideL('中间上方：量子线路画布，你的实验区域', 'Top-center: quantum circuit canvas — your experiment area'),
        _guideL('右侧面板：Bloch 球 · 测量概率分布 · 态矢量 · 密度矩阵', 'Right panel: Bloch sphere · probabilities · state vector · density matrix'),
        _guideL('中间下方：AI 导师 Qubit 对话区；顶部导航栏切换 VQE / QAOA / 算法库 / 微课', 'Bottom-center: AI tutor Qubit; top nav switches to VQE / QAOA / Algorithm Library / Microcourse')
      ]
    },
    // ── 步骤 3：课程模式（新增）──────────────────────────────
    {
      tab: _guideL('课程模式', 'Course'),
      icon: '📚',
      title: _guideL('课程模式：结构化学习路径', 'Course Mode: Structured Learning'),
      desc: _guideL(
        '课程模式为初学者设计，提供完整的学习闭环。从前测了解基础，经过三个由浅入深的引导实验，最终完成后测并获得学习证书。',
        'Course Mode is designed for beginners with a complete learning loop: a pre-test to gauge your baseline, three progressively deeper guided experiments, a post-test, and a learning certificate.'
      ),
      tip: _guideL(
        '💡 每个实验步骤都有可拖动的引导气泡——气泡会自动移到不挡操作的一侧，也可手动拖动位置。',
        '💡 Each experiment step shows a draggable guidance bubble that auto-positions itself so it never blocks your work.'
      ),
      items: [
        _guideL('🏁 前测（5 题）：了解你的量子计算基础水平', '🏁 Pre-test (5 questions): gauge your quantum computing baseline'),
        _guideL('⚗️ 实验一：叠加态——亲手制备单量子比特叠加', '⚗️ Experiment 1: Superposition — prepare a single-qubit superposition'),
        _guideL('🔗 实验二：Bell 态——制备最大量子纠缠态并验证', '🔗 Experiment 2: Bell State — prepare and verify maximal entanglement'),
        _guideL('🔍 实验三：Grover 搜索——体验量子平方加速', '🔍 Experiment 3: Grover Search — experience quantum quadratic speedup'),
        _guideL('🏆 后测 + 学习增益报告 + 证书下载', '🏆 Post-test + learning-gain report + certificate download')
      ]
    },
    // ── 步骤 4：量子门 ────────────────────────────────────────
    {
      tab: _guideL('量子门', 'Gates'),
      icon: '🔲',
      title: _guideL('认识量子门', 'Meet the quantum gates'),
      desc: _guideL(
        '量子门是量子计算的基本操作，类似经典逻辑门，但作用于量子叠加态。从左侧工具栏拖拽到画布即可放置。',
        'Quantum gates are the basic operations of quantum computing — similar to classical logic gates but acting on superposition states. Drag them from the left toolbar onto the canvas.'
      ),
      tip: _guideL(
        '💡 最重要的三个门：H（产生叠加）、CNOT（产生纠缠）、M（测量，获得经典结果）。',
        '💡 The three most important gates: H (superposition), CNOT (entanglement), M (measurement).'
      ),
      items: [
        '<span style="font-family:var(--mono);background:var(--navy-lt);padding:1px 5px;border-radius:3px;color:var(--navy)">H</span> ' + _guideL('Hadamard：|0⟩ → (|0⟩+|1⟩)/√2，制造叠加态', 'Hadamard: |0⟩ → (|0⟩+|1⟩)/√2, creates superposition'),
        '<span style="font-family:var(--mono);background:var(--navy-lt);padding:1px 5px;border-radius:3px;color:var(--navy)">X / Y / Z</span> ' + _guideL('Pauli 门：单比特旋转，X 是量子版 NOT', 'Pauli gates: single-qubit rotations; X is the quantum NOT'),
        '<span style="font-family:var(--mono);background:var(--teal-lt);padding:1px 5px;border-radius:3px;color:var(--teal)">CNOT</span> ' + _guideL('受控非：最重要的双比特门，产生量子纠缠', 'Controlled-NOT: the key two-qubit gate, creates entanglement'),
        '<span style="font-family:var(--mono);background:#FAEEDA;padding:1px 5px;border-radius:3px;color:var(--amber)">M</span> ' + _guideL('测量：量子态坍缩为 0 或 1，得到经典结果', 'Measurement: collapses quantum state to 0 or 1')
      ]
    },
    // ── 步骤 5：第一个实验 ────────────────────────────────────
    {
      tab: _guideL('Bell 态', 'Bell State'),
      icon: '🔬',
      title: _guideL('动手实验：制备 Bell 纠缠态', 'Hands-on: Prepare a Bell State'),
      desc: _guideL(
        'Bell 态是量子纠缠的最简单实例——两个粒子无论相距多远，测量其中一个，另一个状态瞬时确定。这是量子通信与量子密钥分发的物理基础。',
        'A Bell state is the simplest quantum entanglement. Measuring one particle instantly determines the other\'s state, regardless of distance — the basis of quantum communication and QKD.'
      ),
      tip: _guideL(
        '💡 也可直接从首屏点击"Bell 态"卡片，或在算法库 tab 加载 Bell 态预置线路，无需手动搭建。',
        '💡 You can also click the Bell State card on the home screen, or load the preset from the Algorithm Library tab.'
      ),
      items: [
        _guideL('步骤 1：将 <b>H</b> 门拖到 q₀ 第 1 列', 'Step 1: Drag an <b>H</b> gate to column 1 of q₀'),
        _guideL('步骤 2：将 <b>CNOT</b> 控制端拖到 q₀ 第 2 列', 'Step 2: Drag the <b>CNOT</b> control to column 2 of q₀'),
        _guideL('步骤 3：将 <b>CNOT</b> 目标端拖到 q₁ 第 2 列', 'Step 3: Drag the <b>CNOT</b> target to column 2 of q₁'),
        _guideL('步骤 4：点击「▶ 运行」，右侧柱状图显示 |00⟩ 和 |11⟩ 各占 50%', 'Step 4: Click "▶ Run" — the chart shows |00⟩ and |11⟩ at 50% each')
      ]
    },
    // ── 步骤 6：Bloch 球 ──────────────────────────────────────
    {
      tab: 'Bloch',
      icon: '🌐',
      title: _guideL('理解 Bloch 球', 'Understand the Bloch Sphere'),
      desc: _guideL(
        'Bloch 球是单量子比特状态的完整几何表示，球面上每个点对应一个纯态。它让抽象的量子态变得直观可见。',
        'The Bloch sphere is the complete geometric picture of a single-qubit state — every point on the surface is a pure state, making abstract quantum states visually intuitive.'
      ),
      tip: _guideL(
        '💡 鼠标拖动 Bloch 球可旋转视角；点击右上角 ⤢ 按钮放大单个球；点击"展开"查看所有比特的 Bloch 球。',
        '💡 Drag to rotate the Bloch sphere; click ⤢ to zoom a single sphere; click "Expand" to see all qubits at once.'
      ),
      items: [
        _guideL('北极（+z）= |0⟩，南极（−z）= |1⟩', 'North pole (+z) = |0⟩, south pole (−z) = |1⟩'),
        _guideL('赤道上各点 = 叠加态（H 门作用后落在赤道）', 'Equator points = superposition states (H gate lands here)'),
        _guideL('红色箭头 = 态矢量，方向代表量子比特当前状态', 'Red arrow = state vector; its direction encodes the current qubit state'),
        _guideL('每添加一个门，箭头平滑旋转到新位置，直观展示门操作', 'Each gate smoothly rotates the arrow to the new state')
      ]
    },
    // ── 步骤 7：VQE & QAOA（新增）────────────────────────────
    {
      tab: 'VQE & QAOA',
      icon: '⚛️',
      title: _guideL('进阶实验：VQE 与 QAOA', 'Advanced: VQE and QAOA'),
      desc: _guideL(
        '顶部导航栏切换到「VQE」或「QAOA」可进入两个进阶量子算法实验。首次进入时会弹出背景介绍，可点击"一键学习"直接跳转到对应微课视频。',
        'Switch to "VQE" or "QAOA" in the top navigation bar to access two advanced quantum algorithm labs. A background introduction pops up on first entry, with a button to jump to the matching microcourse video.'
      ),
      tip: _guideL(
        '💡 VQE 和 QAOA 均有情景化知识点自测，完成实验后会自动弹出，检验学习效果。',
        '💡 Both VQE and QAOA trigger a contextual quiz after you finish, to check your understanding.'
      ),
      items: [
        _guideL('⚛️ <b>VQE</b>（变分量子本征求解器）：模拟 H₂、LiH 等分子基态能量，体验量子化学', '⚛️ <b>VQE</b>: simulate the ground-state energy of H₂, LiH, etc. — quantum chemistry in action'),
        _guideL('核心思想：参数化 Ansatz 线路 + 经典优化器交替迭代，使能量期望值最小', 'Key idea: parameterized Ansatz circuit + classical optimizer iterating to minimize energy expectation'),
        _guideL('🔀 <b>QAOA</b>（量子近似优化算法）：交互式图编辑，求解 Max-Cut 组合优化问题', '🔀 <b>QAOA</b>: interactive graph editor, solving the Max-Cut combinatorial optimization problem'),
        _guideL('核心思想：|ψ(γ,β)⟩ 通过调节 γ、β 参数最大化目标函数，找到近似最优割方案', 'Key idea: tune γ and β in |ψ(γ,β)⟩ to maximize the objective, finding an approximate optimal cut')
      ]
    },
    // ── 步骤 8：算法库 & 微课（新增）──────────────────────────
    {
      tab: _guideL('算法库 & 微课', 'Library & Videos'),
      icon: '🎬',
      title: _guideL('算法库与微课中心', 'Algorithm Library & Microcourse'),
      desc: _guideL(
        '顶部导航栏还有两个学习资源模块：「线路模板」算法库收录 8 个经典量子算法动画演示，「🎬 微课中心」提供 10 节系统视频课程，配合实验深化理解。',
        'The top nav also has two learning-resource modules: the Algorithm Library (8 classic algorithms with animated demos) and the Microcourse Center (10 structured video lessons to deepen understanding alongside experiments).'
      ),
      tip: _guideL(
        '💡 算法库中点击「▶ 预览」可查看逐步动画演示，点击「加载」直接把线路导入编辑器！浏览完算法库后会自动弹出知识点自测。',
        '💡 In the Algorithm Library, click "▶ Preview" for step-by-step animation, then "Load" to import the circuit into the editor. Browsing the library triggers an auto quiz.'
      ),
      items: [
        _guideL('📐 算法库（8 个）：Bell 态 · GHZ 态 · QFT · Grover 搜索 · 量子隐形传态 · Deutsch-Jozsa · VQE Ansatz · 相位反冲', '📐 Algorithm Library (8): Bell · GHZ · QFT · Grover · Teleportation · Deutsch-Jozsa · VQE Ansatz · Phase Kickback'),
        _guideL('每个算法卡片提供：算法简介 · 执行步骤 · 量子优势说明 · 动画演示', 'Each card includes: intro · execution steps · quantum advantage · animated demo'),
        _guideL('🎬 微课中心（10 节）：基础 4 节 · 中级 3 节 · 高级 3 节，可按难度过滤', '🎬 Microcourse (10 lessons): 4 basic · 3 intermediate · 3 advanced, filterable by level'),
        _guideL('进入 VQE / QAOA 时可点击「一键学习」直接跳转到对应视频课', 'When entering VQE/QAOA, click "One-click Learn" to jump straight to the matching lesson')
      ]
    },
    // ── 步骤 9：导出 & 报告 ───────────────────────────────────
    {
      tab: _guideL('导出 & 报告', 'Export'),
      icon: '📄',
      title: _guideL('代码导出与实验报告', 'Code Export & Lab Report'),
      desc: _guideL(
        '搭建完线路并运行后，可通过右侧悬浮工具栏导出 Python 代码或生成 PDF 实验报告，直接对接真实量子平台或提交给教师。',
        'After building and running your circuit, use the floating toolbar on the right to export Python code or generate a PDF lab report — ready for real quantum platforms or instructor submission.'
      ),
      tip: _guideL(
        '💡 先点击「▶ 运行模拟」再生成报告，报告将包含完整的仿真结果、Bloch 球数据和线路验证报告。',
        '💡 Run the simulation before generating the report so it includes full results, Bloch sphere data, and the validation report.'
      ),
      items: [
        _guideL('</> 导出代码：支持 Qiskit（IBM）和 MindQuantum（华为）两种 Python 框架', '</> Export Code: supports Qiskit (IBM) and MindQuantum (Huawei) Python frameworks'),
        _guideL('旋转门角度自动转换为弧度，代码含完整 import，可本地直接运行', 'Rotation angles auto-converted to radians; code includes full imports and runs locally'),
        _guideL('📄 实验报告（PDF）：线路图 · 仿真结果 · Bloch 球 θ/φ 数据 · 验证报告 · Python 代码', '📄 Lab Report (PDF): circuit diagram · simulation results · Bloch θ/φ data · validation · Python code'),
        _guideL('⤴ 分享线路：生成可分享链接或二维码，他人打开即自动加载你的线路', '⤴ Share Circuit: generate a link or QR code; opening it auto-loads your circuit')
      ]
    }
  ];
}

let guideStep = 0;

function buildGuide() {
  const tabs = document.getElementById('guide-tabs');
  const body = document.getElementById('guide-body');
  const dots = document.getElementById('guide-dots');
  if (!tabs || !body || !dots) { console.warn('Guide elements not found'); return; }
  const GUIDE_STEPS = getGuideSteps();
  tabs.innerHTML = ''; body.innerHTML = ''; dots.innerHTML = '';

  GUIDE_STEPS.forEach((s, i) => {
    const t = document.createElement('div');
    t.className = 'guide-step-tab' + (i === guideStep ? ' on' : '');
    t.textContent = s.tab; t.onclick = () => jumpGuide(i);
    tabs.appendChild(t);

    const slide = document.createElement('div');
    slide.className = 'guide-slide' + (i === guideStep ? ' on' : '');
    let itemsHtml = s.items.map(x => `<li>${x}</li>`).join('');
    slide.innerHTML = `
      <div class="guide-icon">${s.icon}</div>
      <div class="guide-title">${s.title}</div>
      <div class="guide-desc">${s.desc}</div>
      <div class="guide-tip">${s.tip}</div>
      <ul class="guide-steps">${itemsHtml}</ul>`;
    body.appendChild(slide);

    const d = document.createElement('div');
    d.className = 'guide-dot' + (i === guideStep ? ' on' : '');
    d.onclick = () => jumpGuide(i); dots.appendChild(d);
  });

  const nb = document.getElementById('guide-next-btn');
  if (nb) nb.textContent = guideStep === GUIDE_STEPS.length - 1 ? (window.t?.('guide.done') || _guideL('完成 ✓', 'Done ✓')) : (window.t?.('guide.next') || _guideL('下一步 →', 'Next →'));
}

function openGuide(step) {
  guideStep = (step != null ? step : 0);
  buildGuide();
  const chk = document.getElementById('guide-no-show-chk');
  if (chk) chk.checked = localStorage.getItem('qedu_guide_skip') === '1';
  document.getElementById('guide-overlay').classList.add('on');
}
function closeGuide() {
  const chk = document.getElementById('guide-no-show-chk');
  if (chk) {
    if (chk.checked) localStorage.setItem('qedu_guide_skip', '1');
    else localStorage.removeItem('qedu_guide_skip');
  }
  document.getElementById('guide-overlay').classList.remove('on');
}
function jumpGuide(i) { const GUIDE_STEPS = getGuideSteps(); guideStep = Math.max(0, Math.min(GUIDE_STEPS.length - 1, i)); buildGuide(); }
function guideGo(d) {
  const GUIDE_STEPS = getGuideSteps();
  if (d > 0 && guideStep === GUIDE_STEPS.length - 1) { closeGuide(); return; }
  jumpGuide(guideStep + d);
}
function refreshGuideI18n() {
  if (document.getElementById('guide-overlay')?.classList.contains('on')) buildGuide();
}
window.refreshGuideI18n = refreshGuideI18n;
window.refreshGuideI18N = refreshGuideI18n;

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeGuide(); });
