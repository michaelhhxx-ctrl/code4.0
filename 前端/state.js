// ── GLOBAL STATE ──
const S = {
  qubits: 3, steps: 8,
  circ: [],       // [q][s] = {g, p, ctrl?, tgt?, role?} | null
  hist: [],       // undo stack  [{qubits, circ}]
  redoHist: [],   // redo stack  [{qubits, circ}]
  selQ: 0,        // selected qubit for Bloch
  bloch: { theta:0, phi:0, tgt_t:0, tgt_p:0 },
  probs: [1,0,0,0,0,0,0,0],
  dragGate: null,
  lastSim: null,  // 最近一次 simCircuit() 的结果，供 renderStateVec 使用
  simSource: null, // null | 'preview' | 'backend' | 'local'
  vqe: { running:false, data:[], mol:'H2', timer:null },
  codeTab: 'qiskit',
  validation: null,
  currentPreset: null,   // 最近一次加载的预设名称（'bell'|'ghz'|'qft'|'grover'|null）
};
const EXACT = { H2:-1.1372, HeH:-2.8628, LiH:-7.8824, BeH2:-15.5937, H2O:-74.9654 };

function initCirc() { S.circ = Array.from({length:S.qubits}, ()=>Array(S.steps).fill(null)); }
initCirc();

const QAOA_S={nodes:[],edges:[],mode:'node',running:false,data:[],probs:[],bestBits:null,bestCut:0,maxCut:0,selNode:null,dragNode:null,timer:null,hoverEdge:-1};
