import { createRoot, type Root } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import {
  renderWithQiankun,
  qiankunWindow,
} from 'vite-plugin-qiankun/dist/helper';
import { App } from './App';
// 独立运行态唯一样式来源（集成态样式由宿主注入，见 index.css 头注释）
import './index.css';
import { setProps, type SkillsProps } from './props';

// 对齐 iam-web 的轻量 props 契约：集成态消费 container/basename + 权限
// （permissions 是 getter 语义，每次 render 经 getProps() 读最新值，见 props.ts）；
// 本应用不消费 token/user/http，也不订阅宿主状态。
// 注意：SkillsProps 声明在 props.ts（非本文件）——Permission 组件经 props.ts 的
// getProps() 读权限，测试 import 组件时不得连带执行本入口的顶层 render 副作用。

let root: Root | null = null;

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
    setProps(props as SkillsProps);
    console.log('[skills] mount', props.basename);
    render(props as SkillsProps);
  },
  update() {},
  unmount() {
    console.log('[skills] unmount');
    root?.unmount();
    root = null;
    setProps({});
  },
});

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  // 独立运行（不经基座）：html 缺省 data-theme="light"——daisyUI 5 的 base-*
  // token 只在 [data-theme=light|dark] 命中时声明，无人设 → 组件背景全透明
  // （与 iam-web 同款修复，见其 main.tsx 注释）。集成态由宿主 main.tsx 设置。
  document.documentElement.dataset.theme ||= 'light';
  // 独立态无宿主 props：setProps({}) 后 getProps().permissions 为 undefined
  // → Permission 视作独立态，一律放行（后端 403 兜底）
  render({ basename: '/' });
}
