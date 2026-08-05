import type { MainWindowOptions } from "../windows/mainWindow.js";

import { captureProtocolLaunchGameRequest, dispatchProtocolLaunchGameRequest, registerLauncherProtocol } from "./protocolManager.js";
import { getSettings } from "../config/settingsService.js";
import { applyStartupSetting } from "./startupService.js";
import { markAppAsQuitting } from "./trayManager.js";
import { app, BrowserWindow, Menu } from "electron";

export type WindowFactory = (options?: MainWindowOptions) => Promise<BrowserWindow>;

let mainWindow: BrowserWindow | null = null;

export function registerAppLifecycle(createMainWindow: WindowFactory) {
    registerLauncherProtocol();
    const openedWithProtocolLaunchGame = captureProtocolLaunchGameRequest();

    const hasSingleInstanceLock = app.requestSingleInstanceLock();
    if (!hasSingleInstanceLock) {
        app.quit();
        return;
    }

    app.on("second-instance", (_event, argv) => {
        if (captureProtocolLaunchGameRequest(argv)) {
            dispatchProtocolLaunchGameRequest(mainWindow);
            return;
        }

        showMainWindow();
    });

    app.whenReady().then(async () => {
        if (app.isPackaged)
            Menu.setApplicationMenu(null);

        const settings = await getSettings();
        applyStartupSetting(settings.startOnSystemStartup);

        mainWindow = await createMainWindow({
            showOnReady: !openedWithProtocolLaunchGame
        });

        app.on("activate", async () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                mainWindow = await createMainWindow();
                return;
            }

            showMainWindow();
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

function showMainWindow() {
    const window = mainWindow ?? BrowserWindow.getAllWindows()[0];

    if (!window || window.isDestroyed())
        return;

    if (window.isMinimized())
        window.restore();

    window.show();
    app.focus({ steal: true });
    window.focus();
}
