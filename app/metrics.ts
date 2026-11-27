export type Review={id:string;name:string;rating:number;comment:string;created:string;updated?:string;replied:boolean;reply?:string;photos:number;videos:number;url?:string};
export type Location={id:string;account:string;title:string;address:string;maps?:string;mapPoint?:{latitude:number;longitude:number};rating:number;total:number;reviews:Review[];synced?:string;coverage?:{fetched:number;reported:number;matches:boolean}};
export const zone='Asia/Makassar';
const dateFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'});
export function localDate(iso:string){return dateFormatter.format(new Date(iso));}
export function monthKey(now=new Date()){return localDate(now.toISOString()).slice(0,7);}
export function previousMonth(month:string){const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m-2,1)).toISOString().slice(0,7);}
export function growth(current:number,previous:number){return previous===0?null:(current-previous)/previous*100;}
export function periodCounts(reviews:Review[],month:string,now=new Date()){
 const prior=previousMonth(month),today=localDate(now.toISOString()),isCurrent=month===today.slice(0,7);
 const priorDays=new Date(Date.UTC(Number(prior.slice(0,4)),Number(prior.slice(5)),0)).getUTCDate();
 const cutoff=isCurrent?Math.min(Number(today.slice(8)),priorDays):31;
 const current=reviews.filter(r=>{const d=localDate(r.created);return d.slice(0,7)===month&&(!isCurrent||d<=today);}).length;
 const previous=reviews.filter(r=>{const d=localDate(r.created);return d.slice(0,7)===prior&&Number(d.slice(8))<=cutoff;}).length;
 return {current,previous,percent:growth(current,previous),isCurrent,cutoff};
}
