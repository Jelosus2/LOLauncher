import { registerAppLifecycle } from "./lifecycle/appLifecycle.js";
import { registerIpcHandlers } from "./ipc/registerIpcHandlers.js";
import { createMainWindow } from "./windows/mainWindow.js";

registerIpcHandlers();
registerAppLifecycle(createMainWindow);
