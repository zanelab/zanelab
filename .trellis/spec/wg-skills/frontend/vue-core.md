<!-- 来源: jiushiwon/wg-skills @ 3b93743 (Apache-2.0)，有修改；详见 ../NOTICE.md -->
# Vue 基础组件体系与项目骨架（vue-base-skill 全族）

> 本文档合并转写自 wg-skills 的 31 个技能：`vue-base-skill`（父技能）、`vue-generate-skill`、
> `nuxt-generate-skill`、`universal-login-page`，以及 27 个组件子技能（card / button / tag / status /
> badge / table / form / input / select / datepicker / checkbox / radio / switch / cascader / dropdown /
> menu / tree / contextmenu / list-item / collapse / dialog / toast / loading / empty / upload /
> list-page / layout）。
> 规则实质保留原文（props / events / slots / 类型 / 枚举 / 类名 / Token 名照抄），
> 触发词 / frontmatter / 演示 HTML / 逐行组件实现代码已剥离或压缩到规则层。

## 一、vue-base-skill（父技能）· 全局铁律

### 1.1 容器原则（铁律）

> **任何业务组件、表单、表格都必须嵌入 `<base-card>`。无例外。**

```vue
<!-- ✅ 正确 -->
<base-card title="商品管理">
  <base-table :data="products" :columns="columns" />
</base-card>

<!-- ❌ 错误：游离的 base-table -->
<base-table :data="products" :columns="columns" />
```

理由：1) 全局视觉一致性（间距、阴影、圆角）；2) 为 `header-right` / `footer` 插槽提供容器；
3) 业务区块边界明确，便于布局与响应式。

分层：「一切皆容器」——`base-card` 是 L0 根容器，业务组件是 L1；L1 业务卡片（`base-wg-card`）
**内部必须包 `base-card`**。

### 1.2 零 HTML5 标签铁律（.md 文档约束）

> 所有 `.md` 文档中的实现代码必须使用 `<div>` `<span>` `<p>` + CSS3，严禁原生表单/结构标签。

替换对照：`<button>` → `<base-button>`；`<input>` / `<textarea>` → `<div contenteditable>` + CSS3
自定义输入框；`<select>` / `<option>` → `<div>` + CSS3 自定义下拉；`<table>` / `<tr>` / `<td>` /
`<th>` → `<div>` + `display:flex/grid` 自定义表格；`<checkbox>` / `<radio>` → `<div>` + CSS3 自定义
复选/单选；`<form>` → `<div>` + `@submit.prevent` 自定义表单；`<a>` → `<div role="link">` 或
`<router-link>`；`<img>` → `<div>` + `background-image`。

扩展版（卡片/下拉/列表项技能通用）还禁止：`<p>` `<h1~h6>` `<header>` `<footer>` `<section>`
`<article>` `<aside>` `<nav>` `<main>` `<label>` `<fieldset>` `<strong>` `<em>` `<b>` `<i>` `<u>` `<s>`
`<ul>` `<ol>` `<li>`。

唯一例外：`demo-components/**/*.html` 演示文件允许用 HTML5 标签（与生产组件实现隔离）；
SKILL.md 中标注 `<!-- ❌ 严禁 -->` 的教学反例块豁免。

典型替换形态：按钮 `<base-button>`；标签/徽章 `<base-status>`；复选框 `<span role="checkbox">` + CSS；
单选框 `<span role="radio">` + CSS；输入框 `<div contenteditable>` + CSS；下拉 `<div>` + 自定义面板；
表格 `<div>` + flex/grid；表单 `<div>` + 事件。

审计命令（输出为空才算合规）：

```bash
grep -rnE '<(p|header|footer|section|article|aside|nav|main|h[1-6]|button|table|input|select|form|label|fieldset|option|textarea|img|strong|em|b |i |u |s |a |ul|ol|li)' \
  --include="base-*.md" .
```

### 1.3 零 Emoji 铁律

> 所有组件代码（.md template/script/style + demo HTML）**严禁使用彩色 emoji**。

替代：文件类型用 `PDF` `DOC` 等纯文本 + CSS badge；图标用 CSS mask / SVG；
状态用 `✓` `×` 等 Unicode 符号。理由：跨平台渲染不一致，uniapp 下可能白屏，字形宽度不可控。

### 1.4 第三方组件库禁令

> 禁止使用任何第三方 Vue UI 库（Element Plus / Naive UI / Ant Design Vue / Vuetify / PrimeVue 等）。

需要弹窗 / Drawer / Tabs 等组件 → 在 vue-base-skill 内扩展对应子技能，而非引入第三方。
理由：保持主题可控、避免样式冲突、减小 bundle 体积。

### 1.5 设计 Token 约定

所有子技能统一引用 vue-theme-skill（唯一定义处见 `vue-theme-style.md`）：

| 类别 | 命名规范 | 示例 |
|------|----------|------|
| 颜色 | `--color-{name}` / `--color-{name}-{50~950}` | `--color-primary-500` |
| 间距 | `--space-{n}` | `--space-4`(16px) |
| 字号 | `--font-{size}` | `--font-base`(14px) |
| 高度 | `--height-{comp}-{size}` | `--height-button-md` |
| 圆角 | `--radius-{size}` | `--radius-lg` |
| 阴影 | `--shadow-{sm,md,lg,xl}` | `--shadow-md` |
| 字重 | `--weight-{normal~bold}` | `--weight-semibold`(600) |

**禁止硬编码任何颜色 / 间距 / 字号 / 行高 / 圆角值。** 变量不存在时在组件 CSS 中写 fallback
（`padding: var(--space-4, 16px)`）；兜底值仅作缺省，不作为规范值。
各组件的主要 token 绑定：base-card 用 `--color-surface` / `--space-5` / `--radius-lg`；
base-button 用 `--color-primary*` / `--space-3/4` / `--height-button-md` / `--radius-md`；
base-tag 用语义色 `--color-*-light` / `--font-xs` / `--radius-sm`；
base-table 用 `--color-bg-secondary` / `--color-divider` / `--space-3/4`。均禁止硬编码对应字面值。

### 1.6 依赖方向（禁止反向依赖）

```
vue-theme-skill（基础层，无依赖）
       ↓ 提供 --color-* / --space-* / --font-* / --radius-*
vue-base-skill（父技能层，强依赖 vue-theme-skill）
       ↓ 规范 + 容器原则 + 12 个子技能入口
  card / button / tag / table / form / dropdown / tree / contextmenu / collapse / upload / generate / login
```

vue-theme-skill **不得**引用 vue-base-skill 的任何变量。

### 1.7 包结构规范（让组件可被 import）

每个子技能包应补 `package.json` + `components/index.ts` + `components/BaseXxx.vue`
（文档 `SKILL.md` / `README.md` / `base-xxx.md` 不改，作为实现依据）。

package.json 模板：`name: "vue-{xxx}-skill"`、`version`、**必须 `"private": true`**（避免误发布）、
`"type": "module"`、`"main": "./components/index.ts"`、
`"exports": { ".": "./components/index.ts", "./*": "./*" }`、`peerDependencies: { "vue": "^3.4.0" }`
（避免重复打包）。

命名与导出约定：文件名与组件名用 PascalCase（`BaseCard.vue` / `BaseCard`，Vue3 自动从文件名推导，
无需 `defineOptions`）；模板使用 kebab-case（`<base-card>`）；index.ts 导出所有组件 +
第一个组件作 default export。

Props / Events / Slots 命名：双向绑定用 `modelValue` + `update:modelValue`（Vue3 v-model 默认）；
props 用 camelCase；布尔属性直接 boolean（不加 `is` 前缀）；事件用动宾结构
（`change` / `clear` / `select` / `submit`）；slot 语义化（`default` / `header` / `footer` /
`prefix` / `suffix`）。TypeScript：`<script setup lang="ts">` + `defineProps<{...}>()` /
`defineEmits<{...}>()` 泛型，复杂类型放 `types/*.ts`。

不做：不引入新依赖（不用 lodash / dayjs，纯 Vue3 + CSS）；不改文档内容；不写测试；不加 build 脚本。

### 1.8 命名对齐矩阵（与 uniapp 体系严格镜像）

命名一一对应：`vue-theme-skill` ← `uniapp-theme-skill`；`vue-base-skill` ← `uniapp-base-skill`；
`vue-card-skill` ← `uniapp-base-skill/containers/base-card`；`vue-button-skill` / `vue-tag-skill` /
`vue-table-skill` / `vue-status-skill`（后四者为扩展，状态/标签/徽章类）。

