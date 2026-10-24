import {build} from 'esbuild';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
mkdirSync('.sites-runtime/tests',{recursive:true});
await build({stdin:{contents:"export * from './app/reply-languages.ts';export {replyDraft} from './app/reply-draft.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'node',outfile:'.sites-runtime/tests/languages.mjs'});
const d=await import('../.sites-runtime/tests/languages.mjs');
const cases={en:'Thanks! Great service, friendly staff.',id:'Terima kasih, pelayanan sangat ramah.',ru:'Все оперативно, спасибо 👍',uk:'Дякую за чудове обслуговування!',de:'Danke, sehr freundlich und schnell!',fr:'Merci beaucoup, équipe très sympathique.',es:'Muchas gracias, recomiendo este servicio.',it:'Grazie, personale gentile. Consiglio!',pt:'Muito obrigado, ótimo atendimento!',nl:'Bedankt, heel vriendelijk en snel geholpen!',pl:'Dziękuję, bardzo miła obsługa. Polecam!',tr:'Çok teşekkür ederim, hızlı hizmet.',zh:'服务很好，非常感谢你们！',ja:'親切に対応していただき、ありがとうございました。',ko:'친절한 서비스 감사합니다.',th:'บริการดีมาก ขอบคุณค่ะ',vi:'Cảm ơn, nhân viên rất nhiệt tình.',ar:'شكرًا على الخدمة الممتازة والتعامل اللطيف'};
for(const [language,text] of Object.entries(cases)){
 assert.equal(d.originalLanguage(text).language,language,text);
 assert.equal(d.originalLanguage('(Translated by Google) Very helpful service\n\n(Original)\n'+text).language,language,'must detect original instead of English translation');
}
console.log('PASS original-language detection for 18 languages, including translated Google comments');
assert.equal(d.originalComment('(Diterjemahkan oleh Google) Bagus\n\n(Original)\nСпасибо'),'Спасибо');
assert.equal(d.originalComment('(Translated by Google) Hello\n(original)\nBonjour'),'Bonjour');
console.log('PASS original marker extraction tolerates localized translation header and marker case');
for(const text of ['', '⭐️⭐️⭐️⭐️⭐️', '12345', 'Super', 'Kerenxyz', 'தமிழ் சேவை'])assert.equal(d.originalLanguage(text).language,null,text);
assert.equal(d.originalLanguage('').reason,'empty');
console.log('PASS stars-only, ambiguous short text, and unsupported scripts are not assigned a guessed language');
const r={name:'Alex Example',comment:'Great service',rating:5};
for(const {code} of d.replyLanguages){
 assert(d.isReplyLanguage(code));
 const warm=d.replyDraft(r,code,'warm'),formal=d.replyDraft(r,code,'professional'),short=d.replyDraft(r,code,'short'),negative=d.replyDraft({...r,rating:1},code,'warm'),stars=d.replyDraft({...r,comment:''},code,'warm');
 for(const text of [warm,formal,short,negative,stars]){assert(text.length>30&&text.length<4096);assert(text.includes('BaliEasy'));assert(!text.includes('undefined'));}
 assert(warm.includes('Alex'));assert.notEqual(warm,formal);assert(short.length<warm.length);assert.notEqual(warm,negative);assert.notEqual(warm,stars);
 if(!['en','id'].includes(code))assert(!warm.includes('Thank you'));
}
assert(!d.isReplyLanguage('xx'));assert(!d.isReplyLanguage(null));
console.log('PASS complete native-language templates for 18 languages, all tones, complaints, and stars-only variants');
assert.match(d.replyDraft(r,'ru','warm'),/спасибо|благодар/iu);assert.match(d.replyDraft(r,'ja','warm'),/[\u3040-\u30ff]/);assert.match(d.replyDraft(r,'ar','warm'),/[\u0600-\u06ff]/);
assert.equal(d.detectLanguage('⭐️'),'en');
console.log('PASS native scripts preserved and unknown-language default remains compatible');
console.log('Verified 5 multilingual behavior checks. No API calls made.');
