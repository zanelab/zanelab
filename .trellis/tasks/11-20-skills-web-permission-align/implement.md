# 执行计划：skills-web 权限组件对齐 iam-web

轻量任务（PRD-only + 本清单），改动集中在 apps/skills-web。

## 步骤

### S1. 重写 Permission 组件 `[main]`
`apps/skills-web/src/components/permission.tsx` → iam-web 同构：
- 读 `getProps().permissions`（props 来自 main.tsx 现有 savedProps，需将 getProps
  从 main.tsx 导出或引入轻量 props 模块——优先直接从 main.tsx 导出，避免新文件；
  注意 iam props.ts 头注释的 jsdom import 链问题，skills-web 的 main.tsx 顶层有
  独立态 render({basename:'/'}) 副作用，若测试 import 组件连带执行入口则必须抽
  props 模块）。
- 判定：undefined → 渲染；includes('*') || includes(code) → 渲染；
  hide → null；disabled → span 包裹。
- 删除 fallback prop（iam-web 无此 prop；唯一消费点未用）。

### S2. 删除订阅内核 `[main]`
- 删 `apps/skills-web/src/utils/permission.ts`、`apps/skills-web/src/hooks/use-permissions.ts`；
- main.tsx：去 bindHostPermissions/setPermissions import 与接线（render/unmount
  中两处）、SkillsProps 中 onHostStateChange 字段（保留 permissions getter 注释）。

### S3. 测试迁移 `[main]`
- utils/permission.test.ts → 重写为 components/permission.test.tsx（判定矩阵：
  独立态 / 空数组 / 命中 / 通配 / hide / disabled）；
- marketplace.test.tsx 权限相关用例改为通过 setProps 注入权限码；
- 清理 hooks/use-permissions 的残留引用（grep 全 src）。

### S4. 验证 `[main]`（AC2/AC3）
```bash
pnpm --filter @zanelab/skills-web exec tsc --noEmit
pnpm --filter @zanelab/skills-web test
pnpm --filter @zanelab/skills-web build
grep -rn 'useSyncExternalStore\|bindHostPermissions\|onHostStateChange' apps/skills-web/src  # 空
```

## 回滚点

- S1–S3 均为单应用内改动，git checkout apps/skills-web 即回滚。

## 收尾

- commit（scope 按 commitlint 允许值选 project）；归档任务；journal 记录。
