<!-- 来源: jiushiwon/wg-skills @ 3b93743 (Apache-2.0)，有修改；详见 ../NOTICE.md -->
# FastAPI（Python）后端规范

> 合并转写自 wg-skills 的 20 个技能：`python-fast-skill`、`fastapi-init-skill`，
> `fastapi-module/` 下 15 个模块技能（auth / ai-chat / agent / alipay-pay / dict / log /
> notification / org-permission(废弃) / payment / storage / upload / wechat-pay / ws /
> python-kafka / python-redis），以及 `fastapi-qr-login-skill`、`article-generator`、`hot-trend-collector`。
> 规则实质保留原文；触发词 / frontmatter / 安装说明 / 营销叙述已剥离。

**分层**：`backend/shared/`（公共契约层，**唯一事实来源**）→ `fastapi-init-skill`（骨架）→
`fastapi-*-module-*`（叠加式业务模块）。
**响应信封 / 错误码表 / JWT 规范 / 分页约定 / `api-contract.md` 模板的唯一定义处是 `conventions.md`**，
本文件只写「Python 侧如何落地」。Python 与 Java（`java-springboot.md`）两套实现**接口路径、字段命名、
响应结构必须逐字一致**，以便前端一套 API 同时对接两端。

---

## 一、红线（不可绕过）

1. **不做 `python-backend-skill` 已做的事**——不重复生成同样的骨架代码，本 skill 生成的是更完整、
   更小白友好的版本（额外含 SSE、上传、一键脚本、环境探测）。
2. **不硬编码版本号**——Python / FastAPI / 依赖版本一律现场查询官方源最新稳定版。
3. **不跳过环境探测**——生成前先检查用户环境，无法安装则给明确提示。
4. **不强制安装系统级数据库**——有 Docker 则可自动拉起开发库容器；否则只提供 Docker 命令。
5. **不替用户提交 git**。
6. **生产默认值必须安全**——Dockerfile 非 root 运行、安全头中间件强制开启、`.env.example` 对
   `JWT_SECRET` / `CORS` / `APP_DEBUG` 有醒目警告。
7. **所有注释、文档用中文**。
8. **接口契约必须和 `frontend-request-skill` 对齐**——响应信封、错误码、字段命名前后端一致。
9. **`.env` 与 `.gitignore` 必须随脚手架生成，且 `.env` 配置必须被服务加载**——`app/config.py` 通过
   Pydantic Settings 读取 `.env` 全部配置，禁止硬编码端口 / 数据库密码 / JWT 密钥 / 上传路径等运行时可变参数；
   `.gitignore` 必须忽略 `.env` 及 `.env.*.local` 等敏感文件。
10. **模块不重复生成骨架基础设施**（JWT、统一响应、SQLModel/SQLAlchemy、分页、目录结构）。
11. **分页字段名固定 `list`**（不是 `items` / `records` / `content`），`page` 从 **1** 开始。
12. **禁止实体直接作为入参/出参**，一律 Pydantic Schema。
13. **所有删除为软删除**（`deleted_at`）。
14. **错误码一律负数业务码**，**HTTP 状态码始终 200**。

---

## 二、骨架（fastapi-init-skill）

面向**完全不懂编程的小白**，一键生成开箱即用的 FastAPI Web 服务骨架。

### 2.1 与 `python-backend-skill` 的分工

| 维度 | python-backend-skill | 本 skill |
|------|---------------------|----------|
| 目标用户 | 后端开发者 | **零基础小白** |
| 环境安装 | 用户自己装 | **自动检测 + 自动安装** |
| 启动方式 | 手动 uvicorn | **一条命令：`./restart.sh [dev\|prod]`** |
| SSE / 文件上传 | 无 | **内置** |
| 默认数据库 | PostgreSQL | **MySQL**（可选 PG / MongoDB / 无数据库） |
| 脚本 | 无 | **只生成 `restart.sh` / `restart.bat`（dev/prod 双模式）** |
| Swagger | 有 | 有 + **增强中文说明** |
| 交互次数 / 文件数 | 多个技术问题 / ~40 | **最多 3 个问题 / ~22** |

### 2.2 生成流程（五步）

**① 只问 3 个问题**：① 项目名（默认 `my-fastapi-app`）；② 数据库
（`A. MySQL` 默认推荐 / `B. PostgreSQL` / `C. MongoDB` / `D. 不用数据库`）；③ 是否需要 Redis（默认不需要）。
**不做**：不问技术细节、不问版本号、不问目录结构——全部自动选最佳实践。

**② 环境探测**：检测操作系统（Linux/macOS/Windows）→ 检测 Python 版本（**需 >= 3.9**）→
检测 pip 是否可用 → 检测虚拟环境（已有则询问是否重建）→ 安装依赖
（`pip install -r requirements.txt`）。环境不满足时给中文提示 + 下载链接 + 安装指引。

**③ 按序生成**：目录结构 → `requirements.txt` + `.env.example` + `.env` + `.gitignore` →
核心模块（`main.py` / `config.py` / `database.py` / `response.py` / `exceptions.py` / `dependencies.py`）→
业务模块（`models` → `schemas` → `services` → `routers`）→ `restart.sh` / `restart.bat` →
Docker 配置（`Dockerfile` + `docker-compose.yml` / `.pg.yml` / `.mongo.yml`，按需启用）→
`api-contract.md` + `docs/project-guide.md` → `README.md`。

**④ 自动安装与验证**：`python -m venv venv` → 从 `.env.example` 复制 `.env`（如不存在）→
`pip install -r requirements.txt` → 编译检查 `python -m compileall app` → 检测数据库可用性
（有 Docker 则自动启动容器）→ 提示运行 `./restart.sh [dev|prod]`。

**⑤ 交付清单**：文件数（约 18 个）、启动方式、Swagger 地址、SSE / 上传示例 curl、
默认账号接口、以及「请编辑 `.env` 修改 `JWT_SECRET`」安全提醒。

### 2.3 生成项目目录结构

```
{{PROJECT_NAME}}/
├── app/
│   ├── __init__.py · main.py（lifespan/CORS/异常/中间件/路由注册）· config.py（Pydantic Settings）
│   ├── database.py（SQLAlchemy async / Motor）· response.py（EnvelopeRoute）· exceptions.py
│   ├── dependencies.py（get_db、get_current_user）
│   ├── routers/ health · auth · users · sse · upload
│   ├── models/ user.py          # SQLAlchemy ORM 或 Pydantic Document
│   ├── schemas/ user.py · upload.py
│   ├── services/ user.py · upload.py
│   └── utils/security.py        # JWT 签发/验证 + bcrypt 哈希
├── alembic/              # 迁移（仅关系型 PG/MySQL）：env.py · script.py.mako · versions/
├── tests/                # conftest.py（pytest 异步客户端 fixture）· test_health.py
├── docs/project-guide.md # 项目指南（强制交付物）
├── restart.sh · restart.bat · requirements.txt · .env.example · .env · .gitignore
├── Dockerfile · docker-compose.yml / .pg.yml / .mongo.yml
├── api-contract.md       # 接口契约（强制交付物）
├── versions.md · CLAUDE.md · AGENTS.md · README.md · pyproject.toml
```

> 最后一行 6 项为扩展模板或元文件，canonical 生成器 `scripts/generate_project.py` 不默认生成；
> 核心运行代码以 `references/skeleton.md` 为准。

**核心约定**：路由前缀 `/api`；认证路由 `/api/auth/*`；SSE 路由 `/api/sse/*`；
上传路由 `/api/upload`、`/api/uploads`；表前缀 `wg`（`.env` 可改）；端口 **8080**；
Swagger `/docs`、`/redoc`；健康检查 `GET /api/health`。

### 2.4 技术栈与依赖

| 组件 | 用途 | 版本策略 |
|------|------|---------|
| Python 3.9+ | 运行时 | 自动检测本机版本 |
| FastAPI / Uvicorn | Web 框架 / ASGI 服务器 | PyPI 最新稳定版 |
| SQLAlchemy 2.0 | 异步 ORM（MySQL/PostgreSQL） | PyPI 最新稳定版 |
| Motor | 异步 MongoDB 驱动 | PyPI 最新稳定版 |
| Pydantic v2（+ pydantic-settings） | 数据校验与配置管理 | PyPI 最新稳定版 |
| python-jose | JWT 签发与验证 | PyPI 最新稳定版 |
| passlib[bcrypt] | 密码加密 | PyPI 最新稳定版 |
| sse-starlette | Server-Sent Events | PyPI 最新稳定版 |
| python-multipart | 文件上传解析 | PyPI 最新稳定版 |
| Alembic | 数据库迁移 | PyPI 最新稳定版 |

```
# requirements.txt
fastapi · uvicorn[standard] · pydantic · pydantic-settings · python-dotenv
sqlalchemy[asyncio] · pymysql · aiomysql · asyncpg · motor · cryptography
passlib[bcrypt] · python-jose[cryptography] · sse-starlette · python-multipart
alembic · email-validator · httpx
```

数据库变体：MySQL 用 `pymysql` + `aiomysql` + `cryptography`（MySQL 8.0 默认
`caching_sha2_password` 认证需要 `cryptography`）；PostgreSQL 用 `asyncpg`；MongoDB 用 `motor`。

