import { useNotificationStore } from "../stores/notificationStore";

function serializeError(error: unknown) {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack
        };
    }

    return error;
}

export async function reportError(options: {
    title: string;
    message: string;
    context: string;
    error?: unknown;
}) {
    const notifications = useNotificationStore();

    notifications.push({
        level: "error",
        title: options.title,
        message: options.message
    });

    await window.app.logMessage({
        level: "error",
        message: options.message,
        context: options.context,
        details: serializeError(options.error)
    });
}

export async function reportMessage(options: {
    level: "info" | "warn" | "error";
    title: string;
    message: string;
    context?: string;
    details?: unknown;
}) {
    const notifications = useNotificationStore();

    notifications.push({
        level: options.level,
        title: options.title,
        message: options.message
    });

    try {
        await window.app.logMessage({
            level: options.level,
            message: options.message,
            context: options.context,
            details: options.details
        });
    } catch {}
}
