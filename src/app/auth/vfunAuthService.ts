import type { AuthSession, AuthProvider, StoredAuthSession, VfunTokenResponse, VfunUserInfo, VfunCredentialLoginRequest, VfunLoginResult, VfunOtpVerifyRequest } from "../../shared/auth.js";

import { saveAuthSession, setMemoryAuthSession, toPublicAuthSession } from "./authStorageService.js";
import { BrowserWindow } from "electron";
import { exec } from "node:child_process";
import crypto from "node:crypto";
import http from "node:http";

type LauncherCallbackQuery = {
    auth_code?: string;
    vfun_use_otp?: string;
    user_id?: string;
    sns_type?: string;
};

type TokenApiResponse = {
    result: number;
    msg: string;
    data?: {
        "L-Access-Token": string;
        "L-Refresh-Token": string;
    };
};

type UserInfoApiResponse = {
    result: number;
    msg: string;
    data?: {
        user_id: string;
        user_serial: string;
        nickName: string;
        birthday: string;
        email: string;
        f_name: string;
        l_name: string;
    };
};

type RefreshTokenApiResponse = {
    result: number;
};

type MakeAuthCodeApiResponse = {
    result: number;
    msg: string;
    data?: {
        auth_code: string;
    };
};

type VfunLoginApiResponse = {
    result: number;
    msg?: string;
    data?: {
        user_id: string;
        nickName: string;
    };
};

type VfunOtpVerifyApiResponse = {
    result: number;
    msg?: string;
    data?: {
        user_id: string;
        nickName: string;
    };
};

const callbackPort = 5096;
const callbackHost = "127.0.0.1";
const googleLoginUrl = "https://vfun.valofe.com/membership/launcher_signin?snstype=G&device=launcher";
const vfunLoginResultCodes = {
    success: 1,
    accountMissing: -109,
    invalidCredentials: -96,
    otpRequired: 4073,
    otpFailed: 4076
} as const;

let cachedDeviceId: string | null = null;
let pendingDeviceId: Promise<string> | null = null;

export async function loginWithGoogle(rememberLogin: boolean): Promise<VfunLoginResult> {
    const callbackPromise = waitForLauncherCallback();
    const authWindow = createAuthWindow();

    authWindow.loadURL(googleLoginUrl);

    try {
        const callback = await callbackPromise;
        authWindow.close();

        if (!callback.auth_code)
            throw new Error("Google login callback did not include auth_code.");

        if (callback.vfun_use_otp === "1") {
            if (!callback.user_id)
                throw new Error("Google OTP callback did not include user_id.");

            return {
                needsOtp: true,
                provider: "google",
                userId: callback.user_id
            };
        }

        const tokens = await getVfunToken(callback.auth_code);
        const user = await getVfunUserInfo(tokens.accessToken);

        const session: StoredAuthSession = {
            provider: "google",
            user,
            tokens,
            accessTokenExpiresAt: tokens.expiresIn,
            rememberLogin
        };

        await persistAuthSession(session);
        return toPublicAuthSession(session);
    } catch (error) {
        if (!authWindow.isDestroyed())
            authWindow.close();

        throw error;
    }
}

export async function loginWithVfunId(request: VfunCredentialLoginRequest): Promise<VfunLoginResult> {
    const response = await fetch("https://external-api.valofe.com/api/vfun/login", {
        method: "POST",
        headers: {
            ...getVfunHeaders(),
            "Device": "launcher",
            "Content-Type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify({
            service_code: "vfun",
            input_user_id: request.userId,
            input_user_password: request.password
        })
    });

    if (!response.ok)
        throw new Error(`VFUN login request failed: HTTP ${response.status}`);

    const data = await response.json() as VfunLoginApiResponse;

    if (data.result === vfunLoginResultCodes.otpRequired) {
         if (!data.data?.user_id)
            throw new Error("VFUN OTP login response did not include a user id.");

        return {
            needsOtp: true,
            provider: "vfun",
            userId: data.data.user_id
        };
    }

    if (data.result === vfunLoginResultCodes.accountMissing)
        throw new Error("The VFUN account does not exist.");
    if (data.result === vfunLoginResultCodes.invalidCredentials)
        throw new Error("The VFUN ID or password is incorrect.");
    if (data.result !== vfunLoginResultCodes.success || !data.data)
        throw new Error("VFUN login failed.");

    const setCookieHeaders = response.headers.getSetCookie();
    const tokens = getVfunTokensFromSetCookie(setCookieHeaders, "login");

    const session = createStoredVfunSession({
        provider: "vfun",
        userId: data.data.user_id,
        nickname: data.data.nickName || "User",
        tokens,
        rememberLogin: request.rememberLogin
    });

    await persistAuthSession(session);
    return toPublicAuthSession(session);
}

