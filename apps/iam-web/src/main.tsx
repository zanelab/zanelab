import { createRoot, type Root } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import {
  renderWithQiankun,
  qiankunWindow,
} from 'vite-plugin-qiankun/dist/helper';
import { App } from './App';

let root: Root | null = null;

export interface PltProps {
  container?: HTMLElement;
  setHasRender?: (v: boolean) => void;

  getHostState?: () => Record<string, unknown>;

  onHostStateChange?: (
    cb: (state: Record<string, unknown>, prev: Record<string, unknown>) => void,
    fireImmediately?: boolean,
  ) => () => void;
  onLoginSuccess?: (params: {
    token: string;
    refreshToken?: string;
    user?: {
      id?: number | string;
      username?: string;
      nickname?: string;
      [key: string]: unknown;
    };
  }) => Promise<void>;
  http?: {
    post: (...args: unknown[]) => Promise<unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

let savedProps: PltProps = {};

export function getProps(): PltProps {
  return savedProps;
}

function render(props: PltProps) {
  const container = props.container ?? document.getElementById('root')!;
  const basename = (props.basename as string | undefined) ?? '/system';
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
    console.log('[iam] bootstrap');
  },
  mount(props) {
    savedProps = props as PltProps;
    console.log('[iam] mount', props.basename);
    render(savedProps);
  },
  update() {},
  unmount() {
    console.log('[iam] unmount');
    root?.unmount();
    root = null;
    savedProps = {};
  },
});

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render({ basename: '/' });
}
