export type InstallerManifest = {
    Version: string;
    URL: string;
    TotalCount: number;
    TotalSize: number;
    FileList: InstallerFile[];
}

export type InstallerFile = {
    Name: string;
    Size: number;
    CheckSum: string;
}

export type LauncherTaskStep =
    | "idle"
    | "downloading-installer"
    | "verifying-installer"
    | "running-installer"
    | "patching-game"
    | "complete"
    | "failed";

export type LauncherTaskProgress = {
    step: LauncherTaskStep;
    label: string;
    percent: number;
};
