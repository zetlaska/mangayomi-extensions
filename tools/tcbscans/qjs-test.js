const runQ = require('../qjs-lib.js');
runQ(__dirname + '/tcbscans.js', { id: 462810937, name: 'TCB Scans', lang: 'en', baseUrl: 'https://tcbonepiecechapters.com', apiUrl: '' }, async (run) => {
  const l = run('extention.getLatestUpdates(1)'); console.log('latest:', l.list.length, l.list.slice(0, 3).map(x => x.name));
  const s = run('extention.search("hunter", 1, [])'); console.log('search:', s.list.map(x => x.name));
  const d = run('extention.getDetail("' + s.list[0].link + '")'); console.log('detail:', d.name, d.chapters.length, 'chapters', JSON.stringify(d.chapters[0]));
  const pg = run('extention.getPageList("' + d.chapters[0].url + '")'); console.log('pages:', pg.length, pg[0].url);
});
