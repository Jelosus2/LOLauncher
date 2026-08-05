import type { ProtocolLaunchGameRequest, ProtocolLaunchResult } from "../../../shared/protocol.js";
import type { IpcMainInvokeEvent } from "electron";

import { consumeProtocolLaunchGameRequest, reportProtocolLaunchResult } from "../../lifecycle/protocolManager.js";
import { IpcHandle } from "../ipcDecorators.js";

export class ProtocolController {
    @IpcHandle("protocol:consume-launch-game-request")
    consumeLaunchGameRequest() {
        return consumeProtocolLaunchGameRequest();
    }

    @IpcHandle("protocol:report-launch-result")
    reportLaunchResult(_event: IpcMainInvokeEvent, request: ProtocolLaunchGameRequest | undefined, result: ProtocolLaunchResult) {
        return reportProtocolLaunchResult(request, result);
    }
}
