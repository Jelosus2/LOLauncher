import type { LauncherSettings } from "../../../shared/settings.js";
import type { IpcMainInvokeEvent } from "electron";

import { getSettings, updateSettings } from "../../config/settingsService.js";
import { IpcHandle } from "../ipcDecorators.js";

export class SettingsController {
    @IpcHandle("settings:get")
    getSettings() {
        return getSettings();
    }

    @IpcHandle("settings:update")
    updateSettings(_event: IpcMainInvokeEvent, patch: Partial<LauncherSettings>) {
        return updateSettings(patch);
    }
}
