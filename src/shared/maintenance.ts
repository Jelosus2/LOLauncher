export type MaintenanceStatus = {
    isMaintenance: boolean;
    canPlay: boolean;
    isRestrictedCountry: boolean;
    message: string;
};

export type MaintenanceApiResponse = {
    isMT: number;
    play: boolean;
    msg?: string;
};
