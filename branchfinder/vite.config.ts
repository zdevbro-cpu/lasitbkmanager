import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/naver': {
          target: 'https://maps.apigw.ntruss.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/naver/, ''),
          secure: false,
          configure: (proxy, _options) => {
            // Show credential status when dev server starts
            const clientId = env.VITE_NAVER_MAP_CLIENT_ID || '';
            const clientSecret = env.VITE_NAVER_MAP_CLIENT_SECRET || '';
            if (!clientId || !clientSecret) {
              console.warn('[Proxy] ⚠️  Naver API credentials missing! Geocoding will fail.');
            } else {
              console.log(`[Proxy] ✅ Naver credentials loaded (ID: ${clientId}, Secret: ${clientSecret.length}자)`);
            }
            proxy.on('proxyReq', (proxyReq, _req, _res) => {
              proxyReq.setHeader('X-NCP-APIGW-API-KEY-ID', clientId);
              proxyReq.setHeader('X-NCP-APIGW-API-KEY', clientSecret);
              proxyReq.setHeader('Origin', 'http://localhost:3000');
            });
            proxy.on('error', (err, _req, _res) => {
              console.error('[Proxy] Naver geocoding proxy error:', err.message);
            });
          }
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
