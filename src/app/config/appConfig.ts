export const appConfig = {
    appName: "LOLauncher",
    renderer: {
        devServerUrl: process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173/"
    },
    mainWindow: {
        width: 1275,
        height: 660,
        minWidth: 960,
        minHeight: 560,
        backgroundColor: "#070d0f"
    }
} as const;
