export type PatchVersionInfo = {
    minimumVersion: number;
    currentVersion: number;
    installedVersion: number | null;
    needsPatch: boolean;
    isBelowMinimum: boolean;
};

export type PatchListEntry = {
    patchVersion: number;
    archiveName: string;
    relativeOutputPath: string;
    compressedSize: number;
    metadataSize: number;
    metadata: string;
};

export type PatchApplyResult = {
    fromVersion: number | null;
    toVersion: number;
    appliedFiles: number;
};
