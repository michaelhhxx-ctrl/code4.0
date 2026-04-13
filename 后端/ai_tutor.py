from __future__ import annotations

import json
import os
import re
import asyncio
from typing import AsyncIterator

import openai

# 从环境变量安全获取 API Key，不再硬编码
_api_key = os.environ.get("DEEPSEEK_API_KEY")
if not _api_key:
    print("WARNING: DEEPSEEK_API_KEY not found in environment variables.")

_base_url = "https://api.deepseek.com/v1"
_model_name = "deepseek-chat"
openai.api_key = _api_key
openai.api_base = _base_url


def _has_chinese(text: str) -> bool:
    return bool(re.search(r"[\u4e00-\u9fff]", text))


def _circuit_summary(circuit: dict) -> dict:
    gates = circuit.get("gates") or []
    n_qubits = int(circuit.get("n_qubits") or 0)
    last_gate = circuit.get("last_gate") or "None"
    entangling = sum(1 for gate in gates if gate.get("g") in {"CNOT", "CZ", "SWAP"})
    rotations = sum(1 for gate in gates if gate.get("g") in {"Rx", "Ry", "Rz"})
    measures = sum(1 for gate in gates if gate.get("g") == "M")
    return {
        "gate_count": len(gates),
        "n_qubits": n_qubits,
        "last_gate": last_gate,
        "entangling": entangling,
        "rotations": rotations,
        "measures": measures,
    }


def _build_system_prompt(circuit: dict, zh: bool) -> str:
    s = _circuit_summary(circuit)
    lang_rule = (
        "请用中文回答，语言简洁专业，适合正在学习量子计算的学生。"
        if zh
        else "Answer in English, concise and professional, suitable for quantum computing learners."
    )
    return f”””你是面向《人工智能通识》与《大学计算机基础》课程的AI教学助手。你的任务是用通俗易懂的语言，向弱数学基础的大一新生解释量子计算概念。解释时优先使用生活类比（如抛硬币、双胞胎感应等），绝对避免出现复杂的数学公式。当涉及VQE或QAOA时，必须将其定位为”量子版的AI参数优化和组合优化”来解释。

当前用户的量子线路状态如下：
- 量子比特数：{s['n_qubits']}
- 门总数：{s['gate_count']}
- 最后添加的门：{s['last_gate']}
- 纠缠门（CNOT/CZ/SWAP）数量：{s['entangling']}
- 参数化旋转门（Rx/Ry/Rz）数量：{s['rotations']}
- 测量门数量：{s['measures']}

回答规则：
1. {lang_rule}
2. 回答要结合上面的线路状态给出具体建议，不要泛泛而谈。
4. 禁止使用 Markdown 语法（不要用 **加粗**、# 标题、- 列表等），只输出纯文本和 HTML span 标签。
5. 回答控制在 150 字以内，聚焦用户问题。
6. 专有名词默认全部使用中文（例如”量子比特””受控非门””布洛赫球”）；确实需要英文时，格式必须为”中文（英文）”。
7. 面向弱数学基础的大一新生：绝对不使用数学公式和符号；优先使用生活类比（如硬币、双胞胎、图书馆找书等）解释概念；多用短句，每次最多给 2-3 个关键点，并说明”这一步在做什么”。
8. 回答必须包含且仅包含两个小段：第一段以”直接答案：”开头；第二段以”分析与理由：”开头。
9. 允许回答闲聊和量子计算以外的话题；非量子话题也按初学者风格简洁回答，不要拒答。
“””


async def stream_sse_chunks(message: str, circuit: dict) -> AsyncIterator[bytes]:
    msg = (message or "").strip()
    zh = _has_chinese(msg)
    system_prompt = _build_system_prompt(circuit or {}, zh)
    try:
        response = await openai.ChatCompletion.acreate(
            model=_model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": msg},
            ],
            stream=True,
            temperature=0.7,
            max_tokens=400,
        )
        async for event in response:
            choices = event.get("choices") or []
            delta = choices[0].get("delta", {}) if choices else {}
            content = delta.get("content")
            if content:
                payload = json.dumps({"chunk": content}, ensure_ascii=False)
                yield f"data: {payload}\n\n".encode("utf-8")
    except Exception as exc:
        payload = json.dumps({"chunk": f"AI 服务暂时不可用：{exc}"}, ensure_ascii=False)
        yield f"data: {payload}\n\n".encode("utf-8")
    finally:
        yield b"data: [DONE]\n\n"