### 2.5 配置项清单（`app/config.py` 的 Pydantic Settings）

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `APP_NAME` | `{{PROJECT_NAME}}` | 应用名称 |
| `APP_PORT` | `8080` | 监听端口 |
| `APP_DEBUG` | `true` | 调试模式（⚠️ 生产必须 false） |
| `DB_TYPE` | `mysql` | `mysql` / `postgresql` / `mongodb` / `none` |
| `DB_HOST` / `DB_PORT` / `DB_NAME` | `localhost` / `3306` / `app_db` | 连接信息 |
| `DB_USER` / `DB_PASSWORD` | `root` / `root` | 密码 🔴 生产必须修改 |
| `DB_PREFIX` | `wg` | 表前缀 |
| `JWT_SECRET` | `change-me-in-production` | 🔴 生产必须修改 |
| `JWT_EXPIRES_IN` | `86400` | Access Token 有效期（秒，= 24h） |
| `JWT_REFRESH_EXPIRES_IN` | `604800` | Refresh Token 有效期（秒，= 7d） |
| `CORS_ORIGINS` | `*` | 🔴 生产必须指定域名 |
| `UPLOAD_DIR` | `uploads` | 上传保存目录 |
| `UPLOAD_MAX_SIZE` | `10` | 单文件最大大小（MB） |
| `UPLOAD_ALLOWED_TYPES` | `image/jpeg,image/png,image/gif,application/pdf` | 允许的 MIME |

**`database_url` 属性**按 `DB_TYPE` 自动拼接：MySQL `mysql+aiomysql://...?charset=utf8mb4`；
PostgreSQL `postgresql+asyncpg://...`；MongoDB `mongodb://...?authSource=admin`。
也支持直接用 `DB_URL` 完整连接串覆盖分项。

切换数据库：改 `.env` 的 `DB_TYPE` + `DB_PORT` 即可；`DB_TYPE=none` 时**只启用 health / sse / upload
三个路由**（且上传无需登录）；**MongoDB 模式下无 auth/users**（模板仅对 MySQL/PostgreSQL 提供完整用户认证）。

### 2.6 核心模块职责

- **`main.py`**：`lifespan` 异步上下文（启动时初始化数据库 `create_all` 或 `connect_db`，关闭时释放资源；
  启动时若 `settings.jwt_secret == "change-me-in-production"` 打 `⚠️ JWT_SECRET 为默认值！` 警告）；
  中间件注册顺序 **安全头 → 请求日志 → CORS**；异常处理器 `BusinessException` → `-1001` 校验错误 →
  `-2000` 兜底；路由注册 `health`（始终）+ `auth`/`users`（仅当 `DB_TYPE != none`）+ `sse` + `upload`；
  Swagger 自定义中文说明。
- **`database.py`**（SQLAlchemy 变体）：

  ```python
  engine = create_async_engine(settings.database_url, echo=settings.app_debug,
      pool_size=10, max_overflow=20, pool_recycle=3600, pool_pre_ping=True)   # 连接池保活
  async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
  async def get_db():
      async with async_session() as session:
          try: yield session; await session.commit()
          except Exception: await session.rollback(); raise
  ```
  MongoDB 变体用 `AsyncIOMotorClient` + `await client.admin.command("ping")` 探活。
- **`response.py`**：`EnvelopeRoute`（自定义 `APIRoute`）自动包装。规则：handler 返回裸数据 →
  自动包成 `{ code: 0, message: "success", data: ... }`；**非 JSON 响应（SSE、文件下载）自动透传不包信封**；
  异常处理器用 `api_response()` 构造错误信封。
- **`dependencies.py`**：`get_db()` 取 Session / Database；`get_current_user()` 解析 JWT，
  注入 `{ user_id, username }` 字典。**同时读取 `Authorization: Bearer` Header 与 `token` 查询参数，
  优先使用 Header**（供 EventSource 使用）。
- **`utils/security.py`**：`JWTUtil.generate(user_id, username)`（access 24h）/
  `generate_refresh(...)`（refresh 7d）/ `parse(token)`；`hash_password` / `verify_password`
  用 **bcrypt 12 rounds**，密码最小 8 位。

### 2.7 中间件链（完整请求链路）

```
HTTP 请求
 ├─ 1. request_log_middleware   生成 requestId → 记录开始时间（自动过滤敏感路径：auth/password/token/login/register）
 ├─ 2. CORSMiddleware           跨域策略检查
 ├─ 3. 路由匹配
 ├─ 4. Depends 依赖注入链       get_db() → get_current_user() → 其他业务依赖
 ├─ 5. Pydantic v2 校验         失败抛 RequestValidationError
 ├─ 6. Service 层               处理业务 → 返回裸数据
 ├─ 7. EnvelopeRoute            JSON → 包信封；非 JSON（SSE/文件下载）→ 透传
 └─ 8. exception_handler        BusinessException → { code, message, data: null }
                                RequestValidationError → -1001；Exception → -2000 "系统繁忙"
```

**注册顺序决定执行顺序**：先注册的先执行（洋葱模型）。
**默认安全头**（`main.py` 已注册）：`X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、
`X-XSS-Protection: 1; mode=block`、`Referrer-Policy: strict-origin-when-cross-origin`。
**可选中间件**：`MaxBodySizeMiddleware`（超限返回 `{code: -1031, "请求体过大"}`，HTTP 200）、
`slow_request_middleware`（耗时 > 1.0s 打 `logger.warning("慢请求: ...")`）、
基于 IP 的 `rate_limit_middleware`（60s 窗口 100 次，超限返回 `-1030`）、
`GZipMiddleware(minimum_size=1000)`。
**鉴权扩展**：`require_admin` 依赖（`role != "admin"` 抛 `BusinessException(-1003, "无权限")`）；
API Key 认证用 `Header` 注入 `x_api_key` 校验（无效抛 `-1002`）。

### 2.8 JWT 鉴权流程

```
登录：POST /api/auth/login { username, password }
     → 查用户 → bcrypt 验证密码 → 签发 access_token(24h) + refresh_token(7d) → refresh_token 存 DB
     → { access_token, refresh_token }

刷新：POST /api/auth/refresh { refresh_token }
     → 验证有效性 + 是否与 DB 中一致 → 签发新 access + 新 refresh（旧 refresh 作废）

登出：POST /api/auth/logout
     → 清空 DB 中用户的 refresh_token → 旧 refresh 失效
     → access_token 仍有效直到过期（JWT 无状态，无法主动失效）
```

### 2.9 SSE 流式框架

依赖 `sse-starlette`。示例端点：

```python
@router.get("/chat", summary="SSE 流式示例（无需登录）")
async def sse_chat():
    async def event_generator():
        for msg in messages:
            yield {"event": "message", "data": json.dumps(msg)}
            await asyncio.sleep(0.8)
        yield {"event": "done", "data": json.dumps({"status": "complete"})}
    return EventSourceResponse(event_generator())
