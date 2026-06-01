import { parentPort } from "node:worker_threads";
import { pipeline } from "node:stream/promises";
import lzma from "lzma-native";
import fsp from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

type ExtractJob = {
    type: "extract";
    jobId: number;
    archivePath: string;
    outputPath: string;
};

if (!parentPort)
    throw new Error("Patch extract worker must run inside a worker thread.");

parentPort.on("message", (message: ExtractJob) => {
    if (message.type !== "extract")
        return;

    void handleExtractJob(message);
});

async function handleExtractJob(job: ExtractJob) {
    try {
        const replaced = await extractPatchArchive(job.archivePath, job.outputPath);

        parentPort?.postMessage({
            type: "done",
            jobId: job.jobId,
            replaced
        });
    } catch (error) {
        parentPort?.postMessage({
            type: "error",
            jobId: job.jobId,
            message: error instanceof Error ? error.message : String(error)
        });
    }
}

async function extractPatchArchive(archivePath: string, outputPath: string) {
    const tempPath = `${outputPath}.patching`;

    await fsp.mkdir(path.dirname(outputPath), { recursive: true });
    await fsp.rm(tempPath, { force: true });

    try {
        await pipeline(fs.createReadStream(archivePath), lzma.createDecompressor(), fs.createWriteStream(tempPath));

        if (await filesAreEqual(tempPath, outputPath)) {
            await fsp.rm(tempPath, { force: true });
            return false;
        }

        await fsp.rm(outputPath, { force: true });
        await fsp.rename(tempPath, outputPath);

        return true;
    } catch (error) {
        await fsp.rm(tempPath, { force: true }).catch(() => {});
        throw error;
    }
}

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
