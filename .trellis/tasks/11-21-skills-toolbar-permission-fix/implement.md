# 执行计划：工具栏胶囊样式 + admin 权限链路

## 步骤

### S1. 样式统一（R1）`[main]`
- marketplace.tsx:100-108（小屏筛选按钮）与 112-124（桌面收起筛选）：
  `btn btn-outline btn-sm gap-1.5` → sort-tabs 同款（h-8 rounded-full
  border border-base-300 bg-base-100 px-3.5 text-[13px] font-semibold
  gap-1.5，hover 协调；保留 badge 计数与 AppIcon）。
- search-input.tsx:23：外层 `input input-sm` → 同款胶囊容器
  （h-8 rounded-full border border-base-300 bg-base-100 px-3.5 +
  内部 input 裸化——注意 daisyUI「多元素用父容器 input 类」的形态仍成立，
  只是视觉参数自拼；或 input 类 + rounded-full 覆盖，实现时选更稳的）。
- category-menu.tsx:192：触发器同款胶囊（保留 focus-visible 焦点环类与
  chevron 图标）。
- 对齐基准只看 sort-tabs.tsx 的容器/项参数，不引新抽象（四个控件手写同款类，
  差异本就零星；如重复超预期可提一个 toolbar-capsule 常量放页面内）。

### S2. Edge Fn：当前用户权限码端点（R3）`[main]`
- apps/iam-web/supabase/functions/iam/index.ts：
  - 路由 `path.endsWith('/auth/permissions')` → authPermissions()；
  - 实现：resolveUser（无 JWT → 1010/401 同现有语义）→ userPermissions(ctx, id)
    → json(lang, { permissions: string[] })。
- 测试：现有 edge fn 测试形态先查（有没有 supabase functions 的 deno test；
  若无测试基建则 AC4 的端点测试落在 portal 侧 fetch 函数 mock 层，说明取舍）。

### S3. migration：skills 按钮节点（R2）`[main]`
- 新增 apps/iam-web/supabase/migrations/0006_seed_skills_button.sql：
  - 幂等：`where not exists (select 1 from menus where permission='skills:skill:create')`；
  - 找到 skills app 节点（component='skills'）作 pid；不存在则跳过（不硬造父节点）；
  - 字段对齐 0004 按钮行：type='button'、scopes='{A}'、hidden=false、sort=1。
- 本地验证：supabase migration up（或说明本地库如何应用）+ 重查 /auth/menus
  登录态出现该节点。若本地无法跑 migration，报告里说明待用户执行。

### S4. portal 合并链路（R3/R4）`[main]`
- api/menu.ts（或 api/auth.ts，看端点归属）：新增 MY_PERMISSIONS_ENDPOINT 常量 +
  fetchMyPermissions(): Promise<string[]>。
- micro/register.ts：bootstrapSession 与 restoreSession 在 setMenus 后
  （或 Promise.allSettled 并行）拉 fetchMyPermissions → mergePermissions；
  失败 console.warn 不阻塞。注意：clearMenus 后 permissions 清空——登出链路
  无需拉取；handleLogout 后不残留 '*'（mergePermissions 是增量——**登出时会
  clearMenus 清掉，确认无泄漏路径**；若有，在 logout 处理）。
- 测试：register 或 menu 层补合并链路用例（成功合并 / fetch 失败不阻塞）。

### S5. 验证 `[main]`
```bash
pnpm --filter @zanelab/portal-web exec tsc --noEmit && pnpm --filter @zanelab/portal-web test
pnpm --filter @zanelab/iam-web exec tsc --noEmit && pnpm --filter @zanelab/iam-web test
pnpm --filter @zanelab/skills-web exec tsc --noEmit && pnpm --filter @zanelab/skills-web test
```
浏览器实测（主会话收尾做）：AC1 样式截图、AC2 admin 上传入口、AC3 guest 无入口。

## 回滚点

单 commit；migration 独立文件可单独 revert。

## 收尾

commit → spec 沉淀（前端权限 = 菜单派生 ∪ 角色并集的口径写进 component-guidelines
权限码同源节）→ 归档 → journal。
