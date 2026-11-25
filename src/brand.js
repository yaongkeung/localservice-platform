import {brandWordmark} from './brand-wordmark.js';
import {pinSvg} from './brand-pin.js';
export const siteName='동네핀';
export const siteTagline='우리 동네 전문가를 콕.';
const e=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function brandMark(href='/',subtitle=siteTagline){
 return `<a class="brand" href="${e(href)}" aria-label="${siteName} ${e(subtitle)}">${pinSvg}<span class="brand-copy">${brandWordmark}<small>${e(subtitle)}</small></span></a>`;
}
