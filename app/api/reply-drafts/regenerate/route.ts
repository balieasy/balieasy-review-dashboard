import {endpoint,json,user,sameOrigin} from '../../../server';
import {regenerateDraft} from '../../../replies-server';
export async function POST(r:Request){return endpoint(async()=>{sameOrigin(r);const u=await user();return json({draft:await regenerateDraft(u,await r.json())});});}
