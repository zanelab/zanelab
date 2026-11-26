/**
 * Agent 目录静态数据（任务 11-26-skills-agent-page）。
 *
 * **为什么静态**：agent 的安装路径/接入方式是低频变更的事实型内容（参考站也
 * 是内容站硬编码），不走接口不入库——零迁移零端点。
 *
 * 数据源：skillry.dev/zh/skills/agent 页面表格实测抓取（33 行：编程 27 +
 * 办公 5 + Grok Bot）。底稿与抓取脚本产物见任务 research/。
 *
 * **与 marketplace `AGENT_LABEL` 的关系**：marketplace 只认 10 码（筛选值域
 * 契约），目录页覆盖全部 33 个。两者的 code/name 不合并——合并会让筛选值域
 * 随目录页漂移；一致性由测试守住（交集项 name 逐条相等）。
 *
 * 字段：
 * - code：本库缩写码（数据键；marketplace 同名项用同码）
 * - name/vendor：品牌名与厂商（数据非 UI 文案，不入语言包）
 * - type：'programming'（编程）/ 'office'（办公）
 * - globalPath：全局 Skills 目录（office 为空——办公 agent 走上传 ZIP）
 * - projectPath：项目目录（office 存设置路径，如 'Skills › + Add › Upload a skill'）
 * - installMethod：prompt（安装提示词）/ upload（上传 ZIP）/ connect（连接指令）
 * - installHint：安装方式补充说明（仅 Grok Bot 用：远程 MCP 说明）
 * - featured：是否出现在顶部 logo 横条
 */

/** agent 目录条目。 */
export interface AgentCatalogEntry {
  code: string;
  name: string;
  vendor: string;
  type: 'programming' | 'office';
  globalPath: string;
  projectPath: string;
  installMethod: 'prompt' | 'upload' | 'connect';
  installHint?: string;
  /** 出现在顶部 agent logo 横条 */
  featured: boolean;
}

