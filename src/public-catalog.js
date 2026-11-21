import {descendantServiceIds} from './services.js';
import {matchesTownship} from './township-groups.js';

// Keep the full editable catalog; only link to boards with public content.
export function populatedServices(services,posts){
 const used=new Set(posts.map(post=>post.service_id));
 return services.filter(service=>descendantServiceIds(service,services).some(id=>used.has(id)));
}
export function populatedRegions(regions,posts){
 const used=regions.filter(region=>posts.some(post=>post.region_id===region.id));
 return regions.filter(region=>used.some(child=>child.id===region.id||child.slug.startsWith(region.slug+'/')||region.group_key&&matchesTownship(child.group_key||child.admin_code,region.group_key)));
}
