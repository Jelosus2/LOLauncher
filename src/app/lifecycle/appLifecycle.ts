import { getSettings } from "../config/settingsService.js";
import { applyStartupSetting } from "./startupService.js";
import { markAppAsQuitting } from "./trayManager.js";
import { app, BrowserWindow, Menu } from "electron";

export type WindowFactory = () => Promise<BrowserWindow>;

export function registerAppLifecycle(createMainWindow: WindowFactory) {
    app.whenReady().then(async () => {
        if (app.isPackaged)
            Menu.setApplicationMenu(null);

        const settings = await getSettings();
        applyStartupSetting(settings.startOnSystemStartup);

        await createMainWindow();

        app.on("activate", async () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                await createMainWindow();
            }
        });
    });

    app.on("before-quit", () => {
        markAppAsQuitting();
    });

    app.on("window-all-closed", () => {
        if (process.platform !== "darwin") {
            app.quit();
        }
    });
}
