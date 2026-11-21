import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {unstable_readConfig} from 'wrangler';
export function deploymentErrors(config){
 const errors=[];
 if(config.name!=='localservice-platform-staging')errors.push('시험 Worker 이름은 localservice-platform-staging이어야 합니다.');
 if(config.vars?.APP_ENV!=='staging')errors.push('APP_ENV=staging 설정이 필요합니다.');
 if(!/^[a-f0-9]{32}$/.test(config.account_id||''))errors.push('실제 Cloudflare 계정 ID가 필요합니다.');
 const db=config.d1_databases?.find(x=>x.binding==='DB');
 if(!db||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(db.database_id||'')||!db.database_name?.startsWith('localservice-platform-'))errors.push('새 프로젝트 전용 D1 이름과 실제 DB ID가 필요합니다.');
 const photos=config.r2_buckets?.find(x=>x.binding==='PHOTOS');
 if(!photos?.bucket_name?.startsWith('localservice-platform-'))errors.push('새 프로젝트 전용 비공개 R2 버킷 이름이 필요합니다.');
 if(config.assets?.binding!=='ASSETS'||!config.assets?.directory||config.assets.run_worker_first!==true)errors.push('ASSETS와 Worker 우선 실행 설정이 필요합니다.');
 if(config.routes?.length||config.route)errors.push('첫 시험 배포에서는 기존 도메인/route를 연결하지 않습니다.');
 if(config.workers_dev!==true)errors.push('분리된 workers.dev 시험 주소를 활성화해야 합니다.');
 return errors;
}
export function readDeployment(path){return unstable_readConfig({config:resolve(path)});}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{const path=process.argv[2]||'wrangler.staging.jsonc',errors=deploymentErrors(readDeployment(path));if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('Staging configuration checks passed. Resource ownership, private bucket access, migrations and login must still be verified. No deployment was performed.');}catch{console.error('시험 배포 설정을 읽지 못했습니다. wrangler.staging.example.jsonc를 참고해 실제 계정·DB·버킷을 설정해 주세요.');process.exitCode=1;}
}
