// ── PANEL RESIZE ──

(function(){
  const R = document.documentElement;
  const MIN_C1=110, MAX_C1=360, MIN_C3=150, MAX_C3=580, MIN_R2=72, MAX_R2=420;
  const MIN_VV=150, MAX_VV=480, MIN_QV=150, MAX_QV=480;

  function gv(n){ return parseFloat(getComputedStyle(R).getPropertyValue(n))||0; }
  function sv(n,v){ R.style.setProperty(n, v+'px'); }

  function applyGrid(){
    const cv=document.getElementById('cv');
    if(!cv) return;
    cv.style.gridTemplateColumns=`${gv('--c1')}px minmax(0,1fr) ${gv('--c3')}px`;
    cv.style.gridTemplateRows=`minmax(0,1fr) ${gv('--r2')}px`;
  }

  function posHandles(){
    const cv=document.getElementById('cv');
    if(!cv) return;
    const W=cv.clientWidth, H=cv.clientHeight;
    const c1=gv('--c1'), c3=gv('--c3'), r2=gv('--r2');
    const L=document.getElementById('rz-l');
    const Rv=document.getElementById('rz-r');
    const B=document.getElementById('rz-b');
    if(L) Object.assign(L.style,{left:(c1-4)+'px',top:'0',height:H+'px'});
    if(Rv) Object.assign(Rv.style,{left:(W-c3-4)+'px',top:'0',height:H+'px'});
    if(B) Object.assign(B.style,{top:(H-r2-4)+'px',left:c1+'px',width:(W-c1-c3)+'px'});
  }

  function applyGridVV(){
    const el=document.getElementById('vv');
    if(!el) return;
    el.style.gridTemplateColumns=`${gv('--vv-c1')}px minmax(0,1fr) ${gv('--vv-c3')}px`;
  }
  function posHandlesVV(){
    const el=document.getElementById('vv');
    if(!el||!el.clientWidth) return;
    const W=el.clientWidth, H=el.clientHeight;
    const c1=gv('--vv-c1'), c3=gv('--vv-c3');
    const L=document.getElementById('rz-vv-l'), Rv=document.getElementById('rz-vv-r');
    if(L) Object.assign(L.style,{left:(c1-4)+'px',top:'0',height:H+'px'});
    if(Rv) Object.assign(Rv.style,{left:(W-c3-4)+'px',top:'0',height:H+'px'});
  }

  function applyGridQV(){
    const el=document.getElementById('qv');
    if(!el) return;
    el.style.gridTemplateColumns=`${gv('--qv-c1')}px minmax(0,1fr) ${gv('--qv-c3')}px`;
  }
  function posHandlesQV(){
    const el=document.getElementById('qv');
    if(!el||!el.clientWidth) return;
    const W=el.clientWidth, H=el.clientHeight;
    const c1=gv('--qv-c1'), c3=gv('--qv-c3');
    const L=document.getElementById('rz-qv-l'), Rv=document.getElementById('rz-qv-r');
    if(L) Object.assign(L.style,{left:(c1-4)+'px',top:'0',height:H+'px'});
    if(Rv) Object.assign(Rv.style,{left:(W-c3-4)+'px',top:'0',height:H+'px'});
  }

  function makeDrag(el, onDrag, getVars){
    let x0,y0,v1,v2,on=false;
    el.addEventListener('mousedown',e=>{
      e.preventDefault(); on=true; x0=e.clientX; y0=e.clientY;
      if(getVars){ const vs=getVars(); v1=vs[0]; v2=vs[1]; }
      else { v1=gv('--c1'); v2=gv('--c3'); }
      el.classList.add('dragging');
      document.body.style.cursor=el.classList.contains('rz-col')?'col-resize':'row-resize';
      document.body.style.userSelect='none';
    });
    document.addEventListener('mousemove',e=>{
      if(!on) return;
      onDrag(e.clientX-x0, e.clientY-y0, v1, v2);
      applyGrid(); posHandles();
      applyPanelZoom();
      _redrawAllCanvases();
    });
    document.addEventListener('mouseup',()=>{
      if(!on) return; on=false;
      el.classList.remove('dragging');
      document.body.style.cursor=''; document.body.style.userSelect='';
      saveLayout();
    });
  }

  // 各面板基准宽/高（对应 CSS 初始值）
  const BASE = { c1:220, c3:300, r2:220, vvC:300, qvC:300 };

  // 对固定宽/高的侧边面板应用 CSS zoom，实现内容等比缩放
  function applyPanelZoom() {
    const c1=gv('--c1'), c3=gv('--c3'), r2=gv('--r2');
    const vvC1=gv('--vv-c1'), vvC3=gv('--vv-c3');
    const qvC1=gv('--qv-c1'), qvC3=gv('--qv-c3');

    const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
    const z = (cur,base) => clamp(cur/base, 0.4, 3).toFixed(4);

    const tb=document.getElementById('tb'); if(tb) tb.style.zoom=z(c1,BASE.c1);
    const sp=document.getElementById('sp'); if(sp) sp.style.zoom=z(c3,BASE.c3);
    // #at (量子导师) 不需要缩放，仅调节容器高度

    const vvCols=document.querySelectorAll('#vv .vqecol');
    if(vvCols[0]) vvCols[0].style.zoom=z(vvC1,BASE.vvC);
    if(vvCols[2]) vvCols[2].style.zoom=z(vvC3,BASE.vvC);

    const qvCols=document.querySelectorAll('#qv .qaoa-col');
    if(qvCols[0]) qvCols[0].style.zoom=z(qvC1,BASE.qvC);
    if(qvCols[2]) qvCols[2].style.zoom=z(qvC3,BASE.qvC);
  }
  window.applyPanelZoom = applyPanelZoom;

  function _redrawAllCanvases(){
    try{ drawBloch(); renderProbChart(); }catch{}
    try{ if(typeof vqeData!=='undefined'&&vqeData.length>1) drawVQEChart(); }catch{}
    try{ drawQAOAChart(); }catch{}
    try{ drawQAOAProbs(); }catch{}
    try{ drawQAOAGraph(); }catch{}
    try{ const _dp=document.getElementById('sp-dm'); if(_dp&&_dp.classList.contains('on')) renderDensityMatrix(); }catch{}
    try{ renderEntanglement(); }catch{}
  }
  window._redrawAllCanvases = _redrawAllCanvases;

  // ── 面板布局持久化 ──
  let _saveLayoutTimer = null;
  function saveLayout() {
    clearTimeout(_saveLayoutTimer);
    _saveLayoutTimer = setTimeout(() => {
      localStorage.setItem('qedu_layout', JSON.stringify({
        c1:   gv('--c1'),    c3:   gv('--c3'),    r2:   gv('--r2'),
        vvC1: gv('--vv-c1'), vvC3: gv('--vv-c3'),
        qvC1: gv('--qv-c1'), qvC3: gv('--qv-c3'),
      }));
    }, 300);
  }
  window.saveLayout = saveLayout;

  window.addEventListener('load',()=>{
    const L=document.getElementById('rz-l');
    const Rv=document.getElementById('rz-r');
    const B=document.getElementById('rz-b');

    if(L) makeDrag(L,(dx,_,v1)=>sv('--c1',Math.max(MIN_C1,Math.min(MAX_C1,v1+dx))));
    if(Rv) makeDrag(Rv,(dx,_,v1,v2)=>{
      const W=document.getElementById('cv').clientWidth;
      const c1=gv('--c1');
      const newC3=Math.max(MIN_C3,Math.min(MAX_C3, W-c1-(W-c1-v2)-dx));
      sv('--c3',newC3);
    });
    if(B) makeDrag(B,(_,dy,v1)=>sv('--r2',Math.max(MIN_R2,Math.min(MAX_R2,v1-dy))),()=>[gv('--r2'),0]);

    // VQE handles
    const VL=document.getElementById('rz-vv-l'), VR=document.getElementById('rz-vv-r');
    if(VL) makeDrag(VL,(dx,_,v1)=>{
      sv('--vv-c1',Math.max(MIN_VV,Math.min(MAX_VV,v1+dx)));
      applyGridVV(); posHandlesVV(); _redrawAllCanvases();
    },()=>[gv('--vv-c1'),gv('--vv-c3')]);
    if(VR) makeDrag(VR,(dx,_,v1,v2)=>{
      const W=document.getElementById('vv').clientWidth;
      const newC3=Math.max(MIN_VV,Math.min(MAX_VV, v2-dx));
      sv('--vv-c3',newC3); applyGridVV(); posHandlesVV(); _redrawAllCanvases();
    },()=>[gv('--vv-c1'),gv('--vv-c3')]);

    // QAOA handles
    const QL=document.getElementById('rz-qv-l'), QR=document.getElementById('rz-qv-r');
    if(QL) makeDrag(QL,(dx,_,v1)=>{
      sv('--qv-c1',Math.max(MIN_QV,Math.min(MAX_QV,v1+dx)));
      applyGridQV(); posHandlesQV(); _redrawAllCanvases();
    },()=>[gv('--qv-c1'),gv('--qv-c3')]);
    if(QR) makeDrag(QR,(dx,_,v1,v2)=>{
      const W=document.getElementById('qv').clientWidth;
      const newC3=Math.max(MIN_QV,Math.min(MAX_QV, v2-dx));
      sv('--qv-c3',newC3); applyGridQV(); posHandlesQV(); _redrawAllCanvases();
    },()=>[gv('--qv-c1'),gv('--qv-c3')]);

    // ── 恢复已保存的面板布局 ──
    (function(){
      try {
        const s = JSON.parse(localStorage.getItem('qedu_layout') || 'null');
        if (!s) return;
        const cl = (v, lo, hi) => (typeof v === 'number' && v >= lo && v <= hi) ? v : null;
        [
          ['--c1',    s.c1,   MIN_C1, MAX_C1],
          ['--c3',    s.c3,   MIN_C3, MAX_C3],
          ['--r2',    s.r2,   MIN_R2, MAX_R2],
          ['--vv-c1', s.vvC1, MIN_VV, MAX_VV],
          ['--vv-c3', s.vvC3, MIN_VV, MAX_VV],
          ['--qv-c1', s.qvC1, MIN_QV, MAX_QV],
          ['--qv-c3', s.qvC3, MIN_QV, MAX_QV],
        ].forEach(([name, val, lo, hi]) => { const v = cl(val, lo, hi); if (v) sv(name, v); });
      } catch {}
    })();

    applyGrid(); posHandles();
    applyGridVV(); applyGridQV();
    applyPanelZoom();
  });
  window.addEventListener('resize',()=>{
    applyGrid(); posHandles();
    applyGridVV(); posHandlesVV();
    applyGridQV(); posHandlesQV();
    applyPanelZoom();
  });
  window.posHandles=posHandles;
  window.posHandlesVV=posHandlesVV;
  window.posHandlesQV=posHandlesQV;
})();
