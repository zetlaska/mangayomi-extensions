/*
 * MANGA Plus by SHUEISHA extension for Mangayomi (JavaScript, works on iOS)
 *
 * Uses the official web API at https://jumpg-webapi.tokyo-cdn.com/api, the same one the
 * mangaplus.shueisha.co.jp web reader uses. Every request needs a SESSION-TOKEN header
 * (any random UUID, as the web app generates); without it the API answers "Account Banned".
 * The API only speaks protobuf (format=json is rejected with 403), so this file contains a
 * minimal pure-JS protobuf reader for the handful of fields it needs.
 *
 * Binary data: Mangayomi's JS Client returns the Dart http Response.body. For responses
 * without a charset (application/x-protobuf, image/jpeg) Dart decodes the bytes as latin1,
 * so each JS char code is exactly one byte (0-255). That is what makes this source possible.
 *
 * Page images are XOR-encrypted with a per-page hex key and the CDN only serves them with the
 * viewer's "Plus-Vw-Token" header. Mangayomi has no per-image decrypt hook, so getPageList
 * downloads each page, XOR-decrypts it in JS and returns it as a data:image/jpeg;base64 URI,
 * which Mangayomi's reader image provider decodes natively (Mangayomi 0.9.x+).
 *
 * Endpoints:
 *   /title_list/rankingV2?lang=eng&type=hottest&clang=eng -> popular
 *   /title_list/updated                                    -> latest updates
 *   /title_list/allV2                                      -> every title (search is client-side)
 *   /title_detailV4?title_id=<id>&clang=eng                -> details + readable chapters
 *   /manga_viewer_v3?chapter_id=<id>&split=yes&img_quality=<q>&clang=eng -> pages + keys + vwToken
 *
 * MANGA Plus itself only lets free users read the first 3 and latest 3 chapters of most series
 * (some "deluxe" series only the first 3). Only chapters the API exposes are listed.
 *
 * Version History:
 * - 0.1.0: Initial release (English)
 */

const mangayomiSources = [{
    "id": 573904126,
    "name": "MANGA Plus by SHUEISHA",
    "lang": "en",
    "baseUrl": "https://mangaplus.shueisha.co.jp",
    "apiUrl": "https://jumpg-webapi.tokyo-cdn.com/api",
    "iconUrl": "https://raw.githubusercontent.com/zetlaska/mangayomi-extensions/main/javascript/icon/en.mangaplus.png",
    "typeSource": "single",
    "itemType": 0,
    "isNsfw": false,
    "hasCloudflare": false,
    "version": "0.1.0",
    "dateFormat": "",
    "dateFormatLocale": "",
    "pkgPath": "manga/src/en/mangaplus.js"
}];

