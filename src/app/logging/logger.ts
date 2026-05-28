import type { LogPayload } from "../../shared/logging.js";

import { getLogPath } from "../shared/paths.js";
import fs from "node:fs/promises";
import path from "node:path";

export async function writeLog(payload: LogPayload) {
    const line = JSON.stringify({
        time: new Date().toISOString(),
        ...payload
    });

    const logPath = getLogPath();
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    await fs.appendFile(logPath, `${line}\n`, "utf-8");
}

export function serializeError(error: unknown) {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack
        };
    }

    return error;
}
