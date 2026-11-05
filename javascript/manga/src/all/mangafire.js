/*
 * MangaFire Extension for Mangayomi
 *
 * Rewritten for the 2026 mangafire.to single-page app, which loads all data
 * from a JSON API at https://mangafire.to/api/... . Every API request must
 * carry a `vrf` query parameter. The site computes it in an obfuscated
 * virtual-machine bundle (polyfill-*.js, `dynamicEncrypt`); the same
 * algorithm is reimplemented below in plain JS (no CryptoJS, no browser APIs):
 *
 *   signed = path + ("?" + canonicalQuery(params) if any params)
 *   canonicalQuery = keys sorted (ASCII), raw (un-encoded) values,
 *                    arrays as key[0]=..&key[1]=.., objects as key[sub]=..
 *   bytes  = UTF-8(signed)
 *   3 rounds of: prev = IV; b[i] = SBOX[(b[i] ^ KEY[i % KEY.length] ^ prev) & 255]; prev = b[i]
 *   vrf    = base64url(bytes) without padding
 *
 * Chapter images are plain JPEGs on *.mfcdn*.xyz and need Referer: https://mangafire.to/
 *
 * Original Source: kodjodevf/mangayomi-extensions (archived), Apache License 2.0,
 * Copyright 2023 Moustapha Kodjo Amadou. Adapted for zetlaska/mangayomi-extensions.
 *
 * Version History:
 * - 0.2.20: Vendored from entityJY (used CryptoJS - BROKEN)
 * - 0.2.21: Based on kodjodevf v0.1.25 (HTML scraping; broke when the site became an SPA)
 * - 0.2.22: Rewritten against the new /api JSON endpoints with pure-JS vrf signing
 */

const mangayomiSources = [{
    "id": 123456789,
    "name": "Mangafire",
    "langs": ["en", "ja", "fr", "es", "es-la", "pt", "pt-br"],
    "baseUrl": "https://mangafire.to",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/zetlaska/mangayomi-extensions/main/javascript/icon/mangafire.png",
    "typeSource": "single",
    "itemType": 0,
    "version": "0.2.22",
    "dateFormat": "",
    "dateFormatLocale": "",
    "pkgPath": "manga/src/all/mangafire.js"
}];

