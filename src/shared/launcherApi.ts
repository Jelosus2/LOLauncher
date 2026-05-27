import type { LauncherSettings } from "./settings.js";
import type { GameNewsItem } from "./news.js";

export type LauncherApi = {
    getLauncherVersion: () => Promise<string>;
    getGameNews: () => Promise<GameNewsItem[]>;
    getSettings: () => Promise<LauncherSettings>;
    updateSettings: (settings: Partial<LauncherSettings>) => Promise<LauncherSettings>;
    minimizeWindow: () => Promise<void>;
    closeWindow: () => Promise<void>;
};
