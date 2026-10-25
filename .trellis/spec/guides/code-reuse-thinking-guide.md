# 复用思维指南

> **目的**：写新代码前先停下来想一想——它是不是已经存在了？

---

## 问题所在

**重复代码是「不一致 bug」的头号来源。**

当你复制粘贴或重写既有逻辑时：
- bug 修复无法传播到副本
- 行为随时间逐渐分叉
- 代码库越来越难理解

---

## 写新代码之前

### 第 1 步：先搜索

```bash
# 搜相似的函数名
grep -r "functionName" .

# 搜相似的逻辑
grep -r "keyword" .
```

### 第 2 步：问自己这几个问题

| 问题 | 如果是…… |
|------|-----------|
| 已有类似的函数？ | 直接用它或扩展它 |
| 这个模式在别处出现过？ | 沿用既有模式 |
| 它可以成为共享工具？ | 放到正确的位置去创建 |
| 我是不是在从别的文件抄代码？ | **停** —— 抽到共享处 |

---

## 常见重复模式

### 模式 1：复制粘贴函数

**坏**：把校验函数复制到另一个文件

**好**：抽到共享工具，需要的地方 import

### 模式 2：相似组件

**坏**：新建一个与现有组件 80% 相似的组件

**好**：用 props/变体扩展现有组件

### 模式 3：重复的常量

**坏**：同一个常量在多个文件里各定义一份

**好**：单一事实来源，处处 import

### 模式 4：重复的载荷字段提取

**坏**：多个消费方各自在本地强转同一批 JSON/事件字段：

```typescript
const description = (ev as { description?: string }).description;
const context = (ev as { context?: ContextEntry[] }).context;
```

哪怕只有两行，这也是重复的契约逻辑——每个消费方都私自定义了一遍「合法载荷长什么样」。

**好**：把解码器、类型守卫或投影函数放在数据的属主旁边：

```typescript
if (isThreadEvent(ev)) {
  renderThreadEvent(ev);
}
```

**规则**：同一个无类型载荷字段若被 2 处以上读取，在出现第 3 个读取方之前，先建共享的类型守卫 / 归一化器 / 投影函数。

---

## 什么时候该抽象

**该抽象**：
- 同样的代码出现 3 次以上
- 逻辑复杂到可能藏 bug
- 多人可能都需要它

**不该抽象**：
- 只用一次
- 琐碎的一行代码
- 抽象本身比重复更复杂

---

## 批量修改之后

对多个文件做了类似修改后：

1. **复查**：所有实例都改到了吗？
2. **搜索**：跑 grep 找有没有漏网
3. **思考**：是不是该抽象了？

### Reducer 应使用穷举结构

当状态由 action 类的值（`action`、`kind`、`status`、`phase`）派生时，优先用**单个 `switch` 的 reducer**，而不是散落的 `if/else` 更新。

```typescript
// 坏 —— 按 action 分散的状态迁移难以审计
if (action === "opened") { ... }
else if (action === "comment") { ... }
else if (action === "status") { ... }

// 好 —— 一张迁移表收在一个 reducer 里
switch (event.action) {
  case "opened":
    ...
    return;
  case "comment":
    ...
    return;
}
```

当事件日志是事实来源时这一点尤其重要：reducer 就是**有文档记录的重放模型**，展示代码和命令不应各自复刻其中片段。

---

## 提交前检查清单

- [ ] 搜索过是否已有类似代码
- [ ] 没有本应共享却被复制粘贴的逻辑
- [ ] 没有绕过共享解码器、在本地重复提取无类型载荷字段
- [ ] 常量只在 one 处定义
- [ ] 相似模式保持相同结构
- [ ] reducer/action 迁移收敛在一个 reducer 或命令分发器里

---

## 陷阱：Python if/elif/else 缺少穷举检查

**问题**：Python 的 if/elif/else 链没有编译期穷举检查。给 `Literal` 类型（如 `Platform`）新增一个值时，既有的 if/elif/else 链会**静默落入 `else`**，返回错误的默认值。

**症状**：新平台「部分可用」——某些方法返回 Claude 的默认值而不是平台专属值，且不报任何错。

**示例**（`cli_adapter.py`）：
```python
# 坏："gemini" 落入 else，返回 "claude"
@property
def cli_name(self) -> str:
    if self.platform == "opencode":
        return "opencode"
    else:
        return "claude"  # gemini 悄悄拿到 "claude"！

# 好：每个平台都有显式分支
@property
def cli_name(self) -> str:
    if self.platform == "opencode":
        return "opencode"
    elif self.platform == "gemini":
        return "gemini"
    else:
        return "claude"
```

**预防**：给 Python `Literal` 类型新增值时，搜索**所有**按该类型分叉的 if/elif/else 链并补显式分支。不要指望 `else` 对新值天然正确。

---

## 陷阱：产出相同结果的非对称机制

**问题**：当两个不同机制必须产出同一批文件时（如 init 用递归目录拷贝、update 用手工 `files.set()` 列表），结构性变更（改名/移动/新增子目录）只会经自动机制传播——手工那份会静默漂移。

**症状**：init 一切正常，update 却把文件放错路径或干脆漏掉。

**预防**：
- **最佳**：消灭非对称——让手工路径调用自动机制（如 `collectTemplateFiles()` 内部调 `getAllScripts()`，而不是自维护一份列表）
- **非对称无法避免时**：加一条回归测试，比对两个机制的输出
- 迁移目录结构时，搜索**所有**引用旧结构的代码路径

**真实案例**：`trellis update` 曾为 11 个脚本维护手工 `files.set()` 列表，而 `getAllScripts()` 本已跟踪同样的文件。修复：把手工列表换成 `for..of getAllScripts()` 循环。见 v0.4.0-beta.3 的 `update.ts` 重构。

---

## 模板文件注册（Trellis 专属）

往 `src/templates/trellis/scripts/` 加新文件时：

**单一注册点**：`src/templates/trellis/index.ts`

1. 加 `export const xxxScript = readTemplate("scripts/path/file.py");`
2. 加进 `getAllScripts()` 的 Map

就这两步。`commands/update.ts` 直接消费 `getAllScripts()`——无需手工同步。

**为什么重要**：没注册进 `getAllScripts()` 的文件，`trellis update` 不会同步到用户项目——bug 修复和新特性无法传播。

**历史**：v0.4.0-beta.3 之前，`update.ts` 自带一份手维护的文件清单，经常与 `getAllScripts()` 失同步，导致 `trellis update` 静默跳过 11 个 Python 文件。修复方式正是消灭重复清单、以 `getAllScripts()` 为唯一事实来源。

### 新脚本快速检查

```bash
# 加完新 .py 文件后，验证它已在 getAllScripts() 里：
grep -l "newFileName" src/templates/trellis/index.ts  # 应有匹配
```

### 模板同步约定

`.trellis/scripts/`（自用版本）与 `packages/cli/src/templates/trellis/scripts/`（模板版本）必须保持一致。改完 `.trellis/scripts/` 后务必同步：

```bash
rsync -av --delete --exclude='__pycache__' .trellis/scripts/ packages/cli/src/templates/trellis/scripts/
```

**陷阱**：rsync 的源/目标路径写反会嵌套出垃圾目录（如 `.trellis/scripts/packages/cli/...`）。执行前务必核对两个路径。
