<!-- 来源: jiushiwon/wg-skills @ 3b93743 (Apache-2.0)，有修改；详见 ../NOTICE.md -->
# Node.js / Rust 后端骨架规范

> 合并转写自 wg-skills 的 2 个技能：`nodejs-init-skill`（Node.js + Express 一键骨架）、
> `rust-backend-skill`（Rust + Axum 骨架，源文为待实现态，仅转写规格意图）。
> 规则实质保留原文，触发词/frontmatter/与规则无关的叙述已剥离。

## 一、公共约束（两栈通用）

- 响应信封 `{ code, message, data }`、错误码、JWT、分页、api-contract 的**唯一定义处在 [conventions.md](./conventions.md)**——本文件只写各栈落地差异，禁止复制契约文本。
- 数据库选型与连接参数遵循 database-design 规范；前端消费遵循 frontend-request-skill。
- 交付物与其它 init-skill 一致：可运行骨架 + `api-contract.md` + `docs/project-guide.md` + `versions.md` + `CLAUDE.md`/`AGENTS.md`；版本现场查官方源，不锁死。

## 二、Node.js + Express 骨架（nodejs-init-skill）

### 2.1 与其它 init-skill 的差异

| 维度 | springboot-init | fastapi-init | 本 skill |
|------|-----------------|--------------|----------|
| 语言/框架 | Java / Spring Boot | Python / FastAPI | JavaScript(TS) / Express.js |
| 环境安装 | 自动检测+JDK | 自动检测+Python | **自动检测+Node.js** |
| 启动 | ./restart.sh | ./restart.sh | **npm start / npm run dev** |
| 默认数据库 | MySQL | MySQL | **MongoDB**（可选 MySQL/PG） |
| ORM | JPA | SQLAlchemy | **Mongoose / Sequelize** |
| 鉴权 | Spring Security + JWT | FastAPI JWT | **passport.js + JWT** |

### 2.2 核心能力清单（11 项）

1. **环境探测**：Node.js ≥18 LTS、npm、操作系统类型；未安装给中文提示 + 下载链接，版本过低给升级指引
2. **自动安装**：初始化 npm、装依赖、查兼容性
3. **一键启动/重启**：`npm start`（生产）或 `npm run dev`（开发）
4. **开发模式**：nodemon 热重载，日志出控制台
5. **生产模式**：pm2 后台运行，日志 `logs/app.log`
6. **JWT 鉴权**：jsonwebtoken——注册/登录/刷新令牌/当前用户注入
7. **文件上传**：`multer`，`/api/upload` 单文件、`/api/uploads` 多文件
8. **统一响应**：中间件自动包装 `{ code, message, data }`
9. **全局异常**：错误中间件统一处理 BusinessError / 校验错误 / 兜底错误
10. **CORS**：内置 cors 中间件，可配置允许域名
11. **安全头**：内置 helmet（X-Frame-Options / X-Content-Type-Options 等）

### 2.3 生成流程

**第一步 · 只问 3 个问题**：① 项目名（默认 `my-express-app`）；② 数据库：MongoDB（默认推荐）/ MySQL / PostgreSQL / 暂不用；③ TypeScript 还是 JavaScript（默认 JS）。**不问**技术细节、版本号、目录结构——全部自动选最佳实践。

**第二步 · 环境探测**：Node ≥18 / npm / OS；缺失给安装指引。

**第三步 · 生成骨架**，顺序：目录结构 → 依赖与配置（`package.json`、`.env.example`、`.env`、`.gitignore`）→ 核心模块（`app.js|ts`、`config`、`database`、`middleware/response.js`、`middleware/error.js`、`middleware/auth.js`）→ 业务模块（models → controllers → routes）→ 启动脚本（package.json scripts）→ Docker 配置（Dockerfile + docker-compose.yml，按需）→ 强制交付物（`api-contract.md` + `docs/project-guide.md`）→ `README.md`。

**第四步 · 自动安装与启动**：`npm install` → 从 `.env.example` 复制 `.env`（如不存在）→ TS 则 `npm run build` → 检测数据库可用性（有 Docker 则自动启动数据库容器）→ 提示 `npm run dev` / `npm start`。

**第五步 · 交付清单**：向用户汇报完整交付物（骨架文件、契约、文档、启动方式）。

## 三、Rust + Axum 骨架（rust-backend-skill，待实现态）

> 源技能为「待实现」清单状态，无成品规则细节——本节转写其规格意图，实现时按意图补全。

与其他栈的定位对比：性能极高、内存占用极低、生态快速增长、学习曲线高。

核心能力清单（规划）：① 环境检测（Rust/Cargo 安装与版本）；② 项目生成（Axum + Tower Web 骨架）；③ 数据库集成（SQLx + MySQL/PostgreSQL）；④ JWT 鉴权（jsonwebtoken 集成）；⑤ 热重载（cargo-watch 开发模式）；⑥ 统一响应信封 `{ code, message, data }`；⑦ 全局错误捕获。

待实现项：环境检测与安装指引、项目骨架生成、数据库集成、鉴权模块、API 接口契约——实现时均须对齐 conventions.md 的公共契约。