```

**与 EnvelopeRoute 兼容**：SSE 返回 `text/event-stream` 非 `application/json`，自动透传不被包装。
**认证 SSE**：EventSource API 不支持自定义 Header，Token 走 URL 参数
（`new EventSource('.../api/sse/chat/protected?token=' + token)`），后端 `get_current_user`
同时读 Header 与 query，**优先 Header**。

### 2.10 启动脚本（restart.sh / restart.bat）

| 脚本 | 平台 | 模式 | 热重载 | PID 管理 | 资源限制 | 日志 |
|------|------|------|--------|----------|----------|------|
| `restart.sh` / `restart.bat` | Linux·macOS / Windows | `dev`（默认）/ `prod` | `dev` 开启 | ✅ | `prod` 开启 | `logs/dev.log` / `logs/app.log` |

```
[1/5] 检测 git 仓库，存在则 git pull（失败仅警告）
[2/5] 创建/激活虚拟环境，安装/更新依赖
[3/5] 安全停止旧进程（PID 文件 + 端口兜底扫描释放 APP_PORT）
[4/5] 启动 uvicorn（dev 带热重载 / prod 多 worker + 资源限制）
[5/5] 写入 PID 文件，输出日志查看命令
```

**安全停止旧进程**：读 `app.pid`，若进程仍为 uvicorn/python 则 `kill` 优雅停止；PID 失效时用端口扫描
清理残留进程；清理后等 1 秒确保端口释放。
环境变量：`APP_PORT`（默认 8080）、`APP_WORKERS`（prod worker 数，默认 2）。

### 2.11 Docker 支持

**Dockerfile 多阶段 + 非 root**：builder 阶段 `pip install --no-cache-dir --user -r requirements.txt`
→ 运行阶段 `COPY --from=builder /root/.local /root/.local` →
`RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app` + `USER appuser` →
`CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2",
"--limit-max-requests", "10000", "--limit-concurrency", "100", "--timeout-graceful-shutdown", "30"]`。

**docker-compose**：默认 `docker-compose.yml` 含 app + mysql，app 依赖 mysql `healthy`，
mysql healthcheck 用 `mysqladmin ping`，app healthcheck 打 HTTP `/api/health`；
另有 `.pg.yml` / `.mongo.yml`。

### 2.12 错误码体系

| code | 含义 | 触发场景 |
|------|------|---------|
| 0 | 成功 | 正常响应 |
| -1001 | 参数校验失败 | Pydantic 校验不通过 |
| -1002 | 认证失败 | 未登录 / Token 无效 / 密码错误 / 账号异常 |
| -1003 | 禁止访问 | 已登录但无操作权限 |
| -1004 | 资源不存在 | 用户/数据未找到 |
| -1005 | 资源冲突 | 用户名已存在 / 旧密码不正确 / 重复提交 |
| -1006 | 请求过于频繁 | 限流触发（预留） |
| -1031 | 请求体过大 | 上传超 `UPLOAD_MAX_SIZE` |
| -1032 | 不支持的文件类型 | MIME 不在白名单 |
| -2000 | 系统异常 | 未预期的内部错误 |

> 完整错误码表与分段规则见 `conventions.md`；前端 `frontend-request-skill` 的 `ERROR_CODE_MAP`
> 可直接复用本表。

### 2.13 骨架交付物

| 文档 | 位置 | 说明 |
|------|------|------|
| 项目指南 | `docs/project-guide.md` | 技术栈（FastAPI/SQLAlchemy/SSE/Upload）、目录结构、启动方式、模块开发步骤 |
| 接口契约 | `api-contract.md` | health / auth / users / sse / upload 全量接口 |

**全量接口**：`GET /api/health`、`GET /api/health/db`、
`POST /api/auth/register|login|refresh|logout`、`GET /api/auth/me`、
`GET /api/users`（分页）、`GET /api/users/{id}`、`PUT /api/users/profile`、`PUT /api/users/password`、
`GET /api/sse/chat`（公开）、`GET /api/sse/chat/protected`（需登录）、
`POST /api/upload`（单文件）、`POST /api/uploads`（多文件）。

**后续扩展方向**：密码复杂度校验（Pydantic validator 强制大小写+数字+特殊字符）；基于 Redis 的限流中间件；
操作审计日志；TLS/HTTPS（Nginx / Traefik 反代模板）；K8s 部署模板；
Prometheus 指标（`prometheus-fastapi-instrumentator` 暴露 `/metrics`）；Sentry 异常上报。

---

## 三、模块叠加总则

1. **前置**：已装 `fastapi-init-skill`（提供 JWT、统一响应 `EnvelopeRoute`、SQLModel/SQLAlchemy、
   分页、`BusinessException`），直接复用不重复生成。
   **骨架检测逻辑**：读项目根 `SKILL.md`/`README.md`，或检查标志性文件
   （`app/main.py`、`app/config.py`、`app/response.py`）与 `app/dependencies.py` 是否已有
   `get_current_user`；未检测到骨架则提示「本模块需要先安装 fastapi-init-skill 骨架」，
   用户拒绝安装则终止。
2. **配置**用骨架 `app.config.settings`，**不单独定义配置体系**。
3. **表名**统一 `{prefix}_*`（默认 `wg_`），把 `{prefix}` 占位符替换为用户指定前缀。
4. **迁移**用 Alpine 的 **Alembic**（`alembic upgrade head`；
   生成：`alembic revision --autogenerate -m "描述"`），不手动执行 SQL。
5. **ORM**：关系型用 SQLAlchemy async，模块若用 SQLModel 则与骨架保持一致；**不混用**。
6. **响应**用骨架 `EnvelopeRoute` 自动包装，不手动包 `{ code, message, data }`。
7. **异常**用骨架 `BusinessException`（负数错误码 `-1001` ~ `-2000`）。
8. **用户**用骨架 `get_current_user()`，**禁止硬编码 user_id**。
9. **包名替换**：把 `src.auth` / `app.ws` 等占位 pkg 替换为用户项目的真实包名（如 `app.auth`）。
10. **交付物**：每个模块产出 `api-contract-<module>.md` + `docs/<module>-guide.md`，
    遵循 `backend/shared/module-output-spec.md`；模块自定义错误码只能追加在 **`-3xxx`** 段。
11. **与 Java 版对齐**：接口路径、字段命名、响应结构与 `java-springboot.md` 的同名模块**逐个对齐**，
    前端一套 API 可同时对接两端。

**表设计规范**与 Java 层相同（见 `java-springboot.md`#3.1）：表名 `{前缀}_{snake_case}` 且单词数 ≤ 4；
字段 snake_case；主键 `id`；时间字段 `created_at` / `updated_at`；软删除 `deleted_at`；
状态字段 `status`（0 禁用 / 1 正常）；布尔字段 `is_*` 前缀；索引 `uk_*` / `idx_*`；
**禁止外键级联、禁止 ENUM、禁止魔法数字、禁止无注释字段、禁止 `VARCHAR(255)` 默认值**。

---

## 四、auth 模块（fastapi-auth-module-skill）

**用户问题（最多 3 个）**：包名（默认从骨架推断，如 `app`）、表前缀（默认 `wg`）、
是否需要数据权限（默认需要）。
**能力**：租户 / 组织架构（树形部门，`parent_id` 递归）/ 岗位 / 用户（SysUser，扩展基础 User 关联
租户·部门·岗位·角色）/ 角色（数据权限范围）/ 菜单·权限（树形 + `permission`）/ 角色-菜单绑定 /
用户-角色绑定 / 数据权限 / 个人鉴权（登录·登出·改密·当前用户详情·菜单树）/ 接口契约。

```
src/auth/
├── constants.py（权限常量）· enums.py（数据权限枚举）· dependencies.py（权限校验依赖）
├── schemas.py · models.py（SQLModel）
├── routers/  auth（登录/登出/当前用户/菜单树）· users · roles · menus · orgs · posts · tenants
└── services/ auth_service · user_service · role_service · menu_service · org_service
              post_service · tenant_service · data_scope（数据权限过滤）
