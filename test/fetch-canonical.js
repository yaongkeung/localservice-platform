import worker from '../src/worker.js';
// Browser-like GET handling for tests about page contents rather than redirects.
export async function fetchCanonical(request,env){
 let response=await worker.fetch(request,env);
 for(let i=0;i<3&&['GET','HEAD'].includes(request.method)&&response.status===301;i++){
  const url=new URL(response.headers.get('location'),request.url);
  if(url.origin!==new URL(request.url).origin)throw Error('Unexpected external redirect');
  request=new Request(url,{method:request.method,headers:request.headers});response=await worker.fetch(request,env);
 }
 return response;
}
