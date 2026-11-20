<!-- 来源: jiushiwon/wg-skills @ 3b93743 (Apache-2.0)，有修改；详见 ../NOTICE.md -->
# 后端技术选型与数据库学习规范

> 合并转写自 wg-skills 的 2 个技能：`backend-select-skill`（后端选型分流入口）、
> `database-learning-skill`（数据库核心概念与 MySQL vs PostgreSQL 选型）。
> 规则实质保留原文，触发词/frontmatter/与规则无关的叙述已剥离。

## 一、红线（不可绕过）

1. 用户**未指定语言**或明确要「选型/推荐」时才进入选型流程；用户已指定语言时跳过直接分流。
2. 不在选型阶段写任何业务代码（属于 4 个后端生成 skill）；不替用户提交；不锁定版本号（由后端 skill 现场查官方源最新稳定版，写入 `versions.md`）。
3. 中间件按需选型（Redis / Kafka / Elasticsearch / 对象存储 / SMS / Swagger）——**YAGNI，不要的全不加**。
4. `spec.md` 必须记录「是否对接 uni-app 前端」的答案，分流时交给后端 skill（生成的 `docs/project-guide.md` 中 uni-app 与 axios 两段默认都写）。

## 二、选型流程（backend-select-skill）

### 2.1 分批问答（别一次抛完）

1. 这个后端服务解决什么问题？目标用户是谁？
2. 列出 3~5 个核心实体（如用户、订单、文章）。
3. 预期并发/流量规模？（个人 / 中小型 / 高并发）
4. 团队熟哪种语言？Java / Python / Node.js / Go，还是无所谓？
5. 是否需要认证、权限、文件上传等通用能力？
6. 是否对接 uni-app 前端？
7. 部署偏好？Docker / K8s / Serverless？

### 2.2 推荐矩阵

| 项目类型 | 推荐 |
|----------|------|
| 企业级 / 复杂业务 | Java + Spring Boot |
| 快速 API / AI / 数据 | Python + FastAPI |
| 全栈 JS / MVP | Node.js + Express |
| 高并发 / 微服务 | Go + Gin |

团队强偏好优先。数据库选型完成后表前缀默认 `wg`。

### 2.3 分流与交付物

按选定语言显式分流（Java → java-backend-skill / Go → go-backend-skill / Python → python-backend-skill / Node.js → nodejs-backend-skill 仅 Express，企业模块化走 java）。分流时声明「公共规范见 backend-convention-skill，数据库见 database-skill」，移交 `spec.md`（定位/模块/实体/API 轮廓/选型/接口规范），交付物 = 可运行骨架 + `api-contract.md` + `docs/project-guide.md` + `versions.md` + `CLAUDE.md`/`AGENTS.md`。

## 三、数据库核心概念（database-learning-skill）

> 数据库 = 数据的仓库 + 管理的艺术。学习路径：表结构设计 → SQL 基础 → 索引与查询优化 → 事务与并发 → 选型。

### 3.1 索引

无索引逐行扫描（10 万行 = 10 万次 IO）；B+Tree 定位 ≈ 3 次 IO。

| 索引类型 | 说明 | 适用场景 |
|----------|------|---------|
| 主键索引 | 自动唯一，非空 | 主键字段 |
| 唯一索引 | 字段值唯一 | username、email |
| 普通索引 | 加速查找 | 常用查询字段 |
| 复合索引 | 多字段组合 | 多条件查询 |
| 全文索引 | 文本搜索 | 文章内容搜索 |

**最左前缀原则**：复合索引 (a, b, c) 能命中 a、a+b、a+b+c，不能命中 b、c。

### 3.2 事务与隔离级别

ACID：原子性 / 一致性 / 隔离性 / 持久性。

| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
|----------|------|-----------|------|
| 读未提交 | 有 | 有 | 有 |
| 读已提交 | 无 | 有 | 有 |
| 可重复读 | 无 | 无 | 有 |
| 串行化 | 无 | 无 | 无 |

默认级别：**MySQL 可重复读（RR）；PostgreSQL 读已提交（RC）**。

### 3.3 查询优化

发现慢查询：MySQL `SHOW VARIABLES LIKE 'slow_query_log'` + `slow_log`；PostgreSQL `pg_stat_statements` 按 `total_time` 排序；`EXPLAIN` 分析执行计划。核心思路：① WHERE 条件字段加索引；② 避免索引失效（对字段做函数/运算、隐式类型转换、`%` 前缀 LIKE、OR 混合非索引列）；③ 大分页用游标/延迟关联；④ 只取需要的列。

## 四、MySQL vs PostgreSQL 选型对比

| 维度 | MySQL | PostgreSQL |
|------|-------|-----------|
| 定位 | Web 应用（轻量、快速） | 企业级 / 复杂业务 |
| 特点 | 简单查询快 | 复杂查询强 |
| SQL 标准 | 部分支持 | 完整支持 |
| 窗口函数 / CTE | 8.0+ 支持 | 原生支持 |
| MERGE 语句 | 不支持 | 支持 |
| 布尔类型 | TINYINT(1) | BOOLEAN |
| JSON | JSON / JSONB | JSONB（推荐） |
| 数组 / 范围类型 | 不支持 | 支持 |
| UUID | VARCHAR(36) | UUID 原生 |
| GIS | 插件 | 原生 PostGIS |
| 复杂度 / 学习曲线 | 低 / 平缓 | 中 / 稍陡 |

选型口诀：简单 CRUD、生态熟悉、运维简单 → MySQL；复杂查询、数据完整性要求高、JSON/数组/GIS 等高级类型 → PostgreSQL。
