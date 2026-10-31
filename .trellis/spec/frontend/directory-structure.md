# 目录结构

> zaneLab 约定布局。本仓库是 **pnpm workspaces + Turborepo monorepo**：基座在 `apps/portal-web`，qiankun 子应用在 `apps/iam-web`（见 [微前端与子应用](./microfrontend-guidelines.md)）；可复用代码抽为 `packages/*` 共享包（源码直出，不经构建）；构建配置沉淀在 `tooling/*`。包间依赖一律用 `workspace:*` 协议，依赖由根 lockfile 统一管理。

## 布局

新代码必须放入对应目录，路径不做微调、不并进别的目录：

```
zanelab/                          # 仓库根 = workspace 根（编排脚本 + 公共 devDeps）
├── apps/
│   ├── portal-web/               # 基座 @zanelab/portal-web（原 tq-portal，业务逻辑不变）
│   │   ├── public/config.js      # 运行时配置：window.__APP_CONFIG__（microApps 注册也在此）
│   │   ├── scripts/env-switch.mjs
│   │   ├── vite.config.ts        # dev 代理 + rolldown 拆包 + vitest 配置三合一
│   │   └── src/
│   │       ├── main.tsx          # 入口：主题同步、MSW(dev)、会话恢复、qiankun 初始化、renderApp
│   │       ├── App.tsx           # 根组件：认证页(守卫外) + RouteGuard + LayoutShell(useRoutes)
│   │       ├── types/            # re-export shim：export * from '@zanelab/types'
│   │       ├── config/           # 运行时配置：index.ts（loadConfig/appConfig）、updateChecker.ts
│   │       ├── contexts/         # React Context（ConfigContext.tsx：ConfigProvider + useConfig）
│   │       ├── api/              # 后端接口封装（menu.ts 等，内部用共享 http 实例）
│   │       ├── router/           # generateRoutes.tsx：菜单 → 路由表；route-meta.ts（tabbar/面包屑）
│   │       ├── stores/           # zustand 全部状态：auth/menu/图标/layout/preferences/tabbar/timezone（design §2 边界）
│   │       ├── components/       # 壳组件 + layouts/（BasicLayout 壳）+ RouteGuard、Permission…
│   │       ├── pages/            # 本地页面，路径约定见下
│   │       ├── micro/            # qiankun：register.ts 的 setupMicroApps / setupHostState / watchGlobalLogout
│   │       ├── mocks/            # MSW：handlers.ts、browser.ts、server.ts（dev/测试替身 /api/*）
│   │       ├── locales/          # i18n：i18n.ts（init + menuTitle）+ zh-CN.json / en-US.json 语言包
│   │       └── utils/            # 壳耦合模块（http/auth/session/crypto/theme-transition/menu-views/session-headers）
│   └── iam-web/                  # qiankun 子应用 @zanelab/iam-web（vite-plugin-qiankun，:8081）
├── packages/                     # 共享包（internal packages：exports 直指 src/*.ts 源码，无构建产物）
│   ├── types/                    # @zanelab/types —— 跨模块共享类型（config/menu/layout、MenuItem、sm-crypto.d.ts）
│   ├── utils/                    # @zanelab/utils —— 纯逻辑 9 模块（cache/color/diff/password/locale/notify/nprogress/sync-navigate/find-menu-by-path）
│   └── ui/                       # @zanelab/ui —— 零耦合叶子组件（scrollbar、anchored-portal、logo、ToastRegion、form/block、form/toggle-item）
├── tooling/
│   ├── tsconfig/                 # @zanelab/tsconfig —— base.json / react-app.json / node.json，各包 extends
│   │                             # （oxlint 配置在仓库根 .oxlintrc.json，oxlint 自动向上发现，各包 lint 直接可用）
│   ├── node-utils/               # @zanelab/node-utils —— Node 侧工具（fs/git/date/hash/monorepo/prettier/spinner）
│   ├── prettier-config/          # @zanelab/prettier-config —— 共享 Prettier 配置（index.mjs）
│   ├── commitlint-config/        # @zanelab/commitlint-config —— commit 规范配置（index.mjs，根 commitlint.config.ts 接入）
│   │                             # （commitlint 配置必须用 .ts 而非 .mjs：.mjs 走 Node 原生 ESM，解析不了
│   │                             #   @zanelab/node-utils 的 TS 源码直出链——src/index.ts 内 export 无扩展名；
│   │                             #   .ts 让 commitlint 走 jiti 加载器，整条 TS import 链可解析。2026-10-14 实测）
│   └── stylelint-config/         # @zanelab/stylelint-config —— 共享 Stylelint 配置（index.mjs，根 stylelint.config.mjs 接入）
├── docs/                         # 设计文档；技术方案.md 是约定的源头
├── .changeset/                   # changesets 配置（仅内部版本追踪，包 private 不发布）
├── pnpm-workspace.yaml           # apps/* + packages/* + tooling/*
├── turbo.json                    # build/test/lint/dev 任务编排
├── lefthook.yml                  # git hooks：commit-msg 走 commitlint，pre-commit 走 prettier --check
├── .prettierrc.mjs               # re-export @zanelab/prettier-config；.prettierignore 排除生成物/lockfile
├── commitlint.config.ts          # re-export @zanelab/commitlint-config（必须 .ts，走 jiti，见上）
├── stylelint.config.mjs          # extends @zanelab/stylelint-config + 本仓 override（Tailwind v4 at-rules 等）
└── package.json                  # workspace 根：dev/dev:iam/build/test/lint/lint:css/format 编排脚本
```

