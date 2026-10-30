import {originalComment} from './reply-languages';

export const detailLabels={activation:'aktivasi / pemasangan SIM',connection:'koneksi internet',price:'harga',waiting:'waktu tunggu',explanation:'penjelasan tim',communication:'komunikasi / tindak lanjut',delivery:'pengiriman',recovery:'kendala yang sudah dibantu',returning:'kunjungan kembali',fast:'kecepatan layanan',helpful:'bantuan tim',visa:'pengurusan visa',topup:'isi ulang',esim:'layanan SIM / eSIM',recommend:'rekomendasi'};
export type Detail=keyof typeof detailLabels;
const patterns:Record<Exclude<Detail,'recovery'>,RegExp>={
 activation:/activat|install|set[ -]?up|setting|pasang|aktivasi|pengaturan|установ|активир|настрой|активац|einricht|instal|configur|設定|激活|설치|ตั้งค่า/i,
 connection:/internet|network|signal|coverage|connection|connectivity|koneksi|sinyal|jaringan|интернет|связ|сигнал|réseau|netz|ネット|网络|인터넷|สัญญาณ/i,
 price:/\bprice\w*\b|\bcost\w*\b|afford|expensive|overcharg|harga|biaya|murah|mahal|цен|дорог|preis|teuer|prix|cher|precio|caro|prezzo|custo|価格|料金|价格|비싸|ราคา/i,
 waiting:/wait(?:ed|ing)?|queue|delay|menunggu|antri|antre|nunggu|lambat|lama sekali|ждал|ждать|ожидан|задерж|warten|wartet|attend|attente|espera|遅|待ち|等待|기다|รอ/i,
 explanation:/explain|instruct|walked.{0,20}through|step.by.step|clarif|penjelas|menjelas|jelasin|dijelaskan|panduan|объясн|erklär|expli|説明|解释|설명|อธิบาย/i,
 communication:/whatsapp|messages?|repl(?:y|ied|ies)|respond|communicat|follow.up|balas|komunikasi|respons|ответ|сообщен|kommunik|répond|rispos|返信|回复|응답|ตอบ/i,
 delivery:/deliver|courier|email|e-mail|\bqr\b|kirim|antar|достав|メール|快递|배송|ส่ง/i,
 returning:/came back|back again|second (?:visit|time)|third (?:visit|time)|repeat customer|kembali lagi|langganan|kedua kali|kesekian|постоянн|снова|wieder|de nouveau/i,
 fast:/\b(fast|quick|speedy|rapid\w*|schnell\w*|veloce|snel|cepat|mudah|hizli)\b|быстро|оперативно|швидко|迅速|빠르|รวดเร็ว/i,
 helpful:/\b(helpful|helped|friendly|kind|patient|staff|team|petugas|pegawai|ramah|membantu|sabar|gentil\w*|sympathique|amable\w*|freundlich\w*|behulpzaam)\b|помог|приветлив|доброжел|친절|親切|热情/i,
 visa:/\bvisa\b|\bkitas\b|immigration|visum|visado|виз|віз|签证|ビザ|비자|วีซ่า|thị thực|تأشيرة/i,
 topup:/top[ -]?up|recharg|isi pulsa|pengisian pulsa|пополн|recar[gr]|เติมเงิน|充值|충전|チャージ/i,
 esim:/\be[ -]?sim\b|\bsim[ -]?card\b|carte\s+sim|sim[- ]?karte|scheda\s+sim|tarjeta\s+sim|telkomsel|kartu sim|сим.?карт|SIMカード|유심|ซิม/i,
 recommend:/recommend\w*|recomm[ae]nd\w*|merekomendasi\w*|empfehl\w*|consigl\w*|рекоменд|polecam|aanrader|推荐|おすすめ|추천/i,
};
const complaint=/\b(?:not|never|no|don['’]?t|wouldn['’]?t|didn['’]?t|doesn['’]?t|wasn['’]?t|couldn['’]?t|can['’]?t|won['’]?t|unable|failed|broken|rude|unhelpful|slow|expensive|overcharg\w*|disappoint\w*|terrible|scam|poor|unreliable|lost)\b|stopped working|keep.{0,12}disconnect|too long|long wait|masih.{0,15}(?:gagal|belum|tidak)|tidak|nggak|ga bisa|belum|gagal|mahal|lambat|kecewa|kasar|lama sekali|не работает|не рекомендую|нет связи|дорого|груб|медлен|schlecht|nicht|teuer|déçu|pas de|ne fonctionne|caro|no funciona|失敗|遅い|使えない|不能|无法|太贵|안 돼|비싸|ใช้ไม่ได้/i;
const reassuring=/no (?:problems?|issues?|trouble|complaints)|not (?:only|a problem|an issue|expensive|slow|bad|difficult)|without (?:any )?(?:problems?|issues?)|tidak ada (?:kendala|masalah)|tanpa (?:kendala|masalah)|не было проблем|без проблем|problemlos/i;
const recovered=/\b(?:fixed|resolved|sorted (?:it|everything|out)|working now|works now|got it working)\b|berhasil (?:diatasi|diperbaiki)|sudah (?:beres|normal|bisa digunakan)|masalah.{0,18}(?:teratasi|selesai)|решили проблему|всё заработало|問題.{0,8}解決/i;
const positive=/great|good|excellent|amazing|helpful|friendly|patient|quick|fast|easy|clear|fair|affordable|reliable|smooth|recommend|senang|bagus|baik|ramah|sabar|cepat|mudah|jelas|murah|terjangkau|membantu|отлич|спасибо|быстро|помог|gut|freundlich|merci|rapide|gracias|amable|grazie|gentil|良い|親切|很好|친절|ดี/i;

