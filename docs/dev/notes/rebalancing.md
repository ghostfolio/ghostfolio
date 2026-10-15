# Rebalancing 再平衡（领域知识 + 测试用例）

## Rebalancing 工作原理
```text
输入：
  allocations[]  — 用户设置的目标权重（symbol, targetWeight%, rebalanceThreshold%）
  holdings{}     — 组合实际持仓值（symbol → valueInBaseCurrency）

核心计算（按分组 groupId，同组各 symbol 市值相加）：
  totalValue       = sum(所有持仓实际市值)        ← 所有权重和金额的分母
  currentWeight%   = group.value / totalValue × 100
  deviation        = currentWeight% − targetWeight%       ← 正=超配，负=欠配
  adjustmentValue  = totalValue × (targetWeight% − currentWeight%) / 100
                     正=需买入，负=需卖出
  type             = |deviation| >= threshold ? BUY/SELL : OK
  amount           = |adjustmentValue|

  capital          = 实际市值 vs plan.longTermGrowthTarget 的对照（仅提示，不参与权重）
                     ABOVE_TARGET 超出目标资金 / BELOW_TARGET 尚未投入 / ON_TARGET(±0.5%) / UNSET

输出：
  actions[]       — 每个分组的操作建议
  hasTriggered    — 至少一个分组超过阈值时 = true（不受 capital 影响）
  totalValue      — 实际持仓市值
  capital         — { target, actual, gap, status, reason }
```

## 为什么分母是实际市值，而不是 Long-term Growth Target

最初（6 月 17 日 `664cc7710`）为了表达「Long-term Growth Target 是理论在仓值，实际大于它就应卖出一部分」，
把权重的分母改成了 longTermGrowthTarget。实际持仓高于目标时，这使各组权重之和超过 100%
（例：目标 32,000、实际 35,973，权重和 112%），并把没有偏离的 XQQ.TO 报成超配 5.7% → SELL。

现在权重与买卖金额一律按实际市值计算，「超出 / 未达目标资金」单独放在 `capital` 里提示，
这仍然表达了原来的意图（超出目标的部分需要考虑卖出），但不再污染各组权重。

## 测试

见 `rebalancing.service.spec.ts`（含「实际市值高于目标资金」的回归用例）。

## 早期用例说明（旧版数据，仍然适用）

|Case|场景|数据|结果|
|---|---|---|---|
|G1|无配置|allocations=[]|`{actions:[],hasTriggered:false}`|
|G2|无持仓|holdings={}|`{actions:[],hasTriggered:false,totalValue:0}`|
|1|完美平衡|$10k: XIC 40%/4000, XEF 30%/3000, VCN 30%/3000|全 OK，hasTriggered=false|
|2|超配+欠配|XIC→$4800(48%), XEF→$2800(28%), VCN→$2400(24%)|XIC SELL $800, XEF OK, VCN BUY $600|
|3|持仓中无此 symbol|XIC $10k / VCN $0（未持有）|XIC SELL $4k, VCN BUY $4k|
|4|阈值边界|deviation=5.0% (threshold=5%) → 触发；deviation=4.9% → 不触发||
|5|每 symbol 不同阈值|QQQ threshold=10%偏10%→SELL；SPY threshold=20%偏10%→OK||
|6|reason 字符串|超配含"overweight"，欠配含"underweight"||
|7|真实加拿大三基金组合 $27k|XIC $12k(44.4%), XEF $8100(30%), XBB $6900(25.6%)|XEF BUY $1350（恰好达5%阈值），其余 OK|
