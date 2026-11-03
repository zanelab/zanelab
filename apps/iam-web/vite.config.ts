import { fileURLToPath, URL } from 'node:url';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import qiankun from 'vite-plugin-qiankun';

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

export default defineConfig(({ mode }) => {
  // 与 portal-web 同法读取：shell 变量优先于 .env 文件；仅 dev 生效。
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const proxyTarget =
    process.env.VITE_PROXY_TARGET || env.VITE_PROXY_TARGET || '';

  return {
    plugins: [
      react(),
      tailwindcss(), // 独立运行态样式编译（src/index.css；集成态样式仍由宿主注入）
      qiankun('iam', { useDevMode: true }),
      inlineModuleScriptsToDynamicImport(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 8081,
      strictPort: true,
      allowedHosts: true,

      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },

      // 独立态直连云 Supabase 的唯一通路（R9）：独立态 apiPrefix 为空，请求是相对
      // 路径 /functions/v1/iam/...，落点就是本 dev server——没有这条代理就 404
      // （2026-11-01 实测）。与 mock 正交：VITE_USE_MOCK=true 时 SW 在页面层先拦截，
      // 请求到不了这里；关掉 mock 才由本代理转发。
      // 注意 target 是 Supabase 基址（不含 /functions/v1），路径原样转发、不 rewrite
      // ——与 portal 侧不同（那条要剥掉 /iam 前缀）。
      proxy: proxyTarget
        ? {
            '/functions/v1': {
              target: proxyTarget,
              changeOrigin: true,
              secure: false,
            },
          }
        : undefined,
    },
    preview: {
      host: '0.0.0.0',
      port: 8081,
      strictPort: true,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },

    // vitest（任务 11-03 引入测试栈，配置对齐 portal-web）：
    // jsdom 环境 + MSW node server（src/test/setup.ts 起 stop）。
    // 注意：只测页面组件与纯函数，不测 main.tsx（qiankun 入口在 jsdom 下
    // 与 vite-plugin-qiankun 的 window 注入冲突）。
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});
