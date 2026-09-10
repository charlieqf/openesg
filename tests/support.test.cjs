const test=require('node:test');
const assert=require('node:assert/strict');
const D=require('../public/assets/demo-data.js');
const S=require('../public/assets/support-data.js');
const E=require('../public/assets/shared.js');
const P=require('../public/assets/projects-data.js');
const apply=(g,op,payload={})=>E.reduce(g,{type:'supportDesign',op,payload});
test('four distinct support views do not change the ten workflow routes',()=>{
  assert.equal(D.pages.length,10);assert.equal(S.pages.length,4);
  assert.equal(new Set([...D.pages,...S.pages].map(p=>p.file)).size,14);
});
test('blank reports contain no evidence, reviews, tasks, text or historical builds',()=>{
  const g=S.blank(D.makeScene('missing'),'blank');
  for(const k of ['checks','files','facts','sourceSets','units','actions','builds','tasks'])assert.equal(g[k].length,0,k);
  assert.equal(E.stats(g).canBuild,false);
  assert.equal(g.audit.length,1);assert.equal(g.audit[0].id,'AUD-INIT');
});
test('inheriting configuration preserves new project identity without old facts or approvals',()=>{
  const g=S.blank(D.makeScene('normal'),'inherit',{sourceName:'旧年虚构报告',values:{industry:'制造业',language:'English',scope:'虚构范围'}});
  assert.equal(g.project.id,P.DEFAULT_ID);assert.equal(S.config(g).period,'2025');
  assert.equal(S.config(g).language,'English');assert.equal(g.units.length,0);assert.equal(g.builds.length,0);
});
test('adopting a source and template creates unapproved checks and genuinely blank units',()=>{
  let g=S.blank(D.makeScene('normal'),'blank');
  assert.throws(()=>apply(g,'template'),/规则/);
  g=apply(g,'adoptRule',{id:'RULE-MAIN-v2'});assert.ok(g.checks.length);assert.equal(g.checklist.status,'draft');
  g=apply(g,'template');assert.ok(g.units.length);
  g.units.forEach(u=>{assert.equal(u.body,'');assert.equal(u.approvedHash,null);assert.equal(u.fileExists,false);assert.equal(u.comments.length,0);});
  assert.equal(E.stats(g).canBuild,false);assert.equal(g.builds.length,0);
});
test('source retry is a bounded design transition and leaves old rule inputs readable',()=>{
  const g=D.makeScene('normal'),before=JSON.stringify(g.checklist);
  let next=apply(g,'ruleRetry',{id:'RULE-APPENDIX-v1'});assert.equal(S.state(next).ruleOverrides['RULE-APPENDIX-v1'],'normalizing');
  next=apply(next,'ruleFinish',{id:'RULE-APPENDIX-v1'});assert.equal(S.state(next).ruleOverrides['RULE-APPENDIX-v1'],'normalized');
  next=apply(next,'adoptRule',{id:'RULE-MAIN-v2'});assert.equal(JSON.stringify(next.checklist),before);assert.equal(S.rules.find(r=>r.id==='RULE-MAIN-v1').status,'superseded');
});
test('reference binding cannot increase facts, mappings or coverage',()=>{
  const g=D.makeScene('normal'),next=apply(g,'reference',{id:'REF-STYLE-01',unitId:'ENV-001'});
  assert.deepEqual(E.stats(next),E.stats(g));assert.deepEqual(next.facts,g.facts);assert.deepEqual(next.mappings,g.mappings);
  assert.equal(S.state(next).references['ENV-001'],'REF-STYLE-01');
  assert.throws(()=>apply(g,'reference',{id:'bad',unitId:'ENV-001'}));
});
test('prompt draft/rejection/publication/adoption preserve text and frozen reports',()=>{
  const base=D.makeScene('normal'),unit=base.units.find(u=>u.id==='ENV-001');
  for(const scene of ['draft','rejected','published']){
    const g=apply(base,'promptScene',{scene});assert.equal(S.promptProfile(g,unit).version,1);assert.deepEqual(g.builds,base.builds);assert.deepEqual(g.units,base.units);
  }
  let g=apply(base,'promptScene',{scene:'published'});assert.equal(S.promptProfile(g,unit).pending,true);
  g=apply(g,'adoptPrompt',{id:unit.id});assert.equal(S.promptProfile(g,unit).version,2);assert.equal(S.promptProfile(g,g.units[0]).version,1);
  assert.deepEqual(g.units,base.units);assert.deepEqual(g.builds,base.builds);
  const reset=apply(g,'promptScene',{scene:'draft'});assert.equal(S.promptProfile(reset,unit).version,1);assert.equal(S.state(reset).promptAdoptions.length,0);
});
test('impact follows actual citations and leaves unrelated units out',()=>{
  const g=D.makeScene('upstream-change'),impact=S.impacted(g);
  assert.deepEqual(impact.units.map(u=>u.id).sort(),['CLI-001','ENV-001']);
  assert.equal(impact.unaffected.length+impact.units.length,g.units.length);
  assert.ok(impact.versions.includes('FV-ENV-001-v2'));
  const reduced=D.clone(g);reduced.units.find(u=>u.id==='CLI-001').factIds=[];reduced.units.find(u=>u.id==='CLI-001').locatorIds=[];
  assert.deepEqual(S.impacted(reduced).units.map(u=>u.id),['ENV-001']);
});
test('format errors and styles never mutate frozen build payloads',()=>{
  const g=D.makeScene('normal');let next=apply(g,'export',{buildId:g.builds[0].id,format:'pdf',status:'failed'});
  next=apply(next,'style',{heading:'三级标题'});assert.deepEqual(next.builds,g.builds);assert.deepEqual(next.units,g.units);
});
test('configuration is a proposal and models retain their prompt snapshot',()=>{
  let g=D.makeScene('normal');g=apply(g,'config',{...S.config(g),service:'unavailable',language:'English'});
  assert.equal(g.project.language,'简体中文');assert.equal(S.config(g).language,'English');
  g=apply(g,'promptScene',{scene:'upgraded'});
  g=E.reduce(g,{type:'startModel',targetType:'unit',ids:['ENV-001'],actionType:'validate',label:'模拟检验',page:'writing'});
  const task=g.actions[0];assert.equal(task.prompt_design_snapshot.version,2);
  g=apply(g,'promptScene',{scene:'baseline'});assert.equal(g.actions[0].prompt_design_snapshot.version,2);
});
