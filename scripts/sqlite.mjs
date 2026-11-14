import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
export function sqliteDatabase(path=':memory:'){
 const raw=new DatabaseSync(path);raw.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
 const prepare=sql=>{let args=[];return {bind(...values){args=values;return this;},async first(){return raw.prepare(sql).get(...args)||null;},async all(){return {results:raw.prepare(sql).all(...args)};},async run(){const result=raw.prepare(sql).run(...args);return {success:true,meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}};}};};
 return {raw,prepare,async batch(statements){raw.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());raw.exec('COMMIT');return results;}catch(error){raw.exec('ROLLBACK');throw error;}},close(){raw.close();}};
}
export async function migrate(db){
 db.raw.exec('CREATE TABLE IF NOT EXISTS d1_migrations(id INTEGER PRIMARY KEY,name TEXT UNIQUE,applied_at TEXT DEFAULT CURRENT_TIMESTAMP)');
 const folder=new URL('../migrations/',import.meta.url);
 for(const name of (await readdir(folder)).filter(n=>n.endsWith('.sql')).sort()){
  if(await db.prepare('SELECT id FROM d1_migrations WHERE name=?').bind(name).first())continue;
  db.raw.exec('BEGIN');try{db.raw.exec(await readFile(new URL(name,folder),'utf8'));await db.prepare('INSERT INTO d1_migrations(name) VALUES(?)').bind(name).run();db.raw.exec('COMMIT');}catch(e){db.raw.exec('ROLLBACK');throw e;}
 }
}
