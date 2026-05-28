import "./assets/main.css";

import { reportError } from "./services/errorReporter.ts";
import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);

app.config.errorHandler = (error) => {
    void reportError({
        title: "Vue unexpected error",
        message: "An unexpected vue error occurred.",
        context: "render.vuerror",
        error
    });
};

window.addEventListener("error", (event) => {
    void reportError({
        title: "Unexpected Error",
        message: "An unexpected renderer error occurred.",
        context: "renderer.window.error",
        error: event.error
    });
});

window.addEventListener("unhandledrejection", (event) => {
    void reportError({
        title: "Unexpected Error",
        message: "An unexpected async renderer error occurred.",
        context: "renderer.unhandledrejection",
        error: event.reason
    });
});

app.mount("#app");
