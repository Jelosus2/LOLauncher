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
