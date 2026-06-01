import { getGameInstallPath, getGameVersionInfo, isGameProcessRunning, assertGameIsNotRunning, runGameUninstaller } from "../../game/gameService.js";
import { getPatchVersionInfo, applyLatestPatch, repairGameFiles } from "../../game/patchService.js";
import { checkMaintenanceStatus, assertCanInstallOrPatch } from "../../game/maintenanceService.js";
import { patchTaskController, PatchTaskCanceledError } from "../../game/patchTaskController.js";
import { downloadGameInstaller, runInstaller } from "../../game/installerService.js";
import { shell, type IpcMainInvokeEvent } from "electron";
import { IpcHandle } from "../ipcDecorators.js";

export class GameController {
    @IpcHandle("game:get-install-path")
    getInstallPath() {
        return getGameInstallPath();
    }

    @IpcHandle("game:open-install-folder")
    async openInstallFolder() {
        const installPath = await getGameInstallPath();
        if (!installPath)
            return { success: false };

        const error = await shell.openPath(installPath);
        return { success: error.length === 0, error };
    }

    @IpcHandle("game:check-maintenance")
    checkMaintenance() {
        return checkMaintenanceStatus();
    }

    @IpcHandle("game:get-version-info")
    getGameVersion() {
        return getGameVersionInfo();
    }

    @IpcHandle("game:is-running")
    isGameRunning() {
        return isGameProcessRunning();
    }

    @IpcHandle("game:repair")
    async repairGame(event: IpcMainInvokeEvent) {
        await assertCanInstallOrPatch();
        await assertGameIsNotRunning();

        try {
            return await repairGameFiles((progress) => {
                event.sender.send("installer:progress", progress);
            });
        } catch (error) {
            if (error instanceof PatchTaskCanceledError) {
                event.sender.send("installer:progress", {
                    step: "failed",
                    label: "Repair canceled",
                    percent: 100
                });
                return;
            }

            throw error;
        }
    }

    @IpcHandle("game:uninstall")
    async uninstallGame(event: IpcMainInvokeEvent) {
        await assertGameIsNotRunning();

        event.sender.send("installer:progress", {
            step: "uninstalling-game",
            label: "Uninstalling...",
            percent: 100
        });

        const exitCode = await runGameUninstaller();
        const installPath = await getGameInstallPath();

        if (exitCode !== 0 || installPath) {
            event.sender.send("installer:progress", {
                step: "failed",
                label: "Uninstall canceled",
                percent: 100
            });
            return;
        }

        event.sender.send("installer:progress", {
            step: "complete",
            label: "Game uninstalled",
            percent: 100
        });
    }

    @IpcHandle("installer:download-game")
    async downloadGame(event: IpcMainInvokeEvent) {
        await assertCanInstallOrPatch();

        return downloadGameInstaller((progress) => {
            event.sender.send("installer:progress", progress);
        });
    }

    @IpcHandle("installer:execute-installer")
    async runGameInstaller(event: IpcMainInvokeEvent, installerPath: string) {
        event.sender.send("installer:progress", {
            step: "running-installer",
            label: "Waiting for installer",
            percent: 100
        });

        const exitCode = await runInstaller(installerPath);
        const installPath = await getGameInstallPath();

        if (exitCode !== 0 || !installPath) {
            event.sender.send("installer:progress", {
                step: "failed",
                label: `The installation was canceled`,
                percent: 100
            });
            return;
        }

        await assertCanInstallOrPatch();

        try {
            return await applyLatestPatch((progress) => {
                event.sender.send("installer:progress", progress);
            });
        } catch (error) {
            if (error instanceof PatchTaskCanceledError) {
                event.sender.send("installer:progress", {
                    step: "failed",
                    label: "Patch canceled",
                    percent: 100
                });
                return;
            }

            throw error;
        }
    }

    @IpcHandle("patch:get-version-info")
    getVersionInfo() {
        return getPatchVersionInfo();
    }

    @IpcHandle("patch:apply-latest")
    async applyLatestGamePatch(event: IpcMainInvokeEvent) {
        await assertCanInstallOrPatch();
        await assertGameIsNotRunning();

        try {
            return await applyLatestPatch((progress) => {
                event.sender.send("installer:progress", progress);
            });
        } catch (error) {
            if (error instanceof PatchTaskCanceledError) {
                event.sender.send("installer:progress", {
                    step: "failed",
                    label: "Patch canceled",
                    percent: 100
                });
                return;
            }

            throw error;
        }
    }

    @IpcHandle("patch:pause")
    pausePatch() {
        patchTaskController.pause();
    }

    @IpcHandle("patch:resume")
    resumePatch() {
        patchTaskController.resume();
    }

    @IpcHandle("patch:cancel")
    cancelPatch() {
        patchTaskController.cancel();
    }
}
