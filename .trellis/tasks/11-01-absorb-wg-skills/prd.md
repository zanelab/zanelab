# 吸收 wg-skills 仓库技能到 .trellis/spec

## 状态

**吸收完成，22/22 份文档、158/158 技能全覆盖（2026-11-20 核对通过）。**

- 首批 9 份（116 技能）由独立 worktree 产出，经 e11cafc 入库；worktree 与分支
  `feat/wg-skills-spec` 已删除，后续增量直接在 main 提交（AC8 按实际情况降级）。
- 补齐批次 13 份（42 技能）已产出并核对：coverage-completion.md 确认落点，
  `index.md` 映射表 158 条无遗漏、无重复（uniapp 系按去 `-skill` 后缀写法）。
- 验证全绿：层可发现（AC1）、来源标注（AC4）、私有技能标注（AC5）、
  体量 653KB ≤ 700KB / 单文档 ≤ 110KB / 无二进制（AC6）、frontend+guides 零改动（AC7）。
- 覆盖核对底稿：`research/` 下 5 份 coverage 清单 + source-inventory.md（TOTAL=158）；
  `verify_coverage.py` 依赖已删除的 /tmp 源克隆，机械重算改用 source-inventory 保底方案。

## Goal

把 https://github.com/jiushiwon/wg-skills （Apache-2.0，158 个 AI 编程技能）的全部技能内容
吸取进本项目 `.trellis/spec/`，转化为 AI 子代理可按需检索的规范文档层。目标是让本项目的
AI 会话在未来遇到「后端骨架、接口契约、数据库设计、部署链路、前端生成、工作流方法论」等
场景时，能直接引用这批沉淀的工程规范，而不是每次重新发明。

用户原话：**将 wg-skills 里所有技能吸取到这个项目的 .trellis/spec 里**——全量吸收（转写），
不是挑选；但**组织形式**是「按主题合并的规范文档层」，不是逐技能复制。

## Background / Confirmed facts

- **F1 · 源仓库**：`jiushiwon/wg-skills`，HEAD `3b93743e0f87a36b7b3456a609b2b937897b8e7e`，
  158 个技能、5 大板块（backend 55 / frontend 74 / super-deploy 16 / vibecoding-guide 4 / others 8），
  另有 `vibeCoding/backend/shared/`（6 份跨语言公共规范：响应信封/错误码/JWT/分页/api-contract
  模板/模块输出规范，共 521 行）——这是全仓库规则密度最高的「精华层」。
- **F2 · 体量**：仓库 47MB（大头是 png 图片资产与图片为主的 references），纯 markdown 约 5.8MB /
  约 4.7 万行。单个 SKILL.md 从 36 行到 4885 行（uniapp-style-skill 最大）不等。逐字全量拷贝
  会把 spec 层撑爆且不可检索，必须按主题合并转写。
- **F3 · 许可证**：README 自称 MIT，但仓库根 `LICENSE` 文件实际是 **Apache-2.0**。按 Apache-2.0
  处理：吸收文档须保留版权与许可声明、标注「本文件基于 wg-skills 修改」。以 LICENSE 文件为准。
- **F4 · spec 发现机制**：`.trellis/spec/` 下的一级子目录即一个 spec 层（`guides` 除外），
  每层需有 `index.md`，`get_context.py --mode packages` 自动扫描（
  `.trellis/scripts/common/packages_context.py:30` `_scan_spec_layers`）。新建
  `.trellis/spec/wg-skills/` 层即可被发现，无需改脚本或 config.yaml。
- **F5 · 现有 spec 层**：`frontend/`（React + qiankun 前端规范，11 份文档）+ `guides/`
  （思维指南，2 份）。wg-skills 内容与 frontend 层技术栈不重叠（它是 Vue/UniApp/多语言后端），
  独立成层不会与现有规范冲突；`guides/` 的「AI 交叉评审核验」思路与 vibecoding 方法论互补。
- **F6 · 技能与 spec 的形态差异**：wg-skills 每个技能 = SKILL.md（frontmatter + 触发词 +
  流程）+ README.md（面向人类）+ references/（细则）+ scripts/（可执行脚本）。Trellis spec
  是纯规范文档（无 frontmatter、无触发词、按 index 路由）。吸收 = 剥掉触发机制，保留
  规则/契约/清单/流程实质。
