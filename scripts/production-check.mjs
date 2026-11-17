import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readDeployment} from './deploy-check.mjs';
export function productionErrors(config,staging,phase='prepare'){
 const errors=[],db=config.d1_databases?.find(item=>item.binding==='DB'),photos=config.r2_buckets?.find(item=>item.binding==='PHOTOS');
 if(!['prepare','connect','index'].includes(phase))errors.push('운영 확인 단계가 올바르지 않습니다.');
 if(config.name!=='localservice-platform-production'||config.vars?.APP_ENV!=='production')errors.push('별도 이웃핀 운영 Worker와 APP_ENV=production이 필요합니다.');
 if(!/^[a-f0-9]{32}$/.test(config.account_id||'')||config.account_id!==staging?.account_id)errors.push('확인한 시험 계정과 같은 Cloudflare 계정이 필요합니다.');
 if(db?.database_name!=='localservice-platform-production-db'||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(db?.database_id||'')||db?.database_id===staging?.d1_databases?.find(item=>item.binding==='DB')?.database_id)errors.push('시험 DB와 분리된 운영 전용 D1이 필요합니다.');
 if(photos?.bucket_name!=='localservice-platform-production-photos'||photos.bucket_name===staging?.r2_buckets?.find(item=>item.binding==='PHOTOS')?.bucket_name)errors.push('시험 저장소와 분리된 운영 전용 비공개 R2가 필요합니다.');
 if(config.assets?.binding!=='ASSETS'||!config.assets?.directory||config.assets.run_worker_first!==true)errors.push('ASSETS와 Worker 우선 실행 설정이 필요합니다.');
 if(config.preview_urls!==false)errors.push('버전별 미리보기 URL은 비활성화해야 합니다.');
 if(!/^[a-f0-9]{40}$/i.test(config.vars?.NAVER_SITE_VERIFICATION||''))errors.push('실제 네이버 소유 확인용 값이 필요합니다.');
 if(config.vars?.SEARCH_INDEXING!==(phase==='index'?'enabled':'disabled'))errors.push('단계에 맞는 명시적인 검색 수집 설정이 필요합니다.');
 const routes=config.routes||[];
 if(config.route||phase==='prepare'&&(routes.length||config.workers_dev!==true))errors.push('준비 단계는 도메인 연결 없이 별도 시험 주소만 사용합니다.');
 if(phase!=='prepare'&&(routes.length!==2||new Set(routes.map(route=>route.pattern)).size!==2||routes.some(route=>!['gongsa8282.xyz','www.gongsa8282.xyz'].includes(route.pattern)||route.custom_domain!==true)||config.workers_dev!==false))errors.push('운영 연결은 gongsa8282.xyz와 www 주소만 지정하고 workers.dev는 비활성화해야 합니다.');
 return errors;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{const [path='wrangler.production.jsonc',phase='prepare']=process.argv.slice(2),errors=productionErrors(readDeployment(path),readDeployment('wrangler.staging.jsonc'),phase);if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('Production configuration checks passed. No deployment or domain change was performed.');}catch{console.error('운영 배포 설정을 확인하지 못했습니다.');process.exitCode=1;}
}
