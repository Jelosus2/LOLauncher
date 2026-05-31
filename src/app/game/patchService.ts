import type { PatchVersionInfo, PatchApplyResult, PatchListEntry } from "../../shared/patch.js";
import type { LauncherTaskProgress } from "../../shared/installer.js";

import { getRegistryGameVersion, getRegistryGameInstallPath, setRegistryGameVersion } from "./gameRegistry.js";
import { assertAvailableStorage, formatBytes, InsufficientStorageError } from "../storage/storageService.js";
import { patchTaskController, PatchTaskCanceledError } from "./patchTaskController.js";
import { getPatchDirPath } from "../shared/paths.js";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { Worker } from "node:worker_threads";
import fsp from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";

type ProgressCallback = (progress: LauncherTaskProgress) => void;

const patchBaseUrl = "https://laotw-cdn.pmang.jp/vfun/patchurl/live/";

export async function getPatchVersionInfo(): Promise<PatchVersionInfo> {
    const remoteVersionInfo = await getRemotePatchVersionInfo();
    const installedVersion = await getInstalledGameVersion();

    return {
        ...remoteVersionInfo,
        installedVersion,
        needsPatch: installedVersion === null || installedVersion < remoteVersionInfo.currentVersion,
        isBelowMinimum: installedVersion !== null && installedVersion < remoteVersionInfo.minimumVersion
    };
}

export async function applyLatestPatch(onProgress: ProgressCallback): Promise<PatchApplyResult> {
    const abortSignal = patchTaskController.start();

    try {
        return await applyLatestPatchInternal(onProgress, abortSignal);
    } catch (error) {
        if (abortSignal.aborted)
            throw new PatchTaskCanceledError();

        throw error;
    } finally {
        patchTaskController.finish();
    }
}

async function applyLatestPatchInternal(onProgress: ProgressCallback, abortSignal: AbortSignal): Promise<PatchApplyResult> {
    const version = await getPatchVersionInfo();

    if (!version.needsPatch) {
        emitProgress(onProgress, "complete", "Game is already up to date", 100);
        return {
            fromVersion: version.installedVersion,
            toVersion: version.currentVersion,
            appliedFiles: 0
        };
    }

    const installPath = await getRegistryGameInstallPath();
    if (!installPath)
        throw new Error("Cannot patch game because the install path was not found.");

    const patchVersion = version.currentVersion;
    const entries = await getPatchList(patchVersion);

    if (entries.length === 0)
        throw new Error(`Patch ${patchVersion} does not contain any files.`);

    const patchDir = getPatchDirPath(patchVersion);
    await fsp.mkdir(patchDir, { recursive: true });

    await assertPatchStorage(patchDir, entries);

    const totalDownloadBytes  = entries.reduce((total, entry) => total + entry.compressedSize, 0);
    const downloadedArchivePaths: string[] = [];

    let downloadedBytes  = 0;

    try {
        emitProgress(onProgress, "patching-game", "Downloading patch files…", 0, 0, totalDownloadBytes);

        for (let i = 0; i < entries.length; i += 1) {
            const entry = entries[i];
            const fileNumber = `${i + 1}/${entries.length}`;

            const archivePath = path.join(patchDir, entry.archiveName);
            const archiveUrl = new URL(`${patchVersion}/${entry.archiveName}`, patchBaseUrl).toString();

            downloadedArchivePaths.push(archivePath);

            await downloadPatchArchive(
                archiveUrl,
                archivePath,
                entry,
                `Downloading patch file ${fileNumber}`,
                abortSignal,
                (bytes) => {
                    downloadedBytes += bytes;
                    emitByteProgress(onProgress, `Downloading patch files...`, downloadedBytes, totalDownloadBytes);
                }
            );
        }

        const applyResult = await extractPatchArchivesWithPool({
            entries,
            patchDir,
            installPath,
            concurrency: 2,
            abortSignal,
            onProgress
        });

        await setRegistryGameVersion(patchVersion);
        await cleanupPatchArchives(downloadedArchivePaths);

        emitProgress(
            onProgress,
            "complete",
            `Game patched successfully - ${applyResult.replacedCount} updated,
            ${applyResult.skippedCount} unchanged`,
            100
        );

        return {
            fromVersion: version.installedVersion,
            toVersion: patchVersion,
            appliedFiles: entries.length
        };
    } catch (error) {
        if (abortSignal.aborted || error instanceof PatchTaskCanceledError)
            throw error;

        await cleanupPatchArchives(downloadedArchivePaths);
        throw error;
    }
}

async function getRemotePatchVersionInfo() {
    const versionInfoUrl = new URL("patchVersionInfo.txt", patchBaseUrl).toString()

    const response = await fetch(versionInfoUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.134 Safari/537.36 Chrome"
        }
    });

    if (!response.ok)
        throw new Error(`Patch version info request failed: HTTP ${response.status}`);

    const text = await response.text();
    return parsePatchVersionInfo(text);
}

