# 开发文档

内部文档，中文书写即可。面向使用者的操作手册在 [../guide/](../guide/)，全英文。

## requirements/ 需求

- [ai-integration.md](requirements/ai-integration.md) — （已作废）Rebalancing 信号入 cron、邮件语言、DCA 手动报告三个模块的改造需求；AI 部分已在上游同步中移除
- [upstream-sync-2026-10.md](requirements/upstream-sync-2026-10.md) — 同步上游官方 3.86.0 的需求与开发文档（范围、原则、摘取方法、进度）

## architecture/ 技术方案

- [signal-pipeline.md](architecture/signal-pipeline.md) — 信号生成（cron）→ 前端展示 → 邮件通知的完整链路
- [mcp-server.md](architecture/mcp-server.md) — MCP 服务端：回环转发、认证、OAuth、写入例外、脱敏

## adr/ 决策记录

- [索引](adr/README.md)

## notes/ 领域知识与记录

- [capital-pool.md](notes/capital-pool.md) — 资金池三层结构与各层含义
- [dca.md](notes/dca.md) — DCA 四种策略的判断逻辑与测试用例
- [rebalancing.md](notes/rebalancing.md) — 再平衡计算公式与测试用例

## 约定

- 新需求放 `requirements/`，落地方案放 `architecture/`，不可逆的取舍写成 ADR 并登记到索引。
- 领域知识、探查结论、踩坑记录放 `notes/`。
- 任何面向使用者的操作步骤（安装、部署、日常运维、功能怎么用）不写在这里，写进 `guide/` 并使用英文。
