<script setup lang="ts">
defineProps<{
    title: string;
    message: string;
}>();

defineEmits<{
    close: [];
}>();
</script>

<template>
    <div class="modal-backdrop" @click.self="$emit('close')">
        <section class="service-status-dialog">
            <header>
                <h2>{{ title }}</h2>
                <button class="icon-button" title="Close" @click="$emit('close')">
                    &times;
                </button>
            </header>

            <p>{{ message }}</p>

            <button class="secondary-action" @click="$emit('close')">
                OK
            </button>
        </section>
    </div>
</template>
