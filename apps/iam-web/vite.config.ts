import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
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

export default defineConfig({
  plugins: [
    react(),
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
});
