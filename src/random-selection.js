// Copy before shuffling: request-local choices must never mutate stored ordering.
export function randomSample(rows,limit,random=Math.random){
 const result=[...rows];
 for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
 return result.slice(0,limit);
}
