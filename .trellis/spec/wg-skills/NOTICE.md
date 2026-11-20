# 来源与许可声明 — wg-skills 吸收层

本目录（`.trellis/spec/wg-skills/`）下的全部文档，均**基于以下开源仓库的内容修改（转写）而来**：

| 项目 | 内容 |
|------|------|
| 源仓库 | https://github.com/jiushiwon/wg-skills |
| 作者 | jiushiwon（考拉搞 AI / itlifetime.com） |
| 吸收时的源版本 | commit `3b93743e0f87a36b7b3456a609b2b937897b8e7e`（2026-11-01 抓取） |
| 源仓库许可 | **Apache License 2.0**（见源仓库根目录 `LICENSE` 文件） |
| 源仓库规模 | 158 个技能，5 大板块 |

> ⚠️ 源仓库 README.md 中多处自称「MIT 协议」，但其根目录 `LICENSE` 文件实际是
> Apache License 2.0。本层以 `LICENSE` 文件为准，按 **Apache-2.0** 处理署名与修改声明。

---

## 修改说明（Apache-2.0 §4(b) 要求的变更声明）

本层内容**并非原样复制**，而是做了如下修改：

1. **合并转写**：158 个独立技能按其技术主题合并为 22 份规范文档（如 Java 的 16 个技能
   合并为 `backend/java-springboot.md`）。22 份已全部产出（2026-11-20 续做完成 13 份）。
2. **剥离技能机制**：删除了源 `SKILL.md` 的 YAML frontmatter（`name` / `description` /
   触发词）——那是面向「技能自动触发」的机制，与 Trellis 的 spec 按需读取模型无关。
3. **剥离人类向内容**：删除 README.md 的安装说明、营销叙述、图片引用、目录导航。
4. **压缩叙述**：保留规则、红线、契约、清单、模板等**规范实质**（精确值照抄），
   压缩解释性叙述与重复示例。各文档压缩率不同，详见各文档头部说明。
5. **不吸收可执行资产**：源仓库的 `scripts/`、图片与二进制文件**未收录**；受影响的
   技能在文档中以一句「源仓库有配套脚本 `<路径>`，用途：…」注明出处。
6. **标注私有引用**：源文档中引用 4 个私有仓库技能
   （`vue-admin-skill` / `sse-agent-skill` / `universal-identity-bridge-skill` /
   `universal-login-bridge-skill`，源仓库 `MISSING_SKILLS.md` 登记）之处，
   统一标注「（源仓库私有技能，未收录）」，不假装其内容存在。
7. **新增路由层**：`index.md` 为本层新增的技能→文档映射与场景导航，源仓库不存在对应物。

## 未收录的技能

以下 4 个技能被源仓库的公开技能引用，但本身在私有仓库 `wg-project-kits` 中维护，
**本层不含其内容**：

- `vue-admin-skill` — Vue3 + Element Plus 后台脚手架
- `sse-agent-skill` — SSE 流式 AI 对话编排器
- `universal-identity-bridge-skill` — 统一身份接入编排
- `universal-login-bridge-skill` — 通用登录前端桥接

## 使用边界

- 本层是**参考资料**，不是本项目的强制规范。本项目（zaneLab）自身的强制约定在
  `.trellis/spec/frontend/`。
- 源仓库标注「技能持续迭代、不保证向后兼容」，本层是某一时点的快照；源仓库后续更新
  不会自动同步（见任务 `.trellis/tasks/11-01-absorb-wg-skills/prd.md` 的 Out of scope）。
- 重新吸收/更新时，以本文件记录的 commit 为基线做 diff。

## 许可全文

Apache License 2.0 全文见源仓库：https://github.com/jiushiwon/wg-skills/blob/main/LICENSE
（本层不重复收录，避免与本项目自身许可状态产生歧义。）
