import { defineConfig } from "vite";

export default defineConfig({
    server: {
        host: true,
        port: 5174,
        proxy: {
            "/api": {
                // IPv4 명시로 프록시 오류 방지
                target: "http://127.0.0.1:4000",
                changeOrigin: true,
                secure: false,
            },
        },
    },
});


