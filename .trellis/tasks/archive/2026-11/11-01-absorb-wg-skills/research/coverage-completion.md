# 覆盖清单 · 续做批次（13 份文档，2026-11-20 主会话直接转写）

> 子代理通道故障（TypeError: terminated ×3 轮），由主会话按 design §3 规则直接转写。
> 本清单与既有 coverage-backend-jp / coverage-deploy-workflow / coverage-uniapp / coverage-vue
> 合并构成 158 全覆盖核对底稿。

## backend/conventions.md（backend-convention-skill + shared/ 6 份）

- backend-convention-skill → backend/conventions.md#一~九（红线 8 条 / 信封 / 错误码 / JWT / 分页 / api-contract 规范与模板 / 模块输出 / 环境变量 / 项目元文件）
- shared/ 6 份公共规范（response-envelope / error-code / jwt-auth / pagination / api-contract-template / module-output）→ 全部并入 conventions.md 对应章节（#二~#七），保留全部精确值（错误码表 12 项 + 分段 / 载荷字段 / 有效期 3600s+604800s / page=1+pageSize≤100 / 契约红线 8 条 / 必备变量表）

## backend/tech-selection.md（2）

- backend-select-skill → backend/tech-selection.md#二（分批问答 7 问 / 推荐矩阵 / 分流与交付物）
- database-learning-skill → backend/tech-selection.md#三~四（索引五类型 + 最左前缀 / ACID + 隔离级别表 + 两库默认级别 / 慢查询套路 / MySQL vs PG 对比表）

## backend/crypto.md（1）

- crypto-scenario-skill → backend/crypto.md#一~八（场景决策表 10 场景 / 红线 7 条 / bcrypt cost 表 + Argon2id 参数 / 支付回调处理顺序 4 步 / JWT 选型 / AI 约束块 5 条 / 上线自查清单 7 组）

## backend/backend-analysis.md（1）

- backend-analysis-skill → backend/backend-analysis.md#一~五（定位边界 / Step 0-5 工作流 / 输出规范 5 报告 / 注意事项 7 条红线 / 交付确认）

## backend/nodejs-rust.md（2）

- nodejs-init-skill → backend/nodejs-rust.md#二（差异表 / 能力 11 项 / 生成流程 5 步 / 只问 3 问题）
- rust-backend-skill → backend/nodejs-rust.md#三（源文待实现态，转写规格意图：Axum+Tower / SQLx / cargo-watch / 能力 7 项）

## backend/database-design.md（7）

- database-design-skill → backend/database-design.md#一二（红线 6 条 / 基础字段模板 / 类型选择表 / 索引四类型 + 最左前缀 / 关联与查询优化 / 分库分表判据 / InnoDB）
- mysql-guide-skill → backend/database-design.md#三
- pgsql-guide-skill → backend/database-design.md#四（JSONB / 数组 / 流复制）
- mongodb-guide-skill → backend/database-design.md#五（聚合 Pipeline / 多文档事务 / DB_URL）
- redis-guide-skill → backend/database-design.md#六（五结构 / 分布式锁 tryLock(10,30) / 限流 / 延迟队列）
- kafka-guide-skill → backend/database-design.md#七（acks=all+retries=3+幂等 / 手动提交+max.poll.records=500）
- sqlite-guide-skill → backend/database-design.md#八（WAL / busy_timeout / FTS5 / AI 时代角色 / 选型判断）

## backend/go.md（6）

- go-gin-init-skill → backend/go.md#一二（红线 10 条 / 能力 11 项 / restart.sh dev|prod）
- go-frame-init-skill → backend/go.md#三（Gin/Hertz/Fiber/Chi 四框架表）
- go-grpc-init-skill → backend/go.md#四（能力 8 项 / 错误码映射 / 拦截器链）
- go-ws-module-skill → backend/go.md#五（红线 9 条含 client_msg_id 去重 / 心跳 30s/60s / 离线 100 条 / 错误码 -3xxx）
- go-auth-module-skill → backend/go.md#六（能力 9 项 / ★契约红线 3 条：双权限路径 34 vs 39 / permission 存 NULL 不存空串 / X-App-Key=AppKey.apiKey）
- go-module/go-storage-module-skill → backend/go.md#七（MinIO/S3 / 配置结构体 / -3xxx 段）

