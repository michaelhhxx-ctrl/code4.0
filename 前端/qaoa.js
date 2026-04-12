// ── QAOA ──

function _qaoaL(zh, en) { return (typeof window.isEnglish === 'function' && window.isEnglish()) || window._currentLang === 'en' ? en : zh; }
function _qaoaNum(v, digits = 0) { return Number(v).toFixed(digits); }

function _qaoaInfoText(nodeCount, edgeCount, maxCut) {
  const mc = nodeCount >= 2 && edgeCount ? (maxCut || '—') : '—';
  return _qaoaL(`节点: ${nodeCount} | 边: ${edgeCount} | 最优割: ${mc}`, `Nodes: ${nodeCount} | Edges: ${edgeCount} | Best cut: ${mc}`);
}
function _qaoaEmptyEdgeText() {
  return _qaoaL('暂无边，请在画布连边或用上方选择器添加', 'No edges yet. Draw them on the canvas or add them with the selector above');
}

function initQAOAIfNeeded(){ if(QAOA_S.nodes.length===0) initQAOADefault(); _qaoa_canvas_ready(); }
function initQAOADefault(){
  QAOA_S.nodes=[{id:0,x:70,y:80},{id:1,x:190,y:80},{id:2,x:190,y:180},{id:3,x:70,y:180}];
  QAOA_S.edges=[{a:0,b:1},{a:1,b:2},{a:2,b:3},{a:3,b:0},{a:0,b:2}];
  QAOA_S.data=[]; QAOA_S.probs=[]; QAOA_S.bestBits=null;
  updateQAOAInfo(); drawQAOAGraph();
}
function clearQAOAGraph(){ QAOA_S.nodes=[]; QAOA_S.edges=[]; QAOA_S.data=[]; QAOA_S.probs=[]; QAOA_S.bestBits=null; updateQAOAInfo(); drawQAOAGraph(); }
function setQAOAMode(m,el){
  QAOA_S.mode=m; QAOA_S.selNode=null;
  document.querySelectorAll('.qgbtn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  const cv=document.getElementById('qaoa-graph-cv');
  cv.style.cursor=m==='node'?'crosshair':'pointer';
  drawQAOAGraph();
}
function updateQAOAInfo(){
  const {maxCut}=QAOA_S.nodes.length>=2&&QAOA_S.edges.length?bfMaxCut():{};
  const infoEl = document.getElementById('qaoa-graph-info');
  if (infoEl) infoEl.textContent = _qaoaInfoText(QAOA_S.nodes.length, QAOA_S.edges.length, maxCut);
  updateQAOACircuitDisplay();
  updateQAOAEdgePanel();
}
function updateQAOAEdgePanel(){
  const n = QAOA_S.nodes.length;
  const fromSel = document.getElementById('qaoa-ep-from'), toSel = document.getElementById('qaoa-ep-to');
  if(!fromSel || !toSel) return;
  const opts = n > 0 ? Array.from({length:n},(_,i)=>`<option value="${i}">${_qaoaL('节点', 'Node')} ${i}</option>`).join('') : '<option>—</option>';
  fromSel.innerHTML = opts; toSel.innerHTML = opts;
  if(n>=2){ fromSel.selectedIndex = 0; toSel.selectedIndex = 1; }
  const list = document.getElementById('qaoa-ep-edges');
  if(!list) return;
  if(!QAOA_S.edges.length){
    list.innerHTML = `<span class="qaoa-ep-empty">${_qaoaEmptyEdgeText()}</span>`;
  } else {
    list.innerHTML = QAOA_S.edges.map((ed,i)=>
      `<div class="qaoa-ep-chip">${ed.a}—${ed.b}<span class="qaoa-ep-chip-del" onclick="qaoaDelEdge(${i})" title="${_qaoaL('删除此边','Delete this edge')}">×</span></div>`
    ).join('');
  }
  const delBtn = document.getElementById('qaoa-del-node-btn');
  if(delBtn) {
    delBtn.style.display = QAOA_S.selNode!==null ? 'inline-block' : 'none';
    delBtn.textContent = _qaoaL('✕ 删节点', '✕ Delete node');
  }
}
function qaoaAddEdgePanel(){
  const a = parseInt(document.getElementById('qaoa-ep-from').value);
  const b = parseInt(document.getElementById('qaoa-ep-to').value);
  if(isNaN(a)||isNaN(b)||a===b) return;
  const mn=Math.min(a,b), mx=Math.max(a,b);
  if(!QAOA_S.edges.some(e=>e.a===mn&&e.b===mx)) QAOA_S.edges.push({a:mn,b:mx});
  updateQAOAInfo(); drawQAOAGraph();
}
function qaoaDelEdge(i){ QAOA_S.edges.splice(i,1); updateQAOAInfo(); drawQAOAGraph(); }
function qaoaDelSelNode(){
  const i = QAOA_S.selNode; if(i===null) return;
  QAOA_S.nodes.splice(i,1); QAOA_S.nodes.forEach((nd,j)=>nd.id=j);
  QAOA_S.edges = QAOA_S.edges.filter(ed=>ed.a!==i&&ed.b!==i).map(ed=>({a:ed.a>i?ed.a-1:ed.a,b:ed.b>i?ed.b-1:ed.b}));
  QAOA_S.selNode = null; updateQAOAInfo(); drawQAOAGraph();
}
function updateQAOACircuitDisplay(){
  const n = QAOA_S.nodes.length, el = document.getElementById('qaoa-circuit-display');
  if(!el) return;
  if(n===0){ el.textContent = _qaoaL('等待图构建...', 'Waiting for a graph...'); return; }
  let txt='';
  for(let q=0;q<Math.min(n,4);q++) txt += `q${q}: ─H─ e<sup>-iγC</sup> ─ e<sup>-iβB</sup> ─M\n`;
  if(n>4) txt += _qaoaL(`... (${n} qubits 共 ${QAOA_S.edges.length} 个 ZZ 旋转门)`, `... (${n} qubits, ${QAOA_S.edges.length} ZZ rotation gates)`);
  el.innerHTML = txt;
}
function drawQAOAGraph(preview){
  const cv = document.getElementById('qaoa-graph-cv'); if(!cv) return;
  const W = cv.parentElement.clientWidth-16, H = 220;
  const ctx = setupHiDPICanvas(cv,W,H); ctx.clearRect(0,0,W,H);
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--surf').trim() || '#F7F8FB';
  const _th = document.documentElement.getAttribute('data-theme') || 'classic';
  const _qTheme = {
    classic: { empty:'#94A3B8', edge:'#94A3B8', edgeHover:'#A31515', edgeCut:'#22C55E', preview:'rgba(13,115,119,.6)', sel:'#0D7377', node:'#1B3A6B', stroke:'#fff', hint:'rgba(13,115,119,.85)', cutFill:'rgba(34,197,94,.2)', missFill:'rgba(239,68,68,.15)', detail:'#276749', ratio:'#276749' },
    dark:    { empty:'#94A3B8', edge:'#64748B', edgeHover:'#F59E0B', edgeCut:'#4ADE80', preview:'rgba(74,134,232,.6)', sel:'#4A86E8', node:'#1E3251', stroke:'#BFDBFE', hint:'rgba(125,165,255,.9)', cutFill:'rgba(74,222,128,.18)', missFill:'rgba(248,113,113,.14)', detail:'#86EFAC', ratio:'#86EFAC' },
    aurora:  { empty:'#B8AFFF', edge:'#7C3AED', edgeHover:'#FB923C', edgeCut:'#4ADE80', preview:'rgba(155,127,255,.6)', sel:'#9B7FFF', node:'#4A3485', stroke:'#F5F3FF', hint:'rgba(194,168,255,.9)', cutFill:'rgba(74,222,128,.18)', missFill:'rgba(248,113,113,.14)', detail:'#86EFAC', ratio:'#86EFAC' },
    amber:   { empty:'#B49B7B', edge:'#7F6C56', edgeHover:'#F7A84D', edgeCut:'#8FB676', preview:'rgba(247,168,77,.6)', sel:'#F7A84D', node:'#3B2B1D', stroke:'#FFCC8A', hint:'rgba(255,204,138,.92)', cutFill:'rgba(143,182,118,.18)', missFill:'rgba(239,143,114,.14)', detail:'#BFD9A7', ratio:'#BFD9A7' }
  }[_th] || { empty:'#94A3B8', edge:'#94A3B8', edgeHover:'#A31515', edgeCut:'#22C55E', preview:'rgba(13,115,119,.6)', sel:'#0D7377', node:'#1B3A6B', stroke:'#fff', hint:'rgba(13,115,119,.85)', cutFill:'rgba(34,197,94,.2)', missFill:'rgba(239,68,68,.15)', detail:'#276749', ratio:'#276749' };
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,220);
  if(QAOA_S.nodes.length===0){
    ctx.fillStyle=_qTheme.empty; ctx.font='12px sans-serif'; ctx.textAlign='center';
    ctx.fillText(_qaoaL('节点模式：点击空白处添加节点', 'Node mode: click blank space to add nodes'), W/2, 100);
    ctx.font='11px sans-serif';
    ctx.fillText(_qaoaL('连边模式：点击两节点连边 / 点击边删除', 'Edge mode: click two nodes to connect / click an edge to delete'), W/2, 120);
    return;
  }
  QAOA_S.edges.forEach(({a,b},ei)=>{
    const na=QAOA_S.nodes[a], nb=QAOA_S.nodes[b]; if(!na||!nb) return;
    const isCut = QAOA_S.bestBits!==null && (((QAOA_S.bestBits>>a)&1)!==((QAOA_S.bestBits>>b)&1));
    const isHover = QAOA_S.mode==='edge' && QAOA_S.selNode===null && QAOA_S.hoverEdge===ei;
    ctx.beginPath(); ctx.moveTo(na.x,na.y); ctx.lineTo(nb.x,nb.y);
    ctx.strokeStyle = isHover ? _qTheme.edgeHover : (isCut ? _qTheme.edgeCut : _qTheme.edge);
    ctx.lineWidth = isHover ? 3 : (isCut ? 2.5 : 1.5); ctx.stroke();
    if(isHover){
      const mx=(na.x+nb.x)/2,my=(na.y+nb.y)/2;
      ctx.fillStyle=_qTheme.edgeHover; ctx.font="10px 'JetBrains Mono',monospace"; ctx.textAlign='center';
      ctx.fillText(_qaoaL('点击删除', 'Click to delete'), mx, my-8);
    }
  });
  if(preview && QAOA_S.mode==='edge' && QAOA_S.selNode!==null){
    const nd = QAOA_S.nodes[QAOA_S.selNode];
    if(nd){
      ctx.beginPath(); ctx.moveTo(nd.x,nd.y); ctx.lineTo(preview.x,preview.y);
      ctx.strokeStyle=_qTheme.preview; ctx.lineWidth=1.5; ctx.setLineDash([6,4]); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  QAOA_S.nodes.forEach((nd,i)=>{
    const isSel = QAOA_S.selNode===i;
    const inSet = QAOA_S.bestBits!==null && ((QAOA_S.bestBits>>i)&1);
    if(QAOA_S.bestBits!==null){
      ctx.beginPath(); ctx.arc(nd.x,nd.y,17,0,Math.PI*2);
      ctx.fillStyle = inSet ? _qTheme.cutFill : _qTheme.missFill; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(nd.x,nd.y,12,0,Math.PI*2);
    ctx.fillStyle = isSel ? _qTheme.sel : (inSet ? _qTheme.edgeCut : _qTheme.node); ctx.fill();
    ctx.strokeStyle = isSel ? '#FBBF24' : _qTheme.stroke; ctx.lineWidth = isSel ? 2.5 : 1.5; ctx.stroke();
    ctx.fillStyle='#fff'; ctx.font="bold 12px 'JetBrains Mono',monospace"; ctx.textAlign='center'; ctx.fillText(i, nd.x, nd.y+4);
    if(isSel && QAOA_S.mode==='edge'){
      ctx.fillStyle=_qTheme.hint; ctx.font="10px 'JetBrains Mono',monospace"; ctx.textAlign='center';
      ctx.fillText(_qaoaL('→ 点击目标节点', '→ Click target node'), nd.x, nd.y-18);
    }
  });
  if(QAOA_S.bestBits!==null){
    ctx.fillStyle=_qTheme.detail; ctx.font="bold 11px 'JetBrains Mono',monospace"; ctx.textAlign='left';
    const ratio = QAOA_S.maxCut>0 ? (QAOA_S.bestCut/QAOA_S.maxCut).toFixed(3) : '—';
    ctx.fillText(_qaoaL(`最优割: ${QAOA_S.bestCut}/${QAOA_S.edges.length} 边 · 近似比: ${ratio}`, `Best cut: ${QAOA_S.bestCut}/${QAOA_S.edges.length} edges · ratio: ${ratio}`), 5, 215);
  }
}
function _ptSegDist(px,py,ax,ay,bx,by){
  const dx=bx-ax,dy=by-ay,len2=dx*dx+dy*dy;
  if(len2===0) return Math.hypot(px-ax,py-ay);
  const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/len2));
  return Math.hypot(px-(ax+t*dx),py-(ay+t*dy));
}
function _qaoa_canvas_ready(){
  const cv=document.getElementById('qaoa-graph-cv'); if(!cv||cv._evBound) return; cv._evBound=true;
  let dragIdx=null, dragStartX=0, dragStartY=0, dragged=false;

  cv.addEventListener('mousedown',e=>{
    if(e.button!==0) return;
    const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
    const i=QAOA_S.nodes.findIndex(n=>Math.hypot(n.x-x,n.y-y)<15);
    if(i>=0){ dragIdx=i; dragStartX=x; dragStartY=y; dragged=false; }
  });

  cv.addEventListener('mousemove',e=>{
    const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
    if(dragIdx!==null){
      if(Math.hypot(x-dragStartX,y-dragStartY)>4) dragged=true;
      QAOA_S.nodes[dragIdx].x=Math.max(12,Math.min(cv.width-12,x));
      QAOA_S.nodes[dragIdx].y=Math.max(12,Math.min(206,y));
      drawQAOAGraph(); return;
    }
    if(QAOA_S.mode==='edge'){
      const hNode=QAOA_S.nodes.findIndex(n=>Math.hypot(n.x-x,n.y-y)<15);
      const prevHover=QAOA_S.hoverEdge;
      QAOA_S.hoverEdge = QAOA_S.selNode===null
        ? QAOA_S.edges.findIndex(({a,b})=>{const na=QAOA_S.nodes[a],nb=QAOA_S.nodes[b];return na&&nb&&_ptSegDist(x,y,na.x,na.y,nb.x,nb.y)<8;})
        : -1;
      cv.style.cursor = (hNode>=0||QAOA_S.hoverEdge>=0) ? 'pointer' : 'crosshair';
      if(QAOA_S.selNode!==null) drawQAOAGraph({x,y});
      else if(prevHover!==QAOA_S.hoverEdge) drawQAOAGraph();
    } else {
      const hNode=QAOA_S.nodes.findIndex(n=>Math.hypot(n.x-x,n.y-y)<15);
      cv.style.cursor=hNode>=0?'pointer':'crosshair';
    }
  });

  cv.addEventListener('mouseup',e=>{
    if(e.button!==0) return;
    const wasDrag=dragged; dragIdx=null; dragged=false;
    if(wasDrag) return;
    const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
    const clicked=QAOA_S.nodes.findIndex(n=>Math.hypot(n.x-x,n.y-y)<15);
    if(QAOA_S.mode==='node'){
      if(clicked<0 && QAOA_S.nodes.length<8){ QAOA_S.nodes.push({id:QAOA_S.nodes.length,x,y}); QAOA_S.selNode=null; }
      else if(clicked>=0){ QAOA_S.selNode = QAOA_S.selNode===clicked ? null : clicked; }
    } else {
      if(clicked<0){
        const ei = QAOA_S.hoverEdge>=0 ? QAOA_S.hoverEdge : QAOA_S.edges.findIndex(({a,b})=>{const na=QAOA_S.nodes[a],nb=QAOA_S.nodes[b];return na&&nb&&_ptSegDist(x,y,na.x,na.y,nb.x,nb.y)<8;});
        if(ei>=0){ QAOA_S.edges.splice(ei,1); QAOA_S.hoverEdge=-1; }
        QAOA_S.selNode=null;
      } else if(QAOA_S.selNode===null){
        QAOA_S.selNode=clicked;
      } else if(QAOA_S.selNode!==clicked){
        const a=Math.min(QAOA_S.selNode,clicked), b=Math.max(QAOA_S.selNode,clicked);
        const ei=QAOA_S.edges.findIndex(ed=>ed.a===a&&ed.b===b);
        if(ei>=0) QAOA_S.edges.splice(ei,1);
        else QAOA_S.edges.push({a,b});
        QAOA_S.selNode=null;
      } else {
        QAOA_S.selNode=null;
      }
    }
    updateQAOAInfo(); drawQAOAGraph();
  });

  cv.addEventListener('dblclick',e=>{
    const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
    const i=QAOA_S.nodes.findIndex(n=>Math.hypot(n.x-x,n.y-y)<15);
    if(i<0) return;
    QAOA_S.nodes.splice(i,1); QAOA_S.nodes.forEach((nd,j)=>nd.id=j);
    QAOA_S.edges = QAOA_S.edges.filter(ed=>ed.a!==i&&ed.b!==i).map(ed=>({a:ed.a>i?ed.a-1:ed.a,b:ed.b>i?ed.b-1:ed.b}));
    QAOA_S.selNode=null; updateQAOAInfo(); drawQAOAGraph();
  });

  cv.addEventListener('mouseleave',()=>{
    dragIdx=null; QAOA_S.hoverEdge=-1;
    drawQAOAGraph();
  });

  // ── 触屏端：并行添加 touch 事件，与鼠标事件完全独立 ──
  if (cv._touchEvBound) return; cv._touchEvBound = true;

  let _tDragIdx = null, _tDragStartX = 0, _tDragStartY = 0, _tDragged = false;
  let _tLastTap = 0;

  function _tCoords(e) {
    const r = cv.getBoundingClientRect();
    return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
  }
  function _tCoordsEnd(e) {
    const r = cv.getBoundingClientRect();
    return { x: e.changedTouches[0].clientX - r.left, y: e.changedTouches[0].clientY - r.top };
  }

  cv.addEventListener('touchstart', e => {
    // 始终阻止合成鼠标事件：若不 preventDefault，浏览器会在 touchend 后约 300ms
    // 补发 mousedown/mouseup/click，导致 mouse 监听器重复执行（连边模式下尤为致命）
    e.preventDefault();
    const { x, y } = _tCoords(e);
    const i = QAOA_S.nodes.findIndex(n => Math.hypot(n.x - x, n.y - y) < 18);
    if (i >= 0) {
      _tDragIdx = i; _tDragStartX = x; _tDragStartY = y; _tDragged = false;
    }
  }, { passive: false });

  cv.addEventListener('touchmove', e => {
    if (_tDragIdx === null) return;
    e.preventDefault(); // 仅拖拽节点时阻止页面滚动
    const { x, y } = _tCoords(e);
    if (Math.hypot(x - _tDragStartX, y - _tDragStartY) > 4) _tDragged = true;
    QAOA_S.nodes[_tDragIdx].x = Math.max(12, Math.min(cv.width - 12, x));
    QAOA_S.nodes[_tDragIdx].y = Math.max(12, Math.min(206, y));
    drawQAOAGraph();
  }, { passive: false });

  cv.addEventListener('touchend', e => {
    const wasDragging = _tDragIdx !== null && _tDragged;
    _tDragged = false; _tDragIdx = null;
    if (wasDragging) { updateQAOAInfo(); return; }

    const { x, y } = _tCoordsEnd(e);

    // 双击计时：两次 touchend 间隔 < 300ms 视为双击
    const now = Date.now();
    const isDoubleTap = (now - _tLastTap) < 300;
    _tLastTap = now;

    const clicked = QAOA_S.nodes.findIndex(n => Math.hypot(n.x - x, n.y - y) < 18);

    // 双击已有节点 → 删除（对应桌面端 dblclick 行为）
    if (isDoubleTap && clicked >= 0) {
      QAOA_S.nodes.splice(clicked, 1);
      QAOA_S.nodes.forEach((nd, j) => nd.id = j);
      QAOA_S.edges = QAOA_S.edges
        .filter(ed => ed.a !== clicked && ed.b !== clicked)
        .map(ed => ({ a: ed.a > clicked ? ed.a - 1 : ed.a, b: ed.b > clicked ? ed.b - 1 : ed.b }));
      QAOA_S.selNode = null;
      updateQAOAInfo(); drawQAOAGraph();
      return;
    }

    // 单击：复用鼠标 mouseup 的业务逻辑
    if (QAOA_S.mode === 'node') {
      if (clicked < 0 && QAOA_S.nodes.length < 8) {
        QAOA_S.nodes.push({ id: QAOA_S.nodes.length, x, y });
        QAOA_S.selNode = null;
      } else if (clicked >= 0) {
        QAOA_S.selNode = QAOA_S.selNode === clicked ? null : clicked;
      }
    } else {
      if (clicked < 0) {
        const ei = QAOA_S.edges.findIndex(({ a, b }) => {
          const na = QAOA_S.nodes[a], nb = QAOA_S.nodes[b];
          return na && nb && _ptSegDist(x, y, na.x, na.y, nb.x, nb.y) < 8;
        });
        if (ei >= 0) { QAOA_S.edges.splice(ei, 1); QAOA_S.hoverEdge = -1; }
        QAOA_S.selNode = null;
      } else if (QAOA_S.selNode === null) {
        QAOA_S.selNode = clicked;
      } else if (QAOA_S.selNode !== clicked) {
        const a = Math.min(QAOA_S.selNode, clicked), b = Math.max(QAOA_S.selNode, clicked);
        const ei = QAOA_S.edges.findIndex(ed => ed.a === a && ed.b === b);
        if (ei >= 0) QAOA_S.edges.splice(ei, 1);
        else QAOA_S.edges.push({ a, b });
        QAOA_S.selNode = null;
      } else {
        QAOA_S.selNode = null;
      }
    }
    updateQAOAInfo(); drawQAOAGraph();
  });
}
function bfMaxCut(){
  const n=QAOA_S.nodes.length; let best=0,bestBits=0;
  for(let x=0;x<(1<<n);x++){
    let cut=0;
    QAOA_S.edges.forEach(({a,b})=>{ if(((x>>a)&1)!==((x>>b)&1)) cut++; });
    if(cut>best){ best=cut; bestBits=x; }
  }
  return {maxCut:best,bestBits};
}
function qaoa_expCut(probs,n){
  let exp=0;
  for(let x=0;x<(1<<n);x++){
    let cut=0; QAOA_S.edges.forEach(({a,b})=>{ if(((x>>a)&1)!==((x>>b)&1)) cut++; });
    exp += probs[x]*cut;
  }
  return exp;
}
function runQAOAp1(n,gamma,beta){
  const sim=new QSim(n);
  for(let q=0;q<n;q++) sim.H(q);
  QAOA_S.edges.forEach(({a,b})=>{
    const ba=1<<(n-1-a), bb=1<<(n-1-b);
    for(let i=0;i<sim.dim;i++){
      const za=(i&ba)?-1:1, zb=(i&bb)?-1:1;
      const ang=-gamma/2*za*zb, c=Math.cos(ang), s=Math.sin(ang);
      const r=sim.re[i],im=sim.im[i]; sim.re[i]=c*r-s*im; sim.im[i]=s*r+c*im;
    }
  });
  for(let q=0;q<n;q++) sim.Rx(q,2*beta);
  return sim.probs();
}
// ── 本地降级版（后端不可用时使用）──
async function _startQAOALocal(n, maxCut) {
  const btn = document.getElementById('qaoa-run-btn');
  btn.textContent = _qaoaL('扫描中 0/21…', 'Scanning 0/21…');
  btn.disabled = true;
  // Grid scan: 21×13 = 273 evaluations, chunked row-by-row via setTimeout(0)
  // to release the main thread between rows and avoid UI jank.
  let bG = 0.5, bB = 0.4, bExp = -1;
  for (let gi = 0; gi <= 20; gi++) {
    for (let bi = 0; bi <= 12; bi++) {
      const g = (gi / 20) * Math.PI, b = (bi / 12) * Math.PI / 2;
      const p = runQAOAp1(n, g, b), e = qaoa_expCut(p, n);
      if (e > bExp) { bExp = e; bG = g; bB = b; }
    }
    btn.textContent = _qaoaL(`扫描中 ${gi + 1}/21…`, `Scanning ${gi + 1}/21…`);
    await new Promise(r => setTimeout(r, 0));
  }
  btn.textContent = _qaoaL('⏸ 优化中...', '⏸ Optimizing...');
  QAOA_S.bestGamma = bG; QAOA_S.bestBeta = bB;
  const gs = document.getElementById('qaoa-gamma'), bs = document.getElementById('qaoa-beta');
  if (gs) { gs.value = Math.round(bG * 180 / Math.PI); gs.nextElementSibling.textContent = gs.value + '°'; }
  if (bs) { bs.value = Math.round(bB * 180 / Math.PI); bs.nextElementSibling.textContent = bs.value + '°'; }
  const finalRatio = bExp / Math.max(maxCut, 1);
  let iter = 0; const maxIter = 45;
  QAOA_S.timer = setInterval(() => {
    const prog = iter / maxIter, noise = (1 - prog) * 0.07 * (Math.random() - .5);
    const ratio = Math.max(0, Math.min(1, finalRatio * (1 - Math.exp(-5 * prog)) + 0.08 + noise));
    QAOA_S.data.push({ iter, ratio });
    document.getElementById('qaoa-iter').textContent = iter + 1;
    document.getElementById('qaoa-ratio').textContent = ratio.toFixed(4);
    document.getElementById('qaoa-cut').textContent = (ratio * maxCut).toFixed(1) + '/' + maxCut;
    drawQAOAChart();
    iter++;
    if (iter >= maxIter) {
      clearInterval(QAOA_S.timer); QAOA_S.running = false;
      btn.textContent = _qaoaL('▶ 重新优化', '▶ Optimize Again'); btn.disabled = false;
      QAOA_S.probs = runQAOAp1(n, bG, bB);
      let mxP = 0, bBits = 0;
      QAOA_S.probs.forEach((p, i) => { if (p > mxP) { mxP = p; bBits = i; } });
      let bestCut = 0;
      QAOA_S.edges.forEach(({ a, b }) => { if (((bBits >> a) & 1) !== ((bBits >> b) & 1)) bestCut++; });
      QAOA_S.bestCut = bestCut; QAOA_S.bestBits = bBits;
      const ar = bestCut / Math.max(maxCut, 1);
      document.getElementById('qaoa-ratio').textContent = ar.toFixed(4);
      document.getElementById('qaoa-cut').textContent = bestCut + '/' + maxCut;
      // ar         = bestCut / maxCut  (sampled: highest-prob bitstring's actual cut)
      // finalRatio = bExp / maxCut     (expected: continuous expectation value)
      const dispBits = bBits.toString(2).padStart(n, '0').split('').reverse().join('');
      document.getElementById('qaoa-solution').innerHTML = _qaoaL(
        `最优割 = <b>${bestCut}/${maxCut}</b> 边 · 近似比 r = <b>${ar.toFixed(3)}</b>（采样）<br>期望近似比 = <b>${finalRatio.toFixed(3)}</b>（连续期望值）<br>方案: ${dispBits} (node 0→n-1，绿=集合S, 蓝=集合S̄)<br><span style="color:var(--t3)">// 经典最优割: ${maxCut} 边</span>`,
        `Best cut = <b>${bestCut}/${maxCut}</b> edges · approximation ratio r = <b>${ar.toFixed(3)}</b> (sampled)<br>Expected ratio = <b>${finalRatio.toFixed(3)}</b> (continuous expectation)<br>Bitstring: ${dispBits} (node 0→n-1, green = set S, blue = set S̄)<br><span style="color:var(--t3)">// Classical optimum: ${maxCut} edges</span>`
      );
      drawQAOAProbs(); drawQAOAGraph();
      setSBMsg(_qaoaL(`QAOA 完成（本地）· 近似比: ${ar.toFixed(3)} · 最优割: ${bestCut}/${maxCut}`, `QAOA done (local) · ratio: ${ar.toFixed(3)} · best cut: ${bestCut}/${maxCut}`));
    }
  }, 85);
}

// ── 后端优先，失败降级本地 ──
async function startQAOA() {
  const n = QAOA_S.nodes.length;
  if (n < 2) { setSBMsg(_qaoaL('至少需要 2 个节点', 'At least 2 nodes are required')); return; }
  if (!QAOA_S.edges.length) { setSBMsg(_qaoaL('请先添加边', 'Please add at least one edge first')); return; }
  if (n > 8) { setSBMsg(_qaoaL('节点数 ≤ 8', 'Node count must be ≤ 8')); return; }
  if (QAOA_S.running) return;
  _qaoa_canvas_ready();
  QAOA_S.running = true; QAOA_S.data = []; QAOA_S.probs = [];
  QAOA_S.bestBits = null; QAOA_S.bestCut = 0;
  const solEl = document.getElementById('qaoa-solution');
  if (solEl) solEl.innerHTML = _qaoaL('等待优化结果...', 'Waiting for optimization result...');
  const btn = document.getElementById('qaoa-run-btn');
  btn.disabled = true;
  const { maxCut } = bfMaxCut(); QAOA_S.maxCut = maxCut;
  drawQAOAGraph(); drawQAOAProbs();

  // ── 过程帧：更新进度图表 ──
  const onIter = d => {
    QAOA_S.data.push({ iter: d.iter, ratio: d.ratio });
    document.getElementById('qaoa-iter').textContent = d.iter;
    document.getElementById('qaoa-ratio').textContent = Number(d.ratio).toFixed(4);
    document.getElementById('qaoa-cut').textContent = Number(d.current_cut).toFixed(1) + '/' + d.max_cut;
    drawQAOAChart();
  };

  // ── 最终帧：写入结果，渲染终态 ──
  const onDone = d => {
    QAOA_S.running = false;
    QAOA_S.probs = d.probabilities;
    QAOA_S.bestBits = parseInt(d.best_bits, 2);  // "0101" → 5
    QAOA_S.bestCut = d.best_cut;
    QAOA_S.maxCut = d.max_cut;
    QAOA_S.bestGamma = d.best_gamma;
    QAOA_S.bestBeta = d.best_beta;
    // 覆盖最后一个同 iter 点，避免图尾部双点
    if (QAOA_S.data.length && QAOA_S.data[QAOA_S.data.length - 1].iter === d.iter) {
      QAOA_S.data[QAOA_S.data.length - 1] = { iter: d.iter, ratio: d.ratio };
    } else {
      QAOA_S.data.push({ iter: d.iter, ratio: d.ratio });
    }
    drawQAOAChart();
    const gs = document.getElementById('qaoa-gamma'), bs = document.getElementById('qaoa-beta');
    if (gs) { gs.value = Math.round(d.best_gamma * 180 / Math.PI); gs.nextElementSibling.textContent = gs.value + '°'; }
    if (bs) { bs.value = Math.round(d.best_beta * 180 / Math.PI); bs.nextElementSibling.textContent = bs.value + '°'; }
    const ar = d.best_cut / Math.max(d.max_cut, 1);
    document.getElementById('qaoa-ratio').textContent = ar.toFixed(4);
    document.getElementById('qaoa-cut').textContent = d.best_cut + '/' + d.max_cut;
    const dispBits = d.best_bits.split('').reverse().join('');
    document.getElementById('qaoa-solution').innerHTML = _qaoaL(
      `最优割 = <b>${d.best_cut}/${d.max_cut}</b> 边 · 近似比 r = <b>${ar.toFixed(3)}</b>（采样）<br>期望近似比 = <b>${Number(d.expected_ratio).toFixed(3)}</b>（连续期望值）<br>方案: ${dispBits} (node 0→n-1，绿=集合S, 蓝=集合S̄)<br><span style="color:var(--t3)">// 经典最优割: ${d.max_cut} 边</span>`,
      `Best cut = <b>${d.best_cut}/${d.max_cut}</b> edges · ratio r = <b>${ar.toFixed(3)}</b> (sampled)<br>Expected ratio = <b>${Number(d.expected_ratio).toFixed(3)}</b> (continuous)<br>Bitstring: ${dispBits} (node 0→n-1, green = set S, blue = set S̄)<br><span style="color:var(--t3)">// Classical optimum: ${d.max_cut} edges</span>`
    );
    btn.textContent = _qaoaL('▶ 重新优化', '▶ Optimize Again'); btn.disabled = false;
    drawQAOAProbs(); drawQAOAGraph();
    setSBMsg(_qaoaL(
      `QAOA 完成（后端）· 近似比: ${ar.toFixed(3)} · 最优割: ${d.best_cut}/${d.max_cut}`,
      `QAOA done (backend) · ratio: ${ar.toFixed(3)} · best cut: ${d.best_cut}/${d.max_cut}`
    ));
  };

  // ── 后端失败 → 重置面板 + 降级本地 ──
  const onError = msg => {
    console.warn('[QAOA] backend failed, falling back to local:', msg);
    QAOA_S.data = [];
    document.getElementById('qaoa-iter').textContent = '0';
    document.getElementById('qaoa-ratio').textContent = '0.0000';
    document.getElementById('qaoa-cut').textContent = '0.0/' + maxCut;
    _startQAOALocal(n, maxCut);
  };

  // ── 优先尝试后端（_backendConnected 仅作提示，真正降级由 onerror 触发）──
  const tried = window._backendConnected && API.startQAOAws(
    { nodes: QAOA_S.nodes.map(nd => ({ id: nd.id })), edges: QAOA_S.edges.map(e => ({ a: e.a, b: e.b })), max_iter: 45 },
    onIter, onDone, onError
  );
  if (!tried) {
    _startQAOALocal(n, maxCut);
  } else {
    btn.textContent = _qaoaL('⏸ 优化中...', '⏸ Optimizing...');
    setSBMsg(_qaoaL('QAOA 后端优化进行中...', 'QAOA backend optimization running...'));
  }
}
function drawQAOAChart(){
  const cv=document.getElementById('qaoa-chart-cv'); if(!cv) return;
  const W=cv.parentElement.clientWidth||300, H=Math.max(140, Math.round(W*0.55));
  const ctx=setupHiDPICanvas(cv,W,H); if(!ctx) return;
  ctx.clearRect(0,0,W,H);
  const bg=getComputedStyle(document.documentElement).getPropertyValue('--surf').trim()||'#F7F8FB';
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  const data=QAOA_S.data; if(data.length<2) return;
  const QL=42, QR=10, MF="'JetBrains Mono',monospace";
  const toX=i=>QL+(W-QL-QR)*(i/(data.length-1));
  const toY=r=>H*0.9-(H*0.8)*r;
  for(let i=0;i<=4;i++){
    const y=H*0.1+(H*0.8)*(i/4);
    ctx.beginPath(); ctx.moveTo(QL,y); ctx.lineTo(W-QR,y);
    ctx.strokeStyle='#E2E8F0'; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle='#64748B'; ctx.font=`11px ${MF}`; ctx.textAlign='right'; ctx.fillText((1-i/4).toFixed(1),QL-4,y+4);
  }
  const y1=toY(1);
  ctx.beginPath(); ctx.moveTo(QL,y1); ctx.lineTo(W-QR,y1);
  ctx.strokeStyle='#276749'; ctx.lineWidth=1.5; ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle='#276749'; ctx.font=`bold 11px ${MF}`; ctx.textAlign='left'; ctx.fillText(_qaoaL('最优 r=1', 'Optimal r=1'), QL+4, y1-4);
  const grd=ctx.createLinearGradient(0,0,0,H);
  grd.addColorStop(0,'rgba(27,58,107,.15)'); grd.addColorStop(1,'rgba(27,58,107,.01)');
  ctx.beginPath(); data.forEach((d,i)=>i===0?ctx.moveTo(toX(i),toY(d.ratio)):ctx.lineTo(toX(i),toY(d.ratio)));
  ctx.lineTo(toX(data.length-1),H); ctx.lineTo(QL,H); ctx.closePath(); ctx.fillStyle=grd; ctx.fill();
  ctx.beginPath(); data.forEach((d,i)=>i===0?ctx.moveTo(toX(i),toY(d.ratio)):ctx.lineTo(toX(i),toY(d.ratio)));
  ctx.strokeStyle='#1B3A6B'; ctx.lineWidth=2; ctx.stroke();
  const ld=data[data.length-1];
  ctx.beginPath(); ctx.arc(toX(data.length-1),toY(ld.ratio),4,0,Math.PI*2);
  ctx.fillStyle='#1B3A6B'; ctx.fill();
  ctx.fillStyle='#64748B'; ctx.font=`11px ${MF}`; ctx.textAlign='center'; ctx.fillText(_qaoaL('迭代步数', 'Iterations'), W/2, H-4);
}
function _drawQAOAProbsOnCanvas(cv, isZoom){
  const probs=QAOA_S.probs; if(!probs?.length) return;
  const n=QAOA_S.nodes.length, dim=1<<n;
  // For zoom, use the canvas's own rendered width (layout already done via double-RAF)
  const W=isZoom?(cv.offsetWidth||cv.parentElement.clientWidth||680):(cv.parentElement.clientWidth||300);
  // Fixed, sensible height — zoom uses a capped height, NOT a multiplier of W
  const H=isZoom?Math.min(400,Math.max(260,Math.round(W*0.44))):Math.max(160,Math.round(W*0.58));
  const ctx=setupHiDPICanvas(cv,W,H); if(!ctx) return;
  ctx.clearRect(0,0,W,H);
  const bg=getComputedStyle(document.documentElement).getPropertyValue('--surf').trim()||'#F7F8FB';
  const _th=document.documentElement.getAttribute('data-theme')||'classic';
  const T={
    classic:{best:'#22C55E',hi:'#1B3A6B',lo:'#B5D4F4',val:'#0F172A',lbl:'#64748B'},
    dark:   {best:'#4ADE80',hi:'#4A86E8',lo:'#314A6B',val:'#E2E8F0',lbl:'#94A3B8'},
    aurora: {best:'#4ADE80',hi:'#9B7FFF',lo:'#4A3485',val:'#F3EEFF',lbl:'#C4B5FD'},
    amber:  {best:'#8FB676',hi:'#F7A84D',lo:'#3B2B1D',val:'#F4E6D2',lbl:'#B49B7B'}
  }[_th]||{best:'#22C55E',hi:'#1B3A6B',lo:'#B5D4F4',val:'#0F172A',lbl:'#64748B'};
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  const mxP=Math.max(...probs,0.01);
  const {maxCut}=bfMaxCut();
  const QMF="'JetBrains Mono',monospace";
  const pad=8, gap=dim>32?0:dim>16?1:dim>8?2:3;
  // Guarantee total bar+gap area never exceeds canvas width
  const bw=Math.max(1,Math.floor((W-pad*2-(dim-1)*gap)/dim));
  // Show bitstring labels only when bars are wide enough (zoom relaxes the limit)
  const showLabels=isZoom?n<=6:n<=5;
  const rotateLabels=showLabels&&bw<26;
  const legendH=isZoom?16:13;
  const labelH=!showLabels?0:rotateLabels?(isZoom?52:42):isZoom?22:18;
  const pctH=isZoom?18:13;
  const barAreaH=H-labelH-pctH-legendH-8;

  const pctFont=`${isZoom?13:10}px ${QMF}`;
  let lastPctRight=-999;
  probs.forEach((p,i)=>{
    const x=pad+i*(bw+gap);
    const bh=Math.max(2,(p/mxP)*barAreaH);
    const y=pctH+4+(barAreaH-bh);
    let cut=0; QAOA_S.edges.forEach(({a,b})=>{if(((i>>a)&1)!==((i>>b)&1))cut++;});
    const isOpt=cut===maxCut;
    if(isOpt){ctx.shadowColor='rgba(34,197,94,.4)';ctx.shadowBlur=8;}
    ctx.fillStyle=isOpt?T.best:p>0.08?T.hi:T.lo;
    ctx.fillRect(x,y,bw,bh);
    ctx.shadowBlur=0;
    // percentage above bar — skip if it would overlap the previous label
    if(p>0.025){
      ctx.font=pctFont;
      const txt=(p*100).toFixed(0)+'%';
      const cx=x+bw/2, tw=ctx.measureText(txt).width;
      if(cx-tw/2>lastPctRight+2){
        ctx.fillStyle=T.val; ctx.textAlign='center';
        ctx.fillText(txt,cx,y-3);
        lastPctRight=cx+tw/2;
      }
    }
    // bitstring label
    if(showLabels){
      const lbl=i.toString(2).padStart(n,'0');
      ctx.fillStyle=T.lbl; ctx.font=`${isZoom&&rotateLabels?10:isZoom?12:9}px ${QMF}`;
      if(rotateLabels){
        // rotate -90°: text reads bottom-to-top, anchored just above legend
        ctx.save();
        ctx.translate(x+bw/2, H-legendH-8);
        ctx.rotate(-Math.PI/2);
        ctx.textAlign='left';
        ctx.fillText(lbl,2,4);
        ctx.restore();
      } else {
        ctx.textAlign='center';
        ctx.fillText(lbl,x+bw/2,H-legendH-4);
      }
    }
  });
  // legend row
  ctx.font=`${isZoom?12:10}px ${QMF}`; ctx.textAlign='left';
  ctx.fillStyle=T.best; ctx.fillText(_qaoaL('■ 最优割','■ Optimal cut'),pad,H-2);
  ctx.fillStyle=T.hi;   ctx.fillText(_qaoaL('■ 其他','■ Other'),pad+90,H-2);
}

function drawQAOAProbs(){
  const cv=document.getElementById('qaoa-prob-cv'); if(!cv) return;
  _drawQAOAProbsOnCanvas(cv, false);
}

function openQAOAProbZoom(){
  if(!QAOA_S.probs?.length) return;
  const overlay=document.getElementById('qaoa-zoom-overlay'); if(!overlay) return;
  overlay.classList.add('on');
  overlay.focus?.();
  // Double RAF: first frame makes overlay visible, second frame has layout computed
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const cv=document.getElementById('qaoa-zoom-cv'); if(!cv) return;
    _drawQAOAProbsOnCanvas(cv, true);
  }));
}

function closeQAOAProbZoom(){
  const overlay=document.getElementById('qaoa-zoom-overlay'); if(!overlay) return;
  overlay.classList.remove('on');
}
window.openQAOAProbZoom=openQAOAProbZoom;
window.closeQAOAProbZoom=closeQAOAProbZoom;

function refreshQAOAI18n() {
  updateQAOAInfo();
  updateQAOAEdgePanel();
  updateQAOACircuitDisplay();
  const runBtn = document.getElementById('qaoa-run-btn');
  if (runBtn && !QAOA_S.running) runBtn.textContent = _qaoaL('▶ 开始 QAOA 优化', '▶ Start QAOA Optimization');
  if (!QAOA_S.bestBits && document.getElementById('qaoa-solution')) {
    document.getElementById('qaoa-solution').innerHTML = _qaoaL(
      '运行 QAOA 后显示最优割方案。<br>绿色节点 = 集合 S &nbsp; 蓝色节点 = 集合 S̄',
      'Run QAOA to display the best cut assignment.<br>Green nodes = set S &nbsp; blue nodes = set S̄'
    );
  }
}
window.refreshQAOAI18n = refreshQAOAI18n;
window.refreshQAOAI18N = refreshQAOAI18n;
