import {spawnSync} from 'node:child_process';
import {emitKeypressEvents} from 'node:readline';
import {mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {resolve,join,dirname,basename} from 'node:path';
import {hashPassword} from '../src/auth.js';
import {deploymentErrors,readDeployment} from './deploy-check.mjs';

const login=process.argv[2];
if(login==='--help'){
 console.log('Usage: npm run admin:create:staging -- LOGIN_ID\nRun in your own interactive terminal after Cloudflare login. Enter a new 15–128 character password twice; input is hidden. Creates the first active staging administrator only. Existing accounts are never reset.');
 process.exit(0);
}
if(!/^[a-zA-Z0-9_-]{3,40}$/.test(login||''))throw Error('아이디는 영문·숫자·밑줄·하이픈 3~40자로 지정해 주세요.');
if(!process.stdin.isTTY||!process.stdout.isTTY)throw Error('비밀번호를 직접 입력할 수 있는 터미널에서 실행해 주세요. 비밀번호를 인자나 파일로 전달하지 마세요.');
const configPath=resolve('wrangler.staging.jsonc'),config=readDeployment(configPath),errors=deploymentErrors(config);
if(errors.length)throw Error(errors.join('\n'));
if(config.d1_databases.find(x=>x.binding==='DB').database_name!=='localservice-platform-staging-db')throw Error('시험 전용 DB 이름을 확인해 주세요.');
const quote=value=>"'"+value.replaceAll("'","''")+"'";
const wrangler=resolve('node_modules/wrangler/bin/wrangler.js');
function cli(args){
 const result=spawnSync(process.execPath,[wrangler,'d1','execute','DB','--remote','--config',configPath,...args,'--json'],{encoding:'utf8',timeout:60000,env:{...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:resolve('.local/wrangler-logs')}});
 if(result.status!==0)throw Error('Cloudflare 시험 DB 명령이 실패했습니다. 로그인과 연결 상태를 확인해 주세요.');
 const start=result.stdout.indexOf('[\n');
 try{return JSON.parse(result.stdout.slice(start<0?0:start));}catch{throw Error('시험 DB 응답을 확인하지 못했습니다. 계정은 재발급하지 않습니다.');}
}
const existing=cli(['--command',`SELECT id FROM users WHERE (status='ACTIVE' AND role IN ('SUPER_ADMIN','ADMIN')) OR login_id=${quote(login)} LIMIT 1;`]);
if(existing[0].results.length)throw Error('이미 활성 관리자 또는 같은 아이디가 있습니다. 기존 계정은 변경하지 않았습니다.');

function passwordPrompt(label){
 process.stdout.write(label);emitKeypressEvents(process.stdin);process.stdin.setRawMode(true);process.stdin.resume();
 return new Promise((resolve,reject)=>{
  let value='';
  const finish=()=>{process.stdin.off('keypress',key);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');};
  const key=(text,event={})=>{
   if(event.ctrl&&event.name==='c'){finish();reject(Error('계정 생성을 취소했습니다.'));return;}
   if(event.name==='return'||event.name==='enter'){finish();resolve(value);return;}
   if(event.name==='backspace'){value=Array.from(value).slice(0,-1).join('');return;}
   if(!event.ctrl&&!event.meta&&text&&!/[\u0000-\u001f\u007f]/.test(text))value+=text;
  };
  process.stdin.on('keypress',key);
 });
}

console.log(`시험 사이트 최초 관리자: ${login}\n새 비밀번호는 화면에 표시하거나 저장하지 않습니다. 15~128자로 입력해 주세요.`);
let password=await passwordPrompt('새 비밀번호: '),confirmation=await passwordPrompt('한 번 더 입력: ');
if(password.length<15||password.length>128||password!==confirmation)throw Error('비밀번호 길이 또는 두 입력이 맞지 않습니다. 계정은 생성하지 않았습니다.');
const hash=await hashPassword(password);password='';confirmation='';
await mkdir('.local',{recursive:true});const folder=await mkdtemp(join(resolve('.local'),'admin-bootstrap-'));
try{
 const file=join(folder,'insert.sql');
 await writeFile(file,`INSERT INTO users(name,login_id,password_hash,role) SELECT '최고 관리자',${quote(login)},${quote(hash)},'SUPER_ADMIN' WHERE NOT EXISTS(SELECT id FROM users WHERE status='ACTIVE' AND role IN ('SUPER_ADMIN','ADMIN'));`,{mode:0o600});
 const result=cli(['--file',file]);
 if(!result.every(item=>item.success))throw Error('관리자 생성 결과를 확인하지 못했습니다.');
 const created=cli(['--command',`SELECT id FROM users WHERE login_id=${quote(login)} AND role='SUPER_ADMIN' AND status='ACTIVE';`]);
 if(created[0].results.length!==1)throw Error('다른 관리자가 먼저 생성되어 요청을 중단했습니다.');
 console.log(`관리자 생성 완료: ${login}\n시험 사이트의 /admin/에서 입력한 비밀번호로 로그인하세요. 비밀번호는 채팅으로 보내지 마세요.`);
}finally{
 if(dirname(resolve(folder))!==resolve('.local')||!basename(folder).startsWith('admin-bootstrap-'))throw Error('임시 폴더 경로를 확인하지 못했습니다.');
 await rm(folder,{recursive:true,force:true});
}
