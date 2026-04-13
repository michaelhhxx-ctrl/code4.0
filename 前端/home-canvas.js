/* ══════════════════════════════════════════════════════════════════════
   home-canvas.js  —  Canvas 主题动画背景
   §1  initStarscape   → Space  主题：蓝色气态星球 + 粒子星环
   §2  initStarTrails  → Amber  主题：金色测地球 + 原子轨道
   所有效果均基于 Canvas 2D，矢量级清晰度，无需视频文件
══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── 伪随机数（确定性种子，每次刷新布局一致） ── */
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s ^= s << 13; s ^= s >> 17; s ^= s << 5;
      return (s >>> 0) / 4294967296;
    };
  }

  /* ════════════════════════════════════════════════════════════════════
     §1  STARSCAPE  —  蓝色气态星球 + 粒子光环（Space 主题）
     参考画面：黑色深空，中央大型蓝色发光星球，
     对角线粒子星环旋转，背景白/蓝/金色闪烁群星
  ════════════════════════════════════════════════════════════════════ */
  function initStarscape(canvas) {
    const ctx = canvas.getContext('2d');
    let W, H, cx, cy, R, PR;
    let raf;
    const rand = rng(0xA4B2C8);

    /* 背景星（250 颗，白/蓝/金三色调） */
    const bgStars = Array.from({ length: 250 }, () => ({
      nx:   rand(),
      ny:   rand(),
      r:    rand() * 1.4 + 0.2,
      base: rand() * 0.42 + 0.18,
      twk:  rand() * 0.32,
      ph:   rand() * Math.PI * 2,
      fr:   rand() * 0.013 + 0.004,
      tone: rand() < 0.20 ? 'gold' : rand() < 0.30 ? 'blue' : 'white',
    }));

    /* 星环粒子（700 颗，分内/中/外三轨道） */
    const RING_PARTICLES = 700;
    const ringPts = Array.from({ length: RING_PARTICLES }, () => ({
      a:     rand() * Math.PI * 2,
      spd:   (rand() * 0.35 + 0.80) * 0.00135,
      track: rand() < 0.33 ? 0 : rand() < 0.55 ? 1 : 2,
      sz:    rand() * 1.6 + 0.4,
      brt:   rand() * 0.55 + 0.45,
    }));

    /* 星环常数 */
    const RING_ROT   = Math.PI * 0.20;   // 整体旋转角（屏幕平面内）
    const RING_COMP  = 0.34;             // 垂直压缩 → 椭圆（透视感）
    const TRACK_SC   = [0.80, 1.00, 1.22];
    const TRACK_COL  = [
      [85,  215, 255],   // 内轨：亮青
      [155, 232, 255],   // 中轨：白蓝
      [218, 248, 255],   // 外轨：浅蓝白
    ];

    function resize() {
      PR = window.devicePixelRatio || 1;
      W  = canvas.offsetWidth;
      H  = canvas.offsetHeight;
      canvas.width  = W * PR;
      canvas.height = H * PR;
      ctx.setTransform(PR, 0, 0, PR, 0, 0);
      cx = W / 2;  cy = H / 2;
      R  = Math.min(W, H) * 0.162;
    }

    /* 将角度+轨道编号转为屏幕坐标，同时返回 depth（-1后/+1前） */
    function ringXY(angle, track) {
      const a  = R * 2.58 * TRACK_SC[track];
      const b  = a * RING_COMP;
      const lx = Math.cos(angle) * a;
      const ly = Math.sin(angle) * b;
      return {
        x:     cx + lx * Math.cos(RING_ROT) - ly * Math.sin(RING_ROT),
        y:     cy + lx * Math.sin(RING_ROT) + ly * Math.cos(RING_ROT),
        depth: Math.sin(angle),   // < 0 ⟹ 在星球后方
      };
    }

    let t = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      /* ── 深空背景 ── */
      ctx.fillStyle = '#010c1e';
      ctx.fillRect(0, 0, W, H);
      const neb = ctx.createRadialGradient(cx * 0.65, cy * 0.55, 0, cx * 0.65, cy * 0.55, W * 0.52);
      neb.addColorStop(0, 'rgba(8,22,72,0.55)');
      neb.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, W, H);

      /* ── 背景星 ── */
      bgStars.forEach(s => {
        const a = s.base + Math.sin(t * s.fr + s.ph) * s.twk;
        if      (s.tone === 'gold') ctx.fillStyle = `rgba(255,218,110,${a})`;
        else if (s.tone === 'blue') ctx.fillStyle = `rgba(140,210,255,${a})`;
        else                        ctx.fillStyle = `rgba(230,240,255,${a})`;
        ctx.beginPath();
        ctx.arc(s.nx * W, s.ny * H, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      /* ── 更新环粒子角度 ── */
      ringPts.forEach(p => { p.a += p.spd; });

      /* ── 星环后半（在星球后方，低透明度） ── */
      ringPts.forEach(p => {
        const { x, y, depth } = ringXY(p.a, p.track);
        if (depth >= 0) return;
        const [r, g, b] = TRACK_COL[p.track];
        ctx.fillStyle = `rgba(${r},${g},${b},${p.brt * 0.20})`;
        ctx.beginPath(); ctx.arc(x, y, p.sz, 0, Math.PI * 2); ctx.fill();
      });

      /* ── 星球 ── */
      // 多层外发光
      [
        [R * 3.3, 0.022], [R * 2.4, 0.050],
        [R * 1.72, 0.100], [R * 1.28, 0.175],
      ].forEach(([gr, ga]) => {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
        g.addColorStop(0,   `rgba(12,148,255,${ga})`);
        g.addColorStop(0.5, `rgba(0,80,210,${ga * 0.32})`);
        g.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, gr, 0, Math.PI * 2); ctx.fill();
      });

      // 球体（径向渐变，高光偏左上）
      const pg = ctx.createRadialGradient(cx - R * 0.23, cy - R * 0.22, R * 0.04, cx, cy, R);
      pg.addColorStop(0.00, '#d8f5ff');
      pg.addColorStop(0.18, '#62c8ff');
      pg.addColorStop(0.50, '#1878ff');
      pg.addColorStop(0.85, '#0c3ac8');
      pg.addColorStop(1.00, '#050a3c');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      // 大气纹路（裁剪到球内绘制水平条纹）
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
      for (let b = -5; b <= 5; b++) {
        const yo = cy + b * R * 0.27;
        const bg = ctx.createLinearGradient(0, yo - R * 0.11, 0, yo + R * 0.11);
        bg.addColorStop(0,   'rgba(200,242,255,0)');
        bg.addColorStop(0.5, 'rgba(200,242,255,0.052)');
        bg.addColorStop(1,   'rgba(200,242,255,0)');
        ctx.fillStyle = bg;
        ctx.fillRect(cx - R, yo - R * 0.11, R * 2, R * 0.22);
      }
      ctx.restore();

      // 大气边缘光晕（rim light）
      const rim = ctx.createRadialGradient(cx, cy, R * 0.80, cx, cy, R * 1.18);
      rim.addColorStop(0,    'rgba(0,180,255,0)');
      rim.addColorStop(0.55, 'rgba(50,215,255,0.19)');
      rim.addColorStop(1,    'rgba(0,0,0,0)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.18, 0, Math.PI * 2); ctx.fill();

      /* ── 星环前半（在星球前方，柔光带 + 粒子） ── */
      // 柔光椭圆带
      TRACK_SC.forEach((sc, i) => {
        const a = R * 2.58 * sc;
        const b = a * RING_COMP;
        const [r, g, bl] = TRACK_COL[i];
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(RING_ROT);
        ctx.strokeStyle = `rgba(${r},${g},${bl},0.038)`;
        ctx.lineWidth   = R * 0.30;
        ctx.beginPath(); ctx.ellipse(0, 0, a, b, 0, 0, Math.PI); ctx.stroke();
        ctx.restore();
      });
      // 粒子
      ringPts.forEach(p => {
        const { x, y, depth } = ringXY(p.a, p.track);
        if (depth < 0) return;
        const [r, g, b] = TRACK_COL[p.track];
        ctx.fillStyle = `rgba(${r},${g},${b},${p.brt * 0.88})`;
        ctx.beginPath(); ctx.arc(x, y, p.sz, 0, Math.PI * 2); ctx.fill();
        // 超亮粒子加白点
        if (p.brt > 0.84) {
          ctx.fillStyle = `rgba(255,255,255,${p.brt * 0.72})`;
          ctx.beginPath(); ctx.arc(x, y, p.sz * 0.34, 0, Math.PI * 2); ctx.fill();
        }
      });

      t++;
      raf = requestAnimationFrame(draw);
    }

    return {
      start() { resize(); window.addEventListener('resize', resize); draw(); },
      stop()  { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); },
    };
  }

  /* ════════════════════════════════════════════════════════════════════
     §2  STAR TRAILS  —  金色测地球 + 电子轨道（Amber 主题）
     参考画面：纯黑背景，中央金色测地线球体（网格+超亮白金核心），
     4 条不同倾斜角的椭圆轨道，金色粒子沿轨道流动，稀疏金色背景尘埃
  ════════════════════════════════════════════════════════════════════ */
  function initStarTrails(canvas) {
    const ctx = canvas.getContext('2d');
    let W, H, cx, cy, R, PR;
    let raf;
    const rand = rng(0xC3D1F7);

    /* 背景金尘（200 颗，极稀疏） */
    const dust = Array.from({ length: 200 }, () => ({
      nx:    rand(),
      ny:    rand(),
      r:     rand() * 0.9 + 0.15,
      alpha: rand() * 0.20 + 0.03,
      twk:   rand() * 0.11,
      ph:    rand() * Math.PI * 2,
      fr:    rand() * 0.007 + 0.002,
    }));

    /* 4 条轨道定义 */
    const ORBIT_DEFS = [
      { tilt: 0.38, rot: 0.00,            spd:  0.00145, cnt: 130 },
      { tilt: 0.55, rot: Math.PI * 0.42,  spd: -0.00115, cnt: 112 },
      { tilt: 0.44, rot: Math.PI * 0.78,  spd:  0.00095, cnt: 105 },
      { tilt: 0.30, rot: Math.PI * 1.15,  spd: -0.00170, cnt:  88 },
    ];
    const orbits = ORBIT_DEFS.map(d => ({
      ...d,
      angle: rand() * Math.PI * 2,
      pts: Array.from({ length: d.cnt }, () => ({
        ph:  rand() * Math.PI * 2,
        brt: rand() * 0.60 + 0.40,
        sz:  rand() * 1.75 + 0.50,
      })),
    }));

    /* 测地球大圆平面（6 条，均匀分布） */
    const GEO_PLANES = [0, 0.55, 1.10, 1.65, 2.20, 2.75];
    const GEO_STEPS  = 50;

    function resize() {
      PR = window.devicePixelRatio || 1;
      W  = canvas.offsetWidth;
      H  = canvas.offsetHeight;
      canvas.width  = W * PR;
      canvas.height = H * PR;
      ctx.setTransform(PR, 0, 0, PR, 0, 0);
      cx = W / 2;  cy = H / 2;
      R  = Math.min(W, H) * 0.142;
    }

    /* 把轨道上的角度转为屏幕坐标 */
    function orbitXY(phase, tilt, rot) {
      const OA = R * 3.3;
      const lx = Math.cos(phase) * OA;
      const ly = Math.sin(phase) * OA * tilt;
      return {
        x:     cx + lx * Math.cos(rot) - ly * Math.sin(rot),
        y:     cy + lx * Math.sin(rot) + ly * Math.cos(rot),
        depth: Math.sin(phase) * tilt,
      };
    }

    /* 测地球大圆弧顶点（随 rotY 旋转） */
    function geoCirclePts(tiltPhi, rotY) {
      const pts = [];
      for (let i = 0; i <= GEO_STEPS; i++) {
        const theta = (i / GEO_STEPS) * Math.PI * 2;
        const x3 =  Math.cos(theta);
        const y3 =  Math.sin(theta) * Math.cos(tiltPhi);
        const z3 =  Math.sin(theta) * Math.sin(tiltPhi);
        const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
        const xr = x3 * cosY + z3 * sinY;
        pts.push({ x: cx + xr * R, y: cy - y3 * R });
      }
      return pts;
    }

    let t = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const rotY = t * 0.0028;

      /* ── 深黑背景 ── */
      ctx.fillStyle = '#060400';
      ctx.fillRect(0, 0, W, H);
      const bgG = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.62);
      bgG.addColorStop(0, 'rgba(52,34,5,0.42)');
      bgG.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bgG; ctx.fillRect(0, 0, W, H);

      /* ── 金色背景尘埃 ── */
      dust.forEach(d => {
        const a = d.alpha + Math.sin(t * d.fr + d.ph) * d.twk;
        ctx.fillStyle = `rgba(255,192,65,${a})`;
        ctx.beginPath(); ctx.arc(d.nx * W, d.ny * H, d.r, 0, Math.PI * 2); ctx.fill();
      });

      /* ── 更新轨道角度 ── */
      orbits.forEach(o => { o.angle += o.spd; });

      /* ── 轨道路径线（极淡） ── */
      orbits.forEach(o => {
        ctx.beginPath();
        for (let i = 0; i <= 80; i++) {
          const { x, y } = orbitXY((i / 80) * Math.PI * 2, o.tilt, o.rot + rotY * 0.12);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(200,132,22,0.07)';
        ctx.lineWidth   = 1;
        ctx.stroke();
      });

      /* ── 轨道粒子（后半，在球后） ── */
      orbits.forEach(o => {
        o.pts.forEach(p => {
          const { x, y, depth } = orbitXY(p.ph + o.angle, o.tilt, o.rot + rotY * 0.12);
          if (depth >= 0) return;
          const ri = 140 + (p.brt * 80) | 0;
          const bi = 18  + (p.brt * 28) | 0;
          ctx.fillStyle = `rgba(255,${ri},${bi},${p.brt * 0.18})`;
          ctx.beginPath(); ctx.arc(x, y, p.sz, 0, Math.PI * 2); ctx.fill();
        });
      });

      /* ── 测地球 ── */
      // 多层金色外发光
      [
        [R * 3.0, 0.022], [R * 2.1, 0.050],
        [R * 1.55, 0.105], [R * 1.10, 0.185],
      ].forEach(([gr, ga]) => {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
        g.addColorStop(0,   `rgba(255,198,48,${ga})`);
        g.addColorStop(0.4, `rgba(200,108,10,${ga * 0.38})`);
        g.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, gr, 0, Math.PI * 2); ctx.fill();
      });

      // 测地大圆弧线 + 节点
      GEO_PLANES.forEach((phi, idx) => {
        const pts   = geoCirclePts(phi, rotY);
        const alpha = 0.13 + 0.045 * Math.sin(t * 0.018 + phi);
        ctx.beginPath();
        pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.strokeStyle = `rgba(255,178,42,${alpha})`;
        ctx.lineWidth   = 0.65;
        ctx.stroke();
        // 交叉节点高亮
        const interval = Math.floor(GEO_STEPS / 6);
        pts.filter((_, i) => i > 0 && i % interval === 0).forEach(p => {
          ctx.fillStyle = `rgba(255,228,115,${alpha * 2.6})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, 0.9 + alpha * 3.2, 0, Math.PI * 2); ctx.fill();
        });
      });

      // 球体主体（径向渐变，金色调）
      const sg = ctx.createRadialGradient(cx - R * 0.20, cy - R * 0.20, R * 0.04, cx, cy, R);
      sg.addColorStop(0.00, 'rgba(255,255,205,0.92)');
      sg.addColorStop(0.18, 'rgba(255,225,78,0.72)');
      sg.addColorStop(0.50, 'rgba(222,136,16,0.50)');
      sg.addColorStop(0.85, 'rgba(148,78,5,0.28)');
      sg.addColorStop(1.00, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      // 超亮白金核心
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.42);
      core.addColorStop(0,    'rgba(255,255,245,0.96)');
      core.addColorStop(0.40, 'rgba(255,248,158,0.58)');
      core.addColorStop(1,    'rgba(255,200,48,0)');
      ctx.fillStyle = core;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.42, 0, Math.PI * 2); ctx.fill();

      /* ── 轨道粒子（前半，在球前） ── */
      orbits.forEach(o => {
        o.pts.forEach(p => {
          const { x, y, depth } = orbitXY(p.ph + o.angle, o.tilt, o.rot + rotY * 0.12);
          if (depth < 0) return;
          const ri = 140 + (p.brt * 80) | 0;
          const bi = 18  + (p.brt * 28) | 0;
          ctx.fillStyle = `rgba(255,${ri},${bi},${p.brt * 0.90})`;
          ctx.beginPath(); ctx.arc(x, y, p.sz, 0, Math.PI * 2); ctx.fill();
          // 超亮粒子白点
          if (p.brt > 0.82) {
            ctx.fillStyle = `rgba(255,255,200,${p.brt * 0.68})`;
            ctx.beginPath(); ctx.arc(x, y, p.sz * 0.38, 0, Math.PI * 2); ctx.fill();
          }
        });
      });

      t++;
      raf = requestAnimationFrame(draw);
    }

    return {
      start() { resize(); window.addEventListener('resize', resize); draw(); },
      stop()  { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); },
    };
  }

  /* ════════════════════════════════════════════════════════════════════
     挂载 / 卸载逻辑
     — 监听主题切换 & home-screen 显示状态，自动启停对应 Canvas
  ════════════════════════════════════════════════════════════════════ */
  let _renderer = null;

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'classic';
  }

  function mountHomeCanvas() {
    const screen = document.getElementById('home-screen');
    if (!screen || screen.style.display === 'none') return;

    const theme = getTheme();
    const want  = theme === 'space' ? 'space' : theme === 'amber' ? 'amber' : null;

    // 同主题已在运行，跳过
    const existing = screen.querySelector('.hs-theme-canvas');
    if (existing && existing.dataset.theme === (want || '')) return;

    // 停止旧的
    if (_renderer) { _renderer.stop(); _renderer = null; }
    if (existing)    existing.remove();

    if (!want) return;   // 非 canvas 主题，不挂

    const cvs = document.createElement('canvas');
    cvs.className     = 'hs-theme-canvas';
    cvs.dataset.theme = want;
    Object.assign(cvs.style, {
      position: 'absolute', inset: '0',
      width: '100%', height: '100%',
      zIndex: '0', pointerEvents: 'none',
    });
    screen.insertBefore(cvs, screen.firstChild);

    _renderer = want === 'space' ? initStarscape(cvs) : initStarTrails(cvs);
    _renderer.start();
  }

  function unmountHomeCanvas() {
    if (_renderer) { _renderer.stop(); _renderer = null; }
    const cvs = document.querySelector('#home-screen .hs-theme-canvas');
    if (cvs) cvs.remove();
  }

  /* 对外暴露，供 home.js 调用 */
  window._mountHomeCanvas   = mountHomeCanvas;
  window._unmountHomeCanvas = unmountHomeCanvas;

  /* 监听主题切换 */
  new MutationObserver(() => {
    const screen = document.getElementById('home-screen');
    if (screen && screen.style.display !== 'none') mountHomeCanvas();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* 监听 home-screen 的 display 变化 */
  document.addEventListener('DOMContentLoaded', () => {
    const screen = document.getElementById('home-screen');
    if (!screen) return;
    new MutationObserver(() => {
      if (screen.style.display !== 'none') mountHomeCanvas();
      else unmountHomeCanvas();
    }).observe(screen, { attributes: true, attributeFilter: ['style'] });
    // 初始检查
    if (screen.style.display !== 'none') mountHomeCanvas();
  });
})();
