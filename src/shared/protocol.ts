export type ProtocolLaunchGameRequest = {
    callbackUrl?: string;
};

export type ProtocolLaunchResultStatus = "started" | "failed";

export type ProtocolLaunchFailureReason =
    | "launcher_update_required"
    | "game_not_installed"
    | "game_update_required"
    | "service_unavailable"
    | "maintenance"
    | "login_canceled"
    | "game_already_running"
    | "launch_canceled"
    | "launch_failed";

export type ProtocolLaunchResult = {
    status: ProtocolLaunchResultStatus;
    reason?: ProtocolLaunchFailureReason;
};
