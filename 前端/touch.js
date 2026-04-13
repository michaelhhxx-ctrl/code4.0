// ── TOUCH.JS — 移动端触摸交互系统 ──
// 策略：设备检测后完全独立的代码路径；所有现有鼠标/拖放逻辑一行不改。
// 仅在 IS_TOUCH 为 true 时激活，桌面端完全不受影响。

const IS_TOUCH = navigator.maxTouchPoints > 0 || ('ontouchstart' in window);

if (IS_TOUCH) {
  document.body.classList.add('touch-device');
}

// ── 移动端量子门选中状态 ──
// null = 未选中；字符串 = 已选中的门名（如 'H', 'CNOT'）
// 挂在全局 S 对象上，与其余状态保持一致
if (typeof S !== 'undefined') {
  S.mobileTapGate = null;
}

// ────────────────────────────────────────────────────────────
//  内部工具函数
// ────────────────────────────────────────────────────────────

function _touchClearGateSel() {
  document.querySelectorAll('.gi.mob-sel').forEach(el => el.classList.remove('mob-sel'));
}

function _touchClearSlotHighlight() {
  document.querySelectorAll('.ds.mob-target').forEach(el => el.classList.remove('mob-target'));
}

// 当一个门被选中时，高亮所有空槽位以提示用户可点击的位置
function _touchHighlightSlots() {
  document.querySelectorAll('.ds:not(.occ)').forEach(el => el.classList.add('mob-target'));
}

// ────────────────────────────────────────────────────────────
//  门卡片 tap 处理
// ────────────────────────────────────────────────────────────

function _touchGateCardTap(e) {
  e.preventDefault();
  const gateName = this.dataset.g;

  if (S.mobileTapGate === gateName) {
    // 再次点击同一门 → 取消选中
    S.mobileTapGate = null;
    _touchClearGateSel();
    _touchClearSlotHighlight();
    setSBMsg(typeof _circL === 'function' ? _circL('已取消选择', 'Selection cleared') : '已取消选择');
  } else {
    // 选中新门
    S.mobileTapGate = gateName;
    _touchClearGateSel();
    _touchClearSlotHighlight();
    this.classList.add('mob-sel');
    _touchHighlightSlots();
    const hint = typeof _circL === 'function'
      ? _circL(`已选择 ${gateName} 门 — 点击线路槽位放置`, `${gateName} selected — tap a circuit slot to place`)
      : `已选择 ${gateName} 门 — 点击线路槽位放置`;
    setSBMsg(hint);
  }
}

// ────────────────────────────────────────────────────────────
//  占用槽位：显示/隐藏删除和编辑按钮
//  两步流程：第一次 tap → 显示按钮（mob-occ-active）
//             第二次 tap 按钮 → 合成 click 触发按钮自身的 onclick
//  已激活时不再切换关闭，防止按钮在合成 click 到来前（~300ms）消失
// ────────────────────────────────────────────────────────────

function _touchToggleSlotActions(slot) {
  if (slot.classList.contains('mob-occ-active')) return; // 已激活，等待合成 click
  // 关闭其他已激活槽位
  document.querySelectorAll('.ds.mob-occ-active').forEach(el => {
    clearTimeout(el._mobOccTimer);
    el.classList.remove('mob-occ-active');
  });
  slot.classList.add('mob-occ-active');
  // 3 秒后自动关闭（防止按钮永久暴露）
  slot._mobOccTimer = setTimeout(() => slot.classList.remove('mob-occ-active'), 3000);
}

// ────────────────────────────────────────────────────────────
//  线路槽位 tap 处理
// ────────────────────────────────────────────────────────────

