<!-- 来源: jiushiwon/wg-skills @ 3b93743 (Apache-2.0)，有修改；详见 ../NOTICE.md -->
# Vue 主题 / 样式 / 终端风格（Design Token 层）

> 本文档合并转写自 wg-skills 的 3 个技能：`vue-theme-skill`、`vue-style-skill`、
> `vue-tui-skill`。规则实质保留原文，触发词 / frontmatter / 安装步骤 / 营销叙述已剥离。
> 源 references：`vue-theme-skill/references/{color-scale,size-scale,hardcode-replace-rules}.md`。

## 一、vue-theme-skill — 设计 Token 层

### 1.1 边界声明（绝不可越界）

| 能力 | 状态 |
|------|------|
| 设计 Token 体系（颜色 / 尺寸 / 圆角 / 阴影） | ✅ 负责 |
| 多主题色阶（HSL 算法 50-950） | ✅ 负责 |
| CSS 变量导出 | ✅ 负责 |
| 主题切换（运行时 / 构建时） | ✅ 负责 |
| **组件库** | ❌ 不做（由 vue-base-skill 负责） |
| **Dark Mode** | ❌ 不做 |
| **Z-Index / Motion / Transition** | ❌ 不做 |
| **JS Bridge / 主题持久化** | ❌ 不做（由业务层处理） |
| **TypeScript 类型生成** | ❌ 不做 |
| **Figma 对接 / A11y 校验** | ❌ 不做 |

不做的范围再列一次（源文「Not for」）：组件库 → vue-base-skill；工程化骨架 →
vue-generate-skill；uniapp 项目 → uniapp-theme-skill。

### 1.2 命名体系（严格对齐 uniapp-theme-skill）

| 维度 | 命名规范 |
|------|---------|
| 颜色 | `--color-primary-{50~950}` + `--color-primary` |
| 间距 | `--space-2` / `--space-3` / `--space-4` ... |
| 字体 | `--font-{2xs,xs,sm,base,lg,xl,2xl,3xl}` |
| 圆角 | `--radius-{sm,md,lg,xl,full}` |
| 高度 | `--height-{button,input,card}-{sm,md,lg}` |
| 图标 | `--icon-{xs,sm,md,lg,xl}` |

完整命名对齐表：

| 类别 | 命名 | 示例 |
|------|------|------|
| 颜色 | `--color-{name}-{50~950}` | `--color-primary-500` |
| 颜色简写 | `--color-{name}` | `--color-primary` |
| 间距 | `--space-{n}` | `--space-4` |
| 字体 | `--font-{size}` | `--font-base` |
| 圆角 | `--radius-{size}` | `--radius-md` |
| 高度 | `--height-{comp}-{size}` | `--height-button-md` |
| 图标 | `--icon-{size}` | `--icon-md` |

**禁止的命名**（源文「红线」）：

- ❌ `--spacing-xs`（旧命名，应改为 `--space-2`）
- ❌ `--gap-4`（不统一）
- ❌ `--text-color`（缺类别）
- ❌ `--button-height`（应改为 `--height-button-md`）
- ❌ `--font-size-small`（应改为 `--font-sm`）
- ❌ `#4a90e2`（裸色值）

正确示范：`--space-4` / `--font-base` / `--height-button-md` / `--color-primary` / `--radius-md`。

### 1.3 能力 1：9 级色阶（HSL 算法）

**为什么用 HSL 而不是 RGB 混合**：RGB 混合会产生色相偏移（`mix('#4a90e2','#fff',20%)` 实际偏紫）；
HSL 算法色相绝对稳定，只调饱和度与亮度，且与 Tailwind / Material 等业界方案对齐。

