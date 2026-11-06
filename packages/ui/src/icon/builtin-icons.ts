import type { IconData } from '@zanelab/types';

export const BUILTIN_ICONS: Record<string, IconData> = {
  /**
   * 内置图标表（编译期兜底）：常用标识符的默认图标；运行时注册表
   * （config.js icons / iconPackUrl / __registerIcons）同键覆盖本表。
   * path data 与项目手写 SVG 同构（viewBox 24 / stroke 2 / currentColor）。
   *
   * 09-08-icon-consolidation：原散落在各组件文件的内联 SVG 已全部收拢为本表
   * 条目，使用点一律 `<AppIcon name="..."/>`，不再新增内联 SVG。每个条目注释
   * 来源（收拢前 文件:行）。
   *
   * 近形字形刻意不合并（易踩坑）：home ≠ home-outline、moon ≠ moon-star、
   * system ≠ sun-moon、pin ≠ pin-filled、pin-off ≠ pin-off-filled、
   * refresh-cw（feather）≠ rotate-cw（lucide 新版）。
   */
  // ---------- 菜单标识符（09-08-icon-registry 原有键） ----------
  user: {
    paths: [
      'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2',
      'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    ],
  },
  shield: {
    paths: [
      'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
    ],
  },
  home: {
    paths: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h14V9.5', 'M10 21v-6h4v6'],
  },
  system: {
    paths: ['M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'],
  },
  components: {
    paths: ['M5 5h14v14H5z', 'M5 12h14', 'M12 5v14'],
  },
  table: {
    paths: ['M3 5h18v14H3z', 'M3 10h18', 'M3 15h18', 'M9 5v14'],
  },
  button: {
    paths: ['M5 8h14v8H5z', 'M9 12h6'],
  },

  // ---------- 第一批：重复大户（13 组合并） ----------
  /** lucide settings 齿轮。来源：preferences.tsx / preferences-button.tsx / user-dropdown.tsx（3 处同字形合并） */
  settings: {
    paths: [
      'M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
      'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z',
    ],
  },

  /** lucide circle-help。来源：preferences/blocks/{input,select,switch,number-field}-item、blocks/layout/layout（5 处同字形合并） */
  'circle-help': {
    paths: [
      'M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0',
      'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3',
      'M12 17h.01',
    ],
  },

  /** lucide x。来源：tabs.tsx / tabs-chrome.tsx / search-panel.tsx / preferences-drawer.tsx（line 转 path 合并） */
  close: {
    paths: ['M18 6 6 18M6 6l12 12'],
  },

  /** lucide pin（outline）。来源：tabs.tsx / tabs-chrome.tsx / sidebar-fixed-button.tsx / use-tabbar.ts（pin 变体统一到此字形） */
  pin: {
    paths: [
      'M12 17v5',
      'M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z',
    ],
  },

  /** lucide pin-off（outline）。来源：sidebar-fixed-button.tsx */
  'pin-off': {
    paths: [
      'M12 17v5',
      'M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89',
      'm2 2 20 20',
      'M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11',
    ],
  },

  /** lucide lock-keyhole。来源：user-dropdown.tsx（LockKeyholeIcon）/ lock-screen.tsx */
  lock: {
    paths: [
      'M11 16a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
      'M5 10H19A2 2 0 0 1 21 12V20A2 2 0 0 1 19 22H5A2 2 0 0 1 3 20V12A2 2 0 0 1 5 10Z',
      'M7 10V7a5 5 0 0 1 10 0v3',
    ],
  },

  /** lucide key（改密入口）。旧项目图标为 actionPassword.svg（12px 填充式锁形），
   *  本表统一 stroke 口径，故改用 lucide key（circle 转 path）。 */
  key: {
    paths: [
      'm15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4',
      'm21 2-9.6 9.6',
      'M13 15.5a5.5 5.5 0 1 0-11 0a5.5 5.5 0 1 0 11 0',
    ],
  },

  /** lucide sun。来源：theme-toggle.tsx / preferences/blocks/theme/theme.tsx（SystemIcon 冗余段随复用消失） */
  sun: {
    paths: [
      'M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
      'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41',
    ],
  },

  /** 来源：breadcrumb.tsx / menu/sub-menu-content.tsx（polyline 转 path） */
  'chevron-right': {
    paths: ['M9 18L15 12L9 6'],
  },

  /** 来源：breadcrumb.tsx / menu/sub-menu-content.tsx（polyline 转 path） */
  'chevron-down': {
    paths: ['M6 9L12 15L18 9'],
  },

  /** chevron-down 的镜像（向上）。来源：tenant-switcher.tsx */
  'chevron-up': {
    paths: ['M18 15L12 9L6 15'],
  },

  /** lucide check。来源：tenant-switcher.tsx（当前选中项标记） */
  check: {
    paths: ['M20 6L9 17L4 12'],
  },

  /** 来源：user-dropdown.tsx（子菜单级联指示） */
  'chevron-left': {
    paths: ['m15 18-6-6 6-6'],
  },

  /** 来源：tabs-view.tsx（tab 左滚）/ sidebar-collapse-button.tsx（polyline 与 path 同字形合并） */
  'chevrons-left': {
    paths: ['m11 17-5-5 5-5M18 17l-5-5 5-5'],
  },

  /** 来源：tabs-view.tsx（tab 右滚）/ sidebar-collapse-button.tsx（polyline 与 path 同字形合并） */
  'chevrons-right': {
    paths: ['m13 17 5-5-5-5M6 17l5-5-5-5'],
  },

  /** lucide circle-x。来源：notification.tsx / preferences/blocks/input-item.tsx */
  'circle-x': {
    paths: ['M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0', 'm15 9-6 6M9 9l6 6'],
  },

  // ---------- 第二批：tabs 工具条 + header ----------
  /** lucide maximize。来源：header/header.tsx / tool-screen.tsx（同字形合并） */
  maximize: {
    paths: [
      'M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3',
    ],
  },

  /** lucide minimize。来源：header/header.tsx / tool-screen.tsx（同字形合并） */
  minimize: {
    paths: [
      'M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3',
    ],
  },

  /** lucide rotate-cw（新版）。来源：header/header.tsx / use-tabbar.ts reload；preferences-drawer.tsx 老版字形统一到此 */
  'rotate-cw': {
    paths: ['M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8', 'M21 3v5h-5'],
  },

  /** feather refresh-cw（双箭头）。来源：tool-refresh.tsx。注意与 rotate-cw 是不同字形 */
  'refresh-cw': {
    paths: [
      'M23 4v6h-6M1 20v-6h6',
      'M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
    ],
  },

  /** 竖三点（tabbar「更多」）。来源：tool-more.tsx（circle 转 path） */
  'more-vertical': {
    paths: [
      'M11 5a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
      'M11 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
      'M11 19a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
    ],
  },

  /** 单圈 spinner（弧 + animate-spin）。来源：iframe/iframe-router-view.tsx */
  spinner: {
    paths: ['M21 12a9 9 0 1 1-6.219-8.56'],
  },

  // ---------- 第三批：widgets 单出处 ----------
  /** lucide search。来源：global-search.tsx / search-panel.tsx */
  search: {
    paths: ['M3 11a8 8 0 1 0 16 0a8 8 0 1 0-16 0', 'm21 21-4.348-4.348'],
  },

  /** lucide corner-down-left。来源：global-search.tsx（polyline 转 path） */
  'corner-down-left': {
    paths: ['M9 10L4 15L9 20', 'M20 4v7a4 4 0 0 1-4 4H4'],
  },

  /** lucide arrow-up。来源：global-search.tsx */
  'arrow-up': {
    paths: ['m5 12 7-7 7 7M12 19V5'],
  },

  /** lucide arrow-down。来源：global-search.tsx */
  'arrow-down': {
    paths: ['M12 5v14m7-7-7 7-7-7'],
  },

  /** lucide chevrons-down（esc 提示）。来源：global-search.tsx */
  'chevrons-down': {
    paths: ['m18 7-6 6-6-6', 'm18 13-6 6-6-6'],
  },

  /** lucide search-x。来源：search-panel.tsx（circle/line 转 path） */
  'search-x': {
    paths: [
      'M3 11a8 8 0 1 0 16 0a8 8 0 1 0-16 0',
      'M21 21L16.65 16.65',
      'M8.5 8.5L13.5 13.5',
      'M13.5 8.5L8.5 13.5',
    ],
  },

  /** 空心圆（菜单图标兜底）。来源：search-panel.tsx */
  circle: {
    paths: ['M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0'],
  },

  /** lucide bell。来源：notification.tsx */
  bell: {
    paths: [
      'M10.268 21a2 2 0 0 0 3.464 0',
      'M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326',
    ],
  },

  /** lucide mail-check。来源：notification.tsx */
  'mail-check': {
    paths: [
      'M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8',
      'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7',
      'm16 19 2 2 4-4',
    ],
  },

  /** lucide circle-check-big。来源：notification.tsx */
  'circle-check-big': {
    paths: ['M21.801 10A10 10 0 1 1 17 3.335', 'm9 11 3 3L22 4'],
  },

  /** lucide languages。来源：language-toggle.tsx */
  languages: {
    paths: [
      'm5 8 6 6',
      'm4 14 6-6 2-3',
      'M2 5h12',
      'M7 2h1',
      'm22 22-5-10-5 10',
      'M14 18h6',
    ],
  },

  /** lucide panel-left。来源：layout-toggle.tsx（rect 转 path） */
  'panel-left': {
    paths: [
      'M5 3H19A2 2 0 0 1 21 5V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3Z',
      'M9 3v18',
    ],
  },

  /** lucide panel-right。来源：layout-toggle.tsx（rect 转 path） */
  'panel-right': {
    paths: [
      'M5 3H19A2 2 0 0 1 21 5V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3Z',
      'M15 3v18',
    ],
  },

  /** lucide inspection-panel。来源：layout-toggle.tsx（rect 转 path） */
  'inspection-panel': {
    paths: [
      'M5 3H19A2 2 0 0 1 21 5V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3Z',
      'M3 15h18',
      'M15 9v6',
      'M9 9v6',
    ],
  },

  /** world-clock。来源：timezone-button.tsx（circle/polyline 转 path） */
  'world-clock': {
    paths: [
      'M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0',
      'M12 6L12 12L16 14',
      'M2 12h2',
      'M20 12h2',
      'M12 2v2',
      'M12 20v2',
    ],
  },

  /** lucide log-out。来源：user-dropdown.tsx（polyline/line 转 path） */
  'log-out': {
    paths: [
      'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4',
      'M16 17L21 12L16 7',
      'M21 12L9 12',
    ],
  },

  /** lucide moon（无星）。来源：preferences/blocks/theme/theme.tsx。注意与 moon-star 不同字形 */
  moon: {
    paths: ['M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'],
  },

  /** lucide moon-star（moon + 星点）。来源：theme-toggle.tsx */
  'moon-star': {
    paths: ['M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z', 'M16 5h.01'],
  },

  /** lucide sun-moon（日月同体，跟随系统）。来源：theme-toggle.tsx。注意与 builtin system（四宫格）不同字形 */
  'sun-moon': {
    paths: [
      'M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
      'M12 3v1M12 20v1M5.6 5.6l.7.7M17.7 17.7l.7.7M3 12h1M20 12h1M5.6 18.4l.7-.7M17.7 6.3l.7-.7',
      'M15.5 15.5A5 5 0 0 1 12 8a5 5 0 1 0 3.5 7.5z',
    ],
  },

  /** lucide copy。来源：preferences-drawer.tsx（rect 转 path） */
  copy: {
    paths: [
      'M11 9H20A2 2 0 0 1 22 11V20A2 2 0 0 1 20 22H11A2 2 0 0 1 9 20V11A2 2 0 0 1 11 9Z',
      'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
    ],
  },

  /** 实心 pin 变体。来源：preferences-drawer.tsx PinIcon（与 outline pin 不同字形） */
  'pin-filled': {
    paths: [
      'M12 17v5',
      'M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-2-1a2 2 0 0 1-1.11-1.8V7l1.72-.86A2 2 0 0 0 17 4.42V3H7v1.42a2 2 0 0 0 1.5 1.72L10.22 7v3.65a2 2 0 0 1-1.11 1.8l-2 1A2 2 0 0 0 6 15.24V17z',
    ],
  },

  /** 实心 pin-off 变体。来源：preferences-drawer.tsx PinOffIcon（与 outline pin-off 不同字形） */
  'pin-off-filled': {
    paths: [
      'M2 22L22 2',
      'M12 17v5',
      'M9 9v3.65a2 2 0 0 1-1.11 1.8l-2 1A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-2-1a2 2 0 0 1-1.11-1.8V7',
      'M14.05 5A2 2 0 0 0 17 4.42V3H7v1.42a2 2 0 0 0 .95 1.58',
    ],
  },

  /** feather eye（密码显隐切换·显示态）。feather 的 eye 字形：
   *  M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z（circle r=3 转 path） */
  eye: {
    paths: [
      'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z',
      'M15 12a3 3 0 1 0-6 0a3 3 0 1 0 6 0',
    ],
  },

  /** feather eye 加斜线（密码显隐切换·隐藏态）。斜线与 feather eye-off 同为
   *  M1 1l22 22 的简写，字形可辨识且与 eye 完全对齐 */
  'eye-off': {
    paths: [
      'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z',
      'M15 12a3 3 0 1 0-6 0a3 3 0 1 0 6 0',
      'M3 3l18 18',
    ],
  },

  /** lucide minus。来源：preferences/blocks/number-field-item.tsx */
  minus: {
    paths: ['M5 12h14'],
  },

  /** lucide plus。来源：preferences/blocks/number-field-item.tsx */
  plus: {
    paths: ['M5 12h14M12 5v14'],
  },

  /** lucide arrow-up-to-line。来源：back-top.tsx */
  'arrow-up-to-line': {
    paths: ['M5 3h14', 'm18 13-6-6-6 6', 'M12 7v14'],
  },

  /** mdi home-outline。来源：breadcrumb.tsx（polyline 转 path）。注意与 builtin home 不同字形 */
  'home-outline': {
    paths: [
      'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
      'M9 22L9 12L15 12L15 22',
    ],
  },

  // ---------- 第四批：B 类（线宽 1.5 统一为 2，已拍板） ----------
  /** 侧栏开关-收起（面板 + 左向 chevron）。来源：layouts/basic/layout/layout.tsx:374（strokeWidth 1.5 → 2） */
  'layout-sidebar-collapse': {
    paths: [
      'M9 3.5v17m7-5.5l-3-3l3-3',
      'M3 9.4c0-2.24 0-3.36.436-4.216a4 4 0 0 1 1.748-1.748C6.04 3 7.16 3 9.4 3h5.2c2.24 0 3.36 0 4.216.436a4 4 0 0 1 1.748 1.748C21 6.04 21 7.16 21 9.4v5.2c0 2.24 0 3.36-.436 4.216a4 4 0 0 1-1.748 1.748C17.96 21 16.84 21 14.6 21H9.4c-2.24 0-3.36 0-4.216-.436a4 4 0 0 1-1.748-1.748C3 17.96 3 16.84 3 14.6z',
    ],
  },

  /** 侧栏开关-展开（面板 + 右向 chevron）。来源：layouts/basic/layout/layout.tsx:379（strokeWidth 1.5 → 2） */
  'layout-sidebar-expand': {
    paths: [
      'M9 3.5v17M14 9l3 3l-3 3',
      'M3 9.4c0-2.24 0-3.36.436-4.216a4 4 0 0 1 1.748-1.748C6.04 3 7.16 3 9.4 3h5.2c2.24 0 3.36 0 4.216.436a4 4 0 0 1 1.748 1.748C21 6.04 21 7.16 21 9.4v5.2c0 2.24 0 3.36-.436 4.216a4 4 0 0 1-1.748 1.748C17.96 21 16.84 21 14.6 21H9.4c-2.24 0-3.36 0-4.216-.436a4 4 0 0 1-1.748-1.748C3 17.96 3 16.84 3 14.6z',
    ],
  },

  /** lucide user-round-pen（主题自定义色）。来源：preferences/blocks/theme/builtin.tsx:53（strokeWidth 1.5 → 2，circle 转 path） */
  'user-round-pen': {
    paths: [
      'M2 21a8 8 0 0 1 10.434-7.62',
      'M5 8a5 5 0 1 0 10 0a5 5 0 1 0-10 0',
      'M18.37 3.63a2.12 2.12 0 0 1 3 3L17 10l-4 1 1-4Z',
    ],
  },

  // ---------- 第四批：D 类（tabbar 右键/更多菜单，IContextMenuItem.icon 注册名） ----------
  /** lucide external-link（在新窗口打开）。来源：use-tabbar.ts open-in-new-window */
  'external-link': {
    paths: [
      'M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
    ],
  },

  /** 关闭左侧。来源：use-tabbar.ts close-left */
  'close-left': {
    paths: ['M19 12H5M9 6l-6 6 6 6'],
  },

  /** 关闭右侧。来源：use-tabbar.ts close-right */
  'close-right': {
    paths: ['M5 12h14M15 6l6 6-6 6'],
  },

  /** 关闭其他。来源：use-tabbar.ts close-other */
  'close-other': {
    paths: [
      'M9 7H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h4M15 7h4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-4',
    ],
  },

  /** 关闭所有。来源：use-tabbar.ts close-all */
  'close-all': {
    paths: ['M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4'],
  },
};
