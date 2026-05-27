import { fileURLToPath } from "node:url";
import path from "node:path";

const appMainDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function getPreloadPath() {
    return path.join(appMainDir, "preload.js");
}

export function getRendererHtmlPath() {
    return path.join(appMainDir, "..", "index.html");
}
