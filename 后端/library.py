from __future__ import annotations

LIBRARY_CIRCUITS = [
    {
        "id": "bell",
        "name": "Bell State",
        "description": "Creates (|00> + |11>) / sqrt(2).",
        "n_qubits": 2,
        "circuit": [
            {"qubit": 0, "step": 0, "g": "H"},
            {"qubit": 0, "step": 1, "g": "CNOT", "ctrl": 0, "tgt": 1, "role": "ctrl"},
            {"qubit": 1, "step": 1, "g": "CNOT", "ctrl": 0, "tgt": 1, "role": "tgt"},
        ],
        "tags": ["entanglement", "starter"],
    },
    {
        "id": "ghz",
        "name": "GHZ State",
        "description": "Three-qubit maximally entangled state.",
        "n_qubits": 3,
        "circuit": [
            {"qubit": 0, "step": 0, "g": "H"},
            {"qubit": 0, "step": 1, "g": "CNOT", "ctrl": 0, "tgt": 1, "role": "ctrl"},
            {"qubit": 1, "step": 1, "g": "CNOT", "ctrl": 0, "tgt": 1, "role": "tgt"},
            {"qubit": 0, "step": 2, "g": "CNOT", "ctrl": 0, "tgt": 2, "role": "ctrl"},
            {"qubit": 2, "step": 2, "g": "CNOT", "ctrl": 0, "tgt": 2, "role": "tgt"},
        ],
        "tags": ["entanglement", "multi-qubit"],
    },
    {
        "id": "vqe_ansatz",
        "name": "VQE Ansatz",
        "description": "Simple hardware-efficient two-qubit ansatz.",
        "n_qubits": 2,
        "circuit": [
            {"qubit": 0, "step": 0, "g": "Ry", "p": 45},
            {"qubit": 1, "step": 0, "g": "Ry", "p": 45},
            {"qubit": 0, "step": 1, "g": "CNOT", "ctrl": 0, "tgt": 1, "role": "ctrl"},
            {"qubit": 1, "step": 1, "g": "CNOT", "ctrl": 0, "tgt": 1, "role": "tgt"},
            {"qubit": 0, "step": 2, "g": "Rz", "p": 90},
            {"qubit": 1, "step": 2, "g": "Ry", "p": 30},
        ],
        "tags": ["vqe", "ansatz"],
    },
]