export async function getInstalledGameVersion() {
    const rawVersion = await getRegistryGameVersion();
    if (!rawVersion)
        return null;

    const version = parseRegistryVersion(rawVersion);
    return Number.isFinite(version) ? version : null;
}

function parseRegistryVersion(rawVersion: string) {
    const value = rawVersion.trim();

    if (value.toLowerCase().startsWith("0x"))
        return Number.parseInt(value, 16);

    return Number.parseInt(value, 10);
}

function parsePatchVersionInfo(text: string) {
    const userOpenBlock = getBlockLines(text, "useropen");
    if (userOpenBlock.length < 2)
        throw new Error("Patch version info missing useropen version values.");

    const minimumVersion = Number.parseInt(userOpenBlock[0], 10);
    const currentVersion = Number.parseInt(userOpenBlock[1], 10);

    if (!Number.isFinite(minimumVersion) || !Number.isFinite(currentVersion))
        throw new Error("Patch version info contains invalid version values.");

    return {
        minimumVersion,
        currentVersion
    };
}

function getBlockLines(text: string, blockName: string) {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const startIndex = lines.findIndex((line) => line.toLowerCase() === `[${blockName.toLowerCase()}]`);
    if (startIndex === -1)
        return [];

    const values: string[] = [];

    for (let i = startIndex + 1; i < lines.length; i += 1) {
        const line = lines[i];

        if (line.startsWith("[") && line.endsWith("]"))
            break;

        values.push(line);
    }

    return values;
}

async function getPatchList(patchVersion: number): Promise<PatchListEntry[]> {
    const listUrl = new URL(`${patchVersion}/${patchVersion}.lst`, patchBaseUrl).toString();

    const response = await fetch(listUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.134 Safari/537.36 Chrome"
        }
    });

    if (!response.ok)
        throw new Error(`Patch list request failed: HTTP ${response.status}`);

    const text = await response.text();
    return parsePatchList(text, patchVersion);
}

function parsePatchList(text: string, patchVersion: number): PatchListEntry[] {
    return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => {
            const columns = line.split("\t");
            if (columns.length < 5)
                throw new Error(`Invalid patch list row ${index + 1}.`);

            const compressedSize = Number.parseInt(columns[2], 10);
            const metadataSize = Number.parseInt(columns[3], 10);

            if (!Number.isFinite(compressedSize))
                throw new Error(`Invalid patch size values on row ${index + 1}.`);

            return {
                patchVersion,
                archiveName: columns[0],
                relativeOutputPath: columns[1],
                compressedSize,
                metadataSize,
                metadata: columns[4]
            };
        });
}

async function assertPatchStorage(patchDir: string, entries: PatchListEntry[]) {
    const patchSafetyBufferBytes = 100 * 1024 * 1024; // 100mb
    const compressedBytes = entries.reduce((total, entry) => total + entry.compressedSize, 0);

    try {
        await assertAvailableStorage(patchDir, compressedBytes + patchSafetyBufferBytes);
    } catch (error) {
        if (error instanceof InsufficientStorageError) {
            throw new Error(
                `Not enough storage to download patch files. Required ${formatBytes(error.result.requiredBytes)}, available ${formatBytes(error.result.availableBytes)}.`
            );
        }

        throw error;
    }
}

function resolvePatchOutputPath(installPath: string, relativeOutputPath: string) {
    const root = path.resolve(installPath);
    const outputPath = path.resolve(root, relativeOutputPath);

    if (!outputPath.startsWith(root + path.sep))
        throw new Error(`Unsafe patch output path: ${relativeOutputPath}`);

    return outputPath;
}

async function downloadPatchArchive(
    url: string,
    outputPath: string,
    entry: PatchListEntry,
    label: string,
    abortSignal: AbortSignal,
    onBytes: (bytes: number) => void
) {
    await patchTaskController.checkpoint();

    if (await hasExpectedFileSize(outputPath, entry.compressedSize)) {
        await patchTaskController.checkpoint();
        onBytes(entry.compressedSize);
        return;
    }

    await fsp.rm(outputPath, { force: true });

    const response = await fetch(url, {
        signal: abortSignal,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.134 Safari/537.36 Chrome"
        }
    });

    if (!response.ok || !response.body)
        throw new Error(`${label} failed: HTTP ${response.status}`);

    const progressStream = new TransformStream<Uint8Array, Uint8Array>({
        async transform(chunk, controller) {
            await patchTaskController.checkpoint();

            onBytes(chunk.byteLength);
            controller.enqueue(chunk);
        }
    });

    const readable = Readable.fromWeb(response.body.pipeThrough(progressStream));
    const writeable = fs.createWriteStream(outputPath);

    await pipeline(readable, writeable);

    if (!(await hasExpectedFileSize(outputPath, entry.compressedSize)))
        throw new Error(`Patch archive size mismatch for ${entry.archiveName}.`);
}

