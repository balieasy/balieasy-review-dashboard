import { EncryptJWT, jwtDecrypt, jwtVerify, createLocalJWKSet, type JSONWebKeySet } from 'jose';

export type GoogleLoginEnv = {
  DASHBOARD_ORIGIN?: string;
  GOOGLE_LOGIN_CLIENT_ID?: string;
  GOOGLE_LOGIN_CLIENT_SECRET?: string;
  DASHBOARD_ALLOWED_EMAILS?: string;
  DATA_ENCRYPTION_KEY?: string;
};
const sessionCookie='__Host-balieasy-session', stateCookie='__Host-balieasy-login';
const sessionSeconds=8*60*60, stateSeconds=10*60;
const encoder=new TextEncoder();
let certificates: {until:number; keys:ReturnType<typeof createLocalJWKSet>}|undefined;
export function googleLoginSettings(env:GoogleLoginEnv) {
  const url=new URL(env.DASHBOARD_ORIGIN||'invalid:');
  if(url.protocol!=='https:'||url.username||url.password||url.href!==url.origin+'/')throw Error('Configure dashboard HTTPS origin.');
  const clientId=env.GOOGLE_LOGIN_CLIENT_ID||'';
  if(!/^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/.test(clientId))throw Error('Configure Google login client ID.');
  const emails=(env.DASHBOARD_ALLOWED_EMAILS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  if(!emails.length||emails.some(s=>! /^[^\s@,*]+@[^\s@,*]+\.[^\s@,*]+$/.test(s)))throw Error('Configure specific allowed emails.');
  return {origin:url.origin,clientId,emails,callback:url.origin+'/auth/google/callback'};
}
function encryptionKey(env:GoogleLoginEnv) {
  const key=Uint8Array.from(atob(env.DATA_ENCRYPTION_KEY||''),c=>c.charCodeAt(0));
  if(key.length!==32)throw Error('Configure a 256-bit encryption key.');
  return key;
}
const random=()=>btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const b64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
function cookie(request:Request,name:string) {
  const found=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(name+'='));
  return found.length===1?found[0].slice(name.length+1):'';
}
const cookieHeader=(name:string,value:string,seconds:number)=>`${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${seconds}`;
const noStore={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
function redirect(path:string,cookies:string[]=[]){const headers=new Headers({...noStore,Location:path});for(const value of cookies)headers.append('Set-Cookie',value);return new Response(null,{status:303,headers});}
function assertOrigin(request:Request,origin:string){if(request.headers.get('origin')!==origin)throw Error('Cross-origin request rejected.');}
async function encrypt(payload:Record<string,unknown>,env:GoogleLoginEnv,purpose:string,seconds:number,now=Date.now()) {
  const settings=googleLoginSettings(env);
  return new EncryptJWT(payload).setProtectedHeader({alg:'dir',enc:'A256GCM',typ:'balieasy-'+purpose+'+jwt'})
    .setIssuer(settings.origin).setAudience(purpose+':'+settings.clientId).setIssuedAt(Math.floor(now/1000))
    .setExpirationTime(Math.floor(now/1000)+seconds).encrypt(encryptionKey(env));
}
async function decrypt(value:string,env:GoogleLoginEnv,purpose:string,now=Date.now()) {
  if(!value||value.length>8192)throw Error('Session unavailable.');
  const settings=googleLoginSettings(env);
  return (await jwtDecrypt(value,encryptionKey(env),{issuer:settings.origin,audience:purpose+':'+settings.clientId,
    typ:'balieasy-'+purpose+'+jwt',keyManagementAlgorithms:['dir'],contentEncryptionAlgorithms:['A256GCM'],
    requiredClaims:['iat','exp'],maxTokenAge:purpose==='login'?stateSeconds:sessionSeconds,currentDate:new Date(now)})).payload;
}
export async function verifyGoogleIdentity(token:string,nonce:string,env:GoogleLoginEnv,fetcher:typeof fetch=fetch,now=Date.now()) {
  if(!token||token.length>16384)throw Error('Invalid Google identity.');
  const settings=googleLoginSettings(env);
  if(!certificates||certificates.until<=now){
    const response=await fetcher('https://www.googleapis.com/oauth2/v3/certs',{redirect:'manual',signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw Error('Google identity verification unavailable.');
    const keys=await response.json() as JSONWebKeySet;
    if(!Array.isArray(keys.keys)||!keys.keys.length||keys.keys.length>20)throw Error('Invalid Google signing keys.');
    certificates={until:now+300000,keys:createLocalJWKSet(keys)};
  }
  const {payload}=await jwtVerify(token,certificates.keys,{algorithms:['RS256'],issuer:['https://accounts.google.com','accounts.google.com'],
    audience:settings.clientId,requiredClaims:['sub','email','email_verified','nonce','iat','exp'],maxTokenAge:'10m',clockTolerance:5,currentDate:new Date(now)});
  if(payload.nonce!==nonce||typeof payload.sub!=='string'||!payload.sub||payload.sub.length>255||payload.email_verified!==true
    ||typeof payload.email!=='string'||!settings.emails.includes(payload.email.toLowerCase())
    ||payload.azp!==undefined&&payload.azp!==settings.clientId
    ||Array.isArray(payload.aud)&&payload.aud.length>1&&payload.azp!==settings.clientId)throw Error('This Google account is not allowed.');
  return {sub:payload.sub,email:payload.email.toLowerCase()};
}
export async function startGoogleLogin(env:GoogleLoginEnv,now=Date.now()) {
  const settings=googleLoginSettings(env),state=random(),verifier=random(),nonce=random();
  const challenge=b64(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(verifier))));
  const login=await encrypt({state,verifier,nonce},env,'login',stateSeconds,now);
  const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search=new URLSearchParams({client_id:settings.clientId,redirect_uri:settings.callback,response_type:'code',scope:'openid email',
    state,nonce,code_challenge:challenge,code_challenge_method:'S256',prompt:'select_account'}).toString();
  return redirect(url.href,[cookieHeader(stateCookie,login,stateSeconds)]);
}
export async function finishGoogleLogin(request:Request,env:GoogleLoginEnv,fetcher:typeof fetch=fetch,now=Date.now()) {
  const settings=googleLoginSettings(env),url=new URL(request.url);
  const state=await decrypt(cookie(request,stateCookie),env,'login',now);
  if(url.searchParams.getAll('state').length!==1||typeof state.state!=='string'||url.searchParams.get('state')!==state.state
    ||typeof state.verifier!=='string'||typeof state.nonce!=='string'||url.searchParams.has('error')
    ||url.searchParams.getAll('code').length!==1||!url.searchParams.get('code')||url.searchParams.get('code')!.length>4096)throw Error('Google sign-in was cancelled or expired.');
  const response=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(15000),
    body:new URLSearchParams({client_id:settings.clientId,client_secret:env.GOOGLE_LOGIN_CLIENT_SECRET||'',code:url.searchParams.get('code')!,
      redirect_uri:settings.callback,grant_type:'authorization_code',code_verifier:state.verifier})});
  if(!response.ok)throw Error('Google sign-in could not be completed.');
  const body=await response.json() as {id_token?:string};
  if(typeof body.id_token!=='string')throw Error('Google identity is missing.');
  const user=await verifyGoogleIdentity(body.id_token,state.nonce,env,fetcher,now);
  const session=await encrypt(user,env,'session',sessionSeconds,now);
  // Google's authorization code can be redeemed only once. Its nonce and PKCE
  // verifier are bound to this browser's short-lived encrypted HttpOnly cookie.
  return redirect('/',[cookieHeader(sessionCookie,session,sessionSeconds),cookieHeader(stateCookie,'',0)]);
}
export async function authenticatedGoogleRequest(request:Request,env:GoogleLoginEnv,now=Date.now()) {
  const settings=googleLoginSettings(env);
  if(new URL(request.url).origin!==settings.origin)throw Error('Wrong dashboard hostname.');
  const session=await decrypt(cookie(request,sessionCookie),env,'session',now);
  if(typeof session.sub!=='string'||!session.sub||typeof session.email!=='string'||!settings.emails.includes(session.email))throw Error('Session is no longer allowed.');
  const headers=new Headers(request.headers);
  for(const name of [...headers.keys()])if(name.startsWith('oai-authenticated-user-'))headers.delete(name);
  headers.set('oai-authenticated-user-id','google:'+session.sub);
  headers.set('oai-authenticated-user-email',session.email);
  return new Request(request,{headers});
}
function loginPage(failed:boolean,logout=false) {
  return new Response(`<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BaliEasy · Masuk</title><style>body{font:16px system-ui;background:#f6f7f9;color:#24282a;display:grid;place-items:center;min-height:100vh;margin:0}main{background:white;padding:40px;border:1px solid #e4e7eb;border-radius:18px;max-width:380px;margin:24px}h1{margin:0 0 12px}p{line-height:1.6;color:#657081}button{background:#fb6424;color:white;border:0;border-radius:9px;padding:14px 22px;font:inherit;cursor:pointer}a{color:#ad4319}</style><main><h1>BaliEasy.</h1><p>${logout?'Keluar dari dashboard di browser ini?':'Masuk untuk membuka dashboard privat BaliEasy. Gunakan akun Google yang sudah diizinkan.'}</p>${failed?'<p role="alert">Login belum berhasil. Periksa akun Google yang dipilih, lalu coba kembali.</p>':''}<form method="post" action="${logout?'/auth/logout':'/auth/start'}"><button>${logout?'Keluar':'Masuk dengan Google'}</button></form>${logout?'<p><a href="/">Kembali ke dashboard</a></p>':''}</main></html>`,{headers:{...noStore,'Referrer-Policy':'same-origin','Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https://accounts.google.com; frame-ancestors 'none'; base-uri 'none'"}});
}
export async function googleDashboardGate(request:Request,env:GoogleLoginEnv,fetcher:typeof fetch=fetch):Promise<Request|Response> {
  let settings:ReturnType<typeof googleLoginSettings>;
  try{settings=googleLoginSettings(env);encryptionKey(env);if(!env.GOOGLE_LOGIN_CLIENT_SECRET)throw Error('Missing client secret.');}
  catch{return new Response('Dashboard BaliEasy sedang disiapkan oleh administrator.',{status:503,headers:noStore});}
  const url=new URL(request.url),path=url.pathname;
  if(url.origin!==settings.origin)return new Response('Not found',{status:404,headers:noStore});
  const method=(allowed:string[])=>allowed.includes(request.method)?null:new Response('Method not allowed',{status:405,headers:{...noStore,Allow:allowed.join(', ')}});
  if(path==='/auth/login')return method(['GET'])||loginPage(url.searchParams.has('error'));
  if(path==='/auth/start'){
    const denied=method(['POST']);if(denied)return denied;
    try{assertOrigin(request,settings.origin);return await startGoogleLogin(env);}catch{return new Response('Permintaan login tidak diizinkan.',{status:403,headers:noStore});}
  }
  if(path==='/auth/google/callback'){
    const denied=method(['GET']);if(denied)return denied;
    try{return await finishGoogleLogin(request,env,fetcher);}catch{return redirect('/auth/login?error=1',[cookieHeader(stateCookie,'',0)]);}
  }
  if(path==='/auth/logout'||path==='/signout-with-chatgpt'){
    const denied=method(['GET','POST']);if(denied)return denied;
    if(request.method==='GET')return loginPage(false,true);
    try{assertOrigin(request,settings.origin);return redirect('/auth/login',[cookieHeader(sessionCookie,'',0),cookieHeader(stateCookie,'',0)]);}
    catch{return new Response('Permintaan keluar tidak diizinkan.',{status:403,headers:noStore});}
  }
  try{
    const authenticated=await authenticatedGoogleRequest(request,env);
    if(path==='/signin-with-chatgpt')return redirect('/');
    return authenticated;
  }catch{return path.startsWith('/api/')?Response.json({error:'Silakan masuk ke dashboard terlebih dahulu.'},{status:401,headers:noStore}):redirect('/auth/login');}
}
