import type { MaintenanceApiResponse, MaintenanceStatus } from "../../shared/maintenance.js";

const maintenanceEndpoint = "https://api.valofe.com/v1/vlauncher/check_maintenance";
const serviceCode = "lastorigin-gl";

export class RestrictedCountryError extends Error {
    constructor(public readonly status: MaintenanceStatus) {
        super(status.message);
        this.name = "RestrictedCountryError";
    }
}

export class MaintenanceError extends Error {
    constructor(public readonly status: MaintenanceStatus) {
        super(status.message);
        this.name = "MaintenanceError";
    }
}

export async function checkMaintenanceStatus(): Promise<MaintenanceStatus> {
    const response = await fetch(maintenanceEndpoint, {
        method: "POST",
        headers: {
            "Accept": "*/*",
            "Content-Type": "application/x-www-form-urlencoded",
            "Referer": "https://vfun.valofe.com",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.134 Safari/537.36 Chrome"
        },
        body: new URLSearchParams({
            service_code: serviceCode
        })
    });

    if (!response.ok)
        throw new Error(`Maintenance check failed: HTTP ${response.status}`);

    const data = await response.json() as MaintenanceApiResponse;

    const isMaintenance = data.isMT === 1;
    const isRestrictedCountry = data.play === false;

    return {
        isMaintenance,
        canPlay: !isMaintenance && !isRestrictedCountry,
        isRestrictedCountry,
        message: getMaintenanceMessage(isMaintenance, isRestrictedCountry)
    };
}

export async function assertCanInstallOrPatch() {
    const status = await checkMaintenanceStatus();

    if (status.isRestrictedCountry)
        throw new RestrictedCountryError(status);

    return status;
}

export async function assertCanLaunchGame() {
    const status = await checkMaintenanceStatus();

    if (status.isRestrictedCountry)
        throw new RestrictedCountryError(status);
    if (status.isMaintenance)
        throw new MaintenanceError(status);

    return status;
}

function getMaintenanceMessage(isMaintenance: boolean, isRestrictedCountry: boolean) {
    if (isRestrictedCountry)
        return "This game is not available in your country or region.";
    if (isMaintenance)
        return "The game is currently under maintenance.";

    return "";
}
