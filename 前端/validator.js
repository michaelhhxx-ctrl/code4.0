// ── QUANTUM CIRCUIT VALIDATOR ──
// Pure validation logic — no DOM dependency.
// Loaded before circuit.js; all four functions exposed globally.
//
// Rules:
//   ERROR (blocking):
//     qubit_limit        — S.qubits > 8
//     gate_after_measure — gate on same qubit after M
//     ctrl_eq_tgt        — two-qubit gate ctrl === tgt
//     orphan_two_qubit   — ctrl or tgt slot missing entirely
//     pair_mismatch      — ctrl-slot ↔ tgt-slot metadata inconsistency
//                          (includes gate-type mismatch, wrong ctrl/tgt refs)
//   WARNING:
//     measure_not_last   — M is last on its qubit but not last in circuit
//     cancel_pair        — consecutive self-inverse pair:
//                          H-H · X-X · Y-Y · Z-Z (single-qubit)
//                          CNOT-CNOT · CZ-CZ · SWAP-SWAP (same ctrl+tgt)
//   INFO:
//     empty_circuit      — no gates placed

function getCircuitCapabilities() {
  return {
    supportedMaxQubits: 8,
    backendOnline: !!window._backendConnected,
    forceLocal:    !!window._forceLocal,
  };
}

