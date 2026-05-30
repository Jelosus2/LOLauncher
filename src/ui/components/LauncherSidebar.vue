<script setup lang="ts">
defineProps<{
    launcherState: "install" | "ready" | "update";
    mainActionLabel: string;
    mainActionDisabled?: boolean;
}>();

defineEmits<{
    mainAction: [];
    openSettings: [];
}>();
</script>

<template>
    <aside class="sidebar">
        <div class="sidebar-logo" role="img" aria-label="Last Origin R+"></div>

        <button
            class="main-action"
            :class="`state-${launcherState}`"
            :disabled="mainActionDisabled"
            @click="$emit('mainAction')"
        >
            {{ mainActionLabel }}
        </button>

        <button class="sidebar-settings-button" @click="$emit('openSettings')">
            <span style="font-size: 20px;">&#9881;</span>
            <span>Game Settings</span>
        </button>
    </aside>
</template>
