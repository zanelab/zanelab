# skills-web 权限组件对齐 iam-web（纯 getProps 快照）

## Goal

skills-web 的权限判断系统与 iam-web 不一致（订阅式权限内核 vs 纯快照读取），
造成跨应用实现分叉。将 skills-web 的 Permission 组件对齐 iam-web 的实现：
数据源统一为 `getProps().permissions`，删除订阅机制。

## Background / Confirmed facts

- **F1 · iam-web 形态（目标）**：`apps/iam-web/src/components/Permission.tsx` +
  `apps/iam-web/src/props.ts`。组件每次渲染直接读 `getProps().permissions`；
  `undefined` = 独立态 → 一律渲染；命中权限码或含 `*` 放行；mode='hide' 不渲染
  / mode='disabled' 用 span（pointer-events-none + opacity-40 + aria-disabled）包裹。
- **F2 · skills-web 现状**：
  - `apps/skills-web/src/utils/permission.ts`：模块级权限内核（setPermissions /
    hasPermission / bindHostPermissions），支持宿主 onHostStateChange 推送晚到的权限；
  - `apps/skills-web/src/hooks/use-permissions.ts`：useSyncExternalStore 订阅绑定；
  - `apps/skills-web/src/components/permission.tsx`：cloneElement 式 disabled
    （Fragment 子元素有坑）、支持 fallback prop；
  - `apps/skills-web/src/utils/permission.test.ts`：内核单测；
  - `apps/skills-web/src/main.tsx`：bindHostPermissions 接线。
- **F3 · 订阅机制的原始动机**（permission.ts:69-71 注释）：防「挂载早于菜单加载 →
  permissions 为空数组 → 按钮隐藏到重挂载」竞态。
- **F4 · 竞态在宿主时序下不存在**：宿主 `apps/portal-web/src/micro/register.ts:32-46`
  bootstrapSession 先 fetchMenus 入库（含 permissions），之后才 setupMicroApps 注册
  子应用——子应用 mount 时 props.permissions getter 已是真值。iam-web 同宿主下用
  纯快照运行正常，无已知问题。
- **F5 · 消费方影响面**：`<Permission>` 唯一消费点
  `apps/skills-web/src/pages/marketplace/marketplace.tsx:140`，只用默认 hide 模式，
  未用 fallback / disabled。`apps/skills-web/src/pages/marketplace/toolbar/upload-button.tsx`
  仅注释提及。`marketplace.test.tsx` 中的权限相关测试需同步迁移。
- **F6 · qiankun update 生命周期**：宿主 subapp-layer 常驻容器不随路由重挂子应用；
  skills-web 的 `update() {}` 为空。权限变更后不 remount——与 iam-web 行为一致，
  可接受（前端隐藏是体验优化，后端 403 兜底）。

## Requirements

- **R1**：skills-web 的 `Permission` 组件重写为 iam-web 同构：读 `getProps().permissions`，
  判定逻辑（独立态放行 / `*` 通配 / code 命中）、hide 与 disabled（span 包裹）行为一致。
- **R2**：删除订阅式权限内核及其依赖：utils/permission.ts（或仅保留 getProps 所需
  最小部分）、hooks/use-permissions.ts、main.tsx 中 bindHostPermissions 接线与
  unmount 时的 setPermissions(undefined) 清理。
- **R3**：props 契约对齐：skills-web 的 props 声明（现 main.tsx 内联 SkillsProps）
  中 permissions 字段保留 getter 语义注释，与 iam-web props.ts 的口径一致。
- **R4**：测试迁移：utils/permission.test.ts 重写为针对新组件/新数据源的测试；
  marketplace.test.tsx 中权限相关用例同步调整；全部通过。
- **R5**：组件注释保留关键语义：独立态定义（permissions 非数组）、空数组≠独立态、
  「前端只隐藏、后端强制」的定位、与 iam-web 的同构关系。

## Out of scope

- 不改 iam-web、portal-web 任何代码。
- 不给 skills-web 增加 getProps 的 props.ts 独立模块（除非实现时发现 main.tsx
  import 链有 iam-web 注释所述的 jsdom 副作用问题，届时再抽——见 iam props.ts 头注释）。
- 不处理 qiankun update 生命周期的权限热更新（宿主推送机制一并删除，与 iam-web 一致）。

## Acceptance Criteria

- [ ] AC1：skills-web Permission 组件与 iam-web 版判定逻辑同构（独立态 / 通配 /
      hide / disabled-span），grep 不到 useSyncExternalStore / bindHostPermissions /
      onHostStateChange 残留。
- [ ] AC2：`pnpm --filter @zanelab/skills-web` tsc 0 错、测试全过、build 成功。
- [ ] AC3：marketplace 唯一消费点行为不变（hide 模式）。
- [ ] AC4：组件/模块注释说明与 iam-web 的同构关系及独立态语义。
