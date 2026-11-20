<!-- 来源: jiushiwon/wg-skills @ 3b93743 (Apache-2.0)，有修改；详见 ./NOTICE.md -->
# wg-skills 吸收层 · 规范库

> **目的**：把 [wg-skills](https://github.com/jiushiwon/wg-skills) 的 158 个工程技能，
> 转写成本项目可检索的规范文档。**这是参考资料层，不是本项目的强制约定**——
> 本项目的强制规则在 [`../frontend/`](../frontend/index.md) 与 [`../guides/`](../guides/index.md)。
>
> **规范分类**：通用规范（冻结层）。本吸收任务归档之时起**冻结不可修改**——发现过时、
> 错误或缺口，不在此层修原文，勘误记录到项目规范侧或在引用处标注；未来吸收新的外部
> 材料走独立吸收任务在本层**新增**文件。分类与演进规则见 [`../README.md`](../README.md)。

---

## 这一层什么时候用

| 场景 | 用不用这层 |
|------|-----------|
| 在本仓库写 React 应用代码（portal-web / iam-web / packages） | ❌ 用 [`../frontend/`](../frontend/index.md) |
| 另起一个**新项目**（后端服务、独立站点、小程序、桌面端） | ✅ 本层 |
| 生成/评审完整项目的骨架、目录结构、接口契约 | ✅ 本层 `backend/` + `frontend/` |
| 设计数据库、选型技术栈、做加密方案 | ✅ 本层 `backend/` |
| 部署上线（Docker / Nginx / 装数据库与运行时） | ✅ 本层 `deploy/` |
| 做需求访谈、梳理项目路线图、沉淀自己的 Skill | ✅ 本层 `workflow/` |
| 写文案 / 去 AI 味 / 生成流程图 / 处理视频 | ✅ 本层 `others/` |

**边界**：本层覆盖的是「通用全栈工程规范」；本仓库自身的 monorepo 约定（qiankun 微前端、
env 分层、HTTP 封装、i18n 等）以 `../frontend/` 为准，两者冲突时**以 `../frontend/` 为准**。

---

## 吸收进度（2026-11-20 核对）

**已产出 9/22 份内容文档，覆盖 116/158 技能**；13 份待产出（≈42 技能）。
任务 [11-01-absorb-wg-skills](../../tasks/11-01-absorb-wg-skills/prd.md) 保持 in_progress。

| 文档 | 技能数 | 状态 |
|------|-------|------|
| frontend/vue-core.md | 31 | ✅ 已产出 |
| frontend/vue-complex-scenes.md | 8 | ✅ 已产出 |
| frontend/vue-theme-style.md | 3 | ✅ 已产出 |
| frontend/uniapp.md | 15 | ✅ 已产出 |
| backend/java-springboot.md | 16 | ✅ 已产出 |
| backend/python-fastapi.md | 20 | ✅ 已产出 |
| deploy/deploy-suite.md | 16 | ✅ 已产出 |
| workflow/writing-skills.md | 1 | ✅ 已产出 |
| others/content-writing.md | 6 | ✅ 已产出 |
| backend/conventions.md | 2 | ⏳ 待产出 |
| backend/tech-selection.md | 2 | ⏳ 待产出 |
| backend/crypto.md | 1 | ⏳ 待产出 |
| backend/backend-analysis.md | 1 | ⏳ 待产出 |
| backend/database-design.md | 7 | ⏳ 待产出 |
| backend/go.md | 6 | ⏳ 待产出 |
| backend/nodejs-rust.md | 2 | ⏳ 待产出 |
| frontend/shared-request-layer.md | 1 | ⏳ 待产出 |
| frontend/react.md | 3 | ⏳ 待产出 |
| frontend/electron.md | 5 | ⏳ 待产出 |
| frontend/code-quality.md | 3 | ⏳ 待产出 |
| frontend/assets-and-icons.md | 6 | ⏳ 待产出 |
| workflow/vibecoding-methodology.md | 4 | ⏳ 待产出 |

> ⚠️ 续做须知：源仓库克隆（`/tmp/wg-skills-inspect` @ `3b93743`）与执行 worktree 均已删除，
> 续做需重新克隆源仓库并以「来源与许可」一节的 commit 为 diff 基线。

---

## 场景导航

| 你要做的事 | 读这些 |
|-----------|--------|
| 判断后端语言/框架/数据库怎么选 | ⏳ [backend/tech-selection.md](./backend/tech-selection.md)（待产出） |
| 定后端统一返回格式、错误码、JWT、分页 | ⏳ [backend/conventions.md](./backend/conventions.md)（待产出；产出后为**唯一定义处**） |
| 写接口契约 `api-contract.md` | ⏳ [backend/conventions.md](./backend/conventions.md)（同上，含模板） |
| 搭 Spring Boot / FastAPI 服务 | ✅ [backend/java-springboot.md](./backend/java-springboot.md) / [backend/python-fastapi.md](./backend/python-fastapi.md) |
| 搭 Go / Node / Rust 服务 | ⏳ `backend/go.md` / `backend/nodejs-rust.md`（待产出） |
| 设计数据库表、索引；接 MySQL/PG/Mongo/Redis/Kafka/SQLite | ⏳ [backend/database-design.md](./backend/database-design.md)（待产出） |
| 做密码存储/支付验签/敏感字段加密选型 | ⏳ [backend/crypto.md](./backend/crypto.md)（待产出） |
| 接手陌生后端项目、盘点接口 | ⏳ [backend/backend-analysis.md](./backend/backend-analysis.md)（待产出） |
| 搭 React / Next.js / React Native 项目 | ⏳ [frontend/react.md](./frontend/react.md)（待产出） |
| 搭 Vue 后台 / 组件选型 / 复合场景页 | ✅ [frontend/vue-core.md](./frontend/vue-core.md)、[vue-complex-scenes.md](./frontend/vue-complex-scenes.md)、[vue-theme-style.md](./frontend/vue-theme-style.md) |
| 搭小程序 / 多端应用（UniApp） | ✅ [frontend/uniapp.md](./frontend/uniapp.md) |
| 写前端请求层（信封/错误码/Token/SSE/Mock） | ⏳ [frontend/shared-request-layer.md](./frontend/shared-request-layer.md)（待产出） |
| 搭 Electron 桌面端 / 排查 xterm、原生 ABI 问题 | ⏳ [frontend/electron.md](./frontend/electron.md)（待产出） |
| 前端代码审查、一致性审计 | ⏳ [frontend/code-quality.md](./frontend/code-quality.md)（待产出） |
| 处理图标、图片、HTML 模板 | ⏳ [frontend/assets-and-icons.md](./frontend/assets-and-icons.md)（待产出） |
| 部署到服务器（含装数据库/运行时） | ✅ [deploy/deploy-suite.md](./deploy/deploy-suite.md) |
| 需求访谈、项目路线图、VibeCoding 工作流 | ⏳ [workflow/vibecoding-methodology.md](./workflow/vibecoding-methodology.md)（待产出） |
| 审计一个 Skill 的安全性、沉淀自己的 Skill | ✅ [workflow/writing-skills.md](./workflow/writing-skills.md) |
| 写公众号/小红书文案、去 AI 味、生成流程图、剪视频 | ✅ [others/content-writing.md](./others/content-writing.md) |

---

## 文档目录

```
wg-skills/
├── index.md                     ← 本文件
├── NOTICE.md                    ← 来源与 Apache-2.0 许可声明
├── backend/    ✅ java-springboot · python-fastapi
│               ⏳ conventions · tech-selection · crypto · backend-analysis
│                  database-design · go · nodejs-rust
├── frontend/   ✅ vue-core · vue-complex-scenes · vue-theme-style · uniapp
│               ⏳ shared-request-layer · react · electron · code-quality
│                  assets-and-icons
├── deploy/     ✅ deploy-suite
├── workflow/   ✅ writing-skills   ⏳ vibecoding-methodology
└── others/     ✅ content-writing
```

---

## 158 技能完整映射

> 下方每一行 = 源仓库的一个技能（`SKILL.md`），共 **158** 行，按目标文档分组。
> 每条格式：`源技能名 → 归入文档`。组标题带 ✅ 表示该文档已产出，⏳ 表示待产出
> （对照「吸收进度」）。核对方法与更新流程见任务
> `.trellis/tasks/11-01-absorb-wg-skills/`。

### backend/conventions.md （2）⏳ 待产出

- `backend-convention-skill` → backend/conventions.md
- `shared/`（6 份跨语言公共规范：响应信封 / 错误码 / JWT / 分页 / api-contract 模板 / 模块输出规范）→ backend/conventions.md

### backend/tech-selection.md （2）⏳ 待产出

- `backend-select-skill` → backend/tech-selection.md
- `database-learning-skill` → backend/tech-selection.md

### backend/crypto.md （1）⏳ 待产出

- `crypto-scenario-skill` → backend/crypto.md

### backend/backend-analysis.md （1）⏳ 待产出

- `backend-analysis-skill` → backend/backend-analysis.md

### backend/database-design.md （7）⏳ 待产出

- `database-design-skill` → backend/database-design.md
- `mysql-guide-skill` → backend/database-design.md
- `pgsql-guide-skill` → backend/database-design.md
- `mongodb-guide-skill` → backend/database-design.md
- `redis-guide-skill` → backend/database-design.md
- `kafka-guide-skill` → backend/database-design.md
- `sqlite-guide-skill` → backend/database-design.md

### backend/java-springboot.md （16）✅

- `java-fast-skill` → backend/java-springboot.md
- `springboot-init-skill` → backend/java-springboot.md
- `springboot-auth-module-skill` → backend/java-springboot.md
- `springboot-agent-module-skill` → backend/java-springboot.md
- `springboot-dict-module-skill` → backend/java-springboot.md
- `springboot-kafka-module-skill` → backend/java-springboot.md
- `springboot-log-module-skill` → backend/java-springboot.md
- `springboot-notification-module-skill` → backend/java-springboot.md
- `springboot-org-permission-module-skill` → backend/java-springboot.md
- `springboot-payment-module-skill` → backend/java-springboot.md
- `springboot-redis-module-skill` → backend/java-springboot.md
- `springboot-storage-module-skill` → backend/java-springboot.md
- `springboot-upload-module-skill` → backend/java-springboot.md
- `springboot-alipay-pay-skill` → backend/java-springboot.md
- `springboot-wechat-pay-skill` → backend/java-springboot.md
- `universal-login-api` → backend/java-springboot.md

### backend/python-fastapi.md （20）✅

- `python-fast-skill` → backend/python-fastapi.md
- `fastapi-init-skill` → backend/python-fastapi.md
- `fastapi-auth-module-skill` → backend/python-fastapi.md
- `fastapi-agent-module-skill` → backend/python-fastapi.md
- `fastapi-ai-chat-module-skill` → backend/python-fastapi.md
- `fastapi-dict-module-skill` → backend/python-fastapi.md
- `fastapi-log-module-skill` → backend/python-fastapi.md
- `fastapi-notification-module-skill` → backend/python-fastapi.md
- `fastapi-org-permission-module-skill` → backend/python-fastapi.md
- `fastapi-payment-module-skill` → backend/python-fastapi.md
- `fastapi-storage-module-skill` → backend/python-fastapi.md
- `fastapi-upload-module-skill` → backend/python-fastapi.md
- `fastapi-ws-module-skill` → backend/python-fastapi.md
- `fastapi-alipay-pay-skill` → backend/python-fastapi.md
- `fastapi-wechat-pay-skill` → backend/python-fastapi.md
- `python-redis-module-skill` → backend/python-fastapi.md
- `python-kafka-module-skill` → backend/python-fastapi.md
- `fastapi-qr-login-skill` → backend/python-fastapi.md
- `article-generator` → backend/python-fastapi.md
- `hot-trend-collector` → backend/python-fastapi.md

### backend/go.md （6）⏳ 待产出

- `go-gin-init-skill` → backend/go.md
- `go-frame-init-skill` → backend/go.md
- `go-grpc-init-skill` → backend/go.md
- `go-ws-module-skill` → backend/go.md
- `go-auth-module-skill` → backend/go.md
- `go-storage-module-skill` → backend/go.md

### backend/nodejs-rust.md （2）⏳ 待产出

- `nodejs-init-skill` → backend/nodejs-rust.md
- `rust-backend-skill` → backend/nodejs-rust.md

### frontend/shared-request-layer.md （1）⏳ 待产出

- `frontend-request-skill` → frontend/shared-request-layer.md

### frontend/react.md （3）⏳ 待产出

- `react-generate-skill` → frontend/react.md
- `next-generate-skill` → frontend/react.md
- `react-native-generate-skill` → frontend/react.md

### frontend/vue-core.md （31）✅

- `vue-base-skill`（父技能）→ frontend/vue-core.md
- `vue-generate-skill` → frontend/vue-core.md
- `nuxt-generate-skill` → frontend/vue-core.md
- `universal-login-page` → frontend/vue-core.md
- `vue-layout-skill` → frontend/vue-core.md
- `vue-button-skill` → frontend/vue-core.md
- `vue-card-skill` → frontend/vue-core.md
- `vue-badge-skill` → frontend/vue-core.md
- `vue-form-skill` → frontend/vue-core.md
- `vue-input-skill` → frontend/vue-core.md
- `vue-select-skill` → frontend/vue-core.md
- `vue-cascader-skill` → frontend/vue-core.md
- `vue-dropdown-skill` → frontend/vue-core.md
- `vue-tree-skill` → frontend/vue-core.md
- `vue-datepicker-skill` → frontend/vue-core.md
- `vue-checkbox-skill` → frontend/vue-core.md
- `vue-radio-skill` → frontend/vue-core.md
- `vue-switch-skill` → frontend/vue-core.md
- `vue-table-skill` → frontend/vue-core.md
- `vue-tag-skill` → frontend/vue-core.md
- `vue-status-skill` → frontend/vue-core.md
- `vue-collapse-skill` → frontend/vue-core.md
- `vue-contextmenu-skill` → frontend/vue-core.md
- `vue-toast-skill` → frontend/vue-core.md
- `vue-dialog-skill` → frontend/vue-core.md
- `vue-empty-skill` → frontend/vue-core.md
- `vue-loading-skill` → frontend/vue-core.md
- `vue-upload-skill` → frontend/vue-core.md
- `vue-menu-skill` → frontend/vue-core.md
- `vue-list-page-skill` → frontend/vue-core.md
- `vue-list-item-skill` → frontend/vue-core.md

### frontend/vue-complex-scenes.md （8）✅

- `vue-complex-skill`（父技能）→ frontend/vue-complex-scenes.md
- `vue-crud-skill` → frontend/vue-complex-scenes.md
- `vue-dashboard-skill` → frontend/vue-complex-scenes.md
- `vue-chat-skill` → frontend/vue-complex-scenes.md
- `vue-login-skill` → frontend/vue-complex-scenes.md
- `vue-chart-skill` → frontend/vue-complex-scenes.md
- `vue-upload-integration-skill` → frontend/vue-complex-scenes.md
- `vue-ai-creative-workspace-skill` → frontend/vue-complex-scenes.md

### frontend/vue-theme-style.md （3）✅

- `vue-theme-skill` → frontend/vue-theme-style.md
- `vue-style-skill` → frontend/vue-theme-style.md
- `vue-tui-skill` → frontend/vue-theme-style.md

### frontend/uniapp.md （15）✅

- `uniapp-base-skill` → frontend/uniapp.md
- `uniapp-app-generate-skill` → frontend/uniapp.md
- `uniapp-standard-skill` → frontend/uniapp.md
- `uniapp-style-skill` → frontend/uniapp.md
- `uniapp-theme-skill` → frontend/uniapp.md
- `uniapp-request-skill` → frontend/uniapp.md
- `uniapp-auth-skill` → frontend/uniapp.md
- `uniapp-page-components-skill` → frontend/uniapp.md
- `uniapp-member-center-skill` → frontend/uniapp.md
- `uniapp-diagnostic-skill` → frontend/uniapp.md
- `uniapp-code-audit-skill` → frontend/uniapp.md
- `uniapp-crossplatform-audit-skill` → frontend/uniapp.md
- `uniapp-vue2-upgrade-skill` → frontend/uniapp.md
- `uniapp-ui-replica-skill` → frontend/uniapp.md
- `uniapp-ui-template-builder-skill` → frontend/uniapp.md

### frontend/electron.md （5）⏳ 待产出

- `electron-react-skill` → frontend/electron.md
- `electron-vue-init-skill` → frontend/electron.md
- `electron-dev-restart` → frontend/electron.md
- `xterm-js-rendering-pitfalls` → frontend/electron.md
- `electron-native-abi-fix` → frontend/electron.md

### frontend/code-quality.md （3）⏳ 待产出

- `frontend-code-doctor` → frontend/code-quality.md
- `frontend-style-harmonizer-skill` → frontend/code-quality.md
- `frontend-ui-foundry` → frontend/code-quality.md

### frontend/assets-and-icons.md （6）⏳ 待产出

- `frontend-icon-skill` → frontend/assets-and-icons.md
- `icon-image-catch-skill`（父技能）→ frontend/assets-and-icons.md
- `icon-catch-skill` → frontend/assets-and-icons.md
- `image-catch-skill` → frontend/assets-and-icons.md
- `image-forge-skill` → frontend/assets-and-icons.md
- `html-frontend-template` → frontend/assets-and-icons.md

### deploy/deploy-suite.md （16）✅

- `super-deploy-skills`（父技能）→ deploy/deploy-suite.md
- `deploy-detect-skill` → deploy/deploy-suite.md
- `deploy-docker-skill` → deploy/deploy-suite.md
- `deploy-native-skill` → deploy/deploy-suite.md
- `server-setup-skill` → deploy/deploy-suite.md
- `static-nginx-skill` → deploy/deploy-suite.md
- `database-install-skill`（父技能）→ deploy/deploy-suite.md
- `mysql-install-skill` → deploy/deploy-suite.md
- `postgres-install-skill` → deploy/deploy-suite.md
- `mongodb-install-skill` → deploy/deploy-suite.md
- `redis-install-skill` → deploy/deploy-suite.md
- `runtime-install-skill`（父技能）→ deploy/deploy-suite.md
- `go-install-skill` → deploy/deploy-suite.md
- `java-install-skill` → deploy/deploy-suite.md
- `nodejs-install-skill` → deploy/deploy-suite.md
- `python-install-skill` → deploy/deploy-suite.md

### workflow/vibecoding-methodology.md （4）⏳ 待产出

- `vibecoding-guide-skill` → workflow/vibecoding-methodology.md
- `vibecoding-workflow-skill` → workflow/vibecoding-methodology.md
- `agent-interview-skill` → workflow/vibecoding-methodology.md
- `agent-learning-skill` → workflow/vibecoding-methodology.md

### workflow/writing-skills.md （1）✅

- `skill-auditor` → workflow/writing-skills.md

### others/content-writing.md （6）✅

- `ai-speech-detector` → others/content-writing.md
- `humanizer` → others/content-writing.md
- `xhs-style-writer-skill` → others/content-writing.md
- `workflow-diagram-skill` → others/content-writing.md
- `ffmpeg-skill` → others/content-writing.md
- `remotion-skill` → others/content-writing.md

---

## 未收录的技能（源仓库私有）

以下 4 个技能被源仓库公开技能引用，但实体在私有仓库 `wg-project-kits`：

- `vue-admin-skill` · `sse-agent-skill` · `universal-identity-bridge-skill` · `universal-login-bridge-skill`

本层文档中凡引用它们处，均标注「（源仓库私有技能，未收录）」。

---

## 来源与许可

| 项 | 值 |
|----|-----|
| 源仓库 | https://github.com/jiushiwon/wg-skills |
| 吸收时 commit | `3b93743e0f87a36b7b3456a609b2b937897b8e7e` |
| 许可 | **Apache License 2.0**（源仓库 README 自称 MIT，以其 `LICENSE` 文件为准） |
| 修改说明 | 计划合并转写为 22 份文档（已产出 9 份）；剥离 frontmatter/触发词/README/图片；压缩叙述、保留规则精确值；不收录 scripts 与二进制；新增本索引 |

完整声明见 [`NOTICE.md`](./NOTICE.md)。重新吸收或更新时，以本表记录的 commit 为 diff 基线。
