import { getRegistryGameInstallPath } from "./gameRegistry.js";
import fs from "node:fs/promises";

export async function getGameInstallPath() {
    const installPath = await getRegistryGameInstallPath();
    if (!installPath) return null;

    try {
        const stat = await fs.stat(installPath);
        return stat.isDirectory() ? installPath : null;
    } catch {
        return null;
    }
}
