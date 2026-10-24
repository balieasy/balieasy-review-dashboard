import {createHash} from 'node:crypto';
import {db,read,write,seal,open,hash,random,accessToken} from './server';
import type {Location} from './metrics';
import type {ContentInventory,PerformanceLocation} from './content-performance-model';
import {googleFetch} from './google-fetch';
import {GoogleApiError as GoogleError,googleApiError} from './google-api-error';
import {duplicateCandidates,editableMedia,validateUpload,validatePost,type BusinessMedia,type BusinessPost,type UploadMetadata,type PostInput} from './content-model';
const base='https://mybusiness.googleapis.com/v4/';
const now=()=>new Date().toISOString();
export type ContentRecord={id:string;kind:'upload'|'delete'|'post';locationId:string;state:'prepared'|'draft'|'running'|'complete'|'failed'|'uncertain'|'partial';version:number;createdAt:string;updatedAt:string;payload:any;result?:any;error?:string};
const prefix=(u:string)=>u+':content:';
const opKey=(u:string,id:string)=>prefix(u)+id;
const changes=(result:any)=>result.meta?.changes??result.changes??0;
async function owned(u:string,id:string){const locations=await read<Location[]>(u,'locations')||[],location=locations.find(l=>l.id===id);if(!location||!/^locations\/[a-zA-Z0-9_-]+$/.test(location.id)||!/^accounts\/[a-zA-Z0-9_-]+$/.test(location.account))throw new Error('Lokasi tidak tersedia untuk akun ini.');return {location,parent:location.account+'/'+location.id};}
function resource(name:string,parent:string,kind:'media'|'localPosts'){if(typeof name!=='string'||!name.startsWith(parent+'/'+kind+'/')||!new RegExp('^'+kind+'/[a-zA-Z0-9_-]+$').test(name.slice(parent.length+1)))throw new Error('Media atau postingan bukan milik lokasi ini.');return name;}
async function request(token:string,path:string,init:RequestInit={}){const response=await googleFetch(base+path,{...init,headers:{Authorization:'Bearer '+token,...(init.body?{'Content-Type':'application/json'}:{}),...init.headers}});if(!response.ok)throw await googleApiError(response,path.endsWith('media:startUpload')?'menyiapkan upload':init.method==='POST'&&path.endsWith('/media')?'menerbitkan media':init.method&&init.method!=='GET'?'menyimpan perubahan':'membaca data');if(response.status===204)return {};const text=await response.text();return text?JSON.parse(text):{};}
async function pages(token:string,parent:string,kind:'media'|'localPosts'){
 const result:any[]=[],seen=new Set<string>();let page='';
 for(let n=0;n<100;n++){const url=parent+'/'+kind+'?pageSize=100'+(page?'&pageToken='+encodeURIComponent(page):'');const b=await request(token,url);for(const item of b[kind==='media'?'mediaItems':'localPosts']||[])result.push(item);if(!b.nextPageToken)return result;if(seen.has(b.nextPageToken))throw new Error('Paginasi Google berulang. Daftar belum lengkap; muat ulang.');seen.add(b.nextPageToken);page=b.nextPageToken;}
 throw new Error('Daftar melebihi batas pemuatan. Tidak ada penghapusan otomatis.');
}
export async function contentRecords(u:string){const p=prefix(u),records=await db().prepare('SELECT value FROM settings WHERE substr(id,1,?)=?').bind(p.length,p).all<{value:string}>();return (await Promise.all(records.results.map(r=>open<ContentRecord>(r.value)))).sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt));}
async function getRecord(u:string,id:string){if(!/^[a-zA-Z0-9_-]{43}$/.test(id))throw new Error('ID operasi tidak valid.');const record=await db().prepare('SELECT value FROM settings WHERE id=?').bind(opKey(u,id)).first<{value:string}>();if(!record)throw new Error('Draf atau operasi tidak ditemukan.');return {value:record.value,record:await open<ContentRecord>(record.value)};}
async function replace(u:string,old:{value:string;record:ContentRecord},record:ContentRecord){const value=await seal(record),r=await db().prepare('UPDATE settings SET value=? WHERE id=? AND value=?').bind(value,opKey(u,record.id),old.value).run();if(!changes(r))throw new Error('Data berubah di tab lain. Muat ulang sebelum melanjutkan.');return {value,record};}
async function insert(u:string,record:ContentRecord){await db().prepare('INSERT INTO settings(id,value) VALUES(?,?) ON CONFLICT(id) DO NOTHING').bind(opKey(u,record.id),await seal(record)).run();return getRecord(u,record.id);}
function canonical(value:any):any{if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>[k,canonical(value[k])]));return value;}
const fingerprint=(item:any)=>hash(JSON.stringify(canonical(item)));
const mediaVersion=(m:any)=>fingerprint({name:m.name,mediaFormat:m.mediaFormat,description:m.description,sourceUrl:m.sourceUrl,locationAssociation:m.locationAssociation,createTime:m.createTime,dimensions:m.dimensions});
const postVersion=(p:any)=>fingerprint({name:p.name,summary:p.summary,languageCode:p.languageCode,topicType:p.topicType,callToAction:p.callToAction,media:p.media,event:p.event,offer:p.offer,updateTime:p.updateTime});
async function mediaList(u:string,parent:string,token:string){const records=await contentRecords(u),known=new Map(records.filter(r=>r.kind==='upload'&&r.state==='complete'&&r.result?.name).map(r=>[r.result.name,r.payload.sha256]));const rows=await pages(token,parent,'media');const result:BusinessMedia[]=[];for(const item of rows){try{resource(item.name,parent,'media');}catch{continue;}if(!['PHOTO','VIDEO'].includes(item.mediaFormat)||item.attribution)continue;result.push({...item,version:await mediaVersion(item),sha256:known.get(item.name)});}return result;}
async function postList(parent:string,token:string){const rows=await pages(token,parent,'localPosts'),result:BusinessPost[]=[];for(const item of rows){try{resource(item.name,parent,'localPosts');}catch{continue;}result.push({...item,version:await postVersion(item)});}return result;}
async function contentItems(u:string,locationId:string){const {parent}=await owned(u,locationId),token=await accessToken(u),[media,posts]=await Promise.allSettled([mediaList(u,parent,token),postList(parent,token)]);return {media:media.status==='fulfilled'?media.value:[],posts:posts.status==='fulfilled'?posts.value:[],errors:{media:media.status==='rejected'?media.reason.message:'',posts:posts.status==='rejected'?posts.reason.message:''},loadedAt:now()};}
async function saveInventory(u:string,locationId:string,data:Awaited<ReturnType<typeof contentItems>>){
 const inventory:ContentInventory={version:1,checkedAt:data.loadedAt,media:data.media.map(m=>({name:m.name,mediaFormat:m.mediaFormat,createTime:m.createTime,category:m.locationAssociation?.category})),posts:data.posts.map(p=>({name:p.name,createTime:p.createTime,updateTime:p.updateTime,state:p.state})),errors:data.errors};
 await write(u,'content-performance:'+locationId,inventory);return inventory;
}
export async function loadContent(u:string,locationId:string){const result=await contentItems(u,locationId);await saveInventory(u,locationId,result);return {...result,operations:(await contentRecords(u)).filter(r=>r.locationId===locationId)};}
export async function contentPerformanceData(u:string,locationId='all'){
 const locations=await read<Location[]>(u,'locations')||[];
 if(locationId!=='all')await owned(u,locationId);
 const rows:PerformanceLocation[]=await Promise.all(locations.filter(l=>locationId==='all'||l.id===locationId).map(async l=>{
  const key='content-performance:'+l.id;let inventory=await read<ContentInventory>(u,key);
  const checked=Date.parse(inventory?.checkedAt||'');
  if(inventory&&(inventory.version!==1||!Number.isFinite(checked)||Date.now()-checked>30*86400000||checked>Date.now()+300000)){await db().prepare('DELETE FROM settings WHERE id=?').bind(u+':'+key).run();inventory=null;}
  return {id:l.id,title:l.title,address:l.address,inventory:inventory||null};
 }));
 return {rows};
}
export async function refreshContentPerformance(u:string,locationId:string){const result=await contentItems(u,locationId);return {inventory:await saveInventory(u,locationId,result)};}

