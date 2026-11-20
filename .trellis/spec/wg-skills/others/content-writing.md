<!-- 来源: jiushiwon/wg-skills @ 3b93743 (Apache-2.0)，有修改；详见 ../NOTICE.md -->
# 内容创作与文案规范（去 AI 味 / 小红书 / 流程图 / 音视频）

> 本文档合并转写自 wg-skills 的 6 个技能：`others/ai-speech-detector`、`others/humanizer`、
> `others/xhs-style-writer-skill`、`others/workflow-diagram-skill`、`others/video/ffmpeg-skill`、
> `others/video/remotion-skill`。**检测维度、权重、阈值、模式编号、命令、配色值等精确值照抄原文**；
> frontmatter、触发词、安装教程与营销叙述已剥离。源技能配套脚本（py/ps1/sh）不收录，仅在相关小节注明用途与源路径。

## 〇、红线 / 强制约定

1. **正式文章零 emoji**：任何 emoji（含表格首列装饰、列表前缀、句尾点缀）必须报告并删除，1 个也算命中。
2. **不编造**：不添加原文没有的事实、人名、数字、日期、引文；缺细节时问用户或用更简单的句子；体验类细节宁可留 `[占位：这里填你的真实经历]`。
3. **不删用户源文件**：音视频类技能只生成新文件，删除需用户确认。
4. **单一事实来源**：Remotion 项目中 `script.json` 是文案与时长的唯一来源，组件只读取不硬编码。
5. **执行前确认**：ffmpeg 默认加 `-y`，但执行前必须确认不会误覆盖重要文件；路径含空格/中文必须双引号包裹。
6. **流程图生成**：不问用户「节点怎么连」；模板优先、语义推断兜底；必须同时输出 SVG + PNG 并展示 PNG；节点超过 8 个必须分组。
7. **小红书文案**：不承诺「必爆/必上热门」；功效宣称（医疗/金融/减肥）须提示合规并给软化表述；对标账号须有使用权，禁止冒充、洗稿；商业推广须提示标注。

---

## 一、AI 风检测（`others/ai-speech-detector`）

检测文案中的 AI 风味词汇、套话、车轱辘话，输出量化评分、领域适配、风格校准与一键修复；支持中文、英文、中英混合。

### 1.1 检测维度（核心 10 个）

| 维度 | 优先级 | 权重 | 检测内容 |
|------|--------|------|----------|
| 开头套话 | P0 | 15% | 说句大实话、扎心真相、揭秘 |
| 车轱辘话 | P0 | 15% | 首先/其次/最后、总而言之 |
| 虚词堆砌 | P1 | 8% | 其实、而且、但是、实际上 |
| 短句短语 | P1 | 8% | 列表式短句、两字短语堆砌 |
| 结尾套话 | P2 | 5% | 最后说一句、评论区见 |
| 英文 AI 词汇 | P1 | 12% | delve, tapestry, robust, pivotal 等 |
| 结构模式 | P1 | 12% | 二元对立、戏剧化断句、分形总结 |
| 格式模式 | P2 | 5% | 粗体首词列表、Unicode 箭头、破折号 |
| Emoji 滥用 | P0 | 10% | ✅⚠️❌🔥💡✨ 等 emoji 堆砌 |
| 夸大其词 | P0 | 10% | 震惊、颠覆、革命性、绝对、必须、一定 |

增强维度 3 个：**领域适配**、**节奏分析**（句长分布 / Burstiness）、**中英混合**。

### 1.2 AI 风指数算法与评级

```
AI风指数 = Σ(维度命中数 × 维度权重) / 文本总字数 × 100
维度得分 = (该维度命中数 / 该维度阈值) × 100，封顶 100
```

| 维度 | 轻度阈值 | 中度阈值 | 重度阈值 |
|------|----------|----------|----------|
| 开头套话 | 1 个 | 2 个 | 3 个+ |
| 车轱辘话 | 2 个 | 4 个 | 6 个+ |
| 虚词堆砌 | 3 个 | 6 个 | 10 个+ |
| 英文 AI 词汇 | 2 个 | 5 个 | 8 个+ |
| 结构模式 | 1 个 | 3 个 | 5 个+ |
| Emoji 滥用 | 1 个 | 3 个 | 5 个+ |
| 夸大其词 | 2 个 | 4 个 | 6 个+ |

评级：**0–30% [自然]**／**30–60% [轻度]**（建议修改）／**60–80% [中度]**（需要修改）／**80%+ [重度]**（必须重写）。

### 1.3 领域适配

| 领域 | 触发关键词 | 特色 AI 模式 |
|------|------------|--------------|
| 学术论文 | 研究、方法、结论、摘要 | "The implications are significant"、"highlighting the need for" |
| 社媒/短视频 | 家人们、绝绝子、沉浸式 | 绝绝子、泰裤辣、沉浸式体验、家人们谁懂啊 |
| 电商文案 | 限量、抢购、秒杀、优惠 | 错过再等一年、仅剩最后 X 件、手慢无 |
| 技术博客 | 聊聊、总结一下、不BB | 简单聊聊、总结一下、不BB直接上代码、干货 |
| 公文/汇报 | 贯彻、落实、加强、提高 | 认真贯彻落实、切实加强、进一步提高、扎实推进 |

识别规则：含「摘要/关键词/参考文献/methodology」→ 学术；含「家人们/绝绝子」或 emoji 密度 > 20% → 社媒；
含价格/抢购/限时/秒杀 → 电商；含代码块/教程/干货且技术术语密度高 → 技术博客；含「贯彻/落实/推进/加强」动词堆砌 → 公文。多领域混合分别列出结果。

重点领域加分项：**学术** —— `It is worth noting that`、`Taken together, these results`（Critical），摘要三段式（背景-方法-结论）机械结构，Discussion 中 may/might/possibly 过度使用。
**社媒** —— 尊嘟假嘟（Critical）；家人们/谁懂啊/绝绝子/泰裤辣/沉浸式/YYDS/无语子/栓Q/CPU 烧了；emoji 每段多个、「来了来了」式开头、「最后最后」式结尾。
**电商** —— 错过再等一年、仅剩最后 X 件、全网最低价、亏本甩卖、错过后悔一辈子（Critical）；价格锚定（原价 999 现价 99）、稀缺营造、紧迫叠加。
**技术博客** —— 全网最全、看这一篇就够了（Critical）；代码块堆砌无解释、机械「步骤 1/2/3」、标准「前言-正文-总结」、每篇先给结论。
**公文** —— 认真贯彻落实、切实加强、进一步提高、扎实推进、统筹推进、多措并举（Critical）；「一是…二是…三是…」机械列举、「下一步工作计划」固定结尾。

### 1.4 节奏分析（Burstiness）

1. **句子长度变异系数**：AI 文本标准差通常 < 8，人类文本通常 > 15。
2. **三句同长度检测**：连续三句字数相差 ≤3 记一次；1 次 = 轻度，3 次+ = 重度。
3. **段落句数一致性**：每段句子数基本相同 = AI 强信号。

```
Burstiness = (句子长度标准差 - 平均句子长度) / (句子长度标准差 + 平均句子长度)
AI 文本：-0.5 ~ 0.2        人类文本：0.3 ~ 0.8
```

### 1.5 中英混合检测

| 模式 | 示例 | 自然表达 |
|------|------|----------|
| 英文词汇中式用法 | 这个 feature 真的很 robust | 这个功能很稳定 |
| 中英套话混合 | 我们需要先 align 一下 | 先对齐一下 |
| 强行翻译腔 | 让我们 dive into 这个话题 | 深入这个话题 |
| 标点混用 | 这个feature，真的robust。 | 统一中英标点 |

高风险夹杂词：`dive into`/`delve into`/`deep dive`/`game changer`（Critical）；`align`/`sync`/`follow up`/`takeaway`/`action item`/`bottom line`/`low hanging fruit`/`moving forward`/`circle back`（High）。
评分：0–2 自然／3–5 轻度／6–10 中度／10+ 重度。

### 1.6 Emoji 零容忍检测

**正式文章中禁止出现任何 emoji**，必须逐行扫描全文（含表格第一列左侧、列表前缀、标题装饰、句尾点缀）。

须覆盖 17 个 Unicode 区间：U+1F600–1F64F（表情）、U+1F300–1F5FF（杂项符号象形）、U+1F680–1F6FF（交通地图）、
U+1F900–1F9FF（补充符号）、U+1FA00–1FA6F（棋子）、U+1FA70–1FAFF（扩展）、U+2600–U+26FF（杂项符号）、
U+2700–U+27BF（装饰箭头）、U+FE00–U+FE0F（变体选择符）、U+200D（零宽连接符）、U+20E3（keycap）、
U+E0020–U+E007F（标签）、U+1F1E0–U+1F1FF（国旗）、U+1F000–U+1F02F（麻将）、U+1F0A0–U+1F0FF（扑克）、
U+1F030–U+1F09F（多米诺）、U+231A–U+231B（手表沙漏）。

