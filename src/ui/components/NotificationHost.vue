<script setup lang="ts">
import { useNotificationStore } from "../stores/notificationStore";

const notificationStore = useNotificationStore();
</script>

<template>
    <div class="notification-host">
        <article
            v-for="notification in notificationStore.notifications"
            :key="notification.id"
            class="notification-card"
            :class="`level-${notification.level}`"
        >
            <button title="Dismiss" @click="notificationStore.dismiss(notification.id)">
                &times;
            </button>
            <strong>{{ notification.title }}</strong>
            <p>{{ notification.message }}</p>
        </article>
    </div>
</template>
