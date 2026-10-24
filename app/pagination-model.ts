export const pageSizes=[10,25,50,100,250,500] as const;
export function pageWindow(total:number,requested:number,size:number){
 const pageSize=pageSizes.includes(size as any)?size:10,pages=Math.max(1,Math.ceil(total/pageSize)),page=Math.max(1,Math.min(pages,Number.isFinite(requested)?Math.floor(requested):1));
 return {total,pages,page,pageSize,start:total?(page-1)*pageSize+1:0,end:Math.min(page*pageSize,total)};
}
export function pageNumbers(page:number,pages:number):(number|'…')[]{
 const numbers=[1,...Array.from({length:5},(_,i)=>page+i-2),pages].filter(n=>n>=1&&n<=pages).sort((a,b)=>a-b);
 const result:(number|'…')[]=[];let last=0;
 for(const n of new Set(numbers)){if(last&&n-last>1)result.push('…');result.push(n);last=n;}return result;
}
