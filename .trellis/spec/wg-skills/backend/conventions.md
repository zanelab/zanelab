<!-- 来源: jiushiwon/wg-skills @ 3b93743 (Apache-2.0)，有修改；详见 ../NOTICE.md -->
# 后端公共契约规范（唯一事实来源）

> 合并转写自 wg-skills 的 2 个技能：`backend-convention-skill` 与 `shared/` 6 份跨语言公共规范
> （响应信封 / 错误码 / JWT / 分页 / api-contract 模板 / 模块输出规范）。
> 规则实质保留原文，触发词/frontmatter/与规则无关的叙述已剥离。
>
> **本文件是所有后端技能与前端请求层的契约层唯一事实来源**——java/go/python/nodejs
> 各 init-skill 与 module-skill 禁止内联复制这些规则，只引用本文件。

## 一、红线（不可绕过）

1. 所有接口返回 `{ code, message, data }`；`code = 0` 成功，负数失败；HTTP 一律 200（仅路由不存在等底层异常例外）。
2. 业务异常带 `code + message`；控制器只返数据，由拦截器/中间件统一包装；禁止业务代码手造 HTTP 状态码。
3. 边界校验失败返 `-1001`。
4. JWT：登录签发、`Authorization: [REDACTED] 携带；签名密钥经 `JWT_SECRET` 注入。
5. 命名：表/集合 snake_case + 前缀；路由 `/api/<资源>`；环境变量全大写。
6. `api-contract.md` 是前后端唯一事实来源；实现与契约冲突时**契约赢**。
7. `.env` 必须 gitignore；敏感信息不进仓库。
8. 每个生成的后端项目必须同时交付两份文档：`docs/project-guide.md`（介绍 & 拓展性）与 `api-contract.md`（接口 md），与代码同时交付，缺一则视为生成未完成。

## 二、统一响应信封（response-envelope-spec）

> 所有后端技能的 JSON 接口（除 SSE 外）必须遵循。前端请求层按相同结构解析。

```json
{ "code": 0, "message": "success", "data": {} }
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | integer | 是 | 业务状态码。`0` = 成功，负数 = 失败（见错误码表） |
| `message` | string | 是 | 人类可读描述 |
| `data` | any | 是 | 业务数据。空时为 `null`（不得为 `undefined`），列表时为数组，分页时为 `{ list, total, page, pageSize }` |

约束：HTTP 状态码统一 `200`，业务状态由 `code` 表达；响应中**禁止**返回堆栈、SQL、内部错误信息；`code` 只能是 `0` 或负数，**禁止正数表示错误**。

各语言实现参考：Java `ResponseBodyAdvice` 自动包装 / Python 自定义 `JSONResponse` 中间件 / Go 自定义 `ResponseWriter` 包装 / Node.js 中间件 `res.success()` / `res.fail()` / Rust `IntoResponse` 实现。

前端解析：`code === 0 → resolve(data)`；`code !== 0 → reject({ code, message })`。

## 三、全局错误码（error-code-spec，单一事实来源）

- 后端 init/module-skill **禁止内联错误码表**，必须引用本文件
- 前端 `ERROR_CODE_MAP` 必须与本表对齐
- 新增错误码只能**追加**，不得修改已有错误码的含义

| code | 含义 | HTTP | 触发场景 |
|------|------|------|---------|
| `0` | 成功 | 200 | 业务正常 |
| `-1001` | 参数校验失败 | 400 | 必填缺失、格式错误、Pydantic/JSR303 校验失败 |
| `-1002` | 未授权 | 401 | Token 缺失/无效/过期、用户名或密码错误 |
| `-1003` | 禁止访问 | 403 | 权限不足（预留，未实现 RBAC 时可复用 -1002） |
| `-1004` | 资源不存在 | 404 | 用户/数据/记录未找到 |
| `-1005` | 资源冲突 | 409 | 用户名已存在、旧密码错误、重复提交、唯一约束冲突 |
| `-1006` | 请求过于频繁 | 429 | 限流触发（预留） |
| `-1031` | 请求体过大 | 413 | 上传超过 `UPLOAD_MAX_SIZE` |
| `-1032` | 不支持的文件类型 | 415 | MIME 不在白名单 |
| `-2000` | 系统异常 | 500 | 未捕获异常、未知错误 |
| `-2001` | 数据库异常 | 500 | 连接失败、查询超时（禁止暴露 SQL 细节） |
| `-2002` | 第三方服务异常 | 502 | 外部 API 调用失败、支付网关异常 |

**分段**：业务错误 `-1001`~`-1099`；上传 `-1031`~`-1039`；系统 `-2000`~`-2099`；模块扩展 `-3001`~`-3999`（各 module 自定义，如 payment `-3001` 支付创建失败、`-3002` 回调签名无效；notification `-3001` 短信发送失败；storage `-3001` 存储服务不可用）。

前端 `ERROR_CODE_MAP`（须与本表对齐）：

