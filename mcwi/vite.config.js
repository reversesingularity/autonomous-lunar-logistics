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
        sourcemap: false, // Disable sourcemaps in production for smaller bundle
        rollupOptions: {
            output: {
                manualChunks: {
                    // Cesium is handled by vite-plugin-cesium, so don't include it here
                    vendor: ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit'],
                },
            },
        },
    },
    define: {
        // Cesium base URL for assets
        CESIUM_BASE_URL: JSON.stringify('/cesium'),
    },
});
