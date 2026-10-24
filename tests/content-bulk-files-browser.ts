import {saveBulkFile,loadBulkFile,clearBulkFiles} from '../app/content-bulk-files';
import type {BulkContentPlan} from '../app/content-bulk-model';

// Run on a disposable same-origin page. Only test-scoped IndexedDB rows change;
// this page has no Google API calls or access to real saved plans.
const output=document.querySelector('pre')!,button=document.querySelector('button')!;
const marker='balieasy-bulk-cache-test';let checks=0;
function assert(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
function pass(message:string){checks++;output.textContent+='PASS '+message+'\n';}
async function fixture(kind:'photo'|'video'){
 const bytes=new Uint8Array(kind==='photo'?12000:20000).fill(kind==='photo'?42:77);
 const mime=kind==='photo'?'image/jpeg':'video/mp4',file=new File([bytes],kind==='photo'?'cache-photo.jpg':'cache-video.mp4',{type:mime,lastModified:123456789});
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 const payload={locationId:'locations/test',filename:file.name,mime,size:file.size,width:1280,height:720,duration:kind==='photo'?0:15,sha256:Array.from(digest,b=>b.toString(16).padStart(2,'0')).join(''),category:'ADDITIONAL',description:'Test only'};
 const plan={id:kind,kind:'media',items:[{payload}]} as BulkContentPlan;
 return {bytes,file,plan};
}
const previous=sessionStorage.getItem(marker);
async function run(){
 button.disabled=true;output.textContent='';
 const scope=previous||'test-'+crypto.randomUUID(),other=scope+'-other';
 const photo=await fixture('photo'),video=await fixture('video');
 try{
  if(!previous){
   await saveBulkFile(scope,photo.plan,photo.file);await saveBulkFile(scope,video.plan,video.file);
   pass('photo and video transactions committed');sessionStorage.setItem(marker,scope);
   output.textContent+='Reload this page to verify that file bytes survive a new document.\n';
   button.disabled=false;button.textContent='Muat ulang & periksa';button.onclick=()=>location.reload();return;
  }
  for(const item of [photo,video]){
   const restored=await loadBulkFile(scope,item.plan);
   assert(restored,'File missing after reload');assert(restored.name===item.file.name&&restored.type===item.file.type&&restored.lastModified===item.file.lastModified,'File metadata changed');
   const bytes=new Uint8Array(await restored.arrayBuffer());assert(bytes.length===item.bytes.length&&bytes.every((b,i)=>b===item.bytes[i]),'File bytes changed');pass(item.plan.id+' restored after browser reload with identical bytes and metadata');
  }
  assert(await loadBulkFile(other,photo.plan)===null,'Another account could read the file');pass('another account scope cannot restore this file');
  let rejected=false;try{await saveBulkFile(scope,photo.plan,new File([new Uint8Array(12000)],photo.file.name,{type:photo.file.type}));}catch{rejected=true;}
  assert(rejected&&await loadBulkFile(scope,photo.plan),'Wrong bytes overwrote valid file');pass('mismatched file bytes are rejected without replacing the stored original');
  const altered=structuredClone(photo.plan);(altered.items[0].payload as any).sha256='0'.repeat(64);
  assert(await loadBulkFile(scope,altered)===null,'Wrong hash restored');assert(await loadBulkFile(scope,photo.plan)===null,'Corrupted entry not removed');pass('restoration verifies the saved plan hash and removes an invalid cached entry');
  await saveBulkFile(other,photo.plan,photo.file);await clearBulkFiles(scope);
  assert(await loadBulkFile(scope,video.plan)===null&&await loadBulkFile(other,photo.plan),'Scope cleanup affected another account');pass('disconnect cleanup removes only the selected account scope');
  const realNow=Date.now;try{Date.now=()=>realNow()-31*86400000;await saveBulkFile(scope,video.plan,video.file);}finally{Date.now=realNow;}
  assert(await loadBulkFile(scope,video.plan)===null,'Expired file restored');pass('files older than 30 days are not restored');
  output.textContent+=`Verified ${checks} browser file-cache checks. No Google content sent.\n`;
 }catch(error){output.textContent+='FAIL '+(error as Error).message+'\n';throw error;}
 finally{if(previous){await clearBulkFiles(scope);await clearBulkFiles(other);sessionStorage.removeItem(marker);button.textContent='Selesai';}}
}
button.textContent=previous?'Memeriksa hasil reload…':'Simpan file uji';button.onclick=()=>void run();
if(previous)void run();
