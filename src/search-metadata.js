// A readability limit for our snippets, not a search engine character limit.
export function searchDescription(value,max=180){
 const plain=String(value||'').replace(/\[사진:\d+\]/g,' ').replace(/\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/g,'$1').replace(/<[^>]*>/g,' ').replace(/[#*_`]/g,'').replace(/\s+/g,' ').trim();
 const sentences=[...new Set(plain.split(/(?<=[.!?。！？])\s+/).filter(Boolean))].slice(0,2).join(' ');
 const points=Array.from(sentences);if(points.length<=max)return sentences;
 const cut=points.slice(0,max-1).join(''),space=cut.lastIndexOf(' ');
 return (space>max*.7?cut.slice(0,space):cut).replace(/[\s,;·:]+$/,'')+'…';
}
