import {regionData} from './regions-data.js';
// Group numbered administrative subdivisions for search/authoring. This is a display
// and service-area group, not a newly invented official administrative code.
export const townshipName=name=>String(name).replace(/제?\d+(?:[·.,ㆍ]\d+)*동$/,'동');
const cache=new Map();
export function townshipGroups(district){
 if(cache.has(district))return cache.get(district);
 const groups=new Map();
 for(const item of regionData.dongs[district]||[]){const name=townshipName(item.name);if(!groups.has(name))groups.set(name,[]);groups.get(name).push(item);}
 const result=[...groups].map(([name,items])=>({name,code:items.length>1||items[0].name!==name?district+':'+name:items[0].code,members:items.map(item=>item.code)}));
 cache.set(district,result);return result;
}
export const townshipOptions=district=>townshipGroups(district).map(({code,name})=>({code,name}));
export const groupForCode=code=>townshipGroups(String(code||'').slice(0,5)).find(item=>item.code===code||item.members.includes(code));
export function matchesTownship(postCode,selected){
 if(!postCode||!selected)return false;
 if(postCode===selected)return true;
 const group=groupForCode(selected);return !!group&&(postCode===group.code||group.members.includes(postCode));
}
