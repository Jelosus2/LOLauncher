import { reportError } from "@/services/errorReporter";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useLauncherStore = defineStore("launcher", () => {
    const launcherVersion = ref("");
    const isLauncherVersionLoaded = ref(false);

    async function loadLauncherVersion() {
        if (isLauncherVersionLoaded.value) return;

        try {
            launcherVersion.value = await window.app.getLauncherVersion();
        } catch (error) {
            launcherVersion.value = "Unknown";

            await reportError({
                title: "Version Unavailable",
                message: "Unable to read launcher version.",
                context: "launcherStore.loadLauncherVersion",
                error
            });
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
