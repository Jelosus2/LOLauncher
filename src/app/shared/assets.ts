import { app, nativeImage } from "electron";
import path from "node:path";

export function getRuntimeAssetPath(...segments: string[]) {
    if (app.isPackaged)
        return path.join(process.resourcesPath, "assets", ...segments);

    return path.join(process.cwd(), "resources", ...segments);
}

export function getTrayIcon() {
    const iconPath = getRuntimeAssetPath("icons", "tray.ico");
    return nativeImage.createFromPath(iconPath);
}
