import type { PatchVersionInfo } from "../../shared/patch.js";

import { getRegistryGameVersion } from "./gameRegistry.js";

const patchVersionInfoUrl = "https://laotw-cdn.pmang.jp/vfun/patchurl/live/patchVersionInfo.txt";

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

async function getRemotePatchVersionInfo() {
    const response = await fetch(patchVersionInfoUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.134 Safari/537.36 Chrome"
        }
    });

    if (!response.ok)
        throw new Error(`Patch version info request failed: HTTP ${response.status}`);

    const text = await response.text();
    return parsePatchVersionInfo(text);
}

async function getInstalledGameVersion() {
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
