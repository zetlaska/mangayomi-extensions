/*
 * MangaFire Extension for Mangayomi
 * 
 * Original Source: entityJY/mangayomi-extensions-eJ
 * Repository: https://github.com/entityJY/mangayomi-extensions-eJ
 * License: Apache License 2.0
 * 
 * Copyright 2023 Moustapha Kodjo Amadou
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Adapted for zetlaska/mangayomi-extensions repository
 * ID changed to avoid conflicts with upstream source
 */

const mangayomiSources = [
  {
    "id": 123456789,
    "name": "Mangafire",
    "lang": "en",
    "baseUrl": "https://mangafire.to",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/zetlaska/mangayomi-extensions/main/javascript/icon/mangafire.png",
    "typeSource": "single",
    "itemType": 0,
    "version": "0.2.20",
    "dateFormat": "",
    "dateFormatLocale": "",
    "pkgPath": "manga/src/all/mangafire.js"
  }
];

class DefaultExtension extends MProvider {
  getPreference(key) {
    return new SharedPreferences().get(key);
  }

  mangaListFromPage(res) {
    const doc = new Document(res.body);
    const elements = doc.select("div.unit");
    const list = [];

    for (const element of elements) {
      const name = element.selectFirst("div.info > a").text;
      const imageUrl = element.selectFirst("img").getSrc;
      const link = element.selectFirst("a").getHref;
      list.push({ name, imageUrl, link });
    }

    const hasNextPage = doc.selectFirst("li.page-item.active + li").text != "";
    return { "list": list, "hasNextPage": hasNextPage };
  }

  statusFromString(status) {
    return (
      {
        "Releasing": 0,
        "Completed": 1,
        "On_Hiatus": 2,
        "Discontinued": 3,
        "Unrealeased": 4,
      }[status] ?? 5
    );
  }

  parseDate(date) {
    const months = {
      "jan": "01",
      "feb": "02",
      "mar": "03",
      "apr": "04",
      "may": "05",
      "jun": "06",
      "jul": "07",
      "aug": "08",
      "sep": "09",
      "oct": "10",
      "nov": "11",
      "dec": "12",
    };
    date = date.toLowerCase().replace(",", "").split(" ");

    if (!(date[0] in months)) {
      return String(new Date().valueOf());
    }

    date[0] = months[date[0]];
    date = [date[2], date[0], date[1]];
    date = date.join("-");
    return String(new Date(date).valueOf());
  }

  async filterPage({ keyword = "", slug = "" } = {}) {
    var vrf = "";
    if (keyword != "") vrf = this.generate_vrf(keyword);

    slug = `keyword=${keyword}&${slug}`;
    if (vrf != "") slug += `&vrf=${vrf}`;

    const res = await new Client().get(`${this.source.baseUrl}/filter?${slug}`);
    return this.mangaListFromPage(res);
  }

  async getPopular(page) {
    return await this.filterPage({
      keyword: "",
      slug: `language=${this.source.lang}&sort=trending&page=${page}`,
    });
  }

  async getLatestUpdates(page) {
    return await this.filterPage({
      keyword: "",
      slug: `language=${this.source.lang}&sort=recently_updated&page=${page}`,
    });
  }

  async search(query, page, filters) {
    var slug = `language=${this.source.lang}&page=${page}`;

    var isFiltersAvailable = filters && filters.length > 0;
    if (isFiltersAvailable) {
      for (const filter of filters[0].state) {
        if (filter.state == true) slug += `&type%5B%5D=${filter.value}`;
      }

      for (const filter of filters[1].state) {
        if (filter.state == 1) slug += `&genre%5B%5D=${filter.value}`;
        else if (filter.state == 2) slug += `&genre%5B%5D=-${filter.value}`;
      }

      for (const filter of filters[2].state) {
        if (filter.state == true) slug += `&status%5B%5D=${filter.value}`;
      }

      slug += `&language=${this.source.lang}`;
      slug += `&minchap=${filters[3].values[filters[3].state].value}`;
      slug += `&sort=${filters[4].values[filters[4].state].value}`;
    }

    return await this.filterPage({
      keyword: query,
      slug,
    });
  }