export function analyzeReview(comment:string,rating:number){
 const original=originalComment(comment).slice(0,16000);
 const clauses=original.split(/\n+|[.!?。！？;]+|\b(?:but|however|tetapi|tapi|namun|mais|aber|pero|но)\b/iu).map(s=>s.trim()).filter(Boolean);
 const issues=new Set<Detail>(),details=new Set<Detail>();let complaintFound=false;
 const hasRecovery=recovered.test(original)&&!/(?:but|tapi|namun).{0,35}(?:still|masih|not working|tidak bisa)/i.test(original);
 let waitDuration='';
 for(const clause of clauses){
  const searchable=clause.normalize('NFD').replace(/\p{M}/gu,'');
  const cleaned=searchable.replace(reassuring,'').replace(/moins chere?|pas cher/gi,'');
  const duration=clause.match(/(?:wait\w*|menunggu|nunggu|antre|antri).{0,25}?(\d{1,3})\s*(minutes?|mins?|hours?|menit|jam)\b/i);
  const longWait=!!duration&&!/\b(only|just|hanya|cuma)\b/i.test(clause)&&(Number(duration[1])>=20||/hours?|jam/i.test(duration[2]));
  const resolvedTechnical=hasRecovery&&(patterns.activation.test(clause)||patterns.connection.test(clause))&&!/\b(still|masih)\b/i.test(clause);
  const negative=(complaint.test(cleaned)&&!resolvedTechnical)||longWait;
  if(negative&&duration)waitDuration=duration[1]+' '+duration[2];
  if(negative)complaintFound=true;
  for(const [topic,pattern] of Object.entries(patterns) as [Exclude<Detail,'recovery'>,RegExp][]){
   if(!pattern.test(clause)&&!pattern.test(searchable))continue;
   if(negative){if(topic!=='recommend')issues.add(topic);}
   else if(positive.test(clause)||positive.test(searchable)||/moins cher|pas cher|cheaper than/i.test(searchable)||reassuring.test(clause)||hasRecovery||['esim','visa','topup','returning'].includes(topic))details.add(topic);
  }
 }
 if(hasRecovery){details.add('recovery');details.delete('activation');details.delete('connection');}
 // A specific negative clause takes priority over praise elsewhere in the review.
 for(const issue of issues)details.delete(issue);
 const order:Detail[]=['recovery','activation','connection','price','waiting','explanation','communication','delivery','returning','fast','helpful','visa','topup','esim','recommend'];
 const ranked=(set:Set<Detail>)=>order.filter(t=>set.has(t));
 if(issues.has('activation')||issues.has('connection'))issues.delete('esim');
 return {original,hasText:!!original,negative:rating<=3||complaintFound,issues:ranked(issues),details:ranked(details),waitDuration,needsReview:original.length>80&&!issues.size&&!details.size};
}
