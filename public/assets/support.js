/* Support views and explicitly named local design states; no backend, file bridge or model API. */
(function () {
  'use strict';
  const E=window.ESG, U=window.ESGUI, S=window.ESGSupport, P=window.ESGProjects, V=window.ESGViews;
  const {escape:h,button:b,link,panel,notice,heading,field,selectInput:select,icon,badge}=U;
  const ro=()=>E.meta().readonly, st=()=>S.state(E.state()), ps=U.pageState;
  const go=(page,label,cls='btn',type='project',id=E.state().project.id)=>link(page,type,id,label,{},cls);
  const change=(op,payload={})=>{E.dispatch({type:'supportDesign',op,payload});U.toast('已保存当前项目的本地设计样例。');};
  const input=(id,value,attrs='')=>'<input data-preserve id="'+id+'" name="'+id+'" value="'+h(value)+'" '+attrs+'>';
  const textarea=(id,value,rows=4)=>'<textarea data-preserve id="'+id+'" name="'+id+'" rows="'+rows+'">'+h(value)+'</textarea>';
  const dl=rows=>'<dl class="support-detail-list">'+rows.map(([a,z])=>'<dt>'+h(a)+'</dt><dd>'+h(z)+'</dd>').join('')+'</dl>';
  const tag=(label,tone='')=>'<span class="badge '+tone+'">'+h(label)+'</span>';
  const status=r=>st().ruleOverrides[r.id] || r.status;
  let currentObject=null;
  function identify(g,id,title,path,body) { U.setCurrent('project',g.project.id); currentObject={id,title,path:g.project.root+'/'+path,body,hash:E.fingerprint(body)}; }
  function supportBar() {
    if(!currentObject) return '';
    return '<div class="object-bar"><div class="object-path"><span class="meta">'+h(currentObject.id)+' · '+h(currentObject.hash)+' · 路径示意</span><code class="mono">'+h(currentObject.path)+'</code></div><div class="actions">'+b(icon('external')+'打开文件','supportObject',{op:'open'})+b(icon('copy')+'复制路径','supportObject',{op:'copy'})+b(icon('spark')+'生成上下文','supportObject',{op:'context'})+b(icon('history')+'查看 Diff','supportObject',{op:'diff'})+'</div></div>';
  }
  U.support={objectBar:supportBar};
  U.handlers.supportObject=p=>{
    const o=currentObject; if(!o) return;
    if(p.op==='copy') return U.copy(o.path,'已复制示意路径。');
    const before=p.op==='diff'?U.design.difference('预置基线 · 不覆盖实体文件',JSON.stringify(o.body,null,2)): '<pre class="code-block support-object-code">'+h(JSON.stringify(p.op==='context'?{demonstration:true,project:E.state().project.id,selectedObject:o.id,allowedPaths:[o.path],inputHash:o.hash,content:o.body}:o.body,null,2))+'</pre>';
    U.openDialog(p.op==='context'?'受限上下文 · 支撑对象':p.op==='diff'?'支撑对象 Diff · 设计示意':o.title,notice('只展示当前选中的虚构对象。路径不连接本地磁盘，未发送给任何模型。','info')+before,b('关闭','close'),'wide');
  };
  U.handlers.supportShare=()=>{
    const params=new URLSearchParams(location.hash.slice(1)),extra={};
    ['source','reference','node'].forEach(key=>{if(params.has(key))extra[key]=params.get(key);});
    const result=E.snapshotLink('project',E.state().project.id,extra);
    const dialog=U.openDialog('复制支撑视图版本深链接',notice('链接保留项目、选中来源 / 参考 / 节点和固定版本。跨浏览器分享还需配套 JSON 快照。','info')+'<textarea class="mt" rows="5" readonly>'+h(result.link)+'</textarea>',b('下载配套快照','exportSharedSnapshot')+b('复制链接','copySharedLink',{},'btn-primary'));dialog._share=result;
  };
  U.handlers.supportPick=p=>{ps[p.key]=p.value; const hash=new URLSearchParams(location.hash.slice(1));hash.set(p.key,p.value);history.replaceState(null,'','#'+hash);U.render();};
  const picked=(key,fallback)=>ps[key] || new URLSearchParams(location.hash.slice(1)).get(key) || fallback;
  function subnav(items) {return '<div class="support-subnav">'+items.map(([page,label])=>go(page,label)).join('')+'</div>';}

  function roles() {
    const rows=[['合规管理员','何宁','维护监管来源和清单发布','提示词随清单版本审核'],['收资管理员','许岚','资料归组与来源裁定','G2 · 来源审核'],['事实审核人','陈澄','事实口径与版本','事实生效审核'],['ESG 撰写人','林悦','框架、起草、修改与提交','不自审自批'],['报告审核人','周宁','正文锁定及报告最终批准','G5 / G6 · 两次独立审核'],['系统管理员','沈言','配置模型、存储、权限与运行参数','不能代替业务审核']];
    return panel('角色职责 · 演示名单','<p class="meta mb">顶栏仍为林悦 · ESG 撰写人。下列是应执行各操作的角色，不是自动切换登录身份。</p><div class="table-scroll"><table class="support-table"><thead><tr><th>角色 / 演示身份</th><th>负责事项</th><th>职责边界</th></tr></thead><tbody>'+rows.map(r=>'<tr><td><strong>'+h(r[0])+'</strong><div class="meta">'+h(r[1])+'（虚构）</div></td><td>'+h(r[2])+'</td><td>'+h(r[3])+'</td></tr>').join('')+'</tbody></table></div>'+b('查看无权操作状态','supportDenied',{},'btn-small'));
  }
  V.settings=g=>{
    const c=S.config(g),tab=ps.settingsTab || 'project'; identify(g,'PROJECT-CONFIG','项目配置','project.json',c);
    const fields=tab==='roles'?roles():tab==='environment'?panel('文件优先 · 服务可以离线','<div class="support-form-grid">'+field('root','本地工作目录（示意）',input('root',c.root,'required maxlength="160"'),'不会创建目录、读取磁盘或连接文件监听器。')+field('service','模型服务状态样例',select('service',[['available','模拟可用'],['unavailable','模拟不可用']],c.service))+field('model','模型配置',input('model','demo-reviewer · 本地模拟','readonly'))+'</div>'+notice(c.service==='unavailable'?'服务不可用。仍可浏览规则、证据、历史报告，并在 P08 人工编辑；模型入口显示失败与恢复说明。':'所有模型输出为预置演示内容；这里不输入 API Key 或服务器密码。',c.service==='unavailable'?'danger':'info')+'<div class="actions mt">'+go('writing','进入人工撰写')+go('runs','查看失败恢复')+'</div>'):panel('报告身份与采用范围','<div class="support-form-grid">'+field('company','公司 / 报告年度',input('company',g.project.name+' · '+g.project.period,'readonly'),'修改年度请另建报告；不改变当前项目身份。')+field('market','上市市场',select('market',[['香港','香港']],c.market))+field('industry','行业',select('industry',[['证券与金融服务','证券与金融服务'],['制造业','制造业'],['综合企业','综合企业']],c.industry))+field('language','交付语言',select('language',[['简体中文','简体中文'],['繁體中文','繁體中文'],['English','English'],['中英双语','中英双语']],c.language))+'<div class="support-span">'+field('scope','报告主体与合并范围',textarea('scope',c.scope,3),'范围变更需要复核事实适用性、提示词和正文，不自动修改已批准内容。')+'</div></div>'+dl([['报告期间',g.project.period+'-01-01 — '+g.project.period+'-12-31'],['披露框架',c.framework],['清单采用输入',st().ruleVersion || '尚未采用规则']])+go('regulatory','管理规则来源与版本 →','small'));
    const impact=panel('变更前先看影响','<p class="support-detail-text">配置草案与已采用版本分开。保存这里只更新设计样例，不静默重写正文、事实或冻结报告。</p><div class="support-impact-route"><div><h3>规则 / 范围</h3><span class="small">清单与事实适用性</span></div><div><h3>行业 / 语言</h3><span class="small">模板与撰写提示词</span></div><div><h3>模型服务</h3><span class="small">后续模型动作</span></div></div>'+go('runs','查看对象影响路径 →','small'))+panel('当前采用与演示草案',dl([['项目',g.project.id],['报告名称',g.project.reportTitle || g.project.period+' 年度 ESG 报告'],['已采用语言',g.project.language],['配置样例语言',c.language],['存储范围','仅本浏览器 · 此项目'],['配置权限','系统管理员']])+notice('林悦无配置发布权限。可查看或演示编辑，不代表授予真实权限。','info'));
    return heading('PROJECT SUPPORT / SETTINGS','项目配置与运行环境','确定这份报告的范围、采用版本与协作职责。',b('查看配置 Diff','supportObject',{op:'diff'})+go('overview','返回项目总览'))+'<div class="tabs support-tabs mb">'+[['project','项目与范围'],['environment','目录与模型'],['roles','角色职责']].map(([id,title])=>b(title,'settingsTab',{id},'tab '+(tab===id?'active':''))).join('')+'</div><div class="support-workspace"><div class="stack"><form id="support-settings-form">'+fields+(tab!=='roles'?'<div class="actions mt">'+b('预览变更影响','previewConfig',{},'btn-primary',ro())+b('无权发布状态','supportDenied')+'</div>':'')+'</form></div><aside class="stack support-inspector">'+impact+'</aside></div>';
  };
  U.handlers.settingsTab=p=>{ps.settingsTab=p.id;U.render();};
  U.handlers.supportDenied=()=>U.openDialog('此操作需要系统管理员',notice('当前登录演示身份：林悦 · ESG 撰写人。可查看配置，不能发布。','danger')+'<p class="support-detail-text mt">请由系统管理员沈言（虚构）核对变更范围并发布。审核门仍由各自审核角色执行。</p><button class="btn mt" disabled>发布配置 · 无权限</button>',b('关闭','close'));
  U.handlers.previewConfig=()=>{
    const form=document.getElementById('support-settings-form');if(!form.reportValidity())return;
    const c=S.config(E.state()), values={...c,...Object.fromEntries(new FormData(form))};delete values.company;
    U.ask('配置变更影响 · 静态样例',notice('保存设计草案，不发布配置，不重算事实或改写正文。','info')+U.design.difference(JSON.stringify(c,null,2),JSON.stringify(values,null,2))+dl([['清单检查项',E.state().checks.length+' 项，适用性需人工核对'],['撰写要点',E.state().units.length+' 项，不自动更新'],['冻结报告',E.state().builds.length+' 个，保持原样']]),'保存配置样例',()=>change('config',values),'wide');
  };

  V.regulatory=g=>{
    const filter=ps.ruleStatus || '',query=(ps.ruleSearch || '').toLowerCase();
    const rows=S.rules.filter(r=>(!filter || status(r)===filter)&&(!query || [r.title,r.id,r.role].join(' ').toLowerCase().includes(query)));
    const selected=rows.find(r=>r.id===picked('source','RULE-MAIN-v2')) || rows[0];
    identify(g,selected?.id || 'REGISTRY','合规来源登记','regulations/source-registry.json',selected || S.rules);
    const list=panel('来源目录','<div class="table-scroll"><table class="support-table"><thead><tr><th>规则 / 来源角色</th><th>版本 / 生效日</th><th>规范化状态</th></tr></thead><tbody>'+rows.map(r=>'<tr class="'+(selected?.id===r.id?'selected':'')+'"><td>'+b(h(r.title),'supportPick',{key:'source',value:r.id},'link-button')+'<span class="support-record-id">'+h(r.id)+'</span>'+tag(r.role)+'</td><td><strong>v'+r.version+'</strong><div class="meta">'+h(r.effective)+'</div></td><td>'+tag(S.labels[status(r)],status(r)==='failed'?'badge-failed':status(r)==='normalized'?'badge-approved':'')+'</td></tr>').join('')+'</tbody></table></div>'+(!rows.length?U.empty('没有匹配来源','调整来源状态或搜索条件。',b('清除筛选','clearRuleSearch')):'')+'<p class="meta mt">'+rows.length+' / '+S.rules.length+' 个虚构来源。主规则、FAQ 与附件分开登记。</p>');
    const detail=selected?panel('来源身份与版本','<span class="support-record-id">'+h(selected.id)+'</span><h2 class="support-detail-title">'+h(selected.title)+'</h2>'+tag(S.labels[status(selected)])+dl([['来源角色',selected.role],['发布日期',selected.published],['生效日期',selected.effective],['来源 URL',selected.url],['原文定位',selected.lines],['解析器',selected.parser],['内容指纹',selected.hash],['关联关系',selected.replaces?'替代 '+selected.replaces:selected.parent?'补充 '+selected.parent:'原采用版本']])+'<p class="meta">URL 为保留的 .example 虚构地址，不链接真实监管原文。</p><p class="support-detail-text mt">'+h(selected.note)+'</p><div class="actions mt">'+b('阅读规范化副本','readRule',{id:selected.id},'btn-small')+b('版本差异','ruleDiff',{id:selected.id},'btn-small')+(status(selected)==='failed'?b('重试规范化样例','retryRule',{id:selected.id},'btn-primary',ro()):status(selected)==='normalizing'?b('查看完成状态','finishRule',{id:selected.id},'btn-primary',ro()):selected.role==='主规则'&&status(selected)==='normalized'?b('采用为清单草案输入','adoptRule',{id:selected.id},'btn-primary',ro()):'')+'</div>'):panel('来源详情','选择一个来源查看原始身份。');
    return heading('PROJECT SUPPORT / REGULATORY SOURCES','合规来源与采用版本','先确认规则从哪里来、是哪一版，再进入逐条披露配置。',go('checklist','进入披露规范 →'))+notice('目录、日期、条文与版本变更全部为虚构样例，不作为监管适用性依据。','info')+'<div class="support-version-strip mt"><div><strong>本项目清单：'+(g.checklist.status==='published'?'已发布 · 保留原采用输入 RULE-MAIN-v1':g.checks.length?'草案 · 候选输入 '+h(st().ruleVersion):'尚未生成')+'</strong><p class="meta">'+(st().ruleDraft?'候选输入 '+h(st().ruleDraft.id)+' · 待审核，不替换已发布清单':'新版可用不代表项目自动升级。旧清单与冻结报告继续引用旧版。')+'</p></div>'+b('查看旧版来源','supportPick',{key:'source',value:'RULE-MAIN-v1'},'btn-small')+'</div><div class="support-library-tools"><label class="search"><input aria-label="搜索合规来源" data-support-filter="ruleSearch" value="'+h(ps.ruleSearch || '')+'" placeholder="搜索规则、来源身份或角色"></label>'+select('ruleStatus',[['','全部状态'],...Object.entries(S.labels)],filter).replace('<select','<select data-support-filter="ruleStatus" aria-label="来源状态"')+'</div><div class="support-workspace"><div class="stack">'+list+panel('从来源到披露配置','<div class="support-impact-route"><div><h3>01 · 保留原件</h3><span class="small">版本、URL、指纹</span></div><div><h3>02 · 规范化副本</h3><span class="small">稳定行号、错误回看</span></div><div><h3>03 · 清单草案</h3><span class="small">逐条提示词与人工审核</span></div></div>')+'</div><aside class="support-inspector">'+detail+'</aside></div>';
  };
  U.handlers.clearRuleSearch=()=>{ps.ruleSearch='';ps.ruleStatus='';U.render();};
  U.handlers.readRule=p=>{const r=S.rules.find(x=>x.id===p.id),start=Number(r.lines.match(/\d+/)?.[0] || 1);U.openDialog('规范化阅读副本 · '+h(r.id),notice('以下为虚构条文结构，不是客户附件或官方正文。','info')+'<div class="document mt"><div class="document-head">'+h(r.path)+' · '+h(r.lines)+'</div>'+['本节说明披露范围与依据。','对组织边界、报告期间与口径变化作独立说明。','参考写法不得替代本公司的事实证据。'].map((t,i)=>'<p class="'+(i===1?'diff-new':'')+'"><span class="mono meta">L'+(start+i)+'</span> '+h(t)+'</p>').join('')+'</div>',go('checklist','查看关联披露条目')+b('关闭','close'),'wide');};
  U.handlers.ruleDiff=()=>U.openDialog('规则 v1 → v2 · 结构差异样例',notice('旧版副本保留；这里只比较虚构规范化结构，不声称监管新增义务。','info')+U.design.difference('报告边界与计算口径合并在段落中。\n保留事实来源。','报告边界独立定位至 L13。\n计算口径独立定位至 L14。\n保留事实来源。'),b('关闭','close'),'wide');
  U.handlers.retryRule=p=>change('ruleRetry',p);U.handlers.finishRule=p=>change('ruleFinish',p);
  U.handlers.adoptRule=p=>U.ask('采用为清单草案输入',notice('应由合规管理员核对规则适用性。演示身份：何宁。顶栏登录身份不变；此操作只展示候选输入，不发布清单。','info')+'<p class="support-detail-text mt">'+h(p.id)+' 将作为项目候选规则。原清单、正文和冻结报告不会自动切换。</p>','保存候选输入样例',()=>change('adoptRule',p));

  function templateTree(g) {
    return '<div class="support-template-tree">'+[['主模板','TPL-BASE-v1','章节层级、共同字段与禁止推断原则'],['行业模板','TPL-FINANCE-v2','增加金融行业气候风险结构'],['客户模板','TPL-CLIENT-v1','术语、品牌语气与双语要求'],['项目框架',g.framework.id+' · v'+g.framework.version,'本报告期边界与项目级覆盖']].map(([name,id,text])=>'<div class="support-template-node"><span class="meta">'+h(name)+'</span><h3>'+h(id)+'</h3><span class="small">'+h(text)+'</span></div>').join('')+'</div>';
  }
  V.references=g=>{
    const tab=ps.referenceTab || 'reports', query=(ps.referenceSearch || '').toLowerCase();
    const rows=S.references.filter(r=>(!query || [r.title,r.chapter,r.industry].join(' ').toLowerCase().includes(query))&&(!ps.referenceIndustry || r.industry===ps.referenceIndustry)&&(!ps.referenceYear || r.year===ps.referenceYear)&&(!ps.referenceLanguage || r.language===ps.referenceLanguage));
    const r=rows.find(r=>r.id===picked('reference','REF-STYLE-01')) || rows[0];
    identify(g,tab==='templates'?'TPL-FINANCE-v2':r?.id || 'REFERENCE-LIBRARY',tab==='templates'?'正式框架继承样例':'行业参考样例',tab==='templates'?'framework/templates/finance-v2.json':r?.path || 'references/index.json',tab==='templates'?{template:'TPL-FINANCE-v2',inherits:'TPL-BASE-v1',framework:g.framework.id}:r || {});
    const tabs='<div class="tabs mb">'+[['reports','行业参考 · 借鉴写法'],['templates','框架模板 · 决定结构']].map(([id,label])=>b(label,'referenceTab',{id},'tab '+(tab===id?'active':''))).join('')+'</div>';
    if(tab==='templates') return heading('PROJECT SUPPORT / FRAMEWORK LIBRARY','行业参考与模板库','参考报告提供写法，正式模板提供章节和要点约束。',go('framework','返回撰写框架 →'))+tabs+'<div class="support-workspace"><div class="stack">'+panel('四级继承 · 来源可追溯',templateTree(g))+panel('本项目覆盖差异',U.design.difference('语言：简体中文\n长度：建议 300–500 字\n必需：边界、年度行动、证据','语言：'+S.config(g).language+'\n长度：建议 300–500 字\n必需：边界、年度行动、证据\n项目补充：说明与上年度的可比性'))+'</div><aside class="stack support-inspector">'+panel('金融行业框架 · v2',tag('结构模板 · 非公司事实')+dl([['适用市场','香港（演示）'],['行业','证券与金融服务'],['继承来源','TPL-BASE-v1'],['采用方式','生成项目框架草案'],['审核边界','发布前逐项核对检查项关联']])+(g.units.length?go('framework','查看项目继承与覆盖','btn btn-primary'):b('采用框架生成空白要点','adoptTemplate',{},'btn-primary',ro()||!g.checks.length))+'<p class="meta mt">不复制正文、数值、事实、审核或历史报告。'+(!g.checks.length?'请先采用项目规则。':'')+'</p>')+'</aside></div>';
    const filters='<div class="support-library-tools"><label class="search"><input aria-label="搜索行业参考" data-support-filter="referenceSearch" value="'+h(ps.referenceSearch || '')+'" placeholder="搜索报告或章节"></label>'+[['referenceIndustry','全部行业','industry'],['referenceYear','全部年度','year'],['referenceLanguage','全部语言','language']].map(([id,title,key])=>select(id,[['',title],...E.unique(S.references.map(r=>r[key])).map(v=>[v,v])],ps[id] || '').replace('<select','<select aria-label="'+title+'" data-support-filter="'+id+'"')).join('')+'</div>';
    const cards='<div class="support-reference-cards">'+rows.map(x=>'<article class="support-reference-card '+(r?.id===x.id?'selected':'')+'"><div class="between"><span class="support-reference-mark">'+icon('book')+'</span>'+tag(x.kind)+'</div><h2>'+h(x.title)+'</h2><div class="meta">'+h(x.market+' · '+x.industry+' · '+x.year+' · '+x.language)+'</div><p class="mt">'+h(x.text)+'</p><footer><span class="meta">'+h(x.chapter)+'</span>'+b('查看出处','supportPick',{key:'reference',value:x.id},'btn-small')+'</footer></article>').join('')+'</div>';
    const detail=r?panel('选中参考 · 原文定位','<span class="support-record-id">'+h(r.id)+'</span><h2 class="support-detail-title">'+h(r.chapter)+'</h2>'+dl([['来源',r.title+'（虚构）'],['定位',r.position],['来源地址',r.url]])+'<blockquote class="support-detail-text">'+h(r.excerpt)+'</blockquote>'+notice('只借鉴结构与写法；不进入 FactVersion、不增加披露覆盖率。','info')+'<div class="actions mt">'+b('关联到撰写要点','attachReference',{id:r.id},'btn-primary',ro()||!g.units.length)+go('framework','查看要点配置','btn-small btn')+'</div>'+(g.units.length?'':'<p class="meta mt">先在“框架模板”中生成项目要点。</p>')):panel('没有匹配参考',U.empty('试试其他筛选条件','',b('清除参考筛选','clearReferenceSearch')));
    return heading('PROJECT SUPPORT / REFERENCE LIBRARY','行业参考与模板库','找到可借鉴的结构与表达，并保留它的来源和使用边界。',go('framework','返回撰写框架 →'))+tabs+filters+'<div class="support-workspace"><div>'+cards+'<p class="meta mt">'+rows.length+' / '+S.references.length+' 个参考 · 全部为虚构报告和占位网址</p></div><aside class="support-inspector">'+detail+'</aside></div>';
  };
  U.handlers.referenceTab=p=>{ps.referenceTab=p.id;U.render();};
  U.handlers.clearReferenceSearch=()=>{['referenceSearch','referenceYear','referenceLanguage','referenceIndustry'].forEach(k=>{ps[k]='';});U.render();};
  U.handlers.attachReference=p=>U.ask('关联写法参考',notice('仅增加要点的参考关系，不修改事实、数值、审核状态或覆盖。','info')+field('unitId','项目内撰写要点',select('unitId',E.state().units.map(u=>[u.id,u.id+' · '+u.title]),E.state().units.find(u=>u.id==='ENV-001')?.id || E.state().units[0]?.id)),'关联参考样例',v=>change('reference',{id:p.id,unitId:v.unitId}));
  U.handlers.adoptTemplate=()=>U.ask('生成项目框架草案',notice('只创建空白要点和检查项关联，不沿用参考公司的正文或数据。','info'),'采用模板样例',()=>change('template'));

  function runNodes(g) {
    const impact=S.impacted(g),resume=ps.runResumed;
    return [
      {id:'parse',label:'解析与规范化',status:'applied',note:'输入指纹未变 · 可复用',input:g.files.map(f=>f.hash),output:g.locators.map(l=>l.id),reused:true},
      {id:'source',label:'来源审核门 G2',status:'applied',note:'审核记录保留 · 不跳过审核',input:g.sourceSets.map(s=>s.id),output:g.sourceSets.filter(s=>s.approvedBy).map(s=>s.id),reused:true},
      {id:'fact',label:'事实版本变化',status:'applied',note:'选中 '+impact.factId,input:impact.versions.slice(0,1),output:impact.versions,affected:true},
      {id:'mapping',label:'覆盖复核',status:resume?'applied':'review',note:impact.maps.length+' 个实际关联映射',input:impact.versions,output:impact.maps.map(m=>m.id),affected:true},
      {id:'writing',label:'正文检验 G5',status:resume?'review':'failed',note:resume?'停在独立审核门':'E-MODEL-OFFLINE · 模拟失败',input:impact.units.map(u=>u.id),output:[],affected:true},
      {id:'build',label:'合成与最终审核 G6',status:'pending',note:'等待正文审核 · 不覆盖冻结报告',input:impact.units.map(u=>u.id),output:[],affected:true},
    ];
  }
  V.runs=g=>{
    const mode=ps.runsTab || 'impact', impact=S.impacted(g), actual=S.runRows(g),nodes=runNodes(g),node=nodes.find(n=>n.id===picked('node','writing')) || nodes[4];
    identify(g,mode==='actual'?'MODEL-ACTIONS':'RUN-IMPACT-DEMO','运行与影响记录','runs/'+(mode==='actual'?'model-actions.json':'impact-demo.json'),mode==='actual'?actual:{runId:'RUN-IMPACT-DEMO',node:node.id,input:node.input,output:node.output});
    const tabs='<div class="tabs mb">'+b('变更影响 · 命名样例','runsTab',{id:'impact'},'tab '+(mode==='impact'?'active':''))+b('项目模型动作 · '+actual.length,'runsTab',{id:'actual'},'tab '+(mode==='actual'?'active':''))+b('审核与操作事件 · '+g.audit.length,'runsTab',{id:'audit'},'tab '+(mode==='audit'?'active':''))+'</div>';
    if(mode==='audit') { identify(g,'AUDIT-EVENTS','审核与操作事件','runs/audit-events.json',g.audit); return heading('PROJECT SUPPORT / AUDIT EVENTS','运行记录与影响分析','审核事件与模型任务分别追溯，设计样例不冒充正式批准。',go('overview','返回项目总览'))+tabs+panel('此项目的完整事件记录','<div class="table-scroll"><table class="support-table"><thead><tr><th>事件 / 意见</th><th>操作身份 / 时间</th><th>运行 / 节点 / 输入</th></tr></thead><tbody>'+g.audit.map(a=>'<tr><td><strong>'+h(a.title)+'</strong><p class="small mt">'+h(a.reason)+'</p><span class="support-record-id">'+h(a.id)+'</span></td><td>'+h(a.actor)+'<div class="meta mt">'+h(a.role || '历史角色未记录')+'</div><div class="meta mt">'+h(a.time)+'</div>'+(a.submittedBy?'<p class="meta mt">提交 / 编制：'+h(a.submittedBy)+'</p>':'')+'</td><td><div class="mono small">'+h(a.runId)+'</div><div class="meta mt">'+h(a.node)+'</div><div class="support-record-id">'+h(a.inputHash)+'</div></td></tr>').join('')+'</tbody></table></div>'); }
    if(mode==='actual') return heading('PROJECT SUPPORT / RUN HISTORY','运行记录与影响分析','模型动作读取共享对象图；影响路径样例与真实执行分开标识。',b('打开共享模型动作中心','tasks'))+tabs+panel('当前项目的模型动作',actual.length?'<div class="table-scroll"><table class="support-table"><thead><tr><th>任务 / 节点</th><th>固定输入 / 输出</th><th>配置 / 时间</th><th>状态</th></tr></thead><tbody>'+actual.map(a=>'<tr><td>'+b(h(a.label),'tasks',{id:a.id},'link-button')+'<div class="support-record-id">'+h(a.id)+'</div><div class="meta">'+h(a.node)+'</div></td><td><div class="mono meta">'+h(a.input)+' → '+h(a.output)+'</div><p class="small mt">'+h(a.targets.join('、'))+'</p></td><td><div class="small">'+h(a.prompt)+'<br>'+h(a.model)+'</div><div class="meta mt">'+h(a.started)+' → '+h(a.ended)+'</div></td><td>'+badge(a.status)+b('输入 / Diff / 重试','tasks',{id:a.id},'btn-small mt')+'</td></tr>').join('')+'</tbody></table></div>':U.empty('尚无模型动作','从 P02、P03 或 P08 选中对象后发起模拟任务。',go('writing','进入撰写工作台')));
    const route='<div class="support-impact-route"><div><h3>① 事实版本</h3>'+impact.versions.map(id=>go('facts',h(id),'small','fact',id)).join('')+'</div><div><h3>② 映射 · '+impact.maps.length+'</h3>'+impact.maps.map(m=>go('mapping',h(m.id),'small','check',m.checkId)).join('')+'</div><div><h3>③ 引用单元 · '+impact.units.length+'</h3>'+impact.units.map(u=>go('writing',h(u.id+' · '+u.title),'small','unit',u.id)).join('')+'</div></div>';
    const left=panel('按依赖继续 · 不重跑整个项目','<p class="meta mb">RUN-IMPACT-DEMO · 变更事件是假设样例；映射和单元范围从当前项目引用关系派生。</p><div class="support-run-grid">'+nodes.map(n=>'<button type="button" class="support-run-node '+(n.affected?'affected ':'')+(n.id===node.id?'active':'')+'" data-action="supportPick" data-payload="'+h(JSON.stringify({key:'node',value:n.id}))+'"><span class="mono meta">'+h(n.id)+'</span><strong>'+h(n.label)+'</strong>'+tag(n.reused?'可复用':E.D.labels[n.status] || n.status,n.status==='failed'?'badge-failed':'')+'<span class="meta">'+h(n.note)+'</span></button>').join('')+'</div>'+route)+panel('不受影响的范围','<div class="chips">'+impact.unaffected.map(u=>go('writing',h(u.id),'badge','unit',u.id)).join('')+'</div><p class="small mt">'+impact.unaffected.length+' 个未引用该事实的单元，不列入这次拟重跑。</p><div class="support-frozen"><strong>冻结报告保持不变 · '+impact.builds.length+' 个版本</strong><p class="meta mt">新事实、新提示词与重试都不改写历史成品。'+(impact.builds.length?go('delivery','回看冻结输入 →','small','build',impact.builds.at(-1).id):'当前尚未构建报告。')+'</p></div>');
    const right=panel('选中节点 · '+h(node.label),tag('全程模拟 · 非后台运行')+dl([['运行 / 批次','RUN-IMPACT-DEMO / BATCH-DEMO'],['节点',node.id],['状态',E.D.labels[node.status] || node.status],['输入指纹',E.fingerprint(node.input)],['输出指纹',node.output.length?E.fingerprint(node.output):'尚无输出'],['提示词',S.promptProfile(g).id],['模型','demo-reviewer'],['解析器','demo-parser-v1'],['起止时间','2026-09-10 10:00 → 10:01（样例）'],['尝试次数',ps.runResumed?'2（样例）':'1（样例）']])+'<details><summary>输入与输出对象</summary><pre class="code-block">'+h(JSON.stringify({input:node.input,output:node.output},null,2))+'</pre></details>'+notice(ps.runResumed?'恢复样例已停在正文审核门，须由周宁（报告审核人）核对。没有自动批准，也未修改当前正文。':'仅重试失败节点及其未完成依赖；已审核来源和未变输入可复用。','info')+'<div class="actions mt">'+b(ps.runResumed?'重看失败状态':'预览从失败节点继续','resumeRun',{},'btn-primary',ro())+b('输入 / 输出 Diff','supportObject',{op:'diff'},'btn-small')+'</div>');
    return heading('PROJECT SUPPORT / RUNS & IMPACT','运行记录与影响分析','追踪一次变更影响了哪些对象，在哪里停下，由谁继续。',go('overview','返回任务总览'))+tabs+'<div class="support-workspace"><div class="stack">'+left+'</div><aside class="support-inspector">'+right+'</aside></div>';
  };
  U.handlers.runsTab=p=>{ps.runsTab=p.id;U.render();};
  U.handlers.resumeRun=()=>{E.need(!ro(),'只读项目不能切换恢复状态。');ps.runResumed=!ps.runResumed;U.render();U.toast('仅切换运行恢复样例，未重跑任何正文或真实任务。');};

  /* Existing pages: first use, prompt lifecycle, inheritance, style and export states. */
  function startJourney(g) {
    const steps=[
      ['01','确认范围与运行环境','行业、语言、主体范围和规则采用方式。','settings',g.initialization?.configured],
      ['02','选择规则并核对条目','保留原始来源，再配置逐条撰写与检验提示词。','regulatory',!!g.checks.length],
      ['03','建立空白撰写框架','沿用结构，不带入参考公司的事实和正文。','references',!!g.units.length],
      ['04','收集资料与有效事实','文件进入后逐步完成来源与事实审核。','files',!!g.files.length],
      ['05','逐要点撰写与审核','无正文时先明确要求和证据，不自动补写数值。','writing',g.units.some(u=>u.body.trim())],
      ['06','构建与交付','经过质量门后创建首个冻结版本。','delivery',!!g.builds.length],
    ];
    U.setCurrent('project',g.project.id);
    return heading('PROJECT / GETTING STARTED','开始这份报告',g.project.name+' · '+g.project.period+' 年度',go('settings','项目配置','btn btn-primary'))+notice(g.initialization?.mode==='inherit'?'已沿用 '+h(g.initialization.inheritedFrom)+' 的范围和写作配置。没有复制旧事实、正文、审核或报告。':'这是空白报告项目：没有预置客户资料、有效事实、已审核正文或历史构建。','info')+'<div class="metrics mt">'+U.metric('披露条目',g.checks.length,'待选择与审核规则')+U.metric('资料文件',g.files.length,'不从旧报告复制')+U.metric('撰写要点',g.units.length,'正文独立撰写')+U.metric('冻结报告',g.builds.length,'构建后才会产生')+'</div><div class="support-start-grid">'+steps.map(([n,title,text,page,done])=>'<section class="support-start-step"><div class="between"><span class="support-section-number">'+n+'</span>'+tag(done?'已有配置 / 对象':'待开始',done?'badge-approved':'')+'</div><h2>'+h(title)+'</h2><p>'+h(text)+'</p>'+go(page,done?'查看当前状态 →':'进入下一步 →','small')+'</section>').join('')+'</div>';
  }
  const emptyCopy={
    checklist:['尚未采用披露规则','先选择来源与适用版本，再审阅逐条披露要求及双提示词。','regulatory','选择合规来源'],
    files:['尚未收集资料文件','这里会列出登记、解析、归组及待审核的资料。当前没有导入任何附件。','settings','确认收资范围'],
    sources:['尚无待裁定的来源集合','先登记并归组资料。没有文件时，不会展示已批准来源。','files','进入资料工作台'],
    facts:['尚未形成事实候选','解析与提取后的候选进入这里；审核通过后才能供正文引用。','files','查看收资入口'],
    mapping:['尚未建立披露覆盖','规则定义要求，事实和定位提供证据；没有证据不能标记已覆盖。','checklist','先查看披露要求'],
    framework:['尚未建立项目撰写框架','选用框架模板，只带入章节结构和要点约束，不复制公司事实或正文。','references','选择框架模板'],
    writing:['尚无可撰写要点','先生成项目框架，再为每个要点准备资料、证据和提示词。','framework','建立撰写框架'],
    composer:['尚无正文可合成','合成只读取已审核的单元。空白项目不能直接构建正式报告。','writing','进入逐要点撰写'],
    delivery:['尚未构建报告版本','只有经过预检并构建后，这里才会出现冻结正文、清单、日志及交付状态。','composer','查看合成准备情况'],
  };
  function emptyView(g,key) {
    U.setCurrent('project',g.project.id);const p=E.D.pages.find(p=>p.key===key), [title,text,page,cta]=emptyCopy[key];
    return heading(p.id+' / FIRST USE',p.title,'空白项目 · '+g.project.name,go('overview','查看初始化步骤'))+'<div class="support-empty">'+icon(p.key==='delivery'?'archive':'file')+'<h2>'+title+'</h2><p>'+text+'</p><div class="actions" style="justify-content:center">'+go(page,cta,'btn btn-primary')+(key==='files'?b('查看文件导入状态样例','emptyImport'):key==='framework'?go('regulatory','先选择项目规则'):'')+'</div></div>'+(key==='delivery'?panel('交付前需要完成','<p class="small">规则采用 → 资料与事实审核 → 撰写与引用 → 单元审核 → 八项预检 → 冻结构建 → 最终批准。</p>'):'');
  }
  U.handlers.emptyImport=()=>U.openDialog('导入资料 · 首次使用状态',notice('本轮不读取真实客户附件。文件选择与解析过程仅作设计展示。','info')+'<div class="support-template-tree mt">'+[['待登记','选中文件后保留名称、原始路径和内容指纹'],['解析中','原件保留，可继续浏览其他对象'],['解析失败','展示错误与重试，不生成虚假的有效事实'],['等待归组','解析完成后确认 Family 和来源用途']].map(([a,z])=>'<div class="support-template-node"><h3>'+a+'</h3><p class="small">'+z+'</p></div>').join('')+'</div>',b('关闭','close'));
  U.handlers.projectConfig=()=>location.assign(E.url('settings','project',E.state().project.id));
  const oldCreate=U.handlers.portfolioCreate;
  U.handlers.portfolioCreate=()=>{
    oldCreate();const dialog=document.querySelector('dialog'),form=dialog.querySelector('form');
    const block=document.createElement('div');block.innerHTML=field('startMode','创建方式',select('startMode',[['blank','全新空白报告'],['inherit','沿用已有报告配置 · 不复制内容'],['demo','载入完整虚构演示样例']],'blank'))+field('sourceId','沿用配置的来源报告',select('sourceId',P.catalog().map(p=>[p.id,p.name+' · '+p.year]),'PRJ-DEMO-002'))+'<p class="meta mb">沿用仅含范围、行业、语言等配置；规则与模板仍需在本期确认。已有报告可从列表直接继续，不新建副本。</p>';
    form.prepend(block);const source=block.querySelector('[for="sourceId"]');source.hidden=true;block.querySelector('#startMode').addEventListener('change',e=>{source.hidden=e.target.value!=='inherit';});
    const note=form.querySelector('.notice div');if(note)note.textContent='仅输入虚构信息。选择空白报告时，不载入资料、事实、正文、审核记录或历史构建。';
    dialog.querySelector('button[type="submit"]').textContent='创建并进入';
  };
  function promptLifecycle(g,key) {
    const s=S.state(g),unit=g.units.find(u=>u.id===U.selection('unit',g.units[0]?.id)),profile=S.promptProfile(g,key==='checklist'?null:unit),affected=S.promptUnits(g);
    const description={baseline:'当前有效配置 v1；v2 示例仅在版本比较中展示。',draft:'v2 草案待审核，P07 / P08 继续采用已发布 v1。',rejected:'何宁（合规管理员）退回：口径检验项缺少事实定位。有效版仍为 v1。',published:'v2 已发布样例；为关联要点选择采用版本，未升级的要点继续使用 v1。',upgraded:'关联排放要点已采用 v2 样例；旧正文和旧任务仍保留原输入。'};
    return '<section class="support-version-strip" data-prompt-lifecycle><div><strong>提示词发布旅程 · '+h(S.promptScenes[s.promptScene])+'</strong><p class="meta">'+h(description[s.promptScene])+'</p><p class="meta">独立命名状态样例 · 切换会重置本组采用选择，不发布下方业务清单，也不同步本页手工草案。</p></div><div class="actions">'+select('promptScenario',Object.entries(S.promptScenes),s.promptScene).replace('<select','<select aria-label="提示词生命周期样例" '+(ro()?'disabled ':''))+b('审核 / 发布对照','promptLifecycleDiff',{},'btn-small')+'</div>'+(key!=='checklist'&&unit?'<div class="support-span small" data-adopted-prompt><strong>'+h(unit.id)+' 使用：'+h(profile.id)+'</strong> · '+(profile.pending?'有新版可采用，当前正文保持原样。':profile.version===2?'本次模型动作使用 v2；正文需按新要求人工复核。':'继续使用已发布配置。')+(profile.pending?b('为此要点采用 v2','adoptPrompt',{id:unit.id},'btn-primary btn-small',ro()):'')+'</div>':'<p class="meta">候选修改对象：CHK-ENV-001 · 影响 '+affected.length+' 个关联要点；其他条目不改变。</p>')+'</section>';
  }
  U.handlers.promptLifecycleDiff=()=>{
    const g=E.state(),sample=g.checks.find(c=>c.id==='CHK-ENV-001');if(!sample)return;
    U.openDialog('清单配置 v1 → v2 · 提示词发布状态样例',notice('编制：林悦（ESG 撰写人）；应由何宁（合规管理员）审核。当前选择的是设计快照，不是真实审核操作。','info')+U.design.difference('撰写：说明排放范围、结果和来源。\n检验：检查正文、单位与事实定位。','撰写：说明排放范围、结果和来源。\n新增：单列合并边界、与上年可比性及变化原因。\n检验：检查正文、单位与事实定位。\n新增：分别检验边界、期间与可比性，逐行列出依据。')+dl([['状态',S.promptScenes[st().promptScene]],['草案归属','下一版清单配置（含条目提示词）'],['修改条目',sample.id],['影响要点',S.promptUnits(g).map(u=>u.id).join('、')],['旧任务 / 报告','固定原配置，不自动采用 v2']])+go('runs','查看影响分析 →','small'),b('关闭','close'),'wide');
  };
  U.handlers.adoptPrompt=p=>U.ask('为此要点采用已发布配置样例',notice('本次只切换 '+h(p.id)+' 的提示词配置示例。旧正文不自动改写、审核结果不自动升级。','info'),'采用 v2 样例',()=>change('adoptPrompt',p));
  document.addEventListener('change',e=>{if(e.target.id==='promptScenario')change('promptScene',{scene:e.target.value});});

  function linkedReference(g,unit) {
    const ref=S.references.find(r=>r.id===S.state(g).references[unit.id]);
    return ref?panel('本要点采用的写法参考','<strong class="small">'+h(ref.title)+'（虚构）</strong><p class="meta mt">'+h(ref.chapter+' · '+ref.position)+'</p><p class="small mt">'+h(ref.excerpt)+'</p>'+notice('写法参考不是公司事实，不作为引用证据。','info')+go('references','回看参考来源 →','small')):'';
  }
  U.handlers.pointConstraints=p=>{
    const g=E.state(),u=E.byId(g.units,p.id),saved=st().pointConfigs?.[p.id] || {};
    U.ask('要点身份、继承与约束 · '+h(u.id),'<h3>'+h(u.title)+'</h3><div class="meta mb">'+h(u.chapter+' / '+u.id)+' · 项目框架 v'+g.framework.version+'</div>'+templateTree(g)+'<div class="support-form-grid mt">'+field('parent','父章节 / 上级节点',input('parent',saved.parent || u.chapter+'/一级章节','required'))+field('language','目标语言',select('language',[['简体中文','简体中文'],['繁體中文','繁體中文'],['English','English'],['中英双语','中英双语']],saved.language || S.config(g).language))+field('length','目标长度',input('length',saved.length || '300–500 字','required'))+field('style','样式标签',select('style',[['叙述 + 指标表','叙述 + 指标表'],['治理叙述','治理叙述'],['案例卡','案例卡']],saved.style || '叙述 + 指标表'))+'</div>'+field('required','必需要素',textarea('required',saved.required || '报告边界；年度行动；量化结果（如适用）；事实与原始证据定位',3))+field('forbidden','禁用表述',textarea('forbidden',saved.forbidden || '无证据的领先性表述；替客户推断数值；把参考报告当作公司事实',3))+field('applicability','不适用规则',textarea('applicability',saved.applicability || '不适用须记录原因、证据与独立审核人，不能仅因缺资料而跳过。',3))+notice('保存的是项目级覆盖样例。继承来源可回看，不修改上级模板、正文或原框架发布记录。','info'),'保存项目级覆盖样例',v=>change('pointConfig',{id:p.id,values:v}),'wide');
  };
  U.handlers.styleInspector=()=>{
    const style=st().style;
    U.ask('报告样式检查器 · 版式样例','<div class="split"><section>'+field('heading','标题层级',select('heading',[['二级标题','二级标题'],['三级标题','三级标题']],style.heading))+field('caption','表格 / 图注位置',select('caption',[['下方 · 含单位与报告期','下方 · 含单位与报告期'],['上方 · 含单位与报告期','上方 · 含单位与报告期']],style.caption))+field('pageBreak','分页策略',select('pageBreak',[['新章节另起页','新章节另起页'],['章节连续排版','章节连续排版']],style.pageBreak))+'<p class="meta">只预览排版状态，不改写单元正文，也不生成 Office/PDF。</p></section><section id="support-style-preview">'+stylePreview(style)+'</section></div>','保存版式样例',v=>change('style',v),'wide');
  };
  function stylePreview(style) {
    const caption='<figcaption>表 1 · 年度资源指标（结构样例）<br>单位：[待确认] · 报告期：[本项目报告期] · 统计范围：[须有事实依据]</figcaption>';
    return '<div class="support-style-page"><span class="eyebrow">REPORT STYLE SAMPLE</span>'+(style.heading==='三级标题'?'<h3>环境绩效与统计边界</h3>':'<h2>环境绩效与统计边界</h2>')+'<p class="small">正文保留事实引用，表格与图注使用统一样式。</p><figure class="mt">'+(style.caption.startsWith('上方')?caption:'')+'<table><thead><tr><th>指标</th><th>年度结果</th><th>单位</th></tr></thead><tbody><tr><td>资源使用</td><td>[有效事实]</td><td>[单位]</td></tr></tbody></table>'+(style.caption.startsWith('下方')?caption:'')+'</figure><div class="support-page-break">'+h(style.pageBreak)+' · 示意分页线</div><span class="meta">下一章节：员工与社会</span></div>';
  }
  document.addEventListener('change',e=>{const form=e.target.closest('#dialog-form'),preview=document.getElementById('support-style-preview');if(form&&preview&&['heading','caption','pageBreak'].includes(e.target.id))preview.innerHTML=stylePreview(Object.fromEntries(new FormData(form)));});
  function exportsPanel(g) {
    const build=E.byId(g.builds,U.selection('build',g.activeBuild || g.builds.at(-1)?.id));if(!build)return '';
    const labels={pending:'待生成',running:'生成中',failed:'生成失败',ready:'已生成 · 视觉样例'};
    return '<div class="support-delivery-states">'+panel('交付格式与生成状态 · 静态样例','<p class="meta mb">以下状态不触发真实渲染。可下载的 MD / HTML / manifest / 日志仍在原交付区；不以其他格式冒充 DOCX、PDF 或 XLSX。</p><div class="download-grid">'+[['docx','report.docx','可编辑文字稿'],['pdf','report.pdf','审阅与归档稿'],['xlsx','report-coverage.xlsx','披露覆盖工作簿']].map(([format,name,description])=>{const status=st().exportStates[build.id+':'+format] || ({docx:'pending',pdf:'failed',xlsx:'pending'})[format];return '<article class="download-card"><strong>'+name+'</strong><p class="meta">'+description+'</p>'+tag(labels[status],status==='failed'?'badge-failed':status==='ready'?'badge-approved':'')+'<div>'+select('export-'+format,Object.entries(labels),status).replace('<select','<select data-export-build="'+h(build.id)+'" data-export-format="'+format+'" aria-label="'+format+' 交付状态样例" '+(ro()?'disabled ':' '))+'</div>'+(status==='failed'?'<p class="small danger-text mt">E-RENDER-FONT：字体资源不可用（样例）。原构建保持不变。</p>'+b('查看失败与重试','exportFailure',{buildId:build.id,format},'btn-small mt'):'<p class="meta mt">'+(status==='ready'?'完成态仅作评审，未产生真实二进制文件。':status==='running'?'生成过程样例，可继续浏览冻结正文。':'等待启动生成，不影响已冻结报告。')+'</p>')+'</article>';}).join('')+'</div><div class="support-audit-note">覆盖清单 JSON：机器可读对象与冻结版本。XLSX：人工核对工作簿。现有 CSV：仅平面列表，不能替代带工作表的 XLSX。</div>'+b('下载冻结覆盖 JSON 示例','downloadCoverageJson',{id:build.id},'btn-small')+dl([['冻结提示词场景',S.promptScenes[build.supportSnapshot?.promptScene || 'baseline']],['冻结配置信息','不读取当前提示词或当前工作事实']]))+'</div>';
  }
  U.handlers.exportFailure=p=>U.openDialog('导出失败 · 不丢失已构建报告',notice('E-RENDER-FONT：缺少目标字体（虚构错误）。修复渲染配置后仅重试此格式，不重新批准正文。','danger')+dl([['冻结报告',p.buildId],['格式',p.format],['重试范围','只生成此格式；manifest 和正文不变']]),b('关闭','close')+b('切换为重试中样例','retryExport',p,'btn-primary',ro()));
  U.handlers.retryExport=p=>{U.closeDialog();change('export',{...p,status:'running'});};
  U.handlers.downloadCoverageJson=p=>{const g=E.state(),build=E.byId(g.builds,p.id),frozen={...g,...build};U.download('report-coverage-demo-v'+build.version+'.json',JSON.stringify({demonstration:true,buildId:build.id,hash:build.hash,checklistVersion:build.manifest.checklistVersion,rows:build.checks.map(c=>({id:c.id,title:c.title,coverage:E.coverage(frozen,c.id),mappingIds:build.mappings.filter(m=>m.checkId===c.id&&!m.removed).map(m=>m.id)}))},null,2),'application/json');};
  document.addEventListener('change',e=>{if(e.target.dataset.exportFormat)change('export',{buildId:e.target.dataset.exportBuild,format:e.target.dataset.exportFormat,status:e.target.value});});
  const previousViews={...V};
  S.pages.forEach(p=>{V[p.key]=g=>previousViews[p.key](g)+'<div class="actions mt">'+b('复制版本深链接','supportShare')+'</div>';});
  Object.keys(emptyCopy).concat('overview').forEach(key=>{
    V[key]=g=>{
      if(key==='overview'&&g.initialization&&!g.builds.length)return startJourney(g);
      const missing={checklist:!g.checks.length,files:!g.files.length,sources:!g.families.length,facts:!g.facts.length,mapping:!g.checks.length,framework:!g.units.length,writing:!g.units.length,composer:!g.units.length,delivery:!g.builds.length};
      if(missing[key])return emptyView(g,key);
      let content=previousViews[key](g);
      if(['checklist','framework','writing'].includes(key)) {
        const point=g.units.find(u=>u.id===U.selection('unit',g.units[0]?.id));
        content=promptLifecycle(g,key)+content;
        if(key==='checklist')content=subnav([['regulatory','来源与采用版本 →']])+content;
        if(key==='framework'&&point)content=subnav([['references','行业参考与框架模板 →']])+'<div class="support-subnav">'+b('要点继承与完整约束','pointConstraints',{id:point.id},'',ro())+'</div>'+content+linkedReference(g,point);
        if(key==='writing'&&point)content=content+linkedReference(g,point);
      }
      if(key==='overview')content=subnav([['settings','项目配置'],['regulatory','合规来源库'],['references','参考与模板'],['runs','运行与影响']])+content;
      if(key==='writing'&&g.units.every(u=>!u.body.trim()))content=notice('尚未撰写正文。框架只建立了要点结构；请先核对披露要求与事实证据，缺失内容保留待补充，不自动视为已审核。','info')+content;
      if(key==='composer')content='<div class="support-subnav">'+b('版式与样式检查器','styleInspector',{},'',ro())+'<span class="meta">'+h(st().style.heading+' · '+st().style.pageBreak)+'</span></div>'+content;
      return content;
    };
  });
  U.support.deliveryStates=exportsPanel;
  const originalModel=U.handlers.model;
  U.handlers.model=(p,target,event)=>{if(S.config(E.state()).service==='unavailable')return U.openDialog('模型服务不可用',notice('服务状态为离线样例。没有发送任务，人工编辑、证据阅读和历史报告仍可用。','danger'),go('settings','检查服务配置')+b('关闭，继续人工处理','close'));return originalModel(p,target,event);};
  document.addEventListener('change',event=>{const key=event.target.dataset.supportFilter;if(key){ps[key]=event.target.value;U.render();}});
  document.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.dataset.supportFilter){event.preventDefault();ps[event.target.dataset.supportFilter]=event.target.value;U.render();}});
})();