## 各目录归属

| 内容 | 放哪 | 依据 |
|------|------|------|
| 跨模块共享类型（config/menu/layout、MenuItem） | `packages/types`（`@zanelab/types`） | 零依赖纯类型，全仓共享 |
| 纯逻辑 util（cache/color/diff/password/locale/notify/nprogress/sync-navigate/find-menu-by-path） | `packages/utils`（`@zanelab/utils`） | 无壳耦合的纯模块才进包 |
| 零耦合叶子组件（scrollbar、anchored-portal、logo、ToastRegion、block、toggle-item） | `packages/ui`（`@zanelab/ui`） | 不依赖 stores/config 的叶子原语 |
| 壳耦合模块（http/auth/session/crypto/theme-transition/menu-views/session-headers） | `apps/portal-web/src/utils/` | 依赖 config/stores/locales/api，是壳运行时核心 |
| 组件（有 JSX，壳耦合） | `apps/portal-web/src/components/` | §7.2–7.4 |
| 页面级本地页面 | `apps/portal-web/src/pages/<component 路径>` | §7.1 |
| auth/menu 状态 | `apps/portal-web/src/stores/auth-store.ts`、`menu-store.ts` | §6.2 |
| 接口请求函数 | `apps/portal-web/src/api/` | §6.2（fetchMenus） |
| Axios 实例与拦截器 | `apps/portal-web/src/utils/http.ts` | §5.2、§8.1 |
| 登录/登出纯逻辑 | `apps/portal-web/src/utils/auth.ts` | §5.3 |
| qiankun 注册 | `apps/portal-web/src/micro/register.ts` | §4.4 |
| 动态路由生成 | `apps/portal-web/src/router/generateRoutes.tsx` | §7.1 |
| 运行时配置类型 | `@zanelab/types`（config.ts） | §3.1 |
| 壳内状态（zustand） | `apps/portal-web/src/stores/*-store.ts` | design §2（业务不进壳 store） |
| MSW mock | `apps/portal-web/src/mocks/`（handlers/browser/server） | dev/测试替身 /api/* |
| 子应用代码 | `apps/<appName>/`（workspace 成员，独立 dev 端口） | §4.1 |
| 页面懒加载入口 | 动态 `import('../pages/...')`，不配 Webpack 路由表 | §7.1 |

## import 与包边界约定

- **跨包引用一律用包名**：`import { MenuItem } from '@zanelab/types'`、`import { notify } from '@zanelab/utils'`、`import { ToastRegion } from '@zanelab/ui'`——不通过相对路径穿包，也不从 `apps/portal-web` 反向 import 包源码路径。
- **壳内（apps/portal-web）仍用 `@/xxx` 别名**（alias 指向 `apps/portal-web/src`）：`@/stores/...`、`@/components/...`、`@/utils/http` 等壳内模块间引用不变。
- `apps/portal-web/src/types/index.ts` 是 re-export shim（`export * from '@zanelab/types'`），存量 `@/types` 引用经 shim 兼容；新代码直接写 `@zanelab/types`。
- 包只从 `@zanelab/*` 与自身 deps 导入；**禁止包内 import `apps/*` 的任何模块**（耦合壳的代码不进包，进包的代码必须保持零壳耦合）。
- **禁止 apps 下的应用相互引用**（`@zanelab/portal-web` ⇄ `@zanelab/iam-web`、任意 `apps/<a>` ⇄ `apps/<b>`）：package.json deps 不出现其他 app 的包名，import 不出现其他 app 的源码路径。每个 app 是**独立部署单元**（独立 dev 端口、独立构建、可交付其他团队），相互引用会让两个应用焊死——宿主改一行迫使用离子应用重测，qiankun 的 props/http 契约（见 [微前端与子应用](./microfrontend-guidelines.md)）才是应用间唯一通道。跨 app 需要共享时下沉 `packages/*`（先过「零壳耦合」判断）。
- 新增可复用模块：先判断是否纯逻辑/零耦合（无 stores/config/locales/api 依赖）——是则进对应 `packages/*` 包并记 changeset；否则留 `apps/portal-web`。

## 页面加载约定

- 本地页面的 `component` 字段对应 `src/pages/` 下的相对路径（§7.1）。
- 用 `lazy(() => import(\`../pages/${componentPath}\`))` 按需加载，外面包 `<Suspense>`，fallback 用 daisyUI 加载态：`<span className="loading loading-spinner loading-lg" />`（§7.1）。
- 子应用页面不在这里——渲染的是一个容器 `div`（`#subapp-<appName>` 或配置的 container），见 [微前端与子应用](./microfrontend-guidelines.md)。

## 命名

- 组件 / 页面文件：`PascalCase.tsx`（`RouteGuard.tsx`、`SidebarMenu.tsx`、`Permission.tsx`）。
- 上下文文件：`XxxContext.tsx`（§3.2 的 `ConfigContext.tsx`）。
- store 文件：`kebab` 语义名 + `-store.ts`（`auth-store.ts`、`menu-store.ts`、`tabbar-store.ts`）。
- 其余模块：语义小写目录下的 `index.ts` / 具名文件（`config/index.ts`、`utils/http.ts`）。
- workspace 包统一 `@zanelab/<name>`（apps/portal-web、apps/iam-web 为 private 应用，packages/*、tooling/* 为共享包）。
- 纯配置导出统一 `appConfig`，types 统一从 `@zanelab/types` 导入。

## 命令约定

根目录是唯一入口，命令经 turbo / `pnpm --filter` 编排到各包：

- `pnpm dev` → 基座 `apps/portal-web`（:5173）；`pnpm dev:iam` → 子应用 `apps/iam-web`（:8081）。
- `pnpm build` / `pnpm test` / `pnpm lint` → `turbo run <task>`，覆盖所有声明了该 script 的包（lint 现覆盖 portal-web + utils + ui + types + node-utils 五包）。
- 单跑某包：`pnpm --filter @zanelab/portal-web test`（或 `build`/`lint`/`dev`），`--filter` 参数是包名 `@zanelab/<name>`。
- 格式与 CSS：`pnpm format` / `format:check`（prettier 全仓，配置 .prettierrc.mjs）、`pnpm lint:css`（stylelint 检查 apps/ + packages/ 的 CSS，适配 override 在根 stylelint.config.mjs）。
- git hooks：lefthook（lefthook.yml，`pnpm install` 经 prepare 激活）——commit-msg 拦 commitlint、pre-commit 拦 staged 文件 prettier --check（管道式，见下方 Warning）。
- 版本记录：`pnpm changeset`（记录变更）→ `pnpm version-packages`（消费变更集、bump 版本）；仅内部追踪，不发布。

> **Warning（Windows 命令行长度限制，2026-10-14 接入 lint 流程踩坑）**：lefthook 的 `{staged_files}` 是**内联展开**为空格分隔文件列表——staged 文件一多（本仓全量格式化提交 ~390 文件），`sh -c "prettier --check <列表>"` 命令行即超 Windows 上限报"命令行太长"（GBK 乱码形态，易误判为 prettier 失败）。且 `pnpm exec` 在 Windows 下还会再起一层 cmd，实测总长 ~6950 即炸（低于 sh 名义上限 8191）。**解法**：hook 命令不用 `{staged_files}`，改管道 `git diff --cached --name-only --diff-filter=ACMR | grep -E '<扩展名>$' | xargs -r -s 6000 pnpm exec prettier --check`——xargs 按 `-s` 自动分批，命令行长度恒定。任何"对大量文件跑 CLI"的 hook/script 都用这个模式，不要内联展开文件列表。另：`.prettierignore` 必须排除 vendored/生成文件（`mockServiceWorker.js`、`iconfont.js`），否则重新生成时全文件 diff 噪音。

## 样式与主题（Tailwind CSS 4 + daisyUI 5）

- 样式入口是基座的全局 CSS 文件（`apps/portal-web/src/index.css`）：`@import "tailwindcss";` + `@plugin "daisyui";`（主题在插件里按需配置）。Tailwind v4 **不用** `tailwind.config.js`。
- `apps/portal-web/public/config.js` 的 `layout.theme` 决定默认主题，映射为 `<html data-theme="…">` 上的 daisyUI 主题名（默认 `dark`/`light`，见 [组件规范](./component-guidelines.md) 主题一节）。
- 组件不写独立 `.less/.css` 模块；改样式先用 daisyUI 类 + Tailwind 工具类，确需覆盖 daisyUI 内置样式时按 daisyui usage 指南用 `@utility` 或 `!` 后缀。
- `@zanelab/ui` 包不引 tailwind——类名直写，daisyui/tailwind 由消费方应用注入（`@zanelab/ui` 的 `scrollbar.css` 是唯一的例外，纯 CSS 滚动条样式经子路径 `@zanelab/ui/scrollbar.css` 导入）。

> **Warning（包源码必须显式 @source，2026-10-12 迁移回归）**：daisyUI 5 / Tailwind v4 按需生成依赖**源码类名扫描**，默认扫描范围是入口 CSS 所在应用（`apps/portal-web/src`）。组件迁入 `packages/ui` 后类名不再被扫到，`.toast-*`、`.alert-*` 等会**静默从构建产物消失**（无报错、构建全绿）。消费方必须在全局 CSS 显式声明：`apps/portal-web/src/index.css` 里的 `@source "../../../packages/ui/src";`。新增共享包（或往包里加组件）时同步补 `@source`，验证方式是 build 后在产物 CSS 里 grep 类名。

## 反面模式

- 把子应用入口/激活规则硬编码在组件里——应放在 `config.js` 的 `microApps`（§4.1）。
- 把页面组件塞进 `src/components/` 却不在 `src/pages/` 下，破坏约定式导入。
- 在 `apps/portal-web/src/utils/` 混入 JSX/组件文件。
- 包（packages/*）import `apps/*` 的模块，或包内出现 stores/config/locales/api 依赖——耦合壳的代码必须留 `apps/portal-web`。
- **apps 下的应用相互 import 或在 package.json 里依赖另一个 app 的包名**（见 import 与包边界约定——应用间只经 qiankun props 契约通信）。
- 用相对路径跨包引文件（`../../packages/...`）而非 `@zanelab/<name>` 包名导入。
- 在包里加独立构建管道——共享包是源码直出（internal packages），不加 build 产物。
