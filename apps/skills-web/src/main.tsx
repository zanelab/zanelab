import { createRoot, type Root } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import {
  renderWithQiankun,
  qiankunWindow,
} from 'vite-plugin-qiankun/dist/helper';
import { App } from './App';
import {
  bindHostPermissions,
  setPermissions,
  type PermissionHostProps,
} from './utils/permission';
// 独立运行态唯一样式来源（集成态样式由宿主注入，见 index.css 头注释）
import './index.css';

// 对齐 home-web 的轻量 props 契约：集成态消费 container/basename + 权限
// （permissions 挂载快照 + onHostStateChange 订阅，见 permission.ts）；
// 本应用不消费 token/user/http，也不订阅其余宿主状态。
export interface SkillsProps extends PermissionHostProps {
  container?: HTMLElement;
  setHasRender?: (v: boolean) => void;
  /** 宿主注入的权限码；**非数组即视为无宿主**（独立态 → 一律放行） */
  permissions?: string[];
  /** 宿主状态推送；订阅它以消除「挂载早于菜单加载 → 权限为空」的竞态 */
  onHostStateChange?: (snapshot: { permissions?: string[] }) => void;
  [key: string]: unknown;
}

let savedProps: SkillsProps = {};
let root: Root | null = null;
/** 宿主权限订阅的退订函数（render 重入与 unmount 都要调用，否则监听器堆积） */
let unbindHostPermissions: (() => void) | null = null;

export function getProps(): SkillsProps {
  return savedProps;
}

function render(props: SkillsProps) {
  const container = props.container ?? document.getElementById('root')!;
  const basename = (props.basename as string | undefined) ?? '/skills';
  // 权限接线：挂载快照 +（宿主存在时）订阅后续变更。重入前先退订上一次
  unbindHostPermissions?.();
  unbindHostPermissions = bindHostPermissions(props);
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
    // 退订宿主权限推送 + 释放宿主派生的权限快照（回到独立态语义）
    unbindHostPermissions?.();
    unbindHostPermissions = null;
    setPermissions(undefined);
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
  // 独立态无宿主 props：bindHostPermissions 会记作「无宿主」→ 权限一律放行
  // （onHostStateChange 不存在时只走快照分支，不订阅）
  render({ basename: '/' });
}
