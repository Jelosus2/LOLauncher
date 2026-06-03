export type VfunUserInfo = {
    userId: string;
    nickname: string;
};

export type VfunTokenResponse = {
    accessToken: string;
    refreshToken: string;
    expiresIn: number | null;
};

export type SnsAuthProvider = "google" | "facebook" | "apple";
export type AuthProvider = "vfun" | SnsAuthProvider;

export type VfunCredentialLoginRequest = {
    userId: string;
    password: string;
    rememberLogin: boolean;
};

export type AuthOtpChallenge = {
    needsOtp: true;
    provider: AuthProvider;
    userId: string;
};

export type VfunOtpVerifyRequest = {
    provider: AuthProvider;
    userId: string;
    otp: string;
    rememberLogin: boolean;
};

export type VfunLoginResult = AuthSession | AuthOtpChallenge;

export type SnsLoginRequest = {
    provider: SnsAuthProvider;
    rememberLogin: boolean;
};

export type AuthSession = {
    provider: AuthProvider;
    user: VfunUserInfo;
    accessTokenExpiresAt?: number | null;
};

export type StoredAuthSession = AuthSession & {
    tokens: VfunTokenResponse;
    rememberLogin: boolean;
};
