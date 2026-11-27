import {Location,monthKey,previousMonth,localDate} from './metrics';
export function demoData():Location[]{
 const current=monthKey(),prior=previousMonth(current),day=Math.min(20,Number(localDate(new Date().toISOString()).slice(8)));
 const names=['Canggu','Pererenan','Seminyak','Ubud · Monkey Forest','Ubud · Jembawan','Sading'];
 const maps=['https://maps.google.com/maps?cid=3173701718514094063','https://maps.google.com/maps?cid=3777404508010260099'];
 const comments=['Tim sangat membantu dan proses aktivasi eSIM cepat. Terima kasih BaliEasy!','Friendly service, easy setup and great coverage during our trip.','Prosesnya mudah, staf menjelaskan dengan sabar. Recommended.','Aktivasi memerlukan waktu lebih lama dari perkiraan. Mohon dibantu.'];
 return names.map((title,i)=>{const n=[32,26,22,18,14,9][i],old=[24,20,25,12,10,9][i]; const reviews=Array.from({length:n+old},(_,j)=>({id:`demo-${i}-${j}`,name:['Alex M.','Dewi P.','Sarah L.','Michael R.','Putri A.'][j%5],rating:j%13===0?3:5,comment:j%4===0?'':comments[j%4],created:`${j<n?current:prior}-${String(1+j%day).padStart(2,'0')}T04:00:00Z`,replied:j%6!==0,photos:j%5===0?2:0,videos:j%17===0?1:0}));return {id:`demo-${i}`,account:'demo',maps:maps[i],title:`BaliEasy ${title}`,address:['Jl. Raya Kayutulang, Canggu','Jl. Sempol, Pererenan','Jl. Raya Basangkasa, Seminyak','Jl. Monkey Forest, Ubud','Jl. Jembawan, Ubud','Jl. Merdeka, Sading'][i],rating:[4.9,4.9,4.8,4.9,5,4.9][i],total:[386,274,221,198,145,112][i],reviews};});
}
