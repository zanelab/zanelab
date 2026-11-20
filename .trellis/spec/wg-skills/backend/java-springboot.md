<!-- 来源: jiushiwon/wg-skills @ 3b93743 (Apache-2.0)，有修改；详见 ../NOTICE.md -->
# Spring Boot（Java）后端规范

> 合并转写自 wg-skills 的 16 个技能：`java-fast-skill`、`springboot-init-skill`，以及
> `springboot-module/` 下 14 个模块技能（auth / agent / dict / kafka / log / notification /
> org-permission(废弃) / payment / redis / storage / upload / wechat-pay / alipay-pay / universal-login-api）。
> 规则实质保留原文；触发词 / frontmatter / 安装说明 / 营销叙述已剥离。

**分层**：`backend/shared/`（公共契约层，**唯一事实来源**）→ `springboot-init-skill`（骨架）→
`springboot-*-module-*`（叠加式业务模块）。
**响应信封 / 错误码表 / JWT 规范 / 分页约定 / `api-contract.md` 模板的唯一定义处是 `conventions.md`**，
本文件只写「Java 侧如何落地」。4 语言（springboot-init / fastapi-init / go-gin-init / nodejs-init）
共享同一套契约层。

---

## 一、红线（不可绕过）

1. **不生成无契约的骨架**——须自带响应信封、错误码、JWT、`api-contract.md`。
2. **不硬编码版本号**——JDK / Spring Boot / 依赖版本现场查官方源最新稳定版（Adoptium、Spring Initializr、Maven Central）。
3. **不跳过环境探测**——无法安装则给明确中文提示。
4. **不强制安装系统级数据库**——有 Docker 则自动拉起开发库容器（可选），否则只给 Docker 命令。
5. **不替用户提交 git**。
6. **默认值必须安全**——`.env.example` 对 `JWT_SECRET` / `CORS` / `APP_DEBUG` 有醒目警告；安全头强制开启。
7. **所有注释、文档用中文**。
8. **接口契约必须和 `frontend-request-skill` 对齐**——信封、错误码、字段命名前后端一致。
9. **`.env` 与 `.gitignore` 必须随脚手架生成，且 `.env` 配置必须被服务加载**——`application.yml` 用
   `${ENV_VAR:default}` 读取全部配置，禁止硬编码端口 / 数据库密码 / JWT 密钥。
10. **模块不重复生成骨架基础设施**（JWT、统一响应、Swagger、分页、`@CurrentUser`）。
11. **分页字段名固定 `list`**（不是 `items` / `records` / `content`），`page` 从 **1** 开始；后端
    `PageResponse` 序列化字段名与前端 `types/api.d.ts` 的 `PageResponse<T>` 必须完全一致。
12. **禁止实体直接作为入参/出参**，一律 DTO（防 mass assignment 注入 `appSecret`/`ownerId`/`createTime`）。
13. **所有删除为软删除**（`deleted_at`）。
14. **禁止外键级联**（业务层控事务）、**禁止 ENUM 类型**（TINYINT + 字典表）、**禁止魔法数字**、
    **禁止无注释字段**、**禁止 `VARCHAR(255)` 默认值**。

---

## 二、骨架（springboot-init-skill）

面向零基础用户，一键生成开箱即用的 Spring Boot Web 服务骨架。

| 维度 | 本 skill (Java) | fastapi-init | go-gin-init | nodejs-init |
|------|-----------------|--------------|-------------|-------------|
| 框架 | Spring Boot 3.x | FastAPI | Gin | Express.js |
| 默认数据库 | MySQL | MySQL | MySQL | MongoDB |
| 鉴权 | Spring Security 6 + JWT | Pydantic + JWT | Gin + JWT | passport.js + JWT |
| 启动 | `./restart.sh [dev\|prod]` | 同左 | 同左 | `npm start` / `npm run dev` |

**生成流程**：① 只问 3 个问题：项目名（默认 `my-springboot-app`）；数据库
（`A. MySQL` 默认推荐 / `B. PostgreSQL` / `C. MongoDB` / `D. 不用`）；是否需要 Redis（默认不需要）。
**禁止问**：JDK 版本、Spring Boot 版本、ORM（固定 JPA）、构建（固定 Maven）、包名、端口。

② 环境探测：

| 检查项 | 命令 | 失败处理 |
|--------|------|----------|
| JDK 安装 / 版本 >= 17 | `java -version` | 提示下载 Adoptium / Oracle / Azul Zulu；给 `setx JAVA_HOME` 指引 |
| Maven | 检查 `mvnw` 或 `mvn` | 自动生成 Maven Wrapper（**不要求预装 Maven**） |
| 操作系统 | `uname` / `$env:OS` | 分平台生成脚本（linux / macos / windows） |
| Docker（可选） | `docker --version` | 仅警告，**不阻塞**生成 |

Maven Wrapper 慢时给阿里云镜像 `https://maven.aliyun.com/repository/public` 的 `settings.xml`。

③ 按序生成：目录结构 → `pom.xml` + `application.yml` + `.env.example` + `.env` + `.gitignore` →
`Application.java` → `common/*`（ApiResponse / BusinessException / GlobalExceptionHandler / JwtUtil /
PageRequest / PageResponse）→ `config/*`（SecurityConfig / WebConfig / OpenApiConfig / CorsConfig /
ResponseAdvice / LoggingFilter）→ `entity/User.java` → `repository/UserRepository.java` →
`dto/*`（CreateUserRequest / UserResponse / LoginRequest / TokenResponse / UploadResponse / ErrorResponse）→
`service/*`（UserService / AuthService / UploadService / SseService）→
`controller/*`（HealthController / AuthController / UserController / SseController / UploadController）→
`resources/db/migration/`（按需 `V1__init_user.sql`）→ `restart.sh` / `restart.bat` →
`Dockerfile` + `docker-compose*.yml` → `api-contract.md` + `docs/project-guide.md` → `README.md`。

④ 自动安装与启动：`./mvnw --version` → `[ -f .env ] || cp .env.example .env` → `./mvnw clean compile` →
有 Docker 时 `docker-compose up -d`（按 `DB_TYPE` 选 compose 文件）。
⑤ 交付清单：约 25 个文件、启动方式、Swagger 地址、SSE / 上传示例 curl、默认账号接口、
「请编辑 `.env` 修改 `JWT_SECRET`」安全提醒。

**生成项目目录结构**：

```
{{PROJECT_NAME}}/
├── .mvn/wrapper/
├── src/main/java/{{basePackagePath}}/
│   ├── Application.java
│   ├── common/   ApiResponse · BusinessException · GlobalExceptionHandler · JwtUtil
│   │             JwtAuthenticationFilter · CurrentUser/CurrentUserArgumentResolver · PageRequest · PageResponse
│   ├── config/   SecurityConfig · WebConfig · LoggingFilter（请求日志自动脱敏）· OpenApiConfig · ResponseAdvice
│   ├── controller/ HealthController · AuthController · UserController · SseController · UploadController
│   ├── service/    UserService · AuthService · UploadService · SseService
│   ├── repository/ UserRepository.java（Spring Data JPA）   ├── entity/ User.java（JPA 实体）
│   └── dto/        auth/ · user/ · upload/
├── src/main/resources/  application.yml · db/migration/V1__init_user.sql
├── src/test/java/{{basePackagePath}}/ApplicationTests.java
├── uploads/ · logs/（运行时创建）· .env.example · .env · .gitignore
├── docker-compose.yml / .pg.yml / .mongo.yml · Dockerfile
├── mvnw · mvnw.cmd · restart.sh · restart.bat · pom.xml · README.md
├── api-contract.md（接口契约，强制交付物）└── docs/project-guide.md（项目指南，强制交付物）
```

**技术选型**：

| 维度 | 选型 | 不写死的获取方式 |
|------|------|------------------|
| JDK | 17 LTS 起（默认 21） | `endoflife.date/api/java.json` 取 LTS |
| Spring Boot | 3.x 最新稳定 | `start.spring.io/metadata/client` 的 `bootVersions` |
| 构建 | Maven + Maven Wrapper | 自动生成 `mvnw` / `mvnw.cmd` |
| ORM | Spring Data JPA | — |
| 数据库驱动 | `mysql-connector-j` / `postgresql` / `mongodb-driver-sync` | Maven Central |
| 鉴权 | Spring Security 6 + jjwt 0.12.x | Maven Central |
| 文档 | springdoc-openapi 2.x | Maven Central |
| SSE | Spring MVC `SseEmitter`（Servlet 异步），**不引入 WebFlux** | — |
| 缓存 / 迁移 / 测试 | Spring Data Redis（可选）/ Flyway（按需）/ JUnit 5 + `spring-boot-starter-test` | — |

> 验证基线（demo 实测）：Spring Boot 3.3.5、jjwt 0.12.6、springdoc 2.6.0。

- **默认端口**：Spring Boot 8080 / MySQL 3306 / PostgreSQL 5432 / MongoDB 27017 / Redis 6379。
- **默认表前缀** `wg`（`.env` 中 `DB_TABLE_PREFIX` 可改）；**默认包名** `com.koala.{{project}}`
  （kebab-case → camelCase），如 `my-app` → `com.koala.myapp`。
- **默认 JWT**：`JWT_SECRET=change-me-please-use-openssl-rand-base64-32`（⚠️必须修改）、
  `JWT_ACCESS_EXPIRE_MINUTES=60`、`JWT_REFRESH_EXPIRE_DAYS=7`、`JWT_ISSUER=springboot-app`、
  `JWT_HEADER=Authorization`、`JWT_PREFIX="Bearer "`。
- **pom.xml 依赖**：`spring-boot-starter-web` / `-validation` / `-data-jpa`（默认）或 `-data-mongodb` /
  `-data-redis`（可选，需 Redis 时才引入）/ `-security`；数据库驱动按 `DB_TYPE` 选；
  `io.jsonwebtoken:jjwt-api/impl/jackson`（0.12.x）；`org.springdoc:springdoc-openapi-starter-webmvc-ui`（2.x）；
  `flyway-core` + `flyway-mysql` 或 `flyway-database-postgresql`（按需）；`lombok`（optional）；
  `spring-boot-devtools`（runtime）；`spring-boot-starter-test`。

**配置生成与加载规则（强制）**：① `pom.xml` 用 demo 验证基线版本，生成时替换为最新稳定版；
② `.env.example` 含全部可配置项，生成时复制为 `.env` 且 `.env` 入 `.gitignore`；
③ `application.yml` 用 `${ENV_VAR:default}` 引用 `.env`；④ 包名默认 `com.koala.{{project}}`，
占位符 `{{basePackagePath}}` 为点号路径转斜杠；⑤ **切换数据库类型必须重新生成项目**
（脚本按 `DB_TYPE` 决定依赖与配置）。

