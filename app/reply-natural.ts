import type {Review} from './metrics';
import {originalComment,type Language} from './reply-languages';
import {replyTranslations} from './reply-translations';
import {naturalCopy} from './reply-natural-copy';
import {analyzeReview,detailLabels,type Detail} from './reply-review-context';
import {contextCopy} from './reply-context-copy';
export type Tone='warm'|'professional'|'short';
export const REPLY_GENERATOR_VERSION=3;
type Input=Pick<Review,'name'|'rating'|'comment'>&Partial<Pick<Review,'id'>>;
const base={
 en:{hello:'Hi',thanks:'Thank you for sharing your experience with BaliEasy.',rating:'Thank you for rating BaliEasy.',positive:'It is good to know you had a positive experience with our team.',negative:'We are sorry your experience fell short of expectations. Please contact the BaliEasy team directly so we can understand your concerns and follow up.',feedback:'Your feedback helps us see where we can improve.',shortNegative:'We are sorry to hear this. Please contact our team directly so we can understand what happened.',sign:'Kind regards,',team:'The BaliEasy team'},
 id:{hello:'Halo',thanks:'Terima kasih sudah berbagi pengalaman bersama BaliEasy.',rating:'Terima kasih atas penilaian untuk BaliEasy.',positive:'Kami senang Anda mendapat pengalaman yang baik bersama tim kami.',negative:'Mohon maaf pengalaman Anda belum sesuai harapan. Silakan hubungi tim BaliEasy secara langsung agar kami bisa memahami kendala dan menindaklanjutinya.',feedback:'Masukan Anda membantu kami melihat hal yang perlu diperbaiki.',shortNegative:'Mohon maaf atas pengalaman ini. Silakan hubungi tim kami agar kendalanya bisa kami pahami lebih lanjut.',sign:'Salam,',team:'Tim BaliEasy'},
};
function seedOf(s:string){let n=2166136261;for(const c of s)n=Math.imul(n^c.codePointAt(0)!,16777619);return n>>>0;}
function firstName(name:string){const first=name.trim().split(/\s+/)[0]||'';return first!=='Pengguna'&&/^[\p{L}\p{M}][\p{L}\p{M}'’\-]{0,30}$/u.test(first)?first:'';}
function staffName(text:string){
 const direct=[/\b([A-Z][a-zA-Z'’-]{1,24})\s+(?:is|was)\s+(?:the\s+)?(?:goat|best|legend|amazing|great|awesome|brilliant)\b/g,/\b(?:[Hh]elped|[Aa]ssisted|[Ss]erved)\s+(?:(?:very|well|kindly|really|so|patiently)\s+){0,4}by\s+([A-Z][a-zA-Z'’-]{1,24})\b/g];
 const patterns=[/\b(?:Thanks?|Thank you)\s+(?:to\s+)?([A-Z][a-zA-Z'’-]{1,24})\b/g,/\b([A-Z][a-zA-Z'’-]{1,24})\s+(?:(?:patiently|clearly)\s+)?(?:explained|helped|assisted|was (?:so |very )?(?:patient|helpful|amazing|kind))/g,/\b(?:Terima kasih|Makasih)\s+(?:untuk |kepada )?([A-Z][a-zA-Z'’-]{1,24})\b/g];
 const blocked=/^(Bali|BaliEasy|Telkomsel|The|It|He|She|They|Everything|Nothing|Great|Quick|Fast|Good|Excellent|Helpful|Thank|You|Your|For|All|Team|Staff|Service|Everyone|Saya|Tim|Pelayanan)$/i;
 for(const pattern of [...direct,...patterns]){for(const match of text.matchAll(pattern))if(!blocked.test(match[1]))return match[1];}return '';
}
export function replyContext(review:Input){
 const analysis=analyzeReview(review.comment,review.rating);
 return {...analysis,topics:analysis.details,staff:analysis.negative?'':staffName(analysis.original)};
}
export function replyGuidance(review:Input){const c=replyContext(review);return !c.hasText?'Review hanya berisi bintang; jangan menambahkan pengalaman atau layanan yang tidak disebutkan.':c.issues.length?'Tanggapi kendala: '+c.issues.map(t=>detailLabels[t]).join(', ')+'. Periksa fakta sebelum mengirim; jangan menjanjikan penyelesaian.':c.details.length?'Poin yang disebut pelanggan: '+c.details.map(t=>detailLabels[t]).join(', ')+'.':c.needsReview?'Konteks belum dikenali dengan cukup yakin. Baca isi review dan sesuaikan draf secara manual.':'Review singkat tanpa rincian layanan; balasan dibuat ringkas tanpa mengarang pengalaman.';}
// Ignore greetings and signatures so changing a name alone doesn't count as a distinct reply.
export function replyCore(text:string){const blocks=text.trim().split(/\n\s*\n/);if(blocks.length>1&&blocks[0].length<100&&(/^(Hi|Hello|Halo|Здравствуйте|Вітаємо|Hallo|Bonjour|Hola|Buongiorno|Olá|Dzień dobry|Merhaba|Xin chào|مرحبًا)[^\n]*[,،]$/iu.test(blocks[0])||/^您好.*！$|^[^\n]*こんにちは。$|^[^\n]*안녕하세요\.$|^สวัสดี[^\n]{0,45}$/u.test(blocks[0])))blocks.shift();if(blocks.length>1&&/BaliEasy/i.test(blocks.at(-1)!))blocks.pop();return blocks.join(' ').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();}
export function duplicateReplyCount(items:{text:string}[]){const seen=new Set<string>();let duplicates=0;for(const d of items){const key=replyCore(d.text);if(seen.has(key))duplicates++;seen.add(key);}return duplicates;}
export function replyDraft(review:Input,language:Language,tone:Tone,options:{variant?:number;avoid?:Iterable<string>}={}){
 const c=language==='en'||language==='id'?base[language]:replyTranslations[language],v=naturalCopy[language],context=replyContext(review),name=firstName(review.name);
 const greeting=language==='ja'?(name?`${name}様、こんにちは。`:'こんにちは。'):language==='ko'?(name?`${name}님, 안녕하세요.`:'안녕하세요.'):language==='zh'?`您好${name?'，'+name:''}！`:language==='th'?`${c.hello}${name?'คุณ '+name:''}`:`${language==='en'&&tone==='professional'?'Hello':c.hello}${name?' '+name:''}${language==='ar'?'،':','}`;
 const complaintOpenings=language==='en'?['Thank you for telling us what happened.','Thanks for bringing this to our attention.','Thank you for being candid about your experience.']:language==='id'?['Terima kasih sudah menceritakan kendalanya.','Terima kasih sudah menyampaikan hal ini kepada kami.','Terima kasih sudah memberi masukan dengan terus terang.']:[c.thanks,...v.open];
 const openings=context.hasText?(context.negative?complaintOpenings:[c.thanks,...v.open]):[c.rating,...v.open,c.thanks,c.feedback,context.negative?c.shortNegative:c.positive];
 const generic=[c.positive,v.close[0],v.close[1],v.close[3]];
 const copy=contextCopy[language],seed=seedOf([review.id,review.name,review.comment,language,options.variant||0].join('|'));
 const detailLine=(topic:Detail,variant:number,negative=false)=>{
  if(negative&&topic==='waiting'&&context.waitDuration&&(language==='en'||language==='id')){
   const duration=context.waitDuration.replace(/minutes?|mins?|menit/i,language==='id'?'menit':'minutes').replace(/hours?|jam/i,language==='id'?'jam':'hours');
   return language==='id'?`Mohon maaf Anda harus menunggu ${duration}.`:`Sorry you had to wait ${duration}.`;
  }
  const lines=(negative?copy?.negative:copy?.positive)?.[topic];
  if(lines?.length)return lines[(seed+variant)%lines.length];
  if(!negative&&['esim','topup','visa','fast','helpful','recommend'].includes(topic))return v[topic as 'esim'|'topup'|'visa'|'fast'|'helpful'|'recommend'];
  return '';
 };
 const details=context.topics.filter(t=>!context.staff||t!=='helpful').map(t=>detailLine(t,0)).filter(Boolean);
 if(context.staff)details.unshift(v.staff.replace('{name}',context.staff));
 const primary=details[0];
 const relevantIssues=context.issues.filter(t=>detailLine(t,0,true)).slice(0,3);
 const issueNames:Partial<Record<Detail,string>>=language==='en'?{activation:'activation',connection:'the internet connection',price:'the pricing',waiting:'the wait',communication:'communication',explanation:'the explanation',delivery:'delivery',helpful:'the support from our team',visa:'the visa process',topup:'the top-up',esim:'the SIM service'}:{activation:'aktivasi',connection:'koneksi internet',price:'harga',waiting:'waktu tunggu',communication:'komunikasi',explanation:'penjelasan',delivery:'pengiriman',helpful:'pelayanan tim',visa:'proses visa',topup:'isi ulang',esim:'layanan SIM'};
 const joinedIssues=relevantIssues.map(t=>issueNames[t]).filter(Boolean).join(language==='en'?' and ':' dan ');
 const negativeBodies=relevantIssues.length?Array.from({length:3},(_,i)=>relevantIssues.length>1&&(language==='en'||language==='id')&&!context.waitDuration?(language==='en'?['We are sorry about the difficulties with ','Sorry your experience was let down by ','Thank you for raising your concerns about '][i]:['Mohon maaf ada kendala pada ','Maaf pengalaman Anda terganggu oleh ','Terima kasih sudah menyampaikan keberatan tentang '][i])+joinedIssues+'.':relevantIssues.map(t=>detailLine(t,i,true)).join(' ')):[c.negative,c.shortNegative];
 const setupAndExplanation=context.topics.includes('activation')&&context.topics.includes('explanation');
 const combinedSetup=setupAndExplanation&&language==='en'?[`Glad ${context.staff||'the team'} could help with the setup and explain the steps clearly.`,`Good to hear ${context.staff||'the team'} made the setup easier to follow.`,`Thanks for mentioning how ${context.staff||'the team'} helped you get set up and understand the steps.`]:setupAndExplanation&&language==='id'?[`Senang ${context.staff||'tim kami'} bisa membantu pemasangan dan menjelaskan langkahnya dengan jelas.`,`Syukurlah penjelasan ${context.staff||'tim kami'} membuat proses pemasangannya mudah diikuti.`,`Terima kasih sudah berbagi bagaimana ${context.staff||'tim kami'} membantu pemasangan dan menjelaskan langkah-langkahnya.`]:null;
 const contextualBodies=combinedSetup|| (details.length?Array.from({length:3},(_,i)=>[context.staff?v.staff.replace('{name}',context.staff):'',...context.topics.filter(t=>!context.staff||t!=='helpful').map(t=>detailLine(t,i)).filter(Boolean).slice(0,2)].filter(Boolean).join(' ')):generic);
 const bodies=!context.hasText?['']:context.negative?negativeBodies:[...new Set(contextualBodies)];
 const followUp=language==='en'?'If you can share the visit date and location with our team privately, it will help us look into the details.':language==='id'?'Silakan sampaikan tanggal kunjungan dan lokasinya ke tim kami secara pribadi agar detail kendalanya bisa kami periksa.':c.feedback;
 const endings=context.negative?[relevantIssues.length?followUp:c.feedback]:context.hasText?['',...v.close.filter((_,i)=>i!==2||/bali|trip|holiday|vacation|liburan/i.test(context.original))]:v.close;
 const avoid=new Set(Array.from(options.avoid||[],replyCore));
 const offset=seedOf([review.id,review.name,review.rating,review.comment,language].join('|'))+(options.variant||0)+(tone==='professional'?1:0);
 const combinations=openings.length*bodies.length*endings.length*(context.hasText?2:1);
 for(let attempt=0;attempt<combinations;attempt++){
  const n=(offset+attempt)%combinations,opening=openings[n%openings.length],body=bodies[Math.floor(n/openings.length)%bodies.length],ending=endings[Math.floor(n/(openings.length*bodies.length))%endings.length];
  if(ending&&body.includes(ending))continue;
  if(context.hasText&&/thank|terima kasih/i.test(opening)&&/thank|terima kasih/i.test(ending))continue;
  const bodyFirst=context.hasText&&Math.floor(n/(openings.length*bodies.length*endings.length))===1;
  const core=bodyFirst?[body,opening]:[opening,body];
  const detailedBody=(body.match(/[.!?。！？]/g)||[]).length>=2;
  const sentences=!context.hasText?[opening,ending]:context.negative&&bodyFirst?[body,...(tone==='short'?[]:[ending])].filter(Boolean):detailedBody?(tone==='short'?[body]:context.negative?[...core,ending].filter(Boolean):core):tone==='short'?core:[...core,ending].filter(Boolean);
  // Short style avoids the extra warm sentence and uses a compact signature.
  const text=`${greeting}\n\n${sentences.join(' ')}\n\n${tone==='short'?'BaliEasy':tone==='professional'?c.sign+'\n'+c.team:c.team}`;
  if(!avoid.has(replyCore(text)))return text;
 }
 throw new Error('Pilihan kalimat untuk review ini terlalu mirip dengan draf lain. Edit balasan secara manual sebelum mengirim.');
}