| 阶 | HSL 调整 | 用途 |
|----|---------|------|
| **50** | hue, sat, 96% | 极浅背景、禁用态 |
| **100** | hue, sat, 92% | 浅色背景、hover 浅 |
| **200** | hue, sat, 86% | 标签底色 |
| **300** | hue, sat, 76% | light（hover） |
| **400** | hue, sat, 66% | 中浅（强调 hover） |
| **500** | hue, sat, 56% | **主色**（= `--color-primary`） |
| **600** | hue, sat, 48% | dark（按下） |
| **700** | hue, sat, 40% | 深色文本 |
| **800** | hue, sat, 32% | 标题文字 |
| **950** | hue, sat, 16% | 极深文本 |

默认蓝色主题的完整色阶（精确值照抄）：

```css
--color-primary-50:   hsl(211, 100%, 96%);
--color-primary-100:  hsl(211, 100%, 92%);
--color-primary-200:  hsl(211, 100%, 86%);
--color-primary-300:  hsl(211, 100%, 76%);
--color-primary-400:  hsl(211, 100%, 66%);  /* 浅色 hover */
--color-primary-500:  hsl(211, 100%, 56%);  /* 主色（= --color-primary） */
--color-primary-600:  hsl(211, 100%, 48%);  /* 主色按下 */
--color-primary-700:  hsl(211, 100%, 40%);
--color-primary-800:  hsl(211, 100%, 32%);
--color-primary-950:  hsl(211, 100%, 16%);  /* 深色文本 */
```

简写映射：`--color-primary-light` = `--color-primary-300`；`--color-primary-dark` = `--color-primary-600`。

#### 8 套预设主题

| 主题 | hue | sat | light | 主色 HSL | 命名 |
|------|-----|-----|-------|---------|------|
| blue（默认） | 211 | 100% | 56% | `hsl(211, 100%, 56%)` | `blue` |
| green | 152 | 69% | 45% | `hsl(152, 69%, 45%)` | `green` |
| purple | 262 | 83% | 58% | `hsl(262, 83%, 58%)` | `purple` |
| red | 0 | 84% | 60% | `hsl(0, 84%, 60%)` | `red` |
| orange | 33 | 100% | 56% | `hsl(33, 100%, 56%)` | `orange` |
| cyan | 180 | 77% | 47% | `hsl(180, 77%, 47%)` | `cyan` |
| pink | 330 | 81% | 60% | `hsl(330, 81%, 60%)` | `pink` |
| slate | 220 | 9% | 46% | `hsl(220, 9%, 46%)` | `slate` |

色阶生成算法（源文 `references/theme-generator.js` 逻辑，五档亮度固定、仅 500 档随主题变化）：

```javascript
function hslScale(hue, sat, baseLight = 56) {
  return {
    50:  `hsl(${hue}, ${sat}%, 96%)`,
    100: `hsl(${hue}, ${sat}%, 92%)`,
    200: `hsl(${hue}, ${sat}%, 86%)`,
    300: `hsl(${hue}, ${sat}%, 76%)`,
    400: `hsl(${hue}, ${sat}%, 66%)`,
    500: `hsl(${hue}, ${sat}%, ${baseLight}%)`,
    600: `hsl(${hue}, ${sat}%, 48%)`,
    700: `hsl(${hue}, ${sat}%, 40%)`,
    800: `hsl(${hue}, ${sat}%, 32%)`,
    950: `hsl(${hue}, ${sat}%, 16%)`,
  }
}
```

### 1.4 能力 2：尺寸阶梯

命名严格对齐 `uniapp-theme-skill`，以 `4px` 为基准。

#### 间距 `--space-{n}`

| Token | 值 | 用途 |
|-------|-----|------|
| `--space-1` | 4px | 极小间距（图标与文字） |
| `--space-2` | 8px | 标签内边距 |
| `--space-3` | 12px | 紧凑间距 |
| `--space-4` | 16px | **基准间距**（卡片内边距） |
| `--space-5` | 20px | 中等间距 |
| `--space-6` | 24px | 区块间距 |
| `--space-8` | 32px | 大区块 |
| `--space-10` | 40px | 页面分区 |
| `--space-12` | 48px | 章节间距 |
| `--space-16` | 64px | 大章节 |

