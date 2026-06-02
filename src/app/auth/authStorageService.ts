import type { AuthSession, StoredAuthSession } from "../../shared/auth.js";

import { ensureFreshAuthSession } from "./vfunAuthService.js";
import { getAuthSessionPath } from "../shared/paths.js";
import { safeStorage } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

let memorySession: StoredAuthSession | null = null;

export function setMemoryAuthSession(session: StoredAuthSession | null) {
    memorySession = session;
}

export function toPublicAuthSession(session: StoredAuthSession): AuthSession {
    return {
        provider: session.provider,
        user: session.user,
        accessTokenExpiresAt: session.accessTokenExpiresAt
    };
}

export async function saveAuthSession(session: StoredAuthSession) {
    if (!safeStorage.isEncryptionAvailable())
        throw new Error("Secure credential storage is not available.");

    const filePath = getAuthSessionPath();
    const encrypted = safeStorage.encryptString(JSON.stringify(session));

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, encrypted);
}

export async function loadAuthSession() {
    if (memorySession)
        return ensureFreshAuthSession(memorySession);

    if (!safeStorage.isEncryptionAvailable())
        return null;

    try {
        const encrypted = await fs.readFile(getAuthSessionPath());
        const decrypted = safeStorage.decryptString(encrypted);
        const session = JSON.parse(decrypted) as StoredAuthSession;

        memorySession = session;
        return ensureFreshAuthSession(session);
    } catch {
        return null;
    }
}

export async function clearAuthSession() {
    memorySession = null;
    await fs.rm(getAuthSessionPath(), { force: true }).catch(() => {});
}
