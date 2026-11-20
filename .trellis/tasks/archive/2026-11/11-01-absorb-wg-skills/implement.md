# 执行计划：wg-skills 吸收为 .trellis/spec/wg-skills 层

## 前置状态

- worktree：`.claude/worktrees/feat+wg-skills-spec`，分支 `feat/wg-skills-spec`（基点 origin/main 221e3ce）
- 源仓库克隆：`/tmp/wg-skills-inspect` @ 3b93743（只读，不在其中执行任何代码）
- 任务：`.trellis/tasks/11-01-absorb-wg-skills`（本任务）

## 步骤

### S1. task.py start `[once]`
工件（prd/design/implement）就绪并经用户确认后激活任务。
- 命令：`python3 ./.trellis/scripts/task.py start .trellis/tasks/11-01-absorb-wg-skills`
- 回滚点：start 前 PRD 可随意改。

### S2. 配置子代理上下文 `[once]`（Phase 1.3）
implement.jsonl 登记转写规则与源清单（子代理上下文来源）：
- prd.md（R1–R8 需求）
- design.md（§3 转写规则、§1 目标文件结构、§5 子代理分工）
- research/source-inventory.md（技能→源路径清单，S3 产出）

### S3. 生成源清单 `[once]`
写 `research/source-inventory.md`：从源 README + find 结果整理 158 技能 →
源目录路径 → 目标文档 的三列清单。这是子代理的输入，也是 AC2 的核对底稿。

### S4. 并行子代理转写 `[main]`
4 个 `trellis-implement` 子代理并行，每个提示词以
`Active task: .trellis/tasks/11-01-absorb-wg-skills` 开头：

| 子代理 | 输入源路径 | 产出文件 |
|--------|-----------|---------|
| A backend | vibeCoding/backend/{shared,backend-*,crypto-*,database,java,go,nodejs,python,rust} | backend/ 9 份 |
| B frontend | vibeCoding/frontend/{react,vue,uniapp,electron,html,frontend-*,icon-*,image-*} | frontend/ 9 份 |
| C deploy+workflow | vibeCoding/super-deploy-skills + vibecoding-guide-skill | deploy/ 1 份 + workflow/ 2 份 |
| D others | others/（8 技能）+ 源 AGENTS.md 的「沉淀 Skill」方法论 | others/ 1 份 + workflow/writing-skills.md（与 C 分工见下） |

> C 只做 deploy + vibecoding-methodology；writing-skills.md 由 D 做（skill-auditor
> 与沉淀方法论语义同族）。最终 24 文件归属：A=9, B=9, C=3, D=2, 主会话=index+NOTICE。

每个子代理必须：
1. 读 design.md §3 转写规则并严格执行（头部来源注释、红线保留、精确值照抄、
   去重、私有技能引用标注、脚本只留一句）；
2. 产出自带「覆盖清单」：本板块 N 个技能 → 归入哪份文档，写进
   `research/coverage-<板块>.md`；
3. 不碰 frontend/、guides/ 目录，不写 wg-skills/ 之外的仓库文件。

### S5. 汇总核对 `[main]`
- 逐条核对 4 份 coverage 清单 vs research/source-inventory.md → 158 无遗漏、无重复；
- `wc -c` 全部新文档 ≤ 350KB 合计（AC6）；无二进制（AC6）；
- 缺口/超限 → 回 S4 修补。

### S6. index.md + NOTICE.md `[main]`
基于 S5 核对结果写路由层（design §4 结构）与许可声明。

### S7. 验证 `[main]`（Phase 2.2）
- `python3 ./.trellis/scripts/get_context.py --mode packages` 列出 wg-skills 层（AC1）；
- `git status` 确认改动只在 `.trellis/spec/wg-skills/` + `.trellis/tasks/11-01-absorb-wg-skills/`（AC7）；
- 抽查 3 份文档：头部标注齐、红线完整、无 frontmatter 残留。

### S8. 提交 `[main]`（Phase 3.4）
- `task.py set-branch feat/wg-skills-spec`；
- 单 commit：`docs(spec): 吸收 wg-skills 158 技能为 .trellis/spec/wg-skills 层`，
  正文列板块/文件数/来源 commit/许可声明；结尾按仓库规范加 Co-Authored-By；
- 不推送、不开 PR（用户未要求）。

### S9. 收尾 `[main]`（Phase 3.3 + wrap-up）
- spec 更新检查：本任务产物本身就是 spec 层，无需另写（3.3 记「本任务即 spec 变更」）；
- journal 记录；`/trellis:finish-work`。

## 验证命令

```bash
# AC1
python3 ./.trellis/scripts/get_context.py --mode packages | grep -i wg-skills
# AC2 覆盖核对（S5）
grep -c "skill" research/coverage-*.md  # 4 份合计 = 158
# AC6
find .trellis/spec/wg-skills -name "*.md" | xargs wc -c | tail -1  # ≤ 350KB
find .trellis/spec/wg-skills -type f ! -name "*.md" | wc -l       # = 0
# AC7
git diff --stat main -- .trellis/spec/frontend .trellis/spec/guides  # 空
```

## 回滚点

- S4 前：仅任务工件，随时可弃；
- S4–S6 产出不满意：`rm -rf .trellis/spec/wg-skills` 重来，不影响其他工作；
- S8 后：revert 该 commit 即可（纯新增目录）。
