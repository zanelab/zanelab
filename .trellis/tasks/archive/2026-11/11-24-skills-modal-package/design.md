# Design — Modal 组件下沉 packages/ui + skills-web 消费改造

## 1. 架构与边界

```
packages/ui/src/
├── modal/
│   ├── modal.tsx          # Modal 外壳（host/root/scrim/dialog + 关闭钮）
│   ├── modal.css          # keyframes（fade-in/pop-in）+ 组件级样式
│   └── index.ts           # export { Modal }
├── form/
│   ├── block.tsx          # （既有，不动）
│   ├── toggle-item.tsx    # （既有，不动）
│   ├── field.tsx          # Field：label + hint/required + error + children
│   ├── chip.tsx           # ChipCheck / ChipSelect（胶囊多选/单选组）
│   ├── modal-actions.tsx  # ModalActions：底部操作条（status + buttons）
│   └── index.ts           # 追加导出
└── index.ts               # 追加 export * from './modal'
```

- **零耦合红线**（directory-structure「零耦合叶子组件」归属）：新组件只依赖
  react/react-dom/@zanelab/types（IconData）/内部 icon-store；不引 i18next、
  不读 stores/config、不含业务文案——label/hint/error 全部 props 传入
- 命名用**语义组件名**（Modal/Field/ChipCheck/ChipSelect/ModalActions），
  data-attribute 保留参考站的 `data-modal-host/root/scrim` 作为样式与测试钩子

## 2. 组件契约

### Modal（受控外壳）

```ts
interface ModalProps {
  open: boolean;                          // false 不挂载（return null）
  onOpenChange: (open: boolean) => void;  // scrim 点击 / Escape / 关闭钮触发
  labelledBy: string;                     // aria-labelledby（标题元素 id）
  title: ReactNode;                       // header 标题（h2）
  description?: ReactNode;                // header 副标题
  showClose?: boolean;                    // 缺省 true；圆形关闭钮
  widthClass?: string;                    // 卡片宽度（缺省 max-w-[640px]），
                                          // DeleteConfirm 传 max-w-[420px] 类
  children: ReactNode;                    // 卡片 body（表单分节由调用方组）
  footer?: ReactNode;                     // 卡片 footer（ModalActions 渲染物）
}
```

结构（对齐参考站）：

```tsx
<div data-modal-host>
  <div data-modal-root className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 pt-[60px]">
    <div data-modal-scrim className="animate-fade absolute inset-0 bg-black/40 backdrop-blur-sm"
         onClick={() => onOpenChange(false)} />
    <div role="dialog" aria-modal="true" aria-labelledby={labelledBy}
         className="animate-pop relative w-full overflow-hidden rounded-(--page-radius) bg-base-100 shadow-pop {widthClass}">
      <header .../>                     {/* title + description + 关闭钮 */}
      <div className="flex-1">{children}</div>
      {footer && <div className="border-t border-base-300 bg-base-200/50 px-5 py-4">{footer}</div>}
    </div>
  </div>
</div>
```

- **token 映射**（参考站值 → 本仓语义 token）：
  - `bg-[#f4f1e9]/60` → `bg-black/40`（中性遮罩，深浅色主题都成立）
  - `rounded-[22px]` → `rounded-(--page-radius)`（--page-radius 联动模式；
    独立态/非子应用消费方缺省 22px——组件内联 `style={{ '--page-radius': '22px' }}`
    兜底，子应用根上的变量自然覆盖）
  - `shadow-pop`、`animate-fade`、`animate-pop`、keyframes → 组件自带（modal.css）
  - `text-ink-50/65` → `text-base-content/60` 等透明度写法
  - `bg-white` → `bg-base-100`；`border-border` → `border-base-300`
- **Escape 处理**：open 期间 document 挂 keydown 监听（useEffect），Escape →
  `onOpenChange(false)`；不做焦点圈禁（保持轻量，与参考站一致）
- **滚动**：沿用参考站 root 层 `overflow-y-auto + items-start + pt-[60px]`
  （内容超高一屏时卡片可滚，不做 body 锁滚——弹窗内滚动即可）

### Field（布局壳）

```ts
interface FieldProps {
  label: ReactNode;
  required?: boolean;        // 显示 * 标记（不参与校验）
  hint?: ReactNode;          // label 下/控件下的说明文案
  error?: ReactNode;         // 错误文案（红色，有值才渲染）
  horizontal?: boolean;      // 缺省纵向（label 上控件下）；横向用于 checkbox 行
  children: ReactNode;
}
```

