import type { LogPayload } from "../../../shared/logging.js";
import type { IpcMainInvokeEvent } from "electron";

import { writeLog } from "../../logging/logger.js";
import { IpcHandle } from "../ipcDecorators.js";

export class DiagnosticsController {
    @IpcHandle("diagnostics:log")
    logMessage(_event: IpcMainInvokeEvent, payload: LogPayload) {
        return writeLog(payload);
    }
}
