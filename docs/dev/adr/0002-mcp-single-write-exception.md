# ADR 0002 — MCP 只读，唯一的写入例外是 create_activity

- 状态：已采纳（2026-10-15）
- 相关：[MCP 服务端](../architecture/mcp-server.md)、[guide/mcp.md](../../guide/mcp.md)

## 背景

MCP 最初只读：让模型拉持仓、交易记录、投资计划辅助决策。后来出现一个真实场景：
用户把 RBC Direct Investing 的交易截图发给 agent，希望 agent 识别后把交易记进
Ghostfolio（TFSA、FHSA、DI 三个 CAD 账户）。

## 决策

开放**且仅开放**一个写入工具 `create_activity`（`POST /api/v1/activities`）。

- 不提供编辑、删除、导入：写错一笔可以多出一条，但不会被悄悄改掉或删掉，用户在界面里
  修正即可。
- 白名单落在发请求的地方（`MCP_ALLOWED_WRITES`），工具定义不能自己开新的写口子。
- 工具描述写死两条规矩：写入前把完整清单给用户确认；先 `list_activities` 查重。
- 仍走原 REST 的 guard，用户需要 `createActivity` 权限。
- 授权页文案同步改为“读取并记录新交易，不能编辑或删除”，OAuth scope 由 `mcp:read`
  改名 `mcp`。

## 取舍

- 查重只靠提示词，不可靠。上游官方 MCP 的 `import-activities` 在服务端跳过相同交易，
  同步上游时应补上服务端去重（在上游同步需求文档里跟踪，项 C9）。
- 写入没有撤销。这是有意的边界，而不是遗漏。

## 新增写入工具的门槛

改 `MCP_ALLOWED_WRITES`，补测试，更新本 ADR、README 和授权页文案。
