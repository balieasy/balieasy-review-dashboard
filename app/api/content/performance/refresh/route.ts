import {endpoint,json,user,sameOrigin} from '../../../../server';
import {refreshContentPerformance} from '../../../../content-server';
export async function POST(r:Request){return endpoint(async()=>{sameOrigin(r);const text=await r.text();if(text.length>10000)throw new Error('Permintaan terlalu besar.');const input=JSON.parse(text);return json(await refreshContentPerformance(await user(),input.locationId));});}
