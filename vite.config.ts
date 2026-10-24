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
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self'",
        // Imatges externes: la foto del compte de Google i les tessel·les del mapa (OpenStreetMap).
        "img-src 'self' data: https://*.googleusercontent.com https://tile.openstreetmap.org",
        // Nominatim (OpenStreetMap) calcula les coordenades de l'adreça dels restaurants.
        `connect-src ${["'self'", ...supabase, 'https://nominatim.openstreetmap.org'].join(' ')}`,
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
        // L'app avisa de les versions noves (UpdatePrompt) en lloc d'activar-les soles
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'On menjem? - Restaurants i Grups',
          short_name: 'On menjem?',
          description: 'On menjem? - Organitza i descobreix restaurants, llistes de desitjats i alertes en temps real amb els teus grups.',
          theme_color: '#f4511e',
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
    build: {
      // Les fonts van sempre en fitxer: la CSP (font-src 'self') bloqueja les que Vite incrustaria com a data:
      assetsInlineLimit: (file: string) => (file.endsWith('.woff2') ? false : undefined),
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
  };
});
