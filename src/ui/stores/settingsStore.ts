import { defaultLauncherSettings, type LauncherSettings} from "../../shared/settings";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useSettingsStore = defineStore("settings", () => {
    const settings = ref<LauncherSettings>({ ...defaultLauncherSettings });
    const isLoaded = ref(false);
    const isSaving = ref(false);
    const errorMessage = ref("");

    async function loadSettings() {
        if (isLoaded.value) return;

        try {
            settings.value = await window.app.getSettings();
            errorMessage.value = "";
        } catch {
            errorMessage.value = "Unable to load settings.";
        } finally {
            isLoaded.value = true;
        }
    }

    async function updateSetting<K extends keyof LauncherSettings>(key: K, value: LauncherSettings[K]) {
        settings.value[key] = value;
        isSaving.value = true;

        try {
            settings.value = await window.app.updateSettings({ [key]: value });
            errorMessage.value = "";
        } catch {
            errorMessage.value = "Unable to save settings.";
        } finally {
            isSaving.value = false;
        }
    }

    return {
        settings,
        isLoaded,
        isSaving,
        errorMessage,
        loadSettings,
        updateSetting
    };
});
