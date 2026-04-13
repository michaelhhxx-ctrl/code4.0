// ── 量子计算知识点自测系统 (quiz.js) ──

// 注入样式
(function _injectQuizCSS() {
  if (document.getElementById('quiz-style')) return;
  const s = document.createElement('style');
  s.id = 'quiz-style';
  s.textContent = `
#quiz-overlay { display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2000;align-items:center;justify-content:center; }
.quiz-box { background:var(--white);border-radius:12px;padding:24px 28px;max-width:520px;width:92%;box-shadow:0 8px 40px rgba(0,0,0,.22);font-family:var(--sans); }
.quiz-hd { display:flex;align-items:center;gap:8px;margin-bottom:12px; }
.quiz-title { font-size:15px;font-weight:700;color:var(--navy); }
.quiz-progress { font-size:12px;color:var(--t5);font-family:var(--mono);margin-left:8px; }
.quiz-module-tag { font-size:11px;color:var(--teal);font-family:var(--mono);margin-bottom:10px;background:rgba(39,103,73,.08);border-radius:20px;display:inline-block;padding:2px 10px; }
.quiz-question { font-size:14px;font-weight:600;color:var(--t9);line-height:1.7;margin-bottom:14px; }
.quiz-opts { display:flex;flex-direction:column;gap:8px; }
.quiz-opt { display:flex;align-items:center;gap:10px;padding:9px 14px;border:1.5px solid var(--b1);border-radius:8px;background:var(--surf);cursor:pointer;font-size:13px;color:var(--t7);text-align:left;transition:border-color .15s,background .15s; }
.quiz-opt:hover:not(:disabled) { border-color:var(--navy);background:var(--navy-lt); }
.quiz-opt-letter { font-weight:700;color:var(--navy);font-family:var(--mono);min-width:18px; }
.quiz-opt.quiz-opt-correct { border-color:#276749;background:rgba(39,103,73,.08);color:#276749; }
.quiz-opt.quiz-opt-wrong { border-color:#dc2626;background:rgba(220,38,38,.06);color:#dc2626; }
.quiz-next-btn { margin-top:4px;padding:8px 22px;background:var(--navy);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:opacity .15s; }
.quiz-next-btn:hover { opacity:.85; }
.quiz-nav { display:flex;justify-content:flex-end;margin-top:12px; }
`;
  document.head.appendChild(s);
})();

