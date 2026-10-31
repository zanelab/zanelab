# Implement — useMock 迁到 dev-only Vite 环境变量

> 设计依据：[design.md](./design.md)。事实编号见 [prd.md](./prd.md)。
> 顺序经过编排：先删契约（packages/types）会短暂让 portal-web 编译失败，故把消费点改动
> 与契约删除放在同一步内完成，中间不留半成品状态。

## 执行清单

- [ ] **S1 · portal-web 侧改用环境变量开关（R1/R3）**
  - `apps/portal-web/src/main.tsx:77-81`：条件改为
    `if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true')`，注释改为
    「MSW mock：dev-only，由 .env 的 VITE_USE_MOCK 控制（生产构建 DEV=false 恒不启用）」。
  - `apps/portal-web/.env.development`：新增 `VITE_USE_MOCK=false`，附一行说明
    （true = 启动 MSW worker 拦截基座自身接口；独立态/集成态均读本文件）。
  - 同步按 DD6 重写该文件注释：删 `scripts/env-switch.mjs`、`pnpm dev` 串联、`/auth`
    与 `/agent` 反代、`nginx.conf`/`$api_upstream` 四处；改为描述 `vite.config.ts` 实际的
    `/iam/functions/v1` 代理与空值时回落到 `http://localhost:8081`。

- [ ] **S2 · 移除运行时配置字段（R2/R4）**
  - `packages/types/src/config.ts:53-54`：删 `useMock` 及其注释。
  - `apps/portal-web/public/config.js:33`：删 `useMock: false,`。
  - `apps/portal-web/src/config/index.ts:41`：删 `DEFAULT_CONFIG.api` 的 `useMock: false,`；
    文件头注释（:10）若提及 mock 与 config.js 的关系，同步校正。
  - 与 S1 在同一次提交内完成（避免 `appConfig.api.useMock` 悬空引用）。

- [ ] **S3 · 锁定向后兼容契约（AC4）**
  - `apps/portal-web/src/config/index.test.ts`：新增用例——传入
    `window.__APP_CONFIG__ = { api: { useMock: true } }` 后，`loadConfig()`
    **不**调用 `console.error`（即不触发回退），且返回的 `cfg.api` 上无 `useMock` 键。
  - 注释说明该断言守护的是"线上遗留 config.js 带旧键仍可加载"这一部署兼容性契约
    （design DD4 / F7），而非普通字段删除。

- [ ] **S4 · 修 iam-web 陈旧注释（D2 第二处）**
  - `apps/iam-web/.env.development:7`：`VITE_IAM_TARGET` → 宿主实际使用的
    `VITE_PROXY_TARGET`，并说明集成态代理配置位于 `apps/portal-web/.env.development`。

- [ ] **S5 · 清理与自查**
  - `grep -rn "useMock" apps packages`（排除 `dist`/`node_modules`）应无源码命中；
    `grep -rn "VITE_USE_MOCK" apps/portal-web` 命中 `.env.development` 与 `main.tsx`。
  - `grep -rn "env-switch\|VITE_IAM_TARGET\|VITE_PORTAL_USE_MOCK" apps` 应无命中。

## 验证命令

```bash
# 单测 + 类型 + 构建（AC4/AC6）
pnpm --filter @zanelab/portal-web test
pnpm --filter @zanelab/portal-web lint
pnpm --filter @zanelab/portal-web build

# 构建产物不含旧字段（AC3）
grep -n "useMock" apps/portal-web/dist/config.js   # 期望：无输出

# 契约删除是否波及他处（AC2）
grep -rn "useMock" apps packages --exclude-dir=node_modules --exclude-dir=dist

# iam-web 未受影响（R5/AC6）
pnpm --filter @zanelab/iam-web build
```

**手动验证（AC5，无法自动覆盖）**：`.env.development` 置 `VITE_USE_MOCK=true` 启动
`pnpm dev`，浏览器 Network 面板确认 `mockServiceWorker.js` 已激活；改回 `false` 重启后确认未激活。

## 风险文件与回滚点

| 位置 | 风险 | 处置 |
|---|---|---|
| `packages/types/src/config.ts` | 共享契约收窄；若将来 schema 改 `.strict()` 会让线上旧 config.js 触发回退 | S3 的测试锁定；design DD4 |
| `apps/portal-web/.env.development` | DD6 删除 `nginx.conf` 表述属**信息取舍**，非事实纠正 | 见下方待确认项 |
| `apps/portal-web/src/main.tsx` | 该分支无单测，dev 行为只能手动验证 | AC5 手动步骤；不声称已自动覆盖 |

回滚点：S1+S2 必须同进同退（半成品状态无法编译）。整体 revert 单次提交即可。

## `task.py start` 前的待确认项

- DD6 中 `nginx.conf` / `$api_upstream` 一句：若你确认部署仓存在该文件，改成准确表述而非删除。
- DD2 命名：如需与 iam-web 对称改为 `VITE_PORTAL_USE_MOCK`，此刻改成本最低（2 处）。
