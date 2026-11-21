import {localDatabase} from './local-db.mjs';
import {hashPassword,randomToken} from '../src/auth.js';
const login=process.argv[2]||'admin';
if(!/^[a-zA-Z0-9_-]{3,40}$/.test(login))throw Error('Use 3-40 letters, numbers, underscores or hyphens for login ID.');
const db=await localDatabase();
try{
 if(await db.prepare('SELECT id FROM users WHERE login_id=?').bind(login).first())throw Error('Account already exists. No password was changed.');
 const password=randomToken();
 await db.prepare("INSERT INTO users(name,login_id,password_hash,role) VALUES(?,?,?,'SUPER_ADMIN')").bind('관리자',login,await hashPassword(password)).run();
 console.log(`Local administrator created.\nLogin: ${login}\nPassword (save securely): ${password}\nhttp://localhost:8787/admin/\nThis account exists only in your local database.`);
}finally{db.close();}