// Returns { errors, warnings, infos, bySlot, summary }
// bySlot["${q},${s}"] → [{ level, msg, rule }, ...]
function validateCircuitSnapshot(circ, qubits, steps, caps) {
  const MAX_Q        = caps?.supportedMaxQubits ?? 8;
  const errors       = [], warnings = [], infos = [];
  const bySlot       = {};
  const TWO_Q        = ['CNOT', 'CZ', 'SWAP'];
  const CANCEL_1Q    = new Set(['H', 'X', 'Y', 'Z']);
  const CANCEL_2Q    = new Set(['CNOT', 'CZ', 'SWAP']);
  function L(zh, en) { return window._currentLang === 'en' ? en : zh; }

  function _slot(q, s, level, msg, rule) {
    const k = `${q},${s}`; if (!bySlot[k]) bySlot[k] = [];
    bySlot[k].push({ level, msg, rule });
  }
  function addErr(q, s, msg, rule)  {
    errors.push({ q, s, msg, rule });
    if (q >= 0 && s >= 0) _slot(q, s, 'error', msg, rule);
  }
  function addWarn(q, s, msg, rule) {
    warnings.push({ q, s, msg, rule });
    if (q >= 0 && s >= 0) _slot(q, s, 'warning', msg, rule);
  }
  function addInfo(msg, rule) { infos.push({ msg, rule }); }

  // ── 1. Qubit limit ────────────────────────────────────────────────────────
  if (qubits > MAX_Q) {
    addErr(-1, -1,
      L(`线路超过 ${MAX_Q} 量子比特上限`, `Circuit exceeds the ${MAX_Q}-qubit limit`),
      'qubit_limit');
  }

  // ── 2. Empty circuit ─────────────────────────────────────────────────────
  let hasGate = false;
  outer: for (let q = 0; q < qubits; q++) {
    if (!circ[q]) continue;
    for (let s = 0; s < steps; s++) { if (circ[q][s]) { hasGate = true; break outer; } }
  }
  if (!hasGate) {
    addInfo(
      L('线路为空 — 至少放置一个门才能运行模拟', 'Circuit is empty — place at least one gate to simulate'),
      'empty_circuit');
    // No further structural rules apply to an empty circuit
    return { errors, warnings, infos, bySlot,
             summary: { errorCount:0, warningCount:0, infoCount:1, blocking:false } };
  }

  // ── Global last step with any gate ────────────────────────────────────────
  let globalLastStep = -1;
  for (let q = 0; q < qubits; q++) {
    if (!circ[q]) continue;
    for (let s = steps - 1; s >= 0; s--) {
      if (circ[q][s] && s > globalLastStep) { globalLastStep = s; break; }
    }
  }

  // ── Per-qubit rules ───────────────────────────────────────────────────────
  for (let q = 0; q < qubits; q++) {
    if (!circ[q]) continue;

    // Last gate step on this qubit (for measure_not_last)
    let lastOnQubit = -1;
    for (let s = steps - 1; s >= 0; s--) { if (circ[q][s]) { lastOnQubit = s; break; } }

    let measuredAt = -1;
    let prevNonTgt = null; // { s, gate } — for cancel_pair

    for (let s = 0; s < steps; s++) {
      const gate = circ[q][s];
      if (!gate) continue;

      // ── 3. Gate after measurement (error) ─────────────────────────────
      if (measuredAt >= 0 && gate.g !== 'M') {
        addErr(q, s,
          L(`q${q}：步骤 ${s} 的门在测量（步骤 ${measuredAt}）之后`,
            `q${q}: gate at step ${s} follows measurement at step ${measuredAt}`),
          'gate_after_measure');
      }

      if (gate.g === 'M') {
        // ── 4. Measurement not last in circuit (warning) ─────────────────
        // Fires only when M is the last gate on this qubit but not globally
        if (s === lastOnQubit && s < globalLastStep) {
          addWarn(q, s,
            L(`q${q}：步骤 ${s} 测量后线路仍有操作，后续门作用于坍缩态`,
              `q${q}: measurement at step ${s} is not the circuit's last operation — later gates act on a collapsed state`),
            'measure_not_last');
        }
        if (measuredAt < 0) measuredAt = s;
      }

      // ── 5-7. Two-qubit gate pairing checks ────────────────────────────
      if (TWO_Q.includes(gate.g)) {
        if (gate.role === 'ctrl') {
          const tQ = gate.tgt;

          // 5. ctrl === tgt (error)
          if (tQ === q) {
            addErr(q, s,
              L(`q${q}：步骤 ${s} 双比特门的控制与目标比特相同（q${q}）`,
                `q${q}: two-qubit gate at step ${s} has ctrl === tgt (both q${q})`),
              'ctrl_eq_tgt');

          // 6. Orphan — target slot entirely missing (error)
          } else if (tQ == null || tQ < 0 || tQ >= qubits || !circ[tQ] || !circ[tQ][s]) {
            addErr(q, s,
              L(`q${q}：步骤 ${s} 的双比特门缺少目标比特（q${tQ}）`,
                `q${q}: two-qubit gate at step ${s} has no target slot at q${tQ}`),
              'orphan_two_qubit');

          // 7. Pair metadata mismatch (error)
          //    Catches: wrong role, cross-linked refs, gate-type mismatch
          } else {
            const p = circ[tQ][s];
            if (p.role !== 'tgt' || p.ctrl !== q || p.tgt !== tQ || p.g !== gate.g) {
              addErr(q, s,
                L(`q${q}：步骤 ${s} 双比特门配对元数据不一致（目标 q${tQ} 的 role/ctrl/tgt/g 不匹配）`,
                  `q${q}: two-qubit gate at step ${s} — pair metadata mismatch at target q${tQ} (role/ctrl/tgt/g inconsistent)`),
                'pair_mismatch');
            }
          }

        } else if (gate.role === 'tgt') {
          // Tgt-side only checks for completely missing ctrl slot.
          // All other mismatch errors are reported from the ctrl side to avoid double-reporting.
          const cQ = gate.ctrl;
          if (cQ == null || cQ < 0 || cQ >= qubits || !circ[cQ] || !circ[cQ][s]) {
            addErr(q, s,
              L(`q${q}：步骤 ${s} 的双比特门缺少控制比特（q${cQ}）`,
                `q${q}: two-qubit gate at step ${s} has no control slot at q${cQ}`),
              'orphan_two_qubit');
          }
        }
      }

      // ── 8. Consecutive canceling gates (warning) ──────────────────────
      // Tracks the previous non-tgt gate on this qubit.
      if (gate.role !== 'tgt') {
        if (prevNonTgt) {
          const p = prevNonTgt;
          if (gate.g === p.gate.g) {
            if (CANCEL_1Q.has(gate.g)) {
              addWarn(q, s,
                L(`q${q}：步骤 ${p.s}→${s} 连续两个 ${gate.g} 门互相抵消`,
                  `q${q}: consecutive ${gate.g}–${gate.g} at steps ${p.s}→${s} cancel each other`),
                'cancel_pair');
            } else if (CANCEL_2Q.has(gate.g) && gate.tgt === p.gate.tgt) {
              addWarn(q, s,
                L(`q${q}：步骤 ${p.s}→${s} 连续两个 ${gate.g} 门互相抵消（tgt=q${gate.tgt}）`,
                  `q${q}: consecutive ${gate.g}–${gate.g}(tgt=q${gate.tgt}) at steps ${p.s}→${s} cancel each other`),
                'cancel_pair');
            }
          }
        }
        prevNonTgt = { s, gate };
      }
    }
  }

  return {
    errors, warnings, infos, bySlot,
    summary: {
      errorCount:   errors.length,
      warningCount: warnings.length,
      infoCount:    infos.length,
      blocking:     errors.length > 0,
    },
  };
}

// Writes result to S.validation and returns it.
function refreshCircuitValidation() {
  S.validation = validateCircuitSnapshot(S.circ, S.qubits, S.steps, getCircuitCapabilities());
  return S.validation;
}

// Returns the validation entries for a specific slot, or null if clean.
function getSlotValidation(q, s) {
  if (!S.validation) return null;
  return S.validation.bySlot[`${q},${s}`] || null;
}

window.getCircuitCapabilities   = getCircuitCapabilities;
window.validateCircuitSnapshot  = validateCircuitSnapshot;
window.refreshCircuitValidation = refreshCircuitValidation;
window.getSlotValidation        = getSlotValidation;
