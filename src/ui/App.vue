<script setup lang="ts">
import type { LauncherUpdateProgress } from "../shared/launcherUpdate.ts";

import { computed, onMounted, onUnmounted, ref } from "vue";
import ServiceStatusDialog from "./components/ServiceStatusDialog.vue";
import NotificationHost from "./components/NotificationHost.vue";
import LauncherShell from "./components/LauncherShell.vue";
import ActionModal from "./components/ActionModal.vue";
import { useNotificationStore } from "./stores/notificationStore.ts";
import { useLauncherStore } from "./stores/launcherStore";
import { useSettingsStore } from "./stores/settingsStore.ts";
import { useGameStore } from "./stores/gameStore.ts";
import { useAuthStore } from "./stores/authStore.ts";

type LauncherState = "install" | "ready" | "update";
type ModalKind = "settings" | "login" | null;

const activeModal = ref<ModalKind>(null);
const serviceDialog = ref<{
    title: string;
    message: string;
} | null>(null);
const launcherUpdateOverlay = ref<{
    mandatory: boolean;
    latestVersion?: string;
} | null>(null);
const launcherUpdateProgress = ref<LauncherUpdateProgress | null>(null);

const notificationStore = useNotificationStore();
const launcherStore = useLauncherStore();
const settingsStore = useSettingsStore();
const gameStore = useGameStore();
const authStore = useAuthStore();

let unsubscribeInstallerProgress: (() => void) | undefined;
let unsubscribeLauncherUpdateProgress: (() => void) | undefined;
let pendingLoginResolve: ((success: boolean) => void) | undefined;

const launcherState = computed<LauncherState>(() => {
    if (!gameStore.isLoaded) return "ready";
    if (!gameStore.installPath) return "install";
    if (gameStore.versionInfo?.needsPatch) return "update";
    return "ready";
});

const mainActionLabel = computed(() => {
    if (gameStore.isLaunchingGame)
        return "Running...";

    if (launcherState.value === "install") return "Install";
    if (launcherState.value === "update") return "Update";
    return "Start Game";
});

const gameVersionLabel = computed(() => {
    const gameVersion = gameStore.gameVersionInfo.gameVersion ?? "Unknown";
    const patchVersion = gameStore.gameVersionInfo.patchVersion;

    if (patchVersion === null)
        return `Game version: ${gameVersion}`;

    return `Game version: ${gameVersion} (${patchVersion})`;
});

const isLauncherUpdateRunning = computed(() => {
    return (
        launcherUpdateProgress.value?.phase === "checking" ||
        launcherUpdateProgress.value?.phase === "downloading" ||
        launcherUpdateProgress.value?.phase === "installing"
    );
});

async function handleMainAction() {
    if (gameStore.isRunningTask || gameStore.isLaunchingGame) return;

    const status = await gameStore.checkMaintenance();

    if (launcherState.value === "install") {
        if (status.isRestrictedCountry) {
            serviceDialog.value = {
                title: "Service Unavailable",
                message: status.message
            };
            return;
        }

        void gameStore.downloadAndRunInstaller();
        return;
    }

    if (launcherState.value === "ready") {
        if (status.isRestrictedCountry) {
            serviceDialog.value = {
                title: "Service Unavailable",
                message: status.message
            };
            return;
        }

        if (status.isMaintenance) {
            serviceDialog.value = {
                title: "Game Under Maintenance",
                message: status.message
            };
            return;
        }

        const isLoggedIn = await waitForLogin();
        if (!isLoggedIn)
            return;

        await ensureGameIsNotRunning(() => {
            void gameStore.launchGame();
        });
        return;
    }

    if (launcherState.value === "update") {
        if (status.isRestrictedCountry) {
            serviceDialog.value = {
                title: "Service Unavailable",
                message: status.message
            };
            return;
        }

        await ensureGameIsNotRunning(() => {
            void gameStore.applyLatestPatch();
        });
        return;
    }
}

async function handleRepairGame() {
    if (gameStore.isRunningTask)
        return;

    const status = await gameStore.checkMaintenance();

    if (status.isRestrictedCountry) {
        serviceDialog.value = {
            title: "Service Unavailable",
            message: status.message
        };
        return;
    }

    await ensureGameIsNotRunning(() => {
        void gameStore.repairGame();
    });
}

async function handleUninstallGame() {
    if (gameStore.isRunningTask)
        return;

    await ensureGameIsNotRunning(() => {
        void gameStore.uninstallGame();
    });
}

async function ensureGameIsNotRunning(nextAction: () => void) {
    const isGameRunning = await gameStore.isGameProcessRunning();

    if (!isGameRunning) {
        nextAction();
        return;
    }

    serviceDialog.value = {
        title: "Game Is Running",
        message: "Close the game before proceeding."
    };
}