跨技能命名严格保持一致：组件名、variant 名、prop 名、Token、文件结构、容器原则。
子技能结构约定：组件 .md 命名 `base-{组件名}.md`；变体 .md 命名 `base-{组件}-{形态}.md`；
demo 目录 `demo-components/<组件名>/html/*.html`。

## 二、组件规范（27 个子技能）

> 以下每个组件均遵循 §1 铁律（容器原则 / 零 HTML5 / 零硬编码 / 禁第三方库），不再逐条重复。

### 2.1 base-card + base-wg-card（vue-card-skill）

双层架构：`base-card`（L0 根容器，6 维度参数矩阵）+ `base-wg-card`（L1 业务卡片，11 variant），
严格分层、互不替代。

- `base-card` 定义容器的「形」（圆角 / 内边距 / 阴影 / 边框 / 色调 / 加载态），不关心内部放什么。
- `base-wg-card` 定义卡片的「意」（业务形态），**必须内部包裹 base-card**，
  禁止脱离 base-card 单独存在。

`base-wg-card` Props（`名: 类型 = 默认值`）：`variant`（11 值，见下）= `'basic'`、
`data: object` = `{}`（按 variant 形状不同）、`radius: 'sm'|'md'|'lg'|'xl'|'full'` = 按变体、
`padding: 'none'|'sm'|'md'|'lg'|'xl'` = 按变体、`shadow: 'none'|'sm'|'md'|'lg'` = 按变体、
`bordered: boolean` = 按变体、`clickable: boolean` = 按变体、
`tone: 'neutral'|'primary'|'success'|'warning'|'danger'` = `'neutral'`（联动强调条）、
`cols: number` = `4`（grid / menu 列数，2/3/4/6）、`loading: boolean` = `false`（透传 base-card）。

Slots：`default`（all）、`header-right`（basic/product）、`footer`（basic/product/comment）、
`actions`（product/image/notify）。

11 种 variant：`basic`（标题+描述+操作）、`product`（封面+名称+价格+操作）、
`profile`（封面+头像+昵称+统计）、`friend`（头像+昵称+签名+箭头）、`set`（图标+标签+开关/箭头，列表）、
`vip`（渐变+头像+等级+权益）、`menu`（九宫格图标+标签）、`grid`（N 列功能网格）、
`image`（大图+标题+描述+底部）、`notify`（图标+标题+描述+时间+徽标）、
`comment`（头像+昵称+时间+内容+点赞，支持嵌套回复）。

根容器 `base-card`（`vue-base-skill/base-card.md` 简版）：Props `title: string`（卡片标题）、
`shadow: boolean`（默认 `false`）；Slots `default`（默认内容区域）、`header`（自定义头部）。

**红线**：禁止用 `<div>` 替代 `<base-card>` 作为内容容器；禁止在 base-card 内部自定义背景色
（必须用 Token）；禁止跨端硬编码 rpx / rem；禁止修改 base-card 的圆角 / 阴影 Token；
禁止混入任何第三方卡片组件；禁止 `base-wg-card` 脱离 `base-card`。

### 2.2 base-button（vue-button-skill）

6 type × 3 variant × 3 size 矩阵，零第三方组件库。

Props（`名: 类型 = 默认值 —— 说明`）：

- `type`: `'primary' | 'default' | 'success' | 'warning' | 'danger' | 'text'` = `'default'` —— 按钮类型
- `size`: `'sm' | 'md' | 'lg'` = `'md'` —— 尺寸
- `variant`: `'solid' | 'outline' | 'ghost' | 'text' | 'link'` = `'solid'` —— 样式变体
- `disabled`: boolean = `false` —— 禁用
- `loading`: boolean = `false` —— 加载中（自动禁用点击 + 显示 spinner）
- `block`: boolean = `false` —— 块级（铺满父容器）
- `icon`: string = - —— 图标（Iconify 名称）
- `native-type`: `'button' | 'submit' | 'reset'` = `'button'` —— 表单语义（被表单包裹时生效）
- `href`: string = - —— 链接地址（渲染为 `<a>` 语义，仍保持 base-button 类）
- `to`: `string | object` = - —— router-link 目标
- `round`: boolean = `false` —— 全圆角胶囊形
- `circle`: boolean = `false` —— 正圆形（仅图标）
- `name`: string = - —— 表单字段名（form 自动注入）

Events：`click`（`event: MouseEvent | KeyboardEvent`，Enter/Space 键也触发）。

形态组合（type × variant）：primary 支持 solid 实心 / outline 描边 / ghost 幽灵 / text 文字；
default 仅 solid 实心；success 支持 solid 实心与 text 文字；warning 仅 solid 实心；
danger 支持 solid 实心与 text 文字；type=`text` 即文字按钮。

### 2.3 base-tag（vue-tag-skill）

Props 矩阵：`type` = default / primary / success / warning / danger / info；
`variant` = light（默认）/ outline / solid；`closable: boolean`（显示关闭 ×）；`size` = sm / md。
Token 要点：`--type-success` 类变体用 `--color-success-light` 底 + `--color-success-dark` 字。
标签通常出现在表格 / 列表单元格内，必须确保外层有 `<base-card>` 容器。

### 2.4 base-status（vue-status-skill）

7 type × 5 variant × 3 size 的通用状态/标签/徽章组件。

```typescript
interface BaseStatusProps {
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default' | 'neutral'
  variant?: 'solid' | 'light' | 'outline' | 'ghost' | 'dot'   // dot = 仅圆点
  size?: 'sm' | 'md' | 'lg'
  shape?: 'round' | 'square'      // 圆角/方形
  block?: boolean                 // 块级（铺满父容器）
  customColor?: string            // 自定义颜色
  closable?: boolean              // 可关闭
  disabled?: boolean              // 禁用
  blink?: boolean                 // 闪烁动画
  icon?: string                   // 左侧图标
  count?: number                  // 数字徽标
  overflow?: number               // 数字最大显示值
  ariaLabel?: string
}
```

默认值：`type: 'default'`、`variant: 'solid'`、`size: 'md'`、`shape: 'round'`。
Token 要点：`display:inline-flex` + `gap: var(--space-1)` + `border-radius: var(--radius-full)`。

### 2.5 base-badge（vue-badge-skill）

5 种形态：`dot`（圆点，在线状态/待处理）、`count`（数字，消息数量/购物车）、
`text`（文字，NEW/HOT）、`max`（最大值，99+/999+）、`dot-pulse`（脉冲红点，重要通知）。

Props：`type` = `'dot' | 'count' | 'text' | 'max'`（默认 `'count'`）；
`value: number | string`（默认 `0`）；`max: number`（默认 `99`）；`showZero: boolean`（默认 `false`）；
`pulse: boolean`（默认 `false`）；`color: string`（默认 `'error'`）。

样式 Token：`--badge-bg` / `--badge-text` / `--badge-size` / `--badge-font-size`。
用法：`<base-badge :value="5" />`、`<base-badge :value="100" :max="99" />`、`<base-badge type="dot" />`、
`<base-badge type="text" value="NEW" />`、`<base-badge type="dot" :pulse="true" />`。

### 2.6 base-table · base-loading · base-paginated（vue-table-skill）

Vue3 + TypeScript 泛型表格，23 种形态，3 个独立组件。强依赖 base-button / base-status / base-card。

`base-table` 23 种形态（名称 → 关键 prop）：基础表格（`:data` `:columns`）、固定列
（`columns[i].fixed: 'left'|'right'`）、操作列（`columns[i].actions`）、可选择行（`selectable`）、
可排序（`columns[i].sortable`）、可筛选（`columns[i].filterable`）、可展开行（`expandable`）、
表头分组（`columns[i].children`）、合并单元格（`:span-method`）、行编辑（`editable`）、
树形数据（`treeData`）、虚拟滚动（`virtual` `:height`）、拖拽排序（`dragSort`）、
可调整列宽（`resizable`）、汇总行（`showSummary`）、斑马纹（`striped`）、边框（`bordered`）、
悬停高亮（`hover`）、紧凑模式（`compact`）、固定表头（`:height`）、加载中（`:loading`）、
空状态（`emptyText`）、分页表格（`:pagination`）。

列配置形状：`{ key, title, width?, minWidth?, fixed?: 'left'|'right', sortable?, filterable?,
actions?: [{ label, type, variant?, event, icon? }], render?: (row) => VNode }`。
状态列通过 `render` 返回 `BaseStatus`，操作列通过 `actions` 自动渲染 base-button。

