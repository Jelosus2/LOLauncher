import type { GameNewsItem } from "../../../shared/news.js";

import { IpcHandle } from "../ipcDecorators.js";
import { app } from "electron";

type NewsPost = {
    id: number;
    title: string;
    slug: string;
    url: string;
    thumbnail: string;
    category: {
        id: number;
        name: string;
        slug: string;
    }
    created_at: string;
    view_count: number;
    like_count: number;
    comment_count: number;
    author: {
        nickname: string;
        slug: string;
    }
}

type NewsResponse = {
    success: boolean;
    posts: NewsPost[];
}

export class LauncherController {
    @IpcHandle("launcher:get-version")
    getVersion() {
        return app.getVersion();
    }

    @IpcHandle("launcher:get-news")
    async getGameNews() {
        const newsEndpoint = "https://external-api.valofe.com/api/library/home/posts/news/lastorigin-gl?lang=en&sections=event&limit=4";
        const response = await fetch(newsEndpoint);
        const data = await response.json() as NewsResponse;

        const news: GameNewsItem[] = [];

        if (!data.success)
            return news;

        for (const post of data.posts) {
            news.push({
                title: post.title,
                kind: post.category.name,
                date: this.formatDate(post.created_at),
                image: post.thumbnail
            });
        }

        return news;
    }

    formatDate(date: string) {
        const dateObj = new Date(date);
        return dateObj.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC"
        });
    }
}
