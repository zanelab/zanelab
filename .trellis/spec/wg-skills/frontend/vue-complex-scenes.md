<!-- 来源: jiushiwon/wg-skills @ 3b93743 (Apache-2.0)，有修改；详见 ../NOTICE.md -->
# Vue 复合场景页面规范（管理后台 / 看板 / 对话 / 登录 / 图表 / 上传 / AI 创作台）

> 本文档合并转写自 wg-skills 的 8 个技能：`vue-complex-skill`（父技能）、`vue-crud-skill`、
> `vue-dashboard-skill`、`vue-chat-skill`、`vue-login-skill`、`vue-chart-skill`、
> `vue-upload-integration-skill`、`vue-ai-creative-workspace-skill`。
> 规则实质保留原文（props / events / slots / 类型 / DOM 结构 / 枚举值 / 类名 / 色值照抄），
> 触发词 / frontmatter / 安装步骤 / 演示 HTML 与 png / 逐行 CSS 实现已剥离或压缩。

## 一、跨场景红线（全部复合场景强制遵守）

1. **容器原则（铁律）**：所有卡片 / 面板 / 消息容器 / 图表必须嵌入 `base-card`，无例外。
   - 例外：LED 大屏（dashboard 的 `three-col` 布局）允许自定义组件，不要求 `base-card`。
   - 禁止用原生 `<div>` 模拟卡片外观（大屏除外）。
2. **禁止自造原子组件**：输入框 / 按钮 / 标签 / 弹窗 / 浮层必须从既有组件技能引用，
   禁止裸 `div` 重造；禁止自定义 `div` 实现 input / button / checkbox。
3. **禁止引入第三方 UI 库**：不得引入 Element Plus、Naive UI 等组件库。
4. **零 HTML5 标签（CRUD 系）**：表格用 `<div role="grid">`、按钮用 `<span role="button">`、
   复选框用 `<div role="checkbox">` + ARIA。
5. **Design Token 强制**：所有颜色 / 间距 / 圆角 / 字号使用 `var(--color-*)`、`var(--space-*)`、
   `var(--radius-*)`（唯一定义处见 `vue-theme-style.md`）；禁止裸色值。
6. **结构隔离**：同类多风格场景的差异必须落在 **CSS 变体 + 槽位**上，**模板结构不变**；
   禁止「只换颜色冒充另一种形态」。
7. **职责边界**：页面组件只消费业务层函数；接口调用、轮询、SSE、WebSocket 连接管理、
   持久化、Markdown 渲染、文件上传逻辑均不由页面组件实现。

## 二、vue-complex-skill（父技能：页面类型 → 组件引用矩阵）

父技能不实现组件，只定义「页面类型 → 需要引用哪些组件技能」的路由关系。

| 组件技能 | 用途 |
|----------|------|
| vue-input-skill | 输入框 |
| vue-select-skill | 下拉选择器 |
| vue-datepicker-skill | 日期选择器 |
| vue-table-skill | 表格 |
| vue-form-skill | 表单 |
| vue-card-skill | 卡片 |
| vue-button-skill | 按钮 |
| vue-login-skill | 登录页 |
| vue-crud-skill | 增删改查页面 |
| vue-dashboard-skill | 数据看板页面 |
| vue-chart-skill | 图表组件（折线/柱状/饼图/散点/雷达/仪表盘/进度环/漏斗/热力图） |
| vue-chat-skill | AI 对话页面 |
| vue-upload-integration-skill | 上传全链路集成（表单+上传+后端契约） |

| # | 页面类型 | 引用组合 | 功能 |
|---|---------|---------|------|
| 1 | 列表页（List Page） | BaseInput + BaseSelect + BaseDatePicker + BaseTable | 搜索筛选 + 表格展示 + 分页 |
| 2 | 表单页（Form Page） | BaseForm + BaseInput + BaseSelect + BaseDatePicker + BaseButton | 数据新增/编辑表单 |
| 3 | 详情页（Detail Page） | BaseCard + BaseInput + BaseButton | 数据查看 + 操作按钮 |
| 4 | 仪表盘（Dashboard） | BaseCard + BaseTable + BaseChart | 统计卡片 + 图表（折线/柱状/饼图/仪表盘） |
| 5 | 设置页（Settings） | BaseForm + BaseCard + BaseButton | 系统设置表单项 |
| 6 | 增删改查页（CRUD） | BaseCrudPage（整合下列全部） | 搜索 + 表格 + 新增/编辑弹窗 + 删除确认 + 分页 |
| 7 | 数据看板页 | BaseCard + BaseTable + BaseButton + BaseTag + BaseChart | KPI 卡片 + 图表 + 活动流 + 快捷操作 |
| 8 | AI 对话页（Chat） | BaseCard + BaseButton | 消息列表 + 代码块 + 流式输出 + 侧边历史 + 输入区 |
| 9 | 上传集成页 | BaseUpload + BaseForm + BaseButton + BaseTag | 头像设置 / 商品发布 / 文件管理 / 批量导入 |

> 源文档编号顺序为 1,2,3,4,5,7,8,9,6（CRUD 排在最后），此处按类型归位，条目无增删。

## 三、vue-crud-skill — 增删改查页面（BaseCrudPage）

### 3.1 约束

- **容器原则**：必须嵌入 `<base-card>` 使用。
- **零 HTML5 标签**：表格用 `<div role="grid">`，按钮用 `<span role="button">`，复选框用 `<div role="checkbox">`。
- **Design Token**：所有颜色/间距/圆角使用 `var(--color-*)` / `var(--space-*)` / `var(--radius-*)`。
- **响应式**：768px 以下搜索区纵向排列，表单单列。
- **自包含按钮系统**：CRUD 组件使用自带的 `.base-crud-page__btn` 而非引用 vue-button-skill 的
  base-button，以保证组件独立可用（demo 中用 base-button 只为展示组件协作）。

### 3.2 引用组件

vue-table-skill（排序/空状态/加载遮罩）、vue-form-skill（rules 驱动校验）、vue-input-skill、
vue-select-skill、vue-datepicker-skill（日期范围搜索）、vue-button-skill（工具栏/弹窗按钮）、
vue-checkbox-skill（全选/半选）、vue-status-skill（启用/禁用标签）、vue-tag-skill（角色标签）、
vue-switch-skill（表单开关）、vue-toast-skill（操作反馈）、vue-dialog-skill（删除确认）、
vue-theme-skill（多主题，可选，demo 展示 6 色主题）。

### 3.3 Props

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `columns` | `Column[]` | `[]` | 表格列配置 |
| `searchFields` | `SearchField[]` | `[]` | 搜索字段配置 |
| `formFields` | `FormField[]` | `[]` | 表单字段配置 |
| `data` | `any[]` | `[]` | 表格数据 |
| `loading` | `boolean` | `false` | 加载状态（显示遮罩动画） |
| `pagination` | `Pagination` | `{ page:1, pageSize:10, total:0 }` | 分页配置 |
| `showSearch` | `boolean` | `true` | 是否显示搜索区 |
| `showPagination` | `boolean` | `true` | 是否显示分页 |
| `showBatchDelete` | `boolean` | `true` | 是否显示批量删除 |
| `showExport` | `boolean` | `true` | 是否显示导出按钮 |
| `showRefresh` | `boolean` | `true` | 是否显示刷新按钮 |
| `addBtnText` | `string` | `'新增'` | 新增按钮文字 |
| `searchBtnText` | `string` | `'搜索'` | 搜索按钮文字 |
| `resetBtnText` | `string` | `'重置'` | 重置按钮文字 |
| `modalTitle` | `string` | `'操作'` | 弹窗标题 |
| `rowKey` | `string` | `'id'` | 行数据唯一键字段名 |

### 3.4 Events

| 事件 | 参数 | 说明 |
|------|------|------|
| `search` | `(params: object)` | 点击搜索，携带搜索条件 + 分页参数 |
| `reset` | `()` | 点击重置 |
| `add` | `(formData: object) => Promise` | 新增保存，返回 Promise 控制 loading |
| `edit` | `(row: object, formData: object) => Promise` | 编辑保存 |
| `delete` | `(row: object) => Promise` | 删除单条 |
| `batch-delete` | `(rows: object[]) => Promise` | 批量删除 |
| `export` | `()` | 点击导出 |
| `refresh` | `()` | 点击刷新 |
| `page-change` | `(page: number, pageSize: number)` | 分页变化 |
| `sort-change` | `(field: string, order: 'asc'\|'desc'\|'')` | 排序变化 |

