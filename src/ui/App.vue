<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import ServiceStatusDialog from "./components/ServiceStatusDialog.vue";
import NotificationHost from "./components/NotificationHost.vue";
import LauncherShell from "./components/LauncherShell.vue";
import ActionModal from "./components/ActionModal.vue";
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
const launcherStore = useLauncherStore();
const settingsStore = useSettingsStore();
const gameStore = useGameStore();
const authStore = useAuthStore();

let unsubscribeInstallerProgress: (() => void) | undefined;

const launcherState = computed<LauncherState>(() => {
    if (!gameStore.isLoaded) return "ready";
    if (!gameStore.installPath) return "install";
    if (gameStore.versionInfo?.needsPatch) return "update";
    return "ready";
});

const mainActionLabel = computed(() => {
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

async function handleMainAction() {
    if (gameStore.isRunningTask) return;

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

        // launch game later
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

onMounted(() => {
    void launcherStore.loadLauncherVersion();
    void settingsStore.loadSettings();
    void gameStore.loadInstallPath();
    void gameStore.loadPatchVersionInfo();
    void authStore.loadSession();

    unsubscribeInstallerProgress = gameStore.subscribeInstallerProgress();
});

onUnmounted(() => {
    unsubscribeInstallerProgress?.();
});
</script>

<template>
    <LauncherShell
        :launcher-state="launcherState"
        :main-action-label="mainActionLabel"
        :main-action-disabled="gameStore.isRunningTask"
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
        @close="activeModal = null"
    />

    <ServiceStatusDialog
        v-if="serviceDialog"
        :title="serviceDialog.title"
        :message="serviceDialog.message"
        @close="serviceDialog = null"
    />

    <NotificationHost />
</template>
