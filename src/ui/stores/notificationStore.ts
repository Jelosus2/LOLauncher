import { defineStore } from "pinia";
import { ref } from "vue";

export type AppNotification = {
    id: number;
    level: "info" | "warn" | "error";
    title: string;
    message: string;
};

let nextId = 1;

export const useNotificationStore = defineStore("notifications", () => {
    const notifications = ref<AppNotification[]>([]);

    function push(notification: Omit<AppNotification, "id">) {
        const item = { id: nextId++, ...notification };
        notifications.value.push(item);

        setTimeout(() => {
            dismiss(item.id);
        }, 8000);
    }

    function dismiss(id: number) {
        notifications.value = notifications.value.filter((item) => item.id !== id);
    }

    return { notifications, push, dismiss };
});
