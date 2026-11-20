# skills-web

qiankun 子应用：Agent Skills 市场（首页）。技能卡片网格 + 分组筛选侧栏 + 排序，数据为静态 mock（`src/pages/marketplace/data.ts`），无后端依赖。

```
src/
  main.tsx                    # qiankun 入口（对齐 home-web；独立态自设 data-theme）
  App.tsx                     # 路由表：index → 市场页
  index.css                   # 独立运行态样式入口（token 块拷贝自 iam-web，双份同步）
  pages/marketplace/          # 市场页：data.ts（类型+种子）/ marketplace.tsx / 子组件
```

## 运行

- 独立态：`pnpm dev:skills`（:8084，直开浏览器即可）
- 集成态：portal `config.js` 的 `microApps.skills`（activeRule `/skills`），菜单下发 `component: 'skills'` 的 app 节点后由 qiankun 挂载。

## 约定

- 配色只用 daisyUI 语义色（base-*/primary/…），不引入固定色（跟随主题深浅）。
- 图标一律 `<AppIcon name/>`（@zanelab/ui）；新增图标进 `packages/ui` 的 `BUILTIN_ICONS`，不留内联 SVG（09-08-icon-consolidation）。
