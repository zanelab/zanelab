# Changesets

本仓库用 [changesets](https://github.com/changesets/changesets) 做**内部版本追踪**：所有包均为 private、不发布到任何 registry，changeset 只用于记录每次变更影响的包与版本意图，形成可追溯的变更日志。

## 用法

1. 记录一次变更：根目录执行 `pnpm changeset`，按提示选择受影响的包（`@zanelab/portal-web`、`@zanelab/iam-web`、`@zanelab/types`、`@zanelab/utils`、`@zanelab/ui`）、bump 类型（patch/minor/major）并填写说明；会在 `.changeset/` 生成一个临时 markdown 文件，随代码一起提交。
2. 消费变更集：`pnpm version-packages`（即 `changeset version`）——删除已记录的 changeset 文件、bump 对应包版本并写入 CHANGELOG；随后正常提交。
3. 不执行 publish：没有 `pnpm publish` 类脚本，包保持 `private: true`。
