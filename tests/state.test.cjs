const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../public/assets/shared.js');
const D = E.D;
const run = (g, type, payload = {}) => E.reduce(g, { type, ...payload }, { runId: 'TEST', time: '2026-09-07 15:00' });
const sourceApproved = () => run(E.makeScene('source-review'), 'approveSource', { id: 'FAM-ENV', files: ['FILE-ENV-2','FILE-ENV-NOTE'], reason: 'Validated fictional source correction.' });
const factAccepted = () => run(run(sourceApproved(), 'extractFacts'), 'acceptFact', { id: 'FV-ENV-001-v2', reason: 'Validated value, boundary and original location.' });
function model(g, targetType, ids, actionType = 'draft', operation = actionType, fail = false) {
  g = run(g, 'startModel', { targetType, ids, actionType, operation, label: 'Test model action', page: 'writing', fail });
  const id = g.actions[0].id;
  g = run(run(g, 'advanceModel', { id }), 'advanceModel', { id });
  return { g, id };
}
test('normal baseline passes all eight gates and is independently cloned', () => {
  const a = E.makeScene('normal'), b = E.makeScene('normal');
  a.units[0].body = 'changed'; assert.notEqual(a.units[0].body,b.units[0].body);
  assert.equal(E.preflight(b).length,8); assert.ok(E.preflight(b).every(r=>r.pass));
});
test('source approval does not extract or accept facts', () => {
  const g=sourceApproved(); assert.equal(g.facts.length,8);assert.equal(E.byId(g.sourceSets,'AS-ENV-2').status,'effective');
  const extracted=run(g,'extractFacts');assert.equal(E.byId(extracted.facts,'FV-ENV-001-v2').status,'candidate');
  assert.equal(E.byId(extracted.facts,'FV-ENV-001-v1').status,'effective');
});
test('fact acceptance affects exactly dependent units, not frozen reports', () => {
  const before=sourceApproved(),g=factAccepted();
  assert.deepEqual(g.units.filter(u=>u.reviewRequired).map(u=>u.id).sort(),['CLI-001','ENV-001']);
  assert.equal(E.byId(g.mappings,'MAP-ENV-001').status,'needs_review');
  assert.equal(E.byId(g.facts,'FV-ENV-001-v1').status,'superseded');
  assert.deepEqual(g.builds,before.builds);assert.equal(E.stats(g).canBuild,false);
});
test('full source/fact/mapping/writing/build chain preserves old report', () => {
  let g=factAccepted(); const history=JSON.stringify(g.builds[0]);
  g=run(g,'confirmMapping',{id:'CHK-ENV-001',reason:'Coverage confirmed with current effective fact.'});
  assert.deepEqual(E.linksFor(g,'CHK-ENV-001').counts,{files:1,facts:1,effective:1,units:1});
  for(const id of ['ENV-001','CLI-001']) {
    const m=model(g,'unit',[id]);g=m.g;const output=g.actions[0].output;
    g=run(g,'applyModel',{id:m.id});assert.equal(E.byId(g.units,id).body,output);assert.equal(E.byId(g.units,id).status,'drafting');
    g=run(g,'submitUnit',{id});g=run(g,'approveUnit',{id,reason:'Body and citations reviewed.'});g=run(g,'lockUnit',{id});
  }
  assert.ok(E.preflight(g).every(r=>r.pass));g=run(g,'buildReport');assert.equal(g.builds.length,2);
  assert.equal(JSON.stringify(g.builds[0]),history);assert.ok(g.builds[1].body.includes('568.4'));
  assert.ok(g.builds[0].body.includes('590.9'));assert.equal(g.builds[1].status,'ready');
  g=run(g,'approveBuild',{id:g.activeBuild,reason:'Final review.'});assert.equal(g.builds[1].status,'approved');
  assert.equal(run(g,'buildReport').builds.length,2);
});
test('each preflight failure scene blocks formal build', () => {
  for(let i=1;i<=8;i++) {const g=E.makeScene('preflight-'+i);assert.equal(E.preflight(g)[i-1].pass,false,'PF-'+i);assert.throws(()=>run(g,'buildReport'));}
});
test('locked units reject manual overwrites', () => {
  assert.throws(()=>run(E.makeScene('normal'),'saveUnit',{id:'ENV-001',body:'overwrite'}));
});
test('model input and output remain fixed when upstream state changes', () => {
  let g=sourceApproved();g=run(g,'extractFacts');
  const m=model(g,'unit',['ENV-001']);g=m.g;const output=g.actions[0].output;
  g=run(g,'acceptFact',{id:'FV-ENV-001-v2',reason:'Changed after generation.'});
  assert.equal(g.actions[0].output,output);assert.throws(()=>run(g,'applyModel',{id:m.id}));
  assert.equal(g.actions[0].status,'review');
});
test('model failure retries fixed scope and cannot apply twice', () => {
  let g=E.makeScene('model-failed');const id=g.actions[0].id,hash=g.actions[0].inputHash;
  assert.equal(g.contextPacks.length,1);g=run(g,'retryModel',{id});
  g=run(run(g,'advanceModel',{id}),'advanceModel',{id});assert.equal(g.actions[0].inputHash,hash);
  g=run(g,'applyModel',{id});assert.equal(g.actions[0].status,'applied');assert.throws(()=>run(g,'applyModel',{id}));
});
test('summarize only keeps analysis and does not extract facts', () => {
  let {g,id}=model(E.makeScene('normal'),'file',['FILE-GOV-1'],'extract','summarize');g=run(g,'applyModel',{id});assert.equal(g.facts.length,8);assert.equal(g.actions[0].status,'applied');
});
test('refusing model output leaves business objects unchanged', () => {
  const before=E.makeScene('normal');let {g,id}=model(before,'unit',['ENV-001']);g=run(g,'rejectModel',{id});assert.deepEqual(g.units,before.units);assert.equal(g.actions[0].status,'rejected');
});
test('mapping deletion preserves history and propagates review', () => {
  let g=E.makeScene('normal');g=run(g,'removeMapping',{id:'MAP-ENV-001',reason:'Invalid mapping.'});assert.equal(E.coverage(g,'CHK-ENV-001'),'missing');assert.equal(g.mappings[1].history.length,1);assert.equal(g.units[1].reviewRequired,true);
});
test('external conflict cannot silently overwrite', () => {
  let g=run(E.makeScene('external-change'),'deriveUnit',{id:'ENV-001'});g=run(g,'saveUnit',{id:'ENV-001',body:g.units[1].body+'\n\nLocal edit.'});
  assert.throws(()=>run(g,'syncExternal',{id:'ENV-001'}));g=run(g,'syncExternal',{id:'ENV-001',resolution:'external'});
  assert.equal(g.units[1].externalBody,undefined);assert.equal(g.units[1].status,'drafting');assert.equal(E.stats(g).canBuild,false);
});
test('framework changes preserve stable IDs and require new approvals', () => {
  let g=E.makeScene('normal');const old=g.units.map(u=>u.id);g=run(g,'reorderUnit',{id:'ENV-001',delta:-1});assert.deepEqual(g.units.map(u=>u.id),old);assert.equal(g.framework.status,'draft');assert.equal(E.preflight(g)[6].pass,false);
  g=run(g,'publishFramework',{reason:'Order reviewed.'});g=run(g,'rebaseUnit',{id:'ENV-001'});assert.equal(g.units[1].frameworkVersion,2);assert.equal(g.units[1].status,'review');
});
test('context excludes unrelated facts and includes required effective versions', () => {
  const g=factAccepted(),pack=E.contextPack(g,'unit',['ENV-001'],'writing');assert.ok(pack.fact_version_ids.includes('FV-ENV-001-v2'));assert.ok(!pack.fact_version_ids.includes('FV-SOC-001-v1'));assert.ok(pack.input_snapshot.selected[0].body);
});
test('formal build reads exact approved unit bodies in manifest order', () => {
  const g=E.makeScene('normal'),a=D.makeBuild(g,'A',1,'t1'),b=D.makeBuild(g,'B',2,'t2');assert.equal(a.body,b.body);assert.equal(a.hash,b.hash);assert.ok(a.body.indexOf(g.units[0].body)<a.body.indexOf(g.units[1].body));
});
test('new check does not rewrite its source; file paths track checklist and framework versions', () => {
  const base=E.makeScene('normal'), original=base.checks[0];
  let {g,id}=model(base,'check',[original.id],'draft','newCheck');g=run(g,'applyModel',{id});
  assert.deepEqual(g.checks[0],original);assert.equal(g.checks.length,base.checks.length+1);
  assert.ok(g.checklist.path.endsWith('-v2.json'));assert.equal(E.resolveObject(g,'check',original.id).version,2);
  g=run(g,'reorderUnit',{id:'ENV-001',delta:-1});assert.ok(g.framework.path.endsWith('-v2.json'));
});
test('supporting note alone cannot become the authoritative quantitative source',()=>{
  assert.throws(()=>run(E.makeScene('source-review'),'approveSource',{id:'FAM-ENV',files:['FILE-ENV-NOTE'],reason:'Only a note.'}));
});
test('model pending input changes cannot silently regenerate output during review',()=>{
  let g=run(sourceApproved(),'extractFacts');g=run(g,'startModel',{targetType:'unit',ids:['ENV-001'],actionType:'draft',label:'Fixed input',page:'writing'});
  const id=g.actions[0].id,output=g.actions[0].frozenOutput;
  g=run(g,'acceptFact',{id:'FV-ENV-001-v2',reason:'Changed while pending.'});
  g=run(run(g,'advanceModel',{id}),'advanceModel',{id});assert.equal(g.actions[0].output,output);assert.throws(()=>run(g,'applyModel',{id}));
});
test('history carries its own source approvals and configuration, independent of working changes',()=>{
  const g=E.makeScene('normal'),build=g.builds[0],frozen=JSON.stringify(build);
  g.sourceSets.forEach(s=>{s.approvedBy='';s.status='rejected';});g.framework.version=99;g.checklist.version=99;
  assert.equal(JSON.stringify(build),frozen);assert.ok(build.sourceSets.some(s=>s.approvedBy));assert.equal(build.framework.version,1);
  assert.equal(E.coverage({...g,...build},'CHK-ENV-001'),'covered');
});
test('each preflight failure can be repaired through domain actions and required approvals',()=>{
  const review=(g,id)=>{if(E.byId(g.units,id).status==='drafting')g=run(g,'submitUnit',{id});g=run(g,'approveUnit',{id,reason:'Rechecked fictional evidence.'});return run(g,'lockUnit',{id});};
  for(let n=1;n<=8;n++){
    let g=E.makeScene('preflight-'+n);
    if(n===1||n===2)g=run(g,'confirmMapping',{id:n===1?'CHK-ENV-002':'CHK-GOV-001',reason:'Missing elements verified.'});
    if(n===3){g=run(g,'deriveUnit',{id:'ENV-001'});g=run(g,'saveUnit',{id:'ENV-001',body:E.byId(g.units,'ENV-001').body});g=review(g,'ENV-001');}
    if(n===4)g=review(g,'ENV-001');
    if(n===5){g=run(g,'approveSource',{id:'FAM-ENV',files:['FILE-ENV-2','FILE-ENV-NOTE'],reason:'Revised source approved.'});g=run(g,'extractFacts');g=run(g,'acceptFact',{id:'FV-ENV-001-v2',reason:'New effective fact.'});g=run(g,'confirmMapping',{id:'CHK-ENV-001',factIds:['FV-ENV-001-v2'],reason:'Current evidence.'});for(const uid of ['ENV-001','CLI-001']){const m=model(g,'unit',[uid]);g=run(m.g,'applyModel',{id:m.id});g=review(g,uid);}}
    if(n===6){g=run(g,'syncExternal',{id:'ENV-001'});g=review(g,'ENV-001');}
    if(n===7){g=run(g,'rebaseUnit',{id:'ENV-001'});g=review(g,'ENV-001');}
    if(n===8){g=run(g,'repairReferences',{id:'ENV-001'});g=review(g,'ENV-001');}
    assert.ok(E.preflight(g).every(r=>r.pass),'repaired PF-'+n);assert.doesNotThrow(()=>run(g,'buildReport'));
  }
});
