import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {editorActions} from '../src/editor-actions.js';
import {uploadClient} from '../src/upload-client.js';

test('status action uses the declared form endpoint when a named control masks form.action',async()=>{
 let submit,requested,navigated;
 const form={action:'',getAttribute:name=>name==='action'?'/admin/posts/120/status/':null,addEventListener:(_,handler)=>{submit=handler;}};
 const context={document:{querySelectorAll:selector=>selector==='form[data-status-action]'?[form]:[]},URLSearchParams,
  FormData:class{*[Symbol.iterator](){yield ['action','withdraw'];yield ['version','7'];}},
  location:{pathname:'/admin/posts/120/',assign:url=>{navigated=url;}},
  operationUi:()=>({success(){},error(message){throw Error(message);}}),
  fetch:async(url,options)=>{requested={url,options};return {ok:true,headers:new Headers({'content-type':'application/json'}),json:async()=>({version:8,location:'/admin/posts/120/'})};}};
 vm.runInNewContext(`(${editorActions.toString()})()`,context);
 await submit({preventDefault(){},submitter:{}});
 assert.equal(requested.url,'/admin/posts/120/status/');
 assert.equal(requested.options.credentials,'same-origin');
 assert.equal(requested.options.body.get('action'),'withdraw');
 assert.equal(navigated,'/admin/posts/120/');
});

test('re-generating on the result URL reloads the saved article instead of leaving old content disabled',async()=>{
 let submit,reloaded=0,assigned=0;
 const button={},message={},location='/admin/posts/119/?generated=1#generated-post';
 const fields={'input[type=file]':{files:[]},'[role=status]':message,button,'[name=version]':{value:'8'},'[name=csrf]':{value:'test-csrf'}};
 const form={dataset:{generateUrl:'/admin/posts/119/generate/',existingPhotos:'3'},querySelector:selector=>fields[selector],addEventListener:(_,handler)=>{submit=handler;}};
 const context={document:{querySelector:()=>null,addEventListener(){},querySelectorAll:selector=>selector==='form[data-photo-upload]'?[form]:[]},URLSearchParams,URL,setInterval:()=>1,clearInterval(){},
  location:{href:'https://example.test'+location,pathname:'/admin/posts/119/',reload(){reloaded++;},assign(){assigned++;}},
  operationUi:()=>({step(){},error(message){throw Error(message);}}),
  fetch:async()=>({ok:true,headers:new Headers({'content-type':'application/json'}),json:async()=>({location})})};
 vm.runInNewContext(`(${uploadClient.toString()})()`,context);
 await submit({preventDefault(){}});assert.equal(reloaded,1);assert.equal(assigned,0);
});

test('automatic repair is visible while the generation request runs; failed progress reads cannot stop saving',async()=>{
 let submit,tick,finish,cleared=0,navigated,progressCalls=0;const steps=[],button={},message={},fields={'input[type=file]':{files:[]},'[role=status]':message,button,'[name=version]':{value:'4'},'[name=csrf]':{value:'test-csrf'}};
 const form={dataset:{generateUrl:'/admin/posts/131/generate/',existingPhotos:'6'},querySelector:key=>fields[key],addEventListener:(_,handler)=>{submit=handler;}},pending=new Promise(resolve=>{finish=resolve;});
 const context={document:{querySelector:()=>null,addEventListener(){},querySelectorAll:selector=>selector==='form[data-photo-upload]'?[form]:[]},URL,URLSearchParams,setInterval:callback=>{tick=callback;return 1;},clearInterval:()=>{cleared++;},location:{origin:'https://gongsa8282.xyz',href:'https://gongsa8282.xyz/admin/posts/131/',pathname:'/admin/posts/131/',assign:value=>{navigated=value;}},operationUi:()=>({step:(_,text)=>steps.push(text),error:text=>{throw Error(text);}}),fetch:async(url,options)=>{if(options.method==='POST')return pending;progressCalls++;assert.equal(new URL(url).searchParams.get('version'),'4');return progressCalls===1?Response.json({state:'RUNNING',stage:'photo-analysis-retry',attempt:0}):progressCalls===2?Response.json({state:'RUNNING',stage:'repairing-copy',attempt:1}):new Response('unavailable',{status:503});}};
 vm.runInNewContext(`(${uploadClient.toString()})()`,context);const running=submit({preventDefault(){}});await Promise.resolve();await Promise.resolve();assert.ok(tick);await tick();assert.match(message.textContent,/사진 분석 응답을 한 번 더/);await tick();assert.match(message.textContent,/겹친 문구를 자동/);assert.ok(steps.some(text=>/사진은 다시 분석하지/.test(text)));await tick();finish(Response.json({location:'/admin/posts/131/?generated=1#generated-post'}));await running;assert.equal(cleared,1);assert.equal(navigated,'/admin/posts/131/?generated=1#generated-post');await tick();assert.equal(progressCalls,3);
});
