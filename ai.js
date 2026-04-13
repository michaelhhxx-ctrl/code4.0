// ── AI TUTOR ──

function _aiL(zh, en) { return window._currentLang === 'en' ? en : zh; }

// 版本计数器：快速连续操作时，旧请求的回调静默丢弃
let _explainVersion = 0;
// 当前打字指示器引用，新请求开始时先移除旧的，防止多个指示器堆叠
let _currentTypdiv = null;

// ── AI 线路优化专用状态 ──
let _optimizeVersion = 0;    // 版本锁：并发请求时只处理最新一次的结果
let _pendingSnapshot = null; // 快照：记录请求发出时的电路状态，apply 时比对
let _lastOptimizeTime = 0;   // 冷却：防止3秒内重复发起优化请求

function explainGateAction(g, q, s, action) {
  if (window._isLoadingPreset) return;

  // 移除上一个尚未完成的打字指示器
  if (_currentTypdiv) { _currentTypdiv.remove(); _currentTypdiv = null; }

  const ver = ++_explainVersion;

  const aim = document.getElementById('aim');
  if (!aim) return;
  const typdiv = document.createElement('div');
  typdiv.className = 'msg mai';
  typdiv.innerHTML = '<div class="mav">AI</div><div class="aityp"><span></span><span></span><span></span></div>';
  aim.appendChild(typdiv);
  _currentTypdiv = typdiv;
  aim.scrollTop = aim.scrollHeight;
  setMascotThinking(true);

  let totalGates = 0;
  S.circ.forEach(row => row.forEach(cell => { if (cell && cell.role !== 'tgt') totalGates++; }));

  const circCtx = {
    gates: S.circ.map((row, qi) => row.map((cell, si) => cell ? { qubit: qi, step: si, ...cell } : null).filter(Boolean)).flat(),
    n_qubits: S.qubits,
    last_gate: g
  };

  const prompt = action === 'placed'
    ? _aiL(
        `我刚在第 ${s} 步的 q${q} 上放置了一个 ${g} 门。当前线路共 ${S.qubits} 个量子比特、${totalGates} 个门。请简要解释：①这个门的量子力学含义；②它对当前整体线路的影响。`,
        `I just placed a ${g} gate on qubit q${q} at step ${s}. The circuit now has ${S.qubits} qubits and ${totalGates} gates total. Please briefly explain: (1) what this gate does quantum-mechanically; (2) how it affects the overall circuit built so far.`
      )
    : _aiL(
        `我刚删除了第 ${s} 步 q${q} 上的 ${g} 门。当前线路共 ${S.qubits} 个量子比特、${totalGates} 个门。请简要解释：①这个门原本的量子力学作用；②删除它对整体线路的影响。`,
        `I just removed the ${g} gate from qubit q${q} at step ${s}. The circuit now has ${S.qubits} qubits and ${totalGates} gates remaining. Please briefly explain: (1) what role this gate had; (2) how removing it changes the overall circuit.`
      );

  let gotChunk = false, aiDiv = null;
  API.aiTutor(prompt, circCtx,
    chunk => {
      if (ver !== _explainVersion) return;
      if (!gotChunk) {
        typdiv.remove(); _currentTypdiv = null;
        aiDiv = document.createElement('div'); aiDiv.className = 'msg mai';
        aiDiv.innerHTML = '<div class="mav">AI</div><div class="mbody"></div>';
        aim.appendChild(aiDiv); gotChunk = true;
      }
      const body = aiDiv.querySelector('.mbody');
      if (body) body.innerHTML = sanitizeAIHtml(body.innerHTML + chunk);
      aim.scrollTop = aim.scrollHeight;
    },
    () => {}
  ).then(ok => {
    if (ver !== _explainVersion) return;
    if (!ok || !gotChunk) {
      typdiv.remove(); _currentTypdiv = null;
      addMsg(_aiL('AI 解释暂时不可用，请稍后重试。', 'AI explanation temporarily unavailable — please try again.'));
    }
    setMascotThinking(false, ok && gotChunk);
  });
}

