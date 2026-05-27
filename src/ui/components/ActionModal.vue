<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
    kind: "settings" | "login";
}>();

defineEmits<{
    close: [];
}>();

const title = computed(() => props.kind === "settings" ? "Game Settings" : "VFUN Login");
</script>

<template>
    <div class="modal-backdrop" @click.self="$emit('close')">
        <section class="modal-panel">
            <header>
                <h2>{{ title }}</h2>
                <button class="icon-button" title="Close" @click="$emit('close')">×</button>
            </header>

            <div v-if="kind === 'settings'" class="modal-body">
                <label>
                    Game directory
                    <input type="text" placeholder="Select Last Origin R+ install folder" />
                </label>

                <label>
                    Launch arguments
                    <input type="text" placeholder="Optional command line arguments" />
                </label>

                <label class="check-row">
                    <input type="checkbox" />
                    Close launcher after game starts
                </label>

                <button class="secondary-action">Check Launcher Updates</button>
            </div>

            <div v-else class="modal-body">
                <label>
                    VFUN email
                    <input type="email" placeholder="commander@example.com" />
                </label>

                <label>
                    Password
                    <input type="password" placeholder="Password" />
                </label>

                <p class="muted">
                    Token handling should be implemented later through Electron IPC, not directly in the renderer.
                </p>

                <button class="secondary-action">Login</button>
            </div>
        </section>
    </div>
</template>
