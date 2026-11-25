export const currentMigration='0021_company_industry.sql';
export function storageReady(env){return typeof env.DB?.prepare==='function'&&typeof env.DB?.batch==='function'&&typeof env.PHOTOS?.get==='function'&&typeof env.PHOTOS?.put==='function'&&typeof env.ASSETS?.fetch==='function';}
export async function health(request,env){
 let ready=false;
 if(storageReady(env))try{ready=!!await env.DB.prepare('SELECT name FROM d1_migrations WHERE name=?').bind(currentMigration).first();}catch{/* Missing schema is not public diagnostic data. */}
 return new Response(request.method==='HEAD'?null:JSON.stringify({status:ready?'ok':'not_ready'}),{status:ready?200:503,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
}