```
# application.yml 关键项（全部 ${ENV_VAR:default}）
server.port: ${SERVER_PORT:8080}    server.shutdown: graceful
server.tomcat.threads.max / accept-count / connection-timeout: ${TOMCAT_THREADS_MAX:200} / ${TOMCAT_ACCEPT_COUNT:100} / ${TOMCAT_CONNECTION_TIMEOUT:20000}
spring.profiles.active: ${SPRING_PROFILES_ACTIVE:dev}    spring.lifecycle.timeout-per-shutdown-phase: ${SHUTDOWN_TIMEOUT:30s}
spring.datasource.url: ${DB_URL:jdbc:mysql://localhost:3306/db?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true}
spring.datasource.hikari.maximum-pool-size / minimum-idle / leak-detection-threshold: ${DB_POOL_MAX_SIZE:20} / ${DB_POOL_MIN_IDLE:5} / ${DB_POOL_LEAK_DETECTION_THRESHOLD:60000}
spring.jpa.hibernate.ddl-auto: ${JPA_DDL_AUTO:update}
spring.flyway: enabled ${FLYWAY_ENABLED:false}，locations classpath:db/migration，baseline-on-migrate true
spring.servlet.multipart.max-file-size / max-request-size: ${UPLOAD_MAX_FILE_SIZE:10MB} / ${UPLOAD_MAX_REQUEST_SIZE:50MB}
sse.timeout-ms / heartbeat-seconds: ${SSE_TIMEOUT_MS:30000} / ${SSE_HEARTBEAT_SECONDS:2}
jwt: secret ${JWT_SECRET}，access-expire-minutes 60，refresh-expire-days 7，header Authorization，prefix "Bearer "
cors.origins: ${CORS_ORIGINS:*}    springdoc: api-docs.path /v3/api-docs，swagger-ui.path /swagger-ui.html
upload: dir ./uploads，allowed-types jpg,jpeg,png,gif,pdf，allowed-mime-types image/jpeg,image/png,image/gif,application/pdf，max-size-bytes ${UPLOAD_MAX_SIZE_BYTES:10485760}
app: debug ${APP_DEBUG:true}，table-prefix ${DB_TABLE_PREFIX:wg}
```

`.env.example` 分组顺序：应用基础 / 数据库（`DB_TYPE` ∈ `mysql`·`postgres`·`mongo`·`none`）/ HikariCP /
JPA / Flyway / Tomcat / 优雅关闭 / SSE / Redis / JWT / CORS / 文件上传 / 表前缀 / 日志。
`.gitignore` 必须含：`.idea/ .vscode/ *.iml target/ build/ out/ .mvn/wrapper/maven-wrapper.jar
.env logs/ uploads/ *.pid .DS_Store Thumbs.db *.log`。

**统一响应与异常**：`config/ResponseAdvice.java` 用 `ResponseBodyAdvice` 自动包装 `ApiResponse`。
**不包装**：已手动包装的 `ApiResponse<T>`；`null`（包成 `success(null)`）；`String` / `byte[]`
（直接返回，避免 Jackson 错误）；SSE `SseEmitter`（`supports` 返回 false）。

| 异常（`@RestControllerAdvice` 处理） | HTTP | 错误码 | 场景 |
|---------|------|--------|------|
| `BusinessException` | 400/401/403/404/409 | 业务码 | 业务层显式抛 |
| `MethodArgumentNotValidException` | 400 | -1001 | `@Valid` 失败 |
| `ConstraintViolationException` | 400 | -1001 | `@Validated` 失败 |
| `DataIntegrityViolationException` | 409 | -1005 | 数据库唯一约束冲突 |
| `Exception` 兜底 | 500 | -2000 | 系统异常 |

`BusinessException` 静态工厂：`badRequest(-1001)` / `unauthorized(-1002)` / `forbidden(-1003)` /
`notFound(-1004)` / `conflict(-1005)`。异常处理返回 `ResponseEntity<ApiResponse<...>>`，
**不再走 ResponseBodyAdvice**。

**鉴权链**：`JwtAuthenticationFilter`（解析 `Authorization: Bearer {token}`，失败**不抛异常**，
放行给 Spring Security）→ `SecurityContextHolder.setAuthentication(...)` → Controller
（`@CurrentUser Long userId`）。`CurrentUserArgumentResolver` 从
`SecurityContextHolder.getContext().getAuthentication().getPrincipal()` 取 userId，
未登录抛 `BusinessException.unauthorized("未登录")`。

```java
// 放行路由
.requestMatchers(HttpMethod.GET, "/api/health", "/api/sse/**").permitAll()
.requestMatchers("/api/auth/**").permitAll()
.requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
.requestMatchers("/uploads/**").permitAll()
.anyRequest().authenticated()
```

| jjwt 0.12.x 变化 | 旧 API | 新 API |
|------|--------|--------|
| 签名 | `signWith(SignatureAlgorithm.HS256, key)` | `signWith(key)` |
| 解析 | `parseClaimsJws(token)` | `parseSignedClaims(token)` |
| 获取 Payload | `getBody()` | `getPayload()` |
| Key 构造 | `Keys.secretKeyFor(SignatureAlgorithm.HS256)` | `Keys.hmacShaKeyFor(bytes)` |

> ⚠️ 0.12.x 必须保证 `secret` 至少 256 位（32 字节），否则启动时 `init()` 报警告。
> 密码存储统一用 `BCryptPasswordEncoder`（Spring Security 默认，自带 salt、cost=10），**不要自定义 hash 算法**。

**安全规范**：默认安全头 `X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`、
`X-XSS-Protection: 1; mode=block`、`Strict-Transport-Security: max-age=31536000; includeSubDomains`、
`Cache-Control: no-store`（鉴权接口不缓存）。
CSRF：API 模式默认关闭（`http.csrf(AbstractHttpConfigurer::disable)`）；若同时被 SSR + Cookie 鉴权需
单独实现（如 `CookieCsrfTokenRepository.withHttpOnlyFalse()`）。CORS：开发默认 `*`，**生产禁止 `*`**，
必须具体域名（逗号分隔）。`LoggingFilter` 对含 `auth` `password` `token` `login` `register` 的路径自动脱敏，
需要时注入 MDC `traceId`。限流默认**不引入**，需要时用 Resilience4j 或 Bucket4j。
JWT 无状态，`/api/auth/logout` 默认仅前端清 token；生产若需服务端登出必须引入 Redis 存 `jti` 黑名单
并在过滤器解析时检查。
企业级必调：`hikari.maximum-pool-size` = `(CPU 核数 * 2) + 有效磁盘数`（常见 20~50）；
`minimum-idle` = 上限的 1/4~1/2；`leak-detection-threshold` 60s；`tomcat.threads.max`/`accept-count`
按压测调（默认 200/100）；`server.shutdown=graceful` **必须开**；`jwt.secret` 至少 32 字节随机串；
HikariCP `max-lifetime` 小于数据库 `wait_timeout`（MySQL 默认 8 小时）。

**SSE 流式**：依赖只需 `spring-boot-starter-web`，`SseEmitter` 由 Spring MVC 在 Servlet 栈下提供。

| 维度 | SSE | WebSocket |
|------|-----|-----------|
| 协议 / 方向 | HTTP / 服务端 → 客户端 | 独立协议 / 双向 |
| 鉴权 | 标准 HTTP Header | 需手动实现 |
| 浏览器兼容 | EventSource 原生 | 需 `new WebSocket()` |
| 微信小程序 | `enableChunked` 兼容 | 需 `wx.connectSocket` |
| 适用场景 | 单向推送（AI 流式、通知、进度条） | 双向交互（IM、游戏、协同编辑） |

```
响应头：Content-Type: text/event-stream / Cache-Control: no-cache / Connection: keep-alive
数据：  data: {"content":"hello","ts":1692600000000}  （后接空行）
```

`SseService` 用 `ScheduledExecutorService` 按 `heartbeat-seconds` 发心跳，
`ConcurrentHashMap<SseEmitter, ScheduledFuture<?>>` 跟踪任务；`onCompletion` / `onTimeout` / `onError`
三个回调都必须 `removeEmitter`（取消调度 + `emitter.complete()`），否则连接泄漏线程。
示例端点 `permitAll`，**生产必须改为 `authenticated()`**；每个长连接占一个 Servlet 请求线程直到返回，
必须设 `sse.timeout-ms` 与心跳；高并发可为 SSE 单独端口 / 独立实例。
客户端：H5 用 `new EventSource(...)` + `addEventListener('message')`；微信小程序用
`wx.request({enableChunked: true})` + `requestTask.onChunkReceived`，按 `data: ` 前缀逐行解析。

**一键启动脚本**：① 一条命令 = 完整生命周期（环境检查 + 安全停旧 + 启动 + 输出日志命令）；
② PID 写 `app.pid`，重启先 `kill` → `sleep 2` → `kill -9` 兜底；
③ `.bat` 必须 **UTF-8 with BOM + CRLF**（中文注释兼容 Windows CMD）；
④ dev = `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`，日志 `logs/dev.log`（含 devtools 热重载）；
prod = `./mvnw clean package -DskipTests` → 后台 `java -jar target/*.jar --spring.profiles.active=prod`，
日志 `logs/app.log`；⑤ 额外指令 `stop` / `status`；启动前 `ensure_env()` 检查 `.env` 不存在则从
`.env.example` 复制。

**生成后验证（端到端冒烟，必须）**：

```bash
./restart.sh dev &
TOKEN=$(curl -s -X POST localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | python -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")
curl -s "localhost:8080/api/users?page=1&pageSize=10" -H "Authorization: Bearer $TOKEN" \
  | python -c "import sys,json;d=json.load(sys.stdin)['data'];assert 'list' in d and isinstance(d['list'],list),'分页字段必须是 list（非 items）';print('OK list=',len(d['list']))"
```

> **红线**：断言失败（如返回 `items` 而非 `list`）时**先修 `common/PageResponse.java` 再交付**，
> 禁止带病交付。本校验用于拦截「文档说 list、代码写 items」的契约漂移。

