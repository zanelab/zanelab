<!-- 来源: jiushiwon/wg-skills @ 3b93743 (Apache-2.0)，有修改；详见 ../NOTICE.md -->
# 图标与图片素材规范

> 合并转写自 wg-skills 的 6 个技能：`frontend-icon-skill`（SVG/PNG 图标生成）、
> `icon-image-catch-skill`（远程素材抓取总入口）+ `icon-catch-skill` / `image-catch-skill`（子技能）、
> `image-forge-skill`（图片处理与图标生成脚本）、`html-frontend-template`（纯 HTML 管理后台模板）。
> 规则实质保留原文，触发词/frontmatter/与规则无关的叙述已剥离。

## 一、SVG 图标生成（frontend-icon-skill）

三种能力：① **SVG 图标生成**（浏览器可用，零依赖）：`generateIcon(name, options)` → SVG 字符串、`generateIconToFile`、`generateIconSet(names[], options, dir)` 批量、`listTemplates()` 模板清单；② **PNG 图标导出**（Node only，需 sharp）：`generatePngIcon` / `generatePngSet`——⚠️ `frontend-icon-skill/png` 子路径引入 node:child_process，**只允许 Node 侧 import**，浏览器组件必须从主入口取 SVG API；③ **图片处理**（配合 image-forge）。

**Vue 组件桥接（标准 BaseIcon）**：生成的图标经标准 BaseIcon 组件消费；模板库见 `references/template-list.md`。

**与 icon-image-catch-skill 的关系**：抓取失败/抓不到合适素材时的兜底生成手段。

**执行边界**：只生成/处理图标与图片资产，不写业务代码。

## 二、远程素材抓取总入口（icon-image-catch-skill）

### 2.1 路由判断

| 用户意图 | 进入子技能 |
|---|---|
| 要图标、icon、小图标、功能图标、tabBar 图标 | `icon-catch-skill` |
| 要图片、配图、背景图、banner、头图、照片 | `image-catch-skill` |
| 两者都要 | 先 icon 后图片，分别执行 |
| 扫描项目并自动抓取所需素材 | 先「项目素材需求审计」，再按结果自动进入对应子技能 |
| 审计项目需要哪些素材 | 见源 SKILL.md「项目素材需求审计」节 |

### 2.2 通用工作原则（7 条）

1. **语义先行**：先把需求翻译成精准英文搜索词。
2. **选库/选源询问**：抓图标先问图标库，抓图片先问图源；用户不选则默认自动降级。
3. **就近落地**：素材下载到项目约定目录（`static/icons`、`static/images`）。
4. **可追溯**：记录素材来源、作者、原始链接，必要时写同目录元数据文件。
5. **风格统一**：同一项目图标必须同一图标集同一风格；图片色调与项目主题色协调。
6. **降级意识**：icon 某库失败 → 降级下一库；抓不到 → 换关键词 → 仍不行建议用 frontend-icon-skill 生成。图片某源失败 → 降级下一源。
7. **压缩询问**：下载图片默认询问是否压缩；压缩可用 frontend-icon-skill 或图源远程缩放参数。

### 2.3 环境准备

icon 抓取基于 [Iconify](https://api.iconify.design)——零配置、免费、无需 Key。图片抓取：先询问用户是否有自己的图片 CDN/图片服务（自定义源优先）。

### 2.4 icon-catch（图标抓取）

数据源以 Iconify 为主；使用前询问规范 → 标准抓取流程 → 参数规范（尺寸/颜色/格式）→ 图标展示（可选）。详细流程见源 `icon-catch-skill/SKILL.md`。

### 2.5 image-catch（图片抓取）

数据源 + 使用前询问 + 标准抓取流程 + API 调用参考 + 参数规范（尺寸/尺寸映射见 `references/image-sizes.md`）。项目类型检测（决定素材需求）见父技能 `references/project-type-detection.md`。

## 三、图片处理与图标生成脚本（image-forge-skill）

位于源仓库 `vibeCoding/frontend/image-forge-skill/`（注意：不在 icon-image-catch-skill 目录下）。两种模式：① **icons 模式**——图标生成；② **jobs 模式**——图片处理（压缩/裁剪/格式转换）。含执行边界与异常处理约定；源仓库有配套 scripts/（路径即此处，只留用途不收录）。

## 四、纯 HTML 管理后台模板（html-frontend-template）

**使用场景**：自媒体运营平台需要管理后台、不想引入 Vue/React 等框架、需要快速搭建原型或 MVP。纯 HTML + 原生 JS，含页面模块划分、主题切换、API 配置入口（`config` 处对接后端）；双击打开或任意静态服务器即可跑。作为「零框架」快速起点的模板资产使用，复杂项目仍走各框架生成技能。

## 五、源文件对照

| 章节 | 源技能 |
|------|--------|
| 一 | vibeCoding/frontend/frontend-icon-skill（references/：usage、template-list、operation-schema） |
| 二 | vibeCoding/frontend/icon-image-catch-skill（references/：project-type-detection、image-sizes） |
| 二.4 | icon-image-catch-skill/icon-catch-skill |
| 二.5 | icon-image-catch-skill/image-catch-skill（references/image-sources.md） |
| 三 | vibeCoding/frontend/image-forge-skill |
| 四 | vibeCoding/frontend/html/html-frontend-template |
