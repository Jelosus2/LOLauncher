<script setup lang="ts">
import type { GameNewsItem } from "../../shared/news";

import { computed, ref, onMounted, onBeforeUnmount } from "vue";

const AUTOPLAY_INTERVAL_MS = 5000;
let autoplayTimer: ReturnType<typeof window.setInterval> | undefined;

const newsItems = ref<GameNewsItem[]>([]);
const activeIndex = ref(0);
const isLoading = ref(true);
const errorMessage = ref("");

const activeItem = computed(() => newsItems.value[activeIndex.value]);
const hasNews = computed(() => newsItems.value.length > 0);
const hasMultipleNews = computed(() => newsItems.value.length > 1);

async function loadNews() {
    isLoading.value = true;
    errorMessage.value = "";

    try {
        const items = await window.app.getGameNews();
        newsItems.value = items;
        activeIndex.value = 0;
    } catch {
        newsItems.value = [];
        activeIndex.value = 0;
        errorMessage.value = "Unable to retrieve news.";
    } finally {
        isLoading.value = false;
    }
}

function previousNews() {
    if (!hasMultipleNews.value) return;
    activeIndex.value =
        (activeIndex.value - 1 + newsItems.value.length) % newsItems.value.length;
}

function nextNews() {
    if (!hasMultipleNews.value) return;
    activeIndex.value = (activeIndex.value + 1) % newsItems.value.length;
}

function startAutoplay() {
    if (!hasMultipleNews.value) return;
    autoplayTimer = window.setInterval(nextNews, AUTOPLAY_INTERVAL_MS);
}

function stopAutoplay() {
    if (!autoplayTimer) return;
    window.clearInterval(autoplayTimer);
    autoplayTimer = undefined;
}

onMounted(async () => {
    await loadNews();
    startAutoplay();
});

onBeforeUnmount(() => {
    stopAutoplay();
});
</script>

<template>
    <section class="news-carousel" aria-label="Game news">
        <div class="carousel-header">
            <div>
                <h2>News</h2>
            </div>
        </div>

        <article v-if="activeItem" class="carousel-card">
            <div class="carousel-image-wrap">
                <img :src="activeItem.image" :alt="activeItem.title" class="carousel-image" />

                <button
                    class="carousel-arrow left"
                    title="Previous news"
                    :disabled="!hasMultipleNews"
                    @click="previousNews"
                >
                    &#8249;
                </button>
                <button
                    class="carousel-arrow right"
                    title="Next news"
                    :disabled="!hasMultipleNews"
                    @click="nextNews"
                >
                    &#8250;
                </button>
            </div>

            <div class="carousel-copy">
                <h3>{{ activeItem.title }}</h3>
                <div class="carousel-meta">
                    <span>{{ activeItem.kind }}</span>
                    <time>{{ activeItem.date }}</time>
                </div>
            </div>
        </article>

        <article v-else class="carousel-card carousel-state-card">
            <p v-if="isLoading">Loading news...</p>
            <p v-else-if="errorMessage">{{ errorMessage }}</p>
            <p v-else>No news available.</p>
        </article>

        <div v-if="hasNews" class="carousel-dots">
            <button
                v-for="(_, index) in newsItems"
                :key="index"
                :class="{ active: index === activeIndex }"
                :title="`Show news ${index + 1}`"
                @click="activeIndex = index"
            />
        </div>
    </section>
</template>
