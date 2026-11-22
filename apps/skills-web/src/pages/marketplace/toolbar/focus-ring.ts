/**
 * 工具栏控件统一的键盘焦点环：1px 主题色（primary）、零偏移、实线。
 *
 * 为什么是 1px / 0 偏移：胶囊控件贴着边框绘制焦点环，2px + 2px 偏移会让焦点环
 * 溢出到相邻控件之间、与胶囊自身的 border 叠成双线；1px 紧贴内缘更接近浏览器
 * 原生焦点环的观感。颜色用 primary（主题色）而非 base-content——键盘焦点需要
 * 在浅色底上一眼可见，primary 的对比度高于中性色。
 *
 * 单一事实来源：分类按钮 / 搜索框 / 上传按钮三处都用这一份类串，改焦点环样式
 * 只改这里。`FOCUS_RING_CLASS` 用于自身可聚焦的元素（button 等）；
 * `FOCUS_RING_HAS_CLASS` 用于不可聚焦的包裹层（label），借 `has()` 把子元素的
 * `:focus-visible` 状态映射到包裹层上——否则焦点环会画在裸化的 `<input>` 上，
 * 只框住文字、不框胶囊外形。
 */
export const FOCUS_RING_CLASS =
  'focus-visible:outline-primary focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-solid';

/** 焦点环落在子元素时的等价写法（包裹层自身不可聚焦）。 */
export const FOCUS_RING_HAS_CLASS =
  'has-[:focus-visible]:outline-primary has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-0 has-[:focus-visible]:outline-solid';

/**
 * 焦点环变体：实心底色上的焦点环改用 primary-content（近白），与自身背景
 * primary 形成对比。
 *
 * 为什么需要变体：上传按钮是 primary 底色，primary 焦点环与底色同色 → 焦点环
 * 完全不可见，键盘用户失去位置锚点。浅色控件沿用 primary 主题色。
 */
export const FOCUS_RING_ON_PRIMARY_CLASS =
  'focus-visible:outline-primary-content focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-solid';
