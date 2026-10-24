import {endpoint,json,user,sameOrigin} from '../../../../server';
import {uploadMedia} from '../../../../content-server';
export async function POST(r:Request){return endpoint(async()=>{sameOrigin(r);return json({record:await uploadMedia(await user(),new URL(r.url).searchParams.get('id')||'',r,new URL(r.url).searchParams.has('version')?Number(new URL(r.url).searchParams.get('version')):undefined)});});}
