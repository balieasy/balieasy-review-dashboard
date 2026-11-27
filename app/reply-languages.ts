export const replyLanguages=[
 {code:'en',label:'English'},{code:'id',label:'Bahasa Indonesia'},
 {code:'ru',label:'Русский · Rusia'},{code:'uk',label:'Українська · Ukraina'},
 {code:'de',label:'Deutsch · Jerman'},{code:'fr',label:'Français · Prancis'},
 {code:'es',label:'Español · Spanyol'},{code:'it',label:'Italiano · Italia'},
 {code:'pt',label:'Português · Portugis'},{code:'nl',label:'Nederlands · Belanda'},
 {code:'pl',label:'Polski · Polandia'},{code:'tr',label:'Türkçe · Turki'},
 {code:'zh',label:'中文 · Mandarin (sederhana)'},{code:'ja',label:'日本語 · Jepang'},
 {code:'ko',label:'한국어 · Korea'},{code:'th',label:'ไทย · Thailand'},
 {code:'vi',label:'Tiếng Việt · Vietnam'},{code:'ar',label:'العربية · Arab'},
] as const;
export type Language=typeof replyLanguages[number]['code'];
export const languageLabel=(code:Language)=>replyLanguages.find(l=>l.code===code)!.label;
export const isReplyLanguage=(value:unknown):value is Language=>replyLanguages.some(l=>l.code===value);
export function originalComment(comment:string){const marker=/\((?:Original|Asli|Originale|Оригинал)\)\s*/gi;let last=-1;for(const m of comment.matchAll(marker))last=m.index!+m[0].length;return (last>=0?comment.slice(last):comment).trim();}
// Conservative local heuristic: uncertain/empty text stays unknown. Never infer from a person's name.
const strong:Partial<Record<Language,string>>={
 en:'thanks thank helpful friendly recommend recommended great good amazing awesome lovely excellent',
 id:'terima kasih makasih pelayanan sangat ramah membantu bagus cepat mudah banget mantap harga sabar saya kami baik',
 de:'danke dankeschon freundlich freundliche freundlichen hilfreich empfehle empfehlen empfehlenswert schnell schnelle schnell kompetent zufrieden ausgezeichnet immer alles sehr',
 fr:'merci beaucoup recommande recommander recommande gentillesse sympathique aimable rapide equipe efficace accueil parfait parfaite tres avec pour carte chere moins aeroport vous avez cette',
 es:'gracias recomiendo recomendamos amable amables excelente excelente rapido rapida servicio atencion ayuda muy todo todos',
 it:'grazie consiglio consigliato gentile gentili veloce veloci servizio ottimo ottima personale molto tutto',
 pt:'obrigado obrigada recomendo recomendo atendimento equipe simpatico simpatica rapido rapida otimo otima muito tudo',
 nl:'bedankt dankjewel vriendelijk vriendelijke geholpen behulpzaam aanrader uitstekende uitstekend snelle snel goed goede heel alles',
 pl:'dziekuje polecam obsluga pomoc pomocna mily mila szybko szybka swietnie swietna bardzo wszystko',
 tr:'tesekkur tesekkurler ederim tavsiye yardimci hizmet hizli guzel cok memnun kaldim',
 vi:'cam on nhan vien dich vu rat tot nhiet tinh nhanh chong giup than thien hai long',
 ru:'спасибо благодарю рекомендую рекомендуем отличный отличная отлично быстро оперативно очень помогли вежливый вежливая все всё супер сервис сотрудник решила проблемы доброжелательная',
 uk:'дякую рекомендую чудовий чудова швидко привітний привітна дуже допомогли обслуговування',
};
export function originalLanguage(comment:string):{language:Language|null;reason:'empty'|'script'|'words'|'uncertain'}{
 const text=originalComment(comment);if(!/\p{L}/u.test(text))return {language:null,reason:'empty'};
 const script=(language:Language)=>({language,reason:'script' as const});
 if(/[\u3040-\u30ff]/u.test(text))return script('ja');
 if(/[\uac00-\ud7af\u1100-\u11ff]/u.test(text))return script('ko');
 if(/[\u0e00-\u0e7f]/u.test(text))return script('th');
 if(/[\u3400-\u9fff]/u.test(text))return script('zh');
 if(/[\u0600-\u06ff]/u.test(text)){if(/[پچژگ]/u.test(text))return {language:null,reason:'uncertain'};return script('ar');}
 if(/[іїєґ]/iu.test(text))return script('uk');
 const normalized=text.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/đ/g,'d');
 const tokens=new Set(normalized.match(/\p{L}+/gu)||[]);
 const scores=Object.entries(strong).map(([language,words])=>({language:language as Language,score:[...new Set(words.split(' '))].reduce((n,w)=>n+(tokens.has(w)?1:0),0)}));
 const boost=(language:Language,pattern:RegExp,n=3)=>{if(pattern.test(text))scores.find(s=>s.language===language)!.score+=n;};
 boost('id',/\b(terima\s+kasih|makasih|pelayanan|ramah|mantap)\b/i);
 boost('en',/\b(thank\s+you|thanks|helpful|friendly|recommend|great|awesome|amazing)\b/i);
 boost('de',/\b(danke|dankeschön|empfehlenswert|freundlich\w*|empfehle\w*)\b/i);
 boost('fr',/\b(merci|beaucoup|recommande\w*|gentillesse)\b|carte\s+SIM|moins ch[eè]re|[àa] l.a[eé]roport/i);
 boost('es',/\b(gracias|recomiendo|atención)\b/i);
 boost('it',/\b(grazie|consiglio|consigliato)\b/i);
 boost('pt',/\b(obrigad[oa]|recomendo|atendimento)\b/i);
 boost('nl',/\b(bedankt|dankjewel|behulpzaam|aanrader)\b/i);
 boost('pl',/\b(polecam|dziekuje)\b/i);
 boost('pl',/dziękuj[ęe]|obsług[ai]/i);
 boost('tr',/teşekkür|tesekkur|yardımcı|tavsiye/i);
 boost('vi',/[ạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹđ]/i);
 boost('ru',/спасибо|благодарю|рекомендую|отличн|оперативно|очень/iu);
 boost('uk',/дякую|чудов|швидко|обслуговування/iu);
 scores.sort((a,b)=>b.score-a.score);const [best,second]=scores;
 return best.score>=2&&best.score>second.score?{language:best.language,reason:'words'}:{language:null,reason:'uncertain'};
}
export function detectLanguage(comment:string):Language{return originalLanguage(comment).language||'en';}
