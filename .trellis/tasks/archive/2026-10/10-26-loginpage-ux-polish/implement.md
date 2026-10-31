# 实现记录

文件：apps/iam-web/src/pages/LoginPage.tsx（唯一改动文件，7+/7-）

## 四点对应改动

| # | 问题 | 改动 |
|---|------|------|
| 1 | 获取验证码禁用态仍显蓝 | className 增 `disabled:bg-base-300 disabled:text-base-content/50`（覆盖自定义 `bg-(--page-primary)`；daisyUI 默认禁用只降透明度，蓝色仍鲜艳）——disabled 逻辑 `sending \|\| countdown > 0 \|\| !email.trim()` 原本就有 |
| 2 | Google 按钮用应用品牌蓝违反品牌规范 | `bg-(--page-primary) text-white` → `bg-base-100 border-base-300 text-base-content border hover:bg-base-200 hover:border-base-400`（白底灰描边，disabled 占位 + tooltip 不变） |
| 3 | 输入框灰底像"已填充"，交互感弱 | `bg-base-200` → `bg-base-100` + 增 `hover:border-base-400`（focus 品牌色边 + ring 原本就有） |
| 4 | GitHub 按钮灰底无边框、边缘不 crisp | `bg-base-200` → 同 Google 的白底描边样式（第三方登录统一为次级样式） |

## 设计语言（三档视觉层级）

- 实心品牌蓝 = 唯一主操作（获取验证码激活态）
- 白底 + 浅灰描边 = 第三方登录（Google/GitHub）
- 灰底 = 禁用（获取验证码未激活态）
- 输入框 = 白底 + 边框 + hover/focus 反馈

全部用 daisyUI 语义 token（base-100/200/300/400、base-content），dark 模式自动适配，无写死颜色。

## 验证

- `npx tsc --noEmit` ✅ 0 错误
- `npx vite build` ✅ 686ms（vitest 未装于本包，build 为既定验证路径）