### 3.5 Slots

| Slot | 参数 | 说明 |
|------|------|------|
| `cell-{prop}` | `{ row, value }` | 自定义单元格渲染（如状态标签、角色标签） |

### 3.6 类型定义（types/crud.ts）

```typescript
export interface Column {
  prop: string;
  label: string;
  width?: number | string;   // 固定宽度(px) 或 flex 比例
  sortable?: boolean;        // 是否可排序
  fixed?: 'left' | 'right';
  formatter?: (row: any, column: Column, cell: any) => string;
}

export interface SearchField {
  type: 'input' | 'select' | 'datepicker';
  key: string;
  label?: string;            // 搜索标签（可选）
  placeholder?: string;
  options?: { label: string; value: any }[];
  wide?: boolean;            // 宽度加倍（如日期范围，min-width 180px → 260px）
  advanced?: boolean;        // 是否放在高级搜索区
}

export interface FormField {
  type: 'input' | 'select' | 'datepicker' | 'textarea' | 'switch';
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;        // 快捷必填标记
  rules?: ValidationRule[];  // 自定义校验规则
  options?: { label: string; value: any }[];
  props?: Record<string, any>;
  span?: 1 | 2;              // 表单网格占列数（默认 1，2 = 满行）
}

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'phone';
  pattern?: RegExp;
  min?: number;
  max?: number;
  message: string;
}

export interface Pagination { page: number; pageSize: number; total: number; }

export interface CrudEmits {
  search: [params: object]; reset: [];
  add: [formData: object]; edit: [row: object, formData: object];
  delete: [row: object]; 'batch-delete': [rows: object[]];
  export: []; refresh: [];
  'page-change': [page: number, pageSize: number];
  'sort-change': [field: string, order: 'asc' | 'desc' | ''];
}
```

### 3.7 渲染结构（BEM 类名照抄）

```vue
<div class="base-crud-page">
  <!-- 搜索区 -->
  <div class="base-crud-page__search">
    <div class="base-crud-page__search-row">
      <!-- 基础搜索：base-input / base-select / base-datepicker -->
      <span role="button">高级搜索 ▼</span>
      <span role="button">搜索</span>
      <span role="button">重置</span>
    </div>
    <div class="base-crud-page__search-advanced"> <!-- 展开/收起 --> </div>
  </div>

  <!-- 工具栏 -->
  <div class="base-crud-page__toolbar">
    <span role="button">+ 新增</span>
    <span role="button">批量删除</span>
    <span role="button">导出</span>
    <span role="button">↻ 刷新</span>
    <span>已选 N 项</span>
  </div>

  <!-- 加载遮罩 -->
  <div class="base-crud-page__loading-overlay">
    <div class="spinner"></div><span>加载中...</span>
  </div>

  <!-- 表格：零 HTML5，全 ARIA -->
  <div class="base-table" role="grid">
    <div class="base-table__row--header" role="row">
      <div class="checkbox">全选</div>
      <div v-for="col" role="columnheader">标签 ▲▼</div>
      <div>操作</div>
    </div>
    <div class="base-table__row--data" role="row">
      <div class="checkbox">行选</div>
      <div v-for="col" role="gridcell">{{ 值 }}</div>
      <div class="actions">
        <span role="button">编辑</span><span role="button">删除</span>
      </div>
    </div>
  </div>

  <!-- 分页 -->
  <div class="base-paginated">
    <span>共 N 条</span>
    <select>10/20/50 条/页</select>
    <span role="button">‹</span><span>1 2 3 ...</span><span role="button">›</span>
    <span>跳至 [input] 页</span>
  </div>

  <!-- 新增/编辑弹窗 -->
  <div class="modal-overlay">
    <div class="modal">
      <div class="modal-header">新增/编辑 {{ modalTitle }}</div>
      <div class="modal-body">
        <div class="form-grid"><!-- base-input / base-select / base-datepicker / switch / textarea --></div>
        <span class="form-error">{{ 校验错误 }}</span>
      </div>
      <div class="modal-footer">
        <span role="button">取消</span><span role="button">保存</span>
      </div>
    </div>
  </div>

  <!-- 删除确认弹窗 -->
  <div class="confirm-overlay">
    <div class="confirm-box">
      <span>⚠ 确认删除</span>
      <span role="button">取消</span><span role="button">确认删除</span>
    </div>
  </div>

  <!-- Toast -->
  <div class="toast">✓ 操作成功</div>
</div>
```

### 3.8 关键类名与 CSS 变量（BEM / Token 映射）

命名规范：`base-crud-page` 为根 BEM 块，配 `base-table` / `base-paginated` / `base-switch` /
`confirm-*` / `toast` 等子块；状态修饰统一用 `.is-*`（`is-open` / `is-checked` /
`is-indeterminate` / `is-selected` / `is-disabled` / `is-active` / `is-required` / `is-visible` /
`is-on`），变体修饰用 `--*`（`--wide` / `--primary` / `--danger` / `--ghost` / `--checked` /
`--indeterminate` / `--disabled` / `--full` / `--header`）。

结构分组（element 名）：搜索区 `__search` / `__search-row` / `__search-field(--wide)` / `__search-label` /
`__search-btns` / `__search-toggle(-arrow)` / `__search-advanced`；按钮 `__btn`；工具栏 `__toolbar(-spacer/-info)`；
加载 `__loading-overlay` / `__loading-ring` / `__loading-text`；表格 `base-table__row(--header/--data)` /
`__cell(--checkbox/--actions)` / `__checkbox` / `__sort-icon` / `__actions` /
空态 `__empty(-icon/-icon-shape/-text)`；行内操作 `base-crud-page__action-btn(--danger)`；
分页 `base-paginated__total` / `__right` / `__size-select(-arrow/-panel/-option)` / `__buttons` /
`__page-btn` / `__ellipsis` / `__jumper(-input)`；弹窗 `__modal-overlay` / `__modal(-header/-close/-body/-footer)` /
`__form-grid` / `__form-item(--full)` / `__form-label` / `__form-error` / `__textarea`；
开关 `base-switch__track` / `__thumb` / `__label`；确认 `confirm-overlay` / `confirm-box__icon(-shape)` /
`__title` / `__desc` / `__btns`；Toast `toast__icon` / `toast--danger` / `toast--warning`。

关键布局值：搜索区 gap `--space-3`、field `min-width:180px`（wide 260px）、toggle 高 40px、
按钮高 36px + `--radius-md,8px`、禁用 opacity .4 + `pointer-events:none`。
响应式 `@media (max-width: 768px)` 下 `__search-row` 纵向排列、表单单列。

> 源文 `styles.css` 中所有 Token 均带兜底字面值（如 `var(--space-5, 20px)`、
> `var(--color-primary, #409eff)`）。兜底值与 `vue-theme-skill` 的规范值不完全一致
> （例如 `#409eff`、`--radius-md,8px`），实为 Element Plus 系色板兜底，
> 仅作缺省，不应作为本层规范值使用。

### 3.9 Composables：`useCrud`

把搜索 / 排序 / 选择 / 弹窗 / 校验 / 分页逻辑全部内置，签名：

```typescript
export function useCrud<T extends Record<string, any>>(options: {
  rowKey?: string;                                              // 默认 'id'
  loadData: (params: any) => Promise<{ data: T[]; total: number }>;
  onAdd?: (data: Partial<T>) => Promise<T>;
  onEdit?: (row: T, data: Partial<T>) => Promise<T>;
  onDelete?: (row: T) => Promise<void>;
  onBatchDelete?: (rows: T[]) => Promise<void>;
})
```

