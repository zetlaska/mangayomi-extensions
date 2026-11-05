// Runs mangafire.js inside real QuickJS (the engine flutter_qjs embeds in Mangayomi) with a
// synchronous curl-backed Client bridge, to confirm the source parses and works there too.
const { getQuickJS } = require('/tmp/qjs/node_modules/quickjs-emscripten');
const { execFileSync } = require('child_process');
const fs = require('fs');
(async () => {
  const QJS = await getQuickJS();
  const vm = QJS.newContext();
  const httpGet = vm.newFunction('__httpGet', (u, h) => {
    const url = vm.getString(u), headers = JSON.parse(vm.getString(h) || '{}');
    const args = ['-s', '-w', '\n%{http_code}', url];
    for (const k in headers) args.push('-H', `${k}: ${headers[k]}`);
    const out = execFileSync('curl', args, { maxBuffer: 64 << 20 }).toString();
    const i = out.lastIndexOf('\n');
    return vm.newString(JSON.stringify({ body: out.slice(0, i), statusCode: +out.slice(i + 1), headers: {} }));
  });
  vm.setProp(vm.global, '__httpGet', httpGet); httpGet.dispose();
  const log = vm.newFunction('__log', (s) => { console.log('[qjs]', vm.getString(s)); });
  vm.setProp(vm.global, '__log', log); log.dispose();
  const prelude = `
    var console = { log: function (m) { __log(typeof m === 'object' ? JSON.stringify(m) : String(m)); } };
    class Client { constructor(r) {} async get(url, headers) { return JSON.parse(__httpGet(url, JSON.stringify(headers || {}))); } }
    class SharedPreferences { get(k) { return null; } }
    class MProvider { get source() { return {"id":123456789,"name":"Mangafire","lang":"en","baseUrl":"https://mangafire.to"}; } }
    async function jsonStringify(fn) { return JSON.stringify(await fn()); }
  `;
  const src = fs.readFileSync(__dirname + '/mangafire.js', 'utf8');
  const r = vm.evalCode(prelude + src + '\nvar extention = new DefaultExtension(); "loaded " + typeof extention.getPopular');
  if (r.error) { console.log('LOAD ERROR', vm.dump(r.error)); process.exit(1); }
  console.log(vm.dump(r.value)); r.value.dispose();
  const run = (expr) => {
    vm.evalCode(`var __out = null; jsonStringify(() => ${expr}).then(function (s) { __out = s; }, function (e) { __out = "ERROR " + e + " " + (e && e.stack); });`).value?.dispose();
    for (let i = 0; i < 10000; i++) { const j = vm.runtime.executePendingJobs(); if (j.error) { console.log(vm.dump(j.error)); j.error.dispose(); break; } const o = vm.getProp(vm.global, '__out'); const v = vm.dump(o); o.dispose(); if (v !== null) return v; }
    return null;
  };
  const vrf = vm.evalCode('mfVrf("/titles?languages[0]=en&order[trending]=desc&page=1")'); console.log('vrf in QuickJS:', vm.dump(vrf.value)); vrf.value.dispose();
  const pop = JSON.parse(run('extention.getPopular(2)')); console.log('popular p2:', pop.list.length, pop.list.slice(0, 3).map(x => x.name), 'hasNext', pop.hasNextPage);
  const s = JSON.parse(run('extention.search("solo leveling", 1, [])')); console.log('search:', s.list.slice(0, 3).map(x => x.name));
  const d = JSON.parse(run('extention.getDetail("' + s.list[0].link + '")')); console.log('detail:', d.name, d.author, d.chapters.length, 'chapters', d.chapters[0]);
  const p = JSON.parse(run('extention.getPageList("' + d.chapters[0].url + '")')); console.log('pages:', p.length, p[0]);
  vm.dispose();
})();
