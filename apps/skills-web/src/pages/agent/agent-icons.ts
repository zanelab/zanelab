/**
 * agent 品牌图标资源（src/assets/agents/）。
 *
 * **为什么从 public/ 移到 src/assets/**：public 目录的文件不经 Vite 处理——
 * 运行时读不到内容，无法判定图标是「自带配色」还是「fill="currentColor"
 * 的单色图」。移到 src/assets/ 后可经 `import.meta.glob` 静态引入：
 * - `?raw` 拿 SVG 源码 → 自动判定单色（暗色主题需反色，见下）；
 * - 默认导入拿构建后的 URL → 由 Vite 处理哈希与 qiankun 集成态的
 *   publicPath 注入，**不再需要手写 asset-url.ts 的路径解析**。
 *
 * **单色图与暗色主题**：`fill="currentColor"` 的单色图经 <img> 加载时
 * currentColor 解析为黑——暗色主题的深色圆底上不可见，故暗色下对其施加
 * invert 滤镜翻白。自带配色的图标不反色（反色会破坏品牌色）。
 */

/** 图标文件名 → 构建后 URL。 */
const urlModules = import.meta.glob<string>('../../assets/agents/*.{svg,png}', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** 图标文件名 → SVG 源码（用于判定单色）。 */
const rawModules = import.meta.glob<string>('../../assets/agents/*.{svg,png}', {
  eager: true,
  query: '?raw',
  import: 'default',
});

/** 文件名（basename）→ 构建后 URL。 */
export const AGENT_ICON_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(urlModules).map(([path, url]) => [
    path.split('/').pop() as string,
    url,
  ]),
);

/**
 * 单色图标文件名集合（SVG 源码含 currentColor）。
 *
 * 由 `?raw` 导入的源码**自动判定**——不手写清单：图标增删或改配色时
 * 判定自动跟随，不会漂移（手写清单曾漏登记 openai.svg）。
 */
export const MONOCHROME_AGENT_ICONS: ReadonlySet<string> = new Set(
  Object.entries(rawModules)
    .filter(([, source]) => source.includes('currentColor'))
    .map(([path]) => path.split('/').pop() as string),
);

/** 按文件名取构建后 URL；文件不存在返回 undefined（调用方负责回退）。 */
export function agentIconUrl(fileName: string): string | undefined {
  return AGENT_ICON_URLS[fileName];
}

/** 该图标是否为单色（需在暗色主题下反色）。 */
export function isMonochromeAgentIcon(fileName: string): boolean {
  return MONOCHROME_AGENT_ICONS.has(fileName);
}
