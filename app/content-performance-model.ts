import {localDate} from './metrics';
export type InventoryMedia={name:string;mediaFormat:'PHOTO'|'VIDEO';createTime?:string;category?:string};
export type InventoryPost={name:string;createTime?:string;updateTime?:string;state?:string};
export type ContentInventory={version:1;checkedAt:string;media:InventoryMedia[];posts:InventoryPost[];errors:{media:string;posts:string}};
export type PerformanceLocation={id:string;title:string;address:string;inventory:ContentInventory|null;loadError?:string};
export type ContentRange={start:string;end:string;label:string};
export type ContentEvent={kind:'PHOTO'|'VIDEO'|'POST';at:string;edited:boolean};
export type Freshness='fresh'|'stale'|'empty'|'unknown'|'partial'|'unloaded';
export const freshnessLabels:Record<Freshness,string>={fresh:'Dalam target',stale:'Perlu diperbarui',empty:'Belum ada konten',unknown:'Tanggal belum lengkap',partial:'Data parsial',unloaded:'Belum dimuat'};
const day=86400000;
const shift=(value:string,days:number)=>new Date(Date.parse(value+'T00:00:00Z')+days*day).toISOString().slice(0,10);
export function contentRange(mode:string,now=new Date(),start='',end=''):ContentRange{
 const today=localDate(now.toISOString());
 if(mode==='custom'){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||!Number.isFinite(Date.parse(start))||!Number.isFinite(Date.parse(end))||new Date(start).toISOString().slice(0,10)!==start||new Date(end).toISOString().slice(0,10)!==end||start>end||end>today)throw new Error('Pilih rentang tanggal yang valid hingga hari ini.');
  return {start,end,label:start+' – '+end};
 }
 if(mode==='month')return {start:today.slice(0,7)+'-01',end:today,label:'Bulan ini'};
 const days=mode==='last7'?7:mode==='last90'?90:30;
 return {start:shift(today,1-days),end:today,label:days+' hari terakhir'};
}
function validTime(value:string|undefined,now:Date){const n=Date.parse(value||'');return Number.isFinite(n)&&n>0&&n<=now.getTime()?n:null;}
export function contentPerformance(row:PerformanceLocation,range:ContentRange,targetDays:number,now=new Date()){
 const inv=row.inventory,media=inv?[...new Map(inv.media.map(m=>[m.name,m])).values()]:[],posts=inv?[...new Map(inv.posts.map(p=>[p.name,p])).values()]:[];
 const mediaKnown=!!inv&&!inv.errors.media,postsKnown=!!inv&&!inv.errors.posts,events:ContentEvent[]=[];
 let unknownDates=0;
 for(const m of media){const at=validTime(m.createTime,now);if(at!==null)events.push({kind:m.mediaFormat,at:new Date(at).toISOString(),edited:false});else if(!['PROFILE','LOGO'].includes(m.category||''))unknownDates++;}
 const live=posts.filter(p=>p.state==='LIVE');
 for(const p of live){const created=validTime(p.createTime,now),updated=validTime(p.updateTime,now),at=created===null?updated:updated===null?created:Math.max(created,updated);if(at!==null)events.push({kind:'POST',at:new Date(at).toISOString(),edited:created!==null&&updated!==null&&updated>created});else unknownDates++;}
 const latest=events.reduce<ContentEvent|null>((last,e)=>!last||e.at>last.at?e:last,null);
 const ageDays=latest?Math.max(0,Math.round((Date.parse(localDate(now.toISOString()))-Date.parse(localDate(latest.at)))/day)):null;
 const photos=mediaKnown?media.filter(m=>m.mediaFormat==='PHOTO').length:null,videos=mediaKnown?media.filter(m=>m.mediaFormat==='VIDEO').length:null,livePosts=postsKnown?live.length:null;
 const total=(photos||0)+(videos||0)+(livePosts||0),complete=mediaKnown&&postsKnown&&!row.loadError;
 const active=events.filter(e=>{const d=localDate(e.at);return d>=range.start&&d<=range.end;});
 const period={photos:mediaKnown?active.filter(e=>e.kind==='PHOTO').length:null,videos:mediaKnown?active.filter(e=>e.kind==='VIDEO').length:null,posts:postsKnown?active.filter(e=>e.kind==='POST').length:null,editedPosts:postsKnown?active.filter(e=>e.kind==='POST'&&e.edited).length:null,total:active.length};
 let status:Freshness=!inv?'unloaded':!complete?'partial':!total?'empty':ageDays===null?'unknown':ageDays<targetDays?'fresh':unknownDates?'unknown':'stale';
 if(row.loadError)status='partial';
 const checkedAt=inv?validTime(inv.checkedAt,now):null;
 return {photos,videos,posts:livePosts,total,complete,period,latest,ageDays,status,unknownDates,unpublishedPosts:postsKnown?posts.length-live.length:null,checkedAt:inv?.checkedAt||'',needsRefresh:checkedAt===null||now.getTime()-checkedAt>day};
}
export type ContentPerformance=ReturnType<typeof contentPerformance>;
export type PerformanceRow=PerformanceLocation&{metrics:ContentPerformance};
export function summarizeContent(rows:PerformanceRow[]){
 const dated=rows.filter(r=>r.metrics.latest).sort((a,b)=>b.metrics.latest!.at.localeCompare(a.metrics.latest!.at));
 return {total:rows.reduce((s,r)=>s+r.metrics.total,0),photos:rows.reduce((s,r)=>s+(r.metrics.photos||0),0),videos:rows.reduce((s,r)=>s+(r.metrics.videos||0),0),posts:rows.reduce((s,r)=>s+(r.metrics.posts||0),0),activity:rows.reduce((s,r)=>s+r.metrics.period.total,0),fresh:rows.filter(r=>r.metrics.status==='fresh').length,stale:rows.filter(r=>['stale','empty'].includes(r.metrics.status)).length,unknown:rows.filter(r=>!['fresh','stale','empty'].includes(r.metrics.status)).length,loaded:rows.filter(r=>r.inventory).length,complete:rows.every(r=>r.metrics.complete),latest:dated[0]||null};
}
export type PerformanceSort='title'|'photos'|'videos'|'posts'|'total'|'activity'|'latest'|'status';
export function sortContentRows(rows:PerformanceRow[],key:PerformanceSort,direction:'asc'|'desc'){
 const statusOrder:Record<Freshness,number>={stale:0,empty:1,unknown:2,partial:3,unloaded:4,fresh:5};
 return [...rows].sort((a,b)=>{
  let comparison=0;
  if(key==='title')comparison=a.title.localeCompare(b.title,'id');
  else if(key==='status'){comparison=statusOrder[a.metrics.status]-statusOrder[b.metrics.status];if(!comparison&&a.metrics.latest&&b.metrics.latest)comparison=a.metrics.latest.at.localeCompare(b.metrics.latest.at);}
  else if(key==='latest'){
   const av=a.metrics.latest?.at,bv=b.metrics.latest?.at;
   if(!av||!bv)return av?-1:bv?1:a.title.localeCompare(b.title,'id');
   comparison=av.localeCompare(bv);
  }else{
   const value=(r:PerformanceRow)=>key==='activity'?r.inventory?r.metrics.period.total:null:key==='total'?r.inventory?r.metrics.total:null:r.metrics[key];
   const av=value(a),bv=value(b);if(av===null||bv===null)return av===null?(bv===null?a.title.localeCompare(b.title,'id'):1):-1;
   comparison=av-bv;
  }
  return comparison*(direction==='asc'?1:-1)||a.title.localeCompare(b.title,'id');
 });
}