#### 字体 `--font-{size}`

| Token | 值 | 字重 | 用途 |
|-------|-----|------|------|
| `--font-2xs` | 11px | 400 | 角标、徽章 |
| `--font-xs` | 12px | 400 | 辅助说明、时间 |
| `--font-sm` | 13px | 400 | 紧凑正文 |
| `--font-base` | 14px | 400 | **基准正文** |
| `--font-lg` | 16px | 500 | 卡片标题 |
| `--font-xl` | 18px | 600 | 区块标题 |
| `--font-2xl` | 22px | 600 | 页面标题 |
| `--font-3xl` | 28px | 700 | 大标题 |
| `--font-4xl` | 36px | 700 | Hero 标题 |

#### 字重 / 行高

```css
--weight-normal:   400;
--weight-medium:   500;
--weight-semibold: 600;
--weight-bold:     700;
```

SKILL.md 的 `--leading-*`：`--leading-none:1` / `--leading-tight:1.25` /
`--leading-snug:1.375` / `--leading-normal:1.5` / `--leading-relaxed:1.625`。
references/size-scale.md 按用途给的三档：`--leading-tight:1.2`（标题）/
`--leading-normal:1.5`（正文）/ `--leading-loose:1.8`（长文本）。**两处取值有出入，
落地时以项目选定的一组为准，不要混用。**

#### 圆角 `--radius-{size}`

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-sm` | 8px | 小标签、小按钮 |
| `--radius-md` | 12px | 输入框、缩略图 |
| `--radius-lg` | 16px | 卡片 |
| `--radius-xl` | 20px | 大卡片、Banner |
| `--radius-2xl` | 24px | 浮层、弹窗（见 references） |
| `--radius-full` | 999px | 头像、胶囊 |

#### 组件高度 `--height-{comp}-{size}`

```css
--height-button-sm: 32px;  --height-button-md: 40px;  --height-button-lg: 48px;
--height-input-sm:  32px;  --height-input-md:  40px;  --height-input-lg:  48px;
--height-card-sm:   80px;  --height-card-md:   120px; --height-card-lg:   200px;
```

表格行高：SKILL.md 给 `--height-table-row-sm:36px / -md:44px / -lg:56px`；
references/size-scale.md 给 `40px / 52px / 64px`。**两处取值有出入**，同上处理。

#### 图标 `--icon-{size}`

| Token | 值 | 用途 |
|-------|-----|------|
| `--icon-xs` | 12px | 内联小图标 |
| `--icon-sm` | 16px | 列表图标 |
| `--icon-md` | 20px | **基准图标** |
| `--icon-lg` | 24px | 按钮图标 |
| `--icon-xl` | 32px | 大图标 |

#### 阴影

SKILL.md 使用 Tailwind 系阴影：

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
```

references/size-scale.md 使用简化四档：

| Token | 值 | 用途 |
|-------|-----|------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)` | 卡片底部 |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.08)` | 卡片悬浮 |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` | 浮层 |
| `--shadow-xl` | `0 16px 48px rgba(0,0,0,0.16)` | 弹窗 |

### 1.5 能力 3：CSS 变量导出（tokens.css）

源文模板路径：`templates/src/styles/tokens.css`（另分层 `templates/src/styles/tokens/{primitive,semantic}.css`、
`templates/src/styles/config/theme-config.ts`、生成器 `templates/scripts/generate-tokens.js`，
`templates/` 目录二进制与脚本不在本 spec 吸收范围）。

```css
/* ============================================
 * Vue Theme Skill — 完整设计 Token
 * 由 templates/scripts/generate-tokens.js 自动生成
 * 不要手改，由 generator 维护
 * ============================================ */

