// ── PREMIUM LANDING PAGE (home.js) ──
// Sections: Hero neural-network canvas · Feature cards · Interactive Bloch · Stats · CTA

// ═══════════════════════════════════════════════
//  Section 1 – Hero: 3-D neural network canvas
// ═══════════════════════════════════════════════
let _mhpRaf = null;
const _MHP_N = 90;
let _mhpPts = [];
let _mhpMx = 0.5, _mhpMy = 0.5;   // normalised mouse pos in hero

function _mhpInitPts() {
  _mhpPts = Array.from({ length: _MHP_N }, () => ({
    x:  (Math.random() - 0.5) * 2.2,
    y:  (Math.random() - 0.5) * 2.2,
    z:  Math.random() * 2 - 1,
    vx: (Math.random() - 0.5) * 0.0007,
    vy: (Math.random() - 0.5) * 0.0007,
    vz: (Math.random() - 0.5) * 0.0004,
    ph: Math.random() * Math.PI * 2,
  }));
}

function _mhpProject(p, W, H) {
  // Parallax from mouse
  const px = p.x + (_mhpMx - 0.5) * 0.35;
  const py = p.y + (_mhpMy - 0.5) * 0.25;
  const fov = 2.8;
  const s = fov / (fov + p.z + 1.2);
  return {
    sx: W * 0.5 + px * s * W * 0.38,
    sy: H * 0.5 + py * s * H * 0.38,
    s,
    a: Math.max(0, (p.z + 1) * 0.5),  // depth alpha
  };
}

