import { env } from 'cloudflare:workers';
import { getChatGPTUser } from './chatgpt-auth';
import { dashboardWorkspace } from '../lib/dashboard-workspace';
import type { Location, Review } from './metrics';
import { googleFetch } from './google-fetch';
import { encodeBase64 as b64 } from './base64';

export const ORIGIN=env.DASHBOARD_ORIGIN||'https://balieasy-review-monitor.shevanan.chatgpt.site';
export const REDIRECT=ORIGIN+'/api/google/callback';
const SCOPE='https://www.googleapis.com/auth/business.manage';
const encoder=new TextEncoder();
export function db(){if(!env.DB)throw new Error('Penyimpanan belum tersedia.');return env.DB;}
export async function user(){const u=await getChatGPTUser();if(!u)throw new Error('Silakan masuk ke dashboard terlebih dahulu.');return dashboardWorkspace(u,env);}
export function sameOrigin(r:Request){if(r.headers.get('origin')!==new URL(r.url).origin)throw new Error('Permintaan tidak diizinkan.');}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export async function endpoint(fn:()=>Promise<Response>){try{return await fn();}catch(e){return json({error:e instanceof Error?e.message:'Permintaan gagal.'},400);}}
const unb64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export function random(){return b64(crypto.getRandomValues(new Uint8Array(32))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}
export async function hash(s:string){return b64(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(s)))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}
async function key(){if(!env.DATA_ENCRYPTION_KEY)throw new Error('Kunci penyimpanan belum dikonfigurasi.');return crypto.subtle.importKey('raw',unb64(env.DATA_ENCRYPTION_KEY),'AES-GCM',false,['encrypt','decrypt']);}
export async function seal(value:unknown){const iv=crypto.getRandomValues(new Uint8Array(12));const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(),encoder.encode(JSON.stringify(value)));return b64(iv)+'.'+b64(new Uint8Array(ciphertext));}
export async function open<T>(value:string):Promise<T>{const [iv,body]=value.split('.');const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv)},await key(),unb64(body));return JSON.parse(new TextDecoder().decode(clear));}
export async function read<T>(u:string,k:string):Promise<T|null>{const row=await db().prepare('SELECT value FROM settings WHERE id=?').bind(u+':'+k).first<{value:string}>();return row?open<T>(row.value):null;}
export async function write(u:string,k:string,v:unknown){await db().prepare('INSERT INTO settings(id,value) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind(u+':'+k,await seal(v)).run();}
export type Config={clientId:string;clientSecret:string;projectId:string};
export const managedGoogleConfig=!!(env.GOOGLE_LOGIN_CLIENT_ID&&env.GOOGLE_LOGIN_CLIENT_SECRET);
export const autoSyncEnabled=env.DASHBOARD_AUTO_SYNC==='true';
export async function googleConfig(u:string):Promise<Config|null>{
 const stored=await read<Config>(u,'config');
 return stored||(managedGoogleConfig?{clientId:env.GOOGLE_LOGIN_CLIENT_ID!,clientSecret:env.GOOGLE_LOGIN_CLIENT_SECRET!,projectId:'intense-plate-511502-n3'}:null);
}
export type Token={accessToken:string;refreshToken:string;expires:number};
export async function bulkFileScope(u:string){const token=await read<Token>(u,'token');return token?hash('balieasy-browser-bulk-files:'+u+':'+token.refreshToken):'';}
export async function saveConfig(u:string,body:any){
 const c=body?.web;
 if(!c||typeof c.client_id!=='string'||!c.client_id.endsWith('.apps.googleusercontent.com')||typeof c.client_secret!=='string'||!c.client_secret)throw new Error('Pilih JSON OAuth untuk tipe Web application.');
 if(c.project_id!=='intense-plate-511502-n3')throw new Error('JSON ini bukan dari proyek Google Map Dashboard yang disetujui.');
 const old=await googleConfig(u);
 if(old&&old.clientId!==c.client_id)await disconnect(u);
 await write(u,'config',{clientId:c.client_id,clientSecret:c.client_secret,projectId:c.project_id});
}
async function tokenRequest(params:Record<string,string>){
 const r=await googleFetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams(params)});
 const b=await r.json() as any;
 if(!r.ok)throw new Error(b.error==='invalid_grant'?'Otorisasi Google kedaluwarsa atau dicabut. Hubungkan ulang akun Google.':'Koneksi OAuth gagal. Periksa Client ID, Client Secret, dan redirect URI.');
 if(typeof b.access_token!=='string')throw new Error('Google tidak memberikan token akses.');
 return b;
}
export async function accessToken(u:string){
 const t=await read<Token>(u,'token'),c=await googleConfig(u);
 if(!t||!c)throw new Error('Hubungkan akun Google terlebih dahulu.');
 if(t.expires>Date.now()+60000)return t.accessToken;
 const b=await tokenRequest({client_id:c.clientId,client_secret:c.clientSecret,refresh_token:t.refreshToken,grant_type:'refresh_token'});
 await write(u,'token',{accessToken:b.access_token,refreshToken:b.refresh_token||t.refreshToken,expires:Date.now()+b.expires_in*1000});return b.access_token;
}
export async function start(u:string){
 const c=await googleConfig(u);if(!c)throw new Error('Masukkan file JSON OAuth pada Pengaturan terlebih dahulu.');
 const state=random(),verifier=random();
 await db().prepare('DELETE FROM oauth_states WHERE expires<?').bind(Date.now()).run();
 await db().prepare('INSERT INTO oauth_states(id,user,verifier,expires) VALUES(?,?,?,?)').bind(await hash(state),u,await seal(verifier),Date.now()+600000).run();
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');url.search=new URLSearchParams({client_id:c.clientId,redirect_uri:REDIRECT,response_type:'code',scope:SCOPE,access_type:'offline',prompt:'consent',state,code_challenge:await hash(verifier),code_challenge_method:'S256'}).toString();return url.toString();
}
export async function callback(u:string,url:URL){
 const state=url.searchParams.get('state');if(!state)throw new Error('State OAuth tidak tersedia. Mulai koneksi lagi.');
 const row=await db().prepare('DELETE FROM oauth_states WHERE id=? AND user=? AND expires>? RETURNING verifier').bind(await hash(state),u,Date.now()).first<{verifier:string}>();
 if(!row)throw new Error('Sesi koneksi sudah kedaluwarsa atau tidak valid. Mulai koneksi lagi.');
 if(url.searchParams.has('error'))throw new Error('Otorisasi Google dibatalkan.');
 const code=url.searchParams.get('code'),c=await googleConfig(u);if(!code||!c)throw new Error('Koneksi Google tidak lengkap.');
 const b=await tokenRequest({client_id:c.clientId,client_secret:c.clientSecret,code,redirect_uri:REDIRECT,grant_type:'authorization_code',code_verifier:await open<string>(row.verifier)});
 const previous=await read<Token>(u,'token');const refreshToken=b.refresh_token||previous?.refreshToken;
 if(!refreshToken)throw new Error('Izin sinkronisasi belum diberikan. Hubungkan ulang dan setujui akses.');
 if(b.scope&&!String(b.scope).split(' ').includes(SCOPE))throw new Error('Izin Business Profile belum diberikan.');
 await write(u,'token',{accessToken:b.access_token,refreshToken,expires:Date.now()+b.expires_in*1000});
 // A new authorization may refer to a different Google account; clear old account data.
 await db().prepare('DELETE FROM snapshots WHERE user=?').bind(u).run();await write(u,'locations',[]);
}
export async function disconnect(u:string){
 const t=await read<Token>(u,'token');
 if(t){const r=await googleFetch('https://oauth2.googleapis.com/revoke',{method:'POST',body:new URLSearchParams({token:t.refreshToken})});if(!r.ok&&r.status!==400)throw new Error('Google belum berhasil mencabut akses. Coba lagi.');}
 await db().batch([db().prepare('DELETE FROM settings WHERE id IN (?,?)').bind(u+':token',u+':locations'),db().prepare('DELETE FROM snapshots WHERE user=?').bind(u),db().prepare('DELETE FROM oauth_states WHERE user=?').bind(u),db().prepare('DELETE FROM settings WHERE substr(id,1,?)=?').bind((u+':replydraft:').length,u+':replydraft:'),db().prepare('DELETE FROM settings WHERE substr(id,1,?)=?').bind((u+':content:').length,u+':content:'),db().prepare('DELETE FROM settings WHERE substr(id,1,?)=?').bind((u+':content-lock:').length,u+':content-lock:'),db().prepare('DELETE FROM settings WHERE substr(id,1,?)=?').bind((u+':content-performance:').length,u+':content-performance:'),db().prepare('DELETE FROM settings WHERE substr(id,1,?)=?').bind((u+':content-bulk:').length,u+':content-bulk:')]);
}
async function google(url:string,token:string){
 const allowed=['mybusinessaccountmanagement.googleapis.com','mybusinessbusinessinformation.googleapis.com','mybusiness.googleapis.com'];if(!allowed.includes(new URL(url).hostname))throw new Error('Endpoint tidak diizinkan.');
 for(let attempt=0;attempt<3;attempt++){
 const r=await googleFetch(url,{headers:{Authorization:'Bearer '+token}});
 if(r.ok)return r.json() as Promise<any>;
 if((r.status===429||r.status>=500)&&attempt<2){await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));continue;}
 if(r.status===403)throw new Error('Akses Google ditolak. Pastikan API aktif, Business Profile diizinkan oleh Workspace, dan akun memiliki akses lokasi.');
 if(r.status===401)throw new Error('Koneksi Google tidak berlaku. Hubungkan ulang akun.');
 throw new Error('Google API mengembalikan error '+r.status+'. Data terakhir tetap dipertahankan.');
 }
 throw new Error('Google sedang sibuk. Coba lagi.');
}
async function paged(url:string,field:string,token:string){let items:any[]=[];let page='';const seen=new Set<string>();for(let n=0;n<1000;n++){const next=new URL(url);if(page)next.searchParams.set('pageToken',page);const b=await google(next.toString(),token);items.push(...(b[field]||[]));if(!b.nextPageToken)return items;if(seen.has(b.nextPageToken))throw new Error('Paginasi Google tidak lengkap. Coba sinkronkan ulang.');seen.add(b.nextPageToken);page=b.nextPageToken;}throw new Error('Data terlalu besar untuk satu sinkronisasi.');}
export async function discover(u:string){
 const token=await accessToken(u);const accounts=await paged('https://mybusinessaccountmanagement.googleapis.com/v1/accounts','accounts',token);const locations:Location[]=[];const seenAccounts=new Set<string>();
 for(let accountIndex=0;accountIndex<accounts.length;accountIndex++){const a=accounts[accountIndex];if(!/^accounts\/[a-zA-Z0-9_-]+$/.test(a.name)||seenAccounts.has(a.name))continue;seenAccounts.add(a.name);
 if(a.type==='ORGANIZATION'||a.type==='USER_GROUP'){const children=await paged('https://mybusinessaccountmanagement.googleapis.com/v1/accounts?parentAccount='+encodeURIComponent(a.name),'accounts',token);accounts.push(...children);continue;}
 const rows=await paged('https://mybusinessbusinessinformation.googleapis.com/v1/'+a.name+'/locations?readMask=name,title,storefrontAddress,metadata&pageSize=100','locations',token);
 for(const l of rows){if(!/^locations\/[a-zA-Z0-9_-]+$/.test(l.name))continue;if(locations.some(x=>x.id===l.name))continue;locations.push({id:l.name,account:a.name,title:l.title||l.name,address:(l.storefrontAddress?.addressLines||[]).join(', '),maps:l.metadata?.mapsUri||'',rating:0,total:0,reviews:[]});}}
 await write(u,'locations',locations);const existing=await db().prepare('SELECT id FROM snapshots WHERE user=?').bind(u).all<{id:string}>();const allowedIds=new Set(locations.map(l=>u+':'+l.id));for(const row of existing.results){if(!allowedIds.has(row.id))await db().prepare('DELETE FROM snapshots WHERE id=? AND user=?').bind(row.id,u).run();}return locations;
}
export async function syncLocation(u:string,id:string){
 const locations=await read<Location[]>(u,'locations');const l=locations?.find(x=>x.id===id);if(!l)throw new Error('Lokasi tidak ada dalam akun ini.');
 const token=await accessToken(u);let page='',reviews:Review[]=[];let rating=0,total=0;const seen=new Set<string>();let complete=false;
 for(let n=0;n<1000;n++){
 const url=new URL('https://mybusiness.googleapis.com/v4/'+l.account+'/'+l.id+'/reviews');url.searchParams.set('pageSize','50');url.searchParams.set('orderBy','updateTime desc');if(page)url.searchParams.set('pageToken',page);
 const b=await google(url.toString(),token);if(n===0){rating=b.averageRating||0;total=b.totalReviewCount||0;}
 for(const r of b.reviews||[]){if(!r.createTime)continue;const media=r.reviewMediaItems||[];reviews.push({id:r.reviewId,name:r.reviewer?.displayName||'Pengguna Google',rating:({ONE:1,TWO:2,THREE:3,FOUR:4,FIVE:5} as Record<string,number>)[r.starRating]||0,comment:r.comment||'',created:r.createTime,updated:r.updateTime,replied:!!r.reviewReply?.comment,reply:r.reviewReply?.comment||'',photos:media.filter((m:any)=>m.thumbnailUrl&&!m.videoUrl).length,videos:media.filter((m:any)=>m.videoUrl).length,url:r.reviewReplyUrl||''});}
 if(!b.nextPageToken){complete=true;break;}if(seen.has(b.nextPageToken))throw new Error('Paginasi review tidak lengkap. Coba lagi.');seen.add(b.nextPageToken);page=b.nextPageToken;
 }
 if(!complete)throw new Error('Review belum selesai diambil. Data lama tetap dipertahankan.');
 const unique=[...new Map(reviews.map(r=>[r.id,r])).values()];
 // A completed page sequence can differ from Google's reported total. Preserve
 // usable reviews, expose that discrepancy, and never label counts as complete.
 const coverage={fetched:unique.length,reported:total,matches:unique.length===total};
 const updated={...l,rating,total,reviews:unique,coverage,synced:new Date().toISOString()};
 await db().prepare('INSERT INTO snapshots(id,user,value,updated) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated=excluded.updated').bind(u+':'+id,u,await seal(updated),Date.now()).run();return updated;
}
export async function data(u:string){
 await db().prepare('DELETE FROM snapshots WHERE user=? AND updated<?').bind(u,Date.now()-30*86400000).run();
 const locations=await read<Location[]>(u,'locations')||[];const rows=await db().prepare('SELECT value FROM snapshots WHERE user=?').bind(u).all<{value:string}>();const snapshots=await Promise.all(rows.results.map(r=>open<Location>(r.value)));
 return locations.map(l=>snapshots.find(s=>s.id===l.id)||l);
}
