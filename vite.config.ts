import { defineConfig } from "vite";

export default defineConfig({
    server: {
        host: true,
        port: 5174,
        proxy: {
            "/api": {
                target: "http://localhost:4000",
                changeOrigin: true,
            },
        },
    },
});


