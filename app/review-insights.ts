import type {Review} from './metrics';
import {originalComment} from './reply-languages';
import {inRange,type DateRange} from './periods';
export type InsightReview=Review&{location:string;locationId:string};
type Theme={id:string;label:string;pattern:RegExp;action:string};
const positiveThemes:Theme[]=[
 {id:'help',label:'Tim ramah & membantu',pattern:/\b(friendly|helpful|kind|patient|ramah|membantu|sabar|gentil|sympathique|amable|hilfsbereit|freundlich)\b|дружелюб|помог|вежлив/iu,action:'Pertahankan pendampingan tim dan bagikan contoh pelayanan ini ke cabang lain.'},
 {id:'speed',label:'Proses cepat & mudah',pattern:/\b(quick|fast|easy|efficient|smooth|minutes|cepat|mudah|praktis|rapide|facile|schnell|einfach|rapido|rápido)\b|быстро|легко/iu,action:'Pertahankan proses singkat dan petunjuk aktivasi yang mudah diikuti.'},
 {id:'price',label:'Harga & nilai layanan',pattern:/\b(affordable|reasonable|cheap|fair price|good price|good value|murah|terjangkau|harga (?:bagus|wajar)|bon prix)\b|недорого/iu,action:'Jaga transparansi harga dan rincian paket yang dipilih pelanggan.'},
 {id:'connection',label:'SIM, eSIM & koneksi',pattern:/\b(esim|sim|internet|data|connection|connected|network|signal|koneksi|jaringan|sinyal|telkomsel)\b/iu,action:'Pertahankan pemeriksaan aktivasi dan koneksi sebelum pelanggan meninggalkan toko.'},
 {id:'visa',label:'Pengurusan visa',pattern:/\b(visa|extension|immigration|perpanjangan|imigrasi)\b/iu,action:'Pertahankan komunikasi persyaratan dan progres pengurusan visa.'},
];
const concernThemes:Theme[]=[
 {id:'hours',label:'Jam operasional',pattern:/\b(closed|opening hours|business hours|tutup|jam buka)\b/iu,action:'Cocokkan jam buka di Google dengan operasional cabang dan perbarui jam khusus bila diperlukan.'},
 {id:'price',label:'Harga & biaya',pattern:/\b(expensive|overpric\w*|overcharg\w*|hidden (?:fee|charge)|mahal|biaya|harga|cher|caro|teuer)\b|дорого|цен/iu,action:'Periksa transparansi harga, biaya tambahan, dan kesesuaian paket yang dijanjikan.'},
 {id:'connection',label:'Aktivasi & koneksi',pattern:/\b(esim|sim|internet|data|network|signal|connect\w*|activat\w*|koneksi|jaringan|sinyal|aktif|kuota)\b|интернет|связ/iu,action:'Periksa kendala aktivasi, cakupan jaringan, serta bantuan setelah pembelian.'},
 {id:'waiting',label:'Waktu tunggu & proses',pattern:/\b(slow|wait\w*|delay\w*|queue|long time|lama|lambat|antre\w*|antri\w*|retard|langsam|lento)\b|долго|медленно/iu,action:'Periksa waktu tunggu dan sampaikan estimasi proses yang jelas.'},
 {id:'staff',label:'Sikap & bantuan tim',pattern:/\b(rude|unhelpful|unfriendly|staff|employee|customer service|kasar|ramah|petugas|staf|pelayanan)\b|груб|сотрудник/iu,action:'Tinjau interaksi yang disebut pelanggan dan tindak lanjuti bersama tim cabang.'},
 {id:'refund',label:'Pembayaran & pengembalian',pattern:/\b(refund|payment|charged|money back|pembayaran|pengembalian|uang kembali|rembours\w*)\b|возврат/iu,action:'Cocokkan keluhan dengan transaksi serta kebijakan pengembalian yang berlaku.'},
 {id:'visa',label:'Proses visa',pattern:/\b(visa|passport|extension|immigration|paspor|imigrasi)\b/iu,action:'Periksa progres, persyaratan, dan komunikasi estimasi pengurusan visa.'},
];
const negative=/\b(bad|poor|terrible|awful|rude|unhelpful|unfriendly|scam\w*|disappoint\w*|overpric\w*|overcharg\w*|expensive|slow|frustrat\w*|broken|failed|hidden (?:fee|charge)|not (?:good|helpful|working|work|recommended|recommend|friendly)|does(?:n['’]t| not) work|did(?:n['’]t| not) work|do(?:n['’]t| not) recommend|no (?:internet|signal|connection|refund)|kecewa|buruk|kasar|penipuan|mahal|lambat|tidak (?:ramah|membantu|berfungsi|bisa|bagus|sesuai|direkomendasikan)|kurang (?:baik|ramah)|nunggu lama|menunggu lama|trop cher|mauvais|mauvaise|déçu|decu|schlecht|unfreundlich|enttäuscht|demasiado caro|malo|mal servicio)\b|не рекомендую|не работает|плох|ужас|обман|груб|слишком дорого|долго ждал|最悪|ひどい|不好|太贵|糟糕|불친절|최악|비싸/iu;
function normalize(text:string){return text.toLocaleLowerCase().replace(/\b(nothing bad to say|my bad|terrible day|no bad experiences?)\b/giu,' ').replace(/[’]/g,"'").replace(/\b(no (?:problems?|issues?|complaints?|hidden fees?)|not (?:expensive|slow|bad|rude)|never (?:had )?(?:any )?(?:problems?|issues?)|without (?:any )?(?:problems?|issues?)|tidak (?:ada (?:masalah|kendala)|mahal|lambat)|tanpa (?:masalah|kendala)|не дорого|no es caro)\b/giu,' ');}
export function insightClassification(review:Pick<Review,'rating'|'comment'>){
 // Read stored text only. Google-provided translations may also supply keywords.
 const text=normalize(review.comment),clauses=text.split(/[.!?;\n]+|\b(?:but|however|tetapi|tapi|namun)\b/iu).map(s=>s.trim()).filter(Boolean);
 const resolved=/\b(fix(?:ed|ing)|resolved|sorted|successful experience|now works|now working|got.{0,20}working|managed to fix)\b/iu.test(text)&&!/\b(still.{0,25}(?:not|doesn't|does not|problem|issue)|not resolved|unable to (?:fix|resolve)|could(?:n't| not) (?:fix|resolve))\b/iu.test(text);
 const hoursComplaint=/closed.{0,70}(?:work time|working hours|opening hours|business hours)|tutup.{0,60}(?:padahal|jam buka)/iu.test(text);
 const negativeClauses=clauses.filter(clause=>{
  const context=resolved?clause.replace(/\b(?:(?:was |is |were )?not working|does(?:n't| not) work|did(?:n't| not) work|no (?:internet|signal|connection))\b/giu,' '):clause;
  return negative.test(context)||((review.rating<=3||hoursComplaint)&&/\b(closed|tutup)\b/iu.test(clause));
 });
 const concern=review.rating<=3||negativeClauses.length>0;
 return {polarity:concern?'concern':review.rating>=4?'positive':'unclassified',negativeText:negativeClauses.join(' '),text,hasText:!!originalComment(review.comment)} as const;
}
export function reviewInsights(reviews:InsightReview[],range:DateRange){
 const selected=reviews.filter(r=>inRange(r,range));
 const classified=selected.map(review=>({review,...insightClassification(review)}));
 function group(polarity:'positive'|'concern'){
  const items=classified.filter(r=>r.polarity===polarity).sort((a,b)=>(polarity==='concern'?a.review.rating-b.review.rating:0)||Date.parse(b.review.created)-Date.parse(a.review.created));
  const definitions=polarity==='positive'?positiveThemes:concernThemes;
  const themes=definitions.map(theme=>({...theme,reviews:items.filter(r=>theme.pattern.test(polarity==='concern'?r.negativeText:r.text)).map(r=>r.review)})).filter(t=>t.reviews.length).sort((a,b)=>b.reviews.length-a.reviews.length);
  return {count:items.length,withText:items.filter(r=>r.hasText).length,reviews:items.map(r=>r.review),themes};
 }
 return {total:selected.length,withText:classified.filter(r=>r.hasText).length,positive:group('positive'),concern:group('concern'),unclassified:classified.filter(r=>r.polarity==='unclassified').length};
}
