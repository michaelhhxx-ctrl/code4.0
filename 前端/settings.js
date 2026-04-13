// ── SETTINGS & THEMES & I18N ──

const THEMES = {
  classic: { name:'经典学院', desc:'明亮 · 蓝白', bar:'#1B3A6B', bg:'#EFF1F5', sb:'#F7F8FB', cn:'#FFFFFF', rp:'#F0EBF8' },
  dark:    { name:'深空暗色', desc:'暗色 · 星空蓝', bar:'#080E1E', bg:'#0F172A', sb:'#172135', cn:'#1E293B', rp:'#172135' },
  aurora:  { name:'量子极光', desc:'暗色 · 极光紫', bar:'#07031A', bg:'#0C0720', sb:'#1C1248', cn:'#150D30', rp:'#1C1248' },
  amber:   { name:'暗金控制台', desc:'暗色 · 琥珀金', bar:'#13151b', bg:'#0f1116', sb:'#13151b', cn:'#181b23', rp:'#1d2028' },
  space:   { name:'深空量子', desc:'暗色 · 量子青蓝', bar:'#06080f', bg:'#0a0e1a', sb:'#0f1422', cn:'#141a2e', rp:'#0f1422' }
};

let _currentTheme = 'classic';
let _currentLang = 'zh';
let _currentFontSize = 'md';
let _currentZoom = 100;
let _animOn = true;
let _pickedTheme = 'classic';

const _fontSizeMap = { sm:'12px', md:'14px', lg:'16px' };

