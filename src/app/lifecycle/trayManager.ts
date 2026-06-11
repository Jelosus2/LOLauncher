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

function showLauncherWindow(mainWindow: BrowserWindow) {
    if (mainWindow.isMinimized())
        mainWindow.restore();

    mainWindow.show();
    app.focus({ steal: true });
    mainWindow.focus();
}

function requestStartGame(mainWindow: BrowserWindow) {
    mainWindow.webContents.send("tray:start-game");
}

export function createOrShowTray(mainWindow: BrowserWindow) {
    if (tray) return tray;

    tray = new Tray(getAppIcon());
    tray.setToolTip("LOLauncher");

    tray.setContextMenu(Menu.buildFromTemplate([
        {
            label: "Show launcher",
            click: () => {
                showLauncherWindow(mainWindow);
            }
        },
        {
            label: "Start Game",
            click: () => {
                requestStartGame(mainWindow);
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
        showLauncherWindow(mainWindow);
    });

    return tray;
}
