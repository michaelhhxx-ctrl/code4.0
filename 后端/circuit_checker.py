from __future__ import annotations

"""
确定性量子电路问题检测器。

四条规则（按 Rx/Ry/Rz 优先级顺序执行）：
  Rule 2  IDENTITY_ROT     — 旋转角等效恒等：Rx(0°)/Rz(360°) 等
  Rule 4  ROTATION_MERGE   — 同轴相邻旋转门合并：Rx(a)+Rx(b)→Rx(a+b)
  Rule 3  PARAM_DEVIATION  — 参数偏离标准角超过 0° 但不超过 5°
  Rule 1  CANCEL_PAIR      — 自逆门对抵消：H-H / X-X / CNOT-CNOT 等

Rx/Ry/Rz 优先级：Rule 2 > Rule 4 > Rule 3
Rule 1 独立，与 Rule 2/3/4 无门类型重叠，最后执行。

注意：系统增量工作，单轮不保证找出所有问题。
例如 H(s1)→Rx(0°)(s2)→H(s3)：本轮只报告 Rx(0°)；
删除后重新检测才会发现 H-H 对。
"""

# ── 常量 ──────────────────────────────────────────────────────────────────────

_ONE_Q_SELF_INVERSE = frozenset({'H', 'X', 'Y', 'Z'})
_TWO_Q_SELF_INVERSE = frozenset({'CNOT', 'CZ', 'SWAP'})
_ROTATION_GATES     = frozenset({'Rx', 'Ry', 'Rz'})

# 标准角集合（0° 和 360° 由 Rule 2 覆盖，不在此列）
_STANDARD_ANGLES = (45.0, 90.0, 135.0, 180.0, 270.0, 315.0)

_IDENTITY_THRESHOLD = 0.01   # 度：|p| ≤ 此值 视为恒等
_DEVIATION_MAX      = 5.0    # 度：偏差不超过此值才触发 Rule 3


# ── 公开接口 ──────────────────────────────────────────────────────────────────

def find_issues(circ: list, n_qubits: int) -> list[dict]:
    """
    对量子电路执行确定性问题检测，返回 issue 列表。

    每个 issue 结构：
        rule   : 'CANCEL_PAIR' | 'IDENTITY_ROT' | 'PARAM_DEVIATION' | 'ROTATION_MERGE'
        gate   : 门名称 (str)
        qubit  : 主量子比特编号 (int)
        step   : 第一个门的步骤索引 (int)
        step2  : 第二个门的步骤索引 (int | None)，CANCEL_PAIR 和 ROTATION_MERGE 使用
        detail : 中文描述 (str)
        changes: 操作列表，格式与 applyChangesToCirc 兼容，可直接使用

    返回空列表表示未发现问题。
    """
    if not isinstance(circ, list) or n_qubits <= 0:
        return []
    n_steps = len(circ[0]) if circ and isinstance(circ[0], list) else 0
    if n_steps == 0:
        return []

    issues: list[dict] = []
    # consumed：已被某条规则消费的槽位，避免同一门被多条规则重复处理
    consumed: set[tuple[int, int]] = set()

    # 严格按优先级顺序执行
    _rule2_identity_rot(circ, n_qubits, n_steps, consumed, issues)
    _rule4_rotation_merge(circ, n_qubits, n_steps, consumed, issues)
    _rule3_param_deviation(circ, n_qubits, n_steps, consumed, issues)
    _rule1_cancel_pair(circ, n_qubits, n_steps, consumed, issues)

    return issues


# ── Rule 2: IDENTITY_ROT ──────────────────────────────────────────────────────

def _rule2_identity_rot(circ, n_qubits, n_steps, consumed, issues):
    """Rx/Ry/Rz 角度等效恒等（≈0° 或 ≈360°），直接删除。"""
    for q in range(n_qubits):
        if not _valid_row(circ, q):
            continue
        for s in range(n_steps):
            if (q, s) in consumed:
                continue
            cell = circ[q][s]
            if not _is_gate(cell):
                continue
            g = cell['g']
            p = cell.get('p')
            if g not in _ROTATION_GATES or p is None:
                continue
            if p <= _IDENTITY_THRESHOLD or p >= 360.0 - _IDENTITY_THRESHOLD:
                consumed.add((q, s))
                label = f'≈0°' if p <= _IDENTITY_THRESHOLD else f'≈360°'
                issues.append(_issue(
                    rule='IDENTITY_ROT',
                    gate=g, qubit=q, step=s, step2=None,
                    detail=(f'q{q} 步骤{s} 的 {g}({p}°) 旋转角{label}，'
                            f'等效恒等操作，对电路无贡献，建议删除'),
                    changes=[_rm(q, s)],
                ))


# ── Rule 4: ROTATION_MERGE ────────────────────────────────────────────────────