const I18N = {
  zh: {
    'doc.title':'Q-Edu — 量子计算交互教学平台',
    'conn.checking':'检测中...',
    'conn.online':'Qiskit 已连接',
    'conn.offline':'本地模拟模式',
    'status.ready':'就绪',
    'status.lang.zh':'已切换为中文',
    'status.lang.en':'Switched to English',
    'status.backend.online':'后端连接成功 · 精确模拟可用',
    'status.backend.offline':'后端离线 — 本地精确模拟',
    'status.layout.reset':'面板布局已重置',
    'confirm.clearAll':'确定要清除所有本地数据吗？这将删除账号、保存的线路、历史记录和全部设置，无法恢复。',

    'nav.circ':'线路编辑器','nav.vqe':'VQE 实验','nav.qaoa':'QAOA','nav.algo':'线路模板','nav.resources':'📖 学习资料库',
    'hbtn.settings':'⚙ 设置','hbtn.about':'∷ 关于','hbtn.undo':'↩ 撤销','hbtn.guide':'? 新手指南','hbtn.export':'{ } 导出代码',
    'hbtn.login':'登录','hbtn.register':'注册','auth.logout':'退出','user.profile':'👤 用户',
    'ph.gate':'量子门','ph.circ':'量子线路画布','ph.state':'量子态可视化',
    'cat.single':'单量子比特','cat.rot':'旋转门（可调角度）','cat.two':'双量子比特','cat.meas':'测量','cat.mgmt':'线路管理','cat.preset':'预置线路',
    'preset.bell':'Bell 态（最大纠缠）','preset.ghz':'GHZ 态（三体纠缠）','preset.qft':'QFT（量子傅里叶）','preset.grover':'Grover 搜索',
    'tb.save':'保存','tb.load':'载入',
    'tb.save.title':'保存线路（需登录）','tb.load.title':'载入已保存线路（需登录）',
    'btn.run':'▶ 运行模拟','btn.replay':'▷ 逐步播放','btn.replay.stop':'⏹ 停止播放','btn.step':'⊢ 逐步演化','btn.undo':'↩ 撤销','btn.redo':'↪ 重做','btn.clear':'清空','btn.export':'{ } 导出代码','btn.share':'⇗ 分享','btn.report':'📄 生成报告',
    'stat.gates':'{count} 门',
    'sp.bloch':'Bloch 球','sp.dm':'密度矩阵 ρ','sp.ent':'纠缠图',
    'bloch.theta':'θ 极角','bloch.phi':'φ 方位角','bloch.sz.lbl':'大小','bloch.sz.s':'小','bloch.sz.m':'中','bloch.sz.l':'大',
    'bloch.formula.hint':'|α|²+|β|²=1 · 北极=|0⟩ · 南极=|1⟩ · 赤道=等权叠加',
    'prob.label':'测量概率分布','state.vec.title':'态矢量分量','dm.re':'RE(ρ) 实部热图','dm.im':'IM(ρ) 虚部热图',
    'dm.note.html':'纯态密度矩阵 ρ = |ψ⟩⟨ψ|<br>对角元 = 测量概率<br>非零非对角元 → 存在量子相干',
    'dm.qsel.lbl':'关注比特','dm.qsel.hint':'（最多选 4 个）',
    'ent.desc':'单比特冯诺依曼熵（量化与其余比特的纠缠）',

    'ai.title':'量子导师 · DeepSeek',
    'ai.quick.gate':'物理意义','ai.quick.optimize':'优化建议','ai.quick.entanglement':'量子纠缠','ai.quick.bloch':'Bloch 球',
    'ai.status.online':'在线',
    'ai.welcome.html':'你好！我是 Qubit，你的量子计算导师。当前所有比特处于基态 <span class="fm">|0⟩</span>。<br><br>从左侧拖一个 <span class="fm">H</span> 门到线路上开始实验——Bloch 球会实时演示量子态的旋转。',
    'ai.input.placeholder':'问我量子计算的任何问题...',

    'set.theme':'外观主题','set.lang':'语言 · Language','set.lang.label':'界面语言','set.lang.sub':'切换后立即生效',
    'set.display':'文字与显示','set.fontsize':'字体大小','set.fontsize.sub':'影响全局文字尺寸',
    'fs.sm':'小','fs.md':'默认','fs.lg':'大','set.zoom':'页面缩放','set.zoom.sub':'整体界面缩放比例',
    'set.anim':'过渡动画','set.anim.sub':'关闭可提高低端设备性能','set.actions':'操作',
    'set.resetlayout':'重置面板布局','set.resetlayout.sub':'恢复默认侧边栏宽度与底部高度','set.resetlayout.btn':'重置',
    'set.cleardata':'清除所有本地数据','set.cleardata.sub':'删除账号、线路、历史记录和全部设置','set.cleardata.btn':'清除',
    'th.classic.name':'经典学院','th.classic.desc':'明亮 · 蓝白',
    'th.dark.name':'深空暗色','th.dark.desc':'暗色 · 星空蓝',
    'th.aurora.name':'量子极光','th.aurora.desc':'暗色 · 极光紫',
    'th.amber.name':'暗金控制台','th.amber.desc':'暗色 · 琥珀金',
    'th.space.name':'深空量子','th.space.desc':'暗色 · 量子青蓝',
    'set.about.tech':'量子态向量模拟器 · 纯前端 · 无需服务器','set.about.copy':'© 2025 Q-Edu Project · 仅供教学使用',

    'vqe.setup.title':'分子与参数配置','vqe.hamiltonian':'选择哈密顿量','vqe.params':'优化器参数','vqe.optimizer':'优化器','vqe.maxIter':'最大迭代',
    'vqe.ansatzDepth':'Ansatz 深度','vqe.ansatzType':'Ansatz 类型','vqe.energy.current':'当前能量（Hartree）','vqe.exact':'精确值: {value}','vqe.error':'误差: {value}',
    'vqe.btn.start':'▶ 开始 VQE 优化','vqe.btn.running':'⏸ 优化中...','vqe.btn.running.local':'⏸ 优化中（本地）...','vqe.btn.rerun':'▶ 重新优化',
    'vqe.chart.title':'能量景观 & 收敛曲线','vqe.metric.iter':'迭代次数','vqe.metric.status':'状态','vqe.metric.errRate':'误差率','vqe.status.idle':'待开始','vqe.status.running':'优化中','vqe.status.running.local':'优化中（本地）','vqe.status.done':'已收敛',
    'vqe.warning':'⚠ 检测到梯度消失（Barren Plateau）：梯度方差 < 10⁻⁴，优化可能停滞。建议调整 Ansatz 结构或降低电路深度。',
    'vqe.ansatz.grad.title':'Ansatz 线路与梯度','vqe.ansatz.subtitle':'Hardware-Efficient Ansatz（{depth} 层）','vqe.grad.title':'参数梯度 ∂E/∂θᵢ',
    'vqe.export.qiskit':'Qiskit 代码','vqe.export.mindq':'MindQuantum 代码','vqe.theory.title':'理论基础',
    'vqe.theory.html':'E(θ) = ⟨ψ(θ)|Ĥ|ψ(θ)⟩ ≥ E₀。<br>变分原理保证优化下界即为基态能量 E₀。',

    'qaoa.editor.title.html':'图结构编辑器 <span style="font-size:10px;color:var(--t5);font-weight:400">Max-Cut 问题</span>',
    'qaoa.editor.desc':'节点模式：单击空白添加 / 双击节点删除 · 连边模式：点击两节点连边 / 再次点击同对删边 / 点击边删边',
    'qaoa.mode.node':'＋ 节点','qaoa.mode.edge':'─ 连边','qaoa.clear':'清空','qaoa.sample':'示例图',
    'qaoa.edge.label':'添加边','qaoa.edge.add':'+ 连边','qaoa.node.delete':'✕ 删节点','qaoa.edge.empty':'暂无边，请在画布连边或用上方选择器添加',
    'qaoa.maxcut.desc':'Max-Cut 问题：将节点分为两组，使组间边最多','qaoa.graph.info':'节点: 0 | 边: 0 | 最优割: —','qaoa.params.title':'QAOA 参数','qaoa.p':'p 层数','qaoa.gamma':'γ 初始值','qaoa.beta':'β 初始值',
    'qaoa.btn.start':'▶ 开始 QAOA 优化','qaoa.btn.running':'⏸ 优化中...','qaoa.btn.rerun':'▶ 重新优化',
    'qaoa.chart.title':'近似比收敛曲线','qaoa.metric.iter':'迭代次数','qaoa.metric.ratio':'近似比 r','qaoa.metric.cut':'当前割值','qaoa.legend.opt':'最优 r=1.0','qaoa.legend.curve':'QAOA 收敛曲线',
    'qaoa.theory.title':'理论基础','qaoa.theory.html':'⟨C⟩(γ, β) = ⟨+| U(B,β)† U(C,γ)† Ĥ_C U(C,γ) U(B,β) |+⟩<br>通过交替施加 Cost Hamiltonian 与 Mixer Hamiltonian，逐步逼近 Max-Cut 最优解。',
    'qaoa.prob.title':'测量结果分布','qaoa.prob.desc':'绿色柱 = 最优割方案，高度 = 测量概率','qaoa.solution.title':'最优解可视化',
    'qaoa.solution.wait.html':'运行 QAOA 后显示最优割方案。<br>绿色节点 = 集合 S &nbsp; 蓝色节点 = 集合 S̄',
    'qaoa.circuit.title':'对应量子线路（p=1）','qaoa.circuit.wait':'等待图构建...',

    'algo.page.title':'线路模板','algo.page.sub':'预置经典量子线路 · 点击一键加载到编辑器','algo.preview':'▶ 预览','algo.load':'一键加载到编辑器 →','algo.meta.qubits':'⬡ {count} 量子比特','algo.meta.depth':'⏱ 深度 {count}',
    'reslib.title':'学习资料库','reslib.sub':'课件、讲义与扩展阅读 · 内容由云端清单加载','reslib.refresh':'↻ 重新加载','reslib.loading':'正在加载清单…','reslib.loadedRemote':'已加载云端清单','reslib.loadedLocal':'已加载本地/内联清单','reslib.noUrl':'未配置 manifest 地址，以下为占位（可在 index.html 或 localStorage 中配置）','reslib.err':'云端清单加载失败，已回退为本地占位','reslib.empty':'暂无资料条目','reslib.hint':'将 manifest.json 放到对象存储/CDN 后，设置 <code style=font-size:11px>window.QEDU_RESOURCES_MANIFEST_URL</code> 指向该地址；或设置 <code style=font-size:11px>window.QEDU_RESOURCES_MANIFEST</code> 内联清单。','reslib.open':'打开资料 →',
    'share.title':'⇗ 分享线路','share.note':'将下方链接发送给他人，对方打开即可直接加载此量子线路。链接包含完整线路数据，无需后端支持。','share.placeholder':'链接生成中...','share.copy':'复制链接',
    'modal.codegen.title':'代码生成器','modal.copy':'复制代码','modal.copy.ok':'✓ 已复制',
    'sidebar.fastapi':'FastAPI 后端',
    'themepicker.title':'选择你的界面主题','themepicker.sub':'沉浸感从第一眼开始，你可以随时在设置中更改','themepicker.hint':'点击选择，实时预览效果','themepicker.confirm':'确认选择，开始探索 →',
    'intro.title.html':'用交互实验，<em>理解量子计算</em>','intro.sub':'量子力学不再只存在于教科书——在这里，你可以亲手搭建量子线路、观察量子态演化，像真正的量子工程师一样做实验。',
    'intro.what.title':'什么是量子计算','intro.what.body':'经典计算机用比特（0 或 1）处理信息；量子计算机的基本单元是<strong>量子比特（qubit）</strong>——它可以同时处于 0 和 1 的<strong>叠加态</strong>，并通过<strong>量子纠缠</strong>在多个比特之间建立关联。这两种性质让量子计算在密码破解、分子模拟、优化问题等领域展现出经典计算机无法比拟的加速潜力。目前全球顶尖科技公司（IBM、Google、华为）都在加速布局量子硬件与软件生态。',
    'intro.do.title':'本平台能帮你做什么',
    'intro.feat.circuit.name':'量子线路编辑器','intro.feat.circuit.desc':'拖拽门到画布，自由搭建任意量子线路，支持最多 8 个量子比特',
    'intro.feat.bloch.name':'Bloch 球实时可视化','intro.feat.bloch.desc':'每放置一个门，量子态在三维 Bloch 球上即时更新，直观感受叠加与相位',
    'intro.feat.vqe.name':'VQE 变分量子算法','intro.feat.vqe.desc':'真实模拟 H₂、LiH 等分子的基态能量求解，体验量子化学前沿方法',
    'intro.feat.ai.name':'AI 量子导师','intro.feat.ai.desc':'放置门后自动讲解物理含义，也可随时提问量子力学概念',
    'intro.feat.codegen.name':'Python 代码导出','intro.feat.codegen.desc':'一键生成可在本地运行的 Qiskit / MindQuantum 代码，无缝对接真实量子平台',
    'intro.feat.profile.name':'个人线路库','intro.feat.profile.desc':'注册账号，保存实验成果，随时回顾学习历程与实验记录',
    'intro.skip':'下次不再自动显示','intro.enter':'直接进入','intro.start':'开始探索，查看新手指南 →',

    'auth.sub':'量子计算交互教学平台','auth.tab.login':'登录','auth.tab.register':'注册新账号','auth.username':'用户名','auth.password':'密码','auth.email':'邮箱（选填）',
    'auth.ph.login.username':'请输入用户名','auth.ph.login.password':'请输入密码','auth.ph.reg.username':'2–20 个字符，支持中文','auth.ph.reg.password':'至少 4 个字符','auth.ph.reg.email':'可选',
    'auth.submit.login':'登录','auth.submit.register':'注册账号',
    'auth.err.usernameRequired':'请输入用户名','auth.err.userMissing':'用户名不存在','auth.err.passwordWrong':'密码错误','auth.err.usernameShort':'用户名至少 2 个字符','auth.err.usernameLong':'用户名不能超过 20 个字符','auth.err.passwordShort':'密码至少 4 个字符','auth.err.usernameCharset':'用户名只能含字母、数字、下划线或中文','auth.err.email':'邮箱格式不正确','auth.err.userExists':'该用户名已被注册',
    'auth.login.welcome':'欢迎回来，{user}！','auth.register.welcome':'注册成功，欢迎 {user}！','auth.register.msg':'账号 <b>{user}</b> 注册成功！现在可以保存量子线路和查看实验历史了。','auth.logout.msg.user':'{user} 已退出登录','auth.logout.msg':'已退出登录',
    'profile.title':'个人中心','profile.tab.circuits':'📁 已保存线路','profile.tab.history':'📋 实验历史','profile.empty.circuits.html':'<div class="profile-empty-icon">🔮</div>还没有保存的线路<br><small>搭建完线路后点击工具栏“保存”即可</small>','profile.empty.history.html':'<div class="profile-empty-icon">📊</div>暂无实验记录<br><small>运行模拟或保存线路后会自动记录</small>',
    'profile.meta.gates':'{count} 个门','profile.btn.load':'载入','profile.btn.delete':'删除','history.badge.sim':'模拟','history.badge.save':'保存','profile.load.status':'已载入：{name}','profile.load.msg':'已从个人中心载入线路 <b>"{name}"</b>（{gates} 个门，{qubits} 个量子比特）。',
    'save.needLogin':'请先登录，然后才能保存线路到个人账户。','save.empty':'线路为空，无需保存','save.defaultName':'我的线路 {date}','save.untitled':'未命名线路','save.history':'保存线路“{name}”（{gates} 门，{qubits} 比特）','save.status':'已保存：{name}','save.msg':'线路 <b>"{name}"</b> 已保存至个人中心（{gates} 门，{qubits} 比特）。点击右上角头像可查看。',
    'save.title':'保存量子线路','save.note':'为当前线路起一个名字，方便日后查找与载入。','save.name':'线路名称','save.placeholder':'输入线路名称','save.cancel':'取消','save.confirm':'保存',

    'guide.prev':'← 上一步','guide.next':'下一步 →','guide.done':'完成 ✓','guide.noshow':'下次不再显示',
    'aprev.pause':'⏸ 暂停','aprev.resume':'▶ 继续','aprev.replay':'↺ 重播','aprev.speed.slow':'慢速','aprev.speed.norm':'正常','aprev.speed.fast':'快速','aprev.info.desc':'算法简介','aprev.info.steps':'执行步骤','aprev.info.adv':'量子优势','aprev.load':'一键加载到编辑器 →',

    'circuit.target.none':'步骤 {step} 中无可用目标比特，请清理该列','circuit.target.title':'选择目标比特','circuit.target.cancel':'取消','circuit.param.label':'θ（旋转角度）','circuit.placed.default':'放置了 {gate} 门。','circuit.placed.at':'<b>q{q}, 步骤 {s}</b>：{msg}','circuit.status.place':'q{q} ← {gate} 门','circuit.undo':'已撤销','circuit.cleared':'线路已清空',
    'circuit.ai.H':'放置了 <span class="fm">H</span> 门（Hadamard）。Bloch 球从北极旋转至赤道，量子比特进入等权叠加态 <span class="fm">(|0⟩+|1⟩)/√2</span>。测量时以各 50% 概率得到 0 或 1——这正是量子并行计算的起点。',
    'circuit.ai.X':'放置了 <span class="fm">X</span> 门（量子 NOT 门）。Bloch 球绕 x 轴翻转 180°，|0⟩ → |1⟩，相当于经典逻辑非门在量子力学中的推广。',
    'circuit.ai.Y':'放置了 <span class="fm">Y</span> 门。绕 y 轴旋转 180°，引入虚数因子 i，使 |0⟩ → i|1⟩。Y 门在量子纠错中有重要作用。',
    'circuit.ai.Z':'放置了 <span class="fm">Z</span> 门（相位翻转）。北极（|0⟩）不变，南极（|1⟩）获得 −1 相位。这在叠加态中会改变干涉图样，但不改变测量概率。',
    'circuit.ai.S':'放置了 <span class="fm">S</span> 门（π/2 相位门）。对 |1⟩ 分量施加 e^{iπ/2}=i 的相位，是 T 门的平方。常用于量子傅里叶变换。',
    'circuit.ai.T':'放置了 <span class="fm">T</span> 门（π/4 相位门）。通用量子计算的基本门之一，配合 H 与 CNOT 可近似任意幺正操作（Solovay-Kitaev 定理）。',
    'circuit.ai.CNOT':'放置了 <span class="fm">CNOT</span> 门（受控非）。● 为控制比特，⊕ 为目标比特——当控制比特为 |1⟩ 时翻转目标比特。配合 H 门可制备 Bell 态——两粒子进入量子纠缠！',
    'circuit.ai.CZ':'放置了 <span class="fm">CZ</span> 门。当两个比特均为 |1⟩ 时施加 −1 相位，在超导量子计算机上原生实现，是主流双比特门之一。',
    'circuit.ai.SWAP':'放置了 <span class="fm">SWAP</span> 门。交换两个量子比特的状态，等价于 3 个 CNOT 门的组合。在量子通信和算法中用于调整量子比特拓扑。',
    'circuit.ai.Rx':'放置了 <span class="fm">Rx(θ)</span> 参数化旋转门。点击 θ 按钮可调整旋转角度。这类参数化门是 VQE 变分算法的核心构件——量子机器学习的基础。',
    'circuit.ai.Ry':'放置了 <span class="fm">Ry(θ)</span> 门。绕 y 轴旋转不引入复数相位，将实数叠加态旋转为任意角度。在量子化学 Ansatz 构造中广泛使用。',
    'circuit.ai.Rz':'放置了 <span class="fm">Rz(θ)</span> 门。绕 z 轴的纯相位旋转，改变 |0⟩ 与 |1⟩ 分量之间的相对相位，是量子傅里叶变换的核心操作之一。',
    'circuit.ai.M':'放置了 <span class="fm">测量</span>操作。量子态以 |α|² 概率坍缩到 |0⟩，以 |β|² 概率坍缩到 |1⟩。这是量子-经典界面：测量不可逆地将量子信息转化为经典比特。',
    'preset.msg.bell':'已加载 <b>Bell 态</b>：H 门创造叠加，CNOT 产生纠缠。最终态为 <span class="fm">(|00⟩+|11⟩)/√2</span>，两粒子完全纠缠——无论相距多远，测量一个即确定另一个。',
    'preset.msg.ghz':'已加载 <b>GHZ 态</b>（Greenberger-Horne-Zeilinger）：三体最大纠缠态 <span class="fm">(|000⟩+|111⟩)/√2</span>，展示多体量子纠缠的非局域性。',
    'preset.msg.qft':'已加载 <b>量子傅里叶变换（QFT）</b>：Shor 因式分解与量子相位估计的核心子程序，相比经典 FFT 在 n 比特上有指数级加速。',
    'preset.msg.grover':'已加载 <b>Grover 搜索算法</b>：Oracle + 扩散算子核心结构。在 N 个元素中搜索目标，需 O(√N) 次查询，相比经典 O(N) 有二次加速。',

    'share.empty':'线路为空，无法分享','share.copied':'链接已复制！','share.generated':'分享链接已复制！','share.fail':'链接生成失败（线路过大）','share.invalidFormat':'分享链接格式无效','share.invalidData':'分享链接数据无效','share.invalidQubits':'分享链接超过 8 qubits 上限，无法载入','share.loaded':'已从分享链接加载线路','share.loaded.msg':'检测到分享链接，已自动加载量子线路。','share.loadFail':'分享链接加载失败',
    'replay.empty':'线路为空，无法播放','replay.done':'回放完成','replay.step':'回放 {idx}/{total}: {gates} 门',
    'sim.dm.limit':'仅支持 ≤ 4 量子比特','sim.ent.empty':'请先在线路中放置量子门','sim.ent.strong':'强纠缠','sim.ent.medium':'中度','sim.ent.weak':'弱纠缠','sim.ent.none':'无纠缠','sim.running':'模拟运行中...','sim.done.qiskit':'模拟完成 · Qiskit','sim.done.local':'模拟完成（本地精确）',
    'sim.msg.qiskit':'[Qiskit AerSimulator] 模拟完成，线路深度 {depth}，共 {gates} 个门操作。Bloch 坐标与概率分布来自后端精确计算。','sim.msg.local':'[本地精确模拟] 完成，{gates} 个门操作。后端未连接，使用前端态向量模拟器。','sim.history':'运行量子模拟（{gates} 门，{qubits} 比特）',

    'qaoa.info':'节点: {nodes} | 边: {edges} | 最优割: {cut}','qaoa.nodeOption':'节点 {idx}','qaoa.edge.deleteTitle':'删除此边','qaoa.circuit.extra':'... ({n} qubits 共 {edges} 个 ZZ 旋转门)','qaoa.canvas.node':'节点模式：点击空白处添加节点','qaoa.canvas.edge':'连边模式：点击两节点连边 / 点击边删除','qaoa.canvas.delete':'点击删除','qaoa.canvas.target':'→ 点击目标节点','qaoa.canvas.best':'最优割: {best}/{edges} 边 · 近似比: {ratio}','qaoa.err.nodes':'至少需要 2 个节点','qaoa.err.edges':'请先添加边','qaoa.err.max':'节点数 ≤ 8','qaoa.result':'最优割 = <b>{best}/{max}</b> 边 · 近似比 r = <b>{ratio}</b><br>方案: {bits} (绿=集合S, 蓝=集合S̄)<br><span style="color:var(--t3)">// 经典最优割: {max} 边</span>','qaoa.done':'QAOA 完成 · 近似比: {ratio} · 最优割: {cut}','qaoa.chart.opt':'最优 r=1','qaoa.chart.iter':'迭代步数','qaoa.prob.best':'■ 最优割','qaoa.prob.other':'■ 其他',

    'code.qiskit.header':'# Q-Edu 自动生成 · Qiskit · {date}','code.qiskit.init':'# 初始化 {qubits} 量子比特线路','code.empty':'# 线路为空，请先添加量子门操作','code.run':'# 运行模拟','code.measure':'测量结果:','code.mind.header':'# Q-Edu 自动生成 · MindQuantum · {date}','code.stateVec':'量子态向量:',
  },
  en: {
    'doc.title':'Q-Edu — Interactive Quantum Computing Learning Platform',
    'conn.checking':'Checking...',
    'conn.online':'Qiskit Connected',
    'conn.offline':'Local Simulator',
    'status.ready':'Ready',
    'status.lang.zh':'Switched to Chinese',
    'status.lang.en':'Switched to English',
    'status.backend.online':'Backend connected · exact simulation available',
    'status.backend.offline':'Backend offline — local simulation mode',
    'status.layout.reset':'Panel layout reset',
    'confirm.clearAll':'Delete ALL local data? This removes accounts, circuits, history and settings. Cannot be undone.',

    'nav.circ':'Circuit Editor','nav.vqe':'VQE Lab','nav.qaoa':'QAOA','nav.algo':'Circuit Templates','nav.resources':'📖 Resource Library',
    'hbtn.settings':'⚙ Settings','hbtn.about':'∷ About','hbtn.undo':'↩ Undo','hbtn.guide':'? Guide','hbtn.export':'{ } Export Code',
    'hbtn.login':'Login','hbtn.register':'Register','auth.logout':'Logout','user.profile':'👤 User',
    'ph.gate':'Quantum Gates','ph.circ':'Circuit Canvas','ph.state':'State Visualization',
    'cat.single':'Single-Qubit','cat.rot':'Rotation Gates (Adjustable)','cat.two':'Two-Qubit','cat.meas':'Measurement','cat.mgmt':'Circuit Management','cat.preset':'Presets',
    'preset.bell':'Bell State (Max Entanglement)','preset.ghz':'GHZ State (3-Qubit Entanglement)','preset.qft':'QFT (Quantum Fourier)','preset.grover':'Grover Search',
    'tb.save':'Save','tb.load':'Load',
    'tb.save.title':'Save circuit (login required)','tb.load.title':'Load saved circuit (login required)',
    'btn.run':'▶ Run Simulation','btn.replay':'▷ Step Replay','btn.replay.stop':'⏹ Stop Replay','btn.step':'⊢ Step Evolution','btn.undo':'↩ Undo','btn.redo':'↪ Redo','btn.clear':'Clear','btn.export':'{ } Export Code','btn.share':'⇗ Share','btn.report':'📄 Generate Report',
    'stat.gates':'{count} gates',
    'sp.bloch':'Bloch Sphere','sp.dm':'Density Matrix ρ','sp.ent':'Entanglement',
    'bloch.theta':'θ Polar','bloch.phi':'φ Azimuthal','bloch.sz.lbl':'Size','bloch.sz.s':'S','bloch.sz.m':'M','bloch.sz.l':'L',
    'bloch.formula.hint':'|α|²+|β|²=1 · North=|0⟩ · South=|1⟩ · Equator=equal superposition',
    'prob.label':'Measurement Probabilities','state.vec.title':'State Vector Components','dm.re':'RE(ρ) Real Heatmap','dm.im':'IM(ρ) Imaginary Heatmap',
    'dm.note.html':'Pure-state density matrix ρ = |ψ⟩⟨ψ|<br>Diagonal terms = measurement probabilities<br>Non-zero off-diagonal terms → quantum coherence',
    'dm.qsel.lbl':'Focus Qubits','dm.qsel.hint':'(select up to 4)',
    'ent.desc':'Single-qubit von Neumann entropy (entanglement with the rest of the system)',

    'ai.title':'Quantum Tutor · DeepSeek',
    'ai.quick.gate':'Physical Meaning','ai.quick.optimize':'Optimization Tips','ai.quick.entanglement':'Entanglement','ai.quick.bloch':'Bloch Sphere',
    'ai.status.online':'Online',
    'ai.welcome.html':'Hello! I am Qubit, your quantum computing tutor. All qubits are currently in the ground state <span class="fm">|0⟩</span>.<br><br>Drag an <span class="fm">H</span> gate from the left to start your experiment — the Bloch sphere will show the state rotation in real time.',
    'ai.input.placeholder':'Ask me anything about quantum computing...',

    'set.theme':'Appearance','set.lang':'Language · Language','set.lang.label':'Interface Language','set.lang.sub':'Takes effect immediately',
    'set.display':'Text & Display','set.fontsize':'Font Size','set.fontsize.sub':'Affects global text size',
    'fs.sm':'Small','fs.md':'Default','fs.lg':'Large','set.zoom':'Page Zoom','set.zoom.sub':'Scale the whole interface',
    'set.anim':'Animations','set.anim.sub':'Disable for better performance on slower devices','set.actions':'Actions',
    'set.resetlayout':'Reset Panel Layout','set.resetlayout.sub':'Restore default sidebar width and bottom height','set.resetlayout.btn':'Reset',
    'set.cleardata':'Clear All Local Data','set.cleardata.sub':'Delete accounts, circuits, history, and all settings','set.cleardata.btn':'Clear',
    'th.classic.name':'Classic Academy','th.classic.desc':'Light · Blue & White',
    'th.dark.name':'Deep Space','th.dark.desc':'Dark · Midnight Blue',
    'th.aurora.name':'Quantum Aurora','th.aurora.desc':'Dark · Aurora Purple',
    'th.amber.name':'Amber Console','th.amber.desc':'Dark · Amber Gold',
    'th.space.name':'Deep Space Quantum','th.space.desc':'Dark · Quantum Cyan',
    'set.about.tech':'State-vector simulator · pure frontend · no server required','set.about.copy':'© 2025 Q-Edu Project · For educational use only',

    'vqe.setup.title':'Molecule & Parameter Setup','vqe.hamiltonian':'Choose Hamiltonian','vqe.params':'Optimizer Settings','vqe.optimizer':'Optimizer','vqe.maxIter':'Max Iterations',
    'vqe.ansatzDepth':'Ansatz Depth','vqe.ansatzType':'Ansatz Type','vqe.energy.current':'Current Energy (Hartree)','vqe.exact':'Exact: {value}','vqe.error':'Error: {value}',
    'vqe.btn.start':'▶ Start VQE Optimization','vqe.btn.running':'⏸ Optimizing...','vqe.btn.running.local':'⏸ Optimizing (Local)...','vqe.btn.rerun':'▶ Optimize Again',
    'vqe.chart.title':'Energy Landscape & Convergence','vqe.metric.iter':'Iterations','vqe.metric.status':'Status','vqe.metric.errRate':'Error Rate','vqe.status.idle':'Idle','vqe.status.running':'Optimizing','vqe.status.running.local':'Optimizing (Local)','vqe.status.done':'Converged',
    'vqe.warning':'⚠ Barren Plateau detected: gradient variance < 10⁻⁴. Optimization may stall. Try changing the ansatz structure or reducing circuit depth.',
    'vqe.ansatz.grad.title':'Ansatz Circuit & Gradients','vqe.ansatz.subtitle':'Hardware-Efficient Ansatz ({depth} layers)','vqe.grad.title':'Parameter Gradients ∂E/∂θᵢ',
    'vqe.export.qiskit':'Qiskit Code','vqe.export.mindq':'MindQuantum Code','vqe.theory.title':'Theory',
    'vqe.theory.html':'E(θ) = ⟨ψ(θ)|Ĥ|ψ(θ)⟩ ≥ E₀.<br>The variational principle guarantees the lower bound is the ground-state energy E₀.',

    'qaoa.editor.title.html':'Graph Editor <span style="font-size:10px;color:var(--t5);font-weight:400">Max-Cut Problem</span>',
    'qaoa.editor.desc':'Node mode: click blank space to add / double-click node to delete · Edge mode: click two nodes to connect / click same pair again to remove / click edge to delete',
    'qaoa.mode.node':'＋ Node','qaoa.mode.edge':'─ Edge','qaoa.clear':'Clear','qaoa.sample':'Example Graph',
    'qaoa.edge.label':'Add Edge','qaoa.edge.add':'+ Edge','qaoa.node.delete':'✕ Delete Node','qaoa.edge.empty':'No edges yet. Add them on the canvas or with the selector above.',
    'qaoa.maxcut.desc':'Max-Cut: split the nodes into two sets to maximize the number of crossing edges','qaoa.graph.info':'Nodes: 0 | Edges: 0 | Optimal Cut: —','qaoa.params.title':'QAOA Parameters','qaoa.p':'Layers p','qaoa.gamma':'Initial γ','qaoa.beta':'Initial β',
    'qaoa.btn.start':'▶ Start QAOA Optimization','qaoa.btn.running':'⏸ Optimizing...','qaoa.btn.rerun':'▶ Optimize Again',
    'qaoa.chart.title':'Approximation Ratio Convergence','qaoa.metric.iter':'Iterations','qaoa.metric.ratio':'Approx. Ratio r','qaoa.metric.cut':'Current Cut','qaoa.legend.opt':'Optimal r=1.0','qaoa.legend.curve':'QAOA Curve',
    'qaoa.theory.title':'Theory','qaoa.theory.html':'⟨C⟩(γ, β) = ⟨+| U(B,β)† U(C,γ)† Ĥ_C U(C,γ) U(B,β) |+⟩<br>By alternating the Cost Hamiltonian and Mixer Hamiltonian, QAOA gradually approaches the Max-Cut optimum.',
    'qaoa.prob.title':'Measurement Distribution','qaoa.prob.desc':'Green bars = optimal cut solutions, height = measurement probability','qaoa.solution.title':'Best-Solution Visualization',
    'qaoa.solution.wait.html':'Run QAOA to display the best cut solution.<br>Green nodes = set S &nbsp; Blue nodes = set S̄',
    'qaoa.circuit.title':'Corresponding Quantum Circuit (p=1)','qaoa.circuit.wait':'Waiting for graph...',

    'algo.page.title':'Circuit Templates','algo.page.sub':'Classic preset quantum circuits · click to load into the editor','algo.preview':'▶ Preview','algo.load':'Load into Editor →','algo.meta.qubits':'⬡ {count} qubits','algo.meta.depth':'⏱ Depth {count}',
    'reslib.title':'Resource Library','reslib.sub':'Handouts & readings · list loaded from a cloud manifest','reslib.refresh':'↻ Reload','reslib.loading':'Loading manifest…','reslib.loadedRemote':'Loaded remote manifest','reslib.loadedLocal':'Loaded inline/local manifest','reslib.noUrl':'No manifest URL configured — showing placeholders (set window.QEDU_RESOURCES_MANIFEST_URL in index.html or localStorage)','reslib.err':'Failed to load remote manifest — using local fallback','reslib.empty':'No items in the library yet','reslib.hint':'Host manifest.json on your CDN/storage and set window.QEDU_RESOURCES_MANIFEST_URL, or assign window.QEDU_RESOURCES_MANIFEST inline.','reslib.open':'Open →',
    'share.title':'⇗ Share Circuit','share.note':'Send the link below to others. Opening it will load this quantum circuit directly. The link contains the full circuit data and does not require a backend.','share.placeholder':'Generating link...','share.copy':'Copy Link',
    'modal.codegen.title':'Code Generator','modal.copy':'Copy Code','modal.copy.ok':'✓ Copied',
    'sidebar.fastapi':'FastAPI Backend',
    'themepicker.title':'Choose Your Interface Theme','themepicker.sub':'Immersion starts at first sight. You can change it anytime in Settings.','themepicker.hint':'Click to choose and preview in real time','themepicker.confirm':'Confirm and Start Exploring →',
    'intro.title.html':'Understand quantum computing <em>through interactive experiments</em>','intro.sub':'Quantum mechanics no longer lives only in textbooks — here, you can build quantum circuits by hand, watch state evolution, and experiment like a real quantum engineer.',
    'intro.what.title':'What is quantum computing?','intro.what.body':'Classical computers process information with bits (0 or 1). The basic unit of a quantum computer is the <strong>qubit</strong>, which can exist in a <strong>superposition</strong> of 0 and 1 and form correlations across qubits through <strong>quantum entanglement</strong>. These properties give quantum computing extraordinary potential in cryptography, molecular simulation, and optimization. Leading companies worldwide, including IBM, Google, and Huawei, are accelerating both quantum hardware and software development.',
    'intro.do.title':'What this platform helps you do',
    'intro.feat.circuit.name':'Quantum Circuit Editor','intro.feat.circuit.desc':'Drag gates onto the canvas and freely build circuits with up to 8 qubits',
    'intro.feat.bloch.name':'Real-Time Bloch Sphere Visualization','intro.feat.bloch.desc':'Each gate updates the quantum state instantly on a 3D Bloch sphere so you can see superposition and phase intuitively',
    'intro.feat.vqe.name':'VQE Variational Algorithm','intro.feat.vqe.desc':'Simulate ground-state energy solving for H₂, LiH, and more to experience cutting-edge quantum chemistry methods',
    'intro.feat.ai.name':'AI Quantum Tutor','intro.feat.ai.desc':'Get automatic explanations after placing gates, or ask questions about quantum mechanics anytime',
    'intro.feat.codegen.name':'Python Code Export','intro.feat.codegen.desc':'Generate runnable Qiskit / MindQuantum code with one click and connect seamlessly to real quantum platforms',
    'intro.feat.profile.name':'Personal Circuit Library','intro.feat.profile.desc':'Create an account, save your experiments, and revisit your learning progress anytime',
    'intro.skip':'Do not auto-show next time','intro.enter':'Enter Directly','intro.start':'Start Exploring & Open Guide →',

    'auth.sub':'Interactive Quantum Computing Learning Platform','auth.tab.login':'Login','auth.tab.register':'Create Account','auth.username':'Username','auth.password':'Password','auth.email':'Email (optional)',
    'auth.ph.login.username':'Enter your username','auth.ph.login.password':'Enter your password','auth.ph.reg.username':'2–20 characters, Chinese supported','auth.ph.reg.password':'At least 4 characters','auth.ph.reg.email':'Optional',
    'auth.submit.login':'Login','auth.submit.register':'Create Account',
    'auth.err.usernameRequired':'Please enter a username','auth.err.userMissing':'Username not found','auth.err.passwordWrong':'Incorrect password','auth.err.usernameShort':'Username must be at least 2 characters','auth.err.usernameLong':'Username must be no more than 20 characters','auth.err.passwordShort':'Password must be at least 4 characters','auth.err.usernameCharset':'Username can contain letters, numbers, underscores, or Chinese characters only','auth.err.email':'Invalid email format','auth.err.userExists':'This username is already registered',
    'auth.login.welcome':'Welcome back, {user}!','auth.register.welcome':'Registration successful. Welcome, {user}!','auth.register.msg':'Account <b>{user}</b> has been created! You can now save circuits and view experiment history.','auth.logout.msg.user':'{user} logged out','auth.logout.msg':'Logged out',
    'profile.title':'Profile','profile.tab.circuits':'📁 Saved Circuits','profile.tab.history':'📋 Experiment History','profile.empty.circuits.html':'<div class="profile-empty-icon">🔮</div>No saved circuits yet<br><small>Build a circuit and click “Save” in the toolbar</small>','profile.empty.history.html':'<div class="profile-empty-icon">📊</div>No experiment history yet<br><small>Runs and saves will be recorded automatically</small>',
    'profile.meta.gates':'{count} gates','profile.btn.load':'Load','profile.btn.delete':'Delete','history.badge.sim':'Simulation','history.badge.save':'Saved','profile.load.status':'Loaded: {name}','profile.load.msg':'Loaded circuit <b>"{name}"</b> from your profile ({gates} gates, {qubits} qubits).',
    'save.needLogin':'Please log in before saving circuits to your account.','save.empty':'Circuit is empty. Nothing to save.','save.defaultName':'My Circuit {date}','save.untitled':'Untitled Circuit','save.history':'Saved circuit “{name}” ({gates} gates, {qubits} qubits)','save.status':'Saved: {name}','save.msg':'Circuit <b>"{name}"</b> has been saved to your profile ({gates} gates, {qubits} qubits). Click the avatar in the top-right corner to view it.',
    'save.title':'Save Quantum Circuit','save.note':'Give this circuit a name so it is easy to find and load later.','save.name':'Circuit Name','save.placeholder':'Enter a circuit name','save.cancel':'Cancel','save.confirm':'Save',

    'guide.prev':'← Previous','guide.next':'Next →','guide.done':'Done ✓','guide.noshow':"Don't show again",
    'aprev.pause':'⏸ Pause','aprev.resume':'▶ Resume','aprev.replay':'↺ Replay','aprev.speed.slow':'Slow','aprev.speed.norm':'Normal','aprev.speed.fast':'Fast','aprev.info.desc':'Overview','aprev.info.steps':'Execution Steps','aprev.info.adv':'Quantum Advantage','aprev.load':'Load into Editor →',

    'circuit.target.none':'No available target qubit in step {step}. Please clear this column first.','circuit.target.title':'Choose Target Qubit','circuit.target.cancel':'Cancel','circuit.param.label':'θ (rotation angle)','circuit.placed.default':'Placed gate {gate}.','circuit.placed.at':'<b>q{q}, step {s}</b>: {msg}','circuit.status.place':'q{q} ← gate {gate}','circuit.undo':'Undo complete','circuit.cleared':'Circuit cleared',
    'circuit.ai.H':'You placed an <span class="fm">H</span> (Hadamard) gate. On the Bloch sphere, the state rotates from the north pole to the equator, putting the qubit into the equal superposition <span class="fm">(|0⟩+|1⟩)/√2</span>. Measurement then gives 0 or 1 with 50% probability — the starting point of quantum parallelism.',
    'circuit.ai.X':'You placed an <span class="fm">X</span> gate (quantum NOT). The Bloch vector flips 180° around the x-axis, mapping |0⟩ → |1⟩, the quantum analogue of a classical NOT gate.',
    'circuit.ai.Y':'You placed a <span class="fm">Y</span> gate. It rotates 180° around the y-axis and introduces the imaginary factor i, mapping |0⟩ → i|1⟩. The Y gate is important in quantum error correction.',
    'circuit.ai.Z':'You placed a <span class="fm">Z</span> gate (phase flip). The north pole (|0⟩) stays unchanged while the south pole (|1⟩) gains a −1 phase. In superposition states this changes interference, but not measurement probabilities.',
    'circuit.ai.S':'You placed an <span class="fm">S</span> gate (π/2 phase gate). It applies the phase e^{iπ/2}=i to the |1⟩ component and is the square of the T gate. It is commonly used in the quantum Fourier transform.',
    'circuit.ai.T':'You placed a <span class="fm">T</span> gate (π/4 phase gate). It is one of the fundamental gates of universal quantum computing; together with H and CNOT it can approximate arbitrary unitary operations.',
    'circuit.ai.CNOT':'You placed a <span class="fm">CNOT</span> gate. ● is the control qubit and ⊕ is the target qubit — when the control is |1⟩, the target flips. Combined with H, this prepares a Bell state and creates entanglement.',
    'circuit.ai.CZ':'You placed a <span class="fm">CZ</span> gate. When both qubits are |1⟩, it applies a −1 phase. It is a native two-qubit gate on many superconducting quantum devices.',
    'circuit.ai.SWAP':'You placed a <span class="fm">SWAP</span> gate. It exchanges the states of two qubits and is equivalent to three CNOT gates. It is widely used to adapt circuits to hardware topology.',
    'circuit.ai.Rx':'You placed a parameterized <span class="fm">Rx(θ)</span> rotation. Click θ to change the angle. Gates like this are the core building blocks of VQE and quantum machine learning.',
    'circuit.ai.Ry':'You placed an <span class="fm">Ry(θ)</span> gate. It rotates around the y-axis without introducing a complex phase, making it useful for constructing real-valued superposition states in quantum chemistry ansätze.',
    'circuit.ai.Rz':'You placed an <span class="fm">Rz(θ)</span> gate. It performs a pure phase rotation around the z-axis, changing the relative phase between |0⟩ and |1⟩. It is central to the quantum Fourier transform.',
    'circuit.ai.M':'You placed a <span class="fm">measurement</span>. The quantum state collapses to |0⟩ with probability |α|² and to |1⟩ with probability |β|². Measurement is the irreversible bridge between quantum information and classical bits.',
    'preset.msg.bell':'Loaded <b>Bell State</b>: H creates superposition and CNOT creates entanglement. The final state is <span class="fm">(|00⟩+|11⟩)/√2</span>, so measuring one particle determines the other instantly.',
    'preset.msg.ghz':'Loaded <b>GHZ State</b> (Greenberger-Horne-Zeilinger): the maximally entangled three-qubit state <span class="fm">(|000⟩+|111⟩)/√2</span>, showcasing multipartite nonlocality.',
    'preset.msg.qft':'Loaded <b>Quantum Fourier Transform (QFT)</b>: a core subroutine of Shor factoring and quantum phase estimation, offering exponential acceleration over classical FFT on n qubits.',
    'preset.msg.grover':'Loaded <b>Grover Search</b>: the core Oracle + diffusion structure. It finds a marked item in O(√N) queries instead of the classical O(N).',

    'share.empty':'Circuit is empty. Nothing to share.','share.copied':'Link copied!','share.generated':'Share link copied!','share.fail':'Failed to generate the link (circuit too large)','share.invalidFormat':'Invalid share-link format','share.invalidData':'Invalid share-link data','share.invalidQubits':'Share link exceeds the 8-qubit limit and cannot be loaded','share.loaded':'Circuit loaded from share link','share.loaded.msg':'A share link was detected and the quantum circuit was loaded automatically.','share.loadFail':'Failed to load the share link',
    'replay.empty':'Circuit is empty. Cannot replay.','replay.done':'Replay complete','replay.step':'Replay {idx}/{total}: {gates} gate(s)',
    'sim.dm.limit':'Only ≤ 4 qubits supported','sim.ent.empty':'Place quantum gates on the circuit first','sim.ent.strong':'strong','sim.ent.medium':'medium','sim.ent.weak':'weak','sim.ent.none':'none','sim.running':'Running simulation...','sim.done.qiskit':'Simulation complete · Qiskit','sim.done.local':'Simulation complete (local exact)',
    'sim.msg.qiskit':'[Qiskit AerSimulator] Simulation finished. Circuit depth {depth}, {gates} gate operations in total. Bloch coordinates and probabilities were computed exactly by the backend.','sim.msg.local':'[Local exact simulation] Finished with {gates} gate operations. Backend unavailable; using the frontend state-vector simulator.','sim.history':'Ran a quantum simulation ({gates} gates, {qubits} qubits)',

    'qaoa.info':'Nodes: {nodes} | Edges: {edges} | Optimal Cut: {cut}','qaoa.nodeOption':'Node {idx}','qaoa.edge.deleteTitle':'Delete this edge','qaoa.circuit.extra':'... ({n} qubits, {edges} ZZ rotation gates)','qaoa.canvas.node':'Node mode: click blank space to add nodes','qaoa.canvas.edge':'Edge mode: click two nodes to connect / click edge to delete','qaoa.canvas.delete':'Click to delete','qaoa.canvas.target':'→ Click the target node','qaoa.canvas.best':'Best cut: {best}/{edges} edges · approx. ratio: {ratio}','qaoa.err.nodes':'At least 2 nodes are required','qaoa.err.edges':'Please add edges first','qaoa.err.max':'Node count must be ≤ 8','qaoa.result':'Best cut = <b>{best}/{max}</b> edges · approximation ratio r = <b>{ratio}</b><br>Bitstring: {bits} (green=set S, blue=set S̄)<br><span style="color:var(--t3)">// Classical optimum: {max} edges</span>','qaoa.done':'QAOA complete · ratio: {ratio} · optimal cut: {cut}','qaoa.chart.opt':'Optimal r=1','qaoa.chart.iter':'Iterations','qaoa.prob.best':'■ Optimal cut','qaoa.prob.other':'■ Others',

    'code.qiskit.header':'# Auto-generated by Q-Edu · Qiskit · {date}','code.qiskit.init':'# Initialize a {qubits}-qubit circuit','code.empty':'# Circuit is empty. Add gate operations first','code.run':'# Run simulation','code.measure':'Measurement results:','code.mind.header':'# Auto-generated by Q-Edu · MindQuantum · {date}','code.stateVec':'Quantum state vector:',
  }
};

