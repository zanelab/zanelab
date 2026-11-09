# GitHub Pages 发布流程（dist 目录布局 + API 直连替代 vite 代理）

## Goal

打 tag（`v*`）时由 GitHub Actions 自动构建三个 app，产物按微前端应用名归目录（portal 在根、`iam/`、`home/`），推送到 `zanelab.github.io` 用户站点仓库（已有 Pages + 自定义域名 `zanelab.vip`），实现根路径部署。生产 API 不经反代，浏览器直连 Supabase Edge Fn，替代 vite dev 代理在生产中的角色。

## 已确认事实（代码勘察 + 线上验证 2026-11-08）

### 部署目标（用户决策）
- 用户决策：构建产物直接部署到 **`zanelab.github.io` 仓库**做 GitHub Pages；触发时机为**打 tag `v*`**
- `zanelab/zanelab.github.io` 现状：public、Pages 已启用（legacy 构建分支 `main` 路径 `/`）、根有 **CNAME（`zanelab.vip`，Cloudflare 代理中，`x-github-request-id` 证实 GH Pages 在服务）**、当前仅 Hello 占位页
- 用户站点 = **根路径部署**（`https://zanelab.github.io/` 与 `https://zanelab.vip/` 同内容）：现有绝对路径（`/assets/*`、`/config.js`、`/logo.svg`、`/iam/login`、`/icons/pack.json`）全部原样可用，**不需要** vite `base`、BrowserRouter basename、loginPath 前缀等任何改造（相比项目站点子路径方案大幅简化）
- **权限缺口**：`zanedeng` 对 `zanelab.github.io` 仅 READ（zanelab 名下其它仓库均 WRITE）→ CI 跨仓库推送需要 owner 在 Pages 仓库授权（fine-grained PAT 限权到该仓库的 Contents: Read and write，存为 `zanelab/zanelab` 的 Actions secret `PAGES_TOKEN`）。CNAME 由部署脚本保留（构建产物不含，推前复制）
- 推送方式选 **peaceiris/actions-gh-pages 类或 plain git push**：用 git push 到 `main`（Pages legacy 构建从 main 根目录发布，**不可用 actions/deploy-pages**——那是本仓库 artifact 部署，不改目标仓库）

### 应用结构与构建
- `apps/portal-web`（宿主，build = `tsc -b && vite build`）、`apps/iam-web`（子应用 `iam`）、`apps/home-web`（子应用 `home`），各自产出 `dist/`（turbo tasks.outputs `dist/**`；pnpm 10.16.1）
- qiankun 2.10.16 + import-html-entry：宿主经 entry URL fetch 子应用 HTML 并内联执行；vite-plugin-qiankun@1.0.15 生产构建输出内联 `import('/assets/index-*.js')` 动态导入
- 子应用路由 basename 由宿主 props 下发（register.ts:194 `basename: cfg.activeRule`）；宿主自身 BrowserRouter 无 basename（根路径部署无需改动）

### vite 代理（仅 dev server 生效）与生产直连等价性（线上已验证）
- portal dev 代理：`/iam/functions/v1/*` → iam dev server / 云 Supabase（剥 `/iam` 前缀）；iam 独立态：`/functions/v1/*` → Supabase（不剥前缀）；`/icons/pack.json` → 宿主 dev server。三者均只在 `command === 'serve'` 生效，生产本来就没有代理（spec 既有约定）
- **Supabase 网关层 CORS 全开**（实测 preflight 204：`Access-Control-Allow-Origin: *`、allow-methods 含 GET/POST/PUT/PATCH/DELETE、allow-headers 含 authorization/apikey/content-type/accept-language——比函数代码里 corsHeaders 更宽，网关统一处理，应用侧无需改动）
- 生产 API 链路（代码已支持）：host http client `baseURL + endpoint`（http.ts:123）；apikey 由 http 拦截器注入（读 config.js api.apiKey）；iam 集成态透传宿主 props.http，无需 iam 侧任何配置
- iam 集成态 API 前缀从 `props.basename` 派生（api/auth.ts:43）——该前缀是 **dev 代理路由工件**；prod 直连时 props.http 是宿主共享实例（宿主 baseURL 直指 Supabase），iam api 层若再拼 `/iam` 前缀会打到 Pages 自身 404。**见 R5 决策：集成态 iam api 层不拼前缀的前提是宿主实例已带完整路径——实测宿主 endpoint 已含 `/iam/functions/v1/...`（config.js api.menusEndpoint），iam 侧 apiPrefix() 在集成态返回 basename='/iam' 后拼出 `${apiPrefix()}${PATH}`，PATH 为 `/auth/otp/send` 等 → `/iam/auth/otp/send`，经宿主实例 baseURL 直连 Supabase 时 404**。需改：iam api 前缀改为「显式 `props.apiPrefix` 优先，回退 basename 派生」；部署 config.js 给 iam props 传 `apiPrefix: ''`（dev 不传保持现状）