**交付物**：`docs/project-guide.md`（技术栈、启动方式、新增接口/实体流程、生产部署、高并发与安全 checklist）、
`api-contract.md`（格式见 `conventions.md`）。
**全量接口**（`/api` 前缀）：`GET /api/health`、`POST /api/auth/register|login|refresh|logout`、
`GET /api/auth/me`、`GET|POST /api/users`、`GET /api/users/{id}`、`PUT /api/users/profile|password`、
`GET /api/sse/chat`、`GET /api/sse/chat/protected`、`POST /api/upload`（字段 `file`）、
`POST /api/uploads`（字段 `files`）、`GET /swagger-ui.html`、`GET /v3/api-docs`。
**生产部署**：Docker（`docker-compose up -d --build`）；Nginx 反代时 **SSE 路径必须
`proxy_buffering off` + `proxy_set_header Connection ''` + `proxy_http_version 1.1`**，否则 Nginx
缓存响应、SSE 流式失效；JVM 建议 `-XX:+UseG1GC -XX:MaxGCPauseMillis=200`。

---

## 三、模块叠加总则

1. **前置**：已装 `springboot-init-skill`（提供 `ApiResponse`/`BusinessException`/`GlobalExceptionHandler`/
   `PageRequest`/`PageResponse`/`JwtAuthenticationFilter`/`@CurrentUser`+`CurrentUserArgumentResolver`/
   `SecurityConfig`），直接复用不重复生成。
2. **配置**用骨架 `.env` + `application.yml` + `@ConfigurationProperties`，**不另定义配置类体系**。
3. **表名**统一 `{prefix}_*`（默认 `wg_`），不硬编码 `wg_`。
4. **迁移**用骨架 **Flyway**（`V{n}__{desc}.sql`，version 单调递增，description snake_case，一次一件事），
   不手动执行 SQL。
5. **ORM 用 Spring Data JPA**，不引入 MyBatis Plus。
6. **响应**用骨架 `ApiResponse` 自动包装，不手动包 `{ code, message, data }`。
7. **异常**用骨架 `GlobalExceptionHandler`，不返回原始 Map 错误。
8. **安全头**复用骨架 `SecurityConfig`，不重复定义 `SecurityHeadersFilter`。
9. **用户**用 `@CurrentUser Long userId`，**禁止硬编码 `Long userId = 1L`**。
10. **交付物**：每模块产出 `api-contract-<module>.md` + `docs/<module>-guide.md`，遵循
    `backend/shared/module-output-spec.md`；模块自定义错误码**只能追加在 `-3xxx` 段**。

**表设计规范（全模块共用）**：

| 规则 | 示例 |
|------|------|
| 表名 `{表前缀}_{snake_case}`，单词数 ≤ 4 | `wg_user`、`wg_order_item`、`wg_user_social_account` |
| 字段 snake_case；主键统一 `id` | `user_id` / `created_at` |
| 时间字段统一 `created_at` / `updated_at`（DATETIME NOT NULL） | — |
| 软删除 `deleted_at`（DATETIME NULL，未删为 NULL） | — |
| 状态字段 `status`（TINYINT：0=禁用，1=正常） | — |
| 布尔字段 `is_*` 前缀 | `is_active` / `is_verified` |

必备字段 `id` / `created_at` / `updated_at`（+ 可选 `deleted_at`）。
索引命名 `uk_{table}_{column}` / `idx_{table}_{column}` / `idx_{table}_{col1}_{col2}`。

| 业务场景 | MySQL | PostgreSQL | MongoDB |
|---------|-------|------------|---------|
| 主键 / 短字符串 | BIGINT / VARCHAR(64) | BIGSERIAL / VARCHAR(64) | ObjectId / String |
| 长文本 | TEXT 或 LONGTEXT | TEXT | String |
| 金额 / 时间 / 布尔 / JSON | DECIMAL(10,2) / DATETIME / TINYINT(1) / JSON | NUMERIC(10,2) / TIMESTAMP / BOOLEAN / JSONB | BigDecimal / LocalDateTime / Boolean / Document |

**JPA 映射**：显式声明 `@Table(name = "{{tablePrefix}}_user")` 与 `@Column(name = "...")`，
不依赖 Hibernate 默认下划线推断。

---

## 四、auth 模块（springboot-auth-module-skill）

> **唯一权威声明**：组织架构 / 部门管理 / 角色权限 / RBAC / 菜单管理 / 数据权限 六类需求，
> **本技能是唯一权威**。`springboot-org-permission-module-skill` 已废弃（§十五）。
> **不要再从其他技能生成组织权限代码。**

**用户问题（最多 3 个）**：包名（默认 `com.koala.myapp`）、表前缀（默认 `wg`）、
是否需要数据权限（默认四档全开）。
**能力**：租户 / 组织架构（Org，**单表**树，`parent_id` 递归 + `parent_ids` 路径列）/ 岗位（Post）/
用户（SysUser，扩展基础 User 关联租户·部门·岗位·角色）/ 角色（Role，四级数据权限）/ 菜单·权限（Menu）/
角色-菜单绑定 / 用户-角色绑定 / 方法级鉴权 / 数据权限 / 个人鉴权（登录·登出·改密·当前用户详情·菜单树）/
回填接口 / 接口契约。

```
src/main/java/{{basePackage}}/auth/
├── common/   AuthConstants（权限常量，避免魔法字符串）· DataScope（数据权限枚举 4 档）
├── controller/ AuthController（登录/登出/当前用户/菜单树/改密）· UserController · RoleController
│               MenuController · OrgController · PostController · TenantController
├── dto/ · entity/ · repository/ · service/
└── permission/ AuthorityLoader（按 userId 装载权限标识 + 角色码）· PermissionEvaluator（档位解析）
                DataScopeFilter（过滤 Specification）
src/main/resources/db/migration/V10__init_auth_module.sql · api-contract-auth.md · docs/auth-module-guide.md
```

**表命名（强制）**：`{prefix}_sys_tenant` / `_sys_org` / `_sys_post` / `_sys_user` / `_sys_role` /
`_sys_menu` / `_sys_user_role` / `_sys_user_post` / `_sys_role_menu`。
> **例外清单为空。**「用户表叫 `{prefix}_user`」是历史误用，已作废（红线 R1）。

| `menu_type` | 含义 | 说明 |
|----|------|------|
| `M` | **目录** | 只做分组，不对应页面组件，`path` 通常是 `/system` 这类前缀 |
| `C` | **菜单** | 对应一个页面组件，可带 `permission` |
| `F` | **按钮** | 不带路径，只承载 `permission` |

> 兼容：读取时 `B` 视为 `F`；写入时只允许 `M` / `C` / `F`。写成 `M=菜单 C=目录` 是**错的**（已纠正）。

**权限标识（强制）**：三段式 `模块:资源:动作`，全小写，多词动作用短横线。

```
system:user:list|create|edit|delete|reset-pwd|assign-role|assign-post
system:role:list|create|edit|delete|assign-menu
system:menu:list|create|edit|delete       system:org:list|create|edit|delete
system:post:list|create|edit|delete       system:tenant:list|create|edit|delete
system:app:list|create|edit|delete|key-manage
account:bind:list|create|delete|set-default
dashboard:home:view      example:product:list|create|edit|delete
```

规则：① 三段固定，禁止两段或一段；② **页面权限与列表接口权限共用同一码**（页面 `system:user:list`
与 `GET /api/users` 是同一条）；③ **按钮权限绝不复用为页面/路由权限**；
④ 前端 `router.meta.permission`、前端 `v-permission`、后端 `@PreAuthorize`、
DB `{prefix}_sys_menu.permission` **必须逐字一致**（交付前做三方 diff）。

```java
@Configuration
@EnableMethodSecurity           // ← 必须开启，否则 @PreAuthorize 静默失效
public class SecurityConfig { }

// 每个受控端点必须显式声明；"仅 authenticated()" 视为未完成
@PreAuthorize("hasAuthority('system:user:list')")
@GetMapping
public ApiResponse<PageResponse<UserVO>> page(...) { }
```

**JWT 过滤器必须把真实权限装进 SecurityContext**（只装 `ROLE_USER` 会导致全量 403）：

```java
var authorities = new ArrayList<GrantedAuthority>();
authorityLoader.roleCodes(userId).forEach(c -> authorities.add(new SimpleGrantedAuthority("ROLE_" + c)));
authorityLoader.permissions(userId).forEach(p -> authorities.add(new SimpleGrantedAuthority(p)));
var auth = new UsernamePasswordAuthenticationToken(userId, null, authorities);
```

**数据权限（四级）**：`ALL` 全部 / `DEPT_ONLY` 本部门 / `DEPT_AND_BELOW` 本部门及以下 / `SELF_ONLY` 仅本人。
**多角色取最宽档位**（`ALL > DEPT_AND_BELOW > DEPT_ONLY > SELF_ONLY`）。
**必须可作用于任意业务表**：`DataScopeFilter` 提供通用入口，业务表只要有 `creator_id` / `org_id`
就能接入，**禁止只对用户表生效**。历史版本只实现 `ALL` / `SELF_ONLY` 两档并把其余档**静默折叠**为
`SELF_ONLY`——这是缺陷，不是简化。

**多角色去重（三层防线，取并集）**：① `SysRoleMenuRepository.findMenuIdsByUserId`（IN 子查询 +
`findAllById` 按主键去重）；② `AuthService.me()` 里 `new HashSet<>(...)` → `new ArrayList<>(...)`；
③ `buildMenuTree()` 用 `Map<Long, MenuNode>` 按 id 索引，重复 id 不重复挂载。
前端登录响应 `permissions` 已是去重 List，直接覆盖不做合并。

**接口契约要点**：字段命名一律 camelCase（`accessToken`/`pageSize`/`menuType`/`dataScope`/`menuIds`/
`createdAt`）；`POST /api/auth/login` → `{ accessToken, refreshToken, tokenType, expiresIn }`；
`GET /api/auth/me` → 用户 + 角色 + 部门 + 岗位 + 权限；`GET /api/auth/menus` → 当前用户可见树形菜单；
**回填接口（必须交付）** `GET /api/roles/{id}/menus` → `List<Long>`、`GET /api/users/{id}/roles`、
`GET /api/users/{id}/posts`；分配接口语义为**全量覆盖**（传空数组即清空，前端必须先调回填接口否则覆盖清空）；
`UserVO` **不含** `password`，列表项**不含** `roles`/`posts`（用回填接口）；用户/角色/菜单/部门/岗位为
标准分页 CRUD，入参出参一律 DTO。

**交付自检（缺一不可）**：

