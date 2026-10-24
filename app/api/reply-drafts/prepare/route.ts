import {endpoint,json,user,sameOrigin} from '../../../server';
import {prepareAllDrafts,prepareDraft,refreshNaturalDrafts} from '../../../replies-server';
export async function POST(r:Request){return endpoint(async()=>{sameOrigin(r);const u=await user(),b=await r.json() as any;if(b.refreshNatural===true)return json(await refreshNaturalDrafts(u));if(b.all===true)return json(await prepareAllDrafts(u));if(typeof b.locationId!=='string'||typeof b.reviewId!=='string')throw new Error('Lokasi dan review diperlukan.');return json({draft:await prepareDraft(u,b.locationId,b.reviewId)});});}
