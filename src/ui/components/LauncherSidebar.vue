<script setup lang="ts">
import { ref, onMounted } from "vue";

const launcherVersion = ref("");

defineProps<{
    launcherState: "install" | "ready" | "update";
    mainActionLabel: string;
}>();

defineEmits<{
    mainAction: [];
}>();

onMounted(async () => {
    launcherVersion.value = await window.app.getLauncherVersion();
});
</script>

<template>
    <aside class="sidebar">
        <div class="sidebar-logo" role="img" aria-label="Last Origin R+"></div>

        <button
            class="main-action"
            :class="`state-${launcherState}`"
            @click="$emit('mainAction')"
        >
            {{ mainActionLabel }}
        </button>

        <div class="version-stack">
            <div>
                <span>Game</span>
                <strong>Not detected</strong>
            </div>
            <div>
                <span>Launcher</span>
                <strong>{{ launcherVersion || "Unknown" }}</strong>
            </div>
        </div>
    </aside>
</template>