def _circ_to_description(circ: list, n_qubits: int) -> str:
    """将前端 S.circ 二维数组转换为 AI 可读的门列表描述"""
    gates = []
    for q_idx, row in enumerate(circ):
        if not isinstance(row, list):
            continue
        for s_idx, cell in enumerate(row):
            if not cell or not isinstance(cell, dict):
                continue
            role = cell.get("role")
            if role == "tgt":
                continue  # ctrl 部分已包含完整信息，跳过 tgt
            g = cell.get("g", "?")
            p = cell.get("p")
            if role == "ctrl":
                tgt = cell.get("tgt", "?")
                gates.append(f"步骤{s_idx}: {g} q{q_idx}→q{tgt}")
            elif p is not None:
                gates.append(f"步骤{s_idx}: {g}({p}°) q{q_idx}")
            else:
                gates.append(f"步骤{s_idx}: {g} q{q_idx}")
    return "\n".join(gates) if gates else "（空电路，无任何门）"


# ★ 改为 async def，以便内部使用 await
async def optimize_circuit(circ: list, n_qubits: int, question: str | None = None, errors: list[str] | None = None) -> dict:
    """
    两阶段电路分析：
    阶段1 — 确定性检测（circuit_checker）：代码找到问题 → changes 由代码生成，AI 只写解释
    阶段2 — AI 建议（仅 add）：未发现结构问题 → AI 判断是否缺少关键门
    降级 — checker 不可用时走完整 AI 分析（remove/set_param/add 均允许，含比例守卫）
    """
    # ── 阶段1：确定性检测 ──────────────────────────────────────────────────────
    checker_available = True
    issues: list[dict] = []
    try:
        from circuit_checker import find_issues
        issues = find_issues(circ, n_qubits)
    except Exception:
        checker_available = False  # checker 不可用，稍后走完整 AI 分析

    # checker 不可用时，走完整 AI 分析（保留 remove/set_param 能力）
    if not checker_available:
        return await _fallback_ai_optimize(circ, n_qubits, question)

    if issues:
        # changes 完全由代码生成，可靠性 100%；AI 只负责解释
        all_changes: list[dict] = []
        for iss in issues:
            all_changes.extend(iss["changes"])
        explanation = await _explain_issues(issues, circ, n_qubits)
        return {
            "answer": explanation,
            "proposed_action": {
                "type": "optimize_circuit",
                "source": "deterministic",   # 前端据此跳过比例守卫
                "changes": all_changes,
            },
        }

    # ── 阶段2：无确定性问题，AI 仅建议 add ────────────────────────────────────
    return await _suggest_additions(circ, n_qubits, question)


# ★ 改为 async def 并使用 asyncio.to_thread 包装同步网络调用
async def _explain_issues(issues: list[dict], circ: list, n_qubits: int) -> str:
    """请 AI 用自然语言向初学者解释代码已检测到的问题，不生成 changes。"""
    n_steps = len(circ[0]) if circ and isinstance(circ[0], list) else 8
    circuit_desc = _circ_to_description(circ, n_qubits)
    issues_text = "\n".join(f"{i + 1}. {iss['detail']}" for i, iss in enumerate(issues))

    system = (
        "你是面向《人工智能通识》与《大学计算机基础》课程的AI教学助手（量子线路辅助分析）。"
        "代码已自动检测到以下电路问题并生成了修改方案。"
        "请用简洁中文、通俗语言向大一新生解释这些问题的含义及修改意义，优先使用生活类比，绝对不使用数学公式。"
        "要求：不超过 150 字，只输出纯文本，不要输出 JSON，不要重新编号列举，直接说明原因和意义。"
    )
    user = (
        f"当前电路（{n_qubits} 个量子比特，{n_steps} 步骤）：\n"
        f"{circuit_desc}\n\n"
        f"检测到的问题：\n{issues_text}"
    )
    fallback = f"检测到 {len(issues)} 处可优化的结构问题，已生成修改方案。"
    try:
        # 使用 to_thread 避免阻塞事件循环
        resp = await asyncio.to_thread(
            openai.ChatCompletion.create,
            model=_model_name,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            temperature=0.3,
            max_tokens=300,
        )
        return (resp["choices"][0]["message"]["content"] or "").strip() or fallback
    except Exception:
        return fallback