function _startMhpCanvas() {
  const cv = document.getElementById('mhp-canvas');
  if (!cv || _mhpRaf) return;
  const ctx = cv.getContext('2d');
  let W, H;

  function resize() {
    W = cv.width  = cv.offsetWidth  || window.innerWidth;
    H = cv.height = cv.offsetHeight || window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  _mhpInitPts();

  // Mouse parallax — track on the full root so it works on all sections
  document.getElementById('main-home').addEventListener('mousemove', e => {
    _mhpMx = e.clientX / window.innerWidth;
    _mhpMy = e.clientY / window.innerHeight;
  });

  const LINK = 0.72;

  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    const proj = _mhpPts.map(p => _mhpProject(p, W, H));

    // Connections
    for (let i = 0; i < _MHP_N; i++) {
      const a = _mhpPts[i], pa = proj[i];
      for (let j = i + 1; j < _MHP_N; j++) {
        const b = _mhpPts[j], pb = proj[j];
        const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
        const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (d < LINK) {
          const alpha = 0.18 * (1 - d / LINK) * pa.a * pb.a;
          const hue = 210 + (a.z + 1) * 22;
          ctx.strokeStyle = `hsla(${hue},80%,68%,${alpha.toFixed(3)})`;
          ctx.lineWidth = 0.65;
          ctx.beginPath();
          ctx.moveTo(pa.sx, pa.sy);
          ctx.lineTo(pb.sx, pb.sy);
          ctx.stroke();
        }
      }
    }

    // Nodes
    for (let i = 0; i < _MHP_N; i++) {
      const p = _mhpPts[i], pp = proj[i];
      const pulse = 0.72 + 0.28 * Math.sin(t * 0.001 + p.ph);
      const r = (1.2 + pp.s * 2.2) * pulse;
      const a = pp.a * 0.45 * pulse;
      const hue = 212 + (p.z + 1) * 28;

      // Glow halo
      const grd = ctx.createRadialGradient(pp.sx, pp.sy, 0, pp.sx, pp.sy, r * 3.5);
      grd.addColorStop(0, `hsla(${hue},88%,72%,${(a * 0.55).toFixed(3)})`);
      grd.addColorStop(1, `hsla(${hue},88%,72%,0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(pp.sx, pp.sy, r * 3.5, 0, 6.2832);
      ctx.fill();

      // Core dot
      ctx.fillStyle = `hsla(${hue},90%,78%,${(a * 1.9).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(pp.sx, pp.sy, r, 0, 6.2832);
      ctx.fill();

      // Move
      p.x += p.vx; p.y += p.vy; p.z += p.vz;
      if (p.x < -1.3 || p.x > 1.3) p.vx *= -1;
      if (p.y < -1.3 || p.y > 1.3) p.vy *= -1;
      if (p.z < -1   || p.z > 1)   p.vz *= -1;
    }

    _mhpRaf = requestAnimationFrame(frame);
  }
  _mhpRaf = requestAnimationFrame(frame);
}

function _stopMhpCanvas() {
  if (_mhpRaf) { cancelAnimationFrame(_mhpRaf); _mhpRaf = null; }
}

// ═══════════════════════════════════════════════
//  Section 3 – Interactive Bloch sphere canvas
// ═══════════════════════════════════════════════
let _blochRaf   = null;
let _blochPhi   = 0.6;
let _blochTilt  = 0.45;  // vertical tilt of view
let _blochDrag  = false;
let _blochLastX = 0, _blochLastY = 0;
let _blochAutoSpin = true;
let _blochAutoTimer = null;

function _startBloch() {
  const cv = document.getElementById('mhp-bloch');
  if (!cv || _blochRaf) return;
  const ctx = cv.getContext('2d');

  // Support HiDPI — size driven by CSS (300px desktop / 240px tablet)
  const dpr = window.devicePixelRatio || 1;
  const CSS = cv.offsetWidth > 10 ? cv.offsetWidth : 300;
  cv.style.width  = CSS + 'px';
  cv.style.height = CSS + 'px';
  cv.width  = CSS * dpr;
  cv.height = CSS * dpr;
  ctx.scale(dpr, dpr);

  const W = CSS, H = CSS;
  const cx = W / 2, cy = H / 2;
  const R  = W * 0.38;

  // Drag events
  cv.addEventListener('mousedown', e => {
    _blochDrag = true;
    _blochAutoSpin = false;
    clearTimeout(_blochAutoTimer);
    _blochLastX = e.clientX;
    _blochLastY = e.clientY;
  });
  window.addEventListener('mouseup', () => {
    if (!_blochDrag) return;
    _blochDrag = false;
    _blochAutoTimer = setTimeout(() => { _blochAutoSpin = true; }, 2500);
  });
  window.addEventListener('mousemove', e => {
    if (!_blochDrag) return;
    _blochPhi  -= (e.clientX - _blochLastX) * 0.011;
    _blochTilt -= (e.clientY - _blochLastY) * 0.009;
    _blochTilt  = Math.max(-0.9, Math.min(0.9, _blochTilt));
    _blochLastX = e.clientX;
    _blochLastY = e.clientY;
  });

  // Project 3-D point onto canvas (simple perspective)
  function p3(x, y, z) {
    const cp = Math.cos(_blochPhi),   sp = Math.sin(_blochPhi);
    const ct = Math.cos(_blochTilt),  st = Math.sin(_blochTilt);
    // Rotate Y (phi)
    const rx = x * cp - z * sp;
    const ry0 = x * sp + z * cp;
    // Tilt (theta)
    const ry = y * ct - ry0 * st;
    const rz = y * st + ry0 * ct;
    const fov = 3.8;
    const sc  = fov / (fov + rz * 0.25);
    return { sx: cx + rx * R * sc, sy: cy - ry * R * sc, d: rz };
  }

  // Draw a 3-D arc (longitude or latitude)
  function drawArc(ax, ay, az, bx, by, bz, steps, style, dash) {
    ctx.save();
    ctx.strokeStyle = style;
    ctx.lineWidth = 1;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pp = p3(ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t);
      i === 0 ? ctx.moveTo(pp.sx, pp.sy) : ctx.lineTo(pp.sx, pp.sy);
    }
    ctx.stroke();
    ctx.restore();
  }

  function frame(t) {
    ctx.clearRect(0, 0, W, H);

    if (_blochAutoSpin) _blochPhi += 0.007;

    // Animated state vector
    const sv_th = Math.PI / 3.2 + Math.sin(t * 0.00045) * 0.45;
    const sv_ph = t * 0.00075;
    const svX = Math.sin(sv_th) * Math.cos(sv_ph);
    const svY = Math.cos(sv_th);
    const svZ = Math.sin(sv_th) * Math.sin(sv_ph);

    const N = p3(0, 1, 0), S = p3(0, -1, 0);

    // Equatorial circle (dashed)
    ctx.save(); ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(68,136,255,0.22)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const a = (i / 80) * Math.PI * 2;
      const pp = p3(Math.cos(a), 0, Math.sin(a));
      i === 0 ? ctx.moveTo(pp.sx, pp.sy) : ctx.lineTo(pp.sx, pp.sy);
    }
    ctx.closePath(); ctx.stroke(); ctx.restore();

    // Prime meridian (dashed)
    ctx.save(); ctx.setLineDash([3, 4]);
    ctx.strokeStyle = 'rgba(68,136,255,0.13)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const a = (i / 80) * Math.PI * 2;
      const pp = p3(Math.sin(a), Math.cos(a), 0);
      i === 0 ? ctx.moveTo(pp.sx, pp.sy) : ctx.lineTo(pp.sx, pp.sy);
    }
    ctx.stroke(); ctx.restore();

    // Sphere outline
    ctx.strokeStyle = 'rgba(68,136,255,0.32)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    // Z axis
    ctx.save(); ctx.setLineDash([4, 3]);
    ctx.strokeStyle = 'rgba(68,136,255,0.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(N.sx, N.sy); ctx.lineTo(S.sx, S.sy);
    ctx.stroke(); ctx.restore();

    // X axis
    const Xp = p3(1, 0, 0), Xn = p3(-1, 0, 0);
    ctx.save(); ctx.setLineDash([2, 3]);
    ctx.strokeStyle = 'rgba(0,212,170,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(Xp.sx, Xp.sy); ctx.lineTo(Xn.sx, Xn.sy);
    ctx.stroke(); ctx.restore();

    // Axis labels
    ctx.setLineDash([]);
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(68,136,255,0.8)';
    ctx.fillText('|0⟩', N.sx, N.sy - 11);
    ctx.fillStyle = 'rgba(68,136,255,0.55)';
    ctx.fillText('|1⟩', S.sx, S.sy + 18);
    ctx.fillStyle = 'rgba(0,212,170,0.55)';
    ctx.textAlign = 'left';
    ctx.fillText('|+⟩', Xp.sx + 5, Xp.sy + 5);

    // Projection dashes
    const O  = p3(0, 0, 0);
    const svPeq = p3(svX, 0, svZ);
    const svPax = p3(0, svY, 0);
    const svP   = p3(svX, svY, svZ);
    ctx.save(); ctx.setLineDash([2, 3]);
    ctx.strokeStyle = 'rgba(255,160,60,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(svP.sx, svP.sy); ctx.lineTo(svPax.sx, svPax.sy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(O.sx, O.sy); ctx.lineTo(svPeq.sx, svPeq.sy); ctx.stroke();
    ctx.restore();

    // State vector arrow (gradient)
    const grd = ctx.createLinearGradient(O.sx, O.sy, svP.sx, svP.sy);
    grd.addColorStop(0, 'rgba(255,160,50,0.35)');
    grd.addColorStop(1, 'rgba(255,210,80,0.95)');
    ctx.setLineDash([]);
    ctx.strokeStyle = grd;
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(O.sx, O.sy); ctx.lineTo(svP.sx, svP.sy);
    ctx.stroke();

    // Tip dot
    ctx.fillStyle = 'rgba(255,210,80,0.95)';
    ctx.beginPath(); ctx.arc(svP.sx, svP.sy, 5, 0, 6.2832); ctx.fill();

    // Tip glow
    const tipGlow = ctx.createRadialGradient(svP.sx, svP.sy, 0, svP.sx, svP.sy, 14);
    tipGlow.addColorStop(0, 'rgba(255,200,60,0.38)');
    tipGlow.addColorStop(1, 'rgba(255,200,60,0)');
    ctx.fillStyle = tipGlow;
    ctx.beginPath(); ctx.arc(svP.sx, svP.sy, 14, 0, 6.2832); ctx.fill();

    // Label
    ctx.font = 'italic 14px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255,210,80,0.9)';
    ctx.textAlign = 'left';
    ctx.fillText('|ψ⟩', svP.sx + 9, svP.sy - 7);

    _blochRaf = requestAnimationFrame(frame);
  }
  _blochRaf = requestAnimationFrame(frame);
}

