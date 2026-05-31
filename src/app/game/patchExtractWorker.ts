import { parentPort, workerData } from "node:worker_threads";
import { pipeline } from "node:stream/promises";
import lzma from "lzma-native";
import fsp from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

type ExtractWorkerData = {
    archivePath: string;
    outputPath: string;
};

const { archivePath, outputPath } = workerData as ExtractWorkerData;

async function extractPathArchive() {
    const tempPath = `${outputPath}.patching`;

    await fsp.mkdir(path.dirname(outputPath), { recursive: true });
    await fsp.rm(tempPath, { force: true });

    const readable = fs.createReadStream(archivePath);
    const writeable = fs.createWriteStream(tempPath);

    await pipeline(readable, lzma.createDecompressor(), writeable);

    if (await filesAreEqual(tempPath, outputPath)) {
        await fsp.rm(tempPath, { force: true });

        parentPort?.postMessage({ type: "done", replaced: false });
        return;
    }

    await fsp.rm(outputPath, { force: true });
    await fsp.rename(tempPath, outputPath);

    parentPort?.postMessage({ type: "done", replaced: true });
}

extractPathArchive().catch(async (error) => {
    await fsp.rm(`${outputPath}.patching`, { force: true }).catch(() => {});

    parentPort?.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : String(error)
    });
});

async function filesAreEqual(leftPath: string, rightPath: string) {
    const [leftStat, rightStat] = await Promise.all([
        getFileStat(leftPath),
        getFileStat(rightPath)
    ]);

    if (!leftStat || !rightStat)
        return false;
    if (leftStat.size !== rightStat.size)
        return false;

    const [leftHash, rightHash] = await Promise.all([
        getFileHash(leftPath),
        getFileHash(rightPath)
    ]);

    return leftHash === rightHash;
}

async function getFileStat(filePath: string) {
    try {
        return await fsp.stat(filePath);
    } catch {
        return null;
    }
}

async function getFileHash(filePath: string) {
    const hash = crypto.createHash("sha1");
    const stream = fs.createReadStream(filePath);

    for await (const chunk of stream) {
        hash.update(chunk);
    }

    return hash.digest("hex");
}
