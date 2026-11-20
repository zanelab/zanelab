<!-- 来源: jiushiwon/wg-skills @ 3b93743 (Apache-2.0)，有修改；详见 ../NOTICE.md -->
# 数据库设计与各数据库集成规范

> 合并转写自 wg-skills 的 7 个技能：`database-design-skill`（表设计方法论/索引/关联/分库分表）
> + 6 个 *-guide-skill（mysql / pgsql / mongodb / redis / kafka / sqlite）。
> 规则实质保留原文，触发词/frontmatter/与规则无关的叙述已剥离。
> 各栈的连接配置代码模板为源仓库各技能 SKILL.md 内置段（路径见「八、源文件对照」）。

## 一、红线（不可绕过）

1. 表名/字段名**英文小写 + 下划线**（`user_name`，不是 `userName`）；用完整英文单词不用缩写（`created_at`，不是 `ctime`）。
2. 表名**统一前缀**（默认 `wg_`）+ **单数名词**（`wg_user`，不是 `wg_users`）。
3. 所有业务表**必须包含基础字段**：`id` 主键、`status`、`created_at`、`updated_at`、`deleted_at`（软删除）。
4. 表与字段必须写 COMMENT（表注释 + 字段注释，如 `status`：`0-禁用 1-正常`）。
5. 复合索引遵守**最左前缀原则**；禁止对字段做函数/运算导致索引失效；禁止隐式类型转换查询。
6. 交付落点：选型期落 `spec.md`（数据库类型/表前缀/核心实体/是否分库分表）；生成项目内落连接配置（.env.example）+ DDL 迁移文件 + entity 定义。

## 二、表设计方法论（database-design-skill）

### 2.1 基础字段模板

```sql
CREATE TABLE "wg_user" (
    "id" BIGSERIAL PRIMARY KEY,
    "status" SMALLINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1正常',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP DEFAULT NULL COMMENT '软删除时间戳'
);
```

### 2.2 字段类型选择

| 数据类型 | MySQL | PostgreSQL | 场景 |
|----------|-------|------------|------|
| 主键 | BIGINT UNSIGNED | BIGSERIAL | 自增主键 |
| 状态 | TINYINT | SMALLINT | 0/1/2 状态码 |
| 布尔 | TINYINT(1) | BOOLEAN | true/false |
| 时间 | DATETIME | TIMESTAMP | 创建/更新时间 |
| 枚举 | ENUM / TINYINT | CHECK 约束 | 有限选项 |
| 大文本 | TEXT | TEXT | 长文本 |
| JSON | JSON / JSONB | JSONB | 动态结构（PG 推荐 JSONB） |

### 2.3 索引设计

| 索引 | 场景 | 示例 |
|------|------|------|
| 主键索引 | id，自动唯一 | PRIMARY KEY |
| 唯一索引 | 唯一约束字段 | `uk_username` |
| 普通索引 | WHERE 常用字段 | `idx_status` |
| 复合索引 | 多条件查询 | `idx_status_created` on (status, created_at) |

必须加索引：WHERE 条件字段、ORDER BY 排序字段、JOIN 连接字段、唯一性约束字段。**最左前缀**：复合索引 (status, created_at, user_id) 能命中 status、status+created_at、status+created_at+user_id，不能命中单独的 created_at 或 user_id。

### 2.4 关联规范

- **业务层控制关联，数据库层不强制外键**（性能考虑），保留外键约束文档供 DBA 审阅；用索引替代外键（`idx_user_id` 等）。
- JOIN **不超过 3 表**；更深用分步查询或中间表。关联查询须带软删除条件（`AND u.deleted_at IS NULL`）。

### 2.5 查询优化

| 规则 | 说明 |
|------|------|
| 避免 `SELECT *` | 只查需要的字段 |
| 避免函数运算 | `WHERE YEAR(created_at)=2024` ❌ 索引失效 |
| 避免隐式转换 | `WHERE phone = 13800138000`（number vs varchar）❌ |
| 分页游标 | 大偏移用 `WHERE id > last_id` 替代 `LIMIT 100000, 10` |
| 批量操作 | INSERT/DELETE 批量执行，减少交互 |

### 2.6 分库分表

| 数据量 | 策略 |
|--------|------|
| < 1000 万 | 不分，单表 |
| 1000 万 ~ 1 亿 | 水平分表 |
| > 1 亿 | 分库分表（分布式） |

分片键：用户 ID（按用户维度查）、时间（日志类）、地区。订单表按 `user_id` 分片示例：`PARTITION BY HASH("user_id") PARTITIONS 16`，主键 `(id, user_id)`。中间件：ShardingSphere（功能完善，Java）/ ShardingJDBC（轻量，Java 直连）/ MyCat（代理，多语言）/ Vitess（MySQL 分布式，规模大）。