:root {
  /* === 主题色 === */
  --color-primary:        hsl(211, 100%, 56%);
  --color-primary-light:  hsl(211, 100%, 76%);
  --color-primary-dark:   hsl(211, 100%, 48%);

  /* === 语义色 === */
  --color-success: hsl(152, 69%, 45%);
  --color-warning: hsl(33, 100%, 56%);
  --color-danger:  hsl(0, 84%, 60%);
  --color-info:    hsl(211, 100%, 56%);

  /* === 中性色 === */
  --color-bg:             hsl(0, 0%, 98%);
  --color-surface:        hsl(0, 0%, 100%);
  --color-border:         hsl(220, 14%, 96%);
  --color-text:           hsl(220, 13%, 18%);
  --color-text-secondary: hsl(220, 9%, 46%);
  --color-text-tertiary:  hsl(220, 9%, 65%);
  --color-text-inverse:   hsl(0, 0%, 100%);

  /* === 间距 / 字体 / 圆角（见 §1.4 完整表） === */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px; --space-12: 48px;
  --font-2xs: 11px; --font-xs: 12px; --font-sm: 13px; --font-base: 14px;
  --font-lg: 16px; --font-xl: 18px; --font-2xl: 22px; --font-3xl: 28px;
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px; --radius-xl: 20px; --radius-full: 999px;

  /* === 组件高度 / 图标 === */
  --height-button-md: 40px;
  --height-input-md:  40px;
  --icon-md: 20px;
}

/* === 多主题：通过 [data-theme] 切换 === */
[data-theme="green"] {
  --color-primary:       hsl(152, 69%, 45%);
  --color-primary-light: hsl(152, 69%, 65%);
  --color-primary-dark:  hsl(152, 69%, 38%);
}

[data-theme="purple"] {
  --color-primary:       hsl(262, 83%, 58%);
  --color-primary-light: hsl(262, 83%, 75%);
  --color-primary-dark:  hsl(262, 83%, 48%);
}

