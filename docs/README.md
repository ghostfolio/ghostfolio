# Documentation

**[guide/](guide/)** — the operations manual, written for people who run and use the
system. English only, no internal reasoning.

**[dev/](dev/)** — internal development documentation: domain knowledge, requirements,
architecture, decisions, and field notes. Chinese is fine here.

## guide/

| Page                                                | Contents                                        |
| --------------------------------------------------- | ----------------------------------------------- |
| [getting-started.md](guide/getting-started.md)       | Prerequisites and running the app locally       |
| [deployment.md](guide/deployment.md)                 | Docker deployment, pre-built image vs. local build |
| [investment-features.md](guide/investment-features.md) | Capital Pool, DCA, Rebalancing, Signals, AI report |
| [operations.md](guide/operations.md)                 | Scheduled jobs, emails, common commands, troubleshooting |
| [mcp.md](guide/mcp.md)                               | MCP endpoint: connect Claude, tools, OAuth, verify |

## dev/

| Path                                | Contents                                    |
| ----------------------------------- | ------------------------------------------- |
| [dev/requirements/](dev/requirements/) | 需求与改造方案                              |
| [dev/architecture/](dev/architecture/) | 技术方案与实现链路                          |
| [dev/adr/](dev/adr/README.md)          | 架构 / 策略决策记录                         |
| [dev/notes/](dev/notes/)               | 领域知识、探查记录、测试用例、踩坑          |