## frontend/shared-request-layer.md（1）

- frontend-request-skill → frontend/shared-request-layer.md#一~十一（两层规范 / 契约强约定含 -1=JWT 失效 / src/api/ 强约定 / RequestOptions 全字段 / 刷新队列 / 去重 key 递归排序 / 500 swallow / Mock 开关 / 小程序 enableChunked / Common Mistakes 15 条全表）

## frontend/react.md（3）

- react-generate-skill → frontend/react.md#二（规格说明先行 / Phase 工作流）
- next-generate-skill → frontend/react.md#三（When NOT to Use / 能力 8 项：三轨请求/App Router/middleware.ts/Route Groups）
- react-native-generate-skill → frontend/react.md#四（差异表 / 依赖 JDK17+SDK+Xcode / 能力 10 项 / 红线 5 条含 Expo 推荐）

## frontend/electron.md（5）

- electron-react-skill → frontend/electron.md#一（三层架构图 / 安全边界）
- electron-vue-init-skill → frontend/electron.md#二（源仓库未收录实体，占位标注）
- electron-dev-restart → frontend/electron.md#三（铁律 / 症状清单 / MSYS_NO_PATHCONV=1 + /T 杀进程树 / 三步法）
- xterm-js-rendering-pitfalls → frontend/electron.md#四（四大坑全录：ctx.font 不支持 CSS 变量 / state 孤岛 / term.refresh() / TIOCSWINSZ 偏大）
- electron-native-abi-fix → frontend/electron.md#五（报错翻译 / 本机硬约束侦察 / 降级包优先 / --ignore-scripts 副作用）

## frontend/code-quality.md（3）

- frontend-code-doctor → frontend/code-quality.md#一（审查维度 9 项表 / Grep 检查项）
- frontend-style-harmonizer-skill → frontend/code-quality.md#二（原则 4 条 / 三维度：复用/对齐/硬编码 / 报告写用户 docs/）
- frontend-ui-foundry → frontend/code-quality.md#三（设计哲学 5 条 / OKLCH / 永不 #000#fff / 四档承诺度 / 字体 65-75ch / 嵌套卡片必错 / 动效曲线 / 绝对禁令 / 默认决策；源文 246KB 高压缩）

## frontend/assets-and-icons.md（6）

- frontend-icon-skill → frontend/assets-and-icons.md#一（SVG/PNG 双 API / png 子路径 Node-only / BaseIcon 桥接）
- icon-image-catch-skill（父）→ frontend/assets-and-icons.md#二（路由表 / 原则 7 条 / Iconify 零配置）
- icon-image-catch-skill/icon-catch-skill → frontend/assets-and-icons.md#二.4
- icon-image-catch-skill/image-catch-skill → frontend/assets-and-icons.md#二.5
- image-forge-skill → frontend/assets-and-icons.md#三（icons/jobs 双模式；实际位于 vibeCoding/frontend/ 根下，不在 icon-image-catch 内——index 映射表已按实际路径修正）
- html-frontend-template → frontend/assets-and-icons.md#四（零框架模板定位）

## workflow/vibecoding-methodology.md（4）

- vibecoding-guide-skill → workflow/vibecoding-methodology.md#一（分流表）
- vibecoding-workflow-skill → workflow/vibecoding-methodology.md#二（roadmap.md / 7 阶段 / 价格须加核实提示）
- agent-learning-skill → workflow/vibecoding-methodology.md#三（学习路径 / 快捷入口）
- agent-interview-skill → workflow/vibecoding-methodology.md#四（interview-plan.md / 快捷入口）

## 覆盖核对

- 本批次：13 份文档、47 项映射（42 技能 + shared/ 6 份 + electron-vue 占位）全部落点
- 与既有 4 份 coverage 合并：116（既有）+ 42（本批）= 158 技能全覆盖 ✓
- 私有技能 4 项（vue-admin-skill / sse-agent-skill / universal-identity-bridge-skill / universal-login-bridge-skill）标注口径一致 ✓
- image-forge-skill 源路径勘误：实际在 vibeCoding/frontend/ 根下而非 icon-image-catch-skill 内（index.md 映射表保持源清单原文，本文档「源文件对照」按实际路径标注）
