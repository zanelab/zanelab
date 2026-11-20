# 覆盖清单 · backend-jp（Java + Python 36 技能）

负责范围：`vibeCoding/backend/java/`（16）+ `vibeCoding/backend/python/`（20）。
目标文档：`.trellis/spec/wg-skills/backend/java-springboot.md`、`.trellis/spec/wg-skills/backend/python-fastapi.md`

## Java（16）

- java-fast-skill → `backend/java-springboot.md`#十六（Java 入门知识框架：数据类型/语法/集合/异常/IO/线程/泛型/Lambda + 常踩坑清单）
- springboot-init-skill → `backend/java-springboot.md`#二（骨架：五步生成流程、目录结构、技术选型、`${ENV_VAR:default}` 配置、统一响应与异常、鉴权链、安全头、SSE、启动脚本、生成后冒烟验证、交付物）
- springboot-auth-module-skill → `#四`（RBAC 唯一权威：sys_* 九表、M/C/F 菜单类型、三段式权限码、`@EnableMethodSecurity`、四级数据权限、三层去重、R1–R15 红线、8 项交付自检）
- springboot-agent-module-skill → `#十四`（Spring AI 1.0 Agent：10 个内置 Tool、四重文件防护、18 项能力与安全要点、9 个接口 + 5 类 SSE 事件、18 条红线、与 fastapi-agent 对齐表）
- springboot-dict-module-skill → `#六`（字典类型/字典项/系统配置三表、Redis 缓存与主动失效、9 个接口、DTO 与 -3001~-3003）
- springboot-kafka-module-skill → `#十`（生产者/消费者/事务消息/参数基线/JSON 信任包/错误处理器）
- springboot-log-module-skill → `#七`（操作日志 + 登录日志两表、`@OperationLog` 注解切片、5 个接口、DTO）
- springboot-notification-module-skill → `#八`（短信/邮件/站内消息/推送、三依赖与配置、两表、8 个接口、-3001~-3005）
- springboot-org-permission-module-skill → `#十五`（**已废弃**：表名/枚举/排序字段冲突对照表 + 翻车现场，不产出代码）
- springboot-payment-module-skill → `#十三.3`（合一版旧接口清单，明确标注「不应使用」）
- springboot-redis-module-skill → `#九`（缓存注解/Redisson 分布式锁/限流/Redis Session/Stream 发布订阅/连接池配置）
- springboot-storage-module-skill → `#十二`（分片上传 + 断点续传、四种存储策略、压缩开关、10 个接口、两表、-3001~-3003、5 条红线）
- springboot-upload-module-skill → `#十一`（单/多文件上传、本地与 OSS 存储、`validateFile` 三步、附件表、-1031/-1032）
- springboot-wechat-pay-skill → `#十三.1`（微信 V3：强制 V3 SDK、11 个接口、证书与 AutoUpdateCertificatesVerifier、5 步回调验签、两表、-3001~-3008、关键踩坑）
- springboot-alipay-pay-skill → `#十三.2`（支付宝：9 个接口、产品码、execute/pageExecute/sdkExecute 三态调用、RSA2 验签、两表、-3001~-3007、关键踩坑）
- universal-login-api → `#五`（应用注册 + 应用密钥 + 账户绑定三能力、4 张表与「不建的表」、3 组接口、两条绑定流程、U1–U15 红线）

## Python（20）

- python-fast-skill → `backend/python-fastapi.md`#十二（Python 入门知识框架：数据类型/容器/函数/装饰器/异常/IO/并发/类型提示/模块 + 常踩坑清单）
- fastapi-init-skill → `backend/python-fastapi.md`#二（骨架：五步生成流程、目录结构、技术栈与 requirements、Pydantic Settings 配置表、核心模块职责、中间件链、JWT 流程、SSE、启动脚本、Docker、错误码、交付物）
- fastapi-auth-module-skill → `#四`（RBAC 唯一权威：租户/组织/岗位/SysUser/角色/菜单、四级数据权限、camelCase + `alias_generator=to_camel`、-1005 数据权限越界、6 条红线、与 Java 版逐字对齐）
- fastapi-ws-module-skill → `#五`（WebSocket 长连接：query token 鉴权理由、多端登录、30s 心跳/60s 判离线与 4001·4002 关闭码、完整消息协议表（4 客户端 + 7 服务端 type）、11 个 REST 接口、10 项能力）
- fastapi-agent-module-skill → `#六`（LangGraph Agent：13 项能力、10 个内置 Tool、四重文件防护、graph/tools/llm/memory 结构、13 项安全要点（P0/P1/P2 修复）、8 个接口）
- fastapi-ai-chat-module-skill → `#六`（OpenAI/Claude SDK 直连版 AI 对话：14 项能力（多 Token 统计）、同一接口路径与安全要求、与 Java 版能力对齐）
- fastapi-alipay-pay-skill → `#九.2`（支付宝独立版：9 个接口、`python-alipay-sdk` + `pycryptodome`、6 条关键踩坑含 Decimal 精度）
- fastapi-dict-module-skill → `#七.1`（字典类型/字典项/系统配置三表、`@lru_cache` 缓存与 `cache_clear`、13 个接口）
- fastapi-log-module-skill → `#七.2`（操作日志 + 登录日志两表、2 个接口、status 1 成功/0 失败）
- fastapi-notification-module-skill → `#七.3`（短信/邮件/站内消息/推送、阿里云 CommonRequest + Redis 5 分钟验证码 + aiosmtplib、5 个接口）
- fastapi-org-permission-module-skill → `#十`（**与 auth 模块重复**：历史表结构与枚举对照、并存风险，明确新项目用 auth 模块）
- fastapi-payment-module-skill → `#九.3`（合一版旧表与接口、微信 MD5 签名与 XML/`success` 应答，标注「不应使用」）
- fastapi-storage-module-skill → `#八.2`（分片 + 断点续传、四存储策略、Pillow 压缩、10 个接口、`{prefix}_attachment`/`{prefix}_chunk_info`、7 条红线）
- fastapi-upload-module-skill → `#八.1`（单/多文件上传、本地与 OSS、Pillow 图片处理、附件表与接口、-1031/-1032）
- fastapi-wechat-pay-skill → `#九.1`（微信 V3 独立版：9 个接口、wechatpayv3 配置、AutoUpdateCertificatesVerifier、5 条关键踩坑）
- python-kafka-module-skill → `#七.5`（aiokafka 生产者/消费者/事务消息、手动 commit、幂等、5 条「不做」）
- python-redis-module-skill → `#七.4`（RedisClient 封装、`@cache` 装饰器、RedisLock 上下文管理器、ZSet 滑动窗口限流、Stream 发布订阅、哨兵/主从不做）
- fastapi-qr-login-skill → `#十一.1`（小程序扫码登录：5 个接口、Web↔小程序时序、5 分钟有效期、并发条件更新、access_token 提前 60s 刷新、naive/aware datetime）
- article-generator → `#十一.2`（多平台文章生成：5 平台风格/字数表、平台适配器结构、AI 三供应商、6 个接口、扩展新平台方式）
- hot-trend-collector → `#十一.3`（热点抓取：5 类来源、collectors 结构、5 个接口、每小时定时任务、扩展新源、Robots.txt 注意）

> 计数：Python 段 20 行 + Java 段 16 行 = **36 个**，与 `source-inventory.md` 的
> `backend/*` 各文件技能数之和一致（java-springboot.md 16 + python-fastapi.md 20）。

共 36 个
