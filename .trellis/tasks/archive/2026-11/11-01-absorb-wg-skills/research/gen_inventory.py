#!/usr/bin/env python3
"""Generate skill -> target doc inventory from the cloned wg-skills repo."""
import os
import sys

ROOT = "/tmp/wg-skills-inspect"


def target(rel: str) -> str:
    p = rel
    if p.startswith("others/"):
        name = p.split("/")[1]
        if name == "electron-native-abi-fix":
            return "frontend/electron.md"
        if name == "skill-auditor":
            return "workflow/writing-skills.md"
        return "others/content-writing.md"
    if p.startswith("vibeCoding/backend/"):
        rest = p[len("vibeCoding/backend/"):]
        if rest.startswith("backend-convention"):
            return "backend/conventions.md"
        if rest.startswith("backend-select") or rest.startswith("database/database-learning"):
            return "backend/tech-selection.md"
        if rest.startswith("crypto"):
            return "backend/crypto.md"
        if rest.startswith("backend-analysis"):
            return "backend/backend-analysis.md"
        if rest.startswith("database/"):
            return "backend/database-design.md"
        if rest.startswith("java/"):
            return "backend/java-springboot.md"
        if rest.startswith("go/"):
            return "backend/go.md"
        if rest.startswith("nodejs/") or rest.startswith("rust/"):
            return "backend/nodejs-rust.md"
        if rest.startswith("python/"):
            return "backend/python-fastapi.md"
        return "backend/UNKNOWN:" + rel
    if p.startswith("vibeCoding/frontend/"):
        rest = p[len("vibeCoding/frontend/"):]
        if rest.startswith("frontend-request"):
            return "frontend/shared-request-layer.md"
        if rest.startswith(("frontend-code-doctor", "frontend-style-harmonizer", "frontend-ui-foundry")):
            return "frontend/code-quality.md"
        if rest.startswith(("frontend-icon", "icon-image-catch", "image-forge", "html/")):
            return "frontend/assets-and-icons.md"
        if rest.startswith("react/"):
            return "frontend/react.md"
        if rest.startswith("uniapp/"):
            return "frontend/uniapp.md"
        if rest.startswith("electron/"):
            return "frontend/electron.md"
        if rest.startswith("vue/electron-vue-init"):
            return "frontend/electron.md"
        if rest.startswith("vue/vue-base-skill/vue-complex-skill"):
            return "frontend/vue-complex-scenes.md"
        if rest.startswith("vue/vue-base-skill"):
            return "frontend/vue-core.md"
        if rest.startswith(("vue/vue-style", "vue/vue-theme", "vue/vue-tui")):
            return "frontend/vue-theme-style.md"
        if rest.startswith("vue/nuxt"):
            return "frontend/vue-core.md"
        return "frontend/UNKNOWN:" + rel
    if p.startswith("vibeCoding/super-deploy-skills"):
        return "deploy/deploy-suite.md"
    if p.startswith("vibeCoding/vibecoding-guide-skill"):
        return "workflow/vibecoding-methodology.md"
    return "UNKNOWN:" + rel


def main() -> None:
    skills = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d != ".git"]
        if "SKILL.md" in filenames:
            skills.append(os.path.relpath(dirpath, ROOT))
    skills.sort()
    print(f"TOTAL={len(skills)}")

    groups = {}
    for rel in skills:
        groups.setdefault(target(rel), []).append(rel)

    for k in sorted(groups):
        print(f"\n## {k}  ({len(groups[k])})")
        for rel in groups[k]:
            print(f"- {rel}")

    unknown = {k: v for k, v in groups.items() if "UNKNOWN" in k}
    if unknown:
        print("\n!!! UNKNOWN MAPPINGS")
        for k, v in unknown.items():
            print(f"{k}: {len(v)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