function onGateRemoved(g, q, s) {
  explainGateAction(g, q, s, 'removed');
}

function sanitizeAIHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\bon\w+\s*=/gi, 'data-removed=')
    .replace(/javascript\s*:/gi, '');
}

function addMsg(html, isUser = false) {
  const msgs = document.getElementById('aim');
  if (!msgs) return;
  const d = document.createElement('div'); d.className = `msg ${isUser ? 'mur' : 'mai'}`;
  const safeContent = isUser ? escHtml(html) : sanitizeAIHtml(html);
  d.innerHTML = `<div class="mav">${isUser ? 'U' : 'AI'}</div><div class="mbody">${safeContent}</div>`;
  msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
}

async function sendAI() {
  const inp = document.getElementById('aiinp');
  if (!inp) return;
  const txt = inp.value.trim(); if (!txt) return;
  addMsg(txt, true); inp.value = '';

  const btn = document.getElementById('aisnd');
  if (btn) { btn.disabled = true; btn.classList.add('ai-sending'); }
  inp.disabled = true;

  const typdiv = document.createElement('div'); typdiv.className = 'msg mai';
  typdiv.innerHTML = '<div class="mav">AI</div><div class="aityp"><span></span><span></span><span></span></div>';
  const aim = document.getElementById('aim');
  if (!aim) { if (btn) { btn.disabled = false; btn.classList.remove('ai-sending'); } inp.disabled = false; return; }
  aim.appendChild(typdiv); aim.scrollTop = aim.scrollHeight;
  setMascotThinking(true);

  const circCtx = {
    gates: S.circ.map((row, q) => row.map((g, s) => g ? { qubit: q, step: s, ...g } : null).filter(Boolean)).flat(),
    n_qubits: S.qubits,
    last_gate: (() => { let l = null; S.circ[S.selQ].forEach(g => { if (g && g.role !== 'tgt') l = g.g; }); return l; })()
  };

  let gotChunk = false, aiDiv = null, ok = false;
  try {
    ok = await API.aiTutor(txt, circCtx,
      chunk => {
        if (!gotChunk) {
          typdiv.remove();
          aiDiv = document.createElement('div'); aiDiv.className = 'msg mai';
          aiDiv.innerHTML = '<div class="mav">AI</div><div class="mbody"></div>';
          aim.appendChild(aiDiv); gotChunk = true;
        }
        const body = aiDiv.querySelector('.mbody');
        if (body) body.innerHTML = sanitizeAIHtml(body.innerHTML + chunk);
        aim.scrollTop = aim.scrollHeight;
      },
      () => {}
    );
    if (!ok || !gotChunk) { typdiv.remove(); addMsg(_aiL('AI 暂时不可用，请稍后重试。', 'AI temporarily unavailable — please try again.')); }
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('ai-sending'); }
    inp.disabled = false;
    setMascotThinking(false, ok && gotChunk);
  }
}

function quickAsk(q) {
  const qMap = {
    '这个门的物理意义？': 'What is the physical meaning of this gate?',
    '当前线路如何优化？': 'How can I optimize the current circuit?',
    '什么是量子纠缠？': 'What is quantum entanglement?',
    '解释 Bloch 球': 'Explain the Bloch sphere',
    '当前整体线路有哪些潜在问题或优化建议？': 'What are the potential issues or optimization suggestions for the current circuit?'
  };
  const qs = (window._currentLang === 'en' && qMap[q]) ? qMap[q] : q;
  document.getElementById('aiinp').value = qs; sendAI();
}

// ── 课程模式判断（course.js 加载后会以同签名覆盖此函数，两者保持一致）──
function inCourseMode() {
  try { return JSON.parse(localStorage.getItem('qedu_cstate') || '{}').mode === true; }
  catch(e) { return false; }
}

