export const appConfig = {
    appName: "LOLauncher",
    renderer: {
        devServerUrl: process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173/"
    },
    protocol: {
        scheme: "lolauncher"
    },
    mainWindow: {
        width: 1275,
        height: 660,
        backgroundColor: "#070d0f"
    }
} as const;
