import { app } from "electron";

export function applyStartupSetting(enabled: boolean) {
    if (!app.isPackaged) {
        app.setLoginItemSettings({
            openAtLogin: false
        });
        return;
    }

    app.setLoginItemSettings({
        openAtLogin: enabled
    });
}