// ---------------------------------------------------------------------------
// Minimal protobuf reader over a "byte string" (each char code = one byte)
// ---------------------------------------------------------------------------
// pbParse(bytes, start, end) -> { fieldNo: [values...] } where varints are numbers and
// length-delimited fields are {s, e} ranges into the same byte string (decoded lazily).
function pbParse(b, start, end) {
    var i = start || 0, n = end === undefined ? b.length : end, out = {};
    while (i < n) {
        var key = 0, shift = 0, x;
        do { x = b.charCodeAt(i++) & 255; key += (x & 127) * Math.pow(2, shift); shift += 7; } while (x >= 128 && i < n);
        var f = Math.floor(key / 8), wt = key % 8, v;
        if (wt == 0) {
            v = 0; shift = 0;
            do { x = b.charCodeAt(i++) & 255; v += (x & 127) * Math.pow(2, shift); shift += 7; } while (x >= 128 && i < n);
        } else if (wt == 2) {
            var len = 0; shift = 0;
            do { x = b.charCodeAt(i++) & 255; len += (x & 127) * Math.pow(2, shift); shift += 7; } while (x >= 128 && i < n);
            v = { s: i, e: i + len }; i += len;
        } else if (wt == 1) { v = null; i += 8; }
        else if (wt == 5) { v = null; i += 4; }
        else throw new Error("protobuf: unsupported wire type " + wt);
        (out[f] || (out[f] = [])).push(v);
    }
    return out;
}
function pbUtf8(b, r) {
    if (!r) return "";
    var s = "", i = r.s;
    while (i < r.e) {
        var c = b.charCodeAt(i++) & 255, cp;
        if (c < 128) cp = c;
        else if (c < 224) cp = ((c & 31) << 6) | (b.charCodeAt(i++) & 63);
        else if (c < 240) { cp = ((c & 15) << 12) | ((b.charCodeAt(i++) & 63) << 6) | (b.charCodeAt(i++) & 63); }
        else { cp = ((c & 7) << 18) | ((b.charCodeAt(i++) & 63) << 12) | ((b.charCodeAt(i++) & 63) << 6) | (b.charCodeAt(i++) & 63); }
        if (cp > 0xffff) { cp -= 0x10000; s += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 1023)); }
        else s += String.fromCharCode(cp);
    }
    return s;
}
// helpers: message view with lazy children
function PB(b, r) { this.b = b; this.f = pbParse(b, r ? r.s : 0, r ? r.e : b.length); }
PB.prototype.msg = function (n) { var v = this.f[n]; return v && v[0] && typeof v[0] == "object" ? new PB(this.b, v[0]) : null; };
PB.prototype.msgs = function (n) { var self = this; return (this.f[n] || []).filter(function (v) { return v && typeof v == "object"; }).map(function (v) { return new PB(self.b, v); }); };
PB.prototype.str = function (n) { var v = this.f[n]; return v && v[0] && typeof v[0] == "object" ? pbUtf8(this.b, v[0]) : ""; };
PB.prototype.num = function (n) { var v = this.f[n]; return v && typeof v[0] == "number" ? v[0] : 0; };
PB.prototype.has = function (n) { return !!this.f[n]; };

var MP_B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
// XOR-decrypt a byte string with a hex key and return base64 of the result
function mpXorBase64(data, hexKey) {
    var key = [];
    for (var k = 0; k + 1 < hexKey.length; k += 2) key.push(parseInt(hexKey.substr(k, 2), 16));
    var kl = key.length, n = data.length, parts = [], chunk = [], i = 0;
    var byteAt = function (j) { var c = data.charCodeAt(j) & 255; return kl ? c ^ key[j % kl] : c; };
    for (i = 0; i + 2 < n; i += 3) {
        var t = (byteAt(i) << 16) | (byteAt(i + 1) << 8) | byteAt(i + 2);
        chunk.push(MP_B64.charAt(t >> 18) + MP_B64.charAt((t >> 12) & 63) + MP_B64.charAt((t >> 6) & 63) + MP_B64.charAt(t & 63));
        if (chunk.length >= 8192) { parts.push(chunk.join("")); chunk = []; }
    }
    if (i < n) {
        var a = byteAt(i), bb = i + 1 < n ? byteAt(i + 1) : 0, t2 = (a << 16) | (bb << 8);
        chunk.push(MP_B64.charAt(t2 >> 18) + MP_B64.charAt((t2 >> 12) & 63) + (i + 1 < n ? MP_B64.charAt((t2 >> 6) & 63) : "=") + "=");
    }
    parts.push(chunk.join(""));
    return parts.join("");
}

function mpUuid() {
    var h = "0123456789abcdef", s = "";
    for (var i = 0; i < 36; i++) {
        if (i == 8 || i == 13 || i == 18 || i == 23) s += "-";
        else if (i == 14) s += "4";
        else if (i == 19) s += h.charAt(8 + Math.floor(Math.random() * 4));
        else s += h.charAt(Math.floor(Math.random() * 16));
    }
    return s;
}
var MP_SESSION = mpUuid();

class DefaultExtension extends MProvider {

    getHeaders(url) {
        return {
            "Referer": "https://mangaplus.shueisha.co.jp/",
            "Origin": "https://mangaplus.shueisha.co.jp"
        };
    }

    get supportsLatest() {
        return true;
    }

    getPref(key, def) {
        var v = new SharedPreferences().get(key);
        return (v === null || v === undefined || v === "") ? def : v;
    }

