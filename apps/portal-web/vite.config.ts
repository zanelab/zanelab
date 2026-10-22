import { fileURLToPath, URL } from 'node:url';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const proxyTarget =
    process.env.VITE_PROXY_TARGET || env.VITE_PROXY_TARGET || '';

  if (command === 'serve' && mode === 'development' && !proxyTarget) {
    console.warn(
      '[vite.config.ts] 未配置 VITE_PROXY_TARGET：/auth、/agent 不会转发到后端。\n' +
        '  请用 `pnpm env:switch` 选择环境，或 `VITE_PROXY_TARGET=http://xxx pnpm dev`。',
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
        '/abp-static': {
          target: process.env.VITE_ABP_TARGET || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        ...(proxyTarget
          ? {
              '/auth/api': {
                target: proxyTarget,
                changeOrigin: true,
                secure: false,
              },

              '/agent/api': {
                target: proxyTarget,
                changeOrigin: true,
                secure: false,
              },
            }
          : {}),
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
