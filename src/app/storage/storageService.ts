import type { StorageCheckResult } from "../../shared/storage.js";

import fs from "node:fs/promises";
import path from "node:path";

export class InsufficientStorageError extends Error {
    constructor(public readonly result: StorageCheckResult) {
        super(`Not enough storage. Required ${result.requiredBytes} bytes, available ${result.availableBytes} bytes.`);
        this.name = "InsufficientStorageError";
    }
}

export async function checkAvailableStorage(targetPath: string, requiredBytes: number): Promise<StorageCheckResult> {
    const existingPath = await getExistingPath(targetPath);
    const stats = await fs.statfs(existingPath);

    const availableBytes = stats.bavail * stats.bsize;

    return {
        path: existingPath,
        requiredBytes,
        availableBytes,
        hasEnoughSpace: availableBytes >= requiredBytes
    };
}

export async function assertAvailableStorage(targetPath: string, requiredBytes: number) {
    const result = await checkAvailableStorage(targetPath, requiredBytes);
    if (!result.hasEnoughSpace)
        throw new InsufficientStorageError(result);

    return result;
}

export function formatBytes(bytes: number) {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }

    return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

async function getExistingPath(targetPath: string) {
    let currentPath = path.resolve(targetPath);

    while (true) {
        try {
            const stat = await fs.stat(currentPath);
            return stat.isDirectory() ? currentPath : path.dirname(currentPath);
        } catch {
            const parent = path.dirname(currentPath);
            if (parent === currentPath)
                throw new Error(`Unable to find existing parent directory for ${targetPath}`);

            currentPath = parent;
        }
    }
}
