# 技术设计：wg-skills 吸收为 .trellis/spec/wg-skills 层

## 1. 总体形态

```
.trellis/spec/wg-skills/
├── index.md                      # 路由层：用途 → 场景导航 → 158 技能映射表 → 署名/许可
├── NOTICE.md                     # Apache-2.0 署名与修改声明（详细版）
├── backend/
│   ├── conventions.md            # backend-convention-skill + shared/ 6 份公共规范（响应信封/错误码/JWT/分页/api-contract/模块输出）
│   ├── tech-selection.md         # backend-select-skill + database-learning-skill（选型判据）
│   ├── java-springboot.md        # java-fast + springboot-init + 14 个 springboot-module
│   ├── python-fastapi.md         # python-fast + fastapi-init + 15 个 fastapi-module + qr-login + article-generator + hot-trend-collector
│   ├── go.md                     # 6 个 go 技能
│   ├── nodejs-rust.md            # nodejs-init + rust-backend
│   ├── crypto.md                 # crypto-scenario-skill（按场景加密选型）
│   ├── backend-analysis.md       # backend-analysis-skill（老项目盘点四报告）
│   └── database-design.md        # database-design-skill + 8 个 *-guide-skill（mysql/pgsql/mongodb/redis/kafka/sqlite）
├── frontend/
│   ├── shared-request-layer.md   # frontend-request-skill（4 体系共用请求层规范）
│   ├── react.md                  # react-generate + next-generate + react-native-generate
│   ├── vue-core.md               # vue-base-skill 父技能 + vue-generate + 通用组件类子技能合并
│   ├── vue-complex-scenes.md     # vue-complex-skill 7 个复合场景（crud/dashboard/chat/login/chart/upload/ai-workspace）
│   ├── vue-theme-style.md        # vue-theme + vue-style + vue-tui
│   ├── uniapp.md                 # 16 个 uniapp 技能（base+15）
│   ├── electron.md               # electron 3 技能 + electron-vue-init + electron-native-abi-fix
│   ├── code-quality.md           # frontend-code-doctor + frontend-style-harmonizer（审查/一致性审计清单）
│   └── assets-and-icons.md       # frontend-icon + icon-image-catch(3) + image-forge + html-frontend-template
├── deploy/
│   └── deploy-suite.md           # super-deploy 16 技能合并（detect → install → docker/native → nginx → server-setup）
├── workflow/
│   ├── vibecoding-methodology.md # vibecoding-guide + vibecoding-workflow + agent-interview + agent-learning
│   └── writing-skills.md         # 源仓库「如何沉淀 Skill」方法论 + skill-auditor（审计维度）
└── others/
    └── content-writing.md        # ai-speech-detector + humanizer + xhs-style-writer + workflow-diagram + ffmpeg + remotion
```

共 22 份文档 + index + NOTICE ≈ 24 个文件。单文件目标 8–45KB，**硬上限 110KB**
（uniapp-style 4885 行源文按规则清单压缩转写）。

> **注 · 体量预算修正（执行中回写）**：初版设计的「单文件 ≤ 60KB、总量 ≤ 350KB」在 wave 1
> 执行中被证伪——源仓库是 5.8MB 高密度规范文本（规则/枚举/模板占比高，可压缩的叙述占比低），
> 实际产出单文件 23–103KB。按「保留规则实质优先于凑数字」原则放宽预算，而非删减内容；
> 相应地 prd.md AC6 已同步修正。实测总量约 500–700KB，对本 spec 层可接受——文档是按需
> 加载的（index.md 路由），不是每次会话全量注入。

## 2. 目录命名依据

- 与源仓库 5 板块对齐（backend/frontend/deploy/workflow/others），映射关系一眼可查；
- 层内再按主题拆分而不是逐技能一文件（158 个文件不可检索）；
- `index.md` 是唯一路由入口，符合 Trellis spec 层惯例（frontend/guides 均如此）。

## 3. 转写规则（每份文档统一格式）

