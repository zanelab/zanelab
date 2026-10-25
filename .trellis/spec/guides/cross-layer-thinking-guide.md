# 跨层思维指南

> **目的**：实现之前，先把数据在各层之间的流动想清楚。

---

## 问题所在

**大多数 bug 发生在层与层的边界上**，而不是层的内部。

常见的跨层 bug：

- API 返回格式 A，前端按格式 B 消费
- 数据库存 X，service 转换成 Y 时丢了数据
- 多个层各自实现了同一份逻辑，且实现不一致

---

## 实现跨层特性之前

### 第 1 步：画出数据流

把数据的流动画出来：

```
来源 → 转换 → 存储 → 读取 → 转换 → 展示
```

对每个箭头问三句：

- 这一步数据是什么格式？
- 哪里可能出错？
- 谁负责校验？

### 第 2 步：识别边界

| 边界 | 常见问题 |
|------|----------|
| API ↔ Service | 类型不匹配、字段缺失 |
| Service ↔ 数据库 | 格式转换、null 处理 |
| 后端 ↔ 前端 | 序列化、日期格式 |
| 组件 ↔ 组件 | props 结构变化 |

### 第 3 步：定义契约

对每个边界：

- 输入的精确格式是什么？
- 输出的精确格式是什么？
- 可能发生哪些错误？

---

## 常见跨层错误

### 错误 1：隐式格式假设

**坏**：不检查就假设日期格式

**好**：在边界处显式做格式转换

### 错误 2：校验散落多处

**坏**：同一件事在多个层各校验一遍

**好**：在入口处校验一次

### 错误 3：抽象泄漏

**坏**：组件知道数据库 schema

**好**：每层只知道相邻层

### 错误 4：每个消费方各自解析同一份载荷

**坏**：某命令读取 JSONL 事件并在行内强转字段：

```typescript
const thread = (ev as { thread?: string }).thread;
const labels = (ev as { labels?: string[] }).labels;
```

看起来是局部小事，实则意味着**每个消费方都私有一份事件契约**。下次字段一变，改了一个命令、漏掉其余。

**好**：在事件边界解码一次，再导出带类型的投影：

```typescript
if (!isThreadEvent(ev)) return false;
return ev.thread === filter.thread;
```

**规则**：对只追加日志、JSON 流、RPC 载荷、配置文件，为下列内容建立**唯一属主**：

- 事件 / 载荷类型定义
- 从 `unknown` 出发的类型守卫与归一化
- UI 命令使用的元数据投影
- 从事实来源重放状态的 reducer

渲染代码可以格式化字段，但**不得重新定义载荷契约**。

---

## 跨层特性检查清单

实现之前：

- [ ] 画出了完整数据流
- [ ] 识别了所有层边界
- [ ] 定义了每个边界上的格式
- [ ] 决定了校验发生在哪里

实现之后：

- [ ] 用边界情况测过（null、空、非法值）
- [ ] 验证了每个边界的错误处理
- [ ] 确认数据能完整往返（round-trip）
- [ ] 确认消费方 import 共享解码器 / 投影，而不是在本地强转载荷字段
- [ ] 确认派生状态指回源事件标识（`seq`、`id`、`version`），而不是另造第二套游标

---

## 跨平台模板一致性

Trellis 的命令模板（如 `record-session.md`）以**相同或近乎相同的内容**存在于**多个平台**。这是一个跨层边界。

### 检查清单：改动任何命令模板之后