  async getDetail(url) {
    url = url.replace(this.source.baseUrl, "");
    const viewType = this.getPreference("mangafire_pref_content_view") || "chapter";
    const id = url.split(".").pop();
    const detail = {};

    const infoUrl = this.source.baseUrl + url;
    const infoRes = await new Client().get(infoUrl);
    const infoDoc = new Document(infoRes.body);
    const info = infoDoc.selectFirst("div.info");
    const sidebar = infoDoc.select("aside.sidebar div.meta div");
    detail.name = info.selectFirst("h1").text;
    detail.status = this.statusFromString(info.selectFirst("p").text);
    detail.imageUrl = infoDoc.selectFirst("div.poster img").getSrc;
    detail.author = sidebar[0].selectFirst("a").text;
    detail.description = infoDoc.selectFirst("div#synopsis").text.trim();
    detail.genre = sidebar[2].select("a");
    detail.genre.forEach((e, i) => {
      detail.genre[i] = e.text;
    });

    var vrfKey = `${id}@${viewType}@${this.source.lang}`;
    var vrf = this.generate_vrf(vrfKey);

    const chapterUrl =
      this.source.baseUrl +
      `/ajax/read/${id}/${viewType}/${this.source.lang}?vrf=${vrf}`;

    const idRes = await new Client().get(chapterUrl);
    const idDoc = new Document(JSON.parse(idRes.body).result.html);
    const ids = idDoc.select("a");

    var chapElements = null;
    if (viewType == "chapter") {
      const chapRes = await new Client().get(
        this.source.baseUrl +
        `/ajax/manga/${id}/${viewType}/${this.source.lang}?vrf=${vrf}`
      );
      const chapDoc = new Document(JSON.parse(chapRes.body).result);
      chapElements = chapDoc.selectFirst(".scroll-sm").children;
    }
    detail.chapters = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const name = id.text;
      const mangaId = id.attr("data-id");

      var scanlator = null;
      var dateUpload = null;
      if (viewType == "chapter") {
        const chapElement = chapElements[i];
        var title = chapElement.selectFirst("a").attr("title").split(" - ");
        scanlator = title.length > 1 ? title[0] : "Vol 1";
        try {
          dateUpload = this.parseDate(
            chapElement.selectFirst("span + span").text
          );
        } catch (_) {
          dateUpload = null;
        }
      }

      detail.chapters.push({
        name,
        url: `${url.split("/").slice(0, -1).join("/")}/read/${mangaId}`,
        scanlator,
        dateUpload,
      });
    }
    return detail;
  }

  async getPageList(url) {
    url = url.replace(this.source.baseUrl, "");
    const res = await new Client().get(this.source.baseUrl + url);
    const doc = new Document(res.body);
    const ids = doc.select("#id-content img");
    const pages = [];

    for (const id of ids) {
      pages.push(id.getSrc);
    }
    return pages;
  }

  getFilterList() {
    return [
      {
        type_name: "GroupFilter",
        name: "Type",
        state: [
          { type_name: "CheckBox", name: "Manga", value: 0, state: false },
          { type_name: "CheckBox", name: "One-Shot", value: 1, state: false },
          { type_name: "CheckBox", name: "Doujinshi", value: 2, state: false },
          { type_name: "CheckBox", name: "Novel", value: 3, state: false },
          { type_name: "CheckBox", name: "Manhwa", value: 4, state: false },
          { type_name: "CheckBox", name: "Manhua", value: 5, state: false },
        ],
      },
      {
        type_name: "GroupFilter",
        name: "Genre (0=Ignore, 1=Include, 2=Exclude)",
        state: [
          { type_name: "TriState", name: "Action", value: 1, state: 0 },
          { type_name: "TriState", name: "Adventure", value: 2, state: 0 },
          { type_name: "TriState", name: "Avant Garde", value: 3, state: 0 },
          { type_name: "TriState", name: "Comedy", value: 7, state: 0 },
          { type_name: "TriState", name: "Drama", value: 8, state: 0 },
          { type_name: "TriState", name: "Fantasy", value: 10, state: 0 },
          { type_name: "TriState", name: "Horror", value: 14, state: 0 },
          { type_name: "TriState", name: "Mystery", value: 17, state: 0 },
          { type_name: "TriState", name: "Romance", value: 22, state: 0 },
          { type_name: "TriState", name: "Sci-Fi", value: 24, state: 0 },
          { type_name: "TriState", name: "Slice of Life", value: 28, state: 0 },
          { type_name: "TriState", name: "Sports", value: 30, state: 0 },
          { type_name: "TriState", name: "Supernatural", value: 37, state: 0 },
          { type_name: "TriState", name: "Ecchi", value: 49, state: 0 },
        ],
      },
      {
        type_name: "GroupFilter",
        name: "Status",
        state: [
          { type_name: "CheckBox", name: "Completed", value: 1, state: false },
          { type_name: "CheckBox", name: "Releasing", value: 0, state: false },
          { type_name: "CheckBox", name: "On Hiatus", value: 2, state: false },
          { type_name: "CheckBox", name: "Discontinued", value: 3, state: false },
          { type_name: "CheckBox", name: "Not Yet Released", value: 4, state: false },
        ],
      },
      {
        type_name: "Select",
        name: "Minimum Chapters",
        state: 0,
        values: [
          { type_name: "SelectOption", name: "All", value: 0 },
          { type_name: "SelectOption", name: "10+", value: 10 },
          { type_name: "SelectOption", name: "20+", value: 20 },
          { type_name: "SelectOption", name: "30+", value: 30 },
          { type_name: "SelectOption", name: "50+", value: 50 },
        ],
      },
      {
        type_name: "Select",
        name: "Sort By",
        state: 0,
        values: [
          { type_name: "SelectOption", name: "Recently Updated", value: "recently_updated" },
          { type_name: "SelectOption", name: "Recently Added", value: "recently_added" },
          { type_name: "SelectOption", name: "Most Viewed", value: "most_viewed" },
          { type_name: "SelectOption", name: "Trending", value: "trending" },
          { type_name: "SelectOption", name: "A-Z", value: "title_az" },
        ],
      },
    ];
  }

  getSourcePreferences() {
    return [
      {
        key: "mangafire_pref_content_view",
        listPreference: {
          title: "Preferred content view",
          summary: "",
          value: "chapter",
          entries: ["Chapter", "Volume"],
          entryValues: ["chapter", "volume"],
        },
      },
    ];
  }

  generate_vrf(input) {
    const keyBytes = [55, 76, 210, 251, 200, 84, 29, 74];
    const hash = CryptoJS.MD5(input).toString();

    let vrf = "";
    for (let i = 0; i < hash.length; i += 2) {
      const hexByte = hash.substring(i, i + 2);
      const byte = parseInt(hexByte, 16);
      const keyByte = keyBytes[i / 2 % keyBytes.length];
      const xorResult = byte ^ keyByte;
      vrf += String.fromCharCode(xorResult);
    }

    return btoa(vrf)
      .replace(/\//g, "_")
      .replace(/\+/g, "-")
      .replace(/=+$/, "");
  }
}
