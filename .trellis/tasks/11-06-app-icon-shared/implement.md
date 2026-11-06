# Implement — AppIcon 图标体系下沉 packages/ui

> 设计依据：[design.md](./design.md)（DD1–DD5）。顺序：建包 → 迁文件 → portal 接线 → iam 复用 → 验证。

## 执行清单

- [x] **S1 · packages/ui 建 icon 目录 + 依赖**
  - `packages/ui/src/icon/` 下 `app-icon.tsx`、`builtin-icons.ts`、`icon-store.ts`（git mv 自 portal）。
  - `app-icon.tsx` import 改 `./icon-store` / `./builtin-icons`；`icon-store.ts` 去 `appConfig`，`initIcons` 收参数。
  - `packages/ui/package.json` 加 `zustand`、`@zanelab/types`；`index.ts` 导出 `AppIcon`/`renderMenuIcon`/`useIconStore`/`initIcons`/`BUILTIN_ICONS`。

- [x] **S2 · portal 接线 + import 迁移**
  - `main.tsx`：`initIcons({ icons: appConfig.icons, iconPackUrl: appConfig.iconPackUrl })`。
  - ~41 处 import（AppIcon/renderMenuIcon/useIconStore/initIcons）统一改 `@zanelab/ui`；原文件删除。
  - 两个测试文件（app-icon/builtin-icons/icon-store）留 portal（packages/ui 无 vitest 基建），import 改 `@zanelab/ui`。
  - `grep` 零残留。

- [x] **S3 · iam 图标列复用 AppIcon**
  - `MenuManagementPage.tsx` 图标列改 `<AppIcon>`；`renderableIcon` 判定 activeIcon 可解析才做 hover 切换（解析不到保持 icon，AC2 fallback）。

- [x] **S4 · 测试**
  - portal 三个图标测试（app-icon/builtin-icons/icon-store）迁移 import 后仍全绿；iam 图标列渲染正常。

- [x] **S5 · 验证命令**
  - `@zanelab/ui` typecheck + lint ✓；portal tsc + 179 测试 + build ✓；iam tsc + 41 测试 + build ✓；`grep` 零残留 ✓。

## 风险文件与回滚点

| 位置 | 风险 | 处置 |
|---|---|---|
| portal ~15 处 import | 漏改 → 运行期 undefined | S2 grep 零残留 + tsc + 测试兜底 |
| `initIcons` 签名变更 | portal 调用点未同步传参 → 图标不注册 | S2 同步改 main.tsx |
| 跨 bundle 注册表 | iam 拿不到宿主动态图标 | AC2 已含 fallback；activeIcon 解析不到保持 icon |

回滚：revert（纯搬迁 + import 改路径，无数据/schema 变更）。
