// Vary editorial endings using observed topics and actual title history, not random claims.
const endings=[
 {key:'살펴보기',pattern:/살펴보기$/,tail:'상담 전 살펴보기'},
 {key:'정리',pattern:/정리(?:하기)?$/,tail:'사진과 함께 정리'},
 {key:'구조',pattern:/구조$/,tail:'사진으로 보는 구조'},
 {key:'내용',pattern:/(?:내용|사항)$/,tail:'문의 전 알아둘 내용'},
 {key:'이해하기',pattern:/이해하기$/,tail:'사진으로 이해하기'},
 {key:'질문',pattern:/(?:질문|궁금증)$/,tail:'사진을 바탕으로 한 질문'},
 {key:'기록',pattern:/기록$/,tail:'사진 관찰 기록'},
 {key:'대상',pattern:/대상$/,tail:'사진에서 살펴볼 대상'},
 {key:'방법',pattern:/방법$/,tail:'상담을 준비하는 방법'},
 {key:'순서',pattern:/순서$/,tail:'사진 확인과 문의 순서'},
 {key:'예시',pattern:/예시$/,tail:'사진을 활용한 상담 예시'},
 {key:'특징',pattern:/특징$/,tail:'사진에 보이는 특징'},
 {key:'포인트',pattern:/포인트$/},
 {key:'안내',pattern:/안내$/},
 {key:'점검',pattern:/점검$/},
 {key:'사례',pattern:/(?:사례|케이스)$/},
 {key:'경우',pattern:/경우$/},
 {key:'비교',pattern:/(?:비교|비교하기)$/},
];
const clean=value=>String(value||'').normalize('NFKC').trim().replace(/[.!?。！？·,\s]+$/g,'');
const family=value=>endings.find(item=>item.pattern.test(clean(value)))?.key||clean(value).split(/\s+/).slice(-2).join(' ');
const suffix=item=>{if(String(item.title||'').trim())return clean(item.title).split(/\s[·|]\s/).at(-1);try{const copy=typeof item.page_copy==='string'?JSON.parse(item.page_copy):item.page_copy;if(copy?.title_suffix)return copy.title_suffix;}catch{}return '';};
export function titleVariety(history=[]){
 const recent=[...history].sort((a,b)=>Number(b.id||0)-Number(a.id||0)).slice(0,500),counts=new Map();
 for(const item of recent){const key=family(suffix(item));if(key)counts.set(key,(counts.get(key)||0)+1);}
 const choices=endings.filter(item=>item.tail).map((item,index)=>({...item,count:counts.get(item.key)||0,index})).sort((a,b)=>a.count-b.count||a.index-b.index);
 return {recent_endings:recent.slice(0,12).map(suffix),ending_usage:[...counts].sort((a,b)=>b[1]-a[1]).map(([ending,count])=>({ending,count})),preferred_forms:choices.slice(0,5).map(item=>item.tail)};
}
export function diversifyTitleSuffix(value,topics,history=[],labels=[]){
 const plan=titleVariety(history),key=family(value);
 if(!plan.recent_endings.some(ending=>family(ending)===key))return value;
 const counts=new Map(plan.ending_usage.map(item=>[item.ending,item.count]));
 const options=endings.filter(item=>item.tail).map((item,index)=>({...item,count:counts.get(item.key)||0,index})).sort((a,b)=>a.count-b.count||a.index-b.index);
 const remove=labels.filter(label=>label?.length>=2).sort((a,b)=>b.length-a.length),candidates=[];
 for(const topic of topics){let subject=clean(topic).replace(/[*#`<>]/g,'');for(const label of remove)subject=subject.split(label).join(' ');subject=subject.replace(/\s+/g,' ').replace(/^[\s·,\-]+|[\s·,\-]+$/g,'');if(subject.length<3)continue;
  for(const option of options){const candidate=(Array.from(subject).slice(0,55-option.tail.length-1).join('')+' '+option.tail).trim();if(candidate.length>=6&&!plan.recent_endings.some(ending=>clean(ending)===candidate))candidates.push({...option,candidate});}
 }
 candidates.sort((a,b)=>a.count-b.count||a.index-b.index);
 return candidates[0]?.candidate||value;
}
