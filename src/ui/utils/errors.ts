export function getCleanErrorMessage(error: unknown, fallback: string) {
    if (!(error instanceof Error) || !error.message) {
        return fallback;
    }

    return cleanIpcErrorMessage(error.message) || fallback;
}

function cleanIpcErrorMessage(message: string) {
    return message
        .replace(/^Error invoking remote method '[^']+':\s*/i, "")
        .replace(/^Error:\s*/i, "")
        .trim();
}

export function isStorageError(error: unknown) {
    const message = getCleanErrorMessage(error, "").toLowerCase();

    return message.includes("not enough storage");
}
