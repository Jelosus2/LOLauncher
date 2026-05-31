import type { LauncherTaskProgress } from "../shared/installer.js";
import type { LauncherApi } from "../shared/launcherApi.js";

import { contextBridge, ipcRenderer } from "electron";

const launcherApi: LauncherApi = {
    getLauncherVersion: () => ipcRenderer.invoke("launcher:get-version"),
    getGameNews: () => ipcRenderer.invoke("launcher:get-news"),
    openExternalUrl: (url) => ipcRenderer.invoke("launcher:open-external", url),
    getSettings: () => ipcRenderer.invoke("settings:get"),
    updateSettings: (settings) => ipcRenderer.invoke("settings:update", settings),
    getGameInstallPath: () => ipcRenderer.invoke("game:get-install-path"),
    openGameInstallFolder: () => ipcRenderer.invoke("game:open-install-folder"),
    logMessage: (payload) => ipcRenderer.invoke("diagnostics:log", payload),
    checkMaintenance: () => ipcRenderer.invoke("game:check-maintenance"),
    downloadGameInstaller: () => ipcRenderer.invoke("installer:download-game"),
    executeGameInstaller: (installerPath) => ipcRenderer.invoke("installer:execute-installer", installerPath),
    onInstallerProgress: (callback) => {
        const listener = (_event: Electron.IpcRendererEvent, progress: LauncherTaskProgress) => {
            callback(progress);
        };

        ipcRenderer.on("installer:progress", listener);

        return () => {
            ipcRenderer.removeListener("installer:progress", listener);
        };
    },
    getPatchVersionInfo: () => ipcRenderer.invoke("patch:get-version-info"),
    applyLatestGamePatch: () => ipcRenderer.invoke("patch:apply-latest"),
    getGameVersionInfo: () => ipcRenderer.invoke("game:get-version-info"),
    pausePatch: () => ipcRenderer.invoke("patch:pause"),
    resumePatch: () => ipcRenderer.invoke("patch:resume"),
    cancelPatch: () => ipcRenderer.invoke("patch:cancel"),
    minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
    closeWindow: () => ipcRenderer.invoke("window:close")
} as const;

contextBridge.exposeInMainWorld("app", launcherApi);
