const codes=new Set([3003,3006,3007,3008,3023,3036,3040,3041,3042,5004,5007,5016,5018,5019,5028,5035]);
export function generationFailure(error){
 const message=String(error?.message||''),found=message.match(/\b(?:3\d{3}|5\d{3})\b/g)||[];
 const code=[Number(error?.code),...found.map(Number)].find(value=>codes.has(value))||null;
 const category=code===3036?'ai-quota':code===3040?'ai-capacity':code===3007||/timed?\s*out|timeout/i.test(message)?'ai-timeout':code===3006?'ai-request-size':code===3023||code===5035||code===5018||code===3041?'ai-access':error?.name==='SyntaxError'?'invalid-json':/memory|CPU time|allocation/i.test(message)?'runtime-resource':/D1|database/i.test(message)?'database':'unknown';
 return {category,provider_code:code,error_type:['Error','TypeError','SyntaxError','AiError','InferenceUpstreamError'].includes(error?.name)?error.name:'OtherError'};
}
export function visionResponseInfo(result){
 const value=result?.response??result,number=value=>Number.isFinite(value)&&value>=0?value:null;
 const finish=result?.choices?.[0]?.finish_reason||result?.response?.choices?.[0]?.finish_reason||result?.finish_reason;
 return {type:typeof value,length:typeof value==='string'?value.length:null,finish_reason:['stop','length','content_filter','tool_calls'].includes(finish)?finish:null,completion_tokens:number(result?.usage?.completion_tokens||result?.response?.usage?.completion_tokens),prompt_tokens:number(result?.usage?.prompt_tokens||result?.response?.usage?.prompt_tokens)};
}
export function generationFailureMessage(failure){
 return ({'ai-quota':'자동 작성 서비스의 사용 한도에 도달했습니다. 관리자에게 사용량 확인을 요청해 주세요. 글과 사진은 저장되어 있습니다.','ai-capacity':'자동 작성 서비스가 혼잡하여 요청을 처리하지 못했습니다. 글과 사진은 저장되어 있으므로 잠시 후 등록된 사진으로 다시 작성해 주세요.','ai-timeout':'자동 작성 서비스의 응답 시간이 초과됐습니다. 글과 사진은 저장되어 있습니다.','invalid-json':'자동 작성 결과가 올바른 형식으로 완성되지 않았습니다. 글과 사진은 저장되어 있습니다.','ai-request-size':'사진 분석 요청의 크기를 처리하지 못했습니다. 글과 사진은 저장되어 있습니다.'})[failure.category]||null;
}