function _stopBloch() {
  if (_blochRaf) { cancelAnimationFrame(_blochRaf); _blochRaf = null; }
}

// (scroll-reveal is now triggered by _mhpRevealSection(idx) in _mhpGoTo)

// ═══════════════════════════════════════════════
//  Transform-based smooth section navigation
// ═══════════════════════════════════════════════
const _MHP_TOTAL = 5;   // total sections
let _mhpSection  = 0;   // current section index
let _mhpMoving   = false;

// Reveal animations triggered per-section instead of IO
// (IO is unreliable inside a transformed parent)
const _mhpRevealed = new Set();
function _mhpRevealSection(idx) {
  if (_mhpRevealed.has(idx)) return;
  _mhpRevealed.add(idx);
  const root = document.getElementById('main-home');
  if (!root) return;
  const secClass = [null, '.mhp-features', '.mhp-bloch-sec', '.mhp-metrics', '.mhp-cta'][idx];
  if (!secClass) return;
  const sec = root.querySelector(secClass);
  if (!sec) return;
  sec.querySelectorAll(
    '.mhp-sec-eyebrow, .mhp-sec-h2, .mhp-fcard, ' +
    '.mhp-bloch-text, .mhp-bloch-canvas-wrap, .mhp-metric-card, .mhp-cta-h2'
  ).forEach((el, i) => setTimeout(() => el.classList.add('mhp-visible'), i * 55));
}