function _fmt(str, vars = {}) {
  return String(str).replace(/\{(\w+)\}/g, (_, key) => vars[key] != null ? String(vars[key]) : '');
}

function tr(key, vars = {}, fallback = '') {
  const dict = I18N[_currentLang] || I18N.zh;
  const base = (dict && dict[key] != null) ? dict[key] : (I18N.zh[key] != null ? I18N.zh[key] : (fallback || key));
  return _fmt(base, vars);
}

function isEnglish() { return _currentLang === 'en'; }

window.tr = tr;
window.t = tr;
window.isEnglish = isEnglish;
window.getCurrentLang = () => _currentLang;
window._currentLang = _currentLang;

function _setText(sel, val) {
  const nodes = document.querySelectorAll(sel);
  nodes.forEach(el => { el.textContent = typeof val === 'function' ? val(el) : val; });
}
function _setHTML(sel, val) {
  const nodes = document.querySelectorAll(sel);
  nodes.forEach(el => { el.innerHTML = typeof val === 'function' ? val(el) : val; });
}
function _setPlaceholder(sel, val) {
  const nodes = document.querySelectorAll(sel);
  nodes.forEach(el => el.setAttribute('placeholder', typeof val === 'function' ? val(el) : val));
}
function _safeCall(fn) { try { fn && fn(); } catch (err) { console.warn('[i18n refresh]', err); } }