`base-loading`：7 种动画（`dots` 三点弹跳默认 / `bar` 条状横扫 / `ring` 圆环旋转 / `pulse` 脉冲扩散 /
`wave` 波浪起伏 / `cube` 方块翻转 3D / `ripple` 涟漪扩散）；5 种类型（container / fullscreen /
section / inline / overlay）；5 种尺寸（xs / sm / md / lg / xl）；5 种主题（primary / success /
warning / danger / info）。用法 `<base-loading :loading="loading" mode="dots" text="加载订单...">`。

`base-paginated`：5 种模式（`classic` 经典分页 / `button` 按钮组 / `dropdown` 下拉页码 /
`simple` 简洁 / `scroll` 滚动加载）；3 种尺寸（sm/md/lg）；3 种形状（round/square/circle）；
5 种主题；3 种位置（left/center/right）。Props：`:current` `:page-size` `:total` `show-total`
`show-size-changer` `show-quick-jumper` `position`；Event `@page-change`。

**红线**：禁止裸用组件（必须 `<base-card>` 包裹）；禁止裸色值 / 裸 px；禁止 HTML5 标签；
禁止自写按钮样式（用 base-button）；禁止自写状态标签（用 base-status）；禁止混入第三方组件库。

### 2.7 base-form · base-form-item · base-form-render（vue-form-skill）

组装型技能，引用 input / select / datepicker / checkbox / radio / switch / upload 等独立组件技能。

`base-form` Props（`名: 类型 = 默认值`）：`model: Record<string, unknown>` = **必填**（表单数据模型）、
`rules: Record<string, FormRule[]>` = `undefined`（key 对应 model 字段名）、
`layout: 'horizontal' | 'vertical' | 'inline'` = `'horizontal'`、
`labelWidth: string | number` = `'100px'`（horizontal 生效）、
`labelAlign: 'left' | 'right'` = `'right'`、`disabled: boolean` = `false`、`readonly: boolean` = `false`、
`hideRequiredAsterisk: boolean` = `false`、`showMessage: boolean` = `true`、
`size: 'sm' | 'md' | 'lg'` = `'md'`（统一尺寸）。

Methods：`validate(callback?) → Promise<boolean>`；`validateField(props, callback?) → Promise<boolean>`；
`resetFields(props?) → void`；`clearValidate(props?) → void`。

Events：`submit(model)`（校验通过后提交，监听 `<base-button native-type="submit">`）；
`validate({ prop, valid, message })`；`reset`（监听 `native-type="reset"`）。

submit 触发流程：

```
用户点击登录按钮
  └─ base-button.native-type="submit"
     └─ base-form 拦截「提交」事件
        ├─ 调用所有 FormItem.validate() 校验
        ├─ 全部通过 → emit('submit', { ...model })
        └─ 校验失败 → 不 emit submit，在对应 FormItem 显示错误
```

`base-form-item` Props（`名: 类型 = 默认值`）：`label: string` = `''`、`prop: string` = `undefined`
（对应 model 的 key，用于校验联动）、`required: boolean` = `false`（必填星号，优先级高于 rules）、
`rules: FormRule[]` = `undefined`（覆盖 form 级 rules）、`labelWidth: string | number` = `undefined`
（覆盖 form 级）、`help: string` = `''`（灰色提示）、`error: string` = `''`（外部错误，跳过校验引擎）、
`showMessage: boolean` = `true`。

Events：`validate({ valid, message })`。注入契约：

```typescript
interface FormItemContext {
  prop?: string
  validate: () => Promise<{ valid: boolean; message: string }>
  resetField: () => void
  clearValidate: () => void
}
```

`base-form-render`（万能表单渲染器）：根据 FormSchema 自动生成表单，**一份契约同时驱动前端渲染与后端入参校验**。

```typescript
interface FormSchema {
  field: string;      // 字段名
  label: string;      // 显示标签
  type: 'input' | 'select' | 'datepicker' | 'checkbox' | 'radio' | 'switch' | 'upload';
  required?: boolean;
  rules?: ValidationRule[];
  options?: { label: string; value: any }[];  // select/radio/checkbox 选项
  props?: Record<string, any>;  // 透传给组件
}
```

**契约权威源**：源技能 `references/form-contract.md` —— 定义 10 种 `FieldType` 枚举 → 组件映射
（email/phone/idcard 等通过 subType 扩展）、零代码地基映射表（字段类型 + 子类型 → 组件 + 校验规则）、
文本类子类型正则、上传类子类型（联动 base-upload）、字段联动（dependencies）、
布局规则（字段数决定单列/双列/抽屉）、后端注解 → FieldType 映射
（Java `@NotBlank` / `@Pattern`）、后端实体 → FormSchema 完整示例。
与 frontend-request-skill 的 `api-contract.md` 共同构成前后端完整契约体系。

典型用法：`<base-card title="用户信息">` 内放 `<base-form :model="form" :rules="rules" label-width="80px">`，
其内每个字段一个 `<base-form-item label="..." prop="..." required>` 包裹对应输入组件
（`<base-input v-model="form.name" placeholder="请输入姓名" />`、`<base-select v-model="form.role" :options="roleOptions" />` 等）。

### 2.8 base-input（vue-input-skill）

公共根容器之一（与 base-card 平级）：所有需要用户输入的地方（form / table 编辑 / search / filter）
都必须使用 `<base-input>`，禁止原生 `<input>` `<textarea>`。零 HTML5 标签实现方式：
`<div contenteditable role="textbox">`。

Props：

Props（`名: 类型 = 默认值`）：`modelValue: string | number` = `''`（v-model 绑定值）、
`type: 'text' | 'password' | 'search' | 'textarea'` = `'text'`、`placeholder: string` = `'请输入'`、
`disabled: boolean` = `false`、`readonly: boolean` = `false`、`maxlength: number` = -、
`clearable: boolean` = `false`、`showPassword: boolean` = `false`（密码显隐切换）、
`size: 'sm' | 'md' | 'lg'` = `'md'`。

Events：`update:modelValue`、`input`、`change`（失焦或回车时）、`focus`、`blur`、`clear`、`enter`。
Slots：`prefix`、`suffix`（图标）。另有公共根容器简版 Props：`value`/`v-model`、`placeholder`、
`disabled`、`readonly`、`clearable`、`size`、`prefix`/`suffix`（`string | Component`）。

### 2.9 base-select（vue-select-skill）

零 HTML5 标签实现方式：`<div contenteditable role="textbox">` 实现搜索。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `modelValue` | `unknown` | - | 绑定值 |
| `options` | `SelectOption[]` | `[]` | 选项列表 |
| `placeholder` | string | `'请选择'` | 占位符 |
| `disabled` | boolean | `false` | 是否禁用 |
| `multiple` | boolean | `false` | 是否多选 |
| `searchable` | boolean | `false` | 是否可搜索 |
| `clearable` | boolean | `false` | 是否可清空 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 尺寸 |
| `maxTagCount` | number | `3` | 多选最多显示标签数 |

Events：`update:modelValue(value)`、`change(value)`、`clear()`。

```typescript
export interface SelectOption { label: string; value: unknown; disabled?: boolean; group?: string }
export interface SelectEmits {
  'update:modelValue': [value: unknown]; change: [value: unknown]; clear: [];
}
```

### 2.10 base-datepicker（vue-datepicker-skill）

零 HTML5 标签实现方式：`<span role="button">` 实现导航按钮。
功能特性：日期选择 / 范围选择 / 年·月选择 / 快捷选择（今天、昨天、近7天等）/ 禁用日期 / 格式化输出。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `modelValue` | string | - | 绑定值 |
| `type` | `'date' \| 'daterange' \| 'month' \| 'year'` | `'date'` | 类型 |
| `placeholder` | string | `'请选择日期'` | 占位符 |
| `disabled` | boolean | `false` | 是否禁用 |
| `disabledDate` | `(date: Date) => boolean` | - | 禁用日期函数 |
| `format` | string | `'YYYY-MM-DD'` | 输出格式 |
| `shortcuts` | `Shortcut[]` | - | 快捷选项 |
| `clearable` | boolean | `true` | 是否可清空 |

```typescript
export interface Shortcut { text: string; value: () => [Date, Date] | Date }
export interface DatePickerEmits { 'update:modelValue': [value: string]; change: [value: string] }
```

### 2.11 base-checkbox（vue-checkbox-skill）

零 HTML5 标签实现方式：`<div role="checkbox">`。两个组件：`BaseCheckbox`（单个）+
`BaseCheckboxGroup`（复选组）。

BaseCheckbox：`modelValue: boolean`（`false`）、`label: string`（`''`）、`disabled: boolean`（`false`）、
`indeterminate: boolean`（`false`，半选状态，仅视觉）、`size`（`'md'`）。

