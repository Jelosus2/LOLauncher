import { registerAppLifecycle } from "./lifecycle/appLifecycle.js";
import { registerIpcHandlers } from "./ipc/registerIpcHandlers.js";
import { serializeError, writeLog } from "./logging/logger.js";
import { createMainWindow } from "./windows/mainWindow.js";

process.on("uncaughtException", (error) => {
    void writeLog({
        level: "error",
        message: "Uncaught exception",
        context: "main-process",
        details: serializeError(error)
    });
});

process.on("unhandledRejection", (error) => {
    void writeLog({
        level: "error",
        message: "Unhandled promise rejection",
        context: "main-process",
        details: serializeError(error)
    });
});

registerIpcHandlers();
registerAppLifecycle(createMainWindow);
