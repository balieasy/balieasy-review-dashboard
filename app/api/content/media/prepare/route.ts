import {endpoint,json,user,sameOrigin} from '../../../../server';
import {prepareUpload} from '../../../../content-server';
export async function POST(r:Request){return endpoint(async()=>{sameOrigin(r);const u=await user(),text=await r.text();if(text.length>60000)throw new Error('Permintaan terlalu besar.');return json({record:await prepareUpload(u,JSON.parse(text))});});}
