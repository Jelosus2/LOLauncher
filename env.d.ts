/// <reference types="vite/client" />
import type { LauncherApi } from "./src/shared/launcherApi";

declare global {
    interface Window {
        app: LauncherApi;
    }
}

export {};
