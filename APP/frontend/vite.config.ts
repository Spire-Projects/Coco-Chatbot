import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import basicSsl from "@vitejs/plugin-basic-ssl";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // HTTPS local para testing PWA en móviles
    mode === 'development' ? basicSsl() : undefined,
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo.png", "robots.txt"],
      manifest: {
        name: "Apple Land - Sistema de Gestión",
        short_name: "Apple Land",
        description: "Sistema de gestión de inventario, ventas y compras",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/",
        start_url: "/",
        orientation: "portrait",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-maskable-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 año
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 año
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: mode === "development",
        type: "module"
      }
    })
  ],
  base: "./", // Importante para Electron: usar rutas relativas
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    exclude: ["jose"],
    include: [
      'react',
      'react-dom',
      'react-router-dom',
    ],
  },
  server: {
    host: true,
    port: 43212,
    hmr: {
      overlay: mode === "development", // Solo en desarrollo
    },
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    sourcemap: mode === "development", // Solo en desarrollo
    minify: mode === "production", // Solo en producción
    modulePreload: {
      polyfill: true, // Añade un polyfill para navegadores más antiguos
      resolveDependencies: (_, deps) => {
        // Personaliza qué módulos se precargan
        return deps;
      },
    },
    rollupOptions: {
      output: {
        // Configuración manual de chunks comentada temporalmente
        /*
        manualChunks: (id) => {
          // Vendor libraries
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('rxdb') || id.includes('dexie')) {
              return 'vendor-rxdb';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('crypto-js') || id.includes('jose')) {
              return 'vendor-crypto';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            return 'vendor-other';
          }
          
          // Feature-based chunks
          if (id.includes('/features/inventory/')) {
            return 'feature-inventory';
          }
          if (id.includes('/features/sales/')) {
            return 'feature-sales';
          }
          if (id.includes('/features/purchases/')) {
            return 'feature-purchases';
          }
          if (id.includes('/features/users/')) {
            return 'feature-users';
          }
          if (id.includes('/features/clients/')) {
            return 'feature-clients';
          }
          if (id.includes('/features/reports/')) {
            return 'feature-reports';
          }
          
          // Shared utilities
          if (id.includes('/shared/')) {
            return 'shared';
          }
        },
        */
      },
    },
  },
}));