export class DuplicateMediaError extends Error{}
function approved(input:any){if(input?.approved!==true)throw new Error('Periksa pratinjau dan berikan persetujuan terlebih dahulu.');}
export async function prepareUpload(u:string,input:any){approved(input);const metadata=validateUpload(input);const {parent}=await owned(u,metadata.locationId),token=await accessToken(u),list=await mediaList(u,parent,token);if(list.some(m=>m.sha256===metadata.sha256))throw new DuplicateMediaError('File identik sudah pernah diunggah ke lokasi ini dan masih tersedia.');const id=await hash('upload:'+metadata.locationId+':'+metadata.sha256);const existing=await db().prepare('SELECT value FROM settings WHERE id=?').bind(opKey(u,id)).first<{value:string}>();if(existing){const old={value:existing.value,record:await open<ContentRecord>(existing.value)};if(['running','uncertain'].includes(old.record.state))throw new Error('Upload file ini sedang diproses atau hasil sebelumnya belum pasti. Periksa Google sebelum mengunggah lagi.');if(old.record.state==='prepared'&&Date.parse(old.record.updatedAt)>Date.now()-30*60000){if(JSON.stringify(old.record.payload)===JSON.stringify(metadata))return old.record;throw new Error('File ini sedang disiapkan dengan pengaturan berbeda pada tab lain.');}const next={...old.record,state:'prepared' as const,payload:metadata,result:undefined,error:undefined,version:old.record.version+1,updatedAt:now()};return (await replace(u,old,next)).record;}
 const record:ContentRecord={id,kind:'upload',locationId:metadata.locationId,state:'prepared',version:1,createdAt:now(),updatedAt:now(),payload:metadata};const inserted=await insert(u,record);if(JSON.stringify(inserted.record)!==JSON.stringify(record))throw new Error('Upload identik sedang disiapkan di tab lain.');return record;}
