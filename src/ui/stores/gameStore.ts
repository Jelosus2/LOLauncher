import type { LauncherTaskProgress } from "../../shared/installer";
import type { MaintenanceStatus } from "../../shared/maintenance";
import type { PatchVersionInfo } from "../../shared/patch";
import type { GameVersionInfo } from "../../shared/game";

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
    const versionInfo = ref<PatchVersionInfo | null>(null);
    const isCheckingVersionInfo = ref(false);
    const gameVersionInfo = ref<GameVersionInfo>({
        gameVersion: null,
        patchVersion: null
    });

    async function loadInstallPath() {
        try {
            installPath.value = await window.app.getGameInstallPath();
            await loadGameVersionInfo();
        } catch (error) {
            installPath.value = null;
            gameVersionInfo.value = {
                gameVersion: null,
                patchVersion: null
            };

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
            await loadInstallPath();
            await loadPatchVersionInfo();
            resetFinishedTaskSoon();
        }
    }

    async function applyLatestPatch() {
        isRunningTask.value = true;

        try {
            await window.app.applyLatestGamePatch();
            await loadPatchVersionInfo();
        } catch (error) {
            taskProgress.value = {
                step: "failed",
                label: "Update failed",
                percent: taskProgress.value.percent || 100,
                completedBytes: taskProgress.value.completedBytes,
                totalBytes: taskProgress.value.totalBytes
            };

            gameVersionInfo.value = {
                gameVersion: null,
                patchVersion: null
            };

            await reportError({
                title: isStorageError(error) ? "Not Enough Disk Space" : "Update Failed",
                message: getCleanErrorMessage(error, "Unable to patch Last Origin R+."),
                context: "gameStore.applyLatestPatch",
                error
            });
        } finally {
            resetFinishedTaskSoon();
            await loadGameVersionInfo();
        }
    }

    async function loadPatchVersionInfo() {
        isCheckingVersionInfo.value = true;

        try {
            versionInfo.value = await window.app.getPatchVersionInfo();
        } catch (error) {
            await reportError({
                title: "Patch Check Failed",
                message: "Unable to check the game patch version.",
                context: "patchStore.loadPatchVersionInfo",
                error
            });
        } finally {
            isCheckingVersionInfo.value = false;
        }
    }

    async function loadGameVersionInfo() {
        try {
            gameVersionInfo.value = await window.app.getGameVersionInfo();
        } catch (error) {
            gameVersionInfo.value = {
                gameVersion: null,
                patchVersion: null
            };

            await reportError({
                title: "Game Version Check Failed",
                message: "Unable to read the installed game version.",
                context: "gameStore.loadGameVersionInfo",
                error
            });
        }
    }

    function resetFinishedTaskSoon() {
        setTimeout(() => {
            if (taskProgress.value.step === "complete" || taskProgress.value.step === "failed")
                taskProgress.value = { ...idleProgress };

            isRunningTask.value = false;
        }, 4000);
    }

    return {
        installPath,
        isLoaded,
        isOpeningFolder,
        maintenanceStatus,
        isCheckingMaintenance,
        taskProgress,
        isRunningTask,
        versionInfo,
        isCheckingVersionInfo,
        gameVersionInfo,
        loadInstallPath,
        checkMaintenance,
        openInstallFolder,
        subscribeInstallerProgress,
        downloadAndRunInstaller,
        loadPatchVersionInfo,
        applyLatestPatch,
        loadGameVersionInfo
    };
});
