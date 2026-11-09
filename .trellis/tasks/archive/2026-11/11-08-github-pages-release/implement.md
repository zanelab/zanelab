# Implement — GitHub Pages 发布流程

## 执行清单

- [x] **S1 · iam api 前缀参数化（R5，代码改动）**（2026-11-09 完成并验证）
  - props.ts 加 `apiPrefix?: string`；共享助手落位 `apps/iam-web/src/api/prefix.ts`（纯函数 + store 形态）
  - auth/menus/users/roles 四域统一切换（勘察发现 users/roles 是同款复制）；endpoints/LoginPage/otp-handlers 仅注释对齐
  - 单测 prefix.test.ts 9 例（四分支 + 尾斜杠 + 脏值回退 + store 形态）
  - 验证：iam tsc ✓ / 51 测试 ✓ / build ✓；portal tsc -b ✓；dev 行为不变论证见子代理报告

- [x] **S2 · patch-config.mjs（R4）**（2026-11-09 完成并验证）
  - 提取/求值/改写/回写 + --dry-run；幂等两遍 byte-identical；序列化对齐仓库风格（无引号键/单引号值）
  - 补丁：空 --api-base-url/--api-key fail-fast（防 CI vars 未配置时静默产出 401 站点）
  - 仓库原文件零触碰

- [x] **S3 · assemble.mjs（R2）**（2026-11-09 完成并验证）
  - 三 dist → stage 布局 + 404.html + .nojekyll；--check 校验布局与 /iam/、/home/ 资产前缀
  - 实测：iam/home --base 构建后内联 import('/iam/assets/…')，check 通过；三端 assets 目录隔离

- [x] **S4 · push-pages.mjs + deploy-pages.yml（R1/R6）**（2026-11-09 完成并验证）
  - push-pages：PRESERVE CNAME/README/.github；幂等空提交跳过；bare 仓模拟验证（占位页替换、CNAME 保留）
  - workflow：tag v* + workflow_dispatch；build→assemble→patch→check→push；YAML 用 yaml@2.9.1 解析验证
  - owner 一次性准备清单在 workflow 头注释（fine-grained PAT → GIT_TOKEN secret；SUPABASE_URL/API_KEY variables）

- [ ] **S5 · 全量校验（Phase 2.2 last-iteration）**（trellis-check 进行中）
  - 已跑：turbo build/test/lint 全绿（iam 51 测试含 prefix 9 例）

## 验证命令汇总

```bash
pnpm --filter @zanelab/iam-web test
pnpm --filter @zanelab/iam-web exec tsc --noEmit
node scripts/deploy/patch-config.mjs ... --dry-run   # S2
node scripts/deploy/assemble.mjs --check             # S3（若实现 --check）
pnpm turbo build test lint                            # S5
```

## 风险文件与回滚点

| 位置 | 风险 | 处置 |
|---|---|---|
| `apps/iam-web/src/api/{auth,menus}.ts` | 前缀派生改动破坏 dev 集成态 | 显式 prop 优先 + 缺省回退原逻辑；dev 不传 prop 行为不变；单测锁死三分支 |
| `scripts/deploy/patch-config.mjs` | 解析失败/改写错字段 | fail-fast（解析异常即 exit 1）；`--dry-run` 本地预览；幂等性单测 |
| `.github/workflows/deploy-pages.yml` | 部署仓库误伤（CNAME 丢失/清库） | assemble 只操作 stage；push 前显式保留 CNAME/README；首次 tag 前可 workflow_dispatch 验证 |
| 部署仓库（zanelab.github.io） | 推送失败（token 权限） | 失败信息指向 AC6 准备清单；不影响源仓库任何状态 |

回滚：整个任务无 schema/数据变更；站点回滚 = revert 部署仓库提交；代码回滚 = 常规 revert PR。

## start 前检查

- [x] prd.md 收敛（Open Questions 空）
- [x] design.md / implement.md 就位
- [ ] implement.jsonl / check.jsonl 各 ≥1 条真实 spec 条目
- [ ] 用户对最终规划摘要明确批准
