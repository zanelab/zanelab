# Implement — env 体系重构

> 设计依据：[design.md](./design.md)（DD1–DD6）。顺序：先模板与忽略规则（结构），再改名与注入（行为），最后文档。

## 执行清单

- [ ] **S1 · 模板与忽略规则（DD1/DD4）**
  - 删 `apps/portal-web/.env.development`、`apps/portal-web/.env.production`、`apps/iam-web/.env.development`。
  - 新建 `apps/portal-web/.env.example`：
    ```
    # copy 本文件为 .env 并填写真实值（.env 不入库；shell 变量优先于 .env）。
    # VITE_USE_MOCK：dev-only 的 MSW 开关（true = 启动 worker 拦截基座自身接口）。
    #   不填 = 关。生产构建恒不启用（import.meta.env.DEV 守卫）。
    VITE_USE_MOCK=false
    # VITE_PROXY_TARGET：仅 dev 生效——Vite 反代 /iam/functions/v1 的目标；
    #   留空回落 http://localhost:8081（iam dev server）；指云填 https://<ref>.supabase.co。
    #   生产不读此项（部署侧网关接管）。临时覆盖：VITE_PROXY_TARGET=http://xxx pnpm dev
    VITE_PROXY_TARGET=
    # VITE_API_KEY：Supabase publishable key（SUPABASE_PUBLISHABLE_KEY / sb_publishable_… 或 legacy anon key）。
    #   设值后 dev proxy 转发 /iam/functions/v1 时自动附加 apikey 头；不填则不加。
    VITE_API_KEY=
    ```
  - 新建 `apps/iam-web/.env.example`（独立 dev server 视角）：`VITE_USE_MOCK`（独立态 MSW 开关）、
    `VITE_API_KEY`（独立态 http 拦截器注入 apikey；本地 supabase start 无鉴权可不填）。
    注明：集成态的 proxy 目标与 apikey 由宿主 portal-web 侧配置。
  - `.gitignore`：`# 密钥/本机环境（.env.development 等显式命名文件仍可入库）\n.env` 改为
    `# 密钥/本机环境（模板 .env.example 入库；真实值 copy 成 .env，不入库）\n.env*\n!.env.example`。

- [ ] **S2 · 开关统一（DD2）**
  - `apps/iam-web/src/main.tsx:148,175`：`VITE_IAM_USE_MOCK` → `VITE_USE_MOCK`（两处注释同步）。

- [ ] **S3 · apikey 注入（DD3）**
  - `apps/iam-web/src/utils/http.ts` 请求拦截器：读 `import.meta.env.VITE_API_KEY`，存在才
    `config.headers.set('apikey', apiKey)`（放 Accept-Language 注入旁，注释同风格）。
  - `apps/portal-web/vite.config.ts`：`const apiKey = process.env.VITE_API_KEY || env.VITE_API_KEY || ''`；
    proxy 项加 `headers: apiKey ? { apikey: apiKey } : undefined`。

- [ ] **S4 · 文档与 spec（DD5）**
  - `env-config-guidelines.md`：参数表（3 行 × 两 app）、覆盖规则 Warning 重写、§7 示例文件名。
  - `microfrontend-guidelines.md`：搜 `VITE_IAM_USE_MOCK`/`.env.development` 改述。
  - `apps/iam-web/README.md`：mock 命令行、curl 补 apikey 说明、「前端指向云」节改为
    `.env.example` 流程、目录树中 `.env.development` 条目（如有）。

- [ ] **S5 · 清理自查**
  - `grep -rn "VITE_IAM_USE_MOCK" apps .trellis/spec`（排除 archive）应无命中；
  - `grep -rn "\.env\.development\|\.env\.production" apps .trellis/spec README.md`（排除 archive）应无命中；
  - `git check-ignore apps/portal-web/.env` 命中、`git check-ignore apps/portal-web/.env.example` 不命中。

## 验证命令

```bash
# 构建/测试/静态检查（AC6）
pnpm --filter @zanelab/portal-web test && pnpm --filter @zanelab/portal-web build
pnpm --filter @zanelab/iam-web build && pnpm --filter @zanelab/iam-web exec tsc --noEmit

# 忽略规则（AC1）
git check-ignore apps/portal-web/.env && echo IGNORED-OK
git check-ignore apps/portal-web/.env.example || echo EXAMPLE-TRACKED-OK

# 残留清零（AC2/AC6）
grep -rn "VITE_IAM_USE_MOCK" apps .trellis/spec --exclude-dir=node_modules --exclude-dir=dist | grep -v archive
grep -rn "env\.development\|env\.production" apps .trellis/spec --exclude-dir=node_modules --exclude-dir=dist | grep -v archive
```

**机器验证（dev server 层，AC3/AC4 机械部分）**：
`VITE_API_KEY=test-key pnpm dev`（:5173）+ iam dev（:8081）——curl 经 :5173 代理打一炮
（任意 `/iam/functions/v1/...`），看转发是否带 `apikey: test-key`；iam 独立态起 dev 后在
transformed 模块里确认 `import.meta.env.VITE_API_KEY` 注入。

**手动（AC5/AC7）**：`cp .env.example .env` 填云地址 + publishable key，独立态发码 200；
注释掉 key 再试得 401（证明 key 起效）。

## 风险文件与回滚点

| 位置 | 风险 | 处置 |
|---|---|---|
| `.gitignore` | 规则写错会让 `.env`（含真实凭据）被 git 跟踪 | S5 的 check-ignore 断言必须过；commit 前 `git status` 确认 `.env` 不在 untracked |
| `vite.config.ts` proxy headers | `undefined` 值行为依 http-proxy 版本 | 未设 key 时用条件展开避免传 undefined 键 |
| iam `utils/http.ts` | 该文件是双态契约核心（此前任务明确不动过） | 本次改动仅 +3 行拦截器内注入，不动既有分支 |

回滚：整体 revert；`.gitignore` 与 env 文件必须同批（见 design 回滚节）。

## `task.py start` 前的待确认项

（无——范围与注入点均已经用户确认）