alembic/versions/auth_module.py · api-contract-auth.md · docs/auth-module-guide.md
```

> v1.2.0+ 所有路由与服务层代码已补充完整，复制到项目后直接可用。

**数据权限（四级）**：`ALL` 全部数据（超管）/ `DEPT_ONLY` 本部门（部门经理）/
`DEPT_AND_BELOW` 本部门及以下（区域负责人）/ `SELF_ONLY` 仅本人（普通员工）。

**生成流程**：确认骨架存在 → 询问包名/表前缀/数据权限 → 按 `references/skeleton.py` 生成 `auth/`
全部源码（替换 `{prefix}` 与 `src.auth` 占位符）→ 生成 `api-contract-auth.md` 与
`docs/auth-module-guide.md` → 提示用户 `alembic upgrade head` 初始化表、建议用 `SysUser` 替换或扩展
原 `User` 模型、重启后访问 `/api/auth/menus` 取菜单树。

**接口契约要点**：

- 登录 `POST /api/auth/login` → `{ accessToken, refreshToken, tokenType, expiresIn }`。
- **字段命名一律 camelCase**，与 `springboot-auth-module-skill` 逐字对齐。
- **错误码一律负数业务码**（`-1001` 参数错 / `-1002` 未登录 / `-1003` 无权限 / `-1004` 资源不存在 /
  `-1005` 数据权限越界 / `-2000` 系统异常），**HTTP 始终 200**。
- **Python 实现要求**：所有 Pydantic 模型必须
  `model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)`，
  兼容**入参 snake_case / 出参 camelCase**。
- `GET /api/auth/me` → 用户 + 角色 + 部门 + 岗位；`GET /api/auth/menus` → 当前用户可见树形菜单。
- 用户、角色、菜单、部门、岗位：标准分页 CRUD。

**红线**：① 不重复生成 FastAPI 基础骨架；② 表名统一 `{prefix}_sys_user`、`{prefix}_sys_role` 等，
遵循 `database-design-skill` 规范；③ 所有删除为软删除（`deleted_at`）；④ 菜单树用 `parent_id` +
`sort_order`，禁止嵌套集合；⑤ **接口鉴权先走 FastAPI 依赖注入 JWT 校验，再走角色-菜单权限校验**；
⑥ 所有注释、文档用中文。
**与 `java-auth-module-skill` 对齐**：接口路径、字段命名、响应结构完全一致。
**后续迭代**：岗位数据权限、自定义数据权限规则；OAuth2 / SSO 接入。

---

## 五、ws 模块（fastapi-ws-module-skill）

**用户问题（最多 3 个）**：包名（默认 `app`）、表前缀（默认 `wg`）、是否需要群聊（默认不需要，先做单聊）。
**定位**：自建轻量 IM 方案，适合小中规模，**不依赖第三方 IM 服务**。
**能力（10 项）**：WebSocket 长连接（`WS /api/ws?token=<jwt>`，query 参数鉴权，**多端登录**，
PC/手机/Web 同时在线）/ 单聊消息（文本·图片·语音实时投递，在线直推、离线入库）/ 好友校验
（仅允许已通过好友互发，避免陌生人骚扰）/ 消息幂等（客户端传 `client_msg_id`，网络抖动重发不重复入库）/
离线消息（上线时自动推送未送达消息，**最多 100 条**）/ 未读数（支持清零 + 实时通知对方）/
会话列表（最近会话排序 + 最后一条消息预览）/ 聊天记录（基于 cursor 翻页）/ 消息状态
（未读 → 已送达 → 已读 三态）/ 接口契约。

```
app/ws/
├── manager.py（连接管理器，多端登录）· heartbeat.py（心跳保活，任何消息都算心跳）
├── handler.py（消息路由：好友/幂等/校验/落库/推送）· friend.py · validators.py · offline.py
├── models/  message.py（{prefix}_chat_message）· conversation.py（{prefix}_chat_conversation）
│            friend.py（{prefix}_user_friend）
├── schemas/ message.py · conversation.py（含 MarkReadRequest）
├── services/ message_service.py · conversation_service.py
└── routers/ ws.py（/api/ws）· chat.py（REST）· friend.py（可选兜底）
alembic/versions/ws_module.py · api-contract-ws.md · docs/ws-module-guide.md
```

### 5.1 连接与鉴权

```
WS /api/ws?token=<jwt_access_token>
```

> **为什么用 query 参数而不是 URL 路径？** token 放在路径里（`/api/ws/{token}`）会被 Nginx/网关
> access log 完整记录 → 泄漏 JWT。query 参数虽也会进日志，但更易于在网关层做脱敏
> （`set $token_log "***"`）。浏览器原生 WebSocket 不支持自定义 Header，所以 query 参数是
> FastAPI 生态的事实标准。

- 连接成功：服务端返回 `{"type":"connected","user_id":123}`。
- 连接失败：返回 `{"type":"error","code":-1002,"message":"未授权"}` 并关闭连接（**code 4001**）。

### 5.2 心跳与断线

```
客户端 → 服务端：{"type":"ping"}        服务端 → 客户端：{"type":"pong"}
```

- 客户端每 **30 秒**发一次 ping，服务端收到后立即回 pong。
- **任何业务消息（chat / ack / read）也算心跳**，不强制每 30s 必须 ping
  （避免「用户在聊天时因为忘了 ping 而被踢」的反直觉体验）。
- 服务端定时检查（每 10s）：`now - last_active_time > 60s` 则主动断开（**code 4002**），
  多端登录场景断开该用户所有连接。
- 客户端未收到 pong 判定连接异常，触发重连。

> 需要心跳的原因：中间代理/Nginx 通常有 **60s 超时**；运营商 NAT 映射表有 **300s 超时**；
> 客户端网络切换（WiFi→4G）不会触发 close 事件。

### 5.3 消息协议

**客户端 → 服务端**：

| type | 说明 | 必填字段 |
|------|------|----------|
| `chat` | 发送聊天消息 | `to`、`client_msg_id`、`msg_type`、`content` 或 `image_url` 或 `voice_url` |
| `ping` | 心跳 | 无 |
| `ack` | 确认收到消息 | `msg_id` |
| `read` | 标记对方会话已读 | `peer_id` |

**服务端 → 客户端**：

| type | 说明 | 字段 |
|------|------|------|
| `connected` | 连接成功 | `user_id` |
| `chat` | 收到聊天消息（实时） | `from`、`msg_id`、`msg_type`、`content/image_url/voice_url`、`client_msg_id`、`timestamp` |
| `offline` | 离线消息 | 同 chat |
| `ack` | 消息送达/已读回执 | `msg_id`、`status`、`client_msg_id` |
| `read` | 对方标记我已读 | `from`、`peer_id` |
| `pong` | 心跳回复 | 无 |
| `error` | 错误 | `code`、`message` |

`type` 为 string 必填；`to` 为 integer（chat 必填）；`client_msg_id` 为 string（chat 必填，**8-64 字符**）。

```json
{"type":"chat","to":456,"msg_type":1,"content":"你好","client_msg_id":"cli-1724912345-abc123"}
{"type":"chat","to":456,"msg_type":2,"image_url":"https://cdn.example.com/.../abc.png","client_msg_id":"..."}
{"type":"chat","to":456,"msg_type":3,"voice_url":"https://cdn.example.com/.../abc.mp3","voice_duration":12,"client_msg_id":"..."}
```

### 5.4 接口清单

```
WS   /api/ws?token=<jwt>          WebSocket 长连接（token 走 query，避免被代理日志记录）
GET  /api/chat/history            聊天记录（cursor 翻页）          Bearer
GET  /api/chat/conversations      会话列表                          Bearer
GET  /api/chat/unread             未读消息总数                      Bearer
POST /api/chat/read               标记已读（body {"peer_id": 123}） Bearer
POST /api/chat/messages           REST 备用发消息（Webhook/客服系统） Bearer
POST /api/friend/request          发起好友申请                      Bearer（可选）
POST /api/friend/review           通过 / 拒绝好友申请                Bearer（可选）
GET  /api/friend/requests         收到的好友申请列表                 Bearer（可选）
GET  /api/friend/list             好友列表                          Bearer（可选）
DELETE /api/friend/{friend_id}    删除好友                          Bearer（可选）
POST /api/friend/{friend_id}/block 拉黑好友                         Bearer（可选）
```

> 好友 REST 接口（`/api/friend/*`）是**可选**的。项目若已装 `fastapi-auth-module-skill`，由它提供；
> 本模块只提供兜底实现，让没装 auth-module-skill 的项目也能独立运行。

**生成流程**：确认骨架 → 询问包名/表前缀/群聊 → 按 `references/skeleton.py` 生成 `ws/` 全部源码
（替换 `{prefix}` 与 `app.ws` 占位符）→ 生成 `api-contract-ws.md` 与 `docs/ws-module-guide.md` →
**在 `app/main.py` 注册 WebSocket 路由** → 提示重启后用 WebSocket 客户端测试连接。

---

## 六、AI 模块（合并 agent + ai-chat 两个技能）

> 源仓库有两个 AI 技能：`fastapi-agent-module-skill`（**LangGraph** 实现）与
> `fastapi-ai-chat-module-skill`（**OpenAI/Claude SDK 直连**实现）。两者能力矩阵与接口路径一致
> （`/api/agent/*`），且都与 Java 版 `springboot-agent-module-skill` 对齐，可按项目复杂度二选一。

**共同用户问题（最多 3 个）**：用什么模型（默认 OpenAI `gpt-4o-mini`，可选 Claude/Anthropic/
DeepSeek/Ollama 本地模型）；需要哪些内置 Tool（默认：查用户信息、查角色、查菜单、查组织）；
是否开启历史消息（默认开启，保留 20 轮）。

**共同对接规范**：用骨架 `settings` 配置系统（不单独定义配置）；用骨架 `EnvelopeRoute` 统一响应；
用骨架 `BusinessException` 异常处理；用骨架 `db_prefix` 表前缀；用骨架 `database.get_session`；
用骨架 `auth.dependencies.get_current_user` 鉴权；在 lifespan 中初始化 `AgentContainer`
并通过 `app.state.agent` 注入。

**核心能力（13–14 项）**：Agent 工作流（LangGraph 节点可扩展 / OpenAI·Claude SDK Function Calling）/
声明式 Tool（Pydantic 参数校验 + 自动权限注入）/ 统一模型接口（OpenAI·Claude·DeepSeek·Ollama +
tenacity 退避重试）/ 多轮对话（会话级历史 + LRU 内存缓冲）/ 对话管理（软删除 + 级联硬删除）/
租户隔离 / SSE 流式（断连检测 + 代理缓冲禁用）/ Rate Limiting（每用户 10 次/分钟，防 LLM 财务风险）/
独立审计 logger / 异常脱敏 / 迁移自动创建关键索引 / 单事务写入无幽灵消息 / 测试基建（20+ 安全一致性性能测试）/
Token 统计与限额 / PII 加密 / trace_id 追踪 / 模型白名单。

**内置 Tools（全部带 `current_user_id` 强制注入）**：

| Tool | 功能 | 参数 | 权限 |
|------|------|------|------|
| `get_user_info` / `get_user_roles` / `get_user_menus` | 当前用户信息（脱敏）/ 角色 / 菜单 | current_user_id（系统注入） | 仅查自己 |
| `search_users` | 搜索用户（脱敏：ID/用户名/昵称） | keyword?, limit ∈ [1,50] | 限流 |
| `get_org_tree` / `get_org_detail` | 当前租户组织架构树 / 部门详情 | current_user_id（+ org_id） | 租户隔离 |
| `get_post_list` | 当前租户岗位（分页） | current_user_id, status?, page?, page_size ∈ [1,50] | 租户隔离 |
| `get_tenant_info` | 当前用户所属租户 | current_user_id | 仅查自己 |
| `safe_read_file` | 读取项目内受限文本文件 | path, max_size?, current_user_id | 路径白名单 + 大小 + UTF-8 + 审计 |
| `safe_write_file` | 写入项目内文件 | path, new_content, confirm, current_user_id | diff 预览 + 白名单 + 大小 + 审计 |

**文件 Tools 四重防护**：路径白名单（仅 `PROJECT_ROOT` 下，拦截 `/etc` `/root` `~/.ssh` `/var/log`）、
大小限制（读默认 100KB、写默认 1MB）、编码限制（仅 UTF-8 文本）、审计日志。
必须设置环境变量 `PROJECT_ROOT`；容器化建议 `docker run -e PROJECT_ROOT=/app -v $(pwd):/app your-image`；
不设置则默认当前工作目录（开发模式）。**写文件必须两步**（`confirm=false` 返回 diff 预览不落盘，
`confirm=true` 二次调用才真正写入）。
> ⚠️ 严禁把 `PROJECT_ROOT` 设为 `/`、`/home` 等宽泛目录。

**Agent 工作流**：用户输入 → Agent State 初始化（`user_id` 注入）→ LLM 生成思考 + Tool Call →
**并发执行 Tools（`asyncio.gather`，`user_id` 强制注入防越权）** → Tool 结果用
`<tool_result name="...">` XML 标签包裹（防 Prompt Injection）→ LLM 总结 → 流式返回（含断连检测）→
单事务持久化用户消息 + 助手消息。

**模块结构（agent 版）**：

```
src/agent/
├── audit.py（结构化审计）· rate_limiter.py（slowapi + 降级 token bucket）· schemas.py · models.py
├── migration.py（Alembic，含 5 个关键索引）· database.py（适配 3 级 import 路径）
├── graph/  agent.py（AgentContainer 依赖注入容器 + 加锁懒加载）· nodes.py（Tool 并发 + XML 隔离）
│           state.py
├── tools/  base.py（Pydantic 校验 + 异常脱敏 + 审计）· user_tools.py · org_tools.py
│           file_tools.py · registry.py（线程安全注册表）
├── llm/    base.py · openai.py · anthropic.py（tenacity 重试 + timeout）
├── memory/ buffer.py（deque 自动裁剪）· store.py（DI 工厂 + LRU + 显式清空）
└── routers/ chat.py · session.py · tools.py
tests/ test_tool_validation.py · test_message_security.py
api-contract-agent.md · docs/deployment-guide.md（多 Worker 部署指南）
```

**安全要点（P0/P1/P2 修复后）**：

- **会话归属校验**：每个 `session_id` 操作都校验 `user_id == session.user_id`，跨用户访问返回 `-1001`；
  历史消息加载用 **SQL JOIN 同时校验归属**。
- **Tool 权限注入**：LLM 无法通过 `arguments` 篡改 `current_user_id`，系统通过
  `Tool.execute(user_id=...)` 显式注入；**`current_user_id` 参数必须无默认值**。
- **Tool 参数 Pydantic 校验**：自动从函数签名推导类型，int 范围 / str 长度 / bool 枚举边界自动校验；
  失败抛 `ValidationError`，客户端收到友好错误。
- **异常脱敏**：客户端只收固定话术（「对话处理失败，请稍后重试」），SSE error 事件不含堆栈；
  Tool 错误返回「工具执行失败，请重试」；真实异常写 `logger.exception()`。
- **日志脱敏**：Tool 日志只记参数名 + 类型不记值
  （`logger.info(f"执行 Tool: {name}, 参数签名: {args_meta}")`）。
- **审计日志**：独立 logger `agent.audit`，记录
  tool_call / tool_failure / chat_failure / token_usage / rate_limit_hit，
  字段 `user_id`、`session_id`、`tool_name`、`args_hash`（SHA256）、`success`、`error`。
- **限流**：`slowapi`（生产推荐）+ in-memory token bucket（降级）；chat 接口 **10 次/分钟**，
  session 接口 **30 次/分钟**；命中记审计 + **429** 响应。
- **事务一致性**：`chat()` 用 `_save_messages_atomic` 单事务保存；流式接口用
  `first_chunk_received` 标志保证只有首个 token 到达才保存用户消息。
- **SSE 断连检测**：流式循环中检查 `await request.is_disconnected()`，客户端断开立即终止 LLM 流，
  避免 token 计费继续；整体 `asyncio.wait_for(coro, timeout=120)` 包裹 `_chat_inner`，
  超时返回 `ChatErrorCode.TIMEOUT = -5003` + 友好话术。
- **多租户隔离**：`org_tools` 全部 Tool 必须传 `current_user_id`，通过 user 查 `tenant_id`，
  按 tenant 过滤 Org/Post；跨租户返回错误。
- **Prompt Injection 防护**：Tool 结果用 `<tool_result>` 包裹；System Prompt 明确说明
  `tool_result` 内是数据不是指令。
- **数据库索引（`migration.py`）**：`ix_*_session_user_updated`（list_sessions 排序）、
  `ix_*_session_user_deleted`（软删除过滤）、`ix_*_session_user_id`（归属校验）、
  `ix_*_message_session_created`（历史加载）、`ix_*_message_session_role`（按角色过滤）。
- **LLM 调用可靠性**：`AsyncOpenAI/Anthropic` 显式 `timeout=60s`；tenacity 指数退避重试
  （最多 3 次，retry `RateLimitError`/`Timeout`/`ConnectionError`）；**异步锁保护懒加载路径**
  （防多 LLM 客户端并发创建）。
- **模型白名单**：`ALLOWED_MODELS = Literal["gpt-4o-mini", "gpt-4o", "gpt-4-turbo",
  "claude-3-haiku-20240307", "claude-3-sonnet-20240229", "claude-3-5-sonnet-20241022"]`，
  客户端无法指定白名单外模型。
- **PII 加密**：`src/agent/pii.py` 提供 `pii_encrypt` / `pii_decrypt` / `mask_pii` / `is_pii_field` /
  `safe_log_args`，Fernet 对称加密（AES-128-CBC + HMAC-SHA256），密钥走 `PII_ENCRYPTION_KEY`；
  Tool 日志自动调 `safe_log_args` 脱敏 password/token/email/phone。
- **记忆裁剪**：`collections.deque(maxlen=max_turns*2)` 实现 O(1) 自动裁剪；
  `_get_session_limit()` 从 `settings.agent_memory_turns` 读取，默认 20 轮（`limit=40`）；
  系统消息单独 deque（不受 `max_turns` 影响）。**移除 `threading.Lock`**（阻塞事件循环），
  改为模块加载时一次性注册。
- **响应硬截断**：`MAX_RESPONSE_CHARS = 50000`（防内存峰值），流式循环中检查长度并 break。
- **分页优化**：`func.count().over()` 窗口函数，items + total 一次往返（替代两次 DB round-trip）；
  `title` 加 `max_length=200`；用 `datetime.now(UTC)`（替代 deprecated `datetime.utcnow()`）。
- **级联删除**：`migration.py` 的 FK 加 `ondelete='CASCADE'`；
  `SessionService.delete_session(hard_delete=True)` 支持级联删除 messages；
  Router 通过 `?hard=true` query 参数触发，避免软删除导致存储膨胀。
- **错误码** `ChatErrorCode` IntEnum：`0 / -1 / -1001 / -1002 / -429 / -5001 / -5002 / -5003 / -5000`；
  SSE 错误事件包含 `error_code` 字段。

**接口清单**：

```
POST /api/agent/chat                        对话（stream=true 流式 / stream=false 同步）
GET  /api/agent/sessions                    会话列表
POST /api/agent/sessions                    创建会话
GET  /api/agent/sessions/{id}               获取会话
DELETE /api/agent/sessions/{id}             删除会话（软删除）
GET  /api/agent/sessions/{id}/messages      获取会话消息
POST /api/agent/sessions/clear-memory       清除会话内存记忆
GET  /api/agent/tools                       可用工具列表
```

**配置扩展**：`AGENT_DEFAULT_MODEL`、`AGENT_TEMPERATURE`、`AGENT_MAX_TOKENS`、`AGENT_MEMORY_TURNS`、
`AGENT_TIMEOUT` 等 Agent 配置；`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`DEEPSEEK_API_KEY` 等 LLM 配置。
**依赖**：`langgraph`（agent 版核心）、`openai` / `anthropic`、`slowapi`（限流）、`tenacity`（重试）、
`cryptography`（Fernet 加密）、可选 `ollama`。
**红线**：不重复生成骨架与 auth 模块；用骨架统一响应 / 异常 / 配置 / 表前缀 / 数据库 / 鉴权；
Tool 必须系统注入 `current_user_id`；异常不返回堆栈；失败必须写审计；模型必须白名单内；
会话操作必须校验归属；中文注释文档。
**不做**：见各源 skill 的「不做」段（不接管骨架职责、不提供前端 UI）。

---

## 七、基础能力模块（dict / log / notification / redis / kafka）

### 7.1 dict 模块（fastapi-dict-module-skill）

**能力**：字典类型 / 字典项 CRUD / 系统配置 / 缓存 / RESTful API。
**表**：`wg_dict_type`（`id`/`name`(100)/`code`(50,唯一)/`description`(500)/`status` 默认 1/时间戳三件套）、
`wg_dict_item`（`id`/`dict_type_id`/`label`(100)/`value`(100)/`sort` 默认 0/`status` 默认 1/时间戳三件套）、
`wg_sys_config`（`id`/`config_key`(100,唯一)/`config_value`(500)/`config_type` 默认 `string`
（`string`/`int`/`json`）/`description`(500)/`status` 默认 1/`created_at`/`updated_at`）。

```
GET|POST        /api/dict/type[/{id}]       字典类型列表 / 详情 / 新增 / 更新 / 删除
GET             /api/dict/item/list         字典项列表
GET             /api/dict/item/{type_code}  根据编码获取字典项（下拉框数据源）
POST|PUT|DELETE /api/dict/item[/{id}]       字典项增删改
GET             /api/config/list            配置列表
GET|PUT         /api/config/{key}           获取 / 更新配置
```

**缓存**：`@lru_cache(maxsize=100)` 装饰 `get_dict_cache(type_code)`；
`refresh_dict_cache(type_code)` 调 `cache_clear()` 刷新。
**不做**：不负责前端页面；不处理敏感配置加密；不提供配置变更审计日志。

### 7.2 log 模块（fastapi-log-module-skill）

**能力**：操作日志 / 登录日志 / 审计追踪 / 分页查询与导出。
**表**：`wg_operation_log`（`id`/`user_id`/`username`(50)/`module`(50)/`operation`(50)/`method`(10)/
`path`(255)/`params`(Text)/`result`(Text)/`ip`(50)/`location`(255)/`duration`(Integer,ms)/`created_at`）；
`wg_login_log`（`id`/`user_id`/`username`/`status`（**1 成功 / 0 失败**）/`ip`/`location`/`user_agent`(500)/
`message`(255)/`created_at`）。

```
GET /api/log/operation/list    操作日志列表
GET /api/log/login/list        登录日志列表
```

**不做**：不负责日志存储；不处理日志分析（ELK 等专门工具）。

### 7.3 notification 模块（fastapi-notification-module-skill）

**能力**：短信（验证码/通知）/ 邮件（HTML·文本·模板）/ 站内消息（系统通知·未读）/ 推送（极光·FCM）/
消息模板管理与渲染。
**依赖**：`aliyun-python-sdk-core`（短信）、`aiosmtpd` + `jinja2`（邮件）、`redis`（站内消息）。
**配置**：`sms_access_key` / `sms_secret_key` / `sms_sign_name` / `sms_template_code`；
`mail_host`（默认 `smtp.qq.com`）/ `mail_port`（默认 `587`）/ `mail_username` / `mail_password`；
`redis_host`（默认 `localhost`）/ `redis_port`（默认 `6379`）。
**表**：`wg_notification`（`id`/`user_id`(50,index)/`title`(200)/`content`(Text)/
`type`(enum `system`·`sms`·`email`·`push`)/`link`(500)/`is_read` 默认 0/`created_at`）；
`wg_sms_code`（`id`/`phone`(20,index)/`code`(10)/`template_code`(50)/`expire_time`/`used` 默认 0/`created_at`）。

**关键实现**：短信走阿里云 `CommonRequest`（`dysmsapi.aliyuncs.com`，version `2017-05-25`，
action `SendSms`）；验证码用 `random.choices(string.digits, k=6)` 生成 6 位，
存 Redis `sms:code:{phone}` 并 `setex(key, 300, code)`（**5 分钟过期**）；
校验成功后 `redis.delete(key)`。邮件用 `aiosmtplib.send(...)` + `MIMEText(content, 'html', 'utf-8')` +
`use_tls=True`。站内消息落库后 `redis.publish(f"notification:{user_id}", json.dumps({...}))` 推送。

```
POST /api/notification/sms/send      发送短信验证码
POST /api/notification/sms/verify    验证短信验证码
POST /api/notification/email/send    发送邮件
POST /api/notification/send          发送站内消息
GET  /api/notification/unread        查询未读消息
```

**不做**：不负责服务商账号配置；不处理复杂推送策略；不提供 UI 代码。

### 7.4 redis 模块（python-redis-module-skill）

**能力**：装饰器缓存 / Redis Session 共享 / 分布式锁 / 接口限流 / Redis Stream 消息发布订阅 / 分布式计数器。
**依赖**：`redis` + `aioredis`。
**`RedisClient` 封装**：`get` / `set(key, value, ex)` / `delete` / `exists` / `expire`；
哈希 `hget` / `hset` / `hgetall`；列表 `lpush` / `rpop`；`incr(key, amount)`；
锁 `lock(key, timeout=30)` 用 `set(f"lock:{key}", "1", nx=True, ex=timeout)`，`unlock` 用 `delete`。
**缓存装饰器**：`@cache("user:info", expire=600)`，key 为 `f"{key_prefix}:{':'.join(str(a) for a in args)}"`，
命中则 `json.loads`，未命中执行后 `set(..., ex=expire)`。
**分布式锁**：`RedisLock.lock(key, timeout=30, retry=3, delay=0.2)` 用
`@asynccontextmanager`，`set(lock_key, "1", nx=True, ex=timeout)` 获取，
重试耗尽抛 `TimeoutError(f"获取锁 {key} 失败")`。
**限流（滑动窗口）**：`zremrangebyscore(window_key, 0, now - window_seconds)` 清过期记录 →
`zcard` 计数 → 超 `max_requests` 返回 False → 否则 `zadd(window_key, {str(now): now})` + `expire`。
**Stream**：发布 `xadd(stream, data)`；消费 `xread({stream: "0"}, count, block)` +
`xack(stream, group, msg_id)` 确认。
**配置**：`REDIS_HOST`（默认 `localhost`）/ `REDIS_PORT`（默认 `6379`）/ `REDIS_PASSWORD` / `REDIS_DATABASE`（默认 0）。
**不做**：不负责安装 Redis；不处理集群配置（单节点为主）；不提供数据迁移工具；**不处理哨兵/主从配置**。

### 7.5 kafka 模块（python-kafka-module-skill）

**能力**：生产者（同步/异步、分区、key）/ 消费者（监听、重试、消费者组）/ JSON 序列化 / 事务消息 /
错误处理。**依赖** `aiokafka`。

- **生产者**：`AIOKafkaProducer(bootstrap_servers, value_serializer=lambda v: json.dumps(v,
  ensure_ascii=False).encode('utf-8'), key_serializer=...)`；`send(topic, value, key)` 同步用
  `send_and_wait` 并返回 `f"{future.topic}-{future.partition}-{future.offset}"`；
  另有 `send_async` / `send_json` / `send_messages`（批量）。
- **消费者**：`AIOKafkaConsumer(*topics, group_id, value_deserializer=lambda m: json.loads(m.decode('utf-8')),
  auto_offset_reset='earliest', enable_auto_commit=False)`；`consume(handler)` 循环中
  `async for msg in consumer` → `await handler(msg)` → **`await consumer.commit()` 手动提交**；
  异常记 `logger.error(f"处理消息失败: {e}")` 并可发死信队列；`consume_batch(handler, batch_size=100)`
  批量消费（收满一批或循环结束处理剩余）。
- **事务消息**：`AIOKafkaProducer(enable_idempotence=True)`；
  `transaction = producer.transaction()` → `await transaction.begin()` →
  逐条 `await transaction.send(topic, value, key=key)` → `commit()` 或异常时 `abort()`。
- **配置**：`bootstrap_servers`（默认 `localhost:9092`）、`acks="all"`、`retries=3`、
  `batch_size=16384`、`linger_ms=10`、`auto_offset_reset="earliest"`、`enable_auto_commit=False`。
- **生命周期**：`@app.on_event("startup")` 启生产者、`@app.on_event("shutdown")` 停生产者。
- **不做**：不负责安装 Kafka；不处理集群配置（单节点为主）；不提供消息持久化策略；
  不处理 Kafka Connect 数据同步；**不处理 Schema Registry**。

---

## 八、文件模块（合并 upload + storage 两个技能）

同 Java 层：upload 面向**常规附件**，storage 面向**大文件·分片·压缩·下载预览**。

### 8.1 upload 模块（fastapi-upload-module-skill）

**能力**：单文件/多文件/分片上传、本地存储、OSS 存储（阿里云 OSS / 腾讯云 COS）、
图片处理（缩略图·水印·格式转换）、附件 CRUD 与分类。
**配置**：`storage_type`（`local`/`aliyun`/`tencent`，默认 `local`）、
`local_upload_path`（默认 `./uploads`）、`local_domain`（默认 `http://localhost:8000`）、
`aliyun_*` / `tencent_*` 凭证、`allowed_types`（默认
`["jpg","jpeg","png","gif","pdf","doc","docx","xls","xlsx","zip"]`）、
`max_file_size`（默认 `10 * 1024 * 1024`）。
**本地存储**：UUID 文件名（`f"{uuid.uuid4()}.{ext}"`）+ 按 `%Y/%m/%d` 分目录 + `write_bytes(content)`，
返回 `f"{settings.local_domain}/uploads/{date_path}/{filename}"`；删除时从 URL 反解路径后 `unlink()`。
**OSS 存储**：`oss2.Auth` + `oss2.Bucket`，key 为 `uploads/{date_path}/{filename}`，
返回 `https://{bucket_name}.{endpoint}/{key}`。
**图片处理**：`Image.thumbnail(size, Image.LANCZOS)` 缩略图、`ImageDraw.Draw(img).text(...)` 水印、
`img.save(output, format='JPEG', quality=quality, optimize=True)` 压缩。
**接口**：`POST /api/upload/single`（`File(...)` 单文件，先校验扩展名在白名单 → 再校验
`len(content) > max_file_size` 抛 `FILE_TOO_LARGE` → 上传返回 `UploadResult{url, filename, size, content_type}`；
抛 `BusinessException(ErrorCode.FILE_TYPE_NOT_ALLOWED)`）、`POST /api/upload/multiple`。
**附件表**：`wg_attachment`（`id`/`filename`(255)/`file_path`(500)/`file_url`(500)/`file_size`/
`content_type`(100)/`file_ext`(20)/`category`(50，avatar·article·attachment)/`uploader_id`/
`created_at`/`deleted_at`）；接口 `GET /api/attachment/list`、`GET|DELETE /api/attachment/{id}`。
**不做**：不提供文件预览服务；不处理版权和合规审查；不提供 CDN 加速。

### 8.2 storage 模块（fastapi-storage-module-skill）

**用户问题（最多 3 个）**：包名（默认 `app`）、表前缀（默认 `wg`）、
默认存储方式（`local`/`aliyun`/`tencent`/`minio`，默认 `local`）。
**能力（8 项）**：小文件直接上传（< 10MB）/ 大文件切割上传 + 断点续传（≥ 10MB）/
文件压缩（可选，Pillow 压缩图片）/ 流式与断点续传下载 / 在线预览（图片·视频·文档）/
存储策略（本地·OSS·COS·MinIO）/ 附件 CRUD 分类标签 / 图片处理（缩略图·水印·格式转换）。
**配置**：`chunk.enabled=True`、`chunk.size=5*1024*1024`（5MB/片）、
`chunk.threshold=10*1024*1024`（10MB 触发分片）；`compress.enabled=False`、
`compress.types=["jpg","jpeg","png"]`、`compress.quality=0.8`、`compress.max_size=1024*1024`（1MB 以上才压缩）；
`local.path`（默认 `./uploads`）、`local.domain`（默认 `http://localhost:8000`）。

```
src/storage/
├── config.py · constants.py · exceptions.py · models.py · schemas.py
├── routers/   upload.py · download.py · attachment.py
└── services/  storage_service.py（策略接口）· local_storage.py · oss_storage.py
               cos_storage.py · minio_storage.py · upload_service.py
               download_service.py · attachment_service.py · image_service.py
alembic/versions/storage_module.py · api-contract-storage.md · docs/storage-module-guide.md
```

**表**：`{prefix}_attachment`（`id`/`filename`(255)/`file_path`(500)/`file_url`(500)/`file_size`/
`content_type`(100)/`file_ext`(20)/`category` 默认 `default`(50)/`storage_type`(20)/`uploader_id`/
`is_compressed` 默认 `False`/`created_at`/`deleted_at`）；
`{prefix}_chunk_info`（`id`/`upload_id`(64,唯一)/`filename`(255)/`file_size`/`chunk_size`/
`total_chunks`/`status` 默认 0（0 上传中·1 已完成·2 已取消）/`created_at`/`updated_at`）。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/storage/upload | 上传文件（自动判断） |
| POST | /api/storage/upload/chunk/init | 初始化分片上传 |
| POST | /api/storage/upload/chunk/{upload_id}/{index} | 上传分片 |
| POST | /api/storage/upload/chunk/{upload_id}/merge | 合并分片 |
| GET | /api/storage/upload/chunk/{upload_id}/chunks | 获取已上传分片 |
| GET | /api/storage/download/{id} | 下载文件 |
| GET | /api/storage/preview/{id} | 预览文件 |
| GET | /api/storage/attachment/list · /{id} | 附件列表 / 详情 |
| DELETE | /api/storage/attachment/{id} | 删除附件 |

**红线**：① 不重复生成 FastAPI 基础骨架；② 表名统一 `{prefix}_attachment`、`{prefix}_chunk_info`；
③ 所有删除为软删除（`deleted_at`）；④ **分片上传必须支持断点续传**；⑤ 压缩功能必须可配置开关；
⑥ 所有注释、文档用中文；⑦ **与 `springboot-storage-module-skill` 保持 API 字段完全一致**。

---

## 九、支付（合并 payment / wechat-pay / alipay-pay 三个技能）

> 同 Java 层：`fastapi-payment-module-skill`（微信 + 支付宝合一，**旧版已不推荐**）、
> `fastapi-wechat-pay-skill`（仅微信 V3 ⭐推荐）、`fastapi-alipay-pay-skill`（仅支付宝 ⭐推荐）。
> **新项目应分别引入两个独立 skill。**

**通用约定**：金额单位必须区分——微信支付用**分**（`int(amount * 100)`），支付宝用**元**，
且**必须 `Decimal(str(amount))` 不用 `float`**（否则 `0.1 + 0.2 = 0.30000000000004`）。
状态机 `PayStatus{ pending, paid, refunded, closed }` / `RefundStatus{ pending, success, failed }` /
`PayType{ wechat, alipay }`。回调必须**先验签再处理**。幂等靠 `orderNo` 唯一 + Redis 防重
（`python-redis-module-skill` 为推荐前置）。公网 HTTPS 回调地址是硬性前提。

### 9.1 微信支付 V3（fastapi-wechat-pay-skill）

依赖 `wechatpayv3` 或新版 `wechatpayv3-py`（推荐）+ `httpx`。

| 能力 | 接口 |
|------|------|
| JSAPI 支付（公众号 / 微信内 H5） | `POST /api/wechat-pay/jsapi` |
| 小程序支付 | `POST /api/wechat-pay/miniprogram` |
| H5 支付（手机浏览器） | `POST /api/wechat-pay/h5` |
| Native 支付（PC 扫码） | `POST /api/wechat-pay/native` |
| App 支付（iOS / Android） | `POST /api/wechat-pay/app` |
| 退款 / 查询 / 关单 / 回调验签（全场景） | `POST /api/wechat-pay/refund` · `GET /api/wechat-pay/query/{orderNo}` · `POST /api/wechat-pay/close/{orderNo}` · `POST /api/wechat-pay/notify` |

**配置**：`wechat_app_id`、`wechat_mch_id`、`wechat_private_key_path`（默认
`/opt/secret/wechat/apiclient_key.pem`）、`wechat_merchant_cert_path`
（默认 `/opt/secret/wechat/apiclient_cert.pem`）、`wechat_api_cert_serial_no`、
`wechat_api_v3_key`（32 位字符串）、`wechat_notify_url`、`wechat_refund_notify_url`。
**踩坑**：私钥加载失败 `ValueError: Could not deserialize key data` → 私钥必须是 **PEM PKCS8** 格式；
平台证书验证失败 → 用 `AutoUpdateCertificatesVerifier` 自动下载；回调验签失败 → 检查 `apiv3_key`；
Native 返回的 `code_url` 是 `weixin://...` → 正常现象，前端用 qrcode.js 转换；
沙箱环境用正式 `mch_id` 报错 → 测试用沙箱 API 地址。
**不做**：商户号开通、证书申请（见源仓库 `references/merchant-onboarding.md`）、UI 组件、支付宝。

### 9.2 支付宝（fastapi-alipay-pay-skill）

依赖 `python-alipay-sdk` + `pycryptodome`（签名需要）。

| 能力 | 接口 |
|------|------|
| 当面付（线下扫码 / 收银台） | `POST /api/alipay/precreate` |
| 手机网站支付（WAP / H5） | `POST /api/alipay/wap` |
| PC 网站支付 | `POST /api/alipay/page` |
| App 支付（iOS / Android） | `POST /api/alipay/app` |
| 退款 / 查询 / 关单 / 对账单下载 / 回调验签 | `POST /api/alipay/refund` · `GET /api/alipay/query/{order_no}` · `POST /api/alipay/close/{order_no}` · `GET /api/alipay/bill` · `POST /api/alipay/notify` |

**配置**：`alipay_app_id`（16 位 APPID，沙箱 `2021000000000000`）、`alipay_private_key`
（应用私钥，PEM PKCS8，含 BEGIN/END 头）、`alipay_public_key`（**支付宝公钥**）、
`notify_url`、`return_url` 等。
**踩坑**：验签失败报 `INVALID_SIGN` → 用的是**应用公钥**，换成**支付宝公钥**；
App 支付无反应报 `INVALID_PARAMETER` → `product_code` 必须填 `QUICK_MSECURITY_PAY`；
私钥格式错 → 必须 PKCS8（PEM 头为 `-----BEGIN PRIVATE KEY-----`）;
当面付 `code_url` 不到账 → 买家账号必须**用沙箱 App** 登录；
沙箱 404 → 网关用错，沙箱用 `openapi.alipaydev.com`；Decimal 精度 → 用 `Decimal(str(amount))`。
**不做**：商户号开通、证书申请、UI 组件、微信。

### 9.3 合一版（fastapi-payment-module-skill，旧，不应使用）

依赖 `wechatpayv3` + `alipay-sdk-python` + `httpx`。
配置 `wechat_app_id` / `wechat_mch_id` / `wechat_api_key` / `wechat_cert_path` / `wechat_notify_url`；
`alipay_app_id` / `alipay_private_key` / `alipay_public_key` / `alipay_notify_url` / `alipay_return_url`。
表 `wg_pay_order`（`order_no`(64,唯一,index)/`pay_order_no`(64,index)/`pay_type`/`status` 默认 pending/
`amount`(Numeric(10,2))/`subject`(200)/`body`(500)/`notify_url`(500)/`return_url`(500)/`user_id`(50,index)/
`openid`(100)/`paid_at`/时间戳）、`wg_refund_order`（`refund_no`(64,唯一)/`pay_order_no`(index)/
`refund_id`(64)/`refund_amount`/`total_amount`(Numeric(10,2))/`status`/`reason`(200)/`refunded_at`/`created_at`）。
接口 `/api/pay/wechat/create`、`/api/pay/alipay/create`、`/api/pay/wechat/notify`、`/api/pay/alipay/notify`。
微信签名用 `hashlib.md5` 对「按 key 排序后的 `k=v&...` + `&key={api_key}`」取大写 hexdigest；
回调返回 `<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>`；支付宝回调返回小写 `success`。
**新项目不应使用**，保留仅供了解历史形态。
**通用「不做」**：不负责商户号配置；不处理复杂退款流程；不提供 UI 相关代码。

---

## 十、org-permission 模块（fastapi-org-permission-module-skill）——**与 auth 模块重复**

> 本技能与 `fastapi-auth-module-skill`（§四）职责重叠：都声称负责组织架构 / 部门管理 / 角色权限 /
> RBAC / 菜单管理 / 数据权限。**新项目应使用 `fastapi-auth-module-skill`**，其表名遵循
> `{prefix}_sys_*` 规范、字段命名 camelCase、且与 Java 版逐字对齐。

本技能的历史形态（**不推荐使用，仅供识别存量代码**）：依赖 `sqlalchemy` + `python-jose` + `passlib`；
表为 `wg_org` + `wg_dept`（两表）、`wg_user`、`wg_role`、`wg_menu`、`wg_user_role`、`wg_role_menu`；
枚举 `RoleType{ system, custom }`、`MenuType{ catalog, menu, button }`；排序字段 `sort`；
组织树用 `parent_id` + `parent_ids`（默认 `"0/"`）路径列。

**典型风险**：与 auth 模块并存会导致同一项目出现两套表前缀与两套菜单枚举（
`{prefix}_sys_*` vs `wg_*`；`M`/`C`/`F` vs `catalog`/`menu`/`button`），
「分配菜单」回填空树、权限校验失效。
**不做**：不负责 CAS 集成；不处理 SSO；不提供 UI 相关代码。

---

## 十一、应用型技能（qr-login / article-generator / hot-trend-collector）

这三个技能不是「骨架叠加模块」，而是**独立小应用**的完整实现参考。

### 11.1 fastapi-qr-login-skill（小程序扫码登录）

**功能**：网站生成二维码、小程序扫码确认登录的完整流程。含扫码登录会话管理（创建会话·轮询状态·
标记已扫描·确认登录）、微信小程序码生成（带场景值，扫一扫直达确认页）、JWT Token 生成。
**适用**：Web 应用需通过小程序扫码登录；多平台（Web + 小程序）统一登录。
**技术栈**：FastAPI + MongoDB（存会话，集合 `qr_sessions`）+ JWT + 微信小程序 API。

```
POST /auth/qr/create                创建扫码会话        （Web 前端）
GET  /auth/qr/status/{session_id}   轮询会话状态        （Web 前端）
POST /auth/qr/scan                  小程序扫码标记       （小程序）
POST /auth/qr/confirm               确认登录            （小程序）
GET  /auth/qr/wxacode/{session_id}  生成小程序码        （Web 前端）
```

**业务流程**：Web 调 `/create` 拿 `session_id` → 生成二维码（或用 `/wxacode` 取小程序码）→
轮询 `/status` 直到 `scanned` → 小程序调 `/scan` 标记已扫描 → 用户确认后调 `/confirm` →
Web 端轮询拿到 `status: confirmed` + `token` → 登录成功。
**配置**：`WX_APPID`、`WX_APPSECRET`、`WX_TOKEN_URL`（`https://api.weixin.qq.com/cgi-bin/token`）。
**注意事项**：① 会话有效期默认 **5 分钟**，过期状态变 `expired`；② 并发处理——防止同一会话被多个账号
扫码，**使用状态和用户 ID 条件更新**；③ 微信 `access_token` 缓存，**提前 60 秒刷新**；
④ 时区处理——MongoDB 返回 naive datetime，**统一转 aware datetime 比较**。

### 11.2 article-generator（多平台文章生成）

**功能**：基于热点，通过 AI 生成适配各平台风格的初稿。支持热点关联、多平台适配、风格模板、
AI 对接（Kimi / DeepSeek / MiniMax）。

| 平台 | 文章风格 | 字数范围 | 特点 |
|------|----------|----------|------|
| 小红书 | 种草安利、情感共鸣 | 300-1000 | 表情丰富、段落短、标签多 |
| 知乎 | 专业分析、深度解读 | 1000-3000 | 结构清晰、论据充分 |
| 今日头条 | 新闻资讯、热点评论 | 500-1500 | 标题党、观点鲜明 |
| 公众号 | 深度文章、个人观点 | 1000-2000 | 情感丰富、有带入感 |
| CSDN | 技术文章、教程 | 800-2000 | 代码示例、步骤清晰 |

**结构**：`scripts/generator.py`（主入口）+ `scripts/platforms/`（`base.py` 基础类 +
`xiaohongshu.py`/`zhihu.py`/`toutiao.py`/`wechat.py`/`csdn.py`）+ `scripts/ai_client.py` +
`scripts/prompts/`（各平台提示词模板）+ `assets/templates/`。
**依赖**：`requests`、`openai`、`aiohttp`。配置 `AI_PROVIDER`（`kimi`/`deepseek`/`minimax`）与
对应 `*_API_KEY`。服务默认 `http://localhost:8001`。
**接口**：`POST /api/generate`、`GET /api/platforms`、`GET /api/articles`、
`GET|PUT|DELETE /api/articles/{id}`。
**扩展新平台**：继承 `PlatformAdapter`，实现 `get_prompt_template()` 与 `format_output(content)`。
**注意**：各平台文章风格差异大，建议先测试生成效果；**AI 生成内容需人工审核后再发布**；
注意保护个人隐私和商业机密。

### 11.3 hot-trend-collector（热点抓取）

**功能**：多平台热点数据采集 + REST API 服务。支持知乎热榜（API/爬虫）、微博热搜（爬虫）、
百度指数（爬虫）、微信指数（爬虫）、手动输入。
**结构**：`scripts/collector.py`（抓取入口）+ `scripts/collectors/`（`zhihu.py`/`weibo.py`/`baidu.py`/
`wechat.py`）+ `scripts/scheduler.py`（定时任务）+ `assets/sample_data.json`。
**依赖**：`requests`、`beautifulsoup4`、`aiohttp`、`schedule`。服务默认 `http://localhost:8000`。
**接口**：`GET /api/trends`、`POST /api/trends`、`DELETE /api/trends/{id}`、
`POST /api/trends/collect`、`GET /api/trends/sources`。
**配置**：`COLLECT_INTERVAL = 1`（小时）、`ENABLE_SCHEDULER = True`、`DATA_FILE = "data/trends.json"`；
启动时自动开启定时任务，**每小时抓取一次**。
**扩展新源**：在 `scripts/collectors/` 新增 `fetch_trends()` 函数返回
`[{"title", "url", "heat", "source"}]`，并在 `collector.py` 注册。
**注意**：遵守各平台 Robots.txt；合理设置抓取频率，避免对目标网站造成压力；
微博等平台可能需要 Cookie，建议登录后抓取。
---

## 十二、Python 入门知识框架（python-fast-skill）

> 面向零基础小白的**知识体系索引**（回答遵循「概念 → 语法 → 示例 → 常见坑」四段式）。
> 用于回答概念/语法类提问；不深入 Python 底层实现与元编程。

| 类别 | 覆盖内容 |
|------|----------|
| **数据类型** | `int` / `float` / `str` / `bool` / `None`；`list`（可变有序）/`tuple`（不可变）/`dict`（键值对，O(1) 查找）/`set`（无序不重复，去重神器） |
| **基础语法** | 变量、运算符、`if/elif/else`、`for/while`、`break/continue/pass` |
| **函数** | 函数定义、参数（位置/关键字/默认/可变）、返回值、装饰器、lambda |
| **面向对象** | 类与对象、继承、多态、封装、特殊方法（`__init__`/`__str__` 等） |
| **集合与推导式** | `list`/`tuple`/`dict`/`set`；列表·字典·集合推导式、生成器表达式 |
| **异常** | 异常体系、`try/except/finally`、`raise`、自定义异常、断言 |
| **IO** | 文件读写（`open`/`with`）、JSON/YAML/TOML、路径处理（`pathlib`） |
| **线程/进程** | `threading`、`multiprocessing`、`concurrent.futures`、异步 `asyncio` |
| **类型提示** | `typing`、`Optional`、`Union`、`List`/`Dict[xxx]` |
| **模块/包** | `import`、`from...import`、`__init__.py`、`pip`/`conda` |

**常被问到的坑（照抄原文）**：

1. Python 不需要声明类型，变量即类型；字符串可用单引号或双引号；
   `list`/`dict`/`set` 可变、`tuple` 不可变；**`0`、`""`、`[]`、`None` 在 `if` 中都视为 False**。
2. 列表索引从 0 开始；切片 `list[1:3]` 是**左闭右开** `[1,2)`；
   `dict.get(key, default)` 比 `dict[key]` 安全；`set` 用于去重 `list(set(items))`。
3. **默认参数不要用可变对象**：`def f(a=[])` ❌ → `def f(a=None)`；
   `*args` 是元组、`**kwargs` 是字典；lambda 只能写简单表达式；
   装饰器顺序很重要（`@a @b` 与 `@b @a` 不同）。
4. 异常要具体捕获，**先子后父**；不要 `except: pass` 空捕获；
   `finally` 中的 `return` 会覆盖 `try/except`；抛出异常用 **`raise` 不是 `throw`**。

**不做**：不提供完整 Python 教程；不深入底层实现与元编程；不讲解具体项目开发
（那是 fastapi-init-skill 的事）；不回答具体业务代码问题；不提供 IDE / 环境安装使用教程。

---

## 十三、交付物与未收录引用

| 层级 | 交付物 |
|------|--------|
| 骨架 | `api-contract.md`、`docs/project-guide.md`、`versions.md`（依赖版本记录） |
| auth | `api-contract-auth.md`（登录·当前用户·菜单树·回填·CRUD 全量）、`docs/auth-module-guide.md`（表结构·数据权限·集成步骤） |
| ws | `api-contract-ws.md`（WS 协议 + REST）、`docs/ws-module-guide.md` |
| agent | `api-contract-agent.md`（含 SSE Tool 限制说明）、`docs/deployment-guide.md`（多 Worker 部署指南） |
| storage | `api-contract-storage.md`、`docs/storage-module-guide.md` |
| 其余模块 | 各产出 `api-contract-<module>.md`，遵循 `conventions.md` 的模板与错误码规范 |

**未收录引用**：

- 引用 `python-backend-skill` 处（fastapi-init 的对照基准）——该技能**不在本仓库公开目录中**，
  仅作为「本 skill 与之分工不同」的对照，**未收录其内容**。
- 交叉引用技能（`frontend-request-skill` / `uniapp-request-skill` / `database-design-skill` /
  `fastapi-auth-module-skill` / `springboot-agent-module-skill` / `java-auth-module-skill` /
  `springboot-storage-module-skill`）均**在本仓库公开存在**，其内容由本 spec 层的对应文档
  （`frontend/*.md` / `conventions.md` / `database-design.md` / `java-springboot.md`）承载。
- 源仓库 `MISSING_SKILLS.md` 登记的 4 个私有技能（`vue-admin-skill`、`sse-agent-skill`、
  `universal-identity-bridge-skill`、`universal-login-bridge-skill`）**均未在本层转写文本中被引用**；
  它们**为源仓库私有技能，未收录**。

---

## 十四、与本项目规范的关系

本层为**独立吸收层**，不修改 `.trellis/spec/frontend/` 与 `guides/` 的任何语义。交集处交叉指引：

| 主题 | 本文件 | 本项目既有规范 | 关系 |
|------|--------|----------------|------|
| API 请求层 / 响应信封 / 错误码 | §2.6、§2.12、§三 | `.trellis/spec/frontend/http-api-guidelines.md` | 理念一致（`{code,message,data}` 信封、分页 `list` 字段、负数业务码 + HTTP 200）。本项目前端为 React + qiankun，**不消费** wg-skills 为 uni-app / 小程序写的请求层实现；仅候选参考。 |
| 入参 snake_case / 出参 camelCase | §四（`alias_generator=to_camel`） | 本项目前端字段命名 | Python 侧的 `to_camel` 别名生成器是通用做法；本项目若引入 Python 后端可沿用，以保证前端一套字段同时对接 Java/Python。 |
| 环境变量与配置 | §2.5（Pydantic Settings 读 `.env`） | 本项目 env 规范（`frontend/` 层与根文档） | Pydantic Settings 的 `.env` 加载方式对任何 FastAPI 项目通用。 |
| 目录 / 表命名 | §三（`{prefix}_*`、snake_case 字段） | — | 与 `frontend/` 层无交集（后端专属），独立成立。 |

> 冲突处理：若 wg-skills 某条规则与本项目既有 spec 冲突，**以本项目既有 spec 为准**；本层仅提供参考。
> 回滚：删除 `.trellis/spec/wg-skills/backend/python-fastapi.md` 即可，不影响其他层。
