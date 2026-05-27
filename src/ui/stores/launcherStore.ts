import { defineStore } from "pinia";
import { ref } from "vue";

export const useLauncherStore = defineStore("launcher", () => {
    const launcherVersion = ref("");
    const isLauncherVersionLoaded = ref(false);

    async function loadLauncherVersion() {
        if (isLauncherVersionLoaded.value) return;

        try {
            launcherVersion.value = await window.app.getLauncherVersion();
        } catch {
            launcherVersion.value = "Unknown";
        } finally {
            isLauncherVersionLoaded.value = true;
        }
    }

    return {
        launcherVersion,
        isLauncherVersionLoaded,
        loadLauncherVersion
    };
});