// ---------------------------------------------------------------------------
// vrf signing (pure JS port of the site's dynamicEncrypt)
// ---------------------------------------------------------------------------
// pure-JS reimplementation of mangafire dynamicEncrypt
var MF_ROUNDS = [
  ["yINlmUNho8VYJT+ibTIP+9ESiULpVEtMOoD6U6lRE0R/xwXo/Xp9NrUgC4cw/Lmo33vUyjUE40kUoEWIr/fxfNNcq2s79ShQ5NhNrFnJ4hXPwOu/SuXzIbuTQKGFvfm08E9jvCfqAtoDqvQq3dVWPQFmJjgvkISBeXY3BgANR+yVnjGbcxZ47d6kLNfZPIayTq3/YGySb1KuVZodWp/WGNAO5pfMcpaK53Hhs0allBszaMaxuouOwdxbwgxIw6YunSsXjI05Yi0j9j4eHKfSXR8Ifo/Od+8iamRfCXTyvm7NGRGYdcQ0ywcK/u6RXhrbcCm4t2eCtrDgQVecJGkQ+A==", "0Ec58JOY3uBzJK9m3zqIOpdlF7UFiax9DmA=", 90],
  ["IUFltCxD3Oc2cwCgkJffthaOg9cgPUb0LgW6H/VtfcF0kc5F25t+aWj6JH9VOhOaY0rAFdUxlDnl5BLNvwEJvQtP5qcw7vdb/K+chnbwnspSHT8mz5lqwz41TezG0hkO06FTjJZhsyNuFLDpD2ZZxQj/QIRcF90zpmQ7Byu483WsQqUE0C342HL+JXngRB6fRzxRyVTaKu83h7UYTJ0QMt6ixFh6S3F8gqkKwrGTL3jHNBsD45UnifK8+RGtishQV2K3rujLKEkiZxpr2dYcudFW4oFsDKhad3CLBvuyTqsCo4B7mL5IKQ1vXo/MOOvq1I1d8ar9X6Ttu5KF4fZgiA==", "AAdjb1iPY8CiDmq9H34tKTBF8a3oDQ==", 53],
  ["NQHlu1/wVO5EmkwQymF810qqY2xG1k2obcas4Z9mCsPEIFl9pRIjFxbJ7ybMHbBckT5Ton85E0FOeHezbh/mjlEYpmpnlXOS8dgrqeq2KfxImTh1YK9y0PeMNhzA1OQzSY9brYOJq/l2QnE/hwOeZIhPixVSKIUlDb5vLcH6RWKxkIEMuP0bDwIqQ71AJJaEaMJL7A6YtyIwoRT+L5v4aZzodN/0+3nOGsfblFjgxSfPzVDjNFeNl5P26+kEC/8AHgdrpAbt3hHz3HrRN1Y6e+JHgF7ncFWnoF0y3THL1S71WgWGCa6KtSzTCCG58n68nTyj2T3Sshk7utqCtMi/ZQ==", "DELOJgPsVaCcblDtTGMdHzM=", 186]
];
var MF_B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function mfB64Dec(s) {
  s = s.replace(/=+$/, ""); var out = [], buf = 0, bits = 0;
  for (var i = 0; i < s.length; i++) { buf = (buf << 6) | MF_B64.indexOf(s[i]); bits += 6;
    if (bits >= 8) { bits -= 8; out.push((buf >> bits) & 255); } }
  return out;
}
function mfB64UrlEnc(b) {
  var o = "";
  for (var i = 0; i < b.length; i += 3) {
    var n = (b[i] << 16) | ((b[i + 1] || 0) << 8) | (b[i + 2] || 0);
    o += MF_B64[(n >> 18) & 63] + MF_B64[(n >> 12) & 63];
    if (i + 1 < b.length) o += MF_B64[(n >> 6) & 63];
    if (i + 2 < b.length) o += MF_B64[n & 63];
  }
  return o.replace(/\+/g, "-").replace(/\//g, "_");
}
function mfUtf8(s) {
  var o = [];
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c >= 0xd800 && c < 0xdc00 && i + 1 < s.length) { var d = s.charCodeAt(i + 1); if (d >= 0xdc00 && d < 0xe000) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++; } }
    if (c < 0x80) o.push(c);
    else if (c < 0x800) o.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) o.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else o.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return o;
}
var MF_TABLES = null;
function mfVrf(str) {
  if (!MF_TABLES) MF_TABLES = MF_ROUNDS.map(function (r) { return [mfB64Dec(r[0]), mfB64Dec(r[1]), r[2]]; });
  var b = mfUtf8(str);
  for (var r = 0; r < MF_TABLES.length; r++) {
    var S = MF_TABLES[r][0], K = MF_TABLES[r][1], prev = MF_TABLES[r][2];
    for (var i = 0; i < b.length; i++) { prev = S[(b[i] ^ K[i % K.length] ^ prev) & 255]; b[i] = prev; }
  }
  return mfB64UrlEnc(b);
}

// canonical query string the server re-derives from the parsed query
function mfCanonicalQuery(params) {
    var pairs = [];
    function add(k, v) {
        if (v === undefined || v === null) return;
        if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) add(k + "[" + i + "]", v[i]); }
        else if (typeof v === "object") { var ks = Object.keys(v); for (var j = 0; j < ks.length; j++) add(k + "[" + ks[j] + "]", v[ks[j]]); }
        else pairs.push(k + "=" + String(v));
    }
    var keys = Object.keys(params || {}).sort();
    for (var i = 0; i < keys.length; i++) add(keys[i], params[keys[i]]);
    return pairs.join("&");
}

// query string as the site's axios client sends it (arrays as key[]=v, objects as key[sub]=v)
function mfQueryString(params) {
    var out = [];
    var keys = Object.keys(params || {});
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i], v = params[k];
        if (v === undefined || v === null) continue;
        if (Array.isArray(v)) {
            for (var a = 0; a < v.length; a++) out.push(encodeURIComponent(k + "[]") + "=" + encodeURIComponent(v[a]));
        } else if (typeof v === "object") {
            var sk = Object.keys(v);
            for (var b = 0; b < sk.length; b++) out.push(encodeURIComponent(k + "[" + sk[b] + "]") + "=" + encodeURIComponent(v[sk[b]]));
        } else {
            out.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
        }
    }
    return out.join("&");
}

class DefaultExtension extends MProvider {

    getPreference(key) {
        return new SharedPreferences().get(key);
    }

    getHeaders(url) {
        return {
            "Referer": "https://mangafire.to/",
            "Origin": "https://mangafire.to"
        };
    }

