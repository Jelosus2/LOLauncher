import { reportError } from "@/services/errorReporter";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useGameStore = defineStore("game", () => {
    const installPath = ref<string | null>(null);
    const isLoaded = ref(false);
    const isOpeningFolder = ref(false);

    async function loadInstallPath() {
        try {
            installPath.value = await window.app.getGameInstallPath();
        } catch (error) {
            installPath.value = null;

            await reportError({
                title: "Game Detection Failed",
                message: "Unable to detect the Last Origin R+ install folder.",
                context: "gameStore.loadInstallPath",
                error
            });
        } finally {
            isLoaded.value = true;
        }
    }

    async function openInstallFolder() {
        isOpeningFolder.value = true;

        try {
            const result = await window.app.openGameInstallFolder();

            if (!result.success) {
                await reportError({
                    title: "Cannot Open Folder",
                    message: result.error || "Unable to open the game folder.",
                    context: "gameStore.openInstallFolder"
                });
            }
        } catch (error) {
            await reportError({
                title: "Cannot Open Folder",
                message: "Unable to open the game folder",
                context: "gameStore.openInstallFolder",
                error
            });
        } finally {
            isOpeningFolder.value = false;
        }
    }

    return {
        installPath,
        isLoaded,
        isOpeningFolder,
        loadInstallPath,
        openInstallFolder
    };
});
