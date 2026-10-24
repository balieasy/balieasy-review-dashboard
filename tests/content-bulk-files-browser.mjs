import {build} from 'esbuild';
import {writeFile,readFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
// Temporary QA files: remove both public/__bulk-file-cache-check.* after use.
await build({entryPoints:['tests/content-bulk-files-browser.ts'],bundle:true,format:'esm',platform:'browser',outfile:'public/__bulk-file-cache-check.js'});
await writeFile('public/__bulk-file-cache-check.html',`<!doctype html><meta charset="utf-8"><title>Bulk file cache QA</title><style>body{font:16px system-ui;max-width:900px;margin:50px auto;padding:20px}pre{white-space:pre-wrap;line-height:1.8}button{padding:12px 20px}</style><h1>Bulk file cache QA</h1><p>Isolated test records only. No Google API calls.</p><button></button><pre></pre><script type="module" src="/__bulk-file-cache-check.js"></script>`);
console.log('Open http://127.0.0.1:5173/__bulk-file-cache-check.html and run both stages.');
if(process.argv[2]){
 const bytes=await readFile(process.argv[2]),filename='cache-ui-preview.png';
 const payload={locationId:'locations/qa',filename,mime:'image/png',size:bytes.length,width:300,height:300,duration:0,sha256:createHash('sha256').update(bytes).digest('hex'),category:'ADDITIONAL',description:'Pratinjau file uji; tidak dipublikasikan.'};
 const plan={id:'test-ui',kind:'media',version:1,state:'draft',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),fingerprint:'test',items:[{locationId:'locations/qa',title:'Lokasi uji',address:'Data uji',state:'pending',operationId:'test',payload}]};
 await build({stdin:{contents:`import {createElement} from 'react';import {createRoot} from 'react-dom/client';import BulkContent from './app/content-bulk';import {saveBulkFile,clearBulkFiles} from './app/content-bulk-files';
 const plan=${JSON.stringify(plan)},scope='test-ui-'+(sessionStorage.bulkCacheUiScope||crypto.randomUUID());sessionStorage.bulkCacheUiScope=scope.slice(8);
 if(!sessionStorage.bulkCacheUiSeeded){const bytes=Uint8Array.from(atob('${bytes.toString('base64')}'),c=>c.charCodeAt(0));await saveBulkFile(scope,plan,new File([bytes],'${filename}',{type:'image/png'}));sessionStorage.bulkCacheUiSeeded='1';}
 window.fetch=async(url,options={})=>{if(url!=='/api/content/bulk')throw Error('Network disabled in UI test');if(options.method==='POST'&&JSON.parse(options.body).action!=='reconcile')throw Error('Sending disabled in UI test');return Response.json(options.method==='POST'?{plan}:{fileScope:scope,batches:[plan],locations:[{id:'locations/qa',title:'Lokasi uji',address:'Data uji'}]});};
 document.querySelector('#reload').onclick=()=>location.reload();document.querySelector('#clean').onclick=async()=>{await clearBulkFiles(scope);delete sessionStorage.bulkCacheUiSeeded;delete sessionStorage.bulkCacheUiScope;document.querySelector('#status').textContent='Data uji dibersihkan';};
 const noop=()=>{};createRoot(document.querySelector('#root')).render(createElement(BulkContent,{connected:true,initialLocationId:'all',onBusy:noop,onDirty:noop}));`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'esm',platform:'browser',jsx:'automatic',outfile:'public/__bulk-file-cache-ui.js'});
 await copyFile('app/globals.css','public/__bulk-file-cache-ui.css');
 await writeFile('public/__bulk-file-cache-ui.html',`<!doctype html><meta charset="utf-8"><title>Bulk file recovery UI QA</title><link rel="stylesheet" href="/__bulk-file-cache-ui.css"><style>body{padding:32px;max-width:1100px;margin:auto}#status{padding:15px;background:#fff1df;margin-bottom:20px}#status button{padding:10px;border:1px solid #ccc;margin:8px}</style><div id="status">Data uji · Pengiriman Google dinonaktifkan.<button id="reload">Reload uji pemulihan</button><button id="clean">Bersihkan data uji</button></div><div id="root"></div><script type="module" src="/__bulk-file-cache-ui.js"></script>`);
 console.log('Open http://127.0.0.1:5173/__bulk-file-cache-ui.html for component recovery QA.');
}
