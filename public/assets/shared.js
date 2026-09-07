(function (root) {
  'use strict';
  const D = root.ESGDemo || (typeof require !== 'undefined' ? require('./demo-data.js') : null);
  const { clone, fingerprint } = D;
  const KEY = 'openesg-demo:v1';
  const byId = (rows, id) => rows.find(row => row.id === id);
  const unique = values => [...new Set(values)];
  const count = (rows, identity) => identity ? unique(rows.map(row => row[identity])).length : rows.length;
  const fileStats = (g, fileId) => {
    const locatorIds = g.locators.filter(l => l.fileId === fileId).map(l => l.id);
    const facts = g.facts.filter(f => f.locatorIds.some(id => locatorIds.includes(id)));
    const maps = g.mappings.filter(m => !m.removed && m.locatorIds.some(id => locatorIds.includes(id)));
    return { facts: count(facts, 'factId'), checks: count(maps, 'checkId'), conflicts: count(maps.filter(m => m.status === 'conflict')) };
  };
  const unitStats = (g, unit) => ({
    checks: count(unit.checkIds), facts: count(unique(unit.factIds.map(id => byId(g.facts,id)?.factId).filter(Boolean))),
    files: count(unique(unit.locatorIds.map(id => byId(g.locators,id)?.fileId).filter(Boolean))),
    unresolved: count(unit.issues) + count(unit.checkIds.filter(id => !['covered','not_applicable'].includes(coverage(g,id)))),
    words: count(Array.from(unit.body.replace(/\s/g, ''))), tables: count(unit.charts), cases: count(unit.cases || []),
    distribution: Object.fromEntries(['covered','partial','missing','not_applicable','conflict','needs_review'].map(s => [s, count(unit.checkIds.filter(id => coverage(g,id) === s))])),
    canCompose: unit.fileExists && ['ready','locked'].includes(unit.status) && !unit.reviewRequired && !unit.issues.length && unit.checkIds.every(id => ['covered','not_applicable'].includes(coverage(g,id)))
  });
  const need = (condition, message) => { if (!condition) throw new Error(message); };
  const now = () => new Date().toLocaleString('sv-SE', { hour12: false }).slice(0, 16);
  const citations = body => unique([...body.matchAll(/［(FV-[A-Z0-9-]+-v\d+)］/g)].map(m => m[1]));
  const effective = (g, fact) => !!fact && fact.status === 'effective' && !!byId(g.sourceSets, fact.sourceSet)?.approvedBy && fact.locatorIds.length > 0 && fact.locatorIds.every(id => !!byId(g.locators, id));
  const latestFact = (g, factId) => g.facts.filter(f => f.factId === factId && effective(g, f)).sort((a, b) => b.version - a.version)[0];
  const mappingFor = (g, checkId) => g.mappings.filter(m => m.checkId === checkId && !m.removed);
  const linksFor = (g, checkId) => {
    const maps = mappingFor(g, checkId);
    const facts = unique(maps.flatMap(m => m.factIds)).map(id => byId(g.facts, id)).filter(Boolean);
    const locators = unique(maps.flatMap(m => m.locatorIds)).map(id => byId(g.locators, id)).filter(Boolean);
    const files = unique(locators.map(l => l.fileId)).map(id => byId(g.files, id)).filter(Boolean);
    const units = g.units.filter(u => u.checkIds.includes(checkId));
    return { maps, facts, locators, files, units, counts: { files: files.length, facts: unique(facts.map(f => f.factId)).length, effective: unique(facts.filter(f => effective(g, f)).map(f => f.factId)).length, units: units.length } };
  };
  const coverage = (g, checkId) => {
    const maps = mappingFor(g, checkId);
    if (!maps.length) return 'missing';
    if (maps.some(m => m.status === 'conflict')) return 'conflict';
    if (maps.some(m => ['candidate', 'needs_review'].includes(m.status))) return 'needs_review';
    if (maps.every(m => m.status === 'not_applicable' && m.confirmedBy && m.reason.trim())) return 'not_applicable';
    if (maps.some(m => m.status === 'covered' && m.confirmedBy && m.factIds.length && m.locatorIds.length && m.factIds.every(id => effective(g, byId(g.facts, id))))) return 'covered';
    if (maps.some(m => m.status === 'partial')) return 'partial';
    if (maps.some(m => m.status === 'covered')) return 'needs_review';
    return 'missing';
  };
  const preflight = g => {
    const results = [
      { id: 'PF-1', title: '强制检查项覆盖', hint: '强制项已覆盖，或具有正式批准的例外', page: 'mapping', type: 'check', failures: g.checks.filter(c => c.requirementType !== 'recommended' && !['covered', 'not_applicable'].includes(coverage(g, c.id))).map(c => c.id) },
      { id: 'PF-2', title: '缺口与冲突处置', hint: '部分覆盖、缺失与冲突均已有批准的处置', page: 'mapping', type: 'check', failures: g.mappings.filter(m => !m.removed && ['partial', 'missing', 'conflict'].includes(m.status) && m.disposition !== 'approved').map(m => m.checkId) },
      { id: 'PF-3', title: '撰写文件完整性', hint: '每个必需要点均存在独立正文文件', page: 'writing', type: 'unit', failures: g.units.filter(u => !u.fileExists).map(u => u.id) },
      { id: 'PF-4', title: '单元审核与锁定', hint: '正文为 ready / locked，且没有待复核事项', page: 'writing', type: 'unit', failures: g.units.filter(u => !['ready', 'locked'].includes(u.status) || u.reviewRequired || u.issues.length).map(u => u.id) },
      { id: 'PF-5', title: '引用事实仍有效', hint: '事实生效，来源获批，原始定位可回看', page: 'facts', type: 'fact', failures: unique(g.units.flatMap(u => u.factIds)).filter(id => !effective(g, byId(g.facts, id))) },
      { id: 'PF-6', title: '正文与审核指纹一致', hint: '无未同步外部修改，内容与审核版本一致', page: 'writing', type: 'unit', failures: g.units.filter(u => u.externalBody || fingerprint(u.body) !== u.contentHash || u.contentHash !== u.approvedHash).map(u => u.id) },
      { id: 'PF-7', title: '框架与单元版本一致', hint: '采用已发布框架，单元所属版本一致', page: 'framework', type: 'unit', failures: g.units.filter(u => u.frameworkVersion !== g.framework.version).map(u => u.id) },
      { id: 'PF-8', title: '图表、附件与交叉引用', hint: '内部链接、引用标记与证据位置均有效', page: 'writing', type: 'unit', failures: g.units.filter(u => [...u.charts, ...u.attachments, ...u.internalLinks].some(x => !x.valid || (x.target && !byId(g.units, x.target)) || (x.fileId && !byId(g.files, x.fileId))) || u.locatorIds.some(id => { const l = byId(g.locators, id); return !l || !byId(g.files, l.fileId) || byId(g.files, l.fileId).version !== l.fileVersion; }) || citations(u.body).some(id => !u.factIds.includes(id)) || u.factIds.some(id => !citations(u.body).includes(id))).map(u => u.id) },
    ];
    if (g.checklist.status !== 'published') results[0].failures.unshift(g.checklist.id);
    if (g.framework.status !== 'published') results[6].failures.unshift(g.framework.id);
    return results.map(r => ({ ...r, failures: unique(r.failures), pass: r.failures.length === 0 }));
  };
  const stats = g => {
    const distribution = Object.fromEntries(['covered', 'partial', 'missing', 'not_applicable', 'conflict', 'needs_review'].map(s => [s, g.checks.filter(c => coverage(g, c.id) === s).length]));
    const pendingFacts = g.facts.filter(f => ['candidate', 'review'].includes(f.status));
    const pendingSources = g.sourceSets.filter(s => ['candidate', 'review'].includes(s.status));
    const reviewedUnits = g.units.filter(u => ['ready', 'locked'].includes(u.status) && !u.reviewRequired && !u.issues.length);
    const gates = preflight(g);
    return { distribution, checks: g.checks.length, files: g.files.length, effectiveFacts: g.facts.filter(f => effective(g, f)).length, pendingFacts: pendingFacts.length, pendingSources: pendingSources.length, units: g.units.length, reviewedUnits: reviewedUnits.length, affectedUnits: g.units.filter(u => u.reviewRequired).length, builds: g.builds.length, pending: pendingSources.length + pendingFacts.length + g.units.filter(u => u.status === 'review' || u.reviewRequired).length + g.mappings.filter(m => !m.removed && ['candidate', 'needs_review'].includes(m.status)).length, passedGates: gates.filter(r => r.pass).length, failedGates: gates.filter(r => !r.pass).length, canBuild: gates.every(r => r.pass) };
  };
  function record(g, action, title, objectId, reason, context) {
    g.audit.unshift({ id: 'AUD-' + context.runId + '-' + (g.audit.length + 1), node: action, title, objectId, actor: '林悦（虚构）', time: context.time, reason: reason || '本地演示操作', inputHash: context.inputHash, status: 'applied', runId: context.runId, attempt: 1 });
    g.lastPreflight = null;
  }
  function deriveUnit(unit) {
    unit.history.push(clone({ ...unit, history: [] }));
    unit.version += 1;
    unit.status = 'drafting';
    unit.approvedHash = null;
  }
  function saveUnit(g, unit, body, context, explicitDerive) {
    need(body.trim(), '正文不能为空。');
    need(unit.status !== 'locked' || explicitDerive, '此单元已锁定，请先派生新版本。');
    if (explicitDerive || unit.body !== body) deriveUnit(unit);
    unit.body = body;
    unit.fileExists = true;
    unit.factIds = citations(body);
    need(unit.factIds.every(id => byId(g.facts, id)), '正文包含未知事实引用。请从证据面板插入有效引用。');
    unit.locatorIds = unique(unit.factIds.flatMap(id => byId(g.facts, id).locatorIds));
    unit.contentHash = fingerprint(body);
    unit.status = 'drafting';
    unit.reviewRequired = false;
    unit.issues = [];
    unit.updatedAt = context.time;
    unit.updatedBy = '林悦（虚构）';
  }
  function unitDraft(g, unit) {
    const factIds = unique([...unit.checkIds.flatMap(id => linksFor(g, id).facts.map(f => f.id)), ...unit.factIds]);
    const facts = unique(factIds.map(id => byId(g.facts, id)?.factId).filter(Boolean)).map(id => latestFact(g, id)).filter(Boolean);
    return '## ' + unit.title + '\n\n2025 年度，远澜国际控股持续完善' + unit.title + '相关工作。\n\n' + facts.map(f => f.title + '为 ' + f.displayValue + ' ' + f.unit + '。［' + f.id + '］').join('\n\n') + '\n\n相关数值采用一致的报告边界，修订情况和计算依据已在证据记录中保留。集团将持续跟进责任分工与实施效果。\n\n> 全部内容为虚构演示，不代表客户实际情况。';
  }
  function reduce(source, action, context = {}) {
    const g = clone(source);
    const ctx = { time: now(), runId: 'RUN-TEST', inputHash: fingerprint(source), ...context };
    const reason = String(action.reason || '').trim();
    const family = byId(g.families, action.id);
    const fact = byId(g.facts, action.id);
    const unit = byId(g.units, action.id);
    let title = action.type;
    switch (action.type) {
      case 'approveSource': {
        need(family, '未找到文件 Family。');
        const set = byId(g.sourceSets, family.proposedSet);
        need(set && ['candidate', 'review'].includes(set.status), '没有待审核来源集合。');
        need(reason, '请填写采用理由。');
        const files = action.files || set.files;
        need(files.length && files.every(id => byId(g.files, id)?.family === family.id), '只能选择当前 Family 的来源文件。');
        need(files.filter(id => byId(g.files,id)?.type === 'Excel').length === 1, '环境来源集合必须且只能采用一份定量主表；补充说明不能单独替代主表。');
        byId(g.sourceSets, family.selectedSet).status = 'superseded';
        set.files = unique(files); set.status = 'effective'; set.reason = reason; set.approvedBy = '林悦（虚构）'; set.approvedAt = ctx.time;
        family.selectedSet = set.id;
        g.files.filter(f => f.family === family.id).forEach(f => { f.status = files.includes(f.id) ? (f.type === 'Excel' ? 'authoritative' : 'supporting') : 'superseded'; });
        g.tasks.filter(t => t.type === 'source' && t.objectId === family.id).forEach(t => { t.status = 'applied'; });
        title = '批准权威来源集合；事实仍需单独审核'; break;
      }
      case 'extractFacts':
        need(byId(g.sourceSets, 'AS-ENV-2').status === 'effective', '请先在权威来源页批准修订来源集合。');
        need(byId(g.sourceSets, 'AS-ENV-2').files.includes('FILE-ENV-2'), '当前批准的来源集合未采用环境修订主表。');
        D.addCandidate(g); title = '提取候选事实，等待人工审核'; break;
      case 'acceptFact': {
        need(fact && ['candidate', 'review'].includes(fact.status), '请选择待审核事实版本。');
        need(reason, '请填写事实审核意见。');
        need(byId(g.sourceSets, fact.sourceSet)?.status === 'effective', '该事实的权威来源集合尚未生效。');
        need(fact.locatorIds.length && fact.locatorIds.every(id => byId(g.locators, id)), '缺少原始证据定位。');
        const previousIds = g.facts.filter(f => f.factId === fact.factId && f.status === 'effective').map(f => f.id);
        g.facts.filter(f => previousIds.includes(f.id)).forEach(f => { f.status = 'superseded'; });
        fact.status = 'effective'; fact.reviewedBy = '林悦（虚构）'; fact.reviewedAt = ctx.time; fact.reviewReason = reason;
        g.mappings.filter(m => !m.removed && m.factIds.some(id => previousIds.includes(id))).forEach(m => { m.history.push(clone({ ...m, history: [] })); m.status = 'needs_review'; m.version += 1; m.reason = '引用事实已更新，请重新核对覆盖。'; m.confirmedBy = ''; });
        g.units.filter(u => u.factIds.some(id => previousIds.includes(id))).forEach(u => { u.reviewRequired = true; u.issues = ['事实 ' + fact.factId + ' 已发布新版本，正文需复核。']; });
        title = '事实新版本生效，标记依赖对象待复核'; break;
      }
      case 'rejectFact':
        need(fact && ['candidate', 'review'].includes(fact.status), '只能拒绝待审核候选。'); need(reason, '请填写拒绝理由。');
        fact.status = 'rejected'; fact.reviewReason = reason; title = '拒绝候选事实，保留有效版本'; break;
      case 'requestEvidence':
        need(reason, '请说明需要补充的证据。');
        g.tasks.push({ id: 'TASK-' + ctx.runId + '-' + (g.tasks.length + 1), title: '补充证据：' + (fact?.title || action.id), type: 'evidence', objectId: action.id, page: fact ? 'facts' : 'mapping', status: 'pending', reason }); title = '创建补证待办'; break;
      case 'confirmMapping': {
        const check = byId(g.checks, action.id); need(check, '检查项不存在。');
        const state = action.status || 'covered';
        need(['covered', 'partial', 'missing', 'not_applicable', 'conflict'].includes(state), '不支持的覆盖状态。');
        need(reason, '请填写覆盖判断或不适用理由。');
        let mapping = byId(g.mappings, action.mappingId) || mappingFor(g, check.id)[0];
        if (!mapping) { mapping = { id: 'MAP-' + check.key, checkId: check.id, version: 0, history: [], factIds: [], locatorIds: [] }; g.mappings.push(mapping); }
        const selectedFacts = (action.factIds || mapping.factIds.map(id => { const f = byId(g.facts, id); return f ? latestFact(g, f.factId)?.id : null; }).filter(Boolean));
        if (state === 'covered') need(selectedFacts.length > 0 && selectedFacts.every(id => effective(g, byId(g.facts, id))), '已覆盖必须关联已生效事实和原始证据。');
        need(selectedFacts.every(id => byId(g.facts, id)), '映射包含未知事实。');
        mapping.history.push(clone({ ...mapping, history: [] })); mapping.version += 1;
        mapping.removed = false; mapping.factIds = unique(selectedFacts); mapping.locatorIds = unique(selectedFacts.flatMap(id => byId(g.facts, id).locatorIds));
        mapping.status = state; mapping.reason = reason; mapping.confirmedBy = '林悦（虚构）'; mapping.disposition = ['covered', 'not_applicable'].includes(state) ? 'approved' : (action.disposition || 'pending');
        title = '确认披露覆盖与证据映射'; break;
      }
      case 'removeMapping': {
        const m = byId(g.mappings, action.id); need(m && !m.removed, '映射不存在。'); need(reason, '请填写移除理由。');
        m.history.push(clone({ ...m, history: [] })); m.removed = true; m.version += 1; m.reason = reason;
        g.units.filter(u => u.checkIds.includes(m.checkId)).forEach(u => { u.reviewRequired = true; u.issues = ['关联映射已移除']; }); title = '移除当前映射，保留历史'; break;
      }
      case 'deriveUnit': need(unit, '要点不存在。'); deriveUnit(unit); title = '从现有正文派生新草稿'; break;
      case 'saveUnit': need(unit, '要点不存在。'); saveUnit(g, unit, String(action.body || ''), ctx, false); title = '保存正文新版本'; break;
      case 'submitUnit':
        need(unit && unit.status === 'drafting', '请先保存可编辑的草稿。'); need(unit.body.trim(), '正文不能为空。');
        unit.status = 'review'; title = '正文提交审核'; break;
      case 'approveUnit': {
        need(unit && unit.status === 'review', '请选择待审核的正文版本。'); need(reason, '请填写审核意见。');
        need(unit.fileExists && unit.body.trim(), '正文文件不完整。');
        need(unit.frameworkVersion === g.framework.version && g.framework.status === 'published', '请先同步已发布的框架版本。');
        need(unit.checkIds.every(id => ['covered', 'not_applicable'].includes(coverage(g, id))), '关联检查项仍存在缺口或待复核映射。');
        need(unit.factIds.length || unit.checkIds.every(id => coverage(g, id) === 'not_applicable'), '正文缺少有效事实引用。');
        need(unit.factIds.every(id => effective(g, byId(g.facts, id))), '正文仍引用未生效或已替代的事实。');
        need(!unit.externalBody, '请先处理外部文件修改。');
        unit.status = 'ready'; unit.reviewRequired = false; unit.issues = []; unit.approvedHash = unit.contentHash;
        unit.comments.push({ author: '林悦（虚构）', text: reason, date: ctx.time }); title = '正文审核通过'; break;
      }
      case 'lockUnit': need(unit && unit.status === 'ready' && !unit.reviewRequired, '仅可锁定审核通过且无待复核事项的单元。'); unit.status = 'locked'; title = '锁定已审核单元'; break;
      case 'externalChange':
        need(unit, '要点不存在。'); unit.externalBaseHash = unit.contentHash; unit.externalBody = unit.body + '\n\n外部修改示例：补充计量边界说明，需人工同步审核。'; unit.externalHash = fingerprint(unit.externalBody); title = '模拟检测到外部文件修改'; break;
      case 'syncExternal': {
        need(unit?.externalBody, '没有待同步的外部修改。');
        need(unit.contentHash === unit.externalBaseHash || action.resolution === 'external' || action.resolution === 'local', '存在并发修改，请明确保留本地或采用外部版本。');
        const body = action.resolution === 'local' ? unit.body : unit.externalBody;
        saveUnit(g, unit, body, ctx, true); delete unit.externalBody; delete unit.externalHash; delete unit.externalBaseHash;
        title = '外部修改作为新草稿同步，仍需审核'; break;
      }
      case 'repairReferences':
        need(unit, '要点不存在。'); deriveUnit(unit); [...unit.charts, ...unit.attachments, ...unit.internalLinks].forEach(x => { x.valid = true; }); unit.status = 'review'; title = '修复演示引用，提交正文复核'; break;
      case 'reorderUnit': {
        need(unit, '要点不存在。'); const ordered = [...g.units].sort((a, b) => a.order - b.order); const index = ordered.findIndex(u => u.id === unit.id); const next = index + Number(action.delta);
        need(next >= 0 && next < ordered.length, '已经位于列表边界。');
        g.framework.history.push(clone({ ...g.framework, history: [], order: ordered.map(u => u.id) }));
        [ordered[index], ordered[next]] = [ordered[next], ordered[index]]; ordered.forEach((u, i) => { u.order = i + 1; });
        g.framework.version += 1; g.framework.status = 'draft'; title = '排序形成新的框架草案'; break;
      }
      case 'configureWritingPoint': {
        need(reason, '请说明框架配置变更理由。'); need(String(action.title || '').trim(), '请输入要点标题。');
        need(Array.isArray(action.checkIds) && action.checkIds.every(id => byId(g.checks, id)), '关联检查项无效。');
        g.framework.history.push(clone({ ...g.framework, history: [], order: g.units.map(u => u.id) }));
        g.framework.version += 1; g.framework.status = 'draft';
        let target = unit;
        if (!target) {
          const id = 'WP-' + String(g.units.length + 1).padStart(3, '0');
          target = { id, title: '', chapter: '', order: g.units.length + 1, type: '叙述', checkIds: [], factIds: [], locatorIds: [], referenceId: 'REF-FIN-1', status: 'not_started', version: 1, frameworkVersion: g.framework.version, path: g.project.root + '/drafts/' + id + '.md', fileExists: false, body: '', contentHash: fingerprint(''), approvedHash: null, reviewRequired: true, issues: ['新要点尚未撰写'], charts: [], attachments: [], internalLinks: [], history: [], comments: [] };
          g.units.push(target);
        } else { deriveUnit(target); target.reviewRequired = true; target.issues = ['撰写要点配置发生变化']; }
        target.title = action.title.trim(); target.chapter = action.chapter || '管治'; target.type = action.contentType || '叙述'; target.checkIds = unique(action.checkIds); target.referenceId = action.referenceId || 'REF-FIN-1';
        title = '配置撰写要点并派生框架草案'; break;
      }
      case 'publishFramework':
        need(reason, '请填写框架发布意见。'); need(g.framework.status !== 'published', '当前框架已发布。');
        need(g.checks.filter(c => c.requirementType === 'mandatory').every(c => g.units.some(u => u.checkIds.includes(c.id))), '存在未分配的强制检查项。');
        g.framework.status = 'published'; g.framework.reviewedBy = '林悦（虚构）'; title = '发布撰写框架新版本'; break;
      case 'rebaseUnit':
        need(unit && g.framework.status === 'published', '请先发布框架。'); deriveUnit(unit); unit.frameworkVersion = g.framework.version; unit.status = 'review'; title = '单元派生至新框架版本，等待复核'; break;
      case 'publishChecklist':
        need(reason, '请填写清单发布意见。'); need(g.checklist.status !== 'published', '当前清单已发布。');
        need(g.checks.every(c => c.primaryClauses.length && c.sourceId && c.applicability), '检查项缺少主条款或适用规则。');
        g.checklist.status = 'published'; g.checklist.reviewedBy = '林悦（虚构）'; g.checklist.reviewedAt = ctx.time;
        g.checks.forEach(c => { c.status = 'published'; c.version = g.checklist.version; }); title = '发布披露检查清单新版本'; break;
      case 'importFile': {
        const template = byId(g.files, action.template || 'FILE-ENV-2'); need(template, '演示文件不存在。');
        if (action.duplicate) { title = '识别重复内容，未重复入库'; break; }
        const f = clone(template); f.id = 'FILE-IMPORT-' + (g.files.length + 1); f.name = '补充收资_待核对_' + f.name; f.family = null; f.status = 'registered'; f.batch = 'BATCH-03'; f.path = g.project.root + '/intake/BATCH-03/' + f.name;
        if (template.status === 'error') { f.type = 'Markdown'; f.paragraphs = ['虚构清晰副本：办公设备维修与转运记录的补充说明。', '本演示副本仍需归组、来源审核及事实抽取，不替代原失败文件。']; f.signal = '清晰演示副本'; f.hash = fingerprint(f.paragraphs); }
        g.files.push(f); title = '导入虚构样例，等待解析与归组'; break;
      }
      case 'parseFile': {
        const f = byId(g.files, action.id); need(f, '文件不存在。'); need(f.status !== 'error', '扫描件仍不清晰。请使用“导入清晰演示副本”，保留失败原件。');
        f.status = 'parsed'; title = '模拟解析完成'; break;
      }
      case 'assignFamily': {
        const f = byId(g.files, action.id); need(f && byId(g.families, action.familyId), '请选择文件与 Family。'); need(['parsed','family_assigned'].includes(f.status), '仅能归组已解析或待来源审核文件。已批准来源需保留原版本，不能直接改组。');
        f.family = action.familyId; f.status = 'family_assigned'; title = '文件归组，未自动批准来源'; break;
      }
      case 'runPreflight': g.lastPreflight = { inputHash: fingerprint(g.units), time: ctx.time, results: preflight(g) }; g.reportState = g.lastPreflight.results.every(r => r.pass) ? 'ready' : 'preflight_failed'; return g;
      case 'buildReport': {
        const gates = preflight(g); need(gates.every(r => r.pass), '预检未通过，不能构建模拟正式版。');
        const build = D.makeBuild(g, 'BUILD-' + String(g.builds.length + 1).padStart(3, '0'), g.builds.length + 1, ctx.time);
        const same = g.builds.find(b => b.hash === build.hash && JSON.stringify(b.manifest) === JSON.stringify(build.manifest) && b.status !== 'rejected');
        if (same) { g.activeBuild = same.id; title = '输入未变化，复用已有构建'; }
        else { g.builds.push(build); g.activeBuild = build.id; title = '按冻结 manifest 构建报告'; }
        g.reportState = 'ready'; break;
      }
      case 'approveBuild': {
        const b = byId(g.builds, action.id); need(b && b.status === 'ready', '请选择待最终审核的构建版本。'); need(reason, '请填写最终审核意见。');
        b.status = 'approved'; b.approvedBy = '林悦（虚构）'; b.approvedAt = ctx.time; b.reviewReason = reason; title = '批准模拟报告版本'; break;
      }
      case 'rejectBuild': {
        const b = byId(g.builds, action.id); need(b && b.status === 'ready', '只能拒绝待审核构建。'); need(reason, '请填写拒绝理由。'); b.status = 'rejected'; b.reviewReason = reason; title = '拒绝构建，保留输出与审核记录'; break;
      }
      case 'startModel': {
        const pack = contextPack(g, action.targetType, action.ids, action.page, action.selection);
        const id = 'MA-' + ctx.runId + '-' + (g.actions.length + 1); pack.id = 'CP-' + id;
        const targetRows = action.ids.map(id => resolveObject(g, action.targetType, id));
        const model = { id, action_type: action.actionType, label: action.label, operation: action.operation || action.actionType, context_pack_id: pack.id, target_object_ids: action.ids, target_type: action.targetType, target_file_paths: targetRows.map(o => o.path), instruction: action.instruction || action.label, output_mode: ['rewrite', 'draft', 'extract', 'map', 'merge'].includes(action.actionType) ? 'diff' : 'suggestion', status: 'pending', model_config_snapshot: { service: '本地模型（模拟）', model: 'demo-reviewer', temperature: 0 }, output_files: [], approved_by: null, approved_at: null, attempt: 1, startedAt: Date.now(), inputHash: fingerprint(targetRows), selection: action.selection || '', page: action.page, history: [{ status: 'pending', time: ctx.time }], output: '', failRequested: action.fail || g.scene === 'model-failed' };
        need(['draft', 'rewrite', 'extract', 'map', 'compare', 'merge', 'validate', 'build'].includes(model.action_type), '不支持的模型动作类型。');
        initializeModel(g, model, pack); g.contextPacks.push(pack); g.actions.unshift(model); title = '创建受限上下文模型任务（模拟）'; break;
      }
      case 'advanceModel': {
        const m = byId(g.actions, action.id); need(m, '任务不存在。');
        if (m.status === 'pending') m.status = 'running';
        else if (m.status === 'running') {
          m.status = m.failRequested ? 'failed' : 'review'; m.error = m.failRequested ? '模拟模型服务连接失败。可以重试，或继续人工处理。' : '';
          if (!m.failRequested) { m.output = m.frozenOutput; m.outputHash = fingerprint(m.output); m.output_files = [g.project.root + '/.openesg/model-actions/' + m.id + '-suggestion.md']; }
        } else return source;
        m.history.push({ status: m.status, time: ctx.time }); return g;
      }
      case 'retryModel': {
        const m = byId(g.actions, action.id); need(m && m.status === 'failed', '只能重试失败任务。');
        m.status = 'pending'; m.failRequested = false; m.startedAt = Date.now(); m.attempt += 1; m.history.push({ status: 'pending', time: ctx.time, note: '保留前次失败；按原始输入快照重试' }); title = '从失败模型节点重试'; break;
      }
      case 'rejectModel': {
        const m = byId(g.actions, action.id); need(m && m.status === 'review', '请选择待确认模型输出。'); m.status = 'rejected'; m.history.push({ status: 'rejected', time: ctx.time }); title = '拒绝模型建议，未改变业务对象'; break;
      }
      case 'applyModel': {
        const m = byId(g.actions, action.id); need(m && m.status === 'review', '请选择待确认模型输出。');
        need(m.inputHash === fingerprint(m.target_object_ids.map(id => resolveObject(g, m.target_type, id))), '目标版本已变化；建议已过期。请拒绝旧建议并重新生成，不能直接覆盖。');
        need(m.contextHash === fingerprint(contextPack(g, m.target_type, m.target_object_ids, m.page, m.selection).input_snapshot), '引用的上游版本已变化；请保留旧输出并重新生成建议。');
        need(m.outputHash === fingerprint(m.output), '模型输出指纹不一致，不能应用未经查看的结果。');
        if (m.target_type === 'unit' && ['draft', 'rewrite', 'merge'].includes(m.action_type)) {
          m.frozenUnits.forEach(row => { const u = byId(g.units, row.id); saveUnit(g, u, row.body, ctx, true); });
        } else if (m.action_type === 'extract' && m.operation === 'extractFacts') {
          need(m.target_type === 'file' && m.target_object_ids.includes('FILE-ENV-2'), '此演示抽取建议只适用于选中的环境修订主表。其他文件请先查看总结或人工登记事实。');
          need(byId(g.sourceSets, 'AS-ENV-2').status === 'effective', '请先批准环境修订来源集合，再应用事实候选。'); D.addCandidate(g);
          need(byId(g.sourceSets, 'AS-ENV-2').files.includes('FILE-ENV-2'), '抽取文件不在当前批准的来源集合中。');
        } else if (m.target_type === 'check' && ['draft', 'rewrite', 'merge'].includes(m.action_type)) {
          g.checklist.history.push(clone({ ...g.checklist, history: [], checks: g.checks })); g.checklist.version += 1; g.checklist.status = 'draft';
          if (m.operation !== 'newCheck') m.target_object_ids.forEach(id => { const c = byId(g.checks, id); c.summary = m.output; c.status = 'draft'; c.version = g.checklist.version; });
          if (m.operation === 'split' || m.operation === 'newCheck') {
            m.target_object_ids.forEach(id => { const c = clone(byId(g.checks, id)); c.id += '-S' + g.checklist.version; c.key += '-S' + g.checklist.version; c.title += ' · 计算方法'; c.summary = m.output; c.status = 'draft'; c.version = g.checklist.version; c.unitIds = []; g.checks.push(c); });
          }
          if (m.operation === 'merge') {
            need(m.target_object_ids.length > 1, '合并至少需要两个检查项。'); const c = byId(g.checks, m.target_object_ids[0]); c.title = '合并检查：' + m.target_object_ids.map(id => byId(g.checks, id).title).join(' / '); c.primaryClauses = unique(m.target_object_ids.flatMap(id => byId(g.checks, id).primaryClauses)); c.summary = m.output;
            g.checks = g.checks.filter(row => row.id === c.id || !m.target_object_ids.includes(row.id)); g.mappings.filter(row => m.target_object_ids.includes(row.checkId)).forEach(row => { row.checkId = c.id; row.status = 'needs_review'; }); g.units.forEach(u => { u.checkIds = unique(u.checkIds.map(id => m.target_object_ids.includes(id) ? c.id : id)); });
          }
        } else if (m.action_type === 'map') {
          const checkId = m.target_type === 'check' ? m.target_object_ids[0] : g.mappings.find(row => row.locatorIds.some(id => m.target_object_ids.includes(byId(g.locators, id)?.fileId)))?.checkId;
          need(checkId, '所选文件尚无明确检查项关联。请先选中证据并创建人工映射。'); let mp = mappingFor(g, checkId)[0];
          if (!mp) { mp = { id: 'MAP-AI-' + g.mappings.length, checkId, version: 0, history: [], factIds: [], locatorIds: [] }; g.mappings.push(mp); }
          mp.history.push(clone({ ...mp, history: [] })); mp.status = 'needs_review'; mp.version += 1; mp.confirmedBy = ''; mp.reason = '模型候选，尚未经人工覆盖确认。';
        } else if (m.target_type === 'framework' && ['draft', 'rewrite'].includes(m.action_type)) {
          g.framework.history.push(clone({ ...g.framework, history: [], order: g.units.map(u => u.id) })); g.framework.version += 1; g.framework.status = 'draft'; g.framework.proposal = m.output;
        }
        m.status = 'applied'; m.approved_by = '林悦（虚构）'; m.approved_at = ctx.time; m.history.push({ status: 'applied', time: ctx.time }); title = '应用模型建议；未替代业务审核'; break;
      }
      default: throw new Error('未知演示动作：' + action.type);
    }
    g.checklist.path = g.project.root + '/checklists/disclosure-checklist-v' + g.checklist.version + '.json';
    g.framework.path = g.project.root + '/framework/writing-framework-v' + g.framework.version + '.json';
    record(g, action.type, title, action.id || '', reason, ctx);
    return g;
  }
  function resolveObject(g, type, id) {
    const list = { file: 'files', fact: 'facts', check: 'checks', mapping: 'mappings', unit: 'units', family: 'families', build: 'builds', regulation: 'regulations', reference: 'references', action: 'actions' }[type];
    const row = type === 'project' ? g.project : type === 'framework' ? g.framework : type === 'composition' && id === 'COMPOSITION-CURRENT' ? { id, title: '当前合成输入清单（预览）', version: g.framework.version, path: g.project.root + '/reports/working/report-manifest.json', manifest: D.makeBuild(g, 'PREVIEW', 0, '').manifest, demonstration: true } : list ? byId(g[list], id) : null;
    need(row && row.id === id, '对象不存在或不属于当前快照：' + id);
    const object = clone(row);
    if (type === 'check') { object.path = g.checklist.path; object.version = g.checklist.version; }
    if (type === 'mapping') object.path = g.project.root + '/mapping/checklist-evidence-matrix.json';
    if (type === 'family') { const set = byId(g.sourceSets, row.proposedSet || row.selectedSet); object.path = set.path; object.version = set.version; object.sourceSet = clone(set); }
    if (type === 'action') object.path = g.project.root + '/.openesg/model-actions/' + row.id + '.json';
    object.path = object.path || g.project.path;
    return object;
  }
  function contextPack(g, type, ids, view, selection = '') {
    need(Array.isArray(ids) && ids.length && ids.every(id => typeof id === 'string'), '请先选择操作对象。');
    const selected = ids.map(id => resolveObject(g, type, id));
    let checkIds = type === 'check' ? ids : type === 'unit' ? selected.flatMap(u => u.checkIds) : [];
    let factIds = type === 'fact' ? ids : type === 'unit' ? selected.flatMap(u => u.factIds) : [];
    let locatorIds = type === 'file' ? g.locators.filter(l => ids.includes(l.fileId)).map(l => l.id) : [];
    if (type === 'check') factIds = ids.flatMap(id => linksFor(g, id).facts.map(f => f.id));
    if (type === 'file') factIds = g.facts.filter(f => f.locatorIds.some(id => locatorIds.includes(id))).map(f => f.id);
    if (type === 'family') locatorIds = g.locators.filter(l => selected.some(f => f.id === byId(g.files, l.fileId)?.family)).map(l => l.id);
    if (type === 'unit') factIds = unique([...factIds, ...checkIds.flatMap(id => linksFor(g, id).facts.map(f => f.id))]);
    if (type === 'unit' || type === 'check') factIds = unique([...factIds, ...factIds.map(id => latestFact(g, byId(g.facts, id)?.factId)?.id).filter(Boolean)]);
    locatorIds = unique([...locatorIds, ...factIds.flatMap(id => byId(g.facts, id)?.locatorIds || [])]);
    const fileIds = unique([...locatorIds.map(id => byId(g.locators, id)?.fileId).filter(Boolean), ...(type === 'file' ? ids : [])]);
    const pack = { project_id: g.project.id, reporting_period: g.project.period, version_snapshot: { checklist: g.checklist.version, framework: g.framework.version, selection_hash: fingerprint(selected) }, view, selection_type: type, selected_object_ids: ids, selection, checklist_item_ids: unique(checkIds), fact_version_ids: unique(factIds), evidence_locator_ids: locatorIds, writing_point_ids: type === 'unit' ? ids : [], draft_unit_ids: type === 'unit' ? ids : [], readable_file_paths: unique([...selected.map(x => x.path), ...fileIds.map(id => byId(g.files, id).path)]), excluded_scope: '未选择的项目对象、客户真实文件、未声明目录及所有凭据', generated_at: now(), demonstration: true };
    pack.input_snapshot = { selected, checks: unique(checkIds).map(id => clone(byId(g.checks, id))), facts: unique(factIds).map(id => clone(byId(g.facts, id))), locators: locatorIds.map(id => clone(byId(g.locators, id))), files: fileIds.map(id => clone(byId(g.files, id))), sources: unique(fileIds.map(id => byId(g.files, id)?.family).filter(Boolean)).flatMap(id => g.sourceSets.filter(s => s.family === id).map(clone)) };
    if (type === 'unit' || type === 'check' || type === 'framework') pack.input_snapshot.versions = { checklist: g.checklist.version, framework: g.framework.version };
    pack.content_hash = fingerprint(pack); return pack;
  }
  function initializeModel(g, m, pack) {
    m.inputHash = fingerprint(m.target_object_ids.map(id => resolveObject(g, m.target_type, id)));
    m.contextHash = fingerprint(pack.input_snapshot);
    m.frozenOutput = modelOutput(g, m);
    m.frozenUnits = m.target_type === 'unit' ? m.target_object_ids.map(id => { const u = byId(g.units, id); return { id, body: m.selection ? u.body.replace(m.selection, m.frozenOutput) : unitDraft(g, u) }; }) : [];
  }
  function sceneGraph(id) {
    const g = D.makeScene(id);
    g.actions.filter(m => !m.inputHash).forEach(m => { m.operation = m.operation || m.action_type; const pack = contextPack(g, m.target_type, m.target_object_ids, 'files'); pack.id = m.context_pack_id; initializeModel(g, m, pack); g.contextPacks.push(pack); });
    return g;
  }
  function modelOutput(g, m) {
    if (m.selection) return m.selection + '（此处为受限选区的虚构修订建议，请审核后应用。）';
    if (m.target_type === 'unit' && ['draft', 'rewrite', 'merge'].includes(m.action_type)) return m.target_object_ids.map(id => unitDraft(g, byId(g.units, id))).join('\n\n---\n\n');
    if (m.action_type === 'extract' && m.operation === 'extractFacts' && m.target_object_ids.includes('FILE-ENV-2')) return '候选事实：温室气体排放总量 568.4 tCO₂e。\n来源：FILE-ENV-2 · 环境绩效!B2:D2。\n说明：剔除重复租赁区域；应用后为 candidate，仍需事实审核。';
    if (m.target_type === 'file' && m.operation === 'summarize') return m.target_object_ids.map(id => { const f = byId(g.files, id); return f.name + '\n' + (f.rows ? f.rows.map(row => row.join(' · ')).join('\n') : f.paragraphs.join('\n')); }).join('\n\n') + '\n仅为所选文件的虚构摘要，不批准来源或事实。';
    if (m.operation === 'merge') return '合并选中的披露要求，保留全部主条款身份与各自证据边界。\n' + m.target_object_ids.map(id => resolveObject(g, m.target_type, id).summary || id).join('\n');
    if (m.target_type === 'check') return '建议将披露要求细化为：报告边界、年度结果、计算方法及原始证据。\n保留主条款和补充指引，缺失项不得补成确定事实。\n' + m.target_object_ids.map(id => byId(g.checks, id).title).join('；');
    if (m.target_type === 'build') return m.target_object_ids.map(id => { const b = byId(g.builds, id); return 'v' + b.version + '：' + b.units.length + ' 个冻结单元，内容指纹 ' + b.hash; }).join('\n') + '\n只读差异说明，不修改归档版本。';
    if (m.target_type === 'framework') return '框架草案：' + g.framework.title + '\n保留稳定要点身份及现有章节顺序。逐项核对未分配检查项，按治理安排、年度行动、量化结果、证据依据组织正文。\n此为结构建议，需人工配置与发布审核。';
    return '所选对象分析（虚构演示）\n' + m.target_object_ids.map(id => { const o = resolveObject(g, m.target_type, id); return (o.title || o.name || o.id) + '\n' + (o.summary || o.body || (o.rows ? o.rows.map(row => row.join(' · ')).join('\n') : (o.paragraphs || []).join('\n'))); }).join('\n\n') + '\n请核对上述版本、单位、期间及证据边界；本分析不替代来源、事实或正文审核。';
  }
  const api = { D, KEY, byId, unique, count, fileStats, unitStats, need, effective, latestFact, linksFor, coverage, preflight, stats, reduce, resolveObject, contextPack, unitDraft, citations, fingerprint, makeScene: sceneGraph };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ESG = api;
  if (typeof document === 'undefined') return;
  let envelope, working, snapshotGraph = null, error = '', stale = false;
  const newEnvelope = scene => ({ schemaVersion: D.schemaVersion, baselineVersion: D.version, projectId: 'PRJ-DEMO-001', sceneId: scene, runId: (root.crypto?.randomUUID?.() || String(Date.now())).slice(0, 12), revision: 0, overrides: {}, filters: {}, snapshots: {} });
  const hydrate = env => ({ ...sceneGraph(env.sceneId), ...clone(env.overrides) });
  function readEnvelope() {
    const text = localStorage.getItem(KEY); if (!text) return newEnvelope('source-review');
    const env = JSON.parse(text);
    need(env.schemaVersion === D.schemaVersion && env.baselineVersion === D.version && D.scenes.some(s => s.id === env.sceneId), '演示存储版本不兼容。请重置本原型数据。'); return env;
  }
  function writeEnvelope(next) {
    try { localStorage.setItem(KEY, JSON.stringify(next)); }
    catch { throw new Error('无法保存本地演示状态：存储不可用或空间不足。请导出快照后重置；本次操作未保存。'); }
    envelope = next;
  }
  function notify() { root.dispatchEvent(new CustomEvent('esg:change')); }
  function loadSnapshot() {
    snapshotGraph = null; const p = new URLSearchParams(location.hash.slice(1));
    if (p.has('project')) need(p.get('project') === 'PRJ-DEMO-001', '链接项目不存在。');
    if (p.get('mode') !== 'snapshot') {
      if (p.has('object')) resolveObject(working, p.get('objectType'), p.get('object'));
      if (p.has('mapping')) need(byId(working.mappings, p.get('mapping')), '当前版本不存在指定映射。');
      if (p.has('locator')) { const l = byId(working.locators, p.get('locator')); need(l && byId(working.files, l.fileId)?.version === l.fileVersion, '证据定位或文件版本不匹配。'); }
      return;
    }
    const id = p.get('snapshot'); need(id, '深链接缺少版本快照。');
    if (id.startsWith('BASE-') && D.scenes.some(s => 'BASE-' + s.id === id)) snapshotGraph = sceneGraph(id.slice(5));
    else { const snap = envelope.snapshots[id]; need(snap, '版本快照不存在或已被重置。请导入配套演示快照，不会自动显示最新版。'); snapshotGraph = clone(snap.graph); }
    need(!p.has('scene') || p.get('scene') === snapshotGraph.scene, '场景与快照不匹配。');
    if (p.has('object')) resolveObject(snapshotGraph, p.get('objectType'), p.get('object'));
    if (p.has('mapping')) need(byId(snapshotGraph.mappings, p.get('mapping')), '快照内不存在指定映射。');
    if (p.has('locator')) { const l = byId(snapshotGraph.locators, p.get('locator')); need(l && byId(snapshotGraph.files, l.fileId)?.version === l.fileVersion, '证据定位或文件版本不匹配。'); }
  }
  try {
    need(location.protocol !== 'file:', '请通过本地静态服务打开：http://127.0.0.1:4173/。双击 HTML 不支持跨页演示状态。');
    envelope = readEnvelope(); working = hydrate(envelope); writeEnvelope(envelope); loadSnapshot();
  } catch (e) { error = e.message; envelope ||= newEnvelope('source-review'); working ||= sceneGraph(envelope.sceneId); }
  Object.assign(api, {
    state: () => snapshotGraph || working, working: () => working, meta: () => ({ ...envelope, overrides: undefined, snapshots: undefined, readonly: !!snapshotGraph, error, stale }),
    dispatch(action) {
      need(!error, error); need(!snapshotGraph, '这是固定快照，只能查看。请先返回当前工作版本。'); need(!stale, '另一页面已更新状态，请重新加载后再操作。');
      const disk = readEnvelope(); need(disk.runId === envelope.runId && disk.revision === envelope.revision, '编辑基线已过期，请刷新后操作。');
      const nextGraph = reduce(working, action, { runId: envelope.runId });
      if (nextGraph === working) return working;
      const base = D.makeScene(envelope.sceneId); const overrides = {};
      Object.keys(base).forEach(key => { if (JSON.stringify(nextGraph[key]) !== JSON.stringify(base[key])) overrides[key] = clone(nextGraph[key]); });
      Object.keys(nextGraph).filter(key => !(key in base)).forEach(key => { overrides[key] = clone(nextGraph[key]); });
      writeEnvelope({ ...envelope, overrides, revision: envelope.revision + 1 }); working = nextGraph; notify(); return working;
    },
    reset(scene = envelope.sceneId) {
      need(D.scenes.some(s => s.id === scene), '演示场景不存在。'); const env = newEnvelope(scene); writeEnvelope(env); working = hydrate(env); error = ''; stale = false; snapshotGraph = null; history.replaceState(null, '', location.pathname); notify();
    },
    filters() {
      const p = new URLSearchParams(location.hash.slice(1)); const saved = snapshotGraph ? (snapshotGraph.filters || {}) : envelope.filters;
      return { ...saved, ...Object.fromEntries(['q', 'period', 'batch', 'department', 'family', 'fileType', 'sourceStatus', 'parseStatus', 'coverage'].filter(k => p.has(k)).map(k => [k, p.get(k)])) };
    },
    setFilters(filters) {
      if (!snapshotGraph) writeEnvelope({ ...envelope, filters });
      const p = new URLSearchParams(location.hash.slice(1)); ['q', 'period', 'batch', 'department', 'family', 'fileType', 'sourceStatus', 'parseStatus', 'coverage'].forEach(k => { if (filters[k]) p.set(k, filters[k]); else p.delete(k); });
      history.replaceState(null, '', '#' + p); notify();
    },
    select(type, id, extra = {}) {
      resolveObject(api.state(), type, id); const p = new URLSearchParams(location.hash.slice(1)); p.set('project', 'PRJ-DEMO-001'); p.set('objectType', type); p.set('object', id);
      p.delete('mapping'); p.delete('locator'); Object.entries(extra).forEach(([k, v]) => { if (v) p.set(k, v); }); history.pushState(null, '', '#' + p); notify();
    },
    url(page, type, id, extra = {}) {
      const file = D.pages.find(p => p.key === page)?.file || 'index.html'; const params = new URLSearchParams(api.filters());
      Object.entries({ project: 'PRJ-DEMO-001', objectType: type, object: id, ...extra }).forEach(([k, v]) => { if (v) params.set(k, v); });
      if (snapshotGraph) { const current = new URLSearchParams(location.hash.slice(1)); ['snapshot', 'scene', 'mode'].forEach(k => params.set(k, current.get(k))); }
      return file + '#' + params;
    },
    createSnapshot() {
      need(!error, error); const graph = clone(api.state()); graph.filters = api.filters();
      const id = 'SNAP-' + envelope.runId + '-' + envelope.revision + '-' + fingerprint(graph).slice(-8);
      const snap = { id, schemaVersion: D.schemaVersion, baselineVersion: D.version, projectId: graph.project.id, sceneId: graph.scene, graph, hash: fingerprint(graph), demonstration: true };
      writeEnvelope({ ...envelope, snapshots: { ...envelope.snapshots, [id]: snap } }); return snap;
    },
    snapshotLink(type, id, extra = {}) {
      const snap = api.createSnapshot(); const p = new URLSearchParams(api.filters());
      Object.entries({ project: snap.projectId, scene: snap.sceneId, snapshot: snap.id, mode: 'snapshot', objectType: type, object: id, ...extra }).forEach(([k, v]) => { if (v) p.set(k, v); });
      return { link: location.origin + location.pathname + '#' + p, snapshot: snap };
    },
    importSnapshot(text) {
      need(text.length < 2500000, '快照过大；仅接受本原型的虚构演示快照。'); const snap = JSON.parse(text);
      need(snap.demonstration === true && snap.schemaVersion === D.schemaVersion && snap.baselineVersion === D.version, '快照格式或基线版本不兼容。');
      need(snap.projectId === 'PRJ-DEMO-001' && snap.graph?.project?.id === snap.projectId && snap.hash === fingerprint(snap.graph), '快照项目或内容指纹无效。');
      need(D.scenes.some(s => s.id === snap.sceneId) && /^[A-Z0-9a-z_-]+$/.test(snap.id), '快照场景或标识无效。');
      for (const key of ['checks', 'files', 'families', 'facts', 'sourceSets', 'locators', 'mappings', 'units', 'builds', 'actions']) need(Array.isArray(snap.graph[key]) && unique(snap.graph[key].map(x => x.id)).length === snap.graph[key].length, '快照对象表损坏：' + key);
      need(snap.graph.facts.every(f => byId(snap.graph.sourceSets, f.sourceSet) && f.locatorIds.every(id => byId(snap.graph.locators, id))), '快照事实引用不完整。');
      need(snap.graph.locators.every(l => byId(snap.graph.files, l.fileId)?.version === l.fileVersion), '快照证据定位与版本不匹配。');
      need(snap.graph.mappings.every(m => byId(snap.graph.checks, m.checkId) && m.factIds.every(id => byId(snap.graph.facts, id))), '快照映射引用不完整。');
      writeEnvelope({ ...envelope, snapshots: { ...envelope.snapshots, [snap.id]: snap } });
      history.replaceState(null, '', '#project=PRJ-DEMO-001&scene=' + encodeURIComponent(snap.sceneId) + '&snapshot=' + encodeURIComponent(snap.id) + '&mode=snapshot'); loadSnapshot(); notify(); return snap.id;
    },
    currentVersion() { history.replaceState(null, '', location.pathname); snapshotGraph = null; error = ''; try { envelope = readEnvelope(); working = hydrate(envelope); stale = false; } catch (e) { error = e.message; } notify(); },
  });
  root.addEventListener('hashchange', () => { error = ''; try { loadSnapshot(); } catch (e) { error = e.message; } notify(); });
  root.addEventListener('storage', event => {
    if (event.key !== KEY || snapshotGraph) return;
    try { const disk = readEnvelope(); if (disk.revision === envelope.revision && disk.runId === envelope.runId) { envelope.snapshots = disk.snapshots; return; } if (document.querySelector('[data-dirty="true"]')) { stale = true; notify(); } else { envelope = disk; working = hydrate(envelope); notify(); } } catch (e) { error = e.message; notify(); }
  });
  root.addEventListener('focus', () => {
    if (snapshotGraph || error) return; try { const disk = readEnvelope(); if (disk.revision !== envelope.revision || disk.runId !== envelope.runId) { if (document.querySelector('[data-dirty="true"]')) stale = true; else { envelope = disk; working = hydrate(envelope); } notify(); } } catch (e) { error = e.message; notify(); }
  });
  setInterval(() => {
    if (snapshotGraph || error || stale) return;
    const task = working.actions.find(m => ['pending', 'running'].includes(m.status) && Date.now() - m.startedAt > (m.status === 'pending' ? 650 : 1600));
    if (task) { try { api.dispatch({ type: 'advanceModel', id: task.id }); } catch { /* UI presents persisted state; a stale tab must not overwrite. */ } }
  }, 450);
})(typeof window !== 'undefined' ? window : globalThis);