let _themeRefreshTimer = null;
function applyTheme(id) {
  _currentTheme = id;
  if(id === 'classic') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', id);
  localStorage.setItem('qedu_theme', id);
  document.querySelectorAll('[data-th]').forEach(el => el.classList.toggle('on', el.dataset.th === id));
  // Debounce Three.js scene rebuilds so hover-preview doesn't thrash
  clearTimeout(_themeRefreshTimer);
  _themeRefreshTimer = setTimeout(() => {
    window.refreshBlochTheme?.();
    window.refreshVQELandscapeTheme?.();
    // Redraw 2D convergence chart with new theme colors (vqeData is a let in vqe.js)
    if (typeof drawVQEChart === 'function' && typeof vqeData !== 'undefined' && vqeData.length > 1) drawVQEChart();
  }, 120);
}

function loadTheme() {
  const saved = localStorage.getItem('qedu_theme') || 'classic';
  applyTheme(saved);
}

function applyFontSize(sz) {
  _currentFontSize = sz;
  document.documentElement.style.setProperty('--fs-base', _fontSizeMap[sz]);
  localStorage.setItem('qedu_fontsize', sz);
  ['sm','md','lg'].forEach(s => document.getElementById('fs-'+s)?.classList.toggle('on', s===sz));
}

function syncPageScale() {
  const scale = _currentZoom / 100;
  const body = document.body;
  if(!body) return;

  document.documentElement.style.setProperty('--ui-scale', String(scale));
  body.classList.toggle('page-scaled', _currentZoom !== 100);
  body.style.transformOrigin = 'top left';
  body.style.transform = `scale(${scale})`;
  body.style.width = `${100 / scale}%`;
  body.style.height = `${100 / scale}%`;

  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'));
    try { window.posHandles?.(); } catch {}
    try { window.posHandlesVV?.(); } catch {}
    try { window.posHandlesQV?.(); } catch {}
  });
}

