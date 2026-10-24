import type {UploadMetadata,PostInput} from './content-model';
export type BulkItemState='pending'|'preparing'|'ready'|'running'|'complete'|'skipped'|'failed'|'uncertain';
export type BulkContentItem={locationId:string;title:string;address:string;state:BulkItemState;operationId:string;operationVersion?:number;payload:UploadMetadata|PostInput;error?:string;updatedAt:string};
export type BulkContentPlan={id:string;kind:'media'|'post';version:number;state:'draft'|'approved'|'processing'|'finished';createdAt:string;updatedAt:string;fingerprint:string;items:BulkContentItem[]};
export const bulkLabels:Record<BulkItemState,string>={pending:'Menunggu',preparing:'Menyiapkan',ready:'Siap upload',running:'Sedang dikirim',complete:'Diterima Google',skipped:'Dilewati · sudah ada',failed:'Gagal',uncertain:'Hasil belum pasti'};
export const bulkTerminal=(state:BulkItemState)=>['complete','skipped','failed','uncertain'].includes(state);
export function bulkTotals(plan:BulkContentPlan){return {total:plan.items.length,done:plan.items.filter(i=>bulkTerminal(i.state)).length,complete:plan.items.filter(i=>i.state==='complete').length,skipped:plan.items.filter(i=>i.state==='skipped').length,failed:plan.items.filter(i=>i.state==='failed').length,uncertain:plan.items.filter(i=>i.state==='uncertain').length,pending:plan.items.filter(i=>['pending','ready'].includes(i.state)).length,working:plan.items.some(i=>['preparing','running'].includes(i.state))};}
export const personalize=(text:string,title:string)=>text.replaceAll('{{lokasi}}',title);
