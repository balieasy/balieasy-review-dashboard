import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import './sites-env.mjs';

const action=process.argv[2];
if (!['build','check','migrate','deploy'].includes(action)) throw new Error('Use cloudflare.mjs build, check, migrate, or deploy.');
const source=JSON.parse(readFileSync(new URL('../wrangler.cloudflare.jsonc',import.meta.url),'utf8'));
if (action!=='build') {
  const compiled=JSON.parse(readFileSync(new URL('../dist/server/wrangler.json',import.meta.url),'utf8'));
  if (compiled.name!=='balieasy-review-dashboard') throw new Error('Run npm run build:cloudflare first.');
  if (JSON.stringify(compiled.vars)!==JSON.stringify(source.vars)) throw new Error('Configuration changed. Run npm run build:cloudflare again.');
  const database=compiled.d1_databases?.find(item=>item.binding==='DB');
  if (!database || !/^[a-f0-9-]{36}$/.test(database.database_id) || database.database_id==='00000000-0000-4000-8000-000000000000') throw new Error('Set the real Cloudflare D1 database ID before deploying.');
  const {build}=await import('esbuild');
  await build({entryPoints:['lib/cloudflare-access.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/tests/cloudflare-access-check.mjs'});
  const {accessSettings}=await import('../.sites-runtime/tests/cloudflare-access-check.mjs');
  accessSettings(compiled.vars);
  if (database.database_id!==source.d1_databases[0]?.database_id) throw new Error('Database configuration changed. Rebuild before deploying.');
  console.log('Cloudflare production configuration is ready.');
}
if (action==='check') process.exit(0);
const command=action==='build'
  ? [fileURLToPath(new URL('./run-framework.mjs',import.meta.url)),'build']
  : [fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url)),...(action==='migrate'?['d1','migrations','apply','DB','--remote','--config','wrangler.cloudflare.jsonc']:['deploy','--config','dist/server/wrangler.json'])];
const result=spawnSync(process.execPath,command,{stdio:'inherit',env:{...process.env,BALIEASY_DEPLOY_TARGET:'cloudflare'}});
if (result.error) throw result.error;
process.exit(result.status??1);