// ── 课程模式主动 AI 解析气泡 ──
// 并发安全：流式输出或打字指示器进行中直接放弃，避免串号
async function proactiveAIMessage(prompt) {
  if (!inCourseMode()) return;

  // 锁1：sendAI 正在流式输出（inp 被禁用）
  const inp = document.getElementById('aiinp');
  if (inp && inp.disabled) return;
  // 锁2：explainGateAction 打字指示器正在显示
  if (_currentTypdiv) return;

  const aim = document.getElementById('aim');
  if (!aim) return;

  // 插入「💡 自动解析」标识气泡
  const hdr = document.createElement('div');
  hdr.className = 'msg mai';
  hdr.innerHTML =
    '<div class="mav">AI</div>' +
    '<div class="mbody" style="display:flex;align-items:center;gap:7px;">' +
    '<span style="font-size:10px;background:rgba(99,179,237,.18);color:#63b3ed;' +
    'border:1px solid rgba(99,179,237,.35);border-radius:4px;padding:2px 8px;' +
    'font-weight:700;letter-spacing:.5px;flex-shrink:0;">💡 自动解析</span>' +
    '<span style="font-size:12px;color:rgba(226,232,240,.5);">AI 正在解析当前操作…</span>' +
    '</div>';
  aim.appendChild(hdr);
  aim.scrollTop = aim.scrollHeight;

  // 打字指示器 + 锁定输入
  const typdiv = document.createElement('div');
  typdiv.className = 'msg mai';
  typdiv.innerHTML = '<div class="mav">AI</div><div class="aityp"><span></span><span></span><span></span></div>';
  aim.appendChild(typdiv);
  aim.scrollTop = aim.scrollHeight;

  const btn = document.getElementById('aisnd');
  if (btn) { btn.disabled = true; btn.classList.add('ai-sending'); }
  if (inp) inp.disabled = true;
  setMascotThinking(true);

  // 构建与 sendAI 一致的线路上下文
  const circCtx = {
    gates: S.circ.map((row, qi) => row.map((g, si) => g ? { qubit: qi, step: si, ...g } : null).filter(Boolean)).flat(),
    n_qubits: S.qubits,
    last_gate: (() => { let l = null; S.circ[S.selQ].forEach(g => { if (g && g.role !== 'tgt') l = g.g; }); return l; })()
  };

  let gotChunk = false, aiDiv = null, ok = false;
  try {
    ok = await API.aiTutor(prompt, circCtx,
      chunk => {
        if (!gotChunk) {
          typdiv.remove();
          aiDiv = document.createElement('div'); aiDiv.className = 'msg mai';
          aiDiv.innerHTML = '<div class="mav">AI</div><div class="mbody"></div>';
          aim.appendChild(aiDiv); gotChunk = true;
        }
        const body = aiDiv.querySelector('.mbody');
        if (body) body.innerHTML = sanitizeAIHtml(body.innerHTML + chunk);
        aim.scrollTop = aim.scrollHeight;
      },
      () => {}
    );
    if (!ok || !gotChunk) { typdiv.remove(); addMsg(_aiL('AI 暂时不可用，请稍后重试。', 'AI temporarily unavailable.')); }
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('ai-sending'); }
    if (inp) inp.disabled = false;
    setMascotThinking(false, ok && gotChunk);
  }
}

// ── AI 线路优化（可执行建议）──

function countGates(circ) {
  let n = 0;
  circ.forEach(row => row.forEach(cell => {
    if (cell && cell.role !== 'tgt') n++;
  }));
  return n;
}

function isSafeChanges(changes, circ) {
  const removeCount = changes.filter(ch => ch.op === 'remove').length;
  const total = countGates(circ);
  if (total === 0) return true;            // 空电路不阻止
  return removeCount <= total * 0.4;       // remove 超过 40% 则拒绝
}

let _pendingAction = null;

