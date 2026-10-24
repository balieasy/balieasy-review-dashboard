import {growth,localDate,monthKey,previousMonth,type Review} from './metrics';
export type PeriodMode='month'|'lastMonth'|'last7'|'last30'|'ytd'|'custom';
export type DateRange={start:string;end:string;previousStart:string;previousEnd:string;label:string;comparison:string;error?:string};
export const dayMs=86400000;
export function addDays(date:string,n:number){return new Date(Date.parse(date+'T12:00:00Z')+n*dayMs).toISOString().slice(0,10);}
export function daysBetween(start:string,end:string){return Math.round((Date.parse(end+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/dayMs)+1;}
export function validDate(date:string){return /^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date+'T12:00:00Z'))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;}
export function endOfMonth(month:string){const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m,0,12)).toISOString().slice(0,10);}
export function formatDay(date:string){return new Date(date+'T12:00:00Z').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Makassar'});}
export function rangeLabel(start:string,end:string){return start===end?formatDay(start):`${formatDay(start)} – ${formatDay(end)}`;}
export function dateRange(mode:PeriodMode,month:string,customStart:string,customEnd:string,now=new Date()):DateRange{
 const today=localDate(now.toISOString());let start='',end='',previousStart='',previousEnd='',comparison='Periode sebelumnya dengan durasi yang sama';
 if(mode==='month'||mode==='lastMonth'){
  const chosen=mode==='lastMonth'?previousMonth(monthKey(now)):month;
  start=chosen+'-01';end=chosen===monthKey(now)?today:endOfMonth(chosen);
  const prior=previousMonth(chosen);previousStart=prior+'-01';previousEnd=chosen===monthKey(now)?prior+'-'+String(Math.min(Number(today.slice(8)),Number(endOfMonth(prior).slice(8)))).padStart(2,'0'):endOfMonth(prior);
  comparison=chosen===monthKey(now)?'Tanggal yang sama pada bulan sebelumnya':'Bulan penuh sebelumnya';
 }else if(mode==='ytd'){
  start=today.slice(0,4)+'-01-01';end=today;const year=Number(today.slice(0,4))-1;previousStart=year+'-01-01';const priorMonth=year+today.slice(4,7);previousEnd=priorMonth+'-'+String(Math.min(Number(today.slice(8)),Number(endOfMonth(priorMonth).slice(8)))).padStart(2,'0');comparison='1 Januari sampai tanggal yang sama pada tahun sebelumnya';
 }else{
  if(mode==='custom'){start=customStart;end=customEnd;}else{end=today;start=addDays(today,mode==='last7'?-6:-29);}
  if(!validDate(start)||!validDate(end)||start>end||end>today){return {start:today,end:today,previousStart:today,previousEnd:today,label:'Rentang belum valid',comparison:'',error:'Pilih tanggal mulai dan akhir yang valid. Tanggal akhir harus setelah atau sama dengan tanggal mulai dan tidak melewati hari ini.'};}
  previousEnd=addDays(start,-1);previousStart=addDays(start,-daysBetween(start,end));
 }
 const error=end>today?'Pilih bulan yang sudah berjalan atau sudah selesai.':undefined;
 return {start,end,previousStart,previousEnd,label:rangeLabel(start,end),comparison,error};
}
export function inRange(review:Pick<Review,'created'>,range:{start:string;end:string}){const day=localDate(review.created);return day>=range.start&&day<=range.end;}
export function rangeCounts(reviews:Review[],range:DateRange){const current=reviews.filter(r=>inRange(r,range)).length,previous=reviews.filter(r=>inRange(r,{start:range.previousStart,end:range.previousEnd})).length;return {current,previous,percent:growth(current,previous)};}
export type SeriesInterval='day'|'week'|'month'|'quarter';
export const seriesIntervals:{value:SeriesInterval;label:string;unit:string}[]=[{value:'day',label:'Day · Harian',unit:'hari'},{value:'week',label:'Week · Mingguan',unit:'minggu'},{value:'month',label:'Month · Bulanan',unit:'bulan'},{value:'quarter',label:'Quarter · Kuartalan',unit:'kuartal'}];
export type SeriesPoint={label:string;start:string;end:string;previousStart:string;previousEnd:string;current:number;previous:number;partial:boolean;previousPartial:boolean};
export function calendarInterval(date:string,interval:SeriesInterval){
 const [year,month]=date.split('-').map(Number);
 if(interval==='day')return {start:date,end:date};
 if(interval==='week'){const offset=(new Date(date+'T12:00:00Z').getUTCDay()+6)%7;return {start:addDays(date,-offset),end:addDays(date,6-offset)};}
 const first=interval==='quarter'?Math.floor((month-1)/3)*3+1:month;
 const start=`${year}-${String(first).padStart(2,'0')}-01`,end=endOfMonth(`${year}-${String(first+(interval==='quarter'?2:0)).padStart(2,'0')}`);
 return {start,end};
}
export function intervalLabel(date:string,interval:SeriesInterval){
 if(interval==='quarter')return `Q${Math.ceil(Number(date.slice(5,7))/3)} ${date.slice(0,4)}`;
 if(interval==='month')return new Date(date+'T12:00:00Z').toLocaleDateString('id-ID',{month:'short',year:'numeric',timeZone:'Asia/Makassar'});
 return formatDay(date);
}
export function timeSeries(reviews:Review[],range:DateRange,interval?:SeriesInterval):SeriesPoint[]{
 const days=daysBetween(range.start,range.end),group=interval||(days<=45?'day':days<=180?'week':'month');
 const buckets=(start:string,end:string)=>{const rows:{start:string;end:string;partial:boolean}[]=[];let date=start;while(date<=end){const bounds=calendarInterval(date,group),last=bounds.end<end?bounds.end:end;rows.push({start:date,end:last,partial:date!==bounds.start||last!==bounds.end});date=addDays(last,1);}return rows;};
 const byDay=new Map<string,number>();for(const r of reviews){const d=localDate(r.created);byDay.set(d,(byDay.get(d)||0)+1);}
 const sum=(start:string,end:string)=>{let result=0;for(let d=start;d<=end;d=addDays(d,1))result+=byDay.get(d)||0;return result;};
 const current=buckets(range.start,range.end),previous=buckets(range.previousStart,range.previousEnd);
 return Array.from({length:Math.max(current.length,previous.length)},(_,i)=>{const c=current[i],p=previous[i];return {label:c?intervalLabel(c.start,group):'Pembanding tambahan',start:c?.start||'',end:c?.end||'',previousStart:p?.start||'',previousEnd:p?.end||'',current:c?sum(c.start,c.end):0,previous:p?sum(p.start,p.end):0,partial:c?.partial||false,previousPartial:p?.partial||false};});
}