    // GET an API path and return the SuccessResult message (Response field 1)
    async api(path) {
        var url = (this.source.apiUrl || "https://jumpg-webapi.tokyo-cdn.com/api") + path;
        var res = await new Client().get(url, {
            "SESSION-TOKEN": MP_SESSION,
            "Referer": "https://mangaplus.shueisha.co.jp/",
            "Origin": "https://mangaplus.shueisha.co.jp"
        });
        if (res.statusCode != 200) throw new Error("MANGA Plus API HTTP " + res.statusCode + " for " + path.split("?")[0]);
        var root = new PB(res.body);
        var ok = root.msg(1);
        if (!ok) {
            var err = root.msg(2), msg = "";
            if (err) {
                var pop = err.msg(2) || err.msg(1);
                if (pop) msg = (pop.str(1) + ": " + pop.str(2)).trim();
            }
            throw new Error("MANGA Plus: " + (msg || "unexpected response"));
        }
        return ok;
    }

    // Title message -> {id, name, author, image, lang}
    title(t) {
        return { id: t.num(1), name: t.str(2).trim(), author: t.str(3), image: t.str(4), lang: t.num(7) };
    }

    titleUrl(id) {
        return this.source.baseUrl + "/titles/" + id;
    }

    toItem(t) {
        return { name: t.name, imageUrl: t.image, link: this.titleUrl(t.id) };
    }

    page(list, page) {
        var per = 30, start = (page - 1) * per;
        return { list: list.slice(start, start + per), hasNextPage: start + per < list.length };
    }

    async getPopular(page) {
        var ok = await this.api("/title_list/rankingV2?lang=eng&type=hottest&clang=eng");
        var view = ok.msg(37), list = [], seen = {};
        if (view) {
            var groups = view.msgs(3);
            for (var i = 0; i < groups.length; i++) {
                var ts = groups[i].msgs(2);
                for (var j = 0; j < ts.length; j++) {
                    var t = this.title(ts[j]);
                    if (t.lang == 0 && !seen[t.id]) { seen[t.id] = true; list.push(this.toItem(t)); break; }
                }
            }
        }
        return this.page(list, page);
    }

    async getLatestUpdates(page) {
        var ok = await this.api("/title_list/updated");
        var view = ok.msg(20), list = [], seen = {};
        if (view) {
            var items = view.msgs(1);
            for (var i = 0; i < items.length; i++) {
                var tm = items[i].msg(1);
                if (!tm) continue;
                var t = this.title(tm);
                if (t.lang == 0 && !seen[t.id]) { seen[t.id] = true; list.push(this.toItem(t)); }
            }
        }
        return this.page(list, page);
    }

