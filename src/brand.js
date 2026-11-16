export const siteName='이웃핀';
export const siteTagline='우리 동네 전문가를 콕.';
const e=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function brandMark(href='/',subtitle=siteTagline){
 return `<a class="brand" href="${e(href)}" aria-label="${siteName} ${e(subtitle)}"><svg class="brand-pin" viewBox="0 0 32 36" width="30" height="34" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16 1C8.3 1 2 7.2 2 15c0 9.6 14 20 14 20s14-10.4 14-20C30 7.2 23.7 1 16 1Z"/><circle cx="16" cy="14.5" r="7" fill="#fff8eb"/><circle cx="16" cy="14.5" r="3" fill="#ef9a74"/></svg><span class="brand-copy">이웃<span>핀</span><small>${e(subtitle)}</small></span></a>`;
}
