# Supabase 网关 + 统一鉴权的平台架构

**Status**: Planning · **Created**: 2026-10-22

## Goal

基于 Supabase 生态（Kong 网关 + Auth + 后端服务）实现统一认证鉴权的微前端平台架构，使新子应用可以即插即用。

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API 路由 | 路径前缀 (`/api/iam/*`, `/api/skills/*`) | Kong 原生支持，前端单一 base URL |
| 用户认证 | 共享 Supabase Auth（一个项目） | 统一鉴权目标，一个 JWT issuer |
| 子应用注册 | MVP 配置驱动（`appConfig.microApps`） | 现有代码已支持，3 步接入 |
| 权限模型 | 页面级 RBAC | 沿用现有 `Permission.tsx` + 权限码 |
| 本地开发 | Supabase 云开发项目 | 无需 Docker，配置通过环境变量注入 |

## Architecture

```
Browser → Supabase Kong Gateway (JWT verify / ACL / rate-limit / route)
                ↓
         portal-web (qiankun host)
                ↓ props: { token, permissions, basename, http }
    ┌───────────┼───────────┐
  iam-web   skills-web   (future apps)
                ↓ API via gateway (path-prefix routed)
    ┌───────────┼───────────┐
  iam-server  skills-server (one Supabase project, schema-isolated)
```

## Requirements

### R1: Supabase 项目搭建
- 创建 Supabase 云开发项目
- 配置 Auth providers（email/password，MVP 阶段）
- 设置数据库 schema：`iam` schema 和 `skills` schema 隔离
- Kong 网关路由配置：`/api/iam/*` → iam-server，`/api/skills/*` → skills-server
- 环境变量注入前端配置（`SUPABASE_URL`, `SUPABASE_ANON_KEY`）

### R2: Portal-web 鉴权迁移
- 替换自定义 token 管理模式为 Supabase Auth（`@supabase/supabase-js`）
- 登录流程改为 `supabase.auth.signInWithPassword()`
- 移除 SM4 密码加密（Supabase 服务端哈希）
- 替换 Axios 拦截器 token 注入：自定义 header → `Authorization: Bearer <jwt>`
- 利用 Supabase 内置 token 刷新，移除自定义刷新队列
- 会话恢复改为 `supabase.auth.getSession()` + `onAuthStateChange`
- RouteGuard 增加 `isInitialized` 加载状态，避免页面刷新时闪白
- 子应用 props 中的 `token` 改为 Supabase JWT（`access_token`）

### R3: 子应用注册标准化
- 标准化 `microApps` 配置结构（`activeRule`, `entry`, `name`, `container`, `prefetch`）
- 新增子应用 3 步流程：
  1. 在 `appConfig.microApps` 中添加入口配置
  2. 在菜单 API 中添加菜单项（含权限码）
  3. 子应用实现 qiankun 生命周期（`bootstrap`, `mount`, `unmount`）+ `vite-plugin-qiankun`
- 子应用 props 契约：`token`, `permissions`, `basename`, `http`, `user`, `locale`
- 子应用模板/脚手架（可复用的 `main.tsx` + `vite.config.ts`）

### R4: 后端服务（阶段 2）
- iam-server：用户/角色/权限管理 API
- skills-server：工作流/智能体管理 API
- 通过 Kong 网关路径前缀路由暴露

## Acceptance Criteria

1. 用户可通过 Supabase Auth（email/password）登录 portal-web，获取 JWT
2. 所有 API 请求携带 `Authorization: Bearer <jwt>` 经 Kong 网关验证后转发
3. portal-web 启动时自动恢复会话（`getSession()`）并获取菜单和权限
4. 新增子应用只需 3 步配置，无需修改 portal-web 核心代码
5. 子应用通过 qiankun props 获得 `accessToken`, `permissions`, `basename`
6. 现有 iam-web 子应用在迁移后功能正常

## Out of Scope

- CI/CD 流水线搭建
- 生产环境部署和监控
- 第三方登录（OAuth、SSO）
- 多租户支持
- 子应用 API 驱动动态注册
- 按钮级权限控制
- iam-server / skills-server 后端实现（阶段 2）
- Supabase Kong 网关自定义插件开发

## Current State Summary

**portal-web 现有认证系统**：
- 自定义 token 存储在 localStorage + Zustand auth-store（`token`, `refreshToken`, `user`）
- Axios 拦截器注入 `ailab-token` header，自定义 token 刷新队列
- SM4 加密登录密码，登录接口 `/sys/auth/login`
- 会话恢复存在缺陷：页面刷新后 Zustand 丢失内存状态，RouteGuard 跳转登录页

**portal-web 现有微前端系统**：
- `setupMicroApps()` 从 `appConfig.microApps` 读取配置并注册 qiankun 子应用
- Props 注入：`token`, `permissions`, `locale`, `http`, `getHostState`, `onHostStateChange`
- 主机状态同步通过 Zustand store 订阅触发
- 现有子应用：iam-web（2 个页面文件）

## Key Files (Migration Impact)

| File | Action | Notes |
|------|--------|-------|
| `apps/portal-web/src/stores/auth-store.ts` | Modify | 添加 `isInitialized`, 对接 Supabase session |
| `apps/portal-web/src/utils/http.ts` | Modify | 移除自定义刷新队列，改用 Supabase JWT |
| `apps/portal-web/src/utils/auth.ts` | Simplify | 移除 `clearStoredTokens`, 改用 Supabase signOut |
| `apps/portal-web/src/utils/crypto.ts` | **Remove** | SM4 不再需要 |
| `apps/portal-web/src/api/auth.ts` | Rewrite | 改为 Supabase SDK 调用 |
| `apps/portal-web/src/micro/register.ts` | Modify | token → accessToken，添加 Supabase client |
| `apps/portal-web/src/components/RouteGuard.tsx` | Modify | 添加 `isInitialized` loading |
| `apps/portal-web/src/config/` | Modify | 添加 Supabase 配置项 |
| `apps/iam-web/src/main.tsx` | Verify | 验证 props 兼容性 |