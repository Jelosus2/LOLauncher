import { app, BrowserWindow, type IpcMainInvokeEvent } from "electron";
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

    @IpcHandle("window:show")
    show(event: IpcMainInvokeEvent) {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window)
            return;

        if (window.isMinimized())
            window.restore();

        window.show();
        app.focus({ steal: true });
        window.focus();
    }
}