export async function verifyVfunOtp(request: VfunOtpVerifyRequest): Promise<AuthSession> {
    const response = await fetch("https://external-api.valofe.com/api/vfun/otp/verify_otp", {
        method: "POST",
        headers: {
            ...getVfunHeaders(),
            "Device": "launcher",
            "Content-Type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify({
            otp: request.otp,
            user_id: request.userId
        })
    });

    if (!response.ok)
        throw new Error(`VFUN OTP verification failed: HTTP ${response.status}`);

    const data = await response.json() as VfunOtpVerifyApiResponse;

    if (data.result === vfunLoginResultCodes.otpFailed)
        throw new Error("The OTP code is incorrect.");
    if (data.result !== vfunLoginResultCodes.success)
        throw new Error("VFUN OTP verification failed.");

    const setCookieHeaders = response.headers.getSetCookie();
    const tokens = getVfunTokensFromSetCookie(setCookieHeaders, "OTP verification");

    const session = createStoredVfunSession({
        provider: request.provider,
        userId: data.data?.user_id || request.userId,
        nickname: data.data?.nickName || "User",
        tokens,
        rememberLogin: request.rememberLogin
    });

    await persistAuthSession(session);
    return toPublicAuthSession(session);
}

export async function ensureFreshAuthSession(session: StoredAuthSession): Promise<StoredAuthSession> {
    if (!shouldRefreshAccessToken(session))
        return session;

    const refreshedTokens = await refreshVfunToken(session.tokens.refreshToken);

    const refreshedSession: StoredAuthSession = {
        ...session,
        tokens: refreshedTokens,
        accessTokenExpiresAt: refreshedTokens.expiresIn
    };

    await persistAuthSession(refreshedSession);
    return refreshedSession;
}

export async function createGameLaunchAuthCode(session: StoredAuthSession) {
    const deviceId = await getSessionDeviceId();

    const response = await fetch("https://external-api.valofe.com/api/vfun/make_auth_code", {
        method: "POST",
        headers: {
            ...getVfunHeaders(),
            "Cookie": buildVfunCookie(session.tokens.accessToken, deviceId),
            "Content-Type": "application/json; charset=UTF-8"
        }
    });

    if (!response.ok)
        throw new Error(`VFUN game auth code request failed: HTTP ${response.status}`);

    const data = await response.json() as MakeAuthCodeApiResponse;
    if (data.msg !== "success" || data.result !== 1 || !data.data)
        throw new Error("VFUN game auth code request failed.");

    return data.data.auth_code;
}

