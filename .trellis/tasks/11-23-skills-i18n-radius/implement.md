# Implement — 子任务① skills-web i18n + radius 主题联动

> 前置：子任务① prd/design 已评审；`task.py start` 后执行。
> 实施顺序：i18n 运行时 → 接线 → 文案抽取 → radius → 测试。

## 步骤

| # | 步骤 | 落点 |
|---|---|---|
| 1 | i18n 运行时平移 | `src/locales/i18n.ts`（iam 版模板，差异见 design §2） |
| 2 | 语言包骨架 | `src/locales/zh-CN.json` / `en-US.json`（design §4 的段结构，先空段后逐文件填） |
| 3 | props 类型扩展 | `src/props.ts`：preferences / onHostStateChange / i18n（形状对齐 iam props.ts 按消费面窄化） |
| 4 | main.tsx 接线 | mount：setupI18n + injectMessagePacks + 订阅；unmount 取消；独立态 setupI18n() |
| 5 | 文案抽取（逐文件） | 见下方清单，**每个文件改完即跑对应测试** |
| 6 | data.ts 选项改造 | title/label → t() 派生 key；OUTPUT_TYPE_KEY 映射；AGENT_LABEL 保留 |
| 7 | radius 联动 | marketplace.tsx 派生 + design §5 落点清单 |
| 8 | i18n 单测 | `src/locales/i18n.test.ts`（iam 平移 + resolve 用例） |
| 9 | 全量验证 | 见「验证命令」 |

## 文案抽取清单（步骤 5 逐文件）

| 文件 | 文案点 | 语言包 key |
|---|---|---|
| marketplace.tsx | 标题/计数/筛选按钮/展开收起 aria | skills.market.* |
| toolbar/category-menu.tsx | 「分类」+ tablist aria-label | skills.toolbar.category |
| toolbar/search-input.tsx | aria-label + placeholder | skills.toolbar.search* |
| toolbar/upload-button.tsx | 「上传 Skills」 | skills.toolbar.upload |
| sort-tabs.tsx | 4 个排序 label（经 data.ts 改造） | skills.sort.* |
| filter-sidebar.tsx | 组 title（经 data.ts 改造）+ aria | skills.group.* |
| skill-card.tsx | 免费/下载/收藏等 | skills.card.* |
| footer/overview-section.tsx | 标题/正文/统计 | skills.footer.overview.* |
| footer/faq-section.tsx | FAQ 问答对 | skills.footer.faq.* |
| footer/browse-section.tsx | 浏览区文案 | skills.footer.browse.* |
| footer/footer.tsx | 页脚链接/版权 | skills.footer.links.* |
| modal/upload-placeholder.tsx | 弹窗标题/说明/按钮 | skills.upload.* |

## 验证命令

```bash
cd apps/skills-web && npx tsc --noEmit -p tsconfig.json
cd apps/skills-web && npx vitest run
cd apps/skills-web && pnpm build && pnpm lint

# 语言包两包 key 树一致（spec 比对脚本，cwd = apps/skills-web）
python3 -c "
import json
def kt(o,p=''):
    return set().union(*(kt(v,f'{p}.{k}') if isinstance(v,dict) else {f'{p}.{k}'} for k,v in o.items()))
zh=kt(json.load(open('src/locales/zh-CN.json'))); en=kt(json.load(open('src/locales/en-US.json')))
print('zh:',len(zh),'en:',len(en),'diff:',zh^en)"
```

## 风险文件与回滚

| 文件 | 风险 | 回滚 |
|---|---|---|
| src/main.tsx | 订阅未清理 → 复挂载重复订阅 | unmount 取消订阅（iam 同款）；代码评审点 |
| src/pages/marketplace/data.ts | label 改 key 派生漏改消费点 → 界面出 key 字符串 | t() 缺条目回退 key 本身 → 视觉立即暴露，编译期不拦；全量渲染过一遍三种语言 |
| marketplace.test.tsx | 既有中文断言 | 同 PR 内更新 |

## 实施前检查清单

- [ ] prd / design 已评审
- [ ] `task.py start` 已执行
- [ ] iam-web locales/i18n.ts 模板已通读（含注释里的坑）
- [ ] 确认宿主 props.preferences 契约未变（register.ts subAppPreferences）
