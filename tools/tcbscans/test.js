const { load, call, check, download, finish } = require('../harness-lib.js');
(async () => {
  const { meta, ext } = load(__dirname + '/tcbscans.js', {});
  console.log('source meta:', meta.name, meta.id, meta.version, meta.baseUrl);
  console.log('\n# getPopular (single page: site has ~20 projects)');
  const p1 = await call(() => ext.getPopular(1));
  console.log('  popular:', p1.list.length, p1.list.map(x => x.name));
  check('popular lists projects', p1.list.length >= 15, p1.list.length);
  check('hasNextPage false (small site)', p1.hasNextPage === false);
  check('items have name/link/image', p1.list.every(x => x.name && /\/mangas\/\d+\//.test(x.link) && /^https?:/.test(x.imageUrl)));
  console.log('\n# latest');
  const l = await call(() => ext.getLatestUpdates(1));
  console.log('  latest order:', l.list.slice(0, 8).map(x => x.name));
  check('latest starts with most recently updated (One Piece)', l.list[0].name.trim() === 'One Piece', l.list[0].name);
  console.log('\n# search (client-side)');
  for (const [q, want] of [['one piece', 'One Piece'], ['hunter', 'Hunter X Hunter'], ['jujutsu', 'Jujutsu Kaisen'], ['chainsaw', 'Chainsaw Man']]) {
    const r = await call(() => ext.search(q, 1, []));
    console.log(`  "${q}" ->`, r.list.map(x => x.name));
    check(`search "${q}"`, r.list.some(x => x.name.trim().toLowerCase() === want.toLowerCase()));
  }
  const none = await call(() => ext.search('zzzz nothing', 1, [])); check('no-match search empty', none.list.length === 0);
  console.log('\n# getDetail One Piece');
  const op = p1.list.find(x => x.name.trim() === 'One Piece');
  const d = await call(() => ext.getDetail(op.link));
  console.log('  name:', d.name, '| status:', d.status, '| image:', d.imageUrl);
  console.log('  desc:', d.description.slice(0, 110));
  console.log('  chapters:', d.chapters.length);
  d.chapters.slice(0, 4).forEach(c => console.log('   ', c.name, c.url, c.dateUpload && new Date(+c.dateUpload).toISOString()));
  console.log('    ...', d.chapters[d.chapters.length - 1]);
  check('detail populated', d.name === 'One Piece' && d.imageUrl && d.description.length > 50);
  check('latest chapter is 1197', /^Chapter 1197\b/.test(d.chapters[0].name), d.chapters[0].name);
  check('many chapters', d.chapters.length > 1100, d.chapters.length);
  check('newest chapter has exact date from home page', d.chapters[0].dateUpload === String(Date.parse('2026-10-29T19:10:48Z')));
  const dated = d.chapters.filter(c => c.dateUpload).length; console.log('  chapters with date:', dated, '/', d.chapters.length);
  check('urls unique', new Set(d.chapters.map(c => c.url)).size === d.chapters.length);
  console.log('\n# getDetail Hunter x Hunter');
  const hx = await call(() => ext.getDetail(p1.list.find(x => /hunter/i.test(x.name)).link));
  console.log('  ', hx.name, hx.chapters.length, 'chapters; newest', hx.chapters[0].name, hx.chapters[0].dateUpload && new Date(+hx.chapters[0].dateUpload).toISOString());
  check('HxH has chapters', hx.chapters.length > 5 && /410/.test(hx.chapters[0].name));
  console.log('\n# getPageList', d.chapters[0].url);
  const pages = await call(() => ext.getPageList(d.chapters[0].url));
  console.log('  pages:', pages.length, pages[0]);
  check('pages returned', pages.length > 10, pages.length);
  for (const pg of [pages[0], pages[pages.length - 1]]) {
    const r = await download(pg.url, pg.headers);
    check('image downloads', r.status === 200 && !!r.kind, `${r.status} ${r.type} ${r.kind} ${r.len} bytes ${pg.url}`);
  }
  const nr = await download(pages[0].url); console.log('  without headers ->', nr.status, nr.kind);
  const hp = await call(() => ext.getPageList(hx.chapters[0].url)); console.log('  HxH newest pages:', hp.length, hp[0] && hp[0].url);
  check('HxH pages', hp.length > 5);
  finish();
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
