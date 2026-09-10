(function () {
  'use strict';
  const E = window.ESG, D = E.D;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const paths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Z"/><path d="M12 5v15"/>',
    file: '<path d="M14 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9Z"/><path d="M14 2v7h7M7 13h10M7 17h7"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    link: '<path d="m10 13 4-4M8 15l-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M14 9l2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 -1)"/>',
    tree: '<rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5H5v5M12 12h7v5"/>',
    pen: '<path d="m16 3 5 5-12 12-6 1 1-6L16 3ZM13 6l5 5"/>',
    compose: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>',
    archive: '<path d="M4 8h16v13H4ZM3 3h18v5H3ZM9 12h6"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    alert: '<path d="M12 3 2 21h20L12 3ZM12 9v5M12 17v1"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
    spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4M18 4h4"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    history: '<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6M12 7v6l4 2"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    filter: '<path d="M3 5h18M6 12h12M9 19h6"/>',
    upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    shield: '<path d="m12 2 9 4v6c0 5-5 8-9 10-4-2-9-5-9-10V6l9-4Z"/><path d="m8 12 3 3 5-6"/>',
    external: '<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
    dot: '<circle cx="12" cy="12" r="3"/>',
  };
  const icons = ['grid', 'book', 'file', 'layers', 'shield', 'link', 'tree', 'pen', 'compose', 'archive'];
  const icon = (name, cls = '') => '<svg class="icon ' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.file) + '</svg>';
  const button = (label, action, payload = {}, cls = '', disabled = false) => '<button type="button" class="btn ' + cls + '" data-action="' + escape(action) + '" data-payload="' + escape(JSON.stringify(payload)) + '"' + (disabled ? ' disabled' : '') + '>' + label + '</button>';
  const badge = (status, kind = '') => '<span class="badge badge-' + escape(kind === 'build' && status === 'ready' ? 'review' : status) + '">' + escape((kind === 'gate' ? { ready: '通过', preflight_failed: '未通过' } : kind === 'build' ? { ready: '待最终审核', approved: '已批准', rejected: '已拒绝' } : {})[status] || D.labels[status] || status) + '</span>';
  const link = (page, type, id, label, extra = {}, cls = '') => '<a class="' + cls + '" href="' + escape(E.url(page, type, id, extra)) + '">' + label + '</a>';
  const panel = (title, body, meta = '', cls = '') => '<section class="panel ' + cls + '"><div class="panel-head"><h2>' + title + '</h2>' + meta + '</div><div class="panel-body">' + body + '</div></section>';
  const notice = (text, tone = '') => '<div class="notice ' + tone + '">' + icon(tone === 'success' ? 'checkCircle' : 'alert') + '<div>' + text + '</div></div>';
  const metric = (label, value, sub = '', cls = '') => '<div class="metric ' + cls + '"><div class="metric-label">' + label + '</div><div class="metric-value">' + escape(value) + '</div><div class="metric-sub">' + sub + '</div></div>';
  const empty = (title, description = '', action = '') => '<div class="empty"><strong>' + title + '</strong>' + description + (action ? '<div class="mt">' + action + '</div>' : '') + '</div>';
  const fileType = f => '<span class="file-type ' + (f.type === 'PDF' ? 'pdf' : f.type === 'Word' ? 'word' : '') + '">' + ({ Excel: 'XLS', Word: 'DOC', PDF: 'PDF', Markdown: 'MD', '扫描件': 'PDF' }[f.type] || 'FILE') + '</span>';
  const field = (name, label, input, help = '') => '<label class="form-field" for="' + escape(name) + '"><span>' + label + '</span>' + input + (help ? '<small>' + help + '</small>' : '') + '</label>';
  const option = (value, label, selected) => '<option value="' + escape(value) + '"' + (value === selected ? ' selected' : '') + '>' + escape(label) + '</option>';
  const selectInput = (name, choices, selected, cls = '') => '<select id="' + escape(name) + '" name="' + escape(name) + '" class="' + cls + '">' + choices.map(c => option(c[0], c[1], selected)).join('') + '</select>';
  let current = { type: 'project', id: 'PRJ-DEMO-001' }, dialog = null, dialogReturn = null, selectedTask = null, pageState = {}, lastRenderKey = '';
  const handlers = {};
  const U = { escape, icon, button, badge, link, panel, notice, metric, empty, fileType, field, option, selectInput, handlers, pageState, current: () => current };
  window.ESGUI = U;
  const pageKey = document.body.dataset.page || 'index';
  const page = [...D.pages, ...window.ESGSupport.pages].find(p => p.key === pageKey);
  function toast(message, isError = false) {
    const el = document.createElement('div'); el.className = 'toast' + (isError ? ' error' : ''); el.textContent = message;
    document.getElementById('toasts').append(el); setTimeout(() => el.remove(), isError ? 8500 : 4200);
  }
  function closeDialog() {
    if (!dialog) return; const previous = dialogReturn; dialog.close(); dialog.remove(); dialog = null;
    if (previous?.isConnected) previous.focus();
    else { const replacement = previous?.dataset?.action && [...document.querySelectorAll('#app [data-action]')].find(el => el.dataset.action === previous.dataset.action && el.dataset.payload === previous.dataset.payload); (replacement || document.querySelector('[data-action="tasks"]'))?.focus(); }
  }
  function decorateTables(container) {
    container.querySelectorAll('.table-scroll').forEach(el => {
      el.tabIndex=0; el.setAttribute('role','region'); el.setAttribute('aria-label','数据表格，可使用键盘或滚动条查看完整内容');
      if (el.scrollWidth > el.clientWidth + 1 && !el.previousElementSibling?.classList.contains('table-overflow-hint')) { const hint=document.createElement('p'); hint.className='meta table-overflow-hint'; hint.textContent='此表可横向滚动，查看右侧列 →'; el.before(hint); }
    });
  }
  function openDialog(title, content, footer = '', cls = '') {
    if (dialog) closeDialog(); dialogReturn = document.activeElement;
    dialog = document.createElement('dialog'); dialog.className = cls;
    dialog.innerHTML = '<div class="dialog-head"><h2 id="dialog-title">' + title + '</h2><button class="btn btn-icon btn-quiet" data-action="close" aria-label="关闭对话框">' + icon('close') + '</button></div><div class="dialog-body">' + content + '</div>' + (footer ? '<div class="dialog-foot">' + footer + '</div>' : '');
    dialog.setAttribute('aria-labelledby', 'dialog-title'); document.body.append(dialog); dialog.addEventListener('cancel', e => { e.preventDefault(); closeDialog(); }); dialog.showModal(); decorateTables(dialog); U.design?.resizePrompts(); return dialog;
  }
  function ask(title, body, submitLabel, callback, cls = '') {
    const d = openDialog(title, '<form id="dialog-form">' + body + '</form>', button('取消', 'close', {}, 'btn-quiet') + '<button type="submit" form="dialog-form" class="btn btn-primary">' + submitLabel + '</button>', cls);
    d.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault(); const form = event.target;
      try { const values = Object.fromEntries(new FormData(form)); const keep = await callback(values, form); if (keep !== false) closeDialog(); } catch (e) { toast(e.message, true); }
    }); return d;
  }
  function reasonDialog(title, description, action, payload, label = '确认') {
    return ask(title, notice(description, 'info') + (U.design ? U.design.reviewIdentity(action, payload) : '') + '<div class="mt">' + field('reason', '审核意见 / 操作理由', '<textarea id="reason" name="reason" rows="4" required placeholder="说明判断依据、证据口径及处理意见"></textarea>') + '</div>', label, values => { E.dispatch({ ...payload, type: action, reason: values.reason }); toast('已保存本地演示操作。'); });
  }
  function download(filename, text, mime = 'text/plain;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([text], { type: mime })); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1200);
  }
  async function copy(text, label = '已复制') {
    try { await navigator.clipboard.writeText(text); toast(label); }
    catch { openDialog('请手动复制', notice('浏览器未允许访问剪贴板。下方文本可全选复制。', 'info') + '<textarea class="mt" rows="5" readonly>' + escape(text) + '</textarea>', button('关闭', 'close')); }
  }
  function markdown(text, graph = E.state()) {
    const escaped = escape(text);
    return '<div class="markdown">' + escaped.split(/\n\n+/).map(part => {
      let html = part.replace(/［(FV-[A-Z0-9-]+-v\d+)］/g, (_, id) => (() => { const f = E.byId(graph.facts || [], id), stale = !f || !E.effective(graph, f); return '<button class="citation' + (stale ? ' citation-stale' : '') + '" title="' + (stale ? '此引用未生效或已被替代，请同时核对正文数值和口径' : '查看有效事实与原始证据') + '" data-action="factEvidence" data-payload="' + escape(JSON.stringify({ id })) + '">' + escape(id) + (stale ? ' · 待复核' : '') + '</button>'; })());
      if (/^### /.test(html)) return '<h3>' + html.slice(4) + '</h3>';
      if (/^## /.test(html)) return '<h2>' + html.slice(3) + '</h2>';
      if (/^# /.test(html)) return '<h1>' + html.slice(2) + '</h1>';
      if (/^&gt; /.test(html)) return '<blockquote>' + html.slice(5) + '</blockquote>';
      if (html === '---') return '<div class="hr"></div>';
      return '<p' + (html.includes('citation-stale') ? ' class="stale-passage"' : '') + '>' + html.replace(/\n/g, '<br>') + '</p>';
    }).join('') + '</div>';
  }
  function documentPreview(file, locator, compact = false) {
    if (!file) return empty('未选择证据文件', '选择一个事实或原始定位后，可在此回看。');
    return '<div class="document' + (compact ? ' compact' : '') + '"><div class="document-head"><span>' + escape(file.type) + ' · 内容预览示意</span><span>v' + escape(file.version) + '</span></div><h3>' + escape(file.section || file.name) + '</h3>' +
      (file.rows && compact && locator ? U.design.evidenceRow(file, locator) : file.rows ? '<div class="table-scroll"><table><thead><tr>' + file.columns.map(c => '<th>' + escape(c) + '</th>').join('') + '</tr></thead><tbody>' + file.rows.map((row, i) => '<tr class="' + (locator && locator.row === i ? 'highlight' : '') + '">' + row.map(v => '<td>' + escape(v) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' : (file.paragraphs || []).map((p, i) => '<p' + (locator && (i === 1 || i === 2) ? ' class="diff-new"' : '') + '>' + escape(p) + '</p>').join('')) +
      (locator ? '<blockquote><strong>' + escape(locator.position) + '</strong><br>' + escape(locator.quote) + '</blockquote>' : '') + '<div class="document-footer">虚构演示内容 · 不是客户原附件，也不是 PDF / Office 解析结果</div></div>';
  }
  function selection(type, fallback) {
    const p = new URLSearchParams(location.hash.slice(1)); const g = E.state();
    if (p.get('objectType') === type && p.has('object')) { try { E.resolveObject(g, type, p.get('object')); return p.get('object'); } catch { return fallback; } }
    return fallback;
  }
  function setCurrent(type, id) { current = { type, id }; }
  function advancedFilters() {
    const g = E.state(), f = E.filters();
    const lists = [
      ['period', '报告期', [['', '全部报告期'], [g.project.period, g.project.period]]],
      ['batch', '收资批次', [['', '全部批次'], ...E.unique(g.files.map(f => f.batch)).map(x => [x, x])]],
      ['department', '责任部门', [['', '全部部门'], ...E.unique(g.files.map(f => f.department)).map(x => [x, x])]],
      ['family', '文件 Family', [['', '全部 Family'], ['unassigned', '未归组'], ...g.families.map(x => [x.id, x.title])]],
      ['fileType', '文件类型', [['', '全部类型'], ...E.unique(g.files.map(f => f.type)).map(x => [x, x])]],
      ['sourceStatus', '来源状态', [['', '全部来源'], ...['authoritative', 'supporting', 'superseded', 'family_assigned'].map(x => [x, D.labels[x]])]],
      ['parseStatus', '解析状态', [['', '全部解析状态'], ...['registered', 'parsed', 'error'].map(x => [x, D.labels[x]])]],
      ['coverage', '覆盖状态', [['', '全部覆盖状态'], ...['covered', 'partial', 'missing', 'conflict', 'needs_review', 'not_applicable'].map(x => [x, D.labels[x]])]],
    ];
    ask('共享搜索条件', notice('文件视图与覆盖视图共用这些条件，切换页面不会丢失。', 'info') + '<div class="split mt">' + lists.map(([name, label, options]) => field(name, label, selectInput(name, options, f[name] || ''))).join('') + '</div>', '应用筛选', values => { E.setFilters({ ...f, ...values }); }, 'wide');
  }
  function filterFiles(g) {
    const f = E.filters(); const q = String(f.q || '').toLowerCase();
    return g.files.filter(file => {
      const factIds = g.facts.filter(fa => fa.locatorIds.some(id => E.byId(g.locators, id)?.fileId === file.id)).map(fa => fa.id);
      const checks = g.mappings.filter(m => !m.removed && m.factIds.some(id => factIds.includes(id))).map(m => E.byId(g.checks, m.checkId)).filter(Boolean);
      const haystack = [file.name, file.family, file.department, file.section, ...checks.flatMap(c => [c.title, c.id]), ...g.facts.filter(fa => factIds.includes(fa.id)).map(fa => fa.summary)].join(' ').toLowerCase();
      return (!q || haystack.includes(q)) && (!f.period || f.period === g.project.period) && (!f.batch || file.batch === f.batch) && (!f.department || file.department === f.department) && (!f.family || (f.family === 'unassigned' ? !file.family : file.family === f.family)) && (!f.fileType || file.type === f.fileType) && (!f.sourceStatus || file.status === f.sourceStatus) && (!f.parseStatus || (f.parseStatus === 'parsed' ? !['registered', 'error'].includes(file.status) : file.status === f.parseStatus)) && (!f.coverage || checks.some(c => E.coverage(g, c.id) === f.coverage));
    });
  }
  function filterChecks(g) {
    const f = E.filters(); const q = String(f.q || '').toLowerCase(); const eligibleFiles = filterFiles(g).map(x => x.id);
    const hasFileFilter = ['batch', 'department', 'family', 'fileType', 'sourceStatus', 'parseStatus'].some(k => f[k]);
    return g.checks.filter(c => { const links = E.linksFor(g, c.id); const haystack = [c.title, c.id, c.topic, c.summary, ...links.files.map(f => f.name), ...links.facts.map(f => f.summary)].join(' ').toLowerCase(); return (!q || haystack.includes(q)) && (!f.period || f.period === g.project.period) && (!f.coverage || E.coverage(g, c.id) === f.coverage) && (!hasFileFilter || links.files.some(file => eligibleFiles.includes(file.id))); });
  }
  function searchbar(placeholder = '搜索检查项、文件或事实…') {
    const f = E.filters(); const n = Object.values(f).filter(Boolean).length;
    return '<div class="filterbar"><label class="search">' + icon('search') + '<span class="sr-only">搜索</span><input data-search value="' + escape(f.q || '') + '" placeholder="' + escape(placeholder) + '"></label><div class="actions">' + (n ? button('清除条件', 'clearFilters', {}, 'btn-quiet') : '') + button(icon('filter') + '筛选' + (n ? ' <span class="count">' + n + '</span>' : ''), 'filters') + '</div></div>';
  }
  function modelButton(label, actionType, targetType, ids, operation) {
    return button(icon('spark') + label, 'model', { label, actionType, targetType, ids: ids || [current.id], operation, page: pageKey }, 'btn-ai', E.meta().readonly || (ids ? !ids.length : !current.id));
  }
  function toolbar(g) {
    if (window.ESGSupport.pages.some(p => p.key === pageKey) && U.support) return U.support.objectBar();
    let object; try { object = E.resolveObject(g, current.type, current.id); } catch { current = { type: 'project', id: g.project.id }; object = g.project; }
    const hash = object.contentHash || object.hash || E.fingerprint(object);
    return '<div class="object-bar"><div class="object-path"><span class="meta">' + escape(current.id) + ' · ' + (object.version ? 'v' + object.version + ' · ' : '') + escape(hash) + ' · 工作区路径示意</span><code class="mono" title="' + escape(object.path) + '">' + escape(object.path) + '</code></div><div class="actions">' + button(icon('external') + '打开文件', 'openFile') + button(icon('copy') + '复制路径', 'copyPath') + button(icon('spark') + '生成上下文', 'context') + button(icon('history') + '查看 Diff', 'diff') + '</div></div>';
  }
  function shell(content) {
    if (pageKey === 'index' && U.portfolio) return U.portfolio.shell(content);
    const g = E.state(), meta = E.meta(), s = E.stats(g), scene = D.scenes.find(x => x.id === g.scene);
    return '<a class="skip-link" href="#main-content">跳到主要内容</a><aside class="rail"><a class="brand" href="index.html" aria-label="OpenESG 报告项目"><span class="brand-mark">O</span><span class="brand-name">OpenESG<small>LOCAL WORKSPACE</small></span></a><a class="workspace-back" href="index.html" aria-label="返回报告项目列表">' + icon('back') + '<span>报告项目</span></a><div class="rail-project"><strong>' + escape(g.project.name) + '</strong><span>' + escape(g.project.period) + ' 年度 · 虚构项目</span>' + button(icon('layers') + '<span>切换项目</span>', 'portfolioSwitch', {}, 'project-switch-button') + '</div><div class="nav-label">报告工作流</div><nav aria-label="主要页面">' + [...D.pages, ...window.ESGSupport.pages].map((p, i) => (i === 10 ? '<div class="nav-divider"></div><div class="nav-label support-nav-label">项目支撑</div>' : '') + (i === 1 || i === 6 ? '<div class="nav-divider"></div>' : '') + '<a title="' + p.id + ' · ' + p.label + '" class="nav-item ' + (pageKey === p.key ? 'active' : '') + '" ' + (pageKey === p.key ? 'aria-current="page" ' : '') + 'href="' + escape(E.url(p.key, 'project', g.project.id)) + '">' + icon(p.icon || icons[i]) + '<span class="nav-text">' + p.label + '</span><span class="nav-number">' + p.id.slice(1) + '</span></a>').join('') + '</nav><div class="rail-bottom"><i class="local-light"></i><span>本地演示 · 无外部连接</span></div></aside><div class="app"><header class="topbar"><div class="breadcrumbs"><a href="index.html">报告项目</a><span>/</span>' + button(escape(g.project.name) + icon('down'), 'portfolioSwitch', {}, 'crumb-project') + '<span>/</span><span>' + (page?.label || '原型导航') + '</span></div><div class="top-actions">' + button(icon('layers') + '<span>演示场景</span>', 'scenes', {}, 'btn-quiet', meta.readonly) + button(icon('spark') + '模型动作 <span class="count">' + E.count(g.actions.filter(a => ['pending', 'running', 'review', 'failed'].includes(a.status))) + '</span>', 'tasks', {}, 'btn-quiet') + '<span class="avatar">林</span><span class="user-label">林悦 · ESG 撰写人</span></div></header><div class="demo-strip"><span>虚构演示数据 <span class="scope-extra">· 不代表客户实际情况或监管结论</span></span><span>' + (meta.archived ? '项目已归档 · 只读' : meta.readonly ? '固定快照 · 只读' : escape(g.initialization && !g.files.length ? '新项目 · 初始化中' : scene?.name || g.scene)) + ' · ' + (meta.archived ? '<a href="index.html">返回列表恢复</a>' : meta.readonly ? '<button data-action="currentVersion">返回当前工作版本</button>' : '<button data-action="reset">重置演示</button>') + '</span></div><main id="main-content" class="main" tabindex="-1">' + (meta.stale ? notice('另一页面已更新状态，当前编辑基线已过期。请保存文本副本后重新加载。' + button('重新加载', 'currentVersion'), 'danger') : '') + content + toolbar(g) + '</main></div>';
  }
  function heading(eyebrow, title, description, actions = '') { return '<div class="page-heading"><div><div class="eyebrow">' + eyebrow + '</div><h1>' + title + '</h1><p>' + description + '</p></div><div class="heading-actions">' + actions + '</div></div>'; }
  function render() {
    const g = E.state(), meta = E.meta(), p = new URLSearchParams(location.hash.slice(1));
    const renderKey = [meta.runId, pageKey, p.get('object'), p.get('mode'), p.get('snapshot')].join(':');
    const preserved = renderKey === lastRenderKey ? [...document.querySelectorAll('#app [data-preserve][data-dirty="true"]')].map(el => ({ id: el.id, value: el.value, dirty: el.dataset.dirty, start: el.selectionStart, end: el.selectionEnd, focused: document.activeElement === el })) : [];
    if (meta.error && pageKey !== 'index') document.getElementById('app').innerHTML = '<div class="error-page"><div class="eyebrow">OPENESG · 本地演示</div><h1>无法恢复当前工作区</h1>' + notice(escape(meta.error), 'danger') + '<div class="actions mt">' + '<a class="btn" href="index.html">返回报告项目列表</a>' + button('重置此项目演示数据', 'reset') + button('导入演示快照', 'importSnapshot') + '</div><p class="meta mt">不会清除其他网站或本地项目的数据。</p></div>';
    else {
      const view = pageKey === 'index' ? U.portfolio?.view : window.ESGViews?.[pageKey];
      const content = view ? view(g, U) : heading('PROTOTYPE INDEX', 'OpenESG 工作台原型', '同一项目、同一证据链，十个独立 HTML 工作视图。') + '<div class="index-grid">' + D.pages.map((p, i) => '<a class="index-card" href="' + p.file + '"><div class="between"><span class="eyebrow">' + p.id + ' / ' + p.stage + '</span>' + icon(icons[i]) + '</div><h2>' + p.title + '</h2><p>' + ['项目进度、待办与阻断原因', '披露要求、原始条款与版本审核', '文件内容、证据定位与双向索引', '文件版本比较与权威来源裁定', '核对事实变化，保留有效与历史版本', '检查项、有效事实与原始证据的对应关系', '章节顺序、稳定要点与参考写法', '逐要点编辑、引用、Diff 与审核锁定', '八项预检、连续预览与确定性合成', '冻结版本、构建清单与示例交付'][i] + '</p><span class="small success-text">打开工作视图 →</span></a>').join('') + '</div>';
      document.getElementById('app').innerHTML = shell(content);
      decorateTables(document.getElementById('app'));
      if (window.ESGSupport.pages.some(p => p.key === pageKey)) { const nav=document.querySelector('.rail nav'), active=nav?.querySelector('a.active'); if(active) nav.scrollTop=Math.max(0,active.offsetTop-nav.offsetTop-nav.clientHeight/2+24); }
      U.design?.resizePrompts();
      preserved.forEach(item => { const el = document.getElementById(item.id); if (el) { el.value = item.value; if (item.dirty) el.dataset.dirty = item.dirty; if (item.focused) { el.focus({ preventScroll: true }); if (typeof el.setSelectionRange === 'function') el.setSelectionRange(item.start, item.end); } } });
    }
    lastRenderKey = renderKey;
    if (dialog?.dataset.kind === 'tasks') refreshTasks();
  }
  function taskOutput(task, graph) {
    if (!task.output) return notice('任务尚未产生输出。状态将自动推进，刷新后可继续。', 'info');
    if (task.target_type === 'unit' && task.action_type === 'validate' && task.operation !== 'consistency') {
      return '<h3 class="mt">逐条披露检验输出 · 模拟</h3><div class="validation-output-contract">' + notice('当前为通用分析占位；正式实现按“检验结果样例”格式逐条输出：本条要求、结论、依据与定位、修改建议。下方文字不是逐条检验结论。', 'info') + button('查看检验结果格式', 'validationDesign', { id: task.target_object_ids[0], taskId: task.id }, 'btn-small') + '</div><pre class="code-block mt">' + escape(task.output) + '</pre>';
    }
    const pack = E.byId(graph.contextPacks, task.context_pack_id);
    const selected = pack?.input_snapshot?.selected || [];
    const before = selected.map(o => o.body || ((o.title || o.name || o.id) + '\n' + (o.summary || o.text || JSON.stringify(o.rows || o.paragraphs || o, null, 2)))).join('\n\n---\n\n');
    const after = task.frozenUnits?.length && ['draft', 'rewrite', 'merge'].includes(task.action_type) ? task.frozenUnits.map(u => u.body).join('\n\n---\n\n') : task.output;
    return '<h3 class="mt">建议 / Diff 输出</h3><p class="meta">固定输入与建议的变更块；应用后仍需业务审核。输入 ' + escape(task.inputHash) + ' · 输出 ' + escape(task.outputHash) + '</p>' + U.design.difference(before, after);
  }
  function refreshTasks() {
    if (!dialog) return;
    const g = E.state(), task = E.byId(g.actions, selectedTask) || g.actions[0]; if (task) selectedTask = task.id;
    dialog.querySelector('.dialog-body').innerHTML = (g.actions.length ? '<div class="meta mb">任务状态来自共享对象图 · 所有执行均为模拟</div>' + g.actions.map(a => '<button class="task-item ' + (a.id === selectedTask ? 'active' : '') + '" data-action="taskSelect" data-payload="' + escape(JSON.stringify({ id: a.id })) + '"><span><strong class="small">' + escape(a.label) + '</strong><span class="meta break" style="display:block">' + escape(a.id) + '</span></span>' + badge(a.status) + '</button>').join('') : empty('尚无模型动作', '从选定对象的模型按钮发起任务；不会自动处理整个项目。')) + (task ? '<div class="task-detail"><div class="between"><h3>' + escape(task.label) + '</h3>' + badge(task.status) + '</div><div class="task-states">' + ['pending', 'running', 'review', 'applied', 'rejected', 'failed'].map(s => '<span class="' + (s === task.status ? 'active' : '') + '">' + s + '</span>').join('') + '</div><dl class="small"><dt class="meta">操作范围</dt><dd class="break">' + task.target_object_ids.map(escape).join(' / ') + '</dd><dt class="meta">固定上下文</dt><dd class="mono break">' + escape(task.context_pack_id) + '</dd><dt class="meta">允许派生的路径</dt><dd class="mono break">' + task.target_file_paths.map(escape).join('<br>') + '</dd><dt class="meta">指令</dt><dd>' + escape(task.instruction) + '</dd><dt class="meta">模型 / 尝试</dt><dd>' + escape(task.model_config_snapshot?.model || 'demo-reviewer') + ' · 第 ' + task.attempt + ' 次（模拟）</dd></dl>' + (task.error ? notice(escape(task.error), 'danger') : '') + taskOutput(task, g) + '<div class="actions mt">' + button('查看 ContextPack', 'taskContext', { id: task.id }) + (task.status === 'review' ? button('拒绝建议', 'modelReject', { id: task.id }, 'btn-quiet', E.meta().readonly) + button('应用为新版本 / 保留建议', 'modelApply', { id: task.id }, 'btn-primary', E.meta().readonly) : '') + (task.status === 'failed' ? button('重试此任务', 'modelRetry', { id: task.id }, 'btn-primary', E.meta().readonly) : '') + '</div><p class="meta mt">应用模型建议不等于业务审核通过。旧版本、输入快照与失败记录都会保留。</p><details><summary class="small">执行历史</summary><pre class="code-block mt">' + escape(JSON.stringify(task.history, null, 2)) + '</pre></details></div>' : '');
  }
  handlers.close = closeDialog;
  handlers.select = p => E.select(p.type, p.id, { mapping: p.mapping, locator: p.locator });
  handlers.currentVersion = () => E.currentVersion();
  handlers.filters = advancedFilters;
  handlers.clearFilters = () => E.setFilters({});
  handlers.reset = () => reasonlessReset(E.meta().sceneId);
  function reasonlessReset(scene) { ask('重置演示运行', notice('将清除本次演示改动、未完成任务和本地派生快照。预置历史报告会恢复；只重置当前报告项目，不会影响其他项目或网站数据。', 'warning') + '<p class="small mt">目标场景：' + escape(D.scenes.find(s => s.id === scene)?.name || scene) + '</p>', '确认重置', () => { E.reset(scene); toast('已恢复场景基线。'); }); }
  handlers.scenes = () => ask('切换演示场景', field('scene', '场景即预置状态快照', selectInput('scene', D.scenes.map(s => [s.id, s.name]), E.meta().sceneId)) + notice('切换会重置当前演示运行。需要保留当前状态时，请先关闭此框并导出快照。', 'warning') + '<div class="actions mt">' + button(icon('download') + '导出当前快照', 'exportSnapshot') + button(icon('upload') + '导入快照', 'importSnapshot') + '</div>', '重置并切换', values => { E.reset(values.scene); toast('已载入选定场景。'); });
  handlers.copyPath = () => copy(E.resolveObject(E.state(), current.type, current.id).path, '已复制演示工作区路径。');
  handlers.openFile = payload => {
    const g = E.state(), type = payload.type || current.type, id = payload.id || current.id, object = E.resolveObject(g, type, id);
    let body;
    if (type === 'file') body = documentPreview(object, E.byId(g.locators, payload.locator || new URLSearchParams(location.hash.slice(1)).get('locator')));
    else if (type === 'unit') body = '<pre class="code-block">' + escape(object.body) + '</pre>';
    else if (type === 'fact') { const l = E.byId(g.locators, object.locatorIds[0]); body = documentPreview(E.byId(g.files, l.fileId), l); }
    else if (type === 'check') body = '<div class="document"><div class="document-head">虚构监管条款阅读副本 · 第 ' + object.sourcePage + ' 页（示意）</div><h3>' + escape(object.title) + '</h3><p>' + escape(object.sourceText) + '</p><blockquote>不是官方监管原文，不构成适用性结论。</blockquote></div>';
    else if (type === 'reference' || type === 'regulation') body = '<div class="document"><h3>' + escape(object.title) + '</h3><p>' + escape(object.text) + '</p></div>';
    else body = '<pre class="code-block">' + escape(JSON.stringify(type === 'build' ? object.manifest : object, null, 2)) + '</pre>';
    openDialog('文件与证据预览', '<p class="mono break">' + escape(object.path) + '</p>' + body + '<p class="meta mt">路径为虚构工作区示意；当前打开的是原型中的示例内容。</p>', button('关闭', 'close'), 'drawer');
  };
  handlers.factEvidence = p => handlers.openFile({ type: 'fact', id: p.id });
  handlers.evidence = p => handlers.openFile({ type: 'file', id: p.file, locator: p.locator });
  handlers.context = p => {
    const type = p.type || current.type, ids = p.ids || [current.id]; const pack = E.contextPack(E.state(), type, ids, pageKey, p.selection);
    const d = openDialog('生成受限上下文', notice('只包含明确选中的对象及其引用。未发送给真实模型或外部工具。', 'info') + '<div class="chips mt mb"><span class="badge">' + ids.length + ' 个选中对象</span><span class="badge">' + pack.readable_file_paths.length + ' 个允许读取路径</span></div><pre class="code-block">' + escape(JSON.stringify(pack, null, 2)) + '</pre>', button('复制上下文', 'copyContext') + button('下载 ContextPack', 'downloadContext', {}, 'btn-primary'), 'wide');
    d._contextPack = pack;
  };
  handlers.copyContext = () => copy(JSON.stringify(dialog._contextPack, null, 2), '已复制虚构 ContextPack。');
  handlers.downloadContext = () => download('context-pack-demo.json', JSON.stringify(dialog._contextPack, null, 2), 'application/json');
  handlers.share = p => {
    const params = new URLSearchParams(location.hash.slice(1)); const result = E.snapshotLink(current.type, current.id, { mapping: p.mapping || params.get('mapping'), locator: p.locator || params.get('locator') });
    const d = openDialog('复制版本深链接', notice('链接打开固定快照，不改变当前工作状态。跨浏览器分享本地快照时，请一并发送下方 JSON。', 'info') + '<label class="form-field mt"><span>项目 / 对象 / 定位 / 版本</span><textarea rows="5" readonly>' + escape(result.link) + '</textarea></label>', button('下载配套快照', 'exportSharedSnapshot') + button('复制链接', 'copySharedLink', {}, 'btn-primary'));
    d._share = result;
  };
  handlers.copySharedLink = () => copy(dialog._share.link, '已复制固定版本深链接。');
  handlers.exportSharedSnapshot = () => download(dialog._share.snapshot.id + '.json', JSON.stringify(dialog._share.snapshot, null, 2), 'application/json');
  handlers.exportSnapshot = () => { const snap = E.createSnapshot(); download(snap.id + '.json', JSON.stringify(snap, null, 2), 'application/json'); toast('已导出虚构演示快照。'); };
  handlers.importSnapshot = () => {
    ask('导入演示快照', notice('仅接受由本版本原型导出的虚构 JSON，导入后只读打开，不替换当前工作运行。', 'info') + field('snapshot', '选择快照文件', '<input id="snapshot" name="snapshot" type="file" accept="application/json,.json" required>'), '验证并打开', async (_, form) => { const file = form.elements.snapshot.files[0]; E.need(file, '请选择快照 JSON。'); E.importSnapshot(await file.text()); toast('已在只读模式打开快照。'); });
  };
  handlers.diff = p => {
    const g = E.state(), type = p.type || current.type, id = p.id || current.id, object = E.resolveObject(g, type, id);
    let old, next = object.body || object.text || object.summary || JSON.stringify(object, null, 2);
    if (type === 'fact') { const prev = g.facts.filter(f => f.factId === object.factId && f.version < object.version).sort((a, b) => b.version - a.version)[0]; if (prev) { old = prev.displayValue + ' ' + prev.unit + '\n' + prev.id; next = object.displayValue + ' ' + object.unit + '\n' + object.id; } }
    else if (type === 'file') { const prev = g.files.filter(f => f.family === object.family && f.type === object.type && f.version < object.version).sort((a, b) => b.version - a.version)[0]; if (prev) { old = JSON.stringify(prev.rows || prev.paragraphs, null, 2); next = JSON.stringify(object.rows || object.paragraphs, null, 2); } }
    else if (type === 'family') { const sets = g.sourceSets.filter(s => s.family === object.id).sort((a, b) => a.version - b.version); if (sets.length > 1) { old = JSON.stringify(sets[0], null, 2); next = JSON.stringify(sets[sets.length - 1], null, 2); } }
    else if (type === 'check') { const prev = g.checklist.history.at(-1)?.checks?.find(c => c.id === id); if (prev) old = prev.summary; }
    else if (object.externalBody) { old = object.body; next = object.externalBody; }
    else if (object.history?.length) { const previous = object.history.at(-1); old = previous.body || JSON.stringify(previous, null, 2); }
    const body = old === undefined ? empty('没有可比较的前一版本', '当前对象尚未产生历史差异。新建议或新版本出现后，可在此比较。') : U.design.difference(old, next);
    openDialog('版本差异 · ' + escape(id), body, button('关闭', 'close'), 'wide');
  };
  handlers.model = p => {
    const ids = p.ids || [current.id], g = E.state();
    const textarea = document.getElementById('unit-body'); const selection = textarea && textarea.selectionStart !== textarea.selectionEnd ? textarea.value.slice(textarea.selectionStart, textarea.selectionEnd) : '';
    E.need(!E.meta().readonly, '只读项目或固定快照不能执行模型动作。');
    E.need(!document.querySelector('#app [data-dirty="true"]'), '请先保存当前草稿，再基于固定版本生成模型建议。');
    E.need(p.operation !== 'rewriteSelection' || selection, '请先在正文中选中需要改写的文字。');
    E.need(p.operation !== 'merge' || ids.length > 1, '合并至少需要选择两个检查项。');
    const names = ids.map(id => E.resolveObject(g, p.targetType, id).title || E.resolveObject(g, p.targetType, id).name || id);
    ask(p.label + ' · 模拟模型动作', notice('作用范围：' + names.map(escape).join('；') + (selection ? '。仅处理当前选中文字。' : '') + '。输出先进入待确认，不自动批准业务对象。', 'info') + '<div class="mt">' + field('instruction', '本次指令 · 临时调整，不回写长期配置', '<textarea id="instruction" name="instruction" rows="4" required>' + escape(p.targetType === 'unit' && ids.length === 1 && U.design ? U.design.instruction(g, E.byId(g.units, ids[0]), p.actionType === 'validate' ? 'validation' : 'writing') + (p.operation === 'consistency' ? '\n\n本次重点：术语、叙述与数据口径的一致性；不把此结果当作完整的逐条披露检验。' : '') : p.label + '，保留原始来源和版本，仅使用已确认事实。') + '</textarea>') + '</div><label class="check-option"><input type="checkbox" name="fail"><span>本次模拟服务失败，检查恢复入口</span></label>', '生成建议', values => { E.dispatch({ type: 'startModel', ...p, ids, selection, instruction: values.instruction, fail: !!values.fail }); closeDialog(); handlers.tasks({ id: E.state().actions[0].id }); return false; });
  };
  handlers.tasks = (p = {}) => { selectedTask = p.id || selectedTask; const d = openDialog('模型动作中心', '', button('关闭', 'close'), 'drawer'); d.dataset.kind = 'tasks'; refreshTasks(); };
  handlers.taskSelect = p => { selectedTask = p.id; refreshTasks(); };
  handlers.taskContext = p => { const m = E.byId(E.state().actions, p.id), pack = E.byId(E.state().contextPacks, m.context_pack_id); if (!pack) throw new Error('此任务上下文缺失，不能声称可追溯。'); const d = openDialog('任务输入 ContextPack', '<pre class="code-block">' + escape(JSON.stringify(pack, null, 2)) + '</pre>', button('返回模型动作', 'tasks', { id: m.id })); d._contextPack = pack; };
  handlers.modelApply = p => { E.need(!document.querySelector('#app [data-dirty="true"]'), '当前正文有未保存修改。请先保存，重新核对建议版本后再应用。'); E.dispatch({ type: 'applyModel', id: p.id }); toast('建议已应用；业务审核需单独完成。'); };
  handlers.modelReject = p => { E.dispatch({ type: 'rejectModel', id: p.id }); toast('已拒绝建议，原业务数据未被覆盖。'); };
  handlers.modelRetry = p => { E.dispatch({ type: 'retryModel', id: p.id }); toast('已从此模型节点重试。'); };
  handlers.audit = p => {
    const g = E.state(), rows = p.id ? g.audit.filter(a => a.objectId === p.id) : g.audit;
    openDialog('审核与运行记录', rows.length ? rows.map(a => '<div class="audit-line"><span class="timeline-dot"></span><div><strong>' + escape(a.title) + '</strong><div class="meta">' + escape(a.time + ' · ' + a.actor + (a.role ? ' · ' + a.role : ' · 历史角色未记录')) + (a.submittedBy ? '<div class="meta">提交 / 编制：' + escape(a.submittedBy) + '</div>' : '') + '</div><p class="small">' + escape(a.reason) + '</p><div class="mono break">' + escape(a.node + ' · ' + a.runId + ' · ' + a.inputHash) + '</div></div></div>').join('') : empty('当前对象没有新增审核记录'), button('关闭', 'close'), 'drawer');
  };
  document.addEventListener('click', async event => {
    const target = event.target.closest('[data-action]'); if (!target || target.disabled) return;
    const action = target.dataset.action, payload = JSON.parse(target.dataset.payload || '{}');
    try { if (handlers[action]) await handlers[action](payload, target, event); else throw new Error('尚未连接的操作：' + action); } catch (e) { toast(e.message, true); }
  });
  document.addEventListener('change', event => { if (event.target.matches('[data-search]')) E.setFilters({ ...E.filters(), q: event.target.value }); });
  document.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.matches('[data-search]')) { event.preventDefault(); E.setFilters({ ...E.filters(), q: event.target.value }); } });
  document.addEventListener('input', event => { if (event.target.matches('[data-preserve]')) event.target.dataset.dirty = 'true'; });
  window.addEventListener('esg:change', render);
  Object.assign(U, { toast, closeDialog, openDialog, ask, reasonDialog, download, copy, markdown, documentPreview, selection, setCurrent, filterFiles, filterChecks, searchbar, modelButton, heading, render });
  document.addEventListener('DOMContentLoaded', render);
})();
