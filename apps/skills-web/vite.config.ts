import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import qiankun from 'vite-plugin-qiankun';

// qiankun 集成态：import-html-entry 会把子应用 index.html 里的内联
// <script type="module">（如 @vitejs/plugin-react 注入的 react-refresh
// preamble）按普通脚本 geval 执行，静态 import 语句直接 SyntaxError。
// 此插件（与 iam-web/home-web 同款，apply 仅 serve）把「import {...} from x;
// 其余语句」改写成动态 import(x).then(...)——动态 import 在经典脚本里合法。
function inlineModuleScriptsToDynamicImport(): Plugin {
  return {
    name: 'rewrite-inline-module-scripts',
    apply: 'serve',
    transformIndexHtml(html) {
      return html.replace(
        /<script type="module">([\s\S]*?)<\/script>/g,
        (match, code: string) => {
          const m = code.match(
            /^import\s*\{([^}]*)\}\s*from\s*(['"])([^'"]+)\2;?\s*([\s\S]*)$/,
          );
          if (!m) return match;
          const [, names, , src, rest] = m;
          return `<script>import(${JSON.stringify(src)}).then(m => { const {${names}} = m; ${rest} });</script>`;
        },
      );
    },
  };
}

// 与 home-web/iam-web 同款脚手架：qiankun('skills', useDevMode) + 独立态
// tailwind 编译（src/index.css，集成态样式由宿主注入）。
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    qiankun('skills', { useDevMode: true }),
    inlineModuleScriptsToDynamicImport(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8084,
    strictPort: true,
    allowedHosts: true,

    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 8084,
    strictPort: true,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },

  // vitest（配置对齐 iam-web）：jsdom 环境只测页面组件与纯函数，不测 main.tsx
  // （qiankun 入口在 jsdom 下与 vite-plugin-qiankun 的 window 注入冲突）。
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
