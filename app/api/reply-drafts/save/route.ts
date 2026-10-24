import {endpoint,json,user,sameOrigin} from '../../../server';
import {saveDraft} from '../../../replies-server';
export async function POST(r:Request){return endpoint(async()=>{sameOrigin(r);const u=await user(),body=await r.text();if(body.length>40000)throw new Error('Draf terlalu besar.');return json({draft:await saveDraft(u,JSON.parse(body))});});}
