import {endpoint,json,user,read,googleConfig,managedGoogleConfig,autoSyncEnabled,Token,bulkFileScope,REDIRECT,ORIGIN} from '../../server';
export const dynamic='force-dynamic';
export async function GET(){return endpoint(async()=>{const u=await user(),config=await googleConfig(u),token=await read<Token>(u,'token');return json({fileScope:await bulkFileScope(u),configured:!!config,managed:managedGoogleConfig,autoSync:autoSyncEnabled,connected:!!token,clientId:config?.clientId||'',redirect:REDIRECT,origin:ORIGIN});});}
