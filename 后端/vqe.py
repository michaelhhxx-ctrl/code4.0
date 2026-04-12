"""
VQE simulation backend — Q-Edu educational platform
====================================================

Purpose
-------
Implements a simplified Variational Quantum Eigensolver (VQE) for educational
demonstration.  The code prioritises clarity, interactivity, and visual feedback
over numerical accuracy or scalability.

Implementation scope & limitations
-----------------------------------
• Hamiltonian models are simplified qubit operators (SparsePauliOp), not full
  second-quantized molecular Hamiltonians.  Exact energies are reference values
  only; the simulated convergence approximates but does not strictly reach them.

• Gradients use a finite-difference scheme (ε = 0.02 rad) instead of the
  parameter-shift rule, trading accuracy for simplicity and speed.

• The energy landscape endpoint (POST /api/vqe/landscape) returns a 2D SLICE:
  only θ₁ = theta[0] and θ₂ = theta[1] are swept; all theta[2:] are fixed
  at theta_ref (zero-padded).  This is NOT a full-dimensional landscape.

• ansatz_depth and ansatz_type genuinely change the parameterised circuit
  structure (see _build_circuit), so they affect both the optimisation and the
  landscape computation consistently.

• This implementation targets educational demonstration (≤ 8 qubits, ≤ 300 iter)
  and is NOT suitable for production quantum chemistry workloads.
"""
from __future__ import annotations

import asyncio
import math
import numpy as np
from dataclasses import dataclass

# ── Molecule exact ground-state energies (Hartree) ───────────────────────────
EXACT: dict[str, float] = {
    "H2":   -1.1372,
    "HeH":  -2.8628,
    "LiH":  -7.8824,
    "BeH2": -15.5937,
    "H2O":  -74.9654,
}

from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, SparsePauliOp
from .schemas import VQEParams


# ── VQE step data returned to the frontend ───────────────────────────────────
@dataclass
class VQEStep:
    iteration: int
    energy: float           # E(theta_before): energy at the point BEFORE this update
    gradients: list[float]  # ∂E/∂θᵢ at theta_before, first 4 params, padded to len=4
    theta2d: list[float]    # [theta_before[0], theta_before[1]] — for 3D trajectory display
    params_all: list[float] # full theta_before vector — for future landscape re-slicing
    converged: bool


# ── Hamiltonian definitions ───────────────────────────────────────────────────
def _get_hamiltonian(molecule: str) -> SparsePauliOp:
    """Return the qubit Hamiltonian (SparsePauliOp) for the given molecule."""
    if molecule == "H2":
        return SparsePauliOp.from_list([
            ("II", -1.052), ("IZ", 0.398), ("ZI", -0.398), ("ZZ", -0.011), ("XX", 0.181)
        ])
    elif molecule == "HeH":
        return SparsePauliOp.from_list([
            ("II", -2.862), ("IZ", 0.451), ("ZI", -0.451), ("ZZ", 0.122), ("XX", 0.075)
        ])
    elif molecule == "LiH":
        return SparsePauliOp.from_list([
            ("IIII", -7.882), ("IIIZ", 0.21), ("IIZI", -0.21), ("IZII", 0.15),
            ("ZIII", -0.15), ("IIZZ", 0.05), ("ZZII", 0.05)
        ])
    elif molecule == "BeH2":
        return SparsePauliOp.from_list([
            ("IIIIII", -15.593), ("IIIIIZ", 0.18), ("IIIIZI", -0.18),
            ("IIIZII", 0.12), ("IIZIII", -0.12), ("ZZIIII", 0.08)
        ])
    elif molecule == "H2O":
        return SparsePauliOp.from_list([
            ("IIIIIIII", -74.965), ("IIIIIIIZ", 0.15), ("IIIIIIZI", -0.15),
            ("IIIIIZII", 0.10), ("IIIIZIII", -0.10), ("IIIZIIII", 0.05)
        ])
    return _get_hamiltonian("H2")


