import {build} from 'esbuild';
import assert from 'node:assert/strict';
await build({entryPoints:['app/location-performance.ts'],bundle:true,format:'esm',platform:'node',outfile:'.sites-runtime/tests/location-performance.mjs'});
const {locationPerformance,performanceSummary,sortPerformance,performanceColumns}=await import('../.sites-runtime/tests/location-performance.mjs');
const range={start:'2026-10-01',end:'2026-10-21',previousStart:'2026-09-01',previousEnd:'2026-09-21'};
function location(id,current,previous,{synced=true,rating=5,total=current+previous,pending=current+previous}={}){
 const reviews=Array.from({length:current+previous},(_,i)=>({id:`${id}-${i}`,name:'Guest',rating:5,comment:'',created:i<current?'2026-10-10T00:00:00Z':'2026-09-10T00:00:00Z',replied:i>=pending,photos:0,videos:0}));
 return {id,title:`Lokasi ${id}`,account:'test',address:'',rating,total,reviews,...(synced?{synced:'2026-10-22T00:00:00Z'}:{})};
}
const input=[location('10',10,5,{rating:4.8,total:100,pending:10}),location('2',2,10,{rating:4.2,total:20,pending:2}),location('3',2,2),location('4',3,0),location('5',0,0),location('6',0,0,{synced:false})];
const rows=locationPerformance(input,range),ids=items=>items.map(x=>x.location.id);
assert.deepEqual(rows.map(r=>r.status),['growing','declining','stable','noComparison','noComparison','unsynced']);
assert.deepEqual(performanceSummary(rows),{growing:1,declining:1,stable:1,noComparison:2,unsynced:1,total:6});
console.log('PASS status partitions include growing, declining, stable, zero baseline, and unsynced');
assert.deepEqual(performanceSummary(locationPerformance([input[1]],range)),{growing:0,declining:1,stable:0,noComparison:0,unsynced:0,total:1});
assert.equal(locationPerformance([input[0]],{...range,start:'2026-11-01',end:'2026-11-21'})[0].status,'declining');
console.log('PASS location and date filters scope the growth summary');
assert.deepEqual(ids(sortPerformance(rows,'location','asc')),['2','3','4','5','6','10']);
assert.deepEqual(ids(sortPerformance(rows,'location','desc')),['10','6','5','4','3','2']);
console.log('PASS natural location name sorting in both directions');
for(const key of ['rating','total','current','pending']){
 const asc=sortPerformance(rows,key,'asc'),desc=sortPerformance(rows,key,'desc');
 const read=r=>key==='rating'?r.location.rating:key==='total'?r.location.total:r[key];
 assert.equal(asc.at(-1).location.id,'6');assert.equal(desc.at(-1).location.id,'6');
 const values=asc.slice(0,-1).map(read),reversed=desc.slice(0,-1).map(read);
 assert.deepEqual(values,[...values].sort((a,b)=>a-b));assert.deepEqual(reversed,[...reversed].sort((a,b)=>b-a));
}
console.log('PASS rating, total, new reviews, and unanswered sort numerically; missing data stays last');
assert.deepEqual(ids(sortPerformance(rows,'growth','asc')),['2','3','10','4','5','6']);
assert.deepEqual(ids(sortPerformance(rows,'growth','desc')),['10','3','2','4','5','6']);
assert.deepEqual(ids(sortPerformance(rows,'status','asc')),['10','3','2','4','5','6']);
assert.deepEqual(ids(sortPerformance(rows,'status','desc')),['2','3','10','4','5','6']);
console.log('PASS growth and status reverse known values while no comparison and unsynced remain last');
const original=ids(rows);for(const {key} of performanceColumns)sortPerformance(rows,key,'desc');assert.deepEqual(ids(rows),original);
assert.equal(performanceColumns.length,7);assert.equal(performanceSummary([]).total,0);
assert.equal(locationPerformance([input[5]],range,true)[0].status,'noComparison');
console.log('PASS sorting preserves source order; all seven columns and empty/demo states covered');
