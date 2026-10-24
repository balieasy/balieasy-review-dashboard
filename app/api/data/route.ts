import {endpoint,json,user,data} from '../../server';
export const dynamic='force-dynamic';
export async function GET(){return endpoint(async()=>json({locations:await data(await user())}));}
