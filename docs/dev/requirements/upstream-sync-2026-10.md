# 同步上游官方 3.86.0：需求与开发文档

- 状态：方案修订中（分支 `feat/upstream-sync-3.86`，已完成 A1–A3；试合并已做，等待确认冲突处理规则）
- 上游：`ghostfolio/ghostfolio` `main`，3.86.0（2026-10-15，`204f0d857`）
- 上次合并点：`de975a599`（2026-07-13），其后上游新增 699 个提交，约 40 个版本
- 相关：[ADR 0002](../adr/0002-mcp-single-write-exception.md)、[ADR 0003](../adr/0003-rebalancing-base-is-actual-value.md)、[MCP 服务端](../architecture/mcp-server.md)

## 1. 背景与目标

本仓库是官方 Ghostfolio 的 fork，加了投资计划（资金池、DCA、再平衡、信号、价格提醒）、
账户本金、MCP 服务端等增量功能。与上游相隔 3 个月，官方期间修了大量计算、安全和运维问题，
并加了一些对决策有用的功能。目标：把值得的部分同步回来，同时不丢本仓库的增量功能。

## 2. 原则

1. **官方为底，本仓库只做增量；但不是一刀切。** 本仓库独有的功能（投资计划、MCP、账户本金、
   AI 投资建议等）一律保留，不因“官方也有类似的”被替换（例如官方 MCP 只有 7 个工具、无 OAuth 和
   投资计划，两个 MCP 并存）。两边都改过的文件按第 10 节的规则逐个决定：**改动更大的一方做底，把另一方的
   改动重新接上**；官方已覆盖的行为（计算、校验、导入等）以官方实现为准。
2. **之前对计算逻辑的微调，官方更合理时舍弃。** 每一处被舍弃的本仓库改动，必须在本文
   第 6 节登记原因，方便以后追溯。
3. **合并到上游的 3.86.0 正式版，而不是逐提交摘取。** 逐提交摘取试过了：A4、A5 依赖上游
   更早的一串提交，一项会牵出一串（见第 7 节）。合并能保留依赖关系。
4. **一项一提交，每批后都要测试和构建。** 任何一批失败可以单独回退。
5. **两个分支分开做。** 本分支只做“从上游同步”；bootstrap 5 升级留给下一个分支（它在上游历史的
   最末尾，能干净地排除）。Angular 22 和 Prisma 新生成器拆不开，见第 7 节。

## 3. 范围与进度

“冲突文件”指该上游提交改动的文件里，本仓库自 `de975a599` 以来也改过的文件。空表示可以直接摘取。

### A. 运维与安全