返回：状态 `data` / `loading` / `pagination` / `searchParams` / `sortField` / `sortOrder` /
`selectedIds` / `selectedCount` / `selectedRows` / `modalVisible` / `modalMode` / `currentRow` /
`formData` / `formErrors` / `formLoading` / `confirmVisible` / `confirmDesc`；
方法 `load` / `search` / `reset` / `refresh` / `add` / `edit` / `remove` / `batchRemove` /
`changePage` / `toggleSort` / `toggleRow` / `toggleSelectAll` / `clearSelection` /
`setSearchParam` / `resetSearchParams`。

内置行为约定（源实现要点）：

- **排序循环**：同字段点击 asc → desc → ''（清空字段），换字段则重置为 asc。
- **选择状态**：用 `Set` 存 id；每次变更后 `selectedIds.value = new Set(selectedIds.value)` 触发响应式；
  全选/半选基于当前页数据计算（`isAllSelected` / `isIndeterminate`）。
- **搜索**：重置 `page = 1` + 清空选择后再 `emit('search', { ...searchParams, page:1, pageSize })`。
- **重置**：清空所有搜索字段 + `page=1` + 清空排序 + 清空选择。
- **刷新**：清空选择 + `page=1` + `emit('refresh')`。
- **分页**：`pageSizeOptions = [10, 20, 50]`；页码按钮取当前页 ±2，两端补 1 / total 与省略号。
- **分页边界**：`handlePageChange` 越界直接 return；`totalPages = max(1, ceil(total/pageSize))`。
- **删除后修正当前页**：删除后若当前页 > 最大页，回退到最大页并 `emit('page-change', maxPage, pageSize)`
  ——防止删完最后一页数据后看到空白。
- **校验**：快捷 `required` 优先（错误文案 `请输入${label}`）；`rules` 支持 `required` / `type:'email'`
  （正则 `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`）/ `pattern` / `min` / `max`（min/max 仅对字符串长度生效）。
- **提交**：`add` 模式 `emit('add', {...formData})`，`edit` 模式 `emit('edit', currentRow, {...formData})`；
  两者均为 Promise，成功后关闭弹窗并 toast「新增成功 / 保存成功」，失败 toast `e.message || '操作失败'`（danger）。
- **新增弹窗初始化**：`switch` 类型字段默认 `true`，其余默认 `''`。
- **删除确认文案**：单条 `确定要删除「${row.name || row.title || '该记录'}」吗？此操作不可恢复。`；
  批量 `确定要删除选中的 N 条记录吗？此操作不可恢复。`
- **Toast**：`showToast(msg, type = 'success' | 'danger' | 'warning')`，2000ms 后自动消失。
- **全局下拉关闭**：根节点 `@click` 调 `closeAllDropdowns()`。
- **加载数据**：`load()` 组装的请求参数为
  `{ ...searchParams, ...params, page, pageSize, sortField, sortOrder }`。

### 3.10 使用与接口约定

`index.ts` 导出：`BaseCrudPage`、类型 `Column/SearchField/FormField/ValidationRule/Pagination/CrudProps/CrudEmits`、`useCrud`。

`loadData` 需把接口响应转换为 `{ data, total }`——源示例对接 api-contract 响应信封
`{ code, data: { list, total } }`：

```typescript
const crud = useCrud({
  loadData: async (params) => {
    const res = await request.get('/api/users', { params });
    return { data: res.data.list, total: res.data.total };
  },
  onAdd:  async (data) => (await request.post('/api/users', data)).data,
  onEdit: async (row, data) => (await request.put(`/api/users/${row.id}`, data)).data,
  onDelete: async (row) => { await request.delete(`/api/users/${row.id}`); },
  onBatchDelete: async (rows) => {
    await request.post('/api/users/batch-delete', { ids: rows.map(r => r.id) });
  },
});
onMounted(() => crud.load());
```

自定义单元格：

```vue
<template #cell-status="{ value }">
  <span :class="value === 1 ? 'text-success' : 'text-danger'">{{ value === 1 ? '启用' : '禁用' }}</span>
</template>
<template #cell-role="{ value }">
  <span class="tag">{{ { admin: '管理员', user: '用户', guest: '访客' }[value] || value }}</span>
</template>
```

功能清单（源文特性表）：搜索（基础 + 高级展开/收起）、表格（全选/半选、排序、斑马纹、空状态）、
工具栏（新增/批量删除/导出/刷新）、新增编辑弹窗（双列表单网格、必填+格式校验）、删除确认（单条+批量）、
Toast 反馈（成功/失败/警告）、分页（页码、pageSize 选择器、页码跳转）、加载遮罩（spinner 动画）、
自定义单元格 Slot、useCrud、响应式布局、多主题（Design Token）。

## 四、vue-dashboard-skill — 数据看板（6 风格 × 5 布局）

### 4.1 容器原则

> 所有数据卡片必须基于 `base-card` 容器组件。
> **例外：LED 大屏（`three-col` 布局）允许自定义组件，不要求 `base-card`。**

`base-card` 提供统一的圆角、阴影、内边距、hover 动效。

### 4.2 Variant（视觉风格）— 控制颜色、字体、阴影、特效

| # | 风格 | 核心差异 | 枚举值 |
|---|------|----------|--------|
| 1 | 经典白色 | 白底蓝调，标准卡片阴影，斑马纹表格 | `classic` |
| 2 | 暗色霓虹 | 深蓝黑底，青色霓虹发光，科技网格 | `dark` |
| 3 | 极简无框 | 纯白无阴影，极细分割线，大量留白 | `minimal` |
| 4 | LED 大屏 | 深蓝底色，亮蓝强调，超大字号投屏 | `bigscreen` |
| 5 | 毛玻璃 | 暗色渐变底，紫色系，backdrop-filter | `glass` |
| 6 | 紧凑高密 | 浅灰底色，缩小间距字号，最大信息密度 | `compact` |

### 4.3 Layout（结构布局）— 控制 DOM 结构与 Grid

| # | 布局 | 核心结构 | 推荐搭配 variant |
|---|------|----------|-----------------|
| 1 | `default` | 标准流式：header → kpi → content-grid → table-grid | classic / dark / minimal / compact |
| 2 | `panels` | KPI 通栏 + 左右双面板 | dark |
| 3 | `three-col` | 左中右三栏大屏投屏（大屏专用，允许自定义组件） | bigscreen |
| 4 | `bento` | 自由网格卡片，KPI 独立卡片 + 通栏图表/表格 | glass |
| 5 | `grid4` | 2×2 四区均分网格 | compact |

### 4.4 Props / Events / Slots / Types

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `variant` | `string` | `'classic'` | classic / dark / minimal / bigscreen / glass / compact |
| `layout` | `LayoutType` | `'default'` | default / panels / three-col / bento / grid4 |
| `title` | `string` | `'数据看板'` | 页头标题 |
| `subtitle` | `string` | `'实时业务数据概览'` | 页头副标题 |
| `kpis` | `KpiItem[]` | `[]` | KPI 指标数据 |
| `activities` | `ActivityItem[]` | `[]` | 实时动态数据 |
| `orders` | `OrderItem[]` | `[]` | 订单数据 |
| `showHeader` / `showKpi` / `showChart` / `showActivity` / `showTable` | `boolean` | `true` | 各区域显隐 |
| `loading` | `boolean` | `false` | 加载态 |

| 事件 | 参数 | 说明 |
|------|------|------|
| `refresh` | 无 | 用户点击刷新按钮 |
| `export` | 无 | 用户点击导出按钮 |

| Slot | 作用域 | 说明 |
|------|--------|------|
| `header-actions` | 无 | 页头操作区（替代默认刷新/导出按钮） |
| `kpi-extra` | `{ kpi }` | KPI 卡片额外内容 |
| `chart-custom` | 无 | 替代默认纯 CSS 柱状图（接入 ECharts 等） |
| `activity-custom` | 无 | 替代默认动态列表 |
| `table-custom` | 无 | 替代默认订单表格 |
| `col-left` / `col-center` / `col-right` | 无 | three-col 布局的左 / 中 / 右栏内容 |

