import sitesWorker from './sites-worker';
import { googleDashboardGate } from '../lib/google-dashboard-auth';

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: import('../lib/connector-contract.mjs').ConnectorBinding }>) {
    const result=await googleDashboardGate(request,env);
    if(result instanceof Response)return result;
    // run_worker_first protects every URL, but also makes the Worker responsible
    // for explicitly serving Vite's JS/CSS. Vinext only handles application routes.
    const path=new URL(result.url).pathname;
    if(env.ASSETS&&(result.method==='GET'||result.method==='HEAD')&&!path.startsWith('/api/')){
      const asset=await env.ASSETS.fetch(result);
      if(asset.status!==404){const headers=new Headers(asset.headers);headers.set('Cache-Control','private, no-store');return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers});}
    }
    const response=await sitesWorker.fetch(result,env,ctx);
    const headers=new Headers(response.headers);headers.set('Cache-Control','private, no-store');
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
};
