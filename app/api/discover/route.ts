import {endpoint,json,user,sameOrigin,discover} from '../../server';
export async function POST(r:Request){return endpoint(async()=>{sameOrigin(r);return json({locations:await discover(await user())});});}
