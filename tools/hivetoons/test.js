const { load, call, check, download, finish } = require('../harness-lib.js');
const PREFS = {};
(async () => {
  const { meta, ext } = load(__dirname + '/hivetoons.js', PREFS);
  console.log('source meta:', meta.name, meta.id, meta.version, meta.baseUrl);
  console.log('\n# getPopular p1/p2');
  const p1 = await call(() => ext.getPopular(1)), p2 = await call(() => ext.getPopular(2));
  console.log('  p1:', p1.list.length, p1.list.slice(0, 6).map(x => x.name));
  console.log('  p2:', p2.list.length, p2.list.slice(0, 6).map(x => x.name));
  const s1 = new Set(p1.list.map(x => x.link));
  check('popular p1 >= 10', p1.list.length >= 10, p1.list.length);
  check('popular p2 differs', p2.list.length >= 10 && p2.list.every(x => !s1.has(x.link)));
  check('popular hasNextPage', p1.hasNextPage === true);
  check('items have name/link/image', p1.list.every(x => x.name && x.link && /^https?:/.test(x.imageUrl)));
  console.log('\n# latest');
  const l = await call(() => ext.getLatestUpdates(1));
  console.log('  latest:', l.list.length, l.list.slice(0, 6).map(x => x.name));
  check('latest has titles', l.list.length >= 10);
  console.log('\n# search key titles');
  for (const t of ['Lookism', 'Study Group', 'Baek XX', 'Manager Kim', 'Questism', 'Reality Quest', 'High Class']) {
    const r = await call(() => ext.search(t, 1, []));
    const hit = r.list.find(x => x.name.toLowerCase() === t.toLowerCase());
    check(`search "${t}"`, !!hit, hit && hit.link);
  }
  console.log('\n# filters');
  const fl = JSON.parse(JSON.stringify(ext.getFilterList()));
  fl[2].state = 2; // completed
  const sf = await call(() => ext.search('', 1, fl));
  console.log('  completed:', sf.list.length, sf.list.slice(0, 4).map(x => x.name));
  check('status filter returns titles', sf.list.length > 0);
  console.log('\n# getDetail Lookism');
  const d = await call(() => ext.getDetail('https://hivetoons.org/series/lookism'));
  console.log('  name:', d.name, '| status:', d.status, '| author:', d.author, '| genre:', d.genre.join(', '));
  console.log('  image:', d.imageUrl);
  console.log('  desc:', d.description.slice(0, 120).replace(/\n/g, ' '));
  console.log('  chapters:', d.chapters.length, 'first:', d.chapters[0], 'last:', d.chapters[d.chapters.length - 1]);
  check('detail populated', d.name === 'Lookism' && d.imageUrl && d.description && d.author && d.genre.length && d.status === 0);
  check('many chapters', d.chapters.length > 600, d.chapters.length);
  check('chapters dated', d.chapters.every(c => +c.dateUpload > 1e12), new Date(+d.chapters[0].dateUpload).toISOString());
  check('chapter urls unique', new Set(d.chapters.map(c => c.url)).size === d.chapters.length);
  console.log('\n# getPageList', d.chapters[0].url);
  const pages = await call(() => ext.getPageList(d.chapters[0].url));
  console.log('  pages:', pages.length, 'first:', pages[0].url, 'headers:', JSON.stringify(pages[0].headers));
  check('pages returned', pages.length > 5, pages.length);
  for (const pg of [pages[0], pages[pages.length - 1]]) {
    const r = await download(pg.url, pg.headers);
    check('image downloads', r.status === 200 && !!r.kind, `${r.status} ${r.type} ${r.kind} ${r.len} bytes ${pg.url}`);
  }
  const nr = await download(pages[0].url); console.log('  without headers ->', nr.status, nr.kind);
  console.log('\n# locked chapters (series with coin chapters)');
  const lk = await call(() => ext.getDetail('https://hivetoons.org/series/life-changer-voice-phishing'));
  console.log('  default chapters:', lk.chapters.length, 'newest:', lk.chapters[0].name);
  check('locked hidden by default', lk.chapters.every(c => !c.name.includes('\uD83D\uDD12')));
  PREFS.hivetoons_show_locked = true;
  const lk2 = await call(() => ext.getDetail('https://hivetoons.org/series/life-changer-voice-phishing'));
  const locked = lk2.chapters.filter(c => c.name.includes('\uD83D\uDD12'));
  console.log('  with pref:', lk2.chapters.length, 'locked:', locked.length, locked[0] && locked[0].name);
  check('locked shown with pref', locked.length > 0);
  let err = null; try { await call(() => ext.getPageList(locked[0].url)); } catch (e) { err = String(e.message || e); }
  check('locked chapter gives clear error', err && /locked/i.test(err), err);
  delete PREFS.hivetoons_show_locked;
  for (const t of ['study-group', 'baek-xx', 'manager-kim']) {
    const x = await call(() => ext.getDetail('https://hivetoons.org/series/' + t));
    console.log(`  ${x.name}: ${x.chapters.length} readable chapters, newest "${x.chapters[0].name}" ${new Date(+x.chapters[0].dateUpload).toISOString().slice(0,10)}`);
  }
  finish();
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