    get supportsLatest() {
        return true;
    }

    // ---- API helpers -------------------------------------------------------

    async api(path, params) {
        params = params || {};
        var cq = mfCanonicalQuery(params);
        var vrf = mfVrf(path + (cq ? "?" + cq : ""));
        var qs = mfQueryString(params);
        var url = this.source.baseUrl + "/api" + path + "?" + (qs ? qs + "&" : "") + "vrf=" + encodeURIComponent(vrf);
        var res = await new Client().get(url, {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": this.source.baseUrl + "/"
        });
        var data = null;
        try { data = JSON.parse(res.body); } catch (e) { data = null; }
        if (res.statusCode != 200 || data == null) {
            var msg = data && data.message ? data.message : ("HTTP " + res.statusCode);
            throw new Error("MangaFire API " + path + ": " + msg);
        }
        return data;
    }

    lang() {
        return this.source.lang || "en";
    }

    // "/title/dkw-one-piece", full URL, chapter URL, or legacy "/manga/one-piecee.dkw" -> "dkw"
    hidFromUrl(url) {
        url = String(url || "").replace(/^https?:\/\/[^\/]+/, "").split("?")[0];
        var m = url.match(/\/title\/([^\/]+)/);
        if (m) return m[1].split("-")[0];
        m = url.match(/\/manga\/[^\/]*\.([a-z0-9]+)/i);
        if (m) return m[1];
        return url.replace(/^\/+/, "").split("/")[0].split("-")[0];
    }

    posterOf(item) {
        var p = item && item.poster;
        if (!p) return "";
        if (typeof p === "string") return p;
        return p.large || p.medium || p.small || "";
    }

