import { ipcMain, type IpcMainInvokeEvent } from "electron";

type IpcHandler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown | Promise<unknown>;
type IpcRoute = { channel: string; methodName: string | symbol };

const routesByController = new WeakMap<(...args: unknown[]) => unknown, IpcRoute[]>();
const registeredChannels = new Set<string>();

export function IpcHandle(channel: string): MethodDecorator {
    return (target, methodName, descriptor) => {
        if (typeof descriptor.value !== "function")
            throw new Error(`@IpcHandle can only decorate methods: ${String(methodName)}`);

        const controller = target.constructor as (...args: unknown[]) => unknown;
        const routes = routesByController.get(controller) ?? [];

        routes.push({ channel, methodName });
        routesByController.set(controller, routes);
    };
}

export function registerIpcController(controller: object) {
    const routes = routesByController.get(controller.constructor as (...args: unknown[]) => unknown) ?? [];

    for (const route of routes) {
        if (registeredChannels.has(route.channel))
            throw new Error(`IPC channel already registered: ${route.channel}`);

        const handler = controller[route.methodName as keyof typeof controller];
        if (typeof handler !== "function")
            throw new Error(`Invalid IPC handler: ${String(route.methodName)}`);

        ipcMain.handle(route.channel, (handler as IpcHandler).bind(controller));
        registeredChannels.add(route.channel);
    }
}
