import type {Review} from './metrics';
import {originalComment,type Language} from './reply-languages';
import {replyTranslations} from './reply-translations';
import {naturalCopy} from './reply-natural-copy';
export type Tone='warm'|'professional'|'short';
export const REPLY_GENERATOR_VERSION=2;
type Input=Pick<Review,'name'|'rating'|'comment'>&Partial<Pick<Review,'id'>>;
const base={
 en:{hello:'Hi',thanks:'Thank you for sharing your experience with BaliEasy.',rating:'Thank you for rating BaliEasy.',positive:'It is good to know you had a positive experience with our team.',negative:'We are sorry your experience fell short of expectations. Please contact the BaliEasy team directly so we can understand your concerns and follow up.',feedback:'Your feedback helps us see where we can improve.',shortNegative:'We are sorry to hear this. Please contact our team directly so we can understand what happened.',sign:'Kind regards,',team:'The BaliEasy team'},
 id:{hello:'Halo',thanks:'Terima kasih sudah berbagi pengalaman bersama BaliEasy.',rating:'Terima kasih atas penilaian untuk BaliEasy.',positive:'Kami senang Anda mendapat pengalaman yang baik bersama tim kami.',negative:'Mohon maaf pengalaman Anda belum sesuai harapan. Silakan hubungi tim BaliEasy secara langsung agar kami bisa memahami kendala dan menindaklanjutinya.',feedback:'Masukan Anda membantu kami melihat hal yang perlu diperbaiki.',shortNegative:'Mohon maaf atas pengalaman ini. Silakan hubungi tim kami agar kendalanya bisa kami pahami lebih lanjut.',sign:'Salam,',team:'Tim BaliEasy'},
};
function seedOf(s:string){let n=2166136261;for(const c of s)n=Math.imul(n^c.codePointAt(0)!,16777619);return n>>>0;}
function firstName(name:string){const first=name.trim().split(/\s+/)[0]||'';return first!=='Pengguna'&&/^[\p{L}\p{M}][\p{L}\p{M}'’\-]{0,30}$/u.test(first)?first:'';}
function staffName(text:string){
 const patterns=[/\b(?:Thanks?|Thank you)\s+(?:to\s+)?([A-Z][a-zA-Z'’-]{1,24})\b/g,/\b([A-Z][a-zA-Z'’-]{1,24})\s+(?:helped|assisted|was (?:so |very )?(?:patient|helpful|amazing|kind))/g,/\b(?:Terima kasih|Makasih)\s+(?:untuk |kepada )?([A-Z][a-zA-Z'’-]{1,24})\b/g];
 const blocked=/^(Bali|BaliEasy|Telkomsel|The|You|Your|For|All|Team|Staff|Service|Everyone|Saya|Tim|Pelayanan)$/i;
 for(const pattern of patterns){for(const match of text.matchAll(pattern))if(!blocked.test(match[1]))return match[1];}return '';
}
export function replyContext(review:Input){
 const text=review.comment,original=originalComment(text);
 const negative=review.rating<=3||/(?:do not|don't|wouldn't|cannot|can't) recommend|not recommended|не рекомендую|не советую|no recomiendo|nicht empfehlen|tidak merekomendasikan/i.test(original)||/\b(not helpful|unhelpful|rude|scam|terrible|disappointed|kurang baik|tidak ramah|kecewa|penipuan)\b/i.test(original);
 const topics:string[]=[];
 if(!negative&&original){
  if(/top[ -]?up|recharg|isi pulsa|pengisian pulsa|пополн|recar[gr]|เติมเงิน|充值|충전|チャージ/i.test(text))topics.push('topup');
  if(/\bvisa\b|\bkitas\b|immigration|visum|visado|виз|віз|签证|ビザ|비자|วีซ่า|thị thực|تأشيرة/i.test(text))topics.push('visa');
  if(/\be[ -]?sim\b|\bsim[ -]?card\b|\bsim card\b|telkomsel|kartu sim|сим.?карт|SIMカード|유심|ซิม|网络/i.test(text))topics.push('esim');
  if(/\b(fast|quick|speedy|rapid\w*|schnell\w*|veloce|snel|cepat|mudah|hizli)\b|быстро|оперативно|швидко|迅速|빠르|รวดเร็ว/i.test(text))topics.push('fast');
  if(/\b(helpful|helped|friendly|kind|patient|ramah|membantu|sabar|gentil\w*|sympathique|amable\w*|freundlich\w*|behulpzaam)\b|помог|приветлив|доброжел|친절|親切|热情/i.test(text))topics.push('helpful');
  if(/recommend\w*|recomm[ae]nd\w*|merekomendasi\w*|empfehl\w*|consigl\w*|рекоменд|polecam|aanrader|推荐|おすすめ|추천/i.test(text))topics.push('recommend');
 }
 return {negative,hasText:!!original,topics,staff:negative?'':staffName(original)};
}
// Ignore greetings and signatures so changing a name alone doesn't count as a distinct reply.
export function replyCore(text:string){const blocks=text.trim().split(/\n\s*\n/);if(blocks.length>1&&blocks[0].length<100&&(/^(Hi|Hello|Halo|Здравствуйте|Вітаємо|Hallo|Bonjour|Hola|Buongiorno|Olá|Dzień dobry|Merhaba|Xin chào|مرحبًا)[^\n]*[,،]$/iu.test(blocks[0])||/^您好.*！$|^[^\n]*こんにちは。$|^[^\n]*안녕하세요\.$|^สวัสดี[^\n]{0,45}$/u.test(blocks[0])))blocks.shift();if(blocks.length>1&&/BaliEasy/i.test(blocks.at(-1)!))blocks.pop();return blocks.join(' ').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();}
export function duplicateReplyCount(items:{text:string}[]){const seen=new Set<string>();let duplicates=0;for(const d of items){const key=replyCore(d.text);if(seen.has(key))duplicates++;seen.add(key);}return duplicates;}
export function replyDraft(review:Input,language:Language,tone:Tone,options:{variant?:number;avoid?:Iterable<string>}={}){
 const c=language==='en'||language==='id'?base[language]:replyTranslations[language],v=naturalCopy[language],context=replyContext(review),name=firstName(review.name);
 const greeting=language==='ja'?(name?`${name}様、こんにちは。`:'こんにちは。'):language==='ko'?(name?`${name}님, 안녕하세요.`:'안녕하세요.'):language==='zh'?`您好${name?'，'+name:''}！`:language==='th'?`${c.hello}${name?'คุณ '+name:''}`:`${language==='en'&&tone==='professional'?'Hello':c.hello}${name?' '+name:''}${language==='ar'?'،':','}`;
 const openings=context.hasText?[c.thanks,...v.open]:[c.rating,...v.open,c.thanks,c.feedback,context.negative?c.shortNegative:c.positive];
 const generic=[c.positive,v.close[0],v.close[1],v.close[3]];
 const details=context.topics.filter(t=>!context.staff||t!=='helpful').map(t=>v[t as 'esim'|'topup'|'visa'|'fast'|'helpful'|'recommend']);
 if(context.staff)details.unshift(v.staff.replace('{name}',context.staff));
 const primary=details[0];
 const bodies=!context.hasText?['']:context.negative?[c.negative,c.shortNegative]:details.length?[...details.map(line=>line===primary?line:primary+' '+line),...(context.staff?[]:[primary+' '+c.positive,primary+' '+v.close[3]])]:generic;
 const endings=context.negative?[c.feedback]:v.close;
 const avoid=new Set(Array.from(options.avoid||[],replyCore));
 const offset=seedOf([review.id,review.name,review.rating,review.comment,language].join('|'))+(options.variant||0)+(tone==='professional'?1:0);
 const combinations=openings.length*bodies.length*endings.length;
 for(let attempt=0;attempt<combinations;attempt++){
  const n=(offset+attempt)%combinations,opening=openings[n%openings.length],body=bodies[Math.floor(n/openings.length)%bodies.length],ending=endings[Math.floor(n/(openings.length*bodies.length))%endings.length];
  if(body.includes(ending))continue;
  const sentences=!context.hasText?[opening,ending]:tone==='short'?[opening,body]:[opening,body,ending].filter(Boolean);
  // Short style avoids the extra warm sentence and uses a compact signature.
  const text=`${greeting}\n\n${sentences.join(' ')}\n\n${tone==='short'?'BaliEasy':tone==='professional'?c.sign+'\n'+c.team:c.team}`;
  if(!avoid.has(replyCore(text)))return text;
 }
 throw new Error('Pilihan kalimat untuk review ini terlalu mirip dengan draf lain. Edit balasan secara manual sebelum mengirim.');
}
