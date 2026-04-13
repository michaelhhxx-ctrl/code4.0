// ── BLOCH SPHERE & VISUALIZATIONS ──
// Uses Three.js WebGL for 3D rendering; falls back to Canvas 2D if THREE is unavailable.

function _blochL(zh, en) { return window._currentLang === 'en' ? en : zh; }

// ── Layout ──
let _blochPerRow = 2;

// ── Per-qubit quantum state (theta, phi + animation targets) ──
let _blochQStates = [];
function _ensureQStates(n) {
  while (_blochQStates.length < n)
    _blochQStates.push({ theta: 0, phi: 0, tgt_t: 0, tgt_p: 0, animId: null });
}

// ── Three.js per-sphere objects ──
// _b3[q] = { renderer, scene, camera, rotGroup, stateArrow, projLine1, projLine2, size }
const _b3 = [];
let _b3SharedQuat = null;   // shared view quaternion (perRow > 1)
const _b3QQuats   = [];     // per-qubit quaternion (perRow === 1)
let _b3Zoom       = null;   // zoom-modal Three.js scene
let _zoomRotNeedsReset = false;

// ── Gallery: all-spheres expanded view ──
const _b3Gallery     = [];   // Three.js entries per qubit
const _b3GalleryQuats = [];  // per-qubit quaternions for gallery
let _galleryActiveDrag = null, _galleryDragLX = 0, _galleryDragLY = 0;
let _galleryDragBound  = false;

// ── Master-Detail (small mode) layout ──
let _b3MDMain   = null;          // Three.js scene for main sphere
const _b3MDThumbs = [];          // Three.js scenes for thumbnail spheres
let _mdMainQuat = null;          // independent drag-rotation for main sphere
const _mdDrag   = { active: false, lx: 0, ly: 0, bound: false };

// ── Legacy 2D state (kept for Canvas 2D fallback + BV compat) ──
let _blochQRots = [];
function _ensureQRots(n) {
  const def = () => mat3mul(rotX(-0.35), rotY(0.4));
  while (_blochQRots.length < n) _blochQRots.push(def());
}
const BV = {
  rot: [1,0,0, 0,1,0, 0,0,1],
  drag: false, lx: 0, ly: 0,
  _dragBound: false, _justDragged: false, _dragQ: null
};

function mat3mul(A, B) {
  const C = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    C[i*3+j] = A[i*3]*B[j] + A[i*3+1]*B[3+j] + A[i*3+2]*B[6+j];
  return C;
}
function rotX(a) { const c=Math.cos(a),s=Math.sin(a); return [1,0,0, 0,c,-s, 0,s,c]; }
function rotY(a) { const c=Math.cos(a),s=Math.sin(a); return [c,0,s, 0,1,0, -s,0,c]; }
function applyRot(v, rot) {
  const R = rot || BV.rot;
  return [R[0]*v[0]+R[1]*v[1]+R[2]*v[2], R[3]*v[0]+R[4]*v[1]+R[5]*v[2], R[6]*v[0]+R[7]*v[1]+R[8]*v[2]];
}
function proj3(v3, cx, cy, Rsphere, rot) {
  const p = applyRot(v3, rot);
  const fov = 1 + p[2] * 0.16;
  return [cx + Rsphere*p[0]*fov, cy - Rsphere*p[1]*fov, p[2]];
}

// ── Color palette ──
function _getBlochPalette() {
  const _th = document.documentElement.getAttribute('data-theme') || 'classic';
  return ({
    classic: { axisRGB:'55,65,81',    labelRGB:'27,58,107',   vectorCol:'#1B3A6B', gridEq:'#7695B0', gridLine:'#B5C3D0', sphereRGB:'247,248,252', projRGB:'100,116,139', tipColor:'#64748B', outline:'#7D97AE', thetaRGB:'80,96,115',  phiRGB:'124,58,237' },
    dark:    { axisRGB:'148,163,184', labelRGB:'99,155,240',  vectorCol:'#4A86E8', gridEq:'#3D5A82', gridLine:'#2A4268',  sphereRGB:'23,33,53',    projRGB:'74,134,232',  tipColor:'#4A6A9A', outline:'#4A6A96', thetaRGB:'100,116,139', phiRGB:'124,58,237' },
    aurora:  { axisRGB:'167,139,250', labelRGB:'180,159,255', vectorCol:'#9B7FFF', gridEq:'#6040A0', gridLine:'#3D2878',  sphereRGB:'28,18,72',    projRGB:'155,127,255', tipColor:'#6B5AA0', outline:'#7050B0', thetaRGB:'100,116,139', phiRGB:'124,58,237' },
    amber:   { axisRGB:'216,196,168', labelRGB:'244,230,210', vectorCol:'#F7A84D', gridEq:'#D4983E', gridLine:'#8A6645',  sphereRGB:'24,27,35',    projRGB:'247,168,77',  tipColor:'#B49B7B', outline:'#C0843A', thetaRGB:'180,155,123', phiRGB:'247,168,77' }
  }[_th] || { axisRGB:'71,85,105', labelRGB:'27,58,107', vectorCol:'#1B3A6B', gridEq:'#9BABC0', gridLine:'#D0D9E5', sphereRGB:'247,248,252', projRGB:'100,116,139', tipColor:'#94A3B8', outline:'#9BABC0', thetaRGB:'100,116,139', phiRGB:'124,58,237' });
}
function _c3(s) { return s.startsWith('#') ? new THREE.Color(s) : new THREE.Color('rgb('+s+')'); }

// ── Initial quaternion matching Canvas 2D default (rotY(0.4) then rotX(-0.35)) ──
function _getInitQuat() {
  if (!window.THREE) return null;
  const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), 0.4);
  const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), -0.35);
  return new THREE.Quaternion().multiplyQuaternions(qX, qY); // apply qY first, then qX
}

// ── Coordinate mapping: quantum(x,y,z) → Three.js(x, z, -y) ──
// quantum z (north=|0⟩) maps to Three.js +Y; quantum y maps to Three.js -Z
// State vector: THREE.Vector3(sin(t)*cos(p), cos(t), -sin(t)*sin(p))
function _stateDir(theta, phi) {
  return new THREE.Vector3(
    Math.sin(theta) * Math.cos(phi),
    Math.cos(theta),
    -Math.sin(theta) * Math.sin(phi)
  );
}