function validateChanges(changes) {
  if (!Array.isArray(changes) || changes.length === 0) return false;
  let valid = 0;
  for (const ch of changes) {
    const q = ch.qubit, s = ch.step;
    if (typeof q !== 'number' || typeof s !== 'number') continue;
    if (q < 0 || q >= S.qubits || s < 0 || s >= S.steps) continue;
    if (!['remove', 'add', 'set_param'].includes(ch.op)) continue;
    if (ch.op === 'add' && !ch.g) continue;
    valid++;
  }
  return valid > 0;
}

function applyChangesToCirc(changes) {
  for (const ch of changes) {
    const q = ch.qubit, s = ch.step;
    if (typeof q !== 'number' || typeof s !== 'number') continue;
    if (q < 0 || q >= S.qubits || s < 0 || s >= S.steps) continue;
    if (ch.op === 'remove') {
      const gate = S.circ[q] && S.circ[q][s];
      if (!gate) continue;
      if (typeof TWO_QUBIT_GATES !== 'undefined' && TWO_QUBIT_GATES.includes(gate.g) && gate.role) {
        const partnerQ = gate.role === 'ctrl' ? gate.tgt : gate.ctrl;
        if (typeof partnerQ === 'number' && S.circ[partnerQ] && S.circ[partnerQ][s]) {
          S.circ[partnerQ][s] = null;
        }
      }
      S.circ[q][s] = null;
    } else if (ch.op === 'add') {
      if (!ch.g || (S.circ[q] && S.circ[q][s])) continue;
      const isRot = ['Rx', 'Ry', 'Rz'].includes(ch.g);
      S.circ[q][s] = { g: ch.g, p: isRot ? (typeof ch.p === 'number' ? ch.p : 90) : null };
    } else if (ch.op === 'set_param') {
      if (S.circ[q] && S.circ[q][s] && typeof ch.p === 'number') {
        S.circ[q][s].p = ch.p;
      }
    }
  }
}

async function aiOptimizeCircuit() {
  if (!window._backendConnected) {
    addMsg(_aiL('需要连接后端才能使用 AI 优化功能。', 'Backend connection required for AI optimization.'));
    return;
  }

  // ── 冷却检查（在 dismissAiOptConfirm 之前返回，不破坏已有 pending action）──
  const now = Date.now();
  if (now - _lastOptimizeTime < 3000) {
    addMsg(_aiL('请稍等片刻再次优化', 'Please wait a moment before re-optimizing'));
    return;
  }
  _lastOptimizeTime = now;

  // ── 版本递增 + 快照（必须在 API 调用前捕获此时电路状态）──
  const ver = ++_optimizeVersion;
  const snapshot = JSON.stringify(S.circ);

  dismissAiOptConfirm();  // 清除旧 pending（版本号和快照已确定后再清）

  const aim = document.getElementById('aim');
  if (!aim) return;
  const typdiv = document.createElement('div');
  typdiv.className = 'msg mai';
  typdiv.innerHTML = '<div class="mav">AI</div><div class="aityp"><span></span><span></span><span></span></div>';
  aim.appendChild(typdiv);
  aim.scrollTop = aim.scrollHeight;
  setMascotThinking(true);

  // 刷新 validation 面板，但不将 errors 传给 AI（防止 AI 以删除门来"修复"验证提示）
  if (typeof refreshCircuitValidation === 'function') refreshCircuitValidation();
  const result = await API.aiOptimize(S.circ, S.qubits, null, null);

  // ── 版本检查：若期间有更新的请求，丢弃本次过期结果，不改变 mascot 状态 ──
  if (ver !== _optimizeVersion) {
    typdiv.remove();
    return;
  }

  typdiv.remove();
  setMascotThinking(false, !!result);

  if (!result) {
    addMsg(_aiL('AI 优化服务暂时不可用，请稍后重试。', 'AI optimization unavailable — please try again.'));
    return;
  }

  addMsg(result.answer);

  const action = result.proposed_action;
  if (action && Array.isArray(action.changes) && action.changes.length > 0) {
    _pendingAction = action;
    _pendingSnapshot = snapshot;  // 与 action 一起保存，apply 时用于电路比对
    _showAiOptConfirm(action.changes.length);
  }
}

