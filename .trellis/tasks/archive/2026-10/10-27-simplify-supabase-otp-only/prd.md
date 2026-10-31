# iam-web supabase 简化：只保留 email + OTP 两步登录

## Goal

移除 iam-web supabase 中过度设计的 RBAC 表、RLS、custom token hook、seed 数据，Edge function 只保留 otp/send 和 otp/verify 两个端点，出参简化为 `{ token, refreshToken, user }`。

## Background

当前 supabase 实现了完整的多租户 IAM 系统（tenants/orgs/roles/permissions/menus 等表 + RLS + JWT claims hook + seed），但 iam-web 现阶段只做 email + OTP 两步登录，不需要这些。过度设计增加了维护成本和认知负担。

## Requirements

### R1: 数据库简化

- 删除所有自定义 iam schema 下的表（tenants, orgs, users, roles, permissions, menus, user_roles, role_permissions, user_orgs）
- 删除 RLS 策略和 helper 函数（is_platform_admin, current_tenant_id, current_org_id 等）
- 删除 custom access token hook（iam.custom_access_token_hook）
- 删除 seed 数据
- 删除 iam schema 本身（如果没有任何剩余对象）

Supabase 内置的 `auth.users` 表已经足够支持 OTP 登录，不需要额外表。

### R2: Edge function 简化

- 只保留两个端点：
  - `POST /api/v1/auth/otp/send` — 发送验证码到邮箱
  - `POST /api/v1/auth/otp/verify` — 验证码换取 token
- 删除 login/register/logout/userPer/iamContext 路由
- 删除 context 切换、端切换相关逻辑
- 删除 iam.users 表查询（用户名回填等）

### R3: 出参契约保持不变

- `otp/verify` 返回 `{ code: 0, data: { token, refreshToken, user: { id, username, email } }, msg: "ok" }`
- envelope `{ code, data, msg }` 对齐 portal http.ts 解包
- LoginPage 和 OtpVerifyModal 前端代码无需改动

### R4: 多语言支持

- Edge Function 通过 `Accept-Language` header 读取前端语言（zh-CN / en-US），返回对应语言的消息
- 前端 LoginPage 在请求中携带 `Accept-Language` header，值来自 `props.preferences.locale`
- 消息键对照：`ok` / `notFound` / `invalidBody` / `emailRequired` / `codeRequired` / `codeInvalid` / `internalError`
- 缺省语言：zh-CN

## Non-Goals

- 不修改 LoginPage / OtpVerifyModal 前端代码
- 不做 username/password 登录
- 不做用户注册
- 不做角色/权限/菜单管理
- 不做端切换（平台端/租户端/组织端）

## Acceptance Criteria

- [ ] AC1: 所有 supabase/migrations 下的文件被移除或替换为无自定义表的迁移
- [ ] AC2: Edge function 只包含 otp/send 和 otp/verify 两个路由
- [ ] AC3: `POST /api/v1/auth/otp/send { email }` 返回 `{ code: 0, data: { success: true } }`
- [ ] AC4: `POST /api/v1/auth/otp/verify { email, code }` 返回 `{ code: 0, data: { token, refreshToken, user } }`
- [ ] AC5: LoginPage 前端无需修改即可正常工作
- [ ] AC6: 删除的迁移文件不会导致 supabase db reset / migration 出错（如果之前已有部署，需要新建替换迁移而非直接删除旧文件）