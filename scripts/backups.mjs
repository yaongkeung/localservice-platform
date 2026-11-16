import {backup,DatabaseSync} from 'node:sqlite';
import {mkdir,readFile,writeFile,copyFile,realpath,lstat} from 'node:fs/promises';
import {createReadStream,constants} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,relative,dirname,sep,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve('.local'),photoPattern=/^photos\/\d+\/[a-f0-9]{64}-(?:cover|thumb)\.jpg$/;
function inside(parent,path){const rel=relative(parent,resolve(path));if(isAbsolute(rel)||rel==='..'||rel.startsWith('..'+sep)||resolve(parent,rel)!==resolve(path))throw Error('Path is outside local data directory.');return resolve(path);}
async function checkedFile(parent,path){inside(root,parent);inside(parent,path);if((await lstat(path)).isSymbolicLink())throw Error('Symbolic links are not supported.');inside(parent,await realpath(path));return path;}
async function freshDirectory(path){inside(root,path);if(resolve(path)===root)throw Error('Cannot overwrite local data root.');await mkdir(dirname(path),{recursive:true});inside(root,await realpath(dirname(path)));await mkdir(path);}
async function checksum(path){const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');}
function references(db){const files=new Set(['portal.sqlite']);for(const row of db.prepare('SELECT storage_key,thumbnail_key FROM post_images').all())for(const key of [row.storage_key,row.thumbnail_key]){if(!key||key.startsWith('/media/'))continue;const path='photos/'+key.slice('/uploads/'.length);if(!key.startsWith('/uploads/')||!photoPattern.test(path))throw Error('Unsupported stored image path.');files.add(path);}return [...files];}
export async function createBackup(source= root,destination=resolve(root,'backups',new Date().toISOString().replace(/[:.]/g,'-'))){
 await mkdir(root,{recursive:true});if(await realpath(root)!==root)throw Error('Local root must not be a symbolic link.');inside(root,source);inside(root,destination);await checkedFile(source,resolve(source,'portal.sqlite'));await freshDirectory(destination);
 const live=new DatabaseSync(resolve(source,'portal.sqlite'),{readOnly:true});try{await backup(live,resolve(destination,'portal.sqlite'));}finally{live.close();}
 const snapshot=new DatabaseSync(resolve(destination,'portal.sqlite'),{readOnly:true});let files;try{files=references(snapshot);}finally{snapshot.close();}
 const manifest={format:1,created_at:new Date().toISOString(),files:[]};
 for(const file of files){const target=resolve(destination,file);if(file!=='portal.sqlite'){const from=await checkedFile(source,resolve(source,file));await mkdir(dirname(target),{recursive:true});await copyFile(from,target,constants.COPYFILE_EXCL);}manifest.files.push({path:file,sha256:await checksum(target)});}
 await writeFile(resolve(destination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});await verifyBackup(destination);return {path:destination,files:files.length};
}
export async function verifyBackup(directory){
 inside(root,directory);await checkedFile(directory,resolve(directory,'manifest.json'));const manifest=JSON.parse(await readFile(resolve(directory,'manifest.json'),'utf8'));
 if(manifest.format!==1||!Array.isArray(manifest.files)||manifest.files.length>100000)throw Error('Invalid backup manifest.');const names=new Set();
 for(const file of manifest.files){if(typeof file.path!=='string'||file.path!=='portal.sqlite'&&!photoPattern.test(file.path)||names.has(file.path)||!/^[a-f0-9]{64}$/.test(file.sha256||''))throw Error('Invalid backup file path or checksum.');names.add(file.path);await checkedFile(directory,resolve(directory,file.path));if(await checksum(resolve(directory,file.path))!==file.sha256)throw Error('Backup checksum mismatch.');}
 if(!names.has('portal.sqlite'))throw Error('Database missing from backup.');
 const db=new DatabaseSync(resolve(directory,'portal.sqlite'),{readOnly:true});try{if(db.prepare('PRAGMA quick_check').get().quick_check!=='ok'||db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Backup database integrity check failed.');for(const name of references(db))if(!names.has(name))throw Error('Referenced photo missing from backup.');}finally{db.close();}
 return manifest;
}
export async function restoreBackup(source,destination){
 const manifest=await verifyBackup(source);await freshDirectory(destination);
 for(const file of manifest.files){const target=resolve(destination,file.path);await mkdir(dirname(target),{recursive:true});await copyFile(resolve(source,file.path),target,constants.COPYFILE_EXCL);}
 const db=new DatabaseSync(resolve(destination,'portal.sqlite'));try{db.exec('DELETE FROM sessions; DELETE FROM login_attempts;');}finally{db.close();}
 return {path:destination,files:manifest.files.length,sessionsCleared:true,activated:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{const [mode,source,destination]=process.argv.slice(2);let result;if(mode==='create')result=await createBackup();else if(mode==='verify'&&source){const manifest=await verifyBackup(resolve(source));result={verified:true,files:manifest.files.length};}else if(mode==='restore'&&source&&destination)result=await restoreBackup(resolve(source),resolve(destination));else throw Error('Use create, verify BACKUP, or restore BACKUP NEW_DIRECTORY (inside .local).');console.log(JSON.stringify(result));}catch(error){console.error(error.message);process.exitCode=1;}
}
