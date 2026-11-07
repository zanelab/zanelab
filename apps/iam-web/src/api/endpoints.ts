/*
 * iam-web 端点常量 —— **零 import**（不要在这里引任何模块）。
 *
 * 为什么必须零依赖：mock worker 在独立 bundle 里 import 本模块
 * （src/mocks/otp-handlers.ts）。一旦引入 ../main 的 getProps()，整个应用入口
 * 模块会被拖进 worker bundle，并可能形成循环依赖。
 * 运行时的 API 前缀**不走常量**：src/api/auth.ts 从 props.basename 派生
 * （独立运行性要求，见下）；INTEGRATION_PREFIX 只服务 mock。
 */

/**
 * 集成态宿主代理前缀 = 子应用 activeRule（`/iam`）。
 *
 * 只给 mock 用：MSW 的 SW 注册在**页面 origin** 上，拦截发生在宿主 vite proxy
 * rewrite（剥 /iam）之前，handler 必须按页面级完整路径登记；mock 里读不到
 * props.basename，故在此以常量固化。api 层运行时的前缀仍从 props.basename
 * 派生（独立态缺省为空 → 请求直落本 dev server，见 api/auth.ts）。
 *
 * 改子应用 activeRule 时须同步：apps/portal-web/public/config.js 的
 * microApps.iam.activeRule。
 */
export const INTEGRATION_PREFIX = '/iam';

/**
 * OTP 发码路径（相对页面 origin 的完整路径，不含集成态前缀）。
 *
 * 路径段 `iam` 是 Supabase Edge Function 的**函数名**（不是目录），须与
 * apps/iam-web/supabase/functions/iam/ 的部署名同步
 * （`pnpm exec supabase functions deploy iam`）；改名时此处与 README 的 curl 一起改。
 */
export const OTP_SEND_PATH = '/functions/v1/iam/auth/otp/send';

/** OTP 验码路径（同上：`iam` 段是 Edge Function 函数名，改名须同步部署名）。 */
export const OTP_VERIFY_PATH = '/functions/v1/iam/auth/otp/verify';

/**
 * 菜单列表（GET，匿名可调：无 JWT 返回游客可见子集，design DD3）。
 * 挂在 /auth 段下与 OTP 同级——两者都是「按身份返回不同数据」的读端点。
 */
export const MENUS_LIST_PATH = '/functions/v1/iam/auth/menus';

/**
 * 菜单管理专用全量树（GET，require system:menu:list：含 hidden 与 button）。
 * 菜单管理页数据源——/auth/menus 是「按用户权限过滤的树」（壳菜单/导航用），
 * 管理页要看到全量（含待发布/按钮节点），两者职责不同故分端点。
 */
export const MENUS_ALL_PATH = '/functions/v1/iam/menus/all';

/** 菜单集合写路径（POST 新建；仅 admin，Edge Fn requireAdmin 把关）。 */
export const MENUS_COLLECTION_PATH = '/functions/v1/iam/menus';

/** 菜单单项写路径（PUT 更新 / DELETE 删除——级联子树，仅 admin）。 */
export const MENUS_ITEM_PATH = (id: number | string) =>
  `/functions/v1/iam/menus/${id}`;

/**
 * 用户列表（GET，admin-only：service role 列 auth.users + 角色聚合）。
 * 挂在 /auth 段下——读端点按身份返回数据（用户列表恒 admin，语义在服务端）。
 */
export const USERS_LIST_PATH = '/functions/v1/iam/auth/users';

/** 用户角色分配（PUT，admin-only；body { roles: string[] } 全量替换）。 */
export const USER_ROLES_PATH = (userId: string) =>
  `/functions/v1/iam/users/${userId}/roles`;

/** 用户禁用/恢复（PUT，admin-only；body { disabled: boolean }）。 */
export const USER_BAN_PATH = (userId: string) =>
  `/functions/v1/iam/users/${userId}/ban`;

/** 角色列表（GET，admin-only：roles 表 + 授权菜单数）。 */
export const ROLES_LIST_PATH = '/functions/v1/iam/auth/roles';

/** 角色已授权 code 集合（GET）/ 全量替换授权（PUT；body { permissions: string[] }）。 */
export const ROLE_PERMISSIONS_PATH = (roleId: number | string) =>
  `/functions/v1/iam/auth/roles/${roleId}/permissions`;
