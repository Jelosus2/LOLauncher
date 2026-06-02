import { fileURLToPath } from "node:url";
import { app } from "electron";
import path from "node:path";

const appMainDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function getPreloadPath() {
    return path.join(appMainDir, "preload.js");
}

export function getRendererHtmlPath() {
    return path.join(appMainDir, "..", "index.html");
}

export function getSettingsPath() {
    return path.join(app.getPath("userData"), "settings.json");
}

export function getLogPath() {
    const today = new Date().toISOString().slice(0, 10);
    return path.join(app.getPath("userData"), "logs", `launcher_${today}.log`);
}

export function getInstallerDirPath(version: string) {
    return path.join(app.getPath("userData"), "installers", version);
}

export function getPatchDirPath(version: number) {
    return path.join(app.getPath("userData"), "patches", String(version));
}

export function getAuthSessionPath() {
    return path.join(app.getPath("userData"), "auth-session.bin");
}
