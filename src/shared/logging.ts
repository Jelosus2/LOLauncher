export type LogLevel = "info" | "warn" | "error";

export type LogPayload = {
    level: LogLevel;
    message: string;
    context?: string;
    details?: unknown;
};
