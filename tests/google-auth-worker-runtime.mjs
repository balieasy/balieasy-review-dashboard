// Run after google-dashboard-auth.mjs creates the isolated test worker bundle.
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {EncryptJWT} from 'jose';

const origin='https://dashboard.example.workers.dev';
const key=crypto.getRandomValues(new Uint8Array(32));
const client='test.apps.googleusercontent.com';
const mf=new Miniflare({modules:true,scriptPath:'.sites-runtime/tests/google-worker-test.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],port:0,inspectorPort:0,bindings:{DASHBOARD_ORIGIN:origin,GOOGLE_LOGIN_CLIENT_ID:client,GOOGLE_LOGIN_CLIENT_SECRET:'synthetic-test-only',DASHBOARD_ALLOWED_EMAILS:'owner@example.com',DATA_ENCRYPTION_KEY:Buffer.from(key).toString('base64')}});
try {
  const page=await mf.dispatchFetch(origin+'/auth/login');
  assert.equal(page.status,200);assert.match(await page.text(),/Masuk dengan Google/);
  assert.equal((await mf.dispatchFetch(origin+'/api/data')).status,401);
  assert.equal((await mf.dispatchFetch(origin+'/auth/start',{method:'POST',headers:{origin:'https://attacker.invalid'}})).status,403);
  const start=await mf.dispatchFetch(origin+'/auth/start',{method:'POST',redirect:'manual',headers:{origin}});
  assert.equal(start.status,303);assert.match(start.headers.get('set-cookie'),/__Host-balieasy-login=.*HttpOnly/);
  const token=await new EncryptJWT({sub:'worker-owner',email:'owner@example.com'}).setProtectedHeader({alg:'dir',enc:'A256GCM',typ:'balieasy-session+jwt'}).setIssuer(origin).setAudience('session:'+client).setIssuedAt().setExpirationTime('8h').encrypt(key);
  const status=await mf.dispatchFetch(origin+'/api/status',{headers:{cookie:'__Host-balieasy-session='+token,'oai-authenticated-user-injected':'forged'}});
  assert.deepEqual(await status.json(),{id:'google:worker-owner',email:'owner@example.com',forged:null});
  assert.equal((await mf.dispatchFetch('https://other.invalid/api/data',{headers:{cookie:'__Host-balieasy-session='+token}})).status,404);
  console.log('PASS workerd: login page, unauthenticated API, CSRF, PKCE cookie encryption, session decryption, identity replacement, hostname isolation. Synthetic credentials only.');
} finally {await mf.dispose();}
