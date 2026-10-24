import {endpoint,json,user} from '../../../server';
import {contentPerformanceData} from '../../../content-server';
export async function GET(r:Request){return endpoint(async()=>json(await contentPerformanceData(await user(),new URL(r.url).searchParams.get('locationId')||'all')));}
