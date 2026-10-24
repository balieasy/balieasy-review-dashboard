import {endpoint,json,user} from '../../server';
import {listDrafts} from '../../replies-server';
export const dynamic='force-dynamic';
export async function GET(){return endpoint(async()=>json({drafts:await listDrafts(await user())}));}
