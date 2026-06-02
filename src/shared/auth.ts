export type VfunUserInfo = {
    userId: string;
    userSerial: string;
    nickname: string;
    birthday: string;
    email: string;
    firstName: string;
    lastName: string;
};

export type VfunTokenResponse = {
    accessToken: string;
    refreshToken: string;
    expiresIn: number | null;
};

export type AuthSession = {
    provider: "google";
    user: VfunUserInfo;
    accessTokenExpiresAt?: number | null;
};

export type StoredAuthSession = AuthSession & {
    tokens: VfunTokenResponse;
    rememberLogin: boolean;
};
