# AppIcon 图标组件提升到 packages/ui（跨 app 共享）

## Goal

把 portal-web 的 `AppIcon` / `BUILTIN_ICONS` / 图标注册表这一整套图标体系下沉到 `packages/ui`，让 iam-web 子应用的菜单图标列能复用同一套图标渲染（而不是显示 icon 名字的 badge），同时消除「跨 app import」违反。

## 背景（已确认事实）

- `AppIcon` 现位于 `apps/portal-web/src/components/icons/app-icon.tsx`，依赖 `stores/icon-store.ts`（zustand 注册表）与 `builtin-icons.ts`；`IconData`/`IconDataSchema` 已在 `@zanelab/types`。
- 项目铁律：`apps/*` 之间不能互相 import，跨 app 共享必须下沉 `packages/*`。
- portal 侧约 15 处 `import { AppIcon } from '@/components/icons/app-icon'`（App、tabs、iframe 等）。
- iam-web 菜单页图标列当前用 badge 显示 icon 名（上一任务临时方案），因无法 import portal 的 AppIcon。

## Requirements

- **R1 · 图标体系下沉**：`AppIcon`、`IconSvg`、`resolveIconData`、`renderMenuIcon`、`BUILTIN_ICONS`、`useIconStore`/`initIcons` 整体迁到 `packages/ui`（如 `src/icon/`），对外从 `@zanelab/ui` 导出。
- **R2 · 解耦运行时配置**：`initIcons` 不再 import portal 的 `appConfig`，改为收参数 `{ icons?, iconPackUrl? }`；portal 在 `main.tsx` 里传 `appConfig.icons` / `appConfig.iconPackUrl`。
- **R3 · portal 切 import**：portal 内所有 `@/components/icons/app-icon`、`@/stores/icon-store` 改指向 `@zanelab/ui`；删除原文件（或留 re-export 兼容，见 design）。
- **R4 · iam 图标列复用**：`MenuManagementPage` 图标列改用 `AppIcon` 渲染真实 SVG（`node.icon`；hover 有 activeIcon 时切 `node.activeIcon`），替换现有 badge。
- **R5 · 解析语义不变**：注册表 → BUILTIN_ICONS → `svg:` 直通 → null 的解析顺序、`fill`/`stroke` 两种渲染形态、事件透传（onClick）保持原样。
- **R6 · 测试**：迁移后的 AppIcon 解析顺序单测 + iam 图标列渲染断言；portal/iam/`packages/ui` 三处 tsc 全绿。

## Acceptance Criteria

- [ ] **AC1** iam-web 从 `@zanelab/ui` import `AppIcon`，无任何跨 app import。
- [ ] **AC2** 菜单图标列对 `home`/`system`（BUILTIN_ICONS 内）渲染出 SVG；hover 有 `activeIcon` 且可解析时切换展示，解析不到则保持原 icon 或空。
- [ ] **AC3** portal 迁移 import 后侧边栏/tabbar/iframe 等图标渲染与迁移前一致（无丢失、无错位）。
- [ ] **AC4** `pnpm --filter @zanelab/ui build` + portal-web/iam-web `tsc --noEmit` + 两端测试全绿。

## Out of Scope

- 运行时注册表（iconPackUrl）在 qiankun 宿主↔子应用间的**实时共享**：宿主与子应用是独立 bundle、独立 store 实例，子应用不会自动拿到宿主的远端图标包。本任务只保证 `BUILTIN_ICONS` + `svg:` 直通可用；`active_icon`（`home-active` 等）目前不在内置表，暂 fallback 到 icon，后续再按需经 props / `window.__registerIcons` 打通（另起任务）。