    mangaList(data) {
        var items = data.items || [];
        var list = [];
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            list.push({
                name: it.title,
                imageUrl: this.posterOf(it),
                link: it.url || ("/title/" + it.hid + "-" + it.slug)
            });
        }
        var meta = data.meta || {};
        var hasNextPage = meta.hasNext != null ? !!meta.hasNext : (meta.page != null && meta.lastPage != null && meta.page < meta.lastPage);
        return { list: list, hasNextPage: hasNextPage };
    }

    statusFromString(status) {
        return {
            "releasing": 0,
            "finished": 1,
            "on_hiatus": 2,
            "discontinued": 3,
            "not_yet_released": 5
        }[status] ?? 5;
    }

    // ---- listing -----------------------------------------------------------

    async browse(params, page) {
        params.languages = [this.lang()];
        params.page = page;
        return this.mangaList(await this.api("/titles", params));
    }

    async getPopular(page) {
        return this.browse({ order: { "trending": "desc" } }, page);
    }

    async getLatestUpdates(page) {
        return this.browse({ order: { "chapter_updated_at": "desc" } }, page);
    }

    async search(query, page, filters) {
        var params = {};
        query = (query || "").trim();
        if (query) params.keyword = query;
        var order = query ? "relevance:desc" : "trending:desc";

        if (filters && filters.length) {
            for (var f = 0; f < filters.length; f++) {
                var filter = filters[f];
                var key = filter.type || "";
                if (filter.type_name == "GroupFilter") {
                    var checked = [], incl = [], excl = [];
                    for (var s = 0; s < filter.state.length; s++) {
                        var st = filter.state[s];
                        if (st.type_name == "TriState") {
                            if (st.state == 1) incl.push(st.value);
                            else if (st.state == 2) excl.push(st.value);
                        } else if (st.state == true) {
                            checked.push(st.value);
                        }
                    }
                    if (key == "genres") {
                        if (incl.length) params.genres_in = incl;
                        if (excl.length) params.genres_ex = excl;
                    } else if (key == "themes") {
                        if (incl.length) params.theme_ids = incl;
                    } else if (checked.length && key) {
                        params[key] = checked;
                    }
                } else if (filter.type_name == "SelectFilter") {
                    var opt = filter.values[filter.state];
                    var val = opt ? opt.value : "";
                    if (key == "sort") { if (val) order = val; }
                    else if (key == "genres_mode") { if (val) params.genres_mode = val; }
                    else if (key == "min_chap") { if (val) params.min_chap = val; }
                } else if (filter.type_name == "TextFilter") {
                    if (key == "year_from" && filter.state) params.year_from = filter.state;
                    if (key == "year_to" && filter.state) params.year_to = filter.state;
                }
            }
        }
        if (order == "relevance:desc" && !query) order = "trending:desc";
        var parts = order.split(":");
        params.order = {};
        params.order[parts[0]] = parts[1] || "desc";
        return this.browse(params, page);
    }

    // ---- details & chapters ------------------------------------------------

    async getDetail(url) {
        var hid = this.hidFromUrl(url);
        var t = (await this.api("/titles/" + hid)).data;
        var names = function (arr) { return (arr || []).map(function (x) { return x.title || x.name; }).filter(function (x) { return !!x; }); };

        var genre = [];
        if (t.type) genre.push(t.type.charAt(0).toUpperCase() + t.type.slice(1));
        genre = genre.concat(names(t.genres), names(t.themes), names(t.demographics));

        var description = String(t.synopsisHtml || "")
            .replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>\s*<p[^>]*>/gi, "\n\n").replace(/<[^>]+>/g, "")
            .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
            .trim();
        if (t.altTitles && t.altTitles.length) description += (description ? "\n\n" : "") + "Alternative titles: " + t.altTitles.join(", ");

        var link = t.url || ("/title/" + t.hid + "-" + t.slug);
        var detail = {
            name: t.title,
            imageUrl: this.posterOf(t),
            link: link,
            description: description,
            author: names(t.authors).join(", "),
            artist: names(t.artists).join(", "),
            status: this.statusFromString(t.status),
            genre: genre,
            chapters: []
        };

        var viewType = this.getPreference("mangafire_pref_content_view") || "chapter";
        if (viewType == "volume" && t.hasVolumes) {
            detail.chapters = await this.getVolumes(t.hid, link);
        }
        if (!detail.chapters.length) {
            detail.chapters = await this.getChapters(t.hid, link);
        }
        return detail;
    }

    async getChapters(hid, link) {
        var chapterType = this.getPreference("mangafire_pref_chapter_type") || "all";
        var chapters = [];
        var page = 1;
        // the API caps limit at 200; long series (e.g. One Piece ~2,400 entries) take several pages
        while (page <= 60) {
            var params = { language: this.lang(), sort: "number", order: "desc", page: page, limit: 200 };
            if (chapterType != "all") params.type = chapterType;
            var data = await this.api("/titles/" + hid + "/chapters", params);
            var items = data.items || [];
            for (var i = 0; i < items.length; i++) {
                var c = items[i];
                var name = "Chapter " + c.number + (c.name ? ": " + c.name : "");
                chapters.push({
                    name: name,
                    url: link + "/chapter/" + c.id,
                    dateUpload: c.createdAt ? String(c.createdAt * 1000) : null,
                    scanlator: c.type ? c.type.charAt(0).toUpperCase() + c.type.slice(1) : null
                });
            }
            var meta = data.meta || {};
            if (!items.length || !meta.hasNext) break;
            page++;
        }
        return chapters;
    }

    async getVolumes(hid, link) {
        var data = await this.api("/titles/" + hid + "/volumes");
        var lang = this.lang();
        var vols = [];
        var items = data.items || [];
        for (var i = 0; i < items.length; i++) {
            var v = items[i];
            if (v.language && v.language != lang) continue;
            vols.push({
                name: "Volume " + v.number + (v.name ? ": " + v.name : ""),
                url: link + "/volume/" + v.id,
                dateUpload: null,
                scanlator: v.chapterCount ? v.chapterCount + " chapters" : null
            });
        }
        return vols;
    }

    // ---- pages -------------------------------------------------------------

    async getPageList(url) {
        url = String(url || "");
        var m = url.match(/\/(chapter|volume)\/(\d+)/);
        if (!m) throw new Error("MangaFire: unrecognised chapter URL (refresh the series to update it): " + url);
        var path = (m[1] == "volume" ? "/volumes/" : "/chapters/") + m[2];
        var data = (await this.api(path)).data;
        var hdr = { "Referer": this.source.baseUrl + "/" };
        var pages = [];
        var list = data.pages || data.images || [];
        for (var i = 0; i < list.length; i++) {
            var p = list[i];
            var imgUrl = typeof p === "string" ? p : (p.url || p[0]);
            if (imgUrl) pages.push({ url: imgUrl, headers: hdr });
        }
        return pages;
    }

    // ---- filters & preferences --------------------------------------------

    getFilterList() {
        var cb = function (x) { return { type_name: "CheckBox", name: x[0], value: x[1] }; };
        var tri = function (x) { return { type_name: "TriState", name: x[0], value: x[1] }; };
        var opt = function (x) { return { type_name: "SelectOption", name: x[0], value: x[1] }; };
        return [
            {
                type_name: "SelectFilter", type: "sort", name: "Sort", state: 0,
                values: [
                    ["Best match (with a search term) / Trending", "relevance:desc"],
                    ["Trending", "trending:desc"],
                    ["Latest update", "chapter_updated_at:desc"],
                    ["Recently added", "created_at:desc"],
                    ["Most viewed - 7 days", "views_7d:desc"],
                    ["Most viewed - 30 days", "views_30d:desc"],
                    ["Most viewed - all time", "views_total:desc"],
                    ["Most followed", "follows_total:desc"],
                    ["Highest rated", "score:desc"],
                    ["Title A-Z", "title:asc"],
                    ["Title Z-A", "title:desc"],
                    ["Year (newest)", "year:desc"],
                    ["Year (oldest)", "year:asc"]
                ].map(opt)
            },
            {
                type_name: "GroupFilter", type: "types", name: "Type",
                state: [["Manga", "manga"], ["Manhwa", "manhwa"], ["Manhua", "manhua"], ["Other", "other"]].map(cb)
            },
            {
                type_name: "GroupFilter", type: "statuses", name: "Status",
                state: [["Releasing", "releasing"], ["Finished", "finished"], ["On Hiatus", "on_hiatus"], ["Discontinued", "discontinued"], ["Not Yet Released", "not_yet_released"]].map(cb)
            },
            {
                type_name: "GroupFilter", type: "content_rating", name: "Content rating",
                state: [["Safe", "safe"], ["Suggestive", "suggestive"], ["Erotica", "erotica"], ["Pornographic", "pornographic"]].map(cb)
            },
            {
                type_name: "GroupFilter", type: "genres", name: "Genres",
                state: [
                    ["Action", "1"], ["Adult", "268929"], ["Adventure", "78"], ["Avant Garde", "3"], ["Boys Love", "4"],
                    ["Comedy", "5"], ["Crime", "268921"], ["Demons", "77"], ["Drama", "6"], ["Ecchi", "7"],
                    ["Fantasy", "79"], ["Girls Love", "9"], ["Gourmet", "10"], ["Hentai", "268930"], ["Historical", "268922"],
                    ["Horror", "530"], ["Isekai", "13"], ["Iyashikei", "531"], ["Josei", "15"], ["Kids", "532"],
                    ["Magic", "539"], ["Magical Girls", "268923"], ["Mahou Shoujo", "533"], ["Martial Arts", "534"], ["Mature", "268931"],
                    ["Mecha", "19"], ["Medical", "268924"], ["Military", "535"], ["Music", "21"], ["Mystery", "22"],
                    ["Parody", "23"], ["Philosophical", "268925"], ["Psychological", "536"], ["Romance", "26"], ["School", "73"],
                    ["Sci-Fi", "28"], ["Seinen", "537"], ["Shoujo", "30"], ["Shounen", "31"], ["Slice of Life", "538"],
                    ["Smut", "268932"], ["Space", "33"], ["Sports", "34"], ["Super Power", "75"], ["Superhero", "268926"],
                    ["Supernatural", "76"], ["Suspense", "37"], ["Thriller", "38"], ["Tragedy", "268927"], ["Vampire", "39"],
                    ["Wuxia", "268928"]
                ].map(tri)
            },
            {
                type_name: "SelectFilter", type: "min_chap", name: "Minimum chapters", state: 0,
                values: [["Any", ""], [">= 1", "1"], [">= 3", "3"], [">= 5", "5"], [">= 10", "10"], [">= 20", "20"], [">= 30", "30"], [">= 50", "50"], [">= 100", "100"]].map(opt)
            }
        ];
    }

    getSourcePreferences() {
        return [{
            key: "mangafire_pref_content_view",
            listPreference: {
                title: "View manga as",
                summary: "",
                valueIndex: 0,
                entries: ["Chapters", "Volumes"],
                entryValues: ["chapter", "volume"]
            }
        }, {
            key: "mangafire_pref_chapter_type",
            listPreference: {
                title: "Chapter releases",
                summary: "MangaFire often lists an official and an unofficial release of the same chapter",
                valueIndex: 0,
                entries: ["All", "Official only", "Unofficial only"],
                entryValues: ["all", "official", "unofficial"]
            }
        }];
    }
}