/* ... 其余主题 ... */
```

**导入顺序（强制）**：tokens.css 必须排在其他样式之前。

```typescript
// src/main.ts
import '@/styles/tokens.css'  // 必须在其他样式之前
import '@/styles/global.css'
```

**运行时切换主题**：

```typescript
document.documentElement.setAttribute('data-theme', 'green')  // 切换为绿色
document.documentElement.removeAttribute('data-theme')        // 恢复默认蓝色
// 持久化由业务层处理（localStorage.setItem('theme', 'green')），本层不管
```

组件用法示例（全 Token 化）：

```vue
<template><button class="primary-btn">提交</button></template>
<style scoped>
.primary-btn {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  padding: var(--space-3) var(--space-6);
  height: var(--height-button-md);
  border-radius: var(--radius-md);
  font-size: var(--font-base);
}
.primary-btn:hover  { background: var(--color-primary-light); }
.primary-btn:active { background: var(--color-primary-dark); }
</style>
```

### 1.6 红线（绝不可违反）

1. ❌ 业务代码不允许出现裸色值（必须用 `var(--color-*)`）
2. ❌ 业务代码不允许出现裸 px（必须用 `var(--space-*)` / `--font-*` 等）
3. ❌ 禁止使用 `calc()` 生成主题值（跨端兼容问题）
4. ❌ 禁止修改 tokens.css 的命名（必须由 generator 生成）
5. ❌ 禁止在组件内定义全局变量
6. ❌ 禁止混用 uniapp / vue 主题（命名必须对齐）

（源文编号从 1 跳到 4，第 3 条在源文档中缺号，此处按原文列出 6 条实质约束。）

### 1.7 硬编码替换规则（按 CSS 属性上下文分类 A/B/C/D/E）

规则前提：业务代码必须**全部使用 Token**，禁止裸色值 / 裸 px。按属性上下文分类以确保替换完整无遗漏。

**A 类：颜色上下文**

| CSS 属性 | 替换为 | 示例 |
|---------|--------|------|
| `color` | `var(--color-text*)` | `color: var(--color-text)` |
| `background` / `background-color` | `var(--color-*)` | `background: var(--color-primary)` |
| `border` / `border-color` | `var(--color-border*)` | `border: 1px solid var(--color-border)` |
| `box-shadow` 颜色部分 | `var(--shadow-*)` | `box-shadow: var(--shadow-md)` |
| `outline` 颜色部分 | `var(--color-*)` | `outline: 1px solid var(--color-primary)` |
| `fill` / `stroke`（SVG） | `var(--color-*)` | `fill: var(--color-primary)` |
| `text-decoration` 颜色部分 | `var(--color-text-link)` | `text-decoration-color: var(--color-text-link)` |
| `caret-color` | `var(--color-primary)` | `caret-color: var(--color-primary)` |
| `accent-color` | `var(--color-primary)` | `accent-color: var(--color-primary)` |
| `column-rule` 颜色部分 | `var(--color-border)` | `column-rule: 1px solid var(--color-border)` |

**B 类：尺寸上下文（间距 / 边框）**

| CSS 属性 | 替换为 | 示例 |
|---------|--------|------|
| `padding` / `padding-*` | `var(--space-*)` | `padding: var(--space-4)` |
| `margin` / `margin-*` | `var(--space-*)` | `margin: var(--space-4) 0` |
| `gap` / `row-gap` / `column-gap` | `var(--space-*)` | `gap: var(--space-3)` |
| `top` / `right` / `bottom` / `left` | `var(--space-*)` 或具体值 | `top: var(--space-4)` |
| `border` / `border-width` | `1px`（固定值）或 `var(--space-px)` | `border: 1px solid var(--color-border)` |
| `border-radius` | `var(--radius-*)` | `border-radius: var(--radius-md)` |
| `width` / `height`（组件自身） | `var(--height-*-*)` | `height: var(--height-button-md)` |
| `width` / `height`（容器布局） | 具体数值或 `%` | `width: 100%` |
| `min-width` / `max-width` | 具体数值 | `max-width: 1200px` |

**C 类：字体上下文**

| CSS 属性 | 替换为 | 示例 |
|---------|--------|------|
| `font-size` | `var(--font-*)` | `font-size: var(--font-base)` |
| `font-weight` | `var(--weight-*)` | `font-weight: var(--weight-medium)` |
| `line-height` | `var(--leading-*)` 或数字 | `line-height: var(--leading-normal)` |
| `font-family` | `-apple-system, ...`（字体栈） | `font-family: -apple-system, sans-serif` |
| `letter-spacing` | 具体值（em） | `letter-spacing: 0.02em` |
| `text-indent` | `var(--space-*)` | `text-indent: var(--space-4)` |

**D 类：图标 / SVG 上下文**

| CSS 属性 | 替换为 | 示例 |
|---------|--------|------|
| `width` / `height`（图标） | `var(--icon-*)` | `width: var(--icon-md)` |
| SVG 元素尺寸 | `var(--icon-*)` | `<svg width="var(--icon-md)">` |

**E 类：变换 / 动画上下文**

| CSS 属性 | 替换为 | 示例 |
|---------|--------|------|
| `transform: translate(x, y)` | `translate(var(--space-*), var(--space-*))` | `transform: translate(var(--space-2), var(--space-2))` |
| `translate` | `var(--space-*)` | `translate: var(--space-2)` |
| `transition-duration` | 具体值（ms） | `transition: all 200ms ease` |
| `transition-delay` | 具体值（ms） | `transition-delay: 100ms` |

> ⚠️ 本层不做 Motion / Transition，只规定命名规则；具体动画时长由业务层决定。

**完整替换反例 / 正例**

```css
/* ❌ 反例（硬编码） */
.button {
  background: #4a90e2; color: #ffffff;
  padding: 12px 24px; margin-bottom: 16px;
  border-radius: 8px; font-size: 14px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  height: 40px;
}
.button:hover { background: #6bb3ff; }

/* ✅ 正例（全部 Token 化） */
.button {
  background: var(--color-primary); color: var(--color-text-inverse);
  padding: var(--space-3) var(--space-6); margin-bottom: var(--space-4);
  border-radius: var(--radius-md); font-size: var(--font-base);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  height: var(--height-button-md);
}
.button:hover { background: var(--color-primary-light); }
```

**特殊场景**

- 阴影透明度：优先 `box-shadow: var(--shadow-md)`；需自定义时用
  `color-mix(in srgb, var(--color-primary) 20%, transparent)`，而非写死 `rgba()`。
- 渐变：颜色部分用 Token —
  `background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)`。
- 透明色：`background: color-mix(in srgb, var(--color-primary) 50%, transparent)`（用 color-mix 而非 rgba）。
- `z-index` 不在本层范围，由业务层定义（建议业务层定义 `--z-*` 全局变量）。

**批量校验配置**

```jsonc
// .eslintrc.json
{ "rules": {
  "color-no-hex": [2, { "message": "禁止裸色值，请使用 var(--color-*)" }],
  "declaration-property-value-disallowed-list": { "/.*/": ["/^#[0-9a-fA-F]{3,8}$/", "/^rgba?\\(/"] }
}}