function applyZoom(pct) {
  _currentZoom = Math.max(70, Math.min(130, pct));
  syncPageScale();
  localStorage.setItem('qedu_zoom', _currentZoom);
  const sl = document.getElementById('zoom-slider');
  const vl = document.getElementById('zoom-val');
  if(sl) sl.value = _currentZoom;
  if(vl) vl.textContent = _currentZoom + '%';
}
function stepZoom(delta) { applyZoom(_currentZoom + delta); }

function toggleAnimations(el) {
  _animOn = !_animOn;
  el.classList.toggle('on', _animOn);
  document.documentElement.classList.toggle('no-anim', !_animOn);
  localStorage.setItem('qedu_anim', _animOn ? '1' : '0');
}

function resetLayout() {
  const R = document.documentElement;
  R.style.setProperty('--c1',   '184px');
  R.style.setProperty('--c3',   '272px');
  R.style.setProperty('--r2',   '196px');
  R.style.setProperty('--vv-c1','300px');
  R.style.setProperty('--vv-c3','300px');
  R.style.setProperty('--qv-c1','290px');
  R.style.setProperty('--qv-c3','420px');
  localStorage.removeItem('qedu_layout');
  window.applyPanelZoom?.();
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  setSBMsg(tr('status.layout.reset'));
}

