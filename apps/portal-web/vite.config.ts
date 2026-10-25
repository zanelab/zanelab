import { fileURLToPath, URL } from 'node:url';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ command, mode }) => {
  // 反代目标不写死：`pnpm dev` 会先跑 scripts/env-switch.mjs 交互式选择环境，
  // 把 VITE_PROXY_TARGET 写进 .env.development，这里读出来用。
  // 也可临时覆盖：VITE_PROXY_TARGET=http://xxx pnpm dev
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const proxyTarget =
    process.env.VITE_PROXY_TARGET || env.VITE_PROXY_TARGET || '';

  // 缺配置只提示、不抛错：本文件 vite 与 vitest 共用，vitest 的 command 同样是 serve、
  // mode 为 test（不加载 .env.development），抛错会连带 `pnpm test` 起不来。
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
        // umi 子应用 app-builder 的 HTML 入口与静态资源（.umirc.ts base=/abp-static）。
        // 走同源代理，qiankun fetch entry 就不需要子应用开 CORS；
        // 目标默认 umi dev server（umi dev 默认 8000），可用 VITE_ABP_TARGET 覆盖；
        // 生产由 nginx 把 /abp-static/ 指到子应用构建产物（与旧门户一致）。
        '/abp-static': {
          target: process.env.VITE_ABP_TARGET || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        ...(proxyTarget
          ? {
              // 真实后端代理：/auth/api/v1/* → ${VITE_PROXY_TARGET}/auth/api/v1/*
              // 避免 dev 跨域；生产由 nginx.conf 反代处理（~ /api/ 兜底）。
              // context 必须是 API 前缀 /auth/api，不能写成 /auth —— Vite 代理按
              // url.startsWith(context) 前缀匹配，/auth 会连带命中宿主自身路由
              // /auth/login、/auth/register 等，直连刷新时被错误转发到后端
              // （返回后端 HTML，宿主应用根本不启动）。
              '/auth/api': {
                target: proxyTarget,
                changeOrigin: true,
                secure: false,
              },

              // Agent 子系统代理（/agent/api/v1/*）。同理必须是 /agent/api：
              // 写成 /agent 会命中宿主路由 /agent_flow/*（AgentFlow 子应用），
              // 导致直连 http://localhost:5173/agent_flow/ 被转发到后端、
              // 返回子应用 HTML 而宿主不启动（表现为页面加载报错）。
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
      // Vite 8 用 rolldown 打包（rollupOptions 已废弃 → rolldownOptions；
      // 拆包字段是 output.codeSplitting，advancedChunks 也已废弃）。
      //
      // 目的：入口 chunk 曾达 583 kB（react/react-dom/react-router + i18next +
      // qiankun 全被并进入口，>500kB 触发体积警告）。这里把「首屏必然加载」
      // 的第三方库按类拆成独立 vendor chunk：
      //   1. 每个 chunk 都 <500kB，消除告警；
      //   2. 这些大库与业务代码分离，业务迭代不再让它们缓存失效（长期缓存收益）。
      // 只拆入口图里的库，不动动态 import 的懒加载 chunk（auth/qrcode 等）。
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
