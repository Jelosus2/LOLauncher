<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import NotificationHost from "./components/NotificationHost.vue";
import LauncherShell from "./components/LauncherShell.vue";
import ActionModal from "./components/ActionModal.vue";
import { useLauncherStore } from "./stores/launcherStore";
import { useSettingsStore } from "./stores/settingsStore.ts";
import { useGameStore } from "./stores/gameStore.ts";

type LauncherState = "install" | "ready" | "update";
type ModalKind = "settings" | "login" | null;

const activeModal = ref<ModalKind>(null);
const launcherStore = useLauncherStore();
const settingsStore = useSettingsStore();
const gameStore = useGameStore();

const launcherState = computed<LauncherState>(() => {
    if (!gameStore.isLoaded) return "ready";
    return gameStore.installPath ? "ready" : "install";
});

const mainActionLabel = computed(() => {
    if (launcherState.value === "install") return "Install";
    if (launcherState.value === "update") return "Update";
    return "Start Game";
});

function handleMainAction() {
    console.log(`Main action: ${mainActionLabel.value}`);
}

onMounted(() => {
    void launcherStore.loadLauncherVersion();
    void settingsStore.loadSettings();
    void gameStore.loadInstallPath();
});
</script>

<template>
    <LauncherShell
        :launcher-state="launcherState"
        :main-action-label="mainActionLabel"
        @main-action="handleMainAction"
        @open-modal="activeModal = $event"
    />

    <ActionModal
        v-if="activeModal"
        :kind="activeModal"
        @close="activeModal = null"
    />

    <NotificationHost />
</template>
