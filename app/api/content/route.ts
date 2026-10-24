import {endpoint,json,user} from '../../server';
import {loadContent} from '../../content-server';
export async function GET(r:Request){return endpoint(async()=>json(await loadContent(await user(),new URL(r.url).searchParams.get('locationId')||'')));}
