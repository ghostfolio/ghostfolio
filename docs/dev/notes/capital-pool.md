# 资金池 Capital Pool（领域知识）
## 资金池 Capital Pool 概念

```text
Capital Pool            13,471.06 CAD     ← 来自 InvestmentPlan.capitalPool
├─ 生存层 Emergency Fund                  
│  ├─ Cash Reserve Target    X,XXX CAD   ← 来自 plan.cashReserve（新）
│  ├─ Cash Buffer Target      X,XXX CAD  ← 来自 plan.cashBuffer（新）
│  └─ Actual Cash            X,XXX CAD  ← 现有自动计算
├─ Preservation Bucket       X,XXX CAD  ← 来自 plan.preservationBucket（新）
├─ Long-term Growth Target   X,XXX CAD  ← 来自 plan.longTermGrowthTarget（新）
│  └─ Deployed Capital       X,XXX CAD  ← 自动计算，差值即待补仓量
└─ SIP Monthly Budget          XXX CAD  ← 来自 plan.sipMonthlyBudget（新）
```

- 资金池 Capital Pool
  - 生存层 Emergency Fund （第一层）
    - Cash Reserve 用于短期生存必须的资金支持
    - Cash Buffer 生存层应急缓冲储备层
  - Capital Preservation Bucket 资本保值桶（第二层：存活期，应对股市大跌、重大变故等低概率高影响事件）
  - 投资层 第三层
    - Long-term Growth Portfolio （长期增长组合）
    - Systematic Investment Plan (SIP)

Capital Pool：个人存款静态总和

Long-term Growth Portfolio的理解应当是当前静态预备投资股本。 这属于理论在仓值，一般比实际在仓值大，多出的部分需要尽快加制定短期一次性入仓计划，如果实际在仓大于这个值，可理论上应当卖掉一些以降低风险



Systematic Investment Plan (SIP)：流动资金定投层：这一层主要是用于跟踪当前流动月收入中可用于定投的部分，这个值结合Rebalance结果 将影响DCA决策，最终配合DCA决定在一个决策周期内加仓多少哪天加

> 再平衡的分母不是 Long-term Growth Target，而是实际持仓市值；目标资金与实际的差额单独提示，见 [ADR 0003](../adr/0003-rebalancing-base-is-actual-value.md)。