// ── Sprite text label ──
function _makeLabel3D(text, hexColor, fontPx) {
  const cw = 512, ch = 256;  // 4× resolution for sharp text
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = hexColor;
  ctx.font = `italic bold ${fontPx}px "Crimson Pro",Georgia,serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, cw/2, ch/2);
  const tex = new THREE.CanvasTexture(cv);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(0.50, 0.26, 1);
  return sp;
}

// ── Build one Three.js Bloch-sphere scene on an existing canvas ──
function _create3DScene(cv, size) {
  if (!window.THREE) return null;
  try {
  const T = THREE;
  const p = _getBlochPalette();
  const th = document.documentElement.getAttribute('data-theme') || 'classic';

  const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(size, size);
  renderer.setClearColor(0x000000, 0);

  const scene  = new T.Scene();
  const camera = new T.PerspectiveCamera(54, 1, 0.1, 20);
  camera.position.set(0, 0, 3.5);

  const rotGroup = new T.Group();
  scene.add(rotGroup);

  // ── Lighting (world space — stays fixed relative to camera) ──
  scene.add(new T.AmbientLight(0xffffff, 0.65));
  const _sun = new T.DirectionalLight(0xffffff, 0.90);
  _sun.position.set(-1.5, 2.5, 2.0);
  scene.add(_sun);
  const _fill = new T.DirectionalLight(0xffffff, 0.10);
  _fill.position.set(2.0, -1.0, -1.0);
  scene.add(_fill);

  // ── Sphere body: MeshPhong for real shading; renders first (behind grid) ──
  const _spc = {
    classic: { c:0xEDF4FF, em:0x0D1E40, sp:0xC0D4F8, sh:80, op:0.50 },
    dark:    { c:0x182540, em:0x0E1525, sp:0x4A86E8, sh:80, op:0.58 },
    aurora:  { c:0x1E0E50, em:0x110830, sp:0x9B7FFF, sh:80, op:0.58 },
    amber:   { c:0x1A1820, em:0x100E14, sp:0xF7A84D, sh:70, op:0.54 }
  }[th] || { c:0xEDF4FF, em:0x0D1E40, sp:0xC0D4F8, sh:55, op:0.38 };
  const sphereMesh = new T.Mesh(
    new T.SphereGeometry(0.993, 48, 36),
    new T.MeshPhongMaterial({
      color: _spc.c, emissive: _spc.em, emissiveIntensity: 0.12,
      specular: _spc.sp, shininess: _spc.sh,
      transparent: true, opacity: _spc.op, depthTest: false, depthWrite: false
    })
  );
  sphereMesh.renderOrder = -6;
  rotGroup.add(sphereMesh);

  // ── Ghost grid lines (depthTest:false, very faint — background "see-through") ──
  function _ghostLine(pts, op, col) {
    const l = new T.Line(
      new T.BufferGeometry().setFromPoints(pts),
      new T.LineBasicMaterial({ color: col, transparent: true, opacity: op, depthTest: false, depthWrite: false })
    );
    l.renderOrder = -5; return l;
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = Math.sin(lat*Math.PI/180), r = Math.cos(lat*Math.PI/180);
    const pts = [];
    for (let i = 0; i <= 64; i++) { const a = i/64*Math.PI*2; pts.push(new T.Vector3(r*Math.cos(a), y, -r*Math.sin(a))); }
    rotGroup.add(_ghostLine(pts, lat === 0 ? 0.32 : 0.18, lat === 0 ? _c3(p.gridEq) : _c3(p.gridLine)));
  }
  for (let lng = 0; lng < 180; lng += 30) {
    const ar = lng*Math.PI/180, pts = [];
    for (let i = 0; i <= 64; i++) { const t = i/64*Math.PI*2; pts.push(new T.Vector3(Math.sin(t)*Math.cos(ar), Math.cos(t), -Math.sin(t)*Math.sin(ar))); }
    rotGroup.add(_ghostLine(pts, 0.15, _c3(p.gridLine)));
  }

  // ── Depth mask spheres (colorWrite:false — write depth only, no color output) ──
  // BackSide pass: fills back-hemisphere depth; FrontSide pass: fills front-hemisphere depth.
  // Combined result: depth buffer mirrors true sphere surface → grid lines outside (r=1.0)
  // pass depth test on the front face only, giving natural front-bright/back-hidden occlusion.
  const _dmMat = (side) => {
    const m = new T.MeshBasicMaterial({ depthWrite: true, side });
    m.colorWrite = false; return m;
  };
  const dmBack  = new T.Mesh(new T.SphereGeometry(0.993, 48, 36), _dmMat(T.BackSide));
  dmBack.renderOrder = -3; rotGroup.add(dmBack);
  const dmFront = new T.Mesh(new T.SphereGeometry(0.993, 48, 36), _dmMat(T.FrontSide));
  dmFront.renderOrder = -2; rotGroup.add(dmFront);

  // ── Front grid lines (depthTest:true — front hemisphere visible, back hidden) ──
  function _frontLine(pts, op, col) {
    const l = new T.Line(
      new T.BufferGeometry().setFromPoints(pts),
      new T.LineBasicMaterial({ color: col, transparent: true, opacity: op, depthTest: true, depthWrite: false })
    );
    l.renderOrder = -1; return l;
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = Math.sin(lat*Math.PI/180), r = Math.cos(lat*Math.PI/180);
    const pts = [];
    for (let i = 0; i <= 64; i++) { const a = i/64*Math.PI*2; pts.push(new T.Vector3(r*Math.cos(a), y, -r*Math.sin(a))); }
    rotGroup.add(_frontLine(pts, lat === 0 ? 1.00 : 0.82, lat === 0 ? _c3(p.gridEq) : _c3(p.gridLine)));
  }
  for (let lng = 0; lng < 180; lng += 30) {
    const ar = lng*Math.PI/180, pts = [];
    for (let i = 0; i <= 64; i++) { const t = i/64*Math.PI*2; pts.push(new T.Vector3(Math.sin(t)*Math.cos(ar), Math.cos(t), -Math.sin(t)*Math.sin(ar))); }
    rotGroup.add(_frontLine(pts, 0.68, _c3(p.gridLine)));
  }

  // ── Rim: BackSide slightly-larger sphere → visible edge halo ──
  const rimMesh = new T.Mesh(
    new T.SphereGeometry(1.020, 32, 24),
    new T.MeshBasicMaterial({ color: _c3(p.outline), side: T.BackSide, transparent: true, opacity: 0.45, depthTest: false, depthWrite: false })
  );
  rimMesh.renderOrder = 0;
  rotGroup.add(rimMesh);

  // ── Axes ──
  function _addArrow(dir, origin, len, color) {
    const arr = new T.ArrowHelper(dir, origin, len, color, 0.18, 0.10);
    arr.line.material.transparent = true; arr.line.material.opacity = 1.0; arr.line.material.depthTest = false; arr.line.material.depthWrite = false;
    arr.cone.material.transparent = true; arr.cone.material.opacity = 1.0; arr.cone.material.depthTest = false; arr.cone.material.depthWrite = false;
    arr.line.renderOrder = 2; arr.cone.renderOrder = 2;
    return arr;
  }
  const axLen = 1.24, axC = _c3(p.axisRGB);
  rotGroup.add(_addArrow(new T.Vector3(0,1,0),  new T.Vector3(0,-axLen,0), axLen*2, axC));
  rotGroup.add(_addArrow(new T.Vector3(1,0,0),  new T.Vector3(-axLen,0,0), axLen*2, axC));
  rotGroup.add(_addArrow(new T.Vector3(0,0,-1), new T.Vector3(0,0,axLen),  axLen*2, axC));

  // ── Axis labels ──
  // With FOV=50° and camera at z=3.5, visible half-extent = 3.5*tan(25°) = 1.632
  // Worst-case NDC for labels (when axis rotates to lie horizontal): pos/1.632 < 0.90
  const lblHex = '#' + p.labelRGB.split(',').map(v=>parseInt(v).toString(16).padStart(2,'0')).join('');
  const small = size < 110;
  const fMain = small ? 120 : 160, fPole = small ? 88 : 112;
  const lblZ = _makeLabel3D('Z',    lblHex, fMain); lblZ.position.set(0, axLen+0.22, 0);    lblZ.renderOrder = 3;
  const lblX = _makeLabel3D('X',    lblHex, fMain); lblX.position.set(axLen+0.18, 0, 0);    lblX.renderOrder = 3;
  const lblY = _makeLabel3D('Y',    lblHex, fMain); lblY.position.set(0, 0, -(axLen+0.18)); lblY.renderOrder = 3;
  const lbl0 = _makeLabel3D('|0⟩', lblHex, fPole); lbl0.position.set(0, 1.14, 0);           lbl0.renderOrder = 3;
  const lbl1 = _makeLabel3D('|1⟩', lblHex, fPole); lbl1.position.set(0, -1.14, 0);          lbl1.renderOrder = 3;
  rotGroup.add(lblZ, lblX, lblY, lbl0, lbl1);

  // ── State vector arrow ──
  const stateArrow = new T.ArrowHelper(
    new T.Vector3(0,1,0), new T.Vector3(0,0,0), 0.95, _c3(p.vectorCol), 0.22, 0.12
  );
  stateArrow.line.material.depthTest = false; stateArrow.line.material.depthWrite = false;
  stateArrow.cone.material.depthTest = false; stateArrow.cone.material.depthWrite = false;
  stateArrow.line.renderOrder = 4; stateArrow.cone.renderOrder = 4;
  rotGroup.add(stateArrow);

  // ── Projection dashed lines ──
  const projC = _c3(p.projRGB);
  const mProj1 = new THREE.LineDashedMaterial({ color: projC, transparent: true, opacity: 0.70, dashSize: 0.05, gapSize: 0.04, depthTest: false, depthWrite: false });
  const mProj2 = new THREE.LineDashedMaterial({ color: projC, transparent: true, opacity: 0.45, dashSize: 0.04, gapSize: 0.05, depthTest: false, depthWrite: false });
  const projLine1 = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0,1,0), new T.Vector3(0,0,0)]), mProj1);
  const projLine2 = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0,0,0), new T.Vector3(0,0,0)]), mProj2);
  projLine1.computeLineDistances(); projLine2.computeLineDistances();
  projLine1.renderOrder = 5; projLine2.renderOrder = 5;
  rotGroup.add(projLine1, projLine2);

  // ── Center dot + projection foot dot ──
  const centerDot = new T.Mesh(
    new T.SphereGeometry(0.028, 8, 8),
    new T.MeshBasicMaterial({ color: _c3(p.tipColor), transparent: true, opacity: 0.90, depthTest: false, depthWrite: false })
  );
  centerDot.renderOrder = 5; rotGroup.add(centerDot);
  const projDot = new T.Mesh(
    new T.SphereGeometry(0.032, 8, 8),
    new T.MeshBasicMaterial({ color: projC, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false })
  );
  projDot.renderOrder = 5; rotGroup.add(projDot);

  return { renderer, scene, camera, rotGroup, stateArrow, projLine1, projLine2, projDot, size };
  } catch (e) {
    console.error('[Q-Edu] Three.js scene creation failed:', e);
    return null;
  }
}

function _disposeScene(entry) {
  if (!entry) return;
  entry.scene.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) { if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose()); else obj.material.dispose(); }
  });
  entry.renderer.dispose();
}

// ── Slot size ──
function _blochSlotSize() {
  const multi = document.getElementById('bloch-multi');
  const availW = (multi && multi.clientWidth > 0) ? multi.clientWidth : 300;
  const slotW = Math.max(70, Math.floor((availW - (_blochPerRow-1)*4 - 16) / _blochPerRow));
  return Math.min(slotW, 420);
}

// ── Render one sphere via Three.js ──
function _render3D(q) {
  const entry = _b3[q]; if (!entry) return;
  const bs = _blochQStates[q]; if (!bs) return;

  const size = _blochSlotSize();
  if (entry.size !== size) { entry.renderer.setSize(size, size); entry.size = size; }

  const dir = _stateDir(bs.theta, bs.phi);
  if (dir.lengthSq() > 0.0001) {
    entry.stateArrow.setDirection(dir.clone().normalize());
    entry.stateArrow.setLength(0.95, 0.18, 0.10);
  }

  const tip   = dir.clone().multiplyScalar(0.95);
  const xzPrj = new THREE.Vector3(tip.x, 0, tip.z);
  entry.projLine1.geometry.setFromPoints([tip, xzPrj]); entry.projLine1.computeLineDistances();
  entry.projLine2.geometry.setFromPoints([xzPrj, new THREE.Vector3(0,0,0)]); entry.projLine2.computeLineDistances();
  if (entry.projDot) entry.projDot.position.copy(xzPrj);

  const rot = (_blochPerRow === 1 && _b3QQuats[q]) ? _b3QQuats[q] : (_b3SharedQuat || _getInitQuat());
  if (rot) entry.rotGroup.quaternion.copy(rot);

  entry.renderer.render(entry.scene, entry.camera);
}

// ── Stats panel update ──
function _updateBlochStats(q) {
  const bs = _blochQStates[q]; if (!bs) return;
  const { theta, phi } = bs;
  const vec3 = [Math.sin(theta)*Math.cos(phi), Math.sin(theta)*Math.sin(phi), Math.cos(theta)];
  const bxEl=document.getElementById('bx'), byEl=document.getElementById('by'), bzEl=document.getElementById('bz');
  if(bxEl) bxEl.textContent=vec3[0].toFixed(2);
  if(byEl) byEl.textContent=vec3[1].toFixed(2);
  if(bzEl) bzEl.textContent=vec3[2].toFixed(2);
  const tDeg=(theta*180/Math.PI).toFixed(1);
  const pDegRaw=((phi*180/Math.PI)%360+360)%360, pDeg=pDegRaw.toFixed(1);
  const p0=Math.pow(Math.cos(theta/2),2), p1=Math.pow(Math.sin(theta/2),2);
  const tEl=document.getElementById('b-theta'); if(tEl) tEl.textContent=tDeg+'°';
  const pEl=document.getElementById('b-phi');   if(pEl) pEl.textContent=pDeg+'°';
  const p0El=document.getElementById('b-p0');   if(p0El) p0El.textContent=p0.toFixed(3);
  const p1El=document.getElementById('b-p1');   if(p1El) p1El.textContent=p1.toFixed(3);
  const aEl=document.getElementById('b-alpha'); if(aEl) aEl.textContent=Math.cos(theta/2).toFixed(3);
  const bEl=document.getElementById('b-beta');  if(bEl) bEl.textContent=Math.sin(theta/2).toFixed(3);
  const pdEl=document.getElementById('b-phi-deg'); if(pdEl) pdEl.textContent=pDeg+'°';
  const tDegN=parseFloat(tDeg);
  let chipClass, chipText, descText;
  if(tDegN<12)      { chipClass='bi-chip-0';   chipText=_blochL('|0⟩ 基态','|0⟩ Ground');    descText=_blochL('北极点 · 测量恒得 |0⟩','North pole · always measures |0⟩'); }
  else if(tDegN>168){ chipClass='bi-chip-1';   chipText=_blochL('|1⟩ 激发态','|1⟩ Excited'); descText=_blochL('南极点 · 测量恒得 |1⟩','South pole · always measures |1⟩'); }
  else if(tDegN>78&&tDegN<102) {
    const pd=pDegRaw;
    if(pd<22||pd>338)          { chipClass='bi-chip-sup'; chipText='|+⟩';                        descText=_blochL('赤道 X⁺ · 测得 0/1 各 ½','Equator X⁺ · P(0)=P(1)=½'); }
    else if(pd>158&&pd<202)    { chipClass='bi-chip-sup'; chipText='|−⟩';                        descText=_blochL('赤道 X⁻ · 测得 0/1 各 ½','Equator X⁻ · P(0)=P(1)=½'); }
    else if(pd>68&&pd<112)     { chipClass='bi-chip-sup'; chipText='|i⟩';                        descText=_blochL('赤道 Y⁺ · 测得 0/1 各 ½','Equator Y⁺ · P(0)=P(1)=½'); }
    else if(pd>248&&pd<292)    { chipClass='bi-chip-sup'; chipText='|−i⟩';                       descText=_blochL('赤道 Y⁻ · 测得 0/1 各 ½','Equator Y⁻ · P(0)=P(1)=½'); }
    else                       { chipClass='bi-chip-sup'; chipText=_blochL('等权叠加','Equal super.'); descText='P(0)=P(1)=50%'; }
  } else { chipClass='bi-chip-gen'; chipText=_blochL('一般叠加态','Superposition'); descText=`P(|0⟩)=${(p0*100).toFixed(0)}%  P(|1⟩)=${(p1*100).toFixed(0)}%`; }
  const biChip=document.getElementById('bi-chip');
  if(biChip){ biChip.className=`bi-chip ${chipClass}`; biChip.textContent=chipText; }
  const biDesc=document.getElementById('bi-desc'); if(biDesc) biDesc.textContent=descText;
}

// ── drawBloch: render all visible spheres ──
function drawBloch() {
  const nShow = Math.min(S.qubits, 5);
  _ensureQStates(nShow);

  // ── Master-Detail mode (small / pr-2) ──
  if (_blochPerRow === 2) {
    if (!_b3MDMain && !document.getElementById('bloch-main-cv')) _initMDLayout();
    _renderMDAll();
    _updateBlochStats(S.selQ);
    _updateZoomIfOpen();
    const _gOv2 = document.getElementById('bloch-gallery-overlay');
    if (_gOv2 && _gOv2.classList.contains('on')) _drawGalleryAll();
    return;
  }

  // ── Large mode (pr-1): existing path ──
  if (!window.THREE) _ensureQRots(nShow);
  const size = _blochSlotSize();
  for (let q = 0; q < nShow; q++) {
    if (window.THREE && _b3[q]) {
      _render3D(q);
    } else {
      const cv = document.getElementById('bloch-cv-' + q); if (!cv) continue;
      const rot = (_blochPerRow === 1) ? _blochQRots[q] : BV.rot;
      _drawBlochSphere(cv, _blochQStates[q], size, q === S.selQ, rot, _blochPerRow === 1);
    }
  }
  _updateBlochStats(S.selQ);
  _updateZoomIfOpen();
  const _gOv = document.getElementById('bloch-gallery-overlay');
  if (_gOv && _gOv.classList.contains('on')) _drawGalleryAll();
}

// ── Animate single qubit ──
function _animBlochQ(q, t, p) {
  _ensureQStates(q + 1);
  _ensureQRots(q + 1);
  const bs = _blochQStates[q];
  bs.tgt_t = t; bs.tgt_p = p;
  if (bs.animId) cancelAnimationFrame(bs.animId);
  function step() {
    bs.theta += (bs.tgt_t - bs.theta) * 0.12;
    bs.phi   += (bs.tgt_p - bs.phi)   * 0.12;
    if (_blochPerRow === 2) {
      if (q === S.selQ) _renderMDMain();
      _renderMDThumb(q);
    } else if (window.THREE && _b3[q]) {
      _render3D(q);
    } else {
      const cv = document.getElementById('bloch-cv-' + q);
      const rot = (_blochPerRow === 1) ? _blochQRots[q] : BV.rot;
      if (cv) _drawBlochSphere(cv, bs, _blochSlotSize(), q === S.selQ, rot, _blochPerRow === 1);
    }
    if (q === S.selQ) _updateBlochStats(q);
    _updateZoomIfOpen(q);
    const _agOv = document.getElementById('bloch-gallery-overlay');
    if (_agOv && _agOv.classList.contains('on')) _drawGalleryQ(q);
    if (Math.abs(bs.tgt_t - bs.theta) > 0.004 || Math.abs(bs.tgt_p - bs.phi) > 0.004) {
      bs.animId = requestAnimationFrame(step);
    } else {
      bs.theta = bs.tgt_t; bs.phi = bs.tgt_p;
      if (_blochPerRow === 2) {
        if (q === S.selQ) _renderMDMain();
        _renderMDThumb(q);
      } else if (window.THREE && _b3[q]) _render3D(q);
      else {
        const cv2 = document.getElementById('bloch-cv-' + q);
        const rot2 = (_blochPerRow === 1) ? _blochQRots[q] : BV.rot;
        if (cv2) _drawBlochSphere(cv2, bs, _blochSlotSize(), q === S.selQ, rot2, _blochPerRow === 1);
      }
      if (q === S.selQ) _updateBlochStats(q);
      _updateZoomIfOpen(q);
      bs.animId = null;
    }
  }
  bs.animId = requestAnimationFrame(step);
}

// ── animBloch: backward-compat wrapper ──
function animBloch(t, p) {
  const nShow = Math.min(S.qubits, 5);
  _ensureQStates(nShow);
  if (t === 0 && p === 0) { for (let q = 0; q < nShow; q++) _animBlochQ(q, 0, 0); }
  else { _animBlochQ(S.selQ, t, p); }
  S.bloch.tgt_t = t; S.bloch.tgt_p = p;
}

// ── setBlochSz ──
function setBlochSz(perRow) {
  _blochPerRow = perRow;
  // Force full DOM+scene rebuild — MD and large modes have different DOM structures
  _disposeMDScenes();
  for (let q = 0; q < _b3.length; q++) { _disposeScene(_b3[q]); _b3[q] = null; }
  _b3.length = 0;
  const container = document.getElementById('bloch-multi');
  if (container) { container.className = `bloch-multi-row pr-${perRow}`; container.innerHTML = ''; }
  if (perRow === 1) {
    const n = Math.min(S.qubits, 5);
    _ensureQRots(n);
    for (let q = 0; q < n; q++) {
      _blochQRots[q] = [...BV.rot];
      if (window.THREE) _b3QQuats[q] = _b3SharedQuat ? _b3SharedQuat.clone() : _getInitQuat();
    }
  }
  document.querySelectorAll('.bloch-sz-btn').forEach(b => b.classList.toggle('on', parseInt(b.dataset.pr) === perRow));
  initBlochSpheres();
  requestAnimationFrame(drawBloch);
}
window.setBlochSz = setBlochSz;

// ── Apply drag delta to rotation (shared or per-qubit) ──
function _applyDrag(dx, dy, dragQ) {
  if (_blochPerRow === 1 && dragQ !== null) {
    _ensureQRots(dragQ + 1);
    _blochQRots[dragQ] = mat3mul(rotY(dx), mat3mul(rotX(dy), _blochQRots[dragQ]));
    if (window.THREE) {
      if (!_b3QQuats[dragQ]) _b3QQuats[dragQ] = _b3SharedQuat ? _b3SharedQuat.clone() : _getInitQuat();
      const dq = new THREE.Quaternion().multiplyQuaternions(
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), dx),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), dy)
      );
      _b3QQuats[dragQ].premultiply(dq);
      if (_b3[dragQ]) _render3D(dragQ);
    } else {
      const cvi = document.getElementById('bloch-cv-' + dragQ);
      if (cvi) _drawBlochSphere(cvi, _blochQStates[dragQ], _blochSlotSize(), dragQ === S.selQ, _blochQRots[dragQ], true);
    }
  } else {
    BV.rot = mat3mul(rotY(dx), mat3mul(rotX(dy), BV.rot));
    if (window.THREE && _b3SharedQuat) {
      const dq = new THREE.Quaternion().multiplyQuaternions(
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), dx),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), dy)
      );
      _b3SharedQuat.premultiply(dq);
    }
    drawBloch();
  }
}

// ── Init DOM + Three.js scenes ──
function initBlochSpheres() {
  // ── Master-Detail mode: delegate entirely ──
  if (_blochPerRow === 2) { _initMDLayout(); return; }

  const nShow = Math.min(S.qubits, 5);
  const container = document.getElementById('bloch-multi'); if (!container) return;
  container.className = `bloch-multi-row pr-${_blochPerRow}`;

  const slots = container.querySelectorAll('.bloch-sphere-slot');
  if (slots.length === nShow) {
    slots.forEach(s => s.classList.toggle('focused', parseInt(s.dataset.q) === S.selQ));
    return;
  }

  _ensureQStates(nShow);
  _ensureQRots(nShow);

  // Dispose old Three.js scenes
  for (let q = 0; q < _b3.length; q++) { _disposeScene(_b3[q]); _b3[q] = null; }
  _b3.length = 0;

  container.innerHTML = '';
  const size = _blochSlotSize();
  if (!_b3SharedQuat && window.THREE) _b3SharedQuat = _getInitQuat();

  for (let q = 0; q < nShow; q++) {
    const slot = document.createElement('div');
    slot.className = 'bloch-sphere-slot' + (q === S.selQ ? ' focused' : '');
    slot.dataset.q = q;
    slot.addEventListener('click', () => {
      if (BV._justDragged) return;
      S.selQ = q; initBlochSpheres(); _updateBlochStats(q); drawBloch(); renderQSelBar();
    });

    const lbl = document.createElement('div');
    lbl.className = 'bloch-sphere-qlbl'; lbl.textContent = 'q' + q;

    const zoomBtn = document.createElement('div');
    zoomBtn.className = 'bloch-zoom-btn';
    zoomBtn.title = _blochL('点击放大', 'Click to zoom');
    zoomBtn.innerHTML = '⤢';
    zoomBtn.addEventListener('click', e => { e.stopPropagation(); openBlochZoom(q); });

    const cv = document.createElement('canvas');
    cv.className = 'bloch-sphere-cv'; cv.id = 'bloch-cv-' + q;
    cv.addEventListener('dblclick', e => { e.stopPropagation(); openBlochZoom(q); });

    slot.appendChild(lbl); slot.appendChild(zoomBtn); slot.appendChild(cv);
    container.appendChild(slot);

    if (window.THREE) {
      const entry = _create3DScene(cv, size);
      if (entry) {
        const rot = (_blochPerRow === 1 && _b3QQuats[q]) ? _b3QQuats[q] : (_b3SharedQuat || _getInitQuat());
        if (rot) entry.rotGroup.quaternion.copy(rot);
        _b3[q] = entry;
      }
    } else {
      setupHiDPICanvas(cv, size, size);
    }
  }
  _initAllBlochDrag();
}

// ── Drag binding ──
function _initAllBlochDrag() {
  const container = document.getElementById('bloch-multi'); if (!container) return;
  if (BV.rot[0] === 1 && BV.rot[4] === 1 && BV.rot[8] === 1) BV.rot = mat3mul(rotX(-0.35), rotY(0.4));
  if (!_b3SharedQuat && window.THREE) _b3SharedQuat = _getInitQuat();

  container.querySelectorAll('.bloch-sphere-cv').forEach(cv => {
    const q = parseInt(cv.id.replace('bloch-cv-', ''));
    cv.style.cursor = 'grab';
    cv.addEventListener('mousedown', e => {
      BV.drag = true; BV._justDragged = false; BV._dragQ = q;
      BV.lx = e.clientX; BV.ly = e.clientY; cv.style.cursor = 'grabbing'; e.stopPropagation();
    });
    cv.addEventListener('touchstart', e => {
      e.preventDefault(); const t0 = e.touches[0];
      BV.drag = true; BV._dragQ = q; BV.lx = t0.clientX; BV.ly = t0.clientY;
    }, { passive: false });
    cv.addEventListener('touchend', () => { BV.drag = false; });
    cv.addEventListener('touchmove', e => {
      e.preventDefault(); const t0 = e.touches[0];
      const dx = (t0.clientX - BV.lx) * 0.009, dy = (t0.clientY - BV.ly) * 0.009;
      _applyDrag(dx, dy, BV._dragQ); BV.lx = t0.clientX; BV.ly = t0.clientY;
    }, { passive: false });
  });

  if (!BV._dragBound) {
    BV._dragBound = true;
    document.addEventListener('mouseup', () => {
      if (BV.drag) BV._justDragged = true;
      BV.drag = false;
      document.querySelectorAll('.bloch-sphere-cv').forEach(c => { c.style.cursor = 'grab'; });
      setTimeout(() => { BV._justDragged = false; }, 80);
    });
    document.addEventListener('mousemove', e => {
      if (!BV.drag) return;
      BV._justDragged = true;
      const dx = (e.clientX - BV.lx) * 0.009, dy = (e.clientY - BV.ly) * 0.009;
      _applyDrag(dx, dy, BV._dragQ); BV.lx = e.clientX; BV.ly = e.clientY;
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeBlochZoom(); closeBlochGallery(); }
      const ov = document.getElementById('bloch-zoom-overlay');
      if (ov && ov.classList.contains('on')) {
        if (e.key === 'ArrowLeft') blochZoomNav(-1);
        if (e.key === 'ArrowRight') blochZoomNav(1);
      }
    });
  }
}

function initBlochDrag() { initBlochSpheres(); _initZoomDrag(); }

// Rebuild Three.js scenes after a theme change (materials need new palette colors)
function refreshBlochTheme() {
  if (!window.THREE) { drawBloch(); return; }
  if (_b3Zoom) { _disposeScene(_b3Zoom); _b3Zoom = null; }

  // ── Master-Detail mode ──
  if (_blochPerRow === 2) {
    _disposeMDScenes();
    const mainCv = document.getElementById('bloch-main-cv');
    if (mainCv) {
      const msz = _getMDMainSize();
      _b3MDMain = _create3DScene(mainCv, msz);
      if (_b3MDMain && _mdMainQuat) _b3MDMain.rotGroup.quaternion.copy(_mdMainQuat);
    }
    const nShowMD = Math.min(S.qubits, 5);
    for (let q = 0; q < nShowMD; q++) {
      const cv = document.getElementById('bloch-thumb-cv-' + q);
      if (cv) {
        const entry = _create3DScene(cv, _MD_THUMB_SZ);
        if (entry) { if (_b3SharedQuat) entry.rotGroup.quaternion.copy(_b3SharedQuat); _b3MDThumbs[q] = entry; }
      }
    }
    _renderMDAll();
    // Gallery
    if (_b3Gallery.length > 0) { const grid = document.getElementById('bloch-gallery-grid'); if (grid) { const gcvs = grid.querySelectorAll('.bloch-gallery-cv'); for (let q=0;q<_b3Gallery.length;q++){_disposeScene(_b3Gallery[q]);_b3Gallery[q]=null;} _b3Gallery.length=0; const gsz=_gallerySlotSize(gcvs.length); gcvs.forEach((cv,i)=>{const e=_create3DScene(cv,gsz);if(e){if(_b3GalleryQuats[i])e.rotGroup.quaternion.copy(_b3GalleryQuats[i]);_b3Gallery[i]=e;}}); _drawGalleryAll(); } }
    return;
  }

  // ── Large mode ──
  const nShow = Math.min(S.qubits, 5);
  const container = document.getElementById('bloch-multi');
  if (!container) return;
  for (let q = 0; q < _b3.length; q++) { _disposeScene(_b3[q]); _b3[q] = null; }
  _b3.length = 0;
  const size = _blochSlotSize();
  container.querySelectorAll('.bloch-sphere-cv').forEach((cv, idx) => {
    const entry = _create3DScene(cv, size);
    if (entry) {
      const rot = (_blochPerRow === 1 && _b3QQuats[idx]) ? _b3QQuats[idx] : (_b3SharedQuat || _getInitQuat());
      if (rot) entry.rotGroup.quaternion.copy(rot);
      _b3[idx] = entry;
    }
  });
  // Rebuild gallery scenes if any exist
  if (_b3Gallery.length > 0) {
    const grid = document.getElementById('bloch-gallery-grid');
    if (grid) {
      const gcvs = grid.querySelectorAll('.bloch-gallery-cv');
      for (let q = 0; q < _b3Gallery.length; q++) { _disposeScene(_b3Gallery[q]); _b3Gallery[q] = null; }
      _b3Gallery.length = 0;
      const gsz = _gallerySlotSize(gcvs.length);
      gcvs.forEach((cv, idx) => {
        const entry = _create3DScene(cv, gsz);
        if (entry) {
          if (_b3GalleryQuats[idx]) entry.rotGroup.quaternion.copy(_b3GalleryQuats[idx]);
          _b3Gallery[idx] = entry;
        }
      });
      _drawGalleryAll();
    }
  }
  drawBloch();
}
window.refreshBlochTheme = refreshBlochTheme;

// ══ Zoom modal ══
let _zoomQ = 0;
let _zoomRot = null; // 2D fallback rotation
const _zoomDrag = { active: false, lx: 0, ly: 0, bound: false };

function openBlochZoom(q) {
  _zoomQ = q;
  _zoomRotNeedsReset = true; // sync rotation from the sphere on next draw
  const overlay = document.getElementById('bloch-zoom-overlay');
  if (overlay) { overlay.classList.add('on'); _loadVid(overlay.querySelector('video')); }
  _updateZoomLabel();
  _drawBlochZoom();
}
window.openBlochZoom = openBlochZoom;

function closeBlochZoom() {
  const ov = document.getElementById('bloch-zoom-overlay');
  if (ov) ov.classList.remove('on');
}
window.closeBlochZoom = closeBlochZoom;

function blochZoomNav(d) {
  const nShow = Math.min(S.qubits, 5);
  _zoomQ = (_zoomQ + d + nShow) % nShow;
  _updateZoomLabel(); _drawBlochZoom();
}
window.blochZoomNav = blochZoomNav;

function _updateZoomLabel() {
  const lbl = document.getElementById('bloch-zoom-qlbl'); if (lbl) lbl.textContent = 'q' + _zoomQ;
}

function _drawBlochZoom() {
  const cv = document.getElementById('bloch-zoom-cv'); if (!cv) return;
  const box = document.getElementById('bloch-zoom-box');
  const sz = box ? Math.min(box.clientWidth - 40, 400) : 380;
  _ensureQStates(_zoomQ + 1);

  if (window.THREE) {
    if (!_b3Zoom) {
      _b3Zoom = _create3DScene(cv, sz);
      _zoomRotNeedsReset = true;
    } else if (_b3Zoom.size !== sz) {
      _b3Zoom.renderer.setSize(sz, sz); _b3Zoom.size = sz;
    }
    if (_b3Zoom) {
      // Sync view rotation from the sphere if needed
      if (_zoomRotNeedsReset) {
        const srcQ = (_blochPerRow === 1 && _b3QQuats[_zoomQ]) ? _b3QQuats[_zoomQ] : (_b3SharedQuat || _getInitQuat());
        if (srcQ) _b3Zoom.rotGroup.quaternion.copy(srcQ);
        _zoomRotNeedsReset = false;
      }
      const bs = _blochQStates[_zoomQ];
      if (bs) {
        const dir = _stateDir(bs.theta, bs.phi);
        if (dir.lengthSq() > 0.0001) { _b3Zoom.stateArrow.setDirection(dir.clone().normalize()); _b3Zoom.stateArrow.setLength(0.95, 0.18, 0.10); }
        const tip = dir.clone().multiplyScalar(0.95);
        const xzPrj = new THREE.Vector3(tip.x, 0, tip.z);
        _b3Zoom.projLine1.geometry.setFromPoints([tip, xzPrj]); _b3Zoom.projLine1.computeLineDistances();
        _b3Zoom.projLine2.geometry.setFromPoints([xzPrj, new THREE.Vector3(0,0,0)]); _b3Zoom.projLine2.computeLineDistances();
        if (_b3Zoom.projDot) _b3Zoom.projDot.position.copy(xzPrj);
      }
      _b3Zoom.renderer.render(_b3Zoom.scene, _b3Zoom.camera);
    }
  } else {
    if (_zoomRotNeedsReset) {
      _zoomRot = (_blochPerRow === 1 && _blochQRots[_zoomQ]) ? [..._blochQRots[_zoomQ]] : [...BV.rot];
      _zoomRotNeedsReset = false;
    }
    _drawBlochSphere(cv, _blochQStates[_zoomQ], sz, true, _zoomRot, true);
  }
  _updateZoomStats();
}

function _updateZoomStats() {
  const el = document.getElementById('bloch-zoom-stats'); if (!el) return;
  const bs = _blochQStates[_zoomQ]; if (!bs) return;
  const { theta, phi } = bs;
  const vec3 = [Math.sin(theta)*Math.cos(phi), Math.sin(theta)*Math.sin(phi), Math.cos(theta)];
  const tDeg = (theta*180/Math.PI).toFixed(1), pDegRaw = ((phi*180/Math.PI)%360+360)%360;
  const p0 = Math.pow(Math.cos(theta/2), 2), p1 = Math.pow(Math.sin(theta/2), 2);
  el.innerHTML = [
    ['⟨X⟩', vec3[0].toFixed(3)], ['⟨Y⟩', vec3[1].toFixed(3)], ['⟨Z⟩', vec3[2].toFixed(3)],
    ['θ 极角', tDeg+'°'], ['φ 方位角', pDegRaw.toFixed(1)+'°'],
    ['P(|0⟩)', p0.toFixed(4)], ['P(|1⟩)', p1.toFixed(4)]
  ].map(([l,v]) => `<div class="bloch-zoom-stat"><div class="bloch-zoom-stat-lbl">${l}</div><div class="bloch-zoom-stat-val">${v}</div></div>`).join('');
}

function _updateZoomIfOpen(q) {
  const ov = document.getElementById('bloch-zoom-overlay');
  if (!ov || !ov.classList.contains('on')) return;
  if (q === undefined || q === _zoomQ) _drawBlochZoom();
}

function _applyZoomDrag(dx, dy) {
  if (window.THREE && _b3Zoom) {
    const dq = new THREE.Quaternion().multiplyQuaternions(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), dx),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), dy)
    );
    _b3Zoom.rotGroup.quaternion.premultiply(dq);
    _b3Zoom.renderer.render(_b3Zoom.scene, _b3Zoom.camera);
  } else {
    _zoomRot = mat3mul(rotY(dx), mat3mul(rotX(dy), _zoomRot || BV.rot));
    _drawBlochZoom();
  }
}

function _initZoomDrag() {
  const cv = document.getElementById('bloch-zoom-cv');
  if (!cv || _zoomDrag.bound) return;
  _zoomDrag.bound = true; cv.style.cursor = 'grab';
  cv.addEventListener('mousedown', e => {
    _zoomDrag.active = true; _zoomDrag.lx = e.clientX; _zoomDrag.ly = e.clientY;
    cv.style.cursor = 'grabbing'; e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!_zoomDrag.active) return;
    const dx = (e.clientX - _zoomDrag.lx) * 0.009, dy = (e.clientY - _zoomDrag.ly) * 0.009;
    _zoomDrag.lx = e.clientX; _zoomDrag.ly = e.clientY; _applyZoomDrag(dx, dy);
  });
  document.addEventListener('mouseup', () => { if (_zoomDrag.active) { _zoomDrag.active = false; cv.style.cursor = 'grab'; } });
  cv.addEventListener('touchstart', e => {
    e.preventDefault(); const t0 = e.touches[0];
    _zoomDrag.active = true; _zoomDrag.lx = t0.clientX; _zoomDrag.ly = t0.clientY;
  }, { passive: false });
  cv.addEventListener('touchend', () => { _zoomDrag.active = false; });
  cv.addEventListener('touchmove', e => {
    e.preventDefault(); const t0 = e.touches[0];
    const dx = (t0.clientX - _zoomDrag.lx) * 0.009, dy = (t0.clientY - _zoomDrag.ly) * 0.009;
    _zoomDrag.lx = t0.clientX; _zoomDrag.ly = t0.clientY; _applyZoomDrag(dx, dy);
  }, { passive: false });
}

// ══ Master-Detail layout (small mode / pr-2) ══

const _MD_THUMB_SZ = 68;

function _getMDMainSize() {
  const multi = document.getElementById('bloch-multi');
  const availW = (multi && multi.clientWidth > 0) ? multi.clientWidth : 280;
  return Math.min(Math.max(120, availW - 20), 260);
}

function _disposeMDScenes() {
  _disposeScene(_b3MDMain); _b3MDMain = null;
  for (let q = 0; q < _b3MDThumbs.length; q++) { _disposeScene(_b3MDThumbs[q]); _b3MDThumbs[q] = null; }
  _b3MDThumbs.length = 0;
}

function _mdStateLabel(q) {
  const bs = _blochQStates[q]; if (!bs) return '—';
  const tDeg = bs.theta * 180 / Math.PI;
  const pDeg = ((bs.phi * 180 / Math.PI) % 360 + 360) % 360;
  if (tDeg < 10) return '|0⟩';
  if (tDeg > 170) return '|1⟩';
  if (tDeg > 80 && tDeg < 100) {
    if (pDeg < 20 || pDeg > 340) return '|+⟩';
    if (pDeg > 160 && pDeg < 200) return '|−⟩';
    if (pDeg > 68 && pDeg < 112) return '|i⟩';
    if (pDeg > 248 && pDeg < 292) return '|−i⟩';
    return 'eq';
  }
  const p0 = Math.pow(Math.cos(bs.theta / 2), 2);
  return `${(p0 * 100).toFixed(0)}%`;
}

function _updateMDActiveLabel() {
  const el = document.getElementById('bloch-md-active-lbl');
  if (el) el.textContent = 'q' + S.selQ;
}

function _updateMDThumbHighlight() {
  const nShow = Math.min(S.qubits, 5);
  document.querySelectorAll('.bloch-md-thumb').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.q) === S.selQ);
  });
  for (let q = 0; q < nShow; q++) {
    const lbl = document.getElementById('bloch-md-slbl-' + q);
    if (lbl) lbl.textContent = _mdStateLabel(q);
  }
}

function _renderMDMain() {
  if (!_b3MDMain) return;
  const bs = _blochQStates[S.selQ]; if (!bs) return;
  const dir = _stateDir(bs.theta, bs.phi);
  if (dir.lengthSq() > 0.0001) { _b3MDMain.stateArrow.setDirection(dir.clone().normalize()); _b3MDMain.stateArrow.setLength(0.95, 0.18, 0.10); }
  const tip = dir.clone().multiplyScalar(0.95);
  const xzPrj = new THREE.Vector3(tip.x, 0, tip.z);
  _b3MDMain.projLine1.geometry.setFromPoints([tip, xzPrj]); _b3MDMain.projLine1.computeLineDistances();
  _b3MDMain.projLine2.geometry.setFromPoints([xzPrj, new THREE.Vector3(0,0,0)]); _b3MDMain.projLine2.computeLineDistances();
  if (_b3MDMain.projDot) _b3MDMain.projDot.position.copy(xzPrj);
  if (_mdMainQuat) _b3MDMain.rotGroup.quaternion.copy(_mdMainQuat);
  _b3MDMain.renderer.render(_b3MDMain.scene, _b3MDMain.camera);
}

function _renderMDThumb(q) {
  if (!_b3MDThumbs[q]) return;
  const bs = _blochQStates[q]; if (!bs) return;
  const entry = _b3MDThumbs[q];
  const dir = _stateDir(bs.theta, bs.phi);
  if (dir.lengthSq() > 0.0001) { entry.stateArrow.setDirection(dir.clone().normalize()); entry.stateArrow.setLength(0.95, 0.18, 0.10); }
  const tip = dir.clone().multiplyScalar(0.95);
  const xzPrj = new THREE.Vector3(tip.x, 0, tip.z);
  entry.projLine1.geometry.setFromPoints([tip, xzPrj]); entry.projLine1.computeLineDistances();
  entry.projLine2.geometry.setFromPoints([xzPrj, new THREE.Vector3(0,0,0)]); entry.projLine2.computeLineDistances();
  if (entry.projDot) entry.projDot.position.copy(xzPrj);
  entry.renderer.render(entry.scene, entry.camera);
}

function _renderMDAll() {
  _renderMDMain();
  const nShow = Math.min(S.qubits, 5);
  for (let q = 0; q < nShow; q++) _renderMDThumb(q);
  _updateMDThumbHighlight();
}

function _applyMDMainDrag(dx, dy) {
  if (!window.THREE || !_mdMainQuat) return;
  const dq = new THREE.Quaternion().multiplyQuaternions(
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), dx),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), dy)
  );
  _mdMainQuat.premultiply(dq);
  if (_b3MDMain) { _b3MDMain.rotGroup.quaternion.copy(_mdMainQuat); _renderMDMain(); }
}

function _initMDMainDrag() {
  const cv = document.getElementById('bloch-main-cv'); if (!cv) return;
  cv.style.cursor = 'grab';
  cv.addEventListener('mousedown', e => {
    _mdDrag.active = true; _mdDrag.lx = e.clientX; _mdDrag.ly = e.clientY;
    cv.style.cursor = 'grabbing'; e.preventDefault(); e.stopPropagation();
  });
  cv.addEventListener('touchstart', e => {
    e.preventDefault(); const t0 = e.touches[0];
    _mdDrag.active = true; _mdDrag.lx = t0.clientX; _mdDrag.ly = t0.clientY;
  }, { passive: false });
  cv.addEventListener('touchend', () => { _mdDrag.active = false; cv.style.cursor = 'grab'; });
  cv.addEventListener('touchmove', e => {
    e.preventDefault(); const t0 = e.touches[0];
    const dx = (t0.clientX - _mdDrag.lx) * 0.009, dy = (t0.clientY - _mdDrag.ly) * 0.009;
    _mdDrag.lx = t0.clientX; _mdDrag.ly = t0.clientY; _applyMDMainDrag(dx, dy);
  }, { passive: false });
  cv.addEventListener('dblclick', e => { e.stopPropagation(); openBlochZoom(S.selQ); });
  if (!_mdDrag.bound) {
    _mdDrag.bound = true;
    document.addEventListener('mousemove', e => {
      if (!_mdDrag.active) return;
      const dx = (e.clientX - _mdDrag.lx) * 0.009, dy = (e.clientY - _mdDrag.ly) * 0.009;
      _mdDrag.lx = e.clientX; _mdDrag.ly = e.clientY; _applyMDMainDrag(dx, dy);
    });
    document.addEventListener('mouseup', () => {
      if (_mdDrag.active) { _mdDrag.active = false; const c = document.getElementById('bloch-main-cv'); if (c) c.style.cursor = 'grab'; }
    });
  }
}

function _mdSelectQ(q) {
  if (q === S.selQ) return;
  const cv = document.getElementById('bloch-main-cv');
  if (cv) cv.classList.add('bloch-main-fading');
  setTimeout(() => {
    S.selQ = q;
    _updateMDActiveLabel();
    _updateMDThumbHighlight();
    _updateBlochStats(q);
    if (typeof renderQSelBar === 'function') renderQSelBar();
    _renderMDMain();
    if (cv) { cv.classList.remove('bloch-main-fading'); }
  }, 90);
}
window._mdSelectQ = _mdSelectQ;

function _initMDLayout() {
  const container = document.getElementById('bloch-multi'); if (!container) return;
  const nShow = Math.min(S.qubits, 5);
  _ensureQStates(nShow);

  // Early return if already built for current qubit count
  if (_b3MDMain && document.getElementById('bloch-main-cv') && _b3MDThumbs.length >= (nShow > 1 ? nShow : 0)) {
    _updateMDActiveLabel(); _updateMDThumbHighlight(); return;
  }

  _disposeMDScenes();
  container.innerHTML = '';

  if (!_mdMainQuat && window.THREE) _mdMainQuat = (_b3SharedQuat || _getInitQuat())?.clone();
  if (!_b3SharedQuat && window.THREE) _b3SharedQuat = _getInitQuat();

  const mainSz = _getMDMainSize();

  // ── Header ──
  const hd = document.createElement('div'); hd.className = 'bloch-md-hd';
  const activeLang = _blochL('当前观察', 'Active Qubit');
  hd.innerHTML = `<span class="bloch-md-active-tag">${activeLang} <strong id="bloch-md-active-lbl">q${S.selQ}</strong></span>`;
  const zoomBtn = document.createElement('button');
  zoomBtn.className = 'bloch-md-zoom-btn'; zoomBtn.title = _blochL('放大', 'Zoom'); zoomBtn.innerHTML = '⤢';
  zoomBtn.addEventListener('click', () => openBlochZoom(S.selQ));
  hd.appendChild(zoomBtn);
  container.appendChild(hd);

  // ── Main sphere area ──
  const mainArea = document.createElement('div'); mainArea.className = 'bloch-md-main-area';
  const mainCv = document.createElement('canvas'); mainCv.className = 'bloch-main-cv'; mainCv.id = 'bloch-main-cv';
  mainArea.appendChild(mainCv);
  container.appendChild(mainArea);

  // ── Thumbnail strip (only if >1 qubit) ──
  if (nShow > 1) {
    const thumbbar = document.createElement('div'); thumbbar.className = 'bloch-md-thumbbar'; thumbbar.id = 'bloch-md-thumbbar';
    for (let q = 0; q < nShow; q++) {
      const thumb = document.createElement('div');
      thumb.className = 'bloch-md-thumb' + (q === S.selQ ? ' active' : '');
      thumb.dataset.q = q;
      thumb.addEventListener('click', () => _mdSelectQ(q));
      const cv = document.createElement('canvas'); cv.className = 'bloch-thumb-cv'; cv.id = 'bloch-thumb-cv-' + q;
      const info = document.createElement('div'); info.className = 'bloch-md-thumb-info';
      info.innerHTML = `<span class="bloch-md-thumb-qlbl">q${q}</span><span class="bloch-md-thumb-slbl" id="bloch-md-slbl-${q}">${_mdStateLabel(q)}</span>`;
      thumb.appendChild(cv); thumb.appendChild(info);
      thumbbar.appendChild(thumb);
    }
    container.appendChild(thumbbar);
  }

  // ── Three.js scenes ──
  if (window.THREE) {
    _b3MDMain = _create3DScene(mainCv, mainSz);
    if (_b3MDMain && _mdMainQuat) _b3MDMain.rotGroup.quaternion.copy(_mdMainQuat);
    for (let q = 0; q < nShow; q++) {
      const cv = document.getElementById('bloch-thumb-cv-' + q); if (!cv) continue;
      const entry = _create3DScene(cv, _MD_THUMB_SZ);
      if (entry) { if (_b3SharedQuat) entry.rotGroup.quaternion.copy(_b3SharedQuat); _b3MDThumbs[q] = entry; }
    }
  } else {
    setupHiDPICanvas(mainCv, mainSz, mainSz);
    for (let q = 0; q < nShow; q++) { const cv = document.getElementById('bloch-thumb-cv-' + q); if (cv) setupHiDPICanvas(cv, _MD_THUMB_SZ, _MD_THUMB_SZ); }
  }

  _initMDMainDrag();
  _initAllBlochDrag();  // bind global keydown/ESC handlers
  _renderMDAll();
}

// ══ Gallery: all-spheres modal with independent per-sphere rotation ══

function _gallerySlotSize(n) { return n <= 2 ? 220 : (n <= 3 ? 190 : 165); }

function openBlochGallery() {
  const ov = document.getElementById('bloch-gallery-overlay'); if (!ov) return;
  ov.classList.add('on');
  _loadVid(ov.querySelector('video'));
  _initGallery();
}
window.openBlochGallery = openBlochGallery;

function closeBlochGallery() {
  const ov = document.getElementById('bloch-gallery-overlay'); if (ov) ov.classList.remove('on');
}
window.closeBlochGallery = closeBlochGallery;

function _drawGalleryQ(q) {
  const bs = _blochQStates[q]; if (!bs) return;
  if (window.THREE && _b3Gallery[q]) {
    const entry = _b3Gallery[q];
    const dir = _stateDir(bs.theta, bs.phi);
    if (dir.lengthSq() > 0.0001) { entry.stateArrow.setDirection(dir.clone().normalize()); entry.stateArrow.setLength(0.95, 0.18, 0.10); }
    const tip = dir.clone().multiplyScalar(0.95);
    const xzPrj = new THREE.Vector3(tip.x, 0, tip.z);
    entry.projLine1.geometry.setFromPoints([tip, xzPrj]); entry.projLine1.computeLineDistances();
    entry.projLine2.geometry.setFromPoints([xzPrj, new THREE.Vector3(0,0,0)]); entry.projLine2.computeLineDistances();
    if (entry.projDot) entry.projDot.position.copy(xzPrj);
    entry.renderer.render(entry.scene, entry.camera);
  } else {
    const cv = document.getElementById('bloch-gcv-' + q); if (!cv) return;
    const n = Math.min(S.qubits, 5);
    _ensureQRots(q + 1);
    _drawBlochSphere(cv, bs, _gallerySlotSize(n), q === S.selQ, _blochQRots[q], true);
  }
}

function _drawGalleryAll() {
  const n = Math.min(S.qubits, 5);
  for (let q = 0; q < n; q++) _drawGalleryQ(q);
}

function _applyGalleryDrag(q, dx, dy) {
  if (window.THREE) {
    if (!_b3GalleryQuats[q]) _b3GalleryQuats[q] = _getInitQuat();
    const dq = new THREE.Quaternion().multiplyQuaternions(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), dx),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), dy)
    );
    _b3GalleryQuats[q].premultiply(dq);
    if (_b3Gallery[q]) { _b3Gallery[q].rotGroup.quaternion.copy(_b3GalleryQuats[q]); _drawGalleryQ(q); }
  } else {
    _ensureQRots(q + 1);
    _blochQRots[q] = mat3mul(rotY(dx), mat3mul(rotX(dy), _blochQRots[q]));
    _drawGalleryQ(q);
  }
}

function _initGallery() {
  const grid = document.getElementById('bloch-gallery-grid'); if (!grid) return;
  const nShow = Math.min(S.qubits, 5);
  _ensureQStates(nShow);
  if (_b3Gallery.length === nShow && grid.children.length === nShow) { _drawGalleryAll(); return; }

  // Dispose old scenes
  for (let q = 0; q < _b3Gallery.length; q++) { _disposeScene(_b3Gallery[q]); _b3Gallery[q] = null; }
  _b3Gallery.length = 0; _b3GalleryQuats.length = 0;
  grid.innerHTML = '';

  const sz = _gallerySlotSize(nShow);
  for (let q = 0; q < nShow; q++) {
    const slot = document.createElement('div'); slot.className = 'bloch-gallery-slot';
    const lbl = document.createElement('div'); lbl.className = 'bloch-gallery-qlbl'; lbl.textContent = 'q' + q;
    const cv = document.createElement('canvas'); cv.className = 'bloch-gallery-cv'; cv.id = 'bloch-gcv-' + q;
    cv.style.cursor = 'grab';
    slot.appendChild(lbl); slot.appendChild(cv); grid.appendChild(slot);

    // Init quaternion from current main view
    const srcQ = (_blochPerRow === 1 && _b3QQuats[q]) ? _b3QQuats[q] : (_b3SharedQuat || _getInitQuat());
    _b3GalleryQuats[q] = srcQ ? srcQ.clone() : _getInitQuat();

    if (window.THREE) {
      const entry = _create3DScene(cv, sz);
      if (entry) { entry.rotGroup.quaternion.copy(_b3GalleryQuats[q]); _b3Gallery[q] = entry; }
    } else { setupHiDPICanvas(cv, sz, sz); }

    // Per-sphere mousedown — sets _galleryActiveDrag
    cv.addEventListener('mousedown', e => {
      _galleryActiveDrag = q; _galleryDragLX = e.clientX; _galleryDragLY = e.clientY;
      cv.style.cursor = 'grabbing'; e.preventDefault();
    });
    cv.addEventListener('touchstart', e => {
      e.preventDefault(); const t0 = e.touches[0];
      _galleryActiveDrag = q; _galleryDragLX = t0.clientX; _galleryDragLY = t0.clientY;
    }, { passive: false });
    cv.addEventListener('touchend', () => { _galleryActiveDrag = null; cv.style.cursor = 'grab'; });
    cv.addEventListener('touchmove', e => {
      e.preventDefault(); const t0 = e.touches[0];
      const dx = (t0.clientX - _galleryDragLX) * 0.009, dy = (t0.clientY - _galleryDragLY) * 0.009;
      _galleryDragLX = t0.clientX; _galleryDragLY = t0.clientY;
      if (_galleryActiveDrag !== null) _applyGalleryDrag(_galleryActiveDrag, dx, dy);
    }, { passive: false });
  }

  if (!_galleryDragBound) {
    _galleryDragBound = true;
    document.addEventListener('mousemove', e => {
      if (_galleryActiveDrag === null) return;
      const dx = (e.clientX - _galleryDragLX) * 0.009, dy = (e.clientY - _galleryDragLY) * 0.009;
      _galleryDragLX = e.clientX; _galleryDragLY = e.clientY;
      _applyGalleryDrag(_galleryActiveDrag, dx, dy);
    });
    document.addEventListener('mouseup', () => {
      if (_galleryActiveDrag !== null) {
        const cv = document.getElementById('bloch-gcv-' + _galleryActiveDrag);
        if (cv) cv.style.cursor = 'grab';
        _galleryActiveDrag = null;
      }
    });
  }
  _drawGalleryAll();
}

// ═══════════════════════════════════════════════════════════════
// Canvas 2D fallback (used when THREE is not available)
// ═══════════════════════════════════════════════════════════════
function _drawBlochSphere(cv, bsState, size, focused, rot, showHint) {
  const ctx = setupHiDPICanvas(cv, size, size); if (!ctx) return;
  const W = size, H = size, cx = W/2, cy = H/2, R = Math.min(W,H)*0.36;
  ctx.clearRect(0, 0, W, H);
  const { theta, phi } = bsState;
  const vec3 = [Math.sin(theta)*Math.cos(phi), Math.sin(theta)*Math.sin(phi), Math.cos(theta)];
  const _p = _getBlochPalette();
  const { axisRGB:_axisRGB, labelRGB:_labelRGB, vectorCol:_vectorCol, gridEq:_gridEq,
          gridLine:_gridLine, outline:_outline, sphereRGB:_sphereRGB,
          projRGB:_projRGB, tipColor:_tipColor, thetaRGB:_thetaRGB, phiRGB:_phiRGB } = _p;
  const r = rot || BV.rot;
  for (let lat = -60; lat <= 60; lat += 30) {
    const cl=Math.cos(lat*Math.PI/180), sl=Math.sin(lat*Math.PI/180), N=64;
    ctx.beginPath();
    for (let i=0;i<=N;i++){const a=i/N*Math.PI*2;const[sx,sy]=proj3([cl*Math.cos(a),cl*Math.sin(a),sl],cx,cy,R,r);i===0?ctx.moveTo(sx,sy):ctx.lineTo(sx,sy);}
    ctx.strokeStyle=lat===0?_gridEq:_gridLine;ctx.lineWidth=lat===0?1.4:0.9;ctx.setLineDash(lat===0?[]:[2,3]);ctx.stroke();ctx.setLineDash([]);
  }
  for (let lng=0;lng<180;lng+=30){
    const N=64,ar=lng*Math.PI/180;ctx.beginPath();
    for(let i=0;i<=N;i++){const a=i/N*Math.PI*2;const[sx,sy]=proj3([Math.sin(a)*Math.cos(ar),Math.sin(a)*Math.sin(ar),Math.cos(a)],cx,cy,R,r);i===0?ctx.moveTo(sx,sy):ctx.lineTo(sx,sy);}
    ctx.strokeStyle=_gridLine;ctx.lineWidth=0.9;ctx.setLineDash([2,3]);ctx.stroke();ctx.setLineDash([]);
  }
  ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.strokeStyle=_outline;ctx.lineWidth=2.0;ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.fillStyle=`rgba(${_sphereRGB},0.30)`;ctx.fill();
  const axesDef=[{v:[0,0,1],neg:[0,0,-1],lbl:'Z'},{v:[1,0,0],neg:[-1,0,0],lbl:'X'},{v:[0,1,0],neg:[0,-1,0],lbl:'Y'}];
  axesDef.forEach(({v,neg,lbl})=>{
    const sc=1.32,[ax,ay,az]=proj3([v[0]*sc,v[1]*sc,v[2]*sc],cx,cy,R,r),[ox,oy]=proj3([neg[0]*sc,neg[1]*sc,neg[2]*sc],cx,cy,R,r);
    const da=Math.min(1,0.45+0.55*(az+1)/2);
    ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(ax,ay);ctx.strokeStyle=`rgba(${_axisRGB},${da})`;ctx.lineWidth=2.0;ctx.stroke();
    const ang=Math.atan2(ay-oy,ax-ox);ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(ax-10*Math.cos(ang-0.35),ay-10*Math.sin(ang-0.35));ctx.lineTo(ax-10*Math.cos(ang+0.35),ay-10*Math.sin(ang+0.35));ctx.closePath();ctx.fillStyle=`rgba(${_axisRGB},${da})`;ctx.fill();
    ctx.font="bold 13px 'Crimson Pro',Georgia,serif";ctx.fillStyle=`rgba(${_labelRGB},${Math.min(1,da+0.2)})`;ctx.textAlign='center';
    const lx=ax+(v[0]>0?11:v[0]<0?-11:0),ly=ay+(v[1]<0||v[2]<0?14:-3);ctx.fillText(lbl,Math.max(9,Math.min(W-9,lx)),Math.max(13,Math.min(H-4,ly)));
  });
  const poles=[[0,0,1,'|0⟩'],[0,0,-1,'|1⟩'],[1,0,0,'|+⟩'],[-1,0,0,'|−⟩'],[0,1,0,'|i⟩'],[0,-1,0,'|−i⟩']];
  poles.forEach(([x,y,z,lbl])=>{
    const[px,py,pz]=proj3([x*1.08,y*1.08,z*1.08],cx,cy,R,r),alpha=Math.min(1,0.3+0.7*(pz+1)/2);
    if(alpha<0.28)return;ctx.font="italic 10px 'Crimson Pro',Georgia,serif";ctx.fillStyle=`rgba(${_labelRGB},${alpha})`;ctx.textAlign='center';
    const prx=px+(x>0?10:x<0?-10:0),pry=py+(y<0||z<0?13:-3);ctx.fillText(lbl,Math.max(10,Math.min(W-10,prx)),Math.max(12,Math.min(H-4,pry)));
  });
  const arcN=28,arcSc=0.42;
  if(theta>0.05){ctx.beginPath();for(let i=0;i<=arcN;i++){const t=(i/arcN)*theta;const[ax2,ay2]=proj3([Math.sin(t)*Math.cos(phi)*arcSc,Math.sin(t)*Math.sin(phi)*arcSc,Math.cos(t)*arcSc],cx,cy,R,r);i===0?ctx.moveTo(ax2,ay2):ctx.lineTo(ax2,ay2);}ctx.strokeStyle=`rgba(${_thetaRGB},0.75)`;ctx.lineWidth=1.4;ctx.setLineDash([2,2]);ctx.stroke();ctx.setLineDash([]);const tm=theta/2;const[tlx,tly]=proj3([Math.sin(tm)*Math.cos(phi)*arcSc*1.45,Math.sin(tm)*Math.sin(phi)*arcSc*1.45,Math.cos(tm)*arcSc*1.45],cx,cy,R,r);ctx.font="bold 10px 'JetBrains Mono',monospace";ctx.fillStyle=`rgba(${_thetaRGB},0.95)`;ctx.textAlign='center';ctx.fillText('θ',tlx,tly+3);}
  if(Math.abs(Math.sin(theta))>0.12&&Math.abs(phi)>0.08){const phiR=0.3;ctx.beginPath();for(let i=0;i<=arcN;i++){const t=(i/arcN)*phi;const[ax2,ay2]=proj3([Math.cos(t)*phiR,Math.sin(t)*phiR,0],cx,cy,R,r);i===0?ctx.moveTo(ax2,ay2):ctx.lineTo(ax2,ay2);}ctx.strokeStyle=`rgba(${_phiRGB},0.65)`;ctx.lineWidth=1.4;ctx.setLineDash([2,2]);ctx.stroke();ctx.setLineDash([]);const pm=phi/2;const[plx,ply]=proj3([Math.cos(pm)*phiR*1.5,Math.sin(pm)*phiR*1.5,0.04],cx,cy,R,r);ctx.font="bold 10px 'JetBrains Mono',monospace";ctx.fillStyle=`rgba(${_phiRGB},0.9)`;ctx.textAlign='center';ctx.fillText('φ',plx,ply+3);}
  const[vtx,vty]=proj3(vec3,cx,cy,R,r),[vpx,vpy]=proj3([vec3[0],vec3[1],0],cx,cy,R,r),[vox,voy]=proj3([0,0,0],cx,cy,R,r);
  ctx.beginPath();ctx.moveTo(vtx,vty);ctx.lineTo(vpx,vpy);ctx.strokeStyle=`rgba(${_projRGB},0.65)`;ctx.lineWidth=1;ctx.setLineDash([2,2]);ctx.stroke();
  ctx.beginPath();ctx.moveTo(vpx,vpy);ctx.lineTo(vox,voy);ctx.strokeStyle=`rgba(${_projRGB},0.4)`;ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();ctx.moveTo(vox,voy);ctx.lineTo(vtx,vty);ctx.strokeStyle=_vectorCol;ctx.lineWidth=3.0;ctx.stroke();
  const aang=Math.atan2(vty-voy,vtx-vox);ctx.beginPath();ctx.moveTo(vtx,vty);ctx.lineTo(vtx-10*Math.cos(aang-0.35),vty-10*Math.sin(aang-0.35));ctx.lineTo(vtx-10*Math.cos(aang+0.35),vty-10*Math.sin(aang+0.35));ctx.closePath();ctx.fillStyle=_vectorCol;ctx.fill();
  ctx.beginPath();ctx.arc(vpx,vpy,3.5,0,Math.PI*2);ctx.fillStyle=`rgba(${_projRGB},0.85)`;ctx.fill();
  ctx.beginPath();ctx.arc(vox,voy,3.0,0,Math.PI*2);ctx.fillStyle=_tipColor;ctx.fill();
  ctx.beginPath();ctx.arc(vtx,vty,5.5,0,Math.PI*2);ctx.fillStyle=_vectorCol;ctx.fill();
  if(showHint){ctx.font="11px 'JetBrains Mono',monospace";ctx.fillStyle=_tipColor;ctx.textAlign='left';ctx.fillText(_blochL('拖动旋转','Drag to rotate'),4,H-4);}
}

// ═══════════════════════════════════════════════════════════════
// Probability chart, state vector, qubit selector
// ═══════════════════════════════════════════════════════════════

// 默认关注前 min(n,4) 个比特
function _probDefaultKeep(n) {
  return Array.from({ length: Math.min(n, 4) }, (_, i) => i);
}

// 计算边缘概率：对 keep 以外的比特求和
function _computeMarginalProbs(keep) {
  const total = S.qubits;
  const mDim = 1 << keep.length;
  const marginal = new Array(mDim).fill(0);
  const fullDim = 1 << total;
  for (let fi = 0; fi < fullDim; fi++) {
    // 从全局索引 fi 中提取 keep 比特组成边缘索引 mi
    let mi = 0;
    for (let k = 0; k < keep.length; k++) {
      const bit = (total - 1 - keep[k]); // QSim 用高位在左的比特序
      if (fi & (1 << bit)) mi |= (1 << (keep.length - 1 - k));
    }
    marginal[mi] += (S.probs[fi] || 0);
  }
  return marginal;
}

// 比特选择器 bar（仿 renderDMQSelBar）
function renderProbQSelBar() {
  const bar = document.getElementById('prob-qsel-bar'); if (!bar) return;
  bar.innerHTML = '';
  const keep = window._probKeepQubits || _probDefaultKeep(S.qubits);
  for (let q = 0; q < S.qubits; q++) {
    const btn = document.createElement('div');
    const on = keep.includes(q);
    btn.className = 'dm-qsb' + (on ? ' on' : '');
    btn.textContent = `q${q}`;
    btn.onclick = () => {
      let k = [...(window._probKeepQubits || _probDefaultKeep(S.qubits))];
      if (k.includes(q)) { if (k.length > 1) k = k.filter(x => x !== q); }
      else { if (k.length < 4) { k.push(q); k.sort((a, b) => a - b); } }
      window._probKeepQubits = k;
      renderProbQSelBar(); renderProbChart(); renderStateVec();
    };
    bar.appendChild(btn);
  }
}

function renderProbChart() {
  const cv = document.getElementById('prob-cv'); if (!cv) return;
  const sec = document.getElementById('prob-sec'); if (!sec) return;
  const qselH = (document.getElementById('prob-qsel-wrap') || {}).offsetHeight || 0;
  const logW = sec.clientWidth, logH = Math.max(sec.clientHeight - 28 - qselH, 80);
  const ctx = setupHiDPICanvas(cv, logW, logH); if (!ctx) return;
  const W = logW, H = logH;
  ctx.clearRect(0, 0, W, H);

  const keep = window._probKeepQubits || _probDefaultKeep(S.qubits);
  const ps = _computeMarginalProbs(keep);
  const n = ps.length; if (!n) return;
  const nBits = keep.length;
  const rotateLabels = n > 8;
  const labelH = rotateLabels ? 44 : 28;
  const maxP = Math.max(...ps, 0.01), bw = (W-24)/n - 3, ch = H - labelH;
  const _th = document.documentElement.getAttribute('data-theme') || 'classic';
  const _probTheme = {
    classic:{ hi:'#1B3A6B', lo:'#B5D4F4', stroke:'#1B3A6B', label:'#475569', value:'#0F172A' },
    dark:   { hi:'#4A86E8', lo:'#314A6B', stroke:'#7FB3FF', label:'#94A3B8', value:'#E2E8F0' },
    aurora: { hi:'#9B7FFF', lo:'#4A3485', stroke:'#C2A8FF', label:'#B8AFFF', value:'#F3EEFF' },
    amber:  { hi:'#F7A84D', lo:'#3B2B1D', stroke:'#FFCC8A', label:'#B49B7B', value:'#F4E6D2' }
  }[_th] || { hi:'#1B3A6B', lo:'#B5D4F4', stroke:'#1B3A6B', label:'#475569', value:'#0F172A' };

  // 更新 state-lbl 为边缘最大概率态
  const maxIdx = ps.indexOf(Math.max(...ps));
  const stLbl = document.getElementById('state-lbl');
  if (stLbl) stLbl.textContent = `|${maxIdx.toString(2).padStart(nBits, '0')}⟩`;

  ps.forEach((p, i) => {
    const x = 10 + i*((W-24)/n), bh = (p/maxP)*(ch-12), y = ch - bh + 6;
    ctx.fillStyle = p > 0.35 ? _probTheme.hi : _probTheme.lo; ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = _probTheme.stroke; ctx.lineWidth = 0.5; ctx.strokeRect(x, y, bw, bh);
    ctx.fillStyle = _probTheme.label; ctx.font = "11px 'JetBrains Mono',monospace";
    const lbl = n <= 16 ? `|${i.toString(2).padStart(nBits, '0')}⟩` : `${i}`;
    if (rotateLabels) {
      ctx.save();
      ctx.translate(x + bw/2, ch + 6);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'right';
      ctx.fillText(lbl, 0, 0);
      ctx.restore();
    } else {
      ctx.textAlign = 'center';
      ctx.fillText(lbl, x + bw/2, ch + 20);
    }
    if (p > 0.02) { ctx.fillStyle = _probTheme.value; ctx.font = "bold 11px 'JetBrains Mono',monospace"; ctx.fillText((p*100).toFixed(0)+'%', x+bw/2, y-4); }
  });
}

function renderQSelBar() {
  initBlochSpheres();
  const bar = document.getElementById('qsel-bar'); if (!bar) return;
  bar.innerHTML = '';
  for (let q = 0; q < S.qubits; q++) {
    const b = document.createElement('div'); b.className = 'qsb' + (q === S.selQ ? ' on' : '');
    b.textContent = `q${q}`;
    b.onclick = () => { S.selQ = q; initBlochSpheres(); _updateBlochStats(q); drawBloch(); renderQSelBar(); };
    bar.appendChild(b);
  }
}

function _updateSimSrcLabel() {
  const el = document.getElementById('sim-src-lbl'); if (!el) return;
  if (S.simSource === 'backend')      { el.textContent = '· Qiskit ✓'; el.style.color = 'var(--green)'; }
  else if (S.simSource === 'local')   { el.textContent = '· 本地精确'; el.style.color = 'var(--t5)'; }
  else if (S.simSource === 'preview') { el.textContent = '· 本地预览'; el.style.color = 'var(--t3)'; }
  else                                { el.textContent = ''; }
}

function renderStateVec() {
  const el = document.getElementById('sv-rows'); if (!el) return;
  const keep = window._probKeepQubits || _probDefaultKeep(S.qubits);
  const nBits = keep.length;
  const dim = 1 << nBits;
  const marginal = _computeMarginalProbs(keep);
  // 只有当选中了全部比特（且 ≤ 全局比特数）时才显示振幅
  const isFullSel = keep.length === S.qubits;
  const sim = isFullSel ? S.lastSim : null;
  let html = '';
  for (let i = 0; i < dim; i++) {
    const basis = `|${i.toString(2).padStart(nBits, '0')}⟩`;
    let ampStr;
    if (sim) {
      const r = sim.re[i], im = sim.im[i], mag = Math.sqrt(r*r+im*im);
      if (mag < 0.001) ampStr = '0';
      else if (Math.abs(im) < 0.001) ampStr = r.toFixed(3);
      else if (Math.abs(r) < 0.001) ampStr = `${im.toFixed(3)}i`;
      else ampStr = `${r.toFixed(3)}${im >= 0 ? '+' : ''}${im.toFixed(3)}i`;
    } else {
      ampStr = marginal[i] > 0 ? Math.sqrt(marginal[i]).toFixed(3) : '0.000';
    }
    const prob = (marginal[i] * 100).toFixed(1);
    html += `<div class="svr"><span class="svb">${basis}</span><span class="sva">${ampStr}</span><span class="svp">${prob}%</span></div>`;
  }
  el.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
// updateBlochFromCirc (unchanged logic)
// ═══════════════════════════════════════════════════════════════
function updateBlochFromCirc(simulate = false) {
  if (typeof _stepMode !== 'undefined' && _stepMode) { exitStepMode(); return; }
  let gc = 0;
  S.circ.forEach(r => r.forEach(g => { if (g && g.role !== 'tgt') gc++; }));
  const nShow = Math.min(S.qubits, 5);
  _ensureQStates(nShow);

  if (!simulate || gc === 0 || S.qubits > 8) {
    for (let q = 0; q < nShow; q++) _animBlochQ(q, 0, 0);
    S.probs = Array(Math.pow(2, S.qubits)).fill(0); S.probs[0] = 1;
    S.lastSim = null; S.simSource = null;
    if (window._probKeepQubits) {
      const valid = window._probKeepQubits.filter(q => q < S.qubits);
      window._probKeepQubits = valid.length > 0 ? valid : null;
    }
    _updateSimSrcLabel(); renderProbQSelBar(); renderProbChart(); renderStateVec(); return;
  }

  const sim = simCircuit();
  if (!sim) { for (let q = 0; q < nShow; q++) _animBlochQ(q, 0, 0); S.lastSim = null; S.simSource = null; _updateSimSrcLabel(); renderProbQSelBar(); renderProbChart(); renderStateVec(); return; }
  S.lastSim = sim;

  for (let q = 0; q < nShow; q++) {
    const bv = sim.blochVec(q), z = Math.max(-1, Math.min(1, bv.z));
    _animBlochQ(q, Math.acos(z), Math.atan2(bv.y, bv.x));
  }

  S.probs = sim.probs();
  S.simSource = 'preview'; _updateSimSrcLabel();
  if (window._probKeepQubits) {
    const valid = window._probKeepQubits.filter(q => q < S.qubits);
    window._probKeepQubits = valid.length > 0 ? valid : null;
  }
  renderProbQSelBar(); renderProbChart(); renderStateVec();
  if (window._dmKeepQubits) {
    const valid = window._dmKeepQubits.filter(q => q < S.qubits);
    window._dmKeepQubits = valid.length > 0 ? valid : null;
  }
  const dmPane = document.getElementById('sp-dm');
  if (dmPane && dmPane.classList.contains('on') && typeof renderDensityMatrix === 'function') renderDensityMatrix();
}

// ═══════════════════════════════════════════════════════════════
// Mascot (unchanged)
// ═══════════════════════════════════════════════════════════════
let eAngle = 0;
function animateMascot() {
  const el = document.getElementById('mascot-electron');
  if (el) {
    eAngle += 0.035;
    const a=32, b=10, tilt=-18*Math.PI/180;
    const lx=a*Math.cos(eAngle), ly=b*Math.sin(eAngle);
    el.setAttribute('cx', (40+lx*Math.cos(tilt)-ly*Math.sin(tilt)).toFixed(2));
    el.setAttribute('cy', (72+lx*Math.sin(tilt)+ly*Math.cos(tilt)).toFixed(2));
  }
  requestAnimationFrame(animateMascot);
}

let _aiLastOnline = true;
function setMascotThinking(on, wasSuccessful) {
  if (typeof wasSuccessful === 'boolean') _aiLastOnline = wasSuccessful;
  const ms = document.getElementById('mascot-status'), mouth = document.getElementById('mascot-mouth');
  if (ms) {
    if (on) {
      ms.textContent = _blochL('思考中...', 'Thinking...');
      ms.className = 'mascot-status thinking';
    } else if (_aiLastOnline) {
      ms.textContent = _blochL('在线', 'Online');
      ms.className = 'mascot-status';
    } else {
      ms.textContent = _blochL('离线', 'Offline');
      ms.className = 'mascot-status offline';
    }
  }
  if (mouth) mouth.setAttribute('d', on ? 'M 31 50 Q 40 46 49 50' : 'M 31 47 Q 40 54 49 47');
}
function refreshMascotStatus() { setMascotThinking(false); }