def _rule4_rotation_merge(circ, n_qubits, n_steps, consumed, issues):
    """
    同一量子比特上相邻同轴旋转门合并：Rx(a)·Rx(b) = Rx(a+b)。
    两门之间无任何其他门（空槽不算）。
    合并结果若≈0° → remove_pair；否则 set_param 第一个 + remove 第二个。
    """
    for q in range(n_qubits):
        if not _valid_row(circ, q):
            continue
        s = 0
        while s < n_steps:
            if (q, s) in consumed:
                s += 1
                continue
            cell1 = circ[q][s]
            if not _is_gate(cell1) or cell1['g'] not in _ROTATION_GATES:
                s += 1
                continue
            g1 = cell1['g']
            p1 = cell1.get('p')
            if p1 is None:
                s += 1
                continue

            # 找同一量子比特上下一个非空槽
            s2 = _next_occupied(circ[q], s + 1, n_steps)
            if s2 is None or (q, s2) in consumed:
                s += 1
                continue
            cell2 = circ[q][s2]
            if not _is_gate(cell2) or cell2['g'] != g1:
                s += 1
                continue
            p2 = cell2.get('p')
            if p2 is None:
                s += 1
                continue

            merged = (p1 + p2) % 360.0
            consumed.add((q, s))
            consumed.add((q, s2))

            if merged <= _IDENTITY_THRESHOLD or merged >= 360.0 - _IDENTITY_THRESHOLD:
                # 合并结果等效恒等，两门均删除
                issues.append(_issue(
                    rule='ROTATION_MERGE',
                    gate=g1, qubit=q, step=s, step2=s2,
                    detail=(f'q{q} 步骤{s} 的{g1}({p1}°) 与步骤{s2} 的{g1}({p2}°) '
                            f'合并后 {merged:.1f}°≈0°，等效恒等，两门均可删除'),
                    changes=[_rm(q, s), _rm(q, s2)],
                ))
            else:
                # 合并为单个旋转门
                issues.append(_issue(
                    rule='ROTATION_MERGE',
                    gate=g1, qubit=q, step=s, step2=s2,
                    detail=(f'q{q} 步骤{s} 的{g1}({p1}°) 与步骤{s2} 的{g1}({p2}°) '
                            f'可合并为 {g1}({merged:.1f}°)，减少一个门'),
                    changes=[_sp(q, s, round(merged, 1)), _rm(q, s2)],
                ))
            s = s2 + 1  # 跳过已配对的 s2，继续向后


# ── Rule 3: PARAM_DEVIATION ───────────────────────────────────────────────────

def _rule3_param_deviation(circ, n_qubits, n_steps, consumed, issues):
    """
    孤立旋转门参数偏离最近标准角（45/90/135/180/270/315°）超过 0° 但不超过 5°。
    刻意留空区间（视为用户有意输入）：(0.01°,40°)/(50°,85°)/(95°,130°)/
    (140°,175°)/(185°,265°)/(275°,310°)/(320°,359.99°)。
    """
    for q in range(n_qubits):
        if not _valid_row(circ, q):
            continue
        for s in range(n_steps):
            if (q, s) in consumed:
                continue
            cell = circ[q][s]
            if not _is_gate(cell):
                continue
            g = cell['g']
            p = cell.get('p')
            if g not in _ROTATION_GATES or p is None:
                continue
            nearest = min(_STANDARD_ANGLES, key=lambda a: abs(p - a))
            deviation = abs(p - nearest)
            if 0.0 < deviation <= _DEVIATION_MAX:
                consumed.add((q, s))
                issues.append(_issue(
                    rule='PARAM_DEVIATION',
                    gate=g, qubit=q, step=s, step2=None,
                    detail=(f'q{q} 步骤{s} 的{g}({p}°) 偏离标准角 {nearest:.0f}° '
                            f'约 {deviation:.1f}°，建议调整为 {nearest:.0f}°'),
                    changes=[_sp(q, s, float(nearest))],
                ))


# ── Rule 1: CANCEL_PAIR ───────────────────────────────────────────────────────

def _rule1_cancel_pair(circ, n_qubits, n_steps, consumed, issues):
    """自逆门对抵消，分单比特和双比特两类处理。"""
    _cancel_single_qubit(circ, n_qubits, n_steps, consumed, issues)
    _cancel_two_qubit(circ, n_qubits, n_steps, consumed, issues)


def _cancel_single_qubit(circ, n_qubits, n_steps, consumed, issues):
    """
    单量子比特自逆门对（H/X/Y/Z）：
    同一量子比特上两门之间无其他门（跳过空槽），贪心左到右匹配。
    """
    for q in range(n_qubits):
        if not _valid_row(circ, q):
            continue
        s = 0
        while s < n_steps:
            if (q, s) in consumed:
                s += 1
                continue
            cell1 = circ[q][s]
            if not _is_gate(cell1) or cell1['g'] not in _ONE_Q_SELF_INVERSE:
                s += 1
                continue
            g1 = cell1['g']

            # 找同一量子比特上下一个非空槽
            s2 = _next_occupied(circ[q], s + 1, n_steps)
            if s2 is None or (q, s2) in consumed:
                s += 1
                continue
            cell2 = circ[q][s2]
            if not _is_gate(cell2) or cell2['g'] != g1:
                s += 1
                continue

            consumed.add((q, s))
            consumed.add((q, s2))
            issues.append(_issue(
                rule='CANCEL_PAIR',
                gate=g1, qubit=q, step=s, step2=s2,
                detail=f'q{q} 步骤{s} 和步骤{s2} 的两个 {g1} 门互相抵消（{g1}²=I）',
                changes=[_rm(q, s), _rm(q, s2)],
            ))
            s = s2 + 1


