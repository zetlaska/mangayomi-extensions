// Node harness that mimics Mangayomi's JS extension runtime (lib/eval/javascript/service.dart):
// the extension source is evaluated in an isolated context that only has what Mangayomi injects
// (MProvider, Client, SharedPreferences, console) - no fetch, Buffer, atob, TextEncoder, crypto.
// Client.get/post return {body, statusCode, headers} like Mangayomi's http_get bridge.
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, 'mangafire.js'), 'utf8');
const LANG = process.env.MF_LANG || 'en';
const PREFS = JSON.parse(process.env.MF_PREFS || '{}');
const httpLog = [];

async function hostRequest(method, url, headers, body) {
  const t0 = Date.now();
  const r = await fetch(url, { method, headers: headers || {}, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  const h = {}; r.headers.forEach((v, k) => { h[k] = v; });
  httpLog.push(`${method} ${r.status} ${Date.now() - t0}ms ${url.length > 160 ? url.slice(0, 160) + '…' : url}`);
  return { body: text, statusCode: r.status, headers: h };
}

function makeContext(meta) {
  const ctx = vm.createContext({ console: { log: (...a) => console.log('[ext]', ...a), warn: console.warn, error: console.error } });
  ctx.__host = { request: hostRequest, prefs: PREFS };
  ctx.__source = JSON.stringify(meta);
  vm.runInContext(`
    // strip anything Mangayomi/QuickJS does not provide
    for (const k of ['fetch','atob','btoa','TextEncoder','TextDecoder','Buffer','crypto','URL','URLSearchParams','window','document','navigator']) { try { delete globalThis[k]; } catch (e) {} }
    class Client {
      constructor(reqcopyWith) { this.reqcopyWith = reqcopyWith; }
      async get(url, headers) { return __host.request('GET', url, headers); }
      async post(url, headers, body) { return __host.request('POST', url, headers, body); }
    }
    class SharedPreferences { get(key) { return __host.prefs[key]; } getString(key, d) { return __host.prefs[key] ?? d; } }
    class MProvider { get source() { return JSON.parse(__source); } }
  `, ctx);
  vm.runInContext(SRC + '\n;globalThis.extention = new DefaultExtension(); globalThis.__sources = mangayomiSources;', ctx, { filename: 'mangafire.js' });
  return ctx;
}

let pass = 0, fail = 0;
function check(name, cond, info) { if (cond) { pass++; console.log('  PASS', name, info ?? ''); } else { fail++; console.log('  FAIL', name, info ?? ''); } }

(async () => {
  const boot = makeContext({});
  const meta = JSON.parse(JSON.stringify(boot.__sources[0]));
  meta.lang = LANG;
  console.log('source meta:', meta.name, meta.id, meta.version, meta.baseUrl, 'lang=' + LANG);
  const ctx = makeContext(meta);
  const ext = ctx.extention;
  // Mangayomi passes results through JSON (jsonStringify) - do the same
  const call = async (fn) => JSON.parse(JSON.stringify(await fn()));

  console.log('\n# getPopular page 1 & 2');
  const p1 = await call(() => ext.getPopular(1));
  const p2 = await call(() => ext.getPopular(2));
  console.log('  p1:', p1.list.length, p1.list.slice(0, 5).map(x => x.name));
  console.log('  p2:', p2.list.length, p2.list.slice(0, 5).map(x => x.name));
  const n1 = new Set(p1.list.map(x => x.link)), overlap = p2.list.filter(x => n1.has(x.link)).length;
  check('popular p1 has many titles', p1.list.length >= 10, p1.list.length);
  check('popular p2 differs from p1', p2.list.length >= 10 && overlap === 0, `overlap=${overlap}`);
  check('popular hasNextPage', p1.hasNextPage === true);
  check('popular items have name/link/imageUrl', p1.list.every(x => x.name && x.link && /^https?:/.test(x.imageUrl)));

  console.log('\n# getLatestUpdates');
  const l1 = await call(() => ext.getLatestUpdates(1));
  console.log('  latest:', l1.list.length, l1.list.slice(0, 5).map(x => x.name));
  check('latest has titles', l1.list.length >= 10);

  console.log('\n# search "one piece"');
  const s = await call(() => ext.search('one piece', 1, []));
  console.log('  search:', s.list.length, s.list.slice(0, 5).map(x => x.name));
  const op = s.list.find(x => x.name === 'One Piece');
  check('search finds One Piece', !!op, op && op.link);

  console.log('\n# search with filters (Mangayomi filter state objects)');
  const fl = JSON.parse(JSON.stringify(ext.getFilterList()));
  fl[0].state = 8;                                   // Highest rated
  fl[1].state.find(x => x.value === 'manhwa').state = true;
  fl[4].state.find(x => x.name === 'Action').state = 1;   // include
  fl[4].state.find(x => x.name === 'Ecchi').state = 2;    // exclude
  const sf = await call(() => ext.search('', 1, fl));
  console.log('  filtered:', sf.list.length, sf.list.slice(0, 5).map(x => x.name));
  check('filtered search returns titles', sf.list.length > 0);

  const target = process.env.MF_TITLE || (op ? op.link : p1.list[0].link);
  console.log('\n# getDetail', target);
  const d = await call(() => ext.getDetail(target));
  console.log('  name:', d.name, '| status:', d.status, '| author:', d.author, '| artist:', d.artist);
  console.log('  genre:', d.genre.join(', '));
  console.log('  image:', d.imageUrl);
  console.log('  description:', (d.description || '').slice(0, 140).replace(/\n/g, ' '), '…');
  console.log('  chapters:', d.chapters.length, 'first 3:', d.chapters.slice(0, 3));
  console.log('  last:', d.chapters[d.chapters.length - 1]);
  check('detail fields populated', d.name && d.imageUrl && d.description && d.author && d.genre.length > 0 && typeof d.status === 'number');
  check('many chapters', d.chapters.length > 100, d.chapters.length);
  check('chapters have dates', d.chapters.every(c => c.dateUpload && !isNaN(+c.dateUpload)), new Date(+d.chapters[0].dateUpload).toISOString());
  check('chapter urls unique', new Set(d.chapters.map(c => c.url)).size === d.chapters.length);

  console.log('\n# getPageList', d.chapters[0].url);
  const pages = await call(() => ext.getPageList(d.chapters[0].url));
  console.log('  pages:', pages.length, 'first:', pages[0]);
  check('pages returned', pages.length > 0);
  for (const [i, pg] of [[0, pages[0]], [pages.length - 1, pages[pages.length - 1]]]) {
    const r = await fetch(pg.url, { headers: pg.headers });
    const buf = Buffer.from(await r.arrayBuffer());
    const isImg = buf[0] === 0xff && buf[1] === 0xd8 || buf.slice(0, 4).toString('hex') === '89504e47' || buf.slice(8, 12).toString() === 'WEBP';
    check(`page ${i + 1} downloads with Referer`, r.status === 200 && isImg, `${r.status} ${r.headers.get('content-type')} ${buf.length} bytes`);
  }
  const noRef = await fetch(pages[0].url);
  console.log('  same image without Referer ->', noRef.status);

  console.log('\n# legacy URL support');
  const legacy = await call(() => ext.getDetail('https://mangafire.to/manga/one-piecee.dkw'));
  check('legacy /manga/<slug>.<hid> link resolves', legacy.name === 'One Piece', legacy.name);

  console.log('\n# volumes view preference');
  PREFS.mangafire_pref_content_view = 'volume';
  const dv = await call(() => ext.getDetail(target));
  console.log('  volumes:', dv.chapters.length, dv.chapters.slice(0, 2));
  if (dv.chapters.length && /\/volume\//.test(dv.chapters[0].url)) {
    const vp = await call(() => ext.getPageList(dv.chapters[0].url));
    check('volume pages returned', vp.length > 0, vp.length);
  } else console.log('  (title has no volumes)');
  delete PREFS.mangafire_pref_content_view;

  console.log('\nHTTP log:'); httpLog.forEach(l => console.log('  ' + l));
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