async function extractPatchArchivesWithPool(options: {
    entries: PatchListEntry[];
    patchDir: string;
    installPath: string;
    concurrency: number;
    abortSignal: AbortSignal;
    onProgress: ProgressCallback;
}) {
    const { entries, patchDir, installPath, concurrency, abortSignal, onProgress } = options;

    let nextIndex = 0;
    let completedCount = 0;
    let replacedCount = 0;
    let skippedCount = 0;

    emitApplyProgress(onProgress, "Applying patch files", completedCount, entries.length);

    async function workerLoop() {
        while (true) {
            await patchTaskController.checkpoint();

            const index = nextIndex;
            nextIndex += 1;

            if (index >= entries.length)
                return;

            const entry = entries[index];
            const fileNumber = `${index + 1}/${entries.length}`;
            const archivePath = path.join(patchDir, entry.archiveName);
            const outputPath = resolvePatchOutputPath(installPath, entry.relativeOutputPath);

            const replaced = await extractPatchArchiveInWorker(archivePath, outputPath, `Applying patch file ${fileNumber}`, abortSignal);

            if (replaced)
                replacedCount += 1;
            else
                skippedCount += 1;

            completedCount += 1;

            emitApplyProgress(
                onProgress,
                `Applying patch files ${completedCount}/${entries.length} - ${replacedCount} updated, ${skippedCount} unchanged`,
                completedCount,
                entries.length
            );
        }
    }

    const workerCount = Math.min(concurrency, entries.length);
    await Promise.all(Array.from({ length: workerCount }, () => workerLoop()));

    return {
        replacedCount,
        skippedCount
    };
}

function extractPatchArchiveInWorker(archivePath: string, outputPath: string, label: string, abortSignal: AbortSignal) {
    return new Promise<boolean>((resolve, reject) => {
        const worker = new Worker(new URL("./patchExtractWorker.js", import.meta.url), {
            workerData: {
                archivePath,
                outputPath
            }
        });

        let settled = false;

        const abort = async () => {
            if (settled)
                return;

            settled = true;
            await worker.terminate();
            reject(new PatchTaskCanceledError());
        };

        if (abortSignal.aborted) {
            void abort();
            return;
        }

        abortSignal.addEventListener("abort", abort, { once: true });

        worker.on("message", (message: { type: string; message?: string; replaced?: boolean }) => {
            if (message.type === "done" && !settled) {
                settled = true;
                abortSignal.removeEventListener("abort", abort);
                resolve(message.replaced ?? true);
                return;
            }

            if (message.type === "error" && !settled) {
                settled = true;
                abortSignal.removeEventListener("abort", abort);
                reject(new Error(`${label} failed: ${message.message ?? "Unknown worker error"}`));
            }
        });

        worker.on("error", (error) => {
            if (settled)
                return;

            settled = true;
            abortSignal.removeEventListener("abort", abort);
            reject(error);
        });

        worker.on("exit", (code) => {
            if (settled)
                return;

            settled = true;
            abortSignal.removeEventListener("abort", abort);

            if (code === 0)
                resolve(true);
            else
                reject(new Error(`${label} worker exited with code ${code}.`));
        });
    });
}

async function cleanupPatchArchives(archivePaths: string[]) {
    await Promise.all(archivePaths.map((archivePath) => fsp.rm(archivePath, { force: true }).catch(() => {})));
}

async function hasExpectedFileSize(filePath: string, expectedSize: number) {
    try {
        const stat = await fsp.stat(filePath);
        return stat.size === expectedSize;
    } catch {
        return false;
    }
}

function emitByteProgress(callback: ProgressCallback, label: string, completedBytes: number, totalBytes: number) {
    emitProgress(
        callback,
        "patching-game",
        label,
        Math.round((completedBytes / totalBytes) * 100),
        completedBytes,
        totalBytes
    );
}

function emitApplyProgress(callback: ProgressCallback, label: string, appliedCount: number, totalCount: number) {
    emitProgress(
        callback,
        "patching-game",
        label,
        Math.round((appliedCount / totalCount) * 100)
    );
}

function emitProgress(
    callback: ProgressCallback,
    step: LauncherTaskProgress["step"],
    label: string,
    percent: number,
    completedBytes?: number,
    totalBytes?: number
) {
    callback({
        step,
        label,
        percent: Math.max(0, Math.min(100, percent)),
        completedBytes,
        totalBytes,
        isPausable: step === "patching-game",
        isPaused: patchTaskController.isPaused(),
        isCancelable: step === "patching-game"
    });
}
