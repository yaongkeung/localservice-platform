export const css = `
:root{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#172b42;background:#f3f5f8;font-synthesis:none;line-height:1.65}
*{box-sizing:border-box}
body{margin:0}
a{color:inherit;text-decoration:none}
a:hover{text-decoration:underline}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #ae5600;outline-offset:4px}
.wrap{max-width:1120px;margin:auto;padding:0 24px}
.skip{position:absolute;top:-100px}
.skip:focus{top:0;background:white;padding:10px;z-index:10}
header{background:#0d1d30;color:#f6f8fc;border-bottom:1px solid #32465d}
.header{display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:88px}
.brand{font-size:24px;font-weight:850;letter-spacing:-1px}
.brand::after{content:"";display:inline-block;width:8px;height:8px;margin-left:5px;background:#ffd166;border-radius:50%}
header nav a:hover{color:#ffd166}
header a:focus-visible,.feature a:focus-visible{outline-color:#ffd166}
nav{display:flex;gap:24px;font-size:14px;font-weight:650}
.notice{font-size:12px;background:#e8edf4;padding:8px 24px;text-align:center;color:#485b72}
.hero{padding:64px 0 44px;background:radial-gradient(ellipse at 92% 10%,#294b68 0%,transparent 60%),#14283f;color:#fff;border-bottom:4px solid #ffd166}
.hero .eyebrow{color:#ffd166}
.eyebrow{color:#245d78;font-size:13px;font-weight:750;letter-spacing:2px}
.hero h1{font-size:clamp(32px,5vw,54px);line-height:1.22;letter-spacing:-2px;max-width:720px;margin:16px 0 20px}
.hero p{color:#c7d6e6;max-width:600px}
.search{display:grid;grid-template-columns:1fr 1fr 2fr auto;gap:10px;background:white;padding:14px;border:1px solid #d7e0e9;border-radius:12px;margin-top:30px;box-shadow:0 12px 32px #07152326}
label{font-size:12px;color:#52647a}
select,input,button{font:inherit;width:100%;padding:11px;border:1px solid #c5d1de;border-radius:6px;background:white;color:#172b42}
button,.button{background:#ffd166;color:#0d1d30;border:0;border-radius:6px;padding:12px 22px;font-weight:700;cursor:pointer;display:inline-block}
button:hover,.button:hover{background:#ffe09a}
.search button{align-self:end;height:49px}
.section{padding:40px 0}
.section-head{display:flex;justify-content:space-between;align-items:baseline;gap:16px;margin-bottom:20px}
h2{font-size:25px;letter-spacing:-.8px;margin:0}
h3{line-height:1.45;font-size:20px;margin:12px 0}
p{margin:12px 0}
.muted{color:#52647a;font-size:14px}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.service,.card,.panel{background:white;border:1px solid #d7e0e9;border-radius:12px;padding:24px}
.service{border-top:4px solid #ffd166}
.service:nth-child(3n + 2){border-top-color:#79dfed}
.service:nth-child(3n){border-top-color:#9aa9eb}
.service:hover,.card:hover{border-color:#6688a7}
.icon{display:block;width:54px;height:54px;text-align:center;line-height:54px;color:#624208;background:#fff0c9;border-radius:12px;font-size:34px;margin-bottom:14px}
.service:nth-child(3n + 2) .icon{color:#15566b;background:#def7fa}
.service:nth-child(3n) .icon{color:#444f8b;background:#eaedff}
.chips{display:flex;flex-wrap:wrap;gap:10px}
.chip{padding:9px 17px;border:1px solid #c5d1de;border-radius:30px;background:white;font-size:14px}
.chip:hover{background:#e5f7fb;border-color:#438298}
.chip[aria-current]{background:#173e62;color:white}
.tag{font-size:12px;color:#205a70;background:#e2f5fa;padding:4px 9px;border-radius:4px}
.card .meta{margin-top:24px;padding-top:16px;border-top:1px solid #e3e9f0;font-size:13px;color:#52647a}
.card a{display:block}
.card p{color:#52647a;font-size:14px}
.feature{border-left:5px solid #79dfed;background:#14283f;color:#fff;border-radius:12px;padding:30px;display:flex;align-items:center;justify-content:space-between;gap:20px}
.feature p{color:#c7d6e6}
.crumb{font-size:13px;color:#52647a;margin:25px 0}
.page-title{font-size:clamp(28px,5vw,42px);line-height:1.3;letter-spacing:-1px;margin:16px 0}
.detail{display:grid;grid-template-columns:minmax(0,2fr) minmax(250px,1fr);gap:28px;margin:30px 0 50px}
.prose p{margin:24px 0;line-height:1.95}
.prose{padding:32px}
.aside{align-self:start;border-top:4px solid #ffd166}
.call{width:100%;text-align:center;margin-top:20px}
.disabled{display:block;background:#e9eef4;color:#516176;border-radius:6px;padding:13px;text-align:center;margin-top:16px;font-weight:700}
footer{background:#0d1d30;border-top:3px solid #304a64;padding:30px 0 40px;color:#bdcbdc;font-size:13px}
footer strong{color:#ffd166}
.empty{padding:40px;border:1px dashed #93a8bf;border-radius:12px}
.count{font-size:13px;color:#52647a}
.all-link{color:#173e62;font-size:14px;font-weight:700}
.company-name{font-size:26px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
[hidden]{display:none!important}
.naver-map{width:100%;height:430px;border-radius:10px;margin:12px 0;isolation:isolate;background:#eaf0f6}
.map-reset{width:auto;font-size:12px;margin:0 0 14px;padding:7px 12px;background:#173e62;color:white}
.map-reset:hover{background:#285b7d}
#map-status{font-size:12px;margin:8px 0}
.map-layout{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);background:white;border:1px solid #d7e0e9;border-radius:14px;overflow:hidden}
.map-overview{background:#eaf0f6;padding:24px;min-width:0}
.map-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;color:#52647a}
.map-toolbar strong{font-size:20px;color:#14283f}
.area-map{display:block;width:100%;height:430px;overflow:visible}
.district-shape{fill:#c3d1df;stroke:#f9fbff;stroke-width:2;cursor:pointer;transform-box:fill-box;transform-origin:center}
.district-shape.active{fill:#173e62;stroke:#ffd166;stroke-width:3}
.district-shape:hover,.district-shape:focus-visible{fill:#285b7d;stroke:#ffd166;stroke-width:3;transform:scale(1.025);outline:none}
.map-detail{padding:24px;border-left:1px solid #d7e0e9;min-width:0}
.map-detail-top h3{font-size:27px;margin:6px 0}
.map-detail-top p{font-size:12px;margin:5px 0;min-height:20px}
.dong-map{display:block;width:100%;height:215px;background:#f7f9fc;border-radius:10px;margin:10px 0}
.dong-map path{fill:#bbdfe9;stroke:white;stroke-width:3;cursor:pointer;transform-box:fill-box;transform-origin:center}
.dong-map path:hover,.dong-map path:focus-visible,.dong-map path[aria-pressed="true"]{fill:#ffd166;stroke:#9b680a;stroke-width:3;transform:scale(1.025);outline:none}
.map-selectors{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.map-selectors select{margin-top:4px}
.map-apply{display:block;text-align:center;margin-top:12px}
.map-detail>p{font-size:11px;margin-bottom:0}
.map-legend{font-size:12px;color:#52647a;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.map-legend i{width:10px;height:10px;background:#173e62;border:1px solid #a57109;display:inline-block}
.map-legend span{margin-left:auto;font-size:11px}
.map-credit{font-size:11px;color:#52647a;margin:12px 0 0}
.map-credit a{text-decoration:underline}
.post-board{background:white;border:1px solid #d7e0e9;border-top:3px solid #173e62;border-radius:8px;overflow:hidden}
.post-board table{width:100%;border-collapse:collapse;text-align:left;font-size:13px}
.post-board th{padding:12px 18px;background:#eaf0f6;color:#52647a;font-size:12px;font-weight:600}
.post-board td{padding:16px 18px;border-top:1px solid #e3e9f0;color:#52647a;white-space:nowrap}
.post-board td:first-child{white-space:normal;width:61%}
.post-board tr:hover td{background:#f5f9fc}
.board-category{display:inline-block;font-size:11px;font-weight:700;background:#e2f5fa;color:#205a70;padding:2px 6px;border-radius:3px;margin:0 8px 5px 0}
.board-title{font-size:15px;font-weight:650;color:#172b42}
.board-type{display:block;font-size:11px;color:#52647a}
.board-summary{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
@media(prefers-reduced-motion:no-preference){.district-shape,.dong-map path{transition:fill .15s,transform .15s}}
 @media(max-width:760px){.wrap{padding:0 18px}
.header{min-height:76px;gap:12px;flex-wrap:wrap;padding-top:15px;padding-bottom:15px}
nav{gap:18px;font-size:13px}
.brand{font-size:21px}
.hero{padding:36px 0}
.search{grid-template-columns:1fr 1fr}
.search .keyword{grid-column:1/-1}
button:hover,.button:hover{background:#ffe09a}
.search button{grid-column:1/-1}
.grid{grid-template-columns:1fr}
.service{display:block;padding:20px}
.icon{float:right;margin:0}
.section{padding:28px 0}
.section-head{align-items:center;flex-wrap:wrap}
.map-layout{grid-template-columns:1fr}
.map-overview{padding:16px}
.area-map{height:310px}
.naver-map{height:350px}
.map-detail{padding:18px;border-left:0;border-top:1px solid #d7e0e9}
.map-toolbar{font-size:11px;flex-wrap:wrap}
.map-toolbar strong{font-size:18px}
.map-legend span{margin-left:0}
.dong-map{height:245px}
.post-board table,.post-board tbody{display:block}
.post-board thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
.post-board tr{display:flex;flex-wrap:wrap;padding:15px 16px;border-top:1px solid #e3e9f0;gap:3px 12px}
.post-board tr:first-child{border-top:0}
.post-board td{display:block;border:0;padding:0;font-size:11px}
.post-board td:first-child{width:100%;margin-bottom:7px}
.board-title{display:block;font-size:15px}
.board-category{margin-bottom:5px}
.board-type{display:inline;font-size:11px}
h2{font-size:22px}
.detail{grid-template-columns:1fr}
.prose{padding:22px}
.feature{display:block}
.hero h1{letter-spacing:-1px}
.notice{font-size:11px}
.card{padding:22px}
.aside .call{position:sticky;bottom:12px}
}
 @media(prefers-reduced-motion:no-preference){a,button{transition:background .15s,border-color .15s}
}

`;