/** 全部 agent（33 条，顺序 = 参考站表格顺序：Grok Bot 另列，其余按类型分组）。 */
export const AGENT_CATALOG: AgentCatalogEntry[] = [
  {
    code: 'XG',
    name: 'Grok Bot',
    vendor: 'xAI',
    type: 'office',
    globalPath: '',
    projectPath: '',
    installMethod: 'connect',
    installHint: '远程 MCP，在它的云电脑上运行',
    featured: true,
  },
  {
    code: 'CC',
    name: 'Claude Code',
    vendor: 'Anthropic',
    type: 'programming',
    globalPath: '~/.claude/skills/',
    projectPath: '.claude/skills/',
    installMethod: 'prompt',
    featured: true,
  },
  {
    code: 'CX',
    name: 'Codex',
    vendor: 'OpenAI',
    type: 'programming',
    globalPath: '~/.agents/skills/',
    projectPath: '.agents/skills/',
    installMethod: 'prompt',
    featured: true,
  },
  {
    code: 'CU',
    name: 'Cursor',
    vendor: 'Anysphere',
    type: 'programming',
    globalPath: '~/.agents/skills/',
    projectPath: '.agents/skills/ or .cursor/skills/',
    installMethod: 'prompt',
    featured: true,
  },
  {
    code: 'GH',
    name: 'GitHub Copilot',
    vendor: 'GitHub',
    type: 'programming',
    globalPath: '~/.copilot/skills/ or ~/.agents/skills/',
    projectPath: '.github/skills/ or .agents/skills/',
    installMethod: 'prompt',
    featured: true,
  },
  {
    code: 'GC',
    name: 'Gemini CLI',
    vendor: 'Google',
    type: 'programming',
    globalPath: '~/.agents/skills/',
    projectPath: '.agents/skills/ or .gemini/skills/',
    installMethod: 'prompt',
    featured: true,
  },
  {
    code: 'OC',
    name: 'OpenCode',
    vendor: 'Open source',
    type: 'programming',
    globalPath: '~/.agents/skills/',
    projectPath: '.agents/skills/ or .opencode/skills/',
    installMethod: 'prompt',
    featured: true,
  },
  {
    code: 'AG',
    name: 'Antigravity',
    vendor: 'Google',
    type: 'programming',
    globalPath: '~/.gemini/config/skills/',
    projectPath: '.agents/skills/',
    installMethod: 'prompt',
    featured: true,
  },
  {
    code: 'OB',
    name: 'OpenClaw',
    vendor: 'Open source',
    type: 'programming',
    globalPath: '~/.openclaw/skills/ or ~/.agents/skills/',
    projectPath: 'skills/ (in a workspace)',
    installMethod: 'prompt',
    featured: true,
  },
  {
    code: 'HA',
    name: 'Hermes Agent',
    vendor: 'Nous Research',
    type: 'programming',
    globalPath: '~/.hermes/skills/',
    projectPath: '.hermes/skills/ (trusted repos)',
    installMethod: 'prompt',
    featured: true,
  },
  {
    code: 'KI',
    name: 'Kiro',
    vendor: 'AWS',
    type: 'programming',
    globalPath: '~/.kiro/skills/',
    projectPath: '.kiro/skills/',
    installMethod: 'prompt',
    featured: true,
  },
  {
    code: 'WS',
    name: 'Windsurf',
    vendor: 'Cognition',
    type: 'programming',
    globalPath: '~/.agents/skills/ or ~/.config/devin/skills/',
    projectPath: '.agents/skills/ or .devin/skills/',
    installMethod: 'prompt',
    featured: true,
  },
  {
    code: 'CL',
    name: 'Cline',
    vendor: 'Cline',
    type: 'programming',
    globalPath: '~/.cline/skills/',
    projectPath: '.cline/skills/',
    installMethod: 'prompt',
    featured: true,
  },
  {
    code: 'ZD',
    name: 'Zed',
    vendor: 'Zed Industries',
    type: 'programming',
    globalPath: '~/.agents/skills/',
    projectPath: '.agents/skills/',
    installMethod: 'prompt',
    featured: true,
  },
  {
    code: 'AM',
    name: 'Amp',
    vendor: 'Amp',
    type: 'programming',
    globalPath: '~/.config/agents/skills/ or ~/.agents/skills/',
    projectPath: '.agents/skills/',
    installMethod: 'prompt',
    featured: true,
  },
  {
    code: 'KL',
    name: 'Kilo Code',
    vendor: 'Kilo Code',
    type: 'programming',
    globalPath: '~/.kilo/skills/ or ~/.agents/skills/',
    projectPath: '.kilo/skills/ or .agents/skills/',
    installMethod: 'prompt',
    featured: false,
  },
  {
    code: 'GS',
    name: 'Goose',
    vendor: 'Agentic AI Foundation',
    type: 'programming',
    globalPath: '~/.agents/skills/',
    projectPath: '.agents/skills/',
    installMethod: 'prompt',
    featured: false,
  },
  {
    code: 'JN',
    name: 'Junie',
    vendor: 'JetBrains',
    type: 'programming',
    globalPath: '~/.junie/skills/ or ~/.agents/skills/',
    projectPath: '.junie/skills/ or .agents/skills/',
    installMethod: 'prompt',
    featured: false,
  },
  {
    code: 'OH',
    name: 'OpenHands',
    vendor: 'All Hands AI',
    type: 'programming',
    globalPath: '~/.agents/skills/',
    projectPath: '.agents/skills/',
    installMethod: 'prompt',
    featured: false,
  },
  {
    code: 'GB',
    name: 'Grok Build',
    vendor: 'xAI',
    type: 'programming',
    globalPath: '~/.grok/skills/ or ~/.agents/skills/',
    projectPath: '.grok/skills/',
    installMethod: 'prompt',
    featured: false,
  },
  {
    code: 'MV',
    name: 'Mistral Vibe',
    vendor: 'Mistral AI',
    type: 'programming',
    globalPath: '~/.vibe/skills/ or ~/.agents/skills/',
    projectPath: '.vibe/skills/ or .agents/skills/',
    installMethod: 'prompt',
    featured: false,
  },
  {
    code: 'KM',
    name: 'Kimi Code',
    vendor: 'Moonshot AI',
    type: 'programming',
    globalPath: '~/.agents/skills/',
    projectPath: '.agents/skills/',
    installMethod: 'prompt',
    featured: true,
  },
  {
    code: 'TR',
    name: 'Trae',
    vendor: 'ByteDance',
    type: 'programming',
    globalPath: '~/.trae/skills/',
    projectPath: '.trae/skills/',
    installMethod: 'prompt',
    featured: true,
  },
  {
    code: 'QD',
    name: 'Qoder',
    vendor: 'Alibaba',
    type: 'programming',
    globalPath: '~/.qoder/skills/',
    projectPath: '.qoder/skills/',
    installMethod: 'prompt',
    featured: false,
  },
  {
    code: 'CB',
    name: 'CodeBuddy',
    vendor: 'Tencent',
    type: 'programming',
    globalPath: '~/.codebuddy/skills/',
    projectPath: '.codebuddy/skills/',
    installMethod: 'prompt',
    featured: false,
  },
  {
    code: 'ZC',
    name: 'ZCode',
    vendor: 'Z.ai',
    type: 'programming',
    globalPath: '~/.zcode/skills/ or ~/.agents/skills/',
    projectPath: '.zcode/skills/ or .agents/skills/',
    installMethod: 'prompt',
    featured: false,
  },
  {
    code: 'QW',
    name: 'Qwen Code',
    vendor: 'Alibaba · Qwen',
    type: 'programming',
    globalPath: '~/.qwen/skills/',
    projectPath: '.qwen/skills/',
    installMethod: 'prompt',
    featured: false,
  },
  {
    code: 'MM',
    name: 'MiniMax Code',
    vendor: 'MiniMax',
    type: 'programming',
    globalPath: '~/.minimax/skills/ or ~/.agents/skills/',
    projectPath: '.minimax/skills/ or .agents/skills/',
    installMethod: 'prompt',
    featured: false,
  },
  {
    code: 'CW',
    name: 'Claude Cowork',
    vendor: 'Anthropic',
    type: 'office',
    globalPath: '',
    projectPath: 'Customize › Skills',
    installMethod: 'upload',
    featured: false,
  },
  {
    code: 'MN',
    name: 'Manus',
    vendor: 'Manus',
    type: 'office',
    globalPath: '',
    projectPath: 'Skills › + Add › Upload a skill',
    installMethod: 'upload',
    featured: false,
  },
  {
    code: 'PX',
    name: 'Perplexity Computer',
    vendor: 'Perplexity',
    type: 'office',
    globalPath: '',
    projectPath: 'Skills › Create skill › Upload a skill',
    installMethod: 'upload',
    featured: false,
  },
  {
    code: 'WB',
    name: 'WorkBuddy',
    vendor: 'Tencent',
    type: 'office',
    globalPath: '',
    projectPath: '技能 › 添加技能 › 上传技能',
    installMethod: 'upload',
    featured: false,
  },
  {
    code: 'CZ',
    name: 'Coze',
    vendor: 'ByteDance',
    type: 'office',
    globalPath: '',
    projectPath: '扣子编程 › 技能 › 上传技能包',
    installMethod: 'upload',
    featured: false,
  },
];

/** 顶部 logo 横条的 agent（参考站 17 个 chip，顺序同参考站）。 */
export const FEATURED_AGENTS = AGENT_CATALOG.filter((a) => a.featured);
