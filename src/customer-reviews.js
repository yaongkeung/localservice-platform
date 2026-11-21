export function reviewText(value){try{const rows=JSON.parse(value||'[]');if(Array.isArray(rows))return rows.join('\n\n');}catch{}return String(value||'');}
export function reviewValues(form,row={}){
 if(!form.has('customer_reviews'))return {customer_reviews:row.customer_reviews||'[]',review_source_url:row.review_source_url||'',reviews_confirmed:row.reviews_confirmed||0};
 const text=String(form.get('customer_reviews')||'').trim(),reviews=text?text.split(/\n\s*\n/).map(value=>value.trim()).filter(Boolean):[];
 if(reviews.length>6||reviews.some(value=>value.length>1200))throw Error('고객 후기는 최대 6개, 후기당 1,200자까지 입력해 주세요. 빈 줄로 나눠 주세요.');
 if(reviews.length&&form.get('reviews_confirmed')!=='1')throw Error('고객 후기의 원문·출처·게시 가능 여부를 확인해 주세요.');
 const source=String(form.get('review_source_url')||'').trim();
 if(source){try{const url=new URL(source);if(url.protocol!=='https:'||url.username||url.password||source.length>500)throw Error();}catch{throw Error('고객 후기 출처는 올바른 HTTPS 주소로 입력해 주세요.');}}
 return {customer_reviews:JSON.stringify(reviews),review_source_url:source,reviews_confirmed:reviews.length?1:0};
}