```ts
type LayoutType = 'default' | 'panels' | 'three-col' | 'bento' | 'grid4'

interface KpiItem {
  label: string; value: string;
  trend: 'up' | 'down' | 'flat';
  change: string;
  icon: string;    // SVG 内联图标字符串
  color: string;   // 主题色 hex
}
interface ActivityItem {
  avatar: string;  // 头像内容（首字母/图标）
  name: string; action: string; time: string;
  color?: string;  // 可选，头像背景色
}
interface OrderItem {
  id: string; product: string; customer: string; amount: string;
  status: 'completed' | 'pending' | 'processing' | 'cancelled';
  date: string;
}
```

### 4.5 布局结构（类名照抄）

**default — 标准流式**

```
.dash-page--default (flex column)
├── .dash-header
├── .dash-kpi-row (grid: auto-fill)
│   └── base-card.dash-kpi-card × N
├── .dash-content-grid (grid: 2fr 1fr)
│   ├── base-card.dash-chart-card
│   └── base-card.dash-activity-card
└── .dash-table-grid (grid: 1fr 1fr)
    ├── base-card.dash-orders-card
    └── base-card.dash-top-card
```

**panels — 双面板**

```
.dash-page--panels (flex column)
├── .dash-header
├── .dash-kpi-row (6 列)
└── .dash-panels (grid: 1fr 1fr)
    ├── .dash-panel--left  → base-card.dash-chart-card + base-card.dash-activity-card
    └── .dash-panel--right → base-card.dash-orders-card + base-card.dash-top-card
```

**three-col — 左中右三栏（大屏专用）**

```
.dash-page--three-col (flex column)
├── .dash-header
└── .dash-three-col (grid: 280px 1fr 320px)
    ├── .dash-col--left   → slot[name=col-left]
    ├── .dash-col--center → slot[name=col-center]
    └── .dash-col--right  → slot[name=col-right]
```

> 大屏特殊说明：three-col 通过 slot 注入内容，不要求 base-card；可放任意自定义组件
> （实时时钟、地图、大字号 KPI 等）。

**bento — 自由网格**

```
.dash-page--bento (flex column)
├── .dash-header
└── .dash-bento-grid (grid: 4col × 3row, grid-area 定位)
    ├── base-card.dash-kpi-card--bento × 4 (第一行)
    ├── base-card.dash-chart-card (第二行左半)
    ├── base-card.dash-activity-card (第二行右半)
    ├── base-card.dash-top-card (第三行左半)
    └── base-card.dash-orders-card (第三行右半)
```

**grid4 — 2×2 四区均分**

```
.dash-page--grid4 (flex column)
├── .dash-header
└── .dash-grid4 (grid: 1fr 1fr × 1fr 1fr)
    ├── .dash-zone--kpi   (左上) → base-card.dash-kpi-card × N (3×2 紧凑网格)
    ├── .dash-zone--chart (右上) → base-card.dash-chart-card
    ├── .dash-zone--table (左下) → base-card.dash-orders-card
    └── .dash-zone--misc  (右下) → base-card.dash-activity-card + base-card.dash-top-card
```

### 4.6 内置组件与依赖

内置（`components/`）：`BaseCard`（封装 vue-card-skill 的 CSS，6 维度参数）、`BaseProgressBar`
（水平进度条：预算执行率/指标达成率/出勤率）、`BaseHorizontalBar`（横向条形图：账龄分析/成绩分布/资产统计）、
`BaseCompareBars`（双期对比条形图：同比/环比）、`BaseStatGrid`（统计数字网格：班级统计/区域概览）、
`BaseApprovalList`（待办/审批列表：费用审批/待办事项）、`BaseBigKpi`（LED 大屏超大 KPI）、
`BaseKpiMini`（迷你紧凑 KPI）、`BaseSparkline`（SVG 迷你趋势图）、`BaseScrollFeed`（实时滚动数据流）。

图表来自 vue-chart-skill：`BaseLineChart` / `BaseBarChart` / `BasePieChart`（含环形图 donut 模式）、
`BaseGaugeChart` / `BaseFunnelChart` / `BaseProgressRing`。

**零外部依赖的操作元素**：操作按钮用原生 `<div class="dash-header__btn">` + SVG 图标；
状态标签用原生 `<span class="dash-status-tag">` + CSS 变体类。

### 4.7 不做

不做实时 WebSocket 推送（mock 数据即可）、不做图表库集成（纯 CSS 柱状图 + slot 扩展）、
不做后端 API 对接、不做路由配置、不做权限控制、不做响应式断点之外的布局适配、不做数据持久化。

## 五、vue-chat-skill — AI 对话页（6 风格）

### 5.1 容器原则与依赖

> **所有助手消息容器必须基于 `base-card` 实现，无例外。**

消息卡片容器来自 vue-base-skill 的 base-card；发送/操作按钮来自 vue-button-skill 的 base-button。
**禁止**自定义 div 实现按钮。

### 5.2 6 种风格（`variant` 枚举）

| 风格 | 核心差异 | `variant` |
|------|----------|-----------|
| Codex 暗色终端（默认） | 暗色终端、等宽字体、代码块、绿色强调、流式输出 | `codex` |
| ChatGPT 极简 | 纯白简洁、ChatGPT 风格、无衬线 | `minimal` |
| 客服工单 | 侧边栏工单列表、客户信息面板 | `support` |
| 消息气泡 | iMessage/微信气泡、圆润、多彩 | `bubble` |
| IDE 对话 | VS Code 暗色主题、分栏布局、代码为主 | `ide` |
| 深色玻璃 | 暗色毛玻璃、微光晕、高级感 | `glass-dark` |

**所有风格的差异仅在 CSS 变体上，模板结构不变。**

### 5.3 模板结构（class 名照抄）

```
.chat-page.chat-page--{variant}
├── aside.chat-sidebar（showSidebar 控制）
│   ├── .chat-sidebar__header → slot[name=sidebar-header]（默认「+ 新对话」按钮）
│   ├── .chat-sidebar__search（input placeholder="搜索对话..."）
│   └── .chat-sidebar__list
│       └── .chat-sidebar__item（--active 态）
│           ├── __item-title / __item-preview / __item-time
│           └── __item-badge（unread 未读数）
└── main.chat-main
    ├── header.chat-header（showHeader 控制）
    │   ├── .chat-header__title
    │   ├── .chat-header__model + .chat-header__model-dot
    │   └── .chat-header__actions → slot[name=header-actions]
    ├── .chat-messages
    │   ├── .chat-message--system → .chat-message__system-text
    │   ├── .chat-message--user → .chat-message__bubble--user
    │   │     └── .chat-message__content + .chat-message__time
    │   └── base-card.chat-message--assistant
    │         ├── .chat-message__avatar（SVG bot icon）
    │         ├── .chat-message__body
    │         │   ├── .chat-message__content（v-html formatContent）
    │         │   ├── .chat-code-block（__header / __lang / __copy 按钮 / __pre>code）
    │         │   └── .chat-message__footer → __time + __error（status==='error'）
    │         └── slot[name=message-custom]（:message 作用域）
    ├── .chat-message--loading → .chat-typing-indicator（三点）
    ├── .chat-streaming-cursor（流式输出光标）
    ├── .chat-input-area
    │   ├── .chat-input-area__wrapper（__attach 附件按钮 + textarea + base-button 发送）
    │   ├── .chat-input-area__hint（Enter 发送 · Shift+Enter 换行）
    │   └── slot[name=input-extra]
    └── footer.chat-status-bar（showStatusBar 控制）
        ├── .chat-status-bar__connection + __dot（connectionClass）
        ├── .chat-status-bar__tokens（Tokens: N）
        └── .chat-status-bar__latency（延迟: N ms）
```

交互约定：textarea `@keydown.enter.exact="handleSend"`、`@input="autoResize"`；
发送按钮 `:disabled="!inputText.trim() || streaming"`，流式中显示「停止」否则「发送」。