AI 高频重点清单：状态标记 ✅⚠️❌🔴🟡🟢；强调 ✨💡🔥💪🎯；箭头 ➡️⬇️⬆️⬅️📌；表情 😊🤔💯👍😍；装饰 🌟⭐🎉🚀；
媒体 🎬📝📱📖🎥🖼️🎙️📊🔍；人物 👤👥👨👩；物品 💰📄🗂️📁💻🖥️📎🔑。
判定：1 个 = 轻度，2–5 个 = 中度，6 个+ = 重度。修复：全删；表格用纯文字；列表用编号或破折号；强调用粗体或引号；目录用「（你在这里）」代替 📌。

### 1.7 夸大其词检测

核心原则：**AI 用绝对化语言制造「权威感」，人类更常用模糊限定词。**

| 类别 | 词汇 | 人类替代 |
|------|------|----------|
| 绝对肯定 | 必须、绝对、一定、肯定、必然 | 可以、通常、一般、往往 |
| 绝对否定 | 完全不、绝不、从不、永不 | 很少、不太、不一定 |
| 夸大程度 | 极其、非常、特别、超级、超 | 很、挺、比较、相当 |
| 夸大效果 | 震惊、颠覆、革命性、划时代 | 有意思、有改进、有变化 |
| 夸大范围 | 所有人、每个、全部、一切 | 很多人、大多数、不少 |
| 夸大紧迫 | 必须马上、立刻、刻不容缓 | 可以考虑、建议、最好 |

夸大句式 5 类：绝对化断言、夸大效果、夸大范围、夸大紧迫、二元对立。
修复：删绝对化词；删夸大形容词；加限定词（我觉得/可能/也许/大概/一般来说）；用数据代替形容词（效果很好 → 用了两周效率提升 30%）；承认不确定性；避免二元对立。

### 1.8 去 AI 味核心理念（4 条）

1. **允许不完美**：口语化（「怎么说呢」）、犹豫不确定（「我不太确定」「可能吧」）、半句话与碎碎念。
2. **制造参差**：段落长短不一（一段 3 行、下一段 1 行）、句子长短交替、结构不完全对仗。
3. **留下人的痕迹**：具体数字（「瘦了 12 斤」而非「瘦了不少」）、时间地点（「上周三」「在北京」）、个人感受（「第一次用的时候心里打鼓」）。
4. **避免 AI 高频模式**：连接词（首先/其次/最后、综上所述、值得注意的是）；开场白（在这个…的时代、随着…的发展）；结尾升华（写在最后、总而言之）。

### 1.9 风格校准与风格训练

| 功能 | 风格校准 | 风格训练 |
|------|----------|----------|
| 样本数量 | 1 篇 | 1–3 篇（推荐 3 篇） |
| 输出 | 重写已有文本 | 创作全新内容 |
| 风格 Profile | 简要分析 | 详细的结构化风格报告 |
| 适用场景 | 修改已有文案 | 用个人风格写新文章 |

**风格校准 6 维度**：句子长度模式（短促/流畅/混合）、词汇水平（口语/学术/中间）、段落开头方式（直入/铺垫/反问）、标点习惯、口头禅与重复语、过渡方式。
**风格训练 5 维度**：宏观结构、句子节奏、词汇特征、语气与视角、标点与格式；流程为：逐篇分析 → 提取跨样本共性生成 Profile → 输出风格特征报告 + 风格规则 → 用 Profile 创作新内容。
输出模板固定含「风格特征分析」（上述 5 维度）与「风格规则（创作时必须遵守）」两张清单，例如：开头必须用场景引入；段落长度 150–300 字；句子长短交替；用「我」的视角口语化；善用比喻；结尾要有升华。
另有「用户风格词汇固化」细则（源 `references/user-style-vocabulary.md`）：把用户高频称呼词固化为随机替换表（如「朋友们 → 小伙伴们/童鞋们/兄弟们，随机选一个」）。

### 1.10 检测输出格式（必须遵守）

固定结构：`# AI 风检测 - <标题>` → 元信息（检测时间 / 文本长度 / 检测领域）→ `## AI 风指数：<XX>% <评级>`
的 10 维度加权表（列：维度 / 命中数 / 阈值 / 得分 / 权重 / 加权得分，权重合计 100%）→ 节奏分析（平均句长、句长标准差、Burstiness、三句同长度次数）→
**P0 问题（必须修改）** 逐条给位置、原文引用、问题描述与 Suggested fix → **P1 问题（建议修改）** → 领域特色检测表（模式/次数）→ 中英混合检测表 →
**一键修复**（修复后全文 + Before/After 对比表）→ 若用户提供样本则附风格校准结果与「用您的风格重写」。
末尾：指数 > 60% 输出 `[警告] AI 风较重（XX%），建议应用一键修复或风格校准。`；≤ 30% 输出 `[通过] 文本自然度良好，无明显 AI 痕迹。`

### 1.11 词表摘录

> 完整词表见源仓库 `references/`（`ai-words.md` 193 行、`english-words.md` 192 行、`structural-patterns.md` 259 行、
> `domain-patterns.md` 171 行、`exaggeration-patterns.md`、`emoji-patterns.md`、`mixed-language.md`、
> `voice-calibration.md`、`style-training.md`、`user-style-vocabulary.md`）。

**中文（ai-words.md）**：「开头套话」说句大实话／扎心的真相／揭秘／说一句大实话（Critical）、说实在的／客观来说／其实吧（High）｜
「车轱辘话」首先／其次／最后／总的来说／一句话概括（Critical）、简单来说（High）｜「虚词」其实／而且／但是／实际上（High）｜
「短句短语」列表式枚举（1. 2. 3.）、感叹号堆砌、两个词强行总结｜「结尾套话」最后说一句（Critical）、有什么看法／觉得有用点个赞／评论区聊聊／家人们／兄弟们｜
「填充语」不可否认的是、值得注意的是、需要指出的是、平心而论、众所周知、从某种意义上说、归根结底、一言以蔽之、更有甚者、退一步讲、话虽如此、无独有偶、毋庸置疑｜
「模糊引用」（Critical）专家表示／有人认为／不少人觉得／很多人不知道／研究发现（未指明）／数据显示（未给出）／权威机构称／业内人士透露 —— 修复：给具体来源或删除｜
「二元对立」（High）不是…而是…／与其说…不如说…／表面上看…实际上… —— 修复：直接陈述不对比｜
「虚假真诚」（High）说实话／讲真／不吹不黑／摸着良心说／凭心而论／说句心里话／可能很多人不同意，但是／我知道这听起来很疯狂，但是｜
「绝对化」（High）每个人都知道／所有人都会／永远／绝对／必然／毫无疑问／无一例外。
修改技巧：开头套话→删；车轱辘话→融；虚词堆砌→删；短句→长句；英文 AI 词→替换；结构模式→改写。

**英文（english-words.md）**：Significance puffers — pivotal/crucial/vital/significant/essential/groundbreaking/remarkable/transformative/profound（Critical）、
paramount/indispensable/quintessential（High）｜AI analytical verbs — delve/embark/leverage/utilize/facilitate/foster/garner/bolster/underscore/showcase（Critical）、
harness/streamline/exemplify/embody/transcend/cultivate/elucidate/illuminate（High）｜Poetic nouns — tapestry/landscape/realm/paradigm（Critical）、
ecosystem/nexus/interplay/mosaic/cornerstone/beacon/catalyst/confluence（High）｜Promotional adjectives — vibrant/comprehensive/robust/seamless（Critical）、
innovative/dynamic/cutting-edge/meticulous/intricate/nuanced/nestled/breathtaking/renowned/bustling/holistic/multifaceted（High）｜
Puffery adverbs — seamlessly/meticulously/profoundly（Critical）、remarkably/notably/crucially/undeniably/inherently/poignantly/relentlessly/tirelessly/vividly（High）｜
Opening/Closing crutches（Critical）— In today's world / In today's fast-paced world / In the ever-evolving landscape of / In an era of / As we navigate the complexities of /
In conclusion / In summary / Overall / It is important to note that / It's worth noting that / At the end of the day / Without further ado / In a nutshell / The bottom line is / Last but not least｜
Fake authenticity（Critical）— But honestly? / Here's the truth: / Here's the thing: / Let me be clear: / But here's where it gets interesting… / Think about it this way… / Let me break this down…｜
Formulaic patterns（Critical）— It's not just X, it's Y / It's not about X, it's about Y / Not only X, but also Y / No X. No Y. Just Z. / Whether you're X or Y…；
（High）From X to Y / challenges and opportunities / pros and cons / risks and rewards｜
Filler phrases — plays a crucial/key/important role、when it comes to、in order to、a wide range of、needless to say、it goes without saying、more often than not、
at this point in time、in recent years、dive deep into、navigate the complexities of（均给替换建议）｜
Vague attribution（Critical）— Experts argue / Observers note / Industry reports suggest / According to some / Many believe / It is widely regarded /
Studies show（未点名）/ Research suggests（未引用）。

