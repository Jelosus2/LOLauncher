import { defaultLauncherSettings, type LauncherSettings } from "../../shared/settings.js";
import { getSettingsPath } from "../shared/paths.js";
import fs from "node:fs/promises";
import path from "node:path";

const settingsPath = getSettingsPath();
let cachedSettings: LauncherSettings | null = null;

export async function getSettings(): Promise<LauncherSettings> {
    if (cachedSettings) return cachedSettings;

    try {
        const raw = await fs.readFile(settingsPath, "utf-8");
        const parsed = JSON.parse(raw) as Partial<LauncherSettings>;

        cachedSettings = {
            ...defaultLauncherSettings,
            ...parsed
        };
    } catch {
        cachedSettings = { ...defaultLauncherSettings };
    }

    return cachedSettings;
}

export async function updateSettings(patch: Partial<LauncherSettings>): Promise<LauncherSettings> {
    const current = await getSettings();

    cachedSettings = {
        ...current,
        ...patch
    };

    await fs.mkdir(path.dirname(settingsPath), { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify(cachedSettings, null, 2), "utf-8");

    return cachedSettings;
}
