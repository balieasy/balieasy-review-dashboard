import sitesWorker from './sites-worker';
import { googleDashboardGate } from '../lib/google-dashboard-auth';

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: import('../lib/connector-contract.mjs').ConnectorBinding }>) {
    const result=await googleDashboardGate(request,env);
    if(result instanceof Response)return result;
    return sitesWorker.fetch(result,env,ctx);
  },
};
