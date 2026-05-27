import { app, BrowserWindow } from "electron";

import { createOrShowTray, markAppAsQuitting, shouldQuitApp } from "../lifecycle/trayManager.js";
import { getPreloadPath, getRendererHtmlPath } from "../shared/paths.js";
import { getSettings } from "../config/settingsService.js";
import { appConfig } from "../config/appConfig.js";

export async function createMainWindow() {
    const mainWindow = new BrowserWindow({
        title: appConfig.appName,
        autoHideMenuBar: true,
        width: appConfig.mainWindow.width,
        height: appConfig.mainWindow.height,
        backgroundColor: appConfig.mainWindow.backgroundColor,
        resizable: false,
        maximizable: false,
        fullscreenable: false,
        frame: false,
        show: false,
        webPreferences: {
            preload: getPreloadPath(),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.once("ready-to-show", () => {
        mainWindow.show();
    });

    mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

    mainWindow.on("close", async (event) => {
        if (shouldQuitApp()) return;

        event.preventDefault();

        void handleMainWindowClose(mainWindow);
    });

    if (app.isPackaged)
        await mainWindow.loadFile(getRendererHtmlPath());
    else
        await mainWindow.loadURL(appConfig.renderer.devServerUrl);

    return mainWindow;
}

async function handleMainWindowClose(mainWindow: BrowserWindow) {
    const settings = await getSettings();

    if (settings.closeAction === "tray") {
        createOrShowTray(mainWindow);
        mainWindow.hide();
        return;
    }

    markAppAsQuitting();
    mainWindow.close();
}
