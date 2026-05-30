import type { LauncherTaskProgress } from "../../shared/installer";
import type { MaintenanceStatus } from "../../shared/maintenance";

import { isStorageError, getCleanErrorMessage } from "@/utils/errors";
import { reportError } from "@/services/errorReporter";
import { defineStore } from "pinia";
import { ref } from "vue";

const idleProgress: LauncherTaskProgress = {
    step: "idle",
    label: "",
    percent: 0
};

export const useGameStore = defineStore("game", () => {
    const installPath = ref<string | null>(null);
    const isLoaded = ref(false);
    const isOpeningFolder = ref(false);
    const maintenanceStatus = ref<MaintenanceStatus | null>(null);
    const isCheckingMaintenance = ref(false);
    const taskProgress = ref<LauncherTaskProgress>({ ...idleProgress });
    const isRunningTask = ref(false);

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

    async function checkMaintenance() {
        isCheckingMaintenance.value = true;

        try {
            maintenanceStatus.value = await window.app.checkMaintenance();
            return maintenanceStatus.value;
        } catch (error) {
            await reportError({
                title: "Status Check Failed",
                message: "Unable to check game service status.",
                context: "maintenanceStore.checkMaintenance",
                error
            });

            throw error;
        } finally {
            isCheckingMaintenance.value = false;
        }
    }

    function subscribeInstallerProgress() {
        return window.app.onInstallerProgress((progress) => {
            taskProgress.value = progress;
        });
    }

    async function downloadAndRunInstaller() {
        isRunningTask.value = true;

        try {
            const installerPath = await window.app.downloadGameInstaller();
            await window.app.executeGameInstaller(installerPath);
        } catch (error) {
            taskProgress.value = {
                step: "failed",
                label: "Installation failed",
                percent: taskProgress.value.percent || 100
            };

            await reportError({
                title: isStorageError(error) ? "Not Enough Disk Space" : "Install Failed",
                message: getCleanErrorMessage(error, "Unable to download or open the Last Origin R+ installer."),
                context: "installerStore.downloadAndOpenInstaller",
                error
            });
        } finally {
            setTimeout(() => {
                if (taskProgress.value.step === "complete" || taskProgress.value.step === "failed")
                    taskProgress.value = { ...idleProgress };

                isRunningTask.value = false;
            }, 4000);
        }
    }

    return {
        installPath,
        isLoaded,
        isOpeningFolder,
        maintenanceStatus,
        isCheckingMaintenance,
        taskProgress,
        isRunningTask,
        loadInstallPath,
        checkMaintenance,
        openInstallFolder,
        subscribeInstallerProgress,
        downloadAndRunInstaller
    };
});
