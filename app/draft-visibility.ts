import type {Location} from './metrics';
import type {SavedDraft} from './replies-server';

export function unansweredDrafts(drafts:SavedDraft[],locations:Location[]){
 const replied=new Set(locations.flatMap(l=>l.reviews.filter(r=>r.replied).map(r=>JSON.stringify([l.id,r.id]))));
 return drafts.filter(d=>d.state!=='sent'&&!d.review.replied&&!replied.has(JSON.stringify([d.locationId,d.reviewId])));
}
