# Design — AppIcon 图标体系下沉 packages/ui

> 事实与需求见 [prd.md](./prd.md)。本文件记录迁移边界与关键权衡。

## 决策记录

### DD1 · 整体下沉（store 一并迁，而非只迁纯组件）

`AppIcon` 的运行时注册表 `useIconStore` 与渲染组件是强耦合（组件订阅 store 实现「配置后补渲染」的响应式）。只迁纯组件、把 store 留在 portal，会让 `packages/ui` 的 AppIcon 失去响应式，且 portal 每处调用都要手动把 `icons` 当 prop 传（约 15 处 churn）。

**决定**：`app-icon.tsx`、`builtin-icons.ts`、`icon-store.ts` 三者整体迁到 `packages/ui/src/icon/`，`@zanelab/ui` 统一导出。portal/iam 各自 import 同一份代码（各自独立 store 实例，见 DD4）。

### DD2 · initIcons 解耦配置

`initIcons` 现在 import `appConfig`（`appConfig.icons` + `appConfig.iconPackUrl`）。下沉后 `packages/ui` 不依赖任何 app 的 config。

**决定**：`initIcons({ icons?, iconPackUrl? })` 收参数。portal 的 `main.tsx` 里 `initIcons({ icons: appConfig.icons, iconPackUrl: appConfig.iconPackUrl })`。iam 独立态不调（无图标包），仅用 BUILTIN_ICONS + `svg:`。

### DD3 · 导出与 import 迁移

- `packages/ui/src/index.ts` 新增导出：`AppIcon`、`renderMenuIcon`、`useIconStore`、`initIcons`。
- portal 的 `@/components/icons/app-icon`、`@/stores/icon-store` 全部改 `@zanelab/ui`；原两个文件删除（不保留 re-export——避免双份真源与「改了一处漏一处」）。
- `BUILTIN_ICONS` 不对外导出（内部实现，AppIcon 内部解析；若 iam 后续需要可再加）。

### DD4 · 解析顺序与渲染形态不变

保持：注册表 `icons` → `BUILTIN_ICONS` → `svg:` 直通（`svg:` 后 `|` 分段）→ null。
保持 `IconSvg` 的 fill 模式（`data.fill`）与 stroke 模式（`fill:none + stroke currentColor`）两态，`viewBox` 默认 `0 0 24 24`，事件透传 `onClick`。

### DD5 · iam 图标列 + activeIcon 兜底

`MenuManagementPage` 图标列：

- `node.icon` 有值 → `<AppIcon name={node.icon} />`。
- hover 切 activeIcon：用 CSS `group/ic` + `group-hover/ic:` 切换两个 `<AppIcon name={node.icon} />` / `<AppIcon name={node.activeIcon} />`（`activeIcon` 为空则只渲染 icon）。
- `AppIcon` 解析不到（activeIcon 不在 BUILTIN_ICONS 且无注册表）→ 返回 null，该态自动 fallback：hover 不换（仍显示 icon）。

## 改动边界

| 文件 | 改动 |
|---|---|
| `packages/ui/src/icon/app-icon.tsx` | 新建（迁自 portal app-icon） |
| `packages/ui/src/icon/builtin-icons.ts` | 新建（迁自 portal builtin-icons） |
| `packages/ui/src/icon/icon-store.ts` | 新建（迁自 portal icon-store；initIcons 收参数） |
| `packages/ui/src/index.ts` | 导出 AppIcon/renderMenuIcon/useIconStore/initIcons |
| `packages/ui/package.json` | 加 `zustand`、`@zanelab/types` 依赖 |
| `apps/portal-web/src/main.tsx` | `initIcons({ icons, iconPackUrl })` 接线 |
| `apps/portal-web/src/**`（~15 处） | `@/components/icons/app-icon` / `@/stores/icon-store` → `@zanelab/ui` |
| `apps/portal-web/src/components/icons/app-icon.tsx`、`builtin-icons.ts` | 删除 |
| `apps/portal-web/src/stores/icon-store.ts` | 删除 |
| `apps/iam-web/src/pages/MenuManagementPage.tsx` | 图标列改 `<AppIcon>`，hover 切 activeIcon |

## 相容性与风险

- **图标注册表跨 bundle 不共享**：qiankun 里 portal 与 iam 是两份 bundle，各自 `useIconStore` 独立。iam 拿不到 portal 的 iconPackUrl 注册结果 → 只有 BUILTIN_ICONS + `svg:` 可用。菜单种子的 `home`/`system` 在内置表内，够用；`home-active`/`system-active` 不在，暂 fallback（AC2 已含）。将来若要子应用用宿主动态图标，走 `window.__registerIcons` 或 props 注入（另起任务）。
- **import 迁移是体力活**：portal ~15 处 import 逐个改，漏一处即运行期 `undefined`。用 tsc + 全量测试兜底；grep 确认 `components/icons/app-icon`、`stores/icon-store` 零残留。
- **回滚**：revert 提交即可（纯文件搬迁 + import 改路径，无 schema/数据变更）。
