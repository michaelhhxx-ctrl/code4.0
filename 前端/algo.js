// ── ALGORITHM LIBRARY ──

function _algoLang() { return window._currentLang === 'en' ? 'en' : 'zh'; }
function _algoL(zh, en) { return _algoLang() === 'en' ? en : zh; }
function _algoPick(zh, en) { return _algoLang() === 'en' ? en : zh; }

const ALGO_LIB = [
  { id:'bell', nameZh:'Bell 态', nameEn:'Bell State', subtitleZh:'两体最大纠缠', subtitleEn:'Two-qubit maximal entanglement', diffZh:'入门', diffEn:'Beginner', dc:'green', q:2, depth:2,
    descZh:'H 门产生叠加，CNOT 建立纠缠，生成 (|00⟩+|11⟩)/√2。测量一个比特立即确定另一个，无论相距多远。',
    descEn:'The H gate creates superposition and CNOT creates entanglement, producing (|00⟩+|11⟩)/√2. Measuring one qubit instantly determines the other, no matter how far apart they are.',
    tagsZh:['纠缠','CNOT','叠加'], tagsEn:['Entanglement','CNOT','Superposition'], circ:'q₀: ─H─●─M─\nq₁: ───⊕─M─' },
  { id:'ghz', nameZh:'GHZ 态', nameEn:'GHZ State', subtitleZh:'三体最大纠缠', subtitleEn:'Three-qubit maximal entanglement', diffZh:'入门', diffEn:'Beginner', dc:'green', q:3, depth:3,
    descZh:'三比特最大纠缠态 (|000⟩+|111⟩)/√2。展示多体量子非局域性，是量子网络的核心资源。',
    descEn:'The maximally entangled three-qubit state (|000⟩+|111⟩)/√2. It demonstrates multipartite quantum nonlocality and is a core resource for quantum networks.',
    tagsZh:['纠缠','多比特'], tagsEn:['Entanglement','Multi-qubit'], circ:'q₀: ─H─●─●─\nq₁: ───⊕─╫─\nq₂: ─────⊕─' },
  { id:'qft', nameZh:'QFT', nameEn:'QFT', subtitleZh:'量子傅里叶变换', subtitleEn:'Quantum Fourier Transform', diffZh:'中级', diffEn:'Intermediate', dc:'amber', q:3, depth:6,
    descZh:'Shor 因式分解与量子相位估计的核心。相比经典 FFT 在 n 比特上有指数级加速。',
    descEn:'A core subroutine of Shor factoring and quantum phase estimation. Compared with the classical FFT, it offers exponential advantage on n qubits.',
    tagsZh:['Shor','相位','加速'], tagsEn:['Shor','Phase','Speedup'], circ:'q₀: ─H─S─T─\nq₁: ───H─S─\nq₂: ─────H─' },
  { id:'grover', nameZh:'Grover 搜索', nameEn:'Grover Search', subtitleZh:'量子搜索算法', subtitleEn:'Quantum search algorithm', diffZh:'中级', diffEn:'Intermediate', dc:'amber', q:2, depth:4,
    descZh:'N 个元素中搜索只需 O(√N) 次查询，经典需 O(N)。Oracle + 扩散算子实现振幅放大。',
    descEn:'Searching among N items needs only O(√N) queries, versus O(N) classically. Oracle and diffusion amplify the target amplitude.',
    tagsZh:['搜索','振幅放大','Oracle'], tagsEn:['Search','Amplitude amplification','Oracle'], circ:'q₀: ─H─Z─●─H─\nq₁: ─H─Z─⊕─H─' },
  { id:'teleport', nameZh:'量子隐形传态', nameEn:'Quantum Teleportation', subtitleZh:'量子通信协议', subtitleEn:'Quantum communication protocol', diffZh:'中级', diffEn:'Intermediate', dc:'amber', q:3, depth:7,
    descZh:'利用纠缠将未知量子态从 Alice 传给 Bob，无需传输物质。量子互联网核心协议。',
    descEn:'Uses entanglement to transfer an unknown quantum state from Alice to Bob without moving matter. A foundational protocol for the quantum internet.',
    tagsZh:['通信','纠缠','测量'], tagsEn:['Communication','Entanglement','Measurement'], circ:'q₀: ─ψ─H─●─M─\nq₁: ──H─⊕─M─X\nq₂: ────────Z─' },
  { id:'deutsch', nameZh:'Deutsch-Jozsa', nameEn:'Deutsch-Jozsa', subtitleZh:'量子算法先驱', subtitleEn:'Pioneer quantum algorithm', diffZh:'高级', diffEn:'Advanced', dc:'red', q:3, depth:5,
    descZh:'判断函数是常数或平衡，量子仅需 1 次查询，经典需 2^(n-1)+1 次。首个证明量子优越性的算法。',
    descEn:'Determines whether a function is constant or balanced with one quantum query, versus 2^(n-1)+1 classical queries. One of the earliest proofs of quantum advantage.',
    tagsZh:['Oracle','先驱','指数加速'], tagsEn:['Oracle','Pioneer','Exponential speedup'], circ:'q₀: ─H───H─M─\nq₁: ─H─Uf─H─M─\nqₙ: ─X─H──────' },
  { id:'vqe_ansatz', nameZh:'VQE Ansatz', nameEn:'VQE Ansatz', subtitleZh:'变分量子本征解', subtitleEn:'Variational quantum eigensolver', diffZh:'高级', diffEn:'Advanced', dc:'red', q:2, depth:4,
    descZh:'Hardware-Efficient Ansatz：Ry 旋转 + CNOT 纠缠。VQE 量子化学计算的线路核心。',
    descEn:'A hardware-efficient ansatz with Ry rotations plus CNOT entanglement. A core circuit structure for VQE quantum chemistry.',
    tagsZh:['VQE','变分','量子化学'], tagsEn:['VQE','Variational','Quantum chemistry'], circ:'q₀: ─Ry─●──Rz\nq₁: ─Ry─⊕─Ry─●' },
  { id:'phase_kick', nameZh:'相位反冲', nameEn:'Phase Kickback', subtitleZh:'量子算法基础技术', subtitleEn:'Core technique in quantum algorithms', diffZh:'中级', diffEn:'Intermediate', dc:'amber', q:2, depth:3,
    descZh:'控制门相位“反弹”到控制比特。Shor、Grover 等算法中实现量子干涉加速的核心机制。',
    descEn:'The phase of a controlled operation “kicks back” onto the control qubit. It is a core mechanism behind quantum interference speedups in algorithms like Shor and Grover.',
    tagsZh:['相位','干涉','基础'], tagsEn:['Phase','Interference','Foundation'], circ:'q₀: ─H─────H─M\nq₁: ─X─H─T─●──' },
];

function _algoView(a) {
  return {
    name: _algoPick(a.nameZh, a.nameEn),
    subtitle: _algoPick(a.subtitleZh, a.subtitleEn),
    diff: _algoPick(a.diffZh, a.diffEn),
    desc: _algoPick(a.descZh, a.descEn),
    tags: _algoPick(a.tagsZh, a.tagsEn),
    circ: a.circ
  };
}

