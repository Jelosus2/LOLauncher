import Winreg from "winreg";

const gameRegistry = new Winreg({
    hive: Winreg.HKCU,
    key: "\\SOFTWARE\\Valofe\\lastorigin-gl"
});

function getRegistryValue(name: string) {
    return new Promise<string | null>((resolve) => {
        gameRegistry.get(name, (error, item) => {
            if (error || !item) {
                resolve(null);
                return;
            }

            resolve(item.value);
        });
    });
}

export function getRegistryGameInstallPath() {
    return getRegistryValue("PATH");
}

export function getRegistryGameVersion() {
    return getRegistryValue("VERSION");
}

export function setRegistryGameVersion(version: number) {
    const hexVersion = `0x${version.toString(16)}`;

    return new Promise<void>((resolve, reject) => {
        gameRegistry.set("VERSION", Winreg.REG_DWORD, hexVersion, (error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        })
    });
}
