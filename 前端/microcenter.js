// ── 微课中心 (microcenter.js) ──
// 职责：10节精品微课的数据、渲染与播放逻辑
// 原则：CSS 全部内联注入，不依赖外部样式文件

// ─── CSS 注入 ──────────────────────────────────────────────────────
;(function _injectMcCSS() {
  if (document.getElementById('mc-style')) return;
  const s = document.createElement('style');
  s.id = 'mc-style';
  s.textContent = `
  /* ── 微课中心页面容器 ── */
  #microv {
    padding: 0 0 60px;
    height: calc(100vh - 48px);
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--bg, #EFF1F5);
  }
  [data-theme="dark"] #microv,
  [data-theme="aurora"] #microv,
  [data-theme="space"] #microv {
    background: #050a1e;
  }

  .mc-page { max-width: 1180px; margin: 0 auto; padding: 0 32px 40px; }

  /* ── Hero 页头横幅 ── */
  .mc-hero {
    position: relative; overflow: hidden;
    padding: 48px 36px 40px;
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f2a4a 100%);
    margin-bottom: 0;
  }
  .mc-hero::before {
    content: ''; position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 60% 80% at 80% 50%, rgba(99,179,237,.13) 0%, transparent 70%),
      radial-gradient(ellipse 40% 60% at 20% 80%, rgba(128,90,213,.10) 0%, transparent 70%);
    pointer-events: none;
  }
  /* 装饰性网格线 */
  .mc-hero::after {
    content: ''; position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(99,179,237,.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(99,179,237,.06) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
  }
  .mc-hero-inner {
    position: relative; z-index: 1;
    max-width: 1180px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 24px;
  }
  .mc-hero-left { flex: 1; min-width: 280px; }
  .mc-hero-eyebrow {
    font-size: 11px; font-weight: 700; letter-spacing: 1.8px;
    color: rgba(99,179,237,.75); text-transform: uppercase; margin-bottom: 12px;
    display: flex; align-items: center; gap: 8px;
  }
  .mc-hero-eyebrow::before {
    content: ''; display: inline-block; width: 24px; height: 2px;
    background: linear-gradient(90deg, #63b3ed, transparent);
    border-radius: 2px;
  }
  .mc-hero-title {
    font-size: 30px; font-weight: 800; line-height: 1.2; letter-spacing: -.3px;
    background: linear-gradient(135deg, #fff 30%, #63b3ed 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text; margin-bottom: 10px;
  }
  .mc-hero-sub {
    font-size: 13px; color: rgba(226,232,240,.55); line-height: 1.7; max-width: 520px;
  }

  /* Hero 右侧统计卡片 */
  .mc-hero-stats {
    display: flex; gap: 12px; flex-shrink: 0;
  }
  .mc-stat-card {
    background: rgba(255,255,255,.06); border: 1px solid rgba(99,179,237,.18);
    border-radius: 12px; padding: 14px 20px; text-align: center; min-width: 80px;
    backdrop-filter: blur(8px);
  }
  .mc-stat-num {
    font-size: 24px; font-weight: 800;
    background: linear-gradient(135deg, #fff, #63b3ed);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    line-height: 1.1;
  }
  .mc-stat-label { font-size: 10px; color: rgba(226,232,240,.45); margin-top: 4px; letter-spacing: .4px; }

  /* ── 工具栏（过滤 + 计数） ── */
  .mc-toolbar {
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 12px;
    padding: 20px 36px 0;
    max-width: 1180px; margin: 0 auto;
    /* 从 hero 延伸出来的背景 */
    background: linear-gradient(180deg, rgba(15,23,42,.95) 0%, transparent 100%);
  }
  .mc-filter-bar { display: flex; gap: 8px; flex-wrap: wrap; }
  .mc-filter-btn {
    padding: 7px 18px; border-radius: 22px; font-size: 12px; font-weight: 600;
    cursor: pointer; border: 1.5px solid transparent; transition: all .18s;
    background: rgba(255,255,255,.07); color: rgba(226,232,240,.6);
    border-color: rgba(99,179,237,.15);
  }
  .mc-filter-btn:hover {
    background: rgba(99,179,237,.12); color: #e2e8f0; border-color: rgba(99,179,237,.35);
  }
  .mc-filter-btn.on {
    background: linear-gradient(135deg, #2b6cb0, #3182ce);
    color: #fff; border-color: transparent;
    box-shadow: 0 4px 14px rgba(49,130,206,.35);
  }
  /* 亮色主题下工具栏 */
  [data-theme="classic"] .mc-toolbar,
  :root:not([data-theme]) .mc-toolbar {
    background: transparent; padding-top: 24px;
  }
  [data-theme="classic"] .mc-filter-btn,
  :root:not([data-theme]) .mc-filter-btn {
    background: var(--surf, #F7F8FB); color: var(--t5, #64748b);
    border-color: var(--b1, #e2e8f0);
  }
  [data-theme="classic"] .mc-filter-btn:hover,
  :root:not([data-theme]) .mc-filter-btn:hover {
    border-color: var(--navy, #1B3A6B); color: var(--navy, #1B3A6B);
    background: rgba(27,58,107,.06);
  }
  [data-theme="classic"] .mc-filter-btn.on,
  :root:not([data-theme]) .mc-filter-btn.on {
    background: var(--navy, #1B3A6B); color: #fff; border-color: transparent;
    box-shadow: 0 4px 14px rgba(27,58,107,.25);
  }
  .mc-count-badge {
    font-size: 11px; padding: 4px 12px;
    background: rgba(49,130,206,.12); border: 1px solid rgba(99,179,237,.25);
    border-radius: 20px; color: #3182ce; font-weight: 700; letter-spacing: .3px;
    white-space: nowrap;
  }
  [data-theme="classic"] .mc-count-badge,
  :root:not([data-theme]) .mc-count-badge { color: #2b6cb0; }

  /* ── 模块分隔标题 ── */
  .mc-section-hd {
    display: flex; align-items: center; gap: 12px;
    margin: 28px 0 16px;
  }
  .mc-section-hd-line {
    flex: 1; height: 1px;
    background: linear-gradient(90deg, var(--b1, #e2e8f0), transparent);
  }
  .mc-section-hd-text {
    font-size: 11px; font-weight: 700; letter-spacing: 1px;
    color: var(--t3, #94a3b8); white-space: nowrap; text-transform: uppercase;
  }
  [data-theme="dark"] .mc-section-hd-text,
  [data-theme="aurora"] .mc-section-hd-text,
  [data-theme="space"] .mc-section-hd-text { color: rgba(226,232,240,.3); }
  [data-theme="dark"] .mc-section-hd-line,
  [data-theme="aurora"] .mc-section-hd-line,
  [data-theme="space"] .mc-section-hd-line {
    background: linear-gradient(90deg, rgba(99,179,237,.2), transparent);
  }

  /* ── 视频卡片网格 ── */
  .mc-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
  }
  @media (max-width: 1020px) { .mc-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 640px)  { .mc-grid { grid-template-columns: 1fr; } }

  /* ── 单张视频卡片 ── */
  .mc-card {
    background: var(--white, #fff);
    border: 1px solid var(--b1, #e2e8f0);
    border-radius: 16px; overflow: hidden;
    cursor: pointer; transition: transform .24s cubic-bezier(.34,1.56,.64,1), box-shadow .24s, border-color .24s;
    display: flex; flex-direction: column;
    position: relative;
  }
  .mc-card:hover {
    transform: translateY(-6px) scale(1.01);
    box-shadow: 0 20px 48px rgba(49,130,206,.18), 0 4px 12px rgba(0,0,0,.06);
    border-color: rgba(99,179,237,.55);
  }
  [data-theme="dark"] .mc-card,
  [data-theme="aurora"] .mc-card,
  [data-theme="space"] .mc-card {
    background: rgba(12,24,64,.75);
    border-color: rgba(99,179,237,.12);
    backdrop-filter: blur(12px);
  }
  [data-theme="dark"] .mc-card:hover,
  [data-theme="aurora"] .mc-card:hover,
  [data-theme="space"] .mc-card:hover {
    box-shadow: 0 20px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(99,179,237,.3);
    border-color: rgba(99,179,237,.4);
  }

  /* ── 缩略图区 ── */
  .mc-thumb {
    position: relative; width: 100%; aspect-ratio: 16/9;
    overflow: hidden; flex-shrink: 0;
  }
  .mc-thumb-bg {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    font-size: 52px; transition: transform .35s ease;
    position: relative;
  }
  /* 网格纹理叠层 */
  .mc-thumb-bg::after {
    content: ''; position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px);
    background-size: 20px 20px;
    pointer-events: none;
  }
  .mc-card:hover .mc-thumb-bg { transform: scale(1.08); }

  /* 各卡片渐变色方案 */
  .mc-thumb-bg.v1  { background: linear-gradient(135deg,#1a237e 0%,#283593 50%,#1565c0 100%); }
  .mc-thumb-bg.v2  { background: linear-gradient(135deg,#1b5e20 0%,#2e7d32 50%,#388e3c 100%); }
  .mc-thumb-bg.v3  { background: linear-gradient(135deg,#006064 0%,#00838f 50%,#0097a7 100%); }
  .mc-thumb-bg.v4  { background: linear-gradient(135deg,#4a148c 0%,#6a1b9a 50%,#7b1fa2 100%); }
  .mc-thumb-bg.v5  { background: linear-gradient(135deg,#880e4f 0%,#ad1457 50%,#c2185b 100%); }
  .mc-thumb-bg.v6  { background: linear-gradient(135deg,#bf360c 0%,#d84315 50%,#e64a19 100%); }
  .mc-thumb-bg.v7  { background: linear-gradient(135deg,#004d40 0%,#00695c 50%,#00796b 100%); }
  .mc-thumb-bg.v8  { background: linear-gradient(135deg,#0d2137 0%,#0d47a1 50%,#1565c0 100%); }
  .mc-thumb-bg.v9  { background: linear-gradient(135deg,#33691e 0%,#558b2f 50%,#689f38 100%); }
  .mc-thumb-bg.v10 { background: linear-gradient(135deg,#b71c1c 0%,#e65100 50%,#f57c00 100%); }

  /* 播放遮罩 */
  .mc-play-overlay {
    position: absolute; inset: 0;
    background: rgba(0,0,0,0); transition: background .22s;
    display: flex; align-items: center; justify-content: center;
  }
  .mc-card:hover .mc-play-overlay { background: rgba(0,0,0,.35); }
  .mc-play-btn {
    width: 54px; height: 54px; border-radius: 50%;
    background: rgba(255,255,255,.95); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; padding-left: 3px;
    opacity: 0; transform: scale(.7);
    transition: opacity .22s, transform .28s cubic-bezier(.34,1.56,.64,1);
    box-shadow: 0 8px 28px rgba(0,0,0,.4);
    color: #1a237e;
  }
  .mc-card:hover .mc-play-btn { opacity: 1; transform: scale(1); }

  /* 时长徽章 */
  .mc-duration {
    position: absolute; bottom: 8px; right: 8px;
    padding: 3px 8px; border-radius: 5px;
    background: rgba(0,0,0,.78); color: #fff;
    font-size: 11px; font-weight: 700; font-family: var(--mono, monospace);
    letter-spacing: .5px; backdrop-filter: blur(4px);
  }

  /* 序号徽章 */
  .mc-num {
    position: absolute; top: 9px; left: 9px;
    height: 22px; padding: 0 8px; border-radius: 6px;
    background: rgba(0,0,0,.6); color: rgba(255,255,255,.92);
    font-size: 10px; font-weight: 800; font-family: var(--mono, monospace);
    display: flex; align-items: center; letter-spacing: .5px;
    border: 1px solid rgba(255,255,255,.2); backdrop-filter: blur(4px);
  }

  /* 底部"立即观看"行 */
  .mc-card-foot {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 16px 14px; margin-top: auto; border-top: 1px solid var(--b1, #f1f5f9);
  }
  [data-theme="dark"] .mc-card-foot,
  [data-theme="aurora"] .mc-card-foot,
  [data-theme="space"] .mc-card-foot { border-top-color: rgba(99,179,237,.08); }
  .mc-card-watch {
    font-size: 11px; font-weight: 700; letter-spacing: .4px;
    color: #3182ce; display: flex; align-items: center; gap: 5px;
    transition: gap .18s;
  }
  .mc-card:hover .mc-card-watch { gap: 8px; }
  [data-theme="dark"] .mc-card-watch,
  [data-theme="aurora"] .mc-card-watch,
  [data-theme="space"] .mc-card-watch { color: #63b3ed; }

  /* ── 卡片信息区 ── */
  .mc-info { padding: 14px 16px 10px; display: flex; flex-direction: column; flex: 1; }

  .mc-module-tag {
    font-size: 10px; font-weight: 700; letter-spacing: .6px;
    padding: 3px 9px; border-radius: 5px; display: inline-block;
    margin-bottom: 8px; width: fit-content; text-transform: uppercase;
  }
  .mc-module-tag.mod1 { background: rgba(49,130,206,.1); color: #2b6cb0; }
  .mc-module-tag.mod2 { background: rgba(13,115,119,.1); color: #0d7377; }
  .mc-module-tag.mod3 { background: rgba(128,90,213,.1); color: #6b46c1; }
  [data-theme="dark"] .mc-module-tag.mod1,
  [data-theme="aurora"] .mc-module-tag.mod1,
  [data-theme="space"] .mc-module-tag.mod1 { background: rgba(49,130,206,.15); color: #63b3ed; }
  [data-theme="dark"] .mc-module-tag.mod2,
  [data-theme="aurora"] .mc-module-tag.mod2,
  [data-theme="space"] .mc-module-tag.mod2 { background: rgba(13,115,119,.15); color: #81e6d9; }
  [data-theme="dark"] .mc-module-tag.mod3,
  [data-theme="aurora"] .mc-module-tag.mod3,
  [data-theme="space"] .mc-module-tag.mod3 { background: rgba(128,90,213,.15); color: #b794f4; }

  .mc-card-title {
    font-size: 13.5px; font-weight: 700; line-height: 1.5;
    color: var(--t9, #0f172a); margin-bottom: 7px;
  }
  [data-theme="dark"] .mc-card-title,
  [data-theme="aurora"] .mc-card-title,
  [data-theme="space"] .mc-card-title { color: #e2e8f0; }

  .mc-card-desc {
    font-size: 11.5px; color: var(--t5, #64748b); line-height: 1.65;
    margin-bottom: 10px; flex: 1;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  [data-theme="dark"] .mc-card-desc,
  [data-theme="aurora"] .mc-card-desc,
  [data-theme="space"] .mc-card-desc { color: rgba(226,232,240,.45); }

  .mc-tags { display: flex; flex-wrap: wrap; gap: 5px; }
  .mc-tag {
    font-size: 10px; padding: 2px 7px; border-radius: 4px;
    background: var(--surf, #F7F8FB); border: 1px solid var(--b1, #e2e8f0);
    color: var(--t5, #64748b);
  }
  [data-theme="dark"] .mc-tag,
  [data-theme="aurora"] .mc-tag,
  [data-theme="space"] .mc-tag {
    background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.08);
    color: rgba(226,232,240,.4);
  }

  /* ── 视频播放弹窗（主题自适应：所有颜色使用 CSS 变量）── */
  #mc-modal {
    display: none; position: fixed; inset: 0; z-index: 9998;
    background: rgba(0,0,0,.72); backdrop-filter: blur(16px);
    align-items: center; justify-content: center; padding: 24px;
    animation: mcModalFadeIn .2s ease;
  }
  #mc-modal.open { display: flex; }
  @keyframes mcModalFadeIn { from { opacity: 0 } to { opacity: 1 } }

  .mc-modal-box {
    max-width: 880px; width: 100%;
    background: var(--surf); border: 1px solid var(--b1);
    border-radius: 20px; overflow: hidden;
    box-shadow: 0 32px 80px rgba(0,0,0,.35), 0 0 0 1px rgba(0,0,0,.06);
    display: flex; flex-direction: column;
    max-height: 92vh;
    animation: mcBoxSlideIn .24s cubic-bezier(.34,1.4,.64,1);
  }
  @keyframes mcBoxSlideIn { from { transform: scale(.94) translateY(16px); opacity: 0 } to { transform: scale(1) translateY(0); opacity: 1 } }

  /* 弹窗顶部彩色渐变条 */
  .mc-modal-accent {
    height: 3px; flex-shrink: 0;
    background: linear-gradient(90deg, var(--navy) 0%, var(--navy-mid,var(--navy)) 40%, var(--purple) 70%, #ed64a6 100%);
  }

  .mc-modal-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding: 18px 22px 14px; border-bottom: 1px solid var(--b1);
    gap: 12px; flex-shrink: 0;
  }
  .mc-modal-meta { flex: 1; }
  .mc-modal-num  {
    font-size: 10px; font-weight: 800; letter-spacing: 1px;
    color: var(--navy); margin-bottom: 6px;
    text-transform: uppercase; opacity: .75;
  }
  .mc-modal-title {
    font-size: 17px; font-weight: 700; color: var(--t9); line-height: 1.4;
  }
  .mc-modal-close {
    width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
    background: var(--navy-xs,rgba(0,0,0,.04)); border: 1px solid var(--b1);
    color: var(--t5); font-size: 15px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: .18s;
    margin-top: 1px;
  }
  .mc-modal-close:hover {
    background: rgba(239,68,68,.1); color: var(--red,#EF4444);
    border-color: rgba(239,68,68,.25);
  }

  .mc-modal-player {
    position: relative; background: #000; flex-shrink: 0;
  }
  .mc-modal-video {
    width: 100%; max-height: 460px; display: block; outline: none;
  }

  /* 无视频占位图 */
  .mc-modal-nf {
    aspect-ratio: 16/9; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 16px;
    background: linear-gradient(135deg, var(--bg), var(--surf3,var(--b1)), var(--bg));
    position: relative; overflow: hidden;
  }
  .mc-modal-nf::before {
    content: ''; position: absolute; inset: 0;
    background-image:
      linear-gradient(var(--b1) 1px, transparent 1px),
      linear-gradient(90deg, var(--b1) 1px, transparent 1px);
    background-size: 32px 32px; opacity: .5;
  }
  .mc-modal-nf-icon { font-size: 48px; position: relative; z-index: 1; }
  .mc-modal-nf-title {
    font-size: 14px; font-weight: 700; color: var(--t5);
    position: relative; z-index: 1;
  }
  .mc-modal-nf-path {
    font-size: 11px; color: var(--t3,var(--t5)); font-family: var(--mono, monospace);
    background: var(--navy-xs,rgba(0,0,0,.04)); padding: 4px 12px; border-radius: 6px;
    border: 1px solid var(--b1); position: relative; z-index: 1;
  }
  .mc-modal-nf-hint {
    font-size: 11px; color: var(--navy); opacity: .7;
    position: relative; z-index: 1;
  }

  .mc-modal-body {
    padding: 18px 22px 22px; overflow-y: auto; flex: 1;
  }
  .mc-modal-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
  .mc-modal-tag {
    font-size: 11px; padding: 4px 10px; border-radius: 6px;
    background: var(--navy-xs,rgba(49,130,206,.08)); border: 1px solid var(--navy-lt,rgba(49,130,206,.18));
    color: var(--navy); font-weight: 500;
  }
  .mc-modal-desc {
    font-size: 13.5px; color: var(--t5); line-height: 1.8;
    border-left: 2px solid var(--b2,var(--b1)); padding-left: 14px;
  }

  /* ── 自定义控制栏 ── */
  .mc-ctrl-bar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 16px; flex-shrink: 0; flex-wrap: wrap; gap: 8px;
    background: var(--bg); border-top: 1px solid var(--b1);
    border-bottom: 1px solid var(--b1);
  }
  .mc-ctrl-hints {
    display: flex; gap: 10px; align-items: center; flex-shrink: 0;
  }
  .mc-hint-item {
    font-size: 10px; color: var(--t3,var(--t5)); opacity: .7; letter-spacing: .3px;
    display: flex; align-items: center; gap: 4px;
  }
  .mc-hint-key {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 20px; height: 16px; padding: 0 4px;
    background: var(--surf); border: 1px solid var(--b1);
    border-radius: 3px; font-size: 9px; font-family: var(--mono, monospace);
    color: var(--t5); line-height: 1;
  }
  .mc-ctrl-group {
    display: flex; align-items: center; gap: 5px;
  }
  .mc-ctrl-label {
    font-size: 10px; color: var(--t5); opacity: .65; letter-spacing: .5px;
    margin-right: 4px; white-space: nowrap;
  }
  /* 倍速按钮 */
  .mc-speed-btn {
    padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700;
    font-family: var(--mono, monospace); letter-spacing: .3px;
    cursor: pointer; border: 1px solid var(--b1);
    background: var(--surf); color: var(--t5);
    transition: all .15s;
  }
  .mc-speed-btn:hover { background: var(--navy-xs,rgba(49,130,206,.08)); color: var(--navy); border-color: var(--navy-lt,rgba(49,130,206,.3)); }
  .mc-speed-btn.on {
    background: var(--navy-lt,rgba(49,130,206,.15)); color: var(--navy);
    border-color: var(--navy); box-shadow: 0 0 0 2px var(--navy-xs,rgba(49,130,206,.12));
  }
  /* 功能按钮（PiP / 截图） */
  .mc-ctrl-btn {
    display: flex; align-items: center; gap: 5px;
    padding: 5px 11px; border-radius: 7px; font-size: 11px; font-weight: 600;
    cursor: pointer; border: 1px solid var(--b1);
    background: var(--surf); color: var(--t5);
    transition: all .15s; white-space: nowrap;
  }
  .mc-ctrl-btn:hover { background: var(--navy-xs,rgba(49,130,206,.08)); color: var(--navy); border-color: var(--navy-lt,rgba(49,130,206,.3)); }
  .mc-ctrl-btn:disabled { opacity: .3; cursor: not-allowed; }
  .mc-ctrl-btn.pip-active { background: var(--navy-lt,rgba(49,130,206,.15)); color: var(--navy); border-color: var(--navy); }
  /* 分隔线 */
  .mc-ctrl-sep {
    width: 1px; height: 20px; background: var(--b1); flex-shrink: 0;
  }

  /* ── Toast 提示 ── */
  .mc-toast {
    position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
    background: var(--t9); border: 1px solid var(--b2,var(--b1));
    color: var(--bg); font-size: 13px; padding: 10px 20px; border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,.25); z-index: 99999;
    pointer-events: none; white-space: nowrap;
    animation: mcToastIn .2s ease, mcToastOut .3s ease 1.7s forwards;
  }
  @keyframes mcToastIn  { from { opacity:0; transform:translateX(-50%) translateY(10px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }
  @keyframes mcToastOut { from { opacity:1 } to { opacity:0 } }

  /* ── 无数据提示 ── */
  .mc-empty {
    grid-column: 1 / -1; padding: 80px 24px;
    text-align: center; color: var(--t3, #94a3b8); font-size: 13px;
  }
  [data-theme="dark"] .mc-empty,
  [data-theme="aurora"] .mc-empty,
  [data-theme="space"] .mc-empty { color: rgba(226,232,240,.25); }

  /* ── 学习模式 FAB ── */
  #mc-fab {
    position: fixed; bottom: 28px; right: 28px; z-index: 8100;
    display: flex; align-items: center; gap: 7px;
    background: var(--navy); color: #fff;
    border: none; border-radius: 50px; padding: 11px 20px 11px 16px;
    font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--sans);
    box-shadow: 0 4px 18px rgba(0,0,0,.22), 0 1px 4px rgba(0,0,0,.12);
    transition: transform .18s, box-shadow .18s, background .15s;
    user-select: none;
  }
  #mc-fab:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,.28); }
  #mc-fab:active { transform: translateY(0); }
  #mc-fab .mc-fab-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: rgba(255,255,255,.55); flex-shrink: 0;
    animation: mcFabPulse 2s ease-in-out infinite;
  }
  @keyframes mcFabPulse { 0%,100%{opacity:.55;transform:scale(1)} 50%{opacity:1;transform:scale(1.3)} }

  /* ── 快速学习面板 ── */
  #mc-ql-panel {
    position: fixed; bottom: 82px; right: 28px; z-index: 8090;
    width: 310px; max-height: 500px;
    background: var(--surf); border: 1px solid var(--b1);
    border-radius: 16px; overflow: hidden;
    box-shadow: 0 16px 56px rgba(0,0,0,.22), 0 2px 8px rgba(0,0,0,.1);
    display: none; flex-direction: column;
    transform-origin: bottom right;
  }
  #mc-ql-panel.open {
    display: flex;
    animation: mcQlIn .22s cubic-bezier(.34,1.4,.64,1);
  }
  @keyframes mcQlIn {
    from { opacity:0; transform:scale(.9) translateY(12px) }
    to   { opacity:1; transform:scale(1) translateY(0) }
  }
  .mc-ql-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 13px 14px 11px; border-bottom: 1px solid var(--b1);
    flex-shrink: 0;
  }
  .mc-ql-head-title { font-size: 13px; font-weight: 700; color: var(--t9); }
  .mc-ql-head-count { font-size: 11px; color: var(--t5); }
  .mc-ql-list { overflow-y: auto; flex: 1; padding: 6px; }
  .mc-ql-mod-hd {
    font-size: 10px; font-weight: 700; color: var(--t3,var(--t5));
    letter-spacing: .6px; text-transform: uppercase;
    padding: 8px 8px 4px; opacity: .7;
  }
  .mc-ql-item {
    display: flex; align-items: center; gap: 9px;
    padding: 8px 9px; border-radius: 10px; cursor: pointer;
    transition: background .14s;
  }
  .mc-ql-item:hover { background: var(--navy-xs,rgba(0,0,0,.04)); }
  .mc-ql-icon { font-size: 1.25rem; flex-shrink: 0; width: 28px; text-align: center; }
  .mc-ql-info { flex: 1; min-width: 0; }
  .mc-ql-title {
    font-size: 12px; font-weight: 600; color: var(--t9);
    line-height: 1.35; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .mc-ql-meta { font-size: 10px; color: var(--t5); margin-top: 2px; }
  .mc-ql-dur {
    font-size: 10px; font-family: var(--mono); color: var(--t3,var(--t5));
    flex-shrink: 0; white-space: nowrap;
  }
  `;
  document.head.appendChild(s);
})();

