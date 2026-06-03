import type { VfunCredentialLoginRequest, VfunOtpVerifyRequest } from "../../../shared/auth.js";
import type { IpcMainInvokeEvent } from "electron";

import { clearAuthSession, loadAuthSession, toPublicAuthSession } from "../../auth/authStorageService.js";
import { loginWithGoogle, loginWithVfunId, verifyVfunOtp } from "../../auth/vfunAuthService.js";
import { IpcHandle } from "../ipcDecorators.js";

export class AuthController {
    @IpcHandle("auth:login-google")
    loginGoogle(_event: IpcMainInvokeEvent, rememberLogin: boolean) {
        return loginWithGoogle(rememberLogin);
    }

    @IpcHandle("auth:login-vfun")
    loginVfun(_event: IpcMainInvokeEvent, request: VfunCredentialLoginRequest) {
        return loginWithVfunId(request);
    }

    @IpcHandle("auth:verify-vfun-otp")
    verifyVfunOtp(_event: IpcMainInvokeEvent, request: VfunOtpVerifyRequest) {
        return verifyVfunOtp(request);
    }

    @IpcHandle("auth:get-session")
    async getSession() {
        const session = await loadAuthSession();
        return session ? toPublicAuthSession(session) : null;
    }

    @IpcHandle("auth:logout")
    logout() {
        return clearAuthSession();
    }
}