```typescript
export const ERROR_CODE_MAP: Record<string, string> = {
  UNAUTHORIZED: '登录已过期，请重新登录',
  FORBIDDEN: '权限不足',
  TIMEOUT: '请求超时，请检查网络',
  NETWORK_ERROR: '网络异常，请稍后重试',
  '-1001': '参数校验错误',
  '-1002': '未登录或 Token 无效',
  '-1003': '无权限',
  '-1004': '资源不存在',
  '-1005': '资源冲突',
  '-1006': '请求过于频繁',
  '-1031': '文件过大',
  '-1032': '不支持的文件类型',
  '-2000': '系统繁忙，请稍后再试',
};
```

## 四、JWT 鉴权（jwt-auth-spec）

```
Authorization: [REDACTED]
```

载荷字段：`sub`（用户名）/ `uid`（用户 ID）/ `type`（`access` | `refresh`）/ `iss`（项目名）/ `iat` / `exp`（Unix 时间戳）。

| Token | 有效期 | 用途 |
|-------|-------|------|
| access_token | 3600s（1 小时） | 接口鉴权 |
| refresh_token | 604800s（7 天） | 刷新 access_token |

接口鉴权规则：`/health` 与 `/auth/*`（除 logout/me）与 SSE 公开 `/sse/chat` 免鉴权；SSE 受保护 `/sse/chat/protected` 可经 URL 参数 `?token=` 传递（SSE 不支持自定义 Header）；上传 `/upload` 需鉴权（`none` 数据库模式下可选）；其余默认需要。

刷新流程：401 → `POST /auth/refresh { refreshToken }` → 重试原请求（自动）；前端维护刷新队列，多个并发 401 只触发一次刷新。

各语言实现统一 **HS256**：Java jjwt 0.12.x / Python python-jose、PyJWT / Go golang-jwt/jwt v5 / Node.js jsonwebtoken / Rust jsonwebtoken crate；密钥经 `JWT_SECRET` 注入。

## 五、分页（pagination-spec）

请求参数：`page`（从 1 起，默认 1）、`pageSize`（默认 20，**上限 100** 超限截断，最小 1）。四栈统一 camelCase `page` + `pageSize`，禁用 `page_size` / `per_page`。

响应（`data` 内）：`{ list, total, page, pageSize }` 四字段必备。

```typescript
// GET /api/users?page=1&pageSize=20
const { data } = await get<PaginatedResponse<User>>('/users', { page: 1, pageSize: 20 });
```

## 六、api-contract 模板与契约规范

### 6.1 契约红线（前端强制对齐）

1. **唯一事实来源**：前端所有接口路径、请求参数、响应字段、枚举值、错误码以 `api-contract.md` 为准。
2. **不可绕过**：前端不得硬编码契约未声明的字段/枚举/路径；后端未声明的字段视为不存在。
3. **变更同步**：后端接口变更必须先更新契约再通知前端；前端不得在未更新契约时适配新字段。
4. **枚举强约束**：枚举值集合是闭集，前端必须用契约列出的值，不得新增、不得修改文案。
5. **类型强约束**：字段类型必须与契约一致；禁止隐式转换后上传（如 number 当 string）。
6. **必填强约束**：必填字段必须上传且非空；可选字段可省略，省略时不得传 `null`（除非契约允许）。
7. **响应信封强约束**：前端必须读 `code` 判断业务状态，禁止用 HTTP 状态码判断业务成功/失败。
8. **错误处理强约束**：按错误码表处理每种错误，未列出的按「系统繁忙」兜底。

### 6.2 契约文档结构（固定顺序）

`# {PROJECT_NAME} API Contract` → 1 基础信息 → 2 统一响应格式 → 3 **枚举字典** → 4 接口清单 → 5 数据模型 → 6 错误码汇总 → 7 变更记录。

- 基础信息：Base URL（dev）`http://localhost:{{APP_PORT}}/api`、API Prefix `/api`、鉴权 `Authorization: Bearer`、Content-Type `application/json`（上传 `multipart/form-data`）、时区 UTC（ISO 8601，如 `2026-07-10T08:00:00Z`）、分页默认 `page=1`/`pageSize=20` 且 `pageSize ≤ 100`。
- **枚举字典**：所有枚举字段集中此节声明，接口中只写枚举名。枚举值闭集、值稳定（新增须记变更记录）、文案可本地化但值不可变、整型枚举必须逐值标注含义（如 `0=未知, 1=男, 2=女`）、能用布尔表达的不用枚举。
- `data` 永远存在（无数据为 `null`）；分页 `data` 必为含 `page/pageSize/total/list` 的对象。

### 6.3 默认基础接口（init-skill 生成起点）

