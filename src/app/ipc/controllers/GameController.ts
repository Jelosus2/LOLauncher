import { getGameInstallPath } from "../../game/gameService.js";
import { IpcHandle } from "../ipcDecorators.js";
import { shell } from "electron";

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
}