### 2.7 引擎与配置

MySQL 引擎：**InnoDB**（事务+行锁，默认，绝大多数场景）/ MyISAM（无事务，只读/日志）/ Memory（临时表）。建表统一 `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`。

## 三、MySQL（mysql-guide-skill）

能力范围：连接配置（JDBC/连接池/环境变量）、DDL 建表与约束、ORM 映射（实体/Repository/Service）、索引优化与慢查询、事务（声明式/编程式）、主从复制（读写分离/负载均衡）。连接参数与 `application.yml` / `config.py` / `database.py` 模板见源技能 SKILL.md 内置段。要点：连接池必配（最大连接数/空闲超时）；事务用声明式优先（`@Transactional`），编程式处理长事务；读写分离下写走主库、读走从库，注意复制延迟对「写后立读」的影响。

## 四、PostgreSQL（pgsql-guide-skill）

在 MySQL 能力清单之上追加：**JSON/JSONB** 文档存储与查询（推荐 JSONB，可索引）、**原生数组类型**、**流复制**。复杂查询/窗口函数/CTE 原生支持（MySQL 8.0+ 才有）。连接池与慢查询套路同 MySQL，性能视图用 `pg_stat_statements`。

## 五、MongoDB（mongodb-guide-skill）

能力范围：MongoClient 连接池、文档模型设计（`@Document(collection=...)` + `@Id`）、CRUD 与批量、**聚合查询**（Match/Group/Lookup/Pipeline）、索引优化、**多文档事务**。连接串 `mongodb://host:27017/<db>`（经 `DB_URL`）。文档模型设计原则：内嵌 vs 引用按访问模式定（一起读的内嵌、多对多引用）；集合命名同样 snake_case + `wg_` 前缀。

## 六、Redis（redis-guide-skill)

能力范围：连接配置（Jedis/Lettuce/RedisTemplate）、五大数据结构操作（String/Hash/List/Set/ZSet）、**分布式锁**、限流（令牌桶/滑动窗口）、消息队列（List/Stream 延迟队列）、计数器（点赞/访问量/排行榜）。

**分布式锁要点**：Redisson `lock.tryLock(10, 30, TimeUnit.SECONDS)`——等待 10s、持有 30s；finally 中 `isHeldByCurrentThread()` 判断后 unlock；Python/Go 手动实现须带唯一 value + 过期时间 + Lua 原子释放。

## 七、Kafka（kafka-guide-skill）

能力范围：Producer/Consumer 配置、同步/异步/批量发送、消费者组、消息可靠性、顺序消费（分区策略）、延迟队列（**推荐 Redis ZSet 实现**）。

**消息不丢失（生产者）**：`acks=all`（所有副本确认）+ `retries=3` + `enable.idempotence=true` + `max.in.flight.requests.per.connection=5`。

**消息不重复消费（消费者）**：`enable.auto.commit=false`（手动提交）+ `max.poll.records=500` + `max.poll.interval.ms=300000`（5 分钟内必须处理完）。

## 八、SQLite（sqlite-guide-skill）

独立技能的理由：零运维、单文件、AI 时代新角色（本地 LLM 缓存、RAG 检索、AI Agent 状态存储、Edge AI）。

能力清单：连接配置（文件路径 + PRAGMA 调优）、CRUD/批量、事务（提交/回滚/嵌套）、**并发访问（WAL 模式 / 锁机制 / busy_timeout）**、ORM 映射（SQLAlchemy/Hibernate/GORM/Prisma/Diesel 五语言）、**FTS5 全文搜索**、备份迁移（`.backup` API、Litestream、流式复制）。

选型判断：嵌入式/单机/本地优先/AI 本地缓存 → SQLite；多用户并发写、网络服务 → 必须 MySQL/PG。并发三件套：开 WAL、设 `busy_timeout`、控制连接模型（单写多读）。

## 九、源文件对照

| 文档章节 | 源技能 | 源内置模板 |
|---------|--------|-----------|
| 二 | database-design-skill | references/：naming-convention / index-design / performance / sharding-guide / migration-guide / base-schemas |
| 三 | mysql-guide-skill | SKILL.md 内置 application.yml / config.py / database.py 模板；references/：connection-pool / performance-tuning / troubleshooting |
| 四 | pgsql-guide-skill | 同上结构 |
| 五 | mongodb-guide-skill | 同上结构 |
| 六 | redis-guide-skill | SKILL.md 内置 redis_client.py；references/ 同上 |
| 七 | kafka-guide-skill | SKILL.md 内置 kafka_client.py；references/ 同上 |
| 八 | sqlite-guide-skill | 5 语言配置模板；references/：ai-applications / connection-pool / performance-tuning / troubleshooting |
