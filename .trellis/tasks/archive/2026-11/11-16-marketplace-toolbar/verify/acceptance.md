# 验收记录：市场页工具栏（11-16-marketplace-toolbar）

日期：2026-11-19
方式：Chrome DevTools MCP（真实浏览器，独立态 `http://localhost:8084/`）
工具：viewport 用 CDP `emulate` 精确控制（非 `window.resizeTo`——浏览器窗口有最小宽度，实测被夹到 500）

## 环境

- `pnpm --filter @zanelab/skills-web dev` → 8084（vite 8.2.2）
- `pnpm --filter @zanelab/skills-web lint` → clean（oxlint 无输出）
- `pnpm --filter @zanelab/skills-web test` → **83 passed (3 files)**
- `pnpm --filter @zanelab/skills-web build` → exit 0（CSS 121.67 kB / gzip 19.59 kB，JS 350.57 kB / gzip 109.49 kB）

## AC14 横向溢出（五个宽度 × 开合两态）

判据：`documentElement.scrollWidth <= clientWidth` 且 `body` 同项。

| 宽度 | 关闭态 doc / client | 打开态 doc / client | 打开态 body / client | 弹层矩形 | 结论 |
|---|---|---|---|---|---|
| 320 | 320 / 320 | 320 / 320 | 320 / 320 | left=16 right=304 w=288 | ✅ |
| 375 | 375 / 375 | 375 / 375 | 375 / 375 | left=16 right=359 w=343 | ✅ |
| 768 | 753 / 753 | 753 / 753 | 753 / 753 | left=24 right=712 w=688 | ✅ |
| 1024 | 1009 / 1009 | 1009 / 1009 | 1009 / 1009 | left=272 right=960 w=688 | ✅ |
| 1440 | 1425 / 1425 | 1425 / 1425 | 1425 / 1425 | left=272 right=960 w=688 | ✅ |

（768/1024/1440 的 clientWidth 比 viewport 少 15px 是滚动条占位，非溢出。弹层宽上限
`w-[min(688px,100%)]` 在 ≥768 生效，窄屏退化为内容列宽度。）

## AC4 / AC5 布局与顺序（1440）

| 项 | 实测 |
|---|---|
| `h1` 矩形 | top=16 bottom=48 left=272 |
| 控件行 `分类` 按钮 | top=88（**与 h1 分属两行** ✅） |
| 左侧控件 DOM 序 | 筛选(1) → 搜索(2) → 分类(3) ✅ |
| 左侧搜索框 | left=309 |
| 左侧分类按钮 | left=504 |
| 右侧排序胶囊 | left=1004 |
| 右侧上传按钮 | left=1291 |
| 侧栏态 | `drawer lg:drawer-open`（1440 常驻）✅ |
| 小屏「筛选」按钮 | `lg:hidden`，1440 下 `display:none` ✅ |

## AC6 搜索

输入 → 卡片网格收窄（网格子元素计数，非徽章——徽章按设计恒显总数 `SKILLS.length`）：

| 关键词 | 卡片数 |
|---|---|
| （空） | 14 |
| `商店` | 3 |
| `电商` | 3 |
| `网页` | 10 |
| `Claude Code` | 14（全部 skill 的 agent 标签都含此串，符合预期） |
| `设计师` | 6 |
| `zzzznotexist` | **0** → 空态可见 |

空态文案：`没有符合筛选条件的 Skills，试试清除部分筛选或换个搜索关键词。` ✅
清空后恢复 14 ✅

## AC7 分类下拉

- 4 个分组：按使用场景 / 按角色 / 按输出类型 / 按 Agent ✅
- 切到「按 Agent」→ tabpanel `aria-labelledby` 变 `cat-tab-agent`，条目 = Claude Code / Codex / Antigravity / Cursor ✅
- **点条目** → 弹层与遮罩均卸载、卡片 14 → 12、侧栏「按 Agent」组的 Codex checkbox `checked=true` ✅
- **点遮罩** → 关闭 ✅
- **Esc** → 关闭 ✅
- 遮罩命中测试：
  - 弹层内 4 个采样点全部命中弹层自身元素（`insidePanel: true`）——**不穿透** ✅
  - 远离弹层处命中 `skills-category-overlay` ✅
  - 工具栏行命中搜索框本身（**不被遮罩遮挡**）✅
- z 序：控件行 `position:relative; z-index:50` > 遮罩 `z-index:40` ✅

## AC8 按 Agent

`SkillFilterGroup['id']` 含 `'agent'`；`filters.ts` 按组 id 独立分支，不与其它字段交叉命中
（`filters.test.ts` 构造同名值双置的证伪用例）。侧栏与分类下拉**都**渲染该组 ✅

## AC9 权限四态

| 态 | 期望 | 实测 |
|---|---|---|
| ① 独立态（`permissions` 非数组） | 显示 | 显示 ✅ |
| ② 宿主注入含 `skills:skill:create` | 显示 | `utils/permission.ts` 判定 + 单测覆盖 ✅ |
| ③ 宿主注入不含该码 | 隐藏 | 同上 ✅ |
| ④ 含通配 `*` | 显示 | 同上 ✅ |

