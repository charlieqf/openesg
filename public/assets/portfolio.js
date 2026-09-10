/* Portfolio presentation; shared project state stays browser-local and fictional. */
(function () {
  'use strict';
  const E = window.ESG, U = window.ESGUI, P = window.ESGProjects;
  const { escape: h, button: b, icon, heading, notice, field, selectInput } = U;
  let query = '', company = '', year = '', tab = 'active', phase = '', sort = 'updated';
  const url = (id, page = 'overview') => (E.D.pages.find(p => p.key === page)?.file || '01-project-overview.html') + '#project=' + encodeURIComponent(id);
  function row(p) {
    try {
      const g = P.graphFor(p), stats = E.stats(g), gates = E.preflight(g), latest = [...g.builds].sort((a, z) => z.version - a.version)[0];
      const pendingSource = g.tasks.filter(t => t.type === 'source' && t.status === 'pending').length;
      const review = g.units.filter(u => u.reviewRequired).length;
      const missing = g.checks.filter(c => ['missing', 'partial', 'conflict'].includes(E.coverage(g, c.id))).length;
      const ready = gates.every(x => x.pass), pending = stats.pending;
      const stage = g.initialization && !g.files.length ? '待初始化' : review ? '正文复核' : missing ? '补充证据' : pendingSource || stats.pendingSources ? '来源审核' : stats.pendingFacts ? '事实审核' : pending > 0 ? '覆盖复核' : !ready ? '撰写与审核' : latest?.status === 'ready' ? '最终审核' : latest?.status === 'approved' && latest.hash === E.D.makeBuild(g, 'PREVIEW', 0, '').hash ? '已批准' : '报告合成';
      return { ...p, g, stats, stage, pending, latest, updated: g.audit[0]?.time && g.audit[0].id !== 'AUD-BASE' ? g.audit[0].time : p.updatedAt };
    } catch (e) { return { ...p, error: e.message, stage: '状态需恢复', pending: null, updated: p.updatedAt }; }
  }
  function shell(content) {
    return '<a class="skip-link" href="#main-content">跳到主要内容</a><aside class="rail"><a class="brand" href="index.html"><span class="brand-mark">O</span><span class="brand-name">OpenESG<small>LOCAL WORKSPACE</small></span></a><div class="rail-project portfolio-space"><strong>报告工作空间</strong><span>跨公司 · 跨年度管理</span></div><div class="nav-label">工作空间</div><nav aria-label="工作空间导航">' + b(icon('grid') + '<span class="nav-text" aria-hidden="true">报告项目</span><span class="sr-only">报告项目</span>', 'portfolioTab', { tab: 'active' }, 'nav-item ' + (tab !== 'archived' ? 'active' : '')) + b(icon('archive') + '<span class="nav-text" aria-hidden="true">已归档项目</span><span class="sr-only">已归档项目</span>', 'portfolioTab', { tab: 'archived' }, 'nav-item ' + (tab === 'archived' ? 'active' : '')) + '<div class="nav-divider"></div><p class="portfolio-rail-note">选择报告项目后，进入披露、资料、撰写与交付工作区。</p></nav><div class="rail-bottom"><i class="local-light"></i><span>本地演示 · 无外部连接</span></div></aside><div class="app"><header class="topbar"><div class="breadcrumbs"><span>工作空间</span><span>/</span><strong>报告项目</strong></div><div class="top-actions"><span class="meta portfolio-local">虚构项目 · 仅当前浏览器</span><span class="avatar">林</span><span class="user-label">林悦 · ESG 撰写人</span></div></header><div class="demo-strip"><span>虚构演示数据 · 不代表客户实际情况或监管结论</span><span>项目间状态独立</span></div><main id="main-content" class="main portfolio-main" tabindex="-1">' + content + '</main></div>';
  }
  function view() {
    let rows;
    try { rows = P.catalog().map(row); }
    catch (e) { return heading('WORKSPACE', '报告项目', '选择要处理的报告。') + notice(h(e.message), 'danger'); }
    const active = rows.filter(p => !p.archived), archived = rows.filter(p => p.archived), todo = active.filter(p => p.pending > 0), approved = active.filter(p => p.stage === '已批准');
    let shown = rows.filter(p => (tab === 'all' || (tab === 'archived' ? p.archived : !p.archived)) && (!company || p.name === company) && (!year || p.year === year) && (!phase || p.stage === phase) && (!query || [p.name, p.title, p.id, p.framework, p.owner].join(' ').toLowerCase().includes(query.toLowerCase())));
    shown.sort((a, z) => sort === 'year' ? z.year.localeCompare(a.year) || a.name.localeCompare(z.name, 'zh-CN') : z.updated.localeCompare(a.updated));
    const options = (name, values, first, value) => selectInput(name, [['', first], ...values.map(v => [v, v])], value);
    const tbody = shown.map(p => '<tr data-project-row="' + h(p.id) + '"><td><a class="portfolio-report-title" href="' + h(url(p.id)) + '">' + h(p.name) + '</a><div class="small mt">' + h(p.title) + '</div><div class="meta mono mt">' + h(p.id) + '</div></td><td><strong>' + h(p.year) + '</strong><span class="meta"> · 年度</span><div class="small mt">' + h(p.framework) + '</div></td><td><span class="badge ' + (p.error ? 'badge-conflict' : p.stage === '已批准' ? 'badge-approved' : 'badge-needs_review') + '">' + h(p.archived ? '已归档 · 只读' : p.stage) + '</span><div class="meta mt">' + (p.error ? h(p.error) : '单元通过 ' + p.stats.reviewedUnits + ' / ' + p.stats.units) + '</div><div class="portfolio-mini-progress" aria-hidden="true"><span style="width:' + (p.stats?.units ? Math.round(p.stats.reviewedUnits / p.stats.units * 100) : 0) + '%"></span></div></td><td>' + (p.archived ? '<span class="meta">归档前：' + h(p.stage) + '</span>' : p.pending == null ? '—' : '<strong class="' + (p.pending ? 'warning-text' : '') + '">' + p.pending + '</strong><span class="meta"> 项待审核 / 复核</span>') + '<div class="meta mt">' + (p.latest ? '最近构建 v' + p.latest.version + ' · ' + h(p.latest.status === 'approved' ? '已批准' : p.latest.status === 'rejected' ? '已拒绝' : '待最终审核') : '尚未构建') + '</div></td><td><span class="small">' + h(p.owner) + '</span><div class="meta mt">' + h(p.updated) + '</div></td><td><div class="portfolio-row-actions"><a class="btn btn-small" href="' + h(url(p.id)) + '">' + (p.archived ? '查看项目' : '进入项目') + icon('arrow') + '</a>' + b(p.archived ? '恢复项目' : '归档', 'portfolioArchive', { id: p.id, archived: !p.archived }, 'btn-quiet btn-small') + '</div></td></tr>').join('');
    return heading('WORKSPACE / REPORT PORTFOLIO', '报告项目', '先选择公司与报告期，再进入同一条可追溯的报告工作流。', b(icon('plus') + '新建演示报告', 'portfolioCreate', {}, 'btn-primary')) +
      '<div class="metrics portfolio-metrics">' + U.metric('进行中的项目', active.length, '每个项目独立保存演示状态') + U.metric('有待审核 / 复核', todo.length, '项目数 · 对象数与 P01 保持一致') + U.metric('当前报告已批准', approved.length, '仅统计进行中的项目') + U.metric('已归档项目', archived.length, '保留内容 · 可恢复') + '</div>' +
      '<section class="panel portfolio-list"><div class="panel-head portfolio-list-head"><div class="tabs">' + [['active', '进行中', active.length], ['archived', '已归档', archived.length], ['all', '全部', rows.length]].map(([v, label, n]) => b(label + ' <span class="count">' + n + '</span>', 'portfolioTab', { tab: v }, 'tab ' + (v === tab ? 'active' : ''))).join('') + '</div><span class="meta">一个报告项目 ≠ 一个报告版本</span></div><div class="portfolio-filters"><label class="search">' + icon('search') + '<input aria-label="搜索报告项目" id="portfolio-query" value="' + h(query) + '" placeholder="搜索公司、报告名称或项目编号"></label>' + field('portfolio-company', '公司', options('portfolio-company', [...new Set(rows.map(p => p.name))], '全部公司', company)) + field('portfolio-year', '报告年度', options('portfolio-year', [...new Set(rows.map(p => p.year))].sort().reverse(), '全部年度', year)) + field('portfolio-phase', '当前阶段', options('portfolio-phase', [...new Set(rows.map(p => p.stage))], '全部阶段', phase)) + field('portfolio-sort', '排序', selectInput('portfolio-sort', [['updated', '最近更新'], ['year', '报告年度']], sort)) + '</div>' +
      (shown.length ? '<div class="table-scroll portfolio-table-scroll"><table class="portfolio-table"><thead><tr><th>公司 / 报告项目</th><th>报告期 / 披露框架</th><th>当前阶段 / 单元进度</th><th>待审核 / 最近构建</th><th>负责人 / 最近更新</th><th>操作</th></tr></thead><tbody>' + tbody + '</tbody></table></div>' : '<div class="empty"><strong>没有符合条件的报告项目</strong><p class="meta mt">调整筛选条件，或新建一个虚构演示报告。</p>' + b('清除筛选', 'portfolioClear') + '</div>') + '<div class="panel-foot"><span class="meta">显示 ' + shown.length + ' / ' + rows.length + ' 个项目 · 项目计数与工作区状态联动</span></div></section>' +
      '<div class="portfolio-footer"><div>' + icon('tree') + '<p><strong>进入项目后</strong><br><span class="meta">P01 总览 → P02–P09 工作流 → P10 版本与交付</span></p></div><p class="meta">本页仅管理虚构演示项目。归档不等于审核通过，也不会删除资料、正文或历史版本。</p></div>';
  }
  U.handlers.portfolioTab = p => { tab = p.tab; U.render(); };
  U.handlers.portfolioClear = () => { query = ''; company = ''; year = ''; phase = ''; tab = 'all'; U.render(); };
  U.handlers.portfolioCreate = () => U.ask('新建演示报告', notice('仅输入虚构项目信息。创建后载入虚构工作流样例，不代表已经收集或审核公司资料。当前支持年度 HKEX 演示框架。', 'info') + '<div class="split mt">' + field('project-company', '公司名称（虚构）', '<input id="project-company" name="name" maxlength="50" required placeholder="例如：云岑金融服务（虚构）">') + field('project-year', '报告年度', '<input id="project-year" name="year" type="number" min="2020" max="2035" value="2025" required>') + '</div>' + field('project-title', '报告名称', '<input id="project-title" name="title" maxlength="80" value="年度 ESG 报告" required>') + field('project-framework', '披露框架', '<select id="project-framework"><option>HKEX · 演示框架</option></select>') + '<p class="meta">相同公司、年度与框架会提示已有项目，不覆盖既有工作。手工提示词草案仍仅留本页；命名发布样例在同一项目间保持一致。</p>', '创建并进入演示', values => {
    const result = P.create(values);
    if (result.existing) { U.openDialog('该报告项目已经存在', '<p>' + h(result.project.name + ' · ' + result.project.year + ' · ' + result.project.title) + '</p>' + notice('没有新建副本，也没有重置现有状态。' + (result.project.archived ? '此项目已归档，进入后只读。' : ''), 'info'), '<a class="btn btn-primary" href="' + h(url(result.project.id)) + '">进入已有项目</a>' + b('取消', 'close')); return false; }
    location.assign(url(result.project.id)); return false;
  }, 'wide');
  U.handlers.portfolioArchive = p => {
    const project = P.find(p.id);
    U.ask(p.archived ? '归档报告项目' : '恢复报告项目', '<p><strong>' + h(project.name + ' · ' + project.year) + '</strong></p>' + notice(p.archived ? '归档后项目只读，资料、正文和版本保留；可以从“已归档项目”恢复。不会自动批准报告。' : '恢复到进行中列表，保留归档前的状态，不重置数据。', 'info'), p.archived ? '确认归档' : '确认恢复', () => { P.archive(p.id, p.archived); U.render(); U.toast(p.archived ? '项目已归档，内容保留。' : '项目已恢复。'); });
  };
  U.handlers.portfolioSwitch = () => U.openDialog('切换报告项目', '<p class="meta">切换不重置已保存的项目状态。本页未保存正文或提示词草案不会随项目切换保留。</p><div class="project-switch-list">' + P.catalog().map(p => '<a href="' + h(url(p.id)) + '" class="project-switch-item ' + (p.id === E.state().project.id ? 'active' : '') + '"><strong>' + h(p.name) + '</strong><span>' + h(p.title + ' · ' + p.year) + '</span><span class="meta">' + h(p.framework) + (p.archived ? ' · 已归档' : '') + '</span></a>').join('') + '</div>', '<a class="btn" href="index.html">返回报告项目列表</a>' + b('关闭', 'close'));
  document.addEventListener('change', event => {
    const el = event.target;
    if (el.id === 'portfolio-query') query = el.value;
    else if (el.id === 'portfolio-company') company = el.value;
    else if (el.id === 'portfolio-year') year = el.value;
    else if (el.id === 'portfolio-phase') phase = el.value;
    else if (el.id === 'portfolio-sort') sort = el.value;
    else return;
    U.render();
  });
  document.addEventListener('keydown', event => { if (event.target.id === 'portfolio-query' && event.key === 'Enter') { event.preventDefault(); query = event.target.value; U.render(); } });
  window.addEventListener('storage', event => { if (document.body.dataset.page === 'index' && (event.key === P.KEY || event.key?.startsWith('openesg-demo:v1'))) U.render(); });
  window.addEventListener('focus', () => { if (document.body.dataset.page === 'index') U.render(); });
  U.portfolio = { shell, view, url, row };
})();
