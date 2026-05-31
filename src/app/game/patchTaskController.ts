export class PatchTaskCanceledError extends Error {
    constructor() {
        super("Patch task canceled.");
        this.name = "PatchTaskCanceledError";
    }
}

class PatchTaskController {
    private abortController: AbortController | null = null;
    private pausePromise: Promise<void> | null = null;
    private resumePausedTask: (() => void) | null = null;
    private paused = false;

    start() {
        this.abortController = new AbortController();
        this.paused = false;
        this.pausePromise = null;
        this.resumePausedTask = null;

        return this.abortController.signal;
    }

    finish() {
        this.abortController = null;
        this.paused = false;
        this.resumePausedTask?.();
        this.resumePausedTask = null;
        this.pausePromise = null;
    }

    pause() {
        if (!this.abortController || this.paused)
            return;

        this.paused = true;
        this.pausePromise = new Promise((resolve) => {
            this.resumePausedTask = resolve;
        });
    }

    resume() {
        if (!this.paused)
            return;

        this.paused = false;
        this.resumePausedTask?.();
        this.resumePausedTask = null;
        this.pausePromise = null;
    }

    cancel() {
        this.abortController?.abort();
        this.resume();
    }

    isPaused() {
        return this.paused;
    }

    async checkpoint() {
        if (this.abortController?.signal.aborted)
            throw new PatchTaskCanceledError();

        if (this.pausePromise)
            await this.pausePromise;

        if (this.abortController?.signal.aborted)
            throw new PatchTaskCanceledError();
    }
}

export const patchTaskController = new PatchTaskController();