BaseCheckboxGroup：`modelValue: unknown[]`（`[]`）、
`options: { label: string; value: unknown; disabled?: boolean }[]`（`[]`）、
`disabled: boolean`（全组禁用）、`size`。

Events：`update:modelValue` / `change`（`boolean | unknown[]`）。

实现要点：用 `<div>` 替代 `<label>`；按 `size` 生成 `base-checkbox--{size}` class；
状态修饰 `--checked` / `--disabled` / `--indeterminate`；内层 `base-checkbox__box` 加
`role="checkbox"` + `:aria-checked="indeterminate ? 'mixed' : isChecked"` + `:aria-disabled`。

### 2.12 base-radio（vue-radio-skill）

零 HTML5 标签实现方式：`<div role="radio">`。两个组件：`BaseRadio`（单个）+ `BaseRadioGroup`。

BaseRadio：`modelValue: unknown`（`undefined`）、`label: string`（`''`）、
`value: unknown`（**必填**，当前选项的值）、`disabled: boolean`、`size`。

BaseRadioGroup：`modelValue: unknown`（`undefined`）、
`options: { label: string; value: unknown; disabled?: boolean }[]`（**必填**）、
`disabled`（全组禁用）、`size`。

Events：`update:modelValue` / `change`（`unknown`）。
渲染结构：`base-radio` / `base-radio--{size}` / `--checked` / `--disabled` →
`base-radio__input` → `base-radio__circle`（`role="radio"` + `:aria-checked` + `:aria-disabled`）。

### 2.13 base-switch（vue-switch-skill）

零 HTML5 标签实现方式：`<div role="switch">`。

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `modelValue` | `boolean` | `false` | 是否开启 |
| `disabled` | `boolean` | `false` | 禁用 |
| `loading` | `boolean` | `false` | 加载中 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 尺寸 |

Events：`update:modelValue` / `change`（`boolean`）。

核心逻辑：`toggle()` 中若 `disabled || loading` 直接 return，否则取反后同时 emit
`update:modelValue` 与 `change`。

### 2.14 base-cascader（vue-cascader-skill）

4 种模式：单选（选中一个叶子节点，省市区/部门）、多选（多叶子 + tags 展示）、
面板（左右级联面板）、搜索（关键字过滤）。

```typescript
interface CascaderProps {
  modelValue: string | string[]; options: CascaderOption[];
  placeholder?: string; disabled?: boolean; clearable?: boolean;
  filterable?: boolean;       // 可搜索
  multiple?: boolean;         // 多选
  checkStrictly?: boolean;    // 父子不关联
  showAllLevels?: boolean;    // 显示完整路径
  collapseTags?: boolean;     // 多选时折叠标签
}
interface CascaderOption { value: string | number; label: string;
  children?: CascaderOption[]; disabled?: boolean; [key: string]: any }
```

复用关系：`vue-input-skill`（输入框触发器）+ `vue-dropdown-skill`（下拉面板）+
`vue-tag-skill`（已选标签展示）。

### 2.15 base-dropdown（vue-dropdown-skill）

「一个组件 5 种 mode」的万能浮层：融合 dropdown / popover / select / multi-select / menu。

| # | mode | 替代 | 关键能力 |
|---|------|------|----------|
| 1 | `dropdown` | 操作下拉 / 筛选菜单 | click trigger · 菜单项分组 / 分隔线 / danger |
| 2 | `popover` | tooltip / 详情预览 | hover/focus trigger · 12 位置 · 箭头 · 富内容 |
| 3 | `select` | 原生 `<select>` | click trigger · v-model · 搜索 / 清空 / 远程 / 虚拟滚动 |
| 4 | `multi-select` | 多选 `<select>` | click trigger · v-model array · tag pill · max 限制 |
| 5 | `menu` | contextmenu | 右键 trigger · 鼠标定位 · 快捷键后缀 |

维度矩阵（`名: 默认值` → 可选值）：`mode` = `dropdown` → 上述 5 值；`position` = `bottom-start` →
`bottom/top/left/right` × `-start/-end/''`；`trigger` = 随 mode → click / hover / focus / manual /
contextmenu；`size` = `md` → sm / md / lg；`tone` = `neutral` → neutral / primary / success /
warning / danger。

select / multi-select 专属能力：`searchable`（`false`，关键字高亮过滤）、`clearable`（`false`）、
`multiple`（`false`）、`max`（`Infinity`）、`remote`（`false`，配合 `remote-function`）、
`debounce`（`300` ms）、`virtual`（`false`，> 100 选项建议开启）、`rowHeight`（`36` px）。

容器铁律：所有 panel（浮层面板）必须由 `base-card` 承载 —— dropdown / popover（带 arrow）/
select（带 search + options）/ multi-select / menu panel 全部包 base-card。
**禁止 base-dropdown panel 脱离 base-card 容器。**

红线补充：禁止用 `<div>` 替代 `<base-dropdown>` 作为浮层；禁止在 panel 内自定义背景色；
禁止原生 `<select>` `<option>` `<input>` `<button>` 实现；禁止修改其圆角 / 阴影 Token。

### 2.16 base-menu（vue-menu-skill）

横向/纵向、可折叠、多级子菜单、路由/权限集成。底层渲染依赖 vue-list-item-skill。

组件：`BaseMenu`（主菜单）、`BaseMenuItem`（菜单项）、`BaseSubMenu`（子菜单容器）。

模式矩阵：`mode` = `'vertical'` / `'horizontal'`；`trigger` = `'hover'` / `'click'`；
`expandLevel` = `'current'` / `'all'`；`collapsible: boolean`；`collapsed: boolean`。

BaseMenu Props（`名: 类型 = 默认值`）：`mode: 'vertical' | 'horizontal'` = `'vertical'`、
`data: MenuData[]` = `[]`、`activeKey: string` = `''`、`trigger: 'hover' | 'click'` = `'hover'`、
`expandLevel: 'current' | 'all'` = `'current'`、`collapsible: boolean` = `false`、
`collapsed: boolean` = `false`、`accordion: boolean` = `true`（手风琴）、`router: boolean` = `false`、
`width: string` = `'200px'`、`collapsedWidth: string` = `'64px'`。

BaseMenuItem Props：`item: MenuItemData`、`level: number`（`0`）、`collapsed: boolean`（`false`）。

```typescript
interface MenuItemData {
  key: string; label: string; icon?: string;
  badge?: string | number; disabled?: boolean;
  route?: string; children?: MenuItemData[]
}
type MenuMode = 'vertical' | 'horizontal'
type MenuTrigger = 'hover' | 'click'
type MenuExpandLevel = 'current' | 'all'
```

红线：禁止硬编码颜色/尺寸/间距；禁止 emoji 作为图标；禁止脱离 vue-list-item-skill 自行实现节点渲染；
禁止第三方 UI 库；禁止裸用 `<base-menu>`（必须 base-card 包裹）。

### 2.17 base-tree（vue-tree-skill）

8 种形态通过 prop 开关叠加（可组合，如 `<base-tree :data :checkbox :draggable :editable />`）：
基础树（默认，无 prop）、复选框树（`checkbox`）、懒加载树（`lazy` + `load`）、
可拖拽树（`draggable`）、右键菜单树（`@contextmenu` 事件）、
可搜索树（`v-model:search` + `filter-node`）、可编辑树（`editable`）、节点图标树（`TreeNode.icon`）。

```typescript
interface TreeNode {
  id: string; label: string; icon?: string;
  meta?: string;              // 右侧次要文本（KB / 人数 / 数量）
  badge?: string | number;    // 徽标（新人 / P0）
  disabled?: boolean; open?: boolean;
  children?: TreeNode[]; isLeaf?: boolean;   // isLeaf 为懒加载标记
}
```

禁止裸用 `<base-tree>`（违反容器原则）；禁止脱离 `base-list-item` 重新实现节点渲染。

### 2.18 base-contextmenu（vue-contextmenu-skill）

菜单项渲染统一收敛到 `base-list-item`，业务只关心 `MenuOption[]` 数据契约 + 4 个 prop 开关。
弹层使用 Teleport 到 body，宿主容器用 base-card。

8 种形态：基础菜单（options 数组）、嵌套子菜单（`option.children`）、图标菜单（`option.icon`）、
分割线菜单（`option.divider: true`）、动态条件菜单（`option.show`）、左键点击触发（`trigger="click"`）、
键盘导航（内置 ↑↓ Enter Esc）、边缘检测（内置 `adjustPosition`）。

