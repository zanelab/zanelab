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