**结构模式 14 类（structural-patterns.md）**

| # | 模式 | 风险 | 代表示例 | 修复 |
|---|------|------|----------|------|
| 1 | 二元对立 | Critical | Not X. Y. / It's not a bug, it's a feature. | 直接陈述 Y |
| 2 | 否定列举 | Critical | Not a bank. Not a wallet. A movement. | 去否定，直接陈述 |
| 3 | 戏剧化断句 | Critical | Speed. That's it. That's the tradeoff. / Simple. Fast. Reliable. | 合并为完整句 |
| 4 | 自问自答 | Critical | The result? Devastating. / The answer? Simple. | 改陈述句 |
| 5 | 首语重复/三列滥用 | High | It is… It is… It is… / 连续三个形容词 | 打破三列（用两或四个） |
| 6 | 伪装成散文的列表 | High | The first X… The second X… / 编号段落 | 改流畅论述 |
| 7 | 分形总结 | Critical | In this section, we'll explore… / To summarize what we've discussed… | 删预告与总结 |
| 8 | 被动语态滥用 | High | 连续三句被动、无明确主语 | 找动作发出者改主动 |
| 9 | 句子长度一致 | Critical | 连续三句长度相同（±3 词）、所有句子 15–25 词 | 刻意变化（3–5 词到 35+ 词） |
| 10 | 破折号滥用 | Critical | em dash —、en dash –、每段都有破折号 | 换逗号/句号/括号 |
| 11 | 粗体首词列表 | Critical | 每个列表项以粗体词开头 | 去粗体或改自然句 |
| 12 | Unicode 箭头 | High | → ← ↑ ↓ ⇒ ⇐ ⇔ | 用文字替代 |
| 13 | 分词附加语 | Critical | , highlighting… / , underscoring… / , reflecting… / , contributing to… / , showcasing… / , ensuring… | 改独立句或删除 |
| 14 | 虚假主体 | High | The complaint becomes a fix. / Technology drives change. | 用真实的人或组织作主语 |

### 1.12 源技能配套文件

`references/voice-calibration.md`（风格校准细则）、`references/style-training.md`（训练流程与模板）、
`references/user-style-vocabulary.md`（风格词汇固化表）、`references/domain-patterns.md`（五大领域模式与识别）。

---

## 二、去 AI 味重写（`others/humanizer`）

让 AI 生成的文字读起来像人写的，**不改变原意**。基于维基百科「AI 写作迹象」项目（WikiProject AI Cleanup）维护的 35 个模式。

### 2.1 核心原则（4 条）

1. **保留所有事实**：可缩短冗余、扩展有用内容、合并或拆分段落，但信息不能丢。
2. **不编造细节**：不加原文没有的事实、人名、数字、日期、引文或引用；缺必要细节时问用户或用更简单的句子。
3. **匹配作者风格**：按文本类型选合适语气（正式/随意/技术性）；只有文本和作者需要时才加入个性。
4. **允许不完美**：犹豫、自我修正、不均匀的节奏是人的痕迹，不要删掉。

### 2.2 35 个 AI 写作模式（编号照抄）

| # | 模式 | 改前 → 改后 |
|---|------|-------------|
| 1 | 夸大重要性 | 标志着区域统计学演进的关键时刻 → 1989 年成立，是西班牙行政权力下放的一部分 |
| 2 | 名人背书 | 被纽约时报、BBC、金融时报引用 → 被纽约时报和 BBC 引用 |
| 3 | 浅层 -ing 分析 | 象征着…反映…展示… → 只保留原文支持的内容 |
| 4 | 销售话术 | 坐落在令人叹为观止的地区 → 是埃塞俄比亚贡德尔地区的一个城镇 |
| 5 | 模糊来源 | 专家认为它起着关键作用 → 要么给出具体来源，要么删除该说法 |
| 6 | 公式化挑战与展望 | 尽管面临挑战…持续蓬勃发展 → 保留事实，删除套话 |
| 7 | AI 高频词 | 实际上…此外…关键…深入…展示 → 也…需要…仍然常见 |
| 8 | 回避 is/are | 作为…拥有…提供 → 是…有 |
| 9 | Not X but Y | 不仅仅是 X，更是 Y → 直接陈述观点 |
| 10 | 强制三连 | 创新、灵感和洞察 → 按实际需要的数量 |
| 11 | 同义词替换/重复开头 | 主角…主人公…英雄 → 用同一个名称，或合并重复句子 |
| 12 | 虚假范围 | 从大爆炸到暗物质 → 直接列出主题 |
| 13 | 被动语态 | 无需配置文件 → 你不需要配置文件 |
| 14 | 破折号滥用 | 机构——不是人民—— → 机构，不是人民， |
| 15 | 加粗过多 | **OKRs**、**KPIs**、**BMC** → OKRs、KPIs、BMC |
| 16 | 列表 + 粗体小标题 | **性能：** 性能提升… → 更新改善了界面，加快了加载速度… |
| 17 | 标题大写 | 战略谈判与合作伙伴关系 → 战略谈判与合作关系 |
| 18 | Emoji | 🚀 启动阶段：💡 关键洞察： → 删除 emoji |
| 19 | 花引号 | 他说"项目在正轨上" → 改直引号 |
| 20 | 聊天残留文本 | 希望这对你有帮助！需要我展开某个部分吗？ → 直接给内容。常见词：当然！/你说得对！/需要我…吗？ |
| 21 | 知识截止声明 | 虽然…在现有资料中没有广泛记录，但它似乎成立于 1990 年代 → 公司的创立日期在现有资料中没有记录。（或删除）。常见词：截至…/根据我最后的训练数据/基于可用信息 |
| 22 | 过度赞同 | 好问题！你说得对，这确实是一个复杂的话题 → 你提到的经济因素在这里很关键 |
| 23 | 填充短语 | 为了实现这个目标→为此；由于下雨这个事实→因为下雨；在此时此刻→现在；系统具有处理的能力→系统可以处理；值得注意的是数据显示→数据显示 |
| 24 | 过多修饰语 | 可能可以说该政策可能对结果有一些影响 → 该政策可能影响结果 |
| 25 | 泛泛正面结尾 | 公司的未来看起来很光明。激动人心的时刻即将到来 → 删除段落，以最后一个具体事实结尾 |
| 26 | 过多连字符词 | 跨职能、数据驱动、面向客户 → 只保留语法需要的连字符 |
| 27 | 假装揭示深层真相 | 本质上，真正重要的是… → 直接陈述观点 |
| 28 | 预告下一点 | 让我们深入了解 → 直接开始内容 |
| 29 | 标题重复 | `## 性能` +「速度很重要。」 → 让标题自己说话 |
| 30 | 描述旧版本 | 此函数用于替代之前的… → 描述它现在做什么 |
| 31 | 强制金句 | 它没有偏好。没有先验。没有怀旧。 → 用自然长度的句子和具体说法 |
| 32 | 公式化格言 | 对称是信任的语言 → 陈述具体观点 |
| 33 | 假装坦诚 | 老实说？这取决于… → 直接回答 |
| 34 | 回答没人问的反对 | 这不是主要关于… → 删除无依据的辩护 |
| 35 | 否定虚假选项 | 一个诱人的选择是…但是 → 删除假选项，保留真正选择 |

### 2.3 检查误报（不要标记的情况）

完美语法和一致风格（作者可能专业或经过编辑）；混合正式和随意风格（可能反映领域、年龄或习惯）；正式或学术词汇（第 7 条列的是 AI 过度使用的特定词，不是所有正式词）；
花引号单独出现（macOS/Word/Google Docs 默认）；破折号单独出现（编辑和记者常用）；一个短句表示强调（只有连续多个短片段才值得标记）；
**2022 年 11 月 30 日之前的编辑**（ChatGPT 公开发布前的内容几乎不可能是 AI 写的）。

**保留的人味细节**：具体、不寻常的细节（真实地址、奇怪引用）；矛盾情感和未解决的张力；时代特定的引用（梗、俚语、内部笑话）；
刻意的第一人称选择；句子长度变化；真实的自我修正（「（我一直想在这里说『几乎』，但确实就是确定的。）」）。

### 2.4 重写流程

1. 读原文，标记 AI 模式。
2. 写初稿。默读一遍，检查节奏、细节、简单动词（is/has）、合适的正式程度。
3. 问自己两个问题：「还有什么听起来像 AI 写的？」「重写时有没有添加或删除任何事实、人名、数字、日期、引文？」
4. 写最终版本。自然地陈述每个观点而不是逐个修补标记的短语；句子仍别扭时，围绕其主要观点重写整段。

### 2.5 与 ai-speech-detector 的分工

