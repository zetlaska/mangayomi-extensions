const { load, call, check, download, finish } = require('../harness-lib.js');
const fs = require('fs');
const PREFS = {};
(async () => {
  const { meta, ext } = load(__dirname + '/mangaplus.js', PREFS);
  console.log('source meta:', meta.name, meta.id, meta.version, meta.baseUrl);
  console.log('\n# getPopular p1/p2 (hottest ranking, English)');
  const p1 = await call(() => ext.getPopular(1)), p2 = await call(() => ext.getPopular(2));
  console.log('  p1:', p1.list.length, p1.list.slice(0, 8).map(x => x.name));
  console.log('  p2:', p2.list.length, p2.list.slice(0, 5).map(x => x.name));
  const s1 = new Set(p1.list.map(x => x.link));
  check('popular p1 >= 10', p1.list.length >= 10, p1.list.length);
  check('popular p2 differs', p2.list.length >= 1 && p2.list.every(x => !s1.has(x.link)));
  check('popular hasNextPage', p1.hasNextPage === true);
  check('items have name/link/image', p1.list.every(x => x.name && /\/titles\/\d+$/.test(x.link) && /^https?:/.test(x.imageUrl)));
  console.log('\n# latest');
  const l = await call(() => ext.getLatestUpdates(1));
  console.log('  latest:', l.list.length, l.list.slice(0, 8).map(x => x.name));
  check('latest has titles', l.list.length >= 10);
  console.log('\n# search key titles');
  const found = {};
  for (const [q, want] of [['One Piece', /^one piece$/i], ['Kagurabachi', /^kagurabachi$/i], ['Chainsaw Man', /^chainsaw man$/i], ['Kaiju No. 8', /^kaiju no\.?\s?8 \(monster #8\)$/i], ['Boruto', /^boruto: two blue vortex$/i]]) {
    const r = await call(() => ext.search(q, 1, []));
    const hit = want.test(r.list[0] && r.list[0].name) ? r.list[0] : null;
    console.log(`  "${q}" ->`, r.list.slice(0, 4).map(x => x.name + ' ' + x.link.split('/').pop()));
    check(`search "${q}" (best match first)`, !!hit, hit && hit.link); if (hit) found[q] = hit.link;
  }
  console.log('\n# getDetail One Piece');
  const d = await call(() => ext.getDetail(found['One Piece']));
  console.log('  name:', d.name, '| status:', d.status, '| author:', d.author, '| genre:', d.genre.join(', '));
  console.log('  image:', d.imageUrl);
  console.log('  desc:', d.description.slice(0, 120).replace(/\n/g, ' '));
  d.chapters.forEach(c => console.log('   ', c.name, '|', c.url, '|', new Date(+c.dateUpload).toISOString()));
  check('detail populated', d.name === 'One Piece' && d.imageUrl && d.description && d.author === 'Eiichiro Oda' && d.genre.length);
  check('latest chapter 1197 first', /1197/.test(d.chapters[0].name), d.chapters[0].name);
  check('chapters dated', d.chapters.every(c => +c.dateUpload > 1e12));
  for (const k of ['Kagurabachi', 'Chainsaw Man', 'Kaiju No. 8', 'Boruto']) {
    const x = await call(() => ext.getDetail(found[k]));
    console.log(`  ${x.name}: ${x.chapters.length} readable chapters: ${x.chapters.map(c => c.name.split(':')[0].replace('Chapter ', '#')).join(', ')} | newest ${new Date(+x.chapters[0].dateUpload).toISOString().slice(0, 10)} | status ${x.status}`);
    check(`${k} has chapters`, x.chapters.length > 0);
  }
  console.log('\n# getPageList', d.chapters[0].url);
  const t0 = Date.now();
  const pages = await call(() => ext.getPageList(d.chapters[0].url));
  const ms = Date.now() - t0;
  console.log('  pages:', pages.length, 'in', ms, 'ms; first url prefix:', pages[0].url.slice(0, 60), '… total chars', pages.reduce((a, p) => a + p.url.length, 0));
  check('pages returned', pages.length > 10, pages.length);
  let allJpeg = true;
  pages.forEach((p, i) => {
    const buf = Buffer.from(p.url.split(',')[1], 'base64');
    const ok = p.url.startsWith('data:image/jpeg;base64,') && buf[0] === 0xff && buf[1] === 0xd8 && buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9;
    if (!ok) allJpeg = false;
    if (i === 0) fs.writeFileSync(__dirname + '/sample-page-1.jpg', buf);
  });
  check('every page decrypts to a complete JPEG (FFD8..FFD9)', allJpeg);
  finish();
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
