// Workers supports manual/follow redirects. Reject redirects explicitly so OAuth
// credentials and bearer tokens are never forwarded to a different endpoint.
export async function googleFetch(url:string, init:RequestInit={}){
 const response=await fetch(url,{...init,redirect:'manual'});
 if(response.status>=300&&response.status<400){
  throw new Error('Google mengembalikan pengalihan yang tidak diharapkan. Coba hubungkan akun lagi.');
 }
 return response;
}
