import {db,read,seal,open,hash,write,bulkFileScope} from './server';
import type {Location} from './metrics';
import {validateUpload,validatePost,type UploadMetadata} from './content-model';
import {prepareUpload,publishPost,contentOperation,createPostDraftOnce,DuplicateMediaError,type ContentRecord} from './content-server';
import {bulkTerminal,personalize,type BulkContentPlan,type BulkContentItem,type BulkItemState} from './content-bulk-model';
const now=()=>new Date().toISOString(),key=(u:string,id:string)=>u+':content-bulk:'+id;
const changed=(r:any)=>r.meta?.changes??r.changes??0;
async function get(u:string,id:string){if(!/^[a-zA-Z0-9_-]{43}$/.test(id))throw new Error('ID bulk tidak valid.');const row=await db().prepare('SELECT value FROM settings WHERE id=?').bind(key(u,id)).first<{value:string}>();if(!row)throw new Error('Rencana bulk tidak ditemukan.');return {value:row.value,plan:await open<BulkContentPlan>(row.value)};}
async function replace(u:string,old:Awaited<ReturnType<typeof get>>,plan:BulkContentPlan){const next={...plan,version:old.plan.version+1,updatedAt:now()},value=await seal(next),result=await db().prepare('UPDATE settings SET value=? WHERE id=? AND value=?').bind(value,key(u,plan.id),old.value).run();if(!changed(result))throw new Error('Rencana berubah di tab lain. Muat ulang status bulk.');return {plan:next,value};}
async function allowed(u:string,item:BulkContentItem){const locations=await read<Location[]>(u,'locations')||[];if(!locations.some(l=>l.id===item.locationId))throw new Error('Lokasi tidak lagi tersedia untuk akun ini.');}
function expected(old:Awaited<ReturnType<typeof get>>,input:any){if(old.plan.version!==input.version)throw new Error('Versi rencana berubah. Muat ulang dan periksa kembali.');}
function samePayload(item:BulkContentItem,op:ContentRecord){return JSON.stringify(item.payload)===JSON.stringify(op.payload);}
function approval(input:any){if(input?.approved!==true)throw new Error('Periksa seluruh konten dan lokasi, lalu berikan persetujuan bulk.');}
function state(items:BulkContentItem[]):BulkContentPlan['state']{return items.some(i=>['preparing','running'].includes(i.state))?'processing':items.every(i=>bulkTerminal(i.state))?'finished':'approved';}
async function operation(u:string,id:string){try{return await contentOperation(u,id);}catch(e){if((e as Error).message==='Draf atau operasi tidak ditemukan.')return null;throw e;}}
export async function bulkContentData(u:string){const locations=await read<Location[]>(u,'locations')||[],prefix=u+':content-bulk:',records=await db().prepare('SELECT value FROM settings WHERE substr(id,1,?)=?').bind(prefix.length,prefix).all<{value:string}>();const batches=await Promise.all(records.results.map(r=>open<BulkContentPlan>(r.value)));return {fileScope:await bulkFileScope(u),locations:locations.map(l=>({id:l.id,title:l.title,address:l.address,maps:l.maps})),batches:batches.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))};}
export async function deleteBulkContent(u:string,input:any){const old=await get(u,input.id);expected(old,input);if(old.plan.items.some(i=>['preparing','running','ready'].includes(i.state)))throw new Error('Ada lokasi yang masih diproses. Periksa status bulk sebelum menghapus rencana.');const result=await db().prepare('DELETE FROM settings WHERE id=? AND value=?').bind(key(u,input.id),old.value).run();if(!changed(result))throw new Error('Rencana berubah di tab lain. Muat ulang status bulk.');return {id:input.id};}
export async function saveBulkContent(u:string,input:any){
 if(!/^[a-zA-Z0-9-]{16,80}$/.test(input.requestId||'')||!['media','post'].includes(input.kind)||!Array.isArray(input.locationIds)||input.locationIds.length<1||input.locationIds.length>100||new Set(input.locationIds).size!==input.locationIds.length)throw new Error('Pilih 1–100 lokasi unik untuk satu bulk.');
 const locations=await read<Location[]>(u,'locations')||[],id=await hash('bulk:'+input.requestId),createdAt=now(),items:BulkContentItem[]=[];
 for(const locationId of input.locationIds){const l=locations.find(l=>l.id===locationId);if(!l||!/^locations\/[a-zA-Z0-9_-]+$/.test(l.id)||!/^accounts\/[a-zA-Z0-9_-]+$/.test(l.account))throw new Error('Ada lokasi yang tidak tersedia untuk akun ini.');
  if(input.kind==='post'&&input.post?.name)throw new Error('Bulk ini membuat postingan baru, bukan mengganti postingan lama.');
  const payload=input.kind==='media'?validateUpload({...input.media,locationId,description:personalize(String(input.media?.description||''),l.title)}):validatePost({...input.post,locationId,name:undefined,sourceVersion:undefined,topicType:'STANDARD',summary:personalize(String(input.post?.summary||''),l.title)});
  const operationId=await hash(input.kind==='media'?'upload:'+locationId+':'+(payload as UploadMetadata).sha256:'bulkpost:'+id+':'+locationId);
  items.push({locationId,title:l.title,address:l.address,state:'pending',operationId,payload,updatedAt:createdAt});
 }
 const fingerprint=await hash(JSON.stringify({kind:input.kind,items:items.map(i=>({locationId:i.locationId,payload:i.payload}))})),plan:BulkContentPlan={id,kind:input.kind,version:1,state:'draft',fingerprint,createdAt,updatedAt:createdAt,items};
 await db().prepare('INSERT INTO settings(id,value) VALUES(?,?) ON CONFLICT(id) DO NOTHING').bind(key(u,id),await seal(plan)).run();const existing=(await get(u,id)).plan;if(existing.fingerprint!==fingerprint)throw new Error('ID rencana sudah dipakai untuk isi berbeda. Buat rencana baru.');return existing;
}
export async function approveBulkContent(u:string,input:any){approval(input);let old=await get(u,input.id);expected(old,input);for(const item of old.plan.items)await allowed(u,item);if(old.plan.items.some(i=>['preparing','running'].includes(i.state)))throw new Error('Masih ada lokasi sedang diproses. Periksa status terlebih dahulu.');if(old.plan.state==='finished')return old.plan;return (await replace(u,old,{...old.plan,state:'approved'})).plan;}
export async function changeBulkMediaCategory(u:string,input:any){
 const old=await get(u,input.id);expected(old,input);
 if(old.plan.kind!=='media'||input.category!=='ADDITIONAL'||old.plan.items.some(i=>!['pending','failed'].includes(i.state)))throw new Error('Kategori hanya dapat diubah ke Foto / video tambahan untuk rencana media yang belum berhasil dikirim.');
 for(const item of old.plan.items){await allowed(u,item);const op=await operation(u,item.operationId);if(op&&op.state!=='failed')throw new Error('Ada operasi yang masih aktif, sudah berhasil, atau belum pasti. Periksa status sebelum mengubah kategori.');}
 const items=old.plan.items.map(item=>({...item,payload:validateUpload({...item.payload,category:'ADDITIONAL'}),state:'pending' as const,error:undefined,operationVersion:undefined,updatedAt:now()}));
 const fingerprint=await hash(JSON.stringify({kind:'media',items:items.map(i=>({locationId:i.locationId,payload:i.payload}))}));
 return (await replace(u,old,{...old.plan,items,fingerprint,state:'draft'})).plan;
}
async function finish(u:string,old:Awaited<ReturnType<typeof get>>,index:number,status:BulkItemState,error?:string){const items=old.plan.items.map((item,i)=>i===index?{...item,state:status,error,updatedAt:now()}:item);if(status==='complete')await write(u,'content-performance:'+items[index].locationId,null);return (await replace(u,old,{...old.plan,items,state:state(items)})).plan;}
export async function reconcileBulkContent(u:string,id:string){
 let old=await get(u,id);if(old.plan.state==='draft')return old.plan;let items=[...old.plan.items],dirty=false;
 for(let index=0;index<items.length;index++){
  const item=items[index];if(!['preparing','ready','running','uncertain'].includes(item.state))continue;await allowed(u,item);
  // Preparation cannot publish: its CAS must complete before either file bytes
  // or publishPost can be sent. Abandoned preparation can safely be queued again.
  if(item.state==='preparing'){if(Date.now()-Date.parse(item.updatedAt)>5*60000){items[index]={...item,state:'pending',updatedAt:now(),error:'Persiapan terhenti; siap dilanjutkan.'};dirty=true;}continue;}
  const op=await operation(u,item.operationId);if(!op)continue;
  if(!samePayload(item,op)||item.operationVersion!==undefined&&op.version!==item.operationVersion){items[index]={...item,state:'uncertain',error:'Versi operasi berubah. Periksa hasil di Google sebelum melanjutkan.',updatedAt:now()};dirty=true;continue;}
  let next:BulkItemState=item.state;
  if(op.state==='complete')next='complete';else if(op.state==='uncertain')next='uncertain';else if(op.state==='failed')next='failed';else if(op.state==='running')next='running';
  if(next!==item.state){items[index]={...item,state:next,error:op.error,updatedAt:now()};dirty=true;if(next==='complete')await write(u,'content-performance:'+item.locationId,null);}
 }
 if(dirty)old=await replace(u,old,{...old.plan,items,state:state(items)});return old.plan;
}
export async function stepBulkContent(u:string,input:any){
 let old=await get(u,input.id);expected(old,input);if(!['approved','processing'].includes(old.plan.state))throw new Error('Rencana belum disetujui atau sudah selesai.');
 if(old.plan.items.some(i=>['preparing','running'].includes(i.state)))throw new Error('Ada lokasi sedang diproses. Muat ulang status; jangan kirim dua kali.');
 if(input.locationId!==undefined&&!old.plan.items.some(i=>i.locationId===input.locationId))throw new Error('Lokasi uji tidak ada dalam rencana.');
 const eligible=(item:BulkContentItem)=>input.locationId===undefined||item.locationId===input.locationId;
 let index=old.plan.items.findIndex(i=>i.state==='ready'&&eligible(i));
 if(index>=0){const item=old.plan.items[index];await allowed(u,item);const op=await operation(u,item.operationId);
  if(op&&op.state==='prepared'&&Date.now()-Date.parse(op.updatedAt)<30*60000)return {plan:old.plan,upload:{id:item.operationId,version:item.operationVersion}};
  if(op?.state==='complete'||op?.state==='running'||op?.state==='uncertain'||op?.state==='failed')return {plan:await reconcileBulkContent(u,old.plan.id)};
 }else index=old.plan.items.findIndex(i=>i.state==='pending'&&eligible(i));
 if(index<0)return {plan:old.plan};
 const item=old.plan.items[index];await allowed(u,item);
 old=await replace(u,old,{...old.plan,state:'processing',items:old.plan.items.map((v,i)=>i===index?{...v,state:'preparing',updatedAt:now(),error:undefined}:v)});
 try{
  if(old.plan.kind==='media'){
   const op=await prepareUpload(u,{...item.payload,approved:true});old=await replace(u,old,{...old.plan,state:'approved',items:old.plan.items.map((v,i)=>i===index?{...v,state:'ready',operationVersion:op.version,updatedAt:now()}:v)});
   return {plan:old.plan,upload:{id:op.id,version:op.version}};
  }
  const draft=await createPostDraftOnce(u,item.operationId,item.payload);
  old=await replace(u,old,{...old.plan,state:'processing',items:old.plan.items.map((v,i)=>i===index?{...v,state:'running',operationVersion:draft.version,updatedAt:now()}:v)});
  const result=await publishPost(u,{id:draft.id,version:draft.version,approved:true});
  return {plan:await finish(u,old,index,result.state==='complete'?'complete':'uncertain',result.error)};
 }catch(e){
  const op=await operation(u,item.operationId);const status:BulkItemState=e instanceof DuplicateMediaError?'skipped':op&&!samePayload(item,op)?'uncertain':op?.state==='uncertain'?'uncertain':op?.state==='running'?'running':op?.state==='complete'&&old.plan.kind==='post'?'complete':'failed';
  return {plan:await finish(u,old,index,status,(e as Error).message)};
 }
}
export async function retryFailedBulkContent(u:string,input:any){approval(input);let old=await get(u,input.id);expected(old,input);if(old.plan.items.some(i=>['preparing','running'].includes(i.state)))throw new Error('Tunggu lokasi yang masih diproses.');let items=[...old.plan.items];
 if(input.locationId!==undefined&&!items.some(i=>i.locationId===input.locationId&&i.state==='failed'))throw new Error('Pilih satu lokasi gagal yang ada dalam rencana.');
 for(let index=0;index<items.length;index++){const item=items[index];if(item.state!=='failed'||input.locationId!==undefined&&item.locationId!==input.locationId)continue;await allowed(u,item);const op=await operation(u,item.operationId);
  // A later result wins over retry, including work completed from another tab.
  const next:BulkItemState=op&&!samePayload(item,op)?'uncertain':op?.state==='complete'?'complete':op?.state==='uncertain'?'uncertain':op?.state==='running'?'running':'pending';
  items[index]={...item,state:next,error:next==='pending'?undefined:op?.error,updatedAt:now()};
 }
 return (await replace(u,old,{...old.plan,items,state:state(items)})).plan;
}