# ── Ansatz parameter count ────────────────────────────────────────────────────
def get_ansatz_param_count(n_qubits: int, ansatz_type: str, depth: int) -> int:
    """
    Return the number of variational parameters for the given ansatz.

    Hardware-Efficient (default):
        Each of the `depth` layers: Ry + Rz on every qubit, then linear CNOT chain.
        Total params = 2 * n_qubits * depth.

    UCCSD-inspired:
        Initial Ry state-prep layer (n_qubits params) +
        `depth` excitation layers, each covering (n_qubits − 1) adjacent pairs × 2 params.
        Total params = n_qubits + 2 * (n_qubits − 1) * depth.
        (For n_qubits = 1 — not used in practice — pairs is clamped to 1.)

    RealAmplitudes:
        `depth` layers of [Ry, linear CNOT chain] + one final Ry layer.
        Total params = n_qubits * (depth + 1).
    """
    at = ansatz_type.upper()
    if "UCCSD" in at:
        pairs = max(n_qubits - 1, 1)
        return n_qubits + 2 * pairs * depth
    elif "REAL" in at:
        return n_qubits * (depth + 1)
    else:  # Hardware-Efficient (default)
        return 2 * n_qubits * depth


# ── Ansatz circuit construction ───────────────────────────────────────────────
def _build_circuit(
    n_qubits: int,
    theta: np.ndarray,
    ansatz_type: str,
    depth: int,
) -> QuantumCircuit:
    """
    Build the parameterized ansatz circuit.

    Hardware-Efficient:
        For each layer l in 0..depth−1:
            Ry(theta[l*2q + i])     on qubit i   ← rotation
            Rz(theta[l*2q + q + i]) on qubit i   ← rotation
            CNOT(i, i+1) for i in 0..q−2         ← linear entanglement
        (No final rotation layer; depth controls expressiveness via Ry+Rz pairs.)

    UCCSD-inspired:
        Ry(theta[i]) on each qubit i              ← initial state prep (params 0..q−1)
        For each layer l in 0..depth−1:
            For each adjacent pair (p, p+1):
                Ry(theta[q + l*2*(q−1) + 2p])     on qubit p
                CNOT(p, p+1)
                Ry(theta[q + l*2*(q−1) + 2p + 1]) on qubit p+1
                CNOT(p, p+1)                      ← uncompute entanglement

    RealAmplitudes:
        For each layer l in 0..depth−1:
            Ry(theta[l*q + i]) on qubit i         ← rotation (Ry only, real-valued)
            CNOT(i, i+1) for i in 0..q−2         ← linear entanglement
        Ry(theta[depth*q + i]) on qubit i         ← final rotation layer
    """
    qc = QuantumCircuit(n_qubits)
    at = ansatz_type.upper()
    q = n_qubits

    if "UCCSD" in at:
        # ── Initial state preparation: Ry on every qubit (params 0..q-1) ──
        for i in range(q):
            qc.ry(float(theta[i]), i)
        # ── Excitation layers ──
        pairs = max(q - 1, 1)
        for l in range(depth):
            for p in range(q - 1):
                base = q + l * 2 * pairs + 2 * p
                qc.ry(float(theta[base]),     p)
                qc.cx(p, p + 1)
                qc.ry(float(theta[base + 1]), p + 1)
                qc.cx(p, p + 1)  # uncompute to preserve excitation structure

    elif "REAL" in at:
        # ── RealAmplitudes: depth × [Ry, CNOT-chain], then final Ry ──
        for l in range(depth):
            for i in range(q):
                qc.ry(float(theta[l * q + i]), i)
            for i in range(q - 1):
                qc.cx(i, i + 1)
        # Final rotation layer
        for i in range(q):
            qc.ry(float(theta[depth * q + i]), i)

    else:  # Hardware-Efficient (default)
        # ── depth × [Ry+Rz on every qubit, CNOT chain] ──
        for l in range(depth):
            for i in range(q):
                qc.ry(float(theta[l * 2 * q + i]),         i)
                qc.rz(float(theta[l * 2 * q + q + i]),     i)
            for i in range(q - 1):
                qc.cx(i, i + 1)

    return qc


# ── Expectation value ─────────────────────────────────────────────────────────
def _calculate_expectation(
    n_qubits: int,
    theta: np.ndarray,
    hamiltonian: SparsePauliOp,
    ansatz_type: str,
    depth: int,
) -> float:
    """Build the ansatz circuit and return ⟨ψ(θ)|H|ψ(θ)⟩."""
    qc = _build_circuit(n_qubits, theta, ansatz_type, depth)
    sv = Statevector.from_instruction(qc)
    return float(np.real(sv.expectation_value(hamiltonian)))


