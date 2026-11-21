import {primaryWorkKeyword} from './work-keyword.js';
import {titleFor} from './editor-title.js';
import {titleRegionForCode} from './title-region.js';
import {townshipName} from './township-groups.js';

// The short on-page heading and descriptive search title have the same topic.
// Stored originals and permanent paths are never rewritten by presentation.
export function pageTitles(post,region={},service={}){
 const area=String(post.search_region||titleRegionForCode(region.group_key||region.admin_code)||region.name||'').trim(),keyword=primaryWorkKeyword(post.search_keyword||post.service_name||service.name);
 if(post.sample||!area||!keyword)return {heading:post.title||'',search:post.seo_title||post.title||'',topic:post.title||''};
 const local=townshipName(area.split(/\s+/).at(-1)),heading=local+' '+keyword,topic=area+' '+keyword;
 if(post.seo_title?.trim())return {heading,topic,search:post.seo_title.trim()};
 let copy={};try{copy=typeof post.page_copy==='string'?JSON.parse(post.page_copy):post.page_copy||{};}catch{/* Legacy text is still usable below. */}
 const title=String(post.title||''),related=post.related_keyword||copy.related_keyword||'';
 let suffix,extra=related;
 if(title.includes(' | ')){
  // Honour an edited search description in the new title format.
  suffix=title.slice(title.indexOf(' | ')+3).replace(/\s*\|\s*동네핀\s*$/,'');extra='';
 }else{
  const oldPrefix=[area,post.search_keyword,related].filter(Boolean).join(' '),shortPrefix=[area,keyword,related].filter(Boolean).join(' ');
  const automatic=title===topic||[oldPrefix,shortPrefix].some(prefix=>title===prefix||title===prefix+(copy.title_suffix?' · '+copy.title_suffix:''));
  if(copy.version===1&&automatic)suffix=copy.title_suffix;
  else{
   suffix=title;for(const label of [area,post.search_keyword,keyword,related].filter(Boolean))if(suffix.startsWith(label))suffix=suffix.slice(label.length).trim();
   suffix=suffix.replace(/^[\s·|,\-]+/,'');
   if(!suffix)suffix=String(post.summary||'').replace(/[*#`]/g,'').split(/(?<=[.!?。！？])\s+/)[0];
  }
 }
 return {heading,topic,search:titleFor(area,keyword,extra,suffix)};
}
