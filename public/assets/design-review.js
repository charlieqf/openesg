/* Presentation-only revision. Prompt edits stay in this page's memory.
 * No customer source text, model calls, permissions or prompt publication engine. */
(function () {
  'use strict';
  const E = window.ESG, U = window.ESGUI;
  const { escape: h, button: b, badge, link, panel, notice, heading } = U;
  const drafts = new Map(), pointDrafts = new Map();
  let runId = E.meta().runId;
  const partOf = c => c.topic === '管治' ? 'B' : c.topic === '气候' ? 'D' : 'C';
  const partNames = { B: 'B · 管治与汇报', C: 'C · 环境与社会', D: 'D · 气候相关披露' };
  const metadata = {
    'CHK-GOV-001': ['治理架构', '董事会监督'], 'CHK-GOV-002': ['治理架构', '商业道德'],
    'CHK-ENV-001': ['A1 · 排放物', '排放与边界'], 'CHK-ENV-002': ['A2 · 资源使用', '能源绩效'],
    'CHK-ENV-003': ['A2 · 资源使用', '水资源绩效'], 'CHK-SOC-001': ['B1 · 雇佣', '员工构成'],
    'CHK-SOC-002': ['B3 · 发展及培训', '培训与发展'], 'CHK-CLI-001': ['策略与韧性', '气候风险']
  };
  const groupOf = c => metadata[c.layoutSourceId || c.id]?.[0] || c.topic;
  const clauseNumber = c => c.primaryClauses?.join('、') || '待标注';
  const clauseTitle = c => clauseNumber(c) + ' · ' + c.title;
  const defaults = c => ({
    writing: '围绕“' + c.title + '”组织披露。\n必须覆盖：' + c.elements.join('；') + '。\n先说明责任与范围，再列年度行动和已确认结果。仅使用有效事实并插入证据引用；缺失信息标记“待补充”，不推断数值。',
    validation: '逐项检查“' + c.title + '”：' + c.elements.join('；') + '。\n核对每项要求对应的正文、有效事实及来源；检查报告期、单位和口径。\n按“要求／证据／缺项／修改建议”输出；证据不足标记待核实，不因语言完整而判为合规。'
  });
  const readOnly = () => E.meta().readonly;
  function draftFor(c) { return (!readOnly() && drafts.get(c.id)) || { ...defaults(c), saved: false, edited: false }; }
  function scaleItems(g) {
    const items = g.checks.map(c => ({ ...c, part: partOf(c) }));
    for (const [part, total] of Object.entries({ B: 7, C: 45, D: 82 })) {
      const seeds = items.filter(c => c.part === part);
      for (let i = seeds.length; i < total; i++) {
        const seed = seeds[i % seeds.length];
        items.push({ ...seed, id: 'LAYOUT-' + part + '-' + String(i + 1).padStart(3, '0'), title: seed.title + ' · 布局样例 ' + (i + 1), part, layoutOnly: true, layoutSourceId: seed.id });
      }
    }
    return items;
  }
  function itemsFor(g) { return U.pageState.ruleScale ? scaleItems(g) : g.checks; }
  function findCheck(g, id) { return itemsFor(g).find(c => c.id === id) || g.checks.find(c => c.id === id) || g.checks[0]; }
  function sourceLines(items, kind = 'main') {
    return ['# 虚构披露规则阅读副本', '本文件仅用于界面与定位演示，不是已核实的监管原文。', '版本：DEMO-RULE-v1', ''].concat(items.flatMap(c => [
      '## ' + clauseTitle(c) + ' [' + c.id + ']',
      kind === 'main' ? c.sourceText : '虚构 FAQ：对“' + c.title + '”补充范围、来源和口径说明。',
      '执行要素：' + c.elements.join('；'), '适用说明：' + c.applicability, ''
    ]));
  }
  function promptFields(c, prefix = '') {
    const d = draftFor(c);
    return '<div class="prompt-fields" data-prompt-owner="' + h(c.id) + '">' + ['writing', 'validation'].map(kind =>
      '<label class="form-field" for="' + prefix + kind + '-prompt"><span>' + (kind === 'writing' ? '撰写提示词' : '校验提示词') + '</span><textarea id="' + prefix + kind + '-prompt" rows="4" data-clause-prompt="' + kind + '" data-check-id="' + h(c.id) + '"' + (readOnly() ? ' readonly' : '') + '>' + h(d[kind]) + '</textarea></label>'
    ).join('') + '<div class="prompt-draft-status meta" role="status">' + (d.edited ? (d.saved ? '已批注 · 本页草案已保存' : '已修改 · 本页草案未保存') : '建议配置 · 清单 v1 示例') + '</div><div class="actions mt">' +
      b('保存本页草案', 'savePromptDesign', { id: c.id }, 'btn-primary btn-small', readOnly()) + b('版本与审核', 'promptVersions', { id: c.id }, 'btn-small') + '</div><p class="meta mt">编辑仅在本页保留；刷新恢复预置配置，不同步到其他页面或真实清单。</p></div>';
  }
  function requirementInfo(c, g, prefix = '') {
    const group = groupOf(c);
    return '<div class="rule-identity"><strong class="rule-clause-number">' + h(clauseNumber(c)) + '</strong><span class="meta"> · 演示条款</span><div class="mono meta">' + h(c.id) + '</div><div class="meta mt">' + h(partNames[c.part || partOf(c)] + ' / ' + group) + '</div><h2>' + h(c.title) + '</h2><span class="badge">' + (c.requirementType === 'mandatory' ? '强制披露 · 演示' : '条件适用 · 演示') + '</span></div>' +
      '<section class="rule-section"><h3>指引概览 <small>要求提炼</small></h3><p>' + h(c.summary) + '</p></section><details class="rule-section requirement-details"' + (prefix ? ' open' : '') + '><summary>本条要求 · ' + c.elements.length + ' 项 <span class="meta">展开核对</span></summary><ul class="requirement-list mt">' + c.elements.map(t => '<li>' + h(t) + '</li>').join('') + '</ul></details>' + promptFields(c, prefix) +
      '<details class="rule-section"><summary>适用条件与预期证据</summary><p class="small mt">' + h(c.applicability) + '</p><div class="chips">' + c.evidenceTypes.map(t => '<span class="badge">' + h(t) + '</span>').join('') + '</div></details>' +
      '<div class="meta mt">清单 v' + g.checklist.version + ' · ' + h(c.reviewedBy || '尚未审核') + '</div>';
  }
  function checklist(g) {
    const items = itemsFor(g), scope = U.pageState.ruleScope || 'ALL', query = String(U.pageState.ruleQuery || '').toLowerCase();
    const matches = c => (!query || [c.title, c.id, clauseNumber(c), c.summary].join(' ').toLowerCase().includes(query)) && (scope === 'ALL' || scope === (c.part || partOf(c)) || scope === ((c.part || partOf(c)) + '/' + groupOf(c)));
    const visible = items.filter(matches);
    const selectedId = U.pageState.ruleSelected || U.selection('check', g.checks[0].id);
    const c = visible.find(c => c.id === selectedId) || visible[0];
    if (c) U.pageState.ruleSelected = c.id;
    U.setCurrent(c && !c.layoutOnly ? 'check' : 'project', c && !c.layoutOnly ? c.id : g.project.id);
    const tree = ['B', 'C', 'D'].map(part => {
      const rows = items.filter(c => (c.part || partOf(c)) === part);
      const groups = [...new Set(rows.map(c => groupOf(c)))];
      return '<details class="rule-tree-part" open><summary>' + h(partNames[part]) + '<span>' + rows.length + '</span></summary>' +
        b('本部分全部条目', 'ruleScope', { scope: part }, 'rule-tree-link ' + (scope === part ? 'active' : '')) + groups.map(group => {
          const children = rows.filter(c => groupOf(c) === group);
          return '<details class="rule-tree-group"' + (!U.pageState.ruleScale ? ' open' : '') + '><summary>' + h(group) + '<span>' + children.length + '</span></summary>' +
            b('查看本层面', 'ruleScope', { scope: part + '/' + group }, 'rule-tree-link') + children.map(row => b(h(clauseTitle(row)), 'rulePick', { id: row.id }, 'rule-tree-leaf ' + (c?.id === row.id ? 'active' : ''))).join('') + '</details>';
        }).join('') + '</details>';
    }).join('');
    const tableRows = visible.map(row => {
      const counts = row.layoutOnly ? null : E.linksFor(g, row.id).counts;
      return '<tr class="' + (c?.id === row.id ? 'selected' : '') + '"><td>' + b('<span class="rule-clause-number">' + h(clauseNumber(row)) + '</span> · ' + h(row.title), 'rulePick', { id: row.id }, 'link-button rule-title') + '<div class="meta">' + h(row.id) + '</div><div class="meta">' + (row.requirementType === 'mandatory' ? '强制披露' : '条件适用') + ' · ' + h(row.topic) + '</div></td><td>' + (row.layoutOnly ? '<span class="badge">仅布局</span>' : badge(E.coverage(g, row.id))) + '<div class="meta mt">主条款 ' + row.primaryClauses.length + ' / 指引 ' + row.relatedClauses.length + '</div></td><td>' + (counts ? link('mapping', 'check', row.id, counts.files + ' 文件<br>' + counts.facts + ' 事实 · ' + counts.units + ' 要点', {}, 'small') : '<span class="meta">未接入项目</span>') + '</td><td><span class="mono">v' + g.checklist.version + '</span><div class="meta">' + h(E.D.labels[row.status]) + '</div><span class="prompt-row-status" data-prompt-row="' + h(row.id) + '">' + (draftFor(row).edited ? '已批注' : '建议配置') + '</span></td></tr>';
    }).join('');
    const list = U.pageState.ruleView === 'cards' ? '<div class="rule-cards">' + visible.map(row => '<article>' + '<span class="meta">' + h(row.id) + '</span><h3>' + b(h(clauseTitle(row)), 'rulePick', { id: row.id }, 'link-button') + '</h3><p class="small">' + h(row.summary) + '</p></article>').join('') + '</div>' : '<div class="rule-table-scroll"><table class="rule-table"><thead><tr><th>条款号 / 披露条目</th><th>覆盖 / 来源</th><th>关联对象</th><th>版本 / 提示词</th></tr></thead><tbody>' + tableRows + '</tbody></table></div>';
    return heading('S1 / DISCLOSURE & PROMPTS', '披露规范与条目提示词', '以监管依据明确要求，为每个披露条目配置写法和检验标准。', b('清单发布与审核', 'publishChecklist', {}, '', readOnly() || g.checklist.status === 'published') + b('复制深链接', 'share')) +
      '<p class="meta mb">条款号为 DEMO 演示编号，非正式监管编号。</p><div class="rule-viewbar"><div class="tabs">' + b('指引视图', 'ruleView', { view: 'guide' }, 'tab ' + (U.pageState.ruleView !== 'cards' ? 'active' : '')) + b('条目视图', 'ruleView', { view: 'cards' }, 'tab ' + (U.pageState.ruleView === 'cards' ? 'active' : '')) + '</div><div class="actions"><span class="meta">' + h(g.project.framework) + ' · 清单 v' + g.checklist.version + '</span>' + b(U.pageState.ruleScale ? '返回项目清单' : '百条布局样例', 'ruleScale', {}, 'btn-small') + b('导出提示词示例', 'exportPromptDesign', {}, 'btn-small') + '</div></div>' +
      (U.pageState.ruleScale ? '<div class="scale-note">' + items.length + ' 条虚构布局样例 · 仅检查密度与导航，不计入项目覆盖和审核。</div>' : '') +
      '<div class="rules-workspace"><nav class="panel rule-tree" aria-label="披露分类"><div class="panel-head"><h2>披露索引</h2><span class="count">' + items.length + '</span></div><div class="rule-tree-scroll">' + b('全部披露条目', 'ruleScope', { scope: 'ALL' }, 'rule-tree-link ' + (scope === 'ALL' ? 'active' : '')) + tree + '</div></nav>' +
      '<section class="panel rule-list"><div class="rule-list-toolbar"><label class="search"><span class="sr-only">搜索披露条目</span><input id="rule-query" data-rule-query value="' + h(U.pageState.ruleQuery || '') + '" placeholder="搜索条目、编号或要求"></label><span class="meta">' + visible.length + ' / ' + items.length + '</span></div>' + (visible.length ? list : '<div class="empty">没有匹配条目。' + b('清除筛选', 'ruleScope', { scope: 'ALL' }) + '</div>') +
      '<div class="panel-foot"><span class="meta">选择条目后，在右侧配置提示词。</span>' + (c && !c.layoutOnly ? '<div class="actions mt">' + U.modelButton('生成检查项', 'draft', 'check', [c.id], 'newCheck') + U.modelButton('拆分', 'draft', 'check', [c.id], 'split') + U.modelButton('改写', 'rewrite', 'check', [c.id]) + b('批量选择与合并', 'ruleBatch', {}, 'btn-small', readOnly()) + '</div>' : '') + '</div></section>' +
      '<aside class="panel rule-detail"><div class="panel-head"><h2>条目要求与配置</h2>' + (c ? b('查看原文 ↗', 'ruleReader', { id: c.id }, 'btn-small') : '') + '</div><div class="rule-detail-scroll">' + (c ? requirementInfo(c, g) : '<p class="muted">选择一个披露条目。</p>') + '</div></aside></div>';
  }
  function inherited(g, unit) { return unit.checkIds.map(id => E.byId(g.checks, id)).filter(Boolean); }
  function instruction(g, unit, kind) {
    const checks = inherited(g, unit);
    return checks.map(c => '[' + c.id + ' · 清单 v' + g.checklist.version + ']\n' + defaults(c)[kind]).join('\n\n') + '\n\n[要点级补充 · 框架 v' + g.framework.version + ']\n' + (kind === 'writing' ? '采用“' + unit.type + '”形式，目标语言：' + g.project.language + '。先交代边界，再呈现结果；避免重复其他章节。' : '检查本要点与相邻章节的术语、数据引用是否一致；跨章节要求未获完整上下文时标记待核实。');
  }
  function inheritedCards(g, unit, kind) {
    return inherited(g, unit).map(c => '<details class="inherited-prompt"><summary>' + h(c.title) + '<span class="meta">' + h(c.id) + ' · v' + g.checklist.version + '</span></summary><p class="prompt-copy">' + h(defaults(c)[kind]) + '</p>' + link('checklist', 'check', c.id, '回到条目配置 →', {}, 'small') + '</details>').join('');
  }
  function frameworkPrompts(g, unit) {
    const kind = U.pageState.frameworkPromptKind || 'writing';
    return panel('要点提示词 · 继承与补充', '<div class="tabs mb">' + b('撰写', 'frameworkPromptTab', { kind: 'writing' }, 'tab ' + (kind === 'writing' ? 'active' : '')) + b('校验', 'frameworkPromptTab', { kind: 'validation' }, 'tab ' + (kind === 'validation' ? 'active' : '')) + '</div><p class="meta">来源要求保留身份；要点级补充不覆盖条目要求。</p>' + inheritedCards(g, unit, kind) +
      '<label class="form-field mt" for="point-supplement"><span>要点级补充</span><textarea id="point-supplement" data-point-id="' + h(unit.id) + '" data-point-kind="' + kind + '" rows="4"' + (readOnly() ? ' readonly' : '') + '>' + h(pointDrafts.get(unit.id + ':' + kind) || (kind === 'writing' ? '采用' + unit.type + '形式；先交代边界，再呈现年度结果，避免重复其他章节。' : '检查相邻章节术语和数据口径；跨章节证据不足时标记待核实。')) + '</textarea></label><div class="actions">' + b('保存本页补充', 'savePointPrompt', { id: unit.id, kind }, 'btn-small', readOnly()) + b('查看组合预览', 'composedPrompt', { id: unit.id, kind }, 'btn-small') + b('多条关联 · 固定示例', 'multiPromptExample', { id: unit.id }, 'btn-small') + '</div><p class="meta mt">补充仅供本页演示；P08 展示一致的预置配置，不读取本页编辑。</p>');
  }
  function writingPrompts(g, unit) {
    return '<section class="writing-prompt-summary"><div class="between"><strong class="small">本次撰写与检验配置</strong><span class="meta">' + inherited(g, unit).length + ' 条要求 · 清单 v' + g.checklist.version + ' / 框架 v' + g.framework.version + ' · 预置</span></div><div class="actions mt">' + b('查看撰写提示词', 'composedPrompt', { id: unit.id, kind: 'writing' }, 'btn-small') + b('查看校验提示词', 'composedPrompt', { id: unit.id, kind: 'validation' }, 'btn-small') + b('检验结果样例', 'validationDesign', { id: unit.id }, 'btn-small') + link('framework', 'unit', unit.id, '长期配置 →', {}, 'small') + '</div><p class="meta">任务内调整只作用于本次；不回写长期配置。</p></section>';
  }
  function staleFacts(g, unit) { return E.citations(unit.body).map(id => E.byId(g.facts, id)).filter(f => f && !E.effective(g, f)); }
  function editorPresentation(g, unit, editor) {
    const stale = staleFacts(g, unit), mode = U.pageState.editorMode || 'read';
    return '<div class="editor-presentation ' + (mode === 'read' ? 'reading' : 'editing') + '"><div class="editor-modebar"><div class="tabs">' + b('阅读与引用', 'editorMode', { mode: 'read', id: unit.id }, 'tab ' + (mode === 'read' ? 'active' : '')) + b('编辑正文', 'editorMode', { mode: 'edit', id: unit.id }, 'tab ' + (mode === 'edit' ? 'active' : '')) + '</div><span class="meta">从事实卡插入引用，无需手写括号。</span></div>' +
      (stale.length ? '<div class="inline-review-warning"><strong>' + stale.length + ' 处引用需复核</strong><span>高亮句子仍采用旧事实，正文数值与引用须一起核对。</span>' + stale.map(f => b('比较并更新', 'compareCitationDesign', { unitId: unit.id, factId: f.id }, 'btn-small')).join('') + '</div>' : '') +
      '<div class="reading-body">' + U.markdown(unit.body, g) + '</div><div class="editing-body">' + editor + '</div><p class="citation-format-warning" hidden role="status"></p></div>';
  }
  function reviewIdentity(action, payload = {}) {
    const identity = E.D.demoActor(action), g = E.state(), unit = E.byId(g.units, payload.id), build = E.byId(g.builds, payload.id);
    return '<div class="review-identity"><p class="small">此操作应由 ' + h(identity.role) + ' 执行，演示身份：' + h(identity.name) + '。</p><span class="meta">顶栏身份未切换；此处模拟职责，不代表当前用户获得了该权限。</span><dl class="detail-list mt"><dt>提交 / 编制</dt><dd>' + h(unit?.updatedBy || build?.createdBy || g.project.owner) + '</dd><dt>演示身份</dt><dd>' + h(identity.name) + '</dd><dt>操作角色</dt><dd>' + h(identity.role) + '</dd></dl></div>';
  }
  function difference(before, after) {
    const oldLines = String(before).split('\n'), newLines = String(after).split('\n');
    // Bounded presentation diff; unchanged prefix/suffix are retained as context.
    let start = 0, endOld = oldLines.length, endNew = newLines.length;
    while (start < endOld && start < endNew && oldLines[start] === newLines[start]) start++;
    while (endOld > start && endNew > start && oldLines[endOld - 1] === newLines[endNew - 1]) { endOld--; endNew--; }
    if (start === oldLines.length && start === newLines.length) return '<p class="notice info">两份内容一致，没有文本差异。</p>';
    const line = (text, kind, number) => '<div class="diff-line ' + kind + '"><span class="diff-gutter">' + (kind === 'deletion' ? '−' : kind === 'addition' ? '+' : ' ') + ' ' + number + '</span><span>' + (h(text) || ' ') + '</span></div>';
    return '<div class="diff-legend"><span>− 删除 / 原内容</span><span>+ 新增 / 建议内容</span><span>上下文保留</span></div><div class="line-diff" tabindex="0" aria-label="文本差异">' +
      oldLines.slice(Math.max(0, start - 2), start).map((s, i) => line(s, 'context', Math.max(0, start - 2) + i + 1)).join('') +
      oldLines.slice(start, endOld).map((s, i) => line(s, 'deletion', start + i + 1)).join('') +
      newLines.slice(start, endNew).map((s, i) => line(s, 'addition', start + i + 1)).join('') +
      newLines.slice(endNew, endNew + 2).map((s, i) => line(s, 'context', endNew + i + 1)).join('') + '</div><p class="meta mt">原型按变更块呈现差异；不代替正式编辑器的精确词级比对。</p>';
  }
  function evidenceRow(file, locator) {
    const row = file.rows[locator.row] || file.rows[0];
    return '<div class="evidence-row-preview"><span class="meta">选中行 · 保留原始表头</span><dl>' + file.columns.map((column, i) => '<dt>' + h(column) + '</dt><dd>' + h(row[i]) + '</dd>').join('') + '</dl><details><summary>相邻行与原始上下文</summary><p class="meta mt">' + file.rows.slice(Math.max(0, locator.row - 1), locator.row + 2).map(r => h(r.map((v, i) => file.columns[i] + '：' + v).join('；'))).join('<br><br>') + '</p></details></div>';
  }
  function sourceSignal(file, g) {
    return '<span>' + h('文件 v' + file.version + ' · ' + (file.version > 1 ? '修订资料' : '原始资料')) + '</span> ' + badge(file.status) + '<div class="meta">原始版本信号：' + h(file.signal) + '（不是当前审核结论）</div>';
  }
  const excerpt = text => String(text).replace(/［[^］]+］/g, '').replace(/^#{1,6}\s+.*$/gm, '').replace(/^>\s*/gm, '').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
  function composer(g) {
    U.setCurrent('composition', 'COMPOSITION-CURRENT');
    const ordered = [...g.units].sort((a, z) => a.order - z.order), chapters = [];
    ordered.forEach(unit => { let group = chapters.at(-1); if (!group || group.chapter !== unit.chapter) { group = { chapter: unit.chapter, continuation: chapters.some(c => c.chapter === unit.chapter), units: [] }; chapters.push(group); } group.units.push(unit); });
    const selected = E.byId(g.units, U.pageState.composerUnit) || ordered[0], gates = E.preflight(g), stats = E.stats(g);
    const inspector = U.pageState.composerInspector || 'gates';
    const track = chapters.map(group => '<section><h3>' + h(group.chapter + (group.continuation ? ' · 续' : '')) + '</h3>' + group.units.map(u => b('<span class="track-number">' + u.order + '</span><span>' + h(u.title) + '</span>', 'composerPick', { id: u.id }, 'track-item ' + (u.id === selected.id ? 'active' : ''))).join('') + '</section>').join('');
    const cards = ordered.map(u => {
      const n = E.unitStats(g, u);
      return '<article class="unit-card storyboard-card ' + (u.id === selected.id ? 'selected' : '') + '" id="story-' + h(u.id) + '"><div class="story-order">' + u.order + '</div><div><div class="between"><label class="small"><input type="checkbox" data-composer-select="' + h(u.id) + '" aria-label="选择合成单元 ' + h(u.id) + '"' + ((U.pageState.composerSelection || []).includes(u.id) ? ' checked' : '') + '> ' + h(u.id) + ' · v' + u.version + '</label>' + badge(u.reviewRequired ? 'needs_review' : u.status) + '</div><h3>' + b(h(u.title), 'composerPick', { id: u.id }, 'link-button') + '</h3><div class="meta">' + h(u.chapter + ' / ' + u.type) + ' · 表格 / 图表 ' + n.tables + ' · 案例 ' + n.cases + '</div><p class="unit-excerpt">' + h(excerpt(u.body).slice(0, 155)) + '…</p><div class="story-counts"><span>检查项 ' + n.checks + '</span><span>事实 ' + n.facts + '</span><span>证据 ' + n.files + '</span><span>缺口 ' + n.unresolved + '</span></div><div class="meta mt">框架 v' + u.frameworkVersion + ' · ' + h(u.contentHash) + '<br>最后修改：' + h(u.updatedBy || '尚未保存') + '</div><div class="actions mt">' + b('检查此单元', 'composerPick', { id: u.id }, 'btn-small') + link('writing', 'unit', u.id, '打开正文 →', {}, 'small') + '</div></div></article>';
    }).join('');
    const gateBody = gates.map(r => '<article class="gate-item ' + (r.pass ? 'pass' : 'fail') + '"><div class="between"><strong>' + h(r.title) + '</strong>' + badge(r.pass ? 'ready' : 'preflight_failed', 'gate') + '</div><p class="meta">' + h(r.hint) + '</p>' + (r.failures.length ? '<div class="chips">' + r.failures.map(id => id === g.checklist.id ? link('checklist', 'check', g.checks[0].id, h(id)) : id === g.framework.id ? link('framework', 'framework', id, h(id)) : link(r.page, r.type, id, h(id))).join('') + '</div>' : '') + '</article>').join('');
    const selectedBody = '<span class="mono">' + h(selected.id) + ' · v' + selected.version + '</span><h3 class="mt">' + h(selected.title) + '</h3>' + badge(selected.reviewRequired ? 'needs_review' : selected.status) + '<div class="story-inspector-body mt">' + U.markdown(selected.body, g) + '</div><h3 class="mt">披露覆盖</h3>' + selected.checkIds.map(id => '<div class="between mb">' + link('mapping', 'check', id, h(id), {}, 'small') + badge(E.coverage(g, id)) + '</div>').join('') + '<div class="actions mt">' + b('查看引用', 'writingEvidence', { id: selected.id }, 'btn-small') + link('writing', 'unit', selected.id, '回到正文修改 →', {}, 'small') + '</div><p class="meta mt">合成预览不直接改正文；修改返回对应单元。</p>';
    const preview = U.pageState.composerMode === 'report' ? '<div class="document report-preview">' + U.markdown(E.D.makeBuild(g, 'PREVIEW', 0, '').body, g) + '</div>' : '<div class="storyboard-track">' + cards + '</div>';
    return heading('S6 / REPORT STORYBOARD', '报告分镜与发布前检查', '按章节顺序审阅正文，预检通过后构建；最终批准在版本交付页完成。', b('运行八项预检', 'runPreflight', {}, '', readOnly()) + b('构建模拟正式版', 'buildReport', {}, 'btn-primary', readOnly() || !stats.canBuild)) +
      '<div class="composition-summary"><span><strong>' + ordered.length + '</strong> 个正文单元</span><span>单元审核 ' + stats.reviewedUnits + ' / ' + ordered.length + '</span><span>预检 ' + stats.passedGates + ' / ' + gates.length + ' 通过</span>' + (stats.canBuild ? '<span class="badge badge-ready">可构建 · 非最终批准</span>' : '<span class="badge badge-preflight_failed">构建已阻断</span>') + '</div>' +
      '<div class="storyboard-workspace"><nav class="panel chapter-track" aria-label="报告章节轨道"><div class="panel-head"><h2>章节顺序</h2></div><div class="panel-body">' + track + '<p class="meta">顺序来自已发布框架。</p>' + link('framework', 'framework', g.framework.id, '查看框架 →', {}, 'small') + '</div></nav><section class="storyboard-main"><div class="between mb"><div class="tabs">' + b('单元总览', 'composerMode', { mode: 'units' }, 'tab ' + (U.pageState.composerMode !== 'report' ? 'active' : '')) + b('连续全文', 'composerMode', { mode: 'report' }, 'tab ' + (U.pageState.composerMode === 'report' ? 'active' : '')) + '</div><span class="meta">从上到下为报告顺序</span></div>' + preview + '</section><aside class="panel storyboard-inspector"><div class="panel-head"><div class="tabs">' + b('单元检查', 'composerInspector', { kind: 'unit' }, 'tab ' + (inspector === 'unit' ? 'active' : '')) + b('发布前检查', 'composerInspector', { kind: 'gates' }, 'tab ' + (inspector === 'gates' ? 'active' : '')) + '</div></div><div class="panel-body">' + (inspector === 'gates' ? gateBody : selectedBody) + '<div class="hr"></div>' + U.modelButton('检查选中单元一致性', 'validate', 'unit', U.pageState.composerSelection || []) + '<p class="meta mt">仅提供所选范围的建议，不替代质量门与最终审核。</p></div></aside></div>';
  }
  U.design = { checklist, defaults, instruction, frameworkPrompts, writingPrompts, editorPresentation, reviewIdentity, difference, evidenceRow, sourceSignal, requirementInfo, scaleItems, composer, excerpt };
  U.handlers.composerPick = p => { U.pageState.composerUnit = p.id; U.pageState.composerInspector = 'unit'; U.render(); document.getElementById('story-' + p.id)?.scrollIntoView({ block: 'nearest' }); };
  U.handlers.composerInspector = p => { U.pageState.composerInspector = p.kind; U.render(); };
  U.handlers.rulePick = p => { U.pageState.ruleSelected = p.id; U.pageState.ruleScope = 'ALL'; U.pageState.ruleQuery = ''; U.render(); };
  U.handlers.ruleScope = p => { U.pageState.ruleScope = p.scope; U.pageState.ruleQuery = ''; U.render(); };
  U.handlers.ruleView = p => { U.pageState.ruleView = p.view; U.render(); };
  U.handlers.ruleScale = () => { U.pageState.ruleScale = !U.pageState.ruleScale; U.pageState.ruleScope = 'ALL'; U.pageState.ruleQuery = ''; U.pageState.ruleSelected = ''; U.render(); };
  U.handlers.savePromptDesign = p => {
    const c = findCheck(E.state(), p.id), d = draftFor(c); drafts.set(c.id, { ...d, edited: true, saved: true });
    document.querySelectorAll('[data-prompt-owner="' + c.id + '"] .prompt-draft-status').forEach(el => { el.textContent = '已批注 · 本页草案已保存'; });
    U.toast('已保存本页草案示例。刷新恢复预置内容；未发布清单。');
  };
  U.handlers.promptVersions = p => {
    const c = findCheck(E.state(), p.id), d = draftFor(c);
    U.openDialog('提示词版本与审核 · 设计示意', notice('修改已发布配置应先形成草案，再审核发布。此处仅展示状态，不创建真实清单版本。', 'info') + reviewIdentity('publishChecklist') +
      '<div class="prompt-version-track"><article><span class="badge badge-published">已发布样例</span><h3>清单 v1 · 条目配置</h3><p>保留原始双提示词及审核记录。</p></article><article><span class="badge badge-draft">草案样例</span><h3>拟发布 v2 · ' + h(c.id) + '</h3><p>本页批注需查看差异、审核后才能成为新的有效配置。</p></article></div>' + difference(defaults(c).writing + '\n\n' + defaults(c).validation, d.writing + '\n\n' + d.validation) + '<p class="meta">历史正文保留旧配置快照；发布新配置后的受影响范围在正式工程阶段实现。</p>', b('返回配置', 'close'), 'wide');
  };
  U.handlers.exportPromptDesign = () => {
    const g = E.state();
    U.download('disclosure-prompts-design-demo.json', JSON.stringify({ schemaVersion: 1, demonstration: true, scope: 'page-only-design-draft', projectId: g.project.id, checklistVersion: g.checklist.version, sourceVersion: 'DEMO-RULE-v1', entries: itemsFor(g).map(c => ({ checklistItemId: c.id, layoutOnly: !!c.layoutOnly, writingPrompt: draftFor(c).writing, validationPrompt: draftFor(c).validation, promptOrigin: draftFor(c).edited ? 'user_annotated' : 'suggested' })) }, null, 2), 'application/json');
  };
  U.handlers.ruleReader = p => {
    const g = E.state(), items = itemsFor(g), c = findCheck(g, p.id), kind = p.kind || 'main', lines = sourceLines(items, kind), start = 5 + Math.max(0, items.findIndex(row => row.id === c.id)) * 5;
    const d = U.openDialog('监管依据与条目配置', '<div class="rule-reader-grid"><aside>' + requirementInfo(c, g, 'reader-') + '</aside><section><div class="reader-source-tools"><div class="tabs">' + b('主规则副本', 'ruleReader', { id: c.id, kind: 'main' }, 'tab ' + (kind === 'main' ? 'active' : '')) + b('FAQ / 补充指引', 'ruleReader', { id: c.id, kind: 'faq' }, 'tab ' + (kind === 'faq' ? 'active' : '')) + '</div><span class="mono">DEMO-RULE-v1 · L' + start + '–' + (start + 3) + '</span></div><p class="meta">' + (kind === 'main' ? '主条款来源身份独立保留。' : '关联理由：补充披露边界与计量口径，不替代主规则。') + ' 以下全部为虚构定位样例。</p><div class="rule-source-lines" tabindex="0">' + lines.map((line, i) => '<div class="source-line ' + (i + 1 >= start && i + 1 <= start + 3 ? 'target' : '') + '" id="rule-line-' + (i + 1) + '"><span>' + (i + 1) + '</span><p>' + h(line) + '</p></div>').join('') + '</div></section></div>', b('关闭原文', 'close'), 'wide rule-reader');
    requestAnimationFrame(() => d.querySelector('.source-line.target')?.scrollIntoView({ block: 'center' }));
  };
  U.handlers.ruleBatch = () => {
    const g = E.state(); U.ask('批量选择披露条目', '<fieldset><legend>合并范围至少包含两个项目检查项</legend>' + g.checks.map(c => '<label class="check-option"><input type="checkbox" name="ids" value="' + h(c.id) + '"><span>' + h(c.title) + '</span></label>').join('') + '</fieldset>', '查看合并指令', (_, form) => { const ids = new FormData(form).getAll('ids'); E.need(ids.length > 1, '请至少选择两个条目。'); U.closeDialog(); U.handlers.model({ label: '合并检查项', actionType: 'merge', operation: 'merge', targetType: 'check', ids, page: 'checklist' }); return false; });
  };
  U.handlers.frameworkPromptTab = p => { U.pageState.frameworkPromptKind = p.kind; U.render(); };
  U.handlers.savePointPrompt = p => { pointDrafts.set(p.id + ':' + p.kind, document.getElementById('point-supplement').value); U.toast('本页补充已保留；未发布框架，也未同步到 P08。'); };
  U.handlers.composedPrompt = p => {
    const g = E.state(), unit = E.byId(g.units, p.id), kind = p.kind || 'writing';
    const supplement = pointDrafts.get(unit.id + ':' + kind);
    U.openDialog((kind === 'writing' ? '撰写' : '校验') + '提示词 · 来源与组合预览', inheritedCards(g, unit, kind) + '<h3 class="mt">组合内容</h3><pre class="code-block">' + h(instruction(g, unit, kind) + (supplement ? '\n\n[本页补充草案 · 尚未发布]\n' + supplement : '')) + '</pre><p class="meta mt">保留条目来源，不静默覆盖要求。任务弹窗允许临时调整本次指令。</p>', link('framework', 'unit', unit.id, '返回要点配置', {}, 'btn') + b('关闭', 'close'), 'wide');
  };
  U.handlers.multiPromptExample = p => {
    const g = E.state(), unit = { ...E.byId(g.units, p.id), checkIds: ['CHK-CLI-001', 'CHK-ENV-001'] };
    U.openDialog('多条关联 · 固定示例（气候 + 排放）', notice('固定展示 CHK-CLI-001 与 CHK-ENV-001，不代表当前选中要点的关系，也不修改关联。', 'info') + inheritedCards(g, unit, 'writing') + '<h3 class="mt">需要人工协调的边界</h3><p>气候章节可引用排放基线，但不重复环境章节的完整绩效表；两条校验要求仍分别保留。</p>', b('返回配置', 'close'), 'wide');
  };
  U.handlers.editorMode = p => {
    U.pageState.editorMode = p.mode; const root = document.querySelector('.editor-presentation');
    if (!root) return; root.classList.toggle('reading', p.mode === 'read'); root.classList.toggle('editing', p.mode === 'edit');
    root.querySelectorAll('[data-action="editorMode"]').forEach(el => el.classList.toggle('active', JSON.parse(el.dataset.payload).mode === p.mode));
    if (p.mode === 'read') root.querySelector('.reading-body').innerHTML = U.markdown(document.getElementById('unit-body').value);
  };
  U.handlers.compareCitationDesign = p => {
    const g = E.state(), old = E.byId(g.facts, p.factId), latest = g.facts.filter(f => f.factId === old.factId && E.effective(g, f)).sort((a, z) => z.version - a.version)[0];
    U.openDialog('引用复核 · 不只替换编号', '<div class="split"><section><span class="badge badge-needs_review">正文正在引用</span><h2 class="mt">' + h(old.displayValue + ' ' + old.unit) + '</h2><p class="mono">' + h(old.id) + '</p></section><section><span class="badge">当前有效事实</span><h2 class="mt">' + h(latest ? latest.displayValue + ' ' + latest.unit : '尚无可采用版本') + '</h2><p class="mono">' + h(latest?.id || '需先完成事实审核') + '</p></section></div>' + notice('同时核对正文数值、报告期、单位、口径及原始证据。更新须派生草稿并重新审核；不会自动替换已锁定正文。', 'info') + '<p class="small mt">' + h(latest?.summary || '请回到事实审核补证。') + '</p>', link('facts', 'fact', latest?.id || old.id, '查看事实与证据', {}, 'btn') + b('返回正文核对', 'close'), 'wide');
  };
  U.handlers.validationDesign = p => {
    const g = E.state(), unit = E.byId(g.units, p.id);
    const rows = inherited(g, unit).flatMap(c => c.elements.map((element, i) => '<tr><td><strong>' + h(element) + '</strong><div class="meta">' + h(c.id) + '</div></td><td>' + (i === 0 ? '<span class="badge badge-needs_review">引用待核实 · 样例</span>' : '<span class="badge">待人工确认 · 样例</span>') + '</td><td>' + h(unit.factIds.join(' / ')) + '<div class="meta">正文定位：本要点第 ' + (i + 1) + ' 个要求</div></td><td>' + (i === 0 ? '对照有效版本核对正文数值与引用，不仅替换编号。' : '补充要求对应的责任、范围或执行依据，再由审核人确认。') + '</td></tr>'));
    U.openDialog('逐条披露检验结果 · 预置展示', notice('以下只展示结果格式，不是本次模型执行结果，也不是对当前正文的合规结论；不会改变覆盖状态或审核状态。', 'info') + '<p class="meta mt">要点 ' + h(unit.id) + ' · 预置校验配置：清单 v' + g.checklist.version + ' / 框架 v' + g.framework.version + '</p><div class="table-scroll"><table class="data-table"><thead><tr><th>本条要求</th><th>样例结论</th><th>依据与定位</th><th>修改建议</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>', b('查看校验提示词', 'composedPrompt', { id: unit.id, kind: 'validation' }) + (p.taskId ? b('返回模型动作', 'tasks', { id: p.taskId }) : b('关闭样例', 'close')), 'wide');
  };
  U.design.resizePrompts = () => document.querySelectorAll('[data-clause-prompt]').forEach(el => {
    if (!el.getClientRects().length) return;
    el.style.height = 'auto';
    el.style.height = Math.ceil(el.scrollHeight + parseFloat(getComputedStyle(el).borderTopWidth) + parseFloat(getComputedStyle(el).borderBottomWidth)) + 'px';
  });
  window.addEventListener('resize', () => requestAnimationFrame(U.design.resizePrompts));
  document.addEventListener('input', event => {
    const el = event.target;
    if (el.dataset.clausePrompt) U.design.resizePrompts();
    if (el.dataset.clausePrompt && !readOnly()) {
      const c = findCheck(E.state(), el.dataset.checkId), d = { ...draftFor(c), [el.dataset.clausePrompt]: el.value, edited: true, saved: false }; drafts.set(c.id, d);
      document.querySelectorAll('[data-prompt-owner="' + c.id + '"] .prompt-draft-status').forEach(s => { s.textContent = '已修改 · 本页草案未保存'; });
      document.querySelectorAll('[data-prompt-row="' + c.id + '"]').forEach(s => { s.textContent = '已批注'; });
    }
    if (el.id === 'point-supplement') pointDrafts.set(el.dataset.pointId + ':' + el.dataset.pointKind, el.value);
    if (el.id === 'unit-body') {
      const warning = document.querySelector('.citation-format-warning');
      if (warning) { warning.hidden = !/\[FV-[^\]]+\]/.test(el.value); warning.textContent = '发现未识别的手工引用。请从事实卡“插入引用”，不要手写括号；当前标记不会计入有效引用。'; }
    }
  });
  document.addEventListener('change', event => { if (event.target.matches('[data-rule-query]')) { U.pageState.ruleQuery = event.target.value; U.render(); } });
  document.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.matches('[data-rule-query]')) { event.preventDefault(); U.pageState.ruleQuery = event.target.value; U.render(); } });
  window.addEventListener('esg:change', () => { if (runId !== E.meta().runId) { runId = E.meta().runId; drafts.clear(); pointDrafts.clear(); U.pageState.ruleSelected = ''; U.render(); } });
})();
