import { createRoot, type Root } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import {
  renderWithQiankun,
  qiankunWindow,
} from 'vite-plugin-qiankun/dist/helper';
import { App } from './App';
// 独立运行态唯一样式来源（集成态样式由宿主注入，见 index.css 头注释）
import './index.css';

// 对齐 home-web 的轻量 props 契约：本应用无鉴权/无宿主状态依赖，
// 集成态只消费 container/basename，运行期全局状态不订阅。
export interface SkillsProps {
  container?: HTMLElement;
  setHasRender?: (v: boolean) => void;
  [key: string]: unknown;
}

let savedProps: SkillsProps = {};
let root: Root | null = null;

export function getProps(): SkillsProps {
  return savedProps;
}

function render(props: SkillsProps) {
  const container = props.container ?? document.getElementById('root')!;
  const basename = (props.basename as string | undefined) ?? '/skills';
  root = createRoot(container);
  root.render(
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>,
  );
  props.setHasRender?.(true);
}

renderWithQiankun({
  bootstrap() {
    console.log('[skills] bootstrap');
  },
  mount(props) {
    savedProps = props as SkillsProps;
    console.log('[skills] mount', props.basename);
    render(savedProps);
  },
  update() {},
  unmount() {
    console.log('[skills] unmount');
    root?.unmount();
    root = null;
    savedProps = {};
  },
});

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  // 独立运行（不经基座）：html 缺省 data-theme="light"——daisyUI 5 的 base-*
  // token 只在 [data-theme=light|dark] 命中时声明，无人设 → 组件背景全透明
  // （与 iam-web 同款修复，见其 main.tsx 注释）。集成态由宿主 main.tsx 设置。
  document.documentElement.dataset.theme ||= 'light';
  render({ basename: '/' });
}
