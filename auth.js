// ── AUTH & PROFILE ──

function _authL(zh, en) { return (typeof isEnglish === 'function' && isEnglish()) ? en : zh; }
function _authLocale() { return (typeof isEnglish === 'function' && isEnglish()) ? 'en-US' : 'zh-CN'; }

function _authBase() { return (typeof getApiBase === 'function') ? getApiBase() : 'http://localhost:8000'; }
function _authToken() { return localStorage.getItem('qedu_token') || ''; }
function _authHeaders() {
  const h = { 'Content-Type': 'application/json' };
  const t = _authToken(); if (t) h['Authorization'] = 'Bearer ' + t;
  return h;
}

function isValidEmail(e) { return !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

const Auth = {
  currentUser() {
    const token = _authToken();
    if (!token) return null;
    try {
      // Decode JWT payload (base64url) without signature verification — username is not secret
      const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(b64));
      if (payload.exp && payload.exp < Date.now() / 1000) {
        localStorage.removeItem('qedu_token');
        return null;
      }
      return payload.sub || null;
    } catch { return null; }
  },

  async login(username, password) {
    if (!username || !username.trim()) return _authL('请输入用户名', 'Please enter a username');
    try {
      const r = await fetch(`${_authBase()}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });
      if (r.status === 401) {
        const d = await r.json();
        const msg = d.detail || '';
        if (msg.includes('not found') || msg.includes('不存在')) return _authL('用户名不存在', 'Username not found');
        return _authL('密码错误', 'Incorrect password');
      }
      if (!r.ok) return _authL('登录失败，请稍后重试', 'Login failed, please try again');
      const data = await r.json();
      localStorage.setItem('qedu_token', data.token);
      return null;
    } catch {
      return _authL('网络错误，无法连接到服务器', 'Network error — cannot reach server');
    }
  },

  async register(username, password, email) {
    if (!username || username.trim().length < 2) return _authL('用户名至少 2 个字符', 'Username must be at least 2 characters');
    if (username.trim().length > 20) return _authL('用户名不能超过 20 个字符', 'Username must be 20 characters or fewer');
    if (!password || password.length < 4) return _authL('密码至少 4 个字符', 'Password must be at least 4 characters');
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username.trim())) return _authL('用户名只能含字母、数字、下划线或中文', 'Username can only contain letters, numbers, underscores, or Chinese characters');
    if (email && !isValidEmail(email)) return _authL('邮箱格式不正确', 'Invalid email address');
    try {
      const r = await fetch(`${_authBase()}/api/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password, email: email || '' })
      });
      if (r.status === 409) return _authL('该用户名已被注册', 'This username is already taken');
      if (r.status === 422) {
        const d = await r.json();
        return d.detail?.[0]?.msg || _authL('输入格式错误', 'Invalid input');
      }
      if (!r.ok) return _authL('注册失败，请稍后重试', 'Registration failed, please try again');
      const data = await r.json();
      localStorage.setItem('qedu_token', data.token);
      return null;
    } catch {
      return _authL('网络错误，无法连接到服务器', 'Network error — cannot reach server');
    }
  },

  logout() { localStorage.removeItem('qedu_token'); }
};

