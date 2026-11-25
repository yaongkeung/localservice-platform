import {test} from 'node:test';
import assert from 'node:assert/strict';
import {indexNowProof,notifyIndexNow,scheduleIndexNow} from '../src/indexnow.js';
const key='0123456789abcdef0123456789abcdef',env={APP_ENV:'production',SEARCH_INDEXING:'enabled',INDEXNOW_KEY:key},origin='https://gongsa8282.xyz';
test('IndexNow ownership proof is only available on the enabled canonical production host',async()=>{
 const url=`${origin}/${key}.txt`,proof=indexNowProof(new Request(url),env);assert.equal(await proof.text(),key);assert.match(proof.headers.get('content-type'),/text\/plain/);assert.equal(await indexNowProof(new Request(url,{method:'HEAD'}),env).text(),'');
 for(const [target,settings] of [[url,{...env,APP_ENV:'staging'}],[url,{...env,SEARCH_INDEXING:'disabled'}],[url,{...env,INDEXNOW_KEY:'invalid!'}],[url+'?x=1',env],[url.replace('gongsa8282.xyz','example.com'),env],[origin+'/wrong.txt',env]])assert.equal(indexNowProof(new Request(target),settings),null);
});
test('notifications send only canonical changes, de-duplicate and report acceptance separately from verification',async()=>{
 let calls=0;const path='/배관/인천/원당동/원당동-옥상누수.html';
 for(const status of [200,202,403,429]){const result=await notifyIndexNow(env,[path,path,origin+path,'/admin/','/uploads/1/x.jpg','https://example.com/a/b/c/d.html',path+'?x=1'],async(url,init)=>{calls++;assert.equal(url,'https://searchadvisor.naver.com/indexnow');assert.equal(init.method,'POST');assert.equal(init.redirect,'error');const body=JSON.parse(init.body);assert.equal(body.host,'gongsa8282.xyz');assert.equal(body.keyLocation,`${origin}/${key}.txt`);assert.deepEqual(body.urlList,[new URL(path,origin).href]);return new Response(null,{status});});assert.equal(result.state,status===200?'accepted':status===202?'verification_pending':'rejected');assert.equal(result.count,1);}
 assert.equal(calls,4);assert.equal((await notifyIndexNow({},[path],()=>{throw Error('must not call');})).state,'disabled');assert.equal((await notifyIndexNow(env,['/admin/'],()=>{throw Error('must not call');})).state,'skipped');
});
test('network failure does not throw into publishing and disabled environments do not schedule requests',async()=>{
 assert.equal((await notifyIndexNow(env,['/'],async()=>{throw Error('offline');})).state,'unavailable');let scheduled=0;const ctx={waitUntil(){scheduled++;}};scheduleIndexNow(ctx,{},['/']);scheduleIndexNow(undefined,env,['/']);assert.equal(scheduled,0);
});
test('a failed background eligibility lookup never rejects the publication lifetime task',async()=>{
 const tasks=[];scheduleIndexNow({waitUntil(task){tasks.push(task);}},env,{prepare(){throw Error('temporary database failure');}},120);assert.equal(tasks.length,1);await assert.doesNotReject(tasks[0]);
});
