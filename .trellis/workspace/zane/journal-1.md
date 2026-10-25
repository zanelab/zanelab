# Journal - zane (Part 1)

> AI development session journal
> Started: 2026-09-07

---



## Session 1: 迁移上游 internal 三包到 tooling 并归档历史任务
<!-- trellis-session: v=2 fp=fe27f24a8a89082a -->

**Date**: 2026-10-14
**Task**: 迁移上游 internal 三包到 tooling 并归档历史任务
**Branch**: `main`

### Summary

将上游 5.5.9 internal 下三个无冲突包迁入 tooling/：@zanelab/node-utils（10 源文件+16 测试，源码直出）、@zanelab/prettier-config、@zanelab/commitlint-config（scope 白名单动态适配 @zanelab/*）。catalog: 版本落地为真实范围；根 commitlint.config.ts 接入（.ts+jiti 才能解析 TS 直出链，.mjs 不行，已记入 spec）。回归：223=207 基线+16 新增，3 既有 MSW 失败不变，build 2/2、lint 5/5。归档三个已完成任务（monorepo 迁移、注释清除、上游迁移）。

### Git Commits

| Hash | Message |
|------|---------|
| `5dd6dea` | feat(tooling): 迁移上游 internal 三个无冲突包为 @zanelab/* 源码直出包 |

### Status

[OK] **Completed**


## Session 2: 将 commitlint/prettier/stylelint 三配置接入日常开发流程
<!-- trellis-session: v=2 fp=450f98b179cacc6b -->

**Date**: 2026-10-15
**Task**: 将 commitlint/prettier/stylelint 三配置接入日常开发流程
**Branch**: `main`

### Summary

三配置从可用变应用：根 .prettierrc.mjs/.prettierignore、lefthook（commit-msg 拦 commitlint、pre-commit 拦 staged 文件 prettier --check）、package.json format/format:check/lint:css 脚本与 devDeps 升根、stylelint 本仓 override（selector-class-pattern null、Tailwind v4 at-rules 白名单）3 个 CSS 0 errors。全仓一次性 prettier 格式化基线（378 文件纯格式 diff，字节级验证）。踩坑：lefthook {staged_files} 内联展开在 Windows 超 sh 8191 上限，且 pnpm exec 再起 cmd 实测 ~6950 即炸，解法为 git diff + xargs -s 6000 管道（已记 spec）；commitlint scope 白名单不含 task，归档提交用 chore(project)。回归：build 2/2、lint 5/5、测试 223 守恒（3 既有 MSW 失败不变）。归档 apply-lint-configs 与 stylelint 迁移两任务。

### Git Commits

| Hash | Message |
|------|---------|
| `6eaff73` | feat(lint): 接入 prettier/commitlint/stylelint 到日常开发流程 |
| `e43085f` | style: 全仓 prettier 一次性格式化基线 |

### Status

[OK] **Completed**


## Session 3: 将 apps/web 改名 portal、apps/plt 改名 iam
<!-- trellis-session: v=2 fp=43424faf23b58a6c -->

**Date**: 2026-10-15
**Task**: 将 apps/web 改名 portal、apps/plt 改名 iam
**Branch**: `main`

### Summary

git mv apps/web→apps/portal（@zanelab/portal）、apps/plt→apps/iam（@zanelab/iam），242 R100 + 13 个内容同步修改（根脚本 dev/dev:iam、index.css @source、.vscode localesPaths、mock/测试 appName 'plt'→'iam'、文档全量）。用户决策：外部注册名 npa-plt-system、pa_new 保留不改，spec 新增 Warning 防未来误改。坑1：git reset 重新分组时漏加旧目录删除，rename 配对拆成两个 commit 补齐（区间 diff 255 R 验证通过）；坑2：commitlint scope 白名单无 repo 用 project、body 需 ≤100 字符；坑3：AGENTS.md 被 turbo 管理块 LF 重注入导致混合行尾，prettier endOfLine auto 拦截，归一 CRLF 解决（turbo 再注入可能复发）。回归：build 2/2、lint 5/5、测试 223 守恒（3 既有 MSW 失败）、format:check、lint:css 全绿，双 dev server 冒烟通过。

### Git Commits

| Hash | Message |
|------|---------|
| `f524840` | refactor(project): apps/web 改名 portal、apps/plt 改名 iam，同步全部引用 |
| `f6d110a` | chore(project): 补齐 apps/web、apps/plt 旧目录删除，配对 rename 历史 |

### Status

[OK] **Completed**
