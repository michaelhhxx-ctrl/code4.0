// ── HIGH-DPI CANVAS UTILITY ──
// 解决 Retina / Windows 高 DPI 缩放下 canvas 文字模糊问题
// 所有 canvas 绘制函数应通过此函数初始化，之后绘制坐标全部使用逻辑像素

// 检测元素的累积 CSS zoom（含祖先）
function _getCSSZoom(el) {
  let zoom = 1, node = el;
  while (node && node !== document.documentElement) {
    const z = parseFloat(getComputedStyle(node).zoom);
    if (z && !isNaN(z) && z > 0 && z !== 1) zoom *= z;
    node = node.parentElement;
  }
  return zoom;
}

function setupHiDPICanvas(cv, logW, logH) {
  const dpr = window.devicePixelRatio || 1;
  // 同时考虑屏幕 DPR 和祖先 CSS zoom，确保面板缩放时 Canvas 依然清晰
  const zoom = _getCSSZoom(cv);
  const scale = dpr * zoom;
  const pw = Math.round(logW * scale);
  const ph = Math.round(logH * scale);
  if (cv.width !== pw || cv.height !== ph) {
    cv.width  = pw;
    cv.height = ph;
  }
  cv.style.width  = logW + 'px';
  cv.style.height = logH + 'px';
  const ctx = cv.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  return ctx;
}

window.setupHiDPICanvas = setupHiDPICanvas;