const UserData = {
  async getCircuits() {
    try {
      const r = await fetch(`${_authBase()}/api/user/circuits`, { headers: _authHeaders() });
      if (!r.ok) return [];
      return await r.json();
    } catch { return []; }
  },

  async saveCircuitEntry(entry) {
    try {
      await fetch(`${_authBase()}/api/user/circuits`, {
        method: 'POST', headers: _authHeaders(),
        body: JSON.stringify({ name: entry.name, circ: entry.circ, qubits: entry.qubits, gateCount: entry.gateCount })
      });
    } catch { /* best-effort */ }
  },

  async deleteCircuit(id) {
    try {
      await fetch(`${_authBase()}/api/user/circuits/${encodeURIComponent(id)}`, {
        method: 'DELETE', headers: _authHeaders()
      });
    } catch { /* best-effort */ }
  },

  async getHistory() {
    try {
      const r = await fetch(`${_authBase()}/api/user/history`, { headers: _authHeaders() });
      if (!r.ok) return [];
      return await r.json();
    } catch { return []; }
  },

  async addHistory(entry) {
    try {
      await fetch(`${_authBase()}/api/user/history`, {
        method: 'POST', headers: _authHeaders(),
        body: JSON.stringify({ ts: entry.ts, desc: entry.desc, type: entry.type })
      });
    } catch { /* best-effort */ }
  }
};

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString(_authLocale(), { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function openAuthModal(tab) {
  document.getElementById('auth-overlay').classList.add('on');
  switchAuthTab(tab || 'login');
  ['auth-login-err', 'auth-reg-err'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.textContent = ''; }
  });
  refreshAuthI18n();
}
function closeAuthModal() { document.getElementById('auth-overlay').classList.remove('on'); }
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('on', t.dataset.tab === tab));
  document.querySelectorAll('.auth-form-pane').forEach(p => p.classList.toggle('on', p.dataset.pane === tab));
}
async function doLogin() {
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value;
  const errEl = document.getElementById('auth-login-err');
  const err = await Auth.login(u, p);
  if (err) { errEl.textContent = err; errEl.style.display = 'block'; return; }
  errEl.style.display = 'none';
  closeAuthModal(); updateUserUI(); setSBMsg(_authL(`欢迎回来，${escHtml(u)}！`, `Welcome back, ${escHtml(u)}!`));
}
async function doRegister() {
  const u = document.getElementById('reg-username').value.trim();
  const p = document.getElementById('reg-password').value;
  const e = document.getElementById('reg-email').value.trim();
  const errEl = document.getElementById('auth-reg-err');
  const err = await Auth.register(u, p, e);
  if (err) { errEl.textContent = err; errEl.style.display = 'block'; return; }
  errEl.style.display = 'none';
  closeAuthModal(); updateUserUI(); setSBMsg(_authL(`注册成功，欢迎 ${escHtml(u)}！`, `Registration successful. Welcome, ${escHtml(u)}!`));
  addMsg(_authL(
    `账号 <b>${escHtml(u)}</b> 注册成功！现在可以保存量子线路和查看实验历史了。`,
    `Account <b>${escHtml(u)}</b> created successfully. You can now save circuits and view your experiment history.`
  ));
}
function authLogout() {
  const user = Auth.currentUser(); Auth.logout(); updateUserUI();
  setSBMsg(user ? _authL(`${escHtml(user)} 已退出登录`, `${escHtml(user)} signed out`) : _authL('已退出登录', 'Signed out'));
}
function updateUserUI() {
  const user = Auth.currentUser();
  const gEl = document.getElementById('user-ctrl-guest');
  const aEl = document.getElementById('user-ctrl-auth');
  const nBtn = document.getElementById('user-name-btn');
  if (user) {
    gEl.style.display = 'none'; aEl.style.display = 'flex';
    nBtn.textContent = `👤 ${user}`;
  } else {
    gEl.style.display = 'flex'; aEl.style.display = 'none';
    nBtn.textContent = _authL('👤 用户', '👤 User');
  }
  const saveBtn = document.getElementById('btn-save-circ');
  const loadBtn = document.getElementById('btn-load-circ');
  if (saveBtn) {
    saveBtn.classList.toggle('auth-btn-locked', !user);
    saveBtn.title = user ? _authL('保存线路', 'Save circuit') : _authL('保存线路（需登录）', 'Save circuit (login required)');
  }
  if (loadBtn) {
    loadBtn.classList.toggle('auth-btn-locked', !user);
    loadBtn.title = user ? _authL('载入已保存线路', 'Load saved circuit') : _authL('载入已保存线路（需登录）', 'Load saved circuit (login required)');
  }
}