| 接口 | 鉴权 | 要点 |
|------|------|------|
| `GET /api/health` | 否 | `data: { status: 'ok', service: <项目名> }` |
| `POST /api/auth/register` | 否 | username 4-64 唯一 / password 6-128 / nickname 1-64 / email / phone；响应 `{ accessToken, refreshToken, tokenType: 'Bearer', expiresIn }`；错误码 `-1001` `-1005` |
| `POST /api/auth/login` | 否 | `{ username, password }`，响应同 register；`-1002` |
| `POST /api/auth/refresh` | 否 | `{ refreshToken }`，响应同 register；`-1002` |
| `POST /api/auth/logout` | 是 | JWT 无状态无业务逻辑，客户端清 token |
| `GET /api/auth/me` | 是 | 响应当前用户信息对象 |
| `POST /api/upload` | 是 | `multipart/form-data` 字段 `file`；响应 `{ url, filename, size, mimeType }`；`-1031` `-1032` |
| `POST /api/uploads` | 是 | 多文件字段 `files`，响应数组 |
| `GET /api/sse/chat` | 否 | `text/event-stream` |

### 6.4 版本锁定（versions.md）

生成项目附 `versions.md`：运行时（JDK/Node/Python/Go）、Web 框架（Spring Boot/Express/FastAPI/Gin）、数据库与中间件（DB/Redis/Kafka）各一行版本 + 选择时间/原因。**版本现场查官方源最新稳定版**（Adoptium、Spring Initializr、Maven Central 等），不在本规范锁死。升级版本须同步更新 versions.md、Dockerfile、docker-compose.yml、CI/CD 配置。

## 七、模块接口输出规范（module-output-spec）

每个 module-skill 的 SKILL.md **必须**包含：① 接口清单表（方法/路径/说明/鉴权/请求体/响应 data）；② 请求/响应数据模型表（字段/类型/必填/校验规则）；③ 错误码扩展（**必须用 `-3xxx` 段**）；④ 目录下 `api-contract-<module>.md` 完整契约文件。

```
springboot-auth-module-skill/
├── SKILL.md                    # 技能定义（含接口清单摘要）
├── api-contract-auth.md        # 完整接口契约（前端消费）
└── README.md                   # 人类使用说明
```

与 init-skill 的关系：init 生成基础接口（health/auth/upload/sse），module 追加业务接口（`/api/xxx/*`）；共享同一套信封与错误码；最终 `api-contract.md` = init 基础 + 各 module 追加。

## 八、环境变量（env-config-guide）

所有可配置项经环境变量注入，禁止硬编码密码/端口/数据库地址。

| 组 | 变量 | 要点 |
|----|------|------|
| 服务 | `APP_NAME` / `APP_PORT` / `APP_ENV`（development/staging/production）/ `APP_LOG_LEVEL` | — |
| 数据库 | `DB_TYPE`（postgres/mysql/mongodb；Python 方言 `postgresql`、`mysql+pymysql`）/ `DB_HOST` / `DB_PORT`（PG 5432、MySQL 3306、Mongo 27017）/ `DB_NAME` / `DB_USER`（MySQL 官方镜像禁 root，用 `app`）/ `DB_PASSWORD` / `DB_PREFIX`（表前缀）/ `DB_URL`（可选完整连接串；Mongo 必填 `mongodb://host:27017/<db>`） | — |
| JWT（四栈统一） | `JWT_SECRET`（必填；生产经密钥管理注入，本地可 `change-me` 占位）/ `JWT_EXPIRES_IN`（**单位统一秒**，默认 86400；各栈禁止另造毫秒/分钟变量） | 四栈骨架只认这两个变量名 |
| Redis（可选） | `REDIS_HOST` / `REDIS_PORT`（6379）/ `REDIS_PASSWORD` / `REDIS_DB` | — |
| Kafka（可选） | `KAFKA_BROKERS`（localhost:9092）/ `KAFKA_CONSUMER_GROUP` | — |
| S3（可选） | `S3_ENDPOINT` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` / `S3_BUCKET` | MinIO/S3 |

配置加载：Java `application.yml` `${APP_PORT:8080}` 占位符；Python pydantic `SettingsConfigDict(env_file=".env")`；Node.js `process.env` + 默认值对象；Go `internal/config/config.go`。`.env` 必须 gitignore，仓库只留 `.env.example`。

## 九、项目元文件（生成项目随附）

生成项目随附：`docs/project-guide.md`（介绍 & 拓展性：技术栈/对接前端/接口范式/拦截器/出入参）、`CLAUDE.md`（简短红线 + 重定向 AGENTS.md）、`AGENTS.md`（详细规范入口）。模板为源仓库 `backend-convention-skill/references/` 下 `project-guide-template.md`、`claude-md-template.md`、`agents-md-template.md`（源仓库有配套模板，路径即此处，用途：生成项目元文件的起点）。

## 十、未收录引用

- 引用私有技能处（如 universal-login-api 相关桥接）标注「（源仓库私有技能，未收录）」：
  `vue-admin-skill` · `sse-agent-skill` · `universal-identity-bridge-skill` · `universal-login-bridge-skill`