// ─── 10 节微课数据 ─────────────────────────────────────────────────

const MC_VIDEOS = [
  // ── 模块一：算力危机与下一代计算 ──────────────────────────────────
  {
    id: 1, mod: 1,
    modLabel: '模块一：算力危机与下一代计算',
    icon: '⚡',  colorCls: 'v1',
    title: '摩尔定律的黄昏：AI 为什么需要新算力？',
    file:  'videos/micro01_mooreslaw.mp4',
    duration: '2:45',
    tags: ['AI算力', '摩尔定律', '量子计算引入'],
    desc: '传统芯片尺寸逼近物理极限，AI 训练的算力需求呈指数级增长。本节以 GPT 训练成本为切入，引出量子计算作为突破算力瓶颈的下一代方向。',
  },
  {
    id: 2, mod: 1,
    modLabel: '模块一：算力危机与下一代计算',
    icon: '🪙', colorCls: 'v2',
    title: '经典比特 vs 量子比特：硬币的启示',
    file:  'videos/micro02_qubit.mp4',
    duration: '2:30',
    tags: ['量子比特', '叠加态', '基础概念'],
    desc: '放在桌上的硬币只能是正面或反面（0或1），而旋转中的硬币同时是两面。本节用最直观的类比建立量子叠加态的第一印象。',
  },

  // ── 模块二：量子计算基础逻辑 ───────────────────────────────────────
  {
    id: 3, mod: 2,
    modLabel: '模块二：量子计算基础逻辑',
    icon: '🎛️', colorCls: 'v3',
    title: '量子门与控制：如何操控空中的硬币？',
    file:  'videos/micro03_gates.mp4',
    duration: '3:00',
    tags: ['量子门', 'H门', 'X门', '平台演示'],
    desc: '介绍 X 门（翻转）与 H 门（叠加）的直觉含义，并结合 Q-Edu 平台实时拖拽演示，展示虚拟仿真与量子理论如何融合。',
  },
  {
    id: 4, mod: 2,
    modLabel: '模块二：量子计算基础逻辑',
    icon: '⚛️', colorCls: 'v4',
    title: '量子叠加：并行计算的物理魔法',
    file:  'videos/micro04_superposition.mp4',
    duration: '2:50',
    tags: ['叠加态', '量子并行', '指数加速'],
    desc: '10 个量子比特能同时表示 1024 个状态，100 个量子比特能表示的数比宇宙中原子总数还多。这就是量子并行计算的真正威力。',
  },
  {
    id: 5, mod: 2,
    modLabel: '模块二：量子计算基础逻辑',
    icon: '🔗', colorCls: 'v5',
    title: '量子纠缠：超越距离的神秘连结',
    file:  'videos/micro05_entanglement.mp4',
    duration: '3:00',
    tags: ['量子纠缠', 'Bell态', 'CNOT门'],
    desc: '用双胞胎心灵感应的比喻解释量子纠缠：测量其中一个粒子，另一个的状态瞬间确定——爱因斯坦称之为"鬼魅般的超距作用"。',
  },
  {
    id: 6, mod: 2,
    modLabel: '模块二：量子计算基础逻辑',
    icon: '🎲', colorCls: 'v6',
    title: '测量与坍缩：为什么结果总是概率？',
    file:  'videos/micro06_measurement.mp4',
    duration: '2:30',
    tags: ['量子测量', '波函数坍缩', '不确定性'],
    desc: '观测这一动作本身就会改变量子态。本节解释为什么量子结果是概率性的，以及平台每次运行为何可能给出不同答案。',
  },

  // ── 模块三：量子人工智能应用 ───────────────────────────────────────
  {
    id: 7, mod: 3,
    modLabel: '模块三：量子人工智能应用',
    icon: '🔍', colorCls: 'v7',
    title: '大海捞针：Grover 算法如何加速搜索？',
    file:  'videos/micro07_grover.mp4',
    duration: '3:00',
    tags: ['Grover算法', 'AI搜索', '平方加速'],
    desc: '经典搜索平均找 N/2 次，Grover 只需 √N 次。100 万个选项：经典约 50 万次，量子仅 1000 次。本节用振幅放大的动画直观展示背后的物理机制。',
  },
  {
    id: 8, mod: 3,
    modLabel: '模块三：量子人工智能应用',
    icon: '🕸️', colorCls: 'v8',
    title: '社交网络分组：QAOA 如何帮 AI 分析关系网络？',
    file:  'videos/micro08_qaoa_intro.mp4',
    duration: '2:45',
    tags: ['图优化', 'Max-Cut', '组合优化', 'AI应用'],
    desc: '把一群人分成两组，让互相认识的人尽量在不同组——这是 Max-Cut 问题，也是推荐系统、芯片布局等 AI 任务的底层模型。本节介绍 QAOA 的直觉原理。',
  },
  {
    id: 9, mod: 3,
    modLabel: '模块三：量子人工智能应用',
    icon: '🧩', colorCls: 'v9',
    title: 'QAOA：量子如何解决组合优化？',
    file:  'videos/micro09_qaoa_demo.mp4',
    duration: '3:00',
    tags: ['QAOA', '量子优化', '平台演示'],
    desc: '结合 Q-Edu 平台的 QAOA 模块，直观展示量子计算如何在候选解的"量子叠加"中同时评估，找到最优分组方案，并与经典暴力搜索对比效率。',
  },
  {
    id: 10, mod: 3,
    modLabel: '模块三：量子人工智能应用',
    icon: '📉', colorCls: 'v10',
    title: '量子版梯度下降：AI 训练的量子加速',
    file:  'videos/micro10_vqe.mp4',
    duration: '2:50',
    tags: ['VQE', '梯度下降', 'AI优化', '能量景观'],
    desc: '经典 AI 训练本质是在参数空间里找能量最低点（损失函数最小值）。VQE 用量子比特完成同样的任务，并通过 3D 能量景观可视化直观展示优化过程。',
  },
];

