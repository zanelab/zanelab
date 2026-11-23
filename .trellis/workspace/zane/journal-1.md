# Journal - zane (Part 1)

> AI development session journal
> Started: 2026-09-07

---



## Session 1: 迁移上游 internal 三包到 tooling 并归档历史任务
<!-- trellis-session: v=2 fp=fe27f24a8a89082a -->

**Date**: 2026-10-14
**Task**: 迁移上游 internal 三包到 tooling 并归档历史任务
**Branch**: `main`

### Summary

将上游 5.5.9 internal 下三个无冲突包迁入 tooling/：@zanelab/node-utils（10 源文件+16 测试，源码直出）、@zanelab/prettier-config、@zanelab/commitlint-config（scope 白名单动态适配 @zanelab/*）。catalog: 版本落地为真实范围；根 commitlint.config.ts 接入（.ts+jiti 才能解析 TS 直出链，.mjs 不行，已记入 spec）。回归：223=207 基线+16 新增，3 既有 MSW 失败不变，build 2/2、lint 5/5。归档三个已完成任务（monorepo 迁移、注释清除、上游迁移）。

### Git Commits

| Hash | Message |
|------|---------|
| `5dd6dea` | feat(tooling): 迁移上游 internal 三个无冲突包为 @zanelab/* 源码直出包 |

### Status

[OK] **Completed**


## Session 2: 将 commitlint/prettier/stylelint 三配置接入日常开发流程
<!-- trellis-session: v=2 fp=450f98b179cacc6b -->

**Date**: 2026-10-15
**Task**: 将 commitlint/prettier/stylelint 三配置接入日常开发流程
**Branch**: `main`

### Summary

三配置从可用变应用：根 .prettierrc.mjs/.prettierignore、lefthook（commit-msg 拦 commitlint、pre-commit 拦 staged 文件 prettier --check）、package.json format/format:check/lint:css 脚本与 devDeps 升根、stylelint 本仓 override（selector-class-pattern null、Tailwind v4 at-rules 白名单）3 个 CSS 0 errors。全仓一次性 prettier 格式化基线（378 文件纯格式 diff，字节级验证）。踩坑：lefthook {staged_files} 内联展开在 Windows 超 sh 8191 上限，且 pnpm exec 再起 cmd 实测 ~6950 即炸，解法为 git diff + xargs -s 6000 管道（已记 spec）；commitlint scope 白名单不含 task，归档提交用 chore(project)。回归：build 2/2、lint 5/5、测试 223 守恒（3 既有 MSW 失败不变）。归档 apply-lint-configs 与 stylelint 迁移两任务。

### Git Commits

| Hash | Message |
|------|---------|
| `6eaff73` | feat(lint): 接入 prettier/commitlint/stylelint 到日常开发流程 |
| `e43085f` | style: 全仓 prettier 一次性格式化基线 |

### Status

[OK] **Completed**


## Session 3: 将 apps/web 改名 portal、apps/plt 改名 iam
<!-- trellis-session: v=2 fp=43424faf23b58a6c -->

**Date**: 2026-10-15
**Task**: 将 apps/web 改名 portal、apps/plt 改名 iam
**Branch**: `main`

### Summary

git mv apps/web→apps/portal（@zanelab/portal）、apps/plt→apps/iam（@zanelab/iam），242 R100 + 13 个内容同步修改（根脚本 dev/dev:iam、index.css @source、.vscode localesPaths、mock/测试 appName 'plt'→'iam'、文档全量）。用户决策：外部注册名 npa-plt-system、pa_new 保留不改，spec 新增 Warning 防未来误改。坑1：git reset 重新分组时漏加旧目录删除，rename 配对拆成两个 commit 补齐（区间 diff 255 R 验证通过）；坑2：commitlint scope 白名单无 repo 用 project、body 需 ≤100 字符；坑3：AGENTS.md 被 turbo 管理块 LF 重注入导致混合行尾，prettier endOfLine auto 拦截，归一 CRLF 解决（turbo 再注入可能复发）。回归：build 2/2、lint 5/5、测试 223 守恒（3 既有 MSW 失败）、format:check、lint:css 全绿，双 dev server 冒烟通过。

### Git Commits

| Hash | Message |
|------|---------|
| `f524840` | refactor(project): apps/web 改名 portal、apps/plt 改名 iam，同步全部引用 |
| `f6d110a` | chore(project): 补齐 apps/web、apps/plt 旧目录删除，配对 rename 历史 |

### Status

[OK] **Completed**


## Session 4: axios 重构为 vben request-client，并清理三股积压未提交流
<!-- trellis-session: v=2 fp=40b48c1fe9236316 -->

**Date**: 2026-10-31
**Task**: axios 重构为 vben request-client，并清理三股积压未提交流
**Branch**: `main`

### Summary

完成 10-29-vben-request-client 全阶段：packages/utils 落地 vben request-client 原语（RequestClient/InterceptorManager/三预置拦截器/uploader/downloader/SSE/helpers，含 qs paramsSerializer 与 axios-mock-adapter 测试），portal 切组装模式并强类型化 api 层、window.__http 改挂 RequestClient 只读 Proxy（双挡 interceptors+instance），iam-web 重写双态兼容层。实现与检查各派一个子代理：检查轮修复 6 处（补模块导出、resolveNetworkMessage null 语义、恢复断网提示、onSessionExpired 码表映射、SSE/uploader/downloader/helpers 测试、spec 改写）。随后发现工作树积压了 5 天三股未提交流（偏好/主题联调、vben 重构、iam OTP 端到端），按依赖顺序拆 4 个提交入库，并归档两个任务。

### Main Changes

- packages/utils/src/http/：RequestClient 类（Promise<T> 强类型）+ InterceptorManager + defaultResponse/authenticate/errorMessage 三预置拦截器（适配：tokenHeaderName 参数化、错误文案注入、非 envelope body 守卫放行）+ uploader/downloader/SSE；旧 createHttpClient 删除，BizCodeError/isSessionExpiredError 入 legacy.ts
- portal-web：http.ts 组装链（解包→业务 rejected→认证单飞→错误提示），导出 requestClient/baseRequestClient，api/auth.ts、api/menu.ts 删除 as unknown as 强转
- iam-web：utils/http.ts 双态兼容层（集成态透传 HostHttpClient、独立态 RequestClient 最小链）；PltProps.http 结构化；MSW handler 补独立态无前缀路径（此前独立运行发码 404）
- 提交分组：ab26584 偏好/主题/语言联调、77eee68 vben 重构、303c502 微前端 spec 同步、9af5aa5 iam OTP 端到端

### Git Commits

| Hash | Message |
|------|---------|
| `ab26584` | feat(@zanelab/portal-web): 偏好/主题/语言联调——qiankun props 契约与用户主题记忆 |
| `77eee68` | refactor(@zanelab/utils): axios 封装重构为 vben request-client 架构 |
| `303c502` | docs(project): 微前端 props 契约与独立运行性不变式随基座实现同步 |
| `9af5aa5` | feat(@zanelab/iam-web): email+OTP 两步登录端到端（supabase 简化 + 双态兼容层） |

### Testing

- [OK] pnpm -w test 全绿：utils 14→72、portal 184→189、node-utils 16；pnpm -w build 3/3、pnpm -w lint 5/5、prettier check 通过
- [OK] 用临时 git worktree 跑 HEAD 基线确认（184/14），用于判定哪些改动属积压未提交而非本次回归
- [OK] iam-web/portal dev server 模块 transform 与 build 冒烟通过；交互式 OTP 登录冒烟需浏览器，留给人工

### Status

[OK] **Completed**

### Next Steps

- 云 Supabase 部署与浏览器交互冒烟（C3/C4）：按 docs/iam-supabase-otp-integration.md，需项目 ref
- iam 独立态验码失败 401 会触发 window.location.replace('/login') 丢掉弹窗内 verifyError 展示，建议 Edge Fn 改 200+业务码
- iam main.tsx 三条 [iam] 生命周期 console.log 为联调痕迹，可按需清理


## Session 5: portal-web useMock 迁到 dev-only env + iam-web api 层规划
<!-- trellis-session: v=2 fp=bfa69eb815908e57 -->

**Date**: 2026-10-31
**Task**: portal-web useMock 迁到 dev-only env + iam-web api 层规划
**Branch**: `feat/use-mock-dev-env`

### Summary

use-mock-dev-env：api.useMock 从 public/config.js 与 AppConfigSchema 迁到 VITE_USE_MOCK（对齐 iam-web 既有形态），保留 import.meta.env.DEV 守卫；新增单测锁住「线上遗留 config.js 带旧键仍可加载、未知键被 strip 不回退」的部署兼容契约；清理四处已失效的 .env 注释。新增 spec frontend/env-config-guidelines.md 沉淀「部署期 config.js vs 开发期 .env」的分层判据与两条实测 gotcha（DEV 由 NODE_ENV 推导与 --mode 无关；.env 被 .env.[mode] 覆盖）。规划期发现的相邻缺陷留作后续：portal-web 的 MSW handler 登记 /api/user/menus 而 config.js 配 /menu/tree 且无代理。iam-web-api-layer：完成规划（PRD/design/implement + 上下文清单），完整收敛到 src/api 层，并查明 OTP mock 路径缺 iam 段、两种模式下都拦不住，方案为 mock 从 api 层常量派生。

### Git Commits

| Hash | Message |
|------|---------|
| `f17cffe` | refactor(@zanelab/portal-web): useMock 从运行时配置迁到 dev-only Vite 环境变量 |
| `90cf84a` | docs(project): 环境变量与运行时配置分层契约入库 |
| `ab90995` | chore(task): 登记 use-mock-dev-env 任务工件 |

### Status

[OK] **Completed**


## Session 6: iam-web 接口层收敛 + OTP 401 契约修正
<!-- trellis-session: v=2 fp=cf1d8610edf91057 -->

**Date**: 2026-11-01
**Task**: iam-web 接口层收敛 + OTP 401 契约修正
**Branch**: `feat/iam-web-api-layer`

### Summary

iam-web-api-layer：/functions/v1 调用从 LoginPage 内联收敛到新建 src/api 层（endpoints.ts 零依赖常量 + auth.ts 命名空间对象），页面净减约 130 行、只消费领域对象；mock 路径改从常量派生，修掉既有缺陷——handler 登记路径缺 iam 函数名段、两种模式下 MSW 都拦不住 404；失败语义统一 throw Error(msg) 四级提取，后端文案可透出。实施期发现验证码错误返回 HTTP 401 会被前端会话失效链路截走（独立态整页跳 /login、集成态 handleLogout），错误提示从未展示——经批准改为 400（Edge Fn 与 mock 同改，401 只留会话失效；集成态宿主侧核实无登出/无重复 toast）。质检补缺失的 iam.otp.verifyFailed 语言包键；修 LoginPage 头部与 README/spec 的陈旧注释（api/v1、http/compat、幻变量 VITE_IAM_API_TARGET）；spec 沉淀「/functions/v1 必须走 src/api 层」约定。品牌资产 logo/favicon 一并入库。遗留：Edge Fn 须重新部署生效（supabase functions deploy iam）；AC4/AC5/AC8 的浏览器端到端待手测。

### Git Commits

| Hash | Message |
|------|---------|
| `0f763a0` | refactor(@zanelab/iam-web): /functions/v1 接口调用收敛到 src/api 层 |
| `d464056` | fix(@zanelab/iam-web): OTP 验码失败从 401 改为 400（业务校验失败语义） |
| `193a4cf` | chore(@zanelab/iam-web): 更新品牌资产 logo 与 favicon |

### Status

[OK] **Completed**


## Session 7: env 体系模板化 + apikey 注入 + iam 登录页三连修
<!-- trellis-session: v=2 fp=91e283949f5af780 -->

**Date**: 2026-11-02
**Task**: env 体系模板化 + apikey 注入 + iam 登录页三连修
**Branch**: `feat/env-restructure`

### Summary

env-restructure：删三份 .env.development/.env.production，改 .env.example 模板模式（.gitignore 改 .env* + !.env.example，实测确认真实 .env 仍被忽略）；两 app mock 开关统一为 VITE_USE_MOCK；新增 VITE_API_KEY 注入 apikey 头（iam 独立态 http 拦截器 + portal dev proxy）。质检发现 iam 独立态没有任何 proxy、连云必然 404、apikey 注入实为死代码——补 server.proxy（/functions/v1 → VITE_PROXY_TARGET 基址，不 rewrite），echo server 实测设 target 转发 200、未设仍 404。AGENTS.md 被 turbo 重写成混合行尾，统一 LF。收尾批三连修：OTP 弹窗外点关闭（根因是 daisyUI 5 .modal-backdrop z-index:-1 被 .modal 盖住，探针实证后改 dialog onClick 外点判定）；邮箱输入改 daisyUI validator（CSS-only 红框+hint，新增 emailInvalid i18n 键）；resendIn 倒计时恒显字面量（i18next v26 插值分隔符是 {{ }}，语言包单花括号 {n} 不被识别，zh/en 同改）。另：独立态 token 存储键改 iam_token 前缀（用户侧改动代提交）。遗留：AC7 直连云 200/401 手测待用户；Edge Function 401→400 修正（前任务）仍待重新部署。

### Git Commits

| Hash | Message |
|------|---------|
| `2e06079` | refactor(project): env 体系模板化 + 两 app mock 开关统一 + apikey 注入 |
| `c764572` | chore(project): AGENTS.md 行尾统一为 LF（turbo 托管块重写所致） |
| `d23250a` | fix(@zanelab/iam-web): OTP 弹窗外点关闭 + 邮箱输入 daisyUI validator 校验 |
| `8105842` | fix(@zanelab/iam-web): resendIn 插值占位符改为 i18next v26 的双花括号 |
| `4a91260` | chore(@zanelab/iam-web): 独立态 token 存储键改为 iam_token 前缀 |

### Status

[OK] **Completed**


## Session 8: iam 菜单管理全栈落地 + 登录页输入组件升级
<!-- trellis-session: v=2 fp=ab1598386fa62a42 -->

**Date**: 2026-11-04
**Task**: iam 菜单管理全栈落地 + 登录页输入组件升级
**Branch**: `feat/iam-menu-management`

### Summary

iam-menu-management：/iam/menus 从占位卡片全栈落地为菜单管理页——迁移 0001（menus/roles/user_roles/role_permissions 四表 + 注册触发器：首个用户 admin 余者 guest）、Edge Fn 菜单端点（游客子集/按权限/admin CRUD + 1010-1013 错误码）、api 层 menusApi 第二域、树形表格动态弹窗、props 契约抽到 src/props.ts（api 层 import 链脱离 qiankun 入口）、iam-web 首次引入 vitest（16 用例）。实施中修掉两个探针实证的真 bug：buildTree 输入行旧 children 混合导致节点重复渲染；extractMsg 缺 e.msg 级（RequestClient 4xx 重抛 envelope 本体，HTTP 层后端文案从未透出）。本机无 supabase CLI，迁移验证降级为静态审查 + 用户手测。1a0d4d5：登录页邮箱输入按用户指定形态改 floating-label + inset icon + validator 组合（:has 任意深度驱动浮动已验源 CSS）。收尾批：OTP 弹窗外点关闭（daisyUI backdrop z-index 被 .modal 盖住的层叠问题）、resendIn 插值改 i18next v26 双花括号、独立态 token 键改 iam_ 前缀（用户侧改动代提交）。遗留：迁移与 RBAC 分配的浏览器手测；Edge Function 云部署。

### Git Commits

| Hash | Message |
|------|---------|
| `5a1ac7a` | feat(@zanelab/iam-web): 菜单管理页面全栈落地（RBAC 底座 + Edge Fn CRUD + 页面） |
| `1a0d4d5` | feat(@zanelab/iam-web): 登录页邮箱输入改 floating-label + icon + validator 组合 |

### Status

[OK] **Completed**


## Session 9: 菜单修订 + Edge Fn 类型检查 + 请求头集中化 + apiKey 拦截器化
<!-- trellis-session: v=2 fp=3be399dff4e7c12d -->

**Date**: 2026-11-05
**Task**: 菜单修订 + Edge Fn 类型检查 + 请求头集中化 + apiKey 拦截器化
**Branch**: `feat/apikey-interceptor`

### Summary

menu-revision（11-04）：按用户评审修订菜单管理——迁移 0002（后应用户要求合并为单文件初始化迁移 0001：删 menu_type/parent、增 active_icon、scopes 值域改 A/C 且 C=游客可见）、Edge Fn 类型联动校验矩阵（1014）、新建/编辑弹窗重构为类型驱动动态表单（切类型清失效字段、scopes chip 多选、hidden 回归）、菜单编码改服务端自动生成 m_<id>（请求不携带、update 不可改，role_permissions 的权限码即此编码列表）、初始化迁移注释精简为字段说明。40cc8cd：用户报 IDE 类型错——menusDelete 分派少传 req（esbuild 不查类型 + tsconfig 不含 supabase/functions 的双盲区）；新增 functions/tsconfig.json 纳入 tsc 覆盖，toTree 按 BuildNode/MenuNode 分型重构（最小复现验证）。b4500c1+a576eae+8f2e4e1（11-05）：用户评审 apiKey 只在 vite proxy 注入生产裸奔——迁移到 portal 请求拦截器（config.js 新增 api.apiKey 运行时配置，iam 集成态经 props.http 同链路覆盖，独立态保留 env）；请求头集中到 buildLegacyHeaders（X_* 注入删除、token 改 Authorization Bearer、TOKEN_HEADER 全仓清零）；loginPage/loginEndpoint 配置移除（登录走 iam，portal 登录页降级为兜底）。期间处置：config.js 不安全手改（删 schema 必填的 loginEndpoint）按用户决定还原。遗留：用户手改的端点切 iam 方向另任务（iam 需补 logout 端点）；*.supabase.co 在用户网络被 SNI 阻断（502 根因，代码无关）；四个分支未推送。

### Git Commits

| Hash | Message |
|------|---------|
| `e390e65` | feat(@zanelab/iam-web): 菜单表结构精简 + 类型联动动态表单（任务 11-04） |
| `daf12e4` | chore(@zanelab/iam-web): 迁移合并为单文件初始化（0002 并入 0001） |
| `5cf9438` | docs(@zanelab/iam-web): 初始化迁移注释精简为字段说明 |
| `f9b29df` | feat(@zanelab/iam-web): 菜单编码改为服务端自动生成（m_<id>） |
| `40cc8cd` | fix(@zanelab/iam-web): 修 menusDelete 少传 req 的调用错 + Edge Fn 类型检查落地 |
| `b4500c1` | feat(project): apiKey 注入迁移到 http 拦截器（运行时配置），移除 vite proxy 注入 |
| `a576eae` | refactor(@zanelab/portal-web): 请求头集中到 buildLegacyHeaders，token 改 Authorization Bearer |
| `8f2e4e1` | refactor(project): 移除 loginPage 与 loginEndpoint 配置（登录走 iam 子应用） |

### Status

[OK] **Completed**


## Session 10: 请求头集中化 + loginPage/loginEndpoint 移除 + 旧会话链路退役 + toast 防双弹
<!-- trellis-session: v=2 fp=404a7d75013b190d -->

**Date**: 2026-11-05
**Task**: 请求头集中化 + loginPage/loginEndpoint 移除 + 旧会话链路退役 + toast 防双弹
**Branch**: `feat/apikey-interceptor`

### Summary

apikey-interceptor 任务的评审驱动续批：a576eae 按 X_* 评审——请求头集中到 buildLegacyHeaders（Authorization Bearer 取代 ailab-token，TOKEN_HEADER 全仓清零，401 单飞重放走 preset 缺省），X_* 注入删除（常量保留供登出清理/端别判定）；8f2e4e1 按 loginPage 评审——AuthConfigSchema 删 loginPage、ApiConfigSchema 删 loginEndpoint（登录走 iam，portal 登录页降级为兜底路由并标注），config.js/DEFAULT_CONFIG/main.tsx 同步；4ab5995 深度精简——session-store 整文件退役（端别纯函数零调用、setUserPer 零调用、tenantList 恒空致 UserDropdown 副标题从未显示）、constants/auth.ts 删除（LEGACY_TOKEN_KEY 写入退役——已验证 iam 不读）、clearStoredTokens 保留清理改字面量 key；b73d818 修复菜单页双 toast——集成态宿主拦截器已 notify（401/403/5xx/网络错/envelope 失败）而页面 showToast 再弹一份，按身份通道判定归属（showToast 增 doNotify，集成态默认吞、404/400 补弹；独立态恒弹）。期间处置：config.js 不安全手改（删 loginEndpoint）还原；502 根因诊断为 *.supabase.co SNI 阻断（代码无关）。

### Git Commits

| Hash | Message |
|------|---------|
| `a576eae` | refactor(@zanelab/portal-web): 请求头集中到 buildLegacyHeaders，token 改 Authorization Bearer |
| `8f2e4e1` | refactor(project): 移除 loginPage 与 loginEndpoint 配置（登录走 iam 子应用） |
| `4ab5995` | refactor(@zanelab/portal-web): 退役旧会话/端别链路（constants/auth.ts 与 session-store） |
| `b73d818` | fix(@zanelab/iam-web): 菜单页错误 toast 防双弹（按身份通道判定归属） |

### Status

[OK] **Completed**


## Session 11: AppIcon 下沉收尾：BUILTIN_ICONS 精简 + 图标键对齐 + PR #5
<!-- trellis-session: v=2 fp=e9eb7361a8124797 -->

**Date**: 2026-11-08
**Task**: AppIcon 下沉收尾：BUILTIN_ICONS 精简 + 图标键对齐 + PR #5
**Branch**: `feat/iam-api-rbac`

### Summary

完成任务 11-06-app-icon-shared 收尾：BUILTIN_ICONS 精简至引用集（288→67 键，保留种子/代码/测试引用的 home/system/key/shield 等 8 键），应用侧图标键对齐（pencil→edit、trash-2→trash、refresh-cw→refresh、world-clock→timezone），pack.json 新增 users/menus/role 六图标，config.js 关闭偏好设置入口，spec 组件规范对齐 packages/ui 路径。trellis-check 全绿（tsc/lint/portal 179 测试/iam 42 测试/双端 build）。推送 feat/iam-api-rbac 并创建 PR #5（64 提交：IAM RBAC 全栈 + 图标体系下沉）。

### Git Commits

| Hash | Message |
|------|---------|
| `d8a6e34` | feat(@zanelab/ui): BUILTIN_ICONS 精简至引用集，键名对齐 refresh/timezone/trash |
| `ed4f516` | feat(@zanelab/portal-web): 运行时图标包新增 users/menus/role 六图标 |
| `8af8318` | chore(@zanelab/portal-web): 运行时配置关闭偏好设置入口 |
| `908d5ec` | docs(task): 图标体系规范对齐 packages/ui 新位置 |

### Status

[OK] **Completed**


## Session 12: GitHub Pages 发布流程：tag 触发构建 + 目录布局 + Supabase 直连（PR #6）
<!-- trellis-session: v=2 fp=c69cff05f919479f -->

**Date**: 2026-11-09
**Task**: GitHub Pages 发布流程：tag 触发构建 + 目录布局 + Supabase 直连（PR #6）
**Branch**: `feat/github-pages-release`

### Summary

完成任务 11-08-github-pages-release：打 tag v* 由 GH Actions 构建三 app 推送到 zanelab.github.io 用户站点仓库（根路径部署，CNAME zanelab.vip 保留）。关键决策：用户站点仓库方案取代项目站点子路径（零 base 改造）；iam/home 构建期 --base=/iam/、/home/ 隔离三端 assets；API 浏览器直连 Supabase（网关 CORS 实测放行 GET/POST/PUT/PATCH/DELETE），唯一代码改动是 iam apiPrefix 参数化（显式 props.apiPrefix 空串合法，四域收敛 api/prefix.ts 单点，单测 9 例）。新增 patch-config/assemble/push-pages 三脚本 + deploy-pages.yml（幂等、fail-fast、CNAME 保留、敏感值零硬编码）。验证：三端 tsc + 全仓 build/test/lint 绿；patch 幂等两遍一致；push 模拟 bare 仓验证；组装产物本地 HTTP 冒烟含 404 回退深链接。合并后 owner 需一次性配置 GIT_TOKEN secret + SUPABASE_URL/API_KEY variables（清单在 workflow 头注释）。

### Git Commits

| Hash | Message |
|------|---------|
| `5107e5b` | feat(@zanelab/iam-web): API 前缀参数化——显式 props.apiPrefix 优先 |
| `d52312b` | feat(project): GitHub Pages 发布流程（组装/改写/推送脚本 + workflow） |
| `4710d20` | chore(task): 记录 github-pages-release 任务工件 |

### Status

[OK] **Completed**


## Session 13: 市场页工具栏：筛选/搜索/分类 + 上传入口
<!-- trellis-session: v=2 fp=3882b642419b23eb -->

**Date**: 2026-11-19
**Task**: 市场页工具栏：筛选/搜索/分类 + 上传入口
**Branch**: `feat/skills-marketplace-toolbar`

### Summary

把市场页标题行下的控件区重排为左右两栏（左侧 筛选→搜索→分类，右侧 排序→上传），分类下拉对齐 skillry.dev 的两栏 tabbed 弹层（遮罩 + 缩放淡入），上传按钮按 skills:skill:create 显隐。AC1–AC15 全部达成，实测数据落在 verify/acceptance.md。验收中发现并修复「关闭弹层后焦点掉到 body」的缺陷。

### Main Changes

- apps/skills-web/src/{utils/permission.ts,hooks/use-permissions.ts,components/permission.tsx,pages/marketplace/toolbar/*,pages/marketplace/modal/*}

### Git Commits

| Hash | Message |
|------|---------|
| `6d51be2` | feat(@zanelab/skills-web): 市场页工具栏重排 —— 筛选/搜索/分类 + 上传入口 |
| `6f145b4` | style: 沉淀弹层焦点归还契约与 qiankun 样式隔离实测结论 |
| `96f6cd4` | chore(task): 记录 11-16-marketplace-toolbar 规划与验收 |

### Testing

- [OK] pnpm --filter @zanelab/skills-web lint/test/build（83 tests passed）

### Status

[OK] **Completed**

### Next Steps

- portal-web 那批在途改动（skills 子应用注册、菜单 mock、@source 扫描、dev:skills 脚本）尚未提交，需单独成提交；父任务 11-14-skills-marketplace-refactor 与子任务 11-14-footer-marketing 仍在 planning，待后者完成后归档父任务


## Session 14: 11-14-footer-marketing 检查与收尾
<!-- trellis-session: v=2 fp=9cb975021e053236 -->

**Date**: 2026-11-20
**Task**: 11-14-footer-marketing 检查与收尾
**Branch**: `feat/skills-marketplace-toolbar`

### Summary

footer-marketing 检查与收尾：AC1–AC10 全过（tsc/build/lint、测试 87/87、深浅两态截图、页脚纯展示无 a/button/tabindex、FAQ 可开合、无横向溢出）；浏览器实测确认 scrollWidth === clientWidth。提交 39ae48e（footer 三段纯展示区）+ 35b330d（任务文档）。

### Git Commits

| Hash | Message |
|------|---------|
| `39ae48e` | feat(@zanelab/skills-web): 市场页页脚营销区 —— 三段纯展示区 |
| `35b330d` | chore(task): 记录 11-14-footer-marketing 规划与验收 |

### Status

[OK] **Completed**


## Session 15: 11-14-skills-marketplace-refactor 集成验收与归档
<!-- trellis-session: v=2 fp=11f3004d046fb083 -->

**Date**: 2026-11-20
**Task**: 11-14-skills-marketplace-refactor 集成验收与归档
**Branch**: `feat/skills-marketplace-toolbar`

### Summary

父任务集成验收 IC1–IC4 全过：IC1 整页结构无断层（网格与页脚间距恰为 mt-16，无占位残留）；IC2 token 块 strip CR 后逐字节一致（portal 侧 CRLF 为 bd66b98 历史遗留）；IC3 build/test 87 全绿/lint 过；IC4 集成态 5173 登录态（dev-only VITE_USE_MOCK + MSW OTP mock 取得，验证后恢复原配置）下 /skills 完整渲染无样式错位。新增 verify/acceptance.md，prd.md 勾选 IC1–IC4 并修正任务图（补 11-16-marketplace-toolbar）。父任务已归档。

### Git Commits

| Hash | Message |
|------|---------|
| `a0676e7` | chore(task): 11-14-skills-marketplace-refactor 集成验收（IC1–IC4 全过） |

### Status

[OK] **Completed**


## Session 16: 11-06-iam-api-rbac 补做收尾验收并归档
<!-- trellis-session: v=2 fp=431564e003530630 -->

**Date**: 2026-11-20
**Task**: 11-06-iam-api-rbac 补做收尾验收并归档
**Branch**: `feat/skills-marketplace-toolbar`

### Summary

发现 RBAC 实现（S1–S9）已通过 PR #5 合入 main 但任务未收尾。补做验收：iam-web tsc（app+Edge Fn）0 错、测试 51/51、build ✓；portal-web build ✓ 测试 179/179；functions/v1 裸引 grep 仅命中 HTTP 客户端自身测试。代码落地抽查 0002_permission.sql / requirePermission / Permission.tsx 均在位。记录 verify/acceptance.md 后归档任务。至此全部 3 个活动任务清零。

### Git Commits

| Hash | Message |
|------|---------|
| `70ef8db` | chore(task): 11-06-iam-api-rbac 补做收尾验收（验证命令全绿） |

### Status

[OK] **Completed**

---

## 2026-11-20 · 11-01-absorb-wg-skills 收尾

### What happened

续做 wg-skills 吸收任务：上一会话已补齐 13 份缺口文档（42 技能）但未核对未提交。本会话跑完 S5–S9：验证 8 项 AC 全绿（层可发现 / 158 映射无遗漏无重复 / shared 6 份实质保留 / 来源标注 / 私有技能标注 / 体量 653KB≤700KB / frontend+guides 零改动），PRD 状态改为完成，单 commit 入库后归档任务。

### Lessons

- commitlint scope-enum 不含 `spec`，spec 层提交用 `project` scope。
- `verify_coverage.py` 依赖 /tmp 源克隆做机械重算，克隆删除后改用 source-inventory.md（TOTAL=158）保底交叉核对；coverage 清单中 uniapp 系用去 `-skill` 后缀名，按 basename 匹配才不误报。
- worktree/分支删除后 task archive 会告警 recorded branch 不存在——首批已直入 main 时无碍。

### Git Commits

| Hash | Message |
|------|---------|
| `9983337` | docs(project): 补齐 wg-skills 吸收层剩余 13 份文档（42 技能，158/158 全覆盖） |
| (auto) | chore(task): archive 11-01-absorb-wg-skills |

### Status

[OK] **Completed** — 全部活动任务清零

---

## 2026-11-20 · 11-20-skills-web-permission-align

### What happened

skills-web 权限系统对齐 iam-web：删除订阅式权限内核（utils/permission.ts + hooks/use-permissions.ts + main.tsx 接线，约 130 行），Permission 组件改为每次渲染读 getProps().permissions，与 iam-web 逐行同构。决策依据：宿主 bootstrapSession 先 fetchMenus 再 setupMicroApps，mount 时 props.permissions 已是真值，订阅防的竞态不存在。trellis-implement + trellis-check 两轮子代理，tsc/84 测试/build 全绿，AC1-4 达成后提交归档。

### Lessons

- 子应用 getProps 必须抽独立 props.ts，不能从 main.tsx 导出——main.tsx 顶层有独立态 render() 副作用，组件测试 import 链会连带执行入口崩溃（iam-web props.ts 头注释已记载此因，skills 重蹈前已被 prompt 拦截）。已沉淀到 component-guidelines.md。
- task.py archive 对直提 main 的任务要求 --skip-branch-validation（否则报 branch unchanged 拒绝归档）。
- commitlint scope-enum 无 spec/refactor 专属值，用 project 通过。

### Git Commits

| Hash | Message |
|------|---------|
| `273618a` | refactor(project): skills-web 权限组件对齐 iam-web（纯 getProps 快照） |
| (auto) | chore(task): archive 11-20-skills-web-permission-align |

### Status

[OK] **Completed**

---

## 2026-11-21 · 11-21-refresh-apikey-fix

### What happened

用户报「token 过期后刷新首页仍显示已登录」。排查链路：refresh 端点本身 → 启动期 bootstrap → 浏览器实测复现 → 定位真因：portal/iam 独立态的 refresh 裸 fetch 漏发 apikey，被 Supabase 网关 401 MISSING_CREDENTIALS 拦截（请求未到 Edge Fn），有效会话每次刷新被强制登出。curl 对比实证（同请求带/不带 apikey → 200/401）。修复：portal apikey 收敛 buildLegacyHeaders + classifyRefreshError 加 gateway 类别（响应体 source=@supabase/server 判定）+ 运行期 doReAuthenticate 用模块级标记跳过登出（packages/utils 零改动）；iam 同款。浏览器实测请求已带 apikey 到达 Edge Fn。

### Lessons

- **匿名端点 ≠ 无凭据**：Edge Fn 不校验 JWT，但 Supabase 网关仍要求 apikey；裸 fetch 绕过拦截器就丢凭据。已沉淀 http-api-guidelines.md。
- 网关 401 与业务 401 status 相同，必须看响应体（source 字段）区分；配置错误绝不能当会话失效。
- 排障路径有效：curl 直接对比 → 浏览器 devtools 网络面板抓请求头 → 不轻信「设计如此」的结论（本轮我最初误判 401 为预期行为）。
- prettier CRLF/locale 文件：子代理产出 4 文件格式不符，commit 被 lefthook 拦，prettier --write 后重提（tsc/test 复跑确认无损）。
- 用户反馈：子代理 prompt 偏宽偏慢、check 面太宽——后续小修复收窄 prompt（改动点+关键事实+底线），check 限直接相关命令与文件。

### Git Commits

| Hash | Message |
|------|---------|
| (see log) | fix(project): refresh 请求补 apikey 并区分网关鉴权失败与会话失效 |
| (auto) | chore(task): archive 11-21-refresh-apikey-fix |

### Status

[OK] **Completed**

---

## 2026-11-21 · 11-21-skills-toolbar-permission-fix

### What happened

用户报 /skills 两问题：工具栏（筛选/搜索/分类）与 sort-tabs 胶囊样式不一致；admin 也看不到上传入口。实测定位：样式是 daisyUI 默认形态 vs 自拼胶囊；上传入口根因是前端 permissions 唯一来源=菜单树派生，role_permissions 的 '*' 从不进前端（mergePermissions 无消费方）+ 菜单树无 skills:skill:create 节点。修复：Edge Fn 新增 /auth/permissions（角色权限并集）→ portal bootstrap/restore 合并；migration 0006 补种按钮节点；三控件统一胶囊。浏览器实测全过（入口出现、对话框可开、样式同形）。

### Lessons

- RBAC 前后端数据源必须对齐：后端 requirePermission 看 role_permissions，前端只看菜单树——admin 的 '*' 若无显式合并链路永远进不了前端。已沉淀 component-guidelines。
- 诊断链路有效：用角色权限端点做探针（menus/all 探 admin、roles/1/permissions 查 '*'）逐层排除。
- supabase CLI npx 版在 darwin-x64 缺二进制；直接下 GitHub release tar.gz 可用（/tmp/supabase-cli）。本次云端已含端点与节点，未需部署。
- 工具栏多控件视觉统一：对齐基准选一个组件的参数（sort-tabs），其余手写同款类，不引抽象。

### Git Commits

| Hash | Message |
|------|---------|
| (see log) | fix(project): skills 工具栏胶囊样式统一 + admin 权限链路修复 |
| (auto) | chore(task): archive 11-21-skills-toolbar-permission-fix |

### Status

[OK] **Completed**


## Session 17: 菜单 i18nKey 多语言链路（iam 配置 → /auth/menus → 宿主渲染）
<!-- trellis-session: v=2 fp=a533acc497a01b75 -->

**Date**: 2026-11-22
**Task**: 菜单 i18nKey 多语言链路（iam 配置 → /auth/menus → 宿主渲染）
**Branch**: `main`

### Summary

打通菜单国际化链路：menus 表加 i18n_key 列（0007 迁移，回填 seed 5 节点），iam edge fn 透传、iam 管理页加「国际化键」输入框与表格列、宿主 transformMenu 映射到 MenuItem.i18nKey，经既有 menuTitle() 渲染期解析。edge fn 不做语言分支（接口语言无关），切语言走既有整页刷新链路。spec 补 4 层可执行契约与验证矩阵。

### Git Commits

| Hash | Message |
|------|---------|
| `f7dad1a` | feat(project): 菜单 i18nKey 多语言链路（iam 配置 → /auth/menus → 宿主渲染） |
| `6a94233` | test(project): 菜单 i18nKey 链路测试 + mock 契约同步 |
| `3eca5d0` | docs(project): 菜单 i18nKey 跨层链路契约（4 层 + 验证矩阵） |

### Testing

- [OK] iam-web 60/60、portal-web 191/191；两包 tsc + build + lint 全绿；edge fn tsc 通过；语言包两包 key 树一致；迁移回填条件对 0004 种子行逐条校验各命中 1 条

### Status

[OK] **Completed**

### Next Steps

- AC8（切语言后导航文案同步）未做浏览器实测——需部署迁移 + edge fn 后人工验证；后台已建节点（如 skills app）的 i18nKey 需 admin 自行补，译文走外部 packUrls


## Session 18: 子任务① skills-web i18n + radius 主题联动
<!-- trellis-session: v=2 fp=521858795714b583 -->

**Date**: 2026-11-23
**Task**: 子任务① skills-web i18n + radius 主题联动
**Branch**: `main`

### Summary

父任务 11-22-skills-i18n-theme-crud 子任务①完成：skills-web 平移 iam-web i18n 方案（props.preferences.locale + onHostStateChange，独立态缺省 zh-CN），13 个市场页文件文案入包（两包各 90 key 树一致，zh-CN 逐字一致——既有 84 用例断言零修改全过）；data.ts 选项去 label 渲染期 t() 派生；radius 经 --page-radius 联动（props.preferences.radius，大容器跟随、胶囊不动）。check 阶段发现并修复『变量已声明未消费』（8 处容器改 rounded-(--page-radius)）。spec 沉淀子应用 i18n 接入模板 + --page-radius 模式。

### Git Commits

| Hash | Message |
|------|---------|
| `0b85eaa` | feat(@zanelab/skills-web): i18n 双语运行时 + radius 主题联动（任务 11-23-skills-i18n-radius） |
| `28d9513` | docs(project): 子应用 i18n 接入模板 + --page-radius 主题联动模式（任务①产物） |

### Testing

- [OK] skills-web 95/95（新增 i18n 单测/radius 双态/切语言）；tsc/build/lint 全绿；portal 191/191、iam 60/60 无回归；语言包 key 树 diff 空

### Status

[OK] **Completed**

### Next Steps

- 子任务②（11-23-skills-crud-mock）待启动：skills 表迁移 + edge fn + api 层 + VITE_USE_MOCK mocks + Modal 表单；其表单文案依赖本任务语言包
