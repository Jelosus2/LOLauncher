import type { GameVersionInfo } from "../../shared/game.js";

import { getRegistryGameInstallPath, getRegistryGameFileName } from "./gameRegistry.js";
import { createGameLaunchAuthCode } from "../auth/vfunAuthService.js";
import { loadAuthSession } from "../auth/authStorageService.js";
import { quotePowerShellString } from "./installerService.js";
import { getInstalledGameVersion } from "./patchService.js";
import { spawn } from "node:child_process";
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

export type LaunchGameOptions = {
    onStarted?: () => void;
};

export class GameLaunchCanceledError extends Error {
    constructor() {
        super("Game launch was canceled.");
        this.name = "GameLaunchCanceledError";
    }
}

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
    const { fileName, processName } = await getGameProcessName();

    if (!fileName || !processName)
        return false;

    const processes = await findProcess("name", processName) as FindProcessResult[];

    return processes.find((proc) => proc.name === fileName) !== undefined;
}

export async function assertGameIsNotRunning() {
    const isGameRunning = await isGameProcessRunning();

    if (isGameRunning)
        throw new Error("Last Origin R+ is currently running. Close the game before updating or repairing.");
}

export async function runGameUninstaller() {
    const uninstallerPath = await getGameUninstallerPath();
    if (!uninstallerPath)
        throw new Error("Game uninstaller was not found.");

    return runSilentUninstaller(uninstallerPath);
}

export async function launchGame(options: LaunchGameOptions = {}) {
    const session = await loadAuthSession();
    if (!session)
        throw new Error("Login is required before launching the game.");

    const executablePath = await getGameExecutablePath();
    if (!executablePath)
        throw new Error("Game executable was not found.");

    const authCode = await createGameLaunchAuthCode(session);
    const launchArgument = `fromVLauncher::VALOFE:${authCode}`;

    return runGame(executablePath, launchArgument, options);
}

async function getGameUninstallerPath() {
    const installPath = await getGameInstallPath();
    if (!installPath)
        return null;

    const uninstallerPath = path.join(installPath, "uninst.exe");

    try {
        const stat = await fs.stat(uninstallerPath);
        return stat.isFile() ? uninstallerPath : null;
    } catch {
        return null;
    }
}

function runSilentUninstaller(uninstallerPath: string) {
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
                    "-FilePath", quotePowerShellString(uninstallerPath),
                    "-ArgumentList", quotePowerShellString("/S"),
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

function runGame(executablePath: string, launchArgument: string, options: LaunchGameOptions) {
    return new Promise<void>((resolve, reject) => {
        const child = spawn(
            "powershell.exe",
            [
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                [
                    "$ErrorActionPreference = 'Stop';",
                    "try {",
                    "Start-Process",
                    "-FilePath", quotePowerShellString(executablePath),
                    "-ArgumentList", quotePowerShellString(launchArgument),
                    "-Verb", "RunAs;",
                    "exit 0",
                    "} catch {",
                    "Write-Error $_;",
                    "exit 1",
                    "}"
                ].join(" ")
            ],
            {
                windowsHide: true,
                stdio: "ignore"
            }
        );

        child.on("error", reject);

        child.on("exit", async (code) => {
            try {
                if (code !== 0)
                    throw new GameLaunchCanceledError();

                await waitForGameProcessLifecycle(options);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
}

async function getGameExecutablePath() {
    const installPath = await getGameInstallPath();
    const fileName = await getRegistryGameFileName();

    if (!installPath || !fileName)
        return null;

    const executablePath = path.join(installPath, fileName);

    try {
        const stat = await fs.stat(executablePath);
        return stat.isFile() ? executablePath : null;
    } catch {
        return null;
    }
}

async function waitForGameProcessLifecycle(options: LaunchGameOptions) {
    await waitForGameProcessStart();
    options.onStarted?.();

    await waitForGameProcessExit();
}

async function waitForGameProcessExit() {
    const pollIntervalMs = 2000;
    let pid = await getRunningGameProcessId();

    while (pid != null) {
        pid = await getRunningGameProcessId();

        await delay(pollIntervalMs);
    }
}

async function waitForGameProcessStart() {
    const timeoutMs = 60_000;
    const pollIntervalMs = 1000;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const pid = await getRunningGameProcessId();
        if (pid)
            return pid;

        await delay(pollIntervalMs);
    }

    throw new Error("Game process did not start.");
}

async function getRunningGameProcessId() {
    const processName = await getGameProcessName();
    if (!processName)
        return null;

    const processes = await findProcess("name", processName) as FindProcessResult[];
    return processes[0]?.pid ?? null;
}

async function getGameProcessName() {
    const fileName = await getRegistryGameFileName();
    if (!fileName)
        return { fileName: null, processName: null };

    const processName = path.basename(fileName).replace(/\.exe$/i, "");

    return { fileName, processName };
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

function delay(ms: number) {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}
