# Design — GitHub Pages 发布流程

## 总体架构

```
push tag v* (zanelab/zanelab)
  └─ GH Actions: deploy-pages.yml
       ├─ checkout + pnpm install --frozen-lockfile
       ├─ pnpm turbo build --filter=@zanelab/portal-web --filter=@zanelab/iam-web --filter=@zanelab/home-web
       ├─ node scripts/deploy/assemble.mjs
       │    ├─ stage/: portal dist 全量（根）
       │    ├─ stage/iam/  ← apps/iam-web/dist
       │    ├─ stage/home/ ← apps/home-web/dist
       │    ├─ stage/404.html ← portal dist/index.html 副本
       │    ├─ stage/.nojekyll（空文件）
       │    └─ stage/config.js ← patch-config.mjs 改写后写入
       └─ git push stage/ → zanelab.github.io main（PAGES_TOKEN；先 clone 目标仓库保留 CNAME/README）
            └─ Pages legacy 构建发布 → https://zanelab.github.io/ (= zanelab.vip via CNAME)
```

## 关键决策与理由

### D1 · 为什么推仓库而非 actions/deploy-pages
`actions/deploy-pages` 部署 artifact 到**当前仓库**的 Pages（项目站点，URL 带 `/zanelab/` 子路径）。目标是 `zanelab.github.io` **用户站点仓库**，必须 git push。Pages 该仓库为 legacy 构建型（branch `main` / path `/`），push main 根目录即发布。

### D2 · 根路径部署 → 零 base 改造
用户站点 URL 无子路径，vite 默认 base `/` 即正确：portal dist 的 `/assets/*`、`/config.js`、`/logo.svg`，iam/home dist 的 `/assets/*`（入口 HTML 由 qiankun fetch 后内联执行，其 `import('/assets/...')` 相对**页面 origin 根**解析——iam 挂载在宿主页面，资产必须落在根级 `/assets/`）。**推论：iam/home 的 dist assets 不能进子目录，子目录只放 index.html 等入口文件；但三个 app 的 `/assets/` 会互相覆盖！**

**冲突消解（D2b）**：三端 dist 均有 `assets/` 目录。方案：
- portal 资产保持根 `/assets/`（宿主 index.html 直接引用）
- iam/home 构建时 CLI 注入 `--base=/iam/`、`--base=/home/`：其 index.html 内联 `import('/iam/assets/...')`、资产落在 `iam/assets/`、`home/assets/`
- qiankun fetch `entry: '/iam/'` 拿到 iam/index.html，内联脚本 import 的绝对路径 `/iam/assets/*` 命中子目录资产 —— 同源无 CORS
- portal 不需要 base（根）；iam/home 的 base 仅影响其自身资产路径，与 basename 路由解耦（路由 basename 由 props.activeRule 驱动，仍是 `/iam`）

验证锚点：iam dist index.html 内联 `import('/assets/index-*.js')` → 改 base 后应变为 `import('/iam/assets/index-*.js')`。

### D3 · API 直连拓扑（替代 vite 反代）
```
dev:    浏览器 → :5173 /iam/functions/v1/*（宿主代理，剥前缀）→ iam dev server / Supabase
prod:   浏览器 → https://<ref>.supabase.co/functions/v1/iam/...（CORS *，网关实测放行 GET/POST/PUT/PATCH/DELETE + auth 头）
```
- 宿主 axios `baseURL = api.baseURL`，端点为完整路径（`/iam/functions/v1/...`）→ 部署 config.js 只改 baseURL 一个值，端点不动
- iam 集成态走宿主 props.http（同一实例），iam 侧 `apiPrefix()` 产出的 `/iam` 前缀会把路径变成 `/iam/auth/otp/send`——这是 dev 代理的**路由工件**（portal dev 代理剥 `/iam` 后转发 iam dev server 再由 iam MSW/代理直连）。prod 直连时宿主实例 baseURL+完整端点已含 `/iam` 段（Edge Fn 部署名），iam api 层再拼一次 `/iam` → 双前缀 404
- 修复：`apiPrefix()` 改读显式 `props.apiPrefix`（类型 `string | undefined`；**空串合法**——`??` 只回退 nullish），部署 config.js 在 `microApps.iam.props` 写 `apiPrefix: ''`。dev 的宿主 config.js 不写该键 → 回退 basename 派生 `/iam`，行为不变
- 独立态 iam（直开 :8081 或 Pages `/iam/`）`props.apiPrefix` 缺省 → 回退 ''（basename 缺省 '/'→replace 后 ''），直连逻辑不变

