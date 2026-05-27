import type { GameNewsItem } from "./news.js";

export type LauncherApi = {
    getLauncherVersion: () => Promise<string>;
    getGameNews: () => Promise<GameNewsItem[]>;
    minimizeWindow: () => Promise<void>;
    closeWindow: () => Promise<void>;
};
