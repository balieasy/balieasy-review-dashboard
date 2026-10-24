'use client';
import {useEffect,useState} from 'react';
import {ChevronsLeft,ChevronsRight,ChevronLeft,ChevronRight} from 'lucide-react';
import {pageSizes,pageWindow,pageNumbers} from './pagination-model';
export function usePagination<T>(rows:T[],resetKey=''){
 const [requested,setPage]=useState(1),[size,setSize]=useState(10);
 useEffect(()=>setPage(1),[resetKey]);
 const window=pageWindow(rows.length,requested,size);
 useEffect(()=>{if(requested!==window.page)setPage(window.page);},[requested,window.page]);
 return {...window,items:rows.slice(window.start?window.start-1:0,window.end),setPage,setPageSize:(n:number)=>{setSize(n);setPage(1);}};
}
type Pager=ReturnType<typeof usePagination>;
export default function ListPagination({pager,label,disabled=false}:{pager:Pager;label:string;disabled?:boolean}){
 const {page,pages,pageSize,total,start,end,setPage,setPageSize}=pager;
 return <nav className="list-pagination" aria-label={'Pagination '+label}>
  <div className="pagination-summary"><span role="status">{start.toLocaleString('id-ID')}–{end.toLocaleString('id-ID')} dari {total.toLocaleString('id-ID')} {label}</span><label>Baris per halaman<select aria-label={'Baris per halaman — '+label} value={pageSize} disabled={disabled} onChange={e=>setPageSize(Number(e.target.value))}>{pageSizes.map(size=><option key={size} value={size}>{size}</option>)}</select></label></div>
  <div className="pagination-pages"><button title="Halaman pertama" aria-label={'Halaman pertama — '+label} disabled={disabled||page===1} onClick={()=>setPage(1)}><ChevronsLeft size={14}/></button><button title="Halaman sebelumnya" aria-label={'Halaman sebelumnya — '+label} disabled={disabled||page===1} onClick={()=>setPage(page-1)}><ChevronLeft size={14}/></button>{pageNumbers(page,pages).map((n,i)=>n==='…'?<span key={'gap'+i}>…</span>:<button key={n} aria-label={`Halaman ${n} — ${label}`} aria-current={page===n?'page':undefined} disabled={disabled} onClick={()=>setPage(n)}>{n}</button>)}<button title="Halaman berikutnya" aria-label={'Halaman berikutnya — '+label} disabled={disabled||page===pages} onClick={()=>setPage(page+1)}><ChevronRight size={14}/></button><button title="Halaman terakhir" aria-label={'Halaman terakhir — '+label} disabled={disabled||page===pages} onClick={()=>setPage(pages)}><ChevronsRight size={14}/></button></div>
 </nav>;
}
