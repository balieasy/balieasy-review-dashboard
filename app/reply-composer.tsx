'use client';
import {useState} from 'react';
import {MessageSquareText} from 'lucide-react';
import type {Review} from './metrics';
import {clientApi} from './client-api';
export default function ReplyComposer({review,locationId,demo,onQueue}:{review:Review;locationId:string;demo:boolean;onQueue:(id:string)=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function prepare(){setBusy(true);setError('');try{const b=await clientApi('reply-drafts/prepare',{locationId,reviewId:review.id});onQueue(b.draft.id);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <div className="reply-assistant"><button className="text-button draft-trigger" disabled={busy||demo} onClick={prepare}><MessageSquareText size={14}/>{busy?'Menyiapkan…':'Periksa draf & kirim dari dashboard'}</button>{error&&<p className="draft-error">{error}</p>}</div>;
}
