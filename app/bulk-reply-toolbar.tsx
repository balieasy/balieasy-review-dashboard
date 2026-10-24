'use client';
import {useEffect,useRef,useState} from 'react';
import ListPagination,{usePagination} from './list-pagination';
import {CheckSquare,Send,X,Square,ShieldCheck} from 'lucide-react';
import type {SavedDraft} from './replies-server';
import {sendBulkDrafts} from './bulk-replies';
import {clientApi} from './client-api';
import {languageLabel} from './reply-languages';
import {duplicateReplyCount} from './reply-draft';

export default function BulkReplyToolbar({items,available,disabled,onSelectAll,onClear,onChanged,onRunning,onFinished}:{
 items:SavedDraft[];available:number;disabled:boolean;onSelectAll:()=>void;onClear:()=>void;
 onChanged:(draft:SavedDraft)=>void;onRunning:(running:boolean)=>void;onFinished:()=>Promise<void>;
}){
 const [plan,setPlan]=useState<SavedDraft[]>([]),[approved,setApproved]=useState(false),[running,setRunning]=useState(false),[stopping,setStopping]=useState(false),[completed,setCompleted]=useState(0),[summary,setSummary]=useState<Awaited<ReturnType<typeof sendBulkDrafts>>|null>(null),[error,setError]=useState('');
 const stop=useRef(false),active=useRef(false),mounted=useRef(true);
 const duplicates=duplicateReplyCount(plan);
 const previewPager=usePagination(plan,plan.map(d=>d.id+':'+d.version).join('|'));
 const failurePager=usePagination(summary?.results.filter(r=>!r.sent)||[]);
 const signature=items.map(d=>`${d.id}:${d.version}`).join('|');
 useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;stop.current=true;};},[]);
 useEffect(()=>{if(!active.current){setPlan([]);setApproved(false);}},[signature]);
 useEffect(()=>{if(!running)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return ()=>window.removeEventListener('beforeunload',warn);},[running]);
 async function send(){
  if(!approved||!plan.length||active.current||duplicates)return;
  const batch=plan.map(d=>({...d}));active.current=true;stop.current=false;setRunning(true);onRunning(true);setStopping(false);setCompleted(0);setSummary(null);setError('');
  try{const result=await sendBulkDrafts(batch,{api:clientApi,onDraft:d=>{if(mounted.current)onChanged(d);},onProgress:n=>{if(mounted.current)setCompleted(n);},shouldStop:()=>stop.current});if(mounted.current)setSummary(result);}
  catch(e){if(mounted.current)setError((e as Error).message);}
  finally{
   try{await onFinished();}catch{if(mounted.current)setError('Pengiriman selesai diproses, tetapi antrean belum dapat dimuat ulang. Klik Muat ulang antrean untuk memeriksa hasil.');}
   active.current=false;if(mounted.current){setRunning(false);onRunning(false);setPlan([]);setApproved(false);onClear();}
  }
 }
 return <section className="bulk-replies panel" aria-label="Pengiriman bulk balasan">
  <div className="bulk-toolbar"><div><strong>Kirim beberapa balasan sekaligus</strong><p>{items.length} draf dipilih · {available} draf tersimpan dapat dipilih dalam filter ini.</p></div><div className="bulk-actions"><button className="button" disabled={disabled||running||!available} onClick={onSelectAll}><CheckSquare size={14}/>Pilih semua hasil ({available})</button><button className="button" disabled={disabled||running||!items.length} onClick={onClear}><Square size={14}/>Batalkan pilihan</button><button className="button primary" disabled={disabled||running||!items.length} onClick={()=>{setPlan(items.map(d=>({...d})));setApproved(false);setSummary(null);setError('');}}><Send size={14}/>Tinjau & kirim {items.length||''} balasan</button></div></div>
  <p className="bulk-hint">Pilihan berlaku lintas halaman sesuai lokasi, status, dan pencarian. Simpan perubahan teks dahulu. Draf yang perlu cek status tidak ikut dikirim.</p>
  {plan.length>0&&<div className="bulk-review"><div className="bulk-review-heading"><h3>Periksa {plan.length} balasan yang akan dikirim</h3><button className="text-button" disabled={running} onClick={()=>{setPlan([]);setApproved(false);}} aria-label="Tutup pemeriksaan bulk"><X size={17}/></button></div><p>Periksa seluruh halaman pratinjau. Teks tersimpan di bawah ini akan menjadi balasan publik BaliEasy; persetujuan berlaku untuk seluruh balasan yang dipilih.</p><div className="bulk-preview-list">{previewPager.items.map((d,i)=><article key={d.id}><strong>{previewPager.start+i}. {d.review.name}</strong><span>{d.locationTitle} · {d.review.rating} bintang · {languageLabel(d.language)}</span><blockquote dir="auto">{d.review.comment||'Review bintang tanpa teks.'}</blockquote><p dir="auto" lang={d.language} className="bulk-preview-text">{d.text}</p></article>)}</div><ListPagination pager={previewPager} label="pratinjau bulk" disabled={running}/>{duplicates>0&&<div className="draft-message error" role="alert">{duplicates} balasan memiliki teks yang sama setelah nama dan tanda tangan diabaikan. Tutup tinjauan, lalu gunakan Variasikan draf atau edit teksnya sebelum mengirim.</div>}<label className="approval-check"><input type="checkbox" aria-label="Setujui seluruh balasan dalam pengiriman bulk" checked={approved} disabled={running} onChange={e=>setApproved(e.target.checked)}/><span>Saya sudah memeriksa seluruh {plan.length} teks balasan di atas dan setuju mempublikasikannya ke Google.</span></label><div className="bulk-actions"><button className="button primary" disabled={running||!approved||disabled||duplicates>0} onClick={send}><Send size={14}/>{running?'Sedang mengirim…':`Kirim ${plan.length} balasan ke Google`}</button>{running&&<button className="button" disabled={stopping} onClick={()=>{stop.current=true;setStopping(true);}}>Hentikan setelah balasan ini</button>}</div>{running&&<div className="bulk-progress" role="status"><progress value={completed} max={plan.length}/><span>{completed} dari {plan.length} selesai diproses{stopping?' · Menunggu balasan saat ini selesai':''}. Tetap buka halaman ini.</span></div>}</div>}
  {summary&&<div className="bulk-result" role="status"><strong>{summary.sent} diterima Google · {summary.failed} perlu perhatian · {summary.remaining} belum diproses</strong><p>Balasan yang gagal atau hasilnya belum pasti tidak dikirim ulang otomatis. Google dapat meninjau balasan sebelum tampil publik.</p>{summary.results.some(r=>!r.sent)&&<><ul>{failurePager.items.map(r=><li key={r.id}>{r.name} · {r.location}: {r.error}</li>)}</ul><ListPagination pager={failurePager} label="hasil perlu perhatian"/></>}</div>}
  {error&&<div className="draft-message error" role="alert">{error}</div>}
  {!plan.length&&!summary&&<div className="bulk-safe"><ShieldCheck size={13}/>Pilih draf, periksa teksnya, lalu beri persetujuan sebelum pengiriman.</div>}
 </section>;
}
