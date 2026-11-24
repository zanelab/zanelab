# Implement — Modal 组件下沉 + skills-web 消费改造

> 方案 b（外壳 + 表单原语）；受控 open/onOpenChange 语义已确认。
> 实施顺序：ui 包组件 → skills-web 消费改造 → 四包验证。

## 步骤

| # | 步骤 | 落点 |
|---|---|---|
| 1 | Modal 外壳 | `packages/ui/src/modal/modal.tsx` + `modal.css` + `index.ts`（结构/契约见 design §2） |
| 2 | 表单原语 | `packages/ui/src/form/{field,chip,modal-actions}.tsx` + form/index.ts 追加导出 |
| 3 | ui 包导出收口 | `packages/ui/src/index.ts` 追加 `export * from './modal'`；确认 form 导出含新原语 |
| 4 | skills-web 消费改造 | `skill-form-modal.tsx`：两弹窗换 Modal 壳 + Field/ChipCheck/ModalActions；对外契约/锚点/行为零变化（design §3） |
| 5 | 样式接线 | skills-web 引入 modal.css（index.css import 或等价）；确认 --page-radius 联动与缺省 22px 兜底 |
| 6 | 全量验证 | 见「验证命令」 |

## 关键实施注意

- **零耦合红线**：新组件不 import i18next / stores / config / apps/* 任何模块；
  文案全 props 传入（spec directory-structure「零耦合叶子组件」）
- **token 映射**：不搬参考站 ink-*/#f4f1e9/#121313 私有值——scrim 用 bg-black/40、
  卡片 bg-base-100、边框 border-base-300、选中胶囊 primary 系（design §2 映射表）
- **测试锚点保持**：`aria-labelledby="skill-form-title"` / `"skill-delete-title"`
  必须原样保留（title h2 的 id）；marketplace.test.tsx 期望**零修改**是硬验收
  ——若发现必须改测试才能过，先回来核对 design §3 契约是否被破坏
- **受控语义**：Modal 内部绝不自行卸载或缓存 open 状态；Escape/scrim/关闭钮只
  回调 onOpenChange(false)；「失败留弹窗」由调用方成功才改 state 保证
- **icon**：关闭钮用 AppIcon（查 BUILTIN_ICONS 无 'x' 字形则补——参考站关闭
  图形 `M6 6l12 12M18 6L6 18`）
- **jsdom 角色**：新壳是 div[role=dialog]（显式 role），byRole 可用；与旧原生
  `<dialog>` 不同但测试锚定走 aria-labelledby，无影响

## 验证命令

```bash
# ui 包
cd packages/ui && npx tsc --noEmit -p tsconfig.json && npx oxlint src

# skills-web
cd apps/skills-web && npx tsc --noEmit -p tsconfig.json && npx vitest run && pnpm build && npx oxlint src

# 连带（ui 依赖方，零代码改动验证无回归）
cd apps/portal-web && npx tsc -b && npx vitest run
cd apps/iam-web && npx tsc -b && npx vitest run
```

## 风险文件与回滚

| 文件 | 风险 | 缓解/回滚 |
|---|---|---|
| skill-form-modal.tsx | 改造破坏既有测试锚点/行为 | 锚点 id 平移不删除；契约零变化为硬验收；单 commit 可整体 revert |
| packages/ui/src/index.ts | 导出污染（循环/误导出内部件） | 只追加 modal 与 form 新原语；tsc 全包验证 |
| 四包联动 | ui 类型变化传导 iam/portal | 两包只读依赖，tsc/build 验证无改动 |

## 实施前检查清单

- [ ] prd / design 已评审（用户批准规划摘要）
- [ ] `task.py start` 已执行
- [ ] BUILTIN_ICONS 键清点完成（关闭/勾选图形有无现成键）
- [ ] marketplace.test.tsx 当前弹窗用例行号清点（改造后逐条对照）
