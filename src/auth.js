import {first,run} from './store.js';
const enc=new TextEncoder();
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
export const randomToken=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
export const digest=async text=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(text))));
export async function hashPassword(password,salt=randomToken()){
 const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(salt),iterations:100000},key,256);
 return `pbkdf2:100000:${salt}:${hex(new Uint8Array(bits))}`;
}
export async function verifyPassword(password,stored){
 const parts=stored.split(':');if(parts.length!==4||parts[0]!=='pbkdf2'||parts[1]!=='100000')return false;
 const actual=await hashPassword(password,parts[2]);let diff=actual.length^stored.length;
 for(let i=0;i<stored.length;i++)diff|=actual.charCodeAt(i)^stored.charCodeAt(i);
 return diff===0;
}
export const isAdmin=user=>['SUPER_ADMIN','ADMIN'].includes(user.role);
export function sessionCookie(request,token,maxAge=28800){
 const secure=new URL(request.url).protocol==='https:';
 return `ls_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure?'; Secure':''}`;
}
export async function session(db,request){
 const token=request.headers.get('cookie')?.match(/(?:^|;\s*)ls_session=([a-f0-9]{64})(?:;|$)/)?.[1];
 if(!token)return null;
 return first(db,"SELECT u.id,u.name,u.role,s.csrf,s.token_hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.status='ACTIVE'",await digest(token),Date.now());
}
export async function login(db,request,loginId,password){
 const ip=request.headers.get('cf-connecting-ip')||'local';
 const key=await digest(ip);const now=Date.now();
 await run(db,'DELETE FROM sessions WHERE expires_at<=?',now);
 await run(db,'DELETE FROM login_attempts WHERE reset_at<=?',now);
 const attempt=await first(db,'SELECT * FROM login_attempts WHERE key=?',key);
 if(attempt?.attempts>=10)return null;
 await run(db,'INSERT INTO login_attempts(key,attempts,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1',key,now+900000);
 const user=await first(db,"SELECT * FROM users WHERE login_id=? AND status='ACTIVE'",loginId);
 // Run the same password derivation for unknown users to avoid a cheap account probe.
 const fallback='pbkdf2:100000:'+'0'.repeat(64)+':'+'0'.repeat(64);
 const valid=await verifyPassword(password,user?.password_hash||fallback);
 if(!user||!valid)return null;
 const token=randomToken();
 await run(db,'INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)',await digest(token),user.id,randomToken(),now+28800000);
 return token;
}
