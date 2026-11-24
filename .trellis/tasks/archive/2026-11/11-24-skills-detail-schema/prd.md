# skills 详情页数据模型重构：i18n 副表 + JSONB 分桶 + 类型化媒体 + 表单动态分节

## Goal

按 skillry.dev（https://skillry.dev/skills 及 4 类输出详情页）实测的信息架构，
重构 skills 技能的数据模型与录入形态：补齐参考站详情页展示的关键维度（版本号、
一句话用途、描述、价格三态、媒体画廊、演示示例、交付清单、适用/不适用、准备事项、
标签四类、i18n 多语言），并让 skill-form-modal 的录入表单**按输出类型动态分节**。

**用户价值**：技能市场从「12 条静态演示数据」升级为「可真实录入、内容结构与
国际主流技能市场对齐」的可运营模型。

## Background（调研证据，已核实）

**调研方法**：MCP chrome-devtools 实测 skillry.dev 4 类输出（web / slides / video /
image）的详情页与分类页，DOM 结构 + data-testid + JSON-LD + 中英页面对照。

**详情页信息架构（7 个样本页实测：bs-mint-noir-saas-site / bs-mint-marker-deck /
bs-plush-crew-launch-video / bs-dot-avatar-maker / bs-anthropic-ipo-style-film /
bs-audio-report-deck / bs-field-notes-deck）**：

| 区块 | 实测内容 | data-testid |
|---|---|---|
| 面包屑 | Skills / {输出类型} / {名称} | skill-detail-breadcrumb |
| 采集卡 | Pick 徽章 → 标题 + **版本号 v1.0.1** → **一句话用途**（"Use this Skill to build landing page"）→ Popular 徽章 → **评分 5.0 + 评论数 / 下载 / 喜欢 / 收藏** 四统计 → **价格三态**（Free / $4.99 Buy now / "Needs ELEVENLABS_API_KEY"）→ 订阅推广 → 安装按钮 → **描述段** | skill-acquisition-card / skill-detail-price / skill-detail-rating / skill-detail-downloads / skill-detail-likes / skill-detail-saves / skill-detail-description / skill-badge-chips / skill-task-expression / skill-detail-feature-row |
| 画廊 | 多图（web 3 图 + 1 视频；slides 5 图；image 图+视频）；**视频可排首位** | skill-detail-gallery-scroll |
| 演示示例 | "YOU SAY" prompt 文本 + 成品截图配对（1–2 组） | skill-demo-example-N |
| 适配卡 | Runs in（agent 芯片 + 安装指南链接）+ **Generates with**（驱动模型，如 Claude Fable 5.2 / GPT Image）+ **Uses tools**（ChatCut / ElevenLabs / FAL） | skill-works-with / skill-agent-learn-links |
| 交付清单 | What you get：3–9 条 | skill-offer-grid |
| 适用性 | Good fit 3 条 / Not for 3 条 | skill-fit-good / skill-fit-not-for |
| 标签云 | **四类**：scenario（可链接 taxonomy，已翻译）/ task（已翻译）/ highlight（已翻译）/ style（**保留英文不译**） | skill-detail-tags + data-tag-kind |
| 指南长文 | About this Skill：富文本多章节（zh 页 h2：你会得到什么 / 改成你自己的 / 检查结果） | skill-guide-expanded-content |
| 准备事项 | **四段固定 dt/dd**：You bring / Dependencies / Outside costs / **Last tested**（"v1.0.1 — Claude Code / Codex / ChatGPT"） | skill-requirements |
| 评论 | 评分汇总 + 评论列表 + 登录后评价 | skill-reviews-section |
| 推荐 | Similar Skills 8 张横滑（可运行期计算，不建列） | skill-similar-rail |

**i18n 实测（hreflang）**：支持 10 语言（en / zh-CN / zh-TW / ja / ko / es / pt-BR /
de / fr / ar），URL 前缀式（`/zh/skills/...`）。**中英页面对照判定哪些内容翻译**：

| 内容 | 翻译？ | 例（en → zh） |
|---|---|---|
| 标题 | ✅ 整词翻译（非 slug） | Mint Noir SaaS Site → 薄荷暗夜软件产品官网 |
| 一句话用途 | ✅ | Use this Skill to build landing page. → 使用这个 Skill：制作落地页。 |
| 描述段 / About 长文 / What you get / 准备事项 | ✅ 全译 | — |
| scenario / task / highlight 标签 | ✅ | Web Design & Digital Experiences → 网站与数字体验；Style-locked → 风格锁定 |
| **style 标签** | ❌ **保留英文** | Bento Grid / Soft Glow / Dark Mode 中英一致 |
| 版本号 / 统计数字 / 价格 / API key 需求 | ❌ 语言无关 | — |

