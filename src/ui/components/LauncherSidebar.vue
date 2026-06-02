<script setup lang="ts">
import { ref, onBeforeUnmount, onMounted } from "vue";

const props = defineProps<{
    launcherState: "install" | "ready" | "update";
    mainActionLabel: string;
    mainActionDisabled?: boolean;
    gameVersionLabel?: string;
}>();

const emit = defineEmits<{
    mainAction: [];
    openSettings: [];
    repairGame: [];
    uninstallGame: [];
}>();

const actionMenuRef = ref<HTMLElement | null>(null);
const isActionMenuOpen = ref(false);

function runMainAction() {
    isActionMenuOpen.value = false;
    emit("mainAction");
}

function toggleActionMenu() {
    if (props.mainActionDisabled)
        return;

    isActionMenuOpen.value = !isActionMenuOpen.value;
}

function repairGame() {
    isActionMenuOpen.value = false;
    emit("repairGame");
}

function uninstallGame() {
    isActionMenuOpen.value = false;
    emit("uninstallGame");
}

function handleDocumentPointerDown(event: PointerEvent) {
    if (!isActionMenuOpen.value)
        return;

    const target = event.target;
    if (!(target instanceof Node))
        return;

    if (actionMenuRef.value?.contains(target))
        return;

    isActionMenuOpen.value = false;
}

onMounted(() => {
    document.addEventListener("pointerdown", handleDocumentPointerDown);
});

onBeforeUnmount(() => {
    document.removeEventListener("pointerdown", handleDocumentPointerDown);
});
</script>

<template>
    <aside class="sidebar">
        <div class="sidebar-logo" role="img" aria-label="Last Origin R+"></div>

        <p v-if="gameVersionLabel" class="game-version-label">
            {{ gameVersionLabel }}
        </p>

        <button
            v-if="launcherState !== 'ready'"
            class="main-action"
            :class="`state-${launcherState}`"
            :disabled="mainActionDisabled"
            @click="runMainAction"
        >
            {{ mainActionLabel }}
        </button>

        <div
            v-else
            ref="actionMenuRef"
            class="main-action-menu"
            :class="{ open: isActionMenuOpen, disabled: mainActionDisabled }"
        >
            <div class="main-action-split">
                <button
                    class="main-action split-primary state-ready"
                    :disabled="mainActionDisabled"
                    @click="runMainAction"
                >
                    {{ mainActionLabel }}
                </button>

                <button
                    class="main-action-dropdown-toggle"
                    :disabled="mainActionDisabled"
                    title="Game actions"
                    @click="toggleActionMenu"
                >
                    <span aria-hidden="true"></span>
                </button>
            </div>

            <div v-if="isActionMenuOpen" class="main-action-dropdown">
                <button @click="repairGame">Repair Game</button>
                <button class="danger" @click="uninstallGame">Uninstall Game</button>
            </div>
        </div>

        <button class="sidebar-settings-button" @click="$emit('openSettings')">
            <span style="font-size: 20px;">&#9881;</span>
            <span>Game Settings</span>
        </button>
    </aside>
</template>
