// Generic Node harness mimicking Mangayomi's JS runtime (lib/eval/javascript): the extension runs in an
// isolated vm context with only MProvider, Client, SharedPreferences, console - no fetch/Buffer/atob/
// TextEncoder/crypto/URL. Client.get/post return {body, statusCode, headers}. Results pass through JSON.
const vm = require('vm'), fs = require('fs');
const httpLog = [];
let pass = 0, fail = 0;
async function hostRequest(method, url, headers, body) {
  const t0 = Date.now();
  const r = await fetch(url, { method, headers: headers || {}, body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined });
  // Mimic Dart package:http Response.body: charset from Content-Type, else utf8 for application/json,
  // else latin1 (byte-preserving) - this is what Mangayomi's JS Client hands to the extension.
  const ab = Buffer.from(await r.arrayBuffer());
  const ct = (r.headers.get('content-type') || 'application/octet-stream').toLowerCase();
  const cs = (ct.match(/charset=([^;]+)/) || [])[1];
  const text = cs ? new TextDecoder(cs.trim()).decode(ab) : /^application\/json/.test(ct) ? ab.toString('utf8') : ab.toString('latin1');
  const h = {}; r.headers.forEach((v, k) => { h[k] = v; });
  httpLog.push(`${method} ${r.status} ${Date.now() - t0}ms ${url.length > 170 ? url.slice(0, 170) + '…' : url}`);
  return { body: text, statusCode: r.status, headers: h };
}
function load(file, prefs) {
  const SRC = fs.readFileSync(file, 'utf8');
  const mk = (meta) => {
    const ctx = vm.createContext({ console: { log: (...a) => console.log('[ext]', ...a), warn: console.warn, error: console.error } });
    ctx.__host = { request: hostRequest, prefs };
    ctx.__source = JSON.stringify(meta);
    vm.runInContext(`
      for (const k of ['fetch','atob','btoa','TextEncoder','TextDecoder','Buffer','crypto','URL','URLSearchParams','window','document','navigator','structuredClone']) { try { delete globalThis[k]; } catch (e) {} }
      class Client { constructor(r) {} async get(url, headers) { return __host.request('GET', url, headers); } async post(url, headers, body) { return __host.request('POST', url, headers, body); } }
      class SharedPreferences { get(key) { return __host.prefs[key]; } getString(key, d) { return __host.prefs[key] ?? d; } }
      class MProvider { get source() { return JSON.parse(__source); } }
    `, ctx);
    vm.runInContext(SRC + '\n;globalThis.extention = new DefaultExtension(); globalThis.__sources = mangayomiSources;', ctx, { filename: file });
    return ctx;
  };
  const meta = JSON.parse(JSON.stringify(mk({}).__sources[0]));
  return { meta, ext: mk(meta).extention };
}
const call = async (fn) => JSON.parse(JSON.stringify(await fn()));
function check(name, cond, info) { if (cond) { pass++; console.log('  PASS', name, info ?? ''); } else { fail++; console.log('  FAIL', name, info ?? ''); } }
function sniff(buf) { return buf[0] === 0xff && buf[1] === 0xd8 ? 'jpeg' : buf.slice(0, 4).toString('hex') === '89504e47' ? 'png' : buf.slice(8, 12).toString() === 'WEBP' ? 'webp' : buf.slice(0,3).toString()==='GIF' ? 'gif' : null; }
async function download(url, headers) { const r = await fetch(url, { headers: headers || {} }); const buf = Buffer.from(await r.arrayBuffer()); return { status: r.status, type: r.headers.get('content-type'), len: buf.length, kind: sniff(buf), buf }; }
function finish() { console.log('\nHTTP log:'); httpLog.forEach(l => console.log('  ' + l)); console.log(`\nRESULT: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }
module.exports = { load, call, check, download, finish, httpLog };
