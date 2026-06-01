import type { GameVersionInfo } from "../../shared/game.js";

import { getRegistryGameInstallPath, getRegistryGameFileName } from "./gameRegistry.js";
import { getInstalledGameVersion } from "./patchService.js";
import findProcess from "find-process";
import fs from "node:fs/promises";
import path from "node:path";

type FindProcessResult = {
    pid: number;
    ppid: number;
    bin: string;
    name: string;
    cmd: string;
};

export async function getGameInstallPath() {
    const installPath = await getRegistryGameInstallPath();
    if (!installPath) return null;

    try {
        const stat = await fs.stat(installPath);
        return stat.isDirectory() ? installPath : null;
    } catch {
        return null;
    }
}

export async function getGameVersionInfo(): Promise<GameVersionInfo> {
    const [installPath, patchVersion] = await Promise.all([
        getRegistryGameInstallPath(),
        getInstalledGameVersion()
    ]);

    if (!installPath) {
        return {
            gameVersion: null,
            patchVersion
        };
    }

    const gameVersion = await readGameVersion(installPath);

    return {
        gameVersion,
        patchVersion
    };
}

export async function isGameProcessRunning() {
    const processName = await getGameProcessName();

    if (!processName) {
        return false;
    }

    const processes = await findProcess("name", processName) as FindProcessResult[];
    return processes.length > 0;
}

export async function assertGameIsNotRunning() {
    const isGameRunning = await isGameProcessRunning();

    if (isGameRunning)
        throw new Error("Last Origin R+ is currently running. Close the game before updating or repairing.");
}

async function getGameProcessName() {
    const fileName = await getRegistryGameFileName();
    if (!fileName)
        return null;

    return path.basename(fileName).replace(/\.exe$/i, "");
}

async function readGameVersion(installPath: string) {
    const filePath = path.join(installPath, "LAST ORIGIN R+_Data", "globalgamemanagers");

    try {
        const buffer = await fs.readFile(filePath);
        return findFirstSemanticVersion(buffer);
    } catch {
        return null;
    }
}

function findFirstSemanticVersion(buffer: Buffer) {
    const cleanText = buffer
        .toString("latin1")
        .replace(/[^\x20-\x7E]/g, " ");

    const matches = cleanText.match(/\b\d+\.\d+\.\d+\b/g);
    if (!matches)
        return null;

    return (
        matches.find((version) => {
            const [major, minor, patch] = version.split(".").map(Number);

            return (
                Number.isInteger(major) &&
                Number.isInteger(minor) &&
                Number.isInteger(patch) &&
                major >= 1 &&
                major < 100 &&
                minor < 100 &&
                patch < 100
            );
        }) ?? null
    );
}