async function checkMandatoryLauncherUpdate() {
    try {
        const update = await window.app.checkLauncherUpdate();

        if (!update.available || !update.mandatory)
            return;

        launcherUpdateOverlay.value = {
            mandatory: true,
            latestVersion: update.latestVersion
        };
    } catch {
        launcherUpdateOverlay.value = null;

        notificationStore.push({
            level: "info",
            title: "Launcher Update Check Failed",
            message: "The launcher could not check for updates right now."
        });
    }
}

async function startOverlayLauncherUpdate() {
    if (!launcherUpdateOverlay.value)
        return;

    await window.app.startLauncherUpdate(launcherUpdateOverlay.value.mandatory);
}

function closeActiveModal() {
    if (activeModal.value === "login" && pendingLoginResolve) {
        pendingLoginResolve(false);
        pendingLoginResolve = undefined;
    }

    activeModal.value = null;
}

function handleLoginSuccess() {
    pendingLoginResolve?.(true);
    pendingLoginResolve = undefined;
}

function handleLoginFailed() {
    pendingLoginResolve?.(false);
    pendingLoginResolve = undefined;
}

function waitForLogin() {
    if (authStore.session)
        return Promise.resolve(true);

    activeModal.value = "login";

    return new Promise<boolean>((resolve) => {
        pendingLoginResolve = resolve;
    });
}

function minimizeWindow() {
    window.app.minimizeWindow();
}

function closeWindow() {
    window.app.closeWindow();
}

onMounted(() => {
    void launcherStore.loadLauncherVersion();
    void settingsStore.loadSettings();
    void gameStore.loadInstallPath();
    void gameStore.loadPatchVersionInfo();
    void authStore.loadSession();
    void checkMandatoryLauncherUpdate();

    unsubscribeInstallerProgress = gameStore.subscribeInstallerProgress();

    unsubscribeLauncherUpdateProgress = window.app.onLauncherUpdateProgress((progress) => {
        launcherUpdateProgress.value = progress;

        if (!launcherUpdateOverlay.value) {
            launcherUpdateOverlay.value = {
                mandatory: false
            };
        }
    });
});

onUnmounted(() => {
    unsubscribeInstallerProgress?.();
    unsubscribeLauncherUpdateProgress?.();
});
</script>

<template>
    <LauncherShell
        :launcher-state="launcherState"
        :main-action-label="mainActionLabel"
        :main-action-disabled="gameStore.isRunningTask || gameStore.isLaunchingGame"
        :task-progress="gameStore.taskProgress"
        :game-version-label="gameVersionLabel"
        :auth-user-nickname="authStore.session?.user.nickname"
        :auth-user-id="authStore.session?.user.userId"
        @main-action="handleMainAction"
        @open-modal="activeModal = $event"
        @repair-game="handleRepairGame"
        @uninstall-game="handleUninstallGame"
        @pause-patch="gameStore.pausePatch"
        @resume-patch="gameStore.resumePatch"
        @cancel-patch="gameStore.cancelPatch"
        @logout="authStore.logout"
    />

    <ActionModal
        v-if="activeModal"
        :kind="activeModal"
        @close="closeActiveModal"
        @login-success="handleLoginSuccess"
        @login-failed="handleLoginFailed"
    />

    <ServiceStatusDialog
        v-if="serviceDialog"
        :title="serviceDialog.title"
        :message="serviceDialog.message"
        @close="serviceDialog = null"
    />

    <NotificationHost />

    <div v-if="launcherUpdateOverlay" class="mandatory-update-backdrop">
        <section class="mandatory-update-panel">
            <h2>
                {{ launcherUpdateOverlay.mandatory ? "Required Launcher Update" : "Launcher Update" }}
            </h2>

            <p v-if="launcherUpdateOverlay.latestVersion">
                Version {{ launcherUpdateOverlay.latestVersion }} is available.
            </p>

            <div class="launcher-progress-track">
                <div
                    class="launcher-progress-fill"
                    :style="{ width: `${launcherUpdateProgress?.percent ?? 0}%` }"
                />
            </div>

            <p class="mandatory-update-status">
                {{ launcherUpdateProgress?.label || "Update is required before using the launcher." }}
            </p>

            <div class="mandatory-update-actions">
                <button
                    :disabled="isLauncherUpdateRunning"
                    @click="startOverlayLauncherUpdate"
                >
                    {{ isLauncherUpdateRunning ? "Updating..." : "Update" }}
                </button>

                <button
                    v-if="launcherUpdateOverlay.mandatory"
                    @click="minimizeWindow()"
                >
                    Minimize
                </button>

                <button
                    v-if="launcherUpdateOverlay.mandatory"
                    @click="closeWindow"
                >
                    Close
                </button>
            </div>
        </section>
    </div>
</template>
