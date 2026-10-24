import {callback,user,ORIGIN} from '../../../server';
export async function GET(r:Request){try{await callback(await user(),new URL(r.url));return Response.redirect(ORIGIN+'/?google=connected',302);}catch(e){return Response.redirect(ORIGIN+'/?google=error&message='+encodeURIComponent(e instanceof Error?e.message:'Koneksi gagal.'),302);}}
