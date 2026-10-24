import {endpoint,json,user,sameOrigin,disconnect} from '../../../server';
export async function POST(r:Request){return endpoint(async()=>{sameOrigin(r);await disconnect(await user());return json({ok:true});});}