| # | 检查 | 判定 |
|---|------|------|
| 1 | `grep -c "@PreAuthorize"` 覆盖率 | 每个受控端点都有；`0` 命中 = 未完成 |
| 2 | `@EnableMethodSecurity` 是否开启 | 未开启 → `@PreAuthorize` 静默失效 |
| 3 | JWT 过滤器是否装配真实权限 | 只装 `ROLE_USER` = 未完成 |
| 4 | 表名是否全部 `{prefix}_sys_*` | 出现 `{prefix}_user` = 违反 R1 |
| 5 | `DataScope` 是否 4 档且均有可达分支 | 2 档 = 未完成 |
| 6 | 三方权限码 diff（DB ⟷ 路由 meta ⟷ v-permission ⟷ @PreAuthorize） | 必须零差集 |
| 7 | 是否有实体直接作为 `@RequestBody` / 响应体 | 有 = 违反 R5 |
| 8 | 回填接口是否交付 | 缺 → 前端「分配菜单/角色」会覆盖清空 |

| # | 红线 |
|---|------|
| R1 | 表名**全部** `{prefix}_sys_*`，禁止 `{prefix}_user` 特例（历史破例导致同一个库三种前缀） |
| R2 | **必须交付方法级鉴权**（`@EnableMethodSecurity` + 每端点 `@PreAuthorize` + SecurityContext 装真实权限）；只写 `anyRequest().authenticated()` 视为未完成——否则任何登录用户可删用户/角色/菜单、重置他人密码 |
| R3 | 数据权限**必须四级可达**且**必须能作用于业务表**，多角色取最宽档（静默折叠档位 = 权限失效） |
| R4 | **管理类端点禁止 `permitAll`**，只有 `/api/auth/login`、`/api/health`、Swagger 可放行 |
| R5 | **禁止实体直接作为入参/出参**，一律 DTO（防 mass assignment） |
| R6 | 权限码三段式，page 与 list 同码；按钮码不复用为路由码（防「路由写 view、接口写 list」错位） |
| R7 | `menu_type` 只允许 `M` / `C` / `F`（与业界惯例一致，避免跨项目迁移出错） |
| R8 | 所有删除为软删除（`deleted_at`） |
| R9 | 菜单树用 `parent_id` + `sort_order`，禁止嵌套集合 |
| R10 | **必须交付三个回填接口**（缺一个，对应分配功能就会覆盖清空） |
| R11 | 所有注释、文档用中文 |
| R12 | 不重复生成 Spring Boot 基础骨架 |
| R13 | `menu_type=C` 必须同时有 `path` 与 `component`；`menu_type=F` 必须有三段式 `permission`（`^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*:[a-z][a-z0-9_-]+$`）——「按钮没码」= 永远没权；「菜单没路径」= 前端 404 |
| R14 | `menu_type=C` 的 `path` 全树不能重复（排除自己与软删除项），否则路由跳转随机 |
| R15 | 菜单管理 UI 必须能**从前端路由表回填** `path/component/name/permission`（推荐 `<base-select>` 读 `router.options.routes`），防双源漂移 |

**后续迭代**：权限集合加缓存（当前每次请求查库）；岗位级数据权限；自定义数据权限规则；OAuth2 / SSO；
与 `fastapi-auth-module-skill` 保持 API 字段完全一致。

---

## 五、universal-login-api（多系统账户互通）

> **唯一权威声明**：第三方应用接入 / 应用密钥 / 账户绑定 三类需求，本技能是唯一权威。
> **不定义账户表、不定义角色表、不定义 RBAC**：账户 = 宿主 `{prefix}_sys_user`（auth 模块提供）；
> 角色/菜单/权限 = 宿主 `*_sys_role` / `_sys_menu` / `_sys_user_role` / `_sys_role_menu`。

**定位**：让第三方系统直接复用宿主账户体系，不再各建一套用户表。**不做**：不生成登录/注册/找回密码/
验证码/JWT；不生成角色与菜单；不生成统一响应信封（宿主已有）。**依赖** `springboot-init-skill` +
`springboot-auth-module-skill`（绑定锚点用 `sys_user.id`）。

| 概念 | 落地 | 说明 |
|------|------|------|
| 宿主账户 | `wg_sys_user` | 唯一身份来源，本模块**只是引用**它 |
| 应用（App） | `wg_sys_app` | 接入的业务系统。只有公开标识 `app_key`，**无密钥字段** |
| 应用密钥 | `wg_sys_app_key` | 应用级凭证唯一存放处：`api_key` + `api_secret`，可多组、可轮换 |
| 绑定 | `wg_sys_app_binding` | `sys_user_id` ↔ `app_id`（+ 应用侧 `app_user_id`） |
| 绑定码 | `wg_sys_bind_code` | 一次性、5 分钟有效的绑定凭证，**落库** |

```sql
wg_sys_app          id, app_name, app_key, description, logo, callback_url,
                    status, owner_id, created_at, updated_at, deleted_at   ★ 无 app_secret
wg_sys_app_key      id, app_id, key_name, api_key, api_secret,
                    status, last_used_at, created_at, deleted_at          ★ api_secret 仅创建时返回一次
wg_sys_app_binding  id, sys_user_id, app_id, app_user_id, app_user_name,
                    bind_type, is_default, bind_at, created_at, deleted_at   UNIQUE (sys_user_id, app_id)
wg_sys_bind_code    id, code, direction, app_id, sys_user_id, app_user_id, app_user_name,
                    status, expire_at, used_at, created_at
                    ★ 一次性；direction = app_initiated / user_initiated
```

**不建的表**：`sys_main_account`、`sys_role`、`sys_permission`、`sys_captcha`（重复建表 = 双权威）。

```
A 应用管理（宿主登录 + 权限码）
  GET    /api/apps / /api/apps/{id}    system:app:list
  POST   /api/apps                     system:app:create     PUT /api/apps/{id}  system:app:edit
  DELETE /api/apps/{id}                system:app:delete
  GET|POST /api/apps/{id}/keys         system:app:key-manage
  DELETE /api/apps/{id}/keys/{keyId}   system:app:key-manage
B 账户绑定（宿主登录 + 权限码）
  GET /api/bind/list                account:bind:list
  POST /api/bind/code               account:bind:create      宿主发起：生成绑定码
  POST /api/bind/confirm            account:bind:create      宿主确认：用码完成绑定
  DELETE /api/bind/{id}             account:bind:delete      解绑（仅自己）
  PUT /api/bind/{id}/default        account:bind:set-default
C 开放接口（应用级签名，hasAuthority("APP")）
  POST /api/open/bind/apply          应用为其用户申请绑定码
  POST /api/open/bind/claim          应用认领宿主生成的绑定码
  GET  /api/open/userinfo?appUserId= 换取宿主用户信息
```

**应用级签名鉴权**：`HmacSHA256` + 时间戳 + nonce，保护 `/api/open/**`。

```
流程一 应用发起 → 宿主确认
1 用户在第三方应用 B 点「绑定到我的宿主账号」
2 应用 B 后端（AppKey 签名）POST /api/open/bind/apply { appUserId, appUserName }
  → { code, direction: "app_initiated", expireSeconds: 300 }
3 用户被引导到宿主系统，若未登录先登录
4 宿主前端 POST /api/bind/confirm { code }   ← 身份来自 JWT，不收密码
5 落库 wg_sys_app_binding(sys_user_id = 当前用户, app_id, app_user_id)
6 应用 B 之后可用 GET /api/open/userinfo?appUserId=xxx 换宿主用户信息

流程二 宿主发起 → 应用认领（扫码）
1 宿主用户 POST /api/bind/code { appId } → { code, direction: "user_initiated" }（sys_user_id 此刻已写入）
2 用户把 code（或二维码）交给第三方应用 B
3 应用 B 后端（AppKey 签名）POST /api/open/bind/claim { code, appUserId, appUserName }
4 绑定完成，code 立即失效
```

**共同硬约束**：绑定码落库、5 分钟有效、**一次性消费**（并发下用 `UPDATE ... WHERE status = 0`
的受影响行数判定，返回 0 即报 `-1005`）。

**错误码（沿用宿主负数表）**：`-1001` 参数校验失败 / 绑定码方向不匹配；`-1002` 未登录 / 签名无效 /
时间戳过期；`-1003` 无权操作该应用·绑定 / 应用被禁用；`-1004` 应用·密钥·绑定不存在 / 绑定码无效；
`-1005` 已绑定同一应用 / 绑定码已被使用。

| # | 红线（理由） |
|---|------|
| U1 | **禁止自建账户表与角色表**，账户一律用宿主 `wg_sys_user`（自建即产生第二套账户，绑定没有落点） |
| U2 | 表名统一 `wg_sys_*`，**禁止** `sys_` 裸前缀（历史上一库三前缀） |
| U3 | **禁止 `permitAll` 放行** `/api/apps/**`、`/api/bind/**`、`/api/open/**`（未登录可读他人绑定、改他人应用） |
| U4 | `/api/bind/**` 与 `/api/apps/**` **必须**登录 + `@PreAuthorize`；`/api/open/**` **必须**签名鉴权授予 `APP`；只写 `authenticated()` 视为未完成 |
| U5 | **禁止硬编码用户**（`Long userId = 1L`），一律 `@CurrentUser`（否则任意人看到 admin 的绑定） |
| U6 | 绑定类操作**必须**校验归属（`binding.sysUserId == 当前用户`） |
| U7 | `bindCode` **必须**落库 + 有效期 + 一次性消费，**禁止**只返回不保存（否则可无限重放） |
| U8 | `confirm` **禁止**接收/要求主账户密码，身份一律取自登录态 |
| U9 | `api_secret` **只在创建响应返回一次**（`CreatedAppKeyVO`）；列表/详情出参**禁止**含 secret；**禁止** `setApiSecret(null)` 后返回实体 |
| U10 | `App` **禁止**存密钥，密钥只在 `wg_sys_app_key`（两处并存会绕过轮换） |
| U11 | **禁止实体直接作为入参/出参**，一律 DTO（防 mass assignment） |
| U12 | **禁止**在迁移脚本中写死账号、明文密码、公共 BCrypt 哈希（泄漏且不可轮换） |
| U13 | 所有删除为软删除（`deleted_at`） |
| U14 | 密钥/绑定码生成用 `SecureRandom`，**禁止** `UUID.randomUUID()` 截断（熵不足） |
| U15 | 注释、文档用中文 |

**交付自检**：无 `sys_main_account`/`sys_role`/`sys_permission`；表名全 `wg_sys_*`；无 `permitAll`；
每端点有 `@PreAuthorize`；`grep -rn "1L" controller/ service/` 无命中；`BindCode` 有落库 +
`consumeByUser/consumeByApp` 受影响行数校验；`BindConfirmRequest` 只有 `code`；`AppKeyVO` 无 `apiSecret`；
`App` 实体无 `appSecret`；迁移脚本无明文密码/固定 BCrypt 哈希；三方权限码 diff 零差集。
**交付物**：`api-contract-universal-login.md`、`references/security-integration.md`
（`SecurityConfig` 两处必改 + 客户端签名示例 + 自检）。

