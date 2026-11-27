import type {Location} from './metrics';

type MapLocation = Pick<Location, 'title' | 'address' | 'maps' | 'mapPoint'>;

export function validMapPoint(point: unknown): point is NonNullable<Location['mapPoint']> {
  if (!point || typeof point !== 'object') return false;
  const {latitude, longitude} = point as {latitude?: unknown; longitude?: unknown};
  return typeof latitude === 'number' && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && typeof longitude === 'number' && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}

function googleProfileLink(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return undefined;
    if (url.hostname === 'maps.app.goo.gl' && url.pathname.length > 1) return url;
    if (['www.google.com', 'maps.google.com', 'google.com', 'goo.gl'].includes(url.hostname)
      && /^\/maps(?:\/|$)/.test(url.pathname)) return url;
  } catch {
    return undefined;
  }
}

export function locationMapLinks(location?: MapLocation) {
  const query = location ? [location.title, location.address].filter(Boolean).join(', ') : 'BaliEasy Bali';
  const point = location?.mapPoint;
  const mapQuery = validMapPoint(point) ? `${point.latitude},${point.longitude}` : query;
  const profile = googleProfileLink(location?.maps);
  const cid = profile?.searchParams.get('cid');
  const embed = new URL('https://maps.google.com/maps');
  embed.searchParams.set('output', 'embed');
  embed.searchParams.set('hl', 'id');
  embed.searchParams.set('z', location ? '16' : '11');
  if (cid && /^\d{1,20}$/.test(cid)) embed.searchParams.set('cid', cid);
  else embed.searchParams.set('q', mapQuery);

  const search = new URL('https://www.google.com/maps/search/');
  search.searchParams.set('api', '1');
  search.searchParams.set('query', mapQuery);
  return {embed: embed.href, external: profile?.href ?? search.href};
}
