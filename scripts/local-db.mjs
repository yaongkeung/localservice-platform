import {mkdir} from 'node:fs/promises';
import {sqliteDatabase,migrate} from './sqlite.mjs';
import {seed} from './seed.mjs';
export async function localDatabase(){
 await mkdir(new URL('../.local/',import.meta.url),{recursive:true});
 const db=sqliteDatabase(new URL('../.local/portal.sqlite',import.meta.url));
 await migrate(db);await seed(db);return db;
}
