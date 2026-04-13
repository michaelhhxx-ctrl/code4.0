// ── CIRCUIT SHARING ──

const VALID_GATES = new Set(['H','X','Y','Z','S','T','Rx','Ry','Rz','CNOT','CZ','SWAP','M']);
function _shareL(zh, en) { return window.isEnglish?.() ? en : zh; }

function shareCircuit() {
  let gc = 0; S.circ.forEach(r => r.forEach(g => { if (g && g.role !== 'tgt') gc++; }));
  if (gc === 0) { setSBMsg(_shareL('线路为空，无法分享', 'The circuit is empty and cannot be shared')); return; }
  const _val = S.validation || (typeof refreshCircuitValidation === 'function' ? refreshCircuitValidation() : null);
  if (_val && _val.summary.blocking) {
    const msg = _val.errors[0]?.msg || _shareL('线路存在错误，请先修正后再分享', 'Circuit has errors — fix them before sharing');
    setSBMsg(msg); return;
  }
  try {
    const data = {
      q: S.qubits,
      c: S.circ.map(row => row.map(g => g ? [g.g, g.p, g.ctrl, g.tgt, g.role] : null))
    };
    const enc = btoa(encodeURIComponent(JSON.stringify(data)));
    const url = location.href.split('#')[0] + '#circ=' + enc;
    const inp = document.getElementById('share-url-input');
    if (inp) inp.value = url;
    document.getElementById('share-modal').classList.add('op');
    navigator.clipboard?.writeText(url).then(() => setSBMsg(_shareL('分享链接已复制！', 'Share link copied!')));
  } catch (e) {
    setSBMsg(_shareL('链接生成失败（线路过大）', 'Failed to generate the link (circuit too large)'));
    console.warn('[share] encode failed:', e);
  }
}
function closeShareModal() { document.getElementById('share-modal').classList.remove('op'); }
function copyShareUrl() {
  const inp = document.getElementById('share-url-input'); if (!inp) return;
  const okMsg = _shareL('链接已复制！', 'Link copied!');
  navigator.clipboard?.writeText(inp.value)
    .then(() => setSBMsg(okMsg))
    .catch(() => { inp.select(); document.execCommand('copy'); setSBMsg(okMsg); });
}

function checkShareHash() {
  if (!location.hash.startsWith('#circ=')) return;
  try {
    const raw = location.hash.slice(6);
    let data;
    try {
      data = JSON.parse(decodeURIComponent(atob(raw)));
    } catch (e) {
      console.warn('[share] decode failed:', e);
      setSBMsg(_shareL('分享链接格式无效', 'Invalid share-link format'));
      history.replaceState(null, '', location.pathname);
      return;
    }

    if (!data || typeof data.q !== 'number' || !Array.isArray(data.c)) {
      console.warn('[share] invalid data structure');
      setSBMsg(_shareL('分享链接数据无效', 'Invalid share-link data'));
      history.replaceState(null, '', location.pathname);
      return;
    }
    if (data.q < 1 || data.q > 8 || !Number.isInteger(data.q)) {
      console.warn('[share] qubit count out of range:', data.q);
      setSBMsg(_shareL('分享链接超过 8 qubits 上限，无法载入', 'Share link exceeds the 8-qubit limit and cannot be loaded'));
      history.replaceState(null, '', location.pathname);
      return;
    }
    if (data.c.length === 0) {
      console.warn('[share] empty circuit');
      history.replaceState(null, '', location.pathname);
      return;
    }

    saveHist();
    S.qubits = data.q;
    S.circ = data.c.map(row => {
      if (!Array.isArray(row)) return Array(S.steps).fill(null);
      return row.slice(0, S.steps).map(g => {
        if (!g || !Array.isArray(g)) return null;
        const [gateName, p, ctrl, tgt, role] = g;
        if (!VALID_GATES.has(gateName)) return null;
        const safeP = (p != null && !isNaN(Number(p))) ? Number(p) : null;
        const safeCtrl = (ctrl != null && Number.isInteger(ctrl) && ctrl >= 0 && ctrl < data.q) ? ctrl : undefined;
        const safeTgt  = (tgt  != null && Number.isInteger(tgt)  && tgt  >= 0 && tgt  < data.q) ? tgt  : undefined;
        const safeRole = (role === 'ctrl' || role === 'tgt') ? role : undefined;
        const entry = { g: gateName, p: safeP };
        if (safeCtrl !== undefined) entry.ctrl = safeCtrl;
        if (safeTgt  !== undefined) entry.tgt  = safeTgt;
        if (safeRole !== undefined) entry.role = safeRole;
        return entry;
      });
    });

    while (S.circ.length < S.qubits) S.circ.push(Array(S.steps).fill(null));
    S.circ = S.circ.slice(0, S.qubits);
    S.circ = S.circ.map(row => {
      while (row.length < S.steps) row.push(null);
      return row.slice(0, S.steps);
    });

    renderCirc(); updateStats(); updateBlochFromCirc();
    setSBMsg(_shareL('已从分享链接加载线路', 'Loaded circuit from share link'));
    addMsg(_shareL('检测到分享链接，已自动加载量子线路。', 'A shared circuit link was detected and loaded automatically.'));
    history.replaceState(null, '', location.pathname);
  } catch (e) {
    console.warn('[share] unexpected error:', e);
    setSBMsg(_shareL('分享链接加载失败', 'Failed to load the share link'));
    history.replaceState(null, '', location.pathname);
  }
}

function refreshShareI18n() {
  const inp = document.getElementById('share-url-input');
  if (inp && !inp.value) inp.placeholder = window.t?.('share.placeholder') || _shareL('链接生成中...', 'Generating link...');
}
window.refreshShareI18n = refreshShareI18n;
window.refreshShareI18N = refreshShareI18n;
