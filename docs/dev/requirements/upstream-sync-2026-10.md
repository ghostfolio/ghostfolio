# 同步上游官方 3.86.0：需求与开发文档

- 状态：进行中（分支 `feat/upstream-sync-3.86`）
- 上游：`ghostfolio/ghostfolio` `main`，3.86.0（2026-10-15，`204f0d857`）
- 上次合并点：`de975a599`（2026-07-13），其后上游新增 699 个提交，约 40 个版本
- 相关：[ADR 0002](../adr/0002-mcp-single-write-exception.md)、[ADR 0003](../adr/0003-rebalancing-base-is-actual-value.md)、[MCP 服务端](../architecture/mcp-server.md)

## 1. 背景与目标

本仓库是官方 Ghostfolio 的 fork，加了投资计划（资金池、DCA、再平衡、信号、价格提醒）、
账户本金、MCP 服务端等增量功能。与上游相隔 3 个月，官方期间修了大量计算、安全和运维问题，
并加了一些对决策有用的功能。目标：把值得的部分同步回来，同时不丢本仓库的增量功能。

## 2. 原则

1. **以官方为准，本仓库只做增量。** 官方已经覆盖的行为，冲突时采用官方实现；本仓库独有的
   功能（投资计划、MCP、账户本金等）保留。
2. **之前对计算逻辑的微调，官方更合理时舍弃。** 每一处被舍弃的本仓库改动，必须在本文
   第 6 节登记原因，方便以后追溯。
3. **逐提交摘取，保留溯源。** 用 `git cherry-pick -x`，提交信息里自带上游提交号；不做整包
   合并（见第 7 节）。
4. **一项一提交，每批后都要测试和构建。** 任何一批失败可以单独回退。
5. **不把大版本升级混进来。** Angular、Prisma 新生成器、bootstrap 另做。

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

## 5. 摘取方法

```shell
git switch feat/upstream-sync-3.86
git cherry-pick -x <上游提交>     # 按本文顺序，一项一提交
```

- 顺序：A → B（先前置重构）→ C。同一批内按上游时间顺序摘取。
- 冲突处理：
  1. 文件里只有官方的改动 → 直接接受。
  2. 本仓库在同一处也改了 → 默认采纳官方，再把本仓库字段（第 4 节）重新接上，并在第 6 节登记。
  3. 官方的改动依赖尚未摘取的前置提交 → 回头补前置提交，不手工拼凑。
- 每摘完一批：`npx tsc -p apps/api/tsconfig.app.json --noEmit`、`npx nx test api`、
  `npx nx build api`；动了前端的再 `npx ngc -p apps/client/tsconfig.app.json --noEmit`。
- 数据库：C6 等带 Prisma 迁移，摘取后在测试库上跑 `npx prisma migrate deploy`，确认迁移
  能在带数据的库上通过，再上线。
- 每一项完成后回到第 3 节把“状态”改成“已完成（提交号）”。

## 6. 被舍弃的本仓库改动

（同步过程中登记：改动位置、原因、官方对应实现。）

| 位置 | 原改动 | 舍弃原因 | 官方实现 |
| --- | --- | --- | --- |
| | | | |

## 7. 为什么不整包合并

试算 `git merge upstream/main`：28 个文件冲突，集中在组合计算、活动、AI、首页和分析页组件；
并且有不报冲突的语义破坏：官方 3.63 把持仓从 map 改成数组，投资计划的再平衡和
`fetchPortfolioSummary` 都按 map 使用，会悄悄算错。逐提交摘取能把这些问题分散到具体一项里处理。

**已知破坏点（摘取 3.63 之后的提交前必须处理）**：`PortfolioService.getDetails().holdings`
由 `{[symbol]: position}` 变为数组。受影响：`investment-plan.controller.ts`
（`getRebalancing`、`fetchPortfolioSummary`）、`rebalancing.service.ts`（入参）、`cron.service.ts`、
MCP 工具描述。

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
