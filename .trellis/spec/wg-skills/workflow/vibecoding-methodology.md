<!-- 来源: jiushiwon/wg-skills @ 3b93743 (Apache-2.0)，有修改；详见 ../NOTICE.md -->
# VibeCoding / AI 开发方法论

> 合并转写自 wg-skills 的 4 个技能：`vibecoding-guide-skill`（总入口分流）、
> `vibecoding-workflow-skill`（产品落地全流程）、`agent-learning-skill`（Agent 学习路线）、
> `agent-interview-skill`（Agent 工程师面试准备）。
> 规则实质保留原文，触发词/frontmatter/与规则无关的叙述已剥离。

## 一、总入口（vibecoding-guide-skill）

VibeCoding / AI 开发知识总入口，不执行具体生成任务，只分流：

| 用户意图 | 进入子技能 |
|----------|------------|
| 想做项目、选型模型/IDE、写提示词、产品开发全流程 | vibecoding-workflow-skill |
| 想了解 Agent、学习智能体、做 Agent | agent-learning-skill |
| 准备 Agent 工程师面试、入行、包装项目 | agent-interview-skill |
| 意图不明确 | 询问用户目标后分流 |

红线：不调用、不包装其他 skill；不替用户执行安装、部署、生成代码；子技能触发词变更后同步更新入口描述。

## 二、产品落地全流程（vibecoding-workflow-skill）

覆盖从工具选型到产品部署的完整 VibeCoding 落地流程，**只推荐不执行**。

覆盖阶段：模型/IDE 选型 → 提示词怎么写 → 产品模块拆解 → 开发 → 前后端联调 → 测试 → 部署推荐。

- **完整规划**：用户描述水平和目标后，生成 `docs/vibecoding/roadmap.md`（如「我想做一个商城小程序」）。
- **快捷入口**：直接询问某个阶段（模型/IDE 选型、提示词、电商系统、前后端联调、测试、部署），返回对应参考资料。

红线：不调用其他 skill；不替用户执行安装、部署、生成代码；**模型价格和可用性信息必须加「需自行核实最新信息」提示**。

## 三、Agent 学习路线（agent-learning-skill）

Agent 技术系统学习路线，只推荐学习资源和路径，不执行代码生成。

学习路径：Agent 概念 → 最小实现 → 模型底层知识 → 算法 → Skill/Tool 开发（如怎么写 Claude Code Skill）。

- **完整规划**：用户说明当前基础和学习目标后，生成个人学习路线图（如「我想系统学习 Agent，小白起步」）。
- **快捷入口**：Agent 是什么 / 怎么做一个最小 Agent / 需要学哪些模型底层知识 / 怎么写 Claude Code Skill。

红线：不调用其他 skill；不替用户运行实验或安装环境。

## 四、Agent 工程师面试准备（agent-interview-skill)

输出面试准备计划与知识清单（知识树、项目包装、模拟面试题），**不替代真实面试或项目经验**。

- **完整规划**：用户提供背景和目标岗位后，生成 `docs/vibecoding/agent-interview-plan.md`（如「我想准备 Agent 工程师面试，目前会 Python 和 Prompt Engineering」）。
- **快捷入口**：Agent 面试常考知识点 / 怎么把 VibeCoding 项目写成简历项目 / 给我 10 道 Agent 面试题。

红线：不调用其他 skill；不保证面试结果。

## 五、与本项目沉淀机制的关系

本层方法论描述「AI 开发全流程」的通用参考；本仓库自己的 Skill 沉淀方法（审计维度、写入规范）在 [writing-skills.md](./writing-skills.md)（源自 `skill-auditor`），两者语义同族：一个是学习路线，一个是产出规范。