function clearAllData() {
  if(!confirm(tr('confirm.clearAll'))) return;
  localStorage.clear();
  location.reload();
}

function refreshStaticI18N() {
  document.documentElement.lang = _currentLang;
  document.title = tr('doc.title');

  // Generic existing bindings
  const dict = I18N[_currentLang] || I18N.zh;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.dataset.i18n;
    if(dict[k] !== undefined) el.textContent = dict[k];
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const k = el.dataset.i18nHtml;
    if(dict[k] !== undefined) el.innerHTML = dict[k];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const k = el.dataset.i18nPlaceholder;
    if(dict[k] !== undefined) el.setAttribute('placeholder', dict[k]);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const k = el.dataset.i18nTitle;
    if(dict[k] !== undefined) el.setAttribute('title', dict[k]);
  });

  // Header & main panels
  const connLbl = document.getElementById('conn-lbl');
  if (connLbl) {
    const state = window._backendConnState;
    connLbl.textContent = state === 'online' ? tr('conn.online') : state === 'offline' ? tr('conn.offline') : tr('conn.checking');
  }
  _setText('#user-ctrl-auth .hbtn:last-child', tr('auth.logout'));
  _setText('.pbtn:nth-of-type(1)', tr('preset.bell'));
  _setText('.pbtn:nth-of-type(2)', tr('preset.ghz'));
  _setText('.pbtn:nth-of-type(3)', tr('preset.qft'));
  _setText('.pbtn:nth-of-type(4)', tr('preset.grover'));
  _setText('.bstats-2 .bsc:nth-child(1) .bslbl', tr('bloch.theta'));
  _setText('.bstats-2 .bsc:nth-child(2) .bslbl', tr('bloch.phi'));
  _setText('.bloch-sz-lbl', tr('bloch.sz.lbl'));
  _setText('.bloch-sz-btn[data-h="170"]', tr('bloch.sz.s'));
  _setText('.bloch-sz-btn[data-h="230"]', tr('bloch.sz.m'));
  _setText('.bloch-sz-btn[data-h="310"]', tr('bloch.sz.l'));
  _setText('.bf-hint', tr('bloch.formula.hint'));
  _setText('#prob-sec .prob-lbl', tr('prob.label'));
  _setText('.sv-ttl', tr('state.vec.title'));
  _setText('#dm-re-label', tr('dm.re'));
  _setText('#dm-im-label', tr('dm.im'));
  _setHTML('#dm-note', tr('dm.note.html'));
  _setText('.dm-qsel-lbl', tr('dm.qsel.lbl'));
  _setText('.dm-qsel-hint', tr('dm.qsel.hint'));
  _setText('#sp-ent > div:first-child', tr('ent.desc'));
  if (typeof refreshMascotStatus === 'function') refreshMascotStatus(); else _setText('#mascot-status', tr('ai.status.online'));
  _setPlaceholder('#aiinp', tr('ai.input.placeholder'));

  const aiHeader = document.querySelector('#at .ph');
  if (aiHeader && aiHeader.childNodes.length) aiHeader.childNodes[0].nodeValue = `${tr('ai.title')}\n      `;
  _setText('#at .chips .chip:nth-child(1)', tr('ai.quick.gate'));
  _setText('#at .chips .chip:nth-child(2)', tr('ai.quick.optimize'));
  _setText('#at .chips .chip:nth-child(3)', tr('ai.quick.entanglement'));
  _setText('#at .chips .chip:nth-child(4)', tr('ai.quick.bloch'));
  const welcomeBody = document.querySelector('#aim .msg:first-child .mbody');
  if (welcomeBody) welcomeBody.innerHTML = tr('ai.welcome.html');

  // VQE static blocks
  _setText('#vqecol-1 .vh', tr('vqe.setup.title'));
  _setText('#vqecol-1 > div:nth-of-type(2)', tr('vqe.hamiltonian'));
  _setText('#vqecol-1 > div:nth-of-type(4)', tr('vqe.params'));
  _setText('#vqe-lbl-opt', tr('vqe.optimizer'));
  _setText('#vqe-lbl-iter', tr('vqe.maxIter'));
  _setText('#vqe-lbl-depth', tr('vqe.ansatzDepth'));
  _setText('#vqe-lbl-type', tr('vqe.ansatzType'));
  _setText('#vqecol-1 .eunit', tr('vqe.energy.current'));
  _setText('#vqecol-2 .vh', tr('vqe.chart.title'));
  _setText('#vqecol-2 .vsc:nth-of-type(1) .sl', tr('vqe.metric.iter'));
  _setText('#vqecol-2 .vsc:nth-of-type(2) .sl', tr('vqe.metric.status'));
  _setText('#vqecol-2 .vsc:nth-of-type(3) .sl', tr('vqe.metric.errRate'));
  _setText('#bwarn', tr('vqe.warning'));
  _setText('#vqecol-3 .vh', tr('vqe.ansatz.grad.title'));
  _setText('#vqecol-3 > div:nth-of-type(2)', tr('vqe.ansatz.subtitle', {depth: parseInt(document.getElementById('vqe-inp-depth')?.value || '2')}));
  _setText('#vqecol-3 > div:nth-of-type(4)', tr('vqe.grad.title'));
  _setText('#vqecol-3 .expb.eqk', tr('vqe.export.qiskit'));
  _setText('#vqecol-3 .expb.emq', tr('vqe.export.mindq'));

  // QAOA static blocks
  _setHTML('#qaoa-col-1 .qh', tr('qaoa.editor.title.html'));
  _setText('#qaoa-col-1 > div:nth-of-type(2)', tr('qaoa.editor.desc'));
  _setText('#qg-mode-node', tr('qaoa.mode.node'));
  _setText('#qg-mode-edge', tr('qaoa.mode.edge'));
  _setText('#qaoa-col-1 .qaoa-graph-ctrl .qgbtn:nth-of-type(3)', tr('qaoa.clear'));
  _setText('#qaoa-col-1 .qaoa-graph-ctrl .qgbtn:nth-of-type(4)', tr('qaoa.sample'));
  _setText('.qaoa-ep .qaoa-ep-lbl', tr('qaoa.edge.label'));
  _setText('.qaoa-ep .qgbtn:first-of-type', tr('qaoa.edge.add'));
  _setText('.qaoa-ep-empty', tr('qaoa.edge.empty'));
  _setText('#qaoa-del-node-btn', tr('qaoa.node.delete'));
  _setText('#qaoa-col-1 > div:nth-of-type(5)', tr('qaoa.maxcut.desc'));
  _setText('#qaoa-graph-info', tr('qaoa.graph.info'));
  _setText('#qaoa-col-1 > div:nth-of-type(7)', tr('qaoa.params.title'));
  _setText('#qaoa-lbl-p', tr('qaoa.p'));
  _setText('#qaoa-lbl-gamma', tr('qaoa.gamma'));
  _setText('#qaoa-lbl-beta', tr('qaoa.beta'));
  _setText('#qaoa-col-2 .qh', tr('qaoa.chart.title'));
  _setText('#qaoa-col-2 .qaoa-sc:nth-of-type(1) .sl', tr('qaoa.metric.iter'));
  _setText('#qaoa-col-2 .qaoa-sc:nth-of-type(2) .sl', tr('qaoa.metric.ratio'));
  _setText('#qaoa-col-2 .qaoa-sc:nth-of-type(3) .sl', tr('qaoa.metric.cut'));
  _setHTML('#qaoa-col-2 .qaoa-legend span:nth-of-type(1)', `<i style="background:#276749"></i>${tr('qaoa.legend.opt')}`);
  _setHTML('#qaoa-col-2 .qaoa-legend span:nth-of-type(2)', `<i style="background:#1B3A6B"></i>${tr('qaoa.legend.curve')}`);
  _setText('#qaoa-col-2 > div:nth-of-type(4)', tr('qaoa.theory.title'));
  _setHTML('#qaoa-col-2 > div:nth-of-type(5)', tr('qaoa.theory.html'));
  _setText('#qaoa-col-3 .qh', tr('qaoa.prob.title'));
  _setText('#qaoa-col-3 > div:nth-of-type(2)', tr('qaoa.prob.desc'));
  _setText('#qaoa-solution-title', tr('qaoa.solution.title'));
  const qaoaSolution = document.getElementById('qaoa-solution');
  if (qaoaSolution && !qaoaSolution.dataset.done) qaoaSolution.innerHTML = tr('qaoa.solution.wait.html');
  _setText('#qaoa-circuit-title', tr('qaoa.circuit.title'));
  const qaoaCircDisp = document.getElementById('qaoa-circuit-display');
  if (qaoaCircDisp && !qaoaCircDisp.dataset.done) _setText('#qaoa-circuit-display', tr('qaoa.circuit.wait'));

  // Algo/share/modals/sidebar/theme picker/intro/auth/save/profile/preview
  _setText('.algo-page-title', tr('algo.page.title'));
  _setText('.algo-page-sub', tr('algo.page.sub'));
  _setText('.share-title', tr('share.title'));
  _setText('.share-note', tr('share.note'));
  _setPlaceholder('#share-url-input', tr('share.placeholder'));
  _setText('.share-copy-btn', tr('share.copy'));
  _setText('#mbg .mhd-title', tr('modal.codegen.title'));
  _setText('.cpybtn', tr('modal.copy'));
  _setText('.sbi:first-child', `FastAPI · ${tr('sidebar.fastapi')}`);
  if (!document.getElementById('sbm')?.textContent.trim()) _setText('#sbm', tr('status.ready'));
  _setText('.tp-hd-title', tr('themepicker.title'));
  _setText('.tp-hd-sub', tr('themepicker.sub'));
  _setText('.tp-hint', tr('themepicker.hint'));
  _setText('.tp-confirm', tr('themepicker.confirm'));
  _setHTML('.intro-title', tr('intro.title.html'));
  _setText('.intro-sub', tr('intro.sub'));
  _setText('#intro-what-title', tr('intro.what.title'));
  _setHTML('.intro-what', tr('intro.what.body'));
  _setText('#intro-do-title', tr('intro.do.title'));
  const introNames = ['circuit','bloch','vqe','ai','codegen','profile'];
  introNames.forEach((name, idx) => {
    _setText(`.intro-features .intro-feat:nth-of-type(${idx+1}) .intro-feat-name`, tr(`intro.feat.${name}.name`));
    _setText(`.intro-features .intro-feat:nth-of-type(${idx+1}) .intro-feat-desc`, tr(`intro.feat.${name}.desc`));
  });
  _setText('.intro-skip label[for="intro-skip-cb"]', tr('intro.skip'));
  _setText('.intro-btn-sec', tr('intro.enter'));
  _setText('.intro-btn-pri', tr('intro.start'));
  _setText('.auth-sub', tr('auth.sub'));
  _setText('.auth-tab[data-tab="login"]', tr('auth.tab.login'));
  _setText('.auth-tab[data-tab="register"]', tr('auth.tab.register'));
  _setText('#auth-login-pane .auth-row:nth-of-type(1) label', tr('auth.username'));
  _setText('#auth-login-pane .auth-row:nth-of-type(2) label', tr('auth.password'));
  _setText('#auth-reg-pane .auth-row:nth-of-type(1) label', tr('auth.username'));
  _setText('#auth-reg-pane .auth-row:nth-of-type(2) label', tr('auth.password'));
  _setText('#auth-reg-pane .auth-row:nth-of-type(3) label', tr('auth.email'));
  _setPlaceholder('#login-username', tr('auth.ph.login.username'));
  _setPlaceholder('#login-password', tr('auth.ph.login.password'));
  _setPlaceholder('#reg-username', tr('auth.ph.reg.username'));
  _setPlaceholder('#reg-password', tr('auth.ph.reg.password'));
  _setPlaceholder('#reg-email', tr('auth.ph.reg.email'));
  _setText('#auth-login-pane .auth-submit', tr('auth.submit.login'));
  _setText('#auth-reg-pane .auth-submit', tr('auth.submit.register'));
  _setText('.save-hd', tr('save.title'));
  _setText('.save-note', tr('save.note'));
  _setText('#save-overlay label', tr('save.name'));
  _setPlaceholder('#save-circuit-name', tr('save.placeholder'));
  _setText('.save-cancel', tr('save.cancel'));
  _setText('.save-confirm', tr('save.confirm'));
  _setText('.profile-hd-title', tr('profile.title'));
  _setText('.profile-tab[data-tab="circuits"]', tr('profile.tab.circuits'));
  _setText('.profile-tab[data-tab="history"]', tr('profile.tab.history'));
  _setText('.guide-prev', tr('guide.prev'));
  _setText('#guide-no-show-txt', tr('guide.noshow'));
  _setText('.aprev-anim-btn#aprev-play-btn', _aprevRunning ? tr('aprev.pause') : tr('aprev.resume'));
  _setText('.aprev-anim-btn:not(#aprev-play-btn)', tr('aprev.replay'));
  _setText('#aprev-spd-slow', tr('aprev.speed.slow'));
  _setText('#aprev-spd-norm', tr('aprev.speed.norm'));
  _setText('#aprev-spd-fast', tr('aprev.speed.fast'));
  _setText('.aprev-info > div:nth-of-type(1) .aprev-info-lbl', tr('aprev.info.desc'));
  _setText('.aprev-info > div:nth-of-type(2) .aprev-info-lbl', tr('aprev.info.steps'));
  _setText('.aprev-info > div:nth-of-type(3) .aprev-info-lbl', tr('aprev.info.adv'));
  _setText('#aprev-load-btn', tr('aprev.load'));
}

