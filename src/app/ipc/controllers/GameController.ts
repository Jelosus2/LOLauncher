import { getPatchVersionInfo } from "../../game/patchService.js";
import { checkMaintenanceStatus, assertCanInstallOrPatch } from "../../game/maintenanceService.js";
import { downloadGameInstaller, runInstaller } from "../../game/installerService.js";
import { getGameInstallPath } from "../../game/gameService.js";
import { shell , type IpcMainInvokeEvent} from "electron";
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

        event.sender.send("installer:progress", {
            step: "complete",
            label: "Game installed successfully",
            percent: 100
        });
    }

    @IpcHandle("patch:get-version-info")
    getVersionInfo() {
        return getPatchVersionInfo();
    }
}