# ── Per-iteration CPU work (energy + gradient) ───────────────────────────────
def _compute_vqe_iter(
    theta_before: np.ndarray,
    n_qubits: int,
    molecule_op: SparsePauliOp,
    ansatz_type: str,
    depth: int,
    dim: int,
    eps: float = 0.02,
) -> tuple[float, np.ndarray]:
    """
    Compute energy and finite-difference gradient at theta_before.

    Pure synchronous function — designed to run in a thread-pool executor so
    the asyncio event loop is not blocked during the 1 + dim Qiskit simulations
    that make up each VQE iteration.

    Returns (current_energy, grad).
    """
    current_energy = _calculate_expectation(
        n_qubits, theta_before, molecule_op, ansatz_type, depth
    )
    grad = np.zeros(dim)
    for i in range(dim):
        theta_p     = theta_before.copy()
        theta_p[i] += eps
        energy_p    = _calculate_expectation(
            n_qubits, theta_p, molecule_op, ansatz_type, depth
        )
        grad[i] = (energy_p - current_energy) / eps
    return current_energy, grad


# ── VQE optimization loop ─────────────────────────────────────────────────────
async def generate_vqe_steps(params: VQEParams):
    """
    Async generator that yields one VQEStep per iteration.

    Energy / trajectory alignment guarantee
    ────────────────────────────────────────
    At the start of each iteration:
        theta_before = theta.copy()             ← current position (pre-update)
        current_energy = E(theta_before)        ← energy at this position
        grad           = ∇E at theta_before     ← gradient at this position

    The optimizer then computes a new theta from theta_before + grad, but
    the yielded step always reports (current_energy, theta2d, params_all) from
    theta_before, guaranteeing the trajectory point sits at the correct height
    on the energy landscape.
    """
    if params.molecule not in EXACT:
        raise ValueError(
            f"Unknown molecule: {params.molecule!r}. "
            f"Accepted: {sorted(EXACT)}"
        )

    try:
        raw_val  = getattr(params, "max_iter", 100)
        max_iter = int(raw_val) if raw_val is not None else 100
    except (ValueError, TypeError, AttributeError):
        max_iter = 100
    max_iter = max(1, max_iter)

    molecule_op = _get_hamiltonian(params.molecule)
    n_qubits    = molecule_op.num_qubits
    ansatz_type = params.ansatz_type  if params.ansatz_type  else "Hardware-Efficient"
    depth       = params.ansatz_depth if params.ansatz_depth else 2
    dim         = get_ansatz_param_count(n_qubits, ansatz_type, depth)

    rng       = np.random.default_rng()
    theta     = rng.uniform(0, 2 * np.pi, dim)
    m_history = np.zeros(dim)
    opt_type  = params.optimizer.upper() if params.optimizer else "GD"
    loop      = asyncio.get_running_loop()  # same loop for all iterations

    for it in range(max_iter):
        # ── 1. Save current position BEFORE any optimizer update ─────────────
        theta_before = theta.copy()

        # ── 2. Compute energy and gradient at theta_before (off event loop) ──
        # _compute_vqe_iter runs 1 + dim Qiskit simulations synchronously.
        # Offloading to a thread-pool executor keeps the asyncio event loop
        # free to handle other requests while the CPU work is in progress.
        current_energy, grad = await loop.run_in_executor(
            None, _compute_vqe_iter,
            theta_before, n_qubits, molecule_op, ansatz_type, depth, dim,
        )

        # ── 3. Optimizer step (modifies theta, NOT theta_before) ─────────────
        lr = 0.2 / (1 + it * 0.02)
        if opt_type == "L-BFGS-B":
            # Quasi-Newton: exponential moving average of gradient (momentum)
            m_history = 0.85 * m_history + 0.15 * grad
            theta = theta_before - (lr * 1.5) * m_history
        elif opt_type == "SPSA":
            noise = rng.normal(0, 0.04 / (1 + it * 0.1), size=dim)
            theta = theta_before - (lr * 1.6) * (grad + noise)
        elif opt_type == "COBYLA":
            theta = theta_before - (lr * 1.3) * grad
        else:  # default gradient descent
            theta = theta_before - lr * grad

        theta = np.mod(theta, 2.0 * math.pi)

        # ── 4. Convergence check ─────────────────────────────────────────────
        grad_norm  = float(np.linalg.norm(grad))
        is_last_it = (it == max_iter - 1)
        converged  = (grad_norm < 0.005 * n_qubits) or is_last_it

        # Pad / truncate gradients to exactly 4 entries for the front-end table
        grad_display = [float(g) for g in grad[:4]]
        while len(grad_display) < 4:
            grad_display.append(0.0)

        # ── 5. Yield step: energy and params always from the SAME point ───────
        yield VQEStep(
            iteration  = it + 1,
            energy     = float(current_energy),
            gradients  = grad_display,
            theta2d    = [float(theta_before[0]), float(theta_before[1])],
            params_all = [round(float(v), 6) for v in theta_before.tolist()],
            converged  = converged,
        )

        if converged:
            break

        # Control animation frame rate
        await asyncio.sleep(0.06)


