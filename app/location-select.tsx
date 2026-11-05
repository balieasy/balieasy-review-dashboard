'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronDown,MapPin,Search} from 'lucide-react';
import type {Location} from './metrics';

export default function LocationSelect({locations,value,disabled,onChange}:{locations:Location[];value:string;disabled:boolean;onChange:(value:string)=>void}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState('');
 const root=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement>(null),trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!open)return;input.current?.focus();const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[open]);
 const matches=locations.filter(l=>l.title.toLocaleLowerCase('id-ID').includes(query.trim().toLocaleLowerCase('id-ID')));
 const select=(id:string)=>{onChange(id);setOpen(false);setQuery('');trigger.current?.focus();};
 return <div className="location-picker" ref={root} onKeyDown={e=>{if(e.key==='Escape'&&open){e.preventDefault();setOpen(false);setQuery('');trigger.current?.focus();}}}>
  <button ref={trigger} type="button" className="location-trigger" aria-label="Pilih lokasi" aria-haspopup="dialog" aria-expanded={open} disabled={disabled} onClick={()=>{setOpen(!open);setQuery('');}}><MapPin size={15}/><span>{value==='all'?`Semua lokasi (${locations.length})`:locations.find(l=>l.id===value)?.title||'Pilih lokasi'}</span><ChevronDown size={14}/></button>
  {open&&<div className="location-menu" role="dialog" aria-label="Cari dan pilih lokasi"><label className="location-search"><Search size={15}/><input ref={input} aria-label="Cari lokasi" placeholder="Cari nama lokasi..." value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="location-options"><button type="button" className={value==='all'?'selected':''} onClick={()=>select('all')}>Semua lokasi ({locations.length})</button>{matches.map(l=><button type="button" className={value===l.id?'selected':''} key={l.id} onClick={()=>select(l.id)}>{l.title}</button>)}{matches.length===0&&<p>Tidak ada lokasi yang cocok.</p>}</div></div>}
 </div>;
}