// ─── 状态 ──────────────────────────────────────────────────────────
let _mcFilter = 0;   // 0=全部，1/2/3=对应模块
let _mcSpeed  = 1;   // 当前倍速，跨视频保留

// ─── 渲染入口（首次切换到微课中心时调用）──────────────────────────

function renderMicroCenter() {
  const root = document.getElementById('microv');
  if (!root || root.dataset.mcInited) return;
  root.dataset.mcInited = '1';

  root.innerHTML =
    // ── Hero 横幅 ──
    '<div class="mc-hero">' +
      '<div class="mc-hero-inner">' +
        '<div class="mc-hero-left">' +
          '<div class="mc-hero-eyebrow">Q-Edu · 微课中心</div>' +
          '<div class="mc-hero-title">精品量子微课</div>' +
          '<div class="mc-hero-sub">10 节精心制作的短视频微课，每节 2–3 分钟。从 AI 算力危机到量子基础，再到量子 AI 应用，帮你快速建立量子直觉。</div>' +
        '</div>' +
        '<div class="mc-hero-stats">' +
          '<div class="mc-stat-card"><div class="mc-stat-num">10</div><div class="mc-stat-label">节微课</div></div>' +
          '<div class="mc-stat-card"><div class="mc-stat-num">3</div><div class="mc-stat-label">学习模块</div></div>' +
          '<div class="mc-stat-card"><div class="mc-stat-num">~25</div><div class="mc-stat-label">分钟总时长</div></div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    // ── 知识点自测入口 ──
    '<div style="padding:0 24px 4px;display:flex;justify-content:flex-end;">' +
      '<button onclick="openQuiz()" style="display:inline-flex;align-items:center;gap:7px;' +
        'background:var(--navy);color:#fff;border:none;border-radius:10px;' +
        'padding:9px 18px;font-size:13px;font-weight:600;cursor:pointer;' +
        'font-family:var(--sans);box-shadow:0 2px 10px rgba(0,0,0,.15);transition:filter .15s;"' +
        ' onmouseover="this.style.filter=\'brightness(1.1)\'" onmouseout="this.style.filter=\'\'">' +
        '📝 知识点自测' +
      '</button>' +
    '</div>' +
    // ── 工具栏 ──
    '<div class="mc-toolbar">' +
      '<div class="mc-filter-bar" id="mc-filter-bar"></div>' +
      '<span class="mc-count-badge" id="mc-count-badge">10 节</span>' +
    '</div>' +
    // ── 卡片网格 ──
    '<div class="mc-page">' +
      '<div class="mc-grid" id="mc-grid"></div>' +
    '</div>' +
    // ── 播放弹窗 ──
    '<div id="mc-modal" onclick="_mcModalBgClick(event)">' +
      '<div class="mc-modal-box" id="mc-modal-box">' +
        '<div class="mc-modal-accent"></div>' +
        '<div class="mc-modal-header">' +
          '<div class="mc-modal-meta">' +
            '<div class="mc-modal-num" id="mc-modal-num"></div>' +
            '<div class="mc-modal-title" id="mc-modal-title"></div>' +
          '</div>' +
          '<button class="mc-modal-close" onclick="closeMicroVideo()" title="关闭（ESC）">✕</button>' +
        '</div>' +
        '<div class="mc-modal-player" id="mc-modal-player"></div>' +
        '<div class="mc-ctrl-bar" id="mc-ctrl-bar"></div>' +
        '<div class="mc-modal-body">' +
          '<div class="mc-modal-tags" id="mc-modal-tags"></div>' +
          '<div class="mc-modal-desc" id="mc-modal-desc"></div>' +
        '</div>' +
      '</div>' +
    '</div>';

  _mcRenderFilters();
  _mcRenderGrid();
}

