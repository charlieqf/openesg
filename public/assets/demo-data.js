/* All company names, evidence, values and commentary in this prototype are fictional. */
(function (root) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const fingerprint = value => {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return 'demo-fnv1a-' + (hash >>> 0).toString(16).padStart(8, '0');
  };
  const pages = [
    ['01-project-overview.html', '项目总览', '项目总览与任务台', 'overview', '项目'],
    ['02-disclosure-checklist.html', '披露规范', '披露规范工作台', 'checklist', 'S1'],
    ['03-intake-files.html', '收资文件', '收资文件工作台', 'files', 'S2'],
    ['04-authoritative-sources.html', '权威来源', '文件版本与权威来源审核', 'sources', 'S2'],
    ['05-fact-review.html', '事实审核', '事实审核与变更比较', 'facts', 'S2'],
    ['06-evidence-mapping.html', '证据映射', '披露覆盖与证据映射', 'mapping', 'S3'],
    ['07-writing-framework.html', '撰写框架', '撰写框架与模板配置', 'framework', 'S4'],
    ['08-writing-workbench.html', '逐要点撰写', '逐要点撰写工作台', 'writing', 'S5'],
    ['09-report-composer.html', '报告合成', '全文合成与发布前检查', 'composer', 'S6'],
    ['10-report-delivery.html', '版本与交付', '报告版本与交付中心', 'delivery', 'S6'],
  ].map((p, i) => ({ file: p[0], label: p[1], title: p[2], key: p[3], stage: p[4], id: 'P' + String(i + 1).padStart(2, '0') }));
  const scenes = [
    { id: 'source-review', name: '新批次 · 来源待审', description: '从新收资文件开始，完成来源、事实、映射、正文和报告的完整链路。' },
    { id: 'normal', name: '全部就绪 · 正常构建', description: '已审核的基线，用于验证八项预检和确定性合成。' },
    { id: 'missing', name: '证据缺失', description: '能源披露缺少有效证据；需补映射及正文后才能构建。' },
    { id: 'conflict', name: '来源与事实冲突', description: '新版排放数据存在口径差异，不能仅按文件日期采用。' },
    { id: 'upstream-change', name: '事实更新 · 下游待复核', description: '新事实已生效，两个引用单元和相关映射需要复核。' },
    { id: 'model-failed', name: '模型服务不可用', description: '模拟任务失败，浏览、人工修改与历史报告仍可用。' },
    { id: 'external-change', name: '外部文件修改', description: '正文指纹与审核快照不同，先比较再同步，不静默覆盖。' },
    ...['强制项覆盖', '缺口处置', '实体文件', '单元审核', '有效事实', '审核指纹', '框架版本', '图表与链接'].map((name, i) => ({ id: 'preflight-' + (i + 1), name: '预检 ' + (i + 1) + ' · ' + name, description: '独立构造本项失败，验证阻断与对象回链。' })),
  ];
  const labels = {
    effective: '已生效', candidate: '候选', review: '待审核', rejected: '已拒绝', superseded: '历史版本',
    covered: '已覆盖', partial: '部分覆盖', missing: '缺失', not_applicable: '不适用', conflict: '有冲突', needs_review: '待复核',
    authoritative: '权威来源', supporting: '补充说明', parsed: '已解析', registered: '待解析', error: '解析失败', family_assigned: '待来源审核',
    not_started: '未开始', drafting: '撰写中', ready: '审核通过', locked: '已锁定', published: '已发布', draft: '草案',
    pending: '待执行', running: '运行中', applied: '已应用', failed: '执行失败', approved: '已批准',
    preflight_failed: '预检未通过', preflight: '预检中', building: '构建中', removed: '已移除',
  };
  function baseGraph() {
    const graph = {
      project: { id: 'PRJ-DEMO-001', name: '远澜国际控股', period: '2025', market: '香港', framework: 'HKEX · 演示框架', industry: '证券与金融服务', language: '简体中文', root: 'projects/PRJ-DEMO-001', owner: '林悦（虚构）', version: 1, path: 'projects/PRJ-DEMO-001/project.json' },
      checklist: { id: 'CL-HKEX-DEMO', version: 1, status: 'published', reviewedBy: '周宁（虚构）', reviewedAt: '2026-09-01 10:30', path: 'projects/PRJ-DEMO-001/checklists/disclosure-checklist-v1.json', history: [] },
      framework: { id: 'FW-HKEX-DEMO', version: 1, status: 'published', title: '金融服务业 ESG 撰写框架', path: 'projects/PRJ-DEMO-001/framework/writing-framework-v1.json', history: [] },
      families: [
        { id: 'FAM-ENV', title: '环境绩效与温室气体', department: '行政与运营', type: '定量数据', selectedSet: 'AS-ENV-1', proposedSet: 'AS-ENV-2' },
        { id: 'FAM-HR', title: '员工与人才发展', department: '人力资源', type: '人事数据', selectedSet: 'AS-HR-1' },
        { id: 'FAM-GOV', title: '治理与商业道德', department: '董事会办公室', type: '制度与记录', selectedSet: 'AS-GOV-1' },
        { id: 'FAM-CLI', title: '气候风险与韧性', department: '风险管理', type: '定性说明', selectedSet: 'AS-CLI-1' },
      ],
      sourceSets: [
        { id: 'AS-ENV-1', family: 'FAM-ENV', version: 1, files: ['FILE-ENV-1'], status: 'effective', approvedBy: '周宁（虚构）', reason: '已核对原始计量记录与报告边界。', path: 'projects/PRJ-DEMO-001/facts/authoritative-source-set-env-v1.json' },
        { id: 'AS-ENV-2', family: 'FAM-ENV', version: 2, files: ['FILE-ENV-2', 'FILE-ENV-NOTE'], status: 'review', reason: '', approvedBy: '', path: 'projects/PRJ-DEMO-001/facts/authoritative-source-set-env-v2.json' },
        ...['HR', 'GOV', 'CLI'].map(x => ({ id: 'AS-' + x + '-1', family: 'FAM-' + x, version: 1, files: ['FILE-' + x + '-1'], status: 'effective', approvedBy: '周宁（虚构）', reason: '原始资料及边界已经人工核对。', path: 'projects/PRJ-DEMO-001/facts/authoritative-source-set-' + x.toLowerCase() + '-v1.json' })),
      ],
      files: [
        { id: 'FILE-ENV-1', family: 'FAM-ENV', name: '2025年度环境关键绩效指标汇总表_行政运营部_V1.xlsx', type: 'Excel', version: 1, status: 'authoritative', department: '行政与运营', batch: 'BATCH-01', date: '2026-08-28', size: '42 KB', signal: 'V1 · 已审核', asset: 'environment-v1.csv', section: '环境绩效', columns: ['项目', '2025 年度', '单位', '口径'], rows: [['温室气体排放总量', '590.9', 'tCO₂e', '范围一 + 范围二'], ['综合能源消耗', '835,000', 'kWh', '合并范围'], ['总耗水量', '2,480', 'm³', '办公场所']] },
        { id: 'FILE-ENV-2', family: 'FAM-ENV', name: '2025年度环境关键绩效指标汇总表_行政运营部_V2_复核修订.xlsx', type: 'Excel', version: 2, status: 'family_assigned', department: '行政与运营', batch: 'BATCH-02', date: '2026-09-04', size: '46 KB', signal: 'V2 · 修订 · 待确认', asset: 'environment-v2.csv', section: '环境绩效', columns: ['项目', '2025 年度', '单位', '口径'], rows: [['温室气体排放总量', '568.4', 'tCO₂e', '剔除重复租赁区域'], ['综合能源消耗', '835,000', 'kWh', '合并范围'], ['总耗水量', '2,480', 'm³', '办公场所']] },
        { id: 'FILE-ENV-NOTE', family: 'FAM-ENV', name: '环境数据修订说明_租赁区域重复计算调整及审核回复_202509.docx', type: 'Word', version: 1, status: 'supporting', department: '行政与运营', batch: 'BATCH-02', date: '2026-09-04', size: '18 KB', signal: '补充说明', asset: 'environment-note.md', section: '修订说明 / 第 3 段', paragraphs: ['本文件为虚构演示说明，不代表任何客户情况。', '复核发现租赁办公区域的电力对应排放被重复计入。修订版剔除了该部分重复项，合并边界及计算方法未发生变化。', '排放总量由 590.9 tCO₂e 调整为 568.4 tCO₂e，差异为 −22.5 tCO₂e。能源与水资源原始计量值不变。'] },
        { id: 'FILE-HR-1', family: 'FAM-HR', name: '2025年度人力资源及员工培训收资反馈_合并口径_确认版.xlsx', type: 'Excel', version: 1, status: 'authoritative', department: '人力资源', batch: 'BATCH-01', date: '2026-08-27', size: '38 KB', signal: '确认版', asset: 'human-resources.csv', section: '员工与培训', columns: ['指标', '年度结果', '单位'], rows: [['员工总数', '286', '人'], ['员工培训总时数', '4,860', '小时'], ['女性员工占比', '48.6', '%']] },
        { id: 'FILE-GOV-1', family: 'FAM-GOV', name: '2025年度董事会ESG监督及商业道德工作记录_节选.pdf', type: 'PDF', version: 1, status: 'authoritative', department: '董事会办公室', batch: 'BATCH-01', date: '2026-08-25', size: '126 KB', signal: '已签批', asset: 'governance.md', section: '第 7 页 / 治理记录', paragraphs: ['董事会在报告期内审议 ESG 工作进展，并监督相关风险、目标及资源安排。', '2025 年度开展了 4 次 ESG 监督议程，并完成员工商业道德培训。', '报告期内，经确认的贪污诉讼案件为 0 宗。上述数字与内容均为虚构。'] },
        { id: 'FILE-CLI-1', family: 'FAM-CLI', name: '气候风险识别及情景分析工作说明_2025报告期_风险管理部.docx', type: 'Word', version: 1, status: 'authoritative', department: '风险管理', batch: 'BATCH-01', date: '2026-08-26', size: '64 KB', signal: '审核版', asset: 'climate.md', section: '气候风险 / 第 4 段', paragraphs: ['集团在虚构的气候风险评估中识别了物理风险与转型风险，并将其纳入年度风险检讨。', '选取低排放转型和高物理风险两个示意情景，评估对办公运营及金融业务的潜在影响。', '本示例只演示可追溯写作，不构成气候风险分析结论。'] },
        { id: 'FILE-SCAN', family: null, name: '办公设备维修与废弃物转运记录_扫描附件_待补清晰版本.pdf', type: '扫描件', version: 1, status: 'error', department: '行政与运营', batch: 'BATCH-02', date: '2026-09-04', size: '328 KB', signal: '无法识别部分表格', asset: 'scan-error.md', section: '第 2 页', paragraphs: ['演示解析失败：扫描表格过于模糊，请提供清晰版本。'] },
        { id: 'FILE-UNASSIGNED', family: null, name: '补充收资_环境数据核对邮件纪要_待归组.md', type: 'Markdown', version: 1, status: 'parsed', department: '行政与运营', batch: 'BATCH-02', date: '2026-09-05', size: '4 KB', signal: '未归组', asset: 'unassigned.md', section: '第 1 段', paragraphs: ['待归组的虚构补充说明，不能自动当作已确认事实。'] },
      ],
      regulations: [
        { id: 'REG-DEMO-01', title: 'HKEX 披露检查项 · 演示阅读副本', role: '主规则', version: '演示 v1', status: 'ready', date: '2026-08-01', effectiveDate: '2025-01-01（示意）', path: 'projects/PRJ-DEMO-001/regulations/disclosure-demo.md', text: '本文件不复制或核验监管原文。为演示界面，虚构条款要求披露组织的治理安排、环境及社会绩效，并保留计算口径与来源。正式使用前应替换为核实过的官方文件与页码。' },
        { id: 'REG-DEMO-FAQ', title: '编制口径补充说明 · 虚构 FAQ', role: '补充指引', version: '演示 v1', status: 'ready', date: '2026-08-02', effectiveDate: '示意', path: 'projects/PRJ-DEMO-001/regulations/faq-demo.md', text: '演示 FAQ：指标边界和单位应与报告期一致；数据修订需保留前后版本、原因和审核意见。此段不是官方 FAQ。' },
      ],
      checks: [], facts: [], locators: [], mappings: [], units: [], references: [], builds: [], actions: [], contextPacks: [], audit: [], tasks: [], filters: {}, reportState: 'pending', lastPreflight: null,
    };
    const entries = [
      ['GOV-001', '管治', '董事会的 ESG 监督', 'FILE-GOV-1', 'FAM-GOV', '4', '次', 'ESG 监督议程', '第 7 页 · 治理记录', '董事会监督、管理职责、检讨过程'],
      ['ENV-001', '环境', '温室气体排放与计算口径', 'FILE-ENV-1', 'FAM-ENV', '590.9', 'tCO₂e', '温室气体排放总量', '环境绩效!B2:D2', '排放总量、范围、方法和计算边界'],
      ['ENV-002', '环境', '能源使用及效益管理', 'FILE-ENV-1', 'FAM-ENV', '835000', 'kWh', '综合能源消耗', '环境绩效!B3:D3', '能源总耗量、类型和管理措施'],
      ['ENV-003', '环境', '水资源使用', 'FILE-ENV-1', 'FAM-ENV', '2480', 'm³', '总耗水量', '环境绩效!B4:D4', '总耗水量、边界和管理措施'],
      ['SOC-001', '社会', '员工构成与平等机会', 'FILE-HR-1', 'FAM-HR', '286', '人', '员工总数', '员工与培训!B2:C2', '员工总数、分类和统计边界'],
      ['SOC-002', '社会', '人才发展与培训', 'FILE-HR-1', 'FAM-HR', '4860', '小时', '员工培训总时数', '员工与培训!B3:C3', '培训覆盖、时数及发展安排'],
      ['GOV-002', '管治', '商业道德与反贪污', 'FILE-GOV-1', 'FAM-GOV', '0', '宗', '经确认的贪污诉讼案件', '第 7 页 · 第 3 段', '政策、培训、案件和处置'],
      ['CLI-001', '气候', '气候风险与韧性', 'FILE-CLI-1', 'FAM-CLI', '2', '个', '气候分析情景', '气候风险 / 第 4 段', '风险识别、情景、影响及响应'],
    ];
    entries.forEach((e, i) => {
      const [key, topic, title, file, family, value, unit, factTitle, position, elements] = e;
      const factId = 'FV-' + key + '-v1';
      const locId = 'LOC-' + key + '-v1';
      const fileRecord = graph.files.find(f => f.id === file);
      graph.checks.push({ id: 'CHK-' + key, key, topic, title, summary: '披露' + elements + '，并保留可回看的原始依据。', requirementType: key === 'CLI-001' ? 'conditional' : 'mandatory', applicability: key === 'CLI-001' ? '本虚构金融服务项目纳入气候风险评估范围。' : '适用于本项目 2025 年报告期。', elements: elements.split('、'), evidenceTypes: ['数据', '政策', '说明'], primaryClauses: ['DEMO-' + (i + 1)], relatedClauses: ['DEMO-FAQ-1'], sourceId: 'REG-DEMO-01', sourcePage: i + 3, sourceText: '虚构条款 ' + (i + 1) + '：应说明' + elements + '。本段仅用于交互演示。', version: 1, status: 'published', reviewedBy: '周宁（虚构）', unitIds: [key] });
      graph.locators.push({ id: locId, fileId: file, fileVersion: 1, position, page: fileRecord.type === 'PDF' ? 7 : null, sheet: fileRecord.type === 'Excel' ? fileRecord.section : null, range: fileRecord.type === 'Excel' ? position.split('!')[1] : null, paragraph: fileRecord.type === 'Word' ? 4 : null, quote: factTitle + '：' + Number(value).toLocaleString('en-US') + ' ' + unit + '（虚构演示）', granularity: fileRecord.type === 'Excel' ? '单元格范围' : fileRecord.type === 'PDF' ? '页 / 段落' : '段落', row: key === 'ENV-002' || key === 'SOC-002' ? 1 : key === 'ENV-003' ? 2 : 0 });
      graph.facts.push({ id: factId, factId: 'FACT-' + key, key, title: factTitle, value: Number(value), displayValue: Number(value).toLocaleString('en-US'), unit, period: '2025', valueType: 'number', batch: 'BATCH-01', family, sourceSet: 'AS-' + family.replace('FAM-', '') + '-1', locatorIds: [locId], confidence: 0.96, diffType: 'unchanged', status: 'effective', version: 1, reviewedBy: '周宁（虚构）', reviewedAt: '2026-09-01 10:30', summary: factTitle + '为 ' + Number(value).toLocaleString('en-US') + ' ' + unit, path: 'projects/PRJ-DEMO-001/facts/fact-pack-v1.md' });
      graph.mappings.push({ id: 'MAP-' + key, checkId: 'CHK-' + key, factIds: [factId], locatorIds: [locId], status: 'covered', reason: '已人工核对披露要素、报告边界和原始位置。', confirmedBy: '周宁（虚构）', version: 1, confidence: 0.95, disposition: 'approved', history: [] });
      const body = '## ' + title + '\n\n2025 年度，远澜国际控股持续完善' + title + '相关工作。' + factTitle + '为 ' + Number(value).toLocaleString('en-US') + ' ' + unit + '。［' + factId + '］\n\n相关数据采用一致的报告边界，资料由责任部门提供并经过人工复核。集团将持续跟进管理措施与实施效果。\n\n> 本单元全部内容及数值为虚构演示。';
      graph.units.push({ id: key, title, chapter: topic, order: i + 1, type: i % 3 === 0 ? '叙述' : '叙述 + 数据', checkIds: ['CHK-' + key], factIds: [factId], locatorIds: [locId], referenceId: 'REF-FIN-1', status: 'locked', version: 1, frameworkVersion: 1, path: 'projects/PRJ-DEMO-001/drafts/' + key + '.md', fileExists: true, body, contentHash: fingerprint(body), approvedHash: fingerprint(body), updatedBy: '林悦（虚构）', updatedAt: '2026-09-02 16:20', reviewRequired: false, issues: [], charts: [], attachments: [], internalLinks: [], history: [], comments: [{ author: '周宁（虚构）', text: '已核对口径和证据，同意进入合成。', date: '2026-09-02' }] });
    });
    const climate = graph.units.find(u => u.id === 'CLI-001');
    climate.factIds.push('FV-ENV-001-v1');
    climate.locatorIds.push('LOC-ENV-001-v1');
    climate.body += '\n\n运营排放基线为 590.9 tCO₂e，用于本示意情景的边界说明。［FV-ENV-001-v1］';
    climate.contentHash = climate.approvedHash = fingerprint(climate.body);
    graph.units.find(u => u.id === 'ENV-001').charts = [{ id: 'CHART-ENV', title: '环境绩效表', valid: true }];
    graph.units.find(u => u.id === 'GOV-001').internalLinks = [{ id: 'LINK-GOV', target: 'GOV-002', valid: true }];
    graph.units.find(u => u.id === 'SOC-001').attachments = [{ id: 'ATT-HR', fileId: 'FILE-HR-1', valid: true }];
    graph.files.forEach(f => { f.path = graph.project.root + '/intake/' + f.batch + '/' + f.name; f.hash = fingerprint(f.rows || f.paragraphs); });
    graph.references = [{ id: 'REF-FIN-1', title: '金融服务业 · 治理与绩效写法', industry: '证券与金融服务', version: 1, path: graph.project.root + '/references/financial-writing-demo.md', text: '先交代治理安排与责任主体，再描述年度行动，最后使用已核实的指标说明结果。避免在没有依据时宣称“行业领先”。', warning: '参考写法，不是本项目事实。全部示例为虚构。' }, { id: 'REF-CLI-1', title: '气候章节 · 从风险到响应', industry: '跨行业参考', version: 1, path: graph.project.root + '/references/climate-writing-demo.md', text: '以风险类别、时间尺度、潜在影响和响应措施组织叙述；披露假设与局限。', warning: '仅供结构参考，不作为证据。' }];
    graph.audit.push({ id: 'AUD-BASE', node: 'G5', title: '基线撰写单元审核并锁定', objectId: 'FW-HKEX-DEMO', actor: '周宁（虚构）', time: '2026-09-02 16:20', reason: '虚构历史记录', inputHash: fingerprint(graph.units.map(u => u.contentHash)), status: 'approved', runId: 'RUN-BASE', attempt: 1 });
    graph.builds.push(makeBuild(graph, 'BUILD-001', 1, '2026-09-03 09:40'));
    graph.builds[0].status = 'approved';
    graph.builds[0].approvedBy = '周宁（虚构）';
    return graph;
  }
  function makeBuild(graph, id, version, date) {
    const units = clone([...graph.units].sort((a, b) => a.order - b.order));
    const ids = [...new Set(units.flatMap(u => u.factIds))];
    const facts = clone(graph.facts.filter(f => ids.includes(f.id)));
    const body = '# ' + graph.project.name + ' ' + graph.project.period + ' 年度 ESG 报告\n\n> 全部内容为虚构演示，不代表客户实际情况。\n\n' + units.map(u => u.body).join('\n\n---\n\n');
    const manifest = { projectId: graph.project.id, period: graph.project.period, checklistVersion: graph.checklist.version, frameworkVersion: graph.framework.version, units: units.map(u => ({ id: u.id, version: u.version, path: u.path, hash: u.contentHash, factIds: u.factIds, checkIds: u.checkIds, locatorIds: u.locatorIds })), factIds: ids, contentHash: fingerprint(body), demonstration: true };
    return { id, version, title: graph.project.period + ' 年度 ESG 报告', status: 'ready', date, createdBy: '林悦（虚构）', manifest, project: clone(graph.project), checklist: clone(graph.checklist), framework: clone(graph.framework), sourceSets: clone(graph.sourceSets), units, facts, locators: clone(graph.locators), files: clone(graph.files), checks: clone(graph.checks), mappings: clone(graph.mappings), body, hash: fingerprint(body), path: graph.project.root + '/reports/' + id + '/report-manifest.json', log: [{ node: 'B1', status: 'ready', message: '八项预检通过（虚构数据）' }, { node: 'B2', status: 'ready', message: '按 manifest 顺序合并；未调用模型改写正文。' }, { node: 'B3', status: 'ready', message: '保留单元内容及演示指纹。' }] };
  }
  function addCandidate(graph) {
    if (graph.facts.some(f => f.id === 'FV-ENV-001-v2')) return;
    graph.locators.push({ id: 'LOC-ENV-001-v2', fileId: 'FILE-ENV-2', fileVersion: 2, position: '环境绩效!B2:D2', sheet: '环境绩效', range: 'B2:D2', row: 0, quote: '温室气体排放总量：568.4 tCO₂e；剔除重复租赁区域。（虚构）', granularity: '单元格范围' });
    graph.facts.push({ ...clone(graph.facts.find(f => f.id === 'FV-ENV-001-v1')), id: 'FV-ENV-001-v2', version: 2, value: 568.4, displayValue: '568.4', batch: 'BATCH-02', sourceSet: 'AS-ENV-2', locatorIds: ['LOC-ENV-001-v2'], status: 'candidate', diffType: 'changed', reviewedBy: '', reviewedAt: '', summary: '剔除重复计算后排放总量为 568.4 tCO₂e', path: graph.project.root + '/facts/fact-pack-v2.md' });
  }
  function makeScene(id = 'source-review') {
    const graph = baseGraph();
    graph.scene = id;
    if (['source-review', 'conflict'].includes(id)) {
      graph.tasks.push({ id: 'TASK-SOURCE', title: '确认环境绩效修订版的权威来源', type: 'source', objectId: 'FAM-ENV', page: 'sources', status: 'pending', reason: '新批次包含修订主表与补充说明，需核对边界。' });
      if (id === 'conflict') { addCandidate(graph); graph.facts.find(f => f.id === 'FV-ENV-001-v2').diffType = 'conflict'; }
    }
    if (id === 'upstream-change') {
      addCandidate(graph);
      graph.sourceSets.find(s => s.id === 'AS-ENV-2').status = 'effective';
      graph.sourceSets.find(s => s.id === 'AS-ENV-2').approvedBy = '周宁（虚构）';
      graph.sourceSets.find(s => s.id === 'AS-ENV-1').status = 'superseded';
      graph.families[0].selectedSet = 'AS-ENV-2';
      graph.files.find(f => f.id === 'FILE-ENV-2').status = 'authoritative';
      graph.files.find(f => f.id === 'FILE-ENV-1').status = 'superseded';
      graph.facts.find(f => f.id === 'FV-ENV-001-v1').status = 'superseded';
      graph.facts.find(f => f.id === 'FV-ENV-001-v2').status = 'effective';
      graph.mappings.find(m => m.id === 'MAP-ENV-001').status = 'needs_review';
      graph.units.filter(u => u.factIds.includes('FV-ENV-001-v1')).forEach(u => { u.reviewRequired = true; u.issues = ['引用的排放事实已更新，需要复核']; });
    }
    if (id === 'missing' || id === 'preflight-1') { graph.mappings.find(m => m.id === 'MAP-ENV-002').status = 'missing'; graph.mappings.find(m => m.id === 'MAP-ENV-002').reason = '缺少经确认的能源计量证据。'; graph.mappings.find(m => m.id === 'MAP-ENV-002').disposition = 'pending'; }
    if (id === 'missing') { const u = graph.units.find(u => u.id === 'ENV-002'); u.status = 'not_started'; u.fileExists = false; u.body = ''; u.contentHash = fingerprint(''); }
    if (id === 'preflight-2') { const m = graph.mappings[0]; m.status = 'partial'; m.disposition = 'pending'; m.reason = '监督职责说明待补充。'; }
    if (id === 'preflight-3') graph.units[1].fileExists = false;
    if (id === 'preflight-4') graph.units[1].status = 'drafting';
    if (id === 'preflight-5') graph.facts[1].status = 'superseded';
    if (id === 'external-change' || id === 'preflight-6') {
      const u = graph.units[1]; u.externalBody = u.body + '\n\n外部修改示例：补充报告边界说明，等待同步与审核。'; u.externalBaseHash = u.contentHash; u.externalHash = fingerprint(u.externalBody);
    }
    if (id === 'preflight-7') graph.units[1].frameworkVersion = 0;
    if (id === 'preflight-8') graph.units[1].charts[0].valid = false;
    if (id === 'model-failed') graph.actions.push({ id: 'MA-DEMO-FAILED', action_type: 'compare', label: '比较环境数据版本', context_pack_id: 'CP-DEMO-FAILED', target_object_ids: ['FILE-ENV-1', 'FILE-ENV-2'], target_type: 'file', target_file_paths: graph.files.slice(0, 2).map(f => f.path), instruction: '比较选中版本，列出数值及口径差异。', output_mode: 'suggestion', status: 'failed', model_config_snapshot: { service: '本地模型（模拟）', model: 'demo-reviewer', temperature: 0 }, output_files: [], approved_by: null, approved_at: null, error: '模拟连接失败：模型服务不可用。浏览与人工编辑不受影响。', attempt: 1, startedAt: 0, inputHash: '', output: '', history: [{ status: 'failed', note: '模拟连接超时' }] });
    return graph;
  }
  // Named demo identities make responsibilities visible; no real permissions.
  function demoActor(action) {
    if (['approveSource'].includes(action)) return { name: '许岚（虚构）', role: '收资管理员 · 来源审核示意' };
    if (['acceptFact', 'rejectFact', 'requestEvidence', 'editMapping'].includes(action)) return { name: '陈澄（虚构）', role: '事实审核人' };
    if (['approveUnit', 'lockUnit', 'approveBuild', 'rejectBuild'].includes(action)) return { name: '周宁（虚构）', role: '报告审核人' };
    if (action === 'publishChecklist') return { name: '何宁（虚构）', role: '合规管理员' };
    return { name: '林悦（虚构）', role: 'ESG 撰写人' };
  }
  const api = { version: '2026.09.07.1', schemaVersion: 1, pages, scenes, labels, clone, fingerprint, makeScene, makeBuild, addCandidate, demoActor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ESGDemo = api;
})(typeof window !== 'undefined' ? window : globalThis);
