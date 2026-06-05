import { app, BrowserWindow, Menu, Tray } from "electron";
import { getAppIcon } from "../shared/assets.js";

let tray: Tray | null = null;
let isQuitting = false;

export function markAppAsQuitting() {
    isQuitting = true;
}

export function shouldQuitApp() {
    return isQuitting;
}

export function createOrShowTray(mainWindow: BrowserWindow) {
    if (tray) return tray;

    tray = new Tray(getAppIcon());
    tray.setToolTip("LOLauncher");

    tray.setContextMenu(Menu.buildFromTemplate([
        {
            label: "Show launcher",
            click: () => {
                mainWindow.show();
                mainWindow.focus();
            }
        },
        {
            type: "separator"
        },
        {
            label: "Quit",
            click: () => {
                markAppAsQuitting();
                app.quit();
            }
        }
    ]));

    tray.on("double-click", () => {
        mainWindow.show();
        mainWindow.focus();
    });

    return tray;
}
