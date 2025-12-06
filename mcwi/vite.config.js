import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';
import path from 'path';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), cesium()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        open: true,
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
    define: {
        // Cesium base URL for assets
        CESIUM_BASE_URL: JSON.stringify('/cesium'),
    },
});
