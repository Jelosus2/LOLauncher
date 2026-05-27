<script setup lang="ts">
import LauncherSidebar from "./LauncherSidebar.vue";
import NewsCarousel from "./NewsCarousel.vue";

defineProps<{
    launcherState: "install" | "ready" | "update";
    mainActionLabel: string;
}>();

defineEmits<{
    mainAction: [];
    openModal: ["settings" | "login"];
}>();
</script>

<template>
    <main class="launcher-shell">
        <LauncherSidebar
            :launcher-state="launcherState"
            :main-action-label="mainActionLabel"
            @main-action="$emit('mainAction')"
        />

        <section class="launcher-main">
            <header class="topbar">
                <div>
                    <p class="eyebrow">TW / Global</p>
                    <h1>Last Origin R+</h1>
                </div>

                <div class="topbar-actions">
                    <button class="icon-button" title="VFUN Login" @click="$emit('openModal', 'login')">ID</button>
                    <button class="icon-button" title="Refresh News">&#8635;</button>
                    <button class="icon-button" title="Settings" @click="$emit('openModal', 'settings')">&#9881;</button>
                </div>
            </header>

            <NewsCarousel />
        </section>
    </main>
</template>
