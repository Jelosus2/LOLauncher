import type { LauncherSettings } from "./settings.js";
import type { LogPayload } from "./logging.js";
import type { GameNewsItem } from "./news.js";

export type OpenPathResult = {
    success: boolean;
    error?: string;
};

export type LauncherApi = {
    getLauncherVersion: () => Promise<string>;
    getGameNews: () => Promise<GameNewsItem[]>;
    openExternalUrl: (url: string) => Promise<void>;
    getSettings: () => Promise<LauncherSettings>;
    updateSettings: (settings: Partial<LauncherSettings>) => Promise<LauncherSettings>;
    getGameInstallPath: () => Promise<string | null>;
    openGameInstallFolder: () => Promise<OpenPathResult>;
    logMessage: (payload: LogPayload) => Promise<void>;
    minimizeWindow: () => Promise<void>;
    closeWindow: () => Promise<void>;
};
