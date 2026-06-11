<script setup lang="ts">
import type { SnsAuthProvider, AuthProvider, VfunLoginResult } from "../../shared/auth";
import type { LauncherUpdateCheckResult } from "../../shared/launcherUpdate";

import { useNotificationStore } from "@/stores/notificationStore";
import { useLauncherStore } from "@/stores/launcherStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useGameStore } from "@/stores/gameStore";
import { useAuthStore } from "@/stores/authStore";
import { computed, ref, watch } from "vue";

const props = defineProps<{
    kind: "settings" | "login";
}>();

const emit = defineEmits<{
    close: [];
    loginSuccess: [];
    loginFailed: [];
}>();

const notificationStore = useNotificationStore();
const launcherStore = useLauncherStore();
const settingsStore = useSettingsStore();
const gameStore = useGameStore();
const authStore = useAuthStore();

const loginMode = ref<AuthProvider>("vfun");
const vfunUserId = ref(settingsStore.settings.rememberedVfunId);
const vfunPassword = ref("");
const pendingOtp = ref<{
    provider: AuthProvider;
    userId: string;
} | null>(null);
const otpCode = ref("");
const launcherUpdateCheck = ref<LauncherUpdateCheckResult | null>(null);
const isCheckingLauncherUpdate = ref(false);
const isStartingLauncherUpdate = ref(false);

const title = computed(() => props.kind === "settings" ? "Game Settings" : "VFUN Login");
const isOtpStep = computed(() => !!pendingOtp.value);

const canSubmitVfunLogin = computed(() => {
    return !authStore.isLoggingIn && !!vfunUserId.value.trim() && !!vfunPassword.value;
});

const canSubmitOtp = computed(() => {
    return !authStore.isLoggingIn && /^\d{6}$/.test(otpCode.value);
});

const launcherUpdateButtonText = computed(() => {
    if (isStartingLauncherUpdate.value)
        return "Starting Update...";

    if (isCheckingLauncherUpdate.value)
        return "Checking...";

    if (launcherUpdateCheck.value?.available)
        return `Update to ${launcherUpdateCheck.value.latestVersion}`;

    return "Check Launcher Updates";
});

watch(() => settingsStore.settings.rememberedVfunId, (rememberedVfunId) => {
    if (!vfunUserId.value)
        vfunUserId.value = rememberedVfunId;
}, { immediate: true });

watch(loginMode, () => {
    pendingOtp.value = null;
    otpCode.value = "";
});

async function continueProviderLogin() {
    if (isOtpStep.value) {
        await continueOtpVerification();
        return;
    }

    if (loginMode.value === "google" || loginMode.value === "facebook" || loginMode.value === "apple") {
        await continueSnsLogin();
        return;
    }

    if (loginMode.value === "vfun") {
        await continueVfunCredentialLogin();
        return;
    }
}

async function continueSnsLogin() {
    try {
        const result = await authStore.loginWithSns(loginMode.value as SnsAuthProvider, settingsStore.settings.rememberLogin);
        await handleLoginResult(result);
    } catch {
        emit("loginFailed");
    }
}

async function continueVfunCredentialLogin() {
    try {
        const result = await authStore.loginWithVfunId({
            userId: vfunUserId.value.trim(),
            password: vfunPassword.value,
            rememberLogin: settingsStore.settings.rememberLogin
        });

        await handleLoginResult(result);
    } catch {
        emit("loginFailed");
    }
}

async function continueOtpVerification() {
    if (!pendingOtp.value)
        return;

    try {
        const session = await authStore.verifyVfunOtp({
            provider: pendingOtp.value.provider,
            userId: pendingOtp.value.userId,
            otp: otpCode.value,
            rememberLogin: settingsStore.settings.rememberLogin
        });

        await finishSuccessfulLogin(session);
    } catch {
        emit("loginFailed");
    }
}

async function finishSuccessfulLogin(session: { user: { nickname: string } }) {
    if (loginMode.value === "vfun")
        await settingsStore.updateSetting("rememberedVfunId", vfunUserId.value.trim());

    notificationStore.push({
        level: "info",
        title: "Login Successful",
        message: `Signed in as ${session.user.nickname}`
    });

    vfunPassword.value = "";
    otpCode.value = "";
    pendingOtp.value = null;

    emit("loginSuccess");
    emit("close");
}

async function handleLoginResult(result: VfunLoginResult) {
    if ("needsOtp" in result) {
        pendingOtp.value = {
            provider: result.provider,
            userId: result.userId
        };
        otpCode.value = "";

        notificationStore.push({
            level: "info",
            title: "OTP Required",
            message: "Enter the 6-digit OTP code for this account."
        });
        return;
    }

    await finishSuccessfulLogin(result);
}

