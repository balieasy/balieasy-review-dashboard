// Standalone Cloudflare hosting has no trusted Sites identity headers.
// Verify Access's signature and claims before creating those internal headers.
export type AccessConfig = {
  DASHBOARD_ORIGIN?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  DASHBOARD_ALLOWED_EMAILS?: string;
};
type AccessClaims = { iss: string; aud: string | string[]; sub: string; email: string; exp: number; nbf?: number };
type SigningKey = JsonWebKey & { kid: string };
const signingKeys = new Map<string, { expires: number; keys: SigningKey[] }>();
const internalHeaders = [
  'oai-authenticated-user-id', 'oai-authenticated-user-email',
  'oai-authenticated-user-full-name', 'oai-authenticated-user-full-name-encoding',
];
function bytes(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid token encoding');
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4-value.length%4)%4)), c=>c.charCodeAt(0));
}
function decode(value: string) { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes(value))); }
export function accessSettings(config: AccessConfig) {
  const origin = new URL(config.DASHBOARD_ORIGIN || 'invalid:');
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.href !== origin.origin+'/') throw new Error('Dashboard origin is not configured');
  const team = config.ACCESS_TEAM_DOMAIN || '';
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.cloudflareaccess\.com$/.test(team)) throw new Error('Cloudflare Access team is not configured');
  const audience = config.ACCESS_AUD || '';
  if (!/^[a-fA-F0-9]{64}$/.test(audience)) throw new Error('Cloudflare Access audience is not configured');
  const emails = (config.DASHBOARD_ALLOWED_EMAILS || '').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
  if (!emails.length || emails.some(email=>! /^[^\s@,*]+@[^\s@,*]+\.[^\s@,*]+$/.test(email))) throw new Error('Allowed dashboard emails are not configured');
  return { origin: origin.origin, issuer: 'https://'+team, audience, emails };
}
export async function verifyAccessToken(token: string, config: AccessConfig, fetcher: typeof fetch = fetch, now = Date.now()) {
  const settings = accessSettings(config);
  if (!token || token.length > 16_384) throw new Error('Access login required');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid Access token');
  const header = decode(parts[0]);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid || header.kid.length>200 || header.crit !== undefined) throw new Error('Unsupported Access token');
  const claims = decode(parts[1]) as AccessClaims;
  if (claims.iss !== settings.issuer || !(Array.isArray(claims.aud)?claims.aud:[claims.aud]).includes(settings.audience)
    || typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) || claims.exp*1000<=now
    || claims.nbf!==undefined && (typeof claims.nbf!=='number'||!Number.isFinite(claims.nbf)||claims.nbf*1000>now)
    || typeof claims.sub!=='string' || !claims.sub || claims.sub.length>256
    || typeof claims.email!=='string' || !settings.emails.includes(claims.email.toLowerCase())) throw new Error('Access identity is not allowed');
  let cached = signingKeys.get(settings.issuer);
  if (!cached || cached.expires<=now) {
    const response = await fetcher(settings.issuer+'/cdn-cgi/access/certs', { redirect: 'manual', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Access signing keys are unavailable');
    const body = await response.json() as { keys?: SigningKey[] };
    if (!Array.isArray(body.keys)||body.keys.length>20) throw new Error('Invalid Access signing keys');
    cached = { expires: now+300_000, keys: body.keys.filter(key=>key.kty==='RSA'&&(!key.alg||key.alg==='RS256')&&(!key.use||key.use==='sig')) };
    if (signingKeys.size>=4) signingKeys.delete(signingKeys.keys().next().value!);
    signingKeys.set(settings.issuer,cached);
  }
  const jwk = cached.keys.find(key=>key.kid===header.kid);
  if (!jwk) throw new Error('Access signing key is not available');
  const key = await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]))) throw new Error('Invalid Access signature');
  return { userId:'cloudflare:'+claims.sub, email:claims.email.toLowerCase() };
}
export async function authenticatedAccessRequest(request: Request, config: AccessConfig, fetcher: typeof fetch = fetch) {
  const settings = accessSettings(config);
  if (new URL(request.url).origin!==settings.origin) throw new Error('Dashboard hostname is not allowed');
  const user = await verifyAccessToken(request.headers.get('Cf-Access-Jwt-Assertion')||'',config,fetcher);
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) if (name.startsWith('oai-authenticated-user-')) headers.delete(name);
  for (const name of internalHeaders) headers.delete(name);
  headers.set('oai-authenticated-user-id',user.userId);
  headers.set('oai-authenticated-user-email',user.email);
  return new Request(request,{headers});
}
