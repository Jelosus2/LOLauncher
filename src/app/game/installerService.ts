import type { InstallerManifest, LauncherTaskProgress } from "../../shared/installer.js";

import { assertAvailableStorage, formatBytes, InsufficientStorageError } from "../storage/storageService.js";
import { getInstallerDirPath } from "../shared/paths.js";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { spawn } from "node:child_process";
import fsp from "node:fs/promises";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

type ProgressCallback = (progress: LauncherTaskProgress) => void;

const manifestUrl = "https://laotw-cdn.pmang.jp/vfun/fullclient/live/file.json";

export async function downloadGameInstaller(onProgress: ProgressCallback) {
    const manifest = await fetchManifest();
    const setupFile = manifest.FileList[0];

    if (!setupFile)
        throw new Error("Installer manifest does not contain setup files.");

    const outputDir = getInstallerDirPath(manifest.Version);
    const outputPath = path.join(outputDir, setupFile.Name);
    const downloadUrl = new URL(setupFile.Name, manifest.URL).toString();

    await fsp.mkdir(outputDir, { recursive: true });

    if (await hasValidChecksum(outputPath, setupFile.CheckSum)) {
        emitProgress(onProgress, "complete", "Setup file ready", 100);
        return outputPath;
    }

    const downloadSafetyBufferBytes = 100 * 1024 * 1024; // 100mb
    const requiredBytes = setupFile.Size + downloadSafetyBufferBytes;

    try {
        await assertAvailableStorage(outputDir, requiredBytes);
    } catch (error) {
        if (error instanceof InsufficientStorageError) {
            throw new Error(
                `Not enough storage to download installer. Required ${formatBytes(error.result.requiredBytes)}, available ${formatBytes(error.result.availableBytes)}.`
            );
        }

        throw error;
    }

    await downloadFile(downloadUrl, outputPath, setupFile.Name, setupFile.Size, onProgress);
    emitProgress(onProgress, "verifying-installer", "Verifying setup file", 100);

    if (!(await hasValidChecksum(outputPath, setupFile.CheckSum))) {
        await fsp.rm(outputPath, { force: true });
        emitProgress(onProgress, "failed", "Setup verification failed", 100);
        throw new Error("Downloaded installer checksum did not match manifest.");
    }

    emitProgress(onProgress, "complete", "Setup file ready", 100);
    return outputPath;
}

async function fetchManifest() {
    const response = await fetch(manifestUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.134 Safari/537.36 Chrome"
        }
    });
    if (!response.ok)
        throw new Error(`Installer manifest request failed: ${response.status}`);

    return await response.json() as InstallerManifest;
}

async function hasValidChecksum(filePath: string, expectedChecksum: string) {
    try {
        const actual = await getMd5(filePath);
        return actual.toUpperCase() === expectedChecksum.toUpperCase();
    } catch {
        return false;
    }
}

async function getMd5(filePath: string) {
    const hash = crypto.createHash("md5");
    const stream = fs.createReadStream(filePath);

    for await (const chunk of stream) {
        hash.update(chunk);
    }

    return hash.digest("hex");
}

async function downloadFile(url: string, outputPath: string, fileName: string, totalBytes: number, onProgress: ProgressCallback) {
    const response = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.134 Safari/537.36 Chrome"
        }
    });
    if (!response.ok || !response.body)
        throw new Error(`Installer download failed: ${response.status}`);

    let downloadedBytes = 0;

    const progressStream = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
            downloadedBytes += chunk.byteLength;

            emitProgress(
                onProgress,
                "downloading-installer",
                `Downloading ${fileName}`,
                Math.round((downloadedBytes / totalBytes) * 100)
            );

            controller.enqueue(chunk);
        }
    });

    const readable = Readable.fromWeb(response.body.pipeThrough(progressStream));
    const writeable = fs.createWriteStream(outputPath);

    await pipeline(readable, writeable);
}

function emitProgress(callback: ProgressCallback, step: LauncherTaskProgress["step"], label: string, percent: number) {
    callback({
        step,
        label,
        percent: Math.max(0, Math.min(100, percent))
    });
}

export function runInstaller(installerPath: string) {
    return new Promise<number>((resolve, reject) => {
        const child = spawn(
            "powershell.exe",
            [
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                [
                    "$process = Start-Process",
                    "-FilePath", quotePowerShellString(installerPath),
                    "-Verb", "RunAs",
                    "-Wait",
                    "-PassThru;",
                    "exit $process.ExitCode"
                ].join(" ")
            ],
            {
                windowsHide: true,
                stdio: "ignore"
            }
        );

        child.on("error", reject);

        child.on("exit", (code) => {
            resolve(code ?? -1);
        });
    });
}

function quotePowerShellString(value: string) {
    return `'${value.replaceAll("'", "''")}'`;
}
