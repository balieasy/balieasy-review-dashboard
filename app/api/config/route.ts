import {endpoint,json,user,sameOrigin,saveConfig} from '../../server';
export async function POST(r:Request){return endpoint(async()=>{sameOrigin(r);const u=await user();const body=await r.text();if(body.length>32000)throw new Error('File JSON terlalu besar.');await saveConfig(u,JSON.parse(body));return json({ok:true});});}
