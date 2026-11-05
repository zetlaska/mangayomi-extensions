/*
 * HiveToons extension for Mangayomi (JavaScript, works on iOS)
 *
 * hivetoons.org is a Next.js front end on top of a JSON API at
 * https://api.hivetoons.org/api (the "Iken" CMS). Endpoints used:
 *   GET /query?page=&perPage=&searchTerm=&orderBy=&seriesType=&seriesStatus=&genreIds=
 *   GET /post?postSlug=<slug>                       -> series details
 *   GET /chapters?postId=<id>&skip=&take=<=500&order=desc -> chapter list
 *   GET /chapter?mangaslug=<slug>&chapterslug=<slug>       -> chapter images
 * Images are plain WebP/JPEG files on storage.hivetoon.com (no special headers needed;
 * a Referer is sent anyway).
 *
 * Coin-locked (early access) chapters are hidden by default. A preference shows them
 * with a lock marker instead; opening one gives a clear error rather than empty pages.
 * Novels are filtered out (this is a manga source).
 *
 * Version History:
 * - 0.1.0: Initial release
 */

const mangayomiSources = [{
    "id": 391567284,
    "name": "HiveToons",
    "lang": "en",
    "baseUrl": "https://hivetoons.org",
    "apiUrl": "https://api.hivetoons.org/api",
    "iconUrl": "https://raw.githubusercontent.com/zetlaska/mangayomi-extensions/main/javascript/icon/en.hivetoons.png",
    "typeSource": "single",
    "itemType": 0,
    "isNsfw": false,
    "hasCloudflare": false,
    "version": "0.1.0",
    "dateFormat": "",
    "dateFormatLocale": "",
    "pkgPath": "manga/src/en/hivetoons.js"
}];

var HT_GENRES = [["Acting",1],["Action",5],["Adult",19],["Adventure",13],["Apocalypse",70],["Battle",71],["Bullying",43],["Comedy",6],["Drama",2],["Ecchi",48],["Fantasy",3],["Fight",16],["Game",45],["Gang",12],["Genius",62],["Harem",46],["Historical",37],["Horror",34],["Isekai",23],["Josei",24],["Magic",41],["Martial Arts",14],["Mature",11],["Medical",59],["Murim",33],["Mystery",9],["Psychological",35],["Rebirth",30],["Regression",60],["Reincarnation",31],["Revenge",18],["Romance",25],["School Life",7],["Sci-fi",22],["Seinen",15],["Shoujo",51],["Shounen",4],["Slice of Life",27],["Sports",57],["Supernatural",8],["Survival",47],["System",28],["Thriller",10],["Tragedy",38],["Violence",21]];

class DefaultExtension extends MProvider {

    getHeaders(url) {
        return {
            "Referer": "https://hivetoons.org/",
            "Origin": "https://hivetoons.org"
        };
    }

    get supportsLatest() {
        return true;
    }

    getPref(key, def) {
        var v = new SharedPreferences().get(key);
        return (v === null || v === undefined || v === "") ? def : v;
    }

    async api(path) {
        var url = (this.source.apiUrl || "https://api.hivetoons.org/api") + path;
        var res = await new Client().get(url, {
            "Accept": "application/json",
            "Referer": "https://hivetoons.org/",
            "Origin": "https://hivetoons.org"
        });
        var data = null;
        try { data = JSON.parse(res.body); } catch (e) { data = null; }
        if (res.statusCode != 200 || data == null) {
            throw new Error("HiveToons API " + path.split("?")[0] + ": " + (data && data.error ? data.error : "HTTP " + res.statusCode));
        }
        return data;
    }

    seriesUrl(slug) {
        return this.source.baseUrl + "/series/" + slug;
    }

    slugFromUrl(url) {
        var path = String(url || "").replace(/^https?:\/\/[^\/]+/, "").split("?")[0].replace(/^\/+/, "");
        var parts = path.split("/");
        if (parts[0] == "series") parts.shift();
        return { series: parts[0], chapter: parts[1] };
    }

    async query(page, params) {
        var perPage = 24;
        var qs = "page=" + page + "&perPage=" + perPage;
        for (var k in params) {
            if (params[k] !== "" && params[k] !== null && params[k] !== undefined) qs += "&" + k + "=" + encodeURIComponent(params[k]);
        }
        var data = await this.api("/query?" + qs);
        var list = [];
        var posts = data.posts || [];
        for (var i = 0; i < posts.length; i++) {
            var p = posts[i];
            if (p.isNovel || p.seriesType == "NOVEL") continue;
            list.push({ name: String(p.postTitle || "").trim(), imageUrl: p.featuredImage, link: this.seriesUrl(p.slug) });
        }
        var total = data.totalCount || 0;
        return { list: list, hasNextPage: page * perPage < total };
    }

    async getPopular(page) {
        return this.query(page, { orderBy: "totalViews" });
    }

    async getLatestUpdates(page) {
        return this.query(page, { orderBy: "lastChapterAddedAt" });
    }

    async search(query, page, filters) {
        var params = { searchTerm: (query || "").trim() };
        filters = filters || [];
        var genres = [];
        for (var i = 0; i < filters.length; i++) {
            var f = filters[i];
            if (f.type_name == "SelectFilter") {
                var v = f.values[f.state] ? f.values[f.state].value : "";
                if (f.type == "order") params.orderBy = v;
                else if (f.type == "type") params.seriesType = v;
                else if (f.type == "status") params.seriesStatus = v;
            } else if (f.type_name == "GroupFilter" && f.type == "genres") {
                for (var j = 0; j < f.state.length; j++) if (f.state[j].state) genres.push(f.state[j].value);
            }
        }
        if (genres.length) params.genreIds = genres.join(",");
        if (params.orderBy == "postTitle") params.orderDirection = "asc";
        if (!params.orderBy && !params.searchTerm) params.orderBy = "totalViews";
        return this.query(page, params);
    }

