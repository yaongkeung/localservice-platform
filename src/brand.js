import {brandWordmark} from './brand-wordmark.js';
export const siteName='이웃핀';
export const siteTagline='우리 동네 전문가를 콕.';
const e=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function brandMark(href='/',subtitle=siteTagline){
 return `<a class="brand" href="${e(href)}" aria-label="${siteName} ${e(subtitle)}"><svg class="brand-pin" viewBox="0 0 48 48" width="38" height="42" aria-hidden="true" focusable="false"><g transform="rotate(-32 24 23)"><path d="M22.6 30H25.4L24 45Z" fill="#8f8583"/><path d="M19 13H29V20C29 23.7 31.8 26.5 35 29C35 33 13 33 13 29C16.2 26.5 19 23.7 19 20Z" fill="#df4139"/><ellipse cx="24" cy="29" rx="11" ry="3" fill="#bc2f2d"/><path d="M13 8C13 3 35 3 35 8V12C35 17 13 17 13 12Z" fill="#df4139"/><ellipse cx="24" cy="8" rx="11" ry="4" fill="#f46559"/><path d="M17 7C20 5.7 25 5.5 29 6.6" fill="none" stroke="#ffb3a7" stroke-width="1.5" stroke-linecap="round"/></g></svg><span class="brand-copy">${brandWordmark}<small>${e(subtitle)}</small></span></a>`;
}
