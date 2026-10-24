import {build} from 'esbuild';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
mkdirSync('.sites-runtime/tests',{recursive:true});
await build({stdin:{contents:"export * from './app/reply-draft.ts';export {replyLanguages} from './app/reply-languages.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'node',outfile:'.sites-runtime/tests/natural-replies.mjs'});
const d=await import('../.sites-runtime/tests/natural-replies.mjs');
let checks=0;const pass=label=>{checks++;console.log('PASS '+label);};
const review={id:'sample',name:'Alex Example',rating:5,comment:'Great eSIM service'};
for(const {code} of d.replyLanguages){
 for(const comment of ['Great eSIM service','']){
  const replies=[];
  for(let i=0;i<30;i++)replies.push(d.replyDraft({...review,id:String(i),name:'Alex '+i,comment},code,'warm',{avoid:replies}));
  assert.equal(new Set(replies.map(d.replyCore)).size,30,code+' must vary body, not just reviewer name');
  assert(replies.every(text=>text.length<1000&&!text.includes('undefined')));
 }
}
pass('30 distinct reply bodies per language for both service reviews and stars-only reviews');
assert.equal(d.replyContext({...review,comment:'Thanks Bayu, you helped with my top up!'}).staff,'Bayu');
const staff=d.replyDraft({...review,comment:'Thanks Bayu, you helped with my top up!'},'en','warm');assert.match(staff,/Bayu/);assert.match(d.replyDraft({...review,comment:'Helpful visa team'},'en','warm'),/visa/);
assert.match(d.replyDraft({...review,comment:'Ardi was amazing and helpful! Thank you'},'en','warm'),/Ardi/);
pass('staff explicitly named in review and service context appear in reply');
const stars=d.replyDraft({...review,comment:''},'en','warm');assert(!/visa|top.up|connectiv|Bayu|Ardi/i.test(stars));
assert.equal(d.replyContext({...review,comment:'Thank you For your service'}).staff,'');
assert(!d.replyDraft({...review,comment:'Contact 081234567890 or customer@example.com'},'en','warm').includes('081234567890'));
pass('rating-only replies invent no services, names, contact details, or transaction facts');
for(const rating of [1,2,3]){const text=d.replyDraft({...review,rating,comment:'Fast service but disappointed'},'en','warm');assert.match(text,/sorry|expectation/i);assert(!/glad|happy|recommendation means/i.test(text));assert(!/refund|compensation|resolved|guarantee/i.test(text));}
assert(d.replyContext({...review,comment:"I don't recommend them"}).negative);
pass('complaints and mixed feedback do not produce positive or compensation claims');
const first=d.replyDraft(review,'en','warm'),next=d.replyDraft(review,'en','warm',{variant:1,avoid:[first]});assert.notEqual(d.replyCore(first),d.replyCore(next));assert.equal(d.replyDraft(review,'en','warm'),first);
pass('saved generation is reproducible, explicit variation changes the reply body');
assert.equal(d.duplicateReplyCount([{text:'Hi Alex,\n\nThank you for visiting.\n\nBaliEasy'},{text:'Hi Dewi,\n\nThank you for visiting.\n\nThe BaliEasy team'}]),1);
assert.equal(d.duplicateReplyCount([{text:first},{text:next}]),0);
assert.equal(d.duplicateReplyCount([{text:'We appreciate your feedback about the visa process.\n\nThank you again.'},{text:'We appreciate your feedback about the SIM setup.\n\nThank you again.'}]),0);
pass('bulk duplicate check ignores reviewer greetings and business signatures');
console.log(`Verified ${checks} natural-reply behavior checks. No external requests made.`);