// ─── 过滤 Tab ──────────────────────────────────────────────────────

function _mcRenderFilters() {
  const bar = document.getElementById('mc-filter-bar');
  if (!bar) return;

  const modules = [
    { id: 0, label: '全部（10节）' },
    { id: 1, label: '模块一：算力危机' },
    { id: 2, label: '模块二：量子基础' },
    { id: 3, label: '模块三：量子AI应用' },
  ];

  bar.innerHTML = modules.map(function(m) {
    return '<button class="mc-filter-btn' + (_mcFilter === m.id ? ' on' : '') + '" onclick="_mcSetFilter(' + m.id + ')">' + m.label + '</button>';
  }).join('');
}

function _mcSetFilter(mod) {
  _mcFilter = mod;
  _mcRenderFilters();
  _mcRenderGrid();
}

// ─── 卡片网格 ──────────────────────────────────────────────────────

function _mcRenderGrid() {
  const grid = document.getElementById('mc-grid');
  const badge = document.getElementById('mc-count-badge');
  if (!grid) return;

  const list = _mcFilter === 0
    ? MC_VIDEOS
    : MC_VIDEOS.filter(function(v) { return v.mod === _mcFilter; });

  if (badge) badge.textContent = list.length + ' 节';

  if (list.length === 0) {
    grid.innerHTML = '<div class="mc-empty">该模块暂无视频</div>';
    return;
  }

  var modLabels = {
    1: '模块一 · 算力危机与下一代计算',
    2: '模块二 · 量子计算基础逻辑',
    3: '模块三 · 量子人工智能应用',
  };

  var html = '';
  var lastMod = -1;

  list.forEach(function(v) {
    // 仅"全部"视图下插入模块分隔标题（grid-column:1/-1 占满整行）
    if (_mcFilter === 0 && v.mod !== lastMod) {
      html +=
        '<div class="mc-section-hd" style="grid-column:1/-1">' +
          '<div class="mc-section-hd-line"></div>' +
          '<div class="mc-section-hd-text">' + modLabels[v.mod] + '</div>' +
          '<div class="mc-section-hd-line"></div>' +
        '</div>';
      lastMod = v.mod;
    }

    var tags = v.tags.slice(0, 3).map(function(t) {
      return '<span class="mc-tag">' + t + '</span>';
    }).join('');
    var modCls = 'mod' + v.mod;

    html +=
      '<div class="mc-card" onclick="openMicroVideo(' + v.id + ')" title="' + _escAttr(v.title) + '">' +
        '<div class="mc-thumb">' +
          '<div class="mc-thumb-bg ' + v.colorCls + '">' + v.icon + '</div>' +
          '<div class="mc-play-overlay"><div class="mc-play-btn">▶</div></div>' +
          '<div class="mc-num">EP' + String(v.id).padStart(2, '0') + '</div>' +
          '<div class="mc-duration">' + v.duration + '</div>' +
        '</div>' +
        '<div class="mc-info">' +
          '<div class="mc-module-tag ' + modCls + '">模块 ' + v.mod + '</div>' +
          '<div class="mc-card-title">' + _escHtml(v.title) + '</div>' +
          '<div class="mc-card-desc">' + _escHtml(v.desc) + '</div>' +
          '<div class="mc-tags">' + tags + '</div>' +
        '</div>' +
        '<div class="mc-card-foot">' +
          '<span class="mc-card-watch">立即观看 →</span>' +
          '<span style="font-size:11px;color:var(--t3,#94a3b8);font-family:var(--mono,monospace)">' + v.duration + '</span>' +
        '</div>' +
      '</div>';
  });

  grid.innerHTML = html;
}