# ★ 改为 async def 并使用 asyncio.to_thread
async def _suggest_additions(circ: list, n_qubits: int, question: str | None) -> dict:
    """
    确定性检测未发现问题时，请 AI 判断是否缺少关键的单量子比特门。
    只允许 add 操作，remove 和 set_param 由确定性规则覆盖，此处禁用。
    """
    n_steps = len(circ[0]) if circ and isinstance(circ[0], list) else 8
    circuit_desc = _circ_to_description(circ, n_qubits)
    extra = f"\n用户追加问题：{question}" if question else ""

    system_prompt = (
        "你是面向《人工智能通识》与《大学计算机基础》课程的AI教学助手（量子线路分析模式）。代码已检查该电路，未发现结构性问题（自逆门对、恒等旋转门、参数偏差、可合并旋转门）。\n"
        "请仅判断线路是否明显缺少某个单量子比特门以构成更完整的标准量子算法结构。\n"
        "若有，以 JSON 格式返回 add 建议；若无，proposed_action 设为 null。\n"
        "只输出 JSON，不输出其他文字。\n\n"
        "JSON 格式（有建议时）：\n"
        '{"answer":"中文说明150字以内","proposed_action":{"type":"optimize_circuit","source":"ai",'
        '"changes":[{"op":"add","qubit":0,"step":3,"g":"H"}]}}\n'
        "JSON 格式（无建议时）：\n"
        '{"answer":"线路结构已完整，未发现需要补充的门","proposed_action":null}\n\n'
        "严格限制：\n"
        f"- qubit 必须在 0 到 {n_qubits - 1} 之间\n"
        f"- step 必须在 0 到 {n_steps - 1} 之间\n"
        "- 只允许 \"add\" 操作，禁止 \"remove\" 和 \"set_param\"\n"
        "- \"add\" 的 g 只能是：H, X, Y, Z, S, T, Rx, Ry, Rz（不允许 CNOT/CZ/SWAP）\n"
        "- Rx/Ry/Rz 必须带 p 字段（角度，单位度）\n"
        "- add 的目标位置必须是空槽；若无空槽可用，proposed_action 设为 null\n"
    )
    user_msg = (
        f"当前电路（{n_qubits} 个量子比特，步骤数 {n_steps}）：\n"
        f"{circuit_desc}"
        f"{extra}"
    )

    fallback = {"answer": "AI 优化服务暂时不可用，请稍后重试。", "proposed_action": None}
    raw = ""
    try:
        # 使用 to_thread 避免阻塞事件循环
        resp = await asyncio.to_thread(
            openai.ChatCompletion.create,
            model=_model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_msg},
            ],
            temperature=0,
            max_tokens=400,
        )
        raw = (resp["choices"][0]["message"]["content"] or "").strip()
    except Exception:
        return fallback

    # ── 解析（单出口，覆盖两种格式）──
    parsed = None
    try:
        candidate = json.loads(raw)
        if isinstance(candidate, dict):
            parsed = candidate
    except (json.JSONDecodeError, ValueError):
        pass
    if parsed is None:
        m = re.search(r'\{[\s\S]*\}', raw)
        if m:
            try:
                candidate = json.loads(m.group())
                if isinstance(candidate, dict):
                    parsed = candidate
            except (json.JSONDecodeError, ValueError):
                pass
    if parsed is None:
        return {"answer": raw or "无法解析 AI 回复。", "proposed_action": None}

    # ── 安全过滤：只保留 add 操作，确保 AI 不会越权 remove/set_param ──
    pa = parsed.get("proposed_action")
    if pa and isinstance(pa.get("changes"), list):
        safe = [ch for ch in pa["changes"]
                if isinstance(ch, dict) and ch.get("op") == "add"]
        if not safe:
            parsed["proposed_action"] = None
        else:
            pa["changes"] = safe
            pa["source"] = "ai"   # 确保 source 字段存在
    elif pa:
        # pa 存在但无 changes 键，无法验证，清除以防非法操作透传
        parsed["proposed_action"] = None

    return parsed


