import jpeg from 'jpeg-js';
function resize(image,maxWidth,maxHeight){
 const scale=Math.min(1,maxWidth/image.width,maxHeight/image.height),width=Math.max(1,Math.round(image.width*scale)),height=Math.max(1,Math.round(image.height*scale));
 // Reuse only pixel data, never decoder metadata such as EXIF or comments.
 if(scale===1)return {data:image.data,width:image.width,height:image.height};
 const data=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const sx=Math.min(image.width-1,(x+.5)/scale-.5),sy=Math.min(image.height-1,(y+.5)/scale-.5),x0=Math.max(0,Math.floor(sx)),y0=Math.max(0,Math.floor(sy)),x1=Math.min(image.width-1,x0+1),y1=Math.min(image.height-1,y0+1),fx=sx-x0,fy=sy-y0;
  const dst=(y*width+x)*4;
  for(let c=0;c<3;c++)data[dst+c]=Math.round((1-fy)*((1-fx)*image.data[(y0*image.width+x0)*4+c]+fx*image.data[(y0*image.width+x1)*4+c])+fy*((1-fx)*image.data[(y1*image.width+x0)*4+c]+fx*image.data[(y1*image.width+x1)*4+c]));
  data[dst+3]=255;
 }
 return {data,width,height};
}
export function preparePhoto(bytes){
 if(bytes.length<4||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw Error('사진을 JPG 형식으로 선택해 주세요. PNG는 화면에서 자동 변환합니다.');
 let decoded;try{decoded=jpeg.decode(bytes,{useTArray:true,formatAsRGBA:true,tolerantDecoding:false,maxResolutionInMP:1280*1280/1000000,maxMemoryUsageInMB:64});}catch{throw Error('사진을 읽지 못했습니다. 정상적인 JPG 사진이나 더 작은 사진으로 다시 시도해 주세요.');}
 if(!decoded.width||!decoded.height||Math.max(decoded.width,decoded.height)>1280)throw Error('사진 크기를 줄인 뒤 다시 등록해 주세요.');
 // Re-encode pixels only: EXIF/GPS, comments, original name and appended payloads are never retained.
 const resized=resize(decoded,1280,1280),cover=jpeg.encode(resized,80).data,thumb=jpeg.encode(resize(decoded,240,160),75).data;
 return {cover,thumb,width:resized.width,height:resized.height};
}
