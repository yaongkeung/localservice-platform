export const css = `
:root{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-synthesis:none;line-height:1.6;color:#23344a;background:#f6f7f9}
*{box-sizing:border-box}body{margin:0}a{color:inherit;text-decoration:none}a:hover{text-decoration:underline}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #d69020;outline-offset:3px}
.wrap{max-width:1180px;margin:auto;padding:0 24px}main{min-height:65vh}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.skip{position:absolute;top:-100px}.skip:focus{top:0;padding:10px;background:white;z-index:10}
.masthead{background:white}.header{display:flex;align-items:center;gap:42px;min-height:112px}
.brand{font-size:32px;font-weight:900;letter-spacing:-1.7px;line-height:1.1;flex-shrink:0;color:#142c48}.brand span{color:#197b98}
.brand small{display:block;font-size:11px;letter-spacing:.4px;font-weight:500;color:#6c7888;margin-top:7px}.brand:hover{text-decoration:none}
.header-search{display:flex;border:2px solid #224666;width:470px;height:44px;background:white;min-width:0}
.header-search input{border:0;flex:1;min-width:0;font-size:14px;border-radius:0;padding:10px 14px;background:white}
.header-search button{width:68px;border:0;border-radius:0;background:#224666;color:white;font-size:14px;padding:8px}
.header-note{font-size:12px;color:#788394;margin-left:auto;white-space:nowrap}
.nav-band{background:#19344f;border-bottom:3px solid #63c7dc}
.main-nav{display:flex;gap:0;min-height:46px;align-items:stretch;overflow-x:auto;scrollbar-width:thin}
.main-nav a{padding:12px 23px;font-size:14px;font-weight:700;color:#edf4fa;white-space:nowrap}
.main-nav a:first-child{padding-left:0;padding-right:27px}.main-nav a[aria-current]{color:#ffdb83}.main-nav a:hover{background:#244866;text-decoration:none}
.notice{background:#edf1f5;color:#6c7888;font-size:11px;padding:7px 24px;text-align:center;border-bottom:1px solid #e0e6ed}
label{font-size:11px;color:#657589}select,input,button{font:inherit;width:100%;color:#23344a;padding:9px;border:1px solid #ced6df;border-radius:3px;background:white}
select{font-size:13px;min-width:0}button,.button{background:#21496a;color:white;border:0;padding:10px 17px;font-weight:650;cursor:pointer;border-radius:3px;display:inline-block;font-size:13px}
button:hover,.button:hover{background:#306284}.header-search button:hover{background:#306284}
.portal{padding-top:22px;padding-bottom:40px}.portal-intro{display:flex;align-items:baseline;gap:16px;border-bottom:1px solid #dce3ea;padding-bottom:16px;margin-bottom:21px}
.portal-intro h1{font-size:20px;letter-spacing:-.7px;margin:0;line-height:1.4}.portal-intro p{font-size:12px;color:#7b8796;margin:0}
.portal-layout{display:grid;grid-template-columns:minmax(0,1fr) 254px;gap:25px}.portal-content,.portal-sidebar{min-width:0}
.filter-panel{background:white;border:1px solid #d7e0e8;padding:16px 18px;margin-bottom:25px;border-top:2px solid #4b758d}
.filter-heading{display:flex;gap:12px;align-items:center;margin-bottom:10px}.filter-heading h2{font-size:13px;margin:0}.filter-heading span{font-size:11px;color:#80909e}
.region-filter{display:grid;grid-template-columns:1fr 1fr 1fr 84px;gap:9px;align-items:end}
.region-filter label select{display:block;margin-top:4px;height:35px}.region-filter button{height:35px;padding:5px;font-size:12px}
.filter-status{grid-column:1/-1;font-size:12px;margin:0;color:#a24b24}.filter-status:empty{display:none}
.board-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.board-heading>div:first-child{display:flex;align-items:baseline;gap:10px}
.board-kicker{color:#638497;font-size:12px}.board-heading h2{font-size:22px;letter-spacing:-.6px;margin:0}
.board-summary{display:flex;gap:10px;align-items:center;font-size:11px;color:#82909c}.reset-link{color:#2c6686;text-decoration:underline}
.service-tabs{display:flex;gap:0;overflow:auto;background:white;border:1px solid #d8e0e7;border-bottom:2px solid #254b68}
.service-tabs a{font-size:13px;padding:10px 17px;white-space:nowrap;color:#65798b}.service-tabs a[aria-current]{font-weight:750;color:#1c4e6d;background:#eaf5f8;box-shadow:inset 0 3px #2c9fba}.service-tabs a:hover{text-decoration:none;background:#eef5f9}
.board-notice{font-size:12px;color:#6a7a89;background:#edf2f6;border:1px solid #dce3eb;border-top:0;margin:0;padding:10px 14px}
.board-notice span{font-size:10px;font-weight:700;color:#286581;background:#dae9f0;padding:2px 6px;margin-right:7px;border-radius:2px}
.post-board{background:white;border:1px solid #d8e0e7;border-top:0}
.post-board table{width:100%;border-collapse:collapse;text-align:left;font-size:12px;table-layout:fixed}
.post-board th{padding:10px 8px;font-size:11px;color:#758397;background:#fafbfd;font-weight:500;text-align:center;border-bottom:1px solid #d8e0e7}
.post-board th:nth-child(1){width:44px}.post-board th:nth-child(3){width:68px}.post-board th:nth-child(4){width:100px}.post-board th:nth-child(5){width:58px}
.post-board td{padding:14px 8px;border-bottom:1px solid #e8edf2;color:#7a8796;text-align:center;overflow-wrap:anywhere;vertical-align:middle}
.post-board tr:last-child td{border-bottom:0}.post-board tr:hover td{background:#f6fafc}
.post-board .post-subject{text-align:left;color:#283e53}.board-category{display:block;font-size:10px;color:#29809a;margin-bottom:3px}
.board-title{font-size:14px;font-weight:550;line-height:1.5}.post-kind{display:inline-block;font-size:10px;color:#8f9aa8;margin-left:6px}
.post-number{font-variant-numeric:tabular-nums;font-size:11px}.board-bottom{display:flex;gap:16px;align-items:center;justify-content:space-between;font-size:11px;color:#81909d;padding:13px 0 20px}
.page-current{background:#234b68;color:white;width:25px;line-height:25px;text-align:center;font-size:12px}
.latest-section{margin-top:15px}.section-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:13px}.section-head h2{font-size:17px;margin:0;letter-spacing:-.4px}.count{font-size:11px;color:#8b97a6}
.mini-boards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.mini-board{background:white;border:1px solid #dce3ea;padding:14px}
.mini-board>div{display:flex;justify-content:space-between;align-items:baseline;gap:6px;border-bottom:1px solid #ebeff3;padding-bottom:9px}.mini-board h3{font-size:12px;margin:0}.all-link{font-size:11px;color:#46738e;white-space:nowrap}
.mini-board ul,.service-links{padding:0;margin:0;list-style:none}.mini-board li{font-size:12px;line-height:1.8;margin-top:10px;overflow-wrap:anywhere}
.sidebar-panel{background:white;border:1px solid #d7e0e8;margin-bottom:17px;padding:16px}.sidebar-heading{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #dce4ec;padding-bottom:10px;margin-bottom:6px}
.sidebar-heading h2{font-size:13px;margin:0}.accent-dot{width:7px;height:7px;background:#60c2d7;display:block;border-radius:50%}
.service-links li+li{border-top:1px solid #edf1f5}.service-links a{display:block;font-size:12px;padding:10px 1px;color:#526a80}
.region-shortcuts{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-top:9px}.region-shortcuts a{padding:7px 2px;font-size:11px;color:#557187;overflow-wrap:anywhere}
.sidebar-guide{background:#eaf2f7;border-left:3px solid #69c6d8;padding:18px;font-size:12px;color:#667f92}
.guide-label{font-size:10px;color:#3a859d;font-weight:700}.sidebar-guide h2{font-size:17px;margin:10px 0;color:#23455f;line-height:1.5;letter-spacing:-.5px}.sidebar-guide p{font-size:11px;line-height:1.8}.sidebar-guide>a{display:inline-block;border-top:1px solid #cddde7;padding-top:12px;font-size:11px;color:#2b617d}
footer{border-top:1px solid #d8e0e7;background:white;padding:25px 0;color:#8b96a3;font-size:11px}footer strong{color:#546d82;font-size:12px}footer p{margin:5px 0}
.section{padding:25px 0}.crumb{display:flex;gap:7px;font-size:12px;color:#7c8c9c;margin:22px 0}
.eyebrow{color:#2c7894;font-size:12px;font-weight:700;letter-spacing:1px}.page-title{font-size:clamp(27px,4vw,38px);line-height:1.4;letter-spacing:-1px;margin:12px 0}
.muted{color:#788898;font-size:13px}.tag{background:#e5f2f7;color:#2b748a;font-size:11px;padding:4px 8px;border-radius:3px}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.card,.panel{background:white;border:1px solid #d7e0e8;padding:24px;border-radius:4px}.card h3{font-size:18px;line-height:1.5}.card p{color:#788898;font-size:13px}.card .meta{font-size:11px;color:#788898;border-top:1px solid #edf1f5;margin-top:18px;padding-top:12px}.card .meta a{color:#47728a}
.detail{display:grid;grid-template-columns:minmax(0,2fr) minmax(250px,1fr);gap:25px;margin:25px 0 40px}.prose{padding:30px}.prose p{line-height:1.95;margin:24px 0}.aside{align-self:start;border-top:3px solid #58b6ce}.aside h2{font-size:21px}.aside p{font-size:13px}
.call{width:100%;text-align:center;margin-top:20px}.disabled{display:block;background:#eaf0f5;color:#677b8e;border-radius:3px;padding:13px;text-align:center;margin-top:16px;font-size:13px;font-weight:600}
.chips{display:flex;gap:8px;flex-wrap:wrap}.chip{background:white;padding:7px 14px;border:1px solid #cbd8e2;border-radius:3px;font-size:12px}.chip[aria-current]{background:#21496a;color:white}
.empty{border:1px solid #d8e0e7;background:white;padding:38px 24px;text-align:center}.empty h3{font-size:18px;margin:0 0 8px}.empty p{font-size:13px;color:#7e8d9c}.empty .button{margin-top:8px}
@media(max-width:1000px){.header{gap:25px}.header-note{display:none}.header-search{margin-left:auto}.portal-layout{grid-template-columns:minmax(0,1fr) 220px;gap:18px}.post-board th:nth-child(4){width:80px}.post-board td{padding:12px 6px}.mini-boards{grid-template-columns:1fr}.mini-board li{margin-top:8px}}
@media(max-width:760px){.wrap{padding-left:16px;padding-right:16px}.header{min-height:0;padding-top:20px;padding-bottom:18px;gap:15px;flex-wrap:wrap}.brand{font-size:28px}.brand small{font-size:10px}.header-search{width:100%;height:39px;margin:0}.header-search input{font-size:13px}.header-search button{width:58px;font-size:12px}
.main-nav{padding:0 8px;min-height:43px}.main-nav a,.main-nav a:first-child{padding:11px 10px;font-size:12px}.notice{padding:6px 16px;font-size:10px}.portal{padding-top:17px;padding-bottom:30px}.portal-intro{display:block;margin-bottom:16px;padding-bottom:12px}.portal-intro h1{font-size:19px}.portal-intro p{font-size:11px;margin-top:4px}
.portal-layout{grid-template-columns:1fr;gap:22px}.filter-panel{padding:12px;margin-bottom:19px}.filter-heading{gap:9px}.filter-heading h2{font-size:12px}.filter-heading span{font-size:10px}.region-filter{grid-template-columns:1fr 1fr;gap:8px}.region-filter button{height:32px;align-self:end}.region-filter label select{height:32px;font-size:12px}.region-filter label{font-size:10px}
.board-heading h2{font-size:20px}.board-kicker{font-size:11px;max-width:185px;overflow-wrap:anywhere}.board-heading>div:first-child{flex-wrap:wrap;gap:3px 8px}.board-summary{font-size:10px;flex-wrap:wrap;justify-content:flex-end}.service-tabs a{font-size:12px;padding:9px 12px}.board-notice{font-size:10px;padding:9px 11px}.board-notice span{font-size:9px}
.post-board table,.post-board tbody{display:block}.post-board thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}.post-board tr{display:flex;flex-wrap:wrap;gap:4px 10px;padding:12px;border-bottom:1px solid #e7edf2}.post-board tr:last-child{border-bottom:0}.post-board td{padding:0;border:0;font-size:10px;text-align:left}.post-board .post-number{display:none}.post-board .post-subject{width:100%;margin-bottom:5px}.board-title{font-size:14px}.board-category{font-size:10px}.post-kind{font-size:9px}.board-bottom{font-size:10px;padding-bottom:12px}.board-bottom>span:first-child{max-width:80%}
.mini-boards{grid-template-columns:1fr}.latest-section .count{font-size:10px;max-width:130px;text-align:right}.portal-sidebar{display:grid;grid-template-columns:1fr;gap:14px}.sidebar-panel{margin-bottom:0}.region-shortcuts{grid-template-columns:repeat(4,minmax(0,1fr))}.sidebar-guide br{display:none}.sidebar-guide h2{font-size:16px}.service-links{display:flex;flex-wrap:wrap;gap:5px 18px}.service-links li+li{border:0}
.detail{grid-template-columns:1fr}.prose{padding:22px}.grid{grid-template-columns:1fr}.card{padding:20px}.section-head h2{font-size:17px}.crumb{flex-wrap:wrap}.page-title{font-size:27px;word-break:keep-all}footer{padding:20px 0}
}
@media(prefers-reduced-motion:no-preference){a,button{transition:background .15s,color .15s}}
`;
