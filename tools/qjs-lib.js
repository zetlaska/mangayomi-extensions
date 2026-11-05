// Runs an extension inside real QuickJS (the engine Mangayomi's flutter_qjs uses) with a synchronous
// curl-backed Client bridge, to confirm the source parses and runs there (no Node-only APIs).
const { getQuickJS } = require('/tmp/qjs/node_modules/quickjs-emscripten');
const { execFileSync } = require('child_process');
const fs = require('fs');
module.exports = async function (file, meta, script) {
  const QJS = await getQuickJS();
  const vm = QJS.newContext();
  const http = vm.newFunction('__http', (m, u, h, b) => {
    const method = vm.getString(m), url = vm.getString(u), headers = JSON.parse(vm.getString(h) || '{}'), body = vm.getString(b);
    const args = ['-s', '-X', method, '-w', '\n%{content_type}\n%{http_code}', url];
    for (const k in headers) args.push('-H', `${k}: ${headers[k]}`);
    if (body) args.push('--data-binary', body);
    const out = execFileSync('curl', args, { maxBuffer: 64 << 20 }).toString('latin1');
    const i = out.lastIndexOf('\n'), j = out.lastIndexOf('\n', i - 1);
    const ct = out.slice(j + 1, i).toLowerCase() || 'application/octet-stream', raw = out.slice(0, j);
    // Dart package:http Response.body rule: charset param, else utf8 for application/json, else latin1
    const rbody = (/charset=utf-?8/.test(ct) || /^application\/json/.test(ct) && !/charset=/.test(ct)) ? Buffer.from(raw, 'latin1').toString('utf8') : raw;
    return vm.newString(JSON.stringify({ body: rbody, statusCode: +out.slice(i + 1), headers: { 'content-type': ct } }));
  });
  vm.setProp(vm.global, '__http', http); http.dispose();
  const log = vm.newFunction('__log', (s) => { console.log('[qjs]', vm.getString(s)); });
  vm.setProp(vm.global, '__log', log); log.dispose();
  const prelude = `
    var console = { log: function (m) { __log(typeof m === 'object' ? JSON.stringify(m) : String(m)); }, warn: function(){}, error: function(){} };
    class Client { constructor(r) {} async get(url, headers) { return JSON.parse(__http("GET", url, JSON.stringify(headers || {}), "")); }
                   async post(url, headers, body) { return JSON.parse(__http("POST", url, JSON.stringify(headers || {}), typeof body === 'string' ? body : JSON.stringify(body || ""))); } }
    class SharedPreferences { get(k) { return null; } }
    class MProvider { get source() { return ${JSON.stringify(meta)}; } }
    async function jsonStringify(fn) { return JSON.stringify(await fn()); }
  `;
  const r = vm.evalCode(prelude + fs.readFileSync(file, 'utf8') + '\nvar extention = new DefaultExtension(); "loaded " + typeof extention.getPopular');
  if (r.error) { console.log('LOAD ERROR', vm.dump(r.error)); process.exit(1); }
  console.log(vm.dump(r.value)); r.value.dispose();
  const run = (expr) => {
    vm.evalCode(`var __out = null; jsonStringify(() => ${expr}).then(function (s) { __out = s; }, function (e) { __out = JSON.stringify({ERROR: String(e)}); });`).value?.dispose();
    for (let i = 0; i < 100000; i++) { const j = vm.runtime.executePendingJobs(); if (j.error) { console.log(vm.dump(j.error)); j.error.dispose(); break; } const o = vm.getProp(vm.global, '__out'); const v = vm.dump(o); o.dispose(); if (v !== null) return JSON.parse(v); }
    return null;
  };
  await script(run);
  vm.dispose();
};
