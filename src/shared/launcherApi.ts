import type { AuthSession, VfunCredentialLoginRequest, VfunLoginResult, VfunOtpVerifyRequest, SnsLoginRequest } from "./auth.js";
import type { LauncherUpdateCheckResult, LauncherUpdateProgress } from "./launcherUpdate.js";
import type { PatchVersionInfo, PatchApplyResult } from "./patch.js";
import type { LauncherTaskProgress } from "./installer.js";
import type { MaintenanceStatus } from "./maintenance.js";
import type { LauncherSettings } from "./settings.js";
import type { GameVersionInfo } from "./game.js";
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
    checkMaintenance: () => Promise<MaintenanceStatus>;
    downloadGameInstaller: () => Promise<string>;
    executeGameInstaller: (installerPath: string) => Promise<void>;
    onInstallerProgress: (callback: (progress: LauncherTaskProgress) => void) => () => void;
    getPatchVersionInfo: () => Promise<PatchVersionInfo>;
    applyLatestGamePatch: () => Promise<PatchApplyResult>;
    getGameVersionInfo: () => Promise<GameVersionInfo>;
    pausePatch: () => Promise<void>;
    resumePatch: () => Promise<void>;
    cancelPatch: () => Promise<void>;
    repairGame: () => Promise<PatchApplyResult>;
    uninstallGame: () => Promise<void>;
    isGameProcessRunning: () => Promise<boolean>;
    loginWithSns: (request: SnsLoginRequest) => Promise<VfunLoginResult>;
    loginWithVfunId: (request: VfunCredentialLoginRequest) => Promise<VfunLoginResult>;
    verifyVfunOtp: (request: VfunOtpVerifyRequest) => Promise<AuthSession>;
    getAuthSession: () => Promise<AuthSession | null>;
    logout: () => Promise<void>;
    launchGame: () => Promise<void>;
    checkLauncherUpdate: () => Promise<LauncherUpdateCheckResult>;
    startLauncherUpdate: (mandatory: boolean) => Promise<void>;
    onLauncherUpdateProgress: (callback: (progress: LauncherUpdateProgress) => void) => () => void;
    minimizeWindow: () => Promise<void>;
    closeWindow: () => Promise<void>;
};
