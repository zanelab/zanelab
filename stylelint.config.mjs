export default {
  extends: ['@zanelab/stylelint-config'],
  root: true,
  rules: {
    // BEM 与 Tailwind/daisyUI 工具类结构性冲突，本仓不做类名模式约束
    'selector-class-pattern': null,
    // vben 白名单只覆盖 Tailwind v3 的 at-rules；v4 CSS-first 配置新增
    // @source/@plugin/@custom-variant/@theme/@utility（本文件直接使用）
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'tailwind',
          'apply',
          'variants',
          'responsive',
          'screen',
          'source',
          'plugin',
          'custom-variant',
          'theme',
          'utility',
        ],
      },
    ],
    'scss/at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'tailwind',
          'apply',
          'variants',
          'responsive',
          'screen',
          'source',
          'plugin',
          'custom-variant',
          'theme',
          'utility',
        ],
      },
    ],
    // @apply 后接的是 Tailwind 工具类名，不是合法 CSS 声明值
    'at-rule-prelude-no-invalid': null,
    // 既有 DOM id 命名（__admin_main_content，layout.tsx 引用）非 kebab-case
    'selector-id-pattern': null,
    // 手写 CSS 层叠覆盖模式（后块带 !important 覆盖前块），合并会改变级联
    'no-duplicate-selectors': null,
  },
};
