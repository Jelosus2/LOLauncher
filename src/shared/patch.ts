export type PatchVersionInfo = {
    minimumVersion: number;
    currentVersion: number;
    installedVersion: number | null;
    needsPatch: boolean;
    isBelowMinimum: boolean;
};
