/* Browser-only design checks. Uses a disposable context and the read-only preview. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright-core');
const base = process.env.OPENESG_REVIEW_URL || 'http://127.0.0.1:4173';
const out = path.resolve(__dirname, process.env.OPENESG_QA_OUTPUT || '../verification/design-review-20260908-followup');
const pages = require(fs.existsSync(path.resolve(__dirname, '../public/assets/demo-data.js')) ? '../public/assets/demo-data.js' : '../assets/demo-data.js').pages;
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await context.route('**/*', r => r.request().url().startsWith(base + '/') ? r.continue() : r.abort());
  const page = await context.newPage(), errors = [], results = [];
  page.on('pageerror', e => errors.push(e.message));
  const check = async (name, fn) => { try { await fn(); results.push({ name, pass: true }); } catch (e) { results.push({ name, pass: false, error: e.message }); } };
  const go = file => page.goto(base + '/' + file);
  const close = async () => { const open = page.locator('dialog[open]'); if (await open.count()) await page.keyboard.press('Escape'); };
  try {
    await go('02-disclosure-checklist.html');
    await check('P02: tree, table, prompt editor, distinct source locator', async () => {
      assert.equal(await page.locator('.rule-table tbody tr').count(), 8);
      assert.equal(await page.locator('.rule-tree-part').count(), 3);
      assert.equal(await page.locator('.rule-detail textarea').count(), 2);
      await page.getByRole('button', { name: '查看原文 ↗', exact: true }).click();
      assert.equal(await page.locator('dialog .source-line.target').count(), 4);
      assert.equal(await page.locator('dialog textarea').count(), 2);
      await page.screenshot({ path: path.join(out, 'P02-reader-1440.png') });
      await close();
    });
    await check('F01/F02: clause number and title match tree, table, detail and search', async () => {
      const checks = await page.evaluate(() => ESG.state().checks.map(c => ({ id: c.id, title: c.title, number: c.primaryClauses.join('、') })));
      for (const c of checks) {
        const name = c.number + ' · ' + c.title;
        await page.locator('.rule-tree').getByRole('button', { name, exact: true }).click();
        assert.equal((await page.locator('.rule-table tr.selected .rule-title').innerText()).replace(/\s+/g, ' '), name);
        assert.equal(await page.locator('.rule-identity h2').innerText(), c.title);
        assert.equal(await page.locator('.rule-identity .rule-clause-number').innerText(), c.number);
      }
      await page.locator('#rule-query').fill('DEMO-2'); await page.locator('#rule-query').press('Enter');
      assert.equal(await page.locator('.rule-table tbody tr').count(), 1);
      assert.match(await page.locator('.rule-table tbody').innerText(), /CHK-ENV-001/);
      await page.reload();
    });
    await check('F08: prompt text auto-grows in detail and reader at three widths', async () => {
      for (const [width, height] of [[1440, 900], [1280, 800], [1024, 768]]) {
        await page.setViewportSize({ width, height });
        const field = page.locator('#writing-prompt'), original = await field.inputValue();
        await field.fill(original + '\n' + '用于检验完整可读性的长提示词。\n'.repeat(12));
        assert.equal(await field.evaluate(e => e.scrollHeight <= e.clientHeight + 1 && getComputedStyle(e).overflowY === 'hidden'), true);
        await field.fill(original);
        await page.getByRole('button', { name: '查看原文 ↗', exact: true }).click();
        assert.equal(await page.locator('dialog textarea').evaluateAll(es => es.every(e => e.scrollHeight <= e.clientHeight + 1)), true);
        await close();
      }
      await page.setViewportSize({ width: 1440, height: 900 }); await page.reload();
    });
    await check('P02: page-only drafts, export origin and refresh boundary', async () => {
      const original = await page.locator('#writing-prompt').inputValue();
      await page.locator('#writing-prompt').fill(original + '\n原型审阅批注。');
      await page.getByRole('button', { name: '保存本页草案', exact: true }).click();
      assert.match(await page.locator('.prompt-draft-status').innerText(), /本页草案已保存/);
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: '导出提示词示例', exact: true }).click();
      const download = await downloadPromise;
      const config = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
      assert.equal(config.demonstration, true);
      assert.equal(config.entries[0].promptOrigin, 'user_annotated');
      assert.equal(config.entries[1].promptOrigin, 'suggested');
      await page.reload();
      assert.equal(await page.locator('#writing-prompt').inputValue(), original);
    });
    await check('P02: 134 synthetic rows do not alter eight project checks', async () => {
      await page.getByRole('button', { name: '百条布局样例', exact: true }).click();
      assert.equal(await page.locator('.rule-table tbody tr').count(), 134);
      assert.equal(await page.evaluate(() => ESG.state().checks.length), 8);
      assert.deepEqual(await page.evaluate(() => ESGUI.design.scaleItems(ESG.state()).reduce((a, c) => { a[c.part] = (a[c.part] || 0) + 1; return a; }, {})), { B: 7, C: 45, D: 82 });
      const groups = await page.locator('.rule-tree-part').nth(1).locator('.rule-tree-group > summary').allTextContents();
      assert.equal(groups.length, 4);
      assert.ok(groups.every(t => /^(A1|A2|B1|B3) · /.test(t)));
      await page.screenshot({ path: path.join(out, 'P02-scale-1440.png') });
      await page.getByRole('button', { name: '条目视图', exact: true }).click();
      assert.equal(await page.locator('.rule-cards article').count(), 134);
      await page.getByRole('button', { name: '返回项目清单', exact: true }).click();
    });
    await go('07-writing-framework.html');
    await check('F04: selected point identity precedes prompt controls at all widths', async () => {
      for (const [width, height] of [[1440, 900], [1280, 800], [1024, 768]]) {
        await page.setViewportSize({ width, height });
        const identity = await page.locator('aside.stack > .panel').filter({ has: page.getByRole('heading', { name: '选中要点配置', exact: true }) }).boundingBox();
        const prompts = await page.locator('aside.stack > .panel').filter({ has: page.getByRole('heading', { name: '要点提示词 · 继承与补充', exact: true }) }).boundingBox();
        assert.ok(identity.y < prompts.y);
      }
      await page.setViewportSize({ width: 1440, height: 900 });
    });
    await check('P07: inherited identities, separate supplements and many-to-one sample', async () => {
      assert.ok(await page.locator('.inherited-prompt').count());
      await page.getByRole('button', { name: '校验', exact: true }).click();
      await page.locator('.inherited-prompt summary').first().click();
      assert.match(await page.locator('.prompt-copy').first().innerText(), /逐项检查/);
      await page.getByRole('button', { name: '多条关联 · 固定示例', exact: true }).click();
      assert.equal(await page.locator('dialog .inherited-prompt').count(), 2);
      assert.match(await page.locator('dialog').innerText(), /固定示例/);
      assert.match(await page.locator('dialog').innerText(), /不代表当前选中要点的关系/);
      await page.screenshot({ path: path.join(out, 'P07-inheritance-1440.png') }); await close();
    });
    await page.evaluate(() => ESG.reset('upstream-change'));
    await go('08-writing-workbench.html');
    await check('P08: stale passages and evidence comparison never auto-replace', async () => {
      assert.ok(await page.locator('.reading-body .citation-stale').count());
      assert.match(await page.locator('.stale-passage').first().innerText(), /590.9/);
      const before = await page.locator('#unit-body').inputValue();
      await page.getByRole('button', { name: '比较并更新', exact: true }).click();
      assert.match(await page.locator('dialog').innerText(), /568.4/);
      await page.screenshot({ path: path.join(out, 'P08-citation-review-1440.png') }); await close();
      assert.equal(await page.locator('#unit-body').inputValue(), before);
      await page.locator('.stale-passage').first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(out, 'P08-stale-inline-1440.png') });
    });
    await check('P08: separate writing and validation defaults; temporary overrides only', async () => {
      await page.getByRole('button', { name: '撰写当前要点', exact: true }).click();
      const write = await page.locator('#instruction').inputValue();
      assert.match(write, /CHK-ENV-001/); assert.match(write, /必须覆盖/); await close();
      await page.getByRole('button', { name: '逐条披露检验', exact: true }).click();
      const validate = await page.locator('#instruction').inputValue();
      assert.match(validate, /逐项检查/); assert.notEqual(write, validate); await close();
      await page.getByRole('button', { name: '检验结果样例', exact: true }).click();
      assert.match(await page.locator('dialog').innerText(), /不是本次模型执行结果/);
      assert.equal(await page.locator('dialog tbody tr').count(), 3);
      await page.screenshot({ path: path.join(out, 'P08-validation-example-1440.png') }); await close();
    });
    await check('F06: task output explains placeholder and links to row-format example', async () => {
      await page.getByRole('button', { name: '逐条披露检验', exact: true }).click();
      await page.getByRole('button', { name: '生成建议', exact: true }).click();
      await page.locator('.validation-output-contract').waitFor({ timeout: 15000 });
      assert.match(await page.locator('.validation-output-contract').innerText(), /正式实现按/);
      assert.match(await page.locator('.validation-output-contract').innerText(), /不是逐条检验结论/);
      await page.screenshot({ path: path.join(out, 'P08-task-output-1440.png') });
      await page.getByRole('button', { name: '查看检验结果格式', exact: true }).click();
      assert.equal(await page.locator('dialog tbody tr').count(), 3);
      await page.getByRole('button', { name: '返回模型动作', exact: true }).click();
      assert.ok(await page.locator('.validation-output-contract').count());
      await close();
    });
    await check('P08: inserted citations and immediate malformed-reference guidance', async () => {
      await page.getByRole('button', { name: '派生新草稿', exact: true }).click();
      await page.getByRole('button', { name: '编辑正文', exact: true }).click();
      await page.locator('#unit-body').fill('人工编辑示例 [FV-ENV-001-v2]');
      assert.equal(await page.locator('.citation-format-warning').isVisible(), true);
      await page.reload();
    });
    await go('06-evidence-mapping.html');
    await check('P06: value, unit and boundary visible without horizontal table scroll', async () => {
      await page.locator('.selection-list').getByRole('button', { name: /温室气体排放与计算口径/ }).click();
      const preview = page.locator('.evidence-row-preview');
      assert.ok(await preview.count());
      const text = await preview.innerText(); assert.match(text, /单位/); assert.match(text, /口径/); assert.match(text, /tCO₂e/);
      assert.equal(await preview.evaluate(e => e.scrollWidth <= e.clientWidth + 1), true);
    });
    await go('04-authoritative-sources.html');
    await check('P04: original filename signal distinguished from current adoption', async () => {
      assert.match(await page.locator('main').innerText(), /不是当前审核结论/);
      await page.evaluate(() => ESG.reset('source-review'));
      await page.getByRole('button', { name: '审核来源集合', exact: true }).click();
      assert.match(await page.locator('dialog .review-identity').innerText(), /许岚/);
      assert.match(await page.locator('dialog .review-identity').innerText(), /此操作应由/);
      assert.doesNotMatch(await page.locator('dialog .review-identity').innerText(), /本次操作人/);
      assert.match(await page.locator('.user-label').innerText(), /林悦/);
      assert.match(await page.locator('dialog .review-identity').innerText(), /林悦/);
      await page.screenshot({ path: path.join(out, 'review-role-1440.png') }); await close();
    });
    await go('09-report-composer.html');
    await check('P09: gate words and chapter/card order match', async () => {
      const gateLabels = await page.locator('.gate-item .badge').allTextContents();
      assert.ok(gateLabels.every(x => ['通过', '未通过'].includes(x)));
      assert.deepEqual(await page.locator('.track-number').allTextContents(), await page.locator('.story-order').allTextContents());
      assert.doesNotMatch(await page.locator('.unit-excerpt').first().innerText(), /^>|\s>\s|^##/);
      await page.getByRole('button', { name: '检查此单元', exact: true }).first().click();
      assert.ok(await page.locator('.story-inspector-body').count());
    });
    await go('10-report-delivery.html');
    await check('P10: unapproved build fixture never says audit passed; frozen citations stay valid', async () => {
      await page.evaluate(() => {
        const g = ESG.state(), build = ESG.D.makeBuild(g, 'BUILD-DESIGN-REVIEW', 2, '2026-09-08 12:00');
        g.builds.push(build); g.activeBuild = build.id; ESGUI.render();
      });
      assert.match(await page.locator('main').innerText(), /待最终审核/);
      assert.match(await page.locator('main').innerText(), /尚未最终批准/);
      assert.equal(await page.locator('main .badge').filter({ hasText: '审核通过' }).count(), 0);
      await page.screenshot({ path: path.join(out, 'P10-final-review-1440.png') });
      await page.getByRole('button', { name: '批准模拟交付', exact: true }).click();
      assert.match(await page.locator('dialog .review-identity').innerText(), /报告审核人/); await close();
      await page.evaluate(() => ESG.reset('upstream-change'));
      await page.getByRole('button', { name: '查看报告正文', exact: true }).click();
      assert.equal(await page.locator('dialog .citation-stale').count(), 0); await close();
    });
    await check('Shared Diff: explicit additions, deletions and readable context', async () => {
      await page.evaluate(() => ESGUI.openDialog('差异显示样例', ESGUI.design.difference('共同上文\n排放量：590.9 tCO₂e\n共同下文', '共同上文\n排放量：568.4 tCO₂e\n共同下文'), '', 'wide'));
      assert.equal(await page.locator('.diff-line.deletion').count(), 1);
      assert.equal(await page.locator('.diff-line.addition').count(), 1);
      assert.equal(await page.locator('.diff-line.context').count(), 2);
      await page.screenshot({ path: path.join(out, 'diff-highlight-1440.png') }); await close();
    });
    await page.evaluate(() => ESG.reset('normal'));
    for (const [width, height] of [[1440, 900], [1280, 800], [1024, 768]]) {
      await page.setViewportSize({ width, height });
      for (const entry of pages) {
        await check(entry.id + ': viewport ' + width, async () => {
          await go(entry.file);
          assert.equal(await page.locator('main h1').count(), 1);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'No page-level horizontal overflow');
          await page.screenshot({ path: path.join(out, entry.id + '-' + width + '.png'), fullPage: true });
        });
      }
    }
    await check('No browser runtime errors', async () => assert.deepEqual(errors, []));
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ date: new Date().toISOString(), origin: base, viewportSizes: ['1440x900', '1280x800', '1024x768'], results, errors, note: 'Automated capture is not itself visual approval. See the accompanying review document.' }, null, 2));
  }
  for (const r of results) console.log((r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.error ? ': ' + r.error : ''));
  if (results.some(r => !r.pass)) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
