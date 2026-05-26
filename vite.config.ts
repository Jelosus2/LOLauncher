import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
    plugins: [tailwindcss(), vue()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src/ui", import.meta.url))
        }
    },
    base: "./"
});