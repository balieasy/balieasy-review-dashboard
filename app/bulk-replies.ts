import type {SavedDraft} from './replies-server';
import {duplicateReplyCount} from './reply-draft';

export function bulkEligible(d:SavedDraft){return (d.state==='draft'||d.state==='approved')&&!!d.text.trim();}
export type BulkResult={id:string;name:string;location:string;sent:boolean;error?:string};
export async function sendBulkDrafts(items:SavedDraft[],options:{
 api:(path:string,body:unknown)=>Promise<{draft:SavedDraft}>;
 onDraft:(draft:SavedDraft)=>void;
 onProgress:(completed:number,total:number)=>void;
 shouldStop:()=>boolean;
}){
 if(!items.length||new Set(items.map(d=>d.id)).size!==items.length||items.some(d=>!bulkEligible(d)))throw new Error('Pilih draf tersimpan yang belum terkirim dan tidak memerlukan pemeriksaan status.');
 if(duplicateReplyCount(items))throw new Error('Ada teks balasan yang sama setelah nama dan tanda tangan diabaikan. Variasikan atau edit draf sebelum mengirim bulk.');
 const results:BulkResult[]=[];
 for(const d of items){
  if(options.shouldStop())break;
  try{
   const saved=await options.api('reply-drafts/save',{id:d.id,version:d.version,text:d.text,language:d.language,tone:d.tone,approved:true});
   options.onDraft(saved.draft);
   const sent=await options.api('reply-drafts/send',{id:saved.draft.id,version:saved.draft.version});
   options.onDraft(sent.draft);
   results.push({id:d.id,name:d.review.name,location:d.locationTitle,sent:sent.draft.state==='sent',error:sent.draft.state==='sent'?undefined:sent.draft.error||'Periksa status balasan Google.'});
  }catch(e){results.push({id:d.id,name:d.review.name,location:d.locationTitle,sent:false,error:(e as Error).message});}
  options.onProgress(results.length,items.length);
 }
 return {results,total:items.length,sent:results.filter(r=>r.sent).length,failed:results.filter(r=>!r.sent).length,remaining:items.length-results.length};
}
