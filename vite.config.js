import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  base: './',
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,

    // ─── AXUM BACKEND PROXY TUNNEL ──────────────────────────────────────────
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080', // Change 3000 to your exact Axum port if different
        changeOrigin: true,
        secure: false,
      },

      '/ws': {
        target: 'ws://127.0.0.1:8080',   // <-- ALSO CHANGE THIS FOR WEBSOCKET SYNC
        ws: true,
      }
    },

    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**", 
        '**/superstock.db',     // Main database file
        '**/superstock.db-wal', // Write-Ahead Log data file
        '**/superstock.db-shm'  // Shared memory index file
      ],

    },
  },
}));