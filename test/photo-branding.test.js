import {test} from 'node:test';
import assert from 'node:assert/strict';
import {photoBrand,paintBrandedPhoto} from '../src/photo-branding.js';
import {visionInput} from '../src/draft-assistant.js';
test('photo branding follows the current page phone, verified company fallback and supplied work only',()=>{
 const company={name:'유리 업체',phone:'01011112222',phone_verified:1};
 assert.equal(photoBrand({contact_phone:'070-1234-5678',search_keyword:'강화유리',search_region:'김포시'},company).phone,'070-1234-5678');
 assert.equal(photoBrand({},company).phone,'010-1111-2222');assert.equal(photoBrand({},{...company,phone_verified:0}).phone,'');
 assert.doesNotMatch(JSON.stringify(photoBrand({},company)),/24시|무료|당일|최고|보장/);
});
test('the shared canvas layout keeps the full photo above the banner and fits landscape, portrait and long labels',()=>{
 for(const [width,height]of [[1600,900],[700,1600],[3000,300],[200,200]]){
  const text=[],draw=[],ctx={scale(){},fillRect(){},createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};},save(){},restore(){},beginPath(){},rect(){},clip(){},arc(){},fill(){},stroke(){},moveTo(){},bezierCurveTo(){},quadraticCurveTo(){},roundRect(){},drawImage(...args){draw.push(args);},measureText(value){return {width:value.length*Number(this.font?.match(/ (\d+)px/)?.[1]||24)};},fillText(...args){text.push(args);}},canvas={getContext:()=>ctx};
  const brand={company:'가나다'.repeat(25),phone:'010-1234-5678',region:'용인시 처인구 마평동',keyword:'강화유리 창호 상담',message:'사진과 함께 편하게 문의해 주세요'};paintBrandedPhoto(canvas,{width,height},brand);
  assert.ok(canvas.width<=1280&&canvas.height<=1280);assert.equal(draw.length,1);assert.equal(draw[0].length,5);assert.ok(draw[0][3]<=1200&&draw[0][4]<=1050);assert.ok(text.some(item=>item[0]===brand.phone));assert.ok(!text.some(item=>/undefined|null/.test(item[0])));
 }
});
test('AI observes the unedited source rather than the advertising text and uses the source thumbnail when needed',async()=>{
 const keys=[],base='/uploads/1/'+'a'.repeat(64),source='/uploads/1/'+'b'.repeat(64),image={id:1,storage_key:base+'-cover.jpg',thumbnail_key:base+'-thumb.jpg',source_storage_key:source+'-cover.jpg',source_thumbnail_key:source+'-thumb.jpg'};
 const payload=await visionInput({PHOTOS:{async get(key){keys.push(key);return key.endsWith('-cover.jpg')?{size:300000}:{size:4,arrayBuffer:async()=>new Uint8Array([1,2,3,4]).buffer};}}},{},{},[image]);
 assert.equal(keys.length,2);assert.ok(keys[0].endsWith('b'.repeat(64)+'-cover.jpg'));assert.ok(keys[1].endsWith('b'.repeat(64)+'-thumb.jpg'));assert.ok(payload.messages[1].content.some(item=>item.image_url?.url==='data:image/jpeg;base64,AQIDBA=='));
});
