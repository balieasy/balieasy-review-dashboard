import {endpoint,json,user,sameOrigin,syncLocation} from '../../server';
export async function POST(r:Request){return endpoint(async()=>{sameOrigin(r);const u=await user();const {id}=await r.json() as {id:string};return json({location:await syncLocation(u,id)});});}
