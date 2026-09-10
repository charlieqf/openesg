const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../public/assets/projects-data.js');
const E = require('../public/assets/shared.js');
const memory = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable:true, value:{ getItem:key=>memory.get(key)||null, setItem:(key,value)=>memory.set(key,String(value)) } });
test.beforeEach(()=>memory.clear());

test('portfolio seeds and storage keys preserve the original project namespace',()=>{
  assert.equal(P.catalog().length,4); assert.equal(P.catalog().filter(p=>p.archived).length,1);
  assert.equal(P.stateKey(P.DEFAULT_ID),'openesg-demo:v1');
  assert.equal(new Set(P.seeds.map(p=>P.stateKey(p.id))).size,4);
  assert.equal(memory.size,0);
});
test('every project and scene retains original gate outcomes and own frozen manifests',()=>{
  for(const p of P.seeds) for(const scene of E.D.scenes){
    const g=P.makeScene(scene.id,p), base=E.D.makeScene(scene.id);
    assert.deepEqual(E.preflight(g).map(x=>x.pass),E.preflight(base).map(x=>x.pass),p.id+' '+scene.id);
    assert.equal(g.project.id,p.id); assert.equal(g.project.period,p.year);
    assert.equal(g.builds[0].manifest.projectId,p.id);
    assert.equal(g.builds[0].hash,E.fingerprint(g.builds[0].body));
    for(const u of [...g.units,...g.builds[0].units]) { assert.equal(u.contentHash,E.fingerprint(u.body)); assert.ok(u.path.startsWith('projects/'+p.id+'/')); }
    if(p.id!==P.DEFAULT_ID) assert.ok(!JSON.stringify(g).includes('projects/'+P.DEFAULT_ID));
  }
});
test('creating duplicate reports cannot overwrite metadata or existing state',()=>{
  memory.set(P.stateKey(P.DEFAULT_ID),'legacy bytes');
  const result=P.create({name:'远澜国际控股',year:'2025',title:'不得覆盖'});
  assert.equal(result.existing,true);assert.equal(P.catalog().length,4);
  assert.equal(memory.get(P.stateKey(P.DEFAULT_ID)),'legacy bytes');assert.notEqual(result.project.title,'不得覆盖');
});
test('custom quoted company names survive graph creation, with no shared objects',()=>{
  const result=P.create({name:'测试 "引号" \\ 公司 <虚构>',year:'2026',title:'自定义演示报告'});
  const g=P.graphFor(result.project), original=P.graphFor(P.seeds[0]);
  assert.equal(result.existing,false);assert.equal(P.catalog().length,5);assert.equal(g.project.name,result.project.name);
  assert.ok(E.unitDraft(g,g.units[0]).includes(result.project.name));
  g.units[0].body='edited';assert.notEqual(original.units[0].body,'edited');
});
test('archive and restore only change catalog metadata, preserving all project bytes',()=>{
  for(const p of P.seeds) memory.set(P.stateKey(p.id),'state '+p.id);
  const before=P.seeds.map(p=>memory.get(P.stateKey(p.id)));
  P.archive(P.DEFAULT_ID,true);assert.equal(P.find(P.DEFAULT_ID).archived,true);
  P.archive(P.DEFAULT_ID,false);assert.equal(P.find(P.DEFAULT_ID).archived,false);
  assert.deepEqual(P.seeds.map(p=>memory.get(P.stateKey(p.id))),before);
});
test('invalid input and corrupt directories fail without silently replacing stored data',()=>{
  assert.throws(()=>P.create({name:'',year:'2025',title:'无效'}));
  assert.throws(()=>P.create({name:'虚构',year:'9999',title:'无效'}));
  memory.set(P.KEY,'{"version":1,"projects":[]}');const before=memory.get(P.KEY);
  assert.throws(()=>P.catalog());assert.equal(memory.get(P.KEY),before);
  assert.throws(()=>P.makeScene('normal',undefined));
});
