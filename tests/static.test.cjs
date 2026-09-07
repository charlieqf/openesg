const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const publicRoot = path.join(root, 'public');
const D = require('../public/assets/demo-data.js');
const baseline = require('./runtime-baseline.json');
const { createServer } = require('../server.cjs');

function publicFiles(dir = publicRoot) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    assert.equal(entry.isSymbolicLink(), false, 'No links into other workspaces');
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? publicFiles(file) : [file];
  });
}

test('ten pages and navigation ship every referenced asset', () => {
  assert.equal(D.pages.length, 10);
  assert.equal(new Set(D.pages.map(p => p.file)).size, 10);
  for (const page of [{ file: 'index.html', key: 'index' }, ...D.pages]) {
    const html = fs.readFileSync(path.join(publicRoot, page.file), 'utf8');
    assert.ok(html.includes('data-page="' + page.key + '"'));
    assert.match(html, /lang="zh-CN"/);
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      if (/^(?:data:|#)/.test(match[1])) continue;
      assert.ok(!/^https?:/.test(match[1]), 'Runtime assets must be self-contained');
      assert.ok(fs.existsSync(path.join(publicRoot, match[1])), match[1]);
    }
  }
  for (const file of D.makeScene('normal').files) {
    assert.ok(fs.existsSync(path.join(publicRoot, 'assets/demo-files', file.asset)), file.asset);
  }
});

test('exported runtime remains identical to the reviewed source baseline', () => {
  assert.equal(baseline.files.length, 35);
  for (const item of baseline.files) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, item.file))).digest('hex');
    assert.equal(actual, item.sha256, item.file + ': review changes before updating the baseline');
  }
});

test('only fictional runtime assets are in the public deployment directory', () => {
  const allowed = new Set([...baseline.files.map(item => item.file), 'public/_headers']);
  const files = publicFiles();
  assert.equal(files.length, allowed.size);
  for (const file of files) {
    const name = path.relative(root, file).replaceAll('\\', '/');
    assert.ok(allowed.has(name), 'Unexpected public file: ' + name);
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(!/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|superadmin\s*:)/.test(content), 'Possible credential in ' + name);
  }
});

test('Cloudflare publishes only public/ and keeps missing routes as errors', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8'));
  assert.equal(config.name, 'openesg');
  assert.equal(config.assets.directory, './public');
  assert.equal(config.assets.html_handling, 'auto-trailing-slash');
  assert.equal(config.assets.not_found_handling, 'none');
  assert.equal(config.main, undefined);
});

test('local preview serves all pages and rejects private files and mutations', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  try {
    for (const page of ['', ...D.pages.map(p => p.file)]) {
      const response = await fetch(origin + '/' + page);
      assert.equal(response.status, 200, page || 'index');
      assert.match(await response.text(), /OpenESG/);
    }
    for (const file of publicFiles().filter(file => path.basename(file) !== '_headers')) {
      const relative = path.relative(publicRoot, file).replaceAll('\\', '/');
      const response = await fetch(origin + '/' + relative);
      assert.equal(response.status, 200, relative);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), fs.readFileSync(file));
    }
    for (const route of ['/.git/config', '/README.md', '/server.cjs', '/wrangler.jsonc', '/tests/runtime-baseline.json', '/%2e%2e%2fREADME.md']) {
      const response = await fetch(origin + route);
      assert.ok([403, 404].includes(response.status), route);
      await response.text();
    }
    const post = await fetch(origin + '/', { method: 'POST' });
    assert.equal(post.status, 405);
    await post.text();
    const head = await fetch(origin + '/', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
