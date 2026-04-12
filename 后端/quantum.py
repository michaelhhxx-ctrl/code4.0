from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable

import numpy as np
# 引入 Qiskit 核心组件
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, partial_trace
from .schemas import CircuitGate


TWO_QUBIT_GATES = {"CNOT", "CZ", "SWAP"}


@dataclass
class SimulationResult:
    statevector: list[dict[str, float]]
    bloch: list[dict[str, float]]
    probabilities: list[float]
    depth: int


class StatevectorSimulator:
    def __init__(self, n_qubits: int) -> None:
        self.n = n_qubits
        # 初始化 Qiskit 线路
        self.qc = QuantumCircuit(n_qubits)

    # --- 以下所有门操作全部改为操作 Qiskit 线路 ---
    
    def h(self, q: int) -> None:
        self.qc.h(q)

    def x(self, q: int) -> None:
        self.qc.x(q)

    def y(self, q: int) -> None:
        self.qc.y(q)

    def z(self, q: int) -> None:
        self.qc.z(q)

    def s(self, q: int) -> None:
        self.qc.s(q)

    def t(self, q: int) -> None:
        self.qc.t(q)

    def rx(self, q: int, theta: float) -> None:
        self.qc.rx(theta, q)

    def ry(self, q: int, theta: float) -> None:
        self.qc.ry(theta, q)

    def rz(self, q: int, theta: float) -> None:
        self.qc.rz(theta, q)

    def cnot(self, ctrl: int, tgt: int) -> None:
        self.qc.cx(ctrl, tgt)

    def cz(self, q1: int, q2: int) -> None:
        self.qc.cz(q1, q2)

    def swap(self, q1: int, q2: int) -> None:
        self.qc.swap(q1, q2)

    # --- 计算逻辑：利用 Qiskit 获取结果并转换为你原始的格式 ---

    def _get_sv_data(self):
        # 获取状态矢量
        sv_obj = Statevector.from_instruction(self.qc)
        # 翻转比特顺序以匹配你原有的 Big-endian (q0 在左) 逻辑
        return sv_obj.reverse_qargs()

    def probabilities(self) -> list[float]:
        sv = self._get_sv_data()
        return [float(abs(a) ** 2) for a in sv.data]

    def bloch_vector(self, q: int) -> dict[str, float]:
        # Qiskit 计算原始顺序下的单比特密度矩阵
        sv_origin = Statevector.from_instruction(self.qc)
        rho = partial_trace(sv_origin, [j for j in range(self.n) if j != q])
        x = float(np.real(rho.data[0, 1] + rho.data[1, 0]))
        y = float(np.imag(rho.data[1, 0] - rho.data[0, 1]))
        z = float(np.real(rho.data[0, 0] - rho.data[1, 1]))
        return {"x": x, "y": y, "z": z}

    def statevector_json(self) -> list[dict[str, float]]:
        sv = self._get_sv_data()
        return [{"re": float(np.real(amp)), "im": float(np.imag(amp))} for amp in sv.data]


# --- 外部调用函数保持不变 ---

def _apply_named_single(sim: StatevectorSimulator, gate: any) -> None:
    theta = math.radians(gate.p if gate.p is not None else 0.0)
    if gate.g == "H": sim.h(gate.qubit)
    elif gate.g == "X": sim.x(gate.qubit)
    elif gate.g == "Y": sim.y(gate.qubit)
    elif gate.g == "Z": sim.z(gate.qubit)
    elif gate.g == "S": sim.s(gate.qubit)
    elif gate.g == "T": sim.t(gate.qubit)
    elif gate.g == "Rx": sim.rx(gate.qubit, theta)
    elif gate.g == "Ry": sim.ry(gate.qubit, theta)
    elif gate.g == "Rz": sim.rz(gate.qubit, theta)


def simulate_circuit(circuit: Iterable[any], n_qubits: int) -> SimulationResult:
    sim = StatevectorSimulator(n_qubits)
    
    # 按照 step 排序并应用门逻辑 (保持你原有的逻辑不变)
    from collections import defaultdict
    by_step = defaultdict(list)
    for gate in circuit:
        by_step[gate.step].append(gate)

    for step in sorted(by_step):
        gates = sorted(by_step[step], key=lambda item: item.qubit)
        for gate in gates:
            if gate.role == "tgt": continue
            if gate.g in TWO_QUBIT_GATES:
                ctrl = gate.ctrl if gate.ctrl is not None else gate.qubit
                tgt = gate.tgt if gate.tgt is not None else gate.qubit
                if gate.g == "CNOT": sim.cnot(ctrl, tgt)
                elif gate.g == "CZ": sim.cz(ctrl, tgt)
                elif gate.g == "SWAP": sim.swap(ctrl, tgt)
                continue
            if gate.g != "M":
                _apply_named_single(sim, gate)

    return SimulationResult(
        statevector=sim.statevector_json(),
        bloch=[sim.bloch_vector(q) for q in range(n_qubits)],
        probabilities=sim.probabilities(),
        depth=int(sim.qc.depth()), # 使用 Qiskit 自动计算的深度更准确
    )