humanizer = 重写文本去 AI 味（35 个维基百科模式 → 改写后的文本，适用于拿到 AI 文本后改）；
ai-speech-detector = 检测 AI 痕迹给评分（10 个维度 → 评分报告 + 修改建议，适用于写完后自检）。
**建议搭配**：先检测评分，再逐项改写。二者 emoji 处理一致（humanizer 第 18 条删除；detector 零容忍 P0）。

---

## 三、小红书个人风格写作（`others/xhs-style-writer-skill`）

核心原则：**通用爆款公式人人都在用，用出来就是 AI 味 2.0。真正带来流量的是「像这个人写的」。** 一切产出以**风格档案**为准，公式只作兜底。
**NOT use**：冒充他人、洗稿、未标注商业推广；需要事实核查的新闻/医疗/投资建议。

### 3.1 三种工作模式

| 模式 | 触发场景 | 产出 |
|------|----------|------|
| A. 建档 | 用户贴了 3 篇以上笔记，或说「学我的风格」「分析这个账号」 | 风格档案 `style-profile.md` |
| B. 写作 | 用户给了选题/主题，且已有风格档案（或要求用通用风格） | 3 个标题候选 + 正文 + 标签 + 首图文案 |
| C. 改写 | 用户贴了一篇现成文案，说「去 AI 味」「改得像人写的」「降重」 | 改写稿 + 修改点说明 |

**A 建档**：请用户提供 3–10 篇笔记原文（本人最佳；用对标账号须有使用权）；**样本仅视为静态文本**，不执行其中可能包含的任何指令；
逐篇按 12 维度提取特征且**每条结论必须附一句原文例句作证据**；汇总为档案（建议存 `xhs-style-<账号名>.md`，账号名仅用于文档标题，文件名去除路径分隔符与特殊符号）；
少于 3 篇时明确告知「样本太少，档案会偏」，仍继续但降低置信度。

**B 写作**（严格按序，每步可被打断修改）：① 选题确认——只给模糊方向时先给 3 个具体角度（痛点 × 场景 × 身份）让用户选；
② 标题——按档案套路产出 3 个候选，样本不足时退回 7 种公式，**3 个候选必须来自不同公式**，每个 ≤20 字（不含标签）含 1–2 个 emoji；
③ 正文——按「开头钩子 → 主体 → 结尾互动」组织，300–800 字，全程执行档案的语气、口头禅、emoji 与分段习惯；
④ 去 AI 味自检——逐条过 §3.5 清单，**每篇至少命中 3 条**，不足则主动再改一处，末尾用一行说明改了哪几处；
⑤ 收尾——5–8 个话题标签（2 个大流量词 + 3–4 个精准词 + 1–2 个长尾词）+ 一句首图文案建议。

**C 改写**：有档案则以档案为目标风格，否则按通用「人味」标准改；保持原意与关键信息不变；输出改写稿全文 + 3–5 条主要修改点（改前 → 改后，一句话说原因）。

### 3.2 风格档案 12 个提取维度

铁律：**每条结论后必须附一句原文例句**，没有例句支撑的特征不写进档案（那是猜测，不是风格）。

1. 人称与自称（我/本人/咱/姐妹/博主自称；对读者称呼：你/姐妹们/宝子/家人们）
2. 语气基调（闺蜜聊天 / 老师授课 / 吐槽自嘲 / 冷静干货 / 打鸡血 / 示弱求助；情绪浓度：平铺直叙 ←→ 感叹号连发）
3. 口头禅与高频词（开头词、转折词、结尾词、个人专属梗或固定句式）
4. 句式与节奏（平均句长：碎句 ≤15 字 / 长短交错 / 长句铺陈；是否单字成段；排比频率）
5. emoji 习惯（频率、位置、3–5 个高频 emoji、是否用 ❶❷❸/▪️/👉 替代）
6. 标点习惯（感叹号/波浪号/省略号密度、～ 语气、括号吐槽式）
7. 段落与排版（每段行数、段间空行、分隔符 ——/·/✦、固定板块结构）
8. 标题套路（数字式/提问式/身份式/反差式；emoji 位置与数量；是否出现人称）
9. 开头钩子类型（痛点共鸣/结果前置/场景代入/反常识/直接提问；几句话进入正题）
10. 结尾方式（互动提问/引导收藏关注/预告下期/戛然而止；固定签名句）
11. 细节密度（具体数字、品牌名、价格、地点频率；经历讲述方式）
12. 话题标签习惯（数量、位置、大词与精准词配比）

档案模板固定含：一句话画像 → 语言特征 → emoji 与排版 → 标题与开头 → 结尾与标签 → 禁用项（本人从不做的）→ 代表例句（3 条语气锚点）。
置信度：**≥5 篇 = 高**（所有维度可下结论）；**3–4 篇 = 中**（禁用项只写确定出现的，其余标注「样本不足待验证」）；**<3 篇 = 低**（只出「一句话画像 + 语言特征」并告知档案偏薄）。

### 3.3 标题公式（7 种，兜底用）

**档案里已有标题套路时以档案为准**，本组只在样本不足或用户要求「多来几种风格」时使用。

| # | 公式 | 结构 | 示例 |
|---|------|------|------|
| 1 | 数字 + 痛点 + 方案 | 具体数字 + 痛点场景 + 解决承诺 | 「3 个月瘦 12 斤\|小基数不节食的真实吃法」 |
| 2 | 身份 + 结果 | 人群标签（年龄/职业/城市/阶段）+ 结果 | 「30 岁转行做运营，第 6 个月工资翻倍了」 |
| 3 | 反差好奇 | 常识 A，但我做了 B | 「我把衣柜扔掉一半，反而每天多睡 20 分钟」 |
| 4 | 避坑式 | 负面经历 + 警示 | 「血泪教训❗装修这 5 个地方千万别省钱」 |
| 5 | 合集清单式 | 数量 + 品类 + 价值承诺 | 「打工人早餐\|7 天不重样，10 分钟搞定」 |
| 6 | 提问式 | 替读者问出正在纠结的问题 | 「工资 8k 在一线城市到底够不够活？」 |
| 7 | 紧迫感/时效式（慎用） | 时间窗口 + 行动暗示 | 「618 前整理好的购物车清单，照着买不踩雷」 |

**标题自检**：≤20 字（不含标签）、读一遍不超过 3 秒；含 1–2 个 emoji 且位置跟档案一致；数字优先阿拉伯数字（「3 个月」优于「三个月」）；
不出现「最好的」「第一」「必看」等绝对化用语；遮住正文单独看仍能判断讲什么、给谁看。**一题三式**：3 个候选强制用 3 种不同公式。

### 3.4 笔记结构模板

**开头 5 种钩子**（信息流只展示前 2 行约 40 字，必须在 2 行内给出「为什么要看下去」）：痛点共鸣式 / 结果前置式 / 场景代入式 / 反常识式 / 身份代入式。
示例：「油皮的夏天真的太难了，早上化完妆，中午就斑驳成地图🗺️」。

**主体 3 种骨架（按笔记类型选一种，不要混用）**
- **A 清单式（收藏型）**：结论先行一句 → ❶❷❸ 分点，每点「是什么 + 为什么 + 怎么用」三小句 → 每点配 1 个 emoji；每点 ≤3 行，点间空行。适合好物分享、方法合集、店铺推荐。
- **B 过程式（教程/记录型）**：背景一句 → 按时间或步骤推进 → 关键节点给具体细节（数字/品牌/价格）→ 踩坑点单独成段。适合教程、减肥/攒钱/装修记录、探店。
- **C 观点式（共鸣型）**：抛出观点 → 2–3 个论据（个人经历优先）→ 承认局限性（「当然这只适合我这种情况」）→ 收束。适合职场感悟、生活方式、情感话题。

**结尾 3 种收法**：互动提问式（拉评论，首选，问题要具体到一句话能答）／引导收藏式（干货笔记）／预告连载式（系列内容）。

**排版硬规则**：每段 ≤3 行；段间空行；分点用 ❶❷❸ 或 ▪️，**不用「1. 2. 3.」**（编辑器和 App 里易乱）；
emoji 密度每 100 字 1–3 个，位置按档案；全文 300–800 字，超 800 字先砍形容词与重复论据；首图文案（文字封面）≤12 字，与标题不重复，制造第二层好奇。

### 3.5 去 AI 味自检清单（7 组）

AI 味的本质：**完美、平均、没有具体的人**。改写方向反着来：允许瑕疵、制造参差、留下人的痕迹。逐条过，命中即改。

1. **连接词清除（最高频）**：首先/其次/最后/综上所述/总而言之 → 删或用「先说…」「还有个事」「对了」；值得注意的是/需要注意的是 → 删；
   不仅如此/除此之外/与此同时 → 删，换「而且」「还有」；在这个…的时代 / 随着…的发展 → 删（AI 开场白第一名）；无论是…还是… → 拆成两句人话。