```typescript
interface MenuOption {
  id: string; label?: string; icon?: string;
  shortcut?: string;          // 快捷键（Ctrl+C）
  command?: string | number;  // 业务命令（select 回调参数）
  disabled?: boolean; danger?: boolean;   // danger 为红色危险项
  divider?: boolean;          // 是否为分割线
  show?: boolean;             // 条件渲染
  children?: MenuOption[];    // 子菜单
}
```

槽位映射（与 list-item 一致）：`option.icon` → `[icon]`；`option.label` → `[label]`；
`option.shortcut` → `[shortcut]`；`option.divider` → `[divider]`；`option.children` → 递归 base-list-item。

不做：不提供后端数据接口；不处理权限控制（用 `option.show` 在业务层判断）；
禁止脱离 `base-list-item` 重新实现菜单项渲染；禁止用 `<ul> <li>` 原生标签实现菜单结构。

### 2.19 base-list-item（vue-list-item-skill）

**所有「列表类」组件（menu / tree / dropdown / select / tabs / breadcrumb）的共同底层**，
把「项」抽象到基座，避免样式碎片化、交互不一致、代码重复 6 份。

4 个槽位：`[expander]`（有 children 就显示箭头，点击折叠/展开）、`[icon]`（emoji / Unicode / CSS mask）、
`[label]`（主文本，必填）、`[meta]`（`meta` / `badge` / `shortcut` 右侧附加）。

6 种内置风格（选择风格 = 选择产品基调；`basic` 为生产默认）：`basic`（后台管理/通用）、
`finder`（个人文件）、`win`（Windows 资源管理器）、`vscode`（IDE/编辑器/终端）、
`admin`（Ant Design / Element UI 类后台）、`notion`（文档/笔记类）、`nav`（侧边导航，视觉差异最大）。

```typescript
interface ListItem {
  id: string; label: string; icon?: string; meta?: string;
  badge?: string | number; shortcut?: string;
  disabled?: boolean; danger?: boolean; open?: boolean;
  children?: ListItem[]; divider?: boolean;
}
```

**所有「列表类」组件必须基于本 skill**，禁止在 tree / menu / dropdown / select / tabs 中
重新实现列表项结构。

### 2.20 vue-collapse-skill（源文为待实现态）

源 SKILL.md 仅声明定位与待实现清单，**两项均未落地**（原文 checkbox 全未勾选）：
`[ ] 基础折叠`、`[ ] 手风琴模式`。约束：纯 HTML/CSS 实现，遵循 vue-generate-skill 规范。
如实转写，不假装已实现。

### 2.21 base-dialog · base-confirm（vue-dialog-skill）

零 HTML5 标签：按钮用 `<span role="button">`，关闭用 `<span role="button">`；
纯 CSS3 过渡 + Teleport。

`base-dialog`（通用弹窗）：`visible: boolean`（控制显示）、`title: string`、
`width: string`（默认 `'500px'`）、`closable: boolean`（默认 `true`）、
`maskClosable: boolean`（点击遮罩关闭，默认 `true`）、`footer: boolean`（默认 `true`）。

`base-confirm`（确认对话框）：`visible: boolean`、`type` = warning（默认）/ danger / info、
`title: string`、`message: string`、`confirmText: string`（默认 `'确认'`）、
`cancelText: string`（默认 `'取消'`）、`confirmType: string`（默认 `'primary'`）。
Token 要点：`base-dialog__overlay` 用 `position:fixed` + `inset:0` +
`background: rgba(0,0,0,0.45)` + `z-index: 1000`；`.base-dialog` 用 `--color-surface` /
`--radius-lg` / `--shadow-lg`。

用法：`<BaseDialog v-model:visible="v" title="编辑用户">` / `<BaseConfirm v-model:visible="v"
type="danger" title="确认删除" message="确定要删除该记录吗？此操作不可恢复。" @confirm="doDelete" />`。

### 2.22 base-toast（vue-toast-skill）

零 HTML5 标签：`<div role="alert">` 模拟；零第三方依赖：纯 CSS3 动画 + JS 计时器。

Props：`type` = success（默认）/ warning / danger / info；`position` = top（默认）/ center / bottom；
`duration: number`（ms，默认 3000，`0` = 不自动关闭）；`message: string`；`closable: boolean`。

用法：`useToast()` composable（`toast.success('保存成功')` / `toast.error(...)`）+ 全局挂载点
`<BaseToast />`。Token 要点：`--space-3/--space-5` 内边距 + `--radius-full` + `--color-surface` +
`--shadow-md`。

**禁止左侧彩色边框（AI 味），用图标圆底传达类型。**

### 2.23 vue-loading-skill（base-loading / base-skeleton / base-loading-mask）

| 模式 | 类型 | 场景 |
|------|------|------|
| `base-loading` | spin / dots / pulse | 按钮内、全屏、局部 |
| `base-skeleton` | avatar / paragraph / table / card | 数据加载占位 |
| `base-loading-mask` | fullscreen | 页面 / 接口请求中 |

用法：按钮加载直接用 `<base-button :loading="submitting">`；
骨架屏 `<base-skeleton type="paragraph" :rows="3" />` 或 `<base-skeleton type="table" :columns="4" :rows="5" />`；
全屏遮罩 `<base-loading-mask :visible="loading" text="提交中..." />`。

加载组件是**状态组件**，不直接展示数据，需嵌入 base-card 或业务组件内使用
（✅ 嵌入 base-card；❌ 直接放页面根目录）。
Token 要点：`base-loading__spin` 用 `--loading-size-md`（兜底 20px）+ `2px solid var(--color-border)`
+ `border-top-color: var(--color-primary)` + spin 动画；`base-skeleton` 用
`--color-bg-secondary` 与 `--color-bg` 的三段线性渐变 + shimmer 动画。

### 2.24 base-empty（vue-empty-skill）

4 种场景：无数据（列表/表格）、无结果（搜索/筛选）、暂无内容、自定义（图标+文案）。
用法：`<base-empty description="暂无数据" />`；带操作用 `action-text="新建"` + `@action`；
自定义图标用 `:image="EmptyIllustration"`。
容器原则：空状态组件必须嵌入 base-card 或业务组件内使用
（`<base-empty v-if="list.length === 0" description="暂无用户" />` + `<base-table v-else />`）。
Token 要点：`base-empty` 用 `--space-6` 内边距 + 居中；`__description` 用 `--space-3` /
`--color-text-secondary` / `--font-base`。

### 2.25 base-upload（vue-upload-skill）

**一个组件，三种模式**（新增变体扩展 props 即可，不需要新建 md）。

| 模式 | 说明 |
|------|------|
| `mode="file"` | 通用文件上传（拖拽 / 多文件 / 进度条 / 三种 listType） |
| `mode="image"` | 图片上传（预览大图 / Canvas 裁剪 / 客户端压缩 / 头像） |
| `mode="list"` | 文件列表展示（独立使用 / 拖拽排序） |

**零 HTML5 标签唯一例外**：隐藏的 `<input type="file">`（浏览器安全模型硬性要求）。

共享类型（即插即用核心）：`UploadStatus = 'ready' | 'uploading' | 'success' | 'error'`；
`UploadMode = 'file' | 'image' | 'list'`；`ListType = 'text' | 'picture' | 'picture-card'`；
`UploadFile { uid: number; name: string; size?: number; type?: string; url?: string; thumbUrl?: string;
raw?: File; status: UploadStatus; percent: number; response?: unknown }`。

场景矩阵（场景 → mode → 关键 props）：文件附件 file `list-type="text" accept=".pdf,.doc"`；
商品图片 image `crop compress :max-count="9"`；头像上传 image `avatar :compress="true"`；
证件照 image `crop :crop-ratio="3/4" :max-count="2"`；拖拽上传 file `drag list-type="text"`；
文件管理 list `:sortable="true"`；手动上传 file `:auto-upload="false"` + `ref.submit()`。

红线：禁止脱离 base-card 使用；禁止自写按钮（引用 base-button）；禁止自写标签（引用 base-tag）；
禁止硬编码颜色/间距/字号/圆角；禁止第三方 UI 库；**禁止自写请求逻辑（调用 frontend-request-skill 的
`upload()`）**；除隐藏 `<input type="file">` 外禁止 HTML5 标签；禁止彩色 emoji
（文件图标用 `PDF` `DOC` 等纯文本 + CSS badge）。

后端契约见源技能 `references/backend-contract.md`（Go / Java / FastAPI 三版）。

### 2.26 base-list-page（vue-list-page-skill）

