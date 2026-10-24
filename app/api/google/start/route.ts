import {endpoint,user,start} from '../../../server';
export async function GET(){return endpoint(async()=>Response.redirect(await start(await user()),302));}