### 5.4 Props / Events / Slots / Types

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `variant` | `'codex' \| 'minimal' \| 'support' \| 'bubble' \| 'ide' \| 'glass-dark'` | `'codex'` | 视觉风格 |
| `title` | string | `'新对话'` | 当前对话标题 |
| `modelLabel` | string | `'Claude Sonnet'` | 模型名称 |
| `conversations` | `Conversation[]` | `[]` | 对话列表 |
| `messages` | `ChatMessage[]` | `[]` | 当前对话消息 |
| `showSidebar` / `showHeader` / `showStatusBar` | boolean | `true` | 区域显隐 |
| `loading` | boolean | `false` | 等待响应中 |
| `streaming` | boolean | `false` | 流式输出中 |
| `currentConversationId` | string | `''` | 当前对话 ID |
| `connectionStatus` | `'connected' \| 'connecting' \| 'disconnected'` | `'connected'` | 连接状态 |
| `tokenCount` | number | `0` | Token 计数 |
| `responseTime` | number | `0` | 响应时间(ms) |
| `inputPlaceholder` | string | `'输入消息...'` | 输入框占位符 |

| 事件 | 参数 | 说明 |
|------|------|------|
| `send` | `(message: string)` | 发送消息 |
| `conversation-select` | `(id: string)` | 选择对话（新建传 `''`） |
| `conversation-delete` | `(id: string)` | 删除对话 |
| `retry` | `(messageId: string)` | 重试消息 |
| `stop` | — | 停止流式输出 |

| 插槽 | 说明 |
|------|------|
| `sidebar-header` | 侧边栏头部（新建对话按钮区域） |
| `message-custom` | 自定义消息扩展（消息下方附加内容） |
| `input-extra` | 输入区域额外内容（如模型选择器） |
| `header-actions` | 头部操作按钮 |

```typescript
interface Conversation {
  id: string; title: string; lastMessage: string; timestamp: string; unread?: number;
}
interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  code?: string; language?: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'error';
}
```

### 5.5 风格配色速查（色值照抄）

| variant | 页面底 | 侧边栏 | 强调色 / 要点 |
|---------|--------|--------|--------------|
| `codex` | `#0d1117` | `#010409`（border-right `#21262d`） | 绿 `#3fb950`（active 左边框、光标、model-dot `0 0 6px rgba(63,185,80,.5)`）；You: `#58a6ff`；代码块 `#161b22`/`#21262d`；mac 三点 `#f85149`；状态栏文字 `#8b949e`；等宽栈 `'JetBrains Mono','Fira Code','Cascadia Code',monospace` |
| `minimal` | `#fff` | `#f7f7f8`（hover `#ececf1`，active `#e5e5e5`） | 用户气泡 `#10a37f`；助手消息 `#f7f7f8`；输入框 focus `0 0 0 2px rgba(16,163,127,.2)`；气泡圆角 `18px 18px 4px 18px` |
| `support` | `#f0f2f5` | `#fff` | 在线点 `#52c41a`；active `#e6f7ff` + 左边框 `#1890ff`；客户卡片 `#fafafa`，套餐 `#faad14`；快捷回复按钮 hover 边框 `#1890ff` |
| `bubble` | `#ebe9e5` | `#fff` | 用户气泡 `#007aff`（clip-path 尾巴）；助手气泡 `#fff`（反向尾巴）；代码块 `#1a1a2e`；头像 36px 圆形 `#f0f0f0` |
| `ide` | `#1e1e1e` | `#252526`（宽 260px） | active `#37373d` + 左边框 `#007acc`；system 消息 `#6a9955` 斜体；用户气泡 `#264f78`；代码块头 `#2d2d2d`，`::before content:'{}'` 色 `#569cd6`；状态栏 `#007acc` 高 22px |
| `glass-dark` | `#0a0a0a` | `rgba(255,255,255,.03)` + `blur(20px)` | 紫 `#8b5cf6`；用户气泡 `rgba(139,92,246,.2)` + 边框 `.3` + `blur(10px)`；输入框 focus-within 边框 `rgba(139,92,246,.4)` |

### 5.6 不做

不处理后端 AI 接口（业务层实现）、不处理 Markdown 渲染引擎（业务层引入 marked/markdown-it）、
不内置文件上传逻辑、不处理 WebSocket 连接管理、不处理消息持久化（均业务层负责）、
不自定义 div 模拟按钮（必须用 base-button）。

## 六、vue-login-skill — 高端登录页（9 风格 + 5 wrapper）

### 6.1 容器原则（铁律）

> **所有登录卡片必须基于 `base-card` 实现，无例外。**

```vue
<template>
  <base-card class="login-card login-card--frosted"><!-- 登录内容 --></base-card>
</template>
```

组件依赖：`base-card`（vue-base-skill）、`base-form` / `base-form-item` / `base-input` /
`base-checkbox`（vue-form-skill）、`base-button`（vue-button-skill）。
**禁止**自定义 div 实现 input / button / checkbox。

### 6.2 9 种风格（结构级差异，不只是换色）

| 风格 | 核心差异 | `variant` | 是否需要 wrapper |
|------|----------|-----------|------------------|
| frosted 毛玻璃 | backdrop-filter 模糊 + 半透明白底 | `frosted`（默认） | 否 |
| particles 粒子 | Canvas 粒子连线 + 鼠标交互 | `particles` | 是：`ParticleBackground` |
| flip 3D 翻转 | 2 张卡 3D rotateY 翻转 | `flip` | 是：`FlipLoginContainer` |
| split 分屏 | 左品牌 50% + 右白卡 50% | `split` | 是：`SplitLayout` |
| split-pro 品牌分屏 | 左品牌 55% + 右白卡 45% 全屏 | `split-pro` | 是：`SplitProLayout` |
| dark 暗黑科技 | 深色 + 扫描线 + 霓虹光效 + cyan 焦点 | `dark` | 否 |
| minimal 极简 | 大量留白 + input 底部下划线 + 黑底按钮 | `minimal` | 否 |
| typewriter 打字机 | 等宽字体 + GitHub 配色 + 终端 3 色圆点 + `$` 提示 | `typewriter` | 否 |
| puzzle 滑块拼图 | 拖动滑块完成拼图验证 | `puzzle` | 是：`PuzzleCaptcha` |

设计原则：**技能不渲染 label 行** —— 字段识别靠 prefix icon + placeholder；
消费者通过 props 覆盖 placeholder / 校验文案 / 按钮文字（i18n / 业务改名）。

### 6.3 标准 LoginForm（所有风格共用，差异仅在 CSS 变体 + 槽位）

Props：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `variant` | 见 6.2 | `'frosted'` | 视觉风格 |
| `title` | string | `'登录'` | 标题 |
| `subtitle` | string | `'请输入您的账号信息'` | 副标题 |
| `submitText` | string | `'登 录'` | 提交按钮文字 |
| `showCaptcha` | boolean | `false` | 显示验证码 |
| `showRemember` | boolean | `true` | 显示记住我 |
| `showForgot` | boolean | `true` | 显示忘记密码 |
| `showRegister` | boolean | `true` | 显示注册链接 |
| `loading` | boolean | `false` | 加载中 |
| `usernamePlaceholder` | string | `'请输入用户名 / 邮箱'` | 账号字段 placeholder |
| `passwordPlaceholder` | string | `'请输入密码'` | 密码字段 placeholder |
| `captchaPlaceholder` | string | `'请输入验证码'` | 验证码字段 placeholder |
| `rememberLabel` | string | `'记住我'` | 记住我复选框文字 |
| `forgotLabel` | string | `'忘记密码？'` | 忘记密码按钮文字 |
| `registerPromptLabel` | string | `'还没有账号？'` | 注册引导前缀 |
| `registerLabel` | string | `'立即注册'` | 注册按钮文字 |
| `usernameRequiredMessage` | string | `''` | 账号必填校验文案（默认按 placeholder 推断） |
| `passwordRequiredMessage` | string | `''` | 密码必填校验文案 |
| `captchaRequiredMessage` | string | `''` | 验证码必填校验文案 |
| `centerTitle` | boolean | `false` | 标题/副标题居中（dark / minimal / typewriter 用） |
| `cardWidth` | `string \| number` | `'420px'` | 卡片宽度（minimal 360px；split-pro 400px） |
| `terminalHeader` | string | `''` | typewriter 终端头部文件名（如 `"login.sh"`） |
| `terminalPrompt` | string | `''` | typewriter `$` 提示行文本 |
| `submitButtonBg` | string | `''` | 覆盖提交按钮背景色 |

Slots：

