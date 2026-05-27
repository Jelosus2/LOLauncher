import { BrowserWindow, type IpcMainInvokeEvent } from "electron";
import { IpcHandle } from "../ipcDecorators.js";

export class WindowController {
    @IpcHandle("window:minimize")
    minimize(event: IpcMainInvokeEvent) {
        BrowserWindow.fromWebContents(event.sender)?.minimize();
    }

    @IpcHandle("window:close")
    close(event: IpcMainInvokeEvent) {
        BrowserWindow.fromWebContents(event.sender)?.close();
    }
}