function _showAiOptConfirm(changeCount) {
  // 只移除旧的 DOM 元素，不清除 _pendingAction
  const existing = document.getElementById('ai-opt-confirm');
  if (existing) existing.remove();

  const aim = document.getElementById('aim');
  if (!aim) return;
  const d = document.createElement('div');
  d.id = 'ai-opt-confirm';
  d.className = 'ai-opt-confirm-bar';
  const label = _aiL(
    `AI 建议 ${changeCount} 处修改，是否应用到线路？`,
    `AI suggests ${changeCount} change(s) — apply to circuit?`
  );
  d.innerHTML =
    `<span class="ai-opt-label">${label}</span>` +
    `<button class="aq-console-btn aq-console-btn-primary ai-opt-apply" onclick="confirmAiOptimize()">` +
      _aiL('应用', 'Apply') +
    `</button>` +
    `<button class="aq-console-btn ai-opt-cancel" onclick="dismissAiOptConfirm()">` +
      _aiL('取消', 'Cancel') +
    `</button>`;
  aim.appendChild(d);
  aim.scrollTop = aim.scrollHeight;
}

function confirmAiOptimize() {
  if (!_pendingAction) return;

  // 守卫1：快照检查——电路须与 AI 分析时一致，否则建议已过期
  if (_pendingSnapshot !== null && JSON.stringify(S.circ) !== _pendingSnapshot) {
    addMsg(_aiL('电路已发生变化，请重新发起优化。', 'Circuit has changed — please re-optimize.'));
    dismissAiOptConfirm();
    return;
  }

  // 守卫2：坐标合法性检查（原有逻辑保留）
  if (!validateChanges(_pendingAction.changes)) {
    addMsg(_aiL('AI 建议的操作超出当前线路范围，已取消。', 'AI-suggested changes are out of bounds — cancelled.'));
    dismissAiOptConfirm();
    return;
  }

  // 守卫3：删除比例安全检查
  // 确定性结果（source==='deterministic'）由代码生成，100% 可信，跳过此守卫
  // AI 结果仍然执行 40% 阈值检查
  const isDeterministic = _pendingAction.source === 'deterministic';
  if (!isDeterministic && !isSafeChanges(_pendingAction.changes, S.circ)) {
    addMsg(_aiL('AI 建议删除门过多，已阻止以保护线路。', 'AI suggested removing too many gates — blocked to protect circuit.'));
    dismissAiOptConfirm();
    return;
  }

  // 记录应用前门数，用于回滚判断
  const beforeCount = countGates(S.circ);
  saveHist();
  applyChangesToCirc(_pendingAction.changes);
  const afterCount = countGates(S.circ);

  // 守卫4：回滚兜底——门数下降超 50% 视为异常，撤销并清除 redo 栈
  // 确定性结果同样跳过：代码生成的删除（如全部为 H-H 对）是完全正确的
  if (!isDeterministic && beforeCount > 0 && afterCount < beforeCount * 0.5) {
    undo();
    S.redoHist = [];  // 防止 Ctrl+Y 重做回损坏的电路
    addMsg(_aiL('AI 优化导致门数减少过多，已自动回滚。', 'AI optimization removed too many gates — auto-rolled back.'));
    dismissAiOptConfirm();
    return;
  }

  renderCirc();
  updateStats();
  dismissAiOptConfirm();
  setSBMsg(_aiL('AI 优化已应用 · 可用撤销（Ctrl+Z）回退', 'AI optimization applied · Ctrl+Z to undo'));
}

function dismissAiOptConfirm() {
  _pendingAction = null;
  _pendingSnapshot = null;  // 同步清除快照，与 _pendingAction 始终保持一致
  const d = document.getElementById('ai-opt-confirm');
  if (d) d.remove();
}