### 运行时配置部署期改写点（config.js）
- `api.baseURL: ''` + `menusEndpoint: '/iam/functions/v1/...'` 等 → `baseURL: 'https://nttwwxxgogbxkbuktpbc.supabase.co'`，端点保持完整路径（宿主实例拼 baseURL+endpoint 直连）
- `microApps.home/iam.entry: '//localhost:808x'` → `'/iam/'`、`'/home/'`（同源相对，根路径部署天然正确）
- `auth.loginPath: '/iam/login'` 不变（根路径下已是正确 URL）
- `iconPackUrl: '/icons/pack.json'` 不变（portal dist 内含 public/icons/pack.json；iam 经 props 拿同一 URL 同源可取）
- `system.logo/favicon`、`route.*`、`preferences.*` 不变

### GH Pages SPA 深链接
- Pages 对未知路径回退到 `404.html`（URL 保持原样）→ 把 portal index.html 复制为 `404.html`，深链接 `/iam/login` 落宿主 app 由 qiankun/路由接管
- 根路径下 `/iam/` 精确命中 iam 自身 index.html → 独立态渲染（`__POWERED_BY_QIANKUN__` 检测，既有机制），与 qiankun fetch 同一文件两态共存
- 需 `.nojekyll`（跳过 Jekyll，`_` 前缀文件不适用但防意外）；CNAME 必须保留否则域名解析失效

## Requirements

- **R1 · 发布工作流**：`.github/workflows/deploy-pages.yml`，push tag `v*` 触发（workflow_dispatch 手动兜底）；pnpm frozen install → turbo build（portal/iam/home）→ 组装站点目录（portal 根 + `iam/` + `home/` + `404.html` + `.nojekyll` + 保留 CNAME）→ config.js 部署期改写（R4）→ 推送到 `zanelab.github.io` main
- **R2 · 目录布局**：站点根 = portal dist 全量（含 `config.js`、`icons/pack.json`）；`iam/` = iam dist；`home/` = home dist；`404.html` = portal index.html 副本；`.nojekyll`；`CNAME` = `zanelab.vip`（从 Pages 仓库现有文件保留）
- **R3 · API 直连**：部署期 config.js 改写 `api.baseURL` 为 Supabase 云基址（值进 workflow env/secret，不硬编码进脚本默认值；仓库内 config.js 仍为 dev 用相对路径不变）
- **R4 · config 改写脚本**：`scripts/deploy/patch-config.mjs`（Node ≥20 原生，零依赖）：读 dist config.js → 按部署参数改写（baseURL、microApps entry、可选 iam apiPrefix props）→ 写回；本地可 `--dry-run` 预览
- **R5 · iam api 前缀参数化**：`apiPrefix()` 改为「`props.apiPrefix` 显式值优先（含空串），缺省回退 `basename` 派生」；部署 config.js 的 `microApps.iam.props.apiPrefix = ''`；dev 链路不传该 props 行为完全不变（auth.ts、menus.ts 两处 + LoginPage 如有同款派生一并对齐）
- **R6 · 权限与 token**：workflow 用 `PAGES_TOKEN` secret（fine-grained PAT，zanelab.github.io Contents 读写）推送；推送前保留 CNAME；PR 说明中给出 owner 侧一次性授权步骤清单

## Acceptance Criteria

- [ ] **AC1** 推 tag `v*` 后 Actions 全绿；`https://zanelab.github.io/` 根路径返回宿主页面，`/assets/*`、`/config.js`、`/icons/pack.json`、`/logo.svg` 均 200，`zanelab.vip` 同步生效且 CNAME 保留
- [ ] **AC2** 浏览器完成 OTP 登录 → 菜单加载 → iam/home 子应用挂载正常；网络面板确认 API 全部直连 `https://nttwwxxgogbxkbuktpbc.supabase.co/functions/v1/...`，无任何 API 请求打到 github.io/zanelab.vip
- [ ] **AC3** 深链接直开 `/iam/login` 可到登录页（404.html 兜底）
- [ ] **AC4** 本地 dev 全链路回归：`pnpm dev`（代理模式）/ `pnpm dev:iam`（独立态直连）与改动前行为一致；三端 tsc + 测试全绿
- [ ] **AC5** 产物检查：站点根 index.html 资产引用为根路径；`iam/index.html`、`home/index.html` 存在；config.js 为改写后版本（baseURL=Supabase、entry=/iam/、/home/、iam props.apiPrefix=''）；`CNAME`、`.nojekyll`、`404.html` 就位
- [ ] **AC6** 首次部署前完成一次性准备（owner 操作）：Pages 仓库授权 fine-grained PAT + secret 配置——写进 workflow 注释/README

## Out of Scope

- 自定义域名变更 / DNS 配置（zanelab.vip 已绑定 Cloudflare，保持现状）
- nginx 反代实现（用户已选 Pages 直连方案；如日后需要另起任务）
- iam/home 独立态在 Pages 上的完整可用性（集成态宿主是唯一产品入口；`/iam/` 直开仅保证不白屏，与既有独立态降级语义一致）
- Supabase 侧改动（Edge Fn、CORS 网关层已就绪，实测通过）
- PR/分支预览环境（仅 tag 生产发布）
- `zanelab.github.io` 仓库的历史占位内容迁移（index.html/README 会被部署覆盖，README 保留由脚本处理）

## Open Questions

（无——唯一用户决策「部署到 zanelab.github.io 仓库」已确认；权限授予是 owner 一次性操作，AC6 记录步骤而非阻塞项）