// ── 题库（10题，覆盖4个模块） ──
const QUIZ_BANK = [
  { id:1, module:'线路编辑器', kp:'量子叠加态',
    q:'H门作用在|0⟩上，得到的量子态是？',
    opts:['|0⟩','|1⟩','(|0⟩+|1⟩)/√2','(|0⟩-|1⟩)/√2'],
    ans:2, exp:'H门是Hadamard门，将|0⟩变为等权叠加态(|0⟩+|1⟩)/√2，在Bloch球上对应绕X+Z轴旋转180°到赤道。' },

  { id:2, module:'线路编辑器', kp:'量子纠缠',
    q:'Bell态|Φ⁺⟩=(|00⟩+|11⟩)/√2 是通过哪两个门的组合制备的？',
    opts:['X门 + Z门','H门 + CNOT门','CNOT门 + H门','Ry门 + Rz门'],
    ans:1, exp:'Bell态制备：H门作用在q₀产生叠加态，CNOT门以q₀为控制位作用在q₁，产生最大纠缠态(|00⟩+|11⟩)/√2。' },

  { id:3, module:'线路编辑器', kp:'Bloch球',
    q:'在Bloch球上，|0⟩态对应的位置是？',
    opts:['南极（-z）','赤道上一点','北极（+z）','球心'],
    ans:2, exp:'Bloch球规定：北极(+z方向)对应|0⟩基态，南极(-z方向)对应|1⟩基态，赤道上的点对应等权叠加态。' },

  { id:4, module:'线路编辑器', kp:'量子测量',
    q:'对处于叠加态(|0⟩+|1⟩)/√2的量子比特进行测量，得到|0⟩的概率是？',
    opts:['0%','25%','50%','100%'],
    ans:2, exp:'叠加态(|0⟩+|1⟩)/√2中，|0⟩的系数α=1/√2，P(0)=|α|²=1/2=50%。测量后量子态坍缩为确定态。' },

  { id:5, module:'线路编辑器', kp:'CNOT门',
    q:'CNOT门作用在|10⟩（控制位q₀=1，目标位q₁=0）上，结果是？',
    opts:['|10⟩','|11⟩','|00⟩','|01⟩'],
    ans:1, exp:'CNOT门：当控制位为|1⟩时，对目标位执行X（翻转）操作。|10⟩→|11⟩（目标位0翻转为1）。' },

  { id:6, module:'VQE实验', kp:'变分原理',
    q:'VQE算法基于的核心物理原理是？',
    opts:['不确定性原理','变分原理（任意量子态能量≥基态能量）','叠加原理','量子纠缠'],
    ans:1, exp:'变分原理：对任意归一化量子态|ψ⟩，期望能量⟨ψ|H|ψ⟩ ≥ E₀（基态能量）。VQE通过最小化期望能量来近似基态。' },

  { id:7, module:'VQE实验', kp:'Ansatz线路',
    q:'VQE中的"Ansatz"是指什么？',
    opts:['一种优化器','参数化的量子试验态线路','哈密顿量的本征值','测量基的选择'],
    ans:1, exp:'Ansatz（德语"尝试"）是VQE中用于近似基态波函数的参数化量子线路，其参数通过经典优化器调节以最小化能量。' },

  { id:8, module:'VQE实验', kp:'Barren Plateau',
    q:'VQE中出现"Barren Plateau（贫瘠高原）"现象时，以下哪个描述正确？',
    opts:['能量收敛到精确值','梯度呈指数衰减，优化停滞','优化速度加快','线路深度不够'],
    ans:1, exp:'Barren Plateau是深度参数化量子线路中出现的梯度消失问题：梯度方差随比特数指数下降，导致无法有效优化。Q-Edu会在检测到时给出警告。' },

  { id:9, module:'QAOA实验', kp:'Max-Cut问题',
    q:'Max-Cut问题的目标是？',
    opts:['找到图中最短路径','将图的节点分成两组，使两组之间的边数最多','找到图中最大团','最小化图的着色数'],
    ans:1, exp:'Max-Cut：将图G=(V,E)的节点集V分为两个子集S和V-S，使得跨越两组的边（割集）数量最多。这是一个NP-hard组合优化问题。' },

  { id:10, module:'QAOA实验', kp:'近似比',
    q:'QAOA p=1时，对任意图的理论近似比下界是多少？',
    opts:['0.5','0.6924','0.75','1.0'],
    ans:1, exp:'Farhi等人证明，QAOA p=1对任意Max-Cut问题的近似比保证 r ≥ 0.6924。随着层数p增大，近似比趋近于1（最优解）。' },
];

function getQuizQuestions(n, module) {
  let pool = module ? QUIZ_BANK.filter(q => q.module === module) : QUIZ_BANK;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n || 5, shuffled.length));
}

let _quizQuestions = [], _quizCurrent = 0, _quizScore = 0, _quizAnswered = false;

function openQuiz(module) {
  _quizQuestions = getQuizQuestions(5, module || null);
  _quizCurrent = 0; _quizScore = 0;
  _renderQuiz();
  document.getElementById('quiz-overlay').style.display = 'flex';
}
function closeQuiz() {
  document.getElementById('quiz-overlay').style.display = 'none';
}