**列表卡实测（分类页）**：卡片只承载「预览图（可轮播多图）+ 名称 + 输出类型徽章 +
Free/付费徽章」，**描述/统计不在卡上**——列表页数据需求远小于详情页。

**现有 skills 表（apps/skills-web/supabase/migrations/0001_skills_table.sql）**：
15 列（id/title/free/featured/output_types/roles/scenes/downloads/bookmarks/rating/
tone/agents/created_at/updated_at），SkillItem 契约同构，静态种子 14 条。
**缺口**：无版本号 / 一句话用途 / 描述 / 价格三态 / 媒体 / 演示示例 / 交付清单 /
适用性 / 准备事项 / 标签四类分离 / i18n。

**本仓 i18n 既有形态**：技能市场页的静态文案走**语言包**（`src/locales/{zh-CN,
en-US}.json`，117 key 双语一致）；数据层多语言尚无先例（iam 的菜单 i18nKey 是**单
语言 + i18nKey 指针**形态，见 spec 菜单 i18nKey 链路）。

## Requirements

### R1 数据模型：主表基线 + i18n 副表（决策 a/c）

- `skills` 主表新增/改造列：
  - **语言无关**：version（semver 文本）、task_expression（短句，单语言基线）、price_kind
    （enum: free/paid/requires_key）、price_amount（numeric，paid 用）、price_note
    （requires_key 时如 "Needs ELEVENLABS_API_KEY"）、requires_api_key（text[]）、
    likes（计数）、reviews_count、score numeric(2,1)（用户均分，D5）、
    media（jsonb）、demo_examples（jsonb）、deliverables（jsonb）、
    good_fit / not_for（jsonb）、requirements（jsonb 四段）、tags（jsonb 四桶）、
    generates_with（text[] 模型）、uses_tools（text[]）、try_online_url（web 类）
  - **基线语言内容**（title / summary / description / task_expression）留在主表
    （默认 zh-CN，与现有种子一致）
- 新表 `skills_i18n`（skill_id, locale, title, summary, description, task_expression,
  primary key(skill_id, locale)）：**只存译文**，缺该 locale 回落主表基线
- 查询约定：列表接口只读主表基线（不 join 副表，避免 N+1）；详情接口按
  `?locale=` join 副表，命中则覆盖、否则回落基线

### R2 标签四类 JSONB 分桶（决策 b）

- `tags jsonb` 结构：`{ scenarios: string[], tasks: string[], highlights: string[],
  styles: string[] }`
- 语义约定：**scenarios/tasks/highlights 存 i18n key**（语言包解析，可翻译）；
  **styles 存原文**（品牌专名，不翻译）——「翻译/不翻译」差异在存储层显式
- 保留旧 roles/scenes 列？——见 design（迁移期兼容）

### R3 媒体与清单 JSONB（决策 c 混合：媒体 JSONB + 清单 JSONB）

- `media jsonb`：`[{ kind: 'image'|'video', url, alt?, width?, height?, order }]`
  （视频可排首位，order 决定）
- `demo_examples jsonb`：`[{ prompt, media: {kind,url}, caption? }]`
- `deliverables jsonb`：字符串数组（What you get）
- `good_fit jsonb` / `not_for jsonb`：字符串数组
- `requirements jsonb`：`{ bring: string[], dependencies: string[], outside_costs: string[],
  last_tested: string }`
- `tags jsonb`（见 R2）；`last_tested` 内嵌 requirements，不再单列（收敛）
- **评分并存**（D5）：`rating`（作者自评 1–5 整数，原义保留）+ `score`（用户均分
  numeric(2,1)）+ `reviews_count`（评论数）

### R4 edge fn / api / mock 契约同步

- edge fn（`apps/skills-web/supabase/functions/skills/index.ts`）：写路径
  `toRowValues` 扩展映射（camel→snake + JSONB 列的 camel→snake 键映射）
- `skills_i18n` 的写入：随 skill 提交的 i18n payload（可选字段）——写路径需 upsert
  副表
- api 层（`src/api/skills.ts`）：SkillRecord/SkillInput 契约扩展；新增
  `getById(id, locale?)`；locale 参数从 props/语言上下文取（不硬编码）
- mock（`src/mocks/skill-handlers.ts`）：种子扩到参考站信息维度（至少 1 条完整
  「薄荷暗夜」等价条目）；mocks 与迁移种子同源
- record.ts（行 → SkillItem）：列表用摘要字段；详情用全字段

### R5 skill-form-modal 按输出类型动态分节（决策 c 全链路）

