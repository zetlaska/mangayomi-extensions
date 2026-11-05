const runQ = require('../qjs-lib.js');
runQ(__dirname + '/hivetoons.js', { id: 391567284, name: 'HiveToons', lang: 'en', baseUrl: 'https://hivetoons.org', apiUrl: 'https://api.hivetoons.org/api' }, async (run) => {
  const p = run('extention.getPopular(2)'); console.log('popular p2:', p.list.length, p.list.slice(0, 3).map(x => x.name), 'hasNext', p.hasNextPage);
  const s = run('extention.search("study group", 1, [])'); console.log('search:', s.list.map(x => x.name));
  const d = run('extention.getDetail("' + s.list[0].link + '")'); console.log('detail:', d.name, d.author, d.chapters.length, 'chapters', JSON.stringify(d.chapters[0]));
  const pg = run('extention.getPageList("' + d.chapters[0].url + '")'); console.log('pages:', pg.length, pg[0].url);
});
