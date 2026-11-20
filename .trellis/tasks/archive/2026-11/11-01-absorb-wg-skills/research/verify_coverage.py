#!/usr/bin/env python3
"""S5 核对：用源仓库机械重算技能全集，与子代理覆盖清单比对（AC2）。

用法：python3 -I .trellis/tasks/11-01-absorb-wg-skills/research/verify_coverage.py

判定：源技能目录 basename（及去掉 -skill 后缀的变体）出现在任一 coverage-*.md 中即算覆盖。
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

REPO_SRC = Path("/tmp/wg-skills-inspect")
TASK = Path(__file__).resolve().parent.parent
RESEARCH = TASK / "research"


def source_skills() -> list[str]:
    out: list[str] = []
    for dirpath, dirnames, filenames in os.walk(REPO_SRC):
        dirnames[:] = [d for d in dirnames if d != ".git"]
        if "SKILL.md" in filenames:
            out.append(os.path.relpath(dirpath, REPO_SRC))
    return sorted(out)


def main() -> int:
    skills = source_skills()
    print(f"源仓库技能总数: {len(skills)}")
    if len(skills) != 158:
        print(f"⚠️  预期 158，实得 {len(skills)}——源克隆可能不完整")

    cov_files = sorted(RESEARCH.glob("coverage-*.md"))
    if not cov_files:
        print("✗ 未找到任何 coverage-*.md")
        return 1
    text = "\n".join(f.read_text(encoding="utf-8") for f in cov_files)
    print(f"覆盖清单: {', '.join(f.name for f in cov_files)}")

    missing: list[str] = []
    for rel in skills:
        base = os.path.basename(rel)
        cands = {base, base.removesuffix("-skill"), base.removesuffix("-s")}
        if not any(c and c in text for c in cands):
            missing.append(rel)

    if missing:
        print(f"\n✗ 未在覆盖清单中找到 {len(missing)} 个技能：")
        for m in missing:
            print(f"  - {m}")
        return 1

    print(f"\n✓ 全部 {len(skills)} 个技能均在覆盖清单中出现")
    # 顺带统计各清单条目数
    for f in cov_files:
        n = sum(1 for line in f.read_text(encoding="utf-8").splitlines() if line.startswith("- "))
        print(f"  {f.name}: {n} 条")
    return 0


if __name__ == "__main__":
    sys.exit(main())
