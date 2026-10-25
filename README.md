# zaneLab

基于 pnpm workspaces + Turborepo 的 monorepo。qiankun 基座 + 微前端子应用 + 共享包。

## 目录结构

```
zanelab/
├── apps/
│   ├── portal-web/   # 基座 @zanelab/portal-web（:5173）—— 登录、菜单、qiankun 宿主
│   └── iam-web/      # 子应用 @zanelab/iam-web（:8081）—— vite-plugin-qiankun
├── packages/     # 共享包（源码直出，无构建产物）
│   ├── types/    # @zanelab/types   共享类型
│   ├── utils/    # @zanelab/utils   纯逻辑 util
│   └── ui/       # @zanelab/ui      零耦合叶子组件
├── tooling/
│   ├── tsconfig/            # @zanelab/tsconfig          共享 tsconfig
│   ├── node-utils/          # @zanelab/node-utils        Node 工具（fs/git/hash/monorepo…）
│   ├── prettier-config/     # @zanelab/prettier-config   共享 Prettier 配置
│   ├── commitlint-config/   # @zanelab/commitlint-config commit 规范配置
│   └── stylelint-config/    # @zanelab/stylelint-config  共享 Stylelint 配置
├── .changeset/   # changesets（内部版本追踪，包 private 不发布）
└── turbo.json    # build/test/lint 任务编排
```

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `pnpm install` | 根目录一次安装全仓依赖（统一 lockfile） |
| `pnpm dev` | 启动基座 `apps/portal-web`（:5173） |
| `pnpm dev:iam` | 启动子应用 `apps/iam-web`（:8081） |
| `pnpm dev:home` | 启动子应用 `apps/home-web`（:8083） |
| `pnpm build` | turbo 编排全仓构建 |
| `pnpm test` | turbo 编排全仓测试 |
| `pnpm lint` | turbo 编排全仓 lint（portal-web + utils + ui + types + node-utils） |
| `pnpm lint:css` | stylelint 检查全仓 CSS（apps/ + packages/） |
| `pnpm format` | prettier 全仓格式化（配置来自 @zanelab/prettier-config） |
| `pnpm format:check` | prettier 全仓格式检查（不落盘） |
| `pnpm --filter @zanelab/portal-web test` | 单跑某个包（build / lint / dev 同理） |

**命令映射说明**：迁移前后根命令语义保持原样（`pnpm dev` / `dev:iam` / `build` / `test` / `lint`），只是内部实现从单仓直接执行改为 `turbo run` / `pnpm --filter` 编排到对应包——日常使用无感知变化。

## Git hooks（lefthook）

`pnpm install` 时经 `prepare` script 自动激活（配置在根 `lefthook.yml`）：

- **commit-msg**：commitlint 校验 message，须符合 conventional 格式（`type(scope): 描述`，scope 取 workspace 包名或 project/style/lint/ci/dev/deploy/other）；不规范提交会被拒。
- **pre-commit**：对 staged 的 js/ts/tsx/css/md/json 文件跑 prettier --check；失败时先跑 `pnpm format` 再提交。

## 版本记录（changesets）

内部版本追踪：`pnpm changeset` 记录一次变更（选包 + bump 类型 + 说明），`pnpm version-packages` 消费变更集并更新版本号。所有包 private，不发布到 registry。

详细规范见 `.trellis/spec/frontend/`。
