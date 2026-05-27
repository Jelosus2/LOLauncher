export type CloseAction = "quit" | "tray";

export type LauncherSettings = {
    closeAfterGameStarts: boolean;
    closeAction: CloseAction;
};

export const defaultLauncherSettings: LauncherSettings = {
    closeAfterGameStarts: false,
    closeAction: "tray"
};
