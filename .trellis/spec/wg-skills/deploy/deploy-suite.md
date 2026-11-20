<!-- 来源: jiushiwon/wg-skills @ 3b93743 (Apache-2.0)，有修改；详见 ../NOTICE.md -->
# 部署技能套件规范（super-deploy-skills）

> 本文档合并转写自 wg-skills 的 16 个技能：`super-deploy-skills`（父入口）、
> `deploy-detect-skill`、`server-setup-skill`、`static-nginx-skill`、`deploy-native-skill`、
> `deploy-docker-skill`、`database-install-skill`（+ postgres/mysql/mongodb/redis-install）、
> `runtime-install-skill`（+ java/python/nodejs/go-install）。规则实质保留原文，
> 触发词 / frontmatter / README 重复叙述 / 可执行脚本已剥离（脚本只保留用途一句话）。

适用范围：把一个项目从「检测技术栈」到「服务器装环境」到「生成部署脚本 / Docker / Nginx 配置」
的完整链路规范。默认**只产出文件与命令，不自动执行**。

## 目录

1. [红线与强制约定](#1-红线与强制约定)
2. [部署链路总览](#2-部署链路总览)
3. [阶段一：项目技术栈检测（deploy-profile.md）](#3-阶段一项目技术栈检测)
4. [阶段二：服务器环境检测](#4-阶段二服务器环境检测)
5. [阶段三：依赖安装（8 个 install 子技能）](#5-阶段三依赖安装)
6. [阶段四 A：原生部署（脚本 / systemd / pm2）](#6-阶段四-a原生部署)
7. [阶段四 B：Docker 部署](#7-阶段四-bdocker-部署)
8. [阶段五：前端静态托管（Nginx）](#8-阶段五前端静态托管nginx)
9. [交付物](#9-交付物)
10. [未收录引用](#10-未收录引用)

---

## 1. 红线与强制约定

- **不自动执行**：默认只产出文件和命令；任何会修改服务器状态的动作（安装、起停进程、写 Nginx 配置）
  都必须二次确认。执行安装模式进入前必须问：「即将在 &lt;OS&gt; 上安装 &lt;组件列表&gt;，是否继续？」
- **数据库初始化永不自动执行**：建库 / 建用户 / 授权 / 导入 schema 一律生成 SQL 或脚本，由用户审查后逐项手动跑。
- **禁止破坏性数据库命令**：已存在数据库时，禁止生成 `DROP DATABASE` / `DROP USER` / `TRUNCATE` / `FLUSHALL`；
  Docker 场景禁止 `docker compose down -v`。
- **密码安全**：密码统一从 `.env` 读取或用 `read -s` / 环境变量传入；不进脚本、不进命令历史、不进日志。
  数据库安装 **强制获取 root 密码**，不输入则拒绝继续安装。
- **默认只监听本地**：所有数据库 / 缓存默认 `bind 127.0.0.1`；需要远程访问时单独提示改 `bind` /
  `listen_addresses` + 防火墙 + 强密码 / 证书。
- **幂等**：所有安装命令与启动脚本必须可重复执行（先检测，已存在则跳过并退出 0）。
- **可审计安装源**：`curl | sh` 类安装（Docker、NodeSource、nvm）必须打印 `WARN` 提示「将下载并执行远程脚本，
  请审计来源」；添加第三方 repo（PGDG、MongoDB、Docker）需标注「修改系统软件源」。
- **只读检测**：技术栈检测阶段不得修改任何项目文件。
- **不替代运维判断**：端口冲突、防火墙、HTTPS 证书、数据库密码等需用户最终决定。
- **跨平台**：Linux 与 Windows Server 均支持；生产优先 Linux。
- 首次部署前项目根必须有健康检查端点 `GET /health`（可改 `HEALTH_PATH`），否则启动脚本会判定失败。

## 2. 部署链路总览

典型链路：

```
deploy-detect-skill → server-setup-skill → (static-nginx-skill) → deploy-native-skill / deploy-docker-skill
```

父入口按用户意图路由：

| 用户意图关键词 | 路由到 |
|----------------|--------|
| 部署 / 上线 / 发布，且没有 `deploy-profile.md` | 先 `deploy-detect-skill` 生成画像 |
| 服务器能不能跑 / 装环境 | `server-setup-skill`（读画像，缺则按画像装） |
| 前端 / Vue / React / Nginx | `static-nginx-skill`（读画像确认有前端产物） |
| 原生部署 / pm2 / systemd | `deploy-native-skill`（读画像，复制 launch 脚本） |
| Docker / 容器化 | `deploy-docker-skill`（读画像，生成 Dockerfile + compose） |

父入口默认五个阶段：

```
Phase 1: 检测画像（deploy-detect-skill）→ 扫描项目根，生成 deploy-profile.md；中/低置信度项向用户确认
Phase 2: 选择部署方式（询问用户）→ 原生 还是 Docker；是否包含前端静态资源
Phase 3: 服务器环境（server-setup-skill）→ 检测 OS / 运行时 / 端口占用；缺失项补齐（二次确认后执行）
Phase 4: 生成部署产物 → 原生：launch 脚本填 APP_NAME/APP_PORT/BRANCH；Docker：Dockerfile + compose；前端：Nginx 站点配置
Phase 5: 交付与说明 → 产物位置、如何执行、日志位置、回滚方式
```

**共享约定**（贯穿所有子技能）：

- **事实来源**：`deploy-profile.md`（由 `deploy-detect-skill` 生成）。
- **端口**：统一环境变量 `APP_PORT`（默认 8080），贯穿启动脚本、systemd/pm2、Dockerfile、Nginx。
- **日志**：统一格式 `[YYYY-MM-DD HH:MM:SS] [LEVEL] message`，同步写 `${LOG_DIR}`。

## 3. 阶段一：项目技术栈检测

输出 `deploy-profile.md`（项目根目录），只做「识别 + 文档落地」，不安装、不改代码。

### 3.1 扫描顺序（按优先级）

| 优先级 | 文件/目录 | 用途 |
|--------|----------|------|
| 高 | `package.json` | Node.js / 前端框架识别 |
| 高 | `pom.xml` / `build.gradle` | Java / Kotlin 识别 |
| 高 | `go.mod` | Go 识别 |
| 高 | `requirements.txt` / `pyproject.toml` / `Pipfile` | Python 识别 |
| 高 | `Gemfile` / `composer.json` | Ruby / PHP 识别 |
| 中 | `Dockerfile` / `docker-compose.yml` | 已有容器化线索、base image 推断版本 |
| 中 | `.env` / `.env.example` / `config/` | 数据库、缓存、第三方组件线索 |
| 中 | `dist/` / `build/` / `public/` / `.next/` / `.nuxt/` | 前端构建产物 |
| 低 | 源码中出现的关键字（如 `import redis`） | 辅助佐证 |

### 3.2 识别规则表（精确值）

**语言**：

| 语言 | 标志性文件 | 版本来源 | 默认版本 |
|------|-----------|----------|----------|
| Node.js | `package.json` | `engines.node` 或 `.nvmrc` | 22 |
| Java | `pom.xml` / `build.gradle` | `maven-compiler-plugin` / `sourceCompatibility` | 17 |
| Python | `requirements.txt` / `pyproject.toml` / `Pipfile` | `python_requires` / `[tool.poetry.dependencies]` | 3.11 |
| Go | `go.mod` | `go 1.xx` 指令 | 1.22 |
| Ruby | `Gemfile` / `.ruby-version` | `.ruby-version` | 3.x |
| PHP | `composer.json` | `require.php` | 8.x |

**Web 框架**：

| 框架 | 语言 | 识别依据 |
|------|------|----------|
| Express | Node.js | dependencies 含 `express` |
| NestJS | Node.js | dependencies 含 `@nestjs/core` |
| Fastify | Node.js | dependencies 含 `fastify` |
| Koa | Node.js | dependencies 含 `koa` |
| FastAPI | Python | `requirements.txt` 含 `fastapi` |
| Django | Python | 含 `django` 或存在 `manage.py` |
| Flask | Python | 含 `flask` |
| Spring Boot | Java | `pom.xml` 含 `spring-boot-starter` |
| Gin | Go | `go.mod` 含 `github.com/gin-gonic/gin` |
| Echo | Go | `go.mod` 含 `github.com/labstack/echo` |
| Rails | Ruby | `Gemfile` 含 `rails` |
| Laravel | PHP | `composer.json` 含 `laravel/framework` |

**前端框架 / 构建产物**：

| 框架 | 识别依据 | 构建产物目录 | 需要 Nginx |
|------|----------|-------------|-----------|
| Vue | dependencies 含 `vue` | `dist/` | 是 |
| Nuxt | dependencies 含 `nuxt` | `.output/` / `dist/` | 是（SSR 时另议） |
| React | dependencies 含 `react` | `build/` | 是 |
| Next.js | dependencies 含 `next` | `.next/` | 是（SSR 时需 Node 进程） |
| Angular | dependencies 含 `@angular/core` | `dist/<project>/` | 是 |
| Svelte | dependencies 含 `svelte` | `build/` / `.svelte-kit/` | 是 |
| 纯静态 | 存在 `index.html` 且无框架依赖 | `public/` 或根目录 | 是 |

**数据库**：

| 数据库 | 标志性线索 | 默认版本 |
|--------|-----------|----------|
| PostgreSQL | `pg` / `postgresql` / `DATABASE_URL=postgres://` / `psycopg` | 16 |
| MySQL | `mysql2` / `mysql` / `DB_URL=mysql://` / `pymysql` | 8.0 |
| MariaDB | `mariadb` | 11.x |
| MongoDB | `mongodb` / `mongoose` / `pymongo` | 7.0 |
| SQLite | `sqlite3` / `better-sqlite3` / `.db` 文件 | - |
| Redis | `redis` / `ioredis` / `REDIS_HOST` / `REDIS_URL` | 7 |

**缓存 / 消息组件**：

| 组件 | 识别依据 |
|------|----------|
| Redis | dependencies 含 `redis` / `ioredis`，或 `.env` 含 `REDIS_*` |
| RabbitMQ | `amqplib` / `pika` / `RABBITMQ_*` |
| Kafka | `kafkajs` / `confluent-kafka` / `KAFKA_*` |
| Elasticsearch | `@elastic/elasticsearch` / `elasticsearch` / `ES_*` |

**Dockerfile / Compose 线索**：存在 `Dockerfile` 时读 `FROM` 推断语言与版本（如 `FROM node:22-alpine`）；
存在 `docker-compose.yml` 时读 `services` 推断数据库 / 缓存镜像与版本（如 `postgres:16-alpine`、`redis:7`）。
这些线索可作为中 / 高置信度依据，但仍需用户确认是否为生产环境配置。

### 3.3 置信度判定

| 置信度 | 条件 |
|--------|------|
| 高 | 标志性文件存在且依赖声明明确（如 `package.json` 含 `express`） |
| 中 | 通过配置文件推断（如 `.env` 含 `DB_URL=postgres://`） |
| 低 | 源码出现关键字但依赖未声明（如 `import redis` 但 `package.json` 无 redis） |

中 / 低置信度项**必须**向用户确认，禁止假设。典型确认问题：

- 「检测到 `.env` 里有 PostgreSQL 连接串，是生产数据库还是仅本地开发？」
- 「代码里 import 了 redis，但 `package.json` 没有声明依赖，生产环境需要 Redis 吗？」
- 「同时存在 `Dockerfile` 和 `docker-compose.yml`，希望用 Docker 部署还是原生部署？」
- 「项目是否包含前端静态资源（Vue/React）需要 Nginx 托管？」

monorepo：每个子目录输出一个独立小节（`## 子项目：apps/api（Node.js）`），下游按子项目分别处理。

### 3.4 `deploy-profile.md` 固定结构

```markdown
# 项目部署画像

## 项目信息
- 项目根目录：<绝对路径>
- 检测时间：<YYYY-MM-DD>
- 检测人：<user | claude>

## 检测到的技术栈
| 类型 | 识别结果 | 置信度 | 依据文件 |
|------|----------|--------|----------|
| 语言 | <语言 + 版本> | <高/中/低> | <文件路径> |
| Web 框架 | <框架 + 版本> | <高/中/低> | <文件路径> |
| 前端构建产物 | <有/无 + 目录> | <高/中/低> | <目录路径> |
| 数据库 | <类型 + 版本> | <高/中/低> | <文件路径> |
| 缓存 | <类型 + 版本> | <高/中/低> | <文件路径> |
| 消息队列 | <类型 + 版本> | <高/中/低> | <文件路径> |

## 推断的部署需求
- 需要运行时：<语言 + 版本，多个用逗号分隔>
- 需要数据库：<数据库 + 版本，注明是否待用户确认>
- 需要缓存：<缓存 + 版本，或「无」>
- 需要消息队列：<组件 + 版本，或「无」>
- 需要反向代理：<是（前端产物）/ 否>
- 应用端口（APP_PORT）：<端口号，默认 8080；SSR/前端静态项目标 80/443>
- 建议部署方式：<原生 / Docker / 均可>
- 备注：<用户确认的特殊说明>
```

约束：字段缺失时填「未检测」或 `N/A`，禁止编造；置信度必须标注；
「检测时间」用于判断画像是否过期——若早于最近 `package.json` / `pom.xml` 等标志性文件的 mtime，
下游应软提醒「画像可能过期，建议重新检测」（不阻断流程）。

### 3.5 端口约定

端口统一用环境变量 **`APP_PORT`**，贯穿启动脚本、systemd/pm2、Dockerfile EXPOSE、Nginx `proxy_pass`。

| 项目类型 | 默认 APP_PORT | 备注 |
|----------|--------------|------|
| Node.js / Python / Java / Go 后端 | 8080 | 可被 `.env` 或命令行覆盖 |
| Next.js / Nuxt（SSR） | 3000 | Nginx 反代到 3000 |
| 纯静态 / SPA（Nginx 托管） | 80 / 443 | 应用本身不监听端口，Nginx 监听 |

读取优先级：命令行 `-p/--port` > `.env` 的 `APP_PORT` > 语言默认值（8080）。
应用代码必须读 `APP_PORT`：`process.env.APP_PORT` / `os.getenv("APP_PORT")` /
`@Value("${APP_PORT:8080}")` / `os.Getenv("APP_PORT")`。

### 3.6 项目变更后自动重新检测

框架级技能不内置文件监听 daemon，改为提供可接入 git hook / CI 的标准入口。重新检测与首次检测共用入口，
区别是重新检测会读取已有画像、对比新旧结果、在顶部追加「变化摘要」：

```markdown
## 变化摘要（2026-07-10 重新检测）
- 新增依赖：Redis（package.json 新增 ioredis）→ 部署需求追加「需要缓存 Redis 7」
- 版本变化：Node.js 18 → 22（.nvmrc 变更）→ 运行时升级到 22
- 移除：无
```

三种自动化方式：

- **方式 A · git `post-merge` hook**（个人项目 / 单服务器）：监听标志性文件
  （`package.json`、`package-lock.json`、`pnpm-lock.yaml`、`yarn.lock`、`pom.xml`、`build.gradle`、
  `go.mod`、`go.sum`、`requirements.txt`、`pyproject.toml`、`Pipfile`、`Dockerfile`、`docker-compose.yml`、
  `.env.example`）变更，只「提醒」不自动改画像，避免误覆盖。`chmod +x .git/hooks/post-merge`。
- **方式 B · CI job**（团队 / 多环境）：GitHub Actions `on.push.branches=[main]` + `paths` 同上一组文件，
  校验画像是否过期；GitLab CI 用 `rules:changes` 等价实现。
- **方式 C · Claude Code headless 自动刷新**：`claude -p "/deploy-detect-skill 重新检测，覆盖 deploy-profile.md，标注变化项" --allowedTools "Read,Glob,Grep,Write,Edit"`
  —— 仅开放只读 + 写画像所需工具，**禁止 Bash**，保持安全边界。

## 4. 阶段二：服务器环境检测

读取画像 → 检测服务器 OS 与已装版本 → 对比缺失项 → 生成幂等安装命令清单。默认「仅检测」。

### 4.1 OS / 内核 / 架构检测

Linux 优先读 `/etc/os-release`（标准），回退到发行版特有文件：

| OS | 主检测命令 | 回退文件 | 包管理器 |
|----|-----------|----------|----------|
| Ubuntu | `cat /etc/os-release` | `/etc/lsb-release` | apt |
| Debian | `cat /etc/os-release` | `/etc/debian_version` | apt |
| CentOS | `cat /etc/centos-release` | `/etc/redhat-release` | yum（7）/ dnf（8+） |
| RHEL | `cat /etc/redhat-release` | - | yum / dnf |
| Rocky / Alma | `cat /etc/os-release` | `/etc/redhat-release` | dnf |
| Alpine | `cat /etc/alpine-release` | `/etc/os-release` | apk |
| Amazon Linux | `cat /etc/os-release` | `/etc/system-release` | yum / dnf |
| openSUSE | `cat /etc/os-release` | `/etc/SuSE-release` | zypper |

取 `ID` 与 `VERSION_ID` 两个字段：`. /etc/os-release && echo "$ID $VERSION_ID"   # ubuntu 22.04`。

macOS：`sw_vers -productName` / `sw_vers -productVersion`；包管理器优先 `brew`，未安装则提示用户先装，不自动装。

Windows Server：`(Get-CimInstance Win32_OperatingSystem).Caption` / `.Version`（回退 `systeminfo | findstr /B /C:"OS Name" /C:"OS Version"`）；
包管理器优先 `winget`（Windows 10 1809+ / Server 2019+ 内置），回退 `chocolatey`。

内核与架构：`uname -s` / `uname -r` / `uname -m`（x86_64 / aarch64 / arm64）；
Windows：`[System.Environment]::OSVersion.Version`、`(Get-CimInstance Win32_Processor).Architecture`（9 = x64，12 = ARM64）。

内存与磁盘：`free -h`、`df -h /`；Windows 用 `Win32_ComputerSystem.TotalPhysicalMemory` / `Win32_LogicalDisk`。

当前用户与权限：`pwd`、`whoami`、`id -u`（0 表示 root）、`sudo -n true 2>/dev/null && echo "has sudo" || echo "no sudo"`。

包管理器决策表：

| OS ID | 默认包管理器 | 备注 |
|-------|-------------|------|
| ubuntu / debian | apt | 先 `apt update` |
| centos / rhel / rocky / almalinux | dnf（≥8）/ yum（7） | 看 `VERSION_ID` 主版本 |
| alpine | apk | 先 `apk update` |
| amzn | dnf（2023）/ yum（2） | - |
| darwin (macOS) | brew | 不自动装 brew |
| windows | winget | 回退 chocolatey |

### 4.2 运行状态检测（部署前防冲突/防误杀）

- **监听端口**：Linux `ss -tlnp`（回退 `netstat -tlnp`）；macOS `lsof -nP -iTCP -sTCP:LISTEN`；
  Windows `Get-NetTCPConnection -State Listen`。提取「端口 → PID → 进程名」，与画像目标端口对比输出冲突清单。
- **运行中的服务**：`systemctl list-units --type=service --state=running`、`systemctl is-active <service>`、
  `systemctl is-enabled <service>`；无 systemd（Alpine/OpenRC）用 `rc-status` / `service <name> status`。
- **目标应用老实例**：`pgrep -af "node.*server.js"` / `pgrep -af "java.*app.jar"` / `pgrep -af "uvicorn"`；
  按端口反查 `lsof -ti:8080`。Windows：`Get-Process node,java,python`、`(Get-NetTCPConnection -LocalPort 8080).OwningProcess`。
- **资源占用**：`uptime`（load average）、`top -bn1 | head -20`、`vmstat 1 3`；
  Windows `Get-Counter '\Processor(_Total)\% Processor Time','\Memory\Available MBytes'`。

### 4.3 组件版本检测命令

| 组件 | 检测命令 |
|------|----------|
| Java | `java -version` / `javac -version` |
| Node.js | `node -v` / `npm -v` |
| Python | `python3 -V` / `pip3 -V` |
| Go | `go version` |
| Docker | `docker -v` / `docker compose version` |
| Nginx | `nginx -v` |
| PostgreSQL | `psql --version` / `pg_isready` |
| MySQL | `mysql --version` |
| MongoDB | `mongosh --version` |
| Redis | `redis-cli --version` / `redis-cli ping` |

### 4.4 缺失对比表与报告

```markdown
| 组件 | 画像需求 | 服务器现状 | 状态 |
|------|----------|-----------|------|
| Node.js | 22 | 18 | 需升级 |
| PostgreSQL | 16 | 未安装 | 需安装 |
| Nginx | 是 | 已安装 1.24 | OK |
| Docker | 否 | 未安装 | 跳过 |
```

执行后生成 `server-env-report.md`：

```markdown
# 服务器环境报告

## 服务器信息
- OS：Ubuntu 22.04 LTS
- 内核：5.15.0-91-generic
- 内存：4 GB
- 当前目录：/srv/apps/my-api

## 运行状态
- 负载：0.42 0.38 0.35（1/5/15 min）
- 监听端口：:22 sshd, :80 nginx, :8080 node（目标端口 8080 已被占用 → 需停老进程）
- 目标应用：my-api 正在运行（PID 1234，pm2）
- 待处理冲突：无 / 端口 8080 冲突

## 缺失项
| 组件 | 画像需求 | 现状 | 建议命令 |
|------|----------|------|----------|
| Node.js | 22 | 18 | `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs` |

## 数据库初始化清单（需手动确认）
- [ ] 创建数据库 `myapi_db`
- [ ] 创建用户 `app` 并授权
- [ ] 导入 `migrations/` 下 schema
```

两种模式：**仅检测模式**（默认，只输出「如果执行会跑这些命令」的清单，用户可复制到服务器手动跑）
与**执行安装模式**（用户明确要求「直接装上」+ 二次确认后进入，每条命令幂等，日志记录到 `server-setup-report.md`）。

容错：检测命令失败时记录「未知 OS」，提示用户手动指定；无 sudo/root 权限时标注「需要管理员权限」，
生成命令但不执行。检测到 Windows Server 时输出 PowerShell / winget 命令，但提示生产部署优先 Linux。

## 5. 阶段三：依赖安装

本章覆盖两个父技能及其 8 个子技能：`runtime-install-skill`（java / python / nodejs / go）与
`database-install-skill`（postgres / mysql / mongodb / redis）。所有子技能遵循统一交互流程：

```
1. 自动检测当前系统（OS + 版本 + 架构）
2. 询问安装方式（包管理器 / Docker）
3. 询问版本选择
4. 检测是否已安装（幂等）
5. 执行安装
6. 输出安装结果和验证命令
```

数据库子技能在此之上多两步：**[强制] 获取 root 密码（不输入则拒绝继续）** →
**不执行初始化，输出初始化清单 + 修改密码 / 重置密码脚本供用户手动确认**。

### 5.0 通用：幂等检测、结构规范与安装方式

幂等检测命令：`java -version 2>&1` / `python3 --version` / `node -v` / `go version`。

幂等模板（先检测，满足则跳过）：

```bash
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt install -y nodejs
else
  echo "Node.js $(node -v) already installed, skip"
fi
```

```powershell
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  winget install OpenJS.NodeJS.LTS
} else {
  Write-Host "Node.js $(node -v) already installed, skip"
}
```

安装后版本验证：Java `java -version` / `javac -version` / `echo $JAVA_HOME`；
Python `python3 --version` / `pip3 --version` / `python3 -m venv --help`；
Node.js `node -v` / `npm -v` / `which node`；Go `go version` / `go env GOROOT` / `go env GOPATH`。

**进程管理器**（原生部署用）：

| 工具 | 安装 | 适用 |
|------|------|------|
| systemd | 系统自带 | Linux 首选，写 unit 文件 |
| pm2 | `sudo npm install -g pm2` | Node.js 多进程/集群 |
| supervisor | `sudo apt install -y supervisor` | Python/Go/通用进程守护 |

服务管理命令：Linux `sudo systemctl start|stop|restart|enable|status <service>`；
macOS `brew services start|stop|list <service>`；
Windows `Start-Service` / `Stop-Service` / `Get-Service` /
`Set-Service -Name <ServiceName> -StartupType Automatic`。

OS 检测输出格式（子技能统一输出）：

```markdown
## 系统信息
- 系统: Ubuntu 22.04 LTS
- 内核: 5.15.0-91-generic
- 架构: x86_64
- 包管理器: apt
```

检测补充：WSL 下 `uname -r` 含 `microsoft` 字符串；需检测当前用户 sudo 权限；容器内检测 `/.dockerenv` 是否存在。

### 5.1 java-install-skill

版本选项：Java 21（最新 LTS）/ 17（LTS 稳定）/ 11（老项目兼容）。
包管理器默认 JDK 17（LTS），画像要求 21/23 时替换版本号。

| OS | 检测 | 安装命令骨架 |
|----|------|-------------|
| Ubuntu/Debian | `java -version` | `sudo apt update && sudo apt install -y openjdk-21-jdk`（17 → `openjdk-17-jdk`；11 → `openjdk-11-jdk`） |
| CentOS/RHEL | `java -version` | `sudo dnf install -y java-21-openjdk java-21-openjdk-devel`（17/11 同规则换版本号） |
| Alpine | `java -version` | `sudo apk add openjdk17` |
| macOS | `java -version` | `brew install openjdk@21`，再 `sudo ln -sfn $(brew --prefix)/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk` |
| Windows | `java -version` | `winget install OpenJDK.21`（或 `OpenJDK.17`） |

`JAVA_HOME` 设置（Ubuntu/Debian 路径 `/usr/lib/jvm/java-21-openjdk-amd64`，CentOS/RHEL `/usr/lib/jvm/java-21-openjdk`）：

```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH
echo "export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64" >> ~/.bashrc
echo "export PATH=\$JAVA_HOME/bin:\$PATH" >> ~/.bashrc
```

macOS 用 `export JAVA_HOME=$(/usr/libexec/java_home -v 21)`；Windows 新建系统变量 `JAVA_HOME` 指向
`C:\Program Files\Eclipse Adoptium\jdk-21.xxx`，PATH 追加 `%JAVA_HOME%\bin`。

Docker 方式：`docker pull openjdk:21` / `eclipse-temurin:21-jdk`；卸载 `sudo apt remove --purge -y openjdk-21-jdk openjdk-21-jdk-headless && sudo apt autoremove`。
多版本共存用 `sudo update-alternatives --config java` 切换。

### 5.2 python-install-skill

版本选项：3.12（最新）/ 3.11（稳定）/ 3.10（老项目兼容）。

| OS | 安装命令 |
|----|----------|
| Ubuntu/Debian | deadsnakes PPA：`sudo apt install -y software-properties-common && sudo add-apt-repository -y ppa:deadsnakes/ppa && sudo apt install -y python3.12 python3.12-venv python3.12-dev` |
| CentOS/RHEL | `sudo dnf install -y python3.12 python3.12-devel` |
| macOS | `brew install python@3.12` |
| Windows | `winget install Python.Python.3.12` |

Docker：`docker pull python:3.12`。注意系统自带 Python 不要卸载，只增装自定义版本。

### 5.3 nodejs-install-skill

版本选项：Node.js 20 LTS（推荐）/ 18 / 16。

| OS | 检测 | 安装命令骨架 |
|----|------|-------------|
| Ubuntu/Debian | `node -v` | `curl -fsSL https://deb.nodesource.com/setup_22.x \| sudo -E bash - && sudo apt install -y nodejs`（20/18/16 换 setup 版本号） |
| CentOS/RHEL | `node -v` | `curl -fsSL https://rpm.nodesource.com/setup_22.x \| sudo bash - && sudo dnf install -y nodejs` |
| macOS | `node -v` | `brew install node@20`，再 `brew link node@20` |
| Windows | `node -v` | `winget install OpenJS.NodeJS.LTS`（或 `NodeJS.NodeJS.20.0.0`、`choco install nodejs-lts`） |

nvm（跨平台）：

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20 && nvm use 20 && nvm alias default 20
```

npm 配置：换源 `npm config set registry https://registry.npmmirror.com`（恢复 `https://registry.npmjs.org/`）；
全局安装到用户目录 `npm config set prefix '~/.npm-global'` + `export PATH="$HOME/.npm-global/bin:$PATH"`（**不要用 `sudo npm`**）；
常用全局包 `yarn` / `pnpm` / `pm2` / `typescript`。
CentOS 清理旧版本：`rm -rf /usr/local/lib/node_modules /usr/local/bin/{npm,node}` + `sudo yum clean all`。
node-gyp 编译失败时装编译工具：Ubuntu `sudo apt install -y build-essential python3`；CentOS `sudo dnf groupinstall -y "Development Tools"`。

### 5.4 go-install-skill

版本选项：1.21（最新）/ 1.20（稳定）/ 1.19。

| OS | 检测 | 安装命令骨架 |
|----|------|-------------|
| Linux（所有发行版） | `go version` | `curl -OL https://go.dev/dl/go1.21.5.linux-amd64.tar.gz && sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz`，然后 `export PATH=$PATH:/usr/local/go/bin` 并写入 `~/.bashrc`（CentOS 写 `~/.bash_profile`） |
| macOS | `go version` | `brew install go` |
| Windows | `go version` | `winget install Golang.Go`（或 `choco install golang`） |

环境变量：

```bash
export GOPATH=$HOME/go
export GOBIN=$GOPATH/bin
mkdir -p $GOPATH/bin
echo "export GOPATH=\$HOME/go" >> ~/.bashrc
echo "export GOBIN=\$GOPATH/bin" >> ~/.bashrc
echo "export PATH=\$PATH:\$GOBIN" >> ~/.bashrc
```

Go Modules（1.11+ 默认开启）：`export GO111MODULE=on`；国内代理 `export GOPROXY=https://goproxy.cn,direct`
（阿里云 `https://mirrors.aliyun.com/goproxy/,direct`）。常用命令：`go mod init` / `go mod download` / `go build -o app-name` / `go run main.go` / `go test ./...`。
编译太慢时启用 GOPROXY；内存不足用 `go env -w GOMEMLIMIT=1GiB`。卸载：`sudo rm -rf /usr/local/go`（macOS 亦可 `brew uninstall go`）。

### 5.5 postgres-install-skill

版本选项：16（推荐）/ 15 / 14。默认端口 **5432**。

| OS | 安装命令 |
|----|----------|
| Ubuntu/Debian | 加 PGDG repo：`sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'` + `curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg`，然后 `sudo apt install -y postgresql-16` |
| CentOS/RHEL | `sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm && sudo dnf install -y postgresql16-server postgresql16`，再 `sudo /usr/pgsql-16/bin/postgresql-16-setup initdb`，服务名 `postgresql-16` |
| macOS | `brew install postgresql@16 && brew services start postgresql@16`（版本切换 `brew link --force postgresql@16`） |
| Windows | `winget install PostgreSQL.PostgreSQL.16`；服务名 `postgresql-x64-16` |

服务：`sudo systemctl enable --now postgresql`。配置文件位置：

| 操作系统 | 配置目录 |
|----------|----------|
| Ubuntu/Debian | `/etc/postgresql/16/main/`（`postgresql.conf` / `pg_hba.conf` / `pg_ident.conf`） |
| CentOS/RHEL | `/var/lib/pgsql/16/data/` |
| macOS | `/usr/local/var/postgres` |
| Windows | `C:\Program Files\PostgreSQL\16\data` |

常用配置：`listen_addresses = 'localhost'`（远程改 `'*'`）、`max_connections = 100`、
`shared_buffers = 256MB`、`effective_cache_size = 1GB`、`work_mem = 64MB`；
远程认证在 `pg_hba.conf` 加 `host all all 0.0.0.0/0 scram-sha-256` 与 `host all all ::/0 scram-sha-256`。

卸载：`sudo apt remove --purge -y postgresql-16 postgresql-client-16 && sudo rm -rf /var/lib/postgresql /etc/postgresql`。
常见问题：连接被拒 → 查 `pg_hba.conf`；密码认证失败 → 查 `password_encryption` 与认证方法；
端口冲突 → 改 `postgresql.conf` 的 `port`；数据目录权限 → 确保属 postgres 用户。

### 5.6 mysql-install-skill

版本选项：8.0（推荐）/ 5.7。默认端口 **3306**。

| OS | 安装命令 |
|----|----------|
| Ubuntu/Debian | `sudo apt install -y mysql-server`（客户端 `mysql-client`） |
| CentOS/RHEL | `sudo dnf install -y mysql-server`；服务名 `mysqld`；安装后临时密码在 `/var/log/mysqld.log`（`sudo grep 'temporary password' /var/log/mysqld.log`） |
| macOS | `brew install mysql && brew services start mysql`（特定版本 `brew install mysql@5.7`） |
| Windows | `winget install Oracle.MySQL`（或 `choco install mysql`；手动装选 "Full"） |

安全配置：`sudo mysql_secure_installation`（设置 root 密码、移除匿名用户、禁止 root 远程登录、移除测试数据库、重载权限表）。

配置文件位置：Ubuntu/Debian `/etc/mysql/`（`my.cnf` + `mysql.conf.d/`）；CentOS/RHEL `/etc/`；
macOS `/usr/local/etc/`；Windows `C:\Program Files\MySQL\MySQL Server 8.0\`。

常用配置：字符集 `character-set-server = utf8mb4` / `collation-server = utf8mb4_unicode_ci`（client 侧 `default-character-set = utf8mb4`）；
`bind-address = 0.0.0.0` 允许远程（默认 `127.0.0.1`）；`innodb_buffer_pool_size = 1G`、`max_connections = 200`。

卸载：`sudo apt remove --purge -y mysql-server mysql-client && sudo rm -rf /var/lib/mysql /etc/mysql`。
常见问题：`Access denied for user 'root'@'localhost'` → 用 sudo 运行或重置密码；
`Can't connect to local MySQL server` → 查服务状态；端口 3306 占用 → 改 `my.cnf` 的 `port`；中文乱码 → 确保 utf8mb4。

### 5.7 mongodb-install-skill

版本选项：7.0（推荐）/ 6.0。默认端口 **27017**。

| OS | 安装命令 |
|----|----------|
| Ubuntu/Debian | 加官方 repo：`curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc \| sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg` + 写 `/etc/apt/sources.list.d/mongodb-org-7.0.list`，然后 `sudo apt install -y mongodb-org` |
| CentOS/RHEL | 写 `/etc/yum.repos.d/mongodb-org-7.0.repo`（baseurl `https://repo.mongodb.org/yum/redhat/$releasever/mongodb-org/7.0/x86_64/`），然后 `sudo dnf install -y mongodb-org` |
| macOS | `brew tap mongodb/brew && brew install mongodb-community@7.0` |
| Windows | `winget install MongoDB.Server`（手动装选 "Complete"；服务名 `MongoDB`） |

服务：`sudo systemctl enable --now mongod`。配置文件：`/etc/mongod.conf`（macOS `/usr/local/etc/mongod.conf`；
Windows `C:\Program Files\MongoDB\Server\7.0\bin\mongod.cfg`）。常用配置：

```yaml
net:
  port: 27017
  bindIp: 127.0.0.1    # 改为 0.0.0.0 允许远程
security:
  authorization: enabled   # 默认不开启认证，生产必须开启
storage:
  dbPath: /var/lib/mongodb
```

**注意**：默认安装不开启认证，生产必须开启；启动失败 permission denied 时
`sudo chown -R mongodb:mongodb /var/lib/mongodb`。卸载：`sudo apt remove --purge -y mongodb-org && sudo rm -rf /var/lib/mongodb /var/log/mongodb /etc/mongod.conf`。

### 5.8 redis-install-skill

版本选项：7（推荐）/ 6。默认端口 **6379**。

| OS | 安装命令 |
|----|----------|
| Ubuntu/Debian | `sudo apt install -y redis-server`（服务名 `redis-server`） |
| CentOS/RHEL | `sudo dnf install -y epel-release && sudo dnf install -y redis`（服务名 `redis`） |
| macOS | `brew install redis && brew services start redis`（配置 `/usr/local/etc/redis.conf`） |
| Windows | `winget install Redis.Redis` 或 `choco install memurai`（Memurai 为 Redis 兼容替代） |

配置文件 `/etc/redis/redis.conf`（CentOS/RHEL `/etc/redis.conf`）。常用配置：

```conf
bind 127.0.0.1 ::1            # 默认仅本地；远程改 0.0.0.0
requirepass CHANGE_ME         # 必须设密码
appendonly yes                # 需要持久化时开启
save 900 1
save 300 10
save 60 10000
maxmemory 256mb               # 按服务器内存设置
maxmemory-policy allkeys-lru  # 缓存场景
```

重启 `sudo systemctl restart redis`；验证 `redis-cli -a "$REDIS_PASSWORD" ping` 期望 `PONG`。
常见问题：`NOAUTH Authentication required` → 需 `-a` 传密码；内存不足 → 调 `maxmemory`。
卸载：`sudo apt remove --purge -y redis-server && sudo rm -rf /var/lib/redis /etc/redis`。

### 5.9 数据库通用：初始化清单、密码脚本、监听

**通用初始化清单**（无论哪种数据库，逐项由用户确认）：

```markdown
## 数据库初始化清单（手动执行）
- [ ] 1. 安装并启动数据库服务（可由 server-setup 执行安装模式完成）
- [ ] 2. 加固默认账号（修改 root/postgres 默认密码，删除匿名用户）
- [ ] 3. 创建业务数据库 `<app>_db`
- [ ] 4. 创建业务账号 `<app_user>` 并授予最小权限
- [ ] 5. 配置监听地址与防火墙（默认仅本地；远程需单独确认）
- [ ] 6. 导入 schema / 运行迁移（migrate 命令）
- [ ] 7. 验证连接（用业务账号连一次）
- [ ] 8. 配置备份策略（cron + dump）
```

**密码获取**（强制，不输入则拒绝安装）：Linux `read -s -p "请输入数据库 root 密码: " DB_PASSWORD`；
PowerShell 用 `Read-Host -AsSecureString` + `Marshal::SecureStringToBSTR`，取空则 `exit 1`。

**修改密码脚本**：

```bash
# PostgreSQL
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '新密码';"
sudo -u postgres psql -c "ALTER USER appuser WITH PASSWORD '新密码';"
# MySQL
sudo mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '新密码';"
# MongoDB
mongosh admin --eval "db.changeUserPassword('admin', '新密码')"
mongosh admin --eval "db.updateUser('admin', {pwd: '新密码'})"
# Redis（临时，重启失效；持久用 CONFIG REWRITE 或改配置文件）
redis-cli CONFIG SET requirepass 新密码
redis-cli CONFIG REWRITE
```

**忘记密码急救**（以绕过认证方式启动临时实例 → 改密 → 恢复正常启动）：
PostgreSQL `sudo pg_ctlcluster 16 main start -o "-c auth=trust"`；
MySQL `sudo systemctl stop mysql` 后 `sudo mysqld_safe --skip-grant-tables &`，`FLUSH PRIVILEGES;` 再 `ALTER USER`；
MongoDB `sudo mongod --dbpath /var/lib/mongodb --port 27017 --bind_ip 127.0.0.1 --auth false &`；
Redis 只能通过注释掉 `requirepass` 重启后 `CONFIG SET` + `CONFIG REWRITE` 重置。
（源仓库在这些技能下有配套的重置密码 shell 脚本，逐 OS 各一份，源路径见 `database-install-skill/children/*/references/password-scripts.md`。）

**端口与配置文件**：

| 数据库 | 默认端口 | 配置文件 |
|--------|----------|----------|
| PostgreSQL | 5432 | /etc/postgresql/16/main/postgresql.conf |
| MySQL | 3306 | /etc/mysql/my.cnf 或 /etc/mysql/mysql.conf.d/ |
| MongoDB | 27017 | /etc/mongod.conf |
| Redis | 6379 | /etc/redis/redis.conf |

**远程访问配置**（默认仅本地，需远程时单独确认并配合防火墙）：

```conf
# PostgreSQL: postgresql.conf → listen_addresses = '*'
#             pg_hba.conf     → host all all 0.0.0.0/0 scram-sha-256
# MySQL:      my.cnf          → bind-address = 0.0.0.0
# MongoDB:    mongod.conf     → net.bindIp: 0.0.0.0
# Redis:      redis.conf      → bind 0.0.0.0
```

**连接串格式（写入 `.env`）**：

```bash
# PostgreSQL
DB_URL=postgresql://app:CHANGE_ME@127.0.0.1:5432/myapi_db
# MySQL
DB_URL=mysql://app:CHANGE_ME@127.0.0.1:3306/myapi_db
# MongoDB
DB_URL=mongodb://app:CHANGE_ME@127.0.0.1:27017/myapi_db?authSource=myapi_db
# Redis
REDIS_URL=redis://:CHANGE_ME@127.0.0.1:6379/0
```

**迁移导入（按项目栈）**：Node.js (Prisma) `npx prisma migrate deploy`；Node.js (TypeORM) `npm run migration:run`；
Python (Alembic) `alembic upgrade head`；Java (Flyway) `./mvnw flyway:migrate`。

**备份策略模板**（cron，由用户决定是否启用，保留最近 7 天、每周归档一份到对象存储）：

```bash
# PostgreSQL 每日备份
0 2 * * * pg_dump -U app myapi_db | gzip > /var/backups/myapi_db_$(date +\%F).sql.gz
# MySQL
0 2 * * * mysqldump -u app -p"$DB_PASSWORD" myapi_db | gzip > /var/backups/myapi_db_$(date +\%F).sql.gz
# MongoDB
0 2 * * * mongodump --db myapi_db --archive=/var/backups/myapi_db_$(date +\%F).archive.gz --gzip
```

Docker 部署时数据库通常以 compose 服务形式起，named volume 持久化数据，初始化变量走 `env_file`。

## 6. 阶段四 A：原生部署

把「拉代码 → 杀老进程 → 起新进程 → 管日志」规范化：读画像选语言启动方式，生成幂等可重跑的部署脚本。
默认生成脚本到项目目录（如 `deploy/deploy.sh`），不自动执行。

### 6.1 语言 → 启动命令

| 语言 / 框架 | 启动命令 |
|------------|----------|
| Node.js / Express | `node dist/server.js` 或 `pm2 start ecosystem.config.js` |
| Node.js / NestJS | `node dist/main.js` |
| Python / FastAPI | `uvicorn app.main:app --host 0.0.0.0 --port 8080`（生产用 gunicorn 托管） |
| Python / Django | `gunicorn config.wsgi:application` |
| Java / Spring Boot | `java -jar target/app.jar` |
| Go / Gin | `./bin/server`（先 `go build`） |
| Ruby / Rails | `bundle exec puma -C config/puma.rb` |
| PHP / Laravel | `php-fpm` + Nginx 反代 |

### 6.2 进程管理方式选择

| 场景 | 推荐方式 | 理由 |
|------|----------|------|
| Linux 通用 | systemd | 系统自带，开机自启、崩溃重启、日志统一 |
| Node.js 多实例 | pm2 | 集群模式、零停机 reload、日志聚合 |
| Python/Go 简单守护 | supervisor | 配置简单，适合非 systemd 环境 |
| 临时/简单场景 | nohup `&` | 无需额外组件，但无自启 |
| Windows 服务 | NSSM | 把任意可执行文件注册为 Windows 服务 |

优先 systemd；服务器无 systemd（Alpine、容器内）时回退 supervisor 或 pm2。

### 6.3 脚本统一规范（日志 / 环境变量 / 退出码）

所有预置脚本**自包含**（内联日志函数，无外部依赖），便于拷贝到目标服务器直接运行。

**日志格式**：`[YYYY-MM-DD HH:MM:SS] [LEVEL] message`，LEVEL 取 `INFO` / `WARN` / `ERROR` / `OK`；
同时写 stdout 与 `${LOG_DIR}/<script>.log`。Bash 内联日志函数：

```bash
LOG_DIR="${LOG_DIR:-/var/log/${APP_NAME:-deploy}}"
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_DIR}/$(basename "$0" .sh).log"

_ts() { date '+%Y-%m-%d %H:%M:%S'; }
log()  { local lvl="$1"; shift; printf '[%s] [%s] %s\n' "$(_ts)" "$lvl" "$*" | tee -a "$LOG_FILE"; }
info() { log INFO "$@"; }
warn() { log WARN "$@"; }
err()  { log ERROR "$@"; }
ok()   { log OK "$@"; }
die()  { err "$@"; exit 1; }
run()  { info ">> $*"; "$@" >>"$LOG_FILE" 2>&1 || die "command failed: $*"; }
```

PowerShell 侧同名函数 `Write-Log` / `Info` / `Warn` / `Err` / `Ok` / `Die`，
日志目录默认 `C:\var\log\$($env:APP_NAME ?? 'deploy')`，用 `Tee-Object -Append` 同时落盘。

**环境变量约定**（统一从 `.env` 读取）：

| 变量 | 含义 | 默认 |
|------|------|------|
| `APP_NAME` | 应用名（进程名/服务名/日志目录名） | 项目目录名 |
| `APP_DIR` | 应用部署目录 | `/srv/apps/<APP_NAME>`（Linux）/ `C:\srv\<APP_NAME>`（Windows） |
| `APP_PORT` | 应用监听端口（核心约定） | 8080 |
| `APP_ENV` | 运行环境 | `production` |
| `LOG_DIR` | 日志目录 | `/var/log/<APP_NAME>` / `C:\var\log\<APP_NAME>` |
| `BRANCH` | 部署分支 | `main` |
| `HEALTH_PATH` | 健康检查路径 | `/health` |

端口读取顺序：命令行 `-p/--port` > 环境变量 `APP_PORT` > 语言默认值（8080）；
健康检查用 `http://127.0.0.1:${APP_PORT}${HEALTH_PATH}`；Nginx 把 80/443 转发到 `127.0.0.1:${APP_PORT}`。

`.env` 片段：

```bash
APP_NAME=my-api
APP_DIR=/srv/apps/my-api
APP_PORT=8080
APP_ENV=production
LOG_DIR=/var/log/my-api
BRANCH=main
HEALTH_PATH=/health
```

**脚本结构**：Bash 用 `#!/usr/bin/env bash` + `set -euo pipefail` + `[ -f .env ] && set -a && . ./.env && set +a`；
PowerShell 用 `#Requires -Version 5.1` + `param([string]$Port, [string]$Branch, [switch]$Yes)` +
`Set-StrictMode -Version Latest` + `$ErrorActionPreference = 'Stop'`。

**幂等与可重入**：安装脚本先 `command -v` 检测，已存在且版本满足则 `ok "... already installed, skip"` 并退出 0；
启动脚本先按 `APP_PORT` 检测并停老进程，再起新进程，重复执行结果一致。

**退出码**：

| 码 | 含义 |
|----|------|
| 0 | 成功 |
| 1 | 一般错误（命令失败、健康检查失败） |
| 2 | 参数错误（未知子命令、缺少必填参数） |
| 3 | 权限不足（需要 sudo/root/管理员） |

### 6.4 七步流水线

```
1. 拉取/更新代码   2. 安装依赖   3. 构建（如需）   4. 优雅停止老进程
5. 后台启动新进程  6. 日志定向   7. 健康检查
```

**1. 拉取代码**：选项 A `git pull origin main`（保留本地修改，可能冲突）；
选项 B（**生产推荐**）`git fetch origin main && git reset --hard origin/main`，避免本地残留文件导致构建异常。

**2. 安装依赖**：

| 语言 | 命令 | 说明 |
|------|------|------|
| Node.js | `npm ci --production` | 比 `npm install` 更快、可复现 |
| Node.js (pnpm) | `pnpm install --prod --frozen-lockfile` | - |
| Python | `pip install -r requirements.txt` | 建议在 venv 内 |
| Go | `go mod download` | 通常构建时自动处理 |
| Java | `./mvnw -q -DskipTests package` | 构建阶段一并处理 |

**3. 构建**：Node.js (TS) `npm run build`；Java `./mvnw -q -DskipTests package` 或 `./gradlew build -x test`；
Go `go build -o bin/server ./cmd/server`；前端 `npm run build`（产物交给 Nginx 托管）。

**4. 优雅停止老进程**（先 SIGTERM，等 2s，未退出再 SIGKILL）：

```bash
# 按 PID 文件
if [ -f "${APP_DIR}/${APP_NAME}.pid" ]; then
  kill -TERM "$(cat "${APP_DIR}/${APP_NAME}.pid")" 2>/dev/null || true
  sleep 2
  kill -KILL "$(cat "${APP_DIR}/${APP_NAME}.pid")" 2>/dev/null || true
  rm -f "${APP_DIR}/${APP_NAME}.pid"
fi
# 按端口（无 PID 文件时）
lsof -ti:"$PORT" | xargs -r kill -TERM || true; sleep 2
lsof -ti:"$PORT" | xargs -r kill -KILL 2>/dev/null || true
# pm2 / systemd
pm2 stop "$APP_NAME" || true; pm2 delete "$APP_NAME" || true
sudo systemctl stop "$APP_NAME" || true
```

Windows：`Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue` 后
`$conn.OwningProcess | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force }`。

**5. 后台启动新进程**：

```bash
sudo systemctl start "$APP_NAME" && sudo systemctl status "$APP_NAME" --no-pager
pm2 start ecosystem.config.js --env production && pm2 save && pm2 startup
sudo supervisorctl reread && sudo supervisorctl update && sudo supervisorctl start "$APP_NAME"
nohup node dist/server.js >> "${LOG_DIR}/app.log" 2>&1 & echo $! > "${APP_DIR}/${APP_NAME}.pid"
```

Windows NSSM：`nssm install $APP_NAME "C:\path\to\node.exe" "C:\srv\my-api\dist\server.js"` +
`nssm set $APP_NAME AppStdout/AppStderr "C:\var\log\my-api\app.log"` + `nssm start $APP_NAME`。

**6. 日志定向**：systemd 用 `journalctl -u <app>` 或 `StandardOutput=append:/var/log/<app>/app.log`；
pm2 用 `error_file` / `out_file`；nohup 用 `>> /var/log/<app>/app.log 2>&1`；NSSM 用 `AppStdout` / `AppStderr`。
建议日志目录 `/var/log/<app>/`（Linux）/ `C:\var\log\<app>\`（Windows）/ 项目内 `logs/`。
logrotate 防止磁盘打满：

```
/var/log/my-api/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

**7. 健康检查**（必须重试，避免进程刚起还没监听端口就误判失败）：

```bash
HEALTH_URL="http://127.0.0.1:${PORT}/health"
for i in $(seq 1 10); do
  if curl -fsS "$HEALTH_URL" >/dev/null; then echo "deploy OK"; exit 0; fi
  sleep 2
done
echo "health check failed after 20s" >&2
exit 1
```

健康检查端点约定：`GET /health` 返回 `{ "code": 0, "message": "ok" }`。

### 6.5 systemd unit 模板

```ini
[Unit]
Description=My API Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/srv/apps/my-api
EnvironmentFile=/srv/apps/my-api/.env
ExecStart=/usr/bin/node /srv/apps/my-api/dist/server.js
Restart=always
RestartSec=5
StandardOutput=append:/var/log/my-api/app.log
StandardError=append:/var/log/my-api/app.log

[Install]
WantedBy=multi-user.target
```

```bash
sudo cp deploy/my-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now my-api
```

### 6.6 pm2 ecosystem 模板

```js
module.exports = {
  apps: [{
    name: 'my-api',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: { NODE_ENV: 'production', APP_PORT: 8080 },
    error_file: '/var/log/my-api/err.log',
    out_file: '/var/log/my-api/out.log',
    merge_logs: true
  }]
}
```

### 6.7 回滚与容错

选项 A · 按 commit：`git reset --hard <上一正常 commit> && ./deploy/deploy.sh`。
选项 B · **保留 release 目录（推荐）**：

```
/srv/apps/my-api/
├── releases/
│   ├── 20260710-1200/   20260710-1300/   20260710-1400/
├── current -> releases/20260710-1400   # 软链接
└── shared/
    ├── .env
    └── logs/
```

回滚只需把 `current` 软链接指回上一 release 目录并重启进程。

容错：健康检查失败 → 脚本退出码非 0，CI 据此告警；端口被占用且杀不掉 → 脚本报错而非继续起新进程；
`.env` 缺失 → 启动前检查，缺失则中止并提示。

### 6.8 预置脚本（源仓库 assets，本层不吸收）

源仓库 `deploy-native-skill/assets/` 有配套脚本：`launch.sh`（Linux，用法
`./launch.sh <node|python|java|go> [--manager systemd|pm2|nohup] [--port P] [--branch B] [--skip-pull] [--skip-build]`）、
`launch.ps1`（Windows，`-Manager nssm|hidden`）、`my-api.service`（systemd 模板，替换
`{{APP_NAME}}/{{APP_DIR}}/{{START_CMD}}/{{LOG_DIR}}`）、`ecosystem.config.js`（pm2 模板）。
`server-setup-skill/assets/` 有 `install.sh`（`./install.sh <jdk|node|python|go|nginx|docker> [--version X] [--yes]`）与
`install.ps1`（`.\install.ps1 <jdk|node|python|go|nginx|docker> [-Version X]`）。用途如上，正文不收录实现。

## 7. 阶段四 B：Docker 部署

读画像生成对应语言的 Dockerfile（多阶段构建、镜像瘦身）与含项目 + 数据库 + 缓存的
`docker-compose.yml`（+ `.dockerignore`）。默认只生成文件，不自动 `build` / `up`。

### 7.1 通用原则

- **多阶段构建**：构建期与运行期分离，运行镜像不含编译器 / 源码。
- **具体版本 tag**：禁止 `latest`，用 `node:22-alpine`、`postgres:16-alpine`。
- **非 root 运行**：运行阶段 `USER app`。
- **HEALTHCHECK**：镜像内置健康检查。
- **`.dockerignore`**：排除 `node_modules`、`.git`、`*.log`、`dist`（构建期重新生成）。
- **端口**：容器内应用监听统一读 `APP_PORT`（默认 8080）；`EXPOSE` 写默认 8080（仅文档用途），
  HEALTHCHECK 用 `${APP_PORT:-8080}`；compose 用 `${APP_PORT:-8080}:8080` 映射。

### 7.2 各语言 Dockerfile 骨架

Node.js：

```dockerfile
# ---- deps ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --production

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:8080/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "dist/server.js"]
```

Python (FastAPI)：

```dockerfile
# ---- build ----
FROM python:3.11-slim AS build
WORKDIR /app
ENV PIP_NO_CACHE_DIR=1
COPY requirements.txt ./
RUN pip install --prefix=/install -r requirements.txt

# ---- runtime ----
FROM python:3.11-slim AS runtime
WORKDIR /app
ENV PYTHONUNBUFFERED=1
RUN useradd -r -u 1001 app
COPY --from=build /install /usr/local
COPY . .
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8080/health').status==200 else 1)"
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8080", "app.main:app"]
```

Java (Spring Boot)：

```dockerfile
# ---- build ----
FROM maven:3-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml ./
RUN mvn -q -DskipTests dependency:go-offline
COPY src ./src
RUN mvn -q -DskipTests package

# ---- runtime ----
FROM eclipse-temurin:17-jre AS runtime
WORKDIR /app
RUN useradd -r -u 1001 app
COPY --from=build /app/target/*.jar app.jar
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Go (Gin)：

```dockerfile
# ---- build ----
FROM golang:1.22 AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /server ./cmd/server

# ---- runtime ----
FROM gcr.io/distroless/static:nonroot AS runtime
COPY --from=build /server /server
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/server"]
```

> Go 静态二进制可放进 distroless，镜像极小（几 MB）。

前端静态（Nginx 容器）：

```dockerfile
# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime ----
FROM nginx:1.25-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
```

### 7.3 docker-compose.yml 规范

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    image: <app>:<version>          # 不用 latest
    container_name: <app>
    restart: unless-stopped
    ports:
      - "${APP_PORT:-8080}:8080"   # 容器内固定 8080，宿主端口由 APP_PORT 决定
    env_file:
      - .env                       # 内含 APP_PORT
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    healthcheck:
      test: ["CMD", "..."]
      interval: 30s
      timeout: 5s
      retries: 3
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    networks:
      - app-net

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: <app>_db
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-net

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redis_data:/data

networks:
  app-net:

volumes:
  db_data:
  redis_data:
```

> 数据库密码等敏感值从 `.env` 读取，不要写进 compose。

**数据库镜像选择**：

| 数据库 | 镜像 | 数据卷路径 | 健康检查 |
|--------|------|-----------|----------|
| PostgreSQL | `postgres:16-alpine` | `/var/lib/postgresql/data` | `pg_isready` |
| MySQL | `mysql:8.0` | `/var/lib/mysql` | `mysqladmin ping` |
| MongoDB | `mongo:7` | `/data/db` | `mongosh --eval "db.adminCommand('ping')"` |
| Redis | `redis:7-alpine` | `/data` | `redis-cli ping` |

`.dockerignore` 模板：

```
.git
.github
node_modules
npm-debug.log
dist
build
.env
*.log
.DS_Store
__pycache__
*.pyc
target
bin
```

### 7.4 部署命令与单/多容器

```bash
docker compose up -d --build          # 首次构建并启动
docker compose logs -f app            # 查看日志
docker compose restart app            # 重启
git pull && docker compose up -d --build app   # 更新代码后重新部署
docker compose down                   # 停止（保留数据卷）
docker compose down -v                # 删除数据卷（危险，需确认）
```

- **单容器**：项目 + 数据库都在同一容器（仅适合 demo，不推荐生产）。
- **多容器编排**（默认推荐）：app / db / redis 各自独立容器，通过 compose network 互通。

### 7.5 常见坑

- **镜像里打进 `.env`**：敏感值泄露。用 `env_file` 在运行时注入。
- **`down -v` 误删数据卷**：生产禁用，或先备份。
- **`depends_on` 不等就绪**：只等容器启动，不等服务就绪；用 `condition: service_healthy`。
- **端口冲突**：host_port 与已有服务冲突；生成前提示检测。
- **时区错误**：容器默认 UTC；如需本地时区，挂 `-v /etc/localtime:/etc/localtime:ro` 或设 `TZ`。
- **日志无限增长**：必须设 `max-size` / `max-file`。

## 8. 阶段五：前端静态托管（Nginx）

只负责「构建产物 → Nginx 托管」这一段（构建由原生 / Docker 技能负责）。
若画像标注「需要反向代理：否」，提示「当前项目未检测到前端产物，是否仍要配置 Nginx」。

### 8.1 产物类型与策略

| 产物类型 | 框架 | 产物目录 | Nginx 配置策略 |
|----------|------|----------|----------------|
| SPA | Vue / React / Angular / Svelte | dist / build | history fallback |
| 纯静态 | 无框架 | public / 根目录 | 直接 root |
| SSR | Next.js / Nuxt | .next / .output | 反向代理到 Node 进程（不由 Nginx 直接托管） |

> SSR 项目不应只配置静态托管：提示「SSR 需要 Node 进程，建议用原生部署起 Node + Nginx 反代」。

### 8.2 配置路径与产物目录约定

| OS | 配置根目录 | 站点配置目录 | 启用方式 |
|----|-----------|-------------|----------|
| Ubuntu/Debian | `/etc/nginx/` | `/etc/nginx/sites-available/<app>.conf` | `ln -s` 到 `sites-enabled/` |
| CentOS/RHEL | `/etc/nginx/` | `/etc/nginx/conf.d/<app>.conf` | 自动加载 `*.conf` |
| Alpine | `/etc/nginx/` | `/etc/nginx/http.d/<app>.conf` | 自动加载 |
| macOS (brew) | `/opt/homebrew/etc/nginx/` 或 `/usr/local/etc/nginx/` | `servers/<app>.conf` | 自动加载 |
| Windows | `C:\nginx\conf\` | `nginx.conf` 内 `server {}` 块 | 直接编辑主配置 |

产物统一放 `/var/www/<app>/`（Linux）或 `C:\www\<app>\`（Windows）：

```bash
sudo mkdir -p /var/www/myapp
sudo cp -r dist/* /var/www/myapp/
sudo chown -R www-data:www-data /var/www/myapp   # Ubuntu/Debian
# CentOS/RHEL: sudo chown -R nginx:nginx /var/www/myapp
```

### 8.3 SPA 配置骨架

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/myapp/dist;
    index index.html;

    # 静态资源长缓存（带 hash 文件名）
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # SPA 路由 fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 禁止缓存 HTML，保证发版后立即生效
    location = /index.html {
        add_header Cache-Control "no-store";
    }
}
```

纯静态：`root /var/www/myapp/public;` + `location / { try_files $uri $uri/ =404; }`。

### 8.4 反向代理到后端 API

适用于前后端同域，前端 `/api/*` 转发到后端服务。后端端口来自 `APP_PORT`（默认 8080）。
Nginx 配置本身不读环境变量：生成站点配置时由技能把 `APP_PORT` 替换为实际端口，或运行时用
`envsubst '${APP_PORT}' < /etc/nginx/templates/app.conf.template > /etc/nginx/conf.d/app.conf` 渲染。

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:${APP_PORT}/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

> `proxy_pass` 末尾的 `/` 决定是否去掉 `/api` 前缀：末尾带 `/` → `/api/users` 到后端变成 `/users`；
> 不带 `/` → 后端收到 `/api/users`。按后端实际路由选择。

### 8.5 HTTPS 配置骨架

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;
    root /var/www/myapp/dist;
    index index.html;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / { try_files $uri $uri/ /index.html; }
}

# HTTP 跳转 HTTPS
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}
```

证书申请（生成命令，不自动执行）：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com
```

### 8.6 部署步骤、校验与重载

1. 拷贝构建产物到 `/var/www/<app>/`（或用户指定目录）。
2. 写入站点配置到对应目录。
3. `sudo nginx -t` 校验配置语法。
4. `sudo nginx -s reload`（CentOS/RHEL: `sudo systemctl reload nginx`）重载。
5. 健康检查：`curl -I http://localhost/` 期望 `HTTP/1.1 200 OK`。

Windows：`C:\nginx\nginx.exe -t`、`C:\nginx\nginx.exe -s reload`。

### 8.7 常见坑

- **刷新 404**：SPA 缺 `try_files $uri $uri/ /index.html`。
- **API 跨域**：未配置 `/api` 反代，前端直接请求后端端口导致 CORS。
- **缓存导致发版不生效**：HTML 必须 `no-store`，assets 用 hash 文件名才可长缓存。
- **权限拒绝**：产物目录 owner 不是 `www-data` / `nginx`，Nginx 读不到文件。
- **后端拿不到真实 IP**：缺 `X-Forwarded-For` / `X-Real-IP` 头。

## 9. 交付物

| 技能 | 交付物 |
|------|--------|
| deploy-detect | `deploy-profile.md`（项目根，结构固定，下游唯一事实来源） |
| server-setup | `server-env-report.md`（服务器信息 / 运行状态 / 缺失项对比表 / 数据库初始化清单）；默认仅生成命令 |
| deploy-native | `deploy/deploy.sh`（Linux，`chmod +x`）或 `deploy/deploy.ps1`（Windows）+ systemd unit 或 pm2 ecosystem 模板 + 使用说明（首次配置、日志位置、回滚方式、CI 接入） |
| deploy-docker | `Dockerfile` + `docker-compose.yml` + `.dockerignore` + 部署/更新/回滚命令清单 |
| static-nginx | 站点配置文件路径与内容 + 拷贝产物的目标目录 + 重载与健康检查命令 +（启用 HTTPS 时）certbot 命令 |
| database-install / runtime-install | 安装结果报告（系统信息 / 安装结果 / 验证命令）+ 数据库初始化清单 + 修改密码 / 重置密码脚本 |

交付时须告知用户：产物位置、如何执行、日志位置、回滚方式；并提示可配置「项目变更自动重新检测」。

## 10. 未收录引用

- 本板块（deploy）转写文本中**未出现** MISSING_SKILLS.md 登记的 4 个私有技能
  （`vue-admin-skill` / `sse-agent-skill` / `universal-identity-bridge-skill` /
  `universal-login-bridge-skill`）的引用，无需标注。
- 源文 `server-setup-skill/references/database-setup.md` 提到「与 `backend-generate-skill/database-skill`
  的 MySQL 规范一致」：**源仓库中不存在 `backend-generate-skill` 目录**（疑为早期命名，现由
  `backend-convention-skill` 与 `backend/database/database-design-skill` 承担），此处如实标注为失效引用、未收录。

## 11. 与本项目规范的关系

- 健康检查端点 `GET /health`、统一响应信封 `{ "code": 0, "message": "ok" }` 的约定与
  `.trellis/spec/wg-skills/backend/conventions.md` 是同一条规则，本层不重复展开。
- 本项目的 HTTP 接口契约以 `.trellis/spec/frontend/http-api-guidelines.md` 为准；
  本文档描述的是「源仓库通用的部署链路规范」，与本项目前端层规范并行、互不改写。
- 本项目的容器化 / 部署若采用本文档流程，`APP_PORT` 与 `deploy-profile.md` 两项约定应保持一致，
  便于与源仓库生态的其他技能衔接。
