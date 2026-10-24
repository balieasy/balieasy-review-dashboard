import {endpoint,json,user,sameOrigin} from '../../../server';
import {reconcileDraft} from '../../../replies-server';
export async function POST(r:Request){return endpoint(async()=>{sameOrigin(r);const u=await user(),b=await r.json() as any;return json({draft:await reconcileDraft(u,b.id)});});}
