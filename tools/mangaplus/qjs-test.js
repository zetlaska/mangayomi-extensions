const runQ = require('../qjs-lib.js');
runQ(__dirname + '/mangaplus.js', { id: 573904126, name: 'MANGA Plus by SHUEISHA', lang: 'en', baseUrl: 'https://mangaplus.shueisha.co.jp', apiUrl: 'https://jumpg-webapi.tokyo-cdn.com/api' }, async (run) => {
  const p = run('extention.getPopular(1)'); console.log('popular:', p.list.length, p.list.slice(0, 3).map(x => x.name), 'hasNext', p.hasNextPage);
  const s = run('extention.search("kagurabachi", 1, [])'); console.log('search:', s.list.map(x => x.name));
  const d = run('extention.getDetail("' + s.list[0].link + '")'); console.log('detail:', d.name, d.author, d.chapters.length, 'chapters', JSON.stringify(d.chapters[0]));
  const t0 = Date.now();
  const pg = run('extention.getPageList("' + d.chapters[0].url + '")');
  if (pg.ERROR) { console.log('ERROR', pg.ERROR); return; }
  const ok = pg.every(x => { const b = Buffer.from(x.url.split(',')[1], 'base64'); return b[0] === 0xff && b[1] === 0xd8 && b[b.length - 1] === 0xd9; });
  console.log('pages:', pg.length, 'all decrypted JPEGs:', ok, 'QuickJS(wasm) time incl. sequential curl:', Date.now() - t0, 'ms');
});