```markdown
<!-- 来源: jiushiwon/wg-skills @ 3b93743 (Apache-2.0)，有修改；详见 ../NOTICE.md -->
# <主题规范>

> 本文档合并转写自 wg-skills 的 N 个技能：<清单>。规则实质保留原文，
> 触发词/frontmatter/与规则无关的叙述已剥离。

## 红线 / 强制约定        ← 源文档的「红线」「不可绕过」段
## 规则明细               ← 按源结构转写（清单、模板、判据表）
## 交付物                 ← 源技能要求的产出（如 api-contract.md）
## 未收录引用             ← 指向私有仓库技能的引用处标注
## 与本项目规范的关系      ← 可选；仅当主题与 frontend/ 层有交集
```

- 数字/枚举/路径/字段名等**精确值照抄**（这是规范的价值所在），叙述性文字可压缩；
- 源技能间的重复规则（如响应信封在 4 个 module 技能里反复出现）只写一次，注明
  「唯一定义处在 conventions.md，其余技能引用不重复」——沿用源仓库自己的
  「禁止复制规则文本」原则；
- frontmatter 的 description 中若有工程判断（不只是触发词），并入正文；
- scripts/ 只留一句用途说明 + 源路径。

## 4. index.md 结构

1. **层定位**：什么场景来读这层（「要在本项目之外生成/评审一个完整项目」「做后端/
   部署/跨端小程序时，本项目 frontend 层不覆盖」）+ 与 frontend/guides 层的边界。
2. **场景导航表**：任务场景 → 该读哪份（如「搭 Spring Boot 商城」→ backend/
   conventions.md + java-springboot.md）。
3. **文档目录**：22 份文档一览。
4. **158 技能完整映射表**：技能名 → 归入文档 + 一句话说明；四舍五入按板块分组。
   这是 AC2 审计依据。
5. **来源与许可**：源仓库 URL、commit、Apache-2.0、转写说明、指向 NOTICE.md。

## 5. 执行方式与上下文管理

5.8MB 源文超出单会话容量，用**子代理分板块并行转写**：

- 每个子代理负责一个板块（backend / frontend / deploy+workflow / others），
  读源目录内 SKILL.md + 关键 references，产出该板块的目标文档；
- 子代理提示词携带：本 design 的转写规则（§3 格式模板）、源路径清单、目标文件清单、
  转写红线（精确值照抄/去重/死链标注/不吸收脚本）；
- deploy（16 技能同构）+ workflow（4 技能）+ others（8 技能）体量小，合并给一个子代理；
  backend 与 frontend 各一个子代理；
- index.md + NOTICE.md 由主会话在收齐各板块产出后编写（需要全局映射视角）；
- 各子代理把「已覆盖技能清单」写进各自 research 产出，主会话汇总核对 158 全覆盖。

体量估算：backend 55 技能 / frontend 74 技能是两大头。frontend 中 vue-base 30 子技能
同构度高（组件规范形态一致），合并后体量可控；uniapp-style 4885 行单文件压缩为规则清单。

## 6. 风险与对策

| 风险 | 对策 |
|------|------|
| 子代理转写漏技能（158 映射对不上） | 映射表以源 README 清单为准逐一核对；子代理产出自带覆盖清单 |
| 子代理复制大段原文造成体量失控 | 提示词写明单文档上限与「规则原文保留、叙述压缩」原则；完成后 wc -c 校验（AC6） |
| 与 frontend/ 层语义冲突（如请求层规范） | R8 处理：wg-skills 层内加「与本项目规范的关系」注记指向 frontend/http-api-guidelines.md，不改写对方；index.md 边界说明 |
| Apache-2.0 合规遗漏 | NOTICE.md 一次性写清；每文档头部一行来源注释兜底（§3 模板） |
| 源仓库后续更新导致 spec 过时 | Out of scope（PRD 已声明）；index.md 记录源 commit，未来 diff 可见漂移 |

## 7. 兼容与回滚

- 纯新增操作：不触碰 frontend/、guides/、任何代码；回滚 = 删 `.trellis/spec/wg-skills/` 目录；
- spec 层自动发现（F4），无需改 `.trellis/config.yaml` 或脚本。
