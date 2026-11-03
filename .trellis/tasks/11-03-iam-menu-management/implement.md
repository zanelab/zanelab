# Implement — iam-web 菜单管理（全栈）

> 设计依据：[design.md](./design.md)（DD1–DD8）。顺序：数据底座 → 后端 → 前端（api → 纯函数 →
> 页面）→ mock → 测试 → 文档。每步之后代码可构建。

## 执行清单

- [ ] **S1 · 迁移文件（DD1）**
  - 新建 `apps/iam-web/supabase/migrations/0001_rbac_init.sql`：
    四表（menus/roles/user_roles/role_permissions，字段按 DD1）+ `roles`/`role_permissions`
    种子（admin: `*` + `system:menu:*` 四码；guest: 无）+ `handle_new_user()` 触发器
    （首个注册用户 → admin，其余 → guest）。
  - 本地验证：`cd apps/iam-web/supabase && supabase start && supabase db reset`，studio 里
    确认表/种子存在（AI 可跑；若本机未装 supabase CLI 则标注跳过，S4 的联调改 mock 验证）。

- [ ] **S2 · Edge Fn 菜单端点（DD2/DD3）**
  - `supabase/functions/iam/index.ts`：`GET /auth/menus`（匿名→游客子集；JWT→按
    `role_permissions` 过滤，admin 通配全量）+ `POST /menus` + `PUT /menus/:id` +
    `DELETE /menus/:id`（写端点：无 JWT → 1010/401；非 admin → 1011/403；code 重复 →
    1012/400）。
  - 游客子集 SQL：`hidden=false AND scopes @> '{O}'` + 无权限要求 + 祖先链（DD3 规则 1）。
  - i18n 键：`unauthorized`/`forbidden`/`codeExists`/`menuNotFound`（zh/en 两套文案）。
  - 文件头端点注释与 config.toml 部署验证 curl 同步补菜单条目。

- [ ] **S3 · 前端 api 层（DD4）**
  - `endpoints.ts`：`MENUS_LIST_PATH` / `MENUS_COLLECTION_PATH` / `MENUS_ITEM_PATH(id)`
    （零 import 约定不变）。
  - `api/menus.ts`：`MenuItemRecord` 类型（对齐 RawMenuItem，注释来源）+ `menusApi`
    命名空间对象（list/create/update/remove；沿用 throw Error(msg) 语义）。

- [ ] **S4 · 树操作纯函数 + 页面（DD5）**
  - `utils/menu-tree.ts`：`buildTree(flat)`（pid→children，sort 稳定排序）/ `flatten(tree)` /
    `countDescendants(flat, id)`。
  - `pages/MenuManagementPage.tsx`：树形表格 + 新增/编辑 modal + 删除确认 modal（级联数量
    警告）+ 403 后置只读。daisyUI 组件写前查 skill 指南（table/modal/validator/select/toggle）。
  - `App.tsx`：加 `<Route path="menus" ...>`；SystemPage 保留。

- [ ] **S5 · 测试栈（DD7）**
  - devDeps：vitest / jsdom / @testing-library/react / user-event / jest-dom（版本对齐
    portal-web）；`vitest.config.ts`（jsdom + setup）；`src/test/setup.ts`；
    `src/mocks/server.ts`（setupServer 挂 otp+menu handlers）。
  - 测试：`utils/menu-tree.test.ts`（纯函数三件套）、`api/menus.test.ts`（stub http 层测
    归一化/错误提取）、`pages/MenuManagementPage.test.tsx`（MSW 下：渲染树/新增/删除/
    游客只读）。

- [ ] **S6 · mock handlers（DD6）**
  - `mocks/menu-handlers.ts`：内存种子（portal mock 菜单同款）+ CRUD；`Authorization`
    判身份（无/Bearer mock-guest → 只读+403；Bearer mock-admin → 全量+可写）。

- [ ] **S7 · 文档（R7）**
  - README：本地栈步骤（start/db reset/serve）、CRUD curl、mock 身份切换说明。
  - spec：`microfrontend-guidelines.md` 或 `http-api-guidelines.md` 增补「子应用业务域 +
    RBAC 初始化 + 不启 RLS 的边界（将来直查 DB 必须先补 RLS，DD8）」。

- [ ] **S8 · 自查与验证**
  - `grep -rn "functions/v1" apps/iam-web/src` 命中仅 `src/api/` 与 `src/mocks/`（AC6）。
  - `pnpm --filter @zanelab/iam-web test`（新栈首跑）、两 app build/lint（AC7）。
  - 本地栈联调（S1 已验证过迁移则跳过重复步骤）。

## 验证命令

```bash
# 迁移 + 本地栈（S1）
cd apps/iam-web/supabase && supabase start && supabase db reset

# 后端类型（S2 无独立 tsc，靠 S5 的 vitest 与 S8 的 build 兜）
pnpm --filter @zanelab/iam-web exec tsc --noEmit

# 前端全链（AC7）
pnpm --filter @zanelab/iam-web test
pnpm --filter @zanelab/iam-web build
pnpm --filter @zanelab/portal-web build

# 路径收敛（AC6）
grep -rn "functions/v1" apps/iam-web/src | grep -v "src/api/\|src/mocks/"   # 期望空
```

**手动端到端（AC1–AC5 的非自动部分）**：
1. mock 路线：`VITE_USE_MOCK=true pnpm dev`（:8081）→ `/menus` 走 CRUD（admin 身份：
   localStorage `iam_token=mock-admin`）；清 token → 游客只读。
2. 本地栈路线：`supabase functions serve iam --no-verify-jwt` + 页面直连 → 注册两用户验
   admin/guest 分配（AC4）→ CRUD 落表。

## 风险文件与回滚点

| 位置 | 风险 | 处置 |
|---|---|---|
| `migrations/0001_rbac_init.sql` | 触发器写错会阻断所有用户注册（auth.users hook） | S1 本地 db reset + OTP 登录实测后再进 S2 |
| `functions/iam/index.ts` | 单文件多端点，改动集中；OTP 端点是生产路径 | 新端点代码独立分节，OTP 区块不动；S2 后跑既有 OTP curl 验证不回归 |
| `App.tsx` / `main.tsx` | 路由/入口是双态生命线 | 仅加 Route，不动 render/生命周期 |
| 测试栈引入 | devDeps 一批 + vitest 配置与 qiankun 插件的兼容性（portal 无 qiankun） | 若 vite-plugin-qiankun 与 vitest 冲突，test 环境绕过 qiankun 入口（仅测页面组件，不测 main.tsx） |

回滚：单 revert；迁移回滚 = `supabase db reset`（本地）；云上未部署无影响。

## `task.py start` 前的待确认项

- DD1 级联删除与双 admin 并发窗口（已记录，接受则无需回复）。
- DD8 不启 RLS 的边界（将来直查 DB 必须补）。
