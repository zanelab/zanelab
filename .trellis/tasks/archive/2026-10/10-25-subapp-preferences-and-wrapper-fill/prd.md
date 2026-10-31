# subapp-preferences-and-container-fill

## Goal

1. qiankun 基座给子应用下发 props 时带上偏好设置（主题模式、主题色、圆角、字体大小、灰色模式、色弱模式等），让子应用感知基座外观设定。
2. 子应用容器 `subapp-xxx-container` 下 qiankun 自动生成的第一层容器 `__qiankun_microapp_wrapper_for_xxx__` 需要填满父容器。

## Background

### 需求 1：偏好设置下发

- 基座外观状态集中在 `apps/portal-web/src/stores/preferences-store.ts` 的 `theme` 分组（`mode` / `builtinType` / `colorPrimary` / `colorDestructive` / `colorSuccess` / `colorWarning` / `radius` / `fontSize` / `semiDarkXxx`）与 `app` 分组的 `colorGrayMode` / `colorWeakMode` / `locale`。
- 子应用当前经 props 拿到 token / permissions / locale / getHostState / onHostStateChange（`apps/portal-web/src/micro/register.ts` 的 `setupMicroApps`），但**没有任何外观设定**——子应用只能靠 `experimentalStyleIsolation` 隔离出的自身默认样式渲染，与基座主题（暗色、主题色、圆角等）脱节。
- 全局状态通道（`snapshot()` + `onHostStateChange`，register.ts `── 宿主状态 ──` 段）目前只含 token / user / permissions / locale，外观变化不会推送到子应用。

### 需求 2：qiankun wrapper 填满容器

- qiankun 挂载子应用时会在基座容器（`subapp-<appName>`，见 `apps/portal-web/src/micro/subapp-layer.tsx` 的 `containerId`）内自动插入一层 `<div id="__qiankun_microapp_wrapper_for_<appName>__">`，子应用渲染在该 wrapper 内。
- 基座容器是 `absolute inset-0`（subapp-layer.tsx），但 wrapper 没有任何高度约束——子应用若使用 `height: 100%` 布局会得到 0 高或塌陷，滚动/弹层定位随之异常。

## Requirements

### R1 偏好设置随 props 下发

- `setupMicroApps` 的 props 新增 `preferences` 外观子集，字段至少覆盖：
  - `theme.mode`（`'light' | 'dark' | 'auto'`，子应用可派生自身 `data-theme`）
  - `theme.colorPrimary` / `colorDestructive` / `colorSuccess` / `colorWarning`（hsl 字符串）
  - `theme.radius` / `theme.fontSize`
  - `app.colorGrayMode` / `app.colorWeakMode`
  - `app.locale`（已有，纳入同一子集保持一次取全）
- 采用 **getter 语义**（与现有 token/permissions/locale 一致）：子应用每次 mount 读 store 最新值，避免注册瞬间快照冻结。
- 运行时变更（子应用存活期间用户在基座偏好面板改主题）：经**既有全局状态通道**推送——`snapshot()` 扩充同一外观子集，`onHostStateChange` 订阅方自动收到；基座侧在偏好变更时已有派发链路（`usePreferencesStore` 订阅，见 register.ts host-state 同步段），只需把外观字段纳入快照并确认派发触发。
- 子集只含外观字段（§9.4 原则：不灌整个 store）。
- 不要求本任务实现子应用侧消费逻辑（iam-web/home-web 如何消费由后续任务定），仅要求基座下发 + 契约字段经 `@zanelab/types` 或类型注释可查。

### R2 qiankun wrapper 填满父容器

- `subapp-<appName>` 容器内的 `__qiankun_microapp_wrapper_for_<appName>__` 一层必须占满容器（`height: 100%`；如需 `width: 100%` 一并确认）。
- 实现位置基座侧：`apps/portal-web/src/index.css`（或 subapp-layer 相关样式）按 `[id^='__qiankun_microapp_wrapper']` / `[data-subapp] > div` 选择器统一约束，避免逐子应用硬编码。
- 容器本身 `absolute inset-0` 不变；wrapper 填满后子应用自身 `height: 100%` 布局即获得正确高度。

## Acceptance Criteria

- [ ] `setupMicroApps` props 含 `preferences` 外观子集（getter），字段见 R1；子应用 mount 时可读取。
- [ ] 基座存活期间修改主题色 / 暗色模式 / 灰色模式 / 色弱模式 / 圆角 / 字体大小，经 `onHostStateChange` 推送，订阅的子应用收到含最新外观的快照。
- [ ] 快照仅含外观 + 既有跨应用字段，无全量 store 灌入。
- [ ] DOM 检查：`subapp-<appName>` 容器内 wrapper 的 `getBoundingClientRect` 高度等于容器高度（0 缩放、无塌陷）。
- [ ] wrapper 样式约束在基座 CSS 集中定义，子应用无论几个均生效。
- [ ] portal-web `tsc` / `vitest` / `oxlint` 全绿；wrapper 填满有测试覆盖（jsdom getBoundingClientRect 模拟或快照类断言）。

## Notes

- 现有 props 契约注释（register.ts:141-170 与 09-08 任务遗留）需同步更新。
- `experimentalStyleIsolation: true` 与子应用消费 CSS 变量的方式不冲突（隔离作用于选择器作用域，变量值由子应用自行写入其根节点）——消费契约留给子应用侧任务。
- wrapper 选择器若影响 login 等布局外挂载点（若有），需在实现时确认挂载容器全集。