// Update nav dots
function _mhpSetDot(idx) {
  document.querySelectorAll('#mhp-dots .mhp-nav-dot').forEach((d, i) =>
    d.classList.toggle('mhp-nd-act', i === idx));
}

// Navigate to section by index
function _mhpGoTo(idx) {
  if (idx < 0 || idx >= _MHP_TOTAL) return;
  _mhpSection = idx;
  _mhpMoving  = true;
  const wrap = document.querySelector('#main-home .mhp-wrap');
  if (wrap) wrap.style.transform = `translateY(${-idx * 100}vh)`;
  _mhpSetDot(idx);

  // Trigger per-section reveal animations
  _mhpRevealSection(idx);

  // Lazy-start Bloch canvas when section 2 first appears
  if (idx === 2 && !_blochRaf) _startBloch();

  // Release lock after transition (must match CSS duration: 0.78s)
  setTimeout(() => { _mhpMoving = false; }, 820);
}

// Wheel event handler — intercepts native scroll
let _mhpWheelAccum = 0;
let _mhpWheelLast  = 0;

function _mhpOnWheel(e) {
  e.preventDefault();
  if (_mhpMoving) { _mhpWheelAccum = 0; return; }

  const now = Date.now();
  if (now - _mhpWheelLast > 350) _mhpWheelAccum = 0;  // reset after pause
  _mhpWheelLast = now;
  _mhpWheelAccum += e.deltaY;

  // Require 80px of intent before switching (good for both wheel + trackpad)
  if (Math.abs(_mhpWheelAccum) < 80) return;

  const dir  = _mhpWheelAccum > 0 ? 1 : -1;
  _mhpWheelAccum = 0;
  _mhpGoTo(Math.max(0, Math.min(_MHP_TOTAL - 1, _mhpSection + dir)));
}

// Touch swipe handler
let _mhpTouchY = 0;
function _mhpOnTouchStart(e) { _mhpTouchY = e.touches[0].clientY; }
function _mhpOnTouchEnd(e) {
  if (_mhpMoving) return;
  const dy = _mhpTouchY - e.changedTouches[0].clientY;
  if (Math.abs(dy) < 45) return;
  _mhpGoTo(Math.max(0, Math.min(_MHP_TOTAL - 1, _mhpSection + (dy > 0 ? 1 : -1))));
}

// Keyboard nav
function _mhpOnKey(e) {
  if (!document.getElementById('main-home') ||
      document.getElementById('main-home').style.display === 'none') return;
  if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); _mhpGoTo(_mhpSection + 1); }
  if (e.key === 'ArrowUp'   || e.key === 'PageUp')   { e.preventDefault(); _mhpGoTo(_mhpSection - 1); }
}

function _mhpBindEvents(el) {
  el.addEventListener('wheel',      _mhpOnWheel,      { passive: false });
  el.addEventListener('touchstart', _mhpOnTouchStart, { passive: true  });
  el.addEventListener('touchend',   _mhpOnTouchEnd,   { passive: true  });
  window.addEventListener('keydown', _mhpOnKey);
}

function _mhpUnbindEvents(el) {
  el.removeEventListener('wheel',      _mhpOnWheel);
  el.removeEventListener('touchstart', _mhpOnTouchStart);
  el.removeEventListener('touchend',   _mhpOnTouchEnd);
  window.removeEventListener('keydown', _mhpOnKey);
}

// ═══════════════════════════════════════════════
//  Main Home show / hide
// ═══════════════════════════════════════════════
function showMainHome() {
  const el = document.getElementById('main-home');
  if (!el) return;
  el.style.display = 'flex';
  el.removeAttribute('aria-hidden');

  // Reset to section 0 (no animation — instant)
  _mhpRevealed.clear();
  _mhpSection = 0;
  _mhpMoving  = false;
  const wrap = el.querySelector('.mhp-wrap');
  if (wrap) { wrap.style.transition = 'none'; wrap.style.transform = 'translateY(0)'; }
  _mhpSetDot(0);

  // Re-enable transition on next frame
  requestAnimationFrame(() => {
    if (wrap) wrap.style.transition = '';
  });

  // Show nav dots
  const dots = document.getElementById('mhp-dots');
  if (dots) dots.style.display = 'flex';

  _mhpBindEvents(el);

  setTimeout(() => {
    _startMhpCanvas();
  }, 40);
}

