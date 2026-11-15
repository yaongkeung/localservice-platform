import {mkdir,writeFile,readFile,unlink} from 'node:fs/promises';
export function localBucket(root=new URL('../.local/photos/',import.meta.url)){
 const file=key=>{if(!/^\d+\/[a-f0-9]{64}-(?:cover|thumb)\.jpg$/.test(key))throw Error('Invalid object key');return new URL(key,root);};
 return {
  async put(key,value){const url=file(key);await mkdir(new URL('./',url),{recursive:true});await writeFile(url,value);return {key};},
  async get(key){try{const bytes=await readFile(file(key));return {body:bytes,size:bytes.length};}catch(error){if(error.code==='ENOENT')return null;throw error;}},
  async delete(keys){for(const key of typeof keys==='string'?[keys]:keys)try{await unlink(file(key));}catch(error){if(error.code!=='ENOENT')throw error;}}
 };
}
