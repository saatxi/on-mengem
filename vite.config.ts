import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';
import pkg from './package.json' with {type: 'json'};

// Content-Security-Policy només al build: en desenvolupament Vite necessita scripts inline i HMR.
function contentSecurityPolicy(supabaseUrl: string) {
  const supabase = supabaseUrl ? [supabaseUrl, supabaseUrl.replace(/^http/, 'ws')] : [];
  return {
    name: 'csp-meta',
    apply: 'build' as const,
    transformIndexHtml() {
      const policy = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src https://fonts.gstatic.com",
        // L'única imatge externa és la foto del compte de Google.
        "img-src 'self' data: https://*.googleusercontent.com",
        `connect-src ${["'self'", ...supabase].join(' ')}`,
        "manifest-src 'self'",
        "worker-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ');
      return [{tag: 'meta', attrs: {'http-equiv': 'Content-Security-Policy', content: policy}, injectTo: 'head-prepend' as const}];
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [
      react(),
      contentSecurityPolicy(env.VITE_SUPABASE_URL ?? ''),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'On menjem? - Restaurants i Grups',
          short_name: 'On menjem?',
          description: 'On menjem? - Organitza i descobreix restaurants, llistes de desitjats i alertes en temps real amb els teus grups.',
          theme_color: '#ea580c',
          background_color: '#fafaf9',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
  };
});
