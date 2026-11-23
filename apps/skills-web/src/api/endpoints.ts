/*
 * skills-web 端点常量 —— **零 import**（不要在这里引任何模块）。
 *
 * 为什么必须零依赖：mock worker 在独立 bundle 里 import 本模块
 * （src/mocks/skill-handlers.ts）。一旦引入 ../main 的 getProps()，整个应用
 * 入口模块会被拖进 worker bundle，并可能形成循环依赖（iam endpoints.ts
 * 同款约束，任务 11-03）。
 * 运行时的 API 前缀**不走常量**：src/api/prefix.ts 从 props.apiPrefix（显式，
 * 部署直连时传 ''）/ props.basename（回退派生，独立运行性要求）解析；
 * INTEGRATION_PREFIX 只服务 mock。
 */

/**
 * 集成态宿主代理前缀 = 子应用 activeRule（`/skills`）。
 *
 * 只给 mock 用：MSW 的 SW 注册在**页面 origin** 上，拦截发生在宿主 vite proxy
 * rewrite（剥 /skills）之前，handler 必须按页面级完整路径登记；mock 里读不到
 * props.basename，故在此以常量固化。api 层运行时的前缀仍从 props.basename
 * 派生（独立态缺省为空 → 请求直落本 dev server）。
 *
 * 改子应用 activeRule 时须同步：apps/portal-web/public/config.js 的
 * microApps.skills.activeRule 与 portal vite.config.ts 的代理规则。
 */
export const INTEGRATION_PREFIX = '/skills';

/**
 * 技能集合端点（GET 列表 / POST 新建）。
 * 路径段 `skills`（第二段）是 Supabase Edge Function 的**函数名**，须与
 * apps/skills-web/supabase/functions/skills/ 的部署名同步
 * （`supabase functions deploy skills`）。
 */
export const SKILLS_COLLECTION_PATH = '/functions/v1/skills/skills';

/**
 * 技能单项端点（GET 详情 / PUT 更新 / DELETE 删除——同路径不同 method）。
 */
export const SKILLS_ITEM_PATH = (id: number | string) =>
  `/functions/v1/skills/skills/${id}`;
