// Keep actionable API messages, never raw response bodies or credentials.
function safe(value:unknown,max=300){return typeof value==='string'?value.replace(/Bearer\s+\S+|ya29\.[\w.-]+|AIza[\w-]+/gi,'[disamarkan]').replace(/\b(access_token|refresh_token|client_secret|authorization)\s*[:=]\s*["']?[^\s,"'&]+/gi,'$1=[disamarkan]').replace(/https?:\/\/\S+/g,'[tautan]').replace(/[\u0000-\u001f]/g,' ').slice(0,max):'';}
export class GoogleApiError extends Error{
 constructor(public status:number,stage:string,detail=''){
  const hint=status===403?' Periksa izin akun, lokasi terverifikasi, dan aktivasi Google My Business API.':status===401?' Hubungkan ulang akun Google.':'';
  super(`Google mengembalikan error ${status}${stage?' saat '+stage:''}${detail?': '+detail:'.'}${hint}`);
 }
}
export async function googleApiError(response:Response,stage:string){
 let detail='';
 try{const text=(await response.text()).slice(0,16000);const body=JSON.parse(text),error=body?.error;
  if(error&&typeof error==='object'){
   const status=/^[A-Z_]{1,60}$/.test(error.status)?error.status:'';
   const violations=Array.isArray(error.details)?error.details.flatMap((d:any)=>Array.isArray(d?.fieldViolations)?d.fieldViolations:Array.isArray(d?.errorDetails)?d.errorDetails:d?.reason?[{message:d.reason}]:[]).slice(0,3).map((v:any)=>[safe(v.field,100),safe(v.description||v.message,250)].filter(Boolean).join(': ')):[];
   detail=[status,safe(error.message),...violations].filter(Boolean).join(' · ').slice(0,750);
  }
 }catch{/* Non-JSON response: don't echo HTML, proxy data, or credentials. */}
 return new GoogleApiError(response.status,stage,detail);
}