---

## 六、dict 模块（springboot-dict-module-skill）

**能力**：字典类型 / 字典项 CRUD / 系统配置（参数管理）/ Redis 缓存 / RESTful API。

**表**：`wg_dict_type`（`id`/`name`/`code`(唯一,50)/`description`(500)/`status` 默认 1/时间戳三件套）、
`wg_dict_item`（`id`/`dict_type_id`/`label`/`value`/`sort` 默认 0/`status` 默认 1/时间戳三件套）、
`wg_sys_config`（`id`/`config_key`(唯一,100)/`config_value`(500)/`config_type` 默认 `string`/
`description`/`status` 默认 1/`created_at`/`updated_at`）。

**缓存**：`getDictItems(typeCode)` 先查 Redis `dict:{typeCode}`，未命中查库后
`set(key, items, 30, TimeUnit.MINUTES)`；字典项增删改**必须**调 `refreshDictCache(typeCode)`
（`redisTemplate.delete(key)`）主动失效。

**接口**：`GET /api/dicts/types`（分页）、`POST|PUT|DELETE /api/dicts/types[/{id}]`、
`GET /api/dicts/types/{typeCode}/items`、`POST|PUT|DELETE /api/dicts/items[/{id}]`、
`GET /api/dicts/public/types/{typeCode}/items`（**公开查询，无需鉴权**）。
权限码 `dict:type:add|edit|delete`、`dict:item:add|edit|delete`、`config:edit`。

**DTO**：`DictTypeResponse{id, typeCode, typeName, remark, createdAt}`；
`DictItemResponse{id, typeCode, itemLabel, itemValue, sortOrder, status, remark}`；
`CreateDictTypeRequest{typeCode(必填,1-64,唯一), typeName(必填,1-128), remark}`；
`CreateDictItemRequest{typeCode(必填,须已存在), itemLabel(必填,1-128), itemValue(必填,1-256),
sortOrder(默认 0), status(默认 1)}`。
**错误码扩展**：`-3001` 字典类型已存在、`-3002` 字典类型不存在、`-3003` 字典项已存在。
**不做**：不负责前端页面；不处理敏感配置加密；不提供配置变更审计日志。

---

## 七、log 模块（springboot-log-module-skill）

**能力**：操作日志 / 登录日志 / 审计追踪 / 分页查询与导出。
**表**：`wg_operation_log`（`id`/`userId`/`username`/`module`/`operation`/`method`/`path`/`params`(TEXT)/
`result`(TEXT)/`ip`/`location`/`duration`/`createdAt`）；
`wg_login_log`（`id`/`userId`/`username`/`status`/`ip`/`location`/`userAgent`/`message`/`createdAt`）。
**注解式记录**：`@OperationLog(module="", operation="")`（`METHOD` + `RUNTIME`），由 `OperationLogAspect`
的 `@Around("@annotation(operationLog)")` 环绕记录。
**接口**：`GET /api/logs/operation`（分页）、`GET /api/logs/operation/{id}`、`GET /api/logs/login`、
`DELETE /api/logs/operation`（按日期清理）、`DELETE /api/logs/login`（按日期清理）。
**DTO**：`OperationLogResponse{id, userId, username, module, action(CREATE/UPDATE/DELETE/QUERY), method,
url, ip, status, costTime, createdAt}`；`LoginLogResponse{id, userId, username, ip, userAgent,
status(SUCCESS/FAILED), message, createdAt}`。
**不做**：不负责日志存储；不处理日志分析（ELK 等专门工具）。

---

## 八、notification 模块（springboot-notification-module-skill）

**能力**：短信（验证码/通知）、邮件（HTML/文本/模板）、站内消息（系统通知/未读）、推送（极光/信鸽/个推）、
消息模板管理与渲染。**依赖** `com.aliyun:dysmsapi20170525`、`spring-boot-starter-mail`、
`spring-boot-starter-data-redis`。
**配置**：`sms.aliyun.{access-key, secret-key, sign-name, template-code}`（走 `SMS_*` 环境变量）；
`spring.mail.{host: ${MAIL_HOST:smtp.qq.com}, port: 587, username, password}` + `mail.smtp.auth=true` +
`mail.smtp.starttls.enable=true`；`notification.redis-key-prefix: notification:`。
**表**：`wg_notification`（`id`/`userId`/`title`/`content`(text)/`type`(enum `SYSTEM`/`SMS`/`EMAIL`/`PUSH`)/
`link`/`isRead`/`createdAt`）；`wg_sms_code`（`id`/`phone`/`code`/`templateCode`/`expireTime`/`used`/`createdAt`）。
**关键实现**：验证码 6 位、`expireTime = now + 5 分钟`；站内消息落库后
`redisTemplate.convertAndSend("notification:" + userId, notification)` 推送在线用户。
**接口**：`POST /api/notifications/send`、`GET /api/notifications`（分页）、
`GET /api/notifications/unread-count`、`PUT /api/notifications/{id}/read`、`PUT /api/notifications/read-all`、
`POST /api/notifications/sms/send`（**免鉴权**）、`POST /api/notifications/sms/verify`（**免鉴权**）、
`POST /api/notifications/email/send`。
**DTO**：`NotificationResponse{id, title, content, type(system/message/alert), isRead, createdAt}`；
`SendNotificationRequest{userId(必填), title(必填), content(必填), type(默认 system)}`。
**错误码扩展**：`-3001` 短信发送失败、`-3002` 验证码无效、`-3003` 验证码过期（默认 5 分钟）、
`-3004` 发送过于频繁（同一手机号 60s 内重复发送）、`-3005` 邮件发送失败（SMTP 异常）。
**不做**：不负责服务商账号配置；不处理复杂推送策略；不提供 UI 代码。

---

## 九、redis 模块（springboot-redis-module-skill）

**能力**：`@Cacheable` 注解缓存 / Redis Session 共享 / Redisson 分布式锁 / Redis 限流 /
Redis Stream 发布订阅 / 分布式计数器与排行榜。**依赖** `spring-boot-starter-data-redis` +
`org.redisson:redisson-spring-boot-starter`（3.24.3）。
缓存：`RedisConfig` 加 `@EnableCaching`；`@Cacheable(value="users", key="#id")` / `@CachePut` / `@CacheEvict`。
分布式锁：`redisson.getLock(lockKey)` + `try/finally unlock()`；或 `lock.tryLock(waitTime, leaseTime, unit)`
返回 boolean。限流：`opsForValue().increment(key)`；`value == 1` 时 `expire(key, windowSeconds, SECONDS)`；
返回 `value <= maxRequests`；超限抛 `BusinessException(-429, "请求过于频繁，请稍后再试")`。
Session：`spring.session.store-type=redis`，`spring.session.redis.namespace=wg:session`。
Stream：`opsForStream().add(StreamRecords.newRecord().in(stream).ofMap(map))`；消费
`StreamReadOptions.empty().count(10).block(Duration.ofSeconds(2))` +
`StreamOffset.create("my-stream", ReadOffset.lastConsumed())`。
配置：`spring.data.redis.{host: ${REDIS_HOST:localhost}, port: ${REDIS_PORT:6379}, password, database}` +
`lettuce.pool.{max-active 8, max-idle 8, min-idle 2, max-wait -1ms}`；
`redisson.{address: redis://…, password, database}`。
**不做**：不负责安装 Redis；不处理集群配置（单节点为主）；不提供数据迁移工具。

---

## 十、kafka 模块（springboot-kafka-module-skill）

**能力**：生产者（同步/异步、分区、key）、消费者（监听、重试、消费者组）、JSON/Avro/ProtoBuf 序列化、
事务消息、拦截器、Kafka Streams。**依赖** `org.springframework.kafka:spring-kafka`。
生产者：`kafkaTemplate.send(topic, key, message)`；同步 `future.get(10, TimeUnit.SECONDS)`；异步
`.addCallback(success, failure)`，成功记 `success.getRecordMetadata().topic()/partition()/offset()`。
消费者：`@KafkaListener(topics = "my-topic", groupId = "my-group")`；批量消费需
`containerFactory = "batchKafkaListenerContainerFactory"` 且入参 `List<ConsumerRecord<String, String>>`；
错误处理 `errorHandler = "kafkaErrorHandler"`。
事务消息：`@Transactional` + `kafkaTemplate.executeInTransaction(operations -> { operations.send(...);
return true; })`，要么全成功要么全回滚。
参数：生产者 `acks=all`、`retries=3`、`batch-size=16384`、`buffer-memory=33554432`；消费者
`enable-auto-commit=false`、`auto-offset-reset=earliest`；监听器 `ack-mode: manual_immediate`、`concurrency: 3`。
JSON 反序列化：`JsonDeserializer` 必须 `addTrustedPackages("*")`（或 `spring.json.trusted.packages: "*"`）。
错误处理：`KafkaErrorHandler implements ErrorHandler` 记 topic/partition/offset/key/value/error，
可选发死信队列或告警。
**不做**：不负责安装 Kafka；不处理集群配置（单节点为主）；不提供消息持久化策略；不处理 Kafka Connect。

---

## 十一、upload 模块（springboot-upload-module-skill）

**能力**：单文件/多文件/分片上传、本地存储、OSS 存储（阿里云 OSS / 腾讯云 COS）、
图片处理（缩略图·水印·格式转换）、附件 CRUD 与分类。
**配置** `upload.*`：`storage-type: local`（local/aliyun/tencent）、`local.path: ./uploads`、
`local.domain: http://localhost:8080`、`allowed-types: jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,zip`、
`max-size: 10485760`。**环境变量** `UPLOAD_MAX_SIZE`（默认 10MB）、`UPLOAD_ALLOWED_TYPES`（默认
jpg,jpeg,png,gif,pdf）、`UPLOAD_DIR`（默认 `./uploads`）。
**本地存储**：UUID 文件名 + 按 `yyyy/MM/dd` 分目录 + `file.transferTo(filePath.toFile())`，返回
`domain + "/uploads/" + datePath + "/" + filename`。
**接口**：`POST /api/upload`（`@RequestParam("file")` 单文件）、`POST /api/uploads`
（`@RequestParam("files")` 多文件，逐个校验 + 逐个容错）、`GET /api/files`（分页）、`GET /api/files/{id}`、
`DELETE /api/files/{id}`。
**`validateFile` 三步**：空文件 → 大小超 `max-size` → 扩展名不在 `allowed-types`（转小写比较），
分别抛业务异常。
**DTO**：`UploadResponse{id, url, filename, size, mimeType, createdAt}`；
`FileResponse{id, url, filename, size, mimeType, uploaderId, createdAt}`。
**附件表** `wg_attachment`（`id`/`filename`/`file_path`/`file_url`/`file_size`/`content_type`/`file_ext`/
`category`(avatar/article/attachment)/`uploader_id`/`created_at`/`deleted_at`）。
**错误码扩展**：`-1031` 请求体过大、`-1032` 不支持的文件类型。
**不做**：不提供文件预览服务；不处理版权和合规审查；不提供 CDN 加速。

