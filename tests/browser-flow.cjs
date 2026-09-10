const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright-core');
const base = process.env.OPENESG_REVIEW_URL || 'http://127.0.0.1:4173';
const root = path.resolve(__dirname, process.env.OPENESG_QA_OUTPUT || '../verification');
fs.mkdirSync(path.join(root,'screenshots'),{recursive:true});
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context = await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const page = await context.newPage();const errors=[],steps=[];
  page.on('pageerror',e=>errors.push(e.message));
  const goto=async(file,hash='')=>{await page.goto(base+'/'+file+hash);await page.locator('h1').waitFor();};
  const action=(name)=>page.locator('#app [data-action="'+name+'"]');
  const close=()=>page.locator('dialog .dialog-head [data-action="close"]').click();
  const reason=async(label,text)=>{await page.locator('dialog #reason').fill(text);await page.locator('dialog').getByRole('button',{name:label,exact:true}).click();};
  async function model(label){
    await page.getByRole('button',{name:label,exact:true}).click();await page.locator('dialog').getByRole('button',{name:'生成建议',exact:true}).click();
    await page.locator('dialog [data-action="modelApply"]').waitFor({state:'visible'});
    await page.locator('dialog [data-action="modelApply"]').click();
    await page.waitForFunction(()=>ESG.state().actions[0].status==='applied');await close();
  }
  try {
    await goto('04-authoritative-sources.html');await page.evaluate(()=>ESG.reset('source-review'));
    await action('sourceApprove').first().click();await reason('批准所选来源','已核对虚构修订主表与重复计算说明。');
    assert.equal(await page.evaluate(()=>ESG.state().facts.length),8);steps.push('source approval remains separate from facts');
    await model('提取候选事实');
    await goto('05-fact-review.html','#project=PRJ-DEMO-001&objectType=fact&object=FV-ENV-001-v2');
    await page.screenshot({path:path.join(root,'screenshots','FLOW-fact-diff.png'),fullPage:true});
    await action('acceptFact').click();await reason('接受并发布','单位、期间、原始定位及修订边界已核对。');
    assert.equal(await page.evaluate(()=>ESG.stats(ESG.state()).affectedUnits),2);
    await page.reload();assert.equal(await page.evaluate(()=>ESG.stats(ESG.state()).affectedUnits),2);steps.push('fact acceptance persists across reload and affects two units');
    await goto('06-evidence-mapping.html','#project=PRJ-DEMO-001&objectType=check&object=CHK-ENV-001');
    await action('editMapping').first().click();await reason('保存人工确认','新有效事实及修订说明满足该检查项的披露要素。');
    assert.equal(await page.evaluate(()=>ESG.coverage(ESG.state(),'CHK-ENV-001')),'covered');steps.push('mapping reconfirmed against effective fact');
    for(const id of ['ENV-001','CLI-001']){
      await goto('08-writing-workbench.html','#project=PRJ-DEMO-001&objectType=unit&object='+id);
      await model('撰写当前要点');
      assert.ok((await page.locator('#unit-body').inputValue()).includes('568.4'));
      await action('submitUnit').click();await action('approveUnit').click();await reason('审核通过','已核对正文的新事实引用、边界及证据。');await action('lockUnit').click();await reason('确认锁定','以报告审核人身份锁定本次已审核单元。');
      assert.equal(await page.evaluate(id=>ESG.byId(ESG.state().units,id).status,id),'locked');
    }
    steps.push('both affected writing units regenerated, reviewed and locked via visible controls');
    await goto('09-report-composer.html');await action('runPreflight').click();assert.equal(await page.evaluate(()=>ESG.stats(ESG.state()).canBuild),true);
    await page.screenshot({path:path.join(root,'screenshots','FLOW-preflight-pass.png'),fullPage:true});
    await action('buildReport').click();await page.waitForURL('**/10-report-delivery.html*');
    await action('approveBuild').click();await reason('批准模拟交付','冻结正文、引用、覆盖清单和构建输入一致。');
    assert.deepEqual(await page.evaluate(()=>ESG.state().builds.map(b=>({version:b.version,status:b.status,old:b.body.includes('590.9'),latest:b.body.includes('568.4')}))),[{version:1,status:'approved',old:true,latest:false},{version:2,status:'approved',old:false,latest:true}]);
    steps.push('new approved build created while original body remains frozen');
    const snap=await page.evaluate(()=>ESG.createSnapshot());
    await action('share').click();const deepLink=await page.locator('dialog textarea').inputValue();await close();
    const second=await context.newPage();await second.goto(deepLink);assert.equal(await second.evaluate(()=>ESG.meta().readonly),true);await second.close();steps.push('copied deep link restores read-only snapshot in new tab');
    const fresh=await browser.newContext();const imported=await fresh.newPage();await imported.goto(base+'/10-report-delivery.html');await imported.evaluate(json=>ESG.importSnapshot(json),JSON.stringify(snap));assert.equal(await imported.evaluate(()=>ESG.state().builds.length),2);await fresh.close();steps.push('exported local snapshot imports in a fresh browser context');
    await page.screenshot({path:path.join(root,'screenshots','FLOW-delivery-v2.png'),fullPage:true});
    for(let i=1;i<=8;i++){
      await goto('09-report-composer.html');await page.evaluate(i=>ESG.reset('preflight-'+i),i);await action('runPreflight').click();
      assert.equal(await action('buildReport').isDisabled(),true);assert.equal(await page.evaluate(i=>ESG.preflight(ESG.state())[i-1].pass,i),false);
    }
    steps.push('all eight failure scenes disable formal build');
    await page.evaluate(()=>ESG.reset('normal'));assert.equal(await page.evaluate(()=>ESG.state().builds.length),1);steps.push('scene reset restores original baseline');
    assert.deepEqual(errors,[]);
    const result={browser:browser.version(),passed:true,steps,errors};fs.writeFileSync(path.join(root,'browser-flow-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  } catch(error){await page.screenshot({path:path.join(root,'screenshots','FLOW-failure.png'),fullPage:true});fs.writeFileSync(path.join(root,'browser-flow-results.json'),JSON.stringify({passed:false,steps,errors,failure:error.message},null,2));throw error;}
  finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
