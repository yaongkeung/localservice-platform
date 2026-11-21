export function primaryWorkKeyword(value){
 const text=String(value||'').trim().replace(/\s+/g,' '),first=text.split(/[,·/|]+/)[0].trim(),words=first.split(' ');
 // Preserve phrases such as 방충망 교체, 녹취 속기사무소, 중고 사무용 가구.
 // A complete service followed by a different service/advertising phrase is a list.
 const complete=/(?:유리|유리집|유리가게|도어|샷시|샤시|방충망|방범창|누수|누수탐지|배관점검|하수구|간판|렌트카|흥신소|피아노|용달|이삿짐센터|폐기물|고물상|보일러수리|헌옷|생수배달|스카이차|사다리차|중고가전|중고가구|데이터복구|재활용센터|퀵서비스|중고차|썬팅|포크레인|방수업체|컴퓨터수리|인력업체|간병인|열쇠|철거|인테리어|청소|도배장판|마루시공|폐차장|화장실칸막이|개인회생|유품정리|자동문|자동차밧데리|조립식칸막이|커튼|솜틀집|골동품|인쇄|소방시설)$/;
 const action=/^(?:설치|수리|시공|교체|점검|상담|복구|탐지|배달|보수|청소|복원|철거)(?:전문)?$/;
 if(words.length>1&&complete.test(words[0]))return action.test(words[1])?words.slice(0,2).join(' '):words[0];
 return first;
}
