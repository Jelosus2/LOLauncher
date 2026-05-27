<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import LauncherShell from "./components/LauncherShell.vue";
import ActionModal from "./components/ActionModal.vue";
import { useLauncherStore } from "./stores/launcherStore";

type LauncherState = "install" | "ready" | "update";
type ModalKind = "settings" | "login" | null;

const launcherState = ref<LauncherState>("ready");
const activeModal = ref<ModalKind>(null);
const launcherStore = useLauncherStore();

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
</template>
