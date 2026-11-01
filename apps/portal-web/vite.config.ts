import { fileURLToPath, URL } from 'node:url';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const proxyTarget =
    process.env.VITE_PROXY_TARGET || env.VITE_PROXY_TARGET || '';
  // apikey 注入（仅 dev proxy 转发时）：/iam/functions/v1 指云 Supabase 时网关
  // 要求 publishable key。shell 变量优先于 .env 文件，与 proxyTarget 同法。
  const apiKey = process.env.VITE_API_KEY || env.VITE_API_KEY || '';

  if (command === 'serve' && mode === 'development' && !proxyTarget) {
    console.warn(
      '[vite.config.ts] 未配置 VITE_PROXY_TARGET：代理转发不会生效。\n' +
        '  请设置 VITE_PROXY_TARGET 环境变量。',
    );
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '0.0.0.0',
      allowedHosts: true,
      proxy: {
        // iam 子应用接口代理：/iam/functions/v1/* → iam dev server（剥前缀，
        // 由子应用 MSW worker 拦截）或云 Supabase 网关（VITE_PROXY_TARGET）。
        '/iam/functions/v1': {
          target: proxyTarget || 'http://localhost:8081',
          // http-proxy 转发时附加 apikey 头（设了 VITE_API_KEY 才带，缺省不加）
          ...(apiKey ? { headers: { apikey: apiKey } } : {}),
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/iam/, ''),
        },
      },
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'react-vendor',
                test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
                priority: 40,
              },
              {
                name: 'qiankun-vendor',
                test: /[\\/]node_modules[\\/](qiankun|single-spa|import-html-entry)[\\/]/,
                priority: 30,
              },
              {
                name: 'i18n-vendor',
                test: /[\\/]node_modules[\\/](i18next|react-i18next)[\\/]/,
                priority: 20,
              },
            ],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});
