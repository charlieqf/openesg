/* Device-local, fictional report portfolio. This is not a production project service. */
(function (root) {
  'use strict';
  const D = root.ESGDemo || (typeof require !== 'undefined' ? require('./demo-data.js') : null);
  const S = root.ESGSupport || (typeof require !== 'undefined' ? require('./support-data.js') : null);
  const KEY = 'openesg-projects:v1', DEFAULT_ID = 'PRJ-DEMO-001';
  const seeds = [
    { id: DEFAULT_ID, name: '远澜国际控股', year: '2025', title: '2025 年度 ESG 报告', scene: 'source-review', owner: '林悦（虚构）', updatedAt: '2026-09-08 12:14' },
    { id: 'PRJ-DEMO-002', name: '远澜国际控股', year: '2024', title: '2024 年度 ESG 报告', scene: 'normal', owner: '林悦（虚构）', updatedAt: '2026-09-03 09:40', archived: true },
    { id: 'PRJ-DEMO-003', name: '澄川金融服务', year: '2025', title: '2025 年度 ESG 报告', scene: 'upstream-change', owner: '林悦（虚构）', updatedAt: '2026-09-07 15:30' },
    { id: 'PRJ-DEMO-004', name: '星屿资本控股', year: '2025', title: '2025 年度 ESG 报告', scene: 'missing', owner: '林悦（虚构）', updatedAt: '2026-09-06 10:20' },
  ].map(p => ({ framework: 'HKEX · 演示框架', market: '香港', cycle: 'annual', archived: false, ...p }));
  const storage = () => root.localStorage;
  function catalog() {
    if (!storage()) return D.clone(seeds);
    const raw = storage().getItem(KEY);
    if (!raw) return D.clone(seeds);
    const data = JSON.parse(raw);
    if (data.version !== 1 || !Array.isArray(data.projects) || data.projects.length > 40 || !seeds.every(s => data.projects.some(p => p.id === s.id)) || new Set(data.projects.map(p => p.id)).size !== data.projects.length || data.projects.some(p => !/^PRJ-[A-Z0-9-]+$/.test(p.id) || typeof p.name !== 'string' || typeof p.title !== 'string' || !/^20\d\d$/.test(p.year))) throw new Error('报告项目目录无法恢复。请保留本地数据副本，不要覆盖原目录。');
    return data.projects;
  }
  const find = id => catalog().find(p => p.id === id);
  const stateKey = id => id === DEFAULT_ID ? 'openesg-demo:v1' : 'openesg-demo:v1:' + id;
  function save(projects) {
    try { storage().setItem(KEY, JSON.stringify({ version: 1, projects })); }
    catch { throw new Error('无法保存演示项目目录；浏览器存储不可用或空间不足。'); }
  }
  function create(input) {
    const name = String(input.name || '').trim(), year = String(input.year || ''), title = String(input.title || '').trim();
    if (!name || name.length > 50 || !title || title.length > 80 || !/^20\d\d$/.test(year) || Number(year) < 2020 || Number(year) > 2035) throw new Error('请填写公司、报告名称及 2020–2035 年之间的报告年度。');
    const all = catalog(), existing = all.find(p => p.name.replace(/\s/g, '').toLowerCase() === name.replace(/\s/g, '').toLowerCase() && p.year === year && p.cycle === 'annual' && p.framework === 'HKEX · 演示框架');
    if (existing) return { project: existing, existing: true };
    if (all.length >= 40) throw new Error('本地原型最多保留 40 个演示项目。');
    const p = { id: 'PRJ-LOCAL-' + root.crypto.randomUUID().toUpperCase(), name, year, title, framework: 'HKEX · 演示框架', market: '香港', cycle: 'annual', scene: 'missing', owner: '林悦（虚构）', updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC', archived: false };
    p.startMode = ['blank', 'inherit', 'demo'].includes(input.startMode) ? input.startMode : 'demo';
    if (p.startMode === 'inherit') {
      const source = all.find(p => p.id === input.sourceId);
      if (!source) throw new Error('请选择沿用配置的来源报告。');
      const values = S.config(graphFor(source));
      p.inheritedConfig = { sourceName: source.name + ' · ' + source.year, values: {industry:values.industry,language:values.language,scope:values.scope,framework:values.framework} };
    }
    save([...all, p]); return { project: p, existing: false };
  }
  function archive(id, archived) {
    const all = catalog(), p = all.find(p => p.id === id);
    if (!p) throw new Error('项目不存在。');
    p.archived = archived; save(all);
  }
  function makeScene(scene, project) {
    if (!project) throw new Error('链接中的报告项目不存在，请返回报告项目列表选择。');
    let g = D.makeScene(scene);
    if (project.id !== DEFAULT_ID) {
      const retarget = value => typeof value === 'string' ? value.replaceAll(DEFAULT_ID, project.id).replaceAll('2025', project.year).replaceAll('远澜国际控股', project.name) : Array.isArray(value) ? value.map(retarget) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, retarget(item)])) : value;
      g = retarget(g);
      const refresh = graph => {
        graph.units.forEach(u => { const wasApproved = u.approvedHash === u.contentHash; u.contentHash = D.fingerprint(u.body); if (wasApproved) u.approvedHash = u.contentHash; if (u.externalBody) { u.externalBaseHash = u.contentHash; u.externalHash = D.fingerprint(u.externalBody); } });
        graph.files.forEach(f => { f.hash = D.fingerprint(f.rows || f.paragraphs); });
      };
      refresh(g);
      g.builds = g.builds.map(build => {
        refresh(build);
        const rebuilt = D.makeBuild(build, build.id, build.version, build.date);
        return { ...build, ...rebuilt, status: build.status, approvedBy: build.approvedBy, approvedAt: build.approvedAt };
      });
    }
    g.project.reportTitle = project.title;
    if (['blank','inherit'].includes(project.startMode) && scene === project.scene) S.blank(g, project.startMode, project.inheritedConfig);
    return g;
  }
  function graphFor(project) {
    const text = storage()?.getItem(stateKey(project.id));
    if (!text) return makeScene(project.scene, project);
    const env = JSON.parse(text);
    if (env.projectId !== project.id || env.schemaVersion !== D.schemaVersion || env.baselineVersion !== D.version || !D.scenes.some(s => s.id === env.sceneId)) throw new Error('演示状态版本不兼容');
    return { ...makeScene(env.sceneId, project), ...D.clone(env.overrides) };
  }
  const api = { KEY, DEFAULT_ID, seeds, catalog, find, stateKey, create, archive, makeScene, graphFor };
  root.ESGProjects = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