| 名称 | 用途 | 适用 variant |
|------|------|------------|
| `logo` | 头部 logo 区 | all |
| `divider` | 表单与社交登录之间的「或」分隔线 | all |
| `social` | 社交登录按钮组 | all |
| `captcha-extra` | 验证码右侧（如「获取验证码」按钮 / 数学题图块） | showCaptcha |
| `captcha-puzzle` | 滑块拼图（替换默认验证码行） | puzzle |
| `extraLinks` | 多链接 footer（如「注册账户 \| 手机号登录」） | all |
| `terminal-header` | typewriter 终端头部（默认三色圆点 + terminalHeader） | typewriter |
| `terminal-prompt` | typewriter `$` 提示行（默认文本 + 闪烁光标） | typewriter |

Events：`submit(values)`、`forgot`（点击忘记密码）、`register`（点击注册）。

### 6.4 Wrapper 组件

设计原则：容器级差异（分屏比例 / 3D 容器 / 粒子背景层 / 拼图）抽到 wrapper，
LoginForm 只负责卡片本身。

| Wrapper | 结构 / 用法要点 |
|---------|----------------|
| `FlipLoginContainer` | 3D 翻转容器：两个 `<LoginForm>`（正面登录 / 反面注册）+ perspective + 翻转触发；props `:login-loading` / `:register-loading`，events `@login` / `@register`，slots `#loginExtra` / `#registerExtra` |
| `ParticleBackground` | 粒子 canvas 背景层，把 `particle-engine.js`（ES5 全局类）封装为 Vue 组件；用法 `<ParticleBackground color="#6366f1" />`，外层需 `position: relative` |
| `SplitLayout` | 半屏分屏（左 50% 品牌 / 右 50% 表单），slots `#brand` / `#form` |
| `SplitProLayout` | 全屏品牌分屏（左 55% / 右 45%），带双 radial-gradient 光晕装饰；slots `#brand` / `#form` |
| `PuzzleCaptcha` | 滑块拼图验证，`v-model` 双向绑定 `verified` 状态；配合 `LoginForm variant="puzzle" :disabled="!verified"` + `#captcha-puzzle` |

### 6.5 设计 Token 与变体装饰色

所有组件统一引用 vue-theme-skill。变体装饰色（源文自陈为「rgba 硬编码，token 缺失」）：

- dark 边框 / 焦点：`#0ff`（cyan）
- typewriter GitHub 配色：`#161b22` / `#238636` / `#3fb950`
- particles / split-pro / puzzle 渐变：`#6366f1` / `#8b5cf6` / `#c08766`

v2 相对 v1 的变化（源文自述）：5 个 variant CSS 重写为结构级差异（不只是换色）；
新增 5 个 wrapper 与 5 个 prop（`centerTitle` / `cardWidth` / `terminalHeader` / `terminalPrompt` /
`submitButtonBg`）与 4 个 slot（`#terminal-header` / `#terminal-prompt` / `#brand` / `#page-background`）；
清理冗余 `--login-card-*` 私有 token（全部映射 vue-theme-skill）。

### 6.6 依赖关系与文件结构

```
vue-login-skill
├── vue-base-skill  → base-card（根容器）
├── vue-button-skill → base-button（登录/注册按钮）
└── vue-form-skill  → base-form / base-form-item / base-input / base-checkbox（记住我）
```

源文件结构：

```
vue-login-skill/
├── templates/LoginForm.vue
├── templates/wrappers/{FlipLoginContainer,ParticleBackground,SplitLayout,SplitProLayout,PuzzleCaptcha}.vue
├── templates/wrappers/shared/particle-engine.js
├── components/index.ts
└── demo-components/login-page/html/{00-showcase,01-frosted,02-particles,03-flip,04-split,
    05-dark,06-minimal,07-typewriter,08-split-pro,09-puzzle}.html
```

## 七、vue-chart-skill — 零依赖 Canvas 图表

### 7.1 三条硬约束

> **容器原则**：图表必须嵌入 `<base-card>` 使用。
> **零第三方依赖**：纯 Canvas 2D API 绘制，不依赖 ECharts / Chart.js / D3。
> **视觉品质**：对标 ECharts 5.x，支持动画、Tooltip、图例交互。

### 7.2 图表清单（20 种形态）

折线图系列（7 种形态，组件 `BaseLineChart`）：

| # | 形态 | 参数 | 适用场景 |
|---|------|------|---------|
| 1 | 基础折线 | 默认 | 趋势分析、时间序列 |
| 2 | 平滑曲线 | `smooth: true` | 平滑趋势展示 |
| 3 | 面积填充 | `area: true` | 量化趋势、流量分析 |
| 4 | 多线对比 | 多 `series` | 本月 vs 上月 vs 平均 |
| 5 | 堆叠面积 | `stack` | 累计趋势、构成变化 |
| 6 | 双 Y 轴 | `yAxisIndex` | 量纲不同的指标对比 |
| 7 | 带数值标注 | `showDot` + `label` | 精确数值展示 |

柱状图系列（4 种形态，组件 `BaseBarChart`）：基础柱状（分类对比、业绩统计）、分组柱状
（多系列并排对比）、堆叠柱状（构成分析、累计对比）、带数值标签（精确数值对比）。

饼图系列（3 种形态，组件 `BasePieChart`）：环形图 `type="donut"`（占比分析、来源构成）、
饼图 `type="pie"`（比例展示）、南丁格尔玫瑰图 `roseType="radius"`（分类差异大时使用）。

其他：`BaseScatterChart`（散点图 / 气泡图：相关性分析、分布展示）、`BaseRadarChart`
（雷达图：多维度能力评估、对比）、`BaseGaugeChart`（仪表盘：单指标完成率、KPI）、
`BaseProgressRing`（进度环：任务进度、完成率）、`BaseFunnelChart`（漏斗图：转化分析、流程损耗）、
`BaseHeatmapChart`（热力图：时间分布、密度分析）。

### 7.3 核心架构与 Props

```
vue-chart-skill/
├── types/chart.ts               # 全量类型定义
├── composables/useCanvas.ts     # Canvas 初始化 + DPR
├── composables/useTooltip.ts    # 鼠标 Tooltip
├── composables/useAnimation.ts  # 动画驱动
├── composables/draw-helpers.ts  # 绘图工具函数库
└── components/Base{Line,Bar,Pie,Scatter,Radar,Gauge,ProgressRing,Funnel,Heatmap}Chart.vue
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `option` | 图表配置对象 | - | 各图表对应的 Option 类型（`LineChartOption` / `BarChartOption` / `PieChartOption` / `GaugeChartOption` / `ProgressRingOption` …） |
| `width` | `number` | `560` | 图表宽度（px） |
| `height` | `number` | `320` | 图表高度（px） |

### 7.4 技术特性

**Canvas 初始化（DPR 适配）**

```typescript
const dpr = window.devicePixelRatio || 1;
canvas.width = width * dpr;
canvas.height = height * dpr;
const ctx = canvas.getContext('2d');
ctx.scale(dpr, dpr);
```

**动画系统**：入场动画数据点从 0 渲染到目标值（800ms cubicOut 缓动）；柱状图 / 漏斗图各元素
依次出现的交错动画；可通过 `animation.enabled: false` 关闭。

**Tooltip 系统**：鼠标悬浮自动检测最近数据点；显示系列名 + 数值 + 百分比（饼图）；
深色背景 + 圆角 + 阴影，对标 ECharts 样式。

**图例交互**：底部 / 顶部图例；hover 高亮对应系列。

### 7.5 主题色板与万能守则

默认使用 ECharts 5.x 色板：

```typescript
const DEFAULT_COLORS = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#44d9b5',
];
```

可通过 `series.color` 或 `series[].data[].color` 自定义颜色。

**万能守则（红线）**：

- 禁止使用 ECharts / Chart.js / D3 等第三方图表库
- 禁止裸色值（canvas 绘制前必须从 `draw-helpers.ts` 获取颜色）
- 禁止图表裸用（必须 `<base-card>` 容器包裹）
- 禁止无动画（默认开启入场动画，可关闭但不推荐）
- 禁止无 Tooltip（数据点必须可交互）

配置示例（Option 结构照抄）：

```typescript
const option: LineChartOption = {
  title: { text: '月度销售额趋势' },
  tooltip: { show: true, trigger: 'axis' },
  legend: { show: true },
  xAxis: { type: 'category', data: ['1月', '2月', '3月', '4月', '5月', '6月'] },
  yAxis: { type: 'value' },
  series: [
    { name: '2024年', data: [120, 200, 150, 180, 230, 210], smooth: true, area: true, areaOpacity: 0.15 },
    { name: '2023年', data: [80, 160, 120, 140, 190, 170], lineStyle: 'dashed', smooth: true },
  ],
};

