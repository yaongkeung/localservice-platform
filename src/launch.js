import {siteOrigin} from './seo.js';
export function launchState(request,env={}){
 const canonical=new URL(request.url).origin===siteOrigin,production=env.APP_ENV==='production';
 return {production,canonical,indexing:production&&canonical&&env.SEARCH_INDEXING==='enabled',
  blocked:env.APP_ENV==='staging'||production&&(!canonical||env.SEARCH_INDEXING!=='enabled'),
  verification:/^[a-f0-9]{40}$/i.test(env.NAVER_SITE_VERIFICATION||'')?env.NAVER_SITE_VERIFICATION:''};
}