function waitForLauncherCallback() {
    return new Promise<LauncherCallbackQuery>((resolve, reject) => {
        const timeout = setTimeout(() => {
            server.close();
            reject(new Error("Google login timed out."));
        }, 300_000);

        const server = http.createServer((request, response) => {
            try {
                const requestUrl = new URL(request.url ?? "/", `http://${callbackHost}:${callbackPort}`);
                const query: LauncherCallbackQuery = {
                    auth_code: requestUrl.searchParams.get("auth_code") ?? undefined,
                    vfun_use_otp: requestUrl.searchParams.get("vfun_use_otp") ?? undefined,
                    user_id: requestUrl.searchParams.get("user_id") ?? undefined,
                    sns_type: requestUrl.searchParams.get("sns_type") ?? undefined
                };

                response.writeHead(200, {
                    "Content-Type": "text/html; charset=utf-8"
                });

                response.end(`
                    <!doctype html>
                    <html>
                        <body style="font-family: sans-serif; background: #111; color: #fff;">
                            <h3>Login complete</h3>
                            <p>You can close this window.</p>
                        </body>
                    </html>
                `);

                clearTimeout(timeout);
                server.close();

                resolve(query);
            } catch (error) {
                clearTimeout(timeout);
                server.close();
                reject(error);
            }
        });

        server.once("error", (error) => {
            clearTimeout(timeout);
            reject(error);
        });

        server.listen(callbackPort, callbackHost);
    });
}

function createAuthWindow() {
    return new BrowserWindow({
        width: 520,
        height: 720,
        title: "VFUN Google Login",
        resizable: false,
        minimizable: true,
        maximizable: false,
        modal: false,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            partition: `temporary:v-fun-google-login-${crypto.randomUUID()}`
        }
    });
}

async function getVfunToken(authCode: string): Promise<VfunTokenResponse> {
    const response = await fetch(`https://external-api.valofe.com/api/vfun/get_token?auth_code=${encodeURIComponent(authCode)}`, {
        headers: getVfunHeaders()
    });

    if (!response.ok)
        throw new Error(`VFUN token request failed: HTTP ${response.status}`);

    const data = await response.json() as TokenApiResponse;
    if (data.msg !== "success" || data.result !== 1 || !data.data)
        throw new Error(data.msg || "VFUN user info request failed.");

    const accessToken = data.data["L-Access-Token"];
    if (!accessToken)
        throw new Error("VFUN token response did not include an access token.");

    return {
        accessToken,
        refreshToken: data.data["L-Refresh-Token"],
        expiresIn: getJwtExpiration(accessToken)
    };
}

async function getVfunUserInfo(accessToken: string): Promise<VfunUserInfo> {
    const deviceId = await getSessionDeviceId();

    const response = await fetch("https://external-api.valofe.com/api/vfun/get_user_info", {
        method: "POST",
        headers: {
            ...getVfunHeaders(),
            "Cookie": buildVfunCookie(accessToken, deviceId),
            "Content-Type": "application/json; charset=UTF-8"
        }
    });

    if (!response.ok)
        throw new Error(`VFUN user info request failed: HTTP ${response.status}`);

    const data = await response.json() as UserInfoApiResponse;
    if (data.msg !== "success" || data.result !== 1 || !data.data)
        throw new Error(data.msg || "VFUN user info request failed.");

    return {
        userId: data.data.user_id,
        nickname: data.data.nickName || "User"
    };
}

async function refreshVfunToken(refreshToken: string): Promise<VfunTokenResponse> {
    const deviceId = await getSessionDeviceId();

    const response = await fetch("https://external-api.valofe.com/api/vfun/refresh_token", {
        method: "POST",
        headers: {
            ...getVfunHeaders(),
            "Cookie": buildVfunRefreshCookie(refreshToken, deviceId),
            "Content-Type": "application/json; charset=UTF-8"
        }
    });

    if (!response.ok)
        throw new Error(`VFUN token refresh failed: HTTP ${response.status}`);

    const data = await response.json() as RefreshTokenApiResponse;
    if (data.result !== 1)
        throw new Error("VFUN token refresh failed.");

    const setCookieHeaders = response.headers.getSetCookie();
    return getVfunTokensFromSetCookie(setCookieHeaders, "token refresh");
}

function getVfunTokensFromSetCookie(setCookieHeaders: string[], label: string): VfunTokenResponse {
    const accessToken = getCookieValue(setCookieHeaders, "L-Access-Token");
    const refreshToken = getCookieValue(setCookieHeaders, "L-Refresh-Token");

    if (!accessToken || !refreshToken)
        throw new Error(`VFUN ${label} response did not include session tokens.`);

    return {
        accessToken,
        refreshToken,
        expiresIn: getJwtExpiration(accessToken)
    };
}

