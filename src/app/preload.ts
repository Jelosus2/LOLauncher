import type { LauncherUpdateProgress } from "../shared/launcherUpdate.js";
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
    repairGame: () => ipcRenderer.invoke("game:repair"),
    uninstallGame: () => ipcRenderer.invoke("game:uninstall"),
    isGameProcessRunning: () => ipcRenderer.invoke("game:is-running"),
    loginWithSns: (request) => ipcRenderer.invoke("auth:login-sns", request),
    loginWithVfunId: (request) => ipcRenderer.invoke("auth:login-vfun", request),
    verifyVfunOtp: (request) => ipcRenderer.invoke("auth:verify-vfun-otp", request),
    getAuthSession: () => ipcRenderer.invoke("auth:get-session"),
    logout: () => ipcRenderer.invoke("auth:logout"),
    launchGame: (request) => ipcRenderer.invoke("game:launch", request),
    checkLauncherUpdate: () => ipcRenderer.invoke("launcher:check-update"),
    startLauncherUpdate: (mandatory) => ipcRenderer.invoke("launcher:start-update", mandatory),
    onLauncherUpdateProgress: (callback) => {
        const listener = (_event: Electron.IpcRendererEvent, progress: LauncherUpdateProgress) => {
            callback(progress);
        };

        ipcRenderer.on("launcher-update:progress", listener);

        return () => {
            ipcRenderer.removeListener("launcher-update:progress", listener);
        };
    },
    onTrayStartGame: (callback) => {
        const listener = () => {
            callback();
        };

        ipcRenderer.on("tray:start-game", listener);

        return () => {
            ipcRenderer.removeListener("tray:start-game", listener);
        };
    },
    onProtocolLaunchGame: (callback) => {
        const listener = (_event: Electron.IpcRendererEvent, request: unknown) => {
            callback(request as Parameters<typeof callback>[0]);
        };

        ipcRenderer.on("protocol:launch-game", listener);

        return () => {
            ipcRenderer.removeListener("protocol:launch-game", listener);
        };
    },
    consumeProtocolLaunchGameRequest: () => ipcRenderer.invoke("protocol:consume-launch-game-request"),
    reportProtocolLaunchResult: (request, result) => ipcRenderer.invoke("protocol:report-launch-result", request, result),
    showWindow: () => ipcRenderer.invoke("window:show"),
    minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
    closeWindow: () => ipcRenderer.invoke("window:close")
} as const;

contextBridge.exposeInMainWorld("app", launcherApi);
