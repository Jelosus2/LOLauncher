import { app, BrowserWindow } from "electron";

import { appConfig } from "../config/appConfig.js";
import { getPreloadPath, getRendererHtmlPath } from "../shared/paths.js";

export async function createMainWindow() {
    const mainWindow = new BrowserWindow({
        title: appConfig.appName,
        autoHideMenuBar: true,
        width: appConfig.mainWindow.width,
        height: appConfig.mainWindow.height,
        minWidth: appConfig.mainWindow.minWidth,
        minHeight: appConfig.mainWindow.minHeight,
        backgroundColor: appConfig.mainWindow.backgroundColor,
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

    if (app.isPackaged)
        await mainWindow.loadFile(getRendererHtmlPath());
    else
        await mainWindow.loadURL(appConfig.renderer.devServerUrl);

    return mainWindow;
}
