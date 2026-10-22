# Supabase 项目搭建指南

按照以下步骤创建 Supabase 云开发项目。

---

## 1. 创建 Supabase 项目

1. 打开 [supabase.com](https://supabase.com) 并注册/登录
2. 点击 **New project**
3. 填写：
   - **Name**: `zanelab-dev`（或任意名称）
   - **Database Password**: 生成一个强密码并**妥善保存**（后续边缘函数/数据库管理需要用到）
   - **Region**: 选择离您最近的区域（如 Northeast Asia (Tokyo) 或 Southeast Asia (Singapore)）
   - **Pricing Plan**: 选择 **Free**（免费额度：500MB 数据库、5GB 带宽、每月 50,000 月活跃用户）
4. 点击 **Create project**，等待约 2 分钟完成初始化

## 2. 获取 API 凭据

1. 在项目仪表板左侧菜单中，点击 **Settings**（齿轮图标）→ **API**
2. 复制下列值：
   - **Project URL** — 格式：`https://<project-id>.supabase.co`
   - **anon public key** — 以 `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` 开头的长字符串

> ⚠️ `anon key` 是公开的客户端密钥，可以安全地存储在前端代码中。`service_role key`（secret）用于服务端操作，**不要**在前端暴露。

## 3. 配置认证（Auth）

1. 在左侧菜单中点击 **Authentication** → **Providers**
2. 确保 **Email** provider 已启用（默认是启用的）
3. 可选但仍推荐立即配置：
   - **Confirm email** — 开发阶段建议关闭（"Allow unconfirmed email logins"）
   - 在 **Email Auth** 部分：
     - 关闭 **Confirm email**（开发阶段）
     - 保持 **Secure email change** 开启

## 4. 创建数据库 Schema 和表

在左侧菜单中点击 **SQL Editor**，然后按顺序执行以下 SQL：

### 4.1 创建 schemas

```sql
-- 创建 iam schema（用户权限管理）
CREATE SCHEMA IF NOT EXISTS iam;

-- 创建 skills schema（工作流智能体）
CREATE SCHEMA IF NOT EXISTS skills;
```

### 4.2 创建 iam.menus 表

```sql
-- 菜单表：存储前端菜单树，portal-web 启动时通过 API 获取
CREATE TABLE IF NOT EXISTS iam.menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES iam.menus(id),
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  icon TEXT,
  permission TEXT,          -- 权限码，如 'system:user:view'
  i18n_key TEXT,
  sort_order INTEGER DEFAULT 0,
  visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 插入种子菜单数据
INSERT INTO iam.menus (name, path, icon, permission, sort_order) VALUES
  ('仪表盘', '/dashboard', 'dashboard', NULL, 0),
  ('系统管理', '/system', 'settings', NULL, 10),
  ('用户管理', '/iam/users', 'users', 'system:user:view', 20),
  ('角色管理', '/iam/roles', 'shield', 'system:role:view', 30);
```

### 4.3 启用 RLS 并创建策略

```sql
-- 允许经过认证的用户读取菜单
ALTER TABLE iam.menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_can_read_menus"
  ON iam.menus FOR SELECT
  TO authenticated
  USING (true);
```

### 4.4 创建菜单查询 API（Edge Function）

在左侧菜单中点击 **Edge Functions** → **New function**，命名为 `menu-tree`：

```typescript
// supabase/functions/menu-tree/index.ts
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: menus, error } = await supabase
    .from("menus")
    .select("*")
    .order("sort_order");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(buildTree(menus)), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

function buildTree(flat: any[]) {
  const map = new Map<string, any>();
  const roots: any[] = [];
  for (const item of flat) {
    map.set(item.id, { ...item, children: [] });
  }
  for (const item of flat) {
    const node = map.get(item.id)!;
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
```

## 5. 配置 Kong 网关路由

在 **Edge Functions** 页面，确认 `menu-tree` 函数已部署。Edge Functions 的 URL 模式为：
- `https://<project-id>.supabase.co/functions/v1/menu-tree`

在项目的 `config.toml`（通过 Supabase CLI 或在 Dashboard Settings → API 中配置）：

```toml
[functions.menu-tree]
enabled = true
```

> **注**：生产环境中，可以通过 Supabase 的 Kong 配置添加路径重写，使 `/api/iam/menus` → `functions/v1/menu-tree`。开发阶段直接通过 Edge Functions URL 访问即可。

## 6. 验证

在终端中测试 JWT 认证是否正常工作：

```bash
# 1. 注册一个测试用户
curl -X POST 'https://<project-id>.supabase.co/auth/v1/signup' \
  -H 'apikey: <anon-key>' \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"Test123456"}'

# 2. 登录获取 JWT（从响应中复制 access_token）
curl -X POST 'https://<project-id>.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: <anon-key>' \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"Test123456"}'

# 3. 使用 JWT 调用 Edge Function
curl 'https://<project-id>.supabase.co/functions/v1/menu-tree' \
  -H 'Authorization: Bearer <access_token>'
```

第 3 步应返回您在步骤 4.2 中插入的菜单数据。

---

完成后，您将拥有以下关键值（**请私信给我，不要公开分享**）：

| 值 | 用途 |
|---|---|
| `SUPABASE_URL` | `https://xxxxxxxxxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOi...`（长 JWT 字符串） |

获得这些凭据后，我将完成 portal-web 配置连接并运行端到端测试。