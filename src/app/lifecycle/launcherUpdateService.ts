import type { LauncherUpdateCheckResult, LauncherUpdateMetadata, LauncherUpdateProgress } from "../../shared/launcherUpdate.js";

import { app, type WebContents } from "electron";
import electronUpdater from "electron-updater";

const { autoUpdater } = electronUpdater;

const localUpdateFeedUrl = process.env.LOLAUNCHER_UPDATE_FEED_URL;
const localUpdateMetadataUrl = process.env.LOLAUNCHER_UPDATE_METADATA_URL;
const updateMetadataUrl = localUpdateMetadataUrl ?? "https://github.com/Jelosus2/LOLauncher/releases/latest/download/launcher-update.json";

let isUpdating = false;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.disableWebInstaller = true;

if (localUpdateFeedUrl) {
    autoUpdater.setFeedURL({
        provider: "generic",
        url: localUpdateFeedUrl
    });
}

export async function checkLauncherUpdate(): Promise<LauncherUpdateCheckResult> {
    if (!app.isPackaged) {
        return {
            available: false,
            currentVersion: app.getVersion()
        };
    }

    const metadata = await fetchLauncherUpdateMedata();
    const currentVersion = app.getVersion();
    const hasUpdate = compareVersions(metadata.version, currentVersion) > 0;

    if (!hasUpdate) {
        return {
            available: false,
            currentVersion
        };
    }

    const isBelowMinimumSupportedVersion =
        !!metadata.minimumSupportedVersion &&
        compareVersions(currentVersion, metadata.minimumSupportedVersion) < 0;

    return {
        available: true,
        currentVersion,
        latestVersion: metadata.version,
        mandatory: metadata.mandatory || isBelowMinimumSupportedVersion
    };
}

export async function runLauncherUpdate(webContents: WebContents, mandatory: boolean) {
    if (isUpdating)
        return;

    isUpdating = true;

    try {
        sendProgress(webContents, {
            phase: "checking",
            label: "Checking launcher update..."
        });

        const result = await autoUpdater.checkForUpdates();

        if (!result?.updateInfo.version) {
            sendProgress(webContents, {
                phase: "failed",
                label: "No launcher update was found."
            });
            return;
        }

        autoUpdater.removeAllListeners("download-progress");
        autoUpdater.on("download-progress", (progress) => {
            sendProgress(webContents, {
                phase: "downloading",
                label: `Downloading launcher update... ${progress.percent.toFixed(0)}%`,
                percent: progress.percent
            });
        });

        await autoUpdater.downloadUpdate();

        sendProgress(webContents, {
            phase: "installing",
            label: "Installing launcher update...",
            percent: 100
        });

        setTimeout(() => {
            autoUpdater.quitAndInstall(false, true);
        }, 700);
    } catch {
        sendProgress(webContents, {
            phase: "failed",
            label: mandatory
                ? "Required launcher update failed."
                : "Launcher update failed."
        });
    } finally {
        isUpdating = false;
    }
}

async function fetchLauncherUpdateMedata(): Promise<LauncherUpdateMetadata> {
    const response = await fetch(updateMetadataUrl, {
        headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache"
        }
    });

    if (!response.ok)
        throw new Error(`Launcher update metadata failed: HTTP ${response.status}`);

    return response.json() as Promise<LauncherUpdateMetadata>;
}

function sendProgress(webContents: WebContents, progress: LauncherUpdateProgress) {
    if (!webContents.isDestroyed())
        webContents.send("launcher-update:progress", progress);
}

function compareVersions(left: string, right: string) {
    const leftParts = left.split(".").map(Number);
    const rightParts = right.split(".").map(Number);
    const length = Math.max(leftParts.length, rightParts.length);

    for (let i = 0; i < length; i += 1) {
        const leftPart = leftParts[i] ?? 0;
        const rightPart = rightParts[i] ?? 0;

        if (leftPart > rightPart) return 1;
        if (leftPart < rightPart) return -1;
    }

    return 0;
}
