<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import ServiceStatusDialog from "./components/ServiceStatusDialog.vue";
import NotificationHost from "./components/NotificationHost.vue";
import LauncherShell from "./components/LauncherShell.vue";
import ActionModal from "./components/ActionModal.vue";
import { useLauncherStore } from "./stores/launcherStore";
import { useSettingsStore } from "./stores/settingsStore.ts";
import { useGameStore } from "./stores/gameStore.ts";

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

async function handleMainAction() {
    if (gameStore.isRunningTask) return;

    if (launcherState.value === "install") {
        const status = await gameStore.checkMaintenance();
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
        const status = await gameStore.checkMaintenance();

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
}

onMounted(() => {
    void launcherStore.loadLauncherVersion();
    void settingsStore.loadSettings();
    void gameStore.loadInstallPath();
    void gameStore.loadPatchVersionInfo();

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
        @main-action="handleMainAction"
        @open-modal="activeModal = $event"
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
