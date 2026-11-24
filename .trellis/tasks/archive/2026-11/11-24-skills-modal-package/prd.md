# Modal 弹窗组件下沉 packages/ui + skills-web 表单弹窗消费改造

## Goal

把参考站（http://127.0.0.1:55422/，XPath `/html/body/div[5]`）的 modal 结构抽成
可复用组件下沉 `packages/ui`（方案 b：Modal 外壳 + 常用表单原语），skills-web 的
Skill 新建/编辑/删除弹窗改为消费；组件语义为**受控 open/onOpenChange**，支持
「异步提交成功才关、失败留在弹窗」与「点关闭钮即关」两种调用方语义。

## Background（仓库证据，已核实）

**参考站结构**（运行时 DOM 实测 + 参考站 CSS 提取）：

```
div[data-modal-host]                       ← 顶层宿主（无样式）
└─ div[data-modal-root]  fixed inset-0 z-[70] flex items-start justify-center
                          overflow-y-auto p-4 pt-[60px]
   ├─ div[data-modal-scrim]  animate-fade absolute inset-0 bg-[#f4f1e9]/60 backdrop-blur-sm
   └─ div[role=dialog][aria-modal][aria-labelledby]  animate-pop relative w-full max-w-[640px]
      overflow-hidden rounded-[22px] bg-white shadow-pop
      ├─ header：标题 h2 + 副标题 p + 圆形关闭钮（data-modal-close）
      ├─ 表单分节（data-step=1…，内含 Field/ChipCheck/ChipRadio/SectionFooter 内容）
      └─ footer 操作条：状态文案 + Cancel（data-modal-close）+ Submit
```

- 全链 **data-attribute 驱动、零第三方依赖**（无 Radix/HeadlessUI；纯 div + fixed 定位）
- 动画/阴影 token（参考站 CSS 值）：`animate-fade = .15s cubic-bezier(.4,0,.2,1) fade-in`
  （keyframes fade-in: opacity 0→1）；`animate-pop`（keyframes pop-in:
  opacity 0 + translateY(-6px) scale(.985) → 1）；`shadow-pop = 0 8px 30px 0 #12131329`
- 参考站的 `ink-40/50/65` 等灰阶 token 与 `border/foreground/background` 是该站
  自有设计系统值——**不搬**，skills-web 侧用既有 daisyUI 语义 token 替换
  （base-content/base-200/border 等）

**packages/ui 现状**：

- `src/form/` 已有叶子原语先例（Block/ToggleItem，零 store/config 依赖）；
  导出收口 `src/index.ts`；peerDeps 仅 react/react-dom（不能引 i18next/zustand
  之外的库——zustand 已是 dependency）
- 已有 AppIcon 体系（BUILTIN_ICONS 37 键 + 运行时注册表）；skills-web 市场页
  已在用 AppIcon（close/plus/edit/trash/heart/bookmark/download/search/monitor/
  presentation/video/photo 等标识符均可解析）
- 三 app 均 dependency `@zanelab/ui`；`Block` 组件当前**无 app 消费**（可安全
  并存不破坏）

**skills-web 现状**（`src/pages/marketplace/modal/skill-form-modal.tsx`，437 行）：

- iam 风格受控 `dialog.modal.modal-open`（daisyUI modal），两弹窗：
  SkillFormModal（新建/编辑双形态）+ DeleteConfirmModal
- 关键语义（必须保留）：异步提交成功才 `onSaved()`（页面重拉列表 + 关弹窗），
  失败留在弹窗内 `alert-error` 展示接口 msg；saving/deleting 期间按钮禁用 +
  spinner；初值只在「从关到开」时快照
- 现有测试锚定 `aria-labelledby="skill-form-title"` / `"skill-delete-title"`
  （jsdom 下 dialog 无隐式 role）

## Requirements

### R1 Modal 外壳组件（packages/ui/src/modal/）

- 新建 `src/modal/modal.tsx`（或等价命名）：受控 `open/onOpenChange` props；
  结构对齐参考站（host → root 定位层 → scrim → dialog 卡片）并保留
  data-modal-host/root/scrim data-attribute（便于测试与样式钩子）
- scrim 点击 / Escape → `onOpenChange(false)`；**关闭时机由调用方决定**——
  组件只回调，不自行卸载（受控语义；异步提交失败留在弹窗由此保证）
