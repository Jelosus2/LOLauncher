import { app, BrowserWindow } from "electron";
import path from "node:path";
import url from "node:url";

async function createWindow() {
    const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

    const mainWindow = new BrowserWindow({
        width: 1000,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
    });

    await mainWindow.loadURL("http://localhost:5173/");
}

app.whenReady().then(async () => {
    await createWindow();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0)
        createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        app.quit();
});
