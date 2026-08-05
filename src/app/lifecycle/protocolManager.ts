import type { ProtocolLaunchGameRequest, ProtocolLaunchResult } from "../../shared/protocol.js";

import { serializeError, writeLog } from "../logging/logger.js";
import { appConfig } from "../config/appConfig.js";
import { app, BrowserWindow } from "electron";
import path from "node:path";

let pendingLaunchGameRequest: ProtocolLaunchGameRequest | null = null;

export function registerLauncherProtocol() {
    if (process.defaultApp) {
        const appPath = path.resolve(process.argv[1] ?? ".");
        app.setAsDefaultProtocolClient(appConfig.protocol.scheme, process.execPath, [appPath]);
        return;
    }

    app.setAsDefaultProtocolClient(appConfig.protocol.scheme);
}

export function captureProtocolLaunchGameRequest(argv = process.argv) {
    const request = getProtocolLaunchGameRequest(argv);
    if (!request)
        return false;

    pendingLaunchGameRequest = request;
    return true;
}

export function consumeProtocolLaunchGameRequest() {
    const request = pendingLaunchGameRequest;
    pendingLaunchGameRequest = null;
    return request;
}

export function dispatchProtocolLaunchGameRequest(mainWindow: BrowserWindow | null, request = pendingLaunchGameRequest) {
    if (!mainWindow || mainWindow.isDestroyed()) {
        pendingLaunchGameRequest = request;
        return;
    }

    pendingLaunchGameRequest = null;
    mainWindow.webContents.send("protocol:launch-game", request);
}

export async function reportProtocolLaunchResult(request: ProtocolLaunchGameRequest | undefined, result: ProtocolLaunchResult) {
    if (!request?.callbackUrl)
        return;

    try {
        const callbackUrl = parseCallbackUrl(request.callbackUrl);
        if (!callbackUrl)
            throw new Error("Blocked non-loopback protocol callback URL.");

        callbackUrl.searchParams.set("status", result.status);

        if (result.reason)
            callbackUrl.searchParams.set("reason", result.reason);

        await fetch(callbackUrl.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(result),
            signal: AbortSignal.timeout(5000)
        });
    } catch (error) {
        await writeLog({
            level: "error",
            message: "Failed to report protocol launch result.",
            context: "protocolManager.reportProtocolLaunchResult",
            details: serializeError(error)
        });
    }
}

function getProtocolLaunchGameRequest(argv: string[]) {
    for (const arg of argv) {
        const url = parseLauncherProtocolUrl(arg);
        if (!url)
            continue;

        const command = url.hostname || url.pathname.replace(/^\/+/, "");
        if (command !== "launch-game" && command !== "start-game" && command !== "launch")
            continue;

        return {
            callbackUrl: url.searchParams.get("callback") ?? undefined
        };
    }

    return null;
}

function parseLauncherProtocolUrl(value: string) {
    try {
        const url = new URL(value);
        return url.protocol === `${appConfig.protocol.scheme}:` ? url : null;
    } catch {
        return null;
    }
}

function parseCallbackUrl(value: string) {
    try {
        const url = new URL(value);

        if (url.protocol !== "http:")
            return null;

        if (url.username || url.password)
            return null;

        if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname))
            return null;

        return url;
    } catch {
        return null;
    }
}