- 样式全部走 daisyUI/Tailwind 语义 token（不引入参考站 ink-*/#f4f1e9 等站点
  私有值）；圆角跟随 `--page-radius` 模式（skills-web 大容器既有约定），
  组件接收 className/width 等 slots 可定制
- 动画（animate-fade/anim-pop 类 + keyframes）随组件进入 packages/ui
  （keyframes 定义放组件内联 `<style>` 或 ui 包样式入口，二选一 design 定）
- 关闭钮用 AppIcon（icon 键缺省 'x' 类既有字形；无则补 BUILTIN_ICONS）

### R2 表单原语（方案 b 范围）

按参考站结构抽**通用**表单原语进 `packages/ui/src/form/`（或 modal 目录，
design 定）：

- **Field**：label + 控件 + 可选 hint/required 标记 + 可选错误文案的布局壳
- **ChipCheck / ChipSelect**：胶囊多选/单选组（参考站 radio/checkbox 胶囊形，
  `peer sr-only` 模式），受控 `selected[]/onToggle`
- **SectionFooter / ModalActions**：弹窗底部操作条布局（左状态文案 + 右按钮组）
- 原语零业务语义（不 import skills-web 任何模块、不含 t() 调用——label 由
  调用方传入）

### R3 skills-web 消费改造

- `skill-form-modal.tsx` 改为消费 R1/R2 组件（SkillFormModal + DeleteConfirmModal
  对外 props 契约不变：open/editing/target/onClose/onSaved）
- 表单文案仍走 t()（skills.form.* 语言包段不动）；权限守卫仍在入口层不动
- 视觉对齐参考站形态（卡片圆角/阴影/scrim 毛玻璃/动画），色值映射到 daisyUI
  语义 token

### R4 质量与回归

- packages/ui：tsc + oxlint 通过（ui 包无测试基建，不新增）
- skills-web：既有弹窗测试全部保持语义等价改造（aria-labelledby 锚点可保留
  或平移到新结构 data 属性，断言不弱化）；CRUD 链/401 失败/权限显隐用例全过
- 三包（ui / skills-web / portal-web、iam-web 因依赖 ui 需连带验证）tsc/build
  全绿

## Out of Scope

- iam-web / portal-web 既有弹窗改造（本任务只做 ui 包组件 + skills-web 消费；
  iam RoleManagementPage 的 daisyUI modal 迁移留后续任务）
- 参考站 ink-*/米色系 token 搬运（用语义 token 映射替代）
- 服务端校验、字段级实时校验（维持现状：title 必填提交时校验）
- 文件上传（参考站 SKILL.md 拖拽区不搬——skills 表单无此字段）

## Acceptance Criteria

- [ ] AC1：packages/ui 导出 Modal 外壳 + Field/ChipCheck/ChipSelect/ModalActions
      原语；结构含 data-modal-host/root/scrim 与 role=dialog/aria-modal；
      零第三方运行时依赖（react/react-dom/zustand/@zanelab-types 之外）
- [ ] AC2：受控语义——open=false 不挂载；onOpenChange(false) 由 scrim 点击/
      Escape/关闭钮触发；组件不在内部自行关闭（异步提交失败留在弹窗的调用方
      语义可用组件实现）
- [ ] AC3：SkillFormModal/DeleteConfirmModal 改为消费新组件，对外 props 与
      行为（成功才 onSaved、失败 alert、saving 禁用）不变；既有 CRUD/权限/
      401 测试语义等价全过
- [ ] AC4：视觉对齐参考站（scrim 毛玻璃 + pop/fade 动画 + 卡片阴影 + 圆角跟
      随 --page-radius）；色值全部为 daisyUI 语义 token，无参考站私有值
- [ ] AC5：packages/ui、skills-web、portal-web、iam-web 四包 tsc/build/lint
      全绿；skills-web vitest 全过

## Key Decisions

- **D1 方案 b 粒度**（用户决策 2026-11-24）：Modal 外壳 + 通用表单原语
  （Field/ChipCheck/ChipSelect/ModalActions）下沉；不做整表单搬运
- **D2 受控 open/onOpenChange 语义**（用户确认 2026-11-24）：两种关闭语义
  （即时关 / 异步成功才关）都由调用方经 onOpenChange 控制，组件不内藏提交逻辑

## Open Questions

- 无阻塞项（组件命名/目录/动画落点等技术选型留给 design.md）
