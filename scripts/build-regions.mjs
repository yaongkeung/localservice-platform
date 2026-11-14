// Input: pinned admdongkor ver20261001 GeoJSON. Names/codes only; no geometry retained.
import fs from 'node:fs/promises';
if(!process.argv[2])throw Error('Usage: node scripts/build-regions.mjs <source.geojson>');
const source=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const provinces=new Map(),districts=new Map(),dongs={};
for(const {properties:p}of source.features){
  provinces.set(p.sido,{code:p.sido,name:p.sidonm});
  districts.set(p.sgg,{code:p.sgg,province:p.sido,name:p.sggnm.replace(/^(.+?시)(.+구)$/,'$1 $2')});
  (dongs[p.sgg]||=[]).push({code:p.adm_cd2.slice(0,8),name:p.adm_nm.split(' ').at(-1)});
}
const data={date:'2026-10-01',sourceUrl:'https://github.com/vuski/admdongkor',commit:'d5d5a821c8de6cc337d47eeca604d7af76271c9b',provinces:[...provinces.values()].sort((a,b)=>a.code.localeCompare(b.code)),districts:[...districts.values()].sort((a,b)=>a.code.localeCompare(b.code)),dongs};
await fs.writeFile(new URL('../src/regions-data.js',import.meta.url),'// SGIS / vuski-admdongkor. CC BY 4.0; see docs/REGION_DATA.md.\nexport const regionData='+JSON.stringify(data)+';\n');
console.log('Built region names and codes:',data.provinces.length,data.districts.length,source.features.length);
