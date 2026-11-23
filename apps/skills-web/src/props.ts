/*
 * 子应用 props 契约与状态 —— main.tsx 与业务模块（Permission 组件）共享的轻量模块。
 *
 * 从 main.tsx 抽出（任务 11-20 权限对齐）：Permission 组件每次渲染读 getProps()，
 * 而 main.tsx 顶层有 render() 副作用（qiankun 生命周期挂载 + 独立态直渲）——jsdom
 * 测试环境 import 组件会连带执行入口（Target container is not a DOM element）。
 * 类型 + 模块级状态无副作用，独立成文件后组件的 import 链不再经过入口。
 * （与 iam-web src/props.ts 同款方案。）
 *
 * 跨应用契约按形状对齐宿主（apps/portal-web/src/micro/register.ts），不 import。
 */

/**
 * 宿主下发的偏好外观子集（getter，每次 mount 取最新值）。
 * 契约对齐宿主 register.ts 的 SubAppPreferences（10-25）；skills 只声明
 * 全量字段（与宿主投影一致，不做字段裁剪——子应用后续消费面扩展不用再改这里）。
 */
export interface SubAppPreferences {
  mode: 'light' | 'dark' | 'auto';
  colorPrimary: string;
  colorDestructive: string;
  colorSuccess: string;
  colorWarning: string;
  radius: string; // rem 数值字符串，如 '0.5'
  fontSize: number;
  colorGrayMode: boolean;
  colorWeakMode: boolean;
  locale: string;
}

/**
 * 宿主注入的 props（结构类型，按 skills-web 实际消费面窄化）。
 * 独立态（不经基座直开）无 props，getProps() 恒为空对象。
 */
export interface SkillsProps {
  container?: HTMLElement;
  setHasRender?: (v: boolean) => void;
  /**
   * 宿主菜单树派生的权限码数组（register.ts flattenPermissions）。
   * **getter 语义**：single-spa 每次 mount 经 getProps 展开执行 getter，本应用
   * 每次 render 经 getProps() 读最新值——不做值快照（快照会冻结在注册瞬间）。
   */
  permissions?: string[];
  /** 集成态路由前缀（宿主 register.ts 显式传递，默认 activeRule） */
  basename?: string;
  /** 宿主下发的偏好外观子集（getter，每次 mount 取最新值；见 SubAppPreferences） */
  preferences?: SubAppPreferences;
  /** 宿主全局状态订阅（快照含 preferences 外观子集；返回取消订阅函数） */
  onHostStateChange?: (
    cb: (state: Record<string, unknown>, prev: Record<string, unknown>) => void,
    fireImmediately?: boolean,
  ) => () => void;
  /** 宿主运行时语言包（config.js i18n.packUrls；键 = 语言代码，值 = JSON URL） */
  i18n?: { packUrls?: Record<string, string> };
  [key: string]: unknown;
}

let savedProps: SkillsProps = {};

/** 取最新 props（qiankun mount 时写入；独立态恒为空对象）。 */
export function getProps(): SkillsProps {
  return savedProps;
}

/** qiankun mount 时暂存（由 main.tsx 调用；业务模块经 getProps 读取）。 */
export function setProps(props: SkillsProps): void {
  savedProps = props;
}