- 表单分节（参考站录入维度）：
  1. **基础**：标题（基线语言）、一句话用途、描述、版本号
  2. **输出类型**（多选，决定后续分节渲染）：网页 / 幻灯片 / 视频 / 图像
  3. **按类型专属分节**（多选类型的分节并集渲染）：
     - 网页：在线试用 URL、页面/技术栈标签
     - 幻灯片：导出格式（PPTX/在线）、页数范围、演讲者备注开关
     - 视频：时长、分辨率（4K/1080p）、配音语言、所需 API key
     - 图像：示例图集上传位、风格标签、尺寸/比例
  4. **内容清单**：What you get / Good fit / Not for（三组文本清单）
  5. **准备事项**：You bring / Dependencies / Outside costs / Last tested
  6. **标签**：scenario / task / highlight（i18n key 多选）+ style（自由文本，多选）
  7. **兼容**：适配 agent（多选）、驱动模型（多选）、外部工具（多选）
  8. **媒体**：画廊（图片/视频 URL 列表 + 排序）、演示示例（prompt + 媒体）
  9. **定价与状态**：Free / 定价（金额）/ 需 API key；精选开关
- i18n 录入：**基线语言字段 + 可选「其他语言」分区**（副表写入）——表单以语言包
  提供语言下拉，译文可留空（留空 = 回落基线）

### R6 详情页 —— **本任务不做**（另立项）

- 技能详情页（路由 + 页面 + 画廊/清单展示）单独立项；本任务产出的新字段先由
  表单与接口消费验证，详情页消费该结构时契约不变

## Out of Scope

- **技能详情页 UI**（路由 + 页面 + 画廊/清单/评论展示）——另立项
- 评论/评分写入（只读展示 + 计数列；评论系统留后续）
- Similar Skills 推荐算法（运行期按标签/类型近似算即可，不建列）
- 真实文件上传（媒体走 URL 录入；上传存储另立任务）
- 技能包 ZIP 下载/安装（参考站的 Install in your agent / Download ZIP 不实现）
- 商业化（订阅/付费购买流程不实现，只留价格字段与展示）
- 10 语言全覆盖（本期 zh-CN 基线 + en-US 译文；副表结构支持任意 locale）

## Acceptance Criteria

- [ ] AC1：新迁移落 `skills` 新列 + `skills_i18n` 副表；迁移幂等（重复 up no-op）；
      旧列（roles/scenes 等）的迁移策略明确（旧种子数据落新结构，不丢数据）
- [ ] AC2：edge fn 写路径正确落 JSONB 列（camel→snake 键映射 + JSONB 结构），
      集成态真实 DB 写入不报 PGRST204；create/update 均通
- [ ] AC3：详情查询带 locale：命中副表返回译文、缺失回落基线；列表接口不 join
      副表（性能契约）
- [ ] AC4：mock 种子与迁移种子同源且含完整维度（至少 1 条 web 类全字段条目）；
      mock 与真实接口行为一致（含 i18n 回落）
- [ ] AC5：skill-form-modal 按输出类型渲染专属分节（切换输出类型即增删分节）；
      录入字段覆盖 R5 九组；基线语言 + 可选译文分区
- [ ] AC6：语言包新增 skills.form.* / skills.detail.* 段，两包 key 树一致
- [ ] AC7：四包 tsc/build/lint 全绿 + skills-web vitest 全过（含新增 i18n 回落、
      分节渲染、JSONB 映射用例）

## Key Decisions

- **D1 i18n 存储 = 主表基线 + 副表译文**（用户决策 2026-11-24）：列表页读基线不
  join；详情按 locale join，缺失回落基线。副表只存译文（不存基线行）
- **D2 标签 = JSONB 四桶**（用户决策 2026-11-24）：scenarios/tasks/highlights 存
  i18n key，styles 存原文不译
- **D3 媒体/清单 = JSONB 列**（用户决策 2026-11-24）：媒体 JSONB 单列（不建子表）
- **D4 范围 = 数据层 + 表单动态分节**（用户决策 2026-11-24）：DB + fn + api/mock +
  表单按输出类型分节；**详情页 UI 不含**（另立项，用户决策 2026-11-24）
- **D5 评分共存**（用户决策 2026-11-24）：`rating`（作者自评 1–5 整数，保留原义）+
  新增 `score`（用户评分均值 numeric(2,1)）+ `reviews_count`（评论数）
- **D6 实施偏好**：不派发子代理，全部主代理 inline 执行（用户长期偏好，已存记忆）

## Open Questions

- 无阻塞项（Q1 详情页范围、Q2 评分语义均已决策）
