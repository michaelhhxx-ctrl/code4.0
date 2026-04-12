from __future__ import annotations

import json
import os
import time
from collections import defaultdict
from typing import Dict, List

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from dotenv import load_dotenv

# ★ 在应用入口确保环境变量被加载
load_dotenv()

from .ai_tutor import optimize_circuit, stream_sse_chunks
from .auth_utils import hash_pw, make_token, require_user, verify_pw
from .codegen import generate_mindquantum_code, generate_qiskit_code
from .library import LIBRARY_CIRCUITS
from .qaoa import stream_qaoa_progress
from .quantum import simulate_circuit
from .schemas import (
    AddHistoryRequest,
    AITutorRequest,
    AiOptimizeRequest,
    CodegenRequest,
    LandscapeRequest,
    LoginRequest,
    LoginResponse,
    QAOAParams,
    RegisterRequest,
    SaveCircuitRequest,
    SaveUserCircuitRequest,
    SimulateRequest,
    VQEParams,
)
from .storage import CircuitStore, UserStore
from .vqe import EXACT, compute_landscape, generate_vqe_steps


# ── 内存速率限制（AI 接口专用）──────────────────────────────────────────────────
# 每个 IP 在滑动窗口内最多 _AI_RATE_LIMIT 次请求，超出返回 429
_ai_req_log: Dict[str, List[float]] = defaultdict(list)
_AI_RATE_LIMIT  = int(os.getenv("QEDU_AI_RATE_LIMIT",  "20"))   # 次/窗口
_AI_RATE_WINDOW = float(os.getenv("QEDU_AI_RATE_WINDOW", "60"))  # 秒

def _ai_rate_ok(request: Request) -> bool:
    ip = (request.client.host if request.client else "unknown")
    now = time.time()
    log = _ai_req_log[ip]
    _ai_req_log[ip] = [t for t in log if now - t < _AI_RATE_WINDOW]
    if len(_ai_req_log[ip]) >= _AI_RATE_LIMIT:
        return False
    _ai_req_log[ip].append(now)
    return True


APP_TITLE = "Q-Edu Backend"
_SORTED_MOLECULES = sorted(EXACT.keys())  # computed once, reused on every health-check
MAX_QUBITS = int(os.getenv("QEDU_MAX_QUBITS", "12"))
DB_PATH = os.getenv("QEDU_DB_PATH", "./qedu.db")
CORS_ORIGINS = [item.strip() for item in os.getenv("QEDU_CORS_ORIGINS", "*").split(",") if item.strip()]

