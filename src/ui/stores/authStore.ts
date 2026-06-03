import type { AuthSession, VfunCredentialLoginRequest, VfunOtpVerifyRequest } from "../../shared/auth";

import { reportError } from "@/services/errorReporter";
import { getCleanErrorMessage } from "@/utils/errors";
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
            const result = await window.app.loginWithGoogle(rememberLogin);
            if ("needsOtp" in result)
                return result;

            session.value = result;
            return result;
        } catch (error) {
            await reportError({
                title: "Google Login Failed",
                message: getCleanErrorMessage(error, "Unable to sign in with Google."),
                context: "authStore.loginWithGoogle",
                error
            });

            throw error;
        } finally {
            isLoggingIn.value = false;
        }
    }

    async function loginWithVfunId(request: VfunCredentialLoginRequest) {
        isLoggingIn.value = true;

        try {
            const result = await window.app.loginWithVfunId(request);
            if ("needsOtp" in result)
                return result;

            session.value = result;
            return result;
        } catch (error) {
            await reportError({
                title: "VFUN Login Failed",
                message: getCleanErrorMessage(error, "The VFUN ID or password is incorrect."),
                context: "authStore.loginWithVfunId",
                error
            });

            throw error;
        } finally {
            isLoggingIn.value = false;
        }
    }

    async function verifyVfunOtp(request: VfunOtpVerifyRequest) {
        isLoggingIn.value = true;

        try {
            session.value = await window.app.verifyVfunOtp(request);
            return session.value;
        } catch (error) {
            await reportError({
                title: "OTP Verification Failed",
                message: getCleanErrorMessage(error, "The OTP code is incorrect."),
                context: "authStore.verifyVfunOtp",
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
        loginWithVfunId,
        verifyVfunOtp,
        logout
    };
});
