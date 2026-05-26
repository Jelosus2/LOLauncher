import { defineConfigWithVueTs, vueTsConfigs } from "@vue/eslint-config-typescript";
import pluginVue from "eslint-plugin-vue";

export default defineConfigWithVueTs(
    {
        name: "app/files-to-lint",
        files: ["**/*.{ts,mts,tsx,vue}"],
    },
    {
        name: "app/files-to-ignore",
        ignores: ["**/dist/**", "**/dist-ssr/**", "**/coverage/**"],
    },
    pluginVue.configs["flat/essential"],
    vueTsConfigs.recommended
);