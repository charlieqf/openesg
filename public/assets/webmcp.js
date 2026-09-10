/* Optional browser capability. No external calls; unsupported browsers keep the same UI. */
(function () {
  'use strict';
  const context = document.modelContext;
  if (!context?.registerTool) { window.ESGWebMCP = { status: 'unsupported' }; return; }
  if (document.body.dataset.page === 'index') { window.ESGWebMCP = { status: 'workspace-selection-required' }; return; }
  const lifecycle = new AbortController();
  const E = window.ESG, U = window.ESGUI;
  const validate = (input, fields) => E.need(input && typeof input === 'object' && !Array.isArray(input) && Object.keys(input).every(k => fields.includes(k)), 'Invalid tool input.');
  const definitions = [
    { name: 'read_workspace_status', title: '读取当前演示状态', description: 'Read counts and preflight results from the currently visible working graph or frozen snapshot. No mutation.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute(input) { validate(input, []); return { projectId: E.state().project.id, readonly: E.meta().readonly, stats: E.stats(E.state()), preflight: E.preflight(E.state()) }; } },
    { name: 'stage_selected_model_action', title: '准备选中对象的模型动作', description: 'Open the same instruction dialog as the visible UI for the explicitly selected current object. Does not run a model or approve business data; the user confirms in the dialog.', inputSchema: { type: 'object', properties: { objectId: { type: 'string' }, actionType: { type: 'string', enum: ['compare', 'validate'] } }, required: ['objectId', 'actionType'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, execute(input) { validate(input, ['objectId', 'actionType']); const current = U.current(); E.need(input.objectId === current.id && ['compare','validate'].includes(input.actionType), 'Select the object in this page first and choose compare or validate.'); E.need(!E.meta().readonly, 'A frozen snapshot is read-only.'); U.handlers.model({ ids: [current.id], targetType: current.type, actionType: input.actionType, label: input.actionType === 'compare' ? '比较选中对象' : '检查选中对象', page: document.body.dataset.page }); return { staged: true, objectId: current.id, next: 'Review the instruction and confirm in the visible dialog.' }; } },
  ];
  window.ESGWebMCP = { status: 'registering', names: definitions.map(d => d.name) };
  Promise.all(definitions.map(d => Promise.resolve(context.registerTool(d, { signal: lifecycle.signal })))).then(() => { window.ESGWebMCP.status = 'registered'; }).catch(error => { window.ESGWebMCP.status = 'registration_failed'; window.ESGWebMCP.error = error.message; });
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
})();