### D4 · 404.html 与深链接
Pages 用户站对未知路径回 404.html 且 URL 不变 → 404.html = portal index.html：JS 从 `/config.js` 加载、路由 `/iam/login` 命中宿主兜底登录路由（App.tsx:352 `path: appConfig.auth.loginPath`）。注意：宿主 index.html 的 `<script type="module" src="/src/main.tsx">` 在 dist 已替换为 `/assets/index-*.js`，副本天然可用。

### D5 · CNAME / .nojekyll 保留策略
部署脚本 clone `zanelab.github.io` 到临时目录 → 清空除 `.git`/`CNAME`/`README.md` 外的全部 → 拷入 stage → commit push。CNAME 若被覆盖域名解析失效（Cloudflare 侧指向不变，GH Pages 侧主机名声明丢失会 404）。

### D6 · config.js 改写 vs 构建期注入
选**部署期改写产物 config.js**（patch 脚本）：config.js 本就是运行时配置契约（spec：部署期唯一来源，运维改文件即生效）；不引入第二套 `.env.production` 机制，dev/prod 差异收敛在一个脚本、一份参数。脚本用简单文本替换 + JSON 断言（config.js 是 `window.__APP_CONFIG__ = {...}` 字面量，eval 提取后改值再序列化回写——**不做 eval**，用正则定位字段 + 生成全新对象字面量，见 R4 patch 脚本设计：parse 用 `new Function('return ' + objSrc)` 在 Node 侧隔离求值，等价运维手工编辑）。

## 数据流与契约

### workflow 输入（env/secrets）
| 变量 | 来源 | 用途 |
|---|---|---|
| `SUPABASE_URL` | repo variable（非敏感，公开可暴露——publishable 语义） | patch config.js `api.baseURL` |
| `SUPABASE_API_KEY` | repo variable（publishable key，本就打进 config.js） | patch config.js `api.apiKey` |
| `PAGES_TOKEN` | repo secret（fine-grained PAT → zanelab.github.io Contents RW） | git push 部署仓库 |

publishable key 与 Supabase URL 均为浏览器可见值（现有 config.js 已含同值），不入 secret。

### patch-config.mjs 契约
```
node scripts/deploy/patch-config.mjs --config <path> \
  --api-base-url <url> --api-key <key> \
  --entry-iam /iam/ --entry-home /home/ \
  --iam-props-api-prefix '' \
  [--dry-run] [--out <path>]
```
- 读 `window.__APP_CONFIG__ = {...};` → 提取对象源码 → `new Function` 求值 → 深改 `api.baseURL/apiKey`、`microApps.iam.entry/home.entry`、`microApps.iam.props.apiPrefix` → 序列化（2 空格缩进，与现文件风格一致）→ 写回
- 幂等：重复运行结果一致（entry 已是 `/iam/` 不再变）

### assemble 布局（站点根）
```
/                 ← portal dist（index.html、config.js、assets/、icons/、logo.svg、favicon.ico、mockServiceWorker.js）
/iam/             ← iam dist（index.html、assets/、favicon.ico…）
/home/            ← home dist
/404.html         ← portal index.html 副本
/.nojekyll        ← 空
/CNAME            ← 目标仓库保留（zanelab.vip）
/README.md        ← 目标仓库保留（替换为部署说明可选，本期保留原文件）
```

## 兼容性 / 回归

- **dev 链路零行为变化**：patch 脚本只作用于 CI 内 stage 副本；仓库内 `apps/portal-web/public/config.js` 不动；iam apiPrefix 改动向后兼容（新 prop 可选）
- **既有 spec 不违背**：「接口地址从运行时配置读取不硬编码」——生产值仍在 config.js（改写后）；「开发期开关不进 config.js」——patch 参数是部署值非开关
- **回滚**：git revert 部署仓库的 push 提交即可回退站点（Pages 从 main 重建）；workflow 文件回滚走常规 PR

## 风险

| 风险 | 缓解 |
|---|---|
| iam/home assets 同名互相覆盖 | D2b：子应用 `--base=/iam/`、`/home/`（构建期注入，文件名 hash 不同名，目录隔离双保险） |
| PAGES_TOKEN 未配置 → 首跑失败 | AC6 一次性准备清单写进 workflow 注释；失败信息显式指向 secret |
| qiankun fetch `/iam/` 目录入口（无 index.html 后缀）302 | entry 写 `/iam/`（GH Pages 静态服务目录默认 index.html，无 302）；如异常回退 `/iam/index.html` |
| `new Function` 解析 config.js | Node CI 环境隔离执行；config.js 是仓库自有文件非用户输入；失败即 fail-fast |
| SPA 路由在 404.html 的 query/hash 边缘 | Pages 回退保留完整 URL（标准行为）；AC3 实测 |
