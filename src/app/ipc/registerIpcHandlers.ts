import { LauncherController } from "./controllers/LauncherController.js";
import { WindowController } from "./controllers/WindowController.js";
import { registerIpcController } from "./ipcDecorators.js";

export function registerIpcHandlers() {
    registerIpcController(new LauncherController());
    registerIpcController(new WindowController());
}