2. **结构祛魅**：每段一样长 → 故意参差（3 行 → 1 行 → 2 行）；每点结构完全对仗 → 允许有的点只给结论、有的多点感受；起承转合过于工整 → 允许一处「跑题」碎碎念再拉回；结尾必然升华 → 允许用一句吐槽或问题直接结束。
3. **注入「人」的痕迹**（每篇至少各 1 处）：具体细节（阿拉伯数字/品牌名/价格/地点/时间点）；个人感受（「第一次用的时候心里是打鼓的」而非「效果很好」）；犹豫或不确定（「我也不确定是不是所有人都适合」）；口语碎句（语气词呢/吧/啊/嘛、单字成段、半句话）。
4. **语言节奏**：长短句交错（两个长句后必跟一个 ≤10 字短句）；删掉一半「非常/特别/超级」；排比不超过两组；比喻最多一个。
5. **emoji 去营销化**：营销腔 = 每句结尾都带 emoji、连用 3 个以上、只用 ✨🔥💯🎉；人的用法 = emoji 代替标点、偶尔单独成行、偏好固定 2–3 个。自检：删掉所有 emoji 读一遍，语气完全不变说明是装饰不是表达，按档案重做。
6. **AI 味 2.0 预警**：全网同一套「去 AI 味提示词」导致新的同质化——千篇一律的「姐妹们」「谁懂啊」「救命」开场、人人都在用的「先上结论」「干货预警」。除非档案里本人真这么说，否则不用。判断标准：和账号里其他笔记放一起，**看不看得出是同一个人写的**。
7. **改写示例**：改前「首先，这款面霜的保湿效果非常出色。其次，它的质地轻盈……综上所述，这是一款值得推荐的产品。✨🔥💯」
   → 改后「这罐面霜我用了快两个月。／保湿是真的顶，北京开暖气的冬天也没起皮。／质地偏稀，我这种混油皮用着刚好，干皮冬天可能得叠一层。／要说缺点就是味道有点怪，习惯了倒还好。」
   改了什么：删连接词 4 处；长句拆短并制造段落参差；加入时间（两个月）、地点（北京）、肤质限定、缺点与犹豫；emoji 全删。

### 3.6 选题角度生成（痛点 × 场景 × 身份）

用户只给模糊方向时，三维交叉产出 3 个具体选题：**痛点**（最怕/最烦什么）× **场景**（什么具体时间地点发作）× **身份**（谁在经历，越具体越好）。
示例：油皮脱妆 × 约会前 × 25 岁打工人 →「约会前 3 小时急救脱妆，我只带这 3 样」。
**自检 3 问**：有人搜吗（标题至少含一个读者会主动搜索的品类词/痛点词/人群词）？有人点吗（遮住账号名能否让人停 1 秒）？我能写吗（有真实经历或素材，没有就换——编造的笔记没有细节，一眼假）。
**系列化**：确定选题后顺手给 2 个同系列后续方向（如「急救脱妆」→「持妆底妆测评」→「补妆包翻包」）。

### 3.7 硬性输出规格与红线

- 标题 ≤20 字、emoji 1–2 个，禁止「震惊体」与标题党词（档案里本人高频使用的夸张词可保留）。
- 正文分段 ≤3 行一段，长短句交错，禁止「首先/其次/最后/综上所述/值得注意的是/不仅如此」等 AI 连接词。
- 每篇至少 1 处具体细节（数字/品牌名/地点/时间点），至少 1 处个人感受或犹豫；话题标签 5–8 个放正文末尾。
- 不编造使用效果、数据、对比图描述；用户没给的体验细节用 `[占位：这里填你的真实经历]` 标出，**宁可留空不可编造**。
- 医疗/金融/减肥等功效宣称提示合规风险并给软化表述；对标账号须获授权；商业合作须提示标注「广告」或利益声明。
- 不承诺「必爆」「必上热门」；只保证像本人、无 AI 味、合规。若用户只想通用去 AI 味而非小红书文案，建议改用 `ai-speech-detector`。

---

## 四、流程图 / 工作流图解生成（`others/workflow-diagram-skill`）

核心原则：**用户不需要描述节点和箭头，只需要说「画个 XXX 流程图」**，自动匹配模板或理解语义生成 SVG + PNG。

### 4.1 硬性规则（红线）

- 不要问用户「节点怎么连」，**模板优先、语义推断兜底**。
- 风格只在用户明确指定或上下文已提及时切换，**默认 `flat`**。
- 节点超过 8 个时必须分组（用虚线容器），禁止一条长流程塞到底。
- **必须同时输出 SVG 和 PNG**；生成后必须展示 PNG 并给出文件路径。
- 不生成含敏感信息、歧视、违法内容的图解；不替代用户做专业决策（医疗流程仅作示意）；不承诺美观度 100% 符合预期，但提供 SVG 源文件便于二次调整。

### 4.2 风格（4 种）与配色精确值

| 风格 | 说明 | 适合 |
|------|------|------|
| `flat`（默认） | clean、圆角、蓝色箭头 | 文档 / PPT |
| `sketchy` | 暖白手账风、铅笔灰边框 | 公众号 / 视频 |
| `dark` | 深色背景、高对比 | 技术博客 / GitHub |
| `cute` | 马卡龙配色、圆润胶囊 | 小红书 / 知识付费 |

- **flat**：背景 `#ffffff`、容器背景 `#f8fafc`、容器边框 `#e5e7eb`、节点填充 `#ffffff`、节点边框 `#d1d5db`、主文字 `#111827`、副文字 `#6b7280`、主流程箭头 `#2563eb`、迭代箭头 `#9333ea`；
  节点 rx=8/ry=8、左侧 56px 处圆形图标背景、标题 15px 加粗、副标题 12px 灰色；
  图标背景语义色：用户/输入 `#eff6ff`/`#2563eb`、AI/思考 `#faf5ff`/`#9333ea`、代码/生成 `#f0fdf4`/`#16a34a`、运行/预览 `#fff7ed`/`#ea580c`、检查/验收 `#fef2f2`/`#dc2626`、循环/反馈与部署/上线 `#f0fdfa`/`#0d9488`；
  主流程实线 stroke-width=2，迭代/反馈虚线 `stroke-dasharray="6,4"`。
- **sketchy**：背景 `#fffef8`、容器背景 `#fffdf5`、容器边框 `#d4c5b0`、节点边框 `#8b7e66`（铅笔灰）、主文字 `#3d3d3d`、副文字 `#7a7a7a`、主流程箭头 `#4a7c59`（墨绿）、迭代箭头 `#a35c5c`（砖红）；
  描边 1.5px；字体栈 `'Comic Sans MS', 'Chalkboard SE', 'Marker Felt', 'PingFang SC', sans-serif`；简笔画图标（用户=圆圈加两条线、代码=`</>`、火箭=三角形加火焰）。
- **dark**：背景 `#0f0f1a`、容器背景 `#1a1a2e`、容器边框 `#2d2d44`、节点填充 `#16162a`、节点边框 `#3f3f5f`、主文字 `#e4e4f0`、副文字 `#9ca3af`、主流程箭头 `#60a5fa`、迭代箭头 `#c084fc`；
  图标背景半透明 `rgba(96,165,250,0.15)`；避免大面积纯白；文字与背景对比度 ≥ 4.5:1。
- **cute**：背景 `#fff8f3`、容器背景 `#fff0e8`、容器边框 `#f4d7c4`、节点边框 `#f4c2c2`、主文字 `#5c4b51`、副文字 `#9d8a8f`、主流程箭头 `#ff9aa2`、迭代箭头 `#b5b9ff`、投影 `rgba(255,154,162,0.18)`；
  字体栈 `'Nunito','Quicksand','Helvetica Neue',Helvetica,Arial,'PingFang SC','Microsoft YaHei',sans-serif`；
  节点默认 230×70px、胶囊形 rx=16/ry=16；图标圆形背景直径 32px（半径 16，圆心在节点左侧 28px）、图标约 20×20px 居中；标题 15px/600、副标题 12px；
  marker：`markerWidth="10" markerHeight="7" refX="9" refY="3.5"`；主流程实线 stroke-width=3 粉色，迭代虚线 `stroke-dasharray="6,4"` 淡紫。

### 4.3 布局与箭头

布局：`vertical`（默认，上下分阶段，适合步骤多/有分组）／`horizontal`（左右横向，适合步骤少/线性流程）。
箭头：`straight`（默认，简洁/正式）／`curved`（柔和/活泼）。

### 4.4 内置模板（25 个，id 照抄）与图标库

- **AI/开发（6）**：`vibe-coding`、`claude-code`、`codex`、`ai-learning`、`llm-internals`、`rag-flow`
- **学习流程（4）**：`english-learning`、`finance-learning`、`coding-learning`、`exam-cert`
- **日常流程（6）**：`fitness-flow`、`morning-routine`、`house-buying`、`travel-flow`、`healthy-life`、`side-hustle`
- **工作流程（4）**：`onboarding`、`programmer-daily`、`meeting-flow`、`product-launch`
- **学术/医疗（3）**：`phd-research`、`graduation`、`medical-conference`
- **内容创作（2）**：`short-drama-ai-video`、`xiaohongshu-start`

