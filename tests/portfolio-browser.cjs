const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright-core');
const base = process.env.OPENESG_REVIEW_URL || 'http://127.0.0.1:4173';
const out = path.resolve(__dirname, process.env.OPENESG_QA_OUTPUT || '../verification/portfolio-20260910');
const pages = require('../public/assets/demo-data.js').pages;
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
  const page=await context.newPage(), results=[], errors=[];
  context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
  const go=async file=>{await page.goto(base+'/'+file);await page.waitForFunction(()=>window.ESG?.meta?.().projectId===(new URLSearchParams(location.hash.slice(1)).get('project')||'PRJ-DEMO-001'));await page.locator('h1').waitFor();};
  const action=(name)=>page.locator('[data-action="'+name+'"]');
  const check=async(name,fn)=>{await fn();results.push(name);console.log('PASS '+name);};
  try{
    await go('');
    await check('P00 is the outer portfolio, with derived counts and no selected company',async()=>{
      assert.equal(await page.locator('main h1').innerText(),'报告项目');assert.equal(await page.locator('[data-project-row]').count(),3);
      assert.equal(await page.locator('.object-bar').count(),0);assert.ok(!(await page.locator('.rail').innerText()).includes('远澜'));
      assert.deepEqual(await page.locator('.metric-value').allTextContents(),['3','3','0','1']);
      assert.equal(await page.evaluate(()=>ESGUI.portfolio.row(ESGProjects.find('PRJ-DEMO-003')).pending),3);
    });
    await check('Search, company/year/stage filters and empty-state recovery',async()=>{
      await page.locator('#portfolio-company').selectOption('澄川金融服务');assert.equal(await page.locator('[data-project-row]').count(),1);
      await page.locator('#portfolio-company').selectOption('');await page.locator('#portfolio-phase').selectOption('补充证据');assert.equal(await page.locator('[data-project-row]').count(),1);
      await page.locator('#portfolio-phase').selectOption('');await page.locator('#portfolio-query').fill('不存在的报告');await page.locator('#portfolio-query').press('Enter');assert.equal(await page.locator('[data-project-row]').count(),0);
      await action('portfolioClear').click();assert.equal(await page.locator('[data-project-row]').count(),4);
      await page.locator('#portfolio-year').selectOption('2024');assert.equal(await page.locator('[data-project-row]').count(),1);
      await page.reload();
    });
    await check('Duplicate report creation opens existing report without resetting bytes',async()=>{
      const before=await page.evaluate(()=>localStorage.getItem('openesg-demo:v1'));
      await action('portfolioCreate').click();await page.locator('#project-company').fill('远澜国际控股');await page.locator('#project-title').fill('不得覆盖的名称');await page.locator('dialog button[type=submit]').click();
      assert.match(await page.locator('dialog').innerText(),/已经存在/);assert.equal(await page.evaluate(()=>localStorage.getItem('openesg-demo:v1')),before);
      await page.keyboard.press('Escape');
    });
    const primaryBefore=await page.evaluate(()=>localStorage.getItem('openesg-demo:v1'));
    await check('Non-default project navigation retains project scope on all ten pages',async()=>{
      await page.locator('[data-project-row="PRJ-DEMO-003"] .portfolio-row-actions a').click();await page.waitForFunction(()=>window.ESG?.meta?.().projectId==='PRJ-DEMO-003');
      for(const p of pages){
        await page.locator('.rail nav a[href*="'+p.file+'"]').click();
        await page.waitForURL('**/'+p.file+'*'); await page.locator('main h1').waitFor();
        assert.equal(await page.locator('main h1').count(),1);
        assert.equal(await page.evaluate(()=>ESG.state().project.id),'PRJ-DEMO-003');
        assert.match(await page.locator('.object-path code').innerText(),/projects\/PRJ-DEMO-003\//);
        assert.equal(await page.evaluate(()=>new URLSearchParams(location.hash.slice(1)).get('project')),'PRJ-DEMO-003');
      }
      assert.equal(await page.evaluate(()=>localStorage.getItem('openesg-demo:v1')),primaryBefore);
    });
    await check('Edits, reset and fixed snapshots stay inside their own project',async()=>{
      await go('08-writing-workbench.html#project=PRJ-DEMO-003&objectType=unit&object=ENV-001');
      await page.evaluate(()=>{ESG.dispatch({type:'deriveUnit',id:'ENV-001'});ESG.dispatch({type:'saveUnit',id:'ENV-001',body:ESG.state().units.find(u=>u.id==='ENV-001').body+'\n\n独立项目修改'});});
      await page.reload();assert.ok((await page.locator('#unit-body').inputValue()).includes('独立项目修改'));
      const snap=await page.evaluate(()=>ESG.createSnapshot());
      const link=await page.evaluate(()=>ESG.snapshotLink('unit','ENV-001').link);
      await go('08-writing-workbench.html');
      await assert.rejects(()=>page.evaluate(s=>ESG.importSnapshot(JSON.stringify(s)),snap),/快照项目/);
      await page.goto(link);await page.waitForFunction(()=>window.ESG?.meta?.().readonly && ESG.state().project.id==='PRJ-DEMO-003');assert.equal(await page.evaluate(()=>ESG.meta().readonly),true);assert.equal(await page.evaluate(()=>ESG.state().project.id),'PRJ-DEMO-003');
      await action('currentVersion').click();await page.evaluate(()=>ESG.reset('normal'));
      await page.reload();assert.equal(await page.evaluate(()=>ESG.state().scene),'normal');assert.match(page.url(),/project=PRJ-DEMO-003/);
      assert.equal(await page.evaluate(()=>localStorage.getItem('openesg-demo:v1')),primaryBefore);
    });
    await check('Archived project is read-only; restoring preserves data and final-review status',async()=>{
      await go('');const row=page.locator('[data-project-row="PRJ-DEMO-003"]');
      const before=await page.evaluate(()=>localStorage.getItem(ESGProjects.stateKey('PRJ-DEMO-003')));
      await row.locator('[data-action=portfolioArchive]').click();await page.locator('dialog button[type=submit]').click();
      await page.locator('.portfolio-list-head [data-action=portfolioTab]').filter({hasText:'已归档'}).click();
      await page.locator('[data-project-row="PRJ-DEMO-003"] .portfolio-row-actions a').click();
      await page.locator('main h1').waitFor();await page.waitForFunction(()=>window.ESG?.meta?.().projectId==='PRJ-DEMO-003');
      assert.equal(await page.evaluate(()=>ESG.meta().archived),true);assert.match(await page.locator('.demo-strip').innerText(),/已归档 · 只读/);
      await assert.rejects(()=>page.evaluate(()=>ESG.reset('missing')),/归档/);
      await assert.rejects(()=>page.evaluate(()=>ESG.dispatch({type:'runPreflight'})),/归档/);
      await go('');await page.locator('.portfolio-list-head [data-action=portfolioTab]').filter({hasText:'已归档'}).click();
      await page.locator('[data-project-row="PRJ-DEMO-003"] [data-action=portfolioArchive]').click();await page.locator('dialog button[type=submit]').click();
      assert.equal(await page.evaluate(()=>localStorage.getItem(ESGProjects.stateKey('PRJ-DEMO-003'))),before);
      assert.equal(await page.evaluate(()=>ESGProjects.find('PRJ-DEMO-003').archived),false);
    });
    await check('Archive in another tab blocks an already-open editor without discarding dirty text',async()=>{
      await go('08-writing-workbench.html#project=PRJ-DEMO-003&objectType=unit&object=ENV-001');
      await page.evaluate(()=>ESG.dispatch({type:'deriveUnit',id:'ENV-001'}));
      await page.getByRole('button',{name:'编辑正文',exact:true}).click();
      await page.locator('#unit-body').fill('未保存的虚构文字');
      const other=await context.newPage();await other.goto(base+'/');await other.locator('main h1').waitFor();await other.evaluate(()=>ESGProjects.archive('PRJ-DEMO-003',true));
      await page.waitForFunction(()=>ESG.meta().archived);assert.equal(await page.locator('#unit-body').inputValue(),'未保存的虚构文字');
      await assert.rejects(()=>page.evaluate(()=>ESG.dispatch({type:'runPreflight'})),/归档/);
      await other.evaluate(()=>ESGProjects.archive('PRJ-DEMO-003',false));await other.close();
    });
    await check('New fictional report preserves custom metadata, escaping and isolated state',async()=>{
      await go('');await action('portfolioCreate').click();
      await page.locator('#project-company').fill('云岑 "金融" <虚构>');await page.locator('#project-year').fill('2026');await page.locator('#project-title').fill('2026 ESG 初稿（虚构）');
      await page.locator('dialog button[type=submit]').click();await page.waitForURL(/01-project-overview/); await page.waitForFunction(()=>window.ESG?.meta?.().projectId.startsWith('PRJ-LOCAL-')); await page.locator('main h1').waitFor();
      assert.equal(await page.evaluate(()=>ESG.state().project.name),'云岑 "金融" <虚构>');assert.equal(await page.evaluate(()=>ESG.state().project.period),'2026');
      assert.equal(await page.evaluate(()=>ESG.state().scene),'missing');assert.equal(await page.locator('script').count(),10);
      assert.equal(await page.evaluate(()=>ESG.state().initialization.mode),'blank');assert.equal(await page.evaluate(()=>ESG.state().builds.length),0);
      await page.locator('.heading-actions a[href*="11-project-settings"]').click();await page.waitForURL('**/11-project-settings.html*');assert.match(await page.locator('#company').inputValue(),/云岑/);
      await go('');assert.equal(await page.locator('[data-project-row]').count(),4);
    });
    await check('Same-page hash project change reloads into the correct independent workspace',async()=>{
      await go('01-project-overview.html#project=PRJ-DEMO-003');await page.evaluate(()=>location.hash='project=PRJ-DEMO-004');
      await page.waitForFunction(()=>ESG.state().project.id==='PRJ-DEMO-004');assert.equal(await page.evaluate(()=>ESG.state().project.name),'星屿资本控股');
    });
    await check('Unknown project fails visibly and does not open the default report',async()=>{
      await go('01-project-overview.html#project=PRJ-NOT-FOUND');assert.match(await page.locator('h1').innerText(),/无法恢复/);assert.match(await page.locator('.error-page').innerText(),/不存在/);
    });
    // Fresh context so screenshots show the published seed experience, not test edits.
    const visual=await browser.newContext();const vp=await visual.newPage();
    for(const [width,height] of [[1440,900],[1280,800],[1024,768]]) await check('P00 and project switch layout at '+width,async()=>{
      await vp.setViewportSize({width,height});await vp.goto(base+'/');await vp.locator('main h1').waitFor();
      assert.equal(await vp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
      assert.equal(await vp.locator('.portfolio-table-scroll').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
      await vp.screenshot({path:path.join(out,'P00-'+width+'.png'),fullPage:true});
      await vp.goto(base+'/01-project-overview.html#project=PRJ-DEMO-003');
      await vp.locator('.crumb-project').click();await vp.screenshot({path:path.join(out,'project-switch-'+width+'.png')});await vp.keyboard.press('Escape');
      assert.equal(await vp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    });
    await vp.goto(base+'/');await vp.locator('[data-action=portfolioCreate]').click();await vp.screenshot({path:path.join(out,'P00-create-1024.png')});await visual.close();
    await check('No browser runtime errors',async()=>assert.deepEqual(errors,[]));
    fs.writeFileSync(path.join(out,'portfolio-results.json'),JSON.stringify({passed:true,origin:base,date:new Date().toISOString(),results,errors},null,2));
  }catch(e){await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});fs.writeFileSync(path.join(out,'portfolio-results.json'),JSON.stringify({passed:false,results,errors,failure:e.message},null,2));throw e;}
  finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
