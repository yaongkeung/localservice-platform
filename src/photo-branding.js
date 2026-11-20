import {pagePhone,prettyPhone} from './page-contact.js';
export function photoBrand(post,company){
 return {style:'vivid-1',company:String(company.name||'').trim(),phone:prettyPhone(pagePhone(post,company)||''),keyword:String(post.search_keyword||'업무').trim(),region:String(post.search_region||'').trim(),message:'사진과 함께 편하게 문의해 주세요'};
}

// Shared Canvas renderer: keep the supplied photograph fully visible above the advertisement.
export function paintBrandedPhoto(canvas,image,brand){
 const width=1200,photoHeight=Math.max(480,Math.min(1050,width*image.height/image.width)),footer=440,height=photoHeight+footer,scale=Math.min(1,1280/height);
 canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
 const ctx=canvas.getContext('2d');ctx.scale(canvas.width/width,canvas.height/height);
 ctx.fillStyle='#f4f2fc';ctx.fillRect(0,0,width,height);
 const fit=Math.min(width/image.width,photoHeight/image.height),iw=image.width*fit,ih=image.height*fit;
 ctx.drawImage(image,(width-iw)/2,(photoHeight-ih)/2,iw,ih);
 const gradient=ctx.createLinearGradient(0,photoHeight,width,height);gradient.addColorStop(0,'#291072');gradient.addColorStop(.48,'#7924d7');gradient.addColorStop(1,'#df2b9f');ctx.fillStyle=gradient;ctx.fillRect(0,photoHeight,width,footer);
 ctx.save();ctx.beginPath();ctx.rect(0,photoHeight,width,footer);ctx.clip();
 for(const [x,y,r,color]of [[1120,photoHeight+20,210,'#d871ff'],[1010,height+120,340,'#ff78bd'],[60,height+85,180,'#4c6dff']]){const glow=ctx.createRadialGradient(x,y,0,x,y,r);glow.addColorStop(0,color+'66');glow.addColorStop(1,color+'00');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
 ctx.strokeStyle='#ffffff20';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(650,height);ctx.bezierCurveTo(820,photoHeight+100,1050,photoHeight+240,1260,photoHeight-10);ctx.stroke();
 for(const [x,y,r]of [[1095,photoHeight+102,16],[1015,photoHeight+182,9],[1150,photoHeight+212,6]]){ctx.fillStyle='#fff6c9';ctx.beginPath();ctx.moveTo(x,y-r);ctx.quadraticCurveTo(x+2,y-2,x+r,y);ctx.quadraticCurveTo(x+2,y+2,x,y+r);ctx.quadraticCurveTo(x-2,y+2,x-r,y);ctx.quadraticCurveTo(x-2,y-2,x,y-r);ctx.fill();}ctx.restore();
 ctx.fillStyle='#83fff1';ctx.fillRect(0,photoHeight,width,6);
 const family='Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
 const text=(value,x,y,maxSize,minSize,maxWidth,color,weight=800)=>{let size=maxSize;ctx.font=weight+' '+size+'px '+family;while(size>minSize&&ctx.measureText(value).width>maxWidth){size--;ctx.font=weight+' '+size+'px '+family;}let shown=value;while(ctx.measureText(shown).width>maxWidth&&shown.length>1)shown=shown.slice(0,-2)+'…';ctx.fillStyle=color;ctx.fillText(shown,x,y);};
 const round=(x,y,w,h,r,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();};
 round(48,photoHeight+32,142,40,20,'#adfff0');text('업체 상담',68,photoHeight+60,24,24,106,'#25335a');
 text(brand.company,212,photoHeight+60,27,20,936,'#ffffff',650);
 text((brand.region?brand.region+' ':'')+brand.keyword,48,photoHeight+150,67,36,1090,'#ffffff');
 text(brand.message,50,photoHeight+207,31,24,1030,'#eee1ff',550);
 round(48,photoHeight+252,1104,136,28,'#ffee79');
 if(brand.phone){text('상담 전화',78,photoHeight+333,30,24,180,'#4a257a',700);text(brand.phone,278,photoHeight+343,78,44,842,'#29135c',900);}
 else{text('업무 상담 안내',82,photoHeight+337,64,40,1036,'#29135c',900);}
 return canvas;
}
