# 集成验收：skills-web 市场页对照参考站重构（父任务）

2026-11-20 执行，三个子任务（11-14-listing-area / 11-16-marketplace-toolbar /
11-14-footer-marketing）均已完成后，按 [prd.md](../prd.md)「跨子任务验收（集成）」逐项验证。

## 结论：IC1–IC4 全部通过

### IC1 整页结构完整性 ✅

独立态（:8084，1920 宽视口）浏览器实测：

- DOM 结构：`main` 下依次为 HEADER（mb-5）→ sr-only h2 → 卡片网格 →
  `section.border-base-300.mt-16.border-t.pt-14`（页脚三段）。
- 衔接测量：网格底部 y=929px，页脚顶部 y=993px，间距恰为设计的 `mt-16`（64px），
  **无空白断层**；junction 处截图确认网格 → 段头过渡自然。
- `document.body.textContent` 不含「已经到底了。」——占位文案无残留。
- 整页 `scrollHeight=2699`，三段页脚（overview 特性卡 / browse 入口大卡 / FAQ）
  与列表区构成连续结构，从侧栏顶部到页脚底部无结构性缺口。

### IC2 token 块逐行无差异 ✅（附注）

`diff <(sed -n '/^:root,/,/^}/p' ...)` 非 0 的**唯一**差异是行尾符：
portal 侧 CRLF、skills 侧 LF。逐行 strip `\r` 后 diff 为空，token 内容逐字节一致。

- CRLF 为 portal 侧历史遗留：`bd66b98`（2026-11-06，OTP 聚焦态样式）即已是 CRLF，
  早于本重构（2026-11-14 启动），且 portal 不在本任务范围（父任务 PRD「不做的事」）。
- 两个子任务与父任务均未改动任何一份 `index.css`（git log 佐证）。

### IC3 全仓回归 ✅

`pnpm --filter @zanelab/skills-web build && test && lint` 全绿：
vite build 827ms 通过；测试 3 文件 87/87 通过；oxlint 0 警告 0 错误。

### IC4 集成态抽查 ✅

- 未登录访问 `http://localhost:5173/skills` → 302 `/iam/login?from=/skills`（符合预期）。
- 登录态获取：iam 云 Edge Fn 为真实通道（`VITE_USE_MOCK=false`），测试邮箱
  admin@example.com（example.com）无法接收真实验证码 → 临时开启 dev-only 的
  `VITE_USE_MOCK=true`（MSW OTP mock，README 文档化路径：任意 6 位码通过），
  重启 iam dev server 后以 admin@example.com + 123456 完成登录。
  **验证后已恢复 .env 原值并重启 iam dev server（8081），环境回到 mock 关闭态。**
- 登录态下 `/skills` 渲染：portal 外壳（顶部导航 首页/skills/搜索/主题/通知/头像）
  + 子应用完整内容（标题块、筛选侧栏、卡片网格、页脚三段含 FAQ）均正常渲染；
  `scrollWidth === clientWidth`（1456=1456）无横向溢出；未发现样式错位。
- 截图按仓库惯例不入库。

## 遗留

- 父任务 PRD「任务图」只画了 2 个子任务，`task.json.children` 实际 3 个
  （11-16-marketplace-toolbar 为后补的第三个子任务）——本次随验收记录一并修正图示。
