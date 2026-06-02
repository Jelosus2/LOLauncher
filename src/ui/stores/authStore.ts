import type { AuthSession } from "../../shared/auth";

import { reportError } from "@/services/errorReporter";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useAuthStore = defineStore("auth", () => {
    const session = ref<AuthSession | null>(null);
    const isLoggingIn = ref(false);
    const isLoaded = ref(false);

    async function loadSession() {
        try {
            session.value = await window.app.getAuthSession();
        } catch (error) {
            session.value = null;

            await reportError({
                title: "Login Session Not Loaded",
                message: "Unable to restore the saved VFUN login.",
                context: "authStore.loadSession",
                error
            });
        } finally {
            isLoaded.value = true;
        }
    }

    async function loginWithGoogle(rememberLogin: boolean) {
        isLoggingIn.value = true;

        try {
            session.value = await window.app.loginWithGoogle(rememberLogin);
            return session.value;
        } catch (error) {
            await reportError({
                title: "Google Login Failed",
                message: "Unable to sign in with Google.",
                context: "authStore.loginWithGoogle",
                error
            });

            throw error;
        } finally {
            isLoggingIn.value = false;
        }
    }

    async function logout() {
        await window.app.logout();
        session.value = null;
    }

    return {
        session,
        isLoggingIn,
        isLoaded,
        loadSession,
        loginWithGoogle,
        logout
    };
});
