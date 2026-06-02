export type CloseAction = "quit" | "tray";

export type LauncherSettings = {
    closeAfterGameStarts: boolean;
    closeAction: CloseAction;
    rememberLogin: boolean;
};

export const defaultLauncherSettings: LauncherSettings = {
    closeAfterGameStarts: false,
    closeAction: "tray",
    rememberLogin: false
};
