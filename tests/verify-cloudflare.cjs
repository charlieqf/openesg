/* Read-only deployed-byte check; no real customer data or cloud mutations. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const base=process.env.OPENESG_LIVE_URL || 'https://openesg.openesg-ui-prototype.workers.dev';
const baseline=require('./runtime-baseline.json');
const out=path.resolve(__dirname,'../verification/cloudflare-'+baseline.sourceBaseline+'/online-resources.json');
(async()=>{
  const results=[];let cursor=0;
  async function worker(){while(cursor<baseline.files.length){const item=baseline.files[cursor++];const res=await fetch(base+'/'+item.file.slice(7),{signal:AbortSignal.timeout(30000)});const bytes=Buffer.from(await res.arrayBuffer());const hash=crypto.createHash('sha256').update(bytes).digest('hex');results.push({file:item.file,status:res.status,match:hash===item.sha256});assert.equal(new URL(res.url).origin,new URL(base).origin);}}
  await Promise.all(Array.from({length:6},worker));
  const privatePaths=[];for(const route of ['/README.md','/wrangler.jsonc','/tests/runtime-baseline.json','/docs/portfolio-20260910.md','/docs/support-views-20260910.md']){const r=await fetch(base+route,{signal:AbortSignal.timeout(30000)});privatePaths.push({route,status:r.status});await r.arrayBuffer();}
  const root=await fetch(base+'/',{signal:AbortSignal.timeout(30000)});const html=await root.text();
  const report={date:new Date().toISOString(),base,rootStatus:root.status,portfolioTitle:html.includes('<title>报告项目 · OpenESG</title>'),results:results.sort((a,b)=>a.file.localeCompare(b.file)),privatePaths};
  report.passed=report.rootStatus===200&&report.portfolioTitle&&results.every(x=>x.status===200&&x.match)&&privatePaths.every(x=>x.status===404);
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));
  console.log(JSON.stringify({passed:report.passed,date:report.date,files:results.length,matches:results.filter(x=>x.match).length,rootStatus:report.rootStatus,privatePaths},null,2));assert.equal(report.passed,true);
})().catch(e=>{console.error(e);process.exitCode=1;});
