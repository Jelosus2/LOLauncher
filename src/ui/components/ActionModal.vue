<script setup lang="ts">
import { useNotificationStore } from "@/stores/notificationStore";
import { useLauncherStore } from "@/stores/launcherStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useGameStore } from "@/stores/gameStore";
import { useAuthStore } from "@/stores/authStore";
import { computed, ref } from "vue";

const props = defineProps<{
    kind: "settings" | "login";
}>();

const emit = defineEmits<{
    close: [];
    loginSuccess: [];
    loginFailed: [];
}>();

const loginMode = ref<"vfun" | "google" | "facebook" | "apple">("vfun");
const title = computed(() => props.kind === "settings" ? "Game Settings" : "VFUN Login");

const notificationStore = useNotificationStore();
const launcherStore = useLauncherStore();
const settingsStore = useSettingsStore();
const gameStore = useGameStore();
const authStore = useAuthStore();

async function continueProviderLogin() {
    if (loginMode.value !== "google")
        return;

    try {
        const session = await authStore.loginWithGoogle(settingsStore.settings.rememberLogin);

        notificationStore.push({
            level: "info",
            title: "Login Successful",
            message: `Signed in as ${session.user.nickname}`
        });

        emit("loginSuccess");
        emit("close");
    } catch {
        emit("loginFailed");
    }
}
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
                            :value="gameStore.installPath || 'Last Origin R+ not installed'"
                            disabled
                        />
                        <button
                            class="folder-button"
                            title="Open game folder"
                            :disabled="!gameStore.installPath || gameStore.isOpeningFolder"
                            @click="gameStore.openInstallFolder"
                        >
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

            <div v-else class="modal-body login-body">
                <div class="login-provider-grid">
                    <button
                        class="login-provider-card"
                        :class="{ active: loginMode === 'vfun' }"
                        @click="loginMode = 'vfun'"
                    >
                        <span class="login-provider-mark">ID</span>
                        <span>VFUN ID</span>
                    </button>

                    <button
                        class="login-provider-card"
                        :class="{ active: loginMode === 'google' }"
                        @click="loginMode = 'google'"
                    >
                        <span class="login-provider-mark image-mark google" aria-hidden="true"></span>
                        <span>Google</span>
                    </button>

                    <button
                        class="login-provider-card"
                        :class="{ active: loginMode === 'facebook' }"
                        @click="loginMode = 'facebook'"
                    >
                        <span class="login-provider-mark image-mark facebook" aria-hidden="true"></span>
                        <span>Facebook</span>
                    </button>

                    <button
                        class="login-provider-card"
                        :class="{ active: loginMode === 'apple' }"
                        @click="loginMode = 'apple'"
                    >
                        <span class="login-provider-mark image-mark apple" aria-hidden="true"></span>
                        <span>Apple</span>
                    </button>
                </div>

                <div v-if="loginMode === 'vfun'" class="login-credential-panel">
                    <label>
                        VFUN ID
                        <input type="text" inputmode="numeric" placeholder="VFUN ID" />
                    </label>

                    <label>
                        Password
                        <input type="password" placeholder="Password" />
                    </label>

                    <button class="secondary-action">Login with VFUN ID</button>
                </div>

                <div v-else class="login-provider-panel">
                    <p>
                        Continue with {{ loginMode.charAt(0).toUpperCase() + loginMode.slice(1) }} in the secure VFUN login window.
                    </p>

                    <button
                        class="secondary-action"
                        :disabled="authStore.isLoggingIn || loginMode !== 'google'"
                        @click="continueProviderLogin"
                    >
                        {{ authStore.isLoggingIn ? "Signing in..." : "Continue" }}
                    </button>
                </div>

                <label class="check-row login-remember-row">
                    <input
                        type="checkbox"
                        :checked="settingsStore.settings.rememberLogin"
                        @change="settingsStore.updateSetting(
                            'rememberLogin',
                            ($event.target as HTMLInputElement).checked
                        )"
                    />
                    Remember login
                </label>
            </div>
        </section>
    </div>
</template>
