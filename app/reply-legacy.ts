import type {Review} from './metrics';
import {originalComment,type Language} from './reply-languages';
import {localizedReply} from './reply-translations';
export {originalComment,detectLanguage} from './reply-languages';
export type {Language} from './reply-languages';
export type Tone='warm'|'professional'|'short';
export function replyDraft(review:Pick<Review,'name'|'rating'|'comment'>,language:Language,tone:Tone){
 const first=review.name.trim().split(/\s+/)[0]||'';const name=first&&first!=='Pengguna'?first:'';const comment=originalComment(review.comment);
 if(language!=='en'&&language!=='id')return localizedReply(review,language,tone,name);
 const positive=review.rating>=4,esim=/\b(e-?sim|simcard|sim card|telkomsel|top.?up)\b/i.test(comment),visa=/\b(visa|kitas|immigration)\b/i.test(comment);
 if(language==='id'){
  const greeting=name?`Halo ${name},`:'Halo,';
  const thanks=review.comment.trim()?'Terima kasih telah meluangkan waktu untuk berbagi pengalaman bersama BaliEasy.':'Terima kasih sudah memberikan penilaian untuk BaliEasy.';
  const body=positive?(esim?'Senang bisa membantu kebutuhan konektivitas Anda selama di Bali.':visa?'Terima kasih telah mempercayakan kebutuhan layanan visa Anda kepada tim kami.':'Kami senang Anda memiliki pengalaman yang baik bersama tim kami.'):'Mohon maaf pengalaman Anda belum sesuai harapan. Silakan hubungi tim BaliEasy secara langsung agar kami dapat memahami kendala yang Anda alami dan menindaklanjutinya.';
  const closing=positive?'Kami berharap dapat membantu Anda kembali di kesempatan berikutnya.':'Masukan Anda membantu kami memperbaiki layanan.';
  if(tone==='short')return `${greeting} ${positive?'terima kasih atas penilaian dan kepercayaan Anda kepada BaliEasy. Semoga kami bisa membantu Anda kembali.':'terima kasih atas masukan Anda. Mohon maaf atas pengalaman yang kurang memuaskan. Silakan hubungi tim kami agar kami dapat menindaklanjutinya.'}`;
  return `${greeting}\n\n${thanks} ${body}${tone==='warm'?' '+closing:''}\n\nSalam${tone==='warm'?' hangat':''},\nTim BaliEasy`;
 }
 const greeting=name?`Hi ${name},`:'Hello,';
 const thanks=review.comment.trim()?'Thank you for taking the time to share your experience with BaliEasy.':'Thank you for rating your experience with BaliEasy.';
 const body=positive?(esim?'We are glad we could help with your connectivity needs in Bali.':visa?'Thank you for trusting our team with your visa service needs.':'We are happy to hear you had a positive experience with our team.'):'We are sorry your experience fell short of expectations. Please contact the BaliEasy team directly so we can understand your concerns and follow up.';
 if(tone==='short')return `${greeting} ${positive?'thank you for your rating and for choosing BaliEasy. We hope to help you again soon!':'thank you for your feedback. We are sorry your experience fell short. Please contact our team directly so we can look into your concerns.'}`;
 return `${greeting}\n\n${thanks} ${body}${tone==='warm'?(positive?' We look forward to helping you again!':' Your feedback helps us improve our service.'):''}\n\n${tone==='warm'?'Warm':'Kind'} regards,\nThe BaliEasy team`;
}
