<script setup lang="ts">
import { computed } from "vue";
import { useLauncherStore } from "../stores/launcherStore";
import { useSettingsStore } from "../stores/settingsStore";

const props = defineProps<{
    kind: "settings" | "login";
}>();

defineEmits<{
    close: [];
}>();

const launcherStore = useLauncherStore();
const settingsStore = useSettingsStore();
const title = computed(() => props.kind === "settings" ? "Game Settings" : "VFUN Login");
</script>

<template>
    <div class="modal-backdrop" @click.self="$emit('close')">
        <section class="modal-panel">
            <header>
                <h2>{{ title }}</h2>
                <button class="icon-button" title="Close" @click="$emit('close')">&times;</button>
            </header>

            <div v-if="kind === 'settings'" class="modal-body">
                <label class="settings-field">
                    <span>Game directory</span>
                    <div class="path-control">
                        <input
                            type="text"
                            placeholder="Last Origin R+ not installed"
                            disabled
                        />
                        <button class="folder-button" title="Open game folder">
                            <span class="folder-icon" aria-hidden="true"></span>
                        </button>
                    </div>
                </label>

                <fieldset class="settings-group">
                    <legend>Close settings</legend>

                    <label class="radio-row">
                        <input
                            type="radio"
                            name="close-action"
                            value="tray"
                            :checked="settingsStore.settings.closeAction === 'tray'"
                            @change="settingsStore.updateSetting('closeAction', 'tray')"
                        />
                        Minimize to system tray
                    </label>

                    <label class="radio-row">
                        <input
                            type="radio"
                            name="close-action"
                            value="quit"
                            :checked="settingsStore.settings.closeAction === 'quit'"
                            @change="settingsStore.updateSetting('closeAction', 'quit')"
                        />
                        Quit
                    </label>

                    <label class="check-row">
                        <input
                            type="checkbox"
                            :checked="settingsStore.settings.closeAfterGameStarts"
                            @change="settingsStore.updateSetting(
                                'closeAfterGameStarts',
                                ($event.target as HTMLInputElement).checked
                            )"
                        />
                        Close launcher after game starts
                    </label>
                </fieldset>

                <div class="settings-version-row">
                    <span>Launcher version</span>
                    <strong>{{ launcherStore.launcherVersion || "Unknown" }}</strong>
                </div>

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
