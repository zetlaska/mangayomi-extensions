/*
 * TCB Scans extension for Mangayomi (JavaScript, works on iOS)
 *
 * tcbonepiecechapters.com is a small server-rendered site (tcbscans.com is dead):
 *   /projects                 -> every series (about 20, one page)
 *   /                         -> "Latest Chapters" with real release timestamps
 *   /mangas/<id>/<slug>       -> series page: cover, synopsis, full chapter list
 *   /chapters/<id>/<slug>     -> chapter page: <img class="fixed-ratio-content" src=...>
 * Images are plain PNG/JPEG on cdn.onepiecechapters.com (no special headers needed).
 *
 * The site has no search, so search filters the project list client-side.
 * The series page does not show chapter dates. The home page does, so chapters listed
 * there get their exact release time. Every other chapter gets an estimated date
 * interpolated from those anchors by the site's sequential chapter id (older than the
 * oldest anchor: no date).
 *
 * Parsing uses plain regular expressions (no Document/DOM dependency).
 *
 * Version History:
 * - 0.1.0: Initial release
 */

const mangayomiSources = [{
    "id": 462810937,
    "name": "TCB Scans",
    "lang": "en",
    "baseUrl": "https://tcbonepiecechapters.com",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/zetlaska/mangayomi-extensions/main/javascript/icon/en.tcbscans.png",
    "typeSource": "single",
    "itemType": 0,
    "isNsfw": false,
    "hasCloudflare": false,
    "version": "0.1.0",
    "dateFormat": "",
    "dateFormatLocale": "",
    "pkgPath": "manga/src/en/tcbscans.js"
}];

function tcbDecode(s) {
    return String(s || "")
        .replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(+n); })
        .replace(/&#x([0-9a-f]+);/gi, function (m, n) { return String.fromCharCode(parseInt(n, 16)); })
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
        .replace(/\s+/g, " ").trim();
}

