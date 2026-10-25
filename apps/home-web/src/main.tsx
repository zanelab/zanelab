import { createRoot, type Root } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import {
  renderWithQiankun,
  qiankunWindow,
} from 'vite-plugin-qiankun/dist/helper';
import { App } from './App';

let root: Root | null = null;

export interface HomeProps {
  container?: HTMLElement;
  setHasRender?: (v: boolean) => void;

  getHostState?: () => Record<string, unknown>;

  onHostStateChange?: (
    cb: (state: Record<string, unknown>, prev: Record<string, unknown>) => void,
    fireImmediately?: boolean,
  ) => () => void;
  [key: string]: unknown;
}

let savedProps: HomeProps = {};

export function getProps(): HomeProps {
  return savedProps;
}

function render(props: HomeProps) {
  const container = props.container ?? document.getElementById('root')!;
  const basename = (props.basename as string | undefined) ?? '/home';
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
    console.log('[home] bootstrap');
  },
  mount(props) {
    savedProps = props as HomeProps;
    console.log('[home] mount', props.basename);
    render(savedProps);
  },
  update() {},
  unmount() {
    console.log('[home] unmount');
    root?.unmount();
    root = null;
    savedProps = {};
  },
});

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render({ basename: '/' });
}
