# skillry.dev agent 目录抓取(2026-11-26)

> 来源:https://skillry.dev/zh/skills/agent (页面标注「Agent Skills 目录 · 32 个 agent」,实际 33 行,含 Grok Bot)。
> 用途:筛选枚举取前 10;**将来做 agent 目录页**时的完整数据底稿(安装路径/接入方式已在列)。

## 编程类(Programming agents)

| # | Agent | 厂商 | 全局安装路径 | 项目安装路径 | 接入 |
|---|-------|------|-------------|-------------|------|
| 1 | Claude Code | Anthropic | `~/.claude/skills/` | `.claude/skills/` | 安装提示词 |
| 2 | Codex | OpenAI | `~/.agents/skills/` | `.agents/skills/` | 安装提示词 |
| 3 | Cursor | Anysphere | `~/.agents/skills/` | `.agents/skills/ or .cursor/skills/` | 安装提示词 |
| 4 | GitHub Copilot | GitHub | `~/.copilot/skills/ or ~/.agents/skills/` | `.github/skills/ or .agents/skills/` | 安装提示词 |
| 5 | Gemini CLI | Google | `~/.agents/skills/` | `.agents/skills/ or .gemini/skills/` | 安装提示词 |
| 6 | OpenCode | Open source | `~/.agents/skills/` | `.agents/skills/ or .opencode/skills/` | 安装提示词 |
| 7 | Antigravity | Google | `~/.gemini/config/skills/` | `.agents/skills/` | 安装提示词 |
| 8 | OpenClaw | Open source | `~/.openclaw/skills/ or ~/.agents/skills/` | `skills/ (in a workspace)` | 安装提示词 |
| 9 | Hermes Agent | Nous Research | `~/.hermes/skills/` | `.hermes/skills/ (trusted repos)` | 安装提示词 |
| 10 | Kiro | AWS | `~/.kiro/skills/` | `.kiro/skills/` | 安装提示词 |
| 11 | Windsurf | Cognition | `~/.agents/skills/ or ~/.config/devin/skills/` | `.agents/skills/ or .devin/skills/` | 安装提示词 |
| 12 | Cline | Cline | `~/.cline/skills/` | `.cline/skills/` | 安装提示词 |
| 13 | Zed | Zed Industries | `~/.agents/skills/` | `.agents/skills/` | 安装提示词 |
| 14 | Amp | Amp | `~/.config/agents/skills/ or ~/.agents/skills/` | `.agents/skills/` | 安装提示词 |
| 15 | Kilo Code | Kilo Code | `~/.kilo/skills/ or ~/.agents/skills/` | `.kilo/skills/ or .agents/skills/` | 安装提示词 |
| 16 | Goose | Agentic AI Foundation | `~/.agents/skills/` | `.agents/skills/` | 安装提示词 |
| 17 | Junie | JetBrains | `~/.junie/skills/ or ~/.agents/skills/` | `.agents/skills/` | 安装提示词 |
| 18 | OpenHands | All Hands AI | `~/.agents/skills/` | `.agents/skills/` | 安装提示词 |
| 19 | Grok Build | xAI | `~/.grok/skills/ or ~/.agents/skills/` | `.grok/skills/` | 安装提示词 |
| 20 | Mistral Vibe | Mistral AI | `~/.vibe/skills/ or ~/.agents/skills/` | `.vibe/skills/ or .agents/skills/` | 安装提示词 |
| 21 | Kimi Code | Moonshot AI | `~/.agents/skills/` | `.agents/skills/` | 安装提示词 |
| 22 | Trae | ByteDance | `~/.trae/skills/` | `.trae/skills/` | 安装提示词 |
| 23 | Qoder | Alibaba | `~/.qoder/skills/` | `.qoder/skills/` | 安装提示词 |
| 24 | CodeBuddy | Tencent | `~/.codebuddy/skills/` | `.codebuddy/skills/` | 安装提示词 |
| 25 | ZCode | Z.ai | `~/.zcode/skills/ or ~/.agents/skills/` | `.agents/skills/` | 安装提示词 |
| 26 | Qwen Code | Alibaba · Qwen | `~/.qwen/skills/` | `.qwen/skills/` | 安装提示词 |
| 27 | MiniMax Code | MiniMax | `~/.minimax/skills/ or ~/.agents/skills/` | `.agents/skills/` | 安装提示词 |

## 办公类(Office agents)

| # | Agent | 厂商 | 接入方式 |
|---|-------|------|---------|
| 28 | Claude Cowork | Anthropic | 上传 ZIP(Customize › Skills) |
| 29 | Manus | Manus | 上传 ZIP(Skills › + Add) |
| 30 | Perplexity Computer | Perplexity | 上传 ZIP(Skills › Create skill) |
| 31 | WorkBuddy | Tencent | 上传 ZIP(技能 › 添加技能) |
| 32 | Coze | ByteDance | 上传 ZIP(扣子编程 › 技能 › 上传技能包) |

## 另列

| Agent | 厂商 | 说明 |
|-------|------|------|
| Grok Bot | xAI | 远程 MCP,云电脑运行;连接指令接入 |

## 本任务取用

筛选枚举取**前 10**(上表 #1–10):Claude Code、Codex、Cursor、GitHub Copilot、Gemini CLI、OpenCode、Antigravity、OpenClaw、Hermes Agent、Kiro。
注意:首页下拉的「By agent」10 项与此不同(含 Kimi Code/Trae、无 Hermes/Kiro)——用户指示以 agent 目录页前 10 为准。