const gauge: GaugeChartOption = {
  series: [{
    name: '完成率', data: [{ name: '完成率', value: 72.5 }],
    min: 0, max: 100, splitNumber: 10,
    axisLine: { lineStyle: { color: [[0.3, '#67e0e3'], [0.7, '#37a2da'], [1, '#fd666d']], width: 18 } },
    detail: { formatter: (v: number) => v.toFixed(1) + '%', fontSize: 28, fontWeight: 'bold' },
  }],
};

const ring: ProgressRingOption = {
  percent: 78, size: 120, strokeWidth: 10, roundCap: true,
  color: [[0, '#36d1dc'], [1, '#5b86e5']],
  content: { title: '完成率', value: '78%', valueStyle: { fontSize: 24, fontWeight: 'bold', color: '#333' } },
};
```

饼图 `series[0]` 结构：`{ name, type: 'donut' | 'pie', data: [{ name, value }] }`。

## 八、vue-upload-integration-skill — 上传全链路集成

### 8.1 定位与边界

**综合级别**：不是单个组件，而是**上传 + 表单 + 后端契约**的全链路集成。

| 维度 | 说明 |
|------|------|
| 本技能做什么 | 将上传组件嵌入表单/页面，对齐后端契约，给出完整业务代码 |
| 本技能不做什么 | 不重新定义上传组件（→ vue-upload-skill）、不重新定义表单（→ vue-form-skill） |

引用：`base-upload mode="file"`（通用文件上传）/ `mode="image"`（图片上传，预览/裁剪/压缩）/
`mode="list"`（文件列表展示）来自 vue-upload-skill；`base-form` / `base-form-item` 来自 vue-form-skill；
`base-card`（根容器）、`base-button`、`base-tag`；`upload()` 来自 frontend-request-skill。

### 8.2 场景矩阵（组件组合 + 后端路由）

| # | 场景 | 组件组合 | 后端路由 |
|---|------|----------|----------|
| 1 | 头像设置页 | base-card + base-upload(mode="image" avatar) + base-button | `POST /api/upload/image` |
| 2 | 商品发布页 | base-card + base-form + base-upload(mode="image" crop+compress) + base-button | `POST /api/upload/image` |
| 3 | 文件管理器 | base-card + base-upload(mode="file" drag+text) + base-upload(mode="list") + base-tag | `POST /api/upload/file` |
| 4 | 批量导入页 | base-card + base-upload(`autoUpload:false`) + base-button | `POST /api/upload/file` |

各场景的关键属性配置（照抄）：

- **场景 1 头像**：`v-model="avatar"` `action="/api/upload/image"` `mode="image"` `avatar`
  `:compress="true"` `:compress-max-width="256"` `:compress-max-height="256"`；
  事件 `@success(payload: { file, response })` / `@error(payload: { file, error })`；
  提示文案「支持 JPG、PNG，建议 256×256，自动压缩」；保存时提交 `{ avatar: avatar.value[0], nickname }` 到 `PUT /user/profile`。
- **场景 2 商品发布**：`mode="image"` `:max-count="9"` `crop` `:crop-ratio="1"` `compress`
  `:compress-quality="0.85"`，`tip="支持 JPG、PNG，建议正方形，自动压缩，最多 9 张"`，
  `@success` / `@compress(payload: { original, compressed, ratio })`；
  附件用 `mode="file"` `list-type="text"` `accept=".pdf,.doc,.docx,.xlsx"` `:max-count="3"` `:max-size="20"`；
  表单校验 `rules` 中 `images: [{ required: true, message: '请上传至少一张商品图片' }]`；
  提交 `post('/products', { ...form, price: Number(form.price) })`。
- **场景 3 文件管理器**：`mode="file"` `list-type="text"` `drag` `:max-count="20"` `:max-size="100"`；
  已上传区再嵌 `base-upload mode="list" :files="sortedFiles" list-type="text" :sortable="true"`
  `@sort-change` / `@remove`；卡片头右侧 `base-tag type="info"` 显示文件数；
  列表只展示 `f.status === 'success'` 的项。
- **场景 4 批量导入**：`ref="uploadRef"` `accept=".csv,.xlsx,.xls"` `:max-count="1"` `:max-size="10"`
  `:auto-upload="false"`；三步引导（下载模板 → 填写并上传 → 确认结果），步骤序号用 `base-tag variant="solid"`；
  导入按钮 `:disabled="!fileUrls.length"`；结果用 `base-tag :type="success ? 'success' : 'danger'"`；
  取消时 `uploadRef.value?.clearFiles()`。

### 8.3 上传 API 模块（src/api/upload.ts）

```typescript
import { request, type UploadOptions } from './request'

export interface UploadResult { url: string; name: string; size: number }

/** 通用文件上传 */
export async function uploadFile(file: File, extra?: Record<string, any>): Promise<UploadResult> {
  return upload<UploadResult>({ url: '/upload/file', file, name: 'file', formData: extra })
}

/** 图片上传 */
export async function uploadImage(file: File, extra?: Record<string, any>): Promise<UploadResult> {
  return upload<UploadResult>({ url: '/upload/image', file, name: 'file', formData: extra })
}

/** 核心上传函数（来自 frontend-request-skill） */
export async function upload<T = string>(options: UploadOptions): Promise<T> {
  const { url, file, name = 'file', formData, header, timeout, onProgress } = options
  const fd = new FormData()
  fd.append(name, file as File)
  if (formData) Object.entries(formData).forEach(([k, v]) => fd.append(k, v as string | Blob))
  const res = await request<T>({ url, method: 'POST', data: fd, header, timeout, skipDebounce: true })
  return res.data
}
```

### 8.4 后端契约对齐

| 后端框架 | 上传接口文档（源仓库路径） |
|----------|---------------------------|
| FastAPI (Python) | `vue-upload-skill/references/backend-contract.md#fastapi-python` |
| Spring Boot (Java) | `vue-upload-skill/references/backend-contract.md#spring-boot-java` |
| Go Gin | `vue-upload-skill/references/backend-contract.md#go-gin` |

**统一响应信封**：`{ code: 0, message: 'success', data: { url, name, size } }`。

### 8.5 即插即用验证清单

- [ ] `base-upload (mode="image")` 的 v-model 可直接作为表单字段
- [ ] `upload()` 调用与 frontend-request-skill 的 `UploadOptions` 一致
- [ ] 响应信封与后端 init-skill 内置契约一致
- [ ] 所有 Token 来自 vue-theme-skill，零硬编码
- [ ] 所有按钮引用 base-button，标签引用 base-tag
- [ ] 所有内容区域嵌入 base-card
- [ ] 错误码与 `ERROR_CODE_MAP` 对齐

### 8.6 Demo 中的样式映射（供对照，不作为规范）

`demo-components/html/00-showcase.html` 是可独立运行的综合演示（Vue 3 CDN），
其中 `base-upload` → `.upload-pic__*` / `.upload-file__*` / `.upload-drag__*` 等 BEM 类名；
`base-card` → `.card` / `.card-title` / `.card-desc`；`base-button` → `.btn` / `.btn-primary` / `.btn-sm`；
`base-tag` → `.tag` / `.tag--info` / `.tag--success`；真实项目应把 demo 中的
`simulateUpload()` 替换为 `upload()`。

## 九、vue-ai-creative-workspace-skill — AI 创作工作台

### 9.1 定位与边界

用于生成有明确产品感的 AI 内容创作页：**左侧工作区导航、中部创作画布、右侧参数栏、下方结果画廊**。
它是页面编排技能，不重复实现输入框、按钮、标签、下拉或弹窗。

