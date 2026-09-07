# Cloudflare + GitHub 部署说明

准备日期：2026-09-08。目标仓库：`charlieqf/openesg`。这是部署准备说明，不代表网站已经上线或访问限制已经生效。

## 发布前明确访问范围

GitHub 仓库私有与否，不决定网站是否公开。此仓库创建时为公开仓库，已限定为虚构原型内容。

如只允许同事浏览，应先在 Cloudflare 设置并确认访问策略，再分发网址。不能把难猜的网址、`noindex` 或页面里的模拟审核角色当作访问控制。

## 连接 Cloudflare Workers

1. 在 Cloudflare 的 Workers & Pages 中创建应用，选择导入 GitHub 仓库。
2. 授权 Cloudflare GitHub 集成访问 `charlieqf/openesg`，尽量只授权这个仓库。
3. 使用下面的配置；实际点击首次部署前确认上节访问范围。

| 配置项 | 值 |
| --- | --- |
| Worker 名称 | `openesg`，须与 `wrangler.jsonc` 的 `name` 一致 |
| 仓库 | `charlieqf/openesg` |
| 生产分支 | `main` |
| 项目根目录 | 仓库根目录 |
| 构建命令 | `npm run build` |
| 部署命令 | `npx wrangler deploy` |
| 静态资源目录 | `public`，已在 `wrangler.jsonc` 中指定 |
| Node.js | 22 或更新版本 |

本项目不是 Next.js，不运行 `next build`，也不在云端运行 `server.cjs`。没有 Worker 业务脚本、数据库绑定或模型密钥。Wrangler 由部署环境解析；正式维护时可在确认工具版本后锁定部署工具依赖。

Cloudflare 成功部署后会给出实际网址。不要在成功前猜测或分发网址。后续向关联分支推送会触发构建和部署，因此接入后每次推送都需要考虑网站访问范围。

官方依据：[Workers Git 集成与构建](https://developers.cloudflare.com/workers/ci-cd/builds/)、[静态资源配置](https://developers.cloudflare.com/workers/static-assets/binding/)。

## 路由与发布范围

- 只部署 `public/`，不部署仓库根目录、测试、说明文档、原工作区或客户资料。
- 原型为十个独立页面，不启用 SPA 回退；无效路径应返回错误。
- 使用 Cloudflare 默认形式的 HTML 路由：访问 `.html` 可能重定向到无扩展名路径，文件相对链接仍以站点根目录为基准。部署后须核对跳转及 hash 参数保留。
- `public/_headers` 禁止缓存旧演示脚本并声明不希望被搜索引擎收录；这些设置不限制谁可以访问。

官方依据：[HTML 路由处理](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)。

## 仅允许同事访问

使用 Cloudflare Access 的 Worker 级策略，覆盖生产与预览的所有流量，而不是只保护一个预览链接。按已确认的同事邮箱或公司邮箱域名配置登录规则；需要先启用 Zero Trust 并具备管理权限。

如要求从首次部署起就不公开，可先在账户层启用适用的保护策略，或预先为目标 Worker 配置保护，再发布静态内容。上线后分别验证允许的同事可以登录、不在允许范围的访问者被拦截。

仓库不包含任何自动设置 Access 的脚本或身份凭据。访问规则由账号所有者在 Cloudflare 管理。

官方依据：[Cloudflare Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)。

## 上线后的检查

- 首页、十页、共享脚本、演示附件均能加载；文档、测试和仓库配置不能通过站点读取。
- 完成来源 → 事实 → 映射 → 撰写 → 预检 → 历史报告演示。
- 验证刷新恢复、跨页状态、只读深链接、快照导入/导出与剪贴板。
- 确认换成 HTTPS 云端地址后是新的演示存储，不会自动包含本机已做的操作。
- 由同事实际所在网络验证访问；本地测试不代表任何地区的网络可达性已通过。
