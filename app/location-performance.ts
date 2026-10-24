import type {Location} from './metrics';
import {rangeCounts,type DateRange} from './periods';

export type PerformanceKey='location'|'rating'|'total'|'current'|'growth'|'pending'|'status';
export type SortDirection='asc'|'desc';
export type LocationStatus='growing'|'declining'|'stable'|'noComparison'|'unsynced';
export const statusLabels:Record<LocationStatus,string>={growing:'Bertumbuh',declining:'Menurun',stable:'Stabil',noComparison:'Tanpa pembanding',unsynced:'Belum sinkron'};
export const performanceColumns:{key:PerformanceKey;label:string}[]=[{key:'location',label:'Lokasi'},{key:'rating',label:'Rating'},{key:'total',label:'Total review'},{key:'current',label:'Review baru'},{key:'growth',label:'Pertumbuhan'},{key:'pending',label:'Belum dibalas'},{key:'status',label:'Status'}];
export function locationPerformance(locations:Location[],range:DateRange,demo=false){
 return locations.map(location=>{
  const available=demo||!!location.synced,c=rangeCounts(location.reviews,range),pending=location.reviews.filter(r=>!r.replied).length;
  const status:LocationStatus=!available?'unsynced':c.percent===null?'noComparison':c.percent>0?'growing':c.percent<0?'declining':'stable';
  return {location,available,...c,pending,status};
 });
}
export type PerformanceRow=ReturnType<typeof locationPerformance>[number];
export function performanceSummary(rows:PerformanceRow[]){
 const result={growing:0,declining:0,stable:0,noComparison:0,unsynced:0,total:rows.length};
 for(const row of rows)result[row.status]++;
 return result;
}
const collator=new Intl.Collator('id',{numeric:true,sensitivity:'base'});
export function sortPerformance(rows:PerformanceRow[],key:PerformanceKey,direction:SortDirection){
 const statusRank={growing:0,stable:1,declining:2,noComparison:3,unsynced:4};
 function value(row:PerformanceRow):string|number|null{
  if(key==='location')return row.location.title;
  if(!row.available)return null;
  switch(key){case 'rating':return row.location.rating;case 'total':return row.location.total;case 'current':return row.current;case 'growth':return row.percent;case 'pending':return row.pending;case 'status':return statusRank[row.status];}
 }
 return [...rows].sort((a,b)=>{
  // Missing comparisons and unsynced locations stay at the end in either direction.
  if(key==='status'){
   const group=(r:PerformanceRow)=>r.status==='unsynced'?2:r.status==='noComparison'?1:0;
   if(group(a)!==group(b))return group(a)-group(b);
  }
  const av=value(a),bv=value(b);
  if(av===null&&bv!==null)return 1;if(bv===null&&av!==null)return -1;
  const compared=av===null||bv===null?0:typeof av==='string'&&typeof bv==='string'?collator.compare(av,bv):Number(av)-Number(bv);
  return (direction==='asc'?compared:-compared)||collator.compare(a.location.title,b.location.title)||collator.compare(a.location.id,b.location.id);
 });
}
