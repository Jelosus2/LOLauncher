export type GameVersionInfo = {
    gameVersion: string | null;
    patchVersion: number | null;
};

export type GameLaunchResult = {
    started: boolean;
    canceled?: boolean;
};

export type GameLaunchRequest = {
    quitAfterStart?: boolean;
    protocolRequest?: import("./protocol.js").ProtocolLaunchGameRequest;
};
