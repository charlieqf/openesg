/* Disposable browser state; all requests are confined to the local prototype. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright-core');
const D=require('../public/assets/demo-data.js'),S=require('../public/assets/support-data.js');
const base=process.env.OPENESG_REVIEW_URL || 'http://127.0.0.1:4174';
const out=path.resolve(__dirname,'../verification/support-20260910');
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
  await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
  const page=await context.newPage(),errors=[],results=[];
  page.on('pageerror',e=>errors.push(e.message));
  const go=async file=>{await page.goto(base+'/'+file);await page.locator('main h1').waitFor();};
  const act=name=>page.locator('[data-action="'+name+'"]');
  const close=async()=>{if(await page.locator('dialog[open]').count())await page.keyboard.press('Escape');};
  const check=async(name,fn)=>{await fn();results.push({name,pass:true});console.log('PASS '+name);};
  const shot=async name=>{await page.screenshot({path:path.join(out,name+'.png'),fullPage:false});};
  const overflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'page-level horizontal overflow');
  try{
    for(const width of [1440,1280,1024]){
      await page.setViewportSize({width,height:width===1440?900:width===1280?800:768});
      for(const p of S.pages)await check(p.id+' at '+width,async()=>{
        await go(p.file+'#project=PRJ-DEMO-003');assert.equal(await page.locator('main h1').count(),1);assert.equal(await page.locator('.rail nav a').count(),14);
        assert.equal(await page.evaluate(()=>ESG.state().project.id),'PRJ-DEMO-003');await overflow();await shot(p.id+'-'+width);
        assert.match(await page.locator('.object-path code').innerText(),/PRJ-DEMO-003/);
      });
    }
    await page.setViewportSize({width:1440,height:900});
    await check('SETUP-01 configuration Diff and unavailable service preserve manual work',async()=>{
      await go('11-project-settings.html');await page.locator('#language').selectOption('English');await act('previewConfig').click();assert.ok(await page.locator('dialog .diff-line.addition').count());
      await page.locator('dialog button[type="submit"]').click();assert.equal(await page.evaluate(()=>ESGSupport.config(ESG.state()).language),'English');assert.equal(await page.evaluate(()=>ESG.state().project.language),'简体中文');
      await act('settingsTab').filter({hasText:'目录与模型'}).click();await page.locator('#service').selectOption('unavailable');await act('previewConfig').click();await page.locator('dialog button[type="submit"]').click();
      await go('08-writing-workbench.html');await act('model').first().click();assert.match(await page.locator('dialog').innerText(),/模型服务不可用/);await close();assert.equal(await page.locator('#unit-body').count(),1);
      await page.evaluate(()=>ESG.reset('source-review'));
    });
    await check('SETUP-02 roles show no permission without changing identity',async()=>{
      await go('11-project-settings.html');await act('settingsTab').filter({hasText:'角色职责'}).click();assert.equal(await page.locator('.support-table tbody tr').count(),6);
      await act('supportDenied').first().click();assert.match(await page.locator('dialog').innerText(),/林悦/);assert.equal(await page.locator('dialog button:disabled').count(),1);await shot('P11-no-permission');await close();
    });
    await check('REG-01 old source remains readable and candidate adoption does not publish',async()=>{
      await go('12-regulatory-library.html');const before=await page.evaluate(()=>JSON.stringify(ESG.state().checklist));await act('adoptRule').click();await page.locator('dialog button[type="submit"]').click();
      assert.equal(await page.evaluate(()=>JSON.stringify(ESG.state().checklist)),before);assert.match(await page.locator('.support-version-strip').innerText(),/待审核/);
      await act('supportPick').filter({hasText:'查看旧版来源'}).click();assert.match(await page.locator('.support-inspector').innerText(),/RULE-MAIN-v1/);await act('readRule').click();assert.match(await page.locator('dialog').innerText(),/虚构/);await close();
    });
    await check('REG-02 failed normalization retry has running and completed states',async()=>{
      await page.locator('#ruleStatus').selectOption('failed');await act('retryRule').click();await page.locator('#ruleStatus').selectOption('normalizing');assert.equal(await act('finishRule').count(),1);await act('finishRule').click();
      assert.equal(await page.evaluate(()=>ESGSupport.state(ESG.state()).ruleOverrides['RULE-APPENDIX-v1']),'normalized');
    });
    await check('REF-01/02 filters, provenance, attach reference and unchanged coverage',async()=>{
      await go('13-reference-library.html');await page.locator('#referenceIndustry').selectOption('制造业');assert.equal(await page.locator('.support-reference-card').count(),1);
      await page.locator('#referenceIndustry').selectOption('');const before=await page.evaluate(()=>JSON.stringify(ESG.stats(ESG.state())));
      await act('attachReference').click();await page.locator('#unitId').selectOption('ENV-001');await page.locator('dialog button[type="submit"]').click();
      assert.equal(await page.evaluate(()=>JSON.stringify(ESG.stats(ESG.state()))),before);
      await go('07-writing-framework.html#objectType=unit&object=ENV-001');assert.match(await page.locator('main').innerText(),/本要点采用的写法参考/);
      await act('pointConstraints').click();assert.equal(await page.locator('dialog .support-template-node').count(),4);await page.locator('#forbidden').fill('不推断任何数值');await page.locator('dialog button[type="submit"]').click();
      await page.reload();await act('pointConstraints').click();assert.equal(await page.locator('#forbidden').inputValue(),'不推断任何数值');await shot('P07-inheritance');await close();
    });
    await check('PROMPT scenes agree across P02/P07/P08; adoption does not rewrite text',async()=>{
      await go('02-disclosure-checklist.html');await page.locator('#promptScenario').selectOption('draft');await go('07-writing-framework.html#objectType=unit&object=ENV-001');assert.match(await page.locator('[data-adopted-prompt]').innerText(),/v1/);
      await page.locator('#promptScenario').selectOption('published');await go('08-writing-workbench.html#objectType=unit&object=ENV-001');assert.match(await page.locator('[data-adopted-prompt]').innerText(),/有新版/);
      const old=await page.evaluate(()=>JSON.stringify({units:ESG.state().units,builds:ESG.state().builds}));await act('adoptPrompt').click();await page.locator('dialog button[type="submit"]').click();
      assert.equal(await page.evaluate(()=>JSON.stringify({units:ESG.state().units,builds:ESG.state().builds})),old);
      await act('model').filter({hasText:'逐条披露检验'}).click();assert.match(await page.locator('#instruction').inputValue(),/已发布 v2 样例补充/);await close();await shot('P08-prompt-adopted');
      await go('07-writing-framework.html#objectType=unit&object=ENV-001');assert.match(await page.locator('[data-adopted-prompt]').innerText(),/v2/);
      await page.locator('#promptScenario').selectOption('rejected');await go('08-writing-workbench.html#objectType=unit&object=ENV-001');assert.match(await page.locator('[data-adopted-prompt]').innerText(),/v1/);
    });
    await check('RUN-01/02 dynamic dependency and bounded recovery stop at review',async()=>{
      await go('14-runs-and-impact.html#project=PRJ-DEMO-003');const before=await page.evaluate(()=>JSON.stringify(ESG.state().units));
      assert.equal(await page.evaluate(()=>ESGSupport.impacted(ESG.state()).units.length),2);await act('resumeRun').click();assert.match(await page.locator('.support-inspector').innerText(),/停在正文审核门/);
      assert.equal(await page.evaluate(()=>JSON.stringify(ESG.state().units)),before);await shot('P14-resumed');await act('runsTab').filter({hasText:'项目模型动作'}).click();assert.match(await page.locator('main').innerText(),/尚无模型动作/);
      await act('runsTab').filter({hasText:'审核与操作事件'}).click();assert.equal(await page.locator('.support-table tbody tr').count(),await page.evaluate(()=>ESG.state().audit.length));
    });
    await check('STYLE-01 live layout preview and frozen export error states',async()=>{
      await go('09-report-composer.html');await act('styleInspector').click();await page.locator('#heading').selectOption('三级标题');assert.equal(await page.locator('#support-style-preview h3').count(),1);await shot('P09-style');await page.locator('dialog button[type="submit"]').click();
      await go('10-report-delivery.html');const old=await page.evaluate(()=>JSON.stringify(ESG.state().builds));await act('exportFailure').click();await act('retryExport').click();assert.equal(await page.locator('#export-pdf').inputValue(),'running');
      await page.locator('#export-pdf').selectOption('ready');assert.equal(await page.evaluate(()=>JSON.stringify(ESG.state().builds)),old);await shot('P10-formats');
      const dl=page.waitForEvent('download');await act('downloadCoverageJson').click();const download=await dl;const filepath=await download.path();const data=JSON.parse(fs.readFileSync(filepath,'utf8'));assert.equal(data.demonstration,true);assert.ok(data.rows.length);
    });
    let blankId;
    await check('INIT-01 default blank creation and every empty route',async()=>{
      await go('');await act('portfolioCreate').click();assert.equal(await page.locator('#startMode').inputValue(),'blank');assert.equal(await page.locator('[for="sourceId"]').isVisible(),false);
      await page.locator('#project-company').fill('空白报告公司（虚构）');await page.locator('#project-title').fill('空白状态验证报告');await page.locator('dialog button[type="submit"]').click();await page.waitForURL('**/01-project-overview.html*');
      blankId=await page.evaluate(()=>ESG.state().project.id);assert.equal(await page.evaluate(()=>ESG.state().builds.length),0);await shot('P01-first-use');
      for(const p of D.pages){await go(p.file+'#project='+blankId);assert.equal(await page.locator('main h1').count(),1);await overflow();}
      await shot('P10-empty');
    });
    await check('INIT-02 blank rule adoption then template produces no approved text',async()=>{
      await go('12-regulatory-library.html#project='+blankId);await act('adoptRule').click();await page.locator('dialog button[type="submit"]').click();
      await go('13-reference-library.html#project='+blankId);await act('referenceTab').filter({hasText:'框架模板'}).click();await act('adoptTemplate').click();await page.locator('dialog button[type="submit"]').click();
      for(const file of ['02-disclosure-checklist.html','07-writing-framework.html','08-writing-workbench.html','09-report-composer.html']){await go(file+'#project='+blankId);assert.equal(await page.locator('main h1').count(),1);}
      assert.equal(await page.evaluate(()=>ESG.state().units.every(u=>!u.body && !u.approvedHash)),true);assert.equal(await page.evaluate(()=>ESG.stats(ESG.state()).canBuild),false);
    });
    await check('INIT-03 inherit config only, and narrow-window creation stays usable',async()=>{
      await page.setViewportSize({width:1024,height:768});await go('');await act('portfolioCreate').click();await page.locator('#startMode').selectOption('inherit');
      assert.equal(await page.locator('[for="sourceId"]').isVisible(),true);await page.locator('#sourceId').selectOption('PRJ-DEMO-001');
      await page.locator('#project-company').fill('沿用配置演示公司');await page.locator('#project-year').fill('2026');await shot('P00-create-inherit-1024');
      await page.locator('dialog button[type="submit"]').click();await page.waitForURL('**/01-project-overview.html*');
      assert.equal(await page.evaluate(()=>ESG.state().initialization.mode),'inherit');assert.equal(await page.evaluate(()=>ESG.state().units.length),0);assert.equal(await page.evaluate(()=>ESG.state().builds.length),0);
      await overflow();await page.setViewportSize({width:1440,height:900});
    });
    await check('Support deep links freeze the selected source and include companion snapshot',async()=>{
      await go('12-regulatory-library.html#project=PRJ-DEMO-003&source=RULE-MAIN-v1');await act('supportShare').click();const link=await page.locator('dialog textarea').inputValue();assert.match(link,/source=RULE-MAIN-v1/);assert.match(link,/snapshot=/);await close();
      await page.goto(link);assert.equal(await page.evaluate(()=>ESG.meta().readonly),true);assert.match(await page.locator('.support-inspector').innerText(),/RULE-MAIN-v1/);
      await act('supportObject').filter({hasText:'生成上下文'}).click();assert.match(await page.locator('dialog').innerText(),/RULE-MAIN-v1/);await close();
    });
    await check('READONLY and project isolation extend to support states',async()=>{
      await go('11-project-settings.html#project=PRJ-DEMO-002');assert.equal(await act('previewConfig').isDisabled(),true);
      await assert.rejects(()=>page.evaluate(()=>ESG.dispatch({type:'supportDesign',op:'promptScene',payload:{scene:'upgraded'}})),/归档/);
      await go('02-disclosure-checklist.html#project=PRJ-DEMO-003');assert.equal(await page.locator('#promptScenario').inputValue(),'baseline');
      const snap=await page.evaluate(()=>ESG.snapshotLink('project',ESG.state().project.id).link);await page.goto(snap);assert.equal(await page.locator('#promptScenario').isDisabled(),true);
    });
    assert.deepEqual(errors,[]);console.log('Support browser checks passed: '+results.length);
  }catch(e){results.push({name:'blocking failure',pass:false,error:e.stack});await shot('failure');console.error(e);process.exitCode=1;}
  finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({date:new Date().toISOString(),results,errors},null,2));await browser.close();}
})();
