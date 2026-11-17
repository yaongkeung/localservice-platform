const koreanOrder=new Intl.Collator('ko-KR',{numeric:true,sensitivity:'base'});
export const serviceIcons=['🔧','💡','🫧','🧰','🏠','🪟','🧹','❄️','🚪','🎨','🛠️','🚚','🏷️','🚗','🕵️','🎹','♻️','♨️','💧','🏗️','💻','🪑','📝','🤝','🛋️','🔑','⚖️','🧵','🖨️','🧯','📦','👕'];
export const normalServiceName=value=>String(value||'').normalize('NFKC').replace(/\s+/g,'').toLowerCase();
export const sortServices=rows=>[...rows].sort((a,b)=>koreanOrder.compare(a.name,b.name)||(a.id||0)-(b.id||0));
export function descendantServiceIds(service,categories){
 const ids=new Set([service.id]);let changed=true;
 while(changed){changed=false;for(const category of categories)if(ids.has(category.parent_id)&&!ids.has(category.id)){ids.add(category.id);changed=true;}}
 return [...ids];
}