function signature(bytes:Uint8Array,mime:string){if(mime==='image/jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;if(mime==='image/png')return [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);return bytes.length>=12&&new TextDecoder().decode(bytes.slice(4,8))==='ftyp';}
export async function uploadMedia(u:string,id:string,r:Request,expectedVersion?:number){
 let old=await getRecord(u,id);const metadata=old.record.payload as UploadMetadata;await owned(u,old.record.locationId);
 if(expectedVersion!==undefined&&(!Number.isSafeInteger(expectedVersion)||expectedVersion!==old.record.version))throw new Error('Versi upload berubah. Periksa ulang rencana sebelum mengirim.');
 if(old.record.kind!=='upload')throw new Error('Jenis operasi tidak sesuai.');if(old.record.state==='complete')return old.record;if(old.record.state!=='prepared'||Date.parse(old.record.updatedAt)<Date.now()-30*60000)throw new Error('Upload kedaluwarsa atau sudah diproses. Periksa riwayat operasi.');
 if(r.headers.get('content-type')!==metadata.mime||!r.body)throw new Error('Isi file upload tidak sesuai.');const declared=r.headers.get('content-length');if(declared&&Number(declared)!==metadata.size)throw new Error('Ukuran file berbeda dari pratinjau.');
 old=await replace(u,old,{...old.record,state:'running',updatedAt:now()});let creating=false;
 try{const {parent}=await owned(u,metadata.locationId),token=await accessToken(u),ref=await request(token,parent+'/media:startUpload',{method:'POST'});if(typeof ref.resourceName!=='string'||!ref.resourceName||ref.resourceName.length>2000)throw new Error('Google tidak memberikan referensi upload yang valid.');
  const digest=createHash('sha256');let size=0,head=new Uint8Array(),finished=false;
  const stream=new TransformStream<Uint8Array,Uint8Array>({transform(chunk,controller){size+=chunk.byteLength;if(size>metadata.size)throw new Error('File melebihi ukuran pratinjau.');if(head.length<32){const copy=new Uint8Array(Math.min(32,head.length+chunk.length));copy.set(head);copy.set(chunk.subarray(0,copy.length-head.length),head.length);head=copy;}digest.update(chunk);controller.enqueue(chunk);},flush(){if(size!==metadata.size||digest.digest('hex')!==metadata.sha256||!signature(head,metadata.mime))throw new Error('Isi atau hash file tidak sesuai pratinjau.');finished=true;}});
  const verified=r.body.pipeThrough(stream),body=typeof FixedLengthStream==='undefined'?verified:verified.pipeThrough(new FixedLengthStream(metadata.size));
  const upload=await googleFetch('https://mybusiness.googleapis.com/upload/v1/media/'+ref.resourceName.split('/').map(encodeURIComponent).join('/')+'?uploadType=media',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':metadata.mime,'Content-Length':String(metadata.size)},body,duplex:'half'} as RequestInit);if(!upload.ok)throw await googleApiError(upload,'mengirim file');await upload.arrayBuffer();if(!finished)throw new Error('Data upload belum diterima sepenuhnya.');
  creating=true;const result=await request(token,parent+'/media',{method:'POST',body:JSON.stringify({mediaFormat:metadata.mime.startsWith('image/')?'PHOTO':'VIDEO',locationAssociation:{category:metadata.category},description:metadata.description,dataRef:{resourceName:ref.resourceName}})});resource(result.name,parent,'media');
  return (await replace(u,old,{...old.record,state:'complete',updatedAt:now(),result})).record;
 }catch(e){const uncertain=creating&&!(e instanceof GoogleError&&e.status>=400&&e.status<500&&e.status!==408);const message=uncertain?'Hasil publikasi media belum pasti. Muat ulang galeri dan periksa Google; file tidak dikirim ulang otomatis.':(e as Error).message;await replace(u,old,{...old.record,state:uncertain?'uncertain':'failed',updatedAt:now(),error:message});throw new Error(message);}
}
// Serialize deletion per location across tabs. Never expire an unresolved lock
// automatically: a terminated Worker may still have sent a DELETE to Google.
export async function deleteDuplicates(u:string,input:any){
 approved(input);await owned(u,input.locationId);const key=u+':content-lock:'+input.locationId,value=await seal({startedAt:now()});
 const claim=await db().prepare('INSERT INTO settings(id,value) VALUES(?,?) ON CONFLICT(id) DO NOTHING').bind(key,value).run();
 if(!changes(claim))throw new Error('Penghapusan lokasi ini sedang diproses atau hasilnya belum pasti. Periksa riwayat; jangan menghapus dari beberapa tab sekaligus.');
 try{return await deleteDuplicatesLocked(u,input);}finally{await db().prepare('DELETE FROM settings WHERE id=? AND value=?').bind(key,value).run();}
}
async function deleteDuplicatesLocked(u:string,input:any){approved(input);const {parent}=await owned(u,input.locationId);if(!Array.isArray(input.items)||!input.items.length||input.items.length>100||typeof input.requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(input.requestId))throw new Error('Pilih 1–100 media untuk satu operasi.');
 if(input.selectionMode!==undefined&&input.selectionMode!=='selected'||input.selectionMode==='selected'&&input.manualComparison)throw new Error('Mode penghapusan tidak valid.');
 const selectedMode=input.selectionMode==='selected',payload=selectedMode?{selectionMode:'selected',items:input.items}:input.manualComparison?{items:input.items,manualComparison:input.manualComparison,keepName:input.keepName}:input.items;const id=await hash('delete:'+input.requestId),existing=await db().prepare('SELECT value FROM settings WHERE id=?').bind(opKey(u,id)).first<{value:string}>();if(existing){const previous=await open<ContentRecord>(existing.value);if(previous.kind!=='delete'||previous.locationId!==input.locationId||JSON.stringify(previous.payload)!==JSON.stringify(payload))throw new Error('ID operasi sudah digunakan untuk pilihan berbeda.');if(['complete','partial'].includes(previous.state))return previous;throw new Error('Penghapusan ini sudah diproses. Periksa riwayat, jangan kirim ulang.');}
 const names=new Set<string>(input.items.map((m:any)=>resource(m.name,parent,'media')));if(names.size!==input.items.length)throw new Error('Pilihan media berulang.');const token=await accessToken(u),list=await mediaList(u,parent,token),groups=duplicateCandidates(list);
 let manualGroup:BusinessMedia[]|undefined;
 if(input.manualComparison){
  if(!Array.isArray(input.manualComparison)||input.manualComparison.length<2||input.manualComparison.length>101)throw new Error('Bandingkan 2–101 media dengan format yang sama.');
  const comparisonNames=new Set<string>(input.manualComparison.map((m:any)=>resource(m.name,parent,'media')));
  if(comparisonNames.size!==input.manualComparison.length||!comparisonNames.has(input.keepName)||names.has(input.keepName)||comparisonNames.size!==names.size+1||[...names].some(name=>!comparisonNames.has(name)))throw new Error('Pilih tepat satu media untuk disimpan dari perbandingan manual.');
  const compared:BusinessMedia[]=input.manualComparison.map((m:any)=>{const item=list.find(item=>item.name===m.name);if(!item||!editableMedia(item)||item.version!==m.version)throw new Error('Media perbandingan berubah. Muat ulang dan bandingkan kembali.');return item;});
  manualGroup=compared;if(new Set(compared.map(m=>m.mediaFormat)).size!==1)throw new Error('Bandingkan foto dengan foto atau video dengan video.');
 }
 for(const selected of input.items){const item=list.find(m=>m.name===selected.name);if(!item||!editableMedia(item)||selected.version!==item.version)throw new Error('Media berubah, dilindungi, atau tidak tersedia. Muat ulang galeri dan periksa kembali.');if(!selectedMode){const group=manualGroup?{items:manualGroup}:groups.find(g=>g.items.some(m=>m.name===item.name));if(!group||group.items.every(m=>names.has(m.name)))throw new Error('Setiap kelompok harus menyisakan minimal satu media. Foto profil, cover, dan foto pelanggan tidak bisa dihapus di sini.');}}
 const record:ContentRecord={id,kind:'delete',locationId:input.locationId,state:'running',version:1,createdAt:now(),updatedAt:now(),payload},value=await seal(record);
 const claim=await db().prepare('INSERT INTO settings(id,value) VALUES(?,?) ON CONFLICT(id) DO NOTHING').bind(opKey(u,id),value).run();if(!changes(claim))throw new Error('Penghapusan yang sama sedang diproses pada tab lain.');
 const old={record,value},deleted:string[]=[],failed:{name:string;error:string}[]=[];
 for(const name of names){try{await request(token,name,{method:'DELETE'});deleted.push(name);}catch(e){if(e instanceof GoogleError&&e.status===404)deleted.push(name);else failed.push({name,error:(e as Error).message});}}
 if(deleted.length)await write(u,'content-performance:'+input.locationId,null);
 return (await replace(u,old,{...old.record,state:failed.length?'partial':'complete',updatedAt:now(),result:{deleted,failed}})).record;
}
export async function savePostDraft(u:string,input:any){const payload=validatePost(input),{parent}=await owned(u,payload.locationId);if(payload.name){resource(payload.name,parent,'localPosts');if(!/^[a-zA-Z0-9_-]{43}$/.test(payload.sourceVersion||''))throw new Error('Versi postingan tidak valid. Muat ulang postingan.');}
 if(input.id){const old=await getRecord(u,input.id);if(old.record.kind!=='post'||old.record.locationId!==payload.locationId||old.record.state!=='draft'||old.record.version!==input.version)throw new Error('Draf berubah atau sedang dipublikasikan. Muat ulang draf.');return (await replace(u,old,{...old.record,payload,error:undefined,version:old.record.version+1,updatedAt:now()})).record;}
 const record:ContentRecord={id:random(),kind:'post',locationId:payload.locationId,state:'draft',version:1,createdAt:now(),updatedAt:now(),payload};return (await insert(u,record)).record;}
export async function publishPost(u:string,input:any){approved(input);let old=await getRecord(u,input.id);if(old.record.kind!=='post')throw new Error('Draf postingan tidak ditemukan.');await owned(u,old.record.locationId);if(old.record.state==='complete')return old.record;if(old.record.state!=='draft'||old.record.version!==input.version)throw new Error('Draf berubah atau sudah diproses. Muat ulang draf.');const payload=validatePost(old.record.payload),{parent}=await owned(u,payload.locationId),token=await accessToken(u);
 let currentPost:any;
 if(payload.name){resource(payload.name,parent,'localPosts');currentPost=await request(token,payload.name);if(await postVersion(currentPost)!==payload.sourceVersion)throw new Error('Postingan berubah di Google. Muat ulang dan edit versi terbaru.');}
 old=await replace(u,old,{...old.record,state:'running',updatedAt:now()});let sending=false;
 try{const standard=!payload.name||(currentPost?.topicType||'STANDARD')==='STANDARD';const body:any={summary:payload.summary};const originalPhoto=currentPost?.media?.find((m:any)=>m.mediaFormat==='PHOTO'),replaceMedia=!payload.name||!!payload.photoUrl&&payload.photoUrl!==(originalPhoto?.sourceUrl||originalPhoto?.googleUrl||'');if(standard){body.languageCode=payload.languageCode;if(replaceMedia)body.media=payload.photoUrl?[{mediaFormat:'PHOTO',sourceUrl:payload.photoUrl}]:[];if(payload.actionType)body.callToAction={actionType:payload.actionType,...(payload.actionUrl?{url:payload.actionUrl}:{})};}if(!payload.name)body.topicType='STANDARD';sending=true;
  const result=await request(token,payload.name?payload.name+'?updateMask='+encodeURIComponent(standard?'summary,languageCode,callToAction'+(replaceMedia?',media':''):'summary'):parent+'/localPosts',{method:payload.name?'PATCH':'POST',body:JSON.stringify(body)});resource(result.name,parent,'localPosts');return (await replace(u,old,{...old.record,state:'complete',updatedAt:now(),result})).record;
 }catch(e){const uncertain=sending&&!(e instanceof GoogleError&&e.status>=400&&e.status<500&&e.status!==408);const message=uncertain?'Hasil publikasi belum pasti. Muat ulang postingan dan periksa Google; dashboard tidak mengirim ulang otomatis.':(e as Error).message;await replace(u,old,{...old.record,state:uncertain?'uncertain':'draft',updatedAt:now(),error:message});throw new Error(message);}
}

export async function contentOperation(u:string,id:string){const op=(await getRecord(u,id)).record;await owned(u,op.locationId);return op;}
export async function createPostDraftOnce(u:string,id:string,input:any){
 if(!/^[a-zA-Z0-9_-]{43}$/.test(id))throw new Error('ID draf tidak valid.');
 const payload=validatePost(input);if(payload.name)throw new Error('Bulk hanya membuat postingan baru.');await owned(u,payload.locationId);
 const record:ContentRecord={id,kind:'post',locationId:payload.locationId,state:'draft',version:1,createdAt:now(),updatedAt:now(),payload};
 const result=(await insert(u,record)).record;if(result.kind!=='post'||JSON.stringify(result.payload)!==JSON.stringify(payload))throw new Error('Draf operasi berbeda dari rencana bulk.');return result;
}
