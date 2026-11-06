# Implement — AppIcon 图标体系下沉 packages/ui

> 设计依据：[design.md](./design.md)（DD1–DD5）。顺序：建包 → 迁文件 → portal 接线 → iam 复用 → 验证。

## 执行清单

- [ ] **S1 · packages/ui 建 icon 目录 + 依赖**
  - `packages/ui/src/icon/` 下新建 `app-icon.tsx`、`builtin-icons.ts`、`icon-store.ts`（内容自 portal 平移）。
  - `app-icon.tsx` 的 `import { useIconStore } from '../../stores/icon-store'` → `./icon-store`；`BUILTIN_ICONS` → `./builtin-icons`。
  - `icon-store.ts` 去掉 `import { appConfig }`；`initIcons(params: { icons?: Record<string, IconData>; iconPackUrl?: string })` 内改用参数。
  - `packages/ui/package.json` 加 `zustand`、`@zanelab/types`（workspace:*）。
  - `packages/ui/src/index.ts` 导出 `AppIcon`、`renderMenuIcon`、`useIconStore`、`initIcons`。

- [ ] **S2 · portal 接线 + import 迁移**
  - `apps/portal-web/src/main.tsx`：`initIcons()` → `initIcons({ icons: appConfig.icons, iconPackUrl: appConfig.iconPackUrl })`。
  - 全局替换 `@/components/icons/app-icon` → `@zanelab/ui`；`@/stores/icon-store` → `@zanelab/ui`（注意 `useIconStore`/`initIcons` 的具名 import）。
  - 删 `apps/portal-web/src/components/icons/{app-icon,buitin-icons}.tsx`、`apps/portal-web/src/stores/icon-store.ts`。
  - `grep -rn "components/icons/app-icon\|stores/icon-store" apps/portal-web/src` 期望空。

- [ ] **S3 · iam 图标列复用 AppIcon**
  - `MenuManagementPage.tsx` import `AppIcon`（`@zanelab/ui`）。
  - 图标列：`<AppIcon name={node.icon} />`；hover 切 activeIcon（`group/ic` + 两个 `<AppIcon>` 显隐切换；activeIcon 空则只渲染 icon）。
  - 无 icon 显示 `—`（保持现状）。

- [ ] **S4 · 测试**
  - `packages/ui`：AppIcon 解析顺序（注册表 > builtin > svg: > null）+ fill/stroke 两态（迁 portal 现有 `app-icon.test.tsx` 或新写）。
  - iam `MenuManagementPage.test.tsx`：图标列对内置 icon 渲染 SVG、无 icon 显示 `—`、hover activeIcon 切换（若测试环境可测）。
  - 回归：portal 现有图标相关测试（tabs/iframe 等）全绿。

- [ ] **S5 · 验证命令**
  - `pnpm --filter @zanelab/ui build`
  - `pnpm --filter @zanelab/portal-web exec tsc --noEmit` + `pnpm --filter @zanelab/portal-web test`
  - `pnpm --filter @zanelab/iam-web exec tsc --noEmit` + `pnpm --filter @zanelab/iam-web test`
  - `grep -rn "components/icons/app-icon\|stores/icon-store" apps/portal-web/src`（期望空）

## 风险文件与回滚点

| 位置 | 风险 | 处置 |
|---|---|---|
| portal ~15 处 import | 漏改 → 运行期 undefined | S2 grep 零残留 + tsc + 测试兜底 |
| `initIcons` 签名变更 | portal 调用点未同步传参 → 图标不注册 | S2 同步改 main.tsx |
| 跨 bundle 注册表 | iam 拿不到宿主动态图标 | AC2 已含 fallback；activeIcon 解析不到保持 icon |

回滚：revert（纯搬迁 + import 改路径，无数据/schema 变更）。