function openProfile() {
  const user = Auth.currentUser(); if (!user) return;
  document.getElementById('profile-username-display').textContent = user;
  document.getElementById('profile-overlay').classList.add('on');
  switchProfileTab('circuits');
  refreshAuthI18n();
}
function closeProfile() { document.getElementById('profile-overlay').classList.remove('on'); }
function switchProfileTab(tab) {
  document.querySelectorAll('.profile-tab').forEach(t => t.classList.toggle('on', t.dataset.tab === tab));
  document.querySelectorAll('.profile-pane').forEach(p => p.classList.toggle('on', p.dataset.pane === tab));
  if (tab === 'circuits') renderProfileCircuits();
  else renderProfileHistory();
}
async function renderProfileCircuits() {
  const user = Auth.currentUser(); if (!user) return;
  const el = document.getElementById('profile-circuits-list');
  el.innerHTML = `<div class="profile-empty"><div class="profile-empty-icon">⏳</div>${_authL('加载中...', 'Loading...')}</div>`;
  const circs = await UserData.getCircuits();
  if (!circs.length) {
    el.innerHTML = `<div class="profile-empty"><div class="profile-empty-icon">🔮</div>${_authL('还没有保存的线路', 'No saved circuits yet')}<br><small>${_authL('搭建完线路后点击工具栏"保存"即可', 'Build a circuit and click "Save" in the toolbar')}</small></div>`;
    return;
  }
  el.innerHTML = circs.map(c => `
    <div class="circ-card">
      <div class="circ-icon">${escHtml(String(c.qubits))}q</div>
      <div class="circ-info">
        <div class="circ-name">${escHtml(c.name)}</div>
        <div class="circ-meta">${escHtml(String(c.gateCount))} ${_authL('个门', 'gates')} &middot; ${fmtDate(c.savedAt)}</div>
      </div>
      <div class="circ-actions">
        <button class="circ-btn circ-load" onclick="loadUserCircuit('${escHtml(c.id)}')">${_authL('载入', 'Load')}</button>
        <button class="circ-btn circ-del" data-cid="${escHtml(c.id)}" onclick="deleteUserCircuit('${escHtml(c.id)}')">${_authL('删除', 'Delete')}</button>
      </div>
    </div>`).join('');
  // Cache circuits for loadUserCircuit lookup
  window._cachedUserCircuits = circs;
}
async function renderProfileHistory() {
  const user = Auth.currentUser(); if (!user) return;
  const el = document.getElementById('profile-history-list');
  el.innerHTML = `<div class="profile-empty"><div class="profile-empty-icon">⏳</div>${_authL('加载中...', 'Loading...')}</div>`;
  const hist = await UserData.getHistory();
  if (!hist.length) {
    el.innerHTML = `<div class="profile-empty"><div class="profile-empty-icon">📊</div>${_authL('暂无实验记录', 'No experiment history yet')}<br><small>${_authL('运行模拟或保存线路后会自动记录', 'Records are created automatically after simulations or saves')}</small></div>`;
    return;
  }
  el.innerHTML = hist.map(h => `
    <div class="hist-row">
      <div class="hist-time">${fmtDate(h.ts)}</div>
      <div class="hist-name">${escHtml(h.desc)}</div>
      <span class="hist-badge ${h.type === 'sim' ? 'hist-sim' : 'hist-save'}">${h.type === 'sim' ? _authL('模拟', 'Sim') : _authL('保存', 'Save')}</span>
    </div>`).join('');
}
function loadUserCircuit(id) {
  const circ = (window._cachedUserCircuits || []).find(c => c.id === id);
  if (!circ) return;
  if (circ.qubits > 8) {
    setSBMsg(_authL('该线路超过 8 qubits 上限，无法载入', 'This circuit exceeds the 8-qubit limit and cannot be loaded'));
    return;
  }
  saveHist();
  S.qubits = circ.qubits;
  S.circ = circ.circ.map(row => row.map(g => g ? { ...g } : null));
  while (S.circ.length < S.qubits) S.circ.push(Array(S.steps).fill(null));
  renderCirc(); updateStats(); updateBlochFromCirc();
  if (typeof setCircSaved === 'function') setCircSaved();
  closeProfile();
  setSBMsg(_authL(`已载入：${circ.name}`, `Loaded: ${circ.name}`));
  addMsg(_authL(
    `已从个人中心载入线路 <b>"${escHtml(circ.name)}"</b>（${escHtml(String(circ.gateCount))} 个门，${escHtml(String(circ.qubits))} 个量子比特）。`,
    `Loaded circuit <b>"${escHtml(circ.name)}"</b> from your profile (${escHtml(String(circ.gateCount))} gates, ${escHtml(String(circ.qubits))} qubits).`
  ));
}
const _pendingDeletes = new Set();
async function deleteUserCircuit(id) {
  const user = Auth.currentUser(); if (!user) return;
  const btn = document.querySelector(`.circ-del[data-cid="${CSS.escape(id)}"]`);
  if (!_pendingDeletes.has(id)) {
    _pendingDeletes.add(id);
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = _authL('确认删除?', 'Sure?');
      btn.classList.add('circ-del-confirm');
      setTimeout(() => {
        if (_pendingDeletes.has(id)) {
          _pendingDeletes.delete(id);
          if (btn.isConnected) { btn.textContent = orig; btn.classList.remove('circ-del-confirm'); }
        }
      }, 3000);
    }
    return;
  }
  _pendingDeletes.delete(id);
  await UserData.deleteCircuit(id);
  renderProfileCircuits();
}

