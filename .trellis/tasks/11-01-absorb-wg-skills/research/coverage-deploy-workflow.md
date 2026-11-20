# 覆盖清单：deploy + workflow 板块（子代理 C）

产出文档：`.trellis/spec/wg-skills/deploy/deploy-suite.md`、
`.trellis/spec/wg-skills/workflow/vibecoding-methodology.md`

## deploy（16）

- super-deploy-skills → deploy-suite.md#1-红线与强制约定（父入口：路由规则、五阶段流程、共享约定 APP_PORT/日志/安全边界）
- super-deploy-skills/deploy-detect-skill → deploy-suite.md#3-阶段一项目技术栈检测（扫描顺序、识别规则表、置信度、画像模板、变更自动重检测）
- super-deploy-skills/server-setup-skill → deploy-suite.md#4-阶段二服务器环境检测（OS/内核/架构检测、运行状态检测、缺失对比表、server-env-report.md）
- super-deploy-skills/deploy-native-skill → deploy-suite.md#6-阶段四-a原生部署（启动命令表、进程管理器选择、七步流水线、systemd/pm2 模板、回滚）
- super-deploy-skills/deploy-docker-skill → deploy-suite.md#7-阶段四-bdocker-部署（多阶段 Dockerfile 各语言骨架、compose 规范、镜像选择、常见坑）
- super-deploy-skills/static-nginx-skill → deploy-suite.md#8-阶段五前端静态托管nginx（SPA/静态/反代/HTTPS 骨架、路径约定、校验重载、常见坑）
- super-deploy-skills/database-install-skill → deploy-suite.md#5-阶段三依赖安装（数据库安装父技能：路由、通用流程、强制密码规则）
- super-deploy-skills/database-install-skill/children/mysql-install-skill → deploy-suite.md#56-mysql-install-skill（8.0/5.7 各 OS 安装、配置项、卸载、常见问题）
- super-deploy-skills/database-install-skill/children/postgres-install-skill → deploy-suite.md#55-postgres-install-skill（16/15/14 各 OS 安装、PGDG repo、配置文件位置、卸载）
- super-deploy-skills/database-install-skill/children/mongodb-install-skill → deploy-suite.md#57-mongodb-install-skill（7.0/6.0 各 OS 安装、仓库配置、认证开启、卸载）
- super-deploy-skills/database-install-skill/children/redis-install-skill → deploy-suite.md#58-redis-install-skill（7/6 各 OS 安装、redis.conf 配置项、验证、卸载）
- super-deploy-skills/runtime-install-skill → deploy-suite.md#5-阶段三依赖安装（运行时安装父技能：路由、通用交互流程、OS 检测输出格式）
- super-deploy-skills/runtime-install-skill/children/java-install-skill → deploy-suite.md#51-java-install-skill（21/17/11 各 OS 安装、JAVA_HOME 设置、update-alternatives）
- super-deploy-skills/runtime-install-skill/children/nodejs-install-skill → deploy-suite.md#53-nodejs-install-skill（20/18/16 Nodesource 安装、nvm、npm 换源与 prefix）
- super-deploy-skills/runtime-install-skill/children/go-install-skill → deploy-suite.md#54-go-install-skill（1.21/1.20/1.19 二进制安装、GOPATH/GOPROXY、常用命令）
- super-deploy-skills/runtime-install-skill/children/python-install-skill → deploy-suite.md#52-python-install-skill（3.12/3.11/3.10 deadsnakes 安装、Docker 方式）

## workflow（4）

- vibeCoding/vibecoding-guide-skill → workflow/vibecoding-methodology.md#1-总入口与编排逻辑（VibeCoding 定义、Skill 清单与调用顺序、模型选择、IDE 选择）
- vibeCoding/vibecoding-guide-skill/vibecoding-workflow-skill → workflow/vibecoding-methodology.md#3-完整工作流（需求→路线图→骨架→模块→联调→测试→部署七阶段 + 风险清单 + 交付物）
- vibeCoding/vibecoding-guide-skill/agent-interview-skill → workflow/vibecoding-methodology.md#4-智能体访谈方法（知识树分层、问题设计、项目打包）
- vibeCoding/vibecoding-guide-skill/agent-learning-skill → workflow/vibecoding-methodology.md#5-智能体学习引导（Agent 概念、最小 Agent 实现、Claude Code Skill 指南、模型底层知识）

共 20 个
