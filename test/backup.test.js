import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {resolve,join,dirname,basename} from 'node:path';
import {sqliteDatabase,migrate} from '../scripts/sqlite.mjs';
import {seed} from '../scripts/seed.mjs';
import {createBackup,verifyBackup,restoreBackup} from '../scripts/backups.mjs';
test('backup and separate-directory restore preserve referenced photos and data while discarding sessions',async()=>{
 const root=resolve('.local');await mkdir(root,{recursive:true});const dir=await mkdtemp(join(root,'backup-test-'));let db;
 try{
  const source=join(dir,'source'),target=join(dir,'backup'),restored=join(dir,'restored');await mkdir(source);db=sqliteDatabase(join(source,'portal.sqlite'));await migrate(db);await seed(db);
  const key='101/'+('a'.repeat(64))+'-cover.jpg';await mkdir(join(source,'photos','101'),{recursive:true});await writeFile(join(source,'photos',key),'fixture-photo');
  await db.prepare('INSERT INTO post_images(post_id,storage_key,alt_text) VALUES(101,?,?)').bind('/uploads/'+key,'백업 확인용 사진').run();
  await db.prepare("INSERT INTO users(id,name,login_id,password_hash,role) VALUES(1,'백업 관리자','backup-admin','hash','ADMIN')").run();await db.prepare("INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES('session',1,'csrf',9999999999999)").run();
  const companyToken='b'.repeat(64),companyFolder=join(source,'photos','company-1');await mkdir(companyFolder);
  for(const suffix of ['cover','thumb'])await writeFile(join(companyFolder,companyToken+'-'+suffix+'.jpg'),'fixture-company-'+suffix);
  await db.prepare('INSERT INTO company_images(company_id,storage_key,thumbnail_key,alt_text,content_hash,width,height,excluded) VALUES(1,?,?,?,?,1,1,1)').bind('/company-photos/1/'+companyToken+'-cover.jpg','/company-photos/1/'+companyToken+'-thumb.jpg','제외된 업체 사진','fixture-hash').run();
  const result=await createBackup(source,target);assert.equal(result.files,4);await verifyBackup(target);await assert.rejects(createBackup(source,target),/exist/i);
  const restore=await restoreBackup(target,restored);assert.equal(restore.activated,false);await assert.rejects(restoreBackup(target,restored),/exist/i);
  const copy=sqliteDatabase(join(restored,'portal.sqlite'));try{assert.equal((await copy.prepare('SELECT COUNT(*) AS n FROM posts').first()).n,3);assert.equal((await copy.prepare('SELECT COUNT(*) AS n FROM sessions').first()).n,0);}finally{copy.close();}
  assert.equal(await readFile(join(restored,'photos',key),'utf8'),'fixture-photo');assert.equal(await readFile(join(restored,'photos','company-1',companyToken+'-cover.jpg'),'utf8'),'fixture-company-cover');assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM sessions').first()).n,1);
  await writeFile(join(target,'photos',key),'corrupted');await assert.rejects(verifyBackup(target),/checksum/);
 }finally{db?.close();assert.equal(dirname(resolve(dir)),root);assert.ok(basename(dir).startsWith('backup-test-'));await rm(dir,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
});
