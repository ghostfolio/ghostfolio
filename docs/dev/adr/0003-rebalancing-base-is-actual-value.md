# ADR 0003 — 再平衡的分母用实际市值

- 状态：已采纳（2026-10-15），部分取代 `664cc7710`（2026-06-17）的取舍
- 相关：[rebalancing 笔记](../notes/rebalancing.md)、[capital-pool](../notes/capital-pool.md)

## 背景

`664cc7710`（capital pool 三层架构）把再平衡各组权重的分母从“实际持仓市值”改成
`longTermGrowthTarget`，用来表达“目标资金是理论在仓值，实际超过它就应卖出一部分”。

实际持仓高于目标时出现问题（目标 32,000，实际 35,973）：

- 各组权重加起来 112%；
- 没有偏离的 XQQ.TO 被报成超配 5.7% → SELL（实际 31.8%，目标 30%，未达阈值）；
- 真正偏离的 XUS、RiskCapital 反而被淹没。

## 决策

权重、触发判断、买卖金额一律以**实际持仓市值**为分母。
`longTermGrowthTarget` 改为单独的 `capital` 字段（目标、实际、差额、状态、说明），
只做提示，不参与权重，也不触发再平衡。

原意图（超出目标资金的部分要考虑卖出）保留在 `capital.reason` 里。

## 后果

- 返回的 `totalValue` 语义变为实际市值（原来是目标资金），前端“Total holdings”一行
  因此更贴切。
- 信号（`generateRebalancingSignals`）的金额随之改为按实际市值计算。
- 之前的 `rebalancing.service.spec.ts` 因类型错误一直没跑起来，已按分组结构重写。
