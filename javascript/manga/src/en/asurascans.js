const mangayomiSources = [{
    "id": 524070078,
    "name": "Asura Scans",
    "lang": "en",
    "baseUrl": "https://asurascans.com",
    "apiUrl": "https://api.asurascans.com/api",
    "iconUrl": "https://raw.githubusercontent.com/zetlaska/mangayomi-extensions/main/javascript/icon/en.asurascans.png",
    "typeSource": "single",
    "itemType": 0,
    "version": "0.1.1",
    "dateFormat": "",
    "dateFormatLocale": "",
    "pkgPath": "manga/src/en/asurascans.js"
}];

class DefaultExtension extends MProvider {
    getHeaders(url) {
        return {
            "Referer": this.source.baseUrl,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        };
    }

    async getPopular(page) {
        const limit = 20;
        const offset = (page - 1) * limit;
        const url = `${this.source.apiUrl}/series?limit=${limit}&offset=${offset}&order=popular`;
        const res = await new Client().get(url, { headers: this.getHeaders(url) });
        return this.parseSeriesList(res);
    }

    async getLatestUpdates(page) {
        const limit = 20;
        const offset = (page - 1) * limit;
        const url = `${this.source.apiUrl}/series?limit=${limit}&offset=${offset}&order=latest`;
        const res = await new Client().get(url, { headers: this.getHeaders(url) });
        return this.parseSeriesList(res);
    }

    async search(query, page, filters) {
        const limit = 20;
        const offset = (page - 1) * limit;
        const url = `${this.source.apiUrl}/series?limit=${limit}&offset=${offset}&order=latest&search=${encodeURIComponent(query)}`;
        const res = await new Client().get(url, { headers: this.getHeaders(url) });
        return this.parseSeriesList(res);
    }

    parseSeriesList(res) {
        const json = JSON.parse(res.body);
        const list = [];
        
        if (!json.data || !Array.isArray(json.data)) {
            return { list: [], hasNextPage: false };
        }

        for (const item of json.data) {
            list.push({
                name: item.title,
                imageUrl: item.cover,
                link: item.public_url.substring(1)
            });
        }

        const hasNextPage = json.meta && json.meta.has_more === true;
        return { list, hasNextPage };
    }

    async getDetail(url) {
        const slug = url.split("/").pop();
        const apiUrl = `${this.source.apiUrl}/series/${slug}`;
        const res = await new Client().get(apiUrl, { headers: this.getHeaders(apiUrl) });
        const json = JSON.parse(res.body);
        
        if (!json.series) {
            throw new Error("Failed to fetch series details");
        }

        const data = json.series;
        const imageUrl = data.cover;
        const description = data.description || "";
        const author = data.author || "";
        const artist = data.artist || "";
        const status = this.toStatus(data.status);
        const genre = data.genres ? data.genres.map(g => g.name) : [];

        const chaptersUrl = `${this.source.apiUrl}/series/${slug}/chapters?page=1&per_page=999`;
        const chaptersRes = await new Client().get(chaptersUrl, { headers: this.getHeaders(chaptersUrl) });
        const chaptersJson = JSON.parse(chaptersRes.body);

        const chapters = [];
        if (chaptersJson.data && Array.isArray(chaptersJson.data)) {
            for (const chapter of chaptersJson.data) {
                if (chapter.is_premium && chapter.early_access_until) {
                    const earlyAccessDate = new Date(chapter.early_access_until);
                    if (earlyAccessDate > new Date()) {
                        continue;
                    }
                }

                const chapterTitle = chapter.title ? `Chapter ${chapter.number}: ${chapter.title}` : `Chapter ${chapter.number}`;
                const dateUpload = chapter.published_at ? String(new Date(chapter.published_at).valueOf()) : null;

                chapters.push({
                    name: chapterTitle,
                    url: `${url}/chapter-${chapter.number}|${chapter.number}`,
                    dateUpload: dateUpload
                });
            }
        }

        chapters.reverse();

        return {
            imageUrl,
            description,
            genre,
            author,
            artist,
            status,
            chapters
        };
    }

    async getPageList(url) {
        const parts = url.split("|");
        const chapterNumber = parts.length > 1 ? parts[1] : url.split("chapter-").pop();
        const slug = url.split("/")[1];
        
        const apiUrl = `${this.source.apiUrl}/series/${slug}/chapters/${chapterNumber}?include_pages=true`;
        const res = await new Client().get(apiUrl, { headers: this.getHeaders(apiUrl) });
        const json = JSON.parse(res.body);

        if (!json.data || !json.data.chapter || !json.data.chapter.pages) {
            throw new Error("Failed to fetch chapter pages");
        }

        const pages = json.data.chapter.pages;
        return pages.map(page => page.url);
    }

    toStatus(status) {
        const statusLower = status ? status.toLowerCase() : "";
        if (statusLower === "ongoing") return 0;
        if (statusLower === "completed") return 1;
        if (statusLower === "hiatus") return 2;
        if (statusLower === "dropped") return 3;
        if (statusLower === "cancelled") return 4;
        return 5;
    }

    getFilterList() {
        return [];
    }

    getSourcePreferences() {
        return [];
    }
}