- 适合：AI 海报、文案、图片、短视频脚本等「输入意图 → 配置参数 → 生成结果」的桌面端工作台。
- 不适合：聊天消息流（→ `vue-chat-skill`）、后台指标看板（→ `vue-dashboard-skill`）、登录页（→ `vue-login-skill`）。
- 不包含：模型调用、任务队列、文件上传、权限、结果持久化。接口接入交给 `frontend-request-skill` 和业务层。

### 9.2 必须先选 variant（4 种差异化风格）

未指定时使用 `editorial-light`。**四个 variant 是不同的布局重心，不能仅通过替换颜色冒充另一种 Demo。**

| variant | 对应 Demo | 适合场景 | 布局重点 |
|---------|-----------|---------|---------|
| `editorial-light` | `01-creative-workspace.html` | 品牌物料、内容运营、视觉方向探索 | 明亮三栏、主画布优先、四张结果卡 |
| `immersive-dark` | `02-immersive-dark.html` | 图像生成、电影感素材、专业创作工具 | 深色沉浸、紧凑工具条、三张候选画面 |
| `mobile-inspiration` | `03-mobile-inspiration-editor.html` | 移动端收集灵感、编辑灵感板、轻创作 | 单列、拼贴灵感板、底部编辑器 |
| `storyboard-timeline` | `04-storyboard-timeline.html` | AI 短片、广告脚本、视频分镜 | 分镜列表、镜头预览、参数检查器、时间线 |

选择规则：从目标设备判断——桌面内容工具选 `editorial-light`；专业视觉生成选 `immersive-dark`；
手机端或小程序式体验选 `mobile-inspiration`；涉及镜头、分镜、视频预览或时间线时选 `storyboard-timeline`。
目标设备也未知时默认 `editorial-light`，并在交付说明中标明。

### 9.3 必须复用的能力

| 区域 | 必须使用 | 来源 |
|------|---------|------|
| 全局 Token | `vue-theme-skill` | 颜色、间距、圆角、字号、阴影 |
| 页面布局 | `vue-layout-skill` | 应用壳、菜单与顶部区域 |
| 面板与结果卡 | `base-card` | `vue-base-skill` |
| 创作意图输入 | `base-input` | `vue-input-skill` |
| 主次操作 | `base-button` | `vue-button-skill` |
| 参数与状态 | `base-tag` | `vue-tag-skill` |
| 比例/风格选择 | `base-dropdown` | `vue-dropdown-skill` |
| 新建草稿/删除确认 | `base-dialog` / `base-confirm` | `vue-dialog-skill` |

禁止用裸 `div` 重新造输入框、按钮、标签、浮层或弹窗；禁止引入 Element Plus、Naive UI 等第三方组件库。

### 9.4 信息架构

```text
创作工作台
├─ 左栏：工作区 / 草稿 / 收藏入口（vue-layout-skill + vue-menu-skill）
├─ 顶栏：项目名、保存状态、账户菜单（vue-dropdown-skill）
├─ 主画布
│  ├─ 标题与任务说明
│  ├─ 意图输入（base-input）
│  ├─ 模式卡片（base-card）
│  └─ 生成操作（base-button）
├─ 右栏：比例、风格、数量等参数（base-dropdown + base-tag）
└─ 结果区：生成卡片（base-card）与状态标签（base-tag）
```

### 9.5 视觉契约

1. 用「三栏宽屏 + 局部卡片」建立秩序，不能把每个区域都塞进重阴影卡片。
2. 主画布必须是视觉焦点；右栏仅承担配置，信息密度低于主画布。
3. 结果区以 2～4 张卡片形成节奏，缩略图比例、标题、元信息对齐。
4. 主题与布局使用现有 Token；仅在视觉参考图所要求的双强调色上新增受控的业务级 CSS 变量，
   并在页面根节点集中声明。
5. `editorial-light` 与 `immersive-dark` 小于 `1024px` 时收起右侧参数栏；`mobile-inspiration`
   直接采用单列，主画布和结果区改为单列或双列；不得保留不可操作的横向挤压布局。

### 9.6 最小状态集

| 状态 | 要求 |
|------|------|
| 空白草稿 | 有可理解的提示与示例意图 |
| 可生成 | 主按钮可用，展示当前模式和参数摘要 |
| 生成中 | 主按钮 loading，结果区出现占位卡，禁止重复提交 |
| 成功 | 结果卡按时间排序，可收藏或重新生成 |
| 失败 | 仅展示可行动错误信息与重试按钮，不清空用户意图 |

### 9.7 接口边界与用法

页面只消费业务层提供的 `createTask`、`getTask`、`listAssets` 等函数。
轮询、SSE 或队列状态**不可写死在页面组件中**；按 `frontend-request-skill` 的请求封装接入。

```vue
<script setup lang="ts">
import ImmersiveDarkWorkspace from './templates/ImmersiveDarkWorkspace.vue'
function createTask(payload: { prompt: string; mode: string }) {
  // 由业务层通过 frontend-request-skill 调用接口
  console.info(payload)
}
</script>
<template>
  <ImmersiveDarkWorkspace @create-task="createTask" />
</template>
```

### 9.8 验收清单（交付前核对）

**组件复用**：输入意图使用 `base-input`，没有自定义输入框；生成/保存/重新生成等操作用 `base-button`；
画布/参数/结果容器用 `base-card`；参数选择用 `base-dropdown`，状态与风格用 `base-tag`；
新建草稿与破坏性操作通过 `base-dialog` 或 `base-confirm`。

**Demo 选择**：已在交付说明中写明采用的 variant；明亮与暗色桌面版保留「主画布、模式选择、
候选结果、参数区」四层信息结构；移动版保留「拼贴灵感板、已选素材状态、底部创作输入、单一主操作」；
没有只通过替换主题颜色来冒充另一个 Demo。

**状态与响应式**：空白/生成中/成功/失败状态均可理解且可恢复；生成中阻止重复提交但保留用户已输入的意图；
小屏隐藏或折叠右侧参数栏，不出现横向挤压；卡片没有用图片文字替代真实文案和控件。

**视觉**：主画布优先级高于参数栏和导航；分割线、留白与卡片圆角使用主题 Token；
结果卡统一比例、标题基线和元信息位置；双强调色只用于模式、主按钮与少量状态提示，不泛滥。

## 十、交付物

| 场景 | 交付物 |
|------|--------|
| CRUD | `BaseCrudPage.vue` + `types/crud.ts` + `composables/useCrud.ts` + `styles.css` + `index.ts`（可嵌入 base-card 的完整 CRUD 页） |
| Dashboard | `DashboardPage.vue` + 内置 10 个 `Base*` 展示组件，6 variant × 5 layout 组合 |
| Chat | `ChatPage.vue`（6 个 CSS 变体共用一套模板结构） |
| Login | `LoginForm.vue` + 5 个 wrapper（FlipLoginContainer / ParticleBackground / SplitLayout / SplitProLayout / PuzzleCaptcha）+ `components/index.ts` |
| Chart | 9 个 `Base*Chart.vue` + `types/chart.ts` + 4 个 composable（useCanvas / useTooltip / useAnimation / draw-helpers） |
| Upload | `src/api/upload.ts`（`uploadFile` / `uploadImage` / `upload`）+ 4 个场景页 + 后端契约对照 |
| AI 创作台 | 4 个 variant 模板（AiCreativeWorkspace / ImmersiveDarkWorkspace / MobileInspirationEditor / StoryboardTimelineWorkspace） |

## 十一、未收录引用

- 源 demo/组件按 `frontend-request-skill` 的封装对接接口；该技能在源仓库公开目录中存在，
  归入本 spec 的 `frontend/shared-request-layer.md`，此处不重复其规则文本。

## 十二、脚本 / 演示资产说明（不吸收）

源技能的 `demo-components/**/*.html`、`*.png` / `*.webp` 参考图、`particle-engine.js` 等演示与
可执行资产不在本 spec 吸收范围；需要时从源仓库
`vibeCoding/frontend/vue/vue-base-skill/vue-complex-skill/<技能名>/` 对应路径获取。
