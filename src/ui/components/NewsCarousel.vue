<script setup lang="ts">
import type { GameNewsItem } from "../../shared/news";

import { computed, ref, onMounted, onBeforeUnmount } from "vue";

const AUTOPLAY_INTERVAL_MS = 5000;
let autoplayTimer: ReturnType<typeof window.setInterval> | undefined;

const newsItems = ref<GameNewsItem[]>([]);
const activeIndex = ref(0);
const slideDirection = ref<"next" | "previous">("next");
const isLoading = ref(true);
const errorMessage = ref("");

const activeItem = computed(() => newsItems.value[activeIndex.value]);
const hasNews = computed(() => newsItems.value.length > 0);
const hasMultipleNews = computed(() => newsItems.value.length > 1);
const transitionName = computed(() => `carousel-slide-${slideDirection.value}`);

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

function setActiveNews(index: number, direction: "next" | "previous", resetAutoplay: boolean) {
    if (!hasNews.value) return;

    if (index === activeIndex.value) {
        if (resetAutoplay) restartAutoplay();
        return;
    }

    slideDirection.value = direction;
    activeIndex.value = index;

    if (resetAutoplay) restartAutoplay();
}

function previousNews(resetAutoplay = true) {
    if (!hasMultipleNews.value) return;
    const previousIndex = (activeIndex.value - 1 + newsItems.value.length) % newsItems.value.length;
    setActiveNews(previousIndex, "previous", resetAutoplay);
}

function nextNews(resetAutoplay = true) {
    if (!hasMultipleNews.value) return;
    const nextIndex = (activeIndex.value + 1) % newsItems.value.length;
    setActiveNews(nextIndex, "next", resetAutoplay);
}

function selectNews(index: number) {
    const direction = index > activeIndex.value ? "next" : "previous";
    setActiveNews(index, direction, true);
}

function startAutoplay() {
    if (!hasMultipleNews.value) return;
    stopAutoplay();
    autoplayTimer = window.setInterval(() => nextNews(false), AUTOPLAY_INTERVAL_MS);
}

function restartAutoplay() {
    stopAutoplay();
    startAutoplay();
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

        <Transition :name="transitionName" mode="out-in">
            <article v-if="activeItem" :key="activeIndex" class="carousel-card">
                <div class="carousel-image-wrap">
                    <img :src="activeItem.image" :alt="activeItem.title" class="carousel-image" />

                    <button
                        class="carousel-arrow left"
                        title="Previous news"
                        :disabled="!hasMultipleNews"
                        @click="previousNews()"
                    >
                        &#8249;
                    </button>
                    <button
                        class="carousel-arrow right"
                        title="Next news"
                        :disabled="!hasMultipleNews"
                        @click="nextNews()"
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

            <article v-else key="carousel-state" class="carousel-card carousel-state-card">
                <p v-if="isLoading">Loading news...</p>
                <p v-else-if="errorMessage">{{ errorMessage }}</p>
                <p v-else>No news available.</p>
            </article>
        </Transition>

        <div v-if="hasNews" class="carousel-dots">
            <button
                v-for="(_, index) in newsItems"
                :key="index"
                :class="{ active: index === activeIndex }"
                :title="`Show news ${index + 1}`"
                @click="selectNews(index)"
            />
        </div>
    </section>
</template>