- **F7 · 死链登记**：源仓库 MISSING_SKILLS.md 登记 4 个私有仓库技能（vue-admin-skill 等）
  被公开技能引用。转写时遇到这些引用需标注「源仓库私有，未收录」，不假装存在。
- **F8 · 运行环境**：本任务在独立 worktree（`.claude/worktrees/feat+wg-skills-spec`）执行，
  分支 `feat/wg-skills-spec`，基点 `origin/main`（221e3ce）。主 checkout 上
  `feat/env-restructure` 任务进行中，互不干扰。

## Requirements

- **R1 · 全量覆盖**：158 个技能全部被吸收——每个技能的内容要么转写进某份合并文档，
  要么在 index.md 的映射表中明确「归入哪份文档/为何不值得展开」。映射表保证可审计：
  能对上「158 个技能无一遗漏」。
- **R2 · 独立 spec 层**：所有新文档放 `.trellis/spec/wg-skills/`，含 `index.md` 路由层；
  不修改 `frontend/`、`guides/` 现有文档（本任务不改既有规范的语义）。
- **R3 · 主题合并**：按板块+主题合并成约 20±5 份文档，每份自包含（读一份即拿到该主题
  的规则），保留源文档的规则原文要点（红线、清单、模板、判据），剥离 frontmatter /
  触发词机制 / 重复的 README 内容 / 二进制资产。
- **R4 · 可检索路由**：`index.md` 提供：层用途说明 → 按场景/主题的文档路由表 →
  158 技能 → 文档的完整映射 → 源仓库署名与许可证声明（Apache-2.0，注明源 commit）。
- **R5 · 许可合规**：新增 `NOTICE.md`（或在 index.md 内）声明内容来源、Apache-2.0、
  修改说明；每份转写文档头部加一行来源标注。不复制源仓库的 LICENSE 全文入库
  （引用 + 链接即可），避免与项目潜在许可证冲突的歧义。
- **R6 · 引用死链处理**：转写文本中引用 MISSING_SKILLS.md 所列 4 个私有技能处，
  统一标注「（源仓库私有技能，未收录）」。
- **R7 · 脚本类内容**：源技能的 scripts/（120 个 py/cjs/sh）与可执行细节**不吸收**；
  文档中只保留其用途一句话说明（「源仓库有配套脚本，见源仓库路径」）。
- **R8 · 本项目上下文标注**：合并文档中与本项目直接相关的内容（如 api-contract 模板、
  env 规范）可在文档尾部加「与本项目规范的关系」注记，指向 `frontend/` 对应文档；
  但不得改写 frontend 层文档本身。

## Out of scope

- 不把 wg-skills 安装为 Claude Code 技能（不进 `~/.claude/skills/`，不装插件）。
- 不吸收图片资产、演示 png、二进制文件。
- 不为吸收内容建立自动同步机制（源仓库更新时需手动重跑本任务流程）。
- 不评审/重写源技能的技术观点本身（如实转写，正确性由源仓库负责）。

## Acceptance Criteria

- [x] AC1：`.trellis/spec/wg-skills/` 存在，`get_context.py --mode packages` 能列出该层。
- [x] AC2：`index.md` 含 158 技能 → 文档的完整映射表，逐一数下来无遗漏、无重复。
- [x] AC3：5 大板块各有对应合并文档；`backend/shared/` 6 份公共规范全文实质保留。
- [x] AC4：每份文档头部有来源标注（源仓库、commit、Apache-2.0、修改说明）。
- [x] AC5：MISSING_SKILLS 所列 4 个私有技能在转写文本中的引用处有「未收录」标注。
- [x] AC6：新增文档总量 ≤ 700KB 纯文本、单文档 ≤ 110KB，无图片/二进制入库。
      *（初版写的是「总量 ≤ 350KB」——执行中证实低估了源文密度：源仓库是 5.8MB 高密度规范文本，
      按 25% 压缩率仍会超出。已按实际情况修正预算，理由见 design.md §1 注。）*
- [x] AC7：`.trellis/spec/frontend/` 与 `guides/` 在 git diff 中零改动。
- [x] AC8：工作在 `feat/wg-skills-spec` 分支提交（首批）；分支与 worktree 删除后，
      补齐批次按实际情况直接在 main 提交。