function tcbNorm(s) {
    return tcbDecode(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

class DefaultExtension extends MProvider {

    getHeaders(url) {
        return { "Referer": "https://tcbonepiecechapters.com/" };
    }

    get supportsLatest() {
        return true;
    }

    abs(path) {
        if (/^https?:\/\//.test(path)) return path;
        return this.source.baseUrl + (path.charAt(0) == "/" ? "" : "/") + path;
    }

    async fetchHtml(path) {
        var res = await new Client().get(this.abs(path), {
            "Referer": "https://tcbonepiecechapters.com/",
            "Accept": "text/html,application/xhtml+xml"
        });
        if (res.statusCode != 200) throw new Error("TCB Scans: HTTP " + res.statusCode + " for " + path);
        return res.body;
    }

    // [{name, link, imageUrl}] from /projects
    async projects() {
        var html = await this.fetchHtml("/projects");
        var out = [], seen = {};
        var re = /<a href="(\/mangas\/\d+\/[^"]+)"><img src="([^"]*)" alt="([^"]*)"/g, m;
        while ((m = re.exec(html)) !== null) {
            if (seen[m[1]]) continue;
            seen[m[1]] = true;
            out.push({ name: tcbDecode(m[3]), imageUrl: m[2], link: this.abs(m[1]) });
        }
        return out;
    }

    // [{id, url, title, date}] from the home page "Latest Chapters" cards
    async homeLatest() {
        var html = await this.fetchHtml("/");
        var out = [];
        var re = /<a class="[^"]*" href="(\/chapters\/(\d+)\/[^"]+)">([^<]*)<\/a>[\s\S]*?<time-ago[^>]*datetime="([^"]+)"/g, m;
        while ((m = re.exec(html)) !== null) {
            out.push({ id: +m[2], url: this.abs(m[1]), title: tcbDecode(m[3]), date: new Date(m[4]).valueOf() });
        }
        return out;
    }

    async getPopular(page) {
        var list = await this.projects();
        return { list: list, hasNextPage: false };
    }

    async getLatestUpdates(page) {
        var latest = await this.homeLatest();
        var all = await this.projects();
        var list = [], used = {};
        for (var i = 0; i < latest.length; i++) {
            var t = tcbNorm(latest[i].title.replace(/\s+chapter\s+[\d.]+.*$/i, ""));
            var best = null;
            for (var j = 0; j < all.length; j++) {
                var n = tcbNorm(all[j].name);
                if (n == t || (t.indexOf(n) == 0 && (!best || n.length > tcbNorm(best.name).length))) best = all[j];
            }
            if (best && !used[best.link]) { used[best.link] = true; list.push(best); }
        }
        // append the rest so every series stays reachable from Latest
        for (var k = 0; k < all.length; k++) if (!used[all[k].link]) list.push(all[k]);
        return { list: list, hasNextPage: false };
    }

    async search(query, page, filters) {
        var all = await this.projects();
        var q = tcbNorm(query || "");
        if (!q) return { list: all, hasNextPage: false };
        var words = q.split(" ");
        var list = all.filter(function (x) {
            var n = tcbNorm(x.name);
            return words.every(function (w) { return n.indexOf(w) != -1; });
        });
        return { list: list, hasNextPage: false };
    }

    async getDetail(url) {
        var html = await this.fetchHtml(url);
        var name = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1];
        var block = html.slice(html.indexOf("<h1"));
        var description = (block.match(/<p[^>]*>([\s\S]*?)<\/p>/) || [])[1] || "";
        var image = (html.match(/<div class="flex items-center justify-center">\s*<img src="([^"]+)"/) || [])[1] || "";

        var anchors = [];
        try { anchors = await this.homeLatest(); } catch (e) { anchors = []; }
        var exact = {};
        anchors.forEach(function (a) { exact[a.id] = a.date; });
        anchors.sort(function (a, b) { return a.id - b.id; });
        var estimate = function (id) {
            if (exact[id]) return exact[id];
            if (anchors.length < 2 || id < anchors[0].id) return null;
            for (var i = 0; i < anchors.length - 1; i++) {
                var a = anchors[i], b = anchors[i + 1];
                if (id >= a.id && id <= b.id) return Math.round(a.date + (b.date - a.date) * (id - a.id) / (b.id - a.id));
            }
            return anchors[anchors.length - 1].date; // newer than newest anchor (should not happen)
        };

        var chapters = [];
        var re = /<a href="(\/chapters\/(\d+)\/[^"]+)" class="block[^"]*">\s*<div class="text-lg font-bold">([\s\S]*?)<\/div>\s*<div class="text-gray-500">([\s\S]*?)<\/div>/g, m;
        var seriesName = tcbDecode(name);
        while ((m = re.exec(html)) !== null) {
            var label = tcbDecode(m[3]);
            if (seriesName && label.toLowerCase().indexOf(seriesName.toLowerCase()) == 0) label = label.slice(seriesName.length).trim();
            var sub = tcbDecode(m[4]);
            var d = estimate(+m[2]);
            chapters.push({
                name: label + (sub ? " - " + sub : ""),
                url: this.abs(m[1]),
                dateUpload: d ? String(d) : null,
                scanlator: "TCB Scans"
            });
        }

        var status = 5;
        if (/waiting for next chapter|next chapter progress/i.test(html)) status = 0;
        return {
            name: seriesName,
            imageUrl: image,
            description: tcbDecode(description),
            author: "",
            artist: "",
            genre: [],
            status: status,
            link: this.abs(url),
            chapters: chapters
        };
    }

    async getPageList(url) {
        var html = await this.fetchHtml(url);
        var out = [], seen = {};
        var re = /<img[^>]*class="fixed-ratio-content"[^>]*src="([^"]+)"|<img[^>]*src="([^"]+)"[^>]*class="fixed-ratio-content"/g, m;
        var headers = this.getHeaders(url);
        while ((m = re.exec(html)) !== null) {
            var src = (m[1] || m[2]).trim();
            if (seen[src]) continue;
            seen[src] = true;
            out.push({ url: src, headers: headers });
        }
        return out;
    }

    getFilterList() {
        return [];
    }

    getSourcePreferences() {
        return [];
    }
}
