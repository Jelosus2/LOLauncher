import { LauncherController } from "./controllers/LauncherController.js";
import { registerIpcController } from "./ipcDecorators.js";


export function registerIpcHandlers() {
    registerIpcController(new LauncherController());
}