- [ ] 找出所有平台上的同一命令：`find src/templates/*/commands/trellis/ -name "<command>.*"`
- [ ] 更新所有平台副本（Markdown `.md` 与 TOML `.toml`）
- [ ] Gemini 的 TOML：适配续行符（`\\` vs `\`）与三引号字符串
- [ ] 跑 `/trellis:check-cross-layer` 验证没有遗漏

**真实案例**：在 Claude 平台把 `record-session.md` 更新为 `--mode record`，但忘了 iFlow、Kilo、OpenCode、Gemini——被跨层检查兜住。

---

## 运行时解析模板的升级一致性

有些生成文件既是文档又是运行时输入。Trellis 的 `.trellis/workflow.md` 会被 `get_context.py`、`workflow_phase.py`、SessionStart 过滤器和逐轮 hooks 解析。模板变更必须同时验证**全新 init** 与**升级 update** 两条路径。

### 检查清单：改动运行时解析模板之后

- [ ] 找出**读取**该模板的每个运行时解析器，而不只是安装文件的写入器
- [ ] 检查相关语法是否存在于显眼的托管区域之外（如 tag 块）
- [ ] 验证全新 `init` 的产物，以及写入旧版 `.trellis/.version` 的 `update` 场景
- [ ] 用一份旧的原版模板 fixture 补升级回归，断言安装后的文件达到当前打包形态
- [ ] 更新拥有该运行时契约的 spec

**真实案例**：Codex inline 模式把 workflow 平台标记从 `[Codex]` / `[Kilo, Antigravity, Windsurf]` 改成 `[codex-sub-agent]` / `[codex-inline, Kilo, Antigravity, Windsurf]`。全新 init 正确，但 `trellis update` 只合并 `[workflow-state:*]` 块、保留了块外的旧标记。结果：升级后的项目拿到了新 hook 脚本却留着旧 workflow 路由，`get_context.py --mode phase --platform codex` 可能返回空的 Phase 2.1 明细。

---

## 带版本文档的边界

带版本的文档是跨层边界：源码路径、`docs.json` 的版本路由、页面上渲染的版本选择器，三者必须描述同一条发布线。

### 检查清单：编辑带版本文档之前

- [ ] 确定目标发布线：stable、beta 还是 RC
- [ ] 验证编辑的 MDX 路径属于该线：
  - stable：`docs-site/{start,advanced,...}` 与 `docs-site/zh/{start,advanced,...}`
  - beta：`docs-site/beta/**` 与 `docs-site/zh/beta/**`
  - RC：`docs-site/rc/**` 与 `docs-site/zh/rc/**`
- [ ] 验证 `docs.json` 导航把版本标签指向同样的路径
- [ ] 提交前在另一棵目录树里 grep 发布线专属词
- [ ] beta 内容出现在根发布路径下，按**源码路径 bug** 处理，不是渲染 bug

**真实案例**：一次仅限 beta 的任务流改动，把 `prd.md` + `design.md` + `implement.md`、任务创建确认和 Codex 模式横幅写在了根 `start/` 与 `advanced/` 路径下。文档站在 Release 选择器下把 0.6 beta 行为当正式版输出了。修复：还原根发布文档、把 0.6 内容挪到 `beta/` 与 `zh/beta/`，并加了对根发布树 grep beta 标记的审计。

---

## 模式探测检查清单

当 CLI 通过探测远程资源来自动判定模式时（如检查 `index.json` 是否存在以决定 marketplace 还是直连下载）：

### 实现之前：

- [ ] 探测在**所有**使用其结果的代码路径里都执行（交互式、`-y`、`--flag` 的各种组合）
- [ ] 区分 404 与瞬时错误——不能都当「不存在」
- [ ] 瞬时错误**中止或重试**，绝不静默切换模式
- [ ] 上下文变化时（如用户切换来源）**重置**共享状态（缓存、预取数据）
- [ ] **捷径路径**（如 `--template` 跳过选择器）的错误处理质量必须与探测路径一致——检查下游函数有没有绕进 catch-all 包装

### 实现之后：

- [ ] 从探测结果到模式判定分支，逐路径追踪——不许 fallthrough
- [ ] 外部格式契约（giget URI、raw URL）有测试覆盖或至少注释说明
- [ ] 元数据读取要么消费完整响应、要么用流式解析——绝不把固定大小前缀当完整 JSON 解析
- [ ] 从解析出的片段重组复合标识符时，验证**所有**字段都在且**位置正确**（是 `provider:repo/path#ref`，不是 `provider:repo#ref/path`）
- [ ] 验证捷径之后调用的 action 函数内部没有沿用旧的 catch-all 拉取——当错误区分有意义时必须用探测级变体

**真实案例**：自定义 registry 流程在 3 轮评审里发现 8 个 bug：(1) 探测只在交互模式跑；(2) 瞬时错误落进错误模式；(3) giget URI 的 `#ref` 位置错误；(4) 预取模板跨来源切换泄漏；(5) `--template` 捷径绕过了探测，但 `downloadTemplateById` 内部仍用 catch-all 的 `fetchTemplateIndex`，把超时变成了「Template not found」。

**真实案例**：agent 会话的更新提示用 `response.read(4096)` 取 npm `latest` 元数据再按完整 JSON 解析。`@mindfoldhq/trellis` 的包元数据超过 4 KB，JSON 被截断、解析静默失败，首次会话注入就没有更新提示。修复：先读完整个响应再解析，并补了一条「`version` 后跟 8 KB 元数据尾巴」的回归。

---

## 什么时候写流程文档

满足以下条件时写详细的流程文档：

- 特性横跨 3 层以上
- 多个团队参与
- 数据格式复杂
- 该特性之前出过 bug

---

## 事件日志 / 投影边界

只追加日志是跨层契约。一个事件要流经：

```
CLI 输入 → 事件写入器 → events.jsonl → 读取器 → 过滤器 → reducer → 展示
```

### 检查清单：新增事件种类或字段之后

- [ ] 把事件种类加进中央事件分类表
- [ ] 在事件层加带类型的事件变体或类型守卫
- [ ] 对来自用户输入或 JSON 的数组/对象字段，加归一化助手
- [ ] `seq` / `id` 的分配只留在事件写入器里
- [ ] 让过滤器和 reducer 消费带类型的事件守卫，而不是本地强转
- [ ] 让展示代码消费 reducer 输出或带类型事件，而不是原始 JSON
- [ ] 至少补一条回归，证明历史重放与实时过滤用的是同一个过滤模型

**真实案例**：Thread channels 新增了 `kind: "thread"`、`description`、`context`、labels 和 `lastSeq`。第一版重放线程状态是正确的，但若干命令仍在用本地强转解析事件载荷字段。修复：让核心事件层独占 `ThreadChannelEvent` 与 `isThreadEvent`，让 `reduceChannelMetadata` 成为唯一的频道元数据投影，`reduceThreads` 成为唯一的线程重放 reducer。