// .stylelintrc.json
{ "rules": {
  "color-no-hex": true,
  "function-disallowed-list": ["rgb", "rgba"],
  "declaration-property-value-disallowed-list": {
    "/^padding/": ["/[0-9]+px/"], "/^margin/": ["/[0-9]+px/"]
  }
}}
```

**硬编码检查清单**

- [ ] 无 `#xxx` / `#xxxxxx` / `#xxxxxxxx`
- [ ] 无 `rgb(...)` / `rgba(...)`
- [ ] 无裸 `px`（除 `border: 1px`、`width: 100%`）
- [ ] 无 `calc()` 生成主题值
- [ ] 所有 `color` / `background` / `border-color` 用 `var(--color-*)`
- [ ] 所有 `padding` / `margin` / `gap` 用 `var(--space-*)`
- [ ] 所有 `font-size` 用 `var(--font-*)`
- [ ] 所有 `border-radius` 用 `var(--radius-*)`
- [ ] 所有组件高度用 `var(--height-*-*)`
- [ ] 所有图标尺寸用 `var(--icon-*)`

### 1.8 协同链路

```
vue-generate-skill（骨架：vite / tsconfig / pinia / 请求层）
  └─→ vue-theme-skill（设计 Token，本层）
       └─→ vue-base-skill（业务组件，强依赖本层）
```

## 二、vue-style-skill — 样式工具层（源文为待实现态）

源文 status：SKILL.md 仅给「定位 / 待实现」清单，**待实现项均未落地**（原文 checkbox 全未勾选）。
如实转写其规格意图，不假装已实现。

- 目标：提供 Vue 项目的样式基础设施（CSS 工具类、动画、布局类、响应式），基于
  vue-theme-skill 的 Design Token 封装。
- 约束：遵循 `vue-generate-skill` 规范，**纯 CSS 实现，禁止原生组件**。
- 待实现清单：CSS 变量系统 / 主题配置 / 动画库 / 工具类 / 重置样式。
- 硬性协同要求：**必须与 vue-theme-skill 配合使用，所有样式必须使用 `var(--*)` 变量。**
- 职责边界：主题 Token / 色阶 / 换肤归 vue-theme-skill，本层只做工具类与动画的封装。

工具类形态（源文示例，类名照抄）：

```html
<div class="mt-4 p-2">...</div>                                <!-- 间距 -->
<div class="flex items-center justify-between">...</div>       <!-- 弹性布局 -->
<div class="fade-in">...</div>                                 <!-- 动画 -->
```

动画族：`fade` / `slide` / `scale`；工具类族：margin、padding、flex、grid；另含响应式工具与主题切换入口。

> ⚠️ 源 README 的 `:root` 示例给出 `--color-primary: #1890ff` / `--radius-md: 8px`，
> 与 vue-theme-skill 的 `hsl(211,100%,56%)` / `12px` **冲突**；以 vue-theme-skill 为准（源 README 为概览未同步）。

