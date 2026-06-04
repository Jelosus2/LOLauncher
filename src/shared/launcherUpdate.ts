export type LauncherUpdateMetadata = {
    version: string;
    mandatory: boolean;
    minimumSupportedVersion?: string;
};

export type LauncherUpdateCheckResult =
    | {
        available: false;
        currentVersion: string;
    }
    | {
        available: true;
        currentVersion: string;
        latestVersion: string;
        mandatory: boolean;
    };

export type LauncherUpdateProgress = {
    phase: "checking" | "downloading" | "installing" | "failed";
    label: string;
    percent?: number;
};
