# OpenESG 十页交互原型

用于团队评审 ESG 报告工作流与界面设计的独立静态网站。全部公司名称、数值、正文、证据及审核意见均为虚构演示内容，不代表客户实际情况或监管结论。

此仓库只包含原型，不包含生产系统源码、客户资料包、数据库或凭据。GitHub 仓库内容与网页访问权限相互独立；推送代码并不等于已在 Cloudflare 发布网站。

## 本地预览

使用 Node.js 22 或更新版本，无需安装应用依赖：

```powershell
node server.cjs
```

打开 <http://127.0.0.1:4173/>。不要双击 HTML：跨页状态需要同一 HTTP/HTTPS 地址。

如端口已被原型服务占用，可直接使用已有服务；也可设置 `OPENESG_PORT` 后启动本仓库的服务。更换主机名、协议或端口会产生独立的浏览器存储，不会自动迁移旧状态。

## 页面

| 编号 | 页面 | 文件 |
| --- | --- | --- |
| P01 | 项目总览与任务台 | [01-project-overview.html](public/01-project-overview.html) |
| P02 | 披露规范工作台 | [02-disclosure-checklist.html](public/02-disclosure-checklist.html) |
| P03 | 收资文件工作台 | [03-intake-files.html](public/03-intake-files.html) |
| P04 | 文件版本与权威来源审核 | [04-authoritative-sources.html](public/04-authoritative-sources.html) |
| P05 | 事实审核与变更比较 | [05-fact-review.html](public/05-fact-review.html) |
| P06 | 披露覆盖与证据映射 | [06-evidence-mapping.html](public/06-evidence-mapping.html) |
| P07 | 撰写框架与模板配置 | [07-writing-framework.html](public/07-writing-framework.html) |
| P08 | 逐要点撰写工作台 | [08-writing-workbench.html](public/08-writing-workbench.html) |
| P09 | 全文合成与发布前检查 | [09-report-composer.html](public/09-report-composer.html) |
| P10 | 报告版本与交付中心 | [10-report-delivery.html](public/10-report-delivery.html) |

GitHub 中的 HTML 链接显示源码，交互页面需通过本地预览或实际部署的网址打开。

## 贯穿演示

1. 切换到“新批次 · 来源待审”，确认重置演示。
2. P04 审核采用新版环境绩效主表及补充说明，提取并应用候选事实；来源批准不等于事实批准。
3. P05 对比虚构数值 590.9 → 568.4 tCO₂e，核对证据并接受候选。
4. P06 复核温室气体检查项映射；P03 可反向查看同一证据。
5. P08 分别处理 ENV-001、CLI-001，查看模型 Diff、应用、提交审核、审核通过并锁定。
6. P09 运行八项预检，通过后构建模拟报告。
7. P10 独立批准新报告，回看仍保留旧数值的历史版本。

## 状态与能力边界

- 十页共享当前浏览器的 `localStorage`；刷新、跨页保留已提交操作。每位同事的状态独立，不是多人同步编辑。
- 切换场景等于载入目标基线；重置仅影响本原型命名空间。未保存的正文不属于持久化版本。
- 复制深链接可冻结只读快照。本地产生的快照跨浏览器分享时，还需导出/导入配套 JSON；仅发送链接不会传输浏览器存储。
- 模型建议、本地文件操作与审核角色为模拟。支持虚构 MD/HTML/JSON/CSV 下载，不连接真实模型，不读取真实客户文件，不生成正式 DOCX/PDF。

## 检查与部署

```powershell
npm test
npm run build
```

`build` 对已经存在的静态文件执行验证，不编译或重写页面。包含 20 项业务状态测试及 5 项静态资源/本地 HTTP 检查。

`public/` 中原有 35 个页面和资源文件按 SHA-256 与已目视审核的原型基线核对；`tests/runtime-baseline.json` 记录这些指纹。新增的托管响应头单独维护。修改界面后应重新检查再更新基线，不能把修改哈希文件本身当作验收。

云端部署及云端访问验收尚未执行。见 [Cloudflare 部署说明](docs/cloudflare-deployment.md)。