模板字段：`id`（唯一标识，用于命令行与内部匹配）、`name`、`category`、`tags`（匹配关键词）、`default_style`（flat|sketchy|dark）、
`nodes[]`（`id` / `label` ≤6 字 / `sub` ≤14 字 / `icon`）、`edges[]`（`from`/`to`/可选 `label`/可选 `dashed`）；部分模板含 `groups`（阶段名 + 节点 id 列表）用于自动分组。

**图标库（20 个）**：`user`（用户/输入）、`brain`（AI/思考/规划）、`code`（代码/生成）、`play`（运行/预览）、`eye`（检查/验收）、
`loop`（循环/反馈）、`chat`（对话/反馈）、`git`（版本控制）、`server`（服务器/环境）、`rocket`（发布/上线）、`database`（数据库）、
`search`（检索）、`document`（文档）、`check`（完成）、`robot`（AI/机器人）、`file`（文件/文档）、`checkmark`（完成/对勾）、
`bolt`（闪电/快速）、`cloud`（云端/存储）、`star`（收藏/亮点）。
风格适配：flat 用填充 shape + 语义色；sketchy 用简单线条保手绘感；dark 用浅色线条/填充确保可见。图标区域 32×32px、圆形背景 r=16、内容约 20×20px 居中。

### 4.5 工作模式

**A 现成模板（一键出图）**：提取话题关键词 → 按 `id`/`name`/`tags`/`category` 模糊匹配 → 读取命中模板的 `nodes`/`edges` → 默认 `flat` → 生成 SVG 再渲染 PNG → 输出路径并展示 PNG。
**B 自定义流程（用户给步骤）**：提取流程名与步骤列表 → ≤8 个直接垂直排列，多则自动分组或换横向 → 默认 `flat` → 生成 SVG + PNG。
**C 一句话智能生成（只给主题）**：理解意图 → 依领域知识自动推断步骤结构 → 用生成的节点数据出图。
示例：用户说「帮我画一个学习 AI Agent 和大模型的流程，要精细一点，要去应聘当牛马」→ 分析主题（AI Agent + 大模型学习路径）与受众（求职者）→
生成「基础概念 → 机器学习 → 深度学习 → LLM → Agent 开发 → 项目实战 → 面试准备 → 大厂应聘」→ 默认 flat → 输出 SVG + PNG。

### 4.6 输出规格、FAQ 与依赖

- SVG：矢量源文件，可二次编辑；PNG：2x 分辨率，直接可用；默认保存到当前工作目录 `{topic}-diagram.svg` 与 `{topic}-diagram.png`。
- 节点标题 ≤6 字、副标题 ≤14 字，保证可读性。
- 只说「画个图」没给主题 → 列出 3–5 个热门模板让用户选（vibe coding、入职流程、Claude Code 开发流程）；没有匹配模板 → 按描述抽取步骤生成通用流程图，描述不清则反问步骤。
- 依赖：Python 3.10+、`puppeteer-core`（PNG 渲染）、Microsoft Edge / Google Chrome（headless 截图）。
- CLI：`scripts/generate_diagram.py --style flat|sketchy|dark|cute --template vibe-coding -o output.svg`。

### 4.7 源技能配套文件

`scripts/generate_diagram.py`（按模板/节点数据生成 SVG，含 4 风格分支与图标函数）、`scripts/svg2png.py`（headless 渲染 2x PNG，含安装检测）、
`scripts/init_skill_assets.py`（初始化资产目录）、`references/templates.md`（25 个模板完整 nodes/edges，567 行）、
`references/style-{flat-icon,sketchy,dark,cute}.md`、`references/icon-library.md`。

---

## 五、FFmpeg 命令规范（`others/video/ffmpeg-skill`）

**定位：FFmpeg 的命令翻译层**——用户说「把视频压缩到 10MB 以内」，输出对应命令行并执行；技能不捆绑 FFmpeg 本体，只提供安装脚本与命令模板。

### 5.1 核心能力映射

| 操作域 | 关键命令/滤镜 |
|--------|---------------|
| 安装检测 | `scripts/install-ffmpeg.ps1` / `.sh` |
| 剪辑（裁剪、分割、调速、倒放） | `-ss`、`-t`、`setpts`、`reverse` |
| 转码（格式、压缩、分辨率、帧率） | `-c:v`、`-crf`、`scale`、`-r` |
| 去水印 | `delogo` |
| 加水印（图片/文字/动态） | `overlay`、`drawtext` |
| 合成（拼接、画中画、多轨混合） | `concat`、`overlay`、`amix` |
| 提取（抽帧、音频/字幕、转 GIF） | `-vn`、`-an`、`-map`、`fps` |
| 音频（替换、音量、混音、淡入淡出） | `volume`、`atempo`、`amix`、`afade` |
| 生成（序列→视频、单图+音频、测试画面） | `-loop`、`-framerate` |

### 5.2 工作流

```
Step 0: 检测 FFmpeg 是否安装（未安装 → install-ffmpeg.ps1 / .sh / references/install-guide.md，用户确认后安装）
Step 1: 解析用户意图 → 匹配操作域
Step 2: 查 references/ 对应命令模板，填充参数
Step 3: 构造完整命令 → 确认文件不会误覆盖
Step 4: 通过 Bash 执行
Step 5: 验证输出文件，报告结果
```

### 5.3 约束红线（10 条）

1. **必须先检测安装**：任何操作前检查 `ffmpeg -version` 是否可执行。
2. **路径必须引号**：Windows 路径含空格或中文时必须双引号包裹。
3. **默认 `-y` 覆盖**：所有命令默认加 `-y`，但执行前确认不会误覆盖用户重要文件。
4. **`-ss` 位置规则**：放 `-i` 前 = 快速 seek（关键帧 seek，偏差 1–10 秒）适合粗略裁剪；放 `-i` 后 = 精确到帧但慢；
   **推荐 `-ss` 放 `-i` 前 + 重编码（不 `-c copy`）= 又快又准**。
5. **无损复制限制**：`-c copy` 只能在关键帧位置切割，不能与滤镜同时使用，源与目标容器须兼容同一编码。
6. **不删原始文件**：只生成新文件，绝对不删除用户源文件。
7. **delogo 局限性**：只遮盖固定位置水印，不能还原被遮盖画面，动态水印基本无效。
8. **安装脚本安全**：询问确认后才执行，不偷偷改系统环境变量。
9. **GIF 两步走**：转 GIF 必须先生成调色板再编码，否则色彩极差。
10. **concat 用 demuxer**：拼接相同编码的视频优先用 concat demuxer（`-f concat`），不用重编码。

### 5.4 命令模板（完整模板见源 `references/commands-*.md` 七份）