    norm(s) {
        return String(s || "").toLowerCase().replace(/[\u2018\u2019']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
    }

    async search(query, page, filters) {
        var ok = await this.api("/title_list/allV2");
        var view = ok.msg(25), list = [], seen = {};
        var words = this.norm(query).split(" ").filter(function (w) { return w; });
        if (view) {
            var groups = view.msgs(1);
            for (var i = 0; i < groups.length; i++) {
                var ts = groups[i].msgs(2);
                for (var j = 0; j < ts.length; j++) {
                    var t = this.title(ts[j]);
                    if (t.lang != 0 || seen[t.id]) continue;
                    var n = this.norm(t.name + " " + t.author);
                    if (words.every(function (w) { return n.indexOf(w) != -1; })) { seen[t.id] = true; list.push(this.toItem(t)); }
                }
            }
        }
        // titles whose name starts with the query first
        // exact title (ignoring a trailing "(...)" alias) first, then titles starting with the query
        var q = this.norm(query), self = this;
        var rank = function (x) {
            var n = self.norm(x.name), base = self.norm(x.name.replace(/\([^)]*\)\s*$/, ""));
            return (n == q || base == q) ? 0 : n.indexOf(q) == 0 ? 1 : 2;
        };
        if (q) {
            list = list.map(function (x, i) { return { x: x, r: rank(x), i: i }; })
                .sort(function (a, b) { return a.r - b.r || a.i - b.i; })
                .map(function (o) { return o.x; });
        }
        return this.page(list, page);
    }

    idFromUrl(url) {
        var m = String(url).match(/(\d{5,})(?!.*\d{5,})/);
        if (!m) throw new Error("MANGA Plus: cannot find an id in " + url);
        return m[1];
    }

    async getDetail(url) {
        var id = this.idFromUrl(url);
        var ok = await this.api("/title_detailV4?title_id=" + id + "&clang=eng");
        var d = ok.msg(8);
        if (!d) throw new Error("MANGA Plus: title " + id + " not found");
        var t = this.title(d.msg(1));

        var genre = d.msgs(31).map(function (g) { return g.str(1).trim(); }).filter(function (x) { return x; });
        var desc = d.str(3);
        var period = d.str(7);
        if (period) desc += "\n\n" + period;

        var chapters = [], seen = {};
        var entries = d.msgs(47);
        for (var i = 0; i < entries.length; i++) {
            var c = entries[i].msg(1);           // field 2 = hidden (subscription-only) range marker
            if (!c) continue;
            var cid = c.num(2);
            if (!cid || seen[cid]) continue;
            seen[cid] = true;
            var num = c.str(3).replace(/^#/, "").replace(/^0+(\d)/, "$1");
            var sub = c.str(4).trim();
            // subtitles look like "Chapter 1197: Love is Defense", "38: Follow Your Heart", "38" or "Episode One"
            var body = sub.replace(/^chapter\s*/i, "");
            var m = body.match(/^#?0*(\d+(?:\.\d+)?)\s*(?:[:.\-]\s*|$)/);
            if (m && m[1] == num) body = body.slice(m[0].length);
            var name = num ? "Chapter " + num + (body ? ": " + body : "") : (sub || "Chapter");
            var start = c.num(6);
            chapters.push({
                name: name,
                url: this.source.baseUrl + "/viewer/" + cid,
                dateUpload: start ? String(start * 1000) : null,
                scanlator: "SHUEISHA"
            });
        }
        chapters.reverse(); // newest first

        return {
            name: t.name,
            imageUrl: d.str(2) || t.image,
            description: desc.trim(),
            author: t.author,
            artist: t.author,
            genre: genre,
            status: d.num(5) > 0 ? 0 : 5,
            link: this.titleUrl(t.id),
            chapters: chapters
        };
    }

    async getPageList(url) {
        var cid = this.idFromUrl(url);
        var quality = this.getPref("mangaplus_quality", "high");
        var ok = await this.api("/manga_viewer_v3?chapter_id=" + cid + "&split=yes&img_quality=" + quality + "&clang=eng");
        var v = ok.msg(10);
        if (!v) throw new Error("MANGA Plus: this chapter is not available (it may be subscription-only or expired)");
        var vwToken = v.str(19);
        var pages = [];
        var ps = v.msgs(1);
        for (var i = 0; i < ps.length; i++) {
            var mp = ps[i].msg(1);            // only real manga pages; banners/last page are other fields
            if (mp && mp.str(1)) pages.push({ url: mp.str(1), key: mp.str(5) });
        }
        if (!pages.length) throw new Error("MANGA Plus: no pages returned for this chapter");

        var headers = { "Referer": "https://mangaplus.shueisha.co.jp/", "Origin": "https://mangaplus.shueisha.co.jp" };
        if (vwToken) headers["Plus-Vw-Token"] = vwToken;
        var out = new Array(pages.length);
        var batch = 4;
        for (var s = 0; s < pages.length; s += batch) {
            var jobs = [];
            for (var j = s; j < Math.min(s + batch, pages.length); j++) {
                jobs.push((async function (idx) {
                    var p = pages[idx];
                    var res = await new Client().get(p.url, headers);
                    if (res.statusCode != 200) throw new Error("MANGA Plus: page " + (idx + 1) + " HTTP " + res.statusCode);
                    out[idx] = { url: "data:image/jpeg;base64," + mpXorBase64(res.body, p.key) };
                })(j));
            }
            await Promise.all(jobs);
        }
        return out;
    }

    getFilterList() {
        return [];
    }

    getSourcePreferences() {
        return [{
            key: "mangaplus_quality",
            listPreference: {
                title: "Image quality",
                summary: "Higher quality pages take longer to load (every page is downloaded and decrypted when a chapter opens)",
                valueIndex: 1,
                entries: ["Low", "High", "Super high"],
                entryValues: ["low", "high", "super_high"]
            }
        }];
    }
}
