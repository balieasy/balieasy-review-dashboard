import type {BulkContentPlan} from './content-bulk-model';
import {validateUpload,type UploadMetadata} from './content-model';

const DB='balieasy-bulk-files',STORE='files',MAX_AGE=30*24*60*60*1000;
type SavedFile={key:string;scope:string;blob:Blob;filename:string;lastModified:number;savedAt:number};
function openDatabase():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined'){reject(new Error('Penyimpanan file browser tidak tersedia.'));return;}
  let expired=false;
  const timer=setTimeout(()=>{expired=true;reject(new Error('Penyimpanan file browser belum dapat dibuka.'));},5000);
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>{const store=request.result.createObjectStore(STORE,{keyPath:'key'});store.createIndex('scope','scope');};
  request.onsuccess=()=>{clearTimeout(timer);if(expired){request.result.close();return;}request.result.onversionchange=()=>request.result.close();resolve(request.result);};
  request.onerror=()=>{clearTimeout(timer);reject(request.error||new Error('Penyimpanan file browser gagal dibuka.'));};
 });
}
async function transaction<T>(mode:IDBTransactionMode,work:(store:IDBObjectStore,result:(value:T)=>void)=>void):Promise<T>{
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  let value:T;const tx=db.transaction(STORE,mode),timer=setTimeout(()=>tx.abort(),15000);
  tx.oncomplete=()=>{clearTimeout(timer);db.close();resolve(value);};
  tx.onabort=tx.onerror=()=>{clearTimeout(timer);db.close();reject(tx.error||new Error('File belum dapat disimpan di browser.'));};
  try{work(tx.objectStore(STORE),result=>{value=result;});}catch(e){tx.abort();reject(e);}
 });
}
function expectedFile(plan:BulkContentPlan){
 if(plan.kind!=='media'||!plan.items[0]||!('sha256' in plan.items[0].payload))throw new Error('Rencana ini tidak memiliki file media.');
 return validateUpload(plan.items[0].payload) as UploadMetadata;
}
async function matches(file:Blob,expected:UploadMetadata){
 if(file.size!==expected.size||file.type!==expected.mime)return false;
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()));
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')===expected.sha256;
}
function fileKey(scope:string,planId:string){if(!scope||!planId)throw new Error('Akun untuk penyimpanan file belum tersedia.');return scope+':'+planId;}
export async function saveBulkFile(scope:string,plan:BulkContentPlan,file:File){
 const expected=expectedFile(plan),key=fileKey(scope,plan.id);
 if(!await matches(file,expected))throw new Error('File tidak sesuai rencana tersimpan.');
 await transaction<void>('readwrite',(store)=>{
  store.put({key,scope,blob:file,filename:expected.filename,lastModified:file.lastModified,savedAt:Date.now()} satisfies SavedFile);
  const cursor=store.openCursor();cursor.onsuccess=()=>{const row=cursor.result;if(!row)return;if(row.value.savedAt<Date.now()-MAX_AGE)row.delete();row.continue();};
 });
}
export async function loadBulkFile(scope:string,plan:BulkContentPlan):Promise<File|null>{
 const expected=expectedFile(plan),key=fileKey(scope,plan.id);
 const saved=await transaction<SavedFile|undefined>('readonly',(store,result)=>{const request=store.get(key);request.onsuccess=()=>result(request.result);});
 if(!saved)return null;
 if(saved.scope!==scope||!(saved.blob instanceof Blob)||saved.savedAt<Date.now()-MAX_AGE||!await matches(saved.blob,expected)){await removeBulkFile(scope,plan.id);return null;}
 return new File([saved.blob],expected.filename,{type:expected.mime,lastModified:saved.lastModified});
}
export async function removeBulkFile(scope:string,planId:string){await transaction<void>('readwrite',store=>{store.delete(fileKey(scope,planId));});}
export async function clearBulkFiles(scope:string){
 if(!scope)return;
 await transaction<void>('readwrite',store=>{const request=store.index('scope').openCursor(IDBKeyRange.only(scope));request.onsuccess=()=>{const row=request.result;if(!row)return;row.delete();row.continue();};});
}