---

## 十二、storage 模块（springboot-storage-module-skill）

与 upload 的区别：**面向大文件、分片、压缩、下载预览**，存储后端更多。
**能力**：小文件直接上传（< 10MB）/ 大文件分片上传 + 断点续传（≥ 10MB）/ 可选压缩存储 /
流式与断点续传下载 / 图片·视频·文档在线预览 / 存储策略（local·aliyun·tencent·minio）/ 附件管理 / 图片处理。
**配置** `storage.*`：`type: local`、`max-size: 104857600`（100MB）、
`allowed-types: jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,zip,mp4,mp3`；`chunk.enabled=true`、
`chunk.size=5242880`（5MB/片）、`chunk.threshold=10485760`（10MB 触发分片）；`compress.enabled=false`、
`compress.types=jpg,jpeg,png`、`compress.quality=0.8`、`compress.max-size=1048576`。

```
src/main/java/{basePackage}/storage/
├── common/ StorageConstants · StorageException      ├── config/ StorageConfig
├── controller/ UploadController · DownloadController · AttachmentController
├── dto/ UploadResult · ChunkUploadInit · ChunkUploadRequest · AttachmentDTO
├── entity/ Attachment · ChunkInfo                   ├── repository/ AttachmentRepository · ChunkInfoRepository
└── service/ StorageService（策略接口）
             impl/ LocalStorageService · OssStorageService · CosStorageService · MinioStorageService
             UploadService · DownloadService · AttachmentService
src/main/resources/db/migration/V20__init_storage_module.sql
api-contract-storage.md · docs/storage-module-guide.md
```

**存储策略接口**：`upload(InputStream, key, contentType) → url` / `delete(key)` / `getUrl(key)` /
`download(key) → InputStream`。
**上传主流程**：`upload(file, category)` → `validateFile` → `needChunkUpload(file) ? chunkUpload :
directUpload`；directUpload 内按 `needCompress` 决定是否先压缩，再存储并落 `Attachment` 记录。
**分片流程**：`init` 生成 `uploadId`（UUID）→ `totalChunks = ceil(fileSize / chunkSize)` →
落 `wg_chunk_info`（`status` 0 上传中 / 1 已完成 / 2 已取消）→ 逐片传 key `chunks/{uploadId}/{index}`
→ `merge` 合并 → 返回 `UploadResult`。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/storage/upload | 上传文件（自动判断小/大文件） |
| POST | /api/storage/upload/chunk/init | 初始化分片上传 |
| POST | /api/storage/upload/chunk/{uploadId}/{index} | 上传分片 |
| POST | /api/storage/upload/chunk/{uploadId}/merge | 合并分片 |
| GET | /api/storage/upload/chunk/{uploadId}/chunks | 获取已上传分片（断点续传） |
| GET | /api/storage/download/{id} · /api/storage/preview/{id} | 下载 / 预览文件（预览支持 Range 请求） |
| GET | /api/storage/attachment/list · /{id} | 附件列表 / 详情 |
| DELETE | /api/storage/attachment/{id} | 删除附件 |

预签名直传形态：`POST /api/storage/upload/presigned`、`GET /api/storage/files`、
`GET|DELETE /api/storage/files/{id}`、`GET /api/storage/files/{id}/download`。

```sql
{prefix}_attachment  id, filename, file_path, file_url, file_size, content_type, file_ext,
                     category(默认 default), storage_type, uploader_id, is_compressed(默认 0),
                     created_at, deleted_at    索引 idx_category / idx_uploader / idx_created
{prefix}_chunk_info  id, upload_id(UNIQUE), filename, file_size, chunk_size, total_chunks,
                     status(默认 0), created_at, updated_at
```

**DTO**：`StorageFileResponse{id, bucket, objectKey, url, filename, size, mimeType, etag, createdAt}`；
`PresignedUrlResponse{uploadUrl, objectKey, expiresIn}`。
**错误码扩展**：`-3001` 存储服务不可用、`-3002` 存储桶不存在、`-3003` 文件已过期。
**红线**：不重复生成基础骨架；表名统一 `{prefix}_attachment`、`{prefix}_chunk_info`；
所有删除为软删除；**分片上传必须支持断点续传**；压缩功能必须可配置开关；注释文档用中文。

---

## 十三、支付（合并 payment / wechat-pay / alipay-pay 三个技能）

> 源仓库有三个支付技能：`springboot-payment-module-skill`（微信 + 支付宝合一，**旧版已不推荐**）、
> `springboot-wechat-pay-skill`（仅微信 V3 ⭐推荐）、`springboot-alipay-pay-skill`（仅支付宝 ⭐推荐）。
> **新项目应分别引入两个独立 skill，避免代码耦合。**

**通用约定**：**金额单位必须区分**——微信支付用**分**（`Long`），支付宝用**元**（`BigDecimal`，
`DECIMAL(10,2)`）；状态机 `PayStatus{ PENDING, PAID, CLOSED, REFUNDED }` /
`RefundStatus{ PENDING, SUCCESS, FAILED }`；回调必须**先验签再处理**，处理完必须返回约定格式的成功应答，
否则第三方重发；同一 `orderNo` 重复下单必须业务方保证唯一 + Redis 幂等防重（`springboot-redis-module-skill`
为推荐前置）；公网 HTTPS 回调地址是硬性前提（内网穿透用 frp）。
**通用「不做」**：不负责商户号开通与证书申请（见源仓库 `references/merchant-onboarding.md`）；不提供 UI 组件。

### 13.1 微信支付 V3（springboot-wechat-pay-skill）

**强制 V3**：V2 SDK（`com.github.wxpay:wxpay-sdk 3.0.10`）已停更。依赖
`com.github.wechatpay-apiv3:wechatpay-java`（0.2.18）+ `org.apache.httpcomponents:httpclient`。

| 方法 | 路径 | 场景 |
|------|------|------|
| POST | /api/wechat-pay/jsapi · /miniprogram · /h5 · /native · /app | 公众号网页 / 小程序 / 手机浏览器 / PC 扫码 / App |
| POST | /api/wechat-pay/refund | 退款（全渠道） |
| GET | /api/wechat-pay/query/{orderNo} | 查询订单（全渠道） |
| POST | /api/wechat-pay/close/{orderNo} | 关单（全渠道） |
| GET | /api/wechat-pay/bill?date=YYYY-MM-DD | 下载对账单 |
| POST | /api/wechat-pay/notify · /refund-notify | 支付 / 退款回调（免鉴权，V3 验签） |

**必填配置**：`app-id`、`mch-id`、`private-key-path`（`apiclient_key.pem`）、`merchant-cert-path`
（`apiclient_cert.pem`）、`api-cert-serial-no`、`api-v3-key`、`notify-url`；可选 `refund-notify-url`、
`connect-timeout-ms: 5000`、`read-timeout-ms: 10000`。
**客户端构建**：`PemUtil.loadPrivateKeyFromFile` + `PemUtil.loadCertificateFromFile`，配
`AutoUpdateCertificatesVerifier`（自动下载并定时刷新平台证书），再
`new WechatpayClient.Builder().merchantId(..).merchantSerialNumber(..).privateKey(..)
.wechatpayCertificates(verifier).build()`。
**回调验签（5 步）**：① 取头 `Wechatpay-Timestamp` / `Wechatpay-Nonce` / `Wechatpay-Signature` /
`Wechatpay-Serial`；② 拼 `timestamp + "\n" + nonce + "\n" + body + "\n"`；
③ `verifier.verify(serial, signStr, signature)`；④ 用 `AesUtil.decryptToString(associated_data, nonce,
ciphertext, apiV3Key)` 解密 `resource`（AES-256-GCM）；⑤ 取 `out_trade_no` / `transaction_id` 更新订单。
成功返回 `{"code":"SUCCESS","message":"成功"}`，失败返回 `{"code":"FAIL","message":"失败"}`。
**表**：`wg_wechat_pay_order`（`order_no` UNIQUE / `transaction_id` / `scene`
(JSAPI·MINI_PROGRAM·H5·NATIVE·APP) / `status` / `amount`（**分**）/ `description` / `openid` /
`prepay_id` / `code_url` / `paid_at` / 时间戳）；`wg_wechat_refund_order`（`refund_no` UNIQUE /
`order_no` / `refund_id` / `refund_amount` / `total_amount`（分）/ `status` / `reason` / `refunded_at`）。
**错误码扩展**：`-3001` 统一下单失败、`-3002` 回调签名无效、`-3003` 订单不存在、`-3004` 订单已支付、
`-3005` 退款失败、`-3006` 关单失败（订单已支付无法关闭）、`-3007` 证书错误、`-3008` 平台证书获取失败。
**关键踩坑**：平台证书不刷新 → 用 `AutoUpdateCertificatesVerifier`；回调 5xx → 业务逻辑放异步、
主流程立即返回 SUCCESS；重复下单 → 业务保证 `orderNo` 唯一 + Redis 幂等；退款金额 > 原单 → 校验
`refundAmount <= totalAmount`；沙箱 → `https://api.mch.weixin.qq.com/sandboxnew`。

### 13.2 支付宝（springboot-alipay-pay-skill）

依赖 `com.alipay.sdk:alipay-sdk-java`（4.35.2.ALL）。

| 方法 | 路径 | 场景 |
|------|------|------|
| POST | /api/alipay/trade/precreate · /wap · /page · /app | 当面付（条码/扫码）/ 手机网站（返回 form）/ PC 网站（跳转）/ App（返回 orderStr） |
| POST | /api/alipay/trade/refund | 退款（全渠道） |
| GET | /api/alipay/trade/query/{orderNo} | 查询订单 |
| POST | /api/alipay/trade/close/{orderNo} | 关单 |
| GET | /api/alipay/bill?date=YYYY-MM-DD | 下载对账单 |
| POST | /api/alipay/notify | 支付回调（免鉴权，RSA2 验签） |