零 HTML5 标签实现方式：`<div role="grid">` + ARIA 实现表格。
引用 vue-input-skill / vue-select-skill / vue-datepicker-skill / vue-table-skill。

Props（`名: 类型 = 默认值`）：`columns: Column[]` = `[]`、`searchFields: SearchField[]` = `[]`、
`data: any[]` = `[]`、`loading: boolean` = `false`、`pagination: Pagination` = -、
`showSearch: boolean` = `true`、`showPagination: boolean` = `true`、
`searchBtnText: string` = `'搜索'`、`resetBtnText: string` = `'重置'`。

Types：`Column { prop: string; label: string; width?: number; fixed?: 'left' | 'right';
formatter?: (row, column, cell) => string }`；
`SearchField { type: 'input' | 'select' | 'datepicker' | 'daterange'; key: string; placeholder?: string;
options?: { label: string; value: any }[]; props?: Record<string, any> }`；
`Pagination { page: number; pageSize: number; total: number; pageSizes?: number[] }`。

Events：`search(params)`、`reset()`、`page-change(page, pageSize)`、`size-change(pageSize)`。

### 2.27 AppLayout 系列（vue-layout-skill）

管理端标准布局，7 种模式，全部原生实现。布局组件是项目最外层骨架，**所有页面都在 AppMain 内渲染**。

7 种模式（`mode` 默认 `'sidebar'`）：`sidebar`（左侧侧边栏，用户在侧边栏内，顶部有面包屑+用户）、
`horizontal`（Logo 在左，菜单在顶部横排，用户在右上）、`topbar`（顶部两行：Logo+用户 / 导航菜单）、
`sidebar-user-bottom`（用户在侧边栏菜单下方，顶部仅面包屑）、`mix`（顶部导航 + 左侧图标侧边栏）、
`sidebar-right`（菜单在右侧显示）、`header-only`（无侧边栏，仅顶部导航）。

组件层级：

```
AppLayout (L0 布局容器)
├── AppSidebar (L1 侧边栏)
│   ├── Logo 区域
│   └── base-menu (引用 vue-menu-skill)
├── AppHeader (L1 顶栏)
│   ├── 折叠按钮 + 面包屑
│   └── 用户下拉 (引用 vue-dropdown-skill)
└── AppMain (L1 内容区)
    └── <router-view />
```

AppLayout Props：`mode`（7 值，默认 `'sidebar'`）、`menus: MenuItem[]`、`logo: string`（`'Admin'`）、
`logoIcon: string`（`'logo'`）、`defaultCollapsed: boolean`（`false`）、`sidebarWidth: number`（`220`）、
`collapsedWidth: number`（`64`）、`headerHeight: number`（`48`）、`breadcrumbs: Breadcrumb[]`、
`username: string`（`'Admin'`）、`avatar: string`。

```typescript
interface MenuItem {
  key: string; label: string; icon?: string; path?: string;
  badge?: number | string; children?: MenuItem[]
}
```

引用：vue-theme-skill（Token）、vue-menu-skill、vue-card-skill（容器包裹）、frontend-icon-skill、
vue-badge-skill、vue-dropdown-skill、vue-breadcrumb-skill（面包屑导航）。

### 2.28 universal-login-page（第三方授权鉴权体系）

多系统账户统一鉴权 + 绑定互通，目标用户是 VibeCoder（个人开发者、小团队）。
核心价值：一个账户可以绑定多个系统的账户，实现单点登录。
核心概念：主账户（鉴权体系中唯一身份：手机/邮箱/用户名）、第三方账户（各业务系统账户，按 AppID 区分）、
绑定（主账户与第三方账户的关联关系）、应用（接入鉴权体系的业务系统）。
功能清单：主账户注册/登录、第三方账户绑定与解绑、绑定列表、应用管理、API 密钥、权限管理（角色/权限 CRUD）。

组件结构（均在源技能 `templates/` 下）：`UniversalLogin.vue`（统一登录入口，支持多模式）、
`LoginPage.vue`（主账户登录）、`RegisterPage.vue`（主账户注册）、`BindAccountPage.vue`（账户绑定）、
`BindListPage.vue`（绑定列表）、`AppManagePage.vue`（应用管理）、`AccountSettings.vue`（账户设置），
外加 `references/login-contract.md`（登录契约）。

统一入口 Props：`mode`（默认 `'login'`；取值 login/register/bind/list/settings）、
`apiBase`（`'/api/auth'`）、`appId`（当前应用 ID）、`showApps: boolean`（`true`）、
`title`（`'统一登录'`）。

Events：`success({ token, user, appId })`、`error({ code, message })`、
`bind-success({ provider, account })`、`unbind-success({ provider })`。

页面组件：

1. **BindAccountPage**：绑定流程 = 选择绑定方式 → 验证身份 → 确认绑定；
   支持的 3 种绑定方式 —— 扫码绑定（主账户生成二维码，第三方应用扫码确认）、
   验证码绑定（输入手机/邮箱验证码）、密码绑定（输入主账户密码确认）；props `:main-account`，
   events `@bind` / `@cancel`。
2. **BindListPage**：显示「应用图标 + 账户名 + 绑定时间 + 操作」；props `:bindings`，
   events `@unbind` / `@set-default`。
3. **AppManagePage**：应用列表 AppName + AppID + Status + CreatedAt；操作 编辑 / 删除 / 查看密钥；
   props `:apps`，events `@create` / `@edit` / `@delete`。

契约权威源：表单字段类型 → 组件映射见 vue-form-skill 的 `references/form-contract.md`；
接口契约见 frontend-request-skill 的 `references/api-contract.md`。

## 三、vue-generate-skill · Vue3 + TS + Vite + Pinia 项目骨架

### 3.1 严格依赖 frontend-request-skill（不重新发明请求层）

| vue-generate-skill 输出 | 对应 frontend-request-skill 标准 |
|----------------------|--------------------------------|
| `src/api/request.ts` | `references/frontend-spec.md`（fetch 标准实现） |
| `src/services/auth.service.ts` | `references/auth-patterns.md`（Token 刷新队列） |
| `src/utils/{error,toast,auth}.ts` | `references/error-handling.md` + `auth-patterns.md` |
| `src/config/{api,error}.config.ts` | `references/frontend-spec.md`（BASE_URL + ERROR_CODE_MAP） |
| `src/composables/useAuth.ts` | `references/auth-patterns.md` |
| 响应信封 `{ code, message, data }` | 与各 init-skill 内置的统一响应规范一致 |

**接入本技能前，先阅读 frontend-request-skill 的 SKILL.md 与核心 reference。**

适用范围：全新 Vue 3 SPA（H5 / 后台 / 文档站）。
**不适用**：uniapp / 小程序 / Taro / 移动端 hybrid —— 用 `uniapp-app-generate-skill`。

### 3.2 四阶段工作流

Phase 1 Pre-development（3-5 个澄清问题 → spec.md）→ Phase 2 Project Initialization（create-vue 脚手架
→ 标准目录 → CLAUDE.md ≤50 行 / AGENTS.md ≤400 行 → tsconfig 严格模板 + vite.config 模板 →
复制 code-examples/）→ Phase 3 Development（装请求层 → 配 api.config / error.config →
建 tokens.css → 实现页面 → 写 composables）→ Phase 4 Post-development（lint → type-check → build → 交付物汇总）。

### 3.3 Phase 1：需求澄清（3-5 个问题）

1. 这个项目解决什么问题？核心目标用户是谁？
2. 主要功能有哪些？请列出 3-5 个核心页面或核心流程。
3. 倾向哪种视觉风格？清新健康 / 极简工具 / 活泼社区 / 商务数据？
4. UI 库偏好？Element Plus / Naive UI / Ant Design Vue / 自研？
5. 是否需要登录、权限、用户系统？

产出 `spec.md` 模板（6 节）：1. 项目定位（产品名称 / 目标用户 / 核心价值 / 对标产品）；
2. 核心功能（1..N）；3. 页面清单（页面 | 路径 | 说明，路径形如 `src/views/Dashboard.vue`）；
4. 数据模型（如 `User: { id, username, nickname, avatar, role, tenantId, createdAt }`）；
5. API 轮廓（如 `POST /api/auth/login → { token, refreshToken, user }`、`GET /api/users → { list, total }`）；
6. 设计风格（风格 / 主色 / UI 库 / 是否深色）。

### 3.4 Phase 2：初始化

```bash
npm create vue@latest {{project-name}} -- --typescript --router --pinia --eslint --prettier
cd {{project-name}} && npm install
npm install element-plus @element-plus/icons-vue                       # Element Plus（默认）
npm install -D @types/node unplugin-auto-import unplugin-vue-components
```