function applyLang(lang) {
  _currentLang = lang;
  window._currentLang = _currentLang;
  localStorage.setItem('qedu_lang', lang);
  document.getElementById('lang-zh')?.classList.toggle('on', lang==='zh');
  document.getElementById('lang-en')?.classList.toggle('on', lang==='en');
  // Clear stale-language AI messages (gate/sim messages cannot be retroactively translated)
  const aim = document.getElementById('aim');
  if (aim) aim.querySelectorAll('.msg:not(:first-child)').forEach(m => m.remove());
  refreshStaticI18N();
  _safeCall(() => { window.renderBackendConnState?.(); window.refreshConnectionLabel?.(); window.refreshConnI18n?.(); });
  _safeCall(() => { window.refreshCircuitI18N?.(); window.refreshCircuitI18n?.(); });
  _safeCall(() => { window.refreshAuthI18N?.(); window.refreshAuthI18n?.(); });
  _safeCall(() => { window.refreshGuideI18N?.(); window.refreshGuideI18n?.(); });
  _safeCall(() => { window.refreshAII18N?.(); window.refreshAII18n?.(); });
  _safeCall(() => { window.refreshAlgoI18N?.(); window.refreshAlgoI18n?.(); });
  _safeCall(() => { window.refreshResLibI18N?.(); window.refreshResLibI18n?.(); });
  _safeCall(() => { window.refreshVQEI18N?.(); window.refreshVQEI18n?.(); });
  _safeCall(() => { window.refreshQAOAI18N?.(); window.refreshQAOAI18n?.(); });
  _safeCall(() => { window.refreshReplayI18N?.(); window.refreshReplayI18n?.(); });
  _safeCall(() => { window.refreshShareI18N?.(); window.refreshShareI18n?.(); });
  _safeCall(() => { window.refreshSimI18N?.(); window.refreshSimI18n?.(); });
  _safeCall(() => { window.refreshCodegenI18N?.(); window.refreshCodegenI18n?.(); });
  setSBMsg(tr(lang === 'zh' ? 'status.lang.zh' : 'status.lang.en'));
}

