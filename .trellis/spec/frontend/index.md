# 前端开发规范

> zaneLab 基座及子应用的前端开发约定。**任何 AI 子代理在编写或评审前端代码前，先读对应指南。**

## 依据

本目录约定的来源是项目技术方案 `docs/技术方案.md`。仓库为 pnpm workspaces + Turborepo monorepo：基座（`apps/portal-web`）与 iam 子应用（`apps/iam-web`）已按方案落地，共享代码抽至 `packages/*`；后续实现类任务应遵循既有结构，不要另起炉灶或把入口写在约定位置之外。

## 技术栈（固定选型，不引入替代品）

- React 19 + TypeScript，函数组件 + Hooks，不使用 class 组件（沿用 admin-layout 栈）
- React Router v7（history 模式，library 用法，`useRoutes` 动态路由）
- zustand 单库（auth/menu/布局/偏好/标签栏/时区，`src/stores/` 一文件一 store）
- Tailwind CSS 4 + daisyUI 5（样式与组件**类名**，不是 React 组件库）
- Axios（统一封装，见 [HTTP 与数据请求](./http-api-guidelines.md)）
- qiankun（微前端，见 [微前端与子应用](./microfrontend-guidelines.md)）
- zod（运行时配置校验，见 [类型安全](./type-safety.md)）
- Sentry（可选，错误监控）

## 指南索引

| 文件 | 说明 |
|------|------|
| [目录结构](./directory-structure.md) | src 各目录归属、页面/组件/工具放哪、命名 |
| [组件规范](./component-guidelines.md) | 组件写法、权限控制（隐藏/禁用）、路由守卫、懒加载 |
| [Hook 规范](./hook-guidelines.md) | 自定义 Hook、访问运行时配置、store 订阅、全局事件 |
| [状态管理](./state-management.md) | zustand store、token/菜单加载、qiankun 全局状态同步 |
| [类型安全](./type-safety.md) | zod schema 推导配置类型、共享类型、`window` 全局类型扩展 |
| [环境变量与运行时配置](./env-config-guidelines.md) | 部署期 `config.js` vs 开发期 `.env` 的分层判据、env 生效矩阵、开关迁移 |
| [HTTP 与数据请求](./http-api-guidelines.md) | Axios 封装、拦截器、401 单飞刷新、业务错误码、只读共享实例 |
| [国际化 i18n](./i18n-guidelines.md) | 双语语言包组织、useTranslation/i18n.t 消费、菜单 i18nKey、切语言链路 |
| [微前端与子应用](./microfrontend-guidelines.md) | 菜单驱动注册、props 契约、全局状态、子应用接入规范 |
| [质量规范](./quality-guidelines.md) | 测试策略、禁用模式、评审清单 |

## 核心不变式（改前必读）

- **apps 下的应用相互之间不能引用**：`apps/<a>` ⇄ `apps/<b>` 无 import、package.json 无互相依赖（跨 app 共享下沉 `packages/*`；应用间唯一通道是 qiankun props/http 契约，见 [微前端与子应用](./microfrontend-guidelines.md)）。
- **apps 下的应用是独立应用，独立运行性是硬性约定**：每个 app 必须可单独 `pnpm dev:<appName>` 跑通（props 缺省有义、props 消费收敛在 `src/http/compat.ts`、样式/mock 自持），业务层无 props 分支。
- 子应用注册信息**只**存在于 `config.js` 的 `microApps`；菜单只通过 `appName` 与之关联（§4.1）。
- 接口地址、登录/首页/403/404 路径等一律从运行时配置读取，不硬编码（§3）。**反向同样成立**：只在开发期有意义的开关（mock、调试开关）不得写进 `config.js`——它随构建进生产、由运维修改，**唯一**去处是 `.env.development` + `import.meta.env.DEV` 守卫（见 [环境变量与运行时配置](./env-config-guidelines.md)）。
- 数据流单向：登录 → 拉菜单 → 动态路由 + 注册子应用 → 渲染（§5.1）。
- 前端权限只是体验优化，真正的接口鉴权在后端，按钮级控制不能替代（§11）。
- 任何 JSX/HTML 只用 daisyUI + Tailwind 类名，写前先加载 `daisyui` 技能读对应组件指南（见 [组件规范](./component-guidelines.md)）。

> 节号（§n）均指 `docs/技术方案.md`。
