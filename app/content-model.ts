export type BusinessMedia={name:string;mediaFormat:'PHOTO'|'VIDEO';description?:string;sourceUrl?:string;googleUrl?:string;thumbnailUrl?:string;createTime?:string;locationAssociation?:{category?:string};dimensions?:{widthPixels?:number;heightPixels?:number};attribution?:unknown;version:string;sha256?:string};
export type BusinessPost={name:string;summary?:string;languageCode?:string;topicType?:string;state?:string;createTime?:string;updateTime?:string;searchUrl?:string;media?:{mediaFormat?:string;sourceUrl?:string;googleUrl?:string}[];callToAction?:{actionType:string;url?:string};version:string};
export type UploadMetadata={locationId:string;filename:string;mime:string;size:number;width:number;height:number;duration:number;sha256:string;category:string;description:string};
export type PostInput={locationId:string;name?:string;sourceVersion?:string;summary:string;languageCode:string;photoUrl:string;actionType:string;actionUrl:string;topicType?:string};
export const mediaCategories=[['ADDITIONAL','Foto / video tambahan'],['EXTERIOR','Eksterior'],['INTERIOR','Interior'],['PRODUCT','Produk'],['AT_WORK','Aktivitas tim'],['COMMON_AREA','Area bersama']] as const;
export function publicHttps(value:unknown,optional=false){
 if(optional&&!value)return '';
 if(typeof value!=='string'||value.length>2048)throw new Error('URL HTTPS publik tidak valid.');
 let url:URL;try{url=new URL(value);}catch{throw new Error('Masukkan URL HTTPS lengkap.');}
 const host=url.hostname.toLowerCase();
 if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||!host.includes('.')||/^[\d.]+$/.test(host)||host.includes(':')||/(^|\.)(localhost|local|internal|test|invalid)$/.test(host))throw new Error('Gunakan URL HTTPS publik, tanpa kredensial atau alamat lokal.');
 url.hash='';return url.href;
}
export function googleMediaUrl(value?:string){try{const u=new URL(value||'');return u.protocol==='https:'&&['google.com','googleusercontent.com','ggpht.com','gstatic.com'].some(h=>u.hostname===h||u.hostname.endsWith('.'+h))?u.href:undefined;}catch{return undefined;}}
export function validateUpload(input:any):UploadMetadata{
 if(!input||typeof input.filename!=='string'||!input.filename.trim()||input.filename.length>200)throw new Error('Nama file tidak valid.');
 const photo=['image/jpeg','image/png'].includes(input.mime),video=input.mime==='video/mp4';
 if(!photo&&!video)throw new Error('Pilih JPG, PNG, atau video MP4.');
 if(!Number.isSafeInteger(input.size)||input.size<(photo?10240:1)||input.size>(photo?5:75)*1024*1024)throw new Error(photo?'Foto harus 10 KB–5 MB.':'Video maksimal 75 MB.');
 if(!Number.isFinite(input.width)||!Number.isFinite(input.height)||Math.min(input.width,input.height)<(photo?250:720)||Math.max(input.width,input.height)>30000||video&&Math.max(input.width,input.height)<1280)throw new Error(photo?'Foto minimal 250 × 250 piksel.':'Video minimal 720p (sisi pendek 720, sisi panjang 1.280 piksel).');
 if(video&&(!Number.isFinite(input.duration)||input.duration<=0||input.duration>30))throw new Error('Durasi video maksimal 30 detik.');
 if(!/^[a-f0-9]{64}$/.test(input.sha256)||!mediaCategories.some(([value])=>value===input.category)||video&&input.category!=='ADDITIONAL')throw new Error('Metadata upload tidak valid.');
 const description=typeof input.description==='string'?input.description.trim():'';if(description.length>1000)throw new Error('Deskripsi media maksimal 1.000 karakter.');
 return {locationId:input.locationId,filename:input.filename.trim(),mime:input.mime,size:input.size,width:input.width,height:input.height,duration:video?input.duration:0,sha256:input.sha256,category:input.category,description};
}
export function validatePost(input:any):PostInput{
 const summary=typeof input?.summary==='string'?input.summary.trim():'';
 if(!summary||Array.from(summary).length>1500)throw new Error('Teks postingan harus 1–1.500 karakter.');
 if(!/^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(input.languageCode||''))throw new Error('Kode bahasa postingan tidak valid.');
 const actionType=input.actionType||'';if(!['','LEARN_MORE','BOOK','ORDER','SHOP','SIGN_UP','CALL'].includes(actionType))throw new Error('Tombol postingan tidak valid.');
 return {locationId:input.locationId,name:input.name||undefined,sourceVersion:input.sourceVersion||undefined,summary,languageCode:input.languageCode,photoUrl:publicHttps(input.photoUrl,true),actionType,actionUrl:actionType&&actionType!=='CALL'?publicHttps(input.actionUrl):'',topicType:input.topicType||'STANDARD'};
}
export function editableMedia(item:BusinessMedia){return !item.attribution&&!['PROFILE','LOGO','COVER'].includes(item.locationAssociation?.category||'');}
export function duplicateCandidates(items:BusinessMedia[]){
 const rows=items.filter(editableMedia),parent=rows.map((_,i)=>i),reasons=new Map<string,string>();
 const root=(i:number):number=>{let r=i;while(parent[r]!==r)r=parent[r];while(parent[i]!==i){const next=parent[i];parent[i]=r;i=next;}return r;};
 const join=(a:number,b:number)=>{parent[root(b)]=root(a);};
 for(const kind of ['hash','url']){
  const groups=new Map<string,number[]>();rows.forEach((m,i)=>{let value='';if(kind==='hash')value=m.sha256||'';else try{value=publicHttps(m.sourceUrl,true);}catch{}if(value){const key=m.mediaFormat+':'+value;const group=groups.get(key)||[];group.push(i);groups.set(key,group);}});
  for(const ids of groups.values()){if(ids.length<2||kind==='url'&&new Set(ids.map(i=>rows[i].sha256).filter(Boolean)).size>1)continue;for(const i of ids.slice(1))join(ids[0],i);for(const i of ids)reasons.set(i+':'+kind,kind==='hash'?'Hash file identik':'URL sumber sama');}
 }
 const grouped=new Map<number,number[]>();rows.forEach((_,i)=>{const r=root(i),group=grouped.get(r)||[];group.push(i);grouped.set(r,group);});
 return [...grouped.values()].filter(ids=>ids.length>1).map(ids=>({id:rows[ids[0]].name,items:ids.map(i=>rows[i]),reasons:[...new Set(ids.flatMap(i=>['hash','url'].map(k=>reasons.get(i+':'+k)).filter((v):v is string=>!!v)))]}));
}