function _touchSlotTap(e) {
  const q = parseInt(this.dataset.q);
  const s = parseInt(this.dataset.s);

  if (!S.mobileTapGate) {
    // 未选中门：若槽位有门，激活删除/编辑按钮
    // 不调用 e.preventDefault()，让合成 click 传递给 .delg/.editp 的 onclick
    if (S.circ[q] && S.circ[q][s]) {
      _touchToggleSlotActions(this);
    }
    return;
  }

  e.preventDefault(); // 阻止合成 click，防止 picker 弹窗被意外关闭

  if (S.circ[q][s]) {
    // 槽位已有门
    setSBMsg(typeof _circL === 'function'
      ? _circL('该位置已有门，请选择空槽位', 'Slot occupied — choose an empty slot')
      : '该位置已有门，请选择空槽位');
    return;
  }

  const gate = S.mobileTapGate;
  saveHist();

  if (typeof TWO_QUBIT_GATES !== 'undefined' && TWO_QUBIT_GATES.includes(gate)) {
    // 双量子比特门：复用现有选择器弹窗（原生 click 事件，触屏同样有效）
    showTwoQubitTargetPicker(this, q, s, gate);
  } else {
    const isRot = ['Rx', 'Ry', 'Rz'].includes(gate);
    S.circ[q][s] = { g: gate, p: isRot ? 90 : null };
    renderCirc(); updateStats(); onGatePlaced(gate, q, s);
  }

  // 放置后清除选中状态和高亮
  S.mobileTapGate = null;
  _touchClearGateSel();
  _touchClearSlotHighlight();
}

// ────────────────────────────────────────────────────────────
//  绑定函数：每次 renderCirc 重建 DOM 后调用（槽位）
//  门卡片是静态 HTML，只需一次性绑定
// ────────────────────────────────────────────────────────────

function _touchRebindSlots() {
  if (!IS_TOUCH) return;
  document.querySelectorAll('.ds').forEach(slot => {
    // 避免重复绑定：用标志位检测
    if (slot._touchBound) return;
    slot._touchBound = true;
    slot.addEventListener('touchend', _touchSlotTap, { passive: false });
  });
}

// ────────────────────────────────────────────────────────────
//  初始化入口
// ────────────────────────────────────────────────────────────

(function _initTouchSystem() {
  if (!IS_TOUCH) return;

  // 1. 一次性绑定门卡片（静态 HTML，不随 renderCirc 重建）
  document.querySelectorAll('.gi').forEach(el => {
    el.addEventListener('touchend', _touchGateCardTap, { passive: false });
  });

  // 2. 点击线路画布空白区域取消选中
  const ci = document.getElementById('ci');
  if (ci) {
    ci.addEventListener('touchend', e => {
      // 若 tap 目标不是槽位，则取消选中
      if (!e.target.closest('.ds') && S.mobileTapGate) {
        S.mobileTapGate = null;
        _touchClearGateSel();
        _touchClearSlotHighlight();
      }
    }, { passive: true });
  }

  // 3. Patch window.renderCirc：每次重建 DOM 后自动重绑槽位 touch 事件
  //    注意：必须在 touch.js 初始化时执行（此时 renderCirc 已由 circuit.js 定义）
  const _origRenderCirc = window.renderCirc;
  window.renderCirc = function () {
    _origRenderCirc.apply(this, arguments);
    // renderCirc 后槽位高亮状态丢失，需根据当前选中状态恢复
    _touchRebindSlots();
    if (S.mobileTapGate) {
      _touchHighlightSlots();
    }
  };

  // 4. 立即绑定当前已渲染的槽位
  //    （main.js 里 renderCirc() 在本文件加载之前已跑完，初始 DOM 需手动补绑）
  _touchRebindSlots();

  // 5. 旋转门参数弹窗：提示文字更新为触屏友好版本
  //    通过 MutationObserver 监听弹窗插入 body
  const _popObserver = new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        const hint = node.classList?.contains('ppop')
          ? node.querySelector('.ppop-drag-hint')
          : node.querySelector?.('.ppop .ppop-drag-hint');
        if (hint) {
          hint.textContent = typeof _circL === 'function'
            ? _circL('← 滑动调节 →', '← slide →')
            : '← 滑动调节 →';
        }
      });
    });
  });
  _popObserver.observe(document.body, { childList: true });

})();
