import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import polylabel from 'polylabel';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
if(!process.argv[2])throw Error('Usage: node scripts/build-map-assets.mjs <prepared-source-directory>');
const input=pathToFileURL(path.resolve(process.argv[2])+path.sep);
const root=new URL('../',import.meta.url);
const dongs=JSON.parse(await fs.readFile(new URL('nation-simple.geojson',input))).features;
const districts=JSON.parse(await fs.readFile(new URL('nation-districts.geojson',input))).features;
const provinces=JSON.parse(await fs.readFile(new URL('nation-provinces.geojson',input))).features;
const meta={date:'2026-10-01',source:'SGIS · vuski/admdongkor',sourceUrl:'https://github.com/vuski/admdongkor',license:'CC BY 4.0 / 원자료 공공누리 제1유형',commit:(await fs.readFile(new URL('nation-commit.txt',input),'utf8')).trim()};
function polygons(f){return f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;}
function area(r){let a=0;for(let i=0,j=r.length-1;i<r.length;j=i++)a+=r[j][0]*r[i][1]-r[i][0]*r[j][1];return Math.abs(a/2);}
function label(f){return polylabel([...polygons(f)].sort((a,b)=>area(b[0])-area(a[0]))[0],0.0001).slice(0,2).map(v=>+v.toFixed(5));}
function bounds(f){return polygons(f).flat(2).reduce((b,p)=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[Infinity,Infinity,-Infinity,-Infinity]);}
const cos=Math.cos(36.5*Math.PI/180);
function xy(p){return [p[0]*cos,-p[1]];}
function view(fs){return fs.flatMap(f=>polygons(f).flat(2)).reduce((b,p)=>{const [x,y]=xy(p);return [Math.min(b[0],x),Math.min(b[1],y),Math.max(b[2],x),Math.max(b[3],y)];},[Infinity,Infinity,-Infinity,-Infinity]);}
function svg(f,b){const scale=560/Math.max(b[2]-b[0],b[3]-b[1]);const dx=(600-(b[2]-b[0])*scale)/2,dy=(600-(b[3]-b[1])*scale)/2;const project=p=>{const [x,y]=xy(p);return [+(dx+(x-b[0])*scale).toFixed(1),+(dy+(y-b[1])*scale).toFixed(1)];};return {path:polygons(f).map(poly=>poly.map(r=>r.map((p,i)=>(i?'L':'M')+project(p).join(',')).join('')+'Z').join('')).join(''),label:project(label(f))};}
function feature(f,code,name,level,province,district){return {type:'Feature',id:code,properties:{code,name,level,province,district,label:label(f)},geometry:f.geometry};}
async function write(path,data){await fs.writeFile(new URL(path,root),JSON.stringify(data));}
await fs.mkdir(new URL('public/maps/province/',root),{recursive:true});
await fs.mkdir(new URL('public/maps/district/',root),{recursive:true});
const nationwide=view(provinces);
const index={...meta,provinces:provinces.map(f=>({code:f.properties.sido,name:f.properties.sidonm,bounds:bounds(f),...svg(f,nationwide)})).sort((a,b)=>a.code.localeCompare(b.code)),districts:districts.map(f=>({code:f.properties.sgg,province:f.properties.sido,name:f.properties.sggnm,bounds:bounds(f)})).sort((a,b)=>a.code.localeCompare(b.code))};
await fs.writeFile(new URL('src/map-index.js',root),'// SGIS / vuski-admdongkor, CC BY 4.0. See docs/MAP_DATA.md.\nexport const mapIndex='+JSON.stringify(index)+';\n');
await write('public/maps/provinces.json',{...meta,features:provinces.map(f=>feature(f,f.properties.sido,f.properties.sidonm,'province',f.properties.sido))});
for(const p of provinces){const code=p.properties.sido;const fs=districts.filter(f=>f.properties.sido===code);const b=view(fs);await write('public/maps/province/'+code+'.json',{code,areas:fs.map(f=>({code:f.properties.sgg,name:f.properties.sggnm,...svg(f,b)})),features:fs.map(f=>feature(f,f.properties.sgg,f.properties.sggnm,'district',code,f.properties.sgg))});}
for(const g of districts){const code=g.properties.sgg;const fs=dongs.filter(f=>f.properties.sgg===code);const b=view(fs);await write('public/maps/district/'+code+'.json',{code,areas:fs.map(f=>({code:f.properties.adm_cd2.slice(0,8),name:f.properties.adm_nm.split(' ').at(-1),...svg(f,b)})),features:fs.map(f=>feature(f,f.properties.adm_cd2.slice(0,8),f.properties.adm_nm.split(' ').at(-1),'dong',f.properties.sido,code))});}
await fs.copyFile(new URL('nation-license.txt',input),new URL('public/maps/LICENSE-DATA.txt',root));
console.log({provinces:provinces.length,districts:districts.length,dongs:dongs.length});
