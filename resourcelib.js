// ── 学习资料库：云端 manifest 驱动 ──
// 配置（任选）：
//   window.QEDU_RESOURCES_MANIFEST_URL = 'https://你的存储/manifest.json';
//   或 localStorage.setItem('qedu_resources_manifest_url', 'https://...');
//   或直接 window.QEDU_RESOURCES_MANIFEST = { items: [...] }; // 内联清单（免请求）
//
// manifest.json 示例：
// { "version": 1, "items": [
//   { "title": "讲义", "titleEn": "Notes", "desc": "…", "descEn": "…",
//     "url": "https://…/file.pdf", "type": "pdf", "tag": "PDF", "tagEn": "PDF" }
// ] }

function _resIsEn() {
  return window.isEnglish?.() === true || window._currentLang === 'en';
}

function _resManifestUrl() {
  if (typeof window.QEDU_RESOURCES_MANIFEST_URL === 'string' && window.QEDU_RESOURCES_MANIFEST_URL.trim())
    return window.QEDU_RESOURCES_MANIFEST_URL.trim();
  try {
    const u = localStorage.getItem('qedu_resources_manifest_url');
    if (u && u.trim()) return u.trim();
  } catch (e) {}
  return '';
}

function _normalizeManifest(data) {
  if (!data) return [];
  const arr = Array.isArray(data) ? data : data.items;
  if (!Array.isArray(arr)) return [];
  return arr.filter(it => it && it.url && (it.title || it.titleEn));
}

/** 无云端地址时的本地占位条目（可改为你自己的默认链接） */
const RESLIB_FALLBACK_ITEMS = [];

/** 内存缓存：避免每次切换标签都重新 fetch */
let _resCache = null;

function _typeIcon(type) {
  const t = (type || 'link').toLowerCase();
  if (t === 'pdf') return '📄';
  if (t === 'doc' || t === 'docx') return '📝';
  if (t === 'video' || t === 'mp4') return '🎬';
  if (t === 'link' || t === 'url') return '🔗';
  return '📎';
}

function renderResourceLib() {
  const root = document.getElementById('resv');
  if (!root) return;
  const tr = window.t || function (k) { return k; };

  if (!root.dataset.inited) {
    root.dataset.inited = '1';
    root.innerHTML =
      '<div class="algo-page-hd">' +
        '<div class="algo-page-title" id="reslib-page-title"></div>' +
        '<div class="algo-page-sub" id="reslib-page-sub"></div>' +
      '</div>' +
      '<div class="reslib-toolbar" id="reslib-toolbar">' +
        '<button type="button" class="algo-prev-btn" id="reslib-refresh-btn"></button>' +
        '<span class="reslib-status" id="reslib-status"></span>' +
      '</div>' +
      '<div class="algo-grid" id="reslib-grid"></div>' +
      '<div class="reslib-empty" id="reslib-empty"></div>';
    document.getElementById('reslib-refresh-btn').onclick = function () { _resCache = null; renderResourceLib(); };
  }

  document.getElementById('reslib-page-title').textContent = tr('reslib.title');
  document.getElementById('reslib-page-sub').textContent = tr('reslib.sub');
  document.getElementById('reslib-refresh-btn').textContent = tr('reslib.refresh');

  const grid = document.getElementById('reslib-grid');
  const emptyEl = document.getElementById('reslib-empty');
  const statusEl = document.getElementById('reslib-status');
  grid.innerHTML = '';
  emptyEl.style.display = 'none';
  emptyEl.textContent = '';
  statusEl.textContent = tr('reslib.loading');

  const en = _resIsEn();
  const applyItems = function (items, fromRemote) {
    statusEl.textContent = fromRemote ? tr('reslib.loadedRemote') : tr('reslib.loadedLocal');
    if (!items.length) {
      grid.style.display = 'none';
      emptyEl.style.display = 'block';
      emptyEl.innerHTML =
        '<div style="font-size:42px;margin-bottom:12px;opacity:.35">📚</div>' +
        '<div>' + tr('reslib.empty') + '</div>' +
        '<div style="margin-top:16px;font-size:12px;opacity:.85">' + tr('reslib.hint') + '</div>';
      return;
    }
    grid.style.display = '';
    items.forEach(function (it) {
      const title = (en && it.titleEn) ? it.titleEn : (it.title || it.titleEn || '');
      const desc = (en && it.descEn) ? it.descEn : (it.desc || it.descEn || '');
      const tag = (en && it.tagEn) ? it.tagEn : (it.tag || it.type || 'link');
      const icon = _typeIcon(it.type);
      const card = document.createElement('div');
      card.className = 'algo-card reslib-card';
      card.style.pointerEvents = 'none';
      card.innerHTML =
        '<div class="algo-card-header">' +
          '<div class="algo-title-row">' +
            '<span class="algo-name" style="font-size:20px;line-height:1">' + icon + '</span>' +
            '<span class="algo-name" style="white-space:normal">' + _esc(title) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="algo-card-body">' +
          (desc ? '<div class="algo-desc">' + _esc(desc) + '</div>' : '<div class="algo-desc" style="opacity:.5">—</div>') +
          '<div class="algo-tags"><span class="algo-tag">' + _esc(String(tag)) + '</span></div>' +
          '<div class="algo-btn-row">' +
            '<a class="algo-load-btn" style="text-align:center;text-decoration:none;display:block;line-height:1.2;padding:9px;pointer-events:auto" href="' + _safeUrl(it.url) + '" target="_blank" rel="noopener noreferrer">' + tr('reslib.open') + '</a>' +
          '</div>' +
        '</div>';
      grid.appendChild(card);
    });
  };

  let inline = window.QEDU_RESOURCES_MANIFEST;
  if (inline && typeof inline === 'object') {
    applyItems(_normalizeManifest(inline), false);
    return;
  }

  const url = _resManifestUrl();
  if (!url) {
    statusEl.textContent = tr('reslib.noUrl');
    applyItems(RESLIB_FALLBACK_ITEMS.slice(), false);
    return;
  }

  // 命中缓存时直接渲染，无需重新 fetch
  if (_resCache) {
    applyItems(_resCache, true);
    return;
  }

  fetch(url, { cache: 'no-store', credentials: 'omit' })
    .then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    })
    .then(function (data) {
      _resCache = _normalizeManifest(data);
      applyItems(_resCache, true);
    })
    .catch(function () {
      statusEl.textContent = tr('reslib.err');
      applyItems(RESLIB_FALLBACK_ITEMS.slice(), false);
    });
}

function _esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function _safeUrl(s) {
  const str = String(s).trim();
  // 只允许 http / https 链接，其余一律替换为 #
  if (!/^https?:\/\//i.test(str)) return '#';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function refreshResLibI18n() {
  const root = document.getElementById('resv');
  if (root && root.style.display !== 'none') renderResourceLib();
}

window.renderResourceLib = renderResourceLib;
window.refreshResLibI18n = refreshResLibI18n;
window.refreshResLibI18N = refreshResLibI18n;
