from __future__ import annotations

import re
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator

# ── Ansatz type normalization ──────────────────────────────────────────────────
# Canonical values — only these three are accepted internally.
_ANSATZ_CANONICAL: frozenset[str] = frozenset({"Hardware-Efficient", "UCCSD", "RealAmplitudes"})

# Explicit alias map (keyed by lower-stripped input).
# Unknown inputs are NOT silently defaulted; they raise a clear validation error.
_ANSATZ_ALIASES: dict[str, str] = {
    # Hardware-Efficient
    "hardware-efficient":  "Hardware-Efficient",
    "hardware efficient":  "Hardware-Efficient",
    "hardwareefficient":   "Hardware-Efficient",
    "he":                  "Hardware-Efficient",
    "hea":                 "Hardware-Efficient",
    # UCCSD-inspired
    "uccsd":               "UCCSD",
    "uccsd-inspired":      "UCCSD",
    "uccsd inspired":      "UCCSD",
    # RealAmplitudes
    "realamplitudes":      "RealAmplitudes",
    "real amplitudes":     "RealAmplitudes",
    "real":                "RealAmplitudes",
    "ra":                  "RealAmplitudes",
}


def _normalize_ansatz_type(v: str) -> str:
    """
    Normalize ansatz_type to one of three canonical values.
    Exact canonical match passes through; known aliases are mapped;
    anything else raises ValueError (→ HTTP 422).
    """
    if v in _ANSATZ_CANONICAL:
        return v
    mapped = _ANSATZ_ALIASES.get(v.lower().strip())
    if mapped:
        return mapped
    raise ValueError(
        f"Unknown ansatz_type {v!r}. "
        f"Accepted values: {sorted(_ANSATZ_CANONICAL)}. "
        f"Accepted aliases: {sorted(_ANSATZ_ALIASES)}."
    )

_USERNAME_RE = re.compile(r"^[a-zA-Z0-9_\u4e00-\u9fa5]+$")


GateName = Literal["H", "X", "Y", "Z", "S", "T", "Rx", "Ry", "Rz", "CNOT", "CZ", "SWAP", "M"]


# ── Auth schemas ──────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str = Field(min_length=2, max_length=20)
    password: str = Field(min_length=4, max_length=128)
    email: str = Field(default="", max_length=254)

    @field_validator("username")
    @classmethod
    def username_chars(cls, v: str) -> str:
        if not _USERNAME_RE.match(v):
            raise ValueError("Username can only contain letters, digits, underscores, or Chinese characters")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    username: str


# ── User circuit schemas ───────────────────────────────────────────────────────

class SaveUserCircuitRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    circ: list[Any]          # raw circuit rows from the frontend
    qubits: int = Field(ge=1, le=24)
    gateCount: int = Field(ge=0)


class UserCircuitOut(BaseModel):
    id: str
    name: str
    qubits: int
    gateCount: int
    circ: list[Any]
    savedAt: float


# ── User history schemas ───────────────────────────────────────────────────────

class AddHistoryRequest(BaseModel):
    ts: float
    desc: str = Field(max_length=500)
    type: str = Field(default="sim", pattern="^(sim|save)$")


class CircuitGate(BaseModel):
    qubit: int
    step: int
    g: GateName
    p: Optional[float] = None
    ctrl: Optional[int] = None
    tgt: Optional[int] = None
    role: Optional[Literal["ctrl", "tgt"]] = None


class SimulateRequest(BaseModel):
    circuit: list[CircuitGate] = Field(default_factory=list)
    n_qubits: int = Field(ge=1, le=12)


class ComplexNumber(BaseModel):
    re: float
    im: float


class BlochVector(BaseModel):
    x: float
    y: float
    z: float


class SimulateResponse(BaseModel):
    statevector: list[ComplexNumber]
    bloch: list[BlochVector]
    probabilities: list[float]
    depth: int


class AITutorRequest(BaseModel):
    message: str
    circuit: dict[str, Any] = Field(default_factory=dict)


class CodegenRequest(BaseModel):
    circuit: list[CircuitGate] = Field(default_factory=list)
    n_qubits: int = Field(ge=1, le=24)


class SaveCircuitRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    circuit: list[CircuitGate] = Field(default_factory=list)
    n_qubits: int = Field(ge=1, le=24)


class SavedCircuit(BaseModel):
    id: str
    name: str
    circuit: list[dict[str, Any]]
    n_qubits: int
    created_at: float


class VQEParams(BaseModel):
    molecule: str = "H2"
    optimizer: str = "COBYLA"
    max_iter: int = Field(default=80, ge=5, le=300)
    ansatz_depth: int = Field(default=2, ge=1, le=8)
    ansatz_type: str = "Hardware-Efficient"

    @field_validator("ansatz_type")
    @classmethod
    def normalize_ansatz(cls, v: str) -> str:
        return _normalize_ansatz_type(v)


class LandscapeRequest(BaseModel):
    """
    Request body for POST /api/vqe/landscape.

    resolution : grid size on each axis (16 × 16 by default, max 24 × 24)
    theta_ref  : reference parameter vector; theta[2:] are fixed at these values
                 (zero-padded to the actual ansatz parameter dimension if too short)
    """
    molecule: str = "H2"
    ansatz_type: str = "Hardware-Efficient"
    ansatz_depth: int = Field(default=2, ge=1, le=8)
    resolution: int = Field(default=16, ge=10, le=24)
    theta_ref: list[float] = Field(default_factory=list)

    @field_validator("ansatz_type")
    @classmethod
    def normalize_ansatz(cls, v: str) -> str:
        return _normalize_ansatz_type(v)


class QAOANode(BaseModel):
    id: int
    x: float | None = None
    y: float | None = None


class QAOAEdge(BaseModel):
    a: int
    b: int


class QAOAParams(BaseModel):
    nodes: list[QAOANode] = Field(default_factory=list)
    edges: list[QAOAEdge] = Field(default_factory=list)
    p: int = Field(default=1, ge=1, le=1, description="QAOA layers; currently only p=1 is implemented")
    gamma: float | None = None
    beta: float | None = None
    max_iter: int = Field(default=45, ge=5, le=200)


class AiOptimizeRequest(BaseModel):
    circ: list[Any]
    n_qubits: int = Field(ge=1, le=12)
    question: str | None = None
    errors: list[str] | None = None
