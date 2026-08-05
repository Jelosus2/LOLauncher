import { DiagnosticsController } from "./controllers/DiagnosticsController.js";
import { LauncherController } from "./controllers/LauncherController.js";
import { SettingsController } from "./controllers/SettingsController.js";
import { ProtocolController } from "./controllers/ProtocolController.js";
import { WindowController } from "./controllers/WindowController.js";
import { GameController } from "./controllers/GameController.js";
import { AuthController } from "./controllers/AuthController.js";
import { registerIpcController } from "./ipcDecorators.js";

export function registerIpcHandlers() {
    registerIpcController(new DiagnosticsController());
    registerIpcController(new LauncherController());
    registerIpcController(new SettingsController());
    registerIpcController(new ProtocolController());
    registerIpcController(new WindowController());
    registerIpcController(new GameController());
    registerIpcController(new AuthController());
}