function doSaveCircuit() {
  const user = Auth.currentUser();
  if (!user) { openAuthModal('login'); addMsg(_authL('请先登录，然后才能保存线路到个人账户。', 'Please sign in before saving circuits to your account.')); return; }
  let gc = 0; S.circ.forEach(r => r.forEach(g => { if (g && g.role !== 'tgt') gc++; }));
  if (gc === 0) { setSBMsg(_authL('线路为空，无需保存', 'The circuit is empty. Nothing to save.')); return; }
  document.getElementById('save-circuit-name').value = _authL('我的线路 ', 'My circuit ') + new Date().toLocaleDateString(_authLocale());
  document.getElementById('save-overlay').classList.add('on');
  setTimeout(() => { const inp = document.getElementById('save-circuit-name'); if (inp) inp.select(); }, 60);
  refreshAuthI18n();
}
function closeSaveModal() { document.getElementById('save-overlay').classList.remove('on'); }
async function confirmSaveCircuit() {
  const user = Auth.currentUser(); if (!user) return;
  const name = document.getElementById('save-circuit-name').value.trim() || _authL('未命名线路', 'Untitled circuit');
  let gc = 0; S.circ.forEach(r => r.forEach(g => { if (g && g.role !== 'tgt') gc++; }));
  const entry = {
    name,
    circ: S.circ.map(row => row.map(g => g ? { ...g } : null)),
    qubits: S.qubits,
    gateCount: gc,
  };
  await UserData.saveCircuitEntry(entry);
  UserData.addHistory({ ts: Date.now(), desc: _authL(`保存线路"${name}"（${gc} 门，${S.qubits} 比特）`, `Saved circuit "${name}" (${gc} gates, ${S.qubits} qubits)`), type: 'save' });
  closeSaveModal();
  setSBMsg(_authL(`已保存：${name}`, `Saved: ${name}`));
  addMsg(_authL(
    `线路 <b>"${escHtml(name)}"</b> 已保存至个人中心（${gc} 门，${S.qubits} 比特）。点击右上角头像可查看。`,
    `Circuit <b>"${escHtml(name)}"</b> was saved to your profile (${gc} gates, ${S.qubits} qubits). Click the avatar in the top-right corner to view it.`
  ));
  if (typeof setCircSaved === 'function') setCircSaved();
}
function doLoadCircuit() {
  const user = Auth.currentUser();
  if (!user) { openAuthModal('login'); addMsg(_authL('请先登录，然后才能载入已保存的线路。', 'Please sign in before loading saved circuits.')); return; }
  openProfile(); switchProfileTab('circuits');
}

function refreshAuthI18n() {
  updateUserUI();
  if (document.getElementById('profile-overlay')?.classList.contains('on')) {
    const active = document.querySelector('.profile-tab.on')?.dataset.tab || 'circuits';
    if (active === 'circuits') renderProfileCircuits();
    else renderProfileHistory();
  }
}
window.refreshAuthI18n = refreshAuthI18n;
window.refreshAuthI18N = refreshAuthI18n;
