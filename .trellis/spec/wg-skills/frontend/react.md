<!-- 来源: jiushiwon/wg-skills @ 3b93743 (Apache-2.0)，有修改；详见 ../NOTICE.md -->
# React 系项目生成规范（React / Next.js / React Native）

> 合并转写自 wg-skills 的 3 个技能：`react-generate-skill`、`next-generate-skill`、
> `react-native-generate-skill`。规则实质保留原文，触发词/frontmatter/与规则无关的叙述已剥离。
> 三个技能**严格依赖 frontend-request-skill**——请求层复用统一请求封装
> （见 [shared-request-layer.md](./shared-request-layer.md)），接口统一放 `src/api/`。

## 一、公共约束（三技能通用）

- 请求层严格依赖统一请求层规范：`request.ts` / `upload.ts` / `sse.ts` / `auth.service.ts`，接口路径与字段必须读 api-contract.md。
- 生成流程均从「Phase 1: Pre-development」开始：先产出**项目规格说明**（项目定位 / 核心功能 / 页面清单…），与用户确认后再生成。
- 所有注释、文档用中文；不替用户提交 git。
- 环境探测先行；版本现场查官方源，不锁死。

## 二、React 项目生成（react-generate-skill）

Web 端 React 项目生成入口。工作流：Phase 1 规格说明（定位/核心功能/页面清单）→ Phase 2 骨架生成（组件结构、路由、状态管理）→ 请求层复用统一封装。路由、状态管理与组件形态遵循 React 社区最佳实践，与本仓库 `frontend/` 层的 React 约定一致处可直接复用。

## 三、Next.js 项目生成（next-generate-skill）

**When NOT to Use**：纯静态单页、无 SEO 需求的内部工具、需要移动端原生能力的项目（转 React Native）。

核心能力清单：

| 能力 | 说明 |
|------|------|
| 三轨请求策略 | Server fetch / Client request.ts / Server Actions |
| App Router 优先 | Server Components 默认，按需 `'use client'` |
| API Routes | `app/api/` Route Handlers（GET/POST/...） |
| Metadata API | 静态 Metadata + `generateMetadata` 动态 SEO |
| 认证中间件 | `middleware.ts`（Edge Runtime）+ cookie 验证 |
| 混合渲染 | RSC 预取数据 + Client Component 交互 |
| Route Groups | `(auth)` / `(dashboard)` 分组布局 |
| 环境变量 | `.env.local` + `NEXT_PUBLIC_` 前缀控制 |

## 四、React Native 项目生成（react-native-generate-skill）

与其他前端初始化技能的区别：运行环境**移动端（iOS/Android）**；环境安装自动检测 + 复杂依赖（Java JDK 17+ / Android SDK / Xcode）；打包 Expo / react-native-cli；交互 3 个问题。

**环境依赖**：Java JDK 17+（Android）、Android Studio（SDK 管理）、Xcode（macOS，iOS）、Node.js ≥ 18 LTS、npm/yarn。

核心能力 10 项：① 环境探测（Node/Java/Android SDK/Xcode）；② 自动安装与兼容性检查；③ **Expo 推荐**（默认，简化配置）；④ 一键启动 `npx expo start`；⑤ 开发热重载 + Expo Go 实时预览；⑥ 生产打包 `npx expo build:android` / `build:ios`；⑦ 导航 React Navigation；⑧ 状态管理 Zustand / Context API；⑨ RN 基础组件；⑩ 网络请求 Fetch / axios。

红线：① **必须环境探测**（RN 环境配置复杂）；② **推荐 Expo**，除非用户明确要原生模块；③ 注释文档中文；④ 不替用户提交 git；⑤ 必须提供依赖包规范（写入 `references/packages.md`）。

## 五、源文件对照

| 章节 | 源技能 |
|------|--------|
| 二 | react-generate-skill（规格说明模板内置 SKILL.md） |
| 三 | next-generate-skill（references/ 含请求层三轨细则） |
| 四 | react-native-generate-skill（references/packages.md 依赖包规范） |