**配置**：`app-id`（16 位数字，沙箱 `2021000000000000`）、`private-key`（pkcs8 商户应用私钥）、
`alipay-public-key`（**支付宝公钥，不是应用公钥**）、`notify-url`、`return-url`、`gateway-url`
（生产 `https://openapi.alipay.com/gateway.do`，沙箱 `https://openapi.alipaydev.com/gateway.do`）、
`sign-type: RSA2`、`charset: UTF-8`、`format: json`。
**产品码**：WAP → `QUICK_WAP_WAY`；PC → `FAST_INSTANT_TRADE_PAY`；App → `QUICK_MSECURITY_PAY`。
**调用方式**：当面付/退款/查询/关单用 `client.execute(request)`；WAP/PC 用
`client.pageExecute(request).getBody()`；App 用 `client.sdkExecute(request).getBody()`。
**回调验签**：form 参数全量收进 Map → `AlipaySignature.rsaCheckV1(params, alipayPublicKey, "UTF-8",
"RSA2")` → `trade_status` ∈ `TRADE_SUCCESS` / `TRADE_FINISHED` 才置为已支付 → 必须返回小写 `success`（不带空格）。
**表**：`wg_alipay_pay_order`（`order_no` UNIQUE / `trade_no` / `scene`(PRECREATE·WAP·PAGE·APP) /
`status` / `amount`（**元** DECIMAL(10,2)）/ `subject` / `qr_code` / `pay_url` / `paid_at`）；
`wg_alipay_refund_order`（同微信结构的元单位版本）。
**错误码扩展**：`-3001` 统一下单失败、`-3002` 回调签名无效、`-3003` 订单不存在、`-3004` 订单已支付、
`-3005` 退款失败、`-3006` 关单失败、`-3007` 密钥错误（应用公钥/支付宝公钥错）。
**关键踩坑**：回调验签失败 → 用了应用公钥而非**支付宝公钥**；WAP 跳到登录页 → 沙箱限制，切生产；
异步通知收不到 → 回调地址必须公网 HTTPS；App 支付 iOS 无反应 → 必须用 `client.sdkExecute(request).getBody()`。

### 13.3 合一版（旧，不应使用）

`/api/payments/create`、`/api/payments/{id}`、`/api/payments`（分页）、`/api/payments/notify/wechat`、
`/api/payments/notify/alipay`、`/api/payments/{id}/refund`；错误码扩展同 `-3001`~`-3005`。

---

## 十四、agent 模块（springboot-agent-module-skill）

基于 **Spring AI 1.0** 实现对话 Agent，要求 **JDK 17+**。在 init 骨架 + auth 模块之上叠加。
**用户问题（最多 3 个）**：用什么模型（默认 OpenAI `gpt-4o-mini`，可选 Claude/DeepSeek/本地模型）；
需要哪些内置 Tool（默认：查用户信息、查角色、查菜单、查组织、查岗位、查租户）；
是否开启历史消息（默认开启，保留 20 轮）。

**核心能力（18 项）**：Spring AI ChatClient + Function Calling；声明式 Tool（Jakarta Bean Validation
校验 + 自动权限注入）；统一 ChatModel（OpenAI/Claude/DeepSeek/Ollama + Resilience4j 退避重试）；
多轮对话（Deque 自动裁剪 + LRU 内存缓冲）；会话管理（软删除 + 级联硬删除）；租户隔离；
SSE 流式（断连检测 + 代理缓冲禁用）；Bucket4j 限流；独立审计 logger；异常脱敏；Flyway 迁移含 5 个关键索引；
单事务消息写入；测试基建（20+ 安全/一致性/性能测试）；Prompt Injection 双向防护；PII 加密；trace_id 关联；
安全响应头复用骨架；模型白名单。

| Tool（全部带 userId 强制注入） | 功能 | 参数 | 权限 |
|------|------|------|------|
| `getUserInfo` / `getUserRoles` / `getUserMenus` | 当前用户信息（脱敏）/ 角色 / 菜单权限 | userId（系统注入） | 仅查自己 |
| `searchUsers` | 搜索用户（脱敏：ID/用户名/昵称） | keyword?, limit ∈ [1,50] | 限流 |
| `getOrgTree` / `getOrgDetail` | 当前租户组织架构树 / 部门详情 | userId（+ orgId） | 租户隔离 |
| `getPostList` | 当前租户岗位（分页） | userId, status?, page?, pageSize ∈ [1,50] | 租户隔离 |
| `getTenantInfo` | 当前用户所属租户 | userId | 仅查自己 |
| `safeReadFile` | 读取项目内受限文本文件 | path, maxSize?, userId | 路径白名单 + 大小 + UTF-8 + 审计 |
| `safeWriteFile` | 写入项目内文件 | path, newContent, confirm, userId | diff 预览 + 白名单 + 大小 + 审计 |

**文件 Tools 四重防护**：路径白名单（仅 `PROJECT_ROOT` 下，拦截 `/etc` `/root` `~/.ssh` `/var/log`）、
大小限制（读默认 100KB、写默认 1MB）、编码限制（仅 UTF-8 文本）、审计日志。
**写文件必须两步**：`confirm=false` 返回 diff 预览不落盘 → `confirm=true` 二次调用才真正写。
> ⚠️ **严禁**把 `PROJECT_ROOT` 设为 `/`、`/home` 等宽泛目录。

**模块结构**：`config/`（AgentProperties + AgentAutoConfiguration）、`controller/`（AgentChatController ·
AgentSessionController · AgentToolController）、`service/`、`agent/`（AgentRunner · ToolExecutor ·
MemoryManager · PromptSanitizer）、`tool/`（AgentTool 注解 · BaseTool · UserTools · OrgTools · FileTools ·
ToolRegistry）、`entity/`（AgentSession · AgentMessage）、`repository/`、`dto/`、`enums/ChatErrorCode`、
`audit/AgentAuditLogger`、`security/PiiEncryptor`、`trace/TraceIdFilter`；迁移 `V20__init_agent_module.sql`。

**工作流**：用户输入 → Jakarta Validation → 归属校验（`sessionId → userId == @CurrentUser`）→ AgentRunner
构建 ChatClient（加载历史 + 注入 System Prompt + 注册 Functions）→ Spring AI `call()`/`stream()` →
ToolExecutor 并发执行 Tools（`CompletableFuture.allOf()`；userId 系统注入、Bean Validation 校验、
异常脱敏 + 审计、结果用 `<tool_result name="...">` 包裹）→ LLM 总结 → 流式 `SseEmitter` 逐 token /
同步一次性返回（**硬截断 50000 字符**）→ 单事务持久化用户与助手消息 → MemoryManager 更新缓冲。

- 归属校验：跨用户访问返回 `-1001`；历史消息加载用 JPQL JOIN 同时校验归属。
- Tool 权限注入：`userId` 参数**必须无默认值**，由 `ToolExecutor.execute(toolName, userId, args)` 显式注入，
  LLM 无法通过 `arguments` 篡改。
- 异常脱敏：客户端只收固定话术（如「对话处理失败，请稍后重试」），SSE error 事件不含堆栈；
  真实异常写 `log.error("...", e)`。日志只记参数名 + 类型不记值，PII（password/token/email/phone）自动遮蔽。
- 审计：独立 logger `agent.audit`（logback 独立 appender，按天滚动），记录 tool_call / tool_failure /
  chat_failure / token_usage / rate_limit_hit，字段 userId、sessionId、toolName、argsHash（SHA256）、
  success、error、duration。
- 限流（Bucket4j）：`POST /api/agent/chat` 10 次/分钟/用户，`GET /api/agent/sessions` 30 次/分钟/用户；
  命中记审计 + 429 + `Retry-After` 头；Redis 分布式限流 + 本地内存降级。
- 事务一致性：`chat()` 用 `@Transactional` 单事务保存；流式用 `firstChunkReceived` 标志保证首个 token
  到达才保存用户消息；异常回滚无幽灵消息。
- SSE 断连检测：客户端断开立即终止 LLM 流（避免 token 计费继续），超时 `SseEmitter(120_000L)`。
- Prompt Injection：输出侧 Tool 结果用 `<tool_result>` XML 标签包裹 + System Prompt 声明其为数据；
  输入侧 `PromptSanitizer.sanitize()` 对用户输入做 XML 标签转义。
- 索引（Flyway）：`ix_{prefix}_agent_session_user_updated`（排序）、`..._user_deleted`（软删除过滤）、
  `..._user_id`（归属校验）、`ix_{prefix}_agent_message_session_created`（历史加载）、`..._session_role`。
- LLM 可靠性：ChatClient `timeout=60s`；Resilience4j 指数退避重试（最多 3 次，retryOn
  `TimeoutException`/`ConnectionException`）。
- PII 加密：`PiiEncryptor.encrypt()/decrypt()/mask()/isPiiField()/safeLogArgs()`，Fernet 对称加密
  （AES-128-CBC + HMAC-SHA256），密钥走 `PII_ENCRYPTION_KEY`。
- trace_id：`TraceIdFilter` 从 `X-Trace-Id` 头读取并注入 MDC，响应头回写 `X-Trace-Id`。
- 模型白名单：`{ gpt-4o-mini, gpt-4o, gpt-4-turbo, claude-3-haiku, claude-3-sonnet, claude-3.5-sonnet,
  deepseek-chat }`，客户端无法指定白名单外模型。
- 错误码 `ChatErrorCode`：0 / -1 / -1001 / -1002 / -429 / -5001 / -5002 / -5003 / -5000，
  SSE 错误事件含 `errorCode` 字段。

```
POST /api/agent/chat                          流式对话（SSE）            10/min
POST /api/agent/chat/sync                     同步对话                   10/min
GET  /api/agent/sessions                      会话列表（分页）           30/min
POST /api/agent/sessions                      创建会话                   30/min
GET  /api/agent/sessions/{id}                 会话详情                   30/min
DELETE /api/agent/sessions/{id}               删除会话（?hard=true 硬删） 30/min
GET  /api/agent/sessions/{id}/messages        会话消息（分页）           30/min
POST /api/agent/sessions/{id}/clear-memory    清除内存记忆               30/min
GET  /api/agent/tools                         可用工具列表               30/min

SSE 事件：message {"content":"你好","role":"assistant"} · tool_call {"name":"getUserInfo","args":{},"result":{...}}
          usage {"promptTokens":120,"completionTokens":85,"totalTokens":205}
          error {"code":-5001,"message":"对话处理失败，请稍后重试"}
          done {"sessionId":123,"messageId":456} · warning {"message":"响应已截断（超过50000字符）"}
```

