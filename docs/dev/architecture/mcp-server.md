# MCP 服务端：设计与实现链路

代码在 `apps/api/src/app/mcp/`（模块自带 `README.md`，这里讲取舍和链路）。使用手册见
[guide/mcp.md](../../guide/mcp.md)。

## 目标

让 Claude（Claude Code、claude.ai 连接器）直接拉持仓、交易记录、投资计划，辅助决策；
并能把券商截图里的交易记进账本。参考 toucan-shelf 的 MCP 方案。

## 核心设计：不碰业务逻辑，只转发

```text
MCP 客户端 ──POST /api/v1/mcp──▶ McpController
                                   │ 1. McpAuthService：凭证 → 内部 JWT（10 分钟）
                                   │ 2. McpService：每个请求新建 McpServer（无状态，无会话）
                                   ▼
                          callLocalApi（node:http，127.0.0.1:PORT）
                                   ▼
                    现有 REST 控制器（guards / 权限 / 拦截器照常生效）
                                   ▼
                          sanitizeResponseBody（脱敏）──▶ 返回给模型
```

- 工具与 REST 端点一一对应，定义在 `mcp-tools.ts`（zod 入参），不重复实现业务。
- 回环调用用 `node:http` 而不是 `fetch`：全局 undici dispatcher 会走 `HTTP_PROXY`，
  不能让本机请求经过代理。
- 传输：Streamable HTTP，无状态，JSON 响应；`GET`/`DELETE` 返回 405。
- 响应超过 20 万字符直接报错并提示收窄条件，不截断（截断会让模型误读）。

## 认证（`mcp-auth.service.ts`）

`Authorization: Bearer <credential>`，按顺序识别：

1. OAuth 签发的 access token（claude.ai 连接器）
2. Ghostfolio JWT（网页同款，180 天）
3. API Key（仅 Premium）
4. Security Token（登录用的那个）

后两种换成 10 分钟的内部 JWT 再走回环。凭证无效 → 401，并带
`WWW-Authenticate: Bearer resource_metadata=...` 指向 OAuth 元数据。

## OAuth（`oauth/`）

为了让只支持 OAuth 的客户端（claude.ai 连接器）能连。端点在根路径，因为 well-known
地址是固定的：

| 端点 | 作用 |
| --- | --- |
| `GET /.well-known/oauth-protected-resource` | RFC 9728 |
| `GET /.well-known/oauth-authorization-server` | RFC 8414 |
| `POST /oauth/register` | RFC 7591 动态注册（公开客户端） |
| `GET/POST /oauth/authorize` | 授权页，PKCE S256 必须 |
| `POST /oauth/token` | `authorization_code`、`refresh_token` |

取舍：

- **无状态**。token 用 `JWT_SECRET_KEY` 派生出的另一把密钥签名，所以既不能当 API JWT
  用，反过来也不行。`client_id` 是带签名的客户端元数据，不建表。授权码放内存（5 分钟、
  一次性）。代价：单个 refresh token 无法撤销，换 `JWT_SECRET_KEY` 可以一次性作废全部。
- **授权页要填 Security Token**。Ghostfolio 没有服务端浏览器会话可复用（网页把 JWT
  存在前端）。没有 Security Token 的账号（只用 Google / OIDC）走不了这条路。
- **失败限流**：同一 IP 10 分钟内最多 10 次失败。
- **公网地址**：优先 `ROOT_URL`，否则取 `X-Forwarded-Proto` / `X-Forwarded-Host`。
  `ROOT_URL` 的内置默认值是监听地址（`http://0.0.0.0:3333`），客户端不可达。

### 踩过的坑

- `HtmlTemplateMiddleware` 会把所有不含 `.` 且不以 `/api/` 开头的路径渲染成前端首页。
  `.well-known/...` 因为带点号被放过，`/oauth/register` 没有点号，被当成页面返回，
  表现为 claude.ai 报“Couldn't register with sign-in service”。已在中间件里放行
  `/oauth/`。**以后在根路径新增任何端点都要检查这个中间件和 `main.ts` 的前缀排除。**
- 授权页自己设置 CSP（只有 `frame-ancestors`）：helmet 默认的 `form-action 'self'`
  会让浏览器拦下提交后重定向到客户端回调地址。

## 写入例外：`create_activity`

默认只读，唯一的写入是 `create_activity`（`POST /api/v1/activities`）。决策见
[ADR 0002](../adr/0002-mcp-single-write-exception.md)。

- 写入白名单放在**发请求的地方**（`MCP_ALLOWED_WRITES`，`mcp-api-client.ts`），
  不只靠工具定义：任何不在名单里的非 GET 请求直接抛错。
- 描述里写死两条规矩：写入前把清单给用户确认；先用 `list_activities` 查重。
- 不提供编辑、删除、导入。

## 返回内容脱敏（`mcp-sanitize.ts`）

工具结果会直接进模型上下文，所以所有响应统一过一遍，REST 与前端不受影响：

- `webhookUrl` 只留主机名（`discord.com/***`）。没有复用日志里的
  `redactWebhookUrl`：它保留前两段路径，短路径里的密钥会露出来。
- `accessToken`、`apiKey`、`hashedKey`、`password`、`secret`、`token`、
  `scraperConfiguration` → `[redacted]`。
- 新增可能返回其他密钥的工具时，要把字段加进去。

## 与上游官方 MCP 的关系

上游从 3.59.1 起自带 MCP（实验性，`apps/api/src/app/endpoints/mcp/`，依赖
`@rekog/mcp-nest`），挂在 `/mcp`，与我们的 `/api/v1/mcp` 不冲突，可共存：

| | 上游 | 本仓库 |
| --- | --- | --- |
| 工具 | 7 个 | 16 个 |
| 认证 | Access 授权 + 范围权限 | Security Token / API Key / JWT / OAuth |
| claude.ai 连接器 | 连不上（无 OAuth） | 可以 |
| 投资计划 | 无 | 有 |

后续上游同步时，参照它的请求限制（`#8130`）和 View 权限（`#8112`）补齐，在 [上游同步需求](../requirements/upstream-sync-2026-10.md) 里跟踪。

## 部署后验证

见 [guide/mcp.md](../../guide/mcp.md) 的 Verify 一节。