store = CircuitStore(DB_PATH)
users = UserStore(DB_PATH)
app = FastAPI(title=APP_TITLE, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ["*"] else ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict:
    return {
        "ok": True,
        "service": APP_TITLE,
        "engine": "numpy-statevector",
        "max_qubits": MAX_QUBITS,
        "molecules": _SORTED_MOLECULES,
    }


@app.post("/api/simulate")
async def simulate(payload: SimulateRequest):
    if payload.n_qubits > MAX_QUBITS:
        raise HTTPException(status_code=400, detail=f"n_qubits exceeds server limit ({MAX_QUBITS})")
    result = simulate_circuit(payload.circuit, payload.n_qubits)
    return JSONResponse(
        {
            "statevector": result.statevector,
            "bloch": result.bloch,
            "probabilities": result.probabilities,
            "depth": result.depth,
        }
    )


@app.post("/api/ai-tutor/stream")
async def ai_tutor_stream(request: Request, payload: AITutorRequest):
    if not _ai_rate_ok(request):
        raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试")
    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(
        stream_sse_chunks(payload.message, payload.circuit),
        media_type="text/event-stream",
        headers=headers,
    )


@app.websocket("/api/vqe/optimize")
async def vqe_optimize(websocket: WebSocket):
    await websocket.accept()
    try:
        raw = await websocket.receive_text()
        params = VQEParams.model_validate_json(raw)
        async for step in generate_vqe_steps(params):
            await websocket.send_json(
                {
                    "iter":       step.iteration,
                    "energy":     step.energy,
                    "gradients":  step.gradients,
                    # theta2d and params_all both come from theta_before (pre-update),
                    # guaranteeing the trajectory point sits at the reported energy.
                    "theta2d":    step.theta2d,    # [θ₁, θ₂] for 3D landscape display
                    "params_all": step.params_all, # full θ vector for future re-slicing
                    "molecule":   params.molecule,
                    "converged":  step.converged,
                }
            )
            if step.converged:
                break
    except WebSocketDisconnect:
        return
    except Exception as exc:
        await websocket.send_json({"error": str(exc), "converged": True})
    finally:
        await websocket.close()


@app.post("/api/vqe/landscape")
async def vqe_landscape(payload: LandscapeRequest):
    """
    Compute the E(θ₁, θ₂) energy landscape grid for the given VQE configuration.

    Response fields
    ───────────────
    grid           : list[list[float]]  resolution × resolution energy values
    theta1_range   : [0.0, 2π]          sweep range of θ₁ (axis 0)
    theta2_range   : [0.0, 2π]          sweep range of θ₂ (axis 1)
    exact          : float | None       known exact ground-state energy (Hartree)
    slice_strategy : str                human-readable description of the slice
    n_params       : int                total number of ansatz parameters
    ansatz_type    : str                echoed from request
    ansatz_depth   : int                echoed from request
    molecule       : str                echoed from request
    resolution     : int                echoed from request
    """
    if payload.molecule not in EXACT:
        raise HTTPException(status_code=400, detail=f"Unknown molecule: {payload.molecule!r}")
    result = await compute_landscape(
        molecule    = payload.molecule,
        ansatz_type = payload.ansatz_type,
        depth       = payload.ansatz_depth,
        resolution  = payload.resolution,
        theta_ref   = payload.theta_ref,
    )
    return result


@app.websocket("/api/qaoa/run")
async def qaoa_run(websocket: WebSocket):
    await websocket.accept()
    try:
        raw = await websocket.receive_text()
        params = QAOAParams.model_validate_json(raw)
        if len(params.nodes) < 2:
            await websocket.send_json({"error": "At least 2 nodes are required", "converged": True})
            return
        if len(params.nodes) > 8:
            await websocket.send_json({"error": "This demo backend supports up to 8 QAOA nodes", "converged": True})
            return
        async for payload in stream_qaoa_progress(params):
            await websocket.send_json(payload)
            if payload.get("converged"):
                break
    except WebSocketDisconnect:
        return
    except Exception as exc:
        await websocket.send_json({"error": str(exc), "converged": True})
    finally:
        await websocket.close()


@app.post("/api/codegen/{framework}")
async def codegen(framework: str, payload: CodegenRequest):
    fw = framework.strip().lower()
    if fw == "qiskit":
        code = generate_qiskit_code(payload.circuit, payload.n_qubits)
    elif fw in {"mindquantum", "mind"}:
        code = generate_mindquantum_code(payload.circuit, payload.n_qubits)
    else:
        raise HTTPException(status_code=404, detail=f"Unsupported framework: {framework}")
    return {"code": code}


@app.post("/api/circuits")
async def save_circuit(payload: SaveCircuitRequest):
    circuit_id = store.save_circuit(
        name=payload.name,
        circuit=[gate.model_dump() for gate in payload.circuit],
        n_qubits=payload.n_qubits,
    )
    return {"id": circuit_id}


@app.get("/api/circuits/library")
async def get_library():
    return LIBRARY_CIRCUITS


@app.get("/api/circuits/{circuit_id}")
async def load_circuit(circuit_id: str):
    item = store.load_circuit(circuit_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Circuit not found")
    return item


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/api/auth/register", response_model=LoginResponse)
async def register(payload: RegisterRequest):
    pw_hash = hash_pw(payload.password)
    ok = users.create_user(payload.username, pw_hash, payload.email)
    if not ok:
        raise HTTPException(status_code=409, detail="Username already taken")
    token = make_token(payload.username)
    return LoginResponse(token=token, username=payload.username)


@app.post("/api/auth/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    user = users.get_user(payload.username)
    if user is None:
        raise HTTPException(status_code=401, detail="Username not found")
    if not verify_pw(payload.password, user["pw_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect password")
    token = make_token(payload.username)
    return LoginResponse(token=token, username=payload.username)


# ── User circuits ──────────────────────────────────────────────────────────────

@app.get("/api/user/circuits")
async def list_user_circuits(username: str = Depends(require_user)):
    return users.list_circuits(username)


@app.post("/api/user/circuits", status_code=201)
async def save_user_circuit(payload: SaveUserCircuitRequest, username: str = Depends(require_user)):
    cid = users.save_circuit(
        username=username,
        name=payload.name,
        circuit_json=payload.circ,
        n_qubits=payload.qubits,
        gate_count=payload.gateCount,
    )
    return {"id": cid}


@app.delete("/api/user/circuits/{circuit_id}", status_code=204)
async def delete_user_circuit(circuit_id: str, username: str = Depends(require_user)):
    deleted = users.delete_circuit(username, circuit_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Circuit not found")


# ── User history ───────────────────────────────────────────────────────────────

@app.get("/api/user/history")
async def list_user_history(username: str = Depends(require_user)):
    return users.list_history(username)


@app.post("/api/user/history", status_code=201)
async def add_user_history(payload: AddHistoryRequest, username: str = Depends(require_user)):
    users.add_history(username, payload.ts, payload.desc, payload.type)
    return {"ok": True}


@app.post("/api/ai-optimize")
async def ai_optimize(request: Request, payload: AiOptimizeRequest):
    if not _ai_rate_ok(request):
        raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试")
    # ★ 这里加入了 await，使得长时的 API 调用彻底不阻塞主事件循环
    result = await optimize_circuit(payload.circ, payload.n_qubits, payload.question, payload.errors)
    return JSONResponse(result)


@app.get("/")
async def root():
    return {
        "name": APP_TITLE,
        "docs": "/docs",
        "health": "/api/health",
    }