function renderAlgoLib() {
  const el = document.getElementById('algo-grid');
  if (!el) return;
  el.innerHTML = ALGO_LIB.map(a => {
    const v = _algoView(a);
    return `
      <div class="algo-card">
        <div class="algo-card-header" onclick="loadAlgo('${a.id}')">
          <div class="algo-circuit">${v.circ}</div>
          <div class="algo-title-row">
            <span class="algo-name">${v.name}</span>
            <span class="algo-zh">${v.subtitle}</span>
            <span class="diff-badge diff-${a.dc}">${v.diff}</span>
          </div>
        </div>
        <div class="algo-card-body">
          <div class="algo-desc">${v.desc}</div>
          <div class="algo-tags">${v.tags.map(t => `<span class="algo-tag">${t}</span>`).join('')}</div>
          <div class="algo-meta"><span>⬡ ${_algoL(`${a.q} 量子比特`, `${a.q} qubits`)}</span><span>⏱ ${_algoL(`深度 ${a.depth}`, `depth ${a.depth}`)}</span></div>
          <div class="algo-btn-row">
            <button class="algo-prev-btn" onclick="showAlgoPreview('${a.id}')">${_algoL('▶ 预览', '▶ Preview')}</button>
            <button class="algo-load-btn" onclick="loadAlgo('${a.id}')">${_algoL('一键加载到编辑器 →', 'Load into editor →')}</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function loadAlgo(id) {
  saveHist(); initCirc();
  if (id === 'bell') { loadPreset('bell'); }
  else if (id === 'ghz') { loadPreset('ghz'); }
  else if (id === 'qft') { loadPreset('qft'); }
  else if (id === 'grover') { loadPreset('grover'); }
  else if (id === 'teleport') {
    if (S.qubits < 3) { S.qubits = 3; while (S.circ.length < 3) S.circ.push(Array(S.steps).fill(null)); }
    S.circ[0][0] = { g:'H', p:null };
    S.circ[0][1] = { g:'CNOT', p:null, ctrl:0, tgt:1, role:'ctrl' };
    S.circ[1][1] = { g:'CNOT', p:null, ctrl:0, tgt:1, role:'tgt' };
    S.circ[0][2] = { g:'H', p:null }; S.circ[0][3] = { g:'M', p:null }; S.circ[1][3] = { g:'M', p:null };
    S.circ[1][4] = { g:'X', p:null }; S.circ[2][4] = { g:'Z', p:null };
    addMsg(_algoL('已加载 <b>量子隐形传态</b>：Alice 持有 q₀（待传态），与 q₁ 共享 Bell 对，测量后通过经典通信指导 Bob（q₂）恢复量子态。', 'Loaded <b>quantum teleportation</b>: Alice holds q₀ (the state to be teleported) and shares a Bell pair with q₁. After measurement, classical communication tells Bob (q₂) how to recover the state.'));
  }
  else if (id === 'deutsch') {
    if (S.qubits < 3) { S.qubits = 3; while (S.circ.length < 3) S.circ.push(Array(S.steps).fill(null)); }
    S.circ[2][0] = { g:'X', p:null };
    for (let q = 0; q < 3; q++) S.circ[q][1] = { g:'H', p:null };
    S.circ[0][2] = { g:'CNOT', p:null, ctrl:0, tgt:2, role:'ctrl' };
    S.circ[2][2] = { g:'CNOT', p:null, ctrl:0, tgt:2, role:'tgt' };
    for (let q = 0; q < 2; q++) { S.circ[q][3] = { g:'H', p:null }; S.circ[q][4] = { g:'M', p:null }; }
    addMsg(_algoL('已加载 <b>Deutsch-Jozsa 算法</b>：只需一次 Oracle 查询即可区分常数函数和平衡函数，这是最早展示量子优势的算法之一。', 'Loaded the <b>Deutsch-Jozsa algorithm</b>: a single oracle query is enough to distinguish constant and balanced functions, making it one of the earliest demonstrations of quantum advantage.'));
  }
  else if (id === 'vqe_ansatz') {
    if (S.qubits < 2) { S.qubits = 2; S.circ.push(Array(S.steps).fill(null)); }
    S.circ[0][0] = { g:'Ry', p:45 }; S.circ[1][0] = { g:'Ry', p:45 };
    S.circ[0][1] = { g:'CNOT', p:null, ctrl:0, tgt:1, role:'ctrl' };
    S.circ[1][1] = { g:'CNOT', p:null, ctrl:0, tgt:1, role:'tgt' };
    S.circ[0][2] = { g:'Rz', p:90 }; S.circ[1][2] = { g:'Ry', p:30 };
    addMsg(_algoL('已加载 <b>VQE Hardware-Efficient Ansatz</b>：Ry 旋转加 CNOT 纠缠层，是变分量子本征解算法的核心电路结构。', 'Loaded the <b>VQE hardware-efficient ansatz</b>: Ry rotations plus a CNOT entangling layer, a core circuit structure for variational quantum eigensolvers.'));
  }
  else if (id === 'phase_kick') {
    if (S.qubits < 2) { S.qubits = 2; S.circ.push(Array(S.steps).fill(null)); }
    S.circ[1][0] = { g:'X', p:null }; S.circ[1][1] = { g:'H', p:null };
    S.circ[0][1] = { g:'H', p:null }; S.circ[1][2] = { g:'T', p:null };
    S.circ[1][3] = { g:'CNOT', p:null, ctrl:1, tgt:0, role:'ctrl' };
    S.circ[0][3] = { g:'CNOT', p:null, ctrl:1, tgt:0, role:'tgt' };
    S.circ[0][4] = { g:'H', p:null }; S.circ[0][5] = { g:'M', p:null };
    addMsg(_algoL('已加载 <b>相位反冲</b>：受控酉门的相位会“反弹”到控制比特上，这是 Shor 和 Grover 等算法中的关键机制。', 'Loaded <b>phase kickback</b>: the phase of a controlled unitary “kicks back” onto the control qubit, a key mechanism in algorithms such as Shor and Grover.'));
  }
  renderCirc(); updateStats(); updateBlochFromCirc();
  const tab = document.querySelector('.ntab');
  setView('c', tab);
  const item = ALGO_LIB.find(a => a.id === id);
  if (item) setSBMsg(_algoL(`已加载算法：${item.nameZh}`, `Loaded algorithm: ${item.nameEn}`));
}

const ALGO_PREVIEW = {
  bell: {
    advZh:'两个量子比特的状态完全关联：无论相距多远，测量其中一个，另一个都会立即确定——爱因斯坦称之为“幽灵般的超距作用”。',
    advEn:'The two qubits become perfectly correlated: no matter how far apart they are, measuring one immediately determines the other — what Einstein called “spooky action at a distance.”',
    stepsZh:['H 门作用于 q₀，产生叠加态 (|0⟩+|1⟩)/√2','CNOT 以 q₀ 为控制位翻转 q₁，建立纠缠','系统进入 Bell 态 (|00⟩+|11⟩)/√2','测量 q₀=0 则 q₁=0，测量 q₀=1 则 q₁=1'],
    stepsEn:['Apply H to q₀ to create the superposition (|0⟩+|1⟩)/√2','Use q₀ as the control of CNOT to flip q₁ and create entanglement','The system reaches the Bell state (|00⟩+|11⟩)/√2','If q₀ measures 0 then q₁ is 0; if q₀ measures 1 then q₁ is 1'],
    anim:_animBell
  },
  ghz: {
    advZh:'三体最大纠缠——测量任意一个比特后，另外两个比特的状态也随之确定。GHZ 态是量子网络和量子密钥分发的重要资源。',
    advEn:'A maximally entangled three-qubit state: measuring any one qubit fixes the states of the other two. GHZ states are important resources for quantum networks and key distribution.',
    stepsZh:['H 门作用于 q₀，创建叠加态','CNOT(q₀→q₁) 纠缠前两个比特','CNOT(q₀→q₂) 将纠缠扩展到第三个比特','得到 (|000⟩+|111⟩)/√2'],
    stepsEn:['Apply H to q₀ to create superposition','CNOT(q₀→q₁) entangles the first two qubits','CNOT(q₀→q₂) extends the entanglement to the third qubit','The result is (|000⟩+|111⟩)/√2'],
    anim:_animGHZ
  },
  qft: {
    advZh:'量子傅里叶变换可在 O(n²) 门操作内完成，而经典 FFT 对 n 比特输入需要 O(n·2ⁿ)。它是 Shor 因式分解的核心子程序。',
    advEn:'The quantum Fourier transform can be performed in O(n²) gates, while a classical FFT on n qubits of state space scales as O(n·2ⁿ). It is a core subroutine in Shor’s factoring algorithm.',
    stepsZh:['H 门把计算基态转入频域叠加','受控相位门 S/T 编码频率信息','逐层叠加形成量子频谱','输出态中编码了原始信号的傅里叶系数'],
    stepsEn:['H gates move the computational basis state into a frequency-domain superposition','Controlled phase gates S/T encode frequency information','Layer by layer, the quantum spectrum is built up','The output state encodes the Fourier coefficients of the original signal'],
    anim:_animQFT
  },
  grover: {
    advZh:'在 N 个元素中搜索目标，经典复杂度是 O(N)，Grover 只需 O(√N)。对于 100 万个元素，经典大约要查询 100 万次，而量子只需约 1000 次。',
    advEn:'To find a target among N items, classical search needs O(N) queries while Grover needs only O(√N). For one million items, the classical cost is about one million queries, but quantum search needs only around one thousand.',
    stepsZh:['Hadamard 层创建均匀叠加（所有态等权）','Oracle 翻转目标态相位','扩散算子对概率振幅做“镜像反射”','重复 O(√N) 次后目标态概率接近 1'],
    stepsEn:['A Hadamard layer creates a uniform superposition over all states','The oracle flips the phase of the target state','The diffusion operator reflects amplitudes about the average','After O(√N) iterations, the target probability approaches 1'],
    anim:_animGrover
  },
  teleport: {
    advZh:'量子态可以在不搬运物理粒子的情况下转移，但仍需要 2 比特经典通信，因此并不违背相对论。这是量子互联网的基础协议。',
    advEn:'A quantum state can be transferred without moving the physical particle itself, but the protocol still needs 2 classical bits of communication, so it does not violate relativity. This is a foundational protocol for the quantum internet.',
    stepsZh:['Alice 与 Bob 先共享一对 Bell 纠缠态','Alice 对待传态 ψ 与手中的纠缠比特做 Bell 测量','Alice 把 2 比特经典结果发给 Bob','Bob 根据结果施加修正门，恢复 ψ'],
    stepsEn:['Alice and Bob first share a Bell pair','Alice performs a Bell-basis measurement on ψ and her entangled qubit','Alice sends 2 classical bits to Bob','Bob applies correction gates according to the message to recover ψ'],
    anim:_animTeleport
  },
  deutsch: {
    advZh:'判断函数 f 是常数还是平衡：经典需要 2^(n-1)+1 次查询，量子只需 1 次 Oracle 查询——这是最早严格证明量子优越性的算法之一。',
    advEn:'To decide whether a function f is constant or balanced, a classical method needs 2^(n-1)+1 queries while the quantum version needs only 1 oracle call — one of the earliest rigorous demonstrations of quantum advantage.',
    stepsZh:['辅助比特 qₙ 先置于 |1⟩，再经 H 变为 |−⟩','所有比特经 H 门进入等权叠加','Oracle Uf 在一次查询中编码函数信息','H 门干涉后：常数函数→|0⟩，平衡函数→|1⟩'],
    stepsEn:['Prepare the ancilla qₙ in |1⟩ and apply H to make |−⟩','Apply H to all qubits to create an equal superposition','The oracle Uf encodes function information in a single query','After the final H gates, constant functions map to |0⟩ and balanced ones to |1⟩'],
    anim:_animDeutsch
  },
  vqe_ansatz: {
    advZh:'VQE 依赖变分原理：E(θ)=⟨ψ(θ)|H|ψ(θ)⟩≥E₀。通过优化参数 θ 来最小化能量期望值，从而逼近分子基态——这是量子化学中的核心应用。',
    advEn:'VQE relies on the variational principle: E(θ)=⟨ψ(θ)|H|ψ(θ)⟩≥E₀. By optimizing parameters θ to minimize the energy expectation value, it approaches the molecular ground state — a central application in quantum chemistry.',
    stepsZh:['Ry(θ) 旋转门初始化参数化量子态','CNOT 纠缠层引入多体关联','第二层 Ry/Rz 进一步优化态空间','经典优化器（COBYLA）迭代更新 θ'],
    stepsEn:['Ry(θ) gates initialize a parameterized quantum state','A CNOT entangling layer introduces many-body correlations','A second layer of Ry/Rz gates further expands the variational space','A classical optimizer (COBYLA) iteratively updates θ'],
    anim:_animVQE
  },
  phase_kick: {
    advZh:'相位反冲是 Shor、Grover、QPE 等核心算法的底层机制：受控酉门的本征相位会“反弹”到控制比特上，从而实现量子并行加速。',
    advEn:'Phase kickback is a low-level mechanism behind core algorithms such as Shor, Grover, and QPE: the eigenphase of a controlled unitary “kicks back” onto the control qubit, enabling quantum speedups through interference.',
    stepsZh:['辅助比特先制备为 |1⟩，再经 H 变为 |−⟩','控制比特经 H 门进入叠加态','控制 T 门把相位 e^{iπ/4} 施加到辅助比特','相位反冲使控制比特获得相对相位，最后通过 H 干涉读出'],
    stepsEn:['Prepare the ancilla in |1⟩ and apply H to get |−⟩','Apply H to the control qubit to create superposition','A controlled T operation applies the phase e^{iπ/4} to the ancilla','Through phase kickback, the control qubit acquires a relative phase that is read out by final H interference'],
    anim:_animPhaseKick
  }
};

function _algoPreviewView(id) {
  const info = ALGO_PREVIEW[id];
  if (!info) return null;
  return { adv: _algoPick(info.advZh, info.advEn), steps: _algoPick(info.stepsZh, info.stepsEn), anim: info.anim };
}

function showAlgoPreview(id) {
  const a = ALGO_LIB.find(x => x.id === id);
  const info = _algoPreviewView(id);
  if (!a || !info) return;
  const v = _algoView(a);
  _aprevId = id; _aprevT = 0; _aprevRunning = true;

  document.getElementById('aprev-name').textContent = v.name;
  document.getElementById('aprev-zh').textContent = v.subtitle;
  const db = document.getElementById('aprev-diff');
  db.textContent = v.diff; db.className = `diff-badge diff-${a.dc}`;
  document.getElementById('aprev-desc').textContent = v.desc;
  document.getElementById('aprev-adv').textContent = info.adv;
  document.getElementById('aprev-steps').innerHTML = info.steps
    .map((step, i) => `<div class="aprev-step"><div class="aprev-step-num">${i + 1}</div><div>${step}</div></div>`).join('');
  document.getElementById('aprev-play-btn').textContent = _algoL('⏸ 暂停', '⏸ Pause');
  document.getElementById('aprev-play-btn').classList.add('active');
  document.getElementById('aprev-reset-btn').textContent = _algoL('↻ 重播', '↻ Replay');
  document.getElementById('aprev-load-btn').textContent = _algoL('加载到编辑器', 'Load into editor');
  document.getElementById('aprev-load-btn').onclick = () => { closeAlgoPreview(); loadAlgo(id); };

  document.getElementById('aprev-overlay').classList.add('on');
  _loadVid(document.querySelector('#aprev-overlay video'));
  _startAlgoAnim(info.anim);
}

function closeAlgoPreview() {
  document.getElementById('aprev-overlay').classList.remove('on');
  if (_aprevAnimId) { cancelAnimationFrame(_aprevAnimId); _aprevAnimId = null; }
}

function toggleAlgoAnim() {
  _aprevRunning = !_aprevRunning;
  const btn = document.getElementById('aprev-play-btn');
  if (_aprevRunning) {
    btn.textContent = _algoL('⏸ 暂停', '⏸ Pause'); btn.classList.add('active');
    const info = _algoPreviewView(_aprevId);
    if (info) _startAlgoAnim(info.anim);
  } else {
    btn.textContent = _algoL('▶ 继续', '▶ Resume'); btn.classList.remove('active');
    if (_aprevAnimId) { cancelAnimationFrame(_aprevAnimId); _aprevAnimId = null; }
  }
}

function resetAlgoAnim() {
  _aprevT = 0; _aprevRunning = true;
  document.getElementById('aprev-play-btn').textContent = _algoL('⏸ 暂停', '⏸ Pause');
  document.getElementById('aprev-play-btn').classList.add('active');
  if (_aprevAnimId) { cancelAnimationFrame(_aprevAnimId); _aprevAnimId = null; }
  const info = _algoPreviewView(_aprevId);
  if (info) _startAlgoAnim(info.anim);
}

function _startAlgoAnim(fn) {
  if (_aprevAnimId) { cancelAnimationFrame(_aprevAnimId); _aprevAnimId = null; }
  const cv = document.getElementById('aprev-cv'); if (!cv) return;
  // HiDPI: scale canvas buffer by devicePixelRatio for crisp rendering
  const dpr = window.devicePixelRatio || 1;
  const logW = 480, logH = 300;
  if (cv.width !== logW * dpr || cv.height !== logH * dpr) {
    cv.width = logW * dpr;
    cv.height = logH * dpr;
    cv.style.width = logW + 'px';
    cv.style.height = logH + 'px';
  }
  function loop() {
    if (!_aprevRunning) return;
    const ctx = cv.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);
    fn(cv, _aprevT);
    ctx.restore();
    _aprevT += 0.45 * _aprevSpeed;
    _aprevAnimId = requestAnimationFrame(loop);
  }
  _aprevAnimId = requestAnimationFrame(loop);
}

let _aprevId = null, _aprevAnimId = null, _aprevRunning = true, _aprevT = 0, _aprevSpeed = 1;

function setAlgoSpeed(s) {
  _aprevSpeed = s;
  const map = {0.5:'slow', 1:'norm', 2.5:'fast'};
  document.querySelectorAll('.aprev-spd').forEach(b => b.classList.remove('active'));
  const id = 'aprev-spd-' + (map[s] || 'norm');
  const btn = document.getElementById(id);
  if (btn) btn.classList.add('active');
}

// ─── Shared helpers ────────────────────────────────────────────
function _aprevClear(cv) {
  const ctx = cv.getContext('2d');
  const th = document.documentElement.getAttribute('data-theme') || 'classic';
  ctx.fillStyle = th === 'classic' ? '#F0F4FA' : th === 'dark' ? '#0F172A' : th === 'amber' ? '#13161C' : '#0C0720';
  // Expose logical (CSS) size on cv so anim functions can read W/H correctly
  cv._lw = parseInt(cv.style.width) || cv.width;
  cv._lh = parseInt(cv.style.height) || cv.height;
  ctx.fillRect(0, 0, cv._lw, cv._lh);
  return ctx;
}
function _aprevNavy() {
  const th = document.documentElement.getAttribute('data-theme') || 'classic';
  return th === 'classic' ? '#1B3A6B' : th === 'dark' ? '#4A86E8' : th === 'amber' ? '#F7A84D' : '#9B7FFF';
}
function _aprevTeal() {
  const th = document.documentElement.getAttribute('data-theme') || 'classic';
  return th === 'amber' ? '#C8903A' : '#0D9488';
}
function _aprevText() {
  const th = document.documentElement.getAttribute('data-theme') || 'classic';
  return th === 'classic' ? '#334155' : th === 'amber' ? '#D8C4A8' : '#94A3B8';
}
function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
}
function _ease(t) { return t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2; }
function _lerp(a,b,t){ return a+(b-a)*t; }
function _lerpAngle(a,b,t){ // shortest-path angle lerp
  let d=((b-a)%(Math.PI*2)+Math.PI*3)%(Math.PI*2)-Math.PI;
  return a+d*t;
}

// ─── 3D Bloch Sphere ───────────────────────────────────────────
const _AZ=0.40, _EL=0.54; // camera azimuth & elevation
function _proj3D(cx,cy,R,x,y,z){
  const x1=x*Math.cos(_AZ)-y*Math.sin(_AZ);
  const y1=x*Math.sin(_AZ)+y*Math.cos(_AZ);
  const y2=y1*Math.cos(_EL)-z*Math.sin(_EL);
  const z2=y1*Math.sin(_EL)+z*Math.cos(_EL); // depth
  return [cx+x1*R, cy-y2*R, z2];
}

function _drawBloch3D(ctx,cx,cy,R,theta,phi,color,label,r=1,showTrail=null){
  // 3D shading gradient
  const g=ctx.createRadialGradient(cx-R*.32,cy-R*.32,R*.04,cx,cy,R);
  g.addColorStop(0,'rgba(255,255,255,.20)');
  g.addColorStop(.65,'rgba(0,0,0,0)');
  g.addColorStop(1,'rgba(0,0,0,.16)');
  ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);
  ctx.fillStyle=g;ctx.fill();
  // Outline
  ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);
  ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.globalAlpha=.38;ctx.stroke();ctx.globalAlpha=1;

  // Grid: equator & prime meridian (front=solid, back=dashed)
  [[1,0,0],[0,1,0]].forEach(([_,use_y],pass_grid)=>{
    for(let solid=0;solid<2;solid++){
      ctx.beginPath();let started=false;
      for(let i=0;i<=80;i++){
        const a=(i/80)*Math.PI*2;
        let sx,sy,sz;
        if(pass_grid===0) [sx,sy,sz]=_proj3D(cx,cy,R,Math.cos(a),Math.sin(a),0);
        else              [sx,sy,sz]=_proj3D(cx,cy,R,Math.cos(a),0,Math.sin(a));
        const front=sz>0;
        if((solid===0&&front)||(solid===1&&!front)){
          started?ctx.lineTo(sx,sy):(ctx.moveTo(sx,sy),started=true);
        }else if(started){ctx.lineTo(sx,sy);started=false;}
      }
      if(solid===1)ctx.setLineDash([3,3]);
      ctx.strokeStyle=color;ctx.lineWidth=1.0;ctx.globalAlpha=.32;ctx.stroke();
      ctx.setLineDash([]);ctx.globalAlpha=1;
    }
  });

  // Z-axis
  const [npx,npy]=_proj3D(cx,cy,R,0,0,1);
  const [spx,spy]=_proj3D(cx,cy,R,0,0,-1);
  ctx.beginPath();ctx.moveTo(npx,npy);ctx.lineTo(cx,cy);
  ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.globalAlpha=.65;ctx.stroke();
  ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(spx,spy);
  ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.globalAlpha=.40;ctx.stroke();
  ctx.setLineDash([]);ctx.globalAlpha=1;

  // Pole labels
  ctx.fillStyle=color;ctx.font="bold 12px 'JetBrains Mono',monospace";ctx.textAlign='center';ctx.globalAlpha=1;
  ctx.fillText('|0⟩',npx,npy-8);ctx.fillText('|1⟩',spx,spy+15);ctx.globalAlpha=1;

  // Trail arc (show path of state vector)
  if(showTrail){
    const{fromTheta,fromPhi,toTheta,toPhi,progress}=showTrail;
    ctx.beginPath();let trailStarted=false;
    const steps=32;
    for(let i=0;i<=steps;i++){
      const p=i/steps*progress;
      const th=_lerp(fromTheta,toTheta,_ease(p));
      const ph=_lerpAngle(fromPhi,toPhi,_ease(p));
      const[sx,sy]=_proj3D(cx,cy,R,Math.sin(th)*Math.cos(ph),Math.sin(th)*Math.sin(ph),Math.cos(th));
      trailStarted?ctx.lineTo(sx,sy):(ctx.moveTo(sx,sy),trailStarted=true);
    }
    ctx.strokeStyle='#F87171';ctx.lineWidth=1.8;ctx.globalAlpha=.55;
    ctx.setLineDash([]);ctx.stroke();ctx.globalAlpha=1;
  }

  // State vector arrow
  const bx=r*Math.sin(theta)*Math.cos(phi);
  const by=r*Math.sin(theta)*Math.sin(phi);
  const bz=r*Math.cos(theta);
  const[ex,ey]=_proj3D(cx,cy,R,bx,by,bz);
  ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(ex,ey);
  ctx.strokeStyle='#EF4444';ctx.lineWidth=3.2;ctx.stroke();
  if(r>0.08){
    const ang=Math.atan2(ey-cy,ex-cx),al=13;
    ctx.beginPath();ctx.moveTo(ex,ey);
    ctx.lineTo(ex-al*Math.cos(ang-.42),ey-al*Math.sin(ang-.42));
    ctx.lineTo(ex-al*Math.cos(ang+.42),ey-al*Math.sin(ang+.42));
    ctx.closePath();ctx.fillStyle='#EF4444';ctx.fill();
    // Surface dot
    ctx.beginPath();ctx.arc(ex,ey,4.5,0,Math.PI*2);
    ctx.fillStyle='#EF4444';ctx.fill();
  } else {
    // Mixed state center dot
    ctx.beginPath();ctx.arc(cx,cy,4.5,0,Math.PI*2);
    ctx.fillStyle='#EF4444';ctx.globalAlpha=.7;ctx.fill();ctx.globalAlpha=1;
    ctx.beginPath();ctx.arc(cx,cy,9,0,Math.PI*2);
    ctx.strokeStyle='#EF4444';ctx.lineWidth=1;ctx.globalAlpha=.25;ctx.stroke();ctx.globalAlpha=1;
  }

  // Qubit label
  if(label){
    ctx.fillStyle=color;ctx.font='bold 12px monospace';ctx.textAlign='center';
    ctx.fillText(label,cx,cy+R+18);
  }
}

// Entanglement arc between two sphere centers
function _drawEntArc(ctx,x1,y1,x2,y2,alpha,color){
  const mx=(x1+x2)/2, drop=Math.abs(x2-x1)*0.35;
  ctx.globalAlpha=alpha*.55;
  ctx.beginPath();ctx.moveTo(x1,y1);
  ctx.bezierCurveTo(x1,y1-drop,x2,y2-drop,x2,y2);
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.stroke();
  ctx.setLineDash([]);ctx.globalAlpha=1;
  // pulsing dot on arc midpoint
  const mx2=(x1+x2)/2, my2=Math.min(y1,y2)-drop*.7;
  ctx.beginPath();ctx.arc(mx2,my2,4,0,Math.PI*2);
  ctx.fillStyle=color;ctx.globalAlpha=alpha*.8;ctx.fill();ctx.globalAlpha=1;
}

// Phase indicator ring around sphere
function _drawPhaseRing(ctx,cx,cy,R,phi,color,alpha=1){
  const [ex,ey]=_proj3D(cx,cy,R*1.08,Math.cos(phi),Math.sin(phi),0);
  ctx.beginPath();ctx.arc(ex,ey,5,0,Math.PI*2);
  ctx.fillStyle=color;ctx.globalAlpha=alpha*.9;ctx.fill();ctx.globalAlpha=1;
  ctx.fillStyle=color;ctx.font="11px 'JetBrains Mono',monospace";ctx.textAlign='center';ctx.globalAlpha=alpha;
  ctx.fillText(`φ=${Math.round(phi*180/Math.PI)}°`,ex,ey+18);ctx.globalAlpha=1;
}

// Probability bar mini-chart
function _drawProbBars(ctx,bx,by,bw,bh,probs,labels,navy,txt,highlight=-1){
  const n=probs.length,gap=bw/n,bWidth=gap*.72;
  const maxP=Math.max(...probs,.01);
  probs.forEach((p,i)=>{
    const x=bx+i*gap+(gap-bWidth)/2,barH=p/maxP*bh,y=by+bh-barH;
    ctx.fillStyle=i===highlight?'#0D9488':navy;
    ctx.globalAlpha=.85+.15*(i===highlight?1:0);
    ctx.fillRect(x,y,bWidth,barH);ctx.globalAlpha=1;
    if(p>0.04){
      ctx.fillStyle=i===highlight?'#0D9488':navy;
      ctx.font=`bold 12px 'JetBrains Mono',monospace`;ctx.textAlign='center';
      ctx.fillText(Math.round(p*100)+'%',x+bWidth/2,y-4);
    }
    ctx.fillStyle=txt;ctx.font="11px 'JetBrains Mono',monospace";ctx.textAlign='center';
    ctx.fillText(labels[i],x+bWidth/2,by+bh+14);
  });
}

// Status label at bottom
function _aprevStatus(ctx,W,H,text,color){
  ctx.fillStyle=color;ctx.font="bold 13px 'JetBrains Mono',monospace";ctx.textAlign='center';
  ctx.fillText(text,W/2,H-14);
}

// ─── Bell State Animation ──────────────────────────────────────
function _animBell(cv, t) {
  const ctx=_aprevClear(cv);
  const W=cv._lw||cv.width,H=cv._lh||cv.height;
  const navy=_aprevNavy(),teal=_aprevTeal(),txt=_aprevText();
  const cycle=540, phase=(t%cycle)/cycle;

  const R=60,cy=H*.5,cx1=W*.27,cx2=W*.73;
  // Phase 0-0.15: |00⟩  → Phase 0.15-0.48: H gate on q0
  // Phase 0.48-0.75: CNOT entanglement → Phase 0.75-0.90: Bell state display → 0.90-1: reset
  let theta0=0,phi0=0,r0=1,theta1=0,phi1=0,r1=1,entA=0;
  let trail0=null,statusTxt=_algoL('初始态 |00⟩','Initial state |00⟩');

  if(phase<0.15){
    theta0=0;r0=1;theta1=0;r1=1;statusTxt=_algoL('初始态 |00⟩','Initial state |00⟩');
  } else if(phase<0.48){
    const p=_ease((phase-0.15)/0.33);
    theta0=p*Math.PI/2;phi0=0;r0=1;
    theta1=0;r1=1;
    trail0={fromTheta:0,fromPhi:0,toTheta:Math.PI/2,toPhi:0,progress:p};
    statusTxt=_algoL('H 门：q₀ 旋转 |0⟩ → |+⟩','H gate: q₀ rotates from |0⟩ to |+⟩');
  } else if(phase<0.75){
    const p=_ease((phase-0.48)/0.27);
    theta0=Math.PI/2;phi0=0;r0=1-p;
    theta1=0;r1=1-p;
    entA=p;statusTxt=_algoL('CNOT → 建立量子纠缠...','CNOT → building entanglement...');
  } else if(phase<0.90){
    const p=(phase-0.75)/0.15;
    theta0=Math.PI/2;phi0=p*Math.PI*0.8;r0=0;
    theta1=0;r1=0;
    entA=1;statusTxt=_algoL('Bell 态 (|00⟩+|11⟩)/√2  混合态球心','Bell state (|00⟩+|11⟩)/√2  mixed-state sphere center');
  } else {
    const p=_ease((phase-0.90)/0.10);
    theta0=0;r0=p;theta1=0;r1=p;entA=1-p;
    statusTxt=_algoL('重置 → 下一轮','Reset → next round');
  }

  if(entA>0) _drawEntArc(ctx,cx1,cy,cx2,cy,entA,teal);
  _drawBloch3D(ctx,cx1,cy,R,theta0,phi0,navy,'q₀',r0,trail0);
  _drawBloch3D(ctx,cx2,cy,R,theta1,phi1,navy,'q₁',r1);

  if(entA>0.1){
    ctx.fillStyle=teal;ctx.font="11px 'JetBrains Mono',monospace";ctx.textAlign='center';ctx.globalAlpha=entA;
    ctx.fillText(_algoL('纠缠对','Entangled pair'),W/2,cy-R-25);ctx.globalAlpha=1;
  }
  _aprevStatus(ctx,W,H,statusTxt,teal);
}

// ─── GHZ Animation ────────────────────────────────────────────
function _animGHZ(cv, t) {
  const ctx=_aprevClear(cv);
  const W=cv._lw||cv.width,H=cv._lh||cv.height;
  const navy=_aprevNavy(),teal=_aprevTeal(),txt=_aprevText();
  const cycle=660, phase=(t%cycle)/cycle;

  const R=46,cy=H*.50;
  const cx=[W*.18,W*.50,W*.82];
  let theta=[0,0,0],phi=[0,0,0],r=[1,1,1],ent=[0,0];
  let statusTxt=_algoL('初始态 |000⟩','Initial state |000⟩');

  if(phase<0.12){
    statusTxt=_algoL('初始态 |000⟩','Initial state |000⟩');
  } else if(phase<0.38){
    const p=_ease((phase-0.12)/0.26);
    theta[0]=p*Math.PI/2;
    statusTxt=_algoL('H 门：q₀ → |+⟩','H gate: q₀ → |+⟩');
  } else if(phase<0.60){
    const p=_ease((phase-0.38)/0.22);
    theta[0]=Math.PI/2;r[0]=1;
    r[1]=1-p;ent[0]=p;
    statusTxt=_algoL('CNOT(q₀→q₁)：纠缠传播中','CNOT(q₀→q₁): entanglement spreading');
  } else if(phase<0.80){
    const p=_ease((phase-0.60)/0.20);
    theta[0]=Math.PI/2;r[0]=1-p;r[1]=0;r[2]=1-p;
    ent[0]=1;ent[1]=p;
    statusTxt=_algoL('CNOT(q₀→q₂)：三体纠缠建立','CNOT(q₀→q₂): three-qubit entanglement established');
  } else if(phase<0.92){
    r[0]=0;r[1]=0;r[2]=0;ent[0]=1;ent[1]=1;
    statusTxt=_algoL('GHZ 态 (|000⟩+|111⟩)/√2','GHZ state (|000⟩+|111⟩)/√2');
  } else {
    const p=_ease((phase-0.92)/0.08);
    r=[p,p,p];ent=[1-p,1-p];statusTxt=_algoL('重置','Reset');
  }

  if(ent[0]>0) _drawEntArc(ctx,cx[0],cy,cx[1],cy,ent[0],teal);
  if(ent[1]>0) _drawEntArc(ctx,cx[1],cy,cx[2],cy,ent[1],teal);
  for(let i=0;i<3;i++) _drawBloch3D(ctx,cx[i],cy,R,theta[i],phi[i],navy,`q${i}`,r[i]);
  _aprevStatus(ctx,W,H,statusTxt,teal);
}

// ─── QFT Animation ────────────────────────────────────────────
function _animQFT(cv, t) {
  const ctx=_aprevClear(cv);
  const W=cv._lw||cv.width,H=cv._lh||cv.height;
  const navy=_aprevNavy(),teal=_aprevTeal(),txt=_aprevText();
  const cycle=720, phase=(t%cycle)/cycle;

  const R=46,cy=H*.50;
  const cx=[W*.18,W*.50,W*.82];
  // QFT: each qubit gets phase-encoded in equatorial plane (theta=π/2, phi varies)
  // phi_k encodes the Fourier frequency: phi_k = 2π * k * (input) / N
  const targetPhi=[0, Math.PI/2, Math.PI]; // representative phases
  let theta=[0,0,0],phi=[0,0,0],r=[1,1,1];
  let statusTxt=_algoL('初始态 |000⟩','Initial state |000⟩');

  if(phase<0.12){
    statusTxt=_algoL('输入态 |000⟩（计算基）','Input state |000⟩ (computational basis)');
  } else if(phase<0.45){
    // H gate layer: all go to equator
    const p=_ease((phase-0.12)/0.33);
    theta=[p*Math.PI/2,p*Math.PI/2,p*Math.PI/2];
    statusTxt=_algoL('H 门层：转入叠加态','Hadamard layer: move into superposition');
  } else if(phase<0.78){
    // Phase gates: phi builds up
    const p=_ease((phase-0.45)/0.33);
    theta=[Math.PI/2,Math.PI/2,Math.PI/2];
    phi=targetPhi.map(tp=>tp*p);
    statusTxt=_algoL('受控相位门：编码频率信息','Controlled phase gates: encoding frequency information');
  } else if(phase<0.92){
    theta=[Math.PI/2,Math.PI/2,Math.PI/2];
    phi=[...targetPhi];
    // Show phase dots
    statusTxt=_algoL('QFT 输出：各比特相位不同 → 频域表示','QFT output: distinct qubit phases → frequency-domain representation');
  } else {
    const p=_ease((phase-0.92)/0.08);
    theta=theta.map(()=>Math.PI/2*(1-p));phi=[0,0,0];
    statusTxt=_algoL('重置','Reset');
  }

  for(let i=0;i<3;i++){
    _drawBloch3D(ctx,cx[i],cy,R,theta[i],phi[i],navy,`q${i}`,r[i]);
    if(theta[i]>0.4&&phi[i]!==0){
      // phi label on equator
      _drawPhaseRing(ctx,cx[i],cy,R,phi[i],teal,Math.min(1,(phase-0.45)/0.15));
    }
  }
  _aprevStatus(ctx,W,H,statusTxt,teal);
}

// ─── Grover Animation ─────────────────────────────────────────
function _animGrover(cv, t) {
  const ctx=_aprevClear(cv);
  const W=cv._lw||cv.width,H=cv._lh||cv.height;
  const navy=_aprevNavy(),teal=_aprevTeal(),txt=_aprevText();
  const cycle=780, phase=(t%cycle)/cycle;

  // Left: Bloch sphere showing amplitude angle rotating toward |1⟩
  // Right: Probability bars
  const R=55,cx=W*.31,cy=H*.50;
  const N=4, targetIdx=3; // 2-qubit, target |11⟩=3
  const nIter=Math.floor(Math.PI/4*Math.sqrt(N)); // ~1 iteration for N=4
  const optTheta=Math.asin(1); // perfect probability: theta=π → |1⟩

  // Grover rotation: each iteration rotates by 2*arcsin(1/√N) in the 2D subspace
  // We show this as the Bloch sphere state rotating toward south pole (|1⟩)
  const rotStep=2*Math.asin(1/Math.sqrt(N)); // ~π/3 for N=4
  let blochTheta=Math.PI/2; // start at equator (uniform superposition)
  let iter=0;
  let statusTxt='';

  if(phase<0.15){
    blochTheta=Math.PI/2;statusTxt=_algoL('均匀叠加：H|0⟩^⊗n','Uniform superposition: H|0⟩^⊗n');
  } else if(phase<0.50){
    const p=_ease((phase-0.15)/0.35);
    const maxRot=rotStep*nIter;
    blochTheta=Math.PI/2-maxRot*p; // rotate toward |1⟩ (south)
    iter=Math.floor(p*nIter)+1;
    statusTxt=_algoL(`第 ${iter} 次 Grover 迭代`, `Grover iteration ${iter}`);
  } else if(phase<0.75){
    blochTheta=Math.PI/2-rotStep*nIter;
    statusTxt=_algoL('目标态振幅达到最大','Target-state amplitude reaches its maximum');
  } else {
    const p=_ease((phase-0.75)/0.25);
    blochTheta=Math.PI/2-rotStep*nIter*(1-p); // reset
    statusTxt=_algoL('重置','Reset');
  }

  // Bloch sphere (use phi=0: rotation in XZ plane = real Grover rotation)
  _drawBloch3D(ctx,cx,cy,R,blochTheta,0,navy,'',1);

  // Draw "target" indicator at south (|11⟩)
  const[tx,ty]=_proj3D(cx,cy,R,0,0,-1);
  ctx.beginPath();ctx.arc(tx,ty,7,0,Math.PI*2);
  ctx.strokeStyle=teal;ctx.lineWidth=2.5;ctx.globalAlpha=0.9;ctx.stroke();ctx.globalAlpha=1;
  ctx.fillStyle=teal;ctx.font="12px 'JetBrains Mono',monospace";ctx.textAlign='center';ctx.fillText(_algoL('目标','Target'),tx,ty+21);

  // Probability bars on the right
  const prob_target=Math.sin(Math.PI/2-blochTheta)**2;
  const prob_other=(1-prob_target)/3;
  const bx=W*.55,by=H*.15,bw=W*.41,bh=H*.52;
  const probs=[prob_other,prob_other,prob_other,prob_target];
  const labels=['|00⟩','|01⟩','|10⟩','|11⟩'];
  _drawProbBars(ctx,bx,by,bw,bh,probs,labels,navy,txt,targetIdx);
  ctx.fillStyle=txt;ctx.font="11px 'JetBrains Mono',monospace";ctx.textAlign='center';
  ctx.fillText(_algoL('测量概率','Measurement probability'),bx+bw/2,by-10);

  _aprevStatus(ctx,W,H,statusTxt,teal);
}

// ─── Teleportation Animation ──────────────────────────────────
function _animTeleport(cv, t) {
  const ctx=_aprevClear(cv);
  const W=cv._lw||cv.width,H=cv._lh||cv.height;
  const navy=_aprevNavy(),teal=_aprevTeal(),txt=_aprevText();
  const cycle=900, phase=(t%cycle)/cycle;

  // 3 Bloch spheres: q0 (Alice state to send), q1 (Alice entangled), q2 (Bob)
  const R=42,cy=H*.50;
  const cx=[W*.16,W*.50,W*.84];
  // q0: the state ψ to be teleported (arbitrary: theta=π/3, phi=π/4, slowly rotating)
  const psiTheta=Math.PI/3, psiPhi=Math.PI/4;
  let theta=[psiTheta,0,0],phi=[psiPhi,0,0],r=[1,1,1];
  let entA=[0,0];
  let commAlpha=0,corrAlpha=0,successAlpha=0;
  let statusTxt=_algoL('Alice 手持待传量子态 ψ','Alice holds the state ψ to be teleported');

  if(phase<0.12){
    statusTxt=_algoL('待传态 |ψ⟩ (Alice q₀)','State to teleport |ψ⟩ (Alice q₀)');
  } else if(phase<0.32){
    const p=_ease((phase-0.12)/0.20);
    r[1]=1;r[2]=1;entA[0]=p;
    statusTxt=_algoL('q₁-q₂ 建立 Bell 纠缠对（共享资源）','q₁-q₂ build a Bell pair (shared resource)');
  } else if(phase<0.55){
    // Bell measurement: q0 & q1 become mixed
    const p=_ease((phase-0.32)/0.23);
    r[0]=1-p;r[1]=1-p;r[2]=1;entA[0]=1;
    statusTxt=_algoL('Alice 对 q₀,q₁ 做 Bell 测量（波函数坍缩）','Alice performs a Bell measurement on q₀ and q₁');
  } else if(phase<0.72){
    // Classical communication
    r[0]=0;r[1]=0;r[2]=1;entA[0]=0;
    commAlpha=_ease((phase-0.55)/0.17);
    statusTxt=_algoL('经典通信：2 比特结果发给 Bob','Classical communication: send 2 bits to Bob');
  } else if(phase<0.88){
    // Bob corrects q2
    const p=_ease((phase-0.72)/0.16);
    r[0]=0;r[1]=0;commAlpha=1;
    theta[2]=_lerp(0,psiTheta,p);phi[2]=_lerp(0,psiPhi,p);r[2]=1;
    corrAlpha=p;
    statusTxt=_algoL('Bob 施加修正门：q₂ 恢复 |ψ⟩','Bob applies correction gates: q₂ recovers |ψ⟩');
  } else {
    r[0]=0;r[1]=0;commAlpha=1;corrAlpha=1;successAlpha=_ease((phase-0.88)/0.12);
    theta[2]=psiTheta;phi[2]=psiPhi;r[2]=1;
    statusTxt=_algoL('✓ 量子隐形传态完成！','✓ Quantum teleportation complete!');
  }

  // Draw entanglement arc q1-q2
  if(entA[0]>0) _drawEntArc(ctx,cx[1],cy,cx[2],cy,entA[0],teal);

  // Classical communication arrow
  if(commAlpha>0){
    const arX=_lerp(cx[0]+R,cx[2]-R,_ease(commAlpha));
    ctx.beginPath();ctx.moveTo(cx[0]+R,cy-15);ctx.lineTo(arX,cy-15);
    ctx.strokeStyle='#F59E0B';ctx.lineWidth=2;ctx.globalAlpha=commAlpha*.9;ctx.stroke();ctx.globalAlpha=1;
    if(commAlpha>0.3){
      ctx.fillStyle='#92400E';ctx.font="12px 'JetBrains Mono',monospace";ctx.textAlign='center';ctx.globalAlpha=commAlpha;
      ctx.fillText(_algoL('经典信道 2 bits','Classical channel: 2 bits'),W/2,cy-29);ctx.globalAlpha=1;
    }
  }

  for(let i=0;i<3;i++) _drawBloch3D(ctx,cx[i],cy,R,theta[i],phi[i],i===2?teal:navy,`q${i}`,r[i]);

  // Alice / Bob labels
  ctx.fillStyle=navy;ctx.font="bold 13px 'JetBrains Mono',monospace";ctx.textAlign='center';ctx.globalAlpha=.9;
  ctx.fillText('Alice',cx[1],cy+R+34);ctx.fillStyle=teal;
  ctx.fillText('Bob',cx[2],cy+R+34);ctx.globalAlpha=1;

  if(successAlpha>0){
    ctx.fillStyle=teal;ctx.font='bold 15px monospace';ctx.textAlign='center';ctx.globalAlpha=successAlpha;
    ctx.fillText(_algoL('传态成功 ✓','Teleportation successful ✓'),cx[2],cy-R-20);ctx.globalAlpha=1;
  }
  _aprevStatus(ctx,W,H,statusTxt,teal);
}

// ─── Deutsch-Jozsa Animation ──────────────────────────────────
function _animDeutsch(cv, t) {
  const ctx=_aprevClear(cv);
  const W=cv._lw||cv.width,H=cv._lh||cv.height;
  const navy=_aprevNavy(),teal=_aprevTeal(),txt=_aprevText();
  const cycle=720, phase=(t%cycle)/cycle;

  // 3 Bloch spheres: q0, q1 (input), qn (ancilla)
  const R=44,cy=H*.50;
  const cx=[W*.18,W*.50,W*.82];
  let theta=[0,0,0],phi=[0,0,0],r=[1,1,1];
  let oracleAlpha=0,statusTxt=_algoL('初始化','Initialization');

  if(phase<0.12){
    theta=[0,0,0];statusTxt=_algoL('初始态 |00⟩|1⟩','Initial state |00⟩|1⟩');
  } else if(phase<0.30){
    const p=_ease((phase-0.12)/0.18);
    theta=[0,0,Math.PI]; // ancilla → |1⟩ then H → equator south
    // qn X then H: goes to |−⟩ (south)
    theta[2]=Math.PI/2;phi[2]=Math.PI; // |−⟩ on Bloch sphere
    r[2]=1;theta[0]=0;theta[1]=0;
    statusTxt=_algoL('准备：辅助比特 |1⟩ 经 H → |−⟩','Preparation: ancilla |1⟩ goes through H → |−⟩');
  } else if(phase<0.52){
    const p=_ease((phase-0.30)/0.22);
    theta[0]=p*Math.PI/2;phi[0]=0;
    theta[1]=p*Math.PI/2;phi[1]=0;
    theta[2]=Math.PI/2;phi[2]=Math.PI;
    statusTxt=_algoL('H 门层：q₀,q₁ 进入等权叠加','Hadamard layer: q₀ and q₁ enter equal superposition');
  } else if(phase<0.72){
    const p=_ease((phase-0.52)/0.20);
    theta=[Math.PI/2,Math.PI/2,Math.PI/2];
    phi=[0,0,Math.PI];
    oracleAlpha=p;
    // Oracle flips phase of q0 (balanced case)
    phi[0]=p*Math.PI;
    statusTxt=_algoL('Oracle Uf：单次查询编码函数信息','Oracle Uf: one query encodes the function information');
  } else if(phase<0.88){
    const p=_ease((phase-0.72)/0.16);
    phi=[Math.PI,0,Math.PI];
    // H again: input qubits collapse toward poles
    theta[0]=Math.PI/2+(p*Math.PI/2); // toward |1⟩ if balanced
    theta[1]=Math.PI/2*(1-p); // toward |0⟩ if constant
    oracleAlpha=1;
    statusTxt=_algoL('H 干涉：平衡→|1⟩，常数→|0⟩','Interference after H: balanced → |1⟩, constant → |0⟩');
  } else {
    const p=_ease((phase-0.88)/0.12);
    theta=[Math.PI,Math.PI/2,Math.PI/2];phi=[0,0,Math.PI];r=[1-p*.5,1,1];
    statusTxt=_algoL('测量：1 次查询区分常数/平衡函数','Measurement: one query distinguishes constant vs balanced');
  }

  if(oracleAlpha>0){
    // Oracle box overlay
    ctx.fillStyle='#7C3AED';ctx.globalAlpha=oracleAlpha*.12;
    ctx.fillRect(cx[0]-R*.8,cy-R,cx[1]-cx[0]+R*1.6,R*2);ctx.globalAlpha=1;
    ctx.strokeStyle='#7C3AED';ctx.lineWidth=1.5;ctx.globalAlpha=oracleAlpha*.4;
    ctx.strokeRect(cx[0]-R*.8,cy-R,cx[1]-cx[0]+R*1.6,R*2);ctx.globalAlpha=1;
    ctx.fillStyle='#7C3AED';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.globalAlpha=oracleAlpha*.9;
    ctx.fillText('Oracle Uf',cx[0]+(cx[1]-cx[0])/2,cy-R-8);ctx.globalAlpha=1;
  }

  for(let i=0;i<3;i++){
    const labels=['q₀','q₁','qₙ|−⟩'];
    _drawBloch3D(ctx,cx[i],cy,R,theta[i],phi[i],navy,labels[i],r[i]);
  }
  _aprevStatus(ctx,W,H,statusTxt,teal);
}

// ─── VQE Ansatz Animation ─────────────────────────────────────
function _animVQE(cv, t) {
  const ctx=_aprevClear(cv);
  const W=cv._lw||cv.width,H=cv._lh||cv.height;
  const navy=_aprevNavy(),teal=_aprevTeal(),txt=_aprevText();
  const cycle=840, phase=(t%cycle)/cycle;

  // Left: 2 Bloch spheres (q0, q1) rotating as θ parameters change
  // Right: Energy convergence curve
  const R=46, cyB=H*.48;
  const cx0=W*.16,cx1=W*.43;
  const theta1=Math.PI/4+Math.sin(phase*Math.PI*2)*Math.PI/4;
  const theta2=Math.PI/3+Math.cos(phase*Math.PI*2)*Math.PI/5;
  const phi1=phase*Math.PI*2*.7;
  const phi2=phase*Math.PI*2*.5+Math.PI/3;

  // Bloch spheres
  const trailA={fromTheta:theta1-0.15,fromPhi:phi1-0.3,toTheta:theta1,toPhi:phi1,progress:1};
  const trailB={fromTheta:theta2-0.12,fromPhi:phi2-0.25,toTheta:theta2,toPhi:phi2,progress:1};
  _drawBloch3D(ctx,cx0,cyB,R,theta1,phi1,navy,'q₀',1,trailA);
  _drawBloch3D(ctx,cx1,cyB,R,theta2,phi2,navy,'q₁',1,trailB);
  // Entanglement (CNOT layer)
  _drawEntArc(ctx,cx0,cyB,cx1,cyB,0.6,teal);
  ctx.fillStyle=teal;ctx.font="12px 'JetBrains Mono',monospace";ctx.textAlign='center';ctx.globalAlpha=0.85;
  ctx.fillText(`θ₁=${Math.round(theta1*180/Math.PI)}°`,cx0,cyB+R+32);
  ctx.fillText(`θ₂=${Math.round(theta2*180/Math.PI)}°`,cx1,cyB+R+32);ctx.globalAlpha=1;

  // Energy convergence on the right
  const exact=-1.1372,startE=exact+0.78;
  const cxL=W*.58,cxR=W-10,cH=H*.72,cY=H*.08;
  ctx.strokeStyle=txt;ctx.lineWidth=1;ctx.globalAlpha=.2;
  ctx.beginPath();ctx.moveTo(cxL,cY);ctx.lineTo(cxL,cY+cH);ctx.lineTo(cxR,cY+cH);ctx.stroke();ctx.globalAlpha=1;
  // Exact energy line
  const exY=cY+cH*.88;
  ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(cxL,exY);ctx.lineTo(cxR,exY);
  ctx.strokeStyle=teal;ctx.lineWidth=1;ctx.globalAlpha=.7;ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
  ctx.fillStyle=teal;ctx.font="12px 'JetBrains Mono',monospace";ctx.textAlign='left';ctx.fillText('E₀=-1.1372',cxL+2,exY-5);
  // Convergence curve up to current phase
  const iters=60;
  ctx.beginPath();
  for(let i=0;i<=Math.floor(phase*iters);i++){
    const pp=i/iters;
    const e=startE+(exact-startE)*(1-Math.exp(-6*pp))+.02*Math.sin(pp*18)*(1-pp);
    const px=cxL+(i/iters)*(cxR-cxL);
    const py=cY+(startE-e)/(startE-exact)*cH*.85;
    i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
  }
  ctx.strokeStyle=navy;ctx.lineWidth=2;ctx.stroke();
  // Current energy dot
  {
    const pp=phase,e=startE+(exact-startE)*(1-Math.exp(-6*pp));
    const px=cxL+phase*(cxR-cxL);
    const py=cY+(startE-e)/(startE-exact)*cH*.85;
    ctx.beginPath();ctx.arc(px,py,4,0,Math.PI*2);ctx.fillStyle=navy;ctx.fill();
    ctx.fillStyle=navy;ctx.font="bold 10px 'JetBrains Mono',monospace";ctx.textAlign='left';
    ctx.fillText(e.toFixed(4)+' Ha',px+7,py+3);
  }
  ctx.fillStyle=txt;ctx.font="13px 'JetBrains Mono',monospace";ctx.textAlign='center';ctx.fillText(_algoL('能量收敛','Energy convergence'),cxL+(cxR-cxL)/2,cY+10);

  const iterNum=Math.floor(phase*iters);
  _aprevStatus(ctx,W,H,_algoL(`VQE 优化迭代中 (iter ${iterNum}/${iters})  COBYLA`, `VQE optimization running (iter ${iterNum}/${iters})  COBYLA`),teal);
}

// ─── Phase Kickback Animation ─────────────────────────────────
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAlgoPreview(); });

function _animPhaseKick(cv, t) {
  const ctx=_aprevClear(cv);
  const W=cv._lw||cv.width,H=cv._lh||cv.height;
  const navy=_aprevNavy(),teal=_aprevTeal(),txt=_aprevText();
  const cycle=660, phase=(t%cycle)/cycle;

  // 2 Bloch spheres: q0 (control), q1 (ancilla |−⟩)
  const R=55,cy=H*.50;
  const cx0=W*.28,cx1=W*.72;
  let theta0=0,phi0=0,r0=1,theta1=Math.PI/2,phi1=Math.PI,r1=1;
  let kickAlpha=0,statusTxt='';

  if(phase<0.15){
    theta0=0;statusTxt=_algoL('初始态 q₀=|0⟩, q₁=|1⟩','Initial state q₀=|0⟩, q₁=|1⟩');
  } else if(phase<0.38){
    const p=_ease((phase-0.15)/0.23);
    theta0=p*Math.PI/2;phi0=0; // q0 H→|+⟩
    statusTxt=_algoL('H 门：q₀ → |+⟩，q₁ → |−⟩','H gate: q₀ → |+⟩, q₁ → |−⟩');
  } else if(phase<0.62){
    const p=_ease((phase-0.38)/0.24);
    theta0=Math.PI/2;
    // T gate on q1, then controlled: phase kicks back to q0's phi
    phi0=p*Math.PI/4; // phase π/4 kicked back to control
    kickAlpha=p;
    statusTxt=_algoL('T 门相位 e^{iπ/4} → 反冲至控制比特 q₀','T-gate phase e^{iπ/4} kicks back onto control qubit q₀');
  } else if(phase<0.82){
    const p=_ease((phase-0.62)/0.20);
    theta0=Math.PI/2;phi0=Math.PI/4;
    theta0=Math.PI/2*(1-p); // H gate: collapse
    kickAlpha=1;
    statusTxt=_algoL('H 门干涉：读出相位信息','Hadamard interference: read out the phase information');
  } else {
    const p=_ease((phase-0.82)/0.18);
    theta0=0;phi0=_lerp(Math.PI/4,0,p);kickAlpha=1-p;
    statusTxt=_algoL('相位反冲：量子并行计算的核心机制','Phase kickback: a core mechanism of quantum parallel computation');
  }

  _drawBloch3D(ctx,cx0,cy,R,theta0,phi0,navy,_algoL('q₀ 控制','q₀ control'),r0);
  _drawBloch3D(ctx,cx1,cy,R,theta1,phi1,teal,'q₁ |−⟩',r1);

  if(kickAlpha>0){
    // Phase kickback arrow
    const[ax,ay]=_proj3D(cx1,cy,R,0,0,0.5);
    const[bx,by]=_proj3D(cx0,cy,R,0,0,-0.3);
    ctx.beginPath();
    ctx.moveTo(ax,ay);
    ctx.bezierCurveTo(ax-40,ay-50,bx+40,by-50,bx,by);
    ctx.strokeStyle=teal;ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.globalAlpha=kickAlpha*.7;ctx.stroke();
    ctx.setLineDash([]);ctx.globalAlpha=1;
    ctx.fillStyle=teal;ctx.font="bold 13px 'JetBrains Mono',monospace";ctx.textAlign='center';ctx.globalAlpha=kickAlpha;
    ctx.fillText(_algoL('← 相位反冲 e^{iπ/4}','← phase kickback e^{iπ/4}'),W/2,cy-R-20);ctx.globalAlpha=1;
  }
  _aprevStatus(ctx,W,H,statusTxt,teal);
}



function refreshAlgoI18n() {
  renderAlgoLib();
  const overlay = document.getElementById('aprev-overlay');
  if (_aprevId && overlay && overlay.classList.contains('on')) {
    const a = ALGO_LIB.find(x => x.id === _aprevId);
    const info = _algoPreviewView(_aprevId);
    if (a && info) {
      const v = _algoView(a);
      document.getElementById('aprev-name').textContent = v.name;
      document.getElementById('aprev-zh').textContent = v.subtitle;
      const db = document.getElementById('aprev-diff');
      if (db) db.textContent = v.diff;
      const desc = document.getElementById('aprev-desc');
      if (desc) desc.textContent = v.desc;
      const adv = document.getElementById('aprev-adv');
      if (adv) adv.textContent = info.adv;
      const steps = document.getElementById('aprev-steps');
      if (steps) steps.innerHTML = info.steps.map((step, i) => `<div class="aprev-step"><div class="aprev-step-num">${i+1}</div><div>${step}</div></div>`).join('');
      const playBtn = document.getElementById('aprev-play-btn');
      if (playBtn) playBtn.textContent = _aprevRunning ? _algoL('⏸ 暂停', '⏸ Pause') : _algoL('▶ 继续', '▶ Resume');
      const resetBtn = document.getElementById('aprev-reset-btn');
      if (resetBtn) resetBtn.textContent = _algoL('↻ 重播', '↻ Replay');
      const loadBtn = document.getElementById('aprev-load-btn');
      if (loadBtn) loadBtn.textContent = _algoL('加载到编辑器', 'Load into editor');
    }
  }
}
window.refreshAlgoI18n = refreshAlgoI18n;
