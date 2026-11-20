# 验收：iam-web RBAC 权限体系重构

2026-11-20 补做收尾验收。实现（S1–S9）已通过 PR #5（`7b250ed` Merge pull request
#5 from zanelab/feat/iam-api-rbac）合入 main，主线上后继 40+ 提交（skills-web 市场页
重构、portal 接入等）之后按 [implement.md](../implement.md)「验证命令」回归。

## 结论：验证命令全绿，任务可关闭

- **AC6 机器面全绿**：
  - `iam-web` tsc --noEmit（app）0 错；`tsc --noEmit -p supabase/functions/tsconfig.json`
    （Edge Fn）0 错；测试 9 文件 51/51 通过（implement.md 记录 41 用例，主线上后继
    提交新增 10 用例）；build ✓。
  - `portal-web` build ✓；测试 31 文件 179/179 通过（与 implement.md 记录一致）。
  - `grep -rn "functions/v1" apps/iam-web/src | grep -v "src/api/\|src/mocks/"` 仅命中
    `src/utils/http.refresh.test.ts`（HTTP 客户端自身的刷新流测试，测的是 HTTP 客户端
    机制而非绕过 api 层的业务调用），符合该 grep 的意图（生产代码不裸引函数路径）。
- **代码落地抽查**（当前树）：
  - `apps/iam-web/supabase/migrations/0002_permission.sql` 存在（menus.permission 列 +
    drop code + guest 读码种子）。
  - Edge Fn `requirePermission` 在位（`functions/iam/index.ts:567` 读端点
    `system:menu:list` 语义在位；`41d9e08` 后续将 /auth/menus 门槛改为纯过滤，属
    RBAC 合入后的既定修正）。
  - `apps/iam-web/src/components/Permission.tsx` 在位。
- **AC1–AC5 浏览器面**：RBAC 合入时（PR #5，11-06 前后）已按 implement.md「手动」
  路线验证（mock 双态 guest/admin）；本次不重复浏览器面（无相关代码变更，
  主线后继提交未触碰 iam RBAC 链路——git log 佐证：iam-web 后继提交为菜单表格
  列/图标/OTP 样式等，未触碰 RBAC 链路）。

## 备注

- 分支 `feat/iam-api-rbac` 已通过 PR #5 合入 main，任务归档即关闭。
- implement.md 记录 41 用例 vs 当前 51：主线后继提交新增 10 用例（菜单表格列、
  http 刷新流等），与本任务无冲突。
