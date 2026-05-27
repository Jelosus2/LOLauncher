import type { LauncherApi } from "../shared/launcherApi.js";

import { contextBridge, ipcRenderer } from "electron";

const launcherApi: LauncherApi = {
    getLauncherVersion: () => ipcRenderer.invoke("launcher:get-version"),
    getGameNews: () => ipcRenderer.invoke("launcher:get-news"),
    getSettings: () => ipcRenderer.invoke("settings:get"),
    updateSettings: (settings) => ipcRenderer.invoke("settings:update", settings),
    minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
    closeWindow: () => ipcRenderer.invoke("window:close")
} as const;

contextBridge.exposeInMainWorld("app", launcherApi);