// ─── 视频播放弹窗 ──────────────────────────────────────────────────

function openMicroVideo(id) {
  var v = MC_VIDEOS.find(function(x) { return x.id === id; });
  if (!v) return;

  var modal  = document.getElementById('mc-modal');
  var numEl  = document.getElementById('mc-modal-num');
  var titEl  = document.getElementById('mc-modal-title');
  var player = document.getElementById('mc-modal-player');
  var tagsEl = document.getElementById('mc-modal-tags');
  var descEl = document.getElementById('mc-modal-desc');
  if (!modal) return;

  if (numEl)  numEl.textContent  = '第 ' + String(v.id).padStart(2,'0') + ' 节 · ' + v.modLabel;
  if (titEl)  titEl.textContent  = v.title;
  if (descEl) descEl.textContent = v.desc;

  if (tagsEl) {
    tagsEl.innerHTML = v.tags.map(function(t) {
      return '<span class="mc-modal-tag">' + t + '</span>';
    }).join('');
  }

  if (player) {
    player.innerHTML =
      '<video class="mc-modal-video" id="mc-modal-vid" controls preload="metadata" ' +
          'onerror="this.style.display=\'none\';document.getElementById(\'mc-nf-' + v.id + '\').style.display=\'flex\'">' +
        '<source src="' + v.file + '" type="video/mp4">' +
      '</video>' +
      '<div class="mc-modal-nf" id="mc-nf-' + v.id + '" style="display:none">' +
        '<span class="mc-modal-nf-icon">' + v.icon + '</span>' +
        '<div class="mc-modal-nf-title">视频即将上线</div>' +
        '<div class="mc-modal-nf-path">' + v.file + '</div>' +
        '<div class="mc-modal-nf-hint">录制完成后将文件放入 videos/ 目录即可播放</div>' +
      '</div>';

    // 如果文件不存在，video 可能不触发 onerror，用 canplaythrough 检测
    var vid = player.querySelector('video');
    if (vid) {
      vid.addEventListener('error', function() {
        vid.style.display = 'none';
        var nf = document.getElementById('mc-nf-' + v.id);
        if (nf) nf.style.display = 'flex';
      });
    }
  }

  // ── 控制栏 ──
  var ctrlBar = document.getElementById('mc-ctrl-bar');
  if (ctrlBar) {
    var pipSupported = !!(document.pictureInPictureEnabled);
    ctrlBar.innerHTML =
      // 左：键盘快捷键提示
      '<div class="mc-ctrl-hints">' +
        '<span class="mc-hint-item"><span class="mc-hint-key">空格</span> 暂停</span>' +
        '<span class="mc-hint-item"><span class="mc-hint-key">←</span><span class="mc-hint-key">→</span> ±10s</span>' +
      '</div>' +
      // 中：倍速
      '<div class="mc-ctrl-group">' +
        '<span class="mc-ctrl-label">倍速</span>' +
        ['0.75', '1', '1.5', '2'].map(function(r) {
          var isOn = parseFloat(r) === _mcSpeed;
          return '<button class="mc-speed-btn' + (isOn ? ' on' : '') + '" data-rate="' + r + '" onclick="_mcSetSpeed(' + r + ')">' + r + '×</button>';
        }).join('') +
      '</div>' +
      // 右：PiP + 截图
      '<div class="mc-ctrl-group">' +
        '<div class="mc-ctrl-sep"></div>' +
        (pipSupported
          ? '<button class="mc-ctrl-btn" id="mc-pip-btn" onclick="_mcTogglePiP()" title="视频浮窗，可边看边操作平台">⧉ 画中画</button>'
          : '') +
        '<button class="mc-ctrl-btn" id="mc-shot-btn" onclick="_mcScreenshot(' + v.id + ')" title="截取当前帧保存为图片">📷 截图</button>' +
      '</div>';
  }

  // 视频就绪后：应用倍速；监听 PiP 状态变化
  var vid2 = document.getElementById('mc-modal-vid');
  if (vid2) {
    var _applySpeed = function() { vid2.playbackRate = _mcSpeed; };
    if (vid2.readyState >= 1) { _applySpeed(); }
    else { vid2.addEventListener('loadedmetadata', _applySpeed, { once: true }); }

    vid2.addEventListener('enterpictureinpicture', function() {
      var btn = document.getElementById('mc-pip-btn');
      if (btn) { btn.textContent = '⊠ 退出画中画'; btn.classList.add('pip-active'); }
    });
    vid2.addEventListener('leavepictureinpicture', function() {
      var btn = document.getElementById('mc-pip-btn');
      if (btn) { btn.textContent = '⧉ 画中画'; btn.classList.remove('pip-active'); }
    });
    // 视频播完 → 触发知识点自测提示
    vid2.addEventListener('ended', function() {
      if (typeof _maybeAutoQuiz === 'function') {
        setTimeout(function() { _maybeAutoQuiz('video'); }, 800);
      }
    }, { once: true });
  }

  modal.classList.add('open');
  document.addEventListener('keydown', _mcKeyHandler);
}