独立态实测：上传按钮存在且可见 ✅

## AC10 上传对话框

- 点击 → `<dialog class="modal">` `open` 属性为 true ✅
- 文案：`上传 skills | 上传功能待接入：后端上传接口尚未提供，这里只是一个占位入口。 接入后可在此选择 skill 包、填写名称与简介，再提交审核。` ✅
- Esc 关闭 ✅ ／ 「知道了」按钮关闭 ✅
- `aria-labelledby="upload-placeholder-title"` ✅

## AC11 / AC12

- 新增/改动文件无 `dark:` 前缀、无 Tailwind 固定色、无十六进制色 ✅
- `apps/skills-web/src/index.css` **零改动**（git status clean），token 块与 portal 逐字节一致 ✅

## AC13 独立态

`http://localhost:8084/` 直开：无宿主 props 不崩、上传按钮显示 ✅

## AC15 无障碍

| 项 | 实测 |
|---|---|
| 触发器 | `aria-haspopup="menu"`、`aria-expanded`、`aria-controls` ✅ |
| tablist | `role="tablist" aria-label="分类"`，4 个 `role="tab"` ✅ |
| `aria-selected` | `["true","false","false","false"]` ✅ |
| tabpanel | `aria-labelledby="cat-tab-scene"` 与选中 tab 一致 ✅ |
| 选中 tab `aria-controls` | `skills-category-tabpanel` ✅ |
| 搜索框 | `aria-label="搜索 Skills"`、`type=search`、包在 `<label>` 内 ✅ |
| 对话框 | `aria-labelledby="upload-placeholder-title"` ✅ |

### 发现并修复的缺陷：关闭后焦点丢失

**症状**：Esc 关闭弹层后 `document.activeElement === document.body`——键盘用户失去位置锚点。

**原因**：弹层卸载（`phase` 转 `closed`）时未做焦点管理，焦点无处可去落到 `body`。

**修复**：`category-menu.tsx` 加 `triggerRef`，在 `phase === 'closed'` 的 effect 里把焦点归还触发器。
必须等面板真正卸载后再归还——在 `onOpenChange(false)` 里直接 `focus()` 时面板仍在 DOM
（`closing` 相位），焦点会被仍挂载的面板截走。

**复测**：三条关闭路径（Esc / 点遮罩 / 点条目）焦点**全部**回到「分类」触发器 ✅
**回归防护**：`marketplace.test.tsx` 新增 1 条用例，三条路径各断言 `expect(trigger).toHaveFocus()`。
（测试数 82 → 83）

## 集成态样式隔离风险（check 代理提出 → 实测证伪）

check 代理担心：宿主开 `experimentalStyleIsolation`，子应用 CSS 被重写为
`div[data-qiankun="..."]` 前缀，portal 到 body 的遮罩匹配不到工具类 → 集成态丢样式。

**实测证伪**（用宿主生产产物 CSS + qiankun 2.10.16 的 `rewrite()` 原样复现）：

- 工具类在 `@layer utilities` 内 → `CSSLayerBlockRule` 走 qiankun `default` 分支**原样输出**，
  `.fixed` / `.z-40` / `.bg-base-200/70` **不带前缀** ✅
- token 变量在 `:is(:root:has(...), [data-theme="light"])` 上，同样不加前缀 ✅
- 结论已沉淀到 `.trellis/spec/frontend/microfrontend-guidelines.md`

**但发现真实变体**：若 `.dark` 挂在**应用根 div**（而非 `<html>`）上，portal 到 body 的遮罩
拿不到深色 token → **浅色遮罩压深色页面**。宿主 `theme-provider.tsx` 把 `data-theme` + `.dark`
都加在 `<html>` 上（body 是其子元素）→ 继承正常 ✅。已把这条约束写进 spec。

## 深色主题

宿主真实机制（`<html>` 上同时设 `data-theme="dark"` + `class="dark"`）：

| 项 | 浅色 | 深色 |
|---|---|---|
| 遮罩底色 | `oklab(0.98 0 0 / 0.7)` | `oklab(0.2326 -0.00406983 -0.0133954 / 0.7)` ✅ |
| 遮罩 backdrop | `blur(3px)` | `blur(3px)` ✅ |
| 弹层底色 | `oklch(1 0 0)` | `oklch(0.2533 0.016 252.42)` ✅ |
| 弹层圆角 | `20px` | `20px` ✅ |

## 截图

`verify/` 目录：

| 文件 | 内容 |
|---|---|
| `1440-light.png` | 1440 浅色（弹层关闭） |
| `1440-light-dropdown.png` | 1440 浅色 + 弹层打开 |
| `1440-dark.png` | 1440 深色（弹层关闭） |
| `1440-dark-dropdown.png` | 1440 深色 + 弹层打开 |
| `320-light.png` | 320 窄屏 |
| `375-light.png` | 375 窄屏（弹层关闭） |
| `375-light-dropdown.png` | 375 窄屏 + 弹层打开（单列堆叠） |