## 三、vue-tui-skill — 终端风格 UI 层（源文为开发计划态）

> ⚠️ 源文明确标注：**当前为开发计划态**，8 个核心组件均未实现，仅 README 草案；
> 「勿用于生产」。本层如实转写其能力定义与设计 Token 草案。

定位：终端美学 UI 组件库，**零第三方依赖、纯 Vue3 + CSS3**，等宽字体、扫描线效果、零 HTML5 标签。

**关系**：`vue-base-skill`（基础组件体系，必须先有）→ `vue-theme-skill`（Token）→ 本层（终端美学专用组件层）。

**能力清单（8 个组件，状态均为「📝 计划」）**

| 组件 | 用途 |
|------|------|
| `tui-card` | 终端卡片容器 |
| `tui-table` | ASCII 表格 |
| `tui-chart` | ASCII 柱状 / 折线图 |
| `tui-log` | 日志流输出 |
| `tui-terminal` | 终端模拟器 |
| `tui-progress` | 进度条 |
| `tui-spinner` | 加载动画 |
| `tui-notification` | 通知消息 |

**适用场景**：管理后台的终端风格仪表盘；开发者工具界面（DevTool Web 版）；命令行工具的 Web 化；
黑客 / 赛博朋克 / 复古未来主义风格页面；服务器监控面板（运维台）。

**设计 Token（草案，精确值照抄）**

```css
:root {
  /* 终端配色 */
  --tui-bg: #0d1117;
  --tui-bg-card: #161b22;
  --tui-text: #c9d1d9;
  --tui-text-dim: #8b949e;
  --tui-accent-green: #3fb950;
  --tui-accent-amber: #d29922;
  --tui-accent-red: #f85149;
  --tui-accent-blue: #58a6ff;
  --tui-border: #30363d;

  /* 等宽字体栈 */
  --tui-font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

  /* 间距 */
  --tui-space-1: 4px;  --tui-space-2: 8px;  --tui-space-3: 12px;
  --tui-space-4: 16px; --tui-space-6: 24px;
}
```

> 注：TUI Token 使用 `--tui-` 前缀且含裸十六进制值，是**独立配色域**，与 vue-theme-skill 的
> 「禁止裸色值」红线不冲突（该红线约束业务代码引用 Token，不约束 Token 定义文件本身）。

**使用示例（草案）**

```vue
<template>
  <tui-card title="System Monitor">
    <tui-table :data="processes" :columns="columns" />
    <tui-progress :value="cpuUsage" label="CPU" />
    <tui-progress :value="memUsage" label="Memory" />
  </tui-card>
</template>
```

**明确不做**：❌ 实际组件实现（待 v0.1 起逐个交付）；❌ 真实 Demo；❌ SSR 适配（仅 Vue3 客户端）。

**依赖**：`vue-base-skill`（基础）、`vue-theme-skill`（Token）。

## 四、交付物

- `src/styles/tokens.css`（由 generator 产出，禁止手改命名）— 或 `tokens/{primitive,semantic}.css` 分层版
- `src/styles/global.css`（import 顺序排在 tokens.css 之后）
- 主题切换入口（业务层）：`data-theme` 属性读写 + 业务侧持久化
- 校验配置：`.eslintrc.json` / `.stylelintrc.json` 的裸色值 / 裸 px 拦截规则

## 五、未收录引用

源 `vue-theme-skill` 声明命名体系「完全对齐 `uniapp-theme-skill`」。`uniapp-theme-skill` 在源仓库公开目录中存在，
归入本 spec 的 `frontend/uniapp.md`，此处不重复其规则文本。

## 六、脚本 / 模板类内容说明（不吸收）

源技能附带的 `templates/`（tokens.css、theme-config.ts）与 `templates/scripts/generate-tokens.js`
等生成器脚本不在本 spec 吸收范围；需要时从源仓库 `vibeCoding/frontend/vue/vue-theme-skill/templates/` 获取。