function closeMicroVideo() {
  var modal = document.getElementById('mc-modal');
  if (modal) modal.classList.remove('open');

  // 暂停视频，防止背景音
  var vid = document.getElementById('mc-modal-vid');
  if (vid) { vid.pause(); vid.currentTime = 0; }

  // 如果正在画中画，退出
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture().catch(function() {});
  }

  document.removeEventListener('keydown', _mcKeyHandler);
}

function _mcModalBgClick(e) {
  if (e.target === document.getElementById('mc-modal')) closeMicroVideo();
}

function _mcKeyHandler(e) {
  // 焦点在可交互元素上时不拦截（防止 Space 同时触发按钮点击和视频暂停）
  var tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;

  var vid = document.getElementById('mc-modal-vid');

  switch (e.key) {
    case 'Escape':
      closeMicroVideo();
      break;
    case ' ':
    case 'Spacebar':
      e.preventDefault();
      if (vid) { vid.paused ? vid.play() : vid.pause(); }
      break;
    case 'ArrowLeft':
      e.preventDefault();
      if (vid) vid.currentTime = Math.max(0, vid.currentTime - 10);
      break;
    case 'ArrowRight':
      e.preventDefault();
      if (vid) vid.currentTime = Math.min(vid.duration || Infinity, vid.currentTime + 10);
      break;
  }
}