| # | 内容 | 上游提交 | 冲突文件 | 决定 | 状态 |
| --- | --- | --- | --- | --- | --- |
| A1 | 优雅停机，`stop_grace_period` | `b86034108` (#8035) | `main.ts` | 采纳 | 待做 |
| A2 | 存活探针 `GET /api/v1/health/liveness` | `047a2f705` (#8037) | `README.md` | 采纳 | 待做 |
| A3 | Dockerfile 改用 `npm ci` | `75576266b` (#8039) | — | 采纳 | 待做 |
| A4 | 更新资产档案的归属检查 | `9345de040` (#8071) | `activities.service.ts` | 采纳 | 待做 |
| A5 | symbol 校验加固（订单、资产档案） | `f260f1572` (#8005)、`f987e4160` (#8013) | — | 采纳 | 待做 |
| A6 | OIDC 加固 | `a0daa3b30` (#7797)、`68f99609f` (#7886) | — | 采纳（不用 OIDC 也无害） | 待做 |
| A7 | 生物识别设备 id 校验 | `6e128bba1` (#7915) | — | 采纳 | 待做 |

未定位到提交的条目：查询参数校验加固、评论和搜索加长度上限（官方 3.67.1）。

### B. 计算准确性

| # | 内容 | 上游提交 | 冲突文件 | 决定 | 状态 |
| --- | --- | --- | --- | --- | --- |
| B1 | 没有行情时的估值兜底，已平仓持仓不取行情 | `5a1ab3018` (#7813)、`9134e7f2a` (#7948)、`ba73e9cdd` (#7816) | `activities.service.ts`、`portfolio.service(.spec).ts` | 采纳官方 | 待做 |
| B2 | 图表日期之间的行情结转 | `beb8f9de7` (#8009) | — | 采纳 | 待做 |
| B3 | 区间收益率；平均投入额按天数加权 | `214074a41` (#7911)、`6db9228b2` (#8074) | — | 采纳；依赖下面的前置重构 | 待做 |
| B3p | B3 的前置重构 | `74d564a2b`、`3eec62bca`、`e55f9f0e4`、`817c6775d` | `portfolio.service(.spec).ts` | 随 B3 一起 | 待做 |
| B4 | 现金持仓处理 | `82b243f9e` (#7660) | `portfolio.controller.ts`、`allocations-page.component.ts`、`data.service.ts` | 采纳官方 | 待做 |
| B5 | 快照带错误立即过期；快照缓存键区分收益类型 | `662b68583` (#7815)、`8529aea25` (#7913) | — | 采纳 | 待做 |
| B6 | 历史行情查询只取必要列 | `3ecf11bb9` (#8061)、`5df95d68c` (#8110) | — | 采纳 | 待做 |
| B7 | 雅虎历史行情缺收盘价时回退市价 | `a55b9f212` (#7694) | — | 采纳 | 待做 |

### C. 功能

| # | 内容 | 上游提交 | 冲突文件 | 决定 | 状态 |
| --- | --- | --- | --- | --- | --- |
| C1 | 含分红的总回报转正式 | `07220c20b` (#7990) | `README.md`、`portfolio.controller/service(.spec).ts`、`portfolio-summary.*` | 采纳官方 | 待做 |
| C2 | 分析页分红表现 | `30208907a` (#7924) | `portfolio.controller.ts`、`portfolio.service.ts` | 采纳 | 待做 |
| C3 | 按年收益时间线 | `7e0d39ac6` (#8094)、`b60e7acde` (#8103)、`62e3f70d2` (#8122) | `portfolio.controller/service(.spec).ts`、`data.service.ts` | 采纳 | 待做 |
| C4 | 导入：重复检测、ISIN 解析、粘贴文件 | `74211cd68` (#7541)、`8a4d33bbe` (#7542)、`e656277dd` (#8152) | — | 采纳 | 待做 |
| C5 | Ghostfolio AI 从 CSV/图片/PDF 导入（实验性） | `cc276aa67` (#8128) | `ai.controller.ts`、`ai.service.ts`、`config.ts`、`data.service.ts` | **待评估**，见第 8 节 | 待定 |
| C6 | “草稿”标签，替代 `isDraft` | `cb6da5c24` (#7551)、`7ded5e434` (#7577) | `activities.*`、`portfolio.service.ts`、`schema.prisma` 等 | 采纳；含数据库迁移 | 待做 |
| C7 | X-ray 应急资金覆盖规则 | `9b58da04d` (#7538) | `portfolio.service.ts` | 采纳 | 待做 |
| C8 | 股票拆分（实验性） | `ddf446f91`、`75e3d032a`、`9d2e4b732` | `schema.prisma`、`data.service.ts`、`activities.service.ts` 等 | 暂缓：持有拆股标的时再做 | 暂缓 |
| C9 | 借鉴上游 MCP：请求限制、View 权限、服务端去重 | `b1506c156` (#8130)、`ff03b4c23` (#8112) | `README.md` | 只借鉴思路，不引入 `@rekog/mcp-nest` | 待做 |

### 不做（本次）

Angular 21→22、Prisma 新生成器（`prisma-client`）迁移、bootstrap 4→5、`lodash` 换 `lodash-es`
等大版本升级：与本仓库大量自定义页面冲突多，收益主要是跟上版本号，另开需求。

## 4. 本仓库的独有改动（必须保留）

这些是增量功能，同步时不能丢；与官方冲突时以“官方行为 + 重新接上本仓库字段”为准。

| 模块 | 位置 | 说明 |
| --- | --- | --- |
| 投资计划 | `apps/api/src/app/investment-plan/`，客户端 `pages/portfolio/investment-plan/` | 资金池、DCA、再平衡、信号、价格提醒、Webhook/邮件 |
| MCP 服务端 | `apps/api/src/app/mcp/` | 见 MCP 服务端文档 |
| 账户本金 | `portfolio.service.ts`：`investmentInBaseCurrency`、`totalInvestmentInBaseCurrency` | 账户与持仓的本金，卖出时的计算（提交 `d66e677c9`、`faa350453`） |
| 强制刷新 | `portfolio.service.ts` / `portfolio.controller.ts`：`refresh` | 进入 overview 时清快照（`d66e677c9`） |
| 活动筛选 | `activities.service.ts` / `activities.controller.ts` | `6b64ba797` |
| AI 报告、模型配置 | `endpoints/ai/`、`admin-model-provider` | 与 C5 冲突 |
| 首页/关注列表 | `home-overview`、`home-watchlist` 等 | 关注列表市场价格列等 |

## 5. 合并方法

```shell
git switch feat/upstream-sync-3.86
git merge --no-commit --no-ff ef47c0d1b      # 上游 3.86.0 正式版
# 按第 10 节逐个解决冲突，再提交
```

- 先在内存里试算过：`git merge-tree --write-tree --name-only HEAD ef47c0d1b`，29 个文件冲突。
- 解决冲突按第 10 节的表，其余文件（只有一方改过）自动合并。
- 合并完成后依次：`npm install`、`npx prisma generate`、`npx tsc -p apps/api/tsconfig.app.json --noEmit`、
  `npx ngc -p apps/client/tsconfig.app.json --noEmit`、`npx nx test api`、`npx nx build api`、
  `npx nx build client`。
- 数据库：合并带入上游的 Prisma 迁移（如“草稿”标签），在带数据的测试库上跑
  `npx prisma migrate deploy` 通过后再上线。
- 已摘取的 A1–A3 会在合并里自然去重。
- 第 3 节的 A/B/C 清单改作**验收清单**：合并后逐项确认功能在，状态填“已验收”。

## 6. 被舍弃的本仓库改动

（同步过程中登记：改动位置、原因、官方对应实现。）

| 位置 | 原改动 | 舍弃原因 | 官方实现 |
| --- | --- | --- | --- |
| | | | |

## 7. 为什么改为合并，以及三项升级能否拆开

### 逐提交摘取行不通

A1–A3 摘取成功。A4（更新资产档案的归属检查）缺少前置改动，编译不过；A5（symbol 校验）依赖更早的
DTO 校验提交，冲突。上游改动彼此依赖，一项会牵出一串。

### 合并目标：3.86.0 正式版（`ef47c0d1b`，2026-10-13）

不合并到最新 `main`，是因为最末尾 20 个提交里有 bootstrap 4→5 的升级（`c169311fa` 及三个
样式类迁移提交，2026-10-14）。停在 3.86.0 正式版，就把 bootstrap 排除在本分支之外。

### 三项升级的可拆分性

| 升级 | 上游提交 | 能否排除 |
| --- | --- | --- |
| bootstrap 4→5 | `c169311fa`、`6ab615107`、`e88a2cb14`、`96d266f79`（10-14） | **能**：在历史末尾，停在 3.86.0 即可 |
| Angular 21→22 | `d83d9cac5`（08-19），随后 `5af0c7f1c` 把服务迁到 Angular 22 的 `@Service()` | **不能**：699 个提交里 661 个在它之后，后续前端代码按 22 写 |
| Prisma 新生成器 | `c1c73e145`（09-29，89 个文件） | **不能**：此后所有引用 `@prisma/client` 的代码都改了路径 |
| `lodash`→`lodash-es` | `f46f77f35`（09-30） | 不能，同上 |

因此本分支会带入 Angular 22 和 Prisma 新生成器。若一定要排除，只能停在 Angular 22 之前
（2026-08-18，只含 38 个提交），那样 B、C 组几乎全部拿不到。

### 已知的语义破坏（合并不会报冲突）

官方 3.63 把持仓从 map 改成数组：`PortfolioService.getDetails().holdings` 由
`{[symbol]: position}` 变为数组。受影响：`investment-plan.controller.ts`
（`getRebalancing`、`fetchPortfolioSummary`）、`rebalancing.service.ts` 的入参、
`cron.service.ts`、MCP 工具描述。这些地方有 `any` 类型，编译不会报错，需要逐处检查，
并用 `rebalancing.service.spec.ts` 兜底。

## 8. 待决事项

- **C5 Ghostfolio AI 导入**：与“发 RBC 截图记账”的场景直接相关，但需要配置 AI 模型，并与本仓库
  的 `ai.controller` / `ai.service` 冲突。需要先决定是否以官方实现取代本仓库的 AI 模块，
  再摘取。
- **C9 服务端去重**：`create_activity` 目前靠提示词查重。参考官方 `import-activities`
  “已有相同交易就跳过”的做法，在 MCP 层或 REST 层加服务端去重。

## 9. 验证清单

- [ ] `tsc`、`nx test api`、`nx build api`、`ngc` 全部通过
- [ ] 持仓、账户、绩效、分红页面数字与同步前对照，差异都能用官方修复解释
- [ ] 投资计划页（再平衡、DCA、信号）正常，`get_rebalancing` 权重和为 100%
- [ ] 账户本金（`investmentInBaseCurrency`）未丢
- [ ] MCP：`get_portfolio_*`、`list_activities`、`create_activity` 正常
- [ ] 迁移在带数据的库上通过，并能回滚到备份
- [ ] `GET /api/v1/health/liveness` 返回 200；停止容器时请求能处理完
- [ ] 部署前备份数据库

## 10. 试合并结果：29 个冲突文件的处理规则

“我方 / 上游”是自上次合并点以来各自在该文件改动的行数。规则：改动更大的一方做底，另一方的
改动重新接上；本仓库的功能面（投资计划、AI 建议等）以我方为主。

### 官方为底，再接回本仓库的小改动

| 文件 | 我方 / 上游 | 本仓库当初的改动 | 处理 |
| --- | --- | --- | --- |
| `portfolio.controller.ts` | 3 / 391 | 进入 overview 强制刷新（`refresh`） | 官方为底，接回 `refresh` |
| `portfolio.service.ts` | 98 / 1369 | 账户本金 `investmentInBaseCurrency`、`refresh` | 官方为底，接回本金与 `refresh` |
| `portfolio.service.spec.ts` | 121 / 1606 | 本金相关用例 | 官方为底，接回用例 |
| `activities.controller.ts` | 12 / 247 | 活动筛选 | 官方为底，接回筛选参数 |
| `activities-page.component.ts` | 93 / 199 | 活动筛选界面 | 官方为底，接回 |
| `accounts-page.component.ts` | 4 / 357 | 持仓本金 | 官方为底，接回 |
| `allocations-page.component.ts` | 31 / 342 | AI 建议、饼图调整、报错修复 | 官方为底，接回 |
| `admin-page.routes.ts` | 6 / 55 | 投资计划管理页路由 | 官方为底，接回路由 |
| `config.ts` | 3 / 122 | AI 相关常量 | 官方为底，接回常量 |
| `benchmark.interface.ts` | 2 / 8 | 关注列表市场价格字段 | 官方为底，接回字段 |
| `date-range.type.ts`、`calculation-helper.ts` | 6 / 12，22 / 35 | 折线图的日期范围选项 | 官方为底，接回我方选项 |
| `symbol-autocomplete.component.html` | 1 / 3 | 小修 | 官方为底 |
| `portfolio-summary.*` | 81 / 421 等 | 简单收益率、资金池三层 | 官方（已大改）为底，接回两块 |
| `portfolio-performance.component.html` | 10 / 20 | 简单收益率 | 官方为底，接回 |
| `holdings-table.component.*` | 47 / 85，16 / 77 | 本金、简单收益率列 | 官方为底，接回列 |
| `README.md` | 36 / 117 | 文档入口 | 官方为底，保留我方文档链接 |

### 我方为底，手工并入官方改动

| 文件 | 我方 / 上游 | 说明 | 处理 |
| --- | --- | --- | --- |
| `line-chart.component.ts` | 675 / 134 | 我方重写较多（买入标记、日期范围、价格统计） | 我方为底，并入官方改动 |
| `home-overview.component.ts`、`home-overview.html` | 21 / 83，52 / 62 | 智能投资计划入口、样式 | 我方为底，并入官方（如控股表） |
| `holding-detail-dialog.component.ts` | 91 / 157 | 买入标记、简单收益率、Webhook | 两边都大，逐块合并 |
| `libs/ui/.../data.service.ts` | 110 / 178 | 我方是投资计划等接口方法，官方也加了方法 | 两边都是新增，取并集 |

### 需要你定的

| 文件 | 问题 |
| --- | --- |
| `ai.controller.ts`（我方 110 / 上游 183） | 我方是 AI 投资建议和模型配置；上游是 Ghostfolio AI 导入交易（C5）。两个 AI 功能并存还是以官方为准？ |
| `market-data.service.ts`（54 / 47） | 我方“分批下载数据”，上游同期重写了历史行情查询并加了缓存。倾向采用官方，舍弃我方改动，需确认。 |

### 无冲突、直接保留

`apps/api/src/app/investment-plan/`、`apps/api/src/app/mcp/`、`docs/`、投资计划页面、
价格提醒等本仓库独有文件。官方的 MCP 在 `endpoints/mcp/`、路径 `/mcp`，与我方 `/api/v1/mcp`
并存。