function createStoredVfunSession(input: {
    provider: AuthProvider,
    userId: string;
    nickname: string;
    tokens: VfunTokenResponse;
    rememberLogin: boolean;
}): StoredAuthSession {
    return {
        provider: input.provider,
        user: {
            userId: input.userId,
            nickname: input.nickname
        },
        tokens: input.tokens,
        accessTokenExpiresAt: input.tokens.expiresIn,
        rememberLogin: input.rememberLogin
    };
}

async function persistAuthSession(session: StoredAuthSession) {
    setMemoryAuthSession(session);

    if (session.rememberLogin)
        await saveAuthSession(session);
}

function shouldRefreshAccessToken(session: StoredAuthSession) {
    const expiresAt = session.tokens.expiresIn ?? session.accessTokenExpiresAt;
    if (!expiresAt)
        return true;

    const refreshSkewSeconds = 300;
    const nowSeconds = Math.floor(Date.now() / 1000);

    return expiresAt <= nowSeconds + refreshSkewSeconds;
}

function getCookieValue(setCookieHeaders: string[], cookieName: string) {
    for (const header of setCookieHeaders) {
        const [nameValue] = header.split(";");
        const separatorIndex = nameValue.indexOf("=");

        if (separatorIndex === -1)
            continue;

        const name = nameValue.slice(0, separatorIndex).trim();
        const value = nameValue.slice(separatorIndex + 1).trim();

        if (name === cookieName)
            return value;
    }

    return null;
}

function getVfunHeaders() {
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML,like Gecko) Chrome/103.0.5060.134 Safari/537.36 Chrome",
        "Accept": "*/*",
        "Referer": "https://vfun.valofe.com"
    };
}

function buildVfunCookie(accessToken: string, deviceId: string) {
    return [
        `L-Access-Token=${accessToken}`,
        "Device=launcher",
        `Device-Id=${deviceId}`
    ].join("; ");
}

function buildVfunRefreshCookie(refreshToken: string, deviceId: string) {
    return [
        `L-Refresh-Token=${refreshToken}`,
        "Device=launcher",
        `Device-Id=${deviceId}`
    ].join("; ");
}

function getJwtExpiration(token: string) {
    const [, payload] = token.split(".");
    if (!payload)
        return null;

    try {
        const normalizedPayload = payload
            .replaceAll("-", "+")
            .replaceAll("_", "/")
            .padEnd(Math.ceil(payload.length / 4) * 4, "=");

        const decoded = JSON.parse(Buffer.from(normalizedPayload, "base64").toString("utf8"));
        return typeof decoded.exp === "number" ? decoded.exp : null;
    } catch {
        return null;
    }
}

async function getSessionDeviceId() {
    if (cachedDeviceId)
        return cachedDeviceId;

    if (pendingDeviceId)
        return pendingDeviceId;

    pendingDeviceId = getHardwareMac()
        .then((deviceId) => {
            if (!deviceId)
                throw new Error("Could not find the device id.");

            cachedDeviceId = deviceId;
            return deviceId;
        })
        .finally(() => {
            pendingDeviceId = null;
        });

    return pendingDeviceId;
}

function getHardwareMac() {
    return new Promise<string | null>((resolve) => {
        const cmd = `powershell -Command "Get-CimInstance Win32_NetworkAdapter | Where-Object { $_.PhysicalAdapter -eq $true -and $_.AdapterType -like '*Ethernet*' } | Select-Object -ExpandProperty MACAddress"`;
        exec(cmd, (error, stdout) => {
            if (error || !stdout.trim()) {
                resolve(null);
                return;
            }

            const rawMac = stdout.trim().split('\n')[0].trim();
            const formattedMac = rawMac.toUpperCase().replace(/[:.]/g, '-');
            resolve(formattedMac);
        });
    });
}
