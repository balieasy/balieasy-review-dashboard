'use client';
import {useMemo,useState} from 'react';
import {ThumbsUp,MessageSquareWarning,ArrowUpRight} from 'lucide-react';
import {reviewInsights,type InsightReview} from './review-insights';
import {originalComment} from './reply-languages';
import {localDate} from './metrics';
import {formatDay,type DateRange} from './periods';
import ListPagination,{usePagination} from './list-pagination';
function InsightColumn({group,concern,scope,onOpen}:{group:ReturnType<typeof reviewInsights>['positive'];concern:boolean;scope:string;onOpen:(review:InsightReview)=>void}){
 const [themeId,setThemeId]=useState('all');
 const theme=group.themes.find(t=>t.id===themeId),rows=theme?theme.reviews:group.reviews;
 const pager=usePagination(rows,scope+':'+(theme?.id||'all'));
 const label=concern?'review perlu perhatian':'review positif';
 return <div className={'insight-column '+(concern?'concern':'praise')}><div className="insight-column-title">{concern?<MessageSquareWarning size={18}/>:<ThumbsUp size={18}/>}<h3>{concern?'Perlu perhatian / komplain':'Yang diapresiasi'}</h3><b>{group.count}</b></div><p className="insight-description">{concern?'Rating 1–3 atau indikasi keluhan dalam teks, termasuk review berbintang tinggi.':'Rating 4–5 tanpa indikasi keluhan yang terdeteksi.'} {group.withText} dengan teks.</p>
 {group.count?<><div className="insight-themes" aria-label={concern?'Tema keluhan':'Tema positif'}><button aria-pressed={!theme} className={!theme?'active':''} onClick={()=>setThemeId('all')}>Semua <b>{group.count}</b></button>{group.themes.map(t=><button key={t.id} aria-pressed={theme?.id===t.id} className={theme?.id===t.id?'active':''} onClick={()=>setThemeId(t.id)}>{t.label} <b>{t.reviews.length}</b></button>)}</div>{(theme||group.themes[0])&&<div className="insight-action"><strong>{concern?'Saran tindak lanjut':'Pertahankan'}</strong><p>{(theme||group.themes[0]).action}</p></div>}<details className="insight-sources"><summary>Lihat review sumber ({rows.length})</summary>{pager.items.map(r=><article key={r.locationId+':'+r.id}><div><b>{r.name}</b><span>{r.rating} ★ · {formatDay(localDate(r.created))}</span></div><small>{r.location}</small><blockquote dir="auto">{originalComment(r.comment)||'Review tanpa teks; pengelompokan hanya berdasarkan rating.'}</blockquote><button className="text-button" onClick={()=>onOpen(r)}>Buka review<ArrowUpRight size={12}/></button></article>)}<ListPagination pager={pager} label={label}/></details></>:<div className="insight-empty">{concern?'Belum terdeteksi rating rendah atau kata kunci keluhan pada periode ini. Tetap periksa review asli untuk konteks.':'Belum ada review yang masuk kelompok positif pada periode ini.'}</div>}</div>;
}
export default function ReviewInsightsPanel({reviews,range,onOpen}:{reviews:InsightReview[];range:DateRange;onOpen:(review:InsightReview)=>void}){
 const insight=useMemo(()=>reviewInsights(reviews,range),[reviews,range]);
 const scope=range.start+':'+range.end+':'+reviews.map(r=>r.locationId+':'+r.id).join('|');
 return <section className="panel customer-insights"><div className="panel-head"><div><h2>Suara pelanggan</h2><p>{range.label} · {insight.total} review · {insight.withText} dengan teks</p></div><span className="insight-method">Insight otomatis</span></div>{insight.total?<div className="insight-columns"><InsightColumn group={insight.positive} concern={false} scope={scope} onOpen={onOpen}/><InsightColumn group={insight.concern} concern scope={scope} onOpen={onOpen}/></div>:<div className="small-empty">Belum ada review pada lokasi dan periode yang dipilih.</div>}<p className="insight-disclaimer">Dikelompokkan berdasarkan rating dan kata kunci, bukan analisis AI. Bahasa, negasi, dan konteks dapat terlewat. Tema bisa tumpang tindih; klik tema untuk memeriksa review sumber. Review tanpa teks tidak dipakai untuk menyimpulkan topik keluhan.</p></section>;
}
