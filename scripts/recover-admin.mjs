import {localDatabase} from './local-db.mjs';
import {randomToken} from '../src/auth.js';
import {rotateCredential} from '../src/account.js';
const login=process.argv[2];
if(!login||!process.argv.includes('--confirm'))throw Error('Local recovery only. Run: npm run admin:recover -- LOGIN --confirm. This ends all existing sessions.');
const db=await localDatabase();
try{
 const user=await db.prepare("SELECT * FROM users WHERE login_id=? AND role='SUPER_ADMIN' AND status='ACTIVE'").bind(login).first();
 if(!user)throw Error('Active local SUPER_ADMIN account not found. No account was changed.');
 const password=randomToken();await rotateCredential(db,user,user,password,'RECOVER',true);
 console.log(`Local administrator recovered.\nLogin: ${login}\nTemporary password (save securely): ${password}\nAll old sessions ended. Change this password after login.\nNo remote Cloudflare account or database was changed.`);
}finally{db.close();}
