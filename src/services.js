export function descendantServiceIds(service,categories){
 const ids=new Set([service.id]);let changed=true;
 while(changed){changed=false;for(const category of categories)if(ids.has(category.parent_id)&&!ids.has(category.id)){ids.add(category.id);changed=true;}}
 return [...ids];
}