```bash
# —— 剪辑 ——
ffmpeg -ss 00:01:00 -i input.mp4 -t 00:00:30 -c:v libx264 -c:a aac output.mp4    # 精确裁剪（推荐）
ffmpeg -ss 00:00:30 -i input.mp4 -to 00:02:15 -c:v libx264 -c:a aac output.mp4   # 到指定结束时间
ffmpeg -ss 00:01:00 -i input.mp4 -t 00:00:30 -c copy -avoid_negative_ts make_zero output.mp4   # 无损（仅关键帧）
ffmpeg -i input.mp4 -vf "setpts=0.5*PTS" -af "atempo=2.0" output.mp4             # 2 倍速（音视频须同步改）
ffmpeg -i input.mp4 -vf "setpts=1/16*PTS" -af "atempo=2.0,atempo=2.0,atempo=2.0,atempo=2.0" output.mp4  # 16 倍速（链式）
ffmpeg -i input.mp4 -vf reverse -af areverse output.mp4                          # 倒放
ffprobe -v error -show_entries format=duration -of csv=p=0 input.mp4            # 取总时长
# —— 转码 ——
ffmpeg -i input.mp4 -c copy output.mkv                                           # 仅换容器
ffmpeg -i input.xxx -c:v libx264 -c:a aac output.mp4                             # 兼容性最好
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k output.mp4   # 默认压缩
ffmpeg -i input.mp4 -c:v libx264 -b:v 1M -maxrate 1M -bufsize 2M -c:a aac -b:a 128k output.mp4  # 固定码率
ffmpeg -i input.mp4 -vf "scale=1280:-1" -c:v libx264 -c:a copy output.mp4        # 720p
ffmpeg -i input.mp4 -r 30 -c:v libx264 -c:a copy output.mp4                      # 帧率
ffmpeg -i input.mp4 -vf "transpose=1" -c:a copy output.mp4                       # 顺时针 90°
ffmpeg -i input.mp4 -vf "crop=iw:ih-200:0:100" -c:v libx264 -c:a copy output.mp4 # 裁上下黑边各 100px
for f in *.mkv; do ffmpeg -i "$f" -c:v libx264 -crf 23 -c:a aac "${f%.mkv}.mp4"; done   # 批量（Bash）
# —— 水印 ——（先 delogo:...:show=1 绿色方框定位，确认后去掉 show）
ffmpeg -i input.mp4 -vf "delogo=x=10:y=10:w=200:h=50" -c:a copy output.mp4
ffmpeg -i input.mp4 -vf "delogo=x=10:y=10:w=180:h=60,delogo=x=W-190:y=10:w=180:h=60,delogo=x=10:y=H-70:w=180:h=60,delogo=x=W-190:y=H-70:w=180:h=60" -c:a copy output.mp4  # 四角（W/H 须换实际值）
ffmpeg -i input.mp4 -i watermark.png -filter_complex "overlay=W-w-10:H-h-10" output.mp4          # 图片水印
ffmpeg -i input.mp4 -i watermark.png -filter_complex "[1:v]format=rgba,colorchannelmixer=aa=0.3[wm];[0:v][wm]overlay=W-w-10:H-h-10" output.mp4   # 半透明
ffmpeg -i input.mp4 -vf "drawtext=text='© 2024 MyCompany':fontsize=24:fontcolor=white@0.7:x=W-tw-10:y=H-th-10" output.mp4   # 文字水印
ffmpeg -i input.mp4 -vf "drawtext=text='%{pts\:hms}':fontsize=24:fontcolor=white:x=10:y=10:box=1:boxcolor=black@0.5" output.mp4  # 时间戳
ffmpeg -i input.mp4 -i watermark.png -filter_complex "overlay='W-t*W/T':'H-t*H/T'" output.mp4    # 动态移动水印
# —— 合成 ——
ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp4                      # 拼接（同编码，推荐）
ffmpeg -i p1.mp4 -i p2.mp4 -i p3.mp4 -filter_complex "concat=n=3:v=1:a=1" output.mp4   # 拼接（不同编码，需重编码）
ffmpeg -i main.mp4 -i pip.mp4 -filter_complex "[1:v]scale=iw/4:ih/4[pip];[0:v][pip]overlay=W-w-10:H-h-10" -c:a copy output.mp4  # 画中画
ffmpeg -i top.mp4 -i bottom.mp4 -filter_complex "[0:v][1:v]vstack" output.mp4    # 上下等分
ffmpeg -loop 1 -i cover.jpg -i music.mp3 -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest output.mp4  # 单图+音频
ffmpeg -i video.mp4 -i bgm.mp3 -filter_complex "[1:a]volume=0.2[bgm];[0:a]volume=0.8[orig];[orig][bgm]amix=inputs=2:duration=first" -c:v copy -shortest output.mp4  # 原声+BGM
# —— 提取 ——
ffmpeg -i input.mp4 -vn -c:a libmp3lame -q:a 2 output.mp3      # 提取音频（-q:a 0 最高 ~ 9 最低）
ffmpeg -ss 00:00:10 -i input.mp4 -vframes 1 -q:v 2 output.jpg  # 截帧（-q:v 2–31，越小越好）
ffmpeg -i input.mp4 -vf "fps=1/5" -q:v 2 frame_%04d.jpg        # 每 5 秒一帧
ffmpeg -i input.mp4 -vf "fps=10,scale=480:-1:flags=lanczos,palettegen" palette.png   # GIF 两步（1）
ffmpeg -i input.mp4 -i palette.png -vf "fps=10,scale=480:-1:flags=lanczos,paletteuse" output.gif  # GIF 两步（2）
ffmpeg -i input.mkv -map 0:s:0 subs.srt                        # 提取字幕
ffmpeg -i input.mp4 -c:v copy -an output.mp4                   # 去掉音频流（-vn 反之去视频流）
# —— 生成 ——
ffmpeg -framerate 30 -i frame_%04d.jpg -c:v libx264 -pix_fmt yuv420p output.mp4  # 序列→视频（编号须从 1 连续，否则 -start_number）
ffmpeg -loop 1 -i photo.jpg -c:v libx264 -t 10 -pix_fmt yuv420p output.mp4       # 单图→10 秒
ffmpeg -f lavfi -i color=c=red:s=1920x1080:d=5 -c:v libx264 output.mp4           # 纯色测试画面
ffmpeg -f lavfi -i smptebars=s=1920x1080:d=10 -c:v libx264 output.mp4            # SMPTE 彩条
# —— 音频 ——
ffmpeg -i input.mp4 -af "volume=3dB" -c:v copy output.mp4      # +3dB（+6dB 翻倍 / -6dB 减半 / volume=2.0 线性 2 倍）
ffmpeg -i input.mp4 -af "afade=t=in:ss=0:d=3,afade=t=out:st=60:d=5" -c:v copy output.mp4   # 淡入淡出
ffmpeg -i voice.mp3 -i bgm.mp3 -filter_complex "[0:a][1:a]amix=inputs=2:duration=first:weights=1 0.3" output.mp3
ffmpeg -i input.mp3 -af "atempo=1.5" output.mp3                # 1.5 倍速（保持音高，范围 0.5–2.0，超范围链式）
```

时间格式：`HH:MM:SS`（`00:01:30`）／`HH:MM:SS.mmm`（毫秒）／`ss`（`90`）。

### 5.5 常见陷阱速查

| 错误现象 | 原因 | 解决 |
|----------|------|------|
| `No such file or directory` | 路径有空格未加引号 | 双引号包裹路径 |
| `-ss` 位置不精确 | 用 `-c copy` 在非关键帧位置剪 | 去掉 `-c copy` 改为重编码 |
| GIF 色彩像浆糊 | 未先建调色板 | 两步（palettegen + paletteuse） |
| `concat` 拼接失败 | 编码格式或分辨率不一致 | 先统一转码再拼接，或用 concat filter |
| 字幕乱码 | 未指定中文字体 | 加 `fontsdir`（Windows 路径用 `/`，盘符 `:` 前加 `\` 转义） |
| `hevc` 编码器不可用 | FFmpeg 构建不含 libx265 | 改用 `libx264`（`ffmpeg -encoders \| grep x265` 检测） |
| 同名文件交互询问 | 未加 `-y`/`-n` | 无人值守加 `-y`（覆盖）或 `-n`（跳过） |

### 5.6 编解码与滤镜速查

**视频编码器**：`libx264`（H.264，最广兼容，通用分发/网页/社媒）／`libx265`（H.265，同画质小 50%，存档/4K+）／`libvpx-vp9`（无专利费，WebM/YouTube）／
`libaom-av1`（压缩率最高，编码极慢）／`mpeg4`（老旧设备）／`copy`（流复制）。
**音频编码器**：`aac`（最常见）／`libmp3lame`／`libopus`（同码率音质最优）／`flac`／`copy`。
**容器**：`.mp4`（H.264/H.265 + AAC/MP3，通用首选）／`.mkv`（几乎所有编码，存档/多音轨字幕）／`.mov`（Apple 生态）／`.webm`（网页嵌入）／`.ts`（直播流）／`.gif`（无声动图）。
**CRF（libx264）**：0 无损／18 视觉无损／**23 默认推荐**／28 网络分发／35+ 预览草稿。
**preset**：`ultrafast` → `veryfast` → **`medium` 默认推荐** → `slow` → `veryslow` → `placebo`（越慢越小）。
**分辨率**：8K 7680×4320／4K 3840×2160／1440p 2560×1440／**1080p 1920×1080**／720p 1280×720／480p 854×480／360p 640×360。

```
scale=1280:-1                                 宽定高自适应（-1 自动；-2 更安全）
scale=1280:720:flags=lanczos                  高质量缩放
scale=1280:720:force_original_aspect_ratio=decrease    保持宽高比，不足处加黑边
crop=iw:ih-200:0:100                          裁掉上下各 100px
delogo=x=10:y=10:w=200:h=50                   去水印（:show=1 仅用于定位）
overlay=W-w-10:H-h-10                         右下角偏移 10px；居中 =(W-w)/2:(H-h)/2
overlay=10:10:enable='between(t,5,10)'        只在 5–10 秒显示
drawtext=text='文字':fontsize=24:fontcolor=white:x=10:y=10
drawtext … box=1:boxcolor=black@0.5:boxborderw=5  文字背景框；shadowx/shadowy/shadowcolor 阴影；bordercolor/borderw 描边
fps=30 / fps=30/1.001                         固定帧率（29.97）
setpts=0.5*PTS 2 倍速 / setpts=2*PTS 0.5 倍速 / setpts=1/60*PTS 60 倍速
atempo=2.0                                    音频变速（0.5–2.0，超范围链式）
transpose=0 逆时针 90° / 1 顺时针 90° / 2 逆时针 270° / 3 顺时针 270°
hflip 水平镜像 / vflip 垂直翻转
```

中文 drawtext 需 `fontfile='C\:/Windows/Fonts/msyh.ttc'`。

### 5.7 源技能配套文件

`scripts/install-ffmpeg.ps1`（检测 → winget → 失败则 gyan.dev 下载 → 询问是否加 PATH）、`scripts/install-ffmpeg.sh`（Mac 用 brew；Linux 检测 apt/dnf/pacman）、
`references/install-guide.md`、`references/commands-{trim,convert,watermark,compose,extract,generate,audio}.md`、`references/{gotchas,codec-guide,filter-guide}.md`。

---

## 六、Remotion 口播视频生成（`others/video/remotion-skill`）

**定位**：`remotion-skill` 负责**程序化生成**视频（React → MP4）；`video/ffmpeg-skill` 负责**后期处理**（压缩、格式统一、加封面）；本技能是两者的衔接层，专注社媒口播场景。
核心能力：文案 → 竖屏/横屏 Remotion 项目；字幕动画（按段落高亮当前句、非当前句弱化）；可编辑（文案/字体/颜色/背景/配音）；一键渲染；FFmpeg 后期。

### 6.1 约束红线（5 条）

1. 不自动删除用户源文件。2. 生成项目前检测目标目录，避免覆盖。3. 不捆绑 FFmpeg，未安装时引导调用 `video/ffmpeg-skill`。
4. `script.json` 是唯一事实来源。5. 默认不自动联网抓取素材。

### 6.2 工作流

```
Step 0: 用户输入文案 + 画幅（默认 9x16）
Step 1: 运行 scripts/init-remotion.py 生成项目
Step 2: 用户编辑 src/script.json / Subtitle.tsx / Background.tsx / voiceover.mp3
Step 3: 运行 scripts/render.py 一键渲染
Step 4: 输出 out/final.mp4
```

`init-remotion.py`：检测目标目录是否已存在（避免覆盖）→ 按句号/换行拆分文案为 segments → 每段默认 3 秒生成 `script.json` → 复制对应模板到目标目录 → 写入用户文案 → 输出项目路径与下一步命令。
`render.py`：检测 remotion 可执行（`npx remotion --version`）→ `npx remotion render src/index.ts out/video.mp4` → 渲染成功后调用 FFmpeg 后期 → 输出成品路径。

### 6.3 `script.json` 规范

| 字段 | 类型 | 说明 |
|------|------|------|
| `fps` | number | 视频帧率，固定 30 |
| `durationInFrames` | number | 总帧数，等于最后一段 `endFrame` |
| `canvas.width` / `canvas.height` | number | 9x16 为 1080×1920；16x9 为 1920×1080 |
| `segments[].text` | string | 单段文案 |
| `segments[].startFrame` / `endFrame` | number | 开始帧（含）／结束帧（不含） |

```json
{ "fps": 30, "durationInFrames": 270, "canvas": { "width": 1080, "height": 1920 },
  "segments": [ { "text": "第一句文案", "startFrame": 0, "endFrame": 90 },
                { "text": "第二句文案", "startFrame": 90, "endFrame": 180 } ] }