def _cancel_two_qubit(circ, n_qubits, n_steps, consumed, issues):
    """
    双量子比特自逆门对（CNOT/CZ/SWAP）：
    CNOT 使用有序对匹配（方向不同不等价）；
    CZ/SWAP 使用无序对匹配（对称门，方向不影响等价性）。
    两门之间两个量子比特上均无其他门。
    只扫描 ctrl 槽以避免重复计数。
    """
    from collections import defaultdict

    # 按 key 收集所有 ctrl 槽
    groups: dict = defaultdict(list)
    for q in range(n_qubits):
        if not _valid_row(circ, q):
            continue
        for s in range(n_steps):
            if (q, s) in consumed:
                continue
            cell = circ[q][s]
            if not _is_gate(cell) or cell.get('role') != 'ctrl':
                continue
            g = cell['g']
            if g not in _TWO_Q_SELF_INVERSE:
                continue
            tgt = cell.get('tgt')
            if tgt is None:
                continue
            # CNOT：有序对；CZ/SWAP：无序对（对称）
            key = (g, q, tgt) if g == 'CNOT' else (g, min(q, tgt), max(q, tgt))
            groups[key].append({'ctrl': q, 'tgt': tgt, 'step': s})

    for key, instances in groups.items():
        g = key[0]
        instances.sort(key=lambda x: x['step'])
        used_idx: set[int] = set()
        i = 0
        while i < len(instances):
            if i in used_idx:
                i += 1
                continue
            inst1 = instances[i]
            c1, t1, s1 = inst1['ctrl'], inst1['tgt'], inst1['step']
            if (c1, s1) in consumed or (t1, s1) in consumed:
                i += 1
                continue

            for j in range(i + 1, len(instances)):
                if j in used_idx:
                    continue
                inst2 = instances[j]
                c2, t2, s2 = inst2['ctrl'], inst2['tgt'], inst2['step']
                if (c2, s2) in consumed or (t2, s2) in consumed:
                    continue
                # 两个量子比特上 s1~s2 之间路径全空
                if not _clear_between(circ, {c1, t1}, s1, s2, n_steps):
                    continue

                # 找到配对
                used_idx.add(i)
                used_idx.add(j)
                for qx, sx in [(c1, s1), (t1, s1), (c2, s2), (t2, s2)]:
                    consumed.add((qx, sx))

                issues.append(_issue(
                    rule='CANCEL_PAIR',
                    gate=g, qubit=c1, step=s1, step2=s2,
                    detail=(f'q{c1}→q{t1} 步骤{s1} 和步骤{s2} 的两个 {g} 门互相抵消（{g}²=I），'
                            f'两者之间两个量子比特上无其他门'),
                    changes=[_rm(c1, s1), _rm(c2, s2)],
                ))
                break

            i += 1


# ── 内部工具函数 ──────────────────────────────────────────────────────────────

def _valid_row(circ: list, q: int) -> bool:
    return q < len(circ) and isinstance(circ[q], list)


def _is_gate(cell) -> bool:
    return bool(cell and isinstance(cell, dict) and cell.get('g'))


def _next_occupied(row: list, start: int, n_steps: int):
    """返回 row 中从 start 开始第一个非 null 槽的索引，无则返回 None。"""
    for s in range(start, n_steps):
        if row[s]:
            return s
    return None


def _clear_between(circ: list, qubits: set, s1: int, s2: int, n_steps: int) -> bool:
    """检查 s1 与 s2 之间（不含两端），指定量子比特上是否全为空。"""
    for s in range(s1 + 1, s2):
        for q in qubits:
            if _valid_row(circ, q) and circ[q][s]:
                return False
    return True


def _issue(*, rule, gate, qubit, step, step2, detail, changes) -> dict:
    return {
        'rule': rule, 'gate': gate, 'qubit': qubit,
        'step': step, 'step2': step2,
        'detail': detail, 'changes': changes,
    }


def _rm(qubit: int, step: int) -> dict:
    """生成 remove 操作，格式与前端 applyChangesToCirc 兼容。"""
    return {'op': 'remove', 'qubit': qubit, 'step': step, 'p': None}


def _sp(qubit: int, step: int, p: float) -> dict:
    """生成 set_param 操作，格式与前端 applyChangesToCirc 兼容。"""
    return {'op': 'set_param', 'qubit': qubit, 'step': step, 'p': p}