# ★ 改为 async def 并使用 asyncio.to_thread
async def _fallback_ai_optimize(circ: list, n_qubits: int, question: str | None) -> dict:
    """
    circuit_checker 不可用时的完整 AI 分析降级路径。
    允许 remove / set_param / add，含后端比例守卫（remove 超过总门数 50% 则取消）。
    前端仍会执行守卫3（40%）和守卫4（回滚），因为 source 为 'ai'。
    """
    n_steps = len(circ[0]) if circ and isinstance(circ[0], list) else 8
    circuit_desc = _circ_to_description(circ, n_qubits)
    extra = f"\n用户追加问题：{question}" if question else ""

    system_prompt = (
        "你是面向《人工智能通识》与《大学计算机基础》课程的AI教学助手（量子线路分析模式）。请检查给定量子电路中是否存在有明确量子物理依据的问题，并给出修改建议。\n"
        "你必须严格以JSON格式回答，不得包含任何额外文字，只输出JSON。\n"
        "JSON格式要求：\n"
        '{\n'
        '  "answer": "中文说明，150字以内，必须说明每条change的具体理由",\n'
        '  "proposed_action": {"type":"optimize_circuit","source":"ai","changes":[\n'
        '    {"op":"set_param","qubit":2,"step":1,"p":90.0},\n'
        '    {"op":"add","qubit":1,"step":3,"g":"H"},\n'
        '    {"op":"remove","qubit":0,"step":2}\n'
        '  ]}\n'
        '}\n'
        "未发现问题时，proposed_action 必须设为 null。\n\n"
        "【允许修改的条件，必须满足其一】：\n"
        "1. remove：同一量子比特上两门之间无其他门的相同自逆门对"
        "（H…H/X…X/Y…Y/Z…Z/CNOT…CNOT同ctrl+tgt），需将两个都remove；"
        "或旋转角度为0的旋转门（Rx(0)/Ry(0)/Rz(0)等效恒等）\n"
        "2. set_param：旋转门角度与最近标准角（45/90/135/180/270/315°）偏差超过0°但不超过5°；"
        "或相邻同轴旋转门（Rx+Rx/Ry+Ry/Rz+Rz）可合并为单个门\n"
        "3. add：线路明显缺少某个完整标准结构所需的单量子比特门，且能在answer中说明具体理由\n\n"
        "【禁止的行为】：\n"
        "- 禁止因验证提示或错误而remove门\n"
        "- 禁止以'简化'或'减少门数'为由remove门\n"
        "- 找不到符合上述条件的修改点时，必须返回proposed_action: null\n\n"
        "严格参数限制：\n"
        f"- qubit 必须在 0 到 {n_qubits - 1} 之间\n"
        f"- step 必须在 0 到 {n_steps - 1} 之间\n"
        '- op 只能是 "remove"、"add"、"set_param" 之一\n'
        '- "add" 的 g 只能是：H, X, Y, Z, S, T, Rx, Ry, Rz（不允许 CNOT/CZ/SWAP）\n'
        '- "add" 中 Rx/Ry/Rz 必须带 p 字段（角度，单位度），其他门不需要 p\n'
        '- "remove" 会自动处理双量子比特门的配对删除，无需手动指定配对\n'
    )
    user_msg = (
        f"当前电路（{n_qubits} 个量子比特，步骤数 {n_steps}）：\n"
        f"{circuit_desc}"
        f"{extra}"
    )

    fallback = {"answer": "AI 优化服务暂时不可用，请稍后重试。", "proposed_action": None}
    raw = ""
    try:
        # 使用 to_thread 避免阻塞事件循环
        resp = await asyncio.to_thread(
            openai.ChatCompletion.create,
            model=_model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_msg},
            ],
            temperature=0,
            max_tokens=600,
        )
        raw = (resp["choices"][0]["message"]["content"] or "").strip()
    except Exception:
        return fallback

    # ── 解析（单出口，覆盖两种格式）──
    parsed = None
    try:
        candidate = json.loads(raw)
        if isinstance(candidate, dict):
            parsed = candidate
    except (json.JSONDecodeError, ValueError):
        pass
    if parsed is None:
        m = re.search(r'\{[\s\S]*\}', raw)
        if m:
            try:
                candidate = json.loads(m.group())
                if isinstance(candidate, dict):
                    parsed = candidate
            except (json.JSONDecodeError, ValueError):
                pass
    if parsed is None:
        return {"answer": raw or "无法解析 AI 回复。", "proposed_action": None}

    # ── 比例守卫：remove 超过总门数 50% 则取消建议 ──
    pa = parsed.get("proposed_action")
    if pa and isinstance(pa.get("changes"), list):
        remove_count = sum(
            1 for ch in pa["changes"]
            if isinstance(ch, dict) and ch.get("op") == "remove"
        )
        total_gates = sum(
            1 for row in circ if isinstance(row, list)
            for cell in row
            if cell and isinstance(cell, dict) and cell.get("role") != "tgt"
        )
        if total_gates > 0 and remove_count > total_gates * 0.5:
            parsed["proposed_action"] = None
            parsed["answer"] = (parsed.get("answer") or "") + "（删除比例过高，已自动取消本次修改建议）"
        else:
            pa["source"] = "ai"  # 确保前端守卫3/4生效（source='ai' 触发比例和回滚守卫）
    elif pa:
        # pa 存在但无 changes 键，无法验证，清除以防非法操作透传
        parsed["proposed_action"] = None

    return parsed