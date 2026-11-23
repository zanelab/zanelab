# 子任务①：skills-web i18n + radius 主题联动

> 父任务：.trellis/tasks/11-22-skills-i18n-theme-crud（源需求集 + 决策 D1–D3）
> 本子任务 = 父 PRD 的 R1 + R2，纯前端，不动后端。**不依赖子任务②**，先行实施。

## Goal

1. 参考 iam-web 给 skills-web 加国际化：语言来自宿主
   `props.preferences.locale`（mount 取值）+ `props.onHostStateChange`（运行期订阅），
   市场页全部静态中文文案入 zh-CN / en-US 语言包
2. 圆角受宿主 `props.preferences.radius` 控制（`--page-radius` CSS 变量模式），
   独立态用中性缺省

## Requirements

### R1 i18n 运行时（平移 iam-web 方案）

- `src/locales/i18n.ts`：i18next + react-i18next，单实例单 namespace（translation），
  `SUPPORTED = ['zh-CN', 'en-US']`，`resolveSkillsLocale()` 归一（@zanelab/utils
  的 normalizeLocale），packUrls 懒加载（`injectMessagePacks` / `loadMessagePack`，
  逻辑与 iam 同款）——直接以 `apps/iam-web/src/locales/i18n.ts` 为模板
- `SkillsProps` 扩展：`preferences?: SubAppPreferences`（形状对齐 iam props.ts，
  按消费面窄化为 radius/locale/mode 等）、`onHostStateChange?`、`i18n?`（packUrls）
- main.tsx 接线（iam main.tsx:31-38 同款）：mount 里 `setupI18n(props.preferences?.locale)`
  + `injectMessagePacks(props.i18n?.packUrls)` + onHostStateChange 订阅
  （比对 preferences.locale 变化 → setLocale）；unmount 取消订阅
- 独立态：无 props → 缺省 zh-CN，不崩

### R2 语言包与文案抽取

- `src/locales/zh-CN.json` / `en-US.json`：key 按业务段嵌套
  （`skills.market.*` / `skills.toolbar.*` / `skills.filter.*` / `skills.card.*` /
  `skills.footer.*` / `skills.upload.*` 等），两包 key 树一致（比对脚本验证）
- 覆盖范围（13 个文件含中文）：
  - marketplace.tsx（标题、计数、「个 Skills」等）
  - toolbar/category-menu.tsx（「分类」、aria-label）+ data.ts 的分组 title
  - toolbar/search-input.tsx（aria-label/placeholder）
  - toolbar/upload-button.tsx（「上传 Skills」）
  - filter-sidebar.tsx（组标题、展开收起）
  - sort-tabs.tsx（SORT_OPTIONS 4 个 label）
  - skill-card.tsx（徽章、下载/收藏文案）
  - footer/overview-section.tsx / faq-section.tsx / browse-section.tsx / footer.tsx
  - modal/upload-placeholder.tsx（弹窗标题、按钮、说明）
- data.ts 的选项数组（FILTER_GROUPS 24 label、SORT_OPTIONS 4、AGENT_LABEL）：
  按 i18n 规范「模块顶层只存 value/icon，label 渲染期 t() 解析」——
  value/icon 留 data.ts，label key 进语言包；AGENT_LABEL（全称映射）为数据
  非文案，保留原文（Claude Code 等品牌名不翻译）
- 消费方式遵循 i18n-guidelines：组件内 useTranslation()；纯函数消费点
  （filters.ts 无 UI 文案，无需动）

### R3 radius 主题联动（参考 iam 管理页 `--page-radius` 模式）

- marketplace 页根 div 内联 `--page-radius: <prefs.radius>rem`
- 大圆角容器改 `rounded-(--page-radius)`：技能卡片（rounded-2xl/3xl 处）、
  分类弹层面板（rounded-[20px]）、右侧 tabpanel、侧栏面板、footer 卡片等
  —— 逐处清点在 design 落
- **胶囊控件不跟随**（保持 rounded-full）：sort-tabs、工具栏控件、按钮
  （iam 管理页同款取舍——大容器表达主题圆角，小控件保持功能形态）
- prefs 派生：props 字段优先 + 中性缺省（radius: '0.5'），iam 管理页同款
- 运行期变更：onHostStateChange 推送 → 组件重渲染生效（与 locale 同一订阅点）

## Out of Scope

- 技能 CRUD / api 层 / mocks（子任务②）
- iam-web、portal-web 自身改动（宿主 props 契约已就绪）
- AGENT_LABEL 等品牌名/数据的翻译

## Acceptance Criteria

- [ ] AC1：集成态宿主切语言（偏好面板）后，skills 市场页全部可见文案跟随切换
      （含 data.ts 选项 label、弹窗、footer）
- [ ] AC2：独立态（:8084 直开）缺省 zh-CN 正常渲染，无 props 不崩
- [ ] AC3：语言包两包 key 树 diff 为空
- [ ] AC4：集成态宿主改 radius（偏好面板）后，市场页大圆角容器跟随变化；
      胶囊控件保持 rounded-full
- [ ] AC5：独立态 radius 用缺省 '0.5'
- [ ] AC6：skills-web tsc / vitest / build 全绿；现有测试不回归
      （marketplace.test.tsx 既有断言随文案改造同步更新）

## Notes

- locale 运行期订阅必须比对前后值（宿主快照是全量推送，locale 未变时不得
  触发 changeLanguage 重渲染）
- packUrls 懒加载在 setLocale/setupI18n 内触发（iam 同款），本子任务无需
  在页面组件里单独处理
- 既有测试里硬编码的中文断言（如「筛选」「分类」）改为按语言包 key 或
  setLocale 后的译文断言