function hideMainHome() {
  const el = document.getElementById('main-home');
  if (!el) return;
  el.style.display = 'none';
  el.setAttribute('aria-hidden', 'true');

  _mhpUnbindEvents(el);

  // Hide nav dots
  const dots = document.getElementById('mhp-dots');
  if (dots) dots.style.display = 'none';

  _stopMhpCanvas();
  _stopBloch();
}

// ── 主首页：点击「线路编辑器」→ 预设选择页 ──
function hmEnterCircuit() {
  hideMainHome();
  if (!localStorage.getItem('qedu_theme')) {
    // 新用户：显示首屏选择 + 主题选择器
    showHomeScreen();
    window._fromHomepage = true;
    setTimeout(() => showThemePicker(), 150);
  } else {
    // 老用户：仅展示预设页；关于弹窗在真正进入工作台时由 hsStart* / hsEnterApp 统一触发一次
    showHomeScreen();
  }
}

// ── 主首页：进入课程模式 ──
function hmEnterCourse() {
  hideMainHome();
  if (!localStorage.getItem('qedu_theme')) {
    // 新用户：先走主题选择 + 首屏，首屏有课程模式按钮
    window._fromHomepage = true;
    showHomeScreen();
    setTimeout(() => showThemePicker(), 150);
  } else {
    // 老用户：直接进入课程模式
    if (typeof openCourseMode === 'function') openCourseMode();
  }
}

// ── 主首页：直接跳到特定视图 ──
function hmEnterView(v) {
  hideMainHome();
  const tabMap = { c: 0, v: 1, q: 2, l: 3, m: 4, r: 5 };
  const tabs = document.querySelectorAll('.ntab');
  const idx = tabMap[v] !== undefined ? tabMap[v] : 0;
  if (tabs[idx]) setView(v, tabs[idx]);
  if (!localStorage.getItem('qedu_theme')) {
    window._fromHomepage = true;
    setTimeout(() => showThemePicker(), 150);
  } else {
    _scheduleEntrySequence();
  }
}

// ── Logo 点击 → 返回主首页 ──
function goHome() {
  hideHomeScreen();
  showMainHome();
}

// ═══════════════════════════════════════════════
//  Preset selection (#home-screen)
// ═══════════════════════════════════════════════
function showHomeScreen() {
  const el = document.getElementById('home-screen');
  if (!el) return;
  el.style.display = 'block';
  el.removeAttribute('aria-hidden');
  const v = el.querySelector('video');
  if (v) _loadVid(v);
}

function hideHomeScreen() {
  const el = document.getElementById('home-screen');
  if (!el) return;
  el.style.display = 'none';
  el.setAttribute('aria-hidden', 'true');
}

function hsStartPreset(name) {
  loadPreset(name);
  hideHomeScreen();
  setSBMsg('已加载预设：' + name);
  if (localStorage.getItem('qedu_theme')) _scheduleEntrySequence();
}

function hsStartBlank() {
  S.currentPreset = null;
  hideHomeScreen();
  if (localStorage.getItem('qedu_theme')) _scheduleEntrySequence();
}

function hsEnterApp() {
  hideHomeScreen();
  hideMainHome();
  if (!localStorage.getItem('qedu_theme')) {
    window._fromHomepage = true;
    setTimeout(() => showThemePicker(), 150);
  } else {
    _scheduleEntrySequence();
  }
}

// 功能快速入口：进入 app 并跳转到指定 tab
function hsGoTo(view) {
  hideHomeScreen();
  hideMainHome();
  // 找到对应 tab 元素并切换
  const tab = document.querySelector('.ntab[onclick*="\'' + view + '\'"]');
  if (tab && typeof setView === 'function') {
    setTimeout(function() { setView(view, tab); }, 60);
  }
  if (!localStorage.getItem('qedu_theme')) {
    window._fromHomepage = true;
    setTimeout(() => showThemePicker(), 150);
  } else {
    _scheduleEntrySequence();
  }
}

// ── 入口序列（关于 → 新手指南）──
// 本标签页内已成功弹出过「关于」则不再重复（避免主题确认 / 预设页 / 进入工作台 等多处串联触发）
function _scheduleEntrySequence() {
  window._fromHomepage = true;
  setTimeout(() => {
    if (sessionStorage.getItem('qedu_intro_shown_session') === '1') return;
    if (typeof openIntro === 'function') openIntro();
  }, 300);
}

// ═══════════════════════════════════════════════
//  Init
// ═══════════════════════════════════════════════
(function initHomeScreen() {
  if (_willShowHomeScreen) {
    showMainHome();
  }
})();