async function checkLauncherUpdates() {
    if (launcherUpdateCheck.value?.available) {
        await startCheckedLauncherUpdate();
        return;
    }

    isCheckingLauncherUpdate.value = true;

    try {
        const update = await window.app.checkLauncherUpdate();
        launcherUpdateCheck.value = update;

        if (!update.available) {
            notificationStore.push({
                level: "info",
                title: "Launcher Up To Date",
                message: "No launcher update is available."
            });
            return;
        }

        notificationStore.push({
            level: "info",
            title: "Launcher Update Found",
            message: `Version ${update.latestVersion} is available. Click to update.`
        });
    } catch {
        launcherUpdateCheck.value = null;

        notificationStore.push({
            level: "error",
            title: "Update Check Failed",
            message: "Unable to check for launcher updates."
        });
    } finally {
        isCheckingLauncherUpdate.value = false;
    }
}

async function startCheckedLauncherUpdate() {
    if (!launcherUpdateCheck.value?.available)
        return;

    isStartingLauncherUpdate.value = true;

    try {
        await window.app.startLauncherUpdate(launcherUpdateCheck.value.mandatory);
    } catch {
        notificationStore.push({
            level: "error",
            title: "Update Failed",
            message: "Unable to start the launcher update."
        });
    } finally {
        isStartingLauncherUpdate.value = false;
    }
}

function updateOtpCode(event: Event) {
    const input = event.target as HTMLInputElement;
    otpCode.value = input.value.replace(/\D/g, "").slice(0, 6);
}
</script>

<template>
    <div class="modal-backdrop">
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

                <label class="check-row">
                    <input
                        type="checkbox"
                        :checked="settingsStore.settings.startOnSystemStartup"
                        @change="settingsStore.updateSetting(
                            'startOnSystemStartup',
                            ($event.target as HTMLInputElement).checked
                        )"
                    />
                    Start launcher on system startup
                </label>

                <label class="check-row">
                    <input
                        type="checkbox"
                        :checked="settingsStore.settings.startGameOnLauncherOpen"
                        @change="settingsStore.updateSetting(
                            'startGameOnLauncherOpen',
                            ($event.target as HTMLInputElement).checked
                        )"
                    />
                    Start game upon opening launcher
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

                <button
                    class="secondary-action"
                    :disabled="isCheckingLauncherUpdate || isStartingLauncherUpdate"
                    @click="checkLauncherUpdates"
                >
                    {{ launcherUpdateButtonText }}
                </button>
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
                    <template v-if="!isOtpStep">
                        <label>
                            VFUN ID
                            <input
                                v-model="vfunUserId"
                                type="text"
                                autocomplete="username"
                                placeholder="VFUN ID"
                                @keydown.enter="continueProviderLogin"
                            />
                        </label>

                        <label>
                            Password
                            <input
                                v-model="vfunPassword"
                                type="password"
                                autocomplete="current-password"
                                placeholder="Password"
                                @keydown.enter="continueProviderLogin"
                            />
                        </label>

                        <button
                            class="secondary-action"
                            :disabled="!canSubmitVfunLogin"
                            @click="continueProviderLogin"
                        >
                            {{ authStore.isLoggingIn ? "Signing in..." : "Login with VFUN ID" }}
                        </button>
                    </template>

                    <template v-else>
                        <label>
                            OTP Code
                            <input
                                v-model="otpCode"
                                type="text"
                                inputmode="numeric"
                                maxlength="6"
                                autocomplete="one-time-code"
                                placeholder="6-digit code"
                                @input="updateOtpCode"
                                @keydown.enter="continueProviderLogin"
                            />
                        </label>

                        <button
                            class="secondary-action"
                            :disabled="!canSubmitOtp"
                            @click="continueProviderLogin"
                        >
                            {{ authStore.isLoggingIn ? "Verifying..." : "Verify OTP" }}
                        </button>

                        <button
                            class="text-action"
                            :disabled="authStore.isLoggingIn"
                            @click="pendingOtp = null; otpCode = ''"
                        >
                            Back to login
                        </button>
                    </template>
                </div>

                <div v-else class="login-provider-panel">
                    <template v-if="!isOtpStep">
                        <p>
                            Continue with {{ loginMode.charAt(0).toUpperCase() + loginMode.slice(1) }} in the secure VFUN login window.
                        </p>

                        <button
                            class="secondary-action"
                            :disabled="authStore.isLoggingIn"
                            @click="continueProviderLogin"
                        >
                            {{ authStore.isLoggingIn ? "Signing in..." : "Continue" }}
                        </button>
                    </template>

                    <template v-else>
                        <label>
                            OTP Code
                            <input
                                v-model="otpCode"
                                type="text"
                                inputmode="numeric"
                                maxlength="6"
                                autocomplete="one-time-code"
                                placeholder="6-digit code"
                                @input="updateOtpCode"
                                @keydown.enter="continueProviderLogin"
                            />
                        </label>

                        <button
                            class="secondary-action"
                            :disabled="!canSubmitOtp"
                            @click="continueProviderLogin"
                        >
                            {{ authStore.isLoggingIn ? "Verifying..." : "Verify OTP" }}
                        </button>
                    </template>
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
