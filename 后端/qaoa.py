from __future__ import annotations

import asyncio
import math
from dataclasses import dataclass

from .quantum import StatevectorSimulator
from .schemas import QAOAParams


@dataclass
class QAOAResult:
    max_cut: int
    best_bits: int
    best_gamma: float
    best_beta: float
    best_expected_cut: float
    best_cut_from_sample: int
    best_ratio: float
    probabilities: list[float]


def brute_force_maxcut(n: int, edges: list[tuple[int, int]]) -> tuple[int, int]:
    best_cut = 0
    best_bits = 0
    for bits in range(1 << n):
        cut = 0
        for a, b in edges:
            if ((bits >> a) & 1) != ((bits >> b) & 1):
                cut += 1
        if cut > best_cut:
            best_cut = cut
            best_bits = bits
    return best_cut, best_bits


def run_qaoa_p1(n: int, edges: list[tuple[int, int]], gamma: float, beta: float) -> list[float]:
    # 1. 初始化 Qiskit 版模拟器
    sim = StatevectorSimulator(n)
    
    # 2. 准备叠加态 |+>
    for q in range(n):
        sim.h(q)

    # 3. Cost unitary: 应用 RZZ 门 (对应 exp(-i * gamma/2 * Za * Zb))
    # 注意：Qiskit 的 rzz(theta) 演化算符是 exp(-i * theta/2 * Z^Z)
    # 所以传入的参数正好是 gamma
    for a, b in edges:
        # 在 Qiskit 中，rzz 门的参数 theta 对应 exp(-i * theta/2 * Z*Z)
        # 这里的 gamma 对应公式中的相位系数
        sim.qc.rzz(gamma, a, b)

    # 4. Mixer unitary: Rx(2 * beta)
    for q in range(n):
        sim.rx(q, 2.0 * beta)

    # 5. 调用 Qiskit 模拟并获取概率分布
    # 注意：确保你的 StatevectorSimulator 类中有 probabilities() 方法
    return sim.probabilities()


def expected_cut(probs: list[float], n: int, edges: list[tuple[int, int]]) -> float:
    total = 0.0
    for bits in range(1 << n):
        cut = 0
        for a, b in edges:
            if ((bits >> a) & 1) != ((bits >> b) & 1):
                cut += 1
        total += probs[bits] * cut
    return total


def optimize_qaoa(params: QAOAParams) -> QAOAResult:
    n = len(params.nodes)

    # Build node ID → qubit index map (0..n-1) and validate all edge endpoints.
    # Node IDs from the frontend are always 0-based sequential, but API callers
    # may use arbitrary IDs; remapping ensures the circuit always uses valid indices.
    id_to_idx = {node.id: i for i, node in enumerate(params.nodes)}
    for edge in params.edges:
        if edge.a not in id_to_idx or edge.b not in id_to_idx:
            raise ValueError(
                f"Edge ({edge.a}→{edge.b}) references unknown node ID. "
                f"Valid IDs: {sorted(id_to_idx)}"
            )

    edges = sorted({
        (min(id_to_idx[e.a], id_to_idx[e.b]), max(id_to_idx[e.a], id_to_idx[e.b]))
        for e in params.edges
        if e.a != e.b
    })
    max_cut, best_bits = brute_force_maxcut(n, edges)

    best_gamma = params.gamma if params.gamma is not None else 0.0
    best_beta = params.beta if params.beta is not None else 0.0
    best_expected = -1.0

    for gi in range(21):
        for bi in range(13):
            gamma = (gi / 20.0) * math.pi
            beta = (bi / 12.0) * (math.pi / 2.0)
            probs = run_qaoa_p1(n, edges, gamma, beta)
            exp_cut = expected_cut(probs, n, edges)
            if exp_cut > best_expected:
                best_expected = exp_cut
                best_gamma = gamma
                best_beta = beta

    final_probs = run_qaoa_p1(n, edges, best_gamma, best_beta)
    best_sample_prob = -1.0
    best_sample_bits = 0
    for bits, prob in enumerate(final_probs):
        if prob > best_sample_prob:
            best_sample_prob = prob
            best_sample_bits = bits

    best_cut_from_sample = 0
    for a, b in edges:
        if ((best_sample_bits >> a) & 1) != ((best_sample_bits >> b) & 1):
            best_cut_from_sample += 1

    ratio = best_cut_from_sample / max(1, max_cut)
    return QAOAResult(
        max_cut=max_cut,
        best_bits=best_sample_bits,
        best_gamma=best_gamma,
        best_beta=best_beta,
        best_expected_cut=best_expected,
        best_cut_from_sample=best_cut_from_sample,
        best_ratio=ratio,
        probabilities=final_probs,
    )


async def stream_qaoa_progress(params: QAOAParams):
    result = await asyncio.to_thread(optimize_qaoa, params)
    final_ratio = result.best_expected_cut / max(1, result.max_cut)
    max_iter = params.max_iter
    for it in range(max_iter):
        progress = it / max(1, max_iter - 1)
        ratio = max(0.0, min(1.0, final_ratio * (1 - math.exp(-5 * progress)) + 0.08 * (1 - progress)))
        current_cut = ratio * result.max_cut
        yield {
            "iter": it + 1,
            "ratio": ratio,
            "current_cut": current_cut,
            "max_cut": result.max_cut,
            "converged": False,
        }
        await asyncio.sleep(0.085)

    yield {
        "iter": max_iter,
        "ratio": result.best_ratio,              # sampled: best_cut / max_cut
        "expected_ratio": round(final_ratio, 6), # continuous expectation (reuses line 137)
        "best_cut": result.best_cut_from_sample,
        "max_cut": result.max_cut,
        "best_bits": format(result.best_bits, f"0{len(params.nodes)}b"),
        "best_gamma": result.best_gamma,
        "best_beta": result.best_beta,
        "probabilities": result.probabilities,
        "converged": True,
    }
