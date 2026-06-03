import type { LauncherSettings } from "../../../shared/settings.js";
import type { IpcMainInvokeEvent } from "electron";

import { getSettings, updateSettings } from "../../config/settingsService.js";
import { applyStartupSetting } from "../../lifecycle/startupService.js";
import { IpcHandle } from "../ipcDecorators.js";

export class SettingsController {
    @IpcHandle("settings:get")
    getSettings() {
        return getSettings();
    }

    @IpcHandle("settings:update")
    async updateSettings(_event: IpcMainInvokeEvent, patch: Partial<LauncherSettings>) {
        const settings = await updateSettings(patch);

        if ("startOnSystemStartup" in patch)
            applyStartupSetting(settings.startOnSystemStartup);

        return settings;
    }
}
