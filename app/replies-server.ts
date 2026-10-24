import {db,read,write,seal,open,hash,accessToken,type Token} from './server';
import {googleFetch} from './google-fetch';
import {replyDraft,detectLanguage,REPLY_GENERATOR_VERSION,type Language,type Tone} from './reply-draft';
import {replyDraft as legacyReplyDraft} from './reply-legacy';
import {isReplyLanguage} from './reply-languages';
import {unansweredDrafts} from './draft-visibility';
import type {Location,Review} from './metrics';
export type DraftState='draft'|'approved'|'sending'|'sent'|'uncertain'|'blocked';
export type SavedDraft={id:string;locationId:string;locationTitle:string;reviewId:string;review:Review;sourceHash:string;text:string;language:Language;tone:Tone;state:DraftState;version:number;createdAt:string;updatedAt:string;approvedHash?:string;sentAt?:string;googleState?:string;error?:string;generatedHash?:string;generatorVersion?:number};
const prefix=(u:string)=>u+':replydraft:';
const key=(u:string,id:string)=>prefix(u)+id;
const ratings:Record<string,number>={ONE:1,TWO:2,THREE:3,FOUR:4,FIVE:5};
const iso=()=>new Date().toISOString();
const changeCount=(r:any)=>r.meta?.changes??r.changes??0;
async function fingerprint(r:Pick<Review,'comment'|'rating'|'name'|'created'>){return hash(JSON.stringify([r.comment,r.rating,r.name,r.created]));}
async function row(u:string,id:string){if(!/^[a-zA-Z0-9_-]{43}$/.test(id))throw new Error('ID draf tidak valid.');const record=await db().prepare('SELECT value FROM settings WHERE id=?').bind(key(u,id)).first<{value:string}>();if(!record)throw new Error('Draf tidak ditemukan.');return {cipher:record.value,draft:await open<SavedDraft>(record.value)};}
async function ownedReview(u:string,locationId:string,reviewId:string){
 const list=await read<Location[]>(u,'locations')||[];if(!list.some(l=>l.id===locationId))throw new Error('Lokasi tidak tersedia untuk akun ini.');
 const record=await db().prepare('SELECT value,updated FROM snapshots WHERE id=? AND user=?').bind(u+':'+locationId,u).first<{value:string;updated:number}>();
 if(!record||record.updated<Date.now()-30*86400000)throw new Error('Sinkronkan lokasi terlebih dahulu sebelum menyiapkan atau mengirim balasan.');
 const location=await open<Location>(record.value),review=location.reviews.find(r=>r.id===reviewId);if(!review)throw new Error('Review tidak ditemukan pada lokasi ini.');
 if(!/^accounts\/[a-zA-Z0-9_-]+$/.test(location.account)||!/^locations\/[a-zA-Z0-9_-]+$/.test(location.id))throw new Error('ID lokasi tidak valid.');
 return {location,review};
}
async function replace(u:string,cipher:string,next:SavedDraft){const value=await seal(next);const result=await db().prepare('UPDATE settings SET value=? WHERE id=? AND value=?').bind(value,key(u,next.id),cipher).run();if(!changeCount(result))throw new Error('Draf berubah di tab lain. Muat ulang antrean sebelum melanjutkan.');return {cipher:value,draft:next};}
async function allSavedDrafts(u:string){const p=prefix(u);const records=await db().prepare('SELECT value FROM settings WHERE substr(id,1,?)=?').bind(p.length,p).all<{value:string}>();return Promise.all(records.results.map(r=>open<SavedDraft>(r.value)));}
export async function listDrafts(u:string){
 const p=prefix(u);
 const [records,snapshots,locations]=await Promise.all([
  db().prepare('SELECT value FROM settings WHERE substr(id,1,?)=?').bind(p.length,p).all<{value:string}>(),
  db().prepare('SELECT value FROM snapshots WHERE user=?').bind(u).all<{value:string}>(),
  read<Location[]>(u,'locations'),
 ]);
 const allowed=new Set((locations||[]).map(l=>l.id));
 const rows=await Promise.all(records.results.map(r=>open<SavedDraft>(r.value)));
 const cached=await Promise.all(snapshots.results.map(r=>open<Location>(r.value)));
 return unansweredDrafts(rows.filter(r=>allowed.has(r.locationId)),cached).sort((a,b)=>Date.parse(a.review.created)-Date.parse(b.review.created));
}
export async function prepareDraft(u:string,locationId:string,reviewId:string){
 const {location,review}=await ownedReview(u,locationId,reviewId);if(review.replied)throw new Error('Review ini sudah memiliki balasan.');
 const id=await hash(locationId+'\0'+reviewId),language=detectLanguage(review.comment),now=iso();
 const existing=await db().prepare('SELECT value FROM settings WHERE id=?').bind(key(u,id)).first<{value:string}>();if(existing)return open<SavedDraft>(existing.value);
 const text=replyDraft(review,language,'warm',{avoid:(await allSavedDrafts(u)).map(d=>d.text)});
 const draft:SavedDraft={id,locationId,locationTitle:location.title,reviewId,review,sourceHash:await fingerprint(review),text,language,tone:'warm',state:'draft',version:1,createdAt:now,updatedAt:now,generatedHash:await hash(text),generatorVersion:REPLY_GENERATOR_VERSION};
 await db().prepare('INSERT INTO settings(id,value) VALUES(?,?) ON CONFLICT(id) DO NOTHING').bind(key(u,id),await seal(draft)).run();return (await row(u,id)).draft;
}
export async function prepareAllDrafts(u:string){const list=await read<Location[]>(u,'locations')||[];let created=0,kept=0;const errors:string[]=[];for(const l of list){const snapshot=await db().prepare('SELECT value FROM snapshots WHERE id=? AND user=?').bind(u+':'+l.id,u).first<{value:string}>();if(!snapshot)continue;const location=await open<Location>(snapshot.value);for(const r of location.reviews.filter(r=>!r.replied)){try{const id=await hash(l.id+'\0'+r.id),exists=await db().prepare('SELECT id FROM settings WHERE id=?').bind(key(u,id)).first();await prepareDraft(u,l.id,r.id);if(exists)kept++;else created++;}catch(e){errors.push(`${l.title}: ${(e as Error).message}`);}}}return {created,kept,errors};}
export async function saveDraft(u:string,input:{id:string;version:number;text:string;language:Language;tone:Tone;approved:boolean}){
 const current=await row(u,input.id),d=current.draft;if(input.version!==d.version)throw new Error('Versi draf sudah berubah. Muat ulang antrean.');
 if(d.state==='sending'||d.state==='sent'||d.state==='uncertain')throw new Error('Draf sedang dikirim atau sudah terkirim.');
 const text=typeof input.text==='string'?input.text.trim():'';if(!text||Array.from(text).length>4096)throw new Error('Balasan harus berisi 1–4.096 karakter.');
 if(!isReplyLanguage(input.language)||!['warm','professional','short'].includes(input.tone)||typeof input.approved!=='boolean')throw new Error('Pengaturan draf tidak valid.');
 const {review}=await ownedReview(u,d.locationId,d.reviewId);if(review.replied)throw new Error('Review sudah dibalas. Sinkronkan data.');
 if(await fingerprint(review)!==d.sourceHash)throw new Error('Review sudah berubah. Sinkronkan dan buat ulang draf untuk review terbaru.');
 const next:SavedDraft={...d,text,language:input.language,tone:input.tone,state:input.approved?'approved':'draft',version:d.version+1,updatedAt:iso(),approvedHash:input.approved?await hash(text):undefined,error:undefined,generatedHash:d.generatedHash===await hash(text)?d.generatedHash:undefined};
 return (await replace(u,current.cipher,next)).draft;
}
export async function regenerateDraft(u:string,input:{id:string;version:number;language:Language;tone:Tone}){
 const current=await row(u,input.id),d=current.draft;
 if(d.version!==input.version)throw new Error('Versi draf berubah. Muat ulang antrean terlebih dahulu.');
 if(!['draft','approved','blocked'].includes(d.state))throw new Error('Draf sedang dikirim atau sudah terkirim.');
 if(!isReplyLanguage(input.language)||!['warm','professional','short'].includes(input.tone))throw new Error('Pengaturan draf tidak valid.');
 const {review}=await ownedReview(u,d.locationId,d.reviewId);if(review.replied)throw new Error('Review sudah dibalas. Sinkronkan data.');
 if(await fingerprint(review)!==d.sourceHash)throw new Error('Review berubah. Sinkronkan dan periksa kembali isinya.');
 const text=replyDraft(review,input.language,input.tone,{variant:d.version,avoid:(await allSavedDrafts(u)).map(item=>item.text)});
 return (await replace(u,current.cipher,{...d,review,text,language:input.language,tone:input.tone,state:'draft',version:d.version+1,updatedAt:iso(),approvedHash:undefined,error:undefined,generatedHash:await hash(text),generatorVersion:REPLY_GENERATOR_VERSION})).draft;
}
export async function refreshNaturalDrafts(u:string){
 const drafts=await listDrafts(u);let updated=0,kept=0;const errors:string[]=[];
 for(const d of drafts){
  if(d.state!=='draft'||(d.generatedHash!==await hash(d.text)&&d.text.trim()!==legacyReplyDraft(d.review,d.language,d.tone).trim())){kept++;continue;}
  try{await regenerateDraft(u,{id:d.id,version:d.version,language:d.language,tone:d.tone});updated++;}catch(e){errors.push(`${d.review.name}: ${(e as Error).message}`);}
 }
 return {updated,kept,errors};
}
async function updateSnapshot(u:string,locationId:string,reviewId:string,comment:string,state?:string){
 for(let i=0;i<4;i++){const existing=await db().prepare('SELECT value FROM snapshots WHERE id=? AND user=?').bind(u+':'+locationId,u).first<{value:string}>();if(!existing)return;const location=await open<Location>(existing.value);location.reviews=location.reviews.map(r=>r.id===reviewId?{...r,replied:!!comment&&state!=='REJECTED',reply:comment}:r);const changed=await db().prepare('UPDATE snapshots SET value=? WHERE id=? AND user=? AND value=?').bind(await seal(location),u+':'+locationId,u,existing.value).run();if(changeCount(changed))return;}
 // Sending status is retained even when a concurrent sync prevents cache refresh.
}
async function liveReview(location:Location,id:string,token:string){const url='https://mybusiness.googleapis.com/v4/'+location.account+'/'+location.id+'/reviews/'+encodeURIComponent(id);const response=await googleFetch(url,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error(`Google belum dapat memeriksa review (HTTP ${response.status}). Pastikan akun memiliki akses dan lokasi terverifikasi.`);return {url,body:await response.json() as any};}
function replyState(body:any){return body.reviewReply?.reviewReplyState as string|undefined;}
export async function sendDraft(u:string,id:string,version:number){
 const current=await row(u,id),d=current.draft;
 if(d.state==='sent')return d;
 if(d.version!==version||d.state!=='approved'||d.approvedHash!==await hash(d.text))throw new Error('Periksa dan setujui versi draf ini sebelum mengirim.');
 const {location}=await ownedReview(u,d.locationId,d.reviewId);
 const claim:SavedDraft={...d,state:'sending',version:d.version+1,updatedAt:iso(),error:undefined};let locked=await replace(u,current.cipher,claim);let attempted=false;
 try{
  const token=await accessToken(u),live=await liveReview(location,d.reviewId,token);
  if(live.body.reviewReply?.comment){await updateSnapshot(u,d.locationId,d.reviewId,live.body.reviewReply.comment,replyState(live.body));throw new Error('Review sudah dibalas di Google. Balasan yang ada tidak ditimpa. Sinkronkan data.');}
  const liveSource={comment:live.body.comment||'',rating:ratings[live.body.starRating]||0,name:live.body.reviewer?.displayName||'Pengguna Google',created:live.body.createTime};
  if(await fingerprint(liveSource)!==d.sourceHash)throw new Error('Isi review berubah di Google. Periksa ulang review sebelum mengirim.');
  attempted=true;
  const response=await googleFetch(live.url+'/reply',{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({comment:d.text}),signal:AbortSignal.timeout(20000)});
  if(!response.ok){if(response.status>=400&&response.status<500){attempted=false;throw new Error(`Google menolak pengiriman (HTTP ${response.status}). Periksa izin akun, verifikasi lokasi, dan isi balasan.`);}throw new Error('Google belum mengonfirmasi pengiriman.');}
  const result=await response.json() as any;if(result.comment!==d.text)throw new Error('Respons Google belum mengonfirmasi teks balasan yang dikirim.');
  const state=result.reviewReplyState as string|undefined;
  const next:SavedDraft={...locked.draft,state:state==='REJECTED'?'blocked':'sent',googleState:state,sentAt:iso(),updatedAt:iso(),error:state==='REJECTED'?'Balasan ditolak oleh Google. Periksa kontennya.':undefined};
  locked=await replace(u,locked.cipher,next);await updateSnapshot(u,d.locationId,d.reviewId,result.comment,state).catch(()=>{});return next;
 }catch(e){
  const message=attempted?'Status pengiriman belum pasti. Klik Periksa status Google sebelum mencoba lagi.':(e as Error).message;
  // No automatic PUT retry: a network failure can occur after Google accepted it.
  const next:SavedDraft={...locked.draft,state:attempted?'uncertain':'blocked',updatedAt:iso(),error:message};
  await replace(u,locked.cipher,next);throw new Error(message);
 }
}
export async function reconcileDraft(u:string,id:string){
 const current=await row(u,id),d=current.draft;if(d.state==='sent')return d;
 if(d.state==='sending'&&Date.now()-Date.parse(d.updatedAt)<30000)throw new Error('Pengiriman masih berlangsung. Tunggu sebentar lalu periksa lagi.');
 const {location}=await ownedReview(u,d.locationId,d.reviewId),token=await accessToken(u),live=await liveReview(location,d.reviewId,token),comment=live.body.reviewReply?.comment;
 if(comment){await updateSnapshot(u,d.locationId,d.reviewId,comment,replyState(live.body));const matching=comment===d.text;return (await replace(u,current.cipher,{...d,state:matching&&replyState(live.body)!=='REJECTED'?'sent':'blocked',googleState:replyState(live.body),sentAt:matching?iso():d.sentAt,version:d.version+1,updatedAt:iso(),error:matching?undefined:'Review memiliki balasan lain di Google. Balasan yang ada tidak ditimpa.'})).draft;}
 return (await replace(u,current.cipher,{...d,state:'draft',approvedHash:undefined,version:d.version+1,updatedAt:iso(),error:'Belum ada balasan di Google. Periksa kembali draf, setujui, lalu kirim jika diperlukan.'})).draft;
}