function _renderQuiz() {
  const overlay = document.getElementById('quiz-overlay');
  if (!overlay) return;
  const q = _quizQuestions[_quizCurrent];
  if (!q) { _renderQuizResult(); return; }
  _quizAnswered = false;
  overlay.innerHTML = `
    <div class="quiz-box">
      <div class="quiz-hd">
        <span class="quiz-title">📝 知识点自测</span>
        <span class="quiz-progress">${_quizCurrent + 1} / ${_quizQuestions.length}</span>
        <span onclick="closeQuiz()" style="cursor:pointer;color:var(--t3);font-size:18px;margin-left:auto">✕</span>
      </div>
      <div class="quiz-module-tag">${q.module} · ${q.kp}</div>
      <div class="quiz-question">${q.q}</div>
      <div class="quiz-opts">
        ${q.opts.map((opt, i) => `
          <button class="quiz-opt" onclick="_quizAnswer(${i})" data-idx="${i}">
            <span class="quiz-opt-letter">${'ABCD'[i]}</span>${opt}
          </button>`).join('')}
      </div>
      <div class="quiz-exp" id="quiz-exp" style="display:none"></div>
      <div class="quiz-nav" style="display:none" id="quiz-nav">
        <button class="quiz-next-btn" onclick="_quizNext()">
          ${_quizCurrent + 1 < _quizQuestions.length ? '下一题 →' : '查看结果'}
        </button>
      </div>
    </div>`;
}

function _quizAnswer(idx) {
  if (_quizAnswered) return;
  _quizAnswered = true;
  const q = _quizQuestions[_quizCurrent];
  const correct = idx === q.ans;
  if (correct) _quizScore++;
  document.querySelectorAll('.quiz-opt').forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.ans) btn.classList.add('quiz-opt-correct');
    else if (i === idx && !correct) btn.classList.add('quiz-opt-wrong');
  });
  const expEl = document.getElementById('quiz-exp');
  if (expEl) {
    expEl.style.display = 'block';
    expEl.style.cssText += ';background:var(--surf);border-radius:6px;padding:8px 12px;margin-top:10px;font-size:12px;line-height:1.7';
    expEl.style.color = correct ? 'var(--teal)' : '#dc2626';
    expEl.innerHTML = (correct ? '✅ 正确！' : '❌ 错误。') + '&nbsp;&nbsp;' + q.exp;
  }
  const navEl = document.getElementById('quiz-nav');
  if (navEl) navEl.style.display = 'flex';
}

function _quizNext() {
  _quizCurrent++;
  _renderQuiz();
}

function _renderQuizResult() {
  const overlay = document.getElementById('quiz-overlay');
  const pct = Math.round(_quizScore / _quizQuestions.length * 100);
  const grade = pct >= 90 ? '优秀 🏆' : pct >= 70 ? '良好 👍' : pct >= 60 ? '及格 📚' : '需加强 💪';
  overlay.innerHTML = `
    <div class="quiz-box">
      <div class="quiz-hd">
        <span class="quiz-title">📝 测验结果</span>
        <span onclick="closeQuiz()" style="cursor:pointer;color:var(--t3);font-size:18px;margin-left:auto">✕</span>
      </div>
      <div style="text-align:center;padding:20px 10px">
        <div style="font-size:48px;font-weight:700;color:var(--navy)">${_quizScore}<span style="font-size:24px;color:var(--t5)"> / ${_quizQuestions.length}</span></div>
        <div style="font-size:20px;margin:8px 0;color:var(--t7)">${pct}分 · ${grade}</div>
        <div style="font-size:12px;color:var(--t5);margin-top:12px;line-height:1.8">
          答对 ${_quizScore} 题，答错 ${_quizQuestions.length - _quizScore} 题<br>
          ${pct < 70 ? '建议重新操作对应实验模块，结合AI助手加深理解。' : '掌握良好！可以尝试更复杂的实验线路。'}
        </div>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:20px">
          <button class="quiz-next-btn" onclick="openQuiz()">再来一组</button>
          <button class="quiz-next-btn" style="background:var(--surf);color:var(--navy);border:1px solid var(--b1)" onclick="closeQuiz()">关闭</button>
        </div>
      </div>
    </div>`;
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeQuiz(); });