### ChipCheck / ChipSelect（胶囊选择组）

```ts
interface ChipGroupProps {
  label?: ReactNode;                 // 组标题（可选）
  options: Array<{ value: string; label: ReactNode; icon?: string }>;
  selected: string[];                // ChipSelect 时长度恒 0/1
  onToggle: (value: string) => void; // 调用方维护数组语义（组件不决定单/多）
  variant?: 'check' | 'select';      // 视觉相同，语义区分（aria role 用法）
}
```

- 胶囊样式对齐参考站：`peer sr-only` input + 圆角全边框胶囊 +
  `peer-checked:bg-primary peer-checked:text-primary-content`（参考站黑底白字
  → 语义 primary 映射，深浅主题成立）；icon 经 AppIcon 渲染（icon 键可选）

### ModalActions（底部操作条）

```ts
interface ModalActionsProps {
  status?: ReactNode;      // 左侧状态/错误文案
  children: ReactNode;     // 右侧按钮组（调用方组 Cancel/Submit 按钮）
}
```

按钮本体不抽（各弹窗按钮样式/状态差异大，btn 类由调用方写——保持原语薄）。

## 3. skills-web 消费改造

`skill-form-modal.tsx`（437 行）改造后形态：

- **SkillFormModal**：`<Modal open labelledBy="skill-form-title" title={t(...)}
  onOpenChange={(o) => !o && onClose()}>` + body 内 Field（title 输入、rating/
  tone 下拉用 Field horizontal 或原生保持）+ ChipCheck 组（outputTypes/roles/
  scenes/agents）+ footer ModalActions（error 文案走 status 位；取消/保存按钮
  保留 btn 类）
- **DeleteConfirmModal**：同壳（widthClass 收窄），body 为确认文案，footer 为
  取消/删除
- **对外契约零变化**：props（open/editing/target/onClose/onSaved）、行为
  （成功才 onSaved、失败 setError 留弹窗、saving 禁用）、语言包键、
  aria-labelledby 锚点（`skill-form-title` / `skill-delete-title` 平移进
  Modal title 的 h2）——**marketplace.test.tsx 期望零修改**（锚定方式不变）
- CheckboxGroup（本地组件）删除，被 ChipCheck 替代；权限入口守卫、
  skillsApi 调用、初值快照逻辑全部不动

## 4. 兼容与回归

- **纯新增**：packages/ui 只增不改（index.ts 追加导出）；既有 Block/ToggleItem
  无消费方，不受影响
- **iam-web/portal-web 零代码改动**，但因 dependency @zanelab/ui，四包 tsc/
  build 需连带验证（ui 包类型变化会传导）
- **jsdom 可达性**：Modal 条件渲染 + 显式结构（div role=dialog）在 jsdom 下
  有隐式 dialog role（与原生 `<dialog>` 不同——div+role 是显式 role，byRole
  可用）；测试锚定方式与现状兼容
- **回滚点**：整组改动单 commit；revert 即回 daisyUI modal 形态（无 DB/接口
  牵连）

## 5. 权衡记录

| 决策 | 备选 | 取舍 |
|---|---|---|
| scrim 点击即回调 onOpenChange(false) | 内置确认拦截（有未保存改动时提示） | 保持原语薄——拦截逻辑属调用方（表单脏态判定在 skills-web 有 saving 态可用；本任务不加，留调用方自决） |
| Escape 用 document 监听 | `<dialog>` 原生 showModal | 原生 dialog 的 ::backdrop 无法用 Tailwind 类定制 scrim 样式，且 jsdom showModal 支持差（既有测试教训）；受控 div 方案测试友好 |
| keyframes 放独立 modal.css（ui 包样式入口） | 内联 `<style>` 标签 | packages/ui 已有 scrollbar.css 先例（`./scrollbar.css` exports）；消费方需 import 一次——skills-web 接入时在 index.css `@source`/import；缺点是多一步接线，权衡取常规 CSS 方案（动画类名稳定、无 FOUC） |
| ChipGroup 统一组件 + variant | ChipCheck/ChipSelect 两组件 | 结构完全同构（数组语义调用方定），单组件少一半代码；语义差异用 variant prop 表达 |
