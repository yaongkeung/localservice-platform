import {titleRegionForCode} from './title-region.js';
import {townshipName} from './township-groups.js';
// Repair missing locality labels when presenting legacy real posts; preserve stored originals and URLs.
export function withRegionTitle(post,region={}){
 if(!post?.title||post.sample)return post;
 const label=String(post.search_region||titleRegionForCode(region.group_key||region.admin_code)||townshipName(region.name||'')).trim();
 if(!label)return post;
 const normal=value=>String(value).normalize('NFKC').replace(/\s+/g,'');
 const qualify=value=>!value||normal(value).includes(normal(label))?value:Array.from(label+' '+value).slice(0,120).join('');
 return {...post,title:qualify(post.title),...(post.seo_title?{seo_title:qualify(post.seo_title)}:{})};
}
