<script setup lang="ts">
import type { LauncherTaskProgress } from "../../shared/installer";

import LauncherSidebar from "./LauncherSidebar.vue";
import NewsCarousel from "./NewsCarousel.vue";
import { useLauncherStore } from "../stores/launcherStore";

defineProps<{
    launcherState: "install" | "ready" | "update";
    mainActionLabel: string;
    mainActionDisabled?: boolean;
    taskProgress: LauncherTaskProgress
}>();

defineEmits<{
    mainAction: [];
    openModal: ["settings" | "login"];
}>();

const launcherStore = useLauncherStore();

function minimize() {
    window.app.minimizeWindow();
}

function close() {
    window.app.closeWindow();
}
</script>

<template>
    <div class="app-frame">
        <header class="app-titlebar">
            <div class="app-title">
                <span class="app-title-icon" aria-hidden="true"></span>
                <span>Last Origin R+</span>
                <span class="app-title-version">{{ launcherStore.launcherVersion || "Unknown" }}</span>
            </div>

            <div class="window-actions">
                <button title="Minimize" @click="minimize">-</button>
                <button title="Close" @click="close">&times;</button>
            </div>
        </header>

        <main class="launcher-shell">
            <LauncherSidebar
                :launcher-state="launcherState"
                :main-action-label="mainActionLabel"
                :main-action-disabled="mainActionDisabled"
                @main-action="$emit('mainAction')"
                @open-settings="$emit('openModal', 'settings')"
            />

            <section class="launcher-main">
                <header class="topbar">
                    <div>
                        <p class="eyebrow">Last Origin R+ Launcher</p>
                    </div>

                    <div class="topbar-actions">
                        <button class="icon-button" title="VFUN Login" @click="$emit('openModal', 'login')">ID</button>
                        <button class="icon-button" title="Settings" @click="$emit('openModal', 'settings')">&#9881;</button>
                    </div>
                </header>

                <NewsCarousel />

                <div
                    v-if="taskProgress.step !== 'idle'"
                    class="launcher-progress"
                >
                    <div class="launcher-progress-header">
                        <span>{{ taskProgress.label }}</span>
                        <strong>{{ Math.round(taskProgress.percent) }}%</strong>
                    </div>

                    <div class="launcher-progress-track">
                        <div
                            class="launcher-progress-fill"
                            :style="{ width: `${Math.max(0, Math.min(100, taskProgress.percent))}%` }"
                        />
                    </div>
                </div>
            </section>
        </main>
    </div>
</template>
