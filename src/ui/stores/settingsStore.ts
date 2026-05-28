import { defaultLauncherSettings, type LauncherSettings} from "../../shared/settings";
import { reportError } from "@/services/errorReporter";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useSettingsStore = defineStore("settings", () => {
    const settings = ref<LauncherSettings>({ ...defaultLauncherSettings });
    const isLoaded = ref(false);
    const isSaving = ref(false);

    async function loadSettings() {
        if (isLoaded.value) return;

        try {
            settings.value = await window.app.getSettings();
        } catch (error) {
            await reportError({
                title: "Settings Not Loaded",
                message: "Unable to load launcher settings.",
                context: "settingsStore.loadSettings",
                error
            });
        } finally {
            isLoaded.value = true;
        }
    }

    async function updateSetting<K extends keyof LauncherSettings>(key: K, value: LauncherSettings[K]) {
        const previousSettings = { ...settings.value };

        settings.value[key] = value;
        isSaving.value = true;

        try {
            settings.value = await window.app.updateSettings({ [key]: value });
        } catch (error) {
            settings.value = previousSettings;

            await reportError({
                title: "Settings Not Saved",
                message: "Unable to save launcher settings.",
                context: "settingsStore.updateSetting",
                error
            });
        } finally {
            isSaving.value = false;
        }
    }

    return {
        settings,
        isLoaded,
        isSaving,
        loadSettings,
        updateSetting
    };
});