// ─── 播放器功能函数 ────────────────────────────────────────────────

// 倍速切换
function _mcSetSpeed(rate) {
  _mcSpeed = rate;
  var vid = document.getElementById('mc-modal-vid');
  if (vid) vid.playbackRate = rate;
  document.querySelectorAll('.mc-speed-btn').forEach(function(b) {
    b.classList.toggle('on', parseFloat(b.dataset.rate) === rate);
  });
}

// 画中画切换
function _mcTogglePiP() {
  var vid = document.getElementById('mc-modal-vid');
  if (!vid) return;
  if (!document.pictureInPictureEnabled) {
    _mcToast('当前浏览器不支持画中画');
    return;
  }
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture().catch(function(err) { _mcToast('退出画中画失败：' + err.message); });
  } else {
    vid.requestPictureInPicture().catch(function(err) { _mcToast('进入画中画失败：' + err.message); });
  }
}

// 截图当前帧
function _mcScreenshot(videoId) {
  var vid = document.getElementById('mc-modal-vid');
  // 视频未加载或正显示占位图
  if (!vid || vid.style.display === 'none' || vid.readyState < 2) {
    _mcToast('视频加载后才能截图');
    return;
  }
  try {
    var canvas = document.createElement('canvas');
    canvas.width  = vid.videoWidth  || vid.clientWidth;
    canvas.height = vid.videoHeight || vid.clientHeight;
    canvas.getContext('2d').drawImage(vid, 0, 0, canvas.width, canvas.height);
    var a = document.createElement('a');
    a.href     = canvas.toDataURL('image/png');
    a.download = 'qedu-EP' + String(videoId).padStart(2, '0') + '-' + Date.now() + '.png';
    a.click();
    _mcToast('截图已保存');
  } catch (err) {
    _mcToast('截图失败（跨域视频不允许截图）');
  }
}

