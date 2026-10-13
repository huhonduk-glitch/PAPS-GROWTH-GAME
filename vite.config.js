import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate', // 새 버전이 올라오면 다음에 열 때 저절로 바뀜
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '튼튼몬 키우기',
        short_name: '튼튼몬',
        description: '운동하고 골고루 먹으면 자라는 건강 습관 육성 게임',
        lang: 'ko',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#E7EEF4',
        theme_color: '#FF8A3D',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg}'],
        runtimeCaching: [
          { // 글꼴: 한 번 받으면 오프라인에서도 씀
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fonts', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  test: { include: ['tests/**/*.test.js'] },
});
