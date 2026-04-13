// ── API LAYER ──

function _apiL(zh, en) {
  return (typeof window.isEnglish === 'function' && window.isEnglish()) || window._currentLang === 'en' ? en : zh;
}

function getApiBase() {
  const stored = localStorage.getItem('qedu_api_base');
  if (stored && stored.trim()) return stored.trim().replace(/\/$/, '');
  if (location.protocol !== 'file:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    return location.origin;
  }
  return 'http://localhost:8000';
}

const API = {
  get base() { return getApiBase(); },
  async ping() {
    try {
      const r = await fetch(`${this.base}/api/health`, { signal: AbortSignal.timeout(2000) });
      return r.ok;
    } catch { return false; }
  },
  async simulate(circuitJson, nQubits) {
    if (window._forceLocal) return null;
    try {
      const r = await fetch(`${this.base}/api/simulate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ circuit: circuitJson, n_qubits: nQubits })
      });
      if (!r.ok) throw new Error(r.statusText);
      return await r.json();
    } catch (e) { console.warn('[API.simulate] fallback→local:', e.message); return null; }
  },
  async aiTutor(userMsg, circCtx, onChunk, onDone) {
    try {
      const r = await fetch(`${this.base}/api/ai-tutor/stream`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, circuit: circCtx })
      });
      if (!r.ok) throw new Error(r.statusText);
      const reader = r.body.getReader(), dec = new TextDecoder(); let buf = '';
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop();
        lines.forEach(ln => {
          if (!ln.startsWith('data: ')) return;
          const d = ln.slice(6).trim();
          if (d === '[DONE]') onDone?.();
          else { try { onChunk?.(JSON.parse(d).chunk); } catch {} }
        });
      }
      onDone?.(); return true;
    } catch (e) { console.warn('[API.aiTutor] fallback→local:', e.message); return false; }
  },
  vqeWS: null,
  startVQEws(params, onIter, onDone, onError) {
    if (window._forceLocal) return false;
    try {
      const wsUrl = this.base.replace(/^http/, 'ws') + '/api/vqe/optimize';
      this.vqeWS = new WebSocket(wsUrl);
      this.vqeWS.onopen = () => this.vqeWS.send(JSON.stringify(params));
      this.vqeWS.onmessage = e => {
        let d;
        try { d = JSON.parse(e.data); } catch { return; }
        // Application-level error from the backend (e.g. unknown molecule).
        // Must be caught before onIter, which assumes d.energy is a number.
        if (d.error) { onError?.(d.error); this.vqeWS.close(); return; }
        // Every step (including the final converged one) goes through onIter first,
        // so the convergence curve and 3D trajectory never drop the last point.
        onIter?.(d);
        if (d.converged) { onDone?.(d); this.vqeWS.close(); }
      };
      this.vqeWS.onerror = () => { onError?.(); };
      this.vqeWS.onclose = () => { this.vqeWS = null; };
      return true;
    } catch (e) { console.warn('[API.vqeWS] fallback→local:', e.message); return false; }
  },
  stopVQE() { this.vqeWS?.close(); this.vqeWS = null; },
  // Fetch E(θ₁,θ₂) landscape grid from the backend.
  // Returns the response JSON on success, or null on any error.
  async fetchLandscape(params) {
    if (window._forceLocal) return null;
    try {
      const r = await fetch(`${this.base}/api/vqe/landscape`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(params),
        signal:  AbortSignal.timeout(15000),
      });
      if (!r.ok) { console.warn('[API.fetchLandscape] HTTP', r.status); return null; }
      return await r.json();
    } catch (e) {
      console.warn('[API.fetchLandscape] failed:', e.message);
      return null;
    }
  },
  qaoaWS: null,
  startQAOAws(params, onIter, onDone, onError) {
    if (window._forceLocal) return false;
    try {
      const wsUrl = this.base.replace(/^http/, 'ws') + '/api/qaoa/run';
      this.qaoaWS = new WebSocket(wsUrl);
      this.qaoaWS.onopen = () => this.qaoaWS.send(JSON.stringify(params));
      this.qaoaWS.onmessage = e => {
        let d; try { d = JSON.parse(e.data); } catch { return; }
        if (d.error) { onError?.(d.error); this.qaoaWS.close(); return; }
        if (d.converged) { onDone?.(d); this.qaoaWS.close(); }
        else { onIter?.(d); }
      };
      this.qaoaWS.onerror = () => { onError?.('ws_error'); };
      this.qaoaWS.onclose = () => { this.qaoaWS = null; };
      return true;
    } catch (e) { console.warn('[API.qaoaWS]:', e.message); return false; }
  },
  stopQAOA() { this.qaoaWS?.close(); this.qaoaWS = null; },
  async codegen(circuitJson, framework = 'qiskit') {
    try {
      const r = await fetch(`${this.base}/api/codegen/${framework}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ circuit: circuitJson, n_qubits: S.qubits })
      });
      if (!r.ok) throw new Error(r.statusText);
      return (await r.json()).code;
    } catch (e) { console.warn('[API.codegen] fallback→local:', e.message); return null; }
  },
  async saveCircuit(name, circuitJson) {
    try {
      const r = await fetch(`${this.base}/api/circuits`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, circuit: circuitJson, n_qubits: S.qubits })
      });
      return (await r.json()).id;
    } catch (e) { console.warn('[API.saveCircuit]:', e.message); return null; }
  },
  async loadCircuit(id) {
    try { return await (await fetch(`${this.base}/api/circuits/${id}`)).json(); }
    catch (e) { console.warn('[API.loadCircuit]:', e.message); return null; }
  },
  async getLibrary() {
    try { return await (await fetch(`${this.base}/api/circuits/library`)).json(); }
    catch (e) { console.warn('[API.getLibrary]:', e.message); return []; }
  },
  async aiOptimize(circ, nQubits, question, errors) {
    try {
      const r = await fetch(`${this.base}/api/ai-optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ circ, n_qubits: nQubits, question: question ?? null, errors: errors ?? null }),
        signal: AbortSignal.timeout(30000)
      });
      if (!r.ok) throw new Error(r.statusText);
      return await r.json();
    } catch (e) { console.warn('[API.aiOptimize]:', e.message); return null; }
  }
};

window._backendConnected = false;
window._forceLocal = false;

function renderBackendConnState() {
  const dot = document.querySelector('.hdot');
  const connLbl = document.getElementById('conn-lbl');
  const badge = document.querySelector('.hbadge');
  if (window._forceLocal) {
    if (dot) dot.style.background = '#F87171';
    if (connLbl) connLbl.textContent = _apiL('🔒 强制本地', '🔒 Force local');
    if (badge) badge.title = _apiL('强制本地模式（点击恢复自动检测）', 'Forced local mode — click to auto-detect');
  } else {
    const online = !!window._backendConnected;
    if (dot) dot.style.background = online ? '#4ADE80' : '#FBBF24';
    if (connLbl) {
      connLbl.textContent = online
        ? (window.tr?.('conn.online') || _apiL('Qiskit 已连接', 'Qiskit connected'))
        : (window.tr?.('conn.offline') || _apiL('本地模拟模式', 'Local simulation mode'));
    }
    if (badge) badge.title = _apiL('点击切换为强制本地模式', 'Click to force local mode');
  }
}
window.renderBackendConnState = renderBackendConnState;
window.refreshConnectionLabel = renderBackendConnState;
window.refreshConnI18n = renderBackendConnState;
window.refreshConnI18N = renderBackendConnState;

function toggleConnMode() {
  window._forceLocal = !window._forceLocal;
  if (window._forceLocal) {
    window._backendConnected = false;
    renderBackendConnState();
    setSBMsg(_apiL('已切换为强制本地模式 · 所有计算在浏览器内运行', 'Switched to local mode · all computation runs in browser'));
  } else {
    setSBMsg(_apiL('恢复自动检测...', 'Auto-detecting backend...'));
    checkBackendConn();
  }
}
window.toggleConnMode = toggleConnMode;

async function checkBackendConn() {
  const ok = await API.ping();
  window._backendConnected = ok;
  renderBackendConnState();
  if (ok) {
    setSBMsg(_apiL('后端连接成功 · 精确模拟可用', 'Backend connected · exact simulation available'));
  } else {
    setSBMsg(_apiL('后端离线 — 本地精确模拟', 'Backend offline — local simulation mode'));
  }
}
