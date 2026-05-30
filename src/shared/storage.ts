export type StorageCheckResult = {
    path: string;
    requiredBytes: number;
    availableBytes: number;
    hasEnoughSpace: boolean;
};
