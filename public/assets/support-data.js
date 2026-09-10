/* Fictional, browser-local design scenarios. No regulatory text, remote services or credentials. */
(function (root) {
  'use strict';
  const D = root.ESGDemo || (typeof require !== 'undefined' ? require('./demo-data.js') : null);
  const pages = [
    ['11-project-settings.html', 'settings', '项目配置', '项目配置与运行环境', 'tree'],
    ['12-regulatory-library.html', 'regulatory', '合规来源库', '合规来源与采用版本', 'book'],
    ['13-reference-library.html', 'references', '参考与模板', '行业参考与模板库', 'layers'],
    ['14-runs-and-impact.html', 'runs', '运行与影响', '运行记录与影响分析', 'history'],
  ].map((p, i) => ({ file:p[0], key:p[1], label:p[2], title:p[3], icon:p[4], id:'P'+(11+i), stage:'支撑' }));
  const rules = [
    {id:'RULE-MAIN-v2', family:'RULE-MAIN', title:'披露守则 · 规范化修订样例', role:'主规则', version:2, status:'normalized', published:'2026-08-01', effective:'2026-09-01', url:'https://regulator.example/disclosure/main-v2', path:'regulations/demo-rule-v2.md', replaces:'RULE-MAIN-v1', lines:'L12–L18', note:'增加边界说明的定位标记；不是已核实的监管变更。'},
    {id:'RULE-MAIN-v1', family:'RULE-MAIN', title:'披露守则 · 原采用样例', role:'主规则', version:1, status:'superseded', published:'2025-01-01', effective:'2025-01-01', url:'https://regulator.example/disclosure/main-v1', path:'regulations/demo-rule-v1.md', lines:'L10–L16', note:'来源已被新版替代；已采用此版的清单和历史报告仍保留原输入。'},
    {id:'RULE-FAQ-v1', family:'RULE-FAQ', title:'报告边界与口径 · FAQ 样例', role:'补充指引', version:1, status:'normalized', published:'2025-03-01', effective:'2025-03-01', url:'https://regulator.example/disclosure/faq', path:'regulations/demo-faq-v1.md', parent:'RULE-MAIN', lines:'L4–L8', note:'解释主规则，不独立增加强制披露项。'},
    {id:'RULE-APPENDIX-v1', family:'RULE-APPENDIX', title:'表格附录 · 待修复样例', role:'补充附件', version:1, status:'failed', published:'2026-08-01', effective:'2026-09-01', url:'https://regulator.example/disclosure/appendix', path:'regulations/demo-appendix-v1.md', parent:'RULE-MAIN', lines:'第 3 页表格', note:'E-TABLE-HEADER：合并表头无法定位；原件保留，需检查列名后重试。'},
  ].map(r => ({...r, hash:D.fingerprint({id:r.id, text:r.note}), parser:'demo-normalizer-v2'}));
  const references = [
    {id:'REF-STYLE-01', title:'海汀金融 · 年度可持续发展报告', industry:'证券与金融服务', year:'2025', market:'香港', language:'简体中文', chapter:'环境 / 排放口径', position:'第 28 页 · 表 3 后说明', kind:'章节写法', text:'先列组织边界，再说明计算方法与口径变化；结果单列，解释不混入数据列。', excerpt:'[写法样例] 本节依次说明纳入范围、数据来源和计算方法。口径变化与可比性说明独立列示。', url:'https://reference.example/haiting/2025', path:'references/industry/haiting-2025.md'},
    {id:'REF-STYLE-02', title:'屿川资本 · 气候披露样例', industry:'证券与金融服务', year:'2024', market:'香港', language:'繁體中文', chapter:'气候 / 策略与韧性', position:'第 36 页 · 2.3 节', kind:'表格结构', text:'风险类别、时间跨度、影响路径和管理回应四列呈现；不借用参考公司的风险结论。', excerpt:'风险类别 | 时间跨度 | 影响路径 | 管理回应\n[待填] | [待填] | [须有本公司依据] | [待填]', url:'https://reference.example/yuchuan/2024', path:'references/industry/yuchuan-2024.md'},
    {id:'REF-STYLE-03', title:'青禾制造 · 资源管理样例', industry:'制造业', year:'2025', market:'香港', language:'English', chapter:'Resources / Efficiency', position:'Page 18 · Figure 2 caption', kind:'图注样式', text:'图注明确单位、报告期与统计范围；排除金融行业不适用的生产效率指标。', excerpt:'[Structure only] Indicator · reporting period · unit · organisational boundary. Use project evidence only.', url:'https://reference.example/qinghe/2025', path:'references/industry/qinghe-2025.md'},
  ];
  const promptScenes = {baseline:'已发布 v1', draft:'v2 待审核', rejected:'v2 被退回', published:'v2 已发布 · 选择采用版本', upgraded:'相关要点采用 v2'};
  const labels = {normalized:'已规范化', superseded:'已被替代', failed:'规范化失败', normalizing:'规范化中'};
  const need = (v, text) => { if (!v) throw new Error(text); };
  function state(g) { return {promptScene:'baseline', promptAdoptions:[], ruleVersion:g.initialization ? null : 'RULE-MAIN-v1', ruleOverrides:{}, references:{}, config:null, runSample:'impact', style:{heading:'二级标题', caption:'下方 · 含单位与报告期', pageBreak:'新章节另起页'}, exportStates:{}, ...g.support}; }
  function config(g) { return state(g).config || {market:g.project.market, industry:g.project.industry, scope:'母公司及纳入合并范围的办公运营主体（虚构）', period:g.project.period, language:g.project.language, root:g.project.root, framework:g.project.framework, model:'本地模拟服务', service:'available'}; }
  function blank(g, mode, inheritedConfig) {
    ['checks','files','families','sourceSets','facts','locators','mappings','units','builds','actions','contextPacks','tasks'].forEach(k => { g[k]=[]; });
    g.activeBuild=null; g.checklist={...g.checklist, version:1, status:'draft', history:[]}; g.framework={...g.framework, version:1, status:'draft', history:[]};
    g.initialization={mode, configured:mode==='inherit', inheritedFrom:inheritedConfig?.sourceName || null};
    g.support={ruleVersion:null, ...(inheritedConfig ? {config:{...config(g), ...inheritedConfig.values, period:g.project.period, root:g.project.root}} : {})};
    if (inheritedConfig) { g.project.industry=config(g).industry; g.project.language=config(g).language; }
    g.audit=[{id:'AUD-INIT', title:mode==='inherit'?'沿用配置创建空白报告':'创建空白报告项目', actor:'林悦（虚构）', role:'ESG 撰写人', time:'2026-09-10 10:00', reason:'不复制资料、事实、正文、审核记录或构建。', node:'project.init', runId:'INIT-DEMO', inputHash:D.fingerprint(g.project)}];
    return g;
  }
  function impacted(g, factId='FACT-ENV-001') {
    const versions = g.facts.filter(f => f.factId===factId).map(f => f.id);
    const maps = g.mappings.filter(m => !m.removed && m.factIds.some(id=>versions.includes(id)));
    const units = g.units.filter(u => u.factIds.some(id=>versions.includes(id)) || u.locatorIds.some(id=>g.facts.some(f=>versions.includes(f.id)&&f.locatorIds.includes(id))));
    return {factId, versions, maps, units, unaffected:g.units.filter(u=>!units.some(v=>v.id===u.id)), builds:g.builds};
  }
  const promptUnits = g => g.units.filter(u=>u.checkIds.includes('CHK-ENV-001'));
  function promptProfile(g, unit) {
    const s=state(g), published=['published','upgraded'].includes(s.promptScene), applicable=!unit || unit.checkIds.includes('CHK-ENV-001');
    const adopted=applicable && published && (!unit || s.promptScene==='upgraded' || s.promptAdoptions.includes(unit.id));
    return {scene:s.promptScene, available:published?2:1, version:adopted?2:1, id:'PROMPT-ENV-v'+(adopted?2:1), pending:applicable&&published&&!adopted};
  }
  function promptText(g, check, kind, original, unit) {
    const p=promptProfile(g,unit); if (check.id!=='CHK-ENV-001' || p.version!==2) return original;
    return original+'\n'+(kind==='writing'?'[已发布 v2 样例补充] 单列合并范围与排放边界，并说明与上年不可比的口径；没有证据时标记待补充。':'[已发布 v2 样例补充] 将边界、期间与上年可比性分别列为检验行，逐行给出事实定位，不得以参考报告代替证据。');
  }
  function runRows(g) {
    return g.actions.map(a=>({id:a.id, node:a.operation || a.action_type, label:a.label, status:a.status, targets:a.target_object_ids, input:a.inputHash, output:a.outputHash || '尚无输出', parser:'不适用（模型动作）', model:a.model_config_snapshot?.model || 'demo-reviewer', prompt:a.prompt_design_snapshot?.id || '预置配置 v1', started:a.history?.[0]?.time || '模拟时间', ended:a.history?.at(-1)?.time || '尚未完成', batch:'选中对象批次', task:a}));
  }
  function reduce(source, action) {
    const g=D.clone(source), s=state(g), p=action.payload || {};
    switch(action.op) {
      case 'config': {
        need(p.period===g.project.period, '报告年度属于项目身份，需在项目列表另建年度报告。');
        need(['香港'].includes(p.market) && ['简体中文','繁體中文','English','中英双语'].includes(p.language), '请选择支持的市场和语言。');
        need(['available','unavailable'].includes(p.service) && p.scope?.trim() && p.root?.trim() && p.industry?.trim(), '请补齐范围、目录与行业。');
        s.config={...config(g), ...p}; if(g.initialization) g.initialization.configured=true; break;
      }
      case 'ruleRetry': need(rules.some(r=>r.id===p.id && r.status==='failed'), '不是失败的来源。'); s.ruleOverrides[p.id]='normalizing'; break;
      case 'ruleFinish': need(s.ruleOverrides[p.id]==='normalizing','请先重试规范化。'); s.ruleOverrides[p.id]='normalized'; break;
      case 'adoptRule': {
        const r=rules.find(r=>r.id===p.id); need(r && r.role==='主规则','只能采用主规则作为清单输入。');
        need((s.ruleOverrides[r.id] || r.status)==='normalized','请采用已规范化的当前来源。');
        s.ruleVersion=r.id; s.previousRule='RULE-MAIN-v1';
        if(!g.checks.length) { const sample=D.makeScene('normal'); g.checks=sample.checks.map(c=>({...c,status:'draft',reviewedBy:null})); g.checklist.status='draft'; }
        s.ruleDraft={id:r.id, status:'待审核的清单输入样例', note:'未替换已发布清单，不改覆盖与历史报告'}; break;
      }
      case 'reference': need(references.some(r=>r.id===p.id)&&g.units.some(u=>u.id===p.unitId),'请选择参考与项目内的撰写要点。'); s.references[p.unitId]=p.id; break;
      case 'template': {
        need(!g.units.length,'现有框架不直接覆盖，请从 P07 查看继承差异。'); need(g.checks.length,'先在合规来源库采用演示规则。');
        g.units=D.makeScene('normal').units.map(u=>({...u,path:g.project.root+'/writing/'+u.id+'.md', body:'', contentHash:D.fingerprint(''), approvedHash:null, approvedBy:null, factIds:[], locatorIds:[], charts:[], attachments:[], internalLinks:[], cases:[], issues:[], history:[], comments:[], updatedBy:'尚未起草', updatedAt:'尚未保存', fileExists:false, status:'not_started', reviewRequired:false, frameworkVersion:g.framework.version, referenceId:null}));
        g.framework.status='draft'; s.template='TPL-FINANCE-v2'; break;
      }
      case 'promptScene': need(Object.hasOwn(promptScenes,p.scene),'未知的提示词场景。'); s.promptScene=p.scene; s.promptAdoptions=[]; break;
      case 'adoptPrompt': need(promptProfile(g,g.units.find(u=>u.id===p.id)).available===2 && promptUnits(g).some(u=>u.id===p.id),'该要点没有可采用的新配置。'); s.promptAdoptions=[...new Set([...s.promptAdoptions,p.id])]; break;
      case 'pointConfig': need(g.units.some(u=>u.id===p.id),'要点不存在。'); s.pointConfigs={...s.pointConfigs,[p.id]:p.values}; break;
      case 'style': s.style={...s.style,...p}; break;
      case 'export': need(g.builds.some(b=>b.id===p.buildId),'构建不存在。'); need(['docx','pdf','xlsx'].includes(p.format) && ['pending','running','failed','ready'].includes(p.status),'未知交付状态。'); s.exportStates[p.buildId+':'+p.format]=p.status; break;
      default: throw new Error('未知支撑视图动作。');
    }
    g.support=s;
    g.audit.unshift({id:'AUD-SUPPORT-'+(g.audit.length+1), title:'支撑设计样例：'+action.op, actor:'林悦（虚构）', role:'设计演示操作（非正式审核）', time:'2026-09-10 10:30', reason:'仅本地静态状态；不调用后台服务，不自动批准业务对象。', node:'design.'+action.op, runId:'DESIGN-SUPPORT', inputHash:D.fingerprint(source.support || {})});
    return g;
  }
  const api={pages,rules,references,promptScenes,labels,state,config,blank,impacted,promptUnits,promptProfile,promptText,runRows,reduce}; root.ESGSupport=api;
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