    statusOf(s) {
        switch (String(s || "").toUpperCase()) {
            case "ONGOING": case "MASS_RELEASED": return 0;
            case "COMPLETED": return 1;
            case "HIATUS": return 2;
            case "DROPPED": case "CANCELLED": return 3;
            default: return 5;
        }
    }

    stripHtml(s) {
        return String(s || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "")
            .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
            .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\n{3,}/g, "\n\n").trim();
    }

    async getDetail(url) {
        var slug = this.slugFromUrl(url).series;
        var data = await this.api("/post?postSlug=" + encodeURIComponent(slug));
        var p = data.post;
        if (!p) throw new Error("HiveToons: series not found: " + slug);

        var genre = [];
        (p.genres || []).forEach(function (g) { if (g && g.name) genre.push(g.name.charAt(0).toUpperCase() + g.name.slice(1)); });
        if (p.seriesType) genre.push(p.seriesType.charAt(0) + p.seriesType.slice(1).toLowerCase());

        var description = this.stripHtml(p.postContent);
        if (p.alternativeTitles && p.alternativeTitles != p.postTitle) description += "\n\nAlternative titles: " + p.alternativeTitles;

        var showLocked = this.getPref("hivetoons_show_locked", false) === true || this.getPref("hivetoons_show_locked", false) === "true";
        var chapters = [];
        var take = 500;
        var total = data.totalChapterCount || 0;
        for (var skip = 0; skip < 5000; skip += take) {
            var cd = await this.api("/chapters?postId=" + p.id + "&skip=" + skip + "&take=" + take + "&order=desc");
            var arr = (cd.post && cd.post.chapters) || [];
            if (cd.totalChapterCount) total = cd.totalChapterCount;
            for (var i = 0; i < arr.length; i++) {
                var c = arr[i];
                var locked = c.isLocked === true || c.isAccessible === false;
                if (locked && !showLocked) continue;
                var name = "Chapter " + c.number;
                if (c.title && String(c.title).trim() && !/^chapter\s*[\d.]+$/i.test(String(c.title).trim())) name += " - " + String(c.title).trim();
                if (locked) {
                    name = "\uD83D\uDD12 " + name;
                    if (c.unlockAt) name += " (free " + String(c.unlockAt).slice(0, 10) + ")";
                }
                chapters.push({
                    name: name,
                    url: this.seriesUrl(p.slug) + "/" + c.slug,
                    dateUpload: c.createdAt ? String(new Date(c.createdAt).valueOf()) : String(Date.now()),
                    scanlator: locked ? "Locked (coins)" : ""
                });
            }
            if (arr.length < take || skip + take >= total) break;
        }

        return {
            name: String(p.postTitle || "").trim(),
            imageUrl: p.featuredImage,
            description: description,
            author: p.author || "",
            artist: p.artist || "",
            genre: genre,
            status: this.statusOf(p.seriesStatus),
            link: this.seriesUrl(p.slug),
            chapters: chapters
        };
    }

    async getPageList(url) {
        var s = this.slugFromUrl(url);
        var data = await this.api("/chapter?mangaslug=" + encodeURIComponent(s.series) + "&chapterslug=" + encodeURIComponent(s.chapter));
        var ch = data.chapter || {};
        var imgs = (ch.images || []).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
        if (!imgs.length && (ch.isLocked || ch.isAccessible === false)) {
            throw new Error("This HiveToons chapter is locked (coins / early access). It will appear once it becomes free.");
        }
        var headers = this.getHeaders(url);
        return imgs.map(function (im) { return { url: String(im.url).trim(), headers: headers }; });
    }

    getFilterList() {
        var opt = function (n, v) { return { type_name: "SelectOption", name: n, value: v }; };
        return [{
            type_name: "SelectFilter", type: "order", name: "Sort", state: 0,
            values: [opt("Most viewed", "totalViews"), opt("Latest update", "lastChapterAddedAt"), opt("Newest", "createdAt"), opt("Title", "postTitle")]
        }, {
            type_name: "SelectFilter", type: "type", name: "Type", state: 0,
            values: [opt("All", ""), opt("Manhwa", "MANHWA"), opt("Manhua", "MANHUA"), opt("Manga", "MANGA")]
        }, {
            type_name: "SelectFilter", type: "status", name: "Status", state: 0,
            values: [opt("All", ""), opt("Ongoing", "ONGOING"), opt("Completed", "COMPLETED"), opt("Hiatus", "HIATUS"), opt("Dropped", "DROPPED")]
        }, {
            type_name: "GroupFilter", type: "genres", name: "Genres (any of)",
            state: HT_GENRES.map(function (g) { return { type_name: "CheckBox", name: g[0], value: String(g[1]) }; })
        }];
    }

    getSourcePreferences() {
        return [{
            key: "hivetoons_show_locked",
            checkBoxPreference: {
                title: "Show locked chapters",
                summary: "List coin / early-access chapters with a lock marker (they cannot be read until free)",
                value: false
            }
        }];
    }
}
