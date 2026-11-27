import {build} from 'esbuild';
import {convertV4MiniflareOptions, Miniflare} from 'miniflare';
import assert from 'node:assert/strict';
// Exercise the real workerd Fetch implementation rather than a Node fetch mock.
const result=await build({stdin:{contents:`import {googleFetch} from './app/google-fetch.ts'; import {encodeBase64} from './app/base64.ts'; export default {async fetch(request){try{if(new URL(request.url).pathname==='/large-snapshot'){const bytes=new Uint8Array(2*1024*1024).fill(199),decoded=atob(encodeBase64(bytes));return Response.json({length:decoded.length,first:decoded.charCodeAt(0),last:decoded.charCodeAt(decoded.length-1)});}const r=await googleFetch(new URL(request.url).searchParams.get('upstream'),{method:'POST',body:'test',headers:{Authorization:'Bearer mock-token'}});return new Response(await r.text(),{status:r.status});}catch(e){return Response.json({error:e.message},{status:502});}}}`,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'browser',write:false});
const calls=[];
const mf = new Miniflare(convertV4MiniflareOptions({
  port: 0,
  inspectorPort: 0,
  modules: true,
  script: result.outputFiles[0].text,
  compatibilityDate: '2026-05-15',
  outboundService: async request => {
    calls.push(request.url);
    if (new URL(request.url).pathname === '/redirect') {
      return new Response(null, {status: 302, headers: {Location: 'https://other.example/never-visit'}});
    }
    return Response.json({ok: true});
  },
}));
try{
 const large=await mf.dispatchFetch('http://test/large-snapshot');assert.equal(large.status,200);assert.deepEqual(await large.json(),{length:2*1024*1024,first:199,last:199});console.log('PASS 2 MiB snapshot base64 conversion in real Workers runtime');
 const ok=await mf.dispatchFetch('http://test/?upstream='+encodeURIComponent('https://google.example/token'));assert.equal(ok.status,200);assert.deepEqual(await ok.json(),{ok:true});console.log('PASS OAuth-style POST works in real Workers fetch');
 const redirect=await mf.dispatchFetch('http://test/?upstream='+encodeURIComponent('https://google.example/redirect'));assert.equal(redirect.status,502);assert.match((await redirect.json()).error,/pengalihan/);assert.deepEqual(calls,['https://google.example/token','https://google.example/redirect']);console.log('PASS unexpected redirects blocked without forwarding credentials');
}finally{await mf.dispose();}
