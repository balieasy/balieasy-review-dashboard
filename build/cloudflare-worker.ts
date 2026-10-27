import sitesWorker from './sites-worker';
import { accessSettings, authenticatedAccessRequest } from '../lib/cloudflare-access';

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: import('../lib/connector-contract.mjs').ConnectorBinding }>) {
    try { accessSettings(env); }
    catch { return new Response('Dashboard BaliEasy belum dikonfigurasi. Administrator perlu mengaktifkan Cloudflare Access.',{status:503,headers:{'Cache-Control':'no-store'}}); }
    let authenticated: Request;
    try { authenticated = await authenticatedAccessRequest(request,env); }
    catch { return Response.json({error:'Silakan masuk melalui Cloudflare Access dengan akun BaliEasy yang diizinkan.'},{status:401,headers:{'Cache-Control':'no-store'}}); }
    const path = new URL(request.url).pathname;
    if (path==='/signin-with-chatgpt' && request.method==='GET') return new Response(null,{status:302,headers:{Location:'/', 'Cache-Control':'no-store'}});
    if (path==='/signout-with-chatgpt' && ['GET','POST'].includes(request.method)) return new Response(null,{status:302,headers:{Location:'/cdn-cgi/access/logout', 'Cache-Control':'no-store'}});
    return sitesWorker.fetch(authenticated,env,ctx);
  },
};
