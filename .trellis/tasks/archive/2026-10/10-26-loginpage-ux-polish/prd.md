# LoginPage UX/UI 四点优化

## 背景

apps/iam-web 登录页（src/pages/LoginPage.tsx）从极致 UX/UI 规范审查发现四个细节问题。用户明确要求逐条修复。

## 需求（验收标准）

### 1. 双"主按钮"冲突 — 获取验证码禁用灰态 ✅（已在会话早期落地）
- 现状：按钮已有 `disabled={sending || countdown > 0 || !email.trim()}`，且 className 已含 `disabled:bg-base-300 disabled:text-base-content/50`（覆盖自定义 `bg-(--page-primary)`，daisyUI 默认禁用只降透明度、蓝色仍鲜艳）
- 验收：未输入邮箱时按钮呈灰底灰字，输入有效邮箱后激活为品牌蓝 → **已满足**

### 2. Google 按钮品牌规范
- 现状：`bg-(--page-primary) text-white`（应用品牌蓝做背景）— 违反 Google 官方品牌指南（应为白底+灰边框，或黑底/特定蓝 #4285F4）
- 改法：白底 + 浅灰边框 + 深色文字（保持 disabled 占位 + tooltip "即将开放" 语义不变；SVG 四色品牌图标不动）

### 3. 邮箱输入框交互感
- 现状：`bg-base-200 border-base-300 border` — 有边框但灰底让它读起来像"已填充/不可点的按钮"
- 改法：白底（bg-base-100）+ 边框保留 + 增加 hover 边框颜色变化；focus 边框变品牌色 + ring 保留

### 4. GitHub 按钮边缘 crisp
- 现状：`bg-base-200` 无边框 — 白底页面上边缘模糊
- 改法：白底 + 浅灰边框 + 深色文字（与 Google 按钮统一为"第三方登录 = 白底描边次级样式"）

## 设计语言统一

三档视觉层级：
- **实心品牌蓝** = 唯一主操作（获取验证码，激活态）
- **白底 + 浅灰描边** = 第三方登录（Google/GitHub，disabled 占位）
- **灰底** = 禁用/不可用（获取验证码未激活态）
- **输入框** = 白底 + 边框 + hover/focus 反馈（"等待输入"暗示）

## 约束

- 深色模式（prefs.mode==='dark'）下语义色用 daisyUI 语义 token（base-100/200/300、base-content），不写死白色
- 不改文案/i18n、不改认证逻辑、不改布局
- daisyUI 5 语法（apps/iam-web 已是 Tailwind 4 + daisyUI 5）

## 验证

- `npx vite build`（apps/iam-web 内，vitest 未安装）
- `npx tsc --noEmit`