function loadSavedSettings() {
  const sz = localStorage.getItem('qedu_fontsize');
  if(sz) applyFontSize(sz);
  const zm = parseInt(localStorage.getItem('qedu_zoom') || '100', 10);
  if(zm !== 100) applyZoom(zm);
  const an = localStorage.getItem('qedu_anim');
  if(an === '0') {
    _animOn = false;
    document.documentElement.classList.add('no-anim');
    document.getElementById('anim-tog')?.classList.remove('on');
  }
  const lg = localStorage.getItem('qedu_lang') || 'zh';
  applyLang(lg);
}

function openSettings() {
  document.getElementById('settings-overlay').classList.add('on');
  document.querySelectorAll('[data-th]').forEach(el => el.classList.toggle('on', el.dataset.th === _currentTheme));
  const sl = document.getElementById('zoom-slider');
  const vl = document.getElementById('zoom-val');
  if(sl) sl.value = _currentZoom;
  if(vl) vl.textContent = _currentZoom + '%';
  ['sm','md','lg'].forEach(s => document.getElementById('fs-'+s)?.classList.toggle('on', s===_currentFontSize));
  document.getElementById('anim-tog')?.classList.toggle('on', _animOn);
  document.getElementById('lang-zh')?.classList.toggle('on', _currentLang==='zh');
  document.getElementById('lang-en')?.classList.toggle('on', _currentLang==='en');
}
function closeSettings() { document.getElementById('settings-overlay').classList.remove('on'); }

function showThemePicker() {
  _pickedTheme = _currentTheme;
  document.getElementById('tp-overlay').classList.add('on');
  document.querySelectorAll('[data-th]').forEach(el => el.classList.toggle('on', el.dataset.th === _currentTheme));
  refreshStaticI18N();
}
function pickTheme(id) {
  _pickedTheme = id;
  applyTheme(id);
}
function confirmThemePick() {
  applyTheme(_pickedTheme);
  document.getElementById('tp-overlay').classList.remove('on');
  if (window._fromHomepage) {
    openIntro();   // 从首页主动进入：始终显示，不受"不再显示"影响
  } else {
    initIntro();   // 其他情况（刷新/分享链接）：尊重用户的跳过设置
  }
}

function openIntro() {
  try { sessionStorage.setItem('qedu_intro_shown_session', '1'); } catch (e) {}
  document.getElementById('intro-overlay').classList.add('on');
  refreshStaticI18N();
}
function closeIntro(startGuide) {
  document.getElementById('intro-overlay').classList.remove('on');
  window._fromHomepage = false;
  if (startGuide) {
    setTimeout(function() { openGuide(0); }, 80);
  }
}
function initIntro() {
  const noAuto = localStorage.getItem('qedu_intro_skip')==='1';
  if(!noAuto) { openIntro(); return; }
}
function introSkipChange(cb) {
  localStorage.setItem('qedu_intro_skip', cb.checked ? '1' : '0');
}