tsconfig.json（**STRICT MODE**，按 `references/tsconfig-template.md`）：

```jsonc
{
  "compilerOptions": {
    "strict": true, "noImplicitAny": true, "strictNullChecks": true,
    "strictFunctionTypes": true, "useUnknownInCatchVariables": true,
    "noUnusedLocals": true, "noUnusedParameters": true,
    "noImplicitReturns": true, "noFallthroughCasesInSwitch": true,
    "moduleResolution": "Bundler", "paths": { "@/*": ["src/*"] }, "noEmit": true
  }
}
```

vite.config.ts（按 `references/vite-config-template.md`）：`@vitejs/plugin-vue` +
`AutoImport({ imports: ['vue','vue-router','pinia'], dts: 'src/auto-imports.d.ts' })` +
`Components({ resolvers: [ElementPlusResolver()], dts: 'src/components.d.ts' })`；
`resolve.alias` 把 `@` 指向 `./src`（`fileURLToPath(new URL('./src', import.meta.url))`）。

标准目录结构（按 `references/project-structure.md`）：`src/api/`（request.ts / upload.ts / sse.ts 按需 /
`_mocks_/` / `modules/`）、`src/services/`（auth.service.ts）、`src/config/`（api.config.ts /
error.config.ts）、`src/stores/modules/`（Pinia Setup 风格）、`src/composables/`（useAuth 等）、
`src/views/`、`src/types/api.ts`（ApiResponse<T> / RequestError）、`src/utils/`（auth / error / toast）。

请求层必装文件（按 `references/api-integration.md` 复制）：`src/api/request.ts`（§3）、
`src/api/_mocks_/{index,auth.mock}.ts` 与 `src/api/modules/{auth,user}.ts`（`code-examples/api/`）、
`src/services/auth.service.ts`（`code-examples/services/`）、
`src/utils/{auth,error,toast}.ts`（§5 / §6 / §7）、`src/composables/useAuth.ts`（§8）、
`src/config/{api,error}.config.ts`（§2.2）、`src/types/{api,user}.ts`（`code-examples/types/`）。
其中 `request.ts` / `_mocks_` / `auth.ts` / `error.ts` / `toast.ts` / `useAuth.ts` / `api.config.ts` /
`error.config.ts` / `types/api.ts` 为**必须**，其余按需。

**绝对禁止**：

- ❌ 自己写 `request.ts`（必须按标准复制）
- ❌ 在组件里直接调 `localStorage`（必须走 `utils/auth.ts`）
- ❌ 在组件里写 401 处理（必须交给 `auth.service.ts`）
- ❌ 生成 Login.vue 时 import `@/services/auth.service` 但不生成对应文件 —— 永远先确认
  services / store / api 模块存在再生成 Login.vue（决策流程见
  `frontend-request-skill/references/auth-patterns.md` 末尾「AI 生成 Login.vue 的决策流程」）
- ❌ 生成 Login.vue 时只 import 不接 store / services —— 必须 await 一个真实登录入口
  （`authApi.login` / `userStore.login()` / `services.login()` 三选一），不能让 `@submit` 是 `console.log`

文档产物：`CLAUDE.md` **≤ 50 行**（含显式声明依赖 frontend-request-skill、9 条红线、
完整目录约定；超出部分移到 AGENTS.md）；`AGENTS.md` **≤ 400 行**（按主题拆分 13 章节，AI 按需查阅）。

代码示例复制清单：`types/api.ts`（✅ 全局 API 类型）、`types/user.ts`（按需）、`stores/user.ts`（✅
含 token）、`stores/app.ts`（✅ 全局 app 状态）、`components/AppLayout.vue`（✅）、
`views/Login.vue`（✅）、`views/UserManagement.vue`（✅ 列表/分页/CRUD 参考）。

### 3.5 Phase 3：开发约定

页面结构（参考 `views/UserManagement.vue`）：1) 类型导入 `import type { User, UserListParams } from
'@/types/user'`；2) 响应式状态 `const loading = ref(false)` / `const tableData = ref<User[]>([])`；
3) 业务方法全部用 `async/await` + `try/catch`，catch 形参标注 `err: unknown`，
用类型守卫（`typeof err === 'object' && 'code' in err`）后再处理，`finally` 复位 loading。

Pinia 约定（参考 `stores/user.ts`）：Setup Store 风格；State 用 `ref`；Getters 用 `computed<T>(...)`；
Actions 普通函数；显式返回所有成员；提供 `$reset`。

共享组件：**仅复用 ≥3 次**才抽到 `src/components/`（参考 `references/component-standards.md`）。

### 3.6 Phase 4：后置验证（全部 0 error）

```bash
npm run type-check    # vue-tsc --noEmit（红线：任何 .vue 的 <script setup lang="ts"> 必须通过）
npm run lint
npm run build         # 自动先跑 type-check，再 vite build
```

交付说明需提供：项目结构概览、已生成文件清单、主题色 / UI 库选择、type-check / lint / build 状态、
与 frontend-request-skill 的对齐清单。

### 3.7 Best Practices

复用 frontend-request-skill（不自己写 request.ts、不在组件里调 localStorage、不在组件里写 401 跳转）；
TypeScript 严格模式全开；CLAUDE.md ≤ 50 行；CSS 变量优先（只用 `var(--color-*)`）；
Element Plus 优先（能用的组件就用，不手写）；3 次复用原则；Pinia 必须 Setup 风格；
每个 `.vue` 必须带 `<script setup lang="ts">`；请求层严格分层
（`api/` 只管 HTTP / `services/` 收口业务 / `composables/` 给组件用）；
错误捕获用 `unknown`；完成必跑 `type-check` + `lint` + `build` 三件套。

### 3.8 Red Lines（绝不可违反）

1. ❌ 不用 axios（必须 fetch）
2. ❌ 不用 `any` 类型
3. ❌ 不用 `console.log`
4. ❌ 不用 Options API
5. ❌ 不用 `lang="ts"` 缺失
6. ❌ 不用裸色值
7. ❌ 不手写 Element Plus 已有的组件
8. ❌ 不在组件里直接调 `localStorage`
9. ❌ 不在组件里写 401 跳转
10. ❌ 不用 ESLint 规则覆盖 TypeScript 检查

### 3.9 参考文档清单

源技能 `references/` 下：`project-structure.md`｜`claude-md-template.md`｜`agents-md-template.md`｜
`api-integration.md`（**必读**，集成完整指南）｜`tsconfig-template.md`｜`vite-config-template.md`｜
`vue-conventions.md`｜`component-standards.md`｜`code-examples/`（types / stores / components / views）。

## 四、nuxt-generate-skill · Nuxt 3 全栈项目骨架

### 4.1 适用边界

适用：用户明确提到 **Nuxt / Nuxt3 / Nuxt.js**；需要 **SSR / SSG / ISR**；需要 **SEO 优化**
（企业官网、内容站、电商）；需要 **BFF API 层**（`server/api/` 做后端代理）；
需要前后端同仓库的**全栈项目**。

不适用：纯 SPA（无 SSR）→ `vue-generate-skill`；小程序 / App / 跨端 → `uniapp-app-generate-skill`；
React / Next.js 生态 → `next-generate-skill`；静态文档站 → VitePress / Nuxt Content。

> **注意：Nuxt ≠ Next.js。** 用户提到 Next.js 应转 `next-generate-skill`。

核心能力：SSR 双轨请求（客户端 fetch + 服务端 `$fetch` 自动切换）；BFF API 层（`server/api/` +
H3 event handler，代理 + 鉴权）；SEO 开箱即用（useHead / useSeoMeta / sitemap / robots / JSON-LD）；
认证双层（客户端中间件路由守卫 + 服务端中间件 API 守卫）；SSR 安全存储（useCookie + useState 替代
localStorage + ref）；文件系统路由（`pages/` 即路由，`layouts/` 布局系统）；
环境变量 runtimeConfig（public + private）替代 `process.env`；vue-base-skill 组件复用（3 次复用原则）。

依赖：frontend-request-skill（**强依赖**，复用其 `request.ts`）；vue-base-skill（可选）。

### 4.2 Phase 1：需求澄清（一次性收集）

6 个问题：1) 项目类型（管理后台 / 企业官网 / 电商平台 / 内容网站 / 其他）；2) UI 框架偏好
（Element Plus / Nuxt UI / 其他）；3) 是否需要 SSR（SEO 敏感页需要，纯后台可用 SPA）；
4) 后端情况（已有 API？需要 BFF 代理？地址与接口规范？）；5) 认证方式（JWT / Session / OAuth）；
6) 部署环境（Vercel / 自建服务器 / Docker / 静态托管 SSG）。