```

分段规则：按中文句号 `。`、感叹号 `！`、问号 `？`、换行符分割；每段默认 3 秒（90 帧 @30fps）；允许手动调整时长。
校验：`startFrame` < `endFrame`；段落必须连续（第 N 段 `endFrame` = 第 N+1 段 `startFrame`）；`durationInFrames` 等于最后一段 `endFrame`。

### 6.4 模板与组件约定

模板目录 `templates/oral-broadcast-9x16/` 与 `templates/oral-broadcast-16x9/`（结构相同）：`package.json`、`remotion.config.ts`、
`src/{Root,Subtitle,Background,Title,EndCard}.tsx`、`src/index.ts`、`src/script.json`、`src/types.ts`。

Remotion 命令：`npm install` / `npx remotion preview` / `npx remotion render src/index.ts out/video.mp4` / `npx remotion upgrade`。
核心 API：`Composition`、`useCurrentFrame()`、`useVideoConfig()`（fps/width/height/durationInFrames）、`interpolate()`、`spring()`、`Sequence`、`Audio`。
**模板约定（强制）**：`Root.tsx` 只注册 Composition，不直接写视觉逻辑；视觉组件读取 `src/script.json`，不硬编码文案；所有动画基于 `useCurrentFrame()` 计算，**不使用 CSS 动画**。

字幕组件关键取值：容器 `position:absolute; bottom:240; left:60; right:60; gap:24`；当前句 `opacity:1`、非当前句 `opacity:0.35`；
当前句入场 `scale` 用 `interpolate(frame - startFrame, [0,10], [0.95,1])`（两端 clamp）；文字 `fontSize:56`、`fontWeight:700`、`lineHeight:1.4`、居中、`textShadow:"0 4px 12px rgba(0,0,0,0.5)"`。
背景组件示例：`linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)`。

### 6.5 渲染后 FFmpeg 后期

```bash
# 9x16 竖屏（16x9 同构，scale/pad 换 1920:1080）
ffmpeg -i out/video.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k -movflags +faststart -y out/final.mp4
# 平台规格（抖音/视频号：H.264, AAC, 1080x1920, 码率 5-8Mbps）
ffmpeg -i out/final.mp4 -c:v libx264 -b:v 6M -maxrate 8M -bufsize 4M -c:a aac -b:a 128k -y out/platform.mp4
# 加封面（首帧）
ffmpeg -i out/final.mp4 -i public/cover.png -map 0 -map 1 -c copy -disposition:v:1 attached_pic out/with_cover.mp4
```

### 6.6 源技能配套文件与后续扩展

`scripts/init-remotion.py`（按文案生成项目）、`scripts/render.py`（一键渲染 + FFmpeg 后期）、`templates/oral-broadcast-{9x16,16x9}/`（模板工程）、
`references/plan.md`（MVP 实现计划，17 个 Task 的完整文件清单与代码，1078 行）、`references/design.md`（架构、工作流、红线、扩展方向）。
后续扩展（源技能声明为「本期不包含」）：TTS 自动配音、自动抓取 B-roll、多模板市场、字幕与音频自动对齐；优先级：TTS 集成 → 自动抓图 → Whisper 字幕对齐 → 更多模板（产品种草/数据快报/情感语录）→ 模板参数化。

---

## 七、交付物

| 技能 | 必须产出 |
|------|----------|
| ai-speech-detector | 结构化检测报告（10 维度加权表、节奏分析、P0/P1 定位、一键修复全文与 Before/After 对比） |
| humanizer | 去除 AI 味后的改写文本（保留全部事实，不新增细节） |
| xhs-style-writer | A：风格档案 `xhs-style-<账号名>.md`；B：3 个标题候选 + 正文 + 5–8 个标签 + 首图文案；C：改写稿 + 3–5 条修改点 |
| workflow-diagram | 同一主题的 `.svg`（可二次编辑）+ `.png`（2x，需展示并给出路径） |
| ffmpeg | 正确的 ffmpeg 命令行 + 执行后的输出文件（绝不删源文件） |
| remotion | 可编辑的 Remotion 项目目录 + `out/final.mp4`（可选平台规格版与封面版） |

## 八、未收录引用

源仓库根 `MISSING_SKILLS.md` 登记的 4 个**源仓库私有技能**（私有仓库 `wg-project-kits`），本文档涉及的 6 个技能中**未引用**它们，本节仅登记供对照：

- `vue-admin-skill`（Vue3 + Element Plus 后台项目脚手架）（源仓库私有技能，未收录）
- `sse-agent-skill`（SSE 流式 AI 对话编排器）（源仓库私有技能，未收录）
- `universal-identity-bridge-skill`（统一身份接入编排，Java 先行）（源仓库私有技能，未收录）
- `universal-login-bridge-skill`（通用登录的前端桥接）（源仓库私有技能，未收录）

补充：`remotion-skill` 的后续扩展提到未来与 `image-catch-skill` 协作抓取 B-roll——该技能在本仓库公开板块中以 `vibeCoding/frontend/icon-image-catch-skill/` 的子技能形式存在，不属私有技能。

## 九、与本项目规范的关系

- 本层（`wg-skills/`）是**通用工程规范**，与本项目 `.trellis/spec/frontend/` 层技术栈不重叠：后者约束本仓库的 React + qiankun 工程，本节内容用于「在本项目之外生成/评审文案、图解、音视频产物」的场景。
- **去 AI 味两节（§一、§二）与本项目文档写作直接相关**：本项目 spec、PRD、journal 均为中文书面产出，§1.6（零 emoji）、§1.8（四原则）、§2.3（误报豁免）可作文档自检参照；若与 `.trellis/spec/guides/` 的写作类指南冲突，**以本项目 `guides/` 为准**。
- **流程图（§四）**：本项目文档内嵌图表默认用 Mermaid，本节产出的是 SVG/PNG 独立资产——**嵌在文档里的图仍优先 Mermaid**，本节仅在需要交付独立图片资产时使用。
- **音视频（§五、§六）与本项目无交集**，仅在用户明确要求处理音视频文件时按需引用。