# ── Landscape computation ─────────────────────────────────────────────────────
# In-process cache: avoids recomputing identical landscapes during a demo session.
# Key: (molecule, ansatz_type_upper, depth, resolution, theta_ref_rounded_tuple)
# FIFO eviction at _LANDSCAPE_CACHE_MAX entries (≈ 50 × 24×24 × 8 B ≈ 230 KB).
_LANDSCAPE_CACHE_MAX = 50
_landscape_cache: dict[tuple, dict] = {}


def _landscape_cache_key(
    molecule: str,
    ansatz_type: str,
    depth: int,
    resolution: int,
    theta_ref: list[float],
) -> tuple:
    """Build a hashable cache key. theta_ref values rounded to 2 dp."""
    ref_rounded = tuple(round(v, 2) for v in theta_ref)
    return (molecule, ansatz_type.upper(), depth, resolution, ref_rounded)


def compute_landscape_sync(
    molecule: str,
    ansatz_type: str,
    depth: int,
    resolution: int,
    theta_ref: list[float],
) -> dict:
    """
    Compute the E(θ₁, θ₂) energy landscape on a resolution×resolution grid.

    Scan axes : theta[0] (θ₁) and theta[1] (θ₂), both swept over [0, 2π].
    Fixed axes: theta[2:] set to theta_ref values (zero-padded to dim if short).

    Uses the same _build_circuit / _calculate_expectation logic as
    generate_vqe_steps, so landscape and optimization are always consistent.
    """
    key = _landscape_cache_key(molecule, ansatz_type, depth, resolution, theta_ref)
    if key in _landscape_cache:
        return _landscape_cache[key]

    hamiltonian = _get_hamiltonian(molecule)
    n_qubits    = hamiltonian.num_qubits
    dim         = get_ansatz_param_count(n_qubits, ansatz_type, depth)

    # Reference vector: theta_ref values for indices 0..dim-1, zeros elsewhere
    ref = np.zeros(dim)
    for idx, v in enumerate(theta_ref[:dim]):
        ref[idx] = float(v)

    t_vals = np.linspace(0, 2 * math.pi, resolution)
    grid: list[list[float]] = []

    for i in range(resolution):
        row: list[float] = []
        for j in range(resolution):
            theta    = ref.copy()
            theta[0] = t_vals[i]
            if dim > 1:
                theta[1] = t_vals[j]
            e = _calculate_expectation(n_qubits, theta, hamiltonian, ansatz_type, depth)
            row.append(round(e, 6))
        grid.append(row)

    result: dict = {
        "grid":          grid,
        "theta1_range":  [0.0, round(2 * math.pi, 6)],
        "theta2_range":  [0.0, round(2 * math.pi, 6)],
        "exact":         EXACT.get(molecule),
        # Explicit slice description so the frontend can label the visualization
        "slice_strategy": (
            f"Axes: theta[0] (θ₁) × theta[1] (θ₂) each swept [0, 2π]; "
            f"theta[2:{dim}] fixed at theta_ref (zero-padded); "
            f"ansatz={ansatz_type}, depth={depth}, n_params={dim}"
        ),
        "n_params":    dim,
        "ansatz_type": ansatz_type,
        "ansatz_depth": depth,
        "molecule":    molecule,
        "resolution":  resolution,
    }

    # FIFO eviction: if cache is full, drop the oldest entry before inserting.
    # Python dicts preserve insertion order (≥3.7), so next(iter(...)) is the oldest.
    if len(_landscape_cache) >= _LANDSCAPE_CACHE_MAX:
        oldest = next(iter(_landscape_cache))
        del _landscape_cache[oldest]
    _landscape_cache[key] = result

    return result


async def compute_landscape(
    molecule: str,
    ansatz_type: str,
    depth: int,
    resolution: int,
    theta_ref: list[float],
) -> dict:
    """Async wrapper: runs compute_landscape_sync in a thread-pool executor."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None,
        compute_landscape_sync,
        molecule,
        ansatz_type,
        depth,
        resolution,
        theta_ref,
    )