**配置（`.env` 扩展）**：`AGENT_DEFAULT_MODEL` / `AGENT_TEMPERATURE` / `AGENT_MAX_TOKENS` /
`AGENT_MEMORY_TURNS` / `AGENT_MAX_ITERATIONS` / `AGENT_TIMEOUT` / `AGENT_RATE_LIMIT_ENABLED` /
`AGENT_RATE_LIMIT_PER_MINUTE` / `AGENT_SYSTEM_PROMPT` / `OPENAI_API_KEY` / `OPENAI_BASE_URL` /
`ANTHROPIC_API_KEY` / `DEEPSEEK_API_KEY` / `PII_ENCRYPTION_KEY` / `PROJECT_ROOT` / `AGENT_ALLOWED_MODELS`。
**新增依赖**：`spring-ai-openai-spring-boot-starter`（1.0.0，核心）、
`spring-ai-anthropic-spring-boot-starter`（可选）、`spring-ai-ollama-spring-boot-starter`（可选）、
`com.bucket4j:bucket4j-core`（8.10.1）、`io.github.resilience4j:resilience4j-spring-boot3`（2.2.0）、
`com.google.crypto.tink:tink`（1.15.0），用 `spring-ai-bom` 1.0.0 统一管理版本。
**红线（18 条摘要）**：不重复生成骨架与 Auth 模块；用骨架 `ApiResponse` 不手动包装；用骨架
`GlobalExceptionHandler`；用骨架 `{prefix}` 表前缀不硬编码 `wg_`；用骨架 `.env` +
`@ConfigurationProperties` 不另定义 `AgentSettings`；Tool 用 `@AgentTool` + `userId` 必需参数；
历史默认 20 轮可配置；**流式用骨架 `SseEmitter` 不引入 WebFlux**；中文注释文档；Tool 不在 `arguments`
传 `userId`；异常不返回原始堆栈；Tool/对话失败必须写审计日志；模型必须白名单内；会话操作必须校验归属；
**用 JPA 不引入 MyBatis Plus**；迁移用 Flyway 不手动执行 SQL；安全头复用骨架；版本号不硬编码。
**与 `fastapi-agent-module-skill` 对齐**：接口路径 `/api/agent/*`、响应结构、错误码、记忆管理、限流
（slowapi ↔ Bucket4j）、重试（tenacity ↔ Resilience4j）、审计 logger、Fernet PII、trace_id、
Prompt Injection XML 包裹、模型白名单、事务一致性、SSE 断连检测、ORM（SQLModel ↔ JPA）、
迁移（Alembic ↔ Flyway）均已对齐；**唯一差异**是 Tool 命名（snake_case ↔ camelCase，属语言惯例）。
**后续迭代**：RAG 知识库（Spring AI VectorStore）；自定义 Agent 节点；LangChain4j 备选；
Langfuse/LangSmith 可观测性；多实例 Redis MemoryStore；MCP 工具扩展。

---

## 十五、org-permission 模块 —— **已废弃（DEPRECATED）**

> 本技能**不产出任何代码、表结构或契约**。组织架构 / 部门管理 / 角色权限 / RBAC / 菜单管理 /
> 数据权限六类需求，**一律改用 `springboot-auth-module-skill`**（§四）。保留条目只为让旧链接/旧触发词
> 跳到正确位置，并留下历史差异记录避免分裂再次发生。
> **废弃原因**：本技能与 auth 模块**同时**声称负责组织权限，导致 AI 触发哪个都行、生成结果不可预测。

| 维度 | 本技能（废弃） | auth 模块（权威） |
|------|----------------|-------------------|
| 组织表 | `wg_org` + `wg_dept`（两表） | `{prefix}_sys_org`（单表树 + `parent_ids`） |
| 用户 / 角色 / 菜单表 | `wg_user` / `wg_role` / `wg_menu` | `{prefix}_sys_user` / `_sys_role` / `_sys_menu` |
| 排序字段 / 菜单类型 | `sort` / `MenuType { CATALOG, MENU, BUTTON }` | `sort_order` / `String` 取值 `M`·`C`·`F` |
| 方法级鉴权 / 数据权限 / 回填接口 | 未提及 / 未定义档位 / 未提及 | **强制** / **4 档，多角色取最宽** / **强制 3 个** |
| 代码 | 全篇省略号伪代码，不可运行 | 提供可运行代码 |

**典型翻车现场**：同一项目出现三种表前缀（`{prefix}_sys_*` / `{prefix}_user` / `sys_*`），
「分配菜单」永远回填空树，后端零 `@PreAuthorize`。其 `api-contract-org-permission.md` 顶部已加废弃横幅，
内容**仅供考古，不得用于生成**。

---

## 十六、Java 入门知识框架（java-fast-skill）

> 面向零基础小白的**知识体系索引**（回答遵循「概念 → 语法 → 示例 → 常见坑」四段式）。
> 用于回答概念/语法类提问；不深入 JVM 原理、不讲具体项目开发。

| 类别 | 覆盖内容 |
|------|----------|
| **数据类型** | 基本类型（`byte`(8) / `short`(16) / `int`(32) / `long`(64) / `float`(32) / `double`(64) / `char`(16 位 Unicode) / `boolean`）、引用类型、类型转换、自动装箱拆箱 |
| **基础语法 / 方法** | 变量声明、运算符、`if/else/switch`、`for/while/do-while`、`break/continue`；方法定义、值传递、返回值、方法重载、可变参数 |
| **面向对象** | 类与对象、封装、继承、多态、抽象类、接口、构造器、`this/super` |
| **集合框架** | `Collection` → `List`（`ArrayList` 数组实现查询快增删慢 / `LinkedList` 链表实现相反）、`Set`（`HashSet` 无序 / `TreeSet` 红黑树有序）；`Map`（`HashMap` / `TreeMap`）；迭代器 |
| **枚举** | 枚举定义、枚举方法、枚举 switch、枚举与单例 |
| **异常** | `Throwable` → `Error`（如 `OutOfMemoryError`）/ `Exception` → `RuntimeException`（`NullPointerException` / `ArrayIndexOutOfBoundsException` / `ArithmeticException`）/ Checked Exception（`IOException` / `SQLException`）；`try-catch-finally`、`throw/throws`、自定义异常 |
| **IO / 线程** | `File`/`Reader`/`Writer`、`InputStream`/`OutputStream`、缓冲流、字符流 vs 字节流、try-with-resources；`Thread`/`Runnable`、线程状态、`synchronized`/`lock`、线程池、`volatile` |
| **泛型 / Lambda** | 泛型类·泛型方法·通配符·类型擦除；函数式接口、Lambda 表达式、方法引用、Stream API |

**常被问到的坑（照抄原文）**：① `long` 数字后加 `L`（`long a = 100L;`）、`float` 加 `F`
（`float b = 3.14f;`）、`String` 不是基本类型而是引用类型；② `List`/`Set`/`Map` 是接口不能直接实例化、
`HashMap` 非线程安全（高并发用 `ConcurrentHashMap`）、遍历用 for-each 或 iterator；
③ 不要 `catch(Exception e) {}` 空捕获、异常要具体捕获先小后大、`finally` 中的 `return` 会覆盖 `try` 中的；
④ 速查：`int, long, double, boolean, char`；修饰符 `public/private/protected/static`；
循环 `for/while/do-while/for-each`；关键字 `this/super/final/void/return`。

**不做**：不提供完整 Java 教程；不深入 JVM 原理与内存模型；不讲解具体项目开发（那是
springboot-init-skill 的事）；不回答具体业务代码问题；不提供 IDE 安装教程。

---

## 十七、交付物与未收录引用

| 层级 | 交付物 |
|------|--------|
| 骨架 | `api-contract.md`（health/auth/users/sse/upload 全量）、`docs/project-guide.md` |
| auth | `api-contract-auth.md`（登录·当前用户·菜单树·回填·CRUD 全量）、`docs/auth-module-guide.md`（表结构·权限码表·数据权限·集成步骤） |
| universal-login-api | `api-contract-universal-login.md`、`references/security-integration.md` |
| storage | `api-contract-storage.md`、`docs/storage-module-guide.md` |
| agent | `api-contract-agent.md`（含 SSE Tool 限制说明）、`docs/deployment-guide.md`、`docs/java-agent-skeleton.md` |
| 其余模块 | 各产出 `api-contract-<module>.md`，遵循 `conventions.md` 的模板与错误码规范 |

**未收录引用**：

- `springboot-init-skill/demo/src/main/java/.../common/PageResponse.java` 的注释引用 `vue-admin-skill`
  的 `PageResponse.java` 与 `types/api.d.ts` 作为字段名对齐依据 —— **`vue-admin-skill` 为源仓库私有技能，
  未收录**（见源仓库 `MISSING_SKILLS.md`）。转写后的结论仍成立：分页数组字段固定为 `list`。
- 交叉引用技能（`fastapi-auth-module-skill` / `fastapi-agent-module-skill` / `frontend-request-skill` /
  `uniapp-request-skill` / `web-request-skill` / `database-design-skill` / `vue-form-skill`）
  均**在本仓库公开存在**，其内容由本 spec 层的对应文档（`python-fastapi.md` / `frontend/*.md` /
  `conventions.md` / `database-design.md`）承载。

---

## 十八、与本项目规范的关系

本层为**独立吸收层**，不修改 `.trellis/spec/frontend/` 与 `guides/` 的任何语义。交集处交叉指引：

| 主题 | 本文件 | 本项目既有规范 | 关系 |
|------|--------|----------------|------|
| API 请求层 / 响应信封 / 错误码 | §2.5、§三 | `.trellis/spec/frontend/http-api-guidelines.md` | 理念一致（`{code,message,data}` 信封、分页 `list` 字段）。本项目前端为 React + qiankun，**不消费** wg-skills 为 uni-app / 小程序写的请求层实现；仅候选参考。 |
| 环境变量与配置 | §2.4（`.env` + `${ENV_VAR:default}`） | 本项目 env 规范（`frontend/` 层与根文档） | 该写法对任何 Spring Boot 项目通用；本项目将来引入 Java 后端可直接沿用。 |
| 目录 / 表命名 | §3.1（`{prefix}_*`、snake_case 字段） | — | 与 `frontend/` 层无交集（后端专属），独立成立。 |

> 冲突处理：若 wg-skills 某条规则与本项目既有 spec 冲突，**以本项目既有 spec 为准**；本层仅提供参考。
> 回滚：删除 `.trellis/spec/wg-skills/backend/java-springboot.md` 即可，不影响其他层。
