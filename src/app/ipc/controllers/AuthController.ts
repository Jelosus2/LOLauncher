import type { VfunCredentialLoginRequest, VfunOtpVerifyRequest, SnsLoginRequest } from "../../../shared/auth.js";
import type { IpcMainInvokeEvent } from "electron";

import { clearAuthSession, loadAuthSession, toPublicAuthSession } from "../../auth/authStorageService.js";
import { loginWithSns, loginWithVfunId, verifyVfunOtp } from "../../auth/vfunAuthService.js";
import { IpcHandle } from "../ipcDecorators.js";

export class AuthController {
    @IpcHandle("auth:login-sns")
    loginSns(_event: IpcMainInvokeEvent, request: SnsLoginRequest) {
        return loginWithSns(request);
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
