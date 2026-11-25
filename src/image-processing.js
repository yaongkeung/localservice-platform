// Validate JPEG containers without allocating decoded pixels in Workers.
// APP/COM metadata (including EXIF/GPS) and bytes after EOI are discarded.
export function sanitizeJpeg(bytes,maxWidth,maxHeight,maxBytes){
 const invalid=()=>{throw Error('사진을 읽지 못했습니다. 사진을 다시 선택해 등록해 주세요.');};
 if(!(bytes instanceof Uint8Array)||bytes.length<4||bytes.length>maxBytes||bytes[0]!==255||bytes[1]!==216)invalid();
 const pieces=[bytes.subarray(0,2)];let at=2,width=0,height=0,frame=false,quantization=false,huffman=false,scan=false,scanBytes=0,ended=false;
 while(at<bytes.length){
  const start=at;if(bytes[at++]!==255)invalid();while(bytes[at]===255)at++;
  if(at>=bytes.length)invalid();const marker=bytes[at++];
  if(marker===217){if(!frame||!scan||!scanBytes)invalid();pieces.push(new Uint8Array([255,217]));ended=true;break;}
  if(at+2>bytes.length)invalid();const length=(bytes[at]<<8)|bytes[at+1],end=at+length;
  if(length<2||end>bytes.length)invalid();
  if(marker>=224&&marker<=239||marker===254){at=end;continue;}
  if(marker===192||marker===194){
   if(frame||length<11||bytes[at+2]!==8)invalid();height=(bytes[at+3]<<8)|bytes[at+4];width=(bytes[at+5]<<8)|bytes[at+6];const components=bytes[at+7];
   if(!width||!height||width>maxWidth||height>maxHeight||![1,3].includes(components)||length!==8+components*3)invalid();frame=true;
  }else if(marker===219){
   if(length<67)invalid();
   let cursor=at+2;while(cursor<end){const table=bytes[cursor++],precision=table>>4;if(precision>1||(table&15)>3)invalid();cursor+=64*(precision+1);}if(cursor!==end)invalid();quantization=true;
  }else if(marker===196){
   if(length<19)invalid();
   let cursor=at+2;while(cursor<end){const table=bytes[cursor++];if(table>>4>1||(table&15)>3||cursor+16>end)invalid();let count=0;for(let i=0;i<16;i++)count+=bytes[cursor++];if(!count||count>256)invalid();cursor+=count;}if(cursor!==end)invalid();huffman=true;
  }else if(marker===221){if(length!==4)invalid();}
  else if(marker===218){const components=bytes[at+2];if(!frame||!quantization||!huffman||![1,2,3].includes(components)||length!==6+components*2)invalid();scan=true;}
  else invalid();
  pieces.push(bytes.subarray(start,end));at=end;
  if(marker===218){
   const scanStart=at;
   while(true){const next=bytes.indexOf(255,at);if(next<0||next+1>=bytes.length)invalid();const code=bytes[next+1];
    if(code===0||code>=208&&code<=215){at=next+2;continue;}if(code===255){at=next+1;continue;}at=next;break;
   }
   scanBytes+=at-scanStart;pieces.push(bytes.subarray(scanStart,at));
  }
 }
 if(!ended)invalid();const output=new Uint8Array(pieces.reduce((total,part)=>total+part.length,0));let offset=0;for(const part of pieces){output.set(part,offset);offset+=part.length;}
 return {bytes:output,width,height};
}
export function processPhoto(coverBytes,thumbnailBytes){
 const cover=sanitizeJpeg(coverBytes,1280,1280,5*1024*1024),thumb=sanitizeJpeg(thumbnailBytes,240,160,256*1024),scale=Math.min(1,240/cover.width,160/cover.height);
 if(thumb.width!==Math.max(1,Math.round(cover.width*scale))||thumb.height!==Math.max(1,Math.round(cover.height*scale)))throw Error('사진과 미리보기 크기가 맞지 않습니다. 사진을 다시 선택해 주세요.');
 return {cover:cover.bytes,thumb:thumb.bytes,width:cover.width,height:cover.height};
}
