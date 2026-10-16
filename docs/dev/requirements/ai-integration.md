# AI Integration 需求

> **已作废（2026-10）**：Module 1（信号入 cron）和 Module 2 的邮件部分仍然有效，但 Module 2 里“使用 AI
> Response Language”和 Module 3（DCA 页的 AI 报告）已随上游同步移除，见
> [上游同步](upstream-sync-2026-10.md) 第 6 节。邮件语言现在取账户语言，邮件正文固定为信号表格。

> 原文来自 `docs/01-requirements/domain-knowledge/Signal.md` 的 AI Integration 章节。
> 背景链路见 [signal-pipeline](../architecture/signal-pipeline.md)。


### Module 1 — Rebalancing 信号生成时机修正

**现状**：`generateRebalancingSignals` 去重逻辑是"今天已生成过则跳过"，且尚未接入 cron。

**修改**：

- 去重窗口从"今天"改为"本周"（`gte: startOfWeek`），每个 symbol 每周最多生成一次
- 接入现有 `@Cron('0 9 * * 1-5')` 的 `runInvestmentSignals()`，在 DCA 信号之后触发
- 需要给 CronModule 引入 `PortfolioModule`，注入 `PortfolioService` 取持仓市值

---

### Module 2 — Email 使用 AI Response Language

**现状**：`MailService.sendInvestmentSignalEmail()` 接收 `plan.notifyLanguage` 作为 AI prompt 语言。

**修改**：

- `MailService` 注入 `PropertyService`，从 `PROPERTY_AI_RESPONSE_LANGUAGE` 读取语言
- 忽略 `plan.notifyLanguage`（UI 上已删除该字段）

---

### Module 3 — DCA 页面"Generate Report"按钮（手动、不持久化）

**数据输入**（与 Email 一致）：

```
当前持仓市值（portfolioService.getDetails）+ Rebalancing 计算结果（actions + deviation）+ DCA 配置列表（schedules）+ 近期 Signals（最近 7 天）
```

**与 Email 的区别**：

|| Email   |Generate Report|
|---|---------|---|
|触发| Cron 每日 |用户手动点击|
|持久化| 写 DB    |不写|
|发邮件| 是       |否|
|次数限制| 每周一次    |无限|
|返回方式| 邮件 HTML |API 返回纯文本，前端展示|

**实现**：

- 新增 `POST /api/v1/investment-plan/ai-report`（无需 body）
- 后端聚合数据 → 拼 prompt → 调 `AiService.generateText()` → 返回文本
- 前端 `onGenerateReport()` 调该接口，结果写入 `aiReport` 展示在 textarea
- `isGeneratingReport` 控制 loading 状态