// 轻提示（自动消失）
function _mcToast(msg) {
  var old = document.querySelector('.mc-toast');
  if (old) old.remove();
  var el = document.createElement('div');
  el.className = 'mc-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function() { if (el.parentNode) el.remove(); }, 2100);
}

// ─── 工具函数 ──────────────────────────────────────────────────────

function _escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _escAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── 学习模式 FAB：页面加载后注入，始终可见 ──
(function _initLearningFAB() {
  function _build() {
    if (document.getElementById('mc-fab')) return; // 避免重复注入

    // ── 快速学习面板 ──
    const panel = document.createElement('div');
    panel.id = 'mc-ql-panel';
    panel.className = 'mc-ql-panel';

    // 按模块分组
    var mods = {};
    MC_VIDEOS.forEach(function(v) { (mods[v.mod] = mods[v.mod] || { label: v.modLabel, items: [] }).items.push(v); });

    var listHTML = '';
    Object.values(mods).forEach(function(m) {
      listHTML += '<div class="mc-ql-mod-hd">' + m.label + '</div>';
      m.items.forEach(function(v) {
        listHTML +=
          '<div class="mc-ql-item" onclick="_mcQuickPlay(' + v.id + ')" title="' + _escAttr(v.title) + '">' +
            '<div class="mc-ql-icon">' + v.icon + '</div>' +
            '<div class="mc-ql-info">' +
              '<div class="mc-ql-title">' + v.title + '</div>' +
              '<div class="mc-ql-meta">第 ' + String(v.id).padStart(2,'0') + ' 节</div>' +
            '</div>' +
            '<div class="mc-ql-dur">' + v.duration + '</div>' +
          '</div>';
      });
    });

    panel.innerHTML =
      '<div class="mc-ql-head">' +
        '<div class="mc-ql-head-title">📚 学习模式</div>' +
        '<div class="mc-ql-head-count">共 ' + MC_VIDEOS.length + ' 节微课</div>' +
      '</div>' +
      '<div class="mc-ql-list">' + listHTML + '</div>';

    document.body.appendChild(panel);

    // ── FAB 按钮 ──
    var btn = document.createElement('button');
    btn.id = 'mc-fab';
    btn.innerHTML = '<span class="mc-fab-dot"></span>学习模式';
    btn.setAttribute('title', '打开学习模式，随时观看微课');
    btn.onclick = function(e) { e.stopPropagation(); _mcToggleQuickLearn(); };
    document.body.appendChild(btn);

    // 点击外部关闭
    document.addEventListener('click', function(e) {
      var p = document.getElementById('mc-ql-panel');
      var b = document.getElementById('mc-fab');
      if (p && p.classList.contains('open') && !p.contains(e.target) && b && !b.contains(e.target)) {
        p.classList.remove('open');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _build);
  } else {
    _build();
  }
})();

// 切换快速学习面板
function _mcToggleQuickLearn() {
  var panel = document.getElementById('mc-ql-panel');
  if (panel) panel.classList.toggle('open');
}

// 快速播放：关闭面板 → 切换到微课中心 → 播放
function _mcQuickPlay(videoId) {
  var panel = document.getElementById('mc-ql-panel');
  if (panel) panel.classList.remove('open');

  // 若当前已在微课中心，直接播放
  var microv = document.getElementById('microv');
  if (microv && microv.style.display !== 'none') {
    if (typeof openMicroVideo === 'function') openMicroVideo(videoId);
    return;
  }

  // 否则先切换 tab，再播放
  var mcTab = document.querySelector('.ntab[onclick*="\'m\'"]');
  if (mcTab && typeof setView === 'function') setView('m', mcTab);
  requestAnimationFrame(function() {
    setTimeout(function() {
      if (typeof openMicroVideo === 'function') openMicroVideo(videoId);
    }, 120);
  });
}