产出技术方案摘要（等用户确认后再进入下一阶段），需写明：项目类型、渲染模式（SSR/SSG/SPA）、
UI 框架、请求层（frontend-request-skill 规范 + Nuxt `$fetch`）、状态管理（Pinia Setup Store，
SSR 安全存储）、认证方式（JWT + httpOnly Cookie）、部署目标。

### 4.3 Phase 2：初始化

```bash
npx nuxi@latest init {项目名} --packageManager pnpm && cd {项目名}
pnpm add pinia @pinia/nuxt                       # 核心
pnpm add element-plus @element-plus/nuxt         # UI 框架（或 pnpm add @nuxt/ui）
pnpm add -D @nuxtjs/sitemap @nuxtjs/robots       # SEO 模块
pnpm add -D @nuxt/eslint-config eslint prettier  # 开发工具
mkdir -p components composables layouts middleware pages \
  server/api server/middleware server/utils stores types utils assets/styles public
```

nuxt.config.ts（参考 `references/nuxt-config-template.md`）：`modules` 挂
`['@pinia/nuxt', '@element-plus/nuxt', '@nuxtjs/sitemap', '@nuxtjs/robots']`；`ssr: true`；
`runtimeConfig` 分两层 —— 顶层 `apiBase`（服务端专用，后端真实地址）与
`public: { appName, apiBase: '/api' }`（客户端请求前缀）；`app.head` 设
`htmlAttrs.lang = 'zh-CN'` 与 `titleTemplate: '%s - {项目名}'`；`typescript: { strict: true }`。

核心类型 `types/api.ts`：`ApiResponse<T> { code: number; message: string; data: T }`；
`ApiListResponse<T> { items: T[]; total: number; page: number; pageSize: number }`。

tsconfig.json：`extends "./.nuxt/tsconfig.json"` + `compilerOptions`
`{ strict: true, noUncheckedIndexedAccess: true }`。

### 4.4 Phase 3：开发

**步骤 3.1 请求层集成（双轨策略）**

1. 客户端请求 —— 复用 frontend-request-skill 的 `request.ts`，适配 Nuxt cookie 读取：
   从 `useCookie('auth_token')` 取 token 注入 `Authorization: Bearer`，
   用 `useRuntimeConfig().public.apiBase` 拼 URL，`fetch` 后判断响应信封
   `result.code !== 0` 则 `throw { code, message, data }`，否则 `return result.data`。
2. 服务端请求 —— `server/api/` 下直接用 Nuxt 原生 `$fetch`
   （`$fetch(\`${config.apiBase}/users\`, { headers: { Authorization } })`，走 `runtimeConfig.apiBase`）。
3. SSR 统一封装 `utils/request-ssr.ts`：`import.meta.server` 时走 `$fetch`（用 `config.apiBase`），
   否则动态 `import('~/utils/request')` 走客户端 `request()`。签名 `ssrRequest<T>(url, options = {})`。

**步骤 3.2 Pinia Store（SSR 安全）**

`stores/user.ts` 用 Setup Store：`token = useCookie('auth_token')` / `refreshToken = useCookie('refresh_token')`、
`user = useState<User | null>('current_user', () => null)`、`isLoggedIn = computed(() => !!token.value)`；
`login(params)` 走 `useFetch<LoginResult>('/api/auth/login', { method: 'POST', body: params })`，
成功后写入 `token.value` / `user.value`；`logout()` 清空三个状态并 `navigateTo('/login')`。

关键规则：`useCookie()` 替代 localStorage 做 token 存储（服务端可读取）；
`useState()` 替代 `ref()` 做 SSR 状态同步；**禁止在 setup 中直接访问 `localStorage` / `sessionStorage`**。

**步骤 3.3 SEO 配置**（参考 `references/seo-strategy.md`）：
页面内用 `useHead({ title, meta: [{ name: 'description', content }] })` +
`useSeoMeta({ ogTitle, ogDescription, ogImage })`。

**步骤 3.4 认证中间件（双层）**（参考 `references/middleware-auth.md`）

- 客户端 `middleware/auth.ts`：`defineNuxtRouteMiddleware((to) => {...})`，
  取 `useCookie('auth_token')`，无 token 则
  `navigateTo({ path: '/login', query: { redirect: to.fullPath } })`。
- 服务端 `server/middleware/auth.ts`：`defineEventHandler((event) => {...})`，
  对 `/api/` 前缀且非 `/api/auth/` 的请求，`getCookie(event, 'auth_token')` 为空则
  `throw createError({ statusCode: 401, message: '未登录' })`。

**步骤 3.5 BFF API 层**（参考 `references/server-api-routes.md`）

```
server/api/
├── auth/  login.post.ts（登录 + cookie 写入）· me.get.ts（获取当前用户）
└── users/ index.get.ts（列表分页）· [id].get.ts（详情）
```

每个 API Route 的职责：1) 参数校验；2) 鉴权（从 cookie 读 token）；3) 代理转发到真实后端；
4) 错误统一处理。

**步骤 3.6 布局与页面**：`layouts/default.vue` 包 `<AppLayout><slot /></AppLayout>`；
页面用 `definePageMeta({ middleware: 'auth' })` + `useHead({ title })` +
`useAsyncData('users', () => $fetch('/api/users', { query: { page: 1, pageSize: 10 } }))` 做 SSR 预取。

**步骤 3.7 环境变量**：`.env` 写 `NUXT_API_BASE`（服务端私有）+ `NUXT_PUBLIC_APP_NAME`（公开）；
`.env.production` 覆盖生产地址。使用 `useRuntimeConfig()` 访问，**禁止 `process.env`**。

### 4.5 Phase 4：后置验证

`npx nuxi typecheck`（零错误）→ `npx nuxi build`（SSR 构建）或 `npx nuxi generate`（SSG 静态生成）。

SEO 检查清单：每个页面都有唯一 title；关键页面设置 meta description；OG 标签正确；
sitemap 生成正常；robots.txt 配置正确。

SSR 安全检查清单：没有在 setup 中访问 `window` / `document` / `localStorage`；
涉及 DOM 的组件用 `<ClientOnly>` 包裹；Store 用 `useCookie` / `useState` 而非 `ref` 做 SSR 同步；
服务端 API 没有 import 客户端模块。

文档产物：`CLAUDE.md`、`AGENTS.md`、`README.md`（各参考对应模板）。

### 4.6 参考文档清单

`project-structure.md`（目录结构与职责）｜`claude-md-template.md`｜`agents-md-template.md`｜
`api-integration.md`（SSR 双轨请求策略）｜`nuxt-config-template.md`｜`seo-strategy.md`｜
`middleware-auth.md`｜`server-api-routes.md`（BFF 层 H3 event handler 规范）｜
`nuxt-conventions.md`（Auto-imports / 命名 / SSR 安全规则）｜`component-standards.md`｜
`code-examples/`（types / stores / components / pages / server）。均在源技能 `references/` 下。

## 五、未收录引用

- **`vue-admin-skill`（源仓库私有技能，未收录）**：源 `vue-base-skill/COMPONENT_SPEC.md` 以它为对接
  目标（让 `import { BaseCard } from 'vue-card-skill'` 在其 `views/` 下能正确解析；其
  `template/frontend/package.json` 通过 `file:../../../vibeCoding/frontend/vue/vue-base-skill/vue-card-skill`
  软链接 14 个子技能包）。源仓库 `MISSING_SKILLS.md` 登记为私有，可在中期以模板骨架形式开源。
  本 spec 不假装其存在。
- **`universal-login-bridge-skill`（源仓库私有技能，未收录）**：为「通用登录的前端桥接」，
  与 §2.28 universal-login-page 语义相关。源仓库登记为私有，本 spec 不假装其存在。
- 组件对 `frontend-request-skill`（请求层 / `upload()` / `api-contract.md`）、`frontend-icon-skill`、
  `vue-breadcrumb-skill`、`uniapp-base-skill` / `uniapp-theme-skill` 的引用，均对应本 spec 其他文档
  （`shared-request-layer.md` / `assets-and-icons.md` / `frontend/uniapp.md`），此处不重复其规则文本。

## 六、脚本 / 演示资产说明（不吸收）

源技能的 `demo-components/**/*.html`、`components/*.vue`、`templates/*.vue`、`package.json`、
`types/*.ts` 与 `references/code-examples/` 等可执行/示例资产不在本 spec 吸收范围；需要时从源仓库
`vibeCoding/frontend/vue/` 对应路径获取